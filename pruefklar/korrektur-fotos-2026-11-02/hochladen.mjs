// prüfklar: bessere Beweisfotos für bereits verschickte Briefe hochladen (bildsicher über die interne Schnittstelle). Alter Stand: je Ordner alt.json + alt-beweis.jpg.
import fs from "node:fs"; import path from "node:path";
const token = process.env.PK_TOKEN;
if (!token || token.length < 16) { console.error("Schlüssel nicht gefunden – nichts geändert."); process.exit(1); }
let ok = 0, fehler = 0;
for (const c of fs.readdirSync(".").filter((d) => fs.statSync(d).isDirectory())) {
  const r = await fetch("https://pruefklar.de/api/intern?aktion=check", { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json", origin: "https://pruefklar.de" }, body: JSON.stringify({ check: JSON.parse(fs.readFileSync(path.join(c, "neu.json"), "utf8")), bilder: { beweis: fs.readFileSync(path.join(c, "neu-beweis.jpg")).toString("base64") } }) });
  if (r.ok) ok++; else { fehler++; console.log(`${c}: Status ${r.status}`); }
}
console.log(fehler ? `${ok} geklappt, ${fehler} nicht. Sag Claude im Prüfklar-Chat Bescheid.` : `Fertig: ${ok} Fotos. Sag Claude im Prüfklar-Chat kurz Bescheid.`);
if (fehler) process.exit(1);
