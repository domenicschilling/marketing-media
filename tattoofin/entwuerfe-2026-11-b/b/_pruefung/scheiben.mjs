// Zerlegt ganze Screenshots in Scheiben zum Ansehen: node scheiben.mjs <name> <hoehe> <zielordner>
import { chromium } from '/Users/domi/Marketing-Maschine/node_modules/playwright/index.mjs';
import fs from 'fs';import path from 'path';import { fileURLToPath } from 'url';
const hier=path.dirname(fileURLToPath(import.meta.url));
const [,,name,hoehe,ziel]=process.argv;const H=+hoehe;
const d=fs.readFileSync(path.join(hier,'bilder',name+'-ganz.png')).toString('base64');
const b=await chromium.launch();const p=await b.newPage();
const n=await p.evaluate(async({d,H})=>{const i=new Image();i.src='data:image/png;base64,'+d;await i.decode();window.I=i;return Math.ceil(i.height/H)},{d,H});
for(let k=0;k<n;k++){const u=await p.evaluate(({k,H})=>{const c=document.createElement('canvas');c.width=I.width;c.height=Math.min(H,I.height-k*H);c.getContext('2d').drawImage(I,0,-k*H);return c.toDataURL('image/jpeg',.82)},{k,H});fs.writeFileSync(`${ziel}/${name}-${k}.jpg`,Buffer.from(u.split(',')[1],'base64'))}
console.log(n);await b.close();
