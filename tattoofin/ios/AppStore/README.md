# Tattoofin-App: Angaben für App Store Connect (Entwurf, Stand 25.11.2026)

## Version 1.1 (Build 4) – aktueller Stand
Store-Texte, Bilder und „Neuerungen“ für 1.1 stehen in `store-texte-1-1.md`, die Bilder entstehen mit `werbebilder/render.mjs`
aus `StoreWerbebilderUITests`. Alle Befunde und Prüfrunden: `befunde-1-1.md`. Ist Build 4 schon hochgeladen, wird der nächste Upload Build 5.
Neu in 1.1 (für die Prüfung relevant): Adress-Maske der Zahlseite (Kasse gesperrt → „Adresse eintragen“), Studios ohne Anzahlung
(Kasse bietet sie nicht an), Karte „Klarna ist bei dir noch aus“ im Werbung-Tab, Gratis-Woche über das Einführungsangebot des Abos,
Auszahlungen als Karte in Zahlungen, Mitteilungen: Absturz beim Antippen behoben.


## Version 1.1 (Build 2, ältere Planung vom 15.11.2026): ohne QR-Aufsteller

Domenic 15.11.2026: Den QR-Aufsteller aus Holz gibt es nicht mehr. In 1.1 ist er ganz aus der App entfernt (Konto → „Dein Studio“,
Werbung → Zahlseiten-Karte, Bestellung, Logo-Auswahl aus Fotos). Der QR-Code der Zahlseite („QR-Code in Fotos speichern“) und die
Druckvorlagen (Fensteraufkleber, Flyer) bleiben. Die laufende 1.0 (1) zeigt bis zum Update beim Antippen der alten Zeile die Meldung
des Servers (`GET /api/app/aufsteller` → 410, Code `aufsteller_entfallen`).

In App Store Connect bei 1.1 (macht Domenic, erst nach seinem OK):
- Review-Notiz unten ersetzen (der Absatz zum Aufsteller ist raus).
- App-Datenschutz: **„Benutzerinhalte → Fotos oder Videos“ entfernen** (die App liest keine Bilder mehr aus Fotos). Bei
  „Andere Benutzerinhalte“ fällt die Logo-Auswahl weg (Tabelle unten ist schon angepasst). Nur intern: Im Store-Text selbst kommt das Wort „Aufsteller“ nicht vor.
- Neuerungen (de-DE), Vorschlag (für alle sichtbar, darum ohne Aufsteller): `Deinen QR-Code für die Theke findest du unter Werbung: als Bild speichern und ausdrucken, zum Beispiel als Aufkleber. Dazu viele kleine Verbesserungen.`

Für die laufende Prüfung von 1.0 (1), falls der Server vorher umgestellt wird: in der Review-Notiz den Aufsteller-Absatz ersetzen durch
`Konto → "QR-Aufsteller": discontinued. The row now only shows a short notice from our server. It will be removed in the next update. Nothing in the app can be bought outside the App Store.`

Alles hier ist ein **Entwurf**. Eingereicht wird erst nach Domenics Freigabe. Vorher muss das Backend live sein
(siehe „Vor der Einreichung“), sonst kann sich der Prüfer nicht anmelden.

## Vor der Einreichung (Reihenfolge)

1. Erledigt: Apple-Team-ID `5WPPC8669J` ist in Xcode eingetragen (`DEVELOPMENT_TEAM`, Target Tattoofin).
2. Domenic meldet sich in Xcode mit seiner Apple-ID an (Xcode → Einstellungen → Accounts, Passwort gibt er selbst ein). Erst dann gibt es
   Signier-Zertifikate für Archiv, TestFlight und echte Geräte.
3. App Store Connect → **Geschäft**: Vereinbarung für **kostenpflichtige Apps** annehmen, Bank- und Steuerdaten eintragen. Ohne das lädt das Abo
   nicht (Produkt „nicht gefunden“) und es gibt keine In-App-Käufe.
4. Antrag auf das **App Store Small Business Program** (developer.apple.com/app-store/small-business-program/): sonst behält Apple im ersten
   Abo-Jahr 30 % statt 15 %.
5. Im Apple-Entwicklerkonto einen **APNs-Schlüssel (.p8)** anlegen (Certificates, Identifiers & Profiles → Keys → „Apple Push Notifications service“).
   In Netlify setzen: `APNS_KEY_P8` (Inhalt der .p8-Datei), `APNS_KEY_ID`, `APNS_TEAM_ID`, optional `APNS_BUNDLE_ID` (Standard `de.tattoofin.app`).
6. Abo in App Store Connect anlegen (Abschnitt „In-App-Kauf“ unten), Preis bestätigen.
7. Backend mit Domenics OK live stellen (Branch `claude/tattoofin-gesamt`: `/api/app/*` inklusive `/api/app/werbung`, `/api/app/start`,
   `/api/apple/benachrichtigung`, Demo-Logik, Druckvorlagen `public/druck/`, Zahlseite in der App-Fassung
   `zahlen.html?app=1`, App-Fassung der Rechtsseiten mit `?app=1`, Vertrag 2026-12b, AVV Stand 14.11.2026, Datenschutzerklärung mit den
   App-Abschnitten „Dein Studio in der App“ und „Werbung“).
   Vorher die Bestandskunden über den neuen Unterauftragsverarbeiter Apple (Push-Mitteilungen, AVV Anlage 3) informieren, 14 Tage vorher (§ 4 Abs. 2 AVV).
8. Demo-Studio anlegen: `POST /api/admin/app-demo` mit `{ "email": "<Review-Adresse>" }` (Admin-Token). Die Antwort nennt die Studio-ID.
9. In Netlify setzen: `APP_REVIEW_EMAIL` (z. B. `app-review@tattoofin.de`), `APP_REVIEW_CODE` (6 Ziffern, frei gewählt), `APP_REVIEW_STUDIO_ID`
   (aus Schritt 8) und `APP_REVIEW_REG_EMAIL` (zweite Adresse nur für „Konto anlegen“, z. B. `app-review-neu@tattoofin.de`, gleicher Code,
   muss sich von `APP_REVIEW_EMAIL` unterscheiden). Die Mails an das Prüf-Studio gehen an diese Adresse (eigenes Postfach).
10. App Store Server Notifications **V2** für Production **und** Sandbox auf `https://tattoofin.de/api/apple/benachrichtigung` eintragen.
11. Release-Build einmal komplett gegen das Live-System testen (TestFlight mit Sandbox-Konto): Konto anlegen mit dem Registrier-Zugang, Sandbox-Kauf,
    Kasse im Testmodus („Testzahlung auslösen“), Konto kündigen und löschen; Anmelden mit dem Demo-Zugang, Kasse, Gutscheine, Auszahlungen, Abmelden.
12. Store-Screenshots mit dem **Release-Build** auf einem 6,9-Zoll-iPhone (z. B. iPhone 17 Pro Max, 1320 × 2868) gegen das Demo-Studio aufnehmen.
    Ohne Debug-Bereich, ohne Web-Ansichten. Die Bilder in `content/tattoofin/app-2026-11/screens/` sind Testbilder (6,3 Zoll, teils Debug-Build) und **nicht** für den Store.
13. Domenics OK für die Einreichung. Das Abo wird zusammen mit der App-Version zur Prüfung eingereicht.

## In-App-Kauf: Abo für neue Studios (Domenic in App Store Connect, nichts davon ist eingerichtet)

Neue Studios legen ihr Konto in der App an und zahlen das Monats-Abo über Apple (Regel 3.1.1). Web-Anmeldung (Stripe) bleibt unverändert.
Das Stripe-Konto, auf dem das Studio das Geld seiner Kunden bekommt, richtet es nach dem Kauf im Browser ein (kein Kauf).

| Feld | Wert |
|---|---|
| Abo-Gruppe (Referenz / Anzeige) | `Tattoofin` / `Tattoofin` |
| Produkt-ID | `de.tattoofin.app.abo.monatlich` (muss genau so heißen, App und Server prüfen sie) |
| Referenzname | `Tattoofin Monatlich` |
| Laufzeit | 1 Monat, automatisch verlängernd, Familienfreigabe **aus** |
| Preis | **49,90 € inkl. MwSt.** (Domenic 14.11.2026; ca. 41,93 € netto, davon behält Apple 15 % mit Small Business Program → ca. 35,64 €, sonst im ersten Jahr 30 %). Die App zeigt nur den Preis aus dem App Store. |
| Einführungsangebot | **Kostenlos, 1 Woche** (in App Store Connect angelegt, Ultron 14.11.). Die App zeigt „Die ersten 7 Tage kostenlos“ nur, wenn Apple den Account für berechtigt hält; der Monatspreis bleibt die größte Preisangabe (Regel 3.1.2). Der Server zählt die Gratis-Woche als aktives Abo (`apple.probe`), Apple meldet danach `DID_RENEW` (bezahlt) oder `EXPIRED` (Zugang wird gesperrt). |
| Anzeigename / Beschreibung (de-DE) | `Tattoofin Monatlich` / `Zahlungslinks, Zahlseite und Gutscheine` |
| Prüf-Bildschirmfoto | Abo-Bildschirm (`r06-abo-preis-aus-storekit`, mit dem Release-Build auf 6,9 Zoll neu aufnehmen) |
| Verfügbarkeit | Deutschland |
| Server-Benachrichtigungen | V2, Production und Sandbox: `https://tattoofin.de/api/apple/benachrichtigung` |
| Nutzungsbedingungen (EULA) | Apple-Standard-EULA (Feld „Lizenzvertrag“ leer lassen = Standard) **und** Link in der App-Beschreibung (unten) |

Sandbox, TestFlight und App Review kaufen nie mit echtem Geld. Nach so einem Testkauf öffnet der Server die Kasse im **Testmodus**: Zahlungslinks
und „Testzahlung auslösen“ gehen, Kunden können nicht wirklich bezahlen, die Stripe-Einrichtung ist aus. So sieht der Prüfer, was das Abo
freischaltet (Regel 2.1, 3.1.1), und ein kostenloser Testkauf öffnet nie eine echte Kasse.

## App-Beschreibung 1.0 (alt, für 1.1 gilt `store-texte-1-1.md`)

```
Tattoofin ist die Kasse für dein Tattoo-Studio: Betrag eintippen, Zahlungslink oder QR-Code erstellen, und dein Kunde bezahlt mit
seinem Handy. Du siehst sofort, was bezahlt ist, und bekommst bei jeder Zahlung eine Mitteilung.

• Zahlungslinks und QR-Code für die Theke
• Anzahlungen und Gesamtbeträge
• Gutscheine verkaufen, prüfen und einlösen
• Zahlungen und Auszahlungen deines Stripe-Kontos im Blick
• Fertige Werbung: Video und Beiträge mit deinem Studionamen
• Team-Zugang für deine Mitarbeitenden

Mit dem Abo nimmt Tattoofin keine Provision. Das Geld deiner Kunden geht direkt auf das Stripe-Konto deines Studios.
Tattoofin ist nur für Unternehmer (Tattoo-Studios in Deutschland).

Abo „Tattoofin Monatlich“: Neue Studios legen ihr Konto in der App an und schließen das Abo über ihren Apple-Account ab. Das Abo
verlängert sich automatisch jeden Monat, wenn du es nicht mindestens 24 Stunden vor Ende des laufenden Zeitraums kündigst. Neue
Studios können die ersten 7 Tage kostenlos testen (wenn dein Apple-Account dafür berechtigt ist); kündigst du in dieser Zeit
nicht mindestens 24 Stunden vor Ende, beginnt danach das bezahlte Abo. Die Zahlung wird über deinen Apple-Account abgebucht. Kündigen kannst du jederzeit in den Einstellungen
deines Apple-Accounts unter Abos. Es gibt keine Mindestlaufzeit.

Nutzungsbedingungen (Apple-Standard-EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Vertrag: https://tattoofin.de/vertrag.html?app=1
Datenschutz: https://tattoofin.de/datenschutz.html#app
```

Untertitel und Schlüsselwörter für 1.1: siehe `store-texte-1-1.md` (1.0 hatte: `Zahlungslinks fürs Studio`, `Tattoo,Studio,Kasse,Zahlungslink,QR,Gutschein,Anzahlung,Stripe`).

## Review-Notiz (App Review Information → Notes), Englisch

```
Tattoofin is a B2B tool for tattoo studios in Germany. Studios use it to create payment links and QR codes for their customers,
see incoming payments and payouts of their own Stripe account, and redeem gift vouchers.

1) Create an account and subscribe (In-App Purchase)
On the sign-in screen tap "Neues Studio? Konto anlegen" and use this review address (no e-mail is sent, use the fixed code):
  E-mail: <APP_REVIEW_REG_EMAIL>
  Code:   <APP_REVIEW_CODE>
Enter any business details (German postcode = 5 digits, phone numbers at least 6 digits), switch on the four confirmations,
tap "Weiter zum Abo" and subscribe with your sandbox account (auto-renewable subscription "Tattoofin Monatlich", 1 month,
with an introductory offer of 1 week free for eligible accounts; the free week unlocks the same features as the paid subscription).
After the sandbox purchase the cash register ("Kasse") is unlocked in test mode: type an amount, tap "Zahlungslink erstellen",
then "Testzahlung auslösen" marks the link as paid. No real money moves in the cash register, and the Stripe setup is switched off for
sandbox and TestFlight purchases on purpose (real studios connect their own Stripe account in Safari after the purchase; that is not a purchase).
This review address always starts a fresh account, so you can repeat it. To repeat the purchase, cancel the sandbox subscription first
or use another sandbox account.
Account deletion: Konto → "Konto kündigen und löschen" (type LÖSCHEN). You may run it on the account you created. The screen also
links to the Apple subscription settings.

2) Demo studio with sample data
Sign-in (no password): enter the e-mail below and tap "Code schicken". No e-mail is sent; use the fixed code.
  E-mail: <APP_REVIEW_EMAIL>
  Code:   <APP_REVIEW_CODE>
- Kasse: type an amount, tap "Zahlungslink erstellen", then "Testzahlung auslösen" (no payment, no Stripe).
- Gutscheine: search one of the listed codes or scan the QR code on a voucher PDF; redeem and undo.
- Zahlungen: list of sample payments; the "Auszahlungen" card at the top opens sample payouts.
- Installments ("Raten") via Klarna: Klarna is offered to the studio's customer in the Stripe Checkout in the browser, not in the
  app. It requires Klarna to be switched on in the studio's own Stripe account; in the demo studio it is switched off. In the app
  the studio only sees the result, e.g. "Bezahlt mit: Klarna" on a payment (see screenshot 1).
- Konto: Impressum and privacy policy (also on the sign-in screen), notification settings, team, devices.
- Werbung (marketing tab): in the demo studio, Klarna is switched off in its (simulated) Stripe account. The tab therefore shows the
  card "Klarna ist bei dir noch aus" and the QR code of the studio's payment page (can be saved to Photos with add-only access).
  Studios with Klarna switched on additionally get a ready-made promo video (streamed from our own server) and Instagram posts
  with the studio's name and that QR code; the post images are drawn on the device from JavaScript files bundled with the app
  (an invisible WKWebView used only as a renderer, no remote code, no web UI); all controls are native SwiftUI. Where offered, printable sheets
  open on tattoofin.de in SFSafariViewController. No digital content or features are sold in this tab.
- So geht's (Kasse → "So geht's", or Konto): a short tutorial video with chapters. It shows the same features in the browser
  version of Tattoofin; the chapter about adding the web app to the home screen is skipped.
Nothing in the app can be bought outside the App Store.
Please run account deletion on the account from step 1, not on the demo studio.
Push notifications are sent when a payment arrives (APNs).

Contact: info@tattoofin.de
```

## URLs

- Support-URL: `https://tattoofin.de/fragen/` (Fragen-Seite mit WhatsApp-Knopf und info@tattoofin.de; ab 1.1, vorher Impressum)
- Datenschutz-URL: `https://tattoofin.de/datenschutz.html#app` (mit „Dein Studio in der App“ und „Werbung“; der Abschnitt zum QR-Aufsteller entfällt seit 15.11.2026)
- Marketing-URL: leer lassen. In der App gibt es keinen Hinweis und keinen Link auf die Website zum Bezahlen und keinen anderen Preis (Apple 3.1.3).
- Nutzungsbedingungen: Apple-Standard-EULA `https://www.apple.com/legal/internet-services/itunes/dev/stdeula/` (Link in der Beschreibung und im
  Abo-Bildschirm der App), dazu der Vertrag `https://tattoofin.de/vertrag.html?app=1`.

## App-Datenschutz („App Privacy“), genau wie `Tattoofin/Resources/PrivacyInfo.xcprivacy`

Tracking: **Nein**. Für alle Datenarten: mit der Identität verknüpft (Studio-Konto), Zweck **App-Funktionalität**, kein Tracking.

| App Store Connect | Was genau |
|---|---|
| Kontaktinformationen → E-Mail-Adresse | Anmelde-Adresse; E-Mail von Kunden/Käufern (freiwillig) |
| Kontaktinformationen → Name | Inhaber/in und Unterzeichner (Konto anlegen); Namen von Kunden, Käufern, Gutschein-Empfängern |
| Kontaktinformationen → Physische Adresse | Anschrift des Studios (Konto anlegen) |
| Kontaktinformationen → Telefonnummer | Mobilnummer und Telefonnummer des Studios (Konto anlegen) |
| Finanzinformationen → Andere Finanzinformationen | Beträge, Zahlungen, Auszahlungen, Bankname und letzte 4 Ziffern |
| Benutzerinhalte → Andere Benutzerinhalte | Motiv/Beschreibung, Sitzungen, Gutschein-Nachricht, Notiz beim Einlösen, Grund beim Löschen |
| Kennungen → Geräte-ID | Geräte-Kennung der App und Push-Token |
| Andere Daten | Gerätename, Gerätemodell, iOS- und App-Version (Liste der angemeldeten Geräte); Firmenname, USt-IdNr., Website (Konto anlegen) |
| Käufe → Kaufverlauf | Apple-Abo: signierte Transaktion (Kennungen, Produkt, Kauf- und Ablaufdatum) an unseren Server |
| Benutzerinhalte → Andere Benutzerinhalte (zusätzlich) | Fragebogen, Bestätigung der rechtlichen Lage (Name, Zeitpunkt), Einstellungen (Anzahlungsbedingungen, Ausweich-Anzahlung, Zahlseiten-Hinweis, Benachrichtigungs-Adresse) – nur Inhaber; Häkchen der Einrichtungs-Checkliste (QR-Code an der Theke, erster Beitrag) |

Required-Reason-APIs im Manifest (keine Angabe in App Store Connect nötig, nur zur Kontrolle): UserDefaults `CA92.1` (eigene
App-Einstellungen), Datei-Zeitstempel `C617.1` (Änderungsdatum zwischengespeicherter Werbe-Dateien im eigenen App-Container). Nicht genutzt:
Systemstartzeit, freier Speicher, aktive Tastaturen.

Nicht erhoben: Standort, Kontakte, Fotos oder Videos (die App speichert nur in Fotos, nur „Hinzufügen“, und liest dort nichts; die Kamera scannt nur Codes, Bilder werden nicht gespeichert oder gesendet), Browserverlauf,
Suchverlauf, Nutzungsdaten, Diagnosedaten, Werbe-ID.

## Kategorie, Alter, Export

- Kategorie: Business (`LSApplicationCategoryType = public.app-category.business`)
- Altersfreigabe: 4+ (keine der Fragen trifft zu)
- Verschlüsselung: nur HTTPS des Systems → `ITSAppUsesNonExemptEncryption = NO` (steht schon in der Info.plist)
- Verfügbarkeit: Deutschland (Studios in Deutschland)
