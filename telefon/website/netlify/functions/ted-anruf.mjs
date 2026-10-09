// POST /api/ted/anruf – Post-Call-Webhook von ElevenLabs (oder Make). Legt die Anfrage an,
// zählt Minuten, benachrichtigt das Studio und leitet optional an Make weiter (WhatsApp via Superchat).
// ElevenLabs: Agent → Webhooks → Post-call: URL <SITE_URL>/api/ted/anruf, Secret = TED_WEBHOOK_SECRET
import crypto from "node:crypto";
import { CFG, SECRETS } from "./_lib/config.mjs";
import { json, fail, id, now, handler, clean } from "./_lib/util.mjs";
import { studioBy, getStudio, saveStudio, saveAnfrage, store, log } from "./_lib/store.mjs";
import { notify } from "./_lib/domain.mjs";
import { sendMail } from "./_lib/mail.mjs";
import { mails } from "./_lib/emails.mjs";

function signaturOk(req, raw) {
  if (!SECRETS.tedWebhookSecret) return true; // lokal/Test
  const h = req.headers.get("elevenlabs-signature") || "";
  const t = (h.match(/t=(\d+)/) || [])[1];
  const v = (h.match(/v0=([a-f0-9]+)/) || [])[1];
  if (t && v) {
    const exp = crypto.createHmac("sha256", SECRETS.tedWebhookSecret).update(`${t}.${raw}`).digest("hex");
    return exp.length === v.length && crypto.timingSafeEqual(Buffer.from(exp), Buffer.from(v)) && Math.abs(Date.now() / 1000 - Number(t)) < 1800;
  }
  // Alternative (z. B. Make): Header "x-ted-secret"
  return req.headers.get("x-ted-secret") === SECRETS.tedWebhookSecret;
}

const wert = (dc, k) => {
  const v = dc?.[k];
  if (v === undefined || v === null) return "";
  return typeof v === "object" ? (v.value ?? "") : v;
};
const ja = (v) => v === true || /^(ja|yes|true|1)$/i.test(String(v));

export default handler(async (req) => {
  if (req.method !== "POST") return fail("Methode nicht erlaubt", 405);
  const raw = await req.text();
  if (!signaturOk(req, raw)) return fail("Signatur ungültig", 401);
  const p = JSON.parse(raw);
  const d = p.data || p;
  const studio = (await studioBy("agent", d.agent_id)) || (await getStudio(new URL(req.url).searchParams.get("studio") || p.studioId));
  if (!studio) return fail("Studio zu diesem Agenten unbekannt", 404);

  const convId = d.conversation_id || id("conv_");
  if (await store.get(`conv/${convId}`)) return json({ ok: true, doppelt: true });

  const dc = d.analysis?.data_collection_results || d.felder || {};
  const dauerSek = Number(d.metadata?.call_duration_secs ?? d.dauerSek ?? 0);
  const a = {
    id: id("an_"), studioId: studio.id, createdAt: d.metadata?.start_time_unix_secs ? new Date(d.metadata.start_time_unix_secs * 1000).toISOString() : now(),
    quelle: "ted", conversationId: convId, dauerSek,
    anrufer: d.metadata?.phone_call?.external_number || d.anrufer || "",
    name: clean(String(wert(dc, "name")), 80), nummer: clean(String(wert(dc, "rueckrufnummer") || d.metadata?.phone_call?.external_number || ""), 40),
    anliegen: clean(String(wert(dc, "anliegen")), 60), motiv: clean(String(wert(dc, "motiv")), 300), stelle: clean(String(wert(dc, "koerperstelle")), 80),
    groesse: clean(String(wert(dc, "groesse_cm")), 30), stil: clean(String(wert(dc, "stil")), 80), farbe: clean(String(wert(dc, "farbe")), 40),
    wunschzeitraum: clean(String(wert(dc, "wunschzeitraum")), 120), budget: clean(String(wert(dc, "budget")), 60), artist: clean(String(wert(dc, "artist_wunsch")), 80),
    whatsappOk: ja(wert(dc, "referenzbild_whatsapp_ok")), dringend: ja(wert(dc, "dringend")),
    zusammenfassung: clean(String(wert(dc, "zusammenfassung") || d.analysis?.transcript_summary || ""), 2000),
    status: "offen",
  };
  // Reine Infoanrufe (z. B. nur Öffnungszeiten) ohne Kontaktdaten nicht als offene Anfrage führen
  if (!a.nummer && !a.name && !a.motiv) a.status = "kein_termin";
  await saveAnfrage(a);
  await store.set(`conv/${convId}`, { studioId: studio.id, anfrageId: a.id });

  // Minuten zählen (Fair Use)
  const monat = a.createdAt.slice(0, 7);
  studio.minuten = studio.minuten || {};
  const vorher = studio.minuten[monat] || 0;
  studio.minuten[monat] = Math.round((vorher + dauerSek / 60) * 100) / 100;
  const ueberschritten = vorher <= CFG.fairUseMinuten && studio.minuten[monat] > CFG.fairUseMinuten;
  await saveStudio(studio);

  const ziel = studio.benachrichtigungEmail || studio.email;
  if (a.status === "offen") {
    const m = mails.neueAnfrage(studio, a);
    await sendMail({ to: ziel, subject: m.subject, html: m.html, text: m.text });
  }
  if (ueberschritten) await notify(studio, mails.fairUse(studio, { minuten: Math.ceil(studio.minuten[monat]), monat }));

  if (SECRETS.makeWebhookUrl) {
    try {
      await fetch(SECRETS.makeWebhookUrl, { method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ studio: { id: studio.id, firma: studio.firma, whatsapp: studio.whatsapp || studio.telefon, email: ziel, dringendNummer: studio.dringendNummer || studio.telefon }, anfrage: a }) });
    } catch (e) { console.error("Make-Weiterleitung fehlgeschlagen", e.message); }
  }
  await log("anruf", { studioId: studio.id, anfrageId: a.id, dauerSek });
  return json({ ok: true, anfrageId: a.id });
});

export const config = { path: "/api/ted/anruf" };
