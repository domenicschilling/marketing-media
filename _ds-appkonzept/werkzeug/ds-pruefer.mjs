#!/usr/bin/env node
// DS-Prüfer: liest den Swift-Code einer App und zählt typische Schwächen (DS APPKonzept, Schritt 1 und 5).
// Nur lesen, ändert nichts. Aufruf:
//   node content/_ds-appkonzept/werkzeug/ds-pruefer.mjs <app-quellordner> [--json] [--alle]
// <app-quellordner> = Ordner mit den Swift-Quellen (z. B. tattoofin/ios/Tattoofin).
// Ohne --alle werden je Regel höchstens 5 Fundstellen gezeigt.
//
// Ausnahme mit Begründung: `// ds-ok: <Grund>` an die Zeile schreiben (wird gezählt, nicht gemeldet).
// Ergebnis: "Fehler" (vor Abgabe beheben oder begründen) und "Hinweis" (jede Stelle ansehen).
// Exit-Code 1, wenn Fehler-Regeln anschlagen.
// Grenzen: zeilenweise Muster, kein Swift-Parser. Aufrufe über mehrere Zeilen werden teils übersehen.
// Selbsttest: node content/_ds-appkonzept/werkzeug/test/pruefer.test.mjs

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// Jede Regel prüft entweder `code` (Strings geleert, Kommentare weg) oder `roh` (nur Kommentare weg).
// `zahl` = Funktion, die aus einem Treffer prüft, ob er zählt (z. B. Abstand 0 ist erlaubt).
export const REGELN = [
  // ---------- Fehler ----------
  {
    id: 'feste-schrift', stufe: 'fehler',
    text: 'Feste Schriftgröße (wächst nicht mit Dynamic Type)',
    muster: /\bsystem\(\s*size:\s*\d|UIFont\.systemFont\(\s*ofSize:\s*\d|\.custom\(\s*""\s*,\s*(size:\s*\d|fixedSize:)/,
    ausser: /relativeTo:/, ref: '05-gestaltung.md, Schrift',
  },
  { id: 'navigationview', stufe: 'fehler', text: 'Veraltetes NavigationView (NavigationStack nutzen)', muster: /\bNavigationView\s*\{/, ref: '08-technik.md' },
  { id: 'uiscreen-main', stufe: 'fehler', text: 'UIScreen.main (veraltet, bricht bei Split View/neuen Geräten)', muster: /\bUIScreen\.main\b/, ref: '08-technik.md' },
  {
    id: 'geheimnis-unsicher', stufe: 'fehler', quelle: 'roh',
    text: 'Zugangsdaten in UserDefaults/AppStorage (gehört in den Schlüsselbund)',
    muster: /@AppStorage\(\s*"[^"]*(token|passwort|password|secret|jwt|api_?key|bearer|sitzung|session)[^"]*"|UserDefaults[^\n]*\.set\([^)]*\b(token|passwort|password|secret|jwt|apiKey|bearer)\b/i,
    ref: '08-technik.md, Sicherheit',
  },
  { id: 'try-ausrufezeichen', stufe: 'fehler', text: '`try!` (Absturz statt Fehlermeldung)', muster: /\btry!\s/, ref: '04-bildschirme.md, Zustände' },

  // ---------- Hinweise ----------
  { id: 'schrift-variabel', stufe: 'hinweis', text: 'Schriftgröße aus Variable: ist sie @ScaledMetric?', muster: /\bsystem\(\s*size:\s*[A-Za-z_]/, ausser: /relativeTo:/, ref: '05-gestaltung.md, Schrift' },
  { id: 'schrift-deckel', stufe: 'hinweis', text: 'Dynamic Type gedeckelt (nur mit Begründung im Brief)', muster: /\.dynamicTypeSize\(\s*(\.\.\.|\.\.<)/, ref: '07-barrierefreiheit.md' },
  { id: 'schrift-verkleinert', stufe: 'hinweis', text: 'minimumScaleFactor (Text schrumpft statt umzubrechen)', muster: /\.minimumScaleFactor\(/, ref: '07-barrierefreiheit.md' },
  { id: 'caption2', stufe: 'hinweis', text: '.caption2 (zu klein, kleinste DS-Größe ist .footnote)', muster: /\.caption2\b/, ref: '05-gestaltung.md, Schrift' },
  { id: 'try-fragezeichen', stufe: 'hinweis', text: '`try?` verschluckt Fehler (Nutzer sieht leer statt Fehlermeldung)', muster: /\btry\?\s/, ausser: /Task\.sleep/, ref: '04-bildschirme.md, Zustände' },
  {
    id: 'zahl-abstand', stufe: 'hinweis', text: 'Abstand als Zahl statt DSAbstand',
    muster: /\.padding\(\s*(?:\[[^\]]*\]\s*,\s*|\.[a-zA-Z]+\s*,\s*)?(\d+(?:\.\d+)?)\s*\)|spacing:\s*(\d+(?:\.\d+)?)|EdgeInsets\([^)]*\d/g,
    zahl: (m) => { const w = m[1] ?? m[2]; return w === undefined || Number(w) !== 0; },
    ref: '05-gestaltung.md, Werte-Tabelle',
  },
  { id: 'zahl-radius', stufe: 'hinweis', text: 'Eckenradius als Zahl statt DSRadius', muster: /cornerRadius(?::|\()\s*\d/, ref: '05-gestaltung.md, Werte-Tabelle' },
  { id: 'zahl-groesse', stufe: 'hinweis', text: 'Feste Breite/Höhe (bei großer Schrift prüfen)', muster: /\.frame\([^)]*\b(width|height):\s*\d/, ref: '07-barrierefreiheit.md' },
  { id: 'ontapgesture', stufe: 'hinweis', text: 'onTapGesture statt Button (VoiceOver erkennt keinen Knopf)', muster: /\.onTapGesture\s*(\(|\{)/, ref: '07-barrierefreiheit.md' },
  { id: 'text-deckkraft', stufe: 'hinweis', text: 'Deckkraft an Text/Vordergrund (Kontrast ungeprüft)', muster: /\.foreground(Style|Color)\([^\n]*\.opacity\(|\bText\([^\n]*\.opacity\(/, ref: '05-gestaltung.md, Farbe' },
  {
    id: 'feste-farbe', stufe: 'hinweis', text: 'Farbe direkt im View statt Palette',
    muster: /\b(UI)?Color\(\s*(red|hex):|\.(foregroundStyle|foregroundColor|tint|fill|background|stroke)\(\s*(Color)?\.(blue|red|green|orange|yellow|purple|pink|gray|black|white)\b/,
    ref: '05-gestaltung.md, Farbe',
  },
  { id: 'verlauf', stufe: 'hinweis', text: 'Farbverlauf (DS: keine Verläufe als Dekoration)', muster: /\b(Linear|Radial|Angular)Gradient\b|\.gradient\b/, ref: '05-gestaltung.md' },
  { id: 'roh-animation', stufe: 'hinweis', text: '.animation/withAnimation statt dsAnimation (Bewegung reduzieren?)', muster: /\.animation\(|\bwithAnimation\s*[({]/, ref: '05-gestaltung.md, Bewegung' },
  { id: 'leisten-hintergrund', stufe: 'hinweis', text: 'Eigener Leistenhintergrund (stört Liquid Glass)', muster: /\.toolbarBackground\(/, ref: '05-gestaltung.md, Liquid Glass' },
  { id: 'observableobject', stufe: 'hinweis', text: 'ObservableObject/@Published in neuem Code (DS: @Observable)', muster: /:\s*ObservableObject\b|@Published\b/, ref: '08-technik.md' },
  { id: 'foreach-indizes', stufe: 'hinweis', text: 'ForEach über Indizes (instabile Identität)', muster: /ForEach\(\s*0\s*\.\.<\s*[A-Za-z_]|ForEach\([^)]*\.indices|ForEach\(\s*Array\([^)]*enumerated\(\)/, ref: '08-technik.md' },
  { id: 'symbol-ohne-text', stufe: 'hinweis', text: 'Knopf nur mit Symbol ohne Text/Label (VoiceOver)', datei: true, ref: '07-barrierefreiheit.md' },
];

// Zeichen guter Praxis (nur gezählt)
export const ZAEHLER = [
  { id: 'accessibilityLabel', muster: /\.accessibilityLabel\(/ },
  { id: 'isHeader', muster: /\.isHeader/ },
  { id: 'sensoryFeedback (Haptik)', muster: /\.sensoryFeedback\(/ },
  { id: 'Bewegung reduzieren beachtet', muster: /accessibilityReduceMotion|dsAnimation|dsMitAnimation/ },
  { id: 'ContentUnavailableView / DSZustandsAnsicht', muster: /ContentUnavailableView|DSZustandsAnsicht/ },
  { id: 'ViewThatFits / isAccessibilitySize', muster: /ViewThatFits|isAccessibilitySize/ },
  { id: 'String-Katalog (localized)', muster: /String\(localized:|LocalizedStringResource/ },
  { id: 'DSKit-Werte', muster: /\bDS(Abstand|Radius|Mass)\./ },
];

/** Entfernt Kommentare (zeilenweise erhalten) und leert optional String-Inhalte. */
export function zerlege(text) {
  const roh = [], code = [];
  let zustand = 'normal', r = '', c = '';
  for (let i = 0; i < text.length; i++) {
    const z = text[i], n = text[i + 1];
    if (z === '\n') {
      roh.push(r); code.push(c); r = ''; c = '';
      if (zustand === 'zeilenkommentar') zustand = 'normal';
      if (zustand === 'string') zustand = 'normal';
      continue;
    }
    if (zustand === 'normal') {
      if (z === '/' && n === '/') { zustand = 'zeilenkommentar'; i++; continue; }
      if (z === '/' && n === '*') { zustand = 'blockkommentar'; i++; continue; }
      if (z === '"' && text.startsWith('"""', i)) { zustand = 'mehrzeilig'; r += '"""'; c += '"""'; i += 2; continue; }
      if (z === '"') { zustand = 'string'; r += z; c += z; continue; }
      r += z; c += z;
    } else if (zustand === 'string') {
      if (z === '\\') { r += z + (n ?? ''); i++; continue; }
      if (z === '"') { zustand = 'normal'; r += z; c += z; continue; }
      r += z;
    } else if (zustand === 'mehrzeilig') {
      if (text.startsWith('"""', i)) { zustand = 'normal'; r += '"""'; c += '"""'; i += 2; continue; }
      r += z;
    } else if (zustand === 'blockkommentar') {
      if (z === '*' && n === '/') { zustand = 'normal'; i++; }
    }
  }
  roh.push(r); code.push(c);
  return { roh, code };
}

/** Prüft einen Dateitext. Liefert { treffer: [{regel, zeile}], zaehler, ausnahmen }. */
export function pruefeText(text) {
  const original = text.split('\n');
  const { roh, code } = zerlege(text);
  const treffer = [];
  const zaehler = Object.fromEntries(ZAEHLER.map((z) => [z.id, 0]));
  let ausnahmen = 0;
  const ok = (i) => /\/\/\s*ds-ok:\s*\S/.test(original[i] ?? '');

  code.forEach((zeileCode, i) => {
    if (!zeileCode.trim()) return;
    if (ok(i)) { ausnahmen += 1; return; }
    for (const r of REGELN) {
      if (r.datei) continue;
      const ziel = r.quelle === 'roh' ? roh[i] : zeileCode;
      if (r.ausser && r.ausser.test(ziel)) continue;
      if (r.muster.global) {
        const funde = [...ziel.matchAll(r.muster)].filter((m) => (r.zahl ? r.zahl(m) : true));
        if (funde.length) treffer.push({ regel: r.id, zeile: i + 1 });
      } else if (r.muster.test(ziel)) {
        treffer.push({ regel: r.id, zeile: i + 1 });
      }
    }
    for (const z of ZAEHLER) if (z.muster.test(zeileCode)) zaehler[z.id] += 1;
  });

  // Datei-Regel: Button, dessen Inhalt in den nächsten Zeilen nur ein Image(systemName:) ist
  code.forEach((zeile, i) => {
    if (!/\bButton\s*(\(|\{)/.test(zeile) || ok(i)) return;
    if (/Button\(\s*"/.test(zeile) || /systemImage:/.test(zeile)) return;   // hat Text
    // Ende des Knopfs über die Klammern finden, dann Label im Knopf oder in den 2 Zeilen danach suchen
    let tiefe = 0, ende = i, begonnen = false;
    for (let j = i; j < Math.min(code.length, i + 15); j++) {
      for (const z of code[j]) {
        if (z === '{' || z === '(') { tiefe += 1; begonnen = true; }
        if (z === '}' || z === ')') tiefe -= 1;
      }
      ende = j;
      if (begonnen && tiefe <= 0) break;
    }
    const knopf = code.slice(i, ende + 1).join('\n');
    const danach = code.slice(ende + 1, ende + 3).filter((z) => /^\s*\./.test(z)).join('\n');
    if (/Image\(\s*systemName:/.test(knopf) && !/\b(Text|Label)\(|accessibilityLabel\(/.test(knopf + danach)) {
      treffer.push({ regel: 'symbol-ohne-text', zeile: i + 1 });
    }
  });
  return { treffer, zaehler, ausnahmen };
}

function swiftDateien(start) {
  const raus = [];
  const gehe = (pfad) => {
    for (const name of readdirSync(pfad)) {
      if (name.startsWith('.') || name === 'build' || name === 'DerivedData' || name.endsWith('.xcodeproj')) continue;
      const voll = join(pfad, name);
      if (statSync(voll).isDirectory()) gehe(voll);
      else if (name.endsWith('.swift')) raus.push(voll);
    }
  };
  gehe(start);
  return raus;
}

function main() {
  const args = process.argv.slice(2);
  const ordner = args.find((a) => !a.startsWith('--'));
  const alsJson = args.includes('--json');
  const alle = args.includes('--alle');
  if (!ordner) {
    console.error('Aufruf: node ds-pruefer.mjs <app-quellordner> [--json] [--alle]');
    process.exit(2);
  }
  const dateien = swiftDateien(ordner);
  const ergebnis = Object.fromEntries(REGELN.map((r) => [r.id, []]));
  const zaehler = Object.fromEntries(ZAEHLER.map((z) => [z.id, 0]));
  let zeilenGesamt = 0, ausnahmen = 0;

  for (const datei of dateien) {
    const rel = relative(ordner, datei);
    const istTest = /Tests?\//.test(rel) || /Tests\.swift$/.test(datei);
    const text = readFileSync(datei, 'utf8');
    const zeilen = text.split('\n');
    zeilenGesamt += zeilen.length;
    const e = pruefeText(text);
    for (const [k, v] of Object.entries(e.zaehler)) zaehler[k] += v;
    if (istTest) continue;   // Tests werden gezählt, nicht geprüft
    ausnahmen += e.ausnahmen;
    for (const t of e.treffer) ergebnis[t.regel].push(`${rel}:${t.zeile}  ${zeilen[t.zeile - 1].trim().slice(0, 110)}`);
  }

  if (alsJson) {
    console.log(JSON.stringify({ ordner, dateien: dateien.length, zeilen: zeilenGesamt, ausnahmen, regeln: ergebnis, zaehler }, null, 2));
  } else {
    console.log(`DS-Prüfer: ${ordner}`);
    console.log(`${dateien.length} Swift-Dateien, ${zeilenGesamt} Zeilen (Tests nur gezählt, nicht geprüft), ${ausnahmen} begründete Ausnahmen (ds-ok)\n`);
    for (const stufe of ['fehler', 'hinweis']) {
      console.log(stufe === 'fehler' ? '== FEHLER (vor Abgabe beheben oder begründen) ==' : '== HINWEISE (jede Stelle ansehen) ==');
      for (const r of REGELN.filter((x) => x.stufe === stufe)) {
        const funde = ergebnis[r.id];
        console.log(`${funde.length === 0 ? 'ok ' : String(funde.length).padStart(3)}  ${r.text}  [${r.ref}]`);
        for (const f of (alle ? funde : funde.slice(0, 5))) console.log(`       ${f}`);
        if (!alle && funde.length > 5) console.log(`       … ${funde.length - 5} weitere (--alle)`);
      }
      console.log('');
    }
    console.log('== GUTE PRAXIS (Anzahl Vorkommen, 0 = fehlt wahrscheinlich) ==');
    for (const [id, n] of Object.entries(zaehler)) console.log(`${String(n).padStart(4)}  ${id}`);
  }
  const fehlerAnzahl = REGELN.filter((r) => r.stufe === 'fehler').reduce((s, r) => s + ergebnis[r.id].length, 0);
  process.exit(fehlerAnzahl > 0 ? 1 : 0);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
