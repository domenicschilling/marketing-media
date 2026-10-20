// Online-Abschluss: Paket wählen, Vertrag + AVV akzeptieren, Stripe-Kunde anlegen, dann je nach Paket:
//   Risikofrei   (modell provision): nichts zu zahlen → Stripe-Auszahlungskonto (Express) verbinden
//   Monatlich    (modell kauf, zahlart abo): Stripe-Checkout im Abo-Modus auf dem DSX-Konto (49 € netto + USt. im Monat)
//                → danach eigenes Stripe-Konto (Standard) verbinden wie bei der Einmalzahlung
//   Einmalzahlung (modell kauf, zahlart sofort|rechnung): einmalig 999 € netto per Checkout oder Rechnung
// Danach ist das Studio direkt eingeloggt (Session-Cookie) und landet im Dashboard (/app.html), wo es sein
// Zahlungskonto (eingebettet bzw. per Weiterleitung zu Stripe) einrichtet.
// POST /api/signup   → { url } (Stripe Checkout bzw. Danke-Seite → Dashboard) oder { next } (Einmalzahlung auf Rechnung)
// GET  /api/signup?id=…  → Status für Danke-Seite bzw. Fortsetzen
// GET  /api/signup?pakete=1 → die drei Pakete (öffentlich)
// Alte Links: ?modell=provision → Risikofrei, ?modell=kauf → Einmalzahlung. Der Aktionscode (RATENJA) ist abgeschaltet.
import { CFG, PAKETE, PAKET_ALIAS } from "./_lib/config.mjs";
import { json, fail, body, clean, isEmail, id, now, handler, clientIp, brutto, addMonths } from "./_lib/util.mjs";
import { getStudio, saveStudio, studioBy, store, log, normEmail, studiosPerEmail, AKTIV } from "./_lib/store.mjs";
import { stripe, ensureCustomer, taxRateId, TATTOOFIN_BRANDING } from "./_lib/stripe.mjs";
import { notify, notifyAdmin, slugify, einrichtungUrl, paketDetails, resumeUrl } from "./_lib/domain.mjs";
import { mails } from "./_lib/emails.mjs";
import { loginLink, sessionCookie, currentStudio, zweckOk } from "./_lib/auth.mjs";

// Nach dem Abschluss: Danke-Seite (Messung der Anmeldung) leitet sofort ins Dashboard weiter
const weiter = (s) => `/danke.html?id=${s.id}&weiter=app`;

const PRODUKT_EINMAL = "Tattoofin Paket Einmalzahlung";
const TEXT_EINMAL = "Einrichtung der Zahlungsstruktur inkl. Studio Kit, QR-Aufsteller aus Holz (Wert 29 €), Schulung und Betreuung. Danach keine Tattoofin-Gebühr, nur die Zahlungsgebühren von Stripe";
const RECHNUNG_FUSS = `${CFG.firma} · ${CFG.adresse} · USt-IdNr. ${CFG.ustid}`;

export default handler(async (req, context) => {
  if (req.method === "GET") {
    if (new URL(req.url).searchParams.get("pakete")) return json({ pakete: Object.values(PAKETE) }, 200, { "cache-control": "no-store" });
    const u = new URL(req.url);
    const s = await getStudio(u.searchParams.get("id"));
    if (!s) return fail("Nicht gefunden", 404);
    // Ohne Sitzung dieses Studios bzw. signierten Fortsetzen-Link nur der Status (keine Studio-Daten anhand der ID)
    const sitzung = await currentStudio(req);
    const berechtigt = (sitzung && sitzung.id === s.id) || zweckOk(u.searchParams.get("t"), "resume", s.id);
    if (!berechtigt) return json({ id: s.id, status: s.status });
    const kurz = { id: s.id, status: s.status, modell: s.modell, paket: s.paket || (s.modell === "kauf" ? "einmal" : "risikofrei"), zahlart: s.zahlart, firma: s.firma, preisNetto: s.preisNetto || null, kontoVerbunden: Boolean(s.stripe?.chargesEnabled), kontoBegonnen: Boolean(s.stripe?.detailsSubmitted) };
    // Vollständige Angaben nur zum Fortsetzen eines nicht abgeschlossenen Entwurfs
    if (!["entwurf", "abgebrochen"].includes(s.status)) return json(kurz);
    return json({ ...kurz, email: s.email, inhaber: s.inhaber, strasse: s.strasse, plz: s.plz, ort: s.ort, telefon: s.telefon, studioTelefon: s.studioTelefon, ustid: s.ustid });
  }
  if (req.method !== "POST") return fail("Methode nicht erlaubt", 405);

  const b = await body(req);
  // Geschenk-Einladung (Admin): eigenes Stripe-Konto wie beim Kauf, aber 0 € Einrichtung und keine Provision
  const geschenk = b.geschenk ? await store.get(`geschenk/${clean(b.geschenk, 40)}`) : null;
  if (b.geschenk && (!geschenk || geschenk.benutzt)) return fail("Diese Einladung ist ungültig oder wurde schon benutzt. Bitte melde dich bei uns.");
  const paketId = geschenk ? null : PAKET_ALIAS[clean(b.paket, 20).toLowerCase()] || PAKET_ALIAS[clean(b.modell, 20).toLowerCase()] || null;
  const paket = PAKETE[paketId];
  const modell = geschenk ? "kauf" : paket ? paket.modell : null;
  const zahlart = geschenk ? "geschenk" : paketId === "risikofrei" ? "provision" : paketId === "monatlich" ? "abo" : (b.zahlart === "rechnung" ? "rechnung" : "sofort");
  const d = {
    firma: clean(b.firma, 120), inhaber: clean(b.inhaber, 120), strasse: clean(b.strasse, 120), plz: clean(b.plz, 10),
    ort: clean(b.ort, 80), email: clean(b.email, 160).toLowerCase(), telefon: clean(b.telefon, 40),
    studioTelefon: clean(b.studioTelefon, 40), ustid: clean(b.ustid, 30).toUpperCase(), artists: clean(b.artists, 10),
    unterzeichner: clean(b.unterzeichner, 120), website: clean(b.website, 160),
  };
  const fehlt = [];
  if (!modell) fehlt.push("Paket");
  for (const [k, n] of [["firma", "Studio/Firma"], ["inhaber", "Inhaber"], ["strasse", "Straße"], ["plz", "PLZ"], ["ort", "Ort"], ["telefon", "Mobilnummer"], ["studioTelefon", "Studio-Telefonnummer"], ["unterzeichner", "Name des Unterzeichners"]]) if (!d[k]) fehlt.push(n);
  if (!isEmail(d.email)) fehlt.push("gültige E-Mail");
  if (fehlt.length) return fail("Bitte ausfüllen: " + fehlt.join(", "));
  if (!(b.akzeptiert?.vertrag && b.akzeptiert?.avv && b.akzeptiert?.unternehmer)) return fail("Bitte Vertrag, AVV und Unternehmereigenschaft bestätigen.");

  // Bestehenden Abschluss fortsetzen oder Dublette verhindern
  // Schon ein aktiver Vertrag mit dieser Adresse (auch gmail/googlemail-Varianten)? → Login statt Dublette
  if (!b.resumeId && (await studiosPerEmail(d.email)).some(AKTIV)) return fail("Für diese E-Mail gibt es schon einen Vertrag. Bitte logge dich im Studio-Portal ein.", 409);
  let s = b.resumeId ? await getStudio(b.resumeId) : await studioBy("email", d.email);
  if (s && !["entwurf", "abgebrochen"].includes(s.status)) return fail("Für diese E-Mail gibt es schon einen Vertrag. Bitte logge dich im Studio-Portal ein.", 409);
  if (s && s.email !== d.email && b.resumeId) s = null;

  if (geschenk && normEmail(geschenk.email) !== normEmail(d.email)) return fail(`Diese Einladung gilt für ${geschenk.email}. Bitte nutze diese E-Mail-Adresse.`);
  // preisNetto = einmaliger Betrag (Einmalzahlung), monatNetto = Monatsbetrag (Monatlich)
  const preisNetto = geschenk ? 0 : paketId === "einmal" ? CFG.kaufNetto : null;
  const monatNetto = paketId === "monatlich" ? CFG.monatNetto : null;

  s = {
    ...(s || { id: id("st_"), createdAt: now() }),
    ...d, modell, paket: paketId, zahlart, preisNetto, monatNetto, aktion: false, status: "entwurf",
    // Sonderkondition aus der Admin-Einladung (z. B. „Partner – nur Zahlungsgebühren“), nur Anzeige – Abwicklung = Geschenk
    sonderkondition: geschenk ? (geschenk.bezeichnung || null) : null,
    vertrag: {
      version: CFG.vertragVersion, akzeptiertAm: now(), name: d.unterzeichner, ip: clientIp(req, context),
      ua: (req.headers.get("user-agent") || "").slice(0, 200), vertrag: true, avv: true, unternehmer: true,
      modell, paket: paketId, preisNetto, monatNetto, provisionProzent: modell === "provision" ? CFG.provisionProzent : null,
      aufsteller: ["monatlich", "einmal"].includes(paketId),
    },
    stripe: s?.stripe || {},
  };
  if (!s.slug) {
    let slug = slugify(d.firma), n = 1;
    while (await studioBy("slug", slug)) slug = slugify(d.firma) + "-" + (++n);
    s.slug = slug;
  }
  await saveStudio(s);
  await log("signup", { studioId: s.id, modell, paket: paketId, zahlart });

  const cus = await ensureCustomer(s);
  s.stripe.customerId = cus.id;
  await saveStudio(s);

  const base = CFG.siteUrl;
  if (geschenk) {
    s.status = "einrichtung";
    await saveStudio(s);
    await store.set(`geschenk/${geschenk.code}`, { ...geschenk, benutzt: now(), studioId: s.id });
    await notify(s, mails.anmeldung(s, { loginUrl: loginLink(s.id), connectUrl: einrichtungUrl(s) }));
    await notifyAdmin(geschenk.bezeichnung ? `Neuer Abschluss (Einladung: ${geschenk.bezeichnung})` : "Neuer Abschluss (Geschenk-Einladung) 🎁", s, { Einladung: geschenk.firma, Sonderkondition: geschenk.bezeichnung || undefined });
    return eingeloggt(s, { url: weiter(s) });
  }
  // Paket Monatlich: Abo auf dem DSX-Konto. Rechnungen erstellt Stripe jeden Monat automatisch (mit USt. und DSX-Angaben im Fuß).
  if (paketId === "monatlich") {
    await stripe("POST", `/customers/${s.stripe.customerId}`, { invoice_settings: { footer: RECHNUNG_FUSS } });
    const session = await stripe("POST", "/checkout/sessions", {
      mode: "subscription", customer: s.stripe.customerId, locale: "de", client_reference_id: s.id,
      branding_settings: TATTOOFIN_BRANDING,
      line_items: [{
        quantity: 1, tax_rates: [await taxRateId()],
        price_data: {
          currency: "eur", unit_amount: monatNetto, recurring: { interval: "month" },
          product_data: { name: "Tattoofin Paket Monatlich", description: "Zahlungsstruktur, Studio-Portal, Studio Kit, QR-Aufsteller aus Holz (Wert 29 €) und Betreuung. Keine Provision, monatlich kündbar." },
        },
      }],
      subscription_data: { description: "Tattoofin Paket Monatlich", metadata: { studioId: s.id, typ: "abo", paket: "monatlich" } },
      customer_update: { address: "auto", name: "auto" }, tax_id_collection: { enabled: true },
      metadata: { studioId: s.id, typ: "abo", paket: "monatlich" },
      success_url: `${base}/danke.html?id=${s.id}&sid={CHECKOUT_SESSION_ID}&weiter=app`,
      cancel_url: `${resumeUrl(s)}&abbruch=1`,
    }, { idempotencyKey: `cs-abo-${s.id}-${s.vertrag.akzeptiertAm}` });
    s.stripe.checkoutSessionId = session.id;
    await saveStudio(s);
    return eingeloggt(s, { url: session.url });
  }

  if (modell === "kauf" && zahlart === "sofort") {
    const session = await stripe("POST", "/checkout/sessions", {
      mode: "payment", customer: s.stripe.customerId, locale: "de", client_reference_id: s.id,
      branding_settings: TATTOOFIN_BRANDING,
      line_items: [{
        quantity: 1, tax_rates: [await taxRateId()],
        price_data: { currency: "eur", unit_amount: preisNetto, product_data: { name: PRODUKT_EINMAL, description: TEXT_EINMAL } },
      }],
      invoice_creation: { enabled: true, invoice_data: { description: PRODUKT_EINMAL, metadata: { studioId: s.id, typ: "kauf", paket: "einmal" }, footer: RECHNUNG_FUSS } },
      customer_update: { address: "auto", name: "auto" }, tax_id_collection: { enabled: true },
      payment_intent_data: { metadata: { studioId: s.id, typ: "kauf" }, description: PRODUKT_EINMAL },
      metadata: { studioId: s.id, typ: "kauf" },
      success_url: `${base}/danke.html?id=${s.id}&sid={CHECKOUT_SESSION_ID}&weiter=app`,
      cancel_url: `${resumeUrl(s)}&abbruch=1`,
    }, { idempotencyKey: `cs-${s.id}-${s.vertrag.akzeptiertAm}` });
    s.stripe.checkoutSessionId = session.id;
    await saveStudio(s);
    return eingeloggt(s, { url: session.url });
  }

  if (modell === "kauf" && zahlart === "rechnung") {
    const txr = await taxRateId();
    await stripe("POST", "/invoiceitems", {
      customer: s.stripe.customerId, currency: "eur", amount: preisNetto, tax_rates: [txr],
      description: `${PRODUKT_EINMAL} (${TEXT_EINMAL})`, metadata: { studioId: s.id },
    }, { idempotencyKey: `ii-kauf-${s.id}` });
    const inv = await stripe("POST", "/invoices", {
      customer: s.stripe.customerId, collection_method: "send_invoice", days_until_due: CFG.rechnungFaelligTage,
      pending_invoice_items_behavior: "include", currency: "eur", auto_advance: true,
      description: PRODUKT_EINMAL, metadata: { studioId: s.id, typ: "kauf", paket: "einmal" }, footer: RECHNUNG_FUSS,
    }, { idempotencyKey: `inv-kauf-${s.id}` });
    const fin = await stripe("POST", `/invoices/${inv.id}/finalize`, { auto_advance: true });
    await stripe("POST", `/invoices/${fin.id}/send`, {});
    s.stripe.invoiceId = fin.id;
    s.status = "zahlung_offen";
    await saveStudio(s);
    const faellig = fin.due_date ? new Date(fin.due_date * 1000).toISOString() : addMonths(now(), 0);
    await notify(s, mails.anmeldung(s, { loginUrl: loginLink(s.id), connectUrl: einrichtungUrl(s) }));
    await notify(s, mails.rechnungVersendet(s, { betragCent: brutto(preisNetto), rechnungUrl: fin.hosted_invoice_url, faellig }));
    await notifyAdmin("Neuer Abschluss (Einmalzahlung auf Rechnung) – QR-Aufsteller erst nach Zahlungseingang bestellen", s, { ...paketDetails(s), Betrag: preisNetto / 100 + " € netto" });
    return eingeloggt(s, { next: weiter(s) });
  }

  // Risikofrei: keine Zahlung nötig. Vertrag steht, weiter ins Dashboard zur Einrichtung des Auszahlungskontos.
  s.status = "einrichtung";
  await saveStudio(s);
  await notify(s, mails.anmeldung(s, { loginUrl: loginLink(s.id), connectUrl: einrichtungUrl(s) }));
  await notifyAdmin("Neuer Abschluss (Paket Risikofrei) 🎉", s, paketDetails(s));
  return eingeloggt(s, { url: weiter(s) });
});

// Antwort mit Session-Cookie: Das Studio ist nach dem Abschluss direkt eingeloggt (kein Umweg über die Login-Mail)
function eingeloggt(s, data) {
  return json(data, 200, { "Set-Cookie": sessionCookie(s) });
}

export const config = { path: "/api/signup" };
