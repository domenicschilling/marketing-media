import XCTest

/// Store-Bilder für App Store Connect (6,9 Zoll, z. B. iPhone 18 Pro Max) gegen das LIVE-Demo-Studio auf tattoofin.de.
/// Nur mit Release-Build sinnvoll (keine Debug-Hilfen). Läuft nur, wenn TF_STORE_CODE gesetzt ist (Review-Code, nie einchecken):
///   xcrun simctl status_bar <sim> override --time 9:41 --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3
///   TEST_RUNNER_TF_STORE_CODE=<code> xcodebuild test -configuration Release … -only-testing:TattoofinUITests/StoreBilderUITests
/// Bilder: Anhänge s01-… (Export mit `xcrun xcresulttool export attachments`).
@MainActor
final class StoreBilderUITests: XCTestCase {
    private var nr = 0
    private let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")

    private func foto(_ name: String) {
        nr += 1
        Thread.sleep(forTimeInterval: 1.5)
        let a = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        a.name = String(format: "s%02d-%@", nr, name)
        a.lifetime = .keepAlways
        add(a)
    }

    private func systemDialogWeg() {
        for t in ["Erlauben", "Allow", "Nicht erlauben", "Don’t Allow"] {
            let b = springboard.buttons[t]
            if b.waitForExistence(timeout: 2) { b.tap(); return }
        }
    }

    func testStoreBilder() throws {
        let env = ProcessInfo.processInfo.environment
        guard let code = env["TF_STORE_CODE"], code.count == 6 else { throw XCTSkip("TF_STORE_CODE fehlt (nur für Store-Bilder)") }
        let email = env["TF_STORE_EMAIL"] ?? "app-review@tattoofin.de"
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["-AppleLanguages", "(de)", "-AppleLocale", "de_DE"]
        app.launch()

        // Anmelden mit dem Demo-Zugang (feste Review-Adresse, keine Mail)
        let feld = app.textFields["anmelden-email"]
        XCTAssertTrue(feld.waitForExistence(timeout: 20), "Anmeldeseite fehlt")
        foto("anmelden")
        feld.tap()
        feld.typeText(email)
        app.buttons["Code schicken"].tap()
        let codeFeld = app.textFields["6-stelliger Code"]
        XCTAssertTrue(codeFeld.waitForExistence(timeout: 20), "Code-Feld fehlt")
        codeFeld.tap()
        codeFeld.typeText(code)
        systemDialogWeg()
        for t in ["Nicht jetzt", "Später"] {
            let b = app.buttons[t]
            if b.waitForExistence(timeout: 6) { b.tap() }
            systemDialogWeg()
        }
        XCTAssertTrue(app.tabBars.buttons["Konto"].waitForExistence(timeout: 20), "Nach der Anmeldung keine Tabs")

        // 1) Kasse mit Betrag
        app.tabBars.buttons["Kasse"].tap()
        for t in ["2", "5", "0"] { app.buttons[t].firstMatch.tap() }
        foto("kasse-betrag")

        // 2) Zahlungslink mit QR-Code
        let erstellen = app.buttons["Zahlungslink erstellen"]
        XCTAssertTrue(erstellen.waitForExistence(timeout: 5))
        erstellen.tap()
        XCTAssertTrue(app.buttons["Teilen"].waitForExistence(timeout: 20), "Zahlungslink nicht erstellt")
        foto("zahlungslink-qr")
        let fertig = app.buttons["Fertig"]
        if fertig.exists { fertig.tap() }

        // 3) Zahlungen
        app.tabBars.buttons["Zahlungen"].tap()
        Thread.sleep(forTimeInterval: 3)
        foto("zahlungen")

        // 4) Gutscheine
        app.tabBars.buttons["Gutscheine"].tap()
        Thread.sleep(forTimeInterval: 3)
        foto("gutscheine")

        // 5) Werbung
        app.tabBars.buttons["Werbung"].tap()
        Thread.sleep(forTimeInterval: 5)
        foto("werbung")

        // 6) Konto
        app.tabBars.buttons["Konto"].tap()
        Thread.sleep(forTimeInterval: 3)
        foto("konto")
    }
}
