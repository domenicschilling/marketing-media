/* prüfklar, Entwurf C. Ohne dieses Skript ist alles lesbar und scharf; es kommt nur Bewegung dazu. */
(function () {
  'use strict';
  var html = document.documentElement;
  var ruhig = false;
  try { ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  /* ---------- Die Sehtafel ---------- */
  var tafel = document.getElementById('tafel');
  var scharf = tafel.querySelector('.t-scharf');
  var kringel = tafel.querySelector('.t-kringel');
  var bild = tafel.querySelector('.tafel-bild');
  var la = document.getElementById('linse-a');
  var lb = document.getElementById('linse-b');
  var steg = document.getElementById('brille-steg');
  var b1 = document.getElementById('wahl-1');
  var b2 = document.getElementById('wahl-2');
  var lauf = 0;
  var groesse = 0;

  // Punkte des Ü in Tafel-Koordinaten (siehe Pfade in index.html)
  var PUNKT_A = [53.15 + 1.6 * 3.1, 39.2 - 1.25 * 3.1];
  var PUNKT_B = [53.15 + 4 * 3.1, 39.2 - 1.25 * 3.1];
  var PUNKT_R = 0.62 * 3.1;

  function masse() {
    var r = bild.getBoundingClientRect();
    var k = Math.min(r.width / 64, r.height / 78.5);
    var ox = (r.width - 64 * k) / 2 - 18 * k;
    var oy = (r.height - 78.5 * k) / 2;
    return {
      b: r.width, h: r.height, k: k,
      a: [PUNKT_A[0] * k + ox, PUNKT_A[1] * k + oy],
      c: [PUNKT_B[0] * k + ox, PUNKT_B[1] * k + oy],
      r: PUNKT_R * k
    };
  }
  function kreis(x, y, r) { return 'M' + (x - r) + ' ' + y + 'a' + r + ' ' + r + ' 0 1 0 ' + (2 * r) + ' 0a' + r + ' ' + r + ' 0 1 0 ' + (-2 * r) + ' 0Z'; }
  function zeigen(ax, ay, bx, by, r, ringe) {
    scharf.style.clipPath = 'path("' + kreis(ax, ay, r) + kreis(bx, by, r) + '")';
    // Beim Aufziehen auf die ganze Tafel verschwindet das Gestell, es bleibt nur die Klarheit.
    var m0 = groesse || (groesse = linsenMass(masse()));
    tafel.classList.toggle('ist-linse', ringe && r < m0 * 1.25);
    if (ringe) {
      la.setAttribute('cx', ax); la.setAttribute('cy', ay); la.setAttribute('r', r);
      lb.setAttribute('cx', bx); lb.setAttribute('cy', by); lb.setAttribute('r', r);
      var mx = (ax + bx) / 2, my = Math.min(ay, by) - r * 0.18;
      steg.setAttribute('d', 'M' + (ax + r * 0.96) + ' ' + (ay - r * 0.25) + 'Q' + mx + ' ' + (my - r * 0.25) + ' ' + (bx - r * 0.96) + ' ' + (by - r * 0.25));
    }
  }
  function sanft(t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function misch(a, b, t) { return a + (b - a) * t; }

  function stand(unscharf) {
    b1.setAttribute('aria-pressed', unscharf ? 'true' : 'false');
    b2.setAttribute('aria-pressed', unscharf ? 'false' : 'true');
  }
  function fertigScharf(mitKringel) {
    html.classList.remove('intro');
    tafel.classList.remove('ist-unscharf', 'ist-linse');
    scharf.style.clipPath = '';
    stand(false);
    if (mitKringel && !ruhig) {
      kringel.classList.remove('zeichnet');
      void kringel.getBoundingClientRect();
      kringel.classList.add('zeichnet');
    }
  }
  function abspielen(stationen, ende) {
    var id = ++lauf, start = null;
    function schritt(z) {
      if (id !== lauf) return;
      if (start === null) start = z;
      var t = z - start, i = 0;
      while (i < stationen.length - 2 && t > stationen[i + 1].t) i++;
      var s = stationen[i], n = stationen[i + 1];
      var f = Math.min(1, Math.max(0, (t - s.t) / (n.t - s.t)));
      f = sanft(f);
      zeigen(misch(s.ax, n.ax, f), misch(s.ay, n.ay, f), misch(s.bx, n.bx, f), misch(s.by, n.by, f), misch(s.r, n.r, f), true);
      if (t >= stationen[stationen.length - 1].t) { ende(); return; }
      requestAnimationFrame(schritt);
    }
    requestAnimationFrame(schritt);
  }
  function linsenMass(m) { return Math.min(m.b, m.h) * 0.205; }
  function endRadius(m) { return Math.sqrt(m.b * m.b + m.h * m.h) * 1.05; }

  function vorspann() {
    var m = masse();
    var r = linsenMass(m), mitte = m.b / 2, abst = r * 1.08;
    var obenY = m.h * 0.2, untenY = m.h * 0.78;
    abspielen([
      { t: 0, ax: m.a[0], ay: m.a[1], bx: m.c[0], by: m.c[1], r: m.r },
      { t: 260, ax: m.a[0], ay: m.a[1], bx: m.c[0], by: m.c[1], r: m.r },
      { t: 720, ax: mitte - abst, ay: obenY, bx: mitte + abst, by: obenY, r: r },
      { t: 1250, ax: mitte - abst, ay: untenY, bx: mitte + abst, by: untenY, r: r },
      { t: 1650, ax: mitte - abst, ay: m.h / 2, bx: mitte + abst, by: m.h / 2, r: endRadius(m) }
    ], function () { fertigScharf(true); });
  }

  // Letzte Linsenlage für das Spiel mit der Tafel
  var pos = null;
  function aufUnscharf() {
    lauf++;
    html.classList.remove('intro');
    kringel.classList.remove('zeichnet');
    tafel.classList.add('ist-unscharf');
    stand(true);
    var m = masse();
    var r = linsenMass(m);
    pos = { x: m.b / 2, y: m.h * 0.36, r: r };
    zeigen(pos.x - r * 1.08, pos.y, pos.x + r * 1.08, pos.y, r, true);
  }
  function aufScharf() {
    if (b2.getAttribute('aria-pressed') === 'true') return;
    if (ruhig || !pos) { pos = null; fertigScharf(false); return; }
    var m = masse();
    var d = pos.r * 1.08;
    var von = { t: 0, ax: pos.x - d, ay: pos.y, bx: pos.x + d, by: pos.y, r: pos.r };
    var nach = { t: 480, ax: pos.x - d, ay: pos.y, bx: pos.x + d, by: pos.y, r: endRadius(m) * 1.3 };
    pos = null;
    abspielen([von, nach], function () { fertigScharf(true); });
  }
  addEventListener('resize', function () { groesse = 0; });
  b1.addEventListener('click', aufUnscharf);
  b2.addEventListener('click', aufScharf);

  // Unscharf: Linsen folgen Finger oder Maus. Senkrecht scrollt die Seite weiter (touch-action: pan-y).
  var wartet = false, gx = 0, gy = 0;
  function folgen(e) {
    if (!pos || !tafel.classList.contains('ist-unscharf')) return;
    var r = bild.getBoundingClientRect();
    gx = e.clientX - r.left; gy = e.clientY - r.top;
    if (wartet) return;
    wartet = true;
    requestAnimationFrame(function () {
      wartet = false;
      if (!pos) return;
      pos.x = Math.max(0, Math.min(r.width, gx));
      pos.y = Math.max(0, Math.min(r.height, gy));
      var d = pos.r * 1.08;
      zeigen(pos.x - d, pos.y, pos.x + d, pos.y, pos.r, true);
    });
  }
  bild.addEventListener('pointermove', folgen);
  bild.addEventListener('pointerdown', folgen);

  if (html.classList.contains('intro')) {
    try { vorspann(); } catch (e) { fertigScharf(false); }
    // Sicherung: Die Tafel bleibt nie unscharf hängen, auch nicht in einem Hintergrund-Tab.
    setTimeout(function () { if (html.classList.contains('intro')) { lauf++; fertigScharf(false); } }, 4000);
  }

  /* ---------- Formular (Entwurf, kein echter Test) ---------- */
  var ergebnis = document.getElementById('ergebnis');
  var marke = ergebnis.querySelector('[data-adresse]');
  var ablage = document.createComment('ergebnis');
  ergebnis.parentNode.insertBefore(ablage, ergebnis);
  Array.prototype.forEach.call(document.querySelectorAll('form[data-test]'), function (f) {
    var feld = f.querySelector('input');
    var fehler = f.querySelector('.fehler');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var wert = feld.value.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
      if (!/^[^\s.]+(\.[^\s.]+)+$/.test(wert)) {
        fehler.textContent = 'Bitte geben Sie eine Adresse ein, zum Beispiel www.ihre-firma.de.';
        fehler.hidden = false;
        feld.setAttribute('aria-invalid', 'true');
        feld.setAttribute('aria-describedby', fehler.id + ' ' + feld.getAttribute('aria-describedby').split(' ').pop());
        feld.focus();
        return;
      }
      fehler.hidden = true;
      feld.removeAttribute('aria-invalid');
      feld.setAttribute('aria-describedby', feld.getAttribute('aria-describedby').split(' ').pop());
      marke.textContent = wert;
      // Das Beispiel erscheint direkt unter dem Formular, das gerade benutzt wurde.
      var unten = !!f.closest('.schluss');
      if (unten) { document.getElementById('schluss').appendChild(ergebnis); }
      else { ablage.parentNode.insertBefore(ergebnis, ablage); }
      ergebnis.classList.add('offen');
      ergebnis.focus({ preventScroll: true });
      ergebnis.scrollIntoView({ block: 'start', behavior: ruhig ? 'auto' : 'smooth' });
    });
  });

  /* ---------- Überschriften werden scharf, Leiste am Handy ---------- */
  if ('IntersectionObserver' in window) {
    if (!ruhig) {
      var beob = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.remove('weich'); beob.unobserve(e.target); }
        });
      }, { threshold: 0.2 });
      Array.prototype.forEach.call(document.querySelectorAll('[data-scharf]'), function (el) {
        var r = el.getBoundingClientRect();
        if (r.top > innerHeight) { el.classList.add('weich'); beob.observe(el); }
      });
    }
    var leiste = document.getElementById('leiste');
    var sichtbar = {};
    var leisteBeob = new IntersectionObserver(function (es) {
      es.forEach(function (e) { sichtbar[e.target.id || 'x'] = e.isIntersecting; });
      var an = false;
      for (var k in sichtbar) { if (sichtbar[k]) an = true; }
      leiste.classList.toggle('da', !an);
    });
    var f1 = document.getElementById('test');
    var f2 = document.getElementById('schluss');
    leisteBeob.observe(f1); leisteBeob.observe(f2);
  }
})();
