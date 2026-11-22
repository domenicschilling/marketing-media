import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire("/Users/domi/Marketing-Maschine/package.json");
const { chromium } = require("playwright");
const K = process.env.HOME + "/Downloads/Tattookalender-Brandingkit";
const sym = readFileSync(K + "/Logo/SVG/tattookalender-symbol-farbig.svg", "utf8").replace(/ width="[^"]+" height="[^"]+"/, ' width="600" height="608.6"');
const b = await chromium.launch(); const p = await b.newPage(); await p.setViewportSize({ width: 1080, height: 1080 });
await p.setContent(`<html><body style="margin:0;width:1080px;height:1080px;background:#0b0b0d;display:grid;place-items:center">${sym}</body></html>`);
await p.screenshot({ path: K + "/App-Symbol/profilbild-social-1080.png" }); await b.close();
