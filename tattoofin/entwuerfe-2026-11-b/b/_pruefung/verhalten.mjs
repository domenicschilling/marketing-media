// Prüft Tippen, Tattoo-Links, ohne Skript, reduzierte Bewegung
import { chromium } from '/Users/domi/Marketing-Maschine/node_modules/playwright/index.mjs';
import path from 'path';import { fileURLToPath } from 'url';
const hier=path.dirname(fileURLToPath(import.meta.url));const u='file://'+path.join(hier,'..','index.html');const z=path.join(hier,'bilder');
const b=await chromium.launch();
{ const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true});await p.goto(u);await p.waitForTimeout(600);
  await p.locator('#k-herz').scrollIntoViewIfNeeded();
  await p.screenshot({path:z+'/390-figur.png'});
  await p.locator('#k-herz').click();await p.waitForTimeout(1200);
  console.log('Herz springt zu',await p.evaluate(()=>[location.hash,Math.round(document.querySelector('#anzahlung').getBoundingClientRect().top)]));
  await p.locator('.ring').first().click({force:true});await p.waitForTimeout(1000);console.log('Ring Stern',await p.evaluate(()=>location.hash));
  await p.locator('.schritte button[data-schritt="3"]').scrollIntoViewIfNeeded();
  for(const n of ['1','2','3']){await p.locator(`.schritte button[data-schritt="${n}"]`).click();await p.waitForTimeout(450);
    console.log('Schritt',n,await p.evaluate(()=>[...document.querySelectorAll('.handy--wechsel img')].map(i=>i.classList.contains('an')?1:0).join('')+' '+document.querySelector('.schritte li.an .titel').textContent));
    await p.waitForTimeout(350);await p.evaluate(()=>{document.documentElement.style.scrollBehavior='auto';const r=document.querySelector('.ablauf-handy').getBoundingClientRect();scrollBy(0,r.top-20)});await p.waitForTimeout(100);await p.screenshot({path:z+`/390-schritt${n}.png`});}
  await p.locator('summary').first().scrollIntoViewIfNeeded();await p.locator('summary').first().click();await p.waitForTimeout(250);await p.screenshot({path:z+'/390-frage.png'});
  console.log('Links',await p.evaluate(()=>[...new Set([...document.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')))]));
  console.log('Fehlende Anker',await p.evaluate(()=>[...document.querySelectorAll('a[href^="#"]')].filter(a=>!document.querySelector(a.getAttribute('href'))).length));
  console.log('Cookies/Storage',await p.evaluate(()=>[document.cookie,localStorage.length]));
  console.log('Robots',await p.evaluate(()=>document.querySelector('meta[name=robots]').content));
}
{ const c=await b.newContext({viewport:{width:390,height:844},javaScriptEnabled:false});const p=await c.newPage();await p.goto(u);await p.waitForTimeout(500);await p.screenshot({path:z+'/390-ohnejs.png',fullPage:true});console.log('ohne JS ok');}
{ const c=await b.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const p=await c.newPage();await p.goto(u);await p.waitForTimeout(400);
  console.log('reduziert, laufende Animationen:',await p.evaluate(()=>document.getAnimations().length),'aus-Röhren:',await p.evaluate(()=>document.querySelectorAll('.neon.aus').length));}
await b.close();
