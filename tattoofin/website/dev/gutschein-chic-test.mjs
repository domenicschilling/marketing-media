// Test Gutschein-Shop Chic Tattoo Augsburg (25.11.2026): Stufen 100→150 / 200→280 / 400→500 / 800→1.000 €, Wertgutschein ab 50 €,
// Frist 24.12.2026 16 Uhr, mehrere Aktions-Gutscheine je Person (Domenic 27.11.), Hero je ?g=, eigene Vorlage (Seite, Rechtsseiten), Mail/PDF im Chic-Look, Kasse im Stripe-Nachbau,
// Provision frei bis (provisionFreiBis). Ergänzt dev/gutschein-shop-test.mjs (TF München/Landshut).
//   NODE_PATH=… E2E_PORT=8997 STRIPE_MOCK_PORT=12997 node dev/gutschein-chic-test.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { startDev } from "./server.mjs";

const PORT = Number(process.env.E2E_PORT || 8997), BASE = `http://localhost:${PORT}`, MOCK_PORT = Number(process.env.STRIPE_MOCK_PORT || 12997);
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "tf-gs-chic-"));
process.env.TF_JETZT = "2026-11-25T20:00:00+01:00";
process.env.TF_GS_MAX_JE_IP = "100";
await startDev({ port: PORT, mock: true, dataDir, quiet: true, mockPort: MOCK_PORT });
const { saveStudio, getZahlung } = await import("../netlify/functions/_lib/store.mjs");
const shop = await import("../netlify/functions/_lib/gutschein-shop.mjs");
const gs = await import("../netlify/functions/_lib/gutschein.mjs");
const { provisionSatz, provisionFrei } = await import("../netlify/functions/_lib/config.mjs");
const { seiteAnpassen } = await import("../netlify/functions/_lib/gutschein-seite.mjs");
const { SEITEN } = await import("../netlify/functions/_lib/gutschein-seiten-html.mjs");

let ok = 0, fail = 0;
const check = (c, name, info) => { if (c) { ok++; console.log("  ✓", name); } else { fail++; console.log("  ✗", name, info !== undefined ? "→ " + JSON.stringify(info).slice(0, 400) : ""); } };
const post = (b) => fetch(BASE + "/api/gutschein-shop", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b) }).then(async (r) => ({ http: r.status, ...(await r.json()) }));
const slug = "chic-tattoo-augsburg", c = shop.SHOPS[slug];

console.log("Konfiguration");
check(c.studioId === "st_0yyvqSMyCfUr", "Studio-ID Chic (st_0yyvqSMyCfUr)");
check(JSON.stringify(c.aktionen.map((a) => [a.preisCent / 100, a.wertCent / 100])) === "[[100,150],[200,280],[400,500],[800,1000]]", "Stufen 100→150, 200→280, 400→500, 800→1.000", c.aktionen);
check(c.frei.minCent === 5000, "Wertgutschein ab 50 €");
check(c.aktionBis === "2026-12-24T16:00:00+01:00" && c.bonusBis === "2027-03-31" && c.aktionJeKaeufer === null, "Frist 24.12. 16 Uhr, Bonus bis 31.03.2027, mehrere je Person erlaubt");
check(!JSON.stringify(c).match(/stueck|ausverkauft/), "keine Stückzahl");

await saveStudio({ id: "st_chic_test", firma: "Chic Tattoo Augsburg", slug, email: "chic@example.com", inhaber: "Test", strasse: "Ulmer Straße 14", plz: "86154", ort: "Augsburg",
  modell: "kauf", zahlart: "geschenk", paket: "Test", status: "live", createdAt: new Date().toISOString(),
  stripe: { accountId: "acct_chic_test", chargesEnabled: true, payoutsEnabled: true, detailsSubmitted: true, kontoTyp: "standard" } });

console.log("Seite");
const r0 = await fetch(`${BASE}/gutschein-kaufen/${slug}`), h0 = await r0.text();
check(r0.status === 200 && /Für 100\s€ kaufen,/.test(h0) && /150\s€ bekommen\*/.test(h0), "ohne ?g=: Hero „Für 100 € kaufen, 150 € bekommen*“");
check(/Auch\sfür\s800\s€\skaufen,/.test(h0) && /1\.000\s€ bekommen/.test(h0), "Unterzeile nennt den größten (800 → 1.000 €)");
check(/\*Voller Wert bis 31\.03\.2027, danach der Kaufpreis bis 31\.12\.2029\./.test(h0), "Bedingung zum Sternchen im Hero");
check(h0.includes("Geschenk gesucht?") && h0.includes("Gönn dir selbst was"), "zwei Wege auf der Seite");
check(/Mehrere Gutscheine\? Einfach nacheinander kaufen/.test(h0) && /background:var\(--grund\)/.test(h0) && !/geschenkt\*/.test(h0) && !/\+50\s€/.test(h0), "kein „+… € geschenkt“ / „+50 €“");
check(!/nur online|nur im Studio/i.test(h0) && /im Studio/.test(h0), "online UND im Studio, nie „nur online“");
check(/og-weihnachten\.jpg\?v=/.test(h0) && /property="og:title" content="Gutschein für 100\s€ kaufen, 150\s€ bekommen · Chic Tattoo Augsburg"/.test(h0), "Vorschau (og) mit Angebot");
const h3 = await (await fetch(`${BASE}/gutschein-kaufen/${slug}?g=nr3`)).text();
check(/Für 400\s€ kaufen,/.test(h3) && /500\s€ bekommen\*/.test(h3) && /Auch\sfür\s100\s€\skaufen,/.test(h3), "?g=nr3: Hero 400 → 500 €, Unterzeile 100 → 150 €");
const hf = seiteAnpassen(SEITEN[slug], { shop: await shop.shopOeffentlich({ id: "st_chic_test", slug, firma: "Chic Tattoo Augsburg" }, c), aktiv: true }, { heroId: "frei" });
check(/ab 50\s€/.test(hf), "?g=frei: „Tattoo-Gutschein ab 50 €“");
for (const art of ["impressum", "datenschutz", "widerruf", "bedingungen"]) {
  const r = await fetch(`${BASE}/gutschein-kaufen/${slug}-${art}`), t = await r.text();
  check(r.status === 200 && t.includes("Christoph Weiße") && t.includes("archivo-var.woff2") && !t.includes("logo-gold"), `Rechtsseite ${art} im Chic-Look mit Verkäufer`);
}

console.log("Kauf (Stripe-Nachbau)");
const k1 = await post({ s: slug, auswahl: "nr2", kunde: "Kim Käufer", email: "kim@example.com", inhaltOk: true });
check(k1.url && k1.zahlung, "Aktions-Gutschein 200 → 280 € öffnet die Kasse", k1);
const z1 = await getZahlung("st_chic_test", k1.zahlung);
check(z1?.betragCent === 20000 && z1.gutschein.wertCent === 28000 && z1.gutschein.bonusCent === 8000, "Zahlung 200 €, Wert 280 €, Bonus 80 €", z1?.gutschein);
await fetch(k1.url, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "pm=card", redirect: "manual" });
let zb = null; for (let i = 0; i < 40 && zb?.status !== "bezahlt"; i++) { await new Promise((r) => setTimeout(r, 150)); zb = await getZahlung("st_chic_test", k1.zahlung); }
check(zb?.status === "bezahlt" && zb.gutschein?.code, "Zahlung im Nachbau bezahlt, Code vergeben", zb?.status);
const k2 = await post({ s: slug, auswahl: "nr1", kunde: "Kim Käufer", email: "kim@example.com", inhaltOk: true });
check(k2.url && k2.zahlung, "nach dem Kauf: zweiter Aktions-Gutschein derselben E-Mail geht (keine Grenze je Person, Domenic 27.11.)", k2);
const bedT = await (await fetch(`${BASE}/gutschein-kaufen/${slug}-bedingungen`)).text();
check(!/pro Person/i.test(bedT) && !/pro Person/i.test(h0), "nirgends „pro Person“ (Seite, Bedingungen)");
const k3 = await post({ s: slug, auswahl: "frei", betrag: "50", kunde: "Kim Käufer", email: "kim@example.com", inhaltOk: true });
check(k3.url, "Wertgutschein 50 € dazu kaufbar", k3);
const k4 = await post({ s: slug, auswahl: "frei", betrag: "40", kunde: "Kim Käufer", email: "kim2@example.com", inhaltOk: true });
check(!k4.url, "Wertgutschein unter 50 € abgelehnt", k4);

console.log("PDF und Kasse im Chic-Look");
const pdf = Buffer.from(await gs.gutscheinPdf({ id: "st_chic_test", firma: "Chic Tattoo Augsburg", slug, strasse: "Ulmer Straße 14", plz: "86154", ort: "Augsburg" },
  { id: "zl_x", studioId: "st_chic_test", betragCent: 20000, status: "bezahlt", gutschein: { shop: true, code: "GS-TEST-AAAA", token: "t", aktion: { id: "nr2", nr: 2 }, wertCent: 28000, bezahltCent: 20000, bonusCent: 8000, bonusBis: shop.bonusBisIso(c), ausgestelltAm: new Date().toISOString() } }));
check(pdf.slice(0, 4).toString() === "%PDF" && pdf.length > 20000, "Gutschein-PDF entsteht", pdf.length);
check(shop.markeFuer(c).logo.endsWith("/assets/gs-shop/chic/logo.png") && c.marke.kasse.button_color === "#E3121B" && c.marke.kasse.background_color === "#0D0C0C", "Logo und Kassenfarben von Chic");

console.log("Tattoofin gratis bis (provisionFreiBis)");
const prov = { modell: "provision", paket: "risikofrei" };
check(provisionSatz(prov) === 10, "Risikofrei ohne Ausnahme: 10 %");
check(provisionSatz({ ...prov, provisionFreiBis: "2026-12-31" }) === 0 && provisionFrei({ provisionFreiBis: "2026-12-31" }), "mit provisionFreiBis 2026-12-31 am 25.11.: 0 %");
check(provisionSatz({ ...prov, provisionFreiBis: "2026-11-24" }) === 10, "abgelaufen (24.11.): wieder 10 %");
check(!provisionFrei({ provisionFreiBis: "31.12.2026" }), "falsches Format zählt nicht");
check(provisionFrei({ provisionFreiBis: "2026-12-31" }, new Date("2026-12-31T22:59:00Z")) && !provisionFrei({ provisionFreiBis: "2026-12-31" }, new Date("2027-01-01T00:00:01+01:00")), "gilt bis 31.12. 23:59 Uhr");

console.log(`\n${ok} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail ? 1 : 0);
