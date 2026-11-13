// Test der App-API (Tattoofin-App für Studios) mit Stripe-Nachbau und APNs-Nachbau (HTTP/2 ohne TLS), ohne Browser.
//   NODE_PATH=… node dev/app-api.mjs        → Protokoll, Exit-Code 1 bei Fehlern
// Prüft Anmeldung per Code (inkl. Missbrauch: falscher Code, Ablauf, Grenzen, fremdes Studio, widerrufenes Token), Geräte, Push,
// Auszahlungen, Team, Review-/Demo-Zugang, Konto löschen und die Erweiterungen von /api/portal.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { startDev } from "./server.mjs";
import { startApnsNachbau, testSchluessel } from "./apns-nachbau.mjs";
import { sendeWebhook } from "../netlify/functions/_lib/stripe-sim.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.APP_TEST_PORT || 8894), BASE = `http://localhost:${PORT}`, STRIPE = "http://localhost:12111";
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "tf-app-api-"));
for (const k of ["RESEND_API_KEY", "SMTP_HOST", "APNS_KEY_P8", "APNS_KEY_P8_BASE64", "APNS_KEY_ID", "APNS_TEAM_ID", "APP_REVIEW_EMAIL", "APP_REVIEW_CODE", "APP_REVIEW_STUDIO_ID", "APP_LOKAL_CODE", "TF_JETZT"]) delete process.env[k];
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
  check(okTest.data.gesendet === true && apns.empfangen.at(-1).payload.aps.alert.body === "Test: Mitteilungen funktionieren", "Push-Test mit Schlüssel → {gesendet:true}, „Test: Mitteilungen funktionieren“", okTest.text);
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
  check((await call("PUT", "/api/app/team", { token: tB, body: { emails: ["a@b.de", "c@d.de", "e@f.de", "g@h.de", "i@j.de", "k@l.de"] } })).data.error === "Höchstens 5 Team-Adressen" && (await call("PUT", "/api/app/team", { token: tB, body: { emails: ["kaputt"] } })).data.error === "Keine gültige E-Mail: kaputt", "Gleiche Prüfung wie im Admin (höchstens 5, gültige Adressen)");
  check(mailsAn("admin@app.test").some((m) => /Team-Adressen in der App geändert/.test(m.subject)) && logs("app-team").length >= 1, "notifyAdmin + log app-team");
  const anna = await appLogin("anna@ink-b.test");
  const tAnna = anna.token;
  check(anna.geraet?.rolle === "team" && codeMail("anna@ink-b.test"), "Neue Team-Adresse bekommt den Code an sich selbst und meldet sich als team an");
  const raus = await call("DELETE", "/api/app/team/ich", { token: tAnna });
  check(raus.status === 200 && raus.data.ok === true && !blob("studio/" + B.id).teamEmails.includes("anna@ink-b.test") && (await call("GET", "/api/portal", { token: tAnna })).status === 401, "DELETE /api/app/team/ich: Adresse raus, eigene Geräte widerrufen");
  await call("PUT", "/api/app/team", { token: tB, body: { emails: ["anna@ink-b.test"] } });
  const tAnna2 = (await appLogin("anna@ink-b.test")).token;
  const svVor = blob("studio/" + B.id).sessionVersion || 0;
  const alle = await call("PUT", "/api/app/team", { token: tB, body: { emails: ["anna@ink-b.test"], alleAbmelden: true } });
  check(alle.status === 200 && (blob("studio/" + B.id).sessionVersion || 0) === svVor + 1 && (await call("GET", "/api/portal", { token: tAnna2 })).status === 401 && (await call("GET", "/api/portal", { cookie: B.cookie })).status === 401 && (await call("GET", "/api/portal", { token: tB })).status === 200, "alleAbmelden: Sitzungsversion +1 → andere App-Geräte und Web-Cookies raus, dieses Gerät bleibt angemeldet");

  // ==================================================================================================
  teil("Abmelden: App-Gerät, „Auf allen Geräten abmelden“, Gerät eines anderen abmelden");
  const tA2 = await loginA(A.id, "iPad");
  const gA2 = (await call("GET", "/api/app/geraete", { token: tA2 })).data.geraete.find((x) => x.diesesGeraet);
  check((await call("DELETE", `/api/app/geraete/${gA2.id}`, { token: tA })).data.ok === true && (await call("GET", "/api/portal", { token: tA2 })).status === 401, "Inhaber meldet ein anderes Gerät ab → dessen Token 401");
  const ab = await call("POST", "/api/app/abmelden", { token: tC2 });
  check(ab.data.ok === true && (await call("GET", "/api/app/geraete", { token: tC2 })).status === 401 && blob(`appgeraet/${C.id}/${tC2.slice(4, 19)}`)?.tokenHash === undefined, "POST /api/app/abmelden → Token ungültig, Hash gelöscht");
  const tA3 = await loginA(A.id, "iPhone 2");
  check((await call("GET", "/api/portal", { token: tA3 })).status === 200, "Vorher: App-Token von A gültig");
  await call("POST", "/api/portal/abmelden", { cookie: A.cookie });
  check((await call("GET", "/api/portal", { token: tA3 })).status === 401 && (await call("GET", "/api/portal", { token: tA })).status === 401, "POST /api/portal/abmelden (Dashboard) widerruft auch alle App-Tokens (sv-Vergleich)");

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
  const dz = await call("POST", "/api/portal/zahlung", { token: tR, body: { betrag: "300", kunde: "Test", beschreibung: "Demo" } });
  const dpay = await call("POST", "/api/pay", { body: { z: dz.data.zahlung?.id, inhaltOk: true } });
  const dpay2 = await call("POST", "/api/pay", { body: { s: blob("studio/" + demo.studioId).slug, betrag: "100", kunde: "X", inhaltOk: true } });
  check(dz.status === 201 && dpay.status === 409 && dpay.data.error === "Demo-Studio: hier wird nichts bezahlt" && dpay2.status === 409, "Demo-Studio: Link anlegen geht, Bezahlen (Link und Zahlseite) → 409", `${dz.status} ${dpay.text} ${dpay2.status}`);
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
  const zur = await call("DELETE", "/api/portal/kuendigung", { token: tBneu });
  check(sBc.data.studio?.loeschAnfrage && zur.status === 200 && zur.data.status !== "gekuendigt" && zur.data.loeschAnfrage === null && !blob("studio/" + B.id).loeschAnfrage && blob("studio/" + B.id).loeschAnfrageHistorie?.length === 1, "DELETE /api/portal/kuendigung nimmt Kündigung UND Löschanfrage zurück", zur.text.slice(0, 160));
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

  await apns.schliessen();
} catch (e) {
  fehler++;
  console.error("ABBRUCH:", e);
}
console.log(`\n${ok} bestanden, ${fehler} fehlgeschlagen · Daten: ${dataDir}`);
if (!fehler) fs.rmSync(dataDir, { recursive: true, force: true });
process.exit(fehler ? 1 : 0);
