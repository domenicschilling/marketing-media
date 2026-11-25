// Gestaltete App-Store-Bilder (6,9 Zoll, 1320 × 2868) aus echten App-Aufnahmen.
// Aufruf: node render.mjs <ordner-mit-aufnahmen> <ausgabe-ordner>
// Aufnahmen heißen wie bild.datei in bilder.json (PNG, 1320 × 2868 vom iPhone 17 Pro Max).
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
const fonts = path.resolve(hier, "../../../website/public/assets/fonts");
const wortmarke = path.resolve(hier, "../../../website/public/assets/wortmarke.png");
const b64 = (f) => fs.readFileSync(f).toString("base64");
const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;");

const seite = (b) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:Luckiest;src:url(data:font/woff2;base64,${b64(path.join(fonts, "LuckiestGuy.woff2"))})}
@font-face{font-family:DMSans;src:url(data:font/woff2;base64,${b64(path.join(fonts, "DMSans.woff2"))});font-weight:100 900}
*{margin:0;box-sizing:border-box}
html,body{width:1320px;height:2868px;overflow:hidden}
body{background:#fffaf0;font-family:DMSans,sans-serif;color:#1f3d5c;position:relative}
body:before{content:"";position:absolute;inset:0;opacity:.35;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .55  0 0 0 0 .45  0 0 0 0 .3  0 0 0 .18 0'/></filter><rect width='400' height='400' filter='url(%23n)'/></svg>")}
.kopf{position:absolute;top:150px;left:90px;right:90px;text-align:center}
.marke{height:58px;margin-bottom:64px}
h1{font-family:Luckiest;font-weight:400;font-size:${b.groesse || 132}px;line-height:1.02;letter-spacing:1px;text-transform:uppercase;color:#1f3d5c;text-shadow:6px 6px 0 #ffbd16}
.sub{margin-top:44px;font-size:56px;line-height:1.25;font-weight:600;color:#35587c}
.warn{margin-top:26px;font-size:44px;font-weight:700;color:#1f3d5c}
.handy{position:absolute;left:50%;transform:translateX(-50%);top:${b.handyTop || 880}px;width:1000px;height:2174px;border-radius:150px;background:#13243d;padding:26px;box-shadow:0 40px 90px rgba(19,36,61,.28)}
.handy img{width:948px;height:2122px;border-radius:124px;display:block;object-fit:cover;object-position:top}
.fuss{position:absolute;left:0;right:0;bottom:0;padding:34px 80px 46px;background:#fffaf0;font-size:34px;line-height:1.35;color:#1f3d5c;text-align:center;border-top:4px solid #ffbd16}
.sticker{position:absolute;right:70px;top:${(b.handyTop || 880) - 90}px;background:#ffbd16;color:#13243d;font-family:Luckiest;font-size:58px;padding:26px 40px 18px;border-radius:24px;transform:rotate(4deg);box-shadow:5px 5px 0 #1f3d5c;text-transform:uppercase}
</style></head><body>
<div class="kopf"><img class="marke" src="data:image/png;base64,${b64(wortmarke)}" alt="">
<h1>${b.ueberschrift.map(esc).join("<br>")}</h1>
${b.sub ? `<div class="sub">${esc(b.sub)}</div>` : ""}${b.warn ? `<div class="warn">${esc(b.warn)}</div>` : ""}</div>
${b.sticker ? `<div class="sticker">${esc(b.sticker)}</div>` : ""}
<div class="handy"><img src="data:image/png;base64,${b64(path.join(quelle, b.datei))}" alt=""></div>
${b.fuss ? `<div class="fuss">${esc(b.fuss)}</div>` : ""}
</body></html>`;

fs.mkdirSync(ziel, { recursive: true });
const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1320, height: 2868 }, deviceScaleFactor: 1 });
for (const [i, b] of bilder.entries()) {
  if (!fs.existsSync(path.join(quelle, b.datei))) { console.log(`fehlt: ${b.datei}`); continue; }
  await p.setContent(seite(b), { waitUntil: "load" });
  await p.evaluate(() => document.fonts.ready);
  const out = path.join(ziel, `${String(i + 1).padStart(2, "0")}-${b.name}.png`);
  await p.screenshot({ path: out, type: "png" });
  console.log("✓", out);
}
await browser.close();
