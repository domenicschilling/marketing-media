// Scroll-Story: Kunststofffenster im Schnitt – zerlegt sich beim Scrollen in seine Bauteile.
// Maßeinheit: 1 = 10 mm. Querschnitt in der XY-Ebene, Profil läuft entlang Z.
import { setup, pointer, smooth, lerp, reduced } from './common.js';

export default function windowProfile(el) {
  const s = setup(el, { fov: 28, exposure: 1.05, envIntensity: 1 });
  const { THREE, scene, camera } = s;
  const story = el.closest('[data-story]');
  const ptr = pointer(el);
  const L = 14; // Profillänge (140 mm)

  const shape = (pts, holes = []) => {
    const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    for (const [x0, y0, x1, y1] of holes) {
      const h = new THREE.Path();
      h.moveTo(x0, y0); h.lineTo(x0, y1); h.lineTo(x1, y1); h.lineTo(x1, y0); h.closePath();
      sh.holes.push(h);
    }
    return sh;
  };
  const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const extrude = (sh, depth = L) => new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false });

  const mat = (o) => new THREE.MeshStandardMaterial(o);
  const M = {
    pvc: [mat({ color: 0xe3ecd2, roughness: 0.55 }), mat({ color: 0xf3f3ee, roughness: 0.4 })],
    steel: [mat({ color: 0xd2d8db, metalness: 0.8, roughness: 0.35 }), mat({ color: 0x9fa8ad, metalness: 0.92, roughness: 0.28 })],
    gasket: [mat({ color: 0x2a2a2a, roughness: 0.7 }), mat({ color: 0x141414, roughness: 0.75 })],
    glass: [
      mat({ color: 0x5fae86, roughness: 0.1, transparent: true, opacity: 0.85 }),
      mat({ color: 0xbfe6d0, roughness: 0.02, metalness: 0.1, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }),
    ],
    spacer: [mat({ color: 0x5a605c, metalness: 0.6, roughness: 0.4 }), mat({ color: 0x3a3f3c, metalness: 0.6, roughness: 0.4 })],
  };

  const pivot = new THREE.Group();
  const model = new THREE.Group();
  model.position.set(-4.1, -10.2, -L / 2);
  pivot.add(model);
  scene.add(pivot);

  const parts = [];
  const add = (geo, m, move) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.userData.move = move; // (e1, e2, e3) → Versatz
    model.add(mesh);
    parts.push(mesh);
    return mesh;
  };
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

  // Blendrahmen mit 6 Kammern
  const frame = add(extrude(shape([[0, 0], [8.2, 0], [8.2, 6], [6.6, 6], [6.6, 6.6], [1.2, 6.6], [1.2, 7.6], [0, 7.6]],
    [[0.35, 0.35, 1.9, 3], [2.2, 0.35, 5.6, 4.1], [5.9, 0.35, 7.85, 3], [0.35, 3.3, 0.85, 7.25], [2.2, 4.4, 5.6, 6.25], [5.9, 3.3, 7.85, 5.65]])), M.pvc, () => V());
  // Flügelprofil
  const lift1 = (e1) => 3.4 * e1;
  add(extrude(shape([[1.3, 6.8], [8, 6.8], [8, 10.2], [2, 10.2], [2, 12.2], [1.3, 12.2]], [[1.55, 7.05, 3, 9.95], [3.3, 7.05, 6, 9.95], [6.3, 7.05, 7.75, 9.95]])), M.pvc, (e1) => V(0, lift1(e1)));
  // Glasleiste
  add(extrude(shape(rect(6.6, 10.2, 8, 12.2), [[6.85, 10.45, 7.75, 11.95]])), M.pvc, (e1, e2, e3) => V(3.2 * e3, lift1(e1) + 2.4 * e1));
  // Stahlverstärkungen (gleiten nach vorn aus dem Profil)
  const steelF = add(extrude(shape([[2.45, 0.6], [5.35, 0.6], [5.35, 3.85], [5.05, 3.85], [5.05, 0.9], [2.75, 0.9], [2.75, 3.85], [2.45, 3.85]])), M.steel, (e1, e2) => V(0, 0, 10 * e2));
  add(extrude(shape([[3.55, 7.3], [5.75, 7.3], [5.75, 9.7], [5.45, 9.7], [5.45, 7.6], [3.85, 7.6], [3.85, 9.7], [3.55, 9.7]])), M.steel, (e1, e2) => V(0, lift1(e1), 8 * e2));
  // Dreifach-Isolierglas + Abstandhalter
  const glassLift = (e1) => lift1(e1) + 2.4 * e1;
  const panes = [[2.1, 2.5, -2.6], [4.0, 4.4, 0], [5.9, 6.3, 2.6]].map(([x0, x1, dx]) =>
    add(extrude(shape(rect(x0, 10.3, x1, 20.5))), M.glass, (e1, e2, e3) => V(dx * e3, glassLift(e1))));
  [[2.5, 4.0, -1.3], [4.4, 5.9, 1.3]].forEach(([x0, x1, dx]) => add(extrude(shape(rect(x0, 10.3, x1, 11.0))), M.spacer, (e1, e2, e3) => V(dx * e3, glassLift(e1))));
  // Dichtungen
  const gOuter = add(extrude(shape(rect(1.98, 11.3, 2.12, 12.1))), M.gasket, (e1, e2, e3) => V(-4.2 * e3, glassLift(e1)));
  add(extrude(shape(rect(6.3, 10.9, 6.62, 11.7))), M.gasket, (e1, e2, e3) => V(4.4 * e3, glassLift(e1)));
  add(extrude(shape(rect(1.2, 6.9, 1.3, 7.5))), M.gasket, (e1, e2, e3) => V(-3.4 * e3, 1.7 * e1));
  add(extrude(shape(rect(4.6, 6.6, 5.0, 6.8))), M.gasket, (e1, e2, e3) => V(0, 1.7 * e1, 9 * e3));
  add(extrude(shape(rect(7.2, 6.0, 7.6, 6.8))), M.gasket, (e1, e2, e3) => V(3.4 * e3, 1.7 * e1));

  /* ---------- Licht ---------- */
  scene.add(new THREE.HemisphereLight(0xffffff, 0x0b1712, 0.8));
  const key = new THREE.DirectionalLight(0xffffff, 1.9);
  key.position.set(18, 30, 26);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xa8d45a, 1.4);
  rim.position.set(-20, 8, -16);
  scene.add(rim);

  /* ---------- Beschriftungen an 3D-Punkten ---------- */
  const labels = [...el.querySelectorAll('[data-label]')].map((node) => ({ node, ...{
    chambers: { mesh: frame, p: V(7.0, 5.0, L) },
    steel: { mesh: steelF, p: V(5.35, 3.4, L) },
    gasket: { mesh: gOuter, p: V(2.05, 11.9, L) },
    glass: { mesh: panes[2], p: V(6.3, 18, L) },
  }[node.dataset.label] }));
  const tmp = new THREE.Vector3();

  let dist = 46;
  s.onResize(({ w, h }) => { const a = w / h; dist = a < 0.8 ? 64 : a < 1.1 ? 54 : 46; });

  let p = 0;
  s.onTick((dt) => {
    ptr.update(dt);
    const target = story ? +story.dataset.progress || 0 : 0;
    p += (target - p) * (1 - Math.exp(-dt * 6));
    const e1 = smooth(p, 0.2, 0.45), e2 = smooth(p, 0.45, 0.68), e3 = smooth(p, 0.7, 0.92);
    for (const m of parts) m.position.copy(m.userData.move(e1, e2, e3));
    // Kamera umkreist das Profil leicht, während es sich öffnet
    const ang = lerp(0.36, 0.78, p) + (reduced ? 0 : ptr.x * 0.12);
    const elev = lerp(0.26, 0.4, p) + (reduced ? 0 : ptr.y * -0.06);
    const d = dist * (1 + 0.12 * e1 + 0.18 * e2 + 0.14 * e3);
    camera.position.set(Math.sin(ang) * d * Math.cos(elev), Math.sin(elev) * d + 2, Math.cos(ang) * d * Math.cos(elev));
    camera.lookAt(lerp(0, -1, e2), lerp(0, 2.2, e1), lerp(0, 4.5, e2));
    pivot.rotation.y = -0.15;
    pivot.updateMatrixWorld();
    for (const l of labels) {
      if (!l.mesh) continue;
      tmp.copy(l.p);
      l.mesh.localToWorld(tmp);
      tmp.project(camera);
      const x = (tmp.x * 0.5 + 0.5) * s.size.w, y = (-tmp.y * 0.5 + 0.5) * s.size.h;
      l.node.style.transform = `translate(${(x - 12).toFixed(1)}px, ${(y - 14).toFixed(1)}px)`;
    }
  });
  s.start();
}
