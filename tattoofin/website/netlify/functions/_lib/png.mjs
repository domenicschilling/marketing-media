// PNG lesen, verkleinern und schreiben ohne zusätzliche Abhängigkeit außer @pdf-lib/upng (Dekodieren, steht in package.json)
// und node:zlib (Schreiben). Getrennt von leinwand.mjs, damit branding.mjs (Logo-Vorschau beim Hochladen) nicht die
// Glyphen-Datei der Zeichenfläche mitbündelt.
// Schutz vor „Packbomben“: Breite/Höhe werden vor dem Entpacken aus dem IHDR-Block gelesen; zu große Bilder werden gar
// nicht erst entpackt.
import zlib from "node:zlib";
import UPNG_MODUL from "@pdf-lib/upng";

// CommonJS mit __esModule: unter Node liegt die Bibliothek in .default, im esbuild-Bündel direkt
const UPNG = UPNG_MODUL?.decode ? UPNG_MODUL : UPNG_MODUL?.default;
const SIGNATUR = [137, 80, 78, 71, 13, 10, 26, 10];

// Grenze für die Link-Vorschau (je Bildabruf): 12 Mio. Bildpunkte ≈ 48 MB RGBA
export const MAX_PIXEL_VORSCHAU = 12e6;
// Grenze beim Hochladen (einmalig, Logo-Vorschau wird daraus verkleinert): 25 Mio. Bildpunkte ≈ 100 MB RGBA, z. B. 6000×4000
export const MAX_PIXEL_UPLOAD = 25e6;

// Breite/Höhe aus dem IHDR-Block (ohne Entpacken); null, wenn kein PNG
export function pngGroesse(buf) {
  if (!buf || buf.length < 24) return null;
  for (let i = 0; i < 8; i++) if (buf[i] !== SIGNATUR[i]) return null;
  if (buf.toString("latin1", 12, 16) !== "IHDR") return null;
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  return w && h ? { w, h } : null;
}

// PNG dekodieren und leere (transparente) Ränder ermitteln; null, wenn kein lesbares PNG oder größer als maxPixel
export function pngLaden(buf, { maxPixel = MAX_PIXEL_VORSCHAU } = {}) {
  const g = pngGroesse(buf);
  if (!g || g.w * g.h > maxPixel) return null;
  let img, rgba;
  try { img = UPNG.decode(buf); } catch { return null; }
  const sw = img?.width, sh = img?.height;
  if (!sw || !sh || sw !== g.w || sh !== g.h) return null;
  try { rgba = new Uint8Array(UPNG.toRGBA8(img)[0]); } catch { return null; }
  if (rgba.length < sw * sh * 4) return null;
  let l = sw, t = sh, r = -1, b = -1;
  for (let yy = 0; yy < sh; yy++) for (let xx = 0; xx < sw; xx++) if (rgba[(yy * sw + xx) * 4 + 3] > 8) { if (xx < l) l = xx; if (xx > r) r = xx; if (yy < t) t = yy; if (yy > b) b = yy; }
  if (r < 0) return null;
  return { rgba, sw, sh, l, t, cw: r - l + 1, ch: b - t + 1 };
}

// Verkleinerte Fassung (sichtbarer Bereich ohne leere Ränder, eingepasst in maxW×maxH, nie vergrößert) als RGBA-PNG.
// Flächenmittel mit Alpha-Gewichtung, damit transparente Ränder nicht dunkel ausfransen. null, wenn nicht lesbar.
export function pngVerkleinern(buf, { maxW, maxH, maxPixel = MAX_PIXEL_UPLOAD } = {}) {
  const g = pngLaden(buf, { maxPixel });
  if (!g) return null;
  const { rgba, sw, l, t, cw, ch } = g;
  const f = Math.min(1, maxW / cw, maxH / ch);
  const dw = Math.max(1, Math.round(cw * f)), dh = Math.max(1, Math.round(ch * f));
  const out = new Uint8Array(dw * dh * 4);
  for (let j = 0; j < dh; j++) {
    const ya = t + Math.floor((j * ch) / dh), ye = Math.max(ya + 1, t + Math.ceil(((j + 1) * ch) / dh));
    for (let i = 0; i < dw; i++) {
      const xa = l + Math.floor((i * cw) / dw), xe = Math.max(xa + 1, l + Math.ceil(((i + 1) * cw) / dw));
      let ar = 0, ag = 0, ab = 0, aa = 0, n = 0;
      for (let yy = ya; yy < ye; yy++) for (let xx = xa; xx < xe; xx++) {
        const o = (yy * sw + xx) * 4, al = rgba[o + 3];
        ar += rgba[o] * al; ag += rgba[o + 1] * al; ab += rgba[o + 2] * al; aa += al; n++;
      }
      const o = (j * dw + i) * 4;
      if (aa > 0) { out[o] = Math.round(ar / aa); out[o + 1] = Math.round(ag / aa); out[o + 2] = Math.round(ab / aa); }
      out[o + 3] = Math.round(aa / n);
    }
  }
  return { png: pngKodieren(out, dw, dh, 4), w: dw, h: dh };
}

// Bildpunkte (RGB = 3 oder RGBA = 4 Kanäle, 8 Bit) als PNG; Filter je Zeile (keiner, Sub, Up, Paeth) nach kleinster Summe
export function pngKodieren(px, w, h, kanaele = 3) {
  const k = kanaele, zeile = w * k;
  const roh = Buffer.alloc((zeile + 1) * h);
  const f1 = new Uint8Array(zeile), f2 = new Uint8Array(zeile), f4 = new Uint8Array(zeile);
  for (let y = 0; y < h; y++) {
    const o = y * zeile, op = o - zeile;
    let s0 = 0, s1 = 0, s2 = 0, s4 = 0;
    for (let i = 0; i < zeile; i++) {
      const x = px[o + i], a = i >= k ? px[o + i - k] : 0, b = y ? px[op + i] : 0, c = y && i >= k ? px[op + i - k] : 0;
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
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = k === 4 ? 6 : 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from(SIGNATUR), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(roh, { level: 7 })), chunk("IEND", Buffer.alloc(0))]);
}

let CRC_TAB = null;
function crc32(buf) {
  if (!CRC_TAB) { CRC_TAB = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CRC_TAB[n] = c >>> 0; } }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TAB[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
