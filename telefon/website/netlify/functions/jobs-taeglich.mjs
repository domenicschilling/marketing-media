// Geplante Funktion: täglich 07:00 UTC – Erinnerungen, Vertragsende, abgebrochene Abschlüsse.
import { taeglicheJobs } from "./_lib/domain.mjs";

export default async () => {
  const r = await taeglicheJobs(new Date());
  console.log("Tägliche Jobs", JSON.stringify(r));
  return new Response("ok");
};

export const config = { schedule: "0 7 * * *" };
