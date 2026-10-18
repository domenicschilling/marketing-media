// E-Mail-Versand. Reihenfolge: Resend (RESEND_API_KEY, falls gesetzt) → bei Fehler Rückfall SMTP/IONOS (SMTP_HOST…)
// → nur protokollieren (lokal/Test, ohne beides). Klappt keiner der Wege vorübergehend, kommt die Mail in die Warteschlange.
import { CFG } from "./config.mjs";
import { store } from "./store.mjs";

// Vorübergehende Fehler (z. B. IONOS „450 Mail send limit exceeded“, 18.10.2026) landen in der Warteschlange
// mail-warteschlange/ und werden von der geplanten Funktion mail-nachsenden.mjs alle 10 Minuten erneut versucht.
const VORUEBERGEHEND = /\b[45]\d\d\b|limit|timeout|ETIMEDOUT|ECONNRESET|EAI_AGAIN|temporar/i;

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

// Versandwege in Reihenfolge (Resend zuerst, IONOS/SMTP als Rückfall)
export const versandwege = () => [process.env.RESEND_API_KEY && "resend", process.env.SMTP_HOST && "smtp"].filter(Boolean);

async function perResend(msg) {
  const r = await fetch(process.env.RESEND_API_BASE || "https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ ...msg, to: [].concat(msg.to), bcc: msg.bcc ? [].concat(msg.bcc) : undefined }),
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error("Resend " + r.status + ": " + (await r.text()).slice(0, 300));
}

async function perSmtp(msg) {
  const nodemailer = (await import("nodemailer")).default;
  const t = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await t.sendMail({ from: msg.from, to: msg.to, bcc: msg.bcc, subject: msg.subject, html: msg.html, text: msg.text, replyTo: msg.reply_to });
}

async function sendeEinmal({ to, subject, html, text, bcc, replyTo }) {
  const msg = { from: CFG.mailFrom, to, subject, html, text, bcc, reply_to: replyTo || CFG.mailReplyTo || undefined };
  if (CFG.vorschau) {
    // Vorschau: nie echte E-Mails verschicken. Die Mail landet nur im Vorschau-Postfach (/vorschau.html).
    console.log(`[mail/vorschau] an ${to}: ${subject}`);
    return protokolliere({ to, subject, html, weg: "vorschau" });
  }
  const wege = versandwege();
  if (!wege.length) { console.log(`[mail] an ${to}: ${subject}`); return protokolliere({ to, subject, html, weg: "log" }); }
  const fehler = [];
  for (const weg of wege) {
    try {
      await (weg === "resend" ? perResend(msg) : perSmtp(msg));
      return protokolliere({ to, subject, html, weg, ...(fehler.length ? { rueckfall: fehler.join(" | ").slice(0, 300) } : {}) });
    } catch (e) {
      console.error(`[mail/${weg}] Fehler`, e.message);
      fehler.push(`${weg}: ${e.message}`);
    }
  }
  const text2 = fehler.join(" | ");
  await store.set(`mail-fehler/${new Date().toISOString()}`, { to, subject, error: text2 });
  return text2 || "Fehler";
}

async function protokolliere({ to, subject, html, weg, rueckfall }) {
  await store.set(`mail/${new Date().toISOString()}-${Math.random().toString(36).slice(2, 6)}`, { to, subject, html, weg, rueckfall, at: new Date().toISOString() });
  return true;
}

// Zustand der Warteschlange (für Admin-Hinweis, Login-Seite und Gesundheits-Check)
export async function warteschlangeStatus() {
  const keys = await store.list("mail-warteschlange/");
  if (!keys.length) return { anzahl: 0, wege: versandwege() };
  const erste = await store.get(keys[0]);
  const letzte = keys.length > 1 ? await store.get(keys[keys.length - 1]) : erste;
  return {
    anzahl: keys.length, wege: versandwege(),
    aeltesteSeit: erste?.seit || null,
    letzterFehler: String(letzte?.fehler || "").slice(0, 300),
  };
}
