/* Tattookalender · Entwurf B „Der Kalender füllt sich“
   Bewegung nur als Zusatz: Ohne dieses Skript (oder bei prefers-reduced-motion) ist jeder Inhalt sichtbar.
   GSAP 3.13 + ScrollTrigger (Standard-Lizenz, kostenlos), Lenis 1.3.11 (MIT, nur mit Maus/Trackpad). */
(function () {
  'use strict';
  var html = document.documentElement;
  var story = html.classList.contains('story');
  if (!window.gsap || !window.ScrollTrigger) { html.classList.remove('story'); return; }
  if (!story) return;

  window.__tkStory = true; // für den Rückfall im <head>
  var gsap = window.gsap, ST = window.ScrollTrigger;
  gsap.registerPlugin(ST);
  ST.config({ ignoreMobileResize: true });

  // Weiches Scrollen nur mit Maus/Trackpad; am Handy bleibt das native Scrollen (flüssig in Safari).
  if (window.Lenis && matchMedia('(pointer: fine)').matches) {
    var lenis = new window.Lenis({ lerp: 0.12, anchors: { offset: 0 } });
    lenis.on('scroll', ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  try { held(); abschnitte(); }
  catch (e) {
    // Bricht etwas ab, lieber alles flach und lesbar zeigen als halb animiert
    ST.getAll().forEach(function (t) { t.kill(true); });
    gsap.set('.kal, .karte, .detail, .detail-fuss, .stempel, .szene-fazit, .held-text, .dreh, .dreh > span, .app-bild', { clearProps: 'all' });
    html.classList.remove('story');
    return;
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ST.refresh(); });

  /* ---------- Kopfbereich: der Kalender richtet sich auf und füllt sich ---------- */
  function held() {
    var buehne = document.querySelector('.buehne');
    if (!buehne) return;
    var fix = buehne.querySelector('.buehne-fix');
    var text = buehne.querySelector('.held-text');
    var szene = buehne.querySelector('.szene');
    var kal = buehne.querySelector('.kal');
    var schleier = kal.querySelector('.kal-schleier');
    var detail = buehne.querySelector('.detail');
    var fuss = detail.querySelector('.detail-fuss');
    var stempel = detail.querySelector('.stempel');
    var fazit = buehne.querySelector('.szene-fazit');
    var neu = [].slice.call(kal.querySelectorAll('[data-neu]'));
    var tom = kal.querySelector('[data-tom]');
    var dreher = [].slice.call(detail.querySelectorAll('.dreh'));
    var tagMi = kal.querySelector('[data-heute]');
    var zTermine = kal.querySelector('[data-z="termine"]');
    var zAnz = kal.querySelector('[data-z="anz"]');
    var zEinw = kal.querySelector('[data-z="einw"]');

    // Zeitplan (Einheiten der Timeline)
    var T_NEU = 2.6, NEU_ABSTAND = 0.5, T_DETAIL = 5.4, T_ZURUECK = 9.2;
    var tomAnz = tom.querySelector('[data-art="anz"]'), tomEinw = tom.querySelector('[data-art="einw"]');
    var marken = [].slice.call(kal.querySelectorAll('.marke')).map(function (m) {
      var karte = m.closest('.karte');
      var i = neu.indexOf(karte);
      return { el: m, art: m.getAttribute('data-art'), da: i < 0 ? 0 : T_NEU + i * NEU_ABSTAND + 0.4, ok: 0 };
    });
    var rest = marken.filter(function (m) { return m.el !== tomAnz && m.el !== tomEinw; });
    rest.forEach(function (m, i) { m.ok = T_ZURUECK + 0.5 + i * 0.22; });
    marken.forEach(function (m) {
      if (m.el === tomAnz) m.ok = T_DETAIL + 2.0;
      if (m.el === tomEinw) m.ok = T_DETAIL + 2.6;
    });

    var letzt = {}, DREH_T = [];
    function drehe(i, an) {
      var d = dreher[i];
      gsap.to(d, { rotationX: an ? 180 : 0, duration: 0.55, ease: 'power2.inOut', overwrite: true });
      gsap.set(d.querySelector('.vorher'), { opacity: an ? 0 : 1, delay: 0.2 });
      gsap.set(d.querySelector('.nachher'), { opacity: an ? 1 : 0, delay: 0.2 });
    }
    function setze(el, schluessel, wert, gut) {
      if (letzt[schluessel] === wert) return;
      letzt[schluessel] = wert;
      el.textContent = wert;
      if (gut !== undefined) el.classList.toggle('gut', gut);
    }
    function zustand(t) {
      var termine = 4;
      neu.forEach(function (c, i) { if (t >= T_NEU + i * NEU_ABSTAND + 0.4) termine++; });
      var anz = 0, einw = 0;
      marken.forEach(function (m) {
        var ok = t >= m.ok;
        if (m.okZ !== ok) { m.el.classList.toggle('ok', ok); m.okZ = ok; }
        if (t >= m.da && !ok) { if (m.art === 'anz') anz++; else einw++; }
      });
      DREH_T.forEach(function (t0, i) {
        var an = t >= t0 + 0.2;
        if (letzt['d' + i] !== an) { if (letzt['d' + i] !== undefined || an) drehe(i, an); letzt['d' + i] = an; }
      });
      var best = t >= T_DETAIL + 1.4;
      if (letzt.best !== best) { tom.classList.toggle('bestaetigt', best); letzt.best = best; }
      setze(zTermine, 't', termine + ' Termine');
      if (letzt.n !== termine) { tagMi.style.setProperty('--n', termine); letzt.n = termine; }
      setze(zAnz, 'a', anz === 0 ? 'Anzahlungen bezahlt' : anz === 1 ? '1 Anzahlung offen' : anz + ' Anzahlungen offen', anz === 0);
      setze(zEinw, 'e', einw === 0 ? 'Einwilligungen vollständig' : einw === 1 ? '1 Einwilligung fehlt' : einw + ' Einwilligungen fehlen', einw === 0);
    }

    var mm = gsap.matchMedia();
    mm.add({ klein: '(max-width: 759px)', gross: '(min-width: 760px)' }, function (ctx) {
      var klein = ctx.conditions.klein;
      var schraeg = klein
        ? { rotationX: 26, rotationZ: -2, scale: 0.94, y: 0 }
        : { rotationX: 46, rotationZ: -5, scale: 0.9, y: 0 };
      var rand = klein ? 10 : 22;
      function kalOben() { return szene.offsetTop + kal.offsetTop; }
      function passt() {
        var platz = fix.clientHeight - rand - fazit.offsetHeight - (klein ? 18 : 30);
        return Math.min(1, platz / kal.offsetHeight);
      }
      // Oberkante des aufgerichteten Kalenders: auf hohen Handys mittig im freien Raum statt oben mit leerer Fläche darunter
      function oben() {
        var frei = fix.clientHeight - fazit.offsetHeight - (klein ? 18 : 30);
        return Math.max(rand, (frei - kal.offsetHeight * passt()) / 2);
      }
      function hoch() { return oben() - kalOben(); }

      gsap.set(neu, { opacity: 0, visibility: 'hidden', y: -30, z: 260, rotationX: -28 });
      var dAbstand = klein ? 26 : 70;
      function dY() { return oben() + dAbstand; }
      gsap.set(detail, { opacity: 0, visibility: 'hidden', transformPerspective: 1200, y: function () { return dY() + 60; }, z: -140, scale: 0.72, rotationX: 22 });
      gsap.set(fuss, { opacity: 0 });
      gsap.set(fazit, { opacity: 0, visibility: 'hidden', y: 18 });
      gsap.killTweensOf(dreher);
      gsap.set(dreher, { rotationX: 0 });
      dreher.forEach(function (d) { gsap.set(d.querySelector('.vorher'), { opacity: 1 }); gsap.set(d.querySelector('.nachher'), { opacity: 0 }); });
      letzt = {};

      var tl = gsap.timeline({
        defaults: { ease: 'none' },
        onUpdate: function () { zustand(tl.time()); },
        scrollTrigger: {
          trigger: buehne, start: 'top top', end: 'bottom bottom',
          scrub: klein ? 0.35 : 0.7, invalidateOnRefresh: true
        }
      });
      tl.fromTo(kal, schraeg, {
          rotationX: 0, rotationZ: 0, scale: passt, y: hoch, duration: 3, ease: 'power2.inOut'
        }, 0)
        .to(text, { y: function () { return -text.offsetHeight * 0.5; }, opacity: 0, duration: 2, ease: 'power1.in' }, 0)
        .to(neu, { autoAlpha: 1, y: 0, z: 0, rotationX: 0, duration: 1.1, stagger: NEU_ABSTAND, ease: 'power3.out' }, T_NEU)
        // Der Termin von Tom Meier hebt sich aus dem Kalender
        // Kalender tritt zurück wie hinter einem Dialog (Schleier statt Deckkraft am Text)
        .to(schleier, { opacity: 0.74, duration: 0.8 }, T_DETAIL)
        .to(detail, { autoAlpha: 1, y: dY, z: 70, scale: 1, rotationX: 0, duration: 1.1, ease: 'power3.out' }, T_DETAIL)
        ;
      // Die Status drehen zeitbasiert (nicht am Scroll), damit nie ein halb gedrehter, unlesbarer Chip stehen bleibt
      DREH_T = [T_DETAIL + 1.1, T_DETAIL + 1.65, T_DETAIL + 2.25];
      tl.to(fuss, { opacity: 1, duration: 0.3 }, T_DETAIL + 2.95)
        .fromTo(stempel, { scale: 2.4, rotation: -16, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.55, ease: 'back.out(2.2)' }, T_DETAIL + 2.95)
        // zurück in den Kalender, der Rest wird grün
        .to(detail, { autoAlpha: 0, y: function () { return dY() + 40; }, z: -220, scale: 0.6, duration: 0.8, ease: 'power2.in' }, T_ZURUECK)
        .to(schleier, { opacity: 0, duration: 0.8 }, T_ZURUECK)
        .to(fazit, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power2.out' }, T_ZURUECK + 1.2)
        .to({}, { duration: 0.9 });
      zustand(0);
      return function () { zustand(99); };
    });
  }

  /* ---------- Abschnitte: Teile steigen auf, App-Bilder richten sich auf, Status-Chips drehen ---------- */
  function abschnitte() {
    var mm = gsap.matchMedia();
    mm.add('all', function () {
      // Keine Einblend-Verschiebung für Textblöcke: sie überlagerte beim schnellen Wischen den Nachbarblock.
      // Bewegung tragen nur der Kopfbereich, die sich aufrichtenden App-Bilder und die drehenden Status.
      // App-Bilder liegen leicht schräg und richten sich beim Scrollen auf (das Kalenderblatt-Motiv)
      gsap.utils.toArray('.schritt-bild .app-bild, .funktionen-bild .app-bild').forEach(function (el) {
        gsap.fromTo(el, { rotationX: 22, y: 40, transformPerspective: 1000, transformOrigin: '50% 100%' }, {
          rotationX: 0, y: 0, ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 50%', scrub: true }
        });
      });
      // Problem: Rot und Orange drehen auf Grün
      gsap.utils.toArray('.problem-liste li').forEach(function (li) {
        ST.create({
          trigger: li, start: 'top 68%',
          onEnter: function () { li.classList.add('ok'); },
          onLeaveBack: function () { li.classList.remove('ok'); }
        });
      });
      // Abschluss: der Haken aus dem Logo zieht sich
      var zug = document.querySelector('.schluss-zeichen .check-zug');
      if (zug) {
        gsap.fromTo(zug, { strokeDashoffset: 80 }, {
          strokeDashoffset: 0, duration: 0.9, ease: 'power2.inOut',
          scrollTrigger: { trigger: '.schluss', start: 'top 75%', toggleActions: 'play none none reverse' }
        });
      }
      // Demo-Leiste am Handy zwischen Kopfbereich und Abschluss
      var leiste = document.querySelector('.leiste');
      if (leiste) {
        ST.create({
          trigger: '.problem', start: 'top 70%', endTrigger: '.schluss', end: 'top 85%',
          toggleClass: { targets: leiste, className: 'zeigen' }
        });
      }
    });
  }
})();
