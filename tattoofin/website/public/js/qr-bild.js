// Digitaler QR-Code der Zahlseite als PNG (Knopf „QR als PNG“ unter Werbung im Dashboard).
// Scharf aus der QR-Matrix gezeichnet, 4 Module Ruhezone. Braucht /js/qrcode.min.js (window.QRCode).
// Seit 15.11.2026 eigene Datei (vorher Teil von js/aufsteller.js; den Holz-Aufsteller gibt es nicht mehr).
(function (root) {
  function qrMatrix(url) {
    if (!root.QRCode) throw new Error("QR-Bibliothek fehlt");
    // Fehlerkorrektur Q (25 %), bei langen Links M (15 %), damit die Module groß genug bleiben
    var mk = function (lvl) { return new root.QRCode(root.document.createElement("div"), { text: url, width: 64, height: 64, correctLevel: lvl })._oQRCode; };
    var m = mk(root.QRCode.CorrectLevel.Q);
    if (m.getModuleCount() > 33) m = mk(root.QRCode.CorrectLevel.M);
    var n = m.getModuleCount(), rows = [];
    for (var r = 0; r < n; r++) { var row = []; for (var c = 0; c < n; c++) row.push(m.isDark(r, c)); rows.push(row); }
    return rows;
  }
  function qrBild(url, px, farbe) {
    var mx = qrMatrix(url), n = mx.length, gesamt = n + 8, m = Math.floor((px || 1200) / gesamt), seite = m * gesamt;
    var cv = root.document.createElement("canvas"); cv.width = cv.height = seite;
    var c = cv.getContext("2d"); c.fillStyle = "#ffffff"; c.fillRect(0, 0, seite, seite); c.fillStyle = farbe || "#000000";
    mx.forEach(function (row, r) { row.forEach(function (d, col) { if (d) c.fillRect((col + 4) * m, (r + 4) * m, m, m); }); });
    return cv;
  }
  root.TFQr = { qrBild: qrBild, qrMatrix: qrMatrix };
})(window);
