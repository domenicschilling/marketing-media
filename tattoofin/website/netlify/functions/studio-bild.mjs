// Öffentliches Studio-Logo/-Icon für Zahlseite, Zahlungslink und Stripe-Checkout (branding_settings)
//   GET /api/studio-bild?s=<slug>&art=logo|icon[&v=<stand>]
import { clean, fail, handler } from "./_lib/util.mjs";
import { studioBy } from "./_lib/store.mjs";
import { ladeBild, BILD_ARTEN } from "./_lib/branding.mjs";

export default handler(async (req) => {
  if (!["GET", "HEAD"].includes(req.method)) return fail("Methode nicht erlaubt", 405);
  const q = new URL(req.url).searchParams;
  const art = BILD_ARTEN.includes(q.get("art")) ? q.get("art") : "logo";
  const s = await studioBy("slug", clean(q.get("s"), 60));
  if (!s || ["entwurf", "abgebrochen"].includes(s.status) || !s.branding?.[art]) return fail("Bild nicht gefunden", 404);
  const bild = await ladeBild(s.id, art);
  const m = /^data:(image\/(?:png|jpeg));base64,(.+)$/.exec(bild?.src || "");
  if (!m) return fail("Bild nicht gefunden", 404);
  return new Response(Buffer.from(m[2], "base64"), {
    headers: { "content-type": m[1], "cache-control": q.get("v") ? "public, max-age=31536000, immutable" : "public, max-age=300", "x-robots-tag": "noindex" },
  });
});

export const config = { path: "/api/studio-bild" };
