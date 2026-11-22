// Ablauf prüfen: zum Ablauf scrollen, dann Station für Station (Handy: im eigenen Scrollbereich, Desktop: Seite), Screenshots mitten in der Welle und danach.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('/Users/domi/Marketing-Maschine/');
const { webkit, devices } = require('playwright');
const url = process.argv[2] || 'http://127.0.0.1:4823/';
const out = process.argv[3] || '/private/tmp/claude-501/-Users-domi-Marketing-Maschine/8e475490-87f4-495a-8501-49aef46fb97a/scratchpad/st';
const only = process.argv[4] || 'md';
fs.mkdirSync(out, { recursive: true });
const b = await webkit.launch();
for (const [name, opts] of [['m', devices['iPhone 15 Pro']], ['d', { viewport: { width: 1440, height: 900 } }]]) {
  if (!only.includes(name)) continue;
  const c = await b.newContext(opts); const p = await c.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  const top = await p.evaluate(() => document.querySelector('.story-scroller').getBoundingClientRect().top + scrollY);
  await p.evaluate(y => scrollTo(0, y), top); await p.waitForTimeout(900);
  await p.screenshot({ path: `${out}/${name}-s0.png` });
  for (let i = 1; i < 6; i++) {
    await p.evaluate(([i, nm]) => {
      const sc = document.querySelector('.story-scroller'), st = document.querySelector('.station').offsetHeight;
      if (nm === 'm') sc.scrollTo(0, st * i); else window.scrollTo(0, sc.getBoundingClientRect().top + scrollY + st * i);
    }, [i, name]);
    // Playwright-WebKit verschiebt nach einem Screenshot die Seite, wenn danach ein innerer Bereich scrollt (nur in der Emulation, siehe README); Seite zurücksetzen
    if (name === 'm') { await p.waitForTimeout(60); await p.evaluate(y => scrollTo(0, y), top); }
    await p.waitForTimeout(360); await p.screenshot({ path: `${out}/${name}-s${i}-welle.png` });
    await p.waitForTimeout(900); await p.screenshot({ path: `${out}/${name}-s${i}.png` });
  }
  console.log(name, errs);
  await c.close();
}
await b.close();
