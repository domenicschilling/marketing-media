import { createRequire } from 'node:module';
const require = createRequire('/Users/domi/Marketing-Maschine/node_modules/');
const { chromium, webkit } = require('playwright');
const axe = require.resolve('axe-core/axe.min.js');
for (const [bt, w, h] of [[chromium, 390, 844], [webkit, 390, 844], [chromium, 1440, 900]]) {
  const b = await bt.launch(); const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  await p.goto(process.argv[2], { waitUntil: 'load' }); await p.addScriptTag({ path: axe });
  const out = [];
  for (const y of [0, 600, 1000, 3000, 6000, 99999]) {
    await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(1200);
    const v = await p.evaluate(async () => (await axe.run(document, { resultTypes: ['violations'] })).violations.map(v => v.id + ':' + v.nodes.length + ' ' + v.nodes.slice(0,2).map(n=>n.target.join(' ')).join(',')));
    out.push(y + '=' + JSON.stringify(v));
  }
  console.log(bt.name(), w, out.join(' | '));
  await b.close();
}
