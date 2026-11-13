// Mitteilungen (Push) an die Tattoofin-App über Apple APNs (HTTP/2, Token-Auth mit .p8-Schlüssel).
// STAND 13.11.2026: Echt-Versand wartet auf Apple-Team-ID und APNs-Schlüssel. Ohne Schlüssel wird nichts gesendet,
// nur protokolliert (log „push-uebersprungen“, grund „apns-nicht-eingerichtet“). Android (FCM) fehlt noch: grund „fcm-fehlt“.
// Umgebung (Netlify):
//   APNS_KEY_P8 (PEM-Inhalt, „\n“ erlaubt) oder APNS_KEY_P8_BASE64, APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID (Standard de.tattoofin.app)
//   APNS_HOST_SANDBOX / APNS_HOST_PRODUCTION nur für Tests (Standard api.sandbox.push.apple.com bzw. api.push.apple.com;
//   „http://localhost:1234“ = HTTP/2 ohne TLS für den Nachbau in dev/app-api.mjs)
// Die Funktionen werfen nie einen Fehler: Ein Problem beim Push darf nie eine Zahlung oder einen Webhook stören.
import crypto from "node:crypto";
import http2 from "node:http2";
import { geraeteVon, geraetSpeichern } from "./app-geraete.mjs";
import { log, store } from "./store.mjs";

const ZEITLIMIT_MS = 5000;
const JWT_CACHE_MS = 50 * 60e3;

export function apnsKonfig() {
  const roh = process.env.APNS_KEY_P8 ? String(process.env.APNS_KEY_P8).replace(/\\n/g, "\n")
    : process.env.APNS_KEY_P8_BASE64 ? Buffer.from(process.env.APNS_KEY_P8_BASE64, "base64").toString("utf8") : "";
  const keyId = String(process.env.APNS_KEY_ID || "").trim(), teamId = String(process.env.APNS_TEAM_ID || "").trim();
  const bundleId = String(process.env.APNS_BUNDLE_ID || "de.tattoofin.app").trim();
  if (!roh.includes("PRIVATE KEY") || !keyId || !teamId || !bundleId) return null;
  return {
    key: roh, keyId, teamId, bundleId,
    hostSandbox: process.env.APNS_HOST_SANDBOX || "api.sandbox.push.apple.com",
    hostProduction: process.env.APNS_HOST_PRODUCTION || "api.push.apple.com",
  };
}
export const apnsAktiv = () => Boolean(apnsKonfig());

// ES256-JWT für APNs, 50 Minuten zwischengespeichert (Apple erlaubt höchstens alle 20 Minuten ein neues, gültig 60 Minuten)
let jwtCache = null;
export function apnsJwt(k, jetzt = Date.now()) {
  const merk = `${k.keyId}|${k.teamId}`;
  if (jwtCache && jwtCache.merk === merk && jetzt - jwtCache.am < JWT_CACHE_MS) return jwtCache.jwt;
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const daten = `${b64({ alg: "ES256", kid: k.keyId })}.${b64({ iss: k.teamId, iat: Math.floor(jetzt / 1000) })}`;
  const sig = crypto.sign("sha256", Buffer.from(daten), { key: crypto.createPrivateKey(k.key), dsaEncoding: "ieee-p1363" }).toString("base64url");
  jwtCache = { merk, am: jetzt, jwt: `${daten}.${sig}` };
  return jwtCache.jwt;
}
export const jwtCacheLeeren = () => { jwtCache = null; };

const ursprung = (host) => (/^https?:\/\//.test(host) ? host : "https://" + host);

// Eine Mitteilung an einen Geräte-Token. Ergebnis { status, grund } (status 0 = Netzwerk/Zeitlimit)
function sende(session, k, token, payload, collapseId) {
  return new Promise((ok) => {
    let fertig = false;
    const ende = (r) => { if (!fertig) { fertig = true; ok(r); } };
    try {
      const headers = {
        ":method": "POST", ":path": `/3/device/${token}`, authorization: `bearer ${apnsJwt(k)}`,
        "apns-topic": k.bundleId, "apns-push-type": "alert", "apns-priority": "10", "content-type": "application/json",
        ...(collapseId ? { "apns-collapse-id": String(collapseId).slice(0, 64) } : {}),
      };
      const req = session.request(headers);
      const zeit = setTimeout(() => { try { req.close(); } catch { /* egal */ } ende({ status: 0, grund: "zeitlimit" }); }, ZEITLIMIT_MS);
      let status = 0, text = "";
      req.on("response", (h) => { status = Number(h[":status"]) || 0; });
      req.setEncoding("utf8");
      req.on("data", (c) => { text += c; });
      req.on("end", () => { clearTimeout(zeit); let grund = ""; try { grund = JSON.parse(text || "{}").reason || ""; } catch { /* leer */ } ende({ status, grund }); });
      req.on("error", (e) => { clearTimeout(zeit); ende({ status: 0, grund: e.code || e.message }); });
      req.end(JSON.stringify(payload));
    } catch (e) { ende({ status: 0, grund: e.message }); }
  });
}

function verbinde(host) {
  return new Promise((ok) => {
    try {
      const session = http2.connect(ursprung(host));
      const zeit = setTimeout(() => { try { session.destroy(); } catch { /* egal */ } ok(null); }, ZEITLIMIT_MS);
      session.once("connect", () => { clearTimeout(zeit); ok(session); });
      session.once("error", () => { clearTimeout(zeit); try { session.destroy(); } catch { /* egal */ } ok(null); });
    } catch { ok(null); }
  });
}

// Antwort auswerten: ungültige Tokens entfernen, Schlüssel-Probleme dem Admin melden (höchstens alle 30 Minuten)
async function auswerten(g, r) {
  if (r.status === 200) return true;
  if (r.status === 410 || (r.status === 400 && ["BadDeviceToken", "DeviceTokenNotForTopic"].includes(r.grund))) {
    g.push = null;
    await geraetSpeichern(g);
    await log("push-token-entfernt", { studioId: g.studioId, geraetId: g.id, status: r.status, grund: r.grund });
    return false;
  }
  if (r.status === 403 && /ProviderToken/.test(r.grund)) {
    jwtCacheLeeren();
    const key = "rl/apns-schluessel";
    const zuletzt = await store.get(key);
    if (!zuletzt?.am || Date.now() - new Date(zuletzt.am).getTime() > 30 * 60e3) {
      await store.set(key, { am: new Date().toISOString() });
      const { notifyAdmin } = await import("./domain.mjs");
      await notifyAdmin("⚠️ APNs lehnt den Push-Schlüssel ab (Key-ID/Team-ID/.p8 prüfen)", null, { Grund: r.grund, Status: r.status });
    }
  }
  await log("push-fehler", { studioId: g.studioId, geraetId: g.id, status: r.status, grund: String(r.grund || "").slice(0, 80) });
  return false;
}

// An mehrere Geräte senden. nachricht = { titel, text, textMitName?, daten: { typ, … }, thread, collapseId }
async function anGeraete(geraete, nachricht, ereignis) {
  const k = apnsKonfig();
  const ios = geraete.filter((g) => g.platform === "ios" && g.push?.token);
  const android = geraete.filter((g) => g.platform === "android" && g.push?.token);
  if (android.length) await log("push-uebersprungen", { grund: "fcm-fehlt", ereignis, anzahl: android.length, studioId: android[0].studioId });
  if (!ios.length) return { gesendet: 0 };
  if (!k) { await log("push-uebersprungen", { grund: "apns-nicht-eingerichtet", ereignis, anzahl: ios.length, studioId: ios[0].studioId }); return { gesendet: 0, grund: "apns-nicht-eingerichtet" }; }
  let gesendet = 0;
  for (const umgebung of ["sandbox", "production"]) {
    const gruppe = ios.filter((g) => (g.push.umgebung === "sandbox" ? "sandbox" : "production") === umgebung);
    if (!gruppe.length) continue;
    const session = await verbinde(umgebung === "sandbox" ? k.hostSandbox : k.hostProduction);
    if (!session) { await log("push-fehler", { grund: "verbindung", umgebung, ereignis }); continue; }
    try {
      const ergebnisse = await Promise.all(gruppe.map(async (g) => {
        const payload = {
          aps: { alert: { title: nachricht.titel, body: g.kundennameInMitteilung && nachricht.textMitName ? nachricht.textMitName : nachricht.text }, sound: "default", "thread-id": nachricht.thread },
          ...nachricht.daten,
        };
        return auswerten(g, await sende(session, k, g.push.token, payload, nachricht.collapseId));
      }));
      gesendet += ergebnisse.filter(Boolean).length;
    } finally { try { session.close(); } catch { /* egal */ } }
  }
  if (gesendet) await log("push-gesendet", { ereignis, anzahl: gesendet, studioId: ios[0].studioId });
  return { gesendet };
}

// An alle Geräte eines Studios, die Mitteilungen dieser Art wollen (art: "zahlungen" | "auszahlungen"). Wirft nie.
export async function pushAnStudio(s, art, nachricht) {
  try {
    if (!s?.id) return { gesendet: 0 };
    const geraete = (await geraeteVon(s.id)).filter((g) => g.mitteilungen?.[art] !== false);
    return await anGeraete(geraete, nachricht, art);
  } catch (e) {
    console.error("[push]", e.message);
    try { await log("push-fehler", { grund: String(e.message).slice(0, 120), ereignis: art, studioId: s?.id }); } catch { /* egal */ }
    return { gesendet: 0, fehler: true };
  }
}

// Test-Mitteilung an genau dieses Gerät (App: Einstellungen → „Test senden“)
export async function pushTest(g) {
  try {
    if (!g?.push?.token) return { gesendet: false, grund: "kein-token" };
    if (g.platform !== "ios") { await log("push-uebersprungen", { grund: "fcm-fehlt", ereignis: "test", studioId: g.studioId }); return { gesendet: false, grund: "fcm-fehlt" }; }
    if (!apnsAktiv()) { await log("push-uebersprungen", { grund: "apns-nicht-eingerichtet", ereignis: "test", studioId: g.studioId }); return { gesendet: false, grund: "apns-nicht-eingerichtet" }; }
    const r = await anGeraete([g], { titel: "Tattoofin", text: "Mitteilungen funktionieren. So meldet sich die App bei neuen Zahlungen.", daten: { typ: "test" }, thread: "test", collapseId: "test-" + g.id }, "test");
    return r.gesendet ? { gesendet: true } : { gesendet: false, grund: "apns-fehler" };
  } catch (e) { return { gesendet: false, grund: "apns-fehler" }; }
}

// Höchstens ms warten (Webhook/Zahlung nie verlangsamen); der Push läuft im Hintergrund weiter, wirft aber nie
export const mitZeitlimit = (p, ms = 3000) => Promise.race([p, new Promise((ok) => setTimeout(() => ok({ zeitlimit: true }), ms).unref?.())]);

// ---- Texte ----
const euro = (c) => (c / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const tagMonat = (ankunft) => {
  const d = typeof ankunft === "number" ? new Date(ankunft * 1000) : new Date(ankunft);
  // „15.11.“ (de-DE liefert bei Tag + Monat schon den Punkt am Ende)
  const t = d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", timeZone: "Europe/Berlin" });
  return t.endsWith(".") ? t : t + ".";
};
export function nachrichtZahlung(z) {
  const gutschein = z.art === "gutschein";
  const was = gutschein ? (z.gutschein?.empfaenger ? `Gutschein für ${z.gutschein.empfaenger}` : "Wertgutschein")
    : `${z.art === "anzahlung" || z.anzahlung ? "Anzahlung " : ""}${z.beschreibung || "Tattoo-Projekt"}`;
  const text = `${euro(z.betragCent)} · ${was}`.slice(0, 160);
  const vorname = String(z.kunde || "").trim().split(/\s+/)[0];
  return {
    titel: gutschein ? "Gutschein verkauft" : "Zahlung eingegangen", text, textMitName: vorname ? `${text} · ${vorname}`.slice(0, 180) : null,
    daten: { typ: "zahlung", zahlungId: z.id }, thread: "zahlungen", collapseId: z.id,
  };
}
export function nachrichtAuszahlung(po) {
  const fehlgeschlagen = po.status === "failed";
  return {
    titel: fehlgeschlagen ? "Auszahlung fehlgeschlagen" : "Auszahlung unterwegs",
    text: fehlgeschlagen ? "Bitte prüfe deine Bankdaten im Dashboard." : `${euro(po.amount)} kommen voraussichtlich am ${tagMonat(po.arrival_date || Date.now() / 1000)} auf dein Konto.`,
    daten: { typ: "auszahlung", payoutId: po.id }, thread: "auszahlungen", collapseId: po.id,
  };
}
