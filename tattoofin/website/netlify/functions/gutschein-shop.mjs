// Öffentlicher Gutschein-Shop eines Studios (seit 23.11.2026, nur Tattoo Fashion Munich, siehe _lib/gutschein-shop.mjs)
//   GET  /api/gutschein-shop?s=<slug>     Angebot, Stückzahlen, Bedingungen, Widerrufsbelehrung, Anbieter
//   POST /api/gutschein-shop { s, auswahl: "nr1".."nr5" | "frei", betrag?, kunde, email, empfaenger?, nachricht?, inhaltOk }
//        → { url } Stripe-Checkout (nur Karte inkl. Apple Pay / Google Pay, Kasse 30 Min.)
//   POST /api/gutschein-shop { abbruch: <zahlungId> }   Kasse verlassen: Sitzung beenden, Reservierung frei
import crypto from "node:crypto";
import { CFG, jetzt, testKasse } from "./_lib/config.mjs";
import { json, fail, body, clean, id, now, handler, isEmail, parseBetrag, euro, clientIp } from "./_lib/util.mjs";
import { studioBy, zahlungBy, saveZahlung, getStudio, saveStudio, log } from "./_lib/store.mjs";
import { checkoutFuer, darfKassieren, oeffentlicheAdresse } from "./_lib/domain.mjs";
import { stripe } from "./_lib/stripe.mjs";
import { brandingOeffentlich } from "./_lib/branding.mjs";
import { SHOPS, shopFuer, shopZustand, shopOeffentlich, reservieren, reservierungFreigeben, bonusBisIso, ShopFehler, KASSE_MINUTEN } from "./_lib/gutschein-shop.mjs";
import { bestaetigen } from "./pay.mjs";

const NICHT_DA = "Diesen Gutschein-Shop gibt es nicht.";

// Nur Vorschau-Site (eigener Speicher, Stripe-Simulation): Beispiel-Studio mit den echten öffentlichen Studio-Angaben anlegen,
// damit der Shop dort ohne Anmeldung getestet werden kann. Auf der echten Site nie.
async function vorschauStudio(slug) {
  if (!CFG.vorschau || !SHOPS[slug]) return null;
  const acct = await stripe("POST", "/accounts", { type: "standard", email: "vorschau@example.com", metadata: { vorschau: "gutschein-shop" } });
  return saveStudio({ id: "st_vorschau_" + slug.replace(/[^a-z0-9]/g, "").slice(0, 20), firma: "Tattoo Fashion Munich", slug, email: "vorschau-studio@example.com", inhaber: "Vorschau",
    strasse: "Landshuter Allee 42", plz: "80637", ort: "München", modell: "kauf", zahlart: "geschenk", status: "live", createdAt: now(), vorschauBeispiel: true,
    stripe: { accountId: acct.id, chargesEnabled: true, payoutsEnabled: true, detailsSubmitted: true, kontoTyp: "standard" } });
}

async function studioMitShop(slug) {
  const s = (await studioBy("slug", clean(slug, 60))) || (await vorschauStudio(clean(slug, 60)));
  const c = s && shopFuer(s);
  return s && c ? { s, c } : null;
}

export default handler(async (req, context) => {
  const u = new URL(req.url);
  if (req.method === "GET") {
    const r = await studioMitShop(u.searchParams.get("s"));
    if (!r) return fail(NICHT_DA, 404);
    const { s, c } = r;
    return json({
      studio: { firma: s.firma, slug: s.slug, ...oeffentlicheAdresse(s), branding: brandingOeffentlich(s), aktiv: Boolean(darfKassieren(s)) && !testKasse(s) },
      shop: await shopOeffentlich(s, c),
    }, 200, { "cache-control": "no-store" });
  }
  if (req.method !== "POST") return fail("Methode nicht erlaubt", 405);
  const b = await body(req);

  // Zurück aus der Kasse: Sitzung bei Stripe beenden (dann kann sie nicht mehr bezahlt werden) und Einheit freigeben
  if (b.abbruch) {
    const z = await zahlungBy("zahlung", clean(b.abbruch, 40));
    if (!z?.gutschein?.shop) return fail("Nicht gefunden", 404);
    if (z.status !== "offen") return json({ ok: true, status: z.status });
    const s = await getStudio(z.studioId);
    if (z.checkoutSessionId) {
      try { await stripe("POST", `/checkout/sessions/${z.checkoutSessionId}/expire`, {}, z.abwicklung === "plattform" ? {} : { account: s.stripe?.accountId }); }
      catch (e) {
        // Bereits bezahlt (oder Stripe nicht erreichbar): nichts freigeben, der Webhook bzw. der Ablauf der Kasse regelt den Rest
        return json({ ok: false, status: z.status, hinweis: "Die Kasse ließ sich nicht beenden: " + e.message });
      }
    }
    await reservierungFreigeben(z, "abgebrochen");
    z.status = "abgebrochen"; z.abgebrochenAm = now();
    await saveZahlung(z);
    await log("gutschein-shop-abbruch", { studioId: s.id, zahlungId: z.id });
    return json({ ok: true, status: z.status });
  }

  const r = await studioMitShop(b.s);
  if (!r) return fail(NICHT_DA, 404);
  const { s, c } = r;
  const zustand = shopZustand(s, c);
  if (!zustand.offen) return fail(zustand.grund, 409);
  if (testKasse(s) || !darfKassieren(s)) return fail("Bei diesem Studio ist der Online-Kauf gerade nicht möglich.", 409);

  const kunde = clean(b.kunde, 80), email = clean(b.email, 160).toLowerCase();
  if (!kunde) return fail("Bitte gib deinen Namen an.");
  if (!email || !isEmail(email)) return fail("Bitte gib deine E-Mail-Adresse an. Dorthin schicken wir den Gutschein.");
  if (!b.inhaltOk) return fail("Bitte bestätige kurz deine Bestellung und dass du die Gutscheinbedingungen und die Widerrufsbelehrung gelesen hast.");
  const empfaenger = clean(b.empfaenger, 80), nachricht = clean(b.nachricht, 240);

  const zid = id("zl_");
  let betragCent, gutschein, beschreibung;
  if (b.auswahl === "frei") {
    betragCent = parseBetrag(b.betrag);
    if (!(betragCent >= c.frei.minCent && betragCent <= c.frei.maxCent && betragCent % 100 === 0))
      return fail(`Bitte einen Betrag in vollen Euro zwischen ${c.frei.minCent / 100} € und ${(c.frei.maxCent / 100).toLocaleString("de-DE")} € eingeben.`);
    beschreibung = "Wertgutschein";
    gutschein = { empfaenger, nachricht, shop: true };
  } else {
    const a = c.aktionen.find((x) => x.id === b.auswahl);
    if (!a) return fail("Bitte wähle einen Gutschein aus.");
    if (!zustand.aktionOffen) return fail(zustand.aktionGrund || "Die Aktions-Gutscheine gibt es gerade nicht.", 409);
    const ipHash = crypto.createHash("sha256").update(String(clientIp(req, context)) + CFG.siteUrl).digest("hex").slice(0, 16);
    let res;
    try { res = await reservieren(s, c, a, { zahlungId: zid, email, ip: ipHash }); }
    catch (e) { if (e instanceof ShopFehler) return json({ error: e.message, code: e.code }, e.status); throw e; }
    betragCent = a.preisCent;
    beschreibung = `Aktions-Gutschein Nr. ${a.nr}`;
    gutschein = { empfaenger, nachricht, shop: true, aktion: { id: a.id, nr: a.nr, stueck: a.stueck }, wertCent: a.wertCent, bezahltCent: a.preisCent, bonusCent: a.wertCent - a.preisCent, bonusBis: bonusBisIso(c), reservierung: res.key, reserviertBis: res.bis };
  }

  const z = { id: zid, studioId: s.id, createdAt: now(), art: "gutschein", quelle: "gutschein-shop", status: "offen", betragCent, kunde, email, beschreibung, sitzungen: "", nurKarte: true, gutschein };
  bestaetigen(req, context, s, z);
  await saveZahlung(z);
  try {
    const url = await checkoutFuer(s, z, {
      nurKarte: true,
      // Kasse im Look der Shop-Seite (TF-Logo, Schwarz, Gold). Lehnt Stripe das ab, läuft die Kasse ohne (checkoutFuer).
      branding: { display_name: "Tattoo Fashion München", logo: { type: "url", url: `${CFG.siteUrl}/assets/gs-shop/tfm/logo.png` }, background_color: "#0B0B0B", button_color: "#C8A35A", border_style: "pill" },
      extra: {
        // Kasse genau so lange offen wie die Reservierung (Stripe: mindestens 30 Minuten). Danach checkout.session.expired → Einheit frei
        expires_at: Math.floor(jetzt().getTime() / 1000) + KASSE_MINUTEN * 60 + 30,
        submit_type: "pay",
        // § 312j BGB: Am Knopf muss klar sein, dass der Kauf zahlungspflichtig ist (Stripe zeigt „Bezahlen“, darüber dieser Satz)
        custom_text: { submit: { message: `Mit „Bezahlen“ kaufst du ${gutschein.aktion ? `den Aktions-Gutschein Nr. ${gutschein.aktion.nr} (Wert ${euro(gutschein.wertCent)})` : "den Wertgutschein"} zahlungspflichtig bei ${s.firma}. Den Gutschein bekommst du sofort per E-Mail.` } },
        cancel_url: `${CFG.siteUrl}/gutschein-kaufen/${encodeURIComponent(s.slug)}?abbruch=${z.id}`,
        // Danke im Shop-Look (statt der allgemeinen Tattoofin-Seite bezahlt.html)
        success_url: `${CFG.siteUrl}/gutschein-kaufen/${encodeURIComponent(s.slug)}?bezahlt=${z.id}`,
      },
    });
    await log("gutschein-shop-kasse", { studioId: s.id, zahlungId: z.id, auswahl: b.auswahl, betragCent, wertCent: gutschein.wertCent || betragCent });
    return json({ url, zahlung: z.id, betrag: euro(betragCent) });
  } catch (e) {
    await reservierungFreigeben(z, "kasse-fehler");
    z.status = "abgebrochen"; await saveZahlung(z);
    throw e;
  }
});

export const config = { path: "/api/gutschein-shop" };
