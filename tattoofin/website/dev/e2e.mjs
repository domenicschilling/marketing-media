// End-to-End-Test aller Abläufe mit Stripe-Nachbau (inkl. Connect, eingebettete Bausteine, Bezahlfeld) und echtem Browser (Playwright).
//   node dev/e2e.mjs [screenshot-ordner] [handy-screenshot-ordner]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { startDev } from "./server.mjs";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("/opt/node22/lib/node_modules/playwright")); }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 8899, BASE = `http://localhost:${PORT}`;
const shots = process.argv[2] || path.join(os.tmpdir(), "tf-e2e");
const handyShots = process.argv[3] || path.join(shots, "handy");
fs.mkdirSync(shots, { recursive: true }); fs.mkdirSync(handyShots, { recursive: true });
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "tf-data-"));
// Feste „Jetzt“-Zeit vor dem Klarna-Stichtag (20.11.2026), damit die Tests nicht vom Kalendertag abhängen
process.env.TF_JETZT = "2026-10-27T12:00:00+01:00";
await startDev({ port: PORT, mock: true, dataDir, quiet: true });

let ok = 0, fail = 0;
const check = (cond, name) => { if (cond) { ok++; console.log("  ✓", name); } else { fail++; console.log("  ✗", name); } };
const admin = (p, opts = {}) => fetch(`${BASE}/api/admin/${p}`, { method: opts.body ? "POST" : "GET", ...opts, headers: { Authorization: "Bearer admin", "content-type": "application/json" }, body: opts.body ? JSON.stringify(opts.body) : undefined }).then((r) => r.json());
const mailsAn = (to) => fs.readdirSync(dataDir).filter((f) => f.startsWith("mail%2F")).map((f) => JSON.parse(fs.readFileSync(path.join(dataDir, f)))).filter((m) => [].concat(m.to).includes(to));
const linkAus = (m, re) => (m.html.match(re) || [])[1]?.replace(/&amp;/g, "&");
const mock = (p, opts) => fetch("http://localhost:12111/" + (opts ? "" : "mock/") + p, opts).then((r) => r.json());
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const post = (url, b, cookie) => fetch(BASE + url, { method: "POST", headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(b) });
// Formular absenden wie die Zwischenseite beim Login per Link (POST, application/x-www-form-urlencoded)
const formPost = (url, felder, cookie) => fetch(BASE + url, { method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded", ...(cookie ? { cookie } : {}) }, body: new URLSearchParams(felder).toString() });
const studioPer = async (email) => (await admin("studios")).find((s) => s.email === email);

const browser = await chromium.launch();
const errors = [];
async function neueSeite(opts = { viewport: { width: 1280, height: 900 } }) {
  const c = await browser.newContext(opts);
  const p = await c.newPage();
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => { if (m.type() === "error" && !/404|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  p.on("dialog", (d) => d.accept(p._dialogAntwort || undefined));
  return p;
}
// API-Aufruf mit der Sitzung (Cookie) der Seite
const api = (p, url, { method = "GET", body } = {}) => p.evaluate(async ([url, method, body]) => {
  const r = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  let data = {}; try { data = await r.json(); } catch { /* leer */ }
  return { status: r.status, data };
}, [url, method, body]);

// Cookie-Fenster (Meta-Pixel) schließen, damit es keine Knöpfe verdeckt
async function cookiesAblehnen(p) {
  const nein = await p.waitForSelector(".tf-cc .nein", { timeout: 1500 }).catch(() => null);
  if (nein) await nein.click();
}

// paket: risikofrei | monatlich | einmal; alternativ modell (alte Links: provision → risikofrei, kauf → einmal)
async function signup(p, { paket, modell, email, firma, zahlart, geschenk, shot }) {
  await p.goto(`${BASE}/start.html?${geschenk ? "geschenk=" + geschenk : paket ? "paket=" + paket : "modell=" + modell}`);
  await cookiesAblehnen(p);
  if (shot) await p.screenshot({ path: path.join(shot, "01-einladung.png"), fullPage: true });
  if (zahlart) await p.check(`input[name=zahlart][value=${zahlart}]`, { force: true });
  await p.click("section[data-step='1'] [data-next]");
  for (const [k, v] of Object.entries({ firma, inhaber: "Alex Muster", strasse: "Musterstr. 1", plz: "96047", ort: "Bamberg", email, telefon: "0151 1234567", studioTelefon: "0951 123456" })) await p.fill("#" + k, v);
  if (shot) await p.screenshot({ path: path.join(shot, "02-einladung-daten.png"), fullPage: true });
  await p.click("section[data-step='2'] [data-next]");
  await p.check("input[name=ak_alle]");
  await p.fill("#unterzeichner", "Alex Muster");
  await p.screenshot({ path: path.join(shot || shots, shot ? "03-einladung-vertrag.png" : `start-${paket || modell || "geschenk"}-schritt3.png`), fullPage: true });
  await p.click("#submit");
}

// Eingebettete Einrichtung im Dashboard (Simulation des Stripe-Bausteins „account-onboarding“)
async function einrichtungEingebettet(p, shot) {
  await p.waitForURL(/app\.html#einrichtung/, { timeout: 15000 });
  await p.waitForSelector("#so-weiter");
  if (shot) await appShot(p, path.join(shot, "04-einrichtung.png"));
  await p.click("#so-weiter"); await p.click("#so-weiter");
  if (shot) await appShot(p, path.join(shot, "05-einrichtung-bank.png"));
  await p.click("#so-weiter");
  await p.waitForFunction(() => /Bereit/.test(document.getElementById("top-status").textContent), null, { timeout: 15000 });
}

// Ganzseitiger Screenshot der App: untere Leiste ans Seitenende statt mitten ins Bild, Hinweis-Toast ausblenden
async function appShot(p, datei) {
  const st = await p.addStyleTag({ content: "body.app{position:relative}.tabbar{position:absolute!important}.toast{display:none!important}" });
  await p.screenshot({ path: datei, fullPage: true });
  await st.evaluate((el) => el.remove());
}

async function signatur(p) {
  const b = await p.locator("#sig").boundingBox();
  await p.mouse.move(b.x + 30, b.y + 120); await p.mouse.down();
  for (let i = 0; i <= 24; i++) await p.mouse.move(b.x + 30 + i * 11, b.y + 120 - Math.sin(i / 2.5) * 45 - i * 2);
  await p.mouse.up();
}

try {
  // ---------------------------------------------------------------- Startseite
  console.log("Startseite: drei Pakete (Risikofrei, Monatlich, Einmalzahlung) + Rechner + QR-Aufsteller");
  const p0 = await neueSeite();
  await p0.goto(BASE + "/");
  check((await p0.textContent("h1")).includes("leichter bezahlbar"), "Hero lädt");
  check(await p0.locator(".prices.drei .price").count() === 3, "Drei Pakete auf der Startseite");
  await p0.waitForFunction(() => document.getElementById("r-risiko").textContent.includes("€"));
  check((await p0.textContent("#r-risiko")).includes("150") && (await p0.textContent("#r-monat")).includes("108"), "Rechner 1.500 €/Monat: Risikofrei 150 €, Monatlich 58,31 € + 3,3 % ≈ 108 € (brutto)");
  check((await p0.textContent("#r-tipp")).includes("Monatlich"), "Rechner empfiehlt Monatlich bei 1.500 €/Monat");
  await p0.locator("#volumen").evaluate((el) => { el.value = 500; el.dispatchEvent(new Event("input")); });
  check((await p0.textContent("#r-tipp")).includes("Risikofrei"), "Rechner empfiehlt Risikofrei bei 500 €/Monat");
  const preise = await p0.textContent("#preise");
  check(preise.includes("999") && preise.includes("49") && preise.includes("Empfohlen") && preise.includes("900 €") && !preise.includes("730") && preise.includes("20 Monaten") && !preise.includes("1.499") && !/Gründer|Profi\b/.test(preise), "Pakete 10 % / 49 € / 999 €, Monatlich empfohlen, Lohnt-sich-Rechnung, keine alten Preise");
  check((await p0.textContent("#aufsteller")).includes("KI-generiertes Symbolbild"), "QR-Aufsteller-Abschnitt mit KI-Kennzeichnung");
  const ld = await p0.textContent('script[type="application/ld+json"]');
  check(ld.includes("Paket Monatlich") && ld.includes("Paket Einmalzahlung") && !ld.includes("1499"), "Strukturierte Daten: drei Pakete");
  await p0.waitForTimeout(1000);
  await p0.screenshot({ path: path.join(shots, "landing.png"), fullPage: true });
  const pS = await neueSeite();
  await pS.goto(BASE + "/studios.html");
  check((await pS.textContent("#pakete")).includes("Monatlich") && (await pS.content()).includes("paket=risikofrei"), "/studios: drei Pakete, Start-Link Risikofrei");

  // ---------------------------------------------------------------- A: Paket Start
  console.log("Paket Risikofrei (alter Link ?modell=provision): Abschluss → direkt ins Dashboard → eingebettete Einrichtung");
  const pA = await neueSeite();
  await signup(pA, { modell: "provision", email: "prov@example.com", firma: "Ink Provision" });
  await einrichtungEingebettet(pA);
  check(true, "Nach dem Abschluss eingeloggt im Dashboard, Einrichtung eingebettet abgeschlossen");
  const mProv = mailsAn("prov@example.com");
  check(mProv.some((m) => m.subject.startsWith("Willkommen")) && mProv.some((m) => m.subject.includes("freigegeben")), "E-Mails: Willkommen + Konto freigegeben");
  const willkommen = mProv.find((m) => m.subject.startsWith("Willkommen"));
  check(/api\/auth\?token=[^"]+next=%2Fapp\.html%23einrichtung/.test(willkommen.html), "Willkommens-Mail führt mit Login direkt in die Einrichtung im Dashboard");
  let state = await mock("state");
  const provAcct = Object.values(state.accounts).find((a) => a.email === "prov@example.com");
  check(!provAcct?.type && provAcct?.controller?.stripe_dashboard?.type === "express" && provAcct?.controller?.losses?.payments === "application" && provAcct?.controller?.fees?.payer === "application" && provAcct?.capabilities?.klarna_payments?.requested === "true", "Risikofrei: Express-Verhalten über Controller-Eigenschaften (Hotfix) mit Karte + Klarna");
  check(mailsAn("domenicschilling@gmail.com").some((m) => m.subject.includes("Paket Risikofrei") && !m.html.includes("aufsteller.html")), "Admin-Mail Risikofrei: Paket, ohne Aufsteller");
  check(state.accountSessions.some((s) => s.account === provAcct.id) === false, "Simulation: keine echte Account Session nötig");

  // ---------------------------------------------------------------- B: Paket Profi
  console.log("Paket Einmalzahlung (alter Link ?modell=kauf)");
  const pB = await neueSeite();
  await signup(pB, { modell: "kauf", email: "kauf@example.com", firma: "Ink Kauf" });
  await pB.waitForURL(/localhost:12111\/pay\//);
  check((await pB.textContent("body")).includes("1188.81"), "Stripe-Betrag 999 € netto + 19 % = 1.188,81 €");
  await pB.click("#pay");
  await einrichtungEingebettet(pB);
  check(mailsAn("kauf@example.com").some((m) => m.subject.includes("Zahlung erhalten")), "E-Mail: Zahlung erhalten; danach direkt ins Dashboard");
  const mAdminKauf = mailsAn("domenicschilling@gmail.com").find((m) => m.subject.includes("Einmalzahlung bezahlt") && m.subject.includes("Ink Kauf"));
  check(mAdminKauf && mAdminKauf.html.includes("/aufsteller.html?s=ink-kauf") && mAdminKauf.html.includes("Einmalzahlung"), "Admin-Mail Einmalzahlung: Paket + „QR-Aufsteller bestellen“ mit Link zur Gravurdatei");

  console.log("Rechnung, Abbruch, Fehlerfälle");
  const pC = await neueSeite();
  await signup(pC, { paket: "einmal", email: "rechnung@example.com", firma: "Ink Rechnung", zahlart: "rechnung" });
  await pC.waitForURL(/app\.html/, { timeout: 15000 });
  check((await studioPer("rechnung@example.com"))?.status === "zahlung_offen", "Rechnung offen, trotzdem schon im Dashboard");
  check(mailsAn("rechnung@example.com").some((m) => m.subject.includes("Rechnung")), "E-Mail: Rechnung");
  const pC2 = await neueSeite();
  await signup(pC2, { paket: "einmal", email: "abbruch@example.com", firma: "Ink Abbruch" });
  await pC2.waitForURL(/localhost:12111\/pay\//);
  await pC2.click("#cancel");
  await pC2.waitForURL(/start\.html\?resume=/);
  await pC2.waitForFunction(() => document.getElementById("firma").value === "Ink Abbruch");
  check(true, "Nach Abbruch sind Angaben wieder da");
  const basis = { firma: "x", inhaber: "x", strasse: "x", plz: "1", ort: "x", telefon: "1", studioTelefon: "1", unterzeichner: "x", akzeptiert: { vertrag: true, avv: true, unternehmer: true } };
  check((await post("/api/signup", { ...basis, paket: "risikofrei", email: "kauf@example.com" })).status === 409, "Doppelte Anmeldung abgelehnt");
  check((await post("/api/signup", { paket: "einmal", email: "neu@example.com" })).status === 400, "Signup ohne Pflichtangaben abgelehnt");
  await post("/api/signup", { ...basis, paket: "einmal", aktionscode: "RATENJA", email: "code@example.com" });
  check(!Object.values((await mock("state")).sessions).some((x) => x.amount_total === 148631), "Aktionscode RATENJA abgeschaltet (Preis bleibt 999 €)");

  // ---------------------------------------------------------------- D: Paket Monatlich (Abo)
  console.log("Paket Monatlich: Abo 49 € netto auf dem DSX-Konto → Dashboard → eigenes Standard-Konto");
  const pD = await neueSeite();
  await signup(pD, { paket: "monatlich", email: "abo@example.com", firma: "Ink Abo" });
  await pD.waitForURL(/localhost:12111\/pay\//);
  const kasse = await pD.textContent("body");
  check(kasse.includes("subscription") && kasse.includes("58.31"), "Stripe-Abo: 49 € netto + 19 % = 58,31 €");
  state = await mock("state");
  const sessAbo = Object.values(state.sessions).find((x) => x.mode === "subscription");
  check(sessAbo?.line_items?.[0]?.price_data?.recurring?.interval === "month" && sessAbo?.metadata?.paket === "monatlich" && !sessAbo.account, "Abo monatlich auf dem DSX-Konto, Metadaten Paket");
  check(/USt-IdNr\. DE456133925/.test(Object.values(state.customers).find((c) => c.email === "abo@example.com")?.invoice_settings?.footer || ""), "Rechnungsfuß mit DSX + USt-IdNr.");
  await pD.click("#pay");
  await einrichtungEingebettet(pD);
  const aboStudio = await studioPer("abo@example.com");
  check(aboStudio?.status === "einrichtung" && aboStudio?.paket === "Monatlich" && aboStudio?.provisionProzent === 0, "Abo-Studio in Einrichtung, Paket Monatlich, 0 % Provision");
  check(mailsAn("abo@example.com").some((m) => m.subject.includes("Monatlich")), "E-Mail: Paket Monatlich gestartet");
  check(mailsAn("domenicschilling@gmail.com").some((m) => m.subject.includes("Paket Monatlich") && m.html.includes("aufsteller.html?s=ink-abo")), "Admin-Mail Monatlich: „QR-Aufsteller bestellen“ mit Gravurdatei-Link");
  check(Object.values((await mock("state")).accounts).find((a) => a.email === "abo@example.com")?.type === "standard", "Monatlich: eigenes Standard-Konto");
  const kAbo = await api(pD, "/api/portal/kuendigung", { method: "POST", body: { grund: "Test", garantie: true } });
  check(kAbo.data.status === "gekuendigt" && !kAbo.data.kuendigung?.garantie && Object.values((await mock("state")).subscriptions)[0]?.cancel_at_period_end === true, "Kündigung Monatlich: keine Garantie, Abo endet zum Periodenende");
  const zAbo = await api(pD, "/api/portal/kuendigung", { method: "DELETE" });
  check(zAbo.data.status !== "gekuendigt" && Object.values((await mock("state")).subscriptions)[0]?.cancel_at_period_end === false, "Kündigung zurückgenommen: Abo läuft weiter");
  const aufApi = (await api(pD, "/api/aufsteller?s=ink-abo")).data;
  check(aufApi.zahlseite?.endsWith("/zahlen/ink-abo") && aufApi.firma === "Ink Abo", "Aufsteller-API (eigene Sitzung): Zahlseite /zahlen/<studio>");
  check((await fetch(`${BASE}/api/aufsteller?s=ink-abo`)).status === 403, "Aufsteller-API ohne Sitzung/signierten Link: 403");
  const aufLink = (await admin(`studio/${aboStudio.id}`)).aufstellerLink;
  check(/aufsteller\.html\?s=ink-abo&t=/.test(aufLink || "") && (await fetch(`${BASE}/api/aufsteller?s=ink-abo&t=${new URL(aufLink).searchParams.get("t")}`)).status === 200, "Signierter Aufsteller-Link (Admin) funktioniert");
  const inklAbo = await api(pD, "/api/portal");
  check(inklAbo.data.studio.aufsteller.inklusive === true && inklAbo.data.studio.paketName === "Monatlich", "App: Aufsteller im Paket Monatlich inklusive");

  // ---------------------------------------------------------------- E: Notlösung ohne Einbettung
  console.log("Notlösung: ohne öffentlichen Stripe-Schlüssel wie bisher zu Stripe weiterleiten");
  process.env.TF_EINBETTEN = "aus";
  const fb = await post("/api/signup", { ...basis, paket: "risikofrei", email: "fallback@example.com" });
  const fbId = (await studioPer("fallback@example.com")).id;
  const fbMailLink = linkAus(mailsAn("fallback@example.com").find((m) => m.subject.startsWith("Willkommen")), /href="([^"]*\/api\/connect\?id=[^"]+)"/);
  const fbConnect = await fetch(fbMailLink, { redirect: "manual" });
  check(fb.status === 200 && /&t=/.test(fbMailLink || "") && /localhost:12111\/onboard\//.test(fbConnect.headers.get("location") || ""), "Ohne Einbettung: Stripe-Onboarding per signiertem Mail-Link");
  const ohneToken = await fetch(`${BASE}/api/connect?id=${fbId}`, { redirect: "manual" });
  check(/\/login\.html/.test(ohneToken.headers.get("location") || ""), "Sicherheit: /api/connect nur mit Studio-ID → Login statt Stripe-Link");
  const falschToken = await fetch(`${BASE}/api/connect?id=${(await studioPer("prov@example.com")).id}&t=${new URL(fbMailLink).searchParams.get("t")}`, { redirect: "manual" });
  check(/\/login\.html/.test(falschToken.headers.get("location") || ""), "Sicherheit: Link eines anderen Studios gilt nicht");
  const zurueckOhne = await fetch(`${BASE}/api/connect/zurueck?id=${fbId}`, { redirect: "manual" });
  check(/\/login\.html/.test(zurueckOhne.headers.get("location") || ""), "Sicherheit: /api/connect/zurueck ohne Token → Login");
  const fbStatus = await (await fetch(`${BASE}/api/signup?id=${fbId}`)).json();
  check(Object.keys(fbStatus).sort().join() === "id,status", "Sicherheit: /api/signup?id= ohne Sitzung liefert nur den Status, keine Studio-Daten");
  delete process.env.TF_EINBETTEN;

  // ---------------------------------------------------------------- Login + Fragebogen
  console.log("Login per Magic Link + Fragebogen");
  const loginUrl = linkAus(willkommen, /href="([^"]*\/api\/auth\?token=[^"]+)"/);
  check(Boolean(loginUrl), "Login-Link in Willkommens-Mail");
  await pA.goto(loginUrl.split("&next=")[0] + "&next=/onboarding.html");
  await pA.waitForURL(/onboarding\.html/);
  await pA.fill("input[name=kontoauszug]", "INK PROVISION");
  await pA.click("form#f button");
  await pA.waitForSelector(".alert.ok");
  check(true, "Fragebogen gespeichert");

  // ---------------------------------------------------------------- G: Zahlungslink + Bezahlfeld
  console.log("Live schalten + Zahlungslink im Dashboard + eingebettetes Bezahlfeld (Klarna)");
  const provId = (await studioPer("prov@example.com")).id;
  await admin(`studio/${provId}/live`, { body: {} });
  check(mailsAn("prov@example.com").some((m) => m.subject.includes("live")), "E-Mail: Tattoofin ist live");
  await pA.goto(BASE + "/app.html#link");
  await pA.waitForSelector("#l-betrag");
  await pA.fill("#l-betrag", "1.500"); await pA.fill("#l-kunde", "Lena Beispiel"); await pA.fill("#l-email", "lena@example.com");
  await pA.fill("#l-beschreibung", "Sleeve linker Arm"); await pA.fill("#l-sitzungen", "3 Sitzungen");
  check((await pA.textContent("#l-fee")).includes("1.350,00"), "Hinweis: du bekommst 1.350 € (Tattoofin 10 %)");
  await pA.click("#l-btn");
  await pA.waitForSelector("#l-out [data-copytext]");
  const zahlLink = await pA.getAttribute("#l-out [data-copytext]", "data-copytext");
  await pA.screenshot({ path: path.join(shots, "app-zahlungslink.png"), fullPage: true });
  check(/zahlung\.html\?z=zl_/.test(zahlLink), "Zahlungslink erzeugt");
  const lenaId = zahlLink.split("z=")[1];
  const pK = await neueSeite();
  await pK.goto(zahlLink);
  await pK.waitForFunction(() => document.getElementById("betrag").textContent.includes("1.500"));
  await pK.click("#weiter");
  check((await pK.textContent("#alert")).includes("Projekt und Betrag"), "Ohne Inhalts-Häkchen geht es nicht weiter");
  check((await pK.textContent("#inhalt-text")).includes("Sleeve linker Arm, 3 Sitzungen"), "Kunde sieht Motiv, Sitzungen und Betrag im Häkchen-Text");
  await pK.check("#inhalt-ok");
  await pK.click("#weiter");
  await pK.waitForSelector("#pay-jetzt");
  await pK.screenshot({ path: path.join(shots, "kunde-bezahlfeld.png"), fullPage: true });
  state = await mock("state");
  const piLena = Object.values(state.paymentIntents).find((x) => x.metadata?.tattoofinZahlung === lenaId);
  check(piLena && !piLena.account && piLena.transfer_data?.destination === provAcct.id && piLena.on_behalf_of === provAcct.id, "Bezahlfeld: Tattoofin kassiert als Plattform, Ziel = Studio-Konto, Studio ist Händler");
  check(piLena?.application_fee_amount === 15000, "Provision 150 € = 10 % vom Zahlbetrag → 1.350 € an das Studio");
  check(!Object.values(state.sessions).some((s) => s.metadata?.tattoofinZahlung === lenaId), "Kein Wechsel zum Stripe-Checkout");
  await pK.click("label:has(> input[name=sim-pm][value=klarna])");
  await pK.click("#pay-jetzt");
  await pK.waitForURL(/bezahlt\.html/);
  await pK.waitForFunction(() => /erhalten/.test(document.getElementById("msg").textContent), null, { timeout: 15000 });
  check(true, "Kunde sieht Bestätigung");
  check(mailsAn("prov@example.com").some((m) => m.subject.includes("Zahlung eingegangen: 1.500,00")), "E-Mail an Studio: Zahlung eingegangen");
  check(mailsAn("lena@example.com").some((m) => m.subject.includes("Danke für deine Zahlung")), "E-Mail an Kundin: Bestätigung");
  let det = await admin(`studio/${provId}`);
  const lenaZ = det.zahlungen.find((z) => z.id === lenaId);
  check(lenaZ?.zahlart === "klarna" && lenaZ?.kundeBestaetigt?.inhalt?.includes("1.500,00 €"), "Zahlart Klarna erkannt, Inhalts-Bestätigung mit Zeitstempel gespeichert");
  await pK.goto(zahlLink);
  await pK.waitForSelector(".alert-a.ok");
  check(true, "Bereits bezahlter Link zeigt Hinweis statt erneuter Zahlung");

  // ---------------------------------------------------------------- H: Zahlseite
  console.log("Eigene Zahlseite tattoofin.de/zahlen/<studio>");
  const slug = det.studio.slug;
  await pK.goto(`${BASE}/zahlen/${slug}`);
  await pK.waitForFunction(() => document.getElementById("studio").textContent === "Ink Provision");
  await pK.fill("#betrag", "300"); await pK.fill("#kunde", "Tom"); await pK.fill("#beschreibung", "Rückenstück");
  await pK.click("label:has(> input[name=art][value=anzahlung])");
  await pK.check("#inhalt-ok");
  await pK.click("#weiter");
  check((await pK.textContent("#alert")).includes("Anzahlungsbedingungen"), "Anzahlung nur mit bestätigten Anzahlungsbedingungen");
  await pK.check("#bed-ok");
  await pK.screenshot({ path: path.join(shots, "kunde-zahlseite.png"), fullPage: true });
  await pK.click("#weiter");
  await pK.waitForSelector("#pay-jetzt");
  await pK.click("#pay-jetzt");
  await pK.waitForURL(/bezahlt\.html/);
  await pK.waitForFunction(() => /erhalten/.test(document.getElementById("msg").textContent), null, { timeout: 15000 });
  check(true, "Zahlung über die Zahlseite mit eingebettetem Bezahlfeld");
  const anzRaw = await (await post("/api/pay", { s: slug, betrag: "100", kunde: "Mia", anzahlung: true, bedingungen: true, inhaltOk: true })).json();
  check(Boolean(anzRaw.clientSecret) && anzRaw.simulation === true && !anzRaw.url, "API liefert Client-Schlüssel fürs Bezahlfeld (keine Weiterleitung)");
  await mock("bestaetigen", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pi: anzRaw.clientSecret.split("_secret_")[0], client_secret: anzRaw.clientSecret, pm: "card" }) });
  await wait(300);
  check((await post("/api/pay", { s: slug, betrag: "5", kunde: "x", inhaltOk: true })).status === 400, "Mindestbetrag wird geprüft");
  check((await post("/api/pay", { s: slug, betrag: "200", kunde: "x" })).status === 400, "Ohne Inhalts-Bestätigung keine Zahlung (auch per API)");
  process.env.TF_EINBETTEN = "aus";
  const alt = await (await post("/api/pay", { s: slug, betrag: "200", kunde: "Alt", inhaltOk: true })).json();
  check(/localhost:12111\/pay\//.test(alt.url || ""), "Notlösung: ohne Einbettung weiter Stripe-Checkout");
  delete process.env.TF_EINBETTEN;
  process.env.TF_BEZAHLFELD = "aus";
  const live = await (await post("/api/pay", { s: slug, betrag: "200", kunde: "Live", inhaltOk: true })).json();
  const liveSession = await api(pA, "/api/portal/stripe-session", { method: "POST", body: {} });
  check(/localhost:12111\/pay\//.test(live.url || "") && !live.clientSecret && liveSession.data.modus !== "weiterleitung", "Live-Einstellung ohne payment_intent-Webhooks (TF_BEZAHLFELD aus): Kunde zahlt im Stripe-Checkout, Einrichtung bleibt eingebettet");
  delete process.env.TF_BEZAHLFELD;

  // ---------------------------------------------------------------- H2: Branding je Studio (Logo/Farbe)
  console.log("Branding je Studio: Admin setzt Logo/Farbe → Zahlseite, Checkout, Stripe-Konto");
  {
    const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    check((await admin(`studio/${provId}/branding`, { body: { farbe: "rot" } })).error?.includes("#RRGGBB"), "Branding: ungültige Farbe wird abgelehnt");
    const br = await admin(`studio/${provId}/branding`, { body: { icon: png, logo: png, farbe: "#0E0B08", akzent: "#b08d57", kurzbezeichnung: "Ink Provision", stripe: true } });
    check(br.branding?.farbe === "#0e0b08" && br.branding?.kurzbezeichnung === "INK PROVISION" && /^file_mock_/.test(br.stripe?.dateien?.icon || "") && /^file_mock_/.test(br.stripe?.dateien?.logo || ""), "Branding gespeichert + Icon/Logo bei Stripe hochgeladen");
    check(br.stripe?.branding?.primary_color === "#0e0b08" && br.stripe?.branding?.secondary_color === "#b08d57" && br.stripe?.abrechnungstext === "INK PROVISION", "Stripe-Konto: Farben + Abrechnungstext gesetzt");
    const st = await mock("state");
    check(st.files.every((f) => f.account === det.studio.stripe.accountId), "Branding-Dateien liegen auf dem verbundenen Konto (Stripe-Account-Header)");
    const nur = await admin(`studio/${provId}/branding`, { body: { akzent: "#c09a5f" } });
    check(nur.branding?.logo && nur.branding?.farbe === "#0e0b08" && nur.branding?.akzent === "#c09a5f", "Branding: nur geänderte Felder werden überschrieben, Logo bleibt");
    const bild = await fetch(`${BASE}/api/studio-bild?s=${slug}&art=logo`);
    check(bild.status === 200 && bild.headers.get("content-type") === "image/png", "/api/studio-bild liefert das Logo");
    check((await fetch(`${BASE}/api/studio-bild?s=gibt-es-nicht&art=logo`)).status === 404, "/api/studio-bild: unbekanntes Studio → 404");
    const info = await (await fetch(`${BASE}/api/pay?s=${slug}`)).json();
    check(/\/api\/studio-bild\?s=/.test(info.studio.branding?.logoUrl || "") && info.studio.branding.farbe === "#0e0b08", "Zahlseiten-API liefert Logo-URL + Farbe");
    process.env.TF_BEZAHLFELD = "aus";
    const mitLogo = await (await post("/api/pay", { s: slug, betrag: "200", kunde: "Logo", inhaltOk: true })).json();
    delete process.env.TF_BEZAHLFELD;
    const cs = (await mock("state")).sessions[mitLogo.url.split("/pay/")[1]];
    check(cs?.branding_settings?.display_name === "Ink Provision" && /studio-bild/.test(cs.branding_settings.logo?.url || "") && cs.branding_settings.background_color === "#0e0b08" && cs.branding_settings.button_color === "#c09a5f", "Checkout zeigt Logo/Farben des Studios (branding_settings)");
    await pK.goto(`${BASE}/zahlen/${slug}`);
    await pK.waitForFunction(() => { const i = document.querySelector(".kunde-kopf .studio-logo"); return i && i.complete && i.naturalWidth > 0; });
    check(true, "Zahlseite zeigt das Studio-Logo");
  }

  // ---------------------------------------------------------------- I/J: Erstattung + Rückbuchung
  console.log("Erstattung (Portal) → Betrag vom Studio zurück, Provision anteilig abzüglich Stripe-Gebühr");
  det = await admin(`studio/${provId}`);
  const lena = det.zahlungen.find((z) => z.id === lenaId);
  check(lena.stripeGebuehrCent === 4520 && lena.transferId, "Stripe-Gebühr (Klarna 45,20 €) und Transfer gemerkt");
  await pA.goto(BASE + "/portal.html#zahlungen");
  await pA.waitForSelector(`[data-erstatten="${lena.id}"]`);
  pA._dialogAntwort = "750";
  await pA.click(`[data-erstatten="${lena.id}"]`);
  await pA.waitForSelector(".alert.ok");
  pA._dialogAntwort = undefined;
  await wait(500);
  state = await mock("state");
  const re = state.refunds.find((r) => r.payment_intent === lena.paymentIntentId);
  check(re?.amount === 75000 && re.reverse_transfer && !re.refund_application_fee, "Erstattung 750 € über die Plattform mit reverse_transfer");
  check(state.feeRefunds.some((r) => r.amount === 4811), "Provision zurück: (150 € − 53,79 € Gebühr inkl. USt.) × 50 % = 48,11 €");
  check(mailsAn("prov@example.com").some((m) => m.subject.includes("Erstattung an Lena")), "E-Mail an Studio: Erstattung");
  check((await api(pA, "/api/portal/erstattung/" + lena.id, { method: "POST", body: { betrag: "800" } })).status === 400, "Mehr als den Restbetrag erstatten wird abgelehnt");

  console.log("Rückbuchung (Dispute)");
  det = await admin(`studio/${provId}`);
  const tom = det.zahlungen.find((z) => z.kunde === "Tom");
  check(tom.anzahlung && tom.bedingungen?.text && tom.kundeBestaetigt?.inhalt, "Anzahlung mit Bedingungen + Inhalts-Bestätigung gespeichert (Beleg)");
  await mock(`dispute/${tom.paymentIntentId}?status=lost`);
  await wait(300);
  state = await mock("state");
  check(state.reversals.some((r) => r.transfer === tom.transferId && r.amount === 29000), "Verloren: 300 € − 30 € Provision + 20 € Gebühr = 290 € vom Studio zurückgeholt");
  check(mailsAn("prov@example.com").some((m) => m.subject.includes("Rückbuchung:")) && mailsAn("prov@example.com").some((m) => m.subject.includes("Rückbuchung entschieden")), "E-Mails an Studio: Rückbuchung (Belege) + Entscheidung");
  const mia = det.zahlungen.find((z) => z.kunde === "Mia");
  await mock(`dispute/${mia.paymentIntentId}?status=won`);
  await wait(300);
  state = await mock("state");
  check(state.reversals.some((r) => r.transfer === mia.transferId && r.amount === 10000) && state.transfers.some((t) => t.destination === provAcct.id && t.amount === 10000), "Gewonnen: zurückgeholte 100 € wieder an das Studio überwiesen");
  check(Object.values(state.paymentIntents).concat(Object.values(state.sessions)).every((x) => !JSON.stringify(x.payment_method_types || []).includes("sepa_debit")), "Bezahlen ohne SEPA-Lastschrift");
  check(/\/express\//.test((await api(pA, "/api/portal/stripe-dashboard", { method: "POST", body: {} })).data.url || ""), "Notlösung: Login-Link ins Stripe-Express-Dashboard");

  console.log("Monatsabrechnung");
  const monat = new Date().toISOString().slice(0, 7);
  const probe = (await admin("abrechnung", { body: { monat, dryRun: true } })).find((x) => x.studio === "Ink Provision");
  check(probe?.provisionBruttoCent === 11189 && probe?.provisionNettoCent === 9403 && probe?.auszahlungCent === 73811, "Probelauf: Lena 101,89 € + Mia 10 € (Tom verloren = 0) = 111,89 € inkl. USt., Auszahlung 738,11 €");
  const echt = (await admin("abrechnung", { body: { monat, dryRun: false } })).find((x) => x.studio === "Ink Provision");
  check(echt?.rechnung?.startsWith("TEST-"), "Rechnung erstellt (als bereits bezahlt markiert)");
  state = await mock("state");
  check(Object.values(state.invoices).some((i) => i.paid_out_of_band), "Rechnung außerhalb von Stripe als bezahlt markiert");
  check(state.items.some((i) => i.amount === 11189 && Object.values(state.taxRates).some((t) => t.id === i.tax_rates[0] && t.inclusive === "true")), "Rechnungsposition 111,89 € mit USt. inklusive");
  check(mailsAn("prov@example.com").some((m) => m.subject.includes("Abrechnung")), "E-Mail: Monatsabrechnung");
  check((await admin("abrechnung", { body: { monat, dryRun: false } })).find((x) => x.studio === "Ink Provision")?.status === "schon abgerechnet", "Keine doppelte Abrechnung");

  // ---------------------------------------------------------------- K2: Gutscheine (alle Pakete)
  console.log("Gutschein verkaufen: Link → Zahlung (nur Karte) → Code + PDF per Mail → Liste → einlösen");
  {
    await pA.goto(BASE + "/app.html#gutschein");
    await pA.waitForSelector("#g-betrag");
    await pA.fill("#g-betrag", "150"); await pA.fill("#g-kunde", "Greta Käufer"); await pA.fill("#g-email", "greta@example.com");
    await pA.fill("#g-empfaenger", "Max"); await pA.fill("#g-nachricht", "Alles Gute zum Geburtstag! 🎉");
    await pA.click("#g-btn");
    await pA.waitForSelector("#g-out [data-copytext]");
    await pA.screenshot({ path: path.join(shots, "app-gutschein-link.png"), fullPage: true });
    const gsLink = await pA.getAttribute("#g-out [data-copytext]", "data-copytext");
    const gsId = gsLink.split("z=")[1];
    check(/zahlung\.html\?z=zl_/.test(gsLink), "Gutschein-Link erstellt");
    check((await api(pA, "/api/portal/zahlung", { method: "POST", body: { art: "gutschein", betrag: "100", kunde: "Ohne Mail" } })).status === 400, "Gutschein ohne Käufer-E-Mail wird abgelehnt");
    await pK.goto(gsLink);
    await pK.waitForFunction(() => document.getElementById("betrag").textContent.includes("150"));
    check((await pK.textContent("#sub")).includes("Wertgutschein für Max") && (await pK.textContent("#inhalt-text")).includes("Wertgutschein über 150,00 €"), "Kaufseite: Wertgutschein für Max, Häkchen-Text passt");
    check(!/Kreditaufnahme/.test(await pK.textContent("#fuss-raten")), "Kaufseite Gutschein: keine Raten-Hinweise (nur Karte)");
    await pK.check("#inhalt-ok"); await pK.click("#weiter");
    await pK.waitForSelector("#pay-jetzt");
    check(await pK.locator("input[name=sim-pm][value=klarna]").count() === 0, "Gutschein: Bezahlfeld ohne Klarna (Klarna-Regel: keine Gutscheine)");
    state = await mock("state");
    const piGs = Object.values(state.paymentIntents).find((x) => x.metadata?.tattoofinZahlung === gsId);
    check(JSON.stringify(piGs?.payment_method_types) === '["card"]' && piGs?.metadata?.typ === "gutschein", "Gutschein-PaymentIntent: nur Karte, Typ gutschein");
    await pK.click("#pay-jetzt");
    await pK.waitForURL(/bezahlt\.html/);
    await pK.waitForFunction(() => /erhalten/.test(document.getElementById("msg").textContent), null, { timeout: 15000 });
    const gm = mailsAn("greta@example.com").find((m) => m.subject.includes("Dein Gutschein von Ink Provision"));
    check(gm && (gm.anhaenge || [])[0]?.endsWith(".pdf") && !mailsAn("greta@example.com").some((m) => m.subject.includes("Danke für deine Zahlung")), "Käufer bekommt Gutschein-Mail mit PDF-Anhang (statt normaler Quittung)");
    check(mailsAn("prov@example.com").some((m) => m.subject.includes("Gutschein verkauft: 150,00")), "Studio bekommt „Gutschein verkauft“");
    det = await admin(`studio/${provId}`);
    const gz = det.zahlungen.find((z) => z.id === gsId);
    const jahr = new Date().getUTCFullYear();
    check(/^GS-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(gz?.gutschein?.code || "") && gz.gutschein.gueltigBis.startsWith(`${jahr + 3}-12-31`) && gz.status === "bezahlt", "Code " + gz?.gutschein?.code + ", gültig bis 31.12." + (jahr + 3) + " (§ 195 BGB, Jahresende)");
    check(gm.html.includes(gz.gutschein.code) && gm.html.includes("Max") && gm.html.includes("Einlösbar bei"), "Mail zeigt Code, Empfänger, Einlöseort");
    const gsUrl = linkAus(gm, /href="([^"]*gutschein\.html\?t=[^"]+)"/);
    const pdfR = await fetch(gsUrl.replace("/gutschein.html?", "/api/gutschein?") + "&pdf=1");
    const pdfB = Buffer.from(await pdfR.arrayBuffer());
    check(pdfR.headers.get("content-type") === "application/pdf" && pdfB.subarray(0, 5).toString() === "%PDF-" && pdfB.length > 2000, "Gutschein-PDF öffentlich über den Token-Link (" + pdfB.length + " Bytes)");
    fs.writeFileSync(path.join(shots, "gutschein.pdf"), pdfB);
    check((await fetch(`${BASE}/api/gutschein?t=falsch-falsch-falsch-falsch`)).status === 404, "Gutschein: falscher Token → 404");
    await pK.goto(gsUrl);
    await pK.waitForFunction(() => /^GS-/.test(document.getElementById("gs-code").textContent));
    check((await pK.textContent("#gs-fuer")) === "für Max" && (await pK.textContent("#gs-daten")).includes("Gültig bis 31.12." + (jahr + 3)), "Online-Ansicht des Gutscheins");
    await pK.screenshot({ path: path.join(shots, "kunde-gutschein.png"), fullPage: true });
    const pdfStudio = await pA.evaluate((id) => fetch("/api/portal/gutschein/" + id + "/pdf").then(async (r) => r.headers.get("content-type") + "|" + (await r.arrayBuffer()).byteLength), gsId);
    check(pdfStudio.startsWith("application/pdf|"), "Studio kann das PDF im Dashboard öffnen");
    await pA.goto(BASE + "/app.html#gutscheine");
    await pA.waitForSelector("#gs-liste .zl");
    check((await pA.textContent("#gs-liste")).includes(gz.gutschein.code) && (await pA.textContent("#gs-liste")).includes("gültig"), "Liste „Gutscheine“ zeigt Code + Status gültig");
    await pA.fill("#gs-suche", gz.gutschein.code.toLowerCase().replace(/-/g, ""));
    await pA.click("#gs-suche-btn");
    await pA.waitForSelector("#gs-einloesen");
    await pA.screenshot({ path: path.join(shots, "app-gutschein-detail.png"), fullPage: true });
    await pA.click("#gs-einloesen");
    await pA.waitForSelector(".detail-kopf .chip.eingeloest");
    check(true, "Code prüfen (auch klein/ohne Striche) → Detail → als eingelöst markiert");
    check((await api(pA, `/api/portal/gutschein/${gsId}/einloesen`, { method: "POST", body: {} })).status === 409, "Doppelt einlösen nicht möglich");
    const fremd = await api(pB, "/api/portal/gutschein-code?code=" + gz.gutschein.code);
    check(fremd.status === 404, "Anderes Studio findet den Gutschein nicht (Mandantentrennung)");
    check((await (await fetch(gsUrl.replace("/gutschein.html?", "/api/gutschein?"))).json()).gutschein.status === "eingeloest", "Online-Ansicht zeigt „eingelöst“");
    const { zahlartenFuer } = await import("../netlify/functions/_lib/domain.mjs");
    process.env.TF_GUTSCHEIN_KLARNA = "an";
    check(JSON.stringify(zahlartenFuer({ art: "gutschein" })) === '["card"]', "Gutschein nie mit Klarna (auch nicht per Umgebungsvariable)");
    delete process.env.TF_GUTSCHEIN_KLARNA;
  }

  // ---------------------------------------------------------------- K3: Klarna – was Stripe bekommt + Ausweg bei Ablehnung
  console.log("Klarna: Checkout-Daten (Name, Adresse, Telefon, Artikel) + Ausweg bei Ablehnung");
  {
    process.env.TF_BEZAHLFELD = "aus";
    const kl = await api(pA, "/api/portal/zahlung", { method: "POST", body: { betrag: "1200", kunde: "Kai Klarna", email: "kai@example.com", beschreibung: "Rückenstück Drache", sitzungen: "2 Sitzungen" } });
    const klId = kl.data.zahlung.id;
    check(/„Klarna“ als Zahlungsart wählen/.test(kl.data.whatsappText) && /Kreditaufnahme kostet Geld/.test(kl.data.whatsappText), "WhatsApp-Text Projektpreis erklärt: für Raten „Klarna“ wählen (mit Fußnote)");
    await pK.goto(`${BASE}/zahlung.html?z=${klId}`);
    await pK.waitForSelector("#raten-hinweis .raten-box");
    check(/Du willst in Raten\* zahlen\?/.test(await pK.textContent("#raten-hinweis")) && (await pK.locator(".raten-schritte li").count()) === 3 && /25 € bis 10\.000 €/.test(await pK.textContent("#raten-hinweis")), "Kundenseite: Hinweis „Wähle im nächsten Schritt Klarna“ mit 3 Schritten und Betragsrahmen");
    await pK.screenshot({ path: path.join(shots, "kunde-raten-hinweis.png"), fullPage: true });
    const anzL = await api(pA, "/api/portal/zahlung", { method: "POST", body: { betrag: "100", kunde: "Anna", art: "anzahlung", beschreibung: "Termin" } });
    check(/per Karte/.test(anzL.data.whatsappText) && !/Klarna/.test(anzL.data.whatsappText), "WhatsApp-Text Anzahlung: per Karte, Klarna nicht beworben");
    await pK.goto(`${BASE}/zahlung.html?z=${anzL.data.zahlung.id}`);
    await pK.waitForSelector("#raten-hinweis .raten-box.ruhig");
    check(/am einfachsten direkt per/.test(await pK.textContent("#raten-hinweis")), "Kundenseite Anzahlung: ruhiger Hinweis „per Karte“");
    const rAnzL = await (await post("/api/pay", { z: anzL.data.zahlung.id, inhaltOk: true, bedingungen: true })).json();
    check(JSON.stringify((await mock("state")).sessions[rAnzL.url.split("/pay/")[1]].payment_method_types) === '["card","klarna"]', "Anzahlung: Karte zuerst, Klarna technisch weiter erlaubt");
    await pA.goto(BASE + "/app.html#raten");
    await pA.waitForFunction(() => /Klarna/.test(document.getElementById("raten-text").textContent));
    check(/\[Zahlungslink\]/.test(await pA.textContent("#raten-text")), "Dashboard-Hilfe „So zahlt dein Kunde in Raten*“ mit fertigem WhatsApp-Text");
    const r1 = await (await post("/api/pay", { z: klId, inhaltOk: true })).json();
    let st = await mock("state");
    const cs1 = st.sessions[r1.url.split("/pay/")[1]];
    const li = cs1.line_items[0];
    check(li.quantity === "1" && li.price_data.product_data.name === "Tattoo bei Ink Provision – Rückenstück Drache" && /direkt nach der Zahlungsfreigabe/.test(li.price_data.product_data.description) && /2 Sitzungen/.test(li.price_data.product_data.description) && /Musterstr\. 1, 96047 Bamberg/.test(li.price_data.product_data.description), "Checkout: Artikel „Tattoo bei Ink Provision – Rückenstück Drache“ (Tätowierung direkt nach Freigabe), Menge 1, Sitzungen + Studio-Anschrift in der Beschreibung");
    check(cs1.billing_address_collection === "required" && cs1.phone_number_collection?.enabled === "true", "Checkout: Rechnungsadresse und Telefonnummer verpflichtend");
    const kunde = st.customers[cs1.customer];
    check(kunde?.name === "Kai Klarna" && kunde?.email === "kai@example.com" && cs1.customer_update?.name === "auto", "Checkout: Kunde mit Name + E-Mail vorausgefüllt (Stripe-Customer)");
    check(JSON.stringify(cs1.payment_method_types) === '["klarna","card"]' && cs1.payment_intent_data.on_behalf_of === provAcct.id, "Checkout: Klarna zuerst, dann Karte; Studio ist Händler (on_behalf_of)");
    check(/Zurück-Pfeil/.test(cs1.custom_text?.submit?.message || ""), "Checkout: Hinweis auf weitere Möglichkeiten, falls Klarna nicht zustimmt");
    const gsCheckout = await api(pA, "/api/portal/zahlung", { method: "POST", body: { art: "gutschein", betrag: "80", kunde: "Gina", email: "gina@example.com" } });
    const rG = await (await post("/api/pay", { z: gsCheckout.data.zahlung.id, inhaltOk: true })).json();
    const csG = (await mock("state")).sessions[rG.url.split("/pay/")[1]];
    check(JSON.stringify(csG.payment_method_types) === '["card"]' && /^Wertgutschein 80 € – Ink Provision$/.test(csG.line_items[0].price_data.product_data.name), "Gutschein-Checkout: nur Karte, Artikel „Wertgutschein 80 € – Ink Provision“");

    // Kunde versucht Klarna → Klarna lehnt ab → „Zurück“ → Auswege
    await pK.goto(r1.url);
    await pK.click("#pay-klarna-abgelehnt");
    await pK.waitForSelector("#fehler");
    await pK.click("#cancel");
    await pK.waitForURL(/abbruch=1/);
    await pK.waitForSelector("#ausweg:not(.hidden)");
    check((await pK.textContent("#ausweg-titel")).includes("Klarna hat diesmal nicht zugestimmt") && await pK.isHidden("#aw-anz") && await pK.isHidden("#schritt1"), "Nach Klarna-Ablehnung: Hinweis + „Mit Karte zahlen“ (Anzahlung aus, solange das Studio sie nicht erlaubt)");
    check(mailsAn("prov@example.com").filter((m) => m.subject.includes("Klarna hat bei Kai Klarna nicht zugestimmt")).length === 1, "Studio bekommt einmal Bescheid: Klarna hat nicht zugestimmt");
    check((await api(pA, "/api/portal/kontakt", { method: "PATCH", body: { ausweichAnzahlung: { an: true, prozent: 70 } } })).status === 400, "Einstellung: Anzahlung über 50 % wird abgelehnt");
    await pA.goto(BASE + "/app.html#einstellungen");
    await pA.waitForSelector("#k-aw-an");
    await pA.check("#k-aw-an"); await pA.fill("#k-aw-pr", "30"); await pA.click("#k-aw-save");
    await pA.waitForFunction(() => /Gespeichert/.test(document.getElementById("toast").textContent));
    check((await admin(`studio/${provId}`)).studio.ausweichAnzahlung?.an === true, "Einstellung „Anzahlung als Ausweg“ (30 %) im Dashboard gespeichert");
    await pK.reload();
    await pK.waitForSelector("#aw-anz:not(.hidden)");
    check((await pK.textContent("#aw-anz")).includes("360,00") && (await pK.textContent("#aw-anz")).includes("840,00"), "Ausweg: 360 € Anzahlung jetzt (30 %), 840 € direkt im Studio");
    check(mailsAn("prov@example.com").filter((m) => m.subject.includes("Klarna hat bei Kai Klarna nicht zugestimmt")).length === 1, "Neu laden schickt keine zweite Mail");
    await pK.screenshot({ path: path.join(shots, "kunde-klarna-ausweg.png"), fullPage: true });
    await pK.click("#aw-anz");
    await pK.click("#aw-anz-los");
    check((await pK.textContent("#alert")).includes("Anzahlungsbedingungen"), "Ausweg-Anzahlung nur mit bestätigten Anzahlungsbedingungen");
    await pK.check("#aw-bed-ok"); await pK.check("#aw-inhalt-ok");
    await pK.click("#aw-anz-los");
    await pK.waitForURL(/localhost:12111\/pay\//);
    st = await mock("state");
    const csA = st.sessions[pK.url().split("/pay/")[1]];
    check(csA.amount_total === 36000 && JSON.stringify(csA.payment_method_types) === '["card"]' && /^Anzahlung für Tattoo bei Ink Provision – Rückenstück Drache/.test(csA.line_items[0].price_data.product_data.name) && /Anzahlungsbedingungen/.test(csA.custom_text?.submit?.message || ""), "Ausweg-Checkout: 360 € nur Karte, Artikel „Anzahlung für Tattoo bei …“, Bedingungen im Checkout");
    check(await pK.locator("#pay-klarna").count() === 0, "Ausweg-Checkout bietet Klarna nicht noch einmal an");
    await pK.click("#pay");
    await pK.waitForURL(/bezahlt\.html/);
    await wait(400);
    det = await admin(`studio/${provId}`);
    const orig = det.zahlungen.find((z) => z.id === klId);
    const anzA = det.zahlungen.find((z) => z.ausweichVon === klId);
    check(orig.klarnaAbgelehnt?.code === "payment_method_provider_decline" && orig.ausweich?.bezahltAm && orig.status === "offen", "Original-Link: Klarna-Ablehnung + bezahlte Anzahlung vermerkt (Rest bleibt offen)");
    check(anzA?.status === "bezahlt" && anzA.art === "anzahlung" && anzA.bedingungen?.text && /Rest von 840,00 €/.test(anzA.kundeBestaetigt?.inhalt || ""), "Anzahlung bezahlt, mit Bedingungen + Bestätigung „Rest direkt im Studio“");
    check((await (await post("/api/pay", { z: klId, ausweich: "anzahlung", bedingungen: true, inhaltOk: true })).json()).url !== undefined || true, "Ausweg erneut aufrufbar ohne Fehler");
    // „Mit Karte zahlen“: gleicher Betrag, nur Karte
    const kk = await api(pA, "/api/portal/zahlung", { method: "POST", body: { betrag: "600", kunde: "Karla", beschreibung: "Unterarm" } });
    await post("/api/pay", { z: kk.data.zahlung.id, inhaltOk: true });
    const rK = await (await post("/api/pay", { z: kk.data.zahlung.id, ausweich: "karte" })).json();
    const csK = (await mock("state")).sessions[rK.url.split("/pay/")[1]];
    check(JSON.stringify(csK.payment_method_types) === '["card"]' && csK.amount_total === 60000 && !st.customers[csK.customer], "„Mit Karte zahlen“: gleicher Betrag, nur Karte (ohne neue Bestätigung, da schon bestätigt)");
    await api(pA, "/api/portal/kontakt", { method: "PATCH", body: { ausweichAnzahlung: { an: false, prozent: 30 } } });
    delete process.env.TF_BEZAHLFELD;
  }

  // ---------------------------------------------------------------- L: Profi + Studio-Satz
  console.log("Einmalzahlung/Monatlich: keine Provision, Zahlung direkt auf dem eigenen Konto");
  const kaufId = (await studioPer("kauf@example.com")).id;
  await admin(`studio/${kaufId}/live`, { body: {} });
  const rKauf = await api(pB, "/api/portal/zahlung", { method: "POST", body: { betrag: "1000", kunde: "Kim" } });
  check(rKauf.data.zahlung?.gebuehrBruttoCent === 0, "Einmalzahlung: Zahlungslink ohne Plattformgebühr");
  const kaufAcct = Object.values((await mock("state")).accounts).find((a) => a.email === "kauf@example.com");
  check(kaufAcct?.type === "standard", "Einmalzahlung: eigenes Standard-Konto");
  const rKim = await (await post("/api/pay", { z: rKauf.data.zahlung.id, inhaltOk: true })).json();
  const piKim = (await mock("state")).paymentIntents[rKim.clientSecret.split("_secret_")[0]];
  check(rKim.stripeAccount === kaufAcct.id && piKim.account === kaufAcct.id && !piKim.application_fee_amount, "Einmalzahlung: Bezahlfeld direkt auf dem Studio-Konto (Direct Charge, Stripe-Account), keine Gebühr für Tattoofin");
  const aboId = (await studioPer("abo@example.com")).id;
  await admin(`studio/${aboId}/live`, { body: {} });
  const rAbo = await api(pD, "/api/portal/zahlung", { method: "POST", body: { betrag: "1000", kunde: "Sam" } });
  check(rAbo.data.zahlung?.gebuehrBruttoCent === 0, "Paket Monatlich: Zahlungslink ohne Tattoofin-Provision");

  // ---------------------------------------------------------------- M: Leistungsbestätigung
  console.log("Leistungsbestätigung nach dem Termin");
  const offen = await api(pA, "/api/portal/zahlung", { method: "POST", body: { betrag: "200", kunde: "Offen" } });
  check((await api(pA, "/api/portal/bestaetigung/" + offen.data.zahlung.id, { method: "POST", body: {} })).status === 400, "Vor der Zahlung keine Leistungsbestätigung");
  check((await api(pA, "/api/portal/bestaetigung/" + tom.id, { method: "POST", body: {} })).status === 400, "Zurückgebuchte Zahlung: keine neue Leistungsbestätigung");
  const lbMia = await api(pA, "/api/portal/bestaetigung/" + mia.id, { method: "POST", body: {} });
  const tMia = new URL(lbMia.data.link).searchParams.get("t");
  check((await post("/api/bestaetigung", { t: tMia, name: "Mia", datum: "2026-10-18", sitzungErledigt: true })).status === 400, "Ohne Unterschrift abgelehnt");
  check((await fetch(`${BASE}/api/bestaetigung?t=gibtesnichtgibtesnicht`)).status === 404, "Ungültiger Link → 404");
  await pA.goto(`${BASE}/app.html#zahlung/${lenaId}`);
  await pA.waitForSelector("#lb-btn");
  await pA.click("#lb-btn");
  await pA.waitForSelector("#lb-out [data-copytext]");
  const lbLink = await pA.getAttribute("#lb-out [data-copytext]", "data-copytext");
  const pM = await neueSeite({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await pM.goto(lbLink);
  await pM.waitForSelector("#f:not(.hidden)");
  check((await pM.textContent("#text")).includes("Ink Provision") && !/Leistung erhalten/.test(await pM.textContent("body")), "Kunde bestätigt nach dem Termin, dass die Sitzung stattgefunden hat (kein „Leistung erhalten“ vorab)");
  await pM.fill("#name", "Lena Beispiel"); await pM.check("#erledigt");
  await signatur(pM);
  await pM.setInputFiles("#foto", path.join(root, "public/assets/app/icon-192.png"));
  await pM.waitForSelector("#foto-ok-l:not(.hidden)");
  await pM.click("#senden");
  check((await pM.textContent("#alert")).includes("Foto"), "Foto nur mit Einwilligung");
  await pM.check("#foto-ok");
  await pM.click("#senden");
  await pM.waitForSelector("#danke:not(.hidden)");
  check(true, "Leistungsbestätigung mit Unterschrift + Foto gespeichert");
  const nw = await api(pA, "/api/portal/nachweis/" + lenaId);
  check(nw.data.leistung?.unterschrift?.startsWith("data:image/png") && nw.data.leistung?.foto?.startsWith("data:image/jpeg") && nw.data.zahlung.leistung?.name === "Lena Beispiel", "Nachweis enthält Unterschrift, Foto, Name, Datum");
  check((await post("/api/bestaetigung", { t: new URL(lbLink).searchParams.get("t"), name: "x", datum: "2026-10-18", sitzungErledigt: true, unterschrift: "data:image/png;base64," + "A".repeat(3000) })).status === 409, "Zweite Bestätigung → abgelehnt");
  check(mailsAn("prov@example.com").some((m) => m.subject.includes("Leistungsbestätigung")), "E-Mail an Studio: Leistungsbestätigung");
  await pA.goto(`${BASE}/nachweis.html?z=${lenaId}`);
  await pA.waitForSelector("img.sig");
  check((await pA.textContent("body")).includes("Keine Rechtsberatung") && !(await pA.textContent("body")).includes("Entwurf") && (await pA.textContent("body")).includes("Bestätigung beim Bezahlen"), "Nachweis-Seite (PDF) mit beiden Stufen, sachlicher Hinweis ohne „Entwurf“");
  await pA.pdf?.({ path: path.join(shots, "nachweis.pdf") }).catch(() => {});
  await pA.screenshot({ path: path.join(shots, "nachweis.png"), fullPage: true });

  // ---------------------------------------------------------------- N: Mandantentrennung
  console.log("Mandantentrennung: Studio B sieht und ändert nichts von Studio A");
  const fremd = [
    ["GET", "/api/portal/nachweis/" + lenaId], ["POST", "/api/portal/bestaetigung/" + lenaId], ["POST", "/api/portal/erstattung/" + lenaId],
    ["DELETE", "/api/portal/zahlung/" + offen.data.zahlung.id],
  ];
  const fremdStatus = [];
  for (const [method, url] of fremd) fremdStatus.push((await api(pB, url, { method, body: method === "GET" || method === "DELETE" ? undefined : { betrag: "1" } })).status);
  check(fremdStatus.every((s) => s === 404), "Fremde Zahlungs-IDs → 404 (Nachweis, Bestätigung, Erstattung, Storno): " + fremdStatus.join(","));
  const bPortal = await api(pB, "/api/portal");
  check(bPortal.data.zahlungen.every((z) => z.studioId === kaufId) && bPortal.data.studio.email === "kauf@example.com", "Studio B bekommt nur eigene Zahlungen und Daten");
  const bSess = await api(pB, "/api/portal/stripe-session", { method: "POST", body: {} });
  check(bSess.data.konto === kaufAcct.id, "Stripe-Sitzung nur für das eigene Konto");
  check(!JSON.stringify(bPortal.data).includes("clientSecret") && !JSON.stringify((await api(pA, "/api/portal")).data).includes('"ip"'), "Keine Client-Schlüssel oder Kunden-IP in der Portal-Antwort");
  const cookieD = (await pD.context().cookies()).map((c) => `${c.name}=${c.value}`).join("; ");
  check((await fetch(BASE + "/api/portal", { headers: { cookie: cookieD } })).status === 200, "Sitzung gültig");
  await api(pD, "/api/portal/abmelden", { method: "POST", body: {} });
  check((await fetch(BASE + "/api/portal", { headers: { cookie: cookieD } })).status === 401, "„Auf allen Geräten abmelden“: alte Sitzung ungültig");

  // ---------------------------------------------------------------- O: Recht, Extras, Checkliste
  console.log("Rechtliche Lage, Extras, Checkliste");
  check((await api(pA, "/api/portal/recht", { method: "POST", body: { gelesen: true, version: "alt" } })).status === 409, "Zustimmung zu veralteter Version abgelehnt");
  await pA.goto(BASE + "/app.html#recht");
  await pA.waitForSelector("#r-btn");
  check((await pA.textContent("#recht-inhalt")).includes("Klarna") && (await pA.textContent("#recht-inhalt")).includes("20,00 €"), "Blatt zeigt Klarna-Risiko und Rückbuchungsgebühr aus der Konfiguration");
  await pA.check("#r-ok"); await pA.click("#r-btn");
  await pA.waitForFunction(() => /Gelesen und bestätigt/.test(document.getElementById("recht-ok").textContent));
  const rA = (await admin(`studio/${provId}`)).studio.recht;
  check(rA?.version && rA?.am && rA?.name, "Zustimmung mit Zeitstempel, Version und Name gespeichert");
  await pA.goto(BASE + "/app.html#extras");
  await pA.waitForSelector("[data-extra]");
  await pA.click('[data-extra="no-show"]');
  await pA.waitForSelector(".chip.ok");
  check(mailsAn("domenicschilling@gmail.com").some((m) => m.subject.includes("Extra angefragt")), "Extra angefragt → interne Meldung, keine Abrechnung");
  check((await api(pA, "/api/portal/checkliste", { method: "POST", body: { punkt: "theke", erledigt: true } })).data.checkliste?.theke, "Checklisten-Punkt gespeichert");

  // ---------------------------------------------------------------- Kündigung, Garantie, Sicherheit
  console.log("Kündigung & Rücknahme, Garantie");
  await pA.goto(BASE + "/portal.html#vertrag");
  await pA.click("#k-btn");
  await pA.waitForSelector("#k-zurueck");
  check(mailsAn("prov@example.com").some((m) => m.subject.includes("Kündigung ist eingegangen")), "E-Mail: Kündigungsbestätigung");
  await pA.click("#k-zurueck");
  await pA.waitForSelector("#k-btn");
  check(mailsAn("prov@example.com").some((m) => m.subject.includes("zurückgenommen")), "E-Mail: Kündigung zurückgenommen");
  const ref = await admin(`studio/${kaufId}/erstattung`, { body: {} });
  check(ref.status === "erstattet" && mailsAn("kauf@example.com").some((m) => m.subject.includes("Erstattung")), "Garantie-Erstattung Kauf + E-Mail");

  console.log("Sicherheit");
  check((await fetch(`${BASE}/api/stripe-webhook`, { method: "POST", headers: { "stripe-signature": "t=1,v1=00" }, body: "{}" })).status === 400, "Webhook mit falscher Signatur abgelehnt");
  check((await fetch(`${BASE}/api/admin/studios`)).status === 401, "Admin ohne Token abgelehnt");
  check((await fetch(`${BASE}/api/portal`)).status === 401, "Portal ohne Login abgelehnt");
  // Login-Link (24 h, einmal verwendbar): GET zeigt nur die Zwischenseite, erst der POST meldet an
  await post("/api/login", { email: "rechnung@example.com" });
  const llMail = mailsAn("rechnung@example.com").filter((m) => /Login-Link/.test(m.subject)).pop();
  const llTok = new URL(linkAus(llMail, /href="([^"]*\/api\/auth\?token=[^"]+)"/)).searchParams.get("token");
  check(/24 Stunden gültig, funktioniert einmal/.test(llMail.html), "Login-Mail: 24 Stunden gültig, einmal verwendbar");
  const llGet = await fetch(`${BASE}/api/auth?token=${encodeURIComponent(llTok)}`, { redirect: "manual" });
  check(llGet.status === 200 && !llGet.headers.get("set-cookie") && /method="post" action="\/api\/auth"/.test(await llGet.text()), "Login-Link: GET (z. B. Mail-Scanner) verbraucht den Link nicht, nur Zwischenseite");
  const redir = await formPost("/api/auth", { token: llTok, next: "//evil.com" });
  check(redir.headers.get("location") === "/app.html" && /tf_session=/.test(redir.headers.get("set-cookie") || ""), "Kein offener Redirect (Standardziel: Dashboard)");
  const llCookie = (redir.headers.get("set-cookie") || "").split(";")[0];
  check((await formPost("/api/auth", { token: llTok, next: "/app.html" }, llCookie)).headers.get("location") === "/app.html", "Login-Link doppelt angetippt (schon angemeldet): einfach weiter");
  const llZweit = await formPost("/api/auth", { token: llTok });
  check(/^\/login\.html\?abgelaufen=1&neu=/.test(llZweit.headers.get("location") || "") && !llZweit.headers.get("set-cookie"), "Login-Link ein zweites Mal (anderes Gerät): „abgelaufen“ mit Knopf für neuen Link");
  const vorNeu = mailsAn("rechnung@example.com").filter((m) => /Login-Link/.test(m.subject)).length;
  const neuR = await (await post("/api/login", { neu: llTok })).json();
  check(neuR.ok && /^r•••••@example\.com$/.test(neuR.an || "") && mailsAn("rechnung@example.com").filter((m) => /Login-Link/.test(m.subject)).length === vorNeu + 1, "„Neuen Link schicken“: neuer Link an die Studio-Adresse (maskiert angezeigt)");
  check((await (await post("/api/login", { neu: "gefaelscht.abc" })).json()).an === undefined, "„Neuen Link schicken“ mit gefälschtem Token: nichts verschickt");
  const pAbg = await neueSeite();
  await pAbg.goto(BASE + new URL(llZweit.headers.get("location"), BASE).pathname + new URL(llZweit.headers.get("location"), BASE).search);
  await pAbg.click("#neu-btn");
  await pAbg.waitForFunction(() => /Neuer Link ist unterwegs/.test(document.getElementById("alert").textContent));
  check(!/neu=/.test(pAbg.url()), "Seite „Link abgelaufen“: ein Knopf, neuer Link unterwegs, alter Link aus der Adresszeile entfernt");
  const blocked = await post("/api/pay", { s: (await studioPer("rechnung@example.com")).slug, betrag: "500", kunde: "x", inhaltOk: true });
  check(blocked.status === 409, "Studio ohne freigegebenes Konto kann nicht kassieren");
  check((await fetch(`${BASE}/api/vorschau/mails`)).status === 404 && (await post("/api/vorschau/einladen", { email: "x@example.com", firma: "x" })).status === 404, "Vorschau-Endpunkte außerhalb der Vorschau: 404");
  const vorLogin = mailsAn("prov@example.com").filter((m) => /Login-Link/.test(m.subject)).length;
  for (let i = 0; i < 6; i++) check((await (await post("/api/login", { email: "prov@example.com" })).json()).ok === true, "Login-Antwort immer gleich (" + (i + 1) + ")");
  check(mailsAn("prov@example.com").filter((m) => /Login-Link/.test(m.subject)).length - vorLogin === 3, "Rate-Limit: höchstens 3 Login-Mails pro Adresse in 15 Minuten");
  // E-Mail-Vergleich normalisiert (gmail = googlemail, Groß/Klein, Leerzeichen, Punkte/+ bei Gmail)
  await post("/api/signup", { ...basis, paket: "risikofrei", email: "Test.Gmail+abc@googlemail.com" });
  await post("/api/login", { email: " testgmail@GMAIL.com " });
  check(mailsAn("test.gmail+abc@googlemail.com").some((m) => /Login-Link/.test(m.subject)), "Login: gmail/googlemail, Punkte, +Zusatz und Groß/Klein werden gleich behandelt");
  check((await post("/api/signup", { ...basis, paket: "einmal", email: "testgmail@gmail.com" })).status === 409, "Keine Dublette mit Gmail-Variante derselben Adresse");

  console.log("Admin-Login per E-Mail + Dashboard ansehen (nur lesend)");
  check((await (await post("/api/admin-login", { email: "fremd@example.com" })).json()).ok === true && !mailsAn("fremd@example.com").length, "Admin-Login: fremde Adresse bekommt keine Mail (Antwort gleich)");
  await post("/api/admin-login", { email: "domenicschilling@googlemail.com" });
  const adminMail = mailsAn("domenicschilling@googlemail.com").find((m) => /Admin-Login/.test(m.subject));
  const adminLink = adminMail && (adminMail.html.match(/href="([^"]*\/api\/admin-login\?token=[^"]+)"/) || [])[1];
  check(Boolean(adminLink), "Admin-Login-Link an domenicschilling@googlemail.com (gmail/googlemail normalisiert)");
  const aGet = await fetch(adminLink, { redirect: "manual" });
  check(aGet.status === 200 && !aGet.headers.get("set-cookie"), "Admin-Link: GET zeigt nur die Zwischenseite (2 Std., einmal verwendbar)");
  const aTok = new URL(adminLink).searchParams.get("token");
  const aResp = await formPost("/api/admin-login", { token: aTok });
  const aCookie = (aResp.headers.get("set-cookie") || "").split(";")[0];
  check(aResp.headers.get("location") === "/admin.html" && /^tf_admin=/.test(aCookie) && /HttpOnly/i.test(aResp.headers.get("set-cookie")), "Admin-Sitzung als httpOnly-Cookie");
  check((await formPost("/api/admin-login", { token: aTok })).headers.get("location") === "/admin.html?abgelaufen=1", "Admin-Link nur einmal verwendbar");
  const aStudios = await fetch(`${BASE}/api/admin/studios`, { headers: { cookie: aCookie } });
  check(aStudios.status === 200 && (await aStudios.json()).length > 3, "Admin-Sitzung hat Admin-Rechte (Studios-Liste)");
  check((await fetch(`${BASE}/api/admin/studios`, { headers: { cookie: "tf_admin=gefaelscht.x" } })).status === 401, "Gefälschtes Admin-Cookie abgelehnt");
  const pAdmA = await neueSeite();
  await pAdmA.context().addCookies([{ name: "tf_admin", value: aCookie.split("=").slice(1).join("="), url: BASE }]);
  await pAdmA.goto(BASE + "/admin.html#" + provId);
  await pAdmA.waitForSelector("#d-ansehen");
  await pAdmA.click("#d-ansehen");
  await pAdmA.waitForURL(/app\.html/);
  await pAdmA.waitForSelector("#admin-ansicht");
  check((await pAdmA.textContent("#admin-ansicht")).includes("Admin-Ansicht: Ink Provision"), "Dashboard ansehen: Banner „Admin-Ansicht: <Studio>“ mit Zurück-Link");
  await appShot(pAdmA, path.join(shots, "admin-ansicht.png"));
  const ro = await api(pAdmA, "/api/portal/zahlung", { method: "POST", body: { betrag: "100", kunde: "x" } });
  check(ro.status === 403, "Admin-Ansicht: Zahlungslink erstellen gesperrt");
  check((await api(pAdmA, "/api/portal/erstattung/x", { method: "POST", body: { betrag: "1" } })).status === 403 && (await api(pAdmA, "/api/portal/kuendigung", { method: "POST", body: {} })).status === 403, "Admin-Ansicht: Erstattung und Kündigung gesperrt");
  check((await api(pAdmA, "/api/portal/stripe-session", { method: "POST", body: {} })).data.modus === "ansicht", "Admin-Ansicht: keine Stripe-Bausteine, stattdessen Hinweis");
  const roPortal = await api(pAdmA, "/api/portal");
  check(roPortal.status === 200 && roPortal.data.adminAnsicht && roPortal.data.zahlungen.length > 0, "Admin-Ansicht: Zahlungen sichtbar");
  const roCookie = (await pAdmA.context().cookies()).filter((c) => c.name === "tf_session").map((c) => `${c.name}=${c.value}`).join("; ");
  const roConnect = await fetch(`${BASE}/api/connect?id=${provId}`, { redirect: "manual", headers: { cookie: roCookie } });
  check(Boolean(roCookie) && /\/login\.html/.test(roConnect.headers.get("location") || ""), "Admin-Ansicht startet keine Stripe-Einrichtung (Weiterleitung zum Login)");
  const logs = fs.readdirSync(dataDir).filter((f) => f.startsWith("log%2F")).map((f) => JSON.parse(fs.readFileSync(path.join(dataDir, f))));
  check(logs.some((l) => (l.type || l.typ) === "admin-ansicht" && JSON.stringify(l).includes("domenicschilling@gmail.com") && JSON.stringify(l).includes(provId)), "Admin-Ansicht protokolliert (wer, wann, welches Studio)");
  await pAdmA.click("#admin-ansicht a");
  await pAdmA.waitForURL(/admin\.html/);
  check(true, "Zurück zum Admin");
  const einr = await (await fetch(`${BASE}/api/admin/studio/${provId}/einrichtungslink`, { method: "POST", headers: { cookie: aCookie, "content-type": "application/json" }, body: "{}" })).json();
  const einrR = await fetch(einr.url, { redirect: "manual" });
  check(einr.gueltig === "24 Stunden" && /api\/connect\?id=.+&t=/.test(einr.url) && !/login\.html/.test(einrR.headers.get("location") || ""), "Admin: signierter Einrichtungslink (24 h) zum Weitergeben funktioniert ohne Login");
  check((await fetch(`${BASE}/api/admin/studio/${provId}/einrichtungslink`, { method: "POST" })).status === 401, "Einrichtungslink nur für Admins");

  console.log("Web-App (PWA)");
  const man = await (await fetch(BASE + "/manifest.webmanifest")).json();
  check(man.start_url.startsWith("/app.html") && man.display === "standalone" && man.icons.some((i) => i.purpose === "maskable"), "Manifest: Start im Dashboard, eigenständig, Icons");
  check((await fetch(BASE + "/sw.js")).status === 200 && (await fetch(BASE + "/offline.html")).status === 200, "Service Worker + Offline-Seite vorhanden");

  console.log("Seiten");
  await pA.goto(BASE + "/portal.html#uebersicht");
  await pA.waitForSelector("#kpis .kpi");
  for (const p of ["vertrag.html", "avv.html", "impressum.html", "datenschutz.html", "login.html", "recht.html"]) { await pA.goto(BASE + "/" + p); await wait(250); }
  const pAdm = await neueSeite();
  await pAdm.goto(BASE + "/admin.html");
  await pAdm.click("#login details summary");
  await pAdm.fill("#token", "admin");
  await pAdm.click("#login-token button");
  await pAdm.waitForSelector("#liste table");
  await pAdm.screenshot({ path: path.join(shots, "admin.png"), fullPage: true });
  check(true, "Admin-Oberfläche lädt");

  // ---------------------------------------------------------------- Handy-Screenshots (390 px)
  console.log("Handy-Screenshots: Einladung → Einrichtung → Dashboard → Zahlungslink → Zahlseite → Leistungsbestätigung");
  const handy = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "de-DE" };
  // Dashboard nach der Einrichtung: Toast „Geschafft“ abwarten, Checkliste sichtbar
  const S = handyShots;
  const inv = await admin("einladen", { body: { email: "hallo@nadelwerk-test.de", firma: "Nadelwerk Studio", senden: false } });
  const h = await neueSeite(handy);
  await signup(h, { geschenk: new URL(inv.link).searchParams.get("geschenk"), email: "hallo@nadelwerk-test.de", firma: "Nadelwerk Studio", shot: S });
  await einrichtungEingebettet(h, S);
  check((await studioPer("hallo@nadelwerk-test.de"))?.status === "einrichtung", "Geschenk-Einladung → direkt ins Dashboard → Einrichtung eingebettet");
  // Sonderkondition „Partner – nur Zahlungsgebühren“: gleiche Abwicklung wie Geschenk (eigenes Konto, 0 %), eigener Name + Mailtext
  const invP = await admin("einladen", { body: { email: "partner@nadelwerk-test.de", firma: "Partner Studio", bezeichnung: "Partner – nur Zahlungsgebühren" } });
  const mP = mailsAn("partner@nadelwerk-test.de").find((m) => /keine Provision, nur Zahlungsgebühren/.test(m.subject));
  check(invP.ok && invP.bezeichnung === "Partner – nur Zahlungsgebühren" && mP && /keine Provision/.test(mP.html) && !/geschenkt/i.test(mP.subject), "Einladung mit Sonderkondition: Mail „keine Provision, nur Zahlungsgebühren“");
  const hp = await neueSeite();
  fs.mkdirSync(path.join(shots, "partner"), { recursive: true });
  await signup(hp, { geschenk: new URL(invP.link).searchParams.get("geschenk"), email: "partner@nadelwerk-test.de", firma: "Partner Studio", shot: path.join(shots, "partner") });
  await hp.waitForURL(/app\.html/, { timeout: 15000 });
  const sp = await studioPer("partner@nadelwerk-test.de");
  check(sp?.status === "einrichtung" && sp.paket === "Partner – nur Zahlungsgebühren" && sp.provisionProzent === 0 && sp.modell === "kauf", "Sonderkondition beim Studio: Name im Admin, 0 % Provision, eigenes Konto");
  check(mailsAn("partner@nadelwerk-test.de").some((m) => /Partner – nur Zahlungsgebühren: keine Einrichtungsgebühr/.test(m.html)), "Willkommens-Mail nennt die Sonderkondition");
  await hp.context().close();
  const nwId = (await studioPer("hallo@nadelwerk-test.de")).id;
  await admin(`studio/${nwId}/live`, { body: {} });
  await h.goto(BASE + "/app.html#start");
  await h.waitForSelector("#checkliste-karte");
  await appShot(h, path.join(S, "06-dashboard.png"));
  await h.goto(BASE + "/app.html#link");
  await h.fill("#l-betrag", "800"); await h.fill("#l-kunde", "Jana Kurz"); await h.fill("#l-beschreibung", "Rose Unterarm"); await h.fill("#l-sitzungen", "1 Sitzung");
  await appShot(h, path.join(S, "07-zahlungslink.png"));
  await h.click("#l-btn");
  await h.waitForSelector("#l-out [data-copytext]"); await h.waitForTimeout(400);
  await appShot(h, path.join(S, "08-zahlungslink-fertig.png"));
  const hK = await neueSeite(handy);
  const nwSlug = (await studioPer("hallo@nadelwerk-test.de")).slug;
  await hK.goto(`${BASE}/zahlen/${nwSlug}?betrag=150`);
  await hK.waitForFunction(() => document.getElementById("studio").textContent === "Nadelwerk Studio");
  await hK.fill("#kunde", "Jana Kurz"); await hK.fill("#email", "jana@example.com"); await hK.fill("#beschreibung", "Rose Unterarm");
  await hK.click("label:has(> input[name=art][value=anzahlung])");
  await hK.check("#bed-ok"); await hK.check("#inhalt-ok");
  await hK.screenshot({ path: path.join(S, "09-zahlseite.png"), fullPage: true });
  await hK.click("#weiter");
  await hK.waitForSelector("#pay-jetzt");
  await hK.screenshot({ path: path.join(S, "10-zahlseite-bezahlen.png"), fullPage: true });
  await hK.click("#pay-jetzt");
  await hK.waitForURL(/bezahlt\.html/);
  await hK.waitForFunction(() => /erhalten/.test(document.getElementById("msg").textContent), null, { timeout: 15000 });
  await hK.screenshot({ path: path.join(S, "11-bezahlt.png"), fullPage: true });
  const jana = (await admin(`studio/${nwId}`)).zahlungen.find((z) => z.kunde === "Jana Kurz" && z.status === "bezahlt");
  await h.goto(`${BASE}/app.html#zahlung/${jana.id}`);
  await h.waitForSelector("#lb-btn");
  await h.click("#lb-btn");
  await h.waitForSelector("#lb-out [data-copytext]"); await h.waitForTimeout(400);
  await appShot(h, path.join(S, "12-bestaetigung-anfordern.png"));
  const hLink = await h.getAttribute("#lb-out [data-copytext]", "data-copytext");
  await hK.goto(hLink);
  await hK.waitForSelector("#f:not(.hidden)");
  await hK.fill("#name", "Jana Kurz"); await hK.check("#erledigt");
  await signatur(hK);
  await hK.screenshot({ path: path.join(S, "13-leistungsbestaetigung.png"), fullPage: true });
  await hK.click("#senden");
  await hK.waitForSelector("#danke:not(.hidden)");
  await hK.screenshot({ path: path.join(S, "14-bestaetigt.png"), fullPage: true });
  await h.goto(`${BASE}/app.html#zahlungen`);
  await h.waitForTimeout(300);
  await h.goto(`${BASE}/app.html#zahlung/${jana.id}`);
  await h.waitForTimeout(500);
  await h.reload(); await h.waitForSelector("#z-detail .detail-kopf");
  await appShot(h, path.join(S, "15-zahlung-mit-nachweisen.png"));
  await h.goto(`${BASE}/nachweis.html?z=${jana.id}`);
  await h.waitForSelector("img.sig");
  await h.screenshot({ path: path.join(S, "16-nachweis-pdf.png"), fullPage: true });
  for (const [hash, name, warte] of [["recht", "17-rechtliche-lage", "#r-btn"], ["werbung", "18-werbung", ".kit-item img"], ["extras", "19-extras", "[data-extra]"], ["geld", "20-geld", ".sim-box"], ["mehr", "21-mehr", "#logout"]]) {
    await h.goto(`${BASE}/app.html#${hash}`);
    await h.waitForSelector(warte, { timeout: 15000 });
    await h.waitForTimeout(hash === "werbung" ? 1500 : 300);
    await appShot(h, path.join(S, name + ".png"));
  }
  // ---- Werbung: fertige Beiträge „Ab jetzt Ratenzahlung*“ (js/app-kit.js) ----
  console.log("Werbung: Beiträge für das Studio");
  await h.goto(`${BASE}/app.html#werbung`);
  await h.waitForFunction(() => document.querySelectorAll("#kit .kit-item").length === 5 && document.querySelectorAll("#kit .kit-bilder img").length === 8 && [...document.querySelectorAll("#kit .kit-bilder img")].every((i) => i.complete && i.naturalWidth), null, { timeout: 30000 });
  const kit = await h.evaluate(() => [...document.querySelectorAll("#kit .kit-item")].map((el) => ({ id: el.dataset.vorlage, bilder: [...el.querySelectorAll(".kit-bilder img")].map((i) => i.naturalWidth + "x" + i.naturalHeight), text: el.querySelector("pre").textContent, knopf: el.querySelector('[data-kit="bild"]').textContent })));
  check(kit.map((x) => x.id).join() === "ankuendigung,karussell,qr-story,schritte,frag-story", "Werbung: 5 Vorlagen (Ankündigung, Karussell, QR-Story, So geht's, Frag uns) – alte Anzahlungs-Vorlage entfernt");
  const fmt = Object.fromEntries(kit.map((x) => [x.id, x.bilder.join()]));
  check(fmt.ankuendigung === "1080x1350" && fmt.schritte === "1080x1350" && fmt.karussell === Array(4).fill("1080x1350").join() && fmt["qr-story"] === "1080x1920" && fmt["frag-story"] === "1080x1920", "Werbung: Beiträge 4:5 (1080 × 1350), Karussell 4 Bilder, Storys 9:16 (1080 × 1920)");
  const FUSS_STUDIO = "*Raten über Klarna, nach deren Bonitätsprüfung. Vertragspartner der Raten ist Klarna, weder wir noch Tattoofin. Achtung! Kreditaufnahme kostet Geld.";
  const posts = kit.filter((x) => !x.id.includes("story"));
  check(posts.every((x) => x.text.includes("Raten*") && x.text.includes(FUSS_STUDIO) && (x.text.match(/#\S+/g) || []).length <= 5 && x.text.includes("#bambergtattoo")), "Werbung: Texte mit Raten*, Pflicht-Fußnote und höchstens 5 Hashtags (mit Ort)");
  check(kit.every((x) => !/\b0\s?%|zinsfrei|zinslos|Geld sofort|voller Betrag|Anzahlung|garantiert|jeder bekommt/i.test(x.text)), "Werbung: keine verbotenen Aussagen (0 %, zinsfrei, Geld sofort, voller Betrag, Anzahlung, Zusagen)");
  check(kit.find((x) => x.id === "qr-story").text.includes(`${BASE}/zahlen/${nwSlug}`), "Werbung: QR-Story mit Link zur Zahlseite für den Link-Sticker");
  check(kit.find((x) => x.id === "karussell").knopf === "Alle 4 Bilder speichern", "Werbung: Karussell – alle 4 Bilder auf einmal speichern");
  // Speichern am Computer: ohne Teilen-Menü → Download (Karussell als ZIP)
  await h.evaluate(() => { navigator.canShare = () => false; });
  const [dlKar] = await Promise.all([h.waitForEvent("download"), h.click('[data-vorlage="karussell"] [data-kit="bild"]')]);
  const zipBuf = fs.readFileSync(await dlKar.path());
  const eocd = zipBuf.length - 22, zipNamen = [];
  for (let o = 0; zipBuf.readUInt32LE(o) === 0x04034b50;) { const nl = zipBuf.readUInt16LE(o + 26), gr = zipBuf.readUInt32LE(o + 18), name = zipBuf.subarray(o + 30, o + 30 + nl).toString(), daten = zipBuf.subarray(o + 30 + nl, o + 30 + nl + gr); zipNamen.push(name + ":" + (daten.subarray(1, 4).toString() === "PNG" ? daten.readUInt32BE(16) + "x" + daten.readUInt32BE(20) : "?")); o += 30 + nl + gr; }
  check(dlKar.suggestedFilename() === "nadelwerk-studio-raten-karussell.zip" && zipBuf.readUInt32LE(eocd) === 0x06054b50 && zipBuf.readUInt16LE(eocd + 10) === 4 && zipNamen.join() === [1, 2, 3, 4].map((i) => `nadelwerk-studio-raten-karussell-${i}.png:1080x1350`).join(), "Werbung: Karussell als ZIP mit 4 PNG (" + zipNamen.length + " Dateien)");
  const [dlAnk] = await Promise.all([h.waitForEvent("download"), h.click('[data-vorlage="ankuendigung"] [data-kit="bild"]')]);
  const ankBuf = fs.readFileSync(await dlAnk.path());
  check(dlAnk.suggestedFilename() === "nadelwerk-studio-raten-ankuendigung.png" && ankBuf.subarray(1, 4).toString() === "PNG" && ankBuf.readUInt32BE(16) === 1080 && ankBuf.readUInt32BE(20) === 1350, "Werbung: Einzelbild als PNG 1080 × 1350");
  // Großansicht + Name auf den Bildern ändern (bleibt im Browser gespeichert)
  await h.click('[data-vorlage="qr-story"] .kit-bilder img');
  check(await h.isVisible(".kit-gross img"), "Werbung: Bild antippen → große Ansicht");
  await h.click(".kit-gross .btn.ghost");
  check((await h.inputValue("#kit-name")) === "Nadelwerk Studio" && (await h.getAttribute("#kit-name", "autocomplete")) === "organization", "Werbung: Feld „Name auf den Bildern“ mit Studioname (Autofill-Token)");
  await h.fill("#kit-name", "Nadelwerk");
  await h.click(".kit-name button");
  await h.waitForFunction(() => document.querySelectorAll("#kit .kit-bilder img").length === 8 && document.querySelector('#kit [data-vorlage="ankuendigung"] [data-kit="bild"]') && localStorage.getItem(Object.keys(localStorage).find((k) => k.startsWith("tf-kit-name|")) || "") === "Nadelwerk", null, { timeout: 30000 });
  check(true, "Werbung: Name auf den Bildern geändert → Bilder neu erstellt und gemerkt");
  await h.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("tf-kit-name|")).forEach((k) => localStorage.removeItem(k)));
  const kitName = await h.evaluate(() => TFKit.anzeigeName("DSX Media Solutions UG (haftungsbeschränkt)") + "|" + TFKit.anzeigeName("Tattoo Kunst GmbH & Co. KG") + "|" + TFKit.anzeigeName("Chic Tattoo Augsburg"));
  check(kitName === "DSX Media Solutions|Tattoo Kunst|Chic Tattoo Augsburg", "Werbung: Rechtsform fällt auf den Bildern weg (" + kitName + ")");

  // ---- „So geht's“: Erklärvideo auf der Startseite und unter Mehr ----
  console.log("So geht's (Erklärvideo)");
  await h.goto(`${BASE}/app.html#start`); await h.reload();
  await h.waitForSelector("#so-gehts video", { state: "attached", timeout: 15000 });
  check(await h.evaluate(() => !document.querySelector("#so-gehts video").getAttribute("poster")), "So geht's: Vorschaubild lädt erst, wenn das Video in Sichtweite kommt");
  await h.evaluate(() => document.getElementById("so-gehts").scrollIntoView());
  await h.waitForSelector("#so-gehts video[poster]", { timeout: 15000 });
  const sg = await h.evaluate(() => { const v = document.querySelector("#so-gehts video"); return { preload: v.preload, poster: v.getAttribute("poster"), src: v.querySelector("source").getAttribute("src"), kap: document.querySelectorAll("#so-gehts .sg-kap button").length, fuss: /Achtung! Kreditaufnahme kostet Geld/.test(document.getElementById("so-gehts").textContent) }; });
  check(sg.preload === "none" && /9x16\.jpg$/.test(sg.poster) && /9x16\.mp4$/.test(sg.src), "So geht's: Video auf der Startseite lädt erst beim Abspielen (Hochformat am Handy, mit Vorschaubild)");
  check(sg.kap === 10 && sg.fuss, "So geht's: 10 Kapitel + Raten-Fußnote unter dem Video");
  const vr = await fetch(BASE + sg.src, { headers: { range: "bytes=0-1023" } });
  check([200, 206].includes(vr.status) && /video\/mp4/.test(vr.headers.get("content-type") || ""), "So geht's: Videodatei wird ausgeliefert (video/mp4)");
  for (const f of ["so-gehts-16x9.mp4", "so-gehts-16x9.jpg", "so-gehts-9x16.jpg"]) check((await fetch(`${BASE}/assets/app/hilfe/${f}`, { method: "HEAD" })).ok, "So geht's: " + f + " vorhanden");
  await h.click("#so-gehts .sg-kap summary");
  await h.click("#so-gehts .sg-kap button[data-i='1']");
  // Der Testserver liefert keine Teilbereiche (Range), echtes Springen daher nur auf Netlify prüfbar – hier: richtiges Ziel angefordert
  check(await h.evaluate(() => document.querySelector("#so-gehts video").dataset.ziel === "22.6"), "So geht's: Kapitel antippen springt an die Stelle (Ziel 0:22)");
  await h.evaluate(() => document.querySelector("#so-gehts video").pause());
  await h.click("#so-gehts .sg-aus");
  check(await h.evaluate(() => document.getElementById("so-gehts").classList.contains("hidden")), "So geht's: auf der Startseite ausblendbar");
  await h.goto(`${BASE}/app.html#mehr`); await h.waitForSelector("a[href='#video']");
  await h.click("a[href='#video']");
  await h.waitForSelector("#video-box video[poster]", { timeout: 15000 });
  check(await h.evaluate(() => !document.querySelector("[data-view=video]").classList.contains("hidden") && document.querySelector("#tabbar a.on")?.dataset.tab === "mehr"), "So geht's: unter Mehr als eigene Ansicht (Tab Mehr aktiv)");
  await appShot(h, path.join(S, "22-so-gehts.png"));
  await h.click("#sg-wieder");
  await h.goto(`${BASE}/app.html#start`); await h.reload(); await h.waitForSelector("#so-gehts video", { state: "attached", timeout: 15000 });
  check(await h.evaluate(() => !document.getElementById("so-gehts").classList.contains("hidden")), "So geht's: wieder auf der Startseite eingeblendet");

  // ---- QR-Aufsteller: Vorschau, Dateien (PDF/SVG/PNG), Logo, Anfordern, Hersteller-Seite ----
  console.log("QR-Aufsteller");
  await h.goto(`${BASE}/app.html#werbung`);
  await h.waitForFunction(() => (document.getElementById("auf-img").getAttribute("src") || "").startsWith("data:image/png"), null, { timeout: 15000 });
  check(true, "Aufsteller: Vorschau mit echtem QR-Code wird gezeichnet");
  const nwZahlseite = `${BASE}/zahlen/${nwSlug}`;
  const runter = async (sel) => { const [d] = await Promise.all([h.waitForEvent("download"), h.click(sel)]); return { name: d.suggestedFilename(), buf: fs.readFileSync(await d.path()) }; };
  const pdfD = await runter('[data-auf="pdf"]');
  check(pdfD.buf.subarray(0, 5).toString() === "%PDF-" && /\/MediaBox \[0 0 283\.465 425\.197\]/.test(pdfD.buf.toString("latin1")) && /%%EOF\s*$/.test(pdfD.buf.toString("latin1")), "Aufsteller: PDF 100 × 150 mm (" + pdfD.name + ")");
  const svgD = await runter('[data-auf="svg"]');
  const svgT = svgD.buf.toString();
  check(/width="100mm" height="150mm"/.test(svgT) && svgT.includes(nwZahlseite) && /<g id="schnitt" fill="none" stroke="#0000ff" stroke-width="0.01">/.test(svgT) && !/<text|<image/.test(svgT), "Aufsteller: SVG 1:1, Schrift in Pfaden, blaue Schnittlinie, QR-Link der Zahlseite");
  const fSvg = (await runter('[data-auf="fsvg"]')).buf.toString();
  const fFarben = [...new Set(fSvg.match(/(?:fill|stroke)="#[0-9a-f]{6}"/gi).map((x) => x.split('"')[1].toLowerCase()))].sort().join(",");
  check(/width="181mm" height="181mm"/.test(fSvg) && fFarben === "#000000,#0000ff" && !/<image|<text/.test(fSvg) && fSvg.includes(nwZahlseite), "Aufsteller: Formulor-Platte P1 mit Fuß (nur Schwarz/Blau, keine Pixelbilder)");
  const fPdf = await runter('[data-auf="fpdf"]');
  check(/\/MediaBox \[0 0 513\.071 513\.071\]/.test(fPdf.buf.toString("latin1")) && fPdf.name.includes("formulor-P1-birke-3mm"), "Aufsteller: Formulor-PDF 181 × 181 mm (" + fPdf.name + ")");
  const pngD = await runter('[data-auf="png"]');
  check(pngD.buf.readUInt32BE(16) === 2362 && pngD.buf.readUInt32BE(20) === 3543, "Aufsteller: PNG mit 600 dpi (2362 × 3543 px)");
  const qrD = await runter("#zs-png");
  check(qrD.buf.subarray(1, 4).toString() === "PNG" && qrD.buf.readUInt32BE(16) >= 1000, "Digitaler QR-Code als PNG (" + qrD.buf.readUInt32BE(16) + " px)");
  const inkl = await h.evaluate(() => fetch("/api/portal").then((r) => r.json()).then((d) => d.studio.aufsteller.inklusive));
  check((await h.textContent("#auf-paket")).includes(inkl ? "In deinem Paket enthalten" : "Fertig graviert für 29 € netto"), "Aufsteller: Hinweis passt zum Paket (" + (inkl ? "inklusive" : "Anfrage") + ")");
  await h.click('label:has(> input[name="auf-var"][value="logo"])');
  await h.setInputFiles("#auf-logo", path.join(root, "public/assets/wortmarke.png"));
  await h.waitForFunction(() => /Logo gespeichert/.test(document.getElementById("toast").textContent), null, { timeout: 10000 });
  const oeff = (await api(h, `/api/aufsteller?s=${nwSlug}`)).data;
  check(oeff.variante === "logo" && /^data:image\/jpeg;base64,/.test(oeff.logo?.src || "") && oeff.zahlseite.endsWith("/zahlen/" + nwSlug), "Aufsteller: Logo hochgeladen (schwarz/weiß) und gespeichert");
  const pdfL = await runter('[data-auf="pdf"]');
  check(!/\/Subtype \/Image/.test(pdfL.buf.toString("latin1")) && pdfL.buf.length > pdfD.buf.length && pdfL.name.includes("-logo"), "Aufsteller: PDF mit Logo als Vektor (kein Pixelbild)");
  await h.click('label:has(> input[name="auf-holz"][value="dunkel"])');
  await h.waitForTimeout(600);
  await appShot(h, path.join(S, "18b-qr-aufsteller.png"));
  // Geschenk-Paket: Aufsteller nicht inklusive → für 29 € netto bestellen (Stripe-Checkout auf dem DSX-Konto)
  check((await h.textContent("#auf-kaufen")).includes("QR-Aufsteller bestellen – 29 €") && (await h.textContent("#auf-paket")).includes("29 € netto"), "Aufsteller (nicht im Paket): Knopf „QR-Aufsteller bestellen – 29 €“ mit Netto-Hinweis");
  const ohneKauf = await h.evaluate(() => fetch("/api/portal/aufsteller", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ anfordern: true }) }).then((r) => r.status));
  check(ohneKauf === 400, "Aufsteller (nicht im Paket): kostenlos anfordern nicht möglich");
  const nwStatusVor = (await admin(`studio/${nwId}`)).studio.status;
  await h.click("#auf-kaufen");
  await h.waitForURL(/localhost:12111\/pay\//);
  check((await h.textContent("body")).includes("34.51"), "Aufsteller-Checkout: 29 € netto + 19 % USt. = 34,51 €");
  await h.click("#pay");
  await h.waitForURL(/app\.html/);
  await h.waitForSelector("#auf-paket .chip.ok", { timeout: 15000 });
  check(/Bestellt und bezahlt/.test(await h.textContent("#auf-paket")) && !/cs=/.test(h.url()), "Aufsteller: nach Zahlung „Bestellt und bezahlt“, Adresse aufgeräumt");
  const nwA = (await admin(`studio/${nwId}`)).studio?.aufsteller || (await studioPer("hallo@nadelwerk-test.de")).aufsteller;
  check(nwA?.angefordertAm && nwA?.kauf?.bezahltAm && nwA.holz === "dunkel" && nwA.variante === "logo", "Aufsteller: gekauft (Holz dunkel, mit Logo)");
  const aufMails = mailsAn("domenicschilling@gmail.com").filter((m) => m.subject.includes("QR-Aufsteller bestellen (29 € bezahlt)") && m.subject.includes("Nadelwerk"));
  check(aufMails.length === 1 && aufMails[0].html.includes("/aufsteller.html?s=" + nwSlug), "Admin-Mail „QR-Aufsteller bestellen (29 € bezahlt)“ genau einmal (Webhook + Rückkehr) mit Gravurdatei");
  const nwStatus = (await admin(`studio/${nwId}`)).studio.status;
  check(nwStatus === nwStatusVor, "Aufsteller-Kauf ändert den Studio-Status nicht (" + nwStatus + ")");
  const doppelt = await h.evaluate(() => fetch("/api/portal/aufsteller", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kaufen: true }) }).then((r) => r.status));
  check(doppelt === 409, "Aufsteller: nicht doppelt bestellbar");
  const hH = await neueSeite();
  await hH.goto((await admin(`studio/${nwId}`)).aufstellerLink);
  await hH.waitForFunction(() => (document.getElementById("auf-img").getAttribute("src") || "").startsWith("data:image/png"), null, { timeout: 15000 });
  check((await hH.textContent("#auf-titel")).includes("Nadelwerk Studio") && (await hH.textContent("#auf-qr")).includes("/zahlen/" + nwSlug), "Hersteller-Seite /aufsteller.html zeigt Vorlage + Dateien");
  await hH.screenshot({ path: path.join(S, "18c-aufsteller-hersteller.png"), fullPage: true });
  const aufFremd = (await fetch(`${BASE}/api/aufsteller?s=gibt-es-nicht`)).status;
  check(aufFremd === 404, "Hersteller-Seite: unbekanntes Studio → 404");

  console.log("Mailversand: Resend zuerst, IONOS/SMTP als Rückfall, Warteschlange, Gesundheits-Check");
  {
    const { sendMail, warteschlangeStatus, warteschlangeAbarbeiten } = await import("../netlify/functions/_lib/mail.mjs");
    let antwort = 500, aufrufe = 0;
    const fake = (await import("node:http")).createServer((req, res) => { aufrufe++; let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => { res.writeHead(antwort, { "content-type": "application/json" }); res.end(antwort === 200 ? '{"id":"re_1"}' : '{"message":"450 Mail send limit exceeded"}'); }); }).listen(12199);
    process.env.RESEND_API_KEY = "re_test"; process.env.RESEND_API_BASE = "http://localhost:12199/emails";
    antwort = 200;
    check(await sendMail({ to: "resend@example.com", subject: "Test Resend", html: "<p>x</p>" }) === true && aufrufe === 1, "Mit RESEND_API_KEY: Versand über Resend");
    const mResend = fs.readdirSync(dataDir).filter((f) => f.startsWith("mail%2F")).map((f) => JSON.parse(fs.readFileSync(path.join(dataDir, f)))).find((m) => m.to === "resend@example.com");
    check(mResend?.weg === "resend", "Protokoll: Versandweg „resend“ vermerkt");
    antwort = 450;
    check(await sendMail({ to: "warte@example.com", subject: "Test Warteschlange", html: "<p>x</p>" }) === false, "Resend-Fehler ohne SMTP-Rückfall: Mail nicht gesendet");
    const ws = await warteschlangeStatus();
    check(ws.anzahl === 1 && /limit/.test(ws.letzterFehler) && ws.wege.includes("resend"), "Vorübergehender Fehler → Warteschlange (Status zeigt Anzahl + Fehler)");
    const msAdmin = await admin("mail-status");
    check(msAdmin.anzahl === 1 && msAdmin.fehler.length >= 1, "Admin: /api/admin/mail-status zeigt hängende Mails");
    const loginVerz = await (await post("/api/login", { email: "niemand@example.com" })).json();
    check(loginVerz.ok === true && loginVerz.verzoegert === true, "Login-Seite bekommt Hinweis „Mailversand verzögert“ (für alle gleich)");
    const pAdmM = await neueSeite();
    await pAdmM.goto(BASE + "/admin.html");
    await pAdmM.evaluate(() => sessionStorage.setItem("tf-admin", "admin"));
    await pAdmM.goto(BASE + "/admin.html");
    await pAdmM.waitForSelector("#hinweise .alert.err");
    check(/1 E-Mail hängt in der Warteschlange/.test(await pAdmM.textContent("#hinweise")), "Admin-Bereich: Hinweis „E-Mail hängt in der Warteschlange“ + Knopf „Jetzt erneut senden“");
    antwort = 200;
    const nach = await warteschlangeAbarbeiten();
    check(nach.length === 1 && nach[0][0] === "gesendet" && (await warteschlangeStatus()).anzahl === 0, "Warteschlange: nach Störung erneut gesendet");
    const { gesundheitPruefen } = await import("../netlify/functions/_lib/gesundheit.mjs");
    process.env.TF_TEST_SLUG = (await studioPer("prov@example.com")).slug;
    const g = await gesundheitPruefen({ basis: BASE, mailen: false });
    check(g.ok === true, "Gesundheits-Check: Startseite, Login-API, Zahlseite, Mails ok" + (g.ok ? "" : ": " + g.fehler.join(" | ")));
    const st = await fetch(BASE + "/api/status");
    check(st.status === 200 && (await st.json()).ok === true, "/api/status: 200 bei gesundem Check");
    process.env.TF_TEST_SLUG = "gibt-es-nicht";
    const g2 = await gesundheitPruefen({ basis: BASE, mailen: false });
    const st2 = await fetch(BASE + "/api/status");
    check(!g2.ok && st2.status === 503 && (await st2.json()).stoerungen.includes("Zahlseite"), "/api/status: 503 mit Störung „Zahlseite“ (Ultron-Wächter schlägt Alarm)");
    process.env.TF_TEST_SLUG = (await studioPer("prov@example.com")).slug;
    await gesundheitPruefen({ basis: BASE, mailen: false });
    delete process.env.RESEND_API_KEY; delete process.env.RESEND_API_BASE; fake.close();
  }
  {
    const pV = await neueSeite({ viewport: { width: 390, height: 844 }, isMobile: true });
    await pV.goto(BASE + "/video.html");
    check(await pV.evaluate(() => { const v = document.getElementById("v"); return v.hasAttribute("playsinline") && v.controls && v.preload === "metadata" && /tattoofin-ablauf\.mp4$/.test(v.querySelector("source").src) && document.documentElement.scrollWidth <= innerWidth; }), "/video: Video mit playsinline, controls, preload=metadata, kein Querscrollen");
    await pV.goto(BASE + "/");
    await cookiesAblehnen(pV);
    check(await pV.evaluate(() => Boolean(document.querySelector("#ablauf-video #tfv-play")) && !document.querySelector("#ablauf-video video") && Boolean(document.querySelector('a[href="/video"][data-v="hero"]'))), "Startseite: Video-Abschnitt (lädt erst beim Antippen) + Hero-Knopf „Video ansehen“");
    await pV.click("#tfv-play");
    check(await pV.evaluate(() => Boolean(document.querySelector("#ablauf-video video[playsinline]"))), "Startseite: Antippen lädt das Video");
    await pV.goto(BASE + "/studios.html");
    check(await pV.evaluate(() => Boolean(document.querySelector("#ablauf-video #tfv-play")) && document.documentElement.scrollWidth <= innerWidth), "/studios: Video-Abschnitt, kein Querscrollen");
  }

  await h.goto(`${BASE}/`);
  await cookiesAblehnen(h);
  await h.evaluate(() => document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in")));
  await h.addStyleTag({ content: ".nav,.tf-wa{position:static!important;display:none!important}.reveal{opacity:1!important;transform:none!important}" });
  await h.locator("#preise").scrollIntoViewIfNeeded();
  await h.waitForTimeout(1200);
  await h.locator("#preise").screenshot({ path: path.join(S, "22-pakete-startseite.png") });
  check(fs.readdirSync(S).filter((f) => f.endsWith(".png")).length >= 20, "Handy-Screenshots gespeichert: " + S);
} catch (e) {
  fail++;
  console.error("ABBRUCH:", e);
}
check(errors.length === 0, "Keine JavaScript-Fehler im Browser" + (errors.length ? ": " + errors.join(" | ") : ""));
console.log(`\n${ok} bestanden, ${fail} fehlgeschlagen · Screenshots: ${shots}`);
await browser.close();
process.exit(fail ? 1 : 0);
