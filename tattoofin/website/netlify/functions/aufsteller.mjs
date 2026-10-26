// QR-Aufsteller: Daten für die Hersteller-Seite /aufsteller.html?s=<studio>&t=<token>
//   GET /api/aufsteller?s=<slug>&t=<token> → Studioname, Link der Zahlseite, gewählter Holzton/Variante, Logo (schwarz/weiß)
// Nur mit signiertem Link (Zweck „aufsteller“, aus Admin-Mail/Admin) oder mit Sitzung dieses Studios.
import { CFG } from "./_lib/config.mjs";
import { json, fail, clean, handler } from "./_lib/util.mjs";
import { studioBy, store } from "./_lib/store.mjs";
import { currentStudio, zweckOk } from "./_lib/auth.mjs";
import { klarnaDauerhaft } from "./_lib/domain.mjs";

export default handler(async (req) => {
  if (req.method !== "GET") return fail("Methode nicht erlaubt", 405);
  const s = await studioBy("slug", clean(new URL(req.url).searchParams.get("s"), 60));
  if (!s || ["entwurf", "abgebrochen"].includes(s.status)) return fail("Studio nicht gefunden", 404);
  const sitzung = await currentStudio(req);
  if (!(sitzung?.id === s.id || zweckOk(new URL(req.url).searchParams.get("t"), "aufsteller", s.id))) return fail("Link ungültig oder abgelaufen", 403);
  const a = s.aufsteller || {};
  const logo = a.hatLogo ? await store.get("aufsteller-logo/" + s.id) : null;
  return json({
    firma: s.firma, slug: s.slug, klarna: klarnaDauerhaft(s), zahlseite: `${CFG.siteUrl}/zahlen/${s.slug}`,
    holz: a.holz || "hell", variante: logo ? a.variante || "name" : "name",
    logo: logo ? { src: logo.src, w: logo.w, h: logo.h } : null,
  });
});

export const config = { path: "/api/aufsteller" };
