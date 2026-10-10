// Überträgt die fertig gestalteten Instagram-Beiträge (Tattoofin-Look) in die Marketing-Maschine:
//   content/tattoofin/<slot>/post.json + Medien        (Reels: reel.mp4, cover.jpg · Karussells: slide-1…7.jpg, story.jpg)
//   content/tattoofin/creatives/<datum>/cN/…            (feed, square, story, reel, cover + creative.json für Meta Ads)
// Bereits gepostete Beiträge werden nie angefasst. Die Maschine gestaltet für Tattoofin nichts selbst (autoContent: false).
// Aufruf (im Ordner tattoofin/):  node tools/export-marketingmaschine.mjs /pfad/zur/marketing-maschine [--ohne-start]
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ziel = process.argv[2];
if (!ziel || !fs.existsSync(path.join(ziel, "brands/tattoofin/brand.json"))) {
  console.error("Pfad zur Marketing-Maschine angeben (dort muss brands/tattoofin/brand.json liegen).");
  process.exit(1);
}
createRequire(import.meta.url)(path.join(root, "social/instagram/beitraege.js"));
const { BEITRAEGE, WERBEMITTEL } = globalThis;
const content = path.join(ziel, "content/tattoofin");

const FORMAT = { Reel: "reel", Slider: "carousel", Bild: "image" };
// Start-Serie: Beiträge mit "start" (s01 … s15) liegen im Slot 2026-10-10_sNN und werden in dieser Reihenfolge gepostet (s15 = oben links)
const START_DATUM = "2026-10-10";
const slotVon = (b) => (b.start ? `${START_DATUM}_${b.start}` : b.slot || b.ordner);
const copy = (von, nach) => { fs.mkdirSync(path.dirname(nach), { recursive: true }); fs.copyFileSync(von, nach); };

// --ohne-start: Start-Serie überspringen (z. B. während sie gerade gepostet wird)
const ohneStart = process.argv.includes("--ohne-start");
let n = 0;
for (const b of BEITRAEGE) {
  if (ohneStart && b.start) continue;
  const slot = slotVon(b);
  const dir = path.join(content, slot);
  // Liegt der Beitrag noch unter seinem alten Datums-Slot (vor der Start-Serie), dort entfernen
  if (b.start && fs.existsSync(path.join(content, b.ordner, "post.json"))) {
    const alt = JSON.parse(fs.readFileSync(path.join(content, b.ordner, "post.json"), "utf8"));
    if (alt.status !== "gepostet" && alt.topic === b.thema) fs.rmSync(path.join(content, b.ordner), { recursive: true });
  }
  const alt = path.join(dir, "post.json");
  if (fs.existsSync(alt) && JSON.parse(fs.readFileSync(alt, "utf8")).status === "gepostet") { console.log(`– ${slot} ist schon gepostet, bleibt unverändert`); continue; }

  // Hashtags stehen im Text in der letzten Zeile; die Maschine führt sie getrennt
  const zeilen = b.text.trimEnd().split("\n");
  const hashtags = /^#/.test(zeilen.at(-1)) ? zeilen.pop().split(/\s+/).filter(Boolean) : [];
  const caption = zeilen.join("\n").trim();

  const format = FORMAT[b.format];
  const quelle = path.join(root, b.ordner);
  const media = format === "reel"
    ? { feed: ["reel.mp4"], cover: "cover.jpg", story: "reel.mp4" }
    : format === "image" ? { feed: ["slide-1.jpg"], story: "slide-1.jpg" }
    : { feed: fs.readdirSync(quelle).filter((f) => /^slide-\d+\.jpg$/.test(f)).sort((x, y) => parseInt(x.slice(6)) - parseInt(y.slice(6))), story: fs.existsSync(path.join(quelle, "story.jpg")) ? "story.jpg" : "slide-1.jpg" };
  for (const f of new Set([...media.feed, media.story, media.cover].filter(Boolean))) copy(path.join(quelle, f), path.join(dir, f));

  const post = {
    brand: "tattoofin",
    date: b.start ? START_DATUM : b.datum,
    ...(slot !== b.datum ? { slot } : {}),
    ...(b.start ? { series: "start", order: b.start } : {}),
    format,
    pillar: b.saeule,
    topic: b.thema,
    theme: "light",
    caption,
    hashtags,
    alt_text: b.alt,
    status: "geplant",
    source: "start", // Start-Serie: wird vom automatischen Auffüllen nie ersetzt
    design: "tattoofin-look (marketing-media/tattoofin/social/instagram)",
    media,
  };
  fs.writeFileSync(alt, JSON.stringify(post, null, 2) + "\n");
  n++;
  console.log(`✓ ${slot.padEnd(17)} ${format.padEnd(8)} ${b.thema}`);
}

// Highlight-Stories (werden als Stories gepostet und danach in der App zu Highlights zusammengefasst)
{
  const quelle = path.join(root, "2026-10-10_highlights");
  if (fs.existsSync(quelle)) {
    const dir = path.join(content, "2026-10-10_highlights");
    const files = fs.readdirSync(quelle).filter((f) => f.endsWith(".jpg"));
    const reihenfolge = ["so-gehts", "preise", "anzahlung", "fragen"];
    files.sort((a, b) => reihenfolge.indexOf(a.replace(/-\d+\.jpg$/, "")) - reihenfolge.indexOf(b.replace(/-\d+\.jpg$/, "")) || a.localeCompare(b));
    for (const f of files) copy(path.join(quelle, f), path.join(dir, f));
    // Bereits gepostete Stories (posted) bleiben erhalten, sonst würden sie beim nächsten Serien-Lauf erneut gepostet
    const altJson = path.join(dir, "stories.json");
    const posted = fs.existsSync(altJson) ? JSON.parse(fs.readFileSync(altJson, "utf8")).posted : undefined;
    fs.writeFileSync(altJson, JSON.stringify({ brand: "tattoofin", stories: files, highlights: reihenfolge, ...(posted ? { posted } : {}) }, null, 2) + "\n");
    console.log(`✓ ${files.length} Highlight-Stories`);
  }
}

// Werbemittel für Meta Ads
for (const w of WERBEMITTEL) {
  const [, datum, id] = w.ordner.split("/");
  const quelle = path.join(root, w.ordner);
  const dir = path.join(content, "creatives", datum, id);
  // Nur vorhandene Dateien: Produkt-Statics haben kein Reel, der Verkaufs-Spot hat nur Reel + Cover
  const files = Object.fromEntries(Object.entries({ square: "square.jpg", feed: "feed.jpg", story: "story.jpg", reel: "reel.mp4", cover: "cover.jpg" }).filter(([, f]) => fs.existsSync(path.join(quelle, f))));
  for (const f of Object.values(files)) copy(path.join(quelle, f), path.join(dir, f));
  fs.writeFileSync(path.join(dir, "creative.json"), JSON.stringify({
    id: `${datum}/${id}`, date: datum, brand: "tattoofin", angle: w.name, hook: w.titel, theme: "light",
    primaryTexts: [w.primaer], headlines: [w.titel], descriptions: [w.beschreibung], ctaType: "LEARN_MORE",
    specialAdCategory: w.sonderkategorie ? "FINANCIAL_PRODUCTS_SERVICES" : null,
    why: w.sonderkategorie ? "Erwähnt Raten: als Sonderkategorie Finanzprodukte anlegen." : "Erwähnt keine Raten.",
    files,
    ...(files.reel && !files.feed ? { defaultFormat: "video" } : {}),
  }, null, 2) + "\n");
  console.log(`✓ Werbemittel ${datum}/${id} (${w.name})`);
}
// Auswahlseite für die Werbemittel (GitHub Pages: …/tattoofin/creatives/): alle Motive mit Bildern, Reel und Anzeigentexten
{
  const esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const reihen = [...WERBEMITTEL].reverse().map((w) => {
    const [, datum, id] = w.ordner.split("/");
    const k = `${datum}/${id}`;
    return `<article id="${datum}-${id}"><header><b>${k}</b><span>${esc(w.name)}</span>${w.sonderkategorie ? '<em>Sonderkategorie Finanzen</em>' : ""}</header>
<div class="m">${["feed", "square", "story"].filter((f) => fs.existsSync(path.join(root, w.ordner, f + ".jpg"))).map((f) => `<img loading="lazy" src="${k}/${f}.jpg" alt="${f}">`).join("")}${fs.existsSync(path.join(root, w.ordner, "reel.mp4")) ? `<video src="${k}/reel.mp4" poster="${k}/cover.jpg" controls playsinline preload="none"></video>` : ""}</div>
<dl><dt>Primärtext</dt><dd>${esc(w.primaer).replace(/\n/g, "<br>")}</dd><dt>Überschrift</dt><dd>${esc(w.titel)}</dd><dt>Beschreibung</dt><dd>${esc(w.beschreibung)}</dd><dt>Button</dt><dd>${esc(w.button)}</dd></dl></article>`;
  }).join("\n");
  fs.writeFileSync(path.join(content, "creatives/index.html"), `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Tattoofin · Werbemittel</title><style>
:root{--y:#fbb316;--ink:#1f3d5c}*{box-sizing:border-box}body{margin:0;font:16px/1.5 system-ui,sans-serif;background:#fff8e6;color:var(--ink)}
h1{margin:0;padding:20px 16px;background:var(--y);font-size:22px}p.i{padding:0 16px;max-width:900px}
article{background:#fff;margin:16px;border:3px solid var(--ink);border-radius:16px;overflow:hidden;max-width:1200px}
header{display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:12px 16px;background:var(--ink);color:#fff}header b{color:var(--y)}
em{font-style:normal;background:#f2682a;border-radius:99px;padding:2px 10px;font-size:13px}
.m{display:flex;gap:10px;overflow-x:auto;padding:12px}.m img,.m video{height:340px;border-radius:10px;border:2px solid #0002;flex:none}
dl{margin:0;padding:0 16px 16px}dt{font-weight:700;margin-top:10px}dd{margin:0}
</style></head><body><h1>Tattoofin · Werbemittel zur Auswahl</h1>
<p class="i">Jedes Motiv gibt es als Feed (4:5), Quadrat (1:1), Story (9:16) und Reel. Für die Kampagne einfach die Nummern nennen, z. B. <b>2026-10-10/c4</b>. Motive mit „Sonderkategorie Finanzen“ erwähnen Raten und laufen bei Meta in der Kategorie Finanzprodukte (ohne Alters-/Geschlechter-Eingrenzung).</p>
${reihen}</body></html>
`);
  console.log("✓ Auswahlseite creatives/index.html");
}
console.log(`\n${n} Beiträge und ${WERBEMITTEL.length} Werbemittel nach ${path.relative(process.cwd(), content) || content} übertragen.`);
