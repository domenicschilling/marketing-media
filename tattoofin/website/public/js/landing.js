// Landingpage: Konfiguration, 3D-Bühne, Scroll-Animationen, Rechner
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var ruhig = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  $("jahr").textContent = new Date().getFullYear();

  // Dicke für Handy-Mockups: gestapelte Ebenen hinter dem Display
  document.querySelectorAll("[data-slabs]").forEach(function (el) {
    var n = +el.dataset.slabs;
    for (var i = n; i >= 1; i--) {
      var d = document.createElement("div");
      d.className = "slab";
      d.style.transform = "translateZ(" + (-i * 1.7) + "px)";
      if (i === n) d.style.boxShadow = "18px 22px 0 rgba(31,61,92,.28)";
      el.insertBefore(d, el.firstChild);
    }
  });
  // Münze: Rand aus vielen Scheiben
  var coin = $("coin");
  if (coin) for (var k = -8; k <= 8; k++) {
    var e = document.createElement("div");
    e.className = "edge";
    e.style.transform = "translateZ(" + k + "px)";
    coin.insertBefore(e, coin.firstChild);
  }

  // Hero: Bühne folgt der Maus
  var scene = $("scene"), stage = $("stage"), hero = document.querySelector(".hero");
  if (scene && !ruhig) {
    hero.addEventListener("pointermove", function (ev) {
      if (ev.pointerType === "touch") return;
      var r = scene.getBoundingClientRect();
      var x = (ev.clientX - r.left) / r.width - 0.5, y = (ev.clientY - r.top) / r.height - 0.5;
      scene.classList.remove("idle");
      stage.style.setProperty("--ry", (-14 + x * 34).toFixed(1) + "deg");
      stage.style.setProperty("--rx", (6 - y * 20).toFixed(1) + "deg");
    });
    hero.addEventListener("pointerleave", function () { scene.classList.add("idle"); });
  }

  // Checkout im Handy: Auswahl wechselt
  var opts = Array.prototype.slice.call(document.querySelectorAll(".phone3d .o"));
  var folge = [2, 0, 2, 1, 2, 3], f = 0;
  if (opts.length && !ruhig) setInterval(function () {
    f = (f + 1) % folge.length;
    opts.forEach(function (o, i) { o.classList.toggle("on", i === folge[f]); });
  }, 1700);

  // Einblenden beim Scrollen
  var zaehle = function (el) {
    var ziel = +el.dataset.count, t0 = null;
    if (ruhig) return;
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / 1200), v = Math.round(ziel * (1 - Math.pow(1 - p, 3)));
      el.textContent = v.toLocaleString("de-DE") + " €";
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  };
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      e.target.querySelectorAll("[data-count]").forEach(zaehle);
      io.unobserve(e.target);
    });
  }, { threshold: 0.18 }) : null;
  var offen = Array.prototype.slice.call(document.querySelectorAll(".reveal,.inview"));
  offen.forEach(function (el) { if (io) io.observe(el); else el.classList.add("in"); });
  // Sicherheitsnetz: alles, was schon über die Bildschirmkante gescrollt ist, auch zeigen (z. B. nach Sprung per Anker)
  function nachziehen() {
    offen = offen.filter(function (el) {
      if (el.classList.contains("in")) return false;
      if (el.getBoundingClientRect().top < window.innerHeight * 0.9) {
        el.classList.add("in");
        el.querySelectorAll("[data-count]").forEach(zaehle);
        return false;
      }
      return true;
    });
  }
  window.addEventListener("scroll", nachziehen, { passive: true });
  nachziehen();

  // Isometrische Mockups: richten sich beim Scrollen auf
  var iso = $("iso");
  function scroll() {
    if (!iso) return;
    var r = iso.getBoundingClientRect(), h = window.innerHeight;
    var p = Math.max(0, Math.min(1, (h - r.top) / (h + r.height * 0.5)));
    iso.style.setProperty("--p", ruhig ? 0.5 : p.toFixed(3));
  }
  window.addEventListener("scroll", scroll, { passive: true });
  scroll();

  // QR-Code auf dem Flyer-Mockup
  if (window.QRCode && $("flyer-qr")) new QRCode($("flyer-qr"), { text: location.origin + "/start.html", width: 200, height: 200, colorDark: "#1f3d5c", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M });

  // Konfiguration, Video, Rechner
  TF.config().then(function (c) {
    TF.fill(c);
    if (c.videoUrl) {
      var v = $("video");
      v.src = c.videoUrl;
      v.addEventListener("loadedmetadata", function () { $("video-wrap").classList.remove("hidden"); });
    }
    function rechne() {
      var n = +$("proj").value, b = +$("betrag").value;
      var umsatz = n * b, prov = umsatz * c.provisionProzent / 100;
      $("v-proj").textContent = n; $("v-betrag").textContent = b.toLocaleString("de-DE") + " €";
      $("r-umsatz").textContent = TF.euro(umsatz * 100);
      $("r-prov").textContent = TF.euro(prov * 100);
      // Vergleich: Provision netto (ohne USt.) gegen eigene Zahlungsgebühren beim Kauf (≈ 2,3 %)
      var ersparnis = umsatz * (c.provisionProzent / (100 + c.ustProzent) - 0.023);
      var monate = ersparnis > 0 ? Math.ceil(c.kaufNetto / 100 / ersparnis) : 0;
      $("r-amort").textContent = monate ? (monate === 1 ? "1 Monat" : monate + " Monaten") : "–";
      $("r-tipp").textContent = monate && monate <= 12 ? "Kaufen lohnt sich" : "Provision";
    }
    ["proj", "betrag"].forEach(function (id) { $(id).addEventListener("input", rechne); });
    rechne();
  });
})();
