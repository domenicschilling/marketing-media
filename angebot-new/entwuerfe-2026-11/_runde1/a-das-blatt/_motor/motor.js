// Gemeinsamer Unterbau der Entwürfe: echte Browser-Spracherkennung + Auswertung ohne KI (kostet nichts).
// parser-lokal.js und branchen.js sind unveränderte Kopien aus apps/angebot-new (v4), nur ohne Typen.
import { lokalParsen } from "./parser-lokal.js";
import { BRANCHEN } from "./branchen.js";

export { BRANCHEN };
export const euro = (n) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });

const katalogVon = (b) => b.katalog.map(([titel, einheit, preis, beschreibung], i) => ({ id: String(i), titel, einheit, preis, beschreibung: beschreibung || "", mwst: b.mwst }));

// Der Parser sucht Namen ohne Groß-/Kleinschreibung und nimmt Folgewörter mit („Berger Wohnzimmer streichen“).
function kundeAus(text) {
  const m = text.match(/\b(?:[Ff]ür|[Aa]n)\s+(Herrn?|Frau|Familie|Firma|herrn?|frau|familie|firma)\s+([A-ZÄÖÜ][\wäöüß-]+)/);
  if (!m) return "";
  const typ = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
  return `${typ === "Herrn" ? "Herr" : typ} ${m[2]}`;
}

export function auswerten(text, brancheId = "sonstige") {
  const b = BRANCHEN.find((x) => x.id === brancheId) || BRANCHEN[BRANCHEN.length - 1];
  // Der Parser liest „zu 14 Euro“ als Gesamtpreis (35 m² zu 14 Euro → 0,40 €/m²). Gemeint ist der Einzelpreis.
  const klar = text.replace(/\bzu\s+(\d+(?:[.,]\d+)?)\s*(euro|€)/gi, "$1 Euro pro Einheit");
  const e = lokalParsen(klar, katalogVon(b), b.stundensatz);
  const positionen = e.positionen.map((p) => ({ titel: p.titel, menge: p.menge, einheit: p.einheit, preis: p.preis || 0, summe: Math.round((p.menge || 0) * (p.preis || 0) * 100) / 100 }));
  const netto = Math.round(positionen.reduce((s, p) => s + p.summe, 0) * 100) / 100;
  const ust = Math.round(netto * (b.mwst / 100) * 100) / 100;
  return { kunde: kundeAus(text), positionen, netto, mwst: b.mwst, ust, brutto: Math.round((netto + ust) * 100) / 100 };
}

// Sprache: start({ beiText(gesamt, zwischenstand), beiEnde(), beiFehler(code) }) → stop()
export const spracheMoeglich = () => typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
export function sprechen({ beiText, beiEnde, beiFehler }) {
  const K = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!K) { beiFehler?.("nicht-unterstuetzt"); return () => {}; }
  let fest = "", aktiv = true;
  const r = new K();
  r.lang = "de-DE"; r.continuous = true; r.interimResults = true;
  r.onresult = (e) => {
    let zw = "";
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) fest += (fest ? " " : "") + t.trim(); else zw += t;
    }
    beiText?.(fest, zw);
  };
  r.onerror = (e) => { if (e.error === "not-allowed" || e.error === "service-not-allowed") { aktiv = false; beiFehler?.("kein-mikrofon"); } };
  r.onend = () => { if (aktiv) { try { r.start(); } catch { aktiv = false; beiEnde?.(); } } else beiEnde?.(); };
  r.start();
  return () => { aktiv = false; r.stop(); };
}

// Geprüfte Beispiele für Tippen statt Sprechen. Summen rechnet rechne() immer selbst, nie von Hand eintragen.
export const rechne = (b) => {
  const positionen = b.positionen.map((p) => ({ ...p, summe: Math.round(p.menge * p.preis * 100) / 100 }));
  const netto = Math.round(positionen.reduce((s, p) => s + p.summe, 0) * 100) / 100;
  const ust = Math.round(netto * (b.mwst / 100) * 100) / 100;
  return { ...b, positionen, netto, ust, brutto: Math.round((netto + ust) * 100) / 100 };
};
export const BEISPIELE = [
  { id: "maler", wer: "Malerbetrieb", satz: "Für Frau Berger: Wohnzimmer streichen, 35 Quadratmeter zu 14 Euro. Dazu Abkleben pauschal 90 Euro.", kunde: "Frau Berger", mwst: 19, positionen: [{ titel: "Wohnzimmer streichen", menge: 35, einheit: "m²", preis: 14 }, { titel: "Abkleben", menge: 1, einheit: "pauschal", preis: 90 }] },
  { id: "foto", wer: "Fotografin", satz: "Für Firma Holzmann: Imagefotos, ein Tag zu 950 Euro. Bildbearbeitung, 20 Bilder zu 12 Euro.", kunde: "Firma Holzmann", mwst: 19, positionen: [{ titel: "Imagefotos", menge: 1, einheit: "Tag", preis: 950 }, { titel: "Bildbearbeitung", menge: 20, einheit: "Stk.", preis: 12 }] },
  { id: "catering", wer: "Catering", satz: "Für Familie Roth: Hochzeitsbuffet, 60 Personen zu 32 Euro. Nachtisch, 60 Personen zu 6 Euro.", kunde: "Familie Roth", mwst: 7, positionen: [{ titel: "Hochzeitsbuffet", menge: 60, einheit: "Person", preis: 32 }, { titel: "Nachtisch", menge: 60, einheit: "Person", preis: 6 }] },
  { id: "it", wer: "IT-Service", satz: "Für Firma Lang: Laptop einrichten, 4 Stück zu 85 Euro. Vor-Ort-Termin, 3 Stunden zu 95 Euro.", kunde: "Firma Lang", mwst: 19, positionen: [{ titel: "Laptop einrichten", menge: 4, einheit: "Stk.", preis: 85 }, { titel: "Vor-Ort-Termin", menge: 3, einheit: "Std.", preis: 95 }] },
  { id: "garten", wer: "Gartenbau", satz: "Für Herrn Sommer: Hecke schneiden, 25 Meter zu 18 Euro. Grünschnitt abfahren pauschal 120 Euro.", kunde: "Herr Sommer", mwst: 19, positionen: [{ titel: "Hecke schneiden", menge: 25, einheit: "lfm", preis: 18 }, { titel: "Grünschnitt abfahren", menge: 1, einheit: "pauschal", preis: 120 }] },
].map(rechne);
