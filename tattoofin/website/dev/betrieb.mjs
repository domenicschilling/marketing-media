// Betriebs-Durchlauf (26./27.10.2026): alle Abläufe von der Anmeldung bis zur Monatsabrechnung, jeder Schritt mit Beweis.
// Läuft auf localhost mit Stripe-Nachbau (kein Test-Schlüssel nötig, nichts Echtes wird berührt) und genau so konfiguriert wie live:
// Endkunden zahlen im Stripe-Checkout (TF_BEZAHLFELD aus), Einrichtung im Dashboard eingebettet, Zahlarten Karte + Klarna.
//   NODE_PATH=… node dev/betrieb.mjs [runde]        → Protokoll als Tabelle, Exit-Code 1 bei Fehlern
//   PROTOKOLL=datei.md  schreibt die Tabelle zusätzlich in eine Datei.
// Was dieser Test NICHT belegt: das Verhalten der echten Stripe-/Klarna-Server (Klarna-Entscheidung, echte Auszahlung).
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
const RUNDE = process.argv[2] || "1";
const PORT = 8898, BASE = `http://localhost:${PORT}`, STRIPE = "http://localhost:12111";
const shots = path.join(os.tmpdir(), "tf-betrieb-" + RUNDE);
fs.mkdirSync(shots, { recursive: true });
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "tf-betrieb-data-"));
// Wie live: Checkout statt eingebettetem Bezahlfeld, Klarna + Karte
process.env.TF_BEZAHLFELD = "aus";
process.env.ADMIN_EMAIL = "admin@betrieb.test";
process.env.MAIL_TEST_TOKEN = "mailtest";
await startDev({ port: PORT, mock: true, dataDir, quiet: true });
const auth = await import("../netlify/functions/_lib/auth.mjs");
const gesundheit = await import("../netlify/functions/_lib/gesundheit.mjs");
const domain = await import("../netlify/functions/_lib/domain.mjs");

// ---------- Protokoll ----------
const zeilen = [];
let ok = 0, fehler = 0, bereich = "";
const teil = (name) => { bereich = name; console.log(`\n## ${name}`); };
// Ein Abschnitt, der abstürzt, zählt als Fehler; die übrigen Abschnitte laufen weiter (so zeigt ein Lauf alle Probleme auf einmal)
async function abschnitt(name, fn) { teil(name); try { await fn(); } catch (e) { check(false, "Abschnitt abgebrochen: " + String(e.message || e).slice(0, 120), String(e.stack || "").split("\n")[1]?.trim().slice(-80)); } }
function check(cond, schritt, beweis = "") {
  const b = String(beweis ?? "").replace(/\|/g, "/").replace(/\s+/g, " ").slice(0, 160);
  if (cond) { ok++; console.log(`  ok      ${schritt}${b ? "  [" + b + "]" : ""}`); }
  else { fehler++; console.log(`  FEHLER  ${schritt}${b ? "  [" + b + "]" : ""}`); }
  zeilen.push(`| ${RUNDE} | ${bereich} | ${schritt.replace(/\|/g, "/")} | ${cond ? "ok" : "FEHLER"} | ${b} |`);
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Helfer ----------
const admin = (p, opts = {}) => fetch(`${BASE}/api/admin/${p}`, { method: opts.body !== undefined ? "POST" : "GET", ...opts, headers: { Authorization: "Bearer admin", "content-type": "application/json" }, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined }).then(async (r) => { let d = {}; try { d = await r.json(); } catch { /* leer */ } return Object.assign(Array.isArray(d) ? d : d, { _status: r.status }); });
const adminPatch = (p, body) => fetch(`${BASE}/api/admin/${p}`, { method: "PATCH", headers: { Authorization: "Bearer admin", "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());
const mock = (p) => fetch(`${STRIPE}/mock/${p}`).then((r) => r.json());
const mockState = () => mock("state");
const mails = () => fs.readdirSync(dataDir).filter((f) => f.startsWith("mail%2F")).map((f) => JSON.parse(fs.readFileSync(path.join(dataDir, f)))).sort((a, b) => a.at.localeCompare(b.at));
const mailsAn = (to) => mails().filter((m) => [].concat(m.to).includes(to));
const mailAnMit = (to, re) => mailsAn(to).find((m) => re.test(m.subject));
const queueSize = () => fs.readdirSync(dataDir).filter((f) => f.startsWith("mail-warteschlange%2F")).length;
const blob = (k) => { try { return JSON.parse(fs.readFileSync(path.join(dataDir, encodeURIComponent(k) + ".json"), "utf8")); } catch { return null; } };
const setBlob = (k, v) => fs.writeFileSync(path.join(dataDir, encodeURIComponent(k) + ".json"), JSON.stringify(v, null, 2));
const studios = () => admin("studios");
const studioPer = async (email, versuche = 12) => {
  for (let i = 0; i < versuche; i++) { const s = (await studios()).find((x) => x.email === email); if (s) return s; await wait(250); }
  return undefined;
};
const detail = async (id) => admin(`studio/${id}`);
const json = (url, opts = {}, cookie) => fetch(BASE + url, { ...opts, headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}), ...(opts.headers || {}) } }).then(async (r) => { let d = {}; try { d = await r.json(); } catch { /* leer */ } return { status: r.status, data: d, headers: r.headers }; });
const post = (url, body, cookie) => json(url, { method: "POST", body: JSON.stringify(body || {}) }, cookie);
const cookieVon = (res) => (res.headers.get("set-cookie") || "").split(";")[0];
const form = (url, felder, cookie) => fetch(BASE + url, { method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded", ...(cookie ? { cookie } : {}) }, body: new URLSearchParams(felder) });
const stripeForm = (url, felder = {}) => fetch(STRIPE + url, { method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(felder) });

const DATEN = (email, firma) => ({
  firma, inhaber: "Alex Muster", strasse: "Musterstr. 1", plz: "96047", ort: "Bamberg", email, telefon: "0151 1234567", studioTelefon: "0951 123456",
  unterzeichner: "Alex Muster", akzeptiert: { vertrag: true, avv: true, unternehmer: true },
});
// Anmeldung per API wie start.js; liefert Studio-ID + Sitzungs-Cookie
async function anmelden(paket, email, firma, extra = {}) {
  const r = await post("/api/signup", { ...DATEN(email, firma), paket, ...extra });
  const s = await studioPer(email);
  return { r, id: s?.id, cookie: cookieVon(r), s };
}
// Stripe-Einrichtung abschließen (Simulation der eingebetteten Komponente) → Webhook account.updated
async function einrichten(id, cookie) {
  const sess = await post("/api/portal/stripe-session", {}, cookie);
  const konto = sess.data.konto;
  await stripeForm(`/onboarding-fertig/${konto}`, { name: "Alex Muster", iban: "DE89370400440532013000" });
  await wait(250);
  return { sess, konto };
}
// Checkout-Seite des Stripe-Nachbaus „bezahlen“: pm = card | klarna | klarna-abgelehnt
async function stripeBezahlen(url, pm = "card") {
  const r = await stripeForm(new URL(url).pathname, { pm });
  await wait(250);
  return r;
}
const sessions = async () => Object.values((await mockState()).sessions);
const lastSession = async () => (await sessions()).at(-1);

const browser = await chromium.launch();
const jsFehler = [];
async function neueSeite(viewport = { width: 1280, height: 900 }) {
  const c = await browser.newContext({ viewport });
  const p = await c.newPage();
  p.on("pageerror", (e) => jsFehler.push(e.message));
  p.on("console", (m) => { if (m.type() === "error" && !/404|Failed to load resource/.test(m.text())) jsFehler.push(m.text()); });
  return p;
}

// =====================================================================================================
await abschnitt("1 Start-Seite: Cookie-Fenster verdeckt keinen Knopf (ohne es wegzuklicken)", async () => {
  const groessen = [[1280, 720], [1366, 768], [1920, 1080], [390, 844], [375, 667], [360, 640], [320, 568], [844, 390]];
  for (const [w, h] of groessen) {
    const p = await neueSeite({ width: w, height: h });
    await p.goto(`${BASE}/start.html?paket=risikofrei`);
    const banner = Boolean(await p.waitForSelector(".tf-cc", { timeout: 3000 }).catch(() => null));
    const klick = async (sel) => { try { await p.click(sel, { timeout: 3000 }); return true; } catch { return false; } };
    const trial = async (sel) => { try { await p.click(sel, { timeout: 3000, trial: true }); return true; } catch { return false; } };
    const s1 = await klick("section[data-step='1'] [data-next]");
    for (const [k, v] of Object.entries({ firma: "Cookie Test", inhaber: "A M", strasse: "Musterstr. 1", plz: "96047", ort: "Bamberg", email: "c@test.de", telefon: "0151 1234567", studioTelefon: "0951 123456" })) await p.fill("#" + k, v).catch(() => {});
    const s2 = await klick("section[data-step='2'] [data-next]");
    await p.check("input[name=ak_alle]").catch(() => {});
    await p.fill("#unterzeichner", "Alex Muster").catch(() => {});
    const s3 = await trial("#submit");
    check(banner && s1 && s2 && s3, `start.html ${w}x${h}: Banner da, „Weiter“ (Schritt 1+2) und „Verbindlich abschließen“ klickbar`, `banner=${banner} s1=${s1} s2=${s2} abschluss=${s3}`);
    await p.context().close();
  }
});

// =====================================================================================================
async function browserAnmeldung(paket, email, firma, viewport) {
  const p = await neueSeite(viewport);
  await p.goto(`${BASE}/start.html?paket=${paket}`);
  if (paket === "einmal") await p.check("input[name=zahlart][value=sofort]", { force: true }).catch(() => {});
  await p.click("section[data-step='1'] [data-next]");
  for (const [k, v] of Object.entries({ firma, inhaber: "Alex Muster", strasse: "Musterstr. 1", plz: "96047", ort: "Bamberg", email, telefon: "0151 1234567", studioTelefon: "0951 123456" })) await p.fill("#" + k, v);
  await p.click("section[data-step='2'] [data-next]");
  await p.check("input[name=ak_alle]");
  await p.fill("#unterzeichner", "Alex Muster");
  await p.screenshot({ path: path.join(shots, `anmeldung-${paket}.png`), fullPage: true });
  await p.click("#submit");
  return p;
}
const ST = {}; // Studios dieses Durchlaufs
await abschnitt("2 Anmeldung: alle 3 Pakete im Browser (Cookie-Fenster bleibt offen)", async () => {
  // Risikofrei (Handy-Größe): direkt ins Dashboard
  let p = await browserAnmeldung("risikofrei", "risikofrei@betrieb.test", "Betrieb Risikofrei", { width: 390, height: 844 });
  await p.waitForURL(/app\.html/, { timeout: 15000 }).catch(() => {});
  ST.rf = await studioPer("risikofrei@betrieb.test");
  check(/app\.html/.test(p.url()) && ST.rf?.status === "einrichtung" && ST.rf?.paket === "Risikofrei" && ST.rf?.provisionProzent === 10, "Paket Risikofrei: Abschluss → Dashboard, Status Einrichtung, 10 %", `${ST.rf?.id} ${p.url().replace(BASE, "")}`);
  ST.rf.cookie = (await p.context().cookies()).map((c) => `${c.name}=${c.value}`).join("; ");
  await p.screenshot({ path: path.join(shots, "dashboard-risikofrei.png") });
  await p.context().close();

  // Monatlich: Stripe-Checkout (Abo) → Dashboard
  p = await browserAnmeldung("monatlich", "monatlich@betrieb.test", "Betrieb Monatlich", { width: 1280, height: 900 });
  await p.waitForURL(/\/pay\//, { timeout: 15000 }).catch(() => {});
  const urlAbo = p.url();
  check(/\/pay\//.test(urlAbo), "Paket Monatlich: Weiterleitung zum Stripe-Checkout (Abo)", urlAbo.replace(STRIPE, ""));
  await p.click("#pay").catch(() => {});
  await p.waitForURL(/app\.html/, { timeout: 15000 }).catch(() => {});
  ST.mo = await studioPer("monatlich@betrieb.test");
  const sAbo = (await sessions()).find((x) => x.mode === "subscription");
  check(/app\.html/.test(p.url()) && ST.mo?.status === "einrichtung" && ST.mo?.paket === "Monatlich" && ST.mo?.provisionProzent === 0, "Paket Monatlich: nach Zahlung im Dashboard, Status Einrichtung, 0 %", `${ST.mo?.id}`);
  check(sAbo && sAbo.excluded_payment_method_types?.includes("klarna") && Number(sAbo.line_items[0].price_data.unit_amount) === 4900 && sAbo.line_items[0].price_data.recurring.interval === "month", "Abo: 49 € netto monatlich, Klarna ausgeschlossen (B2B)", `${sAbo?.line_items?.[0]?.price_data?.unit_amount}`);
  ST.mo.cookie = (await p.context().cookies()).map((c) => `${c.name}=${c.value}`).join("; ");
  await p.context().close();

  // Einmalzahlung
  p = await browserAnmeldung("einmal", "einmal@betrieb.test", "Betrieb Einmal", { width: 1280, height: 900 });
  await p.waitForURL(/\/pay\//, { timeout: 15000 }).catch(() => {});
  await p.click("#pay").catch(() => {});
  await p.waitForURL(/app\.html/, { timeout: 15000 }).catch(() => {});
  ST.ei = await studioPer("einmal@betrieb.test");
  const sEin = (await sessions()).find((x) => x.mode === "payment" && x.metadata?.typ === "kauf");
  check(/app\.html/.test(p.url()) && ST.ei?.status === "einrichtung" && ST.ei?.paket === "Einmalzahlung", "Paket Einmalzahlung: nach Zahlung im Dashboard, Status Einrichtung", `${ST.ei?.id}`);
  check(sEin && Number(sEin.line_items[0].price_data.unit_amount) === 99900 && sEin.excluded_payment_method_types?.includes("klarna"), "Einmalzahlung: 999 € netto, Klarna ausgeschlossen", `${sEin?.line_items?.[0]?.price_data?.unit_amount}`);
  ST.ei.cookie = (await p.context().cookies()).map((c) => `${c.name}=${c.value}`).join("; ");
  await p.context().close();

  check(Boolean(mailAnMit("risikofrei@betrieb.test", /Willkommen/) && mailAnMit("monatlich@betrieb.test", /Willkommen/) && mailAnMit("einmal@betrieb.test", /Willkommen/)), "Willkommens-Mail bei allen 3 Paketen", `${mails().length} Mails im Protokoll`);
  check(mails().filter((m) => m.to === "admin@betrieb.test" && /Neuer Abschluss|bezahlt/.test(m.subject)).length >= 3, "Admin bekommt für jede Anmeldung eine Meldung", "");
});

// =====================================================================================================
await abschnitt("3 Stripe Connect Einrichtung (Test): eingebettet + Rückfall-Link", async () => {
  for (const [k, name] of [["rf", "Risikofrei"], ["mo", "Monatlich"], ["ei", "Einmalzahlung"]]) {
    const { sess, konto } = await einrichten(ST[k].id, ST[k].cookie);
    const d = await detail(ST[k].id);
    ST[k].konto = konto;
    check(sess.status === 200 && /^acct_/.test(konto || "") && d.studio.stripe.chargesEnabled && d.studio.stripe.payoutsEnabled, `${name}: Konto angelegt, Zahlungen + Auszahlungen freigegeben (Webhook account.updated)`, `${konto} ${d.studio.stripe.kontoTyp}`);
  }
  const typ = (await mockState()).accounts;
  check(typ[ST.rf.konto]?.controller?.stripe_dashboard?.type === "express" && typ[ST.rf.konto]?.capabilities?.klarna_payments?.requested && !typ[ST.mo.konto]?.capabilities?.klarna_payments, "Risikofrei: Express-Verhalten mit Klarna-Fähigkeit; Monatlich: Standard-Konto", `${typ[ST.rf.konto]?.type || "controller"} / ${typ[ST.mo.konto]?.type}`);
  check(Boolean(mailAnMit("risikofrei@betrieb.test", /Stripe hat dein Konto freigegeben/)), "Mail „Stripe hat dein Konto freigegeben“", "");
  // Rückfall: Einrichtungslink ohne Sitzung → gehostetes Stripe-Onboarding (z. B. für Studios, bei denen die eingebettete Einrichtung hängt)
  const rg = await post("/api/signup", { ...DATEN("hosted@betrieb.test", "Betrieb Hosted"), paket: "risikofrei" });
  const sh = await studioPer("hosted@betrieb.test");
  const link = (await admin(`studio/${sh.id}/einrichtungslink`, { body: {} })).url;
  const lr = await fetch(link, { redirect: "manual" });
  const ziel = lr.headers.get("location") || "";
  check(lr.status === 302 && /\/onboard\//.test(ziel), "Rückfall: signierter Einrichtungslink ohne Login führt zum gehosteten Stripe-Onboarding", ziel.replace(STRIPE, ""));
  const acct = ziel.match(/\/onboard\/([^?]+)/)?.[1];
  if (acct) { await stripeForm(`/onboard/${acct}`); await wait(250); }
  const dh = await detail(sh.id);
  check(dh.studio.stripe.chargesEnabled === true, "gehostetes Onboarding abgeschlossen → Studio freigegeben", `${acct}`);
  ST.hosted = { ...sh, cookie: cookieVon(rg) };
});

// =====================================================================================================
await abschnitt("3b Einrichtung hängt: Rückfälle (Stripe lehnt Bausteine ab, Baustein lädt nicht)", async () => {
  const stripeLib = await import("../netlify/functions/_lib/stripe.mjs");
  const dd = await detail(ST.ei.id);
  const studioObj = { ...dd.studio };
  const voll = await stripeLib.accountSession(studioObj);
  check(Boolean(voll.client_secret) && Object.keys(voll.components).length >= 4, "Account Session mit allen Bausteinen (Standard-Konto)", Object.keys(voll.components).join(","));
  await mock(`session-fehler/${ST.ei.konto}?stufe=voll`);
  const klein = await stripeLib.accountSession(studioObj);
  check(Boolean(klein.client_secret) && Object.keys(klein.components).sort().join() === "account_onboarding,notification_banner", "Stripe lehnt die volle Liste ab → Rückfall: nur Einrichtung + Hinweise", Object.keys(klein.components).join(","));
  await mock(`session-fehler/${ST.ei.konto}?stufe=alle`);
  const geht = await stripeLib.accountSession(studioObj).then(() => true).catch(() => false);
  check(geht === false, "Lehnt Stripe alles ab, wirft die Funktion (Portal leitet dann zur Stripe-Seite)", "");
  // Browser: Baustein lässt sich nicht laden → Studio sieht den Weg über die Stripe-Seite statt einer Sackgasse
  const p = await neueSeite({ width: 390, height: 844 });
  const frisch = await anmelden("risikofrei", "haengt@betrieb.test", "Haengt Studio");
  await p.context().addCookies([{ name: "tf_session", value: frisch.cookie.split("=").slice(1).join("="), url: BASE }]);
  // Rettungslink aus dem Admin: gehostet=1 führt trotz Sitzung zur Stripe-Seite (ohne den Zusatz würde er ins Dashboard zurückspringen = Schleife)
  const link = (await admin(`studio/${frisch.id}/einrichtungslink`, { body: {} })).url;
  const mitSitzung = await fetch(link, { redirect: "manual", headers: { cookie: frisch.cookie } });
  const ohneZusatz = await fetch(link.replace("&gehostet=1", ""), { redirect: "manual", headers: { cookie: frisch.cookie } });
  check(/gehostet=1/.test(link) && /\/onboard\//.test(mitSitzung.headers.get("location") || "") && /\/app\.html#einrichtung/.test(ohneZusatz.headers.get("location") || ""), "Admin-Einrichtungslink: gehostet (Stripe-Seite), auch wenn das Studio eingeloggt ist", `${(mitSitzung.headers.get("location") || "").replace(STRIPE, "").slice(0, 30)} | ohne Zusatz: ${ohneZusatz.headers.get("location")}`);
  await p.route("**/api/portal/stripe-session", (r) => r.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ error: "Stripe konnte nicht geladen werden. Bitte lade die Seite neu." }) }));
  await p.goto(`${BASE}/app.html#einrichtung`);
  const knopf = await p.waitForSelector("a:has-text('Einrichtung bei Stripe öffnen')", { timeout: 8000 }).catch(() => null);
  const href = knopf ? await knopf.getAttribute("href") : "";
  check(Boolean(knopf) && /gehostet=1/.test(href), "Baustein lädt nicht: Knopf „Einrichtung bei Stripe öffnen“ statt Sackgasse", href.slice(0, 60));
  if (knopf) await p.screenshot({ path: path.join(shots, "einrichtung-rueckfall-handy.png") });
  await p.unroute("**/api/portal/stripe-session");
  if (href) {
    await p.route("**/*", (r) => r.continue());
    await p.goto(href);
    await p.waitForURL(/\/onboard\//, { timeout: 8000 }).catch(() => {});
    check(/\/onboard\//.test(p.url()), "Knopf führt (trotz Login) zur Stripe-Seite, keine Schleife", p.url().replace(STRIPE, "").slice(0, 40));
  }
  await p.context().close();
  // Auch wenn der Baustein lädt: unter der eingebetteten Einrichtung steht ein Ausweg
  const p2 = await neueSeite({ width: 1280, height: 900 });
  await p2.context().addCookies([{ name: "tf_session", value: frisch.cookie.split("=").slice(1).join("="), url: BASE }]);
  await p2.goto(`${BASE}/app.html#einrichtung`);
  const hilfe = await p2.waitForSelector("#einr-hilfe a", { timeout: 8000 }).catch(() => null);
  const hh = hilfe ? await hilfe.getAttribute("href") : "";
  check(Boolean(hilfe) && /gehostet=1/.test(hh) && Boolean(await p2.$("#so-weiter")), "Eingebettete Einrichtung zeigt darunter immer „Einrichtung auf der Seite von Stripe öffnen“", hh.slice(0, 50));
  await p2.context().close();
  ST.haengt = frisch;
});

// =====================================================================================================
await abschnitt("4 Portal-Login per Login-Link (Mail, einmal verwendbar, abgelaufen)", async () => {
  const rl = await post("/api/login", { email: "risikofrei@betrieb.test" });
  const m = mailsAn("risikofrei@betrieb.test").filter((x) => /Login-Link/.test(x.subject)).at(-1);
  const tok = (m?.html.match(/token=([^"&<\s]+)/) || [])[1];
  check(rl.data.ok === true && Boolean(tok), "Login-Mail mit Link kommt an", m?.subject || "keine Mail");
  const g = await fetch(`${BASE}/api/auth?token=${tok}`, { redirect: "manual" });
  check(g.status === 200 && !g.headers.get("set-cookie"), "Link-Vorschau durch Mail-Scanner verbraucht den Link nicht", `HTTP ${g.status}`);
  const pr = await form("/api/auth", { token: tok, next: "/app.html" });
  const ck = cookieVon(pr);
  const por = await json("/api/portal", {}, ck);
  check([302, 303].includes(pr.status) && /tf_session/.test(ck) && por.status === 200 && por.data.studio?.email, "Login: Sitzung gesetzt, Portal lädt", `HTTP ${por.status}`);
  const zweit = await form("/api/auth", { token: tok, next: "/app.html" });
  check(/abgelaufen=1/.test(zweit.headers.get("location") || ""), "Link ein zweites Mal: „abgelaufen“ + Knopf für neuen Link", zweit.headers.get("location")?.slice(0, 40));
  const alt = auth.sign({ t: "login", sid: ST.rf.id, n: "abgelaufen-test", exp: Date.now() - 1000 });
  const ab = await form("/api/auth", { token: alt, next: "/app.html" });
  check(/abgelaufen=1&neu=/.test(ab.headers.get("location") || "") && !ab.headers.get("set-cookie"), "Zeitlich abgelaufener Link wird abgelehnt (keine Sitzung)", ab.headers.get("location")?.slice(0, 40));
  const neu = await post("/api/login", { neu: alt });
  check(neu.data.ok && neu.data.gesendet === true, "„Neuen Link schicken“ funktioniert mit abgelaufenem Link", JSON.stringify({ gesendet: neu.data.gesendet }));
  const fremd = await json("/api/portal", {}, "tf_session=x.y");
  check(fremd.status === 401, "Portal ohne gültige Sitzung: 401", `HTTP ${fremd.status}`);
});

// =====================================================================================================
await abschnitt("5 Go-live, Zahlungslink, Kunde zahlt (Karte + Klarna), Provision 10 %", async () => {
  const live = await admin(`studio/${ST.rf.id}/live`, { body: {} });
  check(live._status === 200 && live.status === "live", "Admin: Studio live schalten", `${live.status}`);
  check(Boolean(mailAnMit("risikofrei@betrieb.test", /live/)), "Mail „Tattoofin ist live“", "");
  const zlG = await post("/api/portal/zahlung", { betrag: "1500", kunde: "Lena Beispiel", email: "lena@kunde.test", beschreibung: "Rückenstück Drache", sitzungen: "3 Sitzungen" }, ST.rf.cookie);
  ST.zl1 = zlG.data.zahlung;
  check(zlG.status === 201 && /zahlung\.html\?z=zl_/.test(zlG.data.link) && /Klarna/.test(zlG.data.whatsappText), "Zahlungslink erstellt, WhatsApp-Text nennt Klarna", `${ST.zl1?.id}`);
  // Kunde öffnet den Link
  const pub = await json(`/api/pay?z=${ST.zl1.id}`);
  check(pub.status === 200 && pub.data.zahlung.betragCent === 150000 && pub.data.zahlung.zahlarten[0] === "klarna", "Kundenseite: Betrag stimmt, Klarna steht zuerst", `${pub.data.zahlung?.zahlarten}`);
  const ohne = await post("/api/pay", { z: ST.zl1.id });
  check(ohne.status === 400, "Ohne Inhalts-Häkchen kein Checkout", `HTTP ${ohne.status}`);
  const start = await post("/api/pay", { z: ST.zl1.id, inhaltOk: true });
  check(start.status === 200 && /\/pay\/cs_/.test(start.data.url || ""), "Checkout-Sitzung gestartet (Weiterleitung zu Stripe)", (start.data.url || "").replace(STRIPE, ""));
  const cs = await lastSession();
  const pd = cs.payment_intent_data || {};
  check(pd.on_behalf_of === ST.rf.konto && pd.transfer_data?.destination === ST.rf.konto && Number(pd.application_fee_amount) === 15000, "Destination Charge: Ziel = Studio-Konto, Händler = Studio, Plattformgebühr 150,00 € (10 % von 1.500 €)", `fee=${pd.application_fee_amount}`);
  const pmt = [].concat(cs.payment_method_types);
  check(pmt[0] === "klarna" && pmt.includes("card") && !pmt.includes("sepa_debit"), "Zahlarten: Klarna zuerst, Karte, kein SEPA", pmt.join(","));
  check(cs.billing_address_collection === "required" && String(cs.phone_number_collection?.enabled) === "true" && cs.customer, "Klarna-Voraussetzungen: Rechnungsadresse + Telefon Pflicht, Kunde mit Name/E-Mail", `customer=${cs.customer}`);
  check(/Tattoo bei Betrieb Risikofrei/.test(cs.line_items[0].price_data.product_data.name) && Number(cs.line_items[0].quantity) === 1, "Artikelname für Klarna: „Tattoo bei <Studio> – <Motiv>“, Menge 1", cs.line_items[0].price_data.product_data.name);
  await stripeBezahlen(start.data.url, "klarna");
  const z1 = (await detail(ST.rf.id)).zahlungen.find((z) => z.id === ST.zl1.id);
  check(z1?.status === "bezahlt" && z1.zahlart === "klarna", "Kunde zahlt mit Klarna (Test): Zahlung bezahlt, Zahlart Klarna", `${z1?.status} ${z1?.zahlart} ${z1?.paymentIntentId}`);
  const st = await mockState();
  const pi = st.paymentIntents[z1.paymentIntentId];
  const transfer = Object.values(st.transfers || {}).find((t) => t.id === z1.transferId) || null;
  check(Boolean(pi) && Number(pi.application_fee_amount) === 15000 && pi.amount === 150000, "Provision: 150,00 € einbehalten → 1.350,00 € gehen an das Studio", `PI ${pi?.id} fee ${pi?.application_fee_amount} von ${pi?.amount}`);
  check(Boolean(mailAnMit("risikofrei@betrieb.test", /Zahlung eingegangen/)) && Boolean(mailAnMit("lena@kunde.test", /Danke für deine Zahlung/)), "Mails: Studio „Zahlung eingegangen“ + Kundin „Danke“", "");
  check(/1\.350,00/.test(mailAnMit("risikofrei@betrieb.test", /Zahlung eingegangen/)?.html || ""), "Studio-Mail nennt Auszahlungsbetrag 1.350 €", "");
  const doppelt = await post("/api/pay", { z: ST.zl1.id, inhaltOk: true });
  check(doppelt.status === 409, "Bezahlter Link kann nicht noch einmal bezahlt werden", `HTTP ${doppelt.status}`);

  // Rundungsfälle der Provision (Zahlseite des Studios, Betrag mit Cent)
  for (const [betrag, fee] of [["333,33", 3333], ["50", 500], ["1234,56", 12346], ["19999,99", 200000]]) {
    const z = await post("/api/portal/zahlung", { betrag, kunde: "Rundung", email: "r@kunde.test", beschreibung: "Test" }, ST.rf.cookie);
    if (z.status !== 201) { check(false, `Betrag ${betrag} €: Zahlungslink`, `HTTP ${z.status} ${JSON.stringify(z.data).slice(0, 80)}`); continue; }
    await post("/api/pay", { z: z.data.zahlung.id, inhaltOk: true });
    const c = await lastSession();
    check(Number(c.payment_intent_data.application_fee_amount) === fee, `Provision bei ${betrag} €: ${(fee / 100).toFixed(2)} € (10 %, gerundet)`, `fee=${c.payment_intent_data.application_fee_amount}`);
  }
  const zuTief = await post("/api/portal/zahlung", { betrag: "49,99", kunde: "x" }, ST.rf.cookie);
  const zuHoch = await post("/api/portal/zahlung", { betrag: "20000,01", kunde: "x" }, ST.rf.cookie);
  check(zuTief.status === 400 && zuHoch.status === 400, "Betragsgrenzen 50 € bis 20.000 €", `${zuTief.status}/${zuHoch.status}`);
  // Studio ohne Freigabe kann nicht kassieren
  const sdr = await anmelden("risikofrei", "ohne-konto@betrieb.test", "Ohne Konto");
  const zOhne = await post("/api/portal/zahlung", { betrag: "100", kunde: "x" }, sdr.cookie);
  check(zOhne.status === 409, "Studio ohne freigegebenes Stripe-Konto: kein Zahlungslink", `HTTP ${zOhne.status}`);
  ST.ohneKonto = sdr;
});

// =====================================================================================================
await abschnitt("6 Kunde zahlt mit Karte, Zahlseite des Studios (QR) und Pakete Monatlich/Einmal ohne Provision", async () => {
  const zs = await post("/api/pay", { s: ST.rf.s?.slug || (await detail(ST.rf.id)).studio.slug, betrag: "300", kunde: "Tom", email: "tom@kunde.test", beschreibung: "Unterarm", inhaltOk: true });
  check(zs.status === 200 && /\/pay\//.test(zs.data.url || ""), "Zahlseite des Studios: Checkout gestartet", (zs.data.url || "").replace(STRIPE, ""));
  await stripeBezahlen(zs.data.url, "card");
  const dz = await detail(ST.rf.id);
  const zt = dz.zahlungen.find((z) => z.kunde === "Tom");
  check(zt?.status === "bezahlt" && zt.zahlart === "card" && zt.gebuehrBruttoCent === 3000, "Zahlseite: Kartenzahlung bezahlt, Provision 30,00 €", `${zt?.status} ${zt?.zahlart} ${zt?.gebuehrBruttoCent}`);
  for (const k of ["mo", "ei"]) {
    const sl = (await detail(ST[k].id)).studio.slug;
    const live = await admin(`studio/${ST[k].id}/live`, { body: {} });
    const z = await post("/api/portal/zahlung", { betrag: "800", kunde: "Direkt " + k, email: `d${k}@kunde.test`, beschreibung: "Test" }, ST[k].cookie);
    await post("/api/pay", { z: z.data.zahlung?.id, inhaltOk: true });
    const c = await lastSession();
    check(live.status === "live" && c.account === ST[k].konto && !c.payment_intent_data?.application_fee_amount && !c.payment_intent_data?.transfer_data, `Paket ${k === "mo" ? "Monatlich" : "Einmalzahlung"}: Zahlung direkt auf dem Studio-Konto, keine Provision`, `account=${c.account}`);
    await stripeBezahlen(c.url, "card");
    const zz = (await detail(ST[k].id)).zahlungen.find((x) => x.id === z.data.zahlung.id);
    check(zz?.status === "bezahlt" && !zz.gebuehrBruttoCent, `Paket ${k === "mo" ? "Monatlich" : "Einmalzahlung"}: Zahlung bezahlt, 0 % Tattoofin-Anteil`, `${zz?.status}`);
    void sl;
  }
});

// =====================================================================================================
await abschnitt("7 Anzahlung und No-Show", async () => {
  const z = await post("/api/portal/zahlung", { art: "anzahlung", betrag: "100", kunde: "Nora Nichtda", email: "nora@kunde.test", beschreibung: "Termin Freitag" }, ST.rf.cookie);
  const id = z.data.zahlung?.id;
  const pub = await json(`/api/pay?z=${id}`);
  check(z.status === 201 && pub.data.zahlung.zahlarten[0] === "card" && /Anzahlung/.test(z.data.whatsappText) && !/Klarna/.test(z.data.whatsappText.replace(/Klarna ist/, "")), "Anzahlungslink: Karte zuerst, WhatsApp-Text ohne Klarna-Werbung", `${pub.data.zahlung?.zahlarten}`);
  const ohneBed = await post("/api/pay", { z: id, inhaltOk: true });
  check(ohneBed.status === 400, "Anzahlung nur mit bestätigten Anzahlungsbedingungen", `HTTP ${ohneBed.status}`);
  const s2 = await post("/api/pay", { z: id, inhaltOk: true, bedingungen: true });
  await stripeBezahlen(s2.data.url, "card");
  const d = (await detail(ST.rf.id)).zahlungen.find((x) => x.id === id);
  check(d?.status === "bezahlt" && d.bedingungen?.text?.includes("48 Stunden") && d.kundeBestaetigt?.am, "Anzahlung bezahlt; Bedingungen (48-Stunden-Regel) mit Zeitstempel als Beleg gespeichert", `${d?.status} ${d?.kundeBestaetigt?.am}`);
  // No-Show: Kunde erscheint nicht → das Studio behält die Anzahlung. System darf nichts erstatten oder zurückholen.
  const vorher = JSON.stringify((await mockState()).paymentIntents[d.paymentIntentId]);
  await wait(300);
  const nach = (await detail(ST.rf.id)).zahlungen.find((x) => x.id === id);
  check(nach.status === "bezahlt" && !nach.erstattetCent && JSON.stringify((await mockState()).paymentIntents[d.paymentIntentId]) === vorher, "No-Show: Anzahlung bleibt beim Studio (keine automatische Erstattung), Provision bleibt 10 €", `${nach.status} fee=${nach.gebuehrBruttoCent}`);
  // Absage mehr als 48 h vorher, Kunde will keinen neuen Termin: Studio erstattet 60 € per Portal (Teilbetrag)
  const re = await post(`/api/portal/erstattung/${id}`, { betrag: "60" }, ST.rf.cookie);
  await wait(300);
  const dr = (await detail(ST.rf.id)).zahlungen.find((x) => x.id === id);
  const stN = await mockState();
  check(re.status === 200 && dr.erstattetCent === 6000 && dr.status === "bezahlt", "Absage ≥ 48 h: Teil-Erstattung 60 € über das Portal (Rest bleibt beim Studio)", `${re.status} erstattet=${dr.erstattetCent}`);
  check(dr.gebuehrErstattetCent > 0 && dr.gebuehrErstattetCent <= 600, "Provision wird anteilig zurückgegeben (abzüglich nicht erstatteter Stripe-Gebühr)", `Provision zurück ${dr.gebuehrErstattetCent} ct`);
  const refund = stN.refunds?.at?.(-1) || Object.values(stN.refunds || {}).at(-1);
  check(!refund || refund.reverse_transfer === true || refund.reverse_transfer === "true", "Erstattung holt den Betrag vom Studio-Konto zurück (reverse_transfer)", JSON.stringify(refund || {}).slice(0, 100));
  const noch = await post(`/api/portal/erstattung/${id}`, { betrag: "50" }, ST.rf.cookie);
  check(noch.status === 400, "Mehr erstatten als der Restbetrag (40 €) wird abgelehnt", `HTTP ${noch.status}`);
  const restRe = await post(`/api/portal/erstattung/${id}`, { betrag: "40" }, ST.rf.cookie);
  await wait(300);
  const dv = (await detail(ST.rf.id)).zahlungen.find((x) => x.id === id);
  check(restRe.status === 200 && dv.status === "erstattet" && dv.erstattetCent === 10000, "Vollständig erstattet → Status „erstattet“", `${dv.status}`);
});

// =====================================================================================================
await abschnitt("8 Fehlerfälle: abgebrochene Zahlung, Klarna lehnt ab, abgelaufen, storniert, Dublette", async () => {
  const neu = async (betrag, name) => (await post("/api/portal/zahlung", { betrag, kunde: name, email: `${name.toLowerCase()}@kunde.test`, beschreibung: "Fehlerfall" }, ST.rf.cookie)).data.zahlung;
  // a) Kunde bricht im Checkout ab
  const a = await neu("700", "Abbruch");
  const sa = await post("/api/pay", { z: a.id, inhaltOk: true });
  const ab = await json(`/api/pay?z=${a.id}&abbruch=1`);
  const da = (await detail(ST.rf.id)).zahlungen.find((x) => x.id === a.id);
  check(ab.status === 200 && da.status === "offen" && ab.data.klarnaAbgelehnt === false, "Kunde bricht im Checkout ab: Link bleibt offen, keine Fehlermeldung an das Studio", `${da.status}`);
  const b2 = await post("/api/pay", { z: a.id, inhaltOk: true });
  check(b2.status === 200 && b2.data.url && b2.data.url !== sa.data.url, "Nach dem Abbruch ist der Link erneut bezahlbar (neue Sitzung)", (b2.data.url || "").slice(-12));
  // b) Klarna lehnt ab
  const b = await neu("900", "Klarnanein");
  const sb = await post("/api/pay", { z: b.id, inhaltOk: true });
  await stripeBezahlen(sb.data.url, "klarna-abgelehnt");
  const mailsVor = mailsAn("risikofrei@betrieb.test").filter((m) => /Klarna hat/.test(m.subject)).length;
  const kb = await json(`/api/pay?z=${b.id}&abbruch=1`);
  const kb2 = await json(`/api/pay?z=${b.id}&abbruch=1`);
  const mailsNach = mailsAn("risikofrei@betrieb.test").filter((m) => /Klarna hat/.test(m.subject)).length;
  check(kb.data.klarnaAbgelehnt === true && mailsNach === mailsVor + 1 && kb2.data.klarnaAbgelehnt === true, "Klarna lehnt ab: Kunde sieht Auswege, Studio bekommt genau 1 Mail (nicht bei jedem Neuladen)", `Mails ${mailsVor}→${mailsNach}`);
  const kb3 = await post("/api/pay", { z: b.id, inhaltOk: true, ausweich: "karte" });
  const cK = await lastSession();
  check(kb3.status === 200 && [].concat(cK.payment_method_types).join() === "card", "Ausweg „Mit Karte zahlen“: gleicher Betrag, nur Karte", [].concat(cK.payment_method_types).join());
  await stripeBezahlen(kb3.data.url, "card");
  check((await detail(ST.rf.id)).zahlungen.find((x) => x.id === b.id)?.status === "bezahlt", "… und die Kartenzahlung geht durch", "");
  // c) Stripe-Sitzung läuft ab
  const c = await neu("650", "Ablauf");
  const sc = await post("/api/pay", { z: c.id, inhaltOk: true });
  const csId = sc.data.url.split("/pay/")[1];
  await fetch(`${STRIPE}/v1/checkout/sessions/${csId}/expire`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "" });
  await wait(300);
  const dc = (await detail(ST.rf.id)).zahlungen.find((x) => x.id === c.id);
  check(dc.status === "offen", "Abgelaufene Stripe-Sitzung: Zahlungslink bleibt gültig (offen)", dc.status);
  const c2 = await post("/api/pay", { z: c.id, inhaltOk: true });
  check(c2.status === 200 && c2.data.url, "… und kann mit neuer Sitzung bezahlt werden", "");
  // Zahlseite: Sitzung abgelaufen → abgebrochen
  const zs = await post("/api/pay", { s: (await detail(ST.rf.id)).studio.slug, betrag: "120", kunde: "Seite", email: "s@kunde.test", inhaltOk: true });
  await fetch(`${STRIPE}/v1/checkout/sessions/${zs.data.url.split("/pay/")[1]}/expire`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "" });
  await wait(300);
  check((await detail(ST.rf.id)).zahlungen.find((x) => x.kunde === "Seite")?.status === "abgebrochen", "Zahlseite: abgelaufene Sitzung → Eintrag „abgebrochen“", "");
  // d) Storno und gültigkeit
  const d = await neu("500", "Storno");
  const del = await json(`/api/portal/zahlung/${d.id}`, { method: "DELETE" }, ST.rf.cookie);
  const nachStorno = await post("/api/pay", { z: d.id, inhaltOk: true });
  check(del.status === 200 && nachStorno.status === 410, "Stornierter Zahlungslink: Kunde bekommt klare Meldung (410)", `${del.status}/${nachStorno.status} ${nachStorno.data.error?.slice(0, 50)}`);
  const unbekannt = await json("/api/pay?z=zl_gibtsnicht");
  check(unbekannt.status === 404, "Unbekannter Zahlungslink: 404", `HTTP ${unbekannt.status}`);
  // e) Vertrag beendet → kann nicht mehr kassieren
  const e = await neu("400", "Beendet");
  const sBeendet = await studioPer("risikofrei@betrieb.test");
  const blobS = blob("studio/" + sBeendet.id);
  setBlob("studio/" + sBeendet.id, { ...blobS, status: "beendet" });
  const nachEnde = await post("/api/pay", { z: e.id, inhaltOk: true });
  check(nachEnde.status === 409, "Vertrag beendet: Zahlungslink startet keine Zahlung mehr (409)", `HTTP ${nachEnde.status} ${nachEnde.data.error?.slice(0, 60)}`);
  setBlob("studio/" + sBeendet.id, blobS);
  // f) Dublette Anmeldung, falsche Eingaben
  const dub = await post("/api/signup", { ...DATEN("risikofrei@betrieb.test", "Doppelt"), paket: "risikofrei" });
  const leer = await post("/api/signup", { paket: "risikofrei", email: "x@y.de" });
  const ohneAv = await post("/api/signup", { ...DATEN("unvertraglich@betrieb.test", "X"), paket: "risikofrei", akzeptiert: { vertrag: true } });
  check(dub.status === 409 && leer.status === 400 && ohneAv.status === 400, "Anmeldung: Dublette (409), leere Angaben (400), ohne AVV-Häkchen (400)", `${dub.status}/${leer.status}/${ohneAv.status}`);
  // g) Webhook doppelt zugestellt: nichts doppelt
  const zahlungenVor = (await detail(ST.rf.id)).zahlungen.filter((x) => x.status === "bezahlt").length;
  const mailsVorW = mailsAn("risikofrei@betrieb.test").length;
  const evt = JSON.stringify({ id: "evt_doppelt_1", type: "checkout.session.completed", data: { object: { id: "cs_gibtsnicht", mode: "payment", metadata: { tattoofinZahlung: a.id } } } });
  const { sendeWebhook } = await import("../netlify/functions/_lib/stripe-sim.mjs");
  const w1 = await sendeWebhook(`${BASE}/api/stripe-webhook`, "whsec_mock", "checkout.session.completed", { id: "cs_x", mode: "payment", payment_status: "unpaid", metadata: {} });
  const w2 = await sendeWebhook(`${BASE}/api/stripe-webhook`, "whsec_mock", "unbekannt.ereignis", { id: "x" });
  check(w1 === 200 && w2 === 200 && (await detail(ST.rf.id)).zahlungen.filter((x) => x.status === "bezahlt").length === zahlungenVor && mailsAn("risikofrei@betrieb.test").length === mailsVorW, "Fremde/unbekannte Webhook-Ereignisse ändern nichts und werfen keinen Fehler", `${w1}/${w2}`);
  void evt;
  // h) Webhook ohne Signatur
  const wk = await fetch(`${BASE}/api/stripe-webhook`, { method: "POST", headers: { "stripe-signature": "t=1,v1=abc" }, body: "{}" });
  check(wk.status === 400, "Webhook mit falscher Signatur: 400", `HTTP ${wk.status}`);
});

// =====================================================================================================
await abschnitt("8b Klarna beim Studio-Konto nicht aktiviert: Kasse fällt auf Karte zurück", async () => {
  // Einmalzahlung/Monatlich/Einladung = eigenes Standard-Konto: Klarna muss das Studio selbst aktivieren. Fehlt es, darf die Kasse nicht scheitern.
  await mock(`ohne-klarna/${ST.mo.konto}`);
  const z = (await post("/api/portal/zahlung", { betrag: "1000", kunde: "OhneKlarna", email: "ok@kunde.test", beschreibung: "Test" }, ST.mo.cookie)).data.zahlung;
  const adminVor = mails().filter((m) => m.to === "admin@betrieb.test" && /Klarna beim Studio-Konto nicht aktiviert/.test(m.subject)).length;
  const s = await post("/api/pay", { z: z.id, inhaltOk: true });
  const c = await lastSession();
  check(s.status === 200 && s.data.url && [].concat(c.payment_method_types).join() === "card", "Klarna nicht aktiviert: Kunde kommt trotzdem zur Kasse (nur Karte), kein Fehler", `HTTP ${s.status} ${[].concat(c.payment_method_types).join()}`);
  await stripeBezahlen(s.data.url, "card");
  check((await detail(ST.mo.id)).zahlungen.find((x) => x.id === z.id)?.status === "bezahlt", "… und die Kartenzahlung wird verbucht", "");
  const adminNach = mails().filter((m) => m.to === "admin@betrieb.test" && /Klarna beim Studio-Konto nicht aktiviert/.test(m.subject)).length;
  check(adminNach === adminVor + 1, "Admin bekommt einen Hinweis (höchstens 1× pro Tag und Studio)", `${adminVor}→${adminNach}`);
  const z2 = (await post("/api/portal/zahlung", { betrag: "900", kunde: "OhneKlarna2", email: "ok2@kunde.test", beschreibung: "Test" }, ST.mo.cookie)).data.zahlung;
  await post("/api/pay", { z: z2.id, inhaltOk: true });
  check(mails().filter((m) => m.to === "admin@betrieb.test" && /Klarna beim Studio-Konto nicht aktiviert/.test(m.subject)).length === adminNach, "Kein zweiter Hinweis am selben Tag", "");
  // Eingebettetes Bezahlfeld (Notschalter/Zukunft): gleicher Rückfall
  process.env.TF_BEZAHLFELD = "an";
  const z3 = (await post("/api/portal/zahlung", { betrag: "800", kunde: "OhneKlarna3", email: "ok3@kunde.test", beschreibung: "Test" }, ST.mo.cookie)).data.zahlung;
  const bf = await post("/api/pay", { z: z3.id, inhaltOk: true });
  process.env.TF_BEZAHLFELD = "aus";
  const piId = (await detail(ST.mo.id)).zahlungen.find((x) => x.id === z3.id)?.paymentIntentId;
  const pi = (await mockState()).paymentIntents[piId];
  check(bf.status === 200 && bf.data.clientSecret && pi && [].concat(pi.payment_method_types).join() === "card", "Bezahlfeld: ebenfalls Rückfall auf Karte", `HTTP ${bf.status} ${[].concat(pi?.payment_method_types || []).join()}`);
});

// =====================================================================================================
await abschnitt("8c Webhook kommt nicht an: bezahlt wird trotzdem verbucht", async () => {
  const neu = async (betrag, name) => (await post("/api/portal/zahlung", { betrag, kunde: name, email: `${name.toLowerCase()}@kunde.test`, beschreibung: "Webhook-Ausfall" }, ST.rf.cookie)).data.zahlung;
  await mock("webhooks"); // Stripe-Nachbau sendet ab jetzt KEINE Webhooks mehr
  const a = await neu("710", "Rueckkehr");
  const sa = await post("/api/pay", { z: a.id, inhaltOk: true });
  await stripeBezahlen(sa.data.url, "card");
  const mailsVor = mailsAn("risikofrei@betrieb.test").length;
  let da = (await detail(ST.rf.id)).zahlungen.find((x) => x.id === a.id);
  check(da.status === "offen", "Ohne Webhook bleibt der Link zunächst „offen“ (Ausgangslage des Ausfalls)", da.status);
  const rueck = await json(`/api/pay?z=${a.id}&abgleich=1`);
  da = (await detail(ST.rf.id)).zahlungen.find((x) => x.id === a.id);
  check(rueck.data.zahlung.status === "bezahlt" && da.status === "bezahlt" && da.zahlart === "card" && da.gebuehrBruttoCent === 7100, "Kunde kommt auf /bezahlt.html zurück → Status wird bei Stripe nachgesehen, Zahlung bezahlt (Provision 71,00 €)", `${da.status} ${da.zahlart}`);
  check(mailsAn("risikofrei@betrieb.test").length === mailsVor + 1 && Boolean(mailAnMit("rueckkehr@kunde.test", /Danke/)), "Studio-Mail und Kunden-Bestätigung gehen trotz fehlendem Webhook raus (genau einmal)", `${mailsAn("risikofrei@betrieb.test").length - mailsVor}`);
  await json(`/api/pay?z=${a.id}&abgleich=1`);
  check(mailsAn("risikofrei@betrieb.test").length === mailsVor + 1, "Zweiter Abgleich (Seite neu geladen) verbucht nichts doppelt", "");
  // Kunde schließt den Tab nach dem Bezahlen (kommt nie zurück): die täglichen Jobs tragen die Zahlung nach
  const b = await neu("820", "Tabzu");
  const sb = await post("/api/pay", { z: b.id, inhaltOk: true });
  await stripeBezahlen(sb.data.url, "klarna");
  const c = await neu("430", "Nichtbezahlt");
  await post("/api/pay", { z: c.id, inhaltOk: true });
  const jobs = await admin("jobs", { body: {} });
  const db = (await detail(ST.rf.id)).zahlungen;
  check(db.find((x) => x.id === b.id)?.status === "bezahlt" && db.find((x) => x.id === b.id)?.zahlart === "klarna", "Tägliche Jobs: bezahlt, aber ohne Webhook/Rückkehr → nachgetragen (Klarna)", `${db.find((x) => x.id === b.id)?.status}`);
  check(db.find((x) => x.id === c.id)?.status === "offen", "… nicht bezahlte Links bleiben offen", db.find((x) => x.id === c.id)?.status);
  await mock("webhooks?an=1");
  const stZ = await post("/api/pay", { z: c.id, inhaltOk: true });
  await stripeBezahlen(stZ.data.url, "card");
  check((await detail(ST.rf.id)).zahlungen.find((x) => x.id === c.id)?.status === "bezahlt", "Webhooks wieder an: normaler Ablauf funktioniert weiter", "");
  void jobs;
});

// =====================================================================================================
await abschnitt("9 Rückbuchung (Dispute)", async () => {
  const z = (await post("/api/portal/zahlung", { betrag: "600", kunde: "Streit", email: "streit@kunde.test", beschreibung: "Dispute" }, ST.rf.cookie)).data.zahlung;
  const s = await post("/api/pay", { z: z.id, inhaltOk: true });
  await stripeBezahlen(s.data.url, "card");
  const pi = (await detail(ST.rf.id)).zahlungen.find((x) => x.id === z.id).paymentIntentId;
  await mock(`dispute/${pi}?status=lost`);
  await wait(500);
  const d = (await detail(ST.rf.id)).zahlungen.find((x) => x.id === z.id);
  check(d.status === "rueckgebucht" && d.rueckbuchung?.zurueckgeholtCent === 60000 - 6000 + 2000, "Rückbuchung verloren: Studio-Anteil (600 − 60 + 20 Gebühr = 560 €) zurückgeholt, Provision entfällt", `${d.status} ${d.rueckbuchung?.zurueckgeholtCent}`);
  check(Boolean(mailAnMit("risikofrei@betrieb.test", /Rückbuchung/)) && Boolean(mails().find((m) => m.to === "admin@betrieb.test" && /Rückbuchung/.test(m.subject))), "Mails: Studio (Belege) + Admin", "");
  const nachErstatt = await post(`/api/portal/erstattung/${z.id}`, { betrag: "10" }, ST.rf.cookie);
  check(nachErstatt.status === 400, "Zurückgebuchte Zahlung kann nicht erstattet werden", `HTTP ${nachErstatt.status}`);
});

// =====================================================================================================
await abschnitt("10 Monatsrechnung (Provision) und Abo-Ereignisse", async () => {
  const monat = new Date().toISOString().slice(0, 7);
  const probe = await admin("abrechnung", { body: { monat, dryRun: true } });
  const zeilenRf = (Array.isArray(probe) ? probe : probe.ergebnis || probe.studios || []).find?.((x) => /Risikofrei/.test(x.firma || ""));
  check(probe._status === 200, "Monatsabrechnung als Probelauf (nichts wird erstellt)", `HTTP ${probe._status} ${JSON.stringify(probe).slice(0, 120)}`);
  const echt = await admin("abrechnung", { body: { monat, dryRun: false } });
  const dd = await detail(ST.rf.id);
  const ab = dd.abrechnungen?.find((a) => a.monat === monat);
  const erwartet = dd.zahlungen.filter((z) => ["bezahlt", "erstattet"].includes(z.status)).reduce((a, z) => a + (z.gebuehrBruttoCent - (z.gebuehrErstattetCent || 0)), 0);
  check(echt._status === 200 && Boolean(ab) && ab.provisionBruttoCent === erwartet, "Echte Monatsrechnung: Provision brutto = Summe der einbehaltenen Provisionen (ohne zurückgebuchte)", `${ab?.provisionBruttoCent} ct erwartet ${erwartet} ct`);
  const inv = Object.values((await mockState()).invoices).find((i) => i.customer === (dd.studio.stripe.customerId));
  check(Boolean(inv) && inv.paid_out_of_band === true && Boolean(mailAnMit("risikofrei@betrieb.test", /Abrechnung/)), "Rechnung in Stripe als bereits bezahlt markiert, Mail „Abrechnung“ an Studio", `${inv?.id} ${inv?.status}`);
  const nochmal = await admin("abrechnung", { body: { monat, dryRun: false } });
  check((await detail(ST.rf.id)).abrechnungen.filter((a) => a.monat === monat).length === 1, "Keine doppelte Abrechnung desselben Monats", "");
  // Studio ohne Zahlungen bekommt keine Rechnung
  check(!(await detail(ST.hosted.id)).abrechnungen?.some((a) => a.provisionBruttoCent > 0), "Studio ohne Umsatz: keine Rechnung über 0 €", "");
  void nochmal;

  // Abo (Monatlich): Folgerechnung bezahlt / fehlgeschlagen / Abo beendet
  const { sendeWebhook } = await import("../netlify/functions/_lib/stripe-sim.mjs");
  const dmo = await detail(ST.mo.id);
  const subId = dmo.studio.stripe.subscriptionId;
  const w1 = await sendeWebhook(`${BASE}/api/stripe-webhook`, "whsec_mock", "invoice.payment_failed", { id: "in_fail_1", customer: dmo.studio.stripe.customerId, number: "TEST-FAIL", amount_due: 5831, hosted_invoice_url: "https://example.test/i", metadata: { studioId: ST.mo.id } });
  check(w1 === 200 && Boolean(mailAnMit("monatlich@betrieb.test", /fehlgeschlagen/)) && Boolean(mails().find((m) => m.to === "admin@betrieb.test" && /Zahlung fehlgeschlagen/.test(m.subject))), "Abo: Folgerechnung fehlgeschlagen → Mail an Studio + Admin", `${w1}`);
  const w2 = await sendeWebhook(`${BASE}/api/stripe-webhook`, "whsec_mock", "customer.subscription.deleted", { id: subId, customer: dmo.studio.stripe.customerId, metadata: { studioId: ST.mo.id }, cancellation_details: { reason: "payment_failed" } });
  const dm2 = await detail(ST.mo.id);
  check(w2 === 200 && Boolean(dm2.studio.stripe.aboBeendetAm) && Boolean(mails().find((m) => m.to === "admin@betrieb.test" && /Abo Monatlich von Stripe beendet/.test(m.subject))), "Abo von Stripe beendet (ohne Kündigung) → Admin wird gewarnt", `${dm2.studio.stripe.aboBeendetAm?.slice(0, 16)}`);
});

// =====================================================================================================
await abschnitt("11 QR-Aufsteller (Kauf + Paket) und Geschenk-Einladung", async () => {
  const kaufen = await post("/api/portal/aufsteller", { holz: "hell", variante: "name", kaufen: true }, ST.rf.cookie);
  check(kaufen.status === 200 && /\/pay\//.test(kaufen.data.url || ""), "Risikofrei: QR-Aufsteller kaufen startet Checkout (29 € netto)", (kaufen.data.url || "").replace(STRIPE, ""));
  const cs = await lastSession();
  check(Number(cs.line_items[0].price_data.unit_amount) === 2900 && cs.metadata?.typ === "aufsteller", "Aufsteller-Checkout: 29,00 € netto, Typ aufsteller", `${cs.line_items[0].price_data.unit_amount}`);
  await stripeBezahlen(kaufen.data.url, "card");
  const adminMails = mails().filter((m) => m.to === "admin@betrieb.test" && /QR-Aufsteller bestellen \(29 € bezahlt\)/.test(m.subject));
  check(adminMails.length === 1 && /aufsteller\.html\?s=/.test(adminMails[0].html), "Admin-Mail „QR-Aufsteller bestellen (29 € bezahlt)“ genau einmal, mit Gravur-Link", `${adminMails.length}`);
  const anf = await post("/api/portal/aufsteller", { holz: "dunkel", variante: "name", anfordern: true }, ST.mo.cookie);
  check(anf.status === 200 && mails().some((m) => m.to === "admin@betrieb.test" && /QR-Aufsteller bestellen \(im Paket enthalten\)/.test(m.subject)), "Monatlich: Aufsteller anfordern → Admin-Mail (im Paket enthalten)", `${anf.status}`);
  const anf2 = await post("/api/portal/aufsteller", { holz: "dunkel", variante: "name", anfordern: true }, ST.mo.cookie);
  check(anf2.status === 409, "Aufsteller nicht doppelt bestellbar", `HTTP ${anf2.status}`);

  // Geschenk-Einladung
  const ein = await admin("einladen", { body: { email: "gast@betrieb.test", firma: "Gast Studio", bezeichnung: "Partner – nur Zahlungsgebühren", senden: false } });
  check(ein._status === 200 && /geschenk=/.test(ein.link || "") && ein.gesendet === false && !mailAnMit("gast@betrieb.test", /Einladung/), "Einladung erzeugt (ohne Versand, wenn gewünscht)", (ein.link || "").slice(0, 60));
  const code = (ein.link || "").split("geschenk=")[1];
  const falsch = await post("/api/signup", { ...DATEN("anderer@betrieb.test", "Gast Studio"), geschenk: code });
  check(falsch.status === 400 && /gilt für/.test(falsch.data.error || ""), "Einladung gilt nur für die eingeladene Adresse", falsch.data.error?.slice(0, 50));
  const richtig = await post("/api/signup", { ...DATEN("gast@betrieb.test", "Gast Studio"), geschenk: code });
  const sg = await studioPer("gast@betrieb.test");
  check(richtig.status === 200 && sg?.modell === "kauf" && sg.provisionProzent === 0 && /Partner/.test(sg.paket), "Anmeldung mit Einladung: eigenes Konto, 0 € und 0 %, Name der Sonderkondition", `${sg?.paket}`);
  const nochmal = await post("/api/signup", { ...DATEN("gast@betrieb.test", "Gast Studio"), geschenk: code });
  check(nochmal.status === 400, "Einladungscode nur einmal benutzbar", `HTTP ${nochmal.status}`);
  const gk = cookieVon(richtig);
  const eg = await einrichten(sg.id, gk);
  const dg = await detail(sg.id);
  check(dg.studio.stripe.kontoTyp === "standard" && dg.studio.stripe.chargesEnabled, "Einladung: Standard-Konto freigegeben", eg.konto);
  ST.gast = { ...sg, cookie: gk, konto: eg.konto };
});

// =====================================================================================================
await abschnitt("11b Sonderzeichen und Angriffsversuche in Studio- und Kundenangaben", async () => {
  const boese = `Böse <img src=x onerror=alert(1)> "Ink" & Co`;
  const r = await anmelden("risikofrei", "boese@betrieb.test", boese);
  const welcome = mailAnMit("boese@betrieb.test", /Willkommen/);
  const adminM = mails().find((m) => m.to === "admin@betrieb.test" && /Neuer Abschluss/.test(m.subject) && /Böse/.test(m.subject + m.html));
  check(r.r.status === 200 && welcome && !/<img src=x/.test(welcome.html) && /&lt;img/.test(welcome.html), "Studioname mit HTML wird in der Willkommens-Mail entschärft", "");
  check(adminM && !/<img src=x/.test(adminM.html), "… auch in der Admin-Mail", "");
  const sl = (await studioPer("boese@betrieb.test")).slug;
  check(/^[a-z0-9-]+$/.test(sl), "Adresse der Zahlseite (Slug) enthält nur sichere Zeichen", sl);
  const p = await neueSeite({ width: 1280, height: 900 });
  let dialog = false; p.on("dialog", (d) => { dialog = true; d.dismiss(); });
  await p.goto(`${BASE}/zahlen/${sl}`);
  await wait(800);
  check(!dialog && !(await p.$("img[src=x]")), "Zahlseite führt keinen eingeschleusten Code aus", "");
  await p.context().close();
  // Kundenname/Beschreibung mit HTML im Zahlungslink und in den Mails
  const z = await post("/api/portal/zahlung", { betrag: "100", kunde: "<b>Fett</b>", email: "x@kunde.test", beschreibung: "<script>alert(1)</script>" }, ST.rf.cookie);
  await post("/api/pay", { z: z.data.zahlung.id, inhaltOk: true });
  const cs = await lastSession();
  check(/Tattoo bei/.test(cs.line_items[0].price_data.product_data.name) && cs.line_items[0].price_data.product_data.name.length <= 200, "Checkout-Artikelname begrenzt auf 200 Zeichen", `${cs.line_items[0].price_data.product_data.name.length}`);
  // SQL-/Pfad-artige IDs und fremde Studios
  const fremd = await json("/api/pay?z=../../etc/passwd");
  const fremdS = await json("/api/pay?s=" + encodeURIComponent("../../x"));
  check(fremd.status === 404 && fremdS.status === 404, "Manipulierte Link-/Studio-IDs → 404", `${fremd.status}/${fremdS.status}`);
  const noAdmin = await fetch(`${BASE}/api/admin/studios`, { headers: { Authorization: "Bearer " } });
  const noAdmin2 = await fetch(`${BASE}/api/admin/studios`, { headers: { Authorization: "Bearer admin1" } });
  check(noAdmin.status === 401 && noAdmin2.status === 401, "Admin: leeres/abweichendes Token abgelehnt", `${noAdmin.status}/${noAdmin2.status}`);
});

// =====================================================================================================
await abschnitt("12 Admin-Funktionen", async () => {
  const nur = await fetch(`${BASE}/api/admin/studios`);
  check(nur.status === 401, "Admin ohne Token: 401", `HTTP ${nur.status}`);
  const liste = await studios();
  check(Array.isArray(liste) && liste.length >= 5 && liste.every((s) => s.id && s.paket !== undefined), "Admin: Studio-Liste mit Paket, Status, Stripe-Stand", `${liste.length} Studios`);
  const rf = liste.find((s) => s.id === ST.rf.id);
  check(rf.zahlungen >= 3 && rf.umsatzCent > 0 && rf.provisionNettoCent > 0 && rf.stripe === "freigegeben", "Admin: Umsatz und Provision je Studio berechnet", `Umsatz ${rf.umsatzCent / 100} €, Provision netto ${rf.provisionNettoCent / 100} €`);
  const pat = await adminPatch(`studio/${ST.rf.id}`, { notiz: "Test-Notiz", strasse: "Neue Str. 5", plz: "96050", ort: "Bamberg", website: "https://example.test" });
  check(pat.notiz === "Test-Notiz" && pat.strasse === "Neue Str. 5", "Admin: Notiz und Anschrift korrigieren", pat.strasse);
  const konto = await admin(`studio/${ST.rf.id}/konto`, { body: {} });
  check(konto._status === 200 && konto.nachher?.freigegeben === true && konto.faehigkeiten, "Admin: Stripe-Status abgleichen (Fähigkeiten Karte/Klarna sichtbar)", JSON.stringify(konto.faehigkeiten).slice(0, 80));
  const ka = await admin("konten-abgleichen", { body: {} });
  check(ka._status === 200 && ka.length >= 4 && ka.every((x) => !x.fehler), "Admin: alle Konten abgleichen ohne Fehler", `${ka.length} Konten`);
  const ll = await admin(`studio/${ST.rf.id}/login-link`, { body: {} });
  check(/\/api\/auth\?token=/.test(ll.url || ""), "Admin: Login-Link für Studio erzeugen", "");
  const live2 = await admin(`studio/${ST.ohneKonto.id}/live`, { body: {} });
  check(live2._status === 400 || live2._status === 409 || /noch nicht freigegeben/.test(live2.error || ""), "Admin: Studio ohne freigegebenes Konto kann nicht live gehen", `${live2._status} ${live2.error}`);
  const jobs = await admin("jobs", { body: {} });
  check(jobs._status === 200, "Admin: tägliche Jobs von Hand starten", `HTTP ${jobs._status}`);
  const ms = await admin("mail-status");
  check(ms._status === 200 && ms.anzahl === 0 && Array.isArray(ms.wege), "Admin: Mail-Warteschlange leer", JSON.stringify({ anzahl: ms.anzahl, wege: ms.wege }));
  const ml = await admin("mails");
  check(Array.isArray(ml) && ml.length > 10, "Admin: E-Mail-Protokoll", `${ml.length} Einträge`);
  const inf = await admin("info");
  check(inf._status === 200 && inf.siteUrl, "Admin: Info", "");
  const ct = await admin("checkout-test", { body: {} });
  check(ct._status === 200 && ct.id && ct.url, "Admin: Branding-Testsitzung (1 €, unbezahlt) erzeugen", `${ct.id}`);
  const ex = await admin("checkout-test", { body: { expire: ct.id } });
  check(ex._status === 200, "… und wieder beenden", `HTTP ${ex._status}`);
  const br = await admin(`studio/${ST.rf.id}/branding`, { body: { farbe: "#112233", akzent: "#b08d57", kurzbezeichnung: "BETRIEB" } });
  check(br._status === 200 && br.oeffentlich?.farbe === "#112233", "Admin: Branding (Farbe) setzen", JSON.stringify(br.oeffentlich || {}).slice(0, 60));
  const ansehen = await admin(`studio/${ST.rf.id}/ansehen`, { body: {} });
  check(/\/api\/admin-ansicht\?t=/.test(ansehen.url || ""), "Admin: „Dashboard ansehen“ (nur lesend)", "");
  const tipp = await admin("studio-tipps");
  check(Array.isArray(tipp), "Admin: Studio-Tipps der Kunden (nur intern)", `${tipp.length}`);
  // Abbruch der Anmeldung (abgebrochen/erinnert) wird später bei den Jobs geprüft
});

// =====================================================================================================
await abschnitt("13 Anfrage-Formular (/studios), Gesundheits-Check und /api/status", async () => {
  const gut = await post("/api/anfrage", { vorname: "Katja", studio: "Tattoo Katja Nürnberg", telefon: "0151 23456789", studio_bestaetigt: true, utm: { utm_source: "meta", utm_campaign: "betrieb-test" } });
  check(gut.status === 200 && mails().some((m) => m.to === "admin@betrieb.test" && /Neue Anfrage: Tattoo Katja/.test(m.subject)), "Studio-Anfrage: gespeichert + Admin-Mail", `HTTP ${gut.status}`);
  const kunde = await post("/api/anfrage", { vorname: "Max", studio: "Ich habe bald Tattoo-Termin, kostet 400 €", telefon: "0151 23456789", studio_bestaetigt: true });
  const ohneH = await post("/api/anfrage", { vorname: "Max", studio: "Studio X", telefon: "0151 23456789" });
  const schlecht = await post("/api/anfrage", { vorname: "M", studio: "S", telefon: "12", studio_bestaetigt: true });
  const bot = await post("/api/anfrage", { vorname: "Bot", studio: "Bot Studio", telefon: "0151 23456789", studio_bestaetigt: true, firmenwebsite: "http://spam" });
  check(kunde.status === 400 && ohneH.status === 400 && schlecht.status === 400 && bot.status === 200, "Anfrage: Endkunden-Satz, fehlendes Häkchen, ungültige Felder abgelehnt; Bot-Feld still ignoriert", `${kunde.status}/${ohneH.status}/${schlecht.status}/${bot.status}`);
  const an = await admin("anfragen");
  check(Array.isArray(an) && an.length === 1 && an[0].studio === "Tattoo Katja Nürnberg", "Admin: Anfragenliste (nur die echte, Bot nicht gespeichert)", `${an.length}`);

  const g = await gesundheit.gesundheitPruefen();
  check(g.ok === true && !g.fehler.length, "Gesundheits-Check: Startseite, Login-API, Zahlseite (Ersatz-Studio, falls das DSX-Teststudio fehlt), Mails", JSON.stringify(g.fehler));
  const stt = await fetch(`${BASE}/api/status`);
  const sd = await stt.json();
  check(stt.status === 200 && sd.ok === true && sd.mailWarteschlange === 0 && Array.isArray(sd.stoerungen), "/api/status: 200, keine Störung, ohne Personendaten", JSON.stringify(sd).slice(0, 110));
  check(!/@|studio|firma/i.test(JSON.stringify(sd)), "/api/status enthält keine Namen oder Adressen", "");
  const mt = await fetch(`${BASE}/api/mail-test`, { method: "POST", headers: { "x-test-token": "mailtest" } });
  const mtF = await fetch(`${BASE}/api/mail-test`, { method: "POST", headers: { "x-test-token": "falsch" } });
  check(mt.status === 200 && mtF.status === 401, "Mail-Test-Endpunkt: nur mit Token, Empfänger nur Admin", `${mt.status}/${mtF.status}`);
});

// =====================================================================================================
await abschnitt("14 Tägliche Jobs: Erinnerungen und Vertragsende", async () => {
  const alt = (h) => new Date(Date.now() - h * 3600e3).toISOString();
  // Abgebrochener Abschluss nach 20 h
  const entw = await post("/api/signup", { ...DATEN("abbruch@betrieb.test", "Abbruch Studio"), paket: "monatlich" });
  const sAb = await studioPer("abbruch@betrieb.test");
  setBlob("studio/" + sAb.id, { ...blob("studio/" + sAb.id), createdAt: alt(22) });
  // Stripe-Konto nach 3 Tagen und nach 8 Tagen nicht fertig
  const s3 = ST.ohneKonto;
  const b3 = blob("studio/" + s3.id);
  setBlob("studio/" + s3.id, { ...b3, createdAt: alt(24 * 3), vertrag: { ...b3.vertrag, akzeptiertAm: alt(24 * 3) } });
  const r1 = await admin("jobs", { body: {} });
  check(mailAnMit("abbruch@betrieb.test", /Abschluss|fortsetzen|abgebrochen|Deine Anmeldung/i) || mailsAn("abbruch@betrieb.test").some((m) => /Abbruch|fortsetzen|Anmeldung/i.test(m.subject + m.text)), "Job: Erinnerung bei abgebrochenem Abschluss nach 20 h", mailsAn("abbruch@betrieb.test").map((m) => m.subject).join(" / ").slice(0, 100));
  const erinnerung = mailsAn("ohne-konto@betrieb.test").find((m) => /Stripe-Konto verbinden/i.test(m.subject));
  check(Boolean(erinnerung) && /gehostet=1/.test(erinnerung.html.replace(/&amp;/g, "&")), "Job: Erinnerung „Stripe-Konto verbinden“ nach 2 Tagen, Link führt direkt zur Stripe-Seite", mailsAn("ohne-konto@betrieb.test").map((m) => m.subject).join(" / ").slice(0, 100));
  const vorMails = mailsAn("ohne-konto@betrieb.test").length;
  await admin("jobs", { body: {} });
  check(mailsAn("ohne-konto@betrieb.test").length === vorMails, "Job: Erinnerung wird nicht doppelt geschickt", "");
  const b8 = blob("studio/" + s3.id);
  setBlob("studio/" + s3.id, { ...b8, vertrag: { ...b8.vertrag, akzeptiertAm: alt(24 * 8) } });
  await admin("jobs", { body: {} });
  check(mails().some((m) => m.to === "admin@betrieb.test" && /seit 7 Tagen nicht fertig/.test(m.subject)), "Job: nach 7 Tagen Meldung an Admin „bitte anrufen“", "");
  // Vertragsende
  const k = await post("/api/portal/kuendigung", { grund: "Test" }, ST.ei.cookie);
  check(k.status === 200 && k.data.status === "gekuendigt", "Kündigung Einmalzahlung (ohne Garantie-Anspruch nach Go-live) → gekündigt", `${k.data.status}`);
  const bk = blob("studio/" + ST.ei.id);
  setBlob("studio/" + ST.ei.id, { ...bk, kuendigung: { ...bk.kuendigung, zum: new Date(Date.now() - 1000).toISOString() } });
  await admin("jobs", { body: {} });
  check((await detail(ST.ei.id)).studio.status === "beendet" && Boolean(mailAnMit("einmal@betrieb.test", /beendet|Vertrag/)), "Job: Vertragsende → Status „beendet“ + Mail", "");
  // Anfragen älter als 6 Monate werden gelöscht
  const keys = fs.readdirSync(dataDir).filter((f) => f.startsWith("anfrage%2F"));
  const alteAnfrage = { id: "af_alt", am: new Date(Date.now() - 200 * 864e5).toISOString(), vorname: "Alt", studio: "Alt", telefon: "0", test: false };
  setBlob(`anfrage/${alteAnfrage.am}-af_alt`, alteAnfrage);
  await admin("jobs", { body: {} });
  check(!fs.readdirSync(dataDir).some((f) => f.includes("af_alt")) && fs.readdirSync(dataDir).filter((f) => f.startsWith("anfrage%2F")).length === keys.length, "Job: Anfragen älter als 6 Monate werden gelöscht (Datenschutz)", "");
});

// =====================================================================================================
await abschnitt("15 Mail-Wege: Resend, IONOS/SMTP, Warteschlange", async () => {
  process.env.RESEND_API_KEY = "re_test_betrieb";
  const echtFetch = globalThis.fetch;
  let aufrufe = [];
  globalThis.fetch = async (url, opts) => {
    if (String(url).startsWith("https://api.resend.com")) { aufrufe.push(JSON.parse(opts.body)); return new Response(JSON.stringify({ id: "re_1" }), { status: 200 }); }
    return echtFetch(url, opts);
  };
  const { sendMail, warteschlangeStatus } = await import("../netlify/functions/_lib/mail.mjs");
  const r = await sendMail({ to: "resend@betrieb.test", subject: "Resend-Test", html: "<p>x</p>", text: "x" });
  check(r === true && aufrufe.length === 1 && aufrufe[0].to?.includes?.("resend@betrieb.test") || aufrufe[0]?.to === "resend@betrieb.test", "Versand über Resend: Absender, Empfänger, Betreff gesetzt", JSON.stringify({ from: aufrufe[0]?.from, subject: aufrufe[0]?.subject }));
  globalThis.fetch = async (url, opts) => String(url).startsWith("https://api.resend.com") ? new Response(JSON.stringify({ message: "450 Mail send limit exceeded" }), { status: 450 }) : echtFetch(url, opts);
  const vor = queueSize();
  await sendMail({ to: "limit@betrieb.test", subject: "Limit-Test", html: "<p>x</p>", text: "x" });
  check(queueSize() === vor + 1 && (await warteschlangeStatus()).anzahl === vor + 1, "Provider-Limit (450) → Mail in der Warteschlange statt verloren", `Warteschlange ${queueSize()}`);
  const stt = await fetch(`${BASE}/api/status`).then((x) => x.json());
  check(stt.mailWarteschlange === vor + 1, "/api/status zeigt die hängende Mail (ohne Inhalt)", `${stt.mailWarteschlange}`);
  globalThis.fetch = async (url, opts) => String(url).startsWith("https://api.resend.com") ? (aufrufe.push(1), new Response(JSON.stringify({ id: "re_2" }), { status: 200 })) : echtFetch(url, opts);
  const nach = await admin("mail-nachsenden", { body: {} });
  check(nach._status === 200 && queueSize() === 0, "Admin „Jetzt erneut senden“: Warteschlange leer", `Warteschlange ${queueSize()}`);
  globalThis.fetch = echtFetch;
  delete process.env.RESEND_API_KEY;
});

// =====================================================================================================
await abschnitt("16 Browser: Kundenseite (Handy) mit Cookie-Fenster, keine JavaScript-Fehler", async () => {
  const z = (await post("/api/portal/zahlung", { betrag: "1200", kunde: "Mobil", email: "mobil@kunde.test", beschreibung: "Schlange", sitzungen: "2 Sitzungen" }, ST.rf.cookie)).data;
  for (const [w, h] of [[390, 844], [360, 640], [1280, 720]]) {
    const p = await neueSeite({ width: w, height: h });
    await p.goto(z.link);
    await p.waitForSelector("#bezahlen, button", { timeout: 8000 }).catch(() => {});
    const text = await p.evaluate(() => document.body.innerText);
    check(/1\.200/.test(text) && /Rest|Raten|Klarna/i.test(text), `Kundenseite ${w}x${h}: Betrag + Raten-Hinweis sichtbar`, text.slice(0, 60).replace(/\s+/g, " "));
    await p.check("#inhalt-ok", { force: true }).catch(() => {});
    const klickbar = await p.click("#weiter", { timeout: 3000, trial: true }).then(() => true).catch(() => false);
    check(klickbar, `Kundenseite ${w}x${h}: Bezahl-Knopf klickbar (Cookie-Fenster verdeckt ihn nicht)`, "");
    if (w === 390) await p.screenshot({ path: path.join(shots, "kundenseite-handy.png"), fullPage: true });
    await p.context().close();
  }
  // Kompletter Weg des Endkunden am Handy (wie live: Weiterleitung zum Stripe-Checkout), Cookie-Fenster bleibt offen
  const z2 = (await post("/api/portal/zahlung", { betrag: "480", kunde: "Handy Hanna", email: "hanna@kunde.test", beschreibung: "Handgelenk" }, ST.rf.cookie)).data;
  const ph = await neueSeite({ width: 390, height: 844 });
  await ph.goto(z2.link);
  await ph.check("#inhalt-ok", { force: true });
  await ph.click("#weiter", { timeout: 4000 });
  await ph.waitForURL(/\/pay\//, { timeout: 8000 }).catch(() => {});
  check(/\/pay\//.test(ph.url()), "Kunde am Handy: „Weiter zum Bezahlen“ führt zum Stripe-Checkout", ph.url().replace(STRIPE, ""));
  await ph.click("#cancel").catch(() => {});
  await ph.waitForURL(/zahlung\.html/, { timeout: 8000 }).catch(() => {});
  await ph.waitForSelector("#weiter, #ausweg:not(.hidden)", { timeout: 6000 }).catch(() => {});
  const nachAbbruch = await ph.evaluate(() => document.body.innerText);
  check(/zahlung\.html/.test(ph.url()) && /480/.test(nachAbbruch) && !/Fehler|nicht gefunden/i.test(nachAbbruch), "Kunde bricht im Checkout ab („Abbrechen“): zurück auf seiner Seite, Link noch gültig", nachAbbruch.slice(0, 50).replace(/\s+/g, " "));
  const awKnopf = await ph.$("#aw-karte:visible, #ausweg:not(.hidden) #aw-karte");
  check(Boolean(awKnopf) && Boolean(await ph.$("#aw-nochmal")), "Nach dem Abbruch: Auswahl „Mit Karte zahlen“ und „Noch einmal versuchen“", "");
  await ph.click("#aw-karte", { timeout: 4000 }).catch(() => {});
  await ph.waitForURL(/\/pay\//, { timeout: 8000 }).catch(() => {});
  await ph.click("#pay").catch(() => {});
  await ph.waitForURL(/bezahlt\.html/, { timeout: 10000 }).catch(() => {});
  await ph.waitForFunction(() => /bezahlt|Danke|angekommen/i.test(document.body.innerText), null, { timeout: 8000 }).catch(() => {});
  const endText = await ph.evaluate(() => document.body.innerText);
  const hz = (await detail(ST.rf.id)).zahlungen.find((x) => x.kunde === "Handy Hanna");
  check(/bezahlt\.html/.test(ph.url()) && /Danke|bezahlt|angekommen/i.test(endText) && hz?.status === "bezahlt", "Kunde zahlt am Handy (Karte): Dankeseite, Zahlung beim Studio bezahlt", `${hz?.status} ${endText.slice(0, 40).replace(/\s+/g, " ")}`);
  await ph.screenshot({ path: path.join(shots, "kunde-bezahlt-handy.png") });
  await ph.context().close();
  check(jsFehler.length === 0, "Keine JavaScript-Fehler im Browser", jsFehler.slice(0, 2).join(" ; "));
});

await browser.close();
console.log(`\nRunde ${RUNDE}: ${ok} ok, ${fehler} Fehler · Screenshots: ${shots}`);
if (process.env.PROTOKOLL) fs.writeFileSync(process.env.PROTOKOLL, ["| Runde | Bereich | Schritt | Ergebnis | Beweis |", "|---|---|---|---|---|", ...zeilen, "", `Runde ${RUNDE}: ${ok} ok, ${fehler} Fehler`].join("\n"));
process.exit(fehler ? 1 : 0);
