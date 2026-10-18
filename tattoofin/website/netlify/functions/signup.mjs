// Online-Abschluss: Paket wählen, Vertrag + AVV akzeptieren, Stripe-Kunde anlegen, ggf. Einrichtung bezahlen.
// Danach ist das Studio direkt eingeloggt (Session-Cookie) und landet im Dashboard (/app.html), wo es sein
// Zahlungskonto eingebettet einrichtet.
// POST /api/signup   → { url } (Stripe Checkout für die Einrichtung bzw. Danke-Seite → Dashboard) oder { next } (Rechnung)
// GET  /api/signup?id=…  → Status für Danke-Seite bzw. Fortsetzen
// GET  /api/signup?pakete=1 → Pakete + Stand der Gründer-Aktion (öffentlich)
// Pakete: start (0 € + 10 %), studio (299 € + 7 %, Gründer-Aktion 0 €), profi (Kauf, eigenes Konto, 0 %). Geschenk = profi zu 0 €.
import { CFG, PAKETE } from "./_lib/config.mjs";
import { json, fail, body, clean, isEmail, id, now, handler, clientIp, brutto, addMonths } from "./_lib/util.mjs";
import { getStudio, saveStudio, studioBy, store, log } from "./_lib/store.mjs";
import { stripe, ensureCustomer, taxRateId, TATTOOFIN_BRANDING } from "./_lib/stripe.mjs";
import { notify, notifyAdmin, zaehleAktion, slugify, einrichtungUrl, gruenderStand } from "./_lib/domain.mjs";
import { mails } from "./_lib/emails.mjs";
import { loginLink, sessionCookie } from "./_lib/auth.mjs";

export const GRUENDER_TEXT = "Gründer-Aktion: Ich bekomme das Paket Studio ohne Einrichtungsgebühr. Dafür bin ich einverstanden, "
  + "nach den ersten Wochen ein kurzes Erfahrungsvideo (ca. 30–60 Sekunden, Handy reicht) für Tattoofin aufzunehmen, "
  + "das Tattoofin auf Website und Social Media zeigen darf. Die Einwilligung zur Veröffentlichung kann ich jederzeit widerrufen.";
// Nach dem Abschluss: Danke-Seite (Messung der Anmeldung) leitet sofort ins Dashboard weiter
const weiter = (s) => `/danke.html?id=${s.id}&weiter=app`;

async function aktionGueltig(code) {
  if (!code) return false;
  if (code.toUpperCase() !== CFG.aktionCode) return false;
  if (new Date() > new Date(CFG.aktionBis + "T23:59:59+01:00")) return false;
  const n = (await store.get("meta/aktion-zaehler"))?.n || 0;
  return n < CFG.aktionMax;
}

export default handler(async (req, context) => {
  if (req.method === "GET") {
    if (new URL(req.url).searchParams.get("pakete")) return json({ pakete: Object.values(PAKETE), gruender: await gruenderStand() }, 200, { "cache-control": "no-store" });
    const s = await getStudio(new URL(req.url).searchParams.get("id"));
    if (!s) return fail("Nicht gefunden", 404);
    const kurz = { id: s.id, status: s.status, modell: s.modell, paket: s.paket || (s.modell === "kauf" ? "profi" : "start"), zahlart: s.zahlart, firma: s.firma, preisNetto: s.preisNetto || null, kontoVerbunden: Boolean(s.stripe?.chargesEnabled), kontoBegonnen: Boolean(s.stripe?.detailsSubmitted) };
    // Vollständige Angaben nur zum Fortsetzen eines nicht abgeschlossenen Entwurfs
    if (!["entwurf", "abgebrochen"].includes(s.status)) return json(kurz);
    return json({ ...kurz, email: s.email, inhaber: s.inhaber, strasse: s.strasse, plz: s.plz, ort: s.ort, telefon: s.telefon, studioTelefon: s.studioTelefon, ustid: s.ustid });
  }
  if (req.method !== "POST") return fail("Methode nicht erlaubt", 405);

  const b = await body(req);
  // Geschenk-Einladung (Admin): eigenes Stripe-Konto wie beim Kauf, aber 0 € Einrichtung und keine Provision
  const geschenk = b.geschenk ? await store.get(`geschenk/${clean(b.geschenk, 40)}`) : null;
  if (b.geschenk && (!geschenk || geschenk.benutzt)) return fail("Diese Einladung ist ungültig oder wurde schon benutzt. Bitte melde dich bei uns.");
  // Paket (ältere Links: ?modell=provision → Start, ?modell=kauf → Profi)
  const paketId = geschenk ? "profi" : PAKETE[b.paket] ? b.paket : b.modell === "provision" ? "start" : b.modell === "kauf" ? "profi" : null;
  const paket = PAKETE[paketId];
  const modell = paket ? paket.modell : null;
  const gruenderGewuenscht = paketId === "studio" && Boolean(b.gruender);
  const kostetEinrichtung = !geschenk && (paketId === "profi" || (paketId === "studio" && !gruenderGewuenscht));
  const zahlart = geschenk ? "geschenk" : kostetEinrichtung ? (b.zahlart === "rechnung" ? "rechnung" : "sofort") : "provision";
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
  let s = b.resumeId ? await getStudio(b.resumeId) : await studioBy("email", d.email);
  if (s && !["entwurf", "abgebrochen"].includes(s.status)) return fail("Für diese E-Mail gibt es schon einen Vertrag. Bitte logge dich im Studio-Portal ein.", 409);
  if (s && s.email !== d.email && b.resumeId) s = null;

  if (geschenk && geschenk.email !== d.email) return fail(`Diese Einladung gilt für ${geschenk.email}. Bitte nutze diese E-Mail-Adresse.`);
  let preisNetto = null, aktion = false, gruender = null;
  if (geschenk) preisNetto = 0;
  else if (paketId === "profi") {
    aktion = await aktionGueltig(clean(b.aktionscode, 30));
    if (b.aktionscode && !aktion) return fail("Der Aktionscode ist ungültig oder nicht mehr verfügbar.");
    preisNetto = aktion ? CFG.aktionNetto : CFG.kaufNetto;
  } else if (paketId === "studio") {
    if (gruenderGewuenscht) {
      if (b.videoEinwilligung !== true) return fail("Für die Gründer-Aktion brauchen wir dein Okay für das kurze Erfahrungsvideo (Häkchen).");
      const stand = await gruenderStand();
      const schonDabei = s?.gruender && !["entwurf", "abgebrochen"].includes(s.status);
      if (!stand.frei && !schonDabei) return fail("Die Gründer-Plätze sind leider schon vergeben. Du kannst das Paket Studio trotzdem wählen.", 409);
      gruender = { am: now(), videoEinwilligung: true, text: GRUENDER_TEXT, platzBeiAnmeldung: stand.vergeben + 1 };
    }
    preisNetto = gruender ? 0 : CFG.studioNetto;
  }

  s = {
    ...(s || { id: id("st_"), createdAt: now() }),
    ...d, modell, paket: paketId, zahlart, preisNetto, aktion, status: "entwurf",
    provisionProzent: modell === "provision" ? paket.provisionProzent : null, gruender,
    vertrag: {
      version: CFG.vertragVersion, akzeptiertAm: now(), name: d.unterzeichner, ip: clientIp(req, context),
      ua: (req.headers.get("user-agent") || "").slice(0, 200), vertrag: true, avv: true, unternehmer: true,
      modell, paket: paketId, preisNetto, provisionProzent: modell === "provision" ? paket.provisionProzent : null,
      gruender: Boolean(gruender),
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
  if (geschenk) {
    s.status = "einrichtung";
    await saveStudio(s);
    await store.set(`geschenk/${geschenk.code}`, { ...geschenk, benutzt: now(), studioId: s.id });
    await notify(s, mails.anmeldung(s, { loginUrl: loginLink(s.id), connectUrl: einrichtungUrl(s) }));
    await notifyAdmin("Neuer Abschluss (Geschenk-Einladung) 🎁", s, { Einladung: geschenk.firma });
    return eingeloggt(s, { url: weiter(s) });
  }
  const setupName = paketId === "studio" ? "Tattoofin Paket Studio – Einrichtung" : "Tattoofin Paket Profi – Setup";
  const setupText = paketId === "studio"
    ? `Einrichtung inkl. Studio Kit und Betreuung, danach ${paket.provisionProzent} % pro Zahlung alles inklusive, keine Grundgebühr`
    : "Einrichtung der Zahlungsstruktur inkl. Studio Kit, Schulung und Betreuung, keine monatliche Grundgebühr";
  const typ = paketId === "studio" ? "setup" : "kauf";
  if (kostetEinrichtung && zahlart === "sofort") {
    const session = await stripe("POST", "/checkout/sessions", {
      mode: "payment", customer: s.stripe.customerId, locale: "de", client_reference_id: s.id,
      branding_settings: TATTOOFIN_BRANDING,
      line_items: [{
        quantity: 1, tax_rates: [await taxRateId()],
        price_data: { currency: "eur", unit_amount: preisNetto, product_data: { name: setupName, description: setupText } },
      }],
      invoice_creation: { enabled: true, invoice_data: { description: setupName, metadata: { studioId: s.id, typ }, footer: `${CFG.firma} · ${CFG.adresse} · ${CFG.ustid}` } },
      customer_update: { address: "auto", name: "auto" }, tax_id_collection: { enabled: true },
      payment_intent_data: { metadata: { studioId: s.id, typ }, description: setupName },
      metadata: { studioId: s.id, typ },
      success_url: `${base}/danke.html?id=${s.id}&sid={CHECKOUT_SESSION_ID}&weiter=app`,
      cancel_url: `${base}/start.html?resume=${s.id}&abbruch=1`,
    }, { idempotencyKey: `cs-${s.id}-${s.vertrag.akzeptiertAm}` });
    s.stripe.checkoutSessionId = session.id;
    await saveStudio(s);
    return eingeloggt(s, { url: session.url });
  }

  if (kostetEinrichtung && zahlart === "rechnung") {
    const txr = await taxRateId();
    await stripe("POST", "/invoiceitems", {
      customer: s.stripe.customerId, currency: "eur", amount: preisNetto, tax_rates: [txr],
      description: `${setupName} (Einrichtung, Studio Kit, Betreuung)`, metadata: { studioId: s.id },
    }, { idempotencyKey: `ii-kauf-${s.id}` });
    const inv = await stripe("POST", "/invoices", {
      customer: s.stripe.customerId, collection_method: "send_invoice", days_until_due: CFG.rechnungFaelligTage,
      pending_invoice_items_behavior: "include", currency: "eur", auto_advance: true,
      description: setupName, metadata: { studioId: s.id, typ },
    }, { idempotencyKey: `inv-kauf-${s.id}` });
    const fin = await stripe("POST", `/invoices/${inv.id}/finalize`, { auto_advance: true });
    await stripe("POST", `/invoices/${fin.id}/send`, {});
    s.stripe.invoiceId = fin.id;
    s.status = "zahlung_offen";
    if (aktion) await zaehleAktion();
    await saveStudio(s);
    const faellig = fin.due_date ? new Date(fin.due_date * 1000).toISOString() : addMonths(now(), 0);
    await notify(s, mails.anmeldung(s, { loginUrl: loginLink(s.id), connectUrl: einrichtungUrl(s) }));
    await notify(s, mails.rechnungVersendet(s, { betragCent: brutto(preisNetto), rechnungUrl: fin.hosted_invoice_url, faellig }));
    await notifyAdmin(`Neuer Abschluss (Paket ${paket.name} auf Rechnung)`, s, { Betrag: preisNetto / 100 + " € netto", Aktion: aktion ? "ja" : "nein" });
    return eingeloggt(s, { next: weiter(s) });
  }

  // Start bzw. Studio mit Gründer-Aktion: keine Zahlung nötig. Vertrag steht, weiter ins Dashboard zur Einrichtung.
  s.status = "einrichtung";
  await saveStudio(s);
  await notify(s, mails.anmeldung(s, { loginUrl: loginLink(s.id), connectUrl: einrichtungUrl(s) }));
  await notifyAdmin(`Neuer Abschluss (Paket ${paket.name}${gruender ? ", Gründer-Aktion" : ""}) 🎉`, s, gruender ? { Gruenderplatz: gruender.platzBeiAnmeldung, Video: "Einwilligung erteilt" } : {});
  return eingeloggt(s, { url: weiter(s) });
});

// Antwort mit Session-Cookie: Das Studio ist nach dem Abschluss direkt eingeloggt (kein Umweg über die Login-Mail)
function eingeloggt(s, data) {
  return json(data, 200, { "Set-Cookie": sessionCookie(s) });
}

export const config = { path: "/api/signup" };
