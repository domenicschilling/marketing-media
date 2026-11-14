// Gesprächsvorbereitung Umzüge Neumann / Simon Umzüge – 19.10.2026
// node content/kunden/umzuege-neumann-simon/build.mjs  → HTML + PDF (A ohne Preise, B mit Preisen)
import { chromium } from '../../../node_modules/playwright/index.mjs';
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const img = (f) => 'data:image/' + (f.endsWith('.jpg') ? 'jpeg' : 'png') + ';base64,' + readFileSync(path.join(DIR, 'assets', f)).toString('base64');

function build(P) {
  // P = true → Fassung B (mit Preisen + Notizen für Domenic)
  const preis = (t) => (P ? `<span class="preis">${t}</span>` : '');
  const note = (t) => (P ? `<div class="note"><b>Nur für Domenic</b>${t}</div>` : '');
  const foot = (n) => `<footer><span>DSX Media Solutions UG · Bamberg</span><span>Gesprächsvorbereitung Umzüge Neumann / Simon Umzüge${P ? ' · intern mit Preisen' : ''}</span><span>${n}</span></footer>`;

  const tools = [
    ['Online-Umzugsrechner', 'Kunden klicken ihre Möbel an, sehen Kubikmeter und einen Richtpreis und schicken die Anfrage direkt ab. Ersetzt das lange Formular und liefert vollständige Angaben.', 'ab 1.490 € einmalig + 39 €/Monat'],
    ['Video- oder Foto-Besichtigung', 'Kunden filmen ihre Räume mit dem Handy oder laden Fotos hoch. Spart Fahrten zur Besichtigung, gerade bei Fernumzügen.', 'ab 2.500 € (eigenes Tool)'],
    ['Angebot per Sprache', 'Angebot nach der Besichtigung einfach ins Handy sprechen, fertig ist ein sauberes PDF-Angebot. Dafür haben wir „angebot.new“.', '39–79 €/Monat'],
    ['WhatsApp mit Sofort-Antwort', 'Jede Anfrage bekommt sofort eine freundliche Antwort mit den wichtigsten Fragen und einem Terminvorschlag. Läuft über unsere eigene WhatsApp-Plattform.', 'ab 49 €/Monat'],
    ['Online-Terminbuchung', 'Besichtigungs- oder Beratungstermine direkt online buchen, mit Erinnerung. Weniger Telefon-Pingpong.', 'zu klären (ggf. Teil des Rechners)'],
    ['Anzahlung per Link', 'Nach Auftragsbestätigung geht ein Zahlungslink raus (Stripe). Sichert den Termin und verringert kurzfristige Absagen.', 'zu klären (ggf. Teil der Website)'],
    ['Bewertungs-Erinnerung', 'Ein bis zwei Tage nach dem Umzug kommt automatisch die Bitte um eine Google-Bewertung. Mehr Sterne, mehr Vertrauen.', 'zu klären (mit WhatsApp-Automatik)'],
    ['Kartons und Packmaterial online', 'Kartons leihen oder kaufen, Abholung oder Lieferung. Zusatzumsatz, den heute oft der Baumarkt macht.', 'ab 2.500 € (eigenes Tool)'],
    ['Halteverbotszone als Service', 'Kunden buchen die Halteverbotszone gleich mit. Ein klarer Zusatz-Baustein, den viele nicht selbst organisieren wollen.', 'zu klären (ggf. Teil des Rechners)'],
    ['Anfragen-Übersicht (Dashboard)', 'Alle Anfragen aus Website, WhatsApp, Telefon an einem Ort: neu, Angebot raus, gebucht, erledigt. Nichts geht mehr verloren.', 'ab 2.500 € (eigenes Tool)'],
  ];

  return `<!doctype html><html lang="de"><head><meta charset="utf-8">
<title>${P ? 'Gesprächsvorbereitung (intern, mit Preisen)' : 'Ihr digitaler Auftritt'} – Umzüge Neumann / Simon Umzüge</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
@page{size:A4;margin:0}
:root{--ink:#14202e;--muted:#5a6878;--line:#dde3ea;--soft:#f2f5f8;--navy:#0e2f4f;--blue:#1f6fb2;--sky:#e7f0f8;--red:#b42318;--redbg:#fdecea;--green:#1b7a4b;--greenbg:#e8f4ee;--amber:#8a5a00;--amberbg:#fff4d6}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#fff}
body{font-family:Inter,system-ui,sans-serif;color:var(--ink);font-size:9.6pt;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;height:297mm;padding:16mm 16mm 14mm;position:relative;overflow:hidden;page-break-after:always;break-after:page}
.page:last-child{page-break-after:auto;break-after:auto}
footer{position:absolute;left:16mm;right:16mm;bottom:8mm;display:flex;justify-content:space-between;font-size:7.4pt;color:var(--muted);border-top:1px solid var(--line);padding-top:2.2mm}
h1{font-size:30pt;line-height:1.08;letter-spacing:-.02em;font-weight:800}
h2{font-size:17pt;letter-spacing:-.01em;font-weight:750;color:var(--navy);margin-bottom:1.5mm}
h2 .nr{display:inline-block;width:8.5mm;height:8.5mm;border-radius:50%;background:var(--navy);color:#fff;font-size:10.5pt;text-align:center;line-height:8.5mm;margin-right:2.5mm;vertical-align:3px}
h3{font-size:11pt;font-weight:700;margin-bottom:1mm}
.lead{color:var(--muted);font-size:10pt;margin-bottom:5mm;max-width:165mm}
p+p{margin-top:1.6mm}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:4mm}
.card{border:1px solid var(--line);border-radius:3mm;padding:4mm 4.5mm;background:#fff}
.card.soft{background:var(--soft);border-color:var(--soft)}
.kv{display:grid;grid-template-columns:24mm 1fr;gap:1mm 3mm;font-size:9pt;margin-top:2mm}
.kv dt{color:var(--muted)}
.tag{display:inline-block;font-size:7.8pt;font-weight:650;padding:.6mm 2.2mm;border-radius:10mm;vertical-align:1px}
.t-red{background:var(--redbg);color:var(--red)}.t-green{background:var(--greenbg);color:var(--green)}.t-amber{background:var(--amberbg);color:var(--amber)}.t-blue{background:var(--sky);color:var(--blue)}
ol.find{list-style:none;counter-reset:f}
ol.find>li{counter-increment:f;position:relative;padding:2.6mm 0 2.6mm 11mm;border-top:1px solid var(--line)}
ol.find>li:first-child{border-top:0}
ol.find>li::before{content:counter(f);position:absolute;left:0;top:2.6mm;width:7mm;height:7mm;border-radius:50%;background:var(--soft);color:var(--navy);font-weight:700;text-align:center;line-height:7mm;font-size:9pt}
ol.find>li.crit::before{background:var(--red);color:#fff}
ol.find b{font-weight:650}
.src{font-size:7.6pt;color:var(--muted)}
.shot{border:1px solid var(--line);border-radius:2.5mm;overflow:hidden;display:block}
.shot img{display:block;width:100%}
.browser{background:#eef1f4;padding:1.6mm 2.5mm;font-size:7.4pt;color:var(--muted);border-bottom:1px solid var(--line)}
.check{list-style:none}
.check li{position:relative;padding:1.15mm 0 1.15mm 6.5mm}
.check li::before{content:"";position:absolute;left:0;top:2.15mm;width:3.4mm;height:3.4mm;border:1.4px solid var(--blue);border-radius:.8mm}
.dot{list-style:none}
.dot li{position:relative;padding:.7mm 0 .7mm 4.5mm}
.dot li::before{content:"";position:absolute;left:.6mm;top:2.6mm;width:1.6mm;height:1.6mm;border-radius:50%;background:var(--blue)}
.preis{display:inline-block;font-weight:700;color:var(--navy);background:var(--sky);border-radius:1.5mm;padding:.3mm 2mm;font-size:8.6pt;margin-top:1mm}
.note{border-left:3px solid #c98a00;background:var(--amberbg);padding:2.6mm 3.5mm;border-radius:0 2mm 2mm 0;font-size:8.6pt;margin-top:3mm}
.note b{display:block;color:var(--amber);font-size:7.8pt;margin-bottom:.6mm}
.tools{display:grid;grid-template-columns:1fr 1fr;gap:3mm}
.tool{border:1px solid var(--line);border-radius:2.5mm;padding:3mm 3.8mm}
.tool h3{font-size:10pt;margin-bottom:.6mm;display:flex;gap:2mm;align-items:baseline}
.tool h3 span{color:var(--blue);font-weight:800;font-size:9pt}
.tool p{font-size:8.7pt;color:#33414f;line-height:1.45}
.rec{background:var(--navy);color:#fff;border-radius:3mm;padding:4.5mm 5mm}
.rec h3{color:#fff}.rec p{color:#d6e2ee}
.steps{display:grid;grid-template-columns:repeat(4,1fr);gap:2.5mm;margin-top:2mm}
.step{border-top:3px solid var(--blue);background:var(--soft);padding:2.8mm 3mm;border-radius:0 0 2mm 2mm;font-size:8.6pt}
.step b{display:block;font-size:9.2pt;margin-bottom:.5mm}
.step .when{color:var(--blue);font-weight:650;font-size:8pt}
.q{display:grid;grid-template-columns:5.5mm 1fr;gap:0 2mm;padding:1.6mm 0;border-top:1px solid var(--line);font-size:9pt}
.q .box{width:3.6mm;height:3.6mm;border:1.4px solid var(--navy);border-radius:.8mm;margin-top:.9mm}
.q .lines{grid-column:2;height:${P ? '4.5mm' : '6.5mm'};border-bottom:1px dotted #9fb0c2}
table.price{width:100%;border-collapse:collapse;font-size:9pt}
table.price td{padding:1.5mm 0;border-top:1px solid var(--line);vertical-align:top}
table.price td:last-child{text-align:right;white-space:nowrap;font-weight:650;padding-left:4mm}
.pk{border:1.5px solid var(--line);border-radius:3mm;padding:3.5mm 4mm}
.pk.hl{border-color:var(--blue)}
.pk .sum{font-size:13pt;font-weight:800;color:var(--navy);margin:1mm 0}
/* Deckblatt */
.cover{padding:0;display:flex;flex-direction:column}
.cover .top{background:var(--navy);color:#fff;padding:22mm 18mm 16mm;flex:0 0 auto;position:relative}
.cover .top .by{font-size:9pt;color:#b9cde0;letter-spacing:.01em}
.cover .top h1{color:#fff;margin:26mm 0 4mm;font-size:34pt}
.cover .top .sub{font-size:13pt;color:#d6e2ee;max-width:150mm}
.cover .route{position:absolute;right:18mm;top:20mm;opacity:.9}
.cover .mid{padding:12mm 18mm 0;flex:1}
.firms{display:grid;grid-template-columns:1fr 1fr;gap:5mm}
.firm{border:1px solid var(--line);border-radius:3mm;padding:5mm}
.firm .n{font-size:13pt;font-weight:750;color:var(--navy);line-height:1.25}
.firm .a{font-size:9pt;color:var(--muted);margin-top:1.5mm}
.toc{margin-top:10mm;display:grid;grid-template-columns:1fr 1fr;gap:0 8mm}
.toc div{display:flex;gap:3mm;padding:2.2mm 0;border-top:1px solid var(--line);font-size:10pt}
.toc div span{color:var(--blue);font-weight:700;width:5mm}
.cover .bottom{padding:0 18mm 14mm;display:flex;justify-content:space-between;align-items:flex-end;font-size:9pt;color:var(--muted)}
.cover .bottom strong{color:var(--ink);font-size:10pt}
.intern{display:inline-block;background:#c98a00;color:#fff;font-weight:700;font-size:8.5pt;padding:1mm 3mm;border-radius:1.5mm;margin-bottom:3mm}
.bframe{border:1px solid #cfd8e2;border-radius:3mm;overflow:hidden;box-shadow:0 2mm 6mm rgba(14,47,79,.12);background:#fff}
.bbar{height:6.5mm;background:#eef1f4;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:1.4mm;padding:0 3mm}
.bbar i{width:2mm;height:2mm;border-radius:50%;background:#c9d2dc;display:block}
.bbar span{margin-left:3mm;background:#fff;border-radius:1.5mm;padding:.4mm 3mm;font-size:6.8pt;color:var(--muted);flex:1}
.phone{border:2.2mm solid #111a24;border-radius:7mm;overflow:hidden;background:#111a24;box-shadow:0 2mm 6mm rgba(14,47,79,.18);position:relative}
.phone img{display:block;width:100%;border-radius:4.6mm}
.phone::before{content:"";position:absolute;top:1.6mm;left:50%;transform:translateX(-50%);width:10mm;height:2.6mm;border-radius:2mm;background:#111a24;z-index:2}
.draftnote{background:var(--amberbg);color:#6b4a00;border-radius:2mm;padding:2.4mm 3.5mm;font-size:8.6pt;font-weight:600}
ol.mini>li::before{top:1.2mm;width:6mm;height:6mm;line-height:6mm;font-size:8pt}
.tools3{display:grid;grid-template-columns:repeat(3,1fr);gap:2.6mm}
.tools3 .tool{padding:2.6mm 3mm}
.tools3 .tool h3{font-size:9.2pt}
.tools3 .tool p{font-size:8.1pt;line-height:1.4}
.tools3 .preis{font-size:7.8pt}
</style></head><body>

<!-- 1 DECKBLATT -->
<section class="page cover">
  <div class="top">
    <div class="by">DSX Media Solutions UG · Bamberg</div>
    <svg class="route" width="150" height="70" viewBox="0 0 150 70" fill="none" aria-hidden="true"><path d="M8 58 C 40 58, 40 14, 75 14 S 110 50, 142 22" stroke="#5aa2dc" stroke-width="2.5" stroke-dasharray="5 6" stroke-linecap="round"/><circle cx="8" cy="58" r="6" fill="#fff"/><circle cx="142" cy="22" r="8" fill="#5aa2dc"/><circle cx="142" cy="22" r="3" fill="#0e2f4f"/></svg>
    ${P ? '<div class="intern" style="margin-top:14mm">Interne Fassung mit Preisen · nicht mitgeben</div>' : ''}
    <h1 style="${P ? 'margin-top:8mm' : ''}">Ihr digitaler Auftritt</h1>
    <div class="sub">Gesprächsvorbereitung: Ausgangslage, Vorschläge für Website, Google-Profil und digitale Werkzeuge</div>
  </div>
  <div class="mid">
    <h2 style="font-size:14pt;margin-bottom:4mm">Ausgangslage auf einen Blick: zwei Marken</h2>
    <div class="firms">
      <div class="firm"><div class="n">Umzüge Neumann <span class="tag t-red" style="vertical-align:3px">Website offline</span><br><span style="font-weight:500;font-size:10pt">Inh. Manfred Simon e.K.</span></div><div class="a">Heiliggrabstraße 2, 96052 Bamberg · 0951 9230690</div>
        <dl class="kv">
          <dt>Website</dt><dd>neumann-umzuege.de zeigt nur eine Fehlerseite</dd>
          <dt>Google-Profil</dt><dd>vorhanden (Umzugsservice); <b>Website und Öffnungszeiten fehlen</b></dd>
          <dt>Bewertungen</dt><dd>Google 4,4 ★ (14)<br>Sirelo 8,8/10 (14) · Cylex 4,0 (2)</dd>
        </dl></div>
      <div class="firm"><div class="n">Simon Umzüge <span class="tag t-amber" style="vertical-align:3px">Website veraltet</span><br><span style="font-weight:500;font-size:10pt">Bamberg</span></div><div class="a">Kantstraße 30, 96052 Bamberg (Impressum) · 0951 5191770</div>
        <dl class="kv">
          <dt>Website</dt><dd>simon-umzuege.de läuft: viele Leistungen, Anfrageformular, WhatsApp</dd>
          <dt>Google-Profil</dt><dd><span class="tag t-amber">zu klären</span></dd>
          <dt>Bewertungen</dt><dd><span class="tag t-amber">zu klären</span></dd>
        </dl></div>
    </div>
    <div class="toc">
      <div><span>★</span>Entwurf: Ihr neuer Auftritt</div>
      <div><span>4</span>Ideen für digitale Werkzeuge</div>
      <div><span>1</span>Ausgangslage und Befunde</div>
      <div><span>5</span>Was wir von Ihnen brauchen</div>
      <div><span>2</span>Google-Profil reparieren</div>
      <div><span>6</span>Fragen für das Gespräch</div>
      <div><span>3</span>Unser Vorschlag: neue Website</div>
      <div><span>7</span>Nächste Schritte, Zeitplan</div>
    </div>
  </div>
  <div class="bottom">
    <div><strong>Bamberg, 19.10.2026</strong><br>Erstellt von DSX Media Solutions UG</div>
    <div style="text-align:right">Stand der Prüfung: 19.10.2026<br>Alle Angaben aus öffentlich sichtbaren Quellen</div>
  </div>
</section>

<!-- 1b SHOWCASE -->
<section class="page">
  <h2>So könnte Ihr neuer Auftritt aussehen</h2>
  <p class="lead" style="margin-bottom:4mm">Ein erster Entwurf der Startseite für Umzüge Neumann – mit Ihrem Logo, Ihren Farben, Ihren Texten und Ihren Leistungen.</p>
  <div style="display:grid;grid-template-columns:1fr 50mm;gap:6mm;align-items:start">
    <div class="bframe"><div class="bbar"><i></i><i></i><i></i><span>neumann-umzuege.de</span></div>
      <div style="height:196mm;overflow:hidden"><img src="${img('entwurf-desktop.png')}" alt="Entwurf Startseite Desktop" style="display:block;width:100%"></div></div>
    <div>
      <div class="phone"><img src="${img('entwurf-handy.png')}" alt="Entwurf Startseite Handy"></div>
      <ul class="dot" style="margin-top:5mm;font-size:8.4pt">
        <li><b>Ihr Logo und Ihr Blau</b> aus der früheren neumann-umzuege.de</li>
        <li><b>Ihre eigenen Texte:</b> „Zuverlässige und verantwortungsvolle Umzugsprofis“, Umzugskoordinator, Rückmeldung in wenigen Stunden</li>
        <li><b>Ihre Spezialitäten vorn:</b> Außenaufzug, Klavier/Flügel/Tresor, Lagerung, Haushaltsauflösung</li>
        <li><b>Anrufen und WhatsApp</b> mit einem Tipp</li>
        <li><b>Bewertungen</b> und Büro Heiliggrabstraße, Mo–Sa 7–20 Uhr</li>
        <li><b>Beide Marken:</b> Neumann + Simon unter einem Dach</li>
      </ul>
    </div>
  </div>
  <div class="draftnote" style="margin-top:4mm">Entwurf – Fotos, Texte und Farben passen wir mit Ihnen an. Logo nach dem Original nachgebaut; Texte von der früheren neumann-umzuege.de; Foto (Außenaufzug) und Simon-Logo von simon-umzuege.de. Mit Ihren Fotos von Team, Fahrzeugen und Büro wird es noch persönlicher.</div>
  ${foot(2)}
</section>

<!-- 2 AUSGANGSLAGE -->
<section class="page">
  <h2><span class="nr">1</span>Die wichtigsten Befunde</h2>
  <p class="lead">Kunden suchen eine Umzugsfirma zuerst bei Google. So sieht es dort heute aus.</p>

  <div style="display:grid;grid-template-columns:1fr 60mm;gap:6mm">
    <div>
      <ol class="find">
        <li class="crit"><b>neumann-umzuege.de ist nicht erreichbar.</b> Die Seite steht bei Google ganz oben, zeigt aber nur „Site not found“. Wer „Umzüge Neumann“ sucht, landet ins Leere und ruft im Zweifel die Konkurrenz an. <span class="src">Geprüft am 19.10.2026.</span></li>
        <li><b>Im Google-Profil fehlen Website und Öffnungszeiten.</b> Google zeigt dort „Website hinzufügen“ und „Öffnungszeiten hinzufügen“. Das kostet Klicks und Vertrauen.</li>
        <li><b>simon-umzuege.de ist am Handy langsam.</b> Die Startseite ist rund 7,7 MB groß; der Google-Test Lighthouse vergibt mobil 58 von 100 Punkten für die Ladezeit. Auf dem ersten Bildschirm sieht man ein Wohn-Foto, aber weder „Umzug“ noch einen Anruf-Knopf.</li>
        <li><b>Das Anfrageformular ist sehr lang.</b> Es hat 576 Eingabefelder und empfiehlt bei Problemen, es auszudrucken und zu faxen. Am Handy füllt das kaum jemand aus. Die „Umzugs-App“ ist als „Demnächst“ angekündigt.</li>
        <li><b>Firmendaten sind nicht einheitlich.</b> Impressum Simon Umzüge: Inhaber Erhard Geier, Kantstraße 30. Google-Profil Neumann: Inh. Manfred Simon, Heiliggrabstraße 2, laut Google-Ausschnitt teils mit PLZ 96049 statt 96052. Für Google und das Impressum muss das zusammenpassen. <span class="tag t-amber">zu klären</span></li>
      </ol>
    </div>
    <div>
      <div class="shot"><div class="browser">neumann-umzuege.de · 19.10.2026</div><div style="height:24mm;overflow:hidden"><img src="${img('neumann-fehler.png')}" alt="Fehlerseite neumann-umzuege.de" style="width:128%;max-width:none;margin-left:-14%;margin-top:-5mm"></div></div>
      <div class="shot" style="margin-top:3mm;width:42mm;margin-left:auto;margin-right:auto"><div class="browser">simon-umzuege.de am Handy</div><img src="${img('simon-handy.png')}" alt="Startseite simon-umzuege.de am Handy" style="height:68mm;object-fit:cover;object-position:top"></div>
    </div>
  </div>
  <h2 style="margin-top:4mm"><span class="nr">2</span>Google-Profil reparieren</h2>
  <div class="card soft" style="margin-top:2mm;display:grid;grid-template-columns:1fr 1fr;gap:0 6mm">
    <ul class="check">
      <li>Website und Öffnungszeiten eintragen</li>
      <li>Adresse und Postleitzahl überall gleich</li>
      <li>Fotos: Team, Fahrzeuge, Einsätze, Lager</li>
      <li>alle Leistungen einzeln hinterlegen</li>
    </ul>
    <ul class="check">
      <li>Bewertungen sammeln: QR-Code und Erinnerung nach dem Umzug</li>
      <li>auf Bewertungen antworten</li>
      <li>Sirelo, Cylex und zweite Marke angleichen</li>
    </ul>
    ${P ? '<div style="grid-column:1/3">' + preis('Google-Profil reparieren + Fotos + Bewertungs-Plan: 249 € einmalig') + '</div>' : ''}
  </div>
  ${note(`Einstieg: Im Gespräch am Handy „Umzüge Neumann“ googeln und auf das erste Ergebnis tippen – die Fehlerseite spricht für sich. Lighthouse mobil: Leistung 58, Barrierefreiheit 82, SEO 82; keine Meta-Beschreibung; Google Fonts werden extern geladen; Impressum verweist noch auf § 5 TMG (gilt seit 14.05.2024 als DDG). Faxnummer im Formular (0951 6010739) weicht vom Impressum (0951 5191771) ab. Inhaber-Thema vorsichtig ansprechen, nicht als Vorwurf.`)}
  ${foot(3)}
</section>

<!-- 3 WEBSITE -->
<section class="page">
  <h2><span class="nr">3</span>Unser Vorschlag: eine neue Website</h2>
  <p class="lead">Modern, schnell am Handy, mit klarer Anfrage in wenigen Schritten. Vorher klären wir eine Grundfrage: Wie sollen die beiden Marken auftreten?</p>
  <div class="grid2">
    <div class="card">
      <span class="tag t-blue">Weg A</span>
      <h3 style="margin-top:1.5mm">Eine starke Hauptmarke</h3>
      <p>Eine Website für die Marke, unter der Sie künftig auftreten wollen. Die zweite Adresse leitet automatisch dorthin weiter, mit kurzem Hinweis „Neumann und Simon – ein Team“.</p>
      <ul class="dot" style="margin-top:1.5mm"><li>ein Auftritt, eine Telefonnummer, weniger Pflege</li><li>Google-Bewertungen bündeln sich</li><li>passt, wenn beide Marken zu einem Inhaber gehören</li></ul>
      ${preis('1.490 € einmalig + 39 €/Monat')}
    </div>
    <div class="card">
      <span class="tag t-blue">Weg B</span>
      <h3 style="margin-top:1.5mm">Zwei Seiten aus einem System</h3>
      <p>Zwei eigene Websites mit eigenem Logo, Impressum und Telefon, aber gleicher Technik und gleichem Aufbau. Inhalte pflegen wir einmal.</p>
      <ul class="dot" style="margin-top:1.5mm"><li>beide Namen bleiben sichtbar</li><li>nötig, wenn die Firmen rechtlich getrennt sind</li><li>etwas mehr Aufwand bei Google-Profilen</li></ul>
      ${preis('1.990 € einmalig + 59 €/Monat')}
    </div>
  </div>
  <div class="rec" style="margin-top:4mm">
    <h3>Unsere Empfehlung</h3>
    <p>Wenn beide Marken zu einem Inhaber gehören: <b style="color:#fff">Weg A</b>. Welche Marke die Hauptmarke wird, entscheiden wir gemeinsam: Neumann hat das Google-Profil mit den Bewertungen, Simon Umzüge hat die bekannte Website und das Logo. Sind die Firmen rechtlich getrennt, ist <b style="color:#fff">Weg B</b> der saubere Weg.</p>
  </div>

  ${P ? '' : `
  <h3 style="margin-top:6mm">Was die neue Website mitbringt</h3>
  <div class="grid2" style="gap:2mm 6mm;margin-top:1.5mm">
    <ul class="check">
      <li>Anrufen und WhatsApp mit einem Tipp, auf jeder Seite</li>
      <li>kurze Anfrage in wenigen Schritten statt 576 Feldern</li>
      <li>alle Leistungen klar sortiert: Umzug, Montage, Lagerung, Entrümpelung, Spezialtransporte</li>
      <li>echte Fotos von Team und Fahrzeugen statt Bilddatenbank</li>
    </ul>
    <ul class="check">
      <li>schnell am Handy, sauber für Google eingerichtet</li>
      <li>Bewertungen von Kunden sichtbar auf der Seite</li>
      <li>Impressum und Datenschutz aktuell</li>
      <li>bereit für spätere Werkzeuge wie den Umzugsrechner</li>
    </ul>
  </div>
  `}
  ${P ? `
  <div style="display:grid;grid-template-columns:1.15fr 1fr;gap:5mm;margin-top:5mm">
    <div class="card soft" style="padding:3.5mm 4mm">
      <h3>Preise <span class="src">netto zzgl. USt</span></h3>
      <table class="price">
        <tr><td>Website eine Marke (andere Adresse leitet weiter)</td><td>1.490 €<br><span class="src">+ 39 €/Monat</span></td></tr>
        <tr><td>Website beide Marken aus einem System</td><td>1.990 €<br><span class="src">+ 59 €/Monat</span></td></tr>
        <tr><td>Google-Profil reparieren + Fotos + Bewertungs-Plan</td><td>249 €</td></tr>
        <tr><td>Umzugsrechner mit Online-Anfrage</td><td>ab 1.490 €<br><span class="src">+ 39 €/Monat</span></td></tr>
        <tr><td>WhatsApp-Automatik · Angebot per Sprache</td><td>ab 49 € · 39–79 €<br><span class="src">je Monat</span></td></tr>
        <tr><td>Eigenes Tool nach Wunsch</td><td>ab 2.500 €<br><span class="src">nach Aufwand</span></td></tr>
      </table>
      <p class="src" style="margin-top:1mm">Monatlich = Hosting + Betreuung bzw. Betrieb.</p>
    </div>
    <div style="display:grid;gap:3mm;align-content:start">
      <div class="pk"><h3>Paket Start</h3><div class="sum">1.739 € <span style="font-size:10pt">+ 39 €/Monat</span></div><p style="font-size:8.6pt">Website eine Marke 1.490 € + Google-Profil 249 €. Mit beiden Marken (Weg B): 2.239 € + 59 €/Monat.</p></div>
      <div class="pk hl"><h3>Paket Wachstum</h3><div class="sum">ab 3.229 € <span style="font-size:10pt">+ 78 €/Monat</span></div><p style="font-size:8.6pt">Website eine Marke + Google-Profil + Umzugsrechner (ab 1.490 € + 39 €/Monat). WhatsApp-Automatik optional ab 49 €/Monat dazu.</p></div>
    </div>
  </div>
  ${note(`Start als sicheren Einstieg, Wachstum als Ziel. Weg A = 1.490 €, Weg B = 1.990 €. Den Entwurf auf Seite 2 zeigen – das ist die Neumann-Startseite. Die 7 Werktage erst ab vollständigen Inhalten zusagen. Budget offen fragen.`)}` : `
  <div class="card soft" style="margin-top:6mm">
    <h3>Was Sie davon haben</h3>
    <ul class="dot" style="margin-top:1mm">
      <li>Wer Sie googelt, findet sofort eine funktionierende Seite und Ihre Telefonnummer.</li>
      <li>Anfragen kommen vollständiger und schneller rein, auch abends und am Wochenende.</li>
      <li>Ein einheitlicher Auftritt schafft Vertrauen, bevor der Kunde zum Telefon greift.</li>
      <li>Sie sparen Zeit: weniger Rückfragen, weniger Besichtigungen „ins Blaue“.</li>
    </ul>
  </div>`}
  ${foot(4)}
</section>

<!-- 5 TOOLS -->
<section class="page">
  <h2><span class="nr">4</span>Ideen für digitale Werkzeuge</h2>
  <p class="lead">Sie haben ein „Tool“ angesprochen. Hier sind Ideen, die sich bei Umzugsfirmen bewährt haben. Wir suchen gemeinsam aus, was Ihnen wirklich Arbeit abnimmt.${P ? ' <b>Alle Preise: Richtpreis, genaues Angebot nach Klärung, netto zzgl. USt.</b>' : ''}</p>
  <div style="display:grid;grid-template-columns:34mm 1fr;gap:6mm;align-items:center;border:1.5px solid var(--blue);border-radius:3mm;padding:3.5mm 5mm;margin-bottom:3.5mm">
    <div class="phone"><img src="${img('entwurf-rechner.png')}" alt="Entwurf Umzugsrechner am Handy"></div>
    <div>
      <span class="tag t-blue">Idee 01 · Entwurf</span>
      <h3 style="font-size:13pt;margin:2mm 0 1.5mm">Online-Umzugsrechner</h3>
      <p>${tools[0][1]}</p>
      <ol class="find mini" style="margin-top:2mm">
        <li style="padding:1.6mm 0 1.6mm 9mm"><b>Zimmer und Möbel wählen</b> – antippen statt 576 Felder ausfüllen</li>
        <li style="padding:1.6mm 0 1.6mm 9mm"><b>Kubikmeter</b> werden automatisch berechnet</li>
        <li style="padding:1.6mm 0 1.6mm 9mm"><b>Richtpreis</b> nach Ihren eigenen Preisen</li>
        <li style="padding:1.6mm 0 1.6mm 9mm"><b>Anfrage</b> kommt vollständig bei Ihnen an</li>
      </ol>
      ${P ? `<span class="preis">${tools[0][2]}</span>` : ''}
    </div>
  </div>
  <div class="tools3">
    ${tools.slice(1).map(([t, d, p], i) => `<div class="tool"><h3><span>${String(i + 2).padStart(2, '0')}</span>${t}</h3><p>${d}</p>${P ? `<span class="preis">${p}</span>` : ''}</div>`).join('')}
  </div>
  ${P ? '' : `<div class="rec" style="margin-top:6mm">
    <h3>So finden wir das passende Werkzeug</h3>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5mm;margin-top:2mm">
      <p><b style="color:#fff">1. Heute ansehen</b><br>Wie kommen Anfragen rein, wer beantwortet sie, wie entsteht das Angebot?</p>
      <p><b style="color:#fff">2. Engpass finden</b><br>Wo geht die meiste Zeit verloren, wo springen Kunden ab?</p>
      <p><b style="color:#fff">3. Klein anfangen</b><br>Ein Werkzeug mit spürbarem Nutzen zuerst, danach Schritt für Schritt erweitern.</p>
    </div>
  </div>`}
  ${note(`Feste Preise nur für Rechner, WhatsApp und angebot.new; eigene Tools ab 2.500 € nach Aufwand – nichts spontan festlegen. Erst fragen, wie Anfragen heute reinkommen.`)}
  ${foot(5)}
</section>

<!-- 6 BRAUCHEN + FRAGEN -->
<section class="page">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:7mm">
    <div>
      <h2><span class="nr">5</span>Was wir brauchen</h2>
      <h3 style="margin-top:3mm;font-size:9.6pt;color:var(--blue)">Firma und Marken</h3>
      <ul class="check"><li>Wem gehört welche Marke?</li><li>Firmendaten fürs Impressum: Rechtsform (e.K.), Handelsregister, USt-IdNr.</li></ul>
      <h3 style="margin-top:2.5mm;font-size:9.6pt;color:var(--blue)">Zugänge</h3>
      <ul class="check"><li>Wo liegen neumann-umzuege.de und simon-umzuege.de?</li><li>Zugang zum Hosting bzw. Domain-Anbieter</li><li>Zugang zum Google-Profil (Einladung als Verwalter)</li></ul>
      <h3 style="margin-top:2.5mm;font-size:9.6pt;color:var(--blue)">Inhalte</h3>
      <ul class="check"><li>Logo (am besten als Datei vom Gestalter)</li><li>Fotos: Team, Fahrzeuge, Einsätze</li><li>Leistungen und Einzugsgebiet</li><li>Preise oder Richtwerte</li><li>Referenzen und Kundenstimmen</li></ul>
      <h3 style="margin-top:2.5mm;font-size:9.6pt;color:var(--blue)">Werkzeug</h3>
      <ul class="check"><li>Welches Tool genau, und wofür?</li><li>Wie kommen Anfragen heute rein (Telefon, Mail, WhatsApp, Formular)?</li></ul>
    </div>
    <div>
      <h2><span class="nr">6</span>Fragen für das Gespräch</h2>
      <div style="margin-top:3mm">
        ${[
          'Wie hängen Umzüge Neumann und Simon Umzüge zusammen? Wer ist Inhaber?',
          'Im Impressum von simon-umzuege.de steht Erhard Geier. Ist das noch aktuell?',
          'Sollen beide Namen bleiben oder lieber einer?',
          'Seit wann ist neumann-umzuege.de offline? Wer hat sie betreut?',
          'Welches Tool schwebt Ihnen vor, und was soll es erleichtern?',
          'Wie viele Anfragen kommen pro Monat, und woher?',
          'Was ist mit der angekündigten Umzugs-App?',
          'Welche Aufträge wollen Sie mehr: privat, Firma, Fernumzug?',
          'Bis wann soll die neue Website stehen?',
        ].map((q) => `<div class="q"><div class="box"></div><div>${q}</div><div class="lines"></div></div>`).join('')}
        <div style="border-top:1px solid var(--line);padding-top:2mm;font-size:8.6pt;color:var(--muted)">Notizen</div>
        <div style="height:${P ? '16mm' : '24mm'};background:repeating-linear-gradient(transparent 0 6.5mm,#c9d4df 6.5mm 6.8mm)"></div>
      </div>
    </div>
  </div>
  <h2 style="margin-top:5mm"><span class="nr">7</span>Nächste Schritte und Zeitplan</h2>
  <div class="steps">
    <div class="step"><span class="when">Heute</span><b>Gespräch</b>Marken, Ziele und Wunsch-Werkzeug klären.</div>
    <div class="step"><span class="when">Nach Zugang</span><b>Sofort-Hilfe</b>neumann-umzuege.de leitet auf eine funktionierende Seite weiter, Google-Profil wird ergänzt.</div>
    <div class="step"><span class="when">7 Werktage nach Inhalten</span><b>Neue Website online</b>Entwurf, Ihre Korrekturen, Freischaltung.</div>
    <div class="step"><span class="when">Danach</span><b>Werkzeuge</b>Gewünschtes Tool genau planen, eigenes Angebot, Umsetzung.</div>
  </div>
  ${note(`Ziel für heute: Inhaber-Frage, Hauptmarke, Tool-Wunsch und Budget klären; Zugänge (Domain, Google-Profil) anstoßen. Kein Angebot unterschreiben lassen, bevor feststeht, wer Vertragspartner ist.`)}
  ${foot(6)}
</section>
</body></html>`;
}

const out = [
  ['neumann-simon-ohne-preise', false],
  ['neumann-simon-mit-preisen', true],
];
const browser = await chromium.launch();
for (const [name, P] of out) {
  const html = build(P);
  const htmlPath = path.join(DIR, name + '.html');
  writeFileSync(htmlPath, html);
  const page = await browser.newPage();
  await page.goto('file://' + htmlPath, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const over = await page.evaluate(() => [...document.querySelectorAll('.page')].map((p, i) => {
    const r = p.getBoundingClientRect(); const f = p.querySelector('footer');
    const fr = f ? f.getBoundingClientRect().top : r.bottom;
    let max = 0; p.querySelectorAll('*').forEach((e) => { if (e.closest('footer')) return; const b = e.getBoundingClientRect().bottom; if (b > max) max = b; });
    return { seite: i + 1, ueberlauf: Math.round(max - fr) };
  }));
  console.log(name, JSON.stringify(over));
  const pdf = path.join(DIR, name + '.pdf');
  await page.pdf({ path: pdf, format: 'A4', printBackground: true, preferCSSPageSize: true });
  copyFileSync(pdf, path.join(os.homedir(), 'Downloads', name + '.pdf'));
  await page.close();
}
await browser.close();
