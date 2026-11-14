// App Store Server Notifications V2 (Apple → Tattoofin). In App Store Connect als Production- UND Sandbox-URL eintragen:
//   https://tattoofin.de/api/apple/benachrichtigung   (Version 2)
// POST { signedPayload } → 200 { ok: true } (auch bei „doppelt“ und „ignoriert“), 400 nur bei ungültiger Signatur/Form (Apple versucht es dann erneut).
// Ablauf: Signatur prüfen (Apple Root CA - G3, _lib/apple.mjs) → Bundle/Umgebung/App-ID → Doppelschutz apple/notif/<notificationUUID>
// → signedTransactionInfo + signedRenewalInfo prüfen → Studio über idx/appleotx/<otx> (bei SUBSCRIBED/OFFER_REDEEMED auch über den Entwurf
// idx/appentwurf/<appAccountToken>) → Wirkung je notificationType. Ohne Studio: apple/offen/<otx> + Admin-Mail.
//   SUBSCRIBED, OFFER_REDEEMED     Entwurf aktivieren bzw. aktiv + Zugang öffnen
//   DID_RENEW                      laeuftBis neu, aktiv, Zugang öffnen; nach Kündigung bei Tattoofin: Vertrag bis zum neuen Ablauf + Mail
//   DID_CHANGE_RENEWAL_STATUS      autoVerlaengerung an/aus (Status aktiv/gekuendigt, Zugang bis laeuftBis)
//   DID_FAIL_TO_RENEW              zahlungsproblem (Zugang bis Ablauf bzw. Ende der Kulanzzeit), Admin-Mail
//   EXPIRED, GRACE_PERIOD_EXPIRED  abgelaufen → Zugang sperren        REFUND → erstattet → sperren + Admin-Mail      REVOKE → widerrufen → sperren
//   REFUND_REVERSED                wieder aktiv, wenn noch nicht abgelaufen      RENEWAL_EXTENDED/RENEWAL_EXTENSION → laeuftBis neu
//   PRICE_INCREASE, CONSUMPTION_REQUEST, REFUND_DECLINED → Log + Admin-Mail      TEST → nur Log
import { appleCfg, appleTestSchalter, istApple } from "./_lib/config.mjs";
import { json, body, now, handler } from "./_lib/util.mjs";
import { store, getStudio, log } from "./_lib/store.mjs";
import { notifyAdmin } from "./_lib/domain.mjs";
import { jwsPruefen, transaktionPruefen, otxBeanspruchen, studioIdZuOtx, otxSchluessel, appleAktivieren, appleStatusAnwenden, kuendigungVerlaengern, uuidNorm } from "./_lib/apple.mjs";

const ok = (extra = {}) => json({ ok: true, ...extra }, 200, { "cache-control": "no-store" });
const kaputt = (error) => json({ error }, 400, { "cache-control": "no-store" });
const HINWEIS_ADMIN = { PRICE_INCREASE: "Apple: Preiserhöhung (Zustimmung des Studios)", CONSUMPTION_REQUEST: "Apple: Erstattungsanfrage eines Studios (wir antworten nicht)", REFUND_DECLINED: "Apple: Erstattung abgelehnt" };

async function verarbeiten(payload, notifKey) {
  const typ = String(payload.notificationType || ""), subtyp = payload.subtype ? String(payload.subtype) : null, uuid = String(payload.notificationUUID || "");
  const data = payload.data || {};
  if (typ === "TEST") { await log("apple-benachrichtigung-test", { umgebung: data.environment }); return { ergebnis: "test" }; }
  const schalter = appleTestSchalter();
  const tx = data.signedTransactionInfo ? jwsPruefen(data.signedTransactionInfo, { schalter }) : null;
  const renewal = data.signedRenewalInfo ? jwsPruefen(data.signedRenewalInfo, { schalter }) : null;
  if (!tx) { await log("apple-benachrichtigung-ohne-kauf", { typ, subtyp }); return { ergebnis: "ignoriert" }; }
  // Gleiche Prüfungen wie beim Kauf, aber ohne Ablauf/Widerruf (die sind hier der Inhalt). Fremdes Produkt → ignorieren (sonst wiederholt Apple endlos).
  try { transaktionPruefen(tx, { kauf: false, schalter }); }
  catch (e) { await log("apple-benachrichtigung-ignoriert", { typ, grund: e.fehlerCode || e.message }); return { ergebnis: "ignoriert" }; }

  const otx = String(tx.originalTransactionId);
  let sid = await studioIdZuOtx(tx);
  let s = sid ? await getStudio(sid) : null;
  if (!s && ["SUBSCRIBED", "OFFER_REDEEMED"].includes(typ)) {
    const u = uuidNorm(tx.appAccountToken);
    const eid = u ? await store.get("idx/appentwurf/" + u) : null;
    const e = eid ? await getStudio(eid) : null;
    if (e && e.status === "entwurf" && istApple(e) && e.appEntwurf?.appAccountToken === u) s = e;
  }
  if (!s) {
    await store.set("apple/offen/" + otxSchluessel(tx), { am: now(), typ, subtyp, uuid, umgebung: tx.environment, appAccountToken: uuidNorm(tx.appAccountToken), ablauf: tx.expiresDate || null });
    await notifyAdmin("Apple-Abo ohne Studio", null, { Ereignis: [typ, subtyp].filter(Boolean).join(" / "), Transaktion: otx, Umgebung: tx.environment, Hinweis: "Gespeichert unter apple/offen/. Studio über die App-Kennung (appAccountToken) zuordnen oder Erstattung über Apple." });
    await log("apple-benachrichtigung-ohne-studio", { typ, otx });
    return { ergebnis: "ohne-studio" };
  }
  if (!istApple(s)) {
    await notifyAdmin("Apple-Ereignis für ein Studio, das nicht über Apple zahlt – bitte prüfen", s, { Ereignis: [typ, subtyp].filter(Boolean).join(" / "), Transaktion: otx });
    return { ergebnis: "nicht-apple" };
  }
  // Ereignis gehört zu einer früheren Abo-Kette dieses Studios (Studio hat inzwischen neu abgeschlossen) → nur protokollieren
  if (s.status !== "entwurf" && s.apple?.otxKey && s.apple.otxKey !== otxSchluessel(tx)) {
    await log("apple-benachrichtigung-alte-kette", { studioId: s.id, typ });
    return { ergebnis: "alte-kette" };
  }
  const opt = { subtyp, uuid };
  const ereignis = "benachrichtigung:" + typ;
  switch (typ) {
    case "SUBSCRIBED":
    case "OFFER_REDEEMED":
      if (s.status === "entwurf") {
        await otxBeanspruchen(tx, s.id);
        await appleAktivieren(s, tx, { quelle: "benachrichtigung", renewal });
      } else await appleStatusAnwenden(s, tx, renewal, ereignis, { ...opt, status: "aktiv", oeffnen: true, auchNachKuendigung: true });
      break;
    case "DID_RENEW":
      await appleStatusAnwenden(s, tx, renewal, ereignis, { ...opt, status: "aktiv", oeffnen: true });
      await kuendigungVerlaengern(s);
      break;
    case "DID_CHANGE_RENEWAL_STATUS": {
      const an = subtyp === "AUTO_RENEW_ENABLED" || (subtyp !== "AUTO_RENEW_DISABLED" && renewal?.autoRenewStatus === 1);
      const r = { ...(renewal || {}), autoRenewStatus: an ? 1 : 0 };
      const status = s.apple?.status === "zahlungsproblem" ? "zahlungsproblem" : an ? "aktiv" : "gekuendigt";
      await appleStatusAnwenden(s, tx, r, ereignis, { ...opt, status });
      break;
    }
    case "DID_FAIL_TO_RENEW":
      await appleStatusAnwenden(s, tx, renewal, ereignis, { ...opt, status: "zahlungsproblem" });
      await notifyAdmin("Apple: Verlängerung fehlgeschlagen (Zahlungsproblem beim Studio)", s, { Zugang_bis: s.apple.laeuftBis || "–", Kulanzzeit: subtyp === "GRACE_PERIOD" ? "ja" : "nein" });
      break;
    case "EXPIRED":
    case "GRACE_PERIOD_EXPIRED":
      await appleStatusAnwenden(s, tx, renewal, ereignis, { ...opt, status: "abgelaufen" });
      break;
    case "REFUND":
      await appleStatusAnwenden(s, tx, renewal, ereignis, { ...opt, status: "erstattet" });
      await notifyAdmin("Apple hat ein Abo erstattet", s, { Transaktion: otx, Grund: tx.revocationReason ?? "–" });
      break;
    case "REVOKE":
      await appleStatusAnwenden(s, tx, renewal, ereignis, { ...opt, status: "widerrufen" });
      break;
    case "REFUND_REVERSED":
      if (Number(tx.expiresDate) > Date.now()) await appleStatusAnwenden(s, { ...tx, revocationDate: undefined }, renewal, ereignis, { ...opt, status: "aktiv", oeffnen: true });
      else await appleStatusAnwenden(s, tx, renewal, ereignis, { ...opt, status: "abgelaufen" });
      break;
    case "RENEWAL_EXTENDED":
    case "RENEWAL_EXTENSION":
      await appleStatusAnwenden(s, tx, renewal, ereignis, { ...opt, status: s.apple?.status || "aktiv" });
      break;
    default:
      if (HINWEIS_ADMIN[typ]) await notifyAdmin(HINWEIS_ADMIN[typ], s, { Ereignis: [typ, subtyp].filter(Boolean).join(" / "), Transaktion: otx });
      await log("apple-benachrichtigung-info", { studioId: s.id, typ, subtyp });
      return { ergebnis: "protokolliert", studioId: s.id };
  }
  await log("apple-benachrichtigung", { studioId: s.id, typ, subtyp, status: s.apple?.status, notif: notifKey.slice(12) });
  return { ergebnis: "verarbeitet", studioId: s.id };
}

export default handler(async (req) => {
  if (req.method !== "POST") return json({ error: "Methode nicht erlaubt" }, 405);
  const b = await body(req);
  if (typeof b.signedPayload !== "string") return kaputt("signedPayload fehlt");
  let payload;
  try { payload = jwsPruefen(b.signedPayload); }
  catch (e) { await log("apple-benachrichtigung-ungueltig", { grund: e.grund || e.message }); return kaputt("Signatur ungültig"); }
  const data = payload.data || {};
  const cfg = appleCfg(), schalter = appleTestSchalter();
  if (data.bundleId !== cfg.bundleId) return kaputt("Falsche App");
  if (!(data.environment === "Production" || data.environment === "Sandbox" || (data.environment === "Xcode" && schalter.xcode))) return kaputt("Falsche Umgebung");
  if (data.environment === "Production" && cfg.appId && String(data.appAppleId) !== String(cfg.appId)) return kaputt("Falsche App-ID");
  const uuid = String(payload.notificationUUID || "");
  if (!/^[0-9A-Za-z-]{8,64}$/.test(uuid)) return kaputt("notificationUUID fehlt");
  // Doppelschutz: jede Benachrichtigung genau einmal. Bei einem Fehler wieder freigeben, damit Apple erneut senden kann.
  const notifKey = "apple/notif/" + uuid;
  if (!(await store.setNeu(notifKey, { am: now(), typ: payload.notificationType || "", subtyp: payload.subtype || null }))) return ok({ doppelt: true });
  try {
    return ok(await verarbeiten(payload, notifKey));
  } catch (e) {
    if (e.fehlerCode === "jws_ungueltig") { await store.del(notifKey); await log("apple-benachrichtigung-ungueltig", { grund: e.grund || e.message, typ: payload.notificationType }); return kaputt("Signatur ungültig"); }
    // Fachlich abgelehnt (z. B. Abo gehört schon zu einem anderen Studio): melden, aber nicht wiederholen lassen
    if (e.status && e.status < 500) {
      await log("apple-benachrichtigung-abgelehnt", { typ: payload.notificationType, code: e.fehlerCode || "", text: e.message });
      await notifyAdmin("Apple-Benachrichtigung konnte nicht zugeordnet werden – bitte prüfen", null, { Ereignis: String(payload.notificationType || ""), Grund: e.message });
      return ok({ ergebnis: "abgelehnt" });
    }
    await store.del(notifKey);
    throw e;
  }
});

export const config = { path: "/api/apple/benachrichtigung" };
