// axe-core (alle Regeln inkl. Kontrast): WebKit iPhone 15 Pro und Chromium/WebKit 1440 px; einmal durchscrollen, Ablauf auf Station 1, 4 und 6 prüfen.
import { createRequire } from 'node:module';
const require = createRequire('/Users/domi/Marketing-Maschine/');
const { webkit, chromium, devices } = require('playwright');
const axePath = require.resolve('axe-core/axe.min.js');
const url = process.argv[2] || 'http://127.0.0.1:4823/';
const runs = [['webkit-390', webkit, devices['iPhone 15 Pro']], ['chromium-390', chromium, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }], ['webkit-1440', webkit, { viewport: { width: 1440, height: 900 } }], ['chromium-1440', chromium, { viewport: { width: 1440, height: 900 } }]];
let total = 0;
for (const [name, bt, opts] of runs) {
  const b = await bt.launch(); const p = await (await b.newContext(opts)).newPage();
  await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += 500) { await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(40); }
  await p.addScriptTag({ path: axePath });
  for (const st of [0, 3, 5]) {
    await p.evaluate(st => {
      const sc = document.querySelector('.story-scroller'), s = document.querySelector('.station').offsetHeight;
      const top = sc.getBoundingClientRect().top + scrollY;
      if (document.querySelector('.story.is-nested')) { scrollTo(0, top); sc.scrollTo(0, s * st); } else scrollTo(0, top + s * st);
    }, st);
    await p.waitForTimeout(1500);
    const r = await p.evaluate(async () => await axe.run(document, { resultTypes: ['violations'] }));
    total += r.violations.length;
    console.log(name, 'Station', st + 1, 'Verstöße:', r.violations.length, r.violations.map(v => `${v.id} (${v.nodes.length}): ${v.nodes.slice(0, 3).map(n => n.target.join(' ') + ' ' + (n.any[0]?.message || '')).join(' | ')}`));
  }
  await b.close();
}
console.log('SUMME', total);
