// Erzeugt die Vorschaubilder + WhatsApp-Mock (vorher/nachher) für Domenic. Nur lokal, nichts wird gesendet.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const WEB = "/Users/domi/marketing-media-tf-teilen/tattoofin/website";
const OUT = "/Users/domi/Marketing-Maschine/content/tattoofin/teilen-2026-11";
process.env.SITE_URL = "https://tattoofin.de";
const { vorschauBild } = await import(WEB + "/netlify/functions/_lib/vorschaubild.mjs");
const { Leinwand } = await import(WEB + "/netlify/functions/_lib/leinwand.mjs");
const { pngVerkleinern } = await import(WEB + "/netlify/functions/_lib/png.mjs");
const { teilText } = await import(WEB + "/netlify/functions/portal.mjs");
const require = createRequire("/Users/domi/Marketing-Maschine/");
const { chromium } = require("playwright");

fs.mkdirSync(OUT, { recursive: true });
const studio = { firma: "Tattoofin Demo-Studio" };
const ID = "zl_7Kq2mX9pLr4T";
const LINK = `https://tattoofin.de/z/${ID}`;

// Beispiel-Logo eines Studios (frei erfunden, nur zur Ansicht)
const lg = new Leinwand(760, 200, "#ffffff");
lg.fuellen([Leinwand.kreis(100, 100, 86)], "#111111");
lg.fuellen([Leinwand.kreis(100, 100, 70)], "#ffffff");
lg.text("I", { x: 100, y: 138, groesse: 110, farbe: "#111111", ausrichtung: "mitte" });
lg.text("INK & IRON", { x: 212, y: 118, groesse: 84, farbe: "#111111", abstand: 4 });
lg.text("TATTOO STUDIO · BAMBERG", { x: 216, y: 168, schrift: "dm500", groesse: 30, farbe: "#555555", abstand: 6 });
// wie im Betrieb: beim Hochladen verkleinerte Logo-Vorschau (branding.mjs), daraus zeichnet das Vorschaubild
const beispielLogo = pngVerkleinern(lg.png(), { maxW: 1240, maxH: 184 }).png;

const bilder = {
  "vorschau-zahlung.png": vorschauBild({ firma: studio.firma, betrag: "100,00 €", beschreibung: "Tattoo-Projekt", klarna: true }),
  "vorschau-zahlung-ohne-klarna.png": vorschauBild({ firma: studio.firma, betrag: "1.500,00 €", beschreibung: "Rückenstück Drache", klarna: false }),
  "vorschau-anzahlung.png": vorschauBild({ firma: studio.firma, betrag: "150,00 €", etikett: "Anzahlung an", beschreibung: "Anzahlung · Unterarm Rose" }),
  "vorschau-gutschein.png": vorschauBild({ firma: studio.firma, betrag: "80,00 €", etikett: "Gutschein von", beschreibung: "Wertgutschein" }),
  "vorschau-mit-studio-logo.png": vorschauBild({ firma: "Ink & Iron", betrag: "450,00 €", beschreibung: "Fineline Schriftzug", klarna: true, logo: beispielLogo }),
  "vorschau-neutral-bezahlt-storniert.png": vorschauBild({ neutral: true }),
};
for (const [n, b] of Object.entries(bilder)) fs.writeFileSync(path.join(OUT, n), b);

// Texte (genau wie der Server sie baut)
const t = {
  zahlung: teilText({ ...studio }, { art: "gesamt", betragCent: 10000, kunde: "Kai Muster", beschreibung: "Tattoo-Projekt" }, LINK),
  anzahlung: teilText(studio, { art: "anzahlung", betragCent: 15000, kunde: "Kai Muster", beschreibung: "Unterarm Rose" }, LINK),
  gutschein: teilText(studio, { art: "gutschein", betragCent: 8000, kunde: "Greta Muster", beschreibung: "Wertgutschein", gutschein: { empfaenger: "Max" } }, LINK),
};
// klarnaFuer hängt von der Konfiguration ab: Für den Mock die Fassung mit Klarna erzwingen (so wie bei einem Studio mit Klarna)
if (!/Klarna/.test(t.zahlung)) t.zahlung = t.zahlung.replace("Google Pay.", "Google Pay. Klarna verfügbar.");
fs.writeFileSync(path.join(OUT, "texte.md"), `# Teilen-Texte (Stand 15.11.2026)\n\nSo kommen die Texte vom Server (App und Web übernehmen sie unverändert). Der Link ist der Kurzlink \`tattoofin.de/z/<id>\`.\n\n## Zahlungslink (Projektpreis, Studio mit Klarna)\n\n\`\`\`\n${t.zahlung}\n\`\`\`\n\n## Anzahlung\n\n\`\`\`\n${t.anzahlung}\n\`\`\`\n\n## Gutschein\n\n\`\`\`\n${t.gutschein}\n\`\`\`\n\nOhne Klarna (z. B. Paket Risikofrei ab 20.11.2026 oder Link mit Gutschein-Wort) fehlt nur „Klarna verfügbar.“.\n`);

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const textHtml = (s) => esc(s).replace(/(https:\/\/\S+)/g, '<span class="lnk">$1</span>').replace(/\n/g, "<br>");
const bild64 = "data:image/png;base64," + bilder["vorschau-zahlung.png"].toString("base64");
const ALT = "Hi Kai, hier ist dein Zahlungslink für Tattoo-Projekt (100,00 €): https://tattoofin.de/zahlung.html?z=zl_7Kq2mX9pLr4T\n\nBezahlen kannst du per Karte, Apple Pay oder Google Pay. Klarna verfügbar.\n\nLiebe Grüße, Tattoofin Demo-Studio";

const telefon = (titel, inhalt) => `
<div class="spalte"><div class="etikett">${titel}</div>
<div class="phone"><div class="kopf"><div class="av">KM</div><div><b>Kai Muster</b><small>online</small></div></div>
<div class="chat">${inhalt}</div></div></div>`;

const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><style>
*{box-sizing:border-box}body{margin:0;background:#fff8e6;font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;padding:36px 40px;width:1040px}
h1{font:800 28px/1.2 -apple-system,sans-serif;color:#1f3d5c;margin:0 0 6px}p.sub{margin:0 0 24px;color:#4f6478;font-size:16px}
.reihe{display:flex;gap:36px;align-items:flex-start}.spalte{flex:1}
.etikett{display:inline-block;font:800 13px/1 -apple-system,sans-serif;letter-spacing:.12em;text-transform:uppercase;background:#1f3d5c;color:#fff;padding:7px 12px;border-radius:99px;margin-bottom:12px}
.spalte:first-child .etikett{background:#c8ced6;color:#1f3d5c}
.phone{border:3px solid #1f3d5c;border-radius:34px;overflow:hidden;background:#efeae2;box-shadow:8px 8px 0 #1f3d5c}
.kopf{display:flex;gap:10px;align-items:center;background:#f6f6f6;padding:14px 16px;border-bottom:1px solid #ddd}
.kopf b{display:block;font-size:16px}.kopf small{color:#667;font-size:12px}
.av{width:38px;height:38px;border-radius:50%;background:#fbb316;color:#1f3d5c;font-weight:800;display:grid;place-items:center;font-size:14px}
.chat{padding:18px 12px 22px;min-height:560px;background-color:#efeae2;background-image:radial-gradient(#e2dbcf 1.2px,transparent 1.2px);background-size:18px 18px}
.bubble{margin-left:auto;max-width:88%;background:#d9fdd3;border-radius:12px 4px 12px 12px;padding:4px;box-shadow:0 1px .5px rgba(0,0,0,.13);font-size:15.5px;line-height:1.36;color:#111b21}
.karte{background:#cfeec7;border-radius:8px;overflow:hidden;margin-bottom:4px}
.karte img{display:block;width:100%}
.karte .k-text{padding:8px 10px 9px}.karte b{display:block;font-size:14.5px}.karte span{display:block;font-size:13px;color:#3b4a54;margin-top:2px}.karte em{display:block;font-style:normal;font-size:12px;color:#667781;margin-top:3px}
.klein{display:flex;gap:10px;align-items:center;padding:8px 10px}.klein .ph{width:62px;height:62px;border-radius:6px;background:#bcdcb4;flex:none}
.msg{padding:4px 7px 2px}.lnk{color:#027eb5;text-decoration:underline;word-break:break-all}
.zeit{text-align:right;font-size:11px;color:#667781;padding:0 6px 3px}.zeit i{color:#53bdeb;font-style:normal;margin-left:3px}
</style></head><body>
<h1>Zahlungslink in WhatsApp: vorher und nachher</h1>
<p class="sub">Kurzer Link tattoofin.de/z/…, große Vorschau mit Studio und Betrag, Text mit Absätzen. Kundenname steht nur im Text, nie in der Vorschau.</p>
<div class="reihe">
${telefon("Vorher", `<div class="bubble"><div class="karte klein"><div class="ph"></div><div><b>Zahlung – Tattoofin</b><em>tattoofin.de</em></div></div><div class="msg">${textHtml(ALT)}</div><div class="zeit">14:32 <i>✓✓</i></div></div>`)}
${telefon("Nachher", `<div class="bubble"><div class="karte"><img src="${bild64}"><div class="k-text"><b>Tattoofin Demo-Studio · 100,00 €</b><span>Tattoo-Projekt · sicher bezahlen per Karte, Apple Pay oder Google Pay · Klarna verfügbar</span><em>tattoofin.de</em></div></div><div class="msg">${textHtml(t.zahlung)}</div><div class="zeit">14:32 <i>✓✓</i></div></div>`)}
</div></body></html>`;
fs.writeFileSync(path.join(OUT, "whatsapp-mock.html"), html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1040, height: 900 }, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: "load" });
await page.screenshot({ path: path.join(OUT, "whatsapp-mock.png"), fullPage: true });
// Einzelansicht „nachher“ in Handy-Breite
const einzeln = html.replace(/<h1>[\s\S]*?<\/p>/, "").replace(/width:1040px/, "width:470px").replace(/<div class="spalte"><div class="etikett">Vorher[\s\S]*?<\/div><\/div><\/div>\n/, "");
await page.setViewportSize({ width: 470, height: 900 });
await page.setContent(einzeln, { waitUntil: "load" });
await page.screenshot({ path: path.join(OUT, "whatsapp-mock-nachher-handy.png"), fullPage: true });
await browser.close();
console.log(fs.readdirSync(OUT).join("\n"));
