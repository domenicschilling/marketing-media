// POST /api/studio-tipp – optionaler „Wie heißt dein Studio?“-Eintrag von der Endkunden-Seite /raten (19.10.2026).
// Nur interne Zählung, welche Studios von Kunden gefragt werden (Admin: GET /api/admin/studio-tipps).
// Speichert Studio + Stadt + Kanal + Herkunft (utm), KEINE Daten des Kunden (keine IP, kein Name, keine Nummer).
// WICHTIG (§ 7 UWG): Studios werden auf Grund dieser Einträge NICHT per E-Mail/WhatsApp/Telefon angeschrieben.
// Keine Mail, kein Meta-Ereignis. Einfache Begrenzung gegen Spam über einen Tages-Hash der IP (die IP selbst wird nicht gespeichert).
import crypto from "node:crypto";
import { json, fail, body, clean, now, id, clientIp, handler } from "./_lib/util.mjs";
import { store, zaehleVersuch } from "./_lib/store.mjs";

export default handler(async (req, context) => {
  if (req.method !== "POST") return fail("Nur POST", 405);
  const b = await body(req);
  const studio = clean(b.studio, 80).replace(/\s+/g, " "), stadt = clean(b.stadt, 60).replace(/\s+/g, " ");
  if (studio.length < 2) return fail("Bitte gib den Namen des Studios ein.");
  const tag = new Date().toISOString().slice(0, 10);
  const schluessel = crypto.createHash("sha256").update(`${clientIp(req, context) || "?"}|${tag}|studio-tipp`).digest("hex").slice(0, 24);
  if (!(await zaehleVersuch(`rl/studio-tipp/${schluessel}`, 10, 24 * 3600e3))) return json({ ok: true });

  const herkunft = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]) if (b.utm?.[k]) herkunft[k] = clean(String(b.utm[k]), 120);
  const kanal = ["whatsapp", "instagram"].includes(b.kanal) ? b.kanal : "sonst";
  const t = { id: id("st_"), am: now(), studio, stadt, kanal, herkunft, test: /\btest\b/i.test(`${studio} ${stadt}`) };
  await store.set(`studio-tipp/${t.am}-${t.id}`, t);
  return json({ ok: true });
});

export const config = { path: "/api/studio-tipp" };
