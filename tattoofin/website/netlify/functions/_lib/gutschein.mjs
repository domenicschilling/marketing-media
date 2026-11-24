// Tattoo-Gutscheine (seit 23.10.2026, alle Pakete).
// Ablauf: Studio erstellt im Dashboard einen Gutschein-Zahlungslink (Zahlung mit art „gutschein“) → Käufer bezahlt per Karte
// (Klarna ist für Gutscheine ausgeschlossen: Klarna-Regeln, „Wertkarten, Gutscheine und Geschenkkarten“ sind nicht zugelassen,
// docs.stripe.com/payments/klarna/compliance) → nach der Zahlung entsteht der Gutschein mit eindeutigem Code und PDF,
// der Käufer bekommt ihn per E-Mail, das Studio sieht ihn unter „Gutscheine“ und markiert ihn beim Termin als eingelöst.
// Aussteller des Gutscheins ist das Studio (es verkauft die Leistung), Tattoofin stellt nur die Technik.
// Gültigkeit: regelmäßige Verjährung 3 Jahre ab Ende des Kaufjahres (§§ 195, 199 BGB) → 31.12. des dritten Folgejahres.
import crypto from "node:crypto";
import { PDFDocument, StandardFonts, rgb, PDFNumber, PDFOperator, pushGraphicsState, popGraphicsState, beginText, endText, setFillingColor, setFontAndSize, moveText } from "pdf-lib";
import { CFG, testKasse } from "./config.mjs";
import { store, saveZahlung, getStudio, getZahlung } from "./store.mjs";
import { ladeBild } from "./branding.mjs";
import { sendMail } from "./mail.mjs";
import { mails } from "./emails.mjs";
import { now, euro, datum } from "./util.mjs";
import { qrMatrix } from "./qr.mjs";
import { reservierungVerkauft, bonusSatz, shopTexte } from "./gutschein-shop.mjs";
import { notifyAdmin } from "./domain.mjs";

// Wert und bezahlter Betrag (seit 23.11.2026, Gutschein-Shop): Aktions-Gutscheine kosten weniger, als sie wert sind.
// z.betragCent ist immer der BEZAHLTE Betrag (Stripe, Gebühren, Erstattungen). Der Gutscheinwert steht in z.gutschein.wertCent
// (fehlt bei normalen Gutscheinen → Wert = bezahlter Betrag). Bonus (Wert − bezahlt) gilt bis bonusBis, danach zählt der bezahlte Betrag.
export const gutscheinWertCent = (z) => Number(z?.gutschein?.wertCent) || z?.betragCent || 0;
export const bonusAktiv = (g, zeit = new Date()) => Boolean(g?.bonusCent && g.bonusBis && new Date(g.bonusBis) >= zeit);
// Teil-Einlösungen (Domenic 23.11.2026: in Teilen einlösbar, Restwert bleibt): g.teile = [{ am, cent, notiz }]
export const eingeloestCent = (g) => (g?.teile || []).reduce((s, x) => s + (Number(x.cent) || 0), 0);
// Was heute noch einlösbar ist. Vor Ablauf der Bonus-Frist: Wert − eingelöst. Danach verfällt nur der noch nicht genutzte Bonus:
// Eingelöste Beträge zählen zuerst gegen den Bonus (zugunsten des Kunden) → bezahlt − max(0, eingelöst − Bonus).
export function aktuellerWertCent(z, zeit = new Date()) {
  const g = z?.gutschein || {};
  if (g.eingeloestAm) return 0;
  const used = eingeloestCent(g);
  if (g.bonusCent && !bonusAktiv(g, zeit)) return Math.max(0, (g.bezahltCent || z.betragCent) - Math.max(0, used - g.bonusCent));
  return Math.max(0, gutscheinWertCent(z) - used);
}
const kurzEuro = (c) => euro(c).replace(",00 €", " €");

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
    if (g.wertCent) g.bezahltCent = z.betragCent;
    z.gutschein = g;
    await store.set("idx/gutschein/" + code, `${s.id}/${z.id}`);
    await store.set("idx/gst/" + g.token, `${s.id}/${z.id}`);
    await saveZahlung(z);
    // Shop: reservierte Einheit des Aktions-Gutscheins ist jetzt verkauft
    if (g.reservierung) {
      const r = await reservierungVerkauft(z);
      if (r.ueberverkauft) await notifyAdmin(`⚠️ Gutschein-Shop: Nr. ${g.aktion?.nr} ist ${r.verkauft}× verkauft (Stückzahl ${g.aktion?.stueck})`, s, { Zahlung: z.id, Code: g.code, Tipp: "Zahlung kam nach Ablauf der Reservierung an. Mit dem Studio klären: Gutschein gilt oder Erstattung." });
    }
  }
  if (z.email && !g.gesendetAm) await gutscheinSenden(s, z);
  return z.gutschein;
}

export async function gutscheinSenden(s, z) {
  const g = z.gutschein;
  // Demo-Studio (App-Prüfung) und Testkauf-Studio (Apple-Sandbox): nie echte Mails, aber wie „gesendet“ behandeln, damit die App keinen Fehler zeigt
  if (testKasse(s)) {
    g.gesendetAm = now(); g.gesendetAn = z.email; g.versandOk = true; g.demo = true;
    z.gutschein = g;
    await saveZahlung(z);
    return true;
  }
  const pdf = await gutscheinPdf(s, z);
  const m = mails.gutscheinKaeufer(s, z, { url: gutscheinUrl(g), bonus: bonusSatz(g), shop: g.shop ? shopTexte(s, g.ausgestelltAm) : null });
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

// zusammen: Wortgruppe (z. B. Studioname), die nicht mitten drin umbricht („bei Tattoo / Fashion Munich“), solange sie in eine Zeile passt
function umbrechen(text, font, size, breite, maxZeilen, zusammen = "") {
  const fest = sauber(zusammen), BINDE = " ";
  let t = sauber(text);
  if (fest.includes(" ") && font.widthOfTextAtSize(fest, size) <= breite) t = t.split(fest).join(fest.replace(/ /g, BINDE));
  const woerter = t.split(" ").filter(Boolean), zeilen = [];
  let z = "";
  for (const w of woerter) {
    const probe = z ? z + " " + w : w;
    if (font.widthOfTextAtSize(probe.replaceAll(BINDE, " "), size) <= breite) z = probe;
    else { if (z) zeilen.push(z); z = w; }
  }
  if (z) zeilen.push(z);
  for (let i = 0; i < zeilen.length; i++) zeilen[i] = zeilen[i].replaceAll(BINDE, " ");
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
  // Shop-Gutscheine im Look des Studios (TF: Schwarz/Gold mit Logo), sonst Studiofarbe bzw. Tattoofin-Navy/Gelb
  const marke = g.shop ? shopTexte(s)?.marke : null;
  const navy = hex(marke ? "#0B0B0B" : "#13243d"), gelb = hex(marke?.akzent || "#ffbd16"), grau = hex("#5b6370"), weiss = rgb(1, 1, 1);
  const bandFarbe = marke?.band || (s.branding?.farbe && !hell(s.branding.farbe) ? s.branding.farbe : "#13243d");
  const band = hex(bandFarbe);
  // Das €-Zeichen der Standardschrift zeichnen iPhone/Mac (Vorschau, Mail-App) breiter, als es Platz bekommt → es klebt am
  // nächsten Zeichen („500 €ein“). Darum nach jedem € im selben Textlauf 0,14 em Luft (TJ-Abstand); alle anderen Abstände
  // bleiben die des Betrachters (keine Verschiebung bei langen Zeilen).
  const text = (t, x, y, font, size, color = navy) => {
    const s = sauber(t);
    if (!/€./.test(s)) return page.drawText(s, { x, y, font, size, color });
    const key = page.node.newFontDictionary(font.name, font.ref);
    const teile = pdf.context.obj([]);
    s.split(/(?<=€)/).forEach((teil, i) => { if (i) teile.push(PDFNumber.of(-140)); teile.push(font.encodeText(teil)); });
    page.pushOperators(pushGraphicsState(), beginText(), setFillingColor(color), setFontAndSize(key, size), moveText(x, y), PDFOperator.of("TJ", [teile]), endText(), popGraphicsState());
  };
  const rechts = (t, xr, y, font, size, color) => text(t, xr - font.widthOfTextAtSize(sauber(t), size), y, font, size, color);

  // ---------- Shop-Gutschein (TF München/Landshut, 24.11.2026): Geschenkkarte im Look der Hero-Karte ----------
  // Schwarz-Gold, Rahmen, dunkelrotes Satinband mit Schleife, Logo groß (Hintergrund-Bild je Stadt aus dev/gutschein/pdf-grund.html,
  // fehlt es, werden dieselben Lagen gezeichnet). Für den Beschenkten: „Weihnachts-Gutschein“ statt Aktions-Nummer, Gültigkeit
  // neutral ohne „bezahlt“ (bonusSatz geschenk), Tattoofin nur ganz klein. Lagen von oben in Punkt, wie im Hintergrund-Bild.
  if (marke) {
    const GOLD = hex("#E8CD92"), HELL = hex("#F4EFE6"), CREME = hex("#ECE5D6"), MUTE = hex("#B3AB9C"), RAND = hex("#d9b46e");
    const Y = (top) => H - top, L = 158, LB = 200;
    let grund = null;
    if (marke.grund) { try { const r = await fetch(marke.grund); if (r.ok) grund = await pdf.embedJpg(Buffer.from(await r.arrayBuffer())); } catch { /* gezeichnet */ } }
    if (grund) page.drawImage(grund, { x: 0, y: 0, width: W, height: H });
    else {
      page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: hex("#15120d") });
      page.drawRectangle({ x: 12, y: 12, width: W - 24, height: H - 24, borderColor: RAND, borderWidth: 1.2, borderOpacity: 0.8, opacity: 0 });
      const rot = hex("#8f1825");
      page.drawRectangle({ x: 92, y: 13, width: 26, height: H - 26, color: rot, borderColor: RAND, borderWidth: 0.8 });
      page.drawRectangle({ x: 13, y: Y(114), width: W - 26, height: 26, color: rot, borderColor: RAND, borderWidth: 0.8 });
      const sl = { x: 105, y: Y(101), scale: 0.59, color: hex("#9a1b29"), borderColor: RAND, borderWidth: 1.6 };
      ["M-4 6C-14 40-30 74-50 112L-30 104-18 124C-8 88 0 50 6 10Z", "M4 6C16 38 34 70 60 104L68 86 84 92C60 62 34 32 12 4Z", "M-6-2C-34-52-118-78-128-34-136 4-84 22-6 6Z", "M6-2C34-52 118-78 128-34 136 4 84 22 6 6Z",
        "M-8-17H8A11 11 0 0 1 19-6V6A11 11 0 0 1 8 17H-8A11 11 0 0 1-19 6V-6A11 11 0 0 1-8-17Z"].forEach((d) => page.drawSvgPath(d, sl));
      let logo = null;
      try { const r = await fetch(marke.logo); if (r.ok) logo = await pdf.embedPng(Buffer.from(await r.arrayBuffer())); } catch { /* ohne Logo */ }
      if (logo) { const lw = 190, lh = (logo.height * lw) / logo.width; page.drawImage(logo, { x: 376, y: Y(132) - lh, width: lw, height: lh }); }
      const wort = "G U T S C H E I N";
      text(wort, 150 + (W - 170 - 150 - fb.widthOfTextAtSize(wort, 11)) / 2, Y(56), fb, 11, GOLD);
      page.drawRectangle({ x: 372, y: Y(378), width: 198, height: 126, color: hex("#0B0B0B"), borderColor: RAND, borderWidth: 1 });
    }
    // Links: für wen, Betrag, Art, Gruß; unten die Gültigkeit
    let top = 150;
    if (g.empfaenger) { for (const z1 of umbrechen("für " + g.empfaenger, fb, 17, LB, 1)) text(z1, L, Y(top), fb, 17, HELL); top += 56; } else top += 36;
    const betrag = kurzEuro(gutscheinWertCent(z));
    let bs = 58; while (bs > 34 && fb.widthOfTextAtSize(betrag, bs) > LB + 10) bs -= 2;
    text(betrag, L - 2, Y(top), fb, bs, GOLD);
    top += 22;
    const art = g.aktion ? "Weihnachts-Gutschein" : "Gutschein";
    for (const z1 of umbrechen(`${art} für alle Leistungen bei ${s.firma}`, f, 10.5, LB, 2, s.firma)) { text(z1, L, Y(top), f, 10.5, MUTE); top += 14; }
    const gilt = g.bonusCent ? bonusSatz({ ...g, gueltigBis: g.gueltigBis || gueltigBis() }, { geschenk: true }) : `Gültig bis ${datum(g.gueltigBis || gueltigBis())}. In Teilen einlösbar.`;
    const gz = umbrechen(gilt, fb, 9.5, LB, 4), gTop = 366 - (gz.length - 1) * 12.5;
    gz.forEach((z1, i) => text(z1, L, Y(gTop + i * 12.5), fb, 9.5, GOLD));
    const gruss = sauber(g.nachricht);
    if (gruss) {
      top += 8;
      const platz = Math.max(1, Math.min(3, Math.floor((gTop - 16 - top) / 15) + 1));
      for (const z1 of umbrechen("„" + gruss + "“", fi, 11.5, LB, platz)) { text(z1, L, Y(top), fi, 11.5, CREME); top += 15; }
    }
    // Rechts unten: Code-Kasten (Fläche im Hintergrund) mit QR-Code
    text("Gutschein-Code", 384, Y(272), f, 9, MUTE);
    text(g.code || "wird nach Zahlung vergeben", 384, Y(297), g.code ? fm : f, g.code ? 16 : 10, HELL);
    if (g.code && g.token) {
      const m = qrMatrix(gutscheinUrl(g)), gesamt = 62, modul = gesamt / (m.n + 4), qx = 372 + 198 - 12 - gesamt, qy = Y(366);
      page.drawRectangle({ x: qx, y: qy, width: gesamt, height: gesamt, color: weiss });
      for (let r = 0; r < m.n; r++) for (let c = 0; c < m.n; c++) {
        if (m.dunkel(r, c)) page.drawRectangle({ x: qx + (c + 2) * modul, y: qy + gesamt - (r + 3) * modul, width: modul + 0.02, height: modul + 0.02, color: hex("#0B0B0B") });
      }
      text("Beim Termin den Code", 384, Y(346), f, 8.5, MUTE);
      text("oder QR-Code zeigen.", 384, Y(357), f, 8.5, MUTE);
    } else text("Bitte beim Termin angeben.", 384, Y(357), f, 8.5, MUTE);
    // Fuß: wo einlösen; Tattoofin nur ganz klein
    const adr = [s.strasse, [s.plz, s.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    const tf = "Technik: Tattoofin", tfB = f.widthOfTextAtSize(tf, 6.5);
    const [fuss] = umbrechen(`Einlösbar bei ${s.firma}${adr ? ", " + adr : ""}`, f, 8.5, W - 25 - L - tfB - 16, 1);
    text(fuss, L, Y(390), f, 8.5, MUTE);
    rechts(tf, W - 25, Y(390), f, 6.5, hex("#7d7569"));
    return pdf.save();
  }

  // Rahmen + Kopfband in Studiofarbe (Rückfall Tattoofin-Navy)
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(0.984, 0.98, 0.965) });
  page.drawRectangle({ x: 14, y: 14, width: W - 28, height: H - 28, color: weiss, borderColor: rgb(0.9, 0.89, 0.86), borderWidth: 1 });
  const bandH = 104, bandY = H - 14 - bandH;
  page.drawRectangle({ x: 14, y: bandY, width: W - 28, height: bandH, color: band });
  page.drawRectangle({ x: 14, y: bandY - 5, width: W - 28, height: 5, color: gelb });

  let bild = await bildFuer(pdf, s);
  if (!bild && marke?.logo) {
    try { const r = await fetch(marke.logo); if (r.ok) bild = { img: await pdf.embedPng(Buffer.from(await r.arrayBuffer())), hellesLogo: true }; } catch { /* ohne Logo */ }
  }
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
  text(kurzEuro(gutscheinWertCent(z)), R + 6, y, fb, 52, navy);
  // Links bis vor den Code-Kasten umbrechen (lange Studionamen liefen sonst unter den Kasten)
  const linksMax = W - R - 210 - (R + 8) - 14;
  let ay = y - 20;
  const art = g.aktion ? `Aktions-Gutschein Nr. ${g.aktion.nr}` : "Wertgutschein";
  for (const zeile of umbrechen(art + " · für alle Leistungen bei " + s.firma, f, 12, linksMax, 2, s.firma)) { text(zeile, R + 8, ay, f, 12, grau); ay -= 15; }
  // Aktions-Gutschein: Bonus-Frist deutlich unter dem Betrag (Seite, PDF und Mail sagen dasselbe, Text aus bonusSatz)
  if (g.bonusCent) {
    ay -= 3;
    for (const zeile of umbrechen(bonusSatz({ ...g, gueltigBis: g.gueltigBis || gueltigBis() }), fb, 10, linksMax, 3)) { text(zeile, R + 8, ay, fb, 10, navy); ay -= 13; }
  }
  let my = ay - 11;
  for (const zeile of umbrechen(sauber(g.nachricht) ? "„" + sauber(g.nachricht) + "“" : "", fi, 12, Math.min(300, linksMax), g.bonusCent ? 2 : 3)) { text(zeile, R + 6, my, fi, 12, grau); my -= 16; }

  // Code-Kasten rechts. Seit 13.11.2026 mit QR-Code (Link gutschein.html?t=…), den die Tattoofin-App beim Termin scannt.
  // Gutscheine ohne Token (vor der Zahlung) bekommen keinen QR; ältere, schon verschickte PDFs haben keinen (dort hilft die Code-Erkennung der App).
  const mitQr = Boolean(g.code && g.token);
  const kx = W - R - 210, kw = 210, kh = mitQr ? 133 : 92, ky = bandY - 58 - kh; // Oberkante wie bisher
  page.drawRectangle({ x: kx, y: ky, width: kw, height: kh, color: hex(marke?.kasten || "#fff5d6"), borderColor: hex(marke?.akzent || "#f5d77a"), borderWidth: 1.2 });
  text("Gutschein-Code", kx + 14, ky + kh - 22, f, 10, grau);
  text(g.code || "wird nach Zahlung vergeben", kx + 14, ky + kh - 52, g.code ? fm : f, g.code ? 21 : 11, navy);
  if (mitQr) {
    const m = qrMatrix(gutscheinUrl(g));
    const gesamt = 66, modul = gesamt / (m.n + 4), qx = kx + kw - 12 - gesamt, qy = ky + 10;
    page.drawRectangle({ x: qx, y: qy, width: gesamt, height: gesamt, color: weiss });
    for (let r = 0; r < m.n; r++) for (let c = 0; c < m.n; c++) {
      if (m.dunkel(r, c)) page.drawRectangle({ x: qx + (c + 2) * modul, y: qy + gesamt - (r + 3) * modul, width: modul + 0.02, height: modul + 0.02, color: navy });
    }
    text("Beim Termin den Code", kx + 14, ky + 30, f, 9.5, grau);
    text("oder QR-Code zeigen.", kx + 14, ky + 17, f, 9.5, grau);
  } else text("Bitte beim Termin angeben.", kx + 14, ky + 14, f, 9.5, grau);

  // Fuß: Daten + Einlöseort
  const adr = [s.strasse, [s.plz, s.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  page.drawLine({ start: { x: R, y: 92 }, end: { x: W - R, y: 92 }, thickness: 0.6, color: rgb(0.88, 0.87, 0.84) });
  text(g.bonusCent
    ? `Ausgestellt am ${datum(g.ausgestelltAm || now())}  ·  ${kurzEuro(gutscheinWertCent(z))} bis ${datum(g.bonusBis)}  ·  danach ${kurzEuro(g.bezahltCent || z.betragCent)} bis ${datum(g.gueltigBis || gueltigBis())}`
    : `Ausgestellt am ${datum(g.ausgestelltAm || now())}   ·   Gültig bis ${datum(g.gueltigBis || gueltigBis())}`, R + 6, 72, fb, 10.5, navy);
  text(`Einlösbar bei ${s.firma}${adr ? ", " + adr : ""}`, R + 6, 56, f, 10.5, navy);
  text(`Der Gutschein wurde von ${s.firma} ausgestellt und über Tattoofin verkauft und bezahlt.`, R + 6, 34, f, 8, grau);
  rechts("tattoofin", W - R - 6, 34, fb, 9, grau);
  return pdf.save();
}
