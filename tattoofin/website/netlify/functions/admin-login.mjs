// Admin-Login per E-Mail-Link (wie der Studio-Login) und Admin-Ansicht eines Studio-Dashboards.
//   POST /api/admin-login { email }        → Login-Link (2 Std., einmal verwendbar) an die Adresse, falls sie in ADMIN_EMAILS/ADMIN_EMAIL steht.
//                                            Antwort immer { ok: true }. Begrenzung: 3 Mails/15 Min. pro Adresse, 20/Std. pro IP.
//   GET  /api/admin-login?token=…          → Zwischenseite (schickt sich selbst ab; Mail-Scanner verbrauchen den Link nicht)
//   POST /api/admin-login (Formular token)  → Admin-Sitzung (Cookie tf_admin, 12 Std., httpOnly, SameSite=Strict) → /admin.html
//   POST /api/admin-login/code { email, code } → Admin-Sitzung per 6-stelligem Code aus derselben Mail (15 Min., einmal, höchstens 5 Versuche).
//                                            Zusätzlich höchstens 10 falsche Codes je Adresse in 24 Std. (zählt über neue Codes hinweg, sonst ließe
//                                            sich mit jeder neuen Mail weiterraten). Danach Code gesperrt + Admin-Mail; der Link aus der Mail geht weiter.
//                                            Für die Admin-App auf dem Homescreen (iPhone): Dort öffnet der Link aus der Mail Safari, und die
//                                            Homescreen-App hat eigene Cookies. Der Code wird in der App eingetippt. Begrenzung zusätzlich 20/Std. pro IP.
//   POST /api/admin-login/abmelden         → Admin-Sitzung beenden
//   GET  /api/admin-ansicht?t=…            → (Token aus /api/admin/studio/:id/ansehen, 2 Min.) Studio-Dashboard nur lesend öffnen
//   GET  /api/admin-ansicht/ende           → Admin-Ansicht beenden, zurück zum Admin
// Der bisherige Login mit ADMIN_TOKEN bleibt als Rückfall erhalten.
import crypto from "node:crypto";
import { json, fail, body, clean, handler, clientIp, now } from "./_lib/util.mjs";
import { zaehleVersuch, getStudio, log, store, normEmail } from "./_lib/store.mjs";
import { notifyAdmin } from "./_lib/domain.mjs";
import { verify, istAdminEmail, adminLoginLink, adminCookie, clearAdminCookie, ansichtCookie, clearCookie, einmalBenutzt, einmalVerbrauchen, adminVonCookie, ADMIN_LOGIN_STUNDEN } from "./_lib/auth.mjs";
import { zwischenseite } from "./_lib/seiten.mjs";
import { sendMail } from "./_lib/mail.mjs";
import { SECRETS } from "./_lib/config.mjs";

const hash = (x) => crypto.createHmac("sha256", SECRETS.sessionSecret).update(String(x)).digest("hex").slice(0, 32);
const CODE_MIN = 15, CODE_VERSUCHE = 5, CODE_FEHL_TAG = 10;
const fehlSchluessel = (email) => `rl/admin-code-email/${hash(normEmail(email))}`;
// Falsche Codes je Adresse der letzten 24 Std. (nur lesen, zählt nicht hoch)
const fehlVersuche = async (email) => (((await store.get(fehlSchluessel(email)))?.t) || []).filter((t) => Date.now() - t < 24 * 3600e3).length;
const codeSchluessel = (email) => "adminlogincode/" + hash("code:" + normEmail(email));
const gleich = (a, b) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const weiter = (to, cookie) => new Response(null, { status: 303, headers: { Location: to, "Cache-Control": "no-store", ...(cookie ? { "Set-Cookie": cookie } : {}) } });

export default handler(async (req, context) => {
  const u = new URL(req.url);
  const teil = u.pathname.replace(/^\/api\//, "");

  // Formular aus der Zwischenseite: Link prüfen und (einmalig) verbrauchen
  if (teil === "admin-login" && req.method === "POST" && /form/.test(req.headers.get("content-type") || "")) {
    let token = ""; try { token = String((await req.formData()).get("token") || ""); } catch { /* leer */ }
    const p = verify(token, "adminlogin");
    if (!p || !istAdminEmail(p.email)) return weiter("/admin.html?abgelaufen=1");
    if (await einmalBenutzt(p)) return weiter(adminVonCookie(req) === p.email ? "/admin.html" : "/admin.html?abgelaufen=1");
    await einmalVerbrauchen(p);
    await log("admin-login", { email: p.email });
    return weiter("/admin.html", adminCookie(p.email));
  }

  if (teil === "admin-login" && req.method === "POST") {
    const email = clean((await body(req)).email, 160).toLowerCase();
    if (!(await zaehleVersuch(`rl/admin-login-ip/${hash(clientIp(req, context) || "?")}`, 20, 3600e3)) || !email) return json({ ok: true });
    if (!(await zaehleVersuch(`rl/admin-login-mail/${hash(email)}`, 3, 15 * 60e3))) return json({ ok: true });
    if (istAdminEmail(email)) {
      const link = adminLoginLink(email);
      // Zusätzlich ein Code für die Admin-App auf dem Homescreen (eigene Cookies, der Link öffnet Safari). Neuer Code ersetzt den alten.
      const code = String(crypto.randomInt(0, 1e6)).padStart(6, "0");
      await store.set(codeSchluessel(email), { h: hash("wert:" + normEmail(email) + ":" + code), exp: Date.now() + CODE_MIN * 60e3, versuche: 0 });
      await sendMail({
        to: email, subject: "Dein Admin-Login für Tattoofin",
        html: `<p>Hier ist dein Admin-Login für Tattoofin. Der Link ist ${ADMIN_LOGIN_STUNDEN} Stunden gültig, funktioniert einmal und nur für dich.</p><p><a href="${link}">Als Admin anmelden</a></p><p>In der App „TF Admin“ auf dem Homescreen gibst du stattdessen diesen Code ein (${CODE_MIN} Minuten gültig):</p><p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p><p style="color:#5b6370;font-size:13px">Wenn du das nicht angefordert hast, ignoriere diese E-Mail.</p>`,
        text: `Admin-Login für Tattoofin (${ADMIN_LOGIN_STUNDEN} Stunden gültig, einmal verwendbar): ${link}\n\nCode für die App „TF Admin“ (${CODE_MIN} Minuten gültig): ${code}`,
      });
      await log("admin-login-link", { email });
    }
    return json({ ok: true });
  }

  if (teil === "admin-login" && req.method === "GET") {
    const token = u.searchParams.get("token") || "";
    const p = verify(token, "adminlogin");
    if (!p || !istAdminEmail(p.email)) return weiter("/admin.html?abgelaufen=1");
    return zwischenseite({ action: "/api/admin-login", felder: { token }, titel: "Admin-Anmeldung …", knopf: "Als Admin anmelden" });
  }

  if (teil === "admin-login/code" && req.method === "POST") {
    const b = await body(req);
    const email = clean(b.email, 160).toLowerCase(), code = clean(String(b.code ?? ""), 12).replace(/\s+/g, "");
    const nein = () => fail("Der Code stimmt nicht oder ist abgelaufen. Fordere einfach einen neuen an.", 401);
    if (!(await zaehleVersuch(`rl/admin-code-ip/${hash(clientIp(req, context) || "?")}`, 20, 3600e3))) return fail("Zu viele Versuche. Bitte später nochmal.", 429);
    if (!email || !/^\d{6}$/.test(code) || !istAdminEmail(email)) return nein();
    const key = codeSchluessel(email);
    const gesperrt = () => fail("Zu viele falsche Codes. Bitte melde dich über den Link in der Mail an.", 429);
    if ((await fehlVersuche(email)) >= CODE_FEHL_TAG) { await store.del(key); return gesperrt(); }
    const rec = await store.get(key);
    if (!rec || !(rec.exp > Date.now()) || (rec.versuche || 0) >= CODE_VERSUCHE) { if (rec) await store.del(key); return nein(); }
    if (!gleich(String(rec.h), hash("wert:" + normEmail(email) + ":" + code))) {
      rec.versuche = (rec.versuche || 0) + 1;
      if (rec.versuche >= CODE_VERSUCHE) await store.del(key); else await store.set(key, rec);
      const unterGrenze = await zaehleVersuch(fehlSchluessel(email), CODE_FEHL_TAG, 24 * 3600e3);
      await log("admin-login-code-falsch", { email: normEmail(email), versuche: rec.versuche, gesperrt: !unterGrenze });
      if (!unterGrenze || (await fehlVersuche(email)) >= CODE_FEHL_TAG) {
        await store.del(key);
        await notifyAdmin("Admin-Code gesperrt: zu viele falsche Codes", null, { Adresse: normEmail(email), Hinweis: "24 Stunden kein Code-Login für diese Adresse. Der Link aus der Mail funktioniert weiter." });
        return gesperrt();
      }
      return nein();
    }
    await store.del(key);
    await log("admin-login", { email: normEmail(email), weg: "code" });
    return json({ ok: true }, 200, { "Set-Cookie": adminCookie(email), "Cache-Control": "no-store" });
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

export const config = { path: ["/api/admin-login", "/api/admin-login/code", "/api/admin-login/abmelden", "/api/admin-ansicht", "/api/admin-ansicht/ende"] };
