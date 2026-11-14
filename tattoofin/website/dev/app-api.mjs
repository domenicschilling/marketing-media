// Test der App-API (Tattoofin-App für Studios) mit Stripe-Nachbau und APNs-Nachbau (HTTP/2 ohne TLS), ohne Browser.
//   NODE_PATH=… node dev/app-api.mjs        → Protokoll, Exit-Code 1 bei Fehlern
// Prüft Anmeldung per Code (inkl. Missbrauch: falscher Code, Ablauf, Grenzen, fremdes Studio, widerrufenes Token), Geräte, Push,
// Auszahlungen, Team, Review-/Demo-Zugang, Konto löschen und die Erweiterungen von /api/portal.
// Teil „Apple-Abo“ (seit 14.11.2026): neues Studio in der App, Kauf per StoreKit 2 (JWS mit Test-Zertifikatskette aus dev/apple-nachbau.mjs),
// Fälschungen, Server-Benachrichtigungen V2, Sperre/Öffnen, Kündigung, Wiederherstellen, Abrechnung, Rechtstexte.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { startDev } from "./server.mjs";
import { startApnsNachbau, testSchluessel } from "./apns-nachbau.mjs";
import { sendeWebhook } from "../netlify/functions/_lib/stripe-sim.mjs";
import { appleNachbau } from "./apple-nachbau.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.APP_TEST_PORT || 8894), BASE = `http://localhost:${PORT}`, STRIPE = `http://localhost:${Number(process.env.STRIPE_MOCK_PORT || 12111)}`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "tf-app-api-"));
for (const k of ["RESEND_API_KEY", "SMTP_HOST", "APNS_KEY_P8", "APNS_KEY_P8_BASE64", "APNS_KEY_ID", "APNS_TEAM_ID", "APP_REVIEW_EMAIL", "APP_REVIEW_CODE", "APP_REVIEW_STUDIO_ID", "APP_REVIEW_REG_EMAIL", "APP_LOKAL_CODE", "TF_JETZT", "APPLE_XCODE_TEST", "APPLE_SANDBOX_STRIPE", "APPLE_APP_ID", "APPLE_BUNDLE_ID", "APPLE_PRODUKT_ID"]) delete process.env[k];
// Apple-Nachbau: Test-Wurzel statt Apple Root CA - G3 (wirkt nur lokal, siehe config.nurLokal)
const apple = appleNachbau();
process.env.APPLE_TEST_ROOT_PEM = apple.rootPem;
process.env.TF_BEZAHLFELD = "aus";              // wie live: Stripe-Checkout
process.env.ADMIN_EMAIL = "admin@app.test";
await startDev({ port: PORT, mock: true, dataDir, quiet: true });
const auth = await import("../netlify/functions/_lib/auth.mjs");
const geraeteLib = await import("../netlify/functions/_lib/app-geraete.mjs");
const storeMod = await import("../netlify/functions/_lib/store.mjs");

let ok = 0, fehler = 0;
const check = (cond, name, beweis = "") => { if (cond) { ok++; console.log("  ✓", name); } else { fehler++; console.log("  ✗", name, beweis ? `  [${String(beweis).slice(0, 300)}]` : ""); } };
const teil = (t) => console.log("\n" + t);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Helfer ----------
const call = async (method, url, { token, cookie, body, headers = {} } = {}) => {
  const r = await fetch(BASE + url, { method, headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}), ...(cookie ? { cookie } : {}), ...headers }, body: body !== undefined ? JSON.stringify(body) : undefined, redirect: "manual" });
  const text = await r.text();
  let data = {}; try { data = JSON.parse(text); } catch { data = { _text: text.slice(0, 200) }; }
  return { status: r.status, data, headers: r.headers, text };
};
const admin = (p, body, method) => call(method || (body !== undefined ? "POST" : "GET"), "/api/admin/" + p, { body, headers: { authorization: "Bearer admin" } }).then((r) => r.data);
const stripeForm = (url, felder = {}) => fetch(STRIPE + url, { method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(felder) });
const mock = (p, body) => fetch(`${STRIPE}/mock/${p}`, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : undefined).then((r) => r.json());
const dateien = (prefix) => fs.readdirSync(dataDir).filter((f) => f.startsWith(encodeURIComponent(prefix)));
const blob = (k) => { try { return JSON.parse(fs.readFileSync(path.join(dataDir, encodeURIComponent(k) + ".json"), "utf8")); } catch { return null; } };
const setBlob = (k, v) => fs.writeFileSync(path.join(dataDir, encodeURIComponent(k) + ".json"), JSON.stringify(v, null, 2));
const mails = () => dateien("mail/").map((f) => JSON.parse(fs.readFileSync(path.join(dataDir, f)))).sort((a, b) => a.at.localeCompare(b.at));
const mailsAn = (to) => mails().filter((m) => [].concat(m.to).includes(to));
const logs = (typ) => dateien("log/").map((f) => JSON.parse(fs.readFileSync(path.join(dataDir, f)))).filter((l) => l.type === typ);
// Grenzen (Rate-Limits) der App zurücksetzen, damit die Abschnitte unabhängig sind
const rlReset = () => { for (const f of fs.readdirSync(dataDir)) if (/^rl%2Fapp/.test(f)) fs.rmSync(path.join(dataDir, f)); };
const codeMail = (to) => mailsAn(to).filter((m) => /ist dein Tattoofin-Code$/.test(m.subject)).at(-1);
const codeAus = (m) => (m?.subject.match(/^(\d{6}) /) || [])[1];
const GERAET = (name = "iPhone von Lisa", platform = "ios") => ({ name, modell: "iPhone17,1", platform, osVersion: "27.2", appVersion: "1.0 (1)" });
async function codeAnfordern(email) { const vorher = mailsAn(email).length; const r = await call("POST", "/api/app/code", { body: { email, platform: "ios" } }); return { r, neu: mailsAn(email).length > vorher, code: codeAus(codeMail(email)) }; }
async function appLogin(email, geraet = GERAET()) {
  rlReset();
  const { code } = await codeAnfordern(email);
  const r = await call("POST", "/api/app/anmelden", { body: { email, code, geraet } });
  return r.data;
}
// Lisa (A) anmelden: mit Auswahl, solange sie auch Team-Adresse von B ist, sonst direkt
async function loginA(idA, name) {
  const l = await appLogin("lisa@ink-a.test", GERAET(name));
  if (l.token) return l.token;
  return (await call("POST", "/api/app/anmelden", { body: { auswahlToken: l.auswahlToken, studioId: idA, geraet: GERAET(name) } })).data.token;
}
const DATEN = (email, firma, ort = "Bamberg") => ({ firma, inhaber: "Alex Muster", strasse: "Musterstr. 1", plz: "96047", ort, email, telefon: "0151 1234567", studioTelefon: "0951 123456", unterzeichner: "Alex Muster", akzeptiert: { vertrag: true, avv: true, unternehmer: true, kmu: true } });
// Studio wie im Leben: Anmeldung Paket Monatlich → Checkout bezahlt → Stripe-Konto eingerichtet → live
async function studioAnlegen(email, firma, ort) {
  const r = await call("POST", "/api/signup", { body: { ...DATEN(email, firma, ort), paket: "monatlich" } });
  const cookie = (r.headers.get("set-cookie") || "").split(";")[0];
  await stripeForm(new URL(r.data.url).pathname, { pm: "card" });
  await wait(150);
  const sess = await call("POST", "/api/portal/stripe-session", { cookie });
  await stripeForm(`/onboarding-fertig/${sess.data.konto}`, { name: "Alex Muster", iban: "DE89370400440532013000" });
  await wait(150);
  const id = (await admin("studios")).find((s) => s.email === email)?.id;
  await admin(`studio/${id}/live`, {});
  return { id, cookie, konto: sess.data.konto };
}
// Zahlungslink über die App anlegen und im Stripe-Checkout (Nachbau) bezahlen
async function zahlungBezahlen(token, daten) {
  const z = await call("POST", "/api/portal/zahlung", { token, body: daten });
  const p = await call("POST", "/api/pay", { body: { z: z.data.zahlung.id, inhaltOk: true, bedingungen: true } });
  await stripeForm(new URL(p.data.url).pathname, { pm: "card" });
  await wait(250);
  return z.data.zahlung.id;
}

// Text einer Seite ohne die Teile mit data-nur-web (so sieht die App-Fassung von vertrag.html nach dem Skript aus)
function ohneNurWeb(html) {
  const LEER = new Set(["br", "img", "meta", "link", "input", "hr", "source", "wbr"]);
  const stapel = [];
  let aus = "", zuletzt = 0, m;
  const versteckt = () => stapel.some((x) => x.web);
  const re = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>/g;
  while ((m = re.exec(html))) {
    if (!versteckt()) aus += html.slice(zuletzt, m.index);
    const [ganz, zu, name, attr] = m, tag = name.toLowerCase();
    if (zu) { for (let k = stapel.length - 1; k >= 0; k--) if (stapel[k].tag === tag) { stapel.length = k; break; } }
    else {
      if (!versteckt()) aus += ganz;
      if (!LEER.has(tag) && !attr.endsWith("/")) stapel.push({ tag, web: /(^|\s)data-nur-web(\s|=|$)/.test(attr) });
    }
    zuletzt = re.lastIndex;
  }
  return versteckt() ? aus : aus + html.slice(zuletzt);
}

try {
  // ==================================================================================================
  teil("Vorbereitung: drei Studios (A, B mit Team-Adresse = Inhaberin von A, C)");
  const A = await studioAnlegen("lisa@ink-a.test", "Ink Studio A", "Bamberg");
  const B = await studioAnlegen("chef@ink-b.test", "Ink Studio B", "Hof");
  const C = await studioAnlegen("tom@ink-c.test", "Ink Studio C", "Forchheim");
  await admin(`studio/${B.id}/team`, { emails: ["lisa@ink-a.test"] });
  check(A.id && B.id && C.id && A.konto && B.konto, "Drei Studios mit Stripe-Konto (Nachbau)", `${A.id} ${B.id} ${C.id}`);

  // ==================================================================================================
  teil("Code anfordern: Mail, identische Antwort, Methode, Grenzen");
  rlReset();
  const c1 = await codeAnfordern("tom@ink-c.test");
  const m1 = codeMail("tom@ink-c.test");
  check(c1.r.status === 200 && c1.r.data.ok === true && c1.r.data.verzoegert === false && c1.r.headers.get("cache-control") === "no-store", "POST /api/app/code → 200 {ok:true, verzoegert:false}, Cache-Control: no-store", c1.r.text);
  check(Boolean(m1) && /^\d{6} ist dein Tattoofin-Code$/.test(m1.subject) && /10 Minuten/.test(m1.html) && /Nicht angefordert\? Ignoriere diese Mail\./.test(m1.html), "Code-Mail landet im Mail-Protokoll (.data/mail%2F…): Betreff „<code> ist dein Tattoofin-Code“, gilt 10 Minuten, Hinweis", m1?.subject);
  const rec = blob(dateien("appcode/")[0]?.replace(/\.json$/, "") ? decodeURIComponent(dateien("appcode/")[0].replace(/\.json$/, "")) : "");
  check(rec && /^[0-9a-f]{64}$/.test(rec.codeHash) && !JSON.stringify(rec).includes(c1.code) && rec.versuche === 0 && rec.studioIds?.[0] === C.id && rec.exp - Date.now() > 9 * 60e3 && rec.exp - Date.now() <= 10 * 60e3, "Gespeichert nur als HMAC (kein Klartext-Code), 10 Minuten, Studio-IDs", JSON.stringify(rec)?.slice(0, 160));
  const unbekannt = await call("POST", "/api/app/code", { body: { email: "niemand@nirgends.test", platform: "ios" } });
  check(unbekannt.status === 200 && unbekannt.text === c1.r.text && mailsAn("niemand@nirgends.test").length === 0, "Unbekannte Adresse: gleiche Antwort, keine Mail", unbekannt.text);
  check((await call("GET", "/api/app/code")).status === 405 && (await call("GET", "/api/app/anmelden")).status === 405, "Andere Methode als POST → 405");
  rlReset();
  let mailN = 0; for (let i = 0; i < 4; i++) if ((await codeAnfordern("tom@ink-c.test")).neu) mailN++;
  check(mailN === 3, "Grenze je Adresse: 4 Anforderungen in 15 Minuten → nur 3 Mails (Antwort trotzdem ok)", `${mailN} Mails`);
  rlReset();
  for (let i = 0; i < 20; i++) await call("POST", "/api/app/code", { body: { email: `x${i}@nirgends.test` } });
  const ip21 = await codeAnfordern("tom@ink-c.test");
  check(ip21.r.status === 200 && ip21.r.data.ok === true && !ip21.neu, "Grenze je IP: nach 20 Anforderungen pro Stunde wird still nichts mehr gesendet", `neu=${ip21.neu}`);

  // ==================================================================================================
  teil("Anmelden: Eingaben, falscher Code, Sperre, Ablauf, Erfolg, Einmal-Verwendung");
  rlReset();
  const cA = await codeAnfordern("tom@ink-c.test");
  check((await call("POST", "/api/app/anmelden", { body: { email: "tom@ink-c.test", code: cA.code, geraet: { ...GERAET(), platform: "windows" } } })).data.code === "platform", "Unbekannte Plattform → 400 platform");
  const ein = await call("POST", "/api/app/anmelden", { body: { email: "tom@ink-c.test", code: "12345", geraet: GERAET() } });
  check(ein.status === 400 && ein.data.code === "eingabe" && ein.data.error === "Bitte E-Mail und den 6-stelligen Code eingeben.", "5-stelliger Code → 400 eingabe", ein.text);
  const falsch = cA.code === "000000" ? "111111" : "000000";
  const rest = [];
  for (let i = 0; i < 4; i++) { const r = await call("POST", "/api/app/anmelden", { body: { email: "tom@ink-c.test", code: falsch, geraet: GERAET() } }); rest.push(`${r.status}/${r.data.code}/${r.data.restVersuche}`); }
  check(rest.join(",") === "400/code_falsch/4,400/code_falsch/3,400/code_falsch/2,400/code_falsch/1", "Falscher Code 4× → 400 code_falsch mit restVersuche 4, 3, 2, 1", rest.join(","));
  const fuenf = await call("POST", "/api/app/anmelden", { body: { email: "tom@ink-c.test", code: falsch, geraet: GERAET() } });
  check(fuenf.status === 410 && fuenf.data.code === "code_gesperrt", "5. Fehlversuch → 410 code_gesperrt", fuenf.text);
  const nachSperre = await call("POST", "/api/app/anmelden", { body: { email: "tom@ink-c.test", code: cA.code, geraet: GERAET() } });
  check(nachSperre.status === 410 && nachSperre.data.code === "code_abgelaufen", "Nach der Sperre ist auch der richtige Code weg → 410 code_abgelaufen", nachSperre.text);
  rlReset();
  const cAb = await codeAnfordern("tom@ink-c.test");
  const key = decodeURIComponent(dateien("appcode/")[0].replace(/\.json$/, ""));
  setBlob(key, { ...blob(key), exp: Date.now() - 1000 });
  const abgelaufen = await call("POST", "/api/app/anmelden", { body: { email: "tom@ink-c.test", code: cAb.code, geraet: GERAET() } });
  check(abgelaufen.status === 410 && abgelaufen.data.code === "code_abgelaufen" && abgelaufen.data.error === "Der Code ist abgelaufen. Fordere einfach einen neuen an.", "Abgelaufener Code (exp in der Vergangenheit) → 410 code_abgelaufen", abgelaufen.text);
  rlReset();
  const cOk = await codeAnfordern("tom@ink-c.test");
  const login = await call("POST", "/api/app/anmelden", { body: { email: "Tom@Ink-C.test ", code: cOk.code, geraet: GERAET("iPhone Theke") } });
  const tC = login.data.token;
  check(login.status === 200 && /^tfa_ag_[A-Za-z0-9_-]{12}\.[A-Za-z0-9_-]{43}$/.test(tC || "") && login.data.geraet.rolle === "inhaber" && login.data.geraet.name === "iPhone Theke" && login.data.studio.id === C.id && login.data.studio.ort === "Forchheim" && login.headers.get("cache-control") === "no-store", "Richtiger Code (Adresse in anderer Schreibweise) → Token tfa_ag_….<43 Zeichen>, Rolle inhaber, Studio", login.text.slice(0, 200));
  const g1 = blob(`appgeraet/${C.id}/${login.data.geraet.id}`);
  check(g1 && /^[0-9a-f]{64}$/.test(g1.tokenHash) && !JSON.stringify(g1).includes(tC.split(".")[1]) && blob("idx/appgeraet/" + g1.id) === C.id && g1.sv === 0 && g1.mitteilungen.zahlungen === true && g1.push === null, "Gespeichert nur sha256 des Geheimnisses, Index idx/appgeraet, Mitteilungen an, kein Push", JSON.stringify(g1).slice(0, 200));
  const nochmal = await call("POST", "/api/app/anmelden", { body: { email: "tom@ink-c.test", code: cOk.code, geraet: GERAET() } });
  check(nochmal.status === 410 && nochmal.data.code === "code_abgelaufen", "Code ein zweites Mal → 410 (nur einmal verwendbar)", nochmal.text);
  check(mailsAn("tom@ink-c.test").some((m) => m.subject === "Neues Gerät angemeldet: iPhone Theke"), "Mail an die Hauptadresse „Neues Gerät angemeldet: iPhone Theke“");
  check(logs("app-anmeldung").some((l) => l.studioId === C.id && l.platform === "ios" && l.rolle === "inhaber"), "Protokoll app-anmeldung (Studio, Gerät, Plattform, Rolle)");
  rlReset();
  let r429; for (let i = 0; i < 31; i++) r429 = await call("POST", "/api/app/anmelden", { body: { email: "tom@ink-c.test", code: "999999", geraet: GERAET() } });
  check(r429.status === 429 && r429.data.code === "zu_viele" && r429.data.error === "Zu viele Versuche. Bitte warte kurz.", "Grenze je IP: 31. Anmeldeversuch in der Stunde → 429 zu_viele", r429.text);
  rlReset();

  // ==================================================================================================
  teil("Grenzen atomar: 50 gleichzeitige Versuche, Tagesgrenzen je Adresse");
  const plaetze = (prefix) => dateien(prefix).map((f) => decodeURIComponent(f.replace(/\.json$/, ""))).filter((k) => /\/\d+$/.test(k));
  const cP = await codeAnfordern("tom@ink-c.test");
  const falschP = cP.code === "000000" ? "111111" : "000000";
  const par = await Promise.all(Array.from({ length: 50 }, (_, i) => call("POST", "/api/app/anmelden", { body: { email: "tom@ink-c.test", code: i === 49 ? cP.code : falschP, geraet: GERAET("Parallel") } })));
  const pFalsch = par.filter((r) => r.data.code === "code_falsch").length, pOk = par.filter((r) => r.status === 200).length, pIp = par.filter((r) => r.data.code === "zu_viele").length;
  check(pIp === 20 && pFalsch <= 4 && pOk <= 1 && plaetze("rl/appversuch/").length === 5 && plaetze("rl/appversuch-tag/").length === 15, "50 gleichzeitige Anmelde-Versuche: genau 30 durch die IP-Grenze, 15 durch die Tagesgrenze der Adresse, höchstens 5 Code-Vergleiche (5 Plätze)", `ip=${pIp} falsch=${pFalsch} ok=${pOk} plaetze=${plaetze("rl/appversuch/").length}/${plaetze("rl/appversuch-tag/").length}`);
  rlReset();
  const parCode = await Promise.all(Array.from({ length: 40 }, (_, i) => call("POST", "/api/app/code", { body: { email: `p${i}@nirgends.test` } })));
  check(parCode.every((r) => r.status === 200) && plaetze("rl/appcode-ip/").length === 20, "40 gleichzeitige Code-Anforderungen: genau 20 Plätze je IP und Stunde belegt", `${plaetze("rl/appcode-ip/").length}`);
  rlReset();
  await codeAnfordern("tom@ink-c.test");
  const tagMail = plaetze("rl/appcode-tag/")[0];
  for (let n = 2; n <= 10; n++) setBlob(tagMail.replace(/\/1$/, "/" + n), { am: Date.now() });
  for (const f of dateien("rl/appcode-mail/")) fs.rmSync(path.join(dataDir, f));
  const elf = await codeAnfordern("tom@ink-c.test");
  check(Boolean(tagMail) && elf.r.status === 200 && elf.r.data.ok === true && !elf.neu, "Tagesgrenze je Adresse: die 11. Code-Mail an einem Tag wird still nicht gesendet (Antwort gleich)", `neu=${elf.neu}`);
  rlReset();
  const cT = await codeAnfordern("tom@ink-c.test");
  const fT = await call("POST", "/api/app/anmelden", { body: { email: "tom@ink-c.test", code: cT.code === "000000" ? "111111" : "000000", geraet: GERAET() } });
  const tagV = plaetze("rl/appversuch-tag/")[0];
  for (let n = 2; n <= 15; n++) setBlob(tagV.replace(/\/1$/, "/" + n), { am: Date.now() });
  const sechzehn = await call("POST", "/api/app/anmelden", { body: { email: "tom@ink-c.test", code: cT.code, geraet: GERAET() } });
  check(fT.data.code === "code_falsch" && sechzehn.status === 429 && sechzehn.data.code === "zu_viele_heute" && mailsAn("admin@app.test").some((m) => /sehr viele Code-Versuche/.test(m.subject)), "Tagesgrenze je Adresse: nach 15 Versuchen (über alle Codes) → 429 zu_viele_heute, auch mit richtigem Code; Admin bekommt einen Hinweis", sechzehn.text);
  setBlob("rl/appcode-ip/alt/1500000000000/1", { am: 1 });
  const jobsRl = await admin("jobs", {});
  check(!blob("rl/appcode-ip/alt/1500000000000/1") && Boolean(blob(tagV)) && JSON.stringify(jobsRl).includes("app-grenzen-aufgeraeumt"), "Tägliche Jobs löschen abgelaufene Plätze der Grenzen, laufende bleiben", JSON.stringify(jobsRl).slice(0, 160));
  rlReset();

  // ==================================================================================================
  teil("Mehrere Studios: Auswahl mit Einmal-Token");
  const cM = await codeAnfordern("lisa@ink-a.test");
  const mz = await call("POST", "/api/app/anmelden", { body: { email: "lisa@ink-a.test", code: cM.code, geraet: GERAET() } });
  check(mz.status === 200 && mz.data.auswahl?.length === 2 && mz.data.auswahl.some((x) => x.id === A.id && x.firma === "Ink Studio A" && x.ort === "Bamberg") && mz.data.auswahl.some((x) => x.id === B.id) && !mz.data.token, "Adresse ist Inhaberin von A und Team von B → Auswahl mit beiden Studios, noch kein Token", mz.text.slice(0, 200));
  const p0 = auth.verify(mz.data.auswahlToken, "appauswahl");
  check(p0 && p0.exp - Date.now() <= 5 * 60e3 && p0.n && p0.ids.length === 2, "auswahlToken ist signiert, 5 Minuten gültig, mit Einmal-Kennung", JSON.stringify(p0));
  const fremdeWahl = await call("POST", "/api/app/anmelden", { body: { auswahlToken: mz.data.auswahlToken, studioId: C.id, geraet: GERAET() } });
  check(fremdeWahl.status === 400 && fremdeWahl.data.code === "auswahl", "Auswahl eines fremden Studios (nicht in ids) → 400 auswahl", fremdeWahl.text);
  const wahlB = await call("POST", "/api/app/anmelden", { body: { auswahlToken: mz.data.auswahlToken, studioId: B.id, geraet: GERAET("iPhone von Lisa (B)") } });
  const tLisaB = wahlB.data.token;
  check(wahlB.status === 200 && wahlB.data.geraet.rolle === "team" && wahlB.data.studio.id === B.id, "Auswahl Studio B → Token mit Rolle team", wahlB.text.slice(0, 160));
  const wahlNochmal = await call("POST", "/api/app/anmelden", { body: { auswahlToken: mz.data.auswahlToken, studioId: A.id, geraet: GERAET() } });
  check(wahlNochmal.status === 400 && wahlNochmal.data.code === "auswahl", "Gleiches auswahlToken ein zweites Mal → 400 auswahl", wahlNochmal.text);
  const altTok = auth.sign({ t: "appauswahl", email: "lisa@ink-a.test", ids: [A.id, B.id], exp: Date.now() - 1000, n: "abgelaufen-1" });
  check((await call("POST", "/api/app/anmelden", { body: { auswahlToken: altTok, studioId: A.id, geraet: GERAET() } })).data.code === "auswahl", "Abgelaufenes auswahlToken → 400 auswahl");
  const gefaelscht = mz.data.auswahlToken.slice(0, -3) + (mz.data.auswahlToken.endsWith("A") ? "BBB" : "AAA");
  check((await call("POST", "/api/app/anmelden", { body: { auswahlToken: gefaelscht, studioId: A.id, geraet: GERAET() } })).data.code === "auswahl", "Verfälschtes auswahlToken → 400 auswahl");
  const lA = await appLogin("lisa@ink-a.test");
  const wahlA = await call("POST", "/api/app/anmelden", { body: { auswahlToken: lA.auswahlToken, studioId: A.id, geraet: GERAET() } });
  const tA = wahlA.data.token;
  check(wahlA.data.geraet?.rolle === "inhaber" && wahlA.data.studio?.id === A.id, "Gleiche Adresse für Studio A → Rolle inhaber");
  const lB = await appLogin("chef@ink-b.test");
  const tB = lB.token;
  check(lB.geraet?.rolle === "inhaber" && lB.studio?.id === B.id, "Inhaber von B (ein Studio) → direkt Token");

  // ==================================================================================================
  teil("Token für /api/portal, Vorrang vor dem Cookie, kein Rückfall, 401-Format");
  const pA = await call("GET", "/api/portal", { token: tA });
  check(pA.status === 200 && pA.data.studio?.id === A.id, "Bearer tfa_ gilt für GET /api/portal", pA.status);
  const vorrang = await call("GET", "/api/portal", { token: tA, cookie: C.cookie });
  check(vorrang.data.studio?.id === A.id, "Bearer schlägt Cookie (Cookie von C, Token von A → Studio A)");
  const kaputt = tA.slice(0, -2) + (tA.endsWith("AA") ? "BB" : "AA");
  const r401 = await call("GET", "/api/portal", { token: kaputt, cookie: C.cookie });
  check(r401.status === 401 && r401.data.error === "Bitte einloggen" && r401.data.code === "nicht_angemeldet", "Falsches tfa_-Token + gültiges Cookie → 401 nicht_angemeldet (kein Rückfall aufs Cookie)", r401.text);
  check((await call("GET", "/api/app/geraete", { token: "tfa_kaputt" })).status === 401 && (await call("GET", "/api/app/geraete", { cookie: C.cookie })).status === 401, "App-Endpunkte: kaputtes Token oder nur Cookie → 401");
  check((await call("GET", "/api/portal", { cookie: C.cookie })).data.studio?.id === C.id, "Ohne tfa_-Header: Cookie wie bisher");
  check((await call("GET", "/api/admin/studios", { headers: { authorization: "Bearer " + tA } })).status === 401, "App-Token ist nie ein Admin-Token");
  const fremdZ = await call("POST", "/api/portal/zahlung", { token: tC, body: { betrag: "100", kunde: "Fremd", beschreibung: "Test" } });
  check((await call("GET", `/api/portal/zahlung/${fremdZ.data.zahlung.id}`, { token: tA })).status === 404 && (await call("DELETE", `/api/portal/zahlung/${fremdZ.data.zahlung.id}`, { token: tA })).status === 404, "Fremde Zahlung (Studio C) mit Token von A → 404");

  // ==================================================================================================
  teil("Sperren: nur_web und nur_inhaber");
  const nurWeb = [];
  for (const [m, u] of [["POST", "/api/portal/stripe-session"], ["POST", "/api/portal/rechnungen"], ["POST", "/api/portal/aufsteller"], ["POST", "/api/portal/aufsteller-pruefen"], ["POST", "/api/portal/umstellung"], ["POST", "/api/portal/erstattung/zl_x"]]) {
    const r = await call(m, u, { token: tA, body: {} });
    nurWeb.push(r.status === 403 && r.data.code === "nur_web" && r.data.error === "Das geht nur im Dashboard.");
  }
  check(nurWeb.every(Boolean), "Mit App-Token gesperrt (403 nur_web): stripe-session, rechnungen, aufsteller, aufsteller-pruefen, umstellung, erstattung", nurWeb.join(","));
  check((await call("POST", "/api/portal/stripe-session", { cookie: A.cookie })).status === 200, "Im Dashboard (Cookie) geht stripe-session weiter");
  const teamPut = await call("PUT", "/api/app/team", { token: tLisaB, body: { emails: [] } });
  const teamLoesch = await call("POST", "/api/app/konto-loeschen", { token: tLisaB, body: { bestaetigung: "LÖSCHEN" } });
  check(teamPut.status === 403 && teamPut.data.code === "nur_inhaber" && teamLoesch.status === 403 && teamLoesch.data.code === "nur_inhaber", "Team-Rolle: Team ändern und Konto löschen → 403 nur_inhaber", `${teamPut.text} ${teamLoesch.text}`);
  const gB = (await call("GET", "/api/app/geraete", { token: tLisaB })).data.geraete;
  const chefGeraet = gB.find((x) => x.rolle === "inhaber");
  const fremdAb = await call("DELETE", `/api/app/geraete/${chefGeraet.id}`, { token: tLisaB });
  check(fremdAb.status === 403 && fremdAb.data.code === "nur_inhaber" && fremdAb.data.error === "Nur der Inhaber kann fremde Geräte abmelden.", "Team kann das Gerät des Inhabers nicht abmelden → 403 nur_inhaber", fremdAb.text);
  check(/•••••@ink-b\.test$/.test(chefGeraet.email) && gB.find((x) => x.diesesGeraet)?.email === "lisa@ink-a.test", "Geräteliste für Team: fremde Adressen maskiert, eigene sichtbar", JSON.stringify(gB.map((x) => x.email)));
  const gBchef = (await call("GET", "/api/app/geraete", { token: tB })).data.geraete;
  check(gBchef.length === 2 && gBchef.some((x) => x.email === "lisa@ink-a.test") && gBchef.filter((x) => x.diesesGeraet).length === 1, "Geräteliste für den Inhaber: alle Adressen sichtbar, genau ein „dieses Gerät“", JSON.stringify(gBchef.map((x) => [x.email, x.diesesGeraet])));
  check((await call("DELETE", `/api/app/geraete/${g1.id}`, { token: tB })).status === 404, "Gerät eines anderen Studios abmelden → 404");
  const teamSperren = [];
  for (const [m, u, b] of [["POST", "/api/portal/kuendigung", { grund: "Test" }], ["DELETE", "/api/portal/kuendigung"], ["POST", "/api/portal/stripe-dashboard", {}], ["PATCH", "/api/portal/kontakt", { email: "fremd@x.test" }]]) {
    const r = await call(m, u, { token: tLisaB, body: b });
    teamSperren.push(`${r.status}/${r.data.code}`);
  }
  check(teamSperren.join(",") === "403/nur_inhaber,403/nur_web,403/nur_inhaber,403/nur_inhaber" && blob("studio/" + B.id).status !== "gekuendigt" && !blob("studio/" + B.id).benachrichtigungEmail, "Team-Rolle im Portal: kündigen, Stripe-Dashboard-Link, Kontakt ändern → 403 nur_inhaber; Kündigung zurücknehmen → 403 nur_web", teamSperren.join(","));
  const appZurueck = await call("DELETE", "/api/portal/kuendigung", { token: tA });
  check(appZurueck.status === 403 && appZurueck.data.code === "nur_web", "Kündigung zurücknehmen mit App-Token (auch Inhaber) → 403 nur_web (Abo fortsetzen nur im Dashboard, Apple 3.1.1)", appZurueck.text);
  const ichInhaber = await call("DELETE", "/api/app/team/ich", { token: tB });
  check(ichInhaber.status === 403 && ichInhaber.data.code === "nur_team", "Inhaber kann sich nicht selbst aus dem Team entfernen → 403", ichInhaber.text);

  // ==================================================================================================
  teil("Gerät: Name, Mitteilungen, Push-Token");
  const patch = await call("PATCH", "/api/app/geraet", { token: tC, body: { name: "  iPhone Empfang  ", mitteilungen: { zahlungen: true, auszahlungen: false }, kundennameInMitteilung: true } });
  check(patch.status === 200 && patch.data.geraet.name === "iPhone Empfang" && patch.data.geraet.mitteilungen.auszahlungen === false && patch.data.geraet.diesesGeraet === true && patch.data.geraet.kundennameInMitteilung === true, "PATCH /api/app/geraet ändert Name und Mitteilungen", patch.text.slice(0, 200));
  check((await call("PATCH", "/api/app/geraet", { token: tC, body: { name: "" } })).status === 400, "Leerer Name → 400");
  const TOK_C = crypto.randomBytes(32).toString("hex");
  check((await call("PUT", "/api/app/push", { token: tC, body: { token: "kein-hex", platform: "ios", umgebung: "sandbox" } })).data.code === "token", "Ungültiger APNs-Token → 400 token");
  check((await call("PUT", "/api/app/push", { token: tC, body: { token: TOK_C, platform: "android", umgebung: "sandbox" } })).data.code === "platform", "Plattform passt nicht zum Gerät → 400 platform");
  const pushOk = await call("PUT", "/api/app/push", { token: tC, body: { token: TOK_C.toUpperCase(), platform: "ios", umgebung: "sandbox" } });
  check(pushOk.status === 200 && pushOk.data.ok === true && pushOk.data.apnsAktiv === false, "PUT /api/app/push → {ok:true, apnsAktiv:false} (ohne APNs-Schlüssel)", pushOk.text);
  check(blob(`appgeraet/${C.id}/${g1.id}`).push?.token === TOK_C, "Push-Token gespeichert (klein geschrieben)");
  const tC2 = (await appLogin("tom@ink-c.test", GERAET("iPhone neu installiert"))).token;
  await call("PUT", "/api/app/push", { token: tC2, body: { token: TOK_C, platform: "ios", umgebung: "sandbox" } });
  check(blob(`appgeraet/${C.id}/${g1.id}`).push === null, "Gleicher Push-Token an einem anderen Gerät desselben Studios → beim alten entfernt (Neuinstallation)");
  await call("PUT", "/api/app/push", { token: tC, body: { token: TOK_C, platform: "ios", umgebung: "sandbox" } });
  check((await call("POST", "/api/app/push/test", { token: tC })).data.grund === "apns-nicht-eingerichtet", "Push-Test ohne APNs-Schlüssel → {gesendet:false, grund:apns-nicht-eingerichtet}");
  const ohneTok = await call("POST", "/api/app/push/test", { token: tA });
  check(ohneTok.data.gesendet === false && ohneTok.data.grund === "kein-token", "Push-Test ohne Geräte-Token → kein-token", ohneTok.text);
  let pt; for (let i = 0; i < 5; i++) pt = await call("POST", "/api/app/push/test", { token: tC });
  check(pt.status === 429 && pt.data.code === "zu_viele", "Push-Test höchstens 5 pro Stunde → 429", pt.text);
  rlReset();

  // ==================================================================================================
  teil("Push ohne APNs-Schlüssel: Zahlung wird verbucht, Push übersprungen und protokolliert");
  const zOhne = await zahlungBezahlen(tC, { betrag: "120", kunde: "Paul Beispiel", beschreibung: "Kleines Herz" });
  const zOhneD = await call("GET", `/api/portal/zahlung/${zOhne}`, { token: tC });
  check(zOhneD.data.zahlung?.status === "bezahlt" && zOhneD.data.link === `${BASE}/zahlung.html?z=${zOhne}`, "GET /api/portal/zahlung/:id → bezahlt + Link", zOhneD.text.slice(0, 160));
  check(logs("push-uebersprungen").some((l) => l.grund === "apns-nicht-eingerichtet" && l.ereignis === "zahlungen" && l.studioId === C.id), "log push-uebersprungen {grund: apns-nicht-eingerichtet}");

  // ==================================================================================================
  teil("Push mit APNs-Nachbau (HTTP/2, ES256-JWT): Zahlung genau einmal, Gutschein, Auszahlungen");
  const sch = testSchluessel();
  const antworten = {};
  const apns = await startApnsNachbau({ publicKey: sch.publicKey, keyId: "TESTKEY123", teamId: "TEAM123456", antwort: (p) => antworten[p.token] || { status: 200 } });
  Object.assign(process.env, { APNS_KEY_P8: sch.pem.replace(/\n/g, "\\n"), APNS_KEY_ID: "TESTKEY123", APNS_TEAM_ID: "TEAM123456", APNS_HOST_SANDBOX: apns.url, APNS_HOST_PRODUCTION: apns.url });
  check((await call("PUT", "/api/app/push", { token: tC, body: { token: TOK_C, platform: "ios", umgebung: "sandbox" } })).data.apnsAktiv === true, "Mit Schlüssel (APNS_KEY_P8 mit \\n, KEY_ID, TEAM_ID) → apnsAktiv true");
  // Zweites Gerät von C ohne Zahlungs-Mitteilungen
  const TOK_C2 = crypto.randomBytes(32).toString("hex");
  await call("PUT", "/api/app/push", { token: tC2, body: { token: TOK_C2, platform: "ios", umgebung: "production", mitteilungen: { zahlungen: false, auszahlungen: true } } });
  const zP = await zahlungBezahlen(tC, { betrag: "480", kunde: "Lisa Beispiel", beschreibung: "Rose Unterarm", art: "anzahlung" });
  await wait(300);
  const pushZ = () => apns.empfangen.filter((x) => x.payload.zahlungId === zP);
  const pz = pushZ()[0];
  check(pushZ().length === 1 && pz.token === TOK_C, "checkout.session.completed → genau ein Push, nur an das Gerät mit „Zahlungen“", `${pushZ().length} Pushes`);
  check(pz?.payload.aps.alert.title === "Zahlung eingegangen" && pz.payload.aps.alert.body === "480,00 € · Anzahlung Rose Unterarm · Lisa" && pz.payload.aps["thread-id"] === "zahlungen" && pz.payload.aps.sound === "default" && pz.payload.typ === "zahlung", "Inhalt: „Zahlung eingegangen“, „480,00 € · Anzahlung Rose Unterarm · Lisa“ (Vorname nur weil kundennameInMitteilung an)", JSON.stringify(pz?.payload));
  check(pz?.headers.topic === "de.tattoofin.app" && pz.headers.typ === "alert" && pz.headers.prioritaet === "10" && pz.headers.collapseId === zP && pz.jwtOk === true, "Kopfzeilen apns-topic/-push-type/-priority/-collapse-id, ES256-JWT mit kid + iss gültig", JSON.stringify(pz?.headers));
  // Stripe schickt dasselbe nochmal als payment_intent.succeeded (und den Checkout erneut) → kein zweiter Push
  const zDaten = (await admin(`studio/${C.id}`)).zahlungen.find((z) => z.id === zP);
  await Promise.all([
    sendeWebhook(`${BASE}/api/stripe-webhook`, "whsec_mock", "payment_intent.succeeded", { id: zDaten.paymentIntentId, object: "payment_intent", metadata: { tattoofinZahlung: zP } }, C.konto),
    sendeWebhook(`${BASE}/api/stripe-webhook`, "whsec_mock", "checkout.session.completed", { id: zDaten.checkoutSessionId, object: "checkout.session", payment_status: "paid", payment_intent: zDaten.paymentIntentId, metadata: { tattoofinZahlung: zP } }, C.konto),
  ]);
  await wait(300);
  check(pushZ().length === 1, "payment_intent.succeeded + checkout.session.completed erneut → weiterhin genau ein Push", `${pushZ().length}`);
  await call("PATCH", "/api/app/geraet", { token: tC, body: { kundennameInMitteilung: false } });
  const zG = await zahlungBezahlen(tC, { art: "gutschein", betrag: "100", kunde: "Sven Beispiel", email: "sven@kunde.test", empfaenger: "Mia" });
  await wait(300);
  const pg = apns.empfangen.find((x) => x.payload.zahlungId === zG);
  check(pg?.payload.aps.alert.title === "Gutschein verkauft" && pg.payload.aps.alert.body === "100,00 € · Gutschein für Mia", "Gutschein: „Gutschein verkauft“, ohne Kundennamen (Schalter aus)", JSON.stringify(pg?.payload.aps));
  // Gutschein per QR-Token finden
  const gz = (await admin(`studio/${C.id}`)).zahlungen.find((z) => z.id === zG);
  const perT = await call("GET", `/api/portal/gutschein-code?t=${gz.gutschein.token}`, { token: tC });
  check(perT.status === 200 && perT.data.id === zG && perT.data.gutschein.code === gz.gutschein.code && !("token" in perT.data.gutschein), "GET /api/portal/gutschein-code?t=<token> findet den eigenen Gutschein (ohne Token in der Antwort)", perT.text.slice(0, 160));
  check((await call("GET", `/api/portal/gutschein-code?t=${gz.gutschein.token}`, { token: tA })).status === 404 && (await call("GET", `/api/portal/gutschein-code?t=xxxxxxxxxxxxxxxxxxxxxxxx`, { token: tC })).status === 404, "Fremdes Studio bzw. unbekanntes Token → 404");
  check((await call("GET", `/api/portal/gutschein-code?code=${encodeURIComponent(gz.gutschein.code.toLowerCase().replace(/-/g, " "))}`, { token: tC })).data.id === zG, "?code= funktioniert weiter (tolerant)");
  const zGblob = blob(`zahlung/${C.id}/${zG}`);
  setBlob(`zahlung/${C.id}/${zG}`, { ...zGblob, email: "" });
  const ohneMail = await call("POST", `/api/portal/gutschein/${zG}/senden`, { token: tC });
  setBlob(`zahlung/${C.id}/${zG}`, zGblob);
  check(ohneMail.status === 409 && ohneMail.data.code === "keine_email" && /keine E-Mail-Adresse des Käufers/.test(ohneMail.data.error), "Gutschein ohne Käufer-Adresse „erneut mailen“ → 409 keine_email mit passendem Text", ohneMail.text);
  const pdf = await fetch(`${BASE}/api/portal/gutschein/${zG}/pdf`, { headers: { authorization: "Bearer " + tC } });
  check(pdf.status === 200 && pdf.headers.get("content-type") === "application/pdf" && (await pdf.arrayBuffer()).byteLength > 3000, "Gutschein-PDF mit App-Token abrufbar");
  const qrSrc = fs.readFileSync(path.join(root, "netlify/functions/_lib/qr.mjs"), "utf8"), qrPub = fs.readFileSync(path.join(root, "public/js/qrcode.min.js"), "utf8");
  const { qrMatrix } = await import("../netlify/functions/_lib/qr.mjs");
  const qm = qrMatrix(`${BASE}/gutschein.html?t=${gz.gutschein.token}`);
  check(qrSrc.includes(qrPub.trim()) && qm.n >= 21 && qm.dunkel(0, 0) && qm.dunkel(6, 6) && !qm.dunkel(7, 7), "QR im PDF: gleiche Bibliothek wie public/js/qrcode.min.js, gültige Matrix mit Suchmustern", `n=${qm.n}`);
  // Auszahlungen
  const po = await mock("payout", { account: C.konto, amount: 123400, status: "paid", arrival_date: Math.floor(Date.parse("2026-11-15T10:00:00Z") / 1000) });
  await wait(300);
  const ppo = apns.empfangen.filter((x) => x.payload.payoutId === po.id);
  check(ppo.length === 1 && ppo[0].token === TOK_C2 && ppo[0].payload.aps.alert.title === "Auszahlung unterwegs" && ppo[0].payload.aps.alert.body === "1.234,00 € kommen voraussichtlich am 15.11. auf dein Konto." && ppo[0].payload.aps["thread-id"] === "auszahlungen" && ppo[0].headers.collapseId === po.id, "payout.paid → Push nur an Geräte mit „Auszahlungen“ (Text mit Betrag und Datum)", JSON.stringify(ppo.map((x) => [x.token.slice(0, 6), x.payload.aps.alert])));
  check(Boolean(blob("push/payout/" + po.id)), "Doppelschutz push/payout/<id> angelegt");
  await sendeWebhook(`${BASE}/api/stripe-webhook`, "whsec_mock", "payout.paid", po, C.konto);
  await wait(250);
  check(apns.empfangen.filter((x) => x.payload.payoutId === po.id).length === 1, "Gleiche Auszahlung nochmal (neues Ereignis) → kein zweiter Push");
  const poF = await mock("payout", { account: C.konto, amount: 50000, status: "failed" });
  await wait(300);
  const pf = apns.empfangen.find((x) => x.payload.payoutId === poF.id);
  check(pf?.payload.aps.alert.title === "Auszahlung fehlgeschlagen" && pf.payload.aps.alert.body === "Bitte prüfe deine Bankdaten im Dashboard.", "payout.failed → „Auszahlung fehlgeschlagen“", JSON.stringify(pf?.payload.aps));
  // Rückfall über die täglichen Jobs (falls payout.* nicht abonniert): Auszahlung ohne Webhook
  await mock("webhooks?an=0");
  const poJ = await mock("payout", { account: C.konto, amount: 7000, status: "paid" });
  await mock("webhooks?an=1");
  const jobs = await admin("jobs", {});
  await wait(200);
  check(apns.empfangen.filter((x) => x.payload.payoutId === poJ.id).length === 1 && JSON.stringify(jobs).includes(poJ.id) && apns.empfangen.filter((x) => x.payload.payoutId === po.id).length === 1, "Tägliche Jobs holen fehlende Auszahlungs-Pushes nach (48 h), schon gemeldete nicht doppelt", JSON.stringify(jobs).slice(0, 200));
  // Ungültige Tokens und Schlüsselfehler
  antworten[TOK_C] = { status: 410, grund: "Unregistered" };
  const t410 = await call("POST", "/api/app/push/test", { token: tC });
  check(t410.data.gesendet === false && blob(`appgeraet/${C.id}/${g1.id}`).push === null && logs("push-token-entfernt").some((l) => l.geraetId === g1.id), "APNs antwortet 410 Unregistered → Token am Gerät gelöscht", t410.text);
  const TOK_C3 = crypto.randomBytes(32).toString("hex");
  await call("PUT", "/api/app/push", { token: tC, body: { token: TOK_C3, platform: "ios", umgebung: "sandbox" } });
  antworten[TOK_C3] = { status: 400, grund: "BadDeviceToken" };
  await call("POST", "/api/app/push/test", { token: tC });
  check(blob(`appgeraet/${C.id}/${g1.id}`).push === null, "400 BadDeviceToken → Token gelöscht");
  await call("PUT", "/api/app/push", { token: tC, body: { token: TOK_C, platform: "ios", umgebung: "sandbox" } });
  antworten[TOK_C] = { status: 403, grund: "InvalidProviderToken" };
  await call("POST", "/api/app/push/test", { token: tC });
  await call("POST", "/api/app/push/test", { token: tC });
  const schlMails = mailsAn("admin@app.test").filter((m) => /APNs lehnt den Push-Schlüssel ab/.test(m.subject));
  check(schlMails.length === 1 && blob(`appgeraet/${C.id}/${g1.id}`).push?.token === TOK_C, "403 InvalidProviderToken → genau eine Admin-Mail (höchstens alle 30 Min.), Token bleibt", `${schlMails.length} Mails`);
  delete antworten[TOK_C];
  const okTest = await call("POST", "/api/app/push/test", { token: tC });
  check(okTest.data.gesendet === true && apns.empfangen.at(-1).payload.aps.alert.body === "Mitteilungen funktionieren. So meldet sich die App bei neuen Zahlungen.", "Push-Test mit Schlüssel → {gesendet:true}, „Mitteilungen funktionieren …“", okTest.text);
  const pushLib = await import("../netlify/functions/_lib/push.mjs");
  const sCp = blob("studio/" + C.id);
  const empf = (await pushLib.pushEmpfaenger(sCp, "zahlungen")).length;
  const empfSv = (await pushLib.pushEmpfaenger({ ...sCp, sessionVersion: (sCp.sessionVersion || 0) + 1 }, "zahlungen")).length;
  const empfAdr = (await pushLib.pushEmpfaenger({ ...sCp, email: "neu@ink-c.test" }, "zahlungen")).length;
  check(empf >= 1 && empfSv === 0 && empfAdr === 0, "Mitteilungen nur an Geräte mit gültigem Zugang: andere Sitzungsversion („überall abgemeldet“) oder Adresse nicht mehr im Studio → kein Push", `${empf}/${empfSv}/${empfAdr}`);
  // Gleicher Push-Token in einem anderen Studio (Handy jetzt bei Studio A angemeldet) → beim alten Studio entfernt
  const tAp = await loginA(A.id, "Handy von C");
  await call("PUT", "/api/app/push", { token: tAp, body: { token: TOK_C, platform: "ios", umgebung: "sandbox" } });
  check(blob(`appgeraet/${C.id}/${g1.id}`).push === null && blob("idx/apppush/" + crypto.createHash("sha256").update(TOK_C).digest("hex"))?.startsWith(A.id + "/"), "Gleicher Push-Token bei einem anderen Studio → beim alten Studio entfernt (Index über alle Studios)");
  await call("POST", "/api/app/abmelden", { token: tAp });
  await call("PUT", "/api/app/push", { token: tC, body: { token: TOK_C, platform: "ios", umgebung: "sandbox" } });
  rlReset();
  // Android: Token wird gespeichert, aber nicht genutzt (FCM fehlt noch)
  const andr = await appLogin("tom@ink-c.test", GERAET("Pixel", "android"));
  const ap = await call("PUT", "/api/app/push", { token: andr.token, body: { token: "fcm-" + "x".repeat(40), platform: "android" } });
  const at = await call("POST", "/api/app/push/test", { token: andr.token });
  check(andr.geraet?.platform === "android" && ap.data.ok === true && at.data.gesendet === false && at.data.grund === "fcm-fehlt" && logs("push-uebersprungen").some((l) => l.grund === "fcm-fehlt"), "Android: Anmeldung + Token speichern geht, Versand übersprungen (fcm-fehlt)", `${ap.text} ${at.text}`);
  await call("POST", "/api/app/abmelden", { token: andr.token });

  // ==================================================================================================
  teil("Auszahlungen in der App (Stripe GET /v1/payouts + /v1/balance)");
  await mock(`saldo/${C.konto}?verfuegbar=12345&unterwegs=48000`);
  const az = await call("GET", "/api/app/auszahlungen?limit=2", { token: tC });
  const a0 = az.data.auszahlungen?.[0];
  check(az.status === 200 && az.data.konto.verbunden === true && az.data.konto.auszahlungenAktiv === true && az.data.konto.kontoTyp === "standard" && az.data.saldo.verfuegbarCent === 12345 && az.data.saldo.unterwegsCent === 48000 && az.data.saldo.waehrung === "eur", "Konto + Saldo (verfügbar, unterwegs)", JSON.stringify(az.data.saldo));
  check(az.data.auszahlungen.length === 2 && az.data.weitere === true && az.data.nach === az.data.auszahlungen[1].id && a0.bank?.name === "Testbank" && a0.bank.endet === "3000" && /^\d{4}-\d{2}-\d{2}$/.test(a0.ankunftAm) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(a0.erstelltAm), "Liste mit limit, weitere/nach, Bank (Name, Endziffern), Datumsformate", JSON.stringify(a0));
  const az2 = await call("GET", `/api/app/auszahlungen?limit=50&nach=${az.data.nach}`, { token: tC });
  const alleIds = [...az.data.auszahlungen, ...az2.data.auszahlungen].map((x) => x.id);
  check(az2.data.weitere === false && alleIds.length === 3 && new Set(alleIds).size === 3 && [po.id, poF.id, poJ.id].every((x) => alleIds.includes(x)), "Nächste Seite über nach=po_… (alle 3 Auszahlungen, keine doppelt)", alleIds.join(","));
  const fail1 = [...az.data.auszahlungen, ...az2.data.auszahlungen].find((x) => x.id === poF.id);
  check(fail1.status === "failed" && fail1.statusText === "Fehlgeschlagen" && fail1.fehler === "Das Bankkonto ist geschlossen." && [...az.data.auszahlungen, ...az2.data.auszahlungen].find((x) => x.id === po.id).statusText === "Angekommen", "statusText Deutsch, Fehlergrund zusammengefasst", JSON.stringify(fail1));
  const sC = blob("studio/" + C.id);
  setBlob("studio/" + C.id, { ...sC, stripe: { ...sC.stripe, accountId: "acct_gibtsnicht" } });
  const az502 = await call("GET", "/api/app/auszahlungen", { token: tC });
  setBlob("studio/" + C.id, sC);
  check(az502.status === 502 && az502.data.code === "stripe" && az502.data.error === "Stripe antwortet gerade nicht. Bitte gleich nochmal versuchen.", "Stripe-Fehler → 502 stripe", az502.text);
  const sOhne = { ...blob("studio/" + A.id) }; setBlob("studio/" + A.id, { ...sOhne, stripe: { ...sOhne.stripe, accountId: null } });
  const azOhne = await call("GET", "/api/app/auszahlungen", { token: tA });
  setBlob("studio/" + A.id, sOhne);
  check(azOhne.status === 200 && azOhne.data.konto.verbunden === false && azOhne.data.saldo === null && azOhne.data.auszahlungen.length === 0 && azOhne.data.hinweis === "Noch kein Stripe-Konto verbunden.", "Ohne Stripe-Konto → verbunden:false mit Hinweis", azOhne.text);

  // ==================================================================================================
  teil("Zahlung einzeln + Abgleich (höchstens alle 10 s)");
  const zOff = await call("POST", "/api/portal/zahlung", { token: tC, body: { betrag: "250", kunde: "Ina", beschreibung: "Linework" } });
  const zid = zOff.data.zahlung.id;
  await call("POST", "/api/pay", { body: { z: zid, inhaltOk: true } });
  const ab1 = await call("GET", `/api/portal/zahlung/${zid}?abgleich=1`, { token: tC });
  const sp1 = blob("abgleich/" + zid);
  await wait(30);
  await call("GET", `/api/portal/zahlung/${zid}?abgleich=1`, { token: tC });
  const sp2 = blob("abgleich/" + zid);
  check(typeof ab1.data.whatsappText === "string" && ab1.data.whatsappText.startsWith("Hi Ina, ") && ab1.data.whatsappText.includes(ab1.data.link) && !/raten|später/i.test(ab1.data.whatsappText), "GET zahlung/:id (offen) liefert den Teilen-Text wie beim Erstellen (ohne Raten-Aussage)", ab1.text);
  const zKarte = await call("POST", "/api/portal/zahlung", { token: tC, body: { betrag: "120", beschreibung: "Gutschein Weihnachten" } });
  const zKarteGet = await call("GET", `/api/portal/zahlung/${zKarte.data.zahlung.id}`, { token: tC });
  check(zKarte.data.hinweis && !/klarna/i.test(zKarte.data.whatsappText) && zKarte.data.whatsappText.startsWith("Hi, ") && !/klarna/i.test(zKarteGet.data.whatsappText || "x klarna"), "Link mit Gutschein-Wort (nur Karte): Teilen-Text ohne Klarna, ohne Name „Hi, …“", zKarte.data.whatsappText);
  check(ab1.status === 200 && ab1.data.zahlung.status === "offen" && sp1?.am && sp2?.am === sp1.am, "abgleich=1 fragt Stripe höchstens alle 10 s (Sperre abgleich/<id> bleibt beim 2. Aufruf unverändert)", `${sp1?.am} / ${sp2?.am}`);
  setBlob("abgleich/" + zid, { am: new Date(Date.now() - 11e3).toISOString() });
  await call("GET", `/api/portal/zahlung/${zid}?abgleich=1`, { token: tC });
  check(blob("abgleich/" + zid).am !== sp1.am, "Nach 10 s wird wieder abgeglichen");

  // ==================================================================================================
  teil("Team: Adresse entfernen → App-Token tot; selbst austreten; alle abmelden");
  const gLisaB = (await call("GET", "/api/app/geraete", { token: tLisaB })).data.geraete.find((x) => x.diesesGeraet);
  const tput = await call("PUT", "/api/app/team", { token: tB, body: { emails: ["Anna@Ink-B.test", "anna@ink-b.test", "chef@ink-b.test"] } });
  check(tput.status === 200 && JSON.stringify(tput.data) === JSON.stringify({ hauptadresse: "chef@ink-b.test", team: ["anna@ink-b.test"], max: 5, darfAendern: true }), "PUT /api/app/team: Dubletten und Hauptadresse fallen raus", tput.text);
  check((await call("GET", "/api/portal", { token: tLisaB })).status === 401 && blob(`appgeraet/${B.id}/${gLisaB.id}`).widerrufenAm, "Entfernte Team-Adresse: App-Gerät sofort widerrufen → 401");
  const ohneListe = await call("PUT", "/api/app/team", { token: tB, body: { team: ["x@y.de"] } });
  check(ohneListe.status === 400 && ohneListe.data.code === "emails" && blob("studio/" + B.id).teamEmails.includes("anna@ink-b.test"), "PUT /api/app/team ohne emails-Liste → 400, Team bleibt unverändert", ohneListe.text);
  check((await call("PUT", "/api/app/team", { token: tB, body: { emails: ["a@b.de", "c@d.de", "e@f.de", "g@h.de", "i@j.de", "k@l.de"] } })).data.error === "Höchstens 5 Team-Adressen" && (await call("PUT", "/api/app/team", { token: tB, body: { emails: ["kaputt"] } })).data.error === "Keine gültige E-Mail: kaputt", "Gleiche Prüfung wie im Admin (höchstens 5, gültige Adressen)");
  check(mailsAn("admin@app.test").some((m) => /Team-Adressen in der App geändert/.test(m.subject)) && logs("app-team").length >= 1, "notifyAdmin + log app-team");
  const anna = await appLogin("anna@ink-b.test");
  const tAnna = anna.token;
  check(anna.geraet?.rolle === "team" && codeMail("anna@ink-b.test"), "Neue Team-Adresse bekommt den Code an sich selbst und meldet sich als team an");
  const raus = await call("DELETE", "/api/app/team/ich", { token: tAnna });
  check(raus.status === 200 && raus.data.ok === true && !blob("studio/" + B.id).teamEmails.includes("anna@ink-b.test") && (await call("GET", "/api/portal", { token: tAnna })).status === 401, "DELETE /api/app/team/ich: Adresse raus, eigene Geräte widerrufen");
  await call("PUT", "/api/app/team", { token: tB, body: { emails: ["anna@ink-b.test"] } });
  const tAnna2 = (await appLogin("anna@ink-b.test")).token;
  const teamAlle = await call("POST", "/api/portal/abmelden", { token: tAnna2 });
  check(teamAlle.status === 403 && teamAlle.data.code === "nur_inhaber" && (await call("GET", "/api/portal", { token: tB })).status === 200, "Team-Gerät darf nicht „Auf allen Geräten abmelden“ (403 nur_inhaber), Inhaber bleibt angemeldet", teamAlle.text);
  const svVor = blob("studio/" + B.id).sessionVersion || 0;
  const alle = await call("PUT", "/api/app/team", { token: tB, body: { emails: ["anna@ink-b.test"], alleAbmelden: true } });
  check(alle.status === 200 && (blob("studio/" + B.id).sessionVersion || 0) === svVor + 1 && (await call("GET", "/api/portal", { token: tAnna2 })).status === 401 && (await call("GET", "/api/portal", { cookie: B.cookie })).status === 401 && (await call("GET", "/api/portal", { token: tB })).status === 200, "alleAbmelden: Sitzungsversion +1 → andere App-Geräte und Web-Cookies raus, dieses Gerät bleibt angemeldet");

  const tAnna3 = (await appLogin("anna@ink-b.test")).token;
  await admin(`studio/${B.id}/team`, { emails: [] });
  check((await call("GET", "/api/portal", { token: tAnna3 })).status === 401 && (await geraeteLib.geraeteVon(B.id)).every((x) => x.email !== "anna@ink-b.test"), "Admin entfernt eine Team-Adresse → deren App-Geräte sofort abgemeldet (kein Zugriff, kein Push)");

  // ==================================================================================================
  teil("Abmelden: App-Gerät, „Auf allen Geräten abmelden“, Gerät eines anderen abmelden");
  const tA2 = await loginA(A.id, "iPad");
  const gA2 = (await call("GET", "/api/app/geraete", { token: tA2 })).data.geraete.find((x) => x.diesesGeraet);
  check((await call("DELETE", `/api/app/geraete/${gA2.id}`, { token: tA })).data.ok === true && (await call("GET", "/api/portal", { token: tA2 })).status === 401, "Inhaber meldet ein anderes Gerät ab → dessen Token 401");
  const tDieb = await loginA(A.id, "iPhone gestohlen");
  const gDieb = (await call("GET", "/api/app/geraete", { token: tDieb })).data.geraete.find((x) => x.diesesGeraet);
  const altDieb = blob(`appgeraet/${A.id}/${gDieb.id}`);
  const [abDieb] = await Promise.all([call("DELETE", `/api/app/geraete/${gDieb.id}`, { token: tA }), ...Array.from({ length: 10 }, () => call("PATCH", "/api/app/geraet", { token: tDieb, body: { mitteilungen: { zahlungen: true } } }))]);
  setBlob(`appgeraet/${A.id}/${gDieb.id}`, altDieb);   // so hat früher ein paralleler Schreibvorgang das Gerät wiederbelebt
  const nachDieb = await Promise.all([call("PATCH", "/api/app/geraet", { token: tDieb, body: {} }), call("GET", "/api/portal", { token: tDieb }), call("PUT", "/api/app/push", { token: tDieb, body: { token: crypto.randomBytes(32).toString("hex"), platform: "ios", umgebung: "sandbox" } })]);
  check(abDieb.data.ok === true && nachDieb.every((r) => r.status === 401) && Boolean(blob(`appwiderruf/${A.id}/${gDieb.id}`)) && !(await geraeteLib.geraeteVon(A.id)).some((x) => x.id === gDieb.id), "Abmelden lässt sich nicht rückgängig machen: auch wenn das Gerät veraltet zurückgeschrieben wird, bleibt das Token tot (Widerrufs-Schlüssel)", nachDieb.map((r) => r.status).join(","));
  const ab = await call("POST", "/api/app/abmelden", { token: tC2 });
  check(ab.data.ok === true && (await call("GET", "/api/app/geraete", { token: tC2 })).status === 401 && blob(`appgeraet/${C.id}/${tC2.slice(4, 19)}`)?.tokenHash === undefined, "POST /api/app/abmelden → Token ungültig, Hash gelöscht");
  const tA3 = await loginA(A.id, "iPhone 2");
  check((await call("GET", "/api/portal", { token: tA3 })).status === 200, "Vorher: App-Token von A gültig");
  await call("POST", "/api/portal/abmelden", { cookie: A.cookie });
  check((await call("GET", "/api/portal", { token: tA3 })).status === 401 && (await call("GET", "/api/portal", { token: tA })).status === 401, "POST /api/portal/abmelden (Dashboard) widerruft auch alle App-Tokens (sv-Vergleich)");
  check((await geraeteLib.geraeteVon(A.id)).length === 0, "„Auf allen Geräten abmelden“ widerruft die App-Geräte (kein Push mehr an abgemeldete Handys)");

  // ==================================================================================================
  teil("Grenze 10 Geräte, 180 Tage, zuletztAm höchstens stündlich");
  const sObj = blob("studio/" + C.id);
  const vorher = (await geraeteLib.geraeteVon(C.id)).length;
  const neue = [];
  for (let i = 0; i < 11; i++) { neue.push(await geraeteLib.geraetAnlegen(sObj, { email: "tom@ink-c.test", rolle: "inhaber", platform: "ios", name: "Test " + i })); await wait(5); }
  const aktiv = await geraeteLib.geraeteVon(C.id);
  check(aktiv.length === 10 && logs("app-geraet-verdraengt").length >= 1 + vorher, "Höchstens 10 Geräte: das am längsten ungenutzte wird abgemeldet", `${aktiv.length} aktiv, ${logs("app-geraet-verdraengt").length} verdrängt`);
  const jung = neue.at(-1);
  const gj = blob(`appgeraet/${C.id}/${jung.geraet.id}`);
  const vor30 = new Date(Date.now() - 30 * 60e3).toISOString();
  setBlob(`appgeraet/${C.id}/${gj.id}`, { ...gj, zuletztAm: vor30 });
  await call("GET", "/api/portal", { token: jung.token });
  check(blob(`appgeraet/${C.id}/${gj.id}`).zuletztAm === vor30, "Nutzung vor 30 Min. → zuletztAm wird nicht neu geschrieben (höchstens stündlich)");
  setBlob(`appgeraet/${C.id}/${gj.id}`, { ...blob(`appgeraet/${C.id}/${gj.id}`), zuletztAm: new Date(Date.now() - 2 * 3600e3).toISOString() });
  await call("GET", "/api/portal", { token: jung.token });
  check(Date.now() - Date.parse(blob(`appgeraet/${C.id}/${gj.id}`).zuletztAm) < 60e3, "Nutzung vor 2 Std. → zuletztAm aktualisiert");
  setBlob(`appgeraet/${C.id}/${gj.id}`, { ...blob(`appgeraet/${C.id}/${gj.id}`), zuletztAm: new Date(Date.now() - 181 * 864e5).toISOString() });
  check((await call("GET", "/api/portal", { token: jung.token })).status === 401, "181 Tage ohne Nutzung → 401");
  const aufr = await admin("jobs", {});
  check(JSON.stringify(aufr).includes(gj.id) && !blob(`appgeraet/${C.id}/${gj.id}`) && !blob("idx/appgeraet/" + gj.id), "Tägliche Jobs löschen Geräte nach 180 Tagen ohne Nutzung");

  // ==================================================================================================
  teil("Review-Zugang (Apple) und Demo-Studio");
  const demo = await admin("app-demo", { email: "review@tattoofin.test" });
  check(/^st_/.test(demo.studioId || "") && demo.zahlungen >= 5 && blob("studio/" + demo.studioId)?.demo === true, "POST /api/admin/app-demo legt Demo-Studio mit Beispieldaten an", JSON.stringify(demo).slice(0, 160));
  check((await admin("studios")).every((s) => s.id !== demo.studioId), "Demo-Studio zählt nicht in den Admin-Kennzahlen (Studioliste)");
  rlReset();
  Object.assign(process.env, { APP_REVIEW_EMAIL: "review@tattoofin.test", APP_REVIEW_CODE: "246810" });
  await call("POST", "/api/app/code", { body: { email: "review@tattoofin.test" } });
  const nur2 = await call("POST", "/api/app/anmelden", { body: { email: "review@tattoofin.test", code: "246810", geraet: GERAET() } });
  check(nur2.status === 410 && nur2.data.code === "code_abgelaufen", "Nur 2 von 3 Review-Variablen → kein Review-Zugang", nur2.text);
  process.env.APP_REVIEW_STUDIO_ID = C.id;
  const nichtDemo = await call("POST", "/api/app/anmelden", { body: { email: "review@tattoofin.test", code: "246810", geraet: GERAET() } });
  check(nichtDemo.status === 410, "Review-Studio ohne demo:true → kein Review-Zugang", nichtDemo.text);
  process.env.APP_REVIEW_STUDIO_ID = demo.studioId;
  const rc = await call("POST", "/api/app/code", { body: { email: "Review@Tattoofin.test" } });
  check(rc.data.ok === true && mailsAn("review@tattoofin.test").length === 0 && dateien("appcode/").every((f) => !blob(decodeURIComponent(f.replace(/\.json$/, "")))?.studioIds?.includes(demo.studioId)), "Review: Code-Anforderung ohne Mail und ohne gespeicherten Code");
  const rf = await call("POST", "/api/app/anmelden", { body: { email: "review@tattoofin.test", code: "135791", geraet: GERAET() } });
  check(rf.status === 400 && rf.data.code === "code_falsch" && rf.data.restVersuche === 4, "Review: falscher Code zählt Versuche wie sonst", rf.text);
  const rl = await call("POST", "/api/app/anmelden", { body: { email: "review@tattoofin.test", code: "246810", geraet: GERAET("Review-iPhone") } });
  const tR = rl.data.token;
  check(rl.status === 200 && rl.data.studio.id === demo.studioId && rl.data.geraet.rolle === "inhaber", "Review: fester Code → Token für das Demo-Studio", rl.text.slice(0, 160));
  const pR = await call("GET", "/api/portal", { token: tR });
  check(pR.data.studio?.kannKassieren === true && pR.data.zahlungen.length >= 5 && pR.data.zahlungen.some((z) => z.gutschein?.code), "Demo-Studio: Beispiel-Zahlungen und Gutscheine, darf Links anlegen (ohne Stripe)", `${pR.data.zahlungen?.length}`);
  const dSt = pR.data.studio?.stripe || {};
  check(pR.data.studio.demo === true && dSt.verbunden && dSt.freigegeben && dSt.auszahlungen && pR.data.studio.connectUrl === null, "Demo-Studio: Stripe als eingerichtet angezeigt, keine Stripe-Einrichtung (connectUrl null)", JSON.stringify(dSt));
  const dCon = await call("GET", `/api/connect?id=${demo.studioId}`, { token: tR });
  check(dCon.status === 302 && dCon.headers.get("location") === "/app.html" && !blob("studio/" + demo.studioId).stripe?.accountId, "GET /api/connect im Demo-Studio legt kein Stripe-Konto an", `${dCon.status} ${dCon.headers.get("location")}`);
  const dGs = pR.data.zahlungen.find((z) => z.gutschein?.code);
  const dSend = await call("POST", `/api/portal/gutschein/${dGs.id}/senden`, { token: tR });
  check(dSend.status === 200 && dSend.data.gesendet === true && mails().every((m) => ![].concat(m.to).includes(dGs.email)), "Demo-Gutschein „erneut mailen“ → gesendet (ohne echte Mail)", dSend.text.slice(0, 120));
  const dz = await call("POST", "/api/portal/zahlung", { token: tR, body: { betrag: "300", kunde: "Test", beschreibung: "Demo" } });
  const dpay = await call("POST", "/api/pay", { body: { z: dz.data.zahlung?.id, inhaltOk: true } });
  const dpay2 = await call("POST", "/api/pay", { body: { s: blob("studio/" + demo.studioId).slug, betrag: "100", kunde: "X", inhaltOk: true } });
  check(dz.status === 201 && dpay.status === 409 && dpay.data.error === "Testmodus: Bei diesem Studio wird nichts bezahlt." && dpay2.status === 409, "Demo-Studio: Link anlegen geht, Bezahlen (Link und Zahlseite) → 409", `${dz.status} ${dpay.text} ${dpay2.status}`);
  const dTest = await call("POST", `/api/app/demo-zahlung/${dz.data.zahlung.id}`, { token: tR });
  const dTest2 = await call("POST", `/api/app/demo-zahlung/${dz.data.zahlung.id}`, { token: tR });
  const nichtDemoZ = await call("POST", `/api/app/demo-zahlung/${zid}`, { token: tB });
  check(dTest.status === 200 && dTest.data.status === "bezahlt" && dTest.data.demoZahlung === true && dTest2.status === 409 && nichtDemoZ.status === 404 && blob(`zahlung/${C.id}/${zid}`).status !== "bezahlt", "Testzahlung nur im Demo-Studio: offener Link → bezahlt (kein Stripe), zweimal → 409, echtes Studio → 404", `${dTest.status} ${dTest2.status} ${nichtDemoZ.status}`);
  const dAz = await call("GET", "/api/app/auszahlungen", { token: tR });
  check(dAz.data.auszahlungen?.length === 3 && dAz.data.konto.verbunden === true && dAz.data.auszahlungen.every((x) => x.statusText), "Demo-Studio: feste Beispiel-Auszahlungen", dAz.text.slice(0, 120));
  check(mailsAn("review@tattoofin.test").length === 0, "Demo-Studio bekommt keine Mails (auch kein „Neues Gerät“)");
  const jobsD = await admin("jobs", {});
  const abr = await admin("abrechnung", { dryRun: true });
  check(!JSON.stringify(jobsD).includes("Tattoofin Demo-Studio") && !JSON.stringify(abr).includes("Tattoofin Demo-Studio"), "Demo-Studio läuft nicht durch tägliche Jobs und Monatsabrechnung");
  for (const k of ["APP_REVIEW_EMAIL", "APP_REVIEW_CODE", "APP_REVIEW_STUDIO_ID"]) delete process.env[k];
  check((await call("GET", "/api/portal", { token: tR })).status === 200, "Ein vorhandenes Review-Token bleibt gültig (Abmelden wie bei jedem Gerät)");

  // ==================================================================================================
  teil("Konto löschen (Kündigung + Löschanfrage) und Rücknahme im Dashboard");
  const tB2 = tB;
  const falschB = await call("POST", "/api/app/konto-loeschen", { token: tB2, body: { bestaetigung: "loeschen bitte" } });
  check(falschB.status === 400 && falschB.data.code === "bestaetigung" && falschB.data.error === "Bitte tippe LÖSCHEN zur Bestätigung.", "Falsche Bestätigung → 400 bestaetigung", falschB.text);
  const loe = await call("POST", "/api/app/konto-loeschen", { token: tB2, body: { bestaetigung: "löschen", grund: "Zu wenig Kunden" } });
  const sB = blob("studio/" + B.id);
  const erwartet = new Date(Date.parse(loe.data.kuendigungZum) + 30 * 864e5).toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
  check(loe.status === 200 && loe.data.ok === true && loe.data.loeschungAb === erwartet && loe.data.studio.status === "gekuendigt" && loe.data.studio.loeschAnfrage?.durch === "app" && sB.kuendigung?.quelle === "app" && sB.loeschAnfrage?.geraetId && sB.kuendigung.grund === "Zu wenig Kunden", "Konto löschen → Kündigung (wie im Dashboard) + loeschAnfrage, Löschung 30 Tage nach Vertragsende", loe.text.slice(0, 220));
  check(mailsAn("chef@ink-b.test").some((m) => m.subject === "Deine Kündigung und Löschanfrage sind eingegangen") && !mailsAn("chef@ink-b.test").some((m) => m.subject === "Deine Kündigung ist eingegangen") && mailsAn("admin@app.test").some((m) => /Löschanfrage aus der App/.test(m.subject)), "Bestätigungs-Mail mit Datum ans Studio + Admin-Meldung „Löschanfrage aus der App“");
  const subB = (await mock("state")).subscriptions[sB.stripe.subscriptionId];
  check(subB?.cancel_at_period_end === true && Date.parse(loe.data.kuendigungZum) === subB.current_period_end * 1000, "Abo bei Stripe zum Periodenende gekündigt, Vertragsende = Periodenende (wie im Dashboard)", JSON.stringify(subB));
  const loe2 = await call("POST", "/api/app/konto-loeschen", { token: tB2, body: { bestaetigung: "LÖSCHEN" } });
  check(loe2.status === 200 && loe2.data.ok === true && loe2.data.kuendigungZum === loe.data.kuendigungZum, "Schon gekündigt → kein Fehler, nur Löschanfrage", loe2.text.slice(0, 120));
  const tBneu = (await appLogin("chef@ink-b.test")).token;
  const sBc = await call("GET", "/api/portal", { token: tBneu });
  const zurApp = await call("DELETE", "/api/portal/kuendigung", { token: tBneu });
  const cookieB = auth.sessionCookie(blob("studio/" + B.id)).split(";")[0];
  const zur = await call("DELETE", "/api/portal/kuendigung", { cookie: cookieB });
  check(sBc.data.studio?.loeschAnfrage && zur.status === 200 && zur.data.status !== "gekuendigt" && zur.data.loeschAnfrage === null && !blob("studio/" + B.id).loeschAnfrage && blob("studio/" + B.id).loeschAnfrageHistorie?.length === 1, "DELETE /api/portal/kuendigung im Dashboard nimmt Kündigung UND Löschanfrage zurück (in der App 403 nur_web)", zur.text.slice(0, 160));
  check(zurApp.status === 403 && zurApp.data.code === "nur_web", "Zurücknehmen geht nicht mit App-Token", zurApp.text);
  // Dashboard-Kündigung (ausgelagert nach domain.mjs) verhält sich wie bisher
  const kw = await call("POST", "/api/portal/kuendigung", { cookie: C.cookie, body: { grund: "Test" } });
  const kw2 = await call("POST", "/api/portal/kuendigung", { cookie: C.cookie, body: { grund: "Test" } });
  check(kw.status === 200 && kw.data.status === "gekuendigt" && kw2.status === 400 && kw2.data.error === "Der Vertrag ist bereits gekündigt." && mailsAn("tom@ink-c.test").some((m) => m.subject === "Deine Kündigung ist eingegangen"), "Dashboard-Kündigung unverändert (Mail, zweites Mal 400)", `${kw.status} ${kw2.text}`);
  const kz = await call("DELETE", "/api/portal/kuendigung", { cookie: C.cookie });
  const kz2 = await call("DELETE", "/api/portal/kuendigung", { cookie: C.cookie });
  check(kz.status === 200 && kz2.status === 400 && kz2.data.error === "Keine offene Kündigung, die zurückgenommen werden kann.", "Dashboard-Rücknahme unverändert", kz2.text);

  // ==================================================================================================
  teil("Allgemein: no-store, Fehlerformat, unbekannte Pfade");
  const unb = await call("GET", "/api/app/gibtsnicht", { token: tBneu });
  check(unb.status === 404 && unb.data.error === "Nicht gefunden" && unb.headers.get("cache-control") === "no-store", "Unbekannter App-Pfad → 404 JSON mit no-store");
  const g401 = await call("GET", "/api/app/team");
  check(g401.status === 401 && g401.data.code === "nicht_angemeldet" && g401.headers.get("content-type").startsWith("application/json") && g401.headers.get("cache-control") === "no-store", "401 als JSON mit code nicht_angemeldet und no-store");
  const tg = await call("GET", "/api/app/team", { token: tBneu });
  check(JSON.stringify(Object.keys(tg.data)) === JSON.stringify(["hauptadresse", "team", "max", "darfAendern"]), "GET /api/app/team Format", tg.text);

  { // Apple-Abo: eigener Block (eigene Namen)
  // ==================================================================================================
  // ======================================== Apple-Abo (App) ==========================================
  // ==================================================================================================
  teil("Apple-Abo: Code für ein neues Studio (registrieren/code, registrieren/pruefen)");
  const regCode = async (email) => { const vorher = mailsAn(email).length; const r = await call("POST", "/api/app/registrieren/code", { body: { email, platform: "ios" } }); return { r, neu: mailsAn(email).length > vorher, code: codeAus(codeMail(email)) }; };
  const REG = (registrierToken, extra = {}) => ({ registrierToken, firma: "Ink App Studio", inhaber: "Mia Neu", strasse: "Appweg 3", plz: "96050", ort: "Bamberg", telefon: "0151 7654321", studioTelefon: "0951 765432", ustid: "", website: "", unterzeichner: "Mia Neu", akzeptiert: { vertrag: true, avv: true, unternehmer: true, kmu: true }, ...extra });
  const pruefen = (email, code, geraet = GERAET("iPhone Neu")) => call("POST", "/api/app/registrieren/pruefen", { body: { email, code, geraet } });
  async function registrierToken(email) { rlReset(); const { code } = await regCode(email); const p = await pruefen(email, code); return p.data.registrierToken; }
  async function entwurf(email, firma) {
    const t = await registrierToken(email);
    const r = await call("POST", "/api/app/registrieren", { body: REG(t, { firma }) });
    return { ...r.data, status: r.status, text: r.text };
  }
  const bestaetigen = (entwurfToken, jws, geraet = GERAET("iPhone Neu")) => call("POST", "/api/app/abo/bestaetigen", { body: { entwurfToken, signedTransaction: jws, geraet } });
  const notif = (n) => call("POST", "/api/apple/benachrichtigung", { body: { signedPayload: n.signedPayload } });
  const adminMails = (re) => mailsAn("admin@app.test").filter((m) => re.test(m.subject));
  const D = await studioAnlegen("anna@ink-d.test", "Ink Studio D", "Coburg");
  const E = await studioAnlegen("ben@ink-e.test", "Ink Studio E", "Kronach");
  await admin(`studio/${E.id}/team`, { emails: ["anna@ink-d.test"] });
  // Anna (Inhaberin von D, Team bei E) über die Auswahl in D anmelden
  async function loginD() {
    const l = await appLogin("anna@ink-d.test", GERAET("iPhone Anna"));
    return l.token ? l : (await call("POST", "/api/app/anmelden", { body: { auswahlToken: l.auswahlToken, studioId: D.id, geraet: GERAET("iPhone Anna") } })).data;
  }

  rlReset();
  const studiosVorher = (await admin("studios")).length;
  const rc = await regCode("mia@neu-app.test");
  const rcMail = codeMail("mia@neu-app.test");
  const rcBekannt = await call("POST", "/api/app/registrieren/code", { body: { email: "tom@ink-c.test", platform: "ios" } });
  check(rc.r.status === 200 && rc.neu && /^\d{6} ist dein Tattoofin-Code$/.test(rcMail?.subject || "") && /um dein Studio anzulegen/.test(rcMail?.html || "") && !/49\s?€|netto|start\.html/.test(rcMail?.text || ""), "registrieren/code, neue Adresse: Mail mit Code „um dein Studio anzulegen“ (ohne Preis, ohne Web-Anmeldung)", rcMail?.subject);
  check(rcBekannt.text === rc.r.text && (await admin("studios")).length === studiosVorher && dateien("appreg/").length === 1, "Antwort identisch zu einer bekannten Adresse, kein Studio angelegt, Code nur als appreg/<hash>", rcBekannt.text);
  check(!JSON.stringify(dateien("appreg/").map((f) => fs.readFileSync(path.join(dataDir, f), "utf8"))).includes(rc.code), "Registrier-Code nicht im Klartext gespeichert");
  rlReset();
  await call("POST", "/api/app/code", { body: { email: "teilen@neu-app.test", platform: "ios" } });
  await call("POST", "/api/app/code", { body: { email: "teilen@neu-app.test", platform: "ios" } });
  let geteilt = 0; for (let i = 0; i < 2; i++) if ((await regCode("teilen@neu-app.test")).neu) geteilt++;
  check(geteilt === 1, "Grenzen gemeinsam mit /api/app/code: 2× /api/app/code + 2× registrieren/code in 15 Min. → nur 1 Mail (4. kommt nicht)", `${geteilt} Mails`);

  rlReset();
  const bek = await regCode("tom@ink-c.test");
  const bekP = await pruefen("tom@ink-c.test", bek.code);
  check(bek.neu && bekP.status === 200 && bekP.data.art === "angemeldet" && /^tfa_/.test(bekP.data.token || "") && bekP.data.studio?.id === C.id && bekP.data.geraet?.rolle === "inhaber", "Bekannte aktive Adresse: Anmelde-Code → pruefen art „angemeldet“ mit Token", bekP.text.slice(0, 160));
  rlReset();
  const zwei = await regCode("anna@ink-d.test");
  const zweiP = await pruefen("anna@ink-d.test", zwei.code);
  check(zweiP.data.art === "auswahl" && zweiP.data.auswahl?.length === 2 && zweiP.data.auswahlToken, "Adresse mit zwei Studios → art „auswahl“ (weiter mit /api/app/anmelden)", zweiP.text.slice(0, 160));
  const zweiA = await call("POST", "/api/app/anmelden", { body: { auswahlToken: zweiP.data.auswahlToken, studioId: E.id, geraet: GERAET() } });
  check(zweiA.status === 200 && zweiA.data.geraet?.rolle === "team", "Auswahl-Token aus pruefen funktioniert mit /api/app/anmelden", zweiA.text.slice(0, 120));

  rlReset();
  const fc = await regCode("falsch@neu-app.test");
  const fcFalsch = fc.code === "000000" ? "111111" : "000000";
  const fcR = [];
  for (let i = 0; i < 5; i++) { const r = await pruefen("falsch@neu-app.test", fcFalsch); fcR.push(`${r.status}/${r.data.code}/${r.data.restVersuche ?? "-"}`); }
  const fcNach = await pruefen("falsch@neu-app.test", fc.code);
  check(fcR.join(",") === "400/code_falsch/4,400/code_falsch/3,400/code_falsch/2,400/code_falsch/1,410/code_gesperrt/-" && fcNach.data.code === "code_abgelaufen", "Falscher Registrier-Code → code_falsch mit restVersuche, 5. Fehlversuch → code_gesperrt, danach weg", fcR.join(","));
  check((await pruefen("falsch@neu-app.test", "12345")).data.code === "eingabe" && (await call("POST", "/api/app/registrieren/pruefen", { body: { email: "x@y.test", code: "123456", geraet: { platform: "windows" } } })).data.code === "platform", "pruefen: Eingabe- und Plattform-Prüfung wie /api/app/anmelden");
  rlReset();
  const okC = await regCode("mia@neu-app.test");
  const okP = await pruefen("mia@neu-app.test", okC.code);
  const okP2 = await pruefen("mia@neu-app.test", okC.code);
  check(okP.status === 200 && okP.data.art === "registrieren" && okP.data.registrierToken && okP.data.email === "mia@neu-app.test" && okP.data.entwurf === null && okP2.data.code === "code_abgelaufen", "Richtiger Code → art „registrieren“ mit registrierToken, entwurf null; Code nur einmal verwendbar", okP.text.slice(0, 160));

  // ==================================================================================================
  teil("Apple-Abo: Studio-Angaben + Vertrag (POST /api/app/registrieren)");
  const rt = okP.data.registrierToken;
  const reg = (b) => call("POST", "/api/app/registrieren", { body: b });
  rlReset();
  const leer = await reg({ registrierToken: rt, akzeptiert: { vertrag: true, avv: true, unternehmer: true, kmu: true } });
  check(leer.status === 400 && leer.data.code === "eingabe" && JSON.stringify(leer.data.felder) === JSON.stringify(["firma", "inhaber", "strasse", "plz", "ort", "telefon", "studioTelefon", "unterzeichner"]) && /^Bitte ausfüllen: /.test(leer.data.error), "Fehlende Felder → 400 eingabe mit felder (Reihenfolge wie im Formular)", leer.text);
  const plz = await reg(REG(rt, { plz: "9604" }));
  const tel = await reg(REG(rt, { telefon: "12345" }));
  check(plz.data.code === "eingabe" && JSON.stringify(plz.data.felder) === '["plz"]' && /PLZ \(5 Ziffern\)/.test(plz.data.error) && JSON.stringify(tel.data.felder) === '["telefon"]', "PLZ „9604“ → felder [plz]; Mobilnummer „12345“ → felder [telefon]", `${plz.text} ${tel.text}`);
  const ohneKmu = await reg(REG(rt, { akzeptiert: { vertrag: true, avv: true, unternehmer: true } }));
  check(ohneKmu.status === 400 && ohneKmu.data.code === "bestaetigung_fehlt" && ohneKmu.data.error === "Bitte bestätige Vertrag, AVV, Unternehmer und KMU.", "Ohne KMU-Bestätigung → 400 bestaetigung_fehlt", ohneKmu.text);
  const altT = auth.sign({ t: "appreg", email: "mia@neu-app.test", n: "x", exp: Date.now() - 1000 });
  const fremdT = auth.sign({ t: "appentwurf", email: "mia@neu-app.test", exp: Date.now() + 60e3 });
  const rAlt = await reg(REG(altT)), rKaputt = await reg(REG("abc.def")), rFremd = await reg(REG(fremdT));
  check([rAlt, rKaputt, rFremd].every((r) => r.status === 410 && r.data.code === "registrierung_abgelaufen") && rAlt.data.error === "Deine Bestätigung ist abgelaufen. Fordere bitte einen neuen Code an.", "Abgelaufener, kaputter oder fremder Token → 410 registrierung_abgelaufen", rAlt.text);
  const aktivT = auth.sign({ t: "appreg", email: "tom@ink-c.test", n: "y", exp: Date.now() + 60e3 });
  const rAktiv = await reg(REG(aktivT));
  check(rAktiv.status === 409 && rAktiv.data.code === "schon_aktiv" && rAktiv.data.error === "Für diese E-Mail gibt es schon ein Studio. Bitte melde dich an.", "Adresse mit aktivem Studio → 409 schon_aktiv", rAktiv.text);
  rlReset();
  let r21; for (let i = 0; i < 21; i++) r21 = await reg({ registrierToken: "x" });
  check(r21.status === 429 && r21.data.code === "zu_viele", "21. Aufruf pro IP und Stunde → 429 zu_viele", r21.text);
  rlReset();
  const kundenVorher = Object.keys((await mock("state")).customers || {}).length;
  const adminVorher = mailsAn("admin@app.test").length;
  const e1 = await reg(REG(rt));
  const s1 = blob("studio/" + e1.data.entwurfId);
  check(e1.status === 200 && /^st_/.test(e1.data.entwurfId) && e1.data.produktId === "de.tattoofin.app.abo.monatlich" && e1.data.email === "mia@neu-app.test" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(e1.data.appAccountToken) && e1.data.entwurfToken, "Gültig → { entwurfId, entwurfToken, appAccountToken (UUID v4), produktId, email }", e1.text);
  check(s1?.status === "entwurf" && s1.paket === "app" && s1.abrechnung === "apple" && s1.zahlart === "apple" && s1.modell === "kauf" && s1.appEntwurf?.appAccountToken === e1.data.appAccountToken && s1.vertrag?.kmu && s1.vertrag.version === "2026-12b" && s1.vertrag.quelle === "app" && s1.vertrag.aufsteller === false && blob("idx/appentwurf/" + e1.data.appAccountToken) === s1.id, "Entwurf: status entwurf, paket app, abrechnung apple, Vertrag 2026-12b mit KMU, idx/appentwurf", JSON.stringify(s1)?.slice(0, 200));
  check(Object.keys((await mock("state")).customers || {}).length === kundenVorher && !s1.stripe?.customerId && mailsAn("admin@app.test").length === adminVorher && mailsAn("mia@neu-app.test").filter((m) => !/Tattoofin-Code$/.test(m.subject)).length === 0, "Kein Stripe-Kunde, keine Admin-Mail, keine Mail an das Studio");
  const e1b = await reg(REG(rt, { firma: "Ink App Studio Neu" }));
  check(e1b.data.entwurfId === e1.data.entwurfId && e1b.data.appAccountToken === e1.data.appAccountToken && blob("studio/" + e1.data.entwurfId).firma === "Ink App Studio Neu", "Zweiter Aufruf (Korrektur): gleicher Entwurf, gleiche UUID", e1b.text);
  rlReset();
  const okC2 = await regCode("mia@neu-app.test");
  const okP3 = await pruefen("mia@neu-app.test", okC2.code);
  check(okP3.data.art === "registrieren" && okP3.data.entwurf?.firma === "Ink App Studio Neu" && okP3.data.entwurf?.plz === "96050" && okP3.data.entwurf?.unterzeichner === "Mia Neu", "Erneut prüfen: entwurf mit den Angaben zum Vorbelegen", JSON.stringify(okP3.data.entwurf));

  // ==================================================================================================
  teil("Apple-Abo: Kauf bestätigen (POST /api/app/abo/bestaetigen)");
  const N = e1b.data;
  const kaufN = apple.kauf({ appAccountToken: N.appAccountToken });
  rlReset();
  const bN = await bestaetigen(N.entwurfToken, kaufN.jws, GERAET("iPhone Mia"));
  const sN = blob("studio/" + N.entwurfId);
  const tN = bN.data.token;
  check(bN.status === 200 && /^tfa_/.test(tN || "") && bN.data.studio?.id === N.entwurfId && bN.data.geraet?.rolle === "inhaber" && bN.data.abo?.status === "aktiv" && bN.data.abo?.sandbox === false && bN.data.abo?.appAccountToken === N.appAccountToken && bN.data.abo?.produktId === "de.tattoofin.app.abo.monatlich", "Gültiger Kauf → Token tfa_…, Rolle inhaber, abo aktiv", bN.text.slice(0, 220));
  check(sN.status === "einrichtung" && sN.sandbox === false && sN.apple?.originalTransactionId === kaufN.tx.originalTransactionId && sN.apple.umgebung === "Production" && sN.apple.preisMilli === 59990 && sN.apple.waehrung === "EUR" && sN.apple.storefront === "DEU" && !sN.appEntwurf && !blob("idx/appentwurf/" + N.appAccountToken) && blob("idx/appleotx/" + kaufN.tx.originalTransactionId) === sN.id && blob("apple/aktiviert/" + kaufN.tx.originalTransactionId), "Studio einrichtung, apple.* gesetzt, Entwurf-Index weg, idx/appleotx + apple/aktiviert", JSON.stringify(sN.apple).slice(0, 220));
  const adminNeu = adminMails(/Neuer Abschluss in der App \(Apple-Abo\)/).filter((m) => m.subject.includes("Ink App Studio Neu"));
  const willkommen = mailsAn("mia@neu-app.test").filter((m) => /^Willkommen bei Tattoofin/.test(m.subject));
  check(adminNeu.length === 1 && !/Sandbox/.test(adminNeu[0].subject) && /59,99 EUR/.test(adminNeu[0].html), "Admin-Mail „Neuer Abschluss in der App (Apple-Abo) 🎉“ mit Preis aus dem Kauf", adminNeu[0]?.subject);
  check(willkommen.length === 1 && /Abo über deinen Apple-Account/.test(willkommen[0].html) && !/49\s?(€|&nbsp;€|,00)/.test(willkommen[0].text) && !/start\.html/.test(willkommen[0].html) && !/Aufsteller/.test(willkommen[0].html) && /vertrag\.html\?app=1/.test(willkommen[0].html) && /avv\.html\?app=1/.test(willkommen[0].html) && !/vertrag\.html"/.test(willkommen[0].html) && /Verkäufer des Abos ist Apple/.test(willkommen[0].html), "Studio-Mail „Willkommen“: Apple-Abo (Apple als Verkäufer), ohne Web-Preis, ohne start.html, ohne Aufsteller, Vertrag/AVV als App-Fassung (?app=1)", willkommen[0]?.subject);
  const portalN = await call("GET", "/api/portal", { token: tN });
  check(portalN.status === 200 && portalN.data.studio?.abrechnung === "apple" && portalN.data.studio?.apple?.status === "aktiv" && portalN.data.studio?.apple?.laeuftBis && portalN.data.studio?.paket === "app" && portalN.data.studio?.paketName === "Monatlich (App Store)" && portalN.data.studio?.garantieBis === null && portalN.data.studio?.aufsteller?.inklusive === false && portalN.data.studio?.connectUrl, "GET /api/portal: studio.abrechnung apple, studio.apple (AppleAbo), Paket „Monatlich (App Store)“, ohne Garantie und Aufsteller", JSON.stringify(portalN.data.studio?.apple));
  const portalC = await call("GET", "/api/portal", { cookie: C.cookie });
  check(portalC.data.studio?.abrechnung === "stripe" && portalC.data.studio?.apple === null, "Stripe-Studio: abrechnung stripe, apple null");
  check((await admin("studios")).find((x) => x.id === sN.id)?.paket === "Monatlich (App Store)", "Admin-Liste zeigt „Monatlich (App Store)“");

  // Sandbox (TestFlight)
  const S = await entwurf("sandra@neu-app.test", "Sandbox Studio");
  const kaufS = apple.kauf({ appAccountToken: S.appAccountToken, environment: "Sandbox" });
  const bS = await bestaetigen(S.entwurfToken, kaufS.jws);
  const sS = blob("studio/" + S.entwurfId);
  check(bS.status === 200 && bS.data.abo?.sandbox === true && sS.sandbox === true && sS.apple.umgebung === "Sandbox" && adminMails(/\[Sandbox\/TestFlight, kein Geld\]/).some((m) => m.subject.includes("Sandbox Studio")), "Sandbox-Kauf → sandbox true, Admin-Betreff mit „[Sandbox/TestFlight, kein Geld]“", bS.text.slice(0, 160));

  // ==================================================================================================
  teil("Apple-Abo: Fälschungen und falsche Käufe werden abgelehnt");
  const F = await entwurf("fritz@neu-app.test", "Fälschung Studio");
  const G = await entwurf("gabi@neu-app.test", "Anderer Entwurf");
  const txF = apple.transaktion({ appAccountToken: F.appAccountToken });
  const jwsF = apple.jws(txF);
  const [k0, , k2] = jwsF.split(".");
  const veraendert = `${k0}.${Buffer.from(JSON.stringify({ ...txF, expiresDate: txF.expiresDate + 365 * 864e5 })).toString("base64url")}.${k2}`;
  const faelle = [
    ["Nutzlast verändert (Signatur passt nicht)", veraendert, "jws_ungueltig", 400],
    ["Fremde Wurzel (falsches Apple)", apple.jws(txF, { kette: "fremd" }), "jws_ungueltig", 400],
    ["Blatt ohne Apple-Markierung (OID)", apple.jws(txF, { kette: "ohneOid" }), "jws_ungueltig", 400],
    ["Abgelaufenes Zwischenzertifikat", apple.jws(txF, { kette: "abgelaufen" }), "jws_ungueltig", 400],
    ["alg „none“", apple.jws(txF, { alg: "none", signatur: "keine" }), "jws_ungueltig", 400],
    ["alg „HS256“", apple.jws(txF, { alg: "HS256", signatur: "hs256" }), "jws_ungueltig", 400],
    ["x5c mit 2 Einträgen", apple.jws(txF, { kette: "zwei" }), "jws_ungueltig", 400],
    ["Xcode-Kette ohne Schalter", apple.jws({ ...txF, environment: "Xcode" }, { kette: "xcode" }), "jws_ungueltig", 400],
    ["Kein JWS", "kein.jws", "jws_ungueltig", 400],
    ["Falsche bundleId", apple.jws({ ...txF, bundleId: "de.andere.app" }), "produkt", 400],
    ["Falsche productId", apple.jws({ ...txF, productId: "de.tattoofin.app.abo.jahr" }), "produkt", 400],
    ["environment „Xcode“ ohne Schalter", apple.jws({ ...txF, environment: "Xcode" }), "umgebung", 400],
    ["expiresDate vergangen", apple.jws({ ...txF, expiresDate: Date.now() - 1000 }), "abo_abgelaufen", 402],
    ["revocationDate (erstattet)", apple.jws({ ...txF, revocationDate: Date.now() - 1000 }), "abo_abgelaufen", 402],
    ["Familienfreigabe", apple.jws({ ...txF, inAppOwnershipType: "FAMILY_SHARED" }), "familie", 400],
    ["UUID eines anderen Entwurfs", apple.jws({ ...txF, appAccountToken: G.appAccountToken }), "token_passt_nicht", 409],
    ["Gleiche originalTransactionId wie ein aktives Studio", apple.jws({ ...txF, originalTransactionId: kaufN.tx.originalTransactionId }), "abo_vergeben", 409],
  ];
  for (const [name, jws, code, status] of faelle) {
    rlReset();
    const r = await bestaetigen(F.entwurfToken, jws);
    check(r.status === status && r.data.code === code && typeof r.data.error === "string", `${name} → ${status} ${code}`, r.text.slice(0, 160));
  }
  const fremdesToken = await bestaetigen(G.entwurfToken, jwsF);
  check(fremdesToken.status === 409 && fremdesToken.data.code === "token_passt_nicht", "entwurfToken eines anderen Studios → 409 token_passt_nicht", fremdesToken.text);
  const ohneToken = await bestaetigen("kaputt", jwsF);
  check(ohneToken.status === 410 && ohneToken.data.code === "entwurf_abgelaufen" && ohneToken.data.error === "Deine Anmeldung ist abgelaufen. Bitte fang neu an.", "Ungültiger entwurfToken → 410 entwurf_abgelaufen", ohneToken.text);
  check(blob("studio/" + F.entwurfId).status === "entwurf" && !blob("studio/" + F.entwurfId).apple && blob("studio/" + G.entwurfId).status === "entwurf", "Nach allen Ablehnungen: Entwürfe unverändert");
  check(faelle.length === 17 && (await bestaetigen(F.entwurfToken, jwsF)).status === 200, "Danach geht der echte Kauf für F durch");

  // Xcode-Testkauf (nur lokal mit APPLE_XCODE_TEST=1)
  process.env.APPLE_XCODE_TEST = "1";
  const X = await entwurf("xaver@neu-app.test", "Xcode Studio");
  const bX = await bestaetigen(X.entwurfToken, apple.jws(apple.transaktion({ appAccountToken: X.appAccountToken, environment: "Xcode", originalTransactionId: "0", transactionId: "0" }), { kette: "xcode" }));
  const sX = blob("studio/" + X.entwurfId);
  check(bX.status === 200 && sX.apple?.umgebung === "Xcode" && sX.sandbox === true && blob(`idx/appleotx/xcode-${X.appAccountToken}-0`) === sX.id, "APPLE_XCODE_TEST=1 (nur lokal): StoreKit-Testkauf aus Xcode angenommen, Abo-Kette je appAccountToken eindeutig", bX.text.slice(0, 160));
  // Echtes Xcode-Zertifikat ist selbstsigniert, aber kein CA-Zertifikat (Fehler im Simulator-Test 14.11.: jws_ungueltig)
  const X2 = await entwurf("xenia@neu-app.test", "Xcode Studio Zwei");
  const bX2 = await bestaetigen(X2.entwurfToken, apple.jws(apple.transaktion({ appAccountToken: X2.appAccountToken, environment: "Xcode", originalTransactionId: "0", transactionId: "0" }), { kette: "xcodeBlatt" }));
  check(bX2.status === 200 && blob("studio/" + X2.entwurfId)?.apple?.umgebung === "Xcode", "APPLE_XCODE_TEST=1: selbstsigniertes Xcode-Zertifikat ohne CA-Kennzeichen wird angenommen", bX2.text.slice(0, 160));
  delete process.env.APPLE_XCODE_TEST;
  const bX3 = await bestaetigen(X2.entwurfToken, apple.jws(apple.transaktion({ appAccountToken: X2.appAccountToken, environment: "Xcode", originalTransactionId: "1", transactionId: "1" }), { kette: "xcodeBlatt" }));
  check(bX3.status === 400 && bX3.data.code === "jws_ungueltig", "Ohne APPLE_XCODE_TEST: Xcode-Zertifikat ohne CA-Kennzeichen abgelehnt", bX3.text.slice(0, 120));

  // ==================================================================================================
  teil("Apple-Abo: derselbe Kauf zweimal, Benachrichtigung vor der App");
  const zweimal = await bestaetigen(N.entwurfToken, kaufN.jws, GERAET("iPad Mia"));
  check(zweimal.status === 200 && zweimal.data.studio?.id === N.entwurfId && zweimal.data.geraet?.id !== bN.data.geraet?.id && adminMails(/Neuer Abschluss in der App/).filter((m) => m.subject.includes("Ink App Studio Neu")).length === 1 && mailsAn("mia@neu-app.test").filter((m) => /^Willkommen bei Tattoofin/.test(m.subject)).length === 1, "Gleicher JWS nochmal → zweites Gerät, gleiche Studio-ID, nur EINE Admin- und Willkommens-Mail", zweimal.text.slice(0, 120));
  const P = await entwurf("paul@neu-app.test", "Notif Studio");
  const kaufP = apple.kauf({ appAccountToken: P.appAccountToken });
  const nSub = await notif(apple.benachrichtigung({ typ: "SUBSCRIBED", subtyp: "INITIAL_BUY", tx: kaufP.tx }));
  const sP = blob("studio/" + P.entwurfId);
  check(nSub.status === 200 && nSub.data.ok === true && sP.status === "einrichtung" && sP.apple?.status === "aktiv" && sP.apple.autoVerlaengerung === true && blob("idx/appleotx/" + kaufP.tx.originalTransactionId) === sP.id, "SUBSCRIBED vor „bestaetigen“ aktiviert den Entwurf", nSub.text);
  const bP = await bestaetigen(P.entwurfToken, kaufP.jws);
  check(bP.status === 200 && /^tfa_/.test(bP.data.token || "") && bP.data.studio?.id === P.entwurfId && adminMails(/Neuer Abschluss in der App/).filter((m) => m.subject.includes("Notif Studio")).length === 1 && mailsAn("paul@neu-app.test").filter((m) => /^Willkommen/.test(m.subject)).length === 1, "Danach liefert „bestaetigen“ trotzdem das Token, Mails nur einmal", bP.text.slice(0, 120));

  // ==================================================================================================
  teil("Apple-Abo: Stripe verbinden (Connect), Sandbox ohne Stripe");
  const cUrlN = new URL(portalN.data.studio.connectUrl);
  const cN = await fetch(BASE + cUrlN.pathname + cUrlN.search, { redirect: "manual" });
  const kontoN = blob("studio/" + N.entwurfId).stripe?.accountId;
  check(cN.status === 302 && /\/onboard\//.test(cN.headers.get("location") || "") && /^acct_/.test(kontoN || ""), "Connect-Link aus /api/portal → Stripe-Onboarding (Standard-Konto)", cN.headers.get("location"));
  await stripeForm(`/onboarding-fertig/${kontoN}`, { name: "Mia Neu", iban: "DE89370400440532013000" }); await wait(200);
  const zurueck = await fetch(`${BASE}/api/connect/zurueck?id=${N.entwurfId}&t=${cUrlN.searchParams.get("t")}`, { redirect: "manual" });
  check(/\/danke\.html\?id=.*&stripe=1&app=1$/.test(zurueck.headers.get("location") || ""), "Rücksprung von Stripe bei Apple-Studios → /danke.html?…&stripe=1&app=1", zurueck.headers.get("location"));
  const kasseN = await call("GET", "/api/portal", { token: tN });
  check(kasseN.data.studio?.kannKassieren === true && kasseN.data.studio?.stripe?.freigegeben === true, "Danach Kasse offen (kannKassieren)", JSON.stringify(kasseN.data.studio?.stripe));
  const zN = await call("POST", "/api/portal/zahlung", { token: tN, body: { betrag: "200", kunde: "Kunde Apple", beschreibung: "Testmotiv" } });
  check([200, 201].includes(zN.status) && zN.data.zahlung?.id, "Zahlungslink anlegen geht", zN.text.slice(0, 100));
  const sandboxStudio = await call("GET", "/api/portal", { token: bS.data.token });
  const sbS = sandboxStudio.data.studio || {};
  check(sbS.apple?.sandbox === true && sbS.testmodus === true && sbS.kannKassieren === true && sbS.connectUrl === null && sbS.stripe?.verbunden === false, "Sandbox-Studio (Testkauf, App Review): Kasse offen im Testmodus, keine Stripe-Einrichtung (connectUrl null)", JSON.stringify({ t: sbS.testmodus, k: sbS.kannKassieren, c: sbS.connectUrl }));
  const zSb = await call("POST", "/api/portal/zahlung", { token: bS.data.token, body: { betrag: "150", kunde: "Prüfer Kunde", beschreibung: "Testmotiv" } });
  const paySb = await call("POST", "/api/pay", { body: { z: zSb.data.zahlung?.id, inhaltOk: true } });
  const paySb2 = await call("POST", "/api/pay", { body: { s: blob("studio/" + S.entwurfId).slug, betrag: "50" } });
  const dzSb = await call("POST", "/api/app/demo-zahlung/" + zSb.data.zahlung?.id, { token: bS.data.token });
  check([200, 201].includes(zSb.status) && paySb.status === 409 && paySb2.status === 409 && dzSb.status === 200 && dzSb.data.status === "bezahlt", "Sandbox-Studio: Link anlegen geht, echte Zahlung → 409, „Testzahlung auslösen“ → bezahlt (kein Stripe)", `${zSb.status} ${paySb.status} ${paySb2.status} ${dzSb.status}`);
  process.env.APPLE_SANDBOX_STRIPE = "1";
  const sbMitStripe = await call("GET", "/api/portal", { token: bS.data.token });
  const cUrlS = new URL(sbMitStripe.data.studio.connectUrl);
  delete process.env.APPLE_SANDBOX_STRIPE;
  const cS = await fetch(BASE + cUrlS.pathname + cUrlS.search, { redirect: "manual" });
  check(/\/danke\.html\?id=.*&connect=sandbox&app=1$/.test(cS.headers.get("location") || "") && !blob("studio/" + S.entwurfId).stripe?.accountId, "Sandbox-Studio: Connect → /danke.html?…&connect=sandbox&app=1, kein Stripe-Konto", cS.headers.get("location"));
  process.env.APPLE_SANDBOX_STRIPE = "1";
  const cS2 = await fetch(BASE + cUrlS.pathname + cUrlS.search, { redirect: "manual" });
  const sbOffen = await call("GET", "/api/portal", { token: bS.data.token });
  check(/\/onboard\//.test(cS2.headers.get("location") || "") && sbOffen.data.studio?.apple?.sandbox === false && sbOffen.data.studio?.testmodus === false, "APPLE_SANDBOX_STRIPE=1: Sandbox-Studio darf Stripe einrichten (apple.sandbox false, kein Testmodus)", cS2.headers.get("location"));
  delete process.env.APPLE_SANDBOX_STRIPE;
  const danke = await (await fetch(`${BASE}/danke.html?id=x&stripe=1&app=1`)).text();
  check(/Wechsel jetzt zurück in die Tattoofin-App/.test(danke) && /q\.get\("app"\) === "1"\) \{ appEnde\(\); return; \}/.test(danke) && /Testkonto: Die Stripe-Einrichtung ist hier ausgeschaltet/.test(danke), "danke.html: App-Modus ohne Purchase-Messung, Text „Wechsel jetzt zurück in die Tattoofin-App“");

  // ==================================================================================================
  teil("Apple-Abo: Server-Benachrichtigungen V2");
  const aN = () => blob("studio/" + N.entwurfId);
  const renew = apple.verlaengerung(kaufN.tx, { expiresDate: Date.now() + 60 * 864e5 });
  const nRenew = await notif(apple.benachrichtigung({ typ: "DID_RENEW", tx: renew }));
  check(nRenew.status === 200 && Date.parse(aN().apple.laeuftBis) === renew.expiresDate && aN().apple.letzteTransactionId === renew.transactionId && aN().apple.status === "aktiv", "DID_RENEW → laeuftBis neu, letzteTransactionId", JSON.stringify(aN().apple.laeuftBis));
  const nAus = await notif(apple.benachrichtigung({ typ: "DID_CHANGE_RENEWAL_STATUS", subtyp: "AUTO_RENEW_DISABLED", tx: renew, renewalInfo: apple.renewal(renew, { autoRenewStatus: 0 }) }));
  const kAus = await call("GET", "/api/portal", { token: tN });
  check(nAus.status === 200 && aN().apple.autoVerlaengerung === false && aN().apple.status === "gekuendigt" && aN().status === "einrichtung" && kAus.data.studio?.kannKassieren === true && kAus.data.studio?.apple?.status === "gekuendigt" && kAus.data.studio?.apple?.autoVerlaengerung === false, "AUTO_RENEW_DISABLED → autoVerlaengerung false, status gekuendigt, Kasse bleibt offen", JSON.stringify(kAus.data.studio?.apple));
  await notif(apple.benachrichtigung({ typ: "DID_CHANGE_RENEWAL_STATUS", subtyp: "AUTO_RENEW_ENABLED", tx: renew }));
  check(aN().apple.autoVerlaengerung === true && aN().apple.status === "aktiv", "AUTO_RENEW_ENABLED → wieder aktiv");
  const nFail = await notif(apple.benachrichtigung({ typ: "DID_FAIL_TO_RENEW", subtyp: "GRACE_PERIOD", tx: renew, renewalInfo: apple.renewal(renew, { gracePeriodExpiresDate: renew.expiresDate + 6 * 864e5 }) }));
  check(nFail.status === 200 && aN().apple.status === "zahlungsproblem" && Date.parse(aN().apple.laeuftBis) === renew.expiresDate + 6 * 864e5 && aN().status === "einrichtung" && adminMails(/Verlängerung fehlgeschlagen/).length >= 1, "DID_FAIL_TO_RENEW (Kulanzzeit) → zahlungsproblem, Zugang bis Ende der Kulanzzeit, Admin-Mail");
  const abgelaufen = { ...renew, expiresDate: Date.now() - 1000 };
  const mailsVorEnde = mailsAn("mia@neu-app.test").length;
  const nExp = await notif(apple.benachrichtigung({ typ: "EXPIRED", subtyp: "VOLUNTARY", tx: abgelaufen }));
  const kExp = await call("GET", "/api/portal", { token: tN });
  const endeMail = mailsAn("mia@neu-app.test").slice(mailsVorEnde).find((m) => m.subject === "Dein Tattoofin-Abo ist beendet");
  check(nExp.status === 200 && aN().status === "beendet" && aN().apple.status === "abgelaufen" && aN().apple.gesperrt && kExp.status === 200 && kExp.data.studio?.kannKassieren === false && kExp.data.studio?.apple?.status === "abgelaufen" && (kExp.data.zahlungen || []).some((z) => z.id === zN.data.zahlung.id), "EXPIRED → Studio beendet, Kasse gesperrt, Login + Zahlungen bleiben", JSON.stringify(kExp.data.studio?.apple));
  check(Boolean(endeMail) && /Abo wieder abschließen/.test(endeMail.html) && !/49\s?€|netto|start\.html/.test(endeMail.text) && adminMails(/Apple-Abo beendet \(abgelaufen\)/).length === 1, "Mail „Dein Tattoofin-Abo ist beendet“ (ohne Web-Preis/-Link) + Admin-Mail", endeMail?.subject);
  const zNeu = await call("POST", "/api/portal/zahlung", { token: tN, body: { betrag: "200", kunde: "Kunde", beschreibung: "x" } });
  check(zNeu.status === 409, "Gesperrt: neuer Zahlungslink → 409", zNeu.text.slice(0, 120));
  const akt = await call("POST", "/api/app/abo/aktualisieren", { token: tN, body: { signedTransaction: apple.jws(apple.verlaengerung(kaufN.tx)) } });
  check(akt.status === 200 && aN().status === "beendet" && aN().apple.status === "abgelaufen", "abo/aktualisieren kann ein gesperrtes Studio NICHT wieder öffnen", akt.text.slice(0, 160));
  const erneut = apple.verlaengerung(kaufN.tx);
  const bTeam = await call("POST", "/api/app/abo/bestaetigen", { token: tN, body: { signedTransaction: apple.jws({ ...erneut, appAccountToken: G.appAccountToken }) } });
  check(bTeam.status === 409 && bTeam.data.code === "token_passt_nicht", "Erneuern mit fremder appAccountToken → 409 token_passt_nicht", bTeam.text);
  const bErneuert = await call("POST", "/api/app/abo/bestaetigen", { token: tN, body: { signedTransaction: apple.jws(erneut) } });
  check(bErneuert.status === 200 && bErneuert.data.abo?.status === "aktiv" && bErneuert.data.studio?.kannKassieren === true && aN().status === "einrichtung" && !aN().apple.gesperrt && adminMails(/Apple-Abo wieder aktiv/).length >= 1, "Bearer-„bestaetigen“ (Abo wieder abschließen) → wieder offen", bErneuert.text.slice(0, 200));
  const nRefund = await notif(apple.benachrichtigung({ typ: "REFUND", tx: { ...erneut, revocationDate: Date.now(), revocationReason: 0 } }));
  check(nRefund.status === 200 && aN().status === "beendet" && aN().apple.status === "erstattet" && adminMails(/Apple hat ein Abo erstattet/).length === 1 && (await call("GET", "/api/portal", { token: tN })).data.studio?.kannKassieren === false, "REFUND → erstattet, gesperrt, Admin-Mail");
  const nRev = await notif(apple.benachrichtigung({ typ: "REFUND_REVERSED", tx: erneut }));
  check(nRev.status === 200 && aN().status === "einrichtung" && aN().apple.status === "aktiv" && (await call("GET", "/api/portal", { token: tN })).data.studio?.kannKassieren === true, "REFUND_REVERSED → wieder offen");
  const nRevoke = await notif(apple.benachrichtigung({ typ: "REVOKE", tx: { ...erneut, revocationDate: Date.now() } }));
  check(nRevoke.status === 200 && aN().status === "beendet" && aN().apple.status === "widerrufen", "REVOKE → widerrufen, gesperrt");
  const resub = apple.verlaengerung(kaufN.tx, { expiresDate: Date.now() + 30 * 864e5 });
  await notif(apple.benachrichtigung({ typ: "SUBSCRIBED", subtyp: "RESUBSCRIBE", tx: resub }));
  check(aN().status === "einrichtung" && aN().apple.status === "aktiv", "SUBSCRIBED (RESUBSCRIBE) → wieder offen");
  const doppel = apple.benachrichtigung({ typ: "RENEWAL_EXTENDED", tx: { ...resub, expiresDate: resub.expiresDate + 864e5 } });
  const ereignisseVorher = aN().apple.ereignisse.length;
  const d1 = await notif(doppel), d2 = await notif(doppel);
  check(d1.status === 200 && d2.status === 200 && d2.data.doppelt === true && aN().apple.ereignisse.length === Math.min(20, ereignisseVorher + 1) && Date.parse(aN().apple.laeuftBis) === resub.expiresDate + 864e5, "Gleiche notificationUUID zweimal → nur einmal verarbeitet (RENEWAL_EXTENDED → laeuftBis neu)", d2.text);
  const vorFalsch = JSON.stringify(aN().apple);
  const nFremd = await notif(apple.benachrichtigung({ typ: "EXPIRED", tx: abgelaufen, kette: "fremd" }));
  const nTxFremd = await notif(apple.benachrichtigung({ typ: "EXPIRED", tx: abgelaufen, txKette: "fremd" }));
  check(nFremd.status === 400 && nTxFremd.status === 400 && JSON.stringify(aN().apple) === vorFalsch && aN().status === "einrichtung", "Ungültige Signatur (Hülle oder Kauf) → 400, nichts geändert", `${nFremd.text} ${nTxFremd.text}`);
  const nTest = await notif(apple.benachrichtigung({ typ: "TEST", umgebung: "Sandbox" }));
  check(nTest.status === 200 && nTest.data.ok === true && logs("apple-benachrichtigung-test").length === 1, "TEST → 200, nur Log", nTest.text);
  const unbekannt2 = apple.transaktion();
  const nUnb = await notif(apple.benachrichtigung({ typ: "DID_RENEW", tx: unbekannt2 }));
  check(nUnb.status === 200 && blob("apple/offen/" + unbekannt2.originalTransactionId)?.typ === "DID_RENEW" && adminMails(/Apple-Abo ohne Studio/).length >= 1, "Unbekannte originalTransactionId → 200, apple/offen/<otx>, Admin-Mail „Apple-Abo ohne Studio“", nUnb.text);
  const nBundle = await notif(apple.benachrichtigung({ typ: "DID_RENEW", tx: renew, bundle: "de.andere.app" }));
  check(nBundle.status === 400, "Falsche bundleId in der Benachrichtigung → 400", nBundle.text);
  process.env.APPLE_APP_ID = "6700000001";
  const nAppIdOk = await notif(apple.benachrichtigung({ typ: "RENEWAL_EXTENSION", tx: resub }));
  const nAppIdFalsch = await notif(apple.benachrichtigung({ typ: "RENEWAL_EXTENSION", tx: resub, appId: 1 }));
  delete process.env.APPLE_APP_ID;
  check(nAppIdOk.status === 200 && nAppIdFalsch.status === 400, "APPLE_APP_ID gesetzt: Production-Benachrichtigung mit fremder appAppleId → 400", nAppIdFalsch.text);
  check((await call("GET", "/api/apple/benachrichtigung")).status === 405 && (await call("POST", "/api/apple/benachrichtigung", { body: {} })).status === 400, "GET → 405, ohne signedPayload → 400");

  // ==================================================================================================
  teil("Apple-Abo: nie über Stripe abrechnen");
  const monat = new Date().toISOString().slice(0, 7);
  const dry = await admin("abrechnung", { monat, dryRun: true });
  const echt = await admin("abrechnung", { monat, dryRun: false });
  check(Array.isArray(dry) && Array.isArray(echt) && ![...dry, ...echt].some((x) => /Ink App Studio Neu|Notif Studio|Sandbox Studio/.test(x.studio || "")) && dateien("abrechnung/" + N.entwurfId).length === 0, "monatsabrechnung (Probe und echt): Apple-Studios nie enthalten", JSON.stringify(dry).slice(0, 160));
  const stripeState = await mock("state");
  check(!Object.values(stripeState.customers || {}).some((c) => c.metadata?.studioId === N.entwurfId) && !Object.values(stripeState.subscriptions || {}).some((x) => x.metadata?.studioId === N.entwurfId) && !Object.values(stripeState.invoices || {}).some((x) => x.metadata?.studioId === N.entwurfId), "Stripe-Nachbau: kein Kunde, kein Abo, keine Rechnung für das Apple-Studio");
  const vorWebhook = JSON.stringify(aN());
  const wh = await sendeWebhook(`${BASE}/api/stripe-webhook`, "whsec_mock", "customer.subscription.deleted", { id: "sub_fremd", object: "subscription", metadata: { studioId: N.entwurfId } });
  const wh2 = await sendeWebhook(`${BASE}/api/stripe-webhook`, "whsec_mock", "invoice.payment_failed", { id: "in_fremd", object: "invoice", metadata: { studioId: N.entwurfId }, amount_due: 5831 });
  const nachWebhook = aN();
  check(wh === 200 && wh2 === 200 && JSON.stringify({ ...nachWebhook, updatedAt: null }) === JSON.stringify({ ...JSON.parse(vorWebhook), updatedAt: null }) && logs("stripe-ereignis-app-studio").length === 2 && !mailsAn("mia@neu-app.test").some((m) => m.subject === "Zahlung fehlgeschlagen: bitte kurz prüfen"), "stripe-webhook (subscription.deleted, invoice.payment_failed) ändert beim Apple-Studio nichts, keine Rechnungsmail", `${wh} ${wh2}`);

  // ==================================================================================================
  teil("Apple-Abo: Konto kündigen und löschen, Apple verlängert trotzdem");
  const laeuftBisVorher = aN().apple.laeuftBis;
  const loeN = await call("POST", "/api/app/konto-loeschen", { token: tN, body: { bestaetigung: "LÖSCHEN", grund: "Test" } });
  const loeMail = mailsAn("mia@neu-app.test").find((m) => m.subject === "Deine Kündigung und Löschanfrage sind eingegangen");
  check(loeN.status === 200 && loeN.data.appleAbo === true && loeN.data.kuendigungZum === laeuftBisVorher && aN().kuendigung?.zum === laeuftBisVorher && aN().status === "gekuendigt", "konto-loeschen: kuendigungZum = apple.laeuftBis, appleAbo true", loeN.text.slice(0, 160));
  check(Boolean(loeMail) && /Dein Abo läuft über Apple\. Kündige es zusätzlich in den Einstellungen deines Apple-Accounts unter Abos/.test(loeMail.html) && !/Monatsbetrag wird ab dem Vertragsende/.test(loeMail.html), "Löschanfrage-Mail mit Apple-Satz statt Monatlich-Satz", loeMail?.subject);
  const tD = (await loginD()).token;
  const loeC = await call("POST", "/api/app/konto-loeschen", { token: tD, body: { bestaetigung: "LÖSCHEN" } });
  check(loeC.status === 200 && loeC.data.appleAbo === false, "Stripe-Studio: appleAbo false", loeC.text.slice(0, 100));
  const spaeter = apple.verlaengerung(kaufN.tx, { expiresDate: Date.parse(laeuftBisVorher) + 30 * 864e5 });
  await notif(apple.benachrichtigung({ typ: "DID_RENEW", tx: spaeter }));
  const loeschungAbVorher = blob("studio/" + N.entwurfId).loeschAnfrage?.loeschungAb;
  check(aN().status === "gekuendigt" && aN().kuendigung.zum === laeuftBisVorher && aN().loeschAnfrage?.loeschungAb === loeschungAbVorher && Boolean(loeschungAbVorher) && mailsAn("mia@neu-app.test").some((m) => m.subject === "Apple hat dein Abo verlängert – bitte bei Apple kündigen" && /Kündige das Abo jetzt in den Einstellungen deines Apple-Accounts/.test(m.html)) && adminMails(/Apple hat verlängert, obwohl das Studio die Löschung beantragt hat/).length === 1, "DID_RENEW nach „Konto kündigen und löschen“ → Kündigungs- und Löschdatum bleiben fest, Mail „bitte bei Apple kündigen“ + Admin-Mail", aN().kuendigung?.zum);
  const zurueckN = await call("DELETE", "/api/portal/kuendigung", { cookie: auth.sessionCookie(aN()).split(";")[0] });
  check(zurueckN.status === 200 && aN().status !== "gekuendigt" && !aN().loeschAnfrage, "Kündigung zurücknehmen geht bei aktivem Apple-Abo (Dashboard)", zurueckN.text.slice(0, 120));
  // Nur Kündigung (ohne Löschung): Apple verlängert trotzdem → bezahlten Zeitraum weiter nutzen
  const kOhne = await call("POST", "/api/portal/kuendigung", { cookie: auth.sessionCookie(aN()).split(";")[0], body: { grund: "Test" } });
  const nochSpaeter = apple.verlaengerung(kaufN.tx, { expiresDate: Date.parse(aN().apple.laeuftBis) + 30 * 864e5 });
  await notif(apple.benachrichtigung({ typ: "DID_RENEW", tx: nochSpaeter }));
  check(kOhne.status === 200 && aN().status === "gekuendigt" && Date.parse(aN().kuendigung.zum) === nochSpaeter.expiresDate && mailsAn("mia@neu-app.test").some((m) => m.subject === "Apple hat dein Abo verlängert" && /Kündige es zusätzlich/.test(m.html)), "DID_RENEW nach Kündigung (ohne Löschung) → kuendigung.zum verlängert + Mail „Apple hat dein Abo verlängert“", aN().kuendigung?.zum);
  await call("DELETE", "/api/portal/kuendigung", { cookie: auth.sessionCookie(aN()).split(";")[0] });

  // ==================================================================================================
  teil("Apple-Abo: Schutz gegen alte oder fremde Daten (Prüfung 14.11.)");
  {
    rlReset();
    const vorher = () => ({ st: aN().status, a: aN().apple.status, bis: aN().apple.laeuftBis });
    const v0 = vorher();
    const mailsV0 = mailsAn("mia@neu-app.test").length, adminV0 = mailsAn("admin@app.test").length;
    // Alte, abgelaufene Verlängerung derselben Kette (wie aus Transaction.updates nach langer Pause)
    const alt = apple.verlaengerung(kaufN.tx, { expiresDate: Date.now() - 20 * 864e5, purchaseDate: Date.now() - 50 * 864e5, signedDate: Date.now() - 50 * 864e5 });
    const altAkt = await call("POST", "/api/app/abo/aktualisieren", { token: tN, body: { signedTransaction: apple.jws(alt) } });
    check(altAkt.status === 200 && JSON.stringify(vorher()) === JSON.stringify(v0) && v0.st !== "beendet" && mailsAn("mia@neu-app.test").length === mailsV0, "abo/aktualisieren mit alter abgelaufener Transaktion: Studio bleibt offen, laeuftBis bleibt, keine Mail", JSON.stringify(vorher()));
    const altW = await call("POST", "/api/app/abo/wiederherstellen", { body: { signedTransactions: [apple.jws(alt)] } });
    check(altW.status === 200 && altW.data.art === "anmelden" && JSON.stringify(vorher()) === JSON.stringify(v0), "wiederherstellen (ohne Anmeldung) mit alter Transaktion ändert am Studio nichts", altW.text);
    // Neuere Transaktion über den Abgleich: laeuftBis nur nach vorne
    const vor = apple.verlaengerung(kaufN.tx, { expiresDate: Date.parse(v0.bis) + 10 * 864e5 });
    await call("POST", "/api/app/abo/aktualisieren", { token: tN, body: { signedTransaction: apple.jws(vor) } });
    check(Date.parse(aN().apple.laeuftBis) === vor.expiresDate && aN().status === v0.st, "abo/aktualisieren mit neuerer Transaktion → laeuftBis nach vorne", aN().apple.laeuftBis);
    // Verspätete Benachrichtigung (signedDate älter als die zuletzt verarbeitete) wird nur protokolliert
    const bisV = aN().apple.laeuftBis;
    await notif(apple.benachrichtigung({ typ: "RENEWAL_EXTENDED", tx: { ...vor, expiresDate: vor.expiresDate + 864e5 } }));
    const spaet = await notif(apple.benachrichtigung({ typ: "EXPIRED", subtyp: "VOLUNTARY", tx: { ...vor, expiresDate: Date.now() - 1000 }, signiert: Date.now() - 3 * 3600e3 }));
    check(spaet.status === 200 && spaet.data.ergebnis === "veraltet" && aN().status === v0.st && aN().apple.status !== "abgelaufen" && Date.parse(aN().apple.laeuftBis) === vor.expiresDate + 864e5 && Date.parse(bisV) < Date.parse(aN().apple.laeuftBis), "Verspätetes EXPIRED (älteres signedDate) → nur protokolliert, Studio bleibt offen", spaet.text);
    // Erstattung einer FRÜHEREN Transaktion, während ein späterer Zeitraum läuft → nicht sperren, Admin-Mail
    const frueher = await notif(apple.benachrichtigung({ typ: "REFUND", tx: { ...alt, revocationDate: Date.now() } }));
    check(frueher.status === 200 && aN().status === v0.st && aN().apple.status !== "erstattet" && adminMails(/erstattet für einen früheren Abo-Zeitraum/).length >= 1, "REFUND für eine frühere Transaktion → Zugang bleibt offen, Admin-Mail", frueher.text);
    // Production-Studio: Testkauf (Sandbox) darf das echte Abo nicht ersetzen
    const sbErsatz = apple.kauf({ appAccountToken: N.appAccountToken, environment: "Sandbox" });
    const sbE = await call("POST", "/api/app/abo/bestaetigen", { token: tN, body: { signedTransaction: sbErsatz.jws } });
    check(sbE.status === 400 && sbE.data.code === "umgebung" && aN().apple.umgebung === "Production" && !aN().sandbox && !blob("idx/appleotx/" + sbErsatz.tx.originalTransactionId), "Production-Studio + Sandbox-Kauf über „Abo wieder abschließen“ → 400 umgebung, nichts geändert", sbE.text);
    // Benachrichtigungs-Endpunkt: zu groß → 413, ungültige Aufrufe höchstens 10 Log-Einträge je IP und Stunde
    const gross = await call("POST", "/api/apple/benachrichtigung", { body: { signedPayload: "a".repeat(70000) } });
    const logsVor = logs("apple-benachrichtigung-ungueltig").length;
    for (let i = 0; i < 14; i++) await call("POST", "/api/apple/benachrichtigung", { body: { signedPayload: "aaa.bbb.ccc" } });
    check(gross.status === 413 && logs("apple-benachrichtigung-ungueltig").length - logsVor <= 10, "Benachrichtigung: Body über 64 KB → 413; ungültige Signaturen höchstens 10 Log-Einträge je IP und Stunde", `${gross.status} ${logs("apple-benachrichtigung-ungueltig").length - logsVor}`);
    const grossApp = await call("POST", "/api/app/abo/wiederherstellen", { body: { signedTransactions: ["a".repeat(70000)] } });
    check(grossApp.status === 413 && grossApp.data.code === "zu_gross", "App-Endpunkt (abo/wiederherstellen): Body über 64 KB → 413 zu_gross", grossApp.text.slice(0, 80));
    // Stripe-Abo, das für ein App-Studio entsteht (Web-Checkout kurz vor dem Wechsel), wird sofort gekündigt bzw. dem Admin gemeldet
    const vorWh = JSON.stringify({ ...aN(), updatedAt: null });
    const whC = await sendeWebhook(`${BASE}/api/stripe-webhook`, "whsec_mock", "checkout.session.completed", { id: "cs_test_app", object: "checkout.session", mode: "subscription", subscription: "sub_gibtsnicht", metadata: { studioId: N.entwurfId } });
    await wait(200);
    check(JSON.stringify({ ...aN(), updatedAt: null }) === vorWh && adminMails(/Stripe-Abo für App-Studio/).length >= 1 && logs("stripe-abo-app-studio").length >= 1, "checkout.session.completed (Abo) für App-Studio → Stripe-Abo kündigen + Admin-Mail, Studio unverändert", String(whC?.status ?? whC));
    void adminV0;
  }

  // ==================================================================================================
  teil("Apple-Abo: Review-Zugang für die Registrierung (App-Prüfung: Konto, Sandbox-Kauf, Löschen)");
  {
    rlReset();
    const RV = "review-neu@tattoofin.test";
    Object.assign(process.env, { APP_REVIEW_REG_EMAIL: RV, APP_REVIEW_CODE: "246810" });
    const rvC = await call("POST", "/api/app/registrieren/code", { body: { email: RV, platform: "ios" } });
    const rvF = await pruefen(RV, "135791");
    const rv1 = await pruefen(RV, "246810");
    check(rvC.status === 200 && mailsAn(RV).length === 0 && rvF.data.code === "code_falsch" && rv1.status === 200 && rv1.data.art === "registrieren" && rv1.data.entwurf === null, "Review-Registrierung: keine Mail, fester Code → art „registrieren“, falscher Code zählt", rv1.text.slice(0, 120));
    const e1 = await call("POST", "/api/app/registrieren", { body: REG(rv1.data.registrierToken, { firma: "Apple Prüfstudio" }) });
    const k1 = apple.kauf({ appAccountToken: e1.data.appAccountToken, environment: "Sandbox" });
    const b1 = await bestaetigen(e1.data.entwurfToken, k1.jws);
    const p1 = await call("GET", "/api/portal", { token: b1.data.token });
    check(e1.status === 200 && blob("studio/" + e1.data.entwurfId).reviewRegistrierung === true && b1.status === 200 && p1.data.studio?.testmodus === true && p1.data.studio?.kannKassieren === true, "Review-Registrierung: Entwurf → Sandbox-Kauf → Kasse offen im Testmodus", b1.text.slice(0, 120));
    rlReset();
    const rv2 = await pruefen(RV, "246810");
    const alt = blob("studio/" + e1.data.entwurfId);
    const e2 = await call("POST", "/api/app/registrieren", { body: REG(rv2.data.registrierToken, { firma: "Apple Prüfstudio 2" }) });
    check(rv2.data.art === "registrieren" && /^review-alt-/.test(alt.email) && alt.status === "einrichtung" && e2.status === 200 && e2.data.entwurfId !== e1.data.entwurfId && blob("idx/email/" + RV) === e2.data.entwurfId, "Zweiter Durchgang: frischer Entwurf, früheres Prüf-Studio abgehängt (bleibt für den Admin)", e2.text.slice(0, 120));
    process.env.APP_REVIEW_EMAIL = RV;
    check(!(await import("../netlify/functions/_lib/app-code.mjs")).reviewRegFuer(RV), "APP_REVIEW_REG_EMAIL gleich APP_REVIEW_EMAIL → Registrier-Review aus");
    for (const k of ["APP_REVIEW_REG_EMAIL", "APP_REVIEW_CODE", "APP_REVIEW_EMAIL"]) delete process.env[k];
  }

  // ==================================================================================================
  teil("Apple-Abo: Käufe wiederherstellen und Abgleich");
  rlReset();
  const wN = await call("POST", "/api/app/abo/wiederherstellen", { body: { signedTransactions: [apple.jws(spaeter)] } });
  check(wN.status === 200 && wN.data.art === "anmelden" && wN.data.emailMaskiert === "m•••••@neu-app.test" && !wN.data.token, "Aktives Studio → art „anmelden“ mit maskierter Adresse, kein Token", wN.text);
  const wUnb = await call("POST", "/api/app/abo/wiederherstellen", { body: { signedTransactions: [apple.kauf().jws, apple.jws(apple.transaktion(), { kette: "fremd" })] } });
  check(wUnb.status === 404 && wUnb.data.code === "kein_konto" && wUnb.data.error === "Zu diesem Abo haben wir kein Studio gefunden. Schreib uns: info@tattoofin.de", "Unbekanntes Abo → 404 kein_konto", wUnb.text);
  const Q = await entwurf("quirin@neu-app.test", "Wiederher Studio");
  const wQ = await call("POST", "/api/app/abo/wiederherstellen", { body: { signedTransactions: [apple.kauf({ appAccountToken: Q.appAccountToken }).jws] } });
  check(wQ.status === 200 && wQ.data.art === "anmelden" && wQ.data.emailMaskiert === "q•••••@neu-app.test" && blob("studio/" + Q.entwurfId).status === "einrichtung" && mailsAn("quirin@neu-app.test").some((m) => /^Willkommen/.test(m.subject)), "Nur Entwurf (nie bestätigt) → aktiviert + „anmelden“", wQ.text);
  check((await call("POST", "/api/app/abo/wiederherstellen", { body: { signedTransactions: [] } })).data.code === "eingabe", "Leere Liste → 400 eingabe");
  const aEigen = await call("POST", "/api/app/abo/aktualisieren", { token: tN, body: { signedTransaction: apple.jws(spaeter) } });
  check(aEigen.status === 200 && aEigen.data.abo?.status && aEigen.data.abo.appAccountToken === N.appAccountToken, "aktualisieren mit eigenem Abo → { abo }", aEigen.text.slice(0, 160));
  const aFremd = await call("POST", "/api/app/abo/aktualisieren", { token: tN, body: { signedTransaction: kaufP.jws } });
  check(aFremd.status === 409 && aFremd.data.code === "abo_vergeben", "aktualisieren mit fremder Abo-Kette → 409 abo_vergeben", aFremd.text);
  const aStripe = await call("POST", "/api/app/abo/aktualisieren", { token: tD, body: { signedTransaction: kaufN.jws } });
  const bStripe = await call("POST", "/api/app/abo/bestaetigen", { token: tD, body: { signedTransaction: kaufN.jws } });
  check(aStripe.status === 403 && aStripe.data.code === "nicht_apple" && bStripe.status === 403 && bStripe.data.code === "nicht_apple" && aStripe.data.error === "Dein Studio zahlt nicht über Apple.", "Stripe-Studio → 403 nicht_apple (aktualisieren und erneuern)", aStripe.text);
  check((await call("POST", "/api/app/abo/aktualisieren", { body: { signedTransaction: kaufN.jws } })).data.code === "nicht_angemeldet", "aktualisieren ohne Token → 401 nicht_angemeldet");
  check((await call("GET", "/api/app/abo/bestaetigen")).status === 405 && (await call("GET", "/api/app/registrieren")).status === 405, "GET auf abo/registrieren → 405");

  // ==================================================================================================
  teil("Apple-Abo: Web-Anmeldung ohne Paket „app“, App-Entwurf im Web übernehmen");
  const sApp = await call("POST", "/api/signup", { body: { ...DATEN("web@neu-app.test", "Web Studio"), paket: "app" } });
  check(sApp.status === 400 && /Bitte ausfüllen: Paket/.test(sApp.data.error), "/api/signup mit paket „app“ → 400 „Paket“", sApp.text);
  const pakete = await call("GET", "/api/signup?pakete=1");
  const cfg = await call("GET", "/api/config");
  check(!pakete.data.pakete.some((x) => x.id === "app") && !cfg.data.pakete.some((x) => x.id === "app") && cfg.data.vertragVersion === "2026-12b", "GET /api/signup?pakete=1 und /api/config ohne „app“, Vertrag 2026-12b", JSON.stringify(pakete.data.pakete.map((x) => x.id)));
  const W = await entwurf("wanda@neu-app.test", "Wechsel Studio");
  const sWeb = await call("POST", "/api/signup", { body: { ...DATEN("wanda@neu-app.test", "Fremd Studio"), paket: "monatlich" } });
  const sW = blob("studio/" + W.entwurfId);
  check(sWeb.status === 409 && /Anmeldung in der Tattoofin-App/.test(sWeb.data.error) && sW.paket === "app" && sW.abrechnung === "apple" && sW.firma === "Wechsel Studio" && sW.appEntwurf?.appAccountToken === W.appAccountToken && blob("idx/appentwurf/" + W.appAccountToken) === W.entwurfId, "Offener App-Entwurf: Web-Anmeldung (Adresse nicht bestätigt) darf ihn NICHT übernehmen → 409, Entwurf unverändert", sWeb.text);
  const bW = await bestaetigen(W.entwurfToken, apple.kauf({ appAccountToken: W.appAccountToken }).jws);
  check(bW.status === 200 && /^tfa_/.test(bW.data.token || "") && blob("studio/" + W.entwurfId).firma === "Wechsel Studio", "Apple-Kauf danach klappt mit den eigenen Angaben", bW.text.slice(0, 120));
  const W2 = await entwurf("wolf@neu-app.test", "Wolf Alt");
  const w2 = blob("studio/" + W2.entwurfId);
  setBlob("studio/" + W2.entwurfId, { ...w2, appEntwurf: { ...w2.appEntwurf, ablauf: new Date(Date.now() - 864e5).toISOString() } });
  const sWeb2 = await call("POST", "/api/signup", { body: { ...DATEN("wolf@neu-app.test", "Wolf Web"), paket: "monatlich" } });
  const sW2 = blob("studio/" + W2.entwurfId);
  check(sWeb2.status === 200 && sW2.paket === "monatlich" && !sW2.abrechnung && !sW2.appEntwurf && !blob("idx/appentwurf/" + W2.appAccountToken), "Abgelaufener App-Entwurf (über 30 Tage) wird vom Web übernommen (Apple-Felder und Index weg)", sWeb2.text.slice(0, 120));
  const bW2 = await bestaetigen(W2.entwurfToken, apple.kauf({ appAccountToken: W2.appAccountToken }).jws);
  check(bW2.status === 410 && bW2.data.code === "entwurf_abgelaufen" && adminMails(/Apple-Kauf ohne Studio/).length >= 1, "Apple-Kauf danach → 410 entwurf_abgelaufen + Admin-Mail", bW2.text);
  // Web-Entwurf mit offener Checkout-Sitzung → App übernimmt, Sitzung wird beendet
  const V = await call("POST", "/api/signup", { body: { ...DATEN("vera@neu-app.test", "Vera Web"), paket: "monatlich" } });
  const vId = (await admin("studios")).find((x) => x.email === "vera@neu-app.test").id;
  const csV = blob("studio/" + vId).stripe.checkoutSessionId;
  const V2 = await entwurf("vera@neu-app.test", "Vera App");
  const stV = await mock("state");
  check(V.status === 200 && V2.entwurfId === vId && !blob("studio/" + vId).stripe.checkoutSessionId && stV.sessions?.[csV]?.status === "expired" && blob("studio/" + vId).abrechnung === "apple", "Web-Entwurf mit offener Checkout-Sitzung: App übernimmt den Entwurf, Sitzung wird beendet", csV);
  // Web-Checkout schon bezahlt (Webhook noch nicht da): App darf den Entwurf nicht überschreiben → 409 schon_aktiv
  const Xw = await call("POST", "/api/signup", { body: { ...DATEN("yvo@neu-app.test", "Yvo Web"), paket: "monatlich" } });
  const xId = (await admin("studios")).find((x) => x.email === "yvo@neu-app.test").id;
  const csX = blob("studio/" + xId).stripe.checkoutSessionId;
  await mock("sitzung-bezahlt/" + csX, {});
  const Xa = await call("POST", "/api/app/registrieren", { body: REG(await registrierToken("yvo@neu-app.test"), { firma: "Yvo App" }) });
  check(Xw.status === 200 && Xa.status === 409 && Xa.data.code === "schon_aktiv" && !blob("studio/" + xId).abrechnung && blob("studio/" + xId).stripe.checkoutSessionId === csX, "Web-Checkout schon bezahlt: App-Registrierung → 409 schon_aktiv, Web-Entwurf bleibt", Xa.text);

  // ==================================================================================================
  teil("Apple-Abo: tägliche Jobs (Entwürfe, fehlende Verlängerung)");
  const R = await entwurf("rosa@neu-app.test", "Rosa Entwurf");
  setBlob("studio/" + R.entwurfId, { ...blob("studio/" + R.entwurfId), createdAt: new Date(Date.now() - 21 * 3600e3).toISOString() });
  const R2 = await entwurf("rudi@neu-app.test", "Rudi Alt");
  const r2 = blob("studio/" + R2.entwurfId);
  setBlob("studio/" + R2.entwurfId, { ...r2, createdAt: new Date(Date.now() - 31 * 864e5).toISOString(), appEntwurf: { ...r2.appEntwurf, ablauf: new Date(Date.now() - 864e5).toISOString() } });
  const pAlt = blob("studio/" + P.entwurfId);
  setBlob("studio/" + P.entwurfId, { ...pAlt, apple: { ...pAlt.apple, status: "aktiv", laeuftBis: new Date(Date.now() - 4 * 864e5).toISOString() } });
  setBlob("apple/notif/alt-1234567", { am: new Date(Date.now() - 91 * 864e5).toISOString(), typ: "DID_RENEW" });
  const jobs1 = await admin("jobs", {});
  const jobs2 = await admin("jobs", {});
  check(!mailsAn("rosa@neu-app.test").some((m) => m.subject === "Fast geschafft: dein Abschluss ist noch offen") && blob("studio/" + R.entwurfId)?.status === "entwurf", "App-Entwurf 21 h alt → KEINE Abbruch-Mail (Apple 3.1.3)");
  check(!blob("studio/" + R2.entwurfId) && !blob("idx/appentwurf/" + R2.appAccountToken) && blob("idx/email/rudi@neu-app.test") === null && JSON.stringify(jobs1).includes("app-entwurf-geloescht"), "App-Entwurf älter als 30 Tage → gelöscht (Studio, idx/appentwurf, idx/email)", JSON.stringify(jobs1).slice(0, 200));
  check(adminMails(/Apple hat keine Verlängerung gemeldet/).filter((m) => m.subject.includes("Notif Studio")).length === 1 && blob("studio/" + P.entwurfId).status === "einrichtung" && JSON.stringify(jobs2).indexOf("apple-verlaengerung-fehlt") === -1, "Apple-Studio 4 Tage über laeuftBis → eine Admin-Mail, keine Sperre, kein zweites Mal", JSON.stringify(jobs1).slice(0, 120));
  check(!blob("apple/notif/alt-1234567") && blob("apple/notif/" + doppel.uuid), "Doppelschutz apple/notif/* nach 90 Tagen gelöscht, neuere bleiben");

  // ==================================================================================================
  teil("Apple-Abo: Lokal-Wächter, Rechtstexte");
  const cfgMod = await import("../netlify/functions/_lib/config.mjs");
  const appleMod = await import("../netlify/functions/_lib/apple.mjs");
  process.env.APPLE_XCODE_TEST = "1";
  const live = { siteUrl: "https://tattoofin.de", vorschau: false, netlify: "true" };
  const schalterLive = cfgMod.appleTestSchalter(live);
  let liveAbgelehnt = false;
  try { appleMod.jwsPruefen(apple.kauf().jws, { schalter: schalterLive }); } catch (e) { liveAbgelehnt = e.fehlerCode === "jws_ungueltig"; }
  check(cfgMod.nurLokal(live) === false && cfgMod.nurLokal({ siteUrl: "https://tattoofin.de" }) === false && cfgMod.nurLokal({ siteUrl: "http://localhost:8888", netlify: "true" }) === false && cfgMod.nurLokal({ siteUrl: "http://localhost:8888", vorschau: true }) === false && cfgMod.nurLokal({ siteUrl: "http://localhost:8888", netlify: "" }) === true, "nurLokal(): nur http://localhost ohne Netlify und ohne Vorschau");
  check(schalterLive.xcode === false && schalterLive.testRootPem === null && liveAbgelehnt, "Mit SITE_URL=https://… wirken APPLE_XCODE_TEST und APPLE_TEST_ROOT_PEM nicht (Test-Kette wird abgelehnt)", JSON.stringify(schalterLive));
  delete process.env.APPLE_XCODE_TEST;
  check(appleMod.APPLE_ROOT_G3_FP === "63:34:3A:BF:B8:9A:6A:03:EB:B5:7E:9B:3F:5F:A7:BE:7C:4F:5C:75:6F:30:17:B3:A8:C4:88:C3:65:3E:91:79" && new crypto.X509Certificate(appleMod.APPLE_ROOT_G3_PEM).subject.includes("Apple Root CA - G3"), "Apple Root CA - G3 fest eingebaut, Fingerabdruck stimmt");
  const vertragHtml = await (await fetch(`${BASE}/vertrag.html?app=1`)).text();
  const appText = ohneNurWeb(vertragHtml);
  check((vertragHtml.match(/data-nur-web/g) || []).length >= 5 && /data-cfg="monatPreis"/.test(vertragHtml) && !/data-cfg="monatPreis"/.test(appText) && !/per Stripe eingezogen/.test(appText) && !/graviertem QR-Code/.test(appText) && !/die Zahlung läuft über Stripe/.test(appText), "vertrag.html in der App-Fassung: ohne Web-Preis, ohne „per Stripe eingezogen“, ohne Aufsteller-Zeile (data-nur-web)");
  check(/Preis wie beim Kauf im App Store angezeigt \(inkl\. USt\.\), Abrechnung über Apple/.test(appText) && /§ 13 Abschluss über die Tattoofin-App \(Apple\)/.test(vertragHtml) && /24 Stunden vor Ablauf/.test(vertragHtml) && /\[\?&\]app=1/.test(vertragHtml) && /Fassung 2026-12b/.test(vertragHtml), "vertrag.html: § 13 (Apple-Abo, 24 Stunden, Erstattung über Apple), App-Text data-nur-app, Fassung 2026-12b");
  const p6 = (vertragHtml.split("<h2>§ 6")[1] || "").split("<h2>")[0];
  check((p6.match(/Achtung! Kreditaufnahme kostet Geld\./g) || []).length === 2 && /Verkäufer des In-App-Abos ist Apple \(Apple Distribution International Ltd\./.test(vertragHtml) && /keine eigene Rechnung/.test(vertragHtml), "vertrag.html: § 6 mit „Achtung! Kreditaufnahme kostet Geld.“ bei Raten/Kredit, § 13 nennt Apple als Verkäufer, keine eigene Rechnung");
  const archiv = await fetch(`${BASE}/vertrag-2026-12.html`);
  const archivText = await archiv.text();
  check(archiv.status === 200 && /noindex/.test(archivText) && /Archivfassung 2026-12/.test(archivText) && !/§ 13/.test(archivText), "Archiv vertrag-2026-12.html (noindex, ohne § 13)");
  const avvHtml = await (await fetch(`${BASE}/avv.html?app=1`)).text();
  check(/Apple Distribution International Ltd\.[^<]*<\/td><td>Zustellung von Push-Mitteilungen/.test(avvHtml) && /Stand 14\.11\.2026/.test(avvHtml), "avv.html Anlage 3: Apple (Push-Mitteilungen an die App) als Unterauftragsverarbeiter, Stand 14.11.2026");
  const dsHtml = await (await fetch(`${BASE}/datenschutz.html`)).text();
  check(/\[\?&\]app=1/.test(avvHtml) && /<b>Abo über Apple:<\/b> Den Kauf wickelt Apple/.test(dsHtml) && /Apple-ID oder deren E-Mail-Adresse bekommen wir nicht/.test(dsHtml) && /Studio-Konto in der App anlegen/.test(dsHtml), "AVV mit App-Ansicht, Datenschutzerklärung #app: Abo über Apple, Konto in der App anlegen");

  } // Ende Apple-Abo

  await apns.schliessen();
} catch (e) {
  fehler++;
  console.error("ABBRUCH:", e);
}
console.log(`\n${ok} bestanden, ${fehler} fehlgeschlagen · Daten: ${dataDir}`);
apple.aufraeumen();
if (!fehler) fs.rmSync(dataDir, { recursive: true, force: true });
process.exit(fehler ? 1 : 0);
