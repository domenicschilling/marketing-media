// Test Gutschein-Shop (Tattoo Fashion Munich): Stückzahl (auch gleichzeitig), Wert/Preis, Bonus-Frist, Mail + PDF, Abbruch/Ablauf,
// Verkaufszeitraum, Freischaltung, Studio-Ansicht und der Kauf im Browser am Handy (Stripe-Nachbau).
//   NODE_PATH=… node dev/gutschein-shop-test.mjs [screenshot-ordner]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { createRequire } from "node:module";
import { startDev } from "./server.mjs";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("/opt/node22/lib/node_modules/playwright")); }

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

console.log("Angebot");
let d = await get("/api/gutschein-shop?s=tattoo-fashion-munich");
const nr = (id) => d.shop.aktionen.find((a) => a.id === id);
check(d.shop.aktionen.map((a) => `${a.nr}:${a.wertCent / 100}/${a.preisCent / 100}/${a.stueck}`).join(" ") === "1:2000/1500/1 2:1500/1250/2 3:1000/750/2 4:500/375/6 5:300/200/10", "5 Aktions-Gutscheine mit Wert / Preis / Stück wie entschieden", d.shop.aktionen);
check(d.shop.bonusBis.startsWith("2027-03-31") && d.shop.gueltigBis.startsWith("2029-12-31") && d.shop.frei.minCent === 5000 && d.shop.frei.maxCent === 200000, "Bonus bis 31.03.2027, bezahlter Betrag bis 31.12.2029, freier Betrag 50–2.000 €");
check(d.shop.offen && d.shop.vorschau && d.studio.aktiv, "Lokal/Vorschau offen, als Vorschau gekennzeichnet");
check(d.shop.bedingungen.some((t) => /31\.03\.2027/.test(t) && /bezahlte Betrag/.test(t)) && /vierzehn Tagen/.test(d.shop.widerruf.text[0]), "Bedingungen nennen Bonus-Frist, Widerrufsbelehrung da");
check((await fetch(BASE + "/api/gutschein-shop?s=anderes-studio")).status === 404, "Anderes Studio hat keinen Shop (nur München)");

console.log("Freischaltung (echte Site)");
const c0 = shop.SHOPS["tattoo-fashion-munich"], sEcht = { id: "st_nqoyv1Q2wj7F", slug: "tattoo-fashion-munich" };
check(shop.shopFuer({ id: "st_fremd", slug: "tattoo-fashion-munich" }, { test: false }) === null && shop.shopFuer(sEcht, { test: false }) === c0, "Echte Site: Shop nur für die Studio-ID st_nqoyv1Q2wj7F");
check(!shop.shopZustand(sEcht, c0, new Date(), { test: false }).offen, "Echte Site: ohne Domenics Freigabe zu");
check(!shop.shopZustand(sEcht, { ...c0, freigegeben: true }, new Date(), { test: false }).offen, "Echte Site: freigegeben, aber ohne Anbieter-Angaben (Impressum) weiter zu");
check(shop.shopZustand(sEcht, { ...c0, freigegeben: true, anbieter: { name: "X GmbH", strasse: "A 1", plz: "1", ort: "M", email: "a@b.de" } }, new Date(), { test: false }).offen, "Echte Site: Freigabe + Anbieter → offen");

console.log("Kauf Nr. 4 (Wert 500 €, Preis 375 €)");
let r = await kauf("nr4", "kim@example.com", { empfaenger: "Lena", nachricht: "Frohe Weihnachten!" });
check(r.status === 200 && r.url, "Kasse startet", r);
let st = await mockState();
let cs = Object.values(st.sessions).find((x) => x.client_reference_id === r.zahlung);
check(cs && Number(cs.line_items[0].price_data.unit_amount) === 37500 && JSON.stringify(cs.payment_method_types) === '["card"]' && cs.account === "acct_tfm_test", "Stripe: 375 € auf dem Konto des Studios, nur Karte (kein Klarna)", cs && { a: cs.line_items[0].price_data.unit_amount, p: cs.payment_method_types, acc: cs.account });
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
process.env.TF_JETZT = "2026-12-25T10:00:00+01:00";
d = await get("/api/gutschein-shop?s=tattoo-fashion-munich");
const nach = await kauf("nr5", "spaet@example.com"), fr2 = await kauf("frei", "spaet@example.com", { betrag: "80" });
check(!d.shop.aktionOffen && nach.status === 409 && fr2.status === 200, "Ab 25.12.: Aktions-Gutscheine nicht mehr kaufbar, Wertgutschein weiter", [d.shop.aktionOffen, nach.status, fr2.status]);
await post({ abbruch: fr2.zahlung });
process.env.TF_JETZT = "2026-11-23T21:05:00+01:00";

console.log("Seite im Browser (Handy)");
const browser = await chromium.launch();
const errors = [];
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
p.on("pageerror", (e) => errors.push(e.message));
await p.goto(BASE + "/gutschein-kaufen/tattoo-fashion-munich");
await p.waitForSelector("button.zeile[data-wahl]");
await p.click("#consent [data-wahl=nein]");
const heroOk = await p.evaluate(() => { const h = document.querySelector(".hero").getBoundingClientRect(), k = document.getElementById("hero-kaufen").getBoundingClientRect(); return Math.abs(h.height - innerHeight) <= 2 && k.bottom <= innerHeight; });
check(heroOk, "Hero = erster Bildschirm, Knopf „Gutschein online kaufen“ sichtbar");
await p.screenshot({ path: path.join(shots, "handy-hero.png") });
check(await p.isDisabled("button.zeile[data-wahl=nr1]") && /ausverkauft/.test(await p.textContent("button.zeile[data-wahl=nr1]")) && /5 von 6/.test(await p.textContent("button.zeile[data-wahl=nr4]")), "Liste: Nr. 1 ausverkauft (gesperrt), Nr. 4 „5 von 6“");
await p.locator("#gutscheine").scrollIntoViewIfNeeded();
await p.screenshot({ path: path.join(shots, "handy-liste.png") });
await p.click("#hero-kaufen");
check(await p.isVisible("#funnel") && await p.isDisabled("#wahl input[value=nr1]"), "Hero-Knopf öffnet den Kauf (Schritt 1), Nr. 1 nicht wählbar");
await p.screenshot({ path: path.join(shots, "handy-schritt1.png") });
await p.check("#wahl input[value=nr5]");
await p.click("#f-weiter");
await p.fill("#f-name", "Handy Käuferin"); await p.fill("#f-email", "handy@example.com"); await p.fill("#f-empf", "Jonas"); await p.fill("#f-gruss", "Für dein erstes Tattoo");
const kbd = await p.evaluate(() => { const b = document.getElementById("f-weiter").getBoundingClientRect(); return b.bottom <= innerHeight; });
check(kbd, "Schritt 2: Weiter-Knopf unten sichtbar");
await p.setViewportSize({ width: 390, height: 480 }); // offene Tastatur
check(await p.evaluate(() => { const b = document.getElementById("f-weiter").getBoundingClientRect(); return b.bottom <= innerHeight && b.top >= 0; }), "Mit offener Tastatur (390×480): Weiter-Knopf erreichbar");
await p.screenshot({ path: path.join(shots, "handy-schritt2-tastatur.png") });
await p.setViewportSize({ width: 390, height: 844 });
await p.click("#f-weiter");
check(/Aktions-Gutschein Nr\. 5/.test(await p.textContent("#ueber")) && /300 €/.test(await p.textContent("#ueber")) && /200 €/.test(await p.textContent("#ueber")) && /31\. März 2027/.test(await p.textContent("#ueber")), "Schritt 3: Übersicht mit Wert 300 €, Preis 200 €, Bonus-Frist");
await p.click("#f-weiter");
check(/Gutscheinbedingungen/.test(await p.textContent("#f-fehler")), "Ohne Häkchen: Hinweis statt Kasse");
await p.screenshot({ path: path.join(shots, "handy-schritt3.png") });
await p.check("#f-ok");
await Promise.all([p.waitForURL(new RegExp(`localhost:${MOCK_PORT}/pay/`)), p.click("#f-weiter")]);
await Promise.all([p.waitForURL(/bezahlt\.html/), p.click("#pay")]);
await p.waitForFunction(() => /im Wert von 300,00 € mit Code/.test(document.getElementById("msg").textContent), null, { timeout: 15000 }).catch(() => {});
check(/Gutschein im Wert von 300,00 € mit Code/.test(await p.textContent("#msg")), "Nach der Zahlung: Danke-Seite „Gutschein im Wert von 300,00 € mit Code per E-Mail“");
await p.screenshot({ path: path.join(shots, "handy-danke.png") });
check(mailsAn("handy@example.com").some((x) => /über 300,00 €/.test(x.subject)), "Gutschein-Mail an handy@example.com (Wert 300 €)");
// Abbruch im Browser
await p.goto(BASE + "/gutschein-kaufen/tattoo-fashion-munich");
await p.waitForSelector("button.zeile[data-wahl=nr4]:not([disabled])");
await p.click("button.zeile[data-wahl=nr4]");
await p.fill("#f-name", "Abbruch Test"); await p.fill("#f-email", "abbruch@example.com");
await p.click("#f-weiter"); await p.check("#f-ok");
await Promise.all([p.waitForURL(new RegExp(`localhost:${MOCK_PORT}/pay/`)), p.click("#f-weiter")]);
await Promise.all([p.waitForURL(/gutschein-kaufen\/tattoo-fashion-munich/), p.click("#cancel")]);
await p.waitForTimeout(800);
d = await get("/api/gutschein-shop?s=tattoo-fashion-munich");
check(/abgebrochen/.test(await p.textContent("#meldung")) && nr("nr4").verfuegbar === 5, "Abbrechen in der Kasse: Meldung „nichts bezahlt“, Nr. 4 wieder verfügbar");
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
