// Auswertung der Vor-Ort-Besuche Bamberg: Zusagen und Zahlungen getrennt nach entwurf_zeitpunkt (vorher/nachher).
// Nur lesend, keine Abhängigkeiten. Aufruf aus dem Worktree:
//   node content/gastrosite/vor-ort-bamberg/_auswertung-besuche.mjs [pfad/zur/besuche.csv]
import { readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ORDNER = dirname(fileURLToPath(import.meta.url));
const DATEI = process.argv[2] || join(ORDNER, 'besuche.csv');
const SPALTEN = ['restaurant', 'uhrzeit', 'ansprechperson', 'entwurf_zeitpunkt', 'ergebnis', 'einwand',
  'whatsapp_einwilligung', 'rueckruf_termin', 'bezahlt', 'betrag_netto'];
const ZEITPUNKTE = ['vorher', 'nachher'];
const ERGEBNISSE = ['ja', 'nein', 'spaeter'];
const JA = new Set(['ja', 'j', 'x', '1', 'true']);

// CSV mit Anführungszeichen; Komma oder Semikolon als Trenner (Handy-Apps speichern teils mit Semikolon).
function leseCsv(text) {
  text = text.replace(/^﻿/, '');
  const trenner = text.split(/\r?\n/)[0].includes(';') ? ';' : ',';
  const zeilen = [];
  let zeile = [], feld = '', inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"' && text[i + 1] === '"') { feld += '"'; i++; }
      else if (c === '"') inQuote = false;
      else feld += c;
    } else if (c === '"') inQuote = true;
    else if (c === trenner) { zeile.push(feld); feld = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      zeile.push(feld); zeilen.push(zeile); zeile = []; feld = '';
    } else feld += c;
  }
  if (feld || zeile.length) { zeile.push(feld); zeilen.push(zeile); }
  return zeilen.filter((z) => z.some((f) => f.trim()));
}

const norm = (s) => (s || '').trim().toLowerCase().replace(/ä/g, 'ae');
// „249“, „249,00“, „1.249,50 €“ → Zahl; leer → 0; Unsinn → NaN
const betrag = (s) => {
  const t = (s || '').replace(/[€\s]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  return t ? Number(t) : 0;
};
const euro = (n) => n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
const quote = (a, b) => (b ? `${Math.round((a / b) * 100)} %` : '–');

const [kopf, ...daten] = leseCsv(readFileSync(DATEI, 'utf8'));
const idx = Object.fromEntries(kopf.map((k, i) => [k.trim().toLowerCase(), i]));
const fehlend = SPALTEN.filter((s) => !(s in idx));
if (fehlend.length) {
  console.error(`Spalten fehlen in ${DATEI}: ${fehlend.join(', ')}`);
  process.exit(1);
}

const warnungen = [];
const leer = () => ({ besuche: 0, ja: 0, nein: 0, spaeter: 0, bezahlt: 0, summe: 0, whatsapp: 0, rueckruf: 0, einwaende: [] });
const gruppen = { vorher: leer(), nachher: leer() };
let offen = 0;

daten.forEach((z, n) => {
  const wert = (s) => (z[idx[s]] || '').trim();
  const name = wert('restaurant') || `Zeile ${n + 2}`;
  const zp = norm(wert('entwurf_zeitpunkt'));
  const erg = norm(wert('ergebnis'));
  if (!erg) { offen++; return; }
  if (!ZEITPUNKTE.includes(zp)) { warnungen.push(`${name}: entwurf_zeitpunkt „${wert('entwurf_zeitpunkt')}“ (erlaubt: vorher|nachher) – nicht gezählt`); return; }
  if (!ERGEBNISSE.includes(erg)) { warnungen.push(`${name}: ergebnis „${wert('ergebnis')}“ (erlaubt: ja|nein|spaeter) – nicht gezählt`); return; }
  const g = gruppen[zp];
  g.besuche++;
  g[erg]++;
  if (JA.has(norm(wert('whatsapp_einwilligung')))) g.whatsapp++;
  if (wert('rueckruf_termin')) g.rueckruf++;
  if (wert('einwand')) g.einwaende.push(`${name}: ${wert('einwand')}`);
  const b = betrag(wert('betrag_netto'));
  if (Number.isNaN(b)) warnungen.push(`${name}: betrag_netto „${wert('betrag_netto')}“ ist keine Zahl`);
  if (JA.has(norm(wert('bezahlt')))) {
    g.bezahlt++;
    if (!Number.isNaN(b)) g.summe += b;
    if (erg !== 'ja') warnungen.push(`${name}: bezahlt = ja, aber ergebnis = ${erg}`);
    if (!b) warnungen.push(`${name}: bezahlt = ja, aber kein betrag_netto`);
  }
});

console.log(`Auswertung Vor-Ort-Besuche Bamberg (${basename(DATEI)})\n`);
for (const zp of ZEITPUNKTE) {
  const g = gruppen[zp];
  console.log(`Entwurf ${zp.toUpperCase()}`);
  console.log(`  Besuche mit Ergebnis:  ${g.besuche}`);
  console.log(`  Zusagen (ja):          ${g.ja}  (${quote(g.ja, g.besuche)} der Besuche)`);
  console.log(`  Später:                ${g.spaeter}`);
  console.log(`  Absagen (nein):        ${g.nein}`);
  console.log(`  Bezahlt:               ${g.bezahlt}  (${quote(g.bezahlt, g.besuche)} der Besuche)`);
  console.log(`  Summe netto bezahlt:   ${euro(g.summe)}`);
  console.log(`  WhatsApp-Einwilligung: ${g.whatsapp} · Rückruf-Termine: ${g.rueckruf}`);
  if (g.einwaende.length) console.log(`  Einwände:\n    - ${g.einwaende.join('\n    - ')}`);
  console.log('');
}
const v = gruppen.vorher, na = gruppen.nachher;
console.log(`Vergleich: Zusagen vorher ${quote(v.ja, v.besuche)} vs. nachher ${quote(na.ja, na.besuche)} · Bezahlt vorher ${v.bezahlt} vs. nachher ${na.bezahlt}`);
console.log(`Noch ohne Ergebnis: ${offen} Zeile(n)`);
if (v.besuche + na.besuche < 20) console.log('Hinweis: Wenige Besuche – das ist ein erstes Gefühl, kein belastbarer Beweis.');
if (warnungen.length) console.log(`\nBitte prüfen:\n  - ${warnungen.join('\n  - ')}`);
