// Geschäftslogik: Benachrichtigungen, Zahlungslinks, Kündigung, Monatsabrechnung.
import crypto from "node:crypto";
import { CFG, plattformgebuehr, netto, provisionSatz, BAUSTEINE_SIMULIERT, paketVon, aufstellerInklusive, klarnaPlattformAus, risikofreiDirect } from "./config.mjs";
import { sendMail } from "./mail.mjs";
import { mails } from "./emails.mjs";
import { stripe, taxRateId, ensureCustomer, TATTOOFIN_BRANDING } from "./stripe.mjs";
import { checkoutBranding } from "./branding.mjs";
import { allStudios, zahlungenVon, saveZahlung, getZahlung, getAbrechnung, saveAbrechnung, saveStudio, getStudio, log, store } from "./store.mjs";
import { gutscheinAusstellen } from "./gutschein.mjs";
import { gutscheinWort } from "./klarna-texte.mjs";
import { monatsende, now, HttpError, clean } from "./util.mjs";
import { loginLink, zweckToken } from "./auth.mjs";
import { pushAnStudio, mitZeitlimit, nachrichtZahlung, nachrichtAuszahlung, apnsAktiv } from "./push.mjs";
import { geraeteVon, geraeteAufraeumen } from "./app-geraete.mjs";

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

// Demo-Studios (App-Review, s.demo) bekommen nie Mails – auch nicht ihre „Kunden“.
export async function notify(studio, mail, to) {
  if (studio?.demo) return false;
  return sendMail({ to: to || studio.email, subject: mail.subject, html: mail.html, text: mail.text });
}

export async function notifyAdmin(titel, studio, details) {
  if (!CFG.adminEmail || studio?.demo) return;
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
// Stripe-Seite statt eingebetteter Einrichtung erzwingen (Rettungsweg, wenn die eingebettete Einrichtung hängt oder nicht möglich ist)
export const connectUrlGehostet = (s) => connectUrl(s) + "&gehostet=1";
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
  // Klarna ist für B2B-Käufe laut Klarna-Regeln nicht erlaubt (Studios kaufen als Unternehmer).
  const session = await stripe("POST", "/checkout/sessions", {
    excluded_payment_method_types: ["klarna"],
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
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40).replace(/-+$/, "") || "studio";
}

export async function zaehleAktion() {
  const z = (await store.get("meta/aktion-zaehler")) || { n: 0 };
  z.n += 1;
  await store.set("meta/aktion-zaehler", z);
}

// Demo-Studio (App-Review): darf Zahlungslinks anlegen, auch ohne Stripe-Konto. Bezahlen sperrt pay.mjs (409).
export function darfKassieren(s) {
  if (s?.demo) return ["einrichtung", "live", "gekuendigt"].includes(s.status);
  return s.stripe?.accountId && s.stripe?.chargesEnabled && ["einrichtung", "live", "gekuendigt"].includes(s.status);
}

// Provisions-Studios (Paket Risikofrei): Standard = Tattoofin kassiert als Plattform (Destination Charge), Stripe überweist den Rest
// an das Studio. Mit RISIKOFREI_DIRECT=1 (Standard AUS, Prototyp) zahlt der Kunde direkt auf dem Stripe-Konto des Studios
// (Direct Charge mit Stripe-Account-Header), Tattoofin bekommt nur die Plattformgebühr (application_fee_amount, 10 %).
export const istProvision = (s) => s.modell === "provision";
export const direktCharge = (s) => istProvision(s) && risikofreiDirect();
// Geld läuft über das Plattformkonto (Destination Charge)
export const plattformKassiert = (s) => istProvision(s) && !risikofreiDirect();
// Zahlung mit Tattoofin-Provision (egal ob Destination oder Direct Charge); z.abwicklung: plattform | direkt | studio
export const provisionZahlung = (z) => z.abwicklung === "plattform" || z.abwicklung === "direkt";
// Klarna für dieses Studio zum Zeitpunkt „zeit“ (Standard: jetzt). Ab dem Stichtag (KLARNA_PLATTFORM_BIS, Standard 20.11.2026, 00:00 deutscher
// Zeit) nicht mehr im Plattform-Modell (Risikofrei über das Plattformkonto); mit RISIKOFREI_DIRECT=1 oder bei eigenem Stripe-Konto weiter ja.
export const klarnaFuer = (s, zeit) => CFG.zahlarten.includes("klarna") && !(s && plattformKassiert(s) && klarnaPlattformAus(zeit));
// Klarna auch nach dem Stichtag? Für Dinge, die länger halten als der Stichtag (graviertes Holzschild, Beiträge/Bilder für Social Media):
// dort steht Klarna nur, wenn das Studio es dauerhaft anbietet.
export const klarnaDauerhaft = (s) => klarnaFuer(s, new Date("2100-01-01T00:00:00Z"));
// Grobe Schätzung der Stripe-Gebühr (für die Provisions-Verrechnung bei Erstattungen), falls Stripe sie auf dem Studio-Konto nicht ausweist
const schaetzGebuehr = (betragCent, zahlart) => (zahlart === "klarna" ? Math.round(betragCent * 0.0299) + 35 : Math.round(betragCent * 0.015) + 25);

// Standard-Anzahlungsbedingungen (Verbraucher-AGB des Studios, Fassung 18.10.2026): Pauschale nur bei kurzfristiger Absage/
// Nichterscheinen, Nachweis eines geringeren Schadens ausdrücklich möglich (§ 309 Nr. 5 BGB), Rückzahlung bei Absage durch das Studio.
export const ANZAHLUNG_STANDARD = "Die Anzahlung sichert deinen Termin und wird mit dem Preis deines Tattoos verrechnet. "
  + "Sagst du mindestens 48 Stunden vorher ab, kannst du den Termin nach Absprache verschieben, die Anzahlung wird dann angerechnet. "
  + "Möchtest du keinen neuen Termin, bekommst du die Anzahlung zurück, abzüglich des Werts schon erbrachter Leistungen (z. B. eines bereits gezeichneten Entwurfs). "
  + "Sagst du weniger als 48 Stunden vorher ab oder erscheinst du nicht, behält das Studio die Anzahlung als Ausgleich für den freigehaltenen Termin ein. "
  + "Du kannst nachweisen, dass dem Studio kein oder ein deutlich geringerer Schaden entstanden ist; dann wird entsprechend weniger einbehalten. "
  + "Sagt das Studio den Termin ab, bekommst du die Anzahlung zurück oder auf Wunsch einen neuen Termin.";
export const anzahlungsbedingungen = (s) => (s.anzahlungsbedingungen || ANZAHLUNG_STANDARD);
export const istAnzahlung = (z) => z.art === "anzahlung" || Boolean(z.anzahlung);

// Zahlarten je Zahlung: Gutscheine nur per Karte (Klarna lässt „Wertkarten, Gutscheine und Geschenkkarten“ nicht zu,
// docs.stripe.com/payments/klarna/compliance). nurKarte: Ausweg, wenn Klarna abgelehnt hat (Kunde wählt „mit Karte zahlen“).
// Gutscheine NIE mit Klarna: Die Klarna-Regeln schließen „Wertkarten, Gutscheine und Geschenkkarten“ aus
// (docs.stripe.com/payments/klarna/compliance); Stripe führt Geschenkkarten als eingeschränkte Branche
// (stripe.com/legal/restricted-businesses). Ein Verstoß kann Klarna oder das Plattformkonto sperren. Bewusst kein Schalter.
// Reihenfolge: immer Karte zuerst, keine Lenkung auf Klarna (Rechtsprüfung 01.11.2026, U5).
// Mit „studio“: Klarna entfällt, wo es für dieses Studio nicht angeboten wird (siehe klarnaFuer: Risikofrei über das Plattformkonto ab Stichtag).
export const zahlartenFuer = (z, { nurKarte = false, studio = null, zeit } = {}) => {
  if (z.art === "gutschein" || z.nurKarte || nurKarte || (z.art !== "gutschein" && gutscheinWort(z.beschreibung, z.sitzungen))) return ["card"];
  const arten = klarnaFuer(studio, zeit) ? CFG.zahlarten : CFG.zahlarten.filter((x) => x !== "klarna");
  return ["card", ...arten.filter((x) => x !== "card")].filter((x) => x !== "card" || arten.includes("card"));
};

// Klarer Name für den Warenkorb (Klarna zeigt ihn in der App und nutzt Warenkorbdaten für die Prüfung):
// „Tattoo – <Motiv> (<Studio>)“, Menge 1. Gutschein: „Tattoo-Gutschein <Studio> über X €“.
export function artikelText(studio, z) {
  const besch = (z.beschreibung || "").trim();
  const motiv = besch && !/^(tattoo-projekt|anzahlung|tattoo)$/i.test(besch) ? besch.replace(/^anzahlung:\s*/i, "") : "";
  if (z.art === "gutschein") return {
    name: `Wertgutschein ${(z.betragCent / 100).toLocaleString("de-DE")} € – ${studio.firma}`.slice(0, 200),
    description: `Wertgutschein, einlösbar für alle Leistungen bei ${studio.firma}${z.gutschein?.empfaenger ? ", für " + z.gutschein.empfaenger : ""}. Gültig bis Ende des dritten Jahres nach dem Kauf.`.slice(0, 480),
  };
  // Wahrheitsgemäß als Dienstleistung des Studios: „Tattoo bei <Studio> – <Motiv>“ (+ Anschrift des Studios).
  // Der Satz „direkt nach der Zahlungsfreigabe“ stimmt nur, wenn das Studio beim Anlegen ausdrücklich „heute im Studio“ gewählt hat
  // (z.heute). Sonst neutral: „Tätowierung bei <Studio>“, plus Sitzungen/Termin, wenn angegeben (Klarna sieht den Warenkorb, er muss immer stimmen).
  const anz = istAnzahlung(z);
  const adr = [studio.strasse, [studio.plz, studio.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const leistung = anz ? "Anzahlung, wird mit dem Preis verrechnet"
    : z.heute ? "Tätowierung vor Ort, direkt nach der Zahlungsfreigabe" : `Tätowierung bei ${studio.firma}`;
  return {
    name: `${anz ? "Anzahlung für " : ""}Tattoo bei ${studio.firma}${motiv ? " – " + motiv : ""}`.slice(0, 200),
    description: [z.sitzungen, z.termin ? `Termin: ${z.termin}` : "", leistung, adr ? `Anschrift: ${adr}` : ""].filter(Boolean).join(" · ").slice(0, 480),
  };
}

// Stripe lehnt eine Sitzung/Zahlung ab, wenn eine genannte Zahlart beim (Studio-)Konto nicht aktiviert ist
// („The payment method type provided: klarna is invalid …“). Erkennen, damit die Kasse auf Karte zurückfallen kann.
export const zahlartAbgelehnt = (e) => /payment method type.{0,40}(is )?invalid|payment method type.{0,60}(not|isn.t) (been )?(activated|enabled|available)|activated in your dashboard|invalid payment_method_types/i.test(String(e?.message || e));
async function zahlartFehlt(studio, z, e) {
  console.error(`[kasse] Zahlart bei ${studio.id} nicht verfügbar, Rückfall auf Karte:`, e.message);
  const letzte = studio.zahlartHinweisAm && Date.now() - new Date(studio.zahlartHinweisAm).getTime() < 24 * 3600e3;
  if (letzte) return;
  studio.zahlartHinweisAm = now();
  await saveStudio(studio);
  await notifyAdmin("⚠️ Klarna beim Studio-Konto nicht aktiviert: Kunden können nur per Karte zahlen", studio, { Zahlung: z.id, Konto: studio.stripe?.accountId, Stripe: String(e.message).slice(0, 200), Tipp: "Studio bitten, Klarna im eigenen Stripe-Dashboard (Einstellungen → Zahlungsmethoden) zu aktivieren" });
}

// Checkout-Sitzung für eine Kundenzahlung.
//  Kauf:      auf dem eigenen Stripe-Konto des Studios (Direct Charge), keine Plattformgebühr.
//  Provision: auf der Tattoofin-Plattform mit transfer_data → Konto des Studios und on_behalf_of (Studio ist Händler).
//             application_fee_amount = 10 % vom Zahlbetrag. Stripe-Gebühren trägt Tattoofin aus diesen 10 %.
// Für die Klarna-Prüfung (23.10.2026; Kunde braucht Vor-/Nachname, Anschrift, Telefon, E-Mail –, docs.stripe.com/payments/klarna/best-practices): klarer Artikelname mit Menge 1,
// Kunde als Stripe-Customer mit Name + E-Mail (vorausgefüllt), Rechnungsadresse und Telefonnummer verpflichtend.
export async function checkoutFuer(studio, z, { nurKarte = false } = {}) {
  if (!darfKassieren(studio)) throw new HttpError(409, "Dieses Studio kann gerade keine Zahlungen annehmen.");
  const plattform = plattformKassiert(studio);
  const direkt = direktCharge(studio);
  const fee = plattformgebuehr(z.betragCent, studio);
  const anzahlung = istAnzahlung(z);
  const meta = { tattoofinZahlung: z.id, studioId: studio.id, ...(z.art === "gutschein" ? { typ: "gutschein" } : {}) };
  const opts = plattform ? {} : { account: studio.stripe.accountId };
  const zahlarten = zahlartenFuer(z, { nurKarte, studio });
  const artikel = artikelText(studio, z);
  // Kunde vorab anlegen (Name + E-Mail vorausgefüllt). Klappt das nicht, sammelt Checkout die Angaben selbst.
  let customer = z.stripeCustomerId;
  if (!customer && (z.email || z.kunde)) {
    try {
      const c = await stripe("POST", "/customers", {
        name: z.kunde || undefined, email: z.email || undefined, preferred_locales: ["de"], metadata: { tattoofinZahlung: z.id, studioId: studio.id },
      }, { ...opts, idempotencyKey: `cus-z-${z.id}` });
      customer = z.stripeCustomerId = c.id;
    } catch (e) { console.error("Kunde konnte nicht angelegt werden:", e.message); }
  }
  const ausweichHinweis = !anzahlung && z.art !== "gutschein" && zahlarten.includes("klarna")
    ? "Stimmt Klarna nicht zu, kommst du über den Zurück-Pfeil oben links zu weiteren Möglichkeiten" + (studio.ausweichAnzahlung?.an ? " (z. B. Anzahlung per Karte, Rest direkt im Studio)." : " (z. B. Zahlung per Karte).")
    : "";
  const params = {
    mode: "payment", locale: "de", client_reference_id: z.id, payment_method_types: zahlarten,
    line_items: [{ quantity: 1, price_data: { currency: "eur", unit_amount: z.betragCent, product_data: artikel } }],
    ...(customer ? { customer, customer_update: { name: "auto", address: "auto" } } : { customer_email: z.email || undefined, customer_creation: "always" }),
    billing_address_collection: "required",
    phone_number_collection: { enabled: true },
    custom_text: anzahlung ? { submit: { message: ("Anzahlungsbedingungen: " + anzahlungsbedingungen(studio)).slice(0, 1200) } }
      : ausweichHinweis ? { submit: { message: ausweichHinweis } } : undefined,
    payment_intent_data: {
      ...(plattform ? { application_fee_amount: fee.bruttoCent, on_behalf_of: studio.stripe.accountId, transfer_data: { destination: studio.stripe.accountId }, transfer_group: z.id }
        : direkt ? { application_fee_amount: fee.bruttoCent } : {}),
      description: `${artikel.name} · ${z.kunde || "Kunde"}`.slice(0, 500),
      metadata: meta,
    },
    metadata: meta,
    success_url: `${CFG.siteUrl}/bezahlt.html?z=${z.id}`,
    cancel_url: `${CFG.siteUrl}/zahlung.html?z=${z.id}&abbruch=1`,
  };
  // Logo/Farben des Studios im Checkout (falls im Admin hinterlegt). Lehnt Stripe das Branding ab,
  // läuft die Zahlung ohne – die Kasse darf daran nie scheitern.
  const branding = checkoutBranding(studio);
  const anlegen = async (p) => {
    let sitzung;
    if (branding) {
      try { sitzung = await stripe("POST", "/checkout/sessions", { ...p, branding_settings: branding }, opts); }
      catch (e) { if (zahlartAbgelehnt(e)) throw e; console.error("Checkout-Branding abgelehnt:", e.message); }
    }
    return sitzung || stripe("POST", "/checkout/sessions", p, opts);
  };
  let session;
  try { session = await anlegen(params); }
  catch (e) {
    // Zahlart (z. B. Klarna) beim Konto des Studios nicht aktiviert: Stripe lehnt dann die GANZE Sitzung ab. Die Kasse darf daran nie
    // scheitern → einmal nur mit Karte, Admin wird informiert (Klarna im Konto des Studios bzw. in der Plattform-Konfiguration aktivieren).
    if (!zahlartAbgelehnt(e) || zahlarten.join() === "card") throw e;
    await zahlartFehlt(studio, z, e);
    session = await anlegen({ ...params, payment_method_types: ["card"], custom_text: anzahlung ? params.custom_text : undefined });
  }
  z.checkoutSessionId = session.id;
  z.abwicklung = plattform ? "plattform" : direkt ? "direkt" : "studio";
  z.gebuehrNettoCent = fee.nettoCent;
  z.gebuehrBruttoCent = fee.bruttoCent;
  await saveZahlung(z);
  return session.url;
}

// Letzten Zahlungsfehler getrennt speichern: Code, Decline-Code, Zahlart und Text, damit Ablehnung (Klarna/Bank), Abbruch durch den Kunden
// und Ablauf unterscheidbar sind. typ: ablehnung | abbruch | ablauf | fehler. Stripe-Codes: payment_method_customer_decline /
// payment_method_provider_decline = Ablehnung, „Customer cancelled…“ = Abbruch, payment_intent_payment_attempt_expired / Sitzung abgelaufen = Ablauf.
export function fehlerTyp(code = "", text = "", ereignis = "") {
  if (ereignis === "abgelaufen" || /expired/i.test(code)) return "ablauf";
  if (/cancel/i.test(text) || /customer_cancel|canceled/i.test(code)) return "abbruch";
  if (/decline|not_available|insufficient|card_declined|authentication/i.test(code)) return "ablehnung";
  return "fehler";
}
export function fehlerEintrag(err, { zahlart = "", ereignis = "" } = {}) {
  const code = String(err?.code || ""), text = String(err?.message || err?.text || "").slice(0, 200);
  return { am: now(), code, declineCode: String(err?.decline_code || ""), typ: fehlerTyp(code, text, ereignis), zahlart: zahlart || err?.payment_method?.type || "", text };
}

// Nach „Zurück“ aus dem Checkout: Hat Klarna abgelehnt? (Checkout-Sitzung → PaymentIntent → letzter Fehler)
// Klarna-Fehlercodes seit API 2023-08-16 (docs.stripe.com/changelog/2023-08-16/klarna-payment-failure-error-code):
// payment_method_customer_decline, payment_method_provider_decline, payment_method_not_available,
// payment_intent_payment_attempt_expired.
export async function klarnaVersuch(studio, z) {
  if (!z.checkoutSessionId || !studio?.stripe?.accountId) return null;
  const kontoId = kontoFuer(z, studio);
  const opts = kontoId ? { account: kontoId } : {};
  try {
    const cs = await stripe("GET", `/checkout/sessions/${z.checkoutSessionId}`, null, opts);
    const piId = typeof cs.payment_intent === "object" ? cs.payment_intent?.id : cs.payment_intent;
    if (!piId) return null;
    const pi = await stripe("GET", `/payment_intents/${piId}`, null, opts);
    const err = pi.last_payment_error;
    if (!err) return null;
    const typ = err.payment_method?.type || "";
    const klarna = typ === "klarna" || /klarna/i.test(err.message || "") || /^payment_method_(customer|provider)_decline$|^payment_method_not_available$/.test(err.code || "");
    z.letzterFehler = fehlerEintrag(err, { zahlart: klarna ? "klarna" : "" });
    return klarna ? { code: err.code || err.decline_code || "", text: String(err.message || "").slice(0, 200), pi: pi.id, typ: z.letzterFehler.typ } : null;
  } catch (e) { console.error("Klarna-Abgleich:", e.message); return null; }
}

// Eingebettetes Bezahlfeld (Payment Element) auf tattoofin.de statt Weiterleitung zum Stripe-Checkout.
// Gleiche Abwicklung wie checkoutFuer: Provision → Destination Charge (application_fee, on_behalf_of, transfer_data),
// Kauf/Profi → Direct Charge auf dem Konto des Studios (Stripe-Account-Header, ohne Plattformgebühr).
// Klarna leitet zur Bestätigung kurz zu Klarna weiter und dann zurück auf /bezahlt.html (das ist bei Klarna immer so).
export async function bezahlfeldFuer(studio, z) {
  if (!darfKassieren(studio)) throw new HttpError(409, "Dieses Studio kann gerade keine Zahlungen annehmen.");
  const plattform = plattformKassiert(studio);
  const direkt = direktCharge(studio);
  const fee = plattformgebuehr(z.betragCent, studio);
  const meta = { tattoofinZahlung: z.id, studioId: studio.id };
  // Bestehenden, noch offenen PaymentIntent wiederverwenden (Kunde lädt die Seite neu), sonst neu anlegen
  if (z.paymentIntentId && z.clientSecret && z.betragFuerPi === z.betragCent) {
    return { clientSecret: z.clientSecret, stripeAccount: plattform ? null : studio.stripe.accountId, zahlarten: zahlartenFuer(z, { studio }) };
  }
  const piParams = (arten) => ({
    amount: z.betragCent, currency: "eur", payment_method_types: arten,
    description: `${artikelText(studio, z).name} · ${z.kunde || "Kunde"}`.slice(0, 500),
    receipt_email: z.email || undefined, metadata: z.art === "gutschein" ? { ...meta, typ: "gutschein" } : meta,
    ...(plattform ? { application_fee_amount: fee.bruttoCent, on_behalf_of: studio.stripe.accountId, transfer_data: { destination: studio.stripe.accountId }, transfer_group: z.id }
      : direkt ? { application_fee_amount: fee.bruttoCent } : {}),
  });
  const piOpts = (schluessel) => ({ idempotencyKey: schluessel, ...(plattform ? {} : { account: studio.stripe.accountId }) });
  let pi;
  const arten = zahlartenFuer(z, { studio });
  try { pi = await stripe("POST", "/payment_intents", piParams(arten), piOpts(`pi-${z.id}-${z.betragCent}-${arten.join("")}`)); }
  catch (e) {
    if (!zahlartAbgelehnt(e) || arten.join() === "card") throw e;
    await zahlartFehlt(studio, z, e);
    pi = await stripe("POST", "/payment_intents", piParams(["card"]), piOpts(`pi-karte-${z.id}-${z.betragCent}`));
  }
  z.paymentIntentId = pi.id;
  z.clientSecret = pi.client_secret;
  z.betragFuerPi = z.betragCent;
  z.abwicklung = plattform ? "plattform" : direkt ? "direkt" : "studio";
  z.weg = "bezahlfeld";
  z.gebuehrNettoCent = fee.nettoCent;
  z.gebuehrBruttoCent = fee.bruttoCent;
  await saveZahlung(z);
  return { clientSecret: pi.client_secret, stripeAccount: plattform ? null : studio.stripe.accountId, zahlarten: arten };
}

const objId = (x) => (x && typeof x === "object" ? x.id : x || "");

// Konto, auf dem die Zahlung liegt: Plattformkonto (Destination Charge) = kein Header, sonst das Stripe-Konto des Studios
const kontoFuer = (z, s) => (z.abwicklung ? z.abwicklung === "plattform" : plattformKassiert(s)) ? undefined : s?.stripe?.accountId;

// Wann das Geld auf dem Stripe-Konto des Studios zur Auszahlung freigegeben wird (Stripe-Feld available_on der balance_transaction
// auf dem Studio-Konto). Destination Charge: Die Zahlung auf dem Studio-Konto („py_…“) hängt am Transfer. Nur wenn Stripe es liefert,
// sonst leer lassen (lieber kein Datum als ein falsches).
async function verfuegbarAbHolen(z, s, charge) {
  try {
    let bt = null, account;
    if (z.abwicklung === "plattform") {
      const trId = z.transferId || objId(charge?.transfer);
      if (!trId) return "";
      const tr = await stripe("GET", `/transfers/${trId}`);
      const py = objId(tr.destination_payment);
      const auszahlungskonto = s?.stripe?.altKonto?.accountId || s?.stripe?.accountId;
      if (!py || !auszahlungskonto) return "";
      account = auszahlungskonto;
      bt = (await stripe("GET", `/charges/${py}`, { expand: ["balance_transaction"] }, { account })).balance_transaction;
    } else {
      bt = charge?.balance_transaction;
    }
    const t = bt && typeof bt === "object" ? Number(bt.available_on) : 0;
    return t > 0 ? new Date(t * 1000).toISOString() : "";
  } catch (e) { console.error("[verfuegbar-ab]", z.id, e.message); return ""; }
}

// Was an einer bezahlten Zahlung noch fehlt (Transfer-ID, Plattformgebühr-ID, echte Stripe-Gebühr). Bei Klarna hängt Stripe diese Daten erst
// Sekunden bis Stunden NACH der Zahlung an → beim ersten Webhook sind sie noch leer.
export function stripeLuecken(z) {
  if (!z?.paymentIntentId || !["plattform", "direkt"].includes(z.abwicklung)) return [];
  const l = [];
  if (z.abwicklung === "plattform" && !z.transferId) l.push("transferId");
  if (z.gebuehrBruttoCent && !z.applicationFeeId) l.push("applicationFeeId");
  if (z.abwicklung === "plattform" && !z.stripeGebuehrCent) l.push("stripeGebuehrCent");
  return l;
}

// Fehlende Stripe-Daten einer Zahlung nachtragen (Aufrufe: Webhook charge.updated, Notanker vor Rückbuchung/Erstattung, täglicher Job).
// Ändert z in place und speichert nur bei Änderung. Wirft nie (Rückgabe: Liste der nachgetragenen Felder).
export async function stripeDatenNachtragen(z, { immer = false } = {}) {
  const luecken = stripeLuecken(z);
  if (!luecken.length && !(immer && !z.verfuegbarAb)) return [];
  const nachgetragen = [];
  try {
    const s = await getStudio(z.studioId);
    const account = kontoFuer(z, s);
    const pi = await stripe("GET", `/payment_intents/${z.paymentIntentId}`, { expand: ["latest_charge.balance_transaction"] }, account ? { account } : {});
    const charge = pi?.latest_charge && typeof pi.latest_charge === "object" ? pi.latest_charge : null;
    if (!charge) return [];
    const setze = (feld, wert) => { if (wert && !z[feld]) { z[feld] = wert; nachgetragen.push(feld); } };
    setze("chargeId", charge.id);
    setze("transferId", objId(charge.transfer));
    let feeId = objId(charge.application_fee);
    // Manche Konten/Zahlarten liefern die Gebühr nicht am Charge → bei Stripe nach der Plattformgebühr dieses Charges fragen
    if (!feeId && z.gebuehrBruttoCent && !z.applicationFeeId) {
      try { feeId = ((await stripe("GET", "/application_fees", { charge: charge.id, limit: 1 })).data || [])[0]?.id || ""; } catch (e) { console.error("[nachtragen] application_fees:", e.message); }
    }
    setze("applicationFeeId", feeId);
    const bt = charge.balance_transaction;
    if (z.abwicklung === "plattform" && bt && typeof bt === "object" && bt.fee && !z.stripeGebuehrCent) { z.stripeGebuehrCent = bt.fee; nachgetragen.push("stripeGebuehrCent"); }
    if (z.abwicklung === "direkt" && bt && typeof bt === "object" && bt.fee && z.stripeGebuehrCent !== bt.fee && !z.stripeGebuehrEcht) { z.stripeGebuehrCent = bt.fee; z.stripeGebuehrEcht = true; nachgetragen.push("stripeGebuehrCent"); }
    if (!z.verfuegbarAb) { const va = await verfuegbarAbHolen(z, s, charge); if (va) { z.verfuegbarAb = va; nachgetragen.push("verfuegbarAb"); } }
    if (nachgetragen.length) {
      await saveZahlung(z);
      await log("stripe-nachgetragen", { studioId: z.studioId, zahlungId: z.id, felder: nachgetragen });
    }
  } catch (e) { console.error("[nachtragen]", z.id, e.message); }
  return nachgetragen;
}

// Bezahlte Zahlungen der letzten 180 Tage (Klarna-Streitfälle sind so lange möglich) mit leeren Stripe-Daten nachtragen. Höchstens 100 pro Lauf,
// und pro Zahlung höchstens 14 Versuche über den Tagesjob (danach reicht der Notanker bei Rückbuchung/Erstattung).
export async function stripeDatenNachholen() {
  const out = [];
  const grenze = Date.now() - 180 * 864e5;
  let n = 0;
  for (const s of await allStudios()) {
    if (s.demo) continue;
    for (const z of await zahlungenVon(s.id)) {
      if (z.status !== "bezahlt" || n >= 100 || !stripeLuecken(z).length || new Date(z.bezahltAm || z.createdAt).getTime() < grenze || (z.nachtragVersuche || 0) >= 14) continue;
      n++;
      const felder = await stripeDatenNachtragen(z);
      if (!felder.length) { z.nachtragVersuche = (z.nachtragVersuche || 0) + 1; await saveZahlung(z); }
      else out.push(["stripe-nachgetragen", s.firma, z.id, felder.join("+")]);
    }
  }
  return out;
}

// Zahlung als bezahlt markieren (Webhook oder Abgleich nach der Rückkehr auf /bezahlt.html).
// Genau einmal pro Zahlung: Stripe schickt für dieselbe Zahlung mehrere Ereignisse fast gleichzeitig (z. B. checkout.session.completed UND
// payment_intent.succeeded). Ohne Sperre liefen beide Aufrufe parallel durch und das Studio bekam jede Mail doppelt (31.10.2026).
// Die Sperre ist ein atomar angelegter Eintrag je Zahlung; schlägt die Verarbeitung fehl, wird sie wieder freigegeben (Stripe sendet erneut).
const SPERRE_STALE_MS = 3 * 60 * 1000;
export async function zahlungBezahlt(z, account) {
  if (z.status === "bezahlt") return;
  const sperre = `sperre/bezahlt/${z.id}`;
  if (!(await store.setNeu(sperre, { at: now() }))) {
    const alt = await store.get(sperre);
    const abgelaufen = alt && !alt.fertig && Date.now() - new Date(alt.at).getTime() > SPERRE_STALE_MS;
    // Fertig oder ein anderer Aufruf arbeitet gerade → nichts doppelt tun. Nur eine hängengebliebene Sperre (Absturz) wird übernommen.
    if (!abgelaufen) return;
    await store.set(sperre, { at: now(), uebernommen: true });
  }
  try {
    const frisch = await getZahlung(z.studioId, z.id);
    if (frisch?.status === "bezahlt") { await store.set(sperre, { at: now(), fertig: true }); return; }
    await zahlungBezahltAusfuehren(z, account);
    await store.set(sperre, { at: now(), fertig: true });
  } catch (e) {
    await store.del(sperre).catch(() => {});
    throw e;
  }
}

async function zahlungBezahltAusfuehren(z, account) {
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
  // Direct Charge: Stripe rechnet die Gebühr bei Konten, für die die Plattform die Gebühren trägt, mit der Plattform ab und weist sie auf dem
  // Studio-Konto evtl. nicht aus → dann Schätzung (nur für die Verrechnung bei Erstattungen, nicht für Geldflüsse)
  if (z.abwicklung === "direkt") z.stripeGebuehrCent = (bt && typeof bt === "object" && bt.fee) || schaetzGebuehr(z.betragCent, z.zahlart);
  // Voraussichtlich verfügbar ab (nur wenn Stripe es schon liefert; bei Klarna erst später → dann beim Nachtragen)
  if (charge && z.abwicklung) { const va = await verfuegbarAbHolen(z, s, charge); if (va) z.verfuegbarAb = va; }
  z.status = "bezahlt";
  z.bezahltAm = now();
  delete z.clientSecret;
  await saveZahlung(z);
  // Gutschein: Code vergeben + PDF an den Käufer (statt der normalen Zahlungsbestätigung)
  if (z.art === "gutschein") await gutscheinAusstellen(s, z);
  // Ausweg nach Klarna-Ablehnung: Anzahlung bezahlt → am ursprünglichen Link vermerken
  if (z.ausweichVon) {
    const orig = await getZahlung(s.id, z.ausweichVon);
    if (orig) { orig.ausweich = { ...(orig.ausweich || {}), anzahlungId: z.id, bezahltAm: z.bezahltAm, betragCent: z.betragCent }; await saveZahlung(orig); }
  }
  await notify(s, mails.zahlungEingegangen(s, z));
  // Mitteilung an die App (nur Geräte mit „Zahlungen“). Wirft nie und wartet höchstens 3 s, damit der Webhook nicht hängt.
  try { await mitZeitlimit(pushAnStudio(s, "zahlungen", nachrichtZahlung(z))); } catch (e) { console.error("[push]", e.message); }
  if (z.email && z.art !== "gutschein") await notify(s, mails.zahlungKunde(s, z), z.email);
  await log("kundenzahlung", { studioId: s.id, zahlungId: z.id, betragCent: z.betragCent, gebuehrBruttoCent: z.gebuehrBruttoCent, stripeGebuehrCent: z.stripeGebuehrCent });
}

// Zahlungsstatus bei Stripe nachsehen, falls der Webhook nicht (rechtzeitig) angekommen ist: Kunde ist von Stripe/Klarna zurück auf
// /bezahlt.html gekommen, oder die täglichen Jobs prüfen noch offene Links. Ohne diesen Abgleich bliebe eine bezahlte Rechnung „offen“,
// das Studio bekäme keine Mail und der Kunde keine Bestätigung. Gibt true zurück, wenn die Zahlung jetzt als bezahlt verbucht wurde.
export async function zahlungAbgleichen(s, z) {
  if (!s?.stripe?.accountId || !["offen", "in_pruefung", "abgebrochen"].includes(z.status)) return false;
  const account = kontoFuer(z, s);
  const opts = account ? { account } : {};
  try {
    if (z.weg === "bezahlfeld" && z.paymentIntentId) {
      const pi = await stripe("GET", `/payment_intents/${z.paymentIntentId}`, null, opts);
      if (pi.status === "succeeded") { await zahlungBezahlt(z, account); return true; }
      if (pi.status === "processing" && z.status !== "in_pruefung") { z.status = "in_pruefung"; await saveZahlung(z); }
      return false;
    }
    if (!z.checkoutSessionId) return false;
    const cs = await stripe("GET", `/checkout/sessions/${z.checkoutSessionId}`, null, opts);
    const piId = objId(cs.payment_intent);
    if (cs.payment_status === "paid" || cs.payment_status === "no_payment_required") {
      if (piId) z.paymentIntentId = piId;
      await zahlungBezahlt(z, account);
      await log("zahlung-abgeglichen", { studioId: s.id, zahlungId: z.id });
      return true;
    }
    if (cs.status === "complete" && z.status !== "in_pruefung") { if (piId) z.paymentIntentId = piId; z.status = "in_pruefung"; await saveZahlung(z); }
  } catch (e) { console.error("[abgleich]", z.id, e.message); }
  return false;
}

// Offene Zahlungslinks mit gestarteter Kasse der letzten 30 Tage abgleichen (höchstens 100 pro Lauf)
export async function offeneZahlungenAbgleichen() {
  const out = [];
  const grenze = Date.now() - 30 * 864e5;
  let n = 0;
  for (const s of await allStudios()) {
    if (!s.stripe?.accountId || s.demo) continue;
    for (const z of await zahlungenVon(s.id)) {
      if (!["offen", "in_pruefung"].includes(z.status) || !z.checkoutSessionId || new Date(z.createdAt).getTime() < grenze || n >= 100) continue;
      n++;
      if (await zahlungAbgleichen(s, z)) out.push(["zahlung-nachgetragen", s.firma, z.id]);
    }
  }
  return out;
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
    if (s.demo) continue;
    // Umgestellte Studios: Provisions-Zahlungen aus der Zeit vor der Umstellung werden noch abgerechnet
    const umgestellt = Boolean(s.stripe?.altKonto);
    if (!umgestellt && (s.modell !== "provision" || !s.stripe?.accountId)) continue;
    const vorhanden = await getAbrechnung(s.id, monat);
    if (vorhanden && !dryRun) { ergebnis.push({ studio: s.firma, monat, status: "schon abgerechnet" }); continue; }
    // Erstattungen und verlorene Rückbuchungen mindern die Provision
    const zahlungen = (await zahlungenVon(s.id)).filter((z) => ["bezahlt", "erstattet", "rueckgebucht"].includes(z.status) && (z.bezahltAm || "").slice(0, 7) === monat && (!umgestellt || provisionZahlung(z)));
    if (umgestellt && !zahlungen.length) continue;
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
  // Zahlungen, die bezahlt wurden, deren Webhook aber fehlte, nachtragen
  out.push(...(await offeneZahlungenAbgleichen()));
  // Bezahlte Zahlungen, bei denen Stripe Transfer-/Gebühren-IDs erst nach dem Webhook geliefert hat (Klarna), nachtragen
  out.push(...(await stripeDatenNachholen()));
  // Kurz-Anfragen von /studios nach 6 Monaten löschen (Datenschutzerklärung, Abschnitt Anfrageformular)
  const grenze = new Date(Date.now() - 183 * 864e5).toISOString();
  for (const k of await store.list("anfrage/")) if (k.slice(8) < grenze) { await store.del(k); out.push(["anfrage-geloescht", k]); }
  // App-Geräte: widerrufene nach 30 Tagen, ungenutzte nach 180 Tagen löschen (Datenschutzerklärung „Tattoofin-App für Studios“)
  try { out.push(...(await geraeteAufraeumen())); } catch (e) { out.push(["app-geraete-aufraeumen-fehler", e.message]); }
  // Rückfall, falls payout.paid/payout.failed am Connect-Endpoint nicht abonniert ist: fehlende Auszahlungs-Mitteilungen nachholen
  try { out.push(...(await auszahlungenNachholen())); } catch (e) { out.push(["auszahlungen-nachholen-fehler", e.message]); }
  for (const s of await allStudios()) {
    if (s.demo) continue;
    const alterStd = (Date.now() - new Date(s.createdAt).getTime()) / 3600e3;
    // Alte Entwürfe im (geschlossenen) Paket Risikofrei bekommen keine Erinnerung: Der Link würde in eine Sackgasse führen.
    if (s.status === "entwurf" && !s.erinnertAbbruch && alterStd > 20 && s.paket !== "risikofrei") {
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
        // Wer nach 2 Tagen noch nicht fertig ist, bekommt den sicheren Weg über die Stripe-Seite (funktioniert auch, wenn die eingebettete Einrichtung hakt)
        await notify(s, mails.connectErinnerung(s, { connectUrl: connectUrlGehostet(s) }));
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
  // Klarna auf dem eigenen Konto schaltet das Studio selbst ein (Stripe: klarna_payments), hier nur der Stand fürs Dashboard
  if (acct.capabilities) s.stripe.klarnaAktiv = acct.capabilities.klarna_payments === "active";
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


// ---------------------------------------------------------------------------------------------------------------------
// Kündigung durch das Studio (Dashboard: POST/DELETE /api/portal/kuendigung, App: POST /api/app/konto-loeschen).
// Geld-zurück-Garantie: nur Einmalzahlung (und Altverträge „Kauf“), nicht Monatlich und nicht Geschenk
export const hatGarantie = (s) => s.modell === "kauf" && ["einmal"].includes(paketVon(s).id);
// mitMails=false: keine Bestätigungs-Mail an das Studio und keine Admin-Mail (die App schickt stattdessen die Löschanfrage-Mail)
export async function kuendigungEinreichen(s, { grund = "", garantie: wunschGarantie = false, quelle, mitMails = true } = {}) {
  if (["gekuendigt", "beendet", "erstattet"].includes(s.status)) throw new HttpError(400, "Der Vertrag ist bereits gekündigt.");
  const garantie = Boolean(wunschGarantie) && hatGarantie(s) && s.stripe?.paymentIntentId &&
    (!s.goLiveAt || Date.now() - new Date(s.goLiveAt).getTime() <= CFG.garantieTage * 864e5);
  // Paket Monatlich: Ende des laufenden Abrechnungsmonats des Abos (Stripe beendet das Abo dann selbst)
  let zum = garantie ? now() : kuendigungsDatum();
  if (!garantie && s.paket === "monatlich" && s.stripe?.subscriptionId) {
    try { zum = (await aboKuendigen(s, true)) || zum; }
    catch (e) { await notifyAdmin("⚠️ Abo konnte bei Stripe nicht gekündigt werden – bitte im Stripe-Dashboard zum Periodenende kündigen", s, { Abo: s.stripe.subscriptionId, Fehler: e.message }); }
  }
  s.kuendigung = { eingegangenAm: now(), zum, grund: clean(grund, 1000), garantie: Boolean(garantie), vorherStatus: s.status, ...(quelle ? { quelle } : {}) };
  s.status = "gekuendigt";
  await saveStudio(s);
  await log("kuendigung", { studioId: s.id, garantie, ...(quelle ? { quelle } : {}) });
  if (garantie) await notifyAdmin("⚠️ Garantie-Erstattung angefordert: bitte im Admin erstatten", s, { Grund: s.kuendigung.grund });
  else if (mitMails) {
    await notify(s, mails.kuendigung(s, { zum: s.kuendigung.zum }));
    await notifyAdmin("Kündigung eingegangen", s, { zum: s.kuendigung.zum, Grund: s.kuendigung.grund });
  }
  return s;
}

// Kündigung zurücknehmen. Entfernt auch eine Löschanfrage aus der App (s.loeschAnfrage).
export async function kuendigungZuruecknehmen(s) {
  if (s.status !== "gekuendigt" || s.kuendigung?.garantie) throw new HttpError(400, "Keine offene Kündigung, die zurückgenommen werden kann.");
  if (s.kuendigung?.durchAnbieter) throw new HttpError(409, "Diese Kündigung kam von Tattoofin. Bitte melde dich bei uns.");
  if (s.paket === "monatlich" && s.stripe?.subscriptionId) {
    if (s.stripe.aboBeendetAm || new Date(s.kuendigung.zum) <= new Date()) throw new HttpError(409, "Dein Abo ist schon beendet. Bitte melde dich bei uns, dann starten wir es neu.");
    try { await aboKuendigen(s, false); }
    catch (e) { throw new HttpError(502, "Die Kündigung konnte gerade nicht zurückgenommen werden. Bitte versuch es gleich noch einmal oder schreib uns."); }
  }
  s.status = s.kuendigung.vorherStatus || (s.goLiveAt ? "live" : "einrichtung");
  s.kuendigungHistorie = [...(s.kuendigungHistorie || []), { ...s.kuendigung, zurueckgenommenAm: now() }];
  s.kuendigung = null;
  if (s.loeschAnfrage) {
    s.loeschAnfrageHistorie = [...(s.loeschAnfrageHistorie || []), { ...s.loeschAnfrage, zurueckgenommenAm: now() }];
    delete s.loeschAnfrage;
  }
  await saveStudio(s);
  await notify(s, mails.kuendigungZurueck(s));
  await notifyAdmin("Kündigung zurückgenommen", s, {});
  return s;
}

// ---------------------------------------------------------------------------------------------------------------------
// Auszahlungen (Stripe payout.paid / payout.failed am Connect-Konto des Studios) → Mitteilung an die App.
// Doppelschutz: push/payout/<id> wird atomar angelegt (Webhook und täglicher Rückfall teilen ihn). Wirft nie.
export async function auszahlungMelden(s, po) {
  try {
    if (!s || !po?.id || !["paid", "failed"].includes(po.status)) return false;
    if (!(await store.setNeu("push/payout/" + po.id, { am: now(), studioId: s.id, status: po.status }))) return false;
    await log("auszahlung-" + (po.status === "paid" ? "angekommen" : "fehlgeschlagen"), { studioId: s.id, payoutId: po.id, betragCent: po.amount });
    await mitZeitlimit(pushAnStudio(s, "auszahlungen", nachrichtAuszahlung(po)));
    return true;
  } catch (e) { console.error("[auszahlung]", e.message); return false; }
}

// Täglicher Rückfall: Auszahlungen der letzten 48 Stunden je Studio mit Konto (nur Studios mit App-Geräten, die Auszahlungs-
// Mitteilungen wollen und einen Push-Token haben; nur wenn APNs eingerichtet ist, sonst würde der Doppelschutz ohne Versand gesetzt).
export async function auszahlungenNachholen() {
  const out = [];
  if (!apnsAktiv()) return out;
  const seit = Math.floor(Date.now() / 1000) - 48 * 3600;
  for (const s of await allStudios()) {
    if (s.demo || !s.stripe?.accountId) continue;
    const geraete = (await geraeteVon(s.id)).filter((g) => g.push?.token && g.mitteilungen?.auszahlungen !== false);
    if (!geraete.length) continue;
    try {
      const liste = await stripe("GET", "/payouts", { limit: 20, created: { gte: seit } }, { account: s.stripe.accountId });
      for (const po of liste.data || []) if (await auszahlungMelden(s, po)) out.push(["auszahlung-nachgeholt", s.firma, po.id]);
    } catch (e) { out.push(["auszahlungen-nachholen-fehler", s.firma, String(e.message).slice(0, 120)]); }
  }
  return out;
}

export { loginLink };


// ---------------------------------------------------------------------------------------------------------------------
// Altstudios (Paket Risikofrei) nach der Rechtsprüfung vom 01.11.2026 (U1): Das Studio stimmt aktiv zu und zahlt ab dann einen festen
// Monatspreis. Das Geld läuft danach direkt auf ein neues, eigenes Stripe-Konto (Standard). Ohne Zustimmung bleibt der Altvertrag bis zur Kündigung.
export const hatUmstellungsangebot = (s) => Boolean(s?.umstellung?.monatNetto) && s.modell === "provision" && !["beendet", "erstattet", "abgebrochen", "entwurf"].includes(s.status);

// Letzter Tag des Monats, zu dem der Anbieter mit einem Monat Frist kündigen kann (Altvertrag: ein Monat zum Monatsende)
export function anbieterKuendigungZum(jetzt = new Date()) {
  const d = new Date(Date.UTC(jetzt.getUTCFullYear(), jetzt.getUTCMonth() + 1, jetzt.getUTCDate()));
  // 12 Uhr UTC, damit das angezeigte Datum in deutscher Zeit der letzte Tag des Monats bleibt
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0, 12, 0, 0)).toISOString();
}

export async function umstellungCheckout(s) {
  const kunde = await ensureCustomer(s);
  s.stripe.customerId = kunde.id;
  await saveStudio(s);
  await stripe("POST", `/customers/${s.stripe.customerId}`, { invoice_settings: { footer: `${CFG.firma} · ${CFG.adresse} · USt-IdNr. ${CFG.ustid}` } });
  const session = await stripe("POST", "/checkout/sessions", {
    // Klarna ist für B2B-Käufe laut Klarna-Regeln nicht erlaubt (Studios kaufen als Unternehmer).
    excluded_payment_method_types: ["klarna"],
    mode: "subscription", customer: s.stripe.customerId, locale: "de", client_reference_id: s.id,
    branding_settings: TATTOOFIN_BRANDING,
    line_items: [{
      quantity: 1, tax_rates: [await taxRateId()],
      price_data: {
        currency: "eur", unit_amount: s.umstellung.monatNetto, recurring: { interval: "month" },
        product_data: { name: "Tattoofin (Bestandskunden-Preis)", description: "Software für Zahlungslinks, Zahlseite, Anzahlungen und Gutscheine. Keine Provision, monatlich kündbar." },
      },
    }],
    subscription_data: { description: "Tattoofin (Bestandskunden-Preis)", metadata: { studioId: s.id, typ: "abo", paket: "monatlich", umstellung: "1" } },
    customer_update: { address: "auto", name: "auto" }, tax_id_collection: { enabled: true },
    metadata: { studioId: s.id, typ: "abo", paket: "monatlich", umstellung: "1" },
    success_url: `${CFG.siteUrl}/app.html?umgestellt=1#einrichtung`,
    cancel_url: `${CFG.siteUrl}/app.html#start`,
  }, { idempotencyKey: `cs-umst-${s.id}-${s.umstellung.zustimmung?.am || ""}` });
  return session.url;
}

// Nach bezahltem erstem Monat: Studio wechselt das Paket. Das alte Auszahlungskonto bleibt für Auszahlungen, Rückbuchungen und Erstattungen alter Zahlungen vermerkt.
export async function umstellungAbschliessen(s, session) {
  if (s.modell !== "provision") return false;
  const alt = s.stripe || {};
  s.stripe = {
    ...alt, accountId: null, kontoTyp: null, chargesEnabled: false, payoutsEnabled: false, detailsSubmitted: false,
    altKonto: { accountId: alt.accountId || null, kontoTyp: alt.kontoTyp || "express", bis: now() },
    subscriptionId: typeof session.subscription === "string" ? session.subscription : session.subscription?.id,
  };
  s.vertragAlt = [...(s.vertragAlt || []), s.vertrag];
  s.vertrag = s.umstellung.zustimmung;
  s.modell = "kauf"; s.paket = "monatlich"; s.zahlart = "abo"; s.monatNetto = s.umstellung.monatNetto; s.provisionProzent = 0;
  s.status = "einrichtung"; s.goLiveAt = null; s.connectErinnert = 0; s.bezahltAm = now();
  s.umstellung = { ...s.umstellung, erledigtAm: now() };
  await saveStudio(s);
  // Offene Links laufen ab jetzt über das neue Konto ohne Provision: alte Bezahlsitzungen verwerfen
  for (const z of await zahlungenVon(s.id)) {
    if (z.abwicklung !== "plattform" || !["offen", "abgebrochen"].includes(z.status)) continue;
    if (z.checkoutSessionId) await stripe("POST", `/checkout/sessions/${z.checkoutSessionId}/expire`, {}).catch(() => null);
    for (const k of ["checkoutSessionId", "paymentIntentId", "clientSecret", "betragFuerPi", "abwicklung"]) delete z[k];
    z.gebuehrNettoCent = 0; z.gebuehrBruttoCent = 0;
    await saveZahlung(z);
  }
  await notify(s, mails.umstellungBestaetigt(s, { loginUrl: loginLink(s.id) }));
  await notifyAdmin("Altstudio umgestellt: festes Monatsabo, neues Stripe-Konto wird eingerichtet", s, { Preis: s.monatNetto / 100 + " € netto", AltesKonto: s.stripe.altKonto.accountId, Abo: s.stripe.subscriptionId });
  await log("umstellung.fertig", { studioId: s.id, altKonto: s.stripe.altKonto.accountId });
  return true;
}
