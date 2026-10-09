// End-to-End-Test aller Abläufe mit Stripe-Mock und echtem Browser (Playwright).
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
const shots = process.argv[2] || path.join(os.tmpdir(), "ted-e2e");
fs.mkdirSync(shots, { recursive: true });
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "ted-data-"));
await startDev({ port: PORT, mock: true, dataDir, quiet: true });

let ok = 0, fail = 0;
const check = (cond, name) => { if (cond) { ok++; console.log("  ✓", name); } else { fail++; console.log("  ✗", name); } };
const admin = (p, opts = {}) => fetch(`${BASE}/api/admin/${p}`, { method: opts.body ? "POST" : "GET", ...opts, headers: { Authorization: "Bearer admin", "content-type": "application/json" }, body: opts.body ? JSON.stringify(opts.body) : undefined }).then((r) => r.json());
const mailsAn = (to) => fs.readdirSync(dataDir).filter((f) => f.startsWith("mail%2F")).map((f) => JSON.parse(fs.readFileSync(path.join(dataDir, f)))).filter((m) => [].concat(m.to).includes(to));
const loginUrlAus = (m) => (m.html.match(/href="([^"]*\/api\/auth\?token=[^"]+)"/) || [])[1]?.replace(/&amp;/g, "&");
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

try {
  console.log("Startseite");
  await page.goto(BASE + "/");
  check((await page.textContent("h1")).includes("Ted geht ran"), "Hero lädt");
  await page.waitForFunction(() => document.getElementById("r-prov").textContent.includes("€"));
  check((await page.textContent("#r-prov")).includes("225"), "Rechner: 30 Anfragen × 25 % × 300 € × 10 % = 225 €");
  check((await page.textContent(".price .amount span[data-c='kaufNetto|euro']")).includes("1.499"), "Kaufpreis 1.499 € aus Server-Konfiguration");
  await page.screenshot({ path: path.join(shots, "landing.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(shots, "landing-mobil.png"), fullPage: true });
  await page.setViewportSize({ width: 1280, height: 900 });

  console.log("Abschluss Provision (SEPA-Mandat)");
  await signup({ modell: "provision", email: "prov@example.com", firma: "Ink Provision" });
  await page.waitForURL(/localhost:12111\/pay\//);
  await page.click("#pay");
  await page.waitForURL(/danke\.html/);
  await page.waitForFunction(() => /hinterlegt/.test(document.getElementById("msg").textContent), null, { timeout: 15000 });
  check(true, "Danke-Seite bestätigt hinterlegte Zahlungsmethode");
  await page.screenshot({ path: path.join(shots, "danke.png") });
  let list = await admin("studios");
  const prov = list.find((s) => s.email === "prov@example.com");
  check(prov?.status === "einrichtung", "Studio Provision im Status Einrichtung");
  const mProv = mailsAn("prov@example.com").map((m) => m.subject);
  check(mProv.some((s) => s.startsWith("Willkommen")) && mProv.some((s) => s.includes("Zahlungsmethode hinterlegt")), "E-Mails: Willkommen + Mandat");

  console.log("Abschluss Kauf mit Aktionscode (sofort)");
  await signup({ modell: "kauf", email: "kauf@example.com", firma: "Ink Kauf", code: "TEDRUFT" });
  await page.waitForURL(/localhost:12111\/pay\//);
  check((await page.textContent("body")).includes("1486.31"), "Stripe-Betrag 1.249 € netto + 19 % = 1.486,31 €");
  await page.click("#pay");
  await page.waitForURL(/danke\.html/);
  await page.waitForFunction(() => /Zahlung ist eingegangen/.test(document.getElementById("msg").textContent), null, { timeout: 15000 });
  check(true, "Kauf bezahlt");
  check(mailsAn("kauf@example.com").some((m) => m.subject.includes("Zahlung erhalten")), "E-Mail: Zahlung erhalten");

  console.log("Kauf auf Rechnung + Abbruch/Fortsetzen");
  await signup({ modell: "kauf", email: "rechnung@example.com", firma: "Ink Rechnung", zahlart: "rechnung" });
  await page.waitForURL(/danke\.html/);
  list = await admin("studios");
  check(list.find((s) => s.email === "rechnung@example.com")?.status === "zahlung_offen", "Rechnung offen");
  check(mailsAn("rechnung@example.com").some((m) => m.subject.includes("Rechnung")), "E-Mail: Rechnung");
  await signup({ modell: "provision", email: "abbruch@example.com", firma: "Ink Abbruch" });
  await page.waitForURL(/localhost:12111\/pay\//);
  await page.click("#cancel");
  await page.waitForURL(/start\.html\?resume=/);
  await page.waitForFunction(() => document.getElementById("firma").value === "Ink Abbruch");
  check(true, "Nach Abbruch sind Angaben wieder da");
  const dup = await fetch(`${BASE}/api/signup`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ modell: "provision", firma: "x", inhaber: "x", strasse: "x", plz: "1", ort: "x", email: "kauf@example.com", telefon: "1", studioTelefon: "1", unterzeichner: "x", akzeptiert: { vertrag: true, avv: true, unternehmer: true } }) });
  check(dup.status === 409, "Doppelte Anmeldung wird abgelehnt");
  const ohneAgb = await fetch(`${BASE}/api/signup`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ modell: "kauf", email: "neu@example.com" }) });
  check(ohneAgb.status === 400, "Signup ohne Pflichtangaben abgelehnt");

  console.log("Login per Magic Link + Fragebogen");
  const loginUrl = loginUrlAus(mailsAn("prov@example.com").find((m) => m.subject.startsWith("Willkommen")));
  check(Boolean(loginUrl), "Login-Link in Willkommens-Mail");
  await page.goto(loginUrl);
  await page.waitForURL(/onboarding\.html/);
  await page.fill("input[name=zeit_di]", "11–19 Uhr");
  await page.fill("textarea[name=faq]", "Macht ihr kleine Tattoos? – Ja, ab 5 cm.");
  await page.click("form#f button");
  await page.waitForSelector(".alert.ok");
  check(true, "Fragebogen gespeichert");

  console.log("Ted-Anruf (ElevenLabs-Webhook) → Anfrage im Portal");
  const provId = (await admin("studios")).find((s) => s.email === "prov@example.com").id;
  await admin(`studio/${provId}`, { method: "PATCH", body: { agentId: "agent_test_1", tedNummer: "0951 99999" } });
  await admin(`studio/${provId}/live`, { body: {} });
  check(mailsAn("prov@example.com").some((m) => m.subject.includes("live")), "E-Mail: Ted ist live");
  const vor40 = Math.floor(Date.now() / 1000) - 40 * 86400;
  const anruf = (conv, extra = {}) => fetch(`${BASE}/api/ted/anruf`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
    type: "post_call_transcription", data: { agent_id: "agent_test_1", conversation_id: conv,
      metadata: { call_duration_secs: 134, start_time_unix_secs: vor40, phone_call: { external_number: "+491511234567" } },
      analysis: { transcript_summary: "Kundin möchte Rosenranke.", data_collection_results: { name: { value: "Lena" }, rueckrufnummer: { value: "0151 1234567" }, motiv: { value: "Rosenranke" }, koerperstelle: { value: "Unterarm" }, groesse_cm: { value: "15" }, ...extra } } } }) });
  check((await anruf("conv_1")).status === 200, "Anruf-Webhook angenommen");
  check((await (await anruf("conv_1")).json()).doppelt === true, "Doppelte Zustellung wird erkannt");
  await anruf("conv_2", { name: { value: "Tom" }, motiv: { value: "Cover-up" }, dringend: { value: "ja" } });
  check(mailsAn("prov@example.com").some((m) => m.subject.includes("Neue Anfrage: Lena")), "E-Mail: neue Anfrage an Studio");

  await page.goto(BASE + "/portal.html#anfragen");
  await page.waitForSelector("#anfragen-liste table");
  const row = page.locator("#anfragen-liste tr", { hasText: "Lena" });
  const termin = new Date(Date.now() - 35 * 86400e3);
  const terminStr = termin.toISOString().slice(0, 10);
  await row.locator("select").selectOption("gebucht");
  await row.locator("input[type=date]").fill(terminStr);
  await row.locator("input.preis").fill("400");
  await row.locator("[data-save]").click();
  await page.waitForSelector(".alert.ok");
  check(true, "Termin mit Preis im Portal eingetragen");
  await page.screenshot({ path: path.join(shots, "portal-anfragen.png"), fullPage: true });
  await page.goto(BASE + "/portal.html#uebersicht");
  await page.waitForSelector("#kpis .kpi");
  await page.screenshot({ path: path.join(shots, "portal-uebersicht.png"), fullPage: true });

  console.log("Monatsabrechnung");
  const monat = terminStr.slice(0, 7);
  const probe = await admin("abrechnung", { body: { monat, dryRun: true } });
  const pr = probe.find((x) => x.studio === "Ink Provision");
  check(pr?.summeNetto === 4000, "Probelauf: 10 % von 400 € = 40 € Provision");
  const echt = await admin("abrechnung", { body: { monat, dryRun: false } });
  check(echt.find((x) => x.studio === "Ink Provision")?.rechnung?.startsWith("TEST-"), "Rechnung in Stripe erstellt");
  await wait(1200);
  const det = await admin(`studio/${provId}`);
  check(det.abrechnungen[0]?.status === "bezahlt", "Einzug erfolgreich (invoice.paid)");
  check(det.anfragen.find((a) => a.name === "Lena")?.abgerechnet === monat, "Anfrage als abgerechnet gesperrt");
  check(mailsAn("prov@example.com").some((m) => m.subject.includes("Abrechnung")), "E-Mail: Monatsabrechnung");
  const nochmal = await admin("abrechnung", { body: { monat, dryRun: false } });
  check(nochmal.find((x) => x.studio === "Ink Provision")?.status === "schon abgerechnet", "Keine doppelte Abrechnung");
  const gesperrt = await page.evaluate(async (id) => (await fetch("/api/portal/anfrage/" + id, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ preisNetto: "1" }) })).status, det.anfragen.find((a) => a.name === "Lena").id);
  check(gesperrt === 409, "Abgerechnete Anfrage nicht mehr änderbar");

  console.log("Kündigung & Rücknahme");
  await page.goto(BASE + "/portal.html#vertrag");
  page.once("dialog", (d) => d.accept());
  await page.click("#k-btn");
  await page.waitForSelector("#k-zurueck");
  check(mailsAn("prov@example.com").some((m) => m.subject.includes("Kündigung ist eingegangen")), "E-Mail: Kündigungsbestätigung");
  await page.screenshot({ path: path.join(shots, "portal-gekuendigt.png"), fullPage: true });
  await page.click("#k-zurueck");
  await page.waitForSelector("#k-btn");
  check(mailsAn("prov@example.com").some((m) => m.subject.includes("zurückgenommen")), "E-Mail: Kündigung zurückgenommen");

  console.log("Garantie-Erstattung (Kauf)");
  const kaufId = (await admin("studios")).find((s) => s.email === "kauf@example.com").id;
  await admin(`studio/${kaufId}/live`, { body: {} });
  const ref = await admin(`studio/${kaufId}/erstattung`, { body: {} });
  check(ref.status === "erstattet", "Kauf erstattet");
  check(mailsAn("kauf@example.com").some((m) => m.subject.includes("Erstattung")), "E-Mail: Erstattung");

  console.log("Sicherheit");
  const bad = await fetch(`${BASE}/api/stripe-webhook`, { method: "POST", headers: { "stripe-signature": "t=1,v1=00" }, body: "{}" });
  check(bad.status === 400, "Webhook mit falscher Signatur abgelehnt");
  check((await fetch(`${BASE}/api/admin/studios`)).status === 401, "Admin ohne Token abgelehnt");
  check((await fetch(`${BASE}/api/portal`)).status === 401, "Portal ohne Login abgelehnt");
  const redir = await fetch(`${BASE}/api/auth?token=${encodeURIComponent(new URL(loginUrl).searchParams.get("token"))}&next=//evil.com`, { redirect: "manual" });
  check(redir.headers.get("location") === "/portal.html", "Kein offener Redirect");

  console.log("Seiten");
  for (const p of ["vertrag.html", "avv.html", "impressum.html", "datenschutz.html", "login.html", "admin.html"]) {
    await page.goto(BASE + "/" + p);
    await wait(300);
    if (["vertrag.html", "datenschutz.html"].includes(p)) await page.screenshot({ path: path.join(shots, p.replace(".html", ".png")) });
  }
  const vertragText = await page.goto(BASE + "/vertrag.html").then(() => wait(500)).then(() => page.textContent("main"));
  check(vertragText.includes("1.499") && vertragText.includes("10 %"), "Vertrag zeigt Preise aus der Server-Konfiguration");
  await page.goto(BASE + "/admin.html");
  await page.fill("#token", "admin");
  await page.click("#login button");
  await page.waitForSelector("#liste table");
  await page.screenshot({ path: path.join(shots, "admin.png"), fullPage: true });
  check(true, "Admin-Oberfläche lädt");

  // eine Beispiel-E-Mail als HTML ablegen
  const beispiel = mailsAn("prov@example.com").find((m) => m.subject.includes("Abrechnung"));
  fs.writeFileSync(path.join(shots, "mail-abrechnung.html"), beispiel.html);
  await page.goto("file://" + path.join(shots, "mail-abrechnung.html"));
  await page.screenshot({ path: path.join(shots, "mail-abrechnung.png"), fullPage: true });
} catch (e) {
  fail++;
  console.error("ABBRUCH:", e);
  await page.screenshot({ path: path.join(shots, "fehler.png"), fullPage: true }).catch(() => {});
}
check(errors.length === 0, "Keine JavaScript-Fehler im Browser" + (errors.length ? ": " + errors.join(" | ") : ""));
console.log(`\n${ok} bestanden, ${fail} fehlgeschlagen · Screenshots: ${shots}`);
await browser.close();
process.exit(fail ? 1 : 0);
