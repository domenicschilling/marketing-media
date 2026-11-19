/* Tattoofin Entwurf A. Die Figur reagiert auf die Demo im Handy. */
(function () {
  "use strict";
  var ruhig = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* Einblenden: nur was unterhalb des ersten Bildschirms liegt, wartet. Ohne JS bleibt alles sichtbar. */
  $$(".tage i").forEach(function (el, i) { el.style.setProperty("--n", i); });
  if ("IntersectionObserver" in window && !ruhig) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.remove("warte"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -6% 0px" });
    $$("[data-in],[data-peek],[data-pop]").forEach(function (el) {
      if (el.getBoundingClientRect().top < window.innerHeight) return;
      var g = $$("[data-in]", el.parentNode), i = g.indexOf(el);
      el.style.setProperty("--d", Math.min(Math.max(i, 0), 4) * 70 + "ms");
      el.classList.add("warte");
      io.observe(el);
    });
  }

  /* Demo: Der Zustand hängt nur daran, welche Seite im Handy offen ist */
  var strip = $("#strip"), figur = $("#figur"), blase = $("#blase"), sonne = $("#sonne");
  var saetze = ["Tipp auf den Link!", "Jetzt zahlen!", "Daumen hoch!"];
  var jetzt = -1;
  function zustand(i) {
    if (i === jetzt) return;
    var vorher = jetzt; jetzt = i;
    blase.textContent = saetze[i];
    if (vorher >= 0 && !ruhig) { blase.classList.remove("neu"); void blase.offsetWidth; blase.classList.add("neu"); }
    figur.classList.toggle("warten", i !== 2);
    figur.classList.toggle("bezahlt", i === 2);
    if (i === 2 && !ruhig && sonne) { sonne.classList.remove("dreh"); void sonne.offsetWidth; sonne.classList.add("dreh"); }
  }
  function geh(i) {
    var b = strip.clientWidth;
    if (strip.scrollTo) strip.scrollTo({ left: i * b, behavior: ruhig ? "auto" : "smooth" });
    else strip.scrollLeft = i * b;
    zustand(i);
  }
  if (strip && figur) {
    zustand(0);
    var geplant = false, sperre = 0;
    strip.addEventListener("scroll", function () {
      if (geplant) return; geplant = true;
      requestAnimationFrame(function () {
        geplant = false;
        if (performance.now() < sperre) return;
        zustand(Math.round(strip.scrollLeft / strip.clientWidth));
      });
    }, { passive: true });
    $$("[data-go]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        sperre = performance.now() + 700; /* während des Wischens nicht zurückspringen */
        geh(+a.getAttribute("data-go"));
      });
    });
  }

  /* Formular ist Demo; die Figur reagiert auch hier */
  var form = $("#form"), fs = $("#figur-start");
  if (form) form.addEventListener("submit", function (e) {
    e.preventDefault();
    $("#form-status").textContent = "Demo: Nichts wurde gesendet oder gespeichert. Im echten Auftritt ginge es hier weiter zur Anmeldung.";
    if (fs) { fs.classList.remove("warten"); fs.classList.add("bezahlt"); }
  });

  /* Leiste weg, wenn das Formular offen ist */
  var leiste = $("#leiste"), start = $("#start");
  if (leiste && start && "IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      leiste.classList.toggle("weg-v", es[0].isIntersecting);
    }, { rootMargin: "0px 0px -35% 0px" }).observe(start);
  }
})();
