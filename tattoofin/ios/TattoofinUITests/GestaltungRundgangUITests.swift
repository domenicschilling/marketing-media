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
    /// Dunkel UND größte Schrift (fehlte bis zur unabhängigen Abnahme 1.1)
    func testDunkelGroessteSchrift() throws {
        try rundgang(["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"], "dunkel-ax5", dunkel: true)
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

    /// Liste ganz nach oben
    private func nachOben(_ app: XCUIApplication) {
        for _ in 0..<3 { app.swipeDown(velocity: .fast) }
        Thread.sleep(forTimeInterval: 0.5)
    }

    /// In kleinen Schritten nach unten scrollen, bis das Element frei tippbar ist (nicht unter Tab- oder Navigationsleiste).
    /// Wird es nicht erreicht, meldet der Rundgang das (Abnahme 1.1, Runde 2: vorher fehlten Bildschirme bei AX5 ohne Meldung).
    @discardableResult
    private func erreichen(_ app: XCUIApplication, _ e: XCUIElement, _ name: String) -> Bool {
        let fenster = app.windows.firstMatch
        func frei() -> Bool {
            guard e.exists, e.isHittable else { return false }
            let unten = app.tabBars.firstMatch.exists ? app.tabBars.firstMatch.frame.minY : fenster.frame.maxY
            let oben = app.navigationBars.firstMatch.exists ? app.navigationBars.firstMatch.frame.maxY : 0
            return e.frame.midY < unten - 10 && e.frame.midY > oben + 10
        }
        _ = e.waitForExistence(timeout: 5)
        for _ in 0..<25 where !frei() {
            let a = fenster.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.7))
            a.press(forDuration: 0.05, thenDragTo: fenster.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.45)))
        }
        if frei() { return true }
        XCTFail("FEHLT: \(name)")
        return false
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
                               "-TFZuruecksetzen", "YES", "-AppleLanguages", "(de)", "-AppleLocale", "de_DE",
                               "-TFDarstellung", dunkel ? "dunkel" : "hell"] + zusatz
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
        nachOben(app)
        let jonas = app.buttons.containing(NSPredicate(format: "label CONTAINS 'Jonas Keller'")).firstMatch
        if erreichen(app, jonas, "zahlung-detail") { jonas.tap(); seite(app, "zahlung-detail", tiefe: 1); zurueck(app) }
        nachOben(app)
        let ausz = app.buttons["auszahlungen-karte"].firstMatch  // Karte oben in Zahlungen (Abnahme G4, statt Umschalter)
        if erreichen(app, ausz, "auszahlungen") { ausz.tap(); seite(app, "auszahlungen", tiefe: 1); zurueck(app) }

        // Gutscheine, Detail, Verkaufen-Blatt
        tab(app, "Gutscheine")
        seite(app, "gutscheine")
        nachOben(app)
        let greta = app.buttons.containing(NSPredicate(format: "label CONTAINS 'Greta Hansen'")).firstMatch
        if erreichen(app, greta, "gutschein-detail") { greta.tap(); seite(app, "gutschein-detail", tiefe: 1); zurueck(app) }
        let verkaufen = app.buttons["gutschein-verkaufen"].firstMatch  // Text-Knopf „Verkaufen“ in der Leiste (Abnahme 1.1, Runde 2)
        if verkaufen.waitForExistence(timeout: 5) { verkaufen.tap(); foto(app, "gutschein-verkaufen"); schliessen(app) }
        else { XCTFail("FEHLT: gutschein-verkaufen") }

        // Werbung
        tab(app, "Werbung")
        Thread.sleep(forTimeInterval: 3)
        seite(app, "werbung", tiefe: 3)

        // Konto, Stripe-Status, Team, Geräte
        tab(app, "Konto")
        seite(app, "konto", tiefe: 3)
        for (t, n) in [("Stripe", "stripe-status"), ("Team-Adressen", "team"), ("Angemeldete Geräte", "geraete")] {
            nachOben(app)
            let l = app.buttons.containing(NSPredicate(format: "label BEGINSWITH %@", t)).firstMatch
            if erreichen(app, l, n) { l.tap(); seite(app, n, tiefe: 1); zurueck(app) }
        }
    }
}
