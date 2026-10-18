// Login per Magic Link (kein Passwort) + signiertes Session-Cookie. Admin über ADMIN_TOKEN.
import crypto from "node:crypto";
import { SECRETS, CFG } from "./config.mjs";
import { getStudio, store, normEmail } from "./store.mjs";
import { randomBytes } from "node:crypto";

// Vorschau: Sitzungs-Geheimnis zufällig erzeugen und im (eigenen) Vorschau-Speicher ablegen, statt einen Schlüssel zu hinterlegen
export async function vorschauVorbereiten() {
  if (!CFG.vorschau || process.env.SESSION_SECRET) return;
  if (SECRETS.sessionSecret && SECRETS.sessionSecret.startsWith("vorschau-")) return;
  let m = await store.get("meta/session-secret");
  if (!m?.v) { m = { v: "vorschau-" + randomBytes(32).toString("hex") }; await store.set("meta/session-secret", m); }
  SECRETS.sessionSecret = m.v;
}

const COOKIE = "tf_session";

export function sign(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRETS.sessionSecret).update(data).digest("base64url");
  return data + "." + sig;
}

// abgelaufenOk: auch abgelaufene (aber echt signierte) Token zurückgeben – nur für „neuen Link anfordern“
export function verify(token, type, { abgelaufenOk = false } = {}) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [data, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", SECRETS.sessionSecret).update(data).digest("base64url");
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const p = JSON.parse(Buffer.from(data, "base64url").toString());
    if (p.exp && p.exp < Date.now() && !abgelaufenOk) return null;
    if (type && p.t !== type) return null;
    return p;
  } catch { return null; }
}

// Zweck-gebundene, signierte Links (HMAC mit SESSION_SECRET), z. B. „connect“ (Stripe-Einrichtung) oder „resume“
// (Abschluss fortsetzen). Nur per Mail an die hinterlegte Studio-Adresse bzw. an den eigenen Browser ausgeben.
export const zweckToken = (studioId, zweck, stunden = 24) => sign({ t: zweck, sid: studioId, exp: Date.now() + stunden * 3600e3 });
export const zweckOk = (token, zweck, studioId) => { const p = verify(token, zweck); return Boolean(p && studioId && p.sid === studioId); };

// Login-Link: 24 Stunden gültig und nur einmal verwendbar („n“ = Einmal-Kennung). Seit 18.10.2026 (vorher 60 Min.):
// Mails kamen wegen des IONOS-Limits stundenlang verspätet an und waren dann schon abgelaufen.
export const LOGIN_STUNDEN = 24;
export const ADMIN_LOGIN_STUNDEN = 2;
const nonce = () => crypto.randomBytes(9).toString("base64url");
export const loginLink = (studioId, minutes = LOGIN_STUNDEN * 60) =>
  `${CFG.siteUrl}/api/auth?token=${sign({ t: "login", sid: studioId, n: nonce(), exp: Date.now() + minutes * 60000 })}`;

// Einmal-Links: verbrauchte Kennungen merken (Schlüssel einmal/<n>). Ältere Token ohne „n“ gelten bis zum Ablauf.
export const einmalBenutzt = async (p) => Boolean(p?.n) && Boolean(await store.get("einmal/" + p.n));
export const einmalVerbrauchen = async (p) => { if (p?.n) await store.set("einmal/" + p.n, { am: new Date().toISOString(), t: p.t, exp: p.exp }); };

// Sitzung 30 Tage. „sv“ = Sitzungsversion des Studios: „Auf allen Geräten abmelden“ zählt sie hoch, alte Cookies verfallen.
export function sessionCookie(studioOderId) {
  const s = typeof studioOderId === "object" ? studioOderId : { id: studioOderId };
  const val = sign({ t: "session", sid: s.id, sv: s.sessionVersion || 0, exp: Date.now() + 30 * 864e5 });
  const secure = CFG.siteUrl.startsWith("https") ? "; Secure" : "";
  return `${COOKIE}=${val}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 86400}${secure}`;
}

export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

function readCookie(req, name = COOKIE) {
  const raw = req.headers.get("cookie") || "";
  const m = raw.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? m[1] : null;
}

// Studio aus dem Sitzungs-Cookie. Admin-Ansicht („Dashboard ansehen“): Cookie mit ro=true und admin=<E-Mail>;
// das Studio-Objekt bekommt dann die (nicht gespeicherte) Eigenschaft _ansicht = { admin }.
export async function currentStudio(req) {
  const p = verify(readCookie(req), "session");
  if (!p) return null;
  const s = await getStudio(p.sid);
  if (!s) return null;
  if (p.ro) {
    if (!p.admin) return null;
    Object.defineProperty(s, "_ansicht", { value: { admin: p.admin, nurLesen: true }, enumerable: false });
    return s;
  }
  if ((p.sv || 0) !== (s.sessionVersion || 0)) return null;
  return s;
}

// ---- Admin ----
// Admin-Adressen: ADMIN_EMAILS (Komma-getrennt) oder ADMIN_EMAIL, Standard domenicschilling@gmail.com (gmail = googlemail)
export const adminEmails = () => String(process.env.ADMIN_EMAILS || CFG.adminEmail || "").split(",").map((x) => normEmail(x)).filter(Boolean);
export const istAdminEmail = (email) => Boolean(email) && adminEmails().includes(normEmail(email));
const ADMIN_COOKIE = "tf_admin";
export const adminLoginLink = (email) => `${CFG.siteUrl}/api/admin-login?token=${sign({ t: "adminlogin", email: normEmail(email), n: nonce(), exp: Date.now() + ADMIN_LOGIN_STUNDEN * 3600e3 })}`;
export function adminCookie(email) {
  const val = sign({ t: "admin", email: normEmail(email), exp: Date.now() + 12 * 3600e3 });
  const secure = CFG.siteUrl.startsWith("https") ? "; Secure" : "";
  return `${ADMIN_COOKIE}=${val}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${12 * 3600}${secure}`;
}
export const clearAdminCookie = () => `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
// E-Mail des eingeloggten Admins (Cookie) – nur, solange die Adresse noch in der Admin-Liste steht
export function adminVonCookie(req) {
  const p = verify(readCookie(req, ADMIN_COOKIE), "admin");
  return p && istAdminEmail(p.email) ? p.email : null;
}
// Admin-Ansicht eines Studios: nur lesend, 2 Stunden
export function ansichtCookie(studioId, adminEmail) {
  const val = sign({ t: "session", sid: studioId, ro: true, admin: adminEmail, exp: Date.now() + 2 * 3600e3 });
  const secure = CFG.siteUrl.startsWith("https") ? "; Secure" : "";
  return `${COOKIE}=${val}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${2 * 3600}${secure}`;
}

// Admin: entweder ADMIN_TOKEN (Bearer, Rückfall) oder Admin-Sitzung per E-Mail-Login
export function isAdmin(req) {
  const h = req.headers.get("authorization") || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : "";
  const perToken = Boolean(SECRETS.adminToken) && t.length === SECRETS.adminToken.length &&
    crypto.timingSafeEqual(Buffer.from(t), Buffer.from(SECRETS.adminToken));
  return perToken || Boolean(adminVonCookie(req));
}
export const adminName = (req) => adminVonCookie(req) || "admin-token";
