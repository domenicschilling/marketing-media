# STAND Gutschein-Shop Chic Tattoo Augsburg (27.11.2026)

**Ziel:** Weihnachts-Gutscheine Chic: 100→150, 200→280, 400→500, 800→1.000 €, Wertgutschein ab 50 €, unbegrenzt, bis 24.12.2026 16 Uhr, voller Wert bis 31.03.2027, danach Kaufpreis bis 31.12.2029, online + im Studio, zwei Wege „Geschenk gesucht?“ / „Gönn dir selbst was“.

**27.11.2026 (Domenic über Ultron):** Chic-Seite DUNKEL neu (Seite, Kauf-Fenster, Rechtsseiten, Vorschaubild, Stripe-Kasse Schwarz/Rot; PDF war schon dunkel, Mail-Kopf schwarz mit rotem Knopf). Keine Grenze „1 pro Person“ mehr für MU, LA und Chic (`aktionJeKaeufer: null`; Seite, Kauf-Fenster, Bedingungen, Mail ohne „pro Person“; FAQ „Kann ich mehrere Gutscheine kaufen? Ja …“). „Solange der Vorrat reicht“ bleibt (Domenic). Budget Chic-Gutschein 10 €/Tag zusätzlich zu Rubbellos 20 €/Tag freigegeben.
Entwurf neu: Deploy 6b0951abdef689f8f710b33c (Alias chic-gutschein). Abnahme Chic/MU/LA auf dem Entwurf + Ordner-Abnahme public: BESTANDEN. Tests: Chic 32/0, MU/LA 223/0.
Bildschirmfotos: `chic-dunkel-handy.png`, `chic-dunkel-desktop.png`, `kasse-mu-la-handy.png`, `kontaktbogen-seite.jpg`.
**27.11.2026 nachmittags (Ultron-Prüfung):** Galerie lädt jetzt sicher (Bilder ohne loading=lazy; Chromium + WebKit, Handy + Desktop: 12/12 naturalWidth > 0). Desktop-Hero als 50/50-Raster (links Karte, Countdown, Knopf bündig; rechts Foto über die ganze Höhe). Löwen-Foto mit beruhigtem Hintergrund (Blau entsättigt und abgedunkelt, Tattoo unverändert) auf Seite, Vorschaubild, Galerie und Anzeigen. Google 5,0 · 372 am 27.11.2026 im Maps-Profil geprüft, Stand aktualisiert. Entwurf: Deploy 6b095368ad7356f06b434735. Bildschirmfotos: `chic-dunkel-handy(-ganz)`, `chic-dunkel-desktop(-ganz)`.

**Laufende MU/LA-Anzeigen (nicht geändert):** Primärtext 1 (geht live) enthält „Ein Aktions-Gutschein pro Person.“ in 11 von 12 Anzeigen (MU 01–06, LA 01, 02, 03, 05, 06; nicht LA 04); die MU-Bilder haben unten klein „1 Aktions-Gutschein pro Person“ (`_quelle/motive.mjs` Z. 59, KLEIN). Nach dem Live-Gang ohne Grenze sind diese Sätze falsch einschränkend (kein Werberechtsverstoß, aber ungenau) → Ultron entscheidet über Textwechsel.

**Erledigt 25.11. (nur Entwurf, nichts live):**
- Branch `claude/chic-gutschein-shop` (marketing-media, Basis f8a7b3b = Live-Stand). Chic-Eintrag in `tattoofin/website/netlify/functions/_lib/gutschein-shop.mjs` (Studio st_0yyvqSMyCfUr), eigene Vorlagen `dev/gutschein/chic/` (Seite, Rechtsseiten, Vorschaubild, PDF-Grund, Symbol), Generator kann je Studio eigene Vorlagen (`--og --nur <slug>` rendert nur dieses Studio). MU/LA-Seiten unverändert (Byte-Vergleich), TF-Test 223/0.
- PDF-/Kassen-Farben je Marke (`marke.pdf`, `marke.kasse`), Route `/gutschein-kaufen/chic-tattoo-augsburg` in `gutschein-seite.mjs`.
- Neu: `provisionFreiBis` (Tattoofin gratis bis Datum) in `_lib/config.mjs` + Admin-PATCH.
- Tests: `dev/gutschein-chic-test.mjs` 31/0, `dev/gutschein-shop-test.mjs` 223/0. Lokale Vorschau: `node dev/gutschein-vorschau-lokal.mjs 8996`.
- Entwurf: https://chic-gutschein--tattoofin.netlify.app/gutschein-kaufen/chic-tattoo-augsburg (Deploy 6b064bceed6fdb20ffad3152). ACHTUNG echtes Stripe: dort nie bezahlen, nur GET.
- Abnahme Entwurf: BESTANDEN (12 Geräte, axe, Beträge). Kontaktbogen `kontaktbogen-seite.jpg`, Werberecht `WERBERECHT-CHECK-2026-11-25.md`.
- Anzeigen + Plan: Marketing-Maschine Branch `claude/chic-gutschein-kampagne`.

**Chic in Tattoofin (nur lesend geprüft 25.11.):** Studio st_0yyvqSMyCfUr, Slug chic-tattoo-augsburg, Paket Risikofrei (10 % Provision je Zahlung, Destination Charge), Stripe acct_1USGZY0O569qR7tG charges+payouts an, keine Anforderungen offen, Klarna aus, kein Abo (Upgrade-Angebot 29 € nicht angenommen).

**„Tattoofin gratis bis 31.12.2026“ setzen (Ultron, nach Prod-Deploy dieses Branches):**
`PATCH https://tattoofin.de/api/admin/studio/st_0yyvqSMyCfUr` mit Admin-Anmeldung, Body `{"provisionFreiBis":"2026-12-31"}` → Provision 0 % für alle Kassen bis 31.12.2026 23:59 (Gutscheine und Anzahlungen). Zurück: `{"provisionFreiBis":""}`. Folge: Bei 0 % trägt DSX die Stripe-Gebühren der Chic-Zahlungen (Plattform zahlt Gebühren, Express-Konto, „fees payer: application“), ca. 1,5 % + 0,25 € je Kartenzahlung.

**Offen / Live-Gang (nur mit Domenics OK über Ultron):**
1. Kontaktbögen an Domenic, Freigabe Design + Anzeigen.
2. Google-Zahl (5,0 · 372, Stand 15.11.) frisch prüfen, ggf. in SHOPS ändern, `node dev/gutschein-seiten.mjs`.
3. Christoph bestätigt Impressum-Daten (USt-IdNr.?) und Bildnutzung.
4. Ordner-Abnahme `npm run abnahme -- <worktree>/tattoofin/website/public`, dann Prod-Deploy dieses Branches (enthält f8a7b3b + Chic). Danach Sharing-Debugger für die Chic-URL.
5. `provisionFreiBis` setzen (oben). 6. Kampagne erst nach Domenics Blick auf Design + Anzeigen anlegen (Budget 10 €/Tag freigegeben).
