# STAND Gutschein-Shop TF München + Landshut (23.11.2026, spätabends)

**Ziel:** Viele Weihnachtsgutscheine verkaufen. Shop-Seite je Stadt (München, Landshut) + Meta-Werbematerial. Nichts live ohne Domenics OK, nichts an Meta ändern.

**Live (alt):** München erste Fassung seit 23.11. (Deploy `6b048ffb`, danach `6b049c12` vom Haupt-Chat). Landshut ist noch nicht live.

**Fertig auf Branch `claude/tfm-gutschein-shop-live` (Arbeitskopie `~/mm-tfm-design`), Entwurf (nicht live):**
- https://tfm-gutschein-design--tattoofin.netlify.app/gutschein-kaufen/tattoo-fashion-munich
- https://tfm-gutschein-design--tattoofin.netlify.app/gutschein-kaufen/tattoo-fashion-landshut
- Entwurf läuft mit echtem Stripe und echten Daten: dort NIE eine Kasse öffnen.
- Kauf in 2 Schritten (Gutschein → Name + E-Mail → Stripe), kein Häkchen, Stripe ohne Pflicht-Adresse/Telefon. Rechtstexte nur über Fuß-Links (eigene Seiten je Stadt), Gutschein-Mail unverändert mit Bedingungen + Widerruf.
- Seiten je Stadt statisch aus `dev/gutschein/seite.html` + `SHOPS[…].seite` (`netlify/functions/_lib/gutschein-shop.mjs`): `node dev/gutschein-seiten.mjs --og` (Vorschaubilder neu), `--vorschau <ordner>` (WhatsApp-Nachbau als PNG), `--basis <url>` nur für den Entwurf (danach ohne neu erzeugen, eingecheckt wird tattoofin.de).
- Vorschaubild je Stadt `public/assets/gs-shop/<tfm|tfla>/og-weihnachten.jpg`, Mitte als Quadrat lesbar.
- Tests: `dev/gutschein-shop-test.mjs` 109/0, `dev/e2e.mjs` 410/0 (eigene Ports setzen: E2E_PORT, STRIPE_MOCK_PORT, E2E_RESEND_PORT). Abnahme beider Entwurfs-Adressen mit `--soll "500 €"` bestanden (12/12 Geräte).

**Entscheidungen Domenic**
- Angebot je Stadt gleich: Nr. 1–5 (2000/1500×1, 1500/1250×2, 1000/750×2, 500/375×6, 300/200×10) + Wertgutschein 50–2.000 €. Voller Wert bis 31.03.2027, danach bezahlter Betrag bis 31.12.2029. Aktion bis 24.12.2026 16 Uhr. 1 Aktions-Gutschein pro Person (je Studio). Teil-Einlösung ja, keine Barauszahlung, nicht kombinierbar, inkl. Piercing.
- Verkäufer: Tattoo Fashion Munich bzw. Landshut, Inhaber Andy Neelsen.
- Design = TF-Glücksrad-Look, Weihnachts-Aktion, Logo statt Tattoo-Fotos im Hero. Pixel ohne Einwilligungsfenster (nur tattoofin.de).

**Offen (Domenic)**
- Live-OK für den Prod-Deploy (danach Landshut sofort offen, `freigegeben: true`). Vor dem Prod-Deploy den neuesten Haupt-Chat-Stand einmischen.
- Nach dem Live-Gang: Vorschau einmal mit dem Facebook-Debugger neu laden lassen (nur Abruf, keine Änderung an Werbekonten).
- Anzeigen erst nach Creative-OK + Budget. iPhone-App-Update (Wert/Rest/Teil-Einlösung).

**Dateien:** `netlify/functions/_lib/gutschein-shop.mjs`, `netlify/functions/gutschein-shop.mjs`, `netlify/functions/_lib/domain.mjs` (Kasse), `dev/gutschein-seiten.mjs`, `dev/gutschein/*.html`, `public/gutschein-kaufen/`, `public/assets/gs-shop/{schrift,tfm,tfla}/`, `dev/gutschein-shop-test.mjs`, `netlify.toml`, `dev/server.mjs`. Bericht: `BERICHT.md`.
