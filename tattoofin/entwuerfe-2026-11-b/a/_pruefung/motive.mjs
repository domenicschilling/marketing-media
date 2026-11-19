// Flash-Motive als SVG. Gezeichnet in zwei Schichtarten:
// .f = Farbfläche, .l = Kontur (pathLength=1, damit sie beim "Stechen" laufen kann), .t = Schrift.
export const NAVY = '#1f3d5c', GELB = '#fbb316', PAPIER = '#fff7e3', ORANGE = '#ef6f2b';

let zaehler = 0;
const f = (d, farbe = GELB, extra = '') => `<path class="f" fill="${farbe}" d="${d}" ${extra}/>`;
const l = (d, b = 7, extra = '') => `<path class="l" pathLength="1" fill="none" stroke="${NAVY}" stroke-width="${b}" stroke-linecap="round" stroke-linejoin="round" d="${d}" ${extra}/>`;
const fl = (d, farbe = GELB, b = 7) => f(d, farbe) + l(d, b);
const punkte = (d) => `<path class="f" fill="url(#tf-punkte)" d="${d}"/>`;

function stern(cx, cy, r, drehung = -90, innen = 0.42) {
  // Sailor-Star: fünf Zacken, jede halb gefüllt, wie der Stern auf dem Arm der Figur
  let aussen = [], rein = [];
  for (let i = 0; i < 5; i++) {
    const a = (drehung + i * 72) * Math.PI / 180, b = (drehung + 36 + i * 72) * Math.PI / 180;
    aussen.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
    rein.push([cx + r * innen * Math.cos(b), cy + r * innen * Math.sin(b)]);
  }
  const p = v => `${v[0].toFixed(1)} ${v[1].toFixed(1)}`;
  let form = 'M' + aussen.map((v, i) => p(v) + ' L' + p(rein[i])).join(' L') + ' Z';
  let halb = '';
  for (let i = 0; i < 5; i++) halb += `M${cx} ${cy} L${p(aussen[i])} L${p(rein[i])} Z `;
  return fl(form, GELB, r > 30 ? 5.5 : 4) + f(halb, NAVY);
}

function funkel(cx, cy, r) {
  const k = r * 0.16;
  const d = `M${cx} ${cy - r} Q${cx + k} ${cy - k} ${cx + r} ${cy} Q${cx + k} ${cy + k} ${cx} ${cy + r} Q${cx - k} ${cy + k} ${cx - r} ${cy} Q${cx - k} ${cy - k} ${cx} ${cy - r} Z`;
  return f(d, NAVY);
}
const tupfen = (pts, r = 5) => pts.map(([x, y]) => `<circle class="f" fill="${NAVY}" cx="${x}" cy="${y}" r="${r}"/>`).join('');

// Banderole: Band in einer sanften Kurve, gefaltete Enden.
function band({ x0, x1, y, hoehe, bogen = 34, text, groesse, ende = 44, dy = 0 }) {
  const m = (x0 + x1) / 2, h = hoehe, id = `tf-b${++zaehler}`;
  const o0 = y, u0 = y + h;
  const haupt = `M${x0} ${o0} Q${m} ${o0 + bogen * 2} ${x1} ${o0} L${x1} ${u0} Q${m} ${u0 + bogen * 2} ${x0} ${u0} Z`;
  const fall = h * 0.3;
  const linksEnde = `M${x0 + ende * 0.55} ${o0 + fall + bogen * .35} L${x0 - ende} ${o0 + fall + 8} L${x0 - ende * 0.55} ${o0 + fall + h * .52} L${x0 - ende} ${u0 + fall - 2} L${x0 + ende * 0.55} ${u0 + fall + bogen * .35} Z`;
  const rechtsEnde = `M${x1 - ende * 0.55} ${o0 + fall + bogen * .35} L${x1 + ende} ${o0 + fall + 8} L${x1 + ende * 0.55} ${o0 + fall + h * .52} L${x1 + ende} ${u0 + fall - 2} L${x1 - ende * 0.55} ${u0 + fall + bogen * .35} Z`;
  const faltL = `M${x0} ${u0} L${x0 + ende * 0.55} ${u0 + fall + bogen * .35} L${x0 + ende * .55} ${u0 + bogen * .5} Z`;
  const faltR = `M${x1} ${u0} L${x1 - ende * 0.55} ${u0 + fall + bogen * .35} L${x1 - ende * .55} ${u0 + bogen * .5} Z`;
  const basis = u0 - h * 0.2 + dy;
  const pfad = `M${x0} ${basis} Q${m} ${basis + bogen * 2} ${x1} ${basis}`;
  return fl(linksEnde, GELB, 6) + fl(rechtsEnde, GELB, 6) + fl(faltL, NAVY, 6) + fl(faltR, NAVY, 6) + fl(haupt, PAPIER, 6)
    + `<path id="${id}" d="${pfad}" fill="none"/>`
    + `<text class="t" fill="${NAVY}" font-family="'Luckiest Guy',sans-serif" font-size="${groesse}" text-anchor="middle"><textPath href="#${id}" startOffset="50%">${text}</textPath></text>`;
}

// ---------- Nr. 1: Herz mit Banderole ----------
export function herz({ text = 'RATEN*' } = {}) {
  const H = 'M210 372 C150 318 40 240 40 140 C40 78 88 40 138 40 C172 40 198 58 210 88 C222 58 248 40 282 40 C332 40 380 78 380 140 C380 240 270 318 210 372 Z';
  const flamme = 'M210 92 C176 74 160 44 176 12 C180 24 188 28 192 26 C186 4 200 -22 222 -36 C218 -14 234 -6 238 14 C244 8 246 2 246 -6 C266 22 256 70 210 92 Z';
  const flammeIn = 'M210 76 C194 66 186 50 194 34 C198 40 204 40 206 36 C204 22 212 10 220 4 C220 18 234 30 228 50 C226 62 220 70 210 76 Z';
  const schatten = 'M380 140 C380 240 270 318 210 372 C246 318 338 244 346 146 C350 112 340 86 318 66 C356 76 380 104 380 140 Z';
  const blatt = (d, r) => fl(d, NAVY, 5) + l(r, 3, `style="stroke:${PAPIER}"`);
  return {
    box: '-44 -44 508 440',
    inhalt: [
      // Blätter hinter dem Herzen
      blatt('M66 60 C38 52 4 62 -18 88 C12 104 48 100 72 84 Z', 'M-6 86 C20 84 42 80 62 72'),
      blatt('M354 60 C382 52 416 62 438 88 C408 104 372 100 348 84 Z', 'M426 86 C400 84 378 80 358 72'),
      fl(flamme, ORANGE, 6), f(flammeIn, GELB),
      fl(H, GELB, 8),
      f(schatten, NAVY),
      punkte('M60 150 C70 220 140 280 210 340 C180 290 120 240 100 150 Z'),
      l('M86 122 C90 98 108 82 130 78', 9, `style="stroke:${PAPIER}"`),
      band({ x0: 2, x1: 418, y: 150, hoehe: 92, bogen: 22, text, groesse: 82, ende: 34 }),
      funkel(436, 10, 13), tupfen([[46, 8], [374, 6], [-26, 200], [448, 190]], 5),
      funkel(92, 336, 13), funkel(330, 340, 15), tupfen([[126, 374], [298, 378]], 5),
    ].join('')
  };
}

// ---------- Nr. 2: Schwalbe bringt den Link ----------
export function schwalbe() {
  const kA = 'M300 110 C240 58 150 34 52 62 C86 94 108 100 134 100 C138 130 160 138 184 132 C192 160 214 166 236 156 C246 170 262 172 276 166 Z';
  const kB = 'M322 150 C372 190 404 262 376 356 C350 330 336 310 334 284 C306 288 292 270 294 246 C268 248 256 232 260 210 Z';
  const k = 'M366 70 C350 48 310 50 298 82 C286 116 236 170 186 222 L170 246 C224 252 300 216 338 150 C352 134 374 120 380 96 Z';
  const bauch = 'M338 150 C300 216 224 252 170 246 L186 222 C236 214 290 180 316 128 C330 134 338 140 338 150 Z';
  const kehle = 'M380 96 C374 120 352 134 338 150 C336 140 330 134 316 128 C328 112 350 100 380 96 Z';
  const s1 = 'M196 214 C150 242 88 264 24 268 C70 284 132 284 182 248 Z';
  const s2 = 'M176 240 C150 282 112 332 90 392 C132 352 184 312 208 238 Z';
  const schnabel = 'M372 70 L416 84 L380 98 Z';
  const glied = (cx, cy, rot) => {
    const d = `M${cx - 30} ${cy} a30 16 0 1 0 60 0 a30 16 0 1 0 -60 0 Z`;
    return `<g transform="rotate(${rot} ${cx} ${cy})">` + l(d, 15) + `<path class="f" fill="none" stroke="${GELB}" stroke-width="6.5" d="${d}"/></g>`;
  };
  return {
    box: '0 0 500 410',
    inhalt: [
      fl(s1, NAVY, 6), fl(s2, NAVY, 6),
      fl(kB, GELB, 7),
      l('M334 284 C340 240 330 204 316 174', 4), l('M294 246 C306 224 310 200 306 182', 4), l('M376 356 C378 290 360 220 330 170', 4),
      punkte('M322 150 C352 180 366 216 372 262 C356 226 336 190 306 166 Z'),
      fl(kA, GELB, 7),
      l('M134 100 C176 84 232 88 280 118', 4), l('M184 132 C214 116 250 116 282 130', 4), l('M236 156 C252 146 270 142 288 146', 4),
      punkte('M300 110 C260 80 208 62 150 62 C200 80 250 100 280 130 Z'),
      fl(k, NAVY, 7),
      f(bauch, PAPIER), l('M338 150 C300 216 224 252 170 246', 5),
      f(kehle, ORANGE), l('M316 128 C328 112 350 100 380 96', 4),
      fl(schnabel, NAVY, 5),
      `<circle class="f" cx="345" cy="82" r="9.5" fill="${PAPIER}"/><circle class="f" cx="347" cy="82" r="4.6" fill="${NAVY}"/>`,
      glied(424, 116, 62), glied(446, 164, 118), glied(452, 224, 70),
      tupfen([[82, 30], [40, 110], [440, 34], [472, 66]], 5), funkel(250, 28, 15), funkel(112, 186, 14), funkel(290, 360, 15), tupfen([[240, 330], [340, 386]], 5),
    ].join('')
  };
}

// ---------- Nr. 3: Anker hält den Termin ----------
export function anker() {
  const arme = 'M190 416 C112 416 62 362 56 290 L18 318 L40 232 L122 272 L86 284 C98 334 142 370 190 372 C238 370 282 334 294 284 L258 272 L340 232 L362 318 L324 290 C318 362 268 416 190 416 Z';
  const schaft = 'M174 76 L206 76 L212 392 L168 392 Z';
  const stock = 'M92 88 L288 88 C298 88 304 95 304 102 C304 110 298 116 288 116 L92 116 C82 116 76 110 76 102 C76 95 82 88 92 88 Z';
  const seil = 'M46 204 C10 156 34 86 96 124 C126 142 130 150 150 156';
  const seil2 = 'M196 226 C146 226 128 262 170 282 C206 298 238 296 236 330 C234 348 216 354 206 346';
  const zug = (d) => `<path class="l" pathLength="1" fill="none" stroke="${NAVY}" stroke-width="20" stroke-linecap="round" d="${d}"/><path class="f" fill="none" stroke="${PAPIER}" stroke-width="10" stroke-linecap="round" d="${d}"/><path class="f" fill="none" stroke="${NAVY}" stroke-width="10" stroke-dasharray="3 11" d="${d}"/>`;
  return {
    box: '-6 -8 392 436',
    inhalt: [
      `<circle class="l" pathLength="1" cx="190" cy="44" r="27" fill="none" stroke="${NAVY}" stroke-width="22"/><circle class="f" cx="190" cy="44" r="27" fill="none" stroke="${GELB}" stroke-width="9"/>`,
      fl(schaft, GELB, 7), punkte('M192 76 L206 76 L212 392 L192 392 Z'),
      fl(arme, GELB, 8),
      f('M190 416 C268 416 318 362 324 290 L362 318 L340 232 L326 239 L338 286 L310 268 C300 346 248 392 190 396 Z', NAVY),
      punkte('M64 296 C76 356 124 398 186 406 C134 392 94 346 86 290 Z'),
      fl(stock, GELB, 7), f('M90 104 L302 104 C300 112 294 116 288 116 L92 116 C86 116 80 112 78 104 Z', NAVY),
      zug(seil), zug(seil2),
      band({ x0: 56, x1: 324, y: 136, hoehe: 62, bogen: 10, text: 'TERMIN', groesse: 58, ende: 30 }),
      funkel(44, 40, 15), funkel(340, 52, 15), tupfen([[84, 24], [300, 22], [12, 390], [370, 384]], 5), funkel(112, 234, 11), funkel(274, 216, 0),
    ].join('')
  };
}

// ---------- Nr. 4: Das Ass mit dem QR-Code ----------
export function ass() {
  const karte = (x, y, w, h, r = 18) => `M${x + r} ${y} L${x + w - r} ${y} Q${x + w} ${y} ${x + w} ${y + r} L${x + w} ${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} L${x + r} ${y + h} Q${x} ${y + h} ${x} ${y + h - r} L${x} ${y + r} Q${x} ${y} ${x + r} ${y} Z`;
  // QR-Muster: bewusst nur Zeichnung, nicht scanbar
  const raster = [
    '1110010111', '1010110101', '1110001111', '0001101000', '1011010110',
    '0100111011', '0011001000', '1110110111', '1010001101', '1110101111',
  ];
  let qr = '', s = 15, ox = 118, oy = 112;
  raster.forEach((z, y) => [...z].forEach((c, x) => { if (c === '1') qr += `M${ox + x * s} ${oy + y * s}h${s}v${s}h-${s}Z `; }));
  const eck = (cx, cy, sc = 1, rot = 0) => `<g transform="translate(${cx} ${cy}) rotate(${rot}) scale(${sc})"><text class="t" text-anchor="middle" font-family="'Luckiest Guy',sans-serif" font-size="36" fill="${NAVY}" x="0" y="12">A</text>${stern(0, 30, 15)}</g>`;
  return {
    box: '-10 -6 420 416',
    inhalt: [
      `<g transform="rotate(-13 190 210)">` + fl(karte(40, 40, 236, 330), GELB, 7)
      + l(karte(54, 54, 208, 302, 10), 3)
      + punkte(karte(62, 62, 192, 286, 8))
      + `</g>`,
      `<g transform="rotate(7 220 210)">` + fl(karte(78, 28, 268, 366), PAPIER, 8)
      + eck(106, 66) + eck(318, 356, 1, 180)
      + f(qr, NAVY)
      + `</g>`,
      band({ x0: 80, x1: 340, y: 284, hoehe: 60, bogen: 8, text: 'THEKE', groesse: 54, ende: 30 }),
      funkel(16, 30, 15), funkel(386, 24, 14), tupfen([[52, 8], [352, -2], [396, 330], [6, 376]], 5), funkel(378, 386, 12),
    ].join('')
  };
}

// ---------- Nr. 5: Rose mit Gutschein ----------
function bl(cx, cy, w, rIn, rOut, spitz = 1) {
  // ein Blütenblatt: w = Winkel Mitte, breite aus spitz
  const P = (r, a) => [cx + r * Math.cos(a * Math.PI / 180), cy + r * Math.sin(a * Math.PI / 180)];
  const b = 46 * spitz;
  const [sx, sy] = P(rIn, w - b), [ex, ey] = P(rIn, w + b), [tx, ty] = P(rOut, w);
  const [c1x, c1y] = P(rOut * 1.02, w - b * 1.06), [c2x, c2y] = P(rOut * 1.06, w - b * .34);
  const [c3x, c3y] = P(rOut * 1.06, w + b * .34), [c4x, c4y] = P(rOut * 1.02, w + b * 1.06);
  const n = v => v.toFixed(1);
  return `M${n(sx)} ${n(sy)} C${n(c1x)} ${n(c1y)} ${n(c2x)} ${n(c2y)} ${n(tx)} ${n(ty)} C${n(c3x)} ${n(c3y)} ${n(c4x)} ${n(c4y)} ${n(ex)} ${n(ey)} Z`;
}
export function rose() {
  const ticket = 'M26 0 L300 0 Q300 18 318 18 L318 148 Q300 148 300 166 L26 166 Q26 148 8 148 L8 18 Q26 18 26 0 Z';
  const cx = 150, cy = 214;
  const blatt1 = 'M62 286 C24 300 4 338 0 378 C42 374 92 352 108 312 Z';
  const blatt2 = 'M200 312 C228 344 272 354 312 332 C290 296 250 278 222 280 Z';
  const blatt3 = 'M62 170 C30 150 4 112 4 76 C44 82 88 106 98 148 Z';
  const ader = d => l(d, 3, `style="stroke:${PAPIER}"`);
  const aussen = [-90, -18, 54, 126, 198].map(a => fl(bl(cx, cy, a, 28, 118, 1.02), GELB, 7)).join('');
  const schatten = [-18, 54, 126].map(a => {
    const P = (r, w) => [cx + r * Math.cos(w * Math.PI / 180), cy + r * Math.sin(w * Math.PI / 180)].map(v => v.toFixed(1)).join(' ');
    return punkte(`M${P(60, a - 30)} Q${P(112, a - 18)} ${P(108, a)} Q${P(112, a + 18)} ${P(60, a + 30)} Q${P(92, a)} ${P(60, a - 30)} Z`);
  }).join('');
  const mitte = [-54, 18, 90, 162, 234].map(a => fl(bl(cx, cy, a, 18, 84, 1.0), GELB, 6.5)).join('');
  const innen = [-90, 0, 90, 180].map(a => fl(bl(cx, cy, a, 8, 52, 1.04), ORANGE, 6)).join('');
  return {
    box: '-6 -8 480 396',
    inhalt: [
      `<g transform="translate(150 0) rotate(7)">` + fl(ticket, GELB, 7)
      + `<path class="l" pathLength="1" fill="none" stroke="${NAVY}" stroke-width="3" d="M28 14 L298 14 Q300 28 304 32 L304 134 Q300 138 298 152 L28 152 Q26 138 22 134 L22 32 Q26 28 28 14 Z"/>`
      + `<text class="t" x="172" y="70" text-anchor="middle" font-family="'Luckiest Guy',sans-serif" font-size="38" fill="${NAVY}" textLength="236" lengthAdjust="spacingAndGlyphs">GUTSCHEIN</text>`
      + stern(250, 110, 22) + stern(286, 104, 13)
      + `</g>`,
      fl(blatt3, NAVY, 6), ader('M12 84 C38 104 64 126 84 146'),
      fl(blatt1, NAVY, 6), ader('M10 368 C38 348 68 328 94 310'),
      fl(blatt2, NAVY, 6), ader('M300 330 C272 324 244 310 218 294'),
      aussen, schatten, mitte, innen,
      `<circle class="f" cx="${cx}" cy="${cy}" r="24" fill="${NAVY}"/>`,
      l(`M${cx - 12} ${cy + 4} C${cx - 14} ${cy - 14} ${cx + 12} ${cy - 16} ${cx + 13} ${cy + 1} C${cx + 13} ${cy + 13} ${cx - 3} ${cy + 13} ${cx - 3} ${cy + 2} C${cx - 3} ${cy - 5} ${cx + 5} ${cy - 5} ${cx + 5} ${cy + 1}`, 4.5, `style="stroke:${GELB}"`),
      funkel(262, 370, 13), funkel(450, 214, 15), tupfen([[318, 368], [404, 236], [32, 22]], 5), funkel(96, 26, 13),
    ].join('')
  };
}

// ---------- Füllsel des Bogens ----------
export function sternMotiv() { return { box: '-4 -4 108 108', inhalt: stern(50, 52, 46) }; }
export function mond() {
  const d = 'M72 6 C30 2 2 34 4 66 C6 98 40 118 74 106 C50 98 34 78 36 56 C38 34 52 16 72 6 Z';
  return { box: '-4 -2 88 120', inhalt: fl(d, GELB, 5) + punkte('M36 56 C34 78 50 98 74 106 C50 110 22 96 14 72 C22 76 30 70 36 56 Z') + funkel(66, 54, 11) };
}
export function diamant() {
  const a = 'M26 4 L94 4 L118 36 L60 112 L2 36 Z';
  return { box: '-4 -4 128 124', inhalt: fl(a, GELB, 5) + l('M2 36 L118 36 M26 4 L40 36 L60 112 L80 36 L94 4 M40 36 L60 4 L80 36', 3) + punkte('M80 36 L118 36 L60 112 Z') };
}
export function blitz() {
  const a = 'M58 2 L14 66 L44 66 L28 118 L82 44 L50 44 L72 2 Z';
  return { box: '6 -4 84 128', inhalt: fl(a, GELB, 5) };
}

// Einmal im Dokument: Punktmuster für die Schattierung
export const DEFS = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs><pattern id="tf-punkte" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.2" cy="2.2" r="2.1" fill="${NAVY}"/><circle cx="6.7" cy="6.7" r="2.1" fill="${NAVY}"/></pattern></defs></svg>`;

export function svg(m, { klasse = '', titel = '', stil = '' } = {}) {
  const barriere = titel ? `role="img" aria-label="${titel}"` : `aria-hidden="true" focusable="false"`;
  const inhalt = typeof m === 'function' ? m() : m;
  return `<svg class="motiv ${klasse}" viewBox="${inhalt.box}" ${barriere} ${stil ? `style="${stil}"` : ''}>${inhalt.inhalt}</svg>`;
}
