// Zentrale Geschäftsdaten und Preise. Werte lassen sich über Umgebungsvariablen in Netlify überschreiben.
const env = (k, d) => (process.env[k] !== undefined && process.env[k] !== "" ? process.env[k] : d);

// Vorschau-Modus (eigene Netlify-Site „tattoofin-vorschau“, Env TF_VORSCHAU=1): eigener Datenspeicher, keine E-Mails,
// kein Tracking und Stripe nur im TEST-Modus. Ohne sk_test_-Schlüssel läuft ein eingebauter Stripe-Nachbau (Simulation).
// Live-Schlüssel werden in der Vorschau grundsätzlich ignoriert.
const VORSCHAU = env("TF_VORSCHAU", "") === "1";
const rohKey = env("STRIPE_SECRET_KEY", "");
const STRIPE_KEY = VORSCHAU ? (rohKey.startsWith("sk_test_") ? rohKey : "") : rohKey;
const rohPk = env("STRIPE_PUBLISHABLE_KEY", "");

export const CFG = {
  siteUrl: env("SITE_URL", env("URL", "http://localhost:8888")).replace(/\/$/, ""),
  vorschau: VORSCHAU,
  // Öffentlicher Stripe-Schlüssel (pk_…) für eingebettete Einrichtung/Auszahlungen (Connect Embedded Components) und
  // das eingebettete Bezahlfeld (Payment Element). Leer = wie bisher: Weiterleitung zu Stripe (Onboarding/Checkout).
  stripePublishableKey: VORSCHAU && !rohPk.startsWith("pk_test_") ? "" : rohPk,

  // Anbieter
  firma: env("FIRMA", "DSX Media Solutions UG (haftungsbeschränkt)"),
  marke: "Tattoofin",
  produkt: "Tattoofin",
  adresse: env("FIRMA_ADRESSE", "Am Weingarten 9, 96117 Memmelsdorf"),
  registergericht: env("FIRMA_REGISTER", "Amtsgericht Bamberg, HRB 12150"),
  ustid: env("FIRMA_USTID", "DE456133925"),
  geschaeftsfuehrer: env("FIRMA_GF", "Domenic Schilling"),
  telefon: env("KONTAKT_TELEFON", "0174 1682157"),
  email: env("KONTAKT_EMAIL", "info@tattoofin.de"),
  gerichtsstand: env("GERICHTSSTAND", "Bamberg"),
  whatsapp: env("KONTAKT_WHATSAPP", "491624502375"),
  videoUrl: env("VIDEO_URL", ""),       // z. B. /assets/werbevideo.mp4 oder YouTube-Datei-URL; leer = Videobereich ausgeblendet
  materialsUrl: env("MATERIALS_URL", "https://domenicschilling.github.io/marketing-media/tattoofin/kunden/"),

  // E-Mail
  mailFrom: env("MAIL_FROM", "Tattoofin <info@tattoofin.de>"),
  mailReplyTo: env("MAIL_REPLY_TO", ""),
  adminEmail: env("ADMIN_EMAIL", "domenicschilling@gmail.com"),

  // Preise (Cent, netto). Drei Pakete seit 18.10.2026 (Entscheidung Domenic), siehe PAKETE unten.
  // Einmalzahlung (früher „Kauf“ 1.499 € bzw. 1.249 € mit Aktionscode RATENJA – Aktionscode ist abgeschaltet)
  kaufNetto: Number(env("KAUF_NETTO_CENT", 99900)),
  // Monatlich: Abo auf dem DSX-Konto (Stripe Billing), zzgl. USt.
  monatNetto: Number(env("MONAT_NETTO_CENT", 4900)),
  // Einmalzahlung: Nutzungszusage (Anbieter kündigt ordentlich frühestens nach so vielen Jahren ab Inbetriebnahme)
  nutzungJahre: Number(env("NUTZUNG_JAHRE", 5)),
  provisionProzent: Number(env("PROVISION_PROZENT", 10)),
  ustProzent: Number(env("UST_PROZENT", 19)),
  garantieTage: Number(env("GARANTIE_TAGE", 30)),
  setupSupportTage: Number(env("SETUP_SUPPORT_TAGE", 30)),
  rechnungFaelligTage: Number(env("RECHNUNG_FAELLIG_TAGE", 7)),
  minBetragCent: Number(env("MIN_BETRAG_CENT", 5000)),       // kleinster Zahlungslink (50 €)
  maxBetragCent: Number(env("MAX_BETRAG_CENT", 2000000)),    // größter Zahlungslink (20.000 €)
  // Rückbuchungsgebühr von Stripe je Dispute (wird bei Rückbuchungen vom Studio zurückgeholt, bei Gewinn zurückgegeben)
  ruecklastGebuehrCent: Number(env("RUECKLAST_GEBUEHR_CENT", 2000)),
  // Optional: Auszahlung an Provisions-Studios erst nach X Tagen (Puffer für Rückbuchungen). Leer = Stripe-Standard.
  auszahlungTage: env("AUSZAHLUNG_TAGE", ""),
  // 2026-10d (18.10.2026): Rechtsdurchsicht (Stripe-Bedingungen, QR-Aufsteller einzeln im Paket Risikofrei, Haftung, Kündigung,
  // Vertragsschluss online). Ältere Fassungen: /vertrag-2026-10c.html, /vertrag-2026-10b.html
  vertragVersion: "2026-10d",
  // Blatt „Deine rechtliche Lage“ und Leistungsbestätigung: Version bei inhaltlichen Änderungen hochzählen (wird mit der Zustimmung gespeichert)
  rechtVersion: "2026-10b",
  bestaetigungVersion: "2026-10b",
  // Zahlarten im Checkout. Bewusst ohne SEPA-Lastschrift: Die kann der Kunde 8 Wochen lang ohne Grund zurückbuchen.
  zahlarten: env("ZAHLARTEN", "card,klarna").split(",").map((x) => x.trim()).filter(Boolean),
  // QR-Aufsteller aus Holz: in diesen Paketen inklusive (digitaler QR-Code ist in allen Paketen dabei); andere können ihn anfragen
  aufstellerPakete: env("AUFSTELLER_PAKETE", "monatlich,einmal").split(",").map((x) => x.trim()).filter(Boolean),
  // QR-Aufsteller einzeln (Pakete ohne Aufsteller, z. B. Risikofrei): Preis netto zzgl. USt., Kauf per Stripe-Checkout (DSX-Konto)
  aufstellerPreisNetto: Number(env("AUFSTELLER_PREIS_NETTO_CENT", 2900)),
};

// PayPal (seit 23.10.2026): Zahlung direkt an das PayPal-Geschäftskonto des Studios („Pay another account“, Orders API v2,
// Empfänger = payee), mit „Später bezahlen“/Ratenzahlung, wenn PayPal den Kunden freigibt. Zugangsdaten = REST-App von
// Tattoofin/DSX (developer.paypal.com). In der Vorschau nur Sandbox-Zugänge, sonst Simulation.
const PP_ENV = env("PAYPAL_ENV", "sandbox") === "live" && !VORSCHAU ? "live" : "sandbox";
const PP_ID = env("PAYPAL_CLIENT_ID", ""), PP_SECRET = env("PAYPAL_CLIENT_SECRET", "");
export const PAYPAL = {
  clientId: PP_ID, env: PP_ENV, webhookId: env("PAYPAL_WEBHOOK_ID", ""),
  apiBase: env("PAYPAL_API_BASE", PP_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com"),
  // Simulation: Vorschau ohne Sandbox-Zugang (Zustand im Vorschau-Speicher); lokaler Nachbau: Knopf ohne PayPal-Skript
  simulation: VORSCHAU && !(PP_ID && PP_SECRET),
  lokal: /^http:\/\/localhost:\d+$/.test(env("PAYPAL_API_BASE", "")),
};
export const paypalAktiv = () => process.env.TF_PAYPAL !== "aus" && (PAYPAL.simulation || Boolean(PAYPAL.clientId && PP_SECRET));

export const SECRETS = {
  paypalSecret: PP_SECRET,
  stripeKey: STRIPE_KEY,
  stripeWebhookSecret: env("STRIPE_WEBHOOK_SECRET", ""),
  stripeConnectWebhookSecret: env("STRIPE_CONNECT_WEBHOOK_SECRET", ""),
  stripeApiBase: env("STRIPE_API_BASE", "https://api.stripe.com"),
  sessionSecret: env("SESSION_SECRET", "dev-secret-bitte-in-netlify-setzen"),
  adminToken: env("ADMIN_TOKEN", ""),
};

// Simulation statt echtem Stripe: nur in der Vorschau ohne Test-Schlüssel
export const SIMULATION = VORSCHAU && !STRIPE_KEY;
// Eingebettete Stripe-Bausteine/Bezahlfeld als Simulation zeigen (Vorschau ohne Schlüssel oder lokaler Stripe-Nachbau)
const LOKALER_NACHBAU = /^http:\/\/localhost:\d+$/.test(env("STRIPE_API_BASE", ""));
export const BAUSTEINE_SIMULIERT = SIMULATION || LOKALER_NACHBAU;

// Drei Pakete (seit 18.10.2026, Entscheidung Domenic). „modell“ steuert die Zahlungsabwicklung:
//   provision = Tattoofin kassiert als Plattform (Express-Verhalten, Destination Charge, Provision wird einbehalten)
//   kauf      = eigenes Stripe-Konto des Studios (Standard, Direct Charge), 0 % Provision, Gebühren zahlt das Studio an Stripe
// „zahlart“ beim Abschluss: provision (nichts zu zahlen) | abo (Monatlich, Stripe-Billing-Abo auf dem DSX-Konto) |
//   sofort/rechnung (Einmalzahlung) | geschenk (Admin-Einladung, eigenes Konto, 0 €)
export const PAKETE = {
  risikofrei: { id: "risikofrei", name: "Risikofrei", modell: "provision", einrichtungNetto: 0, einmalNetto: 0, monatNetto: 0, provisionProzent: CFG.provisionProzent },
  monatlich: { id: "monatlich", name: "Monatlich", modell: "kauf", einrichtungNetto: 0, einmalNetto: 0, monatNetto: CFG.monatNetto, provisionProzent: 0, empfohlen: true },
  einmal: { id: "einmal", name: "Einmalzahlung", modell: "kauf", einrichtungNetto: CFG.kaufNetto, einmalNetto: CFG.kaufNetto, monatNetto: 0, provisionProzent: 0 },
};
// URL-/Formular-Aliase: ?modell=provision → Risikofrei, ?modell=kauf → Einmalzahlung (auch alte Vorschau-Namen start/profi)
export const PAKET_ALIAS = { provision: "risikofrei", kauf: "einmal", risikofrei: "risikofrei", monatlich: "monatlich", einmal: "einmal", einmalzahlung: "einmal", start: "risikofrei", profi: "einmal" };
// Paket eines Studios. Ältere Datensätze ohne „paket“: provision → Risikofrei, kauf → Einmalzahlung (Altvertrag „Kauf“).
export function paketVon(s) {
  if (s?.zahlart === "geschenk") return { id: "geschenk", name: s.sonderkondition || "Geschenk (eigenes Konto)", modell: "kauf", einrichtungNetto: 0, einmalNetto: 0, monatNetto: 0, provisionProzent: 0 };
  return PAKETE[s?.paket] || (s?.modell === "kauf" ? PAKETE.einmal : PAKETE.risikofrei);
}
export const aufstellerInklusive = (s) => CFG.aufstellerPakete.includes(paketVon(s).id);

// Provisionssatz eines Studios in Prozent (0 bei Kauf/Profi)
export function provisionSatz(s) {
  if (!s || s.modell !== "provision") return 0;
  return Number(s.provisionProzent ?? paketVon(s).provisionProzent ?? CFG.provisionProzent);
}

// Provision: X % vom Zahlbetrag, alles inklusive (Gebühren der Zahlungsanbieter und USt. sind enthalten).
// Beispiel Risikofrei: Kunde zahlt 3.000 € → 300 € Tattoofin (252,10 € netto + 47,90 € USt.) → 2.700 € gehen an das Studio.
// Zweites Argument: Studio-Datensatz (bevorzugt) oder – für alte Aufrufe – das Modell als Text.
export function plattformgebuehr(betragCent, studioOderModell) {
  const prozent = typeof studioOderModell === "string"
    ? (studioOderModell === "provision" ? CFG.provisionProzent : 0)
    : provisionSatz(studioOderModell);
  if (!prozent) return { nettoCent: 0, bruttoCent: 0 };
  const bruttoCent = Math.round(betragCent * prozent / 100);
  return { nettoCent: netto(bruttoCent), bruttoCent };
}
export const netto = (bruttoCent) => Math.round(bruttoCent * 100 / (100 + CFG.ustProzent));

// Öffentlich sichtbare Werte für die Website (/api/config)
export function publicConfig() {
  const c = CFG;
  return {
    produkt: c.produkt, marke: c.marke, firma: c.firma, adresse: c.adresse, registergericht: c.registergericht,
    ustid: c.ustid, geschaeftsfuehrer: c.geschaeftsfuehrer, telefon: c.telefon, email: c.email,
    gerichtsstand: c.gerichtsstand, whatsapp: c.whatsapp, videoUrl: c.videoUrl,
    kaufNetto: c.kaufNetto, monatNetto: c.monatNetto, nutzungJahre: c.nutzungJahre, aufstellerPakete: c.aufstellerPakete, aufstellerPreisNetto: c.aufstellerPreisNetto,
    pakete: Object.values(PAKETE).map(({ id, name, modell, einmalNetto, monatNetto, provisionProzent, empfohlen }) => ({ id, name, modell, einmalNetto, monatNetto, provisionProzent, empfohlen: Boolean(empfohlen) })),
    provisionProzent: c.provisionProzent, ustProzent: c.ustProzent, garantieTage: c.garantieTage,
    setupSupportTage: c.setupSupportTage, vertragVersion: c.vertragVersion,
    minBetragCent: c.minBetragCent, maxBetragCent: c.maxBetragCent,
    stripeAktiv: Boolean(SECRETS.stripeKey) || SIMULATION, vorschau: c.vorschau, simulation: BAUSTEINE_SIMULIERT,
    ruecklastGebuehrCent: c.ruecklastGebuehrCent, rechtVersion: c.rechtVersion,
  };
}
