// Öffentliche Zahlungs-Endpunkte für Endkunden der Studios
//   GET  /api/pay?z=<zahlungId>[&abgleich=1]   Infos zum Zahlungslink (abgleich: Status bei Stripe nachsehen, für /bezahlt.html)
//   GET  /api/pay?s=<studioSlug>               Infos zur Zahlseite des Studios (tattoofin.de/zahlen/<slug>)
//   POST /api/pay { z, inhaltOk, bedingungen }                                       Zahlung für einen Zahlungslink starten
//   POST /api/pay { s, betrag, kunde, email, beschreibung, sitzungen, anzahlung, inhaltOk, bedingungen }  Zahlung über die Zahlseite
// Antwort: { clientSecret, publishableKey, stripeAccount, simulation } → eingebettetes Bezahlfeld auf tattoofin.de
//      oder { url } → Weiterleitung zum Stripe-Checkout (wenn kein öffentlicher Stripe-Schlüssel hinterlegt ist)
// Absicherung fürs Studio (Entwurf, Rechtsprüfung offen): Der Kunde bestätigt vor dem Bezahlen per Häkchen den Inhalt
// (Studio, Motiv/Projekt, Sitzungen, Betrag) und bei Anzahlungen die Anzahlungsbedingungen. Gespeichert mit Zeitstempel.
import { CFG, BAUSTEINE_SIMULIERT } from "./_lib/config.mjs";
import { json, fail, body, clean, id, now, handler, isEmail, parseBetrag, euro, clientIp } from "./_lib/util.mjs";
import { getStudio, studioBy, zahlungBy, saveZahlung } from "./_lib/store.mjs";
import { checkoutFuer, bezahlfeldFuer, darfKassieren, anzahlungsbedingungen, istAnzahlung, eingebettet, zahlungBezahlt, plattformKassiert } from "./_lib/domain.mjs";
import { stripe } from "./_lib/stripe.mjs";

const studioInfo = (s) => ({ firma: s.firma, ort: s.ort, slug: s.slug, aktiv: Boolean(darfKassieren(s)), anzahlungsbedingungen: anzahlungsbedingungen(s) });
const NICHT_BESTAETIGT = "Bitte bestätige die Anzahlungsbedingungen des Studios.";
const INHALT_FEHLT = "Bitte bestätige kurz, dass Studio, Projekt und Betrag stimmen.";

// Text, den der Kunde mit dem Häkchen bestätigt (wird so gespeichert)
export function inhaltText(s, z) {
  return `Ich zahle ${euro(z.betragCent)} an ${s.firma}${z.kunde ? ` (Name: ${z.kunde})` : ""} für: ${z.beschreibung || "Tattoo-Projekt"}` +
    `${z.sitzungen ? `, ${z.sitzungen}` : ""}${istAnzahlung(z) ? " – als Anzahlung, die mit dem Preis verrechnet wird" : ""}. ` +
    "Das ist so mit dem Studio abgesprochen.";
}

function bestaetigen(req, context, s, z) {
  z.kundeBestaetigt = {
    am: now(), version: CFG.bestaetigungVersion, inhalt: inhaltText(s, z),
    ip: clientIp(req, context), ua: (req.headers.get("user-agent") || "").slice(0, 200),
  };
  if (istAnzahlung(z)) z.bedingungen = { akzeptiertAm: now(), text: anzahlungsbedingungen(s) };
}

async function starte(s, z) {
  if (eingebettet()) {
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
      return json({ studio: studioInfo(s), zahlung: { id: z.id, betragCent: z.betragCent, beschreibung: z.beschreibung, sitzungen: z.sitzungen || "", kunde: (z.kunde || "").split(" ")[0], status: z.status, art: z.art } });
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
    if (istAnzahlung(z) && !b.bedingungen) return fail(NICHT_BESTAETIGT);
    if (!b.inhaltOk) return fail(INHALT_FEHLT);
    bestaetigen(req, context, s, z);
    await saveZahlung(z);
    return starte(s, z);
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
