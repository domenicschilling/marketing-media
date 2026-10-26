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
  telefon: env("KONTAKT_TELEFON", "0162 4502375"),
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
  // 2026-11 (27.10.2026): Rechtsprüfung Kreditrecht (keine Rechtsbehauptung „kein Kreditvermittler“, Klarna im Paket Risikofrei ab 20.11.2026
  // nicht mehr, Hinweis „Achtung! Kreditaufnahme kostet Geld.“ in der Studio-Werbung). Ältere Fassungen (archiviert, nie rückwirkend ändern):
  // /vertrag-2026-10d.html, /vertrag-2026-10c.html, /vertrag-2026-10b.html
  vertragVersion: "2026-11",
  // Blatt „Deine rechtliche Lage“ und Leistungsbestätigung: Version bei inhaltlichen Änderungen hochzählen (wird mit der Zustimmung gespeichert)
  rechtVersion: "2026-11",
  bestaetigungVersion: "2026-10b",
  // Zahlarten im Checkout. Bewusst ohne SEPA-Lastschrift: Die kann der Kunde 8 Wochen lang ohne Grund zurückbuchen.
  zahlarten: env("ZAHLARTEN", "card,klarna").split(",").map((x) => x.trim()).filter(Boolean),
  // QR-Aufsteller aus Holz: in diesen Paketen inklusive (digitaler QR-Code ist in allen Paketen dabei); andere können ihn anfragen
  aufstellerPakete: env("AUFSTELLER_PAKETE", "monatlich,einmal").split(",").map((x) => x.trim()).filter(Boolean),
  // QR-Aufsteller einzeln (Pakete ohne Aufsteller, z. B. Risikofrei): Preis netto zzgl. USt., Kauf per Stripe-Checkout (DSX-Konto)
  aufstellerPreisNetto: Number(env("AUFSTELLER_PREIS_NETTO_CENT", 2900)),
};

export const SECRETS = {
  stripeKey: STRIPE_KEY,
  stripeWebhookSecret: env("STRIPE_WEBHOOK_SECRET", ""),
  stripeConnectWebhookSecret: env("STRIPE_CONNECT_WEBHOOK_SECRET", ""),
  stripeApiBase: env("STRIPE_API_BASE", "https://api.stripe.com"),
  sessionSecret: env("SESSION_SECRET", "dev-secret-bitte-in-netlify-setzen"),
  adminToken: env("ADMIN_TOKEN", ""),
};

// ---------------------------------------------------------------------------------------------------------------------
// Klarna im Plattform-Modell (Rechtsprüfung 27.10.2026, Entscheidung Inhaber): Ab 20.11.2026 gilt in Deutschland das neue
// Verbraucherkreditrecht (Klarna-Raten = Verbraucherkredit). Klarna gibt es dann nur noch dort, wo das Geld der Kunden NICHT
// über das Plattformkonto von Tattoofin läuft:
//   Monatlich / Einmalzahlung / Einladung = Standard-Konto des Studios (Direct Charge)  → Klarna bleibt
//   Risikofrei = Destination Charge über das Plattformkonto                              → Klarna endet am Stichtag
// Ausnahme: RISIKOFREI_DIRECT=1 (Risikofrei als Direct Charge auf dem Studio-Konto, Standard AUS) → Klarna bleibt auch dort.
// Steuerung zentral hier:  KLARNA_PLATTFORM_BIS=2026-11-20  (Datum, ab 00:00 Uhr deutscher Zeit ohne Klarna)
//                          KLARNA_PLATTFORM_BIS=nie         (Schalter aus: Klarna bleibt für alle Pakete)
// Zeit-Override nur für Tests: TF_JETZT=2026-11-20T00:00:00+01:00
export const KLARNA_PLATTFORM_BIS_STANDARD = "2026-11-20";
// Mitternacht (00:00) eines Kalendertags „JJJJ-MM-TT“ in Europe/Berlin als Zeitpunkt (ms seit 1970), Sommer-/Winterzeit-fest
export function berlinMitternacht(tag) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(tag || "").trim());
  if (!m) return null;
  const utc = Date.UTC(+m[1], +m[2] - 1, +m[3]);
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Berlin", hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" });
  const versatz = (t) => { const g = Object.fromEntries(fmt.formatToParts(new Date(t)).map((x) => [x.type, +x.value])); return Date.UTC(g.year, g.month - 1, g.day, g.hour, g.minute, g.second) - t; };
  let t = utc - versatz(utc);
  t = utc - versatz(t);
  return t;
}
// Stichtag als Zeitpunkt (ms) oder null (= nie). Wird bei jedem Aufruf gelesen, damit Umgebungsvariable und Tests wirken.
export function klarnaPlattformStichtag() {
  const e = process.env.KLARNA_PLATTFORM_BIS;
  const roh = String(e === undefined || e === "" ? KLARNA_PLATTFORM_BIS_STANDARD : e).trim().toLowerCase();
  if (["nie", "aus", "0", "off", "false"].includes(roh)) return null;
  return berlinMitternacht(roh) ?? berlinMitternacht(KLARNA_PLATTFORM_BIS_STANDARD);
}
export const jetzt = () => { const o = process.env.TF_JETZT; const d = o ? new Date(o) : null; return d && !isNaN(d) ? d : new Date(); };
// Risikofrei als Direct Charge (Geld läuft nie über das Plattformkonto). Standard AUS, nur nach Stripe-Test aktivieren.
export const risikofreiDirect = () => ["1", "an", "true", "ja"].includes(String(process.env.RISIKOFREI_DIRECT || "").trim().toLowerCase());
// Ist Klarna im Plattform-Modell zu diesem Zeitpunkt abgeschaltet? (Direct-Schalter an → nie)
export function klarnaPlattformAus(zeit = jetzt()) {
  if (risikofreiDirect()) return false;
  const st = klarnaPlattformStichtag();
  return st !== null && new Date(zeit).getTime() >= st;
}

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
    // Klarna im Paket Risikofrei: Zeitpunkt (ISO) ab dem es dort nicht mehr angeboten wird (null = nie) + Direct-Schalter.
    // Die Seiten rechnen selbst gegen die Uhr des Besuchers, damit der Stichtag auch bei zwischengespeicherter Antwort stimmt.
    klarnaPlattformBis: klarnaPlattformStichtag() === null || risikofreiDirect() ? null : new Date(klarnaPlattformStichtag()).toISOString(),
    klarnaPlattformAus: klarnaPlattformAus(),
  };
}
