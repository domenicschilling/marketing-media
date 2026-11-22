// Simuliert Kundengespräche mit dem Isto-Agenten – exakt mit den Bausteinen des Echtbetriebs
// (buildSystem, historyToMessages, contextNote, runEngine, buildTools, guardReply, KI-Hinweis), ohne DB, ohne Senden.
// Der Kunde wird von Claude gespielt (Persona je Szenario).
// Aufruf (cwd = apps/inbox im Worktree):
//   npx tsx --env-file=.env.local /Users/domi/Marketing-Maschine/content/kunden/isto-tattoo/demo-bot/simulate.mts [szenario-ids,…] [--out DIR]
import { writeFileSync, mkdirSync } from "node:fs";
const INBOX = "/Users/domi/Marketing-Maschine/.claude/worktrees/tattooleadz-app-5bee8e/apps/inbox/src/lib/ai";
const { buildSystem, contextNote, historyToMessages } = await import(`${INBOX}/prompt.ts`);
const { aiClient, runEngine } = await import(`${INBOX}/engine.ts`);
const { buildTools } = await import(`${INBOX}/tools.ts`);
const { guardReply, isSilence, wantsHuman } = await import(`${INBOX}/decide.ts`);
const { allowedSource } = await import(`${INBOX}/knowledge.ts`);
const { dryEffects } = await import(`${INBOX}/store.ts`);
const { withAiNotice } = await import(`${INBOX}/run.ts`);
const { ISTO_AGENT } = await import("./agent.mts");
const { TEMPLATE_TEXT, fillTemplate } = await import("./template.mts");
const { SCENARIOS } = await import("./scenarios.mts");

const args = process.argv.slice(2);
const outDir = args.includes("--out") ? args[args.indexOf("--out") + 1] : "/private/tmp/claude-501/-Users-domi-Marketing-Maschine/e206bac9-507b-4026-a601-eb3c097160ab/scratchpad/isto-sim";
const only = args.find((a) => !a.startsWith("--") && a !== outDir)?.split(",");
mkdirSync(outDir, { recursive: true });

const agent = { id: "sim", public_id: "ag_sim", workspace_id: "sim", active: true, auto_reply: true, channel_ids: [], ...ISTO_AGENT };
const WORKSPACE = "Isto Tattoo";
const LOCALE = "en";
const client = aiClient();

type Turn = { from: "customer" | "agent" | "template"; text: string; meta?: Record<string, unknown> };

async function customerSays(persona: string, turns: Turn[]): Promise<string> {
  const convo = turns.map((t) => `${t.from === "customer" ? "YOU" : "STUDIO"}: ${t.text}`).join("\n\n");
  const res = await client.messages.create({
    model: "claude-sonnet-5-5",
    max_tokens: 400,
    system: `You role-play a real person chatting on WhatsApp with a tattoo studio's assistant. Stay fully in character.\n\nPERSONA:\n${persona}\n\nRules: write ONE short WhatsApp message (like a real person: casual, sometimes brief, typos ok). Answer what you were asked according to your persona. Never mention that you are role-playing. If the studio clearly ended the conversation (said goodbye / team will get back), reply with exactly END or a very short thanks.`,
    messages: [{ role: "user", content: `Conversation so far:\n\n${convo}\n\nWrite your next WhatsApp message now (only the message text).` }],
  });
  const t = res.content.find((b: { type: string }) => b.type === "text") as { text: string } | undefined;
  return (t?.text ?? "").trim();
}

async function agentReplies(turns: Turn[], fields: Record<string, string>, labels: string[], replyCount: number) {
  const history = turns.map((t, i) => ({
    id: String(i), direction: t.from === "customer" ? "inbound" : "outbound",
    sender_type: t.from === "customer" ? "contact" : t.from === "template" ? "api" : "ai",
    type: t.from === "template" ? "template" : "text", body: t.text, created_at: new Date().toISOString(), status: "sent",
  }));
  // Vor-Prüfung wie preDecide (Mensch-Wunsch)
  const pending = turns.slice(turns.map((t) => t.from).lastIndexOf("agent") + 1).filter((t) => t.from === "customer").map((t) => t.text).join("\n");
  if (wantsHuman(pending)) return { text: null, decision: "handover", reason: "preDecide: Kunde möchte Menschen", calls: [] as unknown[] };
  if (replyCount >= agent.max_replies) return { text: null, decision: "handover", reason: "max_replies", calls: [] };
  const env = {
    agent, contact: { first_name: "Test", last_name: null, profile_name: null, phone_e164: "+490000000000" },
    effects: dryEffects({ fields, labels }), booking: null, calls: [] as unknown[], handover: null as null | { reason: string }, booked: false, facts: [] as string[],
    transcript: history,
  };
  const messages = historyToMessages(history);
  messages.push({ role: "system", content: contextNote({ now: new Date(), timezone: "Europe/Berlin", contactName: null, knownFields: fields, windowHoursLeft: 23, replyCount, maxReplies: agent.max_replies, trigger: "auto", lastIsOurs: false }) });
  const res = await runEngine({ client, model: agent.model, system: buildSystem(agent, WORKSPACE), tools: buildTools(agent, null), messages, env });
  let text: string | null = isSilence(res.text) ? null : res.text;
  let reason: string | null = env.handover?.reason ?? null;
  if (res.refused) reason = "refused"; else if (res.exhausted) reason = "exhausted";
  if (text) {
    const bad = guardReply({ text, neverInvent: agent.never_invent, allowedSource: [allowedSource(agent), ...env.facts].join("\n"), booked: false });
    if (bad) { reason = `GUARD: ${bad} – blockiert: „${text}“`; text = null; }
  }
  if (text) text = withAiNotice(text, history, LOCALE);
  return { text, decision: reason ? "handover" : text ? "reply" : "silent", reason, calls: env.calls };
}

const results: unknown[] = [];
for (const sc of SCENARIOS.filter((s: { id: string }) => !only || only.includes(s.id))) {
  const turns: Turn[] = [{ from: "template", text: fillTemplate(sc.form) }];
  const fields: Record<string, string> = {};
  const labels: string[] = [];
  let replies = 0;
  let ended = "";
  let costIn = 0;
  // erster Kundenschritt: Knopf oder freie Antwort
  turns.push({ from: "customer", text: sc.first ?? (await customerSays(sc.persona, turns)) });
  for (let i = 0; i < (sc.maxTurns ?? 14); i++) {
    const r = await agentReplies(turns, fields, labels, replies);
    if (r.text) { turns.push({ from: "agent", text: r.text, meta: { calls: r.calls } }); replies++; }
    if (r.decision === "handover") { ended = `HANDOVER: ${r.reason}`; if (!r.text) turns.push({ from: "agent", text: "(Übergabetext Standard)", meta: { reason: r.reason } }); break; }
    if (r.decision === "silent") { ended = "SILENT"; break; }
    const next = await customerSays(sc.persona, turns);
    if (!next || next === "END") { ended = "Kunde beendet"; break; }
    turns.push({ from: "customer", text: next });
  }
  const out = { id: sc.id, title: sc.title, expect: sc.expect, ended, fields, labels, turns };
  results.push(out);
  const md = [`# ${sc.id} – ${sc.title}`, `Erwartung: ${sc.expect}`, `Ende: ${ended}`, `Felder: ${JSON.stringify(fields)}`, `Labels: ${labels.join(", ")}`, "",
    ...turns.map((t) => `**${t.from === "customer" ? "KUNDE" : t.from === "template" ? "VORLAGE" : "BOT"}:** ${t.text}${t.meta?.calls && (t.meta.calls as unknown[]).length ? `\n  _Werkzeuge: ${(t.meta.calls as { name: string; input: unknown }[]).map((c) => `${c.name} ${JSON.stringify(c.input)}`).join(" | ")}_` : ""}`)].join("\n\n");
  writeFileSync(`${outDir}/${sc.id}.md`, md);
  console.log(`✓ ${sc.id} (${turns.length} Nachrichten) – ${ended} – Labels [${labels.join(", ")}]`);
  void costIn;
}
writeFileSync(`${outDir}/alle.json`, JSON.stringify(results, null, 2));
console.log(`\nFertig: ${outDir}`);
