// Gemeinsame Prüfung der Studio-Angaben für die Anmeldung im Web (signup.mjs) und in der App (app-registrierung.mjs).
// Ergebnis: { d, fehlt, felder }
//   d      bereinigte Angaben (gekürzt, E-Mail klein, USt-IdNr. groß)
//   fehlt  Texte für die Meldung „Bitte ausfüllen: …“ (wie bisher im Web)
//   felder Feldnamen für die App (firma, inhaber, strasse, plz, ort, telefon, studioTelefon, unterzeichner[, email])
import { clean, isEmail } from "./util.mjs";

const PFLICHT = [["firma", "Studio/Firma"], ["inhaber", "Inhaber"], ["strasse", "Straße"], ["plz", "PLZ"], ["ort", "Ort"], ["telefon", "Mobilnummer"], ["studioTelefon", "Studio-Telefonnummer"], ["unterzeichner", "Name des Unterzeichners"]];
const ziffern = (x) => String(x || "").replace(/\D/g, "").length;

// mitEmail: E-Mail kommt aus dem Formular (Web). In der App steht sie im Registrier-Token und wird hier nicht geprüft.
export function studioDatenPruefen(b = {}, { mitEmail = true } = {}) {
  const d = {
    firma: clean(b.firma, 120), inhaber: clean(b.inhaber, 120), strasse: clean(b.strasse, 120), plz: clean(b.plz, 10),
    ort: clean(b.ort, 80), ...(mitEmail ? { email: clean(b.email, 160).toLowerCase() } : {}), telefon: clean(b.telefon, 40),
    studioTelefon: clean(b.studioTelefon, 40), ustid: clean(b.ustid, 30).toUpperCase(), artists: clean(b.artists, 10),
    unterzeichner: clean(b.unterzeichner, 120), website: clean(b.website, 160),
  };
  const fehlt = [], felder = [];
  const markiere = (feld, text) => { fehlt.push(text); if (!felder.includes(feld)) felder.push(feld); };
  for (const [k, n] of PFLICHT) if (!d[k]) markiere(k, n);
  if (mitEmail && !isEmail(d.email)) markiere("email", "gültige E-Mail");
  // Plausibilität (nicht nur „nicht leer“): PLZ 5 Ziffern, Telefonnummern mit mindestens 6 Ziffern
  if (d.plz && !/^\d{5}$/.test(d.plz)) markiere("plz", "PLZ (5 Ziffern)");
  if (d.telefon && ziffern(d.telefon) < 6) markiere("telefon", "Mobilnummer (mindestens 6 Ziffern)");
  if (d.studioTelefon && ziffern(d.studioTelefon) < 6) markiere("studioTelefon", "Studio-Telefonnummer (mindestens 6 Ziffern)");
  return { d, fehlt, felder };
}

// Alle vier Bestätigungen (Vertrag, AVV, Unternehmer, KMU) gesetzt?
export const bestaetigungenOk = (a) => Boolean(a?.vertrag && a?.avv && a?.unternehmer && a?.kmu);
