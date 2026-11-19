// Kontaktbogen: node kontaktbogen.mjs <ausgabe.jpg> <spalten> <breite-je-bild> <bild1> <bild2> ...   (Bilder in Reihenfolge, optional "label::pfad")
import { createRequire } from "node:module";
import path from "node:path";
const require = createRequire("/Users/domi/Marketing-Maschine/package.json");
const { chromium } = require("playwright");
const [out, spalten, breite, ...bilder] = process.argv.slice(2);
const b = +breite, c = +spalten;
const items = bilder.map((x) => { const [l, p] = x.includes("::") ? x.split("::") : ["", x]; return { l, p: path.resolve(p) }; });
const html = `<body style="margin:0;background:#d9d9d4;font:600 14px sans-serif"><div style="display:grid;grid-template-columns:repeat(${c},${b}px);gap:8px;padding:8px">${items.map((i) => `<div>${i.l ? `<div style="padding:0 0 3px">${i.l}</div>` : ""}<img src="file://${i.p}" style="width:${b}px;display:block"></div>`).join("")}</div></body>`;
const br = await chromium.launch(); const pg = await br.newPage({ viewport: { width: c * (b + 8) + 8, height: 800 } });
const fs = await import("node:fs"); const tmp = path.join(path.dirname(path.resolve(out)), ".kb-" + process.pid + ".html"); fs.writeFileSync(tmp, html); await pg.goto("file://" + tmp); await pg.evaluate(() => Promise.all([...document.images].map((i) => i.decode())));
await pg.screenshot({ path: out, fullPage: true, type: "jpeg", quality: 88 }); await br.close(); fs.rmSync(tmp);
