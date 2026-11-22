/* Rechner, Beispiele, Formular. Der Rechner nutzt das Rechenmodell des Hebelpunkt-Terminals. */
(function () {
  'use strict';
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var WOCHEN = 46, FAKTOR = 0.8, VZA = 1600;
  var HEBEL = [
    { id: 'mail', n1: 'E-Mail sortieren', n2: ', Antworten vorschreiben', a: .45, s: 38, h: 14 },
    { id: 'ang', n1: 'Angebote vorbereiten', n2: '', a: .40, s: 45, h: 16 },
    { id: 'beleg', n1: 'Rechnungen erfassen', n2: ' und Belege ablegen', a: .70, s: 38, h: 10 },
    { id: 'tel', n1: 'Telefon annehmen', n2: ', Anliegen aufnehmen', a: .40, s: 38, h: 18 },
    { id: 'chat', n1: 'Standardfragen per Chat', n2: ' beantworten', a: .50, s: 38, h: 6 }
  ];
  function de(n, d) { return n.toLocaleString('de-DE', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function $(id) { return document.getElementById(id); }

  /* rows */
  var rowsEl = $('rows'), MAX = 40;
  HEBEL.forEach(function (x) {
    x.on = false; x.n = x.n1 + x.n2;
    var r = document.createElement('div'); r.className = 'hrow'; r.dataset.id = x.id;
    var tiles = ''; for (var i = 0; i < MAX; i++) tiles += '<i></i>';
    r.innerHTML =
      '<button type="button" class="lever" role="switch" aria-checked="false" aria-label="' + x.n + ' einbeziehen"><span class="lever__bar"></span><span class="lever__dot"></span></button>' +
      '<div class="hrow__main"><div class="hrow__top"><span class="hrow__n">' + x.n1 + '<span class="only-wide-i">' + x.n2 + '</span></span><output class="hrow__h"></output>' +
      '<button type="button" class="hrow__edit" aria-expanded="false" aria-label="Stunden ändern: ' + x.n + '"></button></div>' +
      '<div class="hrow__track" aria-hidden="true">' + tiles + '</div>' +
      '<div class="hrow__more"><input type="range" min="0" max="' + MAX + '" step="1" value="' + x.h + '" aria-label="Stunden pro Woche: ' + x.n + '">' +
      '<p class="hrow__f"></p></div></div>';
    rowsEl.appendChild(r);
    x.el = r; x.btn = r.querySelector('.lever'); x.tiles = [].slice.call(r.querySelectorAll('.hrow__track i'));
    x.out = r.querySelector('output'); x.f = r.querySelector('.hrow__f'); x.range = r.querySelector('input'); x.edit = r.querySelector('.hrow__edit');
    x.edit.addEventListener('click', function () {
      var open = !r.classList.contains('open');
      HEBEL.forEach(function (o) { if (o.el) { o.el.classList.remove('open'); o.edit.setAttribute('aria-expanded', 'false'); } });
      if (open) { r.classList.add('open'); x.edit.setAttribute('aria-expanded', 'true'); }
    });
    x.btn.addEventListener('click', function () { x.on = !x.on; touched = true; calc(); });
    x.range.addEventListener('input', function () { x.h = +x.range.value; touched = true; calc(); });
  });

  var oTiles = $('oTiles'), oSpans = [];
  for (var i = 0; i < 80; i++) { var s = document.createElement('i'); oTiles.appendChild(s); oSpans.push(s); }
  var shownWeek = 0, tw = 0, touched = false;

  function calc() {
    var year = 0, euro = 0, hours = 0;
    HEBEL.forEach(function (x) {
      var yr = x.h * WOCHEN * x.a * FAKTOR, wk = x.h * x.a * FAKTOR;
      x.btn.setAttribute('aria-checked', x.on);
      x.el.classList.toggle('on', x.on);
      x.out.textContent = x.h + ' Std./Woche';
      x.edit.textContent = x.h + ' Std.';
      x.f.textContent = x.h + ' × ' + WOCHEN + ' Wochen × ' + de(x.a * 100) + ' % × 0,8 = ' + de(yr) + ' Std./Jahr';
      var free = Math.round(wk);
      x.tiles.forEach(function (t, i) {
        var cl = i >= x.h ? 'x' : (x.on && i >= x.h - free ? 'a' : '');
        if (t.className !== cl) t.className = cl;
      });
      if (x.on) { year += yr; euro += yr * x.s; hours += x.h * WOCHEN * x.a; }
    });
    var week = year / WOCHEN;
    $('oYear').textContent = 'rund ' + de(Math.round(year / 10) * 10) + ' Std.';
    $('oEuro').textContent = 'rund ' + de(Math.round(euro / 100) * 100) + ' €';
    $('oVza').textContent = 'rund ' + de(year / VZA, 1);
    $('oSpan').textContent = de(Math.round(hours * .6 / 10) * 10) + ' bis ' + de(Math.round(hours / 10) * 10) + ' Std./Jahr';
    var wr = Math.round(week);
    oSpans.forEach(function (o, i) { var c = i < wr ? 'a' : ''; if (o.className !== c) o.className = c; });
    $('bWeek').textContent = wr;
    if (wr !== shownWeek) count(shownWeek, wr);
    shownWeek = wr;
    /* preset the enquiry with the visitor's own numbers */
    var on = HEBEL.filter(function (x) { return x.on; });
    $('toForm').dataset.msg = on.length ? 'Mein Schnellcheck: ' + on.map(function (x) { return x.n + ' (' + x.h + ' Std./Woche)'; }).join('; ') + '. Geschätzt rund ' + wr + ' Std./Woche frei.' : '';
  }
  function count(a, b) {
    var el = $('oWeek');
    if (reduced) { el.textContent = b; return; }
    cancelAnimationFrame(tw);
    var st = performance.now();
    (function f(t) { var k = Math.min(1, (t - st) / 380); el.textContent = Math.round(a + (b - a) * (1 - Math.pow(1 - k, 3))); if (k < 1) tw = requestAnimationFrame(f); })(st);
  }
  calc();

  /* the levers flip on their own the first time, one after the other */
  var tool = $('rechner');
  if ('IntersectionObserver' in window) {
    var flipped = false;
    new IntersectionObserver(function (es, ob) {
      if (!es[0].isIntersecting || flipped) return;
      flipped = true; ob.disconnect();
      HEBEL.forEach(function (x, i) {
        setTimeout(function () { if (!touched || i === 0) { x.on = true; calc(); } }, reduced ? 0 : 280 + i * 420);
      });
    }, { threshold: .25 }).observe(tool);
  } else { HEBEL.forEach(function (x) { x.on = true; }); calc(); }

  $('toForm').addEventListener('click', function () { carry(this.dataset.msg); });
  $('toolBar').addEventListener('click', function () { carry($('toForm').dataset.msg); });
  function carry(m) { var f = $('f-msg'); if (m && !f.value) { f.value = m; $('form').classList.add('more'); } }
  $('formMore').addEventListener('click', function () { $('form').classList.add('more'); $('f-mail').focus(); });

  /* phone: result bar only while the result itself is off screen */
  if ('IntersectionObserver' in window) {
    var bar = $('toolBar'), inTool = false, outVis = false;
    function upd() { bar.classList.toggle('show', inTool && !outVis); }
    new IntersectionObserver(function (e) { inTool = e[0].isIntersecting; upd(); }, { rootMargin: '-40% 0px -20% 0px' }).observe(rowsEl);
    new IntersectionObserver(function (e) { outVis = e[0].isIntersecting; upd(); }, { threshold: .15 }).observe($('out'));
  }

  /* examples */
  var tabs = [].slice.call(document.querySelectorAll('#tabs [role=tab]'));
  var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute('aria-controls')); });
  function show(idx, focus) {
    tabs.forEach(function (t, i) {
      var on = i === idx;
      t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1;
      panels[i].hidden = !on;
      panels[i].classList.remove('play', 'ok');
      if (on) { void panels[i].offsetWidth; panels[i].classList.add('play'); }
      panels[i].querySelector('.okbtn').textContent = 'Freigeben';
    });
    if (focus) tabs[idx].focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { show(i); });
    t.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); show((i + 1) % tabs.length, true); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); show((i + tabs.length - 1) % tabs.length, true); }
    });
  });
  document.querySelectorAll('.okbtn').forEach(function (b) {
    b.addEventListener('click', function () { var w = b.closest('.way'); w.classList.add('ok'); b.textContent = 'Freigegeben (Beispiel)'; });
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es, ob) { if (es[0].isIntersecting) { ob.disconnect(); show(0); } }, { threshold: .3 }).observe($('ablaeufe'));
  } else show(0);
  tabs.forEach(function (t, i) { t.tabIndex = i ? -1 : 0; });

  /* phones: long lists fold or swipe */
  var narrowNow = matchMedia('(max-width: 759px)').matches;
  if (narrowNow) {
    document.querySelectorAll('details[data-fold]').forEach(function (d) { d.open = false; });
    document.querySelectorAll('.swipe').forEach(function (el) { el.tabIndex = 0; });
  }

  /* bar colour over the page */
  var bars = [].slice.call(document.querySelectorAll('[data-bar]'));
  var root = document.documentElement;
  function barTheme() {
    var cur = null, bg = '', filmEl = document.querySelector('.film').getBoundingClientRect();
    /* the pinned stage is leaving: the bar gets its ground, nothing runs through it */
    if (filmEl.bottom < window.innerHeight + 1 && filmEl.bottom > 30) { root.dataset.bar = ''; root.dataset.bg = 'stage'; return; }
    for (var i = 0; i < bars.length; i++) { var r = bars[i].getBoundingClientRect(); if (r.top <= 30 && r.bottom > 30) { cur = bars[i].dataset.bar; bg = bars[i].dataset.bg; break; } }
    root.dataset.bar = cur || ''; root.dataset.bg = bg;
  }
  window.addEventListener('scroll', barTheme, { passive: true });
  barTheme();

  /* section entrances */
  if (!reduced && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll(narrowNow ? '.tool__head>*, .ways>h2, .ways__sub, .run>h2, .limits h2, .faq h2, .ask h2, .ask__sub' : '.tool__head>*, .ways>h2, .ways__sub, .run>h2, .stairs li, .term, .limits h2, .limits li, .faq h2, .faq details, .ask h2, .ask__sub').forEach(function (el, i) {
      el.classList.add('rise'); io.observe(el);
    });
  }
})();
