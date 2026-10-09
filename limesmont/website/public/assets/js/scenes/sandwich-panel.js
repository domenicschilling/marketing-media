// Interaktives Sandwichpaneel: Typ, Kerndicke, Farbe, Explosionsansicht. Ziehen dreht das Modell.
// Maßeinheit: 1 = 10 mm. Querschnitt in XY, Paneel läuft entlang Z.
import { setup, reduced } from './common.js';

export default function sandwichPanel(el) {
  const s = setup(el, { fov: 30, exposure: 1.1, envIntensity: 1 });
  const { THREE, scene, camera } = s;
  const W = 100, LEN = 60, TH = 0.4;

  const state = Object.assign({ type: 'wall', thickness: 100, color: '#E4E7DA', exploded: false }, JSON.parse(el.dataset.config || '{}'));
  let T = state.thickness / 10; // aktuelle (animierte) Kerndicke
  let explode = 1; // Start: auseinandergezogen, fügt sich dann zusammen

  // Oberseite: Trapezprofil (Dach) oder Mikroliniert (Wand)
  const profile = (type) => {
    const pts = [[0, 0]];
    if (type === 'roof') for (const c of [16.7, 50, 83.3]) pts.push([c - 9, 0], [c - 3, 4], [c + 3, 4], [c + 9, 0]);
    else for (let x = 10; x < W; x += 10) pts.push([x - 1, 0], [x - 0.5, -0.25], [x + 0.5, -0.25], [x + 1, 0]);
    pts.push([W, 0]);
    return pts;
  };
  const shapeFrom = (pts) => new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const ex = (sh) => new THREE.ExtrudeGeometry(sh, { depth: LEN, bevelEnabled: false });
  const sheetGeo = (pts) => ex(shapeFrom([...pts, ...pts.map(([x, y]) => [x, y + TH]).reverse()]));
  const coreGeo = (pts, t) => ex(shapeFrom([[0, -t], [W, -t], ...pts.slice().reverse()]));

  // Schaumstruktur für die Schnittfläche des Kerns
  const foam = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#e6c066'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2200; i++) {
      const r = Math.random() * 2.2 + 0.4;
      g.fillStyle = `rgba(${Math.random() < 0.5 ? '150,110,30' : '255,236,170'},${0.15 + Math.random() * 0.25})`;
      g.beginPath(); g.arc(Math.random() * 256, Math.random() * 256, r, 0, 7); g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(0.08, 0.08);
    return t;
  })();

  const sheetMat = [new THREE.MeshStandardMaterial({ metalness: 0.55, roughness: 0.4 }), new THREE.MeshStandardMaterial({ metalness: 0.45, roughness: 0.42 })];
  const linerMat = [new THREE.MeshStandardMaterial({ color: 0xdcdfd6, metalness: 0.5, roughness: 0.4 }), new THREE.MeshStandardMaterial({ color: 0xe8eae3, metalness: 0.4, roughness: 0.45 })];
  const coreMat = [new THREE.MeshStandardMaterial({ map: foam, roughness: 0.95 }), new THREE.MeshStandardMaterial({ color: 0xe2bb5f, roughness: 0.9 })];
  const setColor = (hex) => { sheetMat[0].color.set(hex).offsetHSL(0, 0, 0.06); sheetMat[1].color.set(hex); };
  setColor(state.color);

  const pivot = new THREE.Group();
  const model = new THREE.Group();
  model.position.set(-W / 2, 0, -LEN / 2);
  pivot.add(model);
  scene.add(pivot);

  let pts = profile(state.type);
  const top = new THREE.Mesh(sheetGeo(pts), sheetMat);
  const core = new THREE.Mesh(coreGeo(pts, T), coreMat);
  const liner = new THREE.Mesh(ex(shapeFrom([[0, -TH], [W, -TH], [W, 0], [0, 0]])), linerMat);
  model.add(top, core, liner);
  let builtT = T;
  const rebuild = () => {
    top.geometry.dispose(); top.geometry = sheetGeo(pts);
    core.geometry.dispose(); core.geometry = coreGeo(pts, T);
    builtT = T;
  };

  scene.add(new THREE.HemisphereLight(0xffffff, 0x10221a, 0.85));
  const key = new THREE.DirectionalLight(0xffffff, 2);
  key.position.set(80, 140, 120);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xa8d45a, 1.2);
  rim.position.set(-120, 40, -80);
  scene.add(rim);

  el.addEventListener('config', (e) => {
    const n = e.detail;
    if (n.type !== state.type) { state.type = n.type; pts = profile(n.type); rebuild(); }
    if (n.color !== state.color) setColor(n.color);
    Object.assign(state, n);
  });

  // Ziehen zum Drehen (mit Nachlauf); vertikales Scrollen bleibt auf Touch möglich
  let rotY = -0.55, vel = 0, dragging = false, lastX = 0, idleT = 0;
  el.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointermove', (e) => { if (!dragging) return; const dx = e.clientX - lastX; lastX = e.clientX; vel = dx * 0.006; rotY += vel; idleT = 0; });
  const end = () => (dragging = false);
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);

  let dist = 150;
  s.onResize(({ w, h }) => { const a = w / h; dist = a < 0.9 ? 215 : a < 1.2 ? 175 : 150; });

  s.onTick((dt) => {
    const k = 1 - Math.exp(-dt * 5);
    const tT = state.thickness / 10;
    T += (tT - T) * k;
    if (Math.abs(T - builtT) > 0.02) rebuild();
    explode += ((state.exploded ? 1 : 0) - explode) * (1 - Math.exp(-dt * (state.exploded ? 5 : 2.2)));
    top.position.y = 10 * explode;
    liner.position.y = -T - 10 * explode;
    if (!dragging) {
      vel *= Math.pow(0.04, dt);
      rotY += vel;
      idleT += dt;
      if (!reduced && idleT > 2.5) rotY += dt * 0.08;
    }
    pivot.rotation.y = rotY;
    const cy = -T / 2;
    camera.position.set(0, cy + dist * 0.42, dist);
    camera.lookAt(0, cy, 0);
  });
  s.start();
}
