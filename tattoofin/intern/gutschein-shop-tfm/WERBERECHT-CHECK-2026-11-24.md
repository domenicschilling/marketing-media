# Werberecht-Check Gutschein-Shop Tattoo Fashion München + Landshut (Endstand 24.11.2026)

Geprüft am 24.11.2026 zwischen 04:30 und 05:10 Uhr nach dem Skill `werberecht-check` (Module A–J, Skala ok / Risiko / Verstoß). Das ist eine Selbstprüfung nach dem Wortlaut der Normen, keine Rechtsberatung. Das Restrisiko trägt Domenic bewusst.

**Normtexte neu abgerufen am 24.11.2026** von gesetze-im-internet.de: UWG § 5, § 5b und Anhang, PAngV § 3, § 6 und § 11, BGB § 312g und § 312j, TDDDG § 25 und § 28, DDG § 5. Urteile (EuGH) stehen dort nicht und sind als solche markiert.

**Zielgruppe:** Verbraucher (Schenkende). **Branche:** Tattoo und Piercing, kein Heilberuf. **Kanäle:** Meta (Feed, Story, Reels), Shop-Seite auf tattoofin.de, Kauf-Mail, Gutschein-PDF.

**Bei der Prüfung nichts geändert:** Auf dem Entwurf nur GET-Abrufe, keine Kasse geöffnet, keine POST-Anfrage an `/api/gutschein-shop`. Nichts live, nichts an Meta. Einzige neue Datei ist diese.

## Geprüfte Fassung

| Teil | Ort | Stand |
|---|---|---|
| Werbung München | `~/Marketing-Maschine/content/tattoofashion-munich/creatives/2026-11-24-gutschein-shop/` – `texte.md`, `creative.json` je Motiv, Bilder 01–05 je `feed.jpg`, `story.jpg`, `reels.jpg` | Bilder 24.11., 04:23–04:24 |
| Video München | `06-video/reel.mp4` (mit Stimme, 34,7 s), `reel-ohne-stimme.mp4` (34,2 s), `reel-ohne-stimme-nr1-vergeben.mp4`, `sprechertext.txt`; Quelle `spots/tfm-gutschein-shop/` | 24.11., 03:48–04:34 |
| Werbung Landshut | `~/Marketing-Maschine/content/tf-landshut/creatives/2026-11-24-gutschein-shop/` – `texte.md`, `creative.json` je Motiv, Bilder 01–05 je `feed.jpg`, `story.jpg`, dazu 04 ohne Foto | 24.11. |
| Video Landshut | `06-video/reel.mp4` (35,4 s), `reel-ohne-fotos.mp4` (35,4 s), `reel-ohne-stimme.mp4` (33,9 s), `sprechertext.txt`; Quelle `spots/tf-gutschein-shop-landshut/` | 24.11., 04:31 |
| Shop-Seiten (Entwurf) | https://tfm-gutschein-design--tattoofin.netlify.app/gutschein-kaufen/tattoo-fashion-munich und …/tattoo-fashion-landshut, Fassung `angebot` | Abruf 24.11., 04:58; Branch `claude/tfm-gutschein-shop-live`, Commit `86c3ef7` (Seiten `c22d2a3`), Entwurf-Deploy `6b0502e9` laut STAND.md |
| Rechtsseiten je Stadt | `…-impressum`, `…-datenschutz`, `…-widerruf`, `…-bedingungen` | Abruf 24.11., 05:00 |
| Code | `dev/gutschein/seite.html` (Kauf-Fenster, Pixel), `netlify/functions/gutschein-shop.mjs` (Stripe-Kasse), `_lib/domain.mjs` `artikelText` (Text in der Kasse), `_lib/gutschein-shop.mjs` (`bonusSatz`, `bedingungen`, `widerruf`), `_lib/emails.mjs` `gutscheinKaeufer` (Kauf-Mail), `_lib/gutschein.mjs` (PDF), `public/gutschein.html` (Ansicht hinter dem QR-Code) | Commit `86c3ef7` |

## Bewusste Entscheidungen von Domenic

In den Tabellen mit **[D…]** markiert. Sie sind hier kein Auftrag zum Ändern. Die Tabellen zeigen nur, was das Gesetz dazu sagt und wo das Restrisiko liegt.

- **[D1] Werbung mit „begrenzt“ und festen Stückzahlen.** Der Online-Shop begrenzt hart (Code, Tests, danach „ausverkauft“). Verkäufe im Studio zählt er nicht mit.
- **[D2] Keine Rechtstexte auf der Seite.** Nur Fuß-Links, Bedingungen und Widerruf in Mail und PDF, Ablauf so einfach wie möglich.
- **[D3] Meta-Pixel ohne Einwilligungsfenster** (Entscheidung 23.11.2026, so im Code-Kommentar in `seite.html` und im Gedächtnis `tfm-gutschein-shop.md`).
- **[D4] Online und im Studio kaufbar.** Nie „nur online“ oder „nur im Studio“.
- **[D5] PDF ohne bezahlten Betrag** (laut STAND noch offen, so gebaut).

---

## 1. Kurzurteil

**Gesamt: Verstoß.** Der einzige Verstoß ist das Meta-Pixel, das auf tattoofin.de beim Aufruf der Shop-Seite ohne Einwilligung lädt (§ 25 Abs. 1 TDDDG). Die Datenschutzseite bietet dazu nur einen Widerspruch über Browser-Einstellungen an. Das ist Domenics Entscheidung [D3]. **Ohne diesen Punkt wäre das Gesamturteil Risiko.** Die Werbung beider Städte ist belegt, ohne Streichpreise und mit allen Bedingungen. Das größte Risiko dort ist die Stückzahl („insgesamt nur 21 Stück“, „gibt es nur einmal“), weil Verkäufe im Studio nicht mitgezählt werden [D1].

| Teil | Ergebnis | Hauptgrund |
|---|---|---|
| Werbung München (Bilder 01–05, texte.md) | Risiko | Stückzahl stimmt nur, wenn Studio-Verkäufe aus demselben Bestand kommen (Q1, Q2). Motiv 05 legt eine Studio-Öffnung bis 24.12., 16 Uhr nahe (M5). |
| Werbung Landshut (Bilder 01–05, texte.md) | Risiko | Q1, Q2. Sonst ok. |
| Videos München (mit Stimme, ohne Stimme, Nr.-1-Fassung) | Risiko | Q1 („Insgesamt nur 21 Stück in München“). Endkarte ohne „danach Kaufpreis“. Synthetische Stimme (Stand). |
| Videos Landshut (mit Stimme, ohne Fotos, ohne Stimme) | Risiko | Q1 („nur ein einziges Mal“). Synthetische Stimme (Stand). |
| Shop-Seiten beider Städte mit FAQ und Kauf-Fenster | **Verstoß** | Pixel ohne Einwilligung [D3]. Daneben Risiko: Hinweis zur Echtheit der Kundenstimmen fehlt, „inkl. USt“ steht nur auf der Bedingungsseite. |
| Rechtsseiten (Impressum, Datenschutz, Widerruf, Bedingungen) | **Verstoß** | Datenschutz zum Pixel ohne Rechtsgrundlage, nur Widerspruch [D3]. Impressum, Widerruf und Bedingungen ok. |
| Kauf-Mail, Gutschein-PDF, Ansicht hinter dem QR-Code | ok | Fristen überall gleich. Bedingungen, Widerrufsbelehrung und Muster-Formular in der Mail. |

---

## 2. Ergebnis je Prüfpunkt

### 2.1 Querschnitt (gilt für Werbung und Seiten beider Städte)

| Nr. | Prüfpunkt | Ergebnis | Begründung mit Norm und Link | Änderungsvorschlag („so ja“) |
|---|---|---|---|---|
| Q1 | A1/A3 Stückzahl und Knappheit: „Nur 21 Stück“, „Insgesamt nur 21 Stück in München“, „Nur 6 Stück“, „Diesen Gutschein gibt es nur einmal“, „Ist er ausverkauft, kommt er nicht wieder“ | **Risiko** [D1] | Online stimmt jede Zahl. Der Code begrenzt hart (Stück 1/2/2/6/10 in `_lib/gutschein-shop.mjs` Z. 36–40), ausverkauft ist nicht mehr wählbar. Die Aussagen gelten aber für Shop und Studio zusammen („insgesamt“, „in München“, „gibt es nur einmal“), und gleichzeitig steht überall „auch im Studio“. Verkauft das Studio Aktions-Gutscheine zusätzlich zu den 21 Online-Stück, ist die Angabe über Menge und Verfügbarkeit falsch: § 5 Abs. 1, Abs. 2 Nr. 1 UWG – https://www.gesetze-im-internet.de/uwg_2004/__5.html. Verkauft das Studio den einzigen 2.000er an der Theke, bietet der Shop ihn weiter an. Dann gibt es zwei, oder ein Online-Käufer bekommt seinen nicht. Einen Weg, Studio-Verkäufe im Shop abzuziehen, gibt es im Code nicht. Die zeitliche Grenze (Anhang Nr. 7) ist davon nicht betroffen, sie ist echt. | Ohne Textänderung: Das Studio verkauft Aktions-Gutscheine vor Ort nur über den Shop. Der Kunde scannt an der Theke einen QR-Code und zahlt mit Karte oder Apple Pay, oder das Team kauft mit ihm am Studio-Handy. Dann zählt jeder Verkauf, und alle Zahlen stimmen. Technisch ginge auch ein Knopf „Studio-Verkauf eintragen“, der eine Einheit abzieht (nicht gebaut). |
| Q2 | „Den Gutschein gibt es auch bei uns im Studio“ direkt nach einem Aktionsangebot [D4] | **Risiko** | Viele Primärtexte sagen das gleich nach „300 € Tattoo für 200 €“ oder „2.000 € für 1.500 €“. Das verspricht, dass genau dieser Aktions-Gutschein zum Aktionspreis auch vor Ort zu haben ist: § 5 Abs. 2 Nr. 1 und 2 UWG (Verfügbarkeit, Bedingungen) – https://www.gesetze-im-internet.de/uwg_2004/__5.html. Das stimmt, wenn das Studio die Aktions-Gutscheine vor Ort verkauft. Verkauft es dort nur Wertgutscheine, führt der Satz in die Irre. Zahlarten im Studio sind noch offen (STAND.md, Andy fragen). | Mit dem Studio festlegen: Aktions-Gutscheine vor Ort zum gleichen Preis und aus demselben Bestand (wie Q1). Dann passen Q1 und Q2 zusammen. |
| Q3 | A4 Lockangebot, Werbung nach Ausverkauf | **Risiko** (Ablauf) | Anhang Nr. 5 UWG – https://www.gesetze-im-internet.de/uwg_2004/anhang.html: Die Menge steht in jeder Anzeige („nur 1/2/6/10 Stück“, „solange der Vorrat reicht“). Damit ist die Aufklärung erfüllt. Läuft eine Anzeige nach dem Ausverkauf weiter, wirbt sie für etwas, das es nicht mehr gibt (§ 5 Abs. 2 Nr. 1 UWG). Die Pausen-Regeln je Motiv in beiden `texte.md` sind vollständig. Sie hängen aber an Handarbeit, und Studio-Verkäufe meldet niemand automatisch. Beim letzten 500er und 300er kommt eine Mail (`notifyAdmin`). | Pausen-Regeln so lassen. Die Ultron-Wache liest `/api/gutschein-shop?s=…` (Feld `ausverkauft`) mehrmals am Tag. Studio-Verkäufe der Nr. 1–5 sofort an Ultron. Nr. 1 (1 Stück) zuerst. |
| Q4 | A3 / Anhang Nr. 7 UWG: Frist „bis 24.12., 16 Uhr“ und Countdown | ok | Die Frist ist echt und im Code fest (`aktionBis: "2026-12-24T16:00:00+01:00"`). Der Countdown läuft auf dieses Datum. Danach zeigt die Seite nur noch den Wertgutschein, Vorschau und Titel stellen sich selbst um. Keine wiederkehrende „letzte Chance“. – https://www.gesetze-im-internet.de/uwg_2004/anhang.html | – |
| Q5 | A5/B4 Preisvorteil „Wert 300 € · du zahlst 200 €“, Streichpreis | ok | Kein Streichpreis, kein „statt“. „Wert“ ist der Nennwert des Gutscheins und kein früherer Preis. § 11 PAngV gilt nur für Waren (Überschrift „Zusätzliche Preisangabenpflicht bei Preisermäßigungen für Waren“) – https://www.gesetze-im-internet.de/pangv_2022/__11.html; ein Gutschein für Tattoo und Piercing betrifft eine Leistung. Der Vorteil ist echt, solange das Studio beim Einlösen seine normalen Preise nimmt (§ 5 Abs. 2 Nr. 2 UWG). | Beim Einlösen keine höheren Preise für Gutschein-Kunden. |
| Q6 | B1 Gesamtpreis | ok | § 3 PAngV – https://www.gesetze-im-internet.de/pangv_2022/__3.html: Alle Preise sind Endbeträge ohne Zusatzkosten. Anzeige, Seite und Kasse nennen denselben Betrag (Stripe-Betrag = `preisCent`). | – |
| Q7 | F6 / § 5a, § 5b Abs. 1 UWG: Gutschein-Bedingungen vor dem Kauf | ok | „Voller Wert bis 31.03.2027, danach Kaufpreis (bezahlter Betrag) bis 31.12.2029“ steht in jedem Primärtext beider Städte, im Kleingedruckten jedes Bildes, auf der Seite („Gut zu wissen“, FAQ), im Kauf-Fenster (Schritt 1 und 2) und in der Stripe-Kasse (Artikelbeschreibung aus `artikelText`). Ebenso 1 pro Person, Teil-Einlösung und Piercing. Die Frist trifft nur den Bonus. Der bezahlte Betrag gilt bis zum Ende der regelmäßigen Verjährung: §§ 195, 199 BGB – https://www.gesetze-im-internet.de/bgb/__195.html, https://www.gesetze-im-internet.de/bgb/__199.html; § 5b UWG – https://www.gesetze-im-internet.de/uwg_2004/__5b.html | – |
| Q8 | A1/A9 Google-Zahlen in Werbung und auf der Seite | ok | Belegt durch Bildschirmfotos vom 24.11.2026, 03:30/03:31 (`belege/`): München 4,9 aus 348, Landshut 4,8 aus 167. „über 340 Google-Bewertungen“ und „4,8 · 167 Bewertungen“ stimmen. Fünf volle Sterne bei 4,9 sind üblich, die Zahl steht daneben. | Pausen-Regel München prüft nur den Schnitt. Ergänzen: Fällt die Zahl unter 340 (gelöschte Bewertungen), Bilder und Video ebenfalls neu ausgeben. |
| Q9 | A9 Hinweis zur Echtheit der Bewertungen | **Risiko** | Wer Bewertungen zugänglich macht, muss sagen, ob und wie er sicherstellt, dass sie von echten Kunden stammen: § 5b Abs. 3 UWG – https://www.gesetze-im-internet.de/uwg_2004/__5b.html. Die Seiten zeigen je Stadt drei wörtliche Auszüge mit dem Satz „Auszüge aus echten Google-Bewertungen“. Quelle und Datum stehen da. Ob jemand prüft, steht nicht da. Das Wort „echten“ lässt sich als Zusage lesen, die Verfasser seien geprüfte Kunden. Ohne Prüfung wäre das nach Anhang Nr. 23b UWG stets unzulässig – https://www.gesetze-im-internet.de/uwg_2004/anhang.html. In den Anzeigen steht nur der Sternschnitt; dort genügt der Hinweis auf der Seite eher (§ 5a Abs. 5 UWG, wenig Platz). | Zeile unter den Auszügen: „Auszüge aus Google-Bewertungen, wörtlich, Stand 24.11.2026. Wir prüfen nicht, ob die Verfasser bei uns Kunde waren.“ Das Wort „echten“ fällt weg. |
| Q10 | A6 / Anhang Nr. 20 UWG: „500 € geschenkt“ auf den Karten der Seite | Risiko (gering) | Nr. 20 trifft „gratis/umsonst“, wenn trotzdem Kosten anfallen. Hier ist der Kauf selbst der Preis, das ist erlaubt. „geschenkt“ steht aber ohne die Bedingung, dass der Bonus nur bis 31.03.2027 gilt. Die Bedingung folgt direkt darunter („Gut zu wissen“) und im Kauf-Fenster. – https://www.gesetze-im-internet.de/uwg_2004/anhang.html | Auf der Karte „125 € extra bis 31.03.27“, oder so lassen (Bedingung steht vor dem Kauf zweimal da). |
| Q11 | G4 KI-Kennzeichnung | Risiko (gering, Stand) | Bilder und Videos sind per Code gebaut, mit echten Studiofotos und -aufnahmen. Keine KI-Bilder, keine KI-Personen. Die Fassungen mit Stimme nutzen die synthetische Stimme Pixie. Art. 50 Abs. 4 KI-VO verlangt eine Kennzeichnung bei Deepfakes, also Inhalten, die einer echten Person ähneln und echt wirken (EUR-Lex: https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32024R1689). Eine Sprecherstimme, die niemanden nachahmt, fällt nach dem Wortlaut eher nicht darunter. Auslegung und Meta-Regeln ändern sich gerade. Fassungen ohne Stimme: entfällt. | Fragt Meta beim Hochladen nach KI-Ton, wahr antworten. |
| Q12 | G3/G5 Personen, Fotos, Musik, Logo | ok (plausibel) | Fotos zeigen Arme und Beine ohne Gesicht, Quelle sind eigene Studio-Aufnahmen (`_quelle/img`, `landingpages/tfm-750/hero.mp4`). Musik München selbst erzeugt (`musik.py`), Landshut CC0 (freesound 546149). Logo „Tattoo Fashion“ im Auftrag der Studios. § 22 KunstUrhG – https://www.gesetze-im-internet.de/kunsturhg/__22.html, § 97 UrhG – https://www.gesetze-im-internet.de/urhg/__97.html. Nur nach Plausibilität geprüft. | – |
| Q13 | Online und im Studio, nie „nur online“ [D4] | ok | Per Suche geprüft: kein „nur online“, „nur im Studio“ oder „unter Wert“ in Texten, Bildern, Seiten und Rechtsseiten. Die Knöpfe „Gutschein online kaufen“ zeigen den Klickweg. | – |

### 2.2 Werbung München (Bilder 01–05 in Feed, Story, Reels und texte.md)

| Nr. | Prüfpunkt | Ergebnis | Begründung mit Norm und Link | Änderungsvorschlag („so ja“) |
|---|---|---|---|---|
| M1 | 01-uebersicht (alle fünf Nummern) | ok, Q1 vorbehalten | Liste mit Wert, Preis und Stückzahl, „Nur bis 24.12., 16 Uhr“, Kleingedrucktes mit „Den Gutschein gibt es auch bei uns im Studio.“, „Solange der Vorrat reicht · 1 Aktions-Gutschein pro Person“ und „Voller Wert bis 31.03.2027, danach zählt der Kaufpreis (bis 31.12.2029)“. Alle drei Formate gleich. | Pausen-Regel: bei der ersten ausverkauften Nummer aus (steht in texte.md). |
| M2 | 02-nr5 (300 € für 200 €) | ok, Q1 vorbehalten | „Nur 10 Stück“, Frist, Kleingedrucktes vollständig, Foto „Aus unserem Studio“ ohne Gesicht. | – |
| M3 | 03-nr4 (500 € für 375 €) | ok, Q1 vorbehalten | „500 € Gutschein für 375 € · nur 6 Stück“, Kleingedrucktes vollständig. | – |
| M4 | 04-nr1 „Diesen Gutschein gibt es nur einmal“ | Risiko (Q1) | Stärkste Knappheitsaussage der Kampagne. Sie stimmt nur, wenn Shop und Studio zusammen genau einen verkaufen (§ 5 Abs. 2 Nr. 1 UWG). | Wie Q1. Nach dem ersten Verkauf (online oder Studio) sofort pausieren. |
| M5 | 05-bis-heiligabend: „Geht noch: bis 24.12., 16 Uhr“ und „Online sofort als PDF. Oder bei uns im Studio.“ | Risiko (gering) | Beides steht direkt untereinander. Das liest sich so, als könne man am 24.12. bis 16 Uhr auch im Studio kaufen. Laut Google hat das Studio Mo–Fr 10–18 Uhr geöffnet; ob es an Heiligabend (Donnerstag) offen ist, ist nicht bekannt. Die Primärtexte sagen richtig „während der Öffnungszeiten“. § 5 Abs. 2 Nr. 1 UWG – https://www.gesetze-im-internet.de/uwg_2004/__5.html | Öffnung am 24.12. beim Studio klären. Ist es zu, Unterzeile „Online sofort als PDF. Im Studio zu den Öffnungszeiten.“ |
| M6 | texte.md: Primärtexte, Überschriften, Beschreibung | ok, Q1/Q2 vorbehalten | Jeder Primärtext nennt Studio, Frist, Vorrat, 1 pro Person und „Bis 31.03.2027 zählt der volle Wert, danach bis Ende 2029 der Kaufpreis“. Jede Anzeige nennt in mindestens einem Primärtext das Studio. Überschrift „Nur 1 Stück: Es gibt genau einen“ fällt unter Q1. Keine erfundenen Zähler, keine Streichpreise. | – |
| M7 | Ziel-Link und Knopf | ok | Link auf die Shop-Seite der Stadt mit UTM, Knopf „Jetzt einkaufen“ (SHOP_NOW). | – |

### 2.3 Werbung Landshut (Bilder 01–05 in Feed und Story, 04 auch ohne Foto, texte.md)

| Nr. | Prüfpunkt | Ergebnis | Begründung mit Norm und Link | Änderungsvorschlag („so ja“) |
|---|---|---|---|---|
| L1 | 01-uebersicht „Zum Weihnachtspreis*“ | ok, Q1 vorbehalten | Liste mit Wert, „du zahlst“ und „Nur X Stück“, „Online sofort als PDF oder direkt im Studio.“, Fußnote „* Voller Gutscheinwert bis 31.03.2027, danach gilt der bezahlte Betrag bis 31.12.2029. 1 Aktions-Gutschein pro Person, solange verfügbar.“ | – |
| L2 | 02-nr5 „300 € Tattoo* für 200 €“ | ok, Q1 vorbehalten | „Nur 10 Stück“, Fußnote wie L1, „Oder direkt bei uns im Studio“. | – |
| L3 | 03-nr4 „Keine Ahnung, welches Tattoo?“ | ok, Q1 vorbehalten | „Du zahlst 375 €“, „Nur 6 Stück“, Fußnote wie L1. | – |
| L4 | 04-nr1 „Nur 1 Stück“ (mit und ohne Foto) | Risiko (Q1) | Wie M4. Foto „Aus unserem Studio“ (Stier) ohne Person. | Wie Q1. Nach dem ersten Verkauf sofort pausieren. |
| L5 | 05-letzte-chance (Wertgutschein ab 50 €) | ok | Bild ohne Aktions-Gutschein, ohne Nummer und ohne Frist, bleibt wahr, egal wie viel verkauft ist. „Auch an Heiligabend“ hängt an „Sofort per E-Mail“ (online). Primärtext 1 nennt Aktions-Gutscheine; ab Ausverkauf oder ab 24.12., 16 Uhr nur Primärtext 2 und 3 (Regel steht in texte.md). | – |
| L6 | texte.md: Primärtexte, Überschriften, Beschreibung | ok, Q1/Q2 vorbehalten | Jeder Primärtext und jede Beschreibung nennt das Studio. „Ist ein Gutschein weg, ist er weg.“ und „Was verkauft ist, kommt nicht wieder.“ stimmen für den Online-Bestand (Q1). Überschrift „Ein einziges Mal: 2.000 € für 1.500 €“ fällt unter Q1. | – |

### 2.4 Videos (Bildschrift und Sprechertext, mit und ohne Stimme)

| Nr. | Prüfpunkt | Ergebnis | Begründung mit Norm und Link | Änderungsvorschlag („so ja“) |
|---|---|---|---|---|
| V1 | München mit Stimme (`reel.mp4`) | Risiko | Bild: Liste aller fünf Nummern mit Stückzahl, „Insgesamt nur 21 Stück in München“ (Q1), „Online kaufen. Sofort per E-Mail.“ mit Handy als „Beispielansicht“, Studio-Arbeiten ohne Gesicht, Endkarte mit Frist, „Insgesamt nur 21 Stück · voller Wert bis 31.03.2027“, Studio-Satz und Google 4,9. Ton: „Aber insgesamt nur einundzwanzig Stück“ (Q1), „solange noch welche da sind“. Die Endkarte nennt „voller Wert bis 31.03.2027“ ohne „danach Kaufpreis“. In Reels ist der Primärtext eingeklappt, die Folge der Frist sieht man dann erst beim Aufklappen (§ 5a Abs. 1 UWG – https://www.gesetze-im-internet.de/uwg_2004/__5a.html). Zeile 2 nennt den Preis zuerst, Zeile 3 und 4 den Wert zuerst; wer nur hinhört, kann stolpern, das Bild zeigt es klar. | Endkarte, nur Bildschrift (Ton bleibt): „voller Wert bis 31.03.2027, danach der Kaufpreis bis 31.12.2029“. Reihenfolge der Tonzeilen: offen, keine neue Aufnahme, Domenic entscheidet. |
| V2 | München ohne Stimme (`reel-ohne-stimme.mp4`) und Nr.-1-Fassung | Risiko | Wie V1 ohne Ton, dazu „Nur bis Heiligabend, 16 Uhr.“. Der Stempel „Vergeben“ ist kein Streichpreis. Q1 und Endkarte wie V1. | Wie V1. |
| V3 | Landshut mit Stimme (`reel.mp4`, `reel-ohne-fotos.mp4`) | Risiko | Bild: Fußnote „* Voller Wert bis 31.03.2027, danach der bezahlte Betrag bis 31.12.2029“ in den Preisszenen und auf der Endkarte, „Nur bis 24.12., 16 Uhr · solange verfügbar“, „1 Aktions-Gutschein pro Person“, „Oder direkt bei uns im Studio“, Studio-Arbeiten ohne Gesicht bzw. Motiv-Karten. Ton: „den großen gibt es nur ein einziges Mal“ (Q1), „Jetzt Gutschein online kaufen“ (ohne „nur“). | Wie Q1. |
| V4 | Landshut ohne Stimme (`reel-ohne-stimme.mp4`) | Risiko | Wie V3, „Nur 1 Stück“ als Bildschrift (Q1). | Wie Q1. |

### 2.5 Shop-Seiten (Entwurf, beide Städte, Fassung „angebot“)

| Nr. | Prüfpunkt | Ergebnis | Begründung mit Norm und Link | Änderungsvorschlag („so ja“) |
|---|---|---|---|---|
| S1 | Titel, Beschreibung, Vorschaubild (WhatsApp/Facebook) | ok, Q1 vorbehalten | „500 € Gutschein für 375 € · Tattoo Fashion München/Landshut“, „Für Tattoo oder Piercing in … Auch 300 € für 200 €, insgesamt nur 21 Stück.“, Bild „Weihnachts-Aktion · 500 € Gutschein für 375 € · Nur bis 24.12., 16 Uhr“. Stellt sich bei Ausverkauf und nach Aktionsende selbst um. | – |
| S2 | Hero, Liste, Kopf-Pille, Zähler | ok, Q1/Q10 vorbehalten | Zähler und „Nur 6 Stück zu diesem Preis“ kommen aus dem echten Bestand. Keine erfundenen Zahlen. | – |
| S3 | „Gut zu wissen“ und FAQ | ok | Studio-Kauf mit Anschrift, Regel nach dem 31.03.2027 mit richtigem Beispiel, mehrere Sitzungen (Eingelöstes zählt zuerst gegen den Bonus, wie in den Bedingungen), 1 pro Person, „Was bekommt man für 300 €?“ ohne geschätzte Preise, Zahlarten, Einlöseort. Dass „Wie kann ich bezahlen?“ nur die Online-Zahlarten nennt, ist kein Rechtsproblem (Studio-Zahlarten offen). | – |
| S4 | Kundenstimmen | **Risiko** | Q9. Dazu München: Zwei Auszüge nennen die Tätowierer „Pablo“ und „Nico“. Hausregel Modul J: keine Einzel-Artists ohne Einwilligung; arbeitet einer nicht mehr dort, führt die Seite in die Irre (§ 5 Abs. 2 Nr. 3 UWG). Landshut: Der Auszug von Lukas L. (vor 2 Jahren) sagt „preislich absolut unschlagbar“. Wer eine Kundenstimme auswählt und zeigt, macht sie sich zu eigen. „Unschlagbar“ ist eine Spitzenstellung ohne Beleg (§ 5 Abs. 1, 2 UWG – https://www.gesetze-im-internet.de/uwg_2004/__5.html). | München: Namen mit „…“ kürzen oder Einwilligung von Pablo und Nico. Landshut: „und auch preislich absolut unschlagbar“ mit „…“ kürzen oder einen anderen Auszug nehmen. |
| S5 | Anbieter auf der Seite (§ 5b Abs. 1 Nr. 2 UWG) | ok | „Verkauf und Gutschein: Tattoo Fashion Munich/Landshut“ und Anschrift im Fuß, Impressum-Link. – https://www.gesetze-im-internet.de/uwg_2004/__5b.html | – |
| S6 | Hinweis „inkl. USt“ und „keine weiteren Kosten“ beim Online-Angebot | **Risiko** [D2] | § 6 Abs. 1 PAngV – https://www.gesetze-im-internet.de/pangv_2022/__6.html verlangt beim Fernabsatz den Hinweis, dass die Preise die Umsatzsteuer enthalten, und ob weitere Kosten anfallen. Er steht nur auf der Seite „Gutscheinbedingungen“ (Fuß-Link und Link im Kauf-Fenster), nicht bei den Preisen. Vorhanden, aber versteckt. Fehlende „inkl. USt“-Hinweise sind ein häufiger Abmahngrund. | Die vorhandene Zeile im Kauf-Fenster erweitern: „Endpreise inkl. USt · Karte, Apple Pay oder Google Pay · Bedingungen · Widerruf“. Das sind drei Wörter in einer Zeile, die es schon gibt. Vorher klären, ob Andy Neelsen Umsatzsteuer ausweist. Als Kleinunternehmer wäre „inkl. USt“ falsch, auch auf der Bedingungsseite. |
| S7 | H1/H2 Meta-Pixel ohne Einwilligung | **Verstoß** [D3] | In `seite.html` lädt das Pixel auf tattoofin.de beim Aufruf (`fbq('init')`, `PageView`), dazu `InitiateCheckout` und `Purchase`, ohne Einwilligungsfenster. Auf dem Entwurf lädt es nicht (Bedingung `location.hostname === "tattoofin.de"`), im Live-Stand schon. § 25 Abs. 1 TDDDG verlangt vorher eine Einwilligung. Die Ausnahme „unbedingt erforderlich“ (Abs. 2 Nr. 2) passt nicht auf Werbemessung. – https://www.gesetze-im-internet.de/ttdsg/__25.html. Ordnungswidrig nach § 28 Abs. 1 Nr. 13 TDDDG, Geldbuße bis 300.000 € (§ 28 Abs. 2) – https://www.gesetze-im-internet.de/ttdsg/__28.html. Ein Widerspruch per Browser ist keine Einwilligung (EuGH, Urt. v. 01.10.2019 – C-673/17 Planet49, nicht auf gesetze-im-internet.de). | Wie auf tattooleadz.de seit 16.10. (`consent.js`): Pixel erst nach „Ja“, „Nur notwendige“ gleich groß, Widerruf über „Cookie-Einstellungen“ im Fuß. Bleibt Domenic bei [D3], ist das sein bewusst getragenes Risiko (siehe Abschnitt 3). |
| S8 | Umami und Speicherung im Browser | ok | Umami setzt keine Cookies und speichert nichts auf dem Gerät. Auswahl, Name und E-Mail liegen nur bis zum Schließen des Tabs im Browser, für den gewünschten Kauf (§ 25 Abs. 2 Nr. 2 TDDDG). Das Umami-Skript kommt von cloud.umami.is (USA). | Restrisiko: Beim Laden geht die IP-Adresse an Umami in den USA. |

### 2.6 Kauf-Fenster und Stripe-Kasse

| Nr. | Prüfpunkt | Ergebnis | Begründung mit Norm und Link | Änderungsvorschlag („so ja“) |
|---|---|---|---|---|
| K1 | Zahlungsmittel zu Beginn des Bestellvorgangs | ok | § 312j Abs. 1 BGB – https://www.gesetze-im-internet.de/bgb/__312j.html: „Sichere Zahlung per Karte, Apple Pay oder Google Pay“ steht im Kauf-Fenster, in „So geht's“ und in der FAQ. | – |
| K2 | Pflichtangaben direkt vor der Bestellung | ok | § 312j Abs. 2 BGB: Die Stripe-Kasse zeigt „Aktions-Gutschein Nr. X: Wert … – Tattoo Fashion …“, die Beschreibung mit vollem Wert bis 31.03.2027 und dem bezahlten Betrag danach, und den Preis (`artikelText` in `_lib/domain.mjs`). | – |
| K3 | Bestell-Knopf | Risiko (gering) | § 312j Abs. 3 BGB: Stripe zeigt „Bezahlen“ (`submit_type: "pay"`), darüber „Mit ‚Bezahlen' kaufst du … zahlungspflichtig bei …“. Nach EuGH (Urt. v. 07.04.2022 – C-249/21, nicht auf gesetze-im-internet.de) zählt nur die Beschriftung des Knopfs. „Bezahlen“ gilt überwiegend als eindeutig, ist aber nicht der Gesetzeswortlaut. Stripe bietet keinen Knopf „zahlungspflichtig bestellen“. | So lassen und das Restrisiko kennen. |
| K4 | Hinweis auf die Bedingungen vor dem Kauf | Risiko (gering) [D2] | § 305 Abs. 2 BGB – https://www.gesetze-im-internet.de/bgb/__305.html: Der Link „Bedingungen“ steht unter dem Knopf, ein Satz „Es gelten die Gutscheinbedingungen“ fehlt. Die wichtigste Regel (Bonus bis 31.03.2027) steht in der Kassenbeschreibung und gehört damit zum Angebot. „Nicht kombinierbar“ und „keine Barauszahlung“ hängen nur an den Bedingungen. | Zeile „Es gelten die Gutscheinbedingungen · Widerruf“ statt „Bedingungen · Widerruf“. |
| K5 | 1 pro Person, „Gerade reserviert“, „Schon verkauft“ | ok | Texte stimmen mit dem Code (Reservierung 30 Minuten, verkaufte Nummern nur als Zeile, kein Durchstreichen). | – |

### 2.7 Rechtsseiten

| Nr. | Prüfpunkt | Ergebnis | Begründung mit Norm und Link | Änderungsvorschlag („so ja“) |
|---|---|---|---|---|
| R1 | Impressum je Stadt | ok | § 5 DDG – https://www.gesetze-im-internet.de/ddg/__5.html: Name mit Inhaber Andy Neelsen, Einzelunternehmen, Anschrift, E-Mail, Telefon, Impressum Tattoofin verlinkt, im Fuß jeder Seite. Eine USt-IdNr. ist nur Pflicht, wenn es eine gibt (Abs. 1 Nr. 6); hinterlegt ist keine. | Klären, ob Andy Neelsen eine USt-IdNr. hat; wenn ja, eintragen. |
| R2 | Datenschutz | **Verstoß** [D3] | Abschnitt Meta-Pixel: lädt ohne Einwilligung, nennt keine Rechtsgrundlage (Art. 13 Abs. 1 lit. c DSGVO), bietet nur Widerspruch über Browser oder Meta-Einstellungen. Das passt nicht zu § 25 Abs. 1 TDDDG (S7). DSGVO: https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679. Die übrigen Abschnitte (Bestellung, Stripe, Netlify, Umami, WhatsApp, Rechte) sind ok. | Mit Einwilligung: „Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Du kannst sie jederzeit über ‚Cookie-Einstellungen' unten widerrufen.“ |
| R3 | Widerrufsbelehrung | ok | §§ 312g, 356 BGB – https://www.gesetze-im-internet.de/bgb/__312g.html, https://www.gesetze-im-internet.de/bgb/__356.html: 14 Tage ab Vertragsschluss, Anschrift mit E-Mail und Telefon, Folgen, Muster-Formular, in beiden Städten mit den richtigen Daten. Du-Form und der Zusatz „Mit dem Widerruf wird der Gutschein ungültig“ weichen vom amtlichen Muster ab, inhaltlich stimmt es. | – |
| R4 | Gutscheinbedingungen | ok | Verkäufer, Geltung auch für Piercing, Teil-Einlösung, keine Barauszahlung, nicht kombinierbar, Bonus bis 31.03.2027, Eingelöstes zählt zuerst gegen den Bonus, bezahlter Betrag bis 31.12. des dritten Jahres (bei Kauf 2026: 31.12.2029), Stückzahl, 1 pro Person, Ende 24.12.2026, 16 Uhr, Endpreise inkl. USt, keine Versandkosten, Zahlarten. In beiden Städten gleich, nur Name und Anschrift anders. | – |
| R5 | Hinweis zur Verbraucherschlichtung | entfällt (wahrscheinlich) | § 36 VSBG – https://www.gesetze-im-internet.de/vsbg/__36.html: Pflicht erst bei mehr als 10 Beschäftigten (Abs. 3). | Hat ein Studio mehr als 10 Beschäftigte, einen Satz ergänzen. |

### 2.8 Kauf-Mail, Gutschein-PDF, Ansicht hinter dem QR-Code

| Nr. | Prüfpunkt | Ergebnis | Begründung mit Norm und Link | Änderungsvorschlag („so ja“) |
|---|---|---|---|---|
| P1 | Kauf-Mail (`gutscheinKaeufer`) | ok | Betreff „Dein Gutschein von … über 500,00 €“, Kasten „So lange gilt dein Gutschein“, Zeilen Gutscheinwert bis 31.03.2027, Bezahlt, Danach einlösbar bis 31.12.2029, dazu Gutscheinbedingungen, Widerrufsbelehrung, Muster-Formular und Verkäufer. Damit auf dauerhaftem Datenträger (§ 312f Abs. 2 BGB – https://www.gesetze-im-internet.de/bgb/__312f.html). Reine Bestellmail, § 7 UWG nicht berührt. | – |
| P2 | Gutschein-PDF | ok [D5] | „Voller Wert 500 € bis 31.03.2027 / Danach gilt der bezahlte Betrag bis 31.12.2029. / In Teilen einlösbar. Bedingungen über den QR-Code.“, Code, Einlöseort. Ohne bezahlten Betrag: Der Käufer kennt ihn aus der Mail, der Beschenkte sieht den Restwert ab 01.04.2027 in der Online-Ansicht. | – |
| P3 | Ansicht hinter dem QR-Code (`public/gutschein.html`) | ok | Gleiche Sätze wie das PDF, nach dem 31.03.2027 der genaue Restbetrag, Link zu den Bedingungen. | – |

### 2.9 Entfällt

Modul C (HWG): keine Heilversprechen; „hygienisch“ in einer Kundenstimme ist keine Heilaussage. C8 Laser, Modul D (Makler), F1–F5 (Gewinnspiel, Glücksrad), G1 (Influencer, es wirbt nur das Studio selbst), A11 (vergleichende Werbung), A12 (Kaltakquise, es gibt keine Werbe-Mails), B3 (Grundpreis), I2 (Kündigungsknopf, kein Abo), I4 (B2B), Modul J Raten („Ratenkauf gibt es für Gutscheine nicht“).

---

## 3. Restrisiken in einfacher Sprache

- **Meta-Pixel ohne Einwilligung [D3].** Worum es geht: Das Pixel setzt beim Aufruf Cookies, bevor der Besucher gefragt wird. Was passieren kann: Ein Mitbewerber oder Verband mahnt ab (seit EuGH, Urt. v. 04.10.2024 – C-21/23, dürfen Mitbewerber auch Datenschutzfehler verfolgen; nicht neu abgeglichen), oder eine Datenschutz-Aufsicht verhängt ein Bußgeld. Was das Risiko senkt: ein Einwilligungsfenster wie auf tattooleadz.de. Dann fehlen nur die Messwerte von Besuchern, die ablehnen.
- **Stückzahl und Studio [D1].** Worum es geht: Die Werbung sagt „insgesamt nur 21“ und „gibt es nur einmal“, der Shop zählt aber nur online. Was passieren kann: Verkauft das Studio zusätzlich, stimmt die Werbung nicht mehr. Das kann abgemahnt werden, und beim 2.000er kann ein Online-Käufer leer ausgehen. Was das Risiko senkt: Das Studio verkauft Aktions-Gutscheine nur über den Shop, auch an der Theke, und meldet jeden Verkauf sofort.
- **Anzeigen nach Ausverkauf.** Läuft eine Anzeige weiter, obwohl die Nummer weg ist, wirbt sie für etwas, das es nicht gibt. Die Pausen-Regeln sind fertig, sie müssen nur zeitnah umgesetzt werden, beim 2.000er am schnellsten.
- **Kundenstimmen.** Ohne den Satz „Wir prüfen nicht, ob die Verfasser Kunde waren“ ist eine Abmahnung möglich. Der Satz kostet eine Zeile.
- **Allgemein.** Eine Abmahnung ist bei Wettbewerbsfehlern immer möglich, und die Auslegung kann anders ausfallen als hier. Zahlen sind nur so gut wie ihr Beleg, darum die Google-Bildschirmfotos aufheben. Rechte an Fotos, Musik und Logo sind nur nach Plausibilität geprüft. Widerruft ein Käufer, erstattet das Studio über Stripe, und die Nummer kommt nicht zurück in den Verkauf; das passt zu „kommt nicht wieder“.

---

## 4. Belege und Nachweise

- Google-Stand 24.11.2026: `belege/google-muenchen-2026-11-24-0330.jpg` (4,9 aus 348), `belege/google-landshut-2026-11-24-0331.jpg` (4,8 aus 167).
- Geprüfte Seiten und Code: Commit `86c3ef7` auf `claude/tfm-gutschein-shop-live` (Seiten aus `c22d2a3`), Entwurf-Deploy `6b0502e9` laut STAND.md, abgerufen per GET am 24.11.2026, 04:58–05:00.
- Geprüfte Werbung: Dateien und Zeitstempel siehe Tabelle „Geprüfte Fassung“ oben. Bei jeder Änderung an Bildern, Texten, Videos oder Seite neu prüfen.
- Normtexte: abgerufen am 24.11.2026 von gesetze-im-internet.de (Liste oben).

## 5. Offen für Domenic (über Ultron)

1. Pixel: Einwilligungsfenster ja oder nein [D3] (S7, R2).
2. Studio: Aktions-Gutscheine vor Ort nur über den Shop und aus demselben Bestand verkaufen (Q1, Q2). Dazu Zahlarten im Studio und Öffnung am 24.12. (M5).
3. Kundenstimmen: Zeile „Wir prüfen nicht …“, Namen Pablo und Nico, Landshut „unschlagbar“ (Q9, S4).
4. „Endpreise inkl. USt“ in die Zeile im Kauf-Fenster, „Es gelten die Gutscheinbedingungen“ (S6, K4). Vorher Umsatzsteuer-Status und USt-IdNr. von Andy Neelsen klären (R1).
5. Video München: Endkarte mit „danach der Kaufpreis bis 31.12.2029“ (nur Bildschrift, neu rendern). Reihenfolge der Tonzeilen bleibt offen, keine neue Aufnahme (V1).
