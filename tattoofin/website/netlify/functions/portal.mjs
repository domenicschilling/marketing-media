// Studio-Portal (eingeloggt per Session-Cookie)
//   GET    /api/portal                     Studio, Zahlungen, Abrechnungen, Kennzahlen
//   POST   /api/portal/zahlung             Zahlungslink erstellen { betrag, kunde, email, beschreibung, art }
//   DELETE /api/portal/zahlung/:id         offenen Zahlungslink stornieren
//   GET/POST /api/portal/fragebogen        Onboarding-Fragebogen
//   POST   /api/portal/kuendigung          { grund, garantie }
//   DELETE /api/portal/kuendigung          Kündigung zurücknehmen
//   POST   /api/portal/rechnungen          Stripe-Kundenportal (Tattoofin-Rechnungen)
//   PATCH  /api/portal/kontakt             Benachrichtigungs-E-Mail bzw. Anzahlungsbedingungen ändern
//   POST   /api/portal/erstattung/:id      Kundenzahlung (Provision) ganz oder teilweise erstatten { betrag }
//   POST   /api/portal/stripe-dashboard    Login-Link ins Stripe-Express-Dashboard (Auszahlungen) – nur noch Notlösung
//   POST   /api/portal/stripe-session      Sitzung für eingebettete Stripe-Bausteine (Einrichtung, Auszahlungen, Konto)
//   POST   /api/portal/konto-status        Stripe-Konto neu abfragen (nach der eingebetteten Einrichtung)
//   POST   /api/portal/bestaetigung/:id    Link/QR für die Leistungsbestätigung nach dem Termin erzeugen
//   GET    /api/portal/nachweis/:id        Alle Nachweise zu einer Zahlung (für PDF/Druck)
//   POST   /api/portal/recht               { version } „Deine rechtliche Lage“ gelesen (Zeitstempel + Version)
//   POST   /api/portal/extra               { extra, nachricht } Interesse an einem Extra (Anfrage, keine Abrechnung)
//   POST   /api/portal/aufsteller          { holz, variante, logo?, logoW, logoH, anfordern? } QR-Aufsteller speichern/anfordern
//   POST   /api/portal/checkliste          { punkt, erledigt } Einrichtungs-Checkliste (manuelle Punkte)
//   POST   /api/portal/abmelden            Auf allen Geräten abmelden (Sitzungsversion hochzählen)
// Mandantentrennung: Jede Abfrage nutzt ausschließlich das Studio aus dem Session-Cookie; Zahlungen werden
// über zahlung/<studioId>/<id> gelesen, fremde IDs ergeben immer 404.
import { CFG, plattformgebuehr, provisionSatz, paketVon, aufstellerInklusive, BAUSTEINE_SIMULIERT } from "./_lib/config.mjs";
import { json, fail, body, clean, id, now, handler, isEmail, parseBetrag, clientIp } from "./_lib/util.mjs";
import { saveStudio, zahlungenVon, getZahlung, saveZahlung, abrechnungenVon, getLeistung, store, log } from "./_lib/store.mjs";
import { currentStudio, clearCookie } from "./_lib/auth.mjs";
import { stripe, dashboardLink, accountSession, ensureConnectedAccount } from "./_lib/stripe.mjs";
import { notify, notifyAdmin, kuendigungsDatum, connectUrl, darfKassieren, anzahlungsbedingungen, provisionVerdient, kontoAbgleichen, eingebettet, STATUS, aboKuendigen, aufstellerUrl } from "./_lib/domain.mjs";
import { randomBytes } from "node:crypto";

// Extras (Zusatzangebote): nur Anzeige + Anfrage, keine Abrechnung. Preise sind Vorschläge.
export const EXTRAS = [
  { id: "insta-aktion", titel: "Instagram-Werbeaktion für dein Studio", preis: "ab 149 € einmalig + Werbebudget",
    text: "Wir bauen dir eine fertige Werbeaktion: Video oder Bilder, Texte, Zielgruppe in deiner Stadt. Du gibst nur das Okay.", icon: "📣" },
  { id: "gutscheine", titel: "Gutscheine verkaufen", preis: "Vorschlag: im Paket enthalten, Provision wie bei Zahlungen",
    text: "Tattoo-Gutscheine über deine Zahlseite verkaufen, mit schöner Gutschein-Karte zum Ausdrucken oder Verschicken. Perfekt für Weihnachten und Geburtstage.", icon: "🎁" },
  { id: "no-show", titel: "Termin-Erinnerung & No-Show-Schutz", preis: "Vorschlag: 19 € im Monat",
    text: "Dein Kunde bekommt vor dem Termin automatisch eine Erinnerung per WhatsApp oder E-Mail, mit Link zur Anzahlung. Weniger leere Termine.", icon: "⏰" },
];

// Manuelle Punkte der Einrichtungs-Checkliste (die übrigen erkennt das System selbst)
const CHECK_MANUELL = ["app", "werbung", "theke"];
import { mails } from "./_lib/emails.mjs";

// Geld-zurück-Garantie: nur Einmalzahlung (und Altverträge „Kauf“), nicht Monatlich und nicht Geschenk
const hatGarantie = (s) => s.modell === "kauf" && ["einmal"].includes(paketVon(s).id);
const zahlseite = (s) => `${CFG.siteUrl}/zahlen/${s.slug}`;
// Zahlung für die Ausgabe an das Studio (ohne interne Werte wie den Client-Schlüssel des Bezahlfelds, IP/Browser des Kunden)
const fuerStudio = (z) => {
  const { clientSecret, betragFuerPi, leistungToken, ...rest } = z;
  if (rest.kundeBestaetigt) rest.kundeBestaetigt = { am: rest.kundeBestaetigt.am, inhalt: rest.kundeBestaetigt.inhalt, version: rest.kundeBestaetigt.version };
  if (leistungToken) rest.leistungLink = `${CFG.siteUrl}/bestaetigung.html?t=${leistungToken.t}`;
  return rest;
};
const oeffentlich = (s) => ({
  id: s.id, firma: s.firma, inhaber: s.inhaber, email: s.email, telefon: s.telefon, studioTelefon: s.studioTelefon,
  strasse: s.strasse, plz: s.plz, ort: s.ort, modell: s.modell, zahlart: s.zahlart, preisNetto: s.preisNetto, slug: s.slug,
  status: s.status, statusText: STATUS[s.status] || s.status, createdAt: s.createdAt, goLiveAt: s.goLiveAt,
  vertrag: { version: s.vertrag?.version, akzeptiertAm: s.vertrag?.akzeptiertAm, name: s.vertrag?.name },
  kuendigung: s.kuendigung || null, fragebogenAm: s.fragebogen?.updatedAt || null,
  benachrichtigung: { email: s.benachrichtigungEmail || s.email },
  garantieBis: hatGarantie(s) ? (s.goLiveAt ? new Date(new Date(s.goLiveAt).getTime() + CFG.garantieTage * 864e5).toISOString() : "ab Go-live") : null,
  stripe: { verbunden: Boolean(s.stripe?.accountId), freigegeben: Boolean(s.stripe?.chargesEnabled), auszahlungen: Boolean(s.stripe?.payoutsEnabled), express: s.stripe?.kontoTyp === "express", angabenGemacht: Boolean(s.stripe?.detailsSubmitted), kontoTyp: s.stripe?.kontoTyp || (s.modell === "provision" ? "express" : "standard") },
  paket: paketVon(s).id, paketName: paketVon(s).name, provisionProzent: provisionSatz(s), monatNetto: s.monatNetto || null, aufstellerInklusive: aufstellerInklusive(s),
  recht: s.recht ? { version: s.recht.version, am: s.recht.am, aktuell: s.recht.version === CFG.rechtVersion } : null,
  checkliste: s.checkliste || {}, extrasAngefragt: Object.keys(s.extras || {}), eingebettet: eingebettet(), simulation: BAUSTEINE_SIMULIERT,
  anzahlungsbedingungen: anzahlungsbedingungen(s),
  kannKassieren: Boolean(darfKassieren(s)), zahlseite: zahlseite(s), connectUrl: connectUrl(s),
  aufsteller: { inklusive: CFG.aufstellerPakete.includes(paketVon(s).id), holz: s.aufsteller?.holz || "hell", variante: s.aufsteller?.variante || "name", hatLogo: Boolean(s.aufsteller?.hatLogo), angefordertAm: s.aufsteller?.angefordertAm || null },
});

export default handler(async (req) => {
  const s = await currentStudio(req);
  if (!s) return fail("Bitte einloggen", 401);
  const url = new URL(req.url);
  const [bereich, sub] = url.pathname.replace(/^\/api\/portal\/?/, "").split("/").filter(Boolean);
  // Admin-Ansicht („Dashboard ansehen“): nur lesen. Keine Änderungen, kein Geld bewegen, nichts an Kunden schicken.
  if (s._ansicht) {
    if (bereich === "stripe-session") return json({ modus: "ansicht", hinweis: "In der Admin-Ansicht werden die Stripe-Bausteine nicht geladen (sie würden echte Änderungen am Konto des Studios erlauben). Den Stripe-Status siehst du oben und im Admin." });
    if (req.method !== "GET") return fail("Admin-Ansicht: nur lesend. Diese Aktion ist hier gesperrt.", 403);
    if (!bereich) await log("admin-ansicht-zugriff", { admin: s._ansicht.admin, studioId: s.id });
  }

  if (!bereich && req.method === "GET") {
    // Abgebrochene Versuche über die Zahlseite (Kunde hat das Bezahlfeld geöffnet, aber nicht bezahlt) nach 2 Stunden ausblenden
    const zahlungen = (await zahlungenVon(s.id)).filter((z) => !(z.art === "zahlseite" && ["offen", "abgebrochen"].includes(z.status) && Date.now() - new Date(z.createdAt).getTime() > 2 * 3600e3));
    const monat = new Date().toISOString().slice(0, 7);
    const bezahlt = zahlungen.filter((z) => z.status === "bezahlt");
    const imMonat = bezahlt.filter((z) => (z.bezahltAm || "").slice(0, 7) === monat);
    const q = (extra = "") => `studio=${encodeURIComponent(s.firma)}&tel=${encodeURIComponent(s.studioTelefon || "")}&zahlen=${encodeURIComponent(zahlseite(s))}${extra}`;
    return json({
      adminAnsicht: s._ansicht ? { admin: s._ansicht.admin } : null,
      studio: oeffentlich(s), zahlungen: zahlungen.map(fuerStudio), abrechnungen: await abrechnungenVon(s.id), extras: EXTRAS,
      kpis: {
        umsatzMonatCent: imMonat.reduce((a, z) => a + z.betragCent, 0), zahlungenMonat: imMonat.length,
        provisionMonatBruttoCent: imMonat.reduce((a, z) => a + provisionVerdient(z), 0),
        auszahlungMonatCent: imMonat.reduce((a, z) => a + z.betragCent - (z.erstattetCent || 0) - provisionVerdient(z), 0),
        umsatzGesamtCent: bezahlt.reduce((a, z) => a + z.betragCent, 0), offen: zahlungen.filter((z) => z.status === "offen").length,
        anteilKlarna: bezahlt.length ? Math.round(100 * bezahlt.filter((z) => z.zahlart === "klarna").length / bezahlt.length) : 0,
      },
      materialien: `${CFG.materialsUrl}generator.html`,
      materialLinks: [
        ["20-fensteraufkleber", "Fensteraufkleber"], ["21-flyer-a6", "Flyer A6"], ["22-thekenaufsteller-a5", "Thekenaufsteller A5"],
        ["23-kundeninfo", "Kundeninfo"], ["24-social-kit", "Social-Kit (Story, Post, Badge)"],
      ].map(([n, titel]) => ({ name: n, titel, url: `${CFG.materialsUrl}${n}.html?${q()}` })),
      config: { provisionProzent: provisionSatz(s), ustProzent: CFG.ustProzent, rechtVersion: CFG.rechtVersion, ruecklastGebuehrCent: CFG.ruecklastGebuehrCent, garantieTage: CFG.garantieTage, minBetragCent: CFG.minBetragCent, maxBetragCent: CFG.maxBetragCent },
    });
  }

  if (bereich === "zahlung") {
    if (req.method === "POST" && !sub) {
      if (!darfKassieren(s)) return fail(s.stripe?.chargesEnabled ? "Dein Vertrag ist nicht aktiv." : "Dein Stripe-Konto ist noch nicht freigegeben. Sobald Stripe die Prüfung abgeschlossen hat, kannst du Zahlungslinks erstellen.", 409);
      const b = await body(req);
      const betragCent = parseBetrag(b.betrag);
      if (!(betragCent >= CFG.minBetragCent && betragCent <= CFG.maxBetragCent)) return fail(`Bitte einen Betrag zwischen ${CFG.minBetragCent / 100} € und ${CFG.maxBetragCent / 100} € eingeben.`);
      const email = clean(b.email, 160).toLowerCase();
      if (email && !isEmail(email)) return fail("Bitte eine gültige E-Mail-Adresse eingeben oder das Feld leer lassen.");
      const fee = plattformgebuehr(betragCent, s);
      const z = {
        id: id("zl_"), studioId: s.id, createdAt: now(), art: b.art === "anzahlung" ? "anzahlung" : "gesamt", status: "offen",
        betragCent, kunde: clean(b.kunde, 80), email, beschreibung: clean(b.beschreibung, 120) || "Tattoo-Projekt", sitzungen: clean(b.sitzungen, 60),
        gebuehrNettoCent: fee.nettoCent, gebuehrBruttoCent: fee.bruttoCent,
      };
      await saveZahlung(z);
      const link = `${CFG.siteUrl}/zahlung.html?z=${z.id}`;
      const text = `Hi ${z.kunde ? z.kunde.split(" ")[0] : ""}, hier ist dein Zahlungslink für ${z.beschreibung} (${(betragCent / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €): ${link} . Beim Bezahlen siehst du, welche Zahlungsoptionen dir angeboten werden. Liebe Grüße, ${s.firma}`;
      await log("zahlungslink", { studioId: s.id, zahlungId: z.id, betragCent });
      return json({ zahlung: fuerStudio(z), link, whatsappText: text }, 201);
    }
    if (req.method === "DELETE" && sub) {
      const z = await getZahlung(s.id, sub);
      if (!z) return fail("Nicht gefunden", 404);
      if (z.status !== "offen" && z.status !== "abgebrochen") return fail("Nur offene Zahlungslinks können storniert werden.");
      z.status = "storniert"; z.storniertAm = now();
      await saveZahlung(z);
      return json(fuerStudio(z));
    }
  }

  if (bereich === "fragebogen") {
    if (req.method === "GET") return json(s.fragebogen || {});
    if (req.method === "POST") {
      const b = await body(req);
      const erstes = !s.fragebogen;
      const daten = {};
      for (const [k, v] of Object.entries(b || {})) if (typeof v === "string" || typeof v === "boolean") daten[clean(k, 60)] = typeof v === "string" ? clean(v, 4000) : v;
      s.fragebogen = { ...daten, updatedAt: now() };
      await saveStudio(s);
      if (erstes) await notify(s, mails.fragebogen(s));
      await notifyAdmin(erstes ? "Fragebogen eingegangen" : "Fragebogen geändert", s, daten);
      return json({ ok: true });
    }
  }

  if (bereich === "kuendigung") {
    if (req.method === "POST") {
      if (["gekuendigt", "beendet", "erstattet"].includes(s.status)) return fail("Der Vertrag ist bereits gekündigt.");
      const b = await body(req);
      const garantie = Boolean(b.garantie) && hatGarantie(s) && s.stripe?.paymentIntentId &&
        (!s.goLiveAt || Date.now() - new Date(s.goLiveAt).getTime() <= CFG.garantieTage * 864e5);
      // Paket Monatlich: Ende des laufenden Abrechnungsmonats des Abos (Stripe beendet das Abo dann selbst)
      let zum = garantie ? now() : kuendigungsDatum();
      if (!garantie && s.paket === "monatlich" && s.stripe?.subscriptionId) {
        try { zum = (await aboKuendigen(s, true)) || zum; }
        catch (e) { await notifyAdmin("⚠️ Abo konnte bei Stripe nicht gekündigt werden – bitte im Stripe-Dashboard zum Periodenende kündigen", s, { Abo: s.stripe.subscriptionId, Fehler: e.message }); }
      }
      s.kuendigung = { eingegangenAm: now(), zum, grund: clean(b.grund, 1000), garantie: Boolean(garantie), vorherStatus: s.status };
      s.status = "gekuendigt";
      await saveStudio(s);
      await log("kuendigung", { studioId: s.id, garantie });
      if (garantie) await notifyAdmin("⚠️ Garantie-Erstattung angefordert: bitte im Admin erstatten", s, { Grund: s.kuendigung.grund });
      else {
        await notify(s, mails.kuendigung(s, { zum: s.kuendigung.zum }));
        await notifyAdmin("Kündigung eingegangen", s, { zum: s.kuendigung.zum, Grund: s.kuendigung.grund });
      }
      return json(oeffentlich(s));
    }
    if (req.method === "DELETE") {
      if (s.status !== "gekuendigt" || s.kuendigung?.garantie) return fail("Keine offene Kündigung, die zurückgenommen werden kann.");
      if (s.paket === "monatlich" && s.stripe?.subscriptionId) {
        if (s.stripe.aboBeendetAm || new Date(s.kuendigung.zum) <= new Date()) return fail("Dein Abo ist schon beendet. Bitte melde dich bei uns, dann starten wir es neu.", 409);
        try { await aboKuendigen(s, false); }
        catch (e) { return fail("Die Kündigung konnte gerade nicht zurückgenommen werden. Bitte versuch es gleich noch einmal oder schreib uns.", 502); }
      }
      s.status = s.kuendigung.vorherStatus || (s.goLiveAt ? "live" : "einrichtung");
      s.kuendigungHistorie = [...(s.kuendigungHistorie || []), { ...s.kuendigung, zurueckgenommenAm: now() }];
      s.kuendigung = null;
      await saveStudio(s);
      await notify(s, mails.kuendigungZurueck(s));
      await notifyAdmin("Kündigung zurückgenommen", s, {});
      return json(oeffentlich(s));
    }
  }

  // Erstattung bei Provision: Tattoofin hat kassiert, also läuft die Erstattung über die Plattform.
  // reverse_transfer holt den Betrag anteilig vom Studio-Konto zurück; die Provision verrechnet der Webhook (charge.refunded).
  if (bereich === "erstattung" && sub && req.method === "POST") {
    const z = await getZahlung(s.id, sub);
    if (!z) return fail("Nicht gefunden", 404);
    if (z.abwicklung !== "plattform") return fail("Erstattungen machst du direkt in deinem Stripe-Dashboard.");
    if (z.status !== "bezahlt") return fail("Nur bezahlte Zahlungen können erstattet werden.");
    if (z.rueckbuchung && !z.rueckbuchung.abgeschlossenAm) return fail("Zu dieser Zahlung läuft eine Rückbuchung. Eine Erstattung ist erst nach Abschluss möglich.");
    const b = await body(req);
    const rest = z.betragCent - (z.erstattetCent || 0);
    const betragCent = parseBetrag(b.betrag);
    if (!(betragCent > 0 && betragCent <= rest)) return fail(`Bitte einen Betrag bis ${(rest / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })} € eingeben.`);
    await stripe("POST", "/refunds", {
      payment_intent: z.paymentIntentId, amount: betragCent, reverse_transfer: true, refund_application_fee: false,
      metadata: { tattoofinZahlung: z.id, studioId: s.id, quelle: "portal" },
    }, { idempotencyKey: `re-${z.id}-${z.erstattetCent || 0}-${betragCent}` });
    // Status, Provision und E-Mail an das Studio aktualisiert der Webhook „charge.refunded“
    await log("erstattung", { studioId: s.id, zahlungId: z.id, betragCent });
    return json({ ok: true });
  }

  if (bereich === "stripe-dashboard" && req.method === "POST") {
    if (!s.stripe?.accountId) return fail("Noch kein Stripe-Konto verbunden.", 409);
    return json({ url: await dashboardLink(s) });
  }

  if (bereich === "rechnungen" && req.method === "POST") {
    const ps = await stripe("POST", "/billing_portal/sessions", { customer: s.stripe.customerId, return_url: `${CFG.siteUrl}/portal.html#konto`, locale: "de" });
    return json({ url: ps.url });
  }

  if (bereich === "kontakt" && req.method === "PATCH") {
    const b = await body(req);
    if (b.email !== undefined) { if (!isEmail(b.email)) return fail("Bitte gültige E-Mail"); s.benachrichtigungEmail = clean(b.email, 160); }
    if (b.anzahlungsbedingungen !== undefined) s.anzahlungsbedingungen = clean(b.anzahlungsbedingungen, 1000) || null;
    await saveStudio(s);
    return json(oeffentlich(s));
  }

  // ---- Eingebettete Stripe-Bausteine ----
  if (bereich === "stripe-session" && req.method === "POST") {
    if (["entwurf", "abgebrochen", "beendet", "erstattet"].includes(s.status)) return fail("Dein Vertrag ist nicht aktiv.", 409);
    if (!eingebettet()) return json({ modus: "weiterleitung", url: connectUrl(s) });
    if (!s.stripe?.accountId) { await ensureConnectedAccount(s); await saveStudio(s); }
    if (BAUSTEINE_SIMULIERT) return json({ modus: "simulation", konto: s.stripe.accountId, kontoTyp: s.stripe.kontoTyp });
    const as = await accountSession(s);
    return json({ modus: "stripe", publishableKey: CFG.stripePublishableKey, clientSecret: as.client_secret, kontoTyp: s.stripe.kontoTyp });
  }
  if (bereich === "konto-status" && req.method === "POST") {
    if (!s.stripe?.accountId) return json(oeffentlich(s));
    await kontoAbgleichen(s, await stripe("GET", "/accounts/" + s.stripe.accountId));
    return json(oeffentlich(s));
  }

  // ---- Leistungsbestätigung nach dem Termin (Link/QR für den Kunden) ----
  if (bereich === "bestaetigung" && sub && req.method === "POST") {
    const z = await getZahlung(s.id, sub);
    if (!z) return fail("Nicht gefunden", 404);
    if (!["bezahlt", "in_pruefung"].includes(z.status)) return fail("Eine Leistungsbestätigung gibt es für bezahlte Zahlungen, nach dem Termin.");
    if (!z.leistungToken || z.leistungToken.benutzt) {
      if (z.leistung) return fail("Diese Sitzung ist schon bestätigt.", 409);
      const t = randomBytes(18).toString("base64url");
      z.leistungToken = { t, erstellt: now(), ablauf: new Date(Date.now() + 30 * 864e5).toISOString() };
      await store.set("idx/bst/" + t, `${s.id}/${z.id}`);
      await saveZahlung(z);
    }
    const link = `${CFG.siteUrl}/bestaetigung.html?t=${z.leistungToken.t}`;
    const text = `Hi ${z.kunde ? z.kunde.split(" ")[0] : ""}, danke für deinen Besuch! Bitte bestätige kurz, dass deine Sitzung stattgefunden hat (dauert 30 Sekunden): ${link} – ${s.firma}`;
    return json({ link, whatsappText: text });
  }
  if (bereich === "nachweis" && sub && req.method === "GET") {
    const z = await getZahlung(s.id, sub);
    if (!z) return fail("Nicht gefunden", 404);
    const l = await getLeistung(s.id, z.id);
    return json({
      studio: { firma: s.firma, inhaber: s.inhaber, strasse: s.strasse, plz: s.plz, ort: s.ort },
      zahlung: { ...fuerStudio(z), kundeBestaetigt: z.kundeBestaetigt || null },
      leistung: l ? { ...l, ua: undefined } : null, version: CFG.bestaetigungVersion, erstellt: now(),
    });
  }

  // ---- „Deine rechtliche Lage – einfach erklärt“ gelesen ----
  if (bereich === "recht" && req.method === "POST") {
    const b = await body(req);
    if (b.version !== CFG.rechtVersion) return fail("Bitte lade die Seite neu, das Blatt wurde aktualisiert.", 409);
    if (b.gelesen !== true) return fail("Bitte setze das Häkchen.");
    s.recht = { version: CFG.rechtVersion, am: now(), name: clean(b.name, 100) || s.inhaber, ip: clientIp(req), ua: (req.headers.get("user-agent") || "").slice(0, 200) };
    s.rechtHistorie = [...(s.rechtHistorie || []), s.recht];
    await saveStudio(s);
    await log("recht-gelesen", { studioId: s.id, version: CFG.rechtVersion });
    return json(oeffentlich(s));
  }

  // ---- Extras: Interesse melden ----
  if (bereich === "extra" && req.method === "POST") {
    const b = await body(req);
    const ex = EXTRAS.find((e) => e.id === b.extra);
    if (!ex) return fail("Unbekanntes Extra");
    s.extras = { ...(s.extras || {}), [ex.id]: { am: now(), nachricht: clean(b.nachricht, 500) } };
    await saveStudio(s);
    await notifyAdmin(`Extra angefragt: ${ex.titel}`, s, { Nachricht: clean(b.nachricht, 500) || "–", Telefon: s.telefon });
    return json({ ok: true });
  }

  // ---- QR-Aufsteller aus Holz: Auswahl speichern (Holzton, Variante, Logo) und optional anfordern ----
  // Logo: schwarz/weiß-JPEG aus dem Browser (für einfarbige Gravur), getrennt gespeichert unter aufsteller-logo/<studioId>
  if (bereich === "aufsteller" && req.method === "POST") {
    const b = await body(req);
    const holz = ["hell", "dunkel"].includes(b.holz) ? b.holz : "hell";
    const variante = ["name", "logo"].includes(b.variante) ? b.variante : "name";
    const a = { ...(s.aufsteller || {}), holz, variante, am: now() };
    if (b.logo === null) { await store.del("aufsteller-logo/" + s.id); a.hatLogo = false; }
    else if (typeof b.logo === "string") {
      if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(b.logo) || b.logo.length > 700000) return fail("Logo bitte als Bild unter 500 KB hochladen.");
      await store.set("aufsteller-logo/" + s.id, { src: b.logo, w: Math.round(Number(b.logoW) || 0), h: Math.round(Number(b.logoH) || 0), am: now() });
      a.hatLogo = true;
    }
    if (variante === "logo" && !a.hatLogo) return fail("Bitte lade zuerst dein Logo hoch oder wähle „Mit Studioname“.");
    if (b.anfordern) {
      if (a.angefordertAm) return fail("Dein Aufsteller ist schon angefordert. Wir melden uns bei dir.", 409);
      a.angefordertAm = now();
      const inklusive = CFG.aufstellerPakete.includes(paketVon(s).id);
      await notifyAdmin(`QR-Aufsteller ${inklusive ? "bestellen (im Paket enthalten)" : "angefragt (nicht im Paket)"}`, s, {
        Paket: paketVon(s).name, Holz: holz === "dunkel" ? "dunkel (Walnuss)" : "hell (Birke/Buche)", Variante: variante === "logo" ? "mit Studio-Logo" : "mit Studioname",
        Lieferadresse: [s.firma, s.strasse, [s.plz, s.ort].filter(Boolean).join(" ")].filter(Boolean).join(", "),
        Dateien: aufstellerUrl(s), Telefon: s.telefon,
      });
      await log("aufsteller-angefordert", { studioId: s.id, inklusive, holz, variante });
    }
    s.aufsteller = a;
    await saveStudio(s);
    return json(oeffentlich(s));
  }

  if (bereich === "checkliste" && req.method === "POST") {
    const b = await body(req);
    if (!CHECK_MANUELL.includes(b.punkt)) return fail("Unbekannter Punkt");
    s.checkliste = { ...(s.checkliste || {}), [b.punkt]: b.erledigt ? now() : null };
    await saveStudio(s);
    return json(oeffentlich(s));
  }

  if (bereich === "abmelden" && req.method === "POST") {
    s.sessionVersion = (s.sessionVersion || 0) + 1;
    await saveStudio(s);
    return json({ ok: true }, 200, { "Set-Cookie": clearCookie() });
  }

  return fail("Nicht gefunden", 404);
});

export const config = { path: ["/api/portal", "/api/portal/*"] };
