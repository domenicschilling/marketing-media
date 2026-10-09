# Tattoofin: Website mit Online-Abschluss, Stripe Connect und Studio-Portal

Statische Seiten (`public/`) + Netlify Functions (`netlify/functions/`) + Netlify Blobs als Datenspeicher.
Keine Build-Schritte, kein Framework.

## Was die Website kann

| Bereich | Funktion |
|---|---|
| `/` | Landingpage mit Rechner „Kauf oder Provision?“, FAQ, Video |
| `/start.html` | Online-Abschluss in 4 Schritten: Modell → Studio-Daten → Vertrag + AVV akzeptieren → Zahlung bzw. Stripe-Konto |
| Kauf | Setup 1.499 € netto (mit Aktionscode 1.249 €), sofort per Stripe Checkout oder auf Rechnung (Stripe Invoice, 14 Tage). Keine Provision. |
| Provision | 0 € Einrichtung. **10 % vom Zahlbetrag, alles inklusive** (Stripe-/Klarna-Gebühren und USt.). Tattoofin kassiert als Plattform (Destination Charge mit `transfer_data` + `on_behalf_of`, `application_fee_amount` = 10 %), Stripe überträgt 90 % auf das Express-Konto des Studios und zahlt automatisch aus. Beispiel: 3.000 € → 2.700 € an das Studio. Monatlich Rechnung (USt. inklusive ausgewiesen) + Übersicht. |
| Kauf | Studio bekommt ein **eigenes Stripe-Konto (Typ Standard)**, Zahlungen laufen direkt dort (Direct Charge), Gebühren zahlt das Studio. |
| Stripe Connect | Onboarding über Stripe-Account-Links (`/api/connect`). Provision: Konto-Typ `express` mit `card_payments`, `transfers`, `klarna_payments`. Kauf: Typ `standard`. |
| `/portal.html` | Login per Magic Link. Zahlungslink erstellen (Projektpreis oder Anzahlung, mit WhatsApp-Button + QR), alle Zahlungen mit „an dich“-Betrag, **Erstatten-Button** (Provision), Abrechnungen, Anzahlungsbedingungen, Auszahlungen (Express-Dashboard-Link), eigene Zahlseite + QR, Studio Kit, Fragebogen, Kündigung/Rücknahme, Garantie, Tattoofin-Rechnungen |
| `/zahlung.html?z=…` | Seite für den Endkunden zu einem Zahlungslink → Stripe Checkout (Karte, Apple/Google Pay, Klarna nach Freigabe). Bei Anzahlungen Pflicht-Häkchen für die Anzahlungsbedingungen |
| `/zahlen.html?s=<studio>` | Zahlseite des Studios (Ziel des QR-Codes auf Aufklebern/Flyern): Kunde trägt den abgesprochenen Betrag ein, optional „Das ist eine Anzahlung“ mit Bedingungen |
| `/admin.html` | Studios, Stripe-Status, Umsätze, Provision netto und Deckungsbeitrag nach Stripe-Gebühren, Live schalten, Login-Link, Garantie-Erstattung, Monatsabrechnung (Probe/echt), E-Mail-Protokoll |
| Monatlich (1., 06:00 UTC) | Provisionsrechnung des Vormonats (in Stripe als bereits bezahlt markiert, da schon einbehalten) + E-Mail-Übersicht |
| Täglich (07:00 UTC) | Erinnerung bei abgebrochenem Abschluss, Erinnerung „Stripe-Konto verbinden“ (nach 2 und 7 Tagen), Vertragsende |
| Erstattungen (Provision) | Nur über den Portal-Button: Refund mit `reverse_transfer` (Betrag vom Studio-Konto zurück). Webhook `charge.refunded` erstattet die Provision anteilig, abzüglich Stripe-Gebühr + USt. **Nie direkt im Tattoofin-Dashboard erstatten, ohne „Transfer zurückbuchen“ anzuhaken.** |
| Rückbuchungen (Provision) | `charge.dispute.created` → E-Mail an Studio (Belege an uns), `funds_withdrawn` → Rückholung beim Studio (Betrag − anteilige Provision + 20 €), `funds_reinstated` → Rücküberweisung, `closed`/lost → keine Provision. Belege reichen wir im Stripe-Dashboard ein. |
| Erstattungen / Rückbuchungen (Kauf) | Macht das Studio im eigenen Stripe-Dashboard; wir informieren nur per E-Mail. |
| Zahlarten | Standard `ZAHLARTEN=card,klarna` (Karte inkl. Apple/Google Pay, Klarna). SEPA bewusst nicht, wegen 8 Wochen Rückgaberecht ohne Grund |

### Automatische E-Mails
Willkommen + Vertragsbestätigung (mit Login- und Stripe-Link) · Zahlung erhalten (Setup) · Rechnung (Setup auf Rechnung) · Erinnerung Stripe-Konto ·
Stripe-Konto freigegeben · Login-Link · Fragebogen erhalten · Tattoofin ist live · Zahlung eingegangen (an Studio) · Zahlungsbestätigung (an Endkunde) ·
Monatsabrechnung · Zahlung fehlgeschlagen · Kündigung bestätigt · Kündigung zurückgenommen · Vertragsende in 7 Tagen · Vertrag beendet ·
Garantie-Erstattung · Abschluss abgebrochen · Rückbuchung (Belege) · Rückbuchung entschieden · Erstattung ausgelöst · interne Meldungen an `ADMIN_EMAIL`. Texte: `netlify/functions/_lib/emails.mjs`.

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
| optional | `RUECKLAST_GEBUEHR_CENT` (2000, wird bei Rückbuchungen mit zurückgeholt), `AUSZAHLUNG_TAGE` (leer; z. B. 7 = Auszahlung an Provisions-Studios erst nach 7 Tagen), `KAUF_NETTO_CENT` (149900), `AKTION_NETTO_CENT` (124900), `AKTION_CODE` (RATENJA), `AKTION_MAX` (20), `AKTION_BIS`, `PROVISION_PROZENT` (10), `GARANTIE_TAGE` (30), `MIN_BETRAG_CENT` (5000), `MAX_BETRAG_CENT` (2000000) |

3. **Stripe (Plattform-Konto von Tattoofin)**
   - Connect aktivieren (Einstellungen → Connect), Plattformprofil ausfüllen, Branding (Name, Logo, Farben) für Onboarding.
     Beide Kontotypen freischalten: **Express** (Provision, „Sie übernehmen die Preisgestaltung“: 2 €/aktives Konto/Monat + 0,25 % + 0,10 € je Auszahlung)
     und **Standard** (Kauf). Bei Express: Verlustverantwortung liegt bei der Plattform, Plattformprofil entsprechend ausfüllen.
     Klarna im Plattformkonto aktivieren (Zahlungsmethoden), `klarna_payments` wird beim Anlegen der Express-Konten angefragt.
   - Zwei Webhook-Endpoints auf `https://<SITE_URL>/api/stripe-webhook`:
     „Ihr Konto“: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`,
     `checkout.session.expired`, `invoice.paid`, `invoice.payment_failed`, `charge.refunded`, `charge.dispute.created`,
     `charge.dispute.funds_withdrawn`, `charge.dispute.funds_reinstated`, `charge.dispute.closed`;
     „Verbundene Konten“: `account.updated`, `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
     `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`, `charge.dispute.created`, `charge.dispute.closed`.
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
node dev/e2e.mjs        # kompletter Durchlauf im Browser (59 Prüfungen)
```

Mit echtem Stripe-Testkonto: `STRIPE_SECRET_KEY=sk_test_… STRIPE_WEBHOOK_SECRET=whsec_… STRIPE_CONNECT_WEBHOOK_SECRET=whsec_… node dev/server.mjs`
und `stripe listen --forward-to localhost:8888/api/stripe-webhook --forward-connect-to localhost:8888/api/stripe-webhook`.
