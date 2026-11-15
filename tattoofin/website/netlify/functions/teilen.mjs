// Kurzlink + Link-Vorschau für Zahlungslinks (seit 15.11.2026): tattoofin.de/z/<id>
//   GET /z/<id>            HTML mit og:title / og:description / og:image für WhatsApp, iMessage, Telegram & Co. (die führen kein
//                          JavaScript aus) und sofortiger Weiterleitung zur Zahlseite /zahlung.html?z=<id> (die alte Adresse bleibt gültig).
//   GET /z/<id>/bild.png   Vorschaubild 1200 × 630 (Studio-Logo oder -Name, Betrag, Projekt, Zahlarten; _lib/vorschaubild.mjs)
// Datenschutz: Die Vorschau ist für jeden mit dem Link abrufbar → kein Kundenname, keine E-Mail, kein Gutschein-Empfänger.
// Bezahlte, stornierte oder sonst nicht mehr offene Links: neutrale Vorschau (nur Tattoofin). Unbekannte ID: 404 ohne Daten.
// Klarna: nur der Name („Klarna verfügbar“) und nur, wenn der Link Klarna wirklich anbietet (gleiche Regel wie der Teilen-Text).
import { createHash } from "node:crypto";
import { CFG } from "./_lib/config.mjs";
import { handler, euro } from "./_lib/util.mjs";
import { getStudio, zahlungBy } from "./_lib/store.mjs";
import { klarnaFuer } from "./_lib/domain.mjs";
import { ladeBild } from "./_lib/branding.mjs";
import { KLARNA_NAME } from "./_lib/klarna-texte.mjs";
import { vorschauBild, BREITE, HOEHE } from "./_lib/vorschaubild.mjs";
import { zahlungsLink } from "./_lib/studio-ansicht.mjs";

export const ID_MUSTER = /^zl_[A-Za-z0-9_-]{6,40}$/;
const ZAHLARTEN = "per Karte, Apple Pay oder Google Pay";
// Diese Abrufer zeigen eine Vorschau und dürfen NICHT weitergeleitet werden (sonst lesen sie die Zahlseite ohne Vorschau-Angaben)
export const VORSCHAU_ABRUFER = /whatsapp|facebookexternalhit|facebot|twitterbot|telegrambot|slackbot|discordbot|linkedinbot|skypeuripreview|pinterest|redditbot|embedly|iframely|vkshare|mastodon|googlebot|bingbot|applebot|google-pagerenderer|microsoftpreview|bitlybot|quora link preview/i;

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const offen = (z) => ["offen", "abgebrochen"].includes(z.status) && !z.ausweich?.bezahltAm;

// Angaben für Vorschau-Text und -Bild (ohne Kundendaten)
export async function vorschauDaten(z, s, { mitLogo = false } = {}) {
  if (!z || !s || !offen(z)) return { neutral: true, version: "n2" };
  const betrag = euro(z.betragCent);
  const projekt = z.beschreibung || "Tattoo-Projekt";
  const klarna = z.art === "gesamt" && !z.nurKarte && klarnaFuer(s);
  let etikett = "Zahlung an", zeile = projekt;
  if (z.art === "anzahlung" || z.anzahlung) { etikett = "Anzahlung an"; zeile = /anzahlung/i.test(projekt) ? projekt : `Anzahlung · ${projekt}`; }
  if (z.art === "gutschein") { etikett = "Gutschein von"; zeile = "Wertgutschein"; }
  const titel = `${s.firma} · ${betrag}`;
  const beschreibung = `${zeile} · sicher bezahlen ${ZAHLARTEN}${klarna ? ` · ${KLARNA_NAME.verfuegbar}` : ""}`;
  const logoMeta = s.branding?.logo?.typ === "image/png" ? s.branding.logo : null;
  const daten = { neutral: false, titel, beschreibung, firma: s.firma, betrag, etikett, projekt: z.art === "gutschein" ? "Wertgutschein" : projekt, klarna, logoHell: Boolean(s.branding?.logoHell) };
  daten.version = createHash("sha256").update(JSON.stringify({ ...daten, logo: logoMeta?.am || "", v: 2 })).digest("base64url").slice(0, 12);
  if (mitLogo && logoMeta) {
    const b = await ladeBild(s.id, "logo");
    const m = /^data:image\/png;base64,(.+)$/.exec(b?.src || "");
    if (m) daten.logo = Buffer.from(m[1], "base64");
  }
  return daten;
}

function seite({ id, d, weiterleiten }) {
  const ziel = `/zahlung.html?z=${encodeURIComponent(id)}`;
  const titel = d.neutral ? "Zahlungslink · Tattoofin" : d.titel;
  const beschreibung = d.neutral ? "Dieser Zahlungslink ist nicht mehr offen. Bei Fragen melde dich direkt bei deinem Studio." : d.beschreibung;
  const bild = `${CFG.siteUrl}/z/${encodeURIComponent(id)}/bild.png?v=${d.version}`;
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(titel)}</title>
<meta name="robots" content="noindex">
<meta name="description" content="${esc(beschreibung)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Tattoofin">
<meta property="og:locale" content="de_DE">
<meta property="og:url" content="${esc(zahlungsLink(id))}">
<meta property="og:title" content="${esc(titel)}">
<meta property="og:description" content="${esc(beschreibung)}">
<meta property="og:image" content="${esc(bild)}">
<meta property="og:image:secure_url" content="${esc(bild)}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="${BREITE}">
<meta property="og:image:height" content="${HOEHE}">
<meta property="og:image:alt" content="${esc(d.neutral ? "Tattoofin" : `${d.etikett} ${d.firma}: ${d.betrag}`)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(titel)}">
<meta name="twitter:description" content="${esc(beschreibung)}">
<meta name="twitter:image" content="${esc(bild)}">
<meta name="theme-color" content="#1f3d5c">
<link rel="icon" href="/favicon.png" type="image/png">
${weiterleiten ? `<meta http-equiv="refresh" content="0;url=${esc(ziel)}">\n<script>location.replace(${JSON.stringify(ziel)})</script>` : ""}
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fbb316;font:600 18px/1.4 system-ui,-apple-system,sans-serif;color:#1f3d5c}a{color:#1f3d5c}</style>
</head><body><p><a href="${esc(ziel)}">Weiter zur Zahlung</a></p></body></html>`;
}

const NICHT_GEFUNDEN = `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Link nicht gefunden · Tattoofin</title>
<meta name="robots" content="noindex"><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fbb316;font:600 18px/1.4 system-ui,-apple-system,sans-serif;color:#1f3d5c;text-align:center;padding:0 16px}</style>
</head><body><p>Diesen Zahlungslink gibt es nicht.<br>Bitte frag dein Studio nach einem neuen Link.</p></body></html>`;

const KOPF = { "x-robots-tag": "noindex", "referrer-policy": "no-referrer", "x-content-type-options": "nosniff" };
const antwort = (req, inhalt, status, kopf) => new Response(req.method === "HEAD" ? null : inhalt, { status, headers: { ...KOPF, ...kopf } });

export default handler(async (req) => {
  if (!["GET", "HEAD"].includes(req.method)) return new Response("Methode nicht erlaubt", { status: 405, headers: { allow: "GET, HEAD" } });
  const [, , id, datei, ...rest] = new URL(req.url).pathname.split("/");
  const istBild = datei === "bild.png" && !rest.length;
  const html404 = () => antwort(req, NICHT_GEFUNDEN, 404, { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" });
  if (!ID_MUSTER.test(id || "") || (datei && !istBild) || rest.length) return istBild ? antwort(req, "Nicht gefunden", 404, { "content-type": "text/plain; charset=utf-8" }) : html404();
  const z = await zahlungBy("zahlung", id);
  if (!z) return istBild ? antwort(req, "Nicht gefunden", 404, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-cache" }) : html404();
  const s = await getStudio(z.studioId);

  if (istBild) {
    const d = await vorschauDaten(z, s, { mitLogo: true });
    const png = vorschauBild(d.neutral ? { neutral: true } : { firma: d.firma, betrag: d.betrag, etikett: d.etikett, beschreibung: d.projekt, klarna: d.klarna, logo: d.logo || null, logoHell: d.logoHell });
    // Passt die Version in der Adresse zum aktuellen Stand, darf das Bild lange zwischengespeichert werden (neuer Stand = neue Adresse)
    const passt = new URL(req.url).searchParams.get("v") === d.version;
    return antwort(req, png, 200, { "content-type": "image/png", "content-length": String(png.length), "cache-control": passt ? "public, max-age=86400" : "public, max-age=60" });
  }

  const d = await vorschauDaten(z, s);
  const bot = VORSCHAU_ABRUFER.test(req.headers.get("user-agent") || "");
  return antwort(req, seite({ id, d, weiterleiten: !bot }), 200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache", vary: "User-Agent" });
});

export const config = { path: ["/z/*"] };
