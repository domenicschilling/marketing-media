// Admin-Login per E-Mail-Link (wie der Studio-Login) und Admin-Ansicht eines Studio-Dashboards.
//   POST /api/admin-login { email }        → Login-Link (30 Min.) an die Adresse, falls sie in ADMIN_EMAILS/ADMIN_EMAIL steht.
//                                            Antwort immer { ok: true }. Begrenzung: 3 Mails/15 Min. pro Adresse, 20/Std. pro IP.
//   GET  /api/admin-login?token=…          → Admin-Sitzung (Cookie tf_admin, 12 Std., httpOnly, SameSite=Strict) → /admin.html
//   POST /api/admin-login/abmelden         → Admin-Sitzung beenden
//   GET  /api/admin-ansicht?t=…            → (Token aus /api/admin/studio/:id/ansehen, 2 Min.) Studio-Dashboard nur lesend öffnen
//   GET  /api/admin-ansicht/ende           → Admin-Ansicht beenden, zurück zum Admin
// Der bisherige Login mit ADMIN_TOKEN bleibt als Rückfall erhalten.
import crypto from "node:crypto";
import { json, fail, body, clean, handler, clientIp, now } from "./_lib/util.mjs";
import { zaehleVersuch, getStudio, log } from "./_lib/store.mjs";
import { verify, istAdminEmail, adminLoginLink, adminCookie, clearAdminCookie, ansichtCookie, clearCookie } from "./_lib/auth.mjs";
import { sendMail } from "./_lib/mail.mjs";
import { SECRETS } from "./_lib/config.mjs";

const hash = (x) => crypto.createHmac("sha256", SECRETS.sessionSecret).update(String(x)).digest("hex").slice(0, 32);
const weiter = (to, cookie) => new Response(null, { status: 302, headers: { Location: to, ...(cookie ? { "Set-Cookie": cookie } : {}) } });

export default handler(async (req, context) => {
  const u = new URL(req.url);
  const teil = u.pathname.replace(/^\/api\//, "");

  if (teil === "admin-login" && req.method === "POST") {
    const email = clean((await body(req)).email, 160).toLowerCase();
    if (!(await zaehleVersuch(`rl/admin-login-ip/${hash(clientIp(req, context) || "?")}`, 20, 3600e3)) || !email) return json({ ok: true });
    if (!(await zaehleVersuch(`rl/admin-login-mail/${hash(email)}`, 3, 15 * 60e3))) return json({ ok: true });
    if (istAdminEmail(email)) {
      const link = adminLoginLink(email);
      await sendMail({
        to: email, subject: "Dein Admin-Login für Tattoofin",
        html: `<p>Hier ist dein Admin-Login für Tattoofin. Der Link ist 30 Minuten gültig und funktioniert nur für dich.</p><p><a href="${link}">Als Admin anmelden</a></p><p style="color:#5b6370;font-size:13px">Wenn du das nicht angefordert hast, ignoriere diese E-Mail.</p>`,
        text: `Admin-Login für Tattoofin (30 Minuten gültig): ${link}`,
      });
      await log("admin-login-link", { email });
    }
    return json({ ok: true });
  }

  if (teil === "admin-login" && req.method === "GET") {
    const p = verify(u.searchParams.get("token"), "adminlogin");
    if (!p || !istAdminEmail(p.email)) return weiter("/admin.html?abgelaufen=1");
    await log("admin-login", { email: p.email });
    return weiter("/admin.html", adminCookie(p.email));
  }

  if (teil === "admin-login/abmelden" && req.method === "POST") {
    return json({ ok: true }, 200, { "Set-Cookie": clearAdminCookie() });
  }

  if (teil === "admin-ansicht" && req.method === "GET") {
    const p = verify(u.searchParams.get("t"), "ansicht");
    const s = p && (await getStudio(p.sid));
    if (!s) return weiter("/admin.html?ansicht=abgelaufen");
    await log("admin-ansicht", { admin: p.admin, studioId: s.id, firma: s.firma, am: now() });
    return weiter("/app.html#start", ansichtCookie(s.id, p.admin));
  }

  if (teil === "admin-ansicht/ende") return weiter("/admin.html", clearCookie());
  return fail("Nicht gefunden", 404);
});

export const config = { path: ["/api/admin-login", "/api/admin-login/abmelden", "/api/admin-ansicht", "/api/admin-ansicht/ende"] };
