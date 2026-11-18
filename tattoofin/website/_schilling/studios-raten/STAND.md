# STAND – Tattoofin-Kampagnenseite /studios-raten (18.11.2026)

**Ziel:** Meta-Kampagne an Tattoo-Studios mit Aufhänger „Raten* für deine Kunden + 7 Tage kostenlos“, gebaut nach dem Schilling-Konzept (Skill `schilling-konzept`). Reine Kampagnenseite, ersetzt nicht tattoofin.de oder /studios (Domenic 18.11.).

**Erledigt**
- Seite `public/studios-raten.html` (Entwurf A „Stempel“, von Domenic gewählt), gebaut mit `python3 -I _schilling/studios-raten/bauen.py` (übernimmt Fall, Preis, Fragen aus `public/studios.html`).
- Abnahme `npm run abnahme -- <url> --soll "49,90 €;"` BESTANDEN (12 Geräte, axe, Beträge). Hero-Messung 28/28, Gutachter- und Werberecht-Befunde eingearbeitet (`bericht.md`).
- Vorschau (Entwurf, kein Produktiv-Deploy): https://raten-schilling--tattoofin-vorschau.netlify.app/studios-raten
- Branch `claude/tattoofin-lp-raten-schilling` (Repo marketing-media), Arbeitskopie `~/marketing-media-tf-raten-schilling` (sparse, nur `tattoofin/website`).

**Offen**
1. Anzeigenbild 4:5 (1080×1350) aus der Bon-Szene, ohne Beträge, mit kleinem Pflichtsatz „*Raten über Klarna. Achtung! Kreditaufnahme kostet Geld.“ im Bild; Text steht in `anzeige.md`.
2. Nach Domenics „live“: Seite deployen (Weg wie bei Tattoofin üblich, Abnahme vorher frisch), Anzeige in der Kombi-Kampagne anlegen (pausiert, Freigabe durch Domenic), Ziel-URL in `anzeige.md`.
3. Frage an Domenic: dieselben zwei Fakten-Fehler auf live /studios mitkorrigieren (erste Auszahlung laut Stripe 7–14 Tage statt „nach 7 Tagen“; „den ganzen Betrag“ → „in einer Summe“)?
4. Memory/Playbook 09-04 sagen „Raten auf eigenem Konto belegt“; die Beleg-Datei zum 900-€-Fall zeigt nur „Klarna“. Angleichen.
5. Nach Abschluss: Arbeitskopie löschen (`git worktree remove`), Branch bleibt.

**Entscheidungen**
- Wort „Raten“ in Werbung an Studios: neuer Auftrag 18.11. gilt (Regel 15.11. damit überholt), Pflichtsatz sichtbar in Anzeige und Bild. Restrisiko einmal genannt.
- Pflichtsatz auf der Seite klein, fett, direkt unter der Raten-Aussage.
- Kein Sticky-Balken (nur als Test), keine Navigation außer WhatsApp.

**Dateien:** `_schilling/studios-raten/` → strategie.md, signatur.md, anzeige.md, bericht.md, bauen.py, entwuerfe/, messung/*/protokoll.md
