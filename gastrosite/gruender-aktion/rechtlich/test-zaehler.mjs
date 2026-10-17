// Prüft die Zähl-Regel der Gründer-Aktion (aktionZaehlt) aus dem gepatchten GastroSite-api.mjs.
// Aufruf: node test-zaehler.mjs /Pfad/zu/GastroSite/netlify/functions/api.mjs
import { readFileSync } from "node:fs";

const src = readFileSync(process.argv[2], "utf8");
const pick = (re) => src.match(re)[0];
const code = [pick(/const DONE = .*;/), pick(/const TEST_ADDRESS = .*;/), pick(/const isTestLead = .*;/), pick(/const aktionZaehlt = [\s\S]*?\);\n/)].join("\n");
const aktionZaehlt = new Function(`${code}; return aktionZaehlt;`)();

const faelle = [
  [{ status: "paid", payment_method: "stripe", source: "", email: "a@pizza.de" }, true, "online bezahlt"],
  [{ status: "live", payment_method: "invoice", source: "", email: "a@pizza.de" }, true, "auf Rechnung, bezahlt und live"],
  [{ status: "invoice_sent", payment_method: "invoice", source: "", email: "a@pizza.de" }, true, "auf Rechnung verbindlich bestellt"],
  [{ status: "new", payment_method: "invoice", source: null, email: "a@pizza.de" }, true, "auf Rechnung bestellt, Rechnung noch nicht raus"],
  [{ status: "new", payment_method: "stripe", source: "", email: "a@pizza.de" }, false, "Online-Zahlung nicht abgeschlossen"],
  [{ status: "checkout_started", payment_method: "stripe", source: "", email: "a@pizza.de" }, false, "Bezahlseite abgebrochen"],
  [{ status: "cancelled", payment_method: "invoice", source: "", email: "a@pizza.de" }, false, "storniert"],
  [{ status: "paid", payment_method: "stripe", source: "claude-test", email: "a@pizza.de" }, false, "Test (Quelle claude-test)"],
  [{ status: "paid", payment_method: "stripe", source: "", email: "x@example.com" }, false, "Test (Adresse @example.com)"],
];

let ok = true;
for (const [lead, soll, name] of faelle) {
  const ist = aktionZaehlt(lead);
  ok &&= ist === soll;
  console.log(`${ist === soll ? "OK    " : "FEHLER"} ${name}: zählt = ${ist}`);
}
const frei = 10 - faelle.filter(([l]) => aktionZaehlt(l)).length;
console.log(`Beispiel: 4 echte Aufträge unter 9 Datensätzen → frei = ${frei} (soll 6)`);
ok &&= frei === 6;
process.exit(ok ? 0 : 1);
