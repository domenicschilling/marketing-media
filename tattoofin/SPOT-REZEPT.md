# Rezept: Verkaufs-Spot mit Higgsfield + Sprecher + eigenen Produkt-Animationen

So ist der Tattoofin-Spot entstanden (40 s, 9:16, deutsch, Untertitel). Vorlage für andere Marken.
Ergebnis: `tattoofin/creatives/2026-10-10/spot/reel.mp4` · Kosten ca. 70 Higgsfield-Credits · Dauer ca. 1,5 Stunden.

## Dateien (Vorlage)
- `tattoofin/social/instagram/spot.html` – Schnitt: Szenen, Produkt-Animationen, Untertitel, Endcard, Zeitachse (`VO`-Startzeiten)
- `tattoofin/tools/render-spot.mjs` – rendert Bild für Bild (Playwright) und mischt Sprecher + Musik (ffmpeg)
- `tattoofin/tools/reel-sound.py` – lizenzfreier Beat + Soundeffekte (selbst synthetisiert)
- `tattoofin/social/instagram/insta.css` – Markenlook (Farben, Schriften); für eine andere Marke anpassen
- `tattoofin/social/instagram/spot/` – Quellen: `clips/*.mp4` (Higgsfield), `vo/*.mp3` (Sprecher), `stills/*.jpg`

## Ablauf
1. **Drehbuch (8 Zeilen, je 1 Satz, zusammen ca. 35 s Sprechzeit)**
   Haken mit Problem der Zielgruppe → „Dafür gibt’s <Marke>“ → so funktioniert es (2–3 Zeilen) → Nutzen → Service → Preis → Aufruf „Jetzt starten auf <domain>“.
   Nur Aussagen, die stimmen; Pflichthinweise (z. B. Raten-Fußnote) im Bild einblenden.
2. **Hauptfigur festlegen**: 1 Standbild mit `nano_banana_pro` (9:16, 2k, ca. 2 Credits) – fotorealistisch, Ort, Person, Licht, „no text, no logos“.
3. **Weitere Szenen (4–5 Standbilder)** mit demselben Modell und dem Hauptbild als `image_references` → gleiche Person und gleicher Ort in allen Szenen.
4. **Animieren**: jedes Standbild mit `kling3_0`, mode `pro`, sound `off`, 5 s, 9:16 als `start_image` (8,75 Credits pro Clip). Prompt beschreibt nur die Bewegung.
   Schlägt Higgsfield statt eines Jobs ein Preset vor: erneut mit `declined_preset_id` senden.
5. **Sprecher**: `text2speech_v2`, variant `elevenlabs`, Stimme „Julian“ (`95429266-c0ac-4137-a209-63b8812b0f23`), jede Zeile einzeln (je ca. 0,15 Credits) → Längen messen → Zeitachse bauen. Im Mix 8 % schneller (atempo 1,08).
6. **Schnitt in `spot.html`**: Live-Szenen (`szene()`), dazwischen eigene Produkt-Animationen (Handy-UI, Preise, Endcard), Untertitel (`cap()`) über der Instagram-Leiste, Marken-Logo oben rechts.
7. **Rendern**: `node tools/render-spot.mjs --vorschau` (Kontaktbilder prüfen), dann `node tools/render-spot.mjs`. Ziel: ca. −13 LUFS, Musik ca. 20 dB unter der Stimme.

## Regeln
- Kein KI-Mensch als angeblicher Kunde („ich nutze das“) – das wäre ein gefälschtes Testimonial.
- Keine Versprechen, die nicht stimmen (z. B. „Geld sofort“, „voller Betrag“ bei Provision).
- Werbung für Finanzierungen/Raten: Fußnote im Bild + bei Meta Sonderkategorie „Finanzprodukte“.
