import XCTest

/// DS-Rundgang: Vorlage für das UI-Test-Ziel jeder DS-App (referenzen/09-pruefung.md, Stufe 3).
/// Kopieren nach `<App>UITests/DSRundgangTests.swift` und `bildschirme` anpassen.
///
/// Prüft je Hauptbildschirm in normal, AX3 und dunkel:
///  1. Bildschirm wirklich da (eindeutige Kennung, nicht der Tab-Name)
///  2. Apples Barrierefreiheits-Prüfung (`performAccessibilityAudit`, ab iOS 17)
///  3. Bildschirmfoto als Anhang (für Blindtest und Abgabe; Export mit werkzeug/ds-test.sh)
/// Dazu die Startzeit (Messung, Zielwert erst nach der ersten Messung festlegen).
///
/// Voraussetzungen in der App:
///  - Wurzel: `.dsTestUmgebung()` (liest -ds-schrift, -ds-dunkel)
///  - `-ds-demo` lädt Demodaten ohne Server, `-ds-zuruecksetzen` löscht Sitzung und Entwürfe
///  - jeder Hauptbildschirm hat `.accessibilityIdentifier("bildschirm.<name>")` an seinem Inhalt
///
/// Nicht abgedeckt (bewusst, siehe 09): Tap-Zählung je Aufgabe (eigener Test je Aufgabe nach
/// dem Muster `testHauptaufgabe…` unten), Mitteilungen (von Hand am Gerät), Abo abgelaufen und
/// ohne Netz (brauchen Mock-Server mit `-ds-apibase`, Vorbild Tattoofin dev/netz-schalter.mjs).
final class DSRundgangTests: XCTestCase {

    /// Tab-Beschriftung → Kennung des Bildschirminhalts
    private let bildschirme: [(tab: String, kennung: String)] = [
        ("Heute", "bildschirm.heute"),
        ("Kalender", "bildschirm.kalender"),
        ("Anfragen", "bildschirm.anfragen"),
        ("Konto", "bildschirm.konto"),
    ]

    override func setUp() {
        continueAfterFailure = true
    }

    @MainActor func testRundgangNormal() throws { try rundgang([], name: "normal") }
    @MainActor func testRundgangGrosseSchrift() throws { try rundgang(["-ds-schrift", "AX3"], name: "AX3") }
    @MainActor func testRundgangDunkel() throws { try rundgang(["-ds-dunkel"], name: "dunkel") }

    @MainActor
    private func rundgang(_ argumente: [String], name: String) throws {
        let app = XCUIApplication()
        app.launchArguments = ["-ds-demo", "-ds-zuruecksetzen"] + argumente
        app.launch()

        for (tab, kennung) in bildschirme {
            let knopf = app.tabBars.buttons[tab]
            XCTAssertTrue(knopf.waitForExistence(timeout: 5), "Tab \(tab) fehlt")
            knopf.tap()
            let inhalt = app.descendants(matching: .any)[kennung]
            XCTAssertTrue(inhalt.waitForExistence(timeout: 5), "Bildschirm \(kennung) erscheint nicht")

            let foto = XCTAttachment(screenshot: app.screenshot())
            foto.name = "\(name)-\(tab)"
            foto.lifetime = .keepAlways
            add(foto)

            // Die Closure entscheidet je Befund: true = ignorieren, false = melden.
            // Bekannte, bewusst akzeptierte Befunde hier einzeln und begründet ausnehmen, nie pauschal.
            try app.performAccessibilityAudit { _ in false }
        }
    }

    /// Muster für eine Hauptaufgabe mit Tap-Budget (Budget aus dem Brief, ab App-Start gezählt).
    @MainActor
    func testHauptaufgabeBeispiel() throws {
        let app = XCUIApplication()
        app.launchArguments = ["-ds-demo", "-ds-zuruecksetzen"]
        app.launch()
        var taps = 0
        func tippe(_ e: XCUIElement) { XCTAssertTrue(e.waitForExistence(timeout: 5)); e.tap(); taps += 1 }

        tippe(app.tabBars.buttons["Anfragen"])
        tippe(app.cells.firstMatch)
        tippe(app.buttons["Antworten"])
        // … Weg der Aufgabe zu Ende gehen, Tastatureingaben zählen nicht

        let budget = 3
        XCTAssertLessThanOrEqual(taps, budget, "Hauptaufgabe braucht \(taps) Taps, Budget \(budget)")
    }

    /// Startzeit messen (Kaltstart). Ergebnis in abgabe.md, Zielwert nach der ersten Messung festlegen.
    @MainActor
    func testStartzeit() throws {
        measure(metrics: [XCTApplicationLaunchMetric()]) {
            let app = XCUIApplication()
            app.launchArguments = ["-ds-demo"]
            app.launch()
        }
    }
}
