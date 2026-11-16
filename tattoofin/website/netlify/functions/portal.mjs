// Studio-Portal (eingeloggt per Session-Cookie)
//   GET    /api/portal                     Studio, Zahlungen, Abrechnungen, Kennzahlen
//   POST   /api/portal/zahlung             Zahlungslink erstellen { betrag, kunde, email, beschreibung, art }
//   DELETE /api/portal/zahlung/:id         offenen Zahlungslink stornieren
//   GET/POST /api/portal/fragebogen        Onboarding-Fragebogen
//   POST   /api/portal/kuendigung          { grund, garantie }
//   DELETE /api/portal/kuendigung          Kündigung zurücknehmen
//   POST   /api/portal/rechnungen          Stripe-Kundenportal (Tattoofin-Rechnungen)
//   PATCH  /api/portal/kontakt             Benachrichtigungs-E-Mail bzw. Anzahlungsbedingungen ändern
//   POST   /api/portal/adresse             { strasse, plz, ort } Adresse deiner Zahlseite bestätigen bzw. eintragen (Karte im Studio-Bereich,
//                                          seit der einfachen Anmeldung 16.11.2026; vorbefüllt aus dem Stripe-Konto). PLZ 5 Ziffern nur bei DE.
//   POST   /api/portal/erstattung/:id      Kundenzahlung (Provision) ganz oder teilweise erstatten { betrag }
//   POST   /api/portal/stripe-dashboard    Login-Link ins Stripe-Express-Dashboard (Auszahlungen) – nur noch Notlösung
//   POST   /api/portal/stripe-session      Sitzung für eingebettete Stripe-Bausteine (Einrichtung, Auszahlungen, Konto)
//   POST   /api/portal/konto-status        Stripe-Konto neu abfragen (nach der eingebetteten Einrichtung)
//   POST   /api/portal/bestaetigung/:id    Link/QR für die Leistungsbestätigung nach dem Termin erzeugen
//   GET    /api/portal/nachweis/:id        Alle Nachweise zu einer Zahlung (für PDF/Druck); ?pdf=1 → fertiges PDF (A4, für die App)
//   POST   /api/portal/recht               { version } „Deine rechtliche Lage“ gelesen (Zeitstempel + Version)
//   POST   /api/portal/extra               { extra, nachricht } Interesse an einem Extra (Anfrage, keine Abrechnung)
//   POST   /api/portal/aufsteller          entfallen (QR-Aufsteller aus Holz eingestellt 15.11.2026) → 410 { error, code: "aufsteller_entfallen" }.
//                                          Einzige Ausnahme: { logo: null } löscht ein früher gespeichertes Logo (Datenschutz) → { ok, logoGeloescht }
//   POST   /api/portal/aufsteller-pruefen  { cs } nur noch für einen Aufsteller-Checkout, der vor dem 15.11.2026 begonnen wurde (sonst 410)
//                                          Ausnahme bis Apple 1.0 freigegeben hat (Entscheidung Domenic 16.11.2026): App-Token eines Prüf-Studios
//                                          (domain.mjs istAufstellerPruefStudio) → beide wie früher mit { aufsteller }, aber ohne Bestellung,
//                                          Stripe, Mail oder Hersteller-Link (Bestellen = nur „angefordert“ vermerkt, pruefung: true).
//   POST   /api/portal/checkliste          { punkt, erledigt } Einrichtungs-Checkliste (manuelle Punkte)
//   POST   /api/portal/abmelden            Auf allen Geräten abmelden (Sitzungsversion hochzählen)
//   POST   /api/portal/zahlung { art: "gutschein", betrag, kunde (Käufer), email (Pflicht), empfaenger?, nachricht? }  Gutschein-Zahlungslink
//   POST   /api/portal/gutschein/:id/einloesen   { notiz? } Gutschein als eingelöst markieren
//   DELETE /api/portal/gutschein/:id/einloesen   Einlösung zurücknehmen (Versehen)
//   POST   /api/portal/gutschein/:id/senden      Gutschein-Mail erneut an den Käufer senden
//   GET    /api/portal/gutschein/:id/pdf         Gutschein als PDF
//   GET    /api/portal/gutschein-code?code=…      Gutschein per Code finden (nur eigene)
//   GET    /api/portal/gutschein-code?t=<token>   Gutschein per QR-Code (Token aus gutschein.html?t=…) finden (nur eigene)
//   GET    /api/portal/zahlung/:id[?abgleich=1]   eine Zahlung (App); abgleich: Status bei Stripe nachsehen (höchstens alle 10 s)
// Anmeldung: Session-Cookie (Dashboard) ODER App-Token „Authorization: Bearer tfa_…“ (Tattoofin-App, siehe _lib/auth.mjs).
// Mit App-Token gesperrt (403 nur_web): stripe-session, rechnungen, umstellung, erstattung, extra
// (Apple-Richtlinie 3.1: keine Käufe/Abschlüsse digitaler Leistungen in der App, Extras mit Preisen nicht in der App; in Version 1 kein
// Geldrückfluss aus der App), außerdem DELETE kuendigung (eine Kündigung zurücknehmen = Abo fortsetzen, nur im Dashboard; Kündigen und
// Löschen bleiben in der App, Apple 5.1.1(v)).
// Mit App-Token einer Team-Adresse zusätzlich gesperrt (403 nur_inhaber): kuendigung, stripe-dashboard, kontakt, abmelden,
// recht (Bestätigung mit Namen), fragebogen (lesen und senden). Checkliste, Nachweis, Zahlungen, Gutscheine: auch Team.
// aufsteller und aufsteller-pruefen antworten für die App 410 (_lib/werbung.mjs AUFSTELLER_ENTFALLEN), auch für das Team. Ausnahme bis Apple 1.0
// freigegeben hat: Prüf-Studios (Team dort 403 nur_inhaber wie früher).
// Mandantentrennung: Jede Abfrage nutzt ausschließlich das Studio aus dem Session-Cookie bzw. App-Token; Zahlungen werden
// über zahlung/<studioId>/<id> gelesen, fremde IDs ergeben immer 404.
import { CFG, plattformgebuehr, provisionSatz, paketVon, BAUSTEINE_SIMULIERT, testKasse } from "./_lib/config.mjs";
import { json, fail, body, clean, id, now, handler, isEmail, parseBetrag, clientIp, euro } from "./_lib/util.mjs";
import { saveStudio, zahlungenVon, getZahlung, saveZahlung, abrechnungenVon, getLeistung, store, log } from "./_lib/store.mjs";
import { currentStudio, clearCookie } from "./_lib/auth.mjs";
import { geraeteWiderrufen } from "./_lib/app-geraete.mjs";
import { stripe, dashboardLink, accountSession, ensureConnectedAccount } from "./_lib/stripe.mjs";
import { hatUmstellungsangebot, umstellungCheckout, notify, notifyAdmin, connectUrl, connectUrlGehostet, darfKassieren, studioAdresseDa, provisionVerdient, kontoAbgleichen, eingebettet, klarnaFuer, provisionZahlung, aufstellerBezahlt, aufstellerLogoLoeschen, istAufstellerPruefStudio, kuendigungEinreichen, kuendigungZuruecknehmen, zahlungAbgleichen } from "./_lib/domain.mjs";
import { fuerStudio, oeffentlich, zahlungsLink } from "./_lib/studio-ansicht.mjs";
import { randomBytes } from "node:crypto";
import { KLARNA_NAME, PFLICHTSATZ_STUDIO, gutscheinWort, GUTSCHEIN_HINWEIS } from "./_lib/klarna-texte.mjs";
import { materialLinks, werbungMitKlarna, AUFSTELLER_ENTFALLEN, aufstellerFuerPruefApp } from "./_lib/werbung.mjs";
import { nachweisPdf } from "./_lib/nachweis-pdf.mjs";
import { gutscheinStatus, gutscheinPdf, gutscheinSenden, normCode, gutscheinPerToken } from "./_lib/gutschein.mjs";

// Extras (Zusatzangebote): nur Anzeige + Anfrage, keine Abrechnung. Preise sind Vorschläge.
export const EXTRAS = [
  { id: "insta-aktion", titel: "Instagram-Werbeaktion für dein Studio", preis: "ab 149 € netto einmalig, zzgl. Werbebudget",
    text: "Wir bauen dir eine fertige Werbeaktion: Video oder Bilder, Texte, Zielgruppe in deiner Stadt. Du gibst nur das Okay.", icon: "📣" },
  { id: "no-show", titel: "Termin-Erinnerung & No-Show-Schutz", preis: "geplant: ca. 19 € netto im Monat",
    text: "Dein Kunde bekommt vor dem Termin automatisch eine Erinnerung per WhatsApp oder E-Mail, mit Link zur Anzahlung. Weniger leere Termine.", icon: "⏰" },
];

// WhatsApp-Text fürs Studio (Zahlungslink Projektpreis). Klarna-Regeln ab 20.11.2026: nur der Name („Klarna verfügbar“) ohne Raten-/Später-Bezug,
// damit kein Warnsatz nötig ist. Texte kommen aus _lib/klarna-texte.mjs. RATEN_FUSS bleibt als Zusatz-Pflichtsatz für Texte mit Raten-Aussage.
// Ohne Klarna (z. B. Paket Risikofrei ab dem Stichtag, siehe klarnaFuer): schlichter Text ohne Klarna.
// Form seit 15.11.2026: kurz, mit Zeilenumbrüchen und wenigen Emojis, der Link steht allein in einer Zeile (WhatsApp/iMessage zeigen
// dazu die Vorschau-Karte von tattoofin.de/z/<id>). Die App übernimmt den Text unverändert vom Server.
export const RATEN_FUSS = PFLICHTSATZ_STUDIO;
const gruss = (vorname) => `Hi${vorname ? " " + vorname : ""} 👋`;
const zahlarten = "Bezahlen per Karte, Apple Pay oder Google Pay.";
export const ratenWhatsapp = ({ vorname = "", projekt = "dein Tattoo", betrag = "", link = "", firma = "", klarna = true }) =>
  `${gruss(vorname)}\nHier ist dein Zahlungslink für dein Tattoo:\n\n` +
  `💳 ${[betrag, projekt].filter(Boolean).join(" · ")}\n👉 ${link}\n\n` +
  `${zahlarten}${klarna ? ` ${KLARNA_NAME.verfuegbar}.` : ""}\n\n` +
  `Liebe Grüße\n${firma}`;

// Text zum Teilen eines Zahlungslinks (beim Erstellen und später in der App-Detailansicht).
// Links mit Gutschein-Wort (nurKarte) haben Klarna aus → Text ohne Klarna.
export const teilText = (s, z, link) => {
  const betragText = euro(z.betragCent);
  const vorname = z.kunde ? z.kunde.split(" ")[0] : "";
  if (z.art === "gutschein")
    return `${gruss(vorname)}\nHier ist dein Link für den Gutschein:\n\n` +
      `🎁 ${betragText} · Gutschein${z.gutschein?.empfaenger ? " für " + z.gutschein.empfaenger : ""}\n👉 ${link}\n\n` +
      `Nach dem Bezahlen bekommst du den Gutschein mit Code per E-Mail.\n\nLiebe Grüße\n${s.firma}`;
  if (z.art === "anzahlung") {
    const projekt = z.beschreibung || "Tattoo-Projekt";
    return `${gruss(vorname)}\nHier ist dein Link für die Anzahlung:\n\n` +
      `💳 ${betragText} · ${/anzahlung/i.test(projekt) ? projekt : "Anzahlung für " + projekt}\n👉 ${link}\n\n` +
      `${zahlarten}\n\nLiebe Grüße\n${s.firma}`;
  }
  return ratenWhatsapp({ vorname, projekt: z.beschreibung, betrag: betragText, link, firma: s.firma, klarna: klarnaFuer(s) && !z.nurKarte });
};

// Manuelle Punkte der Einrichtungs-Checkliste (die übrigen erkennt das System selbst)
const CHECK_MANUELL = ["app", "werbung", "theke"];
import { mails } from "./_lib/emails.mjs";

// Mit App-Token gesperrte Bereiche (nur im Dashboard)
const NUR_WEB = ["stripe-session", "rechnungen", "umstellung", "erstattung", "extra"];
// Mit App-Token einer Team-Adresse gesperrt (nur der Inhaber darf das; im Web gilt das Cookie wie bisher)
const NUR_INHABER = ["kuendigung", "stripe-dashboard", "kontakt", "abmelden", "recht", "fragebogen", "adresse"];

export default handler(async (req, context) => {
  const s = await currentStudio(req);
  if (!s) return json({ error: "Bitte einloggen", code: "nicht_angemeldet" }, 401);
  const url = new URL(req.url);
  const [bereich, sub] = url.pathname.replace(/^\/api\/portal\/?/, "").split("/").filter(Boolean);
  if (s._app && (NUR_WEB.includes(bereich) || (bereich === "kuendigung" && req.method === "DELETE"))) return json({ error: "Das geht nur im Dashboard.", code: "nur_web" }, 403);
  if (s._app && s._app.rolle !== "inhaber" && NUR_INHABER.includes(bereich)) return json({ error: "Das kann nur der Inhaber.", code: "nur_inhaber" }, 403);
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
    return json({
      adminAnsicht: s._ansicht ? { admin: s._ansicht.admin } : null,
      studio: oeffentlich(s), zahlungen: zahlungen.map(fuerStudio), abrechnungen: await abrechnungenVon(s.id),
      // Extras mit Preisen nicht in der App (Apple 3.1.1/3.1.3)
      extras: s._app ? [] : EXTRAS,
      kpis: {
        umsatzMonatCent: imMonat.reduce((a, z) => a + z.betragCent, 0), zahlungenMonat: imMonat.length,
        provisionMonatBruttoCent: imMonat.reduce((a, z) => a + provisionVerdient(z), 0),
        auszahlungMonatCent: imMonat.reduce((a, z) => a + z.betragCent - (z.erstattetCent || 0) - provisionVerdient(z), 0),
        umsatzGesamtCent: bezahlt.reduce((a, z) => a + z.betragCent, 0), offen: zahlungen.filter((z) => z.status === "offen").length,
        anteilKlarna: bezahlt.length ? Math.round(100 * bezahlt.filter((z) => z.zahlart === "klarna").length / bezahlt.length) : 0,
      },
      ratenText: ratenWhatsapp({ vorname: "[Name]", projekt: "[Motiv]", betrag: "[Betrag]", link: "[Zahlungslink]", firma: s.firma, klarna: klarnaFuer(s) }),
      // Druckvorlagen sagen „Ratenzahlung möglich*“ → nur bei Klarna dauerhaft (gleiche Regel wie GET /api/app/werbung, _lib/werbung.mjs)
      materialLinks: werbungMitKlarna(s) ? materialLinks(s) : [],
      config: { provisionProzent: provisionSatz(s), ustProzent: CFG.ustProzent, rechtVersion: CFG.rechtVersion, ruecklastGebuehrCent: CFG.ruecklastGebuehrCent, garantieTage: CFG.garantieTage, minBetragCent: CFG.minBetragCent, maxBetragCent: CFG.maxBetragCent },
    });
  }

  if (bereich === "zahlung") {
    if (req.method === "POST" && !sub) {
      if (!darfKassieren(s)) return fail(!s.stripe?.chargesEnabled ? "Dein Stripe-Konto ist noch nicht freigegeben. Sobald Stripe die Prüfung abgeschlossen hat, kannst du Zahlungslinks erstellen."
        : !studioAdresseDa(s) ? "Adresse fehlt noch: Bitte trag die Adresse deiner Zahlseite im Studio-Bereich auf tattoofin.de unter „Einrichtung“ ein, dann kannst du Zahlungslinks erstellen." : "Dein Vertrag ist nicht aktiv.", 409);
      const b = await body(req);
      const betragCent = parseBetrag(b.betrag);
      if (!(betragCent >= CFG.minBetragCent && betragCent <= CFG.maxBetragCent)) return fail(`Bitte einen Betrag zwischen ${CFG.minBetragCent / 100} € und ${CFG.maxBetragCent / 100} € eingeben.`);
      const email = clean(b.email, 160).toLowerCase();
      if (email && !isEmail(email)) return fail("Bitte eine gültige E-Mail-Adresse eingeben oder das Feld leer lassen.");
      const fee = plattformgebuehr(betragCent, s);
      const gutschein = b.art === "gutschein";
      if (gutschein && !clean(b.kunde, 80)) return fail("Bitte den Namen des Käufers eintragen.");
      if (gutschein && !email) return fail("Bitte die E-Mail des Käufers eintragen – dorthin schicken wir den Gutschein.");
      // Gutschein-Wörter im normalen Projektfeld: Klarna aus (Stripe/Klarna schließen Gutscheine/Guthaben aus), Hinweis auf die Gutschein-Funktion
      const gutscheinImProjekt = !gutschein && gutscheinWort(b.beschreibung, b.sitzungen);
      const z = {
        ...(gutscheinImProjekt ? { nurKarte: true } : {}),
        ...(b.heute === true && !gutschein && b.art !== "anzahlung" ? { heute: true } : {}),
        id: id("zl_"), studioId: s.id, createdAt: now(), art: gutschein ? "gutschein" : b.art === "anzahlung" ? "anzahlung" : "gesamt", status: "offen",
        betragCent, kunde: clean(b.kunde, 80), email, beschreibung: gutschein ? "Wertgutschein" : clean(b.beschreibung, 120) || "Tattoo-Projekt", sitzungen: gutschein ? "" : clean(b.sitzungen, 60),
        gebuehrNettoCent: fee.nettoCent, gebuehrBruttoCent: fee.bruttoCent,
        ...(gutschein ? { gutschein: { empfaenger: clean(b.empfaenger, 80), nachricht: clean(b.nachricht, 240) } } : {}),
      };
      await saveZahlung(z);
      const link = zahlungsLink(z.id);
      const text = teilText(s, z, link);
      await log("zahlungslink", { studioId: s.id, zahlungId: z.id, betragCent });
      return json({ zahlung: fuerStudio(z), link, whatsappText: text, ...(gutscheinImProjekt ? { hinweis: GUTSCHEIN_HINWEIS } : {}) }, 201);
    }
    // Eine Zahlung (App: Detailansicht, nach dem Teilen des Links regelmäßig neu laden). abgleich=1: Status bei Stripe nachsehen,
    // nur bei offen/in_pruefung und höchstens alle 10 Sekunden pro Zahlung (Sperre abgleich/<id>), damit die App Stripe nicht flutet.
    if (req.method === "GET" && sub) {
      let z = await getZahlung(s.id, sub);
      if (!z) return fail("Nicht gefunden", 404);
      if (url.searchParams.get("abgleich") && ["offen", "in_pruefung"].includes(z.status) && !s.demo && !s._ansicht) {
        const sperre = await store.get("abgleich/" + z.id);
        if (!sperre?.am || Date.now() - new Date(sperre.am).getTime() >= 10e3) {
          await store.set("abgleich/" + z.id, { am: now() });
          if (await zahlungAbgleichen(s, z)) z = await getZahlung(s.id, sub);
        }
      }
      const link = zahlungsLink(z.id);
      return json({ zahlung: fuerStudio(z), link, ...(z.status === "offen" ? { whatsappText: teilText(s, z, link) } : {}) });
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

  // Altstudio stimmt dem neuen Vertrag und dem festen Monatspreis zu (nur mit Angebot, nur aktiv: § 7 und § 12 Altvertrag)
  if (bereich === "umstellung" && req.method === "POST") {
    if (s._ansicht) return fail("In der Admin-Ansicht nicht möglich.", 403);
    if (!hatUmstellungsangebot(s)) return fail("Für dein Studio liegt kein Angebot vor.", 409);
    const b = await body(req);
    // Schon zugestimmt (zum selben Preis), nur noch nicht bezahlt: direkt zur ersten Monatszahlung, ohne zweite Zustimmung
    if (b.nurZahlen === true) {
      const z = s.umstellung.zustimmung;
      if (!z || z.monatNetto !== s.umstellung.monatNetto) return fail("Bitte stimme dem Angebot zuerst zu.", 409);
      await log("umstellung.zahlung-gestartet", { studioId: s.id, monatNetto: s.umstellung.monatNetto });
      return json({ url: await umstellungCheckout(s) });
    }
    const a = b.akzeptiert || {};
    const name = clean(b.unterzeichner, 120);
    if (!(a.vertrag && a.avv && a.unternehmer && a.kmu)) return fail("Bitte bestätige Vertrag, AVV, Unternehmereigenschaft und Unternehmensgröße.");
    if (name.length < 3) return fail("Bitte trage deinen Vor- und Nachnamen ein.");
    s.umstellung.zustimmung = {
      version: CFG.vertragVersion, akzeptiertAm: now(), am: now(), name, ip: clientIp(req, context), ua: (req.headers.get("user-agent") || "").slice(0, 200),
      vertrag: true, avv: true, unternehmer: true, kmu: true, modell: "kauf", paket: "monatlich", preisNetto: null, monatNetto: s.umstellung.monatNetto, provisionProzent: null,
    };
    await saveStudio(s);
    await log("umstellung.zustimmung", { studioId: s.id, monatNetto: s.umstellung.monatNetto });
    return json({ url: await umstellungCheckout(s) });
  }

  if (bereich === "kuendigung") {
    if (req.method === "POST") {
      const b = await body(req);
      return json(oeffentlich(await kuendigungEinreichen(s, { grund: b.grund, garantie: b.garantie })));
    }
    if (req.method === "DELETE") return json(oeffentlich(await kuendigungZuruecknehmen(s)));
  }

  // Erstattung bei Provision: Tattoofin hat kassiert, also läuft die Erstattung über die Plattform.
  // reverse_transfer holt den Betrag anteilig vom Studio-Konto zurück; die Provision verrechnet der Webhook (charge.refunded).
  if (bereich === "erstattung" && sub && req.method === "POST") {
    const z = await getZahlung(s.id, sub);
    if (!z) return fail("Nicht gefunden", 404);
    if (!provisionZahlung(z)) return fail("Erstattungen machst du direkt in deinem Stripe-Dashboard.");
    if (z.status !== "bezahlt") return fail("Nur bezahlte Zahlungen können erstattet werden.");
    if (z.rueckbuchung && !z.rueckbuchung.abgeschlossenAm) return fail("Zu dieser Zahlung läuft eine Rückbuchung. Eine Erstattung ist erst nach Abschluss möglich.");
    const b = await body(req);
    const rest = z.betragCent - (z.erstattetCent || 0);
    const betragCent = parseBetrag(b.betrag);
    if (!(betragCent > 0 && betragCent <= rest)) return fail(`Bitte einen Betrag bis ${(rest / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })} € eingeben.`);
    // Destination Charge: reverse_transfer holt den Betrag beim Studio zurück. Direct Charge (RISIKOFREI_DIRECT): Die Erstattung läuft auf dem
    // Studio-Konto (Stripe-Account-Header), Stripe bucht sie dort ab, die Plattformgebühr verrechnet der Webhook.
    const direkt = z.abwicklung === "direkt";
    await stripe("POST", "/refunds", {
      payment_intent: z.paymentIntentId, amount: betragCent, ...(direkt ? {} : { reverse_transfer: true }), refund_application_fee: false,
      metadata: { tattoofinZahlung: z.id, studioId: s.id, quelle: "portal" },
    }, { idempotencyKey: `re-${z.id}-${z.erstattetCent || 0}-${betragCent}`, ...(direkt ? { account: s.stripe.accountId } : {}) });
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

  // Adresse deiner Zahlseite (steht auf der Zahlseite, im Warenkorb und auf Gutscheinen). Ein Knopf „Stimmt so“ bestätigt den Vorschlag
  // aus dem Stripe-Konto; geänderte Werte gelten als eigene Angabe des Studios. Die Rechnungsadresse (s.rechnungsadresse) bleibt davon getrennt.
  if (bereich === "adresse" && req.method === "POST") {
    const b = await body(req);
    const neu = { strasse: clean(b.strasse, 120), plz: clean(b.plz, 10), ort: clean(b.ort, 80) };
    const land = String(s.land || "DE").toUpperCase();
    const fehlt = [!neu.strasse && "Straße und Hausnummer", !neu.ort && "Ort", land === "DE" && !/^\d{5}$/.test(neu.plz) && "PLZ (5 Ziffern)"].filter(Boolean);
    if (fehlt.length) return fail("Bitte ausfüllen: " + fehlt.join(", "));
    const geaendert = ["strasse", "plz", "ort"].some((k) => (s[k] || "") !== neu[k]);
    Object.assign(s, neu, { land, adresseBestaetigt: true, adresseBestaetigtAm: now(), adresseQuelle: geaendert || !s.adresseQuelle ? "studio" : s.adresseQuelle });
    await saveStudio(s);
    await log("adresse-zahlseite", { studioId: s.id, quelle: s.adresseQuelle });
    return json(oeffentlich(s));
  }

  if (bereich === "kontakt" && req.method === "PATCH") {
    const b = await body(req);
    if (b.email !== undefined) { if (!isEmail(b.email)) return fail("Bitte gültige E-Mail"); s.benachrichtigungEmail = clean(b.email, 160); }
    if (b.anzahlungsbedingungen !== undefined) {
      // Zu kurze Texte („x“) sind keine Bedingungen: dann gilt der Standardtext
      const t = clean(b.anzahlungsbedingungen, 1000);
      s.anzahlungsbedingungen = t.length >= 30 ? t : null;
    }
    // Ausweg bei Klarna-Ablehnung: Anzahlung per Karte anbieten (Prozent vom Gesamtbetrag, 10–50 %)
    if (b.ausweichAnzahlung !== undefined) {
      const pr = Math.round(Number(b.ausweichAnzahlung?.prozent) || 30);
      if (pr < 10 || pr > 50) return fail("Bitte einen Anteil zwischen 10 und 50 % eingeben.");
      s.ausweichAnzahlung = { an: Boolean(b.ausweichAnzahlung?.an), prozent: pr, am: now() };
    }
    // Hinweis zu den Zahlarten auf der Zahlseite: entscheidet allein das Studio (Standard: aus)
    if (b.zahlartenHinweis !== undefined) s.zahlartenHinweis = Boolean(b.zahlartenHinweis);
    await saveStudio(s);
    return json(oeffentlich(s));
  }

  // ---- Eingebettete Stripe-Bausteine ----
  if (bereich === "stripe-session" && req.method === "POST") {
    if (["entwurf", "abgebrochen", "beendet", "erstattet"].includes(s.status)) return fail("Dein Vertrag ist nicht aktiv.", 409);
    if (!eingebettet()) return json({ modus: "weiterleitung", url: connectUrl(s) });
    if (!s.stripe?.accountId) { await ensureConnectedAccount(s); await saveStudio(s); }
    if (BAUSTEINE_SIMULIERT) return json({ modus: "simulation", konto: s.stripe.accountId, kontoTyp: s.stripe.kontoTyp });
    let as;
    try { as = await accountSession(s); }
    catch (e) {
      // Eingebettete Einrichtung nicht möglich → Studio kommt über die Stripe-Seite zum Ziel (gleicher Ablauf wie die Notlösung TF_EINBETTEN=aus)
      console.error("[portal] Account Session fehlgeschlagen:", e.message);
      await log("account-session-fehler", { studioId: s.id, kontoTyp: s.stripe.kontoTyp, fehler: String(e.message).slice(0, 200) });
      const letzte = s.einbettenFehlerAm && Date.now() - new Date(s.einbettenFehlerAm).getTime() < 24 * 3600e3;
      if (!letzte) { s.einbettenFehlerAm = now(); await saveStudio(s); await notifyAdmin("Eingebettete Stripe-Einrichtung nicht möglich: Studio nutzt die Stripe-Seite", s, { Konto: s.stripe.accountId, Typ: s.stripe.kontoTyp, Fehler: String(e.message).slice(0, 200) }); }
      return json({ modus: "weiterleitung", url: connectUrlGehostet(s), grund: "einbetten-fehlgeschlagen" });
    }
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
    const d = {
      studio: { firma: s.firma, inhaber: s.inhaber, strasse: s.strasse, plz: s.plz, ort: s.ort },
      zahlung: { ...fuerStudio(z), kundeBestaetigt: z.kundeBestaetigt || null },
      leistung: l ? { ...l, ua: undefined } : null, version: CFG.bestaetigungVersion, erstellt: now(),
    };
    // ?pdf=1: fertiges PDF (App teilt es per Teilen-Menü; enthält Kundendaten → nie zwischenspeichern)
    if (url.searchParams.get("pdf") === "1") {
      const name = `Nachweis-${(s.slug || "studio")}-${z.id}.pdf`;
      return new Response(await nachweisPdf(d), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${name}"`, "cache-control": "no-store" } });
    }
    return json(d);
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

  // ---- QR-Aufsteller aus Holz: eingestellt (15.11.2026, Entscheidung Domenic). Keine neuen Bestellungen, kein Checkout, keine Admin-Mail.
  // Bestandsdaten (s.aufsteller) bleiben für den Admin lesbar. App (auch App 1.0 (1)): immer 410 mit freundlichem Text.
  const aufstellerEntfallen = () => json(AUFSTELLER_ENTFALLEN, 410);
  // Prüf-Studios in der App (App-Prüfung bei Apple): alter Ablauf ohne echte Bestellung. Nur bis Apple 1.0 freigegeben hat, dann entfernen
  // (Entscheidung Domenic 16.11.2026). Kein notifyAdmin, kein Stripe-Checkout, kein Hersteller-Link; Antwort ohne url/cs (App: „angefordert“).
  const aufstellerPruefung = ["aufsteller", "aufsteller-pruefen"].includes(bereich) && req.method === "POST" && s._app && istAufstellerPruefStudio(s);
  if (aufstellerPruefung && s._app.rolle !== "inhaber") return json({ error: "Das kann nur der Inhaber.", code: "nur_inhaber" }, 403);
  if (aufstellerPruefung && bereich === "aufsteller-pruefen") {
    return json({ aufsteller: await aufstellerFuerPruefApp(s), bezahlt: Boolean(s.aufsteller?.angefordertAm) });
  }
  if (aufstellerPruefung) {
    const b = await body(req);
    const holz = ["hell", "dunkel"].includes(b.holz) ? b.holz : "hell";
    const variante = ["name", "logo"].includes(b.variante) ? b.variante : "name";
    const a = { ...(s.aufsteller || {}), holz, variante, am: now(), pruefung: true };
    let aktion = "auswahl";
    if (b.logo === null) { await store.del("aufsteller-logo/" + s.id); a.hatLogo = false; aktion = "logo-geloescht"; }
    else if (typeof b.logo === "string") {
      if (!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(b.logo) || b.logo.length > 700000) return fail("Logo bitte als Bild unter 500 KB hochladen.");
      await store.set("aufsteller-logo/" + s.id, { src: b.logo, w: Math.round(Number(b.logoW) || 0), h: Math.round(Number(b.logoH) || 0), am: now() });
      a.hatLogo = true; aktion = "logo";
    }
    if (variante === "logo" && !a.hatLogo) return fail("Bitte wähle zuerst dein Logo aus oder nimm „Mit Studioname“.");
    // bestellen / anfordern / kaufen: nur vermerken (ein zweites Mal ist dieselbe Erfolgsantwort, kein 409)
    if (b.bestellen === true || b.anfordern === true || b.kaufen === true) { a.angefordertAm = a.angefordertAm || now(); aktion = "bestellt"; }
    s.aufsteller = a;
    await saveStudio(s);
    await log("aufsteller-pruefstudio", { studioId: s.id, aktion });
    return json({ aufsteller: await aufstellerFuerPruefApp(s) });
  }
  if (bereich === "aufsteller" && req.method === "POST") {
    const b = await body(req);
    // Datenschutz: ein früher hochgeladenes Logo lässt sich weiter löschen (nur im Dashboard bzw. vom Inhaber)
    if (b.logo === null && (!s._app || s._app.rolle === "inhaber")) {
      await aufstellerLogoLoeschen(s, s._app ? "app" : "web");
      if (!s._app) return json({ ok: true, logoGeloescht: true });
    }
    return aufstellerEntfallen();
  }

  // Rückkehr aus einem Aufsteller-Checkout, der VOR der Einstellung begonnen wurde: Zahlung nicht verlieren (Admin-Mail „alt bezahlt“).
  if (bereich === "aufsteller-pruefen" && req.method === "POST") {
    const offen = s.aufsteller?.kauf?.csId && !s.aufsteller.kauf.bezahltAm;
    if (s._app || !offen) return aufstellerEntfallen();
    const cs = clean((await body(req)).cs, 200);
    if (!/^cs_[A-Za-z0-9_]+$/.test(cs) || cs !== s.aufsteller.kauf.csId) return fail("Ungültig");
    const session = await stripe("GET", "/checkout/sessions/" + cs);
    const ok = await aufstellerBezahlt(s, session);
    return json({ ...oeffentlich(s), bezahlt: ok });
  }

  if (bereich === "checkliste" && req.method === "POST") {
    const b = await body(req);
    if (!CHECK_MANUELL.includes(b.punkt)) return fail("Unbekannter Punkt");
    s.checkliste = { ...(s.checkliste || {}), [b.punkt]: b.erledigt ? now() : null };
    await saveStudio(s);
    return json(oeffentlich(s));
  }

  // ---- Gutscheine ----
  if (bereich === "gutschein-code" && req.method === "GET") {
    // ?t=<token>: QR-Code auf PDF/Gutscheinseite (gutschein.html?t=…), die App scannt ihn
    const t = url.searchParams.get("t");
    if (t) {
      const r = await gutscheinPerToken(clean(t, 60));
      if (!r || r.z.studioId !== s.id) return fail("Kein Gutschein mit diesem Code gefunden.", 404);
      return json(fuerStudio(r.z));
    }
    const code = normCode(url.searchParams.get("code"));
    const ref = code ? await store.get("idx/gutschein/" + code) : null;
    const [sid, zid] = (ref || "").split("/");
    if (!ref || sid !== s.id) return fail("Kein Gutschein mit diesem Code gefunden.", 404);
    return json(fuerStudio(await getZahlung(s.id, zid)));
  }
  if (bereich === "gutschein" && sub) {
    const z = await getZahlung(s.id, sub);
    if (!z || z.art !== "gutschein") return fail("Nicht gefunden", 404);
    const aktion = url.pathname.split("/").filter(Boolean).pop();
    if (aktion === "pdf" && req.method === "GET") {
      if (!z.gutschein?.code) return fail("Der Gutschein entsteht, sobald er bezahlt ist.", 409);
      return new Response(await gutscheinPdf(s, z), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="Gutschein-${z.gutschein.code}.pdf"`, "cache-control": "no-store" } });
    }
    if (aktion === "einloesen") {
      const st = gutscheinStatus(z);
      if (req.method === "POST") {
        if (st === "eingeloest") return fail("Dieser Gutschein ist schon eingelöst.", 409);
        if (st !== "gueltig" && st !== "abgelaufen") return fail("Nur bezahlte Gutscheine können eingelöst werden.", 409);
        z.gutschein.eingeloestAm = now(); z.gutschein.einloeseNotiz = clean((await body(req)).notiz, 200);
      } else if (req.method === "DELETE") {
        if (st !== "eingeloest") return fail("Dieser Gutschein ist nicht eingelöst.", 409);
        z.gutschein.einloesungZurueck = [...(z.gutschein.einloesungZurueck || []), { am: now(), war: z.gutschein.eingeloestAm }];
        delete z.gutschein.eingeloestAm; delete z.gutschein.einloeseNotiz;
      } else return fail("Methode nicht erlaubt", 405);
      await saveZahlung(z);
      await log("gutschein-" + (req.method === "POST" ? "eingeloest" : "einloesung-zurueck"), { studioId: s.id, zahlungId: z.id, code: z.gutschein.code });
      return json(fuerStudio(z));
    }
    if (aktion === "senden" && req.method === "POST") {
      if (!z.gutschein?.code) return fail("Der Gutschein entsteht, sobald er bezahlt ist.", 409);
      if (!z.email) return json({ error: "Für diesen Gutschein ist keine E-Mail-Adresse des Käufers hinterlegt.", code: "keine_email" }, 409);
      const ok = await gutscheinSenden(s, z);
      return json({ ...fuerStudio(z), gesendet: ok });
    }
  }

  if (bereich === "abmelden" && req.method === "POST") {
    // App: nur der Inhaber darf alle Geräte und Browser abmelden (ein Team-Handy würde sonst auch den Inhaber rauswerfen)
    if (s._app && s._app.rolle !== "inhaber") return json({ error: "Nur der Inhaber kann alle Geräte abmelden.", code: "nur_inhaber" }, 403);
    s.sessionVersion = (s.sessionVersion || 0) + 1;
    await saveStudio(s);
    // App-Geräte zusätzlich widerrufen: Token weg UND kein Push mehr an abgemeldete Handys (Sitzungsversion allein ließe den Push-Token stehen)
    await geraeteWiderrufen(s.id, () => true, "alle-abgemeldet");
    return json({ ok: true }, 200, { "Set-Cookie": clearCookie() });
  }

  return fail("Nicht gefunden", 404);
});

export const config = { path: ["/api/portal", "/api/portal/*"] };
