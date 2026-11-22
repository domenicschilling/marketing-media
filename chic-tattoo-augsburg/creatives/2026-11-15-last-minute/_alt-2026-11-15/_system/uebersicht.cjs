const path=require('path');const { chromium } = require('/Users/domi/Marketing-Maschine/node_modules/playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:2360,height:1000},deviceScaleFactor:1});
await p.goto('file://'+path.join(__dirname,'uebersicht.html'));await p.waitForFunction(()=>document.documentElement.dataset.ready==='1');await p.evaluate(()=>document.fonts.ready);
const el=await p.$('.sheet');await el.screenshot({path:path.join(__dirname,'..','uebersicht.jpg'),type:'jpeg',quality:90});await b.close()})();
