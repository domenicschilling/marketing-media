// Login per Link aus der E-Mail (seit 18.10.2026: 24 Stunden gültig, nur einmal verwendbar).
//   GET  /api/auth?token=…&next=/app.html → kleine Zwischenseite, die sich sofort selbst abschickt (POST).
//        Grund: Virenscanner/Vorschau-Dienste mancher Mailprogramme rufen Links vorab auf. Ein GET verbraucht den Link
//        deshalb nicht, erst der POST aus dem echten Browser.
//   POST /api/auth (Formular: token, next) → prüft und verbraucht den Link, setzt das Sitzungs-Cookie, weiter zum Ziel.
// Abgelaufen/schon benutzt → /login.html?abgelaufen=1&neu=<token>: dort ein Knopf „Neuen Link schicken“
// (der neue Link geht an die hinterlegte Studio-Adresse, siehe /api/login { neu }).
import { verify, sessionCookie, vorschauVorbereiten, einmalBenutzt, einmalVerbrauchen, currentStudio } from "./_lib/auth.mjs";
import { getStudio } from "./_lib/store.mjs";
import { zwischenseite, weiter } from "./_lib/seiten.mjs";

// Nur eigene Seiten als Ziel (kein offener Redirect). Standard: das Studio-Dashboard (Web-App).
const ziel = (wunsch) => (/^\/[A-Za-z0-9_-]+\.html(#[A-Za-z0-9_-]*)?$/.test(wunsch || "") ? wunsch : "/app.html");
const abgelaufen = (token) => weiter("/login.html?abgelaufen=1" + (token ? "&neu=" + encodeURIComponent(token) : ""));

export default async (req) => {
  await vorschauVorbereiten();
  const u = new URL(req.url);
  let token = u.searchParams.get("token") || "", next = u.searchParams.get("next") || "";
  if (req.method === "POST") {
    try { const f = await req.formData(); token = String(f.get("token") || ""); next = String(f.get("next") || ""); } catch { /* leer */ }
  }
  const p = verify(token, "login");
  const s = p && (await getStudio(p.sid));
  if (!s) return abgelaufen(verify(token, "login", { abgelaufenOk: true }) ? token : "");

  if (req.method !== "POST") return zwischenseite({ action: "/api/auth", felder: { token, next } });

  if (await einmalBenutzt(p)) {
    // Doppelt angetippt: Wer mit genau diesem Studio schon angemeldet ist, kommt einfach weiter.
    if ((await currentStudio(req))?.id === s.id) return weiter(ziel(next));
    return abgelaufen(token);
  }
  await einmalVerbrauchen(p);
  return weiter(ziel(next), { "Set-Cookie": sessionCookie(s) });
};

export const config = { path: "/api/auth" };
