import XCTest

/// Gestaltungs-Rundgang (1.1, 25.11.2026): Bildschirmfotos aller Hauptbildschirme, wichtiger Unterseiten und Blätter
/// für die Gestaltungsprüfung (hell, dunkel, größte Schrift). Läuft nur mit TF_GESTALTUNG=1 gegen den lokalen Server
/// (Studio „Nordlicht Tattoo“, sam@nordlicht-tattoo.de, Code 123456). Bricht bei fehlenden Elementen nicht ab, sondern fotografiert weiter.
///   TEST_RUNNER_TF_UI_API=http://localhost:<port> TEST_RUNNER_TF_GESTALTUNG=1 xcodebuild test-without-building … \
///     -only-testing:TattoofinUITests/GestaltungRundgangUITests
@MainActor
final class GestaltungRundgangUITests: XCTestCase {
    private var nr = 0
    private var art = ""

    override func setUp() { continueAfterFailure = true }
    override func tearDown() { XCUIDevice.shared.appearance = .light }

    func testHell() throws { try rundgang([], "hell", dunkel: false) }
    func testDunkel() throws { try rundgang([], "dunkel", dunkel: true) }
    func testGroessteSchrift() throws {
        try rundgang(["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"], "ax5", dunkel: false)
    }

    private func foto(_ app: XCUIApplication, _ name: String) {
        Thread.sleep(forTimeInterval: 1.5)
        nr += 1
        let a = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        a.name = String(format: "g-%@-%02d-%@", art, nr, name)
        a.lifetime = .keepAlways
        add(a)
    }

    /// Bildschirm oben, dann zweimal nach unten gewischt
    private func seite(_ app: XCUIApplication, _ name: String, tiefe: Int = 2) {
        foto(app, name)
        for i in 1...tiefe {
            app.swipeUp(velocity: .slow)
            foto(app, "\(name)-unten\(i)")
        }
    }

    private func zurueck(_ app: XCUIApplication) {
        let b = app.navigationBars.buttons.firstMatch
        if b.exists { b.tap() }
        Thread.sleep(forTimeInterval: 1)
    }

    private func schliessen(_ app: XCUIApplication) {
        for t in ["Fertig", "Schließen", "Abbrechen"] {
            let b = app.buttons[t].firstMatch
            if b.exists && b.isHittable { b.tap(); Thread.sleep(forTimeInterval: 1); return }
        }
        app.swipeDown(velocity: .fast)
        Thread.sleep(forTimeInterval: 1)
    }

    private func tab(_ app: XCUIApplication, _ name: String) {
        let k = app.tabBars.buttons[name]
        if k.waitForExistence(timeout: 10) { k.tap() }
        Thread.sleep(forTimeInterval: 2)
    }

    private func rundgang(_ zusatz: [String], _ name: String, dunkel: Bool) throws {
        let env = ProcessInfo.processInfo.environment
        guard env["TF_GESTALTUNG"] == "1" else { throw XCTSkip("Nur für die Gestaltungsprüfung (TF_GESTALTUNG=1)") }
        art = name
        // Darstellung setzt das Lauf-Skript per `xcrun simctl ui <sim> appearance dark|light` (XCUIDevice.appearance griff nicht, wenn simctl sie vorher gesetzt hatte)
        if dunkel { XCUIDevice.shared.appearance = .dark }
        let app = XCUIApplication()
        app.launchArguments = ["-TFApiBase", env["TF_UI_API"] ?? "http://localhost:8888", "-TFTestEmail", "sam@nordlicht-tattoo.de",
                               "-TFZuruecksetzen", "YES", "-AppleLanguages", "(de)", "-AppleLocale", "de_DE"] + zusatz
        app.launch()

        // Anmeldung
        let schicken = app.buttons["Code schicken"]
        XCTAssertTrue(schicken.waitForExistence(timeout: 20))
        foto(app, "anmelden")
        schicken.tap()
        let code = app.textFields["Code mit 6 Ziffern"]
        XCTAssertTrue(code.waitForExistence(timeout: 10))
        foto(app, "anmelden-code")
        code.tap()
        code.typeText("123456")
        for t in ["Nicht jetzt", "Später"] { let b = app.buttons[t]; if b.waitForExistence(timeout: 8) { b.tap() } }
        guard app.tabBars.buttons["Konto"].waitForExistence(timeout: 20) else { XCTFail("keine Tabs"); return }

        // Kasse
        tab(app, "Kasse")
        seite(app, "kasse", tiefe: 1)
        app.swipeDown(velocity: .fast); app.swipeDown(velocity: .fast)
        for t in ["2", "5", "0"] { let b = app.buttons[t].firstMatch; if b.exists { b.tap() } }
        foto(app, "kasse-betrag")
        let theke = app.buttons["Theken-QR"].firstMatch
        if theke.exists { theke.tap(); foto(app, "theken-qr"); let zu = app.buttons["Schließen"].firstMatch; if zu.exists { zu.tap() } else { app.swipeDown(velocity: .fast) } }
        let erstellen = app.buttons["Zahlungslink erstellen"]
        if erstellen.exists {
            erstellen.tap()
            if app.buttons["Teilen"].waitForExistence(timeout: 20) { foto(app, "zahlungslink-blatt"); app.swipeUp(velocity: .slow); foto(app, "zahlungslink-blatt-unten") }
            schliessen(app)
        }

        // Zahlungen, Detail, Auszahlungen
        tab(app, "Zahlungen")
        seite(app, "zahlungen")
        app.swipeDown(velocity: .fast); app.swipeDown(velocity: .fast)
        let jonas = app.staticTexts["Jonas Keller"].firstMatch
        if jonas.waitForExistence(timeout: 5) { jonas.tap(); seite(app, "zahlung-detail", tiefe: 1); zurueck(app) }
        let ausz = app.buttons["Auszahlungen"].firstMatch
        if ausz.waitForExistence(timeout: 5) { ausz.tap(); seite(app, "auszahlungen", tiefe: 1) }

        // Gutscheine, Detail, Verkaufen-Blatt
        tab(app, "Gutscheine")
        seite(app, "gutscheine")
        app.swipeDown(velocity: .fast); app.swipeDown(velocity: .fast)
        let greta = app.buttons.containing(NSPredicate(format: "label CONTAINS 'Greta Hansen'")).firstMatch
        if greta.waitForExistence(timeout: 5) {
            if !greta.isHittable { app.swipeUp(velocity: .slow) }
            greta.tap(); seite(app, "gutschein-detail", tiefe: 1); zurueck(app)
        }
        app.swipeDown(velocity: .fast); app.swipeDown(velocity: .fast)
        let verkaufen = app.buttons["Gutschein verkaufen"].firstMatch
        if verkaufen.waitForExistence(timeout: 5) {
            if !verkaufen.isHittable { app.swipeUp(velocity: .slow) }
            verkaufen.tap(); foto(app, "gutschein-verkaufen"); schliessen(app)
        }

        // Werbung
        tab(app, "Werbung")
        Thread.sleep(forTimeInterval: 3)
        seite(app, "werbung", tiefe: 3)

        // Konto, Team, Geräte
        tab(app, "Konto")
        seite(app, "konto", tiefe: 3)
        app.swipeDown(velocity: .fast); app.swipeDown(velocity: .fast); app.swipeDown(velocity: .fast)
        for (t, n) in [("Team-Adressen", "team"), ("Geräte", "geraete")] {
            let l = app.buttons.containing(NSPredicate(format: "label BEGINSWITH %@", t)).firstMatch
            for _ in 0..<4 where !(l.exists && l.isHittable) { app.swipeUp(velocity: .slow) }
            if l.exists && l.isHittable { l.tap(); foto(app, n); zurueck(app) }
        }
    }
}
