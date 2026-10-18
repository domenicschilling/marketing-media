// POST /api/login { email } – schickt einen Login-Link (Antwort ist immer gleich, damit niemand E-Mails ausprobieren kann)
// Begrenzung gegen Mail-Fluten: höchstens 3 Login-Mails pro Adresse in 15 Minuten und 20 Anfragen pro IP (gehasht) pro Stunde.
// Über der Grenze wird still nichts verschickt – die Antwort bleibt { ok: true }.
import crypto from "node:crypto";
import { json, fail, body, clean, handler, clientIp } from "./_lib/util.mjs";
import { studiosPerEmail, AKTIV, zaehleVersuch } from "./_lib/store.mjs";
import { loginLink } from "./_lib/auth.mjs";
import { notify } from "./_lib/domain.mjs";
import { mails } from "./_lib/emails.mjs";
import { SECRETS } from "./_lib/config.mjs";

const hash = (x) => crypto.createHmac("sha256", SECRETS.sessionSecret).update(String(x)).digest("hex").slice(0, 32);

const zaehle = zaehleVersuch;

export default handler(async (req, context) => {
  if (req.method !== "POST") return fail("Methode nicht erlaubt", 405);
  const email = clean((await body(req)).email, 160).toLowerCase();
  const ipOk = await zaehle(`rl/login-ip/${hash(clientIp(req, context) || "?")}`, 20, 3600e3);
  if (!ipOk || !email) return json({ ok: true });
  const mailOk = await zaehle(`rl/login-mail/${hash(email)}`, 3, 15 * 60e3);
  if (!mailOk) return json({ ok: true });
  // Alle aktiven Studios zu dieser Adresse (nicht nur den letzten Index-Eintrag): je Studio ein Link, höchstens 3
  for (const s of (await studiosPerEmail(email)).filter(AKTIV).slice(0, 3)) await notify(s, mails.login(s, { url: loginLink(s.id, 60) }));
  return json({ ok: true });
});

export const config = { path: "/api/login" };
