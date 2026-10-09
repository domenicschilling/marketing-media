// Admin-API (Header: Authorization: Bearer <ADMIN_TOKEN>)
//   GET   /api/admin/studios
//   GET   /api/admin/studio/:id
//   PATCH /api/admin/studio/:id               { status, tedNummer, agentId, notiz, dringendNummer, whatsapp }
//   POST  /api/admin/studio/:id/live          Go-live setzen + E-Mail
//   POST  /api/admin/studio/:id/erstattung    Garantie-Erstattung (Kauf) über Stripe
//   POST  /api/admin/studio/:id/login-link    Login-Link für Support
//   POST  /api/admin/studio/:id/testanruf     Beispiel-Anfrage anlegen (Test)
//   POST  /api/admin/abrechnung               { monat: "YYYY-MM", dryRun }
//   POST  /api/admin/jobs                     tägliche Jobs sofort ausführen
//   GET   /api/admin/mails                    letzte E-Mails
import { CFG } from "./_lib/config.mjs";
import { json, fail, body, clean, now, handler, id } from "./_lib/util.mjs";
import { allStudios, getStudio, saveStudio, anfragenVon, abrechnungenVon, saveAnfrage, store, log } from "./_lib/store.mjs";
import { isAdmin, loginLink } from "./_lib/auth.mjs";
import { stripe } from "./_lib/stripe.mjs";
import { notify, monatsabrechnung, taeglicheJobs, STATUS } from "./_lib/domain.mjs";
import { mails } from "./_lib/emails.mjs";

export default handler(async (req) => {
  if (!isAdmin(req)) return fail("Nicht berechtigt", 401);
  const teile = new URL(req.url).pathname.replace(/^\/api\/admin\/?/, "").split("/").filter(Boolean);
  const [bereich, sid, aktion] = teile;

  if (bereich === "studios" && req.method === "GET") {
    const list = await allStudios();
    const out = [];
    for (const s of list) {
      const an = await anfragenVon(s.id);
      out.push({
        id: s.id, firma: s.firma, ort: s.ort, email: s.email, modell: s.modell, status: s.status, statusText: STATUS[s.status],
        createdAt: s.createdAt, goLiveAt: s.goLiveAt, anfragen: an.length, gebucht: an.filter((a) => a.status === "gebucht").length,
        offen: an.filter((a) => a.status === "offen").length, minuten: s.minuten?.[new Date().toISOString().slice(0, 7)] || 0,
        fragebogen: Boolean(s.fragebogen), tedNummer: s.tedNummer || "",
      });
    }
    return json(out.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
  }

  if (bereich === "studio" && sid) {
    const s = await getStudio(sid);
    if (!s) return fail("Studio nicht gefunden", 404);
    if (!aktion && req.method === "GET") return json({ studio: s, anfragen: await anfragenVon(s.id), abrechnungen: await abrechnungenVon(s.id) });
    if (!aktion && req.method === "PATCH") {
      const b = await body(req);
      for (const k of ["tedNummer", "agentId", "notiz", "dringendNummer", "whatsapp", "benachrichtigungEmail"]) if (b[k] !== undefined) s[k] = clean(b[k], 1000);
      if (b.status && STATUS[b.status]) s.status = b.status;
      await saveStudio(s);
      return json(s);
    }
    if (aktion === "live" && req.method === "POST") {
      const b = await body(req);
      if (b.tedNummer) s.tedNummer = clean(b.tedNummer, 40);
      s.status = "live";
      s.goLiveAt = s.goLiveAt || now();
      await saveStudio(s);
      await notify(s, mails.live(s, { tedNummer: s.tedNummer }));
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
    if (aktion === "login-link" && req.method === "POST") return json({ url: loginLink(s.id, 60) });
    if (aktion === "testanruf" && req.method === "POST") {
      const a = {
        id: id("an_"), studioId: s.id, createdAt: now(), quelle: "test", dauerSek: 134, name: "Lena (Test)", nummer: "0151 2345678",
        anliegen: "anfrage", motiv: "Feine Rosenranke", stelle: "Unterarm innen", groesse: "15", stil: "Fineline", farbe: "schwarz-grau",
        wunschzeitraum: "November, samstags", artist: "egal", zusammenfassung: "Testanfrage aus dem Admin.", status: "offen",
      };
      await saveAnfrage(a);
      return json(a);
    }
  }

  if (bereich === "abrechnung" && req.method === "POST") {
    const b = await body(req);
    const monat = /^\d{4}-\d{2}$/.test(b.monat || "") ? b.monat : new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
    return json(await monatsabrechnung(monat, { dryRun: b.dryRun !== false }));
  }
  if (bereich === "jobs" && req.method === "POST") return json(await taeglicheJobs());
  if (bereich === "mails" && req.method === "GET") {
    const keys = (await store.list("mail/")).slice(-50).reverse();
    const out = [];
    for (const k of keys) { const m = await store.get(k); out.push({ at: m.at, to: m.to, subject: m.subject }); }
    return json(out);
  }
  if (bereich === "info" && req.method === "GET") return json({ siteUrl: CFG.siteUrl, aktion: await store.get("meta/aktion-zaehler") });
  return fail("Nicht gefunden", 404);
});

export const config = { path: ["/api/admin", "/api/admin/*"] };
