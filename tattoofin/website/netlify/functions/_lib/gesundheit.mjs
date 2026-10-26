// Stündlicher Gesundheits-Check (nur lesend, außer: Stripe-Status offener Konten wird abgeglichen).
// Prüft: Startseite, /api/login (Antwort), Zahlseite eines Test-Studios (Seite + API), Mail-Warteschlange.
// Ergebnis in meta/gesundheit (Admin-Hinweis, /api/status). Bei Fehler: Admin-Mail, höchstens alle 6 Stunden
// bzw. sofort, wenn sich die Fehlerliste ändert. /api/status antwortet dann mit 503 → Ultron-Website-Wächter schlägt Alarm.
import { CFG } from "./config.mjs";
import { store, allStudios, studioBy } from "./store.mjs";
import { warteschlangeStatus, sendMail } from "./mail.mjs";
import { stripe } from "./stripe.mjs";
import { kontoAbgleichen } from "./domain.mjs";
import { mails } from "./emails.mjs";

const TEST_SLUG_STANDARD = "dsx-media-solutions-ug-haftungsbeschraen";
// Zahlseite, die der Check prüft: TF_TEST_SLUG bzw. das interne DSX-Teststudio. Wird dieses Studio einmal gelöscht/umbenannt
// (Aufräumen im Admin), nimmt der Check das erste Studio mit freigegebenem Konto – sonst gäbe es dauerhaft falschen Alarm (503).
async function testSlug() {
  if (process.env.TF_TEST_SLUG) return process.env.TF_TEST_SLUG; // ausdrücklich gesetzt: genau diese Seite prüfen
  const wunsch = TEST_SLUG_STANDARD;
  if (await studioBy("slug", wunsch)) return wunsch;
  const ersatz = (await allStudios()).find((s) => s.slug && s.stripe?.chargesEnabled && ["live", "einrichtung"].includes(s.status));
  return ersatz?.slug || wunsch;
}
const MAIL_ALARM_MIN = 30;   // Mails, die länger als 30 Minuten hängen, gelten als Störung

async function abruf(url, opts = {}) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15000), headers: { "user-agent": "Tattoofin-Gesundheit/1.0", ...(opts.headers || {}) }, ...opts });
    return { ok: r.ok, code: r.status, ms: Date.now() - t0, text: await r.text() };
  } catch (e) { return { ok: false, code: 0, ms: Date.now() - t0, text: "", fehler: e.cause?.code || e.message }; }
}

export async function gesundheitPruefen({ basis = CFG.siteUrl, mailen = true } = {}) {
  const fehler = [], details = {};
  const pruefe = async (name, fn) => { try { const r = await fn(); details[name] = r; if (r !== true && r?.ok !== true) fehler.push(`${name}: ${r?.grund || "Fehler"}`); } catch (e) { details[name] = { ok: false, grund: e.message }; fehler.push(`${name}: ${e.message}`); } };

  await pruefe("Startseite", async () => {
    const r = await abruf(basis + "/");
    return { ok: r.ok && /Tattoofin/.test(r.text), ms: r.ms, grund: r.ok ? "Inhalt fehlt" : `HTTP ${r.code || r.fehler}` };
  });
  await pruefe("Login-API", async () => {
    const r = await abruf(basis + "/api/login", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    let j = {}; try { j = JSON.parse(r.text); } catch { /* leer */ }
    return { ok: r.ok && j.ok === true, ms: r.ms, grund: `HTTP ${r.code || r.fehler}` };
  });
  await pruefe("Zahlseite", async () => {
    const slug = await testSlug();
    const seite = await abruf(`${basis}/zahlen/${slug}`);
    const api = await abruf(`${basis}/api/pay?s=${encodeURIComponent(slug)}`);
    let j = {}; try { j = JSON.parse(api.text); } catch { /* leer */ }
    return { ok: seite.ok && api.ok && Boolean(j.studio?.firma), ms: seite.ms + api.ms, grund: !seite.ok ? `Seite HTTP ${seite.code || seite.fehler}` : `API HTTP ${api.code || api.fehler}` };
  });
  await pruefe("Mails", async () => {
    const w = await warteschlangeStatus();
    const min = w.aeltesteSeit ? Math.round((Date.now() - new Date(w.aeltesteSeit).getTime()) / 60000) : 0;
    return { ok: !(w.anzahl > 0 && min >= MAIL_ALARM_MIN), anzahl: w.anzahl, minuten: min, wege: w.wege, grund: `${w.anzahl} in der Warteschlange, älteste seit ${min} Min.` };
  });

  // Stripe-Status offener Konten abgleichen (falls der Connect-Webhook ausfällt)
  const konten = [];
  if (!CFG.vorschau) {
    for (const s of await allStudios()) {
      if (!s.stripe?.accountId || s.stripe.chargesEnabled || ["abgebrochen", "gekuendigt", "erstattet"].includes(s.status)) continue;
      try { await kontoAbgleichen(s, await stripe("GET", "/accounts/" + s.stripe.accountId)); konten.push({ id: s.id, freigegeben: Boolean(s.stripe.chargesEnabled) }); }
      catch (e) { konten.push({ id: s.id, fehler: e.message.slice(0, 120) }); }
    }
  }

  const ergebnis = { ok: fehler.length === 0, am: new Date().toISOString(), fehler, details, konten };
  await store.set("meta/gesundheit", ergebnis);

  if (!ergebnis.ok && mailen && CFG.adminEmail) {
    const sig = fehler.map((f) => f.split(":")[0]).sort().join("|");
    const zuletzt = await store.get("meta/gesundheit-mail");
    if (!zuletzt || zuletzt.sig !== sig || Date.now() - new Date(zuletzt.am).getTime() > 6 * 3600e3) {
      await store.set("meta/gesundheit-mail", { sig, am: ergebnis.am });
      const m = mails.intern("⚠️ Gesundheits-Check: Störung auf tattoofin.de", null, Object.fromEntries(fehler.map((f, i) => [`Problem ${i + 1}`, f])));
      // Direkt senden (nicht über notifyAdmin, das hat eine eigene Drossel); landet bei Mailstörung in der Warteschlange
      await sendMail({ to: CFG.adminEmail, subject: m.subject, html: m.html, text: m.text });
    }
  }
  return ergebnis;
}
