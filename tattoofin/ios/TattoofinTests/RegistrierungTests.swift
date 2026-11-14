import Foundation
import Testing
import UIKit
@testable import Tattoofin

/// Neues Studio in der App: Antworten des Servers, Feldprüfung wie signup.mjs, Texte (Apple 3.1.2/3.1.3, Klarna-Regel), Speicher
@Suite("Registrierung")
struct RegistrierungTests {
    private func dekodiere<T: Decodable>(_ json: String, als: T.Type = T.self) throws -> T {
        try JSONDecoder().decode(T.self, from: Data(json.utf8))
    }

    // MARK: Dekodieren

    @Test func pruefenAngemeldet() throws {
        let a: RegistrierenPruefenAntwort = try dekodiere("""
        {"art":"angemeldet","token":"tfa_ag_1.geheim","geraet":{"id":"ag_1","name":"iPhone","platform":"ios","rolle":"inhaber"},
         "studio":{"id":"st_1","firma":"Ink Studio","ort":"Bamberg"}}
        """)
        #expect(a.art == "angemeldet")
        #expect(a.token?.hasPrefix("tfa_") == true)
        #expect(a.geraet?.rolle == "inhaber")
        #expect(a.studio?.firma == "Ink Studio")
    }

    @Test func pruefenAuswahl() throws {
        let a: RegistrierenPruefenAntwort = try dekodiere("""
        {"art":"auswahl","auswahl":[{"id":"st_a","firma":"A","ort":"Hof"},{"id":"st_b","firma":"B","ort":"Bamberg"}],"auswahlToken":"x.y"}
        """)
        #expect(a.auswahl?.count == 2)
        #expect(a.auswahlToken == "x.y")
    }

    @Test func pruefenRegistrieren() throws {
        let a: RegistrierenPruefenAntwort = try dekodiere("""
        {"art":"registrieren","registrierToken":"r.t","email":"neu@studio.de",
         "entwurf":{"firma":"Neu Ink","inhaber":"Lena","strasse":"Hauptstr. 1","plz":"96047","ort":"Bamberg","telefon":"0151 2345678",
                    "studioTelefon":"0951 12345","ustid":"","website":"","unterzeichner":"Lena"}}
        """)
        #expect(a.registrierToken == "r.t")
        let d = StudioDaten(entwurf: try #require(a.entwurf))
        #expect(d.firma == "Neu Ink")
        #expect(d.fehler().isEmpty)
        let ohne: RegistrierenPruefenAntwort = try dekodiere(#"{"art":"registrieren","registrierToken":"r.t","email":"neu@studio.de","entwurf":null}"#)
        #expect(ohne.entwurf == nil)
    }

    @Test func registrierenUndAbo() throws {
        let r: RegistrierenAntwort = try dekodiere("""
        {"entwurfId":"st_9","entwurfToken":"e.t","appAccountToken":"3f1c2b7e-8a4d-4c55-9e0f-1a2b3c4d5e6f",
         "produktId":"de.tattoofin.app.abo.monatlich","email":"neu@studio.de"}
        """)
        #expect(UUID(uuidString: r.appAccountToken) != nil)
        #expect(r.produktId == AboKonstanten.produktId)

        let b: AboBestaetigtAntwort = try dekodiere("""
        {"token":"tfa_ag_2.geheim","geraet":{"id":"ag_2","name":"iPhone","platform":"ios","rolle":"inhaber"},
         "studio":{"id":"st_9","firma":"Neu Ink","ort":"Bamberg"},
         "abo":{"status":"aktiv","laeuftBis":"2026-12-14T10:00:00.000Z","autoVerlaengerung":true,"sandbox":true,
                "produktId":"de.tattoofin.app.abo.monatlich","appAccountToken":"3f1c2b7e-8a4d-4c55-9e0f-1a2b3c4d5e6f"}}
        """)
        #expect(b.token != nil)
        #expect(b.abo?.istSandbox == true)
        #expect(b.abo?.istBeendet == false)
        #expect(b.abo?.uuid != nil)

        let w: WiederherstellenAntwort = try dekodiere(#"{"art":"anmelden","emailMaskiert":"s•••••@studio.de"}"#)
        #expect(w.emailMaskiert == "s•••••@studio.de")
        let a: AboAktualisiertAntwort = try dekodiere(#"{"abo":{"status":"gekuendigt","laeuftBis":null,"autoVerlaengerung":false,"sandbox":false,"produktId":"x","appAccountToken":"y"}}"#)
        #expect(a.abo?.status == "gekuendigt")
    }

    @Test func studioMitUndOhneApple() throws {
        let alt: Studio = try dekodiere(#"{"id":"st_1","firma":"Alt","paket":"monatlich","kannKassieren":true}"#)
        #expect(alt.abrechnung == nil)
        #expect(alt.apple == nil)
        #expect(!alt.istApple)
        let apple: Studio = try dekodiere("""
        {"id":"st_2","firma":"App","paket":"app","paketName":"Monatlich (App Store)","abrechnung":"apple","kannKassieren":false,
         "stripe":{"verbunden":false},"connectUrl":"https://tattoofin.de/api/connect?t=x",
         "apple":{"status":"abgelaufen","laeuftBis":"2026-11-01T00:00:00.000Z","autoVerlaengerung":false,"sandbox":false,
                  "produktId":"de.tattoofin.app.abo.monatlich","appAccountToken":"3f1c2b7e-8a4d-4c55-9e0f-1a2b3c4d5e6f"}}
        """)
        #expect(apple.istApple)
        #expect(apple.apple?.istBeendet == true)
        let stripe: Studio = try dekodiere(#"{"id":"st_3","abrechnung":"stripe","apple":null}"#)
        #expect(!stripe.istApple)
    }

    @Test func fehlerMitFeldern() {
        let f = APIFehler.aus(status: 400, daten: Data(#"{"error":"Bitte ausfüllen: PLZ","code":"eingabe","felder":["plz","telefon"]}"#.utf8))
        #expect(f.code == "eingabe")
        #expect(f.felder == ["plz", "telefon"])
        #expect(Set((f.felder ?? []).compactMap(StudioFeld.init(rawValue:))) == [.plz, .telefon])
    }

    @Test func loeschenMitAppleAbo() throws {
        let l: KontoLoeschenAntwort = try dekodiere(#"{"ok":true,"kuendigungZum":"2026-12-14T10:00:00.000Z","loeschungAb":"2027-01-13","appleAbo":true}"#)
        #expect(l.appleAbo == true)
    }

    // MARK: Feldprüfung wie Server

    private func gueltig() -> StudioDaten {
        var d = StudioDaten()
        d.firma = "Ink Studio"; d.inhaber = "Lena Beispiel"; d.strasse = "Hauptstraße 1"; d.plz = "96047"; d.ort = "Bamberg"
        d.telefon = "0151 2345678"; d.studioTelefon = "0951 123456"; d.unterzeichner = "Lena Beispiel"
        return d
    }

    @Test func pflichtfelderWieServer() {
        let leer = StudioDaten().fehler()
        // Feldnamen gleich `felder` im Server
        #expect(Set(leer.keys.map(\.rawValue)) == ["firma", "inhaber", "strasse", "plz", "ort", "telefon", "studioTelefon", "unterzeichner"])
        #expect(gueltig().fehler().isEmpty)
        var nurLeerzeichen = gueltig()
        nurLeerzeichen.firma = "   "
        #expect(nurLeerzeichen.fehler()[.firma] != nil)
    }

    @Test(arguments: ["9604", "960470", "9604a", "96 47", "١٢٣٤٥"])
    func plzFalsch(_ plz: String) {
        var d = gueltig()
        d.plz = plz
        #expect(d.fehler()[.plz] == Texte.Registrieren.plzFalsch)
    }

    @Test func plzUndTelefonRichtig() {
        var d = gueltig()
        d.plz = " 01067 "
        d.telefon = "+49 (151) 23"
        d.studioTelefon = "123456"
        #expect(d.fehler().isEmpty)
        d.telefon = "12345"
        d.studioTelefon = "+49-12-3"
        #expect(d.fehler()[.telefon] == Texte.Registrieren.telefonFalsch)
        #expect(d.fehler()[.studioTelefon] == Texte.Registrieren.telefonFalsch)
    }

    @Test func bereinigtWieServer() {
        var d = gueltig()
        d.ustid = " de123456789 "
        d.firma = String(repeating: "x", count: 200)
        #expect(d.bereinigt(.ustid) == "DE123456789")
        #expect(d.bereinigt(.firma).count == 120)
        let body = APIClient.Registrierung(registrierToken: "t", daten: d, akzeptiert: Bestaetigungen(vertrag: true, avv: true, unternehmer: true, kmu: true))
        #expect(body.ustid == "DE123456789")
        #expect(body.akzeptiert.alle)
    }

    @Test func emailForm() {
        #expect(StudioDaten.emailGueltig("studio@beispiel.de"))
        #expect(!StudioDaten.emailGueltig("studio@beispiel"))
        #expect(!StudioDaten.emailGueltig("stu dio@beispiel.de"))
        #expect(!StudioDaten.emailGueltig("studio@beispiel.d"))
        #expect(!StudioDaten.emailGueltig("@beispiel.de"))
    }

    @Test func autofillUndTastatur() {
        #expect(StudioFeld.firma.inhaltTyp == .organizationName)
        #expect(StudioFeld.inhaber.inhaltTyp == .name)
        #expect(StudioFeld.strasse.inhaltTyp == .fullStreetAddress)
        #expect(StudioFeld.plz.inhaltTyp == .postalCode)
        #expect(StudioFeld.ort.inhaltTyp == .addressCity)
        #expect(StudioFeld.telefon.inhaltTyp == .telephoneNumber)
        #expect(StudioFeld.studioTelefon.inhaltTyp == .telephoneNumber)
        #expect(StudioFeld.ustid.inhaltTyp == nil)
        #expect(StudioFeld.website.inhaltTyp == .URL)
        #expect(StudioFeld.unterzeichner.inhaltTyp == .name)
        #expect(StudioFeld.plz.tastatur == .numberPad)
        #expect(StudioFeld.telefon.tastatur == .phonePad)
        #expect(StudioFeld.website.tastatur == .URL)
        #expect(StudioFeld.angaben.filter(\.pflicht).count == 7)
    }

    // MARK: Texte

    private var registrierTexte: [String] {
        let r = Texte.Registrieren.self
        return [r.einstiegFrage, r.einstieg, r.fortsetzen, r.navTitel, r.titel, r.einleitung, r.emailUngueltig, r.wiederherstellenLink,
                r.codeHinweis, r.codeBestaetigen, r.angabenTitel, r.angabenEinleitung, r.firma, r.inhaber, r.strasse, r.plz, r.ort,
                r.telefon, r.studioTelefon, r.ustid, r.website, r.unterzeichner, r.pflicht("PLZ"), r.plzFalsch, r.telefonFalsch,
                r.weiter, r.fehlerOben, r.bestaetigungenTitel, r.bestaetigungenEinleitung, r.unternehmer, r.kmu, r.vertrag, r.avv,
                r.vertragLesen, r.avvLesen, r.datenschutzLesen, r.datenschutzHinweis, r.bitteBestaetigen, r.weiterZumAbo,
                r.keinAboGefunden, r.aboGehoertZu("s•••@studio.de"), r.avvTitel]
            + StudioFeld.allCases.map(\.platzhalter)
    }

    private var aboTexte: [String] {
        let a = Texte.Abo.self
        return [a.titel, a.zeitraum(1), a.proMonat, a.inklMwSt, a.kaufen, a.kleingedruckt, a.vertragLink, a.datenschutzLink,
                a.eulaLink, a.wiederherstellen, a.ladeFehler, a.nichtBestaetigt, a.wartet, a.unverifiziert, a.erneuernTitel,
                a.erneuert, a.wiederhergestellt, a.leistungenLabel, a.abschnitt, a.bezahltUeber, a.apple, a.status, a.laeuftBis,
                a.verwalten, a.sandbox, Texte.Kasse.sandboxText, Texte.Kasse.aboAbgelaufenTitel, Texte.Kasse.aboAbgelaufenText,
                Texte.Kasse.aboWiederAbschliessen, Texte.Kasse.aboTeamHinweis, Texte.Kasse.stripeTitel, Texte.Kasse.stripeText,
                Texte.Kasse.stripeEinrichten, Texte.Loeschen.punktApple, Texte.Loeschen.appleHinweis, Texte.Loeschen.appleKuendigen]
            + a.leistungen
    }

    @Test func aboTextePflichtangaben() {
        let k = Texte.Abo.kleingedruckt
        #expect(k.contains("verlängert sich automatisch"))
        #expect(k.contains("24 Stunden"))
        #expect(k.contains("Einstellungen deines Apple-Accounts"))
        #expect(k.localizedCaseInsensitiveContains("keine Mindestlaufzeit"))
        #expect(Texte.Abo.zeitraum(1) == "1 Monat · verlängert sich automatisch")
        #expect(Texte.Abo.kaufen == "Kostenpflichtig abonnieren")
    }

    @Test func aboTexteGratisZeitraum() {
        #expect(Texte.Abo.gratisDauer(tage: 7, monate: nil) == "7 Tage")
        #expect(Texte.Abo.gratisDauer(tage: nil, monate: 1) == "1 Monat")
        #expect(Texte.Abo.gratisAbzeichen("7 Tage") == "Die ersten 7 Tage kostenlos")
        #expect(Texte.Abo.kaufenGratis("7 Tage") == "7 Tage kostenlos starten")
        let k = Texte.Abo.kleingedrucktGratis("7 Tage", preis: "49,90 €")
        // Apple 3.1.2: Folgepreis, Zeitpunkt der Abbuchung, automatische Verlängerung, Kündigung
        for teil in ["Die ersten 7 Tage sind kostenlos", "49,90 € pro Monat", "24 Stunden vor Ende der kostenlosen Zeit", "verlängert sich", "Einstellungen deines Apple-Accounts", "keine Mindestlaufzeit"] {
            #expect(k.localizedCaseInsensitiveContains(teil), "fehlt: \(teil)")
        }
        #expect(Texte.Abo.statusText(AppleAbo(status: "aktiv", laeuftBis: "2026-11-21T10:00:00.000Z", autoVerlaengerung: true, probe: true)) == "kostenlos bis 21.11.2026, danach Abo")
        #expect(Texte.Abo.statusText(AppleAbo(status: "aktiv", laeuftBis: "2026-11-21T10:00:00.000Z", autoVerlaengerung: false, probe: true)) == "endet am 21.11.2026")
    }

    @Test func keinWebPreisKeinKlarna() {
        for t in registrierTexte + aboTexte {
            for verboten in ["49", "netto", "tattoofin.de", "Klarna", "Raten", "Probe", "kostenlos testen"] {
                #expect(!t.localizedCaseInsensitiveContains(verboten), "„\(verboten)“ in: \(t)")
            }
        }
    }

    @Test func aboStatusTexte() {
        #expect(Texte.Abo.statusText(AppleAbo(status: "aktiv", autoVerlaengerung: true)) == "aktiv")
        #expect(Texte.Abo.statusText(AppleAbo(status: "gekuendigt", laeuftBis: "2026-12-14T10:00:00.000Z")) == "endet am 14.12.2026")
        #expect(Texte.Abo.statusText(AppleAbo(status: "aktiv", laeuftBis: "2026-12-14T10:00:00.000Z", autoVerlaengerung: false)) == "endet am 14.12.2026")
        #expect(Texte.Abo.statusText(AppleAbo(status: "zahlungsproblem")) == "Zahlungsproblem bei Apple")
        #expect(Texte.Abo.statusText(AppleAbo(status: "abgelaufen")) == "abgelaufen")
    }

    @Test func loeschenPunkteApple() {
        #expect(Texte.Loeschen.punkteApple.count == Texte.Loeschen.punkte.count)
        #expect(Texte.Loeschen.punkteApple[1] == Texte.Loeschen.punktApple)
        #expect(!Texte.Loeschen.punkteApple.contains { $0.contains("Abrechnungsmonat") })
        #expect(Texte.Loeschen.appleHinweis.contains("Einstellungen deines Apple-Accounts"))
    }

    // MARK: Rechtsseiten

    @Test func avvErlaubt() {
        let basis = URL(string: "https://tattoofin.de")!
        #expect(Rechtsseite.erlaubt(URL(string: "https://tattoofin.de/avv.html?app=1")!, basis: basis))
        #expect(Rechtsseite.avv.url.query()?.contains("app=1") == true)
        #expect(Rechtsseite.avv.url.path().hasSuffix("avv.html"))
        #expect(!Rechtsseite.erlaubt(URL(string: "https://tattoofin.de/start.html?app=1")!, basis: basis))
        #expect(!Rechtsseite.erlaubt(URL(string: "https://tattoofin.de/preise.html")!, basis: basis))
    }

    // MARK: Testkauf (Apple-Sandbox): Kasse im Testmodus

    @Test func testmodusDekodieren() throws {
        let s = try JSONDecoder().decode(Studio.self, from: Data(#"{"id":"st_1","abrechnung":"apple","testmodus":true,"kannKassieren":true}"#.utf8))
        #expect(s.istTestmodus && s.hatTestkasse && !s.istDemo && s.darfKassieren)
        let alt = try JSONDecoder().decode(Studio.self, from: Data(#"{"id":"st_2"}"#.utf8))
        #expect(!alt.istTestmodus && !alt.hatTestkasse)
        #expect(!Texte.Kasse.testmodusText.contains("tattoofin.de") && !Texte.Kasse.testmodusText.contains("49"))
    }

    // MARK: Kasse: welcher Hinweis

    @Test func gesperrtFaelle() {
        var s = Studio(id: "st_1")
        s.stripe = StripeStatus(verbunden: false)
        #expect(GesperrtKarte.fall(s) == .stripeVerbinden)
        s.abrechnung = "apple"
        s.apple = AppleAbo(status: "aktiv", sandbox: true)
        #expect(GesperrtKarte.fall(s) == .sandbox)
        s.apple = AppleAbo(status: "abgelaufen", sandbox: true)
        #expect(GesperrtKarte.fall(s) == .aboBeendet)
        s.apple = AppleAbo(status: "erstattet", sandbox: false)
        s.stripe = StripeStatus(verbunden: true)
        #expect(GesperrtKarte.fall(s) == .aboBeendet)
        s.apple = AppleAbo(status: "aktiv", sandbox: false)
        #expect(GesperrtKarte.fall(s) == .wartet)
        s.abrechnung = "stripe"
        s.apple = nil
        #expect(GesperrtKarte.fall(s) == .wartet)
    }
}

/// Entwurf im Schlüsselbund (Eintrag „app-registrierung“)
@Suite("Registrierung-Speicher", .serialized)
struct RegistrierungSpeicherTests {
    private func beispiel(am: Date = .now) -> RegistrierungEntwurf {
        RegistrierungEntwurf(entwurfId: "st_9", entwurfToken: "e.t", appAccountToken: UUID().uuidString.lowercased(),
                             produktId: AboKonstanten.produktId, email: "neu@studio.de", gespeichertAm: am)
    }

    @Test func speichernLesenLoeschen() {
        RegistrierungSpeicher.loeschen()
        #expect(RegistrierungSpeicher.lesen() == nil)
        let e = beispiel()
        RegistrierungSpeicher.speichern(e)
        #expect(RegistrierungSpeicher.lesen() == e)
        RegistrierungSpeicher.loeschen()
        #expect(RegistrierungSpeicher.lesen() == nil)
    }

    @Test func abgelaufenerEntwurfWirdGeloescht() {
        let alt = beispiel(am: .now.addingTimeInterval(-31 * 24 * 3600))
        #expect(!alt.gueltig())
        RegistrierungSpeicher.speichern(alt)
        #expect(RegistrierungSpeicher.lesen() == nil)
        #expect(beispiel(am: .now.addingTimeInterval(-29 * 24 * 3600)).gueltig())
        var kaputt = beispiel()
        kaputt.appAccountToken = "keine-uuid"
        #expect(!kaputt.gueltig())
    }

    @Test func ersterStartRaeumtAuf() {
        let d = UserDefaults.standard
        let vorher = d.object(forKey: "tf.installiert")
        RegistrierungSpeicher.speichern(beispiel())
        d.removeObject(forKey: "tf.installiert")
        Einstellungen.ersterStartAufraeumen()
        #expect(RegistrierungSpeicher.lesen() == nil)
        #expect(d.bool(forKey: "tf.installiert"))
        if vorher == nil { d.removeObject(forKey: "tf.installiert") }
    }
}

/// Zuordnung von Transaktionen und Reaktion auf Server-Antworten (ohne StoreKit)
@Suite("Abo-Logik")
struct AboLogikTests {
    private let uuid = UUID()

    private func entwurf(_ u: UUID) -> RegistrierungEntwurf {
        RegistrierungEntwurf(entwurfId: "st_9", entwurfToken: "e.t", appAccountToken: u.uuidString.lowercased(),
                             produktId: AboKonstanten.produktId, email: "neu@studio.de", gespeichertAm: .now)
    }

    private func appleStudio(_ status: String, _ u: UUID?) -> Studio {
        var s = Studio(id: "st_1")
        s.abrechnung = "apple"
        s.apple = AppleAbo(status: status, appAccountToken: u?.uuidString.lowercased())
        return s
    }

    @Test func zuordnung() {
        let p = AboKonstanten.produktId
        // Entwurf mit derselben UUID (Groß-/Kleinschreibung egal)
        #expect(AboManager.zuordnung(appAccountToken: uuid, produktId: p, entwurf: entwurf(uuid), studio: nil, istInhaber: false) == .entwurfBestaetigen)
        // Fremde UUID → nicht dem Entwurf zuordnen
        #expect(AboManager.zuordnung(appAccountToken: UUID(), produktId: p, entwurf: entwurf(uuid), studio: nil, istInhaber: false) == .nurAbschliessen)
        // Angemeldet, Apple-Studio aktiv → aktualisieren
        #expect(AboManager.zuordnung(appAccountToken: uuid, produktId: p, entwurf: nil, studio: appleStudio("aktiv", uuid), istInhaber: true) == .aktualisieren)
        // Beendet + Inhaber + gleiche UUID → erneuern; Team → nur aktualisieren
        #expect(AboManager.zuordnung(appAccountToken: uuid, produktId: p, entwurf: nil, studio: appleStudio("abgelaufen", uuid), istInhaber: true) == .erneuern)
        #expect(AboManager.zuordnung(appAccountToken: uuid, produktId: p, entwurf: nil, studio: appleStudio("abgelaufen", uuid), istInhaber: false) == .aktualisieren)
        // Stripe-Studio → nur abschließen
        var stripe = Studio(id: "st_2")
        stripe.abrechnung = "stripe"
        #expect(AboManager.zuordnung(appAccountToken: uuid, produktId: p, entwurf: nil, studio: stripe, istInhaber: true) == .nurAbschliessen)
        // Anderes Produkt → nur abschließen
        #expect(AboManager.zuordnung(appAccountToken: uuid, produktId: "x", entwurf: entwurf(uuid), studio: nil, istInhaber: false) == .nurAbschliessen)
        // Abgelaufene oder widerrufene Transaktion (z. B. alte Verlängerung aus Transaction.updates) → nur abschließen, nie an den Server
        for studio in [appleStudio("aktiv", uuid), appleStudio("abgelaufen", uuid)] {
            #expect(AboManager.zuordnung(appAccountToken: uuid, produktId: p, entwurf: nil, studio: studio, istInhaber: true, gueltig: false) == .nurAbschliessen)
        }
        #expect(AboManager.zuordnung(appAccountToken: uuid, produktId: p, entwurf: entwurf(uuid), studio: nil, istInhaber: false, gueltig: false) == .nurAbschliessen)
        let jetzt = Date.now
        #expect(AboManager.istGueltig(ablauf: jetzt.addingTimeInterval(3600), widerrufen: false, jetzt: jetzt))
        #expect(!AboManager.istGueltig(ablauf: jetzt.addingTimeInterval(-1), widerrufen: false, jetzt: jetzt))
        #expect(!AboManager.istGueltig(ablauf: jetzt.addingTimeInterval(3600), widerrufen: true, jetzt: jetzt))
        #expect(AboManager.istGueltig(ablauf: nil, widerrufen: false, jetzt: jetzt))
    }

    @Test func reaktionen() {
        func f(_ status: Int, _ code: String?) -> APIFehler { APIFehler(status: status, meldung: "T", code: code) }
        #expect(AboManager.reaktion(auf: APIFehler.keinNetz) == .nochmal(Texte.Abo.nichtBestaetigt))
        #expect(AboManager.reaktion(auf: f(502, nil)) == .nochmal(Texte.Abo.nichtBestaetigt))
        #expect(AboManager.reaktion(auf: f(429, "zu_viele")) == .nochmal("T"))
        for c in ["abo_vergeben", "produkt", "familie", "abo_abgelaufen", "token_passt_nicht"] { #expect(AboManager.reaktion(auf: f(409, c)) == .abschliessen("T")) }
        #expect(AboManager.reaktion(auf: f(410, "entwurf_abgelaufen")) == .neuAnfangen("T"))
        #expect(AboManager.reaktion(auf: f(409, "schon_aktiv")) == .zurAnmeldung("T"))
        for c in ["jws_ungueltig", "umgebung"] { #expect(AboManager.reaktion(auf: f(400, c)) == .text("T")) }
        #expect(AboManager.reaktion(auf: CancellationError()) == .nochmal(Texte.Abo.nichtBestaetigt))
    }
}
