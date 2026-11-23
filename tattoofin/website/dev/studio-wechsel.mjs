// Test Studio-Wechsel im Web (seit 23.11.2026): ein Login-Link für alle Studios einer Adresse, Wechsel ohne neue Login-Mail,
// Rolle je Studio, Server-Prüfung bei jedem Aufruf, „Auf allen Geräten abmelden“ je Studio, Anmeldung eines weiteren Studios
// (Team-Adresse anderswo), Oberfläche im Dashboard (Knopf, Dialog, Tastatur, 320 px). Die App-Seite steht in dev/app-api.mjs.
//   NODE_PATH=<…/node_modules mit playwright> node dev/studio-wechsel.mjs     → Exit-Code 1 bei Fehlern
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { createRequire } from "node:module";
import { startDev } from "./server.mjs";

const require = createRequire(import.meta.url);
let chromium = null;
try { ({ chromium } = require("playwright")); } catch { /* ohne Browser: nur Server-Teil */ }

const PORT = Number(process.env.WECHSEL_TEST_PORT || 8897), BASE = `http://localhost:${PORT}`, STRIPE = `http://localhost:${Number(process.env.STRIPE_MOCK_PORT || 12111)}`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "tf-wechsel-"));
for (const k of ["RESEND_API_KEY", "SMTP_HOST", "TF_JETZT", "APP_LOKAL_CODE"]) delete process.env[k];
process.env.TF_BEZAHLFELD = "aus";
process.env.ADMIN_EMAIL = "admin@wechsel.test";
await startDev({ port: PORT, mock: true, dataDir, quiet: true });
const auth = await import("../netlify/functions/_lib/auth.mjs");
const storeMod = await import("../netlify/functions/_lib/store.mjs");

let ok = 0, fehler = 0;
const check = (cond, name, beweis = "") => { if (cond) { ok++; console.log("  ✓", name); } else { fehler++; console.log("  ✗", name, beweis ? `  [${String(beweis).slice(0, 300)}]` : ""); } };
const teil = (t) => console.log("\n" + t);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const call = async (method, url, { cookie, body, headers = {} } = {}) => {
  const r = await fetch(BASE + url, { method, headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}), ...headers }, body: body !== undefined ? JSON.stringify(body) : undefined, redirect: "manual" });
  const text = await r.text();
  let data = {}; try { data = JSON.parse(text); } catch { data = { _text: text.slice(0, 200) }; }
  return { status: r.status, data, headers: r.headers, text };
};
const admin = (p, body, method) => call(method || (body !== undefined ? "POST" : "GET"), "/api/admin/" + p, { body, headers: { authorization: "Bearer admin" } }).then((r) => r.data);
const stripeForm = (url, felder = {}) => fetch(STRIPE + url, { method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(felder) });
const formPost = (url, felder, cookie) => fetch(BASE + url, { method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded", ...(cookie ? { cookie } : {}) }, body: new URLSearchParams(felder).toString() });
const dateien = (prefix) => fs.readdirSync(dataDir).filter((f) => f.startsWith(encodeURIComponent(prefix)));
const mails = () => dateien("mail/").map((f) => JSON.parse(fs.readFileSync(path.join(dataDir, f)))).sort((a, b) => a.at.localeCompare(b.at));
const mailsAn = (to) => mails().filter((m) => [].concat(m.to).includes(to));
const loginMails = (to) => mailsAn(to).filter((m) => /Login-Link/.test(m.subject));
const cookieAus = (r) => (r.headers.get("set-cookie") || "").split(";")[0];
const cookieDaten = (c) => auth.verify(decodeURIComponent(c.split("=")[1] || ""), "session");
const rlReset = () => { for (const f of fs.readdirSync(dataDir)) if (/^rl%2Flogin/.test(f)) fs.rmSync(path.join(dataDir, f)); };
const DATEN = (email, firma, ort) => ({ firma, inhaber: "Alex Muster", strasse: "Musterstr. 1", plz: "96047", ort, email, telefon: "0151 1234567", studioTelefon: "0951 123456", unterzeichner: "Alex Muster", akzeptiert: { vertrag: true, avv: true, unternehmer: true, kmu: true } });
async function studioAnlegen(email, firma, ort) {
  const r = await call("POST", "/api/signup", { body: { ...DATEN(email, firma, ort), paket: "monatlich" } });
  if (!r.data.url) throw new Error("Anmeldung fehlgeschlagen: " + r.text);
  const cookie = cookieAus(r);
  await stripeForm(new URL(r.data.url).pathname, { pm: "card" });
  await wait(150);
  const sess = await call("POST", "/api/portal/stripe-session", { cookie });
  await stripeForm(`/onboarding-fertig/${sess.data.konto}`, { name: "Alex Muster", iban: "DE89370400440532013000" });
  await wait(150);
  const id = (await admin("studios")).find((s) => s.email === email && s.firma === firma)?.id;
  await admin(`studio/${id}/live`, {});
  return { id, cookie };
}
// Login wie im Leben: Adresse eingeben → Mail → Link (GET = Zwischenseite) → POST → Cookie
async function webLogin(email) {
  rlReset();
  const vorher = loginMails(email).length;
  await call("POST", "/api/login", { body: { email } });
  const neu = loginMails(email).slice(vorher);
  const m = neu.at(-1);
  const link = m && (m.html.match(/href="([^"]*\/api\/auth\?token=[^"]+)"/) || [])[1];
  const token = link ? new URL(link.replace(/&amp;/g, "&")).searchParams.get("token") : "";
  const r = await formPost("/api/auth", { token, next: "/app.html" });
  return { anzahl: neu.length, mail: m, token, cookie: cookieAus(r), ort: r.headers.get("location") };
}

let browser = null;
try {
  teil("Vorbereitung: Lisa ist Inhaberin von A (Bamberg) und Team in B (Hof); C gehört Tom");
  const A = await studioAnlegen("lisa@ink-a.test", "Ink Studio A", "Bamberg");
  const B = await studioAnlegen("chef@ink-b.test", "Ink Studio B", "Hof");
  const C = await studioAnlegen("tom@ink-c.test", "Ink Studio C", "Forchheim");
  await admin(`studio/${B.id}/team`, { emails: ["lisa@ink-a.test"] });
  check(Boolean(A.id && B.id && C.id), "drei Studios live", [A.id, B.id, C.id].join());

  teil("Ein Login-Link für alle Studios der Adresse");
  const l1 = await webLogin("lisa@ink-a.test");
  const p1 = auth.verify(l1.token, "login");
  check(l1.anzahl === 1, "POST /api/login für eine Adresse mit zwei Studios → genau EINE Login-Mail (vorher je Studio eine)", `${l1.anzahl} Mails`);
  check(/alle deine Studios/.test(l1.mail?.subject || "") && /Ink Studio A \(Bamberg\)/.test(l1.mail?.html || "") && /Ink Studio B \(Hof\)/.test(l1.mail?.html || ""), "Mail nennt beide Studios mit Ort", l1.mail?.subject);
  check(p1?.email === "lisa@ink-a.test" && [A.id, B.id].includes(p1.sid), "Link trägt die Adresse (und ein Start-Studio)", JSON.stringify(p1));
  const c1 = cookieDaten(l1.cookie);
  check(l1.ort === "/app.html" && c1?.email === "lisa@ink-a.test" && c1.svs && A.id in c1.svs && B.id in c1.svs, "Nach dem Link: Sitzungs-Cookie mit Adresse und Sitzungsversionen beider Studios", JSON.stringify(c1));
  const start = (await call("GET", "/api/portal", { cookie: l1.cookie })).data.studio?.id;
  check(start === p1.sid, "Dashboard startet im Studio aus dem Link");
  const tomL = await webLogin("tom@ink-c.test");
  check(tomL.anzahl === 1 && /\(Ink Studio C\)/.test(tomL.mail?.subject || "") && !/alle deine Studios/.test(tomL.mail?.html || ""), "Adresse mit einem Studio: Mail wie bisher (Studioname im Betreff, kein Hinweis auf mehrere)", tomL.mail?.subject);

  teil("Liste und Wechsel im Dashboard");
  // Für die weiteren Schritte im Studio A starten
  let cookieA = l1.cookie;
  if (start !== A.id) cookieA = cookieAus(await call("POST", "/api/portal/studio-wechseln", { cookie: l1.cookie, body: { studioId: A.id } }));
  const st = await call("GET", "/api/portal/studios", { cookie: cookieA });
  const sA = st.data.studios?.find((x) => x.id === A.id), sB = st.data.studios?.find((x) => x.id === B.id);
  check(st.status === 200 && st.data.wechselMoeglich === true && st.data.email === "lisa@ink-a.test" && st.data.studios.length === 2 && sA?.rolle === "inhaber" && sA.aktuell && sB?.rolle === "team" && !sB.aktuell, "GET /api/portal/studios → beide Studios, Rolle je Studio, A aktuell", st.text);
  const w = await call("POST", "/api/portal/studio-wechseln", { cookie: cookieA, body: { studioId: B.id } });
  const cookieB = cookieAus(w);
  const cB = cookieDaten(cookieB), cA = cookieDaten(cookieA);
  check(w.status === 200 && w.data.studio?.id === B.id && cB?.sid === B.id && cB.email === "lisa@ink-a.test" && cB.exp === cA.exp, "POST /api/portal/studio-wechseln B → neues Cookie für B, gleiche Adresse, Ablauf bleibt (keine Verlängerung)", w.text);
  check((await call("GET", "/api/portal", { cookie: cookieB })).data.studio?.id === B.id && loginMails("lisa@ink-a.test").length === 1, "Mit dem neuen Cookie: Dashboard zeigt B, keine weitere Login-Mail");
  check((await call("GET", "/api/portal/studios", { cookie: cookieB })).data.studios.find((x) => x.aktuell)?.id === B.id, "Liste markiert jetzt B als aktuell");
  const fremd = await call("POST", "/api/portal/studio-wechseln", { cookie: cookieB, body: { studioId: C.id } });
  const unsinn = await call("POST", "/api/portal/studio-wechseln", { cookie: cookieB, body: { studioId: "st_gibtsnicht1" } });
  check(fremd.status === 403 && fremd.data.code === "kein_zugang" && !fremd.headers.get("set-cookie") && unsinn.status === 403, "Fremdes Studio (keine Rolle) → 403 kein_zugang, kein Cookie", fremd.text);
  check((await call("POST", "/api/portal/studio-wechseln", { body: { studioId: B.id } })).status === 401, "Ohne Anmeldung → 401");
  // Gefälschtes Cookie mit anderer Adresse geht nicht (Signatur)
  const falsch = cookieB.replace(/=([^.]+)\./, (_, d) => "=" + Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(d, "base64url").toString()), email: "tom@ink-c.test" })).toString("base64url") + ".");
  check((await call("GET", "/api/portal", { cookie: falsch })).status === 401, "Adresse im Cookie verändert → Signatur falsch → 401");

  teil("Alte Sitzungen (vor dem 23.11.) und Admin-Ansicht: kein Wechsel");
  const altCookie = auth.sessionCookie(await storeMod.getStudio(A.id)).split(";")[0];
  const altSt = await call("GET", "/api/portal/studios", { cookie: altCookie });
  const altW = await call("POST", "/api/portal/studio-wechseln", { cookie: altCookie, body: { studioId: B.id } });
  check(altSt.status === 200 && altSt.data.wechselMoeglich === false && altSt.data.studios.length === 0 && altW.status === 400 && altW.data.code === "neu_einloggen", "Cookie ohne Adresse → Liste leer, Wechsel 400 neu_einloggen (einmal neu einloggen)", altSt.text + altW.text);
  const ansicht = auth.ansichtCookie(B.id, "admin@wechsel.test").split(";")[0];
  check((await call("GET", "/api/portal/studios", { cookie: ansicht })).data.studios?.length === 0 && (await call("POST", "/api/portal/studio-wechseln", { cookie: ansicht, body: { studioId: A.id } })).status === 403, "Admin-Ansicht: keine Liste, Wechsel gesperrt (nur lesen)");

  teil("„Auf allen Geräten abmelden“ gilt je Studio");
  const chef = await webLogin("chef@ink-b.test");
  await call("POST", "/api/portal/abmelden", { cookie: chef.cookie, body: {} });
  check((await call("GET", "/api/portal", { cookie: cookieB })).status === 401, "Inhaber von B meldet alle ab → Lisas Sitzung in B ist weg");
  check((await call("GET", "/api/portal", { cookie: cookieA })).data.studio?.id === A.id, "Lisas Sitzung in A bleibt");
  const zurueck = await call("POST", "/api/portal/studio-wechseln", { cookie: cookieA, body: { studioId: B.id } });
  check(zurueck.status === 403 && zurueck.data.code === "neu_einloggen", "Wechsel von A nach B mit der alten Sitzung → 403 neu_einloggen (B hat alle abgemeldet)", zurueck.text);
  const l2 = await webLogin("lisa@ink-a.test");
  let c2 = l2.cookie;
  if (cookieDaten(c2).sid !== A.id) c2 = cookieAus(await call("POST", "/api/portal/studio-wechseln", { cookie: c2, body: { studioId: A.id } }));
  const nachNeu = await call("POST", "/api/portal/studio-wechseln", { cookie: c2, body: { studioId: B.id } });
  check(nachNeu.status === 200, "Nach neuem Login geht der Wechsel nach B wieder", nachNeu.text);

  teil("Rolle entzogen: Team-Adresse in B entfernt");
  const c2B = cookieAus(nachNeu);
  await admin(`studio/${B.id}/team`, { emails: [] });
  check((await call("GET", "/api/portal", { cookie: c2B })).status === 401, "Sitzung in B (Team) sofort ungültig: Server prüft die Rolle bei jedem Aufruf");
  const nurA = await call("GET", "/api/portal/studios", { cookie: c2 });
  check(nurA.data.studios?.length === 1 && nurA.data.studios[0].id === A.id, "Liste in A zeigt nur noch A (Knopf verschwindet)", nurA.text);
  check((await call("POST", "/api/portal/studio-wechseln", { cookie: c2, body: { studioId: B.id } })).data.code === "kein_zugang", "Wechsel nach B → 403 kein_zugang");
  await admin(`studio/${B.id}/team`, { emails: ["lisa@ink-a.test"] });
  const neuDazu = await call("GET", "/api/portal/studios", { cookie: c2 });
  check(neuDazu.data.studios?.length === 2, "Team-Adresse neu dazu → Studio steht beim nächsten Öffnen der Liste wieder da", neuDazu.text);

  teil("Abgelaufener Adress-Link: „Neuen Link schicken“");
  const altLink = auth.sign({ t: "login", sid: A.id, email: "lisa@ink-a.test", n: "abgelaufen-1", exp: Date.now() - 1000 });
  rlReset();
  const vorNeu = loginMails("lisa@ink-a.test").length;
  const neuR = await call("POST", "/api/login", { body: { neu: altLink } });
  const neuMail = loginMails("lisa@ink-a.test").at(-1);
  check(neuR.data.gesendet === true && /^l•••••@ink-a\.test$/.test(neuR.data.an) && loginMails("lisa@ink-a.test").length === vorNeu + 1 && /alle deine Studios/.test(neuMail.subject), "Neuer Link geht an dieselbe Adresse und gilt wieder für alle Studios", JSON.stringify(neuR.data));

  teil("Weiteres Studio anmelden (Falle vom 23.11.: Team-Adresse blockierte die Anmeldung)");
  await admin(`studio/${C.id}/team`, { emails: ["andy@partner.test"] });
  const andy = await call("POST", "/api/signup", { body: { ...DATEN("andy@partner.test", "Andys Studio", "Landshut"), paket: "monatlich" } });
  check(andy.status === 200 && Boolean(andy.data.url), "Team-Adresse von C meldet ein eigenes Studio an → erlaubt", andy.text);
  const doppelt = await call("POST", "/api/signup", { body: { ...DATEN("lisa@ink-a.test", "Lisas Zweitstudio", "Bamberg"), paket: "monatlich" } });
  check(doppelt.status === 409 && /schon einen Vertrag/.test(doppelt.data.error), "Inhaber-Adresse eines aktiven Studios ohne Einladung → weiter 409 (Schutz vor doppelten Verträgen)", doppelt.text);
  const code = crypto.randomBytes(9).toString("base64url");
  await storeMod.store.set(`geschenk/${code}`, { code, email: "lisa@ink-a.test", firma: "Lisas Zweitstudio", bezeichnung: "Partner – nur Zahlungsgebühren", erstellt: new Date().toISOString(), benutzt: null });
  const mitEinladung = await call("POST", "/api/signup", { body: { ...DATEN("lisa@ink-a.test", "Lisas Zweitstudio", "Bamberg"), geschenk: code } });
  const alleLisa = (await admin("studios")).filter((s) => s.email === "lisa@ink-a.test");
  check(mitEinladung.status === 200 && alleLisa.length === 2 && alleLisa.some((s) => s.id === A.id && s.status === "live"), "Inhaber-Adresse MIT Einladung für genau diese Adresse → neues Studio, das bestehende A bleibt unverändert", mitEinladung.text.slice(0, 200));
  const fremdEinladung = crypto.randomBytes(9).toString("base64url");
  await storeMod.store.set(`geschenk/${fremdEinladung}`, { code: fremdEinladung, email: "jemand@anders.test", firma: "X", erstellt: new Date().toISOString(), benutzt: null });
  check((await call("POST", "/api/signup", { body: { ...DATEN("tom@ink-c.test", "Toms Zweitstudio", "Forchheim"), geschenk: fremdEinladung } })).status === 409, "Einladung für eine andere Adresse hebt die Sperre nicht auf");

  if (chromium) {
    teil("Oberfläche im Dashboard (Chromium): Knopf, Dialog, Tastatur, 320 px");
    browser = await chromium.launch();
    const l3 = await webLogin("lisa@ink-a.test");
    let c3 = l3.cookie;
    if (cookieDaten(c3).sid !== A.id) c3 = cookieAus(await call("POST", "/api/portal/studio-wechseln", { cookie: c3, body: { studioId: A.id } }));
    for (const [breite, hoehe] of [[390, 844], [320, 568], [1280, 800]]) {
      const ctx = await browser.newContext({ viewport: { width: breite, height: hoehe } });
      const [name, wert] = c3.split("=");
      await ctx.addCookies([{ name, value: wert, url: BASE }]);
      const page = await ctx.newPage();
      await page.goto(`${BASE}/app.html#start`);
      await page.waitForSelector("#studio-wechsel:not(.hidden)", { timeout: 8000 });
      const m = await page.evaluate(() => {
        const k = document.getElementById("studio-wechsel").getBoundingClientRect(), top = document.querySelector(".app-top").getBoundingClientRect();
        const st = document.getElementById("top-status").getBoundingClientRect();
        return { breit: document.documentElement.scrollWidth, fenster: innerWidth, kH: k.height, kRechts: k.right, topH: top.height, ueberlapp: k.right > st.left + 1, firma: document.getElementById("top-firma").textContent };
      });
      check(m.breit <= m.fenster && m.kH >= 44 && !m.ueberlapp && m.topH < 80 && m.firma === "Ink Studio A", `${breite}×${hoehe}: Knopf „Studio wechseln“ sichtbar, mind. 44 px hoch, überdeckt nichts, kein Querscrollen`, JSON.stringify(m));
      if (breite === 390) {
        await page.keyboard.press("Tab");
        await page.focus("#studio-wechsel");
        await page.keyboard.press("Enter");
        await page.waitForSelector("#studio-dialog[open]");
        const d = await page.evaluate(() => ({ zeilen: [...document.querySelectorAll("#studio-liste button")].map((b) => b.innerText.replace(/\s+/g, " ").trim()), aktuell: document.querySelector('#studio-liste [aria-current="true"]')?.innerText || "", fokus: document.activeElement?.getAttribute("data-studio") || "", email: document.getElementById("studio-dialog-email").textContent }));
        check(d.zeilen.length === 3 && d.zeilen.some((z) => /Lisas Zweitstudio Bamberg · Inhaber/.test(z)) && d.zeilen.some((z) => /Ink Studio A Bamberg · Inhaber Aktuell/.test(z)) && d.zeilen.some((z) => /Ink Studio B Hof · Team/.test(z)) && /Ink Studio A/.test(d.aktuell) && d.email === "lisa@ink-a.test", "Dialog: alle drei Studios (auch das neue Zweitstudio) mit Name, Ort, Rolle, aktuelles markiert (aria-current), Adresse genannt", JSON.stringify(d));
        check(Boolean(d.fokus), "Tastatur: Enter öffnet den Dialog, Fokus steht in der Liste", d.fokus);
        await page.keyboard.press("Escape");
        check(!(await page.evaluate(() => document.getElementById("studio-dialog").open)), "Escape schließt den Dialog");
        await page.click("#studio-wechsel");
        await Promise.all([page.waitForEvent("load"), page.click(`#studio-liste button[data-studio="${B.id}"]`)]);
        await page.waitForFunction(() => document.getElementById("top-firma").textContent === "Ink Studio B", null, { timeout: 8000 });
        const toast = await page.waitForSelector("#toast:not(.hidden)", { timeout: 4000 }).then((t) => t.innerText()).catch(() => "");
        check(/Ink Studio B/.test(toast), "Antippen von B → Seite lädt neu, oben steht Ink Studio B, Hinweis „Du bist jetzt in Ink Studio B.“", toast);
        const mehr = await page.evaluate(() => { location.hash = "#mehr"; return new Promise((r) => setTimeout(() => r(!document.getElementById("studio-wechsel-2").classList.contains("hidden")), 400)); });
        check(mehr, "Auch unter „Mehr“ (bei Abmelden) gibt es „Studio wechseln“");
      }
      await ctx.close();
    }
    // Ein Studio: kein Knopf
    const tomCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const t2 = await webLogin("tom@ink-c.test");
    const [tn, tw] = t2.cookie.split("=");
    await tomCtx.addCookies([{ name: tn, value: tw, url: BASE }]);
    const tp = await tomCtx.newPage();
    await tp.goto(`${BASE}/app.html#start`);
    await tp.waitForSelector("#top-firma:text('Ink Studio C')", { timeout: 8000 });
    await wait(500);
    check(await tp.evaluate(() => document.getElementById("studio-wechsel").classList.contains("hidden") && document.getElementById("studio-wechsel-2").classList.contains("hidden")), "Adresse mit einem Studio: kein Knopf „Studio wechseln“");
    await tomCtx.close();
  } else {
    console.log("\n(Playwright nicht gefunden: Oberflächen-Teil übersprungen)");
  }
} catch (e) {
  fehler++;
  console.error("ABBRUCH:", e);
}
if (browser) await browser.close();
console.log(`\n${ok} bestanden, ${fehler} fehlgeschlagen · Daten: ${dataDir}`);
if (!fehler) fs.rmSync(dataDir, { recursive: true, force: true });
process.exit(fehler ? 1 : 0);
