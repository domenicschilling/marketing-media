/* Tattookalender · Entwurf C "Tinte"
   Goldene Tinte, die sich in schwarzem Wasser ausbreitet. Reines WebGL 1 (keine Bibliothek), ein Fragment-Shader.
   - startet am Gerät im Kopfbereich (Ursprung = Mitte des Handys) und breitet sich in ~3 s aus
   - Finger/Maus ziehen die Tinte mit, Tippen setzt einen neuen Tropfen
   - rendert in reduzierter Auflösung, pausiert außerhalb des Bildschirms und im Hintergrund-Tab
   - drosselt sich selbst, wenn das Gerät zu langsam ist; ohne WebGL: Standbild (Klasse .no-gl)
   - prefers-reduced-motion: ein einziges ruhiges Bild, keine Bewegung */
(function () {
  "use strict";
  // Start erst nach dem Laden (Text und Handybild zuerst, der Shader ist Zugabe)
  function later(fn) {
    var go = function () { (window.requestIdleCallback || function (f) { return setTimeout(f, 1); })(fn, { timeout: 900 }); };
    if (document.readyState === "complete") setTimeout(go, 250); else window.addEventListener("load", function () { setTimeout(go, 250); }, { once: true });
  }
  later(boot);
  function boot() {
  var hero = document.querySelector("[data-ink]");
  if (!hero) return;
  var cv = hero.querySelector("canvas.ink");
  var anchor = hero.querySelector("[data-ink-origin]");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function fail() { hero.classList.add("no-gl"); if (cv) cv.remove(); }
  if (!cv) return fail();

  var gl = null;
  try {
    gl = cv.getContext("webgl", { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: "low-power" });
  } catch (e) { gl = null; }
  if (!gl) return fail();
  // Software-Rendering (kein Grafikchip) wäre ruckelig: dann lieber das Standbild
  try {
    var dbg = gl.getExtension("WEBGL_debug_renderer_info");
    var ren = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : "";
    if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(ren)) { var lx = gl.getExtension("WEBGL_lose_context"); if (lx) lx.loseContext(); return fail(); }
  } catch (e) {}

  var VS = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
  var FS = [
    "#ifdef GL_FRAGMENT_PRECISION_HIGH",
    "precision highp float;",
    "#else",
    "precision mediump float;",
    "#endif",
    "uniform vec2 uRes;uniform float uTime;uniform float uBloom;uniform vec2 uOrigin;",
    "uniform vec2 uPtr;uniform vec2 uPtrV;uniform vec3 uDrop;uniform float uScroll;",
    "float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}",
    "float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);",
    " return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}",
    "const mat2 R=mat2(.8,.6,-.6,.8);",
    "float fbm(vec2 p){float v=0.,a=.5;for(int k=0;k<5;k++){v+=a*n(p);p=R*p*2.03+3.1;a*=.5;}return v;}",
    "void main(){",
    " vec2 p=(gl_FragCoord.xy-.5*uRes)/min(uRes.x,uRes.y);",
    " float t=uTime*.045;",
    " vec2 d=p-uPtr; float fall=exp(-dot(d,d)*7.);",
    " vec2 sp=p*1.55-uPtrV*fall*.55;",
    " vec2 q=vec2(fbm(sp+vec2(0.,t)),fbm(sp+vec2(5.2,1.3)-t));",
    " vec2 r=vec2(fbm(sp+3.2*q+vec2(1.7,9.2)+.15*t),fbm(sp+3.2*q+vec2(8.3,2.8)-.12*t));",
    " float f=fbm(sp+3.6*r);",
    " vec2 o=(p-uOrigin)*vec2(1.,1.12);",
    " float k=max(1.,uRes.y/uRes.x*.5);",
    " float rad=.08+uBloom*(1.05*k+uScroll*.9);",
    " float m=smoothstep(rad,rad-.55,length(o)+(f-.5)*1.1);",
    " vec2 od=p-uDrop.xy; float dr=.05+.75*(1.-exp(-uDrop.z*.9));",
    " m=max(m,smoothstep(dr,dr-.35,length(od)+(f-.5)*.8)*exp(-uDrop.z*.22));",
    " float ink=clamp(f*f*2.1*m,0.,1.);",
    " float fil=smoothstep(.5,.95,length(r-q))*m;",
    " vec3 col=vec3(.043,.043,.051);",
    " col=mix(col,vec3(.15,.105,.045),smoothstep(.08,.62,ink));",
    " col=mix(col,vec3(.40,.30,.13),smoothstep(.45,.95,ink)*.85);",
    " col+=vec3(.20,.15,.07)*fil*smoothstep(.25,.7,ink);",
    " col=min(col,vec3(.46,.36,.17));",
    " gl_FragColor=vec4(col,1.);",
    "}"
  ].join("\n");

  function sh(type, src) {
    var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  var prog;
  try {
    prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("link");
  } catch (e) { return fail(); }
  gl.useProgram(prog);
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var U = {};
  ["uRes", "uTime", "uBloom", "uOrigin", "uPtr", "uPtrV", "uDrop", "uScroll"].forEach(function (k) { U[k] = gl.getUniformLocation(prog, k); });

  var coarse = window.matchMedia("(pointer: coarse)").matches;
  var scale = coarse ? 0.5 : 0.62;          // Bruchteil der CSS-Auflösung; Tinte ist weich, das reicht
  var W = 1, H = 1, cssW = 1, cssH = 1;
  var origin = [0, -0.1];
  var ptr = [9, 9], ptrV = [0, 0], tgtV = [0, 0], last = null;
  var drop = [9, 9], dropT = -100;
  var scrollP = 0, running = false, visible = true, raf = 0;
  var t0 = performance.now(), frames = 0, slow = 0, lastT = 0, live = false;

  function toP(x, y) { var m = Math.min(cssW, cssH); return [(x - cssW / 2) / m, (cssH / 2 - y) / m]; }
  function measure() {
    var r = hero.getBoundingClientRect();
    cssW = Math.max(1, r.width); cssH = Math.max(1, Math.min(r.height, window.innerHeight * 1.6));
    W = Math.max(2, Math.round(cssW * scale)); H = Math.max(2, Math.round(cssH * scale));
    cv.width = W; cv.height = H;
    cv.style.height = cssH + "px";
    gl.viewport(0, 0, W, H);
    if (anchor) {
      var a = anchor.getBoundingClientRect();
      var cx = a.left - r.left + a.width / 2, cy = a.top - r.top + Math.min(a.height * 0.42, cssH * 0.6);
      origin = toP(cx, cy);
    }
  }

  function draw(now) {
    var t = (now - t0) / 1000;
    var bloom = reduce ? 1 : 0.55 + 0.45 * (1 - Math.exp(-t / 1.4));
    ptrV[0] += (tgtV[0] - ptrV[0]) * 0.12; ptrV[1] += (tgtV[1] - ptrV[1]) * 0.12;
    tgtV[0] *= 0.93; tgtV[1] *= 0.93;
    gl.uniform2f(U.uRes, W, H);
    gl.uniform1f(U.uTime, reduce ? 12 : t + 8);
    gl.uniform1f(U.uBloom, bloom);
    gl.uniform2f(U.uOrigin, origin[0], origin[1]);
    gl.uniform2f(U.uPtr, ptr[0], ptr[1]);
    gl.uniform2f(U.uPtrV, ptrV[0], ptrV[1]);
    gl.uniform3f(U.uDrop, drop[0], drop[1], reduce ? 100 : t - dropT);
    gl.uniform1f(U.uScroll, scrollP);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!live) { live = true; hero.classList.add("ink-live"); }
  }

  function loop(now) {
    raf = 0;
    if (!running) return;
    // Selbstschutz: zu langsame Geräte bekommen weniger Pixel, notfalls ein Standbild
    if (lastT) {
      var dt = now - lastT;
      if (dt < 200) { frames++; if (dt > 30) slow++; }
      if (frames >= 90) {
        if (slow > 45) {
          if (scale > 0.36) { scale = 0.34; measure(); }
          else { running = false; hero.classList.add("ink-still"); return; }
        }
        frames = 0; slow = 0;
      }
    }
    lastT = now;
    draw(now);
    raf = requestAnimationFrame(loop);
  }
  function start() {
    if (reduce || running || !visible || document.hidden || hero.classList.contains("ink-still")) return;
    running = true; lastT = 0; if (!raf) raf = requestAnimationFrame(loop);
  }
  function stop() { running = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  measure();
  if (reduce) { draw(performance.now()); }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting; visible ? start() : stop();
    }, { rootMargin: "80px" }).observe(hero);
  }
  document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });

  var rt = 0, lastW = window.innerWidth;
  window.addEventListener("resize", function () {
    // iOS: Adressleiste ändert nur die Höhe, dann nicht neu aufbauen
    if (coarse && Math.abs(window.innerWidth - lastW) < 2) return;
    lastW = window.innerWidth;
    clearTimeout(rt); rt = setTimeout(function () { measure(); if (reduce) draw(performance.now()); }, 150);
  }, { passive: true });

  function onMove(e) {
    var r = hero.getBoundingClientRect();
    var p = toP(e.clientX - r.left, e.clientY - r.top);
    var now = performance.now();
    if (last) {
      var dt = Math.max(8, now - last.t);
      tgtV[0] = Math.max(-1.6, Math.min(1.6, tgtV[0] + (p[0] - last.p[0]) / dt * 40));
      tgtV[1] = Math.max(-1.6, Math.min(1.6, tgtV[1] + (p[1] - last.p[1]) / dt * 40));
    }
    ptr = p; last = { p: p, t: now };
  }
  if (!reduce) {
    hero.addEventListener("pointermove", onMove, { passive: true });
    hero.addEventListener("pointerdown", function (e) {
      if (e.target.closest("a,button")) return;
      var r = hero.getBoundingClientRect();
      drop = toP(e.clientX - r.left, e.clientY - r.top);
      dropT = (performance.now() - t0) / 1000;
    }, { passive: true });
  }

  window.TKInk = {
    setScroll: function (v) { scrollP = v; },
    remeasure: measure
  };
  }
})();
