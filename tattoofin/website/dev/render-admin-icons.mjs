// Erzeugt die Icons der Admin-App „TF Admin“ (Homescreen) aus assets/figur.png:  NODE_PATH=… node dev/render-admin-icons.mjs
// Dunkelblau statt Gelb, damit man sie auf dem Handy nicht mit der Studio-App verwechselt.
import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fig = "data:image/png;base64," + fs.readFileSync(path.join(root, "public/assets/figur.png")).toString("base64");
const schrift = "data:font/woff2;base64," + fs.readFileSync(path.join(root, "public/assets/fonts/LuckiestGuy.woff2")).toString("base64");
const ziel = path.join(root, "public/assets/admin");
fs.mkdirSync(ziel, { recursive: true });
const browser = await chromium.launch();
// name, Größe, Rand (Anteil), Ecken (Anteil; 0 = eckig, iOS rundet selbst)
for (const [name, size, pad, rund] of [["apple-touch-icon", 180, 0.1, 0], ["icon-192", 192, 0.1, 0.22], ["icon-512", 512, 0.1, 0.22], ["icon-maskable-512", 512, 0.2, 0]]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<style>@font-face{font-family:LG;src:url(${schrift})}</style><body style="margin:0">
    <div style="width:${size}px;height:${size}px;background:#1f3d5c;border-radius:${rund * size}px;display:flex;flex-direction:column;align-items:center;justify-content:center;box-sizing:border-box;padding:${pad * size}px">
      <img src="${fig}" style="height:${(0.62 - pad) * size}px;width:auto">
      <div style="font:400 ${0.17 * size}px/1 LG;color:#fbb316;letter-spacing:${0.01 * size}px;margin-top:${0.03 * size}px">ADMIN</div></div></body>`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(ziel, name + ".png"), omitBackground: name !== "apple-touch-icon" });
  await page.close();
}
await browser.close();
console.log("Admin-Icons erstellt: " + ziel);
