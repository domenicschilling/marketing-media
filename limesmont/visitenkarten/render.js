// Erzeugt Druck-PDF (89×59 mm, 2 Seiten) und PNG-Vorschauen aus visitenkarte.html
// Aufruf: node render.js   (benötigt Playwright + Chromium)
const path = require('path');
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node-tools/node_modules/playwright'); }
(async () => {
  const b = await pw.chromium.launch();
  const url = 'file://' + path.join(__dirname, 'visitenkarte.html');
  const p = await b.newPage();
  await p.goto(url); await p.evaluate(() => document.fonts.ready);
  await p.pdf({ path: path.join(__dirname, 'LimesMont_Visitenkarte_85x55_Druck.pdf'), width: '89mm', height: '59mm', printBackground: true, preferCSSPageSize: true });
  // Vorschau: beschnitten auf Endformat 85×55 mm, 4× Auflösung
  const v = await b.newPage({ deviceScaleFactor: 4 });
  await v.emulateMedia({ media: 'print' });
  await v.goto(url); await v.evaluate(() => document.fonts.ready);
  const mm = 96 / 25.4;
  const cards = await v.$$('.card');
  for (const [i, c] of cards.entries()) {
    const bb = await c.boundingBox();
    await v.screenshot({ path: path.join(__dirname, `vorschau-${i ? 'rueckseite' : 'vorderseite'}.png`),
      clip: { x: bb.x + 2 * mm, y: bb.y + 2 * mm, width: 85 * mm, height: 55 * mm } });
  }
  await b.close();
})();
