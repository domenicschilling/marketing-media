// Geplante Funktion: alle 10 Minuten wartende E-Mails erneut senden (z. B. nach „Mail send limit exceeded“ beim Mailserver).
import { warteschlangeAbarbeiten } from "./_lib/mail.mjs";

export default async () => {
  const r = await warteschlangeAbarbeiten();
  if (r.length) console.log("Mail-Warteschlange", JSON.stringify(r));
  return new Response("ok");
};

export const config = { schedule: "*/10 * * * *" };
