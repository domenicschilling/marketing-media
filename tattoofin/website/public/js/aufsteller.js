// QR-Aufsteller aus Holz (10 × 15 cm, Hochformat): Gravurvorlage mit dem echten QR-Code der Studio-Zahlseite.
// Erzeugt SVG, PDF und PNG direkt im Browser. Alle Schriften sind in Pfade umgewandelt (Glyphen aus
// /assets/aufsteller-glyphen.json: DM Sans 700/500 + Wortmarke in Luckiest Guy), damit jeder Laser-Dienst die Datei
// ohne Schriftarten öffnen kann.
//   Farben nach Formulor-Vorgabe: Schwarz RGB(0,0,0) gefüllt = Flächengravur · Blau RGB(0,0,255) Haarlinie 0,01 mm = Schnitt
//   (Rot wäre dort Liniengravur, wird hier nicht benutzt) · Grau = Platzhalter, nicht gravieren. Keine Pixelbilder: das Logo
//   wird in Vektor-Rechtecke umgewandelt. QR-Code mit Fehlerkorrektur Q (lange Links M) und 4 Modulen Ruhezone.
//   Formulor-Platte P1 (181 × 181 mm): Schild + zwei Fußteile mit Kreuz-Steckverbindung (Schlitzbreite = Materialstärke,
//   der Laser nimmt ca. 0,1–0,2 mm weg → leichtes Spiel). Untere 17 mm des Schilds bleiben frei (Fuß).
// Formulierungsregeln (tattoofin/UEBERGABE.md): „Raten“ nur mit Sternchen + Fußnote, kein „Geld sofort“, kein „voller Betrag“.
(function (root) {
  var FUSS = "*Ratenzahlung über externe Anbieter wie Klarna, nach deren Prüfung. Tattoofin ist kein Kreditgeber. Achtung! Kreditaufnahme kostet Geld.";
  var W = 100, H = 150, RADIUS = 4, RAND = 7, FUSSZONE = 17; // mm
  // Fuß: zwei Teile 60 × 16 mm, je ein Schlitz von oben (8 mm); Schild hat zwei Schlitze von unten (8 mm) bei x = 22 und 78
  var FUSS_L = 60, FUSS_H = 16, SCHLITZ_T = 8, SCHLITZ_X = [22, 78], PLATTE = 181, ABST = 4;
  var BLAU = "#0000ff";
  var QR_MM = 58, QR_OBEN = 40; // Kantenlänge der Module (ohne Ruhezone), Oberkante der Rahmen-Ecken
  var LOGO = { x: 15, y: 13.2, w: 70, h: 11.6 }; // Feld für das Studio-Logo
  var HOLZ = {
    hell: { name: "Birke hell", grund: "#e7cb98", grund2: "#d9b67c", maserung: "#b98f55", gravur: "#3b2410", kante: "#c9a46c" },
    dunkel: { name: "Walnuss dunkel", grund: "#7a5236", grund2: "#5f3d26", maserung: "#3e2716", gravur: "#1e120a", kante: "#4b301d" },
  };
  var G = null;

  function laden(url) {
    if (url && typeof url === "object") { G = url; return Promise.resolve(G); }
    if (G) return Promise.resolve(G);
    return fetch(url || "/assets/aufsteller-glyphen.json").then(function (r) { return r.json(); }).then(function (j) { G = j; return j; });
  }

  // ---------- Pfade ----------
  function parse(d) {
    var t = d.match(/[MLHVQCZ]|-?\d*\.?\d+(?:e-?\d+)?/gi) || [], i = 0, cmd = "", ops = [], x = 0, y = 0, sx = 0, sy = 0;
    function n() { return parseFloat(t[i++]); }
    while (i < t.length) {
      if (/^[A-Za-z]$/.test(t[i])) cmd = t[i++].toUpperCase();
      if (cmd === "M") { x = sx = n(); y = sy = n(); ops.push(["M", x, y]); cmd = "L"; }
      else if (cmd === "L") { x = n(); y = n(); ops.push(["L", x, y]); }
      else if (cmd === "H") { x = n(); ops.push(["L", x, y]); }
      else if (cmd === "V") { y = n(); ops.push(["L", x, y]); }
      else if (cmd === "Q") { var a = n(), b = n(); x = n(); y = n(); ops.push(["Q", a, b, x, y]); }
      else if (cmd === "C") { var c1 = n(), c2 = n(), c3 = n(), c4 = n(); x = n(); y = n(); ops.push(["C", c1, c2, c3, c4, x, y]); }
      else if (cmd === "Z") { ops.push(["Z"]); x = sx; y = sy; cmd = ""; }
      else i++;
    }
    return ops;
  }
  // x' = ox + x*s, y' = oy - y*s (Schrift-Koordinaten zeigen nach oben)
  function setzen(ops, ox, oy, s) {
    return ops.map(function (o) {
      if (o[0] === "Z") return o;
      var r = [o[0]];
      for (var k = 1; k < o.length; k += 2) r.push(ox + o[k] * s, oy - o[k + 1] * s);
      return r;
    });
  }
  function rechteck(x, y, w, h) { return [["M", x, y], ["L", x + w, y], ["L", x + w, y + h], ["L", x, y + h], ["Z"]]; }
  function rundRechteck(x, y, w, h, r) {
    var k = 0.5523 * r; // Viertelkreis als Bézier
    return [["M", x + r, y], ["L", x + w - r, y], ["C", x + w - r + k, y, x + w, y + r - k, x + w, y + r], ["L", x + w, y + h - r],
      ["C", x + w, y + h - r + k, x + w - r + k, y + h, x + w - r, y + h], ["L", x + r, y + h], ["C", x + r - k, y + h, x, y + h - r + k, x, y + h - r],
      ["L", x, y + r], ["C", x, y + r - k, x + r - k, y, x + r, y], ["Z"]];
  }
  var zahl = function (v) { return String(Math.round(v * 1000) / 1000); };
  function svgD(ops) { return ops.map(function (o) { return o[0] + o.slice(1).map(zahl).join(" "); }).join(""); }

  // ---------- Schrift ----------
  function glyphe(F, ch) {
    var g = F.g[ch];
    if (!g) { var ohne = ch.normalize("NFD").replace(/[̀-ͯ]/g, ""); g = F.g[ohne] || F.g["?"]; }
    return g;
  }
  function breite(f, txt, size) {
    var F = G[f], s = size / F.upm, w = 0;
    Array.from(txt).forEach(function (ch) { w += glyphe(F, ch)[0] * s; });
    return w;
  }
  // Text als Pfad; anchor: "mitte" | "links"
  function text(f, txt, x, yBasis, size, anchor) {
    var F = G[f], s = size / F.upm, ops = [];
    var cx = anchor === "links" ? x : x - breite(f, txt, size) / 2;
    Array.from(txt).forEach(function (ch) {
      var g = glyphe(F, ch);
      if (g[1]) ops = ops.concat(setzen(parse(g[1]), cx, yBasis, s));
      cx += g[0] * s;
    });
    return ops;
  }
  function umbrechen(f, txt, size, maxW) {
    var worte = txt.split(/\s+/), z = [], akt = "";
    worte.forEach(function (w) { var t = akt ? akt + " " + w : w; if (breite(f, t, size) > maxW && akt) { z.push(akt); akt = w; } else akt = t; });
    if (akt) z.push(akt);
    return z;
  }
  // Name auf eine oder zwei Zeilen verteilen (möglichst gleich lang)
  function zweiZeilen(txt) {
    var w = txt.split(/\s+/); if (w.length < 2) return [txt];
    var best = null;
    for (var i = 1; i < w.length; i++) {
      var a = w.slice(0, i).join(" "), b = w.slice(i).join(" "), d = Math.max(breite("dm700", a, 10), breite("dm700", b, 10));
      if (!best || d < best.d) best = { d: d, z: [a, b] };
    }
    return best.z;
  }

  // ---------- QR-Code ----------
  function qrMatrix(url) {
    if (!root.QRCode) throw new Error("QR-Bibliothek fehlt");
    // Fehlerkorrektur Q (25 %) für Holz; bei langen Links M (15 %), damit die Module groß genug bleiben
    var mk = function (lvl) { return new root.QRCode(root.document.createElement("div"), { text: url, width: 64, height: 64, correctLevel: lvl })._oQRCode; };
    var m = mk(root.QRCode.CorrectLevel.Q);
    if (m.getModuleCount() > 33) m = mk(root.QRCode.CorrectLevel.M);
    var n = m.getModuleCount(), rows = [];
    for (var r = 0; r < n; r++) { var row = []; for (var c = 0; c < n; c++) row.push(m.isDark(r, c)); rows.push(row); }
    return rows;
  }
  function qrPfad(mx, x0, y0, modul) {
    var ops = [];
    mx.forEach(function (row, r) {
      for (var c = 0; c < row.length; c++) {
        if (!row[c]) continue;
        var start = c; while (c + 1 < row.length && row[c + 1]) c++;
        ops = ops.concat(rechteck(x0 + start * modul, y0 + r * modul, (c - start + 1) * modul, modul));
      }
    });
    return ops;
  }

  // ---------- Schnittkonturen ----------
  function verschieben(ops, dx, dy) { return ops.map(function (o) { if (o[0] === "Z") return o; var r = [o[0]]; for (var k = 1; k < o.length; k += 2) r.push(o[k] + dx, o[k + 1] + dy); return r; }); }
  // Schild mit zwei Schlitzen von unten (Breite = Materialstärke t), Ecken r = 4 mm
  function schildKontur(t) {
    var r = RADIUS, k = 0.5523 * r, ops = [["M", r, 0], ["L", W - r, 0], ["C", W - r + k, 0, W, r - k, W, r], ["L", W, H - r], ["C", W, H - r + k, W - r + k, H, W - r, H]];
    SCHLITZ_X.slice().reverse().forEach(function (sx) { ops.push(["L", sx + t / 2, H], ["L", sx + t / 2, H - SCHLITZ_T], ["L", sx - t / 2, H - SCHLITZ_T], ["L", sx - t / 2, H]); });
    ops.push(["L", r, H], ["C", r - k, H, 0, H - r + k, 0, H - r], ["L", 0, r], ["C", 0, r - k, r - k, 0, r, 0], ["Z"]);
    return ops;
  }
  // Fußteil 60 × 16 mm mit Schlitz von oben in der Mitte, untere Ecken leicht gerundet
  function fussKontur(t) {
    var c = FUSS_L / 2, r = 2, k = 0.5523 * r;
    return [["M", 0, 0], ["L", c - t / 2, 0], ["L", c - t / 2, SCHLITZ_T], ["L", c + t / 2, SCHLITZ_T], ["L", c + t / 2, 0], ["L", FUSS_L, 0],
      ["L", FUSS_L, FUSS_H - r], ["C", FUSS_L, FUSS_H - r + k, FUSS_L - r + k, FUSS_H, FUSS_L - r, FUSS_H], ["L", r, FUSS_H], ["C", r - k, FUSS_H, 0, FUSS_H - r + k, 0, FUSS_H - r], ["Z"]];
  }
  // Datei für den Laser: formulor = ganze Platte P1 mit Schild + 2 Fußteilen, sonst nur das Schild
  function datei(o, opts) {
    opts = opts || {};
    var sz = bauen(o), t = opts.dicke || 3;
    if (!opts.formulor) return { w: W, h: H, gravur: sz.gravur, schnitt: sz.kontur, sz: sz };
    var y2 = ABST + H + 6;
    return { w: PLATTE, h: PLATTE, sz: sz, gravur: verschieben(sz.gravur, ABST, ABST),
      schnitt: verschieben(schildKontur(t), ABST, ABST).concat(verschieben(fussKontur(t), ABST, y2), verschieben(fussKontur(t), ABST + FUSS_L + 6, y2)) };
  }

  // ---------- Layout ----------
  // o = { url, firma, variante: "name" | "logo", logo: { src (Data-URL JPEG, schwarz/weiß), w, h } }
  function bauen(o) {
    if (!G) throw new Error("Glyphen nicht geladen – erst TFAufsteller.laden()");
    var mitte = W / 2, nutz = W - 2 * RAND, g = [], blau = [], blauText = [];
    var mx = qrMatrix(o.url), n = mx.length, modul = QR_MM / n, qx = mitte - QR_MM / 2, ruhe = 4 * modul, e0 = ruhe + 0.6, QR_Y = QR_OBEN + e0;

    // 1) Tattoofin-Wortmarke klein oben
    var WM = G.wortmarke, wmB = 30, wmS = wmB / WM.w;
    g = g.concat(setzen(parse(WM.d), mitte - wmB / 2, 7.4 + WM.cap * wmS, wmS));

    // 2) Studioname oder Logo-Feld
    var logo = null;
    if (o.variante === "logo") {
      if (o.logo && o.logo.runs) {
        // Logo als Vektor: jede schwarze Pixelreihe wird ein Rechteck (Laser-Dienste nehmen keine Pixelbilder)
        var L = o.logo, f = Math.min(LOGO.w / L.gw, LOGO.h / L.gh), lx = mitte - L.gw * f / 2, ly = LOGO.y + (LOGO.h - L.gh * f) / 2;
        for (var ri = 0; ri < L.runs.length; ri += 3) g = g.concat(rechteck(lx + L.runs[ri + 1] * f, ly + L.runs[ri] * f, L.runs[ri + 2] * f, f));
      } else {
        blau = rundRechteck(LOGO.x, LOGO.y, LOGO.w, LOGO.h, 2);
        blauText = text("dm700", "DEIN STUDIO-LOGO", mitte, LOGO.y + LOGO.h / 2 + 1.4, 4, "mitte");
      }
    } else {
      var name = String(o.firma || "Dein Studio").trim().replace(/\s+/g, " ");
      var gr = Math.min(9, nutz / breite("dm700", name, 1));
      if (gr >= 6.2) g = g.concat(text("dm700", name, mitte, 22.6, gr, "mitte"));
      else {
        var z = zweiZeilen(name), gr2 = Math.min(4.9, nutz / Math.max(breite("dm700", z[0], 1), breite("dm700", z[1] || "", 1)));
        if (z.length === 1) g = g.concat(text("dm700", name, mitte, 22.6, Math.max(gr, 3.2), "mitte"));
        else { g = g.concat(text("dm700", z[0], mitte, 17.9, gr2, "mitte")); g = g.concat(text("dm700", z[1], mitte, 17.9 + gr2 * 1.12, gr2, "mitte")); }
      }
    }

    // 3) Aufforderung
    var kopf = "HIER SCANNEN", kopfGr = 6.4, kopfB = breite("dm700", kopf, kopfGr), kopfY = 31.6;
    g = g.concat(text("dm700", kopf, mitte, kopfY, kopfGr, "mitte"));
    var strich = Math.min(14, (nutz - kopfB) / 2 - 4);
    if (strich > 3) {
      g = g.concat(rechteck(mitte - kopfB / 2 - 3 - strich, kopfY - 2.6, strich, 0.7));
      g = g.concat(rechteck(mitte + kopfB / 2 + 3, kopfY - 2.6, strich, 0.7));
    }
    var unter = "Tattoo bezahlen, Anzahlung oder in Raten*", unterGr = Math.min(4.2, nutz / breite("dm500", unter, 1));
    g = g.concat(text("dm500", unter, mitte, 37.4, unterGr, "mitte"));

    // 4) QR-Code (Ruhezone bleibt frei) + Ecken als Rahmen außerhalb der Ruhezone
    g = g.concat(qrPfad(mx, qx, QR_Y, modul));
    var el = 7, ed = 0.9, L = qx - e0, R = qx + QR_MM + e0, T = QR_Y - e0, B = QR_Y + QR_MM + e0;
    [[L, T, 1, 1], [R, T, -1, 1], [L, B, 1, -1], [R, B, -1, -1]].forEach(function (k) {
      var x = k[0], y = k[1], dx = k[2], dy = k[3];
      g = g.concat(rechteck(dx > 0 ? x : x - el, dy > 0 ? y : y - ed, el, ed));
      g = g.concat(rechteck(dx > 0 ? x : x - ed, dy > 0 ? y : y - el, ed, el));
    });

    // 5) Link als Text (falls der Scan nicht klappt) + Zahlarten
    var kurz = o.linkText || o.url.replace(/^https?:\/\//, "").replace(/[?#].*$/, "").replace(/\/$/, ""), linkGr = Math.min(3.3, nutz / breite("dm700", kurz, 1));
    g = g.concat(text("dm700", kurz, mitte, B + 4.6, linkGr, "mitte"));
    g = g.concat(text("dm500", "Karte · Apple Pay · Google Pay · Klarna*", mitte, B + 9.4, 3, "mitte"));

    // 6) Fußnote (Pflicht bei „Raten*“), oberhalb der Fußzone
    var fGr = 2.5, fz = umbrechen("dm500", FUSS, fGr, nutz), fy = H - FUSSZONE - 1.4 - (fz.length - 1) * fGr * 1.3;
    fz.forEach(function (z, i) { g = g.concat(text("dm500", z, mitte, fy + i * fGr * 1.3, fGr, "mitte")); });

    return { gravur: g, platzhalter: blau, platzhalterText: blauText, logo: logo, kontur: rundRechteck(0, 0, W, H, RADIUS), konturSchlitze: schildKontur(o.dicke || 3), qr: { x: qx, y: QR_Y, mm: QR_MM, n: n, modulMm: modul, ruheMm: ruhe }, unten: fy + (fz.length - 1) * fGr * 1.3 };
  }

  // ---------- SVG ----------
  // opts: { kontur: true (rote Schnittlinie), holz: "hell"|"dunkel" (Vorschau mit Holz statt Gravurdatei) }
  function svg(o, opts) {
    opts = opts || {};
    var sz = bauen(o), holz = HOLZ[opts.holz];
    var tit = "Tattoofin QR-Aufsteller – " + (o.firma || "Studio");
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
    if (!holz) {
      var d = datei(o, opts), t = opts.dicke || 3, mat = t === 4 ? "Sperrholz Pappel 4 mm" : "Sperrholz Birke " + t + " mm";
      var beschr = opts.formulor
        ? "Formulor-Platte P1 (181 × 181 mm), " + mat + ". Schild 100 × 150 mm + 2 Fußteile 60 × 16 mm (Kreuz-Steckverbindung, Schlitze " + t + " mm). Schwarz gefüllt = Flächengravur, Blau 0,01 mm = Schnitt. Schrift in Pfaden, keine Pixelbilder. QR-Code: " + o.url
        : "Gravurvorlage Schild 100 × 150 mm, Maßstab 1:1 (Fuß vom Hersteller). Schwarz gefüllt = gravieren, Blau 0,01 mm = Außenkontur/Schnitt, Grau = Platzhalter (nicht gravieren). Untere 17 mm frei für den Fuß. QR-Code: " + o.url;
      return '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="' + d.w + 'mm" height="' + d.h + 'mm" viewBox="0 0 ' + d.w + " " + d.h + '">\n' +
        "<title>" + esc(tit) + "</title>\n<desc>" + esc(beschr) + "</desc>\n" +
        '<g id="gravur" fill="#000000" stroke="none" fill-rule="nonzero"><path d="' + svgD(d.gravur) + '"/></g>\n' +
        (d.sz.platzhalter.length && !opts.formulor ? '<g id="platzhalter-nicht-gravieren"><path d="' + svgD(d.sz.platzhalter) + '" fill="none" stroke="#9aa5b1" stroke-width="0.3" stroke-dasharray="1.2 0.8"/><path d="' + svgD(d.sz.platzhalterText) + '" fill="#9aa5b1"/></g>\n' : "") +
        (opts.kontur === false ? "" : '<g id="schnitt" fill="none" stroke="' + BLAU + '" stroke-width="0.01"><path d="' + svgD(d.schnitt) + '"/></g>\n') +
        "</svg>\n";
    }
    // Vorschau: Holzplatte mit Maserung, Gravur leicht eingebrannt, kleiner Fuß
    var gh = H + 16;
    return '<svg xmlns="http://www.w3.org/2000/svg" width="' + (W + 20) * 4 + '" height="' + (gh + 6) * 4 + '" viewBox="-10 -4 ' + (W + 20) + " " + (gh + 6) + '">' +
      "<title>" + esc(tit + " (Vorschau " + holz.name + ")") + "</title><defs>" +
      '<linearGradient id="hg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + holz.grund + '"/><stop offset="1" stop-color="' + holz.grund2 + '"/></linearGradient>' +
      '<filter id="mas" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency="0.16 0.008" numOctaves="3" seed="7"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 1.3"/><feComposite in2="SourceGraphic" operator="in"/></filter>' +
      '<filter id="brand"><feGaussianBlur stdDeviation="0.06"/></filter>' +
      '<filter id="inv"><feColorMatrix values="-1 0 0 0 1  0 -1 0 0 1  0 0 -1 0 1  0 0 0 1 0"/></filter>' +
      '<filter id="schatten" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0.8" dy="1.6" stdDeviation="1.6" flood-opacity=".28"/></filter>' +
      '<clipPath id="platte"><path d="' + svgD(sz.kontur) + '"/></clipPath></defs>' +
      // Schatten auf dem Tisch
      '<ellipse cx="' + W / 2 + '" cy="' + (H + 1) + '" rx="46" ry="2.2" fill="#000" opacity=".18"/>' +
'<g filter="url(#schatten)"><path d="' + svgD(sz.kontur) + '" fill="url(#hg)"/></g>' +
      '<g clip-path="url(#platte)"><rect x="0" y="0" width="' + W + '" height="' + H + '" fill="' + holz.maserung + '" filter="url(#mas)" opacity=".3"/>' +
      '<g filter="url(#brand)" fill="' + holz.gravur + '" opacity=".92"><path d="' + svgD(sz.gravur) + '"/>' + "</g>" + 
      (sz.platzhalter.length ? '<g opacity=".45"><path d="' + svgD(sz.platzhalter) + '" fill="none" stroke="' + holz.gravur + '" stroke-width="0.35" stroke-dasharray="1.2 0.8"/><path d="' + svgD(sz.platzhalterText) + '" fill="' + holz.gravur + '"/></g>' : "") +
      "</g>" +
      '<path d="' + svgD(sz.kontur) + '" fill="none" stroke="' + holz.kante + '" stroke-width="0.6"/>' +
      // Fußteile (Kreuz-Steckverbindung) von vorn: schmale Stege vor dem Schild
      SCHLITZ_X.map(function (sx) { return '<rect x="' + (sx - 2) + '" y="' + (H - FUSS_H) + '" width="4" height="' + FUSS_H + '" rx="0.6" fill="' + holz.kante + '" stroke="#000" stroke-opacity=".3" stroke-width=".3"/><rect x="' + (sx - 2) + '" y="' + (H - FUSS_H) + '" width="1.2" height="' + FUSS_H + '" fill="#fff" opacity=".18"/>'; }).join("") +
      "</svg>";
  }

  // ---------- PDF (Vektor, 100 × 150 mm, ohne externe Bibliothek) ----------
  function pdfOps(ops) {
    var out = [], cx = 0, cy = 0, f = zahl;
    ops.forEach(function (o) {
      if (o[0] === "M") { out.push(f(o[1]) + " " + f(o[2]) + " m"); cx = o[1]; cy = o[2]; }
      else if (o[0] === "L") { out.push(f(o[1]) + " " + f(o[2]) + " l"); cx = o[1]; cy = o[2]; }
      else if (o[0] === "Q") { // quadratisch → kubisch
        var x1 = cx + 2 / 3 * (o[1] - cx), y1 = cy + 2 / 3 * (o[2] - cy), x2 = o[3] + 2 / 3 * (o[1] - o[3]), y2 = o[4] + 2 / 3 * (o[2] - o[4]);
        out.push([x1, y1, x2, y2, o[3], o[4]].map(f).join(" ") + " c"); cx = o[3]; cy = o[4];
      } else if (o[0] === "C") { out.push(o.slice(1).map(f).join(" ") + " c"); cx = o[5]; cy = o[6]; }
      else if (o[0] === "Z") out.push("h");
    });
    return out.join("\n");
  }
  function bytes(s) { var u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 255; return u; }
  function utf16hex(s) { var h = "FEFF"; for (var i = 0; i < s.length; i++) h += ("000" + s.charCodeAt(i).toString(16)).slice(-4); return "<" + h.toUpperCase() + ">"; }
  function pdf(o, opts) {
    opts = opts || {};
    var d = datei(o, opts), k = 72 / 25.4, pw = zahl(d.w * k), ph = zahl(d.h * k);
    var inhalt = "q\n" + zahl(k) + " 0 0 " + zahl(-k) + " 0 " + ph + " cm\n0 0 0 rg\n" + pdfOps(d.gravur) + "\nf\n";
    if (d.sz.platzhalter.length && !opts.formulor) inhalt += "q 0.604 0.647 0.694 RG 0.604 0.647 0.694 rg 0.3 w [1.2 0.8] 0 d\n" + pdfOps(d.sz.platzhalter) + "\nS\n" + pdfOps(d.sz.platzhalterText) + "\nf Q\n";
    if (opts.kontur !== false) inhalt += "0 0 1 RG 0.01 w\n" + pdfOps(d.schnitt) + "\nS\n";
    inhalt += "Q\n";
    var objs = [];
    objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
    objs[2] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
    objs[3] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + pw + " " + ph + "] /TrimBox [0 0 " + pw + " " + ph + "] /Resources << >> /Contents 4 0 R >>";
    objs[4] = "<< /Length " + inhalt.length + " >>\nstream\n" + inhalt + "endstream";
    objs[5] = "<< /Title " + utf16hex("Tattoofin QR-Aufsteller – " + (o.firma || "Studio")) + " /Subject " + utf16hex((opts.formulor ? "Formulor-Platte P1 181 × 181 mm mit Schild + Fuß" : "Gravurvorlage 100 × 150 mm") + ", 1:1. Schwarz = Flächengravur, Blau = Schnitt. QR: " + o.url) + " /Creator (Tattoofin) /Producer (Tattoofin) >>";
    var teile = [bytes("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n")], pos = teile[0].length, xref = [];
    for (var i = 1; i <= 5; i++) { xref[i] = pos; var t = bytes(i + " 0 obj\n" + objs[i] + "\nendobj\n"); teile.push(t); pos += t.length; }
    var x = "xref\n0 6\n0000000000 65535 f \n";
    for (var j = 1; j < 6; j++) x += ("000000000" + xref[j]).slice(-10) + " 00000 n \n";
    x += "trailer\n<< /Size 6 /Root 1 0 R /Info 5 0 R >>\nstartxref\n" + pos + "\n%%EOF\n";
    teile.push(bytes(x));
    var gesamt = teile.reduce(function (s, u) { return s + u.length; }, 0), out = new Uint8Array(gesamt), p = 0;
    teile.forEach(function (u) { out.set(u, p); p += u.length; });
    return out;
  }

  // ---------- Bilder (Browser) ----------
  function svgZuCanvas(svgText, breitePx, hoehePx, hintergrund) {
    return new Promise(function (ok, fehler) {
      var img = new Image();
      img.onload = function () {
        var cv = root.document.createElement("canvas"); cv.width = breitePx; cv.height = hoehePx;
        var c = cv.getContext("2d");
        if (hintergrund) { c.fillStyle = hintergrund; c.fillRect(0, 0, breitePx, hoehePx); }
        c.drawImage(img, 0, 0, breitePx, hoehePx); ok(cv);
      };
      img.onerror = function () { fehler(new Error("Bild konnte nicht gezeichnet werden")); };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgText);
    });
  }
  // Gravurdatei als PNG (schwarz auf weiß, ohne Kontur), Standard 600 dpi = 2362 × 3543 px
  function png(o, dpi) {
    dpi = dpi || 600;
    var px = function (mm) { return Math.round(mm / 25.4 * dpi); };
    return svgZuCanvas(svg(o, { kontur: false }), px(W), px(H), "#ffffff");
  }
  function vorschau(o, holz, breitePx) {
    var b = breitePx || 600, h = Math.round(b * 172 / 120);
    return svgZuCanvas(svg(o, { holz: holz || "hell" }), b, h, null);
  }
  // Digitaler QR-Code (PNG), scharf aus der Matrix gezeichnet, 4 Module Ruhezone
  function qrBild(url, px, farbe) {
    var mx = qrMatrix(url), n = mx.length, gesamt = n + 8, m = Math.floor((px || 1200) / gesamt), seite = m * gesamt;
    var cv = root.document.createElement("canvas"); cv.width = cv.height = seite;
    var c = cv.getContext("2d"); c.fillStyle = "#ffffff"; c.fillRect(0, 0, seite, seite); c.fillStyle = farbe || "#000000";
    mx.forEach(function (row, r) { row.forEach(function (d, col) { if (d) c.fillRect((col + 4) * m, (r + 4) * m, m, m); }); });
    return cv;
  }
  // Schwarz/weiß-Bild → Pixelreihen [zeile, start, länge, …] in einem Raster von max. 700 Punkten Breite (≈ 0,1 mm)
  function logoRuns(bild) {
    var w = bild.width || bild.naturalWidth, h = bild.height || bild.naturalHeight, f = Math.min(1, 700 / w, 140 / h), gw = Math.max(1, Math.round(w * f)), gh = Math.max(1, Math.round(h * f));
    var cv = root.document.createElement("canvas"); cv.width = gw; cv.height = gh;
    var c = cv.getContext("2d"); c.fillStyle = "#fff"; c.fillRect(0, 0, gw, gh); c.drawImage(bild, 0, 0, gw, gh);
    var p = c.getImageData(0, 0, gw, gh).data, runs = [];
    for (var y = 0; y < gh; y++) for (var x = 0; x < gw; x++) {
      if (p[(y * gw + x) * 4] >= 128) continue;
      var x0 = x; while (x + 1 < gw && p[(y * gw + x + 1) * 4] < 128) x++;
      runs.push(y, x0, x - x0 + 1);
    }
    return { gw: gw, gh: gh, runs: runs };
  }
  // Gespeichertes Logo (Data-URL) → mit Vektor-Daten ergänzen
  function logoAusDaten(logo) {
    if (!logo || !logo.src || logo.runs) return Promise.resolve(logo);
    return new Promise(function (ok, fehler) {
      var img = new Image();
      img.onload = function () { ok(Object.assign({}, logo, logoRuns(img))); };
      img.onerror = function () { fehler(new Error("Logo konnte nicht geladen werden")); };
      img.src = logo.src;
    });
  }
  // Logo-Datei → schwarz/weiß (für einfarbige Gravur) als JPEG-Data-URL
  function logoVorbereiten(datei) {
    return new Promise(function (ok, fehler) {
      var r = new FileReader();
      r.onerror = function () { fehler(new Error("Datei konnte nicht gelesen werden")); };
      r.onload = function () {
        var img = new Image();
        img.onerror = function () { fehler(new Error("Bitte ein Bild (PNG, JPG oder SVG) wählen")); };
        img.onload = function () {
          var iw = img.naturalWidth || 1000, ih = img.naturalHeight || 300, f = Math.min(1600 / iw, 600 / ih, 4), w = Math.max(1, Math.round(iw * f)), h = Math.max(1, Math.round(ih * f));
          var cv = root.document.createElement("canvas"); cv.width = w; cv.height = h;
          var c = cv.getContext("2d"); c.fillStyle = "#fff"; c.fillRect(0, 0, w, h); c.drawImage(img, 0, 0, w, h);
          var d = c.getImageData(0, 0, w, h), p = d.data, minX = w, minY = h, maxX = -1, maxY = -1;
          for (var i = 0; i < p.length; i += 4) {
            var hell = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2], s = hell < 150 ? 0 : 255;
            p[i] = p[i + 1] = p[i + 2] = s;
            if (!s) { var px = (i / 4) % w, py = Math.floor(i / 4 / w); if (px < minX) minX = px; if (px > maxX) maxX = px; if (py < minY) minY = py; if (py > maxY) maxY = py; }
          }
          if (maxX < 0) return fehler(new Error("Im Logo ist nichts Dunkles zu sehen – bitte ein dunkles Logo auf hellem oder transparentem Grund wählen"));
          c.putImageData(d, 0, 0);
          var bw = maxX - minX + 1, bh = maxY - minY + 1, cv2 = root.document.createElement("canvas"); cv2.width = bw; cv2.height = bh;
          cv2.getContext("2d").drawImage(cv, minX, minY, bw, bh, 0, 0, bw, bh); // auf den Inhalt zuschneiden
          var lg = { src: cv2.toDataURL("image/jpeg", 0.95), w: bw, h: bh };
          ok(Object.assign(lg, logoRuns(cv2)));
        };
        img.src = r.result;
      };
      r.readAsDataURL(datei);
    });
  }

  root.TFAufsteller = { laden: laden, bauen: bauen, svg: svg, pdf: pdf, png: png, vorschau: vorschau, qrBild: qrBild, qrMatrix: qrMatrix, logoVorbereiten: logoVorbereiten, logoAusDaten: logoAusDaten, datei: datei, FUSS: FUSS, HOLZ: HOLZ, MASSE: { breite: W, hoehe: H, fusszone: FUSSZONE, qrMm: QR_MM, platte: PLATTE, fussL: FUSS_L, fussH: FUSS_H, schlitzTiefe: SCHLITZ_T } };
})(typeof window !== "undefined" ? window : globalThis);
