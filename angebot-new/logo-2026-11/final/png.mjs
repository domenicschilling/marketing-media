// PNG, ICO und Open-Graph-Bild aus den SVG dieses Ordners. Aufruf: node png.mjs <Pfad zu apps/angebot-new>
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const app = path.resolve(process.argv[2] ?? "/Users/domi/mm-angebot-v5-seite/apps/angebot-new");
const sharp = createRequire(path.join(app, "package.json"))("sharp");
const hier = path.dirname(new URL(import.meta.url).pathname);

const svgNachPng = async (datei, px, basis) =>
  sharp(path.join(hier, datei), { density: (72 * px) / basis }).resize(px, px).png({ compressionLevel: 9, palette: true, quality: 100, colours: 128 }).toBuffer();

const ziele = [
  ["app-symbol-16.svg", 16, 16, "app-symbol-16.png"],
  ["app-symbol-32.svg", 32, 32, "app-symbol-32.png"],
  ["app-symbol-voll.svg", 180, 512, "app-symbol-180.png"],
  ["app-symbol.svg", 192, 512, "app-symbol-192.png"],
  ["app-symbol.svg", 512, 512, "app-symbol-512.png"],
  ["app-symbol-maskierbar.svg", 512, 512, "app-symbol-maskierbar-512.png"],
];
const fertig = {};
for (const [q, px, basis, z] of ziele) {
  fertig[z] = await svgNachPng(q, px, basis);
  fs.writeFileSync(path.join(hier, z), fertig[z]);
}

// ICO mit eingebetteten PNG (16 und 32)
const bilder = [[16, fertig["app-symbol-16.png"]], [32, fertig["app-symbol-32.png"]]];
const kopf = Buffer.alloc(6 + 16 * bilder.length);
kopf.writeUInt16LE(1, 2);
kopf.writeUInt16LE(bilder.length, 4);
let lage = kopf.length;
bilder.forEach(([g, b], i) => {
  const o = 6 + 16 * i;
  kopf[o] = g;
  kopf[o + 1] = g;
  kopf.writeUInt16LE(1, o + 4);
  kopf.writeUInt16LE(32, o + 6);
  kopf.writeUInt32LE(b.length, o + 8);
  kopf.writeUInt32LE(lage, o + 12);
  lage += b.length;
});
const ico = Buffer.concat([kopf, ...bilder.map(([, b]) => b)]);
fs.writeFileSync(path.join(hier, "favicon.ico"), ico);

const og = await sharp(path.join(hier, "og-bild.svg")).resize(1200, 630).png({ compressionLevel: 9, palette: true, quality: 100, colours: 64 }).toBuffer();
fs.writeFileSync(path.join(hier, "og-bild.png"), og);

// Was das Programm braucht
const k = (von, nach) => fs.copyFileSync(path.join(hier, von), path.join(app, nach));
k("favicon.ico", "src/app/favicon.ico");
k("app-symbol-16.svg", "src/app/icon.svg"); // Tab im Browser: die Fassung fürs Pixelraster, bei 32 px genau das Doppelte
k("app-symbol-180.png", "src/app/apple-icon.png");
k("app-symbol-192.png", "public/icon-192.png");
k("app-symbol-512.png", "public/icon-512.png");
k("app-symbol-maskierbar-512.png", "public/icon-maskierbar-512.png");
k("og-bild.png", "public/og-angebot-new.png");
for (const [n, b] of Object.entries(fertig)) console.log(n, b.length);
console.log("favicon.ico", ico.length, "og", og.length);
