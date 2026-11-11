// EINE zentrale Stelle für alle Klarna-Aussagen, die Kunden der Studios sehen (Stand 11.11.2026).
// Quelle: Klarna-Regeln Deutschland ab 20.11.2026 (docs.klarna.com/acquirer/klarna/resources/marketing-tools/partner-marketing-legal-guidelines/germany/).
// Das Gegenstück im Browser ist public/js/klarna-texte.js (gleiche Werte; dev/e2e.mjs prüft, dass beide übereinstimmen).
//
// Regeln:
//  - Nur der Name („Klarna verfügbar“, „Mit Klarna bezahlen“) darf OHNE Warnsatz stehen, ohne Raten-/Später-Bezug.
//  - Jede Aussage zu später bezahlen, 30 Tagen oder Raten steht im freigegebenen Wortlaut, mit dem Warnsatz DIREKT daneben
//    (gleich groß, nie in Fußzeile oder Kleingedrucktem). Wortlaut nicht verändern.
//  - „In 3 Teilzahlungen“ gibt es nur auf Anfrage bei Klarna → nicht verwenden.
export const KLARNA_WARNSATZ = "Achtung! Kreditaufnahme kostet Geld.";
export const KLARNA_NAME = { verfuegbar: "Klarna verfügbar", mitKlarna: "Mit Klarna bezahlen" };
export const KLARNA_AUSSAGE = {
  spaeter: "Jetzt shoppen. Bezahle später mit Klarna.",
  tage30: "In bis zu 30 Tagen bezahlen mit Klarna.",
  finanzierung: "Bezahle in 6, 12, 24 oder 36 Monatsraten mit Klarna.",
};
// Zusatz (darf bleiben): wer Vertragspartner ist. „Wir“-Fassung für Texte, die das Studio selbst veröffentlicht.
export const KLARNA_ZUSATZ = "Raten über Klarna, nach deren Bonitätsprüfung. Vertragspartner der Raten ist Klarna, nicht Tattoofin.";
export const KLARNA_ZUSATZ_STUDIO = "Raten über Klarna, nach deren Bonitätsprüfung. Vertragspartner der Raten ist Klarna, weder wir noch Tattoofin.";

// Freigegebene Aussage + Warnsatz direkt dahinter (gleiche Zeile)
export const mitWarnsatz = (aussage) => `${aussage} ${KLARNA_WARNSATZ}`;
// Fußnote/Pflichtsatz: Zusatz + Warnsatz (für Seiten, die Raten-Aussagen machen)
export const PFLICHTSATZ = `*${KLARNA_ZUSATZ} ${KLARNA_WARNSATZ}`;
export const PFLICHTSATZ_STUDIO = `*${KLARNA_ZUSATZ_STUDIO} ${KLARNA_WARNSATZ}`;
// HTML für E-Mails: Warnsatz fett und größer als der Zusatz
export const PFLICHTSATZ_HTML = `<span style="color:#1f3d5c;font-size:15px;line-height:1.5">*${KLARNA_ZUSATZ} <b style="font-size:16px">${KLARNA_WARNSATZ}</b></span>`;

// Wörter, die auf einen Gutschein/Guthaben hindeuten. Klarna lässt „Wertkarten, Gutscheine und Geschenkkarten“ nicht zu
// (docs.stripe.com/payments/klarna/compliance). Steht so ein Wort im normalen Projektfeld, wird Klarna für diese Zahlung abgeschaltet.
export const GUTSCHEIN_WORT = /gutschein|guthaben|geschenkkarte|geschenk-?karte|wertkarte|wertgutschein|geschenk-?gutschein|gift\s?-?card|voucher|prepaid|aufladen/i;
export const gutscheinWort = (...texte) => GUTSCHEIN_WORT.test(texte.filter(Boolean).join(" "));
export const GUTSCHEIN_HINWEIS = "Für Gutscheine bitte die Gutschein-Funktion nutzen. Bei diesem Link ist Klarna ausgeschaltet, bezahlt wird per Karte.";
