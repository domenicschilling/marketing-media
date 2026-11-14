import XCTest

/// Ende zu Ende im Simulator gegen den lokalen Server (dev/app-lokal.mjs, Code 123456, Inhaber studio@beispiel.test):
/// Kasse (heute im Studio, Gebührenhinweis) → Zahlungsdetail (Nachweis als PDF) → Konto „Dein Studio“ → Einstellungen speichern →
/// Recht lesen und bestätigen → Fragebogen absenden → QR-Aufsteller (Vorschau, dunkel, anfordern bzw. Stripe-Checkout) → Stripe ansehen.
/// Bildschirmfotos als Anhänge (b01-… ), Export mit `xcrun xcresulttool export attachments`.
/// Server-Port: TEST_RUNNER_TF_UI_API=http://localhost:<port>. TEST_RUNNER_TF_UI_AUFSTELLER_KAUF=1, wenn der Server den Aufsteller
/// verkauft (AUFSTELLER_PAKETE=einmal): Dann läuft der Stripe-Checkout im Nachbau.
@MainActor
final class StudioMehrUITests: XCTestCase {
    private var praefix = ""

    private func starten(email: String = "studio@beispiel.test", zusatz: [String] = []) -> XCUIApplication {
        continueAfterFailure = false
        let app = XCUIApplication()
        let api = ProcessInfo.processInfo.environment["TF_UI_API"] ?? "http://localhost:8888"
        app.launchArguments = ["-TFApiBase", api, "-TFTestEmail", email, "-TFZuruecksetzen", "YES",
                               "-AppleLanguages", "(de)", "-AppleLocale", "de_DE"] + zusatz
        app.launch()
        return app
    }

    private func foto(_ name: String) {
        let a = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        a.name = praefix + name
        a.lifetime = .keepAlways
        add(a)
    }

    /// Anmelden mit festem Test-Code und Einrichtung überspringen
    private func anmelden(_ app: XCUIApplication) {
        let schicken = app.buttons["Code schicken"]
        XCTAssertTrue(schicken.waitForExistence(timeout: 15))
        schicken.tap()
        let code = app.textFields["6-stelliger Code"]
        XCTAssertTrue(code.waitForExistence(timeout: 10))
        code.tap()
        code.typeText("123456")
        let nichtJetzt = app.buttons["Nicht jetzt"]
        if nichtJetzt.waitForExistence(timeout: 15) { nichtJetzt.tap() }
        let spaeter = app.buttons["Später"]
        if spaeter.waitForExistence(timeout: 5) { spaeter.tap() }
        XCTAssertTrue(app.tabBars.buttons["Konto"].waitForExistence(timeout: 15), "Nach der Anmeldung keine Tabs")
    }

    private func bisSichtbar(_ app: XCUIApplication, _ e: XCUIElement, hoch: Bool = true, versuche: Int = 8) {
        // Sichtbar heißt auch: nicht unter der schwebenden Tab-Leiste
        let leiste = app.tabBars.firstMatch
        let frei = { e.exists && e.isHittable && (!leiste.exists || e.frame.maxY < leiste.frame.minY - 4) }
        for _ in 0..<versuche where !frei() { hoch ? app.swipeUp() : app.swipeDown() }
    }

    /// Zeile mit Titel und Untertitel (VoiceOver liest „Titel, Untertitel“)
    private func zeile(_ app: XCUIApplication, _ titel: String) -> XCUIElement {
        app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", titel)).firstMatch
    }

    private func zurueck(_ app: XCUIApplication) {
        app.navigationBars.buttons.element(boundBy: 0).tap()
    }

    func testDeinStudio() throws {
        try ablauf(zusatz: [])
    }

    /// Dunkelmodus mit großer Schrift: alles erreichbar
    func testDeinStudioDunkelGrosseSchrift() throws {
        praefix = "dunkel-gross-"
        XCUIDevice.shared.appearance = .dark
        defer { XCUIDevice.shared.appearance = .light }
        try ablauf(zusatz: ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityL"], kurz: true)
    }

    private func ablauf(zusatz: [String], kurz: Bool = false) throws {
        let app = starten(zusatz: zusatz)
        anmelden(app)

        // Kasse: Schalter „heute im Studio“ und Gebührenhinweis
        app.tabBars.buttons["Kasse"].tap()
        let heute = app.switches["heute-im-studio"]
        bisSichtbar(app, heute)
        XCTAssertTrue(heute.waitForExistence(timeout: 10), "Schalter „heute im Studio“ fehlt")
        for t in ["1", "2", "0"] { app.buttons[t].firstMatch.tap() }
        foto("b01-kasse-heute-gebuehr")
        XCTAssertTrue(app.staticTexts["gebuehr-hinweis"].waitForExistence(timeout: 10), "Gebührenhinweis fehlt")

        // Zahlungsdetail: Nachweis als PDF teilen
        if !kurz {
            app.tabBars.buttons["Zahlungen"].tap()
            let bezahlt = app.staticTexts["Jonas Beispiel"].firstMatch
            XCTAssertTrue(bezahlt.waitForExistence(timeout: 10))
            bezahlt.tap()
            let nachweis = app.buttons["nachweis-pdf"]
            bisSichtbar(app, nachweis)
            XCTAssertTrue(nachweis.waitForExistence(timeout: 10), "Knopf „Nachweis als PDF“ fehlt")
            nachweis.tap()
            // Teilen-Menü mit dem PDF
            XCTAssertTrue(app.otherElements["ActivityListView"].waitForExistence(timeout: 15) || app.navigationBars["UIActivityContentView"].waitForExistence(timeout: 5),
                          "Teilen-Menü kommt nicht")
            Thread.sleep(forTimeInterval: 2)   // Teilen-Menü fertig eingeblendet
            foto("b02-nachweis-teilen")
            let zu = app.buttons["Schließen"].firstMatch
            if zu.exists && zu.isHittable { zu.tap() } else { app.otherElements["ActivityListView"].swipeDown(velocity: .fast) }
            let weg = NSPredicate(format: "exists == false")
            expectation(for: weg, evaluatedWith: app.otherElements["ActivityListView"])
            waitForExpectations(timeout: 10)
            Thread.sleep(forTimeInterval: 1)
        }

        // Konto: Abschnitt „Dein Studio“
        app.tabBars.buttons["Konto"].tap()
        let einst = zeile(app, "Einstellungen")
        bisSichtbar(app, einst)
        XCTAssertTrue(einst.waitForExistence(timeout: 10), "Abschnitt „Dein Studio“ fehlt")
        foto("b03-konto-dein-studio")
        // Kleine Schritte (ein ganzer Wisch springt über den Abschnitt hinweg)
        let whatsapp = app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH %@", "Hilfe per WhatsApp")).firstMatch
        let liste = app.collectionViews.firstMatch
        for _ in 0..<8 where !(whatsapp.exists && whatsapp.isHittable && whatsapp.frame.maxY < app.tabBars.firstMatch.frame.minY - 4) {
            liste.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.6)).press(forDuration: 0.05, thenDragTo: liste.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.35)))
        }
        XCTAssertTrue(whatsapp.exists, "Hilfe per WhatsApp fehlt")
        foto("b03b-konto-dein-studio-unten")

        // Einstellungen: Ausweich-Anzahlung an, speichern
        bisSichtbar(app, einst, hoch: false)
        einst.tap()
        XCTAssertTrue(app.staticTexts["Anzahlungsbedingungen"].waitForExistence(timeout: 10))
        foto("b04-einstellungen")
        let ausweich = app.switches["Anzahlung als Ausweg anbieten"]
        bisSichtbar(app, ausweich)
        if ausweich.exists && (ausweich.value as? String) == "0" { ausweich.coordinate(withNormalizedOffset: CGVector(dx: 0.95, dy: 0.5)).tap() }
        let speichern = app.buttons["speichern-ausweich"]
        bisSichtbar(app, speichern)
        speichern.tap()
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "identifier == %@ AND label CONTAINS %@", "speichern-ausweich", "Gespeichert")).firstMatch
                        .waitForExistence(timeout: 10), "Speichern ohne Rückmeldung")
        foto("b05-einstellungen-gespeichert")
        app.swipeUp()
        foto("b05b-einstellungen-unten")
        zurueck(app)

        // Recht: lesen (Web-Ansicht, nur lesen) und bestätigen
        let recht = zeile(app, "Deine rechtliche Lage")
        XCTAssertTrue(recht.waitForExistence(timeout: 5))
        recht.tap()
        let lesen = app.buttons["recht-lesen"]
        XCTAssertTrue(lesen.waitForExistence(timeout: 10))
        foto("b06-recht")
        lesen.tap()
        XCTAssertTrue(app.webViews.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] %@", "Risiko")).firstMatch.waitForExistence(timeout: 20),
                      "Rechtliche Lage lädt nicht")
        foto("b07-recht-lesen")
        app.buttons["Fertig"].tap()
        let bestaetigen = app.buttons["recht-bestaetigen"]
        if bestaetigen.waitForExistence(timeout: 3) {
            // Ohne Häkchen: Hinweis
            bisSichtbar(app, bestaetigen)
            bestaetigen.tap()
            XCTAssertTrue(app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "Häkchen")).firstMatch.waitForExistence(timeout: 5)
                          || app.otherElements.containing(NSPredicate(format: "label CONTAINS %@", "Häkchen")).firstMatch.exists)
            app.descendants(matching: .any)["recht-haken"].firstMatch.tap()
            foto("b07b-recht-bestaetigen")
            bestaetigen.tap()
        }
        XCTAssertTrue(app.staticTexts.containing(NSPredicate(format: "label BEGINSWITH %@", "Gelesen und bestätigt")).firstMatch.waitForExistence(timeout: 10)
                      || app.otherElements.containing(NSPredicate(format: "label BEGINSWITH %@", "Gelesen und bestätigt")).firstMatch.exists,
                      "Bestätigung fehlt")
        foto("b08-recht-bestaetigt")
        zurueck(app)

        // Fragebogen: absenden
        let frage = zeile(app, "Fragebogen")
        bisSichtbar(app, frage)
        frage.tap()
        let senden = app.buttons["Speichern und absenden"]
        XCTAssertTrue(app.staticTexts["1. Studio"].waitForExistence(timeout: 10) || app.staticTexts["1. STUDIO"].waitForExistence(timeout: 2))
        foto("b09-fragebogen")
        bisSichtbar(app, senden, versuche: 25)
        senden.tap()
        XCTAssertTrue(app.staticTexts.containing(NSPredicate(format: "label BEGINSWITH %@", "Danke, gespeichert")).firstMatch.waitForExistence(timeout: 10),
                      "Fragebogen ohne Rückmeldung")
        foto("b10-fragebogen-gesendet")
        zurueck(app)

        if kurz { return }

        // QR-Aufsteller: dunkles Holz, Vorschau, bestellen
        let aufsteller = app.buttons["aufsteller"]
        bisSichtbar(app, aufsteller)
        aufsteller.tap()
        XCTAssertTrue(app.segmentedControls.buttons["Dunkel"].waitForExistence(timeout: 15), "Aufsteller lädt nicht")
        foto("b11-aufsteller-hell")
        app.segmentedControls.buttons["Dunkel"].tap()
        foto("b12-aufsteller-dunkel")
        app.segmentedControls.buttons["Dein Logo"].tap()
        XCTAssertTrue(app.buttons["logo-waehlen"].waitForExistence(timeout: 5))
        foto("b13-aufsteller-logo-feld")
        app.segmentedControls.buttons["Studioname"].tap()
        let bestellen = app.buttons["aufsteller-bestellen"]
        bisSichtbar(app, bestellen)
        XCTAssertTrue(bestellen.waitForExistence(timeout: 5))
        foto("b14-aufsteller-bestellen")
        bestellen.tap()
        let kauf = ProcessInfo.processInfo.environment["TF_UI_AUFSTELLER_KAUF"] == "1"
        let ja = app.alerts.buttons[kauf ? "Weiter zur Bezahlung" : "Anfordern"]
        XCTAssertTrue(ja.waitForExistence(timeout: 5), "Rückfrage vor der Bestellung fehlt")
        foto("b15-aufsteller-frage")
        ja.tap()
        if kauf {
            // Stripe-Checkout (Nachbau) in der Safari-Ansicht: bezahlen, dann „Fertig“ → App prüft
            let bezahlen = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] %@", "Bezahlen")).firstMatch
            XCTAssertTrue(bezahlen.waitForExistence(timeout: 20), "Checkout öffnet nicht")
            foto("b16-aufsteller-checkout")
            bezahlen.tap()
            XCTAssertTrue(app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] %@", "Tattoofin-App")).firstMatch.waitForExistence(timeout: 20),
                          "Rücksprung-Seite fehlt")
            foto("b17-aufsteller-fertig-seite")
            app.buttons["Fertig"].firstMatch.tap()
        }
        XCTAssertTrue(app.staticTexts.containing(NSPredicate(format: "label BEGINSWITH %@", "Bestellt")).firstMatch.waitForExistence(timeout: 20)
                      || app.otherElements.containing(NSPredicate(format: "label BEGINSWITH %@", "Bestellt")).firstMatch.exists,
                      "Bestellung ohne Bestätigung")
        foto("b18-aufsteller-bestellt")
        zurueck(app)

        // Bei Stripe ansehen (Safari-Ansicht)
        let stripe = zeile(app, "Bei Stripe ansehen")
        bisSichtbar(app, stripe)
        if stripe.exists {
            stripe.tap()
            XCTAssertTrue(app.buttons["Fertig"].firstMatch.waitForExistence(timeout: 15), "Stripe-Ansicht öffnet nicht")
            Thread.sleep(forTimeInterval: 2)
            XCTAssertTrue(app.buttons["Fertig"].firstMatch.exists, "Stripe-Ansicht schließt sich von selbst")
            foto("b19-stripe-ansehen")
            app.buttons["Fertig"].firstMatch.tap()
        }
    }
}
