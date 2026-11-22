// Kontaktbogen der Video-Clips: je Clip (Motiv × Feed/Story) 4 Standbilder bei 0,3 s / 2 s / 4 s / Ende
// Aufruf: node _system/kontaktbogen-clips.cjs  → _clips-kontaktbogen.jpg
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const { chromium } = require('/Users/domi/Marketing-Maschine/node_modules/playwright');
const FFMPEG = '/Users/domi/Marketing-Maschine/node_modules/ffmpeg-static/ffmpeg';
const ROOT = path.resolve(__dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'kb-clips-'));
const MOTIVE = ['01-november', '03-bewertungen', '04-diese-woche', '05-augsburg'];

function dauer(f) {
  const out = require('child_process').spawnSync(FFMPEG, ['-hide_banner', '-i', f], { encoding: 'utf8' }).stderr;
  const m = out.match(/Duration: (\d+):(\d+):([\d.]+)/);
  return +m[1] * 3600 + +m[2] * 60 + +m[3];
}

(async () => {
  let rows = '';
  for (const d of MOTIVE) {
    let cells = '';
    for (const kind of ['feed', 'story']) {
      const f = path.join(ROOT, d, kind + '.mp4');
      const D = dauer(f);
      for (const [lab, t] of [['0,3 s', 0.3], ['2 s', 2], ['4 s', 4], [`Ende ${D.toFixed(1).replace('.', ',')} s`, D - 0.05]]) {
        const out = path.join(TMP, `${d}-${kind}-${t}.jpg`);
        execFileSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(t), '-i', f, '-frames:v', '1', '-q:v', '3', out]);
        cells += `<figure class="${kind}"><img src="file://${out}"><figcaption>${kind} · ${lab}</figcaption></figure>`;
      }
      cells += kind === 'feed' ? '<i class="gap"></i>' : '';
    }
    rows += `<section><h2>${d}</h2><div class="row">${cells}</div></section>`;
  }
  const html = `<!doctype html><meta charset="utf-8"><style>
  body{margin:0;background:#111;color:#eee;font:600 22px/1.2 -apple-system,Helvetica,sans-serif;padding:24px}
  h1{font-size:30px;margin:0 0 16px} section{margin-bottom:22px} h2{font-size:24px;margin:0 0 8px;color:#ff5a4e}
  .row{display:flex;gap:10px;align-items:flex-end} .gap{width:26px}
  figure{margin:0} img{display:block;height:440px;border:1px solid #333} figcaption{font-size:16px;color:#aaa;margin-top:4px}
  </style><h1>Chic Tattoo Augsburg · Last Minute November · Video-Clips (Standbilder 0,3 s / 2 s / 4 s / Ende)</h1>${rows}`;
  const hf = path.join(TMP, 'kb.html');
  fs.writeFileSync(hf, html);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 2560, height: 1000 } });
  await p.goto('file://' + hf);
  await p.waitForLoadState('networkidle');
  const out = path.join(ROOT, '_clips-kontaktbogen.jpg');
  await p.screenshot({ path: out, fullPage: true, type: 'jpeg', quality: 85 });
  await b.close();
  console.log('→', out);
})();
