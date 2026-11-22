import {chromium} from '/Users/domi/Marketing-Maschine/node_modules/playwright/index.mjs';
const [,,f,out,w='1500',h='760']=process.argv;
const b=await chromium.launch();const p=await b.newPage({viewport:{width:+w,height:+h}});await p.goto('file://'+f);await p.waitForTimeout(400);await p.screenshot({path:out});await b.close();
