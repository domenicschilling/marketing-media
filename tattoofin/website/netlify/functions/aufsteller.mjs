// QR-Aufsteller: öffentliche Daten für die Hersteller-Seite /aufsteller.html?s=<studio>
//   GET /api/aufsteller?s=<slug> → Studioname, Link der Zahlseite, gewählter Holzton/Variante, Logo (schwarz/weiß)
// Enthält nur, was ohnehin öffentlich ist (Name und Zahlseite stehen auf der Zahlseite, das Logo kommt auf das Schild).
import { CFG } from "./_lib/config.mjs";
import { json, fail, clean, handler } from "./_lib/util.mjs";
import { studioBy, store } from "./_lib/store.mjs";

export default handler(async (req) => {
  if (req.method !== "GET") return fail("Methode nicht erlaubt", 405);
  const s = await studioBy("slug", clean(new URL(req.url).searchParams.get("s"), 60));
  if (!s || ["entwurf", "abgebrochen"].includes(s.status)) return fail("Studio nicht gefunden", 404);
  const a = s.aufsteller || {};
  const logo = a.hatLogo ? await store.get("aufsteller-logo/" + s.id) : null;
  return json({
    firma: s.firma, slug: s.slug, zahlseite: `${CFG.siteUrl}/zahlen/${s.slug}`,
    holz: a.holz || "hell", variante: logo ? a.variante || "name" : "name",
    logo: logo ? { src: logo.src, w: logo.w, h: logo.h } : null,
  });
});

export const config = { path: "/api/aufsteller" };
