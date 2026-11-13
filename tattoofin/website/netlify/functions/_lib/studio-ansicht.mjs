// Ausgabe von Studio und Zahlungen an das Studio selbst (Dashboard /api/portal und App /api/app). Ohne interne Werte.
import { CFG, provisionSatz, paketVon, aufstellerInklusive, BAUSTEINE_SIMULIERT } from "./config.mjs";
import { hatUmstellungsangebot, connectUrl, darfKassieren, anzahlungsbedingungen, eingebettet, klarnaFuer, klarnaDauerhaft, STATUS, hatGarantie } from "./domain.mjs";
import { gutscheinStatus, gutscheinUrl } from "./gutschein.mjs";

export const zahlseite = (s) => `${CFG.siteUrl}/zahlen/${s.slug}`;
// Zahlung für die Ausgabe an das Studio (ohne interne Werte wie den Client-Schlüssel des Bezahlfelds, IP/Browser des Kunden)
export const fuerStudio = (z) => {
  const { clientSecret, betragFuerPi, leistungToken, ...rest } = z;
  if (rest.kundeBestaetigt) rest.kundeBestaetigt = { am: rest.kundeBestaetigt.am, inhalt: rest.kundeBestaetigt.inhalt, version: rest.kundeBestaetigt.version };
  if (leistungToken) rest.leistungLink = `${CFG.siteUrl}/bestaetigung.html?t=${leistungToken.t}`;
  if (rest.gutschein) {
    const { token, ...g } = rest.gutschein;
    rest.gutschein = { ...g, status: gutscheinStatus(z), link: token ? gutscheinUrl(rest.gutschein) : null };
  }
  return rest;
};
export const oeffentlich = (s) => ({
  id: s.id, firma: s.firma, inhaber: s.inhaber, email: s.email, telefon: s.telefon, studioTelefon: s.studioTelefon,
  strasse: s.strasse, plz: s.plz, ort: s.ort, modell: s.modell, zahlart: s.zahlart, preisNetto: s.preisNetto, slug: s.slug,
  status: s.status, statusText: STATUS[s.status] || s.status, createdAt: s.createdAt, goLiveAt: s.goLiveAt,
  vertrag: { version: s.vertrag?.version, akzeptiertAm: s.vertrag?.akzeptiertAm, name: s.vertrag?.name },
  kuendigung: s.kuendigung || null, loeschAnfrage: s.loeschAnfrage ? { am: s.loeschAnfrage.am, durch: s.loeschAnfrage.durch } : null, fragebogenAm: s.fragebogen?.updatedAt || null,
  benachrichtigung: { email: s.benachrichtigungEmail || s.email },
  garantieBis: hatGarantie(s) ? (s.goLiveAt ? new Date(new Date(s.goLiveAt).getTime() + CFG.garantieTage * 864e5).toISOString() : "ab Go-live") : null,
  stripe: { klarnaAktiv: s.stripe?.klarnaAktiv, verbunden: Boolean(s.stripe?.accountId), freigegeben: Boolean(s.stripe?.chargesEnabled), auszahlungen: Boolean(s.stripe?.payoutsEnabled), express: s.stripe?.kontoTyp === "express", angabenGemacht: Boolean(s.stripe?.detailsSubmitted), kontoTyp: s.stripe?.kontoTyp || (s.modell === "provision" ? "express" : "standard") },
  klarna: klarnaFuer(s), klarnaDauerhaft: klarnaDauerhaft(s),
  paket: paketVon(s).id, paketName: paketVon(s).name, provisionProzent: provisionSatz(s), monatNetto: s.monatNetto || null, aufstellerInklusive: aufstellerInklusive(s),
  recht: s.recht ? { version: s.recht.version, am: s.recht.am, aktuell: s.recht.version === CFG.rechtVersion } : null,
  checkliste: s.checkliste || {}, extrasAngefragt: Object.keys(s.extras || {}), eingebettet: eingebettet(), simulation: BAUSTEINE_SIMULIERT,
  anzahlungsbedingungen: anzahlungsbedingungen(s),
  ausweichAnzahlung: { an: Boolean(s.ausweichAnzahlung?.an), prozent: s.ausweichAnzahlung?.prozent || 30 },
  zahlartenHinweis: Boolean(s.zahlartenHinweis),
  umstellungAngebot: hatUmstellungsangebot(s) ? { monatNetto: s.umstellung.monatNetto } : null,
  altKonto: s.stripe?.altKonto ? { bis: s.stripe.altKonto.bis } : null,
  kannKassieren: Boolean(darfKassieren(s)), zahlseite: zahlseite(s), connectUrl: connectUrl(s),
  aufsteller: { inklusive: CFG.aufstellerPakete.includes(paketVon(s).id), holz: s.aufsteller?.holz || "hell", variante: s.aufsteller?.variante || "name", hatLogo: Boolean(s.aufsteller?.hatLogo), angefordertAm: s.aufsteller?.angefordertAm || null, preisNetto: CFG.aufstellerPreisNetto, bezahltAm: s.aufsteller?.kauf?.bezahltAm || null },
});
