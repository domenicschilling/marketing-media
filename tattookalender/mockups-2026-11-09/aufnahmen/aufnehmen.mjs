// Aufnahmen aus der echten Demo (https://tattookalender-demo.netlify.app), Look hell.
// Nur EINE Anmeldung: Sitzung liegt in state.json (Playwright storageState) und wird wiederverwendet.
// Aufruf: NODE_PATH=/Users/domi/Marketing-Maschine/node_modules node aufnehmen.mjs <state.json>
// Ausgeblendet wird nur Demo-Beiwerk: schwarzer Demo-Balken, "Demo"-Plakette, Rundgang-Hinweis, Mustervorlagen-Hinweis im Formular.
import { createRequire } from "module";
const require = createRequire("/Users/domi/Marketing-Maschine/");
const { chromium } = require("playwright");
const STATE = process.argv[2];
const OUT = new URL(".", import.meta.url).pathname;
const B = "https://tattookalender-demo.netlify.app";
const only = process.argv[3] || "";
const HIDE = `(() => {
  for (const el of document.querySelectorAll('body *')) {
    const t = (el.textContent||'').trim();
    if (el.children.length < 6 && /^Demo – alle Daten sind erfunden/.test(t) && el.getBoundingClientRect().height < 60) { let x = el; while (x.parentElement && x.parentElement.getBoundingClientRect().height < 60) x = x.parentElement; x.style.display='none'; }
    if (t === 'Demo' && el.getBoundingClientRect().width < 100) el.style.visibility='hidden';
    if (/^Hinweis: Dieses Formular ist eine Mustervorlage/.test(t) && el.getBoundingClientRect().height < 120) el.style.display='none';
    if (/^Kurzer Rundgang/.test(t) && el.getBoundingClientRect().height < 300) { let x=el; while (x.parentElement && x.parentElement.getBoundingClientRect().height < 320) x=x.parentElement; x.style.display='none'; }
  }
})()`;
const b = await chromium.launch();
async function ctxD(w,h){ return b.newContext({ storageState: STATE, viewport:{width:w,height:h}, deviceScaleFactor:2, colorScheme:"light", locale:"de-DE", timezoneId:"Europe/Berlin" }); }
async function ctxM(auth=true){ return b.newContext({ ...(auth?{storageState:STATE}:{}), viewport:{width:390,height:844}, deviceScaleFactor:3, isMobile:true, hasTouch:true, colorScheme:"light", locale:"de-DE", timezoneId:"Europe/Berlin" }); }
async function go(p,u){ await p.goto(B+u,{waitUntil:"networkidle",timeout:60000}); await p.waitForTimeout(1400); const nm=p.getByText("Nicht mehr fragen"); if (await nm.count()) { await nm.first().click().catch(()=>{}); await p.waitForTimeout(300);} await p.evaluate(HIDE); await p.waitForTimeout(300); if (/\/(login|demo)/.test(new URL(p.url()).pathname)) throw new Error("abgemeldet: "+p.url()); }
const want = n => !only || only.split(",").includes(n);
// ---- Desktop ----
let c = await ctxD(1440,900); let p = await c.newPage();
if (want("d-tom")) { await go(p,"/kalender?d=2026-11-11&v=day"); await p.screenshot({path:OUT+"d-kal-1440.png"}); await p.getByText("Tom Meier").first().click(); await p.waitForTimeout(1500); await p.evaluate(HIDE); await p.evaluate(()=>document.activeElement && document.activeElement.blur()); await p.mouse.move(2,2); await p.waitForTimeout(200); await p.screenshot({path:OUT+"d-tom-1440.png"}); const box = await p.locator('div:has(> div > h2), [role=dialog]').last().boundingBox().catch(()=>null); console.log("dlg box", box); }
if (want("d-lina")) { await go(p,"/kalender?d=2026-11-09&v=day"); await p.getByText("Lina Krüger").first().click(); await p.waitForTimeout(1500); await p.evaluate(HIDE); await p.evaluate(()=>document.activeElement && document.activeElement.blur()); await p.mouse.move(2,2); await p.waitForTimeout(200); await p.screenshot({path:OUT+"d-lina-1440.png"}); }
if (want("d-heute")) { await go(p,"/heute"); await p.screenshot({path:OUT+"d-heute-1440.png"}); }
await c.close();
c = await ctxD(1100,700); p = await c.newPage();
if (want("d-kal-1100")) { await go(p,"/kalender?d=2026-11-11&v=day"); await p.screenshot({path:OUT+"d-kal-1100.png"}); }
await c.storageState({path:STATE}); await c.close();
// ---- Handy ----
c = await ctxM(); p = await c.newPage();
if (want("m-kal")) { await go(p,"/kalender?d=2026-11-11&v=day"); await p.screenshot({path:OUT+"m-kal.png"}); }
if (want("m-tom")) { await go(p,"/kalender?d=2026-11-11&v=day"); await p.getByText("Tom Meier").first().click(); await p.waitForTimeout(1500); await p.evaluate(HIDE); await p.evaluate(()=>document.activeElement && document.activeElement.blur()); await p.mouse.move(2,2); await p.waitForTimeout(200); await p.screenshot({path:OUT+"m-tom.png"}); }
if (want("m-lina")) { await go(p,"/kalender?d=2026-11-09&v=day"); await p.getByText("Lina Krüger").first().click(); await p.waitForTimeout(1500); await p.evaluate(HIDE); await p.evaluate(()=>document.activeElement && document.activeElement.blur()); await p.mouse.move(2,2); await p.waitForTimeout(200); await p.screenshot({path:OUT+"m-lina.png"}); }
if (want("m-max")) { await go(p,"/kalender?d=2026-11-27&v=day"); await p.getByText("Lara Zimmermann").first().click(); /* Demo-Daten ändern sich: Termin mit "Anzahlung bezahlt, Einwilligung fehlt" (vorher Max Schwarz) */ await p.waitForTimeout(1500); await p.evaluate(HIDE); await p.evaluate(()=>document.activeElement && document.activeElement.blur()); await p.mouse.move(2,2); await p.waitForTimeout(200); await p.screenshot({path:OUT+"m-max.png"}); await p.getByText("Check-in",{exact:true}).first().evaluate(e=>e.scrollIntoView({block:"center"})); await p.waitForTimeout(600); await p.screenshot({path:OUT+"m-max-checkin.png"}); }
if (want("m-anfragen")) { await go(p,"/anfragen"); await p.screenshot({path:OUT+"m-anfragen.png"}); }
if (want("m-heute")) { await go(p,"/heute"); await p.screenshot({path:OUT+"m-heute.png"}); }
await c.close();
// ---- Einwilligung (Kundenseite, ohne Anmeldung), nie absenden ----
if (want("m-einw")) {
  c = await ctxM(false); p = await c.newPage();
  await p.goto(B+"/einwilligung/B7UZCPnfdnKCrr74ZeH-UHC4_lo5DmLa",{waitUntil:"networkidle"}); await p.waitForTimeout(1200); await p.evaluate(HIDE);
  await p.screenshot({path:OUT+"m-einw-1.png"});
  for (const [l,v] of [["Straße","Domstraße 12"],["PLZ","97070"],["Ort","Würzburg"]]) { const f=p.getByLabel(l,{exact:false}); if (await f.count()) await f.first().fill(v).catch(()=>{}); }
  for (let step=1; step<9; step++) {
    const neins = p.getByRole("radio",{name:/^Nein/}); for (let i=0;i<await neins.count();i++) await neins.nth(i).check({force:true}).catch(()=>{});
    const nb = p.getByRole("button",{name:/^Nein$/}); for (let i=0;i<await nb.count();i++) await nb.nth(i).click().catch(()=>{});
    const cbs = p.locator('input[type=checkbox]'); for (let i=0;i<await cbs.count();i++) await cbs.nth(i).check({force:true}).catch(()=>{});
    if (step===3) { await p.evaluate(HIDE); await p.screenshot({path:OUT+"m-einw-3.png"}); }
    await p.getByRole("button",{name:/^Weiter/}).first().click(); await p.waitForTimeout(1000);
  }
  await p.evaluate(HIDE);
  const name = p.getByLabel("Vor- und Nachname",{exact:false}); if (await name.count()) await name.first().fill("Tom Meier");
  const cv = p.locator("canvas").first(); await cv.scrollIntoViewIfNeeded(); const bb = await cv.boundingBox(); console.log("canvas", bb);
  // Unterschrift "T. Meier" als Schreibschrift-Linie nachgezeichnet (Catmull-Rom), wird NICHT abgeschickt
  const X=u=>bb.x+bb.width*(0.06+u*0.88), Y=v=>bb.y+bb.height*(0.12+v*0.76);
  const cr=(P,n=10)=>{const o=[];for(let i=0;i<P.length-1;i++){const p0=P[Math.max(0,i-1)],p1=P[i],p2=P[i+1],p3=P[Math.min(P.length-1,i+2)];for(let k=0;k<n;k++){const t=k/n,t2=t*t,t3=t2*t;o.push([0.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),0.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)]);}}o.push(P[P.length-1]);return o;};
  const strokes=[
    [[0.02,0.30],[0.14,0.22],[0.30,0.17]],
    [[0.16,0.20],[0.15,0.50],[0.12,0.84],[0.10,0.90],[0.16,0.70],[0.22,0.58],[0.26,0.62],[0.24,0.72],[0.20,0.68],[0.23,0.58],[0.29,0.60],[0.31,0.72],[0.33,0.56],[0.35,0.70],[0.37,0.55],[0.40,0.72],[0.43,0.64]],
    [[0.45,0.86],[0.49,0.40],[0.52,0.16],[0.55,0.55],[0.58,0.70],[0.61,0.30],[0.64,0.14],[0.65,0.55],[0.67,0.76],[0.70,0.62],[0.73,0.56],[0.72,0.66],[0.75,0.74],[0.78,0.58],[0.80,0.72],[0.83,0.60],[0.86,0.56],[0.85,0.68],[0.88,0.74],[0.91,0.58],[0.93,0.64],[0.98,0.52]],
    [[0.06,0.97],[0.40,0.92],[0.70,0.88],[0.97,0.82]],
  ];
  for (const st of strokes){ const pts=cr(st.map(([u,v])=>[X(u),Y(v)])); await p.mouse.move(...pts[0]); await p.mouse.down(); for (const q of pts) await p.mouse.move(q[0],q[1]); await p.mouse.up(); }
  await p.mouse.move(X(0.785),Y(0.42)); await p.mouse.down(); await p.mouse.move(X(0.79),Y(0.43)); await p.mouse.up();
  await p.waitForTimeout(400);
  await p.screenshot({path:OUT+"m-einw-9.png"});
  await p.screenshot({path:OUT+"m-einw-9-voll.png", fullPage:true});
  console.log("Absende-Knopf vorhanden, nicht gedrückt:", await p.getByRole("button",{name:/Verbindlich unterschreiben/}).count());
  await c.close();
}
await b.close();
