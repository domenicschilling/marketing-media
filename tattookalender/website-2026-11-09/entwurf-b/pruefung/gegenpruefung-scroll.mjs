// Adversariale Prüfung: 300-px-Schritte ohne Warten, schnell ans Ende, ohne JS, reduziert, Höhe.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('/Users/domi/Marketing-Maschine/node_modules/');
const { webkit, chromium, devices } = require('playwright');
const url = process.argv[2] || 'http://127.0.0.1:4831/';
const aus = process.argv[3];
const was = process.argv[4] || 'alle';
fs.mkdirSync(aus, { recursive: true });

async function lauf(name, bt, opts, fn) {
  const b = await bt.launch();
  const ctx = await b.newContext(opts);
  const p = await ctx.newPage();
  const fehler = [];
  p.on('console', (m) => { if (m.type() === 'error') fehler.push(m.text()); });
  p.on('pageerror', (e) => fehler.push(String(e)));
  await p.goto(url, { waitUntil: 'load' });
  await p.waitForTimeout(300);
  const r = await fn(p);
  await b.close();
  console.log(name, JSON.stringify({ fehler, ...r }));
}

async function schritte(p, name, step = 300) {
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  let i = 0;
  for (let y = 0; y < H; y += step) {
    await p.evaluate((y) => scrollTo(0, y), y);
    await p.screenshot({ path: `${aus}/${name}-${String(i++).padStart(2, '0')}-${y}.png` });
  }
  // schnell ans Ende
  await p.evaluate(() => scrollTo(0, 0));
  await p.mouse.wheel(0, 0).catch(() => {});
  for (let k = 0; k < 12; k++) { await p.evaluate(() => scrollBy(0, 900)); }
  await p.screenshot({ path: `${aus}/${name}-schnell-ende.png` });
  await p.evaluate(() => scrollTo(0, 500));
  await p.screenshot({ path: `${aus}/${name}-schnell-zurueck-500.png` });
  const m = await p.evaluate(() => {
    document.querySelectorAll('*').forEach((el) => { el.style.contentVisibility = 'visible'; });
    const w = document.documentElement.clientWidth; const raus = [];
    document.querySelectorAll('body *').forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.width && (r.right > w + 1 || r.left < -1) && !el.closest('.buehne-fix')) raus.push(el.tagName + '.' + el.className);
    });
    return { hoehe: document.documentElement.scrollHeight, scrollW: document.documentElement.scrollWidth, clientW: w, raus: raus.slice(0, 8), story: document.documentElement.classList.contains('story') };
  });
  return m;
}

const iphone = devices['iPhone 15 Pro'];
if (was === 'alle' || was === 'iphone') await lauf('iphone', webkit, iphone, (p) => schritte(p, 'iphone'));
if (was === 'alle' || was === 'iphone390') await lauf('iphone390', webkit, { ...iphone, viewport: { width: 390, height: 664 } }, async (p) => ({ hoehe: await p.evaluate(() => document.documentElement.scrollHeight) }));
if (was === 'alle' || was === 't768') await lauf('t768', chromium, { viewport: { width: 768, height: 1024 } }, (p) => schritte(p, 't768', 400));
if (was === 'alle' || was === 'd1440') await lauf('d1440', chromium, { viewport: { width: 1440, height: 900 } }, (p) => schritte(p, 'd1440', 400));
if (was === 'alle' || was === 'ohnejs') await lauf('ohnejs', webkit, { ...iphone, javaScriptEnabled: false }, async (p) => {
  const leer = await p.evaluate(() => {
    const bad = [];
    document.querySelectorAll('h1,h2,h3,p,li,dt,dd,summary,a,.chip').forEach((el) => {
      const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
      if (el.closest('details:not([open])') && el.tagName !== 'SUMMARY') return;
      if (el.closest('.leiste')) return;
      if (cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.99 || r.height === 0) bad.push(el.tagName + ':' + el.textContent.trim().slice(0, 40));
    });
    return bad;
  });
  const s = await schritte(p, 'ohnejs', 600);
  return { unsichtbar: leer, ...s };
});
if (was === 'alle' || was === 'reduziert') await lauf('reduziert', webkit, { ...iphone, reducedMotion: 'reduce' }, async (p) => {
  const info = await p.evaluate(() => ({ story: document.documentElement.classList.contains('story'), anim: document.getAnimations().length }));
  const s = await schritte(p, 'reduziert', 600);
  const nach = await p.evaluate(() => ({ anim: document.getAnimations().filter(a => a.playState === 'running').length, transformed: [...document.querySelectorAll('.app-bild,.kal,.abschnitt h2')].filter(e => getComputedStyle(e).transform !== 'none').length }));
  return { ...info, ...nach, ...s };
});
// Sicherheitsfall: main.js lädt nicht (GSAP da) -> bleibt Text versteckt?
if (was === 'alle' || was === 'ohnemain') await lauf('ohnemain', webkit, iphone, async (p) => {
  return {};
});
