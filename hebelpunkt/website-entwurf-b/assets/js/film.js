/* Hebelpunkt: die Vorführung. Jede Kachel ist eine Stunde der erfundenen Kessler Haustechnik.
   Stunden und frei werdende Stunden je Ablauf stammen aus dem Hebelpunkt-Rechenmodell (Szenario realistisch). */
(function () {
  'use strict';
  var stage = document.getElementById('stage'), film = stage.parentNode, cv = document.getElementById('c');
  var ctx = cv.getContext('2d', { alpha: false });
  var reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var stepMq = matchMedia('(pointer: coarse), (max-width: 759px)');
  var coarse = stepMq.matches;
  var INK = [15, 23, 32], PAPER = [245, 243, 238], AMBER = [245, 165, 36];
  var FONT = 'Archivo, "Helvetica Neue", Arial, sans-serif';

  var ROWS = [
    { n: 'Serviceberichte schreiben', h: 21, k: 9, t: [['Servicebericht', 'Anlage geprüft, von Hand'], ['Regiebericht', 'Baustelle, noch abtippen'], ['Bericht offen', 'seit Freitag im Auto'], ['Servicebericht', 'Foto fehlt noch']] },
    { n: 'Monteure einteilen', h: 20, k: 6, t: [['Disposition', 'Tour Dienstag umwerfen'], ['Notdienst', 'wer kann heute noch?'], ['Monteur krank', 'drei Termine verschieben'], ['Disposition', 'Fahrzeug 4 frei?']] },
    { n: 'Telefon, Rückrufnotizen', h: 18, k: 5, tel: 1, t: [['Anruf 08:12', 'Rückruf Frau M.'], ['Anruf 10:47', 'Heizung kalt, dringend'], ['Zettel', 'Herr B. bitte zurückrufen'], ['Anruf 13:05', 'in der Mittagspause verpasst'], ['Anruf 16:40', 'Termin verschieben?']] },
    { n: 'Angebote erstellen', h: 16, k: 5, t: [['Angebot', 'Bad, 8 qm, Kalkulation'], ['Angebot', 'Heizungstausch EFH'], ['Angebot', 'Positionen zusammensuchen'], ['Angebot', 'Altes Angebot finden']] },
    { n: 'info@-Postfach sortieren', h: 14, k: 5, t: [['Mail 07:58', 'Fwd: Rechnung anbei'], ['Mail 08:31', 'AW: Terminwunsch'], ['Mail 09:14', 'Anfrage Wärmepumpe'], ['info@', '63 ungelesen'], ['Mail 11:02', 'Reklamation Therme']] },
    { n: 'Eingangsrechnungen erfassen', h: 10, k: 6, t: [['Rechnung', 'Großhandel, 14 Positionen'], ['Rechnung', 'Abgleich mit Bestellung'], ['Rechnung', 'Skonto bis Freitag']] },
    { n: 'Ausgangsrechnungen schreiben', h: 9, k: 4, t: [['Rechnung raus', 'aus Servicebericht tippen'], ['Rechnung raus', 'Stunden nachfragen']] },
    { n: 'Wartungstermine vereinbaren', h: 8, k: 4, t: [['Wartung', 'Liste Oktober abtelefonieren'], ['Wartung', 'Erinnerung schreiben']] },
    { n: 'Material bestellen, AB abgleichen', h: 8, k: 3, t: [['Bestellung', 'Fittings, AB prüfen'], ['Lieferschein', 'passt nicht zur AB']] },
    { n: 'Kundendaten übertragen', h: 6, k: 4, t: [['Abtippen', 'Formular in Software'], ['Abtippen', 'Adresse aus Mail']] },
    { n: 'Infos, Ersatzteile suchen', h: 6, k: 2, t: [['Suche', 'Handbuch Therme, wo?'], ['Suche', 'Ersatzteil Baujahr 2009']] },
    { n: 'Aufmaß auswerten', h: 6, k: 0, t: [['Aufmaß', 'Skizze ins Reine bringen']] },
    { n: 'Stundenzettel abtippen', h: 4, k: 2, t: [['Stundenzettel', 'KW 42, unleserlich']] },
    { n: 'Fahrzeuglager prüfen', h: 4, k: 0, t: [['Lager', 'Bus 3 auffüllen']] },
    { n: 'Angebote nachfassen', h: 3, k: 1, t: [['Nachfassen', 'offen seit 9 Tagen']] },
    { n: 'Zahlungen abgleichen, mahnen', h: 3, k: 1, t: [['Mahnung', 'zweite Erinnerung']] },
    { n: 'Stellenanzeigen, Bewerbungen', h: 3, k: 1, t: [['Bewerbung', 'noch nicht geantwortet']] },
    { n: 'Monatsauswertung', h: 3, k: 1, t: [['Auswertung', 'Excel zusammenführen']] },
    { n: 'Social Media, Website', h: 2, k: 0, t: [['Website', 'Text müsste mal neu']] },
    { n: 'Google-Bewertungen', h: 1, k: 1, t: [['Bewertung', 'noch beantworten']] }
  ];
  var DIGITS = [
    '.#####.|#......|#......|#......|#......|######.|#.....#|#.....#|#.....#|#.....#|#.....#|.#####.',
    '.#####.|#.....#|#.....#|#.....#|#.....#|#.....#|#.....#|#.....#|#.....#|#.....#|#.....#|.#####.'
  ];

  /* deterministic random so that a reload looks the same way but stays messy */
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function sm(a, b, v) { var t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function eio(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function eout(t) { return 1 - Math.pow(1 - t, 3); }
  function eback(t) { var c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function mix(a, b, t) { return 'rgb(' + (a[0] + (b[0] - a[0]) * t | 0) + ',' + (a[1] + (b[1] - a[1]) * t | 0) + ',' + (a[2] + (b[2] - a[2]) * t | 0) + ')'; }
  function mix3(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

  /* tiles */
  var T = [];
  ROWS.forEach(function (r, ri) {
    for (var j = 0; j < r.h; j++) {
      var lab = r.t[j % r.t.length];
      T.push({
        row: ri, col: j, saved: j >= r.h - r.k, lab: lab, tel: !!r.tel,
        tint: rnd(), back: rnd() < .34 ? .3 + rnd() * .22 : 0, ph: rnd() * 6.28, ph2: rnd() * 6.28,
        dly: rnd(), ox: 0, oy: 0, vx: 0, vy: 0, ring: -9, S: [{}, {}, {}, {}, {}]
      });
    }
  });
  var N = T.length, ord = T.map(function (_, i) { return i; });
  for (var si = N - 1; si > 0; si--) { var sj = rnd() * (si + 1) | 0, st = ord[si]; ord[si] = ord[sj]; ord[sj] = st; }

  var W = 0, H = 0, dpr = 1, atlas = null, cw = 0, chh = 0, acols = 14, narrow = false;
  var L = {}; /* layout */

  function buildAtlas() {
    var tw = L.tw, th = L.th, sc = Math.min(2, Math.max(1.5, dpr));
    cw = Math.ceil(tw * sc); chh = Math.ceil(th * sc);
    atlas = document.createElement('canvas');
    atlas.width = cw * acols; atlas.height = chh * Math.ceil(N / acols);
    var a = atlas.getContext('2d');
    a.textBaseline = 'alphabetic';
    var f1 = Math.max(8, th * .25), f2 = Math.max(9.5, th * .33), pad = tw * .06;
    T.forEach(function (t, i) {
      var x = (i % acols) * cw, y = (i / acols | 0) * chh;
      a.setTransform(sc, 0, 0, sc, x, y);
      a.fillStyle = 'rgba(15,23,32,.62)';
      a.font = '500 ' + f1 + 'px ' + FONT;
      a.fillText(t.lab[0], pad, th * .4, tw - pad * 2);
      a.fillStyle = '#0F1720';
      a.font = '700 ' + f2 + 'px ' + FONT;
      a.fillText(t.lab[1], pad, th * .8, tw - pad * 2);
    });
    a.setTransform(1, 0, 0, 1, 0, 0);
  }

  function measure() {
    var sr = stage.getBoundingClientRect();
    W = stage.clientWidth; H = stage.clientHeight;
    narrow = W < 760;
    coarse = stepMq.matches;
    dpr = Math.min(window.devicePixelRatio || 1, narrow ? 2 : 1.75);
    if (L.lowDpr) dpr = Math.min(dpr, 1.25);
    cv.width = W * dpr; cv.height = H * dpr;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    function rect(el) { var r = el.getBoundingClientRect(); return { x: r.left - sr.left, y: r.top - sr.top, w: r.width, h: r.height, b: r.bottom - sr.top, r: r.right - sr.left }; }
    var m = narrow ? 16 : Math.min(32, W * .022);
    var h1 = rect(document.querySelector('#hero h1'));
    var base = rect(document.getElementById('base'));
    var leadR = rect(document.getElementById('lead')), readR = rect(document.getElementById('read')), tagR;
    /* the poster's note is longer than the hero's: reserve its real height */
    var wasAmber = stage.classList.contains('is-amber');
    stage.classList.add('is-amber'); tagR = rect(document.getElementById('tag'));
    if (!wasAmber) stage.classList.remove('is-amber');
    var barB = rect(document.getElementById('bar')).b;
    var caps = [].slice.call(document.querySelectorAll('.cap'));
    var capB = 0; caps.forEach(function (c) { capB = Math.max(capB, rect(c).b); });
    var logVisible = getComputedStyle(document.getElementById('log')).display !== 'none';
    var logR = logVisible ? rect(document.getElementById('log')) : null;
    var logEl0 = document.getElementById('log');

    L = { lowDpr: L.lowDpr, m: m, h1: h1, base: base, barB: barB, capB: capB };
    L.tw = narrow ? 92 : clamp(W * .104, 118, 158); L.th = Math.round(L.tw * (narrow ? .33 : .31));
    L.px = W * (narrow ? .22 : .24);
    L.pr = narrow ? 13 : 20;
    L.bw = narrow ? 6 : 9;
    L.py0 = leadR.y - 2 * L.pr - L.bw - 6;         /* pivot, hero */
    L.py1 = readR.y - 2 * L.pr - L.bw - 4;         /* pivot, acts */
    L.py2 = tagR.y - 2 * L.pr - L.bw - 4;          /* pivot, poster */
    L.ang0 = -(narrow ? 9.5 : 5.2) * Math.PI / 180;
    L.ang1 = -1.1 * Math.PI / 180;
    L.ang2 = (narrow ? 3.2 : 1.7) * Math.PI / 180;

    seed = 11;
    /* S0: the pile, resting on the beam */
    T.forEach(function (t) {
      var x, y, tries = 0, tw = L.tw, th = L.th;
      do {
        x = m * .2 + rnd() * (W - m * .4);
        var by = L.py0 + (x - L.px) * Math.tan(L.ang0);
        var top = barB + 6;
        var u = Math.pow(rnd(), 1.45);
        y = by - th * .95 - u * Math.max(20, by - top - th * 1.2);
        tries++;
      } while (tries < 60 && x + tw * .5 > h1.x && x - tw * .5 < h1.r && y - th * .7 < h1.b + 6 && y + th * .7 > h1.y - 6);
      if (y - th < h1.b + 6 && x - tw * .5 < h1.r) y = h1.b + th * .9 + rnd() * 30;
      t.S[0] = { x: x, y: y, w: tw * (.9 + t.tint * .2), h: th * (.9 + t.tint * .2), r: (rnd() - .5) * (narrow ? .7 : .62) };
    });

    /* S1: the wall */
    if (logR) {
      var tipY = L.py1 + (W - L.px) * Math.tan(L.ang1);
    }
    var zT = capB + (narrow ? 10 : 14), zB = L.py1 - (narrow ? 22 : 26);
    var zL = m, zR = logR ? logR.x - 24 : W - m;
    var zw = zR - zL, zh = zB - zT;
    var cols = Math.max(4, Math.round(Math.sqrt(N * (zw / zh) / 2.8))), rowsN = Math.ceil(N / cols);
    var cellW = zw / cols, cellH = zh / rowsN;
    var slots = ord.slice();
    slots.forEach(function (ti, s) {
      var c = s % cols, r = s / cols | 0;
      T[ti].S[1] = { x: zL + c * cellW + cellW / 2, y: zT + r * cellH + cellH / 2, w: cellW - 3, h: cellH - 3, r: 0 };
    });

    /* S2/S3: the rows */
    L.rows = [];
    if (!narrow) {
      var pitch = zh / 20, showLabels = pitch >= 10.5;
      var labW = showLabels ? Math.min(290, Math.max(W * .22, 205)) : 0, barX = zL + labW, unit = (zR - barX - 56) / 21;
      ROWS.forEach(function (r, ri) {
        L.rows.push({ n: showLabels ? r.n : '', h: r.h, k: r.k, lx: zL, ly: zT + ri * pitch + pitch / 2, nx: barX + r.h * unit + 8, fs: Math.min(clamp(pitch * .64, 10.5, 15), labW / 16.5 || 10) });
      });
      T.forEach(function (t) {
        var s = { x: barX + t.col * unit + unit / 2, y: zT + t.row * pitch + pitch / 2, w: unit - 2, h: pitch - 3, r: 0 };
        t.S[2] = s; t.S[3] = s;
      });
    } else {
      /* phone: seven biggest rows, the rest as one block with its saved hours at the end */
      var unitN = (W - 2 * m) / 21, groupStart = 7;
      var groupH = ROWS.slice(groupStart).reduce(function (a, r) { return a + r.h; }, 0);
      var groupK = ROWS.slice(groupStart).reduce(function (a, r) { return a + r.k; }, 0);
      var lines = Math.ceil(groupH / 21);
      var units = 7 * 1 + lines;           /* bar lines */
      var labelH = zh < 300 ? 13 : 16, rowGap = zh < 300 ? 3 : 7, fsN = zh < 300 ? 11.5 : 12.5;
      var tH = clamp((zh - 8 * labelH - 7 * rowGap - 2 * lines) / units, 4, 14);
      var yy = zT, gi = 0;
      var groupTiles = T.filter(function (t) { return t.row >= groupStart; }).sort(function (a, b) { return a.saved - b.saved; });
      ROWS.slice(0, groupStart).forEach(function (r, ri) {
        L.rows.push({ n: r.n, h: r.h, k: r.k, lx: m, ly: yy + labelH / 2 - 1, nr: W - m, fs: fsN });
        T.forEach(function (t) {
          if (t.row !== ri) return;
          var s = { x: m + t.col * unitN + unitN / 2, y: yy + labelH + tH / 2, w: unitN - 1.5, h: tH, r: 0 };
          t.S[2] = s; t.S[3] = s;
        });
        yy += labelH + tH + rowGap;
      });
      L.rows.push({ n: '13 weitere Abläufe', h: groupH, k: groupK, lx: m, ly: yy + labelH / 2 - 1, nr: W - m, fs: fsN });
      groupTiles.forEach(function (t, gi) {
        var c = gi % 21, l = gi / 21 | 0;
        var s = { x: m + c * unitN + unitN / 2, y: yy + labelH + l * (tH + 2) + tH / 2, w: unitN - 1.5, h: tH, r: 0 };
        t.S[2] = s; t.S[3] = s;
      });
    }

    /* S4: the numeral. 60 freed hours draw the number 60. */
    var poster = document.getElementById('poster');
    var barH = barB;
    var maxW = narrow ? W - 2 * m : W * .54;
    var postH = rect(poster).h;
    var maxH = narrow ? Math.min(H * .38, L.py2 - barH - postH - 22) : L.py2 - barH - 30;
    var cell = Math.floor(Math.min(maxW / 16, maxH / 12));
    var nx = m, ny = barH + (narrow ? 6 : 12);
    stage.style.setProperty('--num-b', (ny + 12 * cell) + 'px');
    stage.style.setProperty('--num-r', (nx + 16 * cell) + 'px');
    var cells = [];
    DIGITS.forEach(function (d, di) {
      d.split('|').forEach(function (line, ry) {
        for (var cx = 0; cx < 7; cx++) if (line[cx] === '#') cells.push({ x: nx + (cx + di * 9) * cell + cell / 2, y: ny + ry * cell + cell / 2 });
      });
    });
    L.cells = cells; L.cell = cell; L.hover = -1; L.cellRow = [];
    var saved = T.filter(function (t) { return t.saved; }), kept = T.filter(function (t) { return !t.saved; });
    saved.forEach(function (t, i) { var q = cells[(i * 37) % 60]; L.cellRow[(i * 37) % 60] = ROWS[t.row].n; t.S[4] = { x: q.x, y: q.y, w: cell - 2, h: cell - 2, r: 0 }; });
    /* kept hours: 15 x 7 grid inside the poster placeholder */
    var rb = rect(document.getElementById('rest'));
    var gw = rb.w, gc = 15, gu = gw / gc, gr = 7;
    kept.forEach(function (t, i) {
      t.S[4] = { x: rb.x + (i % gc) * gu + gu / 2, y: rb.y + (i / gc | 0) * gu * .62 + gu * .31, w: gu - 2, h: gu * .62 - 2, r: 0 };
    });
    L.diag = Math.hypot(Math.max(L.px, W - L.px), Math.max(L.py2, H - L.py1)) + 60;
    buildAtlas();
    runwaySync();
  }

  /* playhead */
  var p = reduced ? 0 : 0, target = 0, lastY = window.scrollY, qAct = 0, filmTop = 0, run = 1, inView = true;
  var snaps = [];
  function runwaySync() {
    filmTop = film.getBoundingClientRect().top + window.scrollY; run = film.offsetHeight - stage.offsetHeight;
    if (!coarse || reduced) return;
    if (!snaps.length) for (var i = 0; i <= 4; i++) { var d = document.createElement('i'); d.className = 'snap'; film.appendChild(d); snaps.push(d); }
    snaps.forEach(function (d, i) { d.style.top = (run * .9 * i / 4) + 'px'; });
  }
  function noSnap(on) { document.documentElement.classList.toggle('no-snap', on); }
  function readScroll() {
    var y = window.scrollY, raw = clamp((y - filmTop) / run, 0, 1), prog = Math.min(4, raw * 4 / .9);
    if (coarse || reduced) {
      /* one swipe = one complete step */
      var dir = y - lastY;
      if (dir > 0 && prog > qAct + .25) qAct = Math.min(4, Math.ceil(prog - .25));
      else if (dir < 0 && prog < qAct - .25) qAct = Math.max(0, Math.floor(prog + .25));
      target = qAct;
    } else target = prog;
    lastY = y;
  }

  /* captions and text */
  var capsEls = [].slice.call(stage.querySelectorAll('[data-act]')).map(function (el) {
    var a = +el.dataset.act; return { el: el, a: a, last: -1 };
  });
  var heroEl = document.getElementById('hero'), leadEl = document.getElementById('lead'), readEl = document.getElementById('read');
  var logEl = document.getElementById('log'), logLines = [].slice.call(logEl.querySelectorAll('[data-p]')).map(function (s) { return { el: s, p: +s.dataset.p, on: false }; });
  var hEl = document.getElementById('handle'), hT = document.getElementById('handleT');
  var tip = document.getElementById('hourtip');
  var rOff = document.getElementById('rOff'), rFree = document.getElementById('rFree'), rO = 165, rF = 0, amberOn = false;

  function setA(c, v, dy) {
    if (Math.abs(c.last - v) < .004) return;
    c.last = v;
    c.el.style.opacity = v;
    if (!c.keepVisible) c.el.style.visibility = v < .01 ? 'hidden' : 'visible';
    c.el.style.transform = dy ? 'translate3d(0,' + (dy * (1 - v)).toFixed(1) + 'px,0)' : '';
  }
  var heroC = { el: heroEl, last: -1, keepVisible: true }, leadC = { el: leadEl, last: -1 }, readC = { el: readEl, last: -1 }, logC = { el: logEl, last: -1 };
  function syncText() {
    setA(heroC, 1 - sm(.04, .3, p), -30);
    setA(leadC, 1 - sm(.04, .22, p), 0);
    setA(readC, sm(.25, .45, p) * (1 - sm(3.4, 3.6, p)), 0);
    setA(logC, sm(.05, .2, p) * (1 - sm(3.02, 3.25, p)), 0);
    capsEls.forEach(function (c) {
      var v;
      if (c.a === 4) v = sm(3.62, 3.92, p);
      else if (c.a === 1) v = sm(.28, .55, p) * (1 - sm(1.2, 1.42, p));
      else if (c.a === 2) v = sm(1.38, 1.62, p) * (1 - sm(2.2, 2.42, p));
      else v = sm(2.38, 2.62, p) * (1 - sm(3.02, 3.22, p));
      setA(c, v, c.a === 4 ? 26 : 22);
    });
    logLines.forEach(function (l) { var on = p >= l.p; if (on !== l.on) { l.on = on; l.el.classList.toggle('on', on); } });
    var am = p > 3.42;
    if (am !== amberOn) { amberOn = am; stage.classList.toggle('is-amber', am); document.documentElement.classList.toggle('bar-ink', am); }
    if (p < 3.9 && !tip.hidden) { tip.hidden = true; L.hover = -1; }
    document.documentElement.style.setProperty('--lever', (lerp(26, 12, sm(0, 4, p))).toFixed(1) + 'deg');
  }

  /* beam */
  var wob = 0, wobV = 0;
  function beamAngle() {
    var a;
    if (p < 1) a = lerp(L.ang0, L.ang1, eio(clamp(p, 0, 1)));
    else if (p < 3) a = L.ang1;
    else {
      var t = clamp((p - 3) / .28, 0, 1);
      a = lerp(L.ang1, L.ang2, eback(t));
      a = lerp(a, 0, eio(clamp((p - 3.45) / .55, 0, 1)));
    }
    return a + wob;
  }

  /* pointer */
  var mx = -999, my = -999;
  stage.addEventListener('pointermove', function (e) { if (e.pointerType === 'touch') return; var r = stage.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; }, { passive: true });
  stage.addEventListener('pointerleave', function () { mx = my = -999; });

  /* intro */
  var t0 = null, introDur = reduced ? 0 : 1500, nextRing = 2.2;

  function frame(tMs) {
    if (t0 === null) t0 = tMs;
    var dt = Math.min(.05, (tMs - (frame.lt || tMs)) / 1000); frame.lt = tMs;
    var now = (tMs - t0) / 1000;
    perf(dt);
    /* playhead */
    if (reduced) p = target;
    else if (coarse) { var dir = target - p, stepV = 1.15 * dt; p = Math.abs(dir) <= stepV ? target : p + Math.sign(dir) * stepV; }
    else p += (target - p) * (1 - Math.exp(-dt * 7));
    if (Math.abs(target - p) < .0004) p = target;

    /* idle in the poster: stop drawing */
    var ambient = p < .5 && !reduced;
    var settled = !ambient && p === target && now * 1000 > introDur + 300 && Math.abs(wobV) < .0005 && Math.abs(wob) < .0005;
    if (settled && frame.drawnAt === p) { if (inView) requestAnimationFrame(frame); else raf = 0; return; }

    /* beam wobble spring */
    wobV += (-wob * 60 - wobV * 9) * dt; wob += wobV * dt;
    render(now);
    syncText();
    frame.drawnAt = p;
    if (inView) requestAnimationFrame(frame); else raf = 0;
  }

  function tileState(t, i, now) {
    var a, b, l, s;
    if (p <= 0) { return t.S[0]; }
    if (p >= 4) return t.S[4];
    var seg = p < 1 ? 0 : p < 2 ? 1 : p < 3 ? 2 : 3, f = p - seg;
    a = t.S[seg]; b = t.S[seg + 1];
    if (seg === 0) { l = clamp((f - a.x / W * .6) / .4, 0, 1); l = eio(l); }
    else if (seg === 1) { l = clamp((f - (t.row / 20) * .38 - t.dly * .14) / .48, 0, 1); l = eio(l); }
    else if (seg === 2) return b;
    else {
      if (t.saved) { l = clamp((f - .02 - t.dly * .22) / .62, 0, 1); }
      else { l = clamp((f - .32 - t.dly * .1) / .5, 0, 1); }
      l = t.saved ? eio(l) : eio(l);
    }
    s = tileState.o;
    s.x = lerp(a.x, b.x, l); s.y = lerp(a.y, b.y, l); s.w = lerp(a.w, b.w, l); s.h = lerp(a.h, b.h, l); s.r = lerp(a.r, b.r, l);
    if (seg === 1) { s.y -= Math.sin(l * Math.PI) * (20 + t.dly * 30); s.r += Math.sin(l * Math.PI) * (t.ph - 3.14) * .05; }
    if (seg === 3 && t.saved) { s.y -= Math.sin(l * Math.PI) * (H * .28 + t.dly * H * .2); s.r += Math.sin(l * Math.PI) * (t.ph - 3.14) * .6; }
    return s;
  }
  tileState.o = { x: 0, y: 0, w: 0, h: 0, r: 0 };

  function render(now) {
    var c = ctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = '#0F1720';
    c.fillRect(0, 0, W, H);

    /* flood */
    var fl = sm(3.14, 3.62, p);
    var ang = beamAngle();
    var py = p < 1 ? lerp(L.py0, L.py1, eio(p)) : p < 3.4 ? L.py1 : lerp(L.py1, L.py2, eio(clamp((p - 3.4) / .5, 0, 1)));
    if (fl > 0) {
      c.fillStyle = '#F5A524';
      c.beginPath(); c.arc(L.px, py, fl * L.diag, 0, 6.2832); c.fill();
    }

    /* scan */
    if (p > 0 && p < 1) {
      var sx = (p * 1.12 - .02) * W;
      c.fillStyle = '#F5A524';
      c.fillRect(sx, L.barB, 3, py - L.barB);
    }

    var intro = now * 1000 < introDur + 900 && !reduced;
    var chaos = 1 - sm(.0, .25, p);
    var repel = chaos > .02 && mx > -900;
    var labelOn = p < 1.6;
    var rad = L.tw * 1.25;

    /* occasional ringing phone and fresh paper */
    if (chaos > .9 && !reduced && now > nextRing) {
      nextRing = now + 1.3 + Math.random() * 1.4;
      var pick = T[Math.random() * N | 0];
      wobV += (Math.random() - .5) * .006;
      if (Math.random() < .55) { var tels = T.filter(function (t) { return t.tel; }); pick = tels[Math.random() * tels.length | 0]; pick.ring = now; }
      var idx = ord.indexOf(T.indexOf(pick));
      if (idx >= 0) { ord.splice(idx, 1); ord.push(T.indexOf(pick)); }
    }

    var launched = 0, s, x, y, w, h, r, col;
    for (var q = 0; q < N; q++) {
      var ti = ord[q], t = T[ti];
      s = tileState(t, ti, now);
      x = s.x; y = s.y; w = s.w; h = s.h; r = s.r;

      /* ambient + pointer */
      if (chaos > 0) {
        if (!reduced) {
          x += Math.sin(now * .55 + t.ph) * 3.2 * chaos;
          y += Math.cos(now * .42 + t.ph2) * 2.4 * chaos;
          r += Math.sin(now * .32 + t.ph2) * .018 * chaos;
        }
        if (repel) {
          var dx = x + t.ox - mx, dy = y + t.oy - my, d2 = dx * dx + dy * dy;
          if (d2 < rad * rad) { var d = Math.sqrt(d2) || 1, fo = (1 - d / rad) * 900; t.vx += dx / d * fo * .016; t.vy += dy / d * fo * .016; }
        }
        t.vx += -t.ox * .9; t.vy += -t.oy * .9; t.vx *= .82; t.vy *= .82; t.ox += t.vx * .016 * 10; t.oy += t.vy * .016 * 10;
        x += t.ox * chaos; y += t.oy * chaos;
        var ringT = now - t.ring;
        if (ringT < .9 && ringT > 0) { r += Math.sin(ringT * 55) * .07 * (1 - ringT / .9); }
      }

      /* intro: the paper lands on the beam */
      if (intro) {
        var dl = (q / N) * 1000, it = clamp((now * 1000 - dl) / 520, 0, 1);
        if (it < 1) {
          if (it === 0) continue;
          var ie = 1 - Math.pow(1 - it, 2.4);
          y = lerp(-80 - t.dly * 120, y, ie);
          r += (1 - it) * (t.ph - 3.14) * .5;
          x += (1 - it) * (t.tint - .5) * 90;
        } else if (!t.landed) {
          t.landed = 1;
          wobV += (x < L.px ? -1 : 1) * .004 * (narrow ? .8 : 1);
        }
      }

      /* colour */
      var colA = PAPER;
      if (t.tint < .3) colA = [233, 229, 219]; else if (t.tint > .8) colA = [255, 255, 255];
      var labA = labelOn ? sm(1.05, 1.45, p) === 1 ? 0 : 1 - sm(1.05, 1.45, p) : 0;
      if (w < 58) labA = 0;
      var cA = colA;
      if (t.back && chaos > 0) cA = mix3(colA, INK, t.back * chaos);
      var dim = 0;
      if (p > 2.05) {
        var wave = clamp((p - 2.05 - (t.row / 20) * .45) / .28, 0, 1);
        if (t.saved) cA = mix3(cA, AMBER, eio(wave));
        else cA = mix3(cA, [118, 124, 130], eio(wave));
      }
      if (p > 3.12) {
        if (t.saved) cA = mix3(cA, INK, sm(3.3, 3.75, p));
        else cA = mix3(cA, INK, sm(3.2, 3.6, p));
      }
      if (t.saved && p > 3) {
        var lf = clamp((p - 3 - .02 - t.dly * .22) / .62, 0, 1);
        if (lf > .25) launched++;
      }

      if (r !== 0) {
        var cs = Math.cos(r), sn = Math.sin(r);
        c.setTransform(cs * dpr, sn * dpr, -sn * dpr, cs * dpr, x * dpr, y * dpr);
      } else c.setTransform(dpr, 0, 0, dpr, x * dpr, y * dpr);
      if (labA > 0) { c.fillStyle = '#0F1720'; c.fillRect(-w / 2 - 1, -h / 2 - 1, w + 2, h + 2); }
      if (now - t.ring < .9 && chaos > 0) { c.fillStyle = '#F5A524'; c.fillRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6); }
      c.fillStyle = mix(cA, cA, 0);
      c.fillRect(-w / 2, -h / 2, w, h);
      if (labA > 0) {
        c.globalAlpha = labA * (t.back && chaos > .5 ? .72 : 1);
        c.drawImage(atlas, (ti % acols) * cw, (ti / acols | 0) * chh, cw, chh, -w / 2, -h / 2, w, h);
        c.globalAlpha = 1;
      }
      /* the point: captured by the scan */
      if (p > .05 && p < 1.3) {
        var cap = clamp((p - s.x / W * .6 - .1) / .1, 0, 1) * (1 - sm(1.05, 1.28, p));
        if (cap > 0 && w > 20) {
          var rr = Math.min(h * .16, 5) * cap;
          c.fillStyle = '#F5A524';
          c.beginPath(); c.arc(w / 2 - rr - 3, -h / 2 + rr + 3, rr, 0, 6.2832); c.fill();
        }
      }
    }
    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (L.hover >= 0 && p >= 3.95) {
      var hc = L.cells[L.hover];
      c.fillStyle = '#F5F3EE';
      c.fillRect(hc.x - L.cell / 2 + 1, hc.y - L.cell / 2 + 1, L.cell - 2, L.cell - 2);
    }

    /* chart labels */
    var la = sm(1.5, 1.9, p) * (1 - sm(3.0, 3.12, p));
    if (la > 0) {
      c.globalAlpha = la;
      c.textBaseline = 'middle';
      L.rows.forEach(function (rw, ri) {
        c.font = '600 ' + rw.fs + 'px ' + FONT;
        c.fillStyle = '#F5F3EE';
        c.textAlign = 'left';
        c.fillText(rw.n, rw.lx, rw.ly);
        var amb = sm(2.1 + ri / 20 * .45, 2.4 + ri / 20 * .45, p);
        var txt = amb > .5 && rw.k > 0 ? rw.h + ' → ' + (rw.h - rw.k) : '' + rw.h;
        c.font = '700 ' + rw.fs + 'px ' + FONT;
        c.fillStyle = amb > .5 && rw.k > 0 ? '#F5A524' : '#F5F3EE';
        if (rw.nr) { c.textAlign = 'right'; c.fillText(txt, rw.nr, rw.ly); }
        else { c.textAlign = 'left'; c.fillText(txt, rw.nx, rw.ly); }
      });
      c.globalAlpha = 1; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    }

    /* the lever */
    var xL = L.m * .4, xR = W - L.m * .4;
    var tan = Math.tan(ang);
    var inkT = sm(3.2, 3.5, p);
    var beamCol = mix(PAPER, INK, inkT);
    c.strokeStyle = beamCol; c.lineWidth = L.bw; c.lineCap = 'butt';
    c.beginPath(); c.moveTo(xL, py + (xL - L.px) * tan); c.lineTo(xR, py + (xR - L.px) * tan); c.stroke();
    /* the point */
    c.fillStyle = mix(AMBER, INK, inkT);
    c.beginPath(); c.arc(L.px, py + L.pr + L.bw * .5, L.pr, 0, 6.2832); c.fill();

    /* handle */
    var hx = xR - (narrow ? 18 : 26), hy = py + (hx - L.px) * tan;
    var hideH = sm(3.0, 3.2, p);
    var pulse = chaos > .5 && !reduced ? 1 + Math.sin(now * 3.2) * .08 : 1;
    if (hideH < 1) {
      var hr = lerp(narrow ? 22 : 24, narrow ? 15 : 18, sm(.1, .5, p)) * pulse * (1 - hideH);
      c.fillStyle = '#F5A524';
      c.beginPath(); c.arc(hx, hy, hr, 0, 6.2832); c.fill();
      c.fillStyle = '#0F1720';
      var ah = hr * .42;
      c.beginPath(); c.moveTo(hx - ah, hy - ah * .4); c.lineTo(hx + ah, hy - ah * .4); c.lineTo(hx, hy + ah * .7); c.fill();
    }
    hEl.style.transform = 'translate3d(' + (hx - 28).toFixed(1) + 'px,' + (hy - 28).toFixed(1) + 'px,0)';
    hEl.style.visibility = hideH > .9 ? 'hidden' : 'visible';
    hT.style.opacity = 1 - sm(.02, .2, p);

    /* readouts */
    var f = Math.min(60, launched), o = 165 - f;
    if (f !== rF) { rF = f; rFree.textContent = f; }
    if (o !== rO) { rO = o; rOff.textContent = o; }
  }

  /* adaptive quality for older phones */
  var pf = 0, pn = 0;
  function perf(dt) {
    if (L.lowDpr || dt <= 0 || dt >= .05) return;
    pf += dt; pn++;
    if (pn === 45) {
      if (pf / pn > .026 && dpr > 1.25) { L.lowDpr = true; measure(); }
      pf = 0; pn = 0;
    }
  }

  /* playback + drag on the lever */
  var playing = 0;
  function stopPlay() { if (playing) { cancelAnimationFrame(playing); playing = 0; noSnap(false); } }
  function play() {
    var end = filmTop + run * .9;
    if (reduced) { window.scrollTo(0, end); return; }
    var from = window.scrollY, dist = end - from;
    if (dist < 10) return;
    var dur = (coarse ? 5600 : 8200) * (dist / (run * .9)), st = performance.now();
    noSnap(true);
    (function tick(t) {
      var k = clamp((t - st) / dur, 0, 1);
      window.scrollTo(0, from + dist * k);
      if (k < 1) playing = requestAnimationFrame(tick); else { playing = 0; noSnap(false); }
    })(st);
  }
  ['wheel', 'touchstart', 'keydown'].forEach(function (ev) { window.addEventListener(ev, stopPlay, { passive: true }); });
  var drag = null;
  hEl.addEventListener('pointerdown', function (e) {
    hEl.setPointerCapture(e.pointerId);
    drag = { y: e.clientY, s: window.scrollY, moved: false }; stopPlay(); noSnap(true);
  });
  hEl.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var dy = e.clientY - drag.y;
    if (Math.abs(dy) > 5) drag.moved = true;
    if (drag.moved) window.scrollTo(0, clamp(drag.s + dy * (run * .9) / (H * .42), filmTop, filmTop + run));
  });
  hEl.addEventListener('pointerup', function () { var tap = drag && !drag.moved; drag = null; noSnap(false); if (tap) play(); });
  hEl.addEventListener('pointercancel', function () { drag = null; noSnap(false); });
  hEl.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); play(); } });

  /* poster: which hour is this? */
  function hourAt(e) {
    if (p < 3.95 || !L.cells) return;
    var r = stage.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top, hit = -1;
    for (var i = 0; i < 60; i++) if (Math.abs(L.cells[i].x - x) < L.cell / 2 && Math.abs(L.cells[i].y - y) < L.cell / 2) { hit = i; break; }
    if (hit === L.hover) return;
    L.hover = hit; frame.drawnAt = -1; kick();
    if (hit < 0) { tip.hidden = true; return; }
    tip.hidden = false;
    tip.textContent = 'Eine Stunde aus: ' + L.cellRow[hit];
    var q = L.cells[hit];
    tip.style.left = clamp(q.x - 90, 8, W - 260) + 'px';
    tip.style.top = (q.y + L.cell * .7) + 'px';
  }
  stage.addEventListener('pointermove', hourAt, { passive: true });
  stage.addEventListener('pointerdown', hourAt, { passive: true });

  var raf = 0, lastW = 0;
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  window.addEventListener('scroll', function () { readScroll(); if (inView) kick(); }, { passive: true });
  window.addEventListener('resize', function () {
    if (window.innerWidth === lastW) return;
    lastW = window.innerWidth; measure(); readScroll(); frame.drawnAt = -1; kick();
  });
  new IntersectionObserver(function (es) { inView = es[0].isIntersecting; if (inView) { frame.lt = 0; kick(); } }, { rootMargin: '40px' }).observe(stage);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { frame.lt = 0; kick(); } });

  function start() {
    lastW = window.innerWidth;
    measure(); readScroll();
    p = reduced ? target : target > .01 ? target : 0;
    document.documentElement.classList.add('ready');
    kick();
  }
  var fp = (document.fonts && document.fonts.load) ? Promise.all([document.fonts.load('800 40px Archivo'), document.fonts.load('600 14px Archivo')]) : Promise.resolve();
  var done = false; function go() { if (!done) { done = true; start(); } }
  fp.then(go, go); setTimeout(go, 900);
})();
