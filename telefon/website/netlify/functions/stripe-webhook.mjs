// Stripe-Webhook: Zahlungen, hinterlegte Mandate, Monatsrechnungen, Fehlschläge.
// In Stripe anlegen: Endpoint <SITE_URL>/api/stripe-webhook mit den Ereignissen
//   checkout.session.completed, checkout.session.expired, invoice.paid, invoice.payment_failed, charge.refunded
import { CFG } from "./_lib/config.mjs";
import { json, fail, now, brutto, handler } from "./_lib/util.mjs";
import { stripe, verifyWebhook } from "./_lib/stripe.mjs";
import { getStudio, saveStudio, studioBy, store, log, getAbrechnung, saveAbrechnung } from "./_lib/store.mjs";
import { notify, notifyAdmin, zaehleAktion } from "./_lib/domain.mjs";
import { mails } from "./_lib/emails.mjs";
import { loginLink } from "./_lib/auth.mjs";

async function studioFuer(obj) {
  return (await getStudio(obj?.metadata?.studioId || obj?.client_reference_id)) || (await studioBy("cus", obj?.customer));
}

export default handler(async (req) => {
  if (req.method !== "POST") return fail("Methode nicht erlaubt", 405);
  const payload = await req.text();
  let event;
  try { event = verifyWebhook(payload, req.headers.get("stripe-signature")); }
  catch (e) { return fail("Webhook: " + e.message, 400); }

  if (await store.get("evt/" + event.id)) return json({ ok: true, doppelt: true });
  const o = event.data.object;

  switch (event.type) {
    case "checkout.session.completed": {
      const s = await studioFuer(o);
      if (!s) break;
      if (o.mode === "payment") {
        s.status = "einrichtung";
        s.bezahltAm = now();
        s.stripe.paymentIntentId = o.payment_intent;
        let rechnungUrl = "";
        if (o.invoice) {
          const inv = await stripe("GET", "/invoices/" + o.invoice);
          s.stripe.invoiceId = inv.id;
          rechnungUrl = inv.hosted_invoice_url || "";
        }
        await saveStudio(s);
        if (s.aktion) await zaehleAktion();
        await notify(s, mails.anmeldung(s, { loginUrl: loginLink(s.id) }));
        await notify(s, mails.kaufBezahlt(s, { betragCent: o.amount_total ?? brutto(s.preisNetto), rechnungUrl }));
        await notifyAdmin("Neuer Kauf bezahlt 🎉", s, { Betrag: ((o.amount_total || 0) / 100).toFixed(2) + " € brutto" });
      } else if (o.mode === "setup") {
        const si = await stripe("GET", "/setup_intents/" + o.setup_intent);
        s.stripe.paymentMethod = si.payment_method;
        await stripe("POST", "/customers/" + s.stripe.customerId, { invoice_settings: { default_payment_method: si.payment_method } });
        s.status = "einrichtung";
        s.mandatAm = now();
        await saveStudio(s);
        await notify(s, mails.anmeldung(s, { loginUrl: loginLink(s.id) }));
        await notify(s, mails.mandatHinterlegt(s));
        await notifyAdmin("Neuer Abschluss (Provision) 🎉", s, {});
      }
      await log("checkout.completed", { studioId: s.id, mode: o.mode });
      break;
    }
    case "checkout.session.expired": {
      const s = await studioFuer(o);
      if (s && s.status === "entwurf") { s.checkoutAbgelaufen = now(); await saveStudio(s); }
      break;
    }
    case "invoice.paid": {
      const s = await studioFuer(o);
      if (!s) break;
      if (o.metadata?.typ === "kauf" && s.status === "zahlung_offen") {
        s.status = "einrichtung";
        s.bezahltAm = now();
        s.stripe.paymentIntentId = o.payment_intent;
        await saveStudio(s);
        await notify(s, mails.kaufBezahlt(s, { betragCent: o.amount_paid, rechnungUrl: o.hosted_invoice_url }));
        await notifyAdmin("Rechnung Kaufpaket bezahlt", s, { Betrag: (o.amount_paid / 100).toFixed(2) + " €" });
      }
      if (o.metadata?.typ === "monat" && o.metadata?.monat) {
        const ab = await getAbrechnung(s.id, o.metadata.monat);
        if (ab) { ab.status = "bezahlt"; ab.bezahltAm = now(); await saveAbrechnung(ab); }
      }
      break;
    }
    case "invoice.payment_failed": {
      const s = await studioFuer(o);
      if (!s) break;
      await notify(s, mails.zahlungFehlgeschlagen(s, { betragCent: o.amount_due, rechnungUrl: o.hosted_invoice_url }));
      await notifyAdmin("Zahlung fehlgeschlagen", s, { Rechnung: o.number, Betrag: (o.amount_due / 100).toFixed(2) + " €" });
      if (o.metadata?.monat) {
        const ab = await getAbrechnung(s.id, o.metadata.monat);
        if (ab) { ab.status = "zahlung_fehlgeschlagen"; await saveAbrechnung(ab); }
      }
      break;
    }
    case "charge.refunded": {
      const s = await studioFuer(o);
      if (s) await log("erstattet", { studioId: s.id, betrag: o.amount_refunded });
      break;
    }
  }
  await store.set("evt/" + event.id, { type: event.type, at: now() });
  return json({ ok: true });
});

export const config = { path: "/api/stripe-webhook" };
