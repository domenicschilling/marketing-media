// Tattoo-Gutscheine (seit 23.10.2026, alle Pakete).
// Ablauf: Studio erstellt im Dashboard einen Gutschein-Zahlungslink (Zahlung mit art „gutschein“) → Käufer bezahlt per Karte
// (Klarna ist für Gutscheine ausgeschlossen: Klarna-Regeln, „Wertkarten, Gutscheine und Geschenkkarten“ sind nicht zugelassen,
// docs.stripe.com/payments/klarna/compliance) → nach der Zahlung entsteht der Gutschein mit eindeutigem Code und PDF,
// der Käufer bekommt ihn per E-Mail, das Studio sieht ihn unter „Gutscheine“ und markiert ihn beim Termin als eingelöst.
// Aussteller des Gutscheins ist das Studio (es verkauft die Leistung), Tattoofin stellt nur die Technik.
// Gültigkeit: regelmäßige Verjährung 3 Jahre ab Ende des Kaufjahres (§§ 195, 199 BGB) → 31.12. des dritten Folgejahres.
import crypto from "node:crypto";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { CFG } from "./config.mjs";
import { store, saveZahlung, getStudio, getZahlung } from "./store.mjs";
import { ladeBild } from "./branding.mjs";
import { sendMail } from "./mail.mjs";
import { mails } from "./emails.mjs";
import { now, euro, datum } from "./util.mjs";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // ohne 0/O, 1/I – gut vorlesbar
export function neuerCode() {
  const b = crypto.randomBytes(8);
  const z = [...b].map((x) => ALPHABET[x % ALPHABET.length]).join("");
  return `GS-${z.slice(0, 4)}-${z.slice(4, 8)}`;
}
export const normCode = (c) => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^GS/, "").replace(/^(.{4})(.{4})$/, "GS-$1-$2");

// 31.12. des dritten Jahres nach dem Kaufjahr (Ende des Tages, Europe/Berlin ≈ 22:59 UTC)
export function gueltigBis(kauf = new Date()) {
  const j = new Date(kauf).getUTCFullYear() + 3;
  return new Date(Date.UTC(j, 11, 31, 22, 59, 59)).toISOString();
}

export const gutscheinUrl = (g) => `${CFG.siteUrl}/gutschein.html?t=${g.token}`;
export const gutscheinPdfUrl = (g) => `${CFG.siteUrl}/api/gutschein?t=${g.token}&pdf=1`;

// Status für Anzeige: offen (noch nicht bezahlt) | gueltig | eingeloest | abgelaufen | storniert
export function gutscheinStatus(z) {
  const g = z.gutschein || {};
  if (["storniert", "erstattet", "rueckgebucht"].includes(z.status)) return z.status === "storniert" ? "storniert" : "erstattet";
  if (!g.code) return "offen";
  if (g.eingeloestAm) return "eingeloest";
  if (g.gueltigBis && new Date(g.gueltigBis) < new Date()) return "abgelaufen";
  return "gueltig";
}

// Nach der Zahlung: Code + Token vergeben (einmalig), Gutschein per Mail an den Käufer
export async function gutscheinAusstellen(s, z) {
  if (z.art !== "gutschein") return null;
  const g = z.gutschein || {};
  if (!g.code) {
    let code;
    for (let i = 0; i < 6; i++) { code = neuerCode(); if (!(await store.get("idx/gutschein/" + code))) break; }
    g.code = code;
    g.token = crypto.randomBytes(18).toString("base64url");
    g.ausgestelltAm = z.bezahltAm || now();
    g.gueltigBis = gueltigBis(g.ausgestelltAm);
    z.gutschein = g;
    await store.set("idx/gutschein/" + code, `${s.id}/${z.id}`);
    await store.set("idx/gst/" + g.token, `${s.id}/${z.id}`);
    await saveZahlung(z);
  }
  if (z.email && !g.gesendetAm) await gutscheinSenden(s, z);
  return z.gutschein;
}

export async function gutscheinSenden(s, z) {
  const g = z.gutschein;
  const pdf = await gutscheinPdf(s, z);
  const m = mails.gutscheinKaeufer(s, z, { url: gutscheinUrl(g) });
  const ok = await sendMail({
    to: z.email, subject: m.subject, html: m.html, text: m.text,
    attachments: [{ filename: `Gutschein-${(s.slug || "studio")}-${g.code}.pdf`, content: Buffer.from(pdf).toString("base64"), contentType: "application/pdf" }],
  });
  g.gesendetAm = now(); g.gesendetAn = z.email; g.versandOk = ok;
  z.gutschein = g;
  await saveZahlung(z);
  return ok;
}

export async function gutscheinPerToken(t) {
  if (!/^[A-Za-z0-9_-]{20,40}$/.test(t || "")) return null;
  const ref = await store.get("idx/gst/" + t);
  if (!ref) return null;
  const [sid, zid] = ref.split("/");
  const z = await getZahlung(sid, zid);
  if (!z?.gutschein || z.gutschein.token !== t) return null;
  return { s: await getStudio(sid), z };
}

// ---------- PDF (A5 quer) ----------
// Standardschrift Helvetica (WinAnsi): Zeichen außerhalb (z. B. Emojis) werden entfernt.
const ERLAUBT = /[\x20-\x7E\xA0-\xFF€„“”‚‘’…–—•]/;
const sauber = (t) => [...String(t || "")].filter((c) => ERLAUBT.test(c)).join("").replace(/\s+/g, " ").trim();
const hex = (h, d) => { const m = /^#?([0-9a-f]{6})$/i.exec(h || "") ; const v = m ? m[1] : d; return rgb(parseInt(v.slice(0, 2), 16) / 255, parseInt(v.slice(2, 4), 16) / 255, parseInt(v.slice(4, 6), 16) / 255); };
const hell = (h) => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ""); if (!m) return false; const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)); return 0.299 * r + 0.587 * g + 0.114 * b > 170; };

function umbrechen(text, font, size, breite, maxZeilen) {
  const woerter = sauber(text).split(" ").filter(Boolean), zeilen = [];
  let z = "";
  for (const w of woerter) {
    const probe = z ? z + " " + w : w;
    if (font.widthOfTextAtSize(probe, size) <= breite) z = probe;
    else { if (z) zeilen.push(z); z = w; }
  }
  if (z) zeilen.push(z);
  if (zeilen.length > maxZeilen) { zeilen.length = maxZeilen; zeilen[maxZeilen - 1] = zeilen[maxZeilen - 1].replace(/\s*\S*$/, "") + " …"; }
  return zeilen;
}

async function bildFuer(pdf, s) {
  const b = s.branding || {};
  for (const art of ["logo", "icon"]) {
    if (!b[art]) continue;
    try {
      const bild = await ladeBild(s.id, art);
      const m = /^data:image\/(png|jpeg);base64,(.+)$/.exec(bild?.src || "");
      if (!m) continue;
      const buf = Buffer.from(m[2], "base64");
      return { img: m[1] === "png" ? await pdf.embedPng(buf) : await pdf.embedJpg(buf), hellesLogo: art === "logo" && Boolean(b.logoHell) };
    } catch { /* Bild defekt → ohne Logo */ }
  }
  return null;
}

export async function gutscheinPdf(s, z) {
  const g = z.gutschein || {};
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Gutschein ${s.firma} ${g.code || ""}`.trim());
  pdf.setAuthor(s.firma); pdf.setCreator("Tattoofin"); pdf.setProducer("Tattoofin");
  const W = 595.28, H = 419.53, R = 34;
  const page = pdf.addPage([W, H]);
  const f = await pdf.embedFont(StandardFonts.Helvetica), fb = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fi = await pdf.embedFont(StandardFonts.HelveticaOblique), fm = await pdf.embedFont(StandardFonts.CourierBold);
  const navy = hex("#13243d"), gelb = hex("#ffbd16"), grau = hex("#5b6370"), weiss = rgb(1, 1, 1);
  const bandFarbe = s.branding?.farbe && !hell(s.branding.farbe) ? s.branding.farbe : "#13243d";
  const band = hex(bandFarbe);
  const text = (t, x, y, font, size, color = navy) => page.drawText(sauber(t), { x, y, font, size, color });
  const rechts = (t, xr, y, font, size, color) => text(t, xr - font.widthOfTextAtSize(sauber(t), size), y, font, size, color);

  // Rahmen + Kopfband in Studiofarbe (Rückfall Tattoofin-Navy)
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(0.984, 0.98, 0.965) });
  page.drawRectangle({ x: 14, y: 14, width: W - 28, height: H - 28, color: weiss, borderColor: rgb(0.9, 0.89, 0.86), borderWidth: 1 });
  const bandH = 104, bandY = H - 14 - bandH;
  page.drawRectangle({ x: 14, y: bandY, width: W - 28, height: bandH, color: band });
  page.drawRectangle({ x: 14, y: bandY - 5, width: W - 28, height: 5, color: gelb });

  const bild = await bildFuer(pdf, s);
  let nameX = R + 6;
  if (bild) {
    const maxH = 64, maxW = 170;
    const sk = Math.min(maxH / bild.img.height, maxW / bild.img.width);
    const bw = bild.img.width * sk, bh = bild.img.height * sk, by = bandY + (bandH - bh) / 2;
    if (!bild.hellesLogo) page.drawRectangle({ x: R, y: by - 6, width: bw + 12, height: bh + 12, color: weiss });
    page.drawImage(bild.img, { x: R + 6, y: by, width: bw, height: bh });
    nameX = R + bw + 26;
  }
  const nameMax = W - 2 * R - (nameX - R) - 190;
  let nameSize = 22;
  while (nameSize > 12 && fb.widthOfTextAtSize(sauber(s.firma), nameSize) > nameMax) nameSize--;
  text(s.firma, nameX, bandY + bandH / 2 + 2, fb, nameSize, weiss);
  if (s.ort) text(s.ort, nameX, bandY + bandH / 2 - 16, f, 11, rgb(0.85, 0.88, 0.93));
  rechts("GUTSCHEIN", W - R, bandY + bandH / 2 - 4, fb, 30, gelb);

  // Betrag, Empfänger, Nachricht
  let y = bandY - 44;
  if (g.empfaenger) { text("für " + g.empfaenger, R + 6, y, fb, 16, navy); y -= 50; } else y -= 22;
  text(euro(z.betragCent).replace(",00 €", " €"), R + 6, y, fb, 52, navy);
  text("Wertgutschein · für alle Leistungen bei " + s.firma, R + 8, y - 20, f, 12, grau);
  let my = y - 46;
  for (const zeile of umbrechen(sauber(g.nachricht) ? "„" + sauber(g.nachricht) + "“" : "", fi, 12, 300, 3)) { text(zeile, R + 6, my, fi, 12, grau); my -= 16; }

  // Code-Kasten rechts
  const kx = W - R - 210, ky = bandY - 150, kw = 210, kh = 92;
  page.drawRectangle({ x: kx, y: ky, width: kw, height: kh, color: hex("#fff5d6"), borderColor: hex("#f5d77a"), borderWidth: 1.2 });
  text("Gutschein-Code", kx + 14, ky + kh - 22, f, 10, grau);
  text(g.code || "wird nach Zahlung vergeben", kx + 14, ky + kh - 52, g.code ? fm : f, g.code ? 21 : 11, navy);
  text("Bitte beim Termin angeben.", kx + 14, ky + 14, f, 9.5, grau);

  // Fuß: Daten + Einlöseort
  const adr = [s.strasse, [s.plz, s.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  page.drawLine({ start: { x: R, y: 92 }, end: { x: W - R, y: 92 }, thickness: 0.6, color: rgb(0.88, 0.87, 0.84) });
  text(`Ausgestellt am ${datum(g.ausgestelltAm || now())}   ·   Gültig bis ${datum(g.gueltigBis || gueltigBis())}`, R + 6, 72, fb, 10.5, navy);
  text(`Einlösbar bei ${s.firma}${adr ? ", " + adr : ""}`, R + 6, 56, f, 10.5, navy);
  text(`Der Gutschein wurde von ${s.firma} ausgestellt und über Tattoofin verkauft und bezahlt.`, R + 6, 34, f, 8, grau);
  rechts("tattoofin", W - R - 6, 34, fb, 9, grau);
  return pdf.save();
}
