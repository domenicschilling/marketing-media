// Lamellenfassade: Wohngebäude, an dem Holzlamellen Geschoss für Geschoss montiert werden.
// Danach: Lamellenwinkel und Oberfläche über die Bedienelemente, Ziehen dreht das Gebäude.
// Maßeinheit: 1 = 1 m.
import { setup, groundTexture, reduced, clamp, ease } from './common.js';

export default function facadeLamellas(el) {
  const s = setup(el, { fov: 30, exposure: 1.05, envIntensity: 0.9 });
  const { THREE, scene, camera } = s;
  const hud = el.querySelector('[data-hud]');

  const FLOORS = 5, H = 3.1, X0 = -7, X1 = 7, ZB = -5, ZF = 4, SLAB = 0.32, DEPTH = 2.3;
  const TOP = FLOORS * H;

  /* ---------- Materialien ---------- */
  const mat = (o) => new THREE.MeshStandardMaterial(o);
  const M = {
    render: mat({ color: 0xf1efe9, roughness: 0.85 }),
    slab: mat({ color: 0xf7f6f2, roughness: 0.7 }),
    glass: mat({ color: 0x1c2b33, metalness: 0.35, roughness: 0.08 }),
    frame: mat({ color: 0x2a2f33, metalness: 0.6, roughness: 0.35 }),
    rail: mat({ color: 0x2b4552, metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.55, depthWrite: false }),
    vhf: mat({ color: 0x5b6064, roughness: 0.65, metalness: 0.15 }),
    base: mat({ color: 0x0f1f18, roughness: 0.9 }),
  };

  // Holzmaserung für die Lamellen (Aluminium in Holzdekor)
  const wood = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 512;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 64, 0);
    grad.addColorStop(0, '#8a4524'); grad.addColorStop(0.5, '#c27243'); grad.addColorStop(1, '#9b532d');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 512);
    for (let i = 0; i < 90; i++) {
      g.strokeStyle = `rgba(${Math.random() < 0.5 ? '70,30,10' : '235,170,120'},${0.08 + Math.random() * 0.14})`;
      g.lineWidth = 0.6 + Math.random() * 1.8;
      const x = Math.random() * 64;
      g.beginPath(); g.moveTo(x, 0);
      for (let y = 0; y <= 512; y += 32) g.lineTo(x + Math.sin(y * 0.02 + i) * 2.5, y);
      g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const lamMat = mat({ map: wood, roughness: 0.55, metalness: 0.15 });
  const FINISH = {
    zeder: { map: true, color: 0xffffff },
    eiche: { map: true, color: 0xf6d9a8 },
    anthrazit: { map: false, color: 0x3b4245 },
    alu: { map: false, color: 0xb9bcbb },
  };
  const setFinish = (key) => {
    const f = FINISH[key] || FINISH.zeder;
    lamMat.map = f.map ? wood : null;
    lamMat.color.set(f.color);
    lamMat.metalness = f.map ? 0.15 : 0.55;
    lamMat.needsUpdate = true;
  };

  const building = new THREE.Group();
  scene.add(building);
  const box = (sx, sy, sz, x, y, z, m, parent = building) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m);
    b.position.set(x, y, z);
    parent.add(b);
    return b;
  };

  /* ---------- Rohbau, Decken, Glas ---------- */
  box(X1 - X0 + 1.2, 0.3, ZF - ZB + DEPTH + 1.2, 0, -0.15, (ZB + ZF + DEPTH) / 2, M.base);
  box(X1 - X0, TOP, ZF - ZB, 0, TOP / 2, (ZB + ZF) / 2, M.render); // Baukörper
  for (let i = 0; i <= FLOORS; i++) {
    const roof = i === FLOORS;
    box(X1 - X0 + 0.5, roof ? 0.7 : SLAB, (roof ? ZF - ZB : 0) + DEPTH + 0.3, 0, i * H + (roof ? 0.2 : -SLAB / 2 + 0.16), roof ? (ZB + ZF + DEPTH) / 2 : ZF + DEPTH / 2, M.slab);
  }
  for (let i = 0; i < FLOORS; i++) {
    const y0 = i * H + 0.16, y1 = (i + 1) * H - SLAB + 0.16, cy = (y0 + y1) / 2;
    box(X1 - X0 - 0.4, y1 - y0, 0.05, 0, cy, ZF + 0.03, M.glass); // Glasfront
    for (let x = X0 + 0.2; x <= X1 - 0.2 + 1e-6; x += 1.36) box(0.07, y1 - y0, 0.09, x, cy, ZF + 0.06, M.frame);
    if (i > 0) box(X1 - X0 - 0.2, 1.0, 0.03, 0, i * H + 0.16 + 0.5, ZF + DEPTH - 0.08, M.rail); // Glasbrüstung
  }

  /* ---------- Rechte Seite: vorgehängte hinterlüftete Fassade (Platten) ---------- */
  const pw = 1.24, ph = 1.52, cols = Math.floor((ZF - ZB) / pw), rows = Math.floor(TOP / ph);
  const vhf = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, ph - 0.035, pw - 0.035), M.vhf, cols * rows);
  const dummy = new THREE.Object3D();
  let n = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const isWindow = c % 3 === 1 && r % 2 === 1;
    dummy.position.set(X1 + 0.04, ph * (r + 0.5) + 0.05, ZB + pw * (c + 0.5) + 0.1);
    dummy.scale.setScalar(isWindow ? 0 : 1);
    dummy.updateMatrix();
    vhf.setMatrixAt(n++, dummy.matrix);
    if (isWindow) box(0.05, ph - 0.2, pw - 0.2, X1 + 0.03, ph * (r + 0.5) + 0.05, ZB + pw * (c + 0.5) + 0.1, M.glass);
  }
  building.add(vhf);

  /* ---------- Lamellen (Instanzen, damit 150+ Stück flüssig laufen) ---------- */
  const groupsX = [-5.4, -1.8, 1.8, 5.4], perGroup = 6, gap = 0.24;
  const slats = [];
  for (let f = 0; f < FLOORS; f++) {
    const y = f * H + 0.16 + (H - SLAB) / 2, h = H - SLAB;
    groupsX.forEach((gx, gi) => {
      for (let k = 0; k < perGroup; k++) {
        slats.push({ x: gx + (k - (perGroup - 1) / 2) * gap, y, z: ZF + DEPTH - 0.25, h, delay: 0.25 + f * 0.42 + gi * 0.09 + k * 0.022, spin: (Math.random() - 0.5) * 2 });
      }
    });
  }
  // Durchgehende Lamellen an der Gebäudeecke rechts vorn
  for (let k = 0; k < 6; k++) slats.push({ x: X1 - 0.15 - k * gap, y: TOP / 2 + 0.1, z: ZF + DEPTH + 0.05, h: TOP - 0.2, delay: 0.25 + FLOORS * 0.42 + k * 0.05, spin: (Math.random() - 0.5) * 2, full: true });
  const lam = new THREE.InstancedMesh(new THREE.BoxGeometry(0.06, 1, 0.19), lamMat, slats.length);
  building.add(lam);

  /* ---------- Boden & Licht ---------- */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ map: groundTexture(), transparent: true, depthWrite: false }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.31;
  building.add(ground);
  scene.add(new THREE.HemisphereLight(0xe8f2ff, 0x1a2a20, 0.85));
  const sun = new THREE.DirectionalLight(0xfff3e0, 2.1);
  sun.position.set(18, 26, 22);
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xa8d45a, 0.9);
  rim.position.set(-20, 10, -18);
  scene.add(rim);

  /* ---------- Bedienung ---------- */
  const state = { angle: 0, finish: 'zeder', replay: 0 };
  let angle = 0, t = reduced ? 99 : 0, lastReplay = 0, started = reduced;
  // Montage erst starten, wenn die Bühne gut sichtbar ist
  new IntersectionObserver(([e]) => { if (e.intersectionRatio > 0.35) started = true; }, { threshold: [0, 0.35, 0.6] }).observe(el);
  const apply = (d) => {
    Object.assign(state, d);
    setFinish(state.finish);
    if (state.replay !== lastReplay) { lastReplay = state.replay; t = 0; }
  };
  el.addEventListener('config', (e) => apply(e.detail));
  if (el.dataset.config) apply(JSON.parse(el.dataset.config));

  let rotY = -0.42, vel = 0, dragging = false, lastX = 0, idleT = 0;
  el.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', (e) => { if (!dragging) return; vel = (e.clientX - lastX) * 0.005; lastX = e.clientX; rotY += vel; idleT = 0; });
  const end = () => (dragging = false);
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);

  let dist = 45;
  s.onResize(({ w, h }) => { const a = w / h; dist = a < 0.9 ? 70 : a < 1.2 ? 56 : 45; });

  s.onTick((dt) => {
    if (started) t += dt;
    angle += (THREE.MathUtils.degToRad(state.angle) - angle) * (1 - Math.exp(-dt * 6));
    let settled = 0;
    slats.forEach((sl, i) => {
      const p = clamp((t - sl.delay) / 0.75);
      if (p >= 1) settled++;
      const e = ease.outBack(p), r = ease.outCubic(p);
      dummy.position.set(sl.x, sl.y + (1 - e) * 7, sl.z + (1 - r) * 2);
      dummy.rotation.set(sl.spin * (1 - r), angle + sl.spin * 1.5 * (1 - r), 0);
      dummy.scale.set(1, p <= 0 ? 0.0001 : sl.h, 1);
      dummy.updateMatrix();
      lam.setMatrixAt(i, dummy.matrix);
    });
    lam.instanceMatrix.needsUpdate = true;
    if (hud) hud.textContent = settled === slats.length ? 'Montage abgeschlossen ✓' : `${Math.round((settled / slats.length) * 100)} %`;
    if (!dragging) {
      vel *= Math.pow(0.04, dt);
      rotY += vel;
      idleT += dt;
      if (!reduced && idleT > 3) rotY += Math.sin(t * 0.2) * dt * 0.05;
    }
    rotY = Math.min(0.55, Math.max(-1.15, rotY));
    building.rotation.y = rotY;
    camera.position.set(0, TOP * 0.5 + dist * 0.16, dist);
    camera.lookAt(0, TOP * 0.43, 2);
  });
  s.start();
}
