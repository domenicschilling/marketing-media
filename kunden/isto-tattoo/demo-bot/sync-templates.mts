// Holt den Vorlagen-Status des Meta-Testkanals (wie Knopf „Von Meta holen“).
// Aufruf (cwd = apps/inbox im Worktree): npx tsx --env-file=/Users/domi/Marketing-Maschine/apps/inbox/.env.local <diese Datei>
const BASE = "/Users/domi/Marketing-Maschine/.claude/worktrees/tattooleadz-app-5bee8e/apps/inbox";
const { createClient } = await import(`${BASE}/node_modules/@supabase/supabase-js/dist/index.mjs`);
const { syncTemplates } = await import(`${BASE}/src/lib/messaging/templates-sync.ts`);
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const { data: channel, error } = await db.from("channels").select("*").eq("public_id", "mc_dDlvgZb5Iaa9RGsugXUFT").single();
if (error) throw new Error(error.message);
await syncTemplates(db, channel);
const { data } = await db.from("templates").select("public_id,name,status,category,rejected_reason").eq("workspace_id", channel.workspace_id);
console.log(data);
