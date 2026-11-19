import {chromium} from '/Users/domi/Marketing-Maschine/node_modules/playwright/index.mjs';
import path from 'path';import fs from 'fs';import {fileURLToPath} from 'url';
const here=path.dirname(fileURLToPath(import.meta.url));
const [,,out,scale,...files]=process.argv;
const html=`<!doctype html><body style="margin:0;background:#888;display:flex;gap:8px;flex-wrap:wrap;width:fit-content;max-width:1500px">`+files.map(f=>`<img src="shots/${f}.png" style="height:${scale}px">`).join('');
fs.writeFileSync(here+'/mont.html',html);
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1500,height:800}});
await p.goto('file://'+here+'/mont.html');await p.waitForTimeout(500);
await p.screenshot({path:out,fullPage:true});await b.close();
