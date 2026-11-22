// Prüfung Entwurf B: WebKit in iPhone-15-Pro-Emulation, langsam und schnell scrollen, Screenshots.
// Aufruf: NODE_PATH=/Users/domi/Marketing-Maschine/node_modules node pruefung/pruefen.mjs [url] [ordner]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { webkit, chromium, devices } = require('playwright');

const url = process.argv[2] || 'http://127.0.0.1:4817/';
const aus = process.argv[3] || path.join(path.dirname(new URL(import.meta.url).pathname), 'shots');
fs.mkdirSync(aus, { recursive: true });
const warte = (ms) => new Promise((r) => setTimeout(r, ms));

async function lauf(name, browserType, ctxOpts, modus) {
  const browser = await browserType.launch();
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const fehler = [];
  page.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text()); });
  page.on('pageerror', (e) => fehler.push(String(e)));
  await page.goto(url, { waitUntil: 'networkidle' });
  await warte(600);
  const mass = await page.evaluate(() => ({
    hoehe: document.documentElement.scrollHeight,
    breite: document.documentElement.scrollWidth,
    vw: innerWidth, vh: innerHeight,
    story: document.documentElement.classList.contains('story'),
  }));
  const shots = [];
  const shot = async (n) => { const f = path.join(aus, `${name}-${n}.png`); await page.screenshot({ path: f }); shots.push(f); };
  if (modus === 'langsam') {
    let y = 0, i = 0;
    while (y < mass.hoehe) {
      await page.evaluate((y) => window.scrollTo(0, y), y);
      await warte(450);
      await shot(String(i).padStart(2, '0') + '-' + y);
      y += Math.round(mass.vh * 0.62); i++;
    }
  } else if (modus === 'schnell') {
    // schnelles Wischen: große Sprünge in kurzer Folge, Screenshot ohne Wartezeit nach einzelnen Sprüngen
    for (let k = 0; k < 14; k++) {
      await page.evaluate(() => window.scrollBy(0, 700));
      await warte(40);
      if (k % 3 === 2) await shot('schnell-' + k);
    }
    await page.evaluate(() => window.scrollTo(0, 0)); await warte(60); await shot('schnell-zurueck-oben');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await warte(60); await shot('schnell-unten');
    await page.evaluate(() => window.scrollTo(0, 600)); await warte(30); await shot('schnell-hero-mitte');
  } else if (modus === 'hero') {
    // Kopfbereich in kleinen Schritten
    for (let y = 0; y <= 1150; y += 75) {
      await page.evaluate((y) => window.scrollTo(0, y), y);
      await warte(500);
      await shot('hero-' + String(y).padStart(4, '0'));
    }
  } else if (modus === 'erster') {
    await shot('erster-bildschirm');
  }
  const ueberlauf = await page.evaluate(() => {
    const w = document.documentElement.clientWidth; const raus = [];
    document.querySelectorAll('body *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width && (r.right > w + 1 || r.left < -1) && !el.closest('.buehne-fix')) raus.push(el.tagName + '.' + el.className);
    });
    return { scrollW: document.documentElement.scrollWidth, clientW: w, raus: raus.slice(0, 10) };
  });
  await browser.close();
  return { name, modus, mass, ueberlauf, fehler, shots };
}

const iphone = devices['iPhone 15 Pro'];
const ergebnisse = [];
const was = process.argv[4] || 'alle';
if (was === 'alle' || was === 'iphone') {
  ergebnisse.push(await lauf('iphone-langsam', webkit, iphone, 'langsam'));
  ergebnisse.push(await lauf('iphone', webkit, iphone, 'schnell'));
}
if (was === 'hero') {
  ergebnisse.push(await lauf('iphone', webkit, iphone, 'hero'));
}
if (was === 'herodesktop') {
  ergebnisse.push(await lauf('desktop', webkit, { viewport: { width: 1440, height: 900 } }, 'hero'));
}
if (was === 'alle' || was === 'desktop') {
  ergebnisse.push(await lauf('desktop-langsam', webkit, { viewport: { width: 1440, height: 900 } }, 'langsam'));
}
if (was === 'alle' || was === 'reduziert') {
  ergebnisse.push(await lauf('iphone-reduziert', webkit, { ...iphone, reducedMotion: 'reduce' }, 'erster'));
  ergebnisse.push(await lauf('iphone-ohnejs', webkit, { ...iphone, javaScriptEnabled: false }, 'langsam'));
}
for (const e of ergebnisse) {
  console.log(JSON.stringify({ name: e.name, mass: e.mass, ueberlauf: e.ueberlauf, fehler: e.fehler, shots: e.shots.length }));
}
