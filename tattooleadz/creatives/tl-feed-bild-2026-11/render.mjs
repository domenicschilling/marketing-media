import { createRequire } from "module";
const require = createRequire("/Users/domi/Marketing-Maschine/package.json");
const { chromium } = require("playwright");
const d = process.argv[2];
const b = await chromium.launch();
for (const [n, w, h, q] of [["feed", 1080, 1080], ["story", 1080, 1920]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h } })).newPage();
  await p.goto(`file://${d}/${n}.html`); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  const m = await p.evaluate(() => { const r = s => Math.round(document.querySelector(s).getBoundingClientRect().bottom); return { sh: document.documentElement.scrollHeight, top: Math.round(document.querySelector(".eye").getBoundingClientRect().top), proof: r(".proof"), ctaTop: Math.round(document.querySelector(".cta").getBoundingClientRect().top), fn: r(".fn"), h1w: Math.round(document.querySelector("h1").scrollWidth) }; });
  console.log(n, JSON.stringify(m));
  await p.screenshot({ path: `${d}/${n}.jpg`, type: "jpeg", quality: 92 });
}
await b.close();
