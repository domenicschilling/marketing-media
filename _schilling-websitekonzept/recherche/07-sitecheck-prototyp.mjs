// Prototyp: prüft einen statischen Ordner (alle HTML-Seiten). Nur lesen, kein Netz.
import { chromium } from '/Users/domi/Marketing-Maschine/node_modules/playwright/index.mjs';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
const root = resolve(process.argv[2]);
const must = (process.argv[3]||'impressum,datenschutz').split(',');
const walk = d => readdirSync(d).flatMap(f => { const p = join(d,f); return statSync(p).isDirectory()? walk(p):[p]; });
const pages = walk(root).filter(f => f.endsWith('.html'));
const b = await chromium.launch(); const issues = []; const titles = {}, descs = {};
for (const f of pages) {
  const rel = relative(root, f); const pg = await b.newPage();
  await pg.goto('file://'+f); 
  const d = await pg.evaluate(() => ({
    title: document.title.trim(), desc: document.querySelector('meta[name=description]')?.content?.trim()||'',
    h1: document.querySelectorAll('h1').length, lang: document.documentElement.lang,
    canon: !!document.querySelector('link[rel=canonical]'), og: !!document.querySelector('meta[property="og:image"]'),
    noalt: [...document.images].filter(i=>!i.hasAttribute('alt')).length,
    links: [...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')),
    ids: [...document.querySelectorAll('[id]')].map(e=>e.id),
    text: document.body.innerText }));
  const add = (k,m)=>issues.push(`${rel}: ${k} ${m||''}`);
  if(!d.title) add('TITEL fehlt'); (titles[d.title] ||= []).push(rel);
  if(!d.desc) add('META-BESCHREIBUNG fehlt'); else (descs[d.desc] ||= []).push(rel);
  if(d.h1!==1) add('H1-Anzahl', d.h1); if(!d.lang) add('lang fehlt'); if(!d.noalt===false) add('Bilder ohne alt', d.noalt);
  if(!d.canon) add('canonical fehlt'); if(!d.og) add('og:image fehlt');
  for (const h of d.links) {
    if (/^(https?:|mailto:|tel:|javascript:|wa\.me)/.test(h)) continue;
    const [path, frag] = h.split('#'); let t = path? resolve(path.startsWith('/')? root+path : dirname(f)+'/'+path) : f;
    if (existsSync(t) && statSync(t).isDirectory()) t = join(t,'index.html');
    if (!existsSync(t)) { add('KAPUTTER LINK', h); continue; }
    if (frag && t===f && !d.ids.includes(frag)) add('Anker fehlt', h);
  }
  d._pflicht = must.filter(m => !d.links.some(l => l.toLowerCase().includes(m)));
  if (d._pflicht.length) add('Pflichtlink fehlt', d._pflicht.join('+'));
  if (/lorem ipsum|platzhalter|TODO|XXX/i.test(d.text)) add('PLATZHALTERTEXT');
  await pg.close();
}
for (const [t,l] of Object.entries(titles)) if (l.length>1) issues.push(`DOPPELTER TITEL "${t}": ${l.join(', ')}`);
for (const [t,l] of Object.entries(descs)) if (l.length>1) issues.push(`DOPPELTE BESCHREIBUNG: ${l.join(', ')}`);
await b.close();
console.log(`${pages.length} Seiten, ${issues.length} Befunde`); console.log(issues.slice(0,40).join('\n'));
process.exit(issues.length?1:0);
