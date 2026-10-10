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
    fs.writeFileSync(path.join(dir, "stories.json"), JSON.stringify({ brand: "tattoofin", stories: files, highlights: reihenfolge }, null, 2) + "\n");
    console.log(`✓ ${files.length} Highlight-Stories`);
  }
}

// Werbemittel für Meta Ads
for (const w of WERBEMITTEL) {
  const [, datum, id] = w.ordner.split("/");
  const quelle = path.join(root, w.ordner);
  const dir = path.join(content, "creatives", datum, id);
  const files = { square: "square.jpg", feed: "feed.jpg", story: "story.jpg", reel: "reel.mp4", cover: "cover.jpg" };
  for (const f of Object.values(files)) copy(path.join(quelle, f), path.join(dir, f));
  fs.writeFileSync(path.join(dir, "creative.json"), JSON.stringify({
    id: `${datum}/${id}`, date: datum, brand: "tattoofin", angle: w.name, hook: w.titel, theme: "light",
    primaryTexts: [w.primaer], headlines: [w.titel], descriptions: [w.beschreibung], ctaType: "LEARN_MORE",
    specialAdCategory: w.sonderkategorie ? "FINANCIAL_PRODUCTS_SERVICES" : null,
    why: w.sonderkategorie ? "Erwähnt Raten: als Sonderkategorie Finanzprodukte anlegen." : "Erwähnt keine Raten.",
    files,
  }, null, 2) + "\n");
  console.log(`✓ Werbemittel ${datum}/${id} (${w.name})`);
}
console.log(`\n${n} Beiträge und ${WERBEMITTEL.length} Werbemittel nach ${path.relative(process.cwd(), content) || content} übertragen.`);
