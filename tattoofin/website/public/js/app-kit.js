// Werbung im Dashboard: fertige Instagram-Bilder (Story/Beitrag) mit Studioname + QR-Code zur Zahlseite,
// direkt im Browser gezeichnet. Formulierungsregeln: „Raten*“ immer mit Fußnote, keine Zahlen zu Raten/Zinsen,
// kein „Geld sofort“, kein „voller Betrag“, keine Versprechen zur Bewilligung.
window.TFKit = (function () {
  var FUSS = "*Ratenzahlung über externe Anbieter wie Klarna, nach deren Prüfung. Wir sind kein Kreditgeber. Achtung! Kreditaufnahme kostet Geld.";
  var VORLAGEN = [
    { id: "raten-story", titel: "Story: Raten* möglich", w: 1080, h: 1920,
      zeilen: ["Dein Wunsch-", "tattoo. Jetzt", "auch in Raten*."], unter: "Einfach per Link oder QR-Code im Studio bezahlen.",
      text: function (k) { return "Dein Wunschtattoo muss nicht am Preis scheitern. Bei " + k.firma + " kannst du jetzt auch in Raten* zahlen – ganz einfach per Link oder QR-Code im Studio. Frag uns beim nächsten Termin! 🖤\n\n" + FUSS; } },
    { id: "anzahlung-post", titel: "Beitrag: Anzahlung per Link", w: 1080, h: 1350,
      zeilen: ["Termin sichern?", "Anzahlung", "per Link."], unter: "Mit Karte, Apple Pay oder Klarna*. Unsere Bedingungen siehst du vorher.",
      text: function (k) { return "Termin sichern geht jetzt ganz einfach: Die Anzahlung bezahlst du bei " + k.firma + " per Link – mit Karte, Apple Pay oder Klarna*. Unsere Anzahlungsbedingungen siehst du vor dem Bezahlen. ✍️\n\n" + FUSS; } },
    { id: "qr-story", titel: "Story: Bezahlen per QR-Code", w: 1080, h: 1920,
      zeilen: ["Neu bei uns:", "Bezahlen per", "QR-Code."], unter: "Scannen, Betrag eintragen, fertig. Auch in Raten*.",
      text: function (k) { return "Neu bei " + k.firma + ": Bezahlen per QR-Code. Scannen, abgesprochenen Betrag eintragen, fertig – mit Karte, Apple Pay oder in Raten*. Den Link findest du auch in unserer Bio.\n\n" + FUSS; } },
  ];
  var NAVY = "#1f3d5c", GELB = "#fbb316";

  function bild(src) { return new Promise(function (ok) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = function () { ok(null); }; i.src = src; }); }
  function qrCanvas(text) {
    var d = document.createElement("div");
    new QRCode(d, { text: text, width: 600, height: 600, colorDark: "#13243d", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M });
    return d.querySelector("canvas") || d.querySelector("img");
  }
  function rund(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function umbruch(c, text, maxW) {
    var worte = text.split(" "), z = [], akt = "";
    worte.forEach(function (w) { var t = akt ? akt + " " + w : w; if (c.measureText(t).width > maxW && akt) { z.push(akt); akt = w; } else akt = t; });
    if (akt) z.push(akt);
    return z;
  }

  async function zeichne(v, k) {
    await Promise.all([document.fonts.load("80px 'Luckiest Guy'"), document.fonts.load("700 40px 'DM Sans'")]).catch(function () {});
    var cv = document.createElement("canvas"); cv.width = v.w; cv.height = v.h;
    var c = cv.getContext("2d"), W = v.w, H = v.h, story = H > 1500;
    c.fillStyle = GELB; c.fillRect(0, 0, W, H);
    c.fillStyle = "rgba(31,61,92,.13)";
    for (var x = 9; x < W; x += 27) for (var y = 9; y < H; y += 27) { c.beginPath(); c.arc(x, y, 2.4, 0, 7); c.fill(); }
    // Studioname als Sticker
    c.font = "700 46px 'DM Sans', sans-serif";
    var name = k.firma.toUpperCase(), nw = Math.min(W - 120, c.measureText(name).width + 70);
    c.save(); c.translate(W / 2, story ? 210 : 120); c.rotate(-0.03);
    c.fillStyle = NAVY; rund(c, -nw / 2 + 8, -38 + 8, nw, 84, 42); c.fill();
    c.fillStyle = "#fff"; c.strokeStyle = NAVY; c.lineWidth = 6; rund(c, -nw / 2, -38, nw, 84, 42); c.fill(); c.stroke();
    c.fillStyle = NAVY; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(name, 0, 6, nw - 50); c.restore();
    // Überschrift (Outline wie die Wortmarke)
    var gr = story ? 128 : 112, y0 = story ? 470 : 300;
    c.font = gr + "px 'Luckiest Guy', sans-serif"; c.textAlign = "center"; c.textBaseline = "alphabetic"; c.lineJoin = "round";
    v.zeilen.forEach(function (z, i) {
      var yy = y0 + i * gr * 1.02;
      c.fillStyle = NAVY; c.fillText(z, W / 2 + 9, yy + 11, W - 90);
      c.strokeStyle = NAVY; c.lineWidth = 22; c.strokeText(z, W / 2, yy, W - 90);
      c.fillStyle = i === v.zeilen.length - 1 ? "#fff" : GELB; c.fillText(z, W / 2, yy, W - 90);
    });
    // Unterzeile
    c.font = "700 " + (story ? 50 : 42) + "px 'DM Sans', sans-serif"; c.fillStyle = NAVY;
    var uy = y0 + v.zeilen.length * gr + (story ? 40 : 10);
    umbruch(c, v.unter, W - 180).forEach(function (z, i) { c.fillText(z, W / 2, uy + i * (story ? 64 : 54)); });
    // QR-Code
    var q = qrCanvas(k.zahlseite), qs = story ? 470 : 340, qx = (W - qs) / 2, qy = story ? 1080 : 760;
    c.fillStyle = NAVY; rund(c, qx - 30 + 12, qy - 30 + 12, qs + 60, qs + 60, 40); c.fill();
    c.fillStyle = "#fff"; c.strokeStyle = NAVY; c.lineWidth = 8; rund(c, qx - 30, qy - 30, qs + 60, qs + 60, 40); c.fill(); c.stroke();
    if (q) { if (q.tagName === "IMG" && !q.complete) await new Promise(function (ok) { q.onload = ok; }); c.drawImage(q, qx, qy, qs, qs); }
    c.font = "700 " + (story ? 40 : 34) + "px 'DM Sans', sans-serif"; c.fillStyle = NAVY;
    c.fillText("Scannen & bezahlen", W / 2, qy + qs + (story ? 100 : 80));
    // Fußnote (Pflicht bei „Raten*“)
    c.font = "500 " + (story ? 27 : 24) + "px 'DM Sans', sans-serif"; c.fillStyle = NAVY;
    var fz = umbruch(c, FUSS, W - 140), fy = H - (story ? 120 : 70) - (fz.length - 1) * 34;
    fz.forEach(function (z, i) { c.fillText(z, W / 2, fy + i * 34); });
    var fig = await bild("/assets/figur.png");
    if (fig) c.drawImage(fig, W - 150, H - (story ? 330 : 250), 110, 110);
    return cv;
  }

  async function speichern(cv, name) {
    var blob = await new Promise(function (ok) { cv.toBlob(ok, "image/png"); });
    var datei = new File([blob], name + ".png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [datei] })) { try { await navigator.share({ files: [datei] }); return; } catch (x) { if (x.name === "AbortError") return; } }
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name + ".png"; document.body.appendChild(a); a.click(); a.remove();
  }

  var fertig = {};
  async function zeige(box, k) {
    if (fertig[k.zahlseite]) return;
    fertig[k.zahlseite] = true;
    box.innerHTML = '<div class="kit-grid" id="kit-grid"></div>' + VORLAGEN.map(function (v) {
      return '<div class="card-a hidden" data-text="' + v.id + '"><h2>Text zu „' + TF.esc(v.titel) + '“</h2><pre class="caption">' + TF.esc(v.text(k)) + '</pre><div class="row-a"><button class="btn dark small" data-copytext="' + TF.esc(v.text(k)) + '">Text kopieren</button></div></div>';
    }).join("");
    var grid = box.querySelector("#kit-grid");
    for (var i = 0; i < VORLAGEN.length; i++) {
      var v = VORLAGEN[i], cv = await zeichne(v, k);
      var item = document.createElement("div"); item.className = "kit-item";
      var img = document.createElement("img"); img.alt = v.titel; img.src = cv.toDataURL("image/png"); img.loading = "lazy";
      item.appendChild(img);
      item.insertAdjacentHTML("beforeend", "<b>" + TF.esc(v.titel) + '</b><button class="btn gold small">Bild speichern</button><button class="btn ghost small">Text dazu</button>');
      (function (v, cv) {
        var b = item.querySelectorAll("button");
        b[0].onclick = function () { speichern(cv, "tattoofin-" + v.id); };
        b[1].onclick = function () { var t = box.querySelector('[data-text="' + v.id + '"]'); t.classList.toggle("hidden"); t.scrollIntoView({ behavior: "smooth", block: "nearest" }); };
      })(v, cv);
      grid.appendChild(item);
    }
  }
  return { zeige: zeige, FUSS: FUSS };
})();
