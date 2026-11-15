// Admin-Übersicht fürs Handy (GET /api/admin/uebersicht, nur mit Admin-Anmeldung, siehe admin.mjs).
// Grundsatz: Es steht nur drin, was der Server wirklich hat. Was fehlt, bleibt leer (null) statt geschätzt.
//   kennzahlen   zahlende Studios (Web/Stripe vs. Apple), in Einrichtung, abgebrochene Anmeldungen (14 Tage),
//                Umsatz der Studios im Monat (Kundenzahlungen), unsere Einnahmen im Monat (bezahlte Stripe-Rechnungen
//                der Tattoofin-Kunden, live bei Stripe abgefragt), Abos laut Vertrag, Apple-Abos (Preis laut Apple)
//   mail         Warteschlange (ok / hängt) und letzter Gesundheits-Check
//   entwuerfe    nicht abgeschlossene Anmeldungen der letzten 14 Tage, mit fehlgeschlagener Zahlung (z. B. 3-D-Secure), falls Stripe sie gemeldet hat
//   studios      alle echten Studios als Karten (ohne Demo-Studios)
//   demo         Demo-Studios (App-Prüfung bei Apple), getrennt und NIE in den Kennzahlen
// Test-Studios aus Apple-Sandbox/TestFlight (s.sandbox) stehen in der Liste (Karte test: true), zählen aber nicht in den Kennzahlen.
// Jede Karte trägt zahlend (gleiche Regel wie kennzahlen.zahlend), damit Kachel und Filter dieselbe Zahl zeigen.
import { CFG, paketVon, provisionSatz, istApple, berlinMitternacht, netto } from "./config.mjs";
import { allStudios, zahlungenVon, store, normEmail, AKTIV } from "./store.mjs";
import { STATUS, provisionVerdient } from "./domain.mjs";
import { stripe } from "./stripe.mjs";
import { warteschlangeStatus } from "./mail.mjs";
import { brutto } from "./util.mjs";

const TAG = 864e5;
export const LAUFEND = ["einrichtung", "live", "gekuendigt"];
const GRUPPE = { live: "aktiv", einrichtung: "einrichtung", zahlung_offen: "einrichtung", entwurf: "entwurf", abgebrochen: "entwurf", gekuendigt: "gekuendigt", beendet: "gekuendigt", erstattet: "gekuendigt" };
export const istTest = (s) => Boolean(s?.demo || s?.sandbox);
// Apple-Studio in der kostenlosen Probezeit: läuft, hat aber noch nie gezahlt
const inProbe = (s) => istApple(s) && Boolean(s.apple?.probe);
// Zahlendes Studio: echt (kein Demo/Test), läuft (auch gekündigt bis Vertragsende), keine Einladung, nicht in der Probezeit
export const istZahlend = (s) => !istTest(s) && LAUFEND.includes(s.status) && s.zahlart !== "geschenk" && !inProbe(s);
// Fester Zeitpunkt der Anmeldung (nicht updatedAt: das ändern auch Erinnerungs-Mail und Ablauf der Kasse)
const anmeldungAm = (s) => s.anmeldungFehler?.am || s.vertrag?.akzeptiertAm || s.createdAt || null;
const eur = (c) => (c / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
// Apple-Preis (Tausendstel) in Euro wie alle anderen Preise; andere Währungen mit Kürzel
const applePreis = (a) => !(Number.isFinite(a?.preisMilli) && a.preisMilli !== null) ? "" : (!a.waehrung || a.waehrung === "EUR") ? eur(Math.round(a.preisMilli / 10)) : `${(a.preisMilli / 1000).toFixed(2).replace(".", ",")} ${a.waehrung}`;
const ZAHLART = { abo: "Monatsabo", provision: "Provision", geschenk: "Einladung", sofort: "Einmalzahlung, sofort bezahlt", rechnung: "Einmalzahlung auf Rechnung" };

// Monat „JJJJ-MM“ in deutscher Zeit (Standard: jetzt) → Beginn/Ende als ms
export function monatsGrenzen(monat) {
  const heute = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit" }).format(new Date());
  const ym = /^\d{4}-\d{2}$/.test(monat || "") ? monat : heute.slice(0, 7);
  const [y, m] = ym.split("-").map(Number);
  const naechster = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return { monat: ym, von: berlinMitternacht(ym + "-01"), bis: berlinMitternacht(naechster + "-01") };
}
const imMonat = (iso, g) => { const t = Date.parse(iso || ""); return t >= g.von && t < g.bis; };

// Paket mit Preis, wie er für DIESES Studio gilt (Sonderpreise, Einladung, Apple)
export function paketInfo(s) {
// art: "normal" | "altpreis" (Bestandsstudio mit altem Preis) | "sonder" (echter Sonderpreis) | "einladung"; sonder = art !== "normal"
  const p = paketVon(s);
  const mit = (o, art) => ({ ...o, art, sonder: art !== "normal" });
  if (istApple(s)) {
    const a = s.apple || {};
    const preis = a.probe ? "Probezeit" : applePreis(a) ? applePreis(a) + "/Monat" : "";
    return mit({ name: "Monatlich (App Store)", preis, abrechnung: "apple" }, "normal");
  }
  if (s.zahlart === "geschenk") return mit({ name: "Einladung", preis: s.sonderkondition || "0 € Einrichtung, keine Provision", abrechnung: "web" }, "einladung");
  if (s.paket === "monatlich" || s.zahlart === "abo") {
    const n = s.monatNetto || CFG.monatNettoAlt;
    return mit({ name: "Monatlich", preis: `${eur(brutto(n))}/Monat`, netto: `${eur(n)} netto`, abrechnung: "web" }, n === CFG.monatNetto ? "normal" : n === CFG.monatNettoAlt ? "altpreis" : "sonder");
  }
  if (s.modell === "provision") {
    const angebot = s.umstellung?.monatNetto ? ` · Angebot ${eur(s.umstellung.monatNetto)} netto/Monat` : "";
    return mit({ name: p.name, preis: `${provisionSatz(s)} % Provision${angebot}`, abrechnung: "web" }, provisionSatz(s) !== CFG.provisionProzent ? "sonder" : "normal");
  }
  if (s.modell === "kauf") return mit({ name: p.name, preis: s.preisNetto ? `${eur(s.preisNetto)} netto einmalig` : "", abrechnung: "web" }, Boolean(s.preisNetto) && s.preisNetto !== CFG.kaufNetto ? "sonder" : "normal");
  return mit({ name: p?.name || s.paket || s.modell || "–", preis: "", abrechnung: "web" }, "normal");
}

const stripeText = (s) => s.demo ? "Demo (ohne Stripe)" : s.stripe?.chargesEnabled ? "freigegeben" : s.stripe?.accountId ? "in Prüfung" : "nicht verbunden";

function karte(s, zahlungen, g) {
  const bezahlt = zahlungen.filter((z) => z.status === "bezahlt" && z.bezahltAm).sort((a, b) => b.bezahltAm.localeCompare(a.bezahltAm));
  const monat = bezahlt.filter((z) => imMonat(z.bezahltAm, g));
  // Provision (wie GET /api/admin/studios): netto und nach Stripe-Gebühren, die Tattoofin bei Provision trägt
  const abgerechnet = zahlungen.filter((z) => ["bezahlt", "erstattet", "rueckgebucht"].includes(z.status));
  const provision = s.modell === "provision" || abgerechnet.some((z) => z.gebuehrBruttoCent) ? {
    prozent: provisionSatz(s),
    nettoCent: abgerechnet.reduce((a, z) => a + netto(provisionVerdient(z)), 0),
    nachGebuehrenCent: abgerechnet.reduce((a, z) => a + netto(provisionVerdient(z)) - (z.stripeGebuehrCent || 0), 0),
  } : null;
  const gruppe = GRUPPE[s.status] || "entwurf";
  return {
    id: s.id, firma: s.firma || "(ohne Namen)", ort: s.ort || "", email: s.email || "", telefon: s.telefon || "",
    status: s.status, statusText: gruppe === "entwurf" ? "Abgebrochen" : STATUS[s.status] || s.status, gruppe,
    zahlend: istZahlend(s), probe: inProbe(s), zahlart: s.zahlart || "", zahlartText: istApple(s) ? "App Store (zahlt Apple aus)" : ZAHLART[s.zahlart] || s.zahlart || "",
    provision, recht: s.recht?.version ? { version: s.recht.version, am: s.recht.am || null, aktuell: s.recht.version === CFG.rechtVersion } : null,
    extras: Object.keys(s.extras || {}),
    paket: paketInfo(s), test: Boolean(s.sandbox), stripeFrei: Boolean(s.stripe?.chargesEnabled), stripe: stripeText(s),
    letzteZahlung: bezahlt[0] ? { am: bezahlt[0].bezahltAm, betragCent: bezahlt[0].betragCent } : null,
    zahlungen: bezahlt.length, offen: zahlungen.filter((z) => z.status === "offen").length,
    umsatzMonatCent: monat.reduce((a, z) => a + z.betragCent - (z.erstattetCent || 0), 0),
    createdAt: s.createdAt || null, goLiveAt: s.goLiveAt || null, kuendigungZum: s.kuendigung?.zum || null,
  };
}

// Warum hängt die Anmeldung? Nur, was gespeichert ist.
function entwurfInfo(s, aktiveEmails) {
  const f = s.anmeldungFehler || null;
  const wo = istApple(s) || s.appEntwurf ? "app" : "web";
  const schritt = f ? "Zahlung fehlgeschlagen" : s.checkoutAbgelaufen ? "Kasse geöffnet, nicht bezahlt (abgelaufen)" : s.stripe?.checkoutSessionId ? "Kasse geöffnet, noch nicht bezahlt" : wo === "app" ? "In der App angefangen, Kauf offen" : s.status === "zahlung_offen" ? "Rechnung offen" : "Angaben gemacht, nicht bezahlt";
  return {
    id: s.id, firma: s.firma || "(ohne Namen)", ort: s.ort || "", email: s.email || "", telefon: s.telefon || "",
    paket: paketInfo(s), wo, wann: anmeldungAm(s), angelegt: s.createdAt || null, schritt,
    fehler: f ? { am: f.am || null, text: f.text || "", code: f.code || "", dreiDS: Boolean(f.dreiDS) } : null,
    spaeterAbgeschlossen: aktiveEmails.has(normEmail(s.email)),
  };
}

// Unsere Einnahmen im Monat: bezahlte Rechnungen bei Stripe, NUR von Kunden, die ein Tattoofin-Studio sind
// (das DSX-Konto teilen sich mehrere Marken). Abos, Einmalzahlung, QR-Aufsteller, Provisionsrechnungen.
// Erstattungen im Monat (Garantie-Erstattung auf den PaymentIntent, Erstattungen zu Rechnungen, auch per Gutschrift) werden
// abgezogen und getrennt ausgewiesen. Rechnungen werden 120 Tage zurück gesucht (spät bezahlte, z. B. Mahnlauf oder Zahlart Rechnung).
// Endet die Suche an der Seitengrenze, steht unvollstaendig: true (Anzeige „mindestens …“).
const SEITEN = 10;
async function stripeListe(pfad, params, jede) {
  let nach, seiten = 0;
  do {
    const r = await stripe("GET", pfad, { limit: 100, ...params, ...(nach ? { starting_after: nach } : {}) });
    const daten = Array.isArray(r?.data) ? r.data : [];
    for (const x of daten) jede(x);
    nach = r?.has_more && daten.length ? daten[daten.length - 1].id : null;
  } while (nach && ++seiten < SEITEN);
  return Boolean(nach);
}
const idVon = (x) => (x && typeof x === "object" ? x.id : x || "");
async function stripeEinnahmen(g, kundenIds, piIds) {
  if (!kundenIds.size && !piIds.size) return { bruttoCent: 0, nettoCent: 0, rechnungen: 0, erstattetCent: 0, erstattungen: 0, unvollstaendig: false, quelle: "stripe" };
  let bruttoCent = 0, nettoCent = 0, rechnungen = 0, erstattetCent = 0, erstattungen = 0;
  try {
    const u1 = await stripeListe("/invoices", { status: "paid", created: { gte: Math.floor((g.von - 120 * TAG) / 1000), lt: Math.floor(g.bis / 1000) } }, (inv) => {
      if (!kundenIds.has(idVon(inv.customer))) return;
      const bezahltMs = (Number(inv.status_transitions?.paid_at) || Number(inv.created) || 0) * 1000;
      if (bezahltMs < g.von || bezahltMs >= g.bis) return;
      const b = Number(inv.amount_paid) || 0;
      bruttoCent += b;
      nettoCent += Number.isFinite(Number(inv.total_excluding_tax)) && inv.total_excluding_tax !== null ? Number(inv.total_excluding_tax) : Math.round(b * 100 / (100 + CFG.ustProzent));
      rechnungen++;
    });
    // Erstattungen, die im Monat erstellt wurden (nur Plattform-Konto, also Zahlungen an Tattoofin, nicht die der Studios)
    const u2 = await stripeListe("/refunds", { created: { gte: Math.floor(g.von / 1000), lt: Math.floor(g.bis / 1000) }, expand: ["data.charge"] }, (r) => {
      if (r.status && !["succeeded", "pending"].includes(r.status)) return;
      const kunde = typeof r.charge === "object" ? idVon(r.charge?.customer) : "";
      if (!(kundenIds.has(kunde) || piIds.has(idVon(r.payment_intent)))) return;
      erstattetCent += Number(r.amount) || 0; erstattungen++;
    });
    const erstattetNetto = Math.round(erstattetCent * 100 / (100 + CFG.ustProzent));
    return { bruttoCent: bruttoCent - erstattetCent, nettoCent: nettoCent - erstattetNetto, vorErstattungBruttoCent: bruttoCent, rechnungen, erstattetCent, erstattungen, unvollstaendig: u1 || u2, quelle: "stripe" };
  } catch (e) {
    return { bruttoCent: null, nettoCent: null, rechnungen: null, quelle: "stripe", fehler: "Stripe gerade nicht erreichbar" };
  }
}

export async function adminUebersicht({ monat } = {}) {
  const g = monatsGrenzen(monat);
  const alle = await allStudios();
  const echte = alle.filter((s) => !s.demo);
  const zahlungen = new Map();
  for (const s of alle) zahlungen.set(s.id, await zahlungenVon(s.id));

  const zaehlen = echte.filter((s) => !istTest(s));
  const laufend = zaehlen.filter((s) => LAUFEND.includes(s.status));
  const zahlend = laufend.filter(istZahlend);
  const probe = laufend.filter(inProbe);
  const apple = zahlend.filter(istApple);
  const aktiveEmails = new Set(echte.filter(AKTIV).map((s) => normEmail(s.email)).filter(Boolean));
  const grenze = Date.now() - 14 * TAG;
  const entwuerfe = zaehlen.filter((s) => ["entwurf", "abgebrochen"].includes(s.status) && Date.parse(anmeldungAm(s) || "") >= grenze)
    .map((s) => entwurfInfo(s, aktiveEmails)).sort((a, b) => (b.wann || "").localeCompare(a.wann || ""));

  const studioZahlungenMonat = zaehlen.flatMap((s) => zahlungen.get(s.id)).filter((z) => z.status === "bezahlt" && imMonat(z.bezahltAm, g));
  const webAbos = zahlend.filter((s) => !istApple(s) && (s.paket === "monatlich" || s.zahlart === "abo") && s.stripe?.subscriptionId && !s.stripe?.aboBeendetAm);
  const kundenIds = new Set(zaehlen.map((s) => s.stripe?.customerId).filter(Boolean));
  const piIds = new Set(zaehlen.map((s) => s.stripe?.paymentIntentId).filter(Boolean));
  const preiseApple = {};
  for (const s of apple) {
    const k = applePreis(s.apple) || "Preis unbekannt";
    preiseApple[k] = (preiseApple[k] || 0) + 1;
  }

  const mailStand = await warteschlangeStatus();
  const gesundheit = await store.get("meta/gesundheit");
  const demoMeta = await store.get("meta/app-demo");

  return {
    stand: new Date().toISOString(), monat: g.monat,
    kennzahlen: {
      // gesamt + kostenlos + probe = alle laufenden echten Studios
      zahlend: { gesamt: zahlend.length, web: zahlend.length - apple.length, apple: apple.length, live: zahlend.filter((s) => s.status === "live").length, kostenlos: laufend.filter((s) => s.zahlart === "geschenk" && !inProbe(s)).length, probe: probe.length },
      einrichtung: zaehlen.filter((s) => ["einrichtung", "zahlung_offen"].includes(s.status)).length,
      rechnungOffen: zaehlen.filter((s) => s.status === "zahlung_offen").length,
      abgebrochen14: entwuerfe.filter((e) => !e.spaeterAbgeschlossen).length,
      zahlungFehlgeschlagen14: entwuerfe.filter((e) => e.fehler && !e.spaeterAbgeschlossen).length,
      umsatzStudios: { cent: studioZahlungenMonat.reduce((a, z) => a + z.betragCent - (z.erstattetCent || 0), 0), zahlungen: studioZahlungenMonat.length },
      einnahmen: {
        stripe: await stripeEinnahmen(g, kundenIds, piIds),
        aboVertragNettoCent: webAbos.reduce((a, s) => a + (s.monatNetto || CFG.monatNettoAlt), 0), webAbos: webAbos.length,
        apple: { abos: apple.length, preise: Object.entries(preiseApple).map(([preis, anzahl]) => ({ preis, anzahl })) },
      },
      tests: echte.filter((s) => s.sandbox).length,
    },
    mail: { ok: !mailStand.anzahl, anzahl: mailStand.anzahl || 0, aeltesteSeit: mailStand.aeltesteSeit || null, letzterFehler: mailStand.letzterFehler || "", wege: mailStand.wege || [] },
    gesundheit: gesundheit ? { ok: gesundheit.ok !== false, am: gesundheit.am || null, fehler: gesundheit.fehler || [] } : null,
    entwuerfe,
    studios: echte.map((s) => karte(s, zahlungen.get(s.id), g)).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    demo: alle.filter((s) => s.demo).map((s) => ({
      ...karte(s, zahlungen.get(s.id), g), email: s.email || "", zahlungenGesamt: zahlungen.get(s.id).length,
      erneuertAm: demoMeta?.studioId === s.id ? demoMeta.am : null, appleReview: demoMeta?.studioId === s.id,
    })),
  };
}
