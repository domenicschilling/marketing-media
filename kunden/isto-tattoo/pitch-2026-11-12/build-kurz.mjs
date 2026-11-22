// KURZ-Angebot für Michalis (4 Seiten, mit Preis): node content/kunden/isto-tattoo/pitch-2026-11-12/build-kurz.mjs
// → Isto-Tattoo-Pitch-TattooLeadz.pdf (gleicher Ordner). Bilder lokal eingebettet, Links klickbar.
// Inhalte: nur belegte Fakten (Website/Instagram/Call), Annahmen als solche benannt, keine erfundenen Zahlen.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../../..");
const F = (p) => "file://" + path.join(repo, p);
const has = (p) => fs.existsSync(path.join(repo, p));
const FOTO = (n) => F(`brands/isto-tattoo/fotos-web-900/${n.replace(/\.(jpe?g|JPG)$/, "")}.jpg`); // 1400px-Kopien (PDF klein halten)
const CR = "content/isto-tattoo/creatives/2026-11-12-pitch";
const SH = "content/kunden/isto-tattoo/pitch-2026-11-12/shots-v2-pdf"; // verkleinerte Kopien von shots-v2
const LP_URL = process.env.LP_URL || "https://vorschau--isto-tattoo-projekt.netlify.app";
const REEL_URL = process.env.REEL_URL || "";
const ads = ["a", "b", "c", "d"].filter((k) => has(`${CR}/${k}/feed.jpg`)).map((k) => ({ k, j: JSON.parse(fs.readFileSync(path.join(repo, CR, k, "creative.json"), "utf8")) }));

const css = `
@page{size:A4;margin:0}
*{box-sizing:border-box}html,body{margin:0;background:#0d0d0c;color:#efebe3;font:10.5pt/1.55 "Helvetica Neue",Helvetica,Arial,sans-serif}
.p{width:210mm;height:297mm;position:relative;overflow:hidden;page-break-after:always;padding:20mm 18mm}
.p:last-child{page-break-after:auto}
.cover{padding:0}.cover img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:brightness(.55)}
.cover .t{position:absolute;left:18mm;right:18mm;bottom:26mm}
.cover:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(13,13,12,0) 35%,rgba(13,13,12,.85) 72%,#0d0d0c 100%)}.cover .t{z-index:2}
.k{font:600 8pt/1 Helvetica;letter-spacing:.32em;text-transform:uppercase;color:#bfb6a6}
h1{font:300 38pt/1.02 "Helvetica Neue",Helvetica;margin:5mm 0 4mm;letter-spacing:-.01em}h1 b{font-weight:700}
h2{font:300 24pt/1.1 "Helvetica Neue",Helvetica;margin:3mm 0 7mm}h2 b{font-weight:700}
h3{font:700 11pt Helvetica;margin:0 0 2mm}
.lead{font-size:12.5pt;color:#d9d3c7;max-width:150mm}
.mute{color:#a59d8f}.small{font-size:8.5pt;color:#a59d8f}
.line{height:1px;background:#3a3732;margin:7mm 0}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:7mm}.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:5mm}.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:4mm}
.card{border:1px solid #34312c;border-radius:3mm;padding:5mm;background:#151413}
.num{font:700 20pt/1 Helvetica;color:#efebe3}
img.ph{width:100%;display:block;border-radius:2mm}
.step{display:flex;gap:5mm;margin-bottom:5mm}.step .n{flex:0 0 9mm;height:9mm;border-radius:50%;border:1px solid #efebe3;display:flex;align-items:center;justify-content:center;font-weight:700}
.tag{display:inline-block;border:1px solid #6d665b;border-radius:99px;padding:1.2mm 3.5mm;font-size:8pt;letter-spacing:.12em;text-transform:uppercase;color:#d9d3c7;margin:0 2mm 2mm 0}
table{width:100%;border-collapse:collapse}td{padding:2.5mm 0;border-bottom:1px solid #2c2a26;vertical-align:top}td:first-child{width:45mm;color:#a59d8f}
a{color:#efebe3}
.big{font:700 30pt/1 Helvetica}.price td{padding:4mm 0;font-size:11.5pt}.price td:first-child{width:95mm}.pt{display:flex;gap:4mm;margin-bottom:4.5mm}.pt .n{flex:0 0 7mm;font:700 11pt Helvetica;color:#6F8DFF}.acc{color:#6F8DFF}
.foot{position:absolute;left:18mm;right:18mm;bottom:10mm;display:flex;justify-content:space-between;font-size:7.5pt;color:#6d665b;letter-spacing:.1em;text-transform:uppercase}
`;
let pg = 0;
const foot = () => `<div class="foot"><span>TattooLeadz × Isto Tattoo</span><span>${++pg} / 4</span></div>`;
const pages = [];

// 1 Cover
pages.push(`<div class="p cover"><img src="${FOTO("002b1f6-DSC02471-JPEG-SMALL-UP-1920w.jpg")}" style="object-position:50% 30%"><div class="t">
<div class="k">Angebot für Michalis · Isto Tattoo Stuttgart</div>
<h1>Mehr <b>Großprojekte.</b><br>Weniger Kleinkram.</h1>
<div class="lead">Werbung, die Menschen bringt, die für ein Sleeve, einen Rücken oder eine Brust bereit sind – und dafür nach Stuttgart fahren.</div>
<div class="small" style="margin-top:8mm">TattooLeadz · Domenic Schilling · November 2026</div></div>${foot()}</div>`);

// 2 Was anders ist
pages.push(`<div class="p"><div class="k">01 · Was bei uns anders ist</div><h2>Gezählt werden <b>gebuchte Tage,</b><br>nicht Anfragen.</h2>
<div class="g2"><div>
<div class="pt"><div class="n">1</div><div><h3>Nur ernsthafte Anfragen</h3><p class="mute">Preis steht offen auf der Seite. Die Anfrage fragt Körperstelle, Fläche, Idee, Zeitraum und PLZ ab. Wer dann noch anfragt, meint es ernst.</p></div></div>
<div class="pt"><div class="n">2</div><div><h3>Deine Seite statt Vorlage</h3><p class="mute">Ein dunkles Lookbook nur mit deinen Arbeiten, nach Körperstelle sortiert. Anzeige und Seite sehen gleich aus.</p></div></div>
<div class="pt"><div class="n">3</div><div><h3>Größerer Kreis</h3><p class="mute">Wer dich schon kennt, ca. 150 km um Stuttgart, DACH – und vor jedem Gastauftritt die jeweilige Stadt.</p></div></div>
<div class="pt"><div class="n">4</div><div><h3>Alles in einer Liste</h3><p class="mute">Jede Anfrage landet sofort in deiner Google-Sheets-Liste. Dein WhatsApp-Team meldet sich, du siehst jeden Stand.</p></div></div>
<div class="pt"><div class="n">5</div><div><h3>Monatlich kündbar</h3><p class="mute">Kein langer Vertrag. Wir müssen jeden Monat neu überzeugen.</p></div></div>
</div><div class="g2" style="gap:3mm;align-content:start">
<img class="ph" src="${FOTO("cfb1a41-25-DSC03213-JPEG-SMALL-UP-1920w.jpg")}"><img class="ph" src="${FOTO("8cc34ea-23-DSC08950-JPEG-SMALL-UP-1920w.jpg")}">
<img class="ph" src="${FOTO("fc3fd9f-20-DSC06886-JPEG-SMALL-UP-1920w.jpg")}"><img class="ph" src="${FOTO("3180fbf-9-DSC04684-JPEG-SMALL-UP-1920w.jpg")}">
</div></div>${foot()}</div>`);

// 3 So sieht es aus
const lpShots = ["lp-390-1", "lp-detail-kapitel-ruecken-390", "lp-detail-formular-390"].filter((n) => has(`${SH}/${n}.jpg`));
pages.push(`<div class="p"><div class="k">02 · So sieht es aus (Entwurf)</div><h2>Deine <b>Seite</b> und deine <b>Werbung.</b></h2>
<div class="g3" style="align-items:start">${lpShots.map((n) => `<img class="ph" src="${F(`${SH}/${n}.jpg`)}" style="height:112mm;object-fit:cover;object-position:top">`).join("")}</div>
<p class="small" style="margin:3mm 0 6mm">Seite ansehen: <a href="${LP_URL}">${LP_URL.replace("https://", "")}</a></p>
<div class="g4">${ads.map(({ k }) => `<img class="ph" src="${F(`${CR}/${k}/story.jpg`)}" style="height:82mm;object-fit:cover">`).join("")}</div>
<p class="small" style="margin-top:3mm">Mit deinen Fotos von istotattoo.com. Texte, Preise und Bilder stimmen wir mit dir ab.</p>${foot()}</div>`);

// 4 Preis + Start
pages.push(`<div class="p"><div class="k">03 · Preis &amp; Start</div><h2>Erst testen.<br><b>Dann entscheiden.</b></h2>
<table class="price">
<tr><td><b>1. Monat – Test</b><br><span class="small">Seite, Werbemittel, Kampagne, Sheets-Liste</span></td><td><span class="big">499 €</span></td></tr>
<tr><td><b>Ab Monat 2</b><br><span class="small">Betreuung, neue Werbemittel, Auswertung jede Woche</span></td><td><span class="big">699 €</span> <span class="small">/ Monat</span></td></tr>
<tr><td><b>Optional: WhatsApp-Chatbot</b><br><span class="small">antwortet sofort, auch nachts, und lädt zum Projekt-Check ein</span></td><td><span class="big" style="font-size:20pt">+149 €</span> <span class="small">/ Monat</span></td></tr>
</table>
<p class="small" style="margin-top:3mm">Alle Preise netto zzgl. MwSt. · monatlich kündbar · Werbebudget zahlst du direkt an Meta (Empfehlung ca. 25 €/Tag).</p>
<div class="line"></div>
<div class="g2"><div><h3>In zwei Wochen live</h3><p class="mute">Woche 1: deine Preise, freie Tage, ein paar Handy-Clips, Zugriff auf Instagram/Facebook. Woche 2: deine Freigabe, Werbung startet.</p></div>
<div><h3>Nächster Schritt</h3><p class="mute">Kurzer Call – dann legen wir los.<br><b style="color:#efebe3">Domenic Schilling · TattooLeadz</b></p></div></div>
<img class="ph" src="${FOTO("1df6655-DSC05917-JPEG-SMALL-UP-1920w.jpg")}" style="margin-top:9mm;height:95mm;object-fit:cover;object-position:50% 35%">
${foot()}</div>`);

const tmp = path.join(here, "_kurz.html");
fs.writeFileSync(tmp, `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>${css}</style></head><body>${pages.join("")}</body></html>`);
const b = await chromium.launch();
const p = await b.newPage();
await p.goto("file://" + tmp);
await p.waitForTimeout(1500);
const out = path.join(here, "Isto-Tattoo-Angebot-TattooLeadz.pdf");
await p.pdf({ path: out, format: "A4", printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } });
await b.close();
fs.unlinkSync(tmp);
console.log("✓", path.relative(repo, out), (fs.statSync(out).size / 1024 / 1024).toFixed(1), "MB");
