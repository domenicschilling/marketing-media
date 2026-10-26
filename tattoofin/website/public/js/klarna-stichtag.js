// Klarna im Paket Risikofrei endet am Stichtag (Rechtsprüfung 27.10.2026, neues Verbraucherkreditrecht ab 20.11.2026).
// Der Stichtag kommt aus /api/config (klarnaPlattformBis, ISO-Zeitpunkt; null = Schalter aus, z. B. wenn Risikofrei als Direct Charge läuft).
// Elemente mit data-klarna-aus erscheinen erst ab dem Stichtag (gerechnet gegen die Uhr des Besuchers), data-klarna-an verschwinden dann,
// data-klarna-datum zeigt das Datum.
(function () {
  fetch("/api/config").then(function (r) { return r.json(); }).then(function (c) {
    if (!c || !c.klarnaPlattformBis) return;
    var bis = Date.parse(c.klarnaPlattformBis);
    if (isNaN(bis) || Date.now() < bis) return;
    var datum = new Date(bis).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" });
    document.querySelectorAll("[data-klarna-aus]").forEach(function (el) { el.hidden = false; });
    document.querySelectorAll("[data-klarna-an]").forEach(function (el) { el.hidden = true; });
    document.querySelectorAll("[data-klarna-datum]").forEach(function (el) { el.textContent = datum; });
  }).catch(function () {});
})();
