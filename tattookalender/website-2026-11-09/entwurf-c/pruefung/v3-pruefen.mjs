// Prüfung Entwurf C, Fassung 3 (11.11.2026, Art-Director-/QA-Runde)
// Aufruf: node pruefung/v3-pruefen.mjs [url]   (Server mit gzip, z. B. auf 127.0.0.1:4823)
// 1. WebKit iPhone 15 Pro: 300-px-Schritte OHNE Warten, dann Ablauf Station für Station, dann schnelle Sprünge
// 2. Gesamthöhe 390 px mit erzwungener content-visibility, seitlicher Überlauf, Konsole
// 3. Ohne JavaScript, reduzierte Bewegung: alles sichtbar (kein Text mit opacity 0 / visibility hidden)
// 4. Schriftgrößen < 14 px in Fließtext
// 5. 1440 px Chromium + WebKit
// 6. Finale Bilder v3-390-*.png, v3-1440-*.png
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire('/Users/domi/Marketing-Maschine/');
const { webkit, chromium, devices } = require('playwright');
const url = process.argv[2] || 'http://127.0.0.1:4823/';
const out = path.dirname(new URL(import.meta.url).pathname);
const iphone = devices['iPhone 15 Pro'];
const bericht = {};
const shot = (p, name) => p.screenshot({ path: `${out}/${name}.png` });
const frames = (p, n = 2) => p.evaluate(n => new Promise(r => { const f = k => k ? requestAnimationFrame(() => f(k - 1)) : r(); f(n); }), n);

async function seite(b, opts, extra = {}) {
  const c = await b.newContext({ ...opts, ...extra }); const p = await c.newPage();
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
  return { scrollW: document.documentElement.scrollWidth, clientW: w, raus: raus.slice(0, 8) };
});
const kleineSchrift = (p) => p.evaluate(() => {
  const r = [];
  document.querySelectorAll('p, li, dd, dt, summary, a, span, h3').forEach(el => {
    if (el.closest('[data-ui], .chips, .skip, .foot-nav, svg')) return;
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 2);
    if (!own) return;
    const cs = getComputedStyle(el), b = el.getBoundingClientRect();
    if (!b.width || cs.visibility === 'hidden' || cs.display === 'none') return;
    if (parseFloat(cs.fontSize) < 14) r.push(`${el.tagName.toLowerCase()}.${el.className} ${cs.fontSize} „${el.textContent.trim().slice(0, 40)}“`);
  });
  return r.slice(0, 20);
});
const unsichtbarerText = (p) => p.evaluate(() => {
  const r = [];
  document.querySelectorAll('main h1, main h2, main h3, main p, main li, main dt, main dd, main summary').forEach(el => {
    if (el.closest('.stage')) return;
    let e = el, hidden = false;
    while (e && e !== document.body) { const cs = getComputedStyle(e); if (parseFloat(cs.opacity) < 0.05 || cs.visibility === 'hidden') { hidden = true; break; } e = e.parentElement; }
    const b = el.getBoundingClientRect();
    if (hidden || (!b.width && !el.closest('details:not([open])') && !el.closest('.story-live .station'))) r.push(el.tagName + ' ' + el.textContent.trim().slice(0, 40));
  });
  return r.slice(0, 10);
});

// ---------- 1 · Handy (WebKit, iPhone 15 Pro) ----------
{
  const b = await webkit.launch();
  const { p, fehler } = await seite(b, iphone);
  // Kopfbereich im Zeitverlauf
  await p.evaluate(() => scrollTo(0, 0));
  for (const t of [300, 1200, 2200]) { await p.waitForTimeout(t === 300 ? 300 : t - 300); }
  await shot(p, 'v3-390-oben');
  const H = await p.evaluate(() => document.documentElement.scrollHeight), vh = await p.evaluate(() => innerHeight);
  let i = 0;
  for (let y = 0; y < H - vh + 300; y += 300) { await p.evaluate(y => scrollTo(0, y), y); await shot(p, `v3-handy-langsam-${String(i++).padStart(2, '0')}`); }
  // Ablauf: bündig ausrichten, dann je Station
  const top = await p.evaluate(() => document.querySelector('.story-scroller').getBoundingClientRect().top + scrollY);
  await p.evaluate(y => scrollTo(0, y), top); await p.waitForTimeout(700);
  const info = await p.evaluate(() => { const sc = document.querySelector('.story-scroller'); return { max: sc.scrollHeight - sc.clientHeight, step: document.querySelector('.station').offsetHeight, ch: sc.clientHeight, ih: innerHeight, ov: getComputedStyle(sc).overflowY }; });
  bericht.ablauf = info;
  const stationen = [];
  for (let s = 0; s < 6; s++) {
    await p.evaluate(y => document.querySelector('.story-scroller').scrollTo(0, y), s * info.step);
    await p.waitForTimeout(80); await p.evaluate(y => scrollTo(0, y), top);
    await p.waitForTimeout(1300);
    stationen.push(await p.evaluate(() => {
      const on = document.querySelector('.st-cur .on'), img = document.querySelector('.screen .lay.on img');
      return { titel: on && on.textContent, bild: img && img.complete && img.naturalWidth > 0, chips: [...document.querySelectorAll('.st-chips .chip')].map(c => c.className.replace('chip ', '') + ':' + c.textContent).join(' | ') };
    }));
    await shot(p, `v3-handy-station-${s + 1}`);
  }
  bericht.stationen = stationen;
  // schnelle Sprünge: von oben direkt in den Ablauf, dann darüber hinaus und zurück, ohne Warten
  const schnell = [];
  for (const [k, y] of [[0, 0], [1, top], [2, top + 1800], [3, top], [4, H]]) {
    await p.evaluate(y => scrollTo(0, y), y); await frames(p, 2);
    schnell.push(await p.evaluate(() => ({ y: scrollY, bilder: [...document.querySelectorAll('.screen img')].filter(i => i.complete && i.naturalWidth).length })));
    await shot(p, `v3-handy-schnell-${k}`);
  }
  bericht.schnell = schnell;
  // Preise
  await p.evaluate(() => document.querySelector('#preise').scrollIntoView()); await p.waitForTimeout(900);
  await shot(p, 'v3-390-preise');
  bericht.handy = { seitenhoehe: H, viewport: vh, ueberlauf: await ueberlauf(p), kleineSchrift: await kleineSchrift(p), fehler };
  await b.close();
}

// Finale Ablauf-Bilder 390: frische Seite, bündig, Station 1 und Station 3 (Anzahlung anfordern) mitten im Tintenwechsel und danach
{
  const b = await webkit.launch();
  const { p } = await seite(b, iphone);
  const top = await p.evaluate(() => document.querySelector('.story-scroller').getBoundingClientRect().top + scrollY);
  await p.evaluate(y => scrollTo(0, y), top); await p.waitForTimeout(1500);
  await p.evaluate(y => scrollTo(0, y), top); await p.waitForTimeout(300);
  await shot(p, 'v3-390-geschichte-1');
  const step = await p.evaluate(() => document.querySelector('.station').offsetHeight);
  await p.evaluate(y => document.querySelector('.story-scroller').scrollTo(0, y), step * 3);
  await p.waitForTimeout(80); await p.evaluate(y => scrollTo(0, y), top); await p.waitForTimeout(1400);
  await shot(p, 'v3-390-geschichte-2');
  await b.close();
}

// ---------- 2 · Gesamthöhe mit erzwungener content-visibility ----------
{
  const b = await webkit.launch();
  const { p } = await seite(b, iphone);
  await p.addStyleTag({ content: '*{content-visibility:visible!important;contain-intrinsic-size:none!important}' });
  await p.waitForTimeout(400);
  bericht.hoehe390 = await p.evaluate(() => {
    const sc = document.querySelector('.story-scroller');
    const strecke = document.querySelector('.story.is-nested') ? sc.scrollHeight - sc.clientHeight : 0;
    return { seite: document.documentElement.scrollHeight, ablaufStrecke: strecke, gesamt: document.documentElement.scrollHeight + strecke };
  });
  await b.close();
}

// ---------- 3 · Ohne JavaScript / reduzierte Bewegung ----------
for (const [name, extra] of [['ohneJs', { javaScriptEnabled: false }], ['reduziert', { reducedMotion: 'reduce' }]]) {
  const b = await webkit.launch();
  const { p, fehler } = await seite(b, iphone, extra);
  await p.waitForTimeout(600);
  bericht[name] = { hoehe: await p.evaluate(() => document.documentElement.scrollHeight), ueberlauf: await ueberlauf(p), unsichtbar: await unsichtbarerText(p), fehler, story: await p.evaluate(() => document.querySelector('.story').className) };
  await p.screenshot({ path: `${out}/v3-${name}-voll.png`, fullPage: true });
  await b.close();
}

// ---------- 4 · Desktop 1440 ----------
for (const [eng, bt] of [['chromium', chromium], ['webkit', webkit]]) {
  const b = await bt.launch();
  const { p, fehler } = await seite(b, { viewport: { width: 1440, height: 900 } });
  await p.waitForTimeout(2300);
  if (eng === 'chromium') await shot(p, 'v3-1440-oben');
  const top = await p.evaluate(() => document.querySelector('.story-scroller').getBoundingClientRect().top + scrollY);
  const step = await p.evaluate(() => document.querySelector('.station').offsetHeight);
  await p.evaluate(y => scrollTo(0, y), top + step * 2); await p.waitForTimeout(1600);
  if (eng === 'chromium') await shot(p, 'v3-1440-geschichte');
  else await shot(p, 'v3-1440-geschichte-webkit');
  bericht['desktop-' + eng] = { seitenhoehe: await p.evaluate(() => document.documentElement.scrollHeight), ueberlauf: await ueberlauf(p), kleineSchrift: await kleineSchrift(p), fehler };
  await b.close();
}

fs.writeFileSync(`${out}/v3-bericht.json`, JSON.stringify(bericht, null, 2));
console.log(JSON.stringify(bericht, null, 2));
