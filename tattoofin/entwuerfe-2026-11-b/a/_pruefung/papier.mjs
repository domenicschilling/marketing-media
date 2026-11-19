import {chromium} from '/Users/domi/Marketing-Maschine/node_modules/playwright/index.mjs';
const out=process.argv[2];
const b=await chromium.launch();const p=await b.newPage({viewport:{width:640,height:640}});
await p.setContent(`<!doctype html><body style="margin:0;background:#f6ecd6"><svg width="640" height="640" xmlns="http://www.w3.org/2000/svg" style="display:block">
<filter id="g" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" seed="4" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .42  0 0 0 0 .30  0 0 0 0 .12  0 0 0 .34 -.13"/></filter>
<filter id="w" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".03 .05" numOctaves="4" seed="9" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .55  0 0 0 0 .40  0 0 0 0 .16  0 0 0 .14 -.055"/></filter>
<filter id="f" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".006" numOctaves="3" seed="21" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .78  0 0 0 0 .58  0 0 0 0 .22  0 0 0 .3 -.12"/></filter>
<rect width="640" height="640" filter="url(#f)"/><rect width="640" height="640" filter="url(#w)"/><rect width="640" height="640" filter="url(#g)"/></svg>`);
await p.screenshot({path:out});await b.close();
