// POST /api/login { email } – schickt einen Login-Link (Antwort ist immer gleich, damit niemand E-Mails ausprobieren kann)
// POST /api/login { neu: <abgelaufener Login-Token> } – „Neuen Link schicken“ von der Seite „Link abgelaufen“:
//      der neue Link geht an die hinterlegte Adresse des Studios aus dem (echt signierten) alten Link.
// Begrenzung gegen Mail-Fluten: höchstens 3 Login-Mails pro Adresse/Studio in 15 Minuten und 20 Anfragen pro IP (gehasht) pro Stunde.
// Über der Grenze wird still nichts verschickt – die Antwort bleibt { ok: true }.
// „verzoegert“: true, wenn der Mailversand gerade hängt (Warteschlange nicht leer) – betrifft alle gleich, verrät also nichts.
import crypto from "node:crypto";
import { json, fail, body, clean, handler, clientIp } from "./_lib/util.mjs";
import { studiosPerEmail, AKTIV, zaehleVersuch, getStudio, normEmail } from "./_lib/store.mjs";
import { loginLink, verify, LOGIN_STUNDEN } from "./_lib/auth.mjs";
import { notify } from "./_lib/domain.mjs";
import { mails } from "./_lib/emails.mjs";
import { SECRETS } from "./_lib/config.mjs";
import { warteschlangeStatus } from "./_lib/mail.mjs";

const hash = (x) => crypto.createHmac("sha256", SECRETS.sessionSecret).update(String(x)).digest("hex").slice(0, 32);
// „y•••••@gmail.com“ – nur für den Hinweis nach „Neuen Link schicken“ (der Besitzer des alten Links kennt die Adresse ohnehin)
const maskiert = (e) => String(e || "").replace(/^(.)[^@]*(@.*)$/, "$1•••••$2");

export default handler(async (req, context) => {
  if (req.method !== "POST") return fail("Methode nicht erlaubt", 405);
  const b = await body(req);
  const ipOk = await zaehleVersuch(`rl/login-ip/${hash(clientIp(req, context) || "?")}`, 20, 3600e3);
  const antwort = async (extra = {}) => json({ ok: true, ...extra, verzoegert: (await warteschlangeStatus()).anzahl > 0 });

  if (b.neu) {
    const p = verify(clean(b.neu, 2000), "login", { abgelaufenOk: true });
    const s = p && (await getStudio(p.sid));
    if (!ipOk || !s || !s.email) return antwort();
    if (!(await zaehleVersuch(`rl/login-neu/${hash(s.id)}`, 3, 15 * 60e3))) return antwort({ an: maskiert(s.email), gedrosselt: true });
    const ok = await notify(s, mails.login(s, { url: loginLink(s.id), stunden: LOGIN_STUNDEN }));
    return antwort({ an: maskiert(s.email), gesendet: ok === true });
  }

  const email = clean(b.email, 160).toLowerCase();
  if (!ipOk || !email) return antwort();
  const mailOk = await zaehleVersuch(`rl/login-mail/${hash(email)}`, 3, 15 * 60e3);
  if (!mailOk) return antwort();
  // Alle aktiven Studios zu dieser Adresse (nicht nur den letzten Index-Eintrag): je Studio ein Link, höchstens 3
  // Link geht an die eingegebene Adresse (Hauptadresse oder hinterlegte Team-Adresse – beides passt laut studiosPerEmail)
  for (const s of (await studiosPerEmail(email)).filter(AKTIV).slice(0, 3)) {
    const an = normEmail(s.email) === normEmail(email) ? undefined : (s.teamEmails || []).find((t) => normEmail(t) === normEmail(email));
    await notify(s, mails.login(s, { url: loginLink(s.id), stunden: LOGIN_STUNDEN }), an);
  }
  return antwort();
});

export const config = { path: "/api/login" };
