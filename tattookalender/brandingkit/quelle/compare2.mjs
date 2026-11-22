import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire("/Users/domi/Marketing-Maschine/package.json");
const { chromium } = require("playwright");
const sharp = createRequire("/Users/domi/Marketing-Maschine/apps/tf-studio/package.json")("sharp");
const svg = readFileSync(process.env.HOME + "/Downloads/Tattookalender-Brandingkit/Logo/SVG/tattookalender-logo-quer-dunkel.svg", "utf8");
const vb = svg.match(/viewBox="([^"]+)"/)[1].split(" ").map(Number);
const b = await chromium.launch(); const p = await b.newPage();
await p.setViewportSize({ width: 760, height: 160 });
await p.setContent(`<html><body style="margin:0;background:transparent"><div style="position:absolute;left:${vb[0]}px;top:${vb[1]}px">${svg}</div></body></html>`);
await p.screenshot({ path: "cmp2-mine.png", omitBackground: true }); await b.close();
const prod = "/Users/domi/Marketing-Maschine/apps/tf-studio/brand-overrides/tattookalender/public/brand/tattookalender-logo.png";
const flat = (f) => sharp(f).flatten({ background: "#0b0b0d" }).raw().toBuffer({ resolveWithObject: true });
const A = await flat(prod), B = await flat("cmp2-mine.png");
let sum = 0, big = 0; for (let i = 0; i < A.data.length; i++) { const v = Math.abs(A.data[i] - B.data[i]); sum += v; if (v > 60) big++; }
console.log(A.info.width, A.info.height, "mean", (sum / A.data.length).toFixed(3), "over60", big);
await sharp({ create: { width: 760, height: 330, channels: 4, background: "#0b0b0d" } }).composite([{ input: prod, top: 0, left: 0 }, { input: "cmp2-mine.png", top: 170, left: 0 }]).png().toFile("cmp2-both.png");
