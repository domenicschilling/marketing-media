import Foundation
import Testing
import UIKit
@testable import Tattoofin

/// Einstellungen, Recht, Fragebogen, Nachweis, Abrechnungen, Aufsteller, Gebührenhinweis (Teil B der Web-App-Parität, 14.11.2026)
@MainActor
@Suite("Studio: Einstellungen, Recht, Fragebogen, Nachweis, Aufsteller")
struct StudioMehrTests {
    private func dekodiere<T: Decodable>(_ json: String, als: T.Type = T.self) throws -> T {
        try JSONDecoder().decode(T.self, from: Data(json.utf8))
    }

    // MARK: Dekodieren (Format wie oeffentlich() in studio-ansicht.mjs)

    @Test func portalMehr() throws {
        let a: PortalMehr = try dekodiere("""
        {"studio":{"id":"st_1","firma":"Ink Studio","inhaber":"Lisa","strasse":"Weg 1","plz":"96047","ort":"Bamberg","slug":"ink",
                   "modell":"provision","provisionProzent":8,"abrechnung":"stripe","zahlseite":"https://tattoofin.de/zahlen/ink",
                   "stripe":{"klarnaAktiv":true,"verbunden":true,"freigegeben":true,"auszahlungen":true,"express":true,"kontoTyp":"express"},
                   "klarna":true,"klarnaDauerhaft":false,"benachrichtigung":{"email":"l@studio.de"},
                   "anzahlungsbedingungen":"Die Anzahlung sichert deinen Termin …","ausweichAnzahlung":{"an":true,"prozent":40},
                   "zahlartenHinweis":false,"recht":{"version":"2026-12","am":"2026-11-14T10:00:00.000Z","aktuell":true},
                   "fragebogenAm":null,"checkliste":{},"neuesFeld":{"x":1}},
         "zahlungen":[],
         "abrechnungen":[{"monat":"2026-10","umsatzCent":120000,"provisionBruttoCent":9600,"provisionNettoCent":8067,"auszahlungCent":110400,
                          "positionen":[{"id":"zl_1","betragCent":60000},{"id":"zl_2","betragCent":60000}],"rechnungNr":"TF-2026-10-1",
                          "rechnungUrl":"https://invoice.stripe.com/i/x"}],
         "config":{"provisionProzent":8,"ustProzent":19,"rechtVersion":"2026-12"}}
        """)
        #expect(a.studio.istProvision)
        #expect(a.studio.istStripeAbrechnung)
        #expect(a.studio.hatKlarna && !a.studio.hatKlarnaDauerhaft)
        #expect(a.studio.ausweichAnzahlung?.prozent == 40)
        #expect(a.studio.recht?.aktuell == true)
        #expect(a.config?.rechtVersion == "2026-12")
        let r = try #require(a.abrechnungen?.first)
        #expect(r.anzahl == 2)
        #expect(r.anDichCent == 110_400)
        #expect(r.monatText == "Oktober 2026")
    }

    @Test func studioMehrMinimal() throws {
        // Ältere Server: fast nichts dabei → keine Abbrüche, sichere Standardwerte
        let s: StudioMehr = try dekodiere(#"{"id":"st_2"}"#)
        #expect(!s.istProvision)
        #expect(s.istStripeAbrechnung)
        #expect(!s.hatKlarna)
        #expect(s.name == "Dein Studio")
        let apple: StudioMehr = try dekodiere(#"{"id":"st_3","abrechnung":"apple","modell":"kauf"}"#)
        #expect(!apple.istStripeAbrechnung)
    }

    @Test func abrechnungOhneAuszahlung() throws {
        let a: Abrechnung = try dekodiere(#"{"monat":"2026-01","umsatzCent":10000,"provisionBruttoCent":800}"#)
        #expect(a.anDichCent == 9200)
        #expect(a.anzahl == 0)
        #expect(a.monatText == "Januar 2026")
    }

    @Test func aufstellerApp() throws {
        let a: AufstellerAppAntwort = try dekodiere("""
        {"aufsteller":{"artikel":"QR-Aufsteller aus Holz","kostenlos":false,
          "preis":{"nettoCent":2900,"gesamtCent":3451,"ustProzent":19,"text":"29,00 € + 19 % MwSt. = 34,51 €"},
          "preisText":"34,51 € inkl. MwSt.","knopf":"Für 34,51 € bestellen","holz":"dunkel","variante":"logo","hatLogo":true,
          "holzHinweis":{"hell":"h","dunkel":"d"},"status":"zahlung_offen","bestelltAm":null,"bezahltAm":null,
          "lieferadresse":"Ink, Weg 1, 96047 Bamberg","firma":"Ink","zahlseite":"https://tattoofin.de/zahlen/ink","klarna":true,
          "fussnote":"*Raten über Klarna …","logo":{"src":"data:image/jpeg;base64,AAAA","w":10,"h":4}},
         "url":"https://checkout.stripe.com/c/pay/cs_test_a1B2#fid","cs":"cs_test_a1B2"}
        """)
        let d = try #require(a.aufsteller)
        #expect(!d.istBestellt)
        #expect(d.preis?.gesamtCent == 3451)
        #expect(d.logo?.w == 10)
        #expect(a.cs == "cs_test_a1B2")
        let bestellt: AufstellerApp = try dekodiere(#"{"status":"bestellt","bestelltAm":"2026-11-14T10:00:00.000Z"}"#)
        #expect(bestellt.istBestellt)
    }

    @Test func checkoutSitzung() {
        #expect(CheckoutSitzung.id(aus: URL(string: "https://checkout.stripe.com/c/pay/cs_test_a1B2c3#fidkdWxOYHwnPyd1blpxYHZx")) == "cs_test_a1B2c3")
        #expect(CheckoutSitzung.id(aus: URL(string: "http://localhost:12113/pay/cs_mock_123")) == "cs_mock_123")
        #expect(CheckoutSitzung.id(aus: URL(string: "https://tattoofin.de/app-fertig.html?aufsteller=bezahlt&cs=cs_live_X9")) == "cs_live_X9")
        #expect(CheckoutSitzung.id(aus: URL(string: "https://tattoofin.de/app-fertig.html?cs=cs_%3Cscript%3E")) == nil)
        #expect(CheckoutSitzung.id(aus: nil) == nil)
    }

    @Test func nachweis() throws {
        let n: NachweisAntwort = try dekodiere("""
        {"studio":{"firma":"Ink","inhaber":"Lisa","strasse":"Weg 1","plz":"96047","ort":"Bamberg"},
         "zahlung":{"id":"zl_1","status":"bezahlt","betragCent":48000,"kunde":"Max","beschreibung":"Rose","art":"gesamt",
                    "kundeBestaetigt":{"am":"2026-11-13T10:00:00.000Z","inhalt":"Ich bestätige …","version":"1"}},
         "leistung":null,"version":"1","erstellt":"2026-11-14T10:00:00.000Z"}
        """)
        #expect(n.zahlung.kundeBestaetigt?.inhalt == "Ich bestätige …")
        // PDF entsteht und ist ein echtes PDF; lange Texte gehen auf mehrere Seiten
        var lang = n
        lang.zahlung.kundeBestaetigt?.inhalt = String(repeating: "Sehr langer Bestätigungstext mit vielen Wörtern. ", count: 400)
        let pdf = NachweisPDF.daten(lang)
        #expect(pdf.starts(with: Data("%PDF".utf8)))
        let doc = try #require(CGPDFDocument(CGDataProvider(data: pdf as CFData)!))
        #expect(doc.numberOfPages >= 2)
        #expect(NachweisPDF.daten(n).starts(with: Data("%PDF".utf8)))
    }

    @Test func dataURLBild() {
        let bild = UIGraphicsImageRenderer(size: CGSize(width: 4, height: 4)).image { _ in UIColor.black.setFill(); UIRectFill(CGRect(x: 0, y: 0, width: 4, height: 4)) }
        let url = "data:image/png;base64," + bild.pngData()!.base64EncodedString()
        #expect(NachweisPDF.bild(url) != nil)
        #expect(NachweisPDF.bild("https://example.com/a.png") == nil)
        #expect(NachweisPDF.bild(nil) == nil)
    }

    // MARK: Fragebogen

    @Test func fragebogenWerte() throws {
        let d: FragebogenDaten = try dekodiere(#"{"website":"ink.de","z_bar":true,"projekte_monat":4,"updatedAt":"2026-11-14T10:00:00.000Z"}"#)
        #expect(d.werte["website"]?.text == "ink.de")
        #expect(d.werte["z_bar"]?.jaNein == true)
        #expect(d.werte["projekte_monat"]?.text == "4")
        #expect(d.aktualisiertAm == "2026-11-14T10:00:00.000Z")
        let zurueck = try JSONDecoder().decode([String: FragebogenWert].self, from: JSONEncoder().encode(d))
        #expect(zurueck["z_bar"] == .jaNein(true))
        let leer: FragebogenDaten = try dekodiere("{}")
        #expect(leer.werte.isEmpty)
    }

    @Test func fragebogenFelderWieWeb() {
        let mit = FragebogenView.abschnitte(klarna: true).flatMap(\.felder).map(\.name)
        let ohne = FragebogenView.abschnitte(klarna: false).flatMap(\.felder).map(\.name)
        #expect(FragebogenView.abschnitte(klarna: true).count == 6)
        for n in ["website", "instagram", "rechtsform", "kleinunternehmer", "kontoauszug", "preis_gross", "projekte_monat", "anzahlung",
                  "raten_nachfrage", "z_bar", "z_ec", "z_kredit", "z_paypal", "z_ueberweisung", "z_terminal", "w_karte", "w_sepa", "w_paypal",
                  "anzahlung_tattoofin", "logo_quelle", "farbe", "team", "zustaendig", "termin", "aufkleber", "flyer", "sonstiges"] {
            #expect(ohne.contains(n), "Feld fehlt: \(n)")
        }
        #expect(mit.contains("w_raten"))
        #expect(!ohne.contains("w_raten"))
        #expect(Set(mit).count == mit.count)
        // Ohne Raten-/Später-Aussage im Klarna-Feld
        let titel = FragebogenView.abschnitte(klarna: true).flatMap(\.felder).first { $0.name == "w_raten" }?.titel ?? ""
        #expect(!titel.localizedCaseInsensitiveContains("später"))
        #expect(!titel.localizedCaseInsensitiveContains("raten"))
    }

    // MARK: Gebührenhinweis (wie feeHinweis() im Web)

    @Test func gebuehrHinweis() {
        var s = StudioMehr(id: "st_1")
        s.modell = "provision"
        s.provisionProzent = 8
        #expect(GebuehrHinweis.text(cent: 100_000, studio: s) == "Du bekommst \(Euro.text(92_000)) · Tattoofin 8 % (\(Euro.text(8_000)), alles inklusive)")
        #expect(GebuehrHinweis.text(cent: 12_345, studio: s)?.contains("(\(Euro.text(988))") == true)   // 987,6 → 988 wie Math.round
        s.provisionProzent = 7.5
        #expect(GebuehrHinweis.text(cent: 10_000, studio: s)?.contains("Tattoofin 7,5 %") == true)
        s.modell = "kauf"
        #expect(GebuehrHinweis.text(cent: 10_000, studio: s) == Texte.Kasse2.gebuehrStripe)
        #expect(GebuehrHinweis.text(cent: nil, studio: s) == nil)
        #expect(GebuehrHinweis.text(cent: 0, studio: s) == nil)
        #expect(GebuehrHinweis.text(cent: 10_000, studio: nil) == nil)
    }

    @Test func heuteNurBeiGesamt() throws {
        // „heute“ wird nur gesendet, wenn gesetzt (der Server nimmt es nur bei Art „gesamt“)
        let mit = APIClient.NeueZahlung(betrag: "100.00", art: "gesamt", heute: true)
        let ohne = APIClient.NeueZahlung(betrag: "100.00", art: "anzahlung")
        let j1 = String(decoding: try JSONEncoder().encode(mit), as: UTF8.self)
        let j2 = String(decoding: try JSONEncoder().encode(ohne), as: UTF8.self)
        #expect(j1.contains("\"heute\":true"))
        #expect(!j2.contains("heute"))
    }

    // MARK: Aufsteller

    @Test func aufstellerHilfen() {
        #expect(AufstellerVorschau.zweiZeilen("Ink Studio Bamberg Nord") == ["Ink Studio", "Bamberg Nord"])
        #expect(AufstellerVorschau.zweiZeilen("Einwort") == ["Einwort"])
        #expect(AufstellerVorschau.kurzLink("https://tattoofin.de/zahlen/ink-studio?x=1#a") == "tattoofin.de/zahlen/ink-studio")
        let z = AufstellerVorschau.umbrechen("a bb ccc dddd", maxBreite: 6) { CGFloat($0.count) }
        #expect(z == ["a bb", "ccc", "dddd"])
        #expect(AufstellerVorschau.farben("dunkel").gravur != AufstellerVorschau.farben("hell").gravur)
    }

    @Test func logoSchwarzWeiss() throws {
        // Weißes Bild mit dunklem Rechteck → auf das Rechteck zugeschnitten, JPEG-Data-URL unter der Server-Grenze
        let bild = UIGraphicsImageRenderer(size: CGSize(width: 400, height: 200), format: { let f = UIGraphicsImageRendererFormat(); f.scale = 1; return f }()).image { _ in
            UIColor.white.setFill(); UIRectFill(CGRect(x: 0, y: 0, width: 400, height: 200))
            UIColor(white: 0.2, alpha: 1).setFill(); UIRectFill(CGRect(x: 100, y: 50, width: 100, height: 40))
        }
        let l = try GravurLogo.aus(daten: bild.pngData()!)
        #expect(l.dataURL.hasPrefix("data:image/jpeg;base64,"))
        #expect(l.dataURL.count <= 690_000)
        // Faktor min(1600/400, 600/200, 4) = 3 → 300 × 120
        #expect(abs(l.breite - 300) <= 3 && abs(l.hoehe - 120) <= 3)
        // Gespeichertes Logo wieder einlesen (Vorschau)
        let wieder = try GravurLogo.aus(dataURL: l.dataURL)
        #expect(wieder.breite > 0)

        let weiss = UIGraphicsImageRenderer(size: CGSize(width: 50, height: 50)).image { _ in UIColor.white.setFill(); UIRectFill(CGRect(x: 0, y: 0, width: 50, height: 50)) }
        #expect(throws: GravurLogo.Fehler.self) { try GravurLogo.aus(daten: weiss.pngData()!) }
        #expect(throws: GravurLogo.Fehler.self) { try GravurLogo.aus(daten: Data("kein Bild".utf8)) }
    }

    @Test func qrMaske() {
        #expect(QRMaske.bild("https://tattoofin.de/zahlen/ink") != nil)
    }

    // MARK: Texte (Apple 3.1.1/3.1.3, Klarna-Regeln, „unser Team“)

    @Test func texteOhnePaketUndWebPreis() {
        let A = Texte.Aufsteller.self, M = Texte.Mehr.self
        let texte = [A.titel, A.intro, A.hellHinweis, A.dunkelHinweis, A.bestellenTitel, A.kaufenText, A.weiter, A.anfordern,
                     A.anfordernFrage, A.angefordertDanke, A.bezahltDanke, A.nochNichtBezahlt, A.nurWeb, A.bestellenFrage,
                     A.kaufenFrageBrutto(3451), A.bezahlt("14.11.2026"), A.angefordert("14.11.2026"),
                     M.abschnitt, M.einstellungen, M.einstellungenText, M.aufsteller, M.aufstellerText, M.hilfeWhatsapp,
                     M.hilfeWhatsappText, M.hilfeWhatsappNachricht, M.nichtInDerApp, M.stripeAnsehen, M.stripeAnsehenText]
        for t in texte {
            for verboten in ["Paket", "netto", "49", "tattoofin.de", "Website", "Domenic", "Raten", "Klarna"] {
                #expect(!t.localizedCaseInsensitiveContains(verboten), "„\(verboten)“ in: \(t)")
            }
        }
        #expect(M.hilfeWhatsappText.contains("Team"))
        #expect(StudioMehrAbschnitt.whatsappURL.absoluteString.hasPrefix("https://wa.me/491624502375?text="))
    }

    @Test func klarnaInEinstellungenNurMitName() {
        // Klarna nur mit Namen; der Zahlseiten-Hinweis mit „Klarna.*“ bekommt den Pflichtsatz (Fußnote + Warnsatz) darunter
        for t in [Texte.Einst.ausweichTitel, Texte.Einst.ausweichText, Texte.Einst.hinweisText] {
            #expect(!t.localizedCaseInsensitiveContains("raten"))
            #expect(!t.localizedCaseInsensitiveContains("später"))
        }
        #expect(Texte.Einst.hinweisText.contains("Klarna.*"))
        #expect(KlarnaTexte.pflichtsatz.contains(KlarnaTexte.warnsatz))
        #expect(KlarnaTexte.pflichtsatz.hasPrefix("*Raten über Klarna, nach deren Bonitätsprüfung. Vertragspartner der Raten ist Klarna, nicht Tattoofin."))
    }

    @Test func rechtsseiteRecht() {
        let basis = URL(string: "https://tattoofin.de")!
        #expect(Rechtsseite.erlaubt(URL(string: "https://tattoofin.de/recht.html?app=1")!, basis: basis))
        #expect(Rechtsseite.recht.url.query()?.contains("app=1") == true)
        #expect(!Rechtsseite.erlaubt(URL(string: "https://tattoofin.de/app.html#recht")!, basis: basis))
        // Inhaltsregeln bleiben gültiges JSON (sonst lädt WebKit sie nicht)
        #expect((try? JSONSerialization.jsonObject(with: Data(RechtsWebAnsicht.regeln.utf8))) != nil)
    }
}
