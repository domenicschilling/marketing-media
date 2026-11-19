// Store-Bilder 6,9 Zoll (1320 × 2868): Überschrift + Gerät mit echtem App-Bildschirm. Ausgabe PNG ohne Alpha.
// Aufruf: node render.mjs <ausgabeordner>  (Bilder aus ../keep/*.png)
import { chromium } from "/Users/domi/Marketing-Maschine/node_modules/playwright/index.mjs";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const sharp = createRequire("/Users/domi/mm-tk-app/apps/tf-studio/package.json")("sharp");
const hier = dirname(fileURLToPath(import.meta.url));
const keep = join(hier, "roh");
const aus = process.argv[2] ?? join(hier, "out");
mkdirSync(aus, { recursive: true });
const font = readFileSync(join(hier, "archivo.woff2")).toString("base64");

const BILDER = [
  { datei: "01-kalender.png", bild: "kalender.png", oben: "Alle", gold: "Termine", unten: "deines Studios", sub: "Jeder Artist, jeder Platz. Tag, Woche und Monat." },
  { datei: "02-einwilligung.png", bild: "einwilligung.png", oben: "Einwilligung", gold: "digital", unten: "unterschreiben", sub: "Direkt am Handy oder Tablet im Studio." },
  { datei: "03-anfragen-tattoochat.png", bild: "chat.png", oben: "Anfragen vorqualifiziert", gold: "", unten: "", sub: 'Über WhatsApp mit deiner Nummer.<br>Im Paket <span style="white-space:nowrap">Kalender + Tattoochat</span>.', zeile1: "Anfragen vorqualifiziert", zeile2: 'im <span class="gold">Tattoochat</span>' },
  { datei: "04-anzahlung.png", bild: "termin-anzahlung.png", oben: "Anzahlung", gold: "per Link", unten: "", sub: "Direkt aus dem Termin, auf dein eigenes Stripe-Konto." },
  { datei: "05-gratis-testen.png", bild: "paywall-monat.png", oben: "", gold: "7 Tage gratis", unten: "testen", sub: "Danach monatlich oder im Voraus zahlen." },
];

const W = 1320, H = 2868;
// Gerät: Bildschirm im Seitenverhältnis des Fotos (1320 × 2868), Rahmen dunkel wie das App-Icon
const DEV_TOP = 660, RAND = 22;
const DEV_H = H - DEV_TOP - 90, SCREEN_H = DEV_H - 2 * RAND;
const SCREEN_W = Math.round(SCREEN_H * 1320 / 2868), DEV_W = SCREEN_W + 2 * RAND;

function html(b, png) {
  const zeilen = [b.oben, `<span class="gold">${b.gold}</span>`, b.unten].filter(Boolean);
  // „oben“ und „gold“ in eine Zeile, wenn kurz genug
  let z1, z2;
  if (b.zeile1) { z1 = b.zeile1; z2 = b.zeile2; }
  else if (b.oben && b.unten) { z1 = `${b.oben} <span class="gold">${b.gold}</span>`; z2 = b.unten; }
  else if (b.oben) { z1 = b.oben; z2 = `<span class="gold">${b.gold}</span>`; }
  else { z1 = `<span class="gold">${b.gold}</span>`; z2 = b.unten; }
  const kopf = `<span class="z">${z1}</span><span class="z">${z2}</span>`;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:A;src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:100 900;font-stretch:62% 125%}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${W}px;height:${H}px;overflow:hidden}
body{background:#f6f3ed;font-family:A,sans-serif;color:#0b0b0b;position:relative}
.glow{position:absolute;left:50%;top:${DEV_TOP + 260}px;width:1500px;height:1500px;transform:translateX(-50%);
  background:radial-gradient(closest-side,rgba(200,163,90,.30),rgba(200,163,90,.10) 55%,rgba(246,243,237,0) 100%)}
.verlauf{position:absolute;inset:0;background:linear-gradient(180deg,#fbf9f5 0%,#f6f3ed 40%,#efe7d9 100%)}
.kopf{position:absolute;left:0;right:0;top:140px;text-align:center;padding:0 80px}
.marke{display:inline-flex;align-items:center;gap:22px;font-weight:700;font-size:30px;letter-spacing:.32em;color:#7d5f22;text-transform:uppercase;margin-bottom:46px}
.marke i{display:block;width:56px;height:3px;background:#c8a35a;border-radius:2px}
h1{font-weight:800;font-stretch:78%;font-size:128px;line-height:1.02;letter-spacing:-.005em}\nh1 .z{display:block;white-space:nowrap}
.gold{color:#7d5f22;position:relative;white-space:nowrap;isolation:isolate;display:inline-block}
.gold::after{content:"";position:absolute;left:-2%;right:-2%;bottom:-.06em;height:.16em;border-radius:.1em;
  background:linear-gradient(90deg,rgba(200,163,90,.0),rgba(200,163,90,.85) 12%,rgba(200,163,90,.85) 88%,rgba(200,163,90,0));z-index:-1}
p.sub{margin-top:40px;font-size:42px;line-height:1.3;color:#4b453c;font-weight:450}
.geraet{position:absolute;left:${(W - DEV_W) / 2}px;top:${DEV_TOP}px;width:${DEV_W}px;height:${DEV_H}px;border-radius:132px;
  background:#0c0c0d;box-shadow:0 60px 120px -30px rgba(60,42,10,.45),0 20px 40px -10px rgba(0,0,0,.25),inset 0 0 0 3px #2a2a2c}
.geraet img{position:absolute;left:${RAND}px;top:${RAND}px;width:${SCREEN_W}px;height:${SCREEN_H}px;border-radius:112px;display:block}
</style></head><body>
<div class="verlauf"></div><div class="glow"></div>
<div class="kopf"><div class="marke"><i></i>Tattookalender<i></i></div><h1>${kopf}</h1><p class="sub">${b.sub}</p></div>
<div class="geraet"><img src="data:image/png;base64,${png}"></div>
</body></html>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const nur = process.argv[3];
for (const b of BILDER) {
  if (nur && !b.datei.startsWith(nur)) continue;
  let png;
  try { png = readFileSync(join(keep, b.bild)).toString("base64"); } catch { console.log("fehlt", b.bild); continue; }
  await page.setContent(html(b, png), { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  // Überschrift einpassen: jede Zeile höchstens 1160 px breit
  await page.evaluate(() => {
    const h = document.querySelector("h1");
    let fs = 128;
    const breit = () => Math.max(...[...h.querySelectorAll(".z")].map((z) => z.scrollWidth));
    while (breit() > 1160 && fs > 80) { fs -= 2; h.style.fontSize = fs + "px"; }
  });
  const unterkante = await page.evaluate(() => document.querySelector(".sub").getBoundingClientRect().bottom);
  if (unterkante > DEV_TOP - 40) console.log("WARNUNG Kopf zu hoch", b.datei, unterkante);
  const roh = await page.screenshot({ type: "png" });
  const ziel = join(aus, b.datei);
  await sharp(roh).flatten({ background: "#f6f3ed" }).removeAlpha().png({ compressionLevel: 9 }).toFile(ziel);
  console.log("ok", ziel);
}
await browser.close();
