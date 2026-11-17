// Geplante Funktion: stündlich zur vollen Stunde – geplante Einmal-Infos (testwoche-info) und abgebrochene Anmeldungen (Kasse nicht abgeschlossen) nach ca. 2 Stunden einmal persönlich nachfassen
// (Domenic 17.11.2026). Logik und Regeln in _lib/domain.mjs → anmeldungenNachfassen.
import { anmeldungenNachfassen, geplanteInfoMails } from "./_lib/domain.mjs";

export default async () => {
  const r = [...(await geplanteInfoMails(new Date())), ...(await anmeldungenNachfassen(new Date()))];
  if (r.length) console.log("Nachfassen", JSON.stringify(r));
  return new Response("ok");
};

export const config = { schedule: "0 * * * *" };
