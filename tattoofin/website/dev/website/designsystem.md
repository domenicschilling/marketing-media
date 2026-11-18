# Designsystem-Blatt – Tattoofin (Schritt 6, 18.11.2026)

Quelle der Werte: `tattoofin/website/public/assets/site/werte.css` (Repo marketing-media). Marke fest (Domenic 01.11./16.11.): Gelb `#fbb316`, Blau `#1f3d5c`, Papier `#f5ead2`, Hell `#fff7e3`, Luckiest Guy (Überschriften, Knöpfe) + DM Sans (Text).

| Wert | Stufen | Gemessen (1440 px, Startseite + 11 Unterseiten) |
|---|---|---|
| Schrift | `--f-fn` 12 · `--f-klein` 14 · `--f-ui` 16 · `--f-text` 16/18 · `--f-lead` 19–22 · `--f-h3` 21–28 · `--f-h2` 31–56 · `--f-h1` 42–80 | **8**: 12, 14, 16, 18, 22, 28, 56, 80 |
| Radius | `--r-klein` 6 · `--r-karte` 14 · `--r-gross` 26 (+ Pille 999, Kreis 50 %) | **3**: 6, 14, 26 |
| Schatten | `--sch-hart` 4/5/0 · `--sch-klein` 3/3/0 (Farbe je Grund: Blau, Gelb, Hell) | **2** |
| Abstand | `--s1`–`--s9`: 4, 8, 12, 16, 24, 32, 48, 64, 96 | in neuen Bausteinen |
| Bewegung | `--schnell` 150 ms · `--ruhig` 300 ms; `prefers-reduced-motion` aus | |

**Ausnahmen (bewusst):**
- Passung des ersten Bildschirms der Startseite auf kleinen/flachen Geräten (max-height-Regeln) behält ihre gemessenen Einzelwerte.
- Buchstaben in den gezeichneten Flash-Motiven (SVG, 36–82 px) sind Zeichnung, keine Typografie. `website-check` zählt sie mit.
- Alte Seiten mit eigener CSS (Ratgeber/Recht mit `site.css`, Verträge mit `doc.css`, `/raten`, App-Seiten) sind noch nicht umgestellt. Darum meldet `website-check` über die ganze Website 31 Größen.

**Bausteine:** Kopf/Menü/Fuß `rahmen.css` (alle Seiten gleich), Seitenkopf, Karten, Schritte mit Nummern-Kreis, Beleg-Zettel, Geldfluss, Fragen-Aufklapper, Weiter + verwandte Seiten in `seiten.css`. Fokus immer 3 px blaue (im Fuß gelbe) Linie.
**Bildschnitt:** echte App-Aufnahmen im Handy-Rahmen mit Klebestreifen, beschriftet „Beispieldaten“. Keine Fotos von Personen.
