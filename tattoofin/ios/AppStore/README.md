# Tattoofin-App: Angaben für App Store Connect (Entwurf, Stand 14.11.2026)

Alles hier ist ein **Entwurf**. Eingereicht wird erst nach Domenics Freigabe. Vorher muss das Backend live sein
(siehe „Vor der Einreichung“), sonst kann sich der Prüfer nicht anmelden.

## Vor der Einreichung (Reihenfolge)

1. Apple-Team-ID ist da → in Xcode `DEVELOPMENT_TEAM` setzen (Target Tattoofin, Debug und Release).
2. Im Apple-Entwicklerkonto einen **APNs-Schlüssel (.p8)** anlegen (Certificates, Identifiers & Profiles → Keys → „Apple Push Notifications service“).
   In Netlify setzen: `APNS_KEY_P8` (Inhalt der .p8-Datei), `APNS_KEY_ID`, `APNS_TEAM_ID`, optional `APNS_BUNDLE_ID` (Standard `de.tattoofin.app`).
3. Backend mit Domenics OK live stellen (Branch `claude/tattoofin-app`: `/api/app/*`, Demo-Logik, App-Fassung der Rechtsseiten mit `?app=1`, Datenschutzerklärung mit App-Abschnitt).
4. Demo-Studio anlegen: `POST /api/admin/app-demo` mit `{ "email": "<Review-Adresse>" }` (Admin-Token). Die Antwort nennt die Studio-ID.
5. In Netlify setzen: `APP_REVIEW_EMAIL` (z. B. `app-review@tattoofin.de`), `APP_REVIEW_CODE` (6 Ziffern, frei gewählt), `APP_REVIEW_STUDIO_ID` (aus Schritt 4).
6. Release-Build einmal komplett gegen das Live-System testen: Anmelden mit dem Review-Zugang, Kasse (Link erstellen, „Testzahlung auslösen“),
   Gutscheine (Code `GS-…` aus der Liste suchen, einlösen, zurücknehmen, PDF), Auszahlungen, Konto (Impressum/Datenschutz, Konto kündigen und löschen
   **nicht** im Demo-Studio auslösen, nur ansehen), Abmelden.
7. Store-Screenshots mit dem **Release-Build** auf einem 6,9-Zoll-iPhone (z. B. iPhone 17 Pro Max, 1320 × 2868) gegen das Demo-Studio aufnehmen.
   Ohne Debug-Bereich, ohne Web-Ansichten. Die Bilder in `content/tattoofin/app-2026-11/screens/` sind Testbilder (6,3 Zoll, teils Debug-Build) und **nicht** für den Store.

## In-App-Kauf: Abo für neue Studios (Domenic in App Store Connect, nichts davon ist eingerichtet)

Neue Studios legen ihr Konto in der App an und zahlen das Monats-Abo über Apple (Regel 3.1.1). Web-Anmeldung (Stripe) bleibt unverändert.

| Feld | Wert |
|---|---|
| Abo-Gruppe (Referenz / Anzeige) | `Tattoofin` / `Tattoofin` |
| Produkt-ID | `de.tattoofin.app.abo.monatlich` (muss genau so heißen, App und Server prüfen sie) |
| Referenzname | `Tattoofin Monatlich` |
| Laufzeit | 1 Monat, automatisch verlängernd, **keine** Probezeit, **kein** Einführungsangebot, Familienfreigabe **aus** |
| Preis | Domenic entscheidet (Vorschlag 59,99 € inkl. MwSt.). Die App zeigt nur den Preis aus dem App Store. |
| Anzeigename / Beschreibung (de-DE) | `Tattoofin Monatlich` / `Zahlungslinks, Zahlseite und Gutscheine` |
| Prüf-Bildschirmfoto | Abo-Bildschirm aus dem UI-Test (`06-abo`, mit dem Release-Build auf 6,9 Zoll neu aufnehmen) |
| Verfügbarkeit | Deutschland |

Außerdem: Vertrag „Paid Applications“ mit Bank- und Steuerangaben aktiv (sonst lädt das Produkt nicht), App Store Server Notifications **V2**
für Production **und** Sandbox auf `https://tattoofin.de/api/apple/benachrichtigung`, Sandbox-Tester anlegen, optional App Store Small Business Program.
Das Abo muss zusammen mit der App-Version zur Prüfung eingereicht werden.

## Review-Notiz (App Review Information → Notes), Englisch

```
Tattoofin is a B2B tool for tattoo studios in Germany. Studios use it to create payment links and QR codes for their customers,
see incoming payments and payouts of their own Stripe account, and redeem gift vouchers.

New studios can create an account in the app: on the sign-in screen tap "Neues Studio? Konto anlegen", enter an e-mail address
(a 6-digit code is sent to that address), enter the business details, confirm the contract, then subscribe on the subscription
screen (auto-renewable subscription "Tattoofin Monatlich", In-App Purchase). After the purchase the studio connects its own Stripe
account in Safari; Stripe pays out the money of the studio's customers. Connecting Stripe is not a purchase. For sandbox/TestFlight
purchases the Stripe setup is switched off on purpose.

Sign-in (no password): enter the e-mail below and tap "Code schicken". For this review account no e-mail is sent;
use the fixed code below.
  E-mail: <APP_REVIEW_EMAIL>
  Code:   <APP_REVIEW_CODE>

The review account is a demo studio. No real money moves:
- Kasse: type an amount, tap "Zahlungslink erstellen". In the demo studio the sheet shows "Testzahlung auslösen" which marks the
  link as paid (no payment, no Stripe) so you can see the paid state.
- Gutscheine: search one of the listed codes or scan the QR code on a voucher PDF; redeem and undo.
- Zahlungen → Auszahlungen: sample payouts.
- Konto: Impressum and privacy policy (also on the sign-in screen), notification settings, team, devices.
- Account deletion: Konto → "Konto kündigen und löschen" (type LÖSCHEN). Please do not run it on the demo studio, or tell us and we reset it.
  For studios that subscribed in the app the screen also links to the Apple subscription settings.
Push notifications are sent when a payment arrives (APNs).

Contact: info@tattoofin.de
```

## URLs

- Support-URL: `https://tattoofin.de/impressum.html` (Kontakt: Telefon, WhatsApp, info@tattoofin.de)
- Datenschutz-URL: `https://tattoofin.de/datenschutz.html#app`
- Marketing-URL: leer lassen. In der App gibt es keinen Hinweis und keinen Link auf die Website zum Bezahlen und keinen anderen Preis (Apple 3.1.3).

## App-Datenschutz („App Privacy“), genau wie `Tattoofin/Resources/PrivacyInfo.xcprivacy`

Tracking: **Nein**. Für alle Datenarten: mit der Identität verknüpft (Studio-Konto), Zweck **App-Funktionalität**, kein Tracking.

| App Store Connect | Was genau |
|---|---|
| Kontaktinformationen → E-Mail-Adresse | Anmelde-Adresse; E-Mail von Kunden/Käufern (freiwillig) |
| Kontaktinformationen → Name | Namen von Kunden, Käufern, Gutschein-Empfängern |
| Finanzinformationen → Andere Finanzinformationen | Beträge, Zahlungen, Auszahlungen, Bankname und letzte 4 Ziffern |
| Benutzerinhalte → Andere Benutzerinhalte | Motiv/Beschreibung, Sitzungen, Gutschein-Nachricht, Notiz beim Einlösen, Grund beim Löschen |
| Kennungen → Geräte-ID | Geräte-Kennung der App und Push-Token |
| Andere Daten | Gerätename, Gerätemodell, iOS- und App-Version (Liste der angemeldeten Geräte) |
| Käufe → Kaufverlauf | Apple-Abo: signierte Transaktion (Kennungen, Produkt, Kauf- und Ablaufdatum) an unseren Server |
| Benutzerinhalte → Fotos oder Videos | Nur das Studio-Logo, das der Inhaber für den QR-Aufsteller in Fotos auswählt (schwarz/weiß an unseren Server, für die Gravur). Speichern in Fotos (Werbung) liest nichts. |

Nicht erhoben: Standort, Kontakte, sonstige Fotos (die Kamera scannt nur Codes, Bilder werden nicht gespeichert oder gesendet), Browserverlauf,
Suchverlauf, Nutzungsdaten, Diagnosedaten, Werbe-ID.

## Kategorie, Alter, Export

- Kategorie: Business (`LSApplicationCategoryType = public.app-category.business`)
- Altersfreigabe: 4+ (keine der Fragen trifft zu)
- Verschlüsselung: nur HTTPS des Systems → `ITSAppUsesNonExemptEncryption = NO` (steht schon in der Info.plist)
- Verfügbarkeit: Deutschland (Studios in Deutschland)
