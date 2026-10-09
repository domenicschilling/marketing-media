// Geplante Funktion: Monatsabrechnung (Provision + Mehrminuten) für den Vormonat.
// Läuft am 4. jedes Monats um 06:00 UTC, also nach der Meldefrist (3. des Monats).
import { monatsabrechnung } from "./_lib/domain.mjs";
import { vormonat } from "./_lib/util.mjs";

export default async () => {
  const r = await monatsabrechnung(vormonat(new Date()), { dryRun: false });
  console.log("Monatsabrechnung", JSON.stringify(r));
  return new Response("ok");
};

export const config = { schedule: "0 6 4 * *" };
