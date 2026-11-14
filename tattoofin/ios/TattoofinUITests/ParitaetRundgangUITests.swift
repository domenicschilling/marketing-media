import XCTest

/// Rundgang „Alles, was online geht, auch in der App“ (14.11.2026) gegen den lokalen Server (dev/app-lokal.mjs, Code 123456).
/// Je Bildschirm ein Bildschirmfoto als Anhang (p01-…), Export mit `xcrun xcresulttool export attachments`.
/// Server-Port: TEST_RUNNER_TF_UI_API=http://localhost:<port>.
///  - testInhaber: Kasse mit Start-Bereich, Werbung (Video, Speichern, Beiträge, Name, Großansicht, Zahlseiten-QR, Druck), So geht's,
///    Link mit „heute“, Nachweis-PDF, Einstellungen, Recht, Fragebogen, Aufsteller, Stripe, WhatsApp, zuletzt die Fotos-App.
///  - testTeam: team@beispiel.test, Inhaber-Funktionen gesperrt.  - testOhneKlarna: ohne@beispiel.test, kein Raten-Material.
///  - testDunkelGross: Werbung + Einstellungen (Simulator vorher dunkel stellen: xcrun simctl ui <udid> appearance dark).
///  - testZuletztAufstellerKauf (läuft nach testOhneKlarna, danach ist das Logo gesperrt): ohne@beispiel.test (Aufsteller nicht enthalten): Stripe-Checkout im Nachbau, Rückkehr, Prüfung.
@MainActor
final class ParitaetRundgangUITests: XCTestCase {
    private var praefix = "p"
    private var nr = 0
    private let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")

    private func starten(email: String, zusatz: [String] = []) -> XCUIApplication {
        continueAfterFailure = false
        let app = XCUIApplication()
        let api = ProcessInfo.processInfo.environment["TF_UI_API"] ?? "http://localhost:8888"
        app.launchArguments = ["-TFApiBase", api, "-TFTestEmail", email, "-TFZuruecksetzen", "YES",
                               "-AppleLanguages", "(de)", "-AppleLocale", "de_DE"] + zusatz
        app.launch()
        return app
    }

    private func foto(_ name: String) {
        nr += 1
        let a = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        a.name = String(format: "%@%02d-%@", praefix, nr, name)
        a.lifetime = .keepAlways
        add(a)
    }

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

    private func etwas(_ app: XCUIApplication, _ text: String) -> XCUIElement {
        app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", text)).firstMatch
    }

    private func knopf(_ app: XCUIApplication, _ text: String) -> XCUIElement {
        app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", text)).firstMatch
    }

    private func frei(_ app: XCUIApplication, _ e: XCUIElement) -> Bool {
        let leiste = app.tabBars.firstMatch
        let oben = app.navigationBars.firstMatch
        return e.exists && e.isHittable && (!leiste.exists || e.frame.maxY < leiste.frame.minY - 4)
            && (!oben.exists || e.frame.minY > oben.frame.maxY)
    }

    /// In kleinen Schritten scrollen, bis das Element frei sichtbar ist
    private func bisSichtbar(_ app: XCUIApplication, _ e: XCUIElement, hoch: Bool = true, versuche: Int = 30) {
        let f = app.windows.firstMatch
        for _ in 0..<versuche where !frei(app, e) {
            let a = f.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: hoch ? 0.7 : 0.35))
            let b = f.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: hoch ? 0.35 : 0.7))
            a.press(forDuration: 0.05, thenDragTo: b)
        }
    }

    /// Element an den oberen Rand holen (für Bildschirmfotos eines Abschnitts)
    private func nachOben(_ app: XCUIApplication, _ e: XCUIElement) {
        bisSichtbar(app, e)
        let f = app.windows.firstMatch
        let ziel = (app.navigationBars.firstMatch.exists ? app.navigationBars.firstMatch.frame.maxY : 60) + 20
        let dy = e.frame.minY - ziel
        if dy > 40 {
            let start = f.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.75))
            start.press(forDuration: 0.05, thenDragTo: start.withOffset(CGVector(dx: 0, dy: -min(dy, f.frame.height * 0.6))))
        }
        Thread.sleep(forTimeInterval: 0.8)
    }

    /// Nach „Speichern“: Fotos-Rückfrage von iOS (nur Hinzufügen) erlauben, falls sie kommt, und auf „In Fotos gespeichert“ warten
    /// (die Rückmeldung steht nur 2 Sekunden, deshalb beides in einer Schleife)
    private func gespeichert(_ app: XCUIApplication, _ name: String) {
        let ende = Date().addingTimeInterval(30)
        let meldung = etwas(app, "In Fotos gespeichert")
        while Date() < ende {
            if meldung.exists { foto(name); return }
            for t in ["Erlauben", "Zulassen", "Allow"] {
                let b = springboard.buttons[t].firstMatch
                if b.exists { foto("fotos-rueckfrage"); b.tap() }
            }
            if etwas(app, "nicht geklappt").exists || etwas(app, "darf nichts in Fotos").exists { break }
            Thread.sleep(forTimeInterval: 0.2)
        }
        foto(name + "-FEHLER")
        XCTFail("Keine Rückmeldung „In Fotos gespeichert“ (\(name))")
    }

    private func safariZu(_ app: XCUIApplication) {
        let fertig = app.buttons["Fertig"].firstMatch
        XCTAssertTrue(fertig.waitForExistence(timeout: 15), "Safari-Fenster ohne „Fertig“")
        fertig.tap()
        Thread.sleep(forTimeInterval: 1)
    }

    private func zurueck(_ app: XCUIApplication) {
        app.navigationBars.buttons.element(boundBy: 0).tap()
        Thread.sleep(forTimeInterval: 0.5)
    }

    private func teilenZu(_ app: XCUIApplication) {
        let zu = app.buttons["Schließen"].firstMatch
        if zu.exists && zu.isHittable { zu.tap() } else { app.otherElements["ActivityListView"].swipeDown(velocity: .fast) }
        expectation(for: NSPredicate(format: "exists == false"), evaluatedWith: app.otherElements["ActivityListView"])
        waitForExpectations(timeout: 10)
        Thread.sleep(forTimeInterval: 1)
    }

    // MARK: Inhaber (Ink Studio Bamberg, Klarna dauerhaft)

    func testInhaber() throws {
        let app = starten(email: "studio@beispiel.test")
        anmelden(app)

        // Kasse mit Start-Bereich
        app.tabBars.buttons["Kasse"].tap()
        let einrichtung = etwas(app, "Einrichtung:")
        XCTAssertTrue(einrichtung.waitForExistence(timeout: 15), "Checkliste fehlt")
        XCTAssertTrue(etwas(app, "Diesen Monat").exists, "„Diesen Monat“ fehlt")
        foto("kasse-start-bereich")
        einrichtung.tap()
        XCTAssertTrue(etwas(app, "Fragebogen ausfüllen").waitForExistence(timeout: 5) || etwas(app, "Fragebogen").exists)
        foto("kasse-checkliste-offen")
        // Knopf „Lesen“ öffnet die rechtliche Lage direkt
        let lesen = app.buttons["Lesen"].firstMatch
        if lesen.waitForExistence(timeout: 3) {
            bisSichtbar(app, lesen)
            lesen.tap()
            XCTAssertTrue(app.buttons["recht-lesen"].waitForExistence(timeout: 10), "„Lesen“ öffnet die rechtliche Lage nicht")
            foto("kasse-checkliste-recht-blatt")
            app.buttons["Fertig"].firstMatch.tap()
            Thread.sleep(forTimeInterval: 1)
        }

        // So geht's (Karte in der Kasse)
        let sg = knopf(app, "So geht's")
        bisSichtbar(app, sg, hoch: false)
        sg.tap()
        let kap = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Übersicht und Einrichtung")).firstMatch
        XCTAssertTrue(kap.waitForExistence(timeout: 10), "So geht's ohne Kapitel")
        XCTAssertFalse(etwas(app, "Startbildschirm").exists, "Web-App-Kapitel darf nicht erscheinen")
        foto("so-gehts")
        let kapitel3 = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", ", ab ")).element(boundBy: 2)
        bisSichtbar(app, kapitel3)
        kapitel3.tap()
        Thread.sleep(forTimeInterval: 4)
        app.swipeDown()
        Thread.sleep(forTimeInterval: 1)
        foto("so-gehts-kapitel-3-laeuft")
        let k3 = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", ", ab ")).element(boundBy: 2)
        bisSichtbar(app, k3)
        foto("so-gehts-kapitelliste")
        app.buttons["Fertig"].firstMatch.tap()
        Thread.sleep(forTimeInterval: 1)

        // Werbung
        app.tabBars.buttons["Werbung"].tap()
        let videoTitel = app.staticTexts["Dein Werbevideo"]
        XCTAssertTrue(videoTitel.waitForExistence(timeout: 15), "Werbevideo fehlt")
        foto("werbung-tab")
        let poster = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Video abspielen")).firstMatch
        bisSichtbar(app, poster)
        poster.tap()
        Thread.sleep(forTimeInterval: 4)
        foto("werbevideo-player-reel")
        app.buttons["Beitrag (4:5)"].firstMatch.tap()
        Thread.sleep(forTimeInterval: 1.5)
        foto("werbevideo-format-feed")
        let speichernVideo = knopf(app, "In Fotos speichern")
        bisSichtbar(app, speichernVideo)
        speichernVideo.tap()
        gespeichert(app, "werbevideo-gespeichert")
        let textZeigen = knopf(app, "Text zum Posten")
        bisSichtbar(app, textZeigen)
        textZeigen.tap()
        let kopieren = knopf(app, "Text kopieren")
        bisSichtbar(app, kopieren)
        kopieren.tap()
        XCTAssertTrue(etwas(app, "Kopiert").waitForExistence(timeout: 5))
        XCTAssertTrue(etwas(app, "Kreditaufnahme kostet Geld").exists, "Fußnote im Video-Text fehlt")
        foto("werbevideo-text-kopiert")

        // Beiträge
        let beitraege = app.staticTexts["Deine Beiträge"]
        nachOben(app, beitraege)
        foto("beitraege-kopf")
        let kachel = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Bild 1 von 4")).firstMatch
        XCTAssertTrue(kachel.waitForExistence(timeout: 40), "Karussell-Bilder werden nicht gezeichnet")
        // Name auf den Bildern ändern
        let name = app.textFields.firstMatch
        bisSichtbar(app, name, hoch: false)
        name.coordinate(withNormalizedOffset: CGVector(dx: 0.97, dy: 0.5)).tap()
        Thread.sleep(forTimeInterval: 0.5)
        name.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: 40))
        name.typeText("Tinte & Liebe")
        app.buttons["Übernehmen"].tap()
        Thread.sleep(forTimeInterval: 1)
        let neu = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Bild 1 von 4")).firstMatch
        XCTAssertTrue(neu.waitForExistence(timeout: 40))
        Thread.sleep(forTimeInterval: 4)
        nachOben(app, neu)
        foto("beitraege-kacheln-name-geaendert")
        // Großansicht
        neu.tap()
        let diesesBild = app.buttons["Dieses Bild speichern"]
        XCTAssertTrue(diesesBild.waitForExistence(timeout: 10), "Großansicht öffnet nicht")
        foto("beitrag-grossansicht-1")
        let fl = app.windows.firstMatch
        fl.coordinate(withNormalizedOffset: CGVector(dx: 0.85, dy: 0.4)).press(forDuration: 0.05, thenDragTo: fl.coordinate(withNormalizedOffset: CGVector(dx: 0.1, dy: 0.4)))
        Thread.sleep(forTimeInterval: 1)
        foto("beitrag-grossansicht-2")
        diesesBild.tap()
        gespeichert(app, "beitrag-grossansicht-gespeichert")
        app.buttons["Fertig"].firstMatch.tap()
        Thread.sleep(forTimeInterval: 1)
        let alle4 = knopf(app, "Alle 4 Bilder speichern")
        bisSichtbar(app, alle4)
        alle4.tap()
        gespeichert(app, "beitraege-alle-4-gespeichert")
        // weitere Vorlagen (QR-Story mit „Link kopieren“, Frag-Story mit Sticker-Text)
        let linkKop = knopf(app, "Link kopieren")
        nachOben(app, linkKop)
        foto("beitrag-qr-story")
        let sticker = knopf(app, "Sticker-Text kopieren")
        nachOben(app, sticker)
        foto("beitrag-frag-story")

        // Zahlseite
        let qrSpeichern = knopf(app, "QR-Code in Fotos speichern")
        nachOben(app, app.staticTexts["Deine Zahlseite"])
        foto("zahlseite-karte")
        bisSichtbar(app, qrSpeichern)
        qrSpeichern.tap()
        gespeichert(app, "zahlseite-qr-gespeichert")
        let ansehen = knopf(app, "Zahlseite ansehen")
        bisSichtbar(app, ansehen)
        ansehen.tap()
        Thread.sleep(forTimeInterval: 8)
        foto("zahlseite-ansehen-safari")
        safariZu(app)

        // Druckmaterial
        let druck = app.staticTexts["Zum Ausdrucken"]
        nachOben(app, druck)
        foto("druckmaterial-liste")
        let fenster = knopf(app, "Fensteraufkleber")
        bisSichtbar(app, fenster)
        fenster.tap()
        Thread.sleep(forTimeInterval: 6)
        foto("druckmaterial-fensteraufkleber-safari")
        safariZu(app)

        // Kasse: Link mit „heute im Studio“ und Gebührenhinweis
        app.tabBars.buttons["Kasse"].tap()
        let heute = app.switches["heute-im-studio"]
        bisSichtbar(app, heute)
        for t in ["2", "5", "0"] { app.buttons[t].firstMatch.tap() }
        bisSichtbar(app, heute)
        if (heute.value as? String) == "0" { heute.coordinate(withNormalizedOffset: CGVector(dx: 0.95, dy: 0.5)).tap() }
        XCTAssertEqual(heute.value as? String, "1", "Schalter „heute“ lässt sich nicht einschalten")
        XCTAssertTrue(app.staticTexts["gebuehr-hinweis"].exists, "Gebührenhinweis fehlt")
        foto("kasse-link-heute-gebuehr")
        let erstellen = knopf(app, "Zahlungslink erstellen")
        bisSichtbar(app, erstellen)
        erstellen.tap()
        Thread.sleep(forTimeInterval: 3)
        foto("kasse-link-erstellt")
        let fertigLink = app.buttons["Fertig"].firstMatch
        if fertigLink.waitForExistence(timeout: 3) { fertigLink.tap() } else { app.swipeDown() }

    }

    /// Teil 2 (nach testInhaber): Nachweis, Konto „Dein Studio“, Einstellungen, Recht, Fragebogen, Aufsteller, Stripe, WhatsApp, Fotos-App
    func testInhaberStudio() throws {
        praefix = "q"
        let app = starten(email: "studio@beispiel.test")
        anmelden(app)

        // Nachweis-PDF im Teilen-Menü
        app.tabBars.buttons["Zahlungen"].tap()
        XCTAssertTrue(etwas(app, "Lena Beispiel").waitForExistence(timeout: 10))
        foto("zahlungen-liste")
        let jonas = etwas(app, "Jonas Beispiel")
        bisSichtbar(app, jonas)
        XCTAssertTrue(jonas.exists, "Zahlung von Jonas fehlt in der Liste")
        jonas.tap()
        let nachweis = app.buttons["nachweis-pdf"]
        bisSichtbar(app, nachweis)
        nachweis.tap()
        XCTAssertTrue(app.otherElements["ActivityListView"].waitForExistence(timeout: 15), "Teilen-Menü kommt nicht")
        Thread.sleep(forTimeInterval: 2)
        foto("nachweis-pdf-teilen")
        teilenZu(app)
        zurueck(app)

        // Konto: Dein Studio
        app.tabBars.buttons["Konto"].tap()
        let einst = knopf(app, "Einstellungen")
        nachOben(app, einst)
        foto("konto-dein-studio")
        let whatsapp = etwas(app, "Hilfe per WhatsApp")
        bisSichtbar(app, whatsapp)
        foto("konto-dein-studio-unten")

        // Einstellungen
        bisSichtbar(app, einst, hoch: false)
        einst.tap()
        XCTAssertTrue(app.staticTexts["Anzahlungsbedingungen"].waitForExistence(timeout: 10) || etwas(app, "ANZAHLUNGSBEDINGUNGEN").exists)
        foto("einstellungen")
        let ausweich = app.switches["Anzahlung als Ausweg anbieten"]
        bisSichtbar(app, ausweich)
        if (ausweich.value as? String) == "0" { ausweich.coordinate(withNormalizedOffset: CGVector(dx: 0.95, dy: 0.5)).tap() }
        let sp = app.buttons["speichern-ausweich"]
        bisSichtbar(app, sp)
        sp.tap()
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "identifier == %@ AND label CONTAINS %@", "speichern-ausweich", "Gespeichert")).firstMatch.waitForExistence(timeout: 10))
        foto("einstellungen-ausweich-gespeichert")
        let mail = app.textFields.matching(NSPredicate(format: "label CONTAINS %@", "E-Mail")).firstMatch
        bisSichtbar(app, mail)
        foto("einstellungen-unten")
        zurueck(app)

        // Recht lesen und bestätigen
        let recht = knopf(app, "Deine rechtliche Lage")
        bisSichtbar(app, recht)
        recht.tap()
        let rl = app.buttons["recht-lesen"]
        XCTAssertTrue(rl.waitForExistence(timeout: 10))
        rl.tap()
        XCTAssertTrue(app.webViews.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] %@", "Risiko")).firstMatch.waitForExistence(timeout: 20))
        XCTAssertFalse(app.webViews.buttons.containing(NSPredicate(format: "label CONTAINS[c] %@", "Drucken")).firstMatch.exists, "Drucken-Knopf in der App")
        foto("recht-lesen")
        app.buttons["Fertig"].tap()
        let best = app.buttons["recht-bestaetigen"]
        if best.waitForExistence(timeout: 3) {
            app.descendants(matching: .any)["recht-haken"].firstMatch.tap()
            bisSichtbar(app, best)
            best.tap()
        }
        XCTAssertTrue(etwas(app, "Gelesen und bestätigt").waitForExistence(timeout: 10), "Recht nicht bestätigt")
        foto("recht-bestaetigt")
        zurueck(app)

        // Fragebogen
        let frage = knopf(app, "Fragebogen")
        bisSichtbar(app, frage)
        frage.tap()
        XCTAssertTrue(app.staticTexts["1. Studio"].waitForExistence(timeout: 10) || app.staticTexts["1. STUDIO"].exists)
        foto("fragebogen")
        let senden = app.buttons["Speichern und absenden"]
        bisSichtbar(app, senden, versuche: 60)
        senden.tap()
        XCTAssertTrue(etwas(app, "Danke, gespeichert").waitForExistence(timeout: 10))
        foto("fragebogen-gesendet")
        zurueck(app)

        // Aufsteller (Bamberg: im Paket enthalten → anfordern)
        let auf = app.buttons["aufsteller"]
        bisSichtbar(app, auf)
        auf.tap()
        XCTAssertTrue(app.segmentedControls.buttons["Dunkel"].waitForExistence(timeout: 15))
        foto("aufsteller-vorschau-hell")
        app.segmentedControls.buttons["Dunkel"].tap()
        app.segmentedControls.buttons["Dein Logo"].tap()
        Thread.sleep(forTimeInterval: 1)
        foto("aufsteller-dunkel-logo")
        app.segmentedControls.buttons["Studioname"].tap()
        let bestellen = app.buttons["aufsteller-bestellen"]
        bisSichtbar(app, bestellen)
        foto("aufsteller-bestellen")
        bestellen.tap()
        let ja = app.alerts.buttons["Anfordern"]
        if ja.waitForExistence(timeout: 5) {
            foto("aufsteller-rueckfrage")
            ja.tap()
            XCTAssertTrue(etwas(app, "Bestellt").waitForExistence(timeout: 20))
            foto("aufsteller-angefordert")
        }
        zurueck(app)

        // Bei Stripe ansehen
        let stripe = knopf(app, "Bei Stripe ansehen")
        bisSichtbar(app, stripe)
        XCTAssertTrue(stripe.exists, "„Bei Stripe ansehen“ fehlt")
        stripe.tap()
        XCTAssertTrue(app.buttons["Fertig"].firstMatch.waitForExistence(timeout: 15))
        Thread.sleep(forTimeInterval: 3)
        foto("stripe-ansehen")
        app.buttons["Fertig"].firstMatch.tap()
        Thread.sleep(forTimeInterval: 1)

    }

    /// Teil 3: So geht's im Konto, WhatsApp-Hilfe, Checkliste danach, Fotos-App
    func testInhaberZuletzt() throws {
        praefix = "r"
        let app = starten(email: "studio@beispiel.test")
        anmelden(app)
        app.tabBars.buttons["Konto"].tap()
        let sgKonto = knopf(app, "So geht's")
        nachOben(app, sgKonto)
        foto("konto-so-gehts-zeile")
        sgKonto.tap()
        XCTAssertTrue(app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Übersicht und Einrichtung")).firstMatch.waitForExistence(timeout: 10))
        foto("konto-so-gehts-offen")
        zurueck(app)

        // Hilfe per WhatsApp: öffnet wa.me (Safari im Simulator, dort ohne WhatsApp)
        let whatsapp = etwas(app, "Hilfe per WhatsApp")
        bisSichtbar(app, whatsapp, hoch: false)
        whatsapp.tap()
        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        _ = safari.wait(for: .runningForeground, timeout: 10)
        Thread.sleep(forTimeInterval: 10)
        foto("whatsapp-hilfe-geoeffnet")
        app.activate()

        // Kasse: Checkliste nach Recht + Fragebogen + Werbung
        app.tabBars.buttons["Kasse"].tap()
        Thread.sleep(forTimeInterval: 3)
        app.swipeDown()
        foto("kasse-start-danach")

        // Fotos-App: Ist alles angekommen?
        let fotos = XCUIApplication(bundleIdentifier: "com.apple.mobileslideshow")
        fotos.launch()
        Thread.sleep(forTimeInterval: 5)
        for t in ["Fortfahren", "Weiter", "Continue", "Nicht jetzt"] where fotos.buttons[t].firstMatch.exists { fotos.buttons[t].firstMatch.tap(); Thread.sleep(forTimeInterval: 2) }
        Thread.sleep(forTimeInterval: 2)
        let nein = fotos.alerts.buttons["Nicht erlauben"].firstMatch
        if nein.exists { nein.tap(); Thread.sleep(forTimeInterval: 1) }
        let nein2 = springboard.alerts.buttons["Nicht erlauben"].firstMatch
        if nein2.exists { nein2.tap(); Thread.sleep(forTimeInterval: 1) }
        foto("fotos-app-galerie")
        let erstes = fotos.cells.firstMatch
        if erstes.exists { erstes.tap(); Thread.sleep(forTimeInterval: 2); foto("fotos-app-video") }
    }

    // MARK: Team (team@beispiel.test von Ink Studio Bamberg)

    func testTeam() throws {
        praefix = "t"
        let app = starten(email: "team@beispiel.test")
        anmelden(app)
        app.tabBars.buttons["Kasse"].tap()
        XCTAssertTrue(etwas(app, "Einrichtung:").waitForExistence(timeout: 15))
        etwas(app, "Einrichtung:").tap()
        Thread.sleep(forTimeInterval: 1)
        foto("team-kasse-checkliste")
        app.tabBars.buttons["Werbung"].tap()
        XCTAssertTrue(app.staticTexts["Dein Werbevideo"].waitForExistence(timeout: 15), "Team sieht die Werbung nicht")
        foto("team-werbung")
        app.tabBars.buttons["Konto"].tap()
        let einst = knopf(app, "Einstellungen")
        nachOben(app, einst)
        foto("team-konto-dein-studio")
        let whatsapp = etwas(app, "Hilfe per WhatsApp")
        bisSichtbar(app, whatsapp)
        XCTAssertFalse(app.buttons["aufsteller"].exists, "Team sieht den Aufsteller")
        XCTAssertFalse(knopf(app, "Fragebogen").exists, "Team sieht den Fragebogen")
        XCTAssertFalse(knopf(app, "Bei Stripe ansehen").exists, "Team sieht „Bei Stripe ansehen“")
        bisSichtbar(app, einst, hoch: false)
        einst.tap()
        XCTAssertTrue(etwas(app, "nur der Inhaber").waitForExistence(timeout: 10), "Team: Hinweis „nur der Inhaber“ fehlt")
        XCTAssertFalse(app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "speichern-")).firstMatch.exists, "Team kann Einstellungen speichern")
        foto("team-einstellungen-nur-lesen")
        zurueck(app)
        let recht = knopf(app, "Deine rechtliche Lage")
        bisSichtbar(app, recht)
        recht.tap()
        XCTAssertTrue(app.buttons["recht-lesen"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.buttons["recht-bestaetigen"].exists, "Team kann die rechtliche Lage bestätigen")
        foto("team-recht-nur-lesen")
    }

    // MARK: Studio ohne Klarna (ohne@beispiel.test, Risikofrei über das Plattformkonto)

    func testOhneKlarna() throws {
        praefix = "k"
        let app = starten(email: "ohne@beispiel.test")
        anmelden(app)
        app.tabBars.buttons["Werbung"].tap()
        XCTAssertTrue(app.staticTexts["Deine Zahlseite"].waitForExistence(timeout: 15))
        XCTAssertFalse(app.staticTexts["Dein Werbevideo"].exists, "Ohne Klarna kein Werbevideo")
        XCTAssertFalse(app.staticTexts["Deine Beiträge"].exists, "Ohne Klarna keine Beiträge")
        XCTAssertFalse(app.staticTexts["Zum Ausdrucken"].exists, "Ohne Klarna keine Druckvorlagen mit Raten")
        XCTAssertFalse(etwas(app, "Kreditaufnahme").exists, "Ohne Klarna keine Raten-Fußnote")
        foto("ohne-klarna-werbung")
        app.swipeUp()
        foto("ohne-klarna-werbung-unten")
        app.tabBars.buttons["Konto"].tap()
        let einst = knopf(app, "Einstellungen")
        nachOben(app, einst)
        foto("ohne-klarna-konto")
        einst.tap()
        XCTAssertTrue(app.staticTexts["Anzahlungsbedingungen"].waitForExistence(timeout: 10) || etwas(app, "ANZAHLUNGSBEDINGUNGEN").exists)
        app.swipeUp(); app.swipeUp()
        // Klarna gibt es bei Risikofrei-Studios bis zum Stichtag noch: Ausweg-Einstellung und Fußnote bleiben hier richtig
        foto("ohne-klarna-einstellungen")
        zurueck(app)
        let abr = knopf(app, "Abrechnungen")
        bisSichtbar(app, abr)
        if abr.exists {
            abr.tap()
            Thread.sleep(forTimeInterval: 2)
            foto("abrechnungen")
            zurueck(app)
        }
        let auf = app.buttons["aufsteller"]
        bisSichtbar(app, auf)
        auf.tap()
        XCTAssertTrue(app.segmentedControls.buttons["Dunkel"].waitForExistence(timeout: 15))
        XCTAssertFalse(etwas(app, "Kreditaufnahme").exists, "Ohne Klarna keine Raten-Zeile auf dem Aufsteller")
        foto("ohne-klarna-aufsteller")
        // Logo aus Fotos (PhotosPicker, läuft außerhalb der App): ein gespeichertes Bild wählen
        let logoSeg = app.segmentedControls.buttons["Dein Logo"]
        bisSichtbar(app, logoSeg)
        logoSeg.tap()
        let waehlen = app.buttons["logo-waehlen"]
        XCTAssertTrue(waehlen.waitForExistence(timeout: 5))
        bisSichtbar(app, waehlen)
        waehlen.tap()
        Thread.sleep(forTimeInterval: 3)
        foto("aufsteller-logo-auswahl")
        // Auswahl läuft in einem eigenen Prozess: ein Bild in der Raster-Ansicht antippen (2. Reihe, 2. Spalte)
        Thread.sleep(forTimeInterval: 4)
        app.windows.firstMatch.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.55)).tap()
        Thread.sleep(forTimeInterval: 2)
        let hinzu = app.buttons["Hinzufügen"].firstMatch
        if hinzu.exists { hinzu.tap() }
        XCTAssertTrue(etwas(app, "Logo gespeichert").waitForExistence(timeout: 20) || etwas(app, "Anderes Logo").waitForExistence(timeout: 2),
                      "Logo aus Fotos wird nicht übernommen")
        foto("aufsteller-logo-gespeichert")
        app.swipeDown(); app.swipeDown()
        foto("aufsteller-mit-logo")
    }

    // MARK: Dunkel + große Schrift

    func testDunkelGross() throws {
        praefix = "d"
        let app = starten(email: "studio@beispiel.test", zusatz: ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityL"])
        anmelden(app)
        app.tabBars.buttons["Kasse"].tap()
        Thread.sleep(forTimeInterval: 3)
        foto("dunkel-gross-kasse")
        app.tabBars.buttons["Werbung"].tap()
        XCTAssertTrue(app.staticTexts["Dein Werbevideo"].waitForExistence(timeout: 15))
        foto("dunkel-gross-werbung")
        let speichern = knopf(app, "In Fotos speichern")
        bisSichtbar(app, speichern)
        foto("dunkel-gross-werbevideo-knoepfe")
        let b = app.staticTexts["Deine Beiträge"]
        nachOben(app, b)
        foto("dunkel-gross-beitraege")
        let kachel = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Bild 1 von 4")).firstMatch
        XCTAssertTrue(kachel.waitForExistence(timeout: 40))
        nachOben(app, kachel)
        foto("dunkel-gross-karussell")
        let z = app.staticTexts["Deine Zahlseite"]
        nachOben(app, z)
        foto("dunkel-gross-zahlseite")
        app.tabBars.buttons["Konto"].tap()
        let einst = knopf(app, "Einstellungen")
        bisSichtbar(app, einst)
        einst.tap()
        XCTAssertTrue(app.staticTexts["Anzahlungsbedingungen"].waitForExistence(timeout: 10) || etwas(app, "ANZAHLUNGSBEDINGUNGEN").exists)
        foto("dunkel-gross-einstellungen")
        let ausweich = app.switches["Anzahlung als Ausweg anbieten"]
        bisSichtbar(app, ausweich)
        foto("dunkel-gross-einstellungen-ausweg")
        app.swipeUp(); app.swipeUp()
        foto("dunkel-gross-einstellungen-unten")
    }

    // MARK: Aufsteller kaufen (Stripe-Checkout im Nachbau)

    func testZuletztAufstellerKauf() throws {
        // Ink Studio Coburg (Risikofrei): Aufsteller nicht im Paket → Kauf über Stripe-Checkout (Nachbau)
        praefix = "a"
        let app = starten(email: "ohne@beispiel.test")
        anmelden(app)
        app.tabBars.buttons["Konto"].tap()
        let auf = app.buttons["aufsteller"]
        bisSichtbar(app, auf)
        auf.tap()
        XCTAssertTrue(app.segmentedControls.buttons["Dunkel"].waitForExistence(timeout: 15))
        foto("aufsteller-kauf-vorschau")
        let bestellen = app.buttons["aufsteller-bestellen"]
        bisSichtbar(app, bestellen)
        foto("aufsteller-kauf-preis")
        bestellen.tap()
        let ja = app.alerts.buttons["Weiter zur Bezahlung"]
        XCTAssertTrue(ja.waitForExistence(timeout: 5))
        foto("aufsteller-kauf-rueckfrage")
        ja.tap()
        let bezahlen = app.buttons.containing(NSPredicate(format: "label CONTAINS[c] %@", "Bezahlen")).firstMatch
        XCTAssertTrue(bezahlen.waitForExistence(timeout: 20), "Checkout öffnet nicht")
        Thread.sleep(forTimeInterval: 1)
        foto("aufsteller-kauf-checkout")
        bezahlen.tap()
        XCTAssertTrue(app.staticTexts.containing(NSPredicate(format: "label CONTAINS[c] %@", "Tattoofin-App")).firstMatch.waitForExistence(timeout: 20))
        foto("aufsteller-kauf-rueckkehr-seite")
        app.buttons["Fertig"].firstMatch.tap()
        XCTAssertTrue(etwas(app, "Bestellt").waitForExistence(timeout: 20) || etwas(app, "Bezahlt").exists, "Nach der Rückkehr keine Bestätigung")
        Thread.sleep(forTimeInterval: 1)
        foto("aufsteller-kauf-bezahlt")
    }
}
