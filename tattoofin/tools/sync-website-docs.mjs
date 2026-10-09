// Übernimmt Vertrag und AVV aus den Druckvorlagen (studios/14-vertrag.html, studios/15-avv.html)
// in die Website (website/public/vertrag.html, avv.html), damit online exakt derselbe Text gilt.
// Aufruf nach jeder Vertragsänderung:  node tools/sync-website-docs.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = path.join(root, "website", "public");

const cut = (s, startRe, endRe) => {
  const a = s.search(startRe);
  if (a < 0) return s;
  const rest = s.slice(a);
  const b = rest.search(endRe);
  return b < 0 ? s.slice(0, a) : s.slice(0, a) + rest.slice(b);
};

function extract(file, { onlineHinweis, removeOrder }) {
  const html = fs.readFileSync(path.join(root, file), "utf8");
  const style = (html.match(/<style>([\s\S]*?)<\/style>/) || [, ""])[1].replace(/@page\{[^}]*\}/g, "");
  let main = (html.match(/<main class="doc">([\s\S]*?)<\/main>/) || [, ""])[1];
  main = main.replace(/<div class="hint">[\s\S]*?<\/div>\n?/, "");
  main = main.replace(/<div class="sig">[\s\S]*?<\/div>\s*<\/div>\n?/g, "").replace(/<div class="sig">[\s\S]*?<\/div>\n?/g, "");
  if (removeOrder) {
    main = cut(main, /<h2>Bestellung<\/h2>/, /<h2>§ 1/);
    main = cut(main, /<!-- Anlage B -->/, /<p class="footer-note">/);
    // Kundenfeld: Online-Angaben statt Formular
    main = main.replace(/(<div class="box"><b>Kunde \(Studio\)<\/b>)[\s\S]*?<\/table><\/div>/, '$1<br>gemäß den Angaben in der Online-Bestellung (Firma, Anschrift, Vertreter, E-Mail).</div>');
  }
  return { style, main: onlineHinweis + main };
}

const page = (title, { style, main }) => `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} – Tattoofin</title>
<link rel="stylesheet" href="/css/doc.css">
<style>${style}
body{background:#fbb316 radial-gradient(rgba(31,61,92,.13) 1.3px,transparent 1.6px) 0 0/18px 18px}
.doc{margin:0 auto 40px;border:3px solid #1f3d5c;border-radius:18px;box-shadow:8px 8px 0 #1f3d5c}
.webnav{max-width:210mm;margin:0 auto;padding:14px 4px;display:flex;justify-content:space-between;align-items:center;gap:10px;font:700 15px 'DM Sans',system-ui,sans-serif}
.webnav a{color:#1f3d5c;text-decoration:none;background:#fff;border:3px solid #1f3d5c;border-radius:99px;padding:9px 16px;box-shadow:3px 3px 0 #1f3d5c}
.webnav button{background:#1f3d5c;color:#fbb316;border:3px solid #1f3d5c;border-radius:99px;padding:9px 16px;font:700 14px 'DM Sans',sans-serif;cursor:pointer;box-shadow:3px 3px 0 #0c1a29}
@media (max-width:700px){
  .webnav{padding:12px}
  .doc{width:auto;margin:0 10px 30px;padding:20px 16px;font-size:10.5pt;border-radius:14px;box-shadow:5px 5px 0 #1f3d5c}
  .dochead{flex-direction:column-reverse;gap:8px}.dochead .meta{text-align:left}.dochead .meta img{width:64px}
  .parties{grid-template-columns:1fr}
  .doc table{display:block;overflow-x:auto}
  .form td:first-child{width:auto}
}
@media print{.webnav{display:none}body{background:#fff}.doc{border:0;box-shadow:none}}
</style>
</head><body>
<!-- Automatisch erzeugt aus tattoofin/${title === "Vertrag" ? "studios/14-vertrag.html" : "studios/15-avv.html"} (tools/sync-website-docs.mjs). Nicht direkt bearbeiten. -->
<nav class="webnav"><a href="/">← Tattoofin</a><button onclick="print()">Drucken / PDF</button></nav>
<main class="doc">
${main}
</main>
<script src="/js/doc-config.js"></script>
</body></html>
`;

const hinweis = (t) => `<p class="small" style="background:#fff4dc;border:1px solid #f3d79a;border-radius:8px;padding:8px 12px;margin:0 0 14px">${t}</p>\n`;

fs.writeFileSync(path.join(pub, "vertrag.html"), page("Vertrag", extract("studios/14-vertrag.html", {
  removeOrder: true,
  onlineHinweis: hinweis("Online-Fassung, Version <span data-cfg=\"vertragVersion\"></span>. Der Vertrag kommt durch die Online-Bestellung zustande: Modell, Kundendaten und Zahlungsart werden dort gewählt, die Zahlung läuft über Stripe. Eine Bestätigung mit allen Angaben kommt per E-Mail."),
})));
fs.writeFileSync(path.join(pub, "avv.html"), page("AVV", extract("studios/15-avv.html", {
  removeOrder: false,
  onlineHinweis: hinweis("Online-Fassung, Version <span data-cfg=\"vertragVersion\"></span>. Wird bei der Online-Bestellung zusammen mit dem Vertrag akzeptiert."),
})));

// Styles der Druckvorlagen übernehmen (Fonts-Pfad anpassen)
const css = fs.readFileSync(path.join(root, "assets", "tattoofin.css"), "utf8").replace("@import url(fonts.css);", "@import url(/css/fonts.css);");
fs.writeFileSync(path.join(pub, "css", "doc.css"), css);
fs.copyFileSync(path.join(root, "assets", "config.js"), path.join(pub, "js", "doc-defaults.js"));
console.log("ok: vertrag.html, avv.html, css/doc.css, js/doc-defaults.js");
