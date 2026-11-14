// ULTRON – Kommandobrücke in 3D: Ultron in der Mitte, sein Team aus Schurken im Kreis um ihn.
// Eigene, originelle Figuren aus Grundformen (keine fremden Figuren/Logos). three.js wird erst geladen,
// wenn der Team-Reiter geöffnet wird (ca. 170 KB). Spart Akku: läuft nur, solange die Brücke zu sehen ist.
export const THREE_URL = "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.module.min.js";
let T = null;
export async function ladeThree() { if (!T) T = await import(THREE_URL); return T; }

const ROT = 0xff1a0d;
const statusFarbe = (s) => (s.fehler ? 0xff2a2a : s.note == null ? 0x7b8896 : s.note >= 7 ? 0x2bd96b : s.note >= 4 ? 0xffb020 : 0xff4a3a);

// ---------- Bausteine ----------
let glutTextur = null;
function glut() {
  if (glutTextur) return glutTextur;
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const x = c.getContext("2d"), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.25, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  glutTextur = new T.CanvasTexture(c); glutTextur.colorSpace = T.SRGBColorSpace;
  return glutTextur;
}
function leuchten(farbe, groesse, staerke = 1) {
  const s = new T.Sprite(new T.SpriteMaterial({ map: glut(), color: farbe, blending: T.AdditiveBlending, transparent: true, depthWrite: false, opacity: staerke, toneMapped: false }));
  s.scale.setScalar(groesse); return s;
}
const add = (eltern, kind) => (eltern.add(kind), kind);
const m = (geo, mat, x = 0, y = 0, z = 0) => { const k = new T.Mesh(geo, mat); k.position.set(x, y, z); return k; };
function form(punkte, tiefe, bevel = 0) {
  const s = new T.Shape(); punkte.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath();
  const g = new T.ExtrudeGeometry(s, { depth: tiefe, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1 });
  return g;
}
const spiegel = (p) => [...p, ...p.slice(1, -1).reverse().map(([x, y]) => [-x, y])];

// Umgebungslicht für Metall-Spiegelungen (ohne Zusatzdateien)
function umgebung(renderer) {
  const s = new T.Scene(); s.background = new T.Color(0x050608);
  const flaeche = (farbe, st, w, h, pos, blick) => { const p = m(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(farbe).multiplyScalar(st), side: T.DoubleSide })); p.position.set(...pos); p.lookAt(...blick); s.add(p); };
  flaeche(0xffffff, 1.5, 6, 6, [0, 6, 2], [0, 0, 0]);
  flaeche(0xff2a1a, 3.0, 4, 8, [6, 0, -3], [0, 0, 0]);
  flaeche(0x5a7cff, 0.55, 4, 6, [-6, 1, 2], [0, 0, 0]);
  flaeche(0xffffff, 0.7, 10, 2, [0, -1, 7], [0, 0, 0]);
  const pm = new T.PMREMGenerator(renderer); const tex = pm.fromScene(s, 0.03).texture; pm.dispose();
  return tex;
}
function stoffe(akzent = ROT) {
  return {
    metall: new T.MeshStandardMaterial({ color: 0x7f8996, metalness: 0.95, roughness: 0.34, flatShading: true }),
    dunkel: new T.MeshStandardMaterial({ color: 0x23272f, metalness: 0.85, roughness: 0.42, flatShading: true }),
    akzent: new T.MeshStandardMaterial({ color: akzent, metalness: 0.6, roughness: 0.32, flatShading: true, emissive: akzent, emissiveIntensity: 0.18 }),
    glut: new T.MeshBasicMaterial({ color: akzent, toneMapped: false }),
    glutRot: new T.MeshBasicMaterial({ color: ROT, toneMapped: false }),
    schwachRot: new T.MeshBasicMaterial({ color: 0xa0140a, toneMapped: false }),
  };
}

// ---------- Ultron: facettierter Stahlschädel, Kamm, Klingen-Hörner, Schlitzaugen, Gitter-Mund, Reaktor-Kern ----------
export function baueUltron() {
  const S = stoffe(ROT);
  const g = new T.Group(), kopf = new T.Group(); g.add(kopf);
  const profil = [[0, -1.3], [0.34, -1.24], [0.54, -0.98], [0.68, -0.52], [0.82, -0.02], [0.87, 0.42], [0.8, 0.82], [0.6, 1.1], [0.3, 1.27], [0, 1.31]].map(([x, y]) => new T.Vector2(x, y));
  const schaedel = m(new T.LatheGeometry(profil, 9), S.metall); schaedel.scale.set(1, 1, 0.82); schaedel.rotation.y = Math.PI / 9; kopf.add(schaedel);
  // Gesichtsplatte mit V-Stirn
  const platte = m(form(spiegel([[0, 0.3], [0.3, 0.42], [0.68, 0.6], [0.71, 0.3], [0.63, -0.1], [0.5, -0.56], [0.3, -0.92], [0, -1.1]]), 0.3, 0.025), S.dunkel, 0, 0, 0.44); kopf.add(platte);
  // Augen: schräge Schlitze (böse), leuchtend
  const augeL = [[-0.13, 0.1], [-0.5, 0.27], [-0.54, 0.18], [-0.16, 0.02]];
  const augen = [m(form(augeL, 0.03), S.glutRot, 0, 0, 0.76), m(form(augeL.map(([x, y]) => [-x, y]).reverse(), 0.03), S.glutRot, 0, 0, 0.76)];
  augen.forEach((a) => kopf.add(a));
  const glutL = leuchten(0xff2010, 1.0), glutR = leuchten(0xff2010, 1.0); glutL.position.set(-0.33, 0.15, 0.85); glutR.position.set(0.33, 0.15, 0.85); kopf.add(glutL, glutR);
  // Mund: Schlitz + Gitter
  kopf.add(m(new T.BoxGeometry(0.44, 0.03, 0.02), S.schwachRot, 0, -0.5, 0.76));
  for (let i = -2; i <= 2; i++) kopf.add(m(new T.BoxGeometry(0.03, 0.24, 0.02), S.schwachRot, i * 0.085, -0.68, 0.76));
  // Wangen-Schlitze
  for (const s of [-1, 1]) { const w = m(new T.BoxGeometry(0.22, 0.025, 0.02), S.schwachRot, s * 0.47, -0.2, 0.72); w.rotation.z = s * -0.6; kopf.add(w); }
  // Kamm auf dem Kopf
  const kamm = m(form([[0.35, 1.12], [0.05, 1.64], [-0.55, 1.76], [-1.02, 1.26], [-0.55, 1.16]], 0.16, 0.02), S.dunkel); kamm.geometry.translate(0, 0, -0.08); kamm.rotation.y = -Math.PI / 2; kopf.add(kamm);
  for (let i = 0; i < 3; i++) kopf.add(m(new T.BoxGeometry(0.1, 0.03, 0.1), S.glutRot, 0, 1.52 - i * 0.06 + (i === 0 ? 0.06 : 0), 0.05 - i * 0.32));
  // Klingen-Hörner (je Seite zwei)
  for (const s of [-1, 1]) for (const [gr, dy] of [[1, 0], [0.72, -0.24]]) {
    const h = m(form([[0, 0], [1.1, 0.56], [1.26, 0.64], [0.2, -0.12]], 0.05), S.metall, s * 0.74, 0.45 + dy, -0.12);
    h.scale.setScalar(gr); h.rotation.y = s > 0 ? Math.PI / 3 : (2 * Math.PI) / 3; kopf.add(h);
  }
  // Ohr-Empfänger
  for (const s of [-1, 1]) { const o = m(new T.CylinderGeometry(0.22, 0.26, 0.16, 6), S.dunkel, s * 0.83, 0.12, 0); o.rotation.z = Math.PI / 2; kopf.add(o); const r = m(new T.TorusGeometry(0.15, 0.025, 4, 6), S.glutRot, s * 0.92, 0.12, 0); r.rotation.y = Math.PI / 2; kopf.add(r); }
  // Hals + Kabel
  g.add(m(new T.CylinderGeometry(0.3, 0.4, 0.6, 8), S.dunkel, 0, -1.5, -0.05));
  for (let i = 0; i < 4; i++) { const k = m(new T.CylinderGeometry(0.045, 0.045, 0.75, 5), S.metall, Math.cos(i * 1.57 + 0.78) * 0.36, -1.5, Math.sin(i * 1.57 + 0.78) * 0.28); k.rotation.z = (i % 2 ? 1 : -1) * 0.18; g.add(k); }
  // Brustkorb
  const brust = m(new T.CylinderGeometry(1.08, 0.62, 1.5, 6), S.dunkel, 0, -2.35, 0); brust.scale.z = 0.62; g.add(brust);
  for (const s of [-1, 1]) { const p = m(new T.BoxGeometry(0.72, 0.62, 0.12), S.metall, s * 0.4, -2.08, 0.5); p.rotation.set(0.12, s * 0.42, s * 0.16); g.add(p); }
  // Schulterpanzer mit Dornen
  for (const s of [-1, 1]) {
    const sp = m(new T.SphereGeometry(0.62, 7, 5, 0, Math.PI * 2, 0, Math.PI / 2), S.metall, s * 1.25, -1.86, 0); sp.scale.set(1, 0.85, 0.9); sp.rotation.z = s * -0.38; g.add(sp);
    for (let i = 0; i < 3; i++) { const d = m(new T.ConeGeometry(0.09, 0.72 - i * 0.12, 4), S.metall, s * (1.1 + i * 0.2), -1.42 - i * 0.08, -0.18 + i * 0.14); d.rotation.z = s * -(0.55 + i * 0.22); g.add(d); }
  }
  // Reaktor-Kern
  const kern = m(new T.CylinderGeometry(0.24, 0.24, 0.07, 6), S.glutRot, 0, -2.02, 0.66); kern.rotation.x = Math.PI / 2; g.add(kern);
  const kernGlut = leuchten(0xff2a1a, 1.5); kernGlut.position.set(0, -2.02, 0.76); g.add(kernGlut);
  const licht = new T.PointLight(0xff2a1a, 6, 6, 1.6); licht.position.set(0, -2.0, 1.2); g.add(licht);
  g.userData = { kopf, augen: [glutL, glutR], kernGlut, licht, id: "ultron" };
  return g;
}

// ---------- Schurken: eigene Silhouette je Abteilung ----------
export function baueSchurke(p, s = {}) {
  const S = stoffe(p.akzent);
  const g = new T.Group(), dreh = [], schweben = [], flammen = [], augen = [];
  const level = s.level || 1;
  // Sockel + Aura (Farbe = Kraft/Note)
  g.add(m(new T.CylinderGeometry(0.5, 0.58, 0.1, 6), S.dunkel, 0, 0.05, 0));
  const aura = m(new T.RingGeometry(0.6, 0.72, 32), new T.MeshBasicMaterial({ color: statusFarbe(s), transparent: true, opacity: 0.85, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false }), 0, 0.02, 0);
  aura.rotation.x = -Math.PI / 2; g.add(aura);
  const figur = new T.Group(); g.add(figur);
  let brustY = 0.95, kopfY = 1.45;
  if (p.koerper === "robe") { figur.add(m(new T.ConeGeometry(0.46, 1.15, 6), S.dunkel, 0, 0.67, 0)); figur.add(m(new T.CylinderGeometry(0.27, 0.32, 0.08, 6), S.akzent, 0, 0.92, 0)); brustY = 1.0; kopfY = 1.42; }
  else if (p.koerper === "brawler") { for (const x of [-0.17, 0.17]) figur.add(m(new T.BoxGeometry(0.2, 0.52, 0.24), S.dunkel, x, 0.36, 0)); figur.add(m(new T.BoxGeometry(0.78, 0.6, 0.42), S.dunkel, 0, 0.92, 0)); figur.add(m(new T.BoxGeometry(0.46, 0.3, 0.06), S.akzent, 0, 0.98, 0.22)); for (const x of [-0.5, 0.5]) figur.add(m(new T.BoxGeometry(0.16, 0.5, 0.18), S.metall, x, 0.82, 0)); kopfY = 1.48; }
  else if (p.koerper === "tank") { figur.add(m(new T.BoxGeometry(0.92, 0.36, 0.62), S.dunkel, 0, 0.3, 0)); for (const x of [-0.48, 0.48]) add(figur, m(new T.CylinderGeometry(0.17, 0.17, 0.66, 6), S.metall, x, 0.26, 0)).rotation.x = Math.PI / 2; figur.add(m(new T.BoxGeometry(0.66, 0.46, 0.44), S.dunkel, 0, 0.78, 0)); figur.add(m(new T.BoxGeometry(0.3, 0.1, 0.05), S.akzent, 0, 0.82, 0.23)); brustY = 0.8; kopfY = 1.22; }
  else if (p.koerper === "orb") { const k = m(new T.IcosahedronGeometry(0.4, 0), S.dunkel, 0, 1.05, 0); figur.add(k); add(figur, m(new T.TorusGeometry(0.44, 0.04, 4, 8), S.akzent, 0, 1.05, 0)).rotation.x = Math.PI / 2; brustY = 1.05; kopfY = 1.05; schweben.push(figur); }
  else { for (const x of [-0.12, 0.12]) figur.add(m(new T.CylinderGeometry(0.06, 0.08, 0.55, 5), S.metall, x, 0.36, 0)); figur.add(m(new T.CylinderGeometry(0.24, 0.3, 0.66, 6), S.dunkel, 0, 0.95, 0)); add(figur, m(new T.TorusGeometry(0.25, 0.03, 4, 6), S.akzent, 0, 1.12, 0)).rotation.x = Math.PI / 2; kopfY = 1.48; }
  // Kopf
  const kopf = new T.Group(); kopf.position.y = kopfY; figur.add(kopf);
  let gesichtZ = 0.24;
  if (p.kopf === "helm") { const h = m(new T.SphereGeometry(0.25, 7, 5), S.metall); h.scale.set(1, 1.15, 1); kopf.add(h); add(kopf, m(form([[0.05, 0.1], [-0.05, 0.42], [-0.3, 0.28], [-0.2, 0.08]], 0.04), S.akzent)).rotation.y = -Math.PI / 2; }
  else if (p.kopf === "box") { kopf.add(m(new T.BoxGeometry(0.4, 0.34, 0.36), S.metall)); gesichtZ = 0.19; }
  else if (p.kopf === "oct") { const o = m(new T.OctahedronGeometry(0.3, 0), S.metall); o.scale.set(0.9, 1.15, 0.9); kopf.add(o); gesichtZ = 0.2; }
  else if (p.kopf === "dome") { kopf.add(m(new T.CylinderGeometry(0.26, 0.24, 0.18, 8), S.metall, 0, -0.04, 0)); kopf.add(m(new T.SphereGeometry(0.25, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), new T.MeshStandardMaterial({ color: p.akzent, transparent: true, opacity: 0.45, metalness: 0.2, roughness: 0.1, emissive: p.akzent, emissiveIntensity: 0.35 }), 0, 0.05, 0)); gesichtZ = 0.25; }
  // Augen
  const augY = p.kopf === "dome" ? -0.03 : 0;
  if (p.koerper === "orb" || p.augen === "zyklop") { const a = m(new T.SphereGeometry(p.koerper === "orb" ? 0.12 : 0.075, 8, 6), S.glut, 0, augY, p.koerper === "orb" ? 0.36 : gesichtZ); kopf.add(a); augen.push(a); const l = leuchten(p.akzent, 0.6); l.position.set(0, augY, (p.koerper === "orb" ? 0.36 : gesichtZ) + 0.05); kopf.add(l); augen.push(l); }
  else if (p.augen === "visier") { const a = m(new T.BoxGeometry(0.32, 0.05, 0.03), S.glut, 0, augY + 0.02, gesichtZ); kopf.add(a); augen.push(a); const l = leuchten(p.akzent, 0.55, 0.8); l.position.set(0, augY + 0.02, gesichtZ + 0.05); kopf.add(l); augen.push(l); }
  else for (const x of [-1, 1]) { const a = m(new T.BoxGeometry(0.1, 0.035, 0.03), S.glut, x * 0.09, augY + 0.03, gesichtZ); a.rotation.z = x * -0.4; kopf.add(a); augen.push(a); const l = leuchten(p.akzent, 0.3, 0.8); l.position.set(x * 0.09, augY + 0.03, gesichtZ + 0.04); kopf.add(l); augen.push(l); }
  // Rüstung wächst mit dem Level (gelernte Regeln)
  if (level >= 2 && p.koerper !== "orb") for (const x of [-1, 1]) { const sp = m(new T.SphereGeometry(0.17, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2), S.metall, x * (p.koerper === "brawler" ? 0.48 : 0.34), brustY + 0.24, 0); sp.rotation.z = x * -0.4; figur.add(sp); if (level >= 4) { const d = m(new T.ConeGeometry(0.045, 0.3, 4), S.akzent, x * (p.koerper === "brawler" ? 0.56 : 0.42), brustY + 0.4, 0); d.rotation.z = x * -0.6; figur.add(d); } }
  if (level >= 3 && p.koerper !== "orb") figur.add(m(new T.BoxGeometry(0.34, 0.26, 0.05), S.akzent, 0, brustY + 0.05, p.koerper === "brawler" ? 0.25 : p.koerper === "tank" ? 0.25 : 0.27));
  if (level >= 5) { const zacken = Math.min(level - 2, 6); for (let i = 0; i < zacken; i++) { const w = ((i - (zacken - 1) / 2) / Math.max(zacken - 1, 1)) * 1.4; const z = m(new T.ConeGeometry(0.035, 0.18, 4), S.glut, Math.sin(w) * 0.22, 0.3, Math.cos(w) * -0.05 - 0.05); z.rotation.z = -w * 0.5; kopf.add(z); } }
  // Erkennungsmerkmale
  const ex = new Set(p.extras || []);
  if (ex.has("schild")) { const sc = m(new T.CylinderGeometry(0.34, 0.34, 0.06, 6), S.akzent, -0.52, brustY - 0.05, 0.2); sc.rotation.set(Math.PI / 2, 0, 0); sc.rotation.y = 0.3; figur.add(sc); const st = m(new T.OctahedronGeometry(0.09, 0), S.glut, -0.5, brustY - 0.05, 0.27); figur.add(st); }
  if (ex.has("rotoren")) { const r = new T.Group(); r.position.y = 1.05; for (let i = 0; i < 4; i++) { const w = i * Math.PI / 2 + Math.PI / 4; add(r, m(new T.BoxGeometry(0.42, 0.03, 0.05), S.metall, Math.cos(w) * 0.42, 0.18, Math.sin(w) * 0.42)).rotation.y = -w; const ro = m(new T.CircleGeometry(0.17, 12), new T.MeshBasicMaterial({ color: p.akzent, transparent: true, opacity: 0.35, side: T.DoubleSide, depthWrite: false }), Math.cos(w) * 0.62, 0.2, Math.sin(w) * 0.62); ro.rotation.x = -Math.PI / 2; r.add(ro); add(r, m(new T.TorusGeometry(0.17, 0.02, 4, 12), S.metall, Math.cos(w) * 0.62, 0.2, Math.sin(w) * 0.62)).rotation.x = Math.PI / 2; } figur.add(r); dreh.push([r, 0.6]); }
  if (ex.has("hammer")) { const hm = new T.Group(); hm.position.set(0.48, brustY - 0.1, 0.1); hm.rotation.z = -0.35; hm.add(m(new T.CylinderGeometry(0.03, 0.03, 0.95, 5), S.dunkel, 0, 0.2, 0)); hm.add(m(new T.BoxGeometry(0.34, 0.18, 0.18), S.metall, 0, 0.66, 0)); hm.add(m(new T.BoxGeometry(0.36, 0.04, 0.2), S.akzent, 0, 0.66, 0)); figur.add(hm); }
  if (ex.has("umhang")) { const u = m(new T.PlaneGeometry(0.8, 1.05, 1, 3), new T.MeshStandardMaterial({ color: new T.Color(p.akzent).multiplyScalar(0.35), side: T.DoubleSide, roughness: 0.8, metalness: 0.1, flatShading: true }), 0, brustY - 0.25, -0.26); u.rotation.x = 0.16; figur.add(u); }
  if (ex.has("megafon")) { const mg = m(new T.CylinderGeometry(0.2, 0.05, 0.42, 8, 1, true), new T.MeshStandardMaterial({ color: p.akzent, metalness: 0.6, roughness: 0.3, side: T.DoubleSide, emissive: p.akzent, emissiveIntensity: 0.2 }), 0.5, brustY + 0.15, 0.25); mg.rotation.set(Math.PI / 2, 0, 0); mg.rotation.y = -0.5; figur.add(mg); }
  if (ex.has("antennen")) for (const x of [-1, 1]) { add(kopf, m(new T.CylinderGeometry(0.012, 0.012, 0.36, 4), S.metall, x * 0.13, 0.32, -0.02)).rotation.z = x * -0.25; const k = m(new T.SphereGeometry(0.04, 6, 4), S.glut, x * 0.18, 0.5, -0.02); kopf.add(k); augen.push(k); }
  if (ex.has("koepfe")) for (const x of [-1, 1]) { const k = m(new T.OctahedronGeometry(0.14, 0), S.metall, x * 0.4, brustY + 0.45, -0.05); figur.add(k); const a = m(new T.BoxGeometry(0.12, 0.025, 0.02), S.glut, x * 0.4, brustY + 0.46, 0.08); figur.add(a); augen.push(a); }
  if (ex.has("wuerfel")) { const w = new T.Group(); w.position.y = kopfY; for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; const c = m(new T.BoxGeometry(0.1, 0.1, 0.1), S.akzent, Math.cos(a) * 0.48, 0.1 * (i - 1), Math.sin(a) * 0.48); c.rotation.set(0.6, 0.6, 0); w.add(c); } figur.add(w); dreh.push([w, 1.2]); }
  if (ex.has("linse")) { const l = m(new T.TorusGeometry(0.14, 0.025, 5, 16), S.akzent, 0.07, 0.02, gesichtZ + 0.05); kopf.add(l); const gl = m(new T.CircleGeometry(0.13, 16), new T.MeshBasicMaterial({ color: p.akzent, transparent: true, opacity: 0.28 }), 0.07, 0.02, gesichtZ + 0.05); kopf.add(gl); }
  if (ex.has("ringe")) { for (let i = 0; i < 2; i++) { const r = new T.Group(); r.position.y = brustY; r.rotation.set(i ? 0.5 : -0.4, 0, i ? 0.3 : -0.2); r.add(m(new T.TorusGeometry(0.56 - i * 0.08, 0.018, 4, 24), S.glut)); figur.add(r); dreh.push([r, i ? -0.9 : 0.7]); } }
  if (ex.has("kamera")) { const l = m(new T.CylinderGeometry(0.11, 0.13, 0.22, 10), S.dunkel, 0, 0, gesichtZ + 0.08); l.rotation.x = Math.PI / 2; kopf.add(l); kopf.add(m(new T.BoxGeometry(0.22, 0.22, 0.05), S.akzent, 0.18, 0.2, -0.08)); }
  if (ex.has("feder")) { const f = m(new T.ConeGeometry(0.06, 0.8, 4), new T.MeshStandardMaterial({ color: 0xf2e6c8, metalness: 0.2, roughness: 0.6, flatShading: true }), 0.42, brustY + 0.2, 0.15); f.rotation.z = -0.5; figur.add(f); }
  if (ex.has("flamme")) for (let i = 0; i < 3; i++) { const f = m(new T.ConeGeometry(0.09 - i * 0.02, 0.36 - i * 0.06, 5), new T.MeshBasicMaterial({ color: [0xff5a1f, 0xffa020, 0xffe08a][i], transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false }), (i - 1) * 0.08, 0.32, 0); kopf.add(f); flammen.push(f); }
  if (ex.has("kristall")) { const k = m(new T.OctahedronGeometry(0.15, 0), new T.MeshStandardMaterial({ color: p.akzent, emissive: p.akzent, emissiveIntensity: 0.6, metalness: 0.3, roughness: 0.1, flatShading: true }), 0.5, brustY + 0.35, 0.1); k.scale.set(0.7, 1.4, 0.7); figur.add(k); dreh.push([k, 1.5]); const l = leuchten(p.akzent, 0.6, 0.7); l.position.copy(k.position); figur.add(l); }
  if (ex.has("tor")) for (const x of [-1, 1]) { g.add(m(new T.BoxGeometry(0.08, 1.3, 0.08), S.metall, x * 0.62, 0.65, -0.1)); const k = m(new T.OctahedronGeometry(0.07, 0), S.glut, x * 0.62, 1.36, -0.1); g.add(k); augen.push(k); }
  if (ex.has("zahnrad")) { const z = new T.Group(); z.position.set(0, brustY + 0.15, -0.28); const ring = m(new T.CylinderGeometry(0.3, 0.3, 0.06, 10), S.akzent); ring.rotation.x = Math.PI / 2; z.add(ring); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; const t = m(new T.BoxGeometry(0.08, 0.1, 0.06), S.akzent, Math.cos(a) * 0.34, Math.sin(a) * 0.34, 0); t.rotation.z = a; z.add(t); } figur.add(z); dreh.push([z, 0.8, "z"]); }
  if (ex.has("hut")) { kopf.add(m(new T.CylinderGeometry(0.42, 0.42, 0.03, 12), S.akzent, 0, 0.24, 0)); kopf.add(m(new T.CylinderGeometry(0.19, 0.24, 0.2, 8), S.akzent, 0, 0.35, 0)); }
  // Kern
  const kern = leuchten(p.akzent, 0.5, 0.9); kern.position.set(0, brustY, 0.3); figur.add(kern);
  // Treffer-Fläche fürs Antippen
  const hit = m(new T.CylinderGeometry(0.75, 0.75, 2.1, 8), new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), 0, 1.0, 0); hit.userData.treffer = true; g.add(hit);
  const groesse = 0.88 + Math.min(s.laeufe || 0, 30) * 0.006;
  figur.scale.setScalar(groesse);
  g.userData = { id: s.id, aura, augen, dreh, schweben, flammen, figur, kern, hoehe: (kopfY + 0.45) * groesse };
  return g;
}

// ---------- Die Brücke ----------
export async function starteBruecke(huelle, { onWahl, reduziert = false } = {}) {
  await ladeThree();
  const canvas = huelle.querySelector("canvas"), schilder = huelle.querySelector(".bruecke-labels");
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.35;
  const scene = new T.Scene(); scene.environment = umgebung(renderer); scene.fog = new T.Fog(0x000000, 16, 30);
  const kamera = new T.PerspectiveCamera(38, 1, 0.1, 80); const ziel = new T.Vector3(0, -1.0, 0);
  scene.add(new T.HemisphereLight(0x8899bb, 0x1a0505, 0.7));
  const key = new T.DirectionalLight(0xffffff, 2.0); key.position.set(-4, 9, 9); scene.add(key);
  const rand = new T.DirectionalLight(0xff2a1a, 2.6); rand.position.set(0, 3, -8); scene.add(rand);
  const fuell = new T.DirectionalLight(0x4a6bff, 0.6); fuell.position.set(-8, 0, 2); scene.add(fuell);

  const BODEN = -3.2, R1 = 3.9, R2 = 5.3;
  // Holo-Boden
  const gitter = new T.PolarGridHelper(7.4, 16, 6, 64, 0x6a1410, 0x2a0907); gitter.position.y = BODEN; gitter.material.transparent = true; gitter.material.opacity = 0.55; scene.add(gitter);
  const ringMat = (op) => new T.MeshBasicMaterial({ color: ROT, transparent: true, opacity: op, side: T.DoubleSide, blending: T.AdditiveBlending, depthWrite: false });
  for (const [r, op] of [[R1, 0.55], [R2, 0.3], [1.9, 0.8]]) { const ri = m(new T.RingGeometry(r - 0.03, r + 0.03, 128), ringMat(op), 0, BODEN + 0.01, 0); ri.rotation.x = -Math.PI / 2; scene.add(ri); }
  const sockel = m(new T.CylinderGeometry(1.45, 1.75, 0.3, 6), stoffe().dunkel, 0, BODEN + 0.15, 0); scene.add(sockel);
  // Funken
  const N = 140, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const a = Math.random() * Math.PI * 2, r = 1.5 + Math.random() * 6; pos.set([Math.cos(a) * r, BODEN + Math.random() * 7, Math.sin(a) * r], i * 3); }
  const funkGeo = new T.BufferGeometry(); funkGeo.setAttribute("position", new T.BufferAttribute(pos, 3));
  const funken = new T.Points(funkGeo, new T.PointsMaterial({ color: 0xff5040, size: 0.06, transparent: true, opacity: 0.75, blending: T.AdditiveBlending, depthWrite: false })); scene.add(funken);

  const ultron = baueUltron(); ultron.position.y = 0.05; scene.add(ultron);
  const kreis = new T.Group(); scene.add(kreis);
  let figuren = [], linien = [], signatur = "", gewaehlt = null, strahl = null;
  let drehung = 0, drehZiel = null, tempo = reduziert ? 0 : 0.07;

  function leeren() {
    kreis.traverse((o) => { o.geometry?.dispose?.(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((x) => x.dispose()); });
    kreis.clear(); figuren = []; linien = []; schilder.innerHTML = ""; strahl = null;
  }
  function baue(liste, neue) {
    leeren();
    const chefs = liste.filter((t) => !t.chef || !liste.some((x) => x.id === t.chef));
    const winkel = new Map();
    chefs.forEach((t, i) => winkel.set(t.id, (i / chefs.length) * Math.PI * 2));
    const unter = new Map(); for (const t of liste) if (!chefs.includes(t)) (unter.get(t.chef) || unter.set(t.chef, []).get(t.chef)).push(t);
    const platz = [];
    for (const t of chefs) platz.push({ t, a: winkel.get(t.id), r: R1, gr: 1 });
    for (const [chef, l] of unter) l.forEach((t, j) => platz.push({ t, a: winkel.get(chef) + (j - (l.length - 1) / 2) * 0.19, r: R2, gr: 0.78, chef }));
    platz.forEach(({ t, a, r, gr, chef }, i) => {
      const f = baueSchurke(t.profil, t); f.position.set(Math.sin(a) * r, BODEN, Math.cos(a) * r); f.rotation.y = a; f.scale.setScalar(gr);
      f.userData.winkel = a; f.userData.t = t; f.userData.gr = gr; f.userData.chef = chef;
      if (neue.has(t.id) && !reduziert) { f.userData.erscheint = -0.4 - i * 0.05; f.scale.setScalar(0.001); const b = m(new T.CylinderGeometry(0.32, 0.6, 7, 16, 1, true), new T.MeshBasicMaterial({ color: t.profil.akzent, transparent: true, opacity: 0.45, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }), 0, 3.5, 0); f.add(b); f.userData.beam = b; }
      kreis.add(f); figuren.push(f);
      const von = chef ? new T.Vector3(Math.sin(winkel.get(chef)) * R1, BODEN + 0.04, Math.cos(winkel.get(chef)) * R1) : new T.Vector3(Math.sin(a) * 1.9, BODEN + 0.04, Math.cos(a) * 1.9);
      const lg = new T.BufferGeometry().setFromPoints([von, new T.Vector3(Math.sin(a) * (r - 0.65 * gr), BODEN + 0.04, Math.cos(a) * (r - 0.65 * gr))]);
      const ln = new T.Line(lg, new T.LineBasicMaterial({ color: t.fehler ? 0xff2a2a : t.profil.akzent, transparent: true, opacity: 0.4, blending: T.AdditiveBlending, depthWrite: false }));
      ln.userData.aktiv = t.aktiv; kreis.add(ln); linien.push(ln);
      const sch = document.createElement("button"); sch.type = "button"; sch.className = `bschild${t.fehler ? " fehler" : ""}${chef ? " unter" : ""}`; sch.innerHTML = `<b></b><i></i>`;
      sch.querySelector("b").textContent = t.name; sch.querySelector("i").textContent = `LV ${t.level}`; sch.setAttribute("aria-label", `${t.name}, Level ${t.level} – Steckbrief öffnen`);
      sch.addEventListener("click", () => waehle(t.id, true)); schilder.appendChild(sch); f.userData.schild = sch;
    });
    if (gewaehlt) markiere(gewaehlt);
  }
  function markiere(id) {
    if (strahl) { strahl.parent?.remove(strahl); strahl.geometry.dispose(); strahl.material.dispose(); strahl = null; }
    figuren.forEach((f) => f.userData.schild?.classList.toggle("an", f.userData.id === id));
    const f = figuren.find((x) => x.userData.id === id); if (!f) return;
    strahl = m(new T.CylinderGeometry(0.15, 0.85, 5, 20, 1, true), new T.MeshBasicMaterial({ color: f.userData.t.profil.akzent, transparent: true, opacity: 0.28, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }), 0, 2.6, 0);
    f.add(strahl);
    drehZiel = -f.userData.winkel;
  }
  function waehle(id, melden) { gewaehlt = id; markiere(id); einmal(); if (melden) onWahl?.(id); }

  // Größe + Kamera so, dass der ganze Kreis aufs Bild passt
  function groesse() {
    const w = huelle.clientWidth, h = huelle.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); kamera.aspect = w / h;
    const hfov = 2 * Math.atan(Math.tan((kamera.fov * Math.PI) / 360) * kamera.aspect);
    // Hauptkreis passt aufs Bild, die Truppen dürfen beim Drehen seitlich hinauslaufen
    const abstand = Math.min(20, Math.max(11, (R1 + 1.0) / Math.tan(hfov / 2) * 0.92));
    kamera.position.set(0, 1.2 + abstand * 0.36, abstand); kamera.lookAt(ziel); kamera.updateProjectionMatrix(); einmal();
  }
  new ResizeObserver(groesse).observe(huelle);

  // Bedienung: wischen = drehen, tippen = Steckbrief
  let start = null, letzteX = 0, schwung = 0;
  canvas.addEventListener("pointerdown", (e) => { start = { x: e.clientX, y: e.clientY, t: performance.now() }; letzteX = e.clientX; schwung = 0; drehZiel = null; });
  canvas.addEventListener("pointermove", (e) => { if (!start) return; const dx = e.clientX - letzteX; letzteX = e.clientX; if (Math.abs(e.clientX - start.x) > 6) { drehung += dx * 0.008; schwung = dx * 0.008; einmal(); } });
  const strahlRay = new T.Raycaster(), zeiger = new T.Vector2();
  canvas.addEventListener("pointerup", (e) => {
    if (!start) return; const weit = Math.hypot(e.clientX - start.x, e.clientY - start.y), kurz = performance.now() - start.t < 600; start = null;
    if (weit > 8 || !kurz) return;
    const r = canvas.getBoundingClientRect(); zeiger.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    strahlRay.setFromCamera(zeiger, kamera);
    const treffer = strahlRay.intersectObjects([ultron, ...figuren], true)[0];
    if (!treffer) return;
    let o = treffer.object; while (o && !o.userData?.id) o = o.parent;
    if (o?.userData.id === "ultron") onWahl?.("ultron"); else if (o) waehle(o.userData.id, true);
  });
  canvas.addEventListener("pointercancel", () => { start = null; });

  // Schleife (pausiert, wenn nicht sichtbar)
  let raf = 0, an = false, zuletzt = 0, uhr = 0;
  const v = new T.Vector3();
  function schritt(dt) {
    uhr += dt;
    const ud = ultron.userData, denkt = document.body.classList.contains("denkt");
    if (!reduziert) {
      ud.kopf.rotation.y = Math.sin(uhr * 0.35) * 0.2; ud.kopf.rotation.x = Math.sin(uhr * 0.23) * 0.05 - 0.04;
      const p = 0.75 + Math.sin(uhr * (denkt ? 9 : 2.2)) * 0.25; ud.augen.forEach((a) => (a.material.opacity = p)); ud.kernGlut.scale.setScalar(1.3 + p * 0.5); ud.licht.intensity = 4 + p * 4;
      if (start == null) { if (drehZiel != null) { let d = ((drehZiel - drehung + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; drehung += d * Math.min(1, dt * 3); if (Math.abs(d) < 0.002) drehZiel = null; } else { schwung *= 0.94; drehung += schwung + tempo * dt; } }
      const pa = funkGeo.attributes.position; for (let i = 0; i < N; i++) { let y = pa.getY(i) + dt * 0.25; if (y > BODEN + 7) y = BODEN; pa.setY(i, y); } pa.needsUpdate = true;
    }
    kreis.rotation.y = drehung;
    for (const f of figuren) {
      const u = f.userData, t = u.t;
      if (u.erscheint != null) { u.erscheint += dt * 0.7; const k = Math.max(0, Math.min(1, u.erscheint)); f.scale.setScalar(u.gr * (k < 1 ? 1 - Math.pow(1 - k, 3) * 1 : 1) + 0.001); if (u.beam) u.beam.material.opacity = Math.max(0, 0.45 * (1 - Math.max(0, u.erscheint - 0.5) * 1.4)); if (u.erscheint > 1.3) { u.erscheint = null; f.scale.setScalar(u.gr); if (u.beam) { f.remove(u.beam); u.beam.geometry.dispose(); u.beam.material.dispose(); u.beam = null; } } }
      if (!reduziert) {
        for (const [o, w, achse] of u.dreh) o.rotation[achse || "y"] += dt * w;
        for (const s of u.schweben) s.position.y = Math.sin(uhr * 1.6 + u.winkel * 3) * 0.08;
        for (const fl of u.flammen) fl.scale.y = 0.8 + Math.random() * 0.45;
        if (t.fehler) { const flack = Math.random() > 0.82 ? 0.15 : 1; u.augen.forEach((a) => { if (a.material.opacity != null) a.material.opacity = flack; }); u.aura.material.opacity = 0.45 + Math.random() * 0.5; }
        else if (t.aktiv) u.aura.material.opacity = 0.55 + Math.sin(uhr * 3 + u.winkel) * 0.3;
      }
      // Namensschild über dem Kopf
      v.set(0, u.hoehe + 0.35, 0); f.localToWorld(v); const tiefe = v.z; v.project(kamera);
      const sch = u.schild; if (sch) { const r = canvas.getBoundingClientRect(); const x = (v.x * 0.5 + 0.5) * r.width, y = (-v.y * 0.5 + 0.5) * r.height; sch.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%)`; const sicht = Math.max(0, Math.min(1, (tiefe - (u.chef ? 1.2 : -0.6)) / 2.2)); sch.style.opacity = sicht.toFixed(2); sch.style.visibility = sicht < 0.05 ? "hidden" : "visible"; sch.style.zIndex = String(Math.round(tiefe * 10 + 100)); sch.style.pointerEvents = sicht > 0.5 ? "auto" : "none"; }
    }
    if (!reduziert) for (const l of linien) l.material.opacity = l.userData.aktiv ? 0.35 + Math.sin(uhr * 4) * 0.25 : 0.22;
    if (strahl) strahl.material.opacity = 0.22 + Math.sin(uhr * 3) * 0.08;
  }
  function bild(t) {
    raf = requestAnimationFrame(bild);
    const dt = Math.min(0.06, (t - zuletzt) / 1000 || 0.016);
    if (t - zuletzt < (start ? 14 : 30)) return; // ruhig ~30 fps, beim Wischen flüssiger
    zuletzt = t; schritt(dt); renderer.render(scene, kamera);
  }
  function einmal() { if (!an || reduziert) { schritt(0); renderer.render(scene, kamera); } }
  function laufen(soll) {
    soll = soll && !document.hidden && !reduziert;
    if (soll && !an) { an = true; zuletzt = performance.now(); raf = requestAnimationFrame(bild); }
    else if (!soll && an) { an = false; cancelAnimationFrame(raf); }
    if (!soll) einmal();
  }
  let sichtbarGewuenscht = false;
  document.addEventListener("visibilitychange", () => laufen(sichtbarGewuenscht));
  new IntersectionObserver((e) => { const s = e[0]?.isIntersecting; laufen(sichtbarGewuenscht && s); }).observe(huelle);
  groesse();

  return {
    zeige(liste, neue = new Set()) {
      const sig = JSON.stringify(liste.map((t) => [t.id, t.chef, t.level, t.note, !!t.fehler, !!t.aktiv, t.laeufe]));
      if (sig === signatur) return; signatur = sig; baue(liste, neue); einmal();
    },
    sichtbar(s) { sichtbarGewuenscht = s; laufen(s); if (s) groesse(); },
    waehle(id) { waehle(id, false); },
    renderer,
  };
}

// ---------- Portraits (für Steckbriefe/Karten): eigener kleiner Renderer, danach freigegeben ----------
export async function portraets(liste, { groesse = 176, ultron = true, ultronRahmen = [-0.45, 8.4] } = {}) {
  await ladeThree();
  const c = document.createElement("canvas"); c.width = c.height = groesse;
  const r = new T.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.outputColorSpace = T.SRGBColorSpace; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = 1.2; r.setClearColor(0x000000, 0);
  const scene = new T.Scene(); scene.environment = umgebung(r);
  scene.add(new T.HemisphereLight(0x8899bb, 0x1a0505, 0.8));
  const key = new T.DirectionalLight(0xffffff, 1.8); key.position.set(-3, 5, 7); scene.add(key);
  const rand = new T.DirectionalLight(0xff2a1a, 2.4); rand.position.set(2, 3, -6); scene.add(rand);
  const kamera = new T.PerspectiveCamera(30, 1, 0.1, 50);
  const aus = {};
  const knips = (obj, mitte, abstand, seite = 0.28) => { scene.add(obj); kamera.position.set(mitte.x + abstand * seite, mitte.y + abstand * 0.12, mitte.z + abstand); kamera.lookAt(mitte); r.render(scene, kamera); const url = c.toDataURL("image/png"); scene.remove(obj); obj.traverse((o) => { o.geometry?.dispose?.(); }); return url; };
  try {
    if (ultron) aus.ultron = knips(baueUltron(), new T.Vector3(0, ultronRahmen[0], 0), ultronRahmen[1], ultronRahmen[2] ?? 0.14);
    for (const t of liste) { const f = baueSchurke(t.profil, { ...t, fehler: false }); f.userData.aura.visible = false; const h = f.userData.hoehe; aus[t.id] = knips(f, new T.Vector3(0, h * 0.58, 0), 3.0 + h * 0.6); }
  } finally { r.dispose(); r.forceContextLoss?.(); }
  return aus;
}
