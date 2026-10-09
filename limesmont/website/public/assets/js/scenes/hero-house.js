// Hero: Das Gebäude aus dem LIMES-MONT-Logo wird Teil für Teil „montiert“.
import { setup, pointer, groundTexture, reduced, clamp, ease } from './common.js';

export default function heroHouse(el) {
  const s = setup(el, { fov: 30, exposure: 1.05, envIntensity: 0.9 });
  const { THREE, scene, camera } = s;
  const hud = el.querySelector('[data-hud]');
  const hero = el.closest('[data-hero]') || el;
  const ptr = pointer(hero);

  /* ---------- Materialien ---------- */
  const M = {
    frame: new THREE.MeshStandardMaterial({ color: 0x1c3a2c, metalness: 0.75, roughness: 0.3 }),
    lime: new THREE.MeshStandardMaterial({ color: 0x86ab43, metalness: 0.45, roughness: 0.32, emissive: 0x3d5418, emissiveIntensity: 0.45 }),
    tiles: [0x2f5242, 0x355b48, 0x2a4a3b].map((c) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.35, roughness: 0.5 })),
    glass: new THREE.MeshStandardMaterial({ color: 0x9cc25a, emissive: 0x7aa534, emissiveIntensity: 0.55, metalness: 0.15, roughness: 0.1 }),
    door: new THREE.MeshStandardMaterial({ color: 0x13241c, metalness: 0.55, roughness: 0.38 }),
    base: new THREE.MeshStandardMaterial({ color: 0x0f1f18, metalness: 0.2, roughness: 0.8 }),
    hidden: new THREE.MeshStandardMaterial({ color: 0x223f31, metalness: 0.3, roughness: 0.6 }),
  };

  const house = new THREE.Group();
  scene.add(house);
  const pieces = [];
  const box = (sx, sy, sz, x, y, z, mat, phase = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
    m.position.set(x, y, z);
    m.userData = { final: m.position.clone(), phase };
    house.add(m);
    pieces.push(m);
    return m;
  };

  // Kanten (Profile) eines Quaders
  const frameBox = (x0, x1, y0, y1, z0, z1, mat, t = 0.12, phase = 1) => {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
    for (const x of [x0, x1]) for (const z of [z0, z1]) box(t, y1 - y0 + t, t, x, cy, z, mat, phase);
    for (const y of [y0, y1]) for (const z of [z0, z1]) box(x1 - x0, t, t, cx, y, z, mat, phase + 0.5);
    for (const y of [y0, y1]) for (const x of [x0, x1]) box(t, t, z1 - z0, x, y, cz, mat, phase + 0.5);
  };

  // Fassadenkassetten auf einer Fläche, Öffnungen werden ausgespart
  const tiles = (axis, a0, a1, y0, y1, plane, cols, rows, holes, phase = 2) => {
    const w = (a1 - a0) / cols, W = Math.abs(w), h = (y1 - y0) / rows, g = 0.028, d = 0.06;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (holes.some(([c0, c1, r0, r1]) => c >= c0 && c <= c1 && r >= r0 && r <= r1)) continue;
      const a = a0 + w * (c + 0.5), y = y0 + h * (r + 0.5), mat = M.tiles[(r * 7 + c * 3) % 3];
      if (axis === 'z') box(W - g, h - g, d, a, y, plane, mat, phase + r * 0.12);
      else box(d, h - g, W - g, plane, y, a, mat, phase + r * 0.12);
    }
  };

  // Fenster mit Sprossenkreuz
  const windowUnit = (axis, a0, a1, y0, y1, plane, phase = 3) => {
    const w = a1 - a0, h = y1 - y0, ca = (a0 + a1) / 2, cy = (y0 + y1) / 2, t = 0.07, d = 0.09;
    const B = (sa, sy, a, y, mat, ph) => (axis === 'z' ? box(sa, sy, d, a, y, plane, mat, ph) : box(d, sy, sa, plane, y, a, mat, ph));
    if (axis === 'z') box(w - 0.04, h - 0.04, 0.02, ca, cy, plane - 0.02, M.glass, phase);
    else box(0.02, h - 0.04, w - 0.04, plane - 0.02, cy, ca, M.glass, phase);
    B(w, t, ca, y0 + t / 2, M.frame, phase + 0.2); B(w, t, ca, y1 - t / 2, M.frame, phase + 0.2);
    B(t, h, a0 + t / 2, cy, M.frame, phase + 0.2); B(t, h, a1 - t / 2, cy, M.frame, phase + 0.2);
    B(0.05, h, ca, cy, M.frame, phase + 0.35); B(w, 0.05, ca, cy, M.frame, phase + 0.35);
  };

  /* ---------- Gebäude (Maße in m) ---------- */
  const X0 = -0.7, X1 = 1.5, Y1 = 3.4, Z0 = -1, Z1 = 1;
  box(4.1, 0.08, 2.75, -0.08, -0.04, 0.05, M.base, 0); // Fundamentplatte
  frameBox(X0, X1, 0, Y1, Z0, Z1, M.frame);
  // Rückseite, linke Seite, Dach (aus Kamerasicht meist verdeckt)
  box(X1 - X0, Y1, 0.05, (X0 + X1) / 2, Y1 / 2, Z0 + 0.03, M.hidden, 1.2);
  box(0.05, Y1, Z1 - Z0, X0 + 0.03, Y1 / 2, 0, M.hidden, 1.2);
  // Vorderseite: 4 × 6 Kassetten, Fenster oben links, Tür unten rechts
  tiles('z', X0, X1, 0, Y1, Z1 - 0.03, 4, 6, [[0, 1, 3, 4], [3, 3, 0, 1]]);
  const tw = (X1 - X0) / 4, th = Y1 / 6;
  windowUnit('z', X0 + 0.02, X0 + 2 * tw - 0.02, 3 * th + 0.02, 5 * th - 0.02, Z1 - 0.01);
  box(tw - 0.06, 2 * th - 0.04, 0.08, X0 + 3.5 * tw, th, Z1 - 0.02, M.door, 3.4);
  box(0.03, 0.22, 0.06, X0 + 3 * tw + 0.12, th, Z1 + 0.04, M.lime, 3.6);
  // Rechte Seite: 4 × 6 Kassetten, Fenster oben mittig
  tiles('x', Z1, Z0, 0, Y1, X1 - 0.03, 4, 6, [[1, 2, 3, 4]]);
  windowUnit('x', -0.5, 0.5, 3 * th + 0.02, 5 * th - 0.02, X1 - 0.01);
  // Dach
  box(X1 - X0 - 0.06, 0.06, Z1 - Z0 - 0.06, (X0 + X1) / 2, Y1 - 0.03, 0, M.hidden, 3.8);
  // Anbau links in Hellgrün umrahmt (wie im Logo)
  const A0 = -1.9, A1 = X0, AY = 1.6, AZ0 = -0.6;
  frameBox(A0, A1, 0, AY, AZ0, Z1, M.lime, 0.1, 2.6);
  tiles('z', A0, A1, 0, AY, Z1 - 0.03, 2, 3, [], 2.8);
  tiles('x', Z1, AZ0, 0, AY, A0 + 0.03, 3, 3, [], 2.8);
  box(A1 - A0, 0.06, Z1 - AZ0, (A0 + A1) / 2, AY - 0.03, (AZ0 + Z1) / 2, M.hidden, 3.9);
  // Hellgrüner Versatzrahmen hinten rechts
  const LX = X1 + 0.32, LZ = Z0 - 0.3, LY = Y1 + 0.32;
  box(0.1, LY, 0.1, LX, LY / 2, LZ, M.lime, 4.2);
  box(0.1, 0.1, 1.9, LX, LY, LZ + 0.95, M.lime, 4.4);
  box(2.2, 0.1, 0.1, LX - 1.1, LY, LZ, M.lime, 4.4);

  /* ---------- Boden & Atmosphäre ---------- */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshBasicMaterial({ map: groundTexture(), transparent: true, depthWrite: false }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.085;
  house.add(ground);

  const dustN = 70, dustPos = new Float32Array(dustN * 3), dustSpeed = [];
  for (let i = 0; i < dustN; i++) {
    dustPos.set([(Math.random() - 0.5) * 8, Math.random() * 5, (Math.random() - 0.5) * 6], i * 3);
    dustSpeed.push(0.05 + Math.random() * 0.12);
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xb7d47a, size: 0.035, transparent: true, opacity: 0.55, depthWrite: false }));
  scene.add(dust);

  scene.add(new THREE.HemisphereLight(0xe6f5dc, 0x0a1510, 0.7));
  const key = new THREE.DirectionalLight(0xffffff, 1.7);
  key.position.set(5, 9, 7);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xa8d45a, 1.6);
  rim.position.set(-7, 4, -6);
  scene.add(rim);

  /* ---------- Montage-Animation ---------- */
  pieces.sort((a, b) => a.userData.phase - b.userData.phase || a.userData.final.y - b.userData.final.y);
  const stagger = 2.3 / pieces.length, dur = 0.85;
  pieces.forEach((m, i) => {
    const u = m.userData;
    u.delay = 0.25 + i * stagger;
    u.from = u.final.clone().add(new THREE.Vector3((Math.random() - 0.5) * 4, 3.5 + Math.random() * 3.5, (Math.random() - 0.5) * 4));
    u.rot = new THREE.Euler((Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 2.4);
    if (!reduced) { m.position.copy(u.from); m.rotation.copy(u.rot); m.visible = false; }
  });

  const target = new THREE.Vector3(0, 1.45, 0.1);
  s.onResize(({ w, h }) => {
    const a = w / h, k = a < 0.9 ? 1.45 : a < 1.15 ? 1.2 : 1;
    camera.position.set(6.6 * k, 4.4 * k, 8.2 * k);
    camera.lookAt(target);
  });

  let t = 0, done = reduced;
  if (reduced && hud) hud.textContent = 'Montage abgeschlossen';
  s.onTick((dt, elapsed) => {
    ptr.update(dt);
    if (!done) {
      t += dt;
      let settled = 0;
      for (const m of pieces) {
        const u = m.userData, p = clamp((t - u.delay) / dur);
        if (p <= 0) continue;
        m.visible = true;
        const e = ease.outBack(p), r = ease.outCubic(p);
        m.position.lerpVectors(u.from, u.final, e);
        m.rotation.set(u.rot.x * (1 - r), u.rot.y * (1 - r), u.rot.z * (1 - r));
        if (p >= 1) settled++;
      }
      if (hud) hud.textContent = `${Math.round((settled / pieces.length) * 100)} %`;
      if (settled === pieces.length) { done = true; if (hud) hud.textContent = 'Montage abgeschlossen ✓'; }
    }
    const idle = reduced ? 0 : Math.sin(elapsed * 0.25) * 0.07;
    house.rotation.y = -0.5 + ptr.x * 0.32 + idle;
    house.rotation.x = ptr.y * 0.05;
    if (!reduced) {
      const pos = dustGeo.attributes.position;
      for (let i = 0; i < dustN; i++) {
        let y = pos.getY(i) + dustSpeed[i] * dt;
        if (y > 5) y = 0;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }
  });
  s.start();
}
