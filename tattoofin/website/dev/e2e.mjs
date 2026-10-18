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
await startDev({ port: PORT, mock: true, dataDir, quiet: true });

let ok = 0, fail = 0;
const check = (cond, name) => { if (cond) { ok++; console.log("  ✓", name); } else { fail++; console.log("  ✗", name); } };
const admin = (p, opts = {}) => fetch(`${BASE}/api/admin/${p}`, { method: opts.body ? "POST" : "GET", ...opts, headers: { Authorization: "Bearer admin", "content-type": "application/json" }, body: opts.body ? JSON.stringify(opts.body) : undefined }).then((r) => r.json());
const mailsAn = (to) => fs.readdirSync(dataDir).filter((f) => f.startsWith("mail%2F")).map((f) => JSON.parse(fs.readFileSync(path.join(dataDir, f)))).filter((m) => [].concat(m.to).includes(to));
const linkAus = (m, re) => (m.html.match(re) || [])[1]?.replace(/&amp;/g, "&");
const mock = (p, opts) => fetch("http://localhost:12111/" + (opts ? "" : "mock/") + p, opts).then((r) => r.json());
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const post = (url, b, cookie) => fetch(BASE + url, { method: "POST", headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(b) });
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

async function signup(p, { paket, email, firma, code, zahlart, geschenk, gruender, shot }) {
  await p.goto(`${BASE}/start.html?${geschenk ? "geschenk=" + geschenk : "paket=" + paket}`);
  await cookiesAblehnen(p);
  if (shot) await p.screenshot({ path: path.join(shot, "01-einladung.png"), fullPage: true });
  if (code) await p.fill("#aktionscode", code);
  if (zahlart) await p.check(`input[name=zahlart][value=${zahlart}]`, { force: true });
  if (paket === "studio") {
    await p.waitForSelector("#gruender:not(.hidden)");
    if (gruender) await p.check("#video-ok"); else await p.uncheck("#gruender-ja");
  }
  await p.click("section[data-step='1'] [data-next]");
  for (const [k, v] of Object.entries({ firma, inhaber: "Alex Muster", strasse: "Musterstr. 1", plz: "96047", ort: "Bamberg", email, telefon: "0151 1234567", studioTelefon: "0951 123456" })) await p.fill("#" + k, v);
  if (shot) await p.screenshot({ path: path.join(shot, "02-einladung-daten.png"), fullPage: true });
  await p.click("section[data-step='2'] [data-next]");
  await p.check("input[name=ak_alle]");
  await p.fill("#unterzeichner", "Alex Muster");
  await p.screenshot({ path: path.join(shot || shots, shot ? "03-einladung-vertrag.png" : `start-${paket || "geschenk"}-schritt3.png`), fullPage: true });
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
  console.log("Startseite: drei Pakete + Rechner");
  const p0 = await neueSeite();
  await p0.goto(BASE + "/");
  check((await p0.textContent("h1")).includes("leichter bezahlbar"), "Hero lädt");
  check(await p0.locator(".prices.drei .price").count() === 3, "Drei Pakete auf der Startseite");
  await p0.waitForFunction(() => document.getElementById("r-tipp").textContent.length > 0);
  check((await p0.textContent("#r-tipp")) === "Studio" && (await p0.textContent("#r-start")).includes("1.500"), "Rechner 15.000 €/Jahr: Start 1.500 €, empfohlen Studio (Gründer-Aktion)");
  await p0.locator("#volumen").evaluate((el) => { el.value = 40000; el.dispatchEvent(new Event("input")); });
  check((await p0.textContent("#r-tipp")) === "Profi", "Rechner 40.000 €/Jahr: Profi am günstigsten");
  check(await p0.isVisible("#gruender-band"), "Gründer-Aktion mit echtem Zähler sichtbar");
  await p0.waitForTimeout(1000);
  await p0.screenshot({ path: path.join(shots, "landing.png"), fullPage: true });

  // ---------------------------------------------------------------- A: Paket Start
  console.log("Paket Start: Abschluss → direkt ins Dashboard → eingebettete Einrichtung");
  const pA = await neueSeite();
  await signup(pA, { paket: "start", email: "prov@example.com", firma: "Ink Provision" });
  await einrichtungEingebettet(pA);
  check(true, "Nach dem Abschluss eingeloggt im Dashboard, Einrichtung eingebettet abgeschlossen");
  const mProv = mailsAn("prov@example.com");
  check(mProv.some((m) => m.subject.startsWith("Willkommen")) && mProv.some((m) => m.subject.includes("freigegeben")), "E-Mails: Willkommen + Konto freigegeben");
  const willkommen = mProv.find((m) => m.subject.startsWith("Willkommen"));
  check(/api\/auth\?token=[^"]+next=%2Fapp\.html%23einrichtung/.test(willkommen.html), "Willkommens-Mail führt mit Login direkt in die Einrichtung im Dashboard");
  let state = await mock("state");
  const provAcct = Object.values(state.accounts).find((a) => a.email === "prov@example.com");
  check(provAcct?.type === "express" && provAcct?.capabilities?.klarna_payments?.requested === "true", "Paket Start: Express-Konto mit Karte + Klarna");
  check(state.accountSessions.some((s) => s.account === provAcct.id) === false, "Simulation: keine echte Account Session nötig");

  // ---------------------------------------------------------------- B: Paket Profi
  console.log("Paket Profi (Kauf) mit Aktionscode");
  const pB = await neueSeite();
  await signup(pB, { paket: "profi", email: "kauf@example.com", firma: "Ink Kauf", code: "RATENJA" });
  await pB.waitForURL(/localhost:12111\/pay\//);
  check((await pB.textContent("body")).includes("1486.31"), "Stripe-Betrag 1.249 € netto + 19 % = 1.486,31 €");
  await pB.click("#pay");
  await einrichtungEingebettet(pB);
  check(mailsAn("kauf@example.com").some((m) => m.subject.includes("Zahlung erhalten")), "E-Mail: Zahlung erhalten; danach direkt ins Dashboard");

  console.log("Rechnung, Abbruch, Fehlerfälle");
  const pC = await neueSeite();
  await signup(pC, { paket: "profi", email: "rechnung@example.com", firma: "Ink Rechnung", zahlart: "rechnung" });
  await pC.waitForURL(/app\.html/, { timeout: 15000 });
  check((await studioPer("rechnung@example.com"))?.status === "zahlung_offen", "Rechnung offen, trotzdem schon im Dashboard");
  check(mailsAn("rechnung@example.com").some((m) => m.subject.includes("Rechnung")), "E-Mail: Rechnung");
  const pC2 = await neueSeite();
  await signup(pC2, { paket: "profi", email: "abbruch@example.com", firma: "Ink Abbruch" });
  await pC2.waitForURL(/localhost:12111\/pay\//);
  await pC2.click("#cancel");
  await pC2.waitForURL(/start\.html\?resume=/);
  await pC2.waitForFunction(() => document.getElementById("firma").value === "Ink Abbruch");
  check(true, "Nach Abbruch sind Angaben wieder da");
  const basis = { firma: "x", inhaber: "x", strasse: "x", plz: "1", ort: "x", telefon: "1", studioTelefon: "1", unterzeichner: "x", akzeptiert: { vertrag: true, avv: true, unternehmer: true } };
  check((await post("/api/signup", { ...basis, paket: "start", email: "kauf@example.com" })).status === 409, "Doppelte Anmeldung abgelehnt");
  check((await post("/api/signup", { paket: "profi", email: "neu@example.com" })).status === 400, "Signup ohne Pflichtangaben abgelehnt");

  // ---------------------------------------------------------------- D: Paket Studio + Gründer
  console.log("Paket Studio: Gründer-Aktion (0 € Einrichtung, Video-Einwilligung), 7 %");
  check((await post("/api/signup", { ...basis, paket: "studio", gruender: true, email: "ohnevideo@example.com" })).status === 400, "Gründer-Aktion ohne Video-Einwilligung abgelehnt");
  const pD = await neueSeite();
  await signup(pD, { paket: "studio", email: "studio@example.com", firma: "Ink Studio", gruender: true });
  await einrichtungEingebettet(pD);
  const dStudio = await admin(`studio/${(await studioPer("studio@example.com")).id}`);
  check(dStudio.studio.paket === "studio" && dStudio.studio.provisionProzent === 7 && dStudio.studio.preisNetto === 0 && dStudio.studio.gruender?.videoEinwilligung === true, "Studio gespeichert: Paket Studio, 7 %, 0 € Einrichtung, Video-Einwilligung mit Text");
  check((await (await fetch(BASE + "/api/signup?pakete=1")).json()).gruender.vergeben === 1, "Gründer-Zähler zählt echte Anmeldungen (1 von 10)");
  const studioOhne = await (await post("/api/signup", { ...basis, paket: "studio", email: "studio2@example.com", zahlart: "sofort" })).json();
  state = await mock("state");
  const csStudio = Object.values(state.sessions).find((s) => s.metadata?.typ === "setup");
  check(/localhost:12111\/pay\//.test(studioOhne.url) && Number(csStudio?.line_items?.[0]?.price_data?.unit_amount) === 29900, "Paket Studio ohne Gründer-Platz: 299 € netto Einrichtung über Checkout");

  // ---------------------------------------------------------------- E: Notlösung ohne Einbettung
  console.log("Notlösung: ohne öffentlichen Stripe-Schlüssel wie bisher zu Stripe weiterleiten");
  process.env.TF_EINBETTEN = "aus";
  const fb = await post("/api/signup", { ...basis, paket: "start", email: "fallback@example.com" });
  const fbId = (await studioPer("fallback@example.com")).id;
  const fbConnect = await fetch(`${BASE}/api/connect?id=${fbId}`, { redirect: "manual" });
  check(fb.status === 200 && /localhost:12111\/onboard\//.test(fbConnect.headers.get("location") || ""), "Ohne Einbettung: Stripe-Onboarding per Weiterleitung");
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

  // ---------------------------------------------------------------- L: Profi + Studio-Satz
  console.log("Profi: keine Provision, Zahlung direkt auf dem eigenen Konto; Studio: 7 %");
  const kaufId = (await studioPer("kauf@example.com")).id;
  await admin(`studio/${kaufId}/live`, { body: {} });
  const rKauf = await api(pB, "/api/portal/zahlung", { method: "POST", body: { betrag: "1000", kunde: "Kim" } });
  check(rKauf.data.zahlung?.gebuehrBruttoCent === 0, "Profi: Zahlungslink ohne Plattformgebühr");
  const kaufAcct = Object.values((await mock("state")).accounts).find((a) => a.email === "kauf@example.com");
  check(kaufAcct?.type === "standard", "Profi: eigenes Standard-Konto");
  const rKim = await (await post("/api/pay", { z: rKauf.data.zahlung.id, inhaltOk: true })).json();
  const piKim = (await mock("state")).paymentIntents[rKim.clientSecret.split("_secret_")[0]];
  check(rKim.stripeAccount === kaufAcct.id && piKim.account === kaufAcct.id && !piKim.application_fee_amount, "Profi: Bezahlfeld direkt auf dem Studio-Konto (Direct Charge, Stripe-Account), keine Gebühr für Tattoofin");
  const studioId = (await studioPer("studio@example.com")).id;
  await admin(`studio/${studioId}/live`, { body: {} });
  const rStudio = await api(pD, "/api/portal/zahlung", { method: "POST", body: { betrag: "1000", kunde: "Sam" } });
  check(rStudio.data.zahlung?.gebuehrBruttoCent === 7000, "Paket Studio: 1.000 € → 70 € Tattoofin (7 %), 930 € an das Studio");

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
  check((await pA.textContent("body")).includes("Entwurf") && (await pA.textContent("body")).includes("Bestätigung beim Bezahlen"), "Nachweis-Seite (PDF) mit beiden Stufen und Entwurfs-Hinweis");
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
  await pA.click('[data-extra="gutscheine"]');
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
  const redir = await fetch(`${BASE}/api/auth?token=${encodeURIComponent(new URL(loginUrl).searchParams.get("token"))}&next=//evil.com`, { redirect: "manual" });
  check(redir.headers.get("location") === "/app.html", "Kein offener Redirect (Standardziel: Dashboard)");
  const blocked = await post("/api/pay", { s: (await studioPer("rechnung@example.com")).slug, betrag: "500", kunde: "x", inhaltOk: true });
  check(blocked.status === 409, "Studio ohne freigegebenes Konto kann nicht kassieren");

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
  await pAdm.fill("#token", "admin");
  await pAdm.click("#login button");
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
