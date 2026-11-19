import { createRequire } from "node:module";
const require = createRequire("/Users/domi/Marketing-Maschine/package.json");
const { chromium } = require("playwright");
const D = process.env.HOME + "/Downloads/Tattookalender-Brandingkit/Vorlagen/E-Mail-Signatur";
const b = await chromium.launch(); const p = await b.newPage({ deviceScaleFactor: 2 }); await p.setViewportSize({ width: 640, height: 260 });
await p.goto(`file://${D}/email-signatur.html`); await p.waitForLoadState("networkidle");
await p.screenshot({ path: `${D}/vorschau-signatur.png` }); await b.close();
