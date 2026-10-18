// Erzeugt die App-Icons (PWA) aus assets/figur.png:  NODE_PATH=… node dev/render-icons.mjs
import path from "node:path";
import fs from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fig = "data:image/png;base64," + fs.readFileSync(path.join(root, "public/assets/figur.png")).toString("base64");
const browser = await chromium.launch();
for (const [name, size, pad, rund] of [["icon-512", 512, 0.12, 0.22], ["icon-192", 192, 0.12, 0.22], ["icon-maskable-512", 512, 0.24, 0]]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(`<body style="margin:0"><div style="width:${size}px;height:${size}px;background:#fbb316;border-radius:${rund * size}px;display:grid;place-items:center;
    background-image:radial-gradient(rgba(31,61,92,.13) ${size / 200}px,transparent ${size / 160}px);background-size:${size / 18}px ${size / 18}px">
    <img src="${fig}" style="width:${(1 - 2 * pad) * size}px;height:auto"></div></body>`);
  await page.screenshot({ path: path.join(root, "public/assets/app", name + ".png"), omitBackground: true });
  await page.close();
}
await browser.close();
console.log("Icons erstellt");
