// Demo-Studio für die App-Prüfung bei Apple (App Review) und für Vorführungen. Kennzeichen: studio.demo = true.
// Demo-Studios bekommen nie Mails (notify), laufen nicht durch tägliche Jobs/Monatsabrechnung, zählen nicht in den Admin-Kennzahlen
// und können nicht bezahlt werden (pay.mjs → 409). Zahlungslinks lassen sich anlegen (darfKassieren gilt auch ohne Stripe).
// Anmeldung in der App nur über den Review-Zugang: APP_REVIEW_EMAIL + APP_REVIEW_CODE (6 Ziffern) + APP_REVIEW_STUDIO_ID (siehe app.mjs).
// Anlegen: lokal `node dev/app-demo.mjs`, live POST /api/admin/app-demo (Bearer Admin; erst nach Deploy mit Domenics OK).
// Alle Beträge, Namen und Codes hier sind Beispieldaten.
import crypto from "node:crypto";
import { CFG } from "./config.mjs";
import { store, getStudio, saveStudio, saveZahlung, normEmail, log } from "./store.mjs";
import { neuerCode, gueltigBis } from "./gutschein.mjs";
import { id } from "./util.mjs";

const tageZurueck = (t, stunde = 11) => { const d = new Date(Date.now() - t * 864e5); d.setUTCHours(stunde, 12, 0, 0); return d.toISOString(); };

export async function demoStudioAnlegen({ email = "app-review@tattoofin.de" } = {}) {
  const meta = await store.get("meta/app-demo");
  let s = meta?.studioId ? await getStudio(meta.studioId) : null;
  const neu = !s;
  if (!s) s = { id: id("st_"), createdAt: tageZurueck(60) };
  Object.assign(s, {
    demo: true, firma: "Tattoofin Demo-Studio", inhaber: "Demo Studio", email: normEmail(email), telefon: "", studioTelefon: "",
    strasse: "Musterstraße 1", plz: "96047", ort: "Bamberg", slug: "tattoofin-demo-studio", status: "live", goLiveAt: s.goLiveAt || tageZurueck(55),
    modell: "kauf", paket: "monatlich", zahlart: "abo", monatNetto: CFG.monatNetto, teamEmails: [],
    vertrag: s.vertrag || { version: CFG.vertragVersion, akzeptiertAm: tageZurueck(60), name: "Demo Studio" },
    stripe: {}, kuendigung: null,
  });
  delete s.loeschAnfrage;
  await saveStudio(s);
  await store.set("meta/app-demo", { studioId: s.id, am: new Date().toISOString() });
  // Beispiel-Zahlungen neu anlegen
  for (const k of await store.list(`zahlung/${s.id}/`)) await store.del(k);
  const z = (x) => ({ studioId: s.id, id: id("zl_"), gebuehrNettoCent: 0, gebuehrBruttoCent: 0, sitzungen: "", email: "", ...x });
  const liste = [
    z({ createdAt: tageZurueck(0, 9), art: "gesamt", status: "offen", betragCent: 32000, kunde: "Jonas Beispiel", beschreibung: "Schriftzug Handgelenk" }),
    z({ createdAt: tageZurueck(1, 8), art: "anzahlung", status: "bezahlt", bezahltAm: tageZurueck(1, 10), betragCent: 15000, kunde: "Lisa Beispiel", beschreibung: "Rose Unterarm", zahlart: "card", zahlartText: "Karte" }),
    z({ createdAt: tageZurueck(3, 9), art: "gesamt", status: "bezahlt", bezahltAm: tageZurueck(3, 12), betragCent: 48000, kunde: "Mara Beispiel", beschreibung: "Mandala Schulter", sitzungen: "Sitzung 2 von 3", zahlart: "apple_pay", zahlartText: "Apple Pay" }),
    z({ createdAt: tageZurueck(6, 9), art: "gesamt", status: "storniert", storniertAm: tageZurueck(5), betragCent: 9000, kunde: "Tim Beispiel", beschreibung: "Kleines Herz" }),
  ];
  // Gutscheine: einer gültig, einer eingelöst (mit Code und Token wie echte, damit Scannen und Suchen funktionieren)
  for (const [betragCent, empfaenger, tage, eingeloest] of [[10000, "Mia", 4, false], [5000, "", 20, true]]) {
    const code = neuerCode(), token = crypto.randomBytes(18).toString("base64url"), am = tageZurueck(tage, 15);
    const g = z({ createdAt: am, art: "gutschein", status: "bezahlt", bezahltAm: am, betragCent, kunde: "Sven Beispiel", email: "", beschreibung: "Wertgutschein", zahlart: "card", zahlartText: "Karte",
      gutschein: { empfaenger, nachricht: empfaenger ? "Alles Gute zum Geburtstag!" : "", code, token, ausgestelltAm: am, gueltigBis: gueltigBis(am), ...(eingeloest ? { eingeloestAm: tageZurueck(2, 14) } : {}) } });
    liste.push(g);
    await store.set("idx/gutschein/" + code, `${s.id}/${g.id}`);
    await store.set("idx/gst/" + token, `${s.id}/${g.id}`);
  }
  for (const x of liste) await saveZahlung(x);
  await log("app-demo-angelegt", { studioId: s.id, neu });
  return { studio: s, zahlungen: liste.length, neu };
}

// Feste Beispiel-Auszahlungen (Format wie GET /api/app/auszahlungen)
const tag = (t) => new Date(Date.now() - t * 864e5).toISOString().slice(0, 10);
const zeit = (t) => new Date(Date.now() - t * 864e5).toISOString().replace(/\.\d{3}Z$/, "Z");
export function demoAuszahlungen({ limit = 20, nach = null } = {}) {
  const bank = { name: "Beispielbank", endet: "1234" };
  const alle = [
    { id: "po_demo_3", betragCent: 48000, waehrung: "eur", status: "in_transit", statusText: "Unterwegs", ankunftAm: tag(-2), erstelltAm: zeit(0), bank, fehler: null },
    { id: "po_demo_2", betragCent: 15000, waehrung: "eur", status: "paid", statusText: "Angekommen", ankunftAm: tag(1), erstelltAm: zeit(3), bank, fehler: null },
    { id: "po_demo_1", betragCent: 62000, waehrung: "eur", status: "paid", statusText: "Angekommen", ankunftAm: tag(8), erstelltAm: zeit(10), bank, fehler: null },
  ];
  const ab = nach ? alle.findIndex((p) => p.id === nach) + 1 : 0;
  const seite = alle.slice(ab, ab + limit);
  const weitere = ab + limit < alle.length;
  return {
    konto: { verbunden: true, auszahlungenAktiv: true, kontoTyp: "standard" },
    saldo: { verfuegbarCent: 0, unterwegsCent: 48000, waehrung: "eur" },
    auszahlungen: seite, weitere, nach: weitere ? seite[seite.length - 1]?.id || null : null,
  };
}
