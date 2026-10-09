// Füllt die data-cfg-Platzhalter in Vertrag/AVV: Standardwerte aus doc-defaults.js,
// verbindliche Preise und Firmendaten aus /api/config (Server-Konfiguration).
(function () {
  function load(src) {
    return new Promise(function (ok) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = ok; document.head.appendChild(s); });
  }
  var komma = function (n) { return String(n).replace(".", ","); };
  load("/js/doc-defaults.js").then(function () {
    return fetch("/api/config").then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; });
  }).then(function (api) {
    var C = window.CFG || {};
    if (api.kaufNetto) {
      Object.assign(C, {
        firma: api.firma, adresse: api.adresse, registergericht: api.registergericht, ustid: api.ustid,
        geschaeftsfuehrer: api.geschaeftsfuehrer, ansprechpartner: api.geschaeftsfuehrer, telefon: api.telefon, email: api.email,
        gerichtsstand: api.gerichtsstand, kaufPreis: api.kaufNetto / 100, kaufAktionPreis: api.aktionNetto / 100,
        provisionSatz: api.provisionProzent + " %", provisionZuordnung: api.zuordnungMonate + " Monate",
        provisionNachlauf: api.nachlaufMonate + " Monate", provisionMeldefrist: api.meldeTag + ". des Folgemonats",
        fairUseMinuten: api.fairUseMinuten, extraMinute: komma((api.extraMinuteCent / 100).toFixed(2)), garantieTage: api.garantieTage,
        vertragVersion: api.vertragVersion,
      });
    }
    C.websiteUrl = location.origin;
    document.querySelectorAll("[data-cfg]").forEach(function (el) {
      var k = el.dataset.cfg, v = C[k];
      if (v === undefined) return;
      if (/^(kaufPreis|kaufAktionPreis)$/.test(k)) v = Number(v).toLocaleString("de-DE") + " €";
      el.textContent = v;
    });
  });
})();
