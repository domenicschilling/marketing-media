// Lamellenfassade im Architektur-Visualisierungs-Look.
// mode "full"   : Kamerafahrt + Montage Geschoss für Geschoss, danach Bedienung (Winkel, Oberfläche, Ziehen zum Drehen)
// mode "detail" : Nahaufnahme für den Seitenkopf – Lamellen drehen sich langsam, Sonne wandert
// Maßeinheit: 1 = 1 m.
import { setup, reduced, clamp, lerp, ease } from './common.js';

export default function facadeLamellas(el) {
  const mode = el.dataset.mode === 'detail' ? 'detail' : 'full';
  const s = setup(el, { fov: mode === 'detail' ? 26 : 28, exposure: 1.0, envIntensity: 0.55 });
  const { THREE, scene, camera, renderer } = s;
  const hud = el.querySelector('[data-hud]');
  const mobile = innerWidth < 768;

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const HORIZON = 0xdde6ea;
  scene.fog = new THREE.Fog(HORIZON, 80, 230);

  // Himmel als Verlaufskugel – dient zugleich als Spiegelquelle für das Glas
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
    uniforms: { top: { value: new THREE.Color(0x5f95cb) }, mid: { value: new THREE.Color(0xa9c9e6) }, horizon: { value: new THREE.Color(HORIZON) }, bottom: { value: new THREE.Color(0xb9c2b4) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 horizon; uniform vec3 bottom; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(horizon, mix(mid, top, smoothstep(0.12, 0.65, h)), smoothstep(0.0, 0.12, h)) : mix(horizon, bottom, smoothstep(0.0, -0.08, h)); gl_FragColor = vec4(c, 1.0); \n#include <colorspace_fragment>\n }',
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(320, 32, 16), skyMat);
  scene.add(sky);
  {
    const envScene = new THREE.Scene();
    envScene.add(new THREE.Mesh(sky.geometry, skyMat));
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(envScene, 0.015, 0.1, 1000).texture;
    pm.dispose();
  }

  /* ---------- Maße ---------- */
  const FLOORS = 5, H = 3.2, X0 = -8, X1 = 8, ZB = -6, ZG = 3.3, ZS = 5.4, SLAB = 0.3;
  const TOP = FLOORS * H;

  /* ---------- Materialien ---------- */
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const M = {
    render: std({ color: 0xf2f0ea, roughness: 0.9 }),
    slab: std({ color: 0xfbfaf6, roughness: 0.75 }),
    soffit: std({ color: 0xeceae4, roughness: 0.9 }),
    glass: std({ color: 0x2a3d48, metalness: 0.92, roughness: 0.04, envMapIntensity: 1.25 }),
    frame: std({ color: 0x2b3034, metalness: 0.5, roughness: 0.4 }),
    rail: std({ color: 0x5f7c8a, metalness: 0.1, roughness: 0.02, transparent: true, opacity: 0.32, depthWrite: false }),
    clamp: std({ color: 0x9aa1a5, metalness: 0.8, roughness: 0.3 }),
    vhf: std({ color: 0x585d61, roughness: 0.7, metalness: 0.1 }),
    plinth: std({ color: 0x3a3f42, roughness: 0.8 }),
    pave: std({ color: 0xc4c6c0, roughness: 0.95 }),
    lawn: std({ color: 0x7e9a63, roughness: 1 }),
    trunk: std({ color: 0x5a4636, roughness: 1 }),
    leaf: std({ color: 0x5d7f45, roughness: 0.9 }),
    leaf2: std({ color: 0x6f9152, roughness: 0.9 }),
    light: new THREE.MeshBasicMaterial({ color: 0xfff1cc }),
  };

  // Holzdekor: feine Maserung, leicht unregelmäßig
  const wood = (() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 1024;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 128, 0);
    grad.addColorStop(0, '#8d4a27'); grad.addColorStop(0.3, '#b9693d'); grad.addColorStop(0.6, '#c87a49'); grad.addColorStop(1, '#9d5631');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 1024);
    for (let i = 0; i < 160; i++) {
      g.strokeStyle = `rgba(${Math.random() < 0.55 ? '74,32,12' : '240,180,128'},${0.05 + Math.random() * 0.12})`;
      g.lineWidth = 0.5 + Math.random() * 2;
      let x = Math.random() * 128;
      g.beginPath(); g.moveTo(x, 0);
      for (let y = 0; y <= 1024; y += 24) { x += (Math.random() - 0.5) * 1.6; g.lineTo(x, y); }
      g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  })();
  const lamMat = std({ map: wood, roughness: 0.5, metalness: 0.1 });
  const FINISH = {
    zeder: { map: true, color: 0xffffff, metal: 0.1 },
    eiche: { map: true, color: 0xf3d6a2, metal: 0.1 },
    anthrazit: { map: false, color: 0x3a4044, metal: 0.55 },
    alu: { map: false, color: 0xc4c7c6, metal: 0.75 },
  };
  const setFinish = (key) => {
    const f = FINISH[key] || FINISH.zeder;
    lamMat.map = f.map ? wood : null;
    lamMat.color.set(f.color);
    lamMat.metalness = f.metal;
    lamMat.needsUpdate = true;
  };

  const world = new THREE.Group();
  scene.add(world);
  const box = (sx, sy, sz, x, y, z, m, { cast = true, receive = true } = {}) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m);
    b.position.set(x, y, z);
    b.castShadow = cast; b.receiveShadow = receive;
    world.add(b);
    return b;
  };

  /* ---------- Umgebung ---------- */
  const groundTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 512;
    const g = c.getContext('2d');
    const rg = g.createRadialGradient(256, 256, 0, 256, 256, 256);
    rg.addColorStop(0, '#d2d4ce'); rg.addColorStop(0.07, '#cdd0c9'); rg.addColorStop(0.12, '#b3bda5'); rg.addColorStop(0.4, '#a9b59b'); rg.addColorStop(1, '#b9c2b4');
    g.fillStyle = rg; g.fillRect(0, 0, 512, 512);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), std({ map: groundTex, roughness: 1, envMapIntensity: 0.35 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true;
  world.add(ground);
  box(X1 - X0 + 6, 0.04, 9, 0, 0, ZS + 3.5, M.pave, { cast: false });
  const crownGeo = new THREE.IcosahedronGeometry(1, 3);
  const tree = (x, z, sc = 1) => {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * sc, 0.14 * sc, 3.2 * sc, 8), M.trunk);
    trunk.position.set(x, 1.6 * sc, z); trunk.castShadow = true; world.add(trunk);
    [[0, 3.9, 0, 1.55], [0.85, 3.4, 0.3, 1.1], [-0.8, 3.5, -0.2, 1.15], [0.2, 4.6, -0.3, 1.05]].forEach(([dx, dy, dz, r], i) => {
      const c = new THREE.Mesh(crownGeo, i % 2 ? M.leaf2 : M.leaf);
      c.position.set(x + dx * sc, dy * sc, z + dz * sc); c.scale.setScalar(r * sc);
      c.castShadow = c.receiveShadow = true; world.add(c);
    });
  };
  tree(-13.5, ZS + 1.5, 1.15); tree(-17.5, ZS - 1, 0.95); tree(14.5, ZS + 2, 1.05); tree(18.5, ZS - 0.5, 1.25);

  /* ---------- Baukörper ---------- */
  box(X1 - X0, TOP, ZG - ZB, 0, TOP / 2, (ZB + ZG) / 2, M.render);
  box(X1 - X0 + 0.2, 0.5, ZS - ZB + 0.2, 0, 0.25, (ZB + ZS) / 2, M.plinth);
  for (let i = 1; i <= FLOORS; i++) {
    const roof = i === FLOORS, y = i * H;
    box(X1 - X0 + 0.6, roof ? 0.75 : SLAB, (roof ? ZS - ZB : ZS - ZG) + 0.4, 0, y + (roof ? 0.2 : 0), roof ? (ZB + ZS) / 2 : (ZG + ZS) / 2 + 0.2, roof ? M.slab : M.slab);
  }
  // Leuchten in den Balkonuntersichten (wie auf dem Referenzfoto)
  const spots = new THREE.InstancedMesh(new THREE.CircleGeometry(0.075, 12), M.light, FLOORS * 11);
  const d = new THREE.Object3D();
  let si = 0;
  for (let i = 1; i <= FLOORS; i++) for (let k = 0; k < 11; k++) {
    d.position.set(X0 + 0.9 + k * 1.42, i * H - SLAB / 2 - 0.005, ZS - 0.55);
    d.rotation.set(Math.PI / 2, 0, 0); d.updateMatrix(); spots.setMatrixAt(si++, d.matrix);
  }
  world.add(spots);
  // Glasfronten mit Pfosten, Glasbrüstungen
  for (let f = 0; f < FLOORS; f++) {
    const y0 = f * H + (f === 0 ? 0.5 : SLAB / 2), y1 = (f + 1) * H - SLAB / 2, cy = (y0 + y1) / 2, h = y1 - y0;
    box(X1 - X0 - 0.3, h, 0.04, 0, cy, ZG + 0.02, M.glass, { cast: false });
    for (let x = X0 + 0.15; x <= X1 - 0.1; x += 1.3) box(0.06, h, 0.1, x, cy, ZG + 0.06, M.frame);
    box(X1 - X0 - 0.3, 0.06, 0.1, 0, f * H + 2.45, ZG + 0.06, M.frame);
    if (f > 0) {
      box(X1 - X0 - 0.2, 1.0, 0.025, 0, f * H + SLAB / 2 + 0.52, ZS - 0.12, M.rail, { cast: false, receive: false });
      box(X1 - X0 - 0.2, 0.08, 0.06, 0, f * H + SLAB / 2 + 0.04, ZS - 0.12, M.clamp);
    }
  }
  // Rechte Seite: Feld aus Fassadenplatten (VHF) mit Fenstern
  const pw = 1.18, ph = 1.58, cols = 6, rows = Math.floor((TOP - 0.6) / ph);
  const vhf = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, ph - 0.03, pw - 0.03), M.vhf, cols * rows);
  vhf.castShadow = vhf.receiveShadow = true;
  let vi = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const win = (c === 2 || c === 3) && r % 2 === 1;
    d.rotation.set(0, 0, 0);
    d.position.set(X1 + 0.03, 0.55 + ph * (r + 0.5), ZB + 1.2 + pw * (c + 0.5));
    d.scale.setScalar(win ? 0 : 1); d.updateMatrix(); vhf.setMatrixAt(vi++, d.matrix);
    if (win && c === 2) box(0.06, ph - 0.25, pw * 2 - 0.25, X1 + 0.02, 0.55 + ph * (r + 0.5), ZB + 1.2 + pw * 3, M.glass, { cast: false });
  }
  d.scale.setScalar(1);
  world.add(vhf);

  /* ---------- Lamellen ---------- */
  const SLATS = 9, GAP = 0.15, SW = 0.05, SD = 0.17;
  const columns = [
    { x: -6.55, z: ZS - 0.05, face: 'front' }, { x: -2.2, z: ZS - 0.05, face: 'front' },
    { x: 2.2, z: ZS - 0.05, face: 'front' }, { x: 6.55, z: ZS - 0.05, face: 'front' },
    { x: X1 + 0.32, z: ZS - 1.0, face: 'side' }, { x: X1 + 0.32, z: ZB + 0.6, face: 'side' },
  ];
  const slats = [];
  for (let f = 0; f < FLOORS; f++) {
    const yb = f * H + (f === 0 ? 0.5 : SLAB / 2), yt = (f + 1) * H - SLAB / 2;
    columns.forEach((col, ci) => {
      for (let k = 0; k < SLATS; k++) {
        const off = (k - (SLATS - 1) / 2) * GAP;
        slats.push({
          x: col.face === 'front' ? col.x + off : col.x, z: col.face === 'front' ? col.z : col.z + off,
          yt, h: yt - yb, base: col.face === 'side' ? Math.PI / 2 : 0,
          delay: f * 0.55 + ci * 0.1 + k * 0.035, phase: (col.face === 'front' ? col.x + off : X1 + 2 + col.z + off) * 0.45,
        });
      }
    });
  }
  const lam = new THREE.InstancedMesh(new THREE.BoxGeometry(SW, 1, SD), lamMat, slats.length);
  lam.castShadow = lam.receiveShadow = true;
  const tint = new THREE.Color();
  slats.forEach((_, i) => { const v = 0.9 + Math.random() * 0.14; lam.setColorAt(i, tint.setRGB(v, v * (0.97 + Math.random() * 0.04), v * 0.96)); });
  world.add(lam);

  /* ---------- Licht ---------- */
  scene.add(new THREE.HemisphereLight(0xdcecff, 0x9a9c8c, 1.05));
  const sun = new THREE.DirectionalLight(0xfff0d8, 2.9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -8, near: 1, far: 90 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  sun.target.position.set(0, TOP / 2, 2);
  const setSun = (az) => sun.position.set(Math.sin(az) * 40, 34, Math.cos(az) * 40);

  /* ---------- Steuerung ---------- */
  const state = { angle: 0, finish: 'zeder', replay: 0 };
  let angle = 0, t = 0, lastReplay = 0, started = reduced || mode === 'detail', touched = false;
  const apply = (dt) => {
    if (dt.angle !== undefined && dt.angle !== state.angle) touched = true;
    Object.assign(state, dt);
    setFinish(state.finish);
    if (state.replay !== lastReplay) { lastReplay = state.replay; t = 0; touched = false; }
  };
  el.addEventListener('config', (e) => apply(e.detail));
  if (el.dataset.config) apply(JSON.parse(el.dataset.config));
  setFinish(state.finish);
  new IntersectionObserver(([e]) => { if (e.intersectionRatio > 0.4) started = true; }, { threshold: [0, 0.4, 0.7] }).observe(el);

  let rotY = 0, vel = 0, dragging = false, lastX = 0, idle = 0;
  const px = { x: 0, y: 0, tx: 0, ty: 0 };
  el.addEventListener('pointerdown', (e) => { if (mode === 'detail') return; dragging = true; lastX = e.clientX; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    px.tx = (e.clientX - r.left) / r.width - 0.5; px.ty = (e.clientY - r.top) / r.height - 0.5;
    if (!dragging) return;
    vel = (e.clientX - lastX) * 0.004; lastX = e.clientX; rotY += vel; idle = 0;
  });
  const end = () => (dragging = false);
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('pointerleave', () => { px.tx = 0; px.ty = 0; });

  // Kamerapositionen: Start nah an einer Lamellenreihe, Ende Gesamtansicht
  let wide = { dist: 52, h: 0.42 };
  s.onResize(({ w, h }) => { const a = w / h; wide = a < 0.9 ? { dist: 66, h: 0.5 } : a < 1.3 ? { dist: 58, h: 0.45 } : { dist: 50, h: 0.42 }; });
  const camFrom = new THREE.Vector3(9.5, 4.2, 15), lookFrom = new THREE.Vector3(2.4, 5.2, ZS);
  const camTo = new THREE.Vector3(), lookTo = new THREE.Vector3(0, TOP * 0.44, 1.5);
  const camP = new THREE.Vector3(), look = new THREE.Vector3();

  const MONTAGE = FLOORS * 0.55 + 1.6;
  const TOTAL = MONTAGE + 0.7;

  s.onTick((dt, elapsed) => {
    if (started) t += dt;
    px.x += (px.tx - px.x) * (1 - Math.exp(-dt * 3)); px.y += (px.ty - px.y) * (1 - Math.exp(-dt * 3));
    angle += (THREE.MathUtils.degToRad(state.angle) - angle) * (1 - Math.exp(-dt * 5));
    setSun(-0.55 + (reduced ? 0 : Math.sin(elapsed * 0.05) * 0.35));

    // Welle nach der Montage (bzw. dauerhaft in der Detailansicht), bis der Regler benutzt wird
    const waveAmp = mode === 'detail' ? 0.55 : touched || reduced ? 0 : clamp((t - MONTAGE) / 0.8) * (1 - clamp((t - MONTAGE - 3.5) / 1.6));
    let settled = 0;
    const T = mode === 'detail' || reduced ? 99 : t;
    for (let i = 0; i < slats.length; i++) {
      const sl = slats[i];
      const p = clamp((T - sl.delay) / 0.7), e = ease.outCubic(p);
      if (p >= 1) settled++;
      const wave = waveAmp * Math.sin(elapsed * (mode === 'detail' ? 0.8 : 2.2) - sl.phase) * (mode === 'detail' ? 0.9 : 1.1);
      const sy = Math.max(0.0001, sl.h * e);
      d.position.set(sl.x, sl.yt - sy / 2, sl.z);
      d.rotation.set(0, sl.base + angle + wave + (1 - e) * 1.5, 0);
      d.scale.set(1, sy, 1);
      d.updateMatrix();
      lam.setMatrixAt(i, d.matrix);
    }
    lam.instanceMatrix.needsUpdate = true;
    if (hud && mode === 'full') hud.textContent = settled === slats.length ? 'Montage abgeschlossen ✓' : `Montage ${Math.round((settled / slats.length) * 100)} %`;

    // Kamera
    if (mode === 'detail') {
      camP.set(13 + px.x * 2, 5.4 - px.y * 1.5, 13.5);
      look.set(5.2, 4.6, ZS - 0.5);
      camera.position.copy(camP);
      camera.lookAt(look);
      return;
    }
    if (!dragging) {
      vel *= Math.pow(0.03, dt); rotY += vel; idle += dt;
    }
    rotY = clamp(rotY, -0.75, 0.55);
    const k = reduced ? 1 : ease.inOutCubic(clamp(t / TOTAL));
    const orbit = -0.32 + rotY + (reduced ? 0 : Math.sin(elapsed * 0.12) * 0.05 * clamp((t - TOTAL) / 2)) + px.x * 0.08;
    camTo.set(Math.sin(orbit) * wide.dist, TOP * wide.h + wide.dist * 0.12, Math.cos(orbit) * wide.dist + 2);
    camP.lerpVectors(camFrom, camTo, k);
    look.lerpVectors(lookFrom, lookTo, k);
    camera.position.copy(camP);
    camera.lookAt(look);
  });
  s.start();
}
