import XCTest

/// Studio-Wechsel (Version 1.2) Ende zu Ende im Simulator gegen den lokalen Server (dev/app-lokal.mjs, Code 123456):
/// zwei@beispiel.test ist Inhaber von „Ink Studio Hof“ und Team in „Ink Studio Bamberg“.
/// Anmelden (Auswahl mit Rolle) → Knopf oben → Liste (Name, Ort, Rolle, aktuelles markiert) → Wechsel ohne Code → Konto zeigt Rolle
/// → zurück über Konto → „Nur hier abmelden“ → im anderen Studio weiter → ganz abmelden. Dazu: ein Studio = kein Knopf,
/// dunkel + große Schrift mit Barrierefreiheits-Prüfung. Server-Port: TEST_RUNNER_TF_UI_API=http://localhost:<port>.
@MainActor
final class StudioWechselUITests: XCTestCase {
    private var praefix = ""

    private func starten(email: String, zusatz: [String] = []) -> XCUIApplication {
        continueAfterFailure = false
        let app = XCUIApplication()
        let api = ProcessInfo.processInfo.environment["TF_UI_API"] ?? "http://localhost:8888"
        app.launchArguments = ["-TFApiBase", api, "-TFTestEmail", email, "-TFZuruecksetzen", "YES", "-TFHinweisBleibt", "YES",
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

    private func codeEingeben(_ app: XCUIApplication) {
        let schicken = app.buttons["Code schicken"]
        XCTAssertTrue(schicken.waitForExistence(timeout: 15))
        schicken.tap()
        let code = app.textFields["Code mit 6 Ziffern"]
        XCTAssertTrue(code.waitForExistence(timeout: 10))
        code.tap()
        code.typeText("123456")
    }

    private func einrichtungUeberspringen(_ app: XCUIApplication) {
        let nichtJetzt = app.buttons["Nicht jetzt"]
        if nichtJetzt.waitForExistence(timeout: 15) { nichtJetzt.tap() }
        let spaeter = app.buttons["Später"]
        if spaeter.waitForExistence(timeout: 5) { spaeter.tap() }
        XCTAssertTrue(app.tabBars.buttons["Konto"].waitForExistence(timeout: 15), "Nach der Anmeldung keine Tabs")
    }

    private func zeile(_ app: XCUIApplication, _ titel: String) -> XCUIElement {
        app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", titel)).firstMatch
    }

    private func bisSichtbar(_ app: XCUIApplication, _ e: XCUIElement, hoch: Bool = true, versuche: Int = 10) {
        let leiste = app.tabBars.firstMatch
        let frei = { e.exists && e.isHittable && (!leiste.exists || e.frame.maxY < leiste.frame.minY - 4) }
        for _ in 0..<versuche where !frei() { hoch ? app.swipeUp() : app.swipeDown() }
    }

    /// Wert einer Zeile „Titel … Wert“ im Konto (WertZeile)
    private func kontoZeigt(_ app: XCUIApplication, _ text: String) -> Bool {
        app.staticTexts.matching(NSPredicate(format: "label == %@", text)).firstMatch.waitForExistence(timeout: 10)
    }

    /// Name des aktiven Studios im Knopf oben (Navigationsleiste)
    private func obenSteht(_ app: XCUIApplication, _ firma: String) -> Bool {
        app.navigationBars.staticTexts.matching(NSPredicate(format: "label == %@", firma)).firstMatch.waitForExistence(timeout: 15)
    }

    /// Jeder Befund wird protokolliert. Ausnahme 1 (wie im DS-Rundgang, Regel 2): „Schriftgröße“ an Elementen, die unten aus
    /// dem sichtbaren Bereich ragen – dort misst das Audit nicht zuverlässig (gescrollt ohne Befund). Alles andere zählt als Fehler.
    private static func protokoll(_ b: XCUIAccessibilityAuditIssue, _ durchgang: String) -> Bool {
        let wo = b.element.map { "\($0.elementType.rawValue) „\($0.label)“ \(Int($0.frame.minY))–\(Int($0.frame.maxY))" } ?? "–"
        let hoehe = XCUIApplication().windows.firstMatch.frame.height
        // 2. Ausnahme: Knöpfe in der Navigationsleiste (z. B. „Fertig“). iOS begrenzt deren Schrift selbst und zeigt bei langem
        //    Drücken die Großtext-Anzeige (Large Content Viewer); darauf hat die App keinen Einfluss.
        let inLeiste = b.element.map { $0.elementType == .button && $0.frame.maxY < 130 } ?? false
        let akzeptiert = b.auditType == .dynamicType && ((b.element?.frame.maxY ?? 0) > hoehe - 60 || inLeiste)
        print("WECHSEL-AUDIT \(akzeptiert ? "akzeptiert" : "BEFUND") \(durchgang): \(b.compactDescription) · \(wo) · \(b.detailedDescription)")
        return akzeptiert
    }

    // MARK: Zwei Studios

    func testWechselZwischenZweiStudios() throws {
        let app = starten(email: "zwei@beispiel.test")
        codeEingeben(app)

        // Auswahl beim Anmelden: Ort und Rolle je Studio
        let hof = zeile(app, "Ink Studio Hof")
        XCTAssertTrue(hof.waitForExistence(timeout: 15), "Studio-Auswahl fehlt")
        XCTAssertTrue(app.staticTexts["Hof · Inhaber"].exists, "Auswahl ohne Rolle (Hof)")
        XCTAssertTrue(app.staticTexts["Bamberg · Team"].exists, "Auswahl ohne Rolle (Bamberg)")
        foto("w01-auswahl-mit-rolle")
        hof.tap()
        einrichtungUeberspringen(app)

        // Knopf oben (erscheint, sobald die Liste geladen ist)
        let knopf = app.buttons["studio-wechsel-knopf"]
        XCTAssertTrue(knopf.waitForExistence(timeout: 15), "Knopf „Studio wechseln“ fehlt oben")
        XCTAssertEqual(knopf.label, "Studio wechseln")
        foto("w02-kasse-knopf-oben")
        knopf.tap()

        // Liste: Name, Ort, Rolle, aktuelles markiert
        let hofZeile = zeile(app, "Ink Studio Hof, Hof · Inhaber")
        let bambergZeile = zeile(app, "Ink Studio Bamberg, Bamberg · Team")
        XCTAssertTrue(hofZeile.waitForExistence(timeout: 10), "Hof fehlt in der Liste")
        XCTAssertTrue(bambergZeile.exists, "Bamberg fehlt in der Liste")
        XCTAssertTrue(hofZeile.isSelected, "Aktuelles Studio nicht markiert")
        XCTAssertFalse(bambergZeile.isSelected)
        XCTAssertTrue(app.staticTexts["Angemeldet als zwei@beispiel.test"].exists)
        foto("w03-liste")
        // Wie im DS-Rundgang: „Schriftgröße“ wird im Durchgang mit großer Schrift geprüft (unten), nicht hier
        try app.performAccessibilityAudit(for: [.contrast, .hitRegion, .sufficientElementDescription, .textClipped]) { b in
            Self.protokoll(b, "normal")
        }

        // Wechsel nach Bamberg (Team) ohne Code
        bambergZeile.tap()
        XCTAssertTrue(obenSteht(app, "Ink Studio Bamberg"), "Nach dem Wechsel steht oben nicht Bamberg")
        let hinweis = app.descendants(matching: .any)["wechsel-hinweis"].firstMatch
        XCTAssertTrue(hinweis.waitForExistence(timeout: 5), "Kein Hinweis nach dem Wechsel")
        XCTAssertEqual(hinweis.label, "Du bist jetzt in Ink Studio Bamberg.")
        hinweis.tap()   // Antippen schließt den Hinweis
        XCTAssertTrue(hinweis.waitForNonExistence(timeout: 5), "Hinweis lässt sich nicht wegtippen")
        XCTAssertFalse(app.buttons["Code schicken"].exists, "Wechsel hat einen neuen Code verlangt")
        foto("w04-gewechselt-bamberg")

        // Konto: Studio Bamberg, Rolle Team (Daten wirklich aus Bamberg)
        app.tabBars.buttons["Konto"].tap()
        XCTAssertTrue(kontoZeigt(app, "Ink Studio Bamberg"), "Konto zeigt nicht Bamberg")
        XCTAssertTrue(kontoZeigt(app, "Team"), "Rolle Team fehlt")
        foto("w05-konto-bamberg-team")

        // Zurück nach Hof über den Eintrag im Konto
        let wechselKonto = app.buttons["konto-studio-wechseln"]
        bisSichtbar(app, wechselKonto)
        XCTAssertTrue(wechselKonto.waitForExistence(timeout: 10), "Eintrag „Studio wechseln“ im Konto fehlt")
        wechselKonto.tap()
        let hofZeile2 = zeile(app, "Ink Studio Hof, Hof · Inhaber")
        XCTAssertTrue(hofZeile2.waitForExistence(timeout: 10))
        XCTAssertTrue(zeile(app, "Ink Studio Bamberg, Bamberg · Team").isSelected, "Nach dem Wechsel ist Bamberg nicht markiert")
        hofZeile2.tap()
        XCTAssertTrue(obenSteht(app, "Ink Studio Hof"), "Nach dem Wechsel zurück steht oben nicht Hof")
        let hinweisHof = app.descendants(matching: .any)["wechsel-hinweis"].firstMatch
        XCTAssertTrue(hinweisHof.waitForExistence(timeout: 5))
        XCTAssertEqual(hinweisHof.label, "Du bist jetzt in Ink Studio Hof.")
        hinweisHof.tap()
        app.tabBars.buttons["Konto"].tap()
        XCTAssertTrue(kontoZeigt(app, "Ink Studio Hof"), "Konto zeigt nicht Hof")
        XCTAssertTrue(kontoZeigt(app, "Inhaber (Hauptadresse)"), "Rolle Inhaber fehlt")

        // Abmelden: nur bei Hof → weiter in Bamberg
        let abmelden = app.buttons["konto-abmelden"]
        bisSichtbar(app, abmelden)
        abmelden.tap()
        let nurHier = app.buttons["Nur bei Ink Studio Hof"]
        XCTAssertTrue(nurHier.waitForExistence(timeout: 10), "Auswahl „Nur hier / alle“ fehlt")
        XCTAssertTrue(app.buttons["Bei allen Studios"].exists)
        foto("w06-abmelden-auswahl")
        nurHier.tap()
        XCTAssertTrue(obenSteht(app, "Ink Studio Bamberg"), "Nach „nur hier“ nicht in Bamberg")
        let weiter = app.descendants(matching: .any)["wechsel-hinweis"].firstMatch
        XCTAssertTrue(weiter.waitForExistence(timeout: 15), "Kein Hinweis nach „nur hier abmelden“")
        XCTAssertTrue(weiter.label.hasPrefix("Du bist bei Ink Studio Hof abgemeldet."), weiter.label)
        weiter.tap()
        app.tabBars.buttons["Konto"].tap()
        XCTAssertTrue(kontoZeigt(app, "Ink Studio Bamberg"), "Nach „nur hier“ nicht in Bamberg")
        foto("w07-nach-nur-hier")

        // Hof steht weiter in der Liste (wählbar), wird aber nicht von selbst wieder angemeldet → Abmelden fragt nicht mehr
        let abmelden2 = app.buttons["konto-abmelden"]
        bisSichtbar(app, abmelden2)
        abmelden2.tap()
        let jaAbmelden = app.alerts.buttons["Abmelden"]
        XCTAssertTrue(jaAbmelden.waitForExistence(timeout: 10), "Mit einem Zugang: normale Abmelde-Frage erwartet")
        jaAbmelden.tap()
        XCTAssertTrue(app.buttons["Code schicken"].waitForExistence(timeout: 15), "Nach dem Abmelden nicht auf der Anmeldung")
    }

    /// Dunkel + große Schrift: Knopf und Liste erreichbar, Prüfung ohne Befund
    func testWechselDunkelGrosseSchrift() throws {
        praefix = "dunkel-gross-"
        XCUIDevice.shared.appearance = .dark
        defer { XCUIDevice.shared.appearance = .light }
        let app = starten(email: "zwei@beispiel.test", zusatz: ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXL"])
        codeEingeben(app)
        let hof = zeile(app, "Ink Studio Hof")
        XCTAssertTrue(hof.waitForExistence(timeout: 15))
        hof.tap()
        einrichtungUeberspringen(app)
        app.tabBars.buttons["Konto"].tap()
        let knopf = app.buttons["studio-wechsel-knopf"]
        XCTAssertTrue(knopf.waitForExistence(timeout: 15), "Knopf fehlt bei großer Schrift")
        foto("w10-konto-knopf")
        knopf.tap()
        let bamberg = zeile(app, "Ink Studio Bamberg, Bamberg · Team")
        XCTAssertTrue(bamberg.waitForExistence(timeout: 10))
        foto("w11-liste")
        try app.performAccessibilityAudit(for: [.dynamicType, .contrast, .hitRegion, .sufficientElementDescription, .textClipped]) { b in
            Self.protokoll(b, "gross")
        }
        bamberg.tap()
        XCTAssertTrue(obenSteht(app, "Ink Studio Bamberg"), "Nach dem Wechsel steht oben nicht Bamberg")
        foto("w12-gewechselt")
    }

    // MARK: Mitteilung aus dem anderen Studio

    /// Nur mit TEST_RUNNER_TF_PUSH_TEST=1: Ein Skript schickt währenddessen per `xcrun simctl push` eine Zahlungs-Mitteilung mit
    /// studioId von Ink Studio Bamberg (Untertitel „Ink Studio Bamberg“). Antippen → App wechselt nach Bamberg und öffnet Zahlungen.
    func testMitteilungAusAnderemStudio() throws {
        try XCTSkipUnless(ProcessInfo.processInfo.environment["TF_PUSH_TEST"] == "1", "nur mit externem Push-Skript")
        let app = starten(email: "zwei@beispiel.test")
        codeEingeben(app)
        let hof = zeile(app, "Ink Studio Hof")
        XCTAssertTrue(hof.waitForExistence(timeout: 15))
        hof.tap()
        let nichtJetzt = app.buttons["Nicht jetzt"]
        if nichtJetzt.waitForExistence(timeout: 15) { nichtJetzt.tap() }
        // Erlaubnis bleibt je Simulator gespeichert: Schritt erscheint nur beim ersten Mal
        let erlauben = app.buttons["Mitteilungen erlauben"]
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        if erlauben.waitForExistence(timeout: 10) {
            erlauben.tap()
            let systemJa = springboard.buttons["Erlauben"]
            if systemJa.waitForExistence(timeout: 10) { systemJa.tap() }
        }
        let weiter = app.buttons["Später"]
        if weiter.waitForExistence(timeout: 5) { weiter.tap() }
        XCTAssertTrue(app.buttons["studio-wechsel-knopf"].waitForExistence(timeout: 20), "Liste nicht geladen")
        XCTAssertTrue(obenSteht(app, "Ink Studio Hof"))
        XCUIDevice.shared.press(.home)   // App im Hintergrund: Mitteilung kommt als Banner
        let banner = springboard.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", "Ink Studio Bamberg")).firstMatch
        XCTAssertTrue(banner.waitForExistence(timeout: 90), "Keine Mitteilung mit Studionamen angekommen")
        foto("w30-mitteilung-banner")
        banner.tap()
        // Sprung in die Zahlung (Detailseite im Tab Zahlungen), dann im Konto prüfen: aktives Studio ist Bamberg (Team)
        XCTAssertTrue(app.navigationBars["Zahlung"].waitForExistence(timeout: 15), "Antippen hat die Zahlung nicht geöffnet")
        XCTAssertTrue(app.tabBars.buttons["Zahlungen"].isSelected, "Antippen hat nicht den Tab Zahlungen gewählt")
        foto("w31-nach-antippen-zahlung")
        app.tabBars.buttons["Konto"].tap()
        XCTAssertTrue(kontoZeigt(app, "Ink Studio Bamberg"), "Antippen hat nicht nach Bamberg gewechselt")
        XCTAssertTrue(kontoZeigt(app, "Team"), "Rolle in Bamberg nicht Team")
        XCTAssertTrue(obenSteht(app, "Ink Studio Bamberg"))
        foto("w32-konto-bamberg")
    }

    // MARK: Ein Studio

    func testEinStudioOhneKnopf() throws {
        let app = starten(email: "studio@beispiel.test")
        codeEingeben(app)
        einrichtungUeberspringen(app)
        XCTAssertTrue(app.navigationBars["Kasse"].waitForExistence(timeout: 15))
        sleep(3)   // Liste ist geladen (Server antwortet lokal sofort)
        XCTAssertFalse(app.buttons["studio-wechsel-knopf"].exists, "Ein Studio: kein Knopf oben")
        app.tabBars.buttons["Konto"].tap()
        XCTAssertTrue(kontoZeigt(app, "Ink Studio Bamberg"))
        XCTAssertFalse(app.buttons["konto-studio-wechseln"].exists, "Ein Studio: kein Eintrag im Konto")
        let abmelden = app.buttons["konto-abmelden"]
        bisSichtbar(app, abmelden)
        abmelden.tap()
        XCTAssertTrue(app.alerts.buttons["Abmelden"].waitForExistence(timeout: 10), "Ein Studio: normale Abmelde-Frage")
        foto("w20-ein-studio-abmelden")
        app.alerts.buttons["Abbrechen"].tap()
    }
}
