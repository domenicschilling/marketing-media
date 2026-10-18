// Login per Magic Link (kein Passwort) + signiertes Session-Cookie. Admin über ADMIN_TOKEN.
import crypto from "node:crypto";
import { SECRETS, CFG } from "./config.mjs";
import { getStudio, store } from "./store.mjs";
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

export function verify(token, type) {
  if (!token || !token.includes(".")) return null;
  const [data, sig] = token.split(".");
  const expected = crypto.createHmac("sha256", SECRETS.sessionSecret).update(data).digest("base64url");
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const p = JSON.parse(Buffer.from(data, "base64url").toString());
    if (p.exp && p.exp < Date.now()) return null;
    if (type && p.t !== type) return null;
    return p;
  } catch { return null; }
}

export const loginLink = (studioId, minutes = 60 * 24) =>
  `${CFG.siteUrl}/api/auth?token=${sign({ t: "login", sid: studioId, exp: Date.now() + minutes * 60000 })}`;

// Sitzung 30 Tage. „sv“ = Sitzungsversion des Studios: „Auf allen Geräten abmelden“ zählt sie hoch, alte Cookies verfallen.
export function sessionCookie(studioOderId) {
  const s = typeof studioOderId === "object" ? studioOderId : { id: studioOderId };
  const val = sign({ t: "session", sid: s.id, sv: s.sessionVersion || 0, exp: Date.now() + 30 * 864e5 });
  const secure = CFG.siteUrl.startsWith("https") ? "; Secure" : "";
  return `${COOKIE}=${val}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 86400}${secure}`;
}

export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

function readCookie(req) {
  const raw = req.headers.get("cookie") || "";
  const m = raw.match(new RegExp("(?:^|;\\s*)" + COOKIE + "=([^;]+)"));
  return m ? m[1] : null;
}

export async function currentStudio(req) {
  const p = verify(readCookie(req), "session");
  if (!p) return null;
  const s = await getStudio(p.sid);
  if (!s || (p.sv || 0) !== (s.sessionVersion || 0)) return null;
  return s;
}

export function isAdmin(req) {
  const h = req.headers.get("authorization") || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : "";
  return Boolean(SECRETS.adminToken) && t.length === SECRETS.adminToken.length &&
    crypto.timingSafeEqual(Buffer.from(t), Buffer.from(SECRETS.adminToken));
}
