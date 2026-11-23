# Gutschein-Shop Tattoo Fashion München – Bericht (23.11.2026)

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
