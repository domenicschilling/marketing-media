import {chromium} from '/Users/domi/Marketing-Maschine/node_modules/playwright/index.mjs';
const url='file:///Users/domi/Marketing-Maschine/content/tattoofin/entwuerfe-2026-11-b/c/index.html';
const b=await chromium.launch();
const c=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:3});const p=await c.newPage();await p.goto(url);await p.waitForTimeout(2300);
await p.screenshot({path:process.argv[2],clip:{x:230,y:190,width:160,height:170}});
for(const id of ['diamant','herz','mond','daumen','rose']){const r=await p.locator(`.stelle[href="#${id}"]`).boundingBox();await p.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);await p.waitForTimeout(1400);
 const d=await p.evaluate(i=>({top:Math.round(document.getElementById(i).getBoundingClientRect().top),cur:document.querySelector('.stelle[aria-current]')?.getAttribute('href'),fertig:document.querySelectorAll('.stelle.fertig').length,y:Math.round(scrollY)}),id);console.log(id,JSON.stringify(d));}
// Schritte
await p.evaluate(()=>document.getElementById('herz').scrollIntoView());await p.waitForTimeout(900);
for(const n of [1,2,0]){await p.locator('.taste').nth(n).tap();await p.waitForTimeout(150);console.log('schritt',n,await p.evaluate(()=>[...document.querySelectorAll('.schritt')].map(s=>s.hidden)));if(n==2||n==1)await p.screenshot({path:process.argv[2].replace('.png','-s'+n+'.png'),scale:'css'})}
// Fragen
await p.locator('summary').nth(0).tap();await p.waitForTimeout(100);console.log('offen',await p.evaluate(()=>document.querySelector('details').open));
// ohne JS
const c2=await b.newContext({viewport:{width:390,height:844},javaScriptEnabled:false});const q=await c2.newPage();await q.goto(url);await q.waitForTimeout(400);await q.screenshot({path:process.argv[2].replace('.png','-nojs.png'),fullPage:false});
// reduzierte Bewegung
const c3=await b.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});const r=await c3.newPage();await r.goto(url);console.log('reduce',await r.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior));
await b.close();
