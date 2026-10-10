// Rendert die Instagram-Medien für die Marketing-Maschine in den Markenordner tattoofin/.
//   Bilder: alle Elemente mit data-out in social/instagram/statisch.html -> JPEG
//   Reels:  alle Reels aus social/instagram/reel.html -> reel.mp4 (1080×1920, 30 fps, H.264 + AAC) und cover.jpg
//           Musik und Soundeffekte erzeugt tools/reel-sound.py (selbst synthetisiert, keine Lizenzfragen)
// Aufruf (im Ordner tattoofin/):
//   node tools/render-instagram.mjs            alles
//   node tools/render-instagram.mjs bilder     nur Bilder
//   node tools/render-instagram.mjs reels [id] nur Reels (optional ein einzelnes, z. B. 2026-10-13)
//   node tools/render-instagram.mjs vorschau   nur Kontaktbögen der Reels (je 8 Einzelbilder) nach social/instagram/export/
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
const [modus = "alles", nur] = process.argv.slice(2);
const FPS = 30;

const browser = await chromium.launch();

async function bilder() {
  const page = await browser.newPage({ viewport: { width: 1200, height: 2000 }, deviceScaleFactor: 1 });
  await page.goto("file://" + path.join(root, "social/instagram/statisch.html"));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  for (const el of await page.$$("[data-out]")) {
    const ziel = path.join(root, await el.getAttribute("data-out"));
    fs.mkdirSync(path.dirname(ziel), { recursive: true });
    await el.screenshot({ path: ziel, type: "jpeg", quality: 90 });
    console.log("ok:", path.relative(root, ziel));
  }
  await page.close();
}

function ffmpeg(ziel, dauer, wav) {
  const args = ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
    "-i", wav,
    "-t", dauer.toFixed(3), "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-r", String(FPS),
    "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", ziel];
  const p = spawn("ffmpeg", args, { stdio: ["pipe", "inherit", "inherit"] });
  const fertig = new Promise((ok, fehler) => p.on("close", (c) => (c === 0 ? ok() : fehler(new Error("ffmpeg " + c)))));
  return { stdin: p.stdin, fertig };
}

async function reels(nurVorschau) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  const url = "file://" + path.join(root, "social/instagram/reel.html");
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  const ids = await page.evaluate(() => window.REELS.map((r) => r.id));
  for (const id of ids) {
    if (nur && id !== nur) continue;
    const r = await page.evaluate((id) => window.load(id), id);
    await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))));
    const ordner = path.join(root, r.id);
    if (nurVorschau) {
      const out = path.join(root, "social/instagram/export");
      fs.mkdirSync(out, { recursive: true });
      const n = 8;
      for (let k = 0; k < n; k++) {
        const t = (r.dauer * (k + 0.5)) / n;
        await page.evaluate((t) => window.seek(t * 1000), t);
        await page.screenshot({ path: path.join(out, `${r.id.replace(/\//g, "_")}_${k}.jpg`), type: "jpeg", quality: 70 });
      }
      console.log("vorschau:", r.id);
      continue;
    }
    fs.mkdirSync(ordner, { recursive: true });
    await page.evaluate((t) => window.seek(t * 1000), r.cover);
    await page.screenshot({ path: path.join(ordner, "cover.jpg"), type: "jpeg", quality: 90 });
    const wav = path.join(os.tmpdir(), `tattoofin-${r.id.replace(/\//g, "_")}.wav`);
    execFileSync("python3", [path.join(root, "tools/reel-sound.py"), wav, String(r.dauer), JSON.stringify(r.sfx)]);
    const { stdin, fertig } = ffmpeg(path.join(ordner, "reel.mp4"), r.dauer, wav);
    const frames = Math.round(r.dauer * FPS);
    for (let f = 0; f < frames; f++) {
      await page.evaluate((ms) => window.seek(ms), (f * 1000) / FPS);
      const buf = await page.screenshot({ type: "jpeg", quality: 92 });
      if (!stdin.write(buf)) await new Promise((ok) => stdin.once("drain", ok));
    }
    stdin.end();
    await fertig;
    console.log("ok:", path.relative(root, path.join(ordner, "reel.mp4")), `(${r.dauer}s)`);
  }
  await page.close();
}

if (modus === "alles" || modus === "bilder") await bilder();
if (modus === "alles" || modus === "reels") await reels(false);
if (modus === "vorschau") await reels(true);
await browser.close();
