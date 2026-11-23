// Studio-Wechsel (seit 23.11.2026, Auftrag Domenic): Wer mit einer Adresse zu mehreren Studios gehört (Hauptadresse = Inhaber,
// Team-Adresse = Team), wechselt in App und Web zwischen ihnen, ohne sich neu anzumelden.
//   App: GET /api/app/studios, POST /api/app/wechseln { studioId } → Gerätetoken fürs Zielstudio (app.mjs)
//   Web: GET /api/portal/studios, POST /api/portal/studio-wechseln { studioId } → neues Sitzungs-Cookie (portal.mjs)
// Regel für beide: Das Zielstudio ist aktiv (AKTIV), kein Demo-Studio, und die Adresse ist dort JETZT Inhaber oder Team (rolleFuer).
// Wird eine Team-Adresse entfernt, verschwindet das Studio aus der Liste, und der Server lehnt den Wechsel ab.
import { studiosPerEmail, getStudio, AKTIV, normEmail } from "./store.mjs";
import { rolleFuer } from "./app-geraete.mjs";

export const MAX_STUDIOS = 10;

const kurz = (x, n, aktuellId) => ({ id: x.id, firma: x.firma || "", ort: x.ort || "", rolle: rolleFuer(x, n), aktuell: x.id === aktuellId });

// Alle Studios, zwischen denen diese Adresse wechseln darf. Das aktuelle Studio steht immer drin (auch ein Demo-/Prüfstudio,
// in dem man gerade angemeldet ist), die übrigen nur, wenn sie aktiv sind und die Adresse dort eine Rolle hat. Sortiert nach Name.
export async function studiosFuerWechsel(email, aktuell = null) {
  const n = normEmail(email);
  if (!n) return [];
  const liste = (await studiosPerEmail(n)).filter((x) => AKTIV(x) && !x.demo && rolleFuer(x, n) && x.id !== aktuell?.id);
  const alle = [...(aktuell && rolleFuer(aktuell, n) ? [aktuell] : []), ...liste]
    .sort((a, b) => String(a.firma || "").localeCompare(String(b.firma || ""), "de"))
    .slice(0, MAX_STUDIOS);
  return alle.map((x) => kurz(x, n, aktuell?.id));
}

// Zielstudio für einen Wechsel oder null (gibt es nicht, nicht aktiv, Demo, Adresse hat dort keine Rolle)
export async function wechselZiel(email, studioId) {
  if (!/^st_[A-Za-z0-9_-]{4,40}$/.test(String(studioId || ""))) return null;
  const t = await getStudio(studioId);
  if (!t || !AKTIV(t) || t.demo) return null;
  return rolleFuer(t, email) ? t : null;
}

// Darf diese Adresse ein weiteres Studio anlegen (Web-Anmeldung, App-Registrierung)?
// Bekannte Falle 23.11.2026: Eine Team-Adresse eines aktiven Studios hat die Anmeldung eines eigenen Studios blockiert.
// Jetzt: Team-Adresse anderswo → ja. Hauptadresse (Inhaber) eines aktiven Studios → nur mit Einladung für genau diese Adresse
// (sonst bleibt es beim Schutz vor doppelten Verträgen).
export async function weiteresStudioErlaubt(email, { einladung = false } = {}) {
  const n = normEmail(email);
  const aktiv = (await studiosPerEmail(n)).filter(AKTIV);
  const alsInhaber = aktiv.filter((x) => x.email && normEmail(x.email) === n).length;
  return { erlaubt: alsInhaber === 0 || Boolean(einladung), alsInhaber, alsTeam: aktiv.length - alsInhaber };
}
