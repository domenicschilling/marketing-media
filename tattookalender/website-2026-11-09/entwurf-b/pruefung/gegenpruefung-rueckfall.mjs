import { createRequire } from 'node:module';
const require = createRequire('/Users/domi/Marketing-Maschine/node_modules/');
const { webkit, devices } = require('playwright');
for (const block of ['main.js', 'gsap.min.js']) {
  const b = await webkit.launch(); const ctx = await b.newContext(devices['iPhone 15 Pro']);
  await ctx.route('**/' + block, (r) => r.abort());
  const p = await ctx.newPage();
  await p.goto(process.argv[2], { waitUntil: 'load' });
  await p.waitForTimeout(4500);
  const r = await p.evaluate(() => ({ story: document.documentElement.classList.contains('story'),
    versteckt: [...document.querySelectorAll('.detail, .szene-fazit, .karte')].filter(e => getComputedStyle(e).visibility === 'hidden' || +getComputedStyle(e).opacity < 1).length }));
  console.log('ohne', block, JSON.stringify(r));
  await p.screenshot({ path: `${process.argv[3]}/ohne-${block}.png` });
  await b.close();
}
