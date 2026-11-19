// DS Werbekonzept – rendert DS-Vorlagen (HTML) zu PNG und erzeugt die Prüfbilder.
// Aufruf (aus dem Repo-Hauptordner):
//   node content/_ds-werbekonzept/vorlagen/render.mjs <datei.html> [weitere.html …] [--pruefung] [--bogen <ziel.jpg>]
// Ergebnis je Datei neben der HTML-Datei:
//   <name>.png                  Export in Originalgröße (data-w × data-h am .ds-Element), deviceScaleFactor 1
//   mit --pruefung zusätzlich:
//   <name>.pruef-daumen.png     auf 270 px Breite verkleinert (Daumen-Test: 1 Sekunde ansehen, was bleibt hängen?)
//   <name>.pruef-ohne-logo.png  Logo/Absender ausgeblendet (Logo-weg-Test)
//   <name>.pruef-zone.png       9:16 mit Meta-Safe-Zone, 4:5 mit 3:4-Profilausschnitt (rot = abgeschnitten/verdeckt)
//   --bogen <ziel.jpg>          alle gerenderten PNGs nebeneinander in einem Bild (z. B. Logo-weg-Vergleich mehrerer Marken
//                               oder Karussell-Folien), Höhe je Bild 675 px
// Prüfbilder (*.pruef-*.png) sind nur zum Ansehen, nie hochladen.
import path from "path";
import fs from "fs";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const pruefung = args.includes("--pruefung");
const bi = args.indexOf("--bogen");
const bogen = bi >= 0 ? path.resolve(args[bi + 1]) : null;
const dateien = args.filter((a, i) => !a.startsWith("--") && !(bi >= 0 && i === bi + 1)).map((d) => path.resolve(d));
if (!dateien.length) { console.error("Aufruf: node content/_ds-werbekonzept/vorlagen/render.mjs <datei.html> … [--pruefung] [--bogen ziel.jpg]"); process.exit(1); }

const browser = await chromium.launch();
const fertig = [];
for (const datei of dateien) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto("file://" + datei);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  const box = await page.evaluate(() => { const d = document.querySelector(".ds"); return { w: +d.dataset.w, h: +d.dataset.h }; });
  await page.setViewportSize({ width: box.w, height: box.h });
  const basis = datei.replace(/\.html$/, "");
  const clip = { x: 0, y: 0, width: box.w, height: box.h };
  await page.screenshot({ path: basis + ".png", clip });
  fertig.push(basis + ".png");
  // Warnungen: Gestaltungsmittel, die im DS nicht vorkommen sollen
  const warn = await page.evaluate(() => {
    const w = [];
    for (const e of document.querySelectorAll(".ds *")) {
      const s = getComputedStyle(e);
      if (e.classList.contains("korn")) continue;
      if (/gradient/.test(s.backgroundImage)) w.push("Verlauf an ." + [...e.classList].join("."));
      if (s.boxShadow !== "none") w.push("Schatten an ." + [...e.classList].join("."));
      if (parseFloat(s.borderRadius) > 40) w.push("Pille/Rundung an ." + [...e.classList].join("."));
      if (s.textShadow !== "none" && !e.closest(".cap")) w.push("Textschatten an ." + [...e.classList].join("."));
    }
    const sichtbar = [...document.querySelectorAll(".ds > *")].filter((e) => !e.classList.contains("korn") && !e.dataset.gehoert && getComputedStyle(e).visibility !== "hidden");
    if (sichtbar.length > 3) w.push(`${sichtbar.length} Elemente (Ziel: höchstens 3: Motiv, Zeile, Absender; Teile davon mit data-gehoert="…" markieren)`);
    return w;
  });
  if (pruefung) {
    await page.evaluate(() => document.body.classList.add("ohne-logo"));
    await page.screenshot({ path: basis + ".pruef-ohne-logo.png", clip });
    await page.evaluate(() => { document.body.classList.remove("ohne-logo"); document.body.classList.add(document.querySelector(".ds").dataset.h === "1920" ? "safe" : "raster34"); });
    await page.screenshot({ path: basis + ".pruef-zone.png", clip });
    const klein = await browser.newPage({ viewport: { width: 270, height: Math.round((270 * box.h) / box.w) } });
    await klein.setContent(`<body style="margin:0"><img src="data:image/png;base64,${fs.readFileSync(basis + ".png").toString("base64")}" style="width:270px;display:block"></body>`);
    await klein.screenshot({ path: basis + ".pruef-daumen.png" });
    await klein.close();
  }
  console.log("ok:", path.relative(process.cwd(), basis + ".png"), warn.length ? "\n  Hinweis: " + warn.join("; ") : "");
  await page.close();
}
if (bogen) {
  const h = 675, bilder = fertig.map((f) => `<img src="data:image/png;base64,${fs.readFileSync(f).toString("base64")}" style="height:${h}px;display:block">`).join("");
  const page = await browser.newPage({ viewport: { width: 400, height: h + 40 } });
  await page.setContent(`<body style="margin:0;background:#5a5a5a"><div id="b" style="display:inline-flex;gap:20px;padding:20px">${bilder}</div></body>`);
  const b = await page.$("#b");
  await b.screenshot({ path: bogen, type: "jpeg", quality: 88 });
  console.log("Bogen:", path.relative(process.cwd(), bogen));
}
await browser.close();
