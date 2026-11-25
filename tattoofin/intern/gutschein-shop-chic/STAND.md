# STAND Gutschein-Shop Chic Tattoo Augsburg (25.11.2026)

**Ziel:** Weihnachts-Gutscheine Chic: 100→150, 200→280, 400→500, 800→1.000 €, Wertgutschein ab 50 €, unbegrenzt, bis 24.12.2026 16 Uhr, voller Wert bis 31.03.2027, danach Kaufpreis bis 31.12.2029, online + im Studio, zwei Wege „Geschenk gesucht?“ / „Gönn dir selbst was“.

**Erledigt (nur Entwurf, nichts live):**
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
5. `provisionFreiBis` setzen (oben). 6. Kampagne anlegen (pausiert), Budget-Konflikt klären (Chic max. 20 €/Tag gesamt, Rubbellos läuft mit 20 €/Tag).
