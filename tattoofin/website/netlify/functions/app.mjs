// API der Tattoofin-App für Studios (seit 13.11.2026, zuerst iPhone; alle Endpunkte plattformneutral: platform "ios" | "android").
// Anmeldung per 6-stelligem Code per E-Mail, danach Gerätetoken „Authorization: Bearer tfa_<geraetId>.<geheimnis>“ (siehe _lib/app-geraete.mjs).
// Mit demselben Token gehen auch alle /api/portal/*-Endpunkte (Zahlungslinks, Gutscheine …), außer den Web-Bereichen (403 nur_web).
//   POST   /api/app/code             { email, platform }                    → immer 200 { ok, verzoegert } (verrät nicht, ob es die Adresse gibt)
//   POST   /api/app/anmelden         { email, code, geraet } | { auswahlToken, studioId, geraet } → { token, geraet, studio } | { auswahl, auswahlToken }
//   POST   /api/app/abmelden         dieses Gerät abmelden
//   GET    /api/app/geraete          angemeldete Geräte des Studios          DELETE /api/app/geraete/:id   ein Gerät abmelden
//   PATCH  /api/app/geraet           { name?, mitteilungen?, kundennameInMitteilung? }
//   PUT    /api/app/push             { token, platform, umgebung, mitteilungen? }   DELETE /api/app/push   POST /api/app/push/test
//   GET    /api/app/auszahlungen?limit=20&nach=po_…   Auszahlungen + Saldo vom Stripe-Konto des Studios
//   GET    /api/app/team · PUT /api/app/team { emails, alleAbmelden? } (nur Inhaber) · DELETE /api/app/team/ich (nur Team)
//   POST   /api/app/konto-loeschen   { bestaetigung: "LÖSCHEN", grund? }  (nur Inhaber) → Kündigung zum Monatsende + Löschanfrage
// Grenzen (zaehleVersuch): Code-Mails 3 pro Adresse in 15 Min. und 20 pro IP und Stunde, Anmelde-Versuche 30 pro IP und Stunde,
// Code 10 Min. gültig (APP_CODE_MINUTEN), höchstens 5 falsche Versuche. Alle Antworten mit Cache-Control: no-store.
// Review-Zugang für Apple: APP_REVIEW_EMAIL + APP_REVIEW_CODE (6 Ziffern) + APP_REVIEW_STUDIO_ID, nur wenn alle drei gesetzt sind und das
// Studio demo:true hat (_lib/app-demo.mjs). Nur lokal (http://localhost, nicht auf Netlify): APP_LOKAL_CODE = fester Code statt Zufall.
import crypto from "node:crypto";
import { CFG, SECRETS } from "./_lib/config.mjs";
import { json, body, clean, handler, clientIp, isEmail, now } from "./_lib/util.mjs";
import { store, getStudio, saveStudio, studiosPerEmail, AKTIV, zaehleVersuch, normEmail, log } from "./_lib/store.mjs";
import { currentStudio, sign, verify } from "./_lib/auth.mjs";
import { notify, notifyAdmin, kuendigungEinreichen } from "./_lib/domain.mjs";
import { mails } from "./_lib/emails.mjs";
import { warteschlangeStatus } from "./_lib/mail.mjs";
import { stripe } from "./_lib/stripe.mjs";
import { PLATTFORMEN, geraetAnlegen, geraetLaden, geraetSpeichern, geraeteVon, geraetWiderrufen, geraeteWiderrufen, geraetOeffentlich, rolleFuer } from "./_lib/app-geraete.mjs";
import { apnsAktiv, pushTest } from "./_lib/push.mjs";
import { demoAuszahlungen } from "./_lib/app-demo.mjs";
import { oeffentlich } from "./_lib/studio-ansicht.mjs";

const aj = (daten, status = 200) => json(daten, status, { "cache-control": "no-store" });
const fehler = (error, status, code, extra = {}) => aj({ error, ...(code ? { code } : {}), ...extra }, status);
const hash = (x) => crypto.createHmac("sha256", SECRETS.sessionSecret).update(String(x)).digest("hex").slice(0, 32);
const codeHash = (email, code) => crypto.createHmac("sha256", SECRETS.sessionSecret).update(`${email}:${code}`).digest("hex");
const gleich = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const minuten = () => Math.min(60, Math.max(1, Math.round(Number(process.env.APP_CODE_MINUTEN) || 10)));
const berlinTag = (ms) => new Date(ms).toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
const MAX_VERSUCHE = 5;
const T = {
  login: "Bitte einloggen", eingabe: "Bitte E-Mail und den 6-stelligen Code eingeben.", falsch: "Der Code stimmt nicht.",
  abgelaufen: "Der Code ist abgelaufen. Fordere einfach einen neuen an.", gesperrt: "Zu viele falsche Versuche. Bitte fordere einen neuen Code an.",
  zuViele: "Zu viele Versuche. Bitte warte kurz.", auswahl: "Ungültige Auswahl.", platform: "Unbekannte Plattform.",
  nurInhaber: "Nur der Inhaber kann das ändern.",
};

// Review-Zugang (App-Prüfung bei Apple): nur mit allen drei Variablen und Demo-Studio
function reviewKonfig() {
  const e = normEmail(process.env.APP_REVIEW_EMAIL || ""), c = String(process.env.APP_REVIEW_CODE || ""), sid = String(process.env.APP_REVIEW_STUDIO_ID || "");
  return e && /^\d{6}$/.test(c) && sid ? { email: e, code: c, studioId: sid } : null;
}
async function reviewFuer(email) {
  const k = reviewKonfig();
  if (!k || k.email !== email) return null;
  const s = await getStudio(k.studioId);
  return s?.demo ? { ...k, s } : null;
}
// Fester Code nur für den lokalen Nachbau (dev/app-lokal.mjs), nie auf Netlify
const lokalerCode = () => {
  const c = String(process.env.APP_LOKAL_CODE || "");
  return /^\d{6}$/.test(c) && /^http:\/\/localhost:\d+$/.test(CFG.siteUrl) && !CFG.vorschau && !process.env.NETLIFY ? c : null;
};

// ---------------------------------------------------------------- Code anfordern
async function codeAnfordern(req, context) {
  const b = await body(req);
  const lokal = lokalerCode();   // nur lokal: fester Code, ohne Grenzen (damit man im Simulator beliebig oft testen kann)
  const ipOk = lokal || (await zaehleVersuch(`rl/appcode-ip/${hash(clientIp(req, context) || "?")}`, 20, 3600e3));
  const antwort = async () => aj({ ok: true, verzoegert: (await warteschlangeStatus()).anzahl > 0 });
  const email = normEmail(clean(b.email, 160));
  if (!ipOk || !isEmail(email)) return antwort();
  if (await reviewFuer(email)) return antwort();   // Review: keine Mail, kein gespeicherter Code (fester APP_REVIEW_CODE)
  if (!lokal && !(await zaehleVersuch(`rl/appcode-mail/${hash(email)}`, 3, 15 * 60e3))) return antwort();
  const studios = (await studiosPerEmail(email)).filter((s) => AKTIV(s) && !s.demo).slice(0, 3);
  if (!studios.length) return antwort();
  const code = lokal || String(crypto.randomInt(0, 1e6)).padStart(6, "0");
  const min = minuten();
  // Ein neuer Code ersetzt den alten (und setzt die Fehlversuche zurück)
  await store.set(`appcode/${hash(email)}`, { codeHash: codeHash(email, code), exp: Date.now() + min * 60e3, versuche: 0, studioIds: studios.map((s) => s.id), am: now() });
  // Eine Mail genügt (der Code gilt für alle Studios dieser Adresse). Team-Adresse bekommt sie an sich selbst (wie login.mjs).
  const s = studios[0];
  const an = normEmail(s.email) === email ? undefined : (s.teamEmails || []).find((t) => normEmail(t) === email);
  await notify(s, mails.appCode(s, { code, minuten: min }), an);
  await log("app-code", { studioId: s.id, studios: studios.length });
  return antwort();
}

// ---------------------------------------------------------------- Anmelden
async function anmelden(req, context) {
  if (!(await zaehleVersuch(`rl/appanmelden-ip/${hash(clientIp(req, context) || "?")}`, 30, 3600e3))) return fehler(T.zuViele, 429, "zu_viele");
  const b = await body(req);
  const gd = b.geraet && typeof b.geraet === "object" ? b.geraet : {};
  if (!PLATTFORMEN.includes(gd.platform)) return fehler(T.platform, 400, "platform");

  // B) Auswahl bei mehreren Studios: signiertes Einmal-Token (5 Min.)
  if (b.auswahlToken) {
    const p = verify(clean(b.auswahlToken, 3000), "appauswahl");
    const sid = clean(b.studioId, 40);
    if (!p?.n || !Array.isArray(p.ids) || !p.ids.includes(sid)) return fehler(T.auswahl, 400, "auswahl");
    // Einmal verwenden (gleicher Schlüssel wie einmalVerbrauchen, aber atomar angelegt)
    if (!(await store.setNeu("einmal/" + p.n, { am: now(), t: p.t, exp: p.exp }))) return fehler(T.auswahl, 400, "auswahl");
    const s = await getStudio(sid);
    if (!s || !AKTIV(s) || s.demo || !rolleFuer(s, p.email)) return fehler(T.auswahl, 400, "auswahl");
    return fertig(s, p.email, gd);
  }

  // A) E-Mail + Code
  const email = normEmail(clean(b.email, 160));
  const code = String(b.code ?? "").replace(/\s+/g, "");
  if (!isEmail(email) || !/^\d{6}$/.test(code)) return fehler(T.eingabe, 400, "eingabe");

  const review = await reviewFuer(email);
  if (review) {
    const key = `appreview/${hash(email)}`;
    const rr = (await store.get(key)) || { versuche: 0 };
    if (rr.gesperrtBis && Date.parse(rr.gesperrtBis) > Date.now()) return fehler(T.gesperrt, 410, "code_gesperrt");
    if (!gleich(code, review.code)) {
      const versuche = (rr.gesperrtBis ? 0 : rr.versuche || 0) + 1;
      if (versuche >= MAX_VERSUCHE) { await store.set(key, { versuche: 0, gesperrtBis: new Date(Date.now() + 15 * 60e3).toISOString() }); return fehler(T.gesperrt, 410, "code_gesperrt"); }
      await store.set(key, { versuche });
      return fehler(T.falsch, 400, "code_falsch", { restVersuche: MAX_VERSUCHE - versuche });
    }
    await store.del(key);
    return fertig(review.s, email, gd);
  }

  const key = `appcode/${hash(email)}`;
  const rec = await store.get(key);
  if (!rec || !(Number(rec.exp) > Date.now())) { if (rec) await store.del(key); return fehler(T.abgelaufen, 410, "code_abgelaufen"); }
  if (!gleich(rec.codeHash, codeHash(email, code))) {
    rec.versuche = (rec.versuche || 0) + 1;
    if (rec.versuche >= MAX_VERSUCHE) { await store.del(key); await log("app-code-gesperrt", { studios: rec.studioIds?.length || 0 }); return fehler(T.gesperrt, 410, "code_gesperrt"); }
    await store.set(key, rec);
    return fehler(T.falsch, 400, "code_falsch", { restVersuche: MAX_VERSUCHE - rec.versuche });
  }
  // Richtiger Code: genau einmal verwendbar (atomar), dann löschen
  if (!(await store.setNeu(`einmal/appcode-${rec.codeHash.slice(0, 32)}-${Date.parse(rec.am) || 0}`, { am: now(), t: "appcode", exp: rec.exp }))) return fehler(T.abgelaufen, 410, "code_abgelaufen");
  await store.del(key);
  const studios = (await Promise.all((rec.studioIds || []).map((sid) => getStudio(sid)))).filter((s) => AKTIV(s) && !s.demo && rolleFuer(s, email));
  if (!studios.length) return fehler(T.abgelaufen, 410, "code_abgelaufen");
  if (studios.length === 1) return fertig(studios[0], email, gd);
  const ids = studios.map((s) => s.id);
  return aj({
    auswahl: studios.map((s) => ({ id: s.id, firma: s.firma, ort: s.ort || "" })),
    auswahlToken: sign({ t: "appauswahl", email, ids, exp: Date.now() + 5 * 60e3, n: crypto.randomBytes(9).toString("base64url") }),
  });
}

async function fertig(s, email, gd) {
  const rolle = rolleFuer(s, email);
  const { geraet, token } = await geraetAnlegen(s, {
    email, rolle, platform: gd.platform, name: clean(gd.name, 60), modell: clean(gd.modell, 40), osVersion: clean(gd.osVersion, 20), appVersion: clean(gd.appVersion, 30),
  });
  await log("app-anmeldung", { studioId: s.id, geraetId: geraet.id, platform: geraet.platform, rolle });
  // Hinweis an die Hauptadresse (Demo-Studio: notify schickt nichts)
  await notify(s, mails.appNeuesGeraet(s, { name: geraet.name, email: geraet.email, modell: geraet.modell }));
  return aj({ token, geraet: { id: geraet.id, name: geraet.name, platform: geraet.platform, rolle }, studio: { id: s.id, firma: s.firma, ort: s.ort || "" } });
}

// ---------------------------------------------------------------- Auszahlungen
const STATUS_TEXT = { paid: "Angekommen", in_transit: "Unterwegs", pending: "Wird vorbereitet", failed: "Fehlgeschlagen", canceled: "Abgebrochen" };
const FEHLER_TEXT = {
  account_closed: "Das Bankkonto ist geschlossen.", no_account: "Dieses Bankkonto gibt es nicht.", invalid_account_number: "Die IBAN stimmt nicht.",
  account_frozen: "Das Bankkonto ist gesperrt.", bank_account_restricted: "Das Bankkonto nimmt diese Überweisung nicht an.", could_not_process: "Die Bank konnte die Überweisung nicht verarbeiten.",
  insufficient_funds: "Auf dem Stripe-Konto war nicht genug Guthaben.", debit_not_authorized: "Die Bank hat die Buchung nicht erlaubt.", invalid_currency: "Das Bankkonto nimmt keine Euro an.",
};
const STANDARD_FEHLER = "Die Auszahlung ist fehlgeschlagen. Bitte prüfe deine Bankdaten im Dashboard.";
function auszahlungAusgabe(po) {
  const d = po.destination && typeof po.destination === "object" ? po.destination : null;
  return {
    id: po.id, betragCent: po.amount, waehrung: po.currency || "eur", status: po.status, statusText: STATUS_TEXT[po.status] || po.status,
    ankunftAm: po.arrival_date ? berlinTag(po.arrival_date * 1000) : null,
    erstelltAm: po.created ? new Date(po.created * 1000).toISOString().replace(/\.\d{3}Z$/, "Z") : null,
    bank: d ? { name: d.bank_name || d.brand || (d.object === "card" ? "Karte" : "Bank"), endet: d.last4 || "" } : null,
    fehler: po.status === "failed" ? FEHLER_TEXT[po.failure_code] || STANDARD_FEHLER : null,
  };
}
async function auszahlungen(s, url) {
  const limit = Math.min(50, Math.max(1, Math.round(Number(url.searchParams.get("limit")) || 20)));
  const nachRoh = url.searchParams.get("nach") || "";
  const nach = /^po_[A-Za-z0-9_]{3,80}$/.test(nachRoh) ? nachRoh : null;
  if (s.demo) return aj(demoAuszahlungen({ limit, nach }));
  const konto = { verbunden: Boolean(s.stripe?.accountId), auszahlungenAktiv: Boolean(s.stripe?.payoutsEnabled), kontoTyp: s.stripe?.kontoTyp || (s.modell === "provision" ? "express" : "standard") };
  if (!konto.verbunden) return aj({ konto, saldo: null, auszahlungen: [], weitere: false, hinweis: "Noch kein Stripe-Konto verbunden." });
  const account = s.stripe.accountId;
  let liste, saldo;
  try {
    [liste, saldo] = await Promise.all([
      stripe("GET", "/payouts", { limit, ...(nach ? { starting_after: nach } : {}), expand: ["data.destination"] }, { account }),
      stripe("GET", "/balance", null, { account }),
    ]);
  } catch (e) {
    await log("app-auszahlungen-fehler", { studioId: s.id, fehler: String(e.message).slice(0, 160) });
    return fehler("Stripe antwortet gerade nicht. Bitte gleich nochmal versuchen.", 502, "stripe");
  }
  const summe = (arr) => (arr || []).filter((x) => (x.currency || "eur") === "eur").reduce((a, x) => a + (Number(x.amount) || 0), 0);
  const daten = (liste.data || []).map(auszahlungAusgabe);
  return aj({
    konto, saldo: { verfuegbarCent: summe(saldo.available), unterwegsCent: summe(saldo.pending), waehrung: "eur" },
    auszahlungen: daten, weitere: Boolean(liste.has_more), nach: liste.has_more && daten.length ? daten[daten.length - 1].id : null,
  });
}

// ---------------------------------------------------------------- Team
const teamAntwort = (s, ich) => ({ hauptadresse: s.email, team: s.teamEmails || [], max: 5, darfAendern: ich.rolle === "inhaber" });
async function teamSetzen(s, ich, g, req) {
  if (ich.rolle !== "inhaber") return fehler("Nur der Inhaber kann das Team ändern.", 403, "nur_inhaber");
  const b = await body(req);
  // Ohne Liste nichts ändern (sonst würde ein fehlerhafter Aufruf das ganze Team löschen)
  if (!Array.isArray(b.emails)) return fehler("Bitte die Team-Adressen als Liste (emails) schicken.", 400, "emails");
  // Gleiche Prüfung wie im Admin (höchstens 5, gültige Adressen, ohne Dubletten); die Hauptadresse gehört nicht in die Liste
  const roh = [...new Set((Array.isArray(b.emails) ? b.emails : []).map((e) => clean(e, 160).replace(/\s+/g, "").toLowerCase()).filter(Boolean))];
  const gesehen = new Set([normEmail(s.email)]), liste = [];
  for (const e of roh) { const n = normEmail(e); if (!gesehen.has(n)) { gesehen.add(n); liste.push(e); } }
  if (liste.length > 5) return fehler("Höchstens 5 Team-Adressen", 400);
  const falsch = liste.find((e) => !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(e));
  if (falsch) return fehler(`Keine gültige E-Mail: ${falsch}`, 400);
  const vorher = s.teamEmails || [];
  const bleibt = new Set(liste.map(normEmail));
  const entfernt = new Set(vorher.map(normEmail).filter((n) => !bleibt.has(n)));
  const alleAbmelden = b.alleAbmelden === true;
  s.teamEmails = liste;
  if (alleAbmelden) s.sessionVersion = (s.sessionVersion || 0) + 1;
  await saveStudio(s);
  // App-Geräte entfernter Adressen sofort abmelden. Web-Cookies lassen sich nicht einzeln trennen → Option „alleAbmelden“.
  const widerrufen = await geraeteWiderrufen(s.id, (x) => entfernt.has(x.email), "team-entfernt");
  // Bei „alle abmelden“ bleibt dieses Gerät angemeldet (der Inhaber hat es gerade selbst ausgelöst)
  if (alleAbmelden) { g.sv = s.sessionVersion; await geraetSpeichern(g); }
  await log("app-team", { studioId: s.id, geraetId: ich.geraetId, anzahl: liste.length, entfernt: entfernt.size, widerrufen, alleAbmelden });
  await notifyAdmin("Team-Adressen in der App geändert", s, { Vorher: vorher.join(", ") || "–", Nachher: liste.join(", ") || "–", Alle_abgemeldet: alleAbmelden ? "ja" : "nein" });
  return aj(teamAntwort(s, ich));
}

// ---------------------------------------------------------------- Konto löschen (Kündigung + Löschanfrage)
async function kontoLoeschen(s, ich, req) {
  if (ich.rolle !== "inhaber") return fehler("Nur der Inhaber kann das Konto löschen.", 403, "nur_inhaber");
  const b = await body(req);
  if (String(b.bestaetigung || "").trim().toUpperCase() !== "LÖSCHEN") return fehler("Bitte tippe LÖSCHEN zur Bestätigung.", 400, "bestaetigung");
  const grund = clean(b.grund, 1000);
  // Schon gekündigt: kein Fehler, nur die Löschanfrage dazu
  if (!["gekuendigt", "beendet", "erstattet"].includes(s.status)) await kuendigungEinreichen(s, { grund, garantie: false, quelle: "app", mitMails: false });
  const zum = s.kuendigung?.zum || s.vertragsende || now();
  // Löschung spätestens 30 Tage nach Vertragsende (Datenschutzerklärung, Abschnitt Speicherdauer)
  const loeschungAb = berlinTag(Date.parse(zum) + 30 * 864e5);
  s.loeschAnfrage = { am: now(), durch: "app", geraetId: ich.geraetId, loeschungAb, ...(grund ? { grund } : {}) };
  await saveStudio(s);
  await log("app-loeschanfrage", { studioId: s.id, geraetId: ich.geraetId, zum, loeschungAb });
  await notify(s, mails.loeschAnfrage(s, { zum, loeschungAb }));
  await notifyAdmin("Löschanfrage aus der App", s, { Kuendigung_zum: zum, Loeschung_ab: loeschungAb, Grund: grund || "–" });
  return aj({ ok: true, kuendigungZum: zum, loeschungAb, studio: oeffentlich(s) });
}

// ---------------------------------------------------------------- Verteiler
async function route(req, context) {
  const url = new URL(req.url);
  const teile = url.pathname.replace(/^\/api\/app\/?/, "").split("/").filter(Boolean);
  const [bereich, sub] = teile;
  const m = req.method;

  if (bereich === "code") return m === "POST" ? codeAnfordern(req, context) : fehler("Methode nicht erlaubt", 405);
  if (bereich === "anmelden") return m === "POST" ? anmelden(req, context) : fehler("Methode nicht erlaubt", 405);

  // Ab hier nur mit App-Token (kein Cookie, keine Admin-Ansicht)
  const s = await currentStudio(req);
  if (!s || !s._app) return fehler(T.login, 401, "nicht_angemeldet");
  const ich = s._app, g = s._geraet;

  if (bereich === "abmelden" && m === "POST") { await geraetWiderrufen(g, "abgemeldet"); await log("app-abmeldung", { studioId: s.id, geraetId: g.id }); return aj({ ok: true }); }

  if (bereich === "geraete" && !sub && m === "GET") return aj({ geraete: (await geraeteVon(s.id)).map((x) => geraetOeffentlich(x, { aktuell: ich })) });
  if (bereich === "geraete" && sub && m === "DELETE") {
    const x = await geraetLaden(sub);
    if (!x || x.studioId !== s.id || x.widerrufenAm) return fehler("Nicht gefunden", 404);
    if (ich.rolle !== "inhaber" && x.email !== ich.email) return fehler("Nur der Inhaber kann fremde Geräte abmelden.", 403, "nur_inhaber");
    await geraetWiderrufen(x, x.id === g.id ? "abgemeldet" : "von-anderem-geraet");
    await log("app-geraet-abgemeldet", { studioId: s.id, geraetId: x.id, durch: g.id });
    return aj({ ok: true });
  }

  if (bereich === "geraet" && m === "PATCH") {
    const b = await body(req);
    if (b.name !== undefined) { const n = clean(b.name, 60); if (!n) return fehler("Bitte gib dem Gerät einen Namen.", 400, "eingabe"); g.name = n; }
    if (b.mitteilungen && typeof b.mitteilungen === "object") {
      for (const k of ["zahlungen", "auszahlungen"]) if (typeof b.mitteilungen[k] === "boolean") g.mitteilungen = { ...(g.mitteilungen || {}), [k]: b.mitteilungen[k] };
    }
    if (typeof b.kundennameInMitteilung === "boolean") g.kundennameInMitteilung = b.kundennameInMitteilung;
    await geraetSpeichern(g);
    return aj({ geraet: geraetOeffentlich(g, { aktuell: ich }) });
  }

  if (bereich === "push") {
    if (sub === "test" && m === "POST") {
      if (!(await zaehleVersuch(`rl/apppushtest/${g.id}`, 5, 3600e3))) return fehler(T.zuViele, 429, "zu_viele");
      return aj(await pushTest(g));
    }
    if (!sub && m === "PUT") {
      const b = await body(req);
      if (!PLATTFORMEN.includes(b.platform) || b.platform !== g.platform) return fehler("Die Plattform passt nicht zu diesem Gerät.", 400, "platform");
      const token = String(b.token || "").trim();
      const okToken = g.platform === "ios" ? /^[0-9a-f]{64,200}$/i.test(token) : token.length >= 20 && token.length <= 4096;
      if (!okToken) return fehler("Ungültiger Geräte-Token.", 400, "token");
      const umgebung = ["sandbox", "production"].includes(b.umgebung) ? b.umgebung : g.platform === "ios" ? null : "production";
      if (!umgebung) return fehler("Bitte umgebung sandbox oder production angeben.", 400, "umgebung");
      g.push = { token: g.platform === "ios" ? token.toLowerCase() : token, umgebung, am: now() };
      if (b.mitteilungen && typeof b.mitteilungen === "object") {
        for (const k of ["zahlungen", "auszahlungen"]) if (typeof b.mitteilungen[k] === "boolean") g.mitteilungen = { ...(g.mitteilungen || {}), [k]: b.mitteilungen[k] };
      }
      // Derselbe Token an einem anderen Gerät desselben Studios (App neu installiert) → dort entfernen
      for (const x of await geraeteVon(s.id)) if (x.id !== g.id && x.push?.token === g.push.token) { x.push = null; await geraetSpeichern(x); }
      await geraetSpeichern(g);
      return aj({ ok: true, apnsAktiv: apnsAktiv() });
    }
    if (!sub && m === "DELETE") { g.push = null; await geraetSpeichern(g); return aj({ ok: true }); }
  }

  if (bereich === "auszahlungen" && m === "GET") return auszahlungen(s, url);

  if (bereich === "team") {
    if (!sub && m === "GET") return aj(teamAntwort(s, ich));
    if (!sub && m === "PUT") return teamSetzen(s, ich, g, req);
    if (sub === "ich" && m === "DELETE") {
      if (ich.rolle !== "team") return fehler("Das geht nur mit einer Team-Adresse. Als Inhaber bleibst du im Studio.", 403, "nur_team");
      s.teamEmails = (s.teamEmails || []).filter((e) => normEmail(e) !== ich.email);
      await saveStudio(s);
      const n = await geraeteWiderrufen(s.id, (x) => x.email === ich.email, "team-verlassen");
      await log("app-team-verlassen", { studioId: s.id, geraetId: ich.geraetId, widerrufen: n });
      return aj({ ok: true });
    }
  }

  if (bereich === "konto-loeschen" && m === "POST") return kontoLoeschen(s, ich, req);

  return fehler("Nicht gefunden", 404);
}

const inner = handler(route);
// Jede Antwort (auch Fehler aus handler) ohne Zwischenspeicher
export default async (req, context) => {
  const r = await inner(req, context);
  try { r.headers.set("cache-control", "no-store"); } catch { /* unveränderlich: egal */ }
  return r;
};

export const config = { path: ["/api/app", "/api/app/*"] };
