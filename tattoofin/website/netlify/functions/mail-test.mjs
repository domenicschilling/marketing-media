// POST /api/mail-test (Header x-test-token: <MAIL_TEST_TOKEN>) – schickt eine Testmail an ADMIN_EMAIL, um den E-Mail-Versand zu prüfen.
// Ohne gesetztes MAIL_TEST_TOKEN ist der Endpunkt abgeschaltet. Empfänger ist immer die Admin-Adresse, nie eine frei wählbare.
import crypto from "node:crypto";
import { CFG } from "./_lib/config.mjs";
import { json, fail, handler } from "./_lib/util.mjs";
import { sendMail } from "./_lib/mail.mjs";
import { store } from "./_lib/store.mjs";

export default handler(async (req) => {
  const soll = process.env.MAIL_TEST_TOKEN || "", ist = req.headers.get("x-test-token") || "";
  if (req.method !== "POST" || !soll || ist.length !== soll.length || !crypto.timingSafeEqual(Buffer.from(ist), Buffer.from(soll))) return fail("Nicht berechtigt", 401);
  const weg = process.env.RESEND_API_KEY ? "resend" : process.env.SMTP_HOST ? `smtp ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587}` : "nur Protokoll";
  const ok = await sendMail({
    to: CFG.adminEmail,
    subject: "Tattoofin: Testmail – E-Mail-Versand funktioniert",
    text: `Diese Testmail kommt von ${CFG.mailFrom} über ${weg}. Wenn du sie liest, funktionieren Vertragsbestätigungen, Login-Links und Abrechnungen.`,
    html: `<p>Diese Testmail kommt von <b>${CFG.mailFrom.replace(/</g, "&lt;")}</b> über ${weg}.</p><p>Wenn du sie liest, funktionieren Vertragsbestätigungen, Login-Links und Abrechnungen.</p>`,
  });
  let fehler = null;
  if (!ok) { const k = (await store.list("mail-fehler/")).sort().pop(); fehler = (k && (await store.get(k))?.error) || "unbekannt"; }
  return json({ ok, weg, passwortGesetzt: Boolean(process.env.SMTP_PASS), an: CFG.adminEmail.replace(/^(.).*(@.*)$/, "$1…$2"), fehler });
});

export const config = { path: "/api/mail-test" };
