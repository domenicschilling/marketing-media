// Öffentliche Zahlungs-Endpunkte für Endkunden der Studios
//   GET  /api/pay?z=<zahlungId>   Infos zum Zahlungslink
//   GET  /api/pay?s=<studioSlug>  Infos zur Zahlseite des Studios
//   POST /api/pay { z }           Checkout für einen Zahlungslink starten
//   POST /api/pay { s, betrag, kunde, email, beschreibung, anzahlung, bedingungen }  Zahlung über die Zahlseite starten
// Bei Anzahlungen muss der Kunde die Anzahlungsbedingungen des Studios bestätigen (Beleg bei Rückbuchungen).
import { CFG } from "./_lib/config.mjs";
import { json, fail, body, clean, id, now, handler, isEmail, parseBetrag } from "./_lib/util.mjs";
import { getStudio, studioBy, zahlungBy, saveZahlung } from "./_lib/store.mjs";
import { checkoutFuer, darfKassieren, anzahlungsbedingungen, istAnzahlung } from "./_lib/domain.mjs";

const studioInfo = (s) => ({ firma: s.firma, ort: s.ort, slug: s.slug, aktiv: Boolean(darfKassieren(s)), anzahlungsbedingungen: anzahlungsbedingungen(s) });
const NICHT_BESTAETIGT = "Bitte bestätige die Anzahlungsbedingungen des Studios.";
const bestaetigung = (s) => ({ akzeptiertAm: now(), text: anzahlungsbedingungen(s) });

export default handler(async (req) => {
  const u = new URL(req.url);
  if (req.method === "GET") {
    if (u.searchParams.get("z")) {
      const z = await zahlungBy("zahlung", u.searchParams.get("z"));
      if (!z) return fail("Zahlungslink nicht gefunden", 404);
      const s = await getStudio(z.studioId);
      return json({ studio: studioInfo(s), zahlung: { id: z.id, betragCent: z.betragCent, beschreibung: z.beschreibung, kunde: (z.kunde || "").split(" ")[0], status: z.status, art: z.art } });
    }
    const s = await studioBy("slug", u.searchParams.get("s"));
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
    if (istAnzahlung(z)) {
      if (!b.bedingungen) return fail(NICHT_BESTAETIGT);
      z.bedingungen = bestaetigung(s);
    }
    return json({ url: await checkoutFuer(s, z) });
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
  const z = { id: id("zl_"), studioId: s.id, createdAt: now(), art: "zahlseite", anzahlung, status: "offen", betragCent, kunde, email, beschreibung: clean(b.beschreibung, 120) || (anzahlung ? "Anzahlung" : "Tattoo-Projekt") };
  if (anzahlung) z.bedingungen = bestaetigung(s);
  await saveZahlung(z);
  return json({ url: await checkoutFuer(s, z) });
});

export const config = { path: "/api/pay" };
