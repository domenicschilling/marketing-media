// Schriftliches Angebot DSX-2026-1019-02 für Umzüge Neumann / Simon Umzüge
// node content/kunden/umzuege-neumann-simon/angebot.mjs → Angebot-Neumann-Simon-2026-10-19.(html|pdf) + Kopie ~/Downloads
import { chromium } from '../../../node_modules/playwright/index.mjs';
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const NAME = 'Angebot-Neumann-Simon-2026-10-19-v2';
const img = (f) => `data:image/${f.endsWith('.jpg') ? 'jpeg' : 'png'};base64,` + readFileSync(path.join(DIR, 'assets', f)).toString('base64');

// Preise (netto) – Summen werden gerechnet, nicht getippt
// Fassung 2 (19.10.): Websites je 649 € statt vorher 995 € je Website (1.990 € für beide), Angebotsprogramm wahlweise Kauf oder Monatsmiete
const P = { webJe: 649, webJeVorher: 995, webM: 59, google: 349, progKauf: 3490, progMiete: 299, pflege: 39 };
const web = 2 * P.webJe, webVorher = 2 * P.webJeVorher, webSpar = webVorher - web;
const kauf = { e: web + P.google + P.progKauf, m: P.webM };
const miete = { e: web + P.google, m: P.webM + P.progMiete };
const eur = (n) => n.toLocaleString('de-DE') + ' €';
if (web !== 1298 || webSpar !== 692 || kauf.e !== 5137 || miete.e !== 1647 || miete.m !== 358) throw new Error('Summen stimmen nicht');

const ic = {
  tel: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  wa: '<path d="M3 21l1.7-5A8.5 8.5 0 1 1 8 19.3z"/><path d="M9 10c0 3 2 5 5 5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  phone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.6 0l3-3a4 4 0 0 0-5.6-5.6l-1 1"/><path d="M14 10a4 4 0 0 0-5.6 0l-3 3a4 4 0 0 0 5.6 5.6l1-1"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
};
const svg = (k) => `<svg viewBox="0 0 24 24">${ic[k]}</svg>`;
const foot = (n) => `<footer><div><b>DSX Media Solutions UG (haftungsbeschränkt)</b> · Am Weingarten 9 · 96117 Memmelsdorf · info@dsxmediasolutions.de</div><div>HRB 12150 AG Bamberg · USt-IdNr. DE456133925 · Angebot DSX-2026-1019-02 · Seite ${n}</div></footer>`;
const browser = (src, h, url) => `<div class="bframe"><div class="bbar"><i></i><i></i><i></i><span>${url}</span></div><div style="height:${h};overflow:hidden"><img src="${src}" alt="" style="display:block;width:100%"></div></div>`;
const phone = (src, w, extra = '') => `<div class="phone" style="width:${w};${extra}"><img src="${src}" alt=""></div>`;

const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Angebot DSX-2026-1019-02 – Umzüge Neumann / Simon Umzüge</title>
<link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
@page{size:A4;margin:0}
:root{--b:#0054a6;--bd:#0b2545;--b2:#2988de;--bl:#eaf2fb;--ink:#14202c;--mut:#5a6876;--line:#dfe6ee;--soft:#f4f7fb;--green:#14804a;--greenbg:#e7f5ed;--amberbg:#fff4d6;--amber:#7a5b00}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Inter,sans-serif;color:var(--ink);font-size:10.6pt;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact;hyphens:none}
h1,h2,h3{hyphens:none;text-wrap:balance}
.page{width:210mm;height:297mm;padding:17mm 17mm 22mm;position:relative;overflow:hidden;page-break-after:always;break-after:page}
.page:last-child{page-break-after:auto}
footer{position:absolute;left:17mm;right:17mm;bottom:8mm;font-size:7pt;color:var(--mut);border-top:1px solid var(--line);padding-top:2mm;display:flex;flex-direction:column;gap:.4mm}
footer b{color:var(--ink);font-weight:600}
.part{display:inline-block;background:var(--bl);color:var(--b);font-weight:700;font-size:9pt;border-radius:20mm;padding:1mm 3.5mm;margin-bottom:3mm}
h2{font-size:22pt;line-height:1.12;letter-spacing:-.02em;color:var(--bd);font-weight:800;margin-bottom:2.5mm}
h3{font-size:12.5pt;color:var(--bd);margin-bottom:1.5mm}
.lead{font-size:11.5pt;color:#3a4856;max-width:160mm;margin-bottom:6mm}
.logo{font-family:"Archivo Black";color:var(--b);line-height:.92;text-shadow:1.2px 1.2px 0 rgba(0,40,90,.2)}
.bframe{border:1px solid #cfd8e2;border-radius:3mm;overflow:hidden;box-shadow:none;outline:0.25mm solid rgba(11,37,69,.14);background:#fff}
.bbar{height:6mm;background:#eef1f4;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:1.3mm;padding:0 3mm}
.bbar i{width:1.9mm;height:1.9mm;border-radius:50%;background:#c9d2dc;display:block}
.bbar span{margin-left:3mm;background:#fff;border-radius:1.5mm;padding:.3mm 3mm;font-size:6.8pt;color:var(--mut);flex:1}
.phone{border:2mm solid #111a24;border-radius:6.5mm;overflow:hidden;background:#111a24;box-shadow:none;outline:0.25mm solid rgba(11,37,69,.14)}
.phone img{display:block;width:100%;border-radius:4.4mm}
.cap{font-size:8pt;color:var(--mut);margin-top:2mm}
.steps{display:grid;gap:3mm}
.st{display:grid;grid-template-columns:10mm 1fr;gap:3mm;align-items:start}
.st .n{width:10mm;height:10mm;border-radius:50%;background:var(--b);color:#fff;font-weight:800;display:grid;place-items:center;font-size:12pt}
.st b{display:block;font-size:11pt}
.st p{color:var(--mut);font-size:10pt}
.feat{display:grid;grid-template-columns:1fr 1fr;gap:3.5mm 6mm}
.f{display:grid;grid-template-columns:11mm 1fr;gap:3mm;align-items:center}
.f .i{width:11mm;height:11mm;border-radius:3mm;background:var(--bl);display:grid;place-items:center}
.f .i svg,.ib svg{width:6mm;height:6mm;stroke:var(--b);fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
.f b{display:block;font-size:10.5pt}
.f span{font-size:9.2pt;color:var(--mut)}
.box{border-radius:3mm;padding:5mm 6mm}
.blue{background:var(--b);color:#fff}.blue h3{color:#fff}.blue p{color:#d6e6f7}
.soft{background:var(--soft)}
.tl{display:grid;grid-template-columns:repeat(5,1fr);gap:2mm;margin-top:3mm}
.tl div{border-top:1.2mm solid var(--b);background:var(--soft);border-radius:0 0 2mm 2mm;padding:3mm;font-size:9pt}
.tl div b{display:block;font-size:10pt;margin-bottom:.6mm}
.tl div span{color:var(--b);font-weight:700;font-size:8.2pt}
.check{list-style:none}
.check li{position:relative;padding:1.2mm 0 1.2mm 7mm}
.check li::before{content:"";position:absolute;left:0;top:2.2mm;width:4.2mm;height:4.2mm;border-radius:50%;background:var(--greenbg) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M6 12l4 4 8-9' stroke='%2314804a' stroke-width='3' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") center/3mm no-repeat}
.hint{background:var(--amberbg);color:var(--amber);border-radius:2mm;padding:2.5mm 3.5mm;font-size:8.6pt}
table.pr{width:100%;border-collapse:collapse;font-size:10.4pt}
table.pr th{text-align:left;font-size:8.6pt;color:var(--mut);font-weight:700;padding:2.5mm 3mm;border-bottom:2px solid var(--bd)}
table.pr th.r,table.pr td.r{text-align:right;white-space:nowrap}
table.pr td{padding:3.2mm 3mm;border-bottom:1px solid var(--line);vertical-align:top}
table.pr td small{display:block;color:var(--mut);font-size:8.6pt;font-weight:400}
table.pr tr.sum td{background:var(--soft);font-weight:700}
table.pr tr.kombi td{background:var(--b);color:#fff;font-weight:800;font-size:13pt;border:0}
table.pr tr.kombi td small{color:#cfe0f3}
table.pr tr.opt td{color:#3a4856}
.strike{text-decoration:line-through;color:var(--mut);font-weight:500}
.save{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin-top:5mm}
.save div{background:var(--greenbg);border-radius:3mm;padding:4mm 5mm}
.save b{display:block;font-size:20pt;color:var(--green);letter-spacing:-.01em}
.save span{color:#245a3c;font-size:9.5pt}
.terms{display:grid;grid-template-columns:1fr 1fr;gap:2mm 6mm;margin-top:5mm;font-size:9.6pt}
.terms div{display:grid;grid-template-columns:5mm 1fr;gap:2mm}
.terms .ib{width:5mm;height:5mm}
.terms .ib svg{width:5mm;height:5mm}
.ord{border:1.5px solid var(--line);border-radius:3mm}
.ord .o{display:grid;grid-template-columns:8mm 1fr auto;gap:3mm;align-items:center;padding:3.6mm 4mm;border-top:1px solid var(--line)}
.ord .o:first-child{border-top:0}
.ord .o.hl{background:var(--bl)}
.cb{width:6mm;height:6mm;border:1.6px solid var(--bd);border-radius:1.2mm}
.ord .o b{font-size:10.6pt}.ord .o small{display:block;color:var(--mut);font-size:8.8pt}
.ord .o .r{text-align:right;font-weight:700;white-space:nowrap}
.sig{display:grid;grid-template-columns:1fr 1fr;gap:10mm;margin-top:10mm}
.sig div{border-top:1.2px solid var(--ink);padding-top:1.5mm;font-size:8.6pt;color:var(--mut)}
.stamp{height:30mm;border:1.4px dashed #b8c4d2;border-radius:3mm;display:grid;place-items:center;color:#9aa8b8;font-size:9pt}
.gp{display:grid;grid-template-columns:1fr 1fr;gap:5mm}
.tag{display:inline-block;font-size:8pt;font-weight:700;border-radius:10mm;padding:.5mm 2.5mm;margin-bottom:2mm}
.t-blue{background:var(--bl);color:var(--b)}.t-green{background:var(--greenbg);color:var(--green)}
/* Deckblatt */
.cover{padding:0}
.cover .top{background:var(--bd);color:#fff;padding:16mm 17mm 0;height:150mm;position:relative}
.cover .meta{display:flex;justify-content:space-between;font-size:9pt;color:#b9cde0}
.cover h1{font-size:31pt;line-height:1.08;letter-spacing:-.02em;font-weight:800;margin-top:14mm;max-width:165mm}
.cover h1 em{font-style:normal;color:#8cc6ff}
.cover .sub{font-size:12pt;color:#cfe0f3;margin-top:4mm}
.mock{position:absolute;left:17mm;right:17mm;top:92mm;height:120mm}
.cover .low{position:absolute;left:17mm;right:17mm;bottom:22mm;display:grid;grid-template-columns:1fr 1fr 1fr;gap:6mm;font-size:9.4pt}
.cover .low b{display:block;font-size:8pt;color:var(--mut);font-weight:600;margin-bottom:1mm}
</style></head><body>

<!-- 1 DECKBLATT -->
<section class="page cover">
  <div class="top">
    <div class="meta"><span>DSX Media Solutions UG · Memmelsdorf bei Bamberg</span><span>Angebot DSX-2026-1019-02</span></div>
    <h1>Ihr Angebot: <em>Zwei neue Websites</em> + Ihr eigenes Angebots&shy;programm</h1>
    <div class="sub">Für Umzüge Neumann und Simon Umzüge, Bamberg</div>
  </div>
  <div class="mock">
    <div style="position:absolute;left:0;top:0;width:128mm">${browser(img('entwurf-desktop.png'), '84mm', 'neumann-umzuege.de')}</div>
    <div style="position:absolute;left:112mm;top:14mm">${phone(img('simon-entwurf-handy.png'), '34mm')}</div>
    <div style="position:absolute;left:142mm;top:4mm">${phone(img('entwurf-handy.png'), '34mm')}</div>
  </div>
  <div class="low">
    <div><b>Für</b>Umzüge Neumann / Simon Umzüge<br>z. Hd. der Geschäftsleitung<br>Heiliggrabstraße 2<br>96052 Bamberg</div>
    <div><b>Von</b>DSX Media Solutions UG (haftungsbeschränkt)<br>Ansprechpartner: Domenic Schilling<br>Am Weingarten 9, 96117 Memmelsdorf<br>info@dsxmediasolutions.de</div>
    <div><b>Angebot</b>Nr. DSX-2026-1019-02<br>Datum: 19.10.2026<br>Gültig bis: 02.11.2026</div>
  </div>
  ${foot(1)}
</section>

<!-- 2 AUF EINEN BLICK -->
<section class="page">
  <h2>Auf einen Blick</h2>
  <p class="lead">Sehr geehrte Damen und Herren,<br>vielen Dank für das gute Gespräch. Hier ist unser Angebot. Es besteht aus drei Teilen. Sie können alles zusammen nehmen oder einzelne Teile.</p>
  <div style="display:grid;gap:5mm">
    <div class="box soft" style="display:grid;grid-template-columns:14mm 1fr;gap:5mm;align-items:center"><div class="f"><div class="i" style="width:14mm;height:14mm">${svg('layers')}</div></div><div><h3>Teil A: Zwei neue Websites</h3><p>Eine für Umzüge Neumann, eine für Simon Umzüge. Modern, schnell am Handy, mit Anruf- und WhatsApp-Knopf. neumann-umzuege.de ist wieder online.</p></div></div>
    <div class="box soft" style="display:grid;grid-template-columns:14mm 1fr;gap:5mm;align-items:center"><div class="f"><div class="i" style="width:14mm;height:14mm">${svg('search')}</div></div><div><h3>Teil A: Bei Google gefunden werden</h3><p>Wir machen das Google-Profil von Umzüge Neumann komplett und legen für Simon Umzüge ein neues Profil an.</p></div></div>
    <div class="box soft" style="display:grid;grid-template-columns:14mm 1fr;gap:5mm;align-items:center"><div class="f"><div class="i" style="width:14mm;height:14mm">${svg('key')}</div></div><div><h3>Teil B: Ihr eigenes Angebotsprogramm</h3><p>Nur für Ihr Büro. Möbel antippen, Preis steht fertig. Das Angebot geht als PDF oder per WhatsApp an den Kunden. Statt 60 Minuten nur noch etwa 10.</p></div></div>
  </div>
  <div class="save" style="margin-top:6mm">
    <div><b>Je Website nur ${eur(P.webJe)}</b><span>statt ${eur(P.webJeVorher)} – Sie sparen ${eur(webSpar)} bei beiden Websites</span></div>
    <div style="background:var(--soft)"><b style="color:var(--bd)">Kaufen oder mieten</b><span style="color:var(--ink)">Angebotsprogramm einmalig ${eur(P.progKauf)} oder ${eur(P.progMiete)} im Monat</span></div>
  </div>
  <div class="box blue" style="margin-top:5mm;display:grid;grid-template-columns:1fr 1fr;gap:6mm">
    <div><h3>Alles zusammen · Programm gekauft</h3><div style="font-size:21pt;font-weight:800;line-height:1.15;margin-top:2mm">${eur(kauf.e)}</div><p>einmalig + ${eur(kauf.m)} im Monat · netto</p></div>
    <div><h3>Alles zusammen · Programm gemietet</h3><div style="font-size:21pt;font-weight:800;line-height:1.15;margin-top:2mm">${eur(miete.e)}</div><p>einmalig + ${eur(miete.m)} im Monat · netto</p></div>
  </div>
  <p style="margin-top:4mm;color:var(--mut)">Alle Preise im Einzelnen finden Sie auf Seite 9.</p>
  <p style="margin-top:8mm">Mit freundlichen Grüßen<br><b>Domenic Schilling</b><br><span style="color:var(--mut)">DSX Media Solutions UG</span></p>
  ${foot(2)}
</section>

<!-- 3 WEBSITE NEUMANN -->
<section class="page">
  <span class="part">Teil A · Websites</span>
  <h2>So sieht Ihre neue Website aus: Umzüge Neumann</h2>
  <p class="lead">Mit Ihrem Logo, Ihrem Blau und Ihren Leistungen. Am Computer und am Handy.</p>
  <div style="display:grid;grid-template-columns:1fr 48mm;gap:6mm;align-items:start">
    ${browser(img('entwurf-desktop.png'), '150mm', 'neumann-umzuege.de')}
    <div>${phone(img('entwurf-handy.png'), '48mm')}<p class="cap">So sieht es am Handy aus. Anrufen und WhatsApp sind immer mit einem Tipp erreichbar.</p></div>
  </div>
  <h3 style="margin-top:6mm">Was wir machen</h3>
  <div class="steps" style="grid-template-columns:repeat(3,1fr)">
    <div class="st"><div class="n">1</div><div><b>Wir bauen</b><p>Texte, Bilder, Aufbau. Sie müssen nichts programmieren.</p></div></div>
    <div class="st"><div class="n">2</div><div><b>Sie schauen drüber</b><p>Sie sagen, was anders sein soll. Wir ändern es.</p></div></div>
    <div class="st"><div class="n">3</div><div><b>Wir schalten frei</b><p>Und kümmern uns danach um alles Technische.</p></div></div>
  </div>
  ${foot(3)}
</section>

<!-- 4 WEBSITE SIMON -->
<section class="page">
  <span class="part">Teil A · Websites</span>
  <h2>Und die zweite Website: Simon Umzüge</h2>
  <p class="lead">Mit dem bekannten Simon-Logo in Blau und Gelb und Ihrem Spruch: „Mit Simon Umzüge flieg ich durch die Welt.“</p>
  <div style="display:grid;grid-template-columns:1fr 48mm;gap:6mm;align-items:start">
    ${browser(img('simon-entwurf-desktop.png'), '150mm', 'simon-umzuege.de')}
    <div>${phone(img('simon-entwurf-handy.png'), '48mm')}<p class="cap">Gleiches System, eigener Auftritt. Telefon 0951 5191770 immer griffbereit.</p></div>
  </div>
  <div class="box soft" style="margin-top:6mm;display:grid;grid-template-columns:1fr 1fr;gap:6mm">
    <div><h3>Zwei Auftritte, ein System</h3><p>Beide Websites laufen auf derselben Technik. Neue Leistungen oder Bilder tragen wir einmal ein – fertig.</p></div>
    <div><h3>Ihre Domains bleiben Ihr Eigentum</h3><p>neumann-umzuege.de und simon-umzuege.de gehören weiter Ihnen. Wir richten sie nur ein.</p></div>
  </div>
  ${foot(4)}
</section>

<!-- 5 FUNKTIONEN + ABLAUF -->
<section class="page">
  <span class="part">Teil A · Websites</span>
  <h2>Das bekommen Sie</h2>
  <p class="lead">Alles, was eine gute Umzugs-Website heute braucht.</p>
  <div class="feat">
    <div class="f"><div class="i">${svg('tel')}</div><div><b>Anruf- und WhatsApp-Knopf</b><span>Ein Tipp – und der Kunde ist bei Ihnen.</span></div></div>
    <div class="f"><div class="i">${svg('clock')}</div><div><b>Anfrage in 2 Minuten</b><span>Kurz, einfach, auch abends und am Sonntag.</span></div></div>
    <div class="f"><div class="i">${svg('phone')}</div><div><b>Schnell am Handy</b><span>Die meisten Kunden suchen am Handy.</span></div></div>
    <div class="f"><div class="i">${svg('search')}</div><div><b>Bei Google gefunden werden</b><span>Mit Google-Profil für beide Marken.</span></div></div>
    <div class="f"><div class="i">${svg('star')}</div><div><b>Bewertungen</b><span>Zufriedene Kunden zeigen, dass man Ihnen trauen kann.</span></div></div>
    <div class="f"><div class="i">${svg('shield')}</div><div><b>Impressum und Datenschutz aktuell</b><span>Damit Sie rechtlich auf der sicheren Seite sind.</span></div></div>
    <div class="f"><div class="i">${svg('layers')}</div><div><b>Beide Seiten aus einem System</b><span>Einmal pflegen, an beiden Stellen aktuell.</span></div></div>
    <div class="f"><div class="i">${svg('link')}</div><div><b>neumann-umzuege.de wieder online</b><span>Heute sehen Besucher dort nur eine Fehlerseite.</span></div></div>
  </div>
  <div class="box blue" style="margin-top:7mm;display:grid;grid-template-columns:12mm 1fr;gap:5mm;align-items:center">
    <div class="f"><div class="i" style="background:rgba(255,255,255,.15)"><svg viewBox="0 0 24 24" style="stroke:#fff">${ic.key}</svg></div></div>
    <div><h3>Die Domains bleiben Ihr Eigentum</h3><p>Wir kümmern uns um Technik, Sicherheit und Updates. Ihre Adressen im Internet gehören immer Ihnen.</p></div>
  </div>
  <h3 style="margin-top:8mm">So läuft es ab</h3>
  <div class="tl">
    <div><span>Schritt 1</span><b>Gespräch</b>Wir klären Ihre Wünsche.</div>
    <div><span>Schritt 2</span><b>Inhalte und Zugänge</b>Sie schicken Logo, Fotos und Zugänge.</div>
    <div><span>7 Werktage</span><b>Entwurf</b>Sie sehen beide Websites.</div>
    <div><span>Schritt 4</span><b>Korrekturen</b>Sie sagen, was anders soll.</div>
    <div><span>Fertig</span><b>Online</b>Beide Websites sind live.</div>
  </div>
  ${foot(5)}
</section>

<!-- 6 GOOGLE -->
<section class="page">
  <span class="part">Teil A · Google</span>
  <h2>Bei Google gefunden werden</h2>
  <p class="lead">Wer „Umzug Bamberg“ sucht, sieht zuerst die Google-Profile. Dort entscheidet sich, wen der Kunde anruft.</p>
  <div style="display:grid;grid-template-columns:1fr 52mm;gap:7mm;align-items:start">
    <div style="display:grid;gap:5mm">
      <div class="box soft"><span class="tag t-blue">Umzüge Neumann</span><h3>Bestehendes Profil verbessern</h3>
        <ul class="check">
          <li>Website eintragen <span style="color:var(--mut)">(fehlt heute)</span></li>
          <li>Öffnungszeiten eintragen <span style="color:var(--mut)">(fehlen heute)</span></li>
          <li>Leistungen und Beschreibung ergänzen</li>
          <li>Fotos von Team, Fahrzeugen und Laden</li>
          <li>Bewertungen sammeln und beantworten: mit Link und QR-Code für zufriedene Kunden</li>
          <li>Google-Beiträge, zum Beispiel „Freie Termine im November“</li>
        </ul></div>
      <div class="box soft"><span class="tag t-green">Simon Umzüge</span><h3>Neues Profil erstellen</h3>
        <ul class="check">
          <li>Einrichten als Umzugsunternehmen</li>
          <li>Einzugsgebiet, Leistungen und Fotos</li>
          <li>Verknüpft mit der neuen Website</li>
        </ul>
        <p class="hint" style="margin-top:2mm">Wichtig: Die Bestätigung bei Google macht der Inhaber selbst – meist per kurzem Video oder Postkarte. Wir helfen Ihnen dabei.</p></div>
    </div>
    <div>${phone(img('google-profil-neumann.png'), '52mm')}<p class="cap">So könnte Ihr Neumann-Profil danach aussehen. Vereinfachte Darstellung, Fotos folgen von Ihnen.</p></div>
  </div>
  <div class="box" style="margin-top:6mm;border:1.5px solid var(--line);display:flex;justify-content:space-between;gap:6mm;align-items:center">
    <div><h3>Auf Wunsch: Google-Pflege jeden Monat</h3><p style="color:var(--mut)">Wir posten Beiträge, laden neue Fotos hoch und antworten auf Bewertungen. Freiwillig, zum Ankreuzen.</p></div>
    <div style="text-align:right;white-space:nowrap"><b style="font-size:15pt;color:var(--bd)">${eur(P.pflege)}</b><br><span style="color:var(--mut);font-size:9pt">pro Monat · netto</span></div>
  </div>
  ${foot(6)}
</section>

<!-- 7 ANGEBOTSPROGRAMM -->
<section class="page">
  <span class="part">Teil B · Nur für Ihr Büro</span>
  <h2>Ihr eigenes Angebotsprogramm</h2>
  <p class="lead">Exklusiv für Ihren Innendienst. Ihre Kunden sehen das Programm nicht – sie bekommen nur das fertige Angebot.</p>
  <div class="bframe">${'<div class="bbar"><i></i><i></i><i></i><span>Angebotsprogramm · Umzüge Neumann</span></div>'}<img src="${img('angebotsprogramm.png')}" alt="" style="display:block;width:100%"></div>
  <h3 style="margin-top:7mm">So einfach geht ein Angebot</h3>
  <div class="steps" style="grid-template-columns:1fr 1fr;gap:4mm 7mm">
    <div class="st"><div class="n">1</div><div><b>Adressen eintragen</b><p>Kilometer und Fahrzeit rechnet das Programm selbst.</p></div></div>
    <div class="st"><div class="n">2</div><div><b>Stockwerk, Aufzug, Trageweg ankreuzen</b><p>Nichts wird vergessen – auch nicht das Halteverbot.</p></div></div>
    <div class="st"><div class="n">3</div><div><b>Möbel antippen</b><p>Kubikmeter und Lkw-Größe kommen automatisch.</p></div></div>
    <div class="st"><div class="n">4</div><div><b>Preis steht fertig</b><p>Als PDF oder per WhatsApp an den Kunden.</p></div></div>
  </div>
  <p class="hint" style="margin-top:6mm">Entwurf mit Beispielwerten. Ihre eigenen Preise und Fahrzeuge tragen wir einmal ein.</p>
  ${foot(7)}
</section>

<!-- 8 ANGEBOTSPROGRAMM 2 -->
<section class="page">
  <span class="part">Teil B · Nur für Ihr Büro</span>
  <h2>Von der Besichtigung zum fertigen Angebot</h2>
  <div style="display:grid;grid-template-columns:1.45fr 1fr;gap:6mm;align-items:start;margin-top:4mm">
    <div><div style="border:2.4mm solid #111a24;border-radius:5mm;overflow:hidden;box-shadow:none;outline:0.25mm solid rgba(11,37,69,.14)"><img src="${img('angebotsprogramm-tablet.png')}" alt="" style="display:block;width:100%"></div>
      <p class="cap"><b>Bei der Besichtigung:</b> Möbel am Tablet antippen. Das Volumen wächst mit.</p></div>
    <div><div style="border:1px solid #cfd8e2;box-shadow:none;outline:0.25mm solid rgba(11,37,69,.14)"><img src="${img('angebotsprogramm-pdf.png')}" alt="" style="display:block;width:100%"></div>
      <p class="cap"><b>Das bekommt Ihr Kunde:</b> ein sauberes Angebot mit Ihrem Briefkopf.</p></div>
  </div>
  <h3 style="margin-top:7mm">Das bringt Ihnen das Programm</h3>
  <div class="feat">
    <div class="f"><div class="i">${svg('clock')}</div><div><b>Angebot in 10 statt 60 Minuten</b><span>Mehr Zeit für Aufträge.</span></div></div>
    <div class="f"><div class="i">${svg('layers')}</div><div><b>Jeder im Büro rechnet gleich</b><span>Gleiche Preise, egal wer rechnet.</span></div></div>
    <div class="f"><div class="i">${svg('check')}</div><div><b>Nichts vergessen</b><span>Halteverbot, Stockwerk, Trageweg sind dabei.</span></div></div>
    <div class="f"><div class="i">${svg('search')}</div><div><b>Alle Angebote an einem Ort</b><span>Schnell wiederfinden, schnell nachfassen.</span></div></div>
  </div>
  <div class="box blue" style="margin-top:7mm"><h3>Exklusiv: individuell für Neumann und Simon gebaut</h3><p>Kein Programm von der Stange. Ihre Preise, Ihre Fahrzeuge, Ihre Abläufe – einmal eingerichtet, jeden Tag genutzt.</p></div>
  <p class="hint" style="margin-top:5mm">Alle Zahlen in den Bildern sind Beispielwerte.</p>
  ${foot(8)}
</section>

<!-- 9 PREISE -->
<section class="page">
  <h2>Ihre Preise</h2>
  <p class="lead">Alle Preise netto, zuzüglich 19 % MwSt.</p>
  <table class="pr">
    <tr><th>Position</th><th class="r">Einmalig</th><th class="r">Monatlich</th></tr>
    <tr><td><b>Website Umzüge Neumann</b><small>Modern, schnell am Handy, mit Anruf- und WhatsApp-Knopf.</small></td><td class="r"><span class="strike">${eur(P.webJeVorher)}</span><br>${eur(P.webJe)}</td><td class="r" rowspan="2" style="vertical-align:middle">${eur(P.webM)}<small style="display:block;color:var(--mut);font-weight:400">für beide</small></td></tr>
    <tr><td><b>Website Simon Umzüge</b><small>Gleiches System, eigener Auftritt. Monatlich: Technik, Sicherheit, Updates und kleine Änderungen.</small></td><td class="r"><span class="strike">${eur(P.webJeVorher)}</span><br>${eur(P.webJe)}</td></tr>
    <tr><td><b>Google-Profile für beide Marken</b><small>Neumann verbessern, Simon neu anlegen.</small></td><td class="r">${eur(P.google)}</td><td class="r">–</td></tr>
    <tr class="sum"><td>Angebotsprogramm für den Innendienst – Sie wählen:</td><td class="r"></td><td class="r"></td></tr>
    <tr><td><b>Variante Kauf</b><small>Einmal zahlen, dauerhaft nutzen. Keine monatlichen Kosten für das Programm.</small></td><td class="r">${eur(P.progKauf)}</td><td class="r">–</td></tr>
    <tr><td><b>Variante Miete</b><small>Keine Anschaffungskosten. Betrieb, Updates und Hilfe bei Fragen inklusive.</small></td><td class="r">–</td><td class="r">${eur(P.progMiete)}</td></tr>
    <tr class="opt"><td><b>Optional: Google-Pflege monatlich</b><small>Beiträge, Fotos, Antworten auf Bewertungen.</small></td><td class="r">–</td><td class="r">${eur(P.pflege)}</td></tr>
  </table>
  <div class="save">
    <div><b>${eur(webSpar)} gespart</b><span>bei den Websites: ${eur(web)} statt ${eur(webVorher)}</span></div>
    <div style="background:var(--soft)"><b style="color:var(--bd);font-size:13pt">Kauf: ${eur(kauf.e)} + ${eur(kauf.m)}/Monat</b><span style="color:var(--ink)">Miete: ${eur(miete.e)} + ${eur(miete.m)}/Monat<br>jeweils alles zusammen, netto</span></div>
  </div>
  <div class="terms">
    <div><span class="ib">${svg('check')}</span><span>Jeder Teil ist auch einzeln buchbar.</span></div>
    <div><span class="ib">${svg('check')}</span><span>Monatliche Kosten: mindestens 12 Monate, danach monatlich kündbar.</span></div>
    <div><span class="ib">${svg('check')}</span><span>Zahlung einmalig: 50 % bei Auftrag, 50 % bei Fertigstellung.</span></div>
    <div><span class="ib">${svg('check')}</span><span>Angebot gültig bis 02.11.2026.</span></div>
  </div>
  <div class="box blue" style="margin-top:7mm;text-align:center"><h3 style="font-size:14pt">Keine versteckten Kosten. Domains bleiben bei Ihnen.</h3></div>
  ${foot(9)}
</section>

<!-- 10 AUFTRAG -->
<section class="page">
  <h2>Auftrag erteilen</h2>
  <p class="lead">Einfach ankreuzen, unterschreiben und an uns zurückgeben – per Foto, E-Mail oder persönlich.</p>
  <div class="ord">
    <div class="o hl"><div class="cb"></div><div><b>Websites Neumann + Simon</b><small>je ${eur(P.webJe)} statt ${eur(P.webJeVorher)}</small></div><div class="r">${eur(web)} + ${eur(P.webM)}/Monat</div></div>
    <div class="o hl"><div class="cb"></div><div><b>Google-Profile für beide Marken</b></div><div class="r">${eur(P.google)}</div></div>
    <div class="o hl"><div class="cb"></div><div><b>Angebotsprogramm – Kauf</b><small>einmal zahlen, dauerhaft nutzen</small></div><div class="r">${eur(P.progKauf)}</div></div>
    <div class="o"><div class="cb"></div><div><b>oder Angebotsprogramm – Miete</b><small>ohne Anschaffungskosten</small></div><div class="r">${eur(P.progMiete)}/Monat</div></div>
    <div class="o"><div class="cb"></div><div><b>Zusätzlich: Google-Pflege monatlich</b></div><div class="r">${eur(P.pflege)}/Monat</div></div>
  </div>
  <p style="font-size:9pt;color:var(--mut);margin-top:3mm">Alle Preise netto zzgl. 19 % MwSt. Bitte beim Angebotsprogramm Kauf oder Miete ankreuzen. Es gelten die Bedingungen auf Seite 9.</p>
  <h3 style="margin-top:7mm">Nach Ihrem Auftrag</h3>
  <div class="tl" style="grid-template-columns:repeat(3,1fr)">
    <div><span>Sofort</span><b>Wir melden uns</b>und klären die nächsten Schritte.</div>
    <div><span>Sie schicken</span><b>Inhalte und Zugänge</b>Logo, Fotos, Domain- und Google-Zugang.</div>
    <div><span>7 Werktage danach</span><b>Erster Entwurf</b>Sie schauen drüber, wir ändern.</div>
  </div>
  <div class="sig">
    <div>Ort, Datum</div><div>Unterschrift</div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10mm;margin-top:8mm">
    <div class="stamp">Firmenstempel</div>
    <div style="font-size:9pt;color:var(--mut)"><b style="color:var(--ink)">Kleine Hinweise</b><br>Die Website-Bilder sind Entwürfe. Fotos ersetzen wir durch Ihre eigenen. Die Zahlen im Angebotsprogramm sind Beispielwerte.<br><br>Fragen? Domenic Schilling<br>info@dsxmediasolutions.de</div>
  </div>
  ${foot(10)}
</section>
</body></html>`;

const out = path.join(DIR, NAME + '.html');
writeFileSync(out, html);
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('file://' + out, { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
const over = await p.evaluate(() => [...document.querySelectorAll('.page')].map((pg, i) => {
  const f = pg.querySelector('footer').getBoundingClientRect().top; let max = 0;
  pg.querySelectorAll('h1,h2,h3,p,li,td,.st,.f,.box,.tl,.ord,.sig,.stamp,.save,.terms,.cap,.hint,.bframe,.phone').forEach((e) => { if (e.closest('footer') || e.closest('.mock')) return; const bt = e.getBoundingClientRect().bottom; if (bt > max) max = bt; });
  return { s: i + 1, rest: Math.round(f - max) };
}));
console.log(JSON.stringify(over));
// Bilder als JPEG neu einbetten (PNG-Screenshots machen das PDF sonst ca. 8 MB groß); Ansicht bleibt gleich
await p.evaluate(async () => {
  for (const im of document.querySelectorAll('img')) {
    if (!im.src.startsWith('data:image/png') || im.naturalWidth < 400) continue;
    const c = document.createElement('canvas'); const k = Math.min(1, 1600 / im.naturalWidth);
    c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
    im.src = c.toDataURL('image/jpeg', 0.84); await im.decode();
  }
});
for (const n of [2, 9, 10]) await (await p.$$('.page'))[n - 1].screenshot({ path: path.join(os.tmpdir(), `angebot-s${n}.png`) });
const pdf = path.join(DIR, NAME + '.pdf');
await p.pdf({ path: pdf, format: 'A4', printBackground: true, preferCSSPageSize: true });
copyFileSync(pdf, path.join(os.homedir(), 'Downloads', NAME + '.pdf'));
await b.close();
