// Erzeugt alle Logo-Varianten als Vektor-SVG (Schrift in Pfade umgewandelt) + PNG-Exporte.
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const require = createRequire("/Users/domi/Marketing-Maschine/package.json");
const { chromium } = require("playwright");
const P = JSON.parse(readFileSync("paths.json", "utf8"));
const OUT = process.env.HOME + "/Downloads/Tattookalender-Brandingkit/Logo";
for (const d of ["SVG", "PNG-4000px", "PNG-1000px"]) mkdirSync(`${OUT}/${d}`, { recursive: true });

const C = { night: "#0b0b0d", ivory: "#f4f1ea", stone: "#a7a39a", slate: "#6b675f", champ: "#f3d891", gold: "#c9a24f", altgold: "#b88a2c", bronze: "#8a6418", black: "#000000", white: "#ffffff" };
const r2 = (v) => +v.toFixed(2);

// Bildmarke: Kalenderblatt, Ringe, Haken als Tattoo-Nadel. Koordinaten 0–120 wie im Original (App-Icon).
// (Die Trennlinie M10 44h100 aus dem Original ist im Browser unsichtbar – Verlauf auf 0 px Höhe – und fehlt deshalb hier bewusst.)
function mark(mode) {
  if (mode === "color") return `
    <rect x="10" y="18" width="100" height="92" rx="22" fill="url(#tk-sheet)" stroke="url(#tk-gold)" stroke-width="5"/>
    <rect x="32" y="6" width="9" height="24" rx="4.5" fill="url(#tk-gold)"/>
    <rect x="79" y="6" width="9" height="24" rx="4.5" fill="url(#tk-gold)"/>
    <path d="M34 77 L51 93 L88 56" fill="none" stroke="url(#tk-gold)" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M88 56 L99 45" fill="none" stroke="url(#tk-gold)" stroke-width="3.5" stroke-linecap="round"/>
    <circle cx="101.5" cy="42.5" r="3.2" fill="url(#tk-gold)"/>`;
  const c = mode;
  return `
    <rect x="10" y="18" width="100" height="92" rx="22" fill="none" stroke="${c}" stroke-width="5"/>
    <rect x="32" y="6" width="9" height="24" rx="4.5" fill="${c}"/>
    <rect x="79" y="6" width="9" height="24" rx="4.5" fill="${c}"/>
    <path d="M34 77 L51 93 L88 56" fill="none" stroke="${c}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M88 56 L99 45" fill="none" stroke="${c}" stroke-width="3.5" stroke-linecap="round"/>
    <circle cx="101.5" cy="42.5" r="3.2" fill="${c}"/>`;
}
const markDefs = `
    <linearGradient id="tk-gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.champ}"/><stop offset="1" stop-color="${C.gold}"/></linearGradient>
    <linearGradient id="tk-sheet" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1c1a16"/><stop offset="1" stop-color="${C.night}"/></linearGradient>`;
// Farben je Variante
const SCHEMES = {
  dunkel: { mark: "color", tattoo: C.ivory, kal: [C.champ, C.gold], sub: C.stone, title: "für dunklen Hintergrund" },
  hell: { mark: "color", tattoo: C.night, kal: [C.altgold, C.bronze], sub: C.slate, title: "für hellen Hintergrund" },
  schwarz: { mark: C.black, tattoo: C.black, kal: C.black, sub: C.black, title: "einfarbig schwarz" },
  weiss: { mark: C.white, tattoo: C.white, kal: C.white, sub: C.white, title: "einfarbig weiß" },
  gold: { mark: C.gold, tattoo: C.gold, kal: C.gold, sub: C.gold, title: "einfarbig gold" },
};
const ky1 = P.kspan.y, ky2 = P.kspan.y + P.kspan.h; // Verlauf über die Zeilenhöhe von „kalender“ wie im Original
function textDefs(s) { return Array.isArray(s.kal) ? `<linearGradient id="tk-kal" gradientUnits="userSpaceOnUse" x1="0" y1="${ky1}" x2="0" y2="${ky2}"><stop offset="0" stop-color="${s.kal[0]}"/><stop offset="1" stop-color="${s.kal[1]}"/></linearGradient>` : ""; }
const word = (s) => `<path fill="${s.tattoo}" d="${P.tattoo}"/>
    <path fill="${Array.isArray(s.kal) ? "url(#tk-kal)" : s.kal}" d="${P.kalender}"/>`;
const sub = (s) => `<path fill="${s.sub}" d="${P.sub}"/>`;

// Layout „quer“ (wie App-Logo): Bildmarke bei (24,20), Text ab x=170 – Koordinaten 1:1 aus dem Original gemessen.
const MB = { x0: 7.5, y0: 6, x1: 112.5, y1: 112.5 }; // sichtbare Grenzen der Bildmarke (inkl. Kontur)
function quer(s, withSub = true) {
  const x0 = 24 + MB.x0, y0 = Math.min(20 + MB.y0, P.kb[1]);
  const x1 = Math.max(P.kb[2], P.sb[2]), y1 = Math.max(20 + MB.y1, withSub ? P.sb[3] : P.kb[3]);
  // ohne Unterzeile: Text vertikal zur Bildmarke zentrieren
  const dy = withSub ? 0 : (20 + (MB.y0 + MB.y1) / 2) - (P.kb[1] + P.kb[3]) / 2;
  const body = `<g transform="translate(24 20)">${mark(s.mark)}</g>
  <g transform="translate(0 ${r2(dy)})">${word(s)}</g>${withSub ? "\n  " + sub(s) : ""}`;
  return { vb: [x0, y0, x1 - x0, y1 - y0], body };
}
// Layout „gestapelt“: Bildmarke (×1,3) mittig oben, darunter Wortmarke und Unterzeile, alles mittig
function stacked(s) {
  const sM = 1.3, markTop = 0;
  const wordCx = (P.tb[0] + P.kb[2]) / 2, subCx = (P.sb[0] + P.sb[2]) / 2;
  const markH = (MB.y1 - MB.y0) * sM, gap = 34;
  const ty = markTop + markH + gap - Math.min(P.tb[1], P.kb[1]);
  const body = `<g transform="translate(${r2(-60 * sM)} ${r2(markTop - MB.y0 * sM)}) scale(${sM})">${mark(s.mark)}</g>
  <g transform="translate(${r2(-wordCx)} ${r2(ty)})">${word(s)}</g>
  <g transform="translate(${r2(-subCx)} ${r2(ty)})">${sub(s)}</g>`;
  const halfW = Math.max((P.kb[2] - P.tb[0]) / 2, (P.sb[2] - P.sb[0]) / 2);
  return { vb: [-halfW, 0, 2 * halfW, ty + P.sb[3]], body };
}
function symbol(s) {
  return { vb: [MB.x0, MB.y0, MB.x1 - MB.x0, MB.y1 - MB.y0], body: mark(s.mark) };
}
const svg = (lay, s, title) => {
  const vb = lay.vb.map(r2);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb.join(" ")}" width="${vb[2]}" height="${vb[3]}" role="img" aria-label="Tattookalender – Das Studio-System">
  <title>Tattookalender – ${title}</title>
  <defs>${s.mark === "color" ? markDefs : ""}${textDefs(s)}</defs>
  ${lay.body}
</svg>
`;
};
const files = [];
for (const [key, s] of Object.entries(SCHEMES)) {
  const items = [
    [`tattookalender-logo-quer-${key}`, quer(s), `Logo quer, ${s.title}`],
    [`tattookalender-logo-gestapelt-${key}`, stacked(s), `Logo gestapelt, ${s.title}`],
  ];
  if (key === "dunkel" || key === "hell") items.push([`tattookalender-logo-quer-kompakt-${key}`, quer(s, false), `Logo quer ohne Unterzeile, ${s.title}`]);
  if (key !== "hell") items.push([`tattookalender-symbol-${key === "dunkel" ? "farbig" : key}`, symbol(s), `Bildmarke, ${key === "dunkel" ? "farbig" : s.title}`]);
  for (const [name, lay, title] of items) {
    const code = svg(lay, s, title);
    writeFileSync(`${OUT}/SVG/${name}.svg`, code);
    files.push({ name, w: lay.vb[2], h: lay.vb[3], code });
  }
}
// PNG-Exporte (transparent) über Chromium
const b = await chromium.launch();
const p = await b.newPage();
for (const f of files) {
  const isSym = f.name.includes("symbol");
  for (const [dir, W] of [["PNG-4000px", isSym ? 2000 : 4000], ["PNG-1000px", isSym ? 512 : 1000]]) {
    const H = Math.round(W * f.h / f.w);
    await p.setViewportSize({ width: W, height: H });
    await p.setContent(`<!doctype html><html><body style="margin:0;background:transparent">${f.code.replace(/width="[^"]+" height="[^"]+"/, `width="${W}" height="${H}"`)}</body></html>`);
    await p.screenshot({ path: `${OUT}/${dir}/${f.name}.png`, omitBackground: true, clip: { x: 0, y: 0, width: W, height: H } });
  }
}
await b.close();
writeFileSync("logo-files.json", JSON.stringify(files.map(({ name, w, h }) => ({ name, w, h }))));
console.log(files.map((f) => `${f.name} ${r2(f.w)}x${r2(f.h)}`).join("\n"));
