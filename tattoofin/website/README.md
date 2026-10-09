# Ted am Telefon: Website mit Online-Abschluss, Stripe und Studio-Portal

Statische Seiten (`public/`) + Netlify Functions (`netlify/functions/`) + Netlify Blobs als Datenspeicher.
Keine Build-Schritte, kein Framework.

## Was die Website kann

| Bereich | Funktion |
|---|---|
| `/` | Landingpage mit Preisrechner (Kauf vs. Provision), FAQ, Demo-Nummer, Video |
| `/start.html` | Online-Abschluss in 4 Schritten: Modell → Studio-Daten → Vertrag + AVV akzeptieren → Stripe |
| Kauf | 1.499 € netto (mit Aktionscode 1.249 €), sofort per Stripe Checkout (Karte, SEPA …) oder auf Rechnung (Stripe Invoice, 14 Tage) |
| Provision | Stripe Checkout im Setup-Modus: SEPA-Lastschrift oder Karte wird hinterlegt, nichts abgebucht |
| `/portal.html` | Login per Magic Link. Anfragen von Ted, Termin + Preis eintragen, Abrechnungen, Materialien, Kündigung/Rücknahme, Garantie, Zahlungsmethode (Stripe-Kundenportal) |
| `/onboarding.html` | Online-Fragebogen |
| `/admin.html` | Studios, Details, Ted-Nummer/Agent-ID, Live schalten, Testanfrage, Login-Link, Garantie-Erstattung, Monatsabrechnung (Probe/echt), E-Mail-Protokoll |
| `/api/ted/anruf` | Post-Call-Webhook von ElevenLabs: legt Anfrage an, zählt Minuten, mailt das Studio, leitet optional an Make weiter (WhatsApp via Superchat) |
| Monatlich (4., 06:00 UTC) | Provision der Termine des Vormonats + Mehrminuten → Stripe-Rechnung, automatischer Einzug, E-Mail |
| Täglich (07:00 UTC) | Erinnerungen „Termine eintragen“, Erinnerung bei abgebrochenem Abschluss, Vertragsende (7 Tage vorher + Stichtag) |

### Automatische E-Mails
Willkommen + Vertragsbestätigung (mit Login-Link) · Zahlung erhalten · Rechnung (Kauf auf Rechnung) · Zahlungsmethode hinterlegt · Login-Link ·
Fragebogen erhalten · Ted ist live · Neue Anfrage (inkl. DRINGEND) · Erinnerung Termine eintragen · Monatsabrechnung · Zahlung fehlgeschlagen ·
Fair-Use-Hinweis · Kündigung bestätigt · Kündigung zurückgenommen · Vertragsende in 7 Tagen · Vertrag beendet · Garantie-Erstattung ·
Abschluss abgebrochen · interne Meldungen an `ADMIN_EMAIL` bei jedem wichtigen Ereignis. Texte: `netlify/functions/_lib/emails.mjs`.

## Einrichtung auf Netlify

1. Neues Netlify-Projekt aus diesem Repo, **Base directory: `telefon/website`** (Publish `public`, Functions `netlify/functions` stehen in `netlify.toml`).
2. Umgebungsvariablen setzen:

| Variable | Wert |
|---|---|
| `SITE_URL` | z. B. `https://ted.tattooleadz.de` |
| `STRIPE_SECRET_KEY` | `sk_live_…` (zum Testen `sk_test_…`) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` vom Webhook unten |
| `SESSION_SECRET` | lange Zufallszeichenkette |
| `ADMIN_TOKEN` | lange Zufallszeichenkette (Login für `/admin.html`) |
| `ADMIN_EMAIL` | Empfänger interner Meldungen |
| `MAIL_FROM` | z. B. `Ted am Telefon <info@dsxmediasolutions.de>` |
| `RESEND_API_KEY` **oder** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | E-Mail-Versand |
| `TED_WEBHOOK_SECRET` | Secret des ElevenLabs-Post-Call-Webhooks |
| `MAKE_WEBHOOK_URL` | optional: Weiterleitung jeder Anfrage an Make (WhatsApp über Superchat) |
| `FIRMA_ADRESSE`, `FIRMA_REGISTER`, `FIRMA_USTID`, `GERICHTSSTAND` | Firmendaten für Impressum, Vertrag, E-Mails |
| `DEMO_NUMMER`, `VIDEO_URL` | Demo-Nummer von Ted, Werbevideo (z. B. `/assets/werbevideo.mp4`) |
| optional | `KAUF_NETTO_CENT` (149900), `AKTION_NETTO_CENT` (124900), `AKTION_CODE` (TEDRUFT), `AKTION_MAX` (20), `AKTION_BIS` (2026-11-30), `PROVISION_PROZENT` (10), `FAIR_USE_MINUTEN` (500), `EXTRA_MINUTE_CENT` (15), `GARANTIE_TAGE` (30) |

3. **Stripe**: Webhook-Endpoint `https://<SITE_URL>/api/stripe-webhook` mit den Ereignissen
   `checkout.session.completed`, `checkout.session.expired`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`.
   Im Dashboard aktivieren: SEPA-Lastschrift, Kundenportal (Einstellungen → Billing → Kundenportal), Rechnungs-E-Mails an Kunden,
   Firmendaten auf Rechnungen. Steuersatz 19 % legt die Website beim ersten Verkauf selbst an.
4. **ElevenLabs**: im Agent unter Webhooks → Post-call die URL `https://<SITE_URL>/api/ted/anruf` und das Secret eintragen.
   Die Agent-ID beim Studio im Admin hinterlegen. Datenerfassungsfelder siehe `telefon/intern/04-umsetzung-onboarding.html`.
5. Vertrag/AVV ändern: in `telefon/studios/14-vertrag.html` bzw. `15-avv.html` bearbeiten, dann `node telefon/tools/sync-website-docs.mjs`.
   Bei inhaltlichen Änderungen `vertragVersion` in `_lib/config.mjs` hochzählen.

## Lokal testen

```
cd telefon/website
npm install
node dev/server.mjs            # http://localhost:8888 mit Stripe-Nachbau (Admin-Token: admin)
node dev/e2e.mjs               # kompletter Durchlauf im Browser (39 Prüfungen)
```

Mit echtem Stripe-Testkonto: `STRIPE_SECRET_KEY=sk_test_… STRIPE_WEBHOOK_SECRET=whsec_… node dev/server.mjs`
und Webhooks per `stripe listen --forward-to localhost:8888/api/stripe-webhook` weiterleiten.
