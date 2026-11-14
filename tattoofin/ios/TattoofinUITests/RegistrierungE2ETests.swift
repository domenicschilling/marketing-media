import StoreKitTest
import XCTest

/// Abnahme-Lauf „Neues Studio in der App“ mit Bildschirmfotos r01 … r2x (Anhänge, Export mit `xcrun xcresulttool export attachments`).
/// Gegen den lokalen Server (`dev/app-lokal.mjs`, Code 123456). Für „Netz weg“ läuft die App über einen schaltbaren
/// Vorschalt-Proxy: TEST_RUNNER_TF_UI_API=http://localhost:8890 und TEST_RUNNER_TF_UI_NETZ=http://localhost:8890/__netz
/// (…/aus trennt jede Anfrage, …/an leitet wieder an 8888 weiter). Ohne TF_UI_NETZ werden die Netz-Schritte übersprungen.
@MainActor
final class RegistrierungE2ETests: XCTestCase {
    private var sitzung: SKTestSession!
    private var praefix = ""
    private let env = ProcessInfo.processInfo.environment

    /// Der erste Test im Runner-Prozess bekommt die StoreKit-Testsitzung nicht (Produkt „nicht gefunden“, auch beim zweiten
    /// Versuch). Ab der zweiten Sitzung wirkt sie → einmal Sitzung + App-Start zum Aufwärmen, dann eine frische Sitzung.
    private static var aufgewaermt = false

    private func neueSitzung() throws -> SKTestSession {
        let s = try SKTestSession(configurationFileNamed: "Tattoofin")
        s.resetToDefaultState()
        s.clearTransactions()
        s.disableDialogs = true
        s.askToBuyEnabled = false
        s.storefront = "DEU"
        s.locale = Locale(identifier: "de_DE")
        return s
    }

    private func storeKitVorbereiten() throws {
        continueAfterFailure = false
        if !Self.aufgewaermt {
            Self.aufgewaermt = true
            _ = try neueSitzung()
            let app = XCUIApplication()
            app.launchArguments = ["-TFZuruecksetzen", "YES"]
            app.launch()
            _ = app.buttons["neues-studio"].waitForExistence(timeout: 15)
            app.terminate()
        }
        sitzung = try neueSitzung()
    }

    private func starten(email: String, zusatz: [String] = []) -> XCUIApplication {
        let app = XCUIApplication()
        let api = env["TF_UI_API"] ?? "http://localhost:8888"
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

    /// Netz für die App an/aus (über den Vorschalt-Proxy). false = Schalter nicht vorhanden.
    @discardableResult
    private func netz(_ an: Bool) async -> Bool {
        guard let basis = env["TF_UI_NETZ"], let url = URL(string: basis + (an ? "/an" : "/aus")) else { return false }
        _ = try? await URLSession.shared.data(from: url)
        return true
    }

    private func neueEmail() -> String { "neu-\(Int(Date().timeIntervalSince1970))-\(Int.random(in: 100...999))@beispiel.test" }

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
        s.coordinate(withNormalizedOffset: CGVector(dx: 0.97, dy: 0.5)).tap()
    }

    private func sichtbar(_ app: XCUIApplication, _ e: XCUIElement, versuche: Int = 6) {
        for _ in 0..<versuche where !(e.exists && e.isHittable) { app.swipeUp() }
    }

    private func codeEingeben(_ app: XCUIApplication) {
        let code = app.textFields["6-stelliger Code"]
        XCTAssertTrue(code.waitForExistence(timeout: 10), "Code-Feld fehlt")
        code.tap()
        code.typeText("123456")
    }

    /// R0 → R5 (Abo-Bildschirm). Mit `fotos` werden r01–r06 aufgenommen.
    private func bisZumAbo(_ app: XCUIApplication, fotos: Bool) {
        let neu = app.buttons["neues-studio"]
        XCTAssertTrue(neu.waitForExistence(timeout: 20))
        if fotos { foto("r01-anmelden-konto-anlegen") }
        sichtbar(app, neu)
        neu.tap()

        let schicken = app.buttons["reg-code-schicken"]
        XCTAssertTrue(schicken.waitForExistence(timeout: 5))
        if fotos { foto("r02-email-bestaetigen") }
        sichtbar(app, schicken)
        let code = app.textFields["6-stelliger Code"]
        // Tipp während der Seiten-Animation geht manchmal verloren → bis zu 3 Versuche
        for _ in 0..<3 where !code.exists {
            if schicken.isHittable { schicken.tap() }
            _ = code.waitForExistence(timeout: 6)
        }
        XCTAssertTrue(code.waitForExistence(timeout: 4))
        if fotos { foto("r03-code") }
        code.tap()
        code.typeText("123456")

        let firma = app.textFields["feld-firma"]
        XCTAssertTrue(firma.waitForExistence(timeout: 10))
        firma.tap()
        app.typeText("Ink Test Studio\n")
        app.typeText("Lena Test\n")
        app.typeText("Hauptstraße 1\n")
        app.typeText("96047"); tastaturWeiter(app)
        app.typeText("Bamberg\n")
        app.typeText("015123456789"); tastaturWeiter(app)
        app.typeText("0951123456"); tastaturWeiter(app)
        app.swipeDown()
        if fotos { foto("r04-studio-angaben-ausgefuellt") }
        let weiter = app.buttons["angaben-weiter"]
        sichtbar(app, weiter)
        weiter.tap()

        XCTAssertTrue(app.switches["schalter-unternehmer"].waitForExistence(timeout: 5))
        for id in ["schalter-unternehmer", "schalter-kmu", "schalter-vertrag", "schalter-avv"] { schalterAn(app, id) }
        if fotos { foto("r05-bestaetigungen-vertraege") }
        let zumAbo = app.buttons["weiter-zum-abo"]
        sichtbar(app, zumAbo)
        zumAbo.tap()

        // Erster Start nach frischer Installation: StoreKit-Test lädt das Produkt manchmal erst beim zweiten Versuch → „Nochmal versuchen“
        let kaufen = app.buttons["abo-kaufen"], nochmal = app.buttons["Nochmal versuchen"]
        let bis = Date().addingTimeInterval(20)
        while Date() < bis && !kaufen.exists && !nochmal.exists { _ = kaufen.waitForExistence(timeout: 1) }
        if nochmal.exists {
            if fotos { foto("r06x-fehler-abo-laedt-nicht") }
            nochmal.tap()
        }
        XCTAssertTrue(kaufen.waitForExistence(timeout: 20), "Abo-Bildschirm kommt nicht")
        let preis = app.otherElements["abo-preis"].exists ? app.otherElements["abo-preis"] : app.descendants(matching: .any)["abo-preis"]
        XCTAssertTrue(preis.label.contains("49,90"), "Preis aus StoreKit fehlt: \(preis.label)")
        XCTAssertTrue(preis.label.contains("7 Tage kostenlos"), "Gratis-Woche fehlt: \(preis.label)")
        XCTAssertTrue(kaufen.label.contains("7 Tage kostenlos starten"), "Kaufknopf ohne Gratis-Woche: \(kaufen.label)")
    }

    /// Nach dem Kauf: Einrichtung (Face ID, Mitteilungen) bis zur Kasse
    private func einrichtung(_ app: XCUIApplication, fotos: Bool) {
        let nichtJetzt = app.buttons["Nicht jetzt"]
        if nichtJetzt.waitForExistence(timeout: 25) {
            if fotos { foto("r09-einrichtung-face-id") }
            nichtJetzt.tap()
        }
        let spaeter = app.buttons["Später"]
        if spaeter.waitForExistence(timeout: 5) {
            if fotos { foto("r10-einrichtung-mitteilungen") }
            spaeter.tap()
        }
    }

    private func abmelden(_ app: XCUIApplication) {
        tabWaehlen(app, "Konto")
        let ab = app.buttons["Abmelden"].firstMatch
        for _ in 0..<12 where !(ab.exists && ab.isHittable) { app.swipeUp() }
        XCTAssertTrue(ab.waitForExistence(timeout: 5), "Abmelden fehlt")
        ab.tap()
        let ja = app.alerts.buttons["Abmelden"]
        XCTAssertTrue(ja.waitForExistence(timeout: 5), "Rückfrage Abmelden fehlt")
        ja.tap()
        XCTAssertTrue(app.buttons["neues-studio"].waitForExistence(timeout: 10), "Nach dem Abmelden kein Anmeldebildschirm")
    }

    /// Ganzer Ablauf hell: Anlegen, Kauf abgebrochen, Netz weg beim Bestätigen, Kauf, Einrichtung, Kasse, Konto, Stripe,
    /// Löschen-Hinweis, Abmelden, wieder anmelden, Käufe wiederherstellen.
    func testAbnahmeKomplett() async throws {
        try storeKitVorbereiten()
        let email = neueEmail()
        let app = starten(email: email)
        bisZumAbo(app, fotos: true)
        foto("r06-abo-preis-aus-storekit")
        app.swipeUp()
        foto("r06b-abo-kleingedrucktes-links")
        let kaufen = app.buttons["abo-kaufen"]
        for _ in 0..<3 where !kaufen.isHittable { app.swipeDown() }

        // Fehlerfall: Kauf abgebrochen (StoreKit meldet „vom Nutzer abgebrochen“) → kein Fehlertext, Abo-Bildschirm bleibt
        try await sitzung.setSimulatedError(.generic(.userCancelled), forAPI: .purchase)
        kaufen.tap()
        try await Task.sleep(for: .seconds(3))
        XCTAssertTrue(kaufen.exists && kaufen.label == "7 Tage kostenlos starten", "Nach Abbruch nicht mehr auf dem Abo-Bildschirm: \(kaufen.label)")
        foto("r07-fehler-kauf-abgebrochen")
        try await sitzung.setSimulatedError(nil, forAPI: .purchase)

        // Fehlerfall: Netz weg, während der Server den Kauf bestätigen soll → „Kauf ist bei Apple durch …“ + „Nochmal versuchen“
        if await netz(false) {
            kaufen.tap()
            let meldung = app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "Kauf ist bei Apple durch")).firstMatch
            XCTAssertTrue(meldung.waitForExistence(timeout: 30), "Meldung bei Netzfehler nach dem Kauf fehlt")
            for _ in 0..<3 where !kaufen.isHittable { app.swipeDown() }
            foto("r08-fehler-netz-weg-nach-kauf")
            await netz(true)
            XCTAssertTrue(kaufen.label.contains("Nochmal"), "Knopf heißt nicht „Nochmal versuchen“: \(kaufen.label)")
            kaufen.tap()
        } else {
            kaufen.tap()
        }

        einrichtung(app, fotos: true)
        let stripe = app.buttons["stripe-einrichten"]
        XCTAssertTrue(stripe.waitForExistence(timeout: 20), "Kasse zeigt keine Stripe-Karte")
        foto("r11-kasse-stripe-hinweis")

        tabWaehlen(app, "Konto")
        XCTAssertTrue(app.staticTexts["Apple (App Store)"].waitForExistence(timeout: 10))
        foto("r12-konto-abo-ueber-apple")

        // Stripe verbinden (Nachbau im Simulator-Safari) → Kasse offen
        tabWaehlen(app, "Kasse")
        XCTAssertTrue(stripe.waitForExistence(timeout: 5))
        stripe.tap()
        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        XCTAssertTrue(safari.wait(for: .runningForeground, timeout: 15), "Safari öffnet nicht")
        let absenden = safari.buttons["Angaben absenden"]
        XCTAssertTrue(absenden.waitForExistence(timeout: 30), "Stripe-Nachbau zeigt keine Einrichtung")
        foto("r13-stripe-einrichtung-safari")
        absenden.tap()
        XCTAssertTrue(safari.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] %@", "Tattoofin-App")).firstMatch
            .waitForExistence(timeout: 15), "Rücksprung-Seite ohne Hinweis auf die App")
        foto("r14-stripe-fertig-zurueck-zur-app")
        app.activate()
        let pruefen = app.buttons["status-pruefen"]
        if pruefen.waitForExistence(timeout: 5) { pruefen.tap() }
        XCTAssertTrue(app.buttons["Zahlungslink erstellen"].waitForExistence(timeout: 20), "Kasse nach Stripe-Einrichtung nicht offen")
        foto("r15-kasse-offen")

        // Konto kündigen und löschen: nur ansehen (Hinweis Apple-Abo), nichts auslösen
        tabWaehlen(app, "Konto")
        let loeschen = app.buttons["Konto kündigen und löschen"]
        for _ in 0..<10 where !(loeschen.exists && loeschen.isHittable) { app.swipeUp() }
        XCTAssertTrue(loeschen.waitForExistence(timeout: 5))
        loeschen.tap()
        let appleKnopf = app.buttons["abo-bei-apple-kuendigen"]
        XCTAssertTrue(appleKnopf.waitForExistence(timeout: 10), "Apple-Hinweis beim Löschen fehlt")
        foto("r16-konto-loeschen-oben")
        for _ in 0..<3 where !appleKnopf.isHittable { app.swipeUp() }
        foto("r17-konto-loeschen-apple-hinweis")
        app.navigationBars.buttons.firstMatch.tap()

        // Abmelden und mit derselben Adresse wieder anmelden
        abmelden(app)
        foto("r18-abgemeldet")
        let feld = app.textFields["anmelden-email"]
        XCTAssertEqual(feld.value as? String, email, "Adresse nicht vorbelegt")
        app.buttons["Code schicken"].firstMatch.tap()
        codeEingeben(app)
        einrichtung(app, fotos: false)
        XCTAssertTrue(app.buttons["Zahlungslink erstellen"].waitForExistence(timeout: 20), "Nach erneuter Anmeldung keine offene Kasse")
        foto("r19-wieder-angemeldet-kasse")

        // Käufe wiederherstellen (abgemeldet, Abo auf diesem Apple-Account) → Hinweis „gehört zu s•••@…“, zurück zur Anmeldung
        abmelden(app)
        app.buttons["neues-studio"].tap()
        let link = app.buttons["Abo schon gekauft? Käufe wiederherstellen"]
        XCTAssertTrue(link.waitForExistence(timeout: 5))
        sichtbar(app, link, versuche: 3)
        link.tap()
        let hinweis = app.staticTexts.containing(NSPredicate(format: "label BEGINSWITH %@", "Dieses Abo gehört zu")).firstMatch
        XCTAssertTrue(hinweis.waitForExistence(timeout: 30), "Wiederherstellen zeigt keinen Hinweis auf die Adresse")
        foto("r20-kaeufe-wiederhergestellt-hinweis")
    }

    /// Adresse hat schon ein Studio → Registrieren meldet direkt an (kein zweites Studio). Davor: Netz weg beim Code anfordern.
    func testAdresseSchonVorhandenUndNetzWeg() async throws {
        try storeKitVorbereiten()
        let app = starten(email: "studio@beispiel.test")
        let neu = app.buttons["neues-studio"]
        XCTAssertTrue(neu.waitForExistence(timeout: 20))
        neu.tap()
        let schicken = app.buttons["reg-code-schicken"]
        XCTAssertTrue(schicken.waitForExistence(timeout: 5))
        if await netz(false) {
            schicken.tap()
            let fehler = app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "Keine Verbindung")).firstMatch
            XCTAssertTrue(fehler.waitForExistence(timeout: 30), "Netzfehler wird nicht angezeigt")
            foto("r21-fehler-netz-weg-code")
            await netz(true)
        }
        schicken.tap()
        codeEingeben(app)
        einrichtung(app, fotos: false)
        XCTAssertTrue(app.tabBars.buttons["Kasse"].waitForExistence(timeout: 20), "Bekannte Adresse wird nicht angemeldet")
        foto("r22-adresse-vorhanden-direkt-angemeldet")
    }

    /// Abo-Bildschirm im Dunkelmodus mit großer Schrift
    func testAboDunkelGrosseSchrift() async throws {
        try storeKitVorbereiten()
        XCUIDevice.shared.appearance = .dark
        defer { XCUIDevice.shared.appearance = .light }
        let app = starten(email: neueEmail(), zusatz: ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityL"])
        bisZumAbo(app, fotos: false)
        foto("r23-abo-dunkel-grosse-schrift-oben")
        app.swipeUp()
        foto("r24-abo-dunkel-grosse-schrift-mitte")
        app.swipeUp()
        foto("r25-abo-dunkel-grosse-schrift-unten")
    }

    /// Testkauf ohne Stripe-Einrichtung (wie Sandbox/TestFlight/App Review live): Kasse offen im Testmodus, Zahlungslink mit
    /// „Testzahlung auslösen“ → bezahlt. Konto hell und dunkel (Kontrast der Abschnittsköpfe), Vertrag mit „Sichern“ (PDF).
    /// Nur mit einem zweiten lokalen Server im Testmodus: TF_TESTMODUS=1 PORT=8899 STRIPE_MOCK_PORT=12199 node dev/app-lokal.mjs
    /// und TEST_RUNNER_TF_UI_TESTMODUS_API=http://localhost:8899
    func testTestmodusNachTestkauf() async throws {
        guard let api = env["TF_UI_TESTMODUS_API"] else { throw XCTSkip("TF_UI_TESTMODUS_API fehlt (Server mit TF_TESTMODUS=1)") }
        try storeKitVorbereiten()
        let app = XCUIApplication()
        app.launchArguments = ["-TFApiBase", api, "-TFTestEmail", neueEmail(), "-TFZuruecksetzen", "YES",
                               "-AppleLanguages", "(de)", "-AppleLocale", "de_DE"]
        app.launch()
        bisZumAbo(app, fotos: false)
        app.buttons["abo-kaufen"].tap()
        einrichtung(app, fotos: false)
        let hinweis = app.descendants(matching: .any)["kasse-testmodus"]
        XCTAssertTrue(hinweis.waitForExistence(timeout: 25), "Kasse zeigt den Testmodus nicht")
        XCTAssertFalse(app.buttons["stripe-einrichten"].exists, "Testmodus darf keine Stripe-Einrichtung anbieten")
        foto("r27-kasse-testmodus-nach-testkauf")
        for t in ["1", "5", "0"] { app.buttons[t].firstMatch.tap() }
        let erstellen = app.buttons["Zahlungslink erstellen"]
        sichtbar(app, erstellen)
        erstellen.tap()
        let testzahlung = app.buttons["Testzahlung auslösen"]
        for _ in 0..<4 where !(testzahlung.exists && testzahlung.isHittable) { _ = testzahlung.waitForExistence(timeout: 3); app.swipeUp() }
        XCTAssertTrue(testzahlung.waitForExistence(timeout: 10), "Zahlungslink ohne „Testzahlung auslösen“")
        foto("r28-zahlungslink-testzahlung")
        testzahlung.tap()
        let bezahlt = app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "bezahlt")).firstMatch
        XCTAssertTrue(bezahlt.waitForExistence(timeout: 15), "Testzahlung wird nicht als bezahlt angezeigt")
        foto("r29-testzahlung-bezahlt")
        let fertig = app.buttons["Fertig"].firstMatch
        if fertig.exists { fertig.tap() } else { app.swipeDown(velocity: .fast) }

        tabWaehlen(app, "Konto")
        XCTAssertTrue(app.staticTexts["Apple (App Store)"].waitForExistence(timeout: 10))
        foto("r30-konto-abo-hell")
        XCUIDevice.shared.appearance = .dark
        defer { XCUIDevice.shared.appearance = .light }
        try await Task.sleep(for: .seconds(1))
        foto("r31-konto-abo-dunkel")
        XCUIDevice.shared.appearance = .light
        let vertrag = app.buttons["Vertrag"].firstMatch
        for _ in 0..<12 where !(vertrag.exists && vertrag.isHittable) { app.swipeUp() }
        vertrag.tap()
        let sichern = app.buttons["rechtsseite-sichern"]
        XCTAssertTrue(sichern.waitForExistence(timeout: 20), "Vertrag ohne „Sichern“")
        try await Task.sleep(for: .seconds(1))
        foto("r32-vertrag-mit-sichern")
        sichern.tap()
        // Teilen-Fenster mit dem erzeugten PDF (Vorschau „Vertrag“, Aktionen wie „In Dateien sichern“, „Drucken“)
        let teilen = app.otherElements["ActivityListView"]
        _ = teilen.waitForExistence(timeout: 15)
        try await Task.sleep(for: .seconds(6))
        foto("r33-vertrag-als-pdf-teilen")
    }

    /// Konto → „Abo verwalten“ öffnet Apples Abo-Verwaltung (StoreKit-Test)
    func testAboVerwalten() async throws {
        try storeKitVorbereiten()
        let app = starten(email: neueEmail())
        bisZumAbo(app, fotos: false)
        app.buttons["abo-kaufen"].tap()
        einrichtung(app, fotos: false)
        XCTAssertTrue(app.buttons["stripe-einrichten"].waitForExistence(timeout: 20))
        tabWaehlen(app, "Konto")
        let verwalten = app.buttons["Abo verwalten"]
        XCTAssertTrue(verwalten.waitForExistence(timeout: 10))
        verwalten.tap()
        try await Task.sleep(for: .seconds(5))
        foto("r26-abo-verwalten-apple")
    }
}
