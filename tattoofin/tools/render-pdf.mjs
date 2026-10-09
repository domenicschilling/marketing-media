// Erzeugt alle PDFs in telefon/pdf/ aus den HTML-Vorlagen.
// Aufruf (im Ordner telefon/):  node tools/render-pdf.mjs            -> alle
//                               node tools/render-pdf.mjs vertrag     -> nur Dateien, deren Name "vertrag" enthält
//                               node tools/render-pdf.mjs --png       -> zusätzlich PNG-Vorschau der 1. Seite
// Für studio-spezifische Materialien (Kunden-Materialien + Mailing-Brief):
//   node tools/render-pdf.mjs kunden --studio "Ink Bamberg" --tel "0951 123456" [--web … --logo … --zeiten … --adresse … --email …]
//   node tools/render-pdf.mjs brief  --studio "Ink Bamberg" --vorname "Alex" --strasse "Musterstr. 1" --ort "96047 Bamberg" [--check 0]
import { createRequire } from "module";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = require("/opt/node22/lib/node_modules/playwright")); }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const KEYS = ["studio", "tel", "stadt", "zeiten", "web", "logo", "adresse", "email", "vorname", "inhaber", "strasse", "ort", "check", "zahlen", "insta"];
const png = args.includes("--png") && args.splice(args.indexOf("--png"), 1);
const params = {};
for (const k of KEYS) { const i = args.indexOf("--" + k); if (i >= 0) params[k] = args.splice(i, 2)[1]; }
const studio = params.studio;
const filter = args[0] || "";

const DOCS = [
  "intern/01-produkt-und-preise.html",
  "intern/02-vertriebs-playbook.html",
  "intern/03-direct-mail-kampagne.html",
  "intern/04-umsetzung-onboarding.html",
  "intern/05-nachrichtenvorlagen.html",
  "studios/10-onepager.html",
  "studios/11-so-funktionierts.html",
  "studios/12-team-leitfaden.html",
  "studios/13-direct-mail-brief.html",
  "studios/14-vertrag.html",
  "studios/15-avv.html",
  "studios/16-onboarding-fragebogen.html",
  "studios/17-postkarte.html",
  "studios/18-paket-aufkleber.html",
  "kunden/20-fensteraufkleber.html",
  "kunden/21-flyer-a6.html",
  "kunden/22-thekenaufsteller-a5.html",
  "kunden/23-kundeninfo.html",
  "kunden/24-social-kit.html",
];

const q = new URLSearchParams(params);
const slug = studio ? studio.toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") : "";
const outDir = path.join(root, "pdf", slug ? "studio-" + slug : "");

const browser = await chromium.launch();
const page = await browser.newPage();
fs.mkdirSync(outDir, { recursive: true });
for (const rel of DOCS.filter((d) => d.includes(filter))) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) { console.log("fehlt:", rel); continue; }
  if (studio && !rel.startsWith("kunden/") && !rel.includes("direct-mail-brief")) continue;
  const url = "file://" + file + (q.toString() ? "?" + q : "");
  await page.goto(url, { waitUntil: "load" });
  await page.waitForSelector("body[data-ready='1']", { timeout: 10000 }).catch(() => {});
  await page.emulateMedia({ media: "print" });
  const out = path.join(outDir, path.basename(rel, ".html") + ".pdf");
  await page.pdf({ path: out, preferCSSPageSize: true, printBackground: true });
  if (png) {
    await page.emulateMedia({ media: "screen" });
    await page.setViewportSize({ width: 1000, height: 1400 });
    await page.screenshot({ path: out.replace(/\.pdf$/, ".png"), fullPage: false });
  }
  console.log("ok:", path.relative(root, out));
}
await browser.close();
