// Zwei Dinge passieren hier: Motive werden "gestochen" (Schablone, dann Linie, dann Farbe),
// und aufgeklebte Abzüge lassen sich antippen. Ohne Skript ist alles fertig gestochen und lesbar.
(function () {
  var ruhig = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function schablone(svg) {
    if (svg.querySelector('.schablone')) return;
    var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'schablone');
    g.setAttribute('aria-hidden', 'true');
    Array.prototype.forEach.call(svg.children, function (k) {
      var c = k.cloneNode(true);
      Array.prototype.forEach.call(c.querySelectorAll('.f,.t,[id]'), function (n) { n.remove(); });
      if (c.matches && (c.matches('.f,.t') || c.id)) return;
      // Kopie ist nur Vorzeichnung: ohne Stechen-Klasse und ohne pathLength, sonst rechnet die Strichelung falsch
      var alle = [c].concat(Array.prototype.slice.call(c.querySelectorAll('*')));
      alle.forEach(function (n) { n.removeAttribute('pathLength'); if (n.classList) n.classList.remove('l'); });
      g.appendChild(c);
    });
    svg.insertBefore(g, svg.firstChild);
  }

  function vorbereiten(svg) {
    if (ruhig) return;
    schablone(svg);
    svg.classList.remove('los');
    svg.classList.add('vor');
  }

  function stechen(svg, verzug) {
    if (ruhig || svg.dataset.laeuft) return;
    svg.dataset.laeuft = '1';
    if (!svg.classList.contains('vor')) { vorbereiten(svg); void svg.getBoundingClientRect(); }
    setTimeout(function () {
      svg.classList.remove('vor');
      svg.classList.add('los');
      setTimeout(function () {
        svg.classList.remove('los');
        var s = svg.querySelector('.schablone');
        if (s) s.remove();
        delete svg.dataset.laeuft;
        svg.dataset.fertig = '1';
      }, 1100);
    }, verzug || 0);
  }

  // Erster Bildschirm: einmal nacheinander stechen
  var erste = document.querySelectorAll('.buehne svg.stech');
  Array.prototype.forEach.call(erste, function (s, i) { vorbereiten(s); stechen(s, 180 + i * 170); });

  // Weiter unten: einmal, wenn das Motiv ins Bild kommt
  var rest = document.querySelectorAll('.fall svg.stech, .stueck svg.stech');
  if (!ruhig && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { io.unobserve(e.target); stechen(e.target, 60); }
      });
    }, { threshold: 0.3 });
    Array.prototype.forEach.call(rest, function (s) { vorbereiten(s); io.observe(s); });
  }

  // Antippen: noch mal stechen
  Array.prototype.forEach.call(document.querySelectorAll('[data-stechen]'), function (b) {
    b.addEventListener('click', function () {
      var s = b.querySelector('svg.stech');
      if (s) stechen(s, 0);
    });
  });

  // Sprung über die Nummern: Zielmotiv wird beim Ankommen gestochen
  Array.prototype.forEach.call(document.querySelectorAll('.flash'), function (a) {
    a.addEventListener('click', function () {
      var ziel = document.querySelector(a.getAttribute('href'));
      var s = ziel && ziel.querySelector('svg.stech');
      if (s && s.dataset.fertig) setTimeout(function () { stechen(s, 0); }, 500);
    });
  });

  // Abzüge
  Array.prototype.forEach.call(document.querySelectorAll('[data-abzug]'), function (b) {
    b.addEventListener('click', function () {
      var f = b.closest('.abzug'), offen = f.classList.toggle('offen');
      b.setAttribute('aria-expanded', offen ? 'true' : 'false');
    });
  });

  // 10 Sekunden echte App-Aufnahme: erst beim Antippen laden und abspielen (kein Autoplay, kein Ton)
  var film = document.getElementById('film');
  Array.prototype.forEach.call(document.querySelectorAll('[data-film]'), function (b) {
    b.addEventListener('click', function () {
      if (!film || typeof film.showModal !== 'function') { location.href = '/assets/lp/zahlungslink.mp4'; return; }
      var box = film.querySelector('.film-box');
      var v = document.createElement('video');
      v.src = '/assets/lp/zahlungslink.mp4'; v.poster = '/assets/lp/zahlungslink-poster.webp';
      v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('muted', '');
      v.loop = true; v.controls = true; v.preload = 'none';
      v.setAttribute('aria-label', 'Aufnahme aus der Tattoofin-App: 2.000 Euro für Lena eintippen, Zahlungslink erstellen, so sieht ihn die Kundin. Beispieldaten.');
      box.innerHTML = ''; box.appendChild(v);
      film.showModal();
      var p = v.play(); if (p && p.catch) p.catch(function () {});
      try { if (window.umami) window.umami.track('video-play', { ort: b.closest('.auftakt') ? 'auftakt' : 'seite' }); } catch (x) {}
    });
  });
  if (film) {
    film.addEventListener('close', function () { var box = film.querySelector('.film-box'); if (box) box.innerHTML = ''; });
    film.addEventListener('click', function (e) { if (e.target === film) film.close(); });
  }

  // Leiste am Handy: erscheint, sobald kein „Jetzt starten“-Knopf der Seite im Bild ist; weg am Schluss und am Seitenende
  var leiste = document.getElementById('leiste');
  var knoepfe = document.querySelectorAll('main .knopf');
  var aus = [document.querySelector('.schluss'), document.querySelector('#anfrage'), document.querySelector('.fuss')];
  if (leiste && knoepfe.length && 'IntersectionObserver' in window) {
    var sichtbar = new Map(), ausDa = new Map();
    var pruefen = function () {
      var knopfDa = false, weg = false;
      sichtbar.forEach(function (v) { if (v) knopfDa = true; });
      ausDa.forEach(function (v) { if (v) weg = true; });
      leiste.classList.toggle('da', !knopfDa && !weg);
    };
    var ioKnopf = new IntersectionObserver(function (es) {
      es.forEach(function (e) { sichtbar.set(e.target, e.isIntersecting && getComputedStyle(e.target).display !== 'none'); });
      pruefen();
    });
    Array.prototype.forEach.call(knoepfe, function (k) { sichtbar.set(k, false); ioKnopf.observe(k); });
    var ioAus = new IntersectionObserver(function (es) {
      es.forEach(function (e) { ausDa.set(e.target, e.isIntersecting); });
      pruefen();
    });
    aus.forEach(function (el) { if (el) ioAus.observe(el); });
  }

  // Erster Bildschirm passend zur Anzeige (16.11.2026): nur Dachzeile, Überschrift, Unterzeile und Knopftext wechseln.
  // Kennung kommt aus utm_content der Meta-Anzeigen (tv-a No-Show, tv-b Rücken, tv-c 10 Sekunden, tv-d Weihnachten, bild-d2/d Anzahlung).
  (function () {
    var q = new URLSearchParams(location.search), u = (q.get('utm_content') || q.get('hero') || '').toLowerCase();
    var v = '';
    if (/(^|[^a-z])tv-?a([^a-z]|$)|^d$|bild-?d2?|no-?show|anzahlung/.test(u)) v = 'noshow';
    else if (/(^|[^a-z])tv-?c([^a-z]|$)|10-?sek|link/.test(u)) v = 'link';
    else if (/(^|[^a-z])tv-?d([^a-z]|$)|gutschein|weihnacht/.test(u)) v = new Date() < new Date('2026-12-25T00:00:00+01:00') ? 'gutschein' : 'link';
    var V = {
      noshow: { k: 'Termin geblockt, Kunde kommt nicht?', h: 'Erst Anzahlung. Dann Termin.', s: 'Anzahlungs-Link per WhatsApp. Kunde zahlt am Handy, dann blockst du den Termin.', c: 'Anzahlungen einrichten – 3\u00a0Min.',
        bild: '/assets/start/handy-anzahlung-oben.webp', alt: 'Echte Tattoofin-Zahlseite am Handy: Hi Kai, deine Zahlung an Ink Studio Bamberg, 150 Euro, Rückenstück, Termin Freitag, Anzahlung. Beispieldaten.' },
      link: { k: 'Schluss mit Überweisung und Hinterherschreiben.', h: 'Betrag rein. Link raus. Bezahlt.', s: 'Karte, Apple Pay, Google Pay oder Raten* über Klarna. Das Geld geht auf dein eigenes Stripe-Konto.' },
      gutschein: { k: 'Weihnachten kommt.', h: 'Gutscheine per Link verkaufen.', s: 'Kunde zahlt am Handy und bekommt Code und PDF zum Verschenken. Das Geld ist schon bei dir.', c: 'Gutscheine einrichten – 3\u00a0Min.' }
    }[v];
    var knopf = document.querySelector('.auftakt-knopf .knopf');
    if (knopf) knopf.setAttribute('data-umami-event-hero', v || 'ruecken');
    if (!V) return;
    var setze = function (sel, txt) { var el = document.querySelector(sel); if (el && txt) el.textContent = txt; };
    setze('[data-hero="k"]', V.k); setze('[data-hero="h"]', V.h); setze('[data-hero="s"]', V.s);
    if (knopf && V.c) knopf.textContent = V.c;
    if (V.bild) { var b = document.querySelector('.auftakt-handy img'); if (b) { b.src = V.bild; b.alt = V.alt; } }
    document.documentElement.setAttribute('data-hero', v);
  })();
})();
