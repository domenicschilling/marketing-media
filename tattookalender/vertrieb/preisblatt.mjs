// Baut Preisblatt-AKTUELL.pdf aus Preisblatt-AKTUELL.html (gleiches Vorgehen wie werbung-2026-11-02/quellen/blatt.mjs).
// Aufruf: node content/tattookalender/vertrieb/preisblatt.mjs – meldet, ob der Inhalt über die A4-Seite läuft.
import { createRequire } from "module";
const require = createRequire("/Users/domi/Marketing-Maschine/");
const { chromium } = require("playwright");
const D = "/Users/domi/Marketing-Maschine/content/tattookalender/vertrieb";
const b = await chromium.launch();
const p = await b.newPage();
await p.goto("file://" + D + "/Preisblatt-AKTUELL.html"); await p.evaluate(() => document.fonts.ready);
const ueber = await p.evaluate(() => { const s = document.querySelector(".page"), band = document.querySelector(".band"), f = document.querySelector("footer"); return { scrollH: s.scrollHeight, clientH: s.clientHeight, bandUnten: band.getBoundingClientRect().bottom, fussOben: f.getBoundingClientRect().top }; });
console.log(ueber);
await p.pdf({ path: D + "/Preisblatt-AKTUELL.pdf", format: "A4", printBackground: true, preferCSSPageSize: true });
await b.close();
