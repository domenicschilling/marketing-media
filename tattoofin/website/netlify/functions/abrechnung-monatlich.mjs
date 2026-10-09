// Geplante Funktion: Monatsabrechnung der Provision für den Vormonat (Rechnung + Übersicht per E-Mail).
// Die Provision wurde bei jeder Zahlung bereits automatisch als Plattformgebühr einbehalten.
// Läuft am 1. jedes Monats um 06:00 UTC.
import { monatsabrechnung } from "./_lib/domain.mjs";
import { vormonat } from "./_lib/util.mjs";

export default async () => {
  const r = await monatsabrechnung(vormonat(new Date()), { dryRun: false });
  console.log("Monatsabrechnung", JSON.stringify(r));
  return new Response("ok");
};

export const config = { schedule: "0 6 1 * *" };
