import {chromium} from '/Users/domi/Marketing-Maschine/node_modules/playwright/index.mjs';
import fs from 'fs';
const axe=fs.readFileSync('/Users/domi/Marketing-Maschine/node_modules/axe-core/axe.min.js','utf8');
const b=await chromium.launch();const url='file:///Users/domi/Marketing-Maschine/content/tattoofin/entwuerfe-2026-11-b/c/index.html';
for(const [w,h] of [[390,844],[1440,900]]){const p=await b.newPage({viewport:{width:w,height:h}});await p.goto(url);await p.waitForTimeout(600);await p.addScriptTag({content:axe});
const r=await p.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'rule',values:['color-contrast']}});return r.incomplete.flatMap(v=>v.nodes.map(n=>n.target.join(' ').slice(0,60)+' :: '+(n.any[0]?.data?.messageKey||n.any[0]?.message||'').slice(0,50)))});console.log(w,r.join('\n'));await p.close()}
// kleine Handys: Pflichtsatz und Knopf im ersten Bildschirm?
for(const [w,h] of [[390,664],[360,640],[320,568]]){const p=await b.newPage({viewport:{width:w,height:h}});await p.goto(url);await p.waitForTimeout(500);
const d=await p.evaluate(()=>{const q=s=>document.querySelector(s).getBoundingClientRect();const st=[...document.querySelectorAll('.stelle')].map(e=>e.getBoundingClientRect());let ol=0;for(let i=1;i<st.length;i++){if(st[i].top<st[i-1].bottom-1)ol++}return {pflichtEnde:Math.round(q('.kopftext .pflicht').bottom),knopfEnde:Math.round(q('.kopftext .knopf').bottom),h1r:Math.round(q('h1').right),sw:document.documentElement.scrollWidth,ueberlapp:ol,sh:document.documentElement.scrollHeight}});console.log(w,h,JSON.stringify(d));await p.screenshot({path:`/Users/domi/Marketing-Maschine/content/tattoofin/entwuerfe-2026-11-b/c/_pruefung/shots/klein-${w}.png`});await p.close()}
await b.close();
