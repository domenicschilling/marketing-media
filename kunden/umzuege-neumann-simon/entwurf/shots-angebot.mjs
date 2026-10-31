// Bildschirmfotos für das schriftliche Angebot → ../assets/
import { chromium } from '../../../../node_modules/playwright/index.mjs';
import path from 'node:path'; import { fileURLToPath } from 'node:url';
const D = path.dirname(fileURLToPath(import.meta.url)); const A = path.join(D, '..', 'assets');
const b = await chromium.launch();
async function shot(file, out, vp, opts = {}) {
  const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: opts.dpr || 2, isMobile: !!opts.mobile, hasTouch: !!opts.mobile });
  const p = await ctx.newPage();
  await p.goto('file://' + D + '/' + file, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: A + '/' + out, fullPage: !!opts.full }); await ctx.close();
}
await shot('simon.html', 'simon-entwurf-desktop.png', { width: 1440, height: 900 }, { full: true, dpr: 1.5 });
await shot('simon.html', 'simon-entwurf-handy.png', { width: 390, height: 844 }, { mobile: true, dpr: 3 });
await shot('tablet.html', 'angebotsprogramm-tablet.png', { width: 1180, height: 820 });
await shot('angebot-pdf.html', 'angebotsprogramm-pdf.png', { width: 794, height: 1123 });
await shot('google-profil.html', 'google-profil-neumann.png', { width: 390, height: 844 }, { dpr: 3 });
await b.close();
