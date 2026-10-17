// Vor-Ort-Set 17.10.2026 (Ultron-Auftrag mvboc22o-154): noindex-Prüfung, Handy-Bildschirmfotos,
// A6-Infoblätter pro Restaurant, Rechnungsvorlage 249 €. Nur lesend gegen die Live-Seite, nichts wird veröffentlicht.
// Start: node _baue-vor-ort-set.mjs
import { chromium, devices } from 'playwright';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ORDNER = dirname(fileURLToPath(import.meta.url));
const require = createRequire('/Users/domi/Marketing-Maschine/apps/tf-studio/package.json');
const QRCode = require('qrcode');

const BASIS = 'https://gastrosite24.de';
const UTM = 'utm_source=vor-ort&utm_medium=infoblatt&utm_campaign=gruender-aktion';
const TELEFON = '0162 4502375';
const jetzt = new Date();
const stempel = jetzt.toLocaleString('de-DE', { timeZone: 'Europe/Berlin' });

const k = JSON.parse(readFileSync(join(ORDNER, 'kandidaten.json'), 'utf8'));
const betriebe = [
  ...k.kandidaten.map((b) => ({ ...b, nr: String(b.nr) })),
  ...k.reserve.map((b, i) => ({ ...b, nr: `R${i + 1}` })),
];
const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss')
  .replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
for (const b of betriebe) {
  b.slug = `${b.nr.padStart(2, '0')}-${slug(b.name)}`;
  // Eigener Entwurf existiert nicht (siehe Protokoll) → QR auf die Bestellseite mit Restaurant-Kennung.
  // Sobald es einen Entwurf gibt: Feld "entwurf_url" in kandidaten.json eintragen und neu bauen.
  b.ziel = b.entwurf_url || `${BASIS}/?${UTM}&utm_content=${b.slug}`;
}

// 1) noindex-Prüfung -------------------------------------------------------
const PRUEF = [
  { key: 'entwurf-muster', url: `${BASIS}/entwurf/vorortcheck171020260000000000000000000000000000`, art: 'Entwurfs-Muster /entwurf/<Schlüssel>' },
  { key: 'entwurf-ohne', url: `${BASIS}/entwurf/`, art: 'Entwurf ohne Schlüssel' },
  { key: 'vorschau', url: `${BASIS}/vorschau/test`, art: 'Vorschau-Pfad (gibt es nicht)' },
  { key: 'bestellen', url: `${BASIS}/?${UTM}`, art: 'Bestellseite (öffentlich, QR auf Infoblatt)' },
  { key: 'gratis-entwurf', url: `${BASIS}/gratis-entwurf?${UTM}`, art: 'Gratis-Entwurf-Formular (öffentlich)' },
];
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'de-DE' });
const page = await ctx.newPage();
const pruefung = [];
for (const p of PRUEF) {
  const res = await fetch(p.url, { redirect: 'follow' });
  const html = await res.text();
  const meta = (html.match(/<meta[^>]+name=["']robots["'][^>]*>/i) || [''])[0].match(/content=["']([^"']+)/i)?.[1] || '–';
  // Meta nach dem Rendern (Seite ist eine React-App, Meta kann per Script gesetzt werden)
  await page.goto(p.url, { waitUntil: 'networkidle' });
  const metaGerendert = await page.evaluate(() => [...document.querySelectorAll('meta[name="robots"]')].map((m) => m.content).join(' | ') || '–');
  pruefung.push({ ...p, status: res.status, xrobots: res.headers.get('x-robots-tag') || '–', meta, metaGerendert });
}

// 2) Bildschirmfotos Handy -------------------------------------------------
mkdirSync(join(ORDNER, 'screens'), { recursive: true });
const SCREENS = [
  { datei: '1-bestellseite.png', url: `${BASIS}/?${UTM}` },
  { datei: '2-bestellseite-ganz.png', url: `${BASIS}/?${UTM}`, ganz: true },
  { datei: '3-gratis-entwurf.png', url: `${BASIS}/gratis-entwurf?${UTM}` },
  { datei: '4-beispiel-website.png', url: 'https://meek-sundae-588ede.netlify.app' },
  { datei: '5-beispiel-website-ganz.png', url: 'https://meek-sundae-588ede.netlify.app', ganz: true },
  { datei: '6-leistungen-ganz.png', url: `${BASIS}/leistungen`, ganz: true },
];
for (const s of SCREENS) {
  await page.goto(s.url, { waitUntil: 'networkidle' });
  // Cookie-Hinweis wegklicken, falls da
  await page.getByRole('button', { name: /nur notwendige/i }).first().click({ timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(800);
  if (s.ganz) await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo(0, 0); });
  await page.screenshot({ path: join(ORDNER, 'screens', s.datei), fullPage: !!s.ganz });
  // Ganzseiten-Fotos auf halbe Breite verkleinern (sonst bis 19 MB)
  if (s.ganz) execFileSync('sips', ['--resampleWidth', '585', join(ORDNER, 'screens', s.datei)], { stdio: 'ignore' });
}

// 3) Infoblätter A6 ----------------------------------------------------------
mkdirSync(join(ORDNER, 'infoblaetter'), { recursive: true });
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const blatt = async (b) => {
  const qr = await QRCode.toDataURL(b.ziel, { width: 600, margin: 1, errorCorrectionLevel: 'M' });
  return `<section class="a6">
  <div class="marke">Gastro<span>Site</span>24</div>
  <div class="fuer">Eure neue Website,</div>
  <h1>${esc(b.name.replace(/\s*\(.*\)$/, ''))}</h1>
  <div class="mitte">
    <img src="${qr}" alt="QR-Code">
    <div class="preis">
      <div class="gross">249 € <small>netto</small></div>
      <div class="statt">statt 499 € – Gründer-Aktion</div>
      <div class="klein">nur für die ersten 10 Restaurants<br>296,31 € inkl. 19 % USt., einmalig</div>
    </div>
  </div>
  <div class="scan">QR scannen: Angebot ansehen und Platz sichern</div>
  <ul>
    <li>Fertig in ca. 7 Werktagen</li>
    <li>Speisekarte aufs Handy, Anruf-Knopf, Google-Profil</li>
    <li>Hosting, Domain und Betreuung im 1. Jahr inklusive</li>
  </ul>
  <div class="tel">Fragen? Anrufen oder WhatsApp:<br><strong>${TELEFON}</strong> · Domenic Schilling</div>
  <div class="fuss">Ab dem 2. Jahr 299 € netto/Jahr für Betreuung, Hosting und Domain, kündbar zum Ende des Vertragsjahres. DSX Media Solutions UG (haftungsbeschränkt), Am Weingarten 9, 96117 Memmelsdorf · gastrosite24.de</div>
</section>`;
};
const css = `@page { size: 105mm 148mm; margin: 0; }
* { box-sizing: border-box; } html, body { margin: 0; }
body { font: 9pt/1.35 -apple-system, "Helvetica Neue", Arial, sans-serif; color: #17181C; }
.a6 { width: 105mm; height: 148mm; padding: 7mm 7mm 5mm; display: flex; flex-direction: column; overflow: hidden; page-break-after: always; }
.marke { font-weight: 800; font-size: 13pt; letter-spacing: -.02em; } .marke span { color: #E3242B; }
.fuer { margin-top: 4mm; color: #5F6470; } h1 { font-size: 15pt; line-height: 1.15; margin: .5mm 0 3mm; }
.mitte { display: flex; gap: 4mm; align-items: center; } .mitte img { width: 40mm; height: 40mm; }
.preis .gross { font-size: 24pt; font-weight: 800; color: #E3242B; line-height: 1; } .preis small { font-size: 10pt; color: #17181C; font-weight: 600; }
.statt { font-weight: 700; margin-top: 1.5mm; } .klein { font-size: 7.5pt; color: #5F6470; margin-top: 1.5mm; }
.scan { font-size: 7.8pt; color: #5F6470; margin-top: 1.5mm; }
ul { margin: 3mm 0 0; padding-left: 4.5mm; } li { margin: .6mm 0; }
.tel { margin-top: 3mm; padding: 2.5mm 3mm; background: #F4F4F6; border-radius: 2mm; } .tel strong { font-size: 12pt; }
.fuss { margin-top: auto; font-size: 6pt; color: #5F6470; }`;
const html = (inhalt) => `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>${css}</style></head><body>${inhalt}</body></html>`;
const pdfSeite = await browser.newPage();
const alle = [];
for (const b of betriebe) {
  const s = await blatt(b);
  alle.push(s);
  await pdfSeite.setContent(html(s), { waitUntil: 'load' });
  await pdfSeite.pdf({ path: join(ORDNER, 'infoblaetter', `Infoblatt-A6-${b.slug}.pdf`), width: '105mm', height: '148mm', printBackground: true });
}
await pdfSeite.setContent(html(alle.join('\n')), { waitUntil: 'load' });
await pdfSeite.pdf({ path: join(ORDNER, 'infoblaetter', 'Infoblaetter-A6-alle.pdf'), width: '105mm', height: '148mm', printBackground: true });

// 4) Rechnungsvorlage ---------------------------------------------------------
await pdfSeite.goto('file://' + join(ORDNER, 'rechnungsvorlage-website-249.html'), { waitUntil: 'load' });
await pdfSeite.pdf({ path: join(ORDNER, 'Rechnungsvorlage-Website-249.pdf'), format: 'A4', printBackground: true });
await browser.close();

// 5) Protokoll -------------------------------------------------------------------
const ok = (p) => /noindex/i.test(p.xrobots) || /noindex/i.test(p.metaGerendert);
const z = [];
z.push('# Noindex-Protokoll Vor-Ort-Set Bamberg, Sa 17.10.2026', '');
z.push(`Ultron-Auftrag mvboc22o-154. Geprüft am ${stempel} live auf ${BASIS}, nur lesend (HTTP-Abruf + Handy-Browser iPhone 13). Skript: \`_baue-vor-ort-set.mjs\`.`, '');
z.push('## Ergebnis vorab', '');
z.push('- **Kein Bamberger Restaurant hat einen eigenen Entwurf.** In der Datenbank (`drafts`) liegen heute nur 3 Test-Entwürfe mit Bamberg-Bezug (`claude-test`), kein echter Betrieb. Darum gibt es pro Restaurant keine eigene Entwurfs-Adresse zum Prüfen.');
z.push('- Alle Entwurfs-Adressen laufen über dasselbe Muster `/entwurf/<Schlüssel>`. Der Schutz hängt am Muster, nicht am einzelnen Schlüssel – das Muster ist unten geprüft und gilt für jeden künftigen Entwurf.');
z.push('- Die QR-Codes auf den Infoblättern führen deshalb auf die **öffentliche Bestellseite** (mit Restaurant-Kennung im Link), nicht auf einen Entwurf. Die soll ja gefunden werden – noindex ist dort nicht gewollt.', '');
z.push('## Geprüfte Adressen', '');
z.push('| Adresse | Art | Status | Header X-Robots-Tag | Meta robots (Quelltext) | Meta robots (im Browser) | Vor Google geschützt? |', '|---|---|---|---|---|---|---|');
for (const p of pruefung) z.push(`| \`${p.url.replace(BASIS, '').replace(/\?.*/, '?…')}\` | ${p.art} | ${p.status} | ${p.xrobots} | ${p.meta} | ${p.metaGerendert} | ${ok(p) ? 'ja ✅' : 'nein (öffentlich)'} |`);
z.push('', '## Pro Restaurant', '');
z.push('| # | Restaurant | Eigene Entwurfs-Adresse | noindex-Prüfung | QR auf Infoblatt führt zu |', '|---|---|---|---|---|');
const muster = pruefung.find((p) => p.key === 'entwurf-muster');
for (const b of betriebe) z.push(`| ${b.nr} | ${b.name} | keine (kein Entwurf in der Datenbank) | entfällt – Muster \`/entwurf/*\`: ${muster.xrobots} | Bestellseite \`?…utm_content=${b.slug}\` |`);
z.push('', '## Bildschirmfotos (Handy, offline zeigen)', '');
z.push('Ordner `screens/`. Weil es keine Entwürfe pro Restaurant gibt, sind es dieselben Bilder für alle Betriebe:', '');
for (const s of SCREENS) z.push(`- \`${s.datei}\` – ${s.url.replace(/\?.*/, '')}${s.ganz ? ' (ganze Seite)' : ''}`);
writeFileSync(join(ORDNER, 'noindex-protokoll-17-10.md'), z.join('\n') + '\n');

// 6) Notizvorlage CSV -----------------------------------------------------------
const csv = (v) => (/[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
const kopf = ['restaurant', 'uhrzeit', 'ansprechperson', 'entwurf_vor_oder_nach_gespraech', 'ergebnis', 'einwand', 'whatsapp_einwilligung', 'rueckruf', 'bezahlt'];
const zeilen = betriebe.map((b) => [`${b.nr} ${b.name} (${b.adresse.split(',')[0]})`, '', '', '', '', '', '', '', ''].map(csv).join(','));
writeFileSync(join(ORDNER, 'notizvorlage-17-10.csv'), [kopf.join(','), ...zeilen].join('\n') + '\n');
console.log(JSON.stringify(pruefung, null, 1));
