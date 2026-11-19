// Stand-PDF Tattoo Fashion Itzehoe (für Domenic): node content/kunden/tattoo-fashion-itzehoe/stand-2026-11-11/build.mjs
// → Tattoo-Fashion-Itzehoe-Stand-2026-11-11.pdf (gleicher Ordner). Bilder werden lokal eingebettet, Videos verlinkt.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../../..");
const R = (p) => "file://" + path.join(repo, p);
const LP = "https://tattoo-fashion-itzehoe-gluecksrad.netlify.app";
const MEDIA = "https://domenicschilling.github.io/marketing-media/tf-itzehoe/creatives/2026-11-11-gluecksrad";
const CR = "content/tf-itzehoe/creatives/2026-11-11-gluecksrad";
const SHOTS = "content/kunden/tattoo-fashion-itzehoe/stand-2026-11-11/shots";
const exists = (p) => fs.existsSync(path.join(repo, p));

const ads = ["g-a", "g-b", "g-c"].map((k) => ({ k, j: JSON.parse(fs.readFileSync(path.join(repo, CR, k, "creative.json"), "utf8")) }));
const reels = ["reel-a", "reel-b"].map((k) => ({ k, j: JSON.parse(fs.readFileSync(path.join(repo, CR, k, "creative.json"), "utf8")) }));

const css = `
@page{size:A4;margin:16mm 14mm 18mm}
*{box-sizing:border-box}body{font:10.5pt/1.5 -apple-system,Helvetica,Arial,sans-serif;color:#1b1a17;margin:0}
h1{font:700 22pt/1.15 Helvetica;margin:0 0 4mm}h2{font:700 14pt Helvetica;margin:9mm 0 3mm;padding-bottom:2mm;border-bottom:2px solid #C8A35A;page-break-after:avoid}
h3{font:700 11pt Helvetica;margin:5mm 0 2mm}
.sub{color:#6b655a;margin:0 0 6mm}a{color:#8a6a24;word-break:break-all}
table{width:100%;border-collapse:collapse;margin:2mm 0}td,th{border-bottom:1px solid #e6e0d4;padding:2mm 2mm;vertical-align:top;text-align:left}th{width:38%;color:#5a5448;font-weight:600}
.ok{color:#1d7a3a;font-weight:700}.wait{color:#b06a00;font-weight:700}.todo{color:#b42318;font-weight:700}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:5mm}.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm}
.card{border:1px solid #e6e0d4;border-radius:3mm;padding:3mm;page-break-inside:avoid}
.card img{width:100%;display:block;border-radius:2mm}
.small{font-size:9pt;color:#5a5448;white-space:pre-line}
.box{background:#faf6ec;border:1px solid #e8dcbc;border-radius:3mm;padding:3mm 4mm;margin:3mm 0}
.pb{page-break-before:always}
`;

const row = (a, b) => `<tr><th>${a}</th><td>${b}</td></tr>`;
const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>${css}</style></head><body>
<h1>Tattoo Fashion Itzehoe – Stand</h1>
<p class="sub">11.11.2026 · Glücksrad-Aktion zur Wiedereröffnung am 16.11. · alles, was schon fertig ist</p>

<div class="box"><b>Kurz:</b> Seite ist live, Gutschein-Ablauf (Make + Sheet + WhatsApp-Vorlage) steht, 3 Werbebilder (je Feed + Story) und 2 Reels sind fertig – alles ohne Tattoo-Fotos (nur Logo, Glücksrad, Gutschein, Text).
Werbung ist <b>noch nicht</b> geschaltet: Es fehlen der Zugriff aufs Werbekonto (Studio muss annehmen), die Freigabe der WhatsApp-Vorlage durch Meta und deine Freigabe der Werbemittel.</div>

<h2>Links</h2>
<table>
${row("Glücksrad-Seite (live)", `<a href="${LP}">${LP}</a>`)}
${row("Anfragen-Liste (Google Sheet)", `<a href="https://docs.google.com/spreadsheets/d/1_UO9Wk3GOTUOnT4JcrJ1fm2im0LVxIqUQMfQ2doAyqE/edit">Itzehoe Glücksrad</a>`)}
${row("Gutschein-Bild (geht per WhatsApp raus)", `<a href="https://domenicschilling.github.io/marketing-media/tf-itzehoe/gutschein/gutschein-20.jpg">gutschein-20.jpg</a>`)}
${row("Reel A – Wiedereröffnung", `<a href="${MEDIA}/reel-a/reel.mp4">${MEDIA}/reel-a/reel.mp4</a>`)}
${row("Reel B – Neues Tattoo?", `<a href="${MEDIA}/reel-b/reel.mp4">${MEDIA}/reel-b/reel.mp4</a>`)}
${row("Werbebilder (Ordner)", `<a href="${MEDIA}/">${MEDIA}/</a>`)}
</table>

<h2>Stand je Baustein</h2>
<table>
${row("Vertrag", `<span class="ok">verschickt</span> (750 € netto/Monat + 299 € Einrichtung, 3 Monate) – wartet auf Unterschrift`)}
${row("Glücksrad-Seite", `<span class="ok">live</span> – Wiedereröffnung 16.11., Gutschein bis 30.11.2026 (nur Beratung bis dahin, Tattoo auch später), ohne Tattoo-Fotos, Bereich „Arbeiten“ ausgeblendet`)}
${row("Make-Szenario 10146883", `<span class="wait">bereit, noch aus</span> – Code IZ20-xxxxx, Zeile ins Sheet, Gutschein per WhatsApp von 0152 04357732. Wird eingeschaltet, sobald Meta die Vorlage freigibt.`)}
${row("WhatsApp-Vorlage „IZ Gluecksrad Gutschein“", `<span class="wait">bei Meta in Prüfung</span> (bis 24 h)`)}
${row("Superchat-Automation (1 Stück, kein Bot)", `<span class="wait">Entwurf angelegt</span> – Gutschein-Knopf → Einladung zur kostenlosen Beratung → Terminwunsch → Bestätigung. Fertig nach Vorlagen-Freigabe.`)}
${row("Werbekonto 1947027219607469", `<span class="wait">Zugriff angefragt, Studio sieht keine Einladung</span> – einfacher: Studio fügt dich direkt als Admin hinzu`)}
${row("Facebook-Seite", `<span class="wait">Zugriff angefragt, Studio sieht keine Einladung</span> – einfacher: Studio fügt dich direkt als Admin hinzu`)}
${row("Reels mit Sprecher", `<span class="todo">Stimmen fehlen noch</span> – Higgsfield hat 0 Credits. Reels laufen bis dahin mit Musik und Text im Bild. Texte für Pixie (A) und Benji (B) liegen bereit.`)}
${row("Pixel / Messung", `<span class="todo">offen</span> – Pixel-ID kommt nach Werbekonto-Zugriff`)}
</table>

<h2 class="pb">Glücksrad-Seite</h2>
<div class="grid2">
${["390-1", "390-2", "768-1", "1440-1"].filter((n) => exists(`${SHOTS}/${n}.jpg`)).map((n) => `<div class="card"><img src="${R(`${SHOTS}/${n}.jpg`)}"><div class="small">${n.startsWith("390") ? "Handy" : n.startsWith("768") ? "Tablet" : "Computer"}</div></div>`).join("")}
</div>
<h3>Gutschein (Bild in der WhatsApp-Nachricht)</h3>
<div class="card" style="width:70%"><img src="${R("landingpages/tf-itzehoe-gluecksrad/img/gutschein-20.jpg")}"></div>

<h2 class="pb">Werbebilder</h2>
${ads.map(({ k, j }) => `<div class="card" style="margin-bottom:5mm"><h3>${k.toUpperCase()} · ${j.angle}</h3>
<div class="grid2"><img src="${R(`${CR}/${k}/feed.jpg`)}"><img src="${R(`${CR}/${k}/story.jpg`)}" style="height:118mm;width:auto;margin:auto"></div>
<div class="small" style="margin-top:2mm"><b>Text:</b> ${j.primaryTexts[0]}
<b>Überschrift:</b> ${j.headlines[0]}</div></div>`).join("")}

<h2 class="pb">Reels</h2>
<div class="grid2">
${reels.map(({ k, j }) => `<div class="card"><img src="${R(`${CR}/${k}/cover.jpg`)}"><h3>${j.angle}</h3>
<div class="small">Video: <a href="${MEDIA}/${k}/reel.mp4">${MEDIA}/${k}/reel.mp4</a>
Länge: ${j.files.seconds} s
<b>Text:</b> ${j.primaryTexts[0]}</div></div>`).join("")}
</div>
<h3>Sprechertexte (kommen dazu, sobald Higgsfield-Credits da sind)</h3>
${["tf-itzehoe-reel-a", "tf-itzehoe-reel-b"].map((s) => { const t = JSON.parse(fs.readFileSync(path.join(repo, "spots", s, "spot/vo/texte.json"), "utf8")); return `<div class="box"><b>${s.endsWith("a") ? "Reel A" : "Reel B"} – ${t.stimme.split(" ")[0]}</b><br>${Object.entries(t).filter(([k]) => k.startsWith("vo")).map(([, v]) => "„" + v + "“").join("<br>")}</div>`; }).join("")}

<h2>Was ich von dir brauche</h2>
<table>
${row("1", "Werbemittel ansehen und freigeben (oder sagen, was anders soll)")}
${row("2", "Higgsfield-Credits aufladen – dann vertone ich beide Reels (Pixie + Benji)")}
${row("3", "Studio: dich als Admin bei Seite und Werbekonto hinzufügen lassen (Text kommt per Chat)")}
${row("4", "Pixel-ID / Werbekonto: sobald der Zugriff da ist, richte ich die Messung ein")}
</table>
</body></html>`;

const tmp = path.join(here, "_stand.html");
fs.writeFileSync(tmp, html);
const b = await chromium.launch();
const p = await b.newPage();
await p.goto("file://" + tmp);
await p.waitForTimeout(1500);
const out = path.join(here, "Tattoo-Fashion-Itzehoe-Stand-2026-11-11.pdf");
await p.pdf({ path: out, format: "A4", printBackground: true, displayHeaderFooter: true, headerTemplate: "<span></span>", footerTemplate: '<div style="font-size:8px;width:100%;text-align:center;color:#888">Tattoo Fashion Itzehoe · Stand 11.11.2026 · Seite <span class="pageNumber"></span>/<span class="totalPages"></span></div>', margin: { top: "16mm", bottom: "18mm", left: "14mm", right: "14mm" } });
await b.close();
fs.unlinkSync(tmp);
console.log("✓", path.relative(repo, out), (fs.statSync(out).size / 1024 / 1024).toFixed(1), "MB");
