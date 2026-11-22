// DS Werbekonzept – Schritt 7b nach dem Render: bewegtes Korn je Marke über das ganze Video (Ton wird kopiert).
// Das Farb-Grading der Fotos passiert vorher im Spot per CSS (foto_filter aus grading.json als --foto-filter), damit Markenflächen
// und Schrift ihre Farbe behalten. Nur bei reinem Kundenmaterial ohne Markenflächen: --voll (ganze ffmpeg-Kette inkl. Farbe).
// Aufruf: node content/_ds-werbekonzept/werkzeug/ds-grade.mjs <marke|standard|warm|kuehl> <reel.mp4> [ziel.mp4] [--voll]
//   Ohne Ziel: <reel>-ds.mp4 daneben, dazu <reel>-ds-cover.jpg (Bild bei 1,0 s) und <reel>-ds-vergleich.jpg (links vorher, rechts nachher).
// Kette je Marke in grading.json. Ton wird kopiert (render-spot.mjs mischt schon auf −13 LUFS).
// Danach wie gewohnt: node scripts/qc/creative-check.mjs <ordner>
import path from "path";
import fs from "fs";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { ffmpegPath } from "../../../src/lib/ffmpeg.mjs";

const hier = path.dirname(fileURLToPath(import.meta.url));
const voll = process.argv.includes("--voll");
const [marke, ein, zielArg] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!marke || !ein) { console.error("Aufruf: node content/_ds-werbekonzept/werkzeug/ds-grade.mjs <marke> <reel.mp4> [ziel.mp4]"); process.exit(1); }
const tabelle = JSON.parse(fs.readFileSync(path.join(hier, "grading.json"), "utf8"));
const g = tabelle[marke];
if (!g) { console.error(`Keine Kette für "${marke}". Vorhanden: ${Object.keys(tabelle).filter((k) => !k.startsWith("_")).join(", ")}`); process.exit(1); }
const ff = ffmpegPath();
const ziel = zielArg || ein.replace(/\.mp4$/, "-ds.mp4");
execFileSync(ff, ["-loglevel", "error", "-y", "-i", ein, "-vf", (voll ? g.voll : g.korn) + ",format=yuv420p", "-c:v", "libx264", "-preset", "medium", "-crf", "19", "-c:a", "copy", "-movflags", "+faststart", ziel], { stdio: "inherit" });
const basis = ziel.replace(/\.mp4$/, "");
execFileSync(ff, ["-loglevel", "error", "-y", "-ss", "1", "-i", ziel, "-frames:v", "1", "-q:v", "2", basis + "-cover.jpg"]);
execFileSync(ff, ["-loglevel", "error", "-y", "-ss", "1", "-i", ein, "-ss", "1", "-i", ziel, "-filter_complex", "[0:v]scale=540:-1[a];[1:v]scale=540:-1[b];[a][b]hstack", "-frames:v", "1", "-q:v", "3", basis + "-vergleich.jpg"]);
console.log("ok:", path.relative(process.cwd(), ziel), "·", marke, voll ? "· volle Kette:" : "· Korn:", voll ? g.voll : g.korn, voll ? "" : "\n  Foto-Grading im Spot setzen: --foto-filter: " + g.foto_filter);
