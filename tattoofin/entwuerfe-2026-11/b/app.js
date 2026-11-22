/* Tattoofin Entwurf B. Ohne JS ist alles lesbar. */
(function () {
  var ruhig = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Sticker klatschen einmal drauf, sobald sie in Sicht kommen ── */
  var slaps = [].slice.call(document.querySelectorAll('.slap'));
  if (ruhig || !('IntersectionObserver' in window)) {
    slaps.forEach(function (e) { e.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (ein) {
      ein.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } });
    }, { threshold: .01 });
    slaps.forEach(function (e) { io.observe(e); });
  }

  /* ── Beleg: echte Uhrzeit im Stempel ── */
  var box = document.getElementById('beleg-box'), zeit = document.getElementById('beleg-zeit');
  if (box && zeit) box.addEventListener('change', function () {
    var d = new Date();
    zeit.textContent = 'heute, ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ' Uhr';
  });

  /* ── Klebender Knopf: nur, wenn kein anderer Hauptknopf zu sehen ist.
        Über dem Zahlarten-Block nie, damit er den Pflichtsatz nicht verdeckt. ── */
  var stick = document.getElementById('stick');
  if (stick && 'IntersectionObserver' in window) {
    stick.hidden = false;
    var sicht = new Set(), bl = [document.querySelector('.hero-unten'), document.querySelector('.preis-rest .btn'), document.querySelector('.zahlarten'), document.getElementById('start'), document.querySelector('.fuss')];
    var bo = new IntersectionObserver(function (e) {
      e.forEach(function (x) { if (x.isIntersecting) sicht.add(x.target); else sicht.delete(x.target); });
      stick.classList.toggle('on', sicht.size === 0);
    });
    bl.forEach(function (x) { if (x) bo.observe(x); });
  }

  /* ── Formular-Demo ── */
  var form = document.getElementById('form');
  if (form) form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var ok = true;
    function pr(id, eid, gut) {
      var i = document.getElementById(id), m = document.getElementById(eid);
      i.setAttribute('aria-invalid', gut ? 'false' : 'true');
      if (gut) i.removeAttribute('aria-describedby'); else i.setAttribute('aria-describedby', eid);
      m.hidden = gut; if (!gut && ok) { i.focus(); ok = false; }
    }
    pr('f-studio', 'e-studio', document.getElementById('f-studio').value.trim().length > 1);
    pr('f-mail', 'e-mail', /^\S+@\S+\.\S+$/.test(document.getElementById('f-mail').value.trim()));
    document.getElementById('form-ok').hidden = !ok;
  });
})();
