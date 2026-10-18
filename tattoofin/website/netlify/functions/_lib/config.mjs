// Zentrale Geschäftsdaten und Preise. Werte lassen sich über Umgebungsvariablen in Netlify überschreiben.
const env = (k, d) => (process.env[k] !== undefined && process.env[k] !== "" ? process.env[k] : d);

export const CFG = {
  siteUrl: env("SITE_URL", env("URL", "http://localhost:8888")).replace(/\/$/, ""),

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
  // 2026-10c (18.10.2026): drei Pakete Risikofrei / Monatlich / Einmalzahlung. Ältere Fassung: /vertrag-2026-10b.html
  vertragVersion: "2026-10c",
  // Zahlarten im Checkout. Bewusst ohne SEPA-Lastschrift: Die kann der Kunde 8 Wochen lang ohne Grund zurückbuchen.
  zahlarten: env("ZAHLARTEN", "card,klarna").split(",").map((x) => x.trim()).filter(Boolean),
  // QR-Aufsteller aus Holz: in diesen Paketen inklusive (digitaler QR-Code ist in allen Paketen dabei)
  aufstellerPakete: env("AUFSTELLER_PAKETE", "monatlich,einmal").split(",").map((x) => x.trim()).filter(Boolean),
};

// Drei Pakete. „modell“ steuert die Zahlungsabwicklung (unverändert):
//   provision = Tattoofin kassiert als Plattform (Express-Konto, Destination Charge, 10 % werden einbehalten)
//   kauf      = eigenes Stripe-Konto des Studios (Standard, Direct Charge), 0 % Provision, Gebühren zahlt das Studio an Stripe
// „zahlart“ beim Abschluss: provision (nichts zu zahlen) | abo (Monatlich, Stripe-Billing-Abo) | sofort/rechnung (Einmalzahlung) | geschenk
export const PAKETE = {
  risikofrei: { id: "risikofrei", name: "Risikofrei", modell: "provision", einmalNetto: 0, monatNetto: 0 },
  monatlich: { id: "monatlich", name: "Monatlich", modell: "kauf", einmalNetto: 0, monatNetto: CFG.monatNetto, empfohlen: true },
  einmal: { id: "einmal", name: "Einmalzahlung", modell: "kauf", einmalNetto: CFG.kaufNetto, monatNetto: 0 },
};
// URL-/Formular-Aliase: ?modell=provision → Risikofrei, ?modell=kauf → Einmalzahlung
export const PAKET_ALIAS = { provision: "risikofrei", kauf: "einmal", risikofrei: "risikofrei", monatlich: "monatlich", einmal: "einmal", einmalzahlung: "einmal" };
// Paket eines Studios. Ältere Datensätze ohne „paket“: provision → Risikofrei, kauf → Einmalzahlung (Altvertrag „Kauf“).
export function paketVon(s) {
  if (s?.zahlart === "geschenk") return { id: "geschenk", name: "Geschenk (eigenes Konto)", modell: "kauf", einmalNetto: 0, monatNetto: 0 };
  return PAKETE[s?.paket] || (s?.modell === "kauf" ? PAKETE.einmal : PAKETE.risikofrei);
}
export const aufstellerInklusive = (s) => CFG.aufstellerPakete.includes(paketVon(s).id);

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
    kaufNetto: c.kaufNetto, monatNetto: c.monatNetto, nutzungJahre: c.nutzungJahre, aufstellerPakete: c.aufstellerPakete,
    pakete: Object.values(PAKETE).map(({ id, name, modell, einmalNetto, monatNetto, empfohlen }) => ({ id, name, modell, einmalNetto, monatNetto, empfohlen: Boolean(empfohlen) })),
    provisionProzent: c.provisionProzent, ustProzent: c.ustProzent, garantieTage: c.garantieTage,
    setupSupportTage: c.setupSupportTage, vertragVersion: c.vertragVersion,
    minBetragCent: c.minBetragCent, maxBetragCent: c.maxBetragCent,
    stripeAktiv: Boolean(SECRETS.stripeKey),
  };
}
