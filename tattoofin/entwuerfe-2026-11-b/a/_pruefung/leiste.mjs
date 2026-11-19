// Testet Leiste, Tastatur, Links, Abzüge, ruhige Bewegung, ohne JS.
import { chromium } from '/Users/domi/Marketing-Maschine/node_modules/playwright/index.mjs';
const root = new URL('..', import.meta.url).pathname; const url='file://'+root+'index.html'; const S=root+'_pruefung/shots/';
const b=await chromium.launch();
const zu=async(p,sel,block='center')=>{await p.evaluate(([s,bl])=>document.querySelector(s).scrollIntoView({block:bl,behavior:'instant'}),[sel,block]);await p.waitForTimeout(450)};
const leiste=p=>p.evaluate(()=>{const l=document.getElementById('leiste'),c=getComputedStyle(l);return {da:l.classList.contains('da'),sicht:c.visibility,display:c.display}});
let c=await b.newContext({viewport:{width:390,height:844}});let p=await c.newPage();await p.goto(url);await p.waitForTimeout(800);
const o={};
o.start=await leiste(p);
await zu(p,'#nr1 h2');o.nachHero=await leiste(p);await p.screenshot({path:S+'leiste-390.png'});
await zu(p,'.einwaende');o.einwaende=await leiste(p);await p.screenshot({path:S+'390-einwaende.png'});
await zu(p,'#nr4');await p.waitForTimeout(1100);await p.screenshot({path:S+'390-nr4.png'});
await zu(p,'#preis','start');o.preisAnfang=await leiste(p);await p.screenshot({path:S+'390-preis1.png'});
await zu(p,'.preis .wege','end');o.preisEnde=await leiste(p);await p.screenshot({path:S+'390-preis2.png'});
await zu(p,'#fragen','start');o.fragen=await leiste(p);
await p.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await p.waitForTimeout(500);o.ende=await leiste(p);await p.screenshot({path:S+'schluss-390.png'});
// Tastatur: wenn sichtbar, erreicht Tab die Leiste?
await zu(p,'#nr2');o.vorTab=await leiste(p);
await p.evaluate(()=>document.querySelector('.fuss nav a:last-child').focus());
await p.keyboard.press('Tab');o.tab1=await p.evaluate(()=>document.activeElement.className+'|'+document.activeElement.getAttribute('href'));
await p.keyboard.press('Tab');o.tab2=await p.evaluate(()=>document.activeElement.className+'|'+(document.activeElement.getAttribute('aria-label')||''));
// Links
o.links=await p.evaluate(()=>{const m={};document.querySelectorAll('a[href]').forEach(a=>{const h=a.getAttribute('href');m[h]=(m[h]||0)+1});return m});
o.hash=await p.evaluate(()=>[...document.querySelectorAll('a[href^="#"]')].filter(a=>!document.querySelector(a.getAttribute('href'))).length);
o.waTexte=await p.evaluate(()=>[...document.querySelectorAll('a.wa')].map(a=>a.textContent));
o.waDecoded=await p.evaluate(()=>decodeURIComponent(document.querySelector('a.wa').href.split('text=')[1]));
// Nummern und Abzug
await p.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await p.waitForTimeout(300);await p.locator('.fl-2').click();await p.waitForTimeout(900);o.nrZiel=await p.evaluate(()=>Math.round(document.querySelector('#nr2').getBoundingClientRect().top));
await p.locator('#nr2 [data-abzug]').click();await p.waitForTimeout(400);o.abzugOffen=await p.locator('#nr2 [data-abzug]').getAttribute('aria-expanded');await p.screenshot({path:S+'abzug-offen.png'});
await p.locator('#nr2 [data-abzug]').click();
await zu(p,'.frage');await p.locator('.frage summary').first().click();await p.waitForTimeout(300);o.frageOffen=await p.locator('.frage').first().evaluate(d=>d.open);
await c.close();
// Ruhig
c=await b.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});p=await c.newPage();await p.goto(url);await p.waitForTimeout(300);o.ruhigSchablonen=await p.locator('.schablone').count();await zu(p,'#nr1 h2');o.ruhigLeiste=await leiste(p);o.ruhigTrans=await p.evaluate(()=>getComputedStyle(document.getElementById('leiste')).transitionDuration);await c.close();
// Ohne JS
c=await b.newContext({viewport:{width:390,height:844},javaScriptEnabled:false});p=await c.newPage();await p.goto(url);await p.waitForTimeout(300);await p.screenshot({path:S+'ohne-js.png'});await c.close();
// Desktop: Leiste aus
c=await b.newContext({viewport:{width:1440,height:900}});p=await c.newPage();await p.goto(url);await zu(p,'#nr2');o.desktopLeiste=await leiste(p);await p.evaluate(()=>scrollTo({top:document.documentElement.scrollHeight,behavior:'instant'}));await p.waitForTimeout(600);await p.screenshot({path:S+'schluss-1440.png'});await c.close();
// 360x640: was ist im ersten Bildschirm?
c=await b.newContext({viewport:{width:360,height:640}});p=await c.newPage();await p.goto(url);await p.waitForTimeout(2700);await p.screenshot({path:S+'360-erster.png'});
o.b360=await p.evaluate(()=>{const f=s=>{const r=document.querySelector(s).getBoundingClientRect();return {oben:Math.round(r.top),unten:Math.round(r.bottom),ganz:r.bottom<=innerHeight}};return {h1:f('h1'),satz:f('.satz'),pflicht:f('.auftakt .pflicht'),knopf:f('.auftakt .knopf'),preis:f('.preiszeile'),wa:f('.auftakt .wa'),leiste:document.getElementById('leiste').classList.contains('da')}});
await c.close();
await b.close();console.log(JSON.stringify(o,null,0));
