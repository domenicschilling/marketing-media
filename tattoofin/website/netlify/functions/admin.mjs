// Admin-API (Header: Authorization: Bearer <ADMIN_TOKEN>)
//   GET   /api/admin/studios
//   GET   /api/admin/studio/:id
//   PATCH /api/admin/studio/:id               { status, notiz, benachrichtigungEmail }
//   POST  /api/admin/studio/:id/live          Go-live setzen + E-Mail
//   POST  /api/admin/studio/:id/erstattung    Garantie-Erstattung (Kauf) über Stripe
//   POST  /api/admin/studio/:id/login-link    Login-Link für Support
//   POST  /api/admin/studio/:id/konto         Stripe-Kontostatus neu abfragen
//   POST  /api/admin/abrechnung               { monat: "YYYY-MM", dryRun }
//   POST  /api/admin/jobs                     tägliche Jobs sofort ausführen
//   GET   /api/admin/mails                    letzte E-Mails
import { CFG, netto } from "./_lib/config.mjs";
import { json, fail, body, clean, now, handler } from "./_lib/util.mjs";
import { allStudios, getStudio, saveStudio, zahlungenVon, abrechnungenVon, store, log } from "./_lib/store.mjs";
import { isAdmin, loginLink } from "./_lib/auth.mjs";
import { stripe } from "./_lib/stripe.mjs";
import { notify, monatsabrechnung, taeglicheJobs, kontoAbgleichen, provisionVerdient, STATUS } from "./_lib/domain.mjs";
import { mails } from "./_lib/emails.mjs";

export default handler(async (req) => {
  if (!isAdmin(req)) return fail("Nicht berechtigt", 401);
  const teile = new URL(req.url).pathname.replace(/^\/api\/admin\/?/, "").split("/").filter(Boolean);
  const [bereich, sid, aktion] = teile;

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
      });
    }
    return json(out.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
  }

  if (bereich === "studio" && sid) {
    const s = await getStudio(sid);
    if (!s) return fail("Studio nicht gefunden", 404);
    if (!aktion && req.method === "GET") return json({ studio: s, zahlungen: await zahlungenVon(s.id), abrechnungen: await abrechnungenVon(s.id) });
    if (!aktion && req.method === "PATCH") {
      const b = await body(req);
      for (const k of ["notiz", "benachrichtigungEmail"]) if (b[k] !== undefined) s[k] = clean(b[k], 1000);
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
    if (aktion === "login-link" && req.method === "POST") return json({ url: loginLink(s.id, 60) });
    if (aktion === "konto" && req.method === "POST") {
      if (!s.stripe?.accountId) return fail("Kein Stripe-Konto verbunden");
      await kontoAbgleichen(s, await stripe("GET", "/accounts/" + s.stripe.accountId));
      return json(s.stripe);
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
