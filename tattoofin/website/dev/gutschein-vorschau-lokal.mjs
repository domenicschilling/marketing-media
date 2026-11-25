// Lokale Vorschau der Gutschein-Shops (Stripe-Nachbau, eigener Datenordner, keine echten Zahlungen):
//   node dev/gutschein-vorschau-lokal.mjs [port]   → http://localhost:<port>/gutschein-kaufen/<slug>
// Legt je Shop aus SHOPS ein Test-Studio mit dem Slug an (Stripe „bereit“ im Nachbau). Nur zum Ansehen und für npm run abnahme.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { startDev } from "./server.mjs";

const port = Number(process.argv[2] || 8996);
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "tf-gs-vorschau-"));
process.env.TF_GS_MAX_JE_IP = "100";
await startDev({ port, mock: true, dataDir, quiet: true, mockPort: port + 4000 });
const { saveStudio } = await import("../netlify/functions/_lib/store.mjs");
const { SHOPS } = await import("../netlify/functions/_lib/gutschein-shop.mjs");
for (const [slug, c] of Object.entries(SHOPS)) {
  await saveStudio({ id: `st_${c.seite.kuerzel}_lokal`, firma: c.seite.firma, slug, email: `${c.seite.kuerzel}@example.com`, inhaber: "Test", strasse: c.anbieter.strasse, plz: c.anbieter.plz, ort: c.anbieter.ort,
    modell: "kauf", zahlart: "geschenk", paket: "Test", status: "live", createdAt: new Date().toISOString(),
    stripe: { accountId: `acct_${c.seite.kuerzel}_lokal`, chargesEnabled: true, payoutsEnabled: true, detailsSubmitted: true, kontoTyp: "standard" } });
  console.log(`http://localhost:${port}/gutschein-kaufen/${slug}`);
}
