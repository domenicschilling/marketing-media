// Zentrale Geschäftsdaten und Preise. Werte lassen sich über Umgebungsvariablen in Netlify überschreiben.
const env = (k, d) => (process.env[k] !== undefined && process.env[k] !== "" ? process.env[k] : d);

export const CFG = {
  siteUrl: env("SITE_URL", env("URL", "http://localhost:8888")).replace(/\/$/, ""),

  // Anbieter
  firma: env("FIRMA", "DSX Media Solutions UG (haftungsbeschränkt)"),
  marke: "Tattoofin",
  produkt: "Tattoofin",
  adresse: env("FIRMA_ADRESSE", "[Straße Nr., PLZ Ort]"),
  registergericht: env("FIRMA_REGISTER", "[Amtsgericht, HRB-Nr.]"),
  ustid: env("FIRMA_USTID", "[USt-IdNr.]"),
  geschaeftsfuehrer: env("FIRMA_GF", "Domenic Schilling"),
  telefon: env("KONTAKT_TELEFON", "0174 1682157"),
  email: env("KONTAKT_EMAIL", "[E-Mail Tattoofin]"),
  gerichtsstand: env("GERICHTSSTAND", "[Sitz des Anbieters]"),
  whatsapp: env("KONTAKT_WHATSAPP", "491741682157"),
  videoUrl: env("VIDEO_URL", "/assets/werbevideo.mp4"),
  materialsUrl: env("MATERIALS_URL", "https://domenicschilling.github.io/marketing-media/tattoofin/kunden/"),

  // E-Mail
  mailFrom: env("MAIL_FROM", "Tattoofin <info@dsxmediasolutions.de>"),
  mailReplyTo: env("MAIL_REPLY_TO", ""),
  adminEmail: env("ADMIN_EMAIL", "domenicschilling@gmail.com"),

  // Preise (Cent, netto)
  kaufNetto: Number(env("KAUF_NETTO_CENT", 149900)),
  aktionNetto: Number(env("AKTION_NETTO_CENT", 124900)),
  aktionCode: env("AKTION_CODE", "RATENJA").toUpperCase(),
  aktionMax: Number(env("AKTION_MAX", 20)),
  aktionBis: env("AKTION_BIS", "2026-11-30"),
  provisionProzent: Number(env("PROVISION_PROZENT", 10)),
  ustProzent: Number(env("UST_PROZENT", 19)),
  garantieTage: Number(env("GARANTIE_TAGE", 30)),
  setupSupportTage: Number(env("SETUP_SUPPORT_TAGE", 30)),
  rechnungFaelligTage: Number(env("RECHNUNG_FAELLIG_TAGE", 14)),
  minBetragCent: Number(env("MIN_BETRAG_CENT", 5000)),       // kleinster Zahlungslink (50 €)
  maxBetragCent: Number(env("MAX_BETRAG_CENT", 2000000)),    // größter Zahlungslink (20.000 €)
  // Rückbuchungsgebühr von Stripe je Dispute (wird bei Rückbuchungen vom Studio zurückgeholt, bei Gewinn zurückgegeben)
  ruecklastGebuehrCent: Number(env("RUECKLAST_GEBUEHR_CENT", 2000)),
  // Optional: Auszahlung an Provisions-Studios erst nach X Tagen (Puffer für Rückbuchungen). Leer = Stripe-Standard.
  auszahlungTage: env("AUSZAHLUNG_TAGE", ""),
  vertragVersion: "2026-10b",
  // Zahlarten im Checkout. Bewusst ohne SEPA-Lastschrift: Die kann der Kunde 8 Wochen lang ohne Grund zurückbuchen.
  zahlarten: env("ZAHLARTEN", "card,klarna").split(",").map((x) => x.trim()).filter(Boolean),
};

export const SECRETS = {
  stripeKey: env("STRIPE_SECRET_KEY", ""),
  stripeWebhookSecret: env("STRIPE_WEBHOOK_SECRET", ""),
  stripeConnectWebhookSecret: env("STRIPE_CONNECT_WEBHOOK_SECRET", ""),
  stripeApiBase: env("STRIPE_API_BASE", "https://api.stripe.com"),
  sessionSecret: env("SESSION_SECRET", "dev-secret-bitte-in-netlify-setzen"),
  adminToken: env("ADMIN_TOKEN", ""),
};

// Provision im Modell B: 10 % vom Zahlbetrag, alles inklusive (Gebühren der Zahlungsanbieter und USt. sind enthalten).
// Beispiel: Kunde zahlt 3.000 € → 300 € Tattoofin (252,10 € netto + 47,90 € USt.) → 2.700 € gehen an das Studio.
export function plattformgebuehr(betragCent, modell) {
  if (modell !== "provision") return { nettoCent: 0, bruttoCent: 0 };
  const bruttoCent = Math.round(betragCent * CFG.provisionProzent / 100);
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
    kaufNetto: c.kaufNetto, aktionNetto: c.aktionNetto, aktionBis: c.aktionBis,
    provisionProzent: c.provisionProzent, ustProzent: c.ustProzent, garantieTage: c.garantieTage,
    setupSupportTage: c.setupSupportTage, vertragVersion: c.vertragVersion,
    minBetragCent: c.minBetragCent, maxBetragCent: c.maxBetragCent,
    stripeAktiv: Boolean(SECRETS.stripeKey),
  };
}
