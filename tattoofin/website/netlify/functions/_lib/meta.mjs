// Meta Conversions API (serverseitig) – gemeinsamer Helfer.
// Sendet nur, wenn META_CAPI_TOKEN gesetzt ist. Persönliche Daten nur gehasht (SHA-256), wie von Meta verlangt.
import { createHash } from "node:crypto";

export const PIXEL_ID = "1628016302128524";
const sha = (v) => createHash("sha256").update(String(v)).digest("hex");

// Telefonnummer für Meta normalisieren: nur Ziffern, mit Ländervorwahl (DE = 49), ohne führende Nullen
export function telefonE164(t) {
  let d = String(t || "").replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = "49" + d.slice(1);
  return /^\d{8,15}$/.test(d) ? d : "";
}

export async function capiEvent({ name, eventId, url, ip, ua, fbp, fbc, telefon, vorname, contentName }) {
  const token = (process.env.META_CAPI_TOKEN || "").trim().replace(/^["']|["']$/g, "");
  if (!token) return { gesendet: false, grund: "kein Token" };
  const ph = telefonE164(telefon);
  const fn = String(vorname || "").trim().toLowerCase();
  const event = {
    event_name: name,
    event_time: Math.floor(Date.now() / 1000),
    event_id: String(eventId).slice(0, 80),
    action_source: "website",
    event_source_url: url,
    user_data: {
      client_ip_address: ip || undefined,
      client_user_agent: ua || undefined,
      fbp: fbp ? String(fbp).slice(0, 200) : undefined,
      fbc: fbc ? String(fbc).slice(0, 300) : undefined,
      ph: ph ? [sha(ph)] : undefined,
      fn: fn ? [sha(fn)] : undefined,
      country: [sha("de")],
    },
    custom_data: { content_name: String(contentName || "Kampagnen-Seite").slice(0, 100), content_category: "Tattoo-Studio" },
  };
  const body = { data: [event], ...(process.env.META_TEST_CODE ? { test_event_code: process.env.META_TEST_CODE } : {}) };
  const res = await fetch(`https://graph.facebook.com/v24.0/${PIXEL_ID}/events?access_token=${encodeURIComponent(token)}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const out = await res.json().catch(() => ({}));
  if (!res.ok) console.error("CAPI-Fehler", res.status, out?.error?.message);
  return { gesendet: res.ok };
}
