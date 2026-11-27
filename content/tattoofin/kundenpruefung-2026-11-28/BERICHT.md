# Tattoofin – Kundenprüfung auf Herz und Nieren (27./28.11.2026)

Geprüft mit zwei Brillen:
**(A) Studio-Inhaber**, der Tattoofin nicht kennt (Hauptprodukt: Raten für seine Kunden + 7 Tage testen, Ziel /studios-raten), und
**(B) Endkunde**, der einen Gutschein kauft (Shops München, Landshut, Chic Augsburg) oder per Link in Raten zahlt.

Weg: Werbung (öffentliche Meta-Werbebibliothek + eigene Motive) → App-Store-Eintrag → tattoofin.de am Handy (390 × 844, Safari-Engine) mit allen 35 Seiten → Studio-Anmeldung bis vor das Absenden → Gutschein-Kauf bis vor die Zahlung → App (Code gelesen).
Nichts bezahlt, kein Konto angelegt, nichts gesendet: Beim Durchklicken wurden alle Schreib-Anfragen an den Server im Browser abgebrochen (nur die Statistik Umami und das Meta-Pixel der Shops liefen mit). Kein Simulator (Speicher, siehe unten).
Belegbilder: `bilder/` in diesem Ordner. Vorbericht: `content/tattoofin/nachtpruefung-2026-11-25/BERICHT.md` (Repo Marketing-Maschine, Branch `claude/nacht-pruefung-tattoofin`); was davon noch offen ist, steht in c).

Code-Stand: Repo **marketing-media**, Branch `claude/tf-kundenpruefung`, abgezweigt vom Live-Stand `claude/chic-live-raten` (510ffec = Live-Deploy 6b09a389, Inhalt mit tattoofin.de verglichen). Hinweis: `~/mm-chic-live` gibt es nicht mehr, der Live-Branch liegt in `~/marketing-media`.

## a) Kurzfazit für Domenic

1. Die Website ist ordentlich und ehrlich (Note 8): alle 35 Seiten laden, kein Querscrollen, keine kaputten Bilder, Preise und Raten-Hinweise stimmen. Die Shops für Endkunden sind sehr gut (Note 8–9): 2 Schritte, klare Übersicht, „Endpreis, keine weiteren Kosten“.
2. Die Studio-Anmeldung hatte noch das Einwilligungs-Häkchen, das du am 27.11. verboten hast. Jetzt live behoben: Zustimmung per Klick auf den Knopf, der Satz steht direkt darüber und wird als Nachweis gespeichert.
3. Rechtlich heikel in der Werbung: Eine laufende München-Anzeige sagt „solange der Vorrat reicht“, der Shop ist aber unbegrenzt. Das ist Scheinknappheit und sollte raus (nicht von mir geändert, Werbung ist tabu).
4. Wer Tattoofin im App Store findet, liest nichts von Raten, sieht rohe Bildschirme mit „Demo-Studio“ und „app-review@…“ und kann vor der Anmeldung nichts ausprobieren. Die besseren Texte für 1.1 liegen fertig bereit und warten auf dein OK.
5. Größte Lücke für Freude beim Start: Ein neues Studio kann erst etwas ausprobieren, wenn Stripe das Konto freigegeben hat (Tage). Es gibt keinen Probe-Modus und kein „Ansehen ohne Konto“. Das musst du entscheiden (siehe e).

## b) Noten je Station (1 = schlecht, 10 = perfekt)

| Station | Note | Ein Satz |
|---|---|---|
| 1. Werbung Studios (GTA-Motive, 2 aktiv) | **7** | In 2 Sekunden klar: für Tattoo-Studios, Kunde zahlt in Raten, heißt Tattoofin, 7 Tage kostenlos, Pflichthinweis steht. Spiel-Look ist gewollt, wirkt aber gezeichnet/KI-nah. |
| 1b. Werbung Gutscheine (MU/LA, 12 aktiv) | **7** | Angebot sofort klar („für 375 € kaufen, 500 € bekommen“). Abzug für „solange der Vorrat reicht“ in einem München-Text. |
| 2. App Store (live 1.0) | **4** | Kein Wort zu Raten oder Klarna, Bilder ohne Nutzen-Satz, Prüf-Adresse und Demo-Hinweis im Bild, 0 Bewertungen. Unverändert seit 25.11. |
| 2b. App Store (Entwurf 1.1) | **7** | Raten* mit Pflichtsatz ganz oben, Klarna im Untertitel, gute Schlüsselwörter. Wartet auf dein OK. |
| 3. Website am Handy inkl. Unterseiten | **8** | Klar, schnell, ehrlich; Hero sagt in einem Satz, was es ist. Abzug: zwei Namen („7 Tage kostenlos testen“ / „1 Woche testen“), Login-Kopf war leer (behoben). |
| 4. Studio-Anmeldung (/studios-raten → /start) | **6 → 7** | 5 Schritte, Autofill, Fehlermeldungen, Vorausfüllung. Abzüge: Häkchen (behoben), Design-Sprung bei Schritt 5, die 2 Fragen bringen am Handy keine sichtbare Antwort. |
| 5. Gutschein-Kauf (Endkunde) | **8** | Auswahl, Name/E-Mail, Übersicht, „Endpreis“, Bedingungen und Widerruf verlinkt, Countdown auf echtes Datum. Kleinigkeit: Fehlermeldung bleibt stehen, nachdem man den Namen eingetippt hat. |
| 6. Raten-Zahlseite (Endkunde) | **8** | Laut Tests und Code: Inhalt bestätigen, Klarna/Karte/Apple Pay, Hinweis „Vertrag nur mit dem Studio“. Selbst echt bezahlen war tabu. |
| 7. App: erster Start und Funktionen (Code) | **6** | Kasse, Link/QR, Zahlungen, Gutscheine, Werbung, Team vollständig, USt-IdNr. freiwillig. Aber: 7 Pflichtfelder + 4 Schalter + Apple-Abo vor dem ersten Blick, und die Kasse bleibt bis zur Stripe-Freigabe zu. |

**Deine Fragen, kurz beantwortet (als Studio-Inhaber):**
- *Verstehe ich die Werbung?* Ja. „Kunde: Kann man auch in Raten zahlen? – A: Nee, nur bar. B: Klar, ich schick dir einen Link.“ trifft genau meinen Alltag.
- *Was ist mein Mehrwert?* Größere Motive verkaufen, weil der Kunde in Raten zahlen kann, ich aber das Geld auf einmal bekomme. Steht im Hero von /studios-raten in einem Satz.
- *Was bringt mich zum Klicken?* „7 Tage kostenlos testen, heute 0 €“ und die eigene Situation („Auftrag fehlgeschlagen“).
- *Würde ich die App im Store laden?* Aus dem Store allein: nein. Ich lese „Kasse“ und „Zahlungslinks“, nichts von Raten, und sehe Testbilder. Wer von der Website kommt: ja.
- *Was bringt mich zum Bleiben/Kaufen?* Ehrliche Rechnung („Eine Anzahlung zahlt Tattoofin fast 3 Monate“), offener Preis, monatlich kündbar, kein Vertrag mit Mindestlaufzeit. Was fehlt: ein echtes Studio mit Namen, das Tattoofin nutzt (Belege, keine erfundenen).
- *Ist der Anmelde- und Bestellweg perfekt?* Fast: 4 Angaben, Fortschritt, Zurück, Autofill. Schritt 5 springt aber in ein anderes Design (gelb statt Papier) und sagt „1 Woche testen“ statt „7 Tage“.
- *Kann ich ohne USt-ID weitermachen und schon spielen?* Weitermachen ja (USt-IdNr. ist überall freiwillig). Spielen nein: Web und App öffnen die Kasse erst nach der Stripe-Freigabe. Bis dahin sehe ich eine Checkliste.
- *Fühle ich mich gut aufgehoben, löst es Freude aus?* Die Website ja (freundlich, klar, WhatsApp-Hilfe sichtbar). Nach der Anmeldung fehlt der Freude-Moment „erste Testzahlung an mich selbst“.

**Als Endkunde (Gutschein):** Verstehe ich sofort („für 200 € kaufen, 300 € bekommen“). Echte Google-Bewertungen mit Stand im Code (München 4,9/348, Stand 24.11.; Chic 5,0/372). Kauf in 2 Schritten, PDF sofort per E-Mail. Würde ich kaufen: ja.

## c) Befunde

Schwere: **hoch** = kostet Kunden, Geld oder ist rechtlich heikel · **mittel** = stört oder verunsichert · **niedrig** = Schönheitsfehler.

### Hoch

| Nr. | Befund | Beleg | Stand |
|---|---|---|---|
| H1 | **Einwilligungs-Häkchen in der Studio-Anmeldung** (/start: „Ich melde mein Studio als Unternehmer an … und akzeptiere den Vertrag und den AVV“). Verstößt gegen deine PFLICHT-Regel vom 27.11. und kostet laut dir Abschlüsse. | `bilder/10-funnel-bis-start.jpg` | **behoben, live** (siehe d) |
| H2 | **„Solange der Vorrat reicht“** im Text der München-Anzeige (Bibliotheks-ID 2402693797199548, seit 27.11. aktiv). Der Shop ist unbegrenzt (deine Entscheidung 24.11.), also ist das Scheinknappheit (UWG). | `bilder/01-werbebibliothek.jpg`, Text in der Werbebibliothek | offen, Werbung nicht angefasst → e) |
| H3 | **Kein Ausprobieren vor der Stripe-Freigabe** (Web und App): „Geht, sobald dein Zahlungskonto freigegeben ist.“ Kein Probe-Modus, kein „Ansehen ohne Konto“ in der App (TattooLeadz-App hat es). Seit 25.11. offen. | Code `public/js/app.js` Z. 143, App `StartBereich.swift` | offen → e) |
| H4 | **App Store live verkauft das Hauptprodukt nicht**: Beschreibung ohne Raten/Klarna, Untertitel „Zahlungslinks fürs Studio“, Bilder roh mit „Demo-Studio: Hier wird nichts wirklich bezahlt“ und „app-review@tattoofin.de“. Seit 25.11. offen; Texte für 1.1 sind fertig (`tattoofin/ios/AppStore/store-texte-1-1.md`, Branch `claude/tattoofin-app-1-1-store`). | `bilder/02-appstore-bilder-live.jpg` | offen → Auftrag App-Chat, e) |

### Mittel

| Nr. | Befund | Beleg | Stand |
|---|---|---|---|
| M1 | **Zwei Namen für dasselbe Angebot**: Anzeige + /studios-raten „7 Tage kostenlos testen“, /start und alle anderen Seiten „1 Woche testen“. Nicht einfach änderbar: Der Vertrag (Fassung 2026-12f, § 12) nennt wörtlich den Knopf „1 Woche testen“. | `bilder/03-seiten-1.jpg` | offen → e) |
| M2 | **Schritt 5 springt in ein anderes Design**: Funnel auf hellem Papier, /start in Gelb mit anderer Kopfzeile. Wirkt wie eine fremde Seite. | `bilder/10-funnel-bis-start.jpg` | offen (größerer Umbau, f) |
| M3 | **Die 2 Fragen im Funnel bringen am Handy keine sichtbare Antwort**: Der Merkzettel („Statt Bargeld schickst du einen Link …“) wird ausgeblendet, sobald die Tastatur aufgeht – also immer am Handy. Die Einleitung versprach „damit wir dir zeigen, was Tattoofin in deinem Studio ändert“. | `bilder/10-funnel-bis-start.jpg` (Schritt 3) | Versprechen ehrlich umformuliert, live; echte Antwort am Handy offen |
| M4 | **App-Anmeldung lang**: 7 Pflichtfelder (u. a. Adresse, 2 Telefonnummern), 4 Schalter (Unternehmer, KMU, Vertrag, AVV), dann Apple-Abo. Web: 4 Felder + 1 Knopf. Die 4 Schalter sind auch „Häkchen“ im Sinne deiner Regel. | App `BestaetigungenView.swift`, `Texte.swift` | Auftrag App-Chat |
| M5 | **Meta-Pixel in den Gutschein-Shops ohne Einwilligung** (deine Entscheidung 23.11., steht im Code). Auf München sendet das Pixel zusätzlich automatisch Knopf-Daten („InputData“, automatische Einrichtung). Restrisiko nach TDDDG § 25, einmal genannt. | Netzwerk-Mitschnitt beim Kauf-Test | Info, nicht geändert |
| M6 | Login-Seite: Kopfzeile am Handy eine leere weiße Pille (seit 25.11. offen). | `bilder/03-seiten-1.jpg` | **behoben, live** |
| M7 | **Zahlseite für Endkunden hat noch 2 Häkchen** („Inhalt bestätigen“ und „Anzahlungsbedingungen gelesen“). Sie sind der Nachweis für das Studio bei No-Shows und Rückbuchungen (stehen so im Nachweis-PDF und auf /recht). Nach deiner Regel müssten sie weg; dann muss der Nachweis auf „Satz am Knopf“ umgestellt werden. Nicht ohne dich geändert, weil es den Schutz der Studios betrifft. | `bilder/12-zahlseite-endkunde-test.jpg` | offen → e) |

### Niedrig

| Nr. | Befund | Beleg | Stand |
|---|---|---|---|
| N1 | Shop-Kauf: „Bitte gib deinen Namen ein.“ bleibt stehen, nachdem der Name eingetippt ist (verschwindet erst beim nächsten Weiter). | `bilder/11-shop-kauf.jpg` | offen |
| N2 | Shops: Sekunden-Countdown bis 24.12. 16 Uhr. Datum ist echt, also erlaubt; wirkt aber drängend. | `bilder/04-seiten-2.jpg` | Info |
| N3 | Werbebibliothek zeigt die Knöpfe englisch („Sign Up“, „Shop Now“), das ist Metas Anzeige der Knopf-Art. | `bilder/01-werbebibliothek.jpg` | Info |
| N4 | /gutschein.html ohne Code meldet im Hintergrund einen 404 (erwartet, die Seite braucht einen Gutschein-Link). | Rundgang | Info |
| N5 | Bewertungen in den Shops sind fest eingetragen mit Stand (München 24.11.). Bei Änderung bei Google von Hand nachziehen. | `netlify/functions/_lib/gutschein-shop.mjs` | Info |

### Was gut ist
- /studios-raten ist seit dem Fix vom 25.11. wieder vollständig (Schriften, Farben, Funnel bedienbar), Hero beantwortet „was, für wen, was bringt es“ in einem Satz, Pflichthinweis „Achtung! Kreditaufnahme kostet Geld“ direkt dabei.
- Alle 35 geprüften Seiten (inkl. 3 Shops, 12 Rechtsseiten der Shops, 404-Seite) antworten richtig, kein Querscrollen, keine kaputten Bilder, keine Skriptfehler.
- Funnel: Fortschritt „Schritt x von 5“, Zurück, Fehlermeldungen am Feld, Autofill-Tokens, Angaben werden auf /start vorausgefüllt, Werbe-Herkunft (UTM) kommt durch.
- Shops: 2 Schritte, Übersicht mit „Du zahlst / Du bekommst“, „Endpreis, keine weiteren Kosten“, Bedingungen und Widerruf direkt am Knopf, kein Häkchen, ehrliche Frist.

## d) Was verbessert und live ist

Branch `claude/tf-kundenpruefung` (Repo marketing-media), Commit siehe unten.

| Datei | Änderung |
|---|---|
| `public/start.html`, `public/js/start.js`, `public/css/site.css` | Häkchen entfernt. Direkt über dem Knopf: „Mit Klick auf den Knopf meldest du dein Studio als Unternehmer an (weniger als 250 Mitarbeitende) und akzeptierst den Vertrag und den AVV.“ (Links zu Vertrag und AVV). Nach Abbruch bei Stripe bzw. Ankunft aus dem Funnel: Hinweis „Deine Angaben sind eingetragen …“ und Fokus direkt auf dem Knopf. Knopf-Text unverändert „1 Woche testen · heute 0 €“ (so steht er im Vertrag). |
| `netlify/functions/_lib/config.mjs`, `netlify/functions/signup.mjs` | Server speichert jetzt Art „knopf“, Version v2 und genau diesen Satz als Nachweis der Annahme (wie vorher beim Häkchen: Zeit, IP, Browser, Name). Alte offene Seiten mit Häkchen funktionieren weiter. |
| `public/login.html` | Kopfzeile am Handy mit Wortmarke „Tattoofin“ und „Hilfe? WhatsApp“ statt leerer Pille. |
| `public/studios-raten.html`, `_schilling/studios-raten/bauen.py` | Funnel Schritt 1: „Zwei kurze Fragen, dann trägst du dein Studio ein.“ statt des Versprechens, das am Handy nicht eingelöst wurde. |
| `dev/e2e.mjs`, `dev/betrieb.mjs` | Tests auf „kein Häkchen, Satz am Knopf, Nachweis v2“ umgestellt. |

Belege: `bilder/20-verbessert-start-ohne-haekchen.jpg`, `bilder/21-verbessert-login-kopf.jpg`.

DEPLOY_PLATZHALTER

## e) Was Domenic entscheiden muss

1. **„Solange der Vorrat reicht“ aus der München-Gutschein-Anzeige nehmen?** Empfehlung: Ja, sofort (Shop ist unbegrenzt → irreführend). Text sonst unverändert lassen. (Werbung, darum nicht von mir.)
2. **Probe-Modus für neue Studios?** Ab Tag 1 eine Probe-Kasse mit „Testzahlung an dich selbst“, bis Stripe freigibt (der Code dafür existiert schon für Apple/Demo-Studio). Empfehlung: Ja, das ist der Moment, in dem Freude entsteht. Größerer Umbau (Web + App + Server), erst nach OK.
3. **Ein Name: „7 Tage kostenlos testen“ überall?** Braucht eine neue Vertragsfassung (§ 12 nennt den Knopf „1 Woche testen“) und ~90 Textstellen. Empfehlung: Ja, zusammen mit der nächsten Vertragsänderung. Den umgekehrten Weg (/studios-raten auf „1 Woche testen“ wie im Vertrag) habe ich bewusst nicht gemacht: Die laufenden Anzeigen sagen „7 Tage kostenlos testen“, und Anzeige und Zielseite sollen dieselben Worte haben (Ultron 28.11.: sonst Domenic-Frage).
4. **App Store 1.1 mit den fertigen Raten-Texten und neuen Bildern einreichen?** (App-Chat „Tattoofin-App 1.1“.) Empfehlung: Ja.
5. **App: „Ansehen ohne Konto“ und kürzere Anmeldung (Studio-Telefon freiwillig, Adresse erst bei Stripe, 4 Schalter → Zustimmung per Knopf)?** Wirkt auf die Apple-Prüfung, darum nur mit deinem OK. Empfehlung: Ja.
6. **Häkchen auf der Zahlseite der Endkunden (M7) auch durch „Satz am Knopf“ ersetzen?** Empfehlung: Ja, aber mit neuem Nachweis-Text (Art „knopf“ wie jetzt bei der Studio-Anmeldung), damit Studios bei Rückbuchungen weiter belegen können, was der Kunde bestätigt hat.
7. **Meta-Pixel in den Shops ohne Einwilligungsfenster** bleibt dein Restrisiko (TDDDG). Nur zur Kenntnis.

**Auftrag an den App-Chat (nicht von mir umgesetzt, App-Dateien gehören dem Chat „Tattoofin-App 1.1“):**
- A1: Store 1.1: Texte aus `store-texte-1-1.md` übernehmen, Store-Bilder mit Nutzen-Satz, ohne „Demo-Studio“-Kasten und ohne `app-review@tattoofin.de` im Bild.
- A2: Start-Bildschirm „Ansehen ohne Konto“ mit dem vorhandenen Demo-Studio (wie TattooLeadz-App), plus kurzer Satz „Was ist Tattoofin?“ und Link zur Website.
- A3: Registrierung: 4 Schalter durch einen Zustimmungssatz am Knopf ersetzen (wie jetzt auf /start; Server nimmt `akzeptiert.art = "knopf"` an), Studio-Telefon freiwillig.
- A4: Nach Domenics OK zu e2: Probe-Kasse vor der Stripe-Freigabe.

## f) 3 nächste Schritte

1. Anzeige mit „solange der Vorrat reicht“ korrigieren (Ultron, 5 Minuten), dann Werberecht-Check über alle 14 aktiven Anzeigen.
2. /start im Papier-Design des Funnels bauen (eine Optik von der Anzeige bis Stripe) und am Handy die Antwort auf die 2 Fragen als eine Zeile über dem Knopf zeigen – als Vorschau, dann messen (Umami: funnel-schritt-3 → checkout-weiter).
3. Probe-Modus (e2) bauen, sobald du ihn freigibst; danach misst man, wie viele Studios in der Testwoche eine Testzahlung machen (das ist der beste frühe Hinweis, ob sie bleiben).

## g) Auftrag abgehakt

| Punkt | Stand |
|---|---|
| Werbung prüfen (Werbebibliothek + eigene Motive, nichts geändert) | erledigt |
| App-Store-Eintrag prüfen | erledigt (öffentliche Daten + Entwurf 1.1) |
| Website am Handy inkl. aller Unterseiten | erledigt (35 Seiten, 390 × 844, Safari-Engine) |
| Studio-Anmeldung bis vor das Absenden | erledigt (live, alle Schreib-Anfragen abgebrochen) |
| Endkunden-Kauf in allen 3 Shops bis vor die Zahlung | erledigt (Kauf-Anfrage abgefangen, keine Zahlung) |
| Raten-Zahlung als Endkunde | teilweise: über die vorhandenen Tests (Stripe-Nachbau) und Code, echte Zahlung tabu |
| App prüfen | teilweise: Code gelesen; Simulator nicht genutzt, weil der Speicher unter 3 GB lag (zeitweise unter 1 GB, durch einen anderen Chat) |
| Noten, Befunde mit Schwere und Beleg | erledigt |
| Website-Fixes auf eigenem Branch, Tests grün | TESTS_PLATZHALTER |
| Abnahme bestanden, live, live geprüft | ABNAHME_PLATZHALTER |
| Bericht, Commit, Push, Worktree löschen | erledigt (siehe Abschlussmeldung) |
