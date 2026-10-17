// Handy-Prüfung der Links für die Vor-Ort-Besuche Bamberg (nur lesend).
// Aufruf aus dem Worktree: node content/gastrosite/vor-ort-bamberg/handy-check/_pruefe.mjs
import { chromium, devices } from 'playwright';
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ORDNER = dirname(fileURLToPath(import.meta.url));
const require = createRequire('/Users/domi/Marketing-Maschine/apps/tf-studio/package.json');
const QRCode = require('qrcode');

const UTM = 'utm_source=vor-ort&utm_medium=besuch&utm_campaign=gruender-aktion';
const SEITEN = [
  { key: '1-bestellen', name: 'Bestell-Link (QR links)', url: `https://gastrosite24.de/?${UTM}`, preis: true, qr: true },
  { key: '2-gratis-entwurf', name: 'Gratis-Entwurf-Formular (QR rechts)', url: `https://gastrosite24.de/gratis-entwurf?${UTM}`, preis: false, qr: true },
  { key: '3-beispiel', name: 'Beispiel-Website („Live-Website ansehen“)', url: 'https://meek-sundae-588ede.netlify.app', preis: false, qr: true },
  { key: '4-leistungen', name: 'Leistungsbeschreibung', url: 'https://gastrosite24.de/leistungen', preis: false, qr: false },
];
const PLATZHALTER = /lorem|ipsum|\bTODO\b|\bTBD\b|platzhalter|xxx|\{\{/i;
const TECHNIK = /\bundefined\b|\bNaN\b|\[object Object\]/g;

mkdirSync(join(ORDNER, 'screenshots'), { recursive: true });
mkdirSync(join(ORDNER, 'qr'), { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } });
const ergebnisse = [];

for (const s of SEITEN) {
  const page = await ctx.newPage();
  const fehler = [];
  const kaputt = [];
  page.on('pageerror', e => fehler.push('JS: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') fehler.push('Konsole: ' + m.text().slice(0, 160)); });
  page.on('response', r => { if (r.status() >= 400) kaputt.push(`${r.status()} ${r.url().slice(0, 120)}`); });
  page.on('requestfailed', r => kaputt.push(`abgebrochen ${r.url().slice(0, 120)}`));

  const resp = await page.goto(s.url, { waitUntil: 'networkidle', timeout: 45000 });
  // Langsam scrollen, damit nachgeladene Bilder wirklich geladen werden
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 150)); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1200);

  const info = await page.evaluate(() => ({
    titel: document.title,
    breite: document.documentElement.scrollWidth,
    bilderKaputt: [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.src).map(i => i.src.slice(0, 120)),
    bilder: document.images.length,
    text: document.body.innerText,
  }));
  const treffer = [...(info.text.match(new RegExp(PLATZHALTER.source, 'gi')) || []), ...(info.text.match(TECHNIK) || [])];
  const preis249 = /249\s?€/.test(info.text);

  await page.screenshot({ path: join(ORDNER, 'screenshots', `${s.key}-oben.jpg`), type: 'jpeg', quality: 70, scale: 'css' });
  await page.screenshot({ path: join(ORDNER, 'screenshots', `${s.key}-ganz.jpg`), fullPage: true, type: 'jpeg', quality: 70, scale: 'css' });
  if (s.qr) await QRCode.toFile(join(ORDNER, 'qr', `${s.key}.png`), s.url, { width: 600, margin: 2 });

  const probleme = [];
  if (!resp || resp.status() !== 200) probleme.push(`Status ${resp && resp.status()}`);
  if (info.bilderKaputt.length) probleme.push(`${info.bilderKaputt.length} kaputte Bilder`);
  if (kaputt.length) probleme.push(`${kaputt.length} Dateien nicht geladen`);
  if (fehler.length) probleme.push(`${fehler.length} Skriptfehler`);
  if (treffer.length) probleme.push(`Platzhalter: ${[...new Set(treffer)].join(', ')}`);
  if (info.breite > 392) probleme.push(`Seite breiter als Handy (${info.breite}px)`);
  if (s.preis && !preis249) probleme.push('249 € fehlt');

  ergebnisse.push({ ...s, status: resp && resp.status(), titel: info.titel, bilder: info.bilder, breite: info.breite,
    preis249, bilderKaputt: info.bilderKaputt, kaputt, fehler, treffer: [...new Set(treffer)], probleme });
  await page.close();
}
await browser.close();

writeFileSync(join(ORDNER, 'ergebnis.json'), JSON.stringify({ geprueft: new Date().toISOString(), viewport: '390x844 (iPhone 13)', ergebnisse }, null, 2));
for (const e of ergebnisse) console.log(`${e.probleme.length ? 'FEHLER' : 'OK    '} ${e.status} ${e.name}: ${e.probleme.join(' | ') || '–'} (Bilder ${e.bilder}, Breite ${e.breite})`);
