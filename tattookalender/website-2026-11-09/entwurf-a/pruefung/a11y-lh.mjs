// axe (Kontrast u. a.) in Chromium bei 390 und 1440 px; axe-core aus node_modules
import { createRequire } from "module";
const require = createRequire("/Users/domi/Marketing-Maschine/");
const { chromium } = require("playwright");
const axePath = require.resolve("axe-core/axe.min.js");
const URL_ = process.argv[2] || "http://127.0.0.1:8417/";
const b = await chromium.launch();
for (const [w, h] of [[390, 844], [1440, 900]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(URL_, { waitUntil: "load" }); await p.waitForTimeout(1500);
  // ganz durchscrollen, damit alle Zustände einmal gesetzt sind, dann oben prüfen
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += 600) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(40); }
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(800);
  await p.addScriptTag({ path: axePath });
  const r = await p.evaluate(async () => await axe.run(document, { resultTypes: ["violations"] }));
  console.log(w, "Verstöße:", r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`));
  await p.close();
}
await b.close();
