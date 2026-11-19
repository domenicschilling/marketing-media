// 20-%-Fassung (Stufe 2, 22.–30.11.2026) – Kopie von 2026-11-15-last-minute/_system/video.cjs.
// NUR MUSIK, keine Stimme: Tonspur = unveränderte Musikspur der freigegebenen 25-%-Clips (_system/ton/<motiv>-musik.m4a,
// per ffmpeg -c:a copy aus 2026-11-15-last-minute/<motiv>/story.mp4 gezogen) und wird bitgenau übernommen (-c:a copy).
// Wortzeiten _system/ton/<motiv>.json (alte Julian-Aufnahme) bleiben nur als Zeitanker der Bewegung, damit das Timing gleich ist.
// Ursprünglicher Kopf:
// Video-Fassung der freigegebenen Standbilder (16.11.2026, Wunsch Domenic: „dass sich da bisschen was bewegt“).
// Aufruf: node _system/video.cjs [01-november 03-bewertungen ...]   (ohne Argumente: alle Motive außer 02-narbe)
//         Optionen: --nur-ton (nur Mischung), --nur-bild (Ton aus vorhandener Mischung), --vorschau=0,0.5 [--vorschau-dir=…] (nur PNG-Einzelbilder)
// Ablauf je Motiv:
//   1. Ton: _system/ton/<motiv>.wav (Sprecher Julian, Stille gekürzt) + Whisper-Wortzeiten _system/ton/<motiv>.json
//      + Musik music/hiphop-shadow-souljaunit.mp3 (CC0) → Sprecher auf −14 LUFS, Musik ~18 LU darunter + Ducking,
//      Gesamt auf −14 LUFS, Limiter → _system/ton/<motiv>-mix.wav
//   2. Bild: index-feed.html / index-story.html laden, motion.css + motion.js einblenden (Layout unverändert),
//      Zeit je Bild über die Web Animations API setzen, Screenshot → ffmpeg (H.264, 30 fps, yuv420p, AAC 48 kHz, faststart)
//   → <motiv>/feed.mp4 und <motiv>/story.mp4
const path = require('path');
const fs = require('fs');
const { execFileSync, spawn } = require('child_process');
const { chromium } = require('/Users/domi/Marketing-Maschine/node_modules/playwright');

const FFMPEG = '/Users/domi/Marketing-Maschine/node_modules/ffmpeg-static/ffmpeg';
const ROOT = path.resolve(__dirname, '..');
const TON = path.join(__dirname, 'ton');
const MUSIK = '/Users/domi/Marketing-Maschine/music/hiphop-shadow-souljaunit.mp3';
const MUSIK_LUFS = -13.6; // gemessen (ebur128)
const FPS = 30;
const VO_OFF = 0.15; // Sprecher setzt nach 0,15 s ein
const DAUER = { '01-november': 9.0, '03-bewertungen': 8.5, '04-diese-woche': 8.5, '05-augsburg': 8.5 };

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const nurTon = process.argv.includes('--nur-ton');
const nurBild = process.argv.includes('--nur-bild');
// --vorschau=0,0.3,1.5 → nur Einzelbilder (PNG) nach --vorschau-dir (Standard: Systemtemp), kein Video, Ton unverändert
const vArg = process.argv.find((x) => x.startsWith('--vorschau='));
const VORSCHAU = vArg ? vArg.split('=')[1].split(',').map(Number) : null;
const vdArg = process.argv.find((x) => x.startsWith('--vorschau-dir='));
const VORSCHAU_DIR = vdArg ? vdArg.split('=')[1] : path.join(require('os').tmpdir(), 'clips-vorschau');
const dirs = (args.length ? args : Object.keys(DAUER)).sort();

const ff = (a) => execFileSync(FFMPEG, ['-hide_banner', '-nostats', ...a], { stdio: ['ignore', 'pipe', 'pipe'] });
function lufs(file) {
  const out = require('child_process').spawnSync(FFMPEG, ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  const m = [...out.matchAll(/I:\s+(-?[\d.]+) LUFS/g)];
  return parseFloat(m[m.length - 1][1]);
}

// Anker aus den Whisper-Wortzeiten (Zeit im Clip)
function anker(motiv) {
  const j = JSON.parse(fs.readFileSync(path.join(TON, motiv + '.json'), 'utf8'));
  const w = j.segments.flatMap((s) => s.words).map((x) => ({ w: x.word.trim().toLowerCase(), t: x.start + VO_OFF }));
  const first = (re, d) => (w.find((x) => re.test(x.w)) || { t: d }).t;
  const last = (re, d) => ([...w].reverse().find((x) => re.test(x.w)) || { t: d }).t;
  return { t25: first(/^(25|fünfundzwanzig)/, 0.2), tSam: first(/^samstag/, 3), tJetzt: last(/^jetzt/, 6) };
}

function mischen(motiv, D) {
  const vo = path.join(TON, motiv + '.wav');
  const out = path.join(TON, motiv + '-mix.wav');
  const tmp = path.join(TON, motiv + '-mix-roh.wav');
  const gv = (-14 - lufs(vo)).toFixed(2);
  const gm = (-32 - MUSIK_LUFS).toFixed(2); // Musik-Grundpegel 18 LU unter Sprecher, Ducking drückt sie unter der Stimme weiter (~−22 LU)
  const fc =
    `[0:a]aresample=48000,aformat=channel_layouts=stereo,volume=${gv}dB,adelay=${Math.round(VO_OFF * 1000)}:all=1,apad,atrim=0:${D},asplit=2[v][sc];` +
    `[1:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:${D},asetpts=PTS-STARTPTS,volume=${gm}dB,` +
    `afade=t=in:d=0.04,afade=t=out:st=${(D - 0.9).toFixed(2)}:d=0.9[m];` +
    `[m][sc]sidechaincompress=threshold=0.015:ratio=5:attack=12:release=380:makeup=1[md];` +
    `[v][md]amix=inputs=2:normalize=0:duration=first[out]`;
  ff(['-y', '-i', vo, '-i', MUSIK, '-filter_complex', fc, '-map', '[out]', '-ar', '48000', '-c:a', 'pcm_s16le', tmp]);
  const korr = (-14 - lufs(tmp)).toFixed(2);
  ff(['-y', '-i', tmp, '-af', `volume=${korr}dB,alimiter=limit=0.84:attack=3:release=60:level=false`, '-ar', '48000', '-c:a', 'pcm_s16le', out]);
  fs.unlinkSync(tmp);
  console.log(motiv, 'Ton: Sprecher', gv, 'dB, Musik', gm, 'dB, Korrektur', korr, 'dB →', lufs(out), 'LUFS');
  return out;
}

async function bild(browser, motiv, kind, h, D, a, mix) {
  const file = path.join(ROOT, motiv, `index-${kind}.html`);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: h }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto('file://' + file);
  await page.waitForFunction(() => document.documentElement.dataset.ready === '1', null, { timeout: 15000 });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ path: path.join(__dirname, 'motion.css') });
  await page.evaluate((cfg) => { window.MOTION = cfg; }, { motiv, kind, D, a });
  await page.addScriptTag({ path: path.join(__dirname, 'motion.js') });
  await page.waitForFunction(() => document.documentElement.dataset.motion === '1');
  await page.waitForTimeout(100);

  if (VORSCHAU) { // nur Einzelbilder zum Ansehen, kein Video
    fs.mkdirSync(VORSCHAU_DIR, { recursive: true });
    for (const t of VORSCHAU) {
      await page.evaluate((ms) => new Promise((r) => { document.getAnimations().forEach((x) => { x.pause(); x.currentTime = ms; }); requestAnimationFrame(() => requestAnimationFrame(r)); }), t * 1000);
      await page.screenshot({ path: path.join(VORSCHAU_DIR, `${motiv}-${kind}-${t.toFixed(2)}.png`), clip: { x: 0, y: 0, width: 1080, height: h } });
    }
    await ctx.close();
    return;
  }
  const out = path.join(ROOT, motiv, `${kind}.mp4`);
  const enc = spawn(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y',
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-i', mix,
    '-map', '0:v', '-map', '1:a',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', String(FPS),
    '-c:a', 'copy',
    '-t', String(D), '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => enc.on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg ' + c)))));
  const N = Math.round(D * FPS);
  const clip = { x: 0, y: 0, width: 1080, height: h };
  for (let i = 0; i < N; i++) {
    const t = i / FPS;
    await page.evaluate((ms) => new Promise((r) => {
      document.getAnimations().forEach((x) => { x.pause(); x.currentTime = ms; });
      requestAnimationFrame(() => requestAnimationFrame(r));
    }), t * 1000);
    const buf = await page.screenshot({ clip, type: 'png' });
    if (!enc.stdin.write(buf)) await new Promise((r) => enc.stdin.once('drain', r));
  }
  enc.stdin.end();
  await done;
  await ctx.close();
  console.log(motiv, kind, '→', path.relative(ROOT, out), `${N} Bilder, ${D} s`);
}

(async () => {
  const browser = nurTon ? null : await chromium.launch();
  for (const d of dirs) {
    const D = DAUER[d];
    if (!D) { console.log('übersprungen:', d); continue; }
    const a = anker(d);
    console.log(d, 'Anker', JSON.stringify(a));
    const mix = path.join(TON, d + '-musik.m4a'); // nur Musik (siehe Kopf), keine Neumischung
    if (!fs.existsSync(mix)) throw new Error('Musikspur fehlt: ' + mix);
    if (nurTon) continue;
    for (const [kind, h] of [['feed', 1350], ['story', 1920]]) await bild(browser, d, kind, h, D, a, mix);
  }
  if (browser) await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
