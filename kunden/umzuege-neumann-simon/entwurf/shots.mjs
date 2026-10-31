// Bildschirmfotos der Entwürfe → ../assets/
import { chromium } from '../../../../node_modules/playwright/index.mjs';
import path from 'node:path'; import { fileURLToPath } from 'node:url';
const D = path.dirname(fileURLToPath(import.meta.url)); const A = path.join(D, '..', 'assets');
const b = await chromium.launch();
const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
let p = await c.newPage();
await p.goto('file://' + D + '/rechner.html', { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: A + '/entwurf-rechner.png' });
await p.goto('file://' + D + '/index.html', { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: A + '/entwurf-handy.png' });
await p.goto('file://' + D + '/rechner.html', { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: A + '/entwurf-rechner.png' });
p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
await p.goto('file://' + D + '/index.html', { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: A + '/entwurf-desktop.png', fullPage: true });
await b.close();
