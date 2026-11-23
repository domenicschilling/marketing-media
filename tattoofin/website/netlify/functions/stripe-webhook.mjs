// Stripe-Webhook für Plattform-Ereignisse und Connect-Ereignisse der Studio-Konten.
// Kundenzahlungen kommen je nach Modell auf unterschiedlichen Wegen:
//   Provision: Tattoofin kassiert als Plattform (Destination Charge) → Ereignisse am Endpoint „Ihr Konto“
//   Kauf:      Zahlung direkt auf dem Stripe-Konto des Studios (Direct Charge) → Endpoint „Verbundene Konten“
// In Stripe zwei Endpoints auf <SITE_URL>/api/stripe-webhook anlegen:
//   1) „Ihr Konto“: checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed,
//      checkout.session.expired, invoice.paid, invoice.payment_failed, charge.refunded, charge.updated, charge.dispute.created,
//      charge.dispute.funds_withdrawn, charge.dispute.funds_reinstated, charge.dispute.closed
//   2) „Verbundene Konten“: account.updated, checkout.session.completed, checkout.session.async_payment_succeeded,
//      checkout.session.async_payment_failed, checkout.session.expired, charge.refunded, charge.updated, charge.dispute.created, charge.dispute.closed
//      charge.updated: Bei Klarna hängt Stripe Transfer und Plattformgebühr erst NACH der Zahlung an den Charge → dann werden die IDs nachgetragen
//      (zusätzlich Notanker vor Rückbuchung/Erstattung und täglicher Job, falls das Ereignis nicht abonniert ist).
//      Für die Tattoofin-App zusätzlich: payout.paid, payout.failed (Auszahlung auf dem Konto des Studios angekommen bzw. fehlgeschlagen
//      → Mitteilung an die App-Geräte mit „Auszahlungen“, Doppelschutz push/payout/<id>). Ist das nicht abonniert, holen die täglichen
//      Jobs die Mitteilungen der letzten 48 Stunden nach (domain.mjs auszahlungenNachholen).
//      Für das Paket Monatlich (Abo) zusätzlich empfohlen: customer.subscription.deleted (Abo von Stripe beendet,
//      z. B. nach endgültig fehlgeschlagenen Zahlungen) – wird unten verarbeitet, sobald das Ereignis abonniert ist.
//   Secrets: STRIPE_WEBHOOK_SECRET (1) und STRIPE_CONNECT_WEBHOOK_SECRET (2)
import { reservierungFreigeben } from "./_lib/gutschein-shop.mjs";
import { CFG, istApple } from "./_lib/config.mjs";
import { json, fail, now, brutto, handler } from "./_lib/util.mjs";
import { stripe, verifyWebhook } from "./_lib/stripe.mjs";
import { getStudio, saveStudio, studioBy, store, log, zahlungBy, saveZahlung } from "./_lib/store.mjs";
import { auszahlungMelden, umstellungAbschliessen, notify, notifyAdmin, zaehleAktion, einrichtungUrl, kontoAbgleichen, provisionVerdient, zahlungBezahlt, paketDetails, aufstellerBezahlt, provisionZahlung, stripeDatenNachtragen, fehlerEintrag } from "./_lib/domain.mjs";
import { mails } from "./_lib/emails.mjs";
import { loginLink } from "./_lib/auth.mjs";

const euroText = (c) => (c / 100).toFixed(2) + " €";
const id = (x) => (x && typeof x === "object" ? x.id : x || "");

async function studioFuer(obj) {
  return (await getStudio(obj?.metadata?.studioId || obj?.client_reference_id)) || (await studioBy("cus", obj?.customer));
}

// Studios mit Apple-Abo (Anmeldung in der App) zahlen ihr Tattoofin-Paket über den App Store: Stripe-Ereignisse zum Paket ändern
// dort nichts (kein Status, keine Rechnungsmails). Nur Admin-Mail. true = Ereignis erledigt.
// Ausnahme: Ein Stripe-Abo, das für ein App-Studio entstanden ist (Web-Checkout kurz vor dem Wechsel in die App bezahlt), wird sofort
// gekündigt, damit das Studio nicht doppelt zahlt (Apple + Stripe). Die erste Zahlung erstattet der Admin.
// Ausnahme 2: Der QR-Aufsteller (körperliche Ware, eingestellt 15.11.2026) lief auch bei App-Studios über Stripe (DSX-Konto). Ereignisse
// eines vorher begonnenen Kaufs, die nachweislich dazu gehören (metadata typ "aufsteller" + dieses Studio + ein begonnener Kauf), sind normal → still erledigt, keine Alarm-Mail.
// checkout.session.completed des Aufstellers verarbeitet der Aufrufer VOR appleWaechter (aufstellerBezahlt).
const gehoertZumAufsteller = (s, o) => o?.metadata?.typ === "aufsteller" && o.metadata.studioId === s.id && Boolean(s.aufsteller?.kauf?.csId);
async function appleWaechter(s, event) {
  if (!s || !istApple(s)) return false;
  const o = event.data?.object || {};
  if (gehoertZumAufsteller(s, o)) {
    await log("stripe-aufsteller-app-studio", { studioId: s.id, ereignis: event.type, objekt: o.id || null });
    return true;
  }
  if (event.type === "checkout.session.completed" && o.mode === "subscription" && o.subscription) {
    const subId = typeof o.subscription === "string" ? o.subscription : o.subscription.id;
    let gekuendigt = false;
    try { await stripe("DELETE", "/subscriptions/" + subId); gekuendigt = true; } catch (e) { await log("stripe-abo-app-studio-kuendigen-fehler", { studioId: s.id, fehler: e.message }); }
    await notifyAdmin(gekuendigt ? "Stripe-Abo für App-Studio sofort gekündigt (zahlt über Apple) – erste Zahlung bitte erstatten" : "⚠️ Stripe-Abo für App-Studio konnte nicht gekündigt werden – bitte sofort von Hand kündigen und erstatten", s, { Abo: subId, Sitzung: o.id || "–" });
    await log("stripe-abo-app-studio", { studioId: s.id, subId, gekuendigt });
    return true;
  }
  await notifyAdmin("Stripe-Ereignis für App-Studio (zahlt über Apple) – nichts geändert, bitte prüfen", s, { Ereignis: event.type, Objekt: event.data?.object?.id || "–" });
  await log("stripe-ereignis-app-studio", { studioId: s.id, ereignis: event.type });
  return true;
}

// Anmeldung (Paket-Zahlung auf dem DSX-Konto) fehlgeschlagen, z. B. 3-D-Secure nicht bestätigt: nur beim Entwurf vermerken,
// damit der Admin sieht, warum ein Studio nicht abgeschlossen hat (Admin-Übersicht). Ändert sonst nichts (kein Status, keine Mail).
const DREI_DS = /authentication|3d_secure|three_d_secure/i;
async function anmeldungFehlerMerken(s, err) {
  if (!s || s.demo || !["entwurf", "abgebrochen", "zahlung_offen"].includes(s.status)) return false;
  const f = fehlerEintrag(err || {});
  f.dreiDS = DREI_DS.test(`${f.code} ${f.declineCode}`);
  // Stripe schickt payment_intent.payment_failed (mit echtem Grund) und invoice.payment_failed (ohne Grund) in beliebiger
  // Reihenfolge. Ein genauerer Eintrag der letzten 10 Minuten bleibt deshalb erhalten: nur ergänzen, 3-D-Secure nie zurücknehmen.
  const alt = s.anmeldungFehler;
  if (alt && Date.now() - Date.parse(alt.am || "") < 10 * 60e3 && (alt.code || alt.dreiDS)) {
    if (!f.code && !f.dreiDS) return false;
    f.dreiDS = f.dreiDS || Boolean(alt.dreiDS);
    if (!f.declineCode) f.declineCode = alt.declineCode || "";
  }
  s.anmeldungFehler = f;
  await saveStudio(s);
  await log("anmeldung-zahlung-fehlgeschlagen", { studioId: s.id, code: f.code, declineCode: f.declineCode, dreiDS: f.dreiDS });
  return true;
}

// Einfache Anmeldung (16.11.2026): /start fragt keine Adresse und keine USt-IdNr. mehr ab. Was das Studio im Stripe-Checkout dazu eingibt
// („Ich kaufe als Unternehmen“), übernehmen wir für Rechnung und Admin: USt-IdNr. (nur wenn noch keine da ist) und die Rechnungsadresse
// GETRENNT als s.rechnungsadresse. Die Studio-Adresse der Zahlseite (s.strasse/plz/ort) kommt NIE von hier (Rechnungsadresse kann privat sein),
// sondern aus dem Stripe-Konto (kontoAbgleichen) bzw. der Karte „Adresse deiner Zahlseite“ im Studio-Bereich.
export function rechnungsdatenUebernehmen(s, session) {
  const cd = session?.customer_details || {};
  const ust = (cd.tax_ids || []).find((x) => x && x.value);
  if (!s.ustid && ust) s.ustid = String(ust.value).replace(/\s/g, "").toUpperCase().slice(0, 30);
  const a = cd.address || {};
  if (a.line1 || a.city) s.rechnungsadresse = { strasse: [a.line1, a.line2].filter(Boolean).join(", ").slice(0, 160), plz: String(a.postal_code || "").slice(0, 10), ort: String(a.city || "").slice(0, 80), land: String(a.country || "").slice(0, 2) };
  const name = String(cd.business_name || cd.name || "").trim().slice(0, 120);
  if (name) s.rechnungsname = name;
  return s;
}
const rechnungsadresseText = (r) => (r ? [r.strasse, [r.plz, r.ort].filter(Boolean).join(" "), r.land && r.land !== "DE" ? r.land : ""].filter(Boolean).join(", ") : "");

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
      if (event.type === "checkout.session.expired") {
        if (z.status !== "bezahlt") z.letzterFehler = fehlerEintrag({ text: "Checkout-Sitzung abgelaufen" }, { ereignis: "abgelaufen" });
        if (z.status === "offen" && (z.art === "zahlseite" || z.gutschein?.shop)) z.status = "abgebrochen";
        // Gutschein-Shop: reservierte Einheit wieder freigeben
        if (z.gutschein?.reservierung) await reservierungFreigeben(z, "kasse-abgelaufen");
        await saveZahlung(z); break;
      }
      if (event.type === "checkout.session.async_payment_failed") { z.status = "fehlgeschlagen"; z.letzterFehler = fehlerEintrag({ text: "Zahlung später fehlgeschlagen" }); await saveZahlung(z); break; }
      if (o.payment_status === "paid" || event.type === "checkout.session.async_payment_succeeded") await zahlungBezahlt(z, account);
      else { z.status = "in_pruefung"; await saveZahlung(z); }
      break;
    }

    // Eingebettetes Bezahlfeld (Payment Element) auf tattoofin.de
    case "payment_intent.succeeded":
    case "payment_intent.processing":
    case "payment_intent.payment_failed": {
      const z = (await zahlungBy("pi", o.id)) || (await zahlungBy("zahlung", o.metadata?.tattoofinZahlung));
      if (!z || z.status === "bezahlt") break;
      z.paymentIntentId = o.id;
      if (event.type === "payment_intent.succeeded") await zahlungBezahlt(z, account);
      else if (event.type === "payment_intent.processing") { z.status = "in_pruefung"; await saveZahlung(z); }
      else { z.letzterFehler = fehlerEintrag(o.last_payment_error || {}); await saveZahlung(z); }
      break;
    }

    // Stripe hat am Charge etwas ergänzt (bei Klarna: Transfer, Plattformgebühr, Gebühr) → fehlende IDs nachtragen
    case "charge.updated": {
      const z = await zahlungBy("pi", o.payment_intent);
      if (!z || !["bezahlt", "erstattet", "rueckgebucht"].includes(z.status)) break;
      await stripeDatenNachtragen(z, { immer: true });
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
      await notifyAdmin("Rückbuchung (Dispute) eingegangen", s, { Zahlung: z.id, Grund: o.reason, Betrag: euroText(o.amount), Modell: s.modell,
        ...(z.abwicklung === "direkt" ? { Hinweis: "Direct Charge: Stripe bucht den Betrag vom Studio-Konto ab, die Rückbuchungsgebühr trägt die Plattform (fees.payer=application). Nicht automatisch beim Studio zurückholbar." } : {}) });
      break;
    }

    // Nur Provision: Stripe hat Betrag + Gebühr bei Tattoofin abgebucht → Anteil des Studios zurückholen.
    // Zurückgeholt wird der Zahlbetrag abzüglich der anteiligen Provision plus die Rückbuchungsgebühr.
    case "charge.dispute.funds_withdrawn": {
      const z = await zahlungBy("pi", o.payment_intent);
      if (!z || z.abwicklung !== "plattform" || z.rueckbuchung?.zurueckgeholtCent) break;
      const s = await getStudio(z.studioId);
      await stripeDatenNachtragen(z); // Notanker: Transfer-ID muss da sein, sonst kann der Betrag nicht zurückgeholt werden
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
        amount: z.rueckbuchung.zurueckgeholtCent, currency: "eur", destination: s.stripe.altKonto?.accountId || s.stripe.accountId, transfer_group: z.id,
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
        // Direct Charge: Das Studio verliert den Betrag direkt; Tattoofin verlangt dafür keine Provision → Plattformgebühr zurück an das Studio
        if (z.abwicklung === "direkt" && z.applicationFeeId && z.gebuehrBruttoCent && !z.rueckbuchung.gebuehrZurueckAm) {
          try {
            await stripe("POST", `/application_fees/${z.applicationFeeId}/refunds`, { amount: Math.max(0, z.gebuehrBruttoCent - (z.gebuehrErstattetCent || 0)) }, { idempotencyKey: `afr-lost-${o.id}` });
            z.rueckbuchung.gebuehrZurueckAm = now();
          } catch (e) { await notifyAdmin("⚠️ Verlorene Rückbuchung (Direct Charge): Plattformgebühr konnte nicht zurückerstattet werden", s, { Zahlung: z.id, Fehler: e.message }); }
        }
        if (z.abgerechnet && provisionZahlung(z)) await notifyAdmin("Verlorene Rückbuchung nach Monatsabrechnung: Gutschrift über die Provision erstellen", s, { Zahlung: z.id, Monat: z.abgerechnet, Provision: euroText(z.gebuehrBruttoCent || 0) });
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
      await stripeDatenNachtragen(z); // Notanker: Plattformgebühr-ID + echte Stripe-Gebühr für die Provisions-Erstattung
      const anteil = o.amount ? o.amount_refunded / o.amount : 1;
      let gebuehrZurueck = 0;
      const feeId = id(o.application_fee) || z.applicationFeeId;
      if (provisionZahlung(z) && z.gebuehrBruttoCent && feeId) {
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
      if (provisionZahlung(z) && neuErstattet > 0) await notify(s, mails.erstattung(s, z, { betragCent: neuErstattet, provisionZurueckCent: Math.max(0, gebuehrZurueck) }));
      if (z.abgerechnet && gebuehrZurueck > 0) await notifyAdmin("Erstattung nach Monatsabrechnung: Gutschrift über die Provision erstellen", s, { Zahlung: z.id, Monat: z.abgerechnet, Provision_zurueck: euroText(gebuehrZurueck) });
      break;
    }
  }
}

async function connectEreignis(event) {
  // Auszahlung an das Studio (Connect-Ereignis): event.account → Studio (auch ein altes Konto nach der Umstellung, idx/acct bleibt bestehen)
  if (event.type === "payout.paid" || event.type === "payout.failed") {
    const s = await studioBy("acct", event.account);
    if (s && !s.demo) await auszahlungMelden(s, event.data.object);
    return;
  }
  if (event.type === "account.updated") {
    const o = event.data.object;
    const s = await studioBy("acct", o.id || event.account);
    // Nach einer Umstellung zählt nur das neue Konto; Meldungen zum alten Auszahlungskonto ändern den Status nicht
    if (s && (!s.stripe?.altKonto || s.stripe.accountId === (o.id || event.account))) await kontoAbgleichen(s, o);
    return;
  }
  return kundenEreignis(event);
}

const KUNDEN_EREIGNISSE = /^(checkout\.session\.|charge\.|payment_intent\.)/;

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
        // QR-Aufsteller (alt, vor dem 15.11.2026 begonnener Checkout): nur vermerken + Admin-Mail, Studio-Status bleibt unverändert
        if (o.metadata?.typ === "aufsteller") { await aufstellerBezahlt(s, o); break; }
        // Altstudio stellt auf den festen Monatspreis um
        if (await appleWaechter(s, event)) break;
        if (s && o.mode === "subscription" && o.metadata?.umstellung === "1") { await umstellungAbschliessen(s, o); break; }
        // Paket Monatlich: Abo gestartet (erste Monatsrechnung ist bezahlt bzw. bei Lastschrift eingeleitet)
        if (s && o.mode === "subscription" && s.status === "entwurf") {
          s.status = "einrichtung";
          s.bezahltAm = now();
          s.stripe.subscriptionId = id(o.subscription);
          rechnungsdatenUebernehmen(s, o);
          // Testwoche (17.11.2026): Abo startet im Status „trialing“, heute 0 €. Ende der Testwoche aus dem Abo (trial_end).
          let testBis = null;
          if (s.testTage) {
            try { const sub = await stripe("GET", "/subscriptions/" + s.stripe.subscriptionId); if (sub.status === "trialing" && sub.trial_end) testBis = new Date(sub.trial_end * 1000).toISOString(); }
            catch (e) { await log("abo-testwoche-lesen-fehler", { studioId: s.id, fehler: e.message }); }
            if (!testBis && !(o.amount_total > 0)) testBis = new Date(Date.now() + s.testTage * 864e5).toISOString();
          }
          if (testBis) { s.testBis = testBis; delete s.bezahltAm; }
          let rechnungUrl = "";
          if (o.invoice) {
            try { const inv = await stripe("GET", "/invoices/" + id(o.invoice)); s.stripe.invoiceId = inv.id; rechnungUrl = inv.hosted_invoice_url || ""; } catch { /* Rechnung optional */ }
          }
          await saveStudio(s);
          await notify(s, mails.anmeldung(s, { loginUrl: loginLink(s.id), connectUrl: einrichtungUrl(s) }));
          const rechnungsDetails = { ...(s.ustid ? { USt_IdNr: s.ustid } : {}), ...(s.rechnungsadresse ? { Rechnungsadresse: [s.rechnungsname, rechnungsadresseText(s.rechnungsadresse)].filter(Boolean).join(", ") } : {}),
            ...(!s.strasse ? { Studio_Adresse: "kommt aus dem Stripe-Konto bzw. der Karte „Adresse deiner Zahlseite“" } : {}) };
          if (testBis) {
            await notify(s, mails.testwocheGestartet(s, { testBis }));
            await notifyAdmin("Neue Testwoche gestartet (Paket Monatlich) 🧪", s, { ...paketDetails(s), Testwoche_bis: testBis.slice(0, 10), Erste_Abbuchung: "am Ende der Testwoche, außer das Studio kündigt vorher", Abo: s.stripe.subscriptionId,
              ...(s.quelle ? { Herkunft: Object.values(s.quelle).join(" · ") } : {}), ...rechnungsDetails });
            await log("abo.testwoche-gestartet", { studioId: s.id, subscriptionId: s.stripe.subscriptionId, testBis });
            break;
          }
          await notify(s, mails.aboGestartet(s, { betragCent: o.amount_total ?? brutto(s.monatNetto || CFG.monatNettoAlt), rechnungUrl }));
          await notifyAdmin("Neuer Abschluss (Paket Monatlich) 🎉", s, { ...paketDetails(s), Erste_Zahlung: euroText(o.amount_total || 0) + " brutto", Abo: s.stripe.subscriptionId, ...rechnungsDetails });
          await log("abo.gestartet", { studioId: s.id, subscriptionId: s.stripe.subscriptionId });
          break;
        }
        if (!s || o.mode !== "payment") break;
        // Rechnungsdaten nur aus dem Abschluss-Checkout (Studio noch im Entwurf bzw. Zahlung offen), nicht aus späteren Zahlungen desselben Studios
        const abschluss = ["entwurf", "zahlung_offen"].includes(s.status);
        s.status = "einrichtung";
        s.bezahltAm = now();
        s.stripe.paymentIntentId = o.payment_intent;
        if (abschluss) rechnungsdatenUebernehmen(s, o);
        let rechnungUrl = "";
        if (o.invoice) {
          const inv = await stripe("GET", "/invoices/" + o.invoice);
          s.stripe.invoiceId = inv.id;
          rechnungUrl = inv.hosted_invoice_url || "";
        }
        await saveStudio(s);
        if (s.aktion) await zaehleAktion();
        await notify(s, mails.anmeldung(s, { loginUrl: loginLink(s.id), connectUrl: einrichtungUrl(s) }));
        await notify(s, mails.kaufBezahlt(s, { betragCent: o.amount_total ?? brutto(s.preisNetto), rechnungUrl }));
        await notifyAdmin(s.paket === "einmal" ? "Einmalzahlung bezahlt 🎉" : "Neuer Kauf bezahlt 🎉", s, { ...paketDetails(s), Betrag: euroText(o.amount_total || 0) + " brutto" });
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
        if (await appleWaechter(s, event)) break;
        // Testwoche vorbei: erste echte Monatszahlung des Abos (Paket Monatlich) → jetzt zählt das Studio als zahlend
        if (s && s.testBis && !s.bezahltAm && o.amount_paid > 0 && s.stripe?.subscriptionId && id(o.subscription) === s.stripe.subscriptionId) {
          s.bezahltAm = now();
          s.stripe.invoiceId = o.id;
          await saveStudio(s);
          await notify(s, mails.aboGestartet(s, { betragCent: o.amount_paid, rechnungUrl: o.hosted_invoice_url || "" }));
          await notifyAdmin("Testwoche vorbei: erste Monatszahlung bezahlt 🎉", s, { ...paketDetails(s), Betrag: euroText(o.amount_paid) + " brutto", Rechnung: o.number || o.id });
          await log("abo.erste-zahlung-nach-testwoche", { studioId: s.id, invoiceId: o.id });
          break;
        }
        if (s && ["kauf", "setup"].includes(o.metadata?.typ) && s.status === "zahlung_offen") {
          s.status = "einrichtung";
          s.bezahltAm = now();
          s.stripe.paymentIntentId = o.payment_intent;
          await saveStudio(s);
          await notify(s, mails.kaufBezahlt(s, { betragCent: o.amount_paid, rechnungUrl: o.hosted_invoice_url }));
          await notifyAdmin(s.paket === "einmal" ? "Rechnung Einmalzahlung bezahlt" : "Rechnung Setup bezahlt", s, { ...paketDetails(s), Betrag: (o.amount_paid / 100).toFixed(2) + " €" });
        }
        break;
      }
      // Paket Monatlich: Stripe hat das Abo beendet (Kündigung zum Periodenende oder endgültig fehlgeschlagene Zahlung)
      case "customer.subscription.deleted": {
        const s = (await getStudio(o.metadata?.studioId)) || (await studioBy("cus", o.customer));
        if (await appleWaechter(s, event)) break;
        if (!s || s.stripe?.subscriptionId !== o.id) break;
        s.stripe.aboBeendetAm = now();
        await saveStudio(s);
        if (!["gekuendigt", "beendet", "erstattet"].includes(s.status)) await notifyAdmin("⚠️ Abo Monatlich von Stripe beendet (ohne Kündigung im Portal) – bitte Studio kontaktieren", s, { Abo: o.id, Grund: o.cancellation_details?.reason || "" });
        await log("abo.beendet", { studioId: s.id, subscriptionId: o.id });
        break;
      }
      // Paket-Zahlung beim Abschluss abgelehnt (Karte, 3-D-Secure, Lastschrift): nur beim Entwurf vermerken
      case "payment_intent.payment_failed":
      case "checkout.session.async_payment_failed": {
        const s = await studioFuer(o);
        if (s && !istApple(s)) await anmeldungFehlerMerken(s, o.last_payment_error || { text: "Zahlung fehlgeschlagen" });
        break;
      }
      case "invoice.payment_failed": {
        const s = await studioFuer(o);
        if (!s || (await appleWaechter(s, event))) break;
        await anmeldungFehlerMerken(s, { text: "Rechnung nicht bezahlt" });
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
