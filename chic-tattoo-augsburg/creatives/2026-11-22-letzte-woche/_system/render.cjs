// Rendert index-feed.html / index-story.html je Motiv zu feed.png/.jpg und story.png/.jpg
// Aufruf: node _system/render.cjs [01-november 02-narbe ...]   (ohne Argumente: alle)
// Option --safe: zusätzlich _safe-*.png mit eingeblendeten Story-Safe-Zones (nur zur Kontrolle)
const path = require('path');
const fs = require('fs');
const { chromium } = require('/Users/domi/Marketing-Maschine/node_modules/playwright');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const safe = process.argv.includes('--safe');
const dirs = (args.length ? args : fs.readdirSync(ROOT).filter((d) => /^0\d-/.test(d))).sort();

(async () => {
  const browser = await chromium.launch();
  for (const d of dirs) {
    for (const [kind, h] of [['feed', 1350], ['story', 1920]]) {
      const file = path.join(ROOT, d, `index-${kind}.html`);
      if (!fs.existsSync(file)) continue;
      const ctx = await browser.newContext({ viewport: { width: 1080, height: h }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      const url = 'file://' + file + (safe ? '?safe' : '');
      await page.goto(url);
      await page.waitForFunction(() => document.documentElement.dataset.ready === '1', null, { timeout: 15000 });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(150);
      const clip = { x: 0, y: 0, width: 1080, height: h };
      if (safe) {
        await page.screenshot({ path: path.join(ROOT, d, `_safe-${kind}.png`), clip });
      } else {
        await page.screenshot({ path: path.join(ROOT, d, `${kind}.png`), clip, type: 'png' });
        await page.screenshot({ path: path.join(ROOT, d, `${kind}.jpg`), clip, type: 'jpeg', quality: 92 });
      }
      const scales = await page.$$eval('.ph', (els) => els.map((e) => e.dataset.scale));
      console.log(d, kind, 'Skalierung:', scales.join(', '));
      await ctx.close();
    }
  }
  await browser.close();
})();
