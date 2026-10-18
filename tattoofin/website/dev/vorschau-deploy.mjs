// Vorschau-Site „tattoofin-vorschau“ bauen und veröffentlichen (NIE die echte Site tattoofin.de):
//   node dev/vorschau-deploy.mjs            → nur bauen (Ordner .vorschau-dist)
//   node dev/vorschau-deploy.mjs --deploy   → bauen + auf tattoofin-vorschau.netlify.app veröffentlichen
// Unterschiede zur echten Site: noindex überall, Banner „Vorschau – keine echten Zahlungen“, kein Pixel/CAPI/Umami,
// Steuerseite /vorschau.html. Die Site hat nur TF_VORSCHAU=1 (keine Stripe-Live-Schlüssel, keine Mail-Zugänge).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const VORSCHAU_SITE = "3c20a562-0fb8-4558-a93d-1c605b4f7940"; // tattoofin-vorschau.netlify.app
const ECHTE_SITES = ["dd784ec7-3a7e-4122-a8a3-87087ef7be7a", "tattoofin", "df46c9fe-08bf-4438-9ba7-568ae00e4842", "tattoofin-start"];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, ".vorschau-dist");
if (ECHTE_SITES.includes(VORSCHAU_SITE)) throw new Error("Abbruch: das ist die echte Site");

fs.rmSync(dist, { recursive: true, force: true });
fs.cpSync(path.join(root, "public"), dist, { recursive: true });
const BANNER = '<div style="background:#f2682a;color:#fff;font:700 13px/1.4 system-ui,sans-serif;text-align:center;padding:6px 10px;position:relative;z-index:100">Vorschau – keine echten Zahlungen · nichts hier ist live · <a href="/vorschau.html" style="color:#fff">Steuerung</a></div>';
for (const f of fs.readdirSync(dist).filter((n) => n.endsWith(".html"))) {
  let s = fs.readFileSync(path.join(dist, f), "utf8");
  s = s.replace(/<meta name="robots"[^>]*>/g, "").replace(/<head>/, '<head><meta name="robots" content="noindex,nofollow">');
  s = s.replace(/<script[^>]*tf-track\.js[^>]*><\/script>/g, "").replace(/<script[^>]*umami[^>]*><\/script>/g, "");
  if (!["app.html", "nachweis.html", "recht.html"].includes(f)) s = s.replace(/<body([^>]*)>/, (m) => m + BANNER);
  fs.writeFileSync(path.join(dist, f), s);
}
fs.copyFileSync(path.join(root, "dev/vorschau/vorschau.html"), path.join(dist, "vorschau.html"));
fs.writeFileSync(path.join(dist, "robots.txt"), "User-agent: *\nDisallow: /\n");
fs.rmSync(path.join(dist, "sitemap.xml"), { force: true });
fs.writeFileSync(path.join(dist, "_headers"), "/*\n  X-Robots-Tag: noindex, nofollow\n");
console.log("Vorschau gebaut:", dist);

if (process.argv.includes("--deploy")) {
  execFileSync("netlify", ["deploy", "--prod", "--site", VORSCHAU_SITE, "--dir", dist, "--functions", path.join(root, "netlify/functions"), "--message", "Vorschau Portal v2"], { cwd: root, stdio: "inherit" });
}
