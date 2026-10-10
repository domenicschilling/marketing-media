// Rendert den Verkaufs-Spot (social/instagram/spot.html) nach creatives/2026-10-10/spot/:
//   reel.mp4 (1080×1920, 30 fps, H.264 + AAC), cover.jpg, square.mp4 (1:1-Schnitt für den Feed)
// Ton: Sprecher (spot/vo/vo0–7.mp3, Tempo 1,08, zeitlich nach SPOT.vo gesetzt) über dem Tattoofin-Beat (tools/reel-sound.py).
// Voraussetzung: Einzelbilder der Clips in social/instagram/spot/frames/<name>/ (Befehl siehe unten bei FRAMES).
// Aufruf (im Ordner tattoofin/):  node tools/render-spot.mjs [--vorschau]
import { createRequire } from "module";
import path from "path";
import fs from "fs";
import os from "os";
import { spawn, execFileSync } from "child_process";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = require("/opt/node22/lib/node_modules/playwright")); }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ig = path.join(root, "social/instagram");
const FPS = 30, TEMPO = 1.08;
const vorschau = process.argv.includes("--vorschau");

// FRAMES: Clips einmalig in Einzelbilder zerlegen (falls noch nicht geschehen)
for (const f of fs.readdirSync(path.join(ig, "spot/clips")).filter((x) => x.endsWith(".mp4"))) {
  const name = f.replace(/\.mp4$/, ""), dir = path.join(ig, "spot/frames", name);
  if (fs.existsSync(dir) && fs.readdirSync(dir).length) continue;
  fs.mkdirSync(dir, { recursive: true });
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", path.join(ig, "spot/clips", f), "-vf", "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30", "-q:v", "3", path.join(dir, "%04d.jpg")]);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto("file://" + path.join(ig, "spot.html"));
await page.evaluate(() => document.fonts.ready);
const r = await page.evaluate(() => window.load());
await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))));
const out = path.join(root, r.id);
fs.mkdirSync(out, { recursive: true });

if (vorschau) {
  const dir = path.join(ig, "export/spot"); fs.mkdirSync(dir, { recursive: true });
  for (let t = 0.5; t < r.dauer; t += 1.5) { await page.evaluate((ms) => window.seek(ms), t * 1000); await page.screenshot({ path: path.join(dir, `${t.toFixed(1).padStart(4, "0")}.jpg`), type: "jpeg", quality: 60 }); }
  console.log("Vorschau:", path.relative(root, dir)); await browser.close(); process.exit(0);
}

await page.evaluate((ms) => window.seek(ms), r.cover * 1000);
await page.screenshot({ path: path.join(out, "cover.jpg"), type: "jpeg", quality: 90 });

// Tonspur: Beat + Effekte, dann Sprecher darüber
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tf-spot-"));
const beat = path.join(tmp, "beat.wav");
execFileSync("python3", [path.join(root, "tools/reel-sound.py"), beat, String(r.dauer), JSON.stringify(r.sfx)]);
const voIn = r.vo.flatMap(([, f]) => ["-i", path.join(ig, "spot/vo", f + ".mp3")]);
const filt = r.vo.map(([t], i) => `[${i + 1}:a]atempo=${TEMPO},adelay=${Math.round(t * 1000)}:all=1,volume=1.5[v${i}]`).join(";")
  + `;[0:a]volume=0.5[m];[m]${r.vo.map((_, i) => `[v${i}]`).join("")}amix=inputs=${r.vo.length + 1}:normalize=0,alimiter=limit=0.95[a]`;
const mix = path.join(tmp, "mix.wav");
execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", beat, ...voIn, "-filter_complex", filt, "-map", "[a]", "-t", String(r.dauer), mix]);

const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-", "-i", mix,
  "-t", r.dauer.toFixed(3), "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-pix_fmt", "yuv420p", "-r", String(FPS),
  "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", path.join(out, "reel.mp4")], { stdio: ["pipe", "inherit", "inherit"] });
const fertig = new Promise((ok, err) => ff.on("close", (c) => (c === 0 ? ok() : err(new Error("ffmpeg " + c)))));
const frames = Math.round(r.dauer * FPS);
for (let f = 0; f < frames; f++) {
  await page.evaluate((ms) => window.seek(ms), (f * 1000) / FPS);
  const buf = await page.screenshot({ type: "jpeg", quality: 92 });
  if (!ff.stdin.write(buf)) await new Promise((ok) => ff.stdin.once("drain", ok));
}
ff.stdin.end();
await fertig;
await browser.close();
console.log("ok:", path.relative(root, path.join(out, "reel.mp4")), `(${r.dauer}s)`);
