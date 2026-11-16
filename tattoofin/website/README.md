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
| `/z/<id>` | **Kurzlink zum Teilen** (seit 15.11.2026, `netlify/functions/teilen.mjs`): liefert WhatsApp/iMessage & Co. eine Vorschau-Karte (og:title „<Studio> · Betrag“, og:description, Bild `/z/<id>/bild.png` 1200 × 630, gezeichnet ohne Zusatz-Abhängigkeit in `_lib/leinwand.mjs` + `_lib/vorschaubild.mjs`) und leitet Menschen sofort auf `/zahlung.html?z=<id>` weiter. Kein Kundenname in der Vorschau; bezahlte/stornierte Links: neutrale Vorschau; unbekannte ID: 404. Teilen-Texte (`teilText` in `portal.mjs`) mit Zeilenumbrüchen und Kurzlink |
| `/zahlen.html?s=<studio>` | Zahlseite des Studios (Ziel des QR-Codes auf Aufklebern/Flyern): Kunde trägt den abgesprochenen Betrag ein, optional „Das ist eine Anzahlung“ mit Bedingungen |
| `/admin.html` | Admin-App „TF Admin“ (seit 15.11.2026 fürs iPhone, Homescreen: Manifest `admin.webmanifest`, Icons `assets/admin/`, Code `js/admin.js`, `css/admin.css`): **Übersicht** (zahlende Studios Web/Apple, in Einrichtung, abgebrochene Anmeldungen 14 Tage mit fehlgeschlagener Zahlung/3-D-Secure, Umsatz der Studios im Monat, unsere Einnahmen = bezahlte Stripe-Rechnungen der Tattoofin-Kunden minus Erstattungen im Monat + Abos laut Vertrag + Apple-Abos, Mail-Status; Apple-Probezeit zählt nicht als zahlend; Kachel → gleichnamiger Filter mit derselben Zahl, Test-Studios nur unter „Test“), **Studios** (Karten, Suche, Filter), **Detail** (Live schalten, Login-/Einrichtungslink, Dashboard ansehen, Stripe abgleichen, Branding, Erstattung, Zahlungen, Abrechnungen, „QR-Aufsteller (alt)“ nur bei Altdaten, Fragebogen, Mails), **Demo** (Demo-Studio Apple getrennt, „Beispieldaten erneuern“), **Mehr** (Monatsabrechnung, Jobs, Stripe-Abgleich, E-Mail-Protokoll). Daten: `GET /api/admin/uebersicht` (`_lib/admin-uebersicht.mjs`). Beispieldaten lokal: `node dev/admin-beispiel.mjs [screenshot-ordner]` |
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

## Portal v2 (Branch `claude/tattoofin-portal-v2`, Stand 18.10.2026 – nur Vorschau, nicht live)

| Bereich | Funktion |
|---|---|
| Pakete | `start` (0 € + 10 %), `studio` (299 € netto + 7 %, Gründer-Aktion: erste 10 ohne Einrichtung gegen Erfahrungsvideo), `profi` (= Kauf, 1.290 € netto, eigenes Konto, 0 %). `PAKETE` in `_lib/config.mjs`, Satz je Studio in `studio.provisionProzent`. Env: `STUDIO_NETTO_CENT`, `PROVISION_STUDIO_PROZENT`, `GRUENDER_MAX`, `KAUF_NETTO_CENT` |
| `/app.html` | Studio-Dashboard als Web-App (PWA: `manifest.webmanifest`, `sw.js`, `offline.html`, Icons `assets/app/`). Nach Abschluss/Einladung direkt eingeloggt (Session-Cookie aus `/api/signup`), Login-Links führen hierher |
| Stripe eingebettet | Connect Embedded Components (`/api/portal/stripe-session` → Account Session; `js/stripe-bausteine.js`): Einrichtung, Auszahlungen, Konto, Hinweise, im Tattoofin-Look. Braucht `STRIPE_PUBLISHABLE_KEY` (pk_…). Ohne pk: wie bisher Weiterleitung zu Stripe. Notschalter `TF_EINBETTEN=aus` |
| Zahlseite | `tattoofin.de/zahlen/<studio>` + `/zahlung.html?z=…` mit eingebettetem Payment Element (Destination Charge wie Checkout). Webhook zusätzlich: `payment_intent.succeeded`, `payment_intent.processing`, `payment_intent.payment_failed` (in beiden Stripe-Endpoints ergänzen!) |
| Absicherung | Vor dem Bezahlen: Häkchen „Inhalt stimmt“ (+ Anzahlungsbedingungen), gespeichert mit Zeit/IP. Nach dem Termin: Leistungsbestätigung `/bestaetigung.html?t=…` (Name, Datum, Unterschrift, optional Foto), Nachweis-PDF `/nachweis.html?z=…`. Entwurf, Rechtsprüfung offen |
| `/recht.html` | „Deine rechtliche Lage – einfach erklärt“ (Entwurf), Zustimmung mit Version/Zeitstempel (`CFG.rechtVersion`) |
| Extras | Anfrage-Knopf im Dashboard (`EXTRAS` in `portal.mjs`), keine Abrechnung |
| QR-Aufsteller | **Eingestellt** (Entscheidung Domenic 15.11.2026, live erst mit dem Deploy dieses Stands). Werbung zeigt nur noch die Zahlseite mit QR-Code („QR-Code speichern (PNG)“, `js/qr-bild.js`, Tipp: ausdrucken, als Aufkleber für die Theke). Gelöscht: `aufsteller.html`, `js/aufsteller.js`, Druckvorlage 22 (Thekenaufsteller), `tattoofin/qr-aufsteller/`. Glyphen für die Link-Vorschau heißen jetzt `assets/schrift-glyphen.json`. |
| Vorschau | Eigene Site `tattoofin-vorschau.netlify.app` (Env nur `TF_VORSCHAU=1`, `SITE_URL`): eigener Speicher, keine Mails, kein Tracking, Stripe-Simulation (`_lib/stripe-sim.mjs`, `/api/sim/*`), Steuerseite `/vorschau.html`. Bauen + veröffentlichen: `node dev/vorschau-deploy.mjs --deploy` |
| Tests | `NODE_PATH=… node dev/e2e.mjs [ordner] [handy-ordner]` – 100 Prüfungen inkl. Mandantentrennung, Zahlseite, Leistungsbestätigung, Handy-Screenshots |

## Stand 18.10.2026: drei Pakete, Portal v2 live, Sicherheit

| Thema | Kurz |
|---|---|
| Pakete | `risikofrei` (10 % inkl. Zahlungsgebühr, modell provision) · `monatlich` (seit 15.11.2026 49,90 € inkl. MwSt. = 4193 Cent netto + 19 % USt., ohne Gratiszeit, `MONAT_NETTO_CENT`; Bestandskunden behalten ihren Preis in `s.monatNetto`; Abo auf dem DSX-Konto, Stripe Billing, eigenes Standard-Konto, 0 %) · `einmal` (999 € netto, eigenes Standard-Konto, 0 %, Garantie 30 Tage, Nutzungszusage 5 Jahre). Alte Links `?modell=provision|kauf` funktionieren. Aktionscode RATENJA aus. Vertrag 2026-10c, alte Fassung `/vertrag-2026-10b.html`. |
| Deploy-Reihenfolge Aufsteller | Die iPhone-App 1.0 (1) zeigt Konto → „QR-Aufsteller“ und Werbung → „QR-Aufsteller aus Holz“ fest im App-Code (nur `istInhaber`). Nach diesem Stand antwortet der Server mit 410, die App zeigt dann ihre Fehleransicht „Das hat nicht geklappt“ mit dem freundlichen Text (kein Absturz, kein Abmelden). Darum: diesen Stand erst nach Apples Freigabe von 1.0 (1) live stellen und sofort 1.1 (Branch `claude/tattoofin-app-1-1-ohne-aufsteller`) einreichen, oder 1.0 aus der Prüfung zurückziehen und gleich 1.1 einreichen. Geht der Server vorher live, vorher in App Store Connect den Aufsteller-Absatz der Review-Notiz ersetzen. Erklärvideo „So geht's“ seit 16.11.2026 ohne Aufsteller (Kapitel Werbung neu, gleiche Länge und Kapitel, `?v=2026-11-16`). |
| QR-Aufsteller | entfallen: `POST /api/portal/aufsteller`, `/aufsteller-pruefen`, `GET /api/app/aufsteller` und `GET /api/aufsteller` antworten 410 `{ error, code: "aufsteller_entfallen" }` (Text in `_lib/werbung.mjs` `AUFSTELLER_ENTFALLEN`). Ausnahmen: `{ logo: null }` löscht ein altes Logo; ein vor dem 15.11.2026 begonnener Checkout wird noch verarbeitet (Webhook, Admin-Mail „QR-Aufsteller (alt) bezahlt – erstatten oder liefern“). Altdaten (`s.aufsteller`) zeigt der Admin als „QR-Aufsteller (alt)“, auch wenn nur ein Logo gespeichert ist; dort „Aufsteller-Logo löschen“ (`POST /api/admin/studio/:id/aufsteller-logo`). Der Tagesjob (`aufstellerLogosAufraeumen`) löscht jedes Logo ohne angeforderte/bezahlte Bestellung (`hatLogo:false`, `logoGeloeschtAm`, Protokoll `aufsteller-logo-geloescht`). |
| Eingebettete Einrichtung | mit `STRIPE_PUBLISHABLE_KEY` im Dashboard (`/app.html#einrichtung`); `TF_EINBETTEN=aus` = Notlösung Weiterleitung. |
| Bezahlfeld für Endkunden | nur mit `TF_BEZAHLFELD=an` UND den Webhook-Ereignissen `payment_intent.succeeded`, `payment_intent.processing`, `payment_intent.payment_failed` an beiden Endpoints. Sonst Stripe-Checkout (Standard). |
| Abo Monatlich | Kündigung im Portal = `cancel_at_period_end`. Empfohlen: Ereignis `customer.subscription.deleted` am Endpoint „Ihr Konto“. |
| Sicherheit | `/api/connect` nur mit Sitzung oder signiertem Link (24 h), `/api/signup?id=` ohne Sitzung nur Status, Login-Rate-Limit, E-Mail-Vergleich normalisiert (gmail = googlemail). |
| Admin | Login per E-Mail-Link oder 6-stelligem Code aus derselben Mail (`POST /api/admin-login/code`, 15 Min., einmal, max. 5 Versuche je Code und 10 falsche Codes je Adresse in 24 Std., danach nur noch der Link + Admin-Mail; für die Homescreen-App, die eigene Cookies hat) (`ADMIN_EMAILS`/`ADMIN_EMAIL`, 12 h Sitzung) oder `ADMIN_TOKEN`. „Dashboard ansehen“ = Studio-Dashboard nur lesend, protokolliert. |
| Mails | Vorübergehende Fehler (z. B. IONOS „450 Mail send limit exceeded“) → Warteschlange, `mail-nachsenden.mjs` alle 10 Min. Gleiche Admin-Meldung max. 1×/30 Min. |

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
| `VIDEO_URL`, `MATERIALS_URL` | Werbevideo; Basis-URL der Druckvorlagen. Standard seit 14.11.2026: `<SITE_URL>/druck/kunden/` (eigene Domain). Ein alter Wert mit `github.io` wird ignoriert (dort 404). |
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
node dev/e2e.mjs        # kompletter Durchlauf im Browser (156 Prüfungen)
```

Betriebs-Durchlauf (27.10.2026, `dev/betrieb.mjs`, ca. 170 Prüfungen, Protokoll mit Beweis je Schritt; konfiguriert wie live: Checkout statt Bezahlfeld, Karte + Klarna):
alle 3 Pakete im Browser mit offenem Cookie-Fenster, Connect-Einrichtung (eingebettet + Stripe-Seite), Login-Link, Zahlungslink, Karte/Klarna, Provision 10 %, Anzahlung/No-Show/Teil-Erstattung,
Klarna abgelehnt/nicht aktiviert, abgelaufene/stornierte Links, Webhook-Ausfall (Nachtragen per Rückkehr + Tagesjob), Dispute, Monatsrechnung, Abo-Ereignisse, QR-Aufsteller entfallen (410), Einladung, Admin, Anfrage-Formular, tägliche Jobs, Resend/Warteschlange, /api/status.
```
NODE_PATH=… node dev/betrieb.mjs [runde]     # oder: npm run test:betrieb;  PROTOKOLL=datei.md schreibt die Tabelle
```
Rückfälle, die dabei abgesichert sind: Klarna beim (Standard-)Studio-Konto nicht aktiviert → Kasse nur mit Karte + Admin-Hinweis; Stripe lehnt Bausteine ab → kleine Liste, sonst Stripe-Seite (`/api/connect?…&gehostet=1`);
Webhook fehlt → Status wird bei Rückkehr auf /bezahlt.html und in den Tagesjobs bei Stripe nachgesehen; Gesundheits-Check nimmt ein anderes Studio, falls das DSX-Teststudio fehlt (nicht löschen, aber nicht kritisch).

Mit echtem Stripe-Testkonto: `STRIPE_SECRET_KEY=sk_test_… STRIPE_WEBHOOK_SECRET=whsec_… STRIPE_CONNECT_WEBHOOK_SECRET=whsec_… node dev/server.mjs`
und `stripe listen --forward-to localhost:8888/api/stripe-webhook --forward-connect-to localhost:8888/api/stripe-webhook`.

## Stand 27.10.2026: Kreditrecht (Branch claude/tattoofin-recht)

| Thema | Kurz |
|---|---|
| Paket Risikofrei geschlossen (26.10.2026) | Für **neue** Anmeldungen gesperrt (Entscheidung Domenic): nicht mehr auf Start-, Studios-, Preis-, Ratgeber-Seiten und in `start.html`; `POST /api/signup` mit `paket=risikofrei` bzw. `modell=provision` antwortet 410 mit klarer Meldung (`paketNeuWaehlbar` in `_lib/config.mjs`), `/api/config` und `/api/signup?pakete=1` listen es nicht. Alte Links `?paket=risikofrei` führen auf die Paketwahl mit Hinweis. **Bestandsstudios laufen unverändert** (Dashboard, Zahlungslinks, Erstattungen, Rückbuchungen, Monatsrechnung, Klarna-Stichtag 20.11.). Notschalter/Test: `RISIKOFREI_NEU=1` öffnet die Anmeldung wieder (die Bestandsabläufe in `dev/betrieb.mjs` legen ihre Risikofrei-Studios damit an). Verträge/AVV/Datenschutz/Rechtsblatt bleiben unverändert (Bestandskunden), in `start.js` steht über dem Vertrag ein Hinweis. |
| Klarna-Stichtag | Ab **20.11.2026 00:00 Uhr deutscher Zeit** gibt es Klarna nicht mehr im Paket Risikofrei (Zahlung über das Plattformkonto). Monatlich/Einmalzahlung/Einladung (eigenes Stripe-Konto) behalten Klarna. Zentral in `_lib/config.mjs`: `KLARNA_PLATTFORM_BIS` (Standard `2026-11-20`; `nie` = aus), Logik `klarnaFuer()` in `_lib/domain.mjs`. Test-Zeit: `TF_JETZT=2026-11-20T00:00:00+01:00`. |
| Direct-Charge-Prototyp | `RISIKOFREI_DIRECT=1` (Standard AUS, **nicht aktivieren, bevor in Stripe-Test geprüft**): Risikofrei als Direct Charge auf dem Studio-Konto (Stripe-Account-Header, `application_fee_amount` 10 %). Dann bleibt Klarna auch nach dem Stichtag. Zahlung trägt `abwicklung: "direkt"`. |
| Warnhinweis | „Achtung! Kreditaufnahme kostet Geld.“ überall, wo mit Raten geworben wird. **Warnsatz klein (Fußnote, AA) direkt bei der einen Raten-Aussage im Hero, Entscheidung Domenic 14.11.2026**: gemeinsame Klasse `.raten-fn` (12–12,5 px, normal gesetzt, Kontrast ≥ 4,5) in `assets/start/style.css`, `css/site.css` und `raten.html`. Startseite und /studios haben genau eine Raten-Aussage (H1 + Herz im ersten Bildschirm), sonst „Klarna“ nur als Zahlart; in den Fragen 1–3 je eine kleine Zeile. Test: `dev/betrieb.mjs` Abschnitt 17g (vorhanden, ≥ 12 px, Kontrast, Startseite/Studios: Fußnote im Hero ≤ 560 px unter der Raten-Aussage, keine Raten*-Aussage außerhalb von Hero und Fragen; 390 px + 1440 px). |
| Startseite + /studios (Kurzfassung 14.11.2026) | Beide Seiten entstehen aus **einer** Vorlage: `python3 dev/startseite-bauen.py` (Texte, Fragen, JSON-LD) mit den Flash-Motiven aus `dev/vorlage/motive.html`. Aufbau: Hero („Ganzer Rücken? 4.000 € auf einmal.“ – Betrag am 16.11.2026 von 2.000 € auf 4.000 € angehoben, Domenic: für 2.000 € macht keiner einen ganzen Rücken; Klarna-Grenze DE laut Stripe-Doku bis 10.000 € je nach Option; echte Zahlseite `handy-kunde-oben.webp`, aufgenommen am lokalen Server mit 306 px Breite (bei 300 px bricht „4.000,00 €“ um), 600×545; die Zahlseite lässt die Ortszeile weg, wenn der Ort schon im Studionamen steht (wie `app-kit.js`), „▶ 10 Sek. ansehen“ = echte App-Aufnahme im Fenster, kein Autoplay), echter Fall 900 € per Klarna (`[data-beleg]`, Beleg `content/tattoofin/spots-2026-11/belege/fall-900-klarna-2026-11-07.md`), 4 Werkzeuge, 3 Schritte, Preis-Bon, 6 Fragen, Schluss. /studios zusätzlich: noindex, Start-Links mit `utm_source=studios&utm_medium=seite&utm_content=<ort>` (kommt der Besucher mit eigenen utm_*, ersetzen diese die Standardwerte komplett), Link für Endkunden nur im Fuß, Anfrage-Formular zugeklappt (`#anfrage`, Meta-Lead über `/api/anfrage`). Sichtbar wird vom **Team** gesprochen; Domenic nur in Pflichtangaben (Impressum, Datenschutz, Verträge/AVV). Hero-Herz heißt „KLARNA“ und führt zum 900-€-Fall (dort ist die Klarna-Art nicht belegt, darum nie „Raten“ daran). Preis-Beispiel = 4.000 € per Klarna (Stripe ab 2,99 % + 0,35 € = 119,95 € ≈ 120 €, bei dir ca. 3.880 €), Karte ab 1,5 % + 0,25 € = 60,25 € ≈ 60 €; Test `dev/betrieb.mjs` 17c rechnet das aus den Fragen nach. Tests auf freien Ports: `E2E_PORT`, `E2E_RESEND_PORT`, `BETRIEB_PORT`, `STRIPE_MOCK_PORT`. Lokales Video spielt in iOS-Safari nicht (dev/server.mjs kann keine Range-Anfragen), auf Netlify schon. Nicht verwenden: KI-Aufsteller-Bilder, 2-Minuten-Video (KI-Poster), `portal-zahlungen-schmal.webp`, iPhone-App. |
| Verträge | Neue Fassung `2026-11` (`/vertrag.html`), bisherige Fassung als `/vertrag-2026-10d.html` archiviert (nie rückwirkend ändern). Rechtsblatt `rechtVersion` 2026-11. |
| Nicht im Code | Instagram-Beiträge, Reels, `public/media/*.mp4` (Videos), gerenderte PDFs in `public/` und `tattoofin/pdf/` (z. B. `einrichtung-anleitung.pdf`) tragen ggf. noch den alten Hinweis und müssen aus den Quellen neu erzeugt werden. |

## Stand 13.11.2026: API für die Tattoofin-App (iPhone, Branch `claude/tattoofin-app`)

Die native App (`tattoofin/ios/`) spricht dieselben Funktionen an wie das Dashboard, angemeldet mit einem Gerätetoken
`Authorization: Bearer tfa_<geraetId>.<geheimnis>` statt Cookie. Plattformneutral (`platform: "ios" | "android"`), Android folgt später.

- `netlify/functions/app.mjs` (`/api/app/*`): Code per Mail anfordern und anmelden (6 Ziffern, 10 Min., 5 Versuche, Grenzen je Adresse und IP),
  Geräte, Mitteilungen (Push-Token), Auszahlungen + Saldo (Stripe `/v1/payouts`, `/v1/balance` am Studio-Konto), Team, Konto löschen (= Kündigung + Löschanfrage).
- Alle `/api/portal/*` gehen auch mit App-Token. Gesperrt mit App-Token (403 `nur_web`): stripe-session, rechnungen, umstellung, erstattung, extra. aufsteller und aufsteller-pruefen: seit 15.11.2026 immer 410 (eingestellt).
  Neu: `GET /api/portal/zahlung/:id[?abgleich=1]`, `GET /api/portal/gutschein-code?t=<token>` (QR auf Gutschein-PDF und gutschein.html).
- „Auf allen Geräten abmelden“ (Dashboard) meldet auch alle App-Geräte ab; entfernte Team-Adressen verlieren ihre App-Geräte sofort.
- Push (`_lib/push.mjs`): APNs HTTP/2 mit ES256-Token. **Echt-Versand wartet auf Apple-Team-ID und APNs-Schlüssel.** Ohne `APNS_KEY_P8` (oder `APNS_KEY_P8_BASE64`),
  `APNS_KEY_ID`, `APNS_TEAM_ID` (optional `APNS_BUNDLE_ID`, Standard `de.tattoofin.app`) wird nichts gesendet, nur `push-uebersprungen` protokolliert.
  Auslöser: Zahlung eingegangen / Gutschein verkauft, Stripe `payout.paid` und `payout.failed` (am Connect-Endpoint abonnieren; sonst holen die täglichen Jobs die letzten 48 Stunden nach).
- App-Prüfung bei Apple: Demo-Studio (`demo: true`, keine Mails, nicht bezahlbar, nicht in Jobs/Abrechnung/Kennzahlen). Nach dem Deploy mit Domenics OK:
  `POST /api/admin/app-demo { email }` (Admin-Token), dann `APP_REVIEW_EMAIL`, `APP_REVIEW_CODE` (6 Ziffern), `APP_REVIEW_STUDIO_ID` setzen.
  Zweiter Review-Zugang nur für „Konto anlegen“: `APP_REVIEW_REG_EMAIL` (gleicher Code, andere Adresse als `APP_REVIEW_EMAIL`). Führt immer zu
  einem frischen Entwurf, frühere Prüf-Studios dieser Adresse werden abgehängt (Adresse `review-alt-<id>@tattoofin.invalid`, bleiben für den Admin).

```
NODE_PATH=… node dev/app-api.mjs     # 285 Prüfungen der App-API inkl. Missbrauch und Apple-Abo, mit Stripe-, APNs- und Apple-Nachbau
NODE_PATH=… node dev/app-lokal.mjs   # lokaler Server für den Simulator: fester Code 123456 (nur localhost), Beispiel-Studios,
                                     # Mitteilungen über xcrun simctl push; App mit -TFApiBase http://localhost:8888 starten
node dev/app-demo.mjs [email]        # Demo-Studio lokal anlegen
```

## Stand 14.11.2026: Neues Studio in der App mit Apple-Abo (StoreKit 2, Branch `claude/tattoofin-app`)

Studios können sich direkt in der iPhone-App anmelden. Das Monats-Abo zahlen sie dort per **Apple-In-App-Kauf** (automatisch verlängerndes Abo,
Produkt `de.tattoofin.app.abo.monatlich`, Preis nur in App Store Connect). Die Web-Anmeldung (`/api/signup`, Stripe-Checkout) bleibt unverändert.
Das Stripe-Konto für das Geld der Kunden richtet das Studio danach wie gewohnt über `/api/connect` ein (kein Kauf).

- Endpunkte (Ein-/Ausgaben im Kopf von `netlify/functions/_lib/app-registrierung.mjs`): `POST /api/app/registrieren/code`, `…/registrieren/pruefen`,
  `…/registrieren`, `POST /api/app/abo/bestaetigen` (neu oder „Abo wieder abschließen“), `…/abo/wiederherstellen`, `…/abo/aktualisieren`.
- Server-Benachrichtigungen V2: `POST /api/apple/benachrichtigung` (`apple-benachrichtigung.mjs`). In App Store Connect als Production- UND
  Sandbox-URL `https://tattoofin.de/api/apple/benachrichtigung` (Version 2) eintragen.
- Prüfung der Apple-Signaturen (JWS) nur mit `node:crypto` gegen die fest eingebaute „Apple Root CA - G3“ (`_lib/apple.mjs`, Fingerabdruck im Kommentar).
- Studio: `paket: "app"` („Monatlich (App Store)“), `abrechnung: "apple"`, `s.apple = { status, laeuftBis, … }`. Nie in der Monatsabrechnung, keine
  Stripe-Rechnungsmails, Stripe-Ereignisse dazu nur als Admin-Mail. Abo abgelaufen/erstattet/widerrufen → Studio `beendet` (Kasse gesperrt, Daten bleiben),
  neues Abo öffnet wieder. Kündigung zum Ende des bezahlten Zeitraums; Mails sagen „zusätzlich in den Einstellungen deines Apple-Accounts kündigen“.
- Schutz gegen alte oder fremde Daten (Prüfung 14.11.2026): `abo/aktualisieren` (Abgleich aus der App) sperrt und öffnet nie und schiebt `laeuftBis`
  nur nach vorne; `abo/wiederherstellen` ändert am Studio nichts (außer ein nie bestätigter Entwurf mit gültigem Kauf wird aktiviert). Ablauf,
  Erstattung und Widerruf kommen nur über Apples Benachrichtigungen. Benachrichtigungen mit älterem `signedDate` als die zuletzt verarbeitete werden
  nur protokolliert; ein Sperr-Ereignis zu einer früheren Transaktion sperrt nicht, solange ein späterer Zeitraum läuft (Admin-Mail). Ein Studio mit
  echtem Abo (Production) lässt sich nicht durch einen Testkauf (Sandbox) ersetzen.
- **Testmodus nach Testkauf** (Sandbox, TestFlight, App Review; `config.sandboxKasse`): Kasse offen wie im Demo-Studio (Zahlungslinks, „Testzahlung
  auslösen“ über `/api/app/demo-zahlung/:id`), Kunden können nicht bezahlen (`pay.mjs` → 409), keine Gutschein-Mails, keine Stripe-Einrichtung.
  `/api/portal` → `studio.testmodus`. Mit `APPLE_SANDBOX_STRIPE=1` aus (dann Stripe-Einrichtung wie bei echten Käufen).
- Web-Anmeldung übernimmt einen offenen App-Entwurf (E-Mail per Code bestätigt, noch keine 30 Tage alt) nicht (409), erst nach Ablauf.
  Ist eine Web-Checkout-Sitzung schon bezahlt, legt die App keinen Entwurf darüber (409 `schon_aktiv`); entsteht trotzdem ein Stripe-Abo für ein
  App-Studio, kündigt der Webhook es sofort (Admin-Mail: erste Zahlung erstatten).
- „Konto kündigen und löschen“ und Apple verlängert trotzdem: Kündigungs- und Löschdatum bleiben fest, Mail an das Studio „bei Apple kündigen,
  Erstattung bei Apple“, Admin-Mail. Nur Kündigung (ohne Löschung): bezahlter Zeitraum bleibt nutzbar (wie bisher).
- Mails an App-Studios verlinken Vertrag und AVV als App-Fassung (`?app=1`). Body der App-/Apple-Endpunkte höchstens 64 KB (413); ungültige
  Benachrichtigungen höchstens 10 Log-Einträge je IP und Stunde.
- App-Entwürfe ohne Kauf: keine Erinnerungs-Mail, nach 30 Tagen gelöscht. Vertrag 2026-12b mit § 13 (App-Fassung `?app=1` ohne Web-Preis), Archiv `vertrag-2026-12.html`. Seit 15.11.2026 Fassung 2026-12c (Web-Preis 41,93 € netto = 49,90 € inkl. USt.), Archiv `vertrag-2026-12b.html`; die Archive zeigen den Monatspreis fest (49 €), nicht mehr aus `/api/config`.

| Umgebungsvariable | Wirkung |
|---|---|
| `APPLE_BUNDLE_ID` | Standard `de.tattoofin.app` |
| `APPLE_PRODUKT_ID` | Standard `de.tattoofin.app.abo.monatlich` |
| `APPLE_APP_ID` | optional, numerische App-ID; gesetzt → Production-Benachrichtigungen müssen dazu passen |
| `APPLE_SANDBOX_STRIPE` | `1` = Stripe-Einrichtung auch nach Sandbox-/TestFlight-Käufen (Standard aus = Kasse im Testmodus) |
| `APP_REVIEW_REG_EMAIL` | Review-Zugang „Konto anlegen“ (mit `APP_REVIEW_CODE`), immer frischer Entwurf |
| `APPLE_XCODE_TEST` | nur lokal (http://localhost): StoreKit-Testkäufe aus Xcode annehmen (`dev/app-lokal.mjs` setzt es) |
| `TF_TESTMODUS` | nur `dev/app-lokal.mjs`: `1` = `APPLE_SANDBOX_STRIPE` aus, Testkäufe öffnen die Kasse im Testmodus (wie live bei Sandbox) |
| `APPLE_TEST_ROOT_PEM` | nur lokal: Test-Wurzel statt Apple Root CA - G3 (`dev/apple-nachbau.mjs`, für `dev/app-api.mjs`) |

Tests mit anderen Ports (wenn parallel ein Server läuft): `E2E_PORT`, `E2E_RESEND_PORT` (e2e), `BETRIEB_PORT` (betrieb), `STRIPE_MOCK_PORT` (betrieb, app-api).

## Stand 14.11.2026: Alles aus dem Web-Dashboard auch in der App (Branch `claude/tattoofin-app-paritaet`)

- `GET /api/app/werbung`, `GET /api/app/start` (Checkliste) mit App-Token. `GET /api/app/aufsteller` und `POST /api/portal/aufsteller`, `…/aufsteller-pruefen`: seit 15.11.2026 immer 410 `aufsteller_entfallen`; die App 1.0 (1) zeigt dann den Text aus `error` (kein Abmelden, nie 401).
  Antworten für die App ohne Paket-, Abo- oder Website-Preise (Apple 3.1.1). Texte/Kapitel: `_lib/werbung.mjs`.
- **Druckvorlagen** (Fensteraufkleber, Flyer A6, Kundeninfo, Bilder für Instagram) liegen jetzt unter `public/druck/kunden/` mit eigenem
  `public/druck/assets/` (Kopie aus `tattoofin/kunden/` und `tattoofin/assets/`; `config.js` nur mit öffentlichen Werten, ohne Preise und Namen). `noindex` für `/druck/*`.
  Übersicht `public/druck/index.html` („← Alle Vorlagen“). Vorher zeigten die Links auf GitHub Pages und lieferten 404. Ändert sich eine Vorlage in `tattoofin/kunden/`,
  die Kopie hier nachziehen.
- So geht's: `soGehts.fussnote` nur bei Klarna dauerhaft, sonst `soGehts.ohneKlarna` („Im Video siehst du Klarna. Bei deinem Studio gibt es Klarna nicht dauerhaft.“);
  im Dashboard gleich (`so-gehts.js`, `data-klarna-dauer`).
- Zahlseite mit `?app=1` (aus der App „Zahlseite ansehen“): Impressum/Datenschutz öffnen in der App-Fassung (ohne Menü, ohne Weg zur Startseite).
- Demo-Studio (`POST /api/admin/app-demo`): entfernt bei jedem Anlegen alte Aufsteller-Testdaten und das Logo.
- Datenschutzerklärung `#app`: Dein Studio in der App, QR-Aufsteller (entfallen seit November 2026; Logos ohne Bestellung löscht der Tagesjob, Altfälle nur zur Abwicklung an den Hersteller), Werbung (Fotos nur hinzufügen, Druckvorlagen-Adresse).
- **Offen (Entscheidung Domenic bis 20.11.2026):** Das Werbevideo sagt „Bei uns geht das ganz bequem in Raten.“ – nicht der freigegebene Klarna-Wortlaut
  (`klarna-texte.js` AUSSAGE). Neu schneiden, ab dem Stichtag ausblenden oder ausdrücklich so lassen. Vermerk steht in `public/js/app.js` und `_lib/werbung.mjs`.
- Tests: `dev/app-api.mjs` prüft u. a. Druckvorlagen auf der eigenen Domain (200, noindex), So geht's ohne Fußnote ohne Klarna, Aufsteller entfallen (410 für Inhaber, Team, Apple-Abo, Demo, Sandbox; keine Bestellung, keine Mail, kein Checkout).

