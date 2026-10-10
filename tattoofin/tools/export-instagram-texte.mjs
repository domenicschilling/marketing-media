// Exportiert den Instagram-Redaktionsplan (social/instagram/beitraege.js) als JSON und CSV,
// z. B. zum Einfügen ins Google Sheet der Marketing-Maschine.
// Aufruf (im Ordner tattoofin/):  node tools/export-instagram-texte.mjs
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.join(root, "social/instagram");
createRequire(import.meta.url)(path.join(dir, "beitraege.js"));
const { BEITRAEGE, WERBEMITTEL } = globalThis;

const tag = (d) => new Date(d + "T12:00:00").toLocaleDateString("de-DE", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
const medien = (b) => b.format === "Reel"
  ? { video: `tattoofin/${b.ordner}/reel.mp4`, cover: `tattoofin/${b.ordner}/cover.jpg` }
  : { slides: [1, 2, 3, 4, 5, 6, 7].map((i) => `tattoofin/${b.ordner}/slide-${i}.jpg`), story: `tattoofin/${b.ordner}/story.jpg` };

fs.writeFileSync(path.join(dir, "beitraege.json"), JSON.stringify({
  marke: "tattoofin", stand: new Date().toISOString().slice(0, 10),
  beitraege: BEITRAEGE.map((b) => ({ ...b, wochentag: tag(b.datum), medien: medien(b) })),
  werbemittel: WERBEMITTEL,
}, null, 2) + "\n");

const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const kopf = ["Datum", "Uhrzeit", "Format", "Ordner", "Thema", "Säule", "Text", "Alt-Text", "Story"];
const zeilen = BEITRAEGE.map((b) => [b.datum, b.uhrzeit, b.format, b.ordner, b.thema, b.saeule, b.text, b.alt, b.story || ""].map(q).join(";"));
fs.writeFileSync(path.join(dir, "beitraege.csv"), "﻿" + [kopf.map(q).join(";"), ...zeilen].join("\r\n") + "\r\n");
console.log(`ok: ${BEITRAEGE.length} Beiträge, ${WERBEMITTEL.length} Werbemittel -> social/instagram/beitraege.json, beitraege.csv`);
