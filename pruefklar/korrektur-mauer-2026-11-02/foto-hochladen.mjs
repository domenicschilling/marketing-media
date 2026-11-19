// prüfklar: Foto und Eintrag von Mauer über die interne Schnittstelle der Seite hochladen (bildsicher, im Gegensatz zu „netlify blobs:set“).
import fs from "node:fs";
const token = process.env.PK_TOKEN;
if (!token || token.length < 16) { console.error("Schlüssel nicht gefunden – nichts geändert."); process.exit(1); }
const check = JSON.parse(fs.readFileSync("neu.json", "utf8"));
const bild = fs.readFileSync("neu-beweis.jpg");
const r = await fetch("https://pruefklar.de/api/intern?aktion=check", {
  method: "POST",
  headers: { authorization: `Bearer ${token}`, "content-type": "application/json", origin: "https://pruefklar.de" },
  body: JSON.stringify({ check, bilder: { beweis: bild.toString("base64") } }),
});
console.log(r.ok ? "Fertig. Sag Claude im Prüfklar-Chat kurz Bescheid." : `Hat nicht geklappt (Status ${r.status}). Sag Claude im Prüfklar-Chat Bescheid.`);
if (!r.ok) process.exit(1);
