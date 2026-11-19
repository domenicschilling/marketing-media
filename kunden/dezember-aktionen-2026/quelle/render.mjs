import { createRequire } from "module";
const require = createRequire("/Users/domi/Marketing-Maschine/package.json");
const { chromium } = require("playwright");
const d = process.argv[2];
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1080, height: 1350 } })).newPage();
for (const n of ["1-gutschein","2-januar-ticket","3-wunsch-unterm-baum"]) {
  await p.goto(`file://${d}/quelle/${n}.html`); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
  const m = await p.evaluate(() => ({ top: Math.round(document.querySelector(".txt").getBoundingClientRect().top), w: document.documentElement.scrollWidth, h1: document.querySelector("h1").scrollWidth }));
  console.log(n, JSON.stringify(m));
  await p.screenshot({ path: `${d}/${n}.jpg`, type: "jpeg", quality: 92 });
}
await b.close();
