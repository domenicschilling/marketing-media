// Ganze Seite als ein Bild (nach einmal Durchscrollen), WebKit iPhone 15 Pro und 1440 px
import { createRequire } from 'node:module';
const require = createRequire('/Users/domi/Marketing-Maschine/');
const { webkit, devices } = require('playwright');
const url = process.argv[2] || 'http://127.0.0.1:4823/';
const out = process.argv[3] || '/private/tmp/claude-501/-Users-domi-Marketing-Maschine/8e475490-87f4-495a-8501-49aef46fb97a/scratchpad/full';
const b = await webkit.launch();
for (const [name, opts] of [['m', devices['iPhone 15 Pro']], ['d', { viewport: { width: 1440, height: 900 } }]]) {
  const c = await b.newContext(opts); const p = await c.newPage();
  await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(500);
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += 300) { await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(30); }
  await p.waitForTimeout(1600);
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}-${name}.png`, fullPage: true });
  console.log(name, H);
  await c.close();
}
await b.close();
