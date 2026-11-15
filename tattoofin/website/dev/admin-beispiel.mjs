// Admin-App lokal mit Beispieldaten ansehen bzw. Screenshots machen (nur lokal, Stripe-Nachbau, keine echten Mails/Zahlungen).
//   ADMIN_BEISPIEL_PORT=8461 STRIPE_MOCK_PORT=12461 NODE_PATH=… node dev/admin-beispiel.mjs [screenshot-ordner]
// Ohne Ordner läuft der Server weiter (Admin-Token „admin“), mit Ordner werden Screenshots bei 390/768/1440 px gemacht und
// die Seite mit axe auf Kontrast geprüft (Ergebnis in der Konsole), danach Ende.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { startDev } from "./server.mjs";

const PORT = Number(process.env.ADMIN_BEISPIEL_PORT || 8461), BASE = `http://localhost:${PORT}`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "tf-admin-beispiel-"));
await startDev({ port: PORT, mock: true, dataDir, quiet: true });
const { saveStudio, saveZahlung, store } = await import("../netlify/functions/_lib/store.mjs");
const { stripe } = await import("../netlify/functions/_lib/stripe.mjs");
const { demoStudioAnlegen } = await import("../netlify/functions/_lib/app-demo.mjs");

const vor = (tage, stunde = 11) => { if (tage === 0) return new Date(Date.now() - 2 * 3600e3).toISOString(); const d = new Date(Date.now() - tage * 864e5); d.setHours(stunde, 14, 0, 0); return d.toISOString(); };
const monatTag = (tag) => { const d = new Date(); d.setDate(Math.min(tag, d.getDate())); d.setHours(12, 0, 0, 0); return d.toISOString(); };
let n = 0;
async function studio(x) {
  const id = "st_beispiel" + ++n;
  const cus = x.kunde ? (await stripe("POST", "/customers", { email: x.email })).id : null;
  const s = { id, createdAt: vor(x.alt || 30), slug: "beispiel-" + n, inhaber: "Beispiel Inhaber", strasse: "Musterweg " + n, plz: "96047", telefon: "+49 151 0000000" + n,
    vertrag: { version: "2026-12", akzeptiertAm: vor(x.alt || 30), name: "Beispiel Inhaber" }, ...x, stripe: { ...(x.stripe || {}), ...(cus ? { customerId: cus } : {}) } };
  delete s.kunde; delete s.alt;
  await saveStudio(s);
  if (x.updatedAt) await store.set("studio/" + id, { ...s, updatedAt: x.updatedAt });
  return s;
}
const frei = { accountId: "acct_beispiel", chargesEnabled: true, payoutsEnabled: true, detailsSubmitted: true };
const a = await studio({ firma: "Ink Beispiel Bamberg", ort: "Bamberg", email: "ink@beispiel.test", status: "live", goLiveAt: vor(25), modell: "kauf", paket: "monatlich", zahlart: "abo", monatNetto: 4193, kunde: true, stripe: { ...frei, subscriptionId: "sub_b1" } });
const b = await studio({ firma: "Nadelwerk Beispiel", ort: "Nürnberg", email: "nadel@beispiel.test", status: "live", goLiveAt: vor(60), modell: "kauf", paket: "monatlich", zahlart: "abo", monatNetto: 2437, kunde: true, stripe: { ...frei, subscriptionId: "sub_b2" }, alt: 80 });
const c = await studio({ firma: "Studio Schwarzlicht", ort: "Erlangen", email: "schwarz@beispiel.test", status: "einrichtung", modell: "kauf", paket: "monatlich", zahlart: "abo", monatNetto: 4193, kunde: true, stripe: { accountId: "acct_b3", subscriptionId: "sub_b3" }, alt: 3 });
const d = await studio({ firma: "Tinte & Liebe", ort: "Würzburg", email: "tinte@beispiel.test", status: "live", goLiveAt: vor(10), modell: "kauf", paket: "app", abrechnung: "apple", stripe: frei, alt: 12,
  apple: { status: "aktiv", laeuftBis: vor(-20), preisMilli: 49900, waehrung: "EUR", umgebung: "Production", probe: false } });
await studio({ firma: "Testkauf TestFlight", ort: "Bamberg", email: "testflight@beispiel.test", status: "einrichtung", modell: "kauf", paket: "app", abrechnung: "apple", sandbox: true, alt: 2,
  apple: { status: "aktiv", laeuftBis: vor(-1), preisMilli: 49900, waehrung: "EUR", umgebung: "Sandbox" } });
const e = await studio({ firma: "Altstadt Tattoo", ort: "Augsburg", email: "alt@beispiel.test", status: "live", goLiveAt: vor(90), modell: "provision", paket: "risikofrei", zahlart: "provision", stripe: frei, alt: 120, kunde: true });
await studio({ firma: "Color Beispiel", ort: "Dachau", email: "color@beispiel.test", status: "gekuendigt", modell: "provision", paket: "risikofrei", zahlart: "provision", stripe: frei, kuendigung: { zum: vor(-10), grund: "Neues Verbraucherkreditrecht" }, alt: 100 });
await studio({ firma: "Partner Studio München", ort: "München", email: "partner@beispiel.test", status: "live", modell: "kauf", zahlart: "geschenk", sonderkondition: "Partner – nur Zahlungsgebühren", stripe: frei, alt: 50 });
// Apple-Studio in der Gratis-Woche (zählt nicht als zahlend), Bestandsstudio mit altem Preis, offene Rechnung
await studio({ firma: "Probezeit Ink", ort: "Schweinfurt", email: "probe@beispiel.test", status: "einrichtung", modell: "kauf", paket: "app", abrechnung: "apple", alt: 3,
  apple: { status: "aktiv", laeuftBis: vor(-5), preisMilli: 0, waehrung: "EUR", umgebung: "Production", probe: true } });
const alt = await studio({ firma: "Alte Liebe Tattoo", ort: "Regensburg", email: "alteliebe@beispiel.test", status: "live", goLiveAt: vor(70), modell: "kauf", paket: "monatlich", zahlart: "abo", monatNetto: 4900, kunde: true, stripe: { ...frei, subscriptionId: "sub_b6" }, alt: 75 });
await studio({ firma: "Rechnung Offen Studio", ort: "Fürth", email: "offen@beispiel.test", status: "zahlung_offen", modell: "kauf", paket: "einmal", zahlart: "rechnung", kunde: true, alt: 2 });
// Einmalzahlung mit Garantie-Erstattung in diesem Monat (Einnahme und Erstattung heben sich auf)
const garantie = await studio({ firma: "Garantie Studio", ort: "Ansbach", email: "garantie@beispiel.test", status: "erstattet", modell: "kauf", paket: "einmal", zahlart: "sofort", kunde: true, stripe: { ...frei, paymentIntentId: "pi_beispiel_garantie" }, alt: 20 });
// Abgebrochene Anmeldungen
await studio({ firma: "Black Rose Ink", ort: "Bayreuth", email: "rose@beispiel.test", status: "entwurf", modell: "kauf", paket: "monatlich", zahlart: "abo", monatNetto: 4193, alt: 1, updatedAt: vor(0, 9),
  stripe: { checkoutSessionId: "cs_b1" }, anmeldungFehler: { am: vor(0, 9), code: "payment_intent_authentication_failure", declineCode: "", typ: "ablehnung", text: "3-D-Secure-Bestätigung abgelehnt.", dreiDS: true } });
await studio({ firma: "Kunstwerk Haut", ort: "Coburg", email: "kunst@beispiel.test", status: "entwurf", modell: "kauf", paket: "monatlich", zahlart: "abo", monatNetto: 4193, alt: 4, updatedAt: vor(4), stripe: { checkoutSessionId: "cs_b2" }, checkoutAbgelaufen: vor(3) });
await studio({ firma: "Stich für Stich", ort: "Hof", email: "stich@beispiel.test", status: "entwurf", modell: "kauf", paket: "app", abrechnung: "apple", alt: 6, updatedAt: vor(6), appEntwurf: { ablauf: vor(-24) } });
// Kundenzahlungen diesen Monat
const zl = async (s, betragCent, tag, kunde) => saveZahlung({ studioId: s.id, id: "zl_" + Math.random().toString(36).slice(2, 9), createdAt: monatTag(tag), bezahltAm: monatTag(tag), status: "bezahlt", betragCent, kunde, art: "gesamt", zahlartText: "Karte" });
await zl(a, 32000, 3, "Lena M."); await zl(a, 15000, 9, "Tom K."); await zl(b, 48000, 6, "Sara P."); await zl(d, 22000, 12, "Max B."); await zl(e, 90000, 2, "Jana R.");
await saveZahlung({ studioId: a.id, id: "zl_offen1", createdAt: vor(0), status: "offen", betragCent: 12000, kunde: "Paul S.", art: "anzahlung" });
// Unsere Einnahmen: bezahlte Rechnungen im Stripe-Nachbau (Abo-Rechnungen)
for (const s of [a, b, c, alt, garantie]) {
  await stripe("POST", "/invoiceitems", { customer: s.stripe.customerId, currency: "eur", amount: s.monatNetto || 59900 });
  const inv = await stripe("POST", "/invoices", { customer: s.stripe.customerId, metadata: { studioId: s.id } });
  await stripe("POST", `/invoices/${inv.id}/finalize`, {});
  await stripe("POST", `/invoices/${inv.id}/pay`, { paid_out_of_band: true });
}
await stripe("POST", "/refunds", { payment_intent: "pi_beispiel_garantie", amount: Math.round(59900 * 1.19) });
const demo = await demoStudioAnlegen({ email: "app-review@beispiel.test" });
console.log(`Admin mit Beispieldaten: ${BASE}/admin.html  (Token: admin)  Daten: ${dataDir}`);

const ziel = process.argv[2];
if (!ziel) await new Promise(() => {});
fs.mkdirSync(ziel, { recursive: true });
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const axeQuelle = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const browser = await chromium.launch();
const fehler = [];
let kontrast = 0;
for (const breite of [390, 768, 1440]) {
  const ctx = await browser.newContext({ viewport: { width: breite, height: breite === 390 ? 844 : 1000 }, deviceScaleFactor: 2, isMobile: breite === 390, hasTouch: breite === 390 });
  const p = await ctx.newPage();
  p.on("pageerror", (x) => fehler.push(`${breite}: ${x.message}`));
  p.on("console", (m) => { if (m.type() === "error" && !/status of 401/.test(m.text())) fehler.push(`${breite}: ${m.text()}`); });
  await p.goto(BASE + "/admin.html");
  await p.evaluate(() => sessionStorage.setItem("tf-admin", "admin"));
  await p.reload();
  const geh = (h) => p.evaluate((x) => { location.hash = x; }, h);
  const pruefe = async (name) => {
    await p.addScriptTag({ content: axeQuelle });
    const r = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ["color-contrast"] })).violations.map((v) => v.nodes.map((n) => n.target.join(" ") + " " + (n.any[0]?.message || ""))).flat());
    if (r.length) { kontrast += r.length; console.log(`  Kontrast ${breite}px ${name}:`, r.join(" | ")); }
    const quer = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (quer) fehler.push(`${breite}px ${name}: horizontales Scrollen`);
  };
  // Erst der Bildschirm, wie man ihn sieht, dann die ganze Seite (Reiterleiste dafür oben statt schwebend)
  const shot = async (name) => {
    await p.waitForTimeout(250);
    await p.screenshot({ path: path.join(ziel, `${breite}-${name}.png`) });
    const st = await p.addStyleTag({ content: ".reiter{position:static!important}" });
    await p.screenshot({ path: path.join(ziel, `${breite}-${name}-ganz.png`), fullPage: true });
    await st.evaluate((x) => x.remove());
    await pruefe(name);
  };
  await p.waitForSelector("#kacheln .kachel"); await shot("1-uebersicht");
  await geh("studios"); await p.waitForSelector("#liste .karte"); await shot("2-studios");
  await geh("uebersicht"); await p.click('#kacheln .kachel[data-ziel="studios:zahlend"]'); await p.waitForSelector("#v-studios:not(.hidden) #liste .karte"); await shot("2b-zahlend");
  await geh(a.id); await p.waitForSelector("#d-ansehen"); await p.waitForFunction(() => !/geladen/.test(document.getElementById("d-mails").textContent)); await shot("3-studio-detail");
  await geh("demo"); await p.waitForSelector("#v-demo:not(.hidden) #demo-neu"); await shot("4-demo");
  await geh("mehr"); await p.waitForFunction(() => !/geladen/.test(document.getElementById("mails").textContent)); await shot("5-werkzeuge");
  if (breite === 390) {
    await p.evaluate(() => sessionStorage.removeItem("tf-admin")); await p.goto(BASE + "/admin.html"); await p.waitForSelector("#login-mail");
    await shot("0-anmelden");
    await p.fill("#admin-email", "admin@beispiel.test"); await p.click("#login-mail button"); await p.waitForFunction(() => /unterwegs/.test(document.getElementById("alert").textContent));
    // Homescreen-App lädt nach dem Wechsel in die Mail-App neu: Adresse und Code-Feld müssen noch da sein
    await p.reload(); await p.waitForSelector("#login-code:not(.hidden)");
    if ((await p.inputValue("#admin-email")) !== "admin@beispiel.test") fehler.push("390: Adresse nach Neuladen vergessen");
    await shot("0b-anmelden-nach-neuladen");
  }
  await ctx.close();
}
await browser.close();
console.log(`Screenshots: ${ziel}\nKontrast-Verstöße (axe): ${kontrast}\nJS-Fehler/Querscrollen: ${fehler.length ? fehler.join(" | ") : "keine"}`);
process.exit(kontrast || fehler.length ? 1 : 0);
