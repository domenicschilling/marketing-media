// Apple-Abo (In-App-Kauf, StoreKit 2) für Studios, die sich in der Tattoofin-App anmelden (seit 14.11.2026).
// Nur node:crypto, keine Fremdbibliothek.
//
// Prüfung signierter Daten von Apple (JWS, ES256, Zertifikatskette im Kopf „x5c“):
//   Blatt → Zwischenzertifikat → Wurzel. Die Wurzel ist fest eingebaut: „Apple Root CA - G3“ (Quelle: Apple, apple.com/certificateauthority;
//   übernommen aus dem System-Schlüsselbund von macOS: security find-certificate -c "Apple Root CA - G3" -p
//   /System/Library/Keychains/SystemRootCertificates.keychain), gültig bis 30.04.2039,
//   SHA-256-Fingerabdruck 63:34:3A:BF:B8:9A:6A:03:EB:B5:7E:9B:3F:5F:A7:BE:7C:4F:5C:75:6F:30:17:B3:A8:C4:88:C3:65:3E:91:79 (geprüft 14.11.2026).
//   Dazu die Apple-Markierungen: Blatt 1.2.840.113635.100.6.11.1, Zwischenzertifikat 1.2.840.113635.100.6.2.1.
// Nur lokal (config.nurLokal): APPLE_TEST_ROOT_PEM ersetzt die Wurzel (dev/apple-nachbau.mjs), APPLE_XCODE_TEST=1 nimmt StoreKit-Testkäufe
// aus Xcode an (kürzere, selbstsignierte Kette, environment „Xcode“).
//
// Studio-Datensatz: s.abrechnung = "apple", s.paket = "app", s.apple = { appAccountToken, originalTransactionId, otxKey, status, laeuftBis, … }
// Indizes: idx/appentwurf/<uuid> → Entwurf, idx/appleotx/<otxKey> → Studio (nur per setNeu), apple/aktiviert/<otxKey> (Mails genau einmal).
import crypto from "node:crypto";
import { appleCfg, appleTestSchalter, istApple } from "./config.mjs";
import { HttpError, now } from "./util.mjs";
import { store, saveStudio, log } from "./store.mjs";
import { notify, notifyAdmin, connectUrl } from "./domain.mjs";
import { loginLink } from "./auth.mjs";
import { mails } from "./emails.mjs";

export const APPLE_ROOT_G3_PEM = `-----BEGIN CERTIFICATE-----
MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwS
QXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9u
IEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcN
MTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBS
b290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9y
aXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49
AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtf
TjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517
IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySr
MA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gA
MGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4
at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM
6BgD56KyKA==
-----END CERTIFICATE-----`;
export const APPLE_ROOT_G3_FP = "63:34:3A:BF:B8:9A:6A:03:EB:B5:7E:9B:3F:5F:A7:BE:7C:4F:5C:75:6F:30:17:B3:A8:C4:88:C3:65:3E:91:79";
const G3 = new crypto.X509Certificate(APPLE_ROOT_G3_PEM);
if (G3.fingerprint256 !== APPLE_ROOT_G3_FP) throw new Error("Apple Root CA - G3: Fingerabdruck passt nicht");
// DER der Objektkennungen (Tag 06, Länge 0A): Blatt 1.2.840.113635.100.6.11.1, Zwischenzertifikat 1.2.840.113635.100.6.2.1
const OID_BLATT = Buffer.from("060a2a864886f76364060b01", "hex");
const OID_ZWISCHEN = Buffer.from("060a2a864886f76364060201", "hex");

// Texte der Fehler (Du-Form, ohne Web-Preis, ohne Link zur Web-Anmeldung)
export const AT = {
  jws: "Apple hat den Kauf nicht bestätigt. Bitte versuch es noch einmal.",
  produkt: "Dieses Abo gehört nicht zu Tattoofin.",
  umgebung: "Dieser Testkauf gilt hier nicht.",
  familie: "Abos aus der Familienfreigabe gehen bei Tattoofin nicht.",
  abgelaufen: "Dieses Abo ist abgelaufen oder wurde erstattet.",
  tokenPasstNicht: "Dieser Kauf gehört zu einer anderen Anmeldung.",
  vergeben: "Dieses Abo gehört schon zu einem anderen Studio. Schreib uns: info@tattoofin.de",
  nichtApple: "Dein Studio zahlt nicht über Apple.",
  keinKonto: "Zu diesem Abo haben wir kein Studio gefunden. Schreib uns: info@tattoofin.de",
  schonAktiv: "Für diese E-Mail gibt es schon ein Studio. Bitte melde dich an.",
  entwurfAbgelaufen: "Deine Anmeldung ist abgelaufen. Bitte fang neu an.",
};
export const appleFehler = (status, text, code, extra) => new HttpError(status, text, code, extra);
const kaputt = (grund) => { const e = appleFehler(400, AT.jws, "jws_ungueltig"); e.grund = grund; return e; };
export const SPERR_STATUS = ["abgelaufen", "erstattet", "widerrufen"];
const iso = (ms) => (Number(ms) > 0 ? new Date(Number(ms)).toISOString() : null);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const uuidNorm = (u) => (typeof u === "string" && UUID.test(u.toLowerCase()) ? u.toLowerCase() : null);

let testWurzelCache = null;
function testWurzel(pem) {
  if (testWurzelCache?.pem !== pem) testWurzelCache = { pem, cert: new crypto.X509Certificate(pem) };
  return testWurzelCache.cert;
}

// Signierte Daten von Apple prüfen und die Nutzlast liefern. Wirft HttpError 400 code jws_ungueltig (e.grund = interner Grund).
// Optionen nur für Tests: jetzt (ms), schalter ({ xcode, testRootPem }, Standard aus der Umgebung, nur lokal wirksam)
export function jwsPruefen(jws, { jetzt = Date.now(), schalter = appleTestSchalter() } = {}) {
  if (typeof jws !== "string" || !jws || jws.length > 65536) throw kaputt("form");
  const teile = jws.split(".");
  if (teile.length !== 3 || !teile.every((t) => /^[A-Za-z0-9_-]+$/.test(t))) throw kaputt("form");
  let kopf;
  try { kopf = JSON.parse(Buffer.from(teile[0], "base64url").toString("utf8")); } catch { throw kaputt("kopf"); }
  if (!kopf || typeof kopf !== "object" || kopf.alg !== "ES256") throw kaputt("alg");   // auch „none“ und „HS256“ ablehnen
  const x5c = kopf.x5c;
  if (!Array.isArray(x5c) || x5c.length < 1 || x5c.length > 3 || !x5c.every((c) => typeof c === "string" && c.length > 0 && c.length < 10000)) throw kaputt("x5c");
  let kette;
  try { kette = x5c.map((c) => new crypto.X509Certificate(Buffer.from(c, "base64"))); } catch { throw kaputt("zertifikat"); }
  const zeitOk = (c) => Date.parse(c.validFrom) <= jetzt && jetzt <= Date.parse(c.validTo);
  if (!kette.every(zeitOk)) throw kaputt("zeitraum");
  const daten = Buffer.from(teile[0] + "." + teile[1]);
  const signatur = Buffer.from(teile[2], "base64url");
  const signaturOk = (cert) => { try { return crypto.verify("sha256", daten, { key: cert.publicKey, dsaEncoding: "ieee-p1363" }, signatur); } catch { return false; } };
  const ausgestellt = (kind, eltern) => { try { return kind.checkIssued(eltern) && kind.verify(eltern.publicKey); } catch { return false; } };
  const nutzlast = () => {
    let p;
    try { p = JSON.parse(Buffer.from(teile[1], "base64url").toString("utf8")); } catch { throw kaputt("nutzlast"); }
    if (!p || typeof p !== "object" || Array.isArray(p)) throw kaputt("nutzlast");
    return p;
  };

  // Production/Sandbox: genau 3 Zertifikate, Wurzel = Apple Root CA - G3 (lokal: Test-Wurzel)
  const wurzel = schalter?.testRootPem ? testWurzel(schalter.testRootPem) : G3;
  if (kette.length === 3 && kette[2].fingerprint256 === wurzel.fingerprint256 && kette[2].raw.equals(wurzel.raw)) {
    const [blatt, zwischen, root] = kette;
    if (!ausgestellt(blatt, zwischen) || !ausgestellt(zwischen, root) || !ausgestellt(root, root)) throw kaputt("kette");
    if (zwischen.ca !== true || blatt.ca !== false) throw kaputt("ca");
    if (!blatt.raw.includes(OID_BLATT) || !zwischen.raw.includes(OID_ZWISCHEN)) throw kaputt("oid");
    if (!signaturOk(blatt)) throw kaputt("signatur");
    return nutzlast();
  }
  // Nur lokal mit APPLE_XCODE_TEST=1: StoreKit-Test in Xcode (Kette in sich stimmig, letztes Zertifikat selbstsigniert, environment „Xcode“)
  if (schalter?.xcode) {
    for (let i = 0; i < kette.length - 1; i++) if (!ausgestellt(kette[i], kette[i + 1])) throw kaputt("kette");
    // Xcode-Testzertifikat ist kein CA-Zertifikat → checkIssued schlägt fehl; selbstsigniert reicht hier (nur lokal).
    const letztes = kette.at(-1);
    const selbstsigniert = (() => { try { return letztes.subject === letztes.issuer && letztes.verify(letztes.publicKey); } catch { return false; } })();
    if (!ausgestellt(letztes, letztes) && !selbstsigniert) throw kaputt("kette");
    if (!signaturOk(kette[0])) throw kaputt("signatur");
    const p = nutzlast();
    if ((p.environment ?? p.data?.environment) !== "Xcode") throw kaputt("xcode");
    return p;
  }
  throw kaputt(kette.length === 3 ? "wurzel" : "x5c");
}

const umgebungErlaubt = (u, schalter) => u === "Production" || u === "Sandbox" || (u === "Xcode" && Boolean(schalter?.xcode));

// Transaktion (signedTransactionInfo) fachlich prüfen. kauf=true: zusätzlich gültig (nicht abgelaufen, nicht widerrufen) und mit appAccountToken.
export function transaktionPruefen(tx, { jetzt = Date.now(), schalter = appleTestSchalter(), kauf = true } = {}) {
  const cfg = appleCfg();
  if (!tx || typeof tx !== "object") throw kaputt("transaktion");
  if (tx.bundleId !== cfg.bundleId || tx.productId !== cfg.produktId || tx.type !== "Auto-Renewable Subscription") throw appleFehler(400, AT.produkt, "produkt");
  if (!umgebungErlaubt(tx.environment, schalter)) throw appleFehler(400, AT.umgebung, "umgebung");
  if (tx.inAppOwnershipType !== "PURCHASED") throw appleFehler(400, AT.familie, "familie");
  if (!/^[0-9A-Za-z_-]{1,64}$/.test(String(tx.originalTransactionId ?? ""))) throw kaputt("otx");
  if (kauf) {
    if (tx.revocationDate || !(Number(tx.expiresDate) > jetzt)) throw appleFehler(402, AT.abgelaufen, "abo_abgelaufen");
    if (!uuidNorm(tx.appAccountToken)) throw appleFehler(409, AT.tokenPasstNicht, "token_passt_nicht");
  }
  return tx;
}

// Schlüssel einer Abo-Kette. Xcode-Testkäufe zählen ihre Nummern je Test-Sitzung ab 0 → mit appAccountToken eindeutig machen.
export const otxSchluessel = (tx) => (tx.environment === "Xcode" ? `xcode-${uuidNorm(tx.appAccountToken) || "ohne"}-${tx.originalTransactionId}` : String(tx.originalTransactionId));
// Abo-Kette einem Studio zuordnen (atomar). true = neu zugeordnet, false = gehörte schon diesem Studio. Fremdes Studio → 409 abo_vergeben.
export async function otxBeanspruchen(tx, studioId) {
  const key = "idx/appleotx/" + otxSchluessel(tx);
  if (await store.setNeu(key, studioId)) return true;
  if ((await store.get(key)) !== studioId) throw appleFehler(409, AT.vergeben, "abo_vergeben");
  return false;
}
export const studioIdZuOtx = (tx) => store.get("idx/appleotx/" + otxSchluessel(tx));

function ereignisAnhaengen(a, typ, { subtyp = null, uuid = null } = {}) {
  a.ereignisse = [{ am: now(), typ, subtyp, uuid }, ...(a.ereignisse || [])].slice(0, 20);
}

// Entwurf (status entwurf, abrechnung apple) nach dem Kauf aktivieren. Genau einmal je Abo-Kette (Mails über apple/aktiviert/<otxKey>).
// Ist das Studio inzwischen über das Web aktiv geworden → Admin-Mail (Erstattung über Apple nötig) + 409 schon_aktiv.
export async function appleAktivieren(s, tx, { quelle = "app", renewal = null } = {}) {
  const otxKey = otxSchluessel(tx);
  if (istApple(s) && s.status !== "entwurf" && s.apple?.otxKey === otxKey) return { s, neu: false };
  if (s.status !== "entwurf" || !istApple(s)) {
    await notifyAdmin("Apple-Kauf für ein Studio, das schon über Stripe zahlt – Erstattung über Apple nötig", s, { Transaktion: String(tx.originalTransactionId), Umgebung: tx.environment, Quelle: quelle });
    throw appleFehler(409, AT.schonAktiv, "schon_aktiv");
  }
  const uuid = uuidNorm(tx.appAccountToken) || s.appEntwurf?.appAccountToken;
  const am = now();
  s.status = "einrichtung";
  s.bezahltAm = am;
  s.sandbox = tx.environment !== "Production";
  s.apple = {
    appAccountToken: uuid, originalTransactionId: String(tx.originalTransactionId), otxKey, letzteTransactionId: String(tx.transactionId ?? ""),
    produktId: tx.productId, umgebung: tx.environment, status: "aktiv", laeuftBis: iso(tx.expiresDate),
    autoVerlaengerung: renewal ? renewal.autoRenewStatus === 1 : null,
    gekauftAm: iso(tx.originalPurchaseDate || tx.purchaseDate), storefront: tx.storefront || null,
    preisMilli: Number.isFinite(Number(tx.price)) && tx.price !== null && tx.price !== undefined ? Number(tx.price) : null, waehrung: tx.currency || null,
    aktualisiertAm: am, letzteSignatur: iso(tx.signedDate), ereignisse: [],
  };
  ereignisAnhaengen(s.apple, "aktiviert", { subtyp: quelle });
  const altUuid = s.appEntwurf?.appAccountToken;
  delete s.appEntwurf;
  await saveStudio(s);
  for (const u of new Set([altUuid, uuid].filter(Boolean))) if ((await store.get("idx/appentwurf/" + u)) === s.id) await store.del("idx/appentwurf/" + u);
  await log("apple-abo-gestartet", { studioId: s.id, umgebung: tx.environment, quelle });
  if (await store.setNeu("apple/aktiviert/" + otxKey, { am, studioId: s.id, quelle })) {
    await notify(s, mails.anmeldung(s, { loginUrl: loginLink(s.id), connectUrl: connectUrl(s) }));
    const preis = s.apple.preisMilli !== null ? `${(s.apple.preisMilli / 1000).toFixed(2).replace(".", ",")} ${s.apple.waehrung || ""}`.trim() : "–";
    await notifyAdmin("Neuer Abschluss in der App (Apple-Abo) 🎉" + (s.sandbox ? " [Sandbox/TestFlight, kein Geld]" : ""), s, {
      Umgebung: tx.environment, Produkt: tx.productId, Läuft_bis: s.apple.laeuftBis, Preis: preis, Storefront: s.apple.storefront || "–", Quelle: quelle,
    });
  }
  return { s, neu: true };
}

// Neuen Stand von Apple übernehmen und den Zugang anpassen.
//   status: fester neuer Status (aus einer Apple-Benachrichtigung oder „Abo wieder abschließen“)
//   oeffnen: gesperrten Zugang wieder öffnen, wenn der neue Status aktiv ist (Benachrichtigung, Abo erneuern in der App)
//   auchNachKuendigung: auch ein nach Kündigung beendetes Studio wieder öffnen (neues Abo vom Inhaber)
//   abgleich: Stand aus der App (abo/aktualisieren). Sperrt NIE, öffnet NIE und verschiebt laeuftBis nur nach vorne: Ablauf, Erstattung
//             und Widerruf meldet allein Apple per Benachrichtigung (sonst könnte eine alte, gültig signierte Transaktion ein zahlendes
//             Studio sperren, z. B. eine nicht abgeschlossene Verlängerung aus Transaction.updates).
// Benachrichtigungen kommen in Reihenfolge (apple-benachrichtigung.mjs prüft signedDate). Zusätzlich sperrt ein Sperr-Ereignis zu einer
// anderen, früheren Transaktion nicht, solange ein späterer bezahlter Zeitraum läuft (nur Admin-Mail).
export async function appleStatusAnwenden(s, tx, renewal, ereignis, { status, oeffnen = false, auchNachKuendigung = false, abgleich = false, subtyp, uuid, jetzt = Date.now() } = {}) {
  const a = s.apple || (s.apple = {});
  const bisher = Date.parse(a.laeuftBis || "") || 0;
  const txBis = Number(tx?.expiresDate) || 0;
  const uebernehmen = () => {
    if (tx.transactionId !== undefined) a.letzteTransactionId = String(tx.transactionId);
    if (txBis > 0) a.laeuftBis = iso(txBis);
    if (tx.price !== undefined && tx.price !== null && Number.isFinite(Number(tx.price))) a.preisMilli = Number(tx.price);
    if (tx.currency) a.waehrung = tx.currency;
    if (tx.storefront) a.storefront = tx.storefront;
    if (tx.signedDate) a.letzteSignatur = iso(tx.signedDate);
  };
  if (abgleich) {
    if (tx && txBis > bisher) {
      uebernehmen();
      // Apple hat verlängert (Benachrichtigung fehlt noch) → Zahlungsproblem ist erledigt
      if (a.status === "zahlungsproblem" && !a.gesperrt) a.status = "aktiv";
    }
    a.aktualisiertAm = now();
    ereignisAnhaengen(a, ereignis, { subtyp, uuid });
    await saveStudio(s);
    return s;
  }
  let neu = status || (a.autoVerlaengerung === false ? "gekuendigt" : "aktiv");
  const andereTx = tx && tx.transactionId !== undefined && a.letzteTransactionId && String(tx.transactionId) !== String(a.letzteTransactionId);
  if (SPERR_STATUS.includes(neu) && andereTx && txBis < bisher && bisher > jetzt) {
    ereignisAnhaengen(a, ereignis + ":frueherer-zeitraum", { subtyp, uuid });
    a.aktualisiertAm = now();
    await saveStudio(s);
    await log("apple-ereignis-frueherer-zeitraum", { studioId: s.id, ereignis, neu });
    await notifyAdmin(`Apple: ${neu} für einen früheren Abo-Zeitraum – Zugang bleibt offen, bitte prüfen`, s, { Ereignis: ereignis, Transaktion: String(tx.transactionId ?? "–"), Laeuft_bis: a.laeuftBis || "–" });
    return s;
  }
  if (tx) uebernehmen();
  if (renewal && typeof renewal.autoRenewStatus === "number") a.autoVerlaengerung = renewal.autoRenewStatus === 1;
  // Zahlungsproblem mit Kulanzzeit: Zugang bis zum Ende der Kulanzzeit
  if (status === "zahlungsproblem" && Number(renewal?.gracePeriodExpiresDate) > Date.parse(a.laeuftBis || 0)) a.laeuftBis = iso(renewal.gracePeriodExpiresDate);
  // Ohne Freigabe zum Öffnen bleibt ein gesperrtes Studio gesperrt
  if (!oeffnen && a.gesperrt && !SPERR_STATUS.includes(neu)) neu = a.status;
  a.status = neu;
  a.aktualisiertAm = now();
  ereignisAnhaengen(a, ereignis, { subtyp, uuid });
  await saveStudio(s);
  if (SPERR_STATUS.includes(neu)) await appleZugangSperren(s, neu);
  else if (oeffnen) await appleZugangOeffnen(s, { auchNachKuendigung });
  return s;
}

// Abo beendet (Ablauf, Erstattung, Widerruf): Zahlungslinks und Zahlseite sperren (status beendet → darfKassieren falsch), Login und Daten bleiben.
export async function appleZugangSperren(s, grund) {
  if (s.status === "entwurf" || s.status === "abgebrochen") return false;
  s.apple = { ...(s.apple || {}), status: grund };
  // Nach eigener Kündigung zum Ablauf des Abos: normales Vertragsende (wie der tägliche Job), kein „Abo abgelaufen“
  if (grund === "abgelaufen" && s.status === "gekuendigt" && s.kuendigung && !s.kuendigung.durchAnbieter) {
    s.status = "beendet"; s.vertragsende = s.kuendigung.zum || now();
    await saveStudio(s);
    await notify(s, mails.vertragsende(s));
    await notifyAdmin("Vertrag beendet (Apple-Abo nach Kündigung abgelaufen): Verbindung zum Stripe-Konto trennen, Daten nach Frist löschen", s, {});
    await log("apple-vertragsende", { studioId: s.id });
    return true;
  }
  if (s.status === "beendet") {   // schon beendet (gesperrt oder Vertragsende): nur den Apple-Stand merken
    if (s.apple.gesperrt) s.apple.gesperrt.grund = grund;
    await saveStudio(s);
    return false;
  }
  s.apple.gesperrt = { am: now(), grund, vorherStatus: s.status };
  s.status = "beendet";
  s.vertragsende = now();
  await saveStudio(s);
  await log("apple-zugang-gesperrt", { studioId: s.id, grund });
  await notify(s, mails.appleAboAbgelaufen(s, { grund }));
  await notifyAdmin(`Apple-Abo beendet (${grund}) – Zugang gesperrt, Daten bleiben`, s, { Grund: grund, Laeuft_bis: s.apple.laeuftBis || "–" });
  return true;
}

// Neues Apple-Abo bzw. Erstattung zurückgenommen: Zugang wieder öffnen. Nur wenn das Ende von Apple kam (gesperrt) oder
// – bei auchNachKuendigung – nach einer Kündigung. Eine Löschanfrage bleibt bestehen (Admin entscheidet).
export async function appleZugangOeffnen(s, { auchNachKuendigung = false } = {}) {
  if (s.status !== "beendet" || !s.apple || (!s.apple.gesperrt && !auchNachKuendigung)) return false;
  if (s.kuendigung) { s.kuendigungHistorie = [...(s.kuendigungHistorie || []), { ...s.kuendigung, endeDurchNeuesAbo: now() }]; s.kuendigung = null; }
  s.status = s.goLiveAt ? "live" : "einrichtung";
  s.vertragsende = null;
  delete s.apple.gesperrt;
  await saveStudio(s);
  await log("apple-zugang-geoeffnet", { studioId: s.id });
  await notifyAdmin("Apple-Abo wieder aktiv – Zugang geöffnet", s, { Laeuft_bis: s.apple.laeuftBis || "–", Loeschanfrage: s.loeschAnfrage ? "offen – bitte entscheiden" : "–" });
  return true;
}

// Apple hat verlängert, obwohl das Studio bei Tattoofin gekündigt hat: bezahlten Zeitraum nutzbar machen (Kündigung zum neuen Ablauf).
// Mit Löschanfrage (Konto kündigen und löschen in der App) NICHT: Kündigungs- und Löschdatum bleiben fest (Apple 5.1.1(v), das in der App
// angezeigte Datum stimmt weiter). Das Studio bekommt den Hinweis, bei Apple zu kündigen und die Erstattung bei Apple zu beantragen.
export async function kuendigungVerlaengern(s) {
  const zum = s.apple?.laeuftBis;
  if (!zum || !s.kuendigung || s.kuendigung.durchAnbieter || s.kuendigung.garantie || s.apple?.gesperrt) return false;
  if (!["gekuendigt", "beendet"].includes(s.status) || Date.parse(zum) <= Date.parse(s.kuendigung.zum || 0)) return false;
  if (s.loeschAnfrage) {
    if (s.loeschAnfrage.appleVerlaengertGemeldet === zum) return false;
    s.loeschAnfrage.appleVerlaengertGemeldet = zum;
    await saveStudio(s);
    await log("apple-verlaengert-trotz-loeschung", { studioId: s.id, zum });
    await notify(s, mails.appleVerlaengertTrotzLoeschung(s, { zum: s.kuendigung.zum, loeschungAb: s.loeschAnfrage.loeschungAb }));
    await notifyAdmin("Apple hat verlängert, obwohl das Studio die Löschung beantragt hat – Löschung bleibt wie geplant, Studio informiert", s, { Kuendigung_zum: s.kuendigung.zum || "–", Loeschung_ab: s.loeschAnfrage.loeschungAb || "–", Apple_bis: zum });
    return false;
  }
  s.kuendigung = { ...s.kuendigung, zum, erinnert: null, verlaengertDurchApple: now() };
  if (s.status === "beendet") { s.status = "gekuendigt"; s.vertragsende = null; }
  await saveStudio(s);
  await log("apple-verlaengert-trotz-kuendigung", { studioId: s.id, zum });
  await notify(s, mails.appleVerlaengertTrotzKuendigung(s, { zum }));
  return true;
}
