# STAND Gutschein-Shop TF München + Landshut (24.11.2026, nachts)

**Ziel:** Viele Weihnachtsgutscheine verkaufen. Shop-Seite je Stadt (München, Landshut) + Meta-Werbematerial. Nichts live ohne Domenics OK, nichts an Meta ändern.

**Live (alt):** München erste Fassung seit 23.11. (Deploy `6b048ffb`, danach `6b049c12` vom Haupt-Chat). Landshut ist noch nicht live.

**Entwurf (nicht live), Branch `claude/tfm-gutschein-shop-live` (Arbeitskopie `~/mm-tfm-design`):**
- https://tfm-gutschein-design--tattoofin.netlify.app/gutschein-kaufen/tattoo-fashion-munich
- https://tfm-gutschein-design--tattoofin.netlify.app/gutschein-kaufen/tattoo-fashion-landshut
- Läuft mit echtem Stripe und echten Daten: dort NIE eine Kasse öffnen.
- Korrektur Runde 1 erledigt (54 Befunde, siehe BERICHT.md oben): Angebot als Überschrift, Geschenk-Grafik mit Schleife und Tannenzweigen, neue WhatsApp-Vorschau, Fehler immer sichtbar, Zurück aus der Kasse gibt sofort frei, iPhone-Tastatur, Zustand nach Aktionsende, echtes PDF-Muster, 6 saubere Bilder je Studio, scharfe Logos und Symbole.
- Seiten und Bilder: `node dev/gutschein-seiten.mjs [--og] [--vorschau <ordner>] [--basis <url>]` (eingecheckt wird ohne `--basis`). `--og` braucht macOS (Quick Look für das PDF-Muster).
- Tests: `dev/gutschein-shop-test.mjs` 135/0, `dev/e2e.mjs` 410/0 (eigene Ports E2E_PORT, STRIPE_MOCK_PORT, E2E_RESEND_PORT; e2e wartet unter Last bis 4 Min. je Schritt). Abnahme beider Entwurfs-Adressen mit `--soll "500 €;375 €;200 €;300 €"` bestanden.

**Offen (Domenic / Andy)**
- Live-OK für den Prod-Deploy (danach Landshut sofort offen). Vorher neuesten Haupt-Chat-Stand einmischen.
- Termine bis 31.03.2027: Kann das Studio das zusagen? Die FAQ verspricht keine Termine, sie erklärt nur die Regel (Eingelöstes zählt zuerst gegen den geschenkten Teil).
- 2–3 echte Google-Bewertungen wörtlich zeigen? Nur mit OK.
- Reihenfolge der Liste: bleibt 2.000 € zuerst (Anker) oder 300 €/500 € zuerst?
- Einmal am echten iPhone den Kauf bis „Weiter zur Zahlung“ mit offener Tastatur ansehen (Simulator war ohne Freigabe nicht nutzbar).
- Nach dem Live-Gang: beide Adressen in einem frischen WhatsApp-Chat testen; die Landshut-Adresse vorher nirgends teilen (sonst alte Vorschau im Speicher, dann mit `?v=2` verlinken). Facebook-Debugger einmal neu laden lassen.

**Dateien:** `dev/gutschein/{seite,og,geschenk,recht,whatsapp}.html`, `dev/gutschein-seiten.mjs`, `netlify/functions/_lib/gutschein-shop.mjs`, `netlify/functions/gutschein-shop.mjs`, `netlify/functions/_lib/gutschein.mjs` (PDF), `public/gutschein-kaufen/`, `public/assets/gs-shop/{tfm,tfla}/`, `dev/gutschein-shop-test.mjs`, `dev/e2e.mjs`.
