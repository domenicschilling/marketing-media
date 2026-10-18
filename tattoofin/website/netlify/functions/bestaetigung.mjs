// Digitale Leistungsbestätigung NACH dem Termin (Texte konservativ formuliert; anwaltliche Prüfung empfohlen).
// Das Studio erzeugt im Dashboard je Zahlung einen Link/QR (POST /api/portal/bestaetigung/:id). Der Kunde öffnet
// /bestaetigung.html?t=<token>, bestätigt mit Name, Datum, Häkchen und Unterschrift (Finger), optional Foto.
// Bewusst NICHT vor der Leistung: Eine Bestätigung „Leistung erhalten“ vor dem Termin wäre unwirksam und irreführend.
//   GET  /api/bestaetigung?t=…   Angaben zur Sitzung (ohne persönliche Daten außer dem Vornamen)
//   POST /api/bestaetigung       { t, name, datum, sitzungErledigt, unterschrift, foto, fotoOk }
import { CFG } from "./_lib/config.mjs";
import { json, fail, body, clean, now, handler, clientIp, euro, datum as datumText } from "./_lib/util.mjs";
import { store, getStudio, getZahlung, saveZahlung, saveLeistung, log } from "./_lib/store.mjs";
import { notify } from "./_lib/domain.mjs";
import { mails } from "./_lib/emails.mjs";

const MAX_UNTERSCHRIFT = 400_000;   // Zeichen (Daten-URL), ca. 300 KB
const MAX_FOTO = 2_800_000;         // Zeichen (Daten-URL), ca. 2 MB

export function bestaetigungsText(s, z, tag) {
  return `Ich bestätige, dass mein Termin am ${tag} bei ${s.firma} stattgefunden hat und die vereinbarte Sitzung ` +
    `(${z.beschreibung || "Tattoo-Projekt"}${z.sitzungen ? ", " + z.sitzungen : ""}) durchgeführt wurde. ` +
    "Meine gesetzlichen Rechte, z. B. bei Mängeln, bleiben davon unberührt.";
}

async function finde(t) {
  if (!/^[A-Za-z0-9_-]{16,60}$/.test(t || "")) return null;
  const ref = await store.get("idx/bst/" + t);
  if (!ref) return null;
  const [sid, zid] = ref.split("/");
  const z = await getZahlung(sid, zid);
  if (!z || z.leistungToken?.t !== t) return null;
  if (z.leistungToken.ablauf && new Date(z.leistungToken.ablauf) < new Date()) return null;
  return { z, s: await getStudio(sid) };
}

export default handler(async (req, context) => {
  if (req.method === "GET") {
    const f = await finde(new URL(req.url).searchParams.get("t"));
    if (!f) return fail("Dieser Link ist ungültig oder abgelaufen. Bitte frag im Studio nach einem neuen.", 404);
    const { s, z } = f;
    return json({
      studio: { firma: s.firma, ort: s.ort },
      zahlung: { beschreibung: z.beschreibung, sitzungen: z.sitzungen || "", betragCent: z.betragCent, kunde: (z.kunde || "").split(" ")[0] },
      erledigt: Boolean(z.leistung), version: CFG.bestaetigungVersion,
      textVorlage: bestaetigungsText(s, z, "{DATUM}"),
    });
  }
  if (req.method !== "POST") return fail("Methode nicht erlaubt", 405);
  const b = await body(req);
  const f = await finde(clean(b.t, 80));
  if (!f) return fail("Dieser Link ist ungültig oder abgelaufen. Bitte frag im Studio nach einem neuen.", 404);
  const { s, z } = f;
  if (z.leistung) return fail("Diese Sitzung wurde schon bestätigt. Danke!", 409);
  const name = clean(b.name, 100);
  const tag = /^\d{4}-\d{2}-\d{2}$/.test(b.datum || "") ? b.datum : "";
  if (!name) return fail("Bitte gib deinen Namen ein.");
  if (!tag) return fail("Bitte wähle das Datum deines Termins.");
  if (b.sitzungErledigt !== true) return fail("Bitte setze das Häkchen, wenn die Sitzung stattgefunden hat.");
  const sig = typeof b.unterschrift === "string" ? b.unterschrift : "";
  if (!sig.startsWith("data:image/png;base64,") || sig.length < 2000) return fail("Bitte unterschreibe mit dem Finger im Feld.");
  if (sig.length > MAX_UNTERSCHRIFT) return fail("Die Unterschrift ist zu groß. Bitte noch einmal unterschreiben.");
  const foto = typeof b.foto === "string" && b.foto ? b.foto : "";
  if (foto && (!/^data:image\/(jpeg|png|webp);base64,/.test(foto) || foto.length > MAX_FOTO)) return fail("Das Foto ist zu groß oder kein Bild. Bitte ein anderes wählen.");
  if (foto && b.fotoOk !== true) return fail("Bitte bestätige, dass das Studio das Foto als Nachweis speichern darf, oder entferne das Foto.");

  const tagDe = datumText(tag + "T12:00:00Z");
  const am = now();
  await saveLeistung(s.id, z.id, {
    zahlungId: z.id, studioId: s.id, am, version: CFG.bestaetigungVersion, name, datum: tag,
    text: bestaetigungsText(s, z, tagDe), unterschrift: sig, foto: foto || null,
    fotoEinwilligung: foto ? "Ich bin einverstanden, dass das Studio dieses Foto als Nachweis für die erbrachte Leistung speichert." : null,
    ip: clientIp(req, context), ua: (req.headers.get("user-agent") || "").slice(0, 200),
  });
  z.leistung = { am, name, datum: tag, hatFoto: Boolean(foto), version: CFG.bestaetigungVersion };
  z.leistungToken = { ...z.leistungToken, benutzt: am };
  await saveZahlung(z);
  await log("leistungsbestaetigung", { studioId: s.id, zahlungId: z.id });
  await notify(s, mails.leistungBestaetigt(s, z), s.benachrichtigungEmail || s.email);
  return json({ ok: true, studio: s.firma, betrag: euro(z.betragCent) });
});

export const config = { path: "/api/bestaetigung" };
