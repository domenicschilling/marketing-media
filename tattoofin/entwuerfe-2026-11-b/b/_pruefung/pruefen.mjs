// Kontrolle Entwurf B: Screenshots, axe, Überlauf, Seitenhöhe, Wort-Scan. Nur lokal.
import { chromium } from '/Users/domi/Marketing-Maschine/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const hier = path.dirname(fileURLToPath(import.meta.url));
const seite = 'file://' + path.join(hier, '..', 'index.html');
const axe = fs.readFileSync('/Users/domi/Marketing-Maschine/node_modules/axe-core/axe.min.js', 'utf8');
const ziel = path.join(hier, 'bilder');
const groessen = [[390, 844], [768, 1024], [1440, 900], [390, 664], [360, 640], [1024, 768]];
const b = await chromium.launch();
const gesamt = {};
for (const [w, h] of groessen) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w < 500 ? 2 : 1 });
  const p = await ctx.newPage();
  const fehler = [];
  p.on('pageerror', e => fehler.push('JS: ' + e.message));
  p.on('requestfailed', r => fehler.push('Datei: ' + r.url()));
  await p.goto(seite);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${ziel}/${w}x${h}-erster.png` });
  // Alles laden und Röhren zünden
  await p.evaluate(async () => {
    document.querySelectorAll('img[loading=lazy]').forEach(i => i.loading = 'eager');
    document.documentElement.style.scrollBehavior='auto';
    for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 70)); }
    scrollTo(0, 0);
  });
  await p.waitForTimeout(1300);
  if (![664, 640, 768].includes(h)) await p.screenshot({ path: `${ziel}/${w}x${h}-ganz.png`, fullPage: true });
  const masse = await p.evaluate(() => ({
    hoehe: document.documentElement.scrollHeight,
    breite: document.documentElement.scrollWidth,
    fenster: innerWidth,
    ueber: [...document.querySelectorAll('body *')].filter(e => {
      if (e.closest('.sprite') || e.closest('.licht') || e.classList.contains('schein') || e.closest('svg') || e.closest('.raten-foto')) return false;
      const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1);
    }).map(e => e.tagName + '.' + e.className).slice(0, 12),
    h1Zeilen: (() => { const h = document.querySelector('h1'); return Math.round(h.getBoundingClientRect().height / parseFloat(getComputedStyle(h).lineHeight)); })(),
    h2Zeilen: [...document.querySelectorAll('h2')].map(h => h.textContent.slice(0, 24) + ':' + Math.round(h.getBoundingClientRect().height / parseFloat(getComputedStyle(h).lineHeight))),
    pflichtGroesse: [...new Set([...document.querySelectorAll('.pflicht')].map(e => getComputedStyle(e).fontSize))],
    pflichtImErsten: (() => { const r = document.querySelector('.pflicht').getBoundingClientRect(); return r.bottom <= innerHeight + 1; })(),
    knopfImErsten: (() => { const r = document.querySelector('.knopf').getBoundingClientRect(); return r.bottom <= innerHeight + 1; })(),
    kleineZiele: [...document.querySelectorAll('a,button,summary')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height < 24; }).map(e => e.textContent.trim().slice(0, 20)),
  }));
  await p.addScriptTag({ content: axe });
  await p.evaluate(() => document.querySelectorAll('details').forEach(d => d.open = true));
  const r = await p.evaluate(async () => {
    const e = await axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast', 'label', 'button-name', 'link-name', 'image-alt', 'landmark-one-main', 'heading-order', 'aria-allowed-attr', 'region'] } });
    return { verstoesse: e.violations.map(v => ({ id: v.id, n: v.nodes.length, ziele: v.nodes.slice(0, 5).map(x => x.target.join(' ') + ' | ' + (x.any[0]?.message || '')) })), unklar: e.incomplete.map(v => ({ id: v.id, n: v.nodes.length, ziele: v.nodes.slice(0, 8).map(x => x.target.join(' ')) })) };
  });
  // Zweiter axe-Lauf: Punktraster und Licht aus, dann kann axe jeden Text gegen die Fläche messen (unklare Fälle werden hart geprüft)
  const flach = await p.evaluate(async () => {
    const st = document.createElement('style');
    st.textContent = '.tattoos,.ablauf,.preis,.schluss{background-image:none!important}.licht,.schein,.glanz{display:none!important}.neon,.kabel{filter:none!important}h1,h1 .ast,.knopf,summary::after{text-shadow:none!important}';
    document.head.append(st);
    const e = await axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast'] } });
    st.remove();
    return { verstoesse: e.violations.map(v => v.nodes.map(x => x.target.join(' ') + ' | ' + (x.any[0]?.message || ''))).flat(), unklar: e.incomplete.map(v => v.nodes.map(x => x.target.join(' '))).flat() };
  });
  gesamt[`${w}x${h}`] = { ...masse, axe: r, axeFlach: flach, fehler };
  await ctx.close();
}
// Wort-Scan und Zahlen
const html = fs.readFileSync(path.join(hier, '..', 'index.html'), 'utf8').replace(/<!--.*?-->/gs, '');
const text = html.replace(/<script.*?<\/script>/gs, '').replace(/<svg.*?<\/svg>/gs, '').replace(/<[^>]*?alt="([^"]*)"[^>]*>/g, ' $1 ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const verboten = ['zins', '0 %', '0%', 'ohne schufa', 'statt zu sparen', 'sofort', 'auf einmal', 'direkt an dich', 'kreditvermittl', 'finanzier', 'risikofrei', 'einmalzahlung', '10 %', '999', 'laufzeit von', 'monatsrate', 'rate von', 'bewertung', 'testimonial', 'garant'];
const treffer = verboten.filter(v => text.toLowerCase().includes(v));
const raten = [...text.matchAll(/\bRaten\b(\*?)/g)].length;
const ohneStern = [...text.matchAll(/\bRaten\b(?!\*)/g)].map(m => text.slice(Math.max(0, m.index - 30), m.index + 30));
const zahlen = [...new Set(text.match(/\d[\d.,–]*\s?(?:€|%|Minuten|Stunden)/g))];
const satz = '*Raten über Klarna, nach deren Bonitätsprüfung. Vertragspartner der Raten ist Klarna, nicht Tattoofin. Achtung! Kreditaufnahme kostet Geld.';
const pflichtAnzahl = text.split(satz).length - 1;
console.log(JSON.stringify({ gesamt, wortScan: { treffer, ratenGesamt: raten, ohneStern, pflichtAnzahl, zahlen } }, null, 1));
await b.close();
