// Gutschein-Shop: statische Seiten je Stadt aus einer Vorlage + Konfiguration (SHOPS in netlify/functions/_lib/gutschein-shop.mjs).
//   node dev/gutschein-seiten.mjs                         → public/gutschein-kaufen/<slug>.html (+ -impressum, -datenschutz, -widerruf, -bedingungen)
//   node dev/gutschein-seiten.mjs --og                    → zusätzlich alle Bilder je Stadt (Playwright): Vorschaubild og-weihnachten.jpg,
//                                                           Hero-Geschenk geschenk-*.webp/png, Gutschein-Muster pdf-muster.webp/jpg (das echte
//                                                           PDF mit Muster-Code, gerendert mit macOS Quick Look), Symbole icon-32/180/192.png
//   node dev/gutschein-seiten.mjs --vorschau <ordner>     → zusätzlich WhatsApp-Vorschau (groß + kleines Quadrat) als PNG je Stadt
//   node dev/gutschein-seiten.mjs --basis https://…       → absolute Adressen (og:url, og:image) für eine andere Site, z. B. den Entwurf
// Netlify liefert /gutschein-kaufen/<slug> direkt aus <slug>.html (ohne Umleitung), unbekannte Slugs → 404.
// Wichtig: Eingecheckt wird immer der Stand mit --basis https://tattoofin.de (Standard). Für den Entwurf vor dem Hochladen mit
// --basis erzeugen und danach wieder ohne.
// Einmalig erzeugt (nicht mit diesem Skript): logo-gold-*.webp/png (Logo im Gold-Verlauf der Seite, scharf bis 1.400 px) und
// b-*.jpg (Bildstreifen, 600×800, ohne Personen und Wasserzeichen zugeschnitten), Quellen in public/assets/gs-shop/<kuerzel>/LIZENZ.txt.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const BASIS = (arg("--basis") || "https://tattoofin.de").replace(/\/$/, "");
const MIT_OG = process.argv.includes("--og");
const VORSCHAU = arg("--vorschau");
// Das Gutschein-Muster (--og) zeigt den QR-Code mit der echten Adresse, nicht localhost
if (MIT_OG && !process.env.SITE_URL) process.env.SITE_URL = "https://tattoofin.de";

const { SHOPS, bedingungen, widerruf, aktionEndeIso, bonusBisIso } = await import("../netlify/functions/_lib/gutschein-shop.mjs");
const { gueltigBis } = await import("../netlify/functions/_lib/gutschein.mjs");
const { jetzt } = await import("../netlify/functions/_lib/config.mjs");

const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fuelle = (vorlage, w) => vorlage
  .replace(/\{\{\{(\w+)\}\}\}/g, (_, k) => { if (!(k in w)) throw new Error(`Platzhalter {{{${k}}}} fehlt`); return String(w[k]); })
  .replace(/\{\{(\w+)\}\}/g, (_, k) => { if (!(k in w)) throw new Error(`Platzhalter {{${k}}} fehlt`); return esc(w[k]); });
const vorlage = (n) => fs.readFileSync(path.join(root, "dev/gutschein", n), "utf8");
const ZAHL = (c) => (c / 100).toLocaleString("de-DE", { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 });
// Geschütztes Leerzeichen vor dem €: das Zeichen rutscht nie allein in die nächste Zeile
const EURO = (c) => ZAHL(c) + " €";
const DATUM = (iso) => new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" });
const hash = (f) => (fs.existsSync(f) ? crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex").slice(0, 8) : "neu");
const r1 = (n) => Math.round(n * 10) / 10;

const ziel = path.join(root, "public/gutschein-kaufen");
fs.mkdirSync(ziel, { recursive: true });
const geschrieben = new Set();
const schreibe = (name, html) => { fs.writeFileSync(path.join(ziel, name), html); geschrieben.add(name); };

// Studio-Angaben für die Texte (wie im Speicher der echten Site)
const studioAus = (slug, c) => ({ slug, firma: c.seite.firma, strasse: c.anbieter.strasse, plz: c.anbieter.plz, ort: c.anbieter.ort });

// ---------- Weihnachts-Grafik (nur Linien und Flächen, keine Fotos, keine KI-Bilder) ----------
// Goldener Tannenzweig als Linienzeichnung, gleichmäßig berechnet: Hauptast von oben links nach unten rechts, drei Seitenäste,
// Nadeln schräg nach vorn, auf Wunsch drei dunkelrote Beeren.
function zweig(cls, { beeren = true } = {}) {
  const Q = (t, a, c, b) => [(1 - t) ** 2 * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1]];
  const R = (t, a, c, b) => { const x = 2 * (1 - t) * (c[0] - a[0]) + 2 * t * (b[0] - c[0]), y = 2 * (1 - t) * (c[1] - a[1]) + 2 * t * (b[1] - c[1]), l = Math.hypot(x, y); return [x / l, y / l]; };
  let stiel = "", nadel = "";
  const ast = (a, c, b, laenge, schritt) => {
    stiel += `M${r1(a[0])} ${r1(a[1])}Q${r1(c[0])} ${r1(c[1])} ${r1(b[0])} ${r1(b[1])}`;
    for (let t = 0.05; t <= 1.0001; t += schritt) {
      const p = Q(t, a, c, b), [dx, dy] = R(t, a, c, b), L = laenge * (1 - 0.6 * t);
      for (const w of [0.9, -0.9]) { const nx = dx * Math.cos(w) - dy * Math.sin(w), ny = dx * Math.sin(w) + dy * Math.cos(w); nadel += `M${r1(p[0])} ${r1(p[1])}l${r1(nx * L)} ${r1(ny * L)}`; }
    }
  };
  const A = [-6, -4], C = [92, 14], B = [214, 150];
  ast(A, C, B, 21, 0.034);
  const s1 = Q(0.34, A, C, B); ast(s1, [s1[0] + 46, s1[1] + 4], [s1[0] + 84, s1[1] + 52], 14, 0.07);
  const s2 = Q(0.6, A, C, B); ast(s2, [s2[0] + 6, s2[1] + 30], [s2[0] - 6, s2[1] + 64], 12, 0.085);
  const s3 = Q(0.16, A, C, B); ast(s3, [s3[0] + 10, s3[1] + 24], [s3[0] + 2, s3[1] + 52], 11, 0.095);
  const b = beeren ? [[s1[0] + 6, s1[1] + 14, 4.2], [s1[0] + 15, s1[1] + 9, 3.6], [s1[0] + 12, s1[1] + 20, 3.4]]
    .map(([x, y, rr]) => `<circle cx="${r1(x)}" cy="${r1(y)}" r="${rr}" fill="#8e1824" stroke="#d9b46e" stroke-width=".9"/>`).join("") : "";
  return `<svg class="${cls}" viewBox="0 0 220 170" fill="none" stroke="currentColor" stroke-linecap="round" aria-hidden="true"><path d="${stiel}" stroke-width="1.7"/><path d="${nadel}" stroke-width="1.05"/>${b}</svg>`;
}
// Schleife wie auf dem Geschenk im Hero (dev/gutschein/geschenk.html), hier für das Gutschein-Muster
const SCHLEIFE = `<svg class="schleife" viewBox="-140 -86 280 220" aria-hidden="true"><defs><linearGradient id="pv" x1="0" x2="1"><stop offset="0" stop-color="#4c0b13"/><stop offset=".5" stop-color="#c0394a"/><stop offset="1" stop-color="#4c0b13"/></linearGradient><linearGradient id="pl" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#c63c4d"/><stop offset=".45" stop-color="#9a1b29"/><stop offset="1" stop-color="#560c15"/></linearGradient><linearGradient id="pr" x1="1" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#c63c4d"/><stop offset=".45" stop-color="#9a1b29"/><stop offset="1" stop-color="#560c15"/></linearGradient></defs>`
  + `<path d="M-4 6C-14 40-30 74-50 112L-30 104-18 124C-8 88 0 50 6 10Z" fill="url(#pl)" stroke="#d9b46e" stroke-width="1.4"/><path d="M4 6C16 38 34 70 60 104L68 86 84 92C60 62 34 32 12 4Z" fill="url(#pr)" stroke="#d9b46e" stroke-width="1.4"/>`
  + `<path d="M-6-2C-34-52-118-78-128-34-136 4-84 22-6 6Z" fill="url(#pl)" stroke="#d9b46e" stroke-width="1.6"/><path d="M-14-2C-44-30-92-44-104-28-96-14-58-2-14 2Z" fill="#3a060c" opacity=".55"/>`
  + `<path d="M6-2C34-52 118-78 128-34 136 4 84 22 6 6Z" fill="url(#pr)" stroke="#d9b46e" stroke-width="1.6"/><path d="M14-2C44-30 92-44 104-28 96-14 58-2 14 2Z" fill="#3a060c" opacity=".55"/>`
  + `<rect x="-19" y="-17" width="38" height="34" rx="11" fill="url(#pv)" stroke="#d9b46e" stroke-width="1.6"/></svg>`;
// Schlichte goldene Linien-Symbole (statt Ziffern, Emojis oder „31.3“)
const IC = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICONS = {
  icKalender: IC('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M7.5 13.8h2M11 13.8h2M14.5 13.8h2M7.5 17.2h2M11 17.2h2"/>'),
  icTeile: IC('<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5V12h8.5M12 12l-6 6"/>'),
  icPost: IC('<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="m3.8 7 8.2 6.2L20.2 7"/>'),
  icStift: IC('<path d="M15.5 4.5l4 4L9 19l-5 1 1-5z"/><path d="M13.5 6.5l4 4"/>'),
  icGeschenk: IC('<rect x="4" y="10" width="16" height="10.5" rx="1.5"/><rect x="2.8" y="7" width="18.4" height="3.2" rx="1"/><path d="M12 7v13.5M12 7C10.6 3.6 6.4 3 6.4 5.4 6.4 6.8 9.4 7 12 7zm0 0c1.4-3.4 5.6-4 5.6-1.6 0 1.4-3 1.6-5.6 1.6z"/>'),
  icKarte: IC('<rect x="2.5" y="5.5" width="19" height="13" rx="2.5"/><path d="M2.5 10h19M6 15h4"/>'),
  icRoute: IC('<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>'),
  icWhatsapp: IC('<path d="M4.3 19.7l1.3-3.9a8.1 8.1 0 1 1 3 2.8z"/><path d="M9.3 8.6c.2 2.8 3 5.5 6 6l.9-1.4-1.9-1-.9.8c-1-.5-1.9-1.4-2.4-2.4l.8-.9-1-1.9z"/>'),
};

function werte(slug, c) {
  const p = c.seite, a = c.anbieter, alle = c.aktionen.reduce((s, x) => s + x.stueck, 0);
  const bonusBis = bonusBisIso(c), gBis = gueltigBis(jetzt());
  const nachBonus = new Date(new Date(bonusBis).getTime() + 2 * 3600e3);
  const ogDatei = path.join(root, `public/assets/gs-shop/${p.kuerzel}/og-weihnachten.jpg`);
  // Hero und Vorschau zeigen den 500-€-Gutschein (wie die Werbung), dazu den günstigsten („schon ab 200 €“)
  const nr4 = c.aktionen.find((x) => x.id === "nr4"), ab = [...c.aktionen].sort((x, y) => x.preisCent - y.preisCent)[0];
  const spanne = `${ZAHL(c.frei.minCent)}–${EURO(c.frei.maxCent)}`;
  const geschenk = [480, 960, 1400].map((w) => `/assets/gs-shop/${p.kuerzel}/geschenk-${w}.webp ${w}w`).join(", ");
  // Startzustand der Liste (das Skript ersetzt ihn mit den echten Stückzahlen): solange nichts weg ist „Nur 6 Stück“
  const karte = (x) => `<button type="button" class="zeile" data-wahl="${x.id}"><span class="wert g">${EURO(x.wertCent)}</span><span class="preis">du zahlst <b>${EURO(x.preisCent)}</b></span>`
    + `<span class="chip">${EURO(x.wertCent - x.preisCent)} geschenkt</span><span class="rest">Nur ${x.stueck} Stück</span></button>`;
  return {
    slug, kuerzel: p.kuerzel, name: p.name, firma: p.firma, stadt: p.stadt, strasse: a.strasse, plz: a.plz, ort: a.ort,
    telefon: p.telefon, telefonLink: p.telefonLink, whatsapp: p.whatsapp, instagram: p.instagram, pixel: p.pixel,
    sterne: p.google.sterne, sternProzent: Math.round((Number(p.google.sterne.replace(",", ".")) / 5) * 1000) / 10,
    bewertungen: p.google.anzahl, googleStand: p.google.stand, mapsQuery: encodeURIComponent(p.google.suche),
    waText: encodeURIComponent(`Hallo, ich habe eine Frage zu den Tattoo-Gutscheinen bei ${p.name}.`),
    stueckAlle: alle, bonusBis: DATUM(bonusBis), gueltigBis: DATUM(gBis), nachBonus: DATUM(nachBonus),
    heroWert: EURO(nr4.wertCent), heroPreis: EURO(nr4.preisCent), abPreis: EURO(ab.preisCent), abWert: EURO(ab.wertCent), freiSpanne: spanne,
    cdT: "–", cdH: "–", cdM: "–", cdS: "–",
    titel: `Weihnachts-Gutscheine unter Wert · ${p.name}`,
    // WhatsApp/Facebook: fette Zeile mit Studio, darunter das Angebot mit richtiger Stückzahl (21 = alle Aktions-Gutscheine zusammen)
    ogTitel: `${p.name}: Weihnachts-Gutscheine unter Wert`,
    // Nur zwei Zeilen sichtbar: das Datum steht schon groß im Bild
    ogText: `${EURO(nr4.wertCent)} Gutschein für ${EURO(nr4.preisCent)}, auch ${EURO(ab.wertCent)} für ${EURO(ab.preisCent)}. Insgesamt nur ${alle} Stück.`,
    ogAlt: `${p.name}: Weihnachts-Aktion, ${EURO(nr4.wertCent)} Gutschein für ${EURO(nr4.preisCent)}, nur bis 24.12., 16 Uhr`,
    seitenUrl: `${BASIS}/gutschein-kaufen/${slug}`,
    ogBild: `${BASIS}/assets/gs-shop/${p.kuerzel}/og-weihnachten.jpg?v=${hash(ogDatei)}`,
    ogDatei, geschenkSrcset: geschenk,
    zweigLinks: zweig("zweig l"), zweigRechts: zweig("zweig r", { beeren: false }), zweigPdf: zweig("zweig-pdf", { beeren: false }), schleife: SCHLEIFE, ...ICONS,
    karten: c.aktionen.map(karte).join("") +
      `<button type="button" class="zeile frei" data-wahl="frei"><span class="wert">Eigener Betrag</span><span class="preis">Wertgutschein, ${spanne}</span><span class="pfeil" aria-hidden="true">→</span></button>`,
    zeiten: p.zeiten.map(([t, z]) => `<tr><td>${esc(t)}</td><td>${esc(z)}</td></tr>`).join(""),
    seiteJson: JSON.stringify({ slug, kuerzel: p.kuerzel, stadt: p.stadt, bilder: p.bilder, aktionBis: aktionEndeIso(c) }).replace(/</g, "\\u003c"),
  };
}


const RECHT = [
  ["impressum", "Impressum"],
  ["datenschutz", "Datenschutz"],
  ["widerruf", "Widerrufsbelehrung"],
  ["bedingungen", "Gutscheinbedingungen"],
];

function rechtInhalt(art, slug, c, w) {
  const a = c.anbieter, s = studioAus(slug, c);
  const P = (t) => `<p>${esc(t)}</p>`;
  if (art === "impressum") return `<div class="kasten"><p><strong>Verkäufer der Gutscheine</strong><br>${[a.name, a.rechtsform, a.strasse, `${a.plz} ${a.ort}`, a.email ? `E-Mail: <a href="mailto:${esc(a.email)}">${esc(a.email)}</a>` : "", a.telefon ? `Telefon: <a href="tel:${esc(a.telefon.replace(/\s/g, ""))}">${esc(a.telefon)}</a>` : "", a.ustid ? `USt-IdNr.: ${esc(a.ustid)}` : ""].filter(Boolean).map((x) => (/^<|E-Mail|Telefon|USt/.test(x) ? x : esc(x))).join("<br>")}</p></div>`
    + P("Technik für Shop, Zahlung und Gutschein-Versand: Tattoofin. Bezahlt wird sicher über Stripe.")
    + `<p><a href="/impressum.html">Impressum Tattoofin</a></p>`;
  if (art === "widerruf") { const wd = widerruf(s, c); return wd.text.map(P).join("") + `<h2>Muster-Widerrufsformular</h2>` + P(wd.formular.replace(/^Muster-Widerrufsformular\s*/, "")); }
  if (art === "bedingungen") return `<ol>${bedingungen(s, c, jetzt(), { seite: true }).map((t) => `<li>${esc(t)}</li>`).join("")}</ol>`;
  // Datenschutz
  return [
    ["Verantwortlich", `Für den Kauf der Gutscheine verantwortlich ist der Verkäufer: ${a.name}, ${a.strasse}, ${a.plz} ${a.ort}, E-Mail ${a.email}, Telefon ${w.telefon}. Die Technik für Shop, Zahlung und Gutschein-Versand stellt Tattoofin im Auftrag des Studios bereit (Auftragsverarbeitung, Art. 28 DSGVO).`],
    ["Deine Bestellung", "Für den Kauf verarbeiten wir deinen Namen, deine E-Mail-Adresse, den gewählten Gutschein und freiwillig den Namen des Beschenkten und deinen Gruß. Damit erstellen wir den Gutschein mit Code, schicken ihn dir per E-Mail und das Studio kann ihn beim Termin einlösen (Art. 6 Abs. 1 lit. b DSGVO). Rechnungsdaten heben wir so lange auf, wie es das Steuer- und Handelsrecht verlangt (Art. 6 Abs. 1 lit. c DSGVO). Damit die Stückzahl stimmt und niemand alle Gutscheine blockiert, speichern wir während der Kasse für höchstens 33 Minuten eine gekürzte, verschlüsselte Kennung deines Anschlusses (Art. 6 Abs. 1 lit. f DSGVO). Damit du nach dem Zurückkommen aus der Kasse nichts neu eintippen musst, merkt sich dein Browser deine Auswahl, deinen Namen und deine E-Mail-Adresse, bis du den Tab schließt. Das bleibt nur auf deinem Gerät."],
    ["Zahlung über Stripe", "Bezahlt wird über Stripe (Stripe Payments Europe Ltd., Irland). Stripe verarbeitet deine Zahlungsdaten und, falls für die Zahlung nötig, deine Rechnungsadresse, um die Zahlung abzuwickeln und Betrug zu verhindern (Art. 6 Abs. 1 lit. b und f DSGVO). Kartendaten sehen weder das Studio noch Tattoofin. Datenschutz bei Stripe: stripe.com/de/privacy."],
    ["Hosting und E-Mail", "Die Seite liegt bei Netlify (Netlify, Inc., USA, mit EU-Standardvertragsklauseln). Beim Aufruf verarbeitet der Server technisch nötige Daten wie IP-Adresse, Zeitpunkt und Browsertyp (Art. 6 Abs. 1 lit. f DSGVO). Schriften und Bilder kommen von dieser Seite selbst. Die Gutschein-Mail wird über den Mail-Dienst von Tattoofin versendet."],
    ["Reichweitenmessung ohne Cookies (Umami)", "Wir zählen mit Umami (Umami Software, Inc., USA), wie oft die Seite aufgerufen wird und welche Schritte des Kaufs genutzt werden. Umami setzt keine Cookies und speichert keine IP-Adressen (Art. 6 Abs. 1 lit. f DSGVO)."],
    ["Meta-Pixel", "Auf dieser Seite lädt das Meta-Pixel (Meta Platforms Ireland Ltd.). Es misst, ob unsere Werbung auf Instagram und Facebook dich hierher gebracht hat, ob du den Kauf beginnst und ob er abgeschlossen wird (ohne Namen, E-Mail oder Zahlungsdaten). Dabei setzt Meta Cookies, Daten können in die USA übertragen werden (EU-US Data Privacy Framework). Du kannst widersprechen, indem du in deinem Browser Cookies von Drittanbietern blockierst oder in deinen Meta-Einstellungen unter „Werbepräferenzen“ die Nutzung von Daten von Partnern abschaltest."],
    ["WhatsApp", "Tippst du auf „Per WhatsApp fragen“, öffnet sich WhatsApp (WhatsApp Ireland Ltd.) mit einer vorbereiteten Nachricht an das Studio (Art. 6 Abs. 1 lit. b DSGVO)."],
    ["Deine Rechte", "Du hast das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit und Widerspruch sowie auf Beschwerde bei einer Datenschutz-Aufsichtsbehörde."],
  ].map(([h, t]) => `<h2>${esc(h)}</h2>${P(t)}`).join("");
}


const browserNoetig = MIT_OG || VORSCHAU;
let browser = null;
if (browserNoetig) {
  const require = createRequire(import.meta.url);
  let chromium;
  try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("/opt/node22/lib/node_modules/playwright")); }
  browser = await chromium.launch();
}
const ASSETS = path.join(root, "public/assets/gs-shop");
async function rendern(html, datei, { breite, hoehe, dpr = 1, jpeg = false, element = null, durchsichtig = false }) {
  const tmp = path.join(ASSETS, `.render-${process.pid}.html`);
  fs.writeFileSync(tmp, html);
  const p = await browser.newPage({ viewport: { width: breite, height: hoehe }, deviceScaleFactor: dpr });
  try {
    await p.goto(pathToFileURL(tmp).href, { waitUntil: "load" });
    await p.evaluate(() => document.fonts.ready);
    const opts = { path: datei, omitBackground: durchsichtig, ...(jpeg ? { type: "jpeg", quality: 88 } : {}) };
    if (element) await p.locator(element).screenshot(opts); else await p.screenshot(opts);
  } finally { await p.close(); fs.rmSync(tmp, { force: true }); }
}
// Bild in Größen/Formate umrechnen (Chromium schreibt WebP, kein Zusatzprogramm nötig)
async function umrechnen(quelle, ziele) {
  const p = await browser.newPage();
  try {
    const daten = fs.readFileSync(quelle).toString("base64"), typ = quelle.endsWith(".png") ? "image/png" : "image/jpeg";
    for (const z of ziele) {
      const url = await p.evaluate(async ({ daten, typ, z }) => {
        const img = new Image(); img.src = `data:${typ};base64,${daten}`; await img.decode();
        const w = z.breite, h = Math.round((img.naturalHeight * w) / img.naturalWidth);
        const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
        const cx = cv.getContext("2d"); cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = "high";
        if (z.grund) { cx.fillStyle = z.grund; cx.fillRect(0, 0, w, h); }
        cx.drawImage(img, 0, 0, w, h);
        return cv.toDataURL(z.typ, z.q);
      }, { daten, typ, z });
      fs.writeFileSync(z.datei, Buffer.from(url.split(",")[1], "base64"));
    }
  } finally { await p.close(); }
}
// Symbol für Browser-Tab und iPhone-Startbildschirm: „TF“ in Gold auf Schwarz mit goldenem Rand
const ICON_HTML = (assets) => `<!doctype html><html><head><meta charset="utf-8"><style>@font-face{font-family:"Oswald";font-weight:500 700;src:url(${assets}/schrift/oswald-latin.woff2) format("woff2")}
*{margin:0;padding:0;box-sizing:border-box}html,body{width:512px;height:512px;background:#0B0B0B}
#i{position:relative;width:512px;height:512px;display:flex;align-items:center;justify-content:center;background:radial-gradient(70% 70% at 50% 35%,#2a2114,#0B0B0B 75%)}
#i:before{content:"";position:absolute;inset:34px;border:9px solid #C8A35A;border-radius:96px}
#i b{font:700 268px/1 Oswald;letter-spacing:-.01em;margin-top:-8px;background:linear-gradient(180deg,#F6E7C3 0%,#E8CD92 40%,#C8A35A 75%,#A9843F 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
</style></head><body><div id="i"><b>TF</b></div></body></html>`;

// Gutschein-Muster: das echte PDF des Shops (gutscheinPdf) mit Muster-Code, der nie vergeben wird (enthält 0 und 1, die im Code-Alphabet fehlen)
async function pdfMuster(slug, c, dir) {
  const ql = spawnSync("which", ["qlmanage"]).status === 0;
  if (!ql) { console.log("  ! Gutschein-Muster übersprungen (macOS Quick Look fehlt)"); return; }
  const gs = await import("../netlify/functions/_lib/gutschein.mjs");
  const a = c.aktionen.find((x) => x.id === "nr4");
  const s = { id: "st_muster", firma: c.seite.firma, slug, strasse: c.anbieter.strasse, plz: c.anbieter.plz, ort: c.anbieter.ort };
  const z = { id: "zl_muster", studioId: s.id, betragCent: a.preisCent, status: "bezahlt", gutschein: { shop: true, code: "GS-MUST-ER01", token: "muster", empfaenger: "Alex",
    nachricht: "Frohe Weihnachten! Such dir was Schönes aus.", aktion: { id: a.id, nr: a.nr, stueck: a.stueck }, wertCent: a.wertCent, bezahltCent: a.preisCent,
    bonusCent: a.wertCent - a.preisCent, bonusBis: bonusBisIso(c), ausgestelltAm: jetzt().toISOString() } };
  // Das Logo holt gutscheinPdf über die Website-Adresse → hier aus dem Ordner public/ lesen
  const echt = globalThis.fetch;
  globalThis.fetch = async (u, o) => { const m = /\/assets\/gs-shop\/.+$/.exec(String(u)); return m ? new Response(fs.readFileSync(path.join(root, "public", m[0])), { status: 200 }) : echt(u, o); };
  const tmp = fs.mkdtempSync(path.join(dir, ".pdf-"));
  try {
    fs.writeFileSync(path.join(tmp, "muster.pdf"), Buffer.from(await gs.gutscheinPdf(s, z)));
    spawnSync("qlmanage", ["-t", "-s", "1600", "-o", tmp, path.join(tmp, "muster.pdf")], { stdio: "ignore" });
    const png = path.join(tmp, "muster.pdf.png");
    if (!fs.existsSync(png)) { console.log("  ! Gutschein-Muster: Quick Look lieferte kein Bild"); return; }
    await umrechnen(png, [{ breite: 1200, typ: "image/webp", q: 0.86, datei: path.join(dir, "pdf-muster.webp") }, { breite: 1200, typ: "image/jpeg", q: 0.84, grund: "#ffffff", datei: path.join(dir, "pdf-muster.jpg") }]);
  } finally { globalThis.fetch = echt; fs.rmSync(tmp, { recursive: true, force: true }); }
}

async function bilder(slug, c) {
  const k = c.seite.kuerzel, dir = path.join(ASSETS, k), assets = pathToFileURL(ASSETS).href;
  // 1. Hero-Geschenk (durchsichtig, doppelte Dichte → 1600 px) in 480/960/1400 WebP + 960 PNG als Ersatz
  const voll = path.join(dir, ".geschenk-voll.png");
  await rendern(fuelle(vorlage("geschenk.html"), { assets, kuerzel: k }), voll, { breite: 800, hoehe: 540, dpr: 2, durchsichtig: true, element: "#g" });
  await umrechnen(voll, [480, 960, 1400].map((b) => ({ breite: b, typ: "image/webp", q: 0.9, datei: path.join(dir, `geschenk-${b}.webp`) }))
    .concat([{ breite: 960, typ: "image/png", datei: path.join(dir, "geschenk-960.png") }]));
  // 2. Vorschaubild WhatsApp/Facebook 1200×630 (Mitte als Quadrat allein lesbar)
  const nr4 = c.aktionen.find((x) => x.id === "nr4"), ab = [...c.aktionen].sort((x, y) => x.preisCent - y.preisCent)[0];
  const og = fuelle(vorlage("og.html"), { assets, kuerzel: k, geschenk: pathToFileURL(voll).href, wert: EURO(nr4.wertCent), preis: EURO(nr4.preisCent), abPreis: EURO(ab.preisCent), abWert: EURO(ab.wertCent),
    zweigL: zweig("zw l"), zweigR: zweig("zw r", { beeren: false }) });
  await rendern(og, path.join(dir, "og-weihnachten.jpg"), { breite: 1200, hoehe: 630, jpeg: true, element: "#og" });
  fs.rmSync(voll, { force: true });
  // 3. Symbole 32 / 180 (iPhone) / 192 (Android)
  const icon = path.join(dir, ".icon-512.png");
  await rendern(ICON_HTML(assets), icon, { breite: 512, hoehe: 512, element: "#i" });
  await umrechnen(icon, [32, 180, 192].map((b) => ({ breite: b, typ: "image/png", datei: path.join(dir, `icon-${b}.png`) })));
  fs.rmSync(icon, { force: true });
  // 4. Gutschein-Muster (echtes PDF)
  await pdfMuster(slug, c, dir);
}

for (const [slug, c] of Object.entries(SHOPS)) {
  if (!c.seite) continue;
  // Bilder zuerst (die Seite nennt das Vorschaubild mit Prüfsumme, damit WhatsApp/Facebook ein neues Bild neu laden)
  if (MIT_OG) await bilder(slug, c);
  const w = werte(slug, c);
  schreibe(`${slug}.html`, fuelle(vorlage("seite.html"), w));
  for (const [art, titel] of RECHT) {
    const fussLinks = RECHT.map(([a2, t2]) => `<a href="/gutschein-kaufen/${slug}-${a2}"${a2 === art ? ' aria-current="page"' : ""}>${esc(t2)}</a>`).join("") + `<a href="/gutschein-kaufen/${slug}">Zu den Gutscheinen</a>`;
    schreibe(`${slug}-${art}.html`, fuelle(vorlage("recht.html"), { ...w, seitenTitel: titel, inhalt: rechtInhalt(art, slug, c, w), fussLinks }));
  }
  if (VORSCHAU) {
    fs.mkdirSync(VORSCHAU, { recursive: true });
    const wa = fuelle(vorlage("whatsapp.html"), { ...w, ogDatei: pathToFileURL(w.ogDatei).href, domain: new URL(BASIS).hostname });
    await rendern(wa, path.join(path.resolve(VORSCHAU), `whatsapp-${slug}.png`), { breite: 760, hoehe: 420, dpr: 2, element: "body" });
  }
  console.log(`✓ ${slug}: /gutschein-kaufen/${slug} (+ ${RECHT.map(([a]) => a).join(", ")})${MIT_OG ? ", Bilder" : ""}`);
}
if (browser) await browser.close();

// Alte, nicht mehr erzeugte Seiten entfernen (der Ordner gehört nur diesem Skript)
for (const f of fs.readdirSync(ziel)) if (f.endsWith(".html") && !geschrieben.has(f)) { fs.rmSync(path.join(ziel, f)); console.log("  entfernt:", f); }
console.log(`Basis: ${BASIS}${BASIS === "https://tattoofin.de" ? "" : "  ← NICHT einchecken, danach ohne --basis neu erzeugen"}`);
