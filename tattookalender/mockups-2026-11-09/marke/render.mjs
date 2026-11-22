// Rendert HTML-Entwürfe zu PNG. Aufruf: node render.mjs <ordner> [datei.html=ziel.png ...]
import { createRequire } from "module";
const require = createRequire("/Users/domi/Marketing-Maschine/");
const { chromium } = require("playwright");
const dir = process.argv[2];
const jobs = process.argv.slice(3).map(a => a.split("="));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
for (const [html, png] of jobs) {
  await p.goto("file://" + dir + "/" + html, { waitUntil: "load" });
  await p.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))); });
  const el = p.locator("#b"); const bb = await el.boundingBox();
  await p.setViewportSize({ width: Math.ceil(bb.width), height: Math.ceil(bb.height) });
  await p.waitForTimeout(150);
  // Prüfung: abgeschnittene Texte (Element breiter/höher als sichtbar) und Bilder, die nicht laden
  const warn = await p.evaluate(() => { const o = []; for (const e of document.querySelectorAll('#b *')) { const cs = getComputedStyle(e); if (e.children.length === 0 && e.textContent.trim() && (e.scrollWidth > e.clientWidth + 1 && cs.overflow !== 'visible')) o.push('Text abgeschnitten: ' + e.textContent.trim().slice(0, 40)); } for (const i of document.images) if (!i.naturalWidth) o.push('Bild fehlt: ' + i.src); const r = document.querySelector('#b').getBoundingClientRect(); for (const e of document.querySelectorAll('#b h1,#b h2,#b p,#b .t')) { const q = e.getBoundingClientRect(); if (q.right > r.right + 1 || q.bottom > r.bottom + 1 || q.left < r.left - 1) o.push('ragt raus: ' + e.textContent.trim().slice(0, 40)); } return o; });
  warn.forEach(w => console.log("  WARNUNG", html, w));
  await el.screenshot({ path: dir + "/" + png });
  console.log("ok", png, Math.round(bb.width) + "x" + Math.round(bb.height));
}
await b.close();
