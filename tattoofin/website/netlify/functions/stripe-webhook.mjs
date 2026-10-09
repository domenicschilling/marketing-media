// Stripe-Webhook für Plattform-Ereignisse (Setup-Kauf, Rechnungen) und Connect-Ereignisse der Studio-Konten
// (Kundenzahlungen, Kontofreigabe, Erstattungen).
// In Stripe zwei Endpoints auf <SITE_URL>/api/stripe-webhook anlegen:
//   1) „Ihr Konto“: checkout.session.completed, checkout.session.expired, invoice.paid, invoice.payment_failed
//   2) „Verbundene Konten“: account.updated, checkout.session.completed, checkout.session.async_payment_succeeded,
//      checkout.session.async_payment_failed, checkout.session.expired, charge.refunded,
//      charge.dispute.created, charge.dispute.closed
//   Secrets: STRIPE_WEBHOOK_SECRET (1) und STRIPE_CONNECT_WEBHOOK_SECRET (2)
import { json, fail, now, brutto, handler } from "./_lib/util.mjs";
import { stripe, verifyWebhook } from "./_lib/stripe.mjs";
import { getStudio, saveStudio, studioBy, store, log, zahlungBy, saveZahlung } from "./_lib/store.mjs";
import { notify, notifyAdmin, zaehleAktion, connectUrl, kontoAbgleichen, ZAHLART } from "./_lib/domain.mjs";
import { mails } from "./_lib/emails.mjs";
import { loginLink } from "./_lib/auth.mjs";

async function studioFuer(obj) {
  return (await getStudio(obj?.metadata?.studioId || obj?.client_reference_id)) || (await studioBy("cus", obj?.customer));
}

async function zahlungBezahlt(z, account) {
  if (z.status === "bezahlt") return;
  const s = await getStudio(z.studioId);
  let pi = null;
  try { pi = await stripe("GET", `/payment_intents/${z.paymentIntentId}`, { expand: ["latest_charge"] }, { account }); } catch { /* Details optional */ }
  const charge = pi?.latest_charge && typeof pi.latest_charge === "object" ? pi.latest_charge : null;
  z.zahlart = charge?.payment_method_details?.type || pi?.payment_method_types?.[0] || "";
  z.zahlartText = ZAHLART[z.zahlart] || z.zahlart;
  z.chargeId = charge?.id || "";
  z.applicationFeeId = charge?.application_fee || "";
  z.status = "bezahlt";
  z.bezahltAm = now();
  await saveZahlung(z);
  await notify(s, mails.zahlungEingegangen(s, z));
  if (z.email) await notify(s, mails.zahlungKunde(s, z), z.email);
  await log("kundenzahlung", { studioId: s.id, zahlungId: z.id, betragCent: z.betragCent, gebuehrBruttoCent: z.gebuehrBruttoCent });
}

async function connectEreignis(event) {
  const o = event.data.object, account = event.account;
  switch (event.type) {
    case "account.updated": {
      const s = await studioBy("acct", o.id || account);
      if (s) await kontoAbgleichen(s, o);
      break;
    }
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired": {
      const z = (await zahlungBy("cs", o.id)) || (await zahlungBy("zahlung", o.metadata?.tattoofinZahlung));
      if (!z) break;
      z.paymentIntentId = o.payment_intent || z.paymentIntentId;
      if (event.type === "checkout.session.expired") { if (z.status === "offen" && z.art === "zahlseite") { z.status = "abgebrochen"; await saveZahlung(z); } break; }
      if (event.type === "checkout.session.async_payment_failed") { z.status = "fehlgeschlagen"; await saveZahlung(z); break; }
      if (o.payment_status === "paid" || event.type === "checkout.session.async_payment_succeeded") await zahlungBezahlt(z, account);
      else { z.status = "in_pruefung"; await saveZahlung(z); }
      break;
    }
    case "charge.dispute.created":
    case "charge.dispute.closed": {
      const z = await zahlungBy("pi", o.payment_intent);
      if (!z) break;
      const s = await getStudio(z.studioId);
      if (event.type === "charge.dispute.created") {
        z.rueckbuchung = { status: "offen", grund: o.reason, betragCent: o.amount, am: now(), faelligBis: o.evidence_details?.due_by ? new Date(o.evidence_details.due_by * 1000).toISOString() : null };
        await saveZahlung(z);
        await notify(s, mails.rueckbuchung(s, z));
        await notifyAdmin("Rückbuchung (Dispute) eingegangen", s, { Zahlung: z.id, Grund: o.reason, Betrag: (o.amount / 100).toFixed(2) + " €" });
        break;
      }
      z.rueckbuchung = { ...(z.rueckbuchung || {}), status: o.status, abgeschlossenAm: now() };
      // Verloren: Geld ist beim Studio weg → Provision vollständig zurück (Vertrag § 5)
      if (o.status === "lost" && (z.gebuehrBruttoCent || 0) > (z.gebuehrErstattetCent || 0) && z.applicationFeeId) {
        const rest = z.gebuehrBruttoCent - (z.gebuehrErstattetCent || 0);
        await stripe("POST", `/application_fees/${z.applicationFeeId}/refunds`, { amount: rest }, { idempotencyKey: `afr-dispute-${z.id}` });
        z.gebuehrErstattetCent = z.gebuehrBruttoCent;
        z.status = "rueckgebucht";
        if (z.abgerechnet) await notifyAdmin("Verlorene Rückbuchung nach Monatsabrechnung: Gutschrift prüfen", s, { Zahlung: z.id, Monat: z.abgerechnet });
      }
      await saveZahlung(z);
      break;
    }
    case "charge.refunded": {
      const z = await zahlungBy("pi", o.payment_intent);
      if (!z) break;
      const anteil = o.amount ? o.amount_refunded / o.amount : 1;
      const gebuehrZurueck = Math.round((z.gebuehrBruttoCent || 0) * anteil) - (z.gebuehrErstattetCent || 0);
      if (gebuehrZurueck > 0 && (o.application_fee || z.applicationFeeId)) {
        await stripe("POST", `/application_fees/${o.application_fee || z.applicationFeeId}/refunds`, { amount: gebuehrZurueck }, { idempotencyKey: `afr-${z.id}-${o.amount_refunded}` });
        z.gebuehrErstattetCent = (z.gebuehrErstattetCent || 0) + gebuehrZurueck;
      }
      z.erstattetCent = o.amount_refunded;
      if (o.amount_refunded >= o.amount) z.status = "erstattet";
      await saveZahlung(z);
      const s = await getStudio(z.studioId);
      if (z.abgerechnet) await notifyAdmin("Erstattung nach Monatsabrechnung: Gutschrift prüfen", s, { Zahlung: z.id, Monat: z.abgerechnet, Provision_zurueck_cent: gebuehrZurueck });
      break;
    }
  }
}

export default handler(async (req) => {
  if (req.method !== "POST") return fail("Methode nicht erlaubt", 405);
  const payload = await req.text();
  let event;
  try { event = verifyWebhook(payload, req.headers.get("stripe-signature")); }
  catch (e) { return fail("Webhook: " + e.message, 400); }

  if (await store.get("evt/" + event.id)) return json({ ok: true, doppelt: true });

  if (event.account) await connectEreignis(event);
  else {
    const o = event.data.object;
    switch (event.type) {
      case "checkout.session.completed": {
        const s = await studioFuer(o);
        if (!s || o.mode !== "payment") break;
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
        await notify(s, mails.anmeldung(s, { loginUrl: loginLink(s.id), connectUrl: connectUrl(s) }));
        await notify(s, mails.kaufBezahlt(s, { betragCent: o.amount_total ?? brutto(s.preisNetto), rechnungUrl }));
        await notifyAdmin("Neuer Kauf bezahlt 🎉", s, { Betrag: ((o.amount_total || 0) / 100).toFixed(2) + " € brutto" });
        await log("kauf.bezahlt", { studioId: s.id });
        break;
      }
      case "checkout.session.expired": {
        const s = await studioFuer(o);
        if (s && s.status === "entwurf") { s.checkoutAbgelaufen = now(); await saveStudio(s); }
        break;
      }
      case "invoice.paid": {
        const s = await studioFuer(o);
        if (s && o.metadata?.typ === "kauf" && s.status === "zahlung_offen") {
          s.status = "einrichtung";
          s.bezahltAm = now();
          s.stripe.paymentIntentId = o.payment_intent;
          await saveStudio(s);
          await notify(s, mails.kaufBezahlt(s, { betragCent: o.amount_paid, rechnungUrl: o.hosted_invoice_url }));
          await notifyAdmin("Rechnung Setup bezahlt", s, { Betrag: (o.amount_paid / 100).toFixed(2) + " €" });
        }
        break;
      }
      case "invoice.payment_failed": {
        const s = await studioFuer(o);
        if (!s) break;
        await notify(s, mails.zahlungFehlgeschlagen(s, { betragCent: o.amount_due, rechnungUrl: o.hosted_invoice_url }));
        await notifyAdmin("Zahlung fehlgeschlagen", s, { Rechnung: o.number, Betrag: (o.amount_due / 100).toFixed(2) + " €" });
        break;
      }
    }
  }
  await store.set("evt/" + event.id, { type: event.type, account: event.account || null, at: now() });
  return json({ ok: true });
});

export const config = { path: "/api/stripe-webhook" };
