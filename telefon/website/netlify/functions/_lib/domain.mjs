// Geschäftslogik: Benachrichtigungen, Kündigung, Provisionsabrechnung.
import { CFG } from "./config.mjs";
import { sendMail } from "./mail.mjs";
import { mails } from "./emails.mjs";
import { stripe, taxRateId } from "./stripe.mjs";
import { allStudios, anfragenVon, saveAnfrage, getAbrechnung, saveAbrechnung, saveStudio, log, store } from "./store.mjs";
import { monatsende, addMonths, now } from "./util.mjs";

export const STATUS = {
  entwurf: "Abschluss begonnen",
  zahlung_offen: "Rechnung offen",
  einrichtung: "In Einrichtung",
  live: "Live",
  gekuendigt: "Gekündigt (läuft noch)",
  beendet: "Beendet",
  erstattet: "Erstattet (Garantie)",
  abgebrochen: "Abgebrochen",
};

export async function notify(studio, mail) {
  return sendMail({ to: studio.email, subject: mail.subject, html: mail.html, text: mail.text });
}

export async function notifyAdmin(titel, studio, details) {
  if (!CFG.adminEmail) return;
  const m = mails.intern(titel, studio, details);
  return sendMail({ to: CFG.adminEmail, subject: m.subject, html: m.html, text: m.text });
}

// Kündigung: beide Modelle zum Ende des laufenden Monats
export function kuendigungsDatum(date = new Date()) {
  return monatsende(date);
}

// Provisionspflichtige Termine eines Monats
export async function provisionFuerMonat(studio, monat) {
  const anfragen = await anfragenVon(studio.id);
  const positionen = [];
  for (const a of anfragen) {
    if (a.status !== "gebucht" || !a.terminDatum || !(a.preisNettoCent > 0)) continue;
    if (a.terminDatum.slice(0, 7) !== monat) continue;
    if (a.abgerechnet && a.abgerechnet !== monat) continue;
    // Zuordnung: Termin muss innerhalb von X Monaten nach der Anfrage gebucht/stattgefunden haben
    if (a.terminDatum > addMonths(a.createdAt, CFG.zuordnungMonate)) continue;
    // Nachlauf: nach Vertragsende nur Anfragen aus der Laufzeit, Termin höchstens X Monate nach Ende
    if (studio.vertragsende && (a.createdAt > studio.vertragsende || a.terminDatum > addMonths(studio.vertragsende, CFG.nachlaufMonate))) continue;
    positionen.push({
      anfrageId: a.id, name: a.name || "", motiv: a.motiv || "", terminDatum: a.terminDatum,
      umsatzNettoCent: a.preisNettoCent, provisionCent: Math.round(a.preisNettoCent * CFG.provisionProzent / 100),
    });
  }
  const umsatzNetto = positionen.reduce((s, p) => s + p.umsatzNettoCent, 0);
  const summeNetto = positionen.reduce((s, p) => s + p.provisionCent, 0);
  return { positionen, umsatzNetto, summeNetto };
}

// Mehrminuten über Fair Use (beide Modelle)
export function mehrminuten(studio, monat) {
  const min = Math.ceil(studio.minuten?.[monat] || 0);
  const extra = Math.max(0, min - CFG.fairUseMinuten);
  return { minuten: min, extra, cent: extra * CFG.extraMinuteCent };
}

// Erstellt die Monatsabrechnungen für alle Studios: Provision (Modell B) und Mehrminuten (beide Modelle).
// dryRun = nur berechnen, nichts anlegen.
export async function monatsabrechnung(monat, { dryRun = false } = {}) {
  const ergebnis = [];
  for (const s of await allStudios()) {
    if (!["einrichtung", "live", "gekuendigt", "beendet"].includes(s.status)) continue;
    if (s.status === "beendet" && s.vertragsende && monat > addMonths(s.vertragsende, CFG.nachlaufMonate).slice(0, 7)) continue;
    const vorhanden = await getAbrechnung(s.id, monat);
    if (vorhanden && !dryRun) { ergebnis.push({ studio: s.firma, monat, status: "schon abgerechnet" }); continue; }

    const calc = s.modell === "provision" ? await provisionFuerMonat(s, monat) : { positionen: [], umsatzNetto: 0, summeNetto: 0 };
    const mm = mehrminuten(s, monat);
    const ab = { studioId: s.id, modell: s.modell, monat, ...calc, mehrminuten: mm, gesamtNetto: calc.summeNetto + mm.cent, createdAt: now() };
    ab.status = ab.gesamtNetto ? "offen" : "nichts_faellig";
    if (dryRun) { ergebnis.push({ studio: s.firma, ...ab }); continue; }
    if (s.modell === "kauf" && !ab.gesamtNetto) continue; // Kauf ohne Mehrminuten: keine Abrechnung nötig

    let rechnungUrl = "";
    if (ab.gesamtNetto > 0) {
      const txr = await taxRateId();
      for (const p of calc.positionen) {
        await stripe("POST", "/invoiceitems", {
          customer: s.stripe.customerId, currency: "eur", amount: p.provisionCent, tax_rates: [txr],
          description: `Provision ${CFG.provisionProzent} % · Termin ${p.terminDatum.slice(0, 10)} · ${p.motiv || "Tattoo"} (Umsatz netto ${(p.umsatzNettoCent / 100).toFixed(2)} €)`,
          metadata: { studioId: s.id, anfrageId: p.anfrageId, monat },
        }, { idempotencyKey: `ii-${s.id}-${p.anfrageId}-${monat}` });
      }
      if (mm.cent > 0) {
        await stripe("POST", "/invoiceitems", {
          customer: s.stripe.customerId, currency: "eur", amount: mm.cent, tax_rates: [txr],
          description: `Mehrminuten ${monat}: ${mm.extra} Min. über ${CFG.fairUseMinuten} Inklusivminuten à ${(CFG.extraMinuteCent / 100).toFixed(2)} €`,
          metadata: { studioId: s.id, monat, typ: "mehrminuten" },
        }, { idempotencyKey: `mm-${s.id}-${monat}` });
      }
      const automatisch = s.modell === "provision" && s.stripe.paymentMethod;
      const inv = await stripe("POST", "/invoices", {
        customer: s.stripe.customerId, auto_advance: true, pending_invoice_items_behavior: "include", currency: "eur",
        collection_method: automatisch ? "charge_automatically" : "send_invoice",
        ...(automatisch ? { default_payment_method: s.stripe.paymentMethod } : { days_until_due: CFG.rechnungFaelligTage }),
        description: `Ted am Telefon · Abrechnung ${monat}`,
        metadata: { studioId: s.id, typ: "monat", monat },
      }, { idempotencyKey: `inv-${s.id}-${monat}` });
      const fin = await stripe("POST", `/invoices/${inv.id}/finalize`, { auto_advance: true });
      if (!automatisch) await stripe("POST", `/invoices/${fin.id}/send`, {});
      ab.stripeInvoiceId = fin.id;
      ab.rechnungUrl = rechnungUrl = fin.hosted_invoice_url || "";
      ab.rechnungNr = fin.number || "";
      ab.status = automatisch ? "wird_eingezogen" : "rechnung_versendet";
    }
    for (const p of calc.positionen) {
      const a = (await anfragenVon(s.id)).find((x) => x.id === p.anfrageId);
      if (a) { a.abgerechnet = monat; await saveAnfrage(a); }
    }
    await saveAbrechnung(ab);
    await notify(s, mails.monatsabrechnung(s, ab, { rechnungUrl }));
    await log("abrechnung", { studioId: s.id, monat, gesamtNetto: ab.gesamtNetto });
    ergebnis.push({ studio: s.firma, monat, provisionNetto: ab.summeNetto, mehrminutenNetto: mm.cent, termine: ab.positionen.length, rechnung: ab.rechnungNr });
  }
  if (!dryRun && ergebnis.length) await sendMail({
    to: CFG.adminEmail, subject: `[Ted] Monatsabrechnung ${monat} erstellt`,
    html: `<pre>${JSON.stringify(ergebnis, null, 2)}</pre>`, text: JSON.stringify(ergebnis, null, 2),
  });
  return ergebnis;
}

// Läuft täglich: Vertragsende, Erinnerungen
export async function taeglicheJobs(heute = new Date()) {
  const out = [];
  const tag = heute.getUTCDate();
  const letzterTag = new Date(Date.UTC(heute.getUTCFullYear(), heute.getUTCMonth() + 1, 0)).getUTCDate();
  for (const s of await allStudios()) {
    // Abgebrochene Abschlüsse nach ~24 h einmal erinnern
    if (s.status === "entwurf" && !s.erinnertAbbruch && Date.now() - new Date(s.createdAt).getTime() > 20 * 3600e3) {
      s.erinnertAbbruch = now(); await saveStudio(s);
      await notify(s, mails.anmeldungAbgebrochen(s, { resumeUrl: `${CFG.siteUrl}/start.html?resume=${s.id}` }));
      out.push(["abbruch-erinnerung", s.firma]);
    }
    // Kündigung: 7 Tage vorher erinnern, am Stichtag beenden
    if (s.status === "gekuendigt" && s.kuendigung?.zum) {
      const tageBis = (new Date(s.kuendigung.zum) - heute) / 864e5;
      if (tageBis <= 7 && tageBis > 0 && !s.kuendigung.erinnert) {
        s.kuendigung.erinnert = now(); await saveStudio(s);
        await notify(s, mails.vertragsendeBald(s, { zum: s.kuendigung.zum }));
        await notifyAdmin("Vertragsende in 7 Tagen: Nummer abschalten vorbereiten", s, { zum: s.kuendigung.zum });
        out.push(["ende-bald", s.firma]);
      }
      if (tageBis <= 0) {
        s.status = "beendet"; s.vertragsende = s.kuendigung.zum; await saveStudio(s);
        await notify(s, mails.vertragsende(s));
        await notifyAdmin("Vertrag beendet: Ted-Nummer abschalten, Daten in 30 Tagen löschen", s, {});
        out.push(["beendet", s.firma]);
      }
    }
    // Provision: Erinnerung zum Monatsende und am Tag vor der Meldefrist
    if (s.modell === "provision" && ["live", "gekuendigt", "beendet"].includes(s.status)) {
      const erinnerung = tag === letzterTag - 1 || tag === CFG.meldeTag - 1 || tag === CFG.meldeTag;
      if (erinnerung) {
        const offen = (await anfragenVon(s.id)).filter((a) => a.status === "offen" && (Date.now() - new Date(a.createdAt)) > 3 * 864e5).length;
        const key = heute.toISOString().slice(0, 10);
        if (offen > 0 && s.letzteErinnerung !== key) {
          s.letzteErinnerung = key; await saveStudio(s);
          const monat = tag <= CFG.meldeTag ? new Date(Date.UTC(heute.getUTCFullYear(), heute.getUTCMonth() - 1, 1)).toISOString().slice(0, 7) : heute.toISOString().slice(0, 7);
          await notify(s, mails.buchungenErinnerung(s, { offen, monat, letzte: tag === CFG.meldeTag }));
          out.push(["buchungs-erinnerung", s.firma, offen]);
        }
      }
    }
  }
  return out;
}

export async function zaehleAktion() {
  const z = (await store.get("meta/aktion-zaehler")) || { n: 0 };
  z.n += 1;
  await store.set("meta/aktion-zaehler", z);
}
