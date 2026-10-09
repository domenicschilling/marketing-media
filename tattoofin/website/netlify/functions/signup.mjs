// Online-Abschluss: Vertrag + AVV akzeptieren, Stripe-Kunde anlegen, Zahlung (Kauf) bzw. Stripe-Konto-Verbindung (Provision) starten.
// POST /api/signup   → { url } (Stripe Checkout bzw. Stripe-Onboarding) oder { next } (Kauf auf Rechnung)
// GET  /api/signup?id=…  → Status für Danke-Seite bzw. Fortsetzen
import { CFG } from "./_lib/config.mjs";
import { json, fail, body, clean, isEmail, id, now, handler, clientIp, brutto, addMonths } from "./_lib/util.mjs";
import { getStudio, saveStudio, studioBy, store, log } from "./_lib/store.mjs";
import { stripe, ensureCustomer, taxRateId } from "./_lib/stripe.mjs";
import { notify, notifyAdmin, zaehleAktion, slugify, connectUrl } from "./_lib/domain.mjs";
import { mails } from "./_lib/emails.mjs";
import { loginLink } from "./_lib/auth.mjs";

async function aktionGueltig(code) {
  if (!code) return false;
  if (code.toUpperCase() !== CFG.aktionCode) return false;
  if (new Date() > new Date(CFG.aktionBis + "T23:59:59+01:00")) return false;
  const n = (await store.get("meta/aktion-zaehler"))?.n || 0;
  return n < CFG.aktionMax;
}

export default handler(async (req, context) => {
  if (req.method === "GET") {
    const s = await getStudio(new URL(req.url).searchParams.get("id"));
    if (!s) return fail("Nicht gefunden", 404);
    const kurz = { id: s.id, status: s.status, modell: s.modell, zahlart: s.zahlart, firma: s.firma, kontoVerbunden: Boolean(s.stripe?.chargesEnabled), kontoBegonnen: Boolean(s.stripe?.detailsSubmitted) };
    // Vollständige Angaben nur zum Fortsetzen eines nicht abgeschlossenen Entwurfs
    if (!["entwurf", "abgebrochen"].includes(s.status)) return json(kurz);
    return json({ ...kurz, email: s.email, inhaber: s.inhaber, strasse: s.strasse, plz: s.plz, ort: s.ort, telefon: s.telefon, studioTelefon: s.studioTelefon, ustid: s.ustid });
  }
  if (req.method !== "POST") return fail("Methode nicht erlaubt", 405);

  const b = await body(req);
  const modell = b.modell === "provision" ? "provision" : b.modell === "kauf" ? "kauf" : null;
  const zahlart = modell === "kauf" ? (b.zahlart === "rechnung" ? "rechnung" : "sofort") : "provision";
  const d = {
    firma: clean(b.firma, 120), inhaber: clean(b.inhaber, 120), strasse: clean(b.strasse, 120), plz: clean(b.plz, 10),
    ort: clean(b.ort, 80), email: clean(b.email, 160).toLowerCase(), telefon: clean(b.telefon, 40),
    studioTelefon: clean(b.studioTelefon, 40), ustid: clean(b.ustid, 30).toUpperCase(), artists: clean(b.artists, 10),
    unterzeichner: clean(b.unterzeichner, 120), website: clean(b.website, 160),
  };
  const fehlt = [];
  if (!modell) fehlt.push("Modell");
  for (const [k, n] of [["firma", "Studio/Firma"], ["inhaber", "Inhaber"], ["strasse", "Straße"], ["plz", "PLZ"], ["ort", "Ort"], ["telefon", "Mobilnummer"], ["studioTelefon", "Studio-Telefonnummer"], ["unterzeichner", "Name des Unterzeichners"]]) if (!d[k]) fehlt.push(n);
  if (!isEmail(d.email)) fehlt.push("gültige E-Mail");
  if (fehlt.length) return fail("Bitte ausfüllen: " + fehlt.join(", "));
  if (!(b.akzeptiert?.vertrag && b.akzeptiert?.avv && b.akzeptiert?.unternehmer)) return fail("Bitte Vertrag, AVV und Unternehmereigenschaft bestätigen.");

  // Bestehenden Abschluss fortsetzen oder Dublette verhindern
  let s = b.resumeId ? await getStudio(b.resumeId) : await studioBy("email", d.email);
  if (s && !["entwurf", "abgebrochen"].includes(s.status)) return fail("Für diese E-Mail gibt es schon einen Vertrag. Bitte logge dich im Studio-Portal ein.", 409);
  if (s && s.email !== d.email && b.resumeId) s = null;

  let preisNetto = null, aktion = false;
  if (modell === "kauf") {
    aktion = await aktionGueltig(clean(b.aktionscode, 30));
    if (b.aktionscode && !aktion) return fail("Der Aktionscode ist ungültig oder nicht mehr verfügbar.");
    preisNetto = aktion ? CFG.aktionNetto : CFG.kaufNetto;
  }

  s = {
    ...(s || { id: id("st_"), createdAt: now() }),
    ...d, modell, zahlart, preisNetto, aktion, status: "entwurf",
    vertrag: {
      version: CFG.vertragVersion, akzeptiertAm: now(), name: d.unterzeichner, ip: clientIp(req, context),
      ua: (req.headers.get("user-agent") || "").slice(0, 200), vertrag: true, avv: true, unternehmer: true,
      modell, preisNetto, provisionProzent: modell === "provision" ? CFG.provisionProzent : null,
    },
    stripe: s?.stripe || {},
  };
  if (!s.slug) {
    let slug = slugify(d.firma), n = 1;
    while (await studioBy("slug", slug)) slug = slugify(d.firma) + "-" + (++n);
    s.slug = slug;
  }
  await saveStudio(s);
  await log("signup", { studioId: s.id, modell, zahlart });

  const cus = await ensureCustomer(s);
  s.stripe.customerId = cus.id;
  await saveStudio(s);

  const base = CFG.siteUrl;
  if (modell === "kauf" && zahlart === "sofort") {
    const session = await stripe("POST", "/checkout/sessions", {
      mode: "payment", customer: s.stripe.customerId, locale: "de", client_reference_id: s.id,
      line_items: [{
        quantity: 1, tax_rates: [await taxRateId()],
        price_data: { currency: "eur", unit_amount: preisNetto, product_data: { name: "Tattoofin Setup", description: "Einrichtung der Zahlungsstruktur inkl. Studio Kit, Schulung und Betreuung, keine monatliche Grundgebühr" } },
      }],
      invoice_creation: { enabled: true, invoice_data: { description: "Tattoofin Setup", metadata: { studioId: s.id, typ: "kauf" }, footer: `${CFG.firma} · ${CFG.adresse} · ${CFG.ustid}` } },
      customer_update: { address: "auto", name: "auto" }, tax_id_collection: { enabled: true },
      payment_intent_data: { metadata: { studioId: s.id, typ: "kauf" }, description: "Tattoofin Setup" },
      metadata: { studioId: s.id, typ: "kauf" },
      success_url: `${base}/danke.html?id=${s.id}&sid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/start.html?resume=${s.id}&abbruch=1`,
    }, { idempotencyKey: `cs-${s.id}-${s.vertrag.akzeptiertAm}` });
    s.stripe.checkoutSessionId = session.id;
    await saveStudio(s);
    return json({ url: session.url });
  }

  if (modell === "kauf" && zahlart === "rechnung") {
    const txr = await taxRateId();
    await stripe("POST", "/invoiceitems", {
      customer: s.stripe.customerId, currency: "eur", amount: preisNetto, tax_rates: [txr],
      description: "Tattoofin Setup (Einrichtung, Studio Kit, Schulung, Betreuung)", metadata: { studioId: s.id },
    }, { idempotencyKey: `ii-kauf-${s.id}` });
    const inv = await stripe("POST", "/invoices", {
      customer: s.stripe.customerId, collection_method: "send_invoice", days_until_due: CFG.rechnungFaelligTage,
      pending_invoice_items_behavior: "include", currency: "eur", auto_advance: true,
      description: "Tattoofin Setup", metadata: { studioId: s.id, typ: "kauf" },
    }, { idempotencyKey: `inv-kauf-${s.id}` });
    const fin = await stripe("POST", `/invoices/${inv.id}/finalize`, { auto_advance: true });
    await stripe("POST", `/invoices/${fin.id}/send`, {});
    s.stripe.invoiceId = fin.id;
    s.status = "zahlung_offen";
    if (aktion) await zaehleAktion();
    await saveStudio(s);
    const faellig = fin.due_date ? new Date(fin.due_date * 1000).toISOString() : addMonths(now(), 0);
    await notify(s, mails.anmeldung(s, { loginUrl: loginLink(s.id), connectUrl: connectUrl(s) }));
    await notify(s, mails.rechnungVersendet(s, { betragCent: brutto(preisNetto), rechnungUrl: fin.hosted_invoice_url, faellig }));
    await notifyAdmin("Neuer Abschluss (Kauf auf Rechnung)", s, { Betrag: preisNetto / 100 + " € netto", Aktion: aktion ? "ja" : "nein" });
    return json({ next: `/danke.html?id=${s.id}` });
  }

  // Provision: keine Zahlung nötig. Vertrag steht, weiter zur Verbindung des Stripe-Kontos.
  s.status = "einrichtung";
  await saveStudio(s);
  await notify(s, mails.anmeldung(s, { loginUrl: loginLink(s.id), connectUrl: connectUrl(s) }));
  await notifyAdmin("Neuer Abschluss (Provision) 🎉", s, {});
  return json({ url: connectUrl(s) });
});

export const config = { path: "/api/signup" };
