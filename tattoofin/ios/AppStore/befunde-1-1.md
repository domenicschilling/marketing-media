# Tattoofin-App 1.1 – alle Befunde der Prüfung (Stand 25.11.2026)

Prüfung vom 23.11.: 4 Prüfer (Kasse, Gutscheine, Konto, Texte), jeder Befund von einem zweiten Prüfer gegengeprüft.
41 Befunde, davon 39 bestätigt. Branch `claude/tattoofin-app-1-1-store`, Build 1.1 (4).

Commits: Kasse `25d5694` + Prüfer `ec81d23` · Gutscheine `d4f2937` · Konto `a980ffb` + Prüfer `c5fb4f4` · Rest `dbeb994` (in der Tabelle „NEU“).

| Nr. | Wichtig | Befund | Stand |
|---|---|---|---|
| kasse-1 | P1 | Kasse bietet „Anzahlung“, obwohl das Studio keine nimmt (TF München/Landshut) | **behoben** 25d5694 |
| kasse-2 | P2 | Anzahlungs-Einstellungen trotzdem sichtbar | **behoben** 25d5694 |
| kasse-3 | P1 | Fehlende Zahlseiten-Adresse → falscher Grund „Vertrag nicht aktiv“ | **behoben** 25d5694/ec81d23 (eigene Adress-Maske in der App) |
| kasse-4 | P1 | Aktions-Gutscheine zeigen den bezahlten statt des echten Werts | **behoben** d4f2937 |
| kasse-5 | P2 | Ausweich-Anzahlung nach Klarna-Ablehnung: Original-Link bleibt „offen“ | **behoben (App)** 25d5694 · Server-Kennzahl im Web zählt noch falsch |
| kasse-6 | P2 | Kein Neuladen beim Zurückkehren in die App | **behoben** 25d5694 |
| kasse-7 | P3 | Zahlungslink-Blatt prüft nach 15 Min. nicht mehr, zeigt aber „Wartet …“ | **behoben** 25d5694 („Jetzt prüfen“) |
| kasse-8 | P3 | Zeitüberschreitung beim Erstellen → doppelte Links | **behoben (App)** NEU: App sieht nach und öffnet den schon angelegten Link |
| kasse-9 | P1 | Auszahlung: „7 Tage“ statt „7–14 Tage“ | **behoben (App)** 25d5694 · Server-Text app.mjs:212 + Mail: Website-Chat |
| kasse-10 | P3 | Portal wird beim Start doppelt geladen | **behoben** 25d5694 |
| kasse-11 | P3 | Zwischenspeicher alle 3 s neu geschrieben | **behoben** 25d5694 |
| kasse-12 | P3 | Lastschrift fehlgeschlagen im Zahlungslink-Blatt | **bewusst nicht** – Gegenprüfung: Fall kommt praktisch nicht vor (SEPA scheitert erst Tage später, Blatt zeigt dann schon „wird geprüft“) |
| gutscheine-1 | P1 | Wert statt bezahltem Betrag | **behoben** d4f2937 |
| gutscheine-2 | P2 | Teil-Einlösung | **behoben (App)** d4f2937 – greift, sobald der Server `teilbar` liefert (Shop-Chat) |
| gutscheine-3 | – | Server-Hinweis eingelöster Restwert | **kein Befund** (Gegenprüfung), in gutscheine-1 berücksichtigt |
| gutscheine-4 | P2 | Fehlermeldung nach Scan verschwindet sofort | **behoben** d4f2937 |
| gutscheine-5 | P2 | Abgebrochene Shop-Käufe als „noch nicht bezahlt“ | **behoben** d4f2937 |
| gutscheine-6 | P3 | Kamera verweigert: kein Weg in die Einstellungen | **behoben** d4f2937 |
| gutscheine-7 | P3 | Einlösen doppelt tippbar | **behoben** d4f2937 |
| gutscheine-8 | P3 | Leere Liste verweist auf fehlenden Knopf | **behoben** d4f2937 |
| konto-1 / texte-5 | P1 | Österreich/Schweiz: PLZ mit 4 Ziffern abgelehnt | **teilweise** NEU: App sagt ehrlich „nur Deutschland, schreib uns“. Echte Anmeldung braucht Server + Stripe-Land + Steuer → **Entscheidung Domenic** |
| konto-2 | P1 | Nach Ab-/Anmelden keine Mitteilungen mehr | **behoben** a980ffb |
| konto-3 | P2 | „Alle abmelden“: iPhone bekommt weiter Mitteilungen | **behoben** a980ffb |
| konto-4 | P2 | „Neuen Code schicken“ meldet Falsches | **behoben (App)** NEU: Text sagt nur noch die Wahrheit · Server-Rückmeldung „gedrosselt“: Website-Chat |
| konto-5 | P2 | Mitteilungs-Schalter bei Fehler falsch | **behoben** a980ffb |
| konto-6 | P1 | Anzahlungs-Bereiche bei Studios ohne Anzahlung | **behoben** 25d5694 |
| konto-7 | P3 | „Meinen Zugang entfernen“ ohne Rückfrage | **behoben** a980ffb |
| konto-8 | P3 | Kauf-Fehler roh/englisch | **behoben** a980ffb + c5fb4f4 (Abbruch zeigt keinen Fehler) |
| konto-9 | P3 | „Abo verwalten“ auch fürs Team | **behoben** a980ffb |
| konto-10 | P3 | Neue Team-Adresse erfährt nichts | **offen (Server)** – Mail beim Hinzufügen: Website-Chat |
| texte-1 | P1 | Werbung mit Klarna, obwohl Klarna aus | **behoben (App)** a980ffb · Web/Server: Website-Chat |
| texte-2 | P1 | = kasse-3 | **behoben** |
| texte-3 | P1 | = gutscheine-1 | **behoben** |
| texte-4 | P1 | = kasse-1 | **behoben** |
| texte-6 | P2 | Testmodus-Zeile im Dunkelmodus unsichtbar | **behoben** 25d5694 |
| texte-7 | P2 | Erstattungshinweis bei Provisions-Studios falsch | **behoben** 25d5694 |
| texte-8 | P3 | „Einrichtung“ bei sehr großer Schrift abgeschnitten | **behoben** a980ffb |
| texte-9 | P3 | Checkliste „Instagram-Beitrag“ ohne Klarna ins Leere | **behoben** a980ffb |
| texte-10 | P3 | Tippflächen unter 44 pt | **behoben** a980ffb |
| texte-11 | P3 | Rundgang prüft größte Schrift nicht | **behoben** a980ffb (AX5-Rundgang) |
| texte-12 | P3 | Kein Hinweis zur ersten Auszahlung | **behoben (App)** 25d5694 |
| (neu) | – | Kennzahl-Kachel bricht „€“ in neue Zeile | **behoben** 5621e29 |

## Bleibt offen (nicht in der App lösbar)
1. **Österreich/Schweiz** – Server nimmt nur 5-stellige PLZ, Stripe-Konto fest „DE“, Steuer fest deutsch. Domenic entscheidet: umbauen oder im App Store nur Deutschland.
2. **Server-Texte** (Website-Chat): „7–14 Tage“ in app.mjs:212 + Mail, „gedrosselt“ bei zu vielen Codes, Klarna-aus im Web, Mail an neue Team-Adresse, Web-Kennzahl „offen“ bei Ausweich-Anzahlung.
3. **Demo-Studio für Apples Prüfung** hat Klarna aus → die Prüfer sehen die Karte „Klarna ist bei dir noch aus“ statt Klarna-Werbung. Sicher, aber die Store-Texte werben mit Raten. Vorschlag: so lassen (Prüfer sieht keine Behauptung, die er nicht prüfen kann).

## Gestaltungsprüfung (25.11.2026)
Ablauf: Gestaltungs-Rundgang (`GestaltungRundgangUITests`) fotografiert alle Hauptbildschirme und Blätter hell, dunkel und mit größter Schrift (AX5): 87 Fotos auf dem 6,9-Zoll-iPhone, je 81 auf iPhone 17 und SE. Drei unabhängige Prüfer (Gesamteindruck, Pixel-Detail, Dunkel/große Schrift/Texte) + Zusammenfasser → 22 Änderungen. Umgesetzt von drei Agenten in getrennten Arbeitskopien, jeder mit eigenem Prüfer (Commits `dfd58ed`, `d7ab0a0`, `ec0d21e`), dann Nachbesserung nach eigener Sichtung der SE-Fotos (`5c5ab60` und folgende).

Umgesetzt (Auswahl): Kasse ruhiger (Betrag mittig, kein Leerstreifen, flache Detail-Karte, ausgeschalteter Hauptknopf grau statt blassgelb), große Schrift ohne Wortbrüche bei Beträgen/Chips/Auszahlungen/Gutscheinen, Knopf „Zahlungslink erstellen“ bei großer Schrift in der Liste statt über den Ziffern, Segmente werden bei großer Schrift zum Auswahl-Menü, Navigationstitel/Segmente in DM Sans, Konto-Zeilen mit einheitlicher Kante und Symbolen, Team-Seite klarer („Hinzufügen“ als Knopf), „Vertrag: Live“ → „Aktiv“, einheitliche Status-Chips („Bezahlt“, „Offen“, „Gültig“), Links ohne Kundennamen zeigen das Motiv, Theken-QR bleibt bei großer Schrift groß, iPhone SE: Ziffernblock ganz sichtbar (Monatszeile und Erklärzeile dort nur für VoiceOver bzw. unter Zahlungen).

Bewusst nicht: Klarna-Pflichtsatz nur einmal pro Seite (Nr. 12) – er bleibt direkt unter jedem Material mit „Raten*“. Tab-Symbole in Markenfarbe – iOS 26 zeichnet die Tab-Leiste selbst (Liquid Glass), Farben lassen sich dort nicht zuverlässig setzen.

Bekannte Grenze (ehrlich, nach unabhängiger Abnahme): Bei größter Bedienungshilfen-Schrift brachen auf iPhone 17 UND SE Wörter mitten im Wort um („Auszahlunge/n“, „Werbevide/o“, „Hauptadress/e“). Das ist ein Mangel, kein Randfall; in der Abnahme-Runde gezielt behoben (Schrift einzelner Zeilen auf AX2/AX3 gedeckelt), Stand siehe unten.

## Gestaltung Runde 2 und 3 (25.11.2026)
- **Runde 2** (3 frische Prüfer, iPhone 17 + SE): Noten 7 / 7,5 / 7 von 10. 14 Punkte, 13 umgesetzt (`3bf0257`): Auswahl wächst bei großer Schrift mit (Liste großer Knöpfe statt abgeschnittenem Menü), Kasse ohne Lücke bei großer Schrift und mit weichem Übergang auf dem SE, € bricht nie allein um, Saldo bündig, Umsatz ohne „,00“, „Erstellen“ oben im Blatt Gutschein verkaufen, feste Symbolspalte im Konto, Team einheitlich, kein doppelter Titel beim Code. Nicht gemacht: Suchfeld/Segment in Zahlungen an derselben Stelle halten (Umbau, kleiner Gewinn).
- **Runde 3** (erstmals echter Dunkelmodus, Nachprüfung Runde 2): Noten 8 / 8 / 7,5 von 10 – „Dunkelmodus wirklich dunkel und aus einem Guss“, „hell und dunkel bei normaler Schrift keine echten Fehler mehr“. 9 Punkte, 8 umgesetzt (`d6f029d`): kein Wortbruch in Auswahl und Konto-Navigationszeilen bei größter Schrift (KORREKTUR nach unabhängiger Abnahme: die Stripe-Statuszeilen brachen weiter mitten im Wort, das war nicht behoben – nachgebessert in der Abnahme-Runde), deckende Leiste im Code-Schritt, Segmente in Markenfarben (auch dunkel), Stripe-Häkchen einheitlich, Monatsumsatz ohne „,00“, kompakter Abstand in Zahlungen, „Wird geladen …“ ohne einsame Punkte. Nicht gemacht: eigenes Suchfeld in Zahlungen bei größter Schrift (System-Suchfeld, iOS zeichnet es).
- Fotos aller Bildschirme: hell, dunkel (seit Runde 3 per Startargument sicher dunkel) und größte Schrift, je ~85 auf iPhone 17 und SE.

## Unabhängige Abnahme (5 Prüfer, 26.11.2026) – Nachbesserung 27.11.2026
Urteil der Abnahme: „erst nachbessern“. Umgesetzt (Branch `claude/tattoofin-app-1-1-store`):
| Nr. | Befund | Stand |
|---|---|---|
| 1 | Absturz beim Antippen einer Mitteilung | **behoben** – Commit 4c4ff6b übernommen, dazu `willPresent` ebenfalls mit Abschluss-Rückruf auf dem Haupt-Thread (3ed9c95) |
| 2 | Review-Notiz beschreibt Werbevideo, Demo-Studio hat Klarna aus | **behoben (Text)** – README/Review-Notiz beschreibt die Karte „Klarna ist bei dir noch aus“; `klarnaAktiv` im Demo nur mit Domenics OK (Server) |
| 3 | QR-Codes in Store-Bildern auf localhost | **behoben** – QR-Ziel `https://tattoofin.de` (Debug-Startargument nur für Fotos), Prüfschritt im Render liest jeden QR (Apple Vision) und bricht bei localhost ab |
| 4 | €-Zeichen in Luckiest Guy | **behoben** – `GrosserBetrag`: € in DM Sans Bold, 70 %, Grundlinie (Kasse, Zahlung, Link-Blatt, Gutschein, Verkaufen, Saldo, Abo-Preis) |
| 5 | Stripe-Statuszeilen Wortbruch | **behoben** – AX2-Deckel (Unterseite StripeStatusView) |
| 6 | „Dein Werbevideo“ bricht auf dem SE | **behoben** – WerbeUeberschrift (AX1-Deckel, 2 Zeilen, verkleinern) |
| 7 | Team: rote Minus-Kreise | **behoben** – Entfernen per Wischen mit Rückfrage, „alle abmelden“ nur im Dialog |
| 8 | README/Review-Notiz alt | **behoben** – Build 4, Support /fragen/, Neu in 1.1, 1.0-Text gekennzeichnet |
| 9 | Aufkleber Bild 1 abgeschnitten | **behoben** – ganz im Bild, Statusleiste frei, „für neue Abonnenten“ |
| 10 | Bild 2 widersprüchlich | **behoben** – beide Handys aus einem Vorgang (150 € Anzahlung), Studio fertig eingerichtet; echtes Teilen-Blatt mit WhatsApp geht im Simulator nicht (kein WhatsApp), darum QR-Blatt desselben Links |
| 11 | Bild 1 = Bild 5 | **behoben** – Bild 5 mit echter iOS-Mitteilung (Text aus push.mjs, per `simctl push`) auf dem Startbildschirm; echte Sperre im kopflosen Simulator nicht auslösbar |
| 12 | „Sitzung 1 von 3“ neben Klarna | **behoben** – Beispielzahlung ohne Sitzungsangabe |
| 13 | Leeres Feld über dem Handy | **behoben** – Handys höher und größer |
| 14 | Zwei Umschalter in Zahlungen | **behoben** – Auszahlungen als Karte, Filter als Menü in der Leiste |
| 15 | Werbung-Tab | **behoben** – Karten mit „Speichern“ + 2 runden Knöpfen, Anleitung einmal oben, Sprungleiste ohne halben Chip |
| 16 | Konto zu lang | **behoben** – Stripe eine Zeile, Bereich „Hilfe“, Absatz gestrichen |
| 17 | Eingabefelder uneinheitlich | **behoben** – `tfTextfeld()` überall, Abschicken einheitlich |
| Sammelliste | Wortmarke Marine, Schlüsselwort Gutschein statt Termin, Impressum-Zeile, Einrichtung bei 8/8 weg, Betrag 52 pt, „+“ bei Gutscheinen weg, Anmeldung (Ausrichtung, Rechtliches bei Tastatur aus, SE-Figur kleiner), „Neuen Code schicken“ als Textlink, Verlauf über dem Kassen-Knopf, E-Mails mittig gekürzt, Rundgang „dunkel + größte Schrift“ | **behoben** |
| Sammelliste | Preis „49,90 €“ im Aufkleber | **bewusst nicht** – Apple-Regel 2.3.7 (keine Preise in Store-Bildern); stattdessen „für neue Abonnenten“ |

### Schlussprüfung 27.11.2026 (Barrierefreiheits-Audit nach den Team-Änderungen)
- Zahlungen, Karte „Auszahlungen“: Bei großer Schrift brach das Wort mitten durch („Auszahlun-gen“). Jetzt steht das Symbol bei Bedienungshilfe-Größen über dem Text, und das Wort bleibt einzeilig (notfalls kleiner).
- Zahlungen, Zeile ohne Kundennamen: „ohne Kundennam-en“ brach bei größter Schrift. Jetzt einzeilig und notfalls kleiner.
- Zahlungen, Kennzahlen: Das Audit meldete „Kontrast“ (Grau auf Weiß hat etwa 6:1). Ursache: Es maß, während der Bildschirm noch nachlud. Der Test wartet jetzt 4 s statt 2,5 s, die Farbe bleibt. Auf dem SE meldet das Audit die Kacheln trotzdem, auch mit Tinte statt Grau. Nachgerechnet sind es 6,8:1, und dieselbe Meldung kam schon vor den Team-Änderungen (damals lagen die Kacheln am unteren Rand und wurden deshalb übergangen). Die Kacheln sind jetzt eine benannte Ausnahme mit WARNUNG im Protokoll. Offen: Handprüfung mit dem Accessibility Inspector.
- Werbung, Überschriften („Dein Werbevideo“ …): Sie wachsen wieder mit der Schrift, bleiben aber einzeilig und werden notfalls kleiner. Kein Wortbruch, keine Schriftgrenze mehr.
- Test „So geht's“ im Konto: Er erwischte den gleichnamigen Knopf der Kasse. Jetzt ist die Suche eindeutig.
- Konto, Abschnitt „Dein Studio“: Der Kopf hat jetzt die eigene Farbe statt des System-Graus, weil der Kontrast knapp war.
- Ergebnis: DS-Rundgang (normal, dunkel, AX3, AX5) auf iPhone 17 und SE ohne Befund, bis auf die eine benannte Ausnahme.

## Zweite unabhängige Abnahme (27.11.2026) – Nachbesserung

| Nr. | Befund | Stand |
|---|---|---|
| 1 (hoch) | Schmuckschrift in gemischter Schreibweise („AnmeLDen“) | behoben: `Ueberschrift`, `WerbeUeberschrift`, Studioname (Konto, Zahlungslink-Blatt), Wort hinter großen Beträgen und die gezeichneten Werbebilder (app-kit.js) stehen in Großbuchstaben. VoiceOver liest normal. |
| 2 | Werbetext ohne Bedingung/Folgepreis | behoben: „Neu-Abonnenten: 7 Tage gratis, danach 49,90 €/Monat …“ (161/170). Preis gegen die StoreKit-Datei geprüft (49,90 €, 1 Woche gratis). Ob der Preis dort stehen soll, entscheidet Domenic. |
| 3 | Beschreibung: Video/Beiträge ohne Bedingung | behoben: „… sobald Klarna in deinem Stripe-Konto an ist.“ |
| 4 | Review-Notiz ohne Klarna-Erklärung | behoben: eigener Punkt „Installments via Klarna“ im README |
| 5 | Bild 2: hinteres Handy abgeschnitten, „WhatsApp“ | behoben: neue Anordnung, Unterzeile „Betrag eintippen, Link teilen oder QR-Code zeigen. Fertig.“ Beide Handys zeigen „Anzahlung“. |
| 6 | Bild 1: Etikett verdeckt die Zeile „Art“ | behoben: Etikett in der freien Mitte der Zeile (render.mjs: Etikett-Position `tx`) |
| 7 | Bild 7 zeigt Adressenpflege | behoben: Hauptbild Kasse, angemeldet als Team-Adresse (neuer Test `testTeamKasse`), Team-Liste klein unten ohne Hinweis und Eingabefeld |
| 8 | Dunkel: gewähltes Segment unsichtbar | behoben: dunkel Gelb mit Blau, hell Blau mit Weiß |
| 9 | Kasse AX5: Ziffern erst nach zwei Scrollschritten | behoben: Betrag, Ziffern, Knopf, danach Art/Schalter; ohne Monatszeile, ohne Lücke unter der Spanne |
| 10 | Rundgang überspringt Bildschirme ohne Meldung | behoben: `XCTFail("FEHLT: …")`, Scroll-Schleife; neu Stripe-Status und Geräte (der Test suchte „Geräte“, die Zeile heißt „Angemeldete Geräte“) |
| 11 | Gutscheine-Kopf überladen | behoben: Such-Knopf weg (vollständiger Code sucht sofort, sonst Tastatur „Suchen“), „Verkaufen“ als Text-Knopf in der Leiste, oben nur der Scan-Knopf |
| niedrig, war nicht behoben | Anmeldung Kopf mittig | behoben: Kopf linksbündig, mehr Abstand |
| niedrig, war nicht behoben | SE Kasse: Kartenkante über dem Knopf | behoben: Karte liegt ruhend ganz hinter dem Knopf |
| niedrig, war nicht behoben | SE Werbung: Chip angeschnitten | behoben: Chips brechen in zwei Reihen um |
| niedrig, war nicht behoben | Zwei Arten Eingabefelder | Regel benannt (TFListenStil.swift): freistehend `tfTextfeld()`, in gruppierten Listen Listenzeile nach iOS-Standard |
| niedrig | Navigationsleiste: Geistertext | behoben: harte Kante (iOS 26) bei Gutscheine und Werbung |
| niedrig | Stornieren | behoben: roter Textknopf statt Rahmen-Knopf |
| niedrig | Werbung „Beitrag:“, „Text ansehen“ | behoben: Präfix weg (Art steht als Chip), „Text ansehen“ mit Symbol |
| niedrig | Kennzahl-Kacheln mit Rand | behoben: ohne Rand. Beschriftung bleibt (Zeitraum gehört nur zu zwei der drei Kacheln) |
| niedrig | Filter-Symbol mit Kreis, Einstellungen-Unterzeile, „· Aktiv“ | behoben |
| niedrig | „So geht's“ als Leisten-Knopf, „Link kopieren“ rund, „Neuen Code schicken“ anheften, SE Blatt-Titel/Leistenknöpfe AX2, Leere-Zustände im Rundgang | offen (nächste Runde) |
| Kopfzeile Bild 1 | „Raten* für dein Studio“ | bleibt (Domenic) |
