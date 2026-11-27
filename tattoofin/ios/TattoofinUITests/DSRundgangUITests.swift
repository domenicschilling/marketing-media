import XCTest

/// DS-Rundgang (DS APPKonzept, Kern-Stufe, 18.11.2026): alle 5 Tabs in normaler Schrift, AX3, AX5 (größte Schrift, seit 23.11.) und dunkel,
/// je Tab Apples Barrierefreiheits-Prüfung (`performAccessibilityAudit`) und ein Bildschirmfoto (ds-<art>-<tab>).
/// Gegen den lokalen Server wie die anderen Rundgänge (tattoofin/website: `node dev/app-lokal.mjs`, Code 123456),
/// Server-Port über TEST_RUNNER_TF_UI_API=http://localhost:<port>.
/// Bewusst akzeptierte Befunde werden unten in `akzeptiert` einzeln und mit Grund ausgenommen, nie pauschal.
@MainActor
final class DSRundgangUITests: XCTestCase {

    /// Tab-Beschriftung → Kennung des Bildschirminhalts (gesetzt in HauptView)
    private let bildschirme: [(tab: String, kennung: String)] = [
        ("Kasse", "bildschirm.kasse"),
        ("Zahlungen", "bildschirm.zahlungen"),
        ("Gutscheine", "bildschirm.gutscheine"),
        ("Werbung", "bildschirm.werbung"),
        ("Konto", "bildschirm.konto"),
    ]

    override func setUp() {
        continueAfterFailure = true
        XCUIDevice.shared.appearance = .light
    }

    override func tearDown() {
        XCUIDevice.shared.appearance = .light
    }

    func testRundgangNormal() throws { try rundgang([], name: "normal") }
    func testRundgangGrosseSchrift() throws {
        try rundgang(["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXL"], name: "AX3")
    }
    /// Größte Schrift (AX5): die App begrenzt nur den Ziffernblock der Kasse, alles andere wächst bis hierhin mit
    func testRundgangGroessteSchrift() throws {
        try rundgang(["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"], name: "AX5")
    }
    func testRundgangDunkel() throws {
        // Dunkel direkt im Test (simctl-Einstellung griff nach `simctl erase` nicht zuverlässig, siehe ParitaetRundgangUITests)
        XCUIDevice.shared.appearance = .dark
        try rundgang([], name: "dunkel")
    }

    private func rundgang(_ zusatz: [String], name: String) throws {
        let app = XCUIApplication()
        let api = ProcessInfo.processInfo.environment["TF_UI_API"] ?? "http://localhost:8888"
        app.launchArguments = ["-TFApiBase", api, "-TFTestEmail", "studio@beispiel.test", "-TFZuruecksetzen", "YES",
                               "-AppleLanguages", "(de)", "-AppleLocale", "de_DE"] + zusatz
        app.launch()
        anmelden(app)

        for (tab, kennung) in bildschirme {
            let knopf = app.tabBars.buttons[tab]
            XCTAssertTrue(knopf.waitForExistence(timeout: 10), "Tab \(tab) fehlt")
            knopf.tap()
            let inhalt = app.descendants(matching: .any)[kennung]
            XCTAssertTrue(inhalt.waitForExistence(timeout: 10), "Bildschirm \(kennung) erscheint nicht")
            // Daten ankommen lassen (Lade-Platzhalter sollen nicht geprüft werden)
            // 4 s: Zahlungen lädt Kennzahlen und Auszahlungs-Saldo nach, das Suchfeld setzt sich danach; vorher misst das Audit
            // mitten in der Bewegung „Kontrast“ an Kacheln, die ruhig 6:1 haben (Schlussprüfung 27.11.)
            Thread.sleep(forTimeInterval: 4)

            let foto = XCTAttachment(screenshot: app.screenshot())
            foto.name = "ds-\(name)-\(tab)"
            foto.lifetime = .keepAlways
            add(foto)

            // Untere Kante, ab der Inhalt verdeckt sein kann: Tab-Leiste bzw. fest angehefteter Hauptknopf der Kasse
            var leiste = app.tabBars.firstMatch.frame
            let fest = app.buttons["Zahlungslink erstellen"]
            if fest.exists, fest.frame.minY < leiste.minY, fest.frame.minY > 0 {
                leiste = CGRect(x: 0, y: fest.frame.minY, width: leiste.width, height: leiste.maxY - fest.frame.minY)
            }
            try app.performAccessibilityAudit { befund in
                let ok = Self.akzeptiert(befund, tabLeiste: leiste, durchgang: name)
                let wo = befund.element.map { "\($0.elementType.rawValue) „\($0.label)“ \(Int($0.frame.minY))–\(Int($0.frame.maxY))" } ?? "–"
                print("DS-AUDIT \(ok ? "akzeptiert" : "BEFUND") \(name)/\(tab): \(befund.compactDescription) · \(wo) · \(befund.detailedDescription)")
                return ok
            }
        }
    }

    /// Einzeln begründete Ausnahmen. Alles andere wird gemeldet.
    private static func akzeptiert(_ b: XCUIAccessibilityAuditIssue, tabLeiste: CGRect, durchgang: String) -> Bool {
        // 2) „Schriftgröße teilweise nicht änderbar“ nur im AX3-Durchgang werten: Dort wird das Wachsen der Schrift wirklich
        //    geprüft (dieser Befund kam dort nie). In normal/dunkel meldet das Audit Zeilen, die bei größerer Schrift absichtlich
        //    von nebeneinander auf untereinander umbrechen (DS-Regel, AnyLayout/ViewThatFits), als „nicht änderbar“.
        if b.auditType == .dynamicType, !["AX3", "AX5"].contains(durchgang) { return true }
        //    Auch in AX3/AX5: Elemente, die teilweise unter dem verdeckten Rand liegen (siehe 1), sind nicht zuverlässig messbar
        //    (iPhone 17e: Abschnittskopf „Verkaufte Gutscheine“ am unteren Rand; auf iPhone 17 frei sichtbar und ohne Befund).
        if b.auditType == .dynamicType, let e = b.element, !tabLeiste.isEmpty, e.frame.maxY > tabLeiste.minY - 60 { return true }
        guard let e = b.element else {
            // 4) Kontrast ohne zuordenbares Element (das Audit nennt nur „SwiftUI.AccessibilityNode“, keine Lage): nicht
            //    nachprüfbar, darum hier nicht als Fehler, aber als WARNUNG im Protokoll. Offen in ds-brief-kern.md (Handprüfung).
            if b.auditType == .contrast { print("DS-AUDIT WARNUNG Kontrast ohne Element: \(b.detailedDescription)"); return true }
            return false
        }
        // 1) Kontrast an Zeilen unter bzw. direkt über der durchsichtigen Tab-Leiste (Liquid Glass mit Kanten-Unschärfe von
        //    iOS 26) oder hinter dem fest angehefteten Knopf „Zahlungslink erstellen“: Das Audit misst gegen Glas bzw. Knopf
        //    statt gegen den Hintergrund. Gescrollt sind dieselben Zeilen frei und ohne Befund.
        if b.auditType == .contrast, !tabLeiste.isEmpty, e.frame.maxY > tabLeiste.minY - 60 { return true }
        // 3) Suchfeld „Kunde suchen“ ist das System-Suchfeld (.searchable, UIKit). Größe und Platzhalterfarbe bestimmt iOS.
        if e.elementType == .searchField { return true }
        // 5) Kennzahl-Kacheln in Zahlungen (Kennung „kpi-kachel“): Das Audit meldet dort in jeder Lage „Kontrast“, auch mit
        //    Tinte statt Grau (Versuch 27.11.). Nachgerechnet: Grau #4A5D72 auf Weiß 6,8:1, Tinte deutlich mehr. Vermutlich misst es
        //    den hellen Kachelrand mit. Darum akzeptiert, aber als WARNUNG im Protokoll (Handprüfung in befunde-1-1.md).
        //    Die Kennung kommt beim Audit nicht immer an, darum auch über die drei Beschriftungen.
        let kpiTitel = ["Umsatz diesen Monat", "Zahlungen diesen Monat", "Offene Links"]
        if b.auditType == .contrast, e.identifier == "kpi-kachel" || kpiTitel.contains(where: { e.label.contains($0) }) { print("DS-AUDIT WARNUNG Kontrast Kennzahl-Kachel: \(e.label)"); return true }
        return false
    }

    private func anmelden(_ app: XCUIApplication) {
        let schicken = app.buttons["Code schicken"]
        XCTAssertTrue(schicken.waitForExistence(timeout: 15), "Anmeldung erscheint nicht")
        schicken.tap()
        let code = app.textFields["Code mit 6 Ziffern"]
        XCTAssertTrue(code.waitForExistence(timeout: 10))
        code.tap()
        code.typeText("123456")
        let nichtJetzt = app.buttons["Nicht jetzt"]
        if nichtJetzt.waitForExistence(timeout: 15) { nichtJetzt.tap() }
        let spaeter = app.buttons["Später"]
        if spaeter.waitForExistence(timeout: 5) { spaeter.tap() }
        XCTAssertTrue(app.tabBars.buttons["Konto"].waitForExistence(timeout: 15), "Nach der Anmeldung keine Tabs")
    }
}
