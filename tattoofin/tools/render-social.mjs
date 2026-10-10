// Exportiert alle Social-Media-Grafiken (Elemente mit data-frame) als PNG in Originalgröße.
// Aufruf (im Ordner tattoofin/):  node tools/render-social.mjs
import { createRequire } from "module";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = require("/opt/node22/lib/node_modules/playwright")); }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const quellen = ["social/facebook/vorlagen.html"];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1800, height: 1200 }, deviceScaleFactor: 1 });
for (const q of quellen) {
  const out = path.join(root, path.dirname(q), "export");
  fs.mkdirSync(out, { recursive: true });
  await page.goto("file://" + path.join(root, q));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  for (const el of await page.$$("[data-frame]")) {
    const name = await el.getAttribute("data-frame");
    await el.screenshot({ path: path.join(out, name + ".png") });
    console.log("ok:", path.relative(root, path.join(out, name + ".png")));
  }
}
await browser.close();
