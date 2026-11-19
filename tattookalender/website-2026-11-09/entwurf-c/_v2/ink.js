/* Tattookalender · Entwurf C "Tinte" · Fassung 2
   Goldene Tinte zieht den Haken aus dem Logo (Kalenderblatt mit Haken) groß über den Kopfbereich,
   danach sammelt sie sich unter dem Handy, das aus ihr aufsteigt. Reines WebGL 1, ein Fragment-Shader, keine Bibliothek.
   - Der Haken folgt dem Pfad des SVG-Hakens (.hero-check). Den zeichnet CSS schon beim ersten Bild; startet der Shader,
     übernimmt er an derselben Stelle der Bewegung (gleiche Kurve) und das SVG blendet aus. Ohne WebGL bleibt das SVG.
   - Finger/Maus ziehen die Tinte mit, Tippen schickt eine Welle hindurch, Scrollen lässt sie ausbluten.
   - pausiert außerhalb des Bildschirms und im Hintergrund-Tab, drosselt sich auf langsamen Geräten selbst,
     Software-Grafik (kein Grafikchip) bekommt das SVG. prefers-reduced-motion: ein ruhiges Bild, keine Bewegung. */
(function () {
  "use strict";
  // erst nach dem Laden starten (Text, Handy und Schrift zuerst); bis dahin zeichnet CSS den Haken als Linie
  function later(fn) {
    var go = function () { (window.requestIdleCallback || function (f) { return setTimeout(f, 1); })(fn, { timeout: 700 }); };
    if (document.readyState === "complete") go(); else window.addEventListener("load", go, { once: true });
  }
  later(boot);
  function boot() {
  var hero = document.querySelector("[data-ink]");
  if (!hero) return;
  var cv = hero.querySelector("canvas.ink");
  var svg = hero.querySelector(".hero-check");
  var path = svg && svg.querySelector("path");
  var anchor = hero.querySelector("[data-ink-origin]");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var force = /[?&]gl=1/.test(location.search);
  function fail() { hero.classList.add("no-gl"); if (cv && cv.parentNode) cv.parentNode.removeChild(cv); }
  if (!cv || !svg) return fail();

  // gleiche Kurve wie die CSS-Animation des SVG-Hakens: cubic-bezier(.65,0,.35,1), 1,05 s ab 0,15 s
  function bez(x1, y1, x2, y2) {
    function a(p1, p2) { return 1 - 3 * p2 + 3 * p1; } function b(p1, p2) { return 3 * p2 - 6 * p1; } function c(p1) { return 3 * p1; }
    function f(t, p1, p2) { return ((a(p1, p2) * t + b(p1, p2)) * t + c(p1)) * t; }
    function df(t, p1, p2) { return 3 * a(p1, p2) * t * t + 2 * b(p1, p2) * t + c(p1); }
    return function (x) { var t = x; for (var i = 0; i < 6; i++) { var d = df(t, x1, x2); if (Math.abs(d) < 1e-6) break; t -= (f(t, x1, x2) - x) / d; } return f(Math.max(0, Math.min(1, t)), y1, y2); };
  }
  var ease = bez(0.65, 0, 0.35, 1);
  var DRAW_DELAY = 0.15, DRAW_DUR = 1.05, RISE_AT = 0.7;
  // Zeitpunkt, an dem die CSS-Animation begonnen hat (aus der laufenden Animation gelesen, sonst: jetzt = fertig)
  var t0 = performance.now() - (DRAW_DELAY + DRAW_DUR) * 1000;
  try {
    var an = path.getAnimations ? path.getAnimations() : [];
    if (an.length) t0 = performance.now() - (an[0].currentTime == null ? 0 : an[0].currentTime);
  } catch (e) {}

  var gl = null;
  try { gl = cv.getContext("webgl", { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: "default" }); } catch (e) { gl = null; }
  if (!gl) return fail();
  try {
    var dbg = gl.getExtension("WEBGL_debug_renderer_info");
    var ren = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
    if (!force && /swiftshader|llvmpipe|softpipe|software|basic render/i.test(ren)) { var lx = gl.getExtension("WEBGL_lose_context"); if (lx) lx.loseContext(); return fail(); }
  } catch (e) {}

  var VS = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
  var FS = [
    "#ifdef GL_FRAGMENT_PRECISION_HIGH", "precision highp float;", "#else", "precision mediump float;", "#endif",
    "uniform vec2 uRes;uniform float uT;uniform float uDraw;uniform vec2 uA;uniform vec2 uB;uniform vec2 uC;uniform float uW;",
    "uniform vec2 uPtr;uniform vec2 uPtrV;uniform float uScroll;uniform float uPool;uniform vec2 uPoolC;uniform vec2 uPoolR;uniform vec3 uDrop;",
    "float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}",
    "float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}",
    "const mat2 R=mat2(.8,.6,-.6,.8);",
    "float fbm(vec2 p){float v=0.,a=.5;for(int k=0;k<4;k++){v+=a*n(p);p=R*p*2.03+3.1;a*=.5;}return v;}",
    "float seg(vec2 p,vec2 a,vec2 b,out float t){vec2 pa=p-a,ba=b-a;t=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*t);}",
    "void main(){",
    " vec2 p=gl_FragCoord.xy; float W=uW; float t=uT;",
    // Finger/Maus ziehen die Tinte mit
    " vec2 dp=p-uPtr; float fall=exp(-dot(dp,dp)/(W*W*16.)); p-=uPtrV*fall*W*1.7;",
    // Tippen: eine Welle läuft durch
    " vec2 dd=p-uDrop.xy; float dl=length(dd); float age=uDrop.z;",
    " float rip=sin(dl/W*2.2-age*9.)*exp(-age*1.5)*exp(-pow(dl/W-age*5.,2.)*.3); p+=dd/(dl+1.)*rip*W*.4;",
    " vec2 q=p/(W*2.6);",
    " float w1=fbm(q+vec2(0.,t*.07)); float w2=fbm(q+vec2(5.2,1.3)-t*.06);",
    " vec2 pw=p+(vec2(w1,w2)-.5)*W*(.5+uScroll*1.8);",
    // Abstand zum Haken (zwei Strecken) und Lage entlang des Pfads (0..1)
    " float L1=length(uB-uA); float L2=length(uC-uB); float L=L1+L2; float t1; float t2;",
    " float d1=seg(pw,uA,uB,t1); float d2=seg(pw,uB,uC,t2);",
    " vec2 ba=uB-uA; float sd=(ba.x*(pw.y-uA.y)-ba.y*(pw.x-uA.x))/max(L1,1.);",
    " float s=t1*L1/L; float d=d1; if(d2<d1){d=d2;s=(L1+t2*L2)/L; vec2 cb=uC-uB; sd=(cb.x*(pw.y-uB.y)-cb.y*(pw.x-uB.x))/max(L2,1.);}",
    " float along=s*L;",
    // Pinseldruck: kräftig am Anfang, zur Spitze dünner; Rand ausgefranst
    " float wp=W*(1.06-.5*smoothstep(.6,1.,s))*(.92+.16*n(vec2(s*7.,2.7)))*(1.+uScroll*.3);",
    " float rag=(n(pw/(W*.16))-.5)*W*.2+(n(pw/(W*.05))-.5)*W*.07;",
    " float dr=min(uDraw,1.); float drawn=1.-smoothstep(uDraw-.006,uDraw+.002,s);",
    " float hd=dr*L; vec2 H=hd<=L1?uA+(uB-uA)*(hd/max(L1,1.)):uB+(uC-uB)*((hd-L1)/max(L2,1.));",
    " float head=(1.-smoothstep(wp*.92,wp*1.02,length(pw-H)+rag))*step(.001,uDraw)*(1.-step(.999,uDraw));",
    " float body=max((1.-smoothstep(wp*.9,wp,d+rag))*drawn,head);",
    " float ac=clamp(sd/wp,-1.,1.);",
    // Borsten: feine Streifen in Zugrichtung, nicht spiegelgleich
    " float br=n(vec2(ac*13.+3.,along/(W*2.6)))*.6+n(vec2(ac*29.+7.,along/(W*.9)))*.4;",
    " float dry=smoothstep(.58,.86,n(vec2(ac*22.,along/(W*.7))))*smoothstep(.8,1.,s)*.9; body*=1.-dry;",
    " float edge=smoothstep(.62,1.,abs(ac));",
    " vec3 gold=vec3(.85,.68,.33); vec3 hi=vec3(.99,.87,.58); vec3 deep=vec3(.55,.40,.15);",
    " vec3 ink=mix(gold,deep,edge*.42+(.5-br)*.26);",
    // Licht von oben links: ein weicher, einseitiger Glanz auf der nassen Tinte
    " float sheen=smoothstep(-.95,-.45,ac)*smoothstep(.05,-.35,ac)*(.35+.65*br);",
    " ink=mix(ink,hi,sheen*.55);",
    " float ph=fract(t*.11)*1.6-.3; ink+=vec3(.20,.16,.08)*exp(-pow((s-ph)*7.,2.))*sheen*2.*step(.999,uDraw);",
    // Ausbluten und Rauch nahe am Haken (oben im Textbereich bleibt es dunkel)
    " float near=max(d-wp,0.);",
    " float drawnSoft=1.-smoothstep(uDraw-.05,uDraw+.08,s);",
    " float f=fbm(p/(W*4.)+vec2(t*.03,-t*.025)+1.8*vec2(w1,w2));",
    " float halo=exp(-near/(W*(.7+uScroll*3.)))*drawnSoft*smoothstep(.3,.8,f*.6+w1*.6);",
    " float region=exp(-near/(W*6.))*smoothstep(0.,.5,uDraw);",
    // Tintenlache, aus der das Handy aufsteigt
    " vec2 pd=(p-uPoolC)/uPoolR; float pl=length(pd)+(f-.5)*.7; float pool=(1.-smoothstep(.5,1.,pl))*uPool;",
    " vec3 col=vec3(.043,.043,.051);",
    " col+=vec3(.30,.22,.09)*smoothstep(.35,.85,f)*region;",
    " col+=vec3(.42,.31,.12)*halo*.45;",
    " col+=vec3(.55,.41,.16)*pool*.85;",
    " col=mix(col,ink,clamp(body*(.95+.1*(br-.5)),0.,1.));",
    " gl_FragColor=vec4(col,1.);",
    "}"
  ].join("\n");

  // Shader im Hintergrund übersetzen (KHR_parallel_shader_compile), damit der Haupt-Thread nicht blockiert
  var par = gl.getExtension("KHR_parallel_shader_compile");
  var vs = gl.createShader(gl.VERTEX_SHADER), fs = gl.createShader(gl.FRAGMENT_SHADER), prog = gl.createProgram();
  gl.shaderSource(vs, VS); gl.compileShader(vs);
  gl.shaderSource(fs, FS); gl.compileShader(fs);
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  (function wait() {
    if (par && !gl.getProgramParameter(prog, par.COMPLETION_STATUS_KHR)) { setTimeout(wait, 50); return; }
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { if (window.console) console.warn("Tinte:", gl.getShaderInfoLog(fs) || gl.getProgramInfoLog(prog)); return fail(); }
    go();
  })();
  function go() {
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var U = {};
  ["uRes", "uT", "uDraw", "uA", "uB", "uC", "uW", "uPtr", "uPtrV", "uScroll", "uPool", "uPoolC", "uPoolR", "uDrop"].forEach(function (k) { U[k] = gl.getUniformLocation(prog, k); });

  var coarse = window.matchMedia("(pointer: coarse)").matches;
  var scale = coarse ? Math.min(1.25, (window.devicePixelRatio || 1) * 0.5) : 0.75; // Bruchteil der CSS-Auflösung
  var W = 2, H = 2, cssW = 1, cssH = 1;
  var G = { a: [0, 0], b: [0, 0], c: [0, 0], w: 10, pc: [0, 0], pr: [100, 40] };
  var ptr = [-9999, -9999], ptrV = [0, 0], tgtV = [0, 0], last = null;
  var drop = [-9999, -9999], dropT = -100;
  var scrollP = 0, running = false, visible = true, raf = 0, live = false;
  var frames = 0, slow = 0, lastT = 0;

  function measure() {
    var r = hero.getBoundingClientRect();
    cssW = Math.max(1, r.width); cssH = Math.max(1, Math.min(r.height, window.innerHeight * 1.7));
    W = Math.max(2, Math.round(cssW * scale)); H = Math.max(2, Math.round(cssH * scale));
    cv.width = W; cv.height = H; cv.style.height = cssH + "px";
    gl.viewport(0, 0, W, H);
    var s = svg.getBoundingClientRect(), k = s.width / 600;
    function P(x, y) { return [(s.left - r.left + x * k) * scale, (cssH - (s.top - r.top + y * k)) * scale]; }
    G.a = P(40, 210); G.b = P(200, 370); G.c = P(550, 20); G.w = 42 * k * scale;
    if (anchor) {
      var a = anchor.getBoundingClientRect();
      G.pc = [(a.left - r.left + a.width * 0.5) * scale, (cssH - (a.top - r.top + a.width * 0.12)) * scale];
      G.pr = [a.width * 0.78 * scale, a.width * 0.32 * scale];
    }
  }

  function draw(now) {
    var t = (now - t0) / 1000;
    var dprog = reduce ? 1 : Math.max(0, Math.min(1, (t - DRAW_DELAY) / DRAW_DUR));
    var dv = dprog >= 1 ? 1.02 : ease(dprog);
    // Lache: wächst, während das Handy aufsteigt (ab 0,7 s), und bleibt dann ruhig
    var pool = reduce ? 0.55 : Math.max(0, Math.min(1, (t - RISE_AT + 0.15) / 0.7));
    pool = pool < 1 ? pool : 0.55 + 0.45 * Math.exp(-(t - RISE_AT - 0.55) * 1.2);
    ptrV[0] += (tgtV[0] - ptrV[0]) * 0.12; ptrV[1] += (tgtV[1] - ptrV[1]) * 0.12;
    tgtV[0] *= 0.92; tgtV[1] *= 0.92;
    var r = hero.getBoundingClientRect();
    scrollP = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height)));
    gl.uniform2f(U.uRes, W, H);
    gl.uniform1f(U.uT, reduce ? 9 : t + 6);
    gl.uniform1f(U.uDraw, dv);
    gl.uniform2f(U.uA, G.a[0], G.a[1]); gl.uniform2f(U.uB, G.b[0], G.b[1]); gl.uniform2f(U.uC, G.c[0], G.c[1]);
    gl.uniform1f(U.uW, G.w);
    gl.uniform2f(U.uPtr, ptr[0], ptr[1]); gl.uniform2f(U.uPtrV, ptrV[0], ptrV[1]);
    gl.uniform1f(U.uScroll, scrollP);
    gl.uniform1f(U.uPool, pool); gl.uniform2f(U.uPoolC, G.pc[0], G.pc[1]); gl.uniform2f(U.uPoolR, G.pr[0], G.pr[1]);
    gl.uniform3f(U.uDrop, drop[0], drop[1], reduce ? 100 : (now - dropT) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!live) { live = true; hero.classList.add("ink-live"); }
  }

  function loop(now) {
    raf = 0;
    if (!running) return;
    if (lastT) { // Selbstschutz: zu langsame Geräte bekommen weniger Pixel, notfalls bleibt das Bild stehen
      var dt = now - lastT;
      if (dt < 250) { frames++; if (dt > 28) slow++; }
      if (frames >= 90) {
        if (slow > 40) { if (scale > 0.5) { scale = Math.max(0.45, scale * 0.66); measure(); } else { running = false; return; } }
        frames = 0; slow = 0;
      }
    }
    lastT = now;
    draw(now);
    raf = requestAnimationFrame(loop);
  }
  function start() { if (reduce || running || !visible || document.hidden) return; running = true; lastT = 0; if (!raf) raf = requestAnimationFrame(loop); }
  function stop() { running = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  measure();
  if (reduce) draw(performance.now());
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); else stop(); }, { rootMargin: "60px" }).observe(hero);
  }
  start();
  document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });

  var rt = 0, lastW = window.innerWidth;
  window.addEventListener("resize", function () {
    if (coarse && Math.abs(window.innerWidth - lastW) < 2) return; // iOS: Adressleiste ändert nur die Höhe
    lastW = window.innerWidth;
    clearTimeout(rt); rt = setTimeout(function () { measure(); if (reduce) draw(performance.now()); }, 150);
  }, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); });
  window.addEventListener("load", function () { measure(); });

  function toC(e) { var r = hero.getBoundingClientRect(); return [(e.clientX - r.left) * scale, (cssH - (e.clientY - r.top)) * scale]; }
  if (!reduce) {
    hero.addEventListener("pointermove", function (e) {
      var p = toC(e), now = performance.now();
      if (last) {
        var dt = Math.max(8, now - last.t), lim = 1.4;
        tgtV[0] = Math.max(-lim, Math.min(lim, tgtV[0] + (p[0] - last.p[0]) / dt / (G.w || 10) * 9));
        tgtV[1] = Math.max(-lim, Math.min(lim, tgtV[1] + (p[1] - last.p[1]) / dt / (G.w || 10) * 9));
      }
      ptr = p; last = { p: p, t: now };
    }, { passive: true });
    hero.addEventListener("pointerdown", function (e) {
      if (e.target.closest("a,button")) return;
      drop = toC(e); dropT = performance.now();
    }, { passive: true });
  }
  window.TKInk = { remeasure: measure };
  }
  }
})();
