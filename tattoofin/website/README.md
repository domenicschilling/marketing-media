# Tattoofin: Website mit Online-Abschluss, Stripe Connect und Studio-Portal

Statische Seiten (`public/`) + Netlify Functions (`netlify/functions/`) + Netlify Blobs als Datenspeicher.
Keine Build-Schritte, kein Framework.

## Was die Website kann

| Bereich | Funktion |
|---|---|
| `/` | Landingpage mit Rechner „Kauf oder Provision?“, FAQ, Video |
| `/start.html` | Online-Abschluss in 4 Schritten: Modell → Studio-Daten → Vertrag + AVV akzeptieren → Zahlung bzw. Stripe-Konto |
| Kauf | Setup 1.499 € netto (mit Aktionscode 1.249 €), sofort per Stripe Checkout oder auf Rechnung (Stripe Invoice, 14 Tage). Keine Provision. |
| Provision | 0 € Einrichtung. Bei jeder Kundenzahlung werden 10 % + USt. automatisch als Plattformgebühr (Stripe Connect `application_fee_amount`) einbehalten. Monatlich Rechnung + Übersicht. |
| Stripe Connect | Jedes Studio bekommt ein **eigenes Stripe-Konto (Typ Standard)**, das ihm gehört. Onboarding über Stripe-Account-Links (`/api/connect`). |
| `/portal.html` | Login per Magic Link. Zahlungslink erstellen (mit WhatsApp-Button + QR), alle Zahlungen, Abrechnungen, eigene Zahlseite + QR, Studio Kit, Fragebogen, Kündigung/Rücknahme, Garantie, Tattoofin-Rechnungen |
| `/zahlung.html?z=…` | Seite für den Endkunden zu einem Zahlungslink → Stripe Checkout auf dem Konto des Studios (Karte, Klarna/Raten nach Freigabe, SEPA …) |
| `/zahlen.html?s=<studio>` | Zahlseite des Studios (Ziel des QR-Codes auf Aufklebern/Flyern): Kunde trägt den abgesprochenen Betrag ein |
| `/admin.html` | Studios, Stripe-Status, Umsätze, Provision, Live schalten, Login-Link, Garantie-Erstattung, Monatsabrechnung (Probe/echt), E-Mail-Protokoll |
| Monatlich (1., 06:00 UTC) | Provisionsrechnung des Vormonats (in Stripe als bereits bezahlt markiert, da schon einbehalten) + E-Mail-Übersicht |
| Täglich (07:00 UTC) | Erinnerung bei abgebrochenem Abschluss, Erinnerung „Stripe-Konto verbinden“ (nach 2 und 7 Tagen), Vertragsende |
| Erstattungen | Erstattet das Studio im eigenen Stripe-Dashboard, bucht Tattoofin die Provision automatisch anteilig zurück (`charge.refunded`) |

### Automatische E-Mails
Willkommen + Vertragsbestätigung (mit Login- und Stripe-Link) · Zahlung erhalten (Setup) · Rechnung (Setup auf Rechnung) · Erinnerung Stripe-Konto ·
Stripe-Konto freigegeben · Login-Link · Fragebogen erhalten · Tattoofin ist live · Zahlung eingegangen (an Studio) · Zahlungsbestätigung (an Endkunde) ·
Monatsabrechnung · Zahlung fehlgeschlagen · Kündigung bestätigt · Kündigung zurückgenommen · Vertragsende in 7 Tagen · Vertrag beendet ·
Garantie-Erstattung · Abschluss abgebrochen · interne Meldungen an `ADMIN_EMAIL`. Texte: `netlify/functions/_lib/emails.mjs`.

## Einrichtung auf Netlify

1. Neues Netlify-Projekt aus diesem Repo, **Base directory: `tattoofin/website`** (Publish `public`, Functions `netlify/functions` stehen in `netlify.toml`).
2. Umgebungsvariablen:

| Variable | Wert |
|---|---|
| `SITE_URL` | z. B. `https://start.tattoofin.de` |
| `STRIPE_SECRET_KEY` | Plattform-Schlüssel `sk_live_…` (Test: `sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | Secret des Endpoints „Ihr Konto“ |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | Secret des Endpoints „Verbundene Konten“ |
| `SESSION_SECRET`, `ADMIN_TOKEN` | lange Zufallszeichenketten |
| `ADMIN_EMAIL`, `MAIL_FROM`, `MAIL_REPLY_TO` | interne Meldungen, Absender, Antwortadresse |
| `RESEND_API_KEY` **oder** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | E-Mail-Versand |
| `FIRMA_ADRESSE`, `FIRMA_REGISTER`, `FIRMA_USTID`, `GERICHTSSTAND`, `KONTAKT_EMAIL` | Firmendaten für Impressum, Vertrag, E-Mails |
| `VIDEO_URL`, `MATERIALS_URL` | Werbevideo, Basis-URL des Studio Kits (`…/tattoofin/kunden/`) |
| optional | `KAUF_NETTO_CENT` (149900), `AKTION_NETTO_CENT` (124900), `AKTION_CODE` (RATENJA), `AKTION_MAX` (20), `AKTION_BIS`, `PROVISION_PROZENT` (10), `GARANTIE_TAGE` (30), `MIN_BETRAG_CENT` (5000), `MAX_BETRAG_CENT` (2000000) |

3. **Stripe (Plattform-Konto von Tattoofin)**
   - Connect aktivieren (Einstellungen → Connect), Plattformprofil ausfüllen, Branding (Name, Logo, Farben) für Onboarding.
   - Zwei Webhook-Endpoints auf `https://<SITE_URL>/api/stripe-webhook`:
     „Ihr Konto“: `checkout.session.completed`, `checkout.session.expired`, `invoice.paid`, `invoice.payment_failed`;
     „Verbundene Konten“: `account.updated`, `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
     `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`.
   - Kundenportal aktivieren (für Tattoofin-Rechnungen an Studios), Rechnungs-E-Mails an Kunden einschalten.
   - **Vor dem Start prüfen:** ob Tattoo-Dienstleistungen bei Stripe und Klarna zulässig sind und Klarna für die Studio-Konten freigeschaltet wird
     (in jedem Studio-Konto unter Einstellungen → Zahlungsmethoden aktivieren).
4. Vertrag/AVV ändern: `tattoofin/studios/14-vertrag.html` bzw. `15-avv.html` bearbeiten, dann `node tattoofin/tools/sync-website-docs.mjs`.
   Bei inhaltlichen Änderungen `vertragVersion` in `_lib/config.mjs` hochzählen.

## Lokal testen

```
cd tattoofin/website
npm install
node dev/server.mjs     # http://localhost:8888 mit Stripe-Nachbau inkl. Connect (Admin-Token: admin)
node dev/e2e.mjs        # kompletter Durchlauf im Browser (43 Prüfungen)
```

Mit echtem Stripe-Testkonto: `STRIPE_SECRET_KEY=sk_test_… STRIPE_WEBHOOK_SECRET=whsec_… STRIPE_CONNECT_WEBHOOK_SECRET=whsec_… node dev/server.mjs`
und `stripe listen --forward-to localhost:8888/api/stripe-webhook --forward-connect-to localhost:8888/api/stripe-webhook`.
