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

  // Preise (Cent, netto)
  kaufNetto: Number(env("KAUF_NETTO_CENT", 129000)),
  aktionNetto: Number(env("AKTION_NETTO_CENT", 124900)),
  aktionCode: env("AKTION_CODE", "RATENJA").toUpperCase(),
  aktionMax: Number(env("AKTION_MAX", 20)),
  aktionBis: env("AKTION_BIS", "2026-11-30"),
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
  vertragVersion: "2026-10c",
  // Blatt „Deine rechtliche Lage“ und Leistungsbestätigung: Version bei inhaltlichen Änderungen hochzählen (wird mit der Zustimmung gespeichert)
  rechtVersion: "2026-10-entwurf-1",
  bestaetigungVersion: "2026-10-entwurf-1",
  // Paket „Studio“: einmalige Einrichtung + reduzierte Provision (alles inklusive). Siehe PAKETE unten.
  studioNetto: Number(env("STUDIO_NETTO_CENT", 29900)),
  studioProvisionProzent: Number(env("PROVISION_STUDIO_PROZENT", 7)),
  // Gründer-Aktion: die ersten N Studios bekommen „Studio“ ohne Einrichtungsgebühr (Gegenleistung: kurzes Erfahrungsvideo)
  gruenderMax: Number(env("GRUENDER_MAX", 10)),
  // Zahlarten im Checkout. Bewusst ohne SEPA-Lastschrift: Die kann der Kunde 8 Wochen lang ohne Grund zurückbuchen.
  zahlarten: env("ZAHLARTEN", "card,klarna").split(",").map((x) => x.trim()).filter(Boolean),
  // QR-Aufsteller aus Holz: in diesen Paketen inklusive (später z. B. "profi,studio"); alle anderen können ihn anfragen
  aufstellerPakete: env("AUFSTELLER_PAKETE", "profi").split(",").map((x) => x.trim()).filter(Boolean),
};

export const SECRETS = {
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

// Drei Pakete. „modell“ steuert die Zahlungsabwicklung:
//   provision = Tattoofin kassiert als Plattform (Express-Konto, Destination Charge, Provision wird einbehalten)
//   kauf      = eigenes Stripe-Konto des Studios (Standard, Direct Charge), keine Provision
// Paket „Studio“ (7 %): Rechnung mit den Stripe-Listenpreisen DE (stripe.com/de/pricing und /de/connect/pricing, Stand 18.10.2026):
//   Klarna ab 2,99 % + 0,35 €, ausländische Karten 3,15 % + 0,25 €, Connect „Sie übernehmen die Preisgestaltung“:
//   2 € je aktivem Konto/Monat + 0,25 % + 0,10 € je Auszahlung (+ ggf. 0,25 % Fund Routing).
//   Beispiel 1.000 € per Klarna, 1 Zahlung/Monat: Kosten ca. 37,35 € (3,7 %). 7 % brutto = 58,82 € netto → Marge ca. 2,1 %.
//   6,5 % ergäbe nur ca. 1,7 % → daher 7 % als Vorschlag. Pro Studio gespeichert (studio.provisionProzent).
export const PAKETE = {
  start: { id: "start", name: "Start", modell: "provision", einrichtungNetto: 0, provisionProzent: CFG.provisionProzent },
  studio: { id: "studio", name: "Studio", modell: "provision", einrichtungNetto: CFG.studioNetto, provisionProzent: CFG.studioProvisionProzent, empfohlen: true },
  profi: { id: "profi", name: "Profi", modell: "kauf", einrichtungNetto: CFG.kaufNetto, provisionProzent: 0 },
};

// Paket eines Studios (ältere Datensätze ohne „paket“: provision → start, kauf → profi)
export const paketVon = (s) => PAKETE[s?.paket] || (s?.modell === "kauf" ? PAKETE.profi : PAKETE.start);

// Provisionssatz eines Studios in Prozent (0 bei Kauf/Profi)
export function provisionSatz(s) {
  if (!s || s.modell !== "provision") return 0;
  return Number(s.provisionProzent ?? paketVon(s).provisionProzent ?? CFG.provisionProzent);
}

// Provision: X % vom Zahlbetrag, alles inklusive (Gebühren der Zahlungsanbieter und USt. sind enthalten).
// Beispiel Start: Kunde zahlt 3.000 € → 300 € Tattoofin (252,10 € netto + 47,90 € USt.) → 2.700 € gehen an das Studio.
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
    kaufNetto: c.kaufNetto, aktionNetto: c.aktionNetto, aktionBis: c.aktionBis,
    provisionProzent: c.provisionProzent, ustProzent: c.ustProzent, garantieTage: c.garantieTage,
    setupSupportTage: c.setupSupportTage, vertragVersion: c.vertragVersion,
    minBetragCent: c.minBetragCent, maxBetragCent: c.maxBetragCent,
    stripeAktiv: Boolean(SECRETS.stripeKey) || SIMULATION, vorschau: c.vorschau, simulation: BAUSTEINE_SIMULIERT,
    studioNetto: c.studioNetto, studioProvisionProzent: c.studioProvisionProzent, gruenderMax: c.gruenderMax,
    ruecklastGebuehrCent: c.ruecklastGebuehrCent, rechtVersion: c.rechtVersion,
    pakete: Object.values(PAKETE).map(({ id, name, modell, einrichtungNetto, provisionProzent, empfohlen }) => ({ id, name, modell, einrichtungNetto, provisionProzent, empfohlen: Boolean(empfohlen) })),
  };
}
