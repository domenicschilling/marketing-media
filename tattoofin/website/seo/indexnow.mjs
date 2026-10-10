// Meldet alle URLs aus der Sitemap per IndexNow an Bing, Yandex u. a. (Google nutzt IndexNow nicht).
// Aufruf nach jedem Deploy (im Ordner tattoofin/website):  node seo/indexnow.mjs
import fs from "node:fs";
const key = fs.readFileSync(new URL("./indexnow-key.txt", import.meta.url), "utf8").trim();
const sitemap = fs.readFileSync(new URL("../public/sitemap.xml", import.meta.url), "utf8");
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST", headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: "tattoofin.de", key, keyLocation: `https://tattoofin.de/${key}.txt`, urlList }),
});
console.log("IndexNow:", res.status, res.statusText, "·", urlList.length, "URLs");
