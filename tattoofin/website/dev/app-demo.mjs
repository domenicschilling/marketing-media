// Demo-Studio für die App-Prüfung (Apple App Review) LOKAL anlegen bzw. die Beispieldaten erneuern.
//   node dev/app-demo.mjs [review-email]          → schreibt in .data/ (bzw. DATA_DIR), druckt die nötigen Umgebungsvariablen
// Live NICHT dieses Skript, sondern nach dem Deploy (mit Domenics OK): POST /api/admin/app-demo { email } mit Admin-Token.
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.env.DATA_DIR = process.env.DATA_DIR || path.join(root, ".data");
const { demoStudioAnlegen } = await import("../netlify/functions/_lib/app-demo.mjs");

const email = process.argv[2] || process.env.APP_REVIEW_EMAIL || "app-review@tattoofin.de";
const r = await demoStudioAnlegen({ email });
console.log(`Demo-Studio ${r.neu ? "angelegt" : "erneuert"}: ${r.studio.firma} (${r.studio.id}), ${r.zahlungen} Beispiel-Zahlungen, Daten in ${process.env.DATA_DIR}`);
console.log("\nFür den Review-Zugang setzen (alle drei nötig, Code selbst wählen, genau 6 Ziffern):");
console.log(`  APP_REVIEW_EMAIL=${r.studio.email}`);
console.log(`  APP_REVIEW_STUDIO_ID=${r.studio.id}`);
console.log("  APP_REVIEW_CODE=<6 Ziffern>");
