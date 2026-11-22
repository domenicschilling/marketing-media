// axe-core (alle Regeln inkl. Kontrast) in verschiedenen Scroll-Zuständen:
// Kopf (nach dem Einlauf), Ablauf Station 1/3/6 (nach dem Tintenwechsel), Preise, Fragen (alle aufgeklappt), Abschluss.
// WebKit iPhone 15 Pro, Chromium 390, WebKit 1440, Chromium 1440. Aufruf: node pruefung/v3-axe.mjs [url]
import { createRequire } from 'node:module';
const require = createRequire('/Users/domi/Marketing-Maschine/');
const { webkit, chromium, devices } = require('playwright');
const axePath = require.resolve('axe-core/axe.min.js');
const url = process.argv[2] || 'http://127.0.0.1:4823/';
const runs = [['webkit-390', webkit, devices['iPhone 15 Pro']], ['chromium-390', chromium, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }], ['webkit-1440', webkit, { viewport: { width: 1440, height: 900 } }], ['chromium-1440', chromium, { viewport: { width: 1440, height: 900 } }]];
let total = 0;
const go = (p, fn, arg) => p.evaluate(fn, arg);
for (const [name, bt, opts] of runs) {
  const b = await bt.launch(); const p = await (await b.newContext(opts)).newPage();
  await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(2200);
  await p.addScriptTag({ path: axePath });
  const zustaende = [
    ['Kopf', () => scrollTo({ top: 0, behavior: 'instant' })],
    ['Station 1', () => 0], ['Station 3', () => 2], ['Station 6', () => 5],
    ['Preise', () => document.querySelector('#preise').scrollIntoView({ behavior: 'instant' })],
    ['Fragen offen', () => { document.querySelectorAll('details').forEach(d => d.open = true); document.querySelector('#fragen').scrollIntoView({ behavior: 'instant' }); }],
    ['Abschluss', () => scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })],
  ];
  for (const [label, fn] of zustaende) {
    if (label.startsWith('Station')) {
      const st = await go(p, fn);
      await go(p, st => {
        const sc = document.querySelector('.story-scroller'), s = document.querySelector('.station').offsetHeight;
        const top = sc.getBoundingClientRect().top + scrollY;
        if (document.querySelector('.story.is-nested')) { scrollTo({ top, behavior: 'instant' }); sc.scrollTo(0, s * st); } else scrollTo({ top: top + s * st, behavior: 'instant' });
      }, st);
    } else await go(p, fn);
    await p.waitForTimeout(1500);
    const r = await p.evaluate(async () => await axe.run(document, { resultTypes: ['violations'] }));
    total += r.violations.length;
    console.log(name.padEnd(14), label.padEnd(13), 'Verstöße:', r.violations.length, r.violations.map(v => `${v.id} (${v.nodes.length}): ${v.nodes.slice(0, 3).map(n => n.target.join(' ') + ' ' + (n.any[0]?.message || '')).join(' | ')}`).join(' ; '));
  }
  await b.close();
}
console.log('SUMME', total);
