/* prüfklar, Entwurf A. Alles hier ist Zusatz: Ohne JavaScript bleibt die Seite vollständig lesbar. */
(function () {
  'use strict';
  var html = document.documentElement;
  var ruhig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (id) { return document.getElementById(id); };

  /* Linsen ---------------------------------------------------------- */
  var TEXTE = {
    unscharf: { kurz: 'Ohne Lesebrille: Große Schrift geht noch, kleine verschwimmt.', ansage: 'Demo an: Die Seite ist absichtlich unscharf, wie ohne Lesebrille.' },
    sonne: { kurz: 'In der Sonne: Alles Blasse ist weg.', ansage: 'Demo an: Die Seite ist absichtlich ausgeblichen, wie in der Sonne.' },
    rotgruen: { kurz: 'Mit Rot-Grün-Schwäche: Aus zwei Farben wird fast eine.', ansage: 'Demo an: Rot und Grün sind absichtlich angeglichen, wie bei einer Rot-Grün-Schwäche.' }
  };
  var leiste = $('linsenleiste');
  var ansage = $('ansage');
  var schalter = document.querySelectorAll('[data-linse]');
  var ausloeser = null;

  function setzeLinse(name, knopf) {
    if (name) {
      html.setAttribute('data-linse', name);
      $('linsen-text').textContent = TEXTE[name].kurz;
      leiste.hidden = false;
      ansage.textContent = TEXTE[name].ansage + ' Mit „Normal sehen“ oder der Escape-Taste wieder aus.';
      ausloeser = knopf || ausloeser;
    } else {
      html.removeAttribute('data-linse');
      leiste.hidden = true;
      ansage.textContent = 'Demo aus. Die Seite ist wieder normal.';
    }
    schalter.forEach(function (b) {
      if (b.dataset.linse === 'vorlesen') return;
      b.setAttribute('aria-pressed', String(b.dataset.linse === name));
    });
  }

  schalter.forEach(function (b) {
    b.addEventListener('click', function () {
      var name = b.dataset.linse;
      if (name === 'vorlesen') {
        setzeLinse(null);
        ansage.textContent = '';
        ausloeser = b;
        var d = $('schwarz');
        if (d.showModal) d.showModal(); else d.setAttribute('open', '');
        return;
      }
      setzeLinse(html.getAttribute('data-linse') === name ? null : name, b);
    });
  });

  $('scharf').addEventListener('click', function () {
    setzeLinse(null);
    if (ausloeser) ausloeser.focus({ preventScroll: true });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && html.hasAttribute('data-linse')) {
      setzeLinse(null);
      if (ausloeser) ausloeser.focus({ preventScroll: true });
    }
  });

  var schwarz = $('schwarz');
  $('schwarz-zu').addEventListener('click', function () {
    if (schwarz.close) schwarz.close(); else schwarz.removeAttribute('open');
  });
  schwarz.addEventListener('close', function () { if (ausloeser) ausloeser.focus({ preventScroll: true }); });

  /* Band zum Wischen ------------------------------------------------ */
  var band = $('band');
  var platten = band.querySelectorAll('.platte');
  var stand = $('band-stand');
  var zurueck = $('band-zurueck');
  var vor = $('band-vor');
  var aktuell = 0;

  function zeigeStand() {
    stand.textContent = 'Beispiel ' + (aktuell + 1) + ' von ' + platten.length;
    zurueck.disabled = aktuell === 0;
    vor.disabled = aktuell === platten.length - 1;
  }
  function geheZu(i) {
    var ziel = platten[i];
    if (!ziel) return;
    band.scrollTo({ left: ziel.offsetLeft - parseFloat(getComputedStyle(band.firstElementChild).paddingLeft), behavior: ruhig ? 'auto' : 'smooth' });
  }
  zurueck.addEventListener('click', function () { geheZu(aktuell - 1); });
  vor.addEventListener('click', function () { geheZu(aktuell + 1); });
  var laeuft = false;
  band.addEventListener('scroll', function () {
    if (laeuft) return;
    laeuft = true;
    requestAnimationFrame(function () {
      laeuft = false;
      var breite = platten[0].offsetWidth + 10;
      var maxLinks = band.scrollWidth - band.clientWidth;
      var i = band.scrollLeft >= maxLinks - 4 ? platten.length - 1 : Math.round(band.scrollLeft / breite);
      if (i !== aktuell) { aktuell = i; zeigeStand(); }
    });
  }, { passive: true });
  zeigeStand();
  /* Auf breiten Bildschirmen steht alles nebeneinander: dann ist das Band kein Tab-Halt */
  function bandHalt() {
    if (band.scrollWidth > band.clientWidth + 1) band.setAttribute('tabindex', '0'); else band.removeAttribute('tabindex');
  }
  bandHalt();
  window.addEventListener('resize', bandHalt, { passive: true });

  /* Überschriften rasten beim ersten Sehen scharf ein ---------------- */
  var fokus = document.querySelectorAll('[data-fokus]');
  if ('IntersectionObserver' in window && !ruhig) {
    var fo = new IntersectionObserver(function (einträge) {
      einträge.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('scharf'); fo.unobserve(e.target); }
      });
    }, { threshold: .2 });
    fokus.forEach(function (h) { fo.observe(h); });
  } else {
    fokus.forEach(function (h) { h.classList.add('scharf'); });
  }

  /* Haftender Knopf: nur wenn kein Testfeld im Bild ist -------------- */
  var haft = $('haft');
  if ('IntersectionObserver' in window) {
    var sichtbar = new Set();
    var gesehen = false;
    var ho = new IntersectionObserver(function (einträge) {
      einträge.forEach(function (e) {
        if (e.isIntersecting) { sichtbar.add(e.target); gesehen = true; } else { sichtbar.delete(e.target); }
      });
      haft.classList.toggle('an', gesehen && sichtbar.size === 0);
    });
    document.querySelectorAll('#test, .schluss, .fuss').forEach(function (f) { ho.observe(f); });
  }
  haft.addEventListener('click', function () {
    setTimeout(function () { $('adresse-oben').focus({ preventScroll: true }); }, ruhig ? 0 : 500);
  });

  /* Testformular: Vorführung, sendet nichts --------------------------- */
  function pruefeAdresse(wert) {
    var w = wert.trim();
    if (!w) return 'Bitte tragen Sie die Adresse Ihrer Website ein, zum Beispiel www.ihre-firma.de.';
    var ohne = w.replace(/^https?:\/\//i, '').split('/')[0];
    if (!/^[^\s.]+(\.[^\s.]+)+$/.test(ohne)) return 'Das sieht nicht wie eine Website-Adresse aus. Beispiel: www.ihre-firma.de.';
    return '';
  }

  document.querySelectorAll('form.test').forEach(function (form) {
    var feld = form.querySelector('input');
    var knopf = form.querySelector('button');
    var fehler = form.querySelector('.fehler');
    var platz = $(form.dataset.ergebnis);
    var knopfText = knopf.textContent;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var meldung = pruefeAdresse(feld.value);
      if (meldung) {
        fehler.textContent = meldung;
        fehler.hidden = false;
        feld.setAttribute('aria-invalid', 'true');
        feld.focus();
        return;
      }
      fehler.hidden = true;
      feld.removeAttribute('aria-invalid');
      knopf.disabled = true;
      knopf.textContent = 'Läuft …';
      ansage.textContent = 'Die Vorführung läuft.';

      setTimeout(function () {
        var inhalt = $('ergebnis-vorlage').content.cloneNode(true);
        inhalt.querySelector('.e-adresse').textContent = feld.value.trim();
        platz.textContent = '';
        platz.appendChild(inhalt);
        var kasten = platz.querySelector('.ergebnis');
        knopf.disabled = false;
        knopf.textContent = knopfText;
        kasten.focus({ preventScroll: true });
        kasten.scrollIntoView({ behavior: ruhig ? 'auto' : 'smooth', block: 'start' });
      }, ruhig ? 0 : 800);
    });
    feld.addEventListener('input', function () {
      if (!fehler.hidden) { fehler.hidden = true; feld.removeAttribute('aria-invalid'); }
    });
  });
})();
