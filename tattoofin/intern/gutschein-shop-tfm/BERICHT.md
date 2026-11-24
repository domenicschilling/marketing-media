# Gutschein-Shop Tattoo Fashion München + Landshut – Bericht (24.11.2026)

## Runde 24.11. nachts: Korrektur Runde 1 (54 Prüfer-Befunde), Entwurf, NICHT live

- **Hero:** Angebot ist die Überschrift: „500 € Gutschein für 375 €“, darunter „Fünf Tattoo-Gutscheine unter Wert, schon ab 200 € (Wert 300 €)“, „Aktion endet am 24.12. um 16 Uhr“ + Countdown auch am Handy. Kein „bis zu“ mehr. Statt nacktem Logo ein gezeichnetes Geschenk: Gutschein-Karte mit Logo, dunkelrotem Satinband und Schleife, goldene Tannenzweige in den Ecken, wenige feine Flocken nur um das Geschenk (nie über Text). Logo neu in Gold-Verlauf, scharf bis 1.400 px (je Stadt).
- **Liste/Kauf:** Karten ohne Nummern, mit Ersparnis-Marke („125 € geschenkt“), Stückzahl „Nur 6 Stück“ solange nichts weg ist, sonst „Noch 5 von 6“; reserviert = „Gerade reserviert“ + „in spätestens 30 Minuten wieder frei“. Tipp auf einen Aktions-Gutschein springt allein zu Schritt 2. Fehler stehen im festen Fuß direkt über dem Knopf (immer sichtbar, auch 320×568, Safari). Platzhalter „z. B. 100“. Geschütztes Leerzeichen vor jedem €. iPhone-Tastatur: Fenster passt sich dem sichtbaren Bereich an (Kopf, Summe, Knopf bleiben über der Tastatur). Zurück-Taste/Abbrechen aus Stripe: Kasse wird sofort beendet, Gutschein gleich wieder frei, Fenster öffnet mit derselben Auswahl und Name/E-Mail. Fachliche Ablehnungen (ausverkauft, 1 pro Person) kommen ohne roten Netzwerkfehler.
- **Nach dem 24.12., 16 Uhr oder ausverkauft:** kein Countdown, kein Rabatt-Text mehr; Hero, Liste, Kopf-Pille und Schluss zeigen den Wertgutschein (vorne, vorgewählt).
- **Neu „Gut zu wissen“:** echtes Gutschein-PDF als Muster (Code GS-MUST-ER01, wird nie vergeben) mit Schleife; Linien-Symbole statt „31.3“/„½“. FAQ neu: „Und wenn das Tattoo mehrere Sitzungen braucht?“ – Antwort nur aus der Regel im Shop (Eingelöstes zählt zuerst gegen den geschenkten Teil); dieser Satz steht jetzt auch in den Gutscheinbedingungen.
- **PDF (für alle Gutscheine):** Das €-Zeichen klebte in der iPhone/Mac-Ansicht am nächsten Wort („500 €ein“) – behoben (Abstand nach dem €).
- **Überschriften** sachlich: „Die 5 Aktions-Gutscheine“, „Gut zu wissen“, „So kaufst du“, „Tattoos aus unserem Studio“, „Häufige Fragen“, „So findest du uns“; Wortspiel nur noch am Schluss („Mehr Tattoo unterm Baum.“).
- **Bilder:** je Studio 6 starke Arbeiten (600×800, ohne Wasserzeichen, Folie oder Personen). Symbole 32/180/192 px („TF“ in Gold).
- **WhatsApp-Vorschau neu:** Mitte „Weihnachts-Aktion · 500 € Gutschein für 375 € · Nur bis 24.12., 16 Uhr“ mit Logo (auch als kleines Quadrat lesbar, kein Text unter 34 px), links das Geschenk, rechts „Ab 200 € · Wert 300 €“. Titel „Tattoo Fashion <Stadt>: Weihnachts-Gutscheine unter Wert“, Text „500 € Gutschein für 375 €, auch 300 € für 200 €. Insgesamt nur 21 Stück.“ Nachbau: `whatsapp-vorschau/`.
- **e2e-Abbruch:** wieder Rechnerlast (Last 560–730, Abbruch an wechselnden Stellen: Fragebogen, Anmeldung; die Seite war fertig, nur Playwright zu langsam). Keine Wechselwirkung mit dem Shop. `dev/e2e.mjs` wartet jetzt je nach Last bis 4 Minuten je Schritt (ohne Last 60 s) und speichert beim Abbruch ein Bild jeder offenen Seite.
- **Geprüft:** `dev/gutschein-shop-test.mjs` 135/0 (neu: Fehler sichtbar 375×667 + 320×568 in Chromium und Safari, Zurück-Taste gibt sofort frei, € einzeilig auf 320/360/375, iPhone-Tastatur, Zustand nach Aktionsende, Kauf-Leiste über der Liste weg), `dev/e2e.mjs` 410/0, Abnahme beider Entwurfs-Adressen mit `--soll "500 €;375 €;200 €;300 €"` bestanden (12/12 Geräte, axe ok).

## Runde 23.11. abends: Seite perfekt, Landshut dazu, WhatsApp-Vorschau neu (Entwurf, NICHT live)

- **Entwürfe:** https://tfm-gutschein-design--tattoofin.netlify.app/gutschein-kaufen/tattoo-fashion-munich und …/tattoo-fashion-landshut (läuft mit echtem Stripe und echten Daten: dort keine Kasse öffnen).
- **Kauf in 2 Schritten:** Gutschein wählen → Name + E-Mail (Empfänger und Gruß eingeklappt, freiwillig) → direkt Stripe. Kein Häkchen, keine Übersicht. Tipp auf eine Gutschein-Karte springt gleich zu Schritt 2. Stripe fragt keine Rechnungsadresse (nur wenn Stripe sie selbst braucht) und keine Telefonnummer mehr.
- **Keine Rechtstexte auf der Seite:** Bedingungen, Widerruf, Verkäufer stehen auf eigenen schlichten Seiten im gleichen Look (Fuß-Links Impressum · Datenschutz · Widerruf · Gutscheinbedingungen, je Stadt). Im Kauf-Fenster unter dem Knopf eine kleine Zeile mit „Bedingungen · Widerruf“. Die Gutschein-Mail enthält weiter Bedingungen + Widerrufsbelehrung. Auf der Seite bleibt nur „Gut zu wissen“: voller Wert bis 31.03.2027, in Teilen einlösbar, sofort per PDF, Motiv frei wählbar.
- **Je Stadt eine eigene Seite** aus einer Vorlage: `dev/gutschein/seite.html` + `SHOPS[…].seite` in `netlify/functions/_lib/gutschein-shop.mjs` → `node dev/gutschein-seiten.mjs [--og]` schreibt `public/gutschein-kaufen/<slug>.html` (+ `-impressum`, `-datenschutz`, `-widerruf`, `-bedingungen`). Netlify liefert sie ohne Umleitung, unbekannte Städte → 404. Alte Adressen `/gutschein-kaufen.html` und `/gutschein-kaufen-datenschutz.html` leiten weiter (301).
- **Landshut:** Studio `st_ybbij1eOoS9l`, gleiches Angebot (Nr. 1–5, 21 Stück, Wertgutschein 50–2.000 €), Stückzahl getrennt von München, Verkäufer Tattoo Fashion Landshut (Inhaber Andy Neelsen, Neustadt 502, neelsen.andy@gmail.com), Pixel 1324284036136356, 4,8 Sterne / 167 Bewertungen (Stand 22.11.), Logo mit „LANDSHUT“ (gleiche Schrift wie „MUNICH“), 12 echte Arbeiten ohne erkennbare Personen, Kasse/PDF/Mail im Landshut-Look. `freigegeben: true` wie München – live geht es erst mit dem Prod-Deploy (dein OK).
- **WhatsApp-/Facebook-Vorschau neu je Stadt:** `public/assets/gs-shop/<tfm|tfla>/og-weihnachten.jpg` (1200×630). Die Mitte (Quadrat) funktioniert allein: Logo, „GUTSCHEINE UNTER WERT“, „NUR BIS 24.12., 16 UHR“ – lesbar auch als kleines Quadrat. Links/rechts in der großen Vorschau: Karten „500 € – du zahlst 375 €“ und „2.000 € – du zahlst 1.500 €“, goldene Schneeflocken. Titel „Weihnachts-Gutscheine unter Wert“, Text „Tattoo Fashion <Stadt>: z. B. 500 € Gutschein für 375 €. Nur 21 Stück, bis 24.12., 16 Uhr.“ Bild-Adresse mit Prüfsumme (`?v=…`), damit WhatsApp/Facebook ein neues Bild laden.
- **Hero:** Logo im Fluss über dem Text (wird auf kleinen Handys kleiner, nie über dem Text), quer: Logo links, Text rechts. Abnahme 12/12 Geräte je Stadt.
- **e2e-Abbruch:** Kein Fehler im Code, sondern Zeitnot: Der Mac lief mit Last 600–900 (viele Testläufe/Chats gleichzeitig), feste Wartezeiten waren zu knapp (Abbrüche an wechselnden Stellen: Firmen-Zahlung, Zahlungslink, untere Leiste). Behoben in `dev/e2e.mjs`: Standard-Wartezeit 60 s statt 30 s, Rückweg nach der Firmen-Zahlung bis 30 s, untere Leiste bis 3 s. Danach 410/0 unter voller Last.
- **Geprüft:** `dev/gutschein-shop-test.mjs` 109/0 (neu u. a.: Landshut-Angebot, Stückzahl getrennt, 1 pro Person je Studio, Kasse/Mail/PDF Landshut, og-Tags + Bildmaße + Prüfsumme je Stadt, keine Rechtstexte im Inhalt, Rechtsseiten je Stadt, 2-Schritt-Kauf, Enter startet Kasse, Hero 320×460 bis quer), `dev/e2e.mjs` 410/0, Abnahme beider Entwurfs-Adressen mit `--soll "500 €"` bestanden (12/12 Geräte, axe ok). WhatsApp-Nachbau: `whatsapp-vorschau/whatsapp-<slug>.png`.


## LIVE seit 23.11.2026 (Domenics OK im Chat) – erste Fassung, nur München

- **Adresse:** https://tattoofin.de/gutschein-kaufen/tattoo-fashion-munich
- **Deploy:** `6b048ffb197b079eb3620c2d` (Branch `claude/tfm-gutschein-shop-live` = Live-Stand `claude/tattoofin-keine-anzahlung` b603506 + Shop). **Rücksprung:** `6b048cfce6ae82c890f2f60c`.
- **Geprüft vor dem Deploy:** e2e 410/0, Shop-Test 57/0, Entwurf auf der echten Site (alle Schnittstellen 200), Abnahme der Shop-Seite bestanden. Ordner-Abnahme mit Notausgang `ABNAHME_UEBERSPRINGEN=1` (Domenics OK; 13 alte Fehler der Startseite, live identisch).
- **Geprüft nach dem Deploy:** `/`, `/api/config`, `/api/status` (ok, keine Störungen), `/api/pay`, `/zahlen/…`, `/app.html`, `/studios`, Shop-Seite, Shop-Datenschutz, `/api/gutschein-shop` → 200; anderes Studio → 404. Live-Kasse geöffnet (Nr. 5, 200 €): Stripe zeigt Apple Pay und Karte, **kein Klarna**, Knopf „Bezahlen“ mit Satz „… zahlungspflichtig …“. Nicht bezahlt, Kasse beendet, Stückzahl wieder 10/10. Live-Abnahme der Seite bestanden.
- **Entscheidungen (Domenic 23.11.):** Start sofort · Aktions-Gutscheine bis 24.12.2026 16 Uhr, Wertgutschein läuft weiter · 1 Aktions-Gutschein pro E-Mail · Teil-Einlösung ja (Restwert bleibt) · keine Barauszahlung · nicht kombinierbar · alle Leistungen inkl. Piercing · Verkäufer Tattoo Fashion Munich, Inhaber Andy Neelsen (Einzelunternehmen, aus der Tattoofin-Anmeldung, keine USt-IdNr. hinterlegt).
- **Anzeigen:** NICHT eingeschaltet, an Meta nichts geändert. Neuer Link und Text unten unter „Was die Anzeigen dafür brauchen“.

Die Abschnitte darunter sind der Bericht vom Bau (Stand vor dem Live-Gang; die offenen Fragen sind oben beantwortet).

**Stand:** fertig gebaut und geprüft, **nicht live**. Branch `claude/tfm-gutschein-shop` (abgezweigt vom neuesten Tattoofin-Stand `claude/tattoofin-aufsteller-aus`).

**Vorschau (Testgeld, Stripe-Simulation):** https://tfm-gutschein-shop--tattoofin-vorschau.netlify.app/gutschein-kaufen/tattoo-fashion-munich
Spätere echte Adresse: `tattoofin.de/gutschein-kaufen/tattoo-fashion-munich`

## Was gebaut ist

Auf deinen Wunsch ist der Shop selbst die Handy-Landingpage für die Meta-Werbung, im Design der fertigen München-Gutscheinseite (gleiches Bild, Schriften, Flash-Bogen):

1. **Hero** (genau der erste Bildschirm): „Mehr Tattoo, als du bezahlst.“ · Knopf **„Gutschein online kaufen“**.
2. **Flash-Bogen** mit den 5 Nummern: Wert · Preis · echte Reststückzahl („5 von 6“, „ausverkauft“). Tipp auf eine Nummer öffnet den Kauf.
3. Darunter: „Voller Wert bis 31. März 2027. Danach verfällt nur der Bonus …“ und der Wertgutschein mit eigenem Betrag (50–2.000 €).
4. Arbeiten + Google-Bewertung, Ablauf in 3 Schritten, Bedingungen, Widerrufsbelehrung, Verkäufer, Studio-Adresse.
5. **Kauf in 3 Schritten** (Vollbild, am Handy auch mit offener Tastatur bedienbar): Gutschein wählen → Name, E-Mail, für wen, Gruß → Übersicht + Häkchen → Stripe (nur Karte, Apple Pay, Google Pay).
6. Nach der Zahlung: Gutschein-PDF per Mail an den Käufer, Mail + Push ans Studio, Gutschein in der Tattoofin-App unter „Gutscheine“ mit **Wert und bezahltem Betrag**.

| Angebot | Wert | Preis | Stück |
|---|---|---|---|
| Nr. 1 | 2.000 € | 1.500 € | 1 |
| Nr. 2 | 1.500 € | 1.250 € | 2 |
| Nr. 3 | 1.000 € | 750 € | 2 |
| Nr. 4 | 500 € | 375 € | 6 |
| Nr. 5 | 300 € | 200 € | 10 |
| Wertgutschein | 50–2.000 € (volle Euro) | = Wert | unbegrenzt, ganzjährig |

**Gültigkeit (Seite, Übersicht, Stripe-Kasse, PDF, Mail gleich):** „Bis 31.03.2027 löst du den vollen Wert von 500 € ein. Danach gilt der bezahlte Betrag von 375 €, einlösbar bis 31.12.2029.“ Wertgutschein: gültig bis 31.12.2029.

**Stückzahl sicher:** Beim Start der Kasse wird eine Einheit 30 Minuten reserviert (atomar, gegen Doppelverkauf). Bezahlt → verkauft. Abgebrochen oder abgelaufen → wieder frei. Ausverkauft = nicht mehr wählbar. Getestet mit 8 gleichzeitigen Käufern auf 2 Stück: genau 2 kommen in die Kasse. Gegen das Blockieren der Stückzahl: höchstens 3 offene Kassen je Anschluss.

**Nur München:** Shop gibt es nur für das Studio `st_nqoyv1Q2wj7F`. Auf der echten Seite bleibt er zu, bis du ihn freigibst **und** die Verkäufer-Angaben (Impressum) eingetragen sind (`netlify/functions/_lib/gutschein-shop.mjs`, `freigegeben` + `anbieter`).

## Geprüft

| Prüfung | Ergebnis |
|---|---|
| Bestehende Tests (`dev/e2e.mjs`) | 406 bestanden, 0 fehlgeschlagen |
| Neue Shop-Tests (`dev/gutschein-shop-test.mjs`) | 54 bestanden, 0 fehlgeschlagen: Stückzahl, gleichzeitige Käufer, Wert/Preis, Bonus-Frist (31.03. → 01.04.2027), Mail + PDF, Abbruch, Ablauf, Verkaufsende, Freischaltung, Kauf am Handy |
| Testkauf auf der Vorschau | Nr. 4 gekauft: Kasse 375,00 € nur Karte → Danke-Seite → Mail „Dein Gutschein … über 500,00 €“ + Studio-Mail „Wert 500 €, bezahlt 375 €“ → PDF richtig → Stückzahl 6 → 5 |
| `npm run abnahme` (Vorschau-Adresse) | **bestanden**: Hero auf 12 Geräten, Barrierefreiheit, Beträge |
| Werberecht-Check | siehe unten |

Gefunden und behoben: Der 31.03.2027 liegt schon in der Sommerzeit, die Frist wurde zuerst als 01.04. angezeigt. Ausverkaufte Nummern waren durchgestrichen (sah aus wie ein Streichpreis) → jetzt nur blass. Auf 320 px stand die Liste 7 px über → angepasst.

## Werberecht-Check (Kurzurteil: **Verstoß, solange das Impressum des Verkäufers fehlt** – deshalb ist der Shop technisch gesperrt; sonst ok)

| Nr. | Punkt | Ergebnis | Begründung |
|---|---|---|---|
| E1/E6 | Impressum Verkäufer | **Verstoß (offen)** | § 5 DDG: Verkäufer ist das Münchner Studio. Wer genau (Rechtsform, Anschrift, Register, USt-IdNr.) wissen wir nicht. Das Tattoo-Fashion-Impressum nennt „Fashionista GmbH, Flensburg“ – ob die auch das Münchner Studio betreibt, ist offen. Shop geht ohne diese Angaben nicht auf. |
| A3/A4 | Knappheit, Lockangebot | ok | Stückzahl ist echt, zählt live, ausverkauft = nicht kaufbar (Anhang Nr. 5, 7 UWG). |
| A5/B4 | Streichpreis | ok | Kein Streichpreis, „Wert“ und „Du zahlst“ nebeneinander. Restrisiko: Der Wert muss beim Einlösen zu den normalen Studiopreisen gelten. |
| A1 | „bis zu 500 € unter ihrem Wert“ | ok | Nr. 1: 2.000 € für 1.500 €. |
| A9 | 4,9 Sterne, 348 Bewertungen | ok | von der bisherigen Seite übernommen, Stand 22.11.2026. Vor Start einmal neu ablesen. |
| B1/B2 | Gesamtpreis, Versand | ok | „Endpreise inklusive Umsatzsteuer, keine Versandkosten“. |
| F6 | Gutschein-Bedingungen | ok | Bonus-Frist, Einlösefrist, Stückzahl, 1 pro Person vor dem Kauf sichtbar. Befristung nur des Bonus, bezahlter Betrag 3 Jahre (§§ 195, 199 BGB). |
| I1 | Bestell-Knopf | Risiko (gering) | § 312j BGB: Stripe-Knopf heißt „Bezahlen“, darüber steht „Mit „Bezahlen“ kaufst du … zahlungspflichtig“. |
| I3 | Widerruf | ok | Belehrung + Muster-Formular auf der Seite und in der Gutschein-Mail (dauerhafter Datenträger). |
| H1–H4 | Pixel, Datenschutz | ok | Meta-Pixel nur nach „Ja“ und nur auf tattoofin.de, Schriften lokal, eigene Datenschutzseite. |

**Restrisiken:** Abmahnungen sind bei Wettbewerbsfehlern immer möglich, die Auslegung kann anders ausfallen. Das größte Risiko ist das fehlende Impressum, deshalb ist der Shop gesperrt. Wenn jemand widerruft, muss das Studio im eigenen Stripe-Konto erstatten; eine erstattete Aktions-Nummer kommt nicht automatisch zurück in den Verkauf. Den Stripe-Knopf „Bezahlen“ sehen manche strenger als „zahlungspflichtig bestellen“.

## Was die Anzeigen dafür brauchen (Vorschlag, nichts geändert)

Die 6 fertigen Motive (`content/tattoofashion-munich/creatives/2026-11-22-gutschein/`) und der Kampagnenplan (`plans/tfm-gutschein-2026.json`) sagen noch „Verkauf nur im Studio“ und „einlösbar bis 31.03.2027“. Vorschlag:
- Link: `https://tattoofin.de/gutschein-kaufen/tattoo-fashion-munich?utm_source=meta&utm_campaign=gutschein-2026&utm_content={{ad.name}}`, Knopf „Jetzt kaufen“ (SHOP_NOW) statt „Mehr dazu“.
- Text: „Tattoo-Gutscheine von Tattoo Fashion München: Du zahlst weniger, als der Gutschein wert ist. 2.000 € für 1.500 € · 1.500 € für 1.250 € · 1.000 € für 750 € · 500 € für 375 € · 300 € für 200 €. Online kaufen, sofort als PDF. Voller Wert bis 31.03.2027, danach zählt der bezahlte Betrag. Stückzahl begrenzt: 1×, 2×, 2×, 6×, 10×.“
- Bild-/Reel-Texte mit „nur im Studio“ ändern. Ausverkaufte Nummer → Motiv pausieren.
- Messung: Die Seite meldet „InitiateCheckout“ an Meta (nur mit Ja). Ein „Purchase“-Ereignis fehlt noch; Kampagnenziel deshalb erst Traffic oder Leads lassen.

## Offene Fragen an dich

1. **Verkaufsstart online:** sofort nach deinem OK oder ab 01.12.?
2. **Ende:** Aktions-Gutscheine bis 24.12. (eingestellt), der Wertgutschein mit eigenem Betrag läuft weiter – ok?
3. **„Ein Gutschein pro Person“** online beibehalten? (Eingestellt: 1 Aktions-Gutschein je E-Mail-Adresse.)
4. **Restwert / Barauszahlung:** Darf man einen Gutschein in Teilen einlösen? Barauszahlung ausgeschlossen?
5. **Piercing** auch mit dem Gutschein bezahlbar? (Jetzt steht „alle Leistungen bei Tattoo Fashion Munich“.)
6. **Kombinierbar** mit anderen Aktionen?
7. **Verkäufer / Impressum:** Wer betreibt das Münchner Studio (Name, Rechtsform, Anschrift, Vertreter, Register, USt-IdNr., E-Mail)? Fashionista GmbH oder eine eigene Firma?
8. **Zusammenführen vor dem Live-Gang:** Der Haupt-Chat baut `claude/tattoofin-keine-anzahlung` (keine Anzahlungen für München + Landshut). Beide Branches ändern `pay.mjs`, `studio-ansicht.mjs`, `domain.mjs` und `public/js/app.js` → vor dem Deploy zusammenführen. Der Shop selbst bietet keine Anzahlung an (nur Gutscheine).
9. **Freigabe:** Darf der Stand live gehen (Prod-Deploy von tattoofin.de, danach `freigegeben: true`)? Vorher die anderen offenen Tattoofin-Branches zusammenführen.

## Technik kurz

- Neu: `netlify/functions/_lib/gutschein-shop.mjs` (Angebot, Reservierung, Bedingungen), `netlify/functions/gutschein-shop.mjs` (`/api/gutschein-shop`), `public/gutschein-kaufen.html`, `public/gutschein-kaufen-datenschutz.html`, Bilder/Schriften `public/assets/gs-shop/tfm/`, Test `dev/gutschein-shop-test.mjs`.
- Angepasst: Gutschein-PDF, Käufer-Mail, Studio-Mail, Push, App-Ansicht (Wert + bezahlt), Online-Ansicht `gutschein.html`, Danke-Seite, Stripe-Kasse (Artikelname, 30 Min., „Bezahlen“), Webhook (Kasse abgelaufen → Einheit frei), `netlify.toml`.
- Daten: `z.betragCent` bleibt immer der **bezahlte** Betrag (Stripe, Gebühren, Erstattung). Der Wert steht in `z.gutschein.wertCent`, Bonus-Ende in `bonusBis`.
- Die iPhone-App zeigt bis zu einem App-Update den bezahlten Betrag (Liste/Detail kommen aus dem App-Code); die Web-App zeigt Wert und bezahlt.
