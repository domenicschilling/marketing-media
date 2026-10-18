// POST /api/capi – Meta Conversions API (serverseitig): Lead (/studios, /start), CompleteRegistration und Purchase (danke.html).
// Leitet ein Ereignis mit derselben event_id wie das Pixel an Meta weiter (Deduplizierung).
// Wird von der Seite nur nach Cookie-Einwilligung aufgerufen.
// Zugriffsschlüssel: Netlify-Umgebungsvariable META_CAPI_TOKEN (nur im Netlify-Dashboard, nie im Code).
// Ohne Schlüssel tut die Funktion nichts (204). Optional: META_TEST_CODE für den Test im Events Manager.
import { createHash } from "node:crypto";

const PIXEL_ID = "1628016302128524";
const ALLOWED = new Set(["Lead", "CompleteRegistration", "Purchase"]);
const sha = (v) => createHash("sha256").update(v).digest("hex");

export default async (req, context) => {
  if (req.method !== "POST") return new Response("", { status: 405 });
  if (process.env.TF_VORSCHAU === "1") return new Response(null, { status: 204 }); // Vorschau: kein Tracking
  const token = (process.env.META_CAPI_TOKEN || "").trim().replace(/^["']|["']$/g, "");
  if (!token) return new Response(null, { status: 204 });
  let b;
  try { b = await req.json(); } catch { return new Response("", { status: 400 }); }
  if (!ALLOWED.has(b.event_name) || !b.event_id || String(b.event_id).length > 80) return new Response("", { status: 400 });
  const url = typeof b.url === "string" && b.url.startsWith("https://tattoofin.de/") ? b.url.slice(0, 500) : "https://tattoofin.de/studios";

  const event = {
    event_name: b.event_name,
    event_time: Math.floor(Date.now() / 1000),
    event_id: String(b.event_id),
    action_source: "website",
    event_source_url: url,
    user_data: {
      client_ip_address: context?.ip || req.headers.get("x-nf-client-connection-ip") || undefined,
      client_user_agent: req.headers.get("user-agent") || undefined,
      fbp: typeof b.fbp === "string" && b.fbp ? b.fbp.slice(0, 200) : undefined,
      fbc: typeof b.fbc === "string" && b.fbc ? b.fbc.slice(0, 300) : undefined,
      country: [sha("de")],
    },
    custom_data: {
      content_name: String(b.content_name || "Kampagnen-Seite").slice(0, 100), content_category: "Tattoo-Studio",
      ...(b.event_name === "Purchase" && Number(b.value) > 0 && Number(b.value) <= 5000 ? { value: Number(b.value), currency: "EUR" } : {}),
    },
  };
  const body = { data: [event], ...(process.env.META_TEST_CODE ? { test_event_code: process.env.META_TEST_CODE } : {}) };
  const res = await fetch(`https://graph.facebook.com/v24.0/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) console.error("CAPI-Fehler", res.status, out?.error?.message);
  return new Response(JSON.stringify({ ok: res.ok, received: out?.events_received ?? 0 }), { status: res.ok ? 200 : 502, headers: { "Content-Type": "application/json" } });
};

export const config = { path: "/api/capi" };
