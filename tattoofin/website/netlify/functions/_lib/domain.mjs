// Geschäftslogik: Benachrichtigungen, Zahlungslinks, Kündigung, Monatsabrechnung.
import { CFG, plattformgebuehr } from "./config.mjs";
import { sendMail } from "./mail.mjs";
import { mails } from "./emails.mjs";
import { stripe, taxRateId } from "./stripe.mjs";
import { allStudios, zahlungenVon, saveZahlung, getAbrechnung, saveAbrechnung, saveStudio, log, store } from "./store.mjs";
import { monatsende, now, HttpError } from "./util.mjs";
import { loginLink } from "./auth.mjs";

export const STATUS = {
  entwurf: "Abschluss begonnen",
  zahlung_offen: "Rechnung offen",
  einrichtung: "In Einrichtung",
  live: "Live",
  gekuendigt: "Gekündigt (läuft noch)",
  beendet: "Beendet",
  erstattet: "Erstattet (Garantie)",
  abgebrochen: "Abgebrochen",
};

export const ZAHLART = { card: "Karte", klarna: "Klarna (Raten / später bezahlen)", sepa_debit: "SEPA-Lastschrift", paypal: "PayPal", link: "Link", apple_pay: "Apple Pay", google_pay: "Google Pay" };

export async function notify(studio, mail, to) {
  return sendMail({ to: to || studio.email, subject: mail.subject, html: mail.html, text: mail.text });
}

export async function notifyAdmin(titel, studio, details) {
  if (!CFG.adminEmail) return;
  const m = mails.intern(titel, studio, details);
  return sendMail({ to: CFG.adminEmail, subject: m.subject, html: m.html, text: m.text });
}

export const connectUrl = (s) => `${CFG.siteUrl}/api/connect?id=${s.id}`;

export function kuendigungsDatum(date = new Date()) {
  return monatsende(date);
}

export function slugify(name) {
  return (name || "studio").toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "studio";
}

export async function zaehleAktion() {
  const z = (await store.get("meta/aktion-zaehler")) || { n: 0 };
  z.n += 1;
  await store.set("meta/aktion-zaehler", z);
}

export function darfKassieren(s) {
  return s.stripe?.accountId && s.stripe?.chargesEnabled && ["einrichtung", "live", "gekuendigt"].includes(s.status);
}

// Checkout-Sitzung auf dem Stripe-Konto des Studios (Direct Charge). Provision = Plattformgebühr.
export async function checkoutFuer(studio, z) {
  if (!darfKassieren(studio)) throw new HttpError(409, "Dieses Studio kann gerade keine Zahlungen annehmen.");
  const fee = plattformgebuehr(z.betragCent, studio.modell);
  const session = await stripe("POST", "/checkout/sessions", {
    mode: "payment", locale: "de", client_reference_id: z.id,
    line_items: [{ quantity: 1, price_data: { currency: "eur", unit_amount: z.betragCent, product_data: { name: z.beschreibung || "Tattoo-Projekt", description: `${studio.firma}${z.art === "anzahlung" ? " · Anzahlung" : ""}` } } }],
    customer_email: z.email || undefined,
    payment_intent_data: {
      ...(fee.bruttoCent ? { application_fee_amount: fee.bruttoCent } : {}),
      description: `${z.beschreibung || "Tattoo-Projekt"} (${z.kunde || "Kunde"})`,
      metadata: { tattoofinZahlung: z.id, studioId: studio.id },
    },
    metadata: { tattoofinZahlung: z.id, studioId: studio.id },
    success_url: `${CFG.siteUrl}/bezahlt.html?z=${z.id}`,
    cancel_url: `${CFG.siteUrl}/zahlung.html?z=${z.id}&abbruch=1`,
  }, { account: studio.stripe.accountId });
  z.checkoutSessionId = session.id;
  z.gebuehrNettoCent = fee.nettoCent;
  z.gebuehrBruttoCent = fee.bruttoCent;
  await saveZahlung(z);
  return session.url;
}

// Monatsabrechnung Provision: Gebühren wurden bei der Zahlung schon einbehalten. Hier entsteht die Rechnung
// (in Stripe als „außerhalb von Stripe bezahlt“ markiert) und die Übersicht per E-Mail.
export async function monatsabrechnung(monat, { dryRun = false } = {}) {
  const ergebnis = [];
  for (const s of await allStudios()) {
    if (s.modell !== "provision" || !s.stripe?.accountId) continue;
    const vorhanden = await getAbrechnung(s.id, monat);
    if (vorhanden && !dryRun) { ergebnis.push({ studio: s.firma, monat, status: "schon abgerechnet" }); continue; }
    const zahlungen = (await zahlungenVon(s.id)).filter((z) => z.status === "bezahlt" && (z.bezahltAm || "").slice(0, 7) === monat);
    const positionen = zahlungen.map((z) => ({ zahlungId: z.id, datum: z.bezahltAm, kunde: z.kunde, beschreibung: z.beschreibung, betragCent: z.betragCent, provisionNettoCent: z.gebuehrNettoCent || 0 }));
    const ab = {
      studioId: s.id, monat, positionen, createdAt: now(),
      umsatzCent: positionen.reduce((a, b) => a + b.betragCent, 0),
      provisionNettoCent: positionen.reduce((a, b) => a + b.provisionNettoCent, 0),
    };
    ab.provisionBruttoCent = Math.round(ab.provisionNettoCent * (100 + CFG.ustProzent) / 100);
    ab.status = ab.provisionNettoCent ? "einbehalten" : "nichts_faellig";
    if (dryRun) { ergebnis.push({ studio: s.firma, ...ab }); continue; }
    if (!ab.provisionNettoCent && s.status === "beendet") continue;

    let rechnungUrl = "";
    if (ab.provisionNettoCent > 0) {
      const txr = await taxRateId();
      await stripe("POST", "/invoiceitems", {
        customer: s.stripe.customerId, currency: "eur", amount: ab.provisionNettoCent, tax_rates: [txr],
        description: `Tattoofin-Provision ${CFG.provisionProzent} % auf ${positionen.length} Zahlung(en), Umsatz ${(ab.umsatzCent / 100).toFixed(2)} € (${monat})`,
        metadata: { studioId: s.id, monat },
      }, { idempotencyKey: `ii-prov-${s.id}-${monat}` });
      const inv = await stripe("POST", "/invoices", {
        customer: s.stripe.customerId, collection_method: "send_invoice", days_until_due: 1, auto_advance: false,
        pending_invoice_items_behavior: "include", currency: "eur",
        description: `Tattoofin-Provision ${monat}. Bereits bei den einzelnen Zahlungen als Plattformgebühr einbehalten.`,
        metadata: { studioId: s.id, typ: "provision", monat },
      }, { idempotencyKey: `inv-prov-${s.id}-${monat}` });
      const fin = await stripe("POST", `/invoices/${inv.id}/finalize`, {});
      await stripe("POST", `/invoices/${fin.id}/pay`, { paid_out_of_band: true });
      ab.stripeInvoiceId = fin.id;
      ab.rechnungUrl = rechnungUrl = fin.hosted_invoice_url || "";
      ab.rechnungNr = fin.number || "";
    }
    for (const z of zahlungen) { z.abgerechnet = monat; await saveZahlung(z); }
    await saveAbrechnung(ab);
    await notify(s, mails.monatsabrechnung(s, ab, { rechnungUrl }));
    await log("abrechnung", { studioId: s.id, monat, provisionNettoCent: ab.provisionNettoCent });
    ergebnis.push({ studio: s.firma, monat, umsatzCent: ab.umsatzCent, provisionNettoCent: ab.provisionNettoCent, zahlungen: positionen.length, rechnung: ab.rechnungNr });
  }
  if (!dryRun && ergebnis.some((e) => e.status !== "schon abgerechnet")) await sendMail({
    to: CFG.adminEmail, subject: `[Tattoofin] Monatsabrechnung ${monat} erstellt`,
    html: `<pre>${JSON.stringify(ergebnis, null, 2)}</pre>`, text: JSON.stringify(ergebnis, null, 2),
  });
  return ergebnis;
}

// Läuft täglich: Erinnerungen, Vertragsende
export async function taeglicheJobs(heute = new Date()) {
  const out = [];
  for (const s of await allStudios()) {
    const alterStd = (Date.now() - new Date(s.createdAt).getTime()) / 3600e3;
    if (s.status === "entwurf" && !s.erinnertAbbruch && alterStd > 20) {
      s.erinnertAbbruch = now(); await saveStudio(s);
      await notify(s, mails.anmeldungAbgebrochen(s, { resumeUrl: `${CFG.siteUrl}/start.html?resume=${s.id}` }));
      out.push(["abbruch-erinnerung", s.firma]);
    }
    // Stripe-Konto nach 2 und 7 Tagen noch nicht freigegeben → erinnern
    if (["einrichtung", "zahlung_offen"].includes(s.status) && !s.stripe?.chargesEnabled) {
      const seit = (Date.now() - new Date(s.vertrag?.akzeptiertAm || s.createdAt).getTime()) / 864e5;
      const stufe = seit > 7 ? 2 : seit > 2 ? 1 : 0;
      if (stufe > (s.connectErinnert || 0)) {
        s.connectErinnert = stufe; await saveStudio(s);
        await notify(s, mails.connectErinnerung(s, { connectUrl: connectUrl(s) }));
        if (stufe === 2) await notifyAdmin("Stripe-Konto seit 7 Tagen nicht fertig: bitte anrufen", s, {});
        out.push(["connect-erinnerung", s.firma, stufe]);
      }
    }
    if (s.status === "gekuendigt" && s.kuendigung?.zum) {
      const tageBis = (new Date(s.kuendigung.zum) - heute) / 864e5;
      if (tageBis <= 7 && tageBis > 0 && !s.kuendigung.erinnert) {
        s.kuendigung.erinnert = now(); await saveStudio(s);
        await notify(s, mails.vertragsendeBald(s, { zum: s.kuendigung.zum }));
        out.push(["ende-bald", s.firma]);
      }
      if (tageBis <= 0) {
        s.status = "beendet"; s.vertragsende = s.kuendigung.zum; await saveStudio(s);
        await notify(s, mails.vertragsende(s));
        await notifyAdmin("Vertrag beendet: Verbindung zum Stripe-Konto trennen, Daten nach Frist löschen", s, {});
        out.push(["beendet", s.firma]);
      }
    }
  }
  return out;
}

export async function kontoAbgleichen(s, acct) {
  const vorher = Boolean(s.stripe.chargesEnabled);
  s.stripe.chargesEnabled = Boolean(acct.charges_enabled);
  s.stripe.payoutsEnabled = Boolean(acct.payouts_enabled);
  s.stripe.detailsSubmitted = Boolean(acct.details_submitted);
  await saveStudio(s);
  if (!vorher && s.stripe.chargesEnabled) {
    await notify(s, mails.kontoFreigegeben(s));
    await notifyAdmin("Stripe-Konto freigegeben: Zahlungsarten + Branding einrichten", s, {});
  }
}


export { loginLink };
