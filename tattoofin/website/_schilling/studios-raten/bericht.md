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
