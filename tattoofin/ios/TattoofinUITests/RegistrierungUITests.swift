import StoreKitTest
import XCTest

/// Ende zu Ende im Simulator: neues Studio in der App anlegen und Abo mit StoreKit-Testkauf abschließen,
/// gegen den lokalen Server (`cd tattoofin/website && NODE_PATH=$PWD/node_modules node dev/app-lokal.mjs`, Code 123456).
/// Bildschirmfotos als Anhänge (01-anmelden … 09-kasse-stripe), Export mit `xcrun xcresulttool export attachments`.
@MainActor
final class RegistrierungUITests: XCTestCase {
    private var sitzung: SKTestSession!

    /// StoreKit-Testsitzung im Test-Prozess: Käufe ohne Dialog, Storefront Deutschland
    private func storeKitVorbereiten() throws {
        continueAfterFailure = false
        sitzung = try SKTestSession(configurationFileNamed: "Tattoofin")
        sitzung.resetToDefaultState()
        sitzung.clearTransactions()
        sitzung.disableDialogs = true
        sitzung.askToBuyEnabled = false
        sitzung.storefront = "DEU"
        sitzung.locale = Locale(identifier: "de_DE")
    }

    private func starten(email: String, zusatz: [String] = []) -> XCUIApplication {
        let app = XCUIApplication()
        // Server: Standard localhost:8888, anderer Port mit TF_UI_API (xcodebuild: TEST_RUNNER_TF_UI_API=http://localhost:8899)
        let api = ProcessInfo.processInfo.environment["TF_UI_API"] ?? "http://localhost:8888"
        app.launchArguments = ["-TFApiBase", api, "-TFTestEmail", email, "-TFZuruecksetzen", "YES",
                               "-AppleLanguages", "(de)", "-AppleLocale", "de_DE"] + zusatz
        app.launch()
        return app
    }

    private var praefix = ""

    private func foto(_ app: XCUIApplication, _ name: String) {
        let a = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        a.name = praefix + name
        a.lifetime = .keepAlways
        add(a)
    }

    /// Tab wählen und prüfen, dass er wirklich offen ist (direkt nach einem Neuladen der Kasse geht der erste Tipp manchmal verloren)
    private func tabWaehlen(_ app: XCUIApplication, _ name: String) {
        let knopf = app.tabBars.buttons[name]
        XCTAssertTrue(knopf.waitForExistence(timeout: 10), "Tab \(name) fehlt")
        for _ in 0..<3 {
            knopf.tap()
            if app.navigationBars[name].waitForExistence(timeout: 3) { return }
        }
        XCTFail("Tab \(name) öffnet nicht")
    }

    private func tastaturWeiter(_ app: XCUIApplication) {
        let w = app.toolbars.buttons["Weiter"]
        XCTAssertTrue(w.waitForExistence(timeout: 3), "„Weiter“ über der Tastatur fehlt")
        w.tap()
    }

    private func schalterAn(_ app: XCUIApplication, _ id: String) {
        let s = app.switches[id]
        XCTAssertTrue(s.waitForExistence(timeout: 5), "Schalter \(id) fehlt")
        if !s.isHittable { app.swipeUp() }
        // Rechts auf den Schalter tippen (der lange Text daneben ist nur Beschriftung)
        s.coordinate(withNormalizedOffset: CGVector(dx: 0.97, dy: 0.5)).tap()
    }

    /// R0 → R1 → Code → Angaben → Bestätigungen → Abo → Kauf → Einrichtung → Kasse mit Stripe-Karte (hell, normale Schrift)
    func testNeuesStudioMitAbo() throws {
        try ablauf(zusatz: [])
    }

    /// Derselbe Ablauf im Dunkelmodus mit großer Schrift (Bedienungshilfen L): nichts abgeschnitten, alles erreichbar
    func testNeuesStudioDunkelGrosseSchrift() throws {
        praefix = "dunkel-gross-"
        XCUIDevice.shared.appearance = .dark
        defer { XCUIDevice.shared.appearance = .light }
        try ablauf(zusatz: ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityL"])
    }

    private func ablauf(zusatz: [String]) throws {
        try storeKitVorbereiten()
        let email = "neu-\(Int(Date().timeIntervalSince1970))-\(Int.random(in: 100...999))@beispiel.test"
        let app = starten(email: email, zusatz: zusatz)

        let neu = app.buttons["neues-studio"]
        XCTAssertTrue(neu.waitForExistence(timeout: 15))
        foto(app, "01-anmelden")
        if !neu.isHittable { app.swipeUp() }
        neu.tap()

        let schicken = app.buttons["reg-code-schicken"]
        XCTAssertTrue(schicken.waitForExistence(timeout: 5))
        foto(app, "02-email")
        if !schicken.isHittable { app.swipeUp() }
        schicken.tap()

        let code = app.textFields["6-stelliger Code"]
        XCTAssertTrue(code.waitForExistence(timeout: 10))
        foto(app, "03-code")
        code.tap()
        code.typeText("123456")

        let firma = app.textFields["feld-firma"]
        XCTAssertTrue(firma.waitForExistence(timeout: 10))
        foto(app, "04a-angaben-leer")
        // Eingabetaste bzw. „Weiter“ über der Ziffern-/Telefontastatur springt ins nächste Feld
        firma.tap()
        app.typeText("Ink Test Studio\n")
        app.typeText("Lena Test\n")
        app.typeText("Hauptstraße 1\n")
        app.typeText("96047"); tastaturWeiter(app)
        app.typeText("Bamberg\n")
        app.typeText("015123456789"); tastaturWeiter(app)
        app.typeText("0951123456"); tastaturWeiter(app)
        app.swipeDown()
        foto(app, "04-angaben")
        let weiter = app.buttons["angaben-weiter"]
        if !weiter.isHittable { app.swipeUp() }
        weiter.tap()

        XCTAssertTrue(app.switches["schalter-unternehmer"].waitForExistence(timeout: 5))
        for id in ["schalter-unternehmer", "schalter-kmu", "schalter-vertrag", "schalter-avv"] { schalterAn(app, id) }
        foto(app, "05-bestaetigungen")
        let zumAbo = app.buttons["weiter-zum-abo"]
        if !zumAbo.isHittable { app.swipeUp() }
        zumAbo.tap()

        let kaufen = app.buttons["abo-kaufen"]
        XCTAssertTrue(kaufen.waitForExistence(timeout: 15), "Abo-Bildschirm kommt nicht")
        foto(app, "06-abo")
        app.swipeUp()
        foto(app, "06b-abo-unten")
        if !kaufen.isHittable { app.swipeDown() }
        kaufen.tap()

        // Einrichtung (Face ID, Mitteilungen)
        let nichtJetzt = app.buttons["Nicht jetzt"]
        XCTAssertTrue(nichtJetzt.waitForExistence(timeout: 20), "Nach dem Kauf keine Einrichtung")
        foto(app, "07-einrichtung")
        nichtJetzt.tap()
        let spaeter = app.buttons["Später"]
        if spaeter.waitForExistence(timeout: 5) {
            foto(app, "08-mitteilungen")
            spaeter.tap()
        }

        let stripe = app.buttons["stripe-einrichten"]
        XCTAssertTrue(stripe.waitForExistence(timeout: 15), "Kasse zeigt keine Stripe-Karte")
        foto(app, "09-kasse-stripe")

        // Konto-Tab: Abschnitt Abo
        tabWaehlen(app, "Konto")
        XCTAssertTrue(app.staticTexts["Apple (App Store)"].waitForExistence(timeout: 10))
        foto(app, "10-konto-abo")

        // Stripe verbinden: Einrichtung im Simulator-Safari (Stripe-Nachbau des lokalen Servers), zurück, Status prüfen → Kasse offen
        guard zusatz.isEmpty else { return }
        tabWaehlen(app, "Kasse")
        XCTAssertTrue(stripe.waitForExistence(timeout: 5))
        stripe.tap()
        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        XCTAssertTrue(safari.wait(for: .runningForeground, timeout: 15), "Safari öffnet nicht")
        let absenden = safari.buttons["Angaben absenden"]
        XCTAssertTrue(absenden.waitForExistence(timeout: 30), "Stripe-Nachbau zeigt keine Einrichtung")
        foto(app, "11-stripe-einrichtung-safari")
        absenden.tap()
        XCTAssertTrue(safari.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] %@", "Tattoofin-App")).firstMatch
            .waitForExistence(timeout: 15), "Rücksprung-Seite ohne Hinweis auf die App")
        foto(app, "12-stripe-zurueck")
        app.activate()
        let pruefen = app.buttons["status-pruefen"]
        if pruefen.waitForExistence(timeout: 5) { pruefen.tap() }
        let erstellen = app.buttons["Zahlungslink erstellen"]
        XCTAssertTrue(erstellen.waitForExistence(timeout: 20), "Kasse nach Stripe-Einrichtung nicht offen")
        foto(app, "13-kasse-offen")

        // Konto kündigen und löschen: Hinweis, das Apple-Abo zusätzlich bei Apple zu kündigen (nichts auslösen)
        tabWaehlen(app, "Konto")
        let loeschen = app.buttons["Konto kündigen und löschen"]
        // Die Liste lädt Zeilen erst beim Scrollen
        for _ in 0..<10 where !(loeschen.exists && loeschen.isHittable) { app.swipeUp() }
        XCTAssertTrue(loeschen.waitForExistence(timeout: 5))
        loeschen.tap()
        let appleKnopf = app.buttons["abo-bei-apple-kuendigen"]
        XCTAssertTrue(appleKnopf.waitForExistence(timeout: 10), "Apple-Hinweis beim Löschen fehlt")
        for _ in 0..<3 where !appleKnopf.isHittable { app.swipeUp() }
        foto(app, "14-loeschen-apple-hinweis")
    }

    /// „Abo schon gekauft? Käufe wiederherstellen“ ohne Kauf auf diesem Apple-Account → Hinweis, keine Anmeldung
    func testWiederherstellenOhneKauf() throws {
        try storeKitVorbereiten()
        let app = starten(email: "niemand@beispiel.test")
        let neu = app.buttons["neues-studio"]
        XCTAssertTrue(neu.waitForExistence(timeout: 15))
        neu.tap()
        let link = app.buttons["Abo schon gekauft? Käufe wiederherstellen"]
        XCTAssertTrue(link.waitForExistence(timeout: 5))
        for _ in 0..<3 where !link.isHittable { app.swipeUp() }
        link.tap()
        let hinweis = app.staticTexts["Auf diesem Apple-Account haben wir kein Tattoofin-Abo gefunden."]
        XCTAssertTrue(hinweis.waitForExistence(timeout: 30))
        foto(app, "15-wiederherstellen-kein-abo")
    }
}
