// Cover für das Erklär-Reel: Titelbild ohne Untertitel (Instagram-Raster: Inhalt bleibt in der Mitte 3:4).
import { createRequire } from "node:module";
const require = createRequire("/Users/domi/Marketing-Maschine/package.json");
const { chromium } = require("playwright");
const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: 1080, height: 1920 } });
await pg.goto("file:///Users/domi/Marketing-Maschine/spots/pruefklar-barrierefrei/spot.html"); await pg.evaluate(() => document.fonts.ready);
await pg.evaluate(() => window.load()); await pg.evaluate(() => window.seek(2.9 * 1000));
await pg.addStyleTag({ content: ".cap{display:none!important}" });
await pg.screenshot({ path: process.argv[2], type: "jpeg", quality: 92 }); await br.close();
