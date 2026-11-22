// Social-Media-Vorlagen als bearbeitbare SVG (Text bleibt Text) + PNG-Export
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
const require = createRequire("/Users/domi/Marketing-Maschine/package.json");
const { chromium } = require("playwright");
const K = process.env.HOME + "/Downloads/Tattookalender-Brandingkit";
const OUT = K + "/Vorlagen/Social-Media";
const logo = (name) => readFileSync(`${K}/Logo/SVG/${name}.svg`, "utf8").replace(/<\?xml[^>]*>/, "").replace(/<title>.*?<\/title>/, "");
// Logo als verschachteltes <svg> an Position x,y mit Breite w
const place = (name, x, y, w) => { const s = logo(name); const vb = s.match(/viewBox="([^"]+)"/)[1].split(" ").map(Number); const h = (w * vb[3]) / vb[2]; return { h, code: s.replace(/ width="[^"]+" height="[^"]+"/, ` x="${x}" y="${y}" width="${w}" height="${+h.toFixed(1)}"`).replace(/ role="img"/, ` role="img" id="logo-${name}"`) }; };
const FONTS = `<style>
    @font-face { font-family: "Bricolage Grotesque"; font-weight: 800; src: url("../../Farben-Schriften/Schriften/Bricolage-Grotesque/einzeln/BricolageGrotesque-ExtraBold.ttf"); }
    @font-face { font-family: "Bricolage Grotesque"; font-weight: 600; src: url("../../Farben-Schriften/Schriften/Bricolage-Grotesque/einzeln/BricolageGrotesque-SemiBold.ttf"); }
    @font-face { font-family: Inter; font-weight: 400; src: url("../../Farben-Schriften/Schriften/Inter/einzeln/Inter-Regular.ttf"); }
    @font-face { font-family: Inter; font-weight: 500; src: url("../../Farben-Schriften/Schriften/Inter/einzeln/Inter-Medium.ttf"); }
    @font-face { font-family: Inter; font-weight: 600; src: url("../../Farben-Schriften/Schriften/Inter/einzeln/Inter-SemiBold.ttf"); }
    .h { font-family: "Bricolage Grotesque", Inter, sans-serif; font-weight: 800; letter-spacing: -0.03em; }
    .t { font-family: Inter, sans-serif; }
  </style>`;
const BG = (W, H) => `<rect width="${W}" height="${H}" fill="#0b0b0d"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>`;
const DEFS = (W, H) => `<radialGradient id="glow" gradientUnits="userSpaceOnUse" cx="${W * 0.3}" cy="${-H * 0.04}" r="${W * 0.95}"><stop offset="0" stop-color="#d9b468" stop-opacity=".26"/><stop offset=".55" stop-color="#d9b468" stop-opacity=".06"/><stop offset="1" stop-color="#d9b468" stop-opacity="0"/></radialGradient>
    <linearGradient id="btn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3d891"/><stop offset="1" stop-color="#c9a24f"/></linearGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0b0d" stop-opacity="0"/><stop offset="1" stop-color="#0b0b0d"/></linearGradient>`;

let measure; // Textbreiten im Browser messen (für Chips/Buttons)
const chip = (x, y, text, size = 30, icon = "check") => {
  const h = size * 2.1, pad = size * 0.75, ic = size * 1.2, w = measure(text, `600 ${size}px Inter`) + pad * 2 + ic + size * 0.45;
  const cx = x + pad + ic / 2, cy = y + h / 2;
  const sym = icon === "check" ? `<circle cx="${cx}" cy="${cy}" r="${ic / 2}" fill="#c9a24f"/><path d="M${cx - ic * 0.22} ${cy + ic * 0.01} l${ic * 0.15} ${ic * 0.15} l${ic * 0.29} -${ic * 0.3}" fill="none" stroke="#0b0b0d" stroke-width="${size * 0.13}" stroke-linecap="round" stroke-linejoin="round"/>` : "";
  return `<g class="chip">
    <rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="${h}" rx="${h / 2}" fill="#16161a" stroke="#ffffff" stroke-opacity=".14" stroke-width="2"/>
    ${sym}
    <text class="t" x="${x + pad + ic + size * 0.45}" y="${cy + size * 0.36}" font-size="${size}" font-weight="600" fill="#f4f1ea">${text}</text>
  </g>`;
};
const button = (cx, y, text, size = 40) => {
  const h = size * 2.3, w = measure(text, `600 ${size}px Inter`) + size * 2.4;
  return `<g class="button">
    <rect x="${(cx - w / 2).toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${h}" rx="${size * 0.55}" fill="url(#btn)"/>
    <text class="t" x="${cx}" y="${y + h / 2 + size * 0.36}" font-size="${size}" font-weight="600" fill="#14110a" text-anchor="middle">${text}</text>
  </g>`;
};
const phone = (x, y, w, img, id, cutY = 99999) => {
  const ih = (w - 24) * (1688 / 780), h = ih + 24, r = w * 0.115;
  return `<clipPath id="${id}-cut"><rect x="0" y="0" width="2000" height="${cutY}"/></clipPath>
  <g class="handy" clip-path="url(#${id}-cut)">
    <clipPath id="${id}"><rect x="${x + 12}" y="${y + 12}" width="${w - 24}" height="${ih}" rx="${r - 10}"/></clipPath>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="#1b1b20" stroke="#c9a24f" stroke-opacity=".35" stroke-width="2"/>
    <image href="../Bilder/${img}" x="${x + 12}" y="${y + 12}" width="${w - 24}" height="${ih}" preserveAspectRatio="xMidYMin slice" clip-path="url(#${id})"/>
  </g>`;
};
const demoLabel = (x, y, anchor = "start") => `<text class="t" x="${x}" y="${y}" font-size="24" font-weight="600" fill="#a7a39a" text-anchor="${anchor}">Beispiel-Studio mit Demo-Daten</text>`;
const lines = (x, y, size, lh, rows, anchor = "start") => rows.map(([txt, color], i) => `<text class="h" x="${x}" y="${y + i * lh}" font-size="${size}" fill="${color}" text-anchor="${anchor}">${txt}</text>`).join("\n  ");
const doc = (W, H, title, body) => `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <title>${title}</title>
  <!-- Bearbeiten: Texte stehen in den <text>-Zeilen. Schriften vorher installieren (Ordner Farben-Schriften/Schriften). -->
  ${FONTS}
  <defs>${DEFS(W, H)}</defs>
  ${BG(W, H)}
  ${body}
</svg>
`;
const IV = "#f4f1ea", GD = "#c9a24f", ST = "#a7a39a";

const T = {};
T["post-aussage-1080x1350"] = () => {
  const L = place("tattookalender-logo-quer-dunkel", 90, 96, 400);
  return doc(1080, 1350, "Instagram-Post – Aussage", `${L.code}
  <!-- Überschrift: weiße Zeilen + goldene Zeilen -->
  ${lines(84, 640, 118, 120, [["Dein Team", IV], ["tätowiert.", IV], ["Den Rest erledigt", GD], ["das System.", GD]])}
  <text class="t" x="90" y="1100" font-size="36" font-weight="400" fill="${ST}">Termine, Anzahlungen, Einwilligung und Chats –</text>
  <text class="t" x="90" y="1150" font-size="36" font-weight="400" fill="${ST}">alles in einem Programm für dein Studio.</text>
  <line x1="90" y1="1222" x2="990" y2="1222" stroke="#2c2822" stroke-width="2"/>
  <text class="t" x="90" y="1278" font-size="32" font-weight="600" fill="${GD}">tattookalender.de</text>
  <text class="t" x="990" y="1278" font-size="28" font-weight="500" fill="${ST}" text-anchor="end">Gebaut für Tattoo-Studios</text>`);
};
T["post-screenshot-1080x1350"] = () => {
  const L = place("tattookalender-logo-quer-kompakt-dunkel", 540 - 170, 1228, 340);
  return doc(1080, 1350, "Instagram-Post – Screenshot", `<!-- Überschrift -->
  ${lines(540, 168, 100, 104, [["Endlich alles", IV], ["an einem Ort.", GD]], "middle")}
  ${phone(295, 320, 490, "demo-kalender.jpg", "clip-handy-1", 1140)}
  <rect x="0" y="900" width="1080" height="242" fill="url(#fade)"/>
  ${chip(96, 470, "Termine")}
  ${chip(800, 610, "Chats")}
  ${chip(70, 780, "Anzahlungen")}
  ${demoLabel(540, 1190, "middle")}
  ${L.code}`);
};
T["story-aussage-1080x1920"] = () => {
  const L = place("tattookalender-logo-gestapelt-dunkel", 540 - 210, 300, 420);
  return doc(1080, 1920, "Instagram-Story – Aussage", `${L.code}
  <!-- Oben ca. 250 px und unten ca. 340 px frei lassen (Instagram blendet dort Profil und Antwortfeld ein) -->
  ${lines(540, 860, 124, 126, [["Termine.", IV], ["Anzahlungen.", IV], ["Einwilligung.", IV], ["Ein System.", GD]], "middle")}
  <text class="t" x="540" y="1420" font-size="38" font-weight="400" fill="${ST}" text-anchor="middle">Für Tattoo-Studios mit einem oder mehreren Standorten.</text>
  ${button(540, 1480, "Demo anfragen")}
  <text class="t" x="540" y="1650" font-size="34" font-weight="600" fill="${GD}" text-anchor="middle">tattookalender.de</text>`);
};
T["story-screenshot-1080x1920"] = () => {
  const L = place("tattookalender-logo-quer-kompakt-dunkel", 540 - 210, 1580, 420);
  return doc(1080, 1920, "Instagram-Story – Screenshot", `<!-- Überschrift -->
  ${lines(540, 370, 96, 104, [["Kunde wird", IV], ["automatisch erinnert.", GD]], "middle")}
  ${phone(250, 500, 580, "demo-erinnerung.jpg", "clip-handy-2", 1440)}
  <rect x="0" y="1180" width="1080" height="262" fill="url(#fade)"/>
  ${chip(70, 700, "1 Tag vorher", 34)}
  ${chip(640, 1000, "Kunde bestätigt", 34)}
  ${demoLabel(540, 1500, "middle")}
  ${L.code}
  <text class="t" x="540" y="1720" font-size="32" font-weight="600" fill="${GD}" text-anchor="middle">tattookalender.de</text>`);
};

const b = await chromium.launch({ args: ["--allow-file-access-from-files"] });
const p = await b.newPage();
// Messfunktion vorbereiten
await p.goto("file://" + OUT + "/");
await p.setContent(`<style>@font-face{font-family:Inter;font-weight:600;src:url("file://${K}/Farben-Schriften/Schriften/Inter/einzeln/Inter-SemiBold.ttf")}</style><span style="font:600 20px Inter">x</span>`);
const { FONT_CSS } = await import("./fontcss.mjs");
await p.setContent(`<style>${FONT_CSS}</style><span style="font:600 20px Inter">x</span>`);
await p.evaluate(() => document.fonts.ready);
const texts = ["Termine", "Chats", "Anzahlungen", "1 Tag vorher", "Kunde bestätigt", "Demo anfragen"];
const widths = {};
for (const s of [30, 34, 40]) for (const t of texts) widths[`${t}|${s}`] = await p.evaluate(([t, s]) => { const c = document.createElement("canvas").getContext("2d"); c.font = `600 ${s}px Inter`; return c.measureText(t).width; }, [t, s]);
measure = (t, font) => widths[`${t}|${parseInt(font.split(" ")[1])}`];
for (const [name, fn] of Object.entries(T)) {
  const code = fn(); writeFileSync(`${OUT}/${name}.svg`, code);
  const [W, H] = name.match(/(\d+)x(\d+)/).slice(1).map(Number);
  await p.setViewportSize({ width: W, height: H });
  await p.goto(`file://${OUT}/${name}.svg`); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  const ok = await p.evaluate(() => [...document.fonts].map((f) => f.family + f.weight + ":" + f.status).join(" "));
  await p.screenshot({ path: `${OUT}/${name}.png` });
  console.log(name, ok);
}
await b.close();
