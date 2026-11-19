// Pitch-PDF für Michalis (Isto Tattoo): node content/kunden/isto-tattoo/pitch-2026-11-12/build.mjs
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
const LP_URL = process.env.LP_URL || "";
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
.foot{position:absolute;left:18mm;right:18mm;bottom:10mm;display:flex;justify-content:space-between;font-size:7.5pt;color:#6d665b;letter-spacing:.1em;text-transform:uppercase}
`;
let pg = 0;
const foot = () => `<div class="foot"><span>TattooLeadz × Isto Tattoo</span><span>${++pg}</span></div>`;

const pages = [];
// 1 Cover
pages.push(`<div class="p cover"><img src="${FOTO("002b1f6-DSC02471-JPEG-SMALL-UP-1920w.jpg")}" style="object-position:50% 30%"><div class="t">
<div class="k">Vorschlag für Michalis · Isto Tattoo Stuttgart</div>
<h1>Mehr <b>Großprojekte.</b><br>Weniger Kleinkram.</h1>
<div class="lead">Wie wir Menschen zu dir bringen, die für ein Sleeve, einen Rücken oder eine Brust bereit sind – und dafür auch nach Stuttgart fahren.</div>
<div class="small" style="margin-top:8mm">TattooLeadz · Domenic Schilling &amp; Andy Neelsen · November 2026</div></div></div>`);

// 2 Was wir sehen
pages.push(`<div class="p"><div class="k">01 · Was wir sehen</div><h2>Deine Arbeit ist <b>top.</b><br>Der Weg zu dir ist es noch nicht.</h2>
<div class="g2"><div>
<h3>Stark</h3><p class="mute">Neo-Blackwork, Ornamentik und Geometrie, die der Körperform folgen. Fast nur ganze Sleeves, Rücken, Brust und Bein. Gastauftritte in ganz Europa und UK. Eine klare Haltung: keine Kopien, keine kleinen Motive.</p>
<h3 style="margin-top:6mm">Was fehlt</h3><p class="mute">Anfragen kommen ungefiltert über Instagram-Nachrichten und WhatsApp. Wer ernsthaft ein Großprojekt will, findet keinen klaren Weg: Was kostet es? Wie viele Sitzungen? Lohnt sich die Anfahrt? Und die meisten Tattoo-Anzeigen in Deutschland sagen nur „DM für einen Termin“.</p>
</div><div class="g2" style="gap:3mm">
<img class="ph" src="${FOTO("cfb1a41-25-DSC03213-JPEG-SMALL-UP-1920w.jpg")}"><img class="ph" src="${FOTO("8cc34ea-23-DSC08950-JPEG-SMALL-UP-1920w.jpg")}">
<img class="ph" src="${FOTO("fc3fd9f-20-DSC06886-JPEG-SMALL-UP-1920w.jpg")}"><img class="ph" src="${FOTO("3180fbf-9-DSC04684-JPEG-SMALL-UP-1920w.jpg")}">
</div></div>${foot()}</div>`);

// 3 Plan
pages.push(`<div class="p"><div class="k">02 · Der Plan</div><h2>Vier Bausteine,<br><b>ein Ziel: gebuchte Tage.</b></h2>
<div class="step"><div class="n">1</div><div><h3>Eigene Projekt-Seite</h3><p class="mute">Deine Arbeiten nach Körperstelle, wie du arbeitest, ehrliche Preise, Ablauf, Anfahrt. Am Ende eine kurze Projekt-Anfrage statt „schreib mal“.</p></div></div>
<div class="step"><div class="n">2</div><div><h3>Werbung auf Instagram &amp; Facebook</h3><p class="mute">Deine echten Arbeiten als Bilder und Reels. Ausgespielt an Menschen, die sich für große Tattoos interessieren – rund um Stuttgart und weiter weg.</p></div></div>
<div class="step"><div class="n">3</div><div><h3>Filter vor dem Gespräch</h3><p class="mute">Die Anfrage fragt Körperstelle, Fläche, Idee, Zeitraum und Postleitzahl ab. Wer anfragt, hat den Preis vorher gesehen. Jess bekommt nur noch ernsthafte Projekte.</p></div></div>
<div class="step"><div class="n">4</div><div><h3>Bis zur Anzahlung begleiten</h3><p class="mute">Sofortige Eingangsbestätigung per WhatsApp, kostenloser Projekt-Check per Video oder im Studio, dann Anzahlung und erster Termin. Wir messen jeden Schritt.</p></div></div>
<div class="line"></div>
<table><tr><td>Wen wir ansprechen</td><td>① Menschen, die dich schon kennen (Instagram, Website) · ② Umkreis ca. 150 km um Stuttgart · ③ Deutschland, Österreich, Schweiz – und vor jedem Gastauftritt die jeweilige Stadt</td></tr>
<tr><td>Warum Anfahrt kein Problem ist</td><td>Ein Großprojekt sind wenige, volle Tage – keine 20 Termine. Wie weit deine Kunden wirklich fahren, messen wir über die Postleitzahl.</td></tr></table>
${foot()}</div>`);

// 4 Angebot
pages.push(`<div class="p"><div class="k">03 · Das Angebot</div><h2>300 € auf die<br><b>erste Tagessitzung.</b></h2>
<div class="g2"><div>
<p class="lead">Der schwerste Schritt bei einem Großprojekt ist der Anfang. Dein Startbonus macht genau diesen Schritt leichter – ohne deinen Preis zu beschädigen.</p>
<table style="margin-top:6mm"><tr><td>Tagessitzung</td><td><b>1.200 €</b></td></tr><tr><td>Erste Tagessitzung eines neuen Großprojekts</td><td><b>900 €</b></td></tr><tr><td>Gilt für</td><td>Sleeve, Rücken, Brust/Front, Bein · 1× pro Person · Anfrage über die Seite · Projektstart bis 28.02.2027 (Vorschlag)</td></tr></table>
</div><div class="card"><h3>Warum sich das rechnet</h3><p class="mute">Ein Sleeve braucht meist mehrere Tagessitzungen. Bei 4 Tagen sind das 4.800 € Projektwert – der Startbonus ist davon gut 6 %. Und er bringt Menschen dazu, jetzt zu starten statt „irgendwann“.</p>
<p class="small">Rechenbeispiel mit angenommenen 4 Tagen – die echte Zahl je Projekt kennst du am besten.</p>
<h3 style="margin-top:6mm">Was wir bewusst nicht machen</h3><p class="mute">Kein Glücksrad, keine Countdown-Uhr, kein „nur noch 2 Plätze“. Großprojekt-Kunden kaufen Vertrauen, keine Schnäppchen.</p></div></div>
${foot()}</div>`);

// 5 Landingpage
const lpShots = ["lp-390-1", "lp-detail-kapitel-ruecken-390", "lp-detail-formular-390"].filter((n) => has(`${SH}/${n}.jpg`));
pages.push(`<div class="p"><div class="k">04 · Deine Projekt-Seite (Vorschau)</div><h2>So sieht deine <b>Seite</b> aus.</h2>
${LP_URL ? `<p>Live ansehen: <a href="${LP_URL}">${LP_URL}</a></p>` : ""}
<div class="g3" style="align-items:start">${lpShots.slice(0, 3).map((n) => `<img class="ph" src="${F(`${SH}/${n}.jpg`)}" style="max-height:200mm;object-fit:cover;object-position:top">`).join("")}</div>
<p class="small" style="margin-top:4mm">Handy: Startbild · Kapitel „Rücken“ · Anfrage Schritt für Schritt mit deinen Arbeiten als Auswahl. Entwurf mit deinen Fotos von istotattoo.com – Texte und Preise passen wir mit dir an.</p>${foot()}</div>`);
const details = fs.existsSync(path.join(repo, SH)) ? fs.readdirSync(path.join(repo, SH)).filter((f) => ["lp-1440-1.jpg", "lp-detail-artist-1440.jpg", "lp-detail-galerie-1440.jpg"].includes(f)) : [];
if (details.length) pages.push(`<div class="p"><div class="k">04 · Deine Projekt-Seite – Details</div><h2>Am Computer: <b>dein Lookbook.</b></h2><div style="display:grid;gap:5mm">${details.map((f) => `<img class="ph" src="${F(`${SH}/${f}`)}" style="height:68mm;object-fit:cover;object-position:top">`).join("")}</div>${foot()}</div>`);

// 6 Werbung
if (ads.length) {
  pages.push(`<div class="p"><div class="k">05 · Deine Werbung (Vorschau)</div><h2>Echte Arbeiten.<br><b>Klare Botschaft.</b></h2>
<div class="g4">${ads.map(({ k }) => `<img class="ph" src="${F(`${CR}/${k}/story.jpg`)}">`).join("")}</div>
<div class="g2" style="margin-top:6mm">${ads.slice(0, 4).map(({ j }) => `<div><h3>${j.headlines?.[0] || ""}</h3><p class="small">„${(j.primaryTexts?.[0] || "").split("\n")[0].split(/(?<=[.!?])\s/)[0]}“</p></div>`).join("")}</div>
${has(`${CR}/reel-a/cover.jpg`) ? `<div class="g2" style="margin-top:4mm;align-items:center"><img class="ph" src="${F(`${CR}/reel-a/cover.jpg`)}" style="width:45mm"><div><h3>Reel</h3><p class="mute">16 Sekunden Motion-Video aus deinen Fotos: Konstruktionslinien zeichnen sich über Rücken und Knie, Schnitte im Takt, am Ende dein Angebot.${REEL_URL ? ` Ansehen: <a href="${REEL_URL}">${REEL_URL}</a>` : ""}</p></div></div>` : ""}
${foot()}</div>`);
}

// 7 Ablauf + Messung
pages.push(`<div class="p"><div class="k">06 · Ablauf &amp; Ergebnisse</div><h2>In zwei Wochen <b>live.</b></h2>
<table><tr><td>Woche 1</td><td>Deine Preise, freien Tage und 10–20 kurze Clips von dir · Seite fertig · Messung einrichten · WhatsApp-Weg mit Jess</td></tr>
<tr><td>Woche 2</td><td>Deine Freigabe · Werbung startet</td></tr>
<tr><td>Woche 2–5</td><td>Testen: welche Arbeiten, welche Region, welche Botschaft bringt passende Anfragen</td></tr>
<tr><td>Ab Woche 6</td><td>Was funktioniert, bekommt mehr Budget · Gastauftritt-Kampagnen</td></tr></table>
<div class="line"></div>
<h3>Was wir dir jede Woche zeigen</h3>
<div class="g4" style="margin-top:3mm">${["Anfragen", "Passende Projekte", "Projekt-Checks", "Gebuchte Tage"].map((t) => `<div class="card"><div class="num">—</div><div class="small">${t}</div></div>`).join("")}</div>
<p class="small" style="margin-top:4mm">Wir versprechen keine Zahl, bevor wir gemessen haben. Gezählt wird, was zählt: gebuchte Tage, nicht Klicks.</p>
<div class="line"></div>
<h3>Was wir von dir brauchen</h3><p class="mute">Halbtagespreis · typische Tage je Sleeve/Rücken/Brust · freie Tage in Stuttgart (Dez.–Feb.) und nächste Gastauftritte · 10–20 kurze Handyclips (Zeichnen, Stechen, fertige Stücke) · Zugriff auf Instagram/Facebook/Werbekonto · Kontakt zu Jess</p>
${foot()}</div>`);

// 8 Abschluss
pages.push(`<div class="p cover"><img src="${FOTO("1df6655-DSC05917-JPEG-SMALL-UP-1920w.jpg")}"><div class="t">
<div class="k">Nächster Schritt</div><h1>Lass uns dein nächstes<br><b>Großprojekt</b> finden.</h1>
<div class="lead">Kurzer Call, deine Zahlen und Termine – danach sind wir in zwei Wochen live.</div>
<div class="small" style="margin-top:8mm">Domenic Schilling · TattooLeadz</div></div></div>`);

const tmp = path.join(here, "_pitch.html");
fs.writeFileSync(tmp, `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>${css}</style></head><body>${pages.join("")}</body></html>`);
const b = await chromium.launch();
const p = await b.newPage();
await p.goto("file://" + tmp);
await p.waitForTimeout(1500);
const out = path.join(here, "Isto-Tattoo-Pitch-TattooLeadz.pdf");
await p.pdf({ path: out, format: "A4", printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } });
await b.close();
fs.unlinkSync(tmp);
console.log("✓", path.relative(repo, out), (fs.statSync(out).size / 1024 / 1024).toFixed(1), "MB");
