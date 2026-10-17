# Baut uebersicht.md aus kandidaten.json + ergebnis.json (vorher _pruefe.mjs laufen lassen).
import json
from pathlib import Path

ORDNER = Path(__file__).parent
k = json.loads((ORDNER.parent / "kandidaten.json").read_text())
e = json.loads((ORDNER / "ergebnis.json").read_text())
seiten = {s["key"]: s for s in e["ergebnisse"]}
bestellen, gratis = seiten["1-bestellen"], seiten["2-gratis-entwurf"]
links_ok = not bestellen["probleme"] and not gratis["probleme"]
status = "OK" if links_ok else "Fehler"

z = []
z.append("# Handy-Prüfung Vor-Ort-Links Bamberg, Sa 17.10.2026\n")
z.append(f"Geprüft am {e['geprueft'][:16].replace('T', ' ')} UTC mit Handy-Ansicht {e['viewport']}, live und nur lesend. "
         "Prüfskript: `_pruefe.mjs`, Rohdaten: `ergebnis.json`, Bilder: `screenshots/`, QR-Codes: `qr/`.\n")
z.append("## Wichtig vorab: Es gibt keine eigenen Entwürfe pro Restaurant\n")
z.append("In der GastroSite-Datenbank liegt für Bamberg **kein einziger Entwurf eines echten Betriebs** (nur 3 Test-Entwürfe, nochmals geprüft am 17.10.). "
         "Grund steht in `../besuche-test.md`: Ein Entwurf bräuchte eine Kontakt-Einwilligung des Inhabers und löst automatische Mails aus. "
         "Deshalb zeigst du heute bei **allen** Betrieben dieselben Links. Die Spalte „Status“ bezieht sich auf diese gemeinsamen Links.\n")
z.append("## Geprüfte Links\n")
z.append("| Link | Wofür | Status | Befund |")
z.append("|---|---|---|---|")
for s in e["ergebnisse"]:
    befund = "; ".join(s["probleme"]) or f"lädt (200), {s['bilder']} Bilder ok, keine Platzhalter, passt auf 390 px"
    z.append(f"| {s['url']} | {s['name']} | {'Fehler' if s['probleme'] else 'OK'} | {befund} |")
z.append("")
z.append("## Liste pro Restaurant\n")
z.append("| # | Restaurant | Adresse | Link zum Zeigen | Status |")
z.append("|---|---|---|---|---|")
for b in k["kandidaten"]:
    z.append(f"| {b['nr']} | {b['name']} | {b['adresse']} | Bestellen: QR links · Gratis-Entwurf: QR rechts | {status} (kein eigener Entwurf) |")
for i, b in enumerate(k["reserve"], 1):
    z.append(f"| R{i} | {b['name']} | {b['adresse']} | Bestellen: QR links · Gratis-Entwurf: QR rechts | {status} (kein eigener Entwurf) |")
z.append("")
z.append("## Was dir vor Ort auffallen kann (nicht geändert, liegt auf der Live-Seite)\n")
z.append("1. **Zwei Preise auf der Bestellseite:** Oben steht der rote Balken „249 € statt 499 €“ und der Knopf „Direkt bestellen · 249 €“, "
         "die große Überschrift sagt aber „Für 499 €.“. Ganz unten steht „oder direkt bestellen · 499 €“ und „Komplette Website für 499 € netto“. "
         "Am besten sagst du gleich dazu: „Normal 499 €, für die ersten 10 nur 249 €.“")
z.append("2. **Kundenstimme aus Bamberg:** Auf der Startseite steht eine Bewertung von „Michael S., Inhaber · Weinfass · Bamberg“. "
         "Bamberger Wirte kennen sich. Wenn das kein echter Kunde ist, nicht darauf ansprechen lassen und bald von der Seite nehmen.")
z.append("3. **Beispiel-Seite:** heißt „Demo Pizzeria Nürnberg“ mit „Sternelokal seit 2008“. Lädt sauber, ist aber klar als Muster zu erkennen – so ansagen.")
z.append("4. **Cookie-Hinweis** liegt beim ersten Öffnen über der unteren Bildhälfte. Einmal „Nur notwendige“ tippen, dann ist er weg.")
z.append("")
(ORDNER / "uebersicht.md").write_text("\n".join(z) + "\n", encoding="utf-8")
print("geschrieben:", ORDNER / "uebersicht.md")
