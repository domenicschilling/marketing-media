# Werberecht-Check Gutschein-Aktion Chic Tattoo Augsburg (25.11.2026, Nachtrag 27.11.)

**Nachtrag 27.11.2026:** Dunkles Design ändert an den Aussagen nichts (gleiche Texte, Bedingung zum Sternchen überall, axe 0 Kontrastfehler). „1 pro Person“ ist weg (Grenze aufgehoben): F6/A2 weiter ok, die Bedingungen nennen keine Grenze mehr. „Solange der Vorrat reicht“ bleibt ausdrücklich auf Domenics Entscheidung (Risiko gering, siehe A3/A4). Laufende MU/LA-Anzeigen nennen noch „Ein Aktions-Gutschein pro Person“: nach dem Live-Gang eine zu enge, keine irreführend lockende Angabe (geringes Risiko, besser angleichen).

Geprüft (Selbstprüfung nach dem Wortlaut, Skill `werberecht-check`): Shop-Seite `tattoofin.de/gutschein-kaufen/chic-tattoo-augsburg` (Entwurf, Vorlage `tattoofin/website/dev/gutschein/chic/seite.html`), Rechtsseiten (Impressum, Datenschutz, Widerruf, Bedingungen), Kauf-Fenster/Stripe-Kasse/Mail/PDF (gleiche Technik wie MU/LA, Check 24.11.: `../gutschein-shop-tfm/WERBERECHT-CHECK-2026-11-24.md`), 5 Bildanzeigen + 1 Video ohne Stimme (Marketing-Maschine, Branch `claude/chic-gutschein-kampagne`, `content/chic-tattoo-augsburg/creatives/2026-11-25-gutschein-shop/`). Zielgruppe: Verbraucher, Augsburg.

**1. Kurzurteil:** **Verstoß** nur wegen des Meta-Pixels ohne Einwilligung (Domenics Entscheidung wie bei MU/LA, [D3]). Ohne diesen Punkt **Risiko (gering)**: veraltete Google-Zahl, „solange der Vorrat reicht“ bei unbegrenztem Angebot, Kunden-Einwilligung für gezeigte Tattoos.

## 2. Tabelle

| Nr. | Prüfpunkt | Ergebnis | Begründung (Norm) | So ja / erledigt |
|---|---|---|---|---|
| A1 | Formel „Für X € kaufen, Y € bekommen*“ | ok | § 5 Abs. 1, 2 Nr. 2 UWG – https://www.gesetze-im-internet.de/uwg_2004/__5.html: Wert und Preis stimmen in Seite, Kasse, Mail, PDF, Anzeigen überein (Test `dev/gutschein-chic-test.mjs`: 200 € bezahlt → 280 € Wert). Bedingung zum Sternchen steht in jedem Bild, im Hero, an der Liste, im Kauf-Fenster und im Video in jeder Szene mit Sternchen. | – |
| A1 | „Du bekommst mehr.*“, „Mehr Tattoo fürs gleiche Geld.*“ | ok | Mit Sternchen und Bedingung direkt daneben; der bezahlte Betrag bleibt bis 31.12.2029 voll anrechenbar. | – |
| A3 | Frist / Countdown | ok | Anhang Nr. 7 UWG – https://www.gesetze-im-internet.de/uwg_2004/anhang.html: echtes Ende 24.12.2026, 16 Uhr aus dem Server (`aktionBis`), danach schaltet die Seite selbst auf Wertgutschein um, Countdown setzt sich nie zurück. Keine Stückzahl, kein Zähler. | Ende der Kampagne = 24.12. 16 Uhr |
| A3/A4 | „solange der Vorrat reicht“ (Primärtexte der Anzeigen) und „solange verfügbar“ (Bedingungen) | Risiko (gering) | Das Angebot ist unbegrenzt; der Zusatz deutet eine Grenze an, die es nicht gibt (§ 5 Abs. 2 Nr. 1 UWG). Steht nur klein, Domenics Wunsch wie bei MU/LA. | Wenn Domenic will: Zusatz streichen (Primärtexte in den 6 `creative.json`, Satz in `bedingungen()`). |
| A5/B4 | Streichpreis | entfällt | Kein „statt“-Preis, keine 30-Tage-Angabe nötig. | – |
| A6 | „geschenkt“/„gratis“ | ok | Nicht verwendet (bewusst kein „+50 € geschenkt“, Domenic). | – |
| A9 | Google „5,0 · 372 Bewertungen“ | Risiko (gering) | § 5 Abs. 1 UWG / Anhang Nr. 23b: Zahl mit Stand 15.11.2026 angegeben, aber 10 Tage alt; Bewertungsauszüge (Zitate) gibt es auf der Chic-Seite bewusst nicht. | Vor dem Live-Gang Google-Profil ansehen, `google.stand/anzahl` in `_lib/gutschein-shop.mjs` aktualisieren, Seiten neu erzeugen. In den Anzeigen steht keine Bewertungszahl. |
| A2 | Wesentliche Informationen | ok | Verkäufer (Impressum), Endpreise inkl. USt, Gültigkeit, 1 pro Person, Teil-Einlösung, Widerruf auf Seite, in der Kasse und in der Mail (§ 5a, § 5b UWG). | – |
| B1/B2 | Gesamtpreis, Versand | ok | § 3, § 6 PAngV – https://www.gesetze-im-internet.de/pangv_2022/__3.html: „Endpreis, keine weiteren Kosten“ im Kauf-Fenster, Bedingungen „inkl. USt, keine Versandkosten“. | – |
| E1–E6 | Impressum | ok | § 5 DDG – https://www.gesetze-im-internet.de/ddg/__5.html: Chic Tattoo & Piercing, Inhaber Christoph Weiße, Ulmer Straße 14, 86154 Augsburg, E-Mail + Telefon (gleich wie Impressum der live laufenden Chic-Rubbellos-Seite). Keine USt-IdNr. bekannt. | Christoph bestätigt Rechtsform/USt-IdNr. |
| F6 | Gutschein-Bedingungen | ok | Gültigkeit, Teil-Einlösung, keine Barauszahlung, nicht kombinierbar, 1 pro Person stehen vor dem Kauf (Bedingungsseite, Kauf-Fenster). | – |
| G3/G5 | Gezeigte Tattoos (Löwe, Rabe, Rosen, Sleeve, Schildkröte, Herz) | Risiko (gering) | § 22 KunstUrhG: keine Gesichter, nur Haut; Bilder stammen vom Studio-Instagram (Studio ist Urheber). Einwilligung der tätowierten Kunden für Werbung ist nicht belegt (offen seit 15.11.). Keine Narben-/Bauch-Rosen-Bilder. | Christoph kurz bestätigen lassen, dass er die Bilder für Werbung nutzen darf. |
| G4 | KI | entfällt | Keine KI-Bilder, keine KI-Personen, keine Stimme; Musik CC0 (freesound 620197). | – |
| H1–H4 | Meta-Pixel ohne Einwilligung | **Verstoß** | § 25 Abs. 1 TDDDG – https://www.gesetze-im-internet.de/ttdsg/__25.html: Pixel lädt auf tattoofin.de beim Aufruf (nicht im Entwurf). Domenics Entscheidung [D3] wie MU/LA; Datenschutzseite nennt Pixel und Widerspruch. Schriften lokal, Umami ohne Cookies. | Nur mit Domenics bewusster Entscheidung live (wie MU/LA). Lösung wäre ein Einwilligungsfenster vor dem Pixel. |
| I1 | Bezahl-Knopf | ok | § 312j Abs. 3 BGB: Stripe-Knopf „Bezahlen“ mit Satz „… zahlungspflichtig …“ darüber (unverändert aus MU/LA). | – |
| I3 | Widerruf | ok | Belehrung + Muster auf Seite und in der Kauf-Mail (§ 312g, § 356 BGB). | – |
| J | Tattoo | ok | Keine Heilversprechen, keine Gewinnchance. | – |

## 3. Restrisiken in einfacher Sprache
Das Meta-Pixel ohne Einwilligung ist der einzige echte Verstoß; ein Mitbewerber oder Verband könnte das abmahnen, die Datenschutzbehörde könnte es beanstanden. Das gilt genauso für die laufenden Seiten in München und Landshut. „Solange der Vorrat reicht“ bei einem unbegrenzten Gutschein kann als Andeutung einer falschen Knappheit gelesen werden; es steht nur klein, das Risiko ist gering, es verschwindet ganz, wenn der Zusatz gestrichen wird. Die Google-Zahl muss vor dem Start frisch sein. Für die gezeigten Tattoos fehlt die schriftliche Bestätigung des Studios bzw. der Kunden. Gesetzesstand: Normen am 31.10.2026 zuletzt gegen gesetze-im-internet.de abgeglichen.

## 4. Belege
Geprüfte Fassung: Branch `claude/chic-gutschein-shop` (marketing-media), Branch `claude/chic-gutschein-kampagne` (Marketing-Maschine), Kontaktbögen in diesem Ordner. Stufen/Frist/Gültigkeit: Domenic 25.11.2026 (Übergabe CHIC-GUTSCHEIN-UEBERGABE.md), Ende 16 Uhr: Ultron 25.11.
