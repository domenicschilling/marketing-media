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
const post = (b) => fetch(BASE + "/api/gutschein-shop", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }).then(async (r) => ({ status: r.status, ...(await r.json()) }));
const mockState = () => fetch(`http://localhost:${MOCK_PORT}/mock/state`).then((r) => r.json());
const bezahlen = (url) => fetch(url, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "pm=card", redirect: "manual" });
const mailsAn = (to) => fs.readdirSync(dataDir).filter((f) => f.startsWith("mail%2F")).map((f) => JSON.parse(fs.readFileSync(path.join(dataDir, f)))).filter((m) => [].concat(m.to).includes(to));
const kauf = (auswahl, email, extra = {}) => post({ s: "tattoo-fashion-munich", auswahl, kunde: "Kim Käufer", email, inhaltOk: true, ...extra });
async function bisBezahlt(zid) { for (let i = 0; i < 40; i++) { const z = await getZahlung("st_tfm_test", zid); if (z?.status === "bezahlt" && z.gutschein?.gesendetAm) return z; await wait(150); } return getZahlung("st_tfm_test", zid); }
// Text aus dem PDF (pdf-lib: Flate-Streams, Text als <hex> Tj in WinAnsi)
function pdfText(buf) {
  const s = buf.toString("latin1"), out = [];
  for (const m of s.matchAll(/stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    let roh; try { roh = zlib.inflateSync(Buffer.from(m[1], "latin1")).toString("latin1"); } catch { continue; }
    for (const t of roh.matchAll(/<([0-9A-Fa-f]+)>\s*Tj/g)) out.push(Buffer.from(t[1], "hex").toString("latin1"));
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
const pdf = Buffer.from(await gs.gutscheinPdf(await (await import("../netlify/functions/_lib/store.mjs")).getStudio("st_tfm_test"), z));
fs.writeFileSync(path.join(shots, "gutschein-nr4.pdf"), pdf);
const pt = pdfText(pdf);
check(/500 €/.test(pt) && /Aktions-Gutschein Nr\. 4/.test(pt) && /31\.03\.2027/.test(pt) && /375 €/.test(pt) && /31\.12\.2029/.test(pt) && /für Lena/.test(pt), "PDF: Wert 500 €, Nr. 4, Bonus bis 31.03.2027, danach 375 € bis 31.12.2029, für Lena", pt.slice(0, 400));
const ga = await get("/api/gutschein?t=" + z.gutschein.token);
check(ga.gutschein.wertCent === 50000 && ga.gutschein.bezahltCent === 37500 && ga.gutschein.bonusAktiv && ga.gutschein.aktuellerWertCent === 50000, "Online-Ansicht: Wert 500 €, bezahlt 375 €, Bonus aktiv");
check(gs.aktuellerWertCent(z, new Date("2027-03-31T20:00:00Z")) === 50000 && gs.aktuellerWertCent(z, new Date("2027-04-01T08:00:00Z")) === 37500, "Bonus-Frist: am 31.03.2027 500 €, ab 01.04.2027 375 €");
const fs1 = fuerStudio(z);
check(fs1.gutschein.wertCent === 50000 && fs1.gutschein.bezahltCent === 37500 && !("token" in fs1.gutschein) && !("reservierung" in fs1.gutschein), "Studio-Ansicht (App/Portal): Wert UND bezahlt, ohne Token/Reservierung");

console.log("Stückzahl Nr. 1 (1 Stück)");
const a1 = await kauf("nr1", "a1@example.com");
const b1 = await kauf("nr1", "b1@example.com");
check(a1.status === 200 && b1.status === 409 && b1.code === "ausverkauft" && /in der Kasse/.test(b1.error), "Zweiter Käufer während der Kasse: „gerade in der Kasse“", b1);
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
  const pdfL = Buffer.from(await gs.gutscheinPdf(await (await import("../netlify/functions/_lib/store.mjs")).getStudio("st_tfla_test"), zl));
  fs.writeFileSync(path.join(shots, "gutschein-landshut-nr1.pdf"), pdfL);
  const ptL = pdfText(pdfL);
  check(/2\.000 €/.test(ptL) && /Aktions-Gutschein Nr\. 1/.test(ptL) && /Landshut/.test(ptL) && /1\.500 €/.test(ptL) && !/München|Munich/.test(ptL), "PDF Landshut: Wert 2.000 €, Nr. 1, Landshut, kein München", ptL.slice(0, 300));
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
    check(ogT === "Weihnachts-Gutscheine unter Wert" && ogD.startsWith(`Tattoo Fashion ${t.stadt}: z. B. 500 € Gutschein für 375 €.`) && /Nur 21 Stück, bis 24\.12\., 16 Uhr/.test(ogD) && ogD.length <= 100, `${t.stadt}: og:title/description kurz und verkaufsstark`, { ogT, ogD, l: ogD.length });
    check(x.html.includes(`fbq('init','${t.pixel}')`) && !x.html.includes(anders.pixel) && x.html.includes(`/assets/gs-shop/${t.k}/logo.png`) && x.html.includes(t.tel) && x.html.includes(`wa.me/${t.wa}`) && x.html.includes(`instagram.com/${t.ig}/`) && x.html.includes(`Weihnachts-Aktion · ${t.stadt}`) && x.html.includes(`<b>${t.g}</b> · ${t.n} Google-Bewertungen`) && !x.html.includes(anders.adr), `${t.stadt}: eigenes Pixel, Logo, Telefon, WhatsApp, Instagram, Google-Bewertung, keine Angaben der anderen Stadt`);
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
const browser = await chromium.launch();
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
p.on("pageerror", (e) => errors.push(e.message));
await p.goto(BASE + "/gutschein-kaufen/tattoo-fashion-munich");
await p.waitForSelector("button.zeile[data-wahl] .rest i:has-text('von')");
const heroOk = await p.evaluate(() => { const h = document.querySelector(".hero").getBoundingClientRect(), k = document.getElementById("hero-kaufen").getBoundingClientRect(), l = document.querySelector(".logo-box").getBoundingClientRect(), t = document.querySelector(".hero .text").getBoundingClientRect(); return Math.abs(h.height - innerHeight) <= 2 && k.bottom <= innerHeight && l.height >= 60 && l.bottom <= t.top + 1; });
check(heroOk, "Hero = erster Bildschirm, Logo über dem Text, Knopf „Gutschein kaufen“ sichtbar");
await p.screenshot({ path: path.join(shots, "handy-hero.png") });
check(await p.isDisabled("button.zeile[data-wahl=nr1]") && /ausverkauft/.test(await p.textContent("button.zeile[data-wahl=nr1]")) && /5 von 6/.test(await p.textContent("button.zeile[data-wahl=nr4]")) && /Noch 1[0-9] von 21 Aktions-Gutscheinen/.test(await p.textContent("#hero-klein")), "Liste: Nr. 1 ausverkauft (gesperrt), Nr. 4 „5 von 6“, Hero zeigt echte Reststückzahl");
await p.locator("#gutscheine").scrollIntoViewIfNeeded();
await p.screenshot({ path: path.join(shots, "handy-liste.png") });
await p.click("#hero-kaufen");
check(await p.isVisible("#funnel") && await p.isDisabled("#wahl input[value=nr1]") && /Schritt 1 von 2/.test(await p.textContent("#f-schritt")), "Hero-Knopf öffnet den Kauf (Schritt 1 von 2), Nr. 1 nicht wählbar");
await p.screenshot({ path: path.join(shots, "handy-schritt1.png") });
await p.click("#wahl label:has(input[value=nr5])");
await p.click("#f-weiter");
check(/Schritt 2 von 2/.test(await p.textContent("#f-schritt")) && /Gutschein Nr\. 5 · Wert 300 €/.test(await p.textContent("#f-summe")) && /200 €/.test(await p.textContent("#f-summe")) && /Weiter zur Zahlung/.test(await p.textContent("#f-weiter")) && await p.isHidden("#f-extra"), "Schritt 2: Summe „Gutschein Nr. 5 · Wert 300 € – du zahlst 200 €“, Knopf „Weiter zur Zahlung“, Empfänger/Gruß eingeklappt");
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
await p.waitForFunction(() => /im Wert von 300 € mit Code/.test(document.getElementById("danke-text").textContent), null, { timeout: 15000 }).catch(() => {});
check(/Gutschein im Wert von 300 € mit Code/.test(await p.textContent("#danke-text")) && await p.isVisible("#danke"), "Nach der Zahlung: Danke im Shop-Look „Gutschein im Wert von 300 € mit Code per E-Mail“");
await p.screenshot({ path: path.join(shots, "handy-danke.png") });
const mh = mailsAn("handy@example.com").find((x) => /über 300,00 €/.test(x.subject));
check(mh && /Jonas/.test(mh.html + JSON.stringify(mh)), "Gutschein-Mail an handy@example.com (Wert 300 €, für Jonas)");
// Abbruch im Browser (Landshut, Karte direkt aus der Liste → gleich Schritt 2)
await p.goto(BASE + "/gutschein-kaufen/tattoo-fashion-landshut");
await p.waitForSelector("button.zeile[data-wahl=nr4] .rest i:has-text('von')");
await p.screenshot({ path: path.join(shots, "handy-hero-landshut.png") });
await p.click("button.zeile[data-wahl=nr4]");
check(/Schritt 2 von 2/.test(await p.textContent("#f-schritt")), "Tipp auf eine Gutschein-Karte: direkt Schritt 2");
await p.fill("#f-name", "Abbruch Test"); await p.fill("#f-email", "abbruch@example.com");
await Promise.all([p.waitForURL(new RegExp(`localhost:${MOCK_PORT}/pay/`)), p.press("#f-email", "Enter")]);
await Promise.all([p.waitForURL(/gutschein-kaufen\/tattoo-fashion-landshut/), p.click("#cancel")]);
await p.waitForTimeout(800);
const dl2 = await get("/api/gutschein-shop?s=tattoo-fashion-landshut");
check(/abgebrochen/.test(await p.textContent("#meldung")) && dl2.shop.aktionen.find((a) => a.id === "nr4").verfuegbar === 6, "Landshut: Enter im E-Mail-Feld startet die Kasse; Abbrechen → Meldung „nichts bezahlt“, Nr. 4 wieder frei");
// Kleine Handys und quer: Hero passt, Logo über/neben dem Text, Knopf ganz sichtbar
for (const [w, h] of [[320, 460], [375, 548], [430, 932], [844, 340]]) {
  const c2 = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p2 = await c2.newPage(); p2.on("pageerror", (e) => errors.push(e.message));
  await p2.goto(BASE + "/gutschein-kaufen/tattoo-fashion-landshut"); await p2.waitForSelector("button.zeile[data-wahl]");
  const r = await p2.evaluate(() => { const H = document.querySelector(".hero").getBoundingClientRect(), k = document.getElementById("hero-kaufen").getBoundingClientRect(), l = document.querySelector(".logo-box").getBoundingClientRect(), t = document.querySelector(".hero .text").getBoundingClientRect(), quer = innerWidth > innerHeight;
    return { voll: Math.abs(H.height - innerHeight) <= 2, knopf: k.bottom <= innerHeight && k.top >= 0, logo: l.height >= 56 && (quer ? l.right <= t.left + 1 : l.bottom <= t.top + 1), breit: document.documentElement.scrollWidth <= innerWidth }; });
  check(r.voll && r.knopf && r.logo && r.breit, `${w}×${h}: Hero passt, Logo sichtbar ohne Überlappung, Knopf sichtbar, kein Querscrollen`, r);
  await p2.screenshot({ path: path.join(shots, `hero-landshut-${w}x${h}.png`) });
  await c2.close();
}
// Desktop-Ansicht
const pd = await (await browser.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
pd.on("pageerror", (e) => errors.push(e.message));
await pd.goto(BASE + "/gutschein-kaufen/tattoo-fashion-munich"); await pd.waitForSelector("button.zeile[data-wahl]");
await pd.screenshot({ path: path.join(shots, "desktop.png"), fullPage: true });
await p.screenshot({ path: path.join(shots, "handy-ganz.png"), fullPage: true });
check(errors.length === 0, "Keine JavaScript-Fehler", errors.join(" | "));
await browser.close();

console.log(`\n${ok} bestanden, ${fail} fehlgeschlagen · Screenshots: ${shots}`);
process.exit(fail ? 1 : 0);
