// Geplante Funktion: stündlich – abgebrochene Anmeldungen (Kasse nicht abgeschlossen) nach ca. 2 Stunden einmal persönlich nachfassen
// (Domenic 17.11.2026). Logik und Regeln in _lib/domain.mjs → anmeldungenNachfassen.
import { anmeldungenNachfassen } from "./_lib/domain.mjs";

export default async () => {
  const r = await anmeldungenNachfassen(new Date());
  if (r.length) console.log("Nachfassen", JSON.stringify(r));
  return new Response("ok");
};

export const config = { schedule: "25 * * * *" };
