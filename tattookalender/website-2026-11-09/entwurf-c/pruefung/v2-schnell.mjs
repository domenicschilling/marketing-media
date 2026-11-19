// Schnellblick während des Baus: Kopfbereich zu drei Zeitpunkten, WebKit iPhone 15 Pro und 1440 px.
// Aufruf: node pruefung/v2-schnell.mjs [url] [ausgabe-ordner]
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('/Users/domi/Marketing-Maschine/');
const { webkit, devices } = require('playwright');
const url = process.argv[2] || 'http://127.0.0.1:4823/';
const out = process.argv[3] || '/private/tmp/claude-501/-Users-domi-Marketing-Maschine/8e475490-87f4-495a-8501-49aef46fb97a/scratchpad/s';
fs.mkdirSync(out, { recursive: true });
const b = await webkit.launch();
for (const [name, opts] of [['m', devices['iPhone 15 Pro']], ['d', { viewport: { width: 1440, height: 900 } }]]) {
  const c = await b.newContext(opts); const p = await c.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  const t0 = Date.now();
  await p.goto(url, { waitUntil: 'commit' });
  for (const ms of [450, 1100, 2300]) { const w = ms - (Date.now() - t0); if (w > 0) await p.waitForTimeout(w); await p.screenshot({ path: `${out}/${name}-t${ms}.png` }); }
  const info = await p.evaluate(() => ({ live: document.querySelector('.hero').className, H: document.documentElement.scrollHeight, W: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, story: document.querySelector('.story').className }));
  console.log(name, JSON.stringify(info), errs);
  await c.close();
}
await b.close();
