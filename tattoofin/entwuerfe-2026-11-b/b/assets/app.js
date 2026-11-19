// Studio bei Nacht: wenig Skript, alles funktioniert auch ohne.
(function () {
  var ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 1. Schritte antippen: Handy wechselt auf den echten Screen
  var knoepfe = document.querySelectorAll('.schritte button');
  var bilder = document.querySelectorAll('.handy--wechsel img');
  var wechsel = document.querySelector('.handy--wechsel');
  knoepfe.forEach(function (k) {
    k.addEventListener('click', function () {
      var n = k.dataset.schritt;
      knoepfe.forEach(function (b) {
        var an = b === k;
        b.setAttribute('aria-pressed', an ? 'true' : 'false');
        b.closest('li').classList.toggle('an', an);
      });
      bilder.forEach(function (b) { b.classList.toggle('an', b.dataset.schritt === n); });
      if (wechsel) wechsel.classList.toggle('quer', n === '3');
    });
  });

  // 2. Kabel von den Tattoos zu den Neon-Wegen
  var raum = document.querySelector('[data-kabel]');
  var kabel = raum && raum.querySelector('.kabel');
  function zeichnen() {
    if (!kabel) return;
    var r = raum.getBoundingClientRect();
    var pfade = '';
    raum.querySelectorAll('.ring').forEach(function (ring) {
      var ziel = document.getElementById(ring.dataset.ziel);
      if (!ziel) return;
      var z = (ziel.querySelector('.neon') || ziel).getBoundingClientRect();
      var a = ring.getBoundingClientRect();
      var x1 = a.left + a.width / 2 - r.left, y1 = a.bottom - r.top;
      var x2 = z.left + z.width / 2 - r.left, y2 = z.top - r.top - 2;
      var m = (y2 - y1) * 0.55;
      pfade += '<path d="M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + 'C' + x1.toFixed(1) + ' ' + (y1 + m).toFixed(1) + ' ' + x2.toFixed(1) + ' ' + (y2 - m).toFixed(1) + ' ' + x2.toFixed(1) + ' ' + y2.toFixed(1) + '"/>';
    });
    kabel.innerHTML = pfade;
  }
  zeichnen();
  addEventListener('resize', zeichnen);
  addEventListener('load', zeichnen);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(zeichnen);

  // 3. Jede Abschnitts-Röhre zündet einmal, wenn sie ins Bild kommt
  if (!ruhig && 'IntersectionObserver' in window) {
    var roehren = document.querySelectorAll('.neon[data-roehre]');
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.remove('aus');
        e.target.classList.add('zuendet');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px' });
    roehren.forEach(function (n) { n.classList.add('aus'); io.observe(n); });
  }
})();
