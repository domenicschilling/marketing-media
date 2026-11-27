import XCTest

/// Rohaufnahmen für die gestalteten App-Store-Bilder (AppStore/werbebilder). Läuft gegen den lokalen Server
/// (dev/app-lokal.mjs, Studio „Nordlicht Tattoo“, sam@nordlicht-tattoo.de, Code 123456) auf einem 6,9-Zoll-iPhone (1320 × 2868):
///   xcrun simctl status_bar <sim> override --time 9:41 --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3
///   TEST_RUNNER_TF_UI_API=http://localhost:<port> TEST_RUNNER_TF_STORE_BILDER=1 xcodebuild test-without-building … \
///     -only-testing:TattoofinUITests/StoreWerbebilderUITests
/// Anhänge a01-… mit `xcrun xcresulttool export attachments` holen, dann `node AppStore/werbebilder/render.mjs <ordner>`.
/// Ohne TF_STORE_BILDER wird der Test übersprungen (gehört nicht zum normalen Testlauf).
@MainActor
final class StoreWerbebilderUITests: XCTestCase {
    private func foto(_ app: XCUIApplication, _ name: String) {
        Thread.sleep(forTimeInterval: 2)
        let a = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        a.name = name
        a.lifetime = .keepAlways
        add(a)
    }

    func testRohaufnahmen() throws {
        let env = ProcessInfo.processInfo.environment
        guard env["TF_STORE_BILDER"] == "1" else { throw XCTSkip("Nur für Store-Bilder (TF_STORE_BILDER=1)") }
        continueAfterFailure = false
        XCUIDevice.shared.appearance = .light
        let app = XCUIApplication()
        let api = env["TF_UI_API"] ?? "http://localhost:8888"
        app.launchArguments = ["-TFApiBase", api, "-TFTestEmail", "sam@nordlicht-tattoo.de", "-TFZuruecksetzen", "YES",
                               "-AppleLanguages", "(de)", "-AppleLocale", "de_DE",
                               // QR-Codes in den Store-Bildern zeigen auf die öffentliche Seite, nie auf localhost (Prüfschritt in render.mjs)
                               "-TFQRZiel", env["TF_QR_ZIEL"] ?? "https://tattoofin.de"]
        app.launch()

        // Anmelden
        let schicken = app.buttons["Code schicken"]
        XCTAssertTrue(schicken.waitForExistence(timeout: 15))
        schicken.tap()
        let code = app.textFields["Code mit 6 Ziffern"]
        XCTAssertTrue(code.waitForExistence(timeout: 10))
        code.tap()
        code.typeText("123456")
        // Face ID: nicht jetzt. Mitteilungen erlauben (für den echten Sperrbildschirm, Bild 5)
        let nichtJetzt = app.buttons["Nicht jetzt"]
        if nichtJetzt.waitForExistence(timeout: 8) { nichtJetzt.tap() }
        let erlauben = app.buttons["Mitteilungen erlauben"]
        if erlauben.waitForExistence(timeout: 8) {
            erlauben.tap()
            let sb = XCUIApplication(bundleIdentifier: "com.apple.springboard")
            let ok = sb.buttons["Erlauben"]
            if ok.waitForExistence(timeout: 8) { ok.tap() }
        }
        XCTAssertTrue(app.tabBars.buttons["Konto"].waitForExistence(timeout: 15))

        // a01: Zahlung über Klarna (Detail)
        app.tabBars.buttons["Zahlungen"].tap()
        let jonas = app.staticTexts["Jonas Keller"].firstMatch
        XCTAssertTrue(jonas.waitForExistence(timeout: 10), "Klarna-Zahlung fehlt")
        // a04: Zahlungsliste
        foto(app, "a04-zahlungen")
        jonas.tap()
        XCTAssertTrue(app.staticTexts["Klarna"].firstMatch.waitForExistence(timeout: 10) || app.staticTexts.containing(NSPredicate(format: "label CONTAINS 'Klarna'")).firstMatch.exists)
        foto(app, "a01-zahlung-klarna")
        app.navigationBars.buttons.firstMatch.tap()

        // a06: Auszahlungen
        let ausz = app.buttons["auszahlungen-karte"].firstMatch  // Karte oben in Zahlungen (Abnahme G4, statt Umschalter)
        if ausz.waitForExistence(timeout: 5) { ausz.tap(); Thread.sleep(forTimeInterval: 2); foto(app, "a06-auszahlungen") }

        // a02 → a03 → a03b: EIN Vorgang (Bild 2): 150 € Anzahlung eintippen, Link erstellen, echtes Teilen-Blatt
        app.tabBars.buttons["Kasse"].tap()
        let anz = app.segmentedControls.buttons["Anzahlung"].firstMatch
        if anz.waitForExistence(timeout: 5) { anz.tap() } else { app.buttons["Anzahlung"].firstMatch.tap() }
        for t in ["1", "5", "0"] { app.buttons[t].firstMatch.tap() }
        foto(app, "a02-kasse-betrag")
        app.buttons["Zahlungslink erstellen"].tap()
        let teilen = app.buttons["Teilen"]
        XCTAssertTrue(teilen.waitForExistence(timeout: 20), "Zahlungslink nicht erstellt")
        foto(app, "a03-zahlungslink-qr")
        teilen.tap()
        Thread.sleep(forTimeInterval: 3)
        foto(app, "a03b-teilen")
        let blattZu = app.buttons["Schließen"].firstMatch
        if blattZu.exists { blattZu.tap() } else { app.swipeDown(velocity: .fast) }
        Thread.sleep(forTimeInterval: 1)
        let fertig = app.buttons["Fertig"]
        if fertig.exists { fertig.tap() }

        // a05: Gutscheine (Liste) und a05b: Gutschein-Detail
        app.tabBars.buttons["Gutscheine"].tap()
        Thread.sleep(forTimeInterval: 2)
        foto(app, "a05-gutscheine")
        let greta = app.buttons.containing(NSPredicate(format: "label CONTAINS 'Greta Hansen'")).firstMatch
        if greta.waitForExistence(timeout: 5) {
            if !greta.isHittable { app.swipeUp(velocity: .slow) }
            greta.tap()
            foto(app, "a05b-gutschein-detail")
            app.navigationBars.buttons.firstMatch.tap()
        }

        // a07: Werbung
        app.tabBars.buttons["Werbung"].tap()
        Thread.sleep(forTimeInterval: 5)
        foto(app, "a07-werbung")

        // a08: Theken-QR (Vollbild aus der Kasse)
        app.tabBars.buttons["Kasse"].tap()
        let theke = app.buttons["Theken-QR"].firstMatch
        if theke.waitForExistence(timeout: 5) {
            theke.tap()
            Thread.sleep(forTimeInterval: 2)
            foto(app, "a08-zahlseite-qr")
            let zu = app.buttons["Schließen"].firstMatch
            if zu.exists { zu.tap() } else { app.swipeDown(velocity: .fast) }
        }

        // a09: Team-Adressen
        app.tabBars.buttons["Konto"].tap()
        Thread.sleep(forTimeInterval: 2)
        let team = app.buttons.containing(NSPredicate(format: "label BEGINSWITH 'Team-Adressen'")).firstMatch
        for _ in 0..<5 where !(team.exists && team.isHittable) { app.swipeUp(velocity: .slow) }
        if team.exists { team.tap(); Thread.sleep(forTimeInterval: 2); foto(app, "a09-team") }

        // a10: echter Sperrbildschirm mit der Mitteilung des Servers (Bild 5). Das Lauf-Skript schickt sie per `xcrun simctl push`,
        // sobald die Marker-Datei TF_PUSH_MARKER existiert, und legt danach <marker>.gesendet an.
        if let marker = env["TF_PUSH_MARKER"] {
            XCUIDevice.shared.press(.home)
            Thread.sleep(forTimeInterval: 2)
            FileManager.default.createFile(atPath: marker, contents: Data("bereit".utf8))
            let gesendet = marker + ".gesendet"
            for _ in 0..<60 where !FileManager.default.fileExists(atPath: gesendet) { Thread.sleep(forTimeInterval: 1) }
            Thread.sleep(forTimeInterval: 6)  // Banner abwarten
            // Mitteilungszentrale von oben links herunterziehen (sieht aus wie der Sperrbildschirm, mit Uhrzeit und Mitteilung)
            let sb = XCUIApplication(bundleIdentifier: "com.apple.springboard")
            let oben = sb.coordinate(withNormalizedOffset: CGVector(dx: 0.25, dy: 0.003))
            oben.press(forDuration: 0.1, thenDragTo: sb.coordinate(withNormalizedOffset: CGVector(dx: 0.25, dy: 0.75)))
            Thread.sleep(forTimeInterval: 3)
            foto(app, "a10-sperrbildschirm")
        }
    }

    /// Nur der Sperrbildschirm (Bild 5), wenn die App schon Mitteilungen darf: TF_STORE_SPERRE=1 und TF_PUSH_MARKER
    func testSperrbildschirm() throws {
        let env = ProcessInfo.processInfo.environment
        guard env["TF_STORE_SPERRE"] == "1", let marker = env["TF_PUSH_MARKER"] else { throw XCTSkip("Nur für Store-Bild 5") }
        XCUIDevice.shared.press(.home)
        Thread.sleep(forTimeInterval: 2)
        // Mitteilungszentrale (zeigt Uhrzeit, Datum und Mitteilungen wie der Sperrbildschirm) von oben Mitte herunterziehen
        let sb = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let oben = sb.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.0))
        oben.press(forDuration: 0.3, thenDragTo: sb.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.85)), withVelocity: .slow, thenHoldForDuration: 0.3)
        Thread.sleep(forTimeInterval: 2)
        FileManager.default.createFile(atPath: marker, contents: Data("bereit".utf8))
        let gesendet = marker + ".gesendet"
        for _ in 0..<60 where !FileManager.default.fileExists(atPath: gesendet) { Thread.sleep(forTimeInterval: 1) }
        Thread.sleep(forTimeInterval: 4)
        foto(XCUIApplication(), "a10-sperrbildschirm")
    }
}
