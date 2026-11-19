// Kontrast von Text über der WebGL-Tinte (axe sieht die Leinwand nicht): Text unsichtbar machen, Hintergrund hinter jedem Textblock
// in WebKit fotografieren, hellsten Hintergrundpunkt suchen, Kontrast zur Textfarbe rechnen. Auch nach Scrollen (Tinte blutet aus).
import { createRequire } from 'node:module';
const require = createRequire('/Users/domi/Marketing-Maschine/');
const { webkit, devices } = require('playwright');
const url = process.argv[2] || 'http://127.0.0.1:4823/';
const b = await webkit.launch();
for (const [name, opts] of [['390', devices['iPhone 15 Pro']], ['1440', { viewport: { width: 1440, height: 900 } }]]) {
  const p = await (await b.newContext(opts)).newPage();
  await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(2600);
  for (const sy of [0, 120]) {
    await p.evaluate(y => scrollTo(0, y), sy); await p.waitForTimeout(400);
    const boxes = await p.evaluate(() => [...document.querySelectorAll('.hero h1, .hero .lead, .hero-note')].map(el => {
      const r = el.getBoundingClientRect(); const c = getComputedStyle(el).color; return { sel: el.className || el.tagName, x: r.left, y: r.top, w: r.width, h: r.height, c };
    }));
    await p.addStyleTag({ content: '.hero-copy, .hero-copy *{color:transparent!important;text-shadow:none!important} .hero .btn{visibility:hidden}' });
    await p.waitForTimeout(100);
    const png = await p.screenshot();
    await p.evaluate(() => document.querySelectorAll('style').forEach((s, i, a) => { if (i === a.length - 1) s.remove(); }));
    const res = await p.evaluate(async ([b64, boxes]) => {
      const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode();
      const k = im.naturalWidth / innerWidth;
      const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0);
      const L = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      const lum = (r, g, b) => 0.2126 * L(r) + 0.7152 * L(g) + 0.0722 * L(b);
      return boxes.map(bx => {
        const d = x.getImageData(bx.x * k, bx.y * k, Math.max(1, bx.w * k), Math.max(1, bx.h * k)).data; let max = 0;
        for (let i = 0; i < d.length; i += 4) max = Math.max(max, lum(d[i], d[i + 1], d[i + 2]));
        const m = bx.c.match(/\d+/g).map(Number); const lf = lum(m[0], m[1], m[2]);
        return bx.sel + ': hellster Hintergrund ' + max.toFixed(3) + ', Kontrast mind. ' + ((lf + 0.05) / (max + 0.05)).toFixed(1) + ':1';
      });
    }, [png.toString('base64'), boxes]);
    console.log(name, 'scrollY', sy, res);
  }
}
await b.close();
