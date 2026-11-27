// Gestaltete App-Store-Bilder aus echten App-Aufnahmen (Version 2, 25.11.2026).
// Aufruf: node render.mjs <ordner-mit-aufnahmen> <ausgabe-ordner>
// Aufnahmen: PNG 1320 × 2868 vom 6,9-Zoll-iPhone (StoreWerbebilderUITests). Ausgabe: je Bild 6,9 Zoll (1320 × 2868)
// und 6,5 Zoll (1284 × 2778) in Unterordnern 69/ und 65/, dazu kontaktbogen.png.
// Gestaltung: Tattoofin-Gelb mit Punktraster (wie das App-Symbol), Marineblau, Luckiest Guy. Ein marineblaues Band läuft als
// Panorama über alle Bilder (jedes Bild zeigt seinen Ausschnitt), Bild-Rhythmus hell/dunkel wechselt.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import os from "node:os";
// playwright aus dem Marketing-Maschine-Ordner (ESM ignoriert NODE_PATH)
const { chromium } = createRequire(path.join(process.env.PLAYWRIGHT_DIR || path.join(os.homedir(), "Marketing-Maschine"), "x.js"))("playwright");

const hier = path.dirname(fileURLToPath(import.meta.url));
const [quelle = path.join(hier, "aufnahmen"), ziel = path.join(hier, "fertig")] = process.argv.slice(2);
const bilder = JSON.parse(fs.readFileSync(path.join(hier, "bilder.json"), "utf8"));
const assets = path.resolve(hier, "../../../website/public/assets");
const b64 = (f) => fs.readFileSync(f).toString("base64");
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
const icon = path.resolve(hier, "../../Tattoofin/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png");

const W = 1320, H = 2868, N = bilder.length;
const GOLD = "#ffbd16", NAVY = "#1f3d5c", NACHT = "#13243d", CREME = "#fffaf0";

// Panorama-Band: eine Welle über die ganze Bildfolge (Breite N × W). Jedes Bild verschiebt es um -i × W.
function band() {
  const pts = [];
  const gesamt = N * W;
  for (let x = 0; x <= gesamt; x += 40) {
    const y = 1720 + Math.sin(x / 1700) * 300 + Math.sin(x / 640) * 80;
    pts.push(`${x},${y.toFixed(1)}`);
  }
  const oben = pts.join(" L");
  const unten = pts.slice().reverse().map((p) => { const [x, y] = p.split(","); return `${x},${(+y + 380).toFixed(1)}`; }).join(" L");
  return `<svg xmlns='http://www.w3.org/2000/svg' width='${gesamt}' height='${H}' viewBox='0 0 ${gesamt} ${H}'><path d='M${oben} L${unten} Z' fill='${CREME}' opacity='.95'/><path d='M${pts.map((p) => { const [x, y] = p.split(","); return `${x},${(+y - 26).toFixed(1)}`; }).join(" L")}' fill='none' stroke='${GOLD}' stroke-width='12' stroke-dasharray='2 36' stroke-linecap='round'/></svg>`;
}
const BAND = "data:image/svg+xml;base64," + Buffer.from(band()).toString("base64");

function handy(datei, { breite = 980, x = (W - 980) / 2, y = 1000, drehung = 0, z = 2 } = {}) {
  const h = Math.round(breite * 2868 / 1320);
  const rand = Math.round(breite * 0.032), radius = Math.round(breite * 0.155);
  return `<div class="handy" style="left:${x}px;top:${y}px;width:${breite + 2 * rand}px;height:${h + 2 * rand}px;border-radius:${radius + rand}px;padding:${rand}px;transform:rotate(${drehung}deg);z-index:${z}">
  <span class="knopf l1"></span><span class="knopf l2"></span><span class="knopf l3"></span><span class="knopf r1"></span>
  <img src="data:image/png;base64,${b64(path.join(quelle, datei))}" style="border-radius:${radius}px" alt="">
  ${(arguments[1]?.markierung || []).map((m) => `<span class="mark" style="left:${rand + m.x * breite / 1320}px;top:${rand + m.y * breite / 1320}px;width:${m.w * breite / 1320}px;height:${m.h * breite / 1320}px"></span>${m.text ? `<span class="marktext" style="left:${rand + (m.x + m.w) * breite / 1320 - 20}px;top:${rand + m.y * breite / 1320 - 70}px">${esc(m.text)}</span>` : ""}`).join("")}
  <span class="insel" style="width:${Math.round(breite * .29)}px;height:${Math.round(breite * .085)}px;top:${rand + Math.round(breite * .035)}px"></span></div>`;
}

const seite = (b, i) => {
  const dunkel = b.ton === "dunkel";
  const vorne = dunkel ? CREME : NAVY;
  const handys = (b.handys || [{ datei: b.datei }]).map((h) => handy(h.datei, h)).join("\n");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Luckiest;src:url(data:font/woff2;base64,${b64(path.join(assets, "fonts/LuckiestGuy.woff2"))})}
@font-face{font-family:DMSans;src:url(data:font/woff2;base64,${b64(path.join(assets, "fonts/DMSans.woff2"))});font-weight:100 900}
*{margin:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{background:${dunkel ? NACHT : GOLD};font-family:DMSans,sans-serif;color:${vorne};position:relative}
.raster{position:absolute;inset:0;background-image:radial-gradient(circle, ${dunkel ? "rgba(255,189,22,.16)" : "rgba(31,61,92,.13)"} 7px, transparent 8px);background-size:56px 56px;background-position:28px 28px}
.band{position:absolute;top:0;left:${-i * W}px;width:${N * W}px;height:${H}px;background:url(${BAND}) no-repeat;background-size:${N * W}px ${H}px;opacity:${dunkel ? ".16" : ".55"}}
.kopf{position:absolute;top:${b.kopfTop ?? 170}px;left:96px;right:96px;z-index:5;text-align:${b.links ? "left" : "center"}}
.marke{display:flex;align-items:center;gap:26px;${b.links ? "" : "justify-content:center;"}margin-bottom:70px}
.marke img.ic{width:104px;height:104px;border-radius:24px;border:5px solid ${dunkel ? "rgba(255,250,240,.0)" : NACHT};box-shadow:0 6px 0 ${dunkel ? "rgba(0,0,0,.35)" : NACHT}}
.marke img.wm{height:70px}
.marke .wm-navy{height:70px;width:${Math.round(70 * 519 / 116)}px;background:${NACHT};-webkit-mask:url(data:image/png;base64,${b64(path.join(assets, "wortmarke.png"))}) center/contain no-repeat}
h1{font-family:Luckiest;font-weight:400;font-size:${b.groesse || 150}px;line-height:.98;letter-spacing:1px;text-transform:uppercase;color:${dunkel ? GOLD : NACHT};text-shadow:${dunkel ? "7px 7px 0 rgba(0,0,0,.45)" : `7px 7px 0 ${CREME}`}}
h1 em{font-style:normal;color:${dunkel ? CREME : CREME};text-shadow:7px 7px 0 ${dunkel ? "rgba(0,0,0,.45)" : NACHT}}
.sub{margin-top:46px;font-size:58px;line-height:1.22;font-weight:700;color:${vorne}}
.chips{margin-top:44px;display:flex;gap:20px;flex-wrap:wrap;${b.links ? "" : "justify-content:center;"}}
.chip{font-size:44px;font-weight:800;padding:18px 34px;border-radius:999px;background:${dunkel ? GOLD : NACHT};color:${dunkel ? NACHT : CREME}}
.stempel{position:absolute;z-index:6;background:${CREME};color:${NACHT};font-family:Luckiest;text-transform:uppercase;text-align:center;border:8px solid ${NACHT};box-shadow:10px 10px 0 ${NACHT};border-radius:36px;padding:34px 44px 24px;line-height:1.02;transform:rotate(-5deg)}
.stempel b{display:block;font-weight:400;color:${NAVY}}
.stempel small{display:block;margin-top:14px;font-family:DMSans,sans-serif;font-weight:700;font-size:30px;text-transform:none;color:${NACHT}}
.handy{position:absolute;background:linear-gradient(145deg,#3a4656,#11161d 40%,#2b3440 70%,#0c1015);box-shadow:0 0 0 3px #5b6776 inset, 0 60px 120px rgba(10,20,35,.45), 0 18px 40px rgba(10,20,35,.35)}
.handy img{width:100%;height:100%;display:block;object-fit:cover;object-position:top}
.handy .insel{position:absolute;left:50%;transform:translateX(-50%);background:#000;border-radius:999px}
.mark{position:absolute;border:9px solid ${GOLD};border-radius:28px;box-shadow:0 0 0 6px rgba(19,36,61,.85), 0 18px 40px rgba(19,36,61,.35);z-index:3}
.marktext{position:absolute;transform:translateX(-100%);background:${NACHT};color:${GOLD};font-family:Luckiest;font-size:46px;padding:18px 26px 10px;border-radius:18px;white-space:nowrap;z-index:4;text-transform:uppercase}
.knopf{position:absolute;background:#2b3440;border-radius:6px;width:10px}
.knopf.l1{left:-8px;top:12%;height:5%}.knopf.l2{left:-8px;top:20%;height:8%}.knopf.l3{left:-8px;top:30%;height:8%}.knopf.r1{right:-8px;top:24%;height:12%}
.karte{position:absolute;z-index:7;left:${b.karte?.x ?? 120}px;top:${b.karte?.y ?? 1500}px;width:${b.karte?.breite ?? 1080}px;background:rgba(250,250,252,.93);backdrop-filter:blur(30px);border-radius:56px;padding:40px 44px;display:flex;gap:32px;align-items:flex-start;box-shadow:0 30px 80px rgba(10,20,35,.35);color:#111;font-family:-apple-system,"SF Pro Text",DMSans,sans-serif}
.karte img{width:104px;height:104px;border-radius:24px;flex:none}
.karte .k1{display:flex;justify-content:space-between;font-size:38px;font-weight:700}.karte .k1 span{font-weight:500;color:#8a8a8e;font-size:34px}
.karte .k2{margin-top:6px;font-size:40px;line-height:1.25}
.fuss{position:absolute;z-index:8;left:0;right:0;bottom:0;padding:36px 84px 48px;background:${CREME};font-size:34px;line-height:1.36;color:${NACHT};text-align:center;border-top:8px solid ${NACHT}}
</style></head><body>
<div class="raster"></div><div class="band"></div>
<div class="kopf"><div class="marke"><img class="ic" src="data:image/png;base64,${b64(icon)}" alt="">${dunkel ? `<img class="wm" src="data:image/png;base64,${b64(path.join(assets, "wortmarke.png"))}" alt="">` : `<span class="wm-navy"></span>`}</div>
<h1>${b.ueberschrift.map((z) => esc(z).replace(/\[(.+?)\]/g, "<em>$1</em>")).join("<br>")}</h1>
${b.sub ? `<div class="sub">${esc(b.sub)}</div>` : ""}
${b.chips ? `<div class="chips">${b.chips.map((c) => `<span class="chip">${esc(c)}</span>`).join("")}</div>` : ""}</div>
${b.stempel ? `<div class="stempel" style="left:${b.stempel.x}px;top:${b.stempel.y}px;font-size:${b.stempel.groesse || 76}px">${b.stempel.zeilen.map((z, k) => k ? `<b>${esc(z)}</b>` : esc(z)).join("")}${b.stempel.klein ? `<small>${esc(b.stempel.klein)}</small>` : ""}</div>` : ""}
${handys}
${b.karte ? `<div class="karte"><img src="data:image/png;base64,${b64(icon)}" alt=""><div style="flex:1"><div class="k1">${esc(b.karte.titel)}<span>${esc(b.karte.zeit || "jetzt")}</span></div><div class="k2">${esc(b.karte.text)}</div></div></div>` : ""}
${b.fuss ? `<div class="fuss">${esc(b.fuss)}</div>` : ""}
</body></html>`;
};

for (const d of ["69", "65"]) fs.mkdirSync(path.join(ziel, d), { recursive: true });
const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const fertig = [];
for (const [i, b] of bilder.entries()) {
  const dateien = (b.handys || [{ datei: b.datei }]).map((h) => h.datei);
  const fehlt = dateien.filter((d) => !fs.existsSync(path.join(quelle, d)));
  if (fehlt.length) { console.log(`fehlt: ${fehlt.join(", ")}`); continue; }
  await p.setContent(seite(b, i), { waitUntil: "load" });
  await p.evaluate(() => document.fonts.ready);
  const name = `${String(i + 1).padStart(2, "0")}-${b.name}.png`;
  const out = path.join(ziel, "69", name);
  await p.screenshot({ path: out, type: "png" });
  fertig.push(out);
  console.log("✓", out);
}
// 6,5 Zoll: 1284 × 2778 (gleiches Seitenverhältnis bis auf 2 px, oben/unten minimal beschnitten)
const k = await browser.newPage({ viewport: { width: 1284, height: 2778 }, deviceScaleFactor: 1 });
for (const f of fertig) {
  await k.setContent(`<body style="margin:0;overflow:hidden"><img src="data:image/png;base64,${b64(f)}" style="width:1284px;height:2790px;margin-top:-6px;display:block"></body>`);
  await k.screenshot({ path: path.join(ziel, "65", path.basename(f)), type: "png" });
}
// Kontaktbogen (alle Bilder nebeneinander, zeigt auch das Panorama)
const s = await browser.newPage({ viewport: { width: fertig.length * 340 + 40, height: 780 }, deviceScaleFactor: 1 });
await s.setContent(`<body style="margin:0;background:#e9e4da;display:flex;gap:10px;padding:20px">${fertig.map((f) => `<img src="data:image/png;base64,${b64(f)}" style="width:330px;height:717px;border-radius:18px">`).join("")}</body>`);
await s.screenshot({ path: path.join(ziel, "kontaktbogen.png"), type: "png" });
await browser.close();
console.log("✓ kontaktbogen", path.join(ziel, "kontaktbogen.png"));

// Prüfschritt: Jeder QR-Code in den fertigen Bildern wird ausgelesen (Apple Vision, qr-lesen.swift).
// Erlaubt sind nur öffentliche Adressen (Standard: https://tattoofin.de…); localhost/127.0.0.1/private Netze brechen ab.
const { execFileSync } = await import("node:child_process");
const erlaubt = (process.env.QR_ERLAUBT || "https://tattoofin.de").split(",");
const ausgabe = execFileSync("swift", [path.join(hier, "qr-lesen.swift"), ...fertig], { encoding: "utf8", timeout: 240000 });
let fehler = 0, gefunden = 0;
for (const zeile of ausgabe.trim().split("\n").filter(Boolean)) {
  const [datei, inhalt] = zeile.split("\t");
  gefunden++;
  const schlecht = /localhost|127\.0\.0\.1|192\.168\.|10\.\d+\.|\.local\b/i.test(inhalt) || !erlaubt.some((e) => inhalt.startsWith(e));
  console.log(`${schlecht ? "✗" : "✓"} QR ${path.basename(datei)}: ${inhalt}`);
  if (schlecht) fehler++;
}
if (fehler) { console.error(`✗ ${fehler} QR-Code(s) zeigen auf eine nicht erlaubte Adresse – Bilder NICHT verwenden`); process.exit(1); }
console.log(`✓ QR-Prüfung: ${gefunden} QR-Code(s), alle öffentlich`);
