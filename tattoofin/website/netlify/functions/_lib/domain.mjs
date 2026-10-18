// Geschäftslogik: Benachrichtigungen, Zahlungslinks, Kündigung, Monatsabrechnung.
import crypto from "node:crypto";
import { CFG, plattformgebuehr, netto, provisionSatz, BAUSTEINE_SIMULIERT, paketVon, aufstellerInklusive } from "./config.mjs";
import { sendMail } from "./mail.mjs";
import { mails } from "./emails.mjs";
import { stripe, taxRateId, ensureCustomer, TATTOOFIN_BRANDING } from "./stripe.mjs";
import { allStudios, zahlungenVon, saveZahlung, getAbrechnung, saveAbrechnung, saveStudio, getStudio, log, store } from "./store.mjs";
import { monatsende, now, HttpError } from "./util.mjs";
import { loginLink, zweckToken } from "./auth.mjs";

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
  // Gleiche Meldung (Titel, Studio, Details) höchstens einmal in 30 Minuten – schont das Mail-Limit (18.10.: 6 gleiche Fehler-Mails)
  const key = "rl/admin-mail/" + crypto.createHash("sha256").update(JSON.stringify([titel, studio?.id || "", details || {}])).digest("hex").slice(0, 32);
  const zuletzt = await store.get(key);
  if (zuletzt?.am && Date.now() - new Date(zuletzt.am).getTime() < 30 * 60e3) return;
  await store.set(key, { am: new Date().toISOString() });
  const m = mails.intern(titel, studio, details);
  return sendMail({ to: CFG.adminEmail, subject: m.subject, html: m.html, text: m.text });
}

// Stripe-Einrichtung per Weiterleitung: nur mit signiertem Link (24 h, an Studio + Zweck gebunden) oder Sitzung
export const connectUrl = (s) => `${CFG.siteUrl}/api/connect?id=${s.id}&t=${zweckToken(s.id, "connect", 24)}`;
// Abschluss fortsetzen (Erinnerungs-Mail, Abbruch im Checkout): signiert, 7 Tage
export const resumeUrl = (s) => `${CFG.siteUrl}/start.html?resume=${s.id}&t=${zweckToken(s.id, "resume", 24 * 7)}`;
// Eingebettete Einrichtung im Dashboard möglich? (öffentlicher Stripe-Schlüssel gesetzt oder Simulation)
// TF_EINBETTEN=aus schaltet zurück auf die Weiterleitung (Stripe-Onboarding/Checkout), z. B. für Tests oder als Notlösung
export const eingebettet = () => process.env.TF_EINBETTEN !== "aus" && (BAUSTEINE_SIMULIERT || Boolean(CFG.stripePublishableKey));
// Eingebettetes Bezahlfeld (Payment Element) für Endkunden: braucht die Webhook-Ereignisse payment_intent.succeeded/
// .processing/.payment_failed an BEIDEN Stripe-Endpoints („Ihr Konto“ und „Verbundene Konten“). Solange die nicht
// abonniert sind, bleibt live der bewährte Stripe-Checkout (Weiterleitung). Einschalten: Netlify-Env TF_BEZAHLFELD=an.
// In der Vorschau/Simulation und lokal mit Stripe-Nachbau ist es immer an.
export const bezahlfeld = () => eingebettet() && process.env.TF_BEZAHLFELD !== "aus" && (BAUSTEINE_SIMULIERT || process.env.TF_BEZAHLFELD === "an");
// Link aus E-Mails: mit Login direkt in die Einrichtung im Dashboard (sonst wie bisher Stripe-Seite)
export const einrichtungUrl = (s) => (eingebettet() ? `${loginLink(s.id)}&next=${encodeURIComponent("/app.html#einrichtung")}` : connectUrl(s));

// Zahlseite des Studios. Kurze Adresse /zahlen/<studio> (für QR-Codes, v. a. den gravierten Holz-Aufsteller);
// die alte Adresse /zahlen.html?s=<studio> funktioniert weiter.
export const zahlseiteUrl = (s) => `${CFG.siteUrl}/zahlen/${encodeURIComponent(s.slug)}`;
// Hersteller-Seite für den QR-Aufsteller (Gravurdatei als PDF/SVG/PNG)
// Signiert (90 Tage), damit Logo/Gravurdaten nicht allein über den (erratbaren) Studionamen abrufbar sind
export const aufstellerUrl = (s) => `${CFG.siteUrl}/aufsteller.html?s=${encodeURIComponent(s.slug)}&t=${zweckToken(s.id, "aufsteller", 24 * 90)}`;
// Zusatzzeilen für Admin-Mails: Paket und – bei Monatlich/Einmalzahlung – „QR-Aufsteller bestellen“ mit Gravurdatei
export function paketDetails(s, { aufsteller = false } = {}) {
  const d = { Paket: paketVon(s).name };
  if (aufsteller && aufstellerInklusive(s)) {
    d["QR-Aufsteller bestellen"] = "im Paket enthalten – Gravurdatei unten (Standard: Holz hell, mit Studioname). Das Studio kann in der App unter Werbung → QR-Aufsteller Holzton/Logo wählen und anfordern; spätestens nach Go-live bestellen.";
    d.Gravurdatei = aufstellerUrl(s);
    d.Lieferadresse = [s.firma, s.strasse, [s.plz, s.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    d["QR-Code zeigt auf"] = zahlseiteUrl(s);
  }
  return d;
}

// Rechnungsfuß für Rechnungen vom DSX-Konto (Stripe)
export const RECHNUNG_FUSS = `${CFG.firma} · ${CFG.adresse} · USt-IdNr. ${CFG.ustid}`;
const lieferadresse = (s) => [s.firma, s.strasse, [s.plz, s.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");
const holzText = (h) => (h === "dunkel" ? "dunkel (Walnuss)" : "hell (Birke/Buche)");

// QR-Aufsteller einzeln kaufen (Pakete ohne Aufsteller): Stripe-Checkout auf dem DSX-Konto, Rechnung automatisch.
export async function aufstellerCheckout(s) {
  if (!s.stripe?.customerId) { const cus = await ensureCustomer(s); s.stripe = { ...(s.stripe || {}), customerId: cus.id }; }
  const name = "QR-Aufsteller aus Holz";
  const text = `Graviert mit QR-Code deiner Zahlseite, ${s.aufsteller?.variante === "logo" ? "mit deinem Logo" : "mit Studioname"}, Holz ${holzText(s.aufsteller?.holz)}. Lieferung an: ${lieferadresse(s)}`.slice(0, 480);
  const session = await stripe("POST", "/checkout/sessions", {
    mode: "payment", customer: s.stripe.customerId, locale: "de", client_reference_id: s.id,
    branding_settings: TATTOOFIN_BRANDING,
    line_items: [{ quantity: 1, tax_rates: [await taxRateId()], price_data: { currency: "eur", unit_amount: CFG.aufstellerPreisNetto, product_data: { name, description: text } } }],
    invoice_creation: { enabled: true, invoice_data: { description: name, metadata: { studioId: s.id, typ: "aufsteller" }, footer: RECHNUNG_FUSS } },
    customer_update: { address: "auto", name: "auto" }, tax_id_collection: { enabled: true },
    payment_intent_data: { metadata: { studioId: s.id, typ: "aufsteller" }, description: name },
    metadata: { studioId: s.id, typ: "aufsteller" },
    success_url: `${CFG.siteUrl}/app.html?aufsteller=bezahlt&cs={CHECKOUT_SESSION_ID}#werbung`,
    cancel_url: `${CFG.siteUrl}/app.html#werbung`,
  });
  return session;
}

// Aufsteller-Kauf bezahlt (Webhook checkout.session.completed oder Rückkehr aus dem Checkout): einmalig vermerken + Admin-Mail
export async function aufstellerBezahlt(s, session) {
  if (!s || session?.metadata?.typ !== "aufsteller" || session.metadata.studioId !== s.id || session.payment_status !== "paid") return false;
  const a = s.aufsteller || {};
  if (a.kauf?.csId === session.id && a.kauf?.bezahltAm) return true;
  a.kauf = { csId: session.id, bezahltAm: new Date().toISOString(), betragCent: session.amount_total, invoiceId: typeof session.invoice === "object" ? session.invoice?.id : session.invoice || null };
  a.angefordertAm = a.angefordertAm || a.kauf.bezahltAm;
  s.aufsteller = a;
  await saveStudio(s);
  await notifyAdmin("QR-Aufsteller bestellen (29 € bezahlt)", s, {
    Paket: paketVon(s).name, Bezahlt: (session.amount_total / 100).toFixed(2).replace(".", ",") + " € brutto",
    Holz: holzText(a.holz), Variante: a.variante === "logo" ? "mit Studio-Logo" : "mit Studioname",
    Lieferadresse: lieferadresse(s), Gravurdatei: aufstellerUrl(s), "QR-Code zeigt auf": zahlseiteUrl(s), Telefon: s.telefon,
  });
  await log("aufsteller-bezahlt", { studioId: s.id, cs: session.id });
  return true;
}

// Paket Monatlich: Abo auf dem DSX-Konto zum Ende des laufenden Abrechnungsmonats beenden (bzw. Kündigung zurücknehmen).
// Liefert das Vertragsende (ISO) oder null, wenn es kein Abo gibt.
export async function aboKuendigen(s, kuendigen = true) {
  const subId = s.stripe?.subscriptionId;
  if (!subId) return null;
  const sub = await stripe("POST", `/subscriptions/${subId}`, { cancel_at_period_end: kuendigen ? "true" : "false" });
  return sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
}

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

// Provisions-Studios: Tattoofin kassiert als Plattform (Destination Charge), Stripe überweist den Rest an das Studio.
export const plattformKassiert = (s) => s.modell === "provision";

export const ANZAHLUNG_STANDARD = "Die Anzahlung sichert deinen Termin und wird mit dem Preis deines Tattoos verrechnet. "
  + "Sagst du den Termin weniger als 48 Stunden vorher ab oder erscheinst du nicht, behält das Studio die Anzahlung ein. "
  + "Verschieben ist nach Absprache möglich.";
export const anzahlungsbedingungen = (s) => (s.anzahlungsbedingungen || ANZAHLUNG_STANDARD);
export const istAnzahlung = (z) => z.art === "anzahlung" || Boolean(z.anzahlung);

// Checkout-Sitzung für eine Kundenzahlung.
//  Kauf:      auf dem eigenen Stripe-Konto des Studios (Direct Charge), keine Plattformgebühr.
//  Provision: auf der Tattoofin-Plattform mit transfer_data → Konto des Studios und on_behalf_of (Studio ist Händler).
//             application_fee_amount = 10 % vom Zahlbetrag. Stripe-Gebühren trägt Tattoofin aus diesen 10 %.
export async function checkoutFuer(studio, z) {
  if (!darfKassieren(studio)) throw new HttpError(409, "Dieses Studio kann gerade keine Zahlungen annehmen.");
  const plattform = plattformKassiert(studio);
  const fee = plattformgebuehr(z.betragCent, studio);
  const anzahlung = istAnzahlung(z);
  const meta = { tattoofinZahlung: z.id, studioId: studio.id };
  const session = await stripe("POST", "/checkout/sessions", {
    mode: "payment", locale: "de", client_reference_id: z.id, payment_method_types: CFG.zahlarten,
    line_items: [{ quantity: 1, price_data: { currency: "eur", unit_amount: z.betragCent, product_data: { name: z.beschreibung || "Tattoo-Projekt", description: `${studio.firma}${anzahlung ? " · Anzahlung" : ""}` } } }],
    customer_email: z.email || undefined,
    custom_text: anzahlung ? { submit: { message: ("Anzahlungsbedingungen: " + anzahlungsbedingungen(studio)).slice(0, 1200) } } : undefined,
    payment_intent_data: {
      ...(plattform ? { application_fee_amount: fee.bruttoCent, on_behalf_of: studio.stripe.accountId, transfer_data: { destination: studio.stripe.accountId }, transfer_group: z.id } : {}),
      description: `${z.beschreibung || "Tattoo-Projekt"} (${z.kunde || "Kunde"})${anzahlung ? " · Anzahlung" : ""}`,
      metadata: meta,
    },
    metadata: meta,
    success_url: `${CFG.siteUrl}/bezahlt.html?z=${z.id}`,
    cancel_url: `${CFG.siteUrl}/zahlung.html?z=${z.id}&abbruch=1`,
  }, plattform ? {} : { account: studio.stripe.accountId });
  z.checkoutSessionId = session.id;
  z.abwicklung = plattform ? "plattform" : "studio";
  z.gebuehrNettoCent = fee.nettoCent;
  z.gebuehrBruttoCent = fee.bruttoCent;
  await saveZahlung(z);
  return session.url;
}

// Eingebettetes Bezahlfeld (Payment Element) auf tattoofin.de statt Weiterleitung zum Stripe-Checkout.
// Gleiche Abwicklung wie checkoutFuer: Provision → Destination Charge (application_fee, on_behalf_of, transfer_data),
// Kauf/Profi → Direct Charge auf dem Konto des Studios (Stripe-Account-Header, ohne Plattformgebühr).
// Klarna leitet zur Bestätigung kurz zu Klarna weiter und dann zurück auf /bezahlt.html (das ist bei Klarna immer so).
export async function bezahlfeldFuer(studio, z) {
  if (!darfKassieren(studio)) throw new HttpError(409, "Dieses Studio kann gerade keine Zahlungen annehmen.");
  const plattform = plattformKassiert(studio);
  const fee = plattformgebuehr(z.betragCent, studio);
  const anzahlung = istAnzahlung(z);
  const meta = { tattoofinZahlung: z.id, studioId: studio.id };
  // Bestehenden, noch offenen PaymentIntent wiederverwenden (Kunde lädt die Seite neu), sonst neu anlegen
  if (z.paymentIntentId && z.clientSecret && z.betragFuerPi === z.betragCent) {
    return { clientSecret: z.clientSecret, stripeAccount: plattform ? null : studio.stripe.accountId };
  }
  const pi = await stripe("POST", "/payment_intents", {
    amount: z.betragCent, currency: "eur", payment_method_types: CFG.zahlarten,
    description: `${z.beschreibung || "Tattoo-Projekt"} (${z.kunde || "Kunde"})${anzahlung ? " · Anzahlung" : ""}`,
    receipt_email: z.email || undefined, metadata: meta,
    ...(plattform ? { application_fee_amount: fee.bruttoCent, on_behalf_of: studio.stripe.accountId, transfer_data: { destination: studio.stripe.accountId }, transfer_group: z.id } : {}),
  }, { idempotencyKey: `pi-${z.id}-${z.betragCent}`, ...(plattform ? {} : { account: studio.stripe.accountId }) });
  z.paymentIntentId = pi.id;
  z.clientSecret = pi.client_secret;
  z.betragFuerPi = z.betragCent;
  z.abwicklung = plattform ? "plattform" : "studio";
  z.weg = "bezahlfeld";
  z.gebuehrNettoCent = fee.nettoCent;
  z.gebuehrBruttoCent = fee.bruttoCent;
  await saveZahlung(z);
  return { clientSecret: pi.client_secret, stripeAccount: plattform ? null : studio.stripe.accountId };
}

const objId = (x) => (x && typeof x === "object" ? x.id : x || "");

// Zahlung als bezahlt markieren (Webhook oder Abgleich nach der Rückkehr auf /bezahlt.html)
export async function zahlungBezahlt(z, account) {
  if (z.status === "bezahlt") return;
  const s = await getStudio(z.studioId);
  let pi = null;
  try { pi = await stripe("GET", `/payment_intents/${z.paymentIntentId}`, { expand: ["latest_charge.balance_transaction"] }, { account }); } catch { /* Details optional */ }
  const charge = pi?.latest_charge && typeof pi.latest_charge === "object" ? pi.latest_charge : null;
  z.zahlart = charge?.payment_method_details?.type || pi?.payment_method_types?.[0] || "";
  z.zahlartText = ZAHLART[z.zahlart] || z.zahlart;
  z.chargeId = charge?.id || "";
  z.applicationFeeId = objId(charge?.application_fee);
  z.transferId = objId(charge?.transfer);
  // Provision: Stripe-Gebühr zahlt Tattoofin. Merken, weil sie bei Erstattungen nicht zurückkommt.
  const bt = charge?.balance_transaction;
  if (z.abwicklung === "plattform" && bt && typeof bt === "object") z.stripeGebuehrCent = bt.fee || 0;
  z.status = "bezahlt";
  z.bezahltAm = now();
  delete z.clientSecret;
  await saveZahlung(z);
  await notify(s, mails.zahlungEingegangen(s, z));
  if (z.email) await notify(s, mails.zahlungKunde(s, z), z.email);
  await log("kundenzahlung", { studioId: s.id, zahlungId: z.id, betragCent: z.betragCent, gebuehrBruttoCent: z.gebuehrBruttoCent, stripeGebuehrCent: z.stripeGebuehrCent });
}

// Provision, die Tattoofin an einer Zahlung endgültig verdient (brutto, inkl. USt.)
export function provisionVerdient(z) {
  if (z.status === "rueckgebucht") return 0;
  return Math.max(0, (z.gebuehrBruttoCent || 0) - (z.gebuehrErstattetCent || 0));
}

// Monatsabrechnung Provision: Die Provision wurde bei jeder Zahlung schon einbehalten. Hier entsteht die Rechnung
// (Beträge inkl. USt., in Stripe als „außerhalb von Stripe bezahlt“ markiert) und die Übersicht per E-Mail.
export async function monatsabrechnung(monat, { dryRun = false } = {}) {
  const ergebnis = [];
  for (const s of await allStudios()) {
    if (s.modell !== "provision" || !s.stripe?.accountId) continue;
    const vorhanden = await getAbrechnung(s.id, monat);
    if (vorhanden && !dryRun) { ergebnis.push({ studio: s.firma, monat, status: "schon abgerechnet" }); continue; }
    // Erstattungen und verlorene Rückbuchungen mindern die Provision
    const zahlungen = (await zahlungenVon(s.id)).filter((z) => ["bezahlt", "erstattet", "rueckgebucht"].includes(z.status) && (z.bezahltAm || "").slice(0, 7) === monat);
    const positionen = zahlungen.map((z) => {
      const betragCent = z.status === "rueckgebucht" ? 0 : z.betragCent - (z.erstattetCent || 0);
      const provisionBruttoCent = provisionVerdient(z);
      return {
        zahlungId: z.id, datum: z.bezahltAm, kunde: z.kunde, beschreibung: z.beschreibung, art: z.art,
        betragCent, provisionBruttoCent, auszahlungCent: betragCent - provisionBruttoCent,
      };
    }).filter((p) => p.provisionBruttoCent > 0 || p.betragCent > 0);
    const ab = {
      studioId: s.id, monat, positionen, createdAt: now(),
      umsatzCent: positionen.reduce((a, b) => a + b.betragCent, 0),
      provisionBruttoCent: positionen.reduce((a, b) => a + b.provisionBruttoCent, 0),
    };
    ab.provisionNettoCent = netto(ab.provisionBruttoCent);
    ab.auszahlungCent = ab.umsatzCent - ab.provisionBruttoCent;
    ab.status = ab.provisionBruttoCent ? "einbehalten" : "nichts_faellig";
    if (dryRun) { ergebnis.push({ studio: s.firma, ...ab }); continue; }
    if (!ab.provisionBruttoCent && s.status === "beendet") continue;

    let rechnungUrl = "";
    if (ab.provisionBruttoCent > 0) {
      if (!s.stripe.customerId) { const c = await ensureCustomer(s); s.stripe.customerId = c.id; await saveStudio(s); }
      const txr = await taxRateId({ inklusive: true });
      await stripe("POST", "/invoiceitems", {
        customer: s.stripe.customerId, currency: "eur", amount: ab.provisionBruttoCent, tax_rates: [txr],
        description: `Tattoofin-Provision ${provisionSatz(s)} % vom Zahlbetrag (inkl. Zahlungsgebühren) auf ${positionen.length} Zahlung(en), Zahlbeträge ${(ab.umsatzCent / 100).toFixed(2)} € (${monat})`,
        metadata: { studioId: s.id, monat },
      }, { idempotencyKey: `ii-prov-${s.id}-${monat}` });
      const inv = await stripe("POST", "/invoices", {
        customer: s.stripe.customerId, collection_method: "send_invoice", days_until_due: 1, auto_advance: false,
        pending_invoice_items_behavior: "include", currency: "eur",
        description: `Tattoofin-Provision ${monat}. Bereits bei den einzelnen Zahlungen einbehalten, die Auszahlung an dich war entsprechend geringer.`,
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
    await log("abrechnung", { studioId: s.id, monat, provisionBruttoCent: ab.provisionBruttoCent });
    ergebnis.push({ studio: s.firma, monat, umsatzCent: ab.umsatzCent, provisionBruttoCent: ab.provisionBruttoCent, provisionNettoCent: ab.provisionNettoCent, auszahlungCent: ab.auszahlungCent, zahlungen: positionen.length, rechnung: ab.rechnungNr });
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
  // Kurz-Anfragen von /studios nach 6 Monaten löschen (Datenschutzerklärung, Abschnitt Anfrageformular)
  const grenze = new Date(Date.now() - 183 * 864e5).toISOString();
  for (const k of await store.list("anfrage/")) if (k.slice(8) < grenze) { await store.del(k); out.push(["anfrage-geloescht", k]); }
  for (const s of await allStudios()) {
    const alterStd = (Date.now() - new Date(s.createdAt).getTime()) / 3600e3;
    if (s.status === "entwurf" && !s.erinnertAbbruch && alterStd > 20) {
      s.erinnertAbbruch = now(); await saveStudio(s);
      await notify(s, mails.anmeldungAbgebrochen(s, { resumeUrl: resumeUrl(s) }));
      out.push(["abbruch-erinnerung", s.firma]);
    }
    // Stripe-Konto nach 2 und 7 Tagen noch nicht freigegeben → erinnern
    if (["einrichtung", "zahlung_offen"].includes(s.status) && !s.stripe?.chargesEnabled) {
      const seit = (Date.now() - new Date(s.vertrag?.akzeptiertAm || s.createdAt).getTime()) / 864e5;
      const stufe = seit > 7 ? 2 : seit > 2 ? 1 : 0;
      if (stufe > (s.connectErinnert || 0)) {
        s.connectErinnert = stufe; await saveStudio(s);
        await notify(s, mails.connectErinnerung(s, { connectUrl: einrichtungUrl(s) }));
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
  // Was Stripe noch braucht (für Admin/Dashboard), und wann zuletzt abgeglichen (Webhook oder „jetzt abgleichen“)
  const r = acct.requirements || {};
  s.stripe.offen = { faellig: (r.currently_due || []).slice(0, 20), ueberfaellig: (r.past_due || []).slice(0, 20), inPruefung: (r.pending_verification || []).slice(0, 20), sperrgrund: r.disabled_reason || null };
  s.stripe.abgeglichenAm = new Date().toISOString();
  await saveStudio(s);
  if (!vorher && s.stripe.chargesEnabled) {
    await notify(s, mails.kontoFreigegeben(s));
    await notifyAdmin("Stripe-Konto freigegeben: Zahlungsarten + Branding einrichten", s, {});
  }
}


export { loginLink };
