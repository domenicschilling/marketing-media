// Öffentliche Ansicht eines Gutscheins (Link aus der Gutschein-Mail, langer Zufalls-Token – der kurze Code allein reicht nicht)
//   GET /api/gutschein?t=<token>         Daten für /gutschein.html
//   GET /api/gutschein?t=<token>&pdf=1   Gutschein als PDF
import { json, fail, handler } from "./_lib/util.mjs";
import { gutscheinPerToken, gutscheinPdf, gutscheinStatus } from "./_lib/gutschein.mjs";
import { brandingOeffentlich } from "./_lib/branding.mjs";

export default handler(async (req) => {
  if (req.method !== "GET") return fail("Methode nicht erlaubt", 405);
  const u = new URL(req.url);
  const r = await gutscheinPerToken(u.searchParams.get("t"));
  if (!r?.s || !r.z.gutschein?.code) return fail("Gutschein nicht gefunden", 404);
  const { s, z } = r, g = z.gutschein;
  if (u.searchParams.get("pdf")) {
    return new Response(await gutscheinPdf(s, z), { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="Gutschein-${g.code}.pdf"`, "cache-control": "no-store", "x-robots-tag": "noindex" } });
  }
  return json({
    studio: { firma: s.firma, strasse: s.strasse, plz: s.plz, ort: s.ort, branding: brandingOeffentlich(s) },
    gutschein: { code: g.code, betragCent: z.betragCent, empfaenger: g.empfaenger || "", nachricht: g.nachricht || "", ausgestelltAm: g.ausgestelltAm, gueltigBis: g.gueltigBis, status: gutscheinStatus(z), eingeloestAm: g.eingeloestAm || null },
  }, 200, { "cache-control": "no-store" });
});

export const config = { path: "/api/gutschein" };
