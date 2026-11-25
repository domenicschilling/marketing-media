// Shop-Seite je Stadt: /gutschein-kaufen/tattoo-fashion-munich und /gutschein-kaufen/tattoo-fashion-landshut (24.11.2026, Runde 3)
// Liefert die Seite aus dev/gutschein-seiten.mjs (Modul _lib/gutschein-seiten-html.mjs) mit Titel, Beschreibung, Vorschaubild und
// Hero-Zahlen aus dem echten Bestand (_lib/gutschein-seite.mjs). So zeigt eine geteilte WhatsApp-/Facebook-Vorschau nie ein Angebot,
// das es nicht mehr gibt, und der Hero springt beim Laden nicht von „500 € für 375 €“ auf ein anderes Angebot.
// Sicherheitsnetz: Klappt das Lesen des Bestands nicht (Fehler, länger als 2,5 s), kommt die Seite unverändert (das Skript der Seite
// lädt die Zahlen dann selbst). Das CDN hält die Antwort 30 s (danach bis 90 s alt, während im Hintergrund neu erzeugt wird), damit
// nicht jeder Besuch die Funktion startet. Zum Cache-Schlüssel gehört nur ?g= (Angebot aus der Werbung), nicht utm oder fbclid.
import { testKasse } from "./_lib/config.mjs";
import { studioBy } from "./_lib/store.mjs";
import { darfKassieren } from "./_lib/domain.mjs";
import { shopFuer, shopOeffentlich } from "./_lib/gutschein-shop.mjs";
import { seiteAnpassen } from "./_lib/gutschein-seite.mjs";
import { SEITEN } from "./_lib/gutschein-seiten-html.mjs";

const KOPF = {
  "content-type": "text/html; charset=utf-8",
  "x-robots-tag": "noindex",
  "x-frame-options": "DENY",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "cache-control": "public, max-age=0, must-revalidate",
};

async function daten(slug) {
  const s = await studioBy("slug", slug);
  const c = s && shopFuer(s);
  if (!c) return null;
  return { shop: await shopOeffentlich(s, c), aktiv: Boolean(darfKassieren(s)) && !testKasse(s) };
}

export default async (req) => {
  const url = new URL(req.url), slug = url.pathname.replace(/\/+$/, "").split("/").pop();
  const roh = Object.hasOwn(SEITEN, slug) ? SEITEN[slug] : null;
  if (!roh) return new Response("Nicht gefunden", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  let html = roh.html, frisch = false;
  try {
    let uhr;
    const d = await Promise.race([daten(slug), new Promise((_, nein) => { uhr = setTimeout(() => nein(new Error("Bestand zu langsam")), 2500); })]).finally(() => clearTimeout(uhr));
    if (d) { html = seiteAnpassen(roh, d, { heroId: url.searchParams.get("g") }); frisch = html !== roh.html; }
  } catch (e) { console.error("gutschein-seite:", slug, e?.message || e); }
  return new Response(req.method === "HEAD" ? null : html, {
    headers: { ...KOPF, ...(frisch ? { "netlify-cdn-cache-control": "public, durable, s-maxage=30, stale-while-revalidate=90", "netlify-vary": "query=g" } : { "netlify-cdn-cache-control": "no-store" }) },
  });
};

// Muss als fester Wert dastehen (Netlify liest ihn beim Bündeln); neue Stadt: hier und in SHOPS eintragen
export const config = { path: ["/gutschein-kaufen/tattoo-fashion-munich", "/gutschein-kaufen/tattoo-fashion-landshut", "/gutschein-kaufen/chic-tattoo-augsburg"] };
