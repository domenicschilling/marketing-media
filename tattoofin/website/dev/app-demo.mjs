// Demo-Studio für die App-Prüfung (Apple App Review) LOKAL anlegen bzw. die Beispieldaten erneuern.
//   node dev/app-demo.mjs [review-email]          → schreibt in .data/ (bzw. DATA_DIR), druckt die nötigen Umgebungsvariablen
//   node dev/app-demo.mjs --abgelaufen [email]    → Prüfkonto mit abgelaufenem Apple-Abo
// Live NICHT dieses Skript, sondern nach dem Deploy (mit Domenics OK): POST /api/admin/app-demo { email } mit Admin-Token.
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.env.DATA_DIR = process.env.DATA_DIR || path.join(root, ".data");
const { demoStudioAnlegen, demoAbgelaufenAnlegen } = await import("../netlify/functions/_lib/app-demo.mjs");

// --abgelaufen: zweites Prüfkonto mit abgelaufenem Apple-Abo (Apple 2.1, 16.11.2026), Code = APP_REVIEW_CODE
if (process.argv.includes("--abgelaufen")) {
  const a = await demoAbgelaufenAnlegen({ email: process.argv.find((x) => x.includes("@")) || process.env.APP_REVIEW_ABGELAUFEN_EMAIL || undefined });
  console.log(`Prüfkonto „Abo abgelaufen“ ${a.neu ? "angelegt" : "erneuert"}: ${a.studio.id}, Abo ${a.studio.apple.status}`);
  console.log(`  APP_REVIEW_ABGELAUFEN_EMAIL=${a.studio.email}   (Code = APP_REVIEW_CODE)`);
  process.exit(0);
}

const email = process.argv[2] || process.env.APP_REVIEW_EMAIL || "app-review@tattoofin.de";
const r = await demoStudioAnlegen({ email });
console.log(`Demo-Studio ${r.neu ? "angelegt" : "erneuert"}: ${r.studio.firma} (${r.studio.id}), ${r.zahlungen} Beispiel-Zahlungen, Daten in ${process.env.DATA_DIR}`);
console.log("\nFür den Review-Zugang setzen (alle drei nötig, Code selbst wählen, genau 6 Ziffern):");
console.log(`  APP_REVIEW_EMAIL=${r.studio.email}`);
console.log(`  APP_REVIEW_STUDIO_ID=${r.studio.id}`);
console.log("  APP_REVIEW_CODE=<6 Ziffern>");
