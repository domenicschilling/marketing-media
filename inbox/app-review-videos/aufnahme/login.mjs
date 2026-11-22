// Erzeugt einen Einmal-Anmeldelink (nur im Prozess, nie ausgegeben) für den Inbox-Nutzer.
import fs from "node:fs";
import { createRequire } from "node:module";
const require = createRequire("/Users/domi/Marketing-Maschine/apps/inbox/package.json");
const { createClient } = require("@supabase/supabase-js");
export const BASE = "https://tattooleadz-inbox.netlify.app";
export async function confirmUrl(next = "/postfach") {
  const env = Object.fromEntries(fs.readFileSync("/Users/domi/Marketing-Maschine/apps/inbox/.env.local", "utf8").split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => { const i = l.indexOf("="); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")]; }));
  const a = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data, error } = await a.auth.admin.generateLink({ type: "magiclink", email: "domenicschilling@gmail.com" });
  if (error) throw new Error("generateLink: " + error.message);
  return `${BASE}/auth/confirm?token_hash=${data.properties.hashed_token}&type=magiclink&next=${encodeURIComponent(next)}`;
}
