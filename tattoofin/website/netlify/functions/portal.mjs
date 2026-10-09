// Studio-Portal (eingeloggt per Session-Cookie)
//   GET    /api/portal                     Studio, Zahlungen, Abrechnungen, Kennzahlen
//   POST   /api/portal/zahlung             Zahlungslink erstellen { betrag, kunde, email, beschreibung, art }
//   DELETE /api/portal/zahlung/:id         offenen Zahlungslink stornieren
//   GET/POST /api/portal/fragebogen        Onboarding-Fragebogen
//   POST   /api/portal/kuendigung          { grund, garantie }
//   DELETE /api/portal/kuendigung          Kündigung zurücknehmen
//   POST   /api/portal/rechnungen          Stripe-Kundenportal (Tattoofin-Rechnungen)
//   PATCH  /api/portal/kontakt             Benachrichtigungs-E-Mail ändern
import { CFG, plattformgebuehr } from "./_lib/config.mjs";
import { json, fail, body, clean, id, now, handler, isEmail, parseBetrag } from "./_lib/util.mjs";
import { saveStudio, zahlungenVon, getZahlung, saveZahlung, abrechnungenVon, log } from "./_lib/store.mjs";
import { currentStudio } from "./_lib/auth.mjs";
import { stripe } from "./_lib/stripe.mjs";
import { notify, notifyAdmin, kuendigungsDatum, connectUrl, darfKassieren, STATUS } from "./_lib/domain.mjs";
import { mails } from "./_lib/emails.mjs";

const zahlseite = (s) => `${CFG.siteUrl}/zahlen.html?s=${s.slug}`;
const oeffentlich = (s) => ({
  id: s.id, firma: s.firma, inhaber: s.inhaber, email: s.email, telefon: s.telefon, studioTelefon: s.studioTelefon,
  strasse: s.strasse, plz: s.plz, ort: s.ort, modell: s.modell, zahlart: s.zahlart, preisNetto: s.preisNetto, slug: s.slug,
  status: s.status, statusText: STATUS[s.status] || s.status, createdAt: s.createdAt, goLiveAt: s.goLiveAt,
  vertrag: { version: s.vertrag?.version, akzeptiertAm: s.vertrag?.akzeptiertAm, name: s.vertrag?.name },
  kuendigung: s.kuendigung || null, fragebogenAm: s.fragebogen?.updatedAt || null,
  benachrichtigung: { email: s.benachrichtigungEmail || s.email },
  garantieBis: s.modell === "kauf" ? (s.goLiveAt ? new Date(new Date(s.goLiveAt).getTime() + CFG.garantieTage * 864e5).toISOString() : "ab Go-live") : null,
  stripe: { verbunden: Boolean(s.stripe?.accountId), freigegeben: Boolean(s.stripe?.chargesEnabled), auszahlungen: Boolean(s.stripe?.payoutsEnabled) },
  kannKassieren: Boolean(darfKassieren(s)), zahlseite: zahlseite(s), connectUrl: connectUrl(s),
});

export default handler(async (req) => {
  const s = await currentStudio(req);
  if (!s) return fail("Bitte einloggen", 401);
  const url = new URL(req.url);
  const [bereich, sub] = url.pathname.replace(/^\/api\/portal\/?/, "").split("/").filter(Boolean);

  if (!bereich && req.method === "GET") {
    const zahlungen = await zahlungenVon(s.id);
    const monat = new Date().toISOString().slice(0, 7);
    const bezahlt = zahlungen.filter((z) => z.status === "bezahlt");
    const imMonat = bezahlt.filter((z) => (z.bezahltAm || "").slice(0, 7) === monat);
    const q = (extra = "") => `studio=${encodeURIComponent(s.firma)}&tel=${encodeURIComponent(s.studioTelefon || "")}&zahlen=${encodeURIComponent(zahlseite(s))}${extra}`;
    return json({
      studio: oeffentlich(s), zahlungen, abrechnungen: await abrechnungenVon(s.id),
      kpis: {
        umsatzMonatCent: imMonat.reduce((a, z) => a + z.betragCent, 0), zahlungenMonat: imMonat.length,
        provisionMonatNettoCent: imMonat.reduce((a, z) => a + (z.gebuehrNettoCent || 0), 0),
        umsatzGesamtCent: bezahlt.reduce((a, z) => a + z.betragCent, 0), offen: zahlungen.filter((z) => z.status === "offen").length,
        anteilKlarna: bezahlt.length ? Math.round(100 * bezahlt.filter((z) => z.zahlart === "klarna").length / bezahlt.length) : 0,
      },
      materialien: `${CFG.materialsUrl}generator.html`,
      materialLinks: [
        ["20-fensteraufkleber", "Fensteraufkleber"], ["21-flyer-a6", "Flyer A6"], ["22-thekenaufsteller-a5", "Thekenaufsteller A5"],
        ["23-kundeninfo", "Kundeninfo"], ["24-social-kit", "Social-Kit (Story, Post, Badge)"],
      ].map(([n, titel]) => ({ name: n, titel, url: `${CFG.materialsUrl}${n}.html?${q()}` })),
      config: { provisionProzent: CFG.provisionProzent, ustProzent: CFG.ustProzent, garantieTage: CFG.garantieTage, minBetragCent: CFG.minBetragCent, maxBetragCent: CFG.maxBetragCent },
    });
  }

  if (bereich === "zahlung") {
    if (req.method === "POST" && !sub) {
      if (!darfKassieren(s)) return fail(s.stripe?.chargesEnabled ? "Dein Vertrag ist nicht aktiv." : "Dein Stripe-Konto ist noch nicht freigegeben. Sobald Stripe die Prüfung abgeschlossen hat, kannst du Zahlungslinks erstellen.", 409);
      const b = await body(req);
      const betragCent = parseBetrag(b.betrag);
      if (!(betragCent >= CFG.minBetragCent && betragCent <= CFG.maxBetragCent)) return fail(`Bitte einen Betrag zwischen ${CFG.minBetragCent / 100} € und ${CFG.maxBetragCent / 100} € eingeben.`);
      const email = clean(b.email, 160).toLowerCase();
      if (email && !isEmail(email)) return fail("Bitte eine gültige E-Mail-Adresse eingeben oder das Feld leer lassen.");
      const fee = plattformgebuehr(betragCent, s.modell);
      const z = {
        id: id("zl_"), studioId: s.id, createdAt: now(), art: b.art === "anzahlung" ? "anzahlung" : "gesamt", status: "offen",
        betragCent, kunde: clean(b.kunde, 80), email, beschreibung: clean(b.beschreibung, 120) || "Tattoo-Projekt",
        gebuehrNettoCent: fee.nettoCent, gebuehrBruttoCent: fee.bruttoCent,
      };
      await saveZahlung(z);
      const link = `${CFG.siteUrl}/zahlung.html?z=${z.id}`;
      const text = `Hi ${z.kunde ? z.kunde.split(" ")[0] : ""}, hier ist dein Zahlungslink für ${z.beschreibung} (${(betragCent / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })} €): ${link} . Beim Bezahlen siehst du, welche Zahlungsoptionen dir angeboten werden. Liebe Grüße, ${s.firma}`;
      await log("zahlungslink", { studioId: s.id, zahlungId: z.id, betragCent });
      return json({ zahlung: z, link, whatsappText: text }, 201);
    }
    if (req.method === "DELETE" && sub) {
      const z = await getZahlung(s.id, sub);
      if (!z) return fail("Nicht gefunden", 404);
      if (z.status !== "offen" && z.status !== "abgebrochen") return fail("Nur offene Zahlungslinks können storniert werden.");
      z.status = "storniert"; z.storniertAm = now();
      await saveZahlung(z);
      return json(z);
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
      const garantie = Boolean(b.garantie) && s.modell === "kauf" && s.stripe?.paymentIntentId &&
        (!s.goLiveAt || Date.now() - new Date(s.goLiveAt).getTime() <= CFG.garantieTage * 864e5);
      s.kuendigung = { eingegangenAm: now(), zum: garantie ? now() : kuendigungsDatum(), grund: clean(b.grund, 1000), garantie: Boolean(garantie), vorherStatus: s.status };
      s.status = "gekuendigt";
      await saveStudio(s);
      await log("kuendigung", { studioId: s.id, garantie });
      if (garantie) await notifyAdmin("⚠️ Garantie-Erstattung angefordert: bitte im Admin erstatten", s, { Grund: s.kuendigung.grund });
      else {
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

  if (bereich === "rechnungen" && req.method === "POST") {
    const ps = await stripe("POST", "/billing_portal/sessions", { customer: s.stripe.customerId, return_url: `${CFG.siteUrl}/portal.html#konto`, locale: "de" });
    return json({ url: ps.url });
  }

  if (bereich === "kontakt" && req.method === "PATCH") {
    const b = await body(req);
    if (b.email !== undefined) { if (!isEmail(b.email)) return fail("Bitte gültige E-Mail"); s.benachrichtigungEmail = clean(b.email, 160); }
    await saveStudio(s);
    return json(oeffentlich(s));
  }

  return fail("Nicht gefunden", 404);
});

export const config = { path: ["/api/portal", "/api/portal/*"] };
