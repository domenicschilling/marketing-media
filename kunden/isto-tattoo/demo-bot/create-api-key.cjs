// Legt einen API-Schlüssel (ik_live_…) für den Workspace meta-pruefung an – nur Hash in der DB, Klartext in eine Datei mit 600-Rechten.
// Aufruf: node --env-file=<apps/inbox/.env.local> create-api-key.cjs <ausgabe-datei>
const crypto = require("crypto");
const fs = require("fs");
const out = process.argv[2];
const key = `ik_live_${crypto.randomBytes(24).toString("base64url")}`;
const row = { workspace_id: "236be6c7-33a7-4a7c-b34d-1e608d6c03d0", name: "Make – Isto Demo", prefix: key.slice(0, 12), key_hash: crypto.createHash("sha256").update(key).digest("hex") };
const k = process.env.SUPABASE_SERVICE_ROLE_KEY;
fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/api_keys`, {
  method: "POST", headers: { apikey: k, Authorization: `Bearer ${k}`, "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify(row),
}).then(async (r) => {
  const t = await r.text();
  if (!r.ok) { console.error("Fehler", r.status, t.slice(0, 300)); process.exit(1); }
  fs.writeFileSync(out, key, { mode: 0o600 });
  console.log("ok, Präfix", row.prefix, "→", out);
});
