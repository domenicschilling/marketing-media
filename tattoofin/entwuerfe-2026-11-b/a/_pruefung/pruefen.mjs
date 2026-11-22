// Prüflauf: Screenshots 390/768/1440, Seitenhöhe, Querscrollen, axe-core, Textprüfung, Logo-Prüfsumme.
import { chromium } from '/Users/domi/Marketing-Maschine/node_modules/playwright/index.mjs';
import fs from 'fs';
import crypto from 'crypto';
const root = new URL('..', import.meta.url).pathname;
const axeSrc = fs.readFileSync('/Users/domi/Marketing-Maschine/node_modules/axe-core/axe.min.js', 'utf8');
const url = 'file://' + root + 'index.html';
const ansichten = [['360', 360, 640], ['390', 390, 844], ['768', 768, 1024], ['1440', 1440, 900]];
const b = await chromium.launch();
const ergebnis = {};
for (const [n, w, h] of ansichten) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: w === 390 ? 2 : 1 });
  const p = await ctx.newPage();
  const fehler = [];
  p.on('console', m => { if (m.type() === 'error') fehler.push(m.text()); });
  p.on('pageerror', e => fehler.push(String(e)));
  await p.goto(url); await p.waitForTimeout(2600);
  await p.screenshot({ path: `${root}_pruefung/shots/${n}-erster.png` });
  // Einmal durchscrollen, damit jedes Motiv gestochen ist
  const hoehe = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < hoehe; y += Math.round(h * .6)) { await p.evaluate(v => window.scrollTo({ top: v, behavior: 'instant' }), y); await p.waitForTimeout(130); }
  await p.waitForTimeout(1300);
  await p.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); await p.waitForTimeout(200);
  await p.screenshot({ path: `${root}_pruefung/shots/${n}-ganz.png`, fullPage: true });
  const mass = await p.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth, h: document.documentElement.scrollHeight,
    quer: [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 1 && !e.closest('.buehne,.motiv,.deko,svg') && getComputedStyle(e).position !== 'absolute'; }).slice(0, 5).map(e => e.tagName + '.' + e.className),
    h1: document.querySelector('h1').getBoundingClientRect().toJSON(),
    pflicht: document.querySelector('.auftakt .pflicht').getBoundingClientRect().toJSON(),
    preiszeile: document.querySelector('.preiszeile').getBoundingClientRect().toJSON(),
    knopf: document.querySelector('.auftakt .knopf').getBoundingClientRect().toJSON(),
    schrift: { pflicht: getComputedStyle(document.querySelector('.auftakt .pflicht')).fontSize, text: getComputedStyle(document.querySelector('.auftakt .satz')).fontSize },
    fonts: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family),
  }));
  await p.addStyleTag({ content: '.bogen{background-image:none!important}' });
  await p.addScriptTag({ content: axeSrc });
  const axe = await p.evaluate(async () => {
    const r = await axe.run(document, { resultTypes: ['violations', 'incomplete'] });
    return { v: r.violations.map(v => ({ id: v.id, n: v.nodes.length, t: v.nodes.slice(0, 4).map(x => x.target.join(' ') + ' :: ' + (x.any[0]?.message || '')) })), inc: r.incomplete.map(v => ({ id: v.id, n: v.nodes.length, t: v.nodes.slice(0, 3).map(x => x.target.join(' ')) })) };
  });
  ergebnis[n] = { mass, axeVerstoesse: axe.v, axeUnklar: axe.inc, fehler };
  await ctx.close();
}
// Hover/Tap-Nachweis und Bildschirm mit Abzug offen
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); await p.goto(url); await p.waitForTimeout(600);
  await p.locator('#nr2 [data-abzug]').scrollIntoViewIfNeeded(); await p.waitForTimeout(1200);
  await p.locator('#nr2 [data-abzug]').click(); await p.waitForTimeout(1300);
  await p.screenshot({ path: `${root}_pruefung/shots/390-abzug-offen.png` });
  for (const nr of ['#nr1', '#preis', '#fragen']) { await p.locator(nr).scrollIntoViewIfNeeded(); await p.waitForTimeout(1300); await p.screenshot({ path: `${root}_pruefung/shots/390-${nr.slice(1)}.png` }); }
  await ctx.close();
}
await b.close();
// Textprüfung
const seite = fs.readFileSync(root + 'index.html', 'utf8').replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<script[\s\S]*?<\/script>/g, ' ');
const txt = seite.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const verboten = ['zinsfrei', 'zinsen', 'schufa', 'statt zu sparen', 'sofort', 'auf einmal', 'direkt an dich', 'einmalzahlung', 'risikofrei', '10 %', '0 %', 'kreditvermittlung', 'finanzierung', 'laufzeit von', 'monatsrate'];
const treffer = verboten.filter(w => txt.toLowerCase().includes(w));
const raten = [...txt.matchAll(/\bRaten\b(?!\*)[^.]{0,40}/g)].map(m => m[0]);
const sha = f => crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex');
const marke = {
  logo: [sha(root + 'assets/logo.png'), sha('/Users/domi/Marketing-Maschine/brands/tattoofin/logo.png')],
  figur: [sha(root + 'assets/figur.png'), sha('/Users/domi/Marketing-Maschine/brands/tattoofin/figur.png')],
  wortmarke: [sha(root + 'assets/wortmarke.png'), sha(process.env.HOME + '/marketing-media-tf-umbau/tattoofin/website/public/assets/wortmarke.png')],
};
console.log(JSON.stringify({ ergebnis, verbotenTreffer: treffer, ratenOhneStern: raten, marke, gleich: Object.fromEntries(Object.entries(marke).map(([k, v]) => [k, v[0] === v[1]])) }, null, 1));
