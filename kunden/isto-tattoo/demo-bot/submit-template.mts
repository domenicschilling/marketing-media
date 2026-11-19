// Reicht die englische Isto-Vorlage bei Meta ein (Kanal Meta-Testnummer, Workspace meta-pruefung) – über dieselbe Funktion wie die Oberfläche.
// Aufruf (cwd = apps/inbox im Worktree): npx tsx --env-file=/Users/domi/Marketing-Maschine/apps/inbox/.env.local <diese Datei> [--apply]
const SRC = "/Users/domi/Marketing-Maschine/.claude/worktrees/tattooleadz-app-5bee8e/apps/inbox/src/lib";
const { createClient } = await import("/Users/domi/Marketing-Maschine/.claude/worktrees/tattooleadz-app-5bee8e/apps/inbox/node_modules/@supabase/supabase-js/dist/index.mjs");
const { submitTemplate } = await import(`${SRC}/messaging/templates-manage.ts`);
const { validateTemplateDraft } = await import(`${SRC}/whatsapp/template-draft.ts`);
const { TEMPLATE_NAME, TEMPLATE_BODY, TEMPLATE_BUTTONS } = await import("./template.mts");

const draft = {
  name: TEMPLATE_NAME,
  language: "en",
  category: "UTILITY",
  header: { format: "NONE" },
  body: TEMPLATE_BODY,
  bodyExamples: ["Sophie", "Ornamental sleeve with mandala elements and geometric lines", "Sleeve", "In 1–3 months"],
  footer: "",
  buttons: TEMPLATE_BUTTONS.map((text: string) => ({ type: "QUICK_REPLY", text })),
};
const check = validateTemplateDraft(draft);
console.log("Prüfung:", check.ok ? "ok" : check.errors);
if (!check.ok || !process.argv.includes("--apply")) process.exit(check.ok ? 0 : 1);

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const { data: channel, error } = await db.from("channels").select("*").eq("public_id", "mc_dDlvgZb5Iaa9RGsugXUFT").single();
if (error) throw new Error(error.message);
const r = await submitTemplate(db, channel, draft);
console.log("eingereicht:", r);
