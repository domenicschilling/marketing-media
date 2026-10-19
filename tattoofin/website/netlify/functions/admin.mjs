// Admin-API (Header: Authorization: Bearer <ADMIN_TOKEN>)
//   GET   /api/admin/studios
//   GET   /api/admin/studio/:id
//   PATCH /api/admin/studio/:id               { status, notiz, benachrichtigungEmail, strasse, plz, ort, website }
//   POST  /api/admin/studio/:id/live          Go-live setzen + E-Mail
//   POST  /api/admin/studio/:id/erstattung    Garantie-Erstattung (Kauf) über Stripe
//   POST  /api/admin/studio/:id/login-link    Login-Link für Support
//   POST  /api/admin/studio/:id/konto         Stripe-Kontostatus neu abfragen
//   POST  /api/admin/abrechnung               { monat: "YYYY-MM", dryRun }
//   POST  /api/admin/jobs                     tägliche Jobs sofort ausführen
//   GET   /api/admin/mails                    letzte E-Mails
//   POST  /api/admin/anleitung                { email, firma } → Einrichtungs-Anleitung per E-Mail
//   POST  /api/admin/einladen                 { email, firma } → Geschenk-Einladung (0 € Einrichtung, 0 % Provision) per E-Mail
//   GET   /api/admin/anfragen                 Kurz-Anfragen von /studios (neueste zuerst)
//   GET   /api/admin/studio-tipps             von Kunden auf /raten genannte Studios, gezählt (nur intern, nie anschreiben)
//   POST  /api/admin/studio/:id/einrichtungslink  signierter Stripe-Einrichtungslink (24 h) zum Weitergeben
//   POST  /api/admin/studio/:id/ansehen       Link für „Dashboard ansehen“ (nur lesend, protokolliert)
//   Anmeldung: ADMIN_TOKEN (Bearer) oder Admin-Sitzung per E-Mail-Link (/api/admin-login)
//   GET   /api/admin/mail-status              Warteschlange (hängende Mails), Versandwege, letzte Fehler
//   POST  /api/admin/mail-nachsenden          Warteschlange sofort erneut versuchen
//   POST  /api/admin/konten-abgleichen        Stripe-Status aller Studios mit Konto neu abfragen (ohne Webhook)
//   GET   /api/admin/gesundheit               letztes Ergebnis des stündlichen Gesundheits-Checks
//   GET   /api/admin/studio/:id/branding      hinterlegtes Branding (Logo/Icon/Farben/Kurzbezeichnung)
//   POST  /api/admin/studio/:id/branding      { logo?, icon? (data:image/png|jpeg;base64), farbe?, akzent? (#RRGGBB), kurzbezeichnung?, logoHell?, stripe? }
//                                             speichert fürs Studio (Zahlseite + Checkout) und setzt mit stripe:true auch das Branding des verbundenen Stripe-Kontos
//   POST  /api/admin/checkout-test            unbezahlte Test-Sitzung (1 €) mit Tattoofin-Branding → { id, url }; { expire: "cs_…" } beendet sie
import { CFG, netto, paketVon, provisionSatz } from "./_lib/config.mjs";
import { json, fail, body, clean, now, handler } from "./_lib/util.mjs";
import { allStudios, getStudio, saveStudio, zahlungenVon, abrechnungenVon, store, log } from "./_lib/store.mjs";
import { isAdmin, loginLink, sign, adminName } from "./_lib/auth.mjs";
import { stripe, TATTOOFIN_BRANDING } from "./_lib/stripe.mjs";
import { notify, monatsabrechnung, taeglicheJobs, kontoAbgleichen, provisionVerdient, STATUS, aufstellerUrl, connectUrl } from "./_lib/domain.mjs";
import { mails } from "./_lib/emails.mjs";
import { sendMail, warteschlangeStatus, warteschlangeAbarbeiten } from "./_lib/mail.mjs";
import { randomBytes } from "node:crypto";
import { brandingSetzen, brandingOeffentlich } from "./_lib/branding.mjs";

export default handler(async (req) => {
  if (!isAdmin(req)) return fail("Nicht berechtigt", 401);
  const teile = new URL(req.url).pathname.replace(/^\/api\/admin\/?/, "").split("/").filter(Boolean);
  const [bereich, sid, aktion] = teile;

  if (bereich === "anleitung" && req.method === "POST") {
    const b = await body(req);
    const email = clean(b.email, 160).toLowerCase(), firma = clean(b.firma, 120);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !firma) return fail("E-Mail und Studio-Name angeben.");
    const m = mails.anleitung({ firma });
    await sendMail({ to: email, subject: m.subject, html: m.html, text: m.text });
    await log("anleitung", { email, firma });
    return json({ ok: true });
  }

  if (bereich === "einladen" && req.method === "POST") {
    const b = await body(req);
    const email = clean(b.email, 160).toLowerCase(), firma = clean(b.firma, 120);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !firma) return fail("E-Mail und Studio-Name angeben.");
    const code = randomBytes(9).toString("base64url");
    await store.set(`geschenk/${code}`, { code, email, firma, erstellt: now(), benutzt: null });
    const link = `${CFG.siteUrl}/start.html?modell=kauf&geschenk=${code}`;
    const m = mails.geschenkEinladung({ firma, link });
    if (b.senden !== false) await sendMail({ to: email, subject: m.subject, html: m.html, text: m.text });
    await log("einladung", { email, firma });
    return json({ ok: true, link, gesendet: b.senden !== false });
  }

  if (bereich === "studios" && req.method === "GET") {
    const list = await allStudios();
    const out = [];
    for (const s of list) {
      const z = await zahlungenVon(s.id);
      const bezahlt = z.filter((x) => x.status === "bezahlt");
      const abgerechnet = z.filter((x) => ["bezahlt", "erstattet", "rueckgebucht"].includes(x.status));
      out.push({
        id: s.id, firma: s.firma, ort: s.ort, email: s.email, modell: s.modell, status: s.status, statusText: STATUS[s.status],
        createdAt: s.createdAt, goLiveAt: s.goLiveAt, zahlungen: bezahlt.length, offen: z.filter((x) => x.status === "offen").length,
        umsatzCent: bezahlt.reduce((a, x) => a + x.betragCent, 0), provisionNettoCent: abgerechnet.reduce((a, x) => a + netto(provisionVerdient(x)), 0),
        // Deckungsbeitrag Provision: Provision netto minus Stripe-Gebühren, die Tattoofin bei Provision trägt
        deckungsbeitragCent: abgerechnet.reduce((a, x) => a + netto(provisionVerdient(x)) - (x.stripeGebuehrCent || 0), 0),
        stripe: s.stripe?.chargesEnabled ? "freigegeben" : s.stripe?.accountId ? "in Prüfung" : "nicht verbunden",
        fragebogen: Boolean(s.fragebogen), slug: s.slug,
        paket: paketVon(s).name, provisionProzent: provisionSatz(s),
        recht: s.recht ? `${s.recht.version} (${s.recht.am.slice(0, 10)})` : "", extras: Object.keys(s.extras || {}).join(", "),
      });
    }
    return json(out.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
  }

  if (bereich === "studio" && sid) {
    const s = await getStudio(sid);
    if (!s) return fail("Studio nicht gefunden", 404);
    if (!aktion && req.method === "GET") return json({ studio: s, aufstellerLink: aufstellerUrl(s), zahlungen: await zahlungenVon(s.id), abrechnungen: await abrechnungenVon(s.id) });
    if (!aktion && req.method === "PATCH") {
      const b = await body(req);
      for (const k of ["notiz", "benachrichtigungEmail"]) if (b[k] !== undefined) s[k] = clean(b[k], 1000);
      // Anschrift korrigieren (z. B. Firmenname im Feld Straße) – wichtig für Monatsabrechnung und Vertrag
      for (const k of ["strasse", "plz", "ort", "website"]) if (b[k] !== undefined) s[k] = clean(b[k], 160);
      if (b.status && STATUS[b.status]) s.status = b.status;
      await saveStudio(s);
      return json(s);
    }
    if (aktion === "live" && req.method === "POST") {
      if (!s.stripe?.chargesEnabled) return fail("Das Stripe-Konto ist noch nicht freigegeben.");
      s.status = "live";
      s.goLiveAt = s.goLiveAt || now();
      await saveStudio(s);
      await notify(s, mails.live(s));
      await log("live", { studioId: s.id });
      return json(s);
    }
    if (aktion === "erstattung" && req.method === "POST") {
      if (s.modell !== "kauf" || !s.stripe?.paymentIntentId) return fail("Keine erstattbare Kaufzahlung gefunden");
      const r = await stripe("POST", "/refunds", { payment_intent: s.stripe.paymentIntentId, reason: "requested_by_customer", metadata: { studioId: s.id, grund: "Zufriedenheitsgarantie" } }, { idempotencyKey: "refund-" + s.id });
      s.status = "erstattet";
      s.erstattung = { am: now(), refundId: r.id, betrag: r.amount };
      s.vertragsende = now();
      await saveStudio(s);
      await notify(s, mails.garantieErstattung(s, { betragCent: r.amount }));
      return json(s);
    }
    if (aktion === "login-link" && req.method === "POST") { await log("admin-link", { admin: adminName(req), studioId: s.id, art: "login" }); return json({ url: loginLink(s.id), gueltig: "24 Stunden, einmal verwendbar" }); }
    // Signierter Einrichtungslink (24 h, Zweck „connect“) zum Weitergeben per WhatsApp, z. B. wenn Mails nicht ankommen
    if (aktion === "einrichtungslink" && req.method === "POST") { await log("admin-link", { admin: adminName(req), studioId: s.id, art: "einrichtung" }); return json({ url: connectUrl(s), gueltig: "24 Stunden" }); }
    // „Dashboard ansehen“: kurzlebiger Link (2 Min.) → /api/admin-ansicht setzt eine nur lesende Studio-Sitzung
    if (aktion === "ansehen" && req.method === "POST") {
      await log("admin-ansicht-angefordert", { admin: adminName(req), studioId: s.id });
      return json({ url: `/api/admin-ansicht?t=${sign({ t: "ansicht", sid: s.id, admin: adminName(req), exp: Date.now() + 2 * 60000 })}` });
    }
    if (aktion === "branding" && req.method === "GET") return json({ branding: s.branding || null, oeffentlich: brandingOeffentlich(s) });
    if (aktion === "branding" && req.method === "POST") {
      const b = await body(req);
      let r;
      try { r = await brandingSetzen(s, b); }
      finally { if (s.branding) await saveStudio(s); } // Bilder/Farben bleiben gespeichert, auch wenn Stripe einen Fehler meldet
      await log("admin-branding", { admin: adminName(req), studioId: s.id, stripe: Boolean(b.stripe), felder: Object.keys(b).filter((k) => b[k] !== undefined && b[k] !== "") });
      return json({ ...r, oeffentlich: brandingOeffentlich(s) });
    }
    if (aktion === "konto" && req.method === "POST") {
      if (!s.stripe?.accountId) return fail("Kein Stripe-Konto verbunden");
      const vorher = { freigegeben: Boolean(s.stripe.chargesEnabled), auszahlungen: Boolean(s.stripe.payoutsEnabled), angaben: Boolean(s.stripe.detailsSubmitted) };
      await kontoAbgleichen(s, await stripe("GET", "/accounts/" + s.stripe.accountId));
      await log("admin-konto-abgleich", { admin: adminName(req), studioId: s.id });
      return json({ vorher, nachher: { freigegeben: Boolean(s.stripe.chargesEnabled), auszahlungen: Boolean(s.stripe.payoutsEnabled), angaben: Boolean(s.stripe.detailsSubmitted) }, offen: s.stripe.offen, abgeglichenAm: s.stripe.abgeglichenAm, accountId: s.stripe.accountId });
    }
  }

  if (bereich === "abrechnung" && req.method === "POST") {
    const b = await body(req);
    const monat = /^\d{4}-\d{2}$/.test(b.monat || "") ? b.monat : new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
    return json(await monatsabrechnung(monat, { dryRun: b.dryRun !== false }));
  }
  if (bereich === "jobs" && req.method === "POST") return json(await taeglicheJobs());
  if (bereich === "mail-status" && req.method === "GET") {
    const fehlerKeys = (await store.list("mail-fehler/")).slice(-5).reverse();
    const fehler = [];
    for (const k of fehlerKeys) { const f = await store.get(k); if (f) fehler.push({ am: k.slice(12), an: f.to, betreff: f.subject, fehler: String(f.error || "").slice(0, 200) }); }
    return json({ ...(await warteschlangeStatus()), fehler });
  }
  if (bereich === "mail-nachsenden" && req.method === "POST") return json({ ergebnis: await warteschlangeAbarbeiten(), status: await warteschlangeStatus() });
  if (bereich === "konten-abgleichen" && req.method === "POST") {
    const out = [];
    for (const s of await allStudios()) {
      if (!s.stripe?.accountId) continue;
      try { await kontoAbgleichen(s, await stripe("GET", "/accounts/" + s.stripe.accountId)); out.push({ id: s.id, firma: s.firma, freigegeben: Boolean(s.stripe.chargesEnabled), offen: s.stripe.offen?.faellig?.length || 0 }); }
      catch (e) { out.push({ id: s.id, firma: s.firma, fehler: e.message }); }
    }
    await log("admin-konten-abgleich", { admin: adminName(req), anzahl: out.length });
    return json(out);
  }
  if (bereich === "gesundheit" && req.method === "GET") return json((await store.get("meta/gesundheit")) || { hinweis: "Noch kein Check gelaufen." });
  if (bereich === "mails" && req.method === "GET") {
    const keys = (await store.list("mail/")).slice(-50).reverse();
    const out = [];
    for (const k of keys) { const m = await store.get(k); out.push({ at: m.at, to: m.to, subject: m.subject }); }
    return json(out);
  }
  if (bereich === "checkout-test" && req.method === "POST") {
    const b = await body(req);
    if (b.expire) return json(await stripe("POST", `/checkout/sessions/${clean(b.expire, 200)}/expire`));
    const cs = await stripe("POST", "/checkout/sessions", {
      mode: "payment", locale: "de", payment_method_types: ["card"],
      line_items: [{ quantity: 1, price_data: { currency: "eur", unit_amount: 100, product_data: { name: "TEST – Branding-Prüfung, bitte nicht bezahlen" } } }],
      branding_settings: TATTOOFIN_BRANDING, metadata: { typ: "branding-test" },
      success_url: `${CFG.siteUrl}/`, cancel_url: `${CFG.siteUrl}/`,
    });
    await log("checkout-test", { id: cs.id });
    return json({ id: cs.id, url: cs.url, branding: cs.branding_settings || null });
  }
  if (bereich === "anfragen" && req.method === "GET") {
    const keys = (await store.list("anfrage/")).slice(-200).reverse();
    const out = [];
    for (const k of keys) { const a = await store.get(k); if (a) out.push(a); }
    return json(out);
  }
  // Von Kunden auf /raten genannte Studios, gezählt (nur intern; Studios werden deswegen NICHT angeschrieben, § 7 UWG)
  if (bereich === "studio-tipps" && req.method === "GET") {
    const zaehl = {};
    for (const k of await store.list("studio-tipp/")) {
      const t = await store.get(k); if (!t || t.test) continue;
      const key = `${t.studio} | ${t.stadt || "–"}`.toLowerCase();
      const z = (zaehl[key] ||= { studio: t.studio, stadt: t.stadt || "", anzahl: 0, zuletzt: t.am, kanaele: {} });
      z.anzahl++; z.kanaele[t.kanal] = (z.kanaele[t.kanal] || 0) + 1; if (t.am > z.zuletzt) z.zuletzt = t.am;
    }
    return json(Object.values(zaehl).sort((a, b) => b.anzahl - a.anzahl || (b.zuletzt > a.zuletzt ? 1 : -1)));
  }
  if (bereich === "info" && req.method === "GET") return json({ siteUrl: CFG.siteUrl, aktion: await store.get("meta/aktion-zaehler"), vorschau: CFG.vorschau });
  return fail("Nicht gefunden", 404);
});

export const config = { path: ["/api/admin", "/api/admin/*"] };
