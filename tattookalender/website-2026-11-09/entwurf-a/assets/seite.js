/* Tattookalender, Entwurf A: Bewegung als Zusatz.
   1. Faden: goldene Nadel-Linie durch alle Stationen, zieht am Ende den Haken aus dem Logo.
   2. Ablauf: gepinnte Bühne (CSS sticky), Bildschirm und Text wechseln je Station.
   3. GSAP/ScrollTrigger: 3D-Telefon im Kopfbereich, Knäuel wird zum Faden, Ausschnitte kippen ins Bild.
   Fällt etwas aus, bleibt die Seite vollständig lesbar (alles ist im HTML sichtbar). */
(() => {
  "use strict";
  const d = document;
  const root = d.documentElement;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fein = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const kopfH = () => parseFloat(getComputedStyle(root).getPropertyValue("--kopf-h")) || 60;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------------- 1. Faden ---------------- */
  const main = d.getElementById("inhalt");
  const svg = d.querySelector(".faden");
  const weg = svg && svg.querySelector(".faden-weg");
  const haken = svg && svg.querySelector(".faden-haken");
  const nadel = svg && svg.querySelector(".faden-nadel");
  const oehr = svg && svg.querySelector(".faden-oehr");
  const kopf = svg && svg.querySelector(".faden-kopf");
  const bogen = d.querySelector("[data-bogen]");
  const STEP = 10;
  let oehrR = 3, L1 = 0, L2 = 0, L3 = 0, lut = null, stiche = [], hakenY = 0, mainTop = 0, bereit = false;

  function bauen() {
    if (!svg || !main || !bogen) return;
    const mr = main.getBoundingClientRect();
    const ox = mr.left + scrollX;
    const oy = mr.top + scrollY;
    mainTop = oy;
    const W = main.clientWidth;
    const H = main.scrollHeight;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.style.height = H + "px";

    stiche = [...d.querySelectorAll("[data-stich]")].map((el) => {
      const r = el.getBoundingClientRect();
      return { el, x: r.left + r.width / 2 + scrollX - ox, y: r.top + r.height / 2 + scrollY - oy };
    });
    if (stiche.length < 2) return;

    const b = bogen.getBoundingClientRect();
    const bx = b.left + scrollX - ox, by = b.top + scrollY - oy;
    const sx = b.width / 120, sy = b.height / 112;
    const P = (u, v) => [+(bx + u * sx).toFixed(1), +(by + v * sy).toFixed(1)];

    let p = `M${stiche[0].x.toFixed(1)} ${stiche[0].y.toFixed(1)}`;
    for (let i = 1; i < stiche.length; i++) {
      const a = stiche[i - 1], s = stiche[i];
      if (Math.abs(a.x - s.x) < 0.5) p += ` L${s.x.toFixed(1)} ${s.y.toFixed(1)}`;
      else { const m = (a.y + s.y) / 2; p += ` C${a.x} ${m} ${s.x} ${m} ${s.x} ${s.y}`; }
    }
    // vom letzten Stich in einem Bogen zum Anfang des Hakens (wie im Logo: 34|77)
    const e = stiche[stiche.length - 1];
    const [ax, ay] = P(34, 77);
    const [lx] = P(10, 77);
    p += ` C${e.x.toFixed(1)} ${(e.y + (ay - e.y) * 0.75).toFixed(1)} ${(lx - 70 * sx).toFixed(1)} ${ay} ${lx} ${ay} L${ax} ${ay}`;
    weg.setAttribute("d", p);
    haken.setAttribute("d", `M${P(34, 77)} L${P(51, 93)} L${P(88, 56)}`);
    haken.style.strokeWidth = (9 * sx).toFixed(2);
    nadel.setAttribute("d", `M${P(88, 56)} L${P(99, 45)}`);
    nadel.style.strokeWidth = (3.5 * sx).toFixed(2);
    const [ox2, oy2] = P(101.5, 42.5);
    oehr.setAttribute("cx", ox2); oehr.setAttribute("cy", oy2); oehrR = 3.2 * sx;

    L1 = weg.getTotalLength(); L2 = haken.getTotalLength(); L3 = nadel.getTotalLength();
    const n = Math.ceil(L1 / STEP);
    lut = new Float32Array(n + 1);
    let maxY = -1e9;
    for (let i = 0; i <= n; i++) { const y = weg.getPointAtLength(Math.min(L1, i * STEP)).y; maxY = Math.max(maxY, y); lut[i] = maxY; }
    hakenY = ay;

    weg.style.strokeDasharray = `${L1} ${L1}`;
    haken.style.strokeDasharray = `${L2} ${L2}`;
    nadel.style.strokeDasharray = `${L3} ${L3}`;
    bereit = true;
    root.classList.add("faden-an");
    zuletzt = -1;
    malHaken(hakenT);
    zeichnen();
  }

  function laengeBeiY(y) {
    if (!lut) return 0;
    if (y <= lut[0]) return 0;
    let lo = 0, hi = lut.length - 1;
    if (y >= lut[hi]) return L1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (lut[m] < y) lo = m; else hi = m; }
    const t = (y - lut[lo]) / Math.max(0.001, lut[hi] - lut[lo]);
    return Math.min(L1, (lo + t) * STEP);
  }

  let zuletzt = -1, hakenT = 0, hakenZiel = 0, hakenAnim = 0, kopfLen = 0;
  // Haken + Nadel aus dem Logo: t = 0 … 1
  function malHaken(t) {
    const anteilH = L2 / (L2 + L3);
    const tH = clamp(t / anteilH, 0, 1), tN = clamp((t - anteilH) / (1 - anteilH), 0, 1);
    haken.style.strokeDashoffset = (L2 * (1 - tH)).toFixed(1);
    nadel.style.strokeDashoffset = (L3 * (1 - tN)).toFixed(1);
    oehr.setAttribute("r", tN >= 1 ? oehrR.toFixed(2) : "0");
    bogen.classList.toggle("fertig", tN >= 1);
    if (t > 0) {
      const pt = tH < 1 ? haken.getPointAtLength(L2 * tH) : nadel.getPointAtLength(L3 * tN);
      kopf.setAttribute("transform", `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
    }
    root.classList.toggle("faden-laeuft", kopfLen > 2 && t < 1);
  }
  // Kommt die Linie am Kalenderblatt an, zieht die Nadel den Haken in einem Zug (zeitgesteuert, damit man ihn sieht)
  function hakenSetzen(ziel) {
    if (ziel === hakenZiel) return;
    hakenZiel = ziel;
    cancelAnimationFrame(hakenAnim);
    const von = hakenT, start = performance.now(), dauer = 1100 * Math.abs(ziel - von) + 1;
    const schritt = (jetzt) => {
      const x = clamp((jetzt - start) / dauer, 0, 1);
      const e = x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
      hakenT = von + (ziel - von) * e;
      malHaken(hakenT);
      if (x < 1) hakenAnim = requestAnimationFrame(schritt);
    };
    hakenAnim = requestAnimationFrame(schritt);
  }

  function zeichnen() {
    if (!bereit) return;
    if (reduce) {
      weg.style.strokeDashoffset = 0;
      hakenT = 1; malHaken(1);
      stiche.forEach((s) => s.el.classList.add("erreicht"));
      return;
    }
    const kopfY = scrollY + innerHeight * 0.62 - mainTop;
    if (Math.abs(kopfY - zuletzt) < 0.5) return;
    zuletzt = kopfY;
    const len = laengeBeiY(kopfY);
    kopfLen = len;
    weg.style.strokeDashoffset = (L1 - len).toFixed(1);
    if (hakenT <= 0) {
      const pt = weg.getPointAtLength(len);
      kopf.setAttribute("transform", `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
    }
    root.classList.toggle("faden-laeuft", len > 2 && hakenT < 1);
    hakenSetzen(len >= L1 - 0.5 && kopfY >= hakenY ? 1 : 0);
    for (const s of stiche) s.el.classList.toggle("erreicht", kopfY >= s.y - 1);
  }

  /* ---------------- 2. Ablauf (gepinnte Bühne) ---------------- */
  const strecke = d.querySelector("[data-strecke]");
  const schirme = strecke ? [...strecke.querySelectorAll(".schirm")] : [];
  const schritte = strecke ? [...strecke.querySelectorAll(".schritt")] : [];
  const kette = strecke ? [...strecke.querySelectorAll(".kette li")] : [];
  const ketteFuell = strecke && strecke.querySelector(".kette");
  const ablaufKoerper = strecke && strecke.querySelector(".telefon-koerper");
  let aktiv = 0;
  if (strecke) root.classList.add("scrolly");

  function setzeSchritt(i) {
    if (i === aktiv) return;
    aktiv = i;
    schirme.forEach((el, k) => { el.classList.toggle("aktiv", k === i); el.classList.toggle("vorbei", k < i); });
    schritte.forEach((el, k) => el.classList.toggle("aktiv", k === i));
    kette.forEach((el, k) => { el.classList.toggle("aktiv", k === i); el.classList.toggle("erreicht", k <= i); });
  }
  kette.forEach((el, k) => el.classList.toggle("erreicht", k === 0));

  const buehne = strecke && strecke.querySelector(".ablauf-buehne");
  const telAblauf = strecke && strecke.querySelector(".telefon-ablauf");
  const schritteBox = strecke && strecke.querySelector(".schritte");
  let streckeTop = 0, streckeH = 1, kh = 60;
  function streckeMessen() {
    if (!strecke) return;
    const r = strecke.getBoundingClientRect();
    streckeTop = r.top + scrollY; streckeH = r.height; kh = kopfH();
  }
  function buehneMessen() {
    streckeMessen();
    if (!buehne || !telAblauf || !schritteBox) return;
    // höchster Schritt bestimmt die Texthöhe, der Rest gehört dem Telefon
    let hoch = 0;
    schritte.forEach((el) => { hoch = Math.max(hoch, el.offsetHeight); });
    schritteBox.style.minHeight = hoch + "px";
    const breit = matchMedia("(min-width: 900px)").matches;
    const ketteEl = strecke.querySelector(".kette");
    const raster = strecke.querySelector(".ablauf-raster");
    const cs = getComputedStyle(raster);
    const innenH = buehne.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const telBox = telAblauf.parentElement;
    const tcs = getComputedStyle(telBox);
    const rand = parseFloat(tcs.paddingTop) + parseFloat(tcs.paddingBottom);
    const frei = breit ? innenH - rand : innenH - (ketteEl ? ketteEl.offsetHeight : 0) - hoch - rand;
    const maxB = breit ? 330 : Math.min(300, raster.clientWidth - 70);
    const pw = clamp(frei / 2.17, 140, maxB);
    telAblauf.style.setProperty("--pw", pw.toFixed(1) + "px");
  }

  function ablauf() {
    if (!strecke) return;
    // aus gemerkten Maßen rechnen: beim Scrollen keine Layout-Abfrage (flüssig auch bei schnellem Wischen)
    const top = streckeTop - scrollY;
    const weg2 = streckeH - (innerHeight - kh);
    const p = clamp((kh - top) / Math.max(1, weg2), 0, 1);
    setzeSchritt(Math.min(schirme.length - 1, Math.floor(p * schirme.length * 0.9999)));
    if (ketteFuell) ketteFuell.style.setProperty("--p", p.toFixed(3));
    if (ablaufKoerper && !reduce) {
      // langsame Drehung über die ganze Strecke, kleiner Schwung bei jedem Wechsel
      const ry = -14 + 26 * p + Math.sin(p * Math.PI * schirme.length) * 3;
      const rx = 6 - 3 * p;
      ablaufKoerper.style.setProperty("--ry", ry.toFixed(2) + "deg");
      ablaufKoerper.style.setProperty("--rx", rx.toFixed(2) + "deg");
      ablaufKoerper.style.setProperty("--gx", (80 - 60 * p).toFixed(1) + "%");
    }
  }

  // Bildschirme rechtzeitig laden, damit beim schnellen Wischen nichts leer bleibt
  if (strecke && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) {
        schirme.forEach((img) => { if (img.dataset.src && !img.getAttribute("src")) img.src = img.dataset.src; img.loading = "eager"; if (img.decode) img.decode().catch(() => {}); });
        io.disconnect();
      }
    }, { rootMargin: "1200px 0px" });
    io.observe(strecke);
  }

  /* ---------------- Scroll-Schleife ---------------- */
  let geplant = false;
  function tick() { geplant = false; zeichnen(); ablauf(); }
  function planen() { if (!geplant) { geplant = true; requestAnimationFrame(tick); } }
  addEventListener("scroll", planen, { passive: true });

  let rt = 0;
  function neu() { clearTimeout(rt); rt = setTimeout(() => { buehneMessen(); bauen(); streckeMessen(); ablauf(); if (ST) ST.refresh(); }, 120); }
  let letzteBreite = innerWidth;
  addEventListener("resize", () => { if (innerWidth !== letzteBreite) { letzteBreite = innerWidth; neu(); } else { buehneMessen(); bauen(); } });
  if ("ResizeObserver" in window && main) { let h0 = 0; new ResizeObserver(() => { const h = main.scrollHeight; if (Math.abs(h - h0) > 2) { h0 = h; neu(); } }).observe(main); }
  // Schwere Arbeit erst nach dem ersten Bild (schneller erster Eindruck, LCP)
  const nachPaint = (fn) => requestAnimationFrame(() => setTimeout(fn, 0));
  nachPaint(() => { buehneMessen(); bauen(); ablauf(); });
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(() => nachPaint(() => { buehneMessen(); bauen(); }));
  addEventListener("load", () => nachPaint(() => { buehneMessen(); bauen(); ablauf(); }));

  /* ---------------- 3. GSAP-Zusätze (nachgeladen, feste Versionen aus lib/) ---------------- */
  let G = null, ST = null;
  const laden = (src) => new Promise((ok, nein) => { const el = d.createElement("script"); el.src = src; el.onload = ok; el.onerror = nein; d.head.appendChild(el); });
  if (reduce) return;
  const starten = () => laden("lib/gsap-3.13.0/gsap.min.js")
    .then(() => laden("lib/gsap-3.13.0/ScrollTrigger.min.js"))
    .then(() => (fein ? laden("lib/lenis-1.3.4/lenis.min.js") : null))
    .then(zusaetze)
    .catch(() => {});
  // erst laden, wenn die Seite steht: nach kurzer Ruhe oder beim ersten Wischen/Bewegen, was zuerst kommt
  let gestartet = false;
  const einmal = () => { if (gestartet) return; gestartet = true; ["scroll", "pointermove", "touchstart", "keydown"].forEach((t) => removeEventListener(t, einmal)); starten(); };
  ["scroll", "pointermove", "touchstart", "keydown"].forEach((t) => addEventListener(t, einmal, { passive: true }));
  const spaeter = () => setTimeout(einmal, 900);
  if (d.readyState === "complete") spaeter(); else addEventListener("load", spaeter);

  function zusaetze() {
  G = window.gsap; ST = window.ScrollTrigger;
  if (!G || !ST) return;
  G.registerPlugin(ST);
  ST.config({ ignoreMobileResize: true });

  // Lenis nur mit Maus/Trackpad (am Handy bleibt das native Scrollen von Safari)
  if (fein && window.Lenis) {
    const lenis = new window.Lenis({ lerp: 0.11, anchors: { offset: -kopfH() } });
    lenis.on("scroll", () => { ST.update(); planen(); });
    G.ticker.add((t) => lenis.raf(t * 1000));
    G.ticker.lagSmoothing(0);
  }

  // Kopfbereich: Telefon dreht sich beim Laden in Position und weiter beim Scrollen
  const held = d.querySelector(".held");
  const hk = d.querySelector(".telefon-held .telefon-koerper");
  if (held && hk) {
    // sanftes Einschwingen aus der Ruhelage (kein Sprung nach dem ersten Bild), danach leichtes Schweben
    G.to(hk, { "--ry": "-16deg", "--rx": "7deg", "--rz": "1.5deg", duration: 1.8, ease: "power3.out" });
    const schweben = G.to(hk, { "--fy": "-7px", duration: 2.6, ease: "sine.inOut", yoyo: true, repeat: -1 });
    ST.create({ trigger: held, start: "top top", end: "bottom top", onToggle: (st) => (st.isActive ? schweben.resume() : schweben.pause()) });
    G.to(hk, {
      "--sy": "34deg", "--sx": "-7deg", ease: "none",
      scrollTrigger: { trigger: held, start: "top top", end: "bottom top", scrub: 0.5 },
      onUpdate() { hk.style.setProperty("--gx", (70 - 50 * this.progress()).toFixed(1) + "%"); },
    });
    G.to(".telefon-held", { y: -40, ease: "none", scrollTrigger: { trigger: held, start: "top top", end: "bottom top", scrub: 0.5 } });
    G.to(".lupe", { y: -70, ease: "none", scrollTrigger: { trigger: held, start: "top top", end: "bottom top", scrub: 0.5 } });
    if (fein) {
      const kipp = (x, y) => G.to(hk, { "--zx": x.toFixed(2) + "deg", "--zy": y.toFixed(2) + "deg", duration: 0.8, ease: "power3.out", overwrite: "auto" });
      held.addEventListener("pointermove", (e) => {
        const r = held.getBoundingClientRect();
        kipp(-((e.clientY - r.top) / r.height - 0.5) * 10, ((e.clientX - r.left) / r.width - 0.5) * 16);
      });
      held.addEventListener("pointerleave", () => kipp(0, 0));
    }
  }

  // Problem: fünf lose Fäden werden zu einem
  const knaeuel = d.querySelector(".knaeuel");
  if (knaeuel) {
    const tl = G.timeline({ scrollTrigger: { trigger: knaeuel, start: "top 82%", end: "bottom 30%", scrub: 0.6 } });
    knaeuel.querySelectorAll("path").forEach((pfad, i) => {
      tl.to(pfad, { attr: { d: pfad.dataset.glatt }, stroke: "#b88a2c", strokeWidth: 2.4, ease: "power2.inOut", duration: 1 }, i * 0.06);
    });
  }

  // Funktionen: Ausschnitte kippen ins Bild (immer sichtbar, nur Lage ändert sich)
  G.utils.toArray("[data-kippen]").forEach((el) => {
    G.fromTo(el, { rotationX: 20, y: 36, transformPerspective: 900 }, {
      rotationX: 0, y: 0, ease: "none",
      scrollTrigger: { trigger: el, start: "top 98%", end: "top 58%", scrub: 0.4 },
    });
  });
  }
})();
