// POST /api/logout
import { clearCookie } from "./_lib/auth.mjs";

export default async () => new Response(JSON.stringify({ ok: true }), { headers: { "Set-Cookie": clearCookie(), "content-type": "application/json" } });

export const config = { path: "/api/logout" };
