import XCTest

/// Kasse (Befund 16.11.2026): Beim Tippen darf nichts über dem Ziffernblock verrutschen (sonst wird aus „5-0-0“ schnell 508 €),
/// und „Zahlungslink erstellen“ steht immer ohne Scrollen über der Tab-Leiste, auch auf dem iPhone SE.
/// Gegen den lokalen Server (dev/app-lokal.mjs, Code 123456), Port über TEST_RUNNER_TF_UI_API=http://localhost:<port>.
/// Läuft auf jedem Gerät; Abnahme auf dem iPhone 18 Pro und zusätzlich auf einem iPhone SE (3. Generation).
@MainActor
final class KasseLayoutUITests: XCTestCase {
    private func starten(zusatz: [String] = []) -> XCUIApplication {
        continueAfterFailure = false
        let app = XCUIApplication()
        let api = ProcessInfo.processInfo.environment["TF_UI_API"] ?? "http://localhost:8888"
        app.launchArguments = ["-TFApiBase", api, "-TFTestEmail", "studio@beispiel.test", "-TFZuruecksetzen", "YES",
                               "-AppleLanguages", "(de)", "-AppleLocale", "de_DE"] + zusatz
        app.launch()
        return app
    }

    private func foto(_ name: String) {
        let a = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        a.name = "k-" + name
        a.lifetime = .keepAlways
        add(a)
    }

    private func anmelden(_ app: XCUIApplication) {
        let schicken = app.buttons["Code schicken"]
        XCTAssertTrue(schicken.waitForExistence(timeout: 15))
        schicken.tap()
        let code = app.textFields["Code mit 6 Ziffern"]
        XCTAssertTrue(code.waitForExistence(timeout: 10))
        code.tap()
        code.typeText("123456")
        let nichtJetzt = app.buttons["Nicht jetzt"]
        if nichtJetzt.waitForExistence(timeout: 15) { nichtJetzt.tap() }
        let spaeter = app.buttons["Später"]
        if spaeter.waitForExistence(timeout: 5) { spaeter.tap() }
        XCTAssertTrue(app.tabBars.buttons["Kasse"].waitForExistence(timeout: 15), "Nach der Anmeldung keine Tabs")
    }

    /// Ganz zu sehen: nicht unter der Tab-Leiste und nicht unter der Navigationsleiste
    private func frei(_ app: XCUIApplication, _ e: XCUIElement) -> Bool {
        let leiste = app.tabBars.firstMatch
        let oben = app.navigationBars.firstMatch
        return e.exists && e.isHittable && (!leiste.exists || e.frame.maxY < leiste.frame.minY - 4)
            && (!oben.exists || e.frame.minY > oben.frame.maxY)
    }

    /// Ziffernblock ganz über dem angehefteten Knopf (nicht von ihm verdeckt)
    private func ueberKnopf(_ e: XCUIElement, _ knopf: XCUIElement) -> Bool {
        e.exists && e.isHittable && e.frame.maxY <= knopf.frame.minY + 0.5
    }

    /// In kleinen Schritten scrollen, bis das Element über dem angehefteten Knopf steht
    private func hochholen(_ app: XCUIApplication, _ e: XCUIElement, _ knopf: XCUIElement) {
        let f = app.windows.firstMatch
        for _ in 0..<10 where !ueberKnopf(e, knopf) {
            let a = f.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.55))
            a.press(forDuration: 0.05, thenDragTo: a.withOffset(CGVector(dx: 0, dy: -120)))
        }
        XCTAssertTrue(ueberKnopf(e, knopf), "Ziffernblock lässt sich nicht über den Knopf scrollen")
        XCTAssertTrue(frei(app, knopf), "Nach dem Scrollen: „Zahlungslink erstellen“ nicht mehr sichtbar")
    }

    private func taste(_ app: XCUIApplication, _ t: String) -> XCUIElement {
        app.buttons.matching(NSPredicate(format: "label == %@", t)).firstMatch
    }

    func testKnopfOhneScrollenUndTastenFest() throws {
        try ablauf(zusatz: [], name: "normal")
    }

    /// Große Schrift (xxxLarge, die Obergrenze der App): Knopf bleibt angeheftet
    func testKnopfOhneScrollenGrosseSchrift() throws {
        try ablauf(zusatz: ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryXXXL"], name: "gross", tastenPruefen: false)
    }

    private func ablauf(zusatz: [String], name: String, tastenPruefen: Bool = true) throws {
        let app = starten(zusatz: zusatz)
        anmelden(app)
        app.tabBars.buttons["Kasse"].tap()
        let erstellen = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Zahlungslink erstellen")).firstMatch
        XCTAssertTrue(erstellen.waitForExistence(timeout: 15), "„Zahlungslink erstellen“ fehlt")
        Thread.sleep(forTimeInterval: 1.5)   // Start-Bereich und Gebührenhinweis fertig geladen
        // Leere Kasse: Knopf ohne Scrollen sichtbar
        XCTAssertTrue(frei(app, erstellen), "Leer: „Zahlungslink erstellen“ ist ohne Scrollen nicht sichtbar")
        foto("\(name)-01-leer")

        let fuenf = taste(app, "5"), null = taste(app, "0")
        XCTAssertTrue(fuenf.exists && null.exists, "Ziffernblock fehlt")
        if tastenPruefen {
            XCTAssertGreaterThanOrEqual(fuenf.frame.height, 44, "Ziffern-Taste kleiner als 44 pt")
            // Normale Schrift, auch auf dem iPhone SE: der ganze Ziffernblock steht ohne Scrollen über dem Knopf
            XCTAssertTrue(ueberKnopf(null, erstellen), "Untere Ziffern-Reihe liegt unter „Zahlungslink erstellen“")
        } else {
            // Große Schrift: Scrollen ist erlaubt, der Knopf bleibt dabei angeheftet
            hochholen(app, null, erstellen)
        }
        // 5-0-0 tippen: Die Tasten dürfen sich dabei nicht bewegen (vorher schob der Gebührenhinweis alles nach unten)
        let vorher = fuenf.frame
        fuenf.tap()
        let nachErster = fuenf.frame
        null.tap()
        let nachZweiter = null.frame
        null.tap()
        XCTAssertEqual(vorher.minY, nachErster.minY, accuracy: 0.5, "Ziffernblock ist nach der ersten Ziffer verrutscht")
        XCTAssertEqual(null.frame.minY, nachZweiter.minY, accuracy: 0.5, "Ziffernblock ist beim Tippen verrutscht")
        let betrag = app.staticTexts.matching(NSPredicate(format: "label == %@", "Betrag")).firstMatch
        XCTAssertTrue(betrag.exists, "Betragsanzeige fehlt")
        XCTAssertEqual(betrag.value as? String, "500 Euro", "Statt 500 € wurde etwas anderes eingetippt")
        XCTAssertTrue(app.staticTexts["gebuehr-hinweis"].waitForExistence(timeout: 10), "Gebührenhinweis fehlt bei gültigem Betrag")
        XCTAssertTrue(frei(app, erstellen), "Mit Betrag: „Zahlungslink erstellen“ ist ohne Scrollen nicht sichtbar")
        XCTAssertTrue(erstellen.isEnabled, "Mit 500 € muss „Zahlungslink erstellen“ gehen")
        foto("\(name)-02-betrag-500")

        // Gesamt ↔ Anzahlung: Ziffernblock bleibt, wo er ist (gemessen zum Umschalter, falls zum Antippen gescrollt wird)
        let anzahlung = app.buttons["Anzahlung"].firstMatch, gesamt = app.buttons["Gesamtpreis"].firstMatch
        let abstand = { fuenf.frame.minY - anzahlung.frame.minY }
        let vorUmschalten = abstand()
        anzahlung.tap()
        Thread.sleep(forTimeInterval: 0.5)
        XCTAssertEqual(abstand(), vorUmschalten, accuracy: 0.5, "Ziffernblock springt beim Wechsel auf Anzahlung")
        XCTAssertTrue(frei(app, erstellen), "Anzahlung: „Zahlungslink erstellen“ ist nicht sichtbar")
        foto("\(name)-03-anzahlung")
        gesamt.tap()
        Thread.sleep(forTimeInterval: 0.5)
        XCTAssertEqual(abstand(), vorUmschalten, accuracy: 0.5, "Ziffernblock springt beim Wechsel zurück auf Gesamtpreis")

        // Löschen bis leer: wieder nichts verrutscht
        let loeschen = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Löschen")).firstMatch
        if !tastenPruefen { hochholen(app, loeschen, erstellen) }
        let vorLoeschen = loeschen.frame.minY
        XCTAssertTrue(ueberKnopf(loeschen, erstellen), "Löschen-Taste liegt unter „Zahlungslink erstellen“")
        for _ in 0..<3 { loeschen.tap() }
        XCTAssertEqual(loeschen.frame.minY, vorLoeschen, accuracy: 0.5, "Ziffernblock verrutscht beim Löschen")
        XCTAssertFalse(erstellen.isEnabled, "Ohne Betrag darf „Zahlungslink erstellen“ nicht gehen")
        foto("\(name)-04-wieder-leer")
    }
}
