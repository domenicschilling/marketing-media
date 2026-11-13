# Tattoofin – iPhone-App

Native SwiftUI-App für Tattoo-Studios (iOS 18+, Swift 6, nur Apple-Frameworks, keine Fremdbibliotheken).

## Aufbau

| Ordner | Inhalt |
|---|---|
| `Tattoofin.xcodeproj` | Von Hand angelegt (objectVersion 77). Die Ordner `Tattoofin/` und `TattoofinTests/` sind dateisystem-synchronisiert: neue Swift-Dateien gehören automatisch dazu. |
| `Config/` | `Info.plist` (Release) und `Info-Debug.plist` (mit ATS-Ausnahme nur für localhost), `Tattoofin.entitlements` (aps-environment). Liegt bewusst außerhalb des synchronisierten Ordners. |
| `Tattoofin/App` | Einstieg, AppDelegate (Push), AppState (Anmeldung, Tabs, Sprungziele, Portal-Daten) |
| `Tattoofin/Core` | APIClient (actor), Schlüsselbund, Einstellungen, App-Sperre (Face ID), Push, Zwischenspeicher, Formate |
| `Tattoofin/Models` | Codable-Modelle wie der Server (Beträge in Cent) |
| `Tattoofin/Strings` | `Texte.swift` (alle Texte), `KlarnaTexte.swift` (Spiegel von `website/netlify/functions/_lib/klarna-texte.mjs`) |
| `Tattoofin/Design` | Farben, Schriften, Knöpfe, Karten, QR-Code (CoreImage) |
| `Tattoofin/Features` | Bildschirme: Sperre, Anmeldung, Einrichtung, Kasse, Zahlungslink, Zahlungen, Auszahlungen, Gutscheine (Scanner), Konto (Team, Geräte, Konto löschen) |
| `Tattoofin/Resources` | Schriften (TTF aus den woff2 der Website), Assets (App-Icon, Logo, Wortmarke, Figur), `PrivacyInfo.xcprivacy` |
| `TattoofinTests` | Swift Testing: Beträge, Gutschein-Codes, Token-Hex, Datum, API-Dekodierung, Klarna-Texte (Vergleich mit der .mjs-Datei) |

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

## Server

- Debug: `http://localhost:8888` (aus `TF_API_BASE` → Info.plist `TFApiBasis`), Release: `https://tattoofin.de`.
- Für Tests überschreibbar mit dem Startargument `-TFApiBase http://localhost:<port>`. Nur im Debug-Build füllt `-TFTestEmail <adresse>` das E-Mail-Feld vor.
- Nur im Debug-Build: `-TFSperreSekunden 5` verkürzt die Face-ID-Sperre nach dem Hintergrund von 5 Minuten auf 5 Sekunden (zum Testen).
- Texte eintippen im Simulator: `xcrun simctl pbcopy booted` und im Feld „Einsetzen“ (die Mac-Tastatur kommt nicht immer an).
- Lokaler Server mit Beispiel-Studios: `cd tattoofin/website && NODE_PATH=… node dev/app-lokal.mjs` (Adressen und Test-Code stehen in der Ausgabe).

## Wichtige Regeln

- Token nur im Schlüsselbund (`WhenUnlockedThisDeviceOnly`, kein iCloud). Bei 401 meldet die App sich selbst ab.
- Keine Preise, kein Kauf, keine Abo-Verwaltung, keine Erstattungen in der App (Apple 3.1).
- Keine Raten- oder Später-zahlen-Aussagen. Falls je nötig: nur `KlarnaAussageView` (Warnsatz gleich groß direkt daneben + Fußnote). Gutscheine nie mit Klarna. Die Zahlart Klarna erscheint nur als Name.
- Push: Code ist fertig (Erlaubnis, APNs-Token an `PUT /api/app/push`, Banner im Vordergrund, Sprung zur Zahlung/Auszahlung). **Echt-Versand wartet auf Apple-Team-ID und APNs-Schlüssel (.p8).** Im Simulator ohne Signatur schlägt die APNs-Registrierung erwartungsgemäß fehl und wird nur protokolliert.
- Vor der Einreichung: `DEVELOPMENT_TEAM` setzen, `aps-environment` für Release auf `production` (macht Xcode beim Archivieren mit Distribution-Profil), App-Icon in höherer Auflösung prüfen (die Figur liegt nur als 300-px-PNG vor).

## Schriften und Lizenzen

- Luckiest Guy (Apache License 2.0) und DM Sans (SIL Open Font License 1.1), beide frei nutzbar, aus `website/public/assets/fonts` nach TTF gewandelt:
  `uvx --from 'fonttools[woff]' fonttools ttLib.woff2 decompress -o <name>.ttf <name>.woff2`
