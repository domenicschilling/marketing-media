// Gemeinsame Basis für alle 3D-Szenen (Three.js r170, lokal eingebunden)
import * as THREE from '../vendor/three.module.min.js';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';

export { THREE };
export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const ease = {
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t) => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};

export function setup(el, { fov = 35, exposure = 1, envIntensity = 0.8 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  el.prepend(canvas);
  const mobile = innerWidth < 768;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile || devicePixelRatio < 2, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.6 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = envIntensity;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 200);
  const ticks = [];
  const size = { w: 1, h: 1 };
  let visible = true;

  const resize = () => {
    const r = el.getBoundingClientRect();
    size.w = Math.max(1, Math.round(r.width));
    size.h = Math.max(1, Math.round(r.height));
    renderer.setSize(size.w, size.h, false);
    camera.aspect = size.w / size.h;
    camera.updateProjectionMatrix();
    onResize.forEach((f) => f(size));
  };
  const onResize = [];
  new ResizeObserver(resize).observe(el);
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(el);

  const clock = new THREE.Clock();
  const loop = () => {
    requestAnimationFrame(loop);
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!visible || document.hidden) return;
    for (const f of ticks) f(dt, clock.elapsedTime);
    renderer.render(scene, camera);
  };

  return {
    THREE, renderer, scene, camera, size,
    onTick: (f) => ticks.push(f),
    onResize: (f) => onResize.push(f),
    start() { resize(); requestAnimationFrame(loop); requestAnimationFrame(() => el.classList.add('scene-ready')); },
  };
}

// Mausposition relativ zu einem Element (-1 … 1), sanft nachgeführt
export function pointer(target) {
  const p = { x: 0, y: 0, tx: 0, ty: 0 };
  target.addEventListener('pointermove', (e) => {
    const r = target.getBoundingClientRect();
    p.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
    p.ty = ((e.clientY - r.top) / r.height) * 2 - 1;
  }, { passive: true });
  target.addEventListener('pointerleave', () => { p.tx = 0; p.ty = 0; });
  p.update = (dt) => { const k = 1 - Math.exp(-dt * 4); p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k; };
  return p;
}

// Weicher Bodenschatten + feines Raster als Textur (kein Echtzeitschatten nötig)
export function groundTexture({ grid = true, lineColor = '155,192,79' } = {}) {
  const c = document.createElement('canvas');
  c.width = c.height = 1024;
  const g = c.getContext('2d');
  const rg = g.createRadialGradient(512, 512, 0, 512, 512, 512);
  rg.addColorStop(0, 'rgba(0,0,0,0.55)');
  rg.addColorStop(0.35, 'rgba(0,0,0,0.25)');
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg;
  g.fillRect(0, 0, 1024, 1024);
  if (grid) {
    for (let i = 0; i <= 1024; i += 64) {
      for (const [x1, y1, x2, y2] of [[i, 0, i, 1024], [0, i, 1024, i]]) {
        const grad = g.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, `rgba(${lineColor},0)`);
        grad.addColorStop(0.5, `rgba(${lineColor},${0.22 * (1 - Math.abs(i - 512) / 560)})`);
        grad.addColorStop(1, `rgba(${lineColor},0)`);
        g.strokeStyle = grad;
        g.lineWidth = 2;
        g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
      }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
