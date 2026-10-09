// Zentrale Geschäftsdaten und Preise. Werte lassen sich über Umgebungsvariablen in Netlify überschreiben.
const env = (k, d) => (process.env[k] !== undefined && process.env[k] !== "" ? process.env[k] : d);

export const CFG = {
  siteUrl: env("SITE_URL", env("URL", "http://localhost:8888")).replace(/\/$/, ""),

  // Anbieter
  firma: env("FIRMA", "DSX Media Solutions UG (haftungsbeschränkt)"),
  marke: "TattooLeadz",
  produkt: "Ted am Telefon",
  adresse: env("FIRMA_ADRESSE", "[Straße Nr., PLZ Ort]"),
  registergericht: env("FIRMA_REGISTER", "[Amtsgericht, HRB-Nr.]"),
  ustid: env("FIRMA_USTID", "[USt-IdNr.]"),
  geschaeftsfuehrer: env("FIRMA_GF", "Domenic Schilling"),
  telefon: env("KONTAKT_TELEFON", "0174 1682157"),
  email: env("KONTAKT_EMAIL", "tattooleadz@gmail.com"),
  gerichtsstand: env("GERICHTSSTAND", "[Sitz des Anbieters]"),
  demoNummer: env("DEMO_NUMMER", ""),
  whatsapp: env("KONTAKT_WHATSAPP", "491741682157"),
  videoUrl: env("VIDEO_URL", "/assets/werbevideo.mp4"),
  materialsUrl: env("MATERIALS_URL", "https://domenicschilling.github.io/marketing-media/telefon/kunden/"),

  // E-Mail
  mailFrom: env("MAIL_FROM", "Ted am Telefon <info@dsxmediasolutions.de>"),
  mailReplyTo: env("MAIL_REPLY_TO", "tattooleadz@gmail.com"),
  adminEmail: env("ADMIN_EMAIL", "domenicschilling@gmail.com"),

  // Preise (Cent, netto)
  kaufNetto: Number(env("KAUF_NETTO_CENT", 149900)),
  aktionNetto: Number(env("AKTION_NETTO_CENT", 124900)),
  aktionCode: env("AKTION_CODE", "TEDRUFT").toUpperCase(),
  aktionMax: Number(env("AKTION_MAX", 20)),
  aktionBis: env("AKTION_BIS", "2026-11-30"),
  provisionProzent: Number(env("PROVISION_PROZENT", 10)),
  ustProzent: Number(env("UST_PROZENT", 19)),
  fairUseMinuten: Number(env("FAIR_USE_MINUTEN", 500)),
  extraMinuteCent: Number(env("EXTRA_MINUTE_CENT", 15)),
  garantieTage: Number(env("GARANTIE_TAGE", 30)),
  zuordnungMonate: Number(env("ZUORDNUNG_MONATE", 6)),
  nachlaufMonate: Number(env("NACHLAUF_MONATE", 3)),
  meldeTag: Number(env("MELDE_TAG", 3)),             // Buchungen des Vormonats bis zum 3. eintragen
  rechnungFaelligTage: Number(env("RECHNUNG_FAELLIG_TAGE", 14)),
  vertragVersion: "2026-10",
};

export const SECRETS = {
  stripeKey: env("STRIPE_SECRET_KEY", ""),
  stripeWebhookSecret: env("STRIPE_WEBHOOK_SECRET", ""),
  stripeApiBase: env("STRIPE_API_BASE", "https://api.stripe.com"),
  sessionSecret: env("SESSION_SECRET", "dev-secret-bitte-in-netlify-setzen"),
  adminToken: env("ADMIN_TOKEN", ""),
  tedWebhookSecret: env("TED_WEBHOOK_SECRET", ""),
  makeWebhookUrl: env("MAKE_WEBHOOK_URL", ""),
};

// Öffentlich sichtbare Werte für die Website (/api/config)
export function publicConfig() {
  const c = CFG;
  return {
    produkt: c.produkt, marke: c.marke, firma: c.firma, adresse: c.adresse, registergericht: c.registergericht,
    ustid: c.ustid, geschaeftsfuehrer: c.geschaeftsfuehrer, telefon: c.telefon, email: c.email,
    gerichtsstand: c.gerichtsstand, demoNummer: c.demoNummer, whatsapp: c.whatsapp, videoUrl: c.videoUrl,
    kaufNetto: c.kaufNetto, aktionNetto: c.aktionNetto, aktionBis: c.aktionBis,
    provisionProzent: c.provisionProzent, ustProzent: c.ustProzent, fairUseMinuten: c.fairUseMinuten,
    extraMinuteCent: c.extraMinuteCent, garantieTage: c.garantieTage, zuordnungMonate: c.zuordnungMonate,
    nachlaufMonate: c.nachlaufMonate, meldeTag: c.meldeTag, vertragVersion: c.vertragVersion,
    stripeAktiv: Boolean(SECRETS.stripeKey),
  };
}
