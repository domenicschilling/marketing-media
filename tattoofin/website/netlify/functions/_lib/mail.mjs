// E-Mail-Versand. Reihenfolge: Resend (RESEND_API_KEY) → SMTP (SMTP_HOST…) → nur protokollieren (lokal/Test).
import { CFG } from "./config.mjs";
import { store } from "./store.mjs";

// Vorübergehende Fehler (z. B. IONOS „450 Mail send limit exceeded“, 18.10.2026) landen in der Warteschlange
// mail-warteschlange/ und werden von der geplanten Funktion mail-nachsenden.mjs alle 10 Minuten erneut versucht.
const VORUEBERGEHEND = /\b4\d\d\b|limit|timeout|ETIMEDOUT|ECONNRESET|EAI_AGAIN|temporar/i;

export async function sendMail(m, { versuch = 0 } = {}) {
  const ok = await sendeEinmal(m);
  if (ok === true) return true;
  if (VORUEBERGEHEND.test(ok) && versuch < 12) {
    await store.set(`mail-warteschlange/${new Date().toISOString()}-${Math.random().toString(36).slice(2, 6)}`, { ...m, versuch: versuch + 1, fehler: ok, seit: m.seit || new Date().toISOString() });
  }
  return false;
}

// Wartende Mails erneut versuchen (älter als 6 Stunden: verwerfen, z. B. Login-Links sind dann ohnehin abgelaufen)
export async function warteschlangeAbarbeiten() {
  const out = [];
  for (const k of await store.list("mail-warteschlange/")) {
    const m = await store.get(k);
    await store.del(k);
    if (!m || Date.now() - new Date(m.seit).getTime() > 6 * 3600e3) { out.push(["verworfen", m?.to, m?.subject]); continue; }
    const { versuch, fehler, ...mail } = m;
    out.push([await sendMail(mail, { versuch }) ? "gesendet" : "wieder in der Warteschlange", m.to, m.subject]);
  }
  return out;
}

async function sendeEinmal({ to, subject, html, text, bcc, replyTo }) {
  const msg = { from: CFG.mailFrom, to, subject, html, text, bcc, reply_to: replyTo || CFG.mailReplyTo || undefined };
  try {
    if (CFG.vorschau) {
      // Vorschau: nie echte E-Mails verschicken. Die Mail landet nur im Vorschau-Postfach (/vorschau.html).
      console.log(`[mail/vorschau] an ${to}: ${subject}`);
    } else if (process.env.RESEND_API_KEY) {
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
    return e.message || "Fehler";
  }
}
