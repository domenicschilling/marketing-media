import XCTest

/// Rohaufnahmen für die gestalteten App-Store-Bilder (AppStore/werbebilder). Läuft gegen den lokalen Server
/// (dev/app-lokal.mjs, Studio „Nordlicht Tattoo“, store@beispiel.test, Code 123456) auf einem 6,9-Zoll-iPhone (1320 × 2868):
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
        app.launchArguments = ["-TFApiBase", api, "-TFTestEmail", "store@beispiel.test", "-TFZuruecksetzen", "YES",
                               "-AppleLanguages", "(de)", "-AppleLocale", "de_DE"]
        app.launch()

        // Anmelden
        let schicken = app.buttons["Code schicken"]
        XCTAssertTrue(schicken.waitForExistence(timeout: 15))
        schicken.tap()
        let code = app.textFields["Code mit 6 Ziffern"]
        XCTAssertTrue(code.waitForExistence(timeout: 10))
        code.tap()
        code.typeText("123456")
        for t in ["Nicht jetzt", "Später"] { let b = app.buttons[t]; if b.waitForExistence(timeout: 8) { b.tap() } }
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
        let ausz = app.buttons["Auszahlungen"].firstMatch
        if ausz.waitForExistence(timeout: 5) { ausz.tap(); Thread.sleep(forTimeInterval: 2); foto(app, "a06-auszahlungen") }

        // a02: Kasse mit Betrag
        app.tabBars.buttons["Kasse"].tap()
        for t in ["6", "5", "0"] { app.buttons[t].firstMatch.tap() }
        foto(app, "a02-kasse-betrag")

        // a03: Anzahlung-Link mit QR-Code
        for _ in 0..<3 { app.buttons["Löschen"].firstMatch.tap() }
        let anz = app.buttons["Anzahlung"].firstMatch
        if anz.exists { anz.tap() } else { app.segmentedControls.buttons["Anzahlung"].firstMatch.tap() }
        for t in ["1", "5", "0"] { app.buttons[t].firstMatch.tap() }
        app.buttons["Zahlungslink erstellen"].tap()
        XCTAssertTrue(app.buttons["Teilen"].waitForExistence(timeout: 20), "Zahlungslink nicht erstellt")
        foto(app, "a03-zahlungslink-qr")
        let fertig = app.buttons["Fertig"]
        if fertig.exists { fertig.tap() }

        // a05: Gutscheine
        app.tabBars.buttons["Gutscheine"].tap()
        Thread.sleep(forTimeInterval: 2)
        foto(app, "a05-gutscheine")

        // a07: Werbung
        app.tabBars.buttons["Werbung"].tap()
        Thread.sleep(forTimeInterval: 5)
        foto(app, "a07-werbung")
    }
}
