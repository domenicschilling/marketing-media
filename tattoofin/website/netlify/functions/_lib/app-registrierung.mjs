// Neues Studio-Konto in der Tattoofin-App mit Apple-Abo (StoreKit 2), seit 14.11.2026. Aufgerufen von app.mjs (/api/app/registrieren*, /api/app/abo/*).
// Die Web-Anmeldung (/api/signup, Stripe-Checkout) bleibt unverändert. In Antworten nie Web-Preis und nie Link zur Web-Anmeldung (Apple 3.1.3).
//   POST /api/app/registrieren/code     { email, platform }            → immer 200 { ok, verzoegert } (verrät nicht, ob es die Adresse gibt)
//        Adresse mit aktivem Studio → Anmelde-Code wie /api/app/code; sonst Registrier-Code (appreg/<hash>, 10 Min., Mail appRegistrierCode)
//   POST /api/app/registrieren/pruefen  { email, code, geraet }        → { art: "angemeldet", token, geraet, studio } | { art: "auswahl", auswahl, auswahlToken }
//                                                                         | { art: "registrieren", registrierToken (2 h), email, entwurf|null }
//   POST /api/app/registrieren          { registrierToken, firma, inhaber, strasse, plz, ort, telefon, studioTelefon, ustid, website, unterzeichner,
//                                         akzeptiert: { vertrag, avv, unternehmer, kmu } } → { entwurfId, entwurfToken (30 Tage), appAccountToken, produktId, email }
//   POST /api/app/abo/bestaetigen       A) { entwurfToken, signedTransaction, geraet } → { token, geraet, studio, abo }
//                                       B) Bearer tfa_… (Inhaber, Apple-Studio) { signedTransaction } → { abo, studio }
//   POST /api/app/abo/wiederherstellen  { signedTransactions: [1–10] }   → { art: "anmelden", emailMaskiert } | 404 kein_konto (ändert am Studio nichts,
//                                       außer ein nie bestätigter Entwurf mit gültigem Kauf wird aktiviert)
//   POST /api/app/abo/aktualisieren     Bearer (jede Rolle) { signedTransaction } → { abo }
// Grenzen (atomar): Code-Mails gemeinsam mit /api/app/code, Prüfen wie /api/app/anmelden (rl/appanmelden-ip 30/h, Plätze je Code, 15/Tag),
// registrieren 20 pro IP und Stunde (rl/appreg-ip), abo/* 30 pro IP und Stunde (rl/appabo-ip). Lokal mit festem Code ohne Grenzen.
// Review: APP_REVIEW_REG_EMAIL (+ APP_REVIEW_CODE) führt immer zu art „registrieren“ mit frischem Entwurf (für Apples Prüfer).
// Body höchstens 64 KB (413 zu_gross).
// Fehler immer { error, code, …extra } (Codes siehe Spezifikation, z. B. eingabe + felder, registrierung_abgelaufen, schon_aktiv, jws_ungueltig).
import crypto from "node:crypto";
import { CFG, appleCfg, istApple } from "./config.mjs";
import { body as bodyRoh, clean, clientIp, isEmail, now, id, HttpError, MAX_APP_BODY } from "./util.mjs";
const body = (req) => bodyRoh(req, { max: MAX_APP_BODY });
import { store, getStudio, saveStudio, studioBy, studiosPerEmail, normEmail, AKTIV, zaehleAtomar, log } from "./store.mjs";
import { sign, verify, currentStudio } from "./auth.mjs";
import { slugify, notifyAdmin } from "./domain.mjs";
import { sendMail, warteschlangeStatus } from "./mail.mjs";
import { mails } from "./emails.mjs";
import { PLATTFORMEN } from "./app-geraete.mjs";
import { oeffentlich, appleAboAusgabe } from "./studio-ansicht.mjs";
import { studioDatenPruefen, bestaetigungenOk } from "./anmeldung-daten.mjs";
import { stripe } from "./stripe.mjs";
import {
  aj, fehler, hash, codeHash, minuten, T, lokalerCode, reviewFuer, codeIpErlaubt, codeAdresseErlaubt, aktiveStudios, anmeldeCodeSenden,
  reviewPruefen, reviewRegFuer, codePruefen, nachAnmeldeCode, geraetFertig, maskiereEmail,
} from "./app-code.mjs";
import { AT, appleFehler, jwsPruefen, transaktionPruefen, otxBeanspruchen, otxSchluessel, studioIdZuOtx, appleAktivieren, appleStatusAnwenden, uuidNorm } from "./apple.mjs";

const RT = {
  registrierungAbgelaufen: "Deine Bestätigung ist abgelaufen. Fordere bitte einen neuen Code an.",
  bestaetigung: "Bitte bestätige Vertrag, AVV, Unternehmer und KMU.",
  zuViele: "Zu viele Versuche. Bitte warte kurz.",
};
const ENTWURF_TAGE = 30;
const ENTWURF_FELDER = ["firma", "inhaber", "strasse", "plz", "ort", "telefon", "studioTelefon", "ustid", "website", "unterzeichner"];
const methode = () => fehler("Methode nicht erlaubt", 405);
// Grenze je IP (atomar). Lokal mit festem Code (Simulator, UI-Tests) ohne Grenze.
const ipGrenze = async (req, context, name, max) => Boolean(lokalerCode()) || zaehleAtomar(`rl/${name}/${hash(clientIp(req, context) || "?")}`, max, 3600e3);
// HttpError (z. B. aus apple.mjs) → Antwort im App-Format
const alsAntwort = (e) => { if (e instanceof HttpError) return fehler(e.message, e.status, e.fehlerCode, e.extra || {}); throw e; };
const geraetVon = (b) => (b.geraet && typeof b.geraet === "object" ? b.geraet : {});
// Adresse so, wie sie getippt wurde (ohne Leerzeichen, klein) – gespeichert und angeschrieben wird diese; verglichen wird normEmail
const emailRoh = (v) => clean(v, 160).replace(/\s+/g, "").toLowerCase();

export async function appRegistrierungRoute(req, context, bereich, sub) {
  const m = req.method;
  try {
    if (bereich === "registrieren") {
      if (m !== "POST") return methode();
      if (sub === "code") return await registrierCode(req, context);
      if (sub === "pruefen") return await registrierPruefen(req, context);
      if (!sub) return await registrieren(req, context);
    }
    if (bereich === "abo") {
      if (m !== "POST") return methode();
      if (sub === "bestaetigen") return await aboBestaetigen(req, context);
      if (sub === "wiederherstellen") return await aboWiederherstellen(req, context);
      if (sub === "aktualisieren") return await aboAktualisieren(req, context);
    }
    return fehler("Nicht gefunden", 404);
  } catch (e) { return alsAntwort(e); }
}

// ---------------------------------------------------------------- Code für ein neues Studio
async function registrierCode(req, context) {
  const b = await body(req);
  const ipOk = await codeIpErlaubt(req, context);
  const antwort = async () => aj({ ok: true, verzoegert: (await warteschlangeStatus()).anzahl > 0 });
  const roh = emailRoh(b.email), email = normEmail(roh);
  if (!ipOk || !isEmail(email)) return antwort();
  if ((await reviewFuer(email)) || reviewRegFuer(email)) return antwort();   // Review-Zugänge: keine Mail (fester Code)
  if (!(await codeAdresseErlaubt(email))) return antwort();
  // Adresse hat schon ein aktives Studio → ganz normaler Anmelde-Code (die App meldet sich damit an)
  const studios = await aktiveStudios(email);
  if (studios.length) { await anmeldeCodeSenden(email, studios); return antwort(); }
  const code = lokalerCode() || String(crypto.randomInt(0, 1e6)).padStart(6, "0");
  const min = minuten();
  // Ein neuer Code ersetzt den alten (gleiches Verfahren wie appcode/…: HMAC, 10 Minuten, Versuchs-Plätze je Code)
  await store.set(`appreg/${hash(email)}`, { codeHash: codeHash(email, code), exp: Date.now() + min * 60e3, id: crypto.randomBytes(6).toString("hex"), am: now() });
  const mail = mails.appRegistrierCode({ code, minuten: min });
  await sendMail({ to: roh, subject: mail.subject, html: mail.html, text: mail.text });
  await log("app-registrier-code", { adresse: hash(email) });
  return antwort();
}

// ---------------------------------------------------------------- Code prüfen
async function registrierPruefen(req, context) {
  if (!(await zaehleAtomar(`rl/appanmelden-ip/${hash(clientIp(req, context) || "?")}`, 30, 3600e3))) return fehler(T.zuViele, 429, "zu_viele");
  const b = await body(req);
  const gd = geraetVon(b);
  if (!PLATTFORMEN.includes(gd.platform)) return fehler(T.platform, 400, "platform");
  const roh = emailRoh(b.email), email = normEmail(roh);
  const code = String(b.code ?? "").replace(/\s+/g, "");
  if (!isEmail(email) || !/^\d{6}$/.test(code)) return fehler(T.eingabe, 400, "eingabe");

  // Zweiter Review-Zugang (App-Prüfung): führt immer zu einem frischen Entwurf, damit der Prüfer Konto, Sandbox-Kauf und Löschen
  // frei durchspielen kann. Frühere Prüf-Studios dieser Adresse werden abgehängt (Adresse umbenannt), sie bleiben für den Admin sichtbar.
  const reviewReg = reviewRegFuer(email);
  if (reviewReg) {
    const r = await reviewPruefen(reviewReg, email, code);
    if (r.antwort) return r.antwort;
    await reviewStudiosAbhaengen(email);
    const registrierToken = sign({ t: "appreg", email: roh, n: crypto.randomBytes(9).toString("base64url"), exp: Date.now() + 2 * 3600e3 });
    await log("app-review-registrierung", {});
    return aj({ art: "registrieren", registrierToken, email: roh, entwurf: null });
  }
  const review = await reviewFuer(email);
  if (review) {
    const r = await reviewPruefen(review, email, code);
    return r.antwort || aj({ art: "angemeldet", ...(await geraetFertig(r.s, email, gd)) });
  }
  // Zuerst der Registrier-Code, sonst ein Anmelde-Code (Adresse hat inzwischen ein Studio)
  const regKey = `appreg/${hash(email)}`, codeKey = `appcode/${hash(email)}`;
  const reg = await store.get(regKey);
  const registrierung = (reg && Number(reg.exp) > Date.now()) || !(await store.get(codeKey));
  const c = await codePruefen(registrierung ? regKey : codeKey, email, code, { einmalPraefix: registrierung ? "appreg" : "appcode" });
  if (c.antwort) return c.antwort;
  if (!registrierung) {
    const n = await nachAnmeldeCode(c.rec, email, gd);
    if (n.antwort) return n.antwort;
    return aj(n.daten.auswahl ? { art: "auswahl", ...n.daten } : { art: "angemeldet", ...n.daten });
  }
  const registrierToken = sign({ t: "appreg", email: roh, n: crypto.randomBytes(9).toString("base64url"), exp: Date.now() + 2 * 3600e3 });
  const e = await studioBy("email", roh);
  const entwurf = e && e.status === "entwurf" && istApple(e) ? Object.fromEntries(ENTWURF_FELDER.map((k) => [k, typeof e[k] === "string" ? e[k] : ""])) : null;
  if (entwurf && !entwurf.unterzeichner) entwurf.unterzeichner = e.vertrag?.name || "";
  await log("app-registrier-code-ok", { adresse: hash(email), entwurf: Boolean(entwurf) });
  return aj({ art: "registrieren", registrierToken, email: roh, entwurf });
}

// Frühere Studios des Registrier-Review-Zugangs abhängen: Adresse auf review-alt-<id>@… umstellen, Indizes der Review-Adresse lösen
async function reviewStudiosAbhaengen(email) {
  for (const alt of await studiosPerEmail(email)) {
    if (!alt.reviewRegistrierung) continue;
    const vorher = alt.email;
    alt.email = `review-alt-${alt.id}@tattoofin.invalid`;
    alt.reviewAbgehaengtAm = now();
    await saveStudio(alt);
    for (const k of ["idx/email/" + String(vorher).toLowerCase(), "idx/emailn/" + normEmail(vorher)]) if ((await store.get(k)) === alt.id) await store.del(k);
    if (alt.appEntwurf?.appAccountToken && (await store.get("idx/appentwurf/" + alt.appEntwurf.appAccountToken)) === alt.id) await store.del("idx/appentwurf/" + alt.appEntwurf.appAccountToken);
    await log("app-review-studio-abgehaengt", { studioId: alt.id });
  }
}

// ---------------------------------------------------------------- Studio-Angaben + Vertrag → Entwurf
async function registrieren(req, context) {
  if (!(await ipGrenze(req, context, "appreg-ip", 20))) return fehler(RT.zuViele, 429, "zu_viele");
  const b = await body(req);
  const p = verify(clean(b.registrierToken, 3000), "appreg");
  if (!p?.email || !isEmail(p.email)) return fehler(RT.registrierungAbgelaufen, 410, "registrierung_abgelaufen");
  const email = emailRoh(p.email);
  const { d, fehlt, felder } = studioDatenPruefen(b, { mitEmail: false });
  if (fehlt.length) return fehler("Bitte ausfüllen: " + fehlt.join(", "), 400, "eingabe", { felder });
  if (!bestaetigungenOk(b.akzeptiert)) return fehler(RT.bestaetigung, 400, "bestaetigung_fehlt");
  if ((await studiosPerEmail(email)).some(AKTIV)) return fehler(AT.schonAktiv, 409, "schon_aktiv");

  // Vorhandenen Entwurf zu dieser Adresse wiederverwenden (App oder Web), sonst neu
  let s = await studioBy("email", email);
  if (s && !["entwurf", "abgebrochen"].includes(s.status)) return fehler(AT.schonAktiv, 409, "schon_aktiv");
  // Web-Entwurf mit offener Checkout-Sitzung: Sitzung beenden, damit nicht zusätzlich über Stripe bezahlt wird. Klappt das nicht, den
  // Stand der Sitzung abfragen: schon bezahlt → 409 schon_aktiv (nicht überschreiben), abgelaufen → weiter, unklar → bitte gleich nochmal.
  if (s?.stripe?.checkoutSessionId) {
    const csId = s.stripe.checkoutSessionId;
    try { await stripe("POST", `/checkout/sessions/${csId}/expire`, {}); }
    catch {
      let cs = null;
      try { cs = await stripe("GET", `/checkout/sessions/${csId}`); } catch { /* unten */ }
      if (cs?.status === "complete" || ["paid", "no_payment_required"].includes(cs?.payment_status)) return fehler(AT.schonAktiv, 409, "schon_aktiv");
      if (cs?.status !== "expired") return fehler("Das hat gerade nicht geklappt. Bitte versuch es gleich noch einmal.", 503, "nochmal");
    }
    delete s.stripe.checkoutSessionId;
  }
  const uuid = uuidNorm(s?.appEntwurf?.appAccountToken) || crypto.randomUUID();
  const am = now();
  const ablauf = new Date(Date.now() + ENTWURF_TAGE * 864e5).toISOString();
  const { artists, ...daten } = d;   // „Artists“ fragt die App nicht ab
  void artists;
  s = {
    ...(s || { id: id("st_"), createdAt: am }),
    ...daten, email,
    modell: "kauf", paket: "app", zahlart: "apple", abrechnung: "apple", preisNetto: null, monatNetto: null, aktion: false, status: "entwurf",
    sonderkondition: null, quelle: { source: "app", medium: "ios" },
    vertrag: {
      version: CFG.vertragVersion, akzeptiertAm: am, name: d.unterzeichner, ip: clientIp(req, context), ua: (req.headers.get("user-agent") || "").slice(0, 200),
      vertrag: true, avv: true, unternehmer: true, kmu: true, modell: "kauf", paket: "app", quelle: "app", aufsteller: false,
    },
    appEntwurf: { appAccountToken: uuid, am, ablauf },
    stripe: s?.stripe || {},
    ...(reviewRegFuer(normEmail(email)) ? { reviewRegistrierung: true } : {}),
  };
  if (!s.slug) {
    let slug = slugify(d.firma), n = 1;
    while (await studioBy("slug", slug)) slug = slugify(d.firma) + "-" + (++n);
    s.slug = slug;
  }
  await saveStudio(s);
  await store.set("idx/appentwurf/" + uuid, s.id);
  await log("app-registrierung-entwurf", { studioId: s.id });
  const entwurfToken = sign({ t: "appentwurf", sid: s.id, uuid, exp: Date.now() + ENTWURF_TAGE * 864e5 });
  return aj({ entwurfId: s.id, entwurfToken, appAccountToken: uuid, produktId: appleCfg().produktId, email });
}

// ---------------------------------------------------------------- Kauf bestätigen
const bearer = (req) => (req.headers.get("authorization") || "").startsWith("Bearer tfa_");
function signiertPruefen(jws) {
  const tx = jwsPruefen(jws);
  return transaktionPruefen(tx, { kauf: true });
}

async function aboBestaetigen(req, context) {
  if (!(await ipGrenze(req, context, "appabo-ip", 30))) return fehler(RT.zuViele, 429, "zu_viele");
  const b = await body(req);
  if (bearer(req)) return aboErneuern(req, b);

  // A) Neues Studio: Entwurf-Token + Kauf
  const gd = geraetVon(b);
  if (!PLATTFORMEN.includes(gd.platform)) return fehler(T.platform, 400, "platform");
  const p = verify(clean(b.entwurfToken, 3000), "appentwurf");
  if (!p?.sid || !p?.uuid) return fehler(AT.entwurfAbgelaufen, 410, "entwurf_abgelaufen");
  const tx = signiertPruefen(b.signedTransaction);
  const s = await getStudio(p.sid);
  if (!s) return fehler(AT.entwurfAbgelaufen, 410, "entwurf_abgelaufen");
  const txUuid = uuidNorm(tx.appAccountToken);
  if (txUuid !== p.uuid) return fehler(AT.tokenPasstNicht, 409, "token_passt_nicht");
  // Schon aktiv mit derselben Abo-Kette (zweiter Aufruf, Benachrichtigung war schneller …): nur ein weiteres Gerät, keine zweite Mail
  if (istApple(s) && s.status !== "entwurf" && s.apple?.otxKey === otxSchluessel(tx)) {
    if (s.apple.appAccountToken !== txUuid) return fehler(AT.tokenPasstNicht, 409, "token_passt_nicht");
    if (!AKTIV(s)) return fehler(AT.entwurfAbgelaufen, 410, "entwurf_abgelaufen");
    return aj({ ...(await geraetFertig(s, s.email, gd)), abo: appleAboAusgabe(s) });
  }
  if (s.status !== "entwurf" || !istApple(s)) {
    // Inzwischen über das Web aktiv geworden: Admin-Mail (Erstattung über Apple nötig) + 409 schon_aktiv
    if (AKTIV(s)) await appleAktivieren(s, tx, { quelle: "app" });
    // Entwurf läuft inzwischen über die Web-Anmeldung weiter: Kauf ohne Studio melden
    await notifyAdmin("Apple-Kauf ohne Studio (Entwurf läuft inzwischen über die Web-Anmeldung)", s, { Transaktion: String(tx.originalTransactionId), Umgebung: tx.environment });
    return fehler(AT.entwurfAbgelaufen, 410, "entwurf_abgelaufen");
  }
  if (s.appEntwurf?.appAccountToken !== p.uuid) return fehler(AT.tokenPasstNicht, 409, "token_passt_nicht");
  await otxBeanspruchen(tx, s.id);
  await appleAktivieren(s, tx, { quelle: "app" });
  return aj({ ...(await geraetFertig(s, s.email, gd)), abo: appleAboAusgabe(s) });
}

// B) Eingeloggter Inhaber eines Apple-Studios schließt das Abo neu ab (z. B. nach Ablauf)
async function aboErneuern(req, b) {
  const s = await currentStudio(req);
  if (!s || !s._app) return fehler(T.login, 401, "nicht_angemeldet");
  if (s._app.rolle !== "inhaber") return fehler("Nur der Inhaber kann das Abo abschließen.", 403, "nur_inhaber");
  if (!istApple(s) || !s.apple) return fehler(AT.nichtApple, 403, "nicht_apple");
  const tx = signiertPruefen(b.signedTransaction);
  if (uuidNorm(tx.appAccountToken) !== String(s.apple.appAccountToken || "").toLowerCase()) return fehler(AT.tokenPasstNicht, 409, "token_passt_nicht");
  // Ein Studio mit echtem Abo (Production) lässt sich nie durch einen kostenlosen Testkauf (Sandbox/TestFlight) ersetzen
  if (s.apple.umgebung === "Production" && tx.environment !== "Production") return fehler(AT.umgebung, 400, "umgebung");
  const otxKey = otxSchluessel(tx);
  if (otxKey !== s.apple.otxKey) {
    // Neue Abo-Kette (z. B. anderer Apple-Account): zuordnen, alte merken
    await otxBeanspruchen(tx, s.id);
    s.apple.fruehere = [...(s.apple.fruehere || []), { originalTransactionId: s.apple.originalTransactionId, otxKey: s.apple.otxKey, bis: now() }].slice(-10);
    s.apple.originalTransactionId = String(tx.originalTransactionId);
    s.apple.otxKey = otxKey;
    s.apple.umgebung = tx.environment;
    s.sandbox = tx.environment !== "Production";
  }
  await appleStatusAnwenden(s, tx, null, "app-erneuert", { status: "aktiv", oeffnen: true, auchNachKuendigung: true });
  await log("apple-abo-erneuert", { studioId: s.id, geraetId: s._app.geraetId });
  return aj({ abo: appleAboAusgabe(s), studio: oeffentlich(s) });
}

// ---------------------------------------------------------------- Käufe wiederherstellen (ohne Anmeldung, ohne Token)
async function aboWiederherstellen(req, context) {
  if (!(await ipGrenze(req, context, "appabo-ip", 30))) return fehler(RT.zuViele, 429, "zu_viele");
  const b = await body(req);
  const liste = Array.isArray(b.signedTransactions) ? b.signedTransactions : [];
  if (!liste.length || liste.length > 10) return fehler("Bitte 1 bis 10 Käufe schicken.", 400, "eingabe");
  const gueltig = [];
  for (const jws of liste) {
    try { gueltig.push(transaktionPruefen(jwsPruefen(jws), { kauf: false })); } catch { /* fremde oder ungültige Käufe überspringen */ }
  }
  gueltig.sort((x, y) => Number(y.purchaseDate || y.signedDate || 0) - Number(x.purchaseDate || x.signedDate || 0));
  for (const tx of gueltig) {
    // 1) Abo-Kette gehört schon zu einem Studio → nur Hinweis auf die Adresse (ohne Anmeldung ändert sich am Studio nichts)
    const sid = await studioIdZuOtx(tx);
    const s = sid ? await getStudio(sid) : null;
    if (s && istApple(s)) {
      await log("apple-wiederherstellen", { studioId: s.id, art: "anmelden" });
      return aj({ art: "anmelden", emailMaskiert: maskiereEmail(s.email) });
    }
    // 2) Kauf zu einem Entwurf, der nie bestätigt wurde (App abgestürzt …) → jetzt aktivieren
    const uuid = uuidNorm(tx.appAccountToken);
    const eid = uuid ? await store.get("idx/appentwurf/" + uuid) : null;
    const e = eid ? await getStudio(eid) : null;
    if (e && e.status === "entwurf" && istApple(e) && e.appEntwurf?.appAccountToken === uuid && !tx.revocationDate && Number(tx.expiresDate) > Date.now()) {
      await otxBeanspruchen(tx, e.id);
      await appleAktivieren(e, tx, { quelle: "wiederherstellen" });
      return aj({ art: "anmelden", emailMaskiert: maskiereEmail(e.email) });
    }
  }
  return fehler(AT.keinKonto, 404, "kein_konto");
}

// ---------------------------------------------------------------- Abgleich aus der App (eingeloggt, jede Rolle)
async function aboAktualisieren(req) {
  const s = await currentStudio(req);
  if (!s || !s._app) return fehler(T.login, 401, "nicht_angemeldet");
  if (!istApple(s) || !s.apple) return fehler(AT.nichtApple, 403, "nicht_apple");
  const b = await body(req);
  const tx = transaktionPruefen(jwsPruefen(b.signedTransaction), { kauf: false });
  if (otxSchluessel(tx) !== s.apple.otxKey) return fehler(AT.vergeben, 409, "abo_vergeben");
  // Abgleich: sperrt nie, öffnet nie, laeuftBis nur nach vorne (Ablauf/Erstattung meldet allein Apple per Benachrichtigung)
  await appleStatusAnwenden(s, tx, null, "app-abgleich", { abgleich: true });
  return aj({ abo: appleAboAusgabe(s) });
}
