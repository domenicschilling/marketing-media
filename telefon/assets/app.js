/*
 * Füllt alle Platzhalter in den Telefon-Unterlagen:
 *   <span data-cfg="startPreis"></span>       -> Wert aus config.js (Preise mit €)
 *   <span data-p="studio"></span>             -> Link-Parameter ?studio=… (sonst Platzhalter)
 *   <div data-qr="tel:{tel}"></div>           -> QR-Code, {studio}/{tel}/{telRaw}/{web} werden ersetzt
 * Setzt danach document.body.dataset.ready = "1" (für den PDF-Export).
 */
(function () {
  var C = window.CFG || {};
  var q = new URLSearchParams(location.search);
  var euro = /^(setup|startPreis|profiPreis)$/;

  function fmt(key) {
    var v = C[key];
    if (v === undefined) return "[" + key + "]";
    if (euro.test(key)) return String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " €";
    return String(v);
  }

  var P = {
    studio: q.get("studio") || C.studioPlatzhalter,
    tel: q.get("tel") || C.telPlatzhalter,
    web: q.get("web") || "",
    insta: q.get("insta") || "",
    zeiten: q.get("zeiten") || "",
    stadt: q.get("stadt") || ""
  };
  q.forEach(function (v, k) { if (!(k in P)) P[k] = v; });
  P.telRaw = P.tel.replace(/[^\d+]/g, "").replace(/^0(?=\d)/, "+49");

  function sub(s) {
    return s.replace(/\{(\w+)\}/g, function (_, k) {
      return P[k] !== undefined ? P[k] : (C[k] !== undefined ? C[k] : "");
    });
  }

  document.querySelectorAll("[data-cfg]").forEach(function (el) { el.textContent = fmt(el.dataset.cfg); });
  document.querySelectorAll("[data-p]").forEach(function (el) {
    var v = P[el.dataset.p];
    if (v) el.textContent = v; else if (el.dataset.hideEmpty !== undefined) el.style.display = "none";
  });
  document.querySelectorAll("[data-href]").forEach(function (el) { el.setAttribute("href", sub(el.dataset.href)); });
  // Optionales Studio-Logo: ?logo=https://… (sonst wird der Studioname als Schriftzug gezeigt)
  document.querySelectorAll("[data-logo]").forEach(function (el) {
    var src = q.get("logo");
    var alt = el.parentNode.querySelector("[data-logo-alt]");
    if (src) { el.src = src; if (alt) alt.style.display = "none"; } else el.style.display = "none";
  });

  // Platzhalter sichtbar markieren, damit nichts Unfertiges in den Druck geht
  document.querySelectorAll("[data-cfg],[data-p]").forEach(function (el) {
    if (/^\[.*\]$/.test(el.textContent.trim())) el.classList.add("todo");
  });

  if (window.QRCode) {
    document.querySelectorAll("[data-qr]").forEach(function (el) {
      var text = sub(el.dataset.qr);
      if (!text || /tel:$/.test(text)) text = C.webUrl;
      var size = parseInt(el.dataset.size || "160", 10);
      new QRCode(el, {
        text: text, width: size * 2, height: size * 2,
        colorDark: el.dataset.dark || "#0d1117", colorLight: el.dataset.light || "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
      });
    });
  }

  var btn = document.querySelector("[data-print]");
  if (btn) btn.addEventListener("click", function () { window.print(); });

  function done() { document.body.dataset.ready = "1"; }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(done); else done();
})();
