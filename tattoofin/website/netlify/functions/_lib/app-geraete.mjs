// Geräte der Tattoofin-App für Studios (seit 13.11.2026, zuerst nur iPhone; Android später über dasselbe Feld „platform“).
// Anmeldung per E-Mail-Code (netlify/functions/app.mjs). Jedes angemeldete Gerät bekommt ein eigenes Token:
//   Authorization: Bearer tfa_<geraetId>.<geheimnis>      geraetId = "ag_" + 12 Zeichen base64url, geheimnis = 32 Zufallsbytes base64url
// Gespeichert wird nur sha256(geheimnis) (hex). Schlüssel:
//   appgeraet/<studioId>/<geraetId>   Gerät (Name, Modell, Rolle, Push-Token, Mitteilungen, sv = Sitzungsversion beim Anmelden)
//   idx/appgeraet/<geraetId>          -> studioId
// Ein Token gilt nicht mehr, wenn das Gerät widerrufen ist, die Sitzungsversion des Studios hochgezählt wurde („Auf allen Geräten
// abmelden“), die Adresse weder Haupt- noch Team-Adresse ist, 180 Tage keine Nutzung war oder das Studio fehlt (siehe auth.mjs appStudio).
import crypto from "node:crypto";
import { store, normEmail, log } from "./store.mjs";

export const APP_TAGE = 180;            // ohne Nutzung verfällt das Token
export const MAX_GERAETE = 10;          // pro Studio; beim 11. wird das am längsten ungenutzte Gerät abgemeldet
export const PLATTFORMEN = ["ios", "android"];
const ZULETZT_SCHREIBEN_MS = 3600e3;    // zuletztAm höchstens stündlich speichern (spart Schreibvorgänge)

const sha = (x) => crypto.createHash("sha256").update(String(x)).digest("hex");
export const neueGeraetId = () => "ag_" + crypto.randomBytes(9).toString("base64url");
const schluessel = (studioId, geraetId) => `appgeraet/${studioId}/${geraetId}`;

// ---- Token ----
export function tokenErzeugen(geraetId) {
  const geheimnis = crypto.randomBytes(32).toString("base64url");
  return { token: `tfa_${geraetId}.${geheimnis}`, tokenHash: sha(geheimnis) };
}
export function tokenZerlegen(token) {
  const m = /^tfa_(ag_[A-Za-z0-9_-]{12})\.([A-Za-z0-9_-]{43})$/.exec(String(token || ""));
  return m ? { geraetId: m[1], geheimnis: m[2] } : null;
}
// Zeitkonstanter Vergleich des Hashes
export function tokenPruefen(geraet, geheimnis) {
  if (!geraet?.tokenHash || !geheimnis) return false;
  const a = Buffer.from(sha(geheimnis), "hex"), b = Buffer.from(String(geraet.tokenHash), "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ---- Rolle ----
// inhaber = Hauptadresse des Studios, team = hinterlegte Team-Adresse, sonst null (dann gilt das Token nicht)
export function rolleFuer(s, email) {
  const n = normEmail(email);
  if (!s || !n) return null;
  if (s.email && normEmail(s.email) === n) return "inhaber";
  if ((s.teamEmails || []).some((t) => normEmail(t) === n)) return "team";
  return null;
}

// „l•••••@studio.de“
export const maskiereEmail = (e) => String(e || "").replace(/^(.)[^@]*(@.*)$/, "$1•••••$2");

// ---- Laden / Speichern ----
export async function geraetLaden(geraetId) {
  if (!/^ag_[A-Za-z0-9_-]{12}$/.test(String(geraetId || ""))) return null;
  const sid = await store.get("idx/appgeraet/" + geraetId);
  if (!sid) return null;
  return store.get(schluessel(sid, geraetId));
}
export const geraetSpeichern = (g) => store.set(schluessel(g.studioId, g.id), g);

// Alle Geräte eines Studios (Standard: nur aktive), zuletzt genutzte zuerst
export async function geraeteVon(studioId, { auchWiderrufen = false } = {}) {
  const alle = await store.all(`appgeraet/${studioId}/`);
  return alle.filter((g) => auchWiderrufen || !g.widerrufenAm)
    .sort((a, b) => (b.zuletztAm || b.createdAt || "").localeCompare(a.zuletztAm || a.createdAt || ""));
}

export async function geraetAnlegen(s, { email, rolle, platform, name, modell, osVersion, appVersion }) {
  // Grenze: höchstens MAX_GERAETE aktive Geräte, das am längsten ungenutzte wird abgemeldet
  const aktiv = await geraeteVon(s.id);
  for (const alt of aktiv.slice(MAX_GERAETE - 1)) {
    await geraetWiderrufen(alt, "verdraengt");
    await log("app-geraet-verdraengt", { studioId: s.id, geraetId: alt.id });
  }
  const id = neueGeraetId();
  const { token, tokenHash } = tokenErzeugen(id);
  const jetzt = new Date().toISOString();
  const g = {
    id, studioId: s.id, email: normEmail(email), rolle, platform,
    name: String(name || "").trim().slice(0, 60) || (platform === "android" ? "Android-Gerät" : "iPhone"),
    modell: String(modell || "").trim().slice(0, 40), osVersion: String(osVersion || "").trim().slice(0, 20), appVersion: String(appVersion || "").trim().slice(0, 30),
    tokenHash, sv: s.sessionVersion || 0, createdAt: jetzt, zuletztAm: jetzt,
    mitteilungen: { zahlungen: true, auszahlungen: true }, kundennameInMitteilung: false, push: null,
  };
  await geraetSpeichern(g);
  await store.set("idx/appgeraet/" + id, s.id);
  return { geraet: g, token };
}

// Abmelden: Token und Push-Token sind danach weg. Der Eintrag bleibt kurz als Protokoll (die täglichen Jobs löschen ihn nach 30 Tagen).
export async function geraetWiderrufen(g, grund = "abgemeldet") {
  if (!g || g.widerrufenAm) return g;
  g.widerrufenAm = new Date().toISOString();
  g.widerrufGrund = grund;
  delete g.tokenHash;
  g.push = null;
  await geraetSpeichern(g);
  return g;
}

// Alle aktiven Geräte eines Studios widerrufen, auf die filter zutrifft (z. B. eine entfernte Team-Adresse)
export async function geraeteWiderrufen(studioId, filter, grund) {
  let n = 0;
  for (const g of await geraeteVon(studioId)) if (filter(g)) { await geraetWiderrufen(g, grund); n++; }
  return n;
}

// Nutzung vermerken (höchstens einmal pro Stunde schreiben)
export async function nutzungVermerken(g, jetzt = Date.now()) {
  if (g.zuletztAm && jetzt - new Date(g.zuletztAm).getTime() < ZULETZT_SCHREIBEN_MS) return false;
  g.zuletztAm = new Date(jetzt).toISOString();
  await geraetSpeichern(g);
  return true;
}
export const zuLangeUngenutzt = (g, jetzt = Date.now()) => jetzt - new Date(g.zuletztAm || g.createdAt).getTime() > APP_TAGE * 864e5;

// Ausgabe an die App. Die Adresse ist maskiert, außer der Inhaber schaut (oder es ist die eigene Adresse).
export function geraetOeffentlich(g, { aktuell = null } = {}) {
  const sichtVoll = aktuell && (aktuell.rolle === "inhaber" || normEmail(aktuell.email) === g.email);
  return {
    id: g.id, name: g.name, modell: g.modell || "", platform: g.platform, email: sichtVoll ? g.email : maskiereEmail(g.email), rolle: g.rolle,
    createdAt: g.createdAt, zuletztAm: g.zuletztAm || g.createdAt,
    mitteilungen: { zahlungen: g.mitteilungen?.zahlungen !== false, auszahlungen: g.mitteilungen?.auszahlungen !== false },
    kundennameInMitteilung: Boolean(g.kundennameInMitteilung),
    push: Boolean(g.push?.token), diesesGeraet: Boolean(aktuell && aktuell.geraetId === g.id),
  };
}

// Aufräumen (tägliche Jobs): widerrufene Geräte nach 30 Tagen und Geräte ohne Nutzung seit 180 Tagen löschen (Datenschutzerklärung)
export async function geraeteAufraeumen(jetzt = Date.now()) {
  const out = [];
  for (const k of await store.list("appgeraet/")) {
    const g = await store.get(k);
    if (!g) continue;
    const weg = g.widerrufenAm ? jetzt - new Date(g.widerrufenAm).getTime() > 30 * 864e5 : zuLangeUngenutzt(g, jetzt);
    if (!weg) continue;
    await store.del(k);
    await store.del("idx/appgeraet/" + g.id);
    out.push(["app-geraet-geloescht", g.studioId, g.id]);
  }
  return out;
}
