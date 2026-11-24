# STAND Gutschein-Shop TF München + Landshut (24.11.2026, nachts, nach Runde 3)

**Ziel:** Viele Weihnachtsgutscheine verkaufen. Shop-Seite je Stadt (München, Landshut) + Meta-Werbematerial. Nichts live ohne Domenics OK, nichts an Meta ändern.

**Live (alt):** München erste Fassung seit 23.11. (Deploy `6b048ffb`, danach `6b049c12` vom Haupt-Chat). Landshut ist noch nicht live.

**Entwurf (nicht live), Branch `claude/tfm-gutschein-shop-live` (Arbeitskopie `~/mm-tfm-design`):**
- https://tfm-gutschein-design--tattoofin.netlify.app/gutschein-kaufen/tattoo-fashion-munich
- https://tfm-gutschein-design--tattoofin.netlify.app/gutschein-kaufen/tattoo-fashion-landshut
- Läuft mit echtem Stripe und echten Daten: dort NIE eine Kasse öffnen.
- Korrektur Runde 3 erledigt (23 Befunde, siehe BERICHT.md oben): Seite kommt über die Funktion `gutschein-seite.mjs` (Vorschau, Titel und Hero aus dem echten Bestand, drei Fassungen angebot/neutral/danach), Mail an Domenic beim letzten 500er/300er, neue Vorschaubilder (Logo groß, Kartentext gemessen), Texte ohne „unter Wert“, PDF in Oswald/Inter ohne bezahlten Betrag, Kundenstimmen, Kauf-Fenster (Bonus-Zeile, vorgewählter 500er, Knopf einzeilig), neue Landshut-Bilder.
- Korrektur Runde 2 erledigt (25 Befunde, siehe BERICHT.md oben): Überschrift aus dem Bestand, PDF als Geschenkkarte, Zahlen klar, Abschnitte im Glücksrad-Look mit sparsamer Weihnacht, neue Landshut-Bilder, WhatsApp-Vorschau (Ü, Quadrat, neutrale Fassung), schnelleres Lesen der Stückzahl.
- Korrektur Runde 1 erledigt (54 Befunde): Angebot als Überschrift, Geschenk-Grafik mit Schleife und Tannenzweigen, neue WhatsApp-Vorschau, Fehler immer sichtbar, Zurück aus der Kasse gibt sofort frei, iPhone-Tastatur, Zustand nach Aktionsende, echtes PDF-Muster, 6 saubere Bilder je Studio, scharfe Logos und Symbole.
- Seiten und Bilder: `node dev/gutschein-seiten.mjs [--og] [--vorschau <ordner>] [--basis <url>] [--og-pruefen]` schreibt `netlify/functions/_lib/gutschein-seiten-html.mjs` (Seite je Stadt + Meta-Blöcke) und die Rechtsseiten (eingecheckt wird ohne `--basis`). `--og` braucht macOS (Quick Look für das PDF-Muster). Vorschau-Fassung wird NICHT mehr von Hand umgestellt.
- Tests: `dev/gutschein-shop-test.mjs` 173/0, `dev/e2e.mjs` siehe BERICHT (Runde 3) (eigene Ports E2E_PORT, STRIPE_MOCK_PORT, E2E_RESEND_PORT; e2e wartet unter Last bis 4 Min. je Schritt). Abnahme beider Entwurfs-Adressen mit `--soll "500 €;375 €;200 €;300 €"` bestanden.

**Offen (Domenic / Andy)**
- Live-OK für den Prod-Deploy (danach Landshut sofort offen). Vorher neuesten Haupt-Chat-Stand einmischen.
- **PayPal** über Stripe zuschalten? (Viele ältere Schenkende zahlen so; kein Ratenkauf.) Bei Ja: im Stripe-Konto beider Studios aktivieren, dann Texte „Karte, Apple Pay oder Google Pay“ an 4 Stellen ergänzen (FAQ, „So kaufst du“, Zeile unter dem Kauf-Knopf, Gutscheinbedingungen) und in `checkoutFuer` die Zahlart freigeben.
- **500er ausverkauft → Anzeige „500 € für 375 €“ sofort pausieren** (Mail „500er ausverkauft (Stadt) …“ kommt automatisch; Vorschau und Seite stellen sich selbst um). Ultron-Wache kann zusätzlich `/api/gutschein-shop?s=…` lesen (`ausverkauft`).
- **PDF ohne bezahlten Betrag?** Jetzt: „Voller Wert 500 € bis 31.03.2027 / Danach gilt der bezahlte Betrag bis 31.12.2029“ (ohne 375 €, Kauf-Mail nennt ihn). Soll der Betrag doch drauf: eine Zeile in `gutscheinPdf` (gutschein.mjs).
- **Andy: echte Preise** (Mindestpreis, kleines Motiv, Stundensatz) für die Frage „Was bekommt man für 300 €?“ – bis dahin ohne Zahlen.
- Termine bis 31.03.2027: Kann das Studio das zusagen? Die FAQ verspricht keine Termine, sie erklärt nur die Regel (Eingelöstes zählt zuerst gegen den geschenkten Teil).
- Reihenfolge der Liste: bleibt 2.000 € zuerst (Anker) oder 300 €/500 € zuerst?
- Einmal am echten iPhone den Kauf bis „Weiter zur Zahlung“ mit offener Tastatur ansehen (Simulator war ohne Freigabe nicht nutzbar).
- Nach dem Live-Gang: beide Adressen im Facebook-Sharing-Debugger neu abrufen lassen (München wurde schon mit der alten Vorschau geteilt, Facebook/Instagram halten sie sonst bis 30 Tage) und in WhatsApp mit frischem Link (z. B. `?utm_source=wa`) gegenprüfen.

**Dateien:** `dev/gutschein/{seite,og,geschenk,recht,whatsapp}.html`, `dev/gutschein-seiten.mjs`, `netlify/functions/gutschein-seite.mjs` + `_lib/gutschein-seite.mjs` + `_lib/gutschein-seiten-html.mjs` (erzeugt), `netlify/functions/_lib/gutschein-shop.mjs`, `netlify/functions/gutschein-shop.mjs`, `netlify/functions/_lib/gutschein.mjs` (PDF, Schriften `public/assets/gs-shop/schrift/*.ttf`), `public/gutschein-kaufen/` (Rechtsseiten), `public/assets/gs-shop/{tfm,tfla}/`, `dev/gutschein-shop-test.mjs`, `dev/e2e.mjs`.
