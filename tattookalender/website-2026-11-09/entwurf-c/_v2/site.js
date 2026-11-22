/* Tattookalender · Entwurf C "Tinte" · Fassung 2 · Bewegungsebene.
   Regel: Ohne dieses Skript ist die Seite vollständig (Ablauf = Liste). Bewegung nur über transform, Tintenwelle zusätzlich über clip-path. */
(function () {
  "use strict";
  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(pointer: fine)").matches;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var hasIO = "IntersectionObserver" in window;
  if (!reduce) root.classList.add("motion");

  /* ---- Bilder rechtzeitig holen: lazy-Bilder eines Abschnitts 1,5 Bildschirme vorher laden und dekodieren ---- */
  function wakeImgs(scope) { $$('img[loading="lazy"]', scope).forEach(function (img) { img.loading = "eager"; if (img.decode) img.decode().catch(function () {}); }); }
  function nearby(el, fn, margin) {
    if (!hasIO) { fn(); return; }
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); fn(); } }, { rootMargin: margin || "150% 0px 150% 0px" });
    io.observe(el);
  }
  $$(".desk, .finale").forEach(function (s) { nearby(s, function () { wakeImgs(s); }); });

  /* ---- Knöpfe: Tinte läuft von der Stelle des Mauszeigers in den Knopf ---- */
  $$(".btn").forEach(function (b) {
    b.addEventListener("pointerenter", function (e) {
      var r = b.getBoundingClientRect();
      b.style.setProperty("--mx", (e.clientX - r.left) + "px"); b.style.setProperty("--my", (e.clientY - r.top) + "px");
    }, { passive: true });
  });

  /* ---- Kopfleiste: beim Runterscrollen weg, beim Hochscrollen da ---- */
  var bar = $(".bar"), lastY = window.scrollY, barLock = false;
  function barTick() {
    var y = window.scrollY;
    if (barLock || (y > 140 && y > lastY + 4)) bar.classList.add("is-hidden");
    else if (y < lastY - 4 || y < 140) bar.classList.remove("is-hidden");
    lastY = y;
  }

  /* ---- Einzüge, Pinselstriche zwischen den Abschnitten, Problem-Zeilen ---- */
  if (!reduce && hasIO) {
    var once = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); once.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -12% 0px" });
    $$("[data-rise], .tiers, .seam").forEach(function (el) { once.observe(el); });
    var ink = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) e.target.classList.add("is-inked");
        else if (e.boundingClientRect.top > 0) e.target.classList.remove("is-inked");
      });
    }, { rootMargin: "0px 0px -24% 0px" });
    $$(".pain-list li").forEach(function (li) { ink.observe(li); });
  } else {
    $$("[data-rise], .tiers, .seam").forEach(function (el) { el.classList.add("is-in"); });
  }

  /* =====================================================================
     Ablauf als Scroll-Geschichte
     Handy/schmal: eigener Scrollbereich (100svh), je Station ein Einrastpunkt mit scroll-snap-stop: always
                   → ein Wisch = genau eine Station, auch bei schnellem Wischen.
     Desktop:      Bühne mit position: sticky, Stationen = Scrollstrecken; Lenis rastet sanft ein.
     ===================================================================== */
  var story = $(".story"), scroller = story && $(".story-scroller", story);
  var stations = story ? $$(".station", story) : [];
  var S = null; // Bühnen-Zustand
  var lenis = null;

  function buildStory() {
    var data = stations.map(function (li) {
      var img = $("img", li), ring = li.getAttribute("data-ring");
      return {
        title: $("h3", li).textContent, line: $(".station-text p", li).textContent,
        chips: $$(".chip", li).map(function (c) { return { cls: c.classList.contains("ok") ? "ok" : c.classList.contains("bad") ? "bad" : "warn", text: c.textContent }; }),
        src: img.getAttribute("src"), srcset: img.getAttribute("srcset"), alt: img.getAttribute("alt"),
        focus: parseFloat(li.getAttribute("data-focus") || "0"), ring: ring ? ring.split(",").map(Number) : null
      };
    });
    var n = data.length;
    var CHECK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5" pathLength="1" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    var WAVE = '<svg viewBox="0 0 400 140" preserveAspectRatio="none" aria-hidden="true"><path fill="#d4ad55" d="M0 34C40 22 70 40 110 30S180 36 220 28 300 38 340 30 385 30 400 26V64C380 70 370 66 352 70 350 92 344 104 338 104S330 90 330 72C300 76 280 68 250 72 246 84 242 90 238 90S232 82 232 73C200 76 170 66 140 70 138 100 132 118 126 118S118 100 118 72C90 74 70 66 40 70 38 80 34 86 30 86S24 78 24 70C14 70 6 68 0 66Z"/><path fill="#f0d48c" d="M0 38C40 27 70 44 110 35S180 40 220 33 300 42 340 35 385 34 400 31V39C380 42 360 40 340 43S260 38 220 42 150 44 110 43 40 36 0 46Z"/><circle cx="286" cy="96" r="4" fill="#d4ad55"/><circle cx="60" cy="102" r="3" fill="#d4ad55"/><circle cx="178" cy="92" r="2.5" fill="#d4ad55"/></svg>';
    var h = '<div class="stage-in">' +
      '<div class="st-prog" aria-hidden="true">' + data.map(function () { return "<i></i>"; }).join("") + '</div>' +
      '<div class="st-copy" aria-hidden="true">' +
        '<ol class="st-list">' + data.map(function (d) { return "<li>" + CHECK + "<span>" + d.title + "</span></li>"; }).join("") + '</ol>' +
        '<div class="st-stack st-cur">' + data.map(function (d) { return "<span>" + d.title + "</span>"; }).join("") + '</div>' +
        '<div class="st-stack st-lines">' + data.map(function (d) { return "<span>" + d.line + "</span>"; }).join("") + '</div>' +
      '</div>' +
      '<div class="st-visual">' +
        '<ul class="chips st-chips" data-ui aria-hidden="true">' + data[0].chips.map(function (c) { return '<li class="chip ' + c.cls + '">' + c.text + "</li>"; }).join("") + '</ul>' +
        '<div class="st-phone"><div class="tilt"><div class="device"><div class="screen">' +
          data.map(function (d, i) { return '<img data-src="' + d.src + '" data-srcset="' + d.srcset + '" sizes="(min-width: 900px) 420px, 82vw" width="780" height="1688" loading="lazy" decoding="async" alt="' + d.alt.replace(/"/g, "&quot;") + '"' + (i ? ' aria-hidden="true"' : ' class="on"') + ">"; }).join("") +
          '<span class="ring" aria-hidden="true"></span>' +
        '</div></div></div></div>' +
        '<div class="wave" aria-hidden="true">' + WAVE + '</div>' +
      '</div></div>';
    var stage = document.createElement("div");
    stage.className = "stage";
    stage.innerHTML = h;
    scroller.insertBefore(stage, scroller.firstChild);
    root.classList.add("story-live");
    story.classList.add("story-live");
    S = {
      n: n, data: data, stage: stage, cur: 0, tween: null,
      prog: $$(".st-prog i", stage), list: $$(".st-list li", stage), curs: $$(".st-cur span", stage), lines: $$(".st-lines span", stage),
      chips: $$(".st-chips .chip", stage), layers: $$(".screen img", stage), screen: $(".screen", stage), ring: $(".ring", stage),
      visual: $(".st-visual", stage), wave: $(".wave", stage), tilt: $(".st-phone .tilt", stage), phone: $(".st-phone", stage),
      mode: ""
    };
    // Bildschirme erst holen, wenn die Seite geladen ist und der Ablauf näher kommt (Schrift und Kopfbereich haben Vorrang)
    var wake = function () { nearby(story, function () { $$("img[data-src]", stage).forEach(function (img) { img.srcset = img.getAttribute("data-srcset"); img.src = img.getAttribute("data-src"); img.removeAttribute("data-src"); if (img.decode) img.decode().catch(function () {}); }); }, "120% 0px 120% 0px"); };
    if (document.readyState === "complete") wake(); else window.addEventListener("load", wake, { once: true });
    setText(0, 1); paintChips(0, false); setRing(0);
    setMode();
    window.addEventListener("resize", onResize, { passive: true });
  }

  var lastW = window.innerWidth, rz = 0;
  function onResize() {
    if (!fine && Math.abs(window.innerWidth - lastW) < 2) return; // iOS-Adressleiste
    lastW = window.innerWidth;
    clearTimeout(rz); rz = setTimeout(setMode, 120);
  }
  function setMode() {
    var nested = !fine || window.innerWidth < 900;
    var m = nested ? "nested" : "sticky";
    story.classList.toggle("is-nested", nested);
    story.classList.toggle("is-sticky", !nested);
    if (nested) {
      // eigener Scrollbereich: per Tastatur erreichbar (Pfeiltasten blättern Station für Station)
      scroller.setAttribute("data-lenis-prevent", ""); scroller.setAttribute("tabindex", "0");
      scroller.setAttribute("role", "region"); scroller.setAttribute("aria-label", "Ablauf in sechs Stationen, nach unten blättern");
    } else { ["data-lenis-prevent", "tabindex", "role", "aria-label"].forEach(function (a) { scroller.removeAttribute(a); }); }
    S.mode = m;
    // Bildausschnitt je Station: am Handy steht das Gerät unten in der Tinte, also das Wichtige nach oben schieben
    requestAnimationFrame(function () {
      var vis = S.phone.getBoundingClientRect(), scr = S.screen.getBoundingClientRect();
      var frac = scr.height ? clamp((vis.bottom - 64 - scr.top) / scr.height, 0.3, 1) : 1;
      S.data.forEach(function (d, i) {
        var pan = 0;
        if (nested && d.focus) pan = clamp(d.focus - frac * 62, 0, Math.max(0, (1 - frac) * 100 + 2));
        d.pan = pan;
        S.layers[i].style.setProperty("--pan", pan.toFixed(1));
      });
      setRing(S.cur);
      if (S.gate) S.gate();
      sync(true);
    });
  }

  function step() { return stations[0].offsetHeight || 1; }
  function indexNow() {
    var pos = S.mode === "nested" ? scroller.scrollTop : -scroller.getBoundingClientRect().top;
    return clamp(Math.round(pos / step()), 0, S.n - 1);
  }
  var syncRaf = 0;
  function sync(instant) {
    syncRaf = 0;
    if (!S) return;
    var i = indexNow();
    if (i !== S.cur) goTo(i, instant === true);
  }
  function setText(i, dir) {
    [S.curs, S.lines].forEach(function (els) { els.forEach(function (el, k) { el.classList.toggle("on", k === i); el.classList.toggle("was", k < i); }); });
    S.list.forEach(function (li, k) { li.classList.toggle("on", k === i); li.classList.toggle("done", k < i); });
    S.prog.forEach(function (p, k) { p.classList.toggle("on", k <= i); });
    if (S.mode === "sticky" && !reduce) {
      var ry = [-18, -8, -14, -6, -12, -3][i] || 0;
      S.tilt.style.transform = "rotateY(" + ry + "deg) rotateX(6deg)";
    } else S.tilt.style.transform = "";
  }
  function paintChips(i, animate) {
    S.chips.forEach(function (c, k) { flipChip(k, i, animate); });
  }
  function flipChip(k, i, animate) {
    var c = S.chips[k], want = S.data[i].chips[k];
    if (!c || !want) return;
    var changed = c.textContent !== want.text || !c.classList.contains(want.cls);
    if (!changed) return;
    c.className = "chip " + want.cls; c.textContent = want.text;
    if (animate) { void c.offsetWidth; c.classList.add("flip"); setTimeout(function () { c.classList.remove("flip"); }, 650); }
  }
  function setRing(i) {
    var d = S.data[i], r = S.ring;
    if (!d || !d.ring) { r.classList.remove("on"); return; }
    var pan = d.pan || 0, pad = 1.6;
    r.style.left = (d.ring[0] - pad) + "%"; r.style.width = (d.ring[2] - d.ring[0] + pad * 2) + "%";
    r.style.top = (d.ring[1] - pan - pad * 0.5) + "%"; r.style.height = (d.ring[3] - d.ring[1] + pad) + "%";
    r.classList.add("on");
  }
  function showLayer(i) {
    S.layers.forEach(function (l, k) {
      l.classList.toggle("on", k === i); l.classList.remove("in"); l.style.clipPath = ""; l.style.webkitClipPath = "";
      if (k === i) l.removeAttribute("aria-hidden"); else l.setAttribute("aria-hidden", "true");
    });
  }
  function finishWave() {
    if (!S.tween) return;
    var t = S.tween; S.tween = null; t.kill();
    showLayer(S.cur); paintChips(S.cur, true); setRing(S.cur);
    S.wave.style.visibility = "hidden";
  }
  function goTo(i, instant) {
    var from = S.cur, dir = i > from ? 1 : -1;
    if (S.tween) finishWave();
    S.cur = i;
    setText(i, dir);
    S.ring.classList.remove("on");
    if (instant || reduce || !window.gsap) { showLayer(i); paintChips(i, false); setRing(i); return; }
    var vis = S.visual.getBoundingClientRect(), scr = S.screen.getBoundingClientRect();
    var waveH = S.wave.offsetHeight, inc = S.layers[i];
    var chipY = S.chips.map(function (c) { var r = c.getBoundingClientRect(); return r.top + r.height / 2 - vis.top; });
    var flipped = S.chips.map(function () { return false; });
    inc.classList.add("in");
    S.wave.classList.toggle("down", dir < 0);
    S.wave.style.visibility = "visible";
    var o = { y: dir > 0 ? vis.height + 10 : -waveH - 10 };
    var y1 = dir > 0 ? -waveH - 10 : vis.height + 10;
    var scrTop = scr.top - vis.top, scrH = scr.height || 1;
    function upd() {
      S.wave.style.transform = "translate3d(0," + o.y.toFixed(1) + "px,0)";
      var band = o.y + waveH * (dir > 0 ? 0.34 : 0.66);
      var f = clamp((band - scrTop) / scrH, 0, 1);
      var cp = dir > 0 ? "inset(" + (f * 100).toFixed(2) + "% 0 0 0)" : "inset(0 0 " + ((1 - f) * 100).toFixed(2) + "% 0)";
      inc.style.clipPath = cp; inc.style.webkitClipPath = cp;
      for (var k = 0; k < chipY.length; k++) {
        if (!flipped[k] && (dir > 0 ? band < chipY[k] : band > chipY[k])) { flipped[k] = true; flipChip(k, i, true); }
      }
    }
    upd();
    S.tween = window.gsap.to(o, { y: y1, duration: 0.95, ease: "power2.inOut", onUpdate: upd, onComplete: finishWave });
  }

  if (story && scroller && stations.length && !reduce) {
    try { buildStory(); } catch (e) { if (window.console) console.warn("Ablauf:", e); }
    if (S) {
      scroller.addEventListener("scroll", function () { if (!syncRaf) syncRaf = requestAnimationFrame(sync); }, { passive: true });
      // Handy: Der Ablauf nimmt Wischgesten erst an, wenn er bündig oben steht. Bis dahin scrollt die Seite normal.
      // Bleibt die Seite in der Nähe stehen (kein Finger mehr auf dem Glas), zieht sie den Ablauf sanft bündig.
      var touching = false, settle = 0;
      window.addEventListener("touchstart", function () { touching = true; clearTimeout(settle); }, { passive: true });
      window.addEventListener("touchend", function () { touching = false; armSettle(); }, { passive: true });
      window.addEventListener("touchcancel", function () { touching = false; }, { passive: true });
      S.armSettle = armSettle;
      // Sprung über einen Menü-Link: nicht abfangen
      document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest('a[href^="#"]')) S.skipUntil = Date.now() + 1800; });
      function armSettle() {
        clearTimeout(settle);
        settle = setTimeout(function () {
          if (touching || S.mode !== "nested" || Date.now() < (S.skipUntil || 0)) return;
          var t = scroller.getBoundingClientRect().top, vh = window.innerHeight;
          if (Math.abs(t) > 2 && t > -vh * 0.42 && t < vh * 0.42) window.scrollTo({ top: window.scrollY + t, behavior: reduce ? "auto" : "smooth" });
        }, 160);
      }
      S.gate = function () {
        if (S.mode !== "nested") { scroller.style.overflowY = ""; barLock = false; S.prevTop = null; return; }
        var t = scroller.getBoundingClientRect().top;
        S.prevTop = t;
        var aligned = Math.abs(t) < 3;
        scroller.style.overflowY = aligned ? "auto" : "hidden";
        barLock = aligned;
      };
      S.gate();
    }
  }

  var winRaf = 0;
  window.addEventListener("scroll", function () {
    if (winRaf) return;
    winRaf = requestAnimationFrame(function () {
      winRaf = 0;
      if (S && S.gate) { S.gate(); if (S.mode === "nested") S.armSettle(); }
      barTick();
      if (S && S.mode === "sticky") sync();
    });
  }, { passive: true });

  /* ---- GSAP: scroll-gekoppelte Bewegungen (ohne GSAP bleibt alles stehen, Seite ist vollständig) ---- */
  if (!window.gsap || !window.ScrollTrigger || reduce) return;
  var gsap = window.gsap, ST = window.ScrollTrigger;
  gsap.registerPlugin(ST);
  ST.config({ ignoreMobileResize: true });

  /* Sanftes Scrollen nur mit Maus/Trackpad am Desktop; am Handy bleibt das native Scrollen (flüssig in Safari).
     Lenis wird nur dann überhaupt geladen. */
  if (fine && window.innerWidth >= 900) {
    var ls = document.createElement("script");
    ls.src = "lib/lenis-1.3.4/lenis.min.js"; ls.async = true;
    ls.onload = initLenis;
    document.head.appendChild(ls);
  }
  function initLenis() {
    if (!window.Lenis) return;
    lenis = new window.Lenis({ lerp: 0.12, wheelMultiplier: 1, prevent: function (node) { return node.hasAttribute && node.hasAttribute("data-lenis-prevent"); } });
    lenis.on("scroll", ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var id = a.getAttribute("href"), el = id.length > 1 ? document.querySelector(id) : document.body;
        if (!el) return; e.preventDefault(); lenis.scrollTo(el, { offset: id === "#top" ? 0 : -64, duration: 1.1 });
      });
    });
    // Ablauf am Desktop: nach dem Scrollen sanft auf die nächste Station einrasten
    var idle = 0;
    lenis.on("scroll", function () {
      clearTimeout(idle);
      idle = setTimeout(function () {
        if (!S || S.mode !== "sticky") return;
        var top = scroller.getBoundingClientRect().top, st = step(), pos = -top;
        if (pos < -st * 0.25 || pos > st * (S.n - 1) + st * 0.25) return;
        var target = clamp(Math.round(pos / st), 0, S.n - 1) * st, delta = target - pos;
        if (Math.abs(delta) > 3) lenis.scrollTo(window.scrollY + delta, { duration: 0.6, easing: function (x) { return 1 - Math.pow(1 - x, 3); } });
      }, 170);
    });
  }

  /* Kopfbereich: Handy steigt beim Scrollen weiter, die Neigung folgt am Desktop leicht der Maus */
  gsap.to(".hero-phone", { yPercent: -7, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  var heroTilt = $(".hero .tilt");
  if (heroTilt && fine) {
    var rx = gsap.quickTo(heroTilt, "rotationX", { duration: 0.8, ease: "power3.out" });
    var ry = gsap.quickTo(heroTilt, "rotationY", { duration: 0.8, ease: "power3.out" });
    gsap.set(heroTilt, { rotationX: 8, rotationY: -10, rotationZ: -2, transformPerspective: 0 });
    $(".hero").addEventListener("pointermove", function (e) {
      var nx = e.clientX / window.innerWidth - 0.5, ny = e.clientY / window.innerHeight - 0.5;
      rx(8 - ny * 10); ry(-10 + nx * 16);
    }, { passive: true });
  }

  /* Bildschirm klappt auf, während er ins Bild kommt */
  gsap.fromTo(".laptop-lid", { rotateX: 38 }, { rotateX: 0, ease: "none", scrollTrigger: { trigger: ".laptop", start: "top 95%", end: "top 40%", scrub: true } });

  /* Große Null wandert leicht gegen die Scrollrichtung */
  gsap.fromTo(".zero-num", { yPercent: 14 }, { yPercent: -10, ease: "none", scrollTrigger: { trigger: ".zero", start: "top bottom", end: "bottom top", scrub: true } });

  /* Abschluss: der Haken aus dem Logo zeichnet sich = Termin bestätigt */
  var check = $(".finale .check");
  if (check && check.getTotalLength) {
    var len = check.getTotalLength();
    gsap.set(check, { strokeDasharray: len });
    gsap.fromTo(check, { strokeDashoffset: len }, { strokeDashoffset: 0, ease: "none", scrollTrigger: { trigger: ".finale", start: "top 80%", end: "top 30%", scrub: true } });
    gsap.fromTo(".finale .mark", { rotate: -8, scale: 0.9 }, { rotate: 0, scale: 1, ease: "none", scrollTrigger: { trigger: ".finale", start: "top 90%", end: "top 30%", scrub: true } });
  }

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });
  window.addEventListener("load", function () { ST.refresh(); });
})();
