// Prüfung Entwurf A in WebKit, iPhone-15-Pro-Emulation: langsam und schnell scrollen, Screenshots, Messungen.
// Aufruf: NODE_PATH=/Users/domi/Marketing-Maschine/node_modules node pruefung/pruefen.mjs [url] [modus]
// modus: alles (Standard) | langsam | schnell | desktop | nojs | reduce
import { createRequire } from "module";
const require = createRequire("/Users/domi/Marketing-Maschine/");
const { webkit, devices } = require("playwright");
const URL_ = process.argv[2] || "http://127.0.0.1:8417/";
const MODUS = process.argv[3] || "alles";
const OUT = new URL("./bilder/", import.meta.url).pathname;
import { mkdirSync } from "fs";
mkdirSync(OUT, { recursive: true });

const b = await webkit.launch();
const fehler = [];

async function messen(p, name) {
  const m = await p.evaluate(() => {
    const de = document.documentElement;
    const breit = [];
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width && (r.right > de.clientWidth + 1 || r.left < -1)) {
        if (el.closest(".faden") || el.closest(".telefon-schirm")) continue;
        breit.push(`${el.tagName.toLowerCase()}.${(el.className && el.className.baseVal === undefined ? el.className : "").toString().slice(0, 40)} L${Math.round(r.left)} R${Math.round(r.right)}`);
      }
    }
    return { hoehe: de.scrollHeight, breite: de.scrollWidth, client: de.clientWidth, breit: breit.slice(0, 12), klassen: de.className };
  });
  console.log(name, JSON.stringify(m));
  return m;
}

async function handy(opts = {}) {
  const ctx = await b.newContext({ ...devices["iPhone 15 Pro"], ...opts });
  const p = await ctx.newPage();
  p.on("console", (msg) => { if (msg.type() === "error") fehler.push(msg.text()); });
  p.on("pageerror", (e) => fehler.push(String(e)));
  await p.goto(URL_, { waitUntil: "load" });
  await p.waitForTimeout(2200);
  return { ctx, p };
}

if (MODUS === "alles" || MODUS === "langsam") {
  const { ctx, p } = await handy();
  await messen(p, "handy");
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  const vh = await p.evaluate(() => innerHeight);
  let i = 0;
  for (let y = 0; y < H; y += Math.round(vh * 0.8)) {
    await p.evaluate((y) => window.scrollTo(0, y), y);
    await p.waitForTimeout(650);
    await p.screenshot({ path: `${OUT}langsam-${String(i++).padStart(2, "0")}.png` });
  }
  // Abschluss: Blatt bei ca. 45 % der Höhe, kurz warten, bis die Nadel den Haken gezogen hat
  const yb = await p.evaluate(() => { const r = document.querySelector("[data-bogen]").getBoundingClientRect(); return r.top + scrollY - innerHeight * 0.4; });
  await p.evaluate((y) => window.scrollTo(0, y), yb);
  await p.waitForTimeout(1600);
  await p.screenshot({ path: `${OUT}haken.png` });
  await ctx.close();
}

if (MODUS === "alles" || MODUS === "schnell") {
  // schnelles Wischen: große Sprünge per Mausrad/Touch-Nachbildung, Screenshot sofort (ohne Warten)
  const { ctx, p } = await handy();
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  let i = 0;
  for (let y = 0; y < H; y += 1400) {
    await p.evaluate((y) => window.scrollTo(0, y), y);
    await p.waitForTimeout(60);
    await p.screenshot({ path: `${OUT}schnell-${String(i++).padStart(2, "0")}.png` });
  }
  // zurück nach oben in einem Sprung
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(80);
  await p.screenshot({ path: `${OUT}schnell-zurueck.png` });
  await ctx.close();
}

if (MODUS === "alles" || MODUS === "stationen") {
  const { ctx, p } = await handy();
  const info = await p.evaluate(() => { const s = document.querySelector("[data-strecke]"); const r = s.getBoundingClientRect(); return { top: r.top + scrollY, h: r.height, vh: innerHeight }; });
  const kopf = 60, weg = info.h - (info.vh - kopf);
  for (let i = 0; i < 5; i++) {
    await p.evaluate((y) => window.scrollTo(0, y), Math.round(info.top - kopf + weg * (i + 0.5) / 5));
    await p.waitForTimeout(900);
    await p.screenshot({ path: `${OUT}station-${i + 1}.png` });
  }
  await ctx.close();
}

if (MODUS === "alles" || MODUS === "nojs") {
  const { ctx, p } = await handy({ javaScriptEnabled: false });
  await messen(p, "nojs");
  await p.screenshot({ path: `${OUT}nojs-voll.png`, fullPage: true });
  await ctx.close();
}

if (MODUS === "alles" || MODUS === "reduce") {
  const { ctx, p } = await handy({ reducedMotion: "reduce" });
  await messen(p, "reduce");
  await p.screenshot({ path: `${OUT}reduce-voll.png`, fullPage: true });
  await ctx.close();
}

if (MODUS === "alles" || MODUS === "desktop") {
  for (const w of [768, 1440]) {
    const ctx = await b.newContext({ viewport: { width: w, height: w === 768 ? 1024 : 900 }, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    p.on("pageerror", (e) => fehler.push(String(e)));
    await p.goto(URL_, { waitUntil: "load" });
    await p.waitForTimeout(2200);
    await messen(p, "w" + w);
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    let i = 0;
    for (let y = 0; y < H; y += 800) {
      await p.evaluate((y) => window.scrollTo(0, y), y);
      await p.waitForTimeout(500);
      await p.screenshot({ path: `${OUT}w${w}-${String(i++).padStart(2, "0")}.png` });
    }
    await ctx.close();
  }
}

console.log("Fehler:", fehler.length ? fehler : "keine");
await b.close();
