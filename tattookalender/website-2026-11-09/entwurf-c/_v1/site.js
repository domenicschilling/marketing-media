/* Tattookalender · Entwurf C "Tinte" · Bewegungsebene.
   Regel: Nichts hier blendet Inhalte aus. Alles bewegt nur transform; ohne dieses Skript ist die Seite vollständig. */
(function () {
  "use strict";
  var reduceQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduce = reduceQ.matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  /* ---- Bilder rechtzeitig laden: lazy-Bilder eines Abschnitts schon 1,5 Bildschirme vorher holen,
     sonst steht beim schnellen Wischen kurz ein leeres Gerät da (auch die waagerecht versteckten im Ablauf) ---- */
  (function () {
    var lazy = Array.prototype.slice.call(document.querySelectorAll('img[loading="lazy"]'));
    if (!lazy.length) return;
    var groups = [];
    lazy.forEach(function (img) { var s = img.closest("section") || img.parentElement; if (groups.indexOf(s) < 0) groups.push(s); });
    var wake = function (s) { s.querySelectorAll('img[loading="lazy"]').forEach(function (img) { img.loading = "eager"; if (img.decode) img.decode().catch(function () {}); }); };
    if (!("IntersectionObserver" in window)) { groups.forEach(wake); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { wake(e.target); io.unobserve(e.target); } });
    }, { rootMargin: "150% 0px 150% 0px" });
    groups.forEach(function (s) { io.observe(s); });
  })();

  /* ---- Wisch-Streifen „Ablauf“ (Handy + Desktop ohne Pinning) ---- */
  var steps = document.querySelector(".steps");
  var track = steps && steps.querySelector(".steps-track");
  var cards = track ? Array.prototype.slice.call(track.querySelectorAll(".step")) : [];
  var countEl = steps && steps.querySelector("[data-count]");
  var prevBtn = steps && steps.querySelector('[data-step="-1"]');
  var nextBtn = steps && steps.querySelector('[data-step="1"]');
  var pinned = false;

  function stripIndex() {
    if (!track) return 0;
    var mid = track.scrollLeft + track.clientWidth / 2, best = 0, bd = 1e9;
    cards.forEach(function (c, i) { var d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < bd) { bd = d; best = i; } });
    return best;
  }
  var stripRaf = 0;
  function stripTick() {
    stripRaf = 0;
    if (pinned || !track) return;
    var i = stripIndex();
    if (countEl) countEl.textContent = String(i + 1);
    if (prevBtn) prevBtn.disabled = i === 0;
    if (nextBtn) nextBtn.disabled = i === cards.length - 1;
    if (reduce) return;
    var mid = track.scrollLeft + track.clientWidth / 2, w = track.clientWidth;
    cards.forEach(function (c) {
      var off = clamp((c.offsetLeft + c.offsetWidth / 2 - mid) / w, -1.2, 1.2);
      var dev = c.firstElementChild.firstElementChild;
      dev.style.transform = Math.abs(off) < 0.002 ? "" :
        "rotateY(" + (-off * 38).toFixed(2) + "deg) scale(" + (1 - Math.abs(off) * 0.1).toFixed(3) + ")";
    });
  }
  if (track) {
    track.addEventListener("scroll", function () { if (!stripRaf) stripRaf = requestAnimationFrame(stripTick); }, { passive: true });
    [prevBtn, nextBtn].forEach(function (b) {
      if (!b) return;
      b.addEventListener("click", function () {
        var i = clamp(stripIndex() + Number(b.getAttribute("data-step")), 0, cards.length - 1);
        var c = cards[i];
        track.scrollTo({ left: c.offsetLeft - (track.clientWidth - c.offsetWidth) / 2, behavior: reduce ? "auto" : "smooth" });
      });
    });
    stripTick();
  }

  /* ---- Ohne GSAP (z. B. Netzfehler): fertig, Seite ist vollständig ---- */
  if (!window.gsap || !window.ScrollTrigger) return;
  var gsap = window.gsap, ST = window.ScrollTrigger;
  gsap.registerPlugin(ST);
  ST.config({ ignoreMobileResize: true });

  /* Sanftes Scrollen nur mit Maus/Trackpad; am Handy bleibt das native Scrollen (flüssig in Safari) */
  var lenis = null;
  if (!reduce && window.Lenis && window.matchMedia("(pointer: fine)").matches) {
    lenis = new window.Lenis({ lerp: 0.11, wheelMultiplier: 1 });
    lenis.on("scroll", ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href"); var el = id.length > 1 ? document.querySelector(id) : document.body;
        if (!el) return; e.preventDefault(); lenis.scrollTo(el, { offset: id === "#top" ? 0 : -64 });
      });
    });
  }

  var mm = gsap.matchMedia();

  mm.add("(prefers-reduced-motion: no-preference)", function () {
    /* Kopfbereich: Handy taucht aus der Tinte auf (sichtbar ab dem ersten Bild, es bewegt sich nur) */
    var tilt = document.querySelector(".hero .tilt");
    if (tilt) {
      gsap.from(".hero .device-hero", { y: 90, rotateX: 22, duration: 1.8, ease: "expo.out" });
      gsap.fromTo(tilt, { rotateX: 9, rotateZ: -3, y: 0, scale: 1 }, {
        rotateX: 0, rotateZ: 0, y: -36, scale: 1.04, ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
      });
    }
    ST.create({ trigger: ".hero", start: "top top", end: "bottom top", onUpdate: function (s) { if (window.TKInk) window.TKInk.setScroll(s.progress); } });

    /* Problem: Zeilen werden beim Lesen „eingefärbt“ */
    gsap.utils.toArray(".pain-list li").forEach(function (li) {
      ST.create({ trigger: li, start: "top 78%", onEnter: function () { li.classList.add("is-inked"); }, onLeaveBack: function () { li.classList.remove("is-inked"); } });
    });

    /* Bildschirm klappt auf, während er ins Bild kommt */
    gsap.fromTo(".laptop-lid", { rotateX: 42 }, {
      rotateX: 0, ease: "none",
      scrollTrigger: { trigger: ".laptop", start: "top 95%", end: "top 35%", scrub: true }
    });

    /* Große Null wandert leicht gegen die Scrollrichtung */
    gsap.fromTo(".zero-num", { yPercent: 12 }, { yPercent: -10, ease: "none", scrollTrigger: { trigger: ".zero", start: "top bottom", end: "bottom top", scrub: true } });

    /* Einzüge: Teile eines Abschnitts kommen nacheinander, nur Bewegung, keine Ausblendung */
    gsap.utils.toArray("[data-rise]").forEach(function (box) {
      gsap.from(box.children, { y: 28, duration: 0.9, ease: "power3.out", stagger: 0.075, scrollTrigger: { trigger: box, start: "top 88%", once: true } });
    });
    gsap.utils.toArray(".faq details").forEach(function (d, i) {
      gsap.from(d, { y: 22, duration: 0.7, ease: "power3.out", delay: (i % 7) * 0.05, scrollTrigger: { trigger: d, start: "top 92%", once: true } });
    });

    /* Abschluss: der Haken aus dem Logo zeichnet sich = Termin bestätigt */
    var check = document.querySelector(".finale .check");
    if (check && check.getTotalLength) {
      var len = check.getTotalLength();
      gsap.set(check, { strokeDasharray: len });
      gsap.fromTo(check, { strokeDashoffset: len }, { strokeDashoffset: 0, ease: "none", scrollTrigger: { trigger: ".finale", start: "top 80%", end: "top 30%", scrub: true } });
      gsap.fromTo(".finale .mark", { rotate: -8, scale: 0.92 }, { rotate: 0, scale: 1, ease: "none", scrollTrigger: { trigger: ".finale", start: "top 90%", end: "top 30%", scrub: true } });
    }
  });

  /* Desktop: Ablauf wird gepinnt und läuft waagerecht durch, Geräte drehen sich in 3D */
  mm.add("(min-width: 900px) and (prefers-reduced-motion: no-preference)", function () {
    if (!steps || !track) return;
    pinned = true;
    steps.classList.add("is-pinned");
    track.scrollLeft = 0;
    var devs = cards.map(function (c) { return c.querySelector(".device"); });
    var dist = function () { return Math.max(0, track.scrollWidth - document.documentElement.clientWidth); };
    function tilt3d() {
      var vw = window.innerWidth;
      for (var i = 0; i < cards.length; i++) {
        var r = cards[i].getBoundingClientRect();
        var off = clamp((r.left + r.width / 2 - vw / 2) / vw, -1, 1);
        devs[i].style.transform = "rotateY(" + (-off * 46).toFixed(2) + "deg) translateZ(" + (-Math.abs(off) * 140).toFixed(1) + "px)";
      }
    }
    var tw = gsap.to(track, {
      x: function () { return -dist(); }, ease: "none",
      scrollTrigger: {
        trigger: steps, start: "top 64px", end: function () { return "+=" + dist(); },
        pin: true, scrub: lenis ? true : 0.5, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: tilt3d, onRefresh: tilt3d
      }
    });
    tilt3d();
    return function () {
      pinned = false; steps.classList.remove("is-pinned");
      gsap.set(track, { clearProps: "transform" });
      devs.forEach(function (d) { d.style.transform = ""; });
      tw.kill(); stripTick();
    };
  });

  /* Kopfbereich neu vermessen, wenn Schrift geladen ist (Ursprung der Tinte = Handy) */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (window.TKInk) window.TKInk.remeasure(); ST.refresh(); });
  window.addEventListener("load", function () { ST.refresh(); });
})();
