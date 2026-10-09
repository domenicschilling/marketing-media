// Studio-Portal (eingeloggt per Session-Cookie)
//   GET    /api/portal                    Studio, Anfragen, Abrechnungen, Vorschau
//   PATCH  /api/portal/anfrage/:id        { status, terminDatum, preisNetto, notiz }
//   POST   /api/portal/anfrage            Anfrage nachtragen, die über Ted kam, aber fehlt
//   GET/POST /api/portal/fragebogen       Onboarding-Fragebogen
//   POST   /api/portal/kuendigung         { grund, garantie }
//   DELETE /api/portal/kuendigung         Kündigung zurücknehmen
//   POST   /api/portal/zahlung            Link zum Stripe-Kundenportal (Zahlungsmethode, Rechnungen)
//   PATCH  /api/portal/kontakt            Benachrichtigungs-E-Mail / WhatsApp ändern
import { CFG } from "./_lib/config.mjs";
import { json, fail, body, clean, id, now, handler, isEmail } from "./_lib/util.mjs";
import { saveStudio, anfragenVon, getAnfrage, saveAnfrage, abrechnungenVon, log } from "./_lib/store.mjs";
import { currentStudio } from "./_lib/auth.mjs";
import { stripe } from "./_lib/stripe.mjs";
import { notify, notifyAdmin, kuendigungsDatum, provisionFuerMonat, mehrminuten, STATUS } from "./_lib/domain.mjs";
import { mails } from "./_lib/emails.mjs";

const oeffentlich = (s) => ({
  id: s.id, firma: s.firma, inhaber: s.inhaber, email: s.email, telefon: s.telefon, studioTelefon: s.studioTelefon,
  strasse: s.strasse, plz: s.plz, ort: s.ort, modell: s.modell, zahlart: s.zahlart, preisNetto: s.preisNetto,
  status: s.status, statusText: STATUS[s.status] || s.status, createdAt: s.createdAt, goLiveAt: s.goLiveAt,
  tedNummer: s.tedNummer || "", vertrag: { version: s.vertrag?.version, akzeptiertAm: s.vertrag?.akzeptiertAm, name: s.vertrag?.name },
  kuendigung: s.kuendigung || null, fragebogenAm: s.fragebogen?.updatedAt || null, minuten: s.minuten || {},
  benachrichtigung: { email: s.benachrichtigungEmail || s.email, whatsapp: s.whatsapp || s.telefon },
  garantieBis: s.modell === "kauf" ? (s.goLiveAt ? new Date(new Date(s.goLiveAt).getTime() + CFG.garantieTage * 864e5).toISOString() : "ab Go-live") : null,
  zahlungsmethode: Boolean(s.stripe?.paymentMethod),
});

export default handler(async (req) => {
  const s = await currentStudio(req);
  if (!s) return fail("Bitte einloggen", 401);
  const url = new URL(req.url);
  const teile = url.pathname.replace(/^\/api\/portal\/?/, "").split("/").filter(Boolean);
  const [bereich, sub] = teile;

  if (!bereich && req.method === "GET") {
    const anfragen = await anfragenVon(s.id);
    const jetzt = new Date();
    const monat = jetzt.toISOString().slice(0, 7);
    const vormonat = new Date(Date.UTC(jetzt.getUTCFullYear(), jetzt.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
    const vorschau = s.modell === "provision" ? {
      [monat]: await provisionFuerMonat(s, monat),
      [vormonat]: await provisionFuerMonat(s, vormonat),
    } : null;
    return json({
      studio: oeffentlich(s), anfragen, abrechnungen: await abrechnungenVon(s.id), vorschau,
      minuten: mehrminuten(s, monat),
      materialien: `${CFG.materialsUrl}generator.html`,
      materialLinks: ["20-fensteraufkleber", "21-flyer-a6", "22-thekenaufsteller-a5", "24-tuerschild-a4", "23-datenschutzhinweis-anrufer"].map((n) => ({
        name: n, url: `${CFG.materialsUrl}${n}.html?studio=${encodeURIComponent(s.firma)}&tel=${encodeURIComponent(s.studioTelefon || "")}&adresse=${encodeURIComponent(`${s.strasse}, ${s.plz} ${s.ort}`)}&email=${encodeURIComponent(s.email)}`,
      })),
      config: { provisionProzent: CFG.provisionProzent, fairUseMinuten: CFG.fairUseMinuten, meldeTag: CFG.meldeTag, garantieTage: CFG.garantieTage, zuordnungMonate: CFG.zuordnungMonate, nachlaufMonate: CFG.nachlaufMonate },
    });
  }

  if (bereich === "anfrage") {
    if (req.method === "POST" && !sub) {
      const b = await body(req);
      const a = {
        id: id("an_"), studioId: s.id, createdAt: b.datum ? new Date(b.datum).toISOString() : now(), quelle: "manuell",
        name: clean(b.name, 80), nummer: clean(b.nummer, 40), motiv: clean(b.motiv, 300), status: "offen",
      };
      await saveAnfrage(a);
      return json(a, 201);
    }
    if (req.method === "PATCH" && sub) {
      const a = await getAnfrage(s.id, sub);
      if (!a) return fail("Anfrage nicht gefunden", 404);
      if (a.abgerechnet) return fail("Diese Anfrage ist bereits abgerechnet und kann nicht mehr geändert werden.", 409);
      const b = await body(req);
      if (b.status && !["offen", "gebucht", "kein_termin"].includes(b.status)) return fail("Ungültiger Status");
      if (b.status) a.status = b.status;
      if (b.terminDatum !== undefined) a.terminDatum = /^\d{4}-\d{2}-\d{2}$/.test(b.terminDatum) ? b.terminDatum : null;
      if (b.preisNetto !== undefined) {
        const n = Number(String(b.preisNetto).replace(/\./g, "").replace(",", "."));
        if (b.preisNetto !== "" && (!isFinite(n) || n < 0 || n > 100000)) return fail("Bitte einen gültigen Preis eintragen.");
        a.preisNettoCent = b.preisNetto === "" ? null : Math.round(n * 100);
      }
      if (b.notiz !== undefined) a.notiz = clean(b.notiz, 500);
      if (a.status === "gebucht" && s.modell === "provision" && (!a.terminDatum || !a.preisNettoCent)) return fail("Für gebuchte Termine bitte Datum und Preis eintragen.");
      a.gemeldetAm = now();
      await saveAnfrage(a);
      return json(a);
    }
  }

  if (bereich === "fragebogen") {
    if (req.method === "GET") return json(s.fragebogen || {});
    if (req.method === "POST") {
      const b = await body(req);
      const erstes = !s.fragebogen;
      const daten = {};
      for (const [k, v] of Object.entries(b || {})) if (typeof v === "string" || typeof v === "boolean") daten[clean(k, 60)] = typeof v === "string" ? clean(v, 4000) : v;
      s.fragebogen = { ...daten, updatedAt: now() };
      if (daten.dringend_nummer) s.dringendNummer = daten.dringend_nummer;
      await saveStudio(s);
      if (erstes) await notify(s, mails.fragebogen(s));
      await notifyAdmin(erstes ? "Fragebogen eingegangen" : "Fragebogen geändert", s, daten);
      return json({ ok: true });
    }
  }

  if (bereich === "kuendigung") {
    if (req.method === "POST") {
      if (["gekuendigt", "beendet", "erstattet"].includes(s.status)) return fail("Der Vertrag ist bereits gekündigt.");
      const b = await body(req);
      const garantie = Boolean(b.garantie) && s.modell === "kauf" &&
        (!s.goLiveAt || Date.now() - new Date(s.goLiveAt).getTime() <= CFG.garantieTage * 864e5);
      s.kuendigung = { eingegangenAm: now(), zum: garantie ? now() : kuendigungsDatum(), grund: clean(b.grund, 1000), garantie, vorherStatus: s.status };
      s.status = "gekuendigt";
      await saveStudio(s);
      await log("kuendigung", { studioId: s.id, garantie });
      if (garantie) {
        await notifyAdmin("⚠️ Garantie-Erstattung angefordert: bitte im Admin erstatten", s, { Grund: s.kuendigung.grund });
      } else {
        await notify(s, mails.kuendigung(s, { zum: s.kuendigung.zum }));
        await notifyAdmin("Kündigung eingegangen", s, { zum: s.kuendigung.zum, Grund: s.kuendigung.grund });
      }
      return json(oeffentlich(s));
    }
    if (req.method === "DELETE") {
      if (s.status !== "gekuendigt" || s.kuendigung?.garantie) return fail("Keine offene Kündigung, die zurückgenommen werden kann.");
      s.status = s.kuendigung.vorherStatus || (s.goLiveAt ? "live" : "einrichtung");
      s.kuendigungHistorie = [...(s.kuendigungHistorie || []), { ...s.kuendigung, zurueckgenommenAm: now() }];
      s.kuendigung = null;
      await saveStudio(s);
      await notify(s, mails.kuendigungZurueck(s));
      await notifyAdmin("Kündigung zurückgenommen", s, {});
      return json(oeffentlich(s));
    }
  }

  if (bereich === "zahlung" && req.method === "POST") {
    const ps = await stripe("POST", "/billing_portal/sessions", { customer: s.stripe.customerId, return_url: `${CFG.siteUrl}/portal.html#zahlung`, locale: "de" });
    return json({ url: ps.url });
  }

  if (bereich === "kontakt" && req.method === "PATCH") {
    const b = await body(req);
    if (b.email !== undefined) { if (!isEmail(b.email)) return fail("Bitte gültige E-Mail"); s.benachrichtigungEmail = clean(b.email, 160); }
    if (b.whatsapp !== undefined) s.whatsapp = clean(b.whatsapp, 40);
    await saveStudio(s);
    return json(oeffentlich(s));
  }

  return fail("Nicht gefunden", 404);
});

export const config = { path: ["/api/portal", "/api/portal/*"] };
