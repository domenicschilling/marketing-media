// Gemeinsame Bausteine der App-Anmeldung per 6-stelligem Code (app.mjs: /api/app/code + /api/app/anmelden,
// app-registrierung.mjs: /api/app/registrieren/code + /api/app/registrieren/pruefen). Verhalten wie seit 13.11.2026:
// Code 10 Min. (APP_CODE_MINUTEN), höchstens 5 Versuche je Code (atomare Plätze rl/appversuch/…), 15 Versuche je Adresse und Tag,
// Code-Mails 3 pro Adresse in 15 Min., 10 pro Adresse und Tag, 20 pro IP und Stunde (rl/appcode-ip|mail|tag, gemeinsam für beide Wege).
import crypto from "node:crypto";
import { CFG, SECRETS } from "./config.mjs";
import { json, clean, clientIp, now } from "./util.mjs";
import { store, getStudio, normEmail, zaehleAtomar, belegePlatz, log, studiosPerEmail, AKTIV } from "./store.mjs";
import { sign } from "./auth.mjs";
import { notify, notifyAdmin } from "./domain.mjs";
import { mails } from "./emails.mjs";
import { geraetAnlegen, rolleFuer } from "./app-geraete.mjs";

export const aj = (daten, status = 200) => json(daten, status, { "cache-control": "no-store" });
export const fehler = (error, status, code, extra = {}) => aj({ error, ...(code ? { code } : {}), ...extra }, status);
export const hash = (x) => crypto.createHmac("sha256", SECRETS.sessionSecret).update(String(x)).digest("hex").slice(0, 32);
export const codeHash = (email, code) => crypto.createHmac("sha256", SECRETS.sessionSecret).update(`${email}:${code}`).digest("hex");
export const gleich = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
export const minuten = () => Math.min(60, Math.max(1, Math.round(Number(process.env.APP_CODE_MINUTEN) || 10)));
export const MAX_VERSUCHE = 5;                 // je Code
export const MAX_MAILS_TAG = 10, MAX_VERSUCHE_TAG = 15;   // je Adresse und Tag (über alle Codes)
export const TAG_MS = 864e5;
export const T = {
  login: "Bitte einloggen", eingabe: "Bitte E-Mail und den 6-stelligen Code eingeben.", falsch: "Der Code stimmt nicht.",
  abgelaufen: "Der Code ist abgelaufen. Fordere einfach einen neuen an.", gesperrt: "Zu viele falsche Versuche. Bitte fordere einen neuen Code an.",
  zuViele: "Zu viele Versuche. Bitte warte kurz.", auswahl: "Ungültige Auswahl.", platform: "Unbekannte Plattform.",
  zuVieleHeute: "Zu viele Anmelde-Versuche mit dieser Adresse. Aus Sicherheitsgründen geht es erst morgen wieder. Fragen? info@tattoofin.de",
  nurInhaber: "Nur der Inhaber kann das ändern.",
};
// „s•••••@studio.de“ (für Admin-Mails und „Dieses Abo gehört zu …“)
export const maskiereEmail = (e) => String(e || "").replace(/^(.)[^@]*(@.*)$/, "$1•••••$2");

// Review-Zugang (App-Prüfung bei Apple): nur mit allen drei Variablen und Demo-Studio
function reviewKonfig() {
  const e = normEmail(process.env.APP_REVIEW_EMAIL || ""), c = String(process.env.APP_REVIEW_CODE || ""), sid = String(process.env.APP_REVIEW_STUDIO_ID || "");
  return e && /^\d{6}$/.test(c) && sid ? { email: e, code: c, studioId: sid } : null;
}
export async function reviewFuer(email) {
  const k = reviewKonfig();
  if (!k || k.email !== email) return null;
  const s = await getStudio(k.studioId);
  return s?.demo ? { ...k, s } : null;
}
// Zweiter Review-Zugang nur für die Registrierung (App-Prüfung: Konto anlegen, Sandbox-Kauf, Löschen): APP_REVIEW_REG_EMAIL + APP_REVIEW_CODE.
// Muss sich von APP_REVIEW_EMAIL unterscheiden. Ohne beide Variablen aus.
export function reviewRegFuer(email) {
  const e = normEmail(process.env.APP_REVIEW_REG_EMAIL || ""), c = String(process.env.APP_REVIEW_CODE || "");
  if (!e || !/^\d{6}$/.test(c) || e === normEmail(process.env.APP_REVIEW_EMAIL || "") || e !== email) return null;
  return { email: e, code: c };
}
// Fester Code nur für den lokalen Nachbau (dev/app-lokal.mjs), nie auf Netlify
export const lokalerCode = () => {
  const c = String(process.env.APP_LOKAL_CODE || "");
  return /^\d{6}$/.test(c) && /^http:\/\/localhost:\d+$/.test(CFG.siteUrl) && !CFG.vorschau && !process.env.NETLIFY ? c : null;
};

// Grenzen für Code-Mails (gemeinsam für Anmelde- und Registrier-Code). Lokal (fester Code) ohne Grenzen, damit man im Simulator
// beliebig oft testen kann. Reihenfolge wie bisher: erst IP (jede Anfrage), dann je Adresse (nicht für den Review-Zugang).
export const codeIpErlaubt = async (req, context) => Boolean(lokalerCode()) || zaehleAtomar(`rl/appcode-ip/${hash(clientIp(req, context) || "?")}`, 20, 3600e3);
export async function codeAdresseErlaubt(email) {
  if (lokalerCode()) return true;
  if (!(await zaehleAtomar(`rl/appcode-mail/${hash(email)}`, 3, 15 * 60e3))) return false;
  // Obergrenze pro Tag (gegen Raten über viele neue Codes und gegen Mail-Flut an den Inhaber)
  return zaehleAtomar(`rl/appcode-tag/${hash(email)}`, MAX_MAILS_TAG, TAG_MS);
}

// Aktive Studios einer Adresse (Haupt- oder Team-Adresse, ohne Demo), höchstens 3
export const aktiveStudios = async (email) => (await studiosPerEmail(email)).filter((s) => AKTIV(s) && !s.demo).slice(0, 3);

// Anmelde-Code an eine Adresse mit aktivem Studio schicken (Schlüssel appcode/<hash>, Mail appCode)
export async function anmeldeCodeSenden(email, studios) {
  const code = lokalerCode() || String(crypto.randomInt(0, 1e6)).padStart(6, "0");
  const min = minuten();
  // Ein neuer Code ersetzt den alten (und setzt die Fehlversuche zurück)
  // id: Kennung dieses Codes für die Versuchs-Plätze (rl/appversuch/…/<exp>-<id>/<n>)
  await store.set(`appcode/${hash(email)}`, { codeHash: codeHash(email, code), exp: Date.now() + min * 60e3, versuche: 0, id: crypto.randomBytes(6).toString("hex"), studioIds: studios.map((s) => s.id), am: now() });
  // Eine Mail genügt (der Code gilt für alle Studios dieser Adresse). Team-Adresse bekommt sie an sich selbst (wie login.mjs).
  const s = studios[0];
  const an = normEmail(s.email) === email ? undefined : (s.teamEmails || []).find((t) => normEmail(t) === email);
  await notify(s, mails.appCode(s, { code, minuten: min }), an);
  await log("app-code", { studioId: s.id, studios: studios.length });
}

// Tagesgrenze je Adresse (über alle Codes, atomar). Lokal (fester Code im Simulator) ohne Tagesgrenze.
export async function tagesPlatz(email) {
  if (lokalerCode() || (await zaehleAtomar(`rl/appversuch-tag/${hash(email)}`, MAX_VERSUCHE_TAG, TAG_MS))) return true;
  // Einmal pro Adresse und Tag dem Admin Bescheid geben (atomar, damit es nicht mehrfach kommt)
  if (await store.setNeu(`rl/appsperre-hinweis/${hash(email)}/${(Math.floor(Date.now() / TAG_MS) + 1) * TAG_MS}/1`, { am: now() })) {
    await log("app-anmeldung-tagesgrenze", { adresse: hash(email) });
    await notifyAdmin("App-Anmeldung: sehr viele Code-Versuche für eine Adresse (für heute gesperrt)", null, { Adresse: maskiereEmail(email), Grenze: `${MAX_VERSUCHE_TAG} Versuche pro Tag` });
  }
  return false;
}

// Fester Review-Code (App-Prüfung): 5 Versuche je 15 Minuten (atomar), dazu die Tagesgrenze.
// Ergebnis: { s } bei Erfolg oder { antwort } (Fehler-Response)
export async function reviewPruefen(review, email, code) {
  if (!(await tagesPlatz(email))) return { antwort: fehler(T.zuVieleHeute, 429, "zu_viele_heute") };
  const fenster = (Math.floor(Date.now() / (15 * 60e3)) + 1) * 15 * 60e3;
  const n = await belegePlatz(`rl/appreview/${hash(email)}`, MAX_VERSUCHE, fenster);
  if (!n) return { antwort: fehler(T.gesperrt, 410, "code_gesperrt") };
  if (!gleich(code, review.code)) {
    if (n >= MAX_VERSUCHE) return { antwort: fehler(T.gesperrt, 410, "code_gesperrt") };
    return { antwort: fehler(T.falsch, 400, "code_falsch", { restVersuche: MAX_VERSUCHE - n }) };
  }
  return { s: review.s };
}

// Gespeicherten Code unter key prüfen und bei Erfolg genau einmal verbrauchen. Gemeinsam für appcode/… und appreg/….
// Ergebnis: { rec } bei Erfolg oder { antwort } (Fehler-Response wie /api/app/anmelden)
export async function codePruefen(key, email, code, { einmalPraefix = "appcode" } = {}) {
  const rec = await store.get(key);
  if (!rec || !(Number(rec.exp) > Date.now())) { if (rec) await store.del(key); return { antwort: fehler(T.abgelaufen, 410, "code_abgelaufen") }; }
  if (!(await tagesPlatz(email))) return { antwort: fehler(T.zuVieleHeute, 429, "zu_viele_heute") };
  // Jeder Versuch belegt atomar einen von 5 Plätzen dieses Codes, ERST DANN wird verglichen.
  // Auch hunderte gleichzeitige Anfragen bekommen so zusammen höchstens 5 Vergleiche.
  const n = await belegePlatz(`rl/appversuch/${hash(email)}`, MAX_VERSUCHE, `${Number(rec.exp)}-${rec.id || Date.parse(rec.am) || 0}`);
  if (!n) { await store.del(key); return { antwort: fehler(T.gesperrt, 410, "code_gesperrt") }; }
  if (!gleich(rec.codeHash, codeHash(email, code))) {
    if (n >= MAX_VERSUCHE) { await store.del(key); await log("app-code-gesperrt", { studios: rec.studioIds?.length || 0, art: einmalPraefix }); return { antwort: fehler(T.gesperrt, 410, "code_gesperrt") }; }
    return { antwort: fehler(T.falsch, 400, "code_falsch", { restVersuche: MAX_VERSUCHE - n }) };
  }
  // Richtiger Code: genau einmal verwendbar (atomar), dann löschen
  if (!(await store.setNeu(`einmal/${einmalPraefix}-${rec.codeHash.slice(0, 32)}-${Date.parse(rec.am) || 0}`, { am: now(), t: einmalPraefix, exp: rec.exp }))) return { antwort: fehler(T.abgelaufen, 410, "code_abgelaufen") };
  // Zwischendurch neuer Code angefordert oder gesperrt? Dann gilt dieser nicht mehr.
  const nochDa = await store.get(key);
  if (!nochDa || nochDa.codeHash !== rec.codeHash || nochDa.id !== rec.id) return { antwort: fehler(T.abgelaufen, 410, "code_abgelaufen") };
  await store.del(key);
  return { rec };
}

// Nach erfolgreichem Anmelde-Code: ein Studio → Gerät anlegen, mehrere → Auswahl mit Einmal-Token (5 Min.)
// Ergebnis: { daten } (Antwortdaten) oder { antwort } (Fehler-Response)
export async function nachAnmeldeCode(rec, email, gd) {
  const studios = (await Promise.all((rec.studioIds || []).map((sid) => getStudio(sid)))).filter((s) => AKTIV(s) && !s.demo && rolleFuer(s, email));
  if (!studios.length) return { antwort: fehler(T.abgelaufen, 410, "code_abgelaufen") };
  if (studios.length === 1) return { daten: await geraetFertig(studios[0], email, gd) };
  const ids = studios.map((s) => s.id);
  return {
    daten: {
      auswahl: studios.map((s) => ({ id: s.id, firma: s.firma, ort: s.ort || "" })),
      auswahlToken: sign({ t: "appauswahl", email, ids, exp: Date.now() + 5 * 60e3, n: crypto.randomBytes(9).toString("base64url") }),
    },
  };
}

// Gerät anlegen und Token ausgeben. Liefert die Antwortdaten { token, geraet, studio }.
export async function geraetFertig(s, email, gd) {
  const rolle = rolleFuer(s, email);
  const { geraet, token } = await geraetAnlegen(s, {
    email, rolle, platform: gd.platform, name: clean(gd.name, 60), modell: clean(gd.modell, 40), osVersion: clean(gd.osVersion, 20), appVersion: clean(gd.appVersion, 30),
  });
  await log("app-anmeldung", { studioId: s.id, geraetId: geraet.id, platform: geraet.platform, rolle });
  // Hinweis an die Hauptadresse (Demo-Studio: notify schickt nichts)
  await notify(s, mails.appNeuesGeraet(s, { name: geraet.name, email: geraet.email, modell: geraet.modell }));
  return { token, geraet: { id: geraet.id, name: geraet.name, platform: geraet.platform, rolle }, studio: { id: s.id, firma: s.firma, ort: s.ort || "" } };
}
