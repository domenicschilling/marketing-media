// GET /api/auth?token=…&next=/app.html – prüft den Login-Link und setzt das Session-Cookie
import { verify, sessionCookie, vorschauVorbereiten } from "./_lib/auth.mjs";
import { getStudio } from "./_lib/store.mjs";

export default async (req) => {
  await vorschauVorbereiten();
  const u = new URL(req.url);
  const p = verify(u.searchParams.get("token"), "login");
  const s = p && (await getStudio(p.sid));
  if (!s) return new Response(null, { status: 302, headers: { Location: "/login.html?abgelaufen=1" } });
  const wunsch = u.searchParams.get("next") || "";
  // Nur eigene Seiten als Ziel (kein offener Redirect). Standard: das Studio-Dashboard (Web-App).
  const next = /^\/[A-Za-z0-9_-]+\.html(#[A-Za-z0-9_-]*)?$/.test(wunsch) ? wunsch : "/app.html";
  return new Response(null, { status: 302, headers: { Location: next, "Set-Cookie": sessionCookie(s) } });
};

export const config = { path: "/api/auth" };
