// Werbung und Hilfe für die Tattoofin-App (GET /api/app/werbung, GET /api/app/aufsteller) – seit 14.11.2026.
// Texte der Beiträge und des Werbevideos kommen aus public/js/werbung-texte.js: dieselbe Datei nutzt das Dashboard im Browser,
// damit Web und App nie auseinanderlaufen. Klarna-Wortlaut aus _lib/klarna-texte.mjs (gleich mit public/js/klarna-texte.js, e2e prüft das).
// Klarna/Raten-Material (Video sagt „in Raten“, Beiträge „Mit Klarna bezahlen“, Druckmaterial „Ratenzahlung möglich*“) nur, wenn das
// Studio Klarna dauerhaft anbietet (klarnaDauerhaft: alle Studios mit eigenem Stripe-Konto inkl. Apple-Abo; nicht Risikofrei über das
// Plattformkonto ab dem Stichtag; nicht, wenn ZAHLARTEN ohne klarna). Gutscheine kommen hier nie vor.
// Apple 3.1.1/3.1.3: keine Paket-, Website- oder Abo-Preise in den Antworten für die App. Einziger Preis: der QR-Aufsteller (körperliche Ware).
import "../../../public/js/werbung-texte.js";
import { CFG, paketVon } from "./config.mjs";
import { euro, brutto } from "./util.mjs";
import { klarnaDauerhaft } from "./domain.mjs";
import { KLARNA_NAME, KLARNA_ZUSATZ_STUDIO, KLARNA_WARNSATZ, PFLICHTSATZ } from "./klarna-texte.mjs";
import { zahlseite } from "./studio-ansicht.mjs";

const W = globalThis.TF_WERBUNG;
// Gleiche Form wie window.TF_KLARNA im Browser (nur was werbung-texte.js braucht)
const K = { NAME: KLARNA_NAME, ZUSATZ_STUDIO: KLARNA_ZUSATZ_STUDIO, WARNSATZ: KLARNA_WARNSATZ };
export const werbungTexte = W;
export const KLARNA_FUER_WERBUNG = K;

// Erklärvideo „So geht's“ (gleiche Kapitel wie public/js/so-gehts.js; app-api prüft den Gleichstand). Das Kapitel
// „App auf den Startbildschirm“ (Web-App-Installation, 120,8–135,9 s) gibt es in der iPhone-App nicht → weggelassen.
export const SO_GEHTS = {
  version: "2026-10-18", dauer: 147.73,
  hoch: { pfad: "/assets/app/hilfe/so-gehts-9x16.mp4", poster: "/assets/app/hilfe/so-gehts-9x16.jpg", breite: 720, hoehe: 1280 },
  quer: { pfad: "/assets/app/hilfe/so-gehts-16x9.mp4", poster: "/assets/app/hilfe/so-gehts-16x9.jpg", breite: 1280, hoehe: 720 },
  kapitel: [
    { ab: 0, name: "Übersicht und Einrichtung" },
    { ab: 22.6, name: "Zahlungslink erstellen" },
    { ab: 53.7, name: "Was dein Kunde sieht" },
    { ab: 67.2, name: "Zahlungen und Nachweise" },
    { ab: 80.3, name: "Nach dem Termin" },
    { ab: 94.1, name: "Dein Geld" },
    { ab: 101.1, name: "Werbung" },
    { ab: 114.1, name: "Deine rechtliche Lage" },
    { ab: 120.8, name: "App auf den Startbildschirm", nurWeb: true },
    { ab: 135.9, name: "Hilfe per WhatsApp" },
  ],
};

// Druckvorlagen aus dem Studio Kit (HTML-Seiten zum Drucken, mit Studioname und QR der Zahlseite). Gleiche Liste wie GET /api/portal.
export function materialLinks(s) {
  const q = `studio=${encodeURIComponent(s.firma)}&tel=${encodeURIComponent(s.studioTelefon || "")}&zahlen=${encodeURIComponent(zahlseite(s))}`;
  return [
    ["20-fensteraufkleber", "Fensteraufkleber"], ["21-flyer-a6", "Flyer A6"], ["22-thekenaufsteller-a5", "Thekenaufsteller A5"],
    ["23-kundeninfo", "Kundeninfo"], ["24-social-kit", "Social-Kit (Story, Post, Badge)"],
  ].map(([n, titel]) => ({ name: n, titel, url: `${CFG.materialsUrl}${n}.html?${q}` }));
}

// Klarna-/Raten-Material für dieses Studio? (gleiche Regel wie data-klarna-dauer im Dashboard)
export const werbungMitKlarna = (s) => Boolean(klarnaDauerhaft(s));

export function werbungFuer(s) {
  const klarna = werbungMitKlarna(s);
  const k = { firma: s.firma, ort: s.ort || "", zahlseite: zahlseite(s) };
  const abs = (p) => CFG.siteUrl + p;
  const beitraege = klarna ? W.vorlagen(K).map((v) => ({
    id: v.id, titel: v.titel, format: v.format, art: v.art, wofuer: v.wofuer, seiten: v.seiten,
    // kopieren: text = ganzer Posting-Text, link = nur der Link (Link-Sticker), sticker = Text für den Fragen-Sticker
    kopieren: v.kopieren || "text", text: v.text(k),
    breite: 1080, hoehe: v.art === "story" ? 1920 : 1350,
  })) : [];
  return {
    klarna,
    // klein, aber lesbar, überall in der App, wo Raten vorkommt (Video, Beiträge, Druckmaterial, Aufsteller)
    fussnote: klarna ? PFLICHTSATZ : null,
    studio: { firma: s.firma, ort: s.ort || "", zahlseite: k.zahlseite },
    zahlseite: k.zahlseite,
    hashtags: W.hashtags(k),
    // Werbevideo: sagt „in Raten“ → nur mit Klarna
    video: klarna ? {
      formate: W.VIDEO.formate.map((f) => ({ id: f.id, titel: f.titel, url: abs(f.datei), cover: abs(f.cover), breite: f.breite, hoehe: f.hoehe, dauer: f.dauer, dateiname: W.VIDEO.dateiname(f.id) })),
      text: W.videoText(K),
    } : null,
    beitraege,
    // Druckvorlagen sagen „Ratenzahlung möglich*“ → nur mit Klarna
    materialLinks: klarna ? materialLinks(s) : [],
    soGehts: {
      url: abs(SO_GEHTS.hoch.pfad), poster: abs(SO_GEHTS.hoch.poster), breite: SO_GEHTS.hoch.breite, hoehe: SO_GEHTS.hoch.hoehe,
      quer: { url: abs(SO_GEHTS.quer.pfad), poster: abs(SO_GEHTS.quer.poster), breite: SO_GEHTS.quer.breite, hoehe: SO_GEHTS.quer.hoehe },
      dauer: SO_GEHTS.dauer,
      kapitel: SO_GEHTS.kapitel.filter((x) => !x.nurWeb).map((x) => ({ ab: x.ab, name: x.name })),
      // Steht so auch unter dem Video im Dashboard (das Video zeigt die Fußnote selbst)
      hinweis: "Stimme mit KI erstellt · App-Bilder: Beispiel-Studio mit Testdaten",
      fussnote: PFLICHTSATZ,
    },
    hilfe: { whatsapp: "https://wa.me/491624502375", telefon: "0162 4502375", text: "Fragen? Schreib unserem Team per WhatsApp." },
  };
}

// QR-Aufsteller in der App: nur Artikel + Preis des Aufstellers (körperliche Ware, Apple 3.1.3(e)). Kein Paket, kein Abo, keine Website.
export const AUFSTELLER_ARTIKEL = "QR-Aufsteller aus Holz";
export async function aufstellerFuerApp(s, { mitLogo = false, store } = {}) {
  const a = s.aufsteller || {};
  const kostenlos = CFG.aufstellerPakete.includes(paketVon(s).id);
  const netto = CFG.aufstellerPreisNetto, gesamt = brutto(netto);
  const bezahltAm = a.kauf?.bezahltAm || null, angefordertAm = a.angefordertAm || null;
  const status = bezahltAm ? "bezahlt" : angefordertAm ? "bestellt" : a.kauf?.csId ? "zahlung_offen" : "offen";
  const logo = mitLogo && a.hatLogo && store ? await store.get("aufsteller-logo/" + s.id) : null;
  const klarna = werbungMitKlarna(s);
  return {
    artikel: AUFSTELLER_ARTIKEL,
    beschreibung: "Aus Holz, graviert mit dem QR-Code deiner Zahlseite und deinem Studionamen oder Logo. Wir schicken ihn an deine Studio-Adresse.",
    kostenlos,
    preis: kostenlos ? null : { nettoCent: netto, gesamtCent: gesamt, ustProzent: CFG.ustProzent, text: `${euro(netto)} + ${CFG.ustProzent} % MwSt. = ${euro(gesamt)}` },
    preisText: kostenlos ? "Für dich kostenlos" : `${euro(gesamt)} inkl. MwSt.`,
    knopf: kostenlos ? "Kostenlos bestellen" : `Für ${euro(gesamt)} bestellen`,
    bezahlenHinweis: kostenlos ? null : "Du bezahlst sicher bei Stripe. Danach geht es zurück in die App. Die Rechnung kommt per E-Mail.",
    holz: a.holz || "hell", variante: logo || a.hatLogo ? a.variante || "name" : "name", hatLogo: Boolean(a.hatLogo),
    holzHinweis: {
      hell: "Helles Holz (Birke, Buche, Ahorn) hat den besten Kontrast. Der QR-Code lässt sich auch aus über 1 m scannen.",
      dunkel: "Dunkles Holz (Walnuss) sieht edel aus. Der QR-Code hat aber weniger Kontrast (sicher bis etwa 80 cm).",
    },
    status, bestelltAm: angefordertAm, bezahltAm,
    statusText: bezahltAm ? "Bestellt und bezahlt. Wir lassen ihn fertigen und melden uns." : angefordertAm ? "Bestellt. Wir lassen ihn fertigen und melden uns." : null,
    lieferadresse: [s.firma, s.strasse, [s.plz, s.ort].filter(Boolean).join(" ")].filter(Boolean).join(", "),
    // Für die Vorschau (gleiche Daten wie die Gravur): Name, Link der Zahlseite, Klarna-Zeile nur bei klarnaDauerhaft
    firma: s.firma, zahlseite: zahlseite(s), klarna, fussnote: klarna ? PFLICHTSATZ : null,
    ...(mitLogo ? { logo: logo ? { src: logo.src, w: logo.w, h: logo.h } : null } : {}),
  };
}
