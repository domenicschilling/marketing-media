// WhatsApp-Vorlage (englisch) – erste Nachricht nach dem Formular. Variablen: 1 Vorname, 2 Idee (gekürzt, ohne Zeilenumbrüche), 3 Körperstelle, 4 Start.
export const TEMPLATE_NAME = "isto_project_request_en";
export const TEMPLATE_BODY = `Hi {{1}}, thanks for your project request at Isto Tattoo! 🖤

Your idea: {{2}}
Placement: {{3}} · Start: {{4}}

I'm Isto's digital assistant. I'll ask you a few short questions so Michalis can prepare your free project check. Ready to start?`;
export const TEMPLATE_BUTTONS = ["Yes, let's start", "I have a question"];

export type Form = { vorname: string; idee: string; koerperstelle: string; start: string };

/** Variablen wie Make sie setzt: Zeilenumbrüche/Tabs → Leerzeichen, max. 4 Leerzeichen am Stück, Idee max. 200 Zeichen. */
export function cleanVar(s: string, max = 200): string {
  const t = s.replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

export function fillTemplate(f: Form): string {
  const vals = [cleanVar(f.vorname, 40), cleanVar(f.idee), cleanVar(f.koerperstelle, 60), cleanVar(f.start, 40)];
  return TEMPLATE_BODY.replace(/\{\{(\d)\}\}/g, (_, n) => vals[Number(n) - 1]) + `\n[Buttons: ${TEMPLATE_BUTTONS.join(" | ")}]`;
}
export const TEMPLATE_TEXT = TEMPLATE_BODY;
