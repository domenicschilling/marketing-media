// „So geht's“: Erklärvideo zur Studio-App (18.10.2026). Auf der Startseite (#so-gehts, kompakt, ausblendbar) und als eigene
// Ansicht #video (aus „Mehr“). Hochformat 9:16 am Handy, Querformat 16:9 auf breiten Bildschirmen. Das Video lädt erst beim
// Abspielen (preload="none"), das Vorschaubild erst, wenn das Video in Sichtweite kommt. Untertitel sind im Bild, Kapitel als Liste.
// Videos/Vorschaubilder liegen auf der eigenen Domain (/assets/app/hilfe/), keine Drittanbieter.
(function () {
  var V = {
    version: "2026-10-18",
    hoch: { src: "/assets/app/hilfe/so-gehts-9x16.mp4", poster: "/assets/app/hilfe/so-gehts-9x16.jpg", w: 720, h: 1280 },
    quer: { src: "/assets/app/hilfe/so-gehts-16x9.mp4", poster: "/assets/app/hilfe/so-gehts-16x9.jpg", w: 1280, h: 720 },
    dauer: 147.73,
    kapitel: [
      { ab: 0, name: "Übersicht und Einrichtung" },
      { ab: 22.1, name: "Zahlungslink erstellen" },
      { ab: 53.2, name: "Was dein Kunde sieht" },
      { ab: 66.7, name: "Zahlungen und Nachweise" },
      { ab: 79.8, name: "Nach dem Termin" },
      { ab: 93.6, name: "Dein Geld" },
      { ab: 100.6, name: "Werbung" },
      { ab: 113.6, name: "Deine rechtliche Lage" },
      { ab: 120.3, name: "App auf den Startbildschirm" },
      { ab: 135.4, name: "Hilfe per WhatsApp" },
    ],
  };
  var AUS = "tf-so-gehts-aus";
  var merke = { get: function (k) { try { return localStorage.getItem(k); } catch (x) { return null; } }, set: function (k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (x) {} } };
  var zeit = function (s) { s = Math.round(s); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  var minuten = function () { var m = Math.round(V.dauer / 60 * 2) / 2; return (m % 1 ? Math.floor(m) + ",5" : m) + " Minuten"; };

  function box(el, kompakt) {
    var quer = window.matchMedia("(min-width: 720px) and (orientation: landscape)").matches;
    var f = quer ? V.quer : V.hoch;
    el.innerHTML =
      (kompakt ? '<div class="card-h"><h2>🎬 So geht\'s</h2><button type="button" class="sg-aus" aria-label="Video auf der Startseite ausblenden">Ausblenden</button></div><p class="klein muted sg-text">Deine App in rund ' + minuten() + " erklärt. Tippe auf ein Kapitel, um direkt dorthin zu springen.</p>" : "") +
      '<div class="sg-film ' + (quer ? "quer" : "hoch") + (kompakt ? " kompakt" : "") + '"><video controls playsinline preload="none" width="' + f.w + '" height="' + f.h + '" data-poster="' + f.poster + '" aria-label="Erklärvideo: So funktioniert deine Tattoofin-App"><source src="' + f.src + '" type="video/mp4"></video></div>' +
      '<details class="sg-kap"' + (kompakt ? "" : " open") + "><summary>Kapitel (" + V.kapitel.length + ")</summary><ol>" +
      V.kapitel.map(function (k, i) { return '<li><button type="button" data-t="' + k.ab + '" data-i="' + i + '"><span>' + zeit(k.ab) + "</span>" + k.name + "</button></li>"; }).join("") +
      '</ol></details><p class="klein muted sg-fuss">Stimme mit KI erstellt · App-Bilder: Beispiel-Studio mit Testdaten · *Ratenzahlung über externe Anbieter wie Klarna, nach deren Prüfung. Tattoofin ist kein Kreditgeber.</p>';
    var v = el.querySelector("video"), knoepfe = el.querySelectorAll(".sg-kap button");
    el.querySelectorAll(".sg-kap button").forEach(function (b) {
      b.onclick = function () {
        var t = +b.dataset.t; v.dataset.ziel = t;
        var los = function () { try { v.currentTime = t; } catch (x) {} var p = v.play(); if (p && p.catch) p.catch(function () {}); };
        if (v.readyState >= 1) los(); else { v.addEventListener("loadedmetadata", los, { once: true }); v.load(); }
        v.scrollIntoView({ behavior: "smooth", block: "nearest" });
      };
    });
    v.addEventListener("timeupdate", function () {
      var a = 0; V.kapitel.forEach(function (k, i) { if (v.currentTime >= k.ab - 0.2) a = i; });
      knoepfe.forEach(function (b, i) { b.classList.toggle("an", i === a && v.currentTime > 0); });
    });
    var aus = el.querySelector(".sg-aus");
    if (aus) aus.onclick = function () { v.pause(); merke.set(AUS, V.version); el.classList.add("hidden"); var w = document.getElementById("sg-wieder"); if (w) w.classList.remove("hidden"); };
  }

  // Vorschaubild erst laden, wenn das Video in Sichtweite kommt
  function posterSpaeter(v) {
    var setz = function () { if (!v.poster) v.poster = v.dataset.poster; };
    if (!("IntersectionObserver" in window)) return setz();
    var io = new IntersectionObserver(function (es) { if (es.some(function (x) { return x.isIntersecting; })) { io.disconnect(); setz(); } }, { rootMargin: "300px" });
    io.observe(v);
  }
  function spaeter(el, kompakt) {
    if (!el) return;
    if (kompakt && merke.get(AUS) === V.version) { el.classList.add("hidden"); return; }
    box(el, kompakt);
    posterSpaeter(el.querySelector("video"));
  }
  document.addEventListener("DOMContentLoaded", function () {
    spaeter(document.getElementById("so-gehts"), true);
    spaeter(document.getElementById("video-box"), false);
    // Andere Ansicht geöffnet: Video anhalten
    window.addEventListener("hashchange", function () {
      var ziel = (location.hash || "#start").slice(1).split("/")[0] || "start";
      document.querySelectorAll(".sg-film video").forEach(function (v) { var s = v.closest("[data-view]"); if (!s || s.dataset.view !== ziel) v.pause(); });
    });
    // Auf der Startseite ausgeblendet? In „Mehr → So geht's“ wieder einblenden
    var wieder = document.getElementById("sg-wieder");
    if (wieder) {
      wieder.classList.toggle("hidden", merke.get(AUS) !== V.version);
      wieder.onclick = function () { merke.set(AUS, null); wieder.classList.add("hidden"); var s = document.getElementById("so-gehts"); if (s) { s.classList.remove("hidden"); spaeter(s, true); } };
    }
  });
  window.TFSoGehts = V;
})();
