// Entfärbt nur bläuliche Pixel (blaues Shirt), Haut und Tinte bleiben unverändert. Reine Farbkorrektur, keine KI.
// Aufruf: node _system/entblauen.cjs img/05-loewe-spartaner.png img/05-loewe-spartaner-warm.png  (Grundlage Motiv 01 seit 16.11.)
const path=require('path'),fs=require('fs');
const { chromium } = require('/Users/domi/Marketing-Maschine/node_modules/playwright');
const [src,out]=process.argv.slice(2);
(async()=>{const b=await chromium.launch();const p=await b.newPage();
const data='data:image/png;base64,'+fs.readFileSync(src).toString('base64');
const res=await p.evaluate(async(data)=>{const img=new Image();img.src=data;await img.decode();
const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const x=c.getContext('2d');x.drawImage(img,0,0);
const d=x.getImageData(0,0,c.width,c.height),a=d.data;let n=0;
for(let i=0;i<a.length;i+=4){const r=a[i],g=a[i+1],bl=a[i+2];const blue=bl-Math.max(r,g);
 const t=Math.min(1,Math.max(0,(blue-6)/28));if(t<=0)continue;n++;
 const y=(0.299*r+0.587*g+0.114*bl)*1.08;a[i]=r+(y-r)*t;a[i+1]=g+(y-g)*t;a[i+2]=bl+(y-bl)*t;}
x.putImageData(d,0,0);return {url:c.toDataURL('image/png'),n};},data);
fs.writeFileSync(out,Buffer.from(res.url.split(',')[1],'base64'));console.log('Pixel angepasst:',res.n);await b.close();})();
