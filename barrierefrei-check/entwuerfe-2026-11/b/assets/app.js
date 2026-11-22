/* prüfklar, Entwurf B: Die Seite repariert sich selbst. Ohne JavaScript bleibt alles lesbar im reparierten Zustand. */
(function () {
  var wurzel = document.documentElement;
  var ruhig = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (id) { return document.getElementById(id); };

  var BEFUND = [
    ["5 Mängel offen.", "Ziehen Sie den Regler oder tippen Sie einmal darauf."],
    ["Mangel 1: Knopf kaum lesbar.", "In der Sonne nicht zu erkennen. Jetzt dunkel und klar."],
    ["Mangel 2: Bild ohne Beschreibung.", "Vorgelesen wurde nur „Bild“. Jetzt mit Text."],
    ["Mangel 3: Feld ohne Beschriftung.", "Vorgelesen wurde „Eingabefeld“, jetzt „Suche“."],
    ["Mangel 4: Tippfläche zu klein.", "Plus und Minus lagen zu dicht. Jetzt 44\u00a0×\u00a044 Pixel."],
    ["Mangel 5: Schrift zu klein und blass.", "Jede Stelle steht so im Bericht."]
  ];

  /* Mit Maus heißt es klicken, am Handy tippen. */
  if (window.matchMedia && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    BEFUND[0][1] = "Ziehen Sie den Regler oder klicken Sie einmal darauf.";
    $("st-a").textContent = "Ziehen oder klicken: reparieren";
  }

  var regler = $("regler"), eingabe = $("r"), befund = $("befund"), held = document.querySelector(".held");
  var griff = regler.querySelector(".griff"), flut = $("flut");
  var p = 0, s = -1, fahrt = null, leise = false, flutWeg = 0;

  function flutUrsprung() {
    var h = held.getBoundingClientRect(), g = griff.getBoundingClientRect();
    flut.style.setProperty("--fx", (g.left + g.width / 2 - h.left) + "px");
    flut.style.setProperty("--fy", (g.top + g.height / 2 - h.top) + "px");
  }

  function hupf(sel) {
    if (ruhig || !sel) return;
    var el = document.querySelector(sel);
    if (el && el.animate) el.animate([{ transform: "scale(1)" }, { transform: "scale(1.5)" }, { transform: "scale(1)" }], { duration: 320, easing: "cubic-bezier(.3,1.6,.5,1)" });
  }

  function zustand(neu) {
    if (neu === s) return;
    var vor = s; s = neu;
    if ((s === 5 || vor === 5) && vor !== -1) {
      flutUrsprung();
      flut.style.visibility = "visible";
      clearTimeout(flutWeg);
      flutWeg = setTimeout(function () { flut.style.visibility = ""; }, 820);
    }
    for (var i = 1; i <= 5; i++) wurzel.classList.toggle("m" + i, i > s);
    wurzel.classList.toggle("angefasst", s > 0);
    eingabe.value = s;
    eingabe.setAttribute("aria-valuetext", s + " von 5 Mängeln behoben");
    var rest = 5 - s;
    $("zahl").textContent = rest;
    $("wort").textContent = rest === 1 ? "Mangel" : "Mängel";
    if (!leise) befund.innerHTML = "<strong>" + BEFUND[s][0] + "</strong> " + BEFUND[s][1];
    if (vor !== -1 && s > vor) {
      hupf(".pin" + s);
      hupf("#zahl");
      if (navigator.vibrate) { try { navigator.vibrate(s === 5 ? [12, 40, 24] : 10); } catch (e) {} }
    }
  }

  function setzen(wert) {
    p = Math.max(0, Math.min(5, wert));
    regler.style.setProperty("--p", p / 5);
    zustand(Math.floor(p + 0.02));
  }

  function fahren(ziel) {
    if (fahrt) cancelAnimationFrame(fahrt);
    if (ruhig) { setzen(ziel); return; }
    var start = p, dauer = Math.abs(ziel - start) * 270, t0 = null;
    function schritt(t) {
      if (t0 === null) t0 = t;
      var a = Math.min(1, (t - t0) / dauer);
      setzen(start + (ziel - start) * a);
      fahrt = a < 1 ? requestAnimationFrame(schritt) : null;
    }
    fahrt = requestAnimationFrame(schritt);
  }

  /* Regler: Tippen fährt ganz durch, Ziehen schiebt von Hand. Senkrechtes Wischen scrollt weiter (touch-action: pan-y). */
  var ziehen = null;
  function wertAus(x) {
    var r = regler.getBoundingClientRect(), g = griff.offsetWidth;
    return (x - r.left - g / 2) / (r.width - g) * 5;
  }
  regler.addEventListener("pointerdown", function (e) {
    if (e.button) return;
    if (fahrt) { cancelAnimationFrame(fahrt); fahrt = null; }
    ziehen = { x: e.clientX, id: e.pointerId, bewegt: false, ab: wertAus(e.clientX) - p };
    try { regler.setPointerCapture(e.pointerId); } catch (x) {}
    if (e.pointerType === "mouse") eingabe.focus({ preventScroll: true });
  });
  regler.addEventListener("pointermove", function (e) {
    if (!ziehen || e.pointerId !== ziehen.id) return;
    if (!ziehen.bewegt && Math.abs(e.clientX - ziehen.x) < 6) return;
    ziehen.bewegt = true;
    var griffNah = Math.abs(ziehen.ab) < 1.2;
    setzen(griffNah ? wertAus(e.clientX) - ziehen.ab : wertAus(e.clientX));
  });
  function loslassen(e) {
    if (!ziehen) return;
    var war = ziehen; ziehen = null;
    if (!war.bewegt) { if (e.type !== "pointercancel") fahren(s === 5 ? 0 : 5); return; }
    fahren(Math.round(p));
  }
  regler.addEventListener("pointerup", loslassen);
  regler.addEventListener("pointercancel", loslassen);
  eingabe.addEventListener("input", function () { fahren(+eingabe.value); });

  /* Tippen auf den Ausschnitt tut dasselbe wie Tippen auf den Regler. */
  $("buehne").addEventListener("click", function () { fahren(s === 5 ? 0 : 5); });

  setzen(0);
  befund.innerHTML = "<strong>" + BEFUND[0][0] + "</strong> " + BEFUND[0][1];

  /* Einmal andeuten, dass der Griff beweglich ist. */
  if (!ruhig && regler.animate) {
    setTimeout(function () {
      if (s === 0 && !ziehen && !fahrt) griff.animate([{ transform: "translateX(0)" }, { transform: "translateX(26px)" }, { transform: "translateX(0)" }], { duration: 760, easing: "cubic-bezier(.3,1.4,.5,1)" });
    }, 1400);
  }

  /* Wer weiterscrollt, kommt zu einer reparierten Seite zurück. */
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e) {
      var sichtbar = e[0].isIntersecting;
      if (!sichtbar && s < 5 && e[0].boundingClientRect.top < 0) {
        if (fahrt) { cancelAnimationFrame(fahrt); fahrt = null; }
        leise = true; setzen(5); leise = false;
        befund.innerHTML = "<strong>" + BEFUND[5][0] + "</strong> " + BEFUND[5][1];
      }
    }, { threshold: 0.2 }).observe(held);

    /* Handy-Leiste nur, wenn gerade kein Testfeld im Bild ist. */
    var leiste = $("leiste"), felder = document.querySelectorAll(".test"), inSicht = new Set();
    var beob = new IntersectionObserver(function (es) {
      es.forEach(function (x) { if (x.isIntersecting) inSicht.add(x.target); else inSicht.delete(x.target); });
      leiste.hidden = inSicht.size > 0;
    });
    felder.forEach(function (f) { beob.observe(f); });
    leiste.querySelector("a").addEventListener("click", function (e) {
      e.preventDefault();
      var f = $("test-domain");
      f.scrollIntoView({ block: "center", behavior: ruhig ? "auto" : "smooth" });
      f.focus({ preventScroll: true });
    });
  }

  /* Karten seitlich: Knöpfe für Maus und Tastatur. */
  var reihe = $("reihe"), blaettern = document.querySelector(".blaettern");
  if (reihe && blaettern) {
    blaettern.hidden = false;
    function kartenbreite() { var k = reihe.querySelector(".zettel"); return k.offsetWidth + 14; }
    function stand() {
      var max = reihe.scrollWidth - reihe.clientWidth - 2;
      $("zurueck").setAttribute("aria-disabled", reihe.scrollLeft <= 2 ? "true" : "false");
      $("weiter").setAttribute("aria-disabled", reihe.scrollLeft >= max ? "true" : "false");
    }
    function gehe(r) { reihe.scrollBy({ left: r * kartenbreite(), behavior: ruhig ? "auto" : "smooth" }); }
    $("zurueck").addEventListener("click", function () { gehe(-1); });
    $("weiter").addEventListener("click", function () { gehe(1); });
    reihe.addEventListener("scroll", stand, { passive: true });
    addEventListener("resize", stand);
    stand();
  }

  /* Testfelder sind im Entwurf eine Vorführung und sagen das offen. */
  document.querySelectorAll("form[data-art]").forEach(function (f) {
    var feld = f.querySelector("input"), fehler = f.querySelector(".fehler"), antwort = f.querySelector(".demo-antwort");
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var wert = feld.value.trim(), domain = f.dataset.art === "domain";
      var ok = domain ? /^(https?:\/\/)?([a-z0-9äöüß-]+\.)+[a-z]{2,}([\/?#].*)?$/i.test(wert) : /^[a-z0-9]{8}$/i.test(wert);
      antwort.textContent = "";
      if (!ok) {
        fehler.textContent = domain ? "Bitte geben Sie eine Adresse ein, zum Beispiel mein-shop.de." : "Der Prüfcode hat 8 Zeichen, nur Buchstaben und Ziffern.";
        feld.setAttribute("aria-invalid", "true");
        feld.focus();
        return;
      }
      fehler.textContent = "";
      feld.removeAttribute("aria-invalid");
      antwort.textContent = domain
        ? "Entwurf: Hier wurde nichts geprüft und nichts gesendet. Später steht an dieser Stelle in Sekunden Ihr echtes Ergebnis."
        : "Entwurf: Der Prüfcode wurde nicht abgefragt. Später öffnet sich hier Ihr Ergebnis aus dem Brief.";
      var link = document.createElement("a");
      link.href = "https://pruefklar.de/"; link.textContent = "Zum echten Test auf pruefklar.de";
      antwort.appendChild(document.createTextNode(" ")); antwort.appendChild(link);
    });
    feld.addEventListener("input", function () {
      if (feld.hasAttribute("aria-invalid")) { feld.removeAttribute("aria-invalid"); fehler.textContent = ""; }
    });
  });
})();
