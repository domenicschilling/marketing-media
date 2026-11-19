import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
const require = createRequire("/Users/domi/Marketing-Maschine/package.json");
const { chromium } = require("playwright");
const F = process.env.HOME + "/Downloads/Tattookalender-Brandingkit/Farben-Schriften/Schriften";
import { FONT_CSS as css } from "./fontcss.mjs";
const lockup = `<div id="l" style="display:flex;align-items:center;gap:26px;padding:20px 24px;width:max-content">
  <svg id="m" width="120" height="120" viewBox="0 0 120 120"></svg>
  <div><div id="w" style="font-family:'Bricolage Grotesque';font-weight:800;font-size:76px;letter-spacing:-0.035em;line-height:1;color:#f4f1ea">tattoo<span id="k">kalender</span></div>
  <div id="s" style="font-family:Inter;font-weight:600;font-size:15px;letter-spacing:.32em;text-transform:uppercase;color:#a7a39a;margin-top:12px">Das Studio-System</div></div></div>`;
const b = await chromium.launch(); const p = await b.newPage();
await p.setViewportSize({ width: 760, height: 160 });
await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>${css}html,body{margin:0}</style></head><body>${lockup}</body></html>`);
await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
const r = await p.evaluate(() => {
  const chars = (el) => { const out = []; const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; while ((n = walker.nextNode())) { for (let i = 0; i < n.data.length; i++) { const rg = document.createRange(); rg.setStart(n, i); rg.setEnd(n, i + 1); const rc = rg.getBoundingClientRect(); out.push({ c: n.data[i], x: rc.left, w: rc.width, top: rc.top, bottom: rc.bottom }); } } return out; };
  const base = (el) => { const s = document.createElement("span"); s.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline"; el.appendChild(s); const y = s.getBoundingClientRect().top; s.remove(); return y; };
  const R = (id) => { const x = document.getElementById(id).getBoundingClientRect(); return { x: x.left, y: x.top, w: x.width, h: x.height }; };
  return { mark: R("m"), word: R("w"), k: R("k"), sub: R("s"), wordChars: chars(document.getElementById("w")), subChars: chars(document.getElementById("s")), wordBase: base(document.getElementById("w")), subBase: base(document.getElementById("s")) };
});
writeFileSync("measure.json", JSON.stringify(r, null, 1));
await p.screenshot({ path: "ref-lockup.png", omitBackground: true });
await b.close();
console.log(JSON.stringify({ mark: r.mark, word: r.word, k: r.k, sub: r.sub, wb: r.wordBase, sb: r.subBase }));
