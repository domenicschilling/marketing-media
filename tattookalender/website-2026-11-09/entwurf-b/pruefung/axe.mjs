// axe-Prüfung (alle Regeln, Fokus Kontrast) in WebKit und Chromium, mit und ohne Geschichte.
import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);
const { webkit, chromium, devices } = require('playwright');
const axePfad = require.resolve('axe-core/axe.min.js');
const url = process.argv[2] || 'http://127.0.0.1:4817/';
const faelle = [
  ['webkit iphone story', webkit, devices['iPhone 15 Pro']],
  ['webkit iphone reduziert', webkit, { ...devices['iPhone 15 Pro'], reducedMotion: 'reduce' }],
  ['chromium desktop story', chromium, { viewport: { width: 1440, height: 900 } }],
  ['chromium desktop reduziert', chromium, { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }],
];
for (const [name, bt, opts] of faelle) {
  const b = await bt.launch(); const p = await (await b.newContext(opts)).newPage();
  await p.goto(url, { waitUntil: 'networkidle' });
  // einmal ganz durchscrollen, damit alles im Endzustand ist, dann nach oben
  await p.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } });
  await p.waitForTimeout(800);
  await p.addScriptTag({ path: axePfad });
  const r = await p.evaluate(async () => { const r = await axe.run(document, { resultTypes: ['violations'] }); return r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, bsp: v.nodes.slice(0, 3).map(n => n.target.join(' ') + ' | ' + (n.any[0]?.message || '')) })); });
  console.log(name, JSON.stringify(r, null, 1));
  await b.close();
}
