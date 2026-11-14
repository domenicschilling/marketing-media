# Tattoofin – iPhone-App

Native SwiftUI-App für Tattoo-Studios (iOS 18+, Swift 6, nur Apple-Frameworks, keine Fremdbibliotheken).

## Aufbau

| Ordner | Inhalt |
|---|---|
| `Tattoofin.xcodeproj` | Von Hand angelegt (objectVersion 77). Die Ordner `Tattoofin/`, `TattoofinTests/` und `TattoofinUITests/` sind dateisystem-synchronisiert: neue Swift-Dateien gehören automatisch dazu. |
| `StoreKit/Tattoofin.storekit` | StoreKit-Testdatei (Abo `de.tattoofin.app.abo.monatlich`, 49,90 € + Einführungsangebot 1 Woche kostenlos, de_DE, DEU). Liegt außerhalb des App-Ordners (kommt nicht in die App), ist im Schema (Ausführen) eingetragen und als Ressource in beiden Test-Zielen. |
| `Config/` | `Info.plist` (Release) und `Info-Debug.plist` (mit ATS-Ausnahme nur für localhost), `Tattoofin.entitlements` (aps-environment). Liegt bewusst außerhalb des synchronisierten Ordners. |
| `Tattoofin/App` | Einstieg, AppDelegate (Push), AppState (Anmeldung, Tabs, Sprungziele, Portal-Daten) |
| `Tattoofin/Core` | APIClient (actor), Schlüsselbund (`app-token`, `app-registrierung`), Einstellungen, App-Sperre (Face ID), Push, Zwischenspeicher, Formate, `AboManager` (StoreKit 2), `RegistrierungSpeicher` |
| `Tattoofin/Models` | Codable-Modelle wie der Server (Beträge in Cent) |
| `Tattoofin/Strings` | `Texte.swift` (alle Texte), `KlarnaTexte.swift` (Spiegel von `website/netlify/functions/_lib/klarna-texte.mjs`) |
| `Tattoofin/Design` | Farben, Schriften, Knöpfe, Karten, QR-Code (CoreImage) |
| `Tattoofin/Features` | Bildschirme: Sperre, Anmeldung, Registrierung (neues Studio), Abo (Apple), Einrichtung, Kasse, Zahlungslink, Zahlungen, Auszahlungen, Gutscheine (Scanner), Konto (Team, Geräte, Konto löschen) |
| `Tattoofin/Resources` | Schriften (TTF aus den woff2 der Website), Assets (App-Icon, Logo, Wortmarke, Figur), `PrivacyInfo.xcprivacy` |
| `TattoofinTests` | Swift Testing: Beträge, Gutschein-Codes, Token-Hex, Datum, API-Dekodierung, Klarna-Texte (Vergleich mit der .mjs-Datei), Registrierung (Feldprüfung wie `signup.mjs`, Texte nach Apple 3.1.2/3.1.3), Abo-Logik, StoreKit-Testkauf (`SKTestSession`) |
| `TattoofinUITests` | XCUITest Ende zu Ende: neues Studio → Abo (StoreKit-Testkauf) → Einrichtung → Kasse → Stripe im Simulator-Safari → Kasse offen → Löschen-Hinweis; hell und dunkel/große Schrift; „Käufe wiederherstellen“ |

## Bauen und testen

```sh
xcodebuild -project tattoofin/ios/Tattoofin.xcodeproj -scheme Tattoofin -sdk iphonesimulator \
  -destination "platform=iOS Simulator,name=iPhone 17" -derivedDataPath <scratch>/dd \
  CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM= build   # bzw. test
```

Für den Simulator **ad hoc signieren** (`CODE_SIGN_IDENTITY=-`, kein Team nötig) statt `CODE_SIGNING_ALLOWED=NO`: Nur dann gelten die
Entitlements. Ohne Signatur bleibt der Schlüsselbund-Eintrag nicht erhalten (Test 13.11.: nach jedem Neustart abgemeldet), und die App
bekommt keinen APNs-Token. Mit Ad-hoc-Signatur bleibt die Anmeldung erhalten und der Simulator liefert einen echten Geräte-Token,
sodass die ganze Kette Server → APNs-Nachbau (`dev/app-lokal.mjs`) → `xcrun simctl push` → Banner getestet werden kann.

DerivedData danach löschen (Speicher).

## Neues Studio in der App + Apple-Abo (StoreKit 2)

Ablauf (Spezifikation 14.11.2026): Anmelden → „Neues Studio? Konto anlegen“ → E-Mail-Code (`/api/app/registrieren/code`, `…/pruefen`) →
Studio-Angaben → Bestätigungen (Unternehmer, KMU, Vertrag, AVV; `/api/app/registrieren` legt den Entwurf an, Entwurf im Schlüsselbund) →
Abo-Bildschirm (`AboView`, Preis nur `product.displayPrice`, Kleingedrucktes nach 3.1.2, Vertrag/Datenschutz/EULA, „Käufe wiederherstellen“) →
`purchase(options: [.appAccountToken(uuid)])` → `/api/app/abo/bestaetigen` → Token → Einrichtung → Kasse „Letzter Schritt: Stripe verbinden“.

- Erst nach 200 vom Server `transaction.finish()`. Netz/5xx: Kauf bleibt offen, „Nochmal versuchen“ sendet denselben JWS. `abo_vergeben`/`produkt`/`familie`: abschließen.
- `AboManager.beobachten()` startet `Transaction.updates` in `AppDelegate` (vor der Anmeldung). Zuordnung: offener Entwurf mit gleicher UUID → bestätigen;
  angemeldetes Apple-Studio → `abo/aktualisieren` (beendetes Abo + Inhaber + gleiche UUID → neu abschließen); sonst nur abschließen.
  Eingeloggte Apple-Studios gleichen höchstens alle 6 Stunden ab.
- Kasse: beendetes Abo → „Abo wieder abschließen“ (Inhaber), Testkauf (Sandbox) ohne Stripe → Hinweis, Stripe nicht verbunden → `connectUrl` in Safari, beim Zurückkehren lädt die Kasse neu.
- Konto: Abschnitt „Abo“ nur bei `abrechnung == "apple"` (`manageSubscriptionsSheet`). Konto löschen: Hinweis + Knopf „Abo bei Apple kündigen“.
- In der App nie: Web-Preis, „netto“, Link zur Website zum Bezahlen, Klarna/Raten (Test `keinWebPreisKeinKlarna`).

### StoreKit testen (Ergebnis der Probe 14.11.2026, Xcode 27.2)

- `SKTestSession` **im UI-Test-Prozess wirkt**: Produkt lädt in der App, Kauf ohne Dialog (`disableDialogs`). Das ist der Hauptweg.
- Gehostete Unit-Tests: StoreKit darf im App-Prozess **vor** `SKTestSession` nicht benutzt werden, sonst fragt es den echten App Store
  (leere Produktliste). Deshalb startet `AppDelegate` den `Transaction.updates`-Beobachter nicht, wenn `XCTestConfigurationFilePath` gesetzt ist.
- `expireSubscription` ändert die Sitzung sofort, `Transaction.currentEntitlements` im selben Prozess bleibt aber zwischengespeichert → der Test prüft die Sitzung.
- `xcrun simctl launch` nutzt die StoreKit-Datei des Schemas nicht.

```sh
cd tattoofin/website && PORT=8899 STRIPE_MOCK_PORT=12199 NODE_PATH=$PWD/node_modules node dev/app-lokal.mjs   # eigener Port, stört 8888 nicht
cd tattoofin/ios
xcodebuild build-for-testing … -derivedDataPath <scratch>/dd CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM=
TEST_RUNNER_TF_LOKAL_SERVER=1 TEST_RUNNER_TF_API_BASE=http://localhost:8899 \
  xcodebuild test-without-building … -only-testing:TattoofinTests            # inkl. Kette Code → Entwurf → Kauf → Token
TEST_RUNNER_TF_UI_API=http://localhost:8899 \
  xcodebuild test-without-building … -resultBundlePath <scratch>/e2e.xcresult -only-testing:TattoofinUITests
xcrun xcresulttool export attachments --path <scratch>/e2e.xcresult --output-path <ordner>   # Bildschirmfotos 01-anmelden … 14-loeschen-apple-hinweis
```

Nur Debug: `-TFZuruecksetzen YES` startet ohne Anmeldung und ohne offene Registrierung (UI-Tests).

Abnahme-Lauf mit Fehlerfällen (`RegistrierungE2ETests`, Bildschirmfotos r01–r26: Anlegen, Kauf abgebrochen, Netz weg nach dem Kauf,
Einrichtung, Kasse/Stripe, Konto, Löschen-Hinweis, Abmelden/Anmelden, Käufe wiederherstellen, bekannte Adresse, dunkel + große Schrift,
Abo verwalten). „Netz weg“ geht über einen schaltbaren Vorschalt-Proxy vor dem lokalen Server:

```sh
node tattoofin/website/dev/netz-schalter.mjs            # 8890 → 8888, /__netz/aus und /__netz/an
TEST_RUNNER_TF_UI_API=http://localhost:8890 TEST_RUNNER_TF_UI_NETZ=http://localhost:8890/__netz \
  xcodebuild test-without-building … -only-testing:TattoofinUITests/RegistrierungE2ETests
```

Testmodus nach Testkauf (wie Sandbox, TestFlight und App Review live: Kasse offen, „Testzahlung auslösen“, keine Stripe-Einrichtung,
Bildschirmfotos r27–r33 inkl. Konto hell/dunkel und Vertrag „Sichern“ als PDF) braucht einen zweiten lokalen Server im Testmodus:

```sh
cd tattoofin/website && TF_TESTMODUS=1 PORT=8899 STRIPE_MOCK_PORT=12199 NODE_PATH=$PWD/node_modules node dev/app-lokal.mjs
TEST_RUNNER_TF_UI_TESTMODUS_API=http://localhost:8899 \
  xcodebuild test-without-building … -only-testing:TattoofinUITests/RegistrierungE2ETests/testTestmodusNachTestkauf
```

Prüfung 14.11.2026 (Befunde behoben): `Transaction.updates` schickt abgelaufene oder widerrufene Transaktionen nie an den Server, sondern
schließt sie nur ab (`AboManager.zuordnung(…, gueltig:)`); bei `abo_abgelaufen` und `token_passt_nicht` wird die Transaktion ebenfalls
abgeschlossen. Abschnittsköpfe und -fußzeilen in Listen über `ListenKopf`/`ListenFuss` (tfLeise, etwa 6:1 statt 3,4:1). Rechtsseiten haben
„Sichern“ (PDF zum Teilen, Sichern in Dateien, Drucken; § 312i BGB). `PrivacyInfo.xcprivacy`: zusätzlich Anschrift und Telefonnummer.

Beobachtung 14.11.: Die erste `SKTestSession` im UI-Test-Prozess wirkt nicht (Produkt „nicht gefunden“, auch nach „Nochmal versuchen“).
`RegistrierungE2ETests` wärmt deshalb einmal auf (Sitzung + App-Start/-Ende), danach eine frische Sitzung.

## Server

- Debug: `http://localhost:8888` (aus `TF_API_BASE` → Info.plist `TFApiBasis`), Release: `https://tattoofin.de`.
- Für Tests überschreibbar mit dem Startargument `-TFApiBase http://localhost:<port>`. Nur im Debug-Build füllt `-TFTestEmail <adresse>` das E-Mail-Feld vor.
- Nur im Debug-Build: `-TFSperreSekunden 5` verkürzt die Face-ID-Sperre nach dem Hintergrund von 5 Minuten auf 5 Sekunden (zum Testen).
- Texte eintippen im Simulator: `xcrun simctl pbcopy booted` und im Feld „Einsetzen“ (die Mac-Tastatur kommt nicht immer an).
- Lokaler Server mit Beispiel-Studios: `cd tattoofin/website && NODE_PATH=… node dev/app-lokal.mjs` (Adressen und Test-Code stehen in der Ausgabe).

## Wichtige Regeln

- Token nur im Schlüsselbund (`WhenUnlockedThisDeviceOnly`, kein iCloud). Bei 401 meldet die App sich selbst ab.
- Kauf nur über Apple (In-App-Abo, StoreKit 2) und nur auf dem Abo-Bildschirm; Preis ausschließlich `product.displayPrice`. Studios, die über die Website zahlen, sehen weiterhin keine Preise, keinen Kauf, keine Abo-Verwaltung (Apple 3.1.1/3.1.3). Keine Erstattungen in der App. Kündigen/Löschen ja (5.1.1(v)), Zurücknehmen nein (nur Hinweis auf info@tattoofin.de; der Server sperrt `DELETE /api/portal/kuendigung` mit App-Token).
- Rechtstexte (Impressum, Datenschutz, Vertrag, AVV) nur über `RechtsAnsicht` (WKWebView ohne gespeicherte Daten, `?app=1`, Inhaltsblocker für Tracking/Meta, nur die vier Seiten ladbar), erreichbar auch auf Anmelde- und Code-Bildschirm. Apple-EULA öffnet in Safari.
- Platzhalter in Eingabefeldern immer mit `prompt: tfPlatzhalter(…)` (Systemgrau erreicht kein WCAG AA).
- Demo-Studio (App-Prüfung): Stripe gilt als eingerichtet, „Testzahlung auslösen“ im Zahlungslink-Sheet (`POST /api/app/demo-zahlung/:id`). Angaben für App Store Connect: `AppStore/README.md`.
- Keine Raten- oder Später-zahlen-Aussagen. Falls je nötig: nur `KlarnaAussageView` (Warnsatz gleich groß direkt daneben + Fußnote). Gutscheine nie mit Klarna. Die Zahlart Klarna erscheint nur als Name.
- Push: Code ist fertig (Erlaubnis, APNs-Token an `PUT /api/app/push`, Banner im Vordergrund, Sprung zur Zahlung/Auszahlung). **Echt-Versand wartet auf Apple-Team-ID und APNs-Schlüssel (.p8).** Im Simulator ohne Signatur schlägt die APNs-Registrierung erwartungsgemäß fehl und wird nur protokolliert.
- Vor der Einreichung: `DEVELOPMENT_TEAM` setzen, `aps-environment` für Release auf `production` (macht Xcode beim Archivieren mit Distribution-Profil), App-Icon in höherer Auflösung prüfen (die Figur liegt nur als 300-px-PNG vor).

## Schriften und Lizenzen

- Luckiest Guy (Apache License 2.0) und DM Sans (SIL Open Font License 1.1), beide frei nutzbar, aus `website/public/assets/fonts` nach TTF gewandelt:
  `uvx --from 'fonttools[woff]' fonttools ttLib.woff2 decompress -o <name>.ttf <name>.woff2`
