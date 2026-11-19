// Markenhandbuch (Brandguide) als PDF, A4 quer, 8 Seiten.
// Aufruf: node gen-guide.mjs [Kit-Ordner]  (Standard: ~/Downloads/Tattookalender-Brandingkit)
import { createRequire } from "node:module";
import { writeFileSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { COLORS, rgb, cmyk } from "./colors.mjs";
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire("/Users/domi/Marketing-Maschine/package.json");
const { chromium } = require("playwright");
const K = process.argv[2] || process.env.HOME + "/Downloads/Tattookalender-Brandingkit";
const f = (p) => "file://" + encodeURI(join(K, p));
const L = (n) => f(`Logo/SVG/${n}.svg`);
const S = "Farben-Schriften/Schriften";
const TOTAL = 8;
const foot = (n, label) => `<footer><span>Tattookalender · Markenhandbuch</span><span>${label}</span><span>${n} / ${TOTAL}</span></footer>`;

const css = `
@font-face{font-family:"Bricolage Grotesque";font-weight:800;src:url("${f(S + "/Bricolage-Grotesque/einzeln/BricolageGrotesque-ExtraBold.ttf")}")}
@font-face{font-family:"Bricolage Grotesque";font-weight:600;src:url("${f(S + "/Bricolage-Grotesque/einzeln/BricolageGrotesque-SemiBold.ttf")}")}
@font-face{font-family:Inter;font-weight:400;src:url("${f(S + "/Inter/einzeln/Inter-Regular.ttf")}")}
@font-face{font-family:Inter;font-weight:500;src:url("${f(S + "/Inter/einzeln/Inter-Medium.ttf")}")}
@font-face{font-family:Inter;font-weight:600;src:url("${f(S + "/Inter/einzeln/Inter-SemiBold.ttf")}")}
@page{size:297mm 210mm;margin:0}
:root{--nacht:#0b0b0d;--tinte:#141311;--blatt:#1c1a16;--linie:#2c2822;--elf:#f4f1ea;--stein:#a7a39a;--schiefer:#6b675f;--champ:#f3d891;--gold:#c9a24f;--bronze:#8a6418;--nein:#ef6f6f}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:var(--nacht);-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-family:Inter,sans-serif;color:var(--elf);font-size:9.5pt;line-height:1.55}
.page{width:297mm;height:210mm;position:relative;overflow:hidden;padding:16mm 18mm 20mm;page-break-after:always;background:var(--nacht)}
.page.glow{background:radial-gradient(190mm 120mm at 22% -12%,rgba(217,180,104,.20),rgba(217,180,104,0) 70%),var(--nacht)}
.page.hell{background:var(--elf);color:var(--nacht)}
footer{position:absolute;left:18mm;right:18mm;bottom:9mm;display:flex;justify-content:space-between;font-size:7pt;color:var(--schiefer);border-top:.25mm solid var(--linie);padding-top:2.5mm}
.hell footer{border-color:#ddd6c8;color:var(--schiefer)}
h1{font-family:"Bricolage Grotesque",sans-serif;font-weight:800;letter-spacing:-.03em;line-height:1.02;font-size:34pt}
h2{font-family:"Bricolage Grotesque",sans-serif;font-weight:800;letter-spacing:-.02em;line-height:1.1;font-size:13pt;margin-bottom:2mm}
h3{font-size:8pt;font-weight:600;color:var(--gold);margin-bottom:1.5mm}
.hell h3{color:var(--bronze)}
p{max-width:62ch;color:#d9d4ca}
.hell p{color:#3b3832}
.muted{color:var(--stein)}
.gold{color:var(--gold)}
.grid{display:grid;gap:5mm}
.tile{border-radius:3mm;display:grid;place-items:center;position:relative}
.tile .cap{position:absolute;left:3.5mm;bottom:2.6mm;font-size:6.5pt;color:var(--stein)}
.tile.light{background:var(--elf)} .tile.light .cap{color:var(--schiefer)}
.tile.dark{background:var(--tinte);border:.25mm solid var(--linie)}
.tile.goldbg{background:var(--gold)} .tile.goldbg .cap{color:#3a2c0c}
.lead{font-size:11.5pt;line-height:1.5;color:var(--elf);max-width:52ch}
.hell .lead{color:var(--nacht)}
/* Seite 1 */
.cover{display:grid;grid-template-columns:1fr;align-content:space-between;height:100%}
.cover .logo{width:150mm;margin-top:18mm}
.cover h1{font-size:54pt;margin-top:0}
.cover .meta{display:flex;gap:12mm;font-size:8.5pt;color:var(--stein);margin-top:6mm}
.cover .meta b{display:block;color:var(--elf);font-weight:600}
/* Seite 2 */
.two{display:grid;grid-template-columns:86mm 1fr;gap:12mm;height:100%}
.hero-logo{background:var(--tinte);border:.25mm solid var(--linie);border-radius:4mm;display:grid;place-items:center;height:92mm}
.hero-logo img{width:150mm}
.anatomy{display:grid;grid-template-columns:repeat(3,1fr);gap:5mm;margin-top:5mm}
.anatomy .tile{height:54mm}
dl{display:grid;grid-template-columns:auto 1fr;gap:1.6mm 4mm;margin-top:4mm;font-size:8.5pt}
dt{color:var(--gold);font-weight:600} dd{color:#d9d4ca}
/* Seite 3 */
.variants{grid-template-columns:repeat(4,1fr);grid-auto-rows:35mm;margin-top:6mm;gap:4mm}
.variants img{max-width:78%;max-height:58%}
.variants img.sym{max-height:52%}
/* Seite 4 */
.rules{display:grid;grid-template-columns:118mm 1fr;gap:12mm;margin-top:7mm}
.clear{background:var(--tinte);border:.25mm solid var(--linie);border-radius:3mm;height:74mm;position:relative;display:grid;place-items:center}
.clear .box{position:relative;padding:6.64mm;outline:.3mm dashed var(--gold)}
.clear .box img{display:block;width:72mm;outline:.25mm solid rgba(201,162,79,.35)}
.clear .x{position:absolute;font-size:7pt;color:var(--gold);font-weight:600}
.sizes{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin-top:5mm}
.sizes div{font-size:8pt;color:var(--stein)} .sizes b{display:block;color:var(--elf);font-size:10pt;font-weight:600}
.donts{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm}
.donts .tile{height:36mm;overflow:hidden}
.donts .tile .cap{color:var(--nein);font-weight:600;background:var(--tinte);padding:.6mm 1.6mm;border-radius:1mm;left:2mm}
.donts img{width:70%}
.bad-x{position:absolute;right:2.6mm;top:2.2mm;width:4.2mm;height:4.2mm;border-radius:50%;background:var(--nein);display:grid;place-items:center;color:#fff;font-size:7pt;font-weight:600;line-height:1}
/* Seite 5 */
.swatches{grid-template-columns:repeat(4,1fr);margin-top:6mm;gap:3.5mm}
.sw{border-radius:2.5mm;overflow:hidden;border:.25mm solid var(--linie);background:var(--tinte)}
.sw .chip{height:12mm}
.sw .info{padding:2.2mm 2.8mm 2.6mm;font-size:6.6pt;line-height:1.45;color:var(--stein)}
.sw .info b{display:block;color:var(--elf);font-size:8.5pt;font-weight:600;margin-bottom:.6mm}
.sw .info i{font-style:normal;color:#d9d4ca;display:block;margin-top:.8mm}
.ratio{display:flex;height:6mm;border-radius:1.5mm;overflow:hidden;margin-top:2.5mm}
.ratio span{display:flex;align-items:center;padding-left:2mm;font-size:6.5pt;font-weight:600}
/* Seite 6 */
.fonts{display:grid;grid-template-columns:1fr 1fr;gap:8mm;margin-top:6mm}
.spec{background:var(--tinte);border:.25mm solid var(--linie);border-radius:3mm;padding:6mm}
.spec .aa{font-size:52pt;line-height:1;letter-spacing:-.03em}
.spec .name{font-size:13pt;font-weight:600;margin-top:2mm}
.spec .abc{font-size:10pt;color:var(--stein);margin-top:2mm;letter-spacing:.02em}
.spec .src{font-size:7.5pt;color:var(--stein);margin-top:3mm;line-height:1.5}
.scale{margin-top:6mm;display:grid;grid-template-columns:38mm 1fr 60mm;gap:2.4mm 6mm;align-items:baseline;font-size:8pt}
.scale .k{color:var(--stein)} .scale .v{color:var(--stein);font-size:7.5pt}
/* Seite 7 */
.tone{display:grid;grid-template-columns:86mm 1fr;gap:12mm;margin-top:6mm}
.rules-list{list-style:none;display:grid;gap:4mm}
.rules-list li{padding-left:5mm;position:relative;color:#d9d4ca;font-size:9pt}
.rules-list li::before{content:"";position:absolute;left:0;top:1.9mm;width:2mm;height:2mm;border-radius:50%;background:var(--gold)}
.pairs{display:grid;gap:4.5mm}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:3.5mm}
.pair div{border-radius:2.5mm;padding:4.5mm 5mm;font-size:9.6pt;line-height:1.45}
.pair .yes{background:var(--blatt);border:.25mm solid rgba(201,162,79,.45);color:var(--elf)}
.pair .no{background:transparent;border:.25mm dashed #4a443a;color:var(--stein)}
.pair small{display:block;font-size:6.5pt;font-weight:600;margin-bottom:1mm}
.pair .yes small{color:var(--gold)} .pair .no small{color:var(--nein)}
/* Seite 8 */
.use{display:grid;grid-template-columns:1.25fr 1fr 1fr 1fr;grid-template-rows:72mm 72mm;gap:4mm;margin-top:6mm}
.shot{border-radius:2.5mm;overflow:hidden;border:.25mm solid var(--linie);background:var(--tinte);position:relative}
.shot img{width:100%;height:100%;object-fit:cover;object-position:top;display:block}
.shot .cap{position:absolute;left:0;right:0;bottom:0;padding:5mm 3mm 2.2mm;font-size:6.5pt;color:var(--elf);background:linear-gradient(rgba(11,11,13,0),rgba(11,11,13,.92))}
`;

const sw = (c) => { const [n, h, r] = c; return `<div class="sw"><div class="chip" style="background:${h}"></div><div class="info"><b>${n}</b>${h} · RGB ${rgb(h).join(" ")}<br>CMYK ${cmyk(h).join(" ")}<i>${r}</i></div></div>`; };

const pages = [];
// 1 Titel
pages.push(`<section class="page glow"><div class="cover">
  <img class="logo" src="${L("tattookalender-logo-quer-dunkel")}" alt="">
  <div>
    <h1>Markenhandbuch</h1>
    <p class="lead" style="margin-top:5mm;color:var(--stein)">Logo, Farben, Schriften und Ton für alles, was nach außen geht: Website, Werbung, Social Media, Drucksachen und die App selbst.</p>
    <div class="meta"><div><b>Stand</b>20. Oktober 2026</div><div><b>Marke</b>Tattookalender – Das Studio-System</div><div><b>Herausgeber</b>DSX Media Solutions UG (haftungsbeschränkt)</div></div>
  </div>
</div>${foot(1, "Titel")}</section>`);
// 2 Logo
pages.push(`<section class="page"><div class="two">
  <div>
    <h1>Das Logo</h1>
    <p class="lead" style="margin-top:5mm">Ein Kalenderblatt, abgehakt mit einer Tattoo-Nadel. Daneben der Name in einem Wort: „tattoo“ hell, „kalender“ in Gold.</p>
    <dl>
      <dt>Bildmarke</dt><dd>Kalenderblatt mit zwei Ringen, Haken als Nadelstrich mit Tintenpunkt. Gold-Verlauf auf dunklem Blatt.</dd>
      <dt>Wortmarke</dt><dd>Bricolage Grotesque ExtraBold, eng gesetzt, immer klein geschrieben – als Pfade im Logo, nie nachtippen.</dd>
      <dt>Unterzeile</dt><dd>„Das Studio-System“ in Inter SemiBold, Versalien, weit gesperrt.</dd>
      <dt>Name im Text</dt><dd>Im Fließtext „Tattookalender“ mit großem T. Domain: tattookalender.de</dd>
    </dl>
  </div>
  <div>
    <div class="hero-logo"><img src="${L("tattookalender-logo-quer-dunkel")}" alt=""></div>
    <div class="anatomy">
      <div class="tile dark"><img src="${L("tattookalender-logo-quer-dunkel")}" style="width:80%"><span class="cap">Quer – Standard</span></div>
      <div class="tile dark"><img src="${L("tattookalender-logo-gestapelt-dunkel")}" style="width:58%"><span class="cap">Gestapelt – Hochformat, Story, Karte</span></div>
      <div class="tile dark"><img src="${L("tattookalender-symbol-farbig")}" style="width:30%"><span class="cap">Bildmarke – App, Profilbild, klein</span></div>
    </div>
  </div>
</div>${foot(2, "Logo")}</section>`);
// 3 Varianten
const v = (cls, file, cap, sym = false) => `<div class="tile ${cls}"><img ${sym ? 'class="sym"' : ""} src="${L(file)}"><span class="cap">${cap}</span></div>`;
pages.push(`<section class="page"><h1>Farbvarianten</h1>
  <p class="lead" style="margin-top:4mm">Erste Wahl ist immer das farbige Logo auf Nachtschwarz. Auf hellem Grund die helle Variante. Einfarbig nur, wenn Technik oder Druck keine Verläufe können (Stempel, Gravur, Folie, Stick).</p>
  <div class="grid variants">
    ${v("dark", "tattookalender-logo-quer-dunkel", "quer-dunkel")}
    ${v("light", "tattookalender-logo-quer-hell", "quer-hell")}
    ${v("dark", "tattookalender-logo-quer-kompakt-dunkel", "quer-kompakt-dunkel (ohne Unterzeile)")}
    ${v("light", "tattookalender-logo-quer-kompakt-hell", "quer-kompakt-hell")}
    ${v("dark", "tattookalender-logo-gestapelt-dunkel", "gestapelt-dunkel")}
    ${v("light", "tattookalender-logo-gestapelt-hell", "gestapelt-hell")}
    ${v("light", "tattookalender-logo-quer-schwarz", "quer-schwarz")}
    ${v("dark", "tattookalender-logo-quer-weiss", "quer-weiss")}
    ${v("dark", "tattookalender-logo-quer-gold", "quer-gold")}
    ${v("dark", "tattookalender-symbol-farbig", "symbol-farbig", true)}
    ${v("light", "tattookalender-symbol-schwarz", "symbol-schwarz", true)}
    ${v("goldbg", "tattookalender-logo-quer-schwarz", "schwarz auf Gold (Sonderfall)")}
  </div>
  <p class="muted" style="margin-top:4mm;font-size:7.5pt">Alle Dateien liegen im Ordner Logo: SVG (Vektor, beliebig groß), PNG mit 4000 px und 1000 px Breite, transparent.</p>
${foot(3, "Logo-Varianten")}</section>`);
// 4 Regeln
const dont = (style, cap, inner) => `<div class="tile dark" style="${style}">${inner}<span class="bad-x">✕</span><span class="cap">${cap}</span></div>`;
pages.push(`<section class="page"><h1>Schutzraum und Regeln</h1>
<div class="rules">
  <div>
    <div class="clear">
      <div class="box"><img src="${L("tattookalender-logo-quer-dunkel")}"></div>
    </div>
    <p style="margin-top:3.5mm;font-size:8.5pt">Rund um das Logo bleibt ein freier Rand von mindestens der <b class="gold">halben Höhe der Bildmarke</b> (gestrichelte Linie). Dort steht kein Text, kein Bildrand und kein anderes Logo.</p>
    <div class="sizes">
      <div><b>60 mm / 320 px</b>Mindestbreite quer mit Unterzeile</div>
      <div><b>25 mm / 120 px</b>Mindestbreite quer-kompakt</div>
      <div><b>5 mm / 16 px</b>Mindestgröße Bildmarke allein</div>
    </div>
  </div>
  <div>
    <h2>Bitte nicht</h2>
    <div class="donts">
      ${dont("", "Verzerren oder stauchen", `<img src="${L("tattookalender-logo-quer-dunkel")}" style="transform:scaleX(1.35) scaleY(.75)">`)}
      ${dont("", "Andere Farben", `<img src="data:image/svg+xml;base64,${Buffer.from(readFileSync(join(K, "Logo/SVG/tattookalender-logo-quer-weiss.svg"), "utf8").replaceAll("#ffffff", "#4f8df7")).toString("base64")}">`)}
      ${dont("", "Schatten, Glanz, Kontur", `<img src="${L("tattookalender-logo-quer-dunkel")}" style="filter:drop-shadow(1.2mm 1.2mm 0 #ef6f6f)">`)}
      ${dont("background:repeating-linear-gradient(45deg,#c9a24f 0 3mm,#f4f1ea 3mm 6mm)", "Auf unruhigem Grund", `<img src="${L("tattookalender-logo-quer-hell")}">`)}
      ${dont("", "Wortmarke nachtippen", `<div style="font:700 12pt Georgia,serif;color:#f4f1ea">Tattoo<span style="color:#c9a24f">Kalender</span></div>`)}
      ${dont("", "Mit Studio-Logos mischen", `<div style="display:flex;align-items:center;gap:2.5mm"><img src="${L("tattookalender-symbol-farbig")}" style="width:9mm"><span style="color:#ef6f6f;font-weight:600">+</span><div style="border:.3mm dashed #a7a39a;border-radius:1.5mm;padding:2mm 3mm;font-size:6.5pt;color:#a7a39a">Studio-Logo</div></div>`)}
    </div>
    <p style="margin-top:4mm;font-size:8.5pt">Tattookalender steht für sich. Keine Logos von Kunden-Studios, keine Inhalte von Tattoo Fashion und keine echten Kundendaten in Werbung für den Tattookalender. Screens immer aus dem Beispiel-Studio mit Demo-Daten und so kennzeichnen.</p>
  </div>
</div>${foot(4, "Logo-Regeln")}</section>`);
// 5 Farben
pages.push(`<section class="page"><h1>Farben</h1>
  <p class="lead" style="margin-top:4mm">Nacht, Elfenbein und Gold. Dunkel ist der Normalfall, Gold ist der Akzent und bleibt sparsam.</p>
  <div class="grid swatches">${COLORS.map(sw).join("")}
    <div class="sw" style="display:flex;flex-direction:column"><div class="chip" style="background:linear-gradient(180deg,#f3d891,#c9a24f)"></div><div class="info"><b>Gold-Verlauf</b>Champagner → Gold, senkrecht<br>auf Hell: Altgold → Bronze<i>Nur im Logo und auf Flächen wie Buttons, nie auf Text</i></div></div>
  </div>
  <div style="margin-top:4mm;display:grid;grid-template-columns:150mm 1fr;gap:10mm;align-items:end"><div><h3>Verteilung</h3>
    <div class="ratio"><span style="width:70%;background:#141311;color:#a7a39a;border:.25mm solid #2c2822">Nachtschwarz und Tinte 70 %</span><span style="width:20%;background:#f4f1ea;color:#0b0b0d">Text 20 %</span><span style="width:10%;background:#c9a24f;color:#0b0b0d">Gold</span></div></div>
  <p class="muted" style="font-size:7pt">CMYK-Werte sind Näherungen, vor großen Druckaufträgen einen Probedruck machen. Große schwarze Flächen im Druck als Tiefschwarz C60 M40 Y40 K100 anlegen.</p></div>
${foot(5, "Farben")}</section>`);
// 6 Schriften
pages.push(`<section class="page"><h1>Schriften</h1>
  <p class="lead" style="margin-top:4mm">Zwei Schriften, klar getrennt: Bricolage Grotesque für Überschriften und große Aussagen, Inter für alles zum Lesen.</p>
  <div class="fonts">
    <div class="spec">
      <div class="aa" style="font-family:'Bricolage Grotesque';font-weight:800">Aa Termin.</div>
      <div class="name">Bricolage Grotesque</div>
      <div class="abc" style="font-family:'Bricolage Grotesque';font-weight:800">ABCDEFGHIJKLMNOPQRSTUVWXYZ äöüß 0123456789</div>
      <div class="src">Schnitte: ExtraBold 800 (Überschriften, Logo), SemiBold 600 (Zwischenzeilen)<br>Laufweite −2 bis −3 %, Zeilenabstand 1,05<br>Quelle: fonts.google.com/specimen/Bricolage+Grotesque · Lizenz SIL Open Font License 1.1 (frei, auch kommerziell)</div>
    </div>
    <div class="spec">
      <div class="aa" style="font-family:Inter;font-weight:600;letter-spacing:-.02em">Aa Liege</div>
      <div class="name">Inter</div>
      <div class="abc" style="font-family:Inter">ABCDEFGHIJKLMNOPQRSTUVWXYZ äöüß 0123456789</div>
      <div class="src">Schnitte: Regular 400 (Text), Medium 500, SemiBold 600 (Buttons, Hinweise, Unterzeile)<br>Fließtext 16 px bzw. 9–10 pt, Zeilenabstand 1,5–1,6<br>Quelle: fonts.google.com/specimen/Inter · Lizenz SIL Open Font License 1.1</div>
    </div>
  </div>
  <div class="scale">
    <span class="k">Überschrift</span><span style="font-family:'Bricolage Grotesque';font-weight:800;font-size:22pt;letter-spacing:-.03em;line-height:1">Dein Team tätowiert.</span><span class="v">Bricolage 800 · −3 % · weiß, zweite Zeile Gold</span>
    <span class="k">Zwischenzeile</span><span style="font-family:'Bricolage Grotesque';font-weight:600;font-size:13pt">In 1–2 Wochen live.</span><span class="v">Bricolage 600 · −2 %</span>
    <span class="k">Text</span><span style="font-size:10pt;color:#d9d4ca">Termine, Anzahlungen und Einwilligungen an einem Ort.</span><span class="v">Inter 400 · Stein oder Elfenbein</span>
    <span class="k">Unterzeile</span><span style="font-size:8pt;font-weight:600;letter-spacing:.32em;color:#a7a39a">DAS STUDIO-SYSTEM</span><span class="v">Inter 600 · Versalien · +32 % – nur hier</span>
  </div>
  <p class="muted" style="margin-top:4mm;font-size:7.2pt">Gold-Text immer einfarbig (#C9A24F auf Dunkel, #8A6418 auf Hell). Ersatz, wenn die Schriften fehlen (z. B. E-Mail): Arial bzw. Helvetica. In der App selbst sind Überschriften technisch noch in Oswald gesetzt; für alles Neue gilt diese Seite.</p>
${foot(6, "Schriften")}</section>`);
// 7 Ton
const pair = (yes, no) => `<div class="pair"><div class="yes"><small>So</small>${yes}</div><div class="no"><small>Nicht so</small>${no}</div></div>`;
pages.push(`<section class="page"><h1>So sprechen wir</h1>
<div class="tone">
  <div>
    <p class="lead">Wie jemand, der selbst im Studio steht: per du, ruhig, konkret. Wir zeigen, was das System macht – überreden muss niemand.</p>
    <ul class="rules-list" style="margin-top:6mm">
      <li>Immer „du“ – an Inhaber, Artists und Team.</li>
      <li>Kurze Sätze. Wörter aus dem Studio-Alltag: Termin, Liege, Artist, Anzahlung, Einwilligung.</li>
      <li>Konkret statt groß: sagen, was passiert („Der Kunde bekommt den Link per WhatsApp“).</li>
      <li>Kein Verkäufer-Ton: keine künstliche Knappheit, keine Ausrufezeichen-Ketten, keine Superlative.</li>
      <li>Technik in Alltagssprache. Kein „Payment-Workflow“, kein „Onboarding-Funnel“.</li>
      <li>Erste Nachricht an Interessenten: danke sagen und fragen, ob es Fragen gibt.</li>
    </ul>
  </div>
  <div class="pairs">
    ${pair("Dein Kunde bekommt den Anzahlungslink direkt per WhatsApp. Bezahlt heißt: Termin bestätigt.", "Revolutionieren Sie Ihr Payment-Management mit unserer innovativen All-in-One-Lösung!")}
    ${pair("Doppelbuchungen sind ausgeschlossen – für jeden Artist und jede Liege.", "NIE WIEDER CHAOS!!! Das beste Tool auf dem Markt 🚀")}
    ${pair("Danke für deine Anfrage! Hast du schon Fragen, bevor wir uns die Demo zusammen anschauen?", "Nur noch 3 Plätze frei – jetzt zuschlagen, bevor der Preis steigt!")}
    ${pair("Die Einwilligung füllt der Kunde vorher am Handy aus. Kein Papier mehr.", "Durch die DSGVO-konforme Digitalisierung Ihrer Consent-Prozesse sparen Sie Ressourcen.")}
  </div>
</div>${foot(7, "Tonalität")}</section>`);
// 8 Anwendung
const shot = (src, cap, style = "") => `<div class="shot" style="${style}"><img src="${f(src)}"><span class="cap">${cap}</span></div>`;
pages.push(`<section class="page"><h1>So sieht es aus</h1>
  <div class="use">
    ${shot("Vorlagen/Bilder/demo-desktop-kalender.jpg", "App – Kalender (Beispiel-Studio mit Demo-Daten)", "grid-column:1/3")}
    ${shot("Video-Stills/reel-01-alles-an-einem-ort.jpg", "Werbevideo – Hochformat")}
    ${shot("Video-Stills/reel-07-endcard-demo.jpg", "Werbevideo – Schluss")}
    ${shot("Vorlagen/Bilder/app-login.png", "App – Team-Login")}
    ${shot("Vorlagen/Social-Media/post-aussage-1080x1350.png", "Vorlage – Post Aussage")}
    ${shot("Vorlagen/Social-Media/post-screenshot-1080x1350.png", "Vorlage – Post Screenshot")}
    ${shot("Vorlagen/Visitenkarte/vorschau-vorderseite.png", "Visitenkarte", "display:grid;place-items:center")}
  </div>
${foot(8, "Anwendung")}</section>`);

const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>Tattookalender – Markenhandbuch</title><style>${css}</style></head><body>${pages.join("\n")}</body></html>`;
const out = join(here, "brandguide.html");
writeFileSync(out, html);
const b = await chromium.launch({ args: ["--allow-file-access-from-files"] });
const p = await b.newPage();
await p.goto("file://" + out); await p.evaluate(() => document.fonts.ready); await p.waitForLoadState("networkidle"); await p.waitForTimeout(500);
const status = await p.evaluate(() => ({ fonts: [...document.fonts].map((x) => x.family + x.weight + ":" + x.status).join(" "), broken: [...document.images].filter((i) => !i.naturalWidth).map((i) => i.src), clip: [...document.querySelectorAll("*")].filter((e) => /text/.test(getComputedStyle(e).backgroundClip) || /text/.test(getComputedStyle(e).webkitBackgroundClip || "")).length }));
console.log(status);
await p.pdf({ path: join(K, "Tattookalender-Brandguide.pdf"), width: "297mm", height: "210mm", printBackground: true, preferCSSPageSize: true });
await b.close();
