import XCTest

/// Gutscheine (Prüfung 16.11.2026): sichtbarer Knopf „Gutschein verkaufen“, Code eintippen → Detail mit Titel und Zurück-Knopf,
/// alter Fehler verschwindet beim Weitertippen. Gegen den lokalen Server (dev/app-lokal.mjs, Code 123456).
/// Server-Port: TEST_RUNNER_TF_UI_API=http://localhost:<port>.
@MainActor
final class GutscheinSucheUITests: XCTestCase {
    private func foto(_ name: String) {
        let a = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        a.name = "g-" + name
        a.lifetime = .keepAlways
        add(a)
    }

    func testCodeSucheUndVerkaufenKnopf() throws {
        continueAfterFailure = false
        let app = XCUIApplication()
        let api = ProcessInfo.processInfo.environment["TF_UI_API"] ?? "http://localhost:8888"
        app.launchArguments = ["-TFApiBase", api, "-TFTestEmail", "studio@beispiel.test", "-TFZuruecksetzen", "YES",
                               "-AppleLanguages", "(de)", "-AppleLocale", "de_DE"]
        app.launch()

        let schicken = app.buttons["Code schicken"]
        XCTAssertTrue(schicken.waitForExistence(timeout: 15))
        schicken.tap()
        let codeFeld = app.textFields["Code mit 6 Ziffern"]
        XCTAssertTrue(codeFeld.waitForExistence(timeout: 10))
        codeFeld.tap()
        codeFeld.typeText("123456")
        if app.buttons["Nicht jetzt"].waitForExistence(timeout: 15) { app.buttons["Nicht jetzt"].tap() }
        if app.buttons["Später"].waitForExistence(timeout: 5) { app.buttons["Später"].tap() }
        XCTAssertTrue(app.tabBars.buttons["Gutscheine"].waitForExistence(timeout: 15), "Nach der Anmeldung keine Tabs")

        app.tabBars.buttons["Gutscheine"].tap()
        let verkaufen = app.buttons["gutschein-verkaufen"]
        XCTAssertTrue(verkaufen.waitForExistence(timeout: 10), "Großer Knopf „Gutschein verkaufen“ fehlt")
        XCTAssertTrue(verkaufen.label.contains("Gutschein verkaufen"), "Knopf ohne Text: \(verkaufen.label)")
        foto("01-liste-mit-verkaufen-knopf")

        // Einen echten Code aus der Liste nehmen (der lokale Server würfelt ihn bei jedem Start neu)
        let codeText = app.staticTexts.matching(NSPredicate(format: "label MATCHES %@", "GS-[A-Z0-9]{4}-[A-Z0-9]{4}")).firstMatch
        XCTAssertTrue(codeText.waitForExistence(timeout: 10), "Kein Gutschein mit Code in der Liste")
        let code = codeText.label

        let feld = app.textFields["Code eingeben"]
        XCTAssertTrue(feld.waitForExistence(timeout: 5))
        // Erst ein falscher Code: Fehler erscheint …
        feld.tap()
        feld.typeText("GS-ABCD-EFGH")
        app.buttons["Gutschein suchen"].tap()
        let fehler = app.descendants(matching: .any).matching(NSPredicate(format: "label BEGINSWITH %@", "Fehler:")).firstMatch
        XCTAssertTrue(fehler.waitForExistence(timeout: 10), "Kein Fehler bei falschem Code")
        foto("02-falscher-code")
        // … und verschwindet beim Weitertippen (Einfügen hinter den alten Code prüft FormatTests)
        feld.tap()
        feld.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: 1))
        XCTAssertFalse(fehler.waitForExistence(timeout: 1), "Alter Fehler steht nach dem Weitertippen noch da")
        feld.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: 14))
        feld.typeText(code)
        XCTAssertEqual(feld.value as? String, code, "Code wurde nicht übernommen")
        app.buttons["Gutschein suchen"].tap()

        // Detail mit Titel und Zurück-Knopf
        let titel = app.navigationBars["Gutschein"]
        XCTAssertTrue(titel.waitForExistence(timeout: 10), "Detail ohne Titel „Gutschein“")
        XCTAssertTrue(titel.buttons.firstMatch.exists, "Detail ohne Zurück-Knopf")
        foto("03-detail-nach-code-suche")
        titel.buttons.firstMatch.tap()
        XCTAssertTrue(verkaufen.waitForExistence(timeout: 5), "Zurück zur Liste klappt nicht")

        // Blatt „Gutschein verkaufen“: kurzer Titel, Abbrechen
        verkaufen.tap()
        XCTAssertTrue(app.navigationBars["Gutschein"].waitForExistence(timeout: 5), "Blatt mit kurzem Titel fehlt")
        foto("04-verkaufen-blatt")
        app.buttons["Abbrechen"].tap()
    }
}
