// POST /api/login { email } – schickt einen Login-Link (Antwort ist immer gleich, damit niemand E-Mails ausprobieren kann)
import { json, fail, body, clean, handler } from "./_lib/util.mjs";
import { studioBy } from "./_lib/store.mjs";
import { loginLink } from "./_lib/auth.mjs";
import { notify } from "./_lib/domain.mjs";
import { mails } from "./_lib/emails.mjs";

export default handler(async (req) => {
  if (req.method !== "POST") return fail("Methode nicht erlaubt", 405);
  const email = clean((await body(req)).email, 160).toLowerCase();
  const s = await studioBy("email", email);
  if (s && !["entwurf", "abgebrochen"].includes(s.status)) await notify(s, mails.login(s, { url: loginLink(s.id, 60) }));
  return json({ ok: true });
});

export const config = { path: "/api/login" };
