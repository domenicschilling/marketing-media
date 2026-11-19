import {chromium} from '/Users/domi/Marketing-Maschine/node_modules/playwright/index.mjs';
import fs from 'fs';import path from 'path';import {fileURLToPath} from 'url';
const here=path.dirname(fileURLToPath(import.meta.url));const url='file://'+path.join(here,'..','index.html');
const axe=fs.readFileSync('/Users/domi/Marketing-Maschine/node_modules/axe-core/axe.min.js','utf8');
const out=path.join(here,'shots');fs.mkdirSync(out,{recursive:true});
const b=await chromium.launch();
for(const [w,h] of [[390,844],[768,1024],[1440,900]]){
  const c=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:w<500?2:1,hasTouch:w<500,isMobile:w<500});
  const p=await c.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/ERR_FILE_NOT_FOUND/.test(m.text()))errs.push(m.text())});
  await p.goto(url);await p.waitForTimeout(2300);
  await p.screenshot({path:`${out}/${w}-erst.png`});
  const dim=await p.evaluate(()=>({sh:document.documentElement.scrollHeight,sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth}));
  // jedes Bereichsbild
  const ids=['rose','herz','dolch','anker','diamant','mond','daumen'];
  for(const id of ids){await p.evaluate(i=>{document.documentElement.style.scrollBehavior='auto';document.getElementById(i).scrollIntoView()},id);await p.waitForTimeout(900);await p.screenshot({path:`${out}/${w}-${id}.png`});}
  // lange Seite: Fixed-Arm stört Vollbild, trotzdem speichern
  await p.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight));await p.waitForTimeout(800);await p.screenshot({path:`${out}/${w}-ende.png`});
  await p.evaluate(()=>window.scrollTo(0,0));await p.waitForTimeout(300);await p.screenshot({path:`${out}/${w}-ganz.png`,fullPage:true});
  await p.addScriptTag({content:axe});
  const res=await p.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'rule',values:['color-contrast','label','button-name','link-name','image-alt']}});return {v:r.violations.map(v=>({id:v.id,n:v.nodes.length,t:v.nodes.slice(0,4).map(x=>x.target.join(' ')+' :: '+(x.any[0]?.message||''))})),inc:r.incomplete.map(v=>({id:v.id,n:v.nodes.length}))}});
  await p.evaluate(()=>{document.querySelectorAll('details').forEach(d=>d.open=true)});
  await p.evaluate(()=>{window.scrollTo(0,document.getElementById('mond').offsetTop)});await p.waitForTimeout(300);await p.screenshot({path:`${out}/${w}-fragen-offen.png`});
  const res2=await p.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'rule',values:['color-contrast']}});return r.violations.map(v=>({id:v.id,n:v.nodes.length}))});
  console.log(w,JSON.stringify(dim),'axe',JSON.stringify(res),'axe-offen',JSON.stringify(res2),'errs',errs);
  await c.close();
}
await b.close();
