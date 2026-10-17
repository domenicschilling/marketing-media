// Baut das Verkaufs-Set für die Vor-Ort-Besuche Bamberg (Ultron-Auftrag mvboc22q-160):
// Rechnungsvorlage Gründer-Aktion 249 € (PDF), Infoblatt A5 pro Restaurant (PDF + PNG fürs Handy),
// Handy-Bildschirmfotos der Seiten, die vor Ort gezeigt werden. Nur lokal, nichts wird veröffentlicht.
// Aufruf: node _baue-verkaufsset.mjs
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ORDNER = dirname(fileURLToPath(import.meta.url));
const require = createRequire('/Users/domi/Marketing-Maschine/apps/tf-studio/package.json');
const QRCode = require('qrcode');
const { chromium, devices } = createRequire('/Users/domi/Marketing-Maschine/package.json')('playwright');

// Telefonnummer aus dem Impressum von gastrosite24.de (geprüft 17.10.2026)
const TELEFON = '0162 4502375';
const TELEFON_LINK = '+491624502375';
const MAIL = 'info@gastrosite24.de';
const BEISPIEL = 'https://meek-sundae-588ede.netlify.app';

const daten = JSON.parse(readFileSync(join(ORDNER, 'kandidaten.json'), 'utf8'));
const liste = [
  ...daten.kandidaten.map(k => ({ ...k, kennung: String(k.nr).padStart(2, '0') })),
  ...daten.reserve.map((k, i) => ({ ...k, kennung: `R${i + 1}` })),
];

const slug = s => s.toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Kurzname fürs Blatt: Klammerzusätze und Anführungszeichen weg
const anzeigeName = s => s.replace(/\s*\(.*?\)\s*/g, ' ').replace(/[„“"]/g, '').trim();

const entwurfLink = k => `https://gastrosite24.de/gratis-entwurf?utm_source=vor-ort&utm_medium=infoblatt&utm_campaign=gruender-aktion&utm_content=${slug(k.name)}`;

const STIL = `
  @page { size: A5; margin: 0; }
  * { box-sizing: border-box; }
  :root { --text:#17181C; --muted:#5F6470; --accent:#E3242B; --line:rgba(23,24,28,.12); }
  html, body { margin: 0; }
  body { font: 10pt/1.45 -apple-system, "Helvetica Neue", Arial, sans-serif; color: var(--text); }
  .seite { width: 148mm; height: 210mm; padding: 11mm 12mm 9mm; display: flex; flex-direction: column; overflow: hidden; }
  .marke { font-size: 15pt; font-weight: 800; letter-spacing: -.02em; }
  .marke span { color: var(--accent); }
  h1 { font-size: 19pt; line-height: 1.15; margin: 5mm 0 1.5mm; letter-spacing: -.01em; }
  .unter { color: var(--muted); margin: 0 0 4mm; }
  .qrzeile { display: flex; gap: 5mm; align-items: center; background: #F6F6F7; border-radius: 3mm; padding: 4mm; }
  .qrzeile img { width: 36mm; height: 36mm; flex: none; }
  .qrzeile b { font-size: 11.5pt; }
  .qrzeile .klein { margin-top: 1.5mm; }
  ul { margin: 3.5mm 0 0; padding-left: 5mm; }
  li { margin: .6mm 0; }
  .preis { margin-top: 4.5mm; border: 2px solid var(--text); border-radius: 3mm; padding: 3.5mm 4mm; }
  .preis .gross { font-size: 18pt; font-weight: 800; }
  .preis .gross s { color: var(--muted); font-weight: 600; font-size: 13pt; }
  .klein { font-size: 8.2pt; color: var(--muted); }
  .kontakt { margin-top: 4mm; font-size: 11pt; }
  .kontakt b { font-size: 13pt; }
  .beispiel { display: flex; gap: 3mm; align-items: center; margin-top: 3mm; }
  .beispiel img { width: 17mm; height: 17mm; }
  .fuss { margin-top: auto; padding-top: 2mm; border-top: 1px solid var(--line); font-size: 6.8pt; color: var(--muted); }
`;

function infoblatt(k, qrEntwurf, qrBeispiel) {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Infoblatt ${esc(anzeigeName(k.name))}</title><style>${STIL}</style></head><body><div class="seite">
  <div class="marke">Gastro<span>Site</span>24</div>
  <h1>Eine eigene Website für ${esc(anzeigeName(k.name))}</h1>
  <p class="unter">Gemacht für Gäste, die euch auf dem Handy suchen: anrufen, Speisekarte lesen, Weg finden.</p>

  <div class="qrzeile">
    <img src="${qrEntwurf}" alt="QR-Code Gratis-Entwurf">
    <div>
      <b>Euren Entwurf kostenlos anfordern</b>
      <div>Scannen, kurz Name und Kontakt eintragen, wir bauen den Entwurf für euch. Ihr schaut ihn an und entscheidet dann.</div>
      <div class="klein">Unverbindlich. Kauf erst, wenn euch der Entwurf gefällt.</div>
    </div>
  </div>

  <ul>
    <li>Anruf-Knopf: ein Tipp, und der Gast ruft an</li>
    <li>Speisekarte direkt auf dem Handy, ohne PDF</li>
    <li>Einrichtung eures Google-Profils</li>
    <li>Hosting, Domain und Betreuung im 1. Jahr inklusive</li>
  </ul>

  <div class="preis">
    <div class="klein" style="color:var(--text)"><b>Gründer-Aktion für die ersten 10 Restaurants</b></div>
    <div class="gross">249 € <s>499 €</s> <span style="font-size:10pt;font-weight:600">netto, einmalig</span></div>
    <div class="klein">296,31 € inkl. 19 % USt. · ab dem 2. Jahr 299 € netto pro Jahr (355,81 € inkl. USt.) für Betreuung, Hosting und Domain, kündbar zum Ende des Vertragsjahres</div>
  </div>

  <div class="beispiel">
    <img src="${qrBeispiel}" alt="QR-Code Beispiel-Website">
    <div class="klein">So sieht eine fertige Seite aus:<br>Beispiel-Website scannen</div>
  </div>

  <div class="kontakt">Fragen? Ruft mich an: <b>Domenic Schilling · ${TELEFON}</b><br><span class="klein">${MAIL} · gastrosite24.de</span></div>

  <div class="fuss">Wir richten euer Google-Profil ein und pflegen es. Eine bestimmte Platzierung bei Google können wir nicht versprechen, das entscheidet allein Google.<br>
  DSX Media Solutions UG (haftungsbeschränkt) · Am Weingarten 9 · 96117 Memmelsdorf · Amtsgericht Bamberg HRB 12150 · Stand 17.10.2026</div>
</div></body></html>`;
}

const rechnung = () => `<!doctype html>
<!--
  Rechnungsvorlage GastroSite24 – Gründer-Aktion 249 € netto zzgl. 19 % USt. = 296,31 € (angelegt 17.10.2026, Ultron-Auftrag mvboc22q-160)
  Rechnungsstellende Firma wie im Impressum von gastrosite24.de: DSX Media Solutions UG – von Domenic noch zu bestätigen.
  Rechnungsnummer IMMER aus derselben Nummernfolge wie die übrigen GastroSite24-/DSX-Rechnungen nehmen (nächste freie Nummer prüfen).
  Platzhalter in {{ … }} ersetzen. Im Browser öffnen → Drucken → „Als PDF sichern“.
-->
<html lang="de"><head><meta charset="utf-8"><title>Rechnung {{RECHNUNGSNUMMER}} – GastroSite24</title>
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  :root { --text:#17181C; --muted:#5F6470; --accent:#E3242B; --line:rgba(23,24,28,.12); }
  html, body { margin: 0; }
  body { font: 10.2pt/1.45 -apple-system, "Helvetica Neue", Arial, sans-serif; color: var(--text); }
  .seite { width: 210mm; height: 297mm; padding: 15mm 18mm 12mm 20mm; display: flex; flex-direction: column; overflow: hidden; }
  .kopf { display: flex; justify-content: space-between; align-items: flex-start; }
  .marke { font-size: 18pt; font-weight: 800; letter-spacing: -.02em; }
  .marke span { color: var(--accent); }
  .klein { font-size: 8.4pt; color: var(--muted); }
  .absender-klein { font-size: 7.4pt; color: var(--muted); border-bottom: 1px solid #999; display: inline-block; margin: 12mm 0 2mm; }
  .adresse { min-height: 30mm; }
  .meta { font-size: 9.4pt; border-collapse: collapse; }
  .meta td { padding: .6mm 0 .6mm 8mm; }
  .meta td:first-child { color: var(--muted); padding-left: 0; }
  h1 { font-size: 16pt; margin: 8mm 0 3mm; }
  table.pos { width: 100%; border-collapse: collapse; margin-top: 4mm; }
  table.pos th { text-align: left; font-size: 8.8pt; color: var(--muted); border-bottom: 1.5px solid var(--text); padding: 2mm 1mm; }
  table.pos td { border-bottom: 1px solid var(--line); padding: 2.5mm 1mm; vertical-align: top; }
  .r { text-align: right; white-space: nowrap; }
  table.summe { margin-left: auto; margin-top: 4mm; border-collapse: collapse; }
  table.summe td { padding: 1.2mm 1mm 1.2mm 10mm; }
  table.summe tr.gesamt td { font-weight: 700; border-top: 1.5px solid var(--text); font-size: 11.5pt; }
  .fuss { margin-top: auto; padding-top: 3mm; border-top: 1px solid var(--line); display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; font-size: 7.8pt; color: var(--muted); }
</style></head><body><div class="seite">
  <div class="kopf">
    <div class="marke">Gastro<span>Site</span>24</div>
    <div class="klein" style="text-align:right">DSX Media Solutions UG (haftungsbeschränkt)<br>Am Weingarten 9 · 96117 Memmelsdorf<br>${MAIL} · gastrosite24.de</div>
  </div>
  <div class="absender-klein">DSX Media Solutions UG (haftungsbeschränkt) · Am Weingarten 9 · 96117 Memmelsdorf</div>
  <div style="display:flex; justify-content:space-between; gap:10mm">
    <div class="adresse">{{KUNDE_FIRMA}}<br>{{KUNDE_INHABER}}<br>{{KUNDE_STRASSE}}<br>{{KUNDE_PLZ}} {{KUNDE_ORT}}<br><span class="klein">{{KUNDE_USTID_FALLS_VORHANDEN}}</span></div>
    <table class="meta">
      <tr><td>Rechnungsnummer</td><td><strong>{{RECHNUNGSNUMMER}}</strong></td></tr>
      <tr><td>Rechnungsdatum</td><td>{{RECHNUNGSDATUM}}</td></tr>
      <tr><td>Leistungsdatum</td><td>{{LEISTUNGSDATUM}}</td></tr>
      <tr><td>Kundennummer</td><td>{{KUNDENNUMMER}}</td></tr>
    </table>
  </div>
  <h1>Rechnung</h1>
  <p>Hallo {{ANREDE_NAME}},<br>vielen Dank für deinen Auftrag. Wir berechnen dir folgende Leistung:</p>
  <table class="pos">
    <thead><tr><th style="width:9mm">Pos.</th><th>Leistung</th><th class="r">Menge</th><th class="r">Einzelpreis</th><th class="r">Gesamt</th></tr></thead>
    <tbody><tr>
      <td>1</td>
      <td><strong>GastroSite24 Restaurant-Website – Gründer-Aktion</strong><br>
        <span class="klein">Erstellung der Website für {{KUNDE_FIRMA}} mit Anruf-Knopf und Speisekarte, Einrichtung des Google-Unternehmensprofils, Hosting, Domain und Betreuung im 1. Vertragsjahr. Gründer-Preis für die ersten 10 Restaurants (regulär 499,00 € netto). Ohne Garantie auf eine bestimmte Platzierung bei Google.</span></td>
      <td class="r">1</td><td class="r">249,00 €</td><td class="r">249,00 €</td>
    </tr></tbody>
  </table>
  <table class="summe">
    <tr><td>Summe netto</td><td class="r">249,00 €</td></tr>
    <tr><td>zzgl. 19 % USt.</td><td class="r">47,31 €</td></tr>
    <tr class="gesamt"><td>Rechnungsbetrag</td><td class="r">296,31 €</td></tr>
  </table>
  <p style="margin-top:8mm">Bitte überweise den Rechnungsbetrag bis zum <strong>{{FAELLIG_AM}}</strong> (14 Tage) unter Angabe der Rechnungsnummer <strong>{{RECHNUNGSNUMMER}}</strong>.</p>
  <p class="klein">Ab dem 2. Vertragsjahr 299,00 € netto pro Jahr für Betreuung, Hosting und Domain (gesonderte Rechnung), kündbar jeweils zum Ende des Vertragsjahres.</p>
  <div class="fuss">
    <div>DSX Media Solutions UG (haftungsbeschränkt)<br>Am Weingarten 9<br>96117 Memmelsdorf</div>
    <div>Geschäftsführer: Domenic Schilling<br>Amtsgericht Bamberg · HRB 12150<br>USt-IdNr.: DE456133925</div>
    <div>Bank: {{BANK}}<br>IBAN: {{IBAN}}<br>BIC: {{BIC}}</div>
  </div>
</div></body></html>`;

const ZIEL_R = join(ORDNER, 'rechnung-vorlage');
const ZIEL_I = join(ORDNER, 'infoblaetter');
const ZIEL_B = join(ORDNER, 'bildschirmfotos');
for (const z of [ZIEL_I, ZIEL_B]) rmSync(z, { recursive: true, force: true });
for (const z of [ZIEL_R, join(ZIEL_I, 'pdf'), join(ZIEL_I, 'png'), ZIEL_B]) mkdirSync(z, { recursive: true });

const browser = await chromium.launch();
const druck = await browser.newPage({ deviceScaleFactor: 2 });

// 1) Rechnung
writeFileSync(join(ZIEL_R, 'rechnung-gruender-249.html'), rechnung());
await druck.goto(`file://${join(ZIEL_R, 'rechnung-gruender-249.html')}`);
await druck.pdf({ path: join(ZIEL_R, 'Rechnungsvorlage-Gruender-Aktion-249.pdf'), format: 'A4', printBackground: true });

// 2) Infoblätter
const qrBeispiel = await QRCode.toDataURL(BEISPIEL, { width: 300, margin: 1 });
const alle = [];
const zeilen = [];
for (const k of liste) {
  const link = entwurfLink(k);
  const qr = await QRCode.toDataURL(link, { width: 600, margin: 1 });
  const html = infoblatt(k, qr, qrBeispiel);
  const datei = `${k.kennung}-${slug(k.name)}`;
  await druck.setContent(html);
  await druck.pdf({ path: join(ZIEL_I, 'pdf', `${datei}.pdf`), format: 'A5', printBackground: true });
  await druck.setViewportSize({ width: 559, height: 794 }); // A5 bei 96 dpi
  await druck.screenshot({ path: join(ZIEL_I, 'png', `${datei}.png`), fullPage: false, scale: 'device' });
  alle.push(html.match(/<div class="seite">[\s\S]*<\/div><\/body>/)[0].replace('</body>', ''));
  zeilen.push(`| ${k.kennung} | ${anzeigeName(k.name)} | ${k.adresse} | \`${datei}.pdf\` / \`.png\` | ${link} |`);
}
// Sammel-PDF zum Drucken
await druck.setContent(`<!doctype html><html lang="de"><head><meta charset="utf-8"><style>${STIL} .seite{page-break-after:always}</style></head><body>${alle.join('')}</body></html>`);
await druck.pdf({ path: join(ZIEL_I, 'Infoblaetter-A5-alle.pdf'), format: 'A5', printBackground: true });

// 3) Handy-Bildschirmfotos (offline auf dem Handy zeigen)
const handy = await browser.newContext({ ...devices['iPhone 13'], locale: 'de-DE' });
const seite = await handy.newPage();
const fotos = [
  ['1-gratis-entwurf-formular', 'https://gastrosite24.de/gratis-entwurf?utm_source=vor-ort&utm_medium=besuch&utm_campaign=gruender-aktion'],
  ['2-beispiel-website', BEISPIEL],
  ['3-startseite-preis', 'https://gastrosite24.de/?utm_source=vor-ort&utm_medium=besuch&utm_campaign=gruender-aktion'],
];
for (const [name, url] of fotos) {
  await seite.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  // Einwilligungs-Hinweis wegklicken ("Nur notwendige"), damit er das Bild nicht verdeckt
  await seite.getByRole('button', { name: 'Nur notwendige' }).click({ timeout: 3000 }).catch(() => {});
  await seite.waitForTimeout(1500);
  // drei Bildschirmhöhen, ganze Seite wäre zu groß fürs Repo
  for (let i = 0; i < 3; i++) {
    await seite.evaluate(y => window.scrollTo(0, y), i * 760);
    await seite.waitForTimeout(600);
    await seite.screenshot({ path: join(ZIEL_B, `${name}-${i + 1}.png`) });
  }
}
await browser.close();

writeFileSync(join(ZIEL_I, 'liste.md'), `# Infoblätter A5 – Vor-Ort-Besuche Bamberg\n\nErzeugt mit \`../_baue-verkaufsset.mjs\` am ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC. Druckdatei für alle: \`Infoblaetter-A5-alle.pdf\`.\n\nDer QR-Code führt zum Gratis-Entwurf-Formular, mit dem Namen des Lokals im Link (\`utm_content\`), damit man später sieht, welches Blatt gescannt wurde. Eigene Entwürfe pro Restaurant gibt es nicht (siehe \`../handy-check/uebersicht.md\`).\n\n| # | Restaurant | Adresse | Datei | QR-Ziel |\n|---|---|---|---|---|\n${zeilen.join('\n')}\n`);
console.log(`Fertig: Rechnung, ${liste.length} Infoblätter, ${fotos.length * 3} Bildschirmfotos.`);
