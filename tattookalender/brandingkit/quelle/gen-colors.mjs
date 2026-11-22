import { writeFileSync } from "node:fs";
import { COLORS, rgb, cmyk } from "./colors.mjs";
const D = process.env.HOME + "/Downloads/Tattookalender-Brandingkit/Farben-Schriften";
let txt = `TATTOOKALENDER – FARBEN (Stand 20.10.2026)\n\nCMYK-Werte sind ungefähre Umrechnungen. Vor einem großen Druckauftrag einen Probedruck machen\nund die Druckerei bitten, das Gold an diese Werte anzupassen.\nGroße schwarze Flächen im Druck (z. B. Visitenkarte, Flyer) als Tiefschwarz anlegen: C 60 / M 40 / Y 40 / K 100.\n\n`;
for (const g of ["Grund", "Text", "Gold"]) {
  txt += { Grund: "GRUNDFARBEN (dunkle Welt)", Text: "TEXTFARBEN", Gold: "GOLD" }[g] + "\n";
  for (const [n, h, r, gg] of COLORS.filter((c) => c[3] === g)) txt += `  ${n.padEnd(14)} HEX ${h}   RGB ${rgb(h).join(", ").padEnd(13)}   CMYK ${cmyk(h).join(" / ").padEnd(16)}  ${r}\n`;
  txt += "\n";
}
txt += `GOLD-VERLAUF\n  Auf Dunkel: Champagner #F3D891 (oben) -> Gold #C9A24F (unten), senkrecht.\n  Auf Hell:   Altgold #B88A2C (oben) -> Bronze #8A6418 (unten), senkrecht.\n  Verlauf nur im Logo und auf Flächen (z. B. Buttons). Text in Vorlagen immer einfarbig.\n\nVERTEILUNG\n  ca. 70 % Nachtschwarz/Tinte, 20 % Elfenbein/Stein (Text), höchstens 10 % Gold.\n\nIN DER APP (technische Farben, nur zur Info)\n  Hintergrund #0B0B0B, Fläche #141311, Fläche 2 #1D1B18, Linie #2C2822, Text #F4EFE6, gedämpft #A39B8C, Akzent #C8A35A / #E8CD92.\n  Statusfarben nur in der App: OK #6FCF8E, Warnung #E8B34A, Fehler #EF6F6F, Info #7FB2F0.\n`;
writeFileSync(D + "/Farben.txt", txt);
let css = `/* Tattookalender – Markenfarben und Schriften (Stand 20.10.2026) */\n:root {\n`;
for (const [n, h, r, , v] of COLORS) css += `  ${v}: ${h}; /* ${n}: ${r} */\n`;
css += `  --tk-verlauf-gold: linear-gradient(180deg, #F3D891, #C9A24F);\n  --tk-verlauf-gold-hell: linear-gradient(180deg, #B88A2C, #8A6418);\n  --tk-schrift-display: "Bricolage Grotesque", Inter, system-ui, sans-serif;\n  --tk-schrift-text: Inter, system-ui, sans-serif;\n}\n`;
writeFileSync(D + "/tattookalender-farben.css", css);
// Adobe Swatch Exchange (.ase) – für Illustrator, InDesign, Photoshop, Affinity
const blocks = [];
const str = (s) => { const b = Buffer.alloc((s.length + 1) * 2); for (let i = 0; i < s.length; i++) b.writeUInt16BE(s.charCodeAt(i), i * 2); return b; };
const groupName = str("Tattookalender");
const gs = Buffer.alloc(6 + 2); gs.writeUInt16BE(0xc001, 0); gs.writeUInt32BE(2 + groupName.length, 2); gs.writeUInt16BE(groupName.length / 2, 6);
blocks.push(Buffer.concat([gs, groupName]));
for (const [n, h] of COLORS) {
  const name = str(n); const [r, g, b] = rgb(h).map((v) => v / 255);
  const body = Buffer.alloc(2 + name.length + 4 + 12 + 2); let o = 0;
  body.writeUInt16BE(name.length / 2, o); o += 2; name.copy(body, o); o += name.length; body.write("RGB ", o, "ascii"); o += 4;
  body.writeFloatBE(r, o); body.writeFloatBE(g, o + 4); body.writeFloatBE(b, o + 8); o += 12; body.writeUInt16BE(0, o); // global
  const hd = Buffer.alloc(6); hd.writeUInt16BE(0x0001, 0); hd.writeUInt32BE(body.length, 2); blocks.push(Buffer.concat([hd, body]));
}
const ge = Buffer.alloc(6); ge.writeUInt16BE(0xc002, 0); ge.writeUInt32BE(0, 2); blocks.push(ge);
const head = Buffer.alloc(12); head.write("ASEF", 0, "ascii"); head.writeUInt16BE(1, 4); head.writeUInt16BE(0, 6); head.writeUInt32BE(blocks.length, 8);
writeFileSync(D + "/tattookalender-farben.ase", Buffer.concat([head, ...blocks]));
console.log(txt);
