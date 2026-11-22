// Prüfung Entwurf C, Fassung 2 (11.11.2026)
// WebKit mit devices['iPhone 15 Pro']: langsam in 300-px-Schritten OHNE Warten (Screenshot direkt nach jedem Schritt),
// im Ablauf zusätzlich Station für Station im eigenen Scrollbereich, dann schnell (große Sprünge), dann 1440 px.
// Dazu: ohne JavaScript, reduzierte Bewegung, seitlicher Überlauf, Gesamthöhe inkl. Scroll-Strecke des Ablaufs.
// Aufruf: node pruefung/v2-pruefen.mjs [url]
// Hinweis: Playwright-WebKit verschiebt nach einem Screenshot die Seite, sobald danach ein innerer Scrollbereich bewegt wird
// (nur in der Emulation; im iOS-Simulator nicht beobachtet). Darum wird die Seitenposition nach jedem inneren Schritt zurückgesetzt.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire('/Users/domi/Marketing-Maschine/');
const { webkit, devices } = require('playwright');
const url = process.argv[2] || 'http://127.0.0.1:4823/';
const out = path.dirname(new URL(import.meta.url).pathname);
const iphone = devices['iPhone 15 Pro'];
const b = await webkit.launch();
const bericht = {};

async function seite(opts) {
  const c = await b.newContext(opts); const p = await c.newPage();
  const fehler = []; p.on('pageerror', e => fehler.push(String(e))); p.on('console', m => { if (m.type() === 'error') fehler.push(m.text()); });
  await p.goto(url, { waitUntil: 'networkidle' });
  return { c, p, fehler };
}
const ueberlauf = (p) => p.evaluate(() => {
  const w = document.documentElement.clientWidth, raus = [];
  document.querySelectorAll('body *').forEach(el => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    if (el.closest('.hero, .stage, .laptop, .seam, .zero, .finale .mark')) return; // bewusst beschnitten (overflow: clip/hidden)
    if (r.right > w + 1 || r.left < -1) raus.push(el.tagName.toLowerCase() + '.' + String(el.className).slice(0, 40) + ' ' + Math.round(r.left) + '..' + Math.round(r.right));
  });
  return { scrollW: document.documentElement.scrollWidth, clientW: w, bodyScrollW: document.body.scrollWidth, raus: raus.slice(0, 8) };
});

// ---- Handy langsam ----
{
  const { c, p, fehler } = await seite(iphone);
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  const vh = await p.evaluate(() => innerHeight);
  let i = 0;
  for (let y = 0; y < H - vh + 300; y += 300) {
    await p.evaluate(y => scrollTo(0, y), y);
    await p.screenshot({ path: `${out}/v2-handy-langsam-${String(i++).padStart(2, '0')}.png` });
  }
  // Ablauf: bündig, dann im eigenen Scrollbereich in 300-px-Schritten ohne Warten, danach je Station nach dem Einrasten
  const top = await p.evaluate(() => document.querySelector('.story-scroller').getBoundingClientRect().top + scrollY);
  await p.evaluate(y => scrollTo(0, y), top); await p.waitForTimeout(500);
  const info = await p.evaluate(() => { const sc = document.querySelector('.story-scroller'); return { max: sc.scrollHeight - sc.clientHeight, step: document.querySelector('.station').offsetHeight, ch: sc.clientHeight }; });
  let k = 0;
  for (let y = 0; y <= info.max; y += 300) {
    await p.evaluate(y => document.querySelector('.story-scroller').scrollTo(0, y), y);
    await p.evaluate(y => scrollTo(0, y), top);
    await p.screenshot({ path: `${out}/v2-handy-ablauf-schritt-${String(k++).padStart(2, '0')}.png` });
  }
  for (let s = 0; s < 6; s++) {
    await p.evaluate(y => document.querySelector('.story-scroller').scrollTo(0, y), s * info.step);
    await p.waitForTimeout(60); await p.evaluate(y => scrollTo(0, y), top);
    await p.waitForTimeout(1300);
    await p.screenshot({ path: `${out}/v2-handy-station-${s + 1}.png` });
  }
  bericht.handy = { seitenhoehe: H, viewport: vh, ablaufStrecke: info.max, gesamt: H + info.max, ueberlauf: await ueberlauf(p), fehler };
  await c.close();
}
// ---- Handy schnell ----
{
  const { c, p, fehler } = await seite(iphone);
  for (let k = 0; k < 8; k++) { await p.evaluate(() => scrollBy(0, 1100)); await p.screenshot({ path: `${out}/v2-handy-schnell-${k}.png` }); }
  await p.evaluate(() => { const sc = document.querySelector('.story-scroller'); scrollTo(0, sc.getBoundingClientRect().top + scrollY); sc.scrollTo(0, sc.scrollHeight); });
  await p.waitForTimeout(80); await p.screenshot({ path: `${out}/v2-handy-schnell-ablauf-ende.png` });
  await p.evaluate(() => scrollTo(0, 0)); await p.screenshot({ path: `${out}/v2-handy-schnell-zurueck-oben.png` });
  bericht.schnell = { fehler };
  await c.close();
}
// ---- Kopfbereich im Zeitverlauf (Haken-Moment) ----
{
  const c = await b.newContext(iphone); const p = await c.newPage();
  const t0 = Date.now(); await p.goto(url, { waitUntil: 'commit' });
  for (const ms of [300, 700, 1200, 2000]) { const w = ms - (Date.now() - t0); if (w > 0) await p.waitForTimeout(w); await p.screenshot({ path: `${out}/v2-handy-kopf-${ms}ms.png` }); }
  bericht.kopf = await p.evaluate(() => document.querySelector('.hero').className);
  await c.close();
}
// ---- Desktop 1440 ----
{
  const { c, p, fehler } = await seite({ viewport: { width: 1440, height: 900 } });
  await p.waitForTimeout(2200); await p.screenshot({ path: `${out}/v2-1440-kopf.png` });
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  let i = 0;
  for (let y = 300; y < H - 900 + 300; y += 300) { await p.evaluate(y => scrollTo(0, y), y); await p.screenshot({ path: `${out}/v2-1440-langsam-${String(i++).padStart(2, '0')}.png` }); }
  const top = await p.evaluate(() => document.querySelector('.story-scroller').getBoundingClientRect().top + scrollY);
  const step = await p.evaluate(() => document.querySelector('.station').offsetHeight);
  for (let s = 0; s < 6; s++) { await p.evaluate(y => scrollTo(0, y), top + s * step); await p.waitForTimeout(1300); await p.screenshot({ path: `${out}/v2-1440-station-${s + 1}.png` }); }
  for (const id of ['preise', 'fragen']) { await p.evaluate(id => document.getElementById(id).scrollIntoView(), id); await p.waitForTimeout(900); await p.screenshot({ path: `${out}/v2-1440-${id}.png` }); }
  bericht.desktop = { seitenhoehe: H, ueberlauf: await ueberlauf(p), fehler };
  await c.close();
}
// ---- ohne JavaScript, reduzierte Bewegung ----
{
  const { c, p, fehler } = await seite({ ...iphone, javaScriptEnabled: false });
  await p.screenshot({ path: `${out}/v2-handy-ohne-js-ganz.png`, fullPage: true });
  bericht.ohneJs = { hoehe: await p.evaluate(() => document.documentElement.scrollHeight), ueberlauf: await ueberlauf(p), fehler };
  await c.close();
}
{
  const { c, p, fehler } = await seite({ ...iphone, reducedMotion: 'reduce' });
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${out}/v2-handy-reduziert-oben.png` });
  bericht.reduziert = { hoehe: await p.evaluate(() => document.documentElement.scrollHeight), story: await p.evaluate(() => document.querySelector('.story').className), fehler };
  await c.close();
}
await b.close();
fs.writeFileSync(`${out}/v2-bericht.json`, JSON.stringify(bericht, null, 2));
console.log(JSON.stringify(bericht, null, 2));
