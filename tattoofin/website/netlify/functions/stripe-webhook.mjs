// Stripe-Webhook für Plattform-Ereignisse und Connect-Ereignisse der Studio-Konten.
// Kundenzahlungen kommen je nach Modell auf unterschiedlichen Wegen:
//   Provision: Tattoofin kassiert als Plattform (Destination Charge) → Ereignisse am Endpoint „Ihr Konto“
//   Kauf:      Zahlung direkt auf dem Stripe-Konto des Studios (Direct Charge) → Endpoint „Verbundene Konten“
// In Stripe zwei Endpoints auf <SITE_URL>/api/stripe-webhook anlegen:
//   1) „Ihr Konto“: checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed,
//      checkout.session.expired, invoice.paid, invoice.payment_failed, charge.refunded, charge.dispute.created,
//      charge.dispute.funds_withdrawn, charge.dispute.funds_reinstated, charge.dispute.closed
//   2) „Verbundene Konten“: account.updated, checkout.session.completed, checkout.session.async_payment_succeeded,
//      checkout.session.async_payment_failed, checkout.session.expired, charge.refunded, charge.dispute.created, charge.dispute.closed
//   Secrets: STRIPE_WEBHOOK_SECRET (1) und STRIPE_CONNECT_WEBHOOK_SECRET (2)
import { CFG } from "./_lib/config.mjs";
import { json, fail, now, brutto, handler } from "./_lib/util.mjs";
import { stripe, verifyWebhook } from "./_lib/stripe.mjs";
import { getStudio, saveStudio, studioBy, store, log, zahlungBy, saveZahlung } from "./_lib/store.mjs";
import { notify, notifyAdmin, zaehleAktion, connectUrl, kontoAbgleichen, provisionVerdient, ZAHLART } from "./_lib/domain.mjs";
import { mails } from "./_lib/emails.mjs";
import { loginLink } from "./_lib/auth.mjs";

const euroText = (c) => (c / 100).toFixed(2) + " €";
const id = (x) => (x && typeof x === "object" ? x.id : x || "");

async function studioFuer(obj) {
  return (await getStudio(obj?.metadata?.studioId || obj?.client_reference_id)) || (await studioBy("cus", obj?.customer));
}

async function zahlungBezahlt(z, account) {
  if (z.status === "bezahlt") return;
  const s = await getStudio(z.studioId);
  let pi = null;
  try { pi = await stripe("GET", `/payment_intents/${z.paymentIntentId}`, { expand: ["latest_charge.balance_transaction"] }, { account }); } catch { /* Details optional */ }
  const charge = pi?.latest_charge && typeof pi.latest_charge === "object" ? pi.latest_charge : null;
  z.zahlart = charge?.payment_method_details?.type || pi?.payment_method_types?.[0] || "";
  z.zahlartText = ZAHLART[z.zahlart] || z.zahlart;
  z.chargeId = charge?.id || "";
  z.applicationFeeId = id(charge?.application_fee);
  z.transferId = id(charge?.transfer);
  // Provision: Stripe-Gebühr zahlt Tattoofin. Merken, weil sie bei Erstattungen nicht zurückkommt.
  const bt = charge?.balance_transaction;
  if (z.abwicklung === "plattform" && bt && typeof bt === "object") z.stripeGebuehrCent = bt.fee || 0;
  z.status = "bezahlt";
  z.bezahltAm = now();
  await saveZahlung(z);
  await notify(s, mails.zahlungEingegangen(s, z));
  if (z.email) await notify(s, mails.zahlungKunde(s, z), z.email);
  await log("kundenzahlung", { studioId: s.id, zahlungId: z.id, betragCent: z.betragCent, gebuehrBruttoCent: z.gebuehrBruttoCent, stripeGebuehrCent: z.stripeGebuehrCent });
}

// Checkout, Erstattungen und Rückbuchungen von Kundenzahlungen (beide Modelle)
async function kundenEreignis(event) {
  const o = event.data.object, account = event.account;
  switch (event.type) {
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

    case "charge.dispute.created": {
      const z = await zahlungBy("pi", o.payment_intent);
      if (!z || z.rueckbuchung?.disputeId === o.id) break;
      const s = await getStudio(z.studioId);
      z.rueckbuchung = {
        disputeId: o.id, status: "offen", anfrage: String(o.status || "").startsWith("warning"), grund: o.reason, betragCent: o.amount, am: now(),
        faelligBis: o.evidence_details?.due_by ? new Date(o.evidence_details.due_by * 1000).toISOString() : null,
      };
      await saveZahlung(z);
      await notify(s, mails.rueckbuchung(s, z));
      await notifyAdmin("Rückbuchung (Dispute) eingegangen", s, { Zahlung: z.id, Grund: o.reason, Betrag: euroText(o.amount), Modell: s.modell });
      break;
    }

    // Nur Provision: Stripe hat Betrag + Gebühr bei Tattoofin abgebucht → Anteil des Studios zurückholen.
    // Zurückgeholt wird der Zahlbetrag abzüglich der anteiligen Provision plus die Rückbuchungsgebühr.
    case "charge.dispute.funds_withdrawn": {
      const z = await zahlungBy("pi", o.payment_intent);
      if (!z || z.abwicklung !== "plattform" || z.rueckbuchung?.zurueckgeholtCent) break;
      const s = await getStudio(z.studioId);
      z.rueckbuchung = { ...(z.rueckbuchung || { disputeId: o.id, grund: o.reason, betragCent: o.amount, am: now() }), status: "belastet" };
      const provAnteil = Math.round(provisionVerdient(z) * o.amount / z.betragCent);
      const ziel = Math.max(0, Math.min(z.betragCent - (z.erstattetCent || 0), o.amount - provAnteil + CFG.ruecklastGebuehrCent));
      try {
        if (!z.transferId) throw new Error("Transfer-ID fehlt");
        const rev = await stripe("POST", `/transfers/${z.transferId}/reversals`, { amount: ziel, metadata: { tattoofinZahlung: z.id, grund: "rueckbuchung", dispute: o.id } }, { idempotencyKey: `trr-${o.id}` });
        z.rueckbuchung.zurueckgeholtCent = ziel;
        z.rueckbuchung.reversalId = rev.id;
      } catch (e) {
        z.rueckbuchung.offenCent = ziel;
        await notifyAdmin("⚠️ Rückbuchung: Betrag konnte nicht vom Studio-Konto zurückgeholt werden", s, { Zahlung: z.id, Betrag: euroText(ziel), Fehler: e.message });
      }
      await saveZahlung(z);
      break;
    }

    // Nur Provision: Rückbuchung zugunsten des Studios entschieden → Stripe gibt das Geld zurück → an das Studio weiterleiten
    case "charge.dispute.funds_reinstated": {
      const z = await zahlungBy("pi", o.payment_intent);
      if (!z || z.abwicklung !== "plattform" || !z.rueckbuchung?.zurueckgeholtCent || z.rueckbuchung.zurueckUeberwiesenAm) break;
      const s = await getStudio(z.studioId);
      const tr = await stripe("POST", "/transfers", {
        amount: z.rueckbuchung.zurueckgeholtCent, currency: "eur", destination: s.stripe.accountId, transfer_group: z.id,
        description: `Rückbuchung gewonnen: ${z.beschreibung || "Tattoo-Projekt"}`, metadata: { tattoofinZahlung: z.id, dispute: o.id },
      }, { idempotencyKey: `tr-zurueck-${o.id}` });
      z.rueckbuchung.zurueckUeberwiesenAm = now();
      z.rueckbuchung.rueckTransferId = tr.id;
      await saveZahlung(z);
      break;
    }

    case "charge.dispute.closed": {
      const z = await zahlungBy("pi", o.payment_intent);
      if (!z) break;
      const s = await getStudio(z.studioId);
      z.rueckbuchung = { ...(z.rueckbuchung || {}), status: o.status, abgeschlossenAm: now() };
      if (o.status === "lost") {
        z.status = "rueckgebucht";
        if (z.abgerechnet && z.abwicklung === "plattform") await notifyAdmin("Verlorene Rückbuchung nach Monatsabrechnung: Gutschrift über die Provision erstellen", s, { Zahlung: z.id, Monat: z.abgerechnet, Provision: euroText(z.gebuehrBruttoCent || 0) });
      }
      await saveZahlung(z);
      await notify(s, mails.rueckbuchungEntschieden(s, z));
      break;
    }

    // Erstattung an den Kunden. Provision: Der Betrag wurde per reverse_transfer beim Studio zurückgeholt.
    // Die Provision geht anteilig an das Studio zurück, abzüglich der Stripe-Gebühr (+ USt.), die Stripe nicht erstattet.
    case "charge.refunded": {
      const z = await zahlungBy("pi", o.payment_intent);
      if (!z) break;
      const s = await getStudio(z.studioId);
      const anteil = o.amount ? o.amount_refunded / o.amount : 1;
      let gebuehrZurueck = 0;
      const feeId = id(o.application_fee) || z.applicationFeeId;
      if (z.abwicklung === "plattform" && z.gebuehrBruttoCent && feeId) {
        const behalten = Math.round((z.stripeGebuehrCent || 0) * (100 + CFG.ustProzent) / 100);
        const ziel = Math.round(Math.max(0, z.gebuehrBruttoCent - behalten) * anteil);
        gebuehrZurueck = ziel - (z.gebuehrErstattetCent || 0);
        if (gebuehrZurueck > 0) {
          await stripe("POST", `/application_fees/${feeId}/refunds`, { amount: gebuehrZurueck }, { idempotencyKey: `afr-${z.id}-${o.amount_refunded}` });
          z.gebuehrErstattetCent = (z.gebuehrErstattetCent || 0) + gebuehrZurueck;
        }
      }
      const neuErstattet = o.amount_refunded - (z.erstattetCent || 0);
      z.erstattetCent = o.amount_refunded;
      if (o.amount_refunded >= o.amount) z.status = "erstattet";
      await saveZahlung(z);
      if (z.abwicklung === "plattform" && neuErstattet > 0) await notify(s, mails.erstattung(s, z, { betragCent: neuErstattet, provisionZurueckCent: Math.max(0, gebuehrZurueck) }));
      if (z.abgerechnet && gebuehrZurueck > 0) await notifyAdmin("Erstattung nach Monatsabrechnung: Gutschrift über die Provision erstellen", s, { Zahlung: z.id, Monat: z.abgerechnet, Provision_zurueck: euroText(gebuehrZurueck) });
      break;
    }
  }
}

async function connectEreignis(event) {
  if (event.type === "account.updated") {
    const o = event.data.object;
    const s = await studioBy("acct", o.id || event.account);
    if (s) await kontoAbgleichen(s, o);
    return;
  }
  return kundenEreignis(event);
}

const KUNDEN_EREIGNISSE = /^(checkout\.session\.|charge\.)/;

export default handler(async (req) => {
  if (req.method !== "POST") return fail("Methode nicht erlaubt", 405);
  const payload = await req.text();
  let event;
  try { event = verifyWebhook(payload, req.headers.get("stripe-signature")); }
  catch (e) { return fail("Webhook: " + e.message, 400); }

  if (await store.get("evt/" + event.id)) return json({ ok: true, doppelt: true });

  const o = event.data.object;
  if (event.account) await connectEreignis(event);
  else if (KUNDEN_EREIGNISSE.test(event.type) && (o.metadata?.tattoofinZahlung || event.type.startsWith("charge."))) await kundenEreignis(event);
  else {
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
        await notifyAdmin("Neuer Kauf bezahlt 🎉", s, { Betrag: euroText(o.amount_total || 0) + " brutto" });
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
