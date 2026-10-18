// Geplante Funktion: stündlicher Gesundheits-Check (siehe _lib/gesundheit.mjs)
import { gesundheitPruefen } from "./_lib/gesundheit.mjs";

export default async () => {
  const r = await gesundheitPruefen();
  console.log("Gesundheit", r.ok ? "ok" : "STÖRUNG", JSON.stringify(r.fehler));
  return new Response("ok");
};

export const config = { schedule: "7 * * * *" };
