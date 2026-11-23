// Gutschein-Shop: statische Seiten je Stadt aus einer Vorlage + Konfiguration (SHOPS in netlify/functions/_lib/gutschein-shop.mjs).
//   node dev/gutschein-seiten.mjs                         → public/gutschein-kaufen/<slug>.html (+ -impressum, -datenschutz, -widerruf, -bedingungen)
//   node dev/gutschein-seiten.mjs --og                    → zusätzlich Vorschaubilder public/assets/gs-shop/<kuerzel>/og-weihnachten.jpg (Playwright)
//   node dev/gutschein-seiten.mjs --vorschau <ordner>     → zusätzlich WhatsApp-Vorschau (groß + kleines Quadrat) als PNG je Stadt
//   node dev/gutschein-seiten.mjs --basis https://…       → absolute Adressen (og:url, og:image) für eine andere Site, z. B. den Entwurf
// Netlify liefert /gutschein-kaufen/<slug> direkt aus <slug>.html (ohne Umleitung), unbekannte Slugs → 404.
// Wichtig: Eingecheckt wird immer der Stand mit --basis https://tattoofin.de (Standard). Für den Entwurf vor dem Hochladen mit
// --basis erzeugen und danach wieder ohne.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const BASIS = (arg("--basis") || "https://tattoofin.de").replace(/\/$/, "");
const MIT_OG = process.argv.includes("--og");
const VORSCHAU = arg("--vorschau");

const { SHOPS, bedingungen, widerruf, aktionEndeIso, bonusBisIso } = await import("../netlify/functions/_lib/gutschein-shop.mjs");
const { gueltigBis } = await import("../netlify/functions/_lib/gutschein.mjs");
const { jetzt } = await import("../netlify/functions/_lib/config.mjs");

const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fuelle = (vorlage, w) => vorlage
  .replace(/\{\{\{(\w+)\}\}\}/g, (_, k) => { if (!(k in w)) throw new Error(`Platzhalter {{{${k}}}} fehlt`); return String(w[k]); })
  .replace(/\{\{(\w+)\}\}/g, (_, k) => { if (!(k in w)) throw new Error(`Platzhalter {{${k}}} fehlt`); return esc(w[k]); });
const vorlage = (n) => fs.readFileSync(path.join(root, "dev/gutschein", n), "utf8");
const EURO = (c) => (c / 100).toLocaleString("de-DE", { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 }) + " €";
const DATUM = (iso) => new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" });
const hash = (f) => (fs.existsSync(f) ? crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex").slice(0, 8) : "neu");

const ziel = path.join(root, "public/gutschein-kaufen");
fs.mkdirSync(ziel, { recursive: true });
const geschrieben = new Set();
const schreibe = (name, html) => { fs.writeFileSync(path.join(ziel, name), html); geschrieben.add(name); };

// Studio-Angaben für die Texte (wie im Speicher der echten Site)
const studioAus = (slug, c) => ({ slug, firma: c.seite.firma, strasse: c.anbieter.strasse, plz: c.anbieter.plz, ort: c.anbieter.ort });

function werte(slug, c) {
  const p = c.seite, a = c.anbieter, alle = c.aktionen.reduce((s, x) => s + x.stueck, 0);
  const bonusBis = bonusBisIso(c), gBis = gueltigBis(jetzt());
  const nachBonus = new Date(new Date(bonusBis).getTime() + 2 * 3600e3);
  const ogDatei = path.join(root, `public/assets/gs-shop/${p.kuerzel}/og-weihnachten.jpg`);
  const nr4 = c.aktionen.find((x) => x.id === "nr4");
  const beispiel = `z. B. ${EURO(nr4.wertCent)} Gutschein für ${EURO(nr4.preisCent)}`.replace(/ /g, " ");
  return {
    slug, kuerzel: p.kuerzel, name: p.name, firma: p.firma, stadt: p.stadt, strasse: a.strasse, plz: a.plz, ort: a.ort,
    telefon: p.telefon, telefonLink: p.telefonLink, whatsapp: p.whatsapp, instagram: p.instagram, pixel: p.pixel,
    sterne: p.google.sterne, bewertungen: p.google.anzahl, googleStand: p.google.stand, mapsQuery: encodeURIComponent(p.google.suche),
    waText: encodeURIComponent(`Hallo, ich habe eine Frage zu den Tattoo-Gutscheinen bei ${p.name}.`),
    stueckAlle: alle, bonusBis: DATUM(bonusBis), gueltigBis: DATUM(gBis), nachBonus: DATUM(nachBonus),
    cdT: "–", cdH: "–", cdM: "–", cdS: "–",
    titel: `Weihnachts-Gutscheine unter Wert · ${p.name}`,
    ogTitel: "Weihnachts-Gutscheine unter Wert",
    ogText: `${p.name}: ${beispiel}. Nur ${alle} Stück, bis 24.12., 16 Uhr.`,
    ogAlt: `${p.name}: Weihnachts-Gutscheine unter Wert, ${beispiel}, nur bis 24.12., 16 Uhr`,
    seitenUrl: `${BASIS}/gutschein-kaufen/${slug}`,
    ogBild: `${BASIS}/assets/gs-shop/${p.kuerzel}/og-weihnachten.jpg?v=${hash(ogDatei)}`,
    ogDatei,
    karten: c.aktionen.map((x) =>
      `<button type="button" class="zeile" data-wahl="${x.id}" aria-label="Nummer ${x.nr}: Wert ${esc(EURO(x.wertCent))}, du zahlst ${esc(EURO(x.preisCent))}, ${x.stueck} Stück">` +
      `<span class="nr">${x.nr}</span><span class="wert g">${EURO(x.wertCent)}</span><span class="rest">Nur<i>${x.stueck} Stück</i></span><span class="preis">du zahlst <b>${EURO(x.preisCent)}</b></span></button>`).join("") +
      `<button type="button" class="zeile frei" data-wahl="frei"><span class="nr">€</span><span class="wert">Eigener Betrag</span><span class="rest pfeil">→</span><span class="preis">Wertgutschein, ${EURO(c.frei.minCent)} bis ${EURO(c.frei.maxCent)}</span></button>`,
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
    ["Deine Bestellung", "Für den Kauf verarbeiten wir deinen Namen, deine E-Mail-Adresse, den gewählten Gutschein und freiwillig den Namen des Beschenkten und deinen Gruß. Damit erstellen wir den Gutschein mit Code, schicken ihn dir per E-Mail und das Studio kann ihn beim Termin einlösen (Art. 6 Abs. 1 lit. b DSGVO). Rechnungsdaten heben wir so lange auf, wie es das Steuer- und Handelsrecht verlangt (Art. 6 Abs. 1 lit. c DSGVO). Damit die Stückzahl stimmt und niemand alle Gutscheine blockiert, speichern wir während der Kasse für höchstens 33 Minuten eine gekürzte, verschlüsselte Kennung deines Anschlusses (Art. 6 Abs. 1 lit. f DSGVO)."],
    ["Zahlung über Stripe", "Bezahlt wird über Stripe (Stripe Payments Europe Ltd., Irland). Stripe verarbeitet deine Zahlungsdaten und, falls für die Zahlung nötig, deine Rechnungsadresse, um die Zahlung abzuwickeln und Betrug zu verhindern (Art. 6 Abs. 1 lit. b und f DSGVO). Kartendaten sehen weder das Studio noch Tattoofin. Datenschutz bei Stripe: stripe.com/de/privacy."],
    ["Hosting und E-Mail", "Die Seite liegt bei Netlify (Netlify, Inc., USA, mit EU-Standardvertragsklauseln). Beim Aufruf verarbeitet der Server technisch nötige Daten wie IP-Adresse, Zeitpunkt und Browsertyp (Art. 6 Abs. 1 lit. f DSGVO). Schriften und Bilder kommen von dieser Seite selbst. Die Gutschein-Mail wird über den Mail-Dienst von Tattoofin versendet."],
    ["Reichweitenmessung ohne Cookies (Umami)", "Wir zählen mit Umami (Umami Software, Inc., USA), wie oft die Seite aufgerufen wird und welche Schritte des Kaufs genutzt werden. Umami setzt keine Cookies und speichert keine IP-Adressen (Art. 6 Abs. 1 lit. f DSGVO)."],
    ["Meta-Pixel", "Auf dieser Seite lädt das Meta-Pixel (Meta Platforms Ireland Ltd.). Es misst, ob unsere Werbung auf Instagram und Facebook dich hierher gebracht hat, ob du den Kauf beginnst und ob er abgeschlossen wird (ohne Namen, E-Mail oder Zahlungsdaten). Dabei setzt Meta Cookies, Daten können in die USA übertragen werden (EU-US Data Privacy Framework). Du kannst widersprechen, indem du in deinem Browser Cookies von Drittanbietern blockierst oder in deinen Meta-Einstellungen unter „Werbepräferenzen“ die Nutzung von Daten von Partnern abschaltest."],
    ["WhatsApp", "Tippst du auf „WhatsApp-Frage“, öffnet sich WhatsApp (WhatsApp Ireland Ltd.) mit einer vorbereiteten Nachricht an das Studio (Art. 6 Abs. 1 lit. b DSGVO)."],
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
async function rendern(html, datei, { breite, hoehe, dpr = 1, jpeg = false, element = null }) {
  const tmp = path.join(path.dirname(datei), `.render-${process.pid}.html`);
  fs.writeFileSync(tmp, html);
  const p = await browser.newPage({ viewport: { width: breite, height: hoehe }, deviceScaleFactor: dpr });
  try {
    await p.goto(pathToFileURL(tmp).href, { waitUntil: "load" });
    await p.evaluate(() => document.fonts.ready);
    const opts = { path: datei, ...(jpeg ? { type: "jpeg", quality: 88 } : {}) };
    if (element) await p.locator(element).screenshot(opts); else await p.screenshot(opts);
  } finally { await p.close(); fs.rmSync(tmp, { force: true }); }
}

for (const [slug, c] of Object.entries(SHOPS)) {
  if (!c.seite) continue;
  // Vorschaubild zuerst (die Seite nennt es mit Prüfsumme, damit WhatsApp/Facebook ein neues Bild neu laden)
  if (MIT_OG) {
    const karte = (x, cls) => `<div class="karte ${cls}"><span class="nr">${x.nr}</span><span class="w g">${EURO(x.wertCent)}</span><span class="wl">Gutscheinwert</span><span class="p">du zahlst<b>${EURO(x.preisCent)}</b></span></div>`;
    const og = fuelle(vorlage("og.html"), { assets: pathToFileURL(path.join(root, "public/assets/gs-shop")).href, kuerzel: c.seite.kuerzel,
      karteLinks: karte(c.aktionen.find((x) => x.id === "nr4"), "k1"), karteRechts: karte(c.aktionen.find((x) => x.id === "nr1"), "k2") });
    await rendern(og, path.join(root, `public/assets/gs-shop/${c.seite.kuerzel}/og-weihnachten.jpg`), { breite: 1200, hoehe: 630, jpeg: true, element: "#og" });
  }
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
  console.log(`✓ ${slug}: /gutschein-kaufen/${slug} (+ ${RECHT.map(([a]) => a).join(", ")})${MIT_OG ? ", Vorschaubild" : ""}`);
}
if (browser) await browser.close();

// Alte, nicht mehr erzeugte Seiten entfernen (der Ordner gehört nur diesem Skript)
for (const f of fs.readdirSync(ziel)) if (f.endsWith(".html") && !geschrieben.has(f)) { fs.rmSync(path.join(ziel, f)); console.log("  entfernt:", f); }
console.log(`Basis: ${BASIS}${BASIS === "https://tattoofin.de" ? "" : "  ← NICHT einchecken, danach ohne --basis neu erzeugen"}`);
