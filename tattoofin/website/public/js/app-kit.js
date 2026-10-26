// Werbung im Dashboard (19.10.2026): fertige Instagram-/Facebook-Beiträge, mit denen ein Studio verkündet
// „Ab jetzt bei uns: Ratenzahlung*“ – Werbung FÜR das Studio (Studioname groß), auf jedem Bild das Abzeichen
// „Ratenzahlung* mit Tattoofin · tattoofin.de“, damit andere Studios auf Tattoofin aufmerksam werden.
// Direkt im Browser gezeichnet (Canvas), Design wie das Studio-Werbevideo: Gelb/Navy, Strahlen, Maskottchen,
// Luckiest Guy + DM Sans. Keine KI-Bilder.
// Formulierungsregeln: „Raten*“ immer mit Fußnote; keine Zahlen zu Raten/Zinsen/Monatsbeträgen, kein „0 %“/„zinsfrei“,
// kein „Geld sofort“, kein „voller Betrag“, keine Versprechen zur Bewilligung. Keine Silbentrennung auf den Bildern:
// Zeilen sind fest gesetzt, die Schrift wird kleiner, bis jede Zeile passt.
window.TFKit = (function () {
  // Im Beitrag des Studios spricht das Studio („wir“). Weder das Studio noch Tattoofin vergeben Kredite → beide nennen.
  var FUSS = "*Raten über Klarna, nach deren Bonitätsprüfung. Vertragspartner der Raten ist Klarna, weder wir noch Tattoofin. Achtung! Kreditaufnahme kostet Geld.";
  var NAVY = "#1f3d5c", NAVY2 = "#0f2236", GELB = "#fbb316", CREME = "#fffaf0";
  var HEAD = "'Luckiest Guy', 'Titan One', sans-serif", BODY = "'DM Sans', sans-serif";

  // ---------- Texte ----------
  function hashtags(k) {
    var ort = String(k.ort || "").toLowerCase().replace(/[^a-zäöüß0-9]/g, "");
    var t = ["#tattoo", "#wunschtattoo", "#tattoostudio"];
    if (ort && ort.length > 1) t.push("#" + ort + "tattoo", "#" + ort);
    else t.push("#tattooart", "#ink");
    return t.join(" ");
  }
  function beiUns(k) { return k.ort ? "bei uns in " + k.ort : "bei uns"; }
  function caption(k, teile) { return teile.join("\n\n") + "\n\n" + FUSS + "\n\n" + hashtags(k); }

  var VORLAGEN = [
    { id: "ankuendigung", titel: "Beitrag: Ab jetzt Ratenzahlung*", format: "Beitrag 4:5", art: "post",
      wofuer: "Dein Start-Beitrag: Alle sehen sofort, dass man bei euch jetzt in Raten* zahlen kann.",
      seiten: ["ankuendigung"],
      text: function (k) { return caption(k, [
        "Ab jetzt bei uns: Ratenzahlung* für dein Wunsch-Tattoo! 🖤",
        "Du hast schon lange ein Motiv im Kopf, willst aber nicht alles auf einmal zahlen? Dann haben wir gute Neuigkeiten: Dein Tattoo kannst du " + beiUns(k) + " jetzt auch in Raten* zahlen. Ganz bequem übers Handy, per Link oder QR-Code.",
        "Sprich uns einfach drauf an oder schreib uns eine Nachricht. Wir freuen uns auf dein Projekt!"]); } },
    { id: "karussell", titel: "Karussell: Wunsch-Tattoo in Raten*", format: "4 Bilder 4:5", art: "post",
      wofuer: "Vier Bilder zum Durchwischen: Frage, Neuigkeit, So geht's, Frag uns. Alle vier zusammen als einen Beitrag posten.",
      seiten: ["haken", "ankuendigung", "schritte", "fragpost"],
      text: function (k) { return caption(k, [
        "Dein Wunsch-Tattoo, aber nicht alles auf einmal zahlen? Wisch mal rüber 👉",
        "Ab jetzt kannst du " + beiUns(k) + " in Raten* zahlen. So einfach geht's: Design und Termin mit uns absprechen, Link oder QR-Code öffnen und am Handy über Klarna in Raten* zahlen.",
        "Fragen? Schreib uns eine Nachricht oder sprich uns im Studio an! 🖤"]); } },
    { id: "qr-story", titel: "Story: Raten* mit QR-Code", format: "Story 9:16", art: "story",
      wofuer: "Für deine Story, mit dem QR-Code zu deiner Zahlseite. Tipp: In Instagram noch den Link-Sticker mit deiner Zahlseite dazu – dann können Kunden direkt antippen.",
      seiten: ["qrstory"], kopieren: "link",
      text: function (k) { return "Link für den Link-Sticker in deiner Story:\n" + k.zahlseite; } },
    { id: "schritte", titel: "Beitrag: So einfach geht's", format: "Beitrag 4:5", art: "post",
      wofuer: "Erklärt in drei Schritten, wie die Ratenzahlung* bei euch funktioniert. Gut als zweiter Beitrag ein paar Tage später.",
      seiten: ["schritte"],
      text: function (k) { return caption(k, [
        "Tattoo in Raten*? So einfach geht's 👇",
        "1️⃣ Design & Termin: Wir planen dein Tattoo gemeinsam mit dir.\n2️⃣ Link oder QR-Code: Den Link schicken wir dir, oder du scannst den QR-Code bei uns im Studio.\n3️⃣ In Raten* zahlen: Bequem am Handy über Klarna.",
        "Alles übers Handy, ohne Papierkram. Fragen? Schreib uns einfach!"]); } },
    { id: "frag-story", titel: "Story: Frag uns!", format: "Story 9:16", art: "story",
      wofuer: "Lädt deine Follower ein, euch zur Ratenzahlung* zu schreiben. Tipp: In Instagram den Fragen-Sticker dazu – den Text dafür kannst du kopieren.",
      seiten: ["fragstory"], kopieren: "sticker",
      text: function () { return "Hast du Fragen zur Ratenzahlung?"; } },
  ];

  // ---------- Zeichnen: Grundlagen ----------
  var BILDER = {};
  function bild(src) {
    if (!BILDER[src]) BILDER[src] = new Promise(function (ok) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { ok(null); }; i.src = src; });
    return BILDER[src];
  }
  function schriften() {
    return Promise.all(["80px 'Luckiest Guy'", "500 40px 'DM Sans'", "700 40px 'DM Sans'", "800 40px 'DM Sans'"].map(function (f) { return document.fonts.load(f); })).catch(function () {});
  }
  function qrCanvas(text, px) {
    var d = document.createElement("div");
    new QRCode(d, { text: text, width: px, height: px, colorDark: "#13243d", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M });
    return d.querySelector("canvas") || d.querySelector("img");
  }
  function rund(c, x, y, w, h, r) { r = Math.min(r, h / 2, w / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function font(c, gewicht, px, fam) { c.font = gewicht + " " + px + "px " + fam; }

  // Hintergrund: Fläche + Punktraster + Strahlen (wie im Werbevideo)
  function grund(c, W, H, art, cy) {
    var navy = art === "navy";
    c.fillStyle = navy ? NAVY : GELB; c.fillRect(0, 0, W, H);
    c.fillStyle = navy ? "rgba(251,179,22,.13)" : "rgba(31,61,92,.15)";
    for (var x = 17; x < W; x += 34) for (var y = 17; y < H; y += 34) { c.beginPath(); c.arc(x, y, 2.5, 0, 7); c.fill(); }
    var o = document.createElement("canvas"); o.width = W; o.height = H;
    var g = o.getContext("2d"), cx = W / 2, R = Math.hypot(W, H);
    g.fillStyle = navy ? "rgba(255,255,255,.07)" : "rgba(255,255,255,.26)";
    for (var a = 0; a < 24; a++) {
      var a0 = a * Math.PI / 12, a1 = a0 + Math.PI / 24;
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + R * Math.cos(a0), cy + R * Math.sin(a0)); g.lineTo(cx + R * Math.cos(a1), cy + R * Math.sin(a1)); g.closePath(); g.fill();
    }
    g.globalCompositeOperation = "destination-in";
    var m = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H) * 0.62);
    m.addColorStop(0, "rgba(0,0,0,1)"); m.addColorStop(0.35, "rgba(0,0,0,1)"); m.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = m; g.fillRect(0, 0, W, H);
    c.drawImage(o, 0, 0);
  }

  // Größte Schrift (≤ max), bei der jede Zeile in maxW passt (inkl. Kontur) – nie Silbentrennung, nie gestaucht
  function passend(c, zeilen, gewicht, fam, max, min, maxW, rand) {
    for (var s = max; s > min; s -= 2) {
      font(c, gewicht, s, fam);
      var ok = zeilen.every(function (z) { return c.measureText(z).width + (rand ? rand(s) : 0) <= maxW; });
      if (ok) return s;
    }
    return min;
  }
  // Text auf Zeilen verteilen (nur an Leerzeichen), möglichst gleich lang
  function verteilen(c, text, anz) {
    var w = text.split(" ");
    if (anz <= 1 || w.length < 2) return [text];
    if (anz === 2) {
      var best = null;
      for (var i = 1; i < w.length; i++) {
        var a = w.slice(0, i).join(" "), b = w.slice(i).join(" "), m = Math.max(c.measureText(a).width, c.measureText(b).width);
        if (!best || m < best.m) best = { m: m, z: [a, b] };
      }
      return best.z;
    }
    var erst = verteilen(c, text, 2);
    return verteilen(c, erst[0], 2).length > 1 && c.measureText(erst[0]).width > c.measureText(erst[1]).width
      ? verteilen(c, erst[0], 2).concat(erst[1]) : [erst[0]].concat(verteilen(c, erst[1], 2));
  }
  // Fließtext umbrechen (nur an Leerzeichen)
  function umbruch(c, text, maxW) {
    var z = [], akt = "";
    text.split(" ").forEach(function (w) { var t = akt ? akt + " " + w : w; if (c.measureText(t).width > maxW && akt) { z.push(akt); akt = w; } else akt = t; });
    if (akt) z.push(akt);
    return z;
  }

  // Comic-Überschrift: Füllung + dicke Navy-Kontur + harter Schatten (wie die Wortmarke)
  function comic(c, text, x, y, s, farbe, kontur) {
    c.save(); font(c, "400", s, HEAD); c.textAlign = "center"; c.textBaseline = "alphabetic"; c.lineJoin = "round";
    var k = Math.max(8, s * 0.14), sx = s * 0.08, sy = s * 0.095;
    c.fillStyle = kontur || NAVY; c.strokeStyle = kontur || NAVY; c.lineWidth = k;
    c.strokeText(text, x + sx, y + sy); c.fillText(text, x + sx, y + sy);
    c.strokeText(text, x, y);
    c.fillStyle = farbe; c.fillText(text, x, y);
    c.restore();
  }
  // Block aus Comic-Zeilen; jede Zeile {t, f: Farbe, g: Größenfaktor}. Gibt die Unterkante zurück.
  function comicBlock(c, zeilen, cx, top, max, maxW, abstand, kontur) {
    var basis = Math.min.apply(null, zeilen.map(function (z) {
      var g = z.g || 1; return passend(c, [z.t], "400", HEAD, Math.round(max * g), 30, maxW, function (s) { return s * 0.22; }) / g;
    }));
    var y = top;
    zeilen.forEach(function (z, i) {
      var s = Math.round(basis * (z.g || 1));
      y += s * (i === 0 ? 0.86 : (abstand || 1.04));
      comic(c, z.t, cx, y, s, z.f || GELB, kontur);
    });
    return y + basis * 0.22;
  }

  // Sticker (Pille) mit Text, optional gedreht. Gibt {h} zurück.
  function sticker(c, text, cx, cy, opt) {
    opt = opt || {};
    var s = passend(c, [text], opt.gewicht || "800", opt.fam || BODY, opt.size || 44, 22, (opt.maxW || 900) - (opt.padX || 34) * 2);
    font(c, opt.gewicht || "800", s, opt.fam || BODY);
    var w = c.measureText(text).width + (opt.padX || 34) * 2, h = s * 1.75;
    c.save(); c.translate(cx, cy); c.rotate(opt.rot || 0);
    c.fillStyle = NAVY; rund(c, -w / 2 + 7, -h / 2 + 7, w, h, h / 2); c.fill();
    c.fillStyle = opt.bg || "#fff"; c.strokeStyle = NAVY; c.lineWidth = 5; rund(c, -w / 2, -h / 2, w, h, h / 2); c.fill(); c.stroke();
    c.fillStyle = opt.farbe || NAVY; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(text, 0, s * 0.06);
    c.restore();
    return { w: w, h: h };
  }

  // Studioname groß als weißes Schild (1–3 Zeilen, Schrift passt sich an), darunter der Ort mit Pin. Gibt Unterkante zurück.
  function studioKopf(c, k, W, top, opt) {
    opt = opt || {};
    var maxW = opt.maxW || W - 180, max = opt.size || 76, min = opt.min || 40, name = String(k.firma || "Dein Studio").trim();
    var zeilen = [name], s = passend(c, zeilen, "400", HEAD, max, min, maxW);
    if (s <= min + 8 || s < max * 0.62) {
      font(c, "400", max, HEAD);
      for (var anz = 2; anz <= 3; anz++) {
        zeilen = verteilen(c, name, anz);
        s = passend(c, zeilen, "400", HEAD, Math.round(max * 0.86), min, maxW);
        if (s > min + 6 || zeilen.length < anz) break;
      }
      if (s <= min) s = passend(c, zeilen, "400", HEAD, min, 22, maxW);
    }
    font(c, "400", s, HEAD);
    var breite = Math.max.apply(null, zeilen.map(function (z) { return c.measureText(z).width; }));
    var zh = s * 1.02, padY = s * 0.38, padX = Math.max(34, s * 0.5);
    var w = breite + padX * 2, h = zeilen.length * zh + padY * 2 - s * 0.12, x = (W - w) / 2;
    c.save(); c.translate(W / 2, top + h / 2); c.rotate(opt.rot == null ? -0.025 : opt.rot); c.translate(-W / 2, -(top + h / 2));
    c.fillStyle = NAVY; rund(c, x + 9, top + 10, w, h, Math.min(34, h / 2)); c.fill();
    c.fillStyle = "#fff"; c.strokeStyle = NAVY; c.lineWidth = 6; rund(c, x, top, w, h, Math.min(34, h / 2)); c.fill(); c.stroke();
    c.fillStyle = NAVY; c.textAlign = "center"; c.textBaseline = "alphabetic";
    zeilen.forEach(function (z, i) { c.fillText(z, W / 2, top + padY + i * zh + s * 0.8); });
    c.restore();
    var unten = top + h + 10;
    // Ort nur, wenn er nicht schon im Namen steht („Chic Tattoo Augsburg“)
    if (k.ort && opt.ort !== false && name.toLowerCase().indexOf(String(k.ort).toLowerCase()) < 0) {
      var os = opt.ortSize || 36, dunkel = opt.hell ? "#fff" : NAVY;
      font(c, "700", os, BODY);
      var t = String(k.ort), tw = Math.min(c.measureText(t).width, W - 240), pw = os * 0.62, gx = W / 2 - (tw + pw + 12) / 2, gy = unten + os * 1.15;
      // Pin
      c.fillStyle = dunkel; c.beginPath(); c.arc(gx + pw / 2, gy - os * 0.48, pw / 2, Math.PI, 0); c.lineTo(gx + pw / 2, gy - os * 0.02); c.closePath(); c.fill();
      c.beginPath(); c.arc(gx + pw / 2, gy - os * 0.48, pw / 2, 0, Math.PI); c.fill();
      c.fillStyle = opt.hell ? NAVY : GELB; c.beginPath(); c.arc(gx + pw / 2, gy - os * 0.5, pw * 0.2, 0, 7); c.fill();
      c.fillStyle = dunkel; c.textAlign = "left"; c.textBaseline = "alphabetic"; c.fillText(t, gx + pw + 12, gy, W - 240);
      unten = gy + os * 0.35;
    }
    return unten;
  }

  // Abzeichen „Ratenzahlung* mit TATTOOFIN / tattoofin.de“ (auf jedem Bild, damit andere Studios Tattoofin finden).
  // Gibt {oben, unten} zurück.
  async function abzeichen(c, W, unten, gross) {
    var wm = await bild("/assets/wortmarke.png"), fig = await bild("/assets/figur.png");
    var f = gross ? 1.12 : 1, s = Math.round(26 * f), wmH = Math.round(50 * f), wmW = wm ? wmH * wm.naturalWidth / wm.naturalHeight : 225 * f, fg = Math.round(108 * f);
    font(c, "700", s, BODY);
    var t1 = "Ratenzahlung* mit", t3 = "tattoofin.de", spalte = Math.max(wmW, c.measureText(t1).width);
    var padY = Math.round(14 * f), h = padY * 2 + s + 6 * f + wmH + 6 * f + s, w = 18 + fg + 16 + spalte + 30, x = Math.round((W - w) / 2), y = unten - h;
    c.fillStyle = NAVY; rund(c, x + 7, y + 7, w, h, 26); c.fill();
    c.fillStyle = "#fff"; c.strokeStyle = NAVY; c.lineWidth = 5; rund(c, x, y, w, h, 26); c.fill(); c.stroke();
    if (fig) { var fh = fg * fig.naturalHeight / fig.naturalWidth; c.drawImage(fig, x + 18, y + (h - fh) / 2, fg, fh); }
    var tx = x + 18 + fg + 16, mitte = tx + spalte / 2;
    c.fillStyle = NAVY; c.textAlign = "center"; c.textBaseline = "alphabetic";
    font(c, "700", s, BODY); c.fillText(t1, mitte, y + padY + s * 0.82);
    if (wm) c.drawImage(wm, mitte - wmW / 2, y + padY + s + 6 * f, wmW, wmH);
    font(c, "800", s, BODY); c.fillText(t3, mitte, y + padY + s + 12 * f + wmH + s * 0.8);
    c.textAlign = "left";
    return { oben: y, unten: unten };
  }

  // Sprechblase (weiß, Navy-Rand, harter Schatten), Text links oder mittig. zipfel: "links-unten" | "links" | null
  function blase(c, zeilen, x, y, w, opt) {
    opt = opt || {};
    var s = opt.size || 40, lh = s * 1.25, pad = opt.pad || 34;
    font(c, opt.gewicht || "800", s, BODY);
    var h = zeilen.length * lh + pad * 2 - s * 0.25;
    function form(dx, dy) {
      rund(c, x + dx, y + dy, w, h, 40); c.fill();
      c.beginPath();
      if (opt.zipfel === "links") { c.moveTo(x + dx + 4, y + dy + h * 0.42); c.lineTo(x + dx - 46, y + dy + h * 0.62); c.lineTo(x + dx + 4, y + dy + h * 0.72); }
      else if (opt.zipfel === "links-unten") { c.moveTo(x + dx + 60, y + dy + h - 4); c.lineTo(x + dx + 54, y + dy + h + 54); c.lineTo(x + dx + 130, y + dy + h - 4); }
      c.closePath(); c.fill();
    }
    c.save(); c.translate(x + w / 2, y + h / 2); c.rotate(opt.rot || 0); c.translate(-(x + w / 2), -(y + h / 2));
    c.fillStyle = opt.schatten || NAVY; form(9, 10);
    // Rand: Form in Navy etwas größer, dann weiß darüber
    c.fillStyle = NAVY; c.save(); c.lineWidth = 12; c.strokeStyle = NAVY; c.lineJoin = "round";
    rund(c, x, y, w, h, 40); c.stroke(); c.beginPath();
    if (opt.zipfel === "links") { c.moveTo(x + 4, y + h * 0.42); c.lineTo(x - 46, y + h * 0.62); c.lineTo(x + 4, y + h * 0.72); c.closePath(); c.stroke(); }
    else if (opt.zipfel === "links-unten") { c.moveTo(x + 60, y + h - 4); c.lineTo(x + 54, y + h + 54); c.lineTo(x + 130, y + h - 4); c.closePath(); c.stroke(); }
    c.restore();
    c.fillStyle = "#fff"; form(0, 0);
    c.fillStyle = opt.farbe || NAVY; c.textBaseline = "alphabetic"; c.textAlign = opt.mitte ? "center" : "left";
    font(c, opt.gewicht || "800", s, BODY);
    zeilen.forEach(function (z, i) { c.fillText(z, opt.mitte ? x + w / 2 : x + pad, y + pad + s * 0.78 + i * lh); });
    c.restore();
    return y + h;
  }

  // Pflicht-Fußnote in dunkler Box, gut lesbar. Gibt Oberkante zurück.
  function fussnote(c, W, unten, s, hell) {
    var teile = [{ t: "*", b: 1 }].concat(FUSS.slice(1).replace(" Achtung! Kreditaufnahme kostet Geld.", "").split(" ").map(function (t) { return { t: t }; }))
      .concat("Achtung! Kreditaufnahme kostet Geld.".split(" ").map(function (t) { return { t: t, b: 1 }; }));
    var maxW = W - 120, zeilen = [[]], breite = [0];
    function fnt(b) { font(c, b ? "800" : "600", s, BODY); }
    teile.forEach(function (p, i) {
      fnt(p.b); var w = c.measureText(p.t).width, sp = i > 1 ? c.measureText(" ").width : 0;
      var z = zeilen.length - 1;
      // Vor „Achtung!“ immer neue Zeile (Sinnabschnitt), sonst füllen
      var neu = (p.t === "Achtung!" && zeilen[z].length) || (breite[z] + sp + w > maxW && zeilen[z].length);
      if (neu) { zeilen.push([]); breite.push(0); z++; sp = 0; }
      if (!zeilen[z].length) sp = 0;
      zeilen[z].push({ t: p.t, b: p.b, w: w, sp: sp }); breite[z] += sp + w;
    });
    var lh = s * 1.34, h = zeilen.length * lh + s * 0.9, bw = Math.max.apply(null, breite) + 56, x = (W - bw) / 2, y = unten - h;
    c.fillStyle = hell ? "#fff" : NAVY; rund(c, x, y, bw, h, 20); c.fill();
    c.textBaseline = "alphabetic"; c.textAlign = "left";
    zeilen.forEach(function (z, i) {
      var cx = W / 2 - breite[i] / 2, yy = y + s * 0.45 + (i + 1) * lh - s * 0.3;
      z.forEach(function (p) { cx += p.sp; fnt(p.b); c.fillStyle = p.b ? (hell ? NAVY : GELB) : (hell ? NAVY : "#fff"); c.fillText(p.t, cx, yy); cx += p.w; });
    });
    return y;
  }

  async function qrKarte(c, url, cx, top, qs, unter) {
    var pad = Math.round(qs * 0.09), w = qs + pad * 2, x = cx - w / 2, labelH = unter ? 70 : 0, h = w + labelH;
    c.fillStyle = NAVY; rund(c, x + 12, top + 12, w, h, 34); c.fill();
    c.fillStyle = "#fff"; c.strokeStyle = NAVY; c.lineWidth = 7; rund(c, x, top, w, h, 34); c.fill(); c.stroke();
    var q = qrCanvas(url, qs);
    if (q) {
      if (q.tagName === "IMG" && !q.complete) await new Promise(function (ok) { q.onload = ok; });
      c.save(); c.imageSmoothingEnabled = false; c.drawImage(q, x + pad, top + pad, qs, qs); c.restore();
    }
    if (unter) {
      var s = passend(c, [unter], "700", BODY, 32, 18, w - 40);
      font(c, "700", s, BODY); c.fillStyle = NAVY; c.textAlign = "center"; c.textBaseline = "alphabetic";
      c.fillText(unter, cx, top + w + labelH * 0.42);
    }
    return top + h;
  }

  // Schritt-Karte; Höhe h passt sich dem Platz an, Inhalt senkrecht mittig
  function schritt(c, nr, titel, text, x, y, w, h) {
    h = h || 168; var r = Math.round(Math.min(56, h * 0.34)), k = Math.min(1, h / 168);
    c.fillStyle = NAVY; rund(c, x + 8, y + 8, w, h, 30); c.fill();
    c.fillStyle = CREME; c.strokeStyle = NAVY; c.lineWidth = 5; rund(c, x, y, w, h, 30); c.fill(); c.stroke();
    var kx = x + 30 + r, ky = y + h / 2;
    c.fillStyle = NAVY; c.beginPath(); c.arc(kx + 5, ky + 6, r, 0, 7); c.fill();
    c.fillStyle = GELB; c.strokeStyle = NAVY; c.lineWidth = 5; c.beginPath(); c.arc(kx, ky, r, 0, 7); c.fill(); c.stroke();
    font(c, "400", Math.round(r * 1.15), HEAD); c.fillStyle = NAVY; c.textAlign = "center"; c.textBaseline = "alphabetic"; c.fillText(String(nr), kx, ky + r * 0.42);
    var tx = kx + r + 28, tw = x + w - tx - 26;
    var ts = passend(c, [titel], "400", HEAD, Math.round(50 * Math.max(0.85, k)), 28, tw);
    var bs = Math.round(31 * Math.max(0.88, k)); font(c, "600", bs, BODY);
    var z = umbruch(c, text, tw);
    while (z.length > 2 && bs > 22) { bs -= 1; font(c, "600", bs, BODY); z = umbruch(c, text, tw); }
    var block = ts * 0.78 + 12 + z.length * bs * 1.25 - bs * 0.25, y0 = y + (h - block) / 2;
    font(c, "400", ts, HEAD); c.textAlign = "left"; c.fillStyle = NAVY; c.fillText(titel, tx, y0 + ts * 0.78);
    font(c, "600", bs, BODY); c.fillStyle = "#31506e";
    z.forEach(function (l, i) { c.fillText(l, tx, y0 + ts * 0.78 + 12 + bs * 0.95 + i * bs * 1.25); });
  }

  // Maskottchen + Sprechblase als Reihe, waagerecht und in der freien Zone [oben, unten] senkrecht mittig
  async function reihe(c, W, zeilen, oben, unten, opt) {
    var s = opt.size, pad = opt.pad || 34, fw = opt.figur || 220;
    font(c, opt.gewicht || "800", s, BODY);
    var tw = Math.max.apply(null, zeilen.map(function (z) { return c.measureText(z).width; }));
    var bw = Math.min(W - 140 - fw - 40, tw + pad * 2 + 6), bh = zeilen.length * s * 1.25 + pad * 2 - s * 0.25;
    var rh = Math.max(bh, fw * 1.03), x0 = (W - (fw + 40 + bw)) / 2, y0 = oben + Math.max(0, (unten - oben - rh) / 2);
    blase(c, zeilen, x0 + fw + 40, y0 + (rh - bh) / 2, bw, { size: s, pad: pad, zipfel: "links", rot: opt.rot || -0.015, schatten: opt.schatten, mitte: opt.mitte });
    await figur(c, x0 - 6, y0 + (rh - fw * 1.03) / 2, fw, opt.kippen || -0.06);
  }
  function seitenPunkte(c, W, y, nr, von, hell) {
    for (var i = 0; i < von; i++) {
      var x = W / 2 + (i - (von - 1) / 2) * 30;
      c.fillStyle = i === nr - 1 ? (hell ? GELB : NAVY) : (hell ? "rgba(255,255,255,.35)" : "rgba(31,61,92,.3)");
      c.beginPath(); c.arc(x, y, i === nr - 1 ? 9 : 7, 0, 7); c.fill();
    }
  }
  function wischWeiter(c, W, y, hell) {
    font(c, "800", 34, BODY); var t = "Wisch weiter", tw = c.measureText(t).width;
    var x = W - 70 - tw - 70;
    c.fillStyle = hell ? "#fff" : NAVY; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText(t, x, y);
    c.beginPath(); c.arc(x + tw + 40, y, 26, 0, 7); c.fillStyle = hell ? GELB : NAVY; c.fill();
    c.strokeStyle = hell ? NAVY : "#fff"; c.lineWidth = 6; c.lineCap = "round"; c.lineJoin = "round";
    c.beginPath(); c.moveTo(x + tw + 30, y - 11); c.lineTo(x + tw + 44, y); c.lineTo(x + tw + 30, y + 11); c.stroke();
    c.textBaseline = "alphabetic"; c.lineCap = "butt";
  }
  async function figur(c, x, y, w, kippen) {
    var f = await bild("/assets/figur.png"); if (!f) return;
    c.save(); c.translate(x + w / 2, y + w / 2); c.rotate(kippen || 0);
    c.shadowColor = "rgba(15,34,54,.45)"; c.shadowOffsetX = 8; c.shadowOffsetY = 10;
    c.drawImage(f, -w / 2, -w / 2, w, w * f.naturalHeight / f.naturalWidth); c.restore();
  }

  // ---------- Die einzelnen Bilder ----------
  // Story: oben 250 px (Instagram-Kopfzeile) und unten ab 1730 px (Antwortfeld) frei lassen.
  var STORY_UNTEN = 1730;
  var SEITEN = {
    // Beitrag 4:5 – „Ab jetzt bei uns: Ratenzahlung* für dein Wunsch-Tattoo“
    ankuendigung: { w: 1080, h: 1350, async malen(c, k, W, H, p) {
      grund(c, W, H, "gelb", 560);
      var y = studioKopf(c, k, W, 64, { size: 74 });
      sticker(c, "AB JETZT BEI UNS", W / 2, y + 54, { size: 40, rot: -0.04, bg: NAVY, farbe: GELB, fam: HEAD, gewicht: "400", padX: 38 });
      var u = comicBlock(c, [{ t: "Ratenzahlung*", f: GELB, g: 1.18 }, { t: "für dein", f: "#fff", g: 0.7 }, { t: "Wunsch-Tattoo", f: "#fff" }], W / 2, y + 96, 118, W - 130, 1.0);
      var f = fussnote(c, W, H - 36, 33);
      var b = await abzeichen(c, W, f - 22);
      await reihe(c, W, ["Bequem übers Handy –", "per Link oder QR-Code.", "Sprich uns einfach an!"], u + 10, b.oben - (p ? 56 : 16), { size: 38, figur: 220 });
      if (p) seitenPunkte(c, W, b.oben - 30, p.nr, p.von);
    } },
    // Beitrag 4:5 – 3 Schritte
    schritte: { w: 1080, h: 1350, async malen(c, k, W, H, p) {
      grund(c, W, H, "gelb", 300);
      var y = studioKopf(c, k, W, 56, { size: 56, min: 32, ortSize: 30 });
      var u = comicBlock(c, [{ t: "Tattoo in Raten*?", f: GELB }, { t: "So einfach geht's:", f: "#fff", g: 0.8 }], W / 2, y + 22, 96, W - 130, 1.02);
      var f = fussnote(c, W, H - 36, 33);
      var b = await abzeichen(c, W, f - 22);
      var sy = u + 26, sw = W - 140, frei = b.oben - (p ? 58 : 30) - sy, gap = 24, sh = Math.min(168, Math.floor((frei - gap * 2) / 3));
      sy += Math.max(0, (frei - (sh * 3 + gap * 2)) / 2);
      schritt(c, 1, "Design & Termin", "Wir planen dein Tattoo gemeinsam mit dir.", 70, sy, sw, sh);
      schritt(c, 2, "Link oder QR-Code", "Den Link schicken wir dir – oder du scannst den Code bei uns.", 70, sy + sh + gap, sw, sh);
      schritt(c, 3, "In Raten* zahlen", "Bequem am Handy über Klarna.", 70, sy + (sh + gap) * 2, sw, sh);
      if (p) seitenPunkte(c, W, b.oben - 30, p.nr, p.von);
    } },
    // Karussell 1 – Haken (navy): „Dein Wunsch-Tattoo? Aber nicht alles auf einmal zahlen?“
    haken: { w: 1080, h: 1350, async malen(c, k, W, H, p) {
      grund(c, W, H, "navy", 520);
      var y = studioKopf(c, k, W, 64, { size: 66, hell: true });
      var u = comicBlock(c, [{ t: "Dein", f: GELB, g: 0.86 }, { t: "Wunsch-Tattoo?", f: GELB }], W / 2, y + 36, 126, W - 130, 1.0, NAVY2);
      var f = fussnote(c, W, H - 36, 33, true);
      var b = await abzeichen(c, W, f - 22);
      await reihe(c, W, ["Aber nicht alles", "auf einmal zahlen?"], u + 10, b.oben - (p ? 150 : 16), { size: 54, figur: 230, schatten: NAVY2, mitte: true, rot: -0.02, kippen: -0.08 });
      if (p) { wischWeiter(c, W, b.oben - 100, true); seitenPunkte(c, W, b.oben - 30, p.nr, p.von, true); }
    } },
    // Karussell 4 – Frag uns + QR-Code zur Zahlseite (navy)
    fragpost: { w: 1080, h: 1350, async malen(c, k, W, H, p) {
      grund(c, W, H, "navy", 520);
      var y = studioKopf(c, k, W, 56, { size: 56, min: 32, ortSize: 30, hell: true });
      var u = comicBlock(c, [{ t: "Frag uns", f: GELB }, { t: "einfach!", f: GELB }], W / 2, y + 16, 118, W - 130, 1.0, NAVY2);
      font(c, "700", 37, BODY); c.fillStyle = "#fff"; c.textAlign = "center";
      ["Schreib uns eine Nachricht oder", "sprich uns im Studio an."].forEach(function (z, i) { c.fillText(z, W / 2, u + 54 + i * 48); });
      var f = fussnote(c, W, H - 36, 33, true);
      var b = await abzeichen(c, W, f - 22);
      var qy = u + 132, qs = Math.min(300, Math.floor((b.oben - (p ? 58 : 26) - qy - 70) / 1.18));
      await qrKarte(c, k.zahlseite, W / 2, qy, qs, "Direkt zur Zahlseite");
      await figur(c, W / 2 + qs / 2 + 70, qy + qs * 0.25, 200, 0.1);
      if (p) seitenPunkte(c, W, b.oben - 30, p.nr, p.von, true);
    } },
    // Story 9:16 mit großem QR-Code zur Zahlseite (navy)
    qrstory: { w: 1080, h: 1920, async malen(c, k, W, H) {
      grund(c, W, H, "navy", 1000);
      var y = studioKopf(c, k, W, 250, { size: 70, hell: true });
      sticker(c, "NEU BEI UNS", W / 2, y + 50, { size: 42, rot: -0.04, bg: GELB, fam: HEAD, gewicht: "400", padX: 40 });
      var u = comicBlock(c, [{ t: "Dein Wunsch-Tattoo", f: "#fff", g: 0.82 }, { t: "jetzt in Raten*", f: GELB }], W / 2, y + 100, 116, W - 120, 1.04, NAVY2);
      var f = fussnote(c, W, STORY_UNTEN, 36, true);
      var b = await abzeichen(c, W, f - 24, true);
      // QR-Code so groß wie Platz ist (lange Studionamen brauchen oben zwei Zeilen)
      var qy = u + 40, qs = Math.max(240, Math.min(380, Math.floor((b.oben - qy - 70 - 96) / 1.18))), cw = qs + Math.round(qs * 0.09) * 2;
      var qu = await qrKarte(c, k.zahlseite, W / 2, qy, qs, "Scannen & bezahlen");
      var url = String(k.zahlseite || "").replace(/^https?:\/\//, "");
      var us = passend(c, [url], "700", BODY, 30, 18, W - 140);
      font(c, "700", us, BODY); c.fillStyle = "#fff"; c.textAlign = "center"; c.fillText(url, W / 2, qu + 50);
      await figur(c, W / 2 + cw / 2 + 4, qu - 250, 190, 0.12);
    } },
    // Story 9:16 – Frag uns! (gelb)
    fragstory: { w: 1080, h: 1920, async malen(c, k, W, H) {
      grund(c, W, H, "gelb", 900);
      var y = studioKopf(c, k, W, 250, { size: 76 });
      var u = comicBlock(c, [{ t: "Tattoo", f: GELB }, { t: "in Raten*?", f: GELB }], W / 2, y + 30, 150, W - 130, 1.0);
      var bt = "Frag uns einfach!", bs = passend(c, [bt], "800", BODY, 72, 40, W - 300);
      font(c, "800", bs, BODY);
      var bw = c.measureText(bt).width + 100, bx = (W - bw) / 2, by = u + 44;
      var bu = blase(c, [bt], bx, by, bw, { size: bs, pad: 40, zipfel: "links-unten", rot: -0.025, mitte: true });
      var ty = bu + 120;
      await figur(c, 80, ty - 40, 270, -0.05);
      font(c, "700", 42, BODY); c.fillStyle = NAVY; c.textAlign = "left";
      ["Schreib uns eine", "Nachricht oder sprich", "uns im Studio an."].forEach(function (z, i) { c.fillText(z, 390, ty + 60 + i * 56); });
      var f = fussnote(c, W, STORY_UNTEN, 36);
      await abzeichen(c, W, f - 24, true);
    } },
  };

  async function zeichneSeite(id, k, p) {
    await schriften();
    var s = SEITEN[id], cv = document.createElement("canvas"); cv.width = s.w; cv.height = s.h;
    await s.malen(cv.getContext("2d"), k, s.w, s.h, p);
    return cv;
  }
  async function zeichne(v, k) {
    var out = [];
    for (var i = 0; i < v.seiten.length; i++) out.push(await zeichneSeite(v.seiten[i], k, v.seiten.length > 1 ? { nr: i + 1, von: v.seiten.length } : null));
    return out;
  }

  // ---------- Speichern: am Handy Teilen-Menü (Bilder sichern), am Computer Download (mehrere als ZIP) ----------
  function blobVon(cv) { return new Promise(function (ok) { cv.toBlob(ok, "image/png"); }); }
  var CRC = (function () { var t = [], c; for (var n = 0; n < 256; n++) { c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u) { var c = 0xffffffff; for (var i = 0; i < u.length; i++) c = CRC[(c ^ u[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
  async function zip(dateien) {
    var teile = [], zentral = [], off = 0, enc = new TextEncoder();
    for (var i = 0; i < dateien.length; i++) {
      var d = new Uint8Array(await dateien[i].arrayBuffer()), n = enc.encode(dateien[i].name), crc = crc32(d);
      var h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, 0, true); h.setUint16(12, 0x21, true);
      h.setUint32(14, crc, true); h.setUint32(18, d.length, true); h.setUint32(22, d.length, true); h.setUint16(26, n.length, true); h.setUint16(28, 0, true);
      var z = new DataView(new ArrayBuffer(46));
      z.setUint32(0, 0x02014b50, true); z.setUint16(4, 20, true); z.setUint16(6, 20, true); z.setUint16(8, 0x0800, true); z.setUint16(10, 0, true); z.setUint16(12, 0, true); z.setUint16(14, 0x21, true);
      z.setUint32(16, crc, true); z.setUint32(20, d.length, true); z.setUint32(24, d.length, true); z.setUint16(28, n.length, true); z.setUint32(42, off, true);
      teile.push(h.buffer, n, d); zentral.push(z.buffer, n);
      off += 30 + n.length + d.length;
    }
    var groesse = zentral.reduce(function (s, x) { return s + x.byteLength; }, 0), e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, dateien.length, true); e.setUint16(10, dateien.length, true); e.setUint32(12, groesse, true); e.setUint32(16, off, true);
    return new Blob(teile.concat(zentral, [e.buffer]), { type: "application/zip" });
  }
  function herunterladen(blob, name) {
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
  }
  // Gibt true zurück, wenn gespeichert/geteilt wurde (nicht bei Abbruch)
  async function speichern(dateien, zipName) {
    if (navigator.canShare && navigator.canShare({ files: dateien })) {
      try { await navigator.share({ files: dateien }); return true; } catch (x) { if (x.name === "AbortError") return false; }
    }
    if (dateien.length === 1) herunterladen(dateien[0], dateien[0].name);
    else herunterladen(await zip(dateien), zipName);
    return true;
  }
  function kopieren(text) {
    return (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { return true; }).catch(function () { window.prompt("Bitte kopieren:", text); return false; });
  }
  function dateiName(k, v, i, n) {
    var slug = String(k.firma || "studio").toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "studio";
    return slug + "-raten-" + v.id + (n > 1 ? "-" + (i + 1) : "") + ".png";
  }

  // Großansicht (Antippen eines Bildes), mit „Dieses Bild speichern“
  function gross(src, onSave) {
    var o = document.createElement("div"); o.className = "kit-gross"; o.setAttribute("role", "dialog"); o.setAttribute("aria-label", "Bild in groß");
    o.innerHTML = '<img alt=""><div class="row-a"><button class="btn gold small">Dieses Bild speichern</button><button class="btn ghost small">Schließen</button></div>';
    o.querySelector("img").src = src;
    var zu = function () { o.remove(); document.removeEventListener("keydown", esc); };
    var esc = function (e) { if (e.key === "Escape") zu(); };
    o.onclick = function (e) { if (e.target === o || e.target.tagName === "IMG") zu(); };
    var b = o.querySelectorAll("button"); b[0].onclick = onSave; b[1].onclick = zu;
    document.addEventListener("keydown", esc);
    document.body.appendChild(o);
  }

  // Name auf den Bildern: ohne Rechtsform („DSX Media Solutions UG (haftungsbeschränkt)“ → „DSX Media Solutions“)
  function anzeigeName(firma) {
    var n = String(firma || "").trim(), re = /[\s,]+(gmbh\s*&\s*co\.?\s*kg|ug\s*\(haftungsbeschränkt\)|\(haftungsbeschränkt\)|gmbh|ug|e\.\s?k\.?|ohg|kg|gbr|inh\.?\s.*)$/i, alt;
    do { alt = n; var m = n.replace(re, "").trim(); if (m.length >= 3) n = m; } while (n !== alt);
    return n || String(firma || "");
  }
  function lies(key) { try { return localStorage.getItem(key) || ""; } catch (x) { return ""; } }
  function merke(key, wert) { try { if (wert) localStorage.setItem(key, wert); else localStorage.removeItem(key); } catch (x) { /* privat */ } }

  // Wörter mit Bindestrich („QR-Code“, „Wunsch-Tattoo“) nie am Bindestrich umbrechen
  function ganz(html) { return html.replace(/(\S+-\S+)/g, '<span class="nb">$1</span>'); }

  var lauf = 0;
  async function zeige(box, kRoh) {
    var key = "tf-kit-name|" + kRoh.zahlseite, name = lies(key) || anzeigeName(kRoh.firma);
    if (box.dataset.kit === name + "|" + kRoh.zahlseite + "|" + kRoh.ort) return;
    box.dataset.kit = name + "|" + kRoh.zahlseite + "|" + kRoh.ort;
    var esc = TF.esc;
    box.innerHTML = '<div class="card-a kit-kopf"><h2>Deine Beiträge: Ab jetzt Ratenzahlung* <span class="neu-badge">Neu</span></h2>' +
      '<p class="muted klein">Fertige Bilder für Instagram und Facebook, mit denen du deinen Kunden zeigst: Bei euch geht jetzt Ratenzahlung*. Mit deinem Studionamen' + (kRoh.ort ? ", " + esc(kRoh.ort) : "") + ' und dem QR-Code zu deiner Zahlseite.</p>' +
      '<ol class="kit-so klein"><li><b>Bild speichern</b> – am Handy landet es in deinen Fotos.</li><li><b>Text kopieren</b> – fertig mit Pflichthinweis und Hashtags.</li><li>In Instagram posten und den Text einfügen.</li></ol>' +
      '<form class="kit-name" autocomplete="off"><label class="lbl" for="kit-name">Name auf den Bildern</label><div class="kit-name-row"><input id="kit-name" name="kit-name" type="text" autocomplete="organization" maxlength="60" value="' + esc(name) + '"><button class="btn ghost small" type="submit">Übernehmen</button></div></form></div>' +
      '<div id="kit-liste" class="kit-liste"><p class="muted klein kit-laden">Bilder werden erstellt …</p></div>';
    box.querySelector(".kit-name").onsubmit = function (e) {
      e.preventDefault();
      var neu = this.querySelector("input").value.trim() || anzeigeName(kRoh.firma);
      merke(key, neu === anzeigeName(kRoh.firma) ? "" : neu);
      box.dataset.kit = ""; zeige(box, kRoh);
    };
    var k = { firma: name, ort: kRoh.ort, zahlseite: kRoh.zahlseite, onPost: kRoh.onPost };
    var nr = ++lauf, liste = box.querySelector("#kit-liste"), alle = [];
    for (var i = 0; i < VORLAGEN.length; i++) {
      var v = VORLAGEN[i], cvs = await zeichne(v, k);
      if (nr !== lauf) return;
      var text = v.text(k), blobs = await Promise.all(cvs.map(blobVon));
      var dateien = blobs.map(function (b, j) { return new File([b], dateiName(k, v, j, blobs.length), { type: "image/png" }); });
      var item = document.createElement("div"); item.className = "card-a kit-item kit-" + v.art; item.dataset.vorlage = v.id;
      var knopfBild = dateien.length > 1 ? "Alle " + dateien.length + " Bilder speichern" : "Bild speichern";
      var knopfText = v.kopieren === "link" ? "Link kopieren" : v.kopieren === "sticker" ? "Sticker-Text kopieren" : "Text kopieren";
      item.innerHTML = '<div class="kit-titel"><b>' + ganz(esc(v.titel)) + '</b><span class="kit-format">' + esc(v.format) + "</span></div>" +
        '<p class="muted klein">' + esc(v.wofuer) + "</p>" +
        '<div class="kit-bilder"></div>' +
        '<div class="row-a"><button class="btn gold small" data-kit="bild">' + knopfBild + '</button><button class="btn dark small" data-kit="text">' + knopfText + "</button>" +
        (v.kopieren ? "" : '<button class="btn ghost small" data-kit="zeigen">Text ansehen</button>') + "</div>" +
        '<pre class="caption' + (v.kopieren ? "" : " hidden") + '">' + esc(text) + "</pre>";
      var leiste = item.querySelector(".kit-bilder");
      blobs.forEach(function (b, j) {
        var img = document.createElement("img"); img.src = URL.createObjectURL(b); img.alt = v.titel + (blobs.length > 1 ? " – Bild " + (j + 1) + " von " + blobs.length : "");
        img.width = cvs[j].width; img.height = cvs[j].height; img.tabIndex = 0; img.title = "Antippen für große Ansicht";
        var auf = (function (img, d) { return function () { gross(img.src, function () { speichern([d]).then(function (ok) { if (ok && k.onPost) k.onPost(); }); }); }; })(img, dateien[j]);
        img.onclick = auf; img.onkeydown = function (e) { if (e.key === "Enter") auf(); };
        leiste.appendChild(img);
      });
      (function (v, dateien, text, item) {
        item.querySelector('[data-kit="bild"]').onclick = async function () {
          var b = this; b.disabled = true;
          try { if (await speichern(dateien, dateiName(k, v, 0, 1).replace(/\.png$/, ".zip")) && k.onPost) k.onPost(); }
          finally { b.disabled = false; }
        };
        item.querySelector('[data-kit="text"]').onclick = function () {
          var b = this, alt = b.textContent, nur = v.kopieren === "link" ? k.zahlseite : text;
          kopieren(nur).then(function (ok) { if (ok) { b.textContent = "Kopiert ✓"; setTimeout(function () { b.textContent = alt; }, 1800); } });
        };
        var z = item.querySelector('[data-kit="zeigen"]');
        if (z) z.onclick = function () { var p = item.querySelector("pre"); p.classList.toggle("hidden"); z.textContent = p.classList.contains("hidden") ? "Text ansehen" : "Text ausblenden"; };
      })(v, dateien, text, item);
      if (!alle.length) liste.innerHTML = "";
      alle.push(item); liste.appendChild(item);
    }
  }
  return { zeige: zeige, zeichne: zeichne, zeichneSeite: zeichneSeite, VORLAGEN: VORLAGEN, FUSS: FUSS, hashtags: hashtags, anzeigeName: anzeigeName, zip: zip };
})();
