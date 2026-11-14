// EINE zentrale Stelle für alle Klarna-Aussagen im Browser (Gegenstück: netlify/functions/_lib/klarna-texte.mjs, gleiche Werte,
// dev/e2e.mjs prüft den Gleichstand). Klarna-Regeln Deutschland ab 20.11.2026:
//  - Nur der Name („Klarna verfügbar“, „Mit Klarna bezahlen“) darf ohne Warnsatz stehen, ohne Raten-/Später-Bezug.
//  - Raten-/Später-/30-Tage-Aussagen nur im freigegebenen Wortlaut, Warnsatz DIREKT daneben, gleich groß, nie im Kleingedruckten.
//  - „In 3 Teilzahlungen“ nicht verwenden.
window.TF_KLARNA = (function () {
  var WARNSATZ = "Achtung! Kreditaufnahme kostet Geld.";
  var NAME = { verfuegbar: "Klarna verfügbar", mitKlarna: "Mit Klarna bezahlen" };
  var AUSSAGE = {
    spaeter: "Jetzt shoppen. Bezahle später mit Klarna.",
    tage30: "In bis zu 30 Tagen bezahlen mit Klarna.",
    finanzierung: "Bezahle in 6, 12, 24 oder 36 Monatsraten mit Klarna."
  };
  var ZUSATZ = "Raten über Klarna, nach deren Bonitätsprüfung. Vertragspartner der Raten ist Klarna, nicht Tattoofin.";
  var ZUSATZ_STUDIO = "Raten über Klarna, nach deren Bonitätsprüfung. Vertragspartner der Raten ist Klarna, weder wir noch Tattoofin.";
  var GUTSCHEIN_WORT = /gutschein|guthaben|geschenkkarte|geschenk-?karte|wertkarte|wertgutschein|geschenk-?gutschein|gift\s?-?card|voucher|prepaid|aufladen/i;
  return {
    WARNSATZ: WARNSATZ, NAME: NAME, AUSSAGE: AUSSAGE, ZUSATZ: ZUSATZ, ZUSATZ_STUDIO: ZUSATZ_STUDIO,
    PFLICHTSATZ: "*" + ZUSATZ + " " + WARNSATZ,
    PFLICHTSATZ_STUDIO: "*" + ZUSATZ_STUDIO + " " + WARNSATZ,
    GUTSCHEIN_WORT: GUTSCHEIN_WORT,
    GUTSCHEIN_HINWEIS: "Für Gutscheine bitte die Gutschein-Funktion nutzen. Bei diesem Link ist Klarna ausgeschaltet, bezahlt wird per Karte.",
    // freigegebene Aussage + Warnsatz in derselben Zeile (Warnsatz fett, gleiche Größe)
    mitWarnsatz: function (aussage) { return aussage + " " + WARNSATZ; },
    mitWarnsatzHtml: function (aussage) { return aussage + ' <strong>' + WARNSATZ + '</strong>'; },
    // Pflichtsatz als HTML: Zusatz + Warnsatz (fett, gleiche Schriftgröße)
    pflichtHtml: function (studio) { return "*" + (studio ? ZUSATZ_STUDIO : ZUSATZ) + ' <strong>' + WARNSATZ + '</strong>'; },
    gutscheinWort: function () { return GUTSCHEIN_WORT.test(Array.prototype.slice.call(arguments).filter(Boolean).join(" ")); }
  };
})();
