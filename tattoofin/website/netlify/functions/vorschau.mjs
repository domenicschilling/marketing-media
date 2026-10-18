// Nur auf der Vorschau-Site (TF_VORSCHAU=1): Steuerung für Domenic zum Durchklicken, ohne Admin-Schlüssel.
//   POST /api/vorschau/einladen { email, firma }  → Geschenk-Einladungslink (es wird KEINE E-Mail verschickt)
//   GET  /api/vorschau/mails                      → Vorschau-Postfach (alle E-Mails, die verschickt worden wären)
// Auf tattoofin.de immer 404.
import { CFG } from "./_lib/config.mjs";
import { json, fail, body, clean, now, handler, isEmail } from "./_lib/util.mjs";
import { store } from "./_lib/store.mjs";
import { randomBytes } from "node:crypto";

export default handler(async (req) => {
  if (!CFG.vorschau) return new Response("Nicht gefunden", { status: 404 });
  const teil = new URL(req.url).pathname.replace(/^\/api\/vorschau\/?/, "");
  if (teil === "einladen" && req.method === "POST") {
    const b = await body(req);
    const email = clean(b.email, 160).toLowerCase(), firma = clean(b.firma, 120);
    if (!isEmail(email) || !firma) return fail("E-Mail und Studio-Name angeben.");
    const code = randomBytes(9).toString("base64url");
    await store.set(`geschenk/${code}`, { code, email, firma, erstellt: now(), benutzt: null, vorschau: true });
    return json({ link: `${CFG.siteUrl}/start.html?modell=kauf&geschenk=${code}` });
  }
  if (teil === "mails" && req.method === "GET") {
    const keys = (await store.list("mail/")).slice(-40).reverse();
    const out = [];
    for (const k of keys) { const m = await store.get(k); if (m) out.push({ at: m.at, to: m.to, subject: m.subject, html: m.html }); }
    return json(out);
  }
  return fail("Nicht gefunden", 404);
});

export const config = { path: ["/api/vorschau", "/api/vorschau/*"] };
