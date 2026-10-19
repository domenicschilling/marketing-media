// POST /api/anfrage – Kurz-Anfrage von der Kampagnen-Seite /studios (Vorname, Name des Studios + Ort, Handynummer,
// Pflicht-Häkchen „Ich führe ein Tattoostudio bzw. arbeite in einem“ = studio_bestaetigt, seit 19.10.2026).
// Speichert die Anfrage (Netlify Blobs „anfrage/…“), meldet sie per E-Mail an ADMIN_EMAIL und sendet –
// nur mit Cookie-Einwilligung und nur auf tattoofin.de – das Ereignis „Lead“ an Meta (Conversions API, gleiche event_id wie der Pixel).
// Keine E-Mail an die anfragende Person. Testanfragen (Text enthält „TEST“) werden markiert und nie an Meta gemeldet.
import { CFG } from "./_lib/config.mjs";
import { json, fail, body, clean, now, id, esc, clientIp, handler } from "./_lib/util.mjs";
import { store, log } from "./_lib/store.mjs";
import { sendMail } from "./_lib/mail.mjs";
import { capiEvent, telefonE164 } from "./_lib/meta.mjs";

// Typische Endkunden-Sätze im Feld „Name deines Studios“ (Preis, „ich habe/will“, „mein Tattoo“, „Termin“, „Raten“)
const ENDKUNDE = /€|\beuro\b|\bkostet\b|\bich (habe|hab|möchte|will|würde)\b|\bmein(en|em)? tattoo\b|\btermin\b|\braten(zahlung)?\b|\bfinanzier/i;

export default handler(async (req, context) => {
  if (req.method !== "POST") return fail("Nur POST", 405);
  const b = await body(req);
  // Unsichtbares Feld: Bots füllen es aus → still „ok“ antworten, nichts speichern
  if (clean(b.firmenwebsite, 200)) return json({ ok: true });

  const vorname = clean(b.vorname, 60), studio = clean(b.studio, 120), telefon = clean(b.telefon, 40);
  const fehler = {};
  if (vorname.length < 2) fehler.vorname = "Bitte gib deinen Vornamen ein.";
  // 19.10.2026: Name des Studios ist Pflicht. Endkunden schrieben hier z. B. „Ich habe bald Tattoo-Termin, das Tattoo kostet 400 €“
  // → solche Sätze freundlich auf die Kunden-Seite /raten schicken statt als Studio-Anfrage zu speichern.
  if (studio.length < 2) fehler.studio = "Bitte gib den Namen deines Studios ein.";
  else if (ENDKUNDE.test(studio)) fehler.studio = "Das sieht nicht nach einem Studionamen aus. Du bist Kunde und willst in Raten zahlen? Dann schau auf tattoofin.de/raten.";
  if (!telefonE164(telefon)) fehler.telefon = "Bitte gib eine Handynummer ein, z. B. 0151 23456789.";
  // Pflicht-Häkchen „Ich führe ein Tattoostudio bzw. arbeite in einem“
  if (b.studio_bestaetigt !== true && b.studio_bestaetigt !== "ja") fehler.studio_bestaetigt = "Bitte bestätige, dass du ein Tattoostudio führst oder in einem arbeitest.";
  if (Object.keys(fehler).length) return json({ error: "Bitte prüfe die markierten Felder.", fehler }, 400);

  const test = /\btest\b/i.test(`${vorname} ${studio}`);
  const herkunft = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref"]) if (b.utm?.[k]) herkunft[k] = clean(String(b.utm[k]), 120);
  const a = {
    id: id("af_"), am: now(), vorname, studio, telefon, test, herkunft, studioBestaetigt: true,
    seite: clean(b.seite, 200), einwilligung: b.einwilligung === "ja",
  };
  await store.set(`anfrage/${a.am}-${a.id}`, a);
  await log("anfrage", { anfrageId: a.id, studio, test });

  const wa = telefonE164(telefon);
  const titel = `${test ? "[TEST] " : ""}[Tattoofin] Neue Anfrage: ${studio}`;
  const zeilen = [
    ["Vorname", vorname], ["Studio / Ort", studio], ["Handy", telefon],
    ["Herkunft", Object.entries(herkunft).map(([k, v]) => `${k}=${v}`).join(", ") || "–"], ["Seite", a.seite || "–"],
  ];
  await sendMail({
    to: CFG.adminEmail, subject: titel,
    text: zeilen.map(([k, v]) => `${k}: ${v}`).join("\n") + `\n\nWhatsApp: https://wa.me/${wa}`,
    html: `<p>Neue Anfrage über tattoofin.de/studios${test ? " <b>(Test – bitte löschen)</b>" : ""}:</p><table>${zeilen.map(([k, v]) => `<tr><td style="padding:2px 12px 2px 0"><b>${esc(k)}</b></td><td>${esc(v)}</td></tr>`).join("")}</table><p><a href="https://wa.me/${wa}">Per WhatsApp antworten</a></p>`,
  });

  // Meta nur: Einwilligung erteilt, kein Test, Anfrage kam wirklich über tattoofin.de (nicht Vorschau/lokal)
  const host = new URL(req.url).hostname;
  if (a.einwilligung && !test && host === "tattoofin.de" && b.event_id) {
    await capiEvent({
      name: "Lead", eventId: clean(String(b.event_id), 80), url: "https://tattoofin.de/studios",
      ip: clientIp(req, context), ua: req.headers.get("user-agent"), fbp: clean(b.fbp, 200), fbc: clean(b.fbc, 300),
      telefon, vorname, contentName: "Anfrage-Formular (Kampagnen-Seite)",
    }).catch((e) => console.error("CAPI", e.message));
  }
  return json({ ok: true });
});

export const config = { path: "/api/anfrage" };
