// QR-Aufsteller: öffentliche Daten für die Hersteller-Seite /aufsteller.html?s=<studio>
//   GET /api/aufsteller?s=<slug> → Studioname, Link der Zahlseite, Holzton/Variante
// Enthält nur, was ohnehin öffentlich ist (Name und Zahlseite stehen auf der Zahlseite).
// Live (18.10.2026): Variante „mit Studioname“, Holz hell. Logo-Upload gibt es erst mit dem Portal v2.
import { json, fail, clean, handler } from "./_lib/util.mjs";
import { studioBy } from "./_lib/store.mjs";
import { zahlseiteUrl } from "./_lib/domain.mjs";

export default handler(async (req) => {
  if (req.method !== "GET") return fail("Methode nicht erlaubt", 405);
  const s = await studioBy("slug", clean(new URL(req.url).searchParams.get("s"), 60));
  if (!s || ["entwurf", "abgebrochen"].includes(s.status)) return fail("Studio nicht gefunden", 404);
  const a = s.aufsteller || {};
  return json({
    firma: s.firma, slug: s.slug, zahlseite: zahlseiteUrl(s),
    holz: a.holz === "dunkel" ? "dunkel" : "hell", variante: "name", logo: null,
  });
});

export const config = { path: "/api/aufsteller" };
