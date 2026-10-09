// E-Mail-Versand. Reihenfolge: Resend (RESEND_API_KEY) → SMTP (SMTP_HOST…) → nur protokollieren (lokal/Test).
import { CFG } from "./config.mjs";
import { store } from "./store.mjs";

export async function sendMail({ to, subject, html, text, bcc, replyTo }) {
  const msg = { from: CFG.mailFrom, to, subject, html, text, bcc, reply_to: replyTo || CFG.mailReplyTo || undefined };
  try {
    if (process.env.RESEND_API_KEY) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ ...msg, to: [].concat(to), bcc: bcc ? [].concat(bcc) : undefined }),
      });
      if (!r.ok) throw new Error("Resend " + r.status + ": " + (await r.text()));
    } else if (process.env.SMTP_HOST) {
      const nodemailer = (await import("nodemailer")).default;
      const t = nodemailer.createTransport({
        host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await t.sendMail({ from: msg.from, to, bcc, subject, html, text, replyTo: msg.reply_to });
    } else {
      console.log(`[mail] an ${to}: ${subject}`);
    }
    await store.set(`mail/${new Date().toISOString()}-${Math.random().toString(36).slice(2, 6)}`, { to, subject, html, at: new Date().toISOString() });
    return true;
  } catch (e) {
    console.error("[mail] Fehler", e.message);
    await store.set(`mail-fehler/${new Date().toISOString()}`, { to, subject, error: e.message });
    return false;
  }
}
