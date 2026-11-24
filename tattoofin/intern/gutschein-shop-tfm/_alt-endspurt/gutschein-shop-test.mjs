// Test Gutschein-Shop (Tattoo Fashion München + Landshut): Stückzahl (auch gleichzeitig, getrennt je Studio), Wert/Preis, Bonus-Frist,
// Mail + PDF im Look der Stadt, Abbruch/Ablauf, Verkaufszeitraum, Freischaltung, Studio-Ansicht, einfache Kasse (2 Schritte, keine
// Pflicht-Adresse/Telefon), statische Seiten je Stadt mit og-Tags und der Kauf im Browser am Handy (Stripe-Nachbau).
//   NODE_PATH=… node dev/gutschein-shop-test.mjs [screenshot-ordner]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { startDev } from "./server.mjs";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("/opt/node22/lib/node_modules/playwright")); }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.E2E_PORT || 8941), BASE = `http://localhost:${PORT}`, MOCK_PORT = Number(process.env.STRIPE_MOCK_PORT || 12941);
const shots = process.argv[2] || path.join(os.tmpdir(), "tf-gs-shop");
fs.mkdirSync(shots, { recursive: true });
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "tf-gs-data-"));
process.env.TF_JETZT = "2026-11-23T20:00:00+01:00";
process.env.TF_GS_MAX_JE_IP = "100";
process.env.STRIPE_MOCK_PORT = String(MOCK_PORT);
await startDev({ port: PORT, mock: true, dataDir, quiet: true, mockPort: MOCK_PORT });
const { store, saveStudio, getZahlung } = await import("../netlify/functions/_lib/store.mjs");
const shop = await import("../netlify/functions/_lib/gutschein-shop.mjs");
const gs = await import("../netlify/functions/_lib/gutschein.mjs");
const { fuerStudio } = await import("../netlify/functions/_lib/studio-ansicht.mjs");

let ok = 0, fail = 0;
const check = (c, name, info) => { if (c) { ok++; console.log("  ✓", name); } else { fail++; console.log("  ✗", name, info !== undefined ? "→ " + String(typeof info === "string" ? info : JSON.stringify(info)).slice(0, 500) : ""); } };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const get = (u) => fetch(BASE + u).then((r) => r.json());
// Fachliche Ablehnungen kommen mit HTTP 200 und { abgelehnt, status } (kein roter Netzwerkfehler im Browser) → hier wie bisher als Status prüfen
const post = (b) => fetch(BASE + "/api/gutschein-shop", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }).then(async (r) => { const d = await r.json(); return { status: r.status, ...d, http: r.status }; });
const mockState = () => fetch(`http://localhost:${MOCK_PORT}/mock/state`).then((r) => r.json());
// Seite roh vom Server (ohne Skript) und ein Meta-Tag daraus
const seiteHole = async (u) => { const r = await fetch(BASE + u); return { status: r.status, html: await r.text(), kopf: Object.fromEntries(r.headers) }; };
const metaVon = (html, k) => (html.match(new RegExp(`<meta (?:property|name)="${k.replace(/[.:]/g, (c) => "\\" + c)}" content="([^"]*)"`)) || [])[1];
const bezahlen = (url) => fetch(url, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "pm=card", redirect: "manual" });
const mailsAn = (to) => fs.readdirSync(dataDir).filter((f) => f.startsWith("mail%2F")).map((f) => JSON.parse(fs.readFileSync(path.join(dataDir, f)))).filter((m) => [].concat(m.to).includes(to));
const kauf = (auswahl, email, extra = {}) => post({ s: "tattoo-fashion-munich", auswahl, kunde: "Kim Käufer", email, inhaltOk: true, ...extra });
async function bisBezahlt(zid) { for (let i = 0; i < 40; i++) { const z = await getZahlung("st_tfm_test", zid); if (z?.status === "bezahlt" && z.gutschein?.gesendetAm) return z; await wait(150); } return getZahlung("st_tfm_test", zid); }
// Text aus dem PDF. Standardschrift (pdf-lib: Flate-Streams, Text als <hex> Tj in WinAnsi) direkt aus dem PDF; eingebettete Schriften
// (Oswald/Inter im Shop-PDF, Text als Glyphen-Nummern) über die mitgeschriebenen drawText-Aufrufe (pdfMitText).
const gezeichnet = [];
{
  const { PDFPage } = await import("pdf-lib");
  const orig = PDFPage.prototype.drawText;
  PDFPage.prototype.drawText = function (t, o) { gezeichnet.push(String(t)); return orig.call(this, t, o); };
}
async function pdfMitText(fn) { gezeichnet.length = 0; const buf = Buffer.from(await fn()); return { buf, text: (gezeichnet.join(" ") + " " + pdfText(buf)).replace(/\u00a0/g, " ") }; }
function pdfText(buf) {
  const s = buf.toString("latin1"), out = [];
  for (const m of s.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    let roh; try { roh = zlib.inflateSync(Buffer.from(m[1], "latin1")).toString("latin1"); } catch { continue; }
    // Nur Seiteninhalte (Text-Operatoren, lesbar); Schrift-Dateien (binär) würden die Suche unten sehr langsam machen
    if (!/\bBT\b/.test(roh) || /[\x00-\x08\x0e-\x1f]/.test(roh)) continue;
    // Tj: einfacher Text; TJ: Text mit Abstand nach dem €-Zeichen (gutscheinPdf) → Teile ohne Trenner zusammensetzen
    for (const t of roh.matchAll(/<([0-9A-Fa-f]+)>\s*Tj|\[((?:\s*(?:<[0-9A-Fa-f]*>|-?[\d.]+))*)\s*\]\s*TJ/g))
      out.push(t[1] ? Buffer.from(t[1], "hex").toString("latin1") : [...t[2].matchAll(/<([0-9A-Fa-f]*)>/g)].map((h) => Buffer.from(h[1], "hex").toString("latin1")).join(""));
  }
  return out.join(" ").replace(/\x80/g, "€");
}

// Studio wie live: Tattoo Fashion Munich, eigenes Stripe-Konto (Paket Partner, zahlart geschenk), fertig eingerichtet
await saveStudio({ id: "st_tfm_test", firma: "Tattoo Fashion Munich", slug: "tattoo-fashion-munich", email: "tfm@example.com", inhaber: "Andy Test", strasse: "Landshuter Allee 42", plz: "80637", ort: "München",
  modell: "kauf", zahlart: "geschenk", paket: "Partner – nur Zahlungsgebühren", status: "live", createdAt: new Date().toISOString(),
  stripe: { accountId: "acct_tfm_test", chargesEnabled: true, payoutsEnabled: true, detailsSubmitted: true, kontoTyp: "standard" } });

await saveStudio({ id: "st_tfla_test", firma: "Tattoo Fashion Landshut", slug: "tattoo-fashion-landshut", email: "tfla@example.com", inhaber: "Andy Test", strasse: "Neustadt 502", plz: "84028", ort: "Landshut",
  modell: "kauf", zahlart: "geschenk", paket: "Partner – nur Zahlungsgebühren", status: "live", createdAt: new Date().toISOString(),
  stripe: { accountId: "acct_tfla_test", chargesEnabled: true, payoutsEnabled: true, detailsSubmitted: true, kontoTyp: "standard" } });
const kaufLa = (auswahl, email, extra = {}) => post({ s: "tattoo-fashion-landshut", auswahl, kunde: "Lea Landshut", email, inhaltOk: true, ...extra });
async function bisBezahltLa(zid) { for (let i = 0; i < 40; i++) { const z = await getZahlung("st_tfla_test", zid); if (z?.status === "bezahlt" && z.gutschein?.gesendetAm) return z; await wait(150); } return getZahlung("st_tfla_test", zid); }

console.log("Angebot");
let d = await get("/api/gutschein-shop?s=tattoo-fashion-munich");
const nr = (id) => d.shop.aktionen.find((a) => a.id === id);
check(d.shop.aktionen.map((a) => `${a.nr}:${a.wertCent / 100}/${a.preisCent / 100}/${a.stueck}`).join(" ") === "1:2000/1500/1 2:1500/1250/2 3:1000/750/2 4:500/375/6 5:300/200/10", "5 Aktions-Gutscheine mit Wert / Preis / Stück wie entschieden", d.shop.aktionen);
check(d.shop.bonusBis.startsWith("2027-03-31") && d.shop.gueltigBis.startsWith("2029-12-31") && d.shop.frei.minCent === 5000 && d.shop.frei.maxCent === 200000, "Bonus bis 31.03.2027, bezahlter Betrag bis 31.12.2029, freier Betrag 50–2.000 €");
check(d.shop.offen && !d.shop.vorschau && d.studio.aktiv && d.shop.anbieter?.email === "tattoofashion.munich@gmail.com", "Shop offen, freigegeben (kein Vorschau-Schild), Verkäufer-Angaben da");
check(d.shop.bedingungen.some((t) => /31\.03\.2027/.test(t) && /bezahlte Betrag/.test(t)) && /vierzehn Tagen/.test(d.shop.widerruf.text[0]), "Bedingungen nennen Bonus-Frist, Widerrufsbelehrung da");
check((await fetch(BASE + "/api/gutschein-shop?s=anderes-studio")).status === 404, "Anderes Studio hat keinen Shop (nur München und Landshut)");
const dLa = await get("/api/gutschein-shop?s=tattoo-fashion-landshut");
check(dLa.shop.aktionen.map((a) => `${a.nr}:${a.wertCent / 100}/${a.preisCent / 100}/${a.stueck}`).join(" ") === "1:2000/1500/1 2:1500/1250/2 3:1000/750/2 4:500/375/6 5:300/200/10" && dLa.shop.aktionBis === d.shop.aktionBis && dLa.shop.bonusBis === d.shop.bonusBis && dLa.shop.frei.maxCent === 200000, "Landshut: gleiches Angebot (Nr. 1–5, 21 Stück, bis 24.12. 16 Uhr, Wertgutschein 50–2.000 €)", dLa.shop.aktionen);
check(dLa.shop.offen && dLa.studio.aktiv && dLa.shop.anbieter?.name === "Tattoo Fashion Landshut, Inhaber Andy Neelsen" && dLa.shop.anbieter?.email === "neelsen.andy@gmail.com" && dLa.shop.anbieter?.strasse === "Neustadt 502" && dLa.studio.ort === "Landshut", "Landshut: Shop offen, Verkäufer Tattoo Fashion Landshut (Andy Neelsen), Neustadt 502");

console.log("Freischaltung (echte Site)");
const c0 = shop.SHOPS["tattoo-fashion-munich"], sEcht = { id: "st_nqoyv1Q2wj7F", slug: "tattoo-fashion-munich" };
check(shop.shopFuer({ id: "st_fremd", slug: "tattoo-fashion-munich" }, { test: false }) === null && shop.shopFuer(sEcht, { test: false }) === c0, "Echte Site: Shop nur für die Studio-ID st_nqoyv1Q2wj7F");
const cLa = shop.SHOPS["tattoo-fashion-landshut"];
check(shop.shopFuer({ id: "st_ybbij1eOoS9l", slug: "tattoo-fashion-landshut" }, { test: false }) === cLa && shop.shopFuer({ id: "st_nqoyv1Q2wj7F", slug: "tattoo-fashion-landshut" }, { test: false }) === null, "Echte Site: Landshut-Shop nur für die Studio-ID st_ybbij1eOoS9l");
check(!shop.shopZustand(sEcht, { ...c0, freigegeben: false }, new Date(), { test: false }).offen, "Echte Site: ohne Domenics Freigabe zu");
check(!shop.shopZustand(sEcht, { ...c0, freigegeben: true, anbieter: null }, new Date(), { test: false }).offen, "Echte Site: freigegeben, aber ohne Anbieter-Angaben (Impressum) weiter zu");
check(shop.shopZustand(sEcht, c0, new Date(), { test: false }).offen && c0.freigegeben && /Andy Neelsen/.test(c0.anbieter.name), "Echte Site: freigegeben + Verkäufer Andy Neelsen eingetragen → offen");
check(d.shop.bedingungen.some((t) => /in Teilen einlösen/.test(t) && /Barauszahlung ist nicht möglich/.test(t) && /nicht mit anderen Aktionen kombinierbar/.test(t)) && d.shop.bedingungen.some((t) => /Piercings/.test(t)) && d.shop.bedingungen.some((t) => /24\.12\.2026 um 16 Uhr/.test(t)), "Bedingungen: Teil-Einlösung, nicht kombinierbar, inkl. Piercing, Aktion bis 24.12.2026 16 Uhr");

console.log("Kauf Nr. 4 (Wert 500 €, Preis 375 €)");
let r = await kauf("nr4", "kim@example.com", { empfaenger: "Lena", nachricht: "Frohe Weihnachten!" });
check(r.status === 200 && r.url, "Kasse startet", r);
let st = await mockState();
let cs = Object.values(st.sessions).find((x) => x.client_reference_id === r.zahlung);
check(cs && Number(cs.line_items[0].price_data.unit_amount) === 37500 && JSON.stringify(cs.payment_method_types) === '["card"]' && cs.account === "acct_tfm_test", "Stripe: 375 € auf dem Konto des Studios, nur Karte (kein Klarna)", cs && { a: cs.line_items[0].price_data.unit_amount, p: cs.payment_method_types, acc: cs.account });
check(cs && cs.billing_address_collection === "auto" && String(cs.phone_number_collection?.enabled) === "false" && cs.customer && !cs.customer_update?.address && cs.customer_update?.name === "auto", "Einfache Kasse: keine Pflicht-Rechnungsadresse, keine Telefonnummer, Kunde ohne Adress-Übernahme", cs && { b: cs.billing_address_collection, ph: cs.phone_number_collection, cu: cs.customer_update });
check(cs && cs.branding_settings?.display_name === "Tattoo Fashion München" && /\/assets\/gs-shop\/tfm\/logo\.png$/.test(cs.branding_settings?.logo?.url || ""), "Kasse im Look München (Name, Logo)", cs && cs.branding_settings);
check(cs && /Aktions-Gutschein Nr\. 4: Wert 500 €/.test(cs.line_items[0].price_data.product_data.name) && cs.submit_type === "pay" && Number(cs.expires_at) - Math.floor(new Date(process.env.TF_JETZT).getTime() / 1000) >= 1800, "Artikel „Aktions-Gutschein Nr. 4: Wert 500 €“, Knopf „Bezahlen“, Kasse ≥ 30 Min.", cs && { n: cs.line_items[0].price_data.product_data.name, s: cs.submit_type, e: cs.expires_at });
d = await get("/api/gutschein-shop?s=tattoo-fashion-munich");
check(nr("nr4").verfuegbar === 5 && nr("nr4").reserviert === 1, "Während der Kasse: 1 reserviert, 5 verfügbar");
await bezahlen(r.url);
let z = await bisBezahlt(r.zahlung);
check(z.status === "bezahlt" && z.betragCent === 37500 && z.gutschein.wertCent === 50000 && z.gutschein.bezahltCent === 37500 && z.gutschein.bonusCent === 12500, "Bezahlt: betragCent = 375 € (bezahlt), wertCent = 500 €, Bonus 125 €", z && { b: z.betragCent, g: z.gutschein });
check(/^GS-/.test(z.gutschein.code) && z.gutschein.bonusBis.startsWith("2027-03-31") && z.gutschein.gueltigBis.startsWith("2029-12-31"), "Code, Bonus bis 31.03.2027, gültig bis 31.12.2029");
d = await get("/api/gutschein-shop?s=tattoo-fashion-munich");
check(nr("nr4").verkauft === 1 && nr("nr4").verfuegbar === 5 && nr("nr4").reserviert === 0, "Nach der Zahlung: 1 verkauft, 5 verfügbar");
const m = mailsAn("kim@example.com").find((x) => /Dein Gutschein von Tattoo Fashion Munich über 500,00 €/.test(x.subject));
check(m && (m.anhaenge || []).some((a) => a.endsWith(".pdf")), "Mail an Käufer: „über 500,00 €“ mit PDF", mailsAn("kim@example.com").map((x) => x.subject));
check(m && /Bis 31\.03\.2027 löst du den vollen Wert von 500 € ein\. Danach gilt der bezahlte Betrag von 375 €, einlösbar bis 31\.12\.2029/.test(m.html) && /Widerrufsbelehrung/.test(m.html) && /Gutscheinbedingungen/.test(m.html) && /Muster-Widerrufsformular/.test(m.html), "Mail: Bonus-Satz, Gutscheinbedingungen, Widerrufsbelehrung + Formular");
check(mailsAn("tfm@example.com").some((x) => /Gutschein verkauft: Wert 500,00 €, bezahlt 375,00 €/.test(x.subject)), "Studio-Mail: „Gutschein verkauft: Wert 500 €, bezahlt 375 €“");
const { buf: pdf, text: pt } = await pdfMitText(async () => gs.gutscheinPdf(await (await import("../netlify/functions/_lib/store.mjs")).getStudio("st_tfm_test"), z));
fs.writeFileSync(path.join(shots, "gutschein-nr4.pdf"), pdf);
// 24.11.2026 (Runde 3): Der Beschenkte sieht nicht, was das Geschenk gekostet hat (kein 375 €), Schriften wie auf der Seite (Oswald/Inter)
check(/500 €/.test(pt) && /Weihnachts-Gutschein für alle Leistungen/.test(pt) && /VOLLER WERT 500 € BIS 31\.03\.2027/.test(pt) && /Danach gilt der bezahlte Betrag bis 31\.12\.2029\./.test(pt) && /Bedingungen über den QR-Code/.test(pt) && /für Lena/.test(pt) && !/375|Aktions-Gutschein|Nr\. 4|Ausgestellt/.test(pt),
  "PDF (Geschenk für Lena): „Weihnachts-Gutschein“, 500 €, „Voller Wert 500 € bis 31.03.2027“ / „Danach gilt der bezahlte Betrag bis 31.12.2029.“ (ohne 375 €), keine Aktions-Nummer, keine doppelte Fußzeile", pt.slice(0, 600));
{
  // Schriften im PDF (pdf-lib legt sie in komprimierte Objekt-Streams, darum über pdf-lib lesen)
  const { PDFDocument, PDFName, PDFDict } = await import("pdf-lib");
  const doc = await PDFDocument.load(pdf), namen = [];
  for (const [, o] of doc.context.enumerateIndirectObjects()) if (o instanceof PDFDict && o.get(PDFName.of("Type")) === PDFName.of("Font") && o.get(PDFName.of("Subtype")) === PDFName.of("Type0")) namen.push(String(o.get(PDFName.of("BaseFont"))));
  const alle = []; for (const [, o] of doc.context.enumerateIndirectObjects()) if (o instanceof PDFDict && o.get(PDFName.of("Type")) === PDFName.of("Font")) alle.push(String(o.get(PDFName.of("BaseFont"))));
  check(namen.length === 3 && namen.filter((n) => /Oswald/.test(n)).length === 2 && namen.some((n) => /Inter/.test(n)) && !alle.some((n) => /Helvetica|Courier/.test(n)), "PDF mit eingebetteten Schriften der Seite (Oswald 600/700, Inter), keine Helvetica/Courier", alle);
}
{
  // Geschenkkarten-Look: Hintergrund (Satinband, Schleife, Logo) wird geladen; fehlt er, zeichnet das PDF dieselben Lagen selbst
  const echt = globalThis.fetch; let grundGeholt = false;
  globalThis.fetch = async (u, o) => { if (/pdf-grund\.jpg/.test(String(u))) { grundGeholt = true; return new Response("weg", { status: 404 }); } return echt(u, o); };
  let ersatz, pe; try { ({ buf: ersatz, text: pe } = await pdfMitText(async () => gs.gutscheinPdf(await (await import("../netlify/functions/_lib/store.mjs")).getStudio("st_tfm_test"), z))); } finally { globalThis.fetch = echt; }
  check(grundGeholt && /500 €/.test(pe) && /Weihnachts-Gutschein/.test(pe) && ersatz.length > 3000 && pdf.toString("latin1").includes("/DCTDecode") && !ersatz.toString("latin1").includes("/DCTDecode"), "PDF mit Hintergrund-Bild (Karte mit Satinband und Schleife); ohne Bild gezeichneter Ersatz mit allen Texten", { mit: pdf.length, ohne: ersatz.length });
}
const ga = await get("/api/gutschein?t=" + z.gutschein.token);
check(ga.gutschein.wertCent === 50000 && ga.gutschein.bezahltCent === 37500 && ga.gutschein.bonusAktiv && ga.gutschein.aktuellerWertCent === 50000, "Online-Ansicht: Wert 500 €, bezahlt 375 €, Bonus aktiv");
check(ga.gutschein.bedingungen === "/gutschein-kaufen/tattoo-fashion-munich-bedingungen", "Online-Ansicht (hinter dem QR-Code des PDFs): Link zu den Gutscheinbedingungen", ga.gutschein.bedingungen);
check(gs.aktuellerWertCent(z, new Date("2027-03-31T20:00:00Z")) === 50000 && gs.aktuellerWertCent(z, new Date("2027-04-01T08:00:00Z")) === 37500, "Bonus-Frist: am 31.03.2027 500 €, ab 01.04.2027 375 €");
const fs1 = fuerStudio(z);
check(fs1.gutschein.wertCent === 50000 && fs1.gutschein.bezahltCent === 37500 && !("token" in fs1.gutschein) && !("reservierung" in fs1.gutschein), "Studio-Ansicht (App/Portal): Wert UND bezahlt, ohne Token/Reservierung");

console.log("Stückzahl Nr. 1 (1 Stück)");
const a1 = await kauf("nr1", "a1@example.com");
const b1 = await kauf("nr1", "b1@example.com");
check(a1.status === 200 && b1.status === 409 && b1.code === "ausverkauft" && /2\.000-€-Gutschein ist gerade reserviert/.test(b1.error), "Zweiter Käufer während der Kasse: „Der 2.000-€-Gutschein ist gerade reserviert“", b1);
await bezahlen(a1.url); await bisBezahlt(a1.zahlung);
const c1 = await kauf("nr1", "c1@example.com");
check(c1.status === 409 && /ausverkauft/.test(c1.error), "Nach dem Verkauf: „ausverkauft“, nicht mehr kaufbar", c1);
d = await get("/api/gutschein-shop?s=tattoo-fashion-munich");
check(nr("nr1").ausverkauft && nr("nr1").verfuegbar === 0, "Angebot zeigt Nr. 1 ausverkauft");

console.log("Gleichzeitig: 8 Käufer auf Nr. 3 (2 Stück)");
const par = await Promise.all(Array.from({ length: 8 }, (_, i) => kauf("nr3", `p${i}@example.com`)));
check(par.filter((x) => x.status === 200).length === 2 && par.filter((x) => x.status === 409).length === 6, "Genau 2 Kassen, 6 abgewiesen", par.map((x) => x.status));
d = await get("/api/gutschein-shop?s=tattoo-fashion-munich");
check(nr("nr3").reserviert === 2 && nr("nr3").verfuegbar === 0, "Nr. 3: 2 reserviert, 0 verfügbar");

console.log("Abbruch und Ablauf geben frei");
const gew = par.filter((x) => x.status === 200);
const ab = await post({ abbruch: gew[0].zahlung });
st = await mockState();
check(ab.ok && Object.values(st.sessions).find((x) => x.client_reference_id === gew[0].zahlung).status === "expired" && (await getZahlung("st_tfm_test", gew[0].zahlung)).status === "abgebrochen", "Zurück aus der Kasse: Sitzung bei Stripe beendet, Zahlung abgebrochen");
d = await get("/api/gutschein-shop?s=tattoo-fashion-munich");
check(nr("nr3").verfuegbar === 1, "… und Nr. 3 wieder 1× verfügbar");
// Webhook „checkout.session.expired“ (Kasse nach 30 Min. abgelaufen)
const z2 = await getZahlung("st_tfm_test", gew[1].zahlung);
await fetch(`http://localhost:${MOCK_PORT}/v1/checkout/sessions/${z2.checkoutSessionId}/expire`, { method: "POST", headers: { "stripe-account": "acct_tfm_test" } });
await wait(400);
d = await get("/api/gutschein-shop?s=tattoo-fashion-munich");
check(nr("nr3").verfuegbar === 2 && (await getZahlung("st_tfm_test", gew[1].zahlung)).status === "abgebrochen", "Webhook „Kasse abgelaufen“ gibt die Einheit frei");
// Reservierung ohne Webhook abgelaufen (Uhrzeit nach 33 Min.)
const r5 = await kauf("nr2", "zeit@example.com");
process.env.TF_JETZT = "2026-11-23T20:34:00+01:00";
d = await get("/api/gutschein-shop?s=tattoo-fashion-munich");
check(r5.status === 200 && nr("nr2").verfuegbar === 2, "Reservierung zählt nach 33 Minuten nicht mehr (auch ohne Webhook)");
process.env.TF_JETZT = "2026-11-23T21:00:00+01:00";
await post({ abbruch: r5.zahlung });

console.log("Tempo: viele Tickets je Gutschein");
{
  // 150 Tickets (realistisch nach einer Anzeigen-Kampagne), jedes Lesen künstlich 25 ms langsam wie Netlify Blobs
  const sT = { id: "st_tempo_test", slug: "tempo" }, cT = shop.SHOPS["tattoo-fashion-munich"];
  for (let k = 0; k < 150; k++) await store.set(`gsshop/st_tempo_test/nr5/${String(k).padStart(5, "0")}`, { zahlungId: "zl_t" + k, email: `t${k}@example.com`, ip: "x", status: k < 2 ? "verkauft" : "frei", at: new Date().toISOString(), bis: new Date().toISOString() });
  const echtGet = store.get;
  store.get = async (k) => { await wait(25); return echtGet(k); };
  try {
    let t0 = Date.now(); const b1 = await shop.bestand(sT, cT); const kalt = Date.now() - t0;
    t0 = Date.now(); const b2 = await shop.bestand(sT, cT); const warm = Date.now() - t0;
    check(b1.nr5.verkauft === 2 && b1.nr5.verfuegbar === 8 && b2.nr5.verkauft === 2 && b2.nr5.verfuegbar === 8 && kalt < 1500 && warm < 300, "150 Tickets: Stückzahl gleichzeitig gelesen (unter 1,5 s statt 3,75 s nacheinander), danach erledigte Tickets gemerkt", { kalt, warm });
  } finally { store.get = echtGet; }
}

console.log("Ein Aktions-Gutschein pro Person, Schutz vor Blockieren");
const jk = await kauf("nr5", "kim@example.com");
check(jk.status === 409 && jk.code === "je_kaeufer", "Gleiche E-Mail (schon Nr. 4 gekauft): abgewiesen", jk);
const jk2 = await kauf("nr5", "KIM@Example.com ");
check(jk2.status === 409, "… auch in anderer Schreibweise");
process.env.TF_GS_MAX_JE_IP = "2";
const ip1 = await kauf("nr5", "ip1@example.com"), ip2 = await kauf("nr5", "ip2@example.com"), ip3 = await kauf("nr5", "ip3@example.com");
check(ip1.status === 200 && ip2.status === 200 && ip3.status === 429, "Zu viele offene Kassen vom selben Anschluss: abgewiesen", [ip1.status, ip2.status, ip3.status]);
process.env.TF_GS_MAX_JE_IP = "100";
await post({ abbruch: ip1.zahlung }); await post({ abbruch: ip2.zahlung });

console.log("Wertgutschein mit eigenem Betrag");
for (const [b, soll] of [["49", 400], ["2001", 400], ["120,50", 400], ["", 400]]) { const x = await kauf("frei", "frei@example.com", { betrag: b }); check(x.status === soll, `Betrag „${b}“ → ${soll}`, x); }
const fr = await kauf("frei", "frei@example.com", { betrag: "120", empfaenger: "Max" });
await bezahlen(fr.url);
const zf = await bisBezahlt(fr.zahlung);
check(zf.betragCent === 12000 && !zf.gutschein.wertCent && !zf.gutschein.bonusCent && gs.gutscheinWertCent(zf) === 12000 && zf.gutschein.gueltigBis.startsWith("2029-12-31"), "120 € → Wert = bezahlt = 120 €, ohne Bonus, gültig bis 31.12.2029");
const mf = mailsAn("frei@example.com").find((x) => /über 120,00 €/.test(x.subject));
check(mf && !/löst du den vollen Wert/.test(mf.html) && /Widerrufsbelehrung/.test(mf.html), "Mail ohne Bonus-Satz, mit Widerrufsbelehrung");
check((await kauf("frei", "frei@example.com", { betrag: "100", inhaltOk: false })).status === 400 && (await kauf("frei", "", { betrag: "100" })).status === 400, "Ohne Häkchen bzw. ohne E-Mail: abgewiesen");

console.log("Verkaufszeitraum");
process.env.TF_JETZT = "2026-12-24T15:59:00+01:00";
check((await get("/api/gutschein-shop?s=tattoo-fashion-munich")).shop.aktionOffen, "24.12. 15:59: Aktions-Gutscheine noch kaufbar");
process.env.TF_JETZT = "2026-12-24T16:01:00+01:00";
check(!(await get("/api/gutschein-shop?s=tattoo-fashion-munich")).shop.aktionOffen, "24.12. 16:01: Aktion vorbei");
process.env.TF_JETZT = "2026-12-25T10:00:00+01:00";
d = await get("/api/gutschein-shop?s=tattoo-fashion-munich");
const nach = await kauf("nr5", "spaet@example.com"), fr2 = await kauf("frei", "spaet@example.com", { betrag: "80" });
check(!d.shop.aktionOffen && nach.status === 409 && fr2.status === 200, "Ab 25.12.: Aktions-Gutscheine nicht mehr kaufbar, Wertgutschein weiter", [d.shop.aktionOffen, nach.status, fr2.status]);
await post({ abbruch: fr2.zahlung });
process.env.TF_JETZT = "2026-11-23T21:05:00+01:00";

console.log("Sicherheit: alter Link, Zurück-Taste, fremde Adresse");
{
  // Abgebrochene Shop-Bestellung (Nr. 3 von oben) über den normalen Zahlungslink: gesperrt
  const alt = await fetch(BASE + "/api/pay", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ z: gew[0].zahlung, inhaltOk: true }) });
  check(alt.status === 410, "Abgebrochener Aktions-Gutschein lässt sich über zahlung.html?z= NICHT nachkaufen (410)", alt.status);
  const offen = await kauf("nr2", "zurueck@example.com");
  const alt2 = await fetch(BASE + "/api/pay", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ z: offen.zahlung, inhaltOk: true }) });
  check(alt2.status === 410, "Auch eine offene Shop-Kasse nicht über den normalen Link (keine zweite Kasse)", alt2.status);
  // Zurück-Taste aus Stripe (ohne Abbrechen-Link): neuer Versuch mit derselben E-Mail beendet die alte Kasse und geht durch
  const neu = await kauf("nr4", "zurueck@example.com");
  st = await mockState();
  const zAlt = await getZahlung("st_tfm_test", offen.zahlung);
  check(neu.status === 200 && zAlt.status === "abgebrochen" && Object.values(st.sessions).find((x) => x.client_reference_id === offen.zahlung).status === "expired", "Zurück-Taste: neuer Kauf möglich, alte Kasse beendet und freigegeben", neu);
  await post({ abbruch: neu.zahlung });
  check((await fetch(BASE + "/gutschein-kaufen/anderes-studio")).status === 404, "/gutschein-kaufen/<anderes Studio> → 404 (keine TFM-Seite)");
}

console.log("Teil-Einlösung (Restwert bleibt)");
{
  const { sessionCookie } = await import("../netlify/functions/_lib/auth.mjs");
  const ck = sessionCookie("st_tfm_test").split(";")[0];
  const ein = (zid, b, method = "POST") => fetch(`${BASE}/api/portal/gutschein/${zid}/einloesen`, { method, headers: { "content-type": "application/json", cookie: ck }, body: method === "POST" ? JSON.stringify(b) : undefined }).then(async (r) => ({ ...(await r.json()), http: r.status }));
  let r1 = await ein(z.id, { betrag: "200" });
  check(r1.http === 200 && r1.gutschein.aktuellerWertCent === 30000 && r1.gutschein.status === "gueltig", "Nr. 4 (Wert 500 €): 200 € eingelöst → noch 300 €, weiter gültig", r1);
  const zt = await getZahlung("st_tfm_test", z.id);
  check(gs.aktuellerWertCent(zt, new Date("2027-04-01T08:00:00Z")) === 30000, "Nach Bonus-Frist: eingelöster Betrag zählt zuerst gegen den Bonus → noch 300 € (375 − (200 − 125))");
  check((await ein(z.id, { betrag: "400" })).http === 409, "Mehr als der Restwert: abgewiesen");
  const gat = await get("/api/gutschein?t=" + z.gutschein.token);
  check(gat.gutschein.restCent === 30000, "Online-Ansicht des Käufers zeigt Restwert 300 €");
  r1 = await ein(z.id, {});
  check(r1.http === 200 && r1.gutschein.status === "eingeloest" && r1.gutschein.aktuellerWertCent === 0, "Ohne Betrag (wie iPhone-App): Rest ganz eingelöst");
  r1 = await ein(z.id, null, "DELETE");
  check(r1.http === 200 && r1.gutschein.status === "gueltig" && r1.gutschein.aktuellerWertCent === 30000, "Letzte Einlösung zurücknehmen → wieder 300 € offen");
}

console.log("Landshut: eigene Stückzahl, eigener Look");
{
  // In München ist Nr. 1 oben verkauft worden – in Landshut ist sie weiter da (Stückzahl getrennt je Studio)
  let dl = await get("/api/gutschein-shop?s=tattoo-fashion-landshut");
  const nrL = (id) => dl.shop.aktionen.find((a) => a.id === id);
  check(nrL("nr1").verfuegbar === 1 && !nrL("nr1").ausverkauft && nrL("nr4").verfuegbar === 6 && nrL("nr3").verfuegbar === 2, "Verkäufe/Reservierungen in München zählen nicht für Landshut", dl.shop.aktionen);
  const l1 = await kaufLa("nr1", "lea@example.com", { empfaenger: "Max" });
  let stl = await mockState();
  const csl = Object.values(stl.sessions).find((x) => x.client_reference_id === l1.zahlung);
  check(l1.status === 200 && csl && csl.account === "acct_tfla_test" && Number(csl.line_items[0].price_data.unit_amount) === 150000 && csl.branding_settings?.display_name === "Tattoo Fashion Landshut" && /\/assets\/gs-shop\/tfla\/logo\.png$/.test(csl.branding_settings?.logo?.url || "") && /\/gutschein-kaufen\/tattoo-fashion-landshut\?bezahlt=/.test(csl.success_url) && /\/gutschein-kaufen\/tattoo-fashion-landshut\?abbruch=/.test(csl.cancel_url), "Kasse Landshut: 1.500 € auf das Konto von Landshut, Look und Rückweg Landshut", csl && { acc: csl.account, b: csl.branding_settings, su: csl.success_url });
  check(csl && csl.billing_address_collection === "auto" && String(csl.phone_number_collection?.enabled) === "false", "Kasse Landshut: keine Pflicht-Adresse, kein Telefon");
  await bezahlen(l1.url);
  const zl = await bisBezahltLa(l1.zahlung);
  check(zl.status === "bezahlt" && zl.gutschein.wertCent === 200000 && zl.betragCent === 150000, "Landshut Nr. 1 bezahlt: Wert 2.000 €, bezahlt 1.500 €");
  dl = await get("/api/gutschein-shop?s=tattoo-fashion-landshut");
  d = await get("/api/gutschein-shop?s=tattoo-fashion-munich");
  check(nrL("nr1").ausverkauft && nr("nr1").ausverkauft && nr("nr4").verkauft === 1, "Danach: Nr. 1 in beiden Städten ausverkauft, München Nr. 4 unverändert");
  const ml = mailsAn("lea@example.com").find((x) => /Dein Gutschein von Tattoo Fashion Landshut über 2\.000,00 €/.test(x.subject));
  check(ml && /\/assets\/gs-shop\/tfla\/logo\.png/.test(ml.html) && /neelsen\.andy@gmail\.com/.test(ml.html) && /Neustadt 502/.test(ml.html) && /Widerrufsbelehrung/.test(ml.html) && !/tattoofashion\.munich/.test(ml.html), "Mail Landshut: Logo Landshut, Verkäufer/Fragen Landshut, Widerrufsbelehrung, nichts aus München", mailsAn("lea@example.com").map((x) => x.subject));
  check(mailsAn("tfla@example.com").some((x) => /Gutschein verkauft: Wert 2\.000,00 €, bezahlt 1\.500,00 €/.test(x.subject)), "Studio-Mail an Landshut");
  const { buf: pdfL, text: ptL } = await pdfMitText(async () => gs.gutscheinPdf(await (await import("../netlify/functions/_lib/store.mjs")).getStudio("st_tfla_test"), zl));
  fs.writeFileSync(path.join(shots, "gutschein-landshut-nr1.pdf"), pdfL);
  check(/2\.000 €/.test(ptL) && /Weihnachts-Gutschein/.test(ptL) && /Landshut/.test(ptL) && /VOLLER WERT 2\.000 € BIS 31\.03\.2027/.test(ptL) && !/1\.500/.test(ptL) && !/München|Munich|Aktions-Gutschein/.test(ptL), "PDF Landshut: Wert 2.000 €, „Weihnachts-Gutschein“, Landshut, kein München", ptL.slice(0, 300));
  const kimLa = await kaufLa("nr4", "kim@example.com");
  check(kimLa.status === 200, "1 Aktions-Gutschein pro Person gilt je Studio (Käufer aus München darf in Landshut)", kimLa);
  await post({ abbruch: kimLa.zahlung });
  const lea2 = await kaufLa("nr5", "lea@example.com");
  check(lea2.status === 409 && lea2.code === "je_kaeufer", "Landshut: zweiter Aktions-Gutschein derselben Person abgewiesen");
}

console.log("Seiten je Stadt (statisch, og-Tags, Rechtliches nur im Fuß)");
{
  const seite = async (u) => { const r = await fetch(BASE + u); return { status: r.status, html: await r.text() }; };
  const meta = (html, k) => (html.match(new RegExp(`<meta (?:property|name)="${k.replace(/[.:]/g, (c) => "\\" + c)}" content="([^"]*)"`)) || [])[1];
  // Breite/Höhe aus dem JPEG-Kopf (SOF-Marke)
  const jpegMasse = (b) => { for (let i = 2; i < b.length - 9;) { if (b[i] !== 0xff) { i++; continue; } const m = b[i + 1], len = b.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xc2) return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) }; i += 2 + len; } return {}; };
  const STAEDTE = [
    { slug: "tattoo-fashion-munich", k: "tfm", stadt: "München", pixel: "2379676156103158", tel: "089 94403786", wa: "491626527442", ig: "tattoofashion_munich", g: "4,9", n: "348", adr: "Landshuter Allee 42", mail: "tattoofashion.munich@gmail.com", name: "Tattoo Fashion Munich, Inhaber Andy Neelsen" },
    { slug: "tattoo-fashion-landshut", k: "tfla", stadt: "Landshut", pixel: "1324284036136356", tel: "0871 14210163", wa: "491625642090", ig: "tattoofashion_landshut", g: "4,8", n: "167", adr: "Neustadt 502", mail: "neelsen.andy@gmail.com", name: "Tattoo Fashion Landshut, Inhaber Andy Neelsen" },
  ];
  const bilder = [];
  for (const t of STAEDTE) {
    const anders = STAEDTE.find((x) => x !== t);
    const x = await seite("/gutschein-kaufen/" + t.slug);
    const img = meta(x.html, "og:image") || "";
    bilder.push(img);
    check(x.status === 200 && meta(x.html, "og:url") === `https://tattoofin.de/gutschein-kaufen/${t.slug}` && new RegExp(`^https://tattoofin\\.de/assets/gs-shop/${t.k}/og-weihnachten\\.jpg\\?v=[0-9a-f]{8}$`).test(img) && meta(x.html, "og:image:width") === "1200" && meta(x.html, "og:image:height") === "630" && meta(x.html, "twitter:card") === "summary_large_image", `${t.stadt}: /gutschein-kaufen/${t.slug} 200, og:url + og:image absolut, 1200×630`, img);
    const datei = path.join(root, "public", new URL(img || "https://x/").pathname), jpg = fs.existsSync(datei) ? fs.readFileSync(datei) : Buffer.alloc(0), mass = jpegMasse(jpg);
    check(mass.w === 1200 && mass.h === 630 && jpg.length < 300000 && crypto.createHash("sha1").update(jpg).digest("hex").slice(0, 8) === new URL(img || "https://x/").searchParams.get("v"), `${t.stadt}: Vorschaubild ${t.k}/og-weihnachten.jpg 1200×630, < 300 KB, Prüfsumme in der Adresse aktuell`, { mass, kb: Math.round(jpg.length / 1024) });
    const ogT = meta(x.html, "og:title"), ogD = meta(x.html, "og:description") || "";
    // Fette Zeile in WhatsApp: Studio + Angebot; Beschreibung mit richtiger Stückzahl (21 = alle zusammen, nicht 21 vom 500er), kurz genug für 2 Zeilen
    check(ogT.replace(/\u00a0/g, " ") === `500 € Gutschein für 375 € · Tattoo Fashion ${t.stadt}` && (/<title>([^<]*)/.exec(x.html) || [])[1] === ogT && ogD.replace(/\u00a0/g, " ") === `Für Tattoo oder Piercing in ${t.stadt}. Auch 300 € für 200 €, insgesamt nur 21 Stück.` && meta(x.html, "description") === ogD && ogD.length <= 85 && !/unter Wert|Beträge/.test(x.html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, "")),
      `${t.stadt}: Titel/og:title „500 € Gutschein für 375 € · Tattoo Fashion ${t.stadt}“ (Angebot vorn), Beschreibung mit wofür und wo, kein „unter Wert“/„Beträge“`, { ogT, ogD, l: ogD.length });
    check(["icon-32.png", "icon-180.png", "icon-192.png", "geschenk-480.webp", "geschenk-960.webp", "geschenk-1400.webp", "geschenk-960.png", "pdf-muster.webp", "pdf-muster.jpg", "pdf-grund.jpg", "og-weihnachten-neutral.jpg", "og-gutschein.jpg", "logo-gold-480.webp", "logo-gold-960.webp", "logo-gold-1400.webp"].every((f) => fs.existsSync(path.join(root, "public/assets/gs-shop", t.k, f)))
      && x.html.includes(`apple-touch-icon" href="/assets/gs-shop/${t.k}/icon-180.png"`) && x.html.includes(`/assets/gs-shop/${t.k}/geschenk-1400.webp 1400w`) && !/w-[a-z-]+\.jpg|favicon\.png/.test(x.html), `${t.stadt}: scharfe Bilder (Geschenk 480/960/1400, Logo bis 1.400 px, Symbole 32/180/192, Gutschein-Muster)`);
    check(x.html.includes(`fbq('init','${t.pixel}')`) && !x.html.includes(anders.pixel) && x.html.includes(`/assets/gs-shop/${t.k}/logo-gold-480.webp`) && x.html.includes(t.tel) && x.html.includes(`wa.me/${t.wa}`) && x.html.includes(`instagram.com/${t.ig}/`) && x.html.includes(`Gutschein von Tattoo Fashion ${t.stadt} mit roter Schleife`) && x.html.includes(`<b>${t.g}</b> · ${t.n} Google-Bewertungen`) && !x.html.includes(anders.adr), `${t.stadt}: eigenes Pixel, Logo, Telefon, WhatsApp, Instagram, Google-Bewertung, keine Angaben der anderen Stadt`);
    const main = x.html.slice(x.html.indexOf("<main>"), x.html.indexOf("</main>"));
    check(!/Widerruf|Impressum|Verkäufer|Muster-Widerrufsformular|Gutscheinbedingungen|type="checkbox"/.test(main) && !/type="checkbox"|f-ok/.test(x.html), `${t.stadt}: keine Rechtstexte im Seiteninhalt, kein Häkchen im Kauf`);
    check(["impressum", "datenschutz", "widerruf", "bedingungen"].every((a) => x.html.includes(`href="/gutschein-kaufen/${t.slug}-${a}"`)), `${t.stadt}: Fuß-Links Impressum, Datenschutz, Widerruf, Gutscheinbedingungen`);
    const imp = await seite(`/gutschein-kaufen/${t.slug}-impressum`), wid = await seite(`/gutschein-kaufen/${t.slug}-widerruf`), bed = await seite(`/gutschein-kaufen/${t.slug}-bedingungen`), dsg = await seite(`/gutschein-kaufen/${t.slug}-datenschutz`);
    check(imp.status === 200 && imp.html.includes(t.name) && imp.html.includes(t.adr) && imp.html.includes(t.mail) && !imp.html.includes(anders.mail), `${t.stadt}: Impressum mit Verkäufer ${t.name}`);
    check(wid.status === 200 && /vierzehn Tagen/.test(wid.html) && wid.html.includes(t.adr) && /Muster-Widerrufsformular/.test(wid.html), `${t.stadt}: Widerrufsbelehrung mit Adresse und Muster-Formular`);
    check(bed.status === 200 && /31\.03\.2027/.test(bed.html) && /in Teilen einlösen/.test(bed.html) && /24\.12\.2026 um 16 Uhr/.test(bed.html) && bed.html.includes(t.adr), `${t.stadt}: Gutscheinbedingungen (Bonus-Frist, Teil-Einlösung, Aktionsende, Adresse)`);
    check(dsg.status === 200 && dsg.html.includes(t.mail) && /Meta-Pixel/.test(dsg.html) && /Stripe/.test(dsg.html) && !/Telefonnummer, um/.test(dsg.html), `${t.stadt}: Datenschutz mit Verantwortlichem der Stadt`);
  }
  check(bilder[0] !== bilder[1], "Jede Stadt hat ihr eigenes Vorschaubild");
  check((await fetch(BASE + "/gutschein-kaufen/tattoo-fashion-berlin")).status === 404, "Unbekannte Stadt /gutschein-kaufen/tattoo-fashion-berlin → 404");
}

console.log("Seite im Browser (Handy)");
let webkit = null;
try { ({ webkit } = require("playwright")); } catch { try { ({ webkit } = require("/opt/node22/lib/node_modules/playwright")); } catch {} }
const browser = await chromium.launch();
const errors = [];
const beobachten = (pg) => { pg.on("pageerror", (e) => errors.push(e.message)); pg.on("console", (m) => { if (m.type() === "error" && !/umami|fbevents/.test(m.text())) errors.push("Konsole: " + m.text()); }); };
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
beobachten(p);
await p.goto(BASE + "/gutschein-kaufen/tattoo-fashion-munich");
await p.waitForSelector("button.zeile[data-wahl=nr4] .rest:has-text('von')");
const heroOk = await p.evaluate(() => { const h = document.querySelector(".hero").getBoundingClientRect(), k = document.getElementById("hero-kaufen").getBoundingClientRect(), l = document.querySelector(".logo-box").getBoundingClientRect(), t = document.querySelector(".hero .text").getBoundingClientRect(); return Math.abs(h.height - innerHeight) <= 2 && k.bottom <= innerHeight && l.height >= 60 && l.bottom <= t.top + 1; });
check(heroOk, "Hero = erster Bildschirm, Geschenk mit Logo über dem Text, Knopf „Gutschein aussuchen“ sichtbar");
const heroText = await p.evaluate(() => [...document.querySelectorAll(".hero h1, .hero p.lead, .hero .cd-titel")].filter((x) => x.offsetParent).map((x) => x.textContent.replace(/ /g, " ")).join(" | "));
check(/500 € Gutschein für 375 €/.test(heroText) && /Für Tattoo oder Piercing in München\. Schon ab 200 € \(Wert 300 €\)/.test(heroText) && /Aktion endet am 24\.12\. um 16 Uhr/.test(heroText) && !/bis zu|Beträge|unter Wert/i.test(heroText), "Hero: Angebot groß (500 € für 375 €), „Für Tattoo oder Piercing in München. Schon ab 200 €“, Aktionsende sichtbar, kein „bis zu“/„unter Wert“", heroText);
await p.screenshot({ path: path.join(shots, "handy-hero.png") });
{
  const dApi = await get("/api/gutschein-shop?s=tattoo-fashion-munich");
  const soll = (a) => (a.ausverkauft ? "Ausverkauft" : a.verfuegbar <= 0 ? "Gerade reserviert" : a.verfuegbar >= a.stueck ? `Nur ${a.stueck} Stück` : `Noch ${a.verfuegbar} von ${a.stueck}`);
  const karten = await p.$$eval("#bogen button.zeile[data-wahl^=nr]", (l) => l.map((x) => ({ id: x.dataset.wahl, rest: x.querySelector(".rest").textContent.replace(/ /g, " "), chip: x.querySelector(".chip").textContent.replace(/ /g, " "), aus: x.disabled })));
  check(dApi.shop.aktionen.every((a, i) => karten[i].rest === soll(a) && karten[i].chip === `${((a.wertCent - a.preisCent) / 100).toLocaleString("de-DE")} € geschenkt`),
    "Liste: je Karte Ersparnis („125 € geschenkt“) und Stückzahl („Nur 10 Stück“ solange nichts weg ist, sonst „Noch 5 von 6“)", karten);
  const rest = dApi.shop.aktionen.reduce((s, a) => s + a.verfuegbar, 0);
  const klein = (await p.textContent("#hero-klein")).replace(/ /g, " "), pille = (await p.textContent("#top-stueck")).replace(/ /g, " ");
  const n4 = dApi.shop.aktionen.find((a) => a.id === "nr4");
  check(karten[0].aus && karten[0].rest === "Ausverkauft" && klein === `Noch ${n4.verfuegbar} von 6 zu diesem Preis` && pille === `Noch ${rest} von 21`, "Nr. 1 ausverkauft (gesperrt); unter dem Knopf die Stückzahl des 500ers aus der Überschrift („Noch 5 von 6 zu diesem Preis“), Kopf-Pille alle zusammen", { klein, pille });
  const waehlen = await p.$$eval("#bogen button.zeile", (l) => l.map((x) => ({ id: x.dataset.wahl, aus: x.disabled, pfeil: Boolean(x.querySelector(".waehlen,.pfeil") && getComputedStyle(x.querySelector(".waehlen,.pfeil")).display !== "none") })));
  check(waehlen.every((x) => x.aus ? !x.pfeil : x.pfeil), "Jede kaufbare Karte zeigt „Wählen →“ (bzw. den Pfeil beim eigenen Betrag), verkaufte nicht", waehlen);
  const kopf = await p.evaluate(() => ({ imHero: getComputedStyle(document.getElementById("top-pille")).opacity, punkt: getComputedStyle(document.querySelector(".dot")).animationName, abschnitt: document.querySelector("#gutscheine .eyebrow").textContent, h2: document.querySelector("#gutscheine h2").textContent }));
  check(kopf.imHero === "0" && kopf.punkt === "none" && !/Stück/.test(kopf.abschnitt) && !/21|Aktions-Gutscheine/.test(kopf.h2), "Stückzahl nur einmal je Bildschirm: Kopf-Pille erst nach dem Hero, Abschnitt ohne zweite „Nur 21 Stück“-Pille, roter Punkt pulsiert nicht", kopf);
}
await p.locator("#gutscheine").scrollIntoViewIfNeeded();
await p.screenshot({ path: path.join(shots, "handy-liste.png") });
// Feste Kauf-Leiste: weg, solange die Gutschein-Liste zu sehen ist; da, wenn nur Text zu sehen ist
await p.evaluate(() => document.getElementById("bogen").scrollIntoView({ block: "center" })); await p.waitForTimeout(500);
const leisteListe = await p.evaluate(() => document.getElementById("sticky").classList.contains("show"));
await p.evaluate(() => document.getElementById("faq").scrollIntoView({ block: "start" })); await p.waitForTimeout(500);
const leisteFaq = await p.evaluate(() => document.getElementById("sticky").classList.contains("show"));
check(!leisteListe && leisteFaq, "Feste Kauf-Leiste verdeckt die Gutschein-Liste nicht (weg über der Liste, da bei den Fragen)", { leisteListe, leisteFaq });
await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
await p.click("#hero-kaufen");
check(await p.isVisible("#funnel") && /Schritt 1 von 2/.test(await p.textContent("#f-schritt")) && await p.evaluate(() => document.querySelector("main").inert && document.activeElement.id === "f-titel"), "Hero-Knopf öffnet den Kauf (Schritt 1 von 2), Fokus im Fenster, Seite dahinter gesperrt");
{
  const w1 = await p.evaluate(() => ({ an: (document.querySelector("#wahl input:checked") || {}).value, erste: [...document.querySelectorAll("#wahl input")].map((i) => i.value + (i.disabled ? "-" : "")).join(" "), weg: (document.querySelector("#wahl .weg-zeile") || {}).textContent || "", regel: document.getElementById("f-regel").textContent }));
  check(w1.an === "nr4" && !/nr1/.test(w1.erste) && !/-/.test(w1.erste.split(" frei")[0]) && /Schon verkauft: 2\.000/.test(w1.weg.replace(/ /g, " ")) && /1 Aktions-Gutschein pro Person/.test(w1.regel),
    "Hero-Knopf: 500-€-Gutschein (Angebot der Überschrift) schon markiert; kaufbare zuerst, verkaufte nur als Zeile „Schon verkauft: 2.000 €“ am Ende; Hinweis „1 pro Person“", w1);
}
await p.screenshot({ path: path.join(shots, "handy-schritt1.png") });
await p.click("#wahl label:has(input[value=nr5])");
await p.waitForFunction(() => /Schritt 2 von 2/.test(document.getElementById("f-schritt").textContent), null, { timeout: 3000 }).catch(() => {});
check(/Schritt 2 von 2/.test(await p.textContent("#f-schritt")) && /300 €-Gutschein|300-€-Gutschein/.test((await p.textContent("#f-summe")).replace(/ /g, " ")) && /du zahlst 200 €/.test((await p.textContent("#f-summe")).replace(/ /g, " ")) && /Weiter zur Zahlung/.test(await p.textContent("#f-weiter")) && await p.isHidden("#f-extra"),
  "Tipp auf einen Aktions-Gutschein: gleich Schritt 2 (ohne „Weiter“), Summe „300-€-Gutschein – du zahlst 200 €“", await p.textContent("#f-summe"));
await p.fill("#f-name", "Handy Käuferin"); await p.fill("#f-email", "handy@example.com");
await p.click("#f-plus");
await p.fill("#f-empf", "Jonas"); await p.fill("#f-gruss", "Für dein erstes Tattoo");
check(await p.evaluate(() => { const b = document.getElementById("f-weiter").getBoundingClientRect(); return b.bottom <= innerHeight; }), "Schritt 2: Weiter-Knopf unten sichtbar");
await p.setViewportSize({ width: 390, height: 480 }); // offene Tastatur
check(await p.evaluate(() => { const b = document.getElementById("f-weiter").getBoundingClientRect(); return b.bottom <= innerHeight && b.top >= 0; }), "Mit offener Tastatur (390×480): Weiter-Knopf erreichbar");
await p.screenshot({ path: path.join(shots, "handy-schritt2-tastatur.png") });
await p.setViewportSize({ width: 390, height: 844 });
await p.screenshot({ path: path.join(shots, "handy-schritt2.png") });
await Promise.all([p.waitForURL(new RegExp(`localhost:${MOCK_PORT}/pay/`)), p.click("#f-weiter")]);
check(true, "Ohne Häkchen und ohne Übersicht direkt zur Zahlung (Stripe)");
await Promise.all([p.waitForURL(/gutschein-kaufen\/tattoo-fashion-munich/), p.click("#pay")]);
await p.waitForFunction(() => /im Wert von 300 € mit Code/.test(document.getElementById("danke-text").textContent.replace(/ /g, " ")), null, { timeout: 15000 }).catch(() => {});
check(/Gutschein im Wert von 300 € mit Code schicken wir dir sofort/.test((await p.textContent("#danke-text")).replace(/ /g, " ")) && await p.isVisible("#danke"), "Nach der Zahlung: Danke im Shop-Look „… im Wert von 300 € mit Code schicken wir dir sofort …“");
await p.screenshot({ path: path.join(shots, "handy-danke.png") });
{
  // Nach dem Kauf: der nächste Gutschein ist oft für jemand anderen → Beschenkter und Gruß leer, Name und E-Mail des Käufers bleiben
  await p.click("#f-weiter"); await p.waitForSelector("#funnel", { state: "hidden" });
  await p.evaluate(() => document.querySelector("#bogen button.zeile[data-wahl^=nr]:not([disabled])").click());
  await p.waitForFunction(() => /Schritt 2 von 2/.test(document.getElementById("f-schritt").textContent), null, { timeout: 5000 }).catch(() => {});
  const nk = await p.evaluate(() => ({ name: document.getElementById("f-name").value, email: document.getElementById("f-email").value, empf: document.getElementById("f-empf").value, gruss: document.getElementById("f-gruss").value, zu: document.getElementById("f-extra").hidden }));
  check(nk.name === "Handy Käuferin" && nk.email === "handy@example.com" && !nk.empf && !nk.gruss && nk.zu, "Nach dem Kauf: zweiter Gutschein ohne alten Beschenkten und Gruß (Name und E-Mail des Käufers bleiben)", nk);
  await p.click("#f-zu");
}
const mh = mailsAn("handy@example.com").find((x) => /über 300,00 €/.test(x.subject));
check(mh && /Jonas/.test(mh.html + JSON.stringify(mh)), "Gutschein-Mail an handy@example.com (Wert 300 €, für Jonas)");
// Abbruch im Browser (Landshut, Karte direkt aus der Liste → gleich Schritt 2). Danach: Fenster mit derselben Auswahl und den Eingaben wieder offen
await p.goto(BASE + "/gutschein-kaufen/tattoo-fashion-landshut");
await p.waitForSelector("button.zeile[data-wahl=nr4] .rest:has-text('Stück')");
await p.screenshot({ path: path.join(shots, "handy-hero-landshut.png") });
await p.click("button.zeile[data-wahl=nr4]");
check(/Schritt 2 von 2/.test(await p.textContent("#f-schritt")), "Tipp auf eine Gutschein-Karte: direkt Schritt 2");
await p.fill("#f-name", "Abbruch Test"); await p.fill("#f-email", "abbruch@example.com");
await Promise.all([p.waitForURL(new RegExp(`localhost:${MOCK_PORT}/pay/`)), p.press("#f-email", "Enter")]);
await Promise.all([p.waitForURL(/gutschein-kaufen\/tattoo-fashion-landshut/), p.click("#cancel")]);
await p.waitForFunction(() => !document.getElementById("funnel").hidden, null, { timeout: 5000 }).catch(() => {});
const dl2 = await get("/api/gutschein-shop?s=tattoo-fashion-landshut");
await p.waitForFunction(() => /abgebrochen/.test(document.getElementById("f-hinweis").textContent), null, { timeout: 5000 }).catch(() => {});
await p.waitForTimeout(600); // Fenster fährt hoch
const abbr = await p.evaluate(() => { const x = document.getElementById("f-zu").getBoundingClientRect(), e = document.elementFromPoint(x.left + x.width / 2, x.top + x.height / 2); return { hinweis: document.getElementById("f-hinweis").textContent, meldung: !document.getElementById("meldung").hidden, xFrei: e && e.id === "f-zu", farbe: getComputedStyle(document.getElementById("f-hinweis")).color }; });
check(/nichts bezahlt/.test(abbr.hinweis) && !abbr.meldung && abbr.xFrei && dl2.shop.aktionen.find((a) => a.id === "nr4").verfuegbar === 6, "Landshut: Enter im E-Mail-Feld startet die Kasse; Abbrechen → Hinweis „nichts bezahlt“ im Kauf-Fenster über dem Knopf (verdeckt weder Kopf noch ×), Nr. 4 wieder frei", abbr);
check(/Schritt 2 von 2/.test(await p.textContent("#f-schritt")) && (await p.inputValue("#f-name")) === "Abbruch Test" && (await p.inputValue("#f-email")) === "abbruch@example.com" && /500-€-Gutschein/.test(await p.textContent("#f-summe")), "Nach dem Abbrechen: Kauf-Fenster wieder offen, gleiche Auswahl, Name und E-Mail schon eingetragen");
await p.click("#f-zu");
// Zurück-Taste aus der Kasse (ohne „Abbrechen“): Gutschein sofort wieder frei (Landshut Nr. 2, 2 Stück)
{
  await p.click("button.zeile[data-wahl=nr2]");
  await p.fill("#f-name", "Zurück Taste"); await p.fill("#f-email", "zurueck-taste@example.com");
  await Promise.all([p.waitForURL(new RegExp(`localhost:${MOCK_PORT}/pay/`)), p.click("#f-weiter")]);
  const waehrend = (await get("/api/gutschein-shop?s=tattoo-fashion-landshut")).shop.aktionen.find((a) => a.id === "nr2").verfuegbar;
  await p.goBack();
  await p.waitForURL(/gutschein-kaufen\/tattoo-fashion-landshut/);
  let frei = 0; for (let i = 0; i < 30 && frei !== 2; i++) { await wait(150); frei = (await get("/api/gutschein-shop?s=tattoo-fashion-landshut")).shop.aktionen.find((a) => a.id === "nr2").verfuegbar; }
  await p.waitForFunction(() => !document.getElementById("funnel").hidden, null, { timeout: 5000 }).catch(() => {});
  st = await mockState();
  const sess = Object.values(st.sessions).filter((x) => x.customer_email === "zurueck-taste@example.com" || /zurueck-taste/.test(JSON.stringify(x))).pop();
  check(waehrend === 1 && frei === 2 && (!sess || sess.status === "expired") && /Schritt 2 von 2/.test(await p.textContent("#f-schritt")), "Zurück-Taste aus der Kasse: Kasse sofort beendet, Gutschein gleich wieder frei (nicht 30 Minuten gesperrt), Fenster mit Auswahl wieder offen", { waehrend, frei, s: sess && sess.status });
  await p.click("#f-zu");
}
await ctx.close();

// Fehler sind immer sichtbar (fester Fuß über dem Knopf), auch auf kleinen Handys und in Safari (WebKit)
for (const [eng, name] of [[chromium, "Chromium"], [webkit, "Safari"]]) {
  if (!eng) { check(false, "WebKit fehlt (npx playwright install webkit)"); continue; }
  const br = eng === chromium ? browser : await eng.launch();
  for (const [w, h] of [[375, 667], [320, 568]]) {
    const c3 = await br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, ...(eng === chromium ? { isMobile: true, hasTouch: true } : {}) });
    const p3 = await c3.newPage(); beobachten(p3);
    await p3.goto(BASE + "/gutschein-kaufen/tattoo-fashion-munich"); await p3.waitForSelector("html.geladen");
    const sichtbar = () => p3.evaluate(() => { const f = document.getElementById("f-fehler"), r = f.getBoundingClientRect(); if (!f.textContent || !r.height) return false; const x = r.left + r.width / 2, y = r.top + r.height / 2, e = document.elementFromPoint(x, y); return r.top >= 0 && r.bottom <= innerHeight && Boolean(e) && (e === f || f.contains(e)); });
    const ergebnis = {};
    await p3.evaluate(() => document.querySelector("main [data-kaufen]").click()); await p3.waitForSelector("#funnel:not([hidden])"); await p3.click("#f-weiter"); ergebnis.keineWahl = await sichtbar();
    // Vorschläge 100/200/300/500 € und Feld + Vorschläge über dem festen Fuß („Weiter“), gleich nach dem Antippen und nach dem Fehler
    const vorschlaegeSichtbar = () => p3.evaluate(() => { const c = [...document.querySelectorAll("#wahl [data-betrag]")], inh = document.getElementById("f-form").getBoundingClientRect(), f = document.getElementById("f-betrag").getBoundingClientRect(), l = c[c.length - 1].getBoundingClientRect(); return c.map((x) => x.dataset.betrag).join() === "100,200,300,500" && f.top >= inh.top - 1 && l.bottom <= inh.bottom + 1; });
    await p3.click("#wahl label:has(input[value=frei])"); await p3.waitForTimeout(250); ergebnis.vorschlaege = await vorschlaegeSichtbar();
    await p3.click("#f-weiter"); ergebnis.betrag = await sichtbar(); await p3.waitForTimeout(250); ergebnis.vorschlaegeNachFehler = await vorschlaegeSichtbar();
    ergebnis.platzhalter = await p3.$eval("#f-betrag", (i) => i.placeholder === "z. B. 200" && parseFloat(getComputedStyle(i, "::placeholder").fontSize) <= 16);
    await p3.click("#wahl label:has(input[value=nr5])"); await p3.waitForTimeout(450);
    await p3.click("#f-weiter"); ergebnis.name = await sichtbar();
    await p3.fill("#f-name", "Kim"); await p3.fill("#f-email", "kim@"); await p3.click("#f-weiter"); ergebnis.email = await sichtbar();
    await p3.fill("#f-email", "kim@example.com"); await p3.click("#f-weiter"); // schon einen Aktions-Gutschein gekauft → Server lehnt ab
    await p3.waitForFunction(() => /Pro Person/.test(document.getElementById("f-fehler").textContent), null, { timeout: 20000 }).catch(() => {});
    ergebnis.server = await sichtbar();
    ergebnis.ausweg = /Wertgutschein mit eigenem Betrag/.test(await p3.textContent("#f-fehler")) && await p3.isVisible("#f-err-knopf");
    await p3.screenshot({ path: path.join(shots, `pro-person-${name}-${w}x${h}.png`) });
    await p3.click("#f-err-knopf"); await p3.waitForTimeout(150);
    ergebnis.ausweg = ergebnis.ausweg && await p3.evaluate(() => /Schritt 1 von 2/.test(document.getElementById("f-schritt").textContent) && (document.querySelector("#wahl input:checked") || {}).value === "frei" && document.getElementById("f-email").value === "kim@example.com");
    await p3.screenshot({ path: path.join(shots, `fehler-${name}-${w}x${h}.png`) });
    check(Object.values(ergebnis).every(Boolean), `${name} ${w}×${h}: jede Fehlermeldung (keine Wahl, Betrag, Name, E-Mail, Server „Pro Person …“) sichtbar über dem Knopf, bei „Pro Person“ Knopf „Eigenen Betrag wählen“; Vorschläge 100–500 € über dem Fuß; Platzhalter „z. B. 200“`, ergebnis);
    await c3.close();
  }
  // €-Zeichen bricht nie allein um (Liste, Kauf-Fenster, Summe)
  for (const w of [320, 360, 375]) for (const slug of ["tattoo-fashion-munich", "tattoo-fashion-landshut"]) {
    const c4 = await br.newContext({ viewport: { width: w, height: 740 }, deviceScaleFactor: 2 });
    const p4 = await c4.newPage(); beobachten(p4);
    await p4.goto(BASE + "/gutschein-kaufen/" + slug); await p4.waitForSelector("html.geladen");
    const einzeilig = () => p4.evaluate(() => [...document.querySelectorAll("#bogen .wert, #bogen .preis, #bogen .chip, #bogen .rest, .opt .o-w b, .opt .r b, .opt .chip, .summe span, .summe b, #hero-klein, .hero .eyebrow, #gutscheine .eyebrow, .final .eyebrow")].filter((e) => e.offsetParent)
      .filter((e) => { const tops = new Set(), tw = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); for (let n = tw.nextNode(); n; n = tw.nextNode()) { const r = document.createRange(); r.selectNodeContents(n); for (const x of r.getClientRects()) if (x.width > 0.5) tops.add(Math.round(x.bottom / 6)); } return tops.size > 1; }).map((e) => e.className + ": " + e.textContent));
    const vorher = await einzeilig();
    await p4.click("#hero-kaufen"); const imFenster = await einzeilig();
    await p4.click("#wahl label:has(input[value=nr2])"); await p4.waitForTimeout(450); const summe = await einzeilig();
    const breit = await p4.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
    check(!vorher.length && !imFenster.length && !summe.length && breit, `${name} ${w} px ${slug.slice(14)}: Beträge, Ersparnis, Stückzahl und Pillen einzeilig (kein € allein in der nächsten Zeile), kein Querscrollen`, [...vorher, ...imFenster, ...summe]);
    await c4.close();
  }
  if (br !== browser) await br.close();
}

// iPhone-Safari: das Fenster bleibt bei offener Tastatur gleich groß, nur der sichtbare Bereich (visualViewport) schrumpft und
// verschiebt sich. Nachgestellt mit einem künstlichen visualViewport: Kopf, Summe und Knopf müssen über der Tastatur bleiben.
{
  const c6 = await browser.newContext({ viewport: { width: 390, height: 664 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await c6.addInitScript(() => { const et = new EventTarget(), vv = { height: innerHeight, width: innerWidth, offsetTop: 0, offsetLeft: 0, scale: 1, addEventListener: et.addEventListener.bind(et), removeEventListener: et.removeEventListener.bind(et) };
    Object.defineProperty(window, "visualViewport", { value: vv, configurable: true }); window.__tastatur = (h, top) => { vv.height = h; vv.offsetTop = top; et.dispatchEvent(new Event("resize")); }; });
  const p6 = await c6.newPage(); beobachten(p6);
  await p6.goto(BASE + "/gutschein-kaufen/tattoo-fashion-landshut"); await p6.waitForSelector("html.geladen");
  await p6.click("button.zeile[data-wahl=nr5]"); await p6.waitForTimeout(700); // Fenster fährt hoch (0,35 s)
  const lage = async (h, top) => { await p6.evaluate(([h, top]) => window.__tastatur(h, top), [h, top]); await p6.waitForTimeout(150); return p6.evaluate(([h, top]) => { const r = (id) => document.getElementById(id).getBoundingClientRect(); const k = r("f-schritt"), w = r("f-weiter"), s = r("f-summe"), x = r("f-zu");
    return { kopf: k.top >= top && x.top >= top, knopf: w.bottom <= top + h + 1, summe: s.top >= top && s.bottom <= top + h }; }, [h, top]); };
  const ohne = await lage(330, 0), geschoben = await lage(330, 120), zu = await lage(664, 0);
  check([ohne, geschoben, zu].every((x) => x.kopf && x.knopf && x.summe), "Tastatur wie im iPhone (nur sichtbarer Bereich kleiner, auch verschoben): Kopf mit ×, Summe und „Weiter zur Zahlung“ bleiben über der Tastatur", { ohne, geschoben, zu });
  await c6.close();
}
// Überschrift aus dem Bestand (Landshut): 500-€-Gutschein ausverkauft → bestes kaufbares Angebot, „ab …“ nur aus vorhandenen Beträgen
{
  for (let i = 0; i < 6; i++) { const x = await kaufLa("nr4", `aus4-${i}@example.com`); await bezahlen(x.url); await bisBezahltLa(x.zahlung); }
  const dl3 = await get("/api/gutschein-shop?s=tattoo-fashion-landshut");
  const c7 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p7 = await c7.newPage(); beobachten(p7);
  await p7.goto(BASE + "/gutschein-kaufen/tattoo-fashion-landshut"); await p7.waitForSelector("html.geladen");
  const v7 = await p7.evaluate(() => ({ h1: document.querySelector(".hero h1").innerText.replace(/\s+/g, " ").replace(/ /g, " "), lead: document.getElementById("hero-lead").textContent.replace(/ /g, " "), ab: document.getElementById("liste-ab").textContent.replace(/ /g, " ") }));
  check(dl3.shop.aktionen.find((a) => a.id === "nr4").ausverkauft && /300 € GUTSCHEIN FÜR 200 €/i.test(v7.h1) && !/375/.test(v7.h1 + v7.lead) && /^Für Tattoo oder Piercing in Landshut\. Schon ab 200 € \(Wert 300 €\)\.$/.test(v7.lead) && /^Schon ab 200 €/.test(v7.ab),
    "500-€-Gutschein ausverkauft: Überschrift wirbt mit dem besten kaufbaren Angebot (300 € für 200 €), „Für Tattoo oder Piercing in Landshut. Schon ab 200 €“", v7);
  // Meldung an Domenic, sobald die letzte Einheit weg ist; Seite und Vorschau stellen sich schon beim Abruf um (vom Server, vor dem Skript)
  const admin = fs.readdirSync(dataDir).filter((f) => f.startsWith("mail%2F")).map((f) => JSON.parse(fs.readFileSync(path.join(dataDir, f)))).filter((m) => /500er ausverkauft \(Landshut\): Vorschau auf neutral stellen, Anzeige anpassen/.test(m.subject || ""));
  check(admin.length === 1 && /Anzeige/.test(admin[0].text || admin[0].html || ""), "Letzter 500er verkauft → genau eine Meldung an Domenic: „500er ausverkauft (Landshut): Vorschau auf neutral stellen, Anzeige anpassen“", admin.map((m) => m.subject));
  const rohL = await seiteHole("/gutschein-kaufen/tattoo-fashion-landshut");
  const vorSkript = { bild: metaVon(rohL.html, "og:image") || "", titel: metaVon(rohL.html, "og:title"), text: (metaVon(rohL.html, "og:description") || "").replace(/\u00a0/g, " "), t: (/<title>([^<]*)/.exec(rohL.html) || [])[1], wert: ((/id="h-wert"[^>]*>([^<]*)/.exec(rohL.html) || [])[1] || "").replace(/\u00a0/g, " "), stand: /<html lang="de" data-stand="[^"]+" data-fassung="neutral"/.test(rohL.html) };
  check(/\/tfla\/og-weihnachten-neutral\.jpg\?v=[0-9a-f]{8}$/.test(vorSkript.bild) && vorSkript.titel === "Tattoo-Gutscheine zum Weihnachtspreis · Tattoo Fashion Landshut" && vorSkript.t === vorSkript.titel && !/375|500/.test(vorSkript.titel + vorSkript.text) && vorSkript.wert === "300 € Gutschein" && vorSkript.stand,
    "Vom Server (vor dem Skript): Vorschau, Titel und Beschreibung ohne Beträge (neutral), Hero schon „300 € Gutschein“", vorSkript);
  await p7.screenshot({ path: path.join(shots, "landshut-500-ausverkauft.png") });
  await p7.click("#hero-kaufen");
  const w7 = await p7.evaluate(() => ({ an: (document.querySelector("#wahl input:checked") || {}).value, weg: ((document.querySelector("#wahl .weg-zeile") || {}).textContent || "").replace(/ /g, " ") }));
  check(w7.an === "nr5" && /2\.000 € · 500 €/.test(w7.weg), "Hero-Knopf markiert dann den 300-€-Gutschein; „Schon verkauft: 2.000 € · 500 €“ am Ende", w7);
  await p7.screenshot({ path: path.join(shots, "landshut-500-ausverkauft-kauf.png") });
  await c7.close();
}
// Shop nicht erreichbar (Funkloch) oder Fehlerseite statt Daten: deutscher Satz mit „Neu laden“, Kauf-Knopf lädt neu
{
  const c8 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p8 = await c8.newPage(); p8.on("pageerror", (e) => errors.push(e.message));
  const api = /\/api\/gutschein-shop\?/;
  await p8.route(api, (r) => r.abort("internetdisconnected"));
  await p8.goto(BASE + "/gutschein-kaufen/tattoo-fashion-munich"); await p8.waitForSelector("#meldung:not([hidden])");
  const m8 = await p8.evaluate(() => ({ t: document.getElementById("meldung").textContent, knopf: Boolean(document.querySelector("#meldung button")), klein: document.getElementById("hero-klein").textContent, pille: document.getElementById("top-pille").hidden }));
  check(/konnten nicht geladen werden/.test(m8.t) && /Neu laden/.test(m8.t) && m8.knopf && !/fetch|failed|load failed/i.test(m8.t) && !m8.klein && m8.pille, "Shop nicht erreichbar: deutsche Meldung mit Knopf „Neu laden“ (kein „Failed to fetch“), keine Stückzahl ohne echte Zahlen", m8);
  await p8.screenshot({ path: path.join(shots, "netzfehler.png") });
  await p8.unroute(api);
  await p8.click("#hero-kaufen");
  await p8.waitForSelector("#funnel:not([hidden])", { timeout: 10000 }).catch(() => {});
  check(await p8.isVisible("#funnel") && await p8.isHidden("#meldung") && (await p8.textContent("#hero-kaufen")).includes("Gutschein aussuchen"), "Tipp auf „Gutschein aussuchen“ nach dem Fehler: lädt neu und öffnet den Kauf");
  await p8.route(api, (r) => r.fulfill({ status: 502, contentType: "text/html", body: "<html><body>Bad Gateway</body></html>" }));
  await p8.goto(BASE + "/gutschein-kaufen/tattoo-fashion-munich"); await p8.waitForSelector("#meldung:not([hidden])");
  const m8b = await p8.textContent("#meldung");
  check(/konnten nicht geladen werden/.test(m8b) && !/string|pattern|JSON/i.test(m8b), "Fehlerseite statt Daten: deutsche Meldung (nicht „The string did not match …“)", m8b);
  await c8.close();
}
// Seite offen um 16 Uhr am 24.12.: Countdown läuft ab, die Seite schaltet selbst auf den Wertgutschein um
{
  process.env.TF_JETZT = "2026-12-24T15:59:00+01:00";
  const c9 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p9 = await c9.newPage(); beobachten(p9);
  await p9.clock.install({ time: new Date("2026-12-24T15:59:50+01:00") });
  await p9.goto(BASE + "/gutschein-kaufen/tattoo-fashion-munich"); await p9.waitForSelector("html.geladen");
  const vor9 = await p9.evaluate(() => ({ aus: document.documentElement.classList.contains("aus"), h1: document.querySelector(".hero h1").innerText }));
  process.env.TF_JETZT = "2026-12-24T16:00:30+01:00";
  let aus9 = false;
  for (let i = 0; i < 40 && !aus9; i++) { await p9.clock.runFor(1000); await wait(150); aus9 = await p9.evaluate(() => document.documentElement.classList.contains("aus")); }
  const nach9 = await p9.evaluate(() => ({ h1: document.querySelector(".hero h1").innerText, klein: document.getElementById("hero-klein").textContent }));
  check(!vor9.aus && /375/.test(vor9.h1) && aus9 && !/375/.test(nach9.h1) && /vorbei/.test(nach9.klein), "Seite offen um 16 Uhr: Countdown läuft ab, Seite lädt die Zahlen selbst neu und zeigt den Wertgutschein (ohne Neuladen)", { vor9, aus9, nach9 });
  await c9.close();
  process.env.TF_JETZT = "2026-11-23T21:05:00+01:00";
}
// Runde 3 (24.11.2026): Kauf-Fenster, Rechtsseiten, Vorschau-Fassungen
{
  // Tipp auf den schon vorgewählten 500er (Hero-Knopf) geht weiter zu Schritt 2; Bonus-Zeile nur bei Aktions-Gutscheinen
  const c10 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p10 = await c10.newPage(); beobachten(p10);
  await p10.goto(BASE + "/gutschein-kaufen/tattoo-fashion-munich"); await p10.waitForSelector("html.geladen");
  await p10.click("#hero-kaufen"); await p10.waitForSelector("#funnel:not([hidden])");
  const b1 = await p10.evaluate(() => ({ an: (document.querySelector("#wahl input:checked") || {}).value, bonus: document.getElementById("f-bonus").hidden ? "" : document.getElementById("f-bonus").textContent }));
  await p10.click("#wahl label.opt.an"); await p10.waitForTimeout(700);
  const b2 = await p10.evaluate(() => ({ schritt: document.getElementById("f-schritt").textContent, bonus: document.getElementById("f-bonus").hidden ? "" : document.getElementById("f-bonus").textContent }));
  check(b1.an === "nr4" && /Schritt 2 von 2/.test(b2.schritt), "Hero-Knopf: 500er vorgewählt, Tipp auf genau diese Karte geht weiter zu Name und E-Mail", { b1, b2 });
  check(b1.bonus === "Voller Wert bis 31.03.2027, danach zählt der bezahlte Betrag bis Ende 2029." && b2.bonus === b1.bonus, "Kauf-Fenster: „Voller Wert bis 31.03.2027, danach zählt der bezahlte Betrag bis Ende 2029.“ in Schritt 1 und 2", { b1, b2 });
  await p10.click("#f-zurueck"); await p10.click("#wahl input[value=frei] ~ .k");
  const b3 = await p10.evaluate(() => document.getElementById("f-bonus").hidden);
  check(b3, "Eigener Betrag gewählt: keine Bonus-Zeile");
  await c10.close();
  // Bezahl-Knopf einzeilig, Zurück-Knopf rund (320/340/360 px; ab 375 der lange Text)
  for (const w of [320, 340, 360, 375]) {
    const c11 = await browser.newContext({ viewport: { width: w, height: 720 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const p11 = await c11.newPage(); beobachten(p11);
    await p11.goto(BASE + "/gutschein-kaufen/tattoo-fashion-landshut"); await p11.waitForSelector("html.geladen");
    await p11.click("#hero-kaufen"); await p11.waitForSelector("#funnel:not([hidden])");
    await p11.click("#f-weiter"); await p11.waitForSelector("[data-schritt='2']:not([hidden])");
    const k = await p11.evaluate(() => { const b = document.getElementById("f-weiter"), z = document.getElementById("f-zurueck").getBoundingClientRect(), r = document.createRange(); r.selectNodeContents(b); return { text: b.textContent, h: b.getBoundingClientRect().height, zeilen: new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size, zw: z.width, zh: z.height, breit: document.documentElement.scrollWidth <= innerWidth }; });
    check(k.zeilen === 1 && k.h <= 62 && Math.abs(k.zw - k.zh) < 1 && k.breit && (w < 375 ? k.text === "Zur Zahlung →" : k.text === "Weiter zur Zahlung →"), `${w} px: Bezahl-Knopf einzeilig („${w < 375 ? "Zur Zahlung →" : "Weiter zur Zahlung →"}“), Zurück-Knopf rund`, k);
    await c11.close();
  }
  // Rechtsseiten bei 320 px ohne seitliches Schieben (lange Überschrift „Gutscheinbedingungen“ trennt weich)
  const c12 = await browser.newContext({ viewport: { width: 320, height: 640 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p12 = await c12.newPage(); beobachten(p12);
  const breitRecht = [];
  for (const slug of ["tattoo-fashion-munich", "tattoo-fashion-landshut"]) for (const a of ["impressum", "datenschutz", "widerruf", "bedingungen"]) {
    await p12.goto(BASE + `/gutschein-kaufen/${slug}-${a}`);
    const r = await p12.evaluate(() => ({ sw: document.documentElement.scrollWidth, h1: document.querySelector("h1").scrollWidth <= document.querySelector("h1").clientWidth + 1 }));
    if (r.sw > 320 || !r.h1) breitRecht.push(`${slug}-${a}: ${r.sw}`);
  }
  check(!breitRecht.length, "Alle 8 Rechtsseiten bei 320 px ohne seitliches Schieben, Überschrift ganz sichtbar", breitRecht);
  await c12.close();
}
{
  // Vorschau-Fassungen und Hero vom Server (reine Funktion, ohne Speicher)
  const { seiteAnpassen, fassungFuer } = await import("../netlify/functions/_lib/gutschein-seite.mjs");
  const { SEITEN } = await import("../netlify/functions/_lib/gutschein-seiten-html.mjs");
  const roh = SEITEN["tattoo-fashion-munich"], c = shop.SHOPS["tattoo-fashion-munich"];
  const sh = (mod = {}, offen = true) => ({ offen: true, aktionOffen: offen, aktionen: c.aktionen.map((a) => ({ ...a, verkauft: 0, reserviert: 0, verfuegbar: a.stueck, ausverkauft: false, ...(mod[a.id] || {}) })) });
  const og = (h) => ({ bild: (metaVon(h, "og:image") || "").replace(/\?v=.*/, "").split("/").pop(), titel: (metaVon(h, "og:title") || "").replace(/ /g, " "), t: ((/<title>([^<]*)/.exec(h) || [])[1] || "").replace(/ /g, " "), wert: ((/id="h-wert"[^>]*>([^<]*)/.exec(h) || [])[1] || "").replace(/ /g, " "), klein: ((/id="hero-klein"[^>]*>([^<]*)/.exec(h) || [])[1] || "").replace(/ /g, " "), aus: /<html[^>]*class="aus"/.test(h) });
  const v1 = og(seiteAnpassen(roh, { shop: sh(), aktiv: true }));
  const v2 = og(seiteAnpassen(roh, { shop: sh({ nr4: { verfuegbar: 0, verkauft: 6, ausverkauft: true } }), aktiv: true }));
  const v3 = og(seiteAnpassen(roh, { shop: sh({ nr5: { verfuegbar: 0, verkauft: 10, ausverkauft: true }, nr4: { verfuegbar: 2, verkauft: 4 } }), aktiv: true }));
  const v4 = og(seiteAnpassen(roh, { shop: sh({}, false), aktiv: true }));
  check(v1.bild === "og-weihnachten.jpg" && v1.titel === "500 € Gutschein für 375 € · Tattoo Fashion München" && v1.t === v1.titel && v1.wert === "500 € Gutschein" && v1.klein === "Nur 6 Stück zu diesem Preis", "Server: alles da → Vorschau „500 € für 375 €“, Hero 500er, „Nur 6 Stück zu diesem Preis“", v1);
  check(v2.bild === "og-weihnachten-neutral.jpg" && /Weihnachtspreis/.test(v2.titel) && v2.wert === "300 € Gutschein" && v2.klein === "Nur 10 Stück zu diesem Preis", "Server: 500er ausverkauft → Vorschau ohne Beträge, Hero „300 € Gutschein“", v2);
  check(v3.bild === "og-weihnachten-neutral.jpg" && v3.wert === "500 € Gutschein" && v3.klein === "Noch 2 von 6 zu diesem Preis", "Server: günstigster ausverkauft → Vorschau ohne Beträge (sie nannte „300 € für 200 €“), Hero „Noch 2 von 6 zu diesem Preis“", v3);
  check(v4.bild === "og-gutschein.jpg" && v4.titel === "Tattoo-Gutschein zum Verschenken · Tattoo Fashion München" && v4.aus, "Server: nach dem 24.12., 16 Uhr → Vorschau „Tattoo-Gutschein zum Verschenken“, Seite im Zustand danach", v4);
  check(seiteAnpassen(roh, { shop: { ...sh(), offen: false }, aktiv: true }) === roh.html && seiteAnpassen(roh, { shop: sh(), aktiv: false }) === roh.html && fassungFuer(sh()) === "angebot", "Server: Shop zu oder Studio kann nicht kassieren → Seite unverändert");
  const fn = await seiteHole("/gutschein-kaufen/tattoo-fashion-munich");
  check(/data-stand="/.test(fn.html) && /s-maxage=30/.test(fn.kopf["netlify-cdn-cache-control"] || "") && fn.kopf["x-robots-tag"] === "noindex", "Seiten-Funktion: Stand vom Server, CDN hält die Seite 30 s, noindex", fn.kopf);
  // Vorschaubilder: jeder Text passt (Kartentext ≥ 24 px Rand, Überschrift ≤ 540 px), alle Städte und Fassungen
  const { spawnSync } = await import("node:child_process");
  const pr = spawnSync(process.execPath, [path.join(root, "dev/gutschein-seiten.mjs"), "--og-pruefen"], { encoding: "utf8", env: process.env, timeout: 120000 });
  let erg = []; try { erg = JSON.parse((/OG-PRUEFUNG (.*)/.exec(pr.stdout) || [])[1]); } catch {}
  check(erg.length === 6 && erg.every((x) => x.ok && x.spans.slice(0, 3).every((y) => y.b <= x.innen)), "Vorschaubilder (2 Städte × 3 Fassungen): Kartentext passt mit ≥ 24 px Rand, Überschrift ≤ 540 px", erg.filter((x) => !x.ok).concat(pr.stderr ? [pr.stderr.slice(0, 300)] : []));
}
// Kleine Handys und quer: Hero passt, Geschenk über/neben dem Text, Knopf ganz sichtbar
for (const [w, h] of [[320, 460], [375, 548], [375, 560], [320, 568], [390, 664], [360, 780], [390, 844], [412, 839], [430, 932], [844, 340]]) {
  const c2 = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p2 = await c2.newPage(); beobachten(p2);
  await p2.goto(BASE + "/gutschein-kaufen/tattoo-fashion-landshut"); await p2.waitForSelector("button.zeile[data-wahl]");
  const r = await p2.evaluate(() => { const H = document.querySelector(".hero").getBoundingClientRect(), k = document.getElementById("hero-kaufen").getBoundingClientRect(), l = document.querySelector(".logo-box").getBoundingClientRect(), t = document.querySelector(".hero .text").getBoundingClientRect(), quer = innerWidth > innerHeight, ct = document.querySelector(".hero .cd-titel").getBoundingClientRect();
    const c = document.querySelector(".hero .cd").getBoundingClientRect(), e = document.querySelector(".hero .text>.eyebrow.nur-aktion").getBoundingClientRect();
    return { voll: Math.abs(H.height - innerHeight) <= 2, knopf: k.bottom <= innerHeight && k.top >= 0, logo: l.height >= 56 && (quer ? l.right <= t.left + 1 : l.bottom <= t.top + 1), breit: document.documentElement.scrollWidth <= innerWidth, ende: ct.height > 0 && ct.top >= 0 && ct.bottom <= innerHeight,
      countdown: c.height > 0 && c.top >= ct.bottom - 1 && c.bottom <= k.top + 1, pille: quer || innerHeight < 480 || (e.height > 0 && e.top >= 0) }; });
  check(r.voll && r.knopf && r.logo && r.breit && r.ende && r.countdown && r.pille, `${w}×${h}: Hero passt, Geschenk sichtbar ohne Überlappung, „Aktion endet …“, Countdown${h >= 480 && w < h ? ", Pille „Weihnachts-Aktion“" : ""} und Knopf sichtbar, kein Querscrollen`, r);
  await p2.screenshot({ path: path.join(shots, `hero-landshut-${w}x${h}.png`) });
  await c2.close();
}
// Desktop-Ansicht: schwebende Leiste schmal, Abschnitte in einer Spalte bündig
const pd = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
beobachten(pd);
await pd.goto(BASE + "/gutschein-kaufen/tattoo-fashion-munich"); await pd.waitForSelector("button.zeile[data-wahl]");
await pd.evaluate(() => document.getElementById("faq").scrollIntoView()); await pd.waitForTimeout(500);
const dk = await pd.evaluate(() => ({ leiste: document.querySelector("#sticky .btn").getBoundingClientRect().width, faq: Math.round(document.querySelector("#faq h2").getBoundingClientRect().left), liste: Math.round(document.querySelector("#gutscheine h2").getBoundingClientRect().left) }));
check(dk.leiste <= 450 && dk.faq === dk.liste, "Desktop 1440: schwebender Knopf höchstens 440 px breit, „Häufige Fragen“ bündig mit den anderen Abschnitten", dk);
await pd.screenshot({ path: path.join(shots, "desktop.png"), fullPage: true });

// Nach dem Aktionsende: kein Countdown, kein Rabatt-Versprechen, Wertgutschein vorne und vorgewählt
process.env.TF_JETZT = "2026-12-24T16:05:00+01:00";
{
  const c5 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p5 = await c5.newPage(); beobachten(p5);
  await p5.goto(BASE + "/gutschein-kaufen/tattoo-fashion-munich"); await p5.waitForSelector("#bogen button.zeile.frei");
  await p5.waitForFunction(() => document.documentElement.classList.contains("aus"), null, { timeout: 5000 }).catch(() => {});
  const v = await p5.evaluate(() => { const sicht = (s) => [...document.querySelectorAll(s)].some((x) => x.offsetParent); return { aus: document.documentElement.classList.contains("aus"), cd: sicht("[data-cd]") || sicht("[data-cd-titel]"), h1: document.querySelector(".hero h1").innerText.replace(/\s+/g, " "), erste: document.querySelector("#bogen button").dataset.wahl, aktionen: document.querySelectorAll("#bogen button.zeile[data-wahl^=nr]").length, klein: document.getElementById("hero-klein").textContent, pille: [...document.querySelectorAll(".top .eyebrow")].filter((x) => x.offsetParent).map((x) => x.textContent).join() }; });
  await p5.click("#hero-kaufen");
  const vor = await p5.evaluate(() => { const i = document.querySelector("#wahl input:checked"); return i && i.value; });
  check(v.aus && !v.cd && !/375/.test(v.h1) && v.erste === "frei" && v.aktionen === 0 && /vorbei/.test(v.klein) && !/21 Stück/.test(v.pille) && vor === "frei", "Nach dem 24.12., 16 Uhr: kein Countdown, Hero und Liste zeigen den Wertgutschein (vorne, im Kauf vorgewählt), kein Rabatt mehr", { ...v, vor });
  await p5.screenshot({ path: path.join(shots, "nach-aktion.png") });
  const r5 = await seiteHole("/gutschein-kaufen/tattoo-fashion-munich");
  check(/\/tfm\/og-gutschein\.jpg\?v=/.test(metaVon(r5.html, "og:image") || "") && /^Tattoo-Gutschein zum Verschenken/.test(metaVon(r5.html, "og:title") || "") && /<html lang="de" data-stand="[^"]+" data-fassung="danach" class="aus"/.test(r5.html), "Nach der Aktion vom Server: Titel und Vorschau „Tattoo-Gutschein zum Verschenken“ (kein „nur bis 24.12.“ mehr)", metaVon(r5.html, "og:title"));
  await c5.close();
}
process.env.TF_JETZT = "2026-11-23T21:05:00+01:00";
check(errors.length === 0, "Keine JavaScript-Fehler und keine roten Konsolen-Meldungen (auch nicht bei „Pro Person …“)", errors.join(" | "));
await browser.close();

console.log(`\n${ok} bestanden, ${fail} fehlgeschlagen · Screenshots: ${shots}`);
process.exit(fail ? 1 : 0);
