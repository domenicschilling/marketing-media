// End-to-End-Test aller Abläufe mit Stripe-Nachbau (inkl. Connect) und echtem Browser (Playwright).
//   node dev/e2e.mjs [screenshot-ordner]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { startDev } from "./server.mjs";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("/opt/node22/lib/node_modules/playwright")); }

const PORT = 8899, BASE = `http://localhost:${PORT}`;
const shots = process.argv[2] || path.join(os.tmpdir(), "tf-e2e");
fs.mkdirSync(shots, { recursive: true });
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "tf-data-"));
await startDev({ port: PORT, mock: true, dataDir, quiet: true });

let ok = 0, fail = 0;
const check = (cond, name) => { if (cond) { ok++; console.log("  ✓", name); } else { fail++; console.log("  ✗", name); } };
const admin = (p, opts = {}) => fetch(`${BASE}/api/admin/${p}`, { method: opts.body ? "POST" : "GET", ...opts, headers: { Authorization: "Bearer admin", "content-type": "application/json" }, body: opts.body ? JSON.stringify(opts.body) : undefined }).then((r) => r.json());
const mailsAn = (to) => fs.readdirSync(dataDir).filter((f) => f.startsWith("mail%2F")).map((f) => JSON.parse(fs.readFileSync(path.join(dataDir, f)))).filter((m) => [].concat(m.to).includes(to));
const linkAus = (m, re) => (m.html.match(re) || [])[1]?.replace(/&amp;/g, "&");
const mock = (p) => fetch("http://localhost:12111/mock/" + p).then((r) => r.json());
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error" && !/404|Failed to load resource/.test(m.text())) errors.push(m.text()); });

async function signup({ modell, email, firma, code, zahlart }) {
  await page.goto(`${BASE}/start.html?modell=${modell}`);
  if (code) await page.fill("#aktionscode", code);
  if (zahlart) await page.check(`input[name=zahlart][value=${zahlart}]`, { force: true });
  await page.click("section[data-step='1'] [data-next]");
  for (const [k, v] of Object.entries({ firma, inhaber: "Alex Muster", strasse: "Musterstr. 1", plz: "96047", ort: "Bamberg", email, telefon: "0151 1234567", studioTelefon: "0951 123456" })) await page.fill("#" + k, v);
  await page.click("section[data-step='2'] [data-next]");
  await page.check("input[name=ak_vertrag]"); await page.check("input[name=ak_avv]"); await page.check("input[name=ak_unternehmer]");
  await page.fill("#unterzeichner", "Alex Muster");
  await page.click("section[data-step='3'] [data-next]");
  await page.screenshot({ path: path.join(shots, `start-${modell}-schritt4.png`), fullPage: true });
  await page.click("#submit");
}

async function onboarding() {
  await page.waitForURL(/localhost:12111\/onboard\//);
  await page.click("#onboard");
  await page.waitForURL(/danke\.html.*stripe=1/);
  await page.waitForFunction(() => /freigegeben/.test(document.getElementById("msg").textContent), null, { timeout: 15000 });
}

try {
  console.log("Startseite");
  await page.goto(BASE + "/");
  check((await page.textContent("h1")).includes("leichter bezahlbar"), "Hero lädt");
  await page.waitForFunction(() => document.getElementById("r-prov").textContent.includes("€"));
  check((await page.textContent("#r-prov")).includes("450"), "Rechner: 3 × 1.500 € × 10 % = 450 € Provision");
  check((await page.textContent("#r-tipp")).includes("Kaufen"), "Rechner empfiehlt Kauf ab hohem Umsatz");
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(shots, "landing.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(shots, "landing-mobil.png"), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });

  console.log("Abschluss Provision → Stripe-Konto verbinden");
  await signup({ modell: "provision", email: "prov@example.com", firma: "Ink Provision" });
  await onboarding();
  check(true, "Onboarding abgeschlossen, Danke-Seite meldet Freigabe");
  await page.screenshot({ path: path.join(shots, "danke.png") });
  const mProv = mailsAn("prov@example.com").map((m) => m.subject);
  check(mProv.some((s) => s.startsWith("Willkommen")) && mProv.some((s) => s.includes("freigegeben")), "E-Mails: Willkommen + Konto freigegeben");

  console.log("Abschluss Kauf mit Aktionscode");
  await signup({ modell: "kauf", email: "kauf@example.com", firma: "Ink Kauf", code: "RATENJA" });
  await page.waitForURL(/localhost:12111\/pay\//);
  check((await page.textContent("body")).includes("1486.31"), "Stripe-Betrag 1.249 € netto + 19 % = 1.486,31 €");
  await page.click("#pay");
  await page.waitForURL(/danke\.html/);
  await page.waitForSelector("#connect:not(.hidden)");
  check(mailsAn("kauf@example.com").some((m) => m.subject.includes("Zahlung erhalten")), "E-Mail: Zahlung erhalten");
  await page.click("#connect-btn");
  await onboarding();
  check(true, "Kauf-Studio hat Stripe-Konto verbunden");

  console.log("Kauf auf Rechnung, Abbruch, Fehlerfälle");
  await signup({ modell: "kauf", email: "rechnung@example.com", firma: "Ink Rechnung", zahlart: "rechnung" });
  await page.waitForURL(/danke\.html/);
  check((await admin("studios")).find((s) => s.email === "rechnung@example.com")?.status === "zahlung_offen", "Rechnung offen");
  check(mailsAn("rechnung@example.com").some((m) => m.subject.includes("Rechnung")), "E-Mail: Rechnung");
  await signup({ modell: "kauf", email: "abbruch@example.com", firma: "Ink Abbruch" });
  await page.waitForURL(/localhost:12111\/pay\//);
  await page.click("#cancel");
  await page.waitForURL(/start\.html\?resume=/);
  await page.waitForFunction(() => document.getElementById("firma").value === "Ink Abbruch");
  check(true, "Nach Abbruch sind Angaben wieder da");
  const post = (b) => fetch(`${BASE}/api/signup`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) });
  check((await post({ modell: "provision", firma: "x", inhaber: "x", strasse: "x", plz: "1", ort: "x", email: "kauf@example.com", telefon: "1", studioTelefon: "1", unterzeichner: "x", akzeptiert: { vertrag: true, avv: true, unternehmer: true } })).status === 409, "Doppelte Anmeldung abgelehnt");
  check((await post({ modell: "kauf", email: "neu@example.com" })).status === 400, "Signup ohne Pflichtangaben abgelehnt");

  console.log("Login per Magic Link + Fragebogen");
  const loginUrl = linkAus(mailsAn("prov@example.com").find((m) => m.subject.startsWith("Willkommen")), /href="([^"]*\/api\/auth\?token=[^"]+)"/);
  check(Boolean(loginUrl), "Login-Link in Willkommens-Mail");
  await page.goto(loginUrl + "&next=/onboarding.html");
  await page.waitForURL(/onboarding\.html/);
  await page.fill("input[name=kontoauszug]", "INK PROVISION");
  await page.fill("input[name=preis_gross]", "800 bis 2.500 €");
  await page.click("form#f button");
  await page.waitForSelector(".alert.ok");
  check(true, "Fragebogen gespeichert");

  console.log("Live schalten + Zahlungslink (Provision, Klarna)");
  const provId = (await admin("studios")).find((s) => s.email === "prov@example.com").id;
  await admin(`studio/${provId}/live`, { body: {} });
  check(mailsAn("prov@example.com").some((m) => m.subject.includes("live")), "E-Mail: Tattoofin ist live");
  await page.goto(BASE + "/portal.html#anfordern");
  await page.waitForSelector("#f-link");
  await page.fill("#l-betrag", "1.500"); await page.fill("#l-kunde", "Lena Beispiel"); await page.fill("#l-email", "lena@example.com"); await page.fill("#l-beschreibung", "Sleeve linker Arm");
  check((await page.textContent("#l-fee")).includes("150,00"), "Hinweis: 150 € Provision netto");
  await page.click("#f-link button");
  await page.waitForSelector("#l-url");
  const zahlLink = await page.inputValue("#l-url");
  await page.screenshot({ path: path.join(shots, "portal-zahlungslink.png"), fullPage: true });
  check(/zahlung\.html\?z=zl_/.test(zahlLink), "Zahlungslink erzeugt");
  await page.goto(zahlLink);
  await page.waitForFunction(() => document.getElementById("betrag").textContent.includes("1.500"));
  await page.screenshot({ path: path.join(shots, "kunde-zahlungslink.png"), fullPage: true });
  await page.click("#pay");
  await page.waitForURL(/localhost:12111\/pay\//);
  let state = await mock("state");
  const sess = Object.values(state.sessions).find((s) => s.account && s.metadata?.tattoofinZahlung === zahlLink.split("z=")[1]);
  check(sess?.payment_intent_data?.application_fee_amount === 17850, "Plattformgebühr 178,50 € (10 % + 19 % USt.) auf Stripe-Konto des Studios");
  await page.click("#pay-klarna");
  await page.waitForURL(/bezahlt\.html/);
  await page.waitForFunction(() => /erhalten/.test(document.getElementById("msg").textContent), null, { timeout: 15000 });
  check(true, "Kunde sieht Bestätigung");
  check(mailsAn("prov@example.com").some((m) => m.subject.includes("Zahlung eingegangen: 1.500,00")), "E-Mail an Studio: Zahlung eingegangen");
  check(mailsAn("lena@example.com").some((m) => m.subject.includes("Danke für deine Zahlung")), "E-Mail an Kundin: Bestätigung");
  let det = await admin(`studio/${provId}`);
  check(det.zahlungen.find((z) => z.kunde === "Lena Beispiel")?.zahlart === "klarna", "Zahlart Klarna erkannt");
  await page.goto(zahlLink);
  await page.waitForSelector(".alert.ok");
  check(true, "Bereits bezahlter Link zeigt Hinweis statt erneuter Zahlung");

  console.log("Studio-Zahlseite (QR)");
  const slug = det.studio.slug;
  await page.goto(`${BASE}/zahlen.html?s=${slug}`);
  await page.waitForFunction(() => document.getElementById("studio").textContent === "Ink Provision");
  await page.fill("#betrag", "300"); await page.fill("#kunde", "Tom"); await page.fill("#beschreibung", "Anzahlung Rückenstück");
  await page.screenshot({ path: path.join(shots, "kunde-zahlseite.png"), fullPage: true });
  await page.click("#pay");
  await page.waitForURL(/localhost:12111\/pay\//);
  await page.click("#pay");
  await page.waitForURL(/bezahlt\.html/);
  await page.waitForFunction(() => /erhalten/.test(document.getElementById("msg").textContent), null, { timeout: 15000 });
  check(true, "Zahlung über Zahlseite");
  const tooSmall = await fetch(`${BASE}/api/pay`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ s: slug, betrag: "5", kunde: "x" }) });
  check(tooSmall.status === 400, "Mindestbetrag wird geprüft");

  console.log("Erstattung → Provision anteilig zurück");
  det = await admin(`studio/${provId}`);
  const lena = det.zahlungen.find((z) => z.kunde === "Lena Beispiel");
  await mock(`refund/${lena.paymentIntentId}?amount=75000`);
  await wait(300);
  state = await mock("state");
  check(state.feeRefunds.some((r) => r.amount === 8925), "Hälfte erstattet → 89,25 € Provision zurückgebucht");

  console.log("Monatsabrechnung");
  const monat = new Date().toISOString().slice(0, 7);
  const probe = (await admin("abrechnung", { body: { monat, dryRun: true } })).find((x) => x.studio === "Ink Provision");
  check(probe?.provisionNettoCent === 18000, "Probelauf: 150 € + 30 € = 180 € Provision netto");
  const echt = (await admin("abrechnung", { body: { monat, dryRun: false } })).find((x) => x.studio === "Ink Provision");
  check(echt?.rechnung?.startsWith("TEST-"), "Rechnung erstellt (als bereits bezahlt markiert)");
  state = await mock("state");
  check(Object.values(state.invoices).some((i) => i.paid_out_of_band), "Rechnung außerhalb von Stripe als bezahlt markiert");
  check(mailsAn("prov@example.com").some((m) => m.subject.includes("Abrechnung")), "E-Mail: Monatsabrechnung");
  check((await admin("abrechnung", { body: { monat, dryRun: false } })).find((x) => x.studio === "Ink Provision")?.status === "schon abgerechnet", "Keine doppelte Abrechnung");

  console.log("Kauf-Studio: keine Provision");
  const kaufId = (await admin("studios")).find((s) => s.email === "kauf@example.com").id;
  await admin(`studio/${kaufId}/live`, { body: {} });
  const kaufLogin = (await admin(`studio/${kaufId}/login-link`, { body: {} })).url;
  const ctx2 = await browser.newContext(); const p2 = await ctx2.newPage();
  await p2.goto(kaufLogin);
  const r2 = await p2.evaluate(async () => (await fetch("/api/portal/zahlung", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ betrag: "1000", kunde: "Kim" }) })).json());
  check(r2.zahlung?.gebuehrBruttoCent === 0, "Kauf-Modell: Zahlungslink ohne Plattformgebühr");
  await ctx2.close();

  console.log("Kündigung & Rücknahme, Garantie");
  await page.goto(BASE + "/portal.html#vertrag");
  page.once("dialog", (d) => d.accept());
  await page.click("#k-btn");
  await page.waitForSelector("#k-zurueck");
  check(mailsAn("prov@example.com").some((m) => m.subject.includes("Kündigung ist eingegangen")), "E-Mail: Kündigungsbestätigung");
  await page.click("#k-zurueck");
  await page.waitForSelector("#k-btn");
  check(mailsAn("prov@example.com").some((m) => m.subject.includes("zurückgenommen")), "E-Mail: Kündigung zurückgenommen");
  const ref = await admin(`studio/${kaufId}/erstattung`, { body: {} });
  check(ref.status === "erstattet" && mailsAn("kauf@example.com").some((m) => m.subject.includes("Erstattung")), "Garantie-Erstattung Kauf + E-Mail");

  console.log("Sicherheit");
  check((await fetch(`${BASE}/api/stripe-webhook`, { method: "POST", headers: { "stripe-signature": "t=1,v1=00" }, body: "{}" })).status === 400, "Webhook mit falscher Signatur abgelehnt");
  check((await fetch(`${BASE}/api/admin/studios`)).status === 401, "Admin ohne Token abgelehnt");
  check((await fetch(`${BASE}/api/portal`)).status === 401, "Portal ohne Login abgelehnt");
  const redir = await fetch(`${BASE}/api/auth?token=${encodeURIComponent(new URL(loginUrl).searchParams.get("token"))}&next=//evil.com`, { redirect: "manual" });
  check(redir.headers.get("location") === "/portal.html", "Kein offener Redirect");
  const rechnungStudio = (await admin("studios")).find((s) => s.email === "rechnung@example.com");
  const blocked = await fetch(`${BASE}/api/pay`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ s: rechnungStudio.slug, betrag: "500", kunde: "x" }) });
  check(blocked.status === 409, "Studio ohne freigegebenes Konto kann nicht kassieren");

  console.log("Seiten");
  await page.goto(BASE + "/portal.html#uebersicht");
  await page.waitForSelector("#kpis .kpi");
  await page.screenshot({ path: path.join(shots, "portal-uebersicht.png"), fullPage: true });
  await page.goto(BASE + "/portal.html#kit");
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(shots, "portal-kit.png"), fullPage: true });
  for (const p of ["vertrag.html", "avv.html", "impressum.html", "datenschutz.html", "login.html"]) { await page.goto(BASE + "/" + p); await wait(250); }
  await page.goto(BASE + "/admin.html");
  await page.fill("#token", "admin");
  await page.click("#login button");
  await page.waitForSelector("#liste table");
  await page.screenshot({ path: path.join(shots, "admin.png"), fullPage: true });
  check(true, "Admin-Oberfläche lädt");
  for (const [n, re] of [["mail-zahlung", /Zahlung eingegangen/], ["mail-abrechnung", /Abrechnung/], ["mail-willkommen", /Willkommen/]]) {
    const m = mailsAn("prov@example.com").find((x) => re.test(x.subject));
    fs.writeFileSync(path.join(shots, n + ".html"), m.html.replaceAll(`${BASE}/assets/`, `file://${path.resolve("public/assets")}/`));
    await page.goto("file://" + path.join(shots, n + ".html"));
    await page.screenshot({ path: path.join(shots, n + ".png"), fullPage: true });
  }
} catch (e) {
  fail++;
  console.error("ABBRUCH:", e);
  await page.screenshot({ path: path.join(shots, "fehler.png"), fullPage: true }).catch(() => {});
}
check(errors.length === 0, "Keine JavaScript-Fehler im Browser" + (errors.length ? ": " + errors.join(" | ") : ""));
console.log(`\n${ok} bestanden, ${fail} fehlgeschlagen · Screenshots: ${shots}`);
await browser.close();
process.exit(fail ? 1 : 0);
