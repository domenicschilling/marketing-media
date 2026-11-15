// QR-Aufsteller aus Holz: eingestellt am 15.11.2026 (Entscheidung Domenic). Die Hersteller-Seite /aufsteller.html gibt es nicht mehr.
//   GET /api/aufsteller → immer 410 { error, code: "aufsteller_entfallen" } (alte Links aus Admin-Mails, alte Dashboard-Seiten)
// Bestandsdaten (s.aufsteller) sieht der Admin weiter im Studio-Datensatz (Admin → Studio → „QR-Aufsteller (alt)“).
import { json, handler } from "./_lib/util.mjs";
import { AUFSTELLER_ENTFALLEN } from "./_lib/werbung.mjs";

export default handler(async () => json(AUFSTELLER_ENTFALLEN, 410));

export const config = { path: "/api/aufsteller" };
