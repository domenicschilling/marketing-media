// Ausgabe von Studio und Zahlungen an das Studio selbst (Dashboard /api/portal und App /api/app). Ohne interne Werte.
import { CFG, provisionSatz, paketVon, aufstellerInklusive, BAUSTEINE_SIMULIERT, istApple, appleCfg, sandboxKasse, testKasse } from "./config.mjs";
import { hatUmstellungsangebot, connectUrl, darfKassieren, anzahlungsbedingungen, eingebettet, klarnaFuer, klarnaDauerhaft, STATUS, hatGarantie } from "./domain.mjs";
import { gutscheinStatus, gutscheinUrl } from "./gutschein.mjs";

export const zahlseite = (s) => `${CFG.siteUrl}/zahlen/${s.slug}`;
// Zahlung für die Ausgabe an das Studio (ohne interne Werte wie den Client-Schlüssel des Bezahlfelds, IP/Browser des Kunden)
export const fuerStudio = (z) => {
  const { clientSecret, betragFuerPi, leistungToken, ...rest } = z;
  if (rest.kundeBestaetigt) rest.kundeBestaetigt = { am: rest.kundeBestaetigt.am, inhalt: rest.kundeBestaetigt.inhalt, version: rest.kundeBestaetigt.version };
  if (leistungToken) rest.leistungLink = `${CFG.siteUrl}/bestaetigung.html?t=${leistungToken.t}`;
  if (rest.gutschein) {
    const { token, ...g } = rest.gutschein;
    rest.gutschein = { ...g, status: gutscheinStatus(z), link: token ? gutscheinUrl(rest.gutschein) : null };
  }
  return rest;
};
// Demo-Studio (App-Prüfung bei Apple): Stripe gilt als fertig eingerichtet (passt zu den Beispiel-Auszahlungen), keine Einrichtung
// über Stripe (connectUrl null; connect.mjs lehnt Demo-Studios ab). Es fließt nie Geld (pay.mjs sperrt Demo-Studios).
// Apple-Abo für die App (AppleAbo in der Spezifikation). appAccountToken braucht die App für „Abo wieder abschließen“.
// sandbox = Testkauf (Umgebung nicht Production), bei dem die Stripe-Einrichtung aus ist. Mit APPLE_SANDBOX_STRIPE=1 (z. B. lokal im
// Simulator, dev/app-lokal.mjs) ist sie an → sandbox false, damit die App den Knopf „Stripe-Konto einrichten“ zeigt.
export const appleAboAusgabe = (s) => (istApple(s) && s.apple ? {
  status: s.apple.status, laeuftBis: s.apple.laeuftBis || null,
  autoVerlaengerung: typeof s.apple.autoVerlaengerung === "boolean" ? s.apple.autoVerlaengerung : null,
  sandbox: s.apple.umgebung !== "Production" && !appleCfg().sandboxStripe, produktId: s.apple.produktId, appAccountToken: String(s.apple.appAccountToken || "").toLowerCase(),
} : null);
// Wie zahlt das Studio sein Tattoofin-Paket? apple = App Store, keine = Geschenk/Demo, sonst stripe (Abo, Einmalzahlung, Provision)
export const abrechnungVon = (s) => (istApple(s) ? "apple" : s.demo || s.zahlart === "geschenk" ? "keine" : "stripe");
const DEMO_STRIPE = { klarnaAktiv: false, verbunden: true, freigegeben: true, auszahlungen: true, express: false, angabenGemacht: true, kontoTyp: "standard" };
export const oeffentlich = (s) => ({
  id: s.id, firma: s.firma, inhaber: s.inhaber, email: s.email, telefon: s.telefon, studioTelefon: s.studioTelefon,
  strasse: s.strasse, plz: s.plz, ort: s.ort, modell: s.modell, zahlart: s.zahlart, preisNetto: s.preisNetto, slug: s.slug,
  status: s.status, statusText: STATUS[s.status] || s.status, createdAt: s.createdAt, goLiveAt: s.goLiveAt,
  vertrag: { version: s.vertrag?.version, akzeptiertAm: s.vertrag?.akzeptiertAm, name: s.vertrag?.name },
  kuendigung: s.kuendigung || null, loeschAnfrage: s.loeschAnfrage ? { am: s.loeschAnfrage.am, durch: s.loeschAnfrage.durch } : null, fragebogenAm: s.fragebogen?.updatedAt || null,
  benachrichtigung: { email: s.benachrichtigungEmail || s.email },
  garantieBis: hatGarantie(s) ? (s.goLiveAt ? new Date(new Date(s.goLiveAt).getTime() + CFG.garantieTage * 864e5).toISOString() : "ab Go-live") : null,
  demo: Boolean(s.demo),
  // Testkauf (Apple-Sandbox, auch App Review): Kasse im Testmodus, „Testzahlung auslösen“ wie im Demo-Studio, keine Stripe-Einrichtung
  testmodus: sandboxKasse(s),
  abrechnung: abrechnungVon(s), apple: appleAboAusgabe(s),
  stripe: s.demo ? DEMO_STRIPE : { klarnaAktiv: s.stripe?.klarnaAktiv, verbunden: Boolean(s.stripe?.accountId), freigegeben: Boolean(s.stripe?.chargesEnabled), auszahlungen: Boolean(s.stripe?.payoutsEnabled), express: s.stripe?.kontoTyp === "express", angabenGemacht: Boolean(s.stripe?.detailsSubmitted), kontoTyp: s.stripe?.kontoTyp || (s.modell === "provision" ? "express" : "standard") },
  klarna: klarnaFuer(s), klarnaDauerhaft: klarnaDauerhaft(s),
  paket: paketVon(s).id, paketName: paketVon(s).name, provisionProzent: provisionSatz(s), monatNetto: s.monatNetto || null, aufstellerInklusive: aufstellerInklusive(s),
  recht: s.recht ? { version: s.recht.version, am: s.recht.am, aktuell: s.recht.version === CFG.rechtVersion } : null,
  checkliste: s.checkliste || {}, extrasAngefragt: Object.keys(s.extras || {}), eingebettet: eingebettet(), simulation: BAUSTEINE_SIMULIERT,
  anzahlungsbedingungen: anzahlungsbedingungen(s),
  ausweichAnzahlung: { an: Boolean(s.ausweichAnzahlung?.an), prozent: s.ausweichAnzahlung?.prozent || 30 },
  zahlartenHinweis: Boolean(s.zahlartenHinweis),
  umstellungAngebot: hatUmstellungsangebot(s) ? { monatNetto: s.umstellung.monatNetto } : null,
  altKonto: s.stripe?.altKonto ? { bis: s.stripe.altKonto.bis } : null,
  kannKassieren: Boolean(darfKassieren(s)), zahlseite: zahlseite(s), connectUrl: testKasse(s) ? null : connectUrl(s),
  aufsteller: { inklusive: CFG.aufstellerPakete.includes(paketVon(s).id), holz: s.aufsteller?.holz || "hell", variante: s.aufsteller?.variante || "name", hatLogo: Boolean(s.aufsteller?.hatLogo), angefordertAm: s.aufsteller?.angefordertAm || null, preisNetto: CFG.aufstellerPreisNetto, bezahltAm: s.aufsteller?.kauf?.bezahltAm || null },
});
