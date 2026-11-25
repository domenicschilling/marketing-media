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

Bekannte Grenze: iPhone SE + größte Bedienungshilfen-Schrift: sehr lange Wörter („Auszahlungen“) passen nicht in eine Zeile (320 pt Breite) und brechen um. Alles bleibt lesbar und bedienbar.
