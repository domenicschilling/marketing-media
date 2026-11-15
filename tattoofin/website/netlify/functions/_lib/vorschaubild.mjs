// Vorschaubild 1200 × 630 für geteilte Zahlungslinks (WhatsApp, iMessage, Telegram …), Tattoofin-Stil Gelb/Navy.
// Zeigt: Studio-Logo (falls als PNG hinterlegt) oder Studioname, Betrag, Projekt, Zahlarten. NIE den Namen des Kunden
// (das Bild ist für jeden mit dem Link abrufbar und landet in Chat-Vorschauen).
// neutral: für bezahlte/stornierte Links – nur Tattoofin, keine Zahlungsdaten.
import { Leinwand, textPassend, textBreite, pngLaden, eingepasst, wortmarkeBreite } from "./leinwand.mjs";

export const BREITE = 1200, HOEHE = 630;
const GELB = "#fbb316", GELB_HELL = "#ffc93c", NAVY = "#1f3d5c", GRAU = "#4f6478", CREME = "#fff3c4", LINIE = "#eadfc6", WEISS = "#ffffff";

function hintergrund(L) {
  // Strahlen (wie auf tattoofin.de) + Punkteraster
  const cx = 930, cy = 330, r = 1500, n = 30, strahlen = [];
  for (let i = 0; i < n; i += 2) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
    strahlen.push([cx, cy, cx + Math.cos(a0) * r, cy + Math.sin(a0) * r, cx + Math.cos(a1) * r, cy + Math.sin(a1) * r]);
  }
  L.fuellen(strahlen, GELB_HELL, 0.55);
  const punkte = [];
  for (let y = 14; y < HOEHE; y += 28) for (let x = 14 + ((y / 28) % 2) * 14; x < BREITE; x += 28) punkte.push(Leinwand.kreis(x, y, 2.4));
  L.fuellen(punkte, WEISS, 0.22);
}

// Karte mit Navy-Rand und hartem Schatten (Comic-Stil der Website)
function karte(L, x, y, w, h) {
  L.rechteck(x + 12, y + 12, w, h, NAVY, 36);
  L.rechteck(x, y, w, h, NAVY, 36);
  L.rechteck(x + 6, y + 6, w - 12, h - 12, WEISS, 30);
}

function pille(L, text, { x, y, h = 52, groesse = 24, farbe = NAVY, schrift = WEISS, rand = 22, abstand = 0 }) {
  const w = textBreite(text, { groesse, abstand }) + rand * 2;
  L.rechteck(x, y, w, h, farbe, h / 2);
  L.text(text, { x: x + rand, y: y + h / 2 + groesse * 0.35, groesse, farbe: schrift, abstand });
  return w;
}

const KX = 48, KY = 44, KW = 1104, KH = 436, INNEN_X = KX + 56, INNEN_B = KW - 112;

/**
 * @param {object} d
 * @param {string} d.firma           Studioname
 * @param {string} d.betrag          „1.500,00 €“
 * @param {string} d.etikett         z. B. „Zahlung an“, „Anzahlung an“, „Gutschein von“
 * @param {string} d.beschreibung    Projekt (vom Studio eingegeben)
 * @param {boolean} d.klarna         Klarna-Pille zeigen (nur der Name)
 * @param {Buffer|null} d.logo       PNG des Studio-Logos
 * @param {boolean} d.logoHell       Logo ist hell (für dunklen Grund) → auf Navy-Fläche setzen
 * @param {boolean} d.neutral        nur Tattoofin (bezahlte/stornierte Links)
 * @returns {Buffer} PNG
 */
export function vorschauBild({ firma = "", betrag = "", etikett = "Zahlung an", beschreibung = "", klarna = false, logo = null, logoHell = false, neutral = false } = {}) {
  const L = new Leinwand(BREITE, HOEHE, GELB);
  hintergrund(L);
  karte(L, KX, KY, KW, KH);

  if (neutral) {
    const hoehe = 96, breite = wortmarkeBreite(hoehe);
    L.wortmarke({ x: (BREITE - breite) / 2, y: KY + 236, hoehe });
    const t = textPassend("Sichere Zahlungen für Tattoo-Studios", { schrift: "dm500", max: 38, min: 28, breite: INNEN_B });
    L.text(t.text, { x: BREITE / 2, y: KY + 318, schrift: "dm500", groesse: t.groesse, farbe: GRAU, ausrichtung: "mitte" });
    return L.png();
  }

  // Etikett als helle Pille
  pille(L, etikett.toUpperCase(), { x: INNEN_X, y: KY + 42, h: 44, groesse: 20, farbe: CREME, schrift: NAVY, rand: 18, abstand: 2 });

  // Studio: Logo (PNG) oder Name
  const zoneY = KY + 104, zoneH = 92;
  const geladen = logo ? pngLaden(logo) : null;
  if (geladen) {
    const pad = logoHell ? 14 : 0, m = eingepasst(geladen, 620 - pad * 2, zoneH - pad * 2);
    if (logoHell) L.rechteck(INNEN_X, zoneY + (zoneH - m.h) / 2 - pad, m.w + pad * 2, m.h + pad * 2, NAVY, 16);
    L.bild(geladen, { x: INNEN_X + pad, y: zoneY + (zoneH - m.h) / 2, maxW: m.w, maxH: m.h });
  } else {
    const t = textPassend(firma || "Dein Tattoo-Studio", { max: 70, min: 44, breite: INNEN_B });
    L.text(t.text, { x: INNEN_X, y: zoneY + 66, groesse: t.groesse, farbe: NAVY });
  }

  // gestrichelte Linie (Beleg-Optik)
  const ly = KY + 216, striche = [];
  for (let x = INNEN_X; x < INNEN_X + INNEN_B; x += 24) striche.push(Leinwand.rundRechteck(x, ly, 14, 4, 2));
  L.fuellen(striche, LINIE);

  // Betrag groß, darunter das Projekt
  const b = textPassend(betrag, { max: 140, min: 90, breite: INNEN_B });
  L.text(b.text, { x: INNEN_X - 4, y: KY + 348, groesse: b.groesse, farbe: NAVY });
  if (beschreibung) {
    const p = textPassend(beschreibung, { schrift: "dm500", max: 34, min: 26, breite: INNEN_B });
    L.text(p.text, { x: INNEN_X, y: KY + 408, schrift: "dm500", groesse: p.groesse, farbe: GRAU });
  }

  // Zahlarten als Pillen, rechts „sicher bezahlen mit TATTOOFIN“
  let x = KX;
  for (const z of ["Karte", "Apple Pay", "Google Pay", ...(klarna ? ["Klarna"] : [])]) x += pille(L, z, { x, y: 522, h: 54, groesse: 24 }) + 12;
  const rechts = KX + KW + 8, wmH = 36;
  const wmB = L.wortmarke({ x: rechts, y: 584, hoehe: wmH, ausrichtung: "rechts" });
  L.text("sicher bezahlen mit", { x: rechts - wmB / 2, y: 538, groesse: 20, farbe: NAVY, ausrichtung: "mitte" });
  return L.png();
}
