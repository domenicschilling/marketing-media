// Nachweis zur Zahlung als PDF (A4) – seit 14.11.2026 für die Tattoofin-App (GET /api/portal/nachweis/:id?pdf=1).
// Gleicher Inhalt wie /nachweis.html (Dashboard, Drucken im Browser): Studio, Zahlung, Bestätigung beim Bezahlen, Anzahlungsbedingungen,
// Leistungsbestätigung mit Unterschrift und ggf. Foto, Hinweise. Daten: dieselbe Zusammenstellung wie GET /api/portal/nachweis/:id (JSON).
// Standardschrift Helvetica (WinAnsi): Zeichen außerhalb (z. B. Emojis) werden entfernt.
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { euro } from "./util.mjs";

const ERLAUBT = /[\x20-\x7E\xA0-\xFF€„“”‚‘’…–—•]/;
const sauber = (t) => [...String(t ?? "")].filter((c) => ERLAUBT.test(c)).join("").replace(/\s+/g, " ").trim();
const zeit = (iso) => (iso ? new Date(iso).toLocaleString("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }) : "–");
const tag = (d) => (d ? new Date(d + "T12:00:00Z").toLocaleDateString("de-DE", { timeZone: "Europe/Berlin" }) : "–");
const STATUS = { offen: "offen", bezahlt: "bezahlt", in_pruefung: "in Prüfung", storniert: "storniert", erstattet: "erstattet", teilerstattet: "teilweise erstattet", rueckgebucht: "zurückgebucht", abgebrochen: "abgebrochen" };

// Bild aus einer Daten-URL (PNG/JPEG); defekte Bilder → null (PDF entsteht trotzdem)
async function bild(pdf, src) {
  const m = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(String(src || ""));
  if (!m) return null;
  try { const buf = Buffer.from(m[2], "base64"); return /png/i.test(m[1]) ? await pdf.embedPng(buf) : await pdf.embedJpg(buf); } catch { return null; }
}

export async function nachweisPdf(d) {
  const Z = d.zahlung || {}, L = d.leistung, S = d.studio || {}, K = Z.kundeBestaetigt;
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Nachweis zur Zahlung ${Z.id || ""}`.trim()); pdf.setAuthor(sauber(S.firma)); pdf.setCreator("Tattoofin"); pdf.setProducer("Tattoofin");
  const f = await pdf.embedFont(StandardFonts.Helvetica), fb = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28, H = 841.89, R = 50, BREITE = W - 2 * R;
  const navy = rgb(0.075, 0.141, 0.239), grau = rgb(0.36, 0.39, 0.44), creme = rgb(1, 0.98, 0.94), gelb = rgb(0.984, 0.702, 0.086);
  let page, y;
  const neueSeite = () => { page = pdf.addPage([W, H]); y = H - R; };
  const platz = (h) => { if (y - h < R) neueSeite(); };
  const zeilen = (text, font, size, breite) => {
    const out = []; let z = "";
    for (const w of sauber(text).split(" ").filter(Boolean)) {
      const probe = z ? z + " " + w : w;
      if (font.widthOfTextAtSize(probe, size) <= breite || !z) z = probe; else { out.push(z); z = w; }
    }
    if (z) out.push(z);
    return out;
  };
  const absatz = (text, { font = f, size = 10.5, color = navy, x = R, breite = BREITE, abstand = 4 } = {}) => {
    for (const z of zeilen(text, font, size, breite)) { platz(size * 1.4); page.drawText(z, { x, y: y - size, font, size, color }); y -= size * 1.4; }
    y -= abstand;
  };
  const ueberschrift = (t) => {
    platz(40); y -= 12;
    page.drawText(sauber(t), { x: R, y: y - 14, font: fb, size: 14, color: navy }); y -= 20;
    page.drawLine({ start: { x: R, y }, end: { x: W - R, y }, thickness: 1.5, color: navy }); y -= 8;
  };
  const reihe = (k, v) => {
    if (!v) return;
    const zl = zeilen(v, f, 10.5, BREITE * 0.66);
    platz(zl.length * 14.5 + 2);
    page.drawText(sauber(k), { x: R, y: y - 10.5, font: fb, size: 10, color: grau });
    zl.forEach((z, i) => page.drawText(z, { x: R + BREITE * 0.34, y: y - 10.5 - i * 14.5, font: f, size: 10.5, color: navy }));
    y -= zl.length * 14.5 + 2;
  };
  const zitat = (t) => {
    const zl = zeilen(t, f, 10, BREITE - 24), h = zl.length * 13.5 + 12;
    platz(h + 6);
    page.drawRectangle({ x: R, y: y - h, width: BREITE, height: h, color: creme });
    page.drawRectangle({ x: R, y: y - h, width: 3.5, height: h, color: navy });
    zl.forEach((z, i) => page.drawText(z, { x: R + 14, y: y - 16 - i * 13.5, font: f, size: 10, color: navy }));
    y -= h + 8;
  };
  const bildZeigen = async (src, maxB, maxH) => {
    const img = await bild(pdf, src);
    if (!img) { absatz("(Bild nicht lesbar)", { color: grau, size: 9.5 }); return; }
    const sk = Math.min(maxB / img.width, maxH / img.height, 1), b = img.width * sk, h = img.height * sk;
    platz(h + 10);
    page.drawRectangle({ x: R - 1, y: y - h - 1, width: b + 2, height: h + 2, borderColor: rgb(0.81, 0.85, 0.88), borderWidth: 1, color: rgb(1, 1, 1) });
    page.drawImage(img, { x: R, y: y - h, width: b, height: h });
    y -= h + 10;
  };

  neueSeite();
  // Hinweis oben (wie im Dashboard)
  const hinweis = zeilen("Zusammenstellung der in Tattoofin gespeicherten Nachweise. Keine Rechtsberatung; ob sie im Einzelfall ausreichen, entscheiden Bank bzw. Zahlungsanbieter.", fb, 9.5, BREITE - 20);
  const hh = hinweis.length * 12.5 + 12;
  page.drawRectangle({ x: R, y: y - hh, width: BREITE, height: hh, color: rgb(1, 0.953, 0.769), borderColor: gelb, borderWidth: 1.5 });
  hinweis.forEach((z, i) => page.drawText(z, { x: R + 10, y: y - 15.5 - i * 12.5, font: fb, size: 9.5, color: navy }));
  y -= hh + 18;
  page.drawText("Nachweis zur Zahlung", { x: R, y: y - 24, font: fb, size: 24, color: navy }); y -= 34;
  absatz(`Erstellt am ${zeit(d.erstellt)} mit Tattoofin · Zahlungs-Nr. ${Z.id || ""}`, { color: grau, size: 10 });

  ueberschrift("Studio");
  reihe("Studio", S.firma); reihe("Inhaber/in", S.inhaber); reihe("Adresse", [S.strasse, [S.plz, S.ort].filter(Boolean).join(" ")].filter(Boolean).join(", "));

  ueberschrift("Zahlung");
  reihe("Kunde", Z.kunde || "–"); reihe("E-Mail", Z.email || ""); reihe("Betrag", euro(Z.betragCent || 0));
  reihe("Projekt", Z.beschreibung || ""); reihe("Sitzungen", Z.sitzungen || ""); reihe("Art", Z.art === "anzahlung" || Z.anzahlung ? "Anzahlung" : Z.art === "gutschein" ? "Gutschein" : "Zahlung");
  reihe("Status", STATUS[Z.status] || Z.status); reihe("Bezahlt am", Z.bezahltAm ? zeit(Z.bezahltAm) : ""); reihe("Zahlart", Z.zahlartText || ""); reihe("Stripe-Zahlung", Z.paymentIntentId || "");

  ueberschrift("1. Bestätigung beim Bezahlen");
  if (K) {
    absatz(`Vor dem Bezahlen hat der Kunde per Häkchen bestätigt (${zeit(K.am)}, Version ${K.version || ""}):`);
    zitat(K.inhalt);
    if (K.ip) absatz("IP-Adresse: " + K.ip, { color: grau, size: 9 });
  } else absatz("Keine (Zahlung vor Einführung dieser Funktion oder noch nicht bezahlt).", { color: grau });

  let nr = 2;
  if (Z.bedingungen) {
    ueberschrift(`${nr++}. Anzahlungsbedingungen bestätigt`);
    absatz(`am ${zeit(Z.bedingungen.akzeptiertAm)}:`);
    zitat(Z.bedingungen.text);
  }

  ueberschrift(`${nr}. Leistungsbestätigung nach dem Termin`);
  if (L) {
    absatz(`Bestätigt am ${zeit(L.am)} von ${L.name || ""} (Termin: ${tag(L.datum)}, Version ${L.version || ""}):`);
    zitat(L.text);
    absatz("Unterschrift:");
    await bildZeigen(L.unterschrift, 260, 110);
    if (L.foto) { absatz(`Foto (Einwilligung: „${L.fotoEinwilligung || ""}“):`); await bildZeigen(L.foto, 240, 240); }
    if (L.ip) absatz("IP-Adresse: " + L.ip, { color: grau, size: 9 });
  } else absatz("Noch keine Leistungsbestätigung.", { color: grau });

  y -= 10;
  absatz("Hinweis: Dieser Nachweis hilft bei Rückfragen und Rückbuchungen. Ob eine Rückbuchung zugunsten des Studios entschieden wird, entscheiden Bank bzw. Zahlungsanbieter. Er enthält personenbezogene Daten des Kunden: Nutze ihn nur zur Klärung dieser Zahlung (z. B. gegenüber Stripe, Klarna oder der Bank), bewahre ihn sicher auf und lösche ihn, wenn du ihn nicht mehr brauchst.", { color: grau, size: 9 });

  // Seitenzahlen
  const seiten = pdf.getPages();
  seiten.forEach((p, i) => p.drawText(`Seite ${i + 1} von ${seiten.length} · Zahlungs-Nr. ${sauber(Z.id)}`, { x: R, y: 26, font: f, size: 8, color: grau }));
  return pdf.save();
}
