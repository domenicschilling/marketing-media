// Login per Magic Link (kein Passwort) + signiertes Session-Cookie. Admin über ADMIN_TOKEN.
import crypto from "node:crypto";
import { SECRETS, CFG } from "./config.mjs";
import { getStudio } from "./store.mjs";

const COOKIE = "ted_session";

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

export function sessionCookie(studioId) {
  const val = sign({ t: "session", sid: studioId, exp: Date.now() + 30 * 864e5 });
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
  return p ? getStudio(p.sid) : null;
}

export function isAdmin(req) {
  const h = req.headers.get("authorization") || "";
  const t = h.startsWith("Bearer ") ? h.slice(7) : "";
  return Boolean(SECRETS.adminToken) && t.length === SECRETS.adminToken.length &&
    crypto.timingSafeEqual(Buffer.from(t), Buffer.from(SECRETS.adminToken));
}
