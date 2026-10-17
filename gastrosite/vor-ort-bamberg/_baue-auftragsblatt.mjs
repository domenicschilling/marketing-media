// Baut das Auftragsblatt (A4, eine Seite) für die Vor-Ort-Besuche Bamberg (Ultron-Auftrag mvboc22m-150).
// Setzt den echten Zählerstand aus https://gastrosite24.de/api/aktion ein (nur gelesen) und prüft, dass es genau eine Seite ist.
// Aufruf: node _baue-auftragsblatt.mjs
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ORDNER = dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire('/Users/domi/Marketing-Maschine/package.json')('playwright');

let zaehler = null;
try {
  const r = await fetch('https://gastrosite24.de/api/aktion');
  const j = await r.json();
  if (Number.isInteger(j.frei) && Number.isInteger(j.plaetze)) zaehler = j;
} catch { /* ohne Zähler bleibt das Handfeld stehen */ }

const stand = new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const browser = await chromium.launch();
const seite = await browser.newPage();
await seite.goto('file://' + join(ORDNER, 'auftragsblatt.html'));
if (zaehler) {
  await seite.evaluate(({ z, stand }) => {
    document.getElementById('zaehler').textContent = `${z.frei} von ${z.plaetze} frei (Stand beim Druck ${stand} Uhr, vor Ort neu prüfen)`;
  }, { z: zaehler, stand });
}
const ziel = join(ORDNER, 'auftragsblatt.pdf');
await seite.pdf({ path: ziel, format: 'A4', printBackground: true });
await browser.close();

const seiten = (readFileSync(ziel, 'latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
console.log(`auftragsblatt.pdf: ${seiten} Seite(n), Zähler: ${zaehler ? `${zaehler.frei}/${zaehler.plaetze} frei` : 'nicht erreichbar (Handfeld)'}`);
if (seiten !== 1) process.exit(1);
