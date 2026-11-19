import {chromium} from '/Users/domi/Marketing-Maschine/node_modules/playwright/index.mjs';
import * as M from './motive.mjs';
import fs from 'fs';
const dir=new URL('..',import.meta.url).pathname;
const html=`<!doctype html><meta charset=utf-8><style>@font-face{font-family:'Luckiest Guy';src:url(assets/fonts/LuckiestGuy.woff2)}
body{margin:0;background:#f5ebd4;display:grid;grid-template-columns:repeat(3,1fr);gap:20px;padding:20px;width:1400px;font-family:'Luckiest Guy';color:#1f3d5c}
svg.motiv{width:100%;height:auto;display:block;overflow:visible}</style>${M.DEFS}
${[M.herz,M.schwalbe,M.anker,M.ass,M.rose].map(m=>`<div>${M.svg(m)}</div>`).join('')}
<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><div style="width:90px">${M.svg(M.sternMotiv)}</div><div style="width:80px">${M.svg(M.mond)}</div><div style="width:100px">${M.svg(M.diamant)}</div><div style="width:70px">${M.svg(M.blitz)}</div><div style="font-size:40px;width:100%">RATEN* FÜR ÄÖ GROSS ß € 49 % + , . ? ! 1 2 3 4 5 Nr.</div></div>`;
fs.writeFileSync(dir+'_pruefung/_kontakt.html',html);
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1440,height:1000}});
await p.goto('file://'+dir+'_pruefung/_kontakt.html');await p.waitForTimeout(600);await p.screenshot({path:dir+'_pruefung/shots/kontakt.png',fullPage:true});await b.close();
