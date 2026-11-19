// Bewegung für die Video-Fassung (16.11.2026) – dezent, aber knackig.
// Wird von _system/video.cjs NACH crop.js eingeblendet. Erwartet window.MOTION = { motiv, kind, D, a: { t25, tSam, tJetzt } }.
// Alle Animationen nutzen nur opacity und die Einzel-Eigenschaften translate/scale/rotate (addieren sich zum
// vorhandenen CSS-transform, z. B. rotate(9deg) am Stern). Endzustand = neutral → letztes Bild = freigegebenes Standbild.
// Zeit wird von außen gesetzt: document.getAnimations().forEach(a => { a.pause(); a.currentTime = t*1000 }).
(function () {
  const M = window.MOTION || {};
  const D = M.D || 8.5;
  const END = D - 1.5; // spätestens hier steht alles still (≥ 1,5 s ruhiges Standbild)
  const a = Object.assign({ t25: 0.2, tSam: 3, tJetzt: 6 }, M.a || {});
  const $$ = (s) => [...document.querySelectorAll(s)];
  const ms = (s) => Math.round(s * 1000);
  const OUT = 'cubic-bezier(.16,1,.3,1)'; // weich auslaufend
  const clampT = (t, dur) => Math.max(0, Math.min(t, END - dur));

  // fill 'both' für Auftritte (vorher unsichtbar), 'forwards' für Zusatz-Bewegungen auf schon animierten Elementen
  function anim(sel, frames, t, dur, easing, fill = 'both') {
    t = clampT(t, dur);
    $$(sel).forEach((el) => el.animate(frames, { delay: ms(t), duration: ms(dur), fill, easing: easing || OUT }));
  }
  // rein schieben (dx/dy in px), mit kurzem Aufblenden
  const slide = (sel, t, dx, dy, dur = 0.5) =>
    anim(sel, [{ translate: `${dx}px ${dy}px`, opacity: 0 }, { opacity: 1, offset: 0.25 }, { translate: '0px 0px', opacity: 1 }], t, dur);
  // ploppen mit Überschwingen
  const pop = (sel, t, from = 0.2, dur = 0.55) =>
    anim(sel, [
      { scale: from, opacity: 0, easing: 'cubic-bezier(.2,.7,.4,1)' },
      { scale: 1.12, opacity: 1, offset: 0.5, easing: 'ease-in-out' },
      { scale: 0.97, offset: 0.78, easing: 'ease-in-out' },
      { scale: 1, opacity: 1 },
    ], t, dur, 'linear');
  // reinknallen: von groß auf 1, kurzer Rückfedern; sichtbar ab erstem Bild (opacity 1) wenn visible=true
  const slam = (sel, t, from = 1.6, dur = 0.38, visible = false) =>
    anim(sel, [
      { scale: from, opacity: visible ? 1 : 0, easing: 'cubic-bezier(.55,0,.9,.4)' },
      { scale: 0.94, opacity: 1, offset: 0.55, easing: 'cubic-bezier(.2,.8,.3,1)' },
      { scale: 1.02, offset: 0.8 },
      { scale: 1, opacity: 1 },
    ], t, dur, 'linear');
  // Band/Balken wischt von links rein
  const wipe = (sel, t, dur = 0.5) => anim(sel, [{ translate: '-1300px 0px' }, { translate: '0px 0px' }], t, dur, 'cubic-bezier(.2,.9,.2,1)');
  const grow = (sel, t, dur = 0.5) => anim(sel, [{ scale: '0 1' }, { scale: '1 1' }], t, dur);
  // leicht drehen + pulsieren, endet neutral
  const wiggle = (sel, t, dur = 1.6, deg = 4, sc = 1.05) =>
    anim(sel, [
      { rotate: '0deg', scale: 1 },
      { rotate: `${deg}deg`, scale: sc, offset: 0.22 },
      { rotate: `${-deg * 0.7}deg`, scale: 1, offset: 0.5 },
      { rotate: `${deg * 0.4}deg`, scale: 1 + (sc - 1) * 0.6, offset: 0.75 },
      { rotate: '0deg', scale: 1 },
    ], t, dur, 'ease-in-out', 'forwards');
  const pulse = (sel, t, dur = 0.6, sc = 1.06) => anim(sel, [{ scale: 1 }, { scale: sc, offset: 0.4 }, { scale: 1 }], t, dur, 'ease-in-out', 'forwards');
  // CTA: Balken schiebt hoch, Pfeil stupst so oft, wie bis END Platz ist
  function cta(t) {
    t = clampT(t, 1.2);
    slide('.cta', t, 0, 90, 0.45);
    slide('.bed', t + 0.25, 0, 24, 0.45);
    const t0 = t + 0.55, per = 0.6;
    const n = Math.max(1, Math.floor((END - t0) / per));
    $$('.cta i svg').forEach((el) => el.animate(
      [{ translate: '0px 0px' }, { translate: '16px 0px', offset: 0.3 }, { translate: '0px 0px', offset: 0.65 }, { translate: '0px 0px' }],
      { delay: ms(t0), duration: ms(per), iterations: n, fill: 'both', easing: 'ease-in-out' }));
  }
  // Foto: langsamer Ken-Burns 106 % → 100 % (endet exakt im Standbild-Ausschnitt), Drehpunkt = Mitte des Rahmens
  function kenburns() {
    $$('.ph img').forEach((img) => {
      const box = img.parentElement;
      const ox = -parseFloat(img.style.left || 0) + box.clientWidth / 2;
      const oy = -parseFloat(img.style.top || 0) + box.clientHeight / 2;
      img.style.transformOrigin = `${ox}px ${oy}px`;
      img.animate([{ scale: 1.06 }, { scale: 1 }], { duration: ms(END), fill: 'both', easing: 'cubic-bezier(.25,.1,.35,1)' });
    });
  }

  const story = M.kind === 'story';
  switch (M.motiv) {
    case '01-november': {
      kenburns();
      slam('.pct.big', 0, 1.12, 0.36, true); // −25 % ab Bild 1 (Startmaß ≤ 112 %, damit in Bild 0 nichts aus dem Rand ragt)
      pop('.logo', 0.12, 0.4, 0.45);
      slide('.kick', 0.25, -160, 0);
      slide('.real', 0.45, -160, 0);
      // Bedingung „Ab 150 € · mit Code“ kommt direkt mit der −25 % (Blickfang-Regel wie im Standbild)
      slide('.side .h', 0.2, 140, 0, 0.45);
      pop('.side .box', 0.4, 0.5, 0.45);
      if (story) { wipe('.band', a.tSam - 0.2); pulse('.band b', a.tSam + 0.55, 0.5, 1.04); }
      else { pop('.st', a.tSam - 0.25, 0.15, 0.6); wiggle('.st', a.tSam + 0.5, 1.6, 4, 1.05); }
      cta(Math.min(a.tJetzt - 0.6, D - 3.2));
      break;
    }
    case '03-bewertungen': {
      slam('.score', 0, 1.12, 0.36, true); // Hook „5,0“ ab Bild 1 (Startmaß ≤ 112 %)
      $$('.stars svg').forEach((el, i) => el.animate(
        [{ scale: 0, opacity: 0 }, { scale: 1.25, opacity: 1, offset: 0.6 }, { scale: 1, opacity: 1 }],
        { delay: ms(0.12 + i * 0.08), duration: 380, fill: 'both', easing: 'ease-out' }));
      pop('.logo', 0.1, 0.4, 0.45);
      slide('.kick', 0.2, -160, 0);
      slide('.meta .src', 0.45, 120, 0);
      slide('.meta .stand', 0.7, 0, 16, 0.4);
      // „UND JETZT: −25 %“ kommt früh (≈1,3 s), damit die untere Hälfte nicht lange leer ist – auch vor dem gesprochenen Wort
      grow('.rule', 0.8, 0.4);
      slide('.k2', 0.9, -120, 0, 0.4);
      slam('.pct.big', 1.05, 1.25, 0.36);
      slide('.side .h', 1.3, 140, 0, 0.4);
      pop('.side .box', 1.45, 0.5, 0.45);
      pulse('.pct.big', a.t25 - 0.05, 0.5, 1.05); // stupst, wenn „fünfundzwanzig“ gesprochen wird
      $$('.stars svg').forEach((el, i) => el.animate([{ scale: 1 }, { scale: 1.18, offset: 0.4 }, { scale: 1 }],
        { delay: ms(a.t25 + 1.5 + i * 0.07), duration: 420, fill: 'forwards', easing: 'ease-in-out' }));
      slide('.dl', a.tSam - 0.25, -220, 0, 0.45);
      cta(Math.min(a.tJetzt - 0.5, D - 3));
      break;
    }
    case '04-diese-woche': {
      // −25 % ist hier fast bildbreit: Drehpunkt unten Mitte und Startmaß 108 %, damit in Bild 0 nichts aus dem Rand ragt
      // und nichts über „NUR BIS SAMSTAG“ liegt
      $$('.pct.big').forEach((el) => { el.style.transformOrigin = '50% 80%'; });
      slam('.hl', 0, 1.04, 0.3, true);
      slam('.pct.big', 0.04, 1.08, 0.36, true); // −25 % ab Bild 1
      pop('.logo', 0.15, 0.4, 0.45);
      slide('.kick', 0.25, -160, 0);
      slide('.row .hl2', 0.25, -140, 0, 0.45);
      pop('.row .ab', 0.45, 0.5, 0.45);
      wipe('.band', a.t25 + 2.2);
      slide('.band b', a.t25 + 2.35, -80, 0, 0.5);
      slide('.next', a.t25 + 2.75, 0, 30, 0.45);
      pulse('.pct.big', a.t25 + 3.2, 0.55, 1.04);
      cta(Math.min(a.tJetzt - 0.5, D - 3));
      break;
    }
    case '05-augsburg': {
      kenburns();
      // Hook „AUGSBURG, ZUGREIFEN!“ ab Bild 0, Stern mit −25 % bis 0,8 s fertig
      slam('.hl span:first-child', 0, 1.12, 0.34, true);
      slam('.hl span:last-child', 0.04, 1.12, 0.34, true);
      pop('.st', 0.2, 0.3, 0.55);
      pop('.logo', 0.3, 0.4, 0.45);
      slide('.side .h', 0.45, 140, 0, 0.4);
      pop('.side .box:not(.ab)', 0.6, 0.5, 0.45);
      pop('.side .box.ab', 0.75, 0.5, 0.45);
      slide('.addr', 0.9, -160, 0);
      wiggle('.st', a.t25 - 0.05, 1.8, 4, 1.05); // dreht/pulsiert, wenn „fünfundzwanzig“ gesprochen wird
      pulse('.side .box:not(.ab)', a.tSam - 0.1, 0.5, 1.08); // „Sa 21.11.“ stupst, wenn „Samstag“ gesprochen wird
      cta(Math.min(a.tJetzt - 0.5, D - 3));
      break;
    }
  }
  document.getAnimations().forEach((x) => x.pause());
  document.documentElement.dataset.motion = '1';
})();
