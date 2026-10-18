// Stripe-Simulation: Seiten und Aktionen (Testkasse, Onboarding, eingebettete Bausteine).
// Aktiv NUR in der Vorschau ohne Stripe-Testschlüssel bzw. lokal mit dem Stripe-Nachbau – sonst 404.
//   /api/sim/pay/<cs> · /api/sim/onboard/<acct> · /api/sim/express/<acct> · /api/sim/invoice
//   POST /api/sim/onboarding-fertig/<acct> · POST /api/sim/bestaetigen
import { SIMULATION, SECRETS } from "./_lib/config.mjs";
import { simulation } from "./_lib/stripe.mjs";
import { nest } from "./_lib/stripe-sim.mjs";
import { handler } from "./_lib/util.mjs";

const lokalerNachbau = () => /^http:\/\/localhost:\d+$/.test(SECRETS.stripeApiBase || "");

export default handler(async (req) => {
  const u = new URL(req.url);
  const rest = u.pathname.replace(/^\/api\/sim\/?/, "");
  if (!SIMULATION && !lokalerNachbau()) return new Response("Nicht gefunden", { status: 404 });
  const raw = ["GET", "HEAD"].includes(req.method) ? "" : await req.text();
  // lokal: an den Nachbau-Server durchreichen
  if (!SIMULATION) {
    const r = await fetch(`${SECRETS.stripeApiBase}/${rest}${u.search}`, { method: req.method, headers: { "content-type": req.headers.get("content-type") || "application/x-www-form-urlencoded" }, body: raw || undefined, redirect: "manual" });
    return new Response(await r.arrayBuffer(), { status: r.status, headers: { "content-type": r.headers.get("content-type") || "text/plain", ...(r.headers.get("location") ? { Location: r.headers.get("location") } : {}) } });
  }
  const form = (req.headers.get("content-type") || "").includes("json") ? (raw ? JSON.parse(raw) : {}) : nest(new URLSearchParams(raw));
  const r = await simulation().page(req.method, rest.split("/").filter(Boolean), form, u.searchParams);
  if (r.redirect) return new Response(null, { status: 303, headers: { Location: r.redirect } });
  if (r.html) return new Response(r.html, { status: r.status || 200, headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" } });
  if (r.json) return new Response(JSON.stringify(r.json), { status: r.status || 200, headers: { "content-type": "application/json" } });
  return new Response(r.text || "", { status: r.status || 404 });
});

export const config = { path: "/api/sim/*" };
