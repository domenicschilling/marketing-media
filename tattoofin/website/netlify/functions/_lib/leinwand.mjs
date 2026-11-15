// Kleine Zeichenfläche ohne zusätzliche Abhängigkeit: Flächen (Pfade, Kreise, abgerundete Rechtecke) mit Kantenglättung,
// Text aus den Glyphen-Umrissen in /assets/aufsteller-glyphen.json (DM Sans 700/500 + Tattoofin-Wortmarke), PNG-Bilder
// einsetzen (Dekodieren über @pdf-lib/upng, kommt mit pdf-lib) und als PNG ausgeben (node:zlib).
// Verwendet für die Link-Vorschau der Zahlungslinks (tattoofin.de/z/<id>, _lib/vorschaubild.mjs).
// Rasterung: Flächenanteil je Pixel über Linien-Akkumulation (Verfahren wie font-rs), Füllregel „nonzero“ (Betrag, höchstens 1).
import zlib from "node:zlib";
import UPNG_MODUL from "@pdf-lib/upng";
import GLYPHEN from "../../../public/assets/aufsteller-glyphen.json" with { type: "json" };

// CommonJS mit __esModule: unter Node liegt die Bibliothek in .default, im esbuild-Bündel direkt
const UPNG = UPNG_MODUL?.decode ? UPNG_MODUL : UPNG_MODUL?.default;
const hex = (f) => { const m = /^#?([0-9a-f]{6})$/i.exec(f || ""); const n = m ? parseInt(m[1], 16) : 0; return [n >> 16, (n >> 8) & 255, n & 255]; };

// Eine Linie in den Akkumulations-Puffer eintragen (Koordinaten relativ zum Puffer, x ≥ 0)
function linie(a, W, H, x0, y0, x1, y1) {
  if (y0 === y1) return;
  let dir = 1;
  if (y0 > y1) { dir = -1; let t = x0; x0 = x1; x1 = t; t = y0; y0 = y1; y1 = t; }
  const dxdy = (x1 - x0) / (y1 - y0);
  let x = x0;
  if (y0 < 0) x -= y0 * dxdy;
  const yS = Math.max(0, Math.floor(y0)), yE = Math.min(H, Math.ceil(y1));
  for (let y = yS; y < yE; y++) {
    const ls = y * W;
    const dy = Math.min(y + 1, y1) - Math.max(y, y0);
    const xn = x + dxdy * dy;
    const d = dy * dir;
    const xa = Math.min(x, xn), xb = Math.max(x, xn);
    const xai = Math.floor(xa), xbi = Math.ceil(xb);
    if (xbi <= xai + 1) {
      const xmf = 0.5 * (x + xn) - xai;
      a[ls + xai] += d - d * xmf;
      a[ls + xai + 1] += d * xmf;
    } else {
      const s = 1 / (xb - xa);
      const x0f = xa - xai;
      const a0 = 0.5 * s * (1 - x0f) * (1 - x0f);
      const x1f = xb - xbi + 1;
      const am = 0.5 * s * x1f * x1f;
      a[ls + xai] += d * a0;
      if (xbi === xai + 2) a[ls + xai + 1] += d * (1 - a0 - am);
      else {
        const a1 = s * (1.5 - x0f);
        a[ls + xai + 1] += d * (a1 - a0);
        for (let xi = xai + 2; xi < xbi - 1; xi++) a[ls + xi] += d * s;
        const a2 = a1 + (xbi - xai - 3) * s;
        a[ls + xbi - 1] += d * (1 - a2 - am);
      }
      a[ls + xbi] += d * am;
    }
    x = xn;
  }
}

// SVG-Pfad (nur absolute M L H V Q Z, so liegen die Glyphen vor) → Konturen [[op, …zahlen], …]
const pfadCache = new Map();
export function pfadLesen(d) {
  if (pfadCache.has(d)) return pfadCache.get(d);
  const t = d.match(/[MLHVQZ]|-?(?:\d+\.?\d*|\.\d+)/gi) || [];
  const konturen = [];
  let i = 0, cmd = null, cx = 0, cy = 0, sx = 0, sy = 0, k = null;
  const n = () => parseFloat(t[i++]);
  while (i < t.length) {
    if (/^[A-Z]$/i.test(t[i])) cmd = t[i++].toUpperCase();
    if (cmd === "Z") { if (k) { k.push(["L", sx, sy]); k = null; } cx = sx; cy = sy; cmd = null; continue; }
    if (cmd === null || i >= t.length) { i++; continue; }
    if (cmd === "M") { cx = n(); cy = n(); sx = cx; sy = cy; k = [["M", cx, cy]]; konturen.push(k); cmd = "L"; continue; }
    if (!k) { k = [["M", cx, cy]]; konturen.push(k); }
    if (cmd === "L") { cx = n(); cy = n(); k.push(["L", cx, cy]); }
    else if (cmd === "H") { cx = n(); k.push(["L", cx, cy]); }
    else if (cmd === "V") { cy = n(); k.push(["L", cx, cy]); }
    else if (cmd === "Q") { const qx = n(), qy = n(); cx = n(); cy = n(); k.push(["Q", qx, qy, cx, cy]); }
    else i++;
  }
  pfadCache.set(d, konturen);
  return konturen;
}

// Konturen (Schrift-Einheiten, y nach oben) → Polylinien in Pixeln
function abflachen(konturen, ox, oy, sc, ziel) {
  for (const k of konturen) {
    const p = [];
    let lx = 0, ly = 0;
    for (const op of k) {
      if (op[0] === "M" || op[0] === "L") { lx = ox + op[1] * sc; ly = oy - op[2] * sc; p.push(lx, ly); continue; }
      const qx = ox + op[1] * sc, qy = oy - op[2] * sc, ex = ox + op[3] * sc, ey = oy - op[4] * sc;
      const laenge = Math.hypot(qx - lx, qy - ly) + Math.hypot(ex - qx, ey - qy);
      const schritte = Math.max(2, Math.min(40, Math.ceil(laenge / 3)));
      for (let s = 1; s <= schritte; s++) {
        const t = s / schritte, u = 1 - t;
        p.push(u * u * lx + 2 * u * t * qx + t * t * ex, u * u * ly + 2 * u * t * qy + t * t * ey);
      }
      lx = ex; ly = ey;
    }
    if (p.length >= 6) ziel.push(p);
  }
  return ziel;
}

const SCHRIFTEN = { dm700: GLYPHEN.dm700, dm500: GLYPHEN.dm500 };
// Zeichen, die die Schrift nicht kennt: Akzente weg (ł, ğ → l, g), sonst auslassen (Emojis u. a.)
function glyphe(f, ch) {
  if (f.g[ch]) return f.g[ch];
  const ohne = ch.normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (ohne && f.g[ohne]) return f.g[ohne];
  const ersatz = { "ł": "l", "Ł": "L", "đ": "d", "Đ": "D", "ı": "i", "œ": "oe", "Œ": "OE", " ": " ", " ": " ", "'": "’" }[ch];
  if (ersatz && [...ersatz].every((c) => f.g[c])) return [[...ersatz].reduce((a, c) => a + f.g[c][0], 0), [...ersatz].map((c) => f.g[c][1]).join(""), ersatz];
  return null;
}

// Breite der Wortmarke bei gegebener Versalhöhe
export const wortmarkeBreite = (hoehe) => (GLYPHEN.wortmarke.w * hoehe) / GLYPHEN.wortmarke.cap;

// Breite eines Textes in Pixeln
export function textBreite(text, { schrift = "dm700", groesse = 32, abstand = 0 } = {}) {
  const f = SCHRIFTEN[schrift], sc = groesse / f.upm;
  let b = 0, n = 0;
  for (const ch of String(text)) { const g = glyphe(f, ch); if (!g) continue; b += g[0] * sc; n++; }
  return b + Math.max(0, n - 1) * abstand;
}

// Text passend machen: erst kleiner (bis min), dann mit „…“ kürzen
export function textPassend(text, { schrift = "dm700", max = 64, min = 32, breite = 600, abstand = 0 } = {}) {
  let t = String(text || "").replace(/\s+/g, " ").trim();
  const w = textBreite(t, { schrift, groesse: max, abstand });
  let groesse = w > breite ? Math.max(min, Math.floor(max * breite / w)) : max;
  if (textBreite(t, { schrift, groesse, abstand }) > breite) {
    const zeichen = [...t];
    while (zeichen.length > 1 && textBreite(zeichen.join("").trimEnd() + "…", { schrift, groesse, abstand }) > breite) zeichen.pop();
    t = zeichen.join("").trimEnd() + "…";
  }
  return { text: t, groesse };
}

export class Leinwand {
  constructor(w, h, farbe = "#ffffff") {
    this.w = w; this.h = h; this.px = new Uint8ClampedArray(w * h * 3);
    const [r, g, b] = hex(farbe);
    for (let i = 0; i < w * h; i++) { this.px[i * 3] = r; this.px[i * 3 + 1] = g; this.px[i * 3 + 2] = b; }
  }

  // Polylinien (je [x0,y0,x1,y1,…], geschlossen) füllen
  fuellen(polys, farbe, deckkraft = 1) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of polys) for (let i = 0; i < p.length; i += 2) {
      if (p[i] < minX) minX = p[i]; if (p[i] > maxX) maxX = p[i];
      if (p[i + 1] < minY) minY = p[i + 1]; if (p[i + 1] > maxY) maxY = p[i + 1];
    }
    if (!(maxX > minX && maxY > minY)) return this;
    const x0 = Math.floor(minX), y0 = Math.floor(minY);
    const bw = Math.ceil(maxX) - x0, bh = Math.ceil(maxY) - y0, W = bw + 2;
    const a = new Float32Array(W * bh);
    for (const p of polys) {
      const n = p.length;
      for (let i = 0; i < n; i += 2) {
        const j = (i + 2) % n;
        linie(a, W, bh, p[i] - x0, p[i + 1] - y0, p[j] - x0, p[j + 1] - y0);
      }
    }
    const [r, g, b] = hex(farbe);
    for (let y = 0; y < bh; y++) {
      const py = y + y0;
      let acc = 0;
      for (let x = 0; x < bw; x++) {
        acc += a[y * W + x];
        const px = x + x0;
        if (py < 0 || py >= this.h || px < 0 || px >= this.w) continue;
        const c = Math.min(1, Math.abs(acc)) * deckkraft;
        if (c <= 0.002) continue;
        const o = (py * this.w + px) * 3;
        this.px[o] += (r - this.px[o]) * c; this.px[o + 1] += (g - this.px[o + 1]) * c; this.px[o + 2] += (b - this.px[o + 2]) * c;
      }
    }
    return this;
  }

  static rundRechteck(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    const p = [], ecke = (cx, cy, start) => { const n = Math.max(4, Math.ceil(r / 2)); for (let i = 0; i <= n; i++) { const t = start + (i / n) * Math.PI / 2; p.push(cx + Math.cos(t) * r, cy + Math.sin(t) * r); } };
    ecke(x + w - r, y + r, -Math.PI / 2); ecke(x + w - r, y + h - r, 0); ecke(x + r, y + h - r, Math.PI / 2); ecke(x + r, y + r, Math.PI);
    return p;
  }
  static kreis(cx, cy, r) {
    const n = Math.max(12, Math.ceil(r * 2)), p = [];
    for (let i = 0; i < n; i++) { const t = (i / n) * Math.PI * 2; p.push(cx + Math.cos(t) * r, cy + Math.sin(t) * r); }
    return p;
  }
  rechteck(x, y, w, h, farbe, r = 0, deckkraft = 1) { return this.fuellen([Leinwand.rundRechteck(x, y, w, h, r)], farbe, deckkraft); }

  // Text an Grundlinie y; ausrichtung links|rechts|mitte. Gibt die Breite zurück.
  text(text, { x, y, schrift = "dm700", groesse = 32, farbe = "#000000", abstand = 0, ausrichtung = "links", deckkraft = 1 }) {
    const f = SCHRIFTEN[schrift], sc = groesse / f.upm;
    const breite = textBreite(text, { schrift, groesse, abstand });
    let cx = ausrichtung === "rechts" ? x - breite : ausrichtung === "mitte" ? x - breite / 2 : x;
    const polys = [];
    for (const ch of String(text)) {
      const g = glyphe(f, ch);
      if (!g) continue;
      if (g[1]) {
        if (g[2]) { // Ersatz aus mehreren Zeichen
          let ux = cx;
          for (const c of g[2]) { abflachen(pfadLesen(f.g[c][1]), ux, y, sc, polys); ux += f.g[c][0] * sc; }
        } else abflachen(pfadLesen(g[1]), cx, y, sc, polys);
      }
      cx += g[0] * sc + abstand;
    }
    if (polys.length) this.fuellen(polys, farbe, deckkraft);
    return breite;
  }

  // Tattoofin-Wortmarke (Luckiest Guy) mit Höhe hoehe (Versalhöhe), linke Grundlinie bei x/y. Gibt die Breite zurück.
  wortmarke({ x, y, hoehe = 40, farbe = "#1f3d5c", ausrichtung = "links" }) {
    const w = GLYPHEN.wortmarke, sc = hoehe / w.cap, breite = w.w * sc;
    const ox = ausrichtung === "rechts" ? x - breite : x;
    this.fuellen(abflachen(pfadLesen(w.d), ox, y, sc, []), farbe);
    return breite;
  }

  // Geladenes PNG (pngLaden) einsetzen, eingepasst in die Box (Seitenverhältnis bleibt); gibt die gezeichnete Fläche zurück
  bild(geladen, { x, y, maxW, maxH, ausrichtung = "links" }) {
    if (!geladen) return null;
    const { rgba, sw, sh, l, t, cw, ch } = geladen;
    const f = Math.min(maxW / cw, maxH / ch);
    const dw = Math.max(1, Math.round(cw * f)), dh = Math.max(1, Math.round(ch * f));
    const dx = Math.round(ausrichtung === "rechts" ? x + maxW - dw : ausrichtung === "mitte" ? x + (maxW - dw) / 2 : x), dy = Math.round(y + (maxH - dh) / 2);
    for (let j = 0; j < dh; j++) {
      const sy0 = t + (j * ch) / dh, sy1 = t + ((j + 1) * ch) / dh;
      for (let i = 0; i < dw; i++) {
        const px = dx + i, py = dy + j;
        if (px < 0 || py < 0 || px >= this.w || py >= this.h) continue;
        const sx0 = l + (i * cw) / dw, sx1 = l + ((i + 1) * cw) / dw;
        // Flächenmittel (verkleinern) bzw. nächster Bildpunkt (vergrößern), mit vormultipliziertem Alpha
        let ar = 0, ag = 0, ab = 0, aa = 0, n = 0;
        const ya = Math.floor(sy0), ye = Math.max(ya + 1, Math.ceil(sy1)), xa = Math.floor(sx0), xe = Math.max(xa + 1, Math.ceil(sx1));
        for (let yy = ya; yy < ye && yy < sh; yy++) for (let xx = xa; xx < xe && xx < sw; xx++) {
          const o = (yy * sw + xx) * 4, al = rgba[o + 3] / 255;
          ar += rgba[o] * al; ag += rgba[o + 1] * al; ab += rgba[o + 2] * al; aa += al; n++;
        }
        if (!n || aa <= 0) continue;
        const c = aa / n, o = (py * this.w + px) * 3;
        this.px[o] = this.px[o] * (1 - c) + ar / n; this.px[o + 1] = this.px[o + 1] * (1 - c) + ag / n; this.px[o + 2] = this.px[o + 2] * (1 - c) + ab / n;
      }
    }
    return { x: dx, y: dy, w: dw, h: dh };
  }

  // Als PNG (RGB, 8 Bit) ausgeben; Filter je Zeile (keiner, Sub, Up, Paeth) nach kleinster Summe gewählt
  png() {
    const { w, h, px } = this, zeile = w * 3;
    const roh = Buffer.alloc((zeile + 1) * h);
    const f1 = new Uint8Array(zeile), f2 = new Uint8Array(zeile), f4 = new Uint8Array(zeile);
    for (let y = 0; y < h; y++) {
      const o = y * zeile, op = o - zeile;
      let s0 = 0, s1 = 0, s2 = 0, s4 = 0;
      for (let i = 0; i < zeile; i++) {
        const x = px[o + i], a = i >= 3 ? px[o + i - 3] : 0, b = y ? px[op + i] : 0, c = y && i >= 3 ? px[op + i - 3] : 0;
        const p = a + b - c, pa = p > a ? p - a : a - p, pb = p > b ? p - b : b - p, pc = p > c ? p - c : c - p;
        const v1 = (x - a) & 255, v2 = (x - b) & 255, v4 = (x - (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
        f1[i] = v1; f2[i] = v2; f4[i] = v4;
        s0 += x < 128 ? x : 256 - x; s1 += v1 < 128 ? v1 : 256 - v1; s2 += v2 < 128 ? v2 : 256 - v2; s4 += v4 < 128 ? v4 : 256 - v4;
      }
      const m = Math.min(s0, s1, s2, s4), z = y * (zeile + 1);
      if (m === s0) { roh[z] = 0; roh.set(px.subarray(o, o + zeile), z + 1); }
      else if (m === s1) { roh[z] = 1; roh.set(f1, z + 1); }
      else if (m === s2) { roh[z] = 2; roh.set(f2, z + 1); }
      else { roh[z] = 4; roh.set(f4, z + 1); }
    }
    const chunk = (typ, daten) => {
      const len = Buffer.alloc(4); len.writeUInt32BE(daten.length);
      const td = Buffer.concat([Buffer.from(typ, "ascii"), daten]);
      const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
      return Buffer.concat([len, td, crc]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(roh, { level: 7 })), chunk("IEND", Buffer.alloc(0))]);
  }
}

// PNG dekodieren und leere (transparente) Ränder ermitteln; null, wenn kein lesbares PNG oder unvernünftig groß
export function pngLaden(buf) {
  let img, rgba;
  try { img = UPNG.decode(buf); } catch { return null; }
  const sw = img?.width, sh = img?.height;
  if (!sw || !sh || sw * sh > 12e6) return null;
  try { rgba = new Uint8Array(UPNG.toRGBA8(img)[0]); } catch { return null; }
  let l = sw, t = sh, r = -1, b = -1;
  for (let yy = 0; yy < sh; yy++) for (let xx = 0; xx < sw; xx++) if (rgba[(yy * sw + xx) * 4 + 3] > 8) { if (xx < l) l = xx; if (xx > r) r = xx; if (yy < t) t = yy; if (yy > b) b = yy; }
  if (r < 0) return null;
  return { rgba, sw, sh, l, t, cw: r - l + 1, ch: b - t + 1 };
}
// Größe nach dem Einpassen in eine Box
export const eingepasst = (g, maxW, maxH) => { const f = Math.min(maxW / g.cw, maxH / g.ch); return { w: Math.max(1, Math.round(g.cw * f)), h: Math.max(1, Math.round(g.ch * f)) }; };

let CRC_TAB = null;
function crc32(buf) {
  if (!CRC_TAB) { CRC_TAB = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CRC_TAB[n] = c >>> 0; } }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TAB[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
