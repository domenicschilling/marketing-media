# Tattoofin – /studios-raten (Raten* + 7 Tage kostenlos) – Abnahme 18.11.2026

Schilling-Konzept, Prüftiefe: Vollabnahme einer neuen Anzeigenseite. Stand: Entwurf, **nicht live**.
Vorschau (Entwurf auf tattoofin-vorschau, kein Produktiv-Deploy): https://raten-schilling--tattoofin-vorschau.netlify.app/studios-raten · Entwürfe B/C: …/studios-raten-entwurf-b, …/studios-raten-entwurf-c
Branch: `claude/tattoofin-lp-raten-schilling` (marketing-media), Bau: `python3 -I _schilling/studios-raten/bauen.py`.

## Urteil
Live-fähig nach Domenics Wahl des Hero-Entwurfs und seinem „live“. Tor 1 technisch bestanden, inhaltliche Restrisiken unten einmal genannt.

## Gemessen
- Hero (Entwurf A): 28/28 Messungen bestanden (11 Größen + 2 quer, je mit/ohne Consent-Banner, reduced-motion, dunkel), 29–30 Wörter, Knopf und Preiszeile immer sichtbar (`messung/a/protokoll.md`). B und C je 24/24.
- axe: 0 Verstöße (390/1440, hell/dunkel). Projektakte öffentlich 404.
- Zahlen-Abgleich: 49,90 / 41,93 €, Stripe-Gebühren (am 18.11. auf stripe.com bestätigt), 4.000 € → ca. 120 € / 3.880 €, 900 € 07.11.2026 – alle stimmig. Keine Signalwörter „sofort/direkt/garantiert/0 %/ohne Schufa“.
- Frischer Gutachter: 6/10 in Runde 1 → behoben: Szene kräftiger (Streifen reißen ab, roter Stempel), echte App-Bildschirme ergänzt, Desktop-/Höhenlücken, Mond-Fehler, Doppelung „Geld auf einmal“.
- Werberecht-Check: kein Verstoß, mehrere Risiken; sachlich falsche Stellen korrigiert (erste Auszahlung 7–14 Tage, „ganzer Betrag“, 900-€-Fall ohne belegten Raten-Bezug, Streitfall-Hinweis, „kann per Klarna zahlen“, 3 statt 4 Streifen, Pflichtsatz fett, Anzeigentext mit Pflichtsatz als 2. Zeile).

## Gutachter-Befunde Runde 2 (18.11.2026, umgesetzt)
- Funnel ehrlich „Schritt x von 5“: Schritt 5 = Vertrag & Karte bei Stripe (/start), Balken bei 4 auf 80 %, Ausblick „Schritt 5: Vertrag & Karte bei Stripe, heute 0 €.“ als eine Zeile, Knopf „Weiter zu Schritt 5“; Bedingungen (49,90 € nach 7 Tagen, vorher kündigen = 0 €) unter dem Knopf. Schritt-Überschrift klein im Funnel-Kopf; Merkzettel in Schritt 3 klappt bei offener Tastatur (Touch) ein.
- Hero: Unterzeile „Für Tattoo-Studios: Link schicken, Kunde zahlt per Klarna.“, H1 unverändert. Unter allen drei Hauptknöpfen gleich „Heute 0 €, 4 Angaben. Danach 49,90 € im Monat, monatlich kündbar.“ – Hero zählt damit genau 30 Wörter (8 H1 + 8 Unterzeile + 4 Knopf + 10 Zeile, ehrlich gezählt). Dafür fällt „Keine Provision“ aus der Hero-Unterzeile (steht als Überschrift im Preisblock und im Bon).
- Figur ist Teil der Szene (SVG): breit zwischen Bon und Studio-Karte unter dem Pfeil, hoch rechts neben dem Bon; überdeckt Karte und Stempel nie. Desktop nutzt die breite Szene, die Bühne endet über der Consent-Karte (nur diese Seite, tf-track.js unverändert).
- Preis-Bon: ein Beispiel 2.000 € (Sleeve, wie App-Demo): Klarna ab 2,99 % + 0,35 € = 60,15 € → „ab ca. 60 €“, bei dir 1.939,85 € → „bis ca. 1.940 €“, Karte ab 1,5 % + 0,25 € = 30,25 € → „ab ca. 30 €“ (Stripe-Preise DE, bestätigt 18.11.; im Bauskript nachgerechnet). Sticker-Liste als Bon-Zeilen (Provision 0 €, Einrichtung 0 €, Monatlich kündbar, Unser Team richtet’s mit dir ein).
- Echter Fall ohne Chip, Text knapper, „Studio anonym · Klarna-Zahlart unbekannt.“ (Beleg-Datei: Produkt nicht festgestellt; Motiv/Sitzung laut Studio).
- „So laufen deine 7 Tage“ als Abriss-Kalenderstreifen (Tag 1 / Einrichtung / Tag 7, Tag 7 halb abgerissen).
- „So läuft eine Zahlung“: Desktop Raster ab 720 px, jede Abbildung 330–350 px breit (kleinste Bildschrift ca. 11 px); Handy ein Bildschirm je Wisch, darunter „1/5“ und Punkte, keine angeschnittene Bildunterschrift. Sternchen an „Klarna“ entfernt (keine Raten-Aussage; Pflichtsatz steht im Bild 3), Fußnote dort entfällt.
- Rechtlich zusätzlich: Frage „Bekommt jeder Kunde Raten*?“ stand zugeklappt ohne Pflichtsatz im Blick → „Bekommt jeder Kunde Klarna?“, Fußnote in dieser Antwort entfällt. Pflichtsatz bleibt im Hero, im Geld-Abschnitt und in den aufgeklappten Antworten mit „Raten*“.
- Prüfung: Abnahme BESTANDEN (axe, 12 Geräte, Beträge 0 € / 49,90 €), Hero-Messung 24/24 (30 Wörter), Tastatur-Test 96/96 in WebKit und Chromium.

## Hängt an Domenic
1. Hero-Entwurf wählen (A empfohlen).
2. „Raten“ in der Werbung an Studios: gegen deine Regel vom 15.11., jetzt dein Auftrag. Mit „Raten“ gehört der Pflichtsatz sichtbar in Anzeige und Bild (`anzeige.md`). Restrisiko ab 20.11.: Abmahnung wegen Pflichtsatz-Darstellung, § 34k-Einordnung ohne Urteile.
3. Live-Schaltung und Anzeige anlegen.
4. Live-Seite /studios hat dieselben zwei Fakten-Fehler (erste Auszahlung „nach 7 Tagen“, „den ganzen Betrag“) – soll das mitkorrigiert werden?
5. Beleg „Raten auf eigenem Konto“: Beleg-Datei zum 900-€-Fall zeigt nur „Klarna“, nicht ob Raten. Memory/Playbook führen es als „belegt“.

## Testen statt raten
1. Hero A gegen B-Überschrift („Großes Motiv? Dein Kunde zahlt in Raten*.“) als zwei Anzeigen-Varianten – Metrik: gestartete Testwochen je Klick; Richtung: A höher [Hypothese].
2. Kurzer Hero gegen Hero + Halbsatz „nach rund 3 Werktagen auf deinem Konto“ – Metrik: Abschluss nach der Testwoche [Hypothese].
3. Mit und ohne Abschnitt „So sieht’s dein Kunde“ an zweiter Stelle – Metrik: Scroll-90 und Start-Klicks [Hypothese]. Entscheidung nach zahlenden Studios (Stopp-Regel 24.11./03.12.).
