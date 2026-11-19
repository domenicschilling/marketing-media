// Rendert die Mockups als iPhone-17-Pro-PNGs (1179×2556) + Übersicht.
// Aufruf aus dem Repo-Stamm: node content/tattooleadz/inhaber-app-2026-11/src/render.mjs [01-heute ...]
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SRC = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(SRC, '..');
const alle = ['01-heute', '02-anfrage', '03-monat'];
const nur = process.argv.slice(2);
const screens = nur.length ? nur.filter(n => n !== 'uebersicht') : alle;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 3 });
const page = await ctx.newPage();
for (const name of screens) {
  await page.goto(pathToFileURL(path.join(SRC, `${name}.html`)).href);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  const ziel = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: ziel });
  console.log('✓', ziel);
}
if (!nur.length || nur.includes('uebersicht')) {
  const ue = await browser.newContext({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 2 });
  const p2 = await ue.newPage();
  await p2.goto(pathToFileURL(path.join(SRC, 'uebersicht.html')).href);
  await p2.evaluate(() => document.fonts.ready);
  await p2.waitForTimeout(300);
  const ziel = path.join(OUT, 'uebersicht.png');
  await p2.screenshot({ path: ziel, fullPage: true });
  console.log('✓', ziel);
}
await browser.close();
