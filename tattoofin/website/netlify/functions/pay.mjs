// Öffentliche Zahlungs-Endpunkte für Endkunden der Studios
//   GET  /api/pay?z=<zahlungId>[&abgleich=1]   Infos zum Zahlungslink (abgleich: Status bei Stripe nachsehen, für /bezahlt.html)
//   GET  /api/pay?s=<studioSlug>               Infos zur Zahlseite des Studios (tattoofin.de/zahlen/<slug>)
//   POST /api/pay { z, inhaltOk, bedingungen }                                       Zahlung für einen Zahlungslink starten
//   POST /api/pay { s, betrag, kunde, email, beschreibung, sitzungen, anzahlung, inhaltOk, bedingungen }  Zahlung über die Zahlseite
// Antwort: { clientSecret, publishableKey, stripeAccount, simulation } → eingebettetes Bezahlfeld auf tattoofin.de
//      oder { url } → Weiterleitung zum Stripe-Checkout (Standard live, solange TF_BEZAHLFELD nicht „an“ ist – siehe domain.mjs)
// Absicherung fürs Studio (Rechtsprüfung durch Anwalt empfohlen): Der Kunde bestätigt vor dem Bezahlen per Häkchen den Inhalt
// (Studio, Motiv/Projekt, Sitzungen, Betrag) und bei Anzahlungen die Anzahlungsbedingungen. Gespeichert mit Zeitstempel.
import { CFG, BAUSTEINE_SIMULIERT } from "./_lib/config.mjs";
import { json, fail, body, clean, id, now, handler, isEmail, parseBetrag, euro, clientIp } from "./_lib/util.mjs";
import { getStudio, studioBy, zahlungBy, saveZahlung } from "./_lib/store.mjs";
import { checkoutFuer, bezahlfeldFuer, darfKassieren, anzahlungsbedingungen, istAnzahlung, bezahlfeld, zahlungBezahlt, plattformKassiert, klarnaVersuch, zahlartenFuer, notify } from "./_lib/domain.mjs";
import { mails } from "./_lib/emails.mjs";
import { log } from "./_lib/store.mjs";
import { stripe } from "./_lib/stripe.mjs";
import { brandingOeffentlich } from "./_lib/branding.mjs";

const studioInfo = (s) => ({ firma: s.firma, ort: s.ort, slug: s.slug, aktiv: Boolean(darfKassieren(s)), anzahlungsbedingungen: anzahlungsbedingungen(s), branding: brandingOeffentlich(s) });
const NICHT_BESTAETIGT = "Bitte bestätige die Anzahlungsbedingungen des Studios.";
const INHALT_FEHLT = "Bitte bestätige kurz, dass Studio, Projekt und Betrag stimmen.";

// Text, den der Kunde mit dem Häkchen bestätigt (wird so gespeichert)
export function inhaltText(s, z) {
  if (z.art === "gutschein") return `Ich kaufe einen Wertgutschein über ${euro(z.betragCent)} von ${s.firma}${z.kunde ? ` (Name: ${z.kunde})` : ""}` +
    `${z.gutschein?.empfaenger ? ` für ${z.gutschein.empfaenger}` : ""}, einlösbar für alle Leistungen bei ${s.firma}. Den Gutschein mit Code bekomme ich nach der Zahlung per E-Mail.`;
  return `Ich zahle ${euro(z.betragCent)} an ${s.firma}${z.kunde ? ` (Name: ${z.kunde})` : ""} für: ${z.beschreibung || "Tattoo-Projekt"}` +
    `${z.sitzungen ? `, ${z.sitzungen}` : ""}${istAnzahlung(z) ? " – als Anzahlung, die mit dem Preis verrechnet wird" : ""}. ` +
    "Betrag und Projekt sind so mit dem Studio abgesprochen.";
}

function bestaetigen(req, context, s, z) {
  z.kundeBestaetigt = {
    am: now(), version: CFG.bestaetigungVersion, inhalt: inhaltText(s, z),
    ip: clientIp(req, context), ua: (req.headers.get("user-agent") || "").slice(0, 200),
  };
  if (istAnzahlung(z)) z.bedingungen = { akzeptiertAm: now(), text: anzahlungsbedingungen(s) };
}

// Ausweg nach Klarna-Ablehnung: Anzahlung per Karte (nur wenn das Studio das erlaubt), Rest am Termin.
// Betrag: eingestellter Prozentsatz vom Gesamtbetrag, auf volle Euro gerundet, mindestens der Mindestbetrag.
export function ausweichAngebot(s, z) {
  const a = s.ausweichAnzahlung || {};
  if (!a.an || z.art === "gutschein" || istAnzahlung(z) || z.ausweichVon) return null;
  const prozent = Math.min(50, Math.max(10, Number(a.prozent) || 30));
  const betragCent = Math.max(CFG.minBetragCent, Math.round(z.betragCent * prozent / 100 / 100) * 100);
  if (betragCent >= z.betragCent) return null;
  return { prozent, betragCent, restCent: z.betragCent - betragCent };
}

async function starte(s, z, { nurKarte = false } = {}) {
  if (nurKarte) return json({ url: await checkoutFuer(s, z, { nurKarte: true }) });
  if (bezahlfeld()) {
    const r = await bezahlfeldFuer(s, z);
    return json({ ...r, publishableKey: CFG.stripePublishableKey || null, simulation: BAUSTEINE_SIMULIERT, zahlung: z.id, betragCent: z.betragCent });
  }
  return json({ url: await checkoutFuer(s, z) });
}

export default handler(async (req, context) => {
  const u = new URL(req.url);
  if (req.method === "GET") {
    if (u.searchParams.get("z")) {
      const z = await zahlungBy("zahlung", u.searchParams.get("z"));
      if (!z) return fail("Zahlungslink nicht gefunden", 404);
      const s = await getStudio(z.studioId);
      // Nach der Rückkehr vom Bezahlen: Status direkt bei Stripe nachsehen (falls der Webhook noch nicht da ist)
      if (u.searchParams.get("abgleich") && z.paymentIntentId && ["offen", "in_pruefung"].includes(z.status) && z.weg === "bezahlfeld") {
        try {
          const pi = await stripe("GET", `/payment_intents/${z.paymentIntentId}`, null, plattformKassiert(s) ? {} : { account: s.stripe.accountId });
          if (pi.status === "succeeded") await zahlungBezahlt(z, plattformKassiert(s) ? undefined : s.stripe.accountId);
          else if (pi.status === "processing" && z.status !== "in_pruefung") { z.status = "in_pruefung"; await saveZahlung(z); }
        } catch { /* der Webhook kommt ohnehin */ }
      }
      // Rückkehr aus dem Checkout („Zurück“): nachsehen, ob Klarna abgelehnt hat → Auswege anbieten, Studio einmal informieren
      let klarna = null;
      if (u.searchParams.get("abbruch") && ["offen", "abgebrochen"].includes(z.status)) {
        klarna = await klarnaVersuch(s, z);
        if (klarna && z.klarnaAbgelehnt?.pi !== klarna.pi) {
          z.klarnaAbgelehnt = { ...klarna, am: now() };
          await saveZahlung(z);
          await log("klarna-abgelehnt", { studioId: s.id, zahlungId: z.id, code: klarna.code, betragCent: z.betragCent });
          await notify(s, mails.klarnaAbgelehnt(s, z));
        }
      }
      return json({
        studio: studioInfo(s),
        zahlung: { id: z.id, betragCent: z.betragCent, beschreibung: z.beschreibung, sitzungen: z.sitzungen || "", kunde: (z.kunde || "").split(" ")[0], status: z.status, art: z.art,
          empfaenger: z.gutschein?.empfaenger || "", zahlarten: zahlartenFuer(z), ausweichAnzahlungId: z.ausweich?.anzahlungId || null },
        klarnaAbgelehnt: Boolean(klarna || z.klarnaAbgelehnt),
        ausweich: ausweichAngebot(s, z),
      });
    }
    const s = await studioBy("slug", clean(u.searchParams.get("s"), 60));
    if (!s) return fail("Studio nicht gefunden", 404);
    return json({ studio: studioInfo(s), minBetragCent: CFG.minBetragCent, maxBetragCent: CFG.maxBetragCent });
  }
  if (req.method !== "POST") return fail("Methode nicht erlaubt", 405);
  const b = await body(req);

  if (b.z) {
    const z = await zahlungBy("zahlung", clean(b.z, 40));
    if (!z) return fail("Zahlungslink nicht gefunden", 404);
    if (z.status === "bezahlt") return fail("Dieser Betrag ist bereits bezahlt. Danke!", 409);
    if (!["offen", "abgebrochen"].includes(z.status)) return fail("Dieser Zahlungslink ist nicht mehr gültig. Bitte frag im Studio nach einem neuen Link.", 410);
    const s = await getStudio(z.studioId);
    // Ausweg „Anzahlung jetzt per Karte, Rest am Termin“: eigene Zahlung (art anzahlung), mit dem Original verknüpft
    if (b.ausweich === "anzahlung") {
      const an = ausweichAngebot(s, z);
      if (!an) return fail("Diese Möglichkeit bietet das Studio nicht an.", 409);
      if (!b.bedingungen) return fail(NICHT_BESTAETIGT);
      if (!b.inhaltOk) return fail(INHALT_FEHLT);
      const za = {
        id: id("zl_"), studioId: s.id, createdAt: now(), art: "anzahlung", status: "offen", betragCent: an.betragCent,
        kunde: z.kunde, email: z.email, beschreibung: `Anzahlung: ${z.beschreibung || "Tattoo-Projekt"}`.slice(0, 120), sitzungen: z.sitzungen,
        ausweichVon: z.id, restCent: an.restCent, nurKarte: true, hinweis: `Rest ${euro(an.restCent)} am Termin im Studio`,
      };
      bestaetigen(req, context, s, za);
      za.kundeBestaetigt.inhalt += ` Den Rest von ${euro(an.restCent)} zahle ich am Termin direkt im Studio.`;
      await saveZahlung(za);
      z.ausweich = { ...(z.ausweich || {}), anzahlungId: za.id, am: now() };
      await saveZahlung(z);
      await log("klarna-ausweich-anzahlung", { studioId: s.id, zahlungId: z.id, anzahlungId: za.id, betragCent: za.betragCent });
      return starte(s, za, { nurKarte: true });
    }
    // „Mit Karte zahlen“ nach der Rückkehr: Inhalt (und ggf. Bedingungen) wurden beim ersten Versuch schon bestätigt
    if (b.ausweich === "karte" && z.kundeBestaetigt) return starte(s, z, { nurKarte: true });
    if (istAnzahlung(z) && !b.bedingungen) return fail(NICHT_BESTAETIGT);
    if (!b.inhaltOk) return fail(INHALT_FEHLT);
    bestaetigen(req, context, s, z);
    await saveZahlung(z);
    // Ausweg „mit Karte zahlen“: gleicher Betrag, nur Karte (Klarna wird nicht noch einmal vorausgewählt)
    return starte(s, z, { nurKarte: b.ausweich === "karte" });
  }

  const s = await studioBy("slug", clean(b.s, 60));
  if (!s) return fail("Studio nicht gefunden", 404);
  if (!darfKassieren(s)) return fail("Bei diesem Studio ist die Online-Zahlung gerade nicht verfügbar.", 409);
  const betragCent = parseBetrag(b.betrag);
  if (!(betragCent >= CFG.minBetragCent && betragCent <= CFG.maxBetragCent)) return fail(`Bitte einen Betrag zwischen ${CFG.minBetragCent / 100} € und ${CFG.maxBetragCent / 100} € eingeben.`);
  const kunde = clean(b.kunde, 80), email = clean(b.email, 160).toLowerCase();
  if (!kunde) return fail("Bitte gib deinen Namen an.");
  if (email && !isEmail(email)) return fail("Bitte gib eine gültige E-Mail-Adresse an.");
  const anzahlung = Boolean(b.anzahlung);
  if (anzahlung && !b.bedingungen) return fail(NICHT_BESTAETIGT);
  if (!b.inhaltOk) return fail(INHALT_FEHLT);
  const z = { id: id("zl_"), studioId: s.id, createdAt: now(), art: "zahlseite", anzahlung, status: "offen", betragCent, kunde, email, beschreibung: clean(b.beschreibung, 120) || (anzahlung ? "Anzahlung" : "Tattoo-Projekt"), sitzungen: clean(b.sitzungen, 60) };
  bestaetigen(req, context, s, z);
  await saveZahlung(z);
  return starte(s, z);
});

export const config = { path: "/api/pay" };
