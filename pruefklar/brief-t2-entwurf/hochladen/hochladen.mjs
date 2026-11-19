// prüfklar Lauf T2: Ergebnisse der 44 neuen Briefe auf die Live-Seite laden (bildsicher). Verschickt nichts.
import fs from "node:fs"; import path from "node:path";
const token = process.env.PK_TOKEN;
if (!token || token.length < 16) { console.error("Schlüssel nicht gefunden – nichts geändert."); process.exit(1); }
let ok = 0, fehler = 0;
for (const c of fs.readdirSync(".").filter((d) => fs.statSync(d).isDirectory())) {
  const b = (n) => fs.readFileSync(path.join(c, n)).toString("base64");
  const r = await fetch("https://pruefklar.de/api/intern?aktion=check", { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json", origin: "https://pruefklar.de" }, body: JSON.stringify({ check: JSON.parse(fs.readFileSync(path.join(c, "check.json"), "utf8")), bilder: { beweis: b("beweis.jpg"), uebersicht: b("uebersicht.jpg") } }) });
  if (r.ok) ok++; else { fehler++; console.log(`${c}: Status ${r.status}`); }
}
console.log(fehler ? `${ok} geklappt, ${fehler} nicht. Sag Claude im Prüfklar-Chat Bescheid.` : `Fertig: ${ok} Ergebnisse. Sag Claude im Prüfklar-Chat kurz Bescheid.`);
if (fehler) process.exit(1);
