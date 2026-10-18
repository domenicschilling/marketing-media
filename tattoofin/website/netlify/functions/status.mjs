// GET /api/status – öffentlicher Kurzstatus für Überwachung (Ultron-Website-Wächter, Uptime-Dienste).
// 200 = letzter stündlicher Check ok, 503 = Störung (oder Check seit über 3 Stunden nicht gelaufen).
// Enthält keine Personendaten, nur die Namen der fehlerhaften Prüfungen.
import { json, handler } from "./_lib/util.mjs";
import { store } from "./_lib/store.mjs";
import { warteschlangeStatus } from "./_lib/mail.mjs";

export default handler(async () => {
  const g = await store.get("meta/gesundheit");
  const w = await warteschlangeStatus();
  const alt = !g?.am || Date.now() - new Date(g.am).getTime() > 3 * 3600e3;
  const ok = Boolean(g?.ok) && !alt;
  return json({
    ok, letzterCheck: g?.am || null, veraltet: alt,
    stoerungen: (g?.fehler || []).map((f) => f.split(":")[0]),
    mailWarteschlange: w.anzahl, mailWege: w.wege,
  }, ok ? 200 : 503, { "Cache-Control": "no-store" });
});

export const config = { path: "/api/status" };
