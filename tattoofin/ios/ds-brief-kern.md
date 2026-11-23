# DS-Brief (Kern): Tattoofin-App, drei Hebel aus dem Befund

Stufe: **Kern**, Auftrag Domenic 18.11.2026. Grundlage: `content/_ds-appkonzept/beispiele/01-tattoofin.md`, Branch `claude/tattoofin-app-ds-kern` auf dem Stand der Korrekturen vom 16.11. (`claude/tattoofin-app-1-1-ohne-aufsteller`, 22969e6). Nichts hochladen, nichts einreichen.

## Zweck und Erfolgsmoment

- **Zweck:** Keine stillen Fehler mehr, große Schrift überall, Barrierefreiheit wird bei jedem Rundgang automatisch geprüft.
- **Erfolgsmoment** (unverändert, Annahme bis zum Voll-Brief): Nach dem ersten Start hat das Studio einen Zahlungslink an der Theke erstellt und gesehen, dass er bezahlt wurde.
- **Hauptaufgabe:** Zahlungslink über Betrag X ab App-Start. Tap-Budget ≤ 4 ohne Ziffern. Gemessen wird das erst in der Voll-Stufe.

## Hebel 1: verschluckte Fehler sichtbar machen

| Bildschirm | Vorher | Jetzt (Zustand) |
|---|---|---|
| Konto → Mitteilungen | Geräteliste lädt nicht → Schalter zeigen still die Standardwerte, Tippen überschreibt die echten Einstellungen | **Teilweise:** Fehlerzeile + „Nochmal versuchen“, Schalter gesperrt, bis der Stand geladen ist |
| Gutschein-Detail | Neuladen scheitert → alter Stand ohne Hinweis | **Ohne Netz:** „Aktualisieren hat nicht geklappt. Stand von 10:05.“ + „Nochmal versuchen“ |
| Zahlungslink (offen) | Status-Abfrage alle 3 s scheitert → bleibt still „offen“ | **Ohne Netz:** gleiche Zeile mit Uhrzeit, verschwindet beim nächsten Erfolg |
| Gutschein-Scanner | Kamera startet nicht → schwarzer Bildschirm | Wechsel zu „Code eintippen“ mit Satz „Die Kamera ließ sich gerade nicht starten“ |
| Werbung → Beitrag teilen | Bilder lassen sich nicht ablegen → Knopf tut nichts | Fehlerzeile „Teilen hat nicht geklappt“ |

Alle übrigen `try?` sind gewollte Rückfälle (Zwischenspeicher, Aufräumen, Datumsformate, tolerantes Dekodieren, Rückfall-Ketten mit eigener Fehlermeldung) und tragen je ein `// ds-ok: <Grund>`.

## Hebel 2: Schrift-Deckel nur am Ziffernblock

- Weg: `.dynamicTypeSize(...xxxLarge)` an der Wurzel und 17 Wiederholungen an Blättern (`tfSchriftGrenze`).
- Bleibt, einzeln begründet: `Ziffernblock` in `KasseView.swift`. Bei 3 Spalten passen 12 Tasten bei AX-Größen nicht mehr nebeneinander, und Ziffern auf einer Taste bleiben bei xxxLarge gut lesbar.
- Alles andere wächst bis AX5. Wo Inhalte bei AX3 abgeschnitten werden, meldet das Hebel 3.

## Hebel 3: Audit in den Rundgängen

- Neuer UI-Test `TattoofinUITests/DSRundgangUITests.swift`: 5 Tabs × normal, AX3 und dunkel. Je Tab Bildschirmfoto `ds-<art>-<tab>` und `performAccessibilityAudit`.
- Läuft gegen den lokalen Server (`tattoofin/website: node dev/app-lokal.mjs`) wie die anderen Rundgänge.
- Bewusst akzeptierte Befunde stehen einzeln mit Grund in `akzeptiert(_:)`, nie pauschal.
- Jeder Tab-Inhalt hat `bildschirm.<tab>` als Kennung (`HauptView`).

## Nicht in diesem Schritt (offen für Voll)

Tap-Zählung der Hauptaufgabe, Ereignisse/Messung, Werte-Tabelle (220 Abstände als Zahl), Radius-Stufen, Reduce Motion (12 Animationen), Markenzeichen „Quittung“.

## Ergebnis (18.11.2026)

**Prüfer und Tests**
- DS-Prüfer: 0 Fehler (vorher 9). `try?` an sichtbaren Stellen von 54 auf 0, 58 Stellen einzeln mit `ds-ok` begründet.
- Unit-Tests: 96 von 97 grün. Der eine Fehler ist der StoreKit-Kauftest. Er braucht im Simulator einen Klick auf Apples Kauf-Fenster und hat mit diesen Änderungen nichts zu tun.
- DS-Rundgang mit Audit, 5 Tabs × normal/AX3/dunkel: grün auf iPhone 17 und iPhone 17e (jeweils eigener, frischer Simulator). Fotos in `ds-pruefung/2026-11-18/`.
- Kassen-Layout-Tests (Knopf ohne Scrollen, Tasten fest, große Schrift): grün auf iPhone 17 und 17e.
- Verlauf: 59 Audit-Befunde → 36 → 12 → 0.

**Echte Befunde, die das Audit gefunden hat (behoben)**
- Beträge und Codes schrumpften (`minimumScaleFactor`) statt umzubrechen: Zahlungen, Gutscheine, Kennzahlen.
- Zeilen stehen ab AX-Größen jetzt untereinander statt nebeneinander.
- „Gutschein verkaufen“ war in AX3 abgeschnitten. Knöpfe stellen das Symbol bei AX-Größen jetzt über den Text.
- Abschnittskopf „Verkaufte Gutscheine“ in Systemgrau (Kontrast knapp) → `ListenKopf`.
- Hinweis unter „Kunde wird heute tätowiert“ wurde im Schalter-Label abgeschnitten → steht jetzt unter dem Schalter.
- Grenzen-Zeile „Betrag zwischen 50 € und 20.000 €“ war in AX3 abgeschnitten → bricht um.

**Bewusst akzeptiert (einzeln im Test begründet)**
- Kontrast an Zeilen unter der Glas-Tab-Leiste bzw. hinter dem angehefteten Knopf „Zahlungslink erstellen“.
- „Schriftgröße teilweise nicht änderbar“ in normal/dunkel, weil dort absichtliche Layoutwechsel gemeldet werden. In AX3 wird das streng geprüft.
- Das System-Suchfeld.
- Kontrast ohne zuordenbares Element: läuft nur als Warnung. **Offen für die Handprüfung**, vermutlich der System-Umschalter auf „Zahlungen“.

**Offen**
- VoiceOver-Runde von Hand (einmal je Version).
- Kasse in AX3: Der Ziffernblock liegt unter dem ersten Bildschirm, man muss scrollen. Für Bedienungshilfe-Größen ist das zulässig. Wenn Domenic will, prüfen wir es am Gerät.
- Rundgang „ohne Netz“ braucht den Netz-Schalter des lokalen Servers.
- Tap-Zählung der Hauptaufgabe.
