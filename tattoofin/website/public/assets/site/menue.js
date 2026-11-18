// Handy-Menü: Escape schließt, Hintergrund scrollt nicht, Fokus bleibt im Menü, Link schließt. Ohne JS geht <details> trotzdem auf und zu.
(function () {
  var m = document.querySelector('.menue');
  if (!m) return;
  var s = m.querySelector('summary');
  function zu() { m.open = false; }
  m.addEventListener('toggle', function () {
    document.documentElement.classList.toggle('menue-offen', m.open);
    s.setAttribute('aria-expanded', m.open ? 'true' : 'false');
    if (m.open) { var a = m.querySelector('.menue-tafel a'); if (a) a.focus(); }
  });
  document.addEventListener('keydown', function (e) {
    if (!m.open) return;
    if (e.key === 'Escape') { zu(); s.focus(); return; }
    if (e.key !== 'Tab') return;
    var f = [s].concat([].slice.call(m.querySelectorAll('.menue-tafel a')));
    var i = f.indexOf(document.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
  });
  m.querySelectorAll('.menue-tafel a').forEach(function (a) { a.addEventListener('click', zu); });
})();
