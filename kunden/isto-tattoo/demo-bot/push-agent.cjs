// Legt den Isto-Agenten im Workspace meta-pruefung an bzw. aktualisiert ihn (Inhalte aus agent.mts via isto-agent.json).
// Aufruf: node --env-file=<apps/inbox/.env.local> push-agent.cjs <agent.json> [ag_public_id]  (ohne ID = neu anlegen, aus)
// Schalter active/auto_reply werden hier NIE geändert.
const fs = require("fs");
const [file, publicId] = process.argv.slice(2);
const a = JSON.parse(fs.readFileSync(file, "utf8"));
const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/ai_agents`;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" };
const row = {
  name: a.name, model: a.model, role: a.role, tone: a.tone, knowledge: a.knowledge, faq: a.faq, facts: a.facts, rules: a.rules,
  never_invent: a.never_invent, handover: a.handover, schedule: a.schedule, business_hours: a.business_hours, max_replies: a.max_replies,
  debounce_seconds: a.debounce_seconds, tools: a.tools, lead_fields: a.lead_fields, settings: a.settings,
};
(async () => {
  const r = publicId
    ? await fetch(`${base}?public_id=eq.${publicId}`, { method: "PATCH", headers, body: JSON.stringify(row) })
    : await fetch(base, { method: "POST", headers, body: JSON.stringify({ ...row, workspace_id: "236be6c7-33a7-4a7c-b34d-1e608d6c03d0", channel_ids: ["5328b98a-2196-4bee-9a7d-0b789df0fe15"], active: false, auto_reply: false }) });
  const t = await r.text();
  if (!r.ok) { console.error("Fehler", r.status, t.slice(0, 500)); process.exit(1); }
  const d = JSON.parse(t)[0];
  console.log("ok", d.public_id, "aktiv:", d.active, "auto:", d.auto_reply, "geändert:", d.updated_at);
})();
