# Tattoofin – Übergabe (Stand 11.10.2026)

Für eine neue Claude-Sitzung auf dem Mac: Diese Datei zuerst lesen. Sie fasst zusammen, was steht und was offen ist.

## Repos
- **marketing-media** (dieses Repo), Branch `claude/telefon-sales-materials-studios-hy0qbf`
  - `tattoofin/website/` – tattoofin.de (Netlify-Projekt „tattoofin“, ID `dd784ec7-3a7e-4122-a8a3-87087ef7be7a`)
  - `tattoofin/social/instagram/` – Instagram-Inhalte, Werbemittel, Verkaufs-Spot (`spot.html`, `tools/render-spot.mjs`)
  - `tattoofin/creatives/2026-10-10/` – Werbemittel (c1–c10, p1–p3, spot)
  - Branch `main` wird von der Marketing-Maschine überschrieben (GitHub Pages für Medien) – dort nicht arbeiten.
- **marketing-maschine**, Branch `main` – postet automatisch auf Instagram, Marke `brands/tattoofin/`

## Erledigt
- Website live inkl. Abschluss (3 Schritte), Studio-Portal, Zahlseite, Stripe-Webhooks, Meta-Pixel mit Cookie-Einwilligung, WhatsApp 0162 4502375
- E-Mail-Versand über IONOS (info@tattoofin.de), getestet
- Instagram @tattoofin.de: Start-Serie + Highlights gepostet, Beiträge bis 31.10. eingeplant
- Werbekonto: GastroSite-Konto `act_1413035176547860`, Pixel „Tattoofin“ `1628016302128524`, FB-Seite `283758159169423`
- Werbemittel + Verkaufs-Spot (Higgsfield-Szenen, Sprecher) – Auswahl: https://domenicschilling.github.io/marketing-media/tattoofin/creatives/

## Offen (in dieser Reihenfolge)
1. **Stripe Connect aktivieren** im Stripe-Konto „DSX Media Solutions UG“ (dashboard.stripe.com/connect): Plattform, Kontotypen Express + Standard, Klarna für verbundene Konten. Branding nur unter Einstellungen → Connect ändern (Konto wird auch von GastroSite genutzt). Danach komplette Test-Anmeldung auf tattoofin.de/start.html.
2. **Business Manager (DSX)**: Seite „Tattoofin“ und @tattoofin.de als Assets hinzufügen und dem Werbekonto zuweisen.
3. **Netlify**: `ADMIN_TOKEN` setzen (Passwort für den Admin-Bereich).
4. **Kampagnen** pausiert anlegen (Workflow `ads-campaign.yml` in der Maschine): A = Sonderkategorie Finanzen (spot, p1, p3, 10 €/Tag), B = normal (p2, 5 €/Tag).
5. Testeintrag von der Probe-Anmeldung am 11.10. im Admin löschen.

## Wichtig
- Raten immer mit Sternchen und Fußnote: „*Ratenzahlung über externe Anbieter wie Klarna, nach deren Prüfung. Tattoofin ist kein Kreditgeber. Achtung! Kreditaufnahme kostet Geld.“
- Nie „voller Betrag“ (Provision 10 %), sondern „dein Geld auf einmal“. Nie „Geld sofort“ oder „keine Zahlungsausfälle“ pauschal.
- Secrets liegen nur in Netlify bzw. GitHub-Secrets der Maschine, nie im Repo.
- Deploy der Website: im Ordner `tattoofin/website` per Netlify (CLI `netlify deploy --prod` oder Netlify-MCP).
