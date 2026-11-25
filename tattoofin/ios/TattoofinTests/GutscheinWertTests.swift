import Foundation
import Testing
@testable import Tattoofin

/// Gutschein-Wert, Bonus, Teil-Einlösung und Listenfilter (Vertrag mit dem Server: studio-ansicht.mjs fuerStudio, Shop-Branch portal.mjs)
@Suite("Gutschein-Wert")
struct GutscheinWertTests {
    private func z(_ json: String) throws -> Zahlung {
        try JSONDecoder().decode(Zahlung.self, from: Data(json.utf8))
    }

    // MARK: Dekodierung

    /// Alte Antwort ohne neue Felder: dekodiert weiter, Wert = bezahlter Betrag, ganz einlösen
    @Test func alteAntwortOhneNeueFelder() throws {
        let a = try z(#"{"id":"zl_1","status":"bezahlt","betragCent":10000,"art":"gutschein","gutschein":{"code":"GS-ABCD-2345","status":"gueltig","gueltigBis":"2029-12-31T22:59:59.000Z"}}"#)
        #expect(a.gutschein?.wertCent == nil)
        #expect(a.gutschein?.teile == nil)
        #expect(a.gutscheinWertCent == 10_000)
        #expect(a.gutscheinBezahltCent == 10_000)
        #expect(!a.gutscheinBezahltAbweichend)
        #expect(a.gutscheinRestCent == 10_000)
        #expect(!a.gutscheinZeigtHeuteEinloesbar)
        #expect(!a.gutscheinTeilbar)
        #expect(a.gutscheinTeile.isEmpty)
        #expect(!a.gutscheinKannZuruecknehmen)
    }

    /// Live heute: Aktions-Gutschein mit Wert > bezahlt, Bonus-Frist läuft noch
    @Test func aktionMitBonus() throws {
        let a = try z("""
        {"id":"zl_2","status":"bezahlt","betragCent":150000,"art":"gutschein",
         "gutschein":{"code":"GS-AAAA-BBBB","status":"gueltig","shop":true,"wertCent":200000,"bezahltCent":150000,"aktuellerWertCent":200000,
                      "bonusCent":50000,"bonusBis":"2099-03-31T21:59:59.000Z","aktion":{"nr":1}}}
        """)
        #expect(a.gutscheinWertCent == 200_000)
        #expect(a.gutscheinBezahltCent == 150_000)
        #expect(a.gutscheinBezahltAbweichend)
        #expect(a.gutscheinMitBonus)
        #expect(a.gutscheinRestCent == 200_000)
        #expect(!a.gutscheinZeigtHeuteEinloesbar)
        #expect(!a.gutscheinBonusVorbei())
        #expect(Texte.GutscheinWert.bezahlt(150_000) == "bezahlt 1.500,00 €")
        #expect(Texte.GutscheinWert.bonusZeile(wert: 200_000, bis: "31.03.2099", danach: 150_000) == "2.000,00 € bis 31.03.2099, danach 1.500,00 €")
    }

    /// Bonus-Frist vorbei: Server liefert aktuellerWertCent = bezahlt → „Heute einlösbar“, Einlöse-Frage mit diesem Betrag
    @Test func bonusFristVorbei() throws {
        let a = try z("""
        {"id":"zl_3","status":"bezahlt","betragCent":150000,"art":"gutschein",
         "gutschein":{"code":"GS-AAAA-BBBB","status":"gueltig","wertCent":200000,"bezahltCent":150000,"aktuellerWertCent":150000,
                      "bonusCent":50000,"bonusBis":"2020-03-31T21:59:59.000Z"}}
        """)
        #expect(a.gutscheinWertCent == 200_000)
        #expect(a.gutscheinRestCent == 150_000)
        #expect(a.gutscheinZeigtHeuteEinloesbar)
        #expect(a.gutscheinBonusVorbei())
        #expect(Texte.GutscheinWert.einloesenGanz(a.gutscheinRestCent).hasPrefix("1.500,00 €"))
    }

    /// Live schickt bei eingelösten Gutscheinen noch den vollen aktuellerWertCent: nie als „Heute einlösbar“ zeigen
    @Test func eingeloestOhneHeuteEinloesbar() throws {
        let a = try z("""
        {"id":"zl_4","status":"bezahlt","betragCent":5000,"art":"gutschein",
         "gutschein":{"code":"GS-AAAA-BBBB","status":"eingeloest","eingeloestAm":"2026-11-20T10:00:00.000Z","wertCent":7500,"bezahltCent":5000,"aktuellerWertCent":7500}}
        """)
        #expect(a.gutscheinRestCent == 0)
        #expect(!a.gutscheinZeigtHeuteEinloesbar)
        #expect(a.gutscheinKannZuruecknehmen)
    }

    /// Neue Antwort (Shop-Branch) mit teilbar, restCent und teile
    @Test func neueAntwortMitTeilen() throws {
        let a = try z("""
        {"id":"zl_5","status":"bezahlt","betragCent":10000,"art":"gutschein",
         "gutschein":{"code":"GS-AAAA-BBBB","status":"gueltig","wertCent":10000,"bezahltCent":10000,"aktuellerWertCent":7500,
                      "teilbar":true,"restCent":7500,"teile":[{"am":"2026-11-23T10:00:00.000Z","cent":2500,"notiz":"Sitzung 1"}]}}
        """)
        #expect(a.gutscheinTeilbar)
        #expect(a.gutscheinTeile == [GutscheinTeil(am: "2026-11-23T10:00:00.000Z", cent: 2500, notiz: "Sitzung 1")])
        #expect(a.gutscheinRestCent == 7_500)
        #expect(a.gutscheinZeigtHeuteEinloesbar)
        #expect(a.gutscheinKannZuruecknehmen)
        #expect(!a.gutscheinBezahltAbweichend)
    }

    /// restCent hat Vorrang vor aktuellerWertCent
    @Test func restVorAktuellemWert() throws {
        let a = try z(#"{"id":"zl_6","status":"bezahlt","betragCent":10000,"art":"gutschein","gutschein":{"code":"GS-AAAA-BBBB","status":"gueltig","aktuellerWertCent":10000,"restCent":4000,"teilbar":true,"teile":[]}}"#)
        #expect(a.gutscheinRestCent == 4_000)
        #expect(!a.gutscheinKannZuruecknehmen)
    }

    // MARK: Liste

    @Test func listenfilterWieImWeb() throws {
        let gueltig = try z(#"{"id":"a","status":"bezahlt","betragCent":5000,"art":"gutschein","gutschein":{"code":"GS-AAAA-BBBB","status":"gueltig"}}"#)
        let offenLink = try z(#"{"id":"b","status":"offen","betragCent":5000,"art":"gutschein","gutschein":{"status":"offen"}}"#)
        let storniert = try z(#"{"id":"c","status":"storniert","betragCent":5000,"art":"gutschein","gutschein":{"status":"storniert"}}"#)
        let abgebrochen = try z(#"{"id":"d","status":"abgebrochen","betragCent":5000,"art":"gutschein","gutschein":{"status":"offen"}}"#)
        let shopOhneCode = try z(#"{"id":"e","status":"offen","betragCent":5000,"art":"gutschein","gutschein":{"status":"offen","shop":true}}"#)
        let shopMitCode = try z(#"{"id":"f","status":"bezahlt","betragCent":5000,"art":"gutschein","gutschein":{"status":"gueltig","shop":true,"code":"GS-CCCC-DDDD"}}"#)
        let keinGutschein = try z(#"{"id":"g","status":"bezahlt","betragCent":5000,"art":"anzahlung"}"#)
        let erstattet = try z(#"{"id":"h","status":"erstattet","betragCent":5000,"art":"gutschein","gutschein":{"code":"GS-EEEE-FFFF","status":"erstattet"}}"#)
        let sichtbar = [gueltig, offenLink, storniert, abgebrochen, shopOhneCode, shopMitCode, keinGutschein, erstattet]
            .filter(\.zeigtInGutscheinListe).map(\.id)
        #expect(sichtbar == ["a", "b", "f", "h"])
    }

    // MARK: Betragsfeld

    @Test func teilBetragPruefen() {
        #expect(TeilEinloesung.pruefen("", rest: 10_000) == .success(.alles))
        #expect(TeilEinloesung.pruefen("  ", rest: 10_000) == .success(.alles))
        #expect(TeilEinloesung.pruefen("12,50", rest: 10_000) == .success(.betrag(1_250)))
        #expect(TeilEinloesung.pruefen("12.5", rest: 10_000) == .success(.betrag(1_250)))
        #expect(TeilEinloesung.pruefen("1.250,00 €", rest: 200_000) == .success(.betrag(125_000)))
        #expect(TeilEinloesung.pruefen("1.250", rest: 200_000) == .success(.betrag(125_000)))
        #expect(TeilEinloesung.pruefen("100", rest: 10_000) == .success(.alles))
        #expect(TeilEinloesung.pruefen("100,01", rest: 10_000) == .failure(.zuViel(rest: 10_000)))
        #expect(TeilEinloesung.pruefen("0", rest: 10_000) == .failure(.null))
        #expect(TeilEinloesung.pruefen("abc", rest: 10_000) == .failure(.ungueltig))
        #expect(TeilEinloesung.pruefen("1,234", rest: 10_000) == .failure(.ungueltig))
        #expect(TeilEinloesung.pruefen("-5", rest: 10_000) == .failure(.ungueltig))
    }

    @Test func betragFuerServer() {
        #expect(TeilEinloesung.fuerServer(1_250) == "12,50")
        #expect(TeilEinloesung.fuerServer(200_000) == "2000,00")
        #expect(TeilEinloesung.fuerServer(5) == "0,05")
    }

    /// Body von POST einloesen: ohne Betrag kein Feld „betrag“ (Server löst dann alles ein)
    @Test func einloesenKoerper() throws {
        struct B: Encodable { let notiz: String?; let betrag: String? }
        let ohne = String(decoding: try JSONEncoder().encode(B(notiz: nil, betrag: nil)), as: UTF8.self)
        #expect(ohne == "{}")
        let mit = String(decoding: try JSONEncoder().encode(B(notiz: "x", betrag: "12,50")), as: UTF8.self)
        #expect(mit.contains(#""betrag":"12,50""#))
    }

    /// Texte: einfache Sprache, kein Web-Preis/Bezahl-Link
    @Test func texteOhneWebUndFachwort() {
        let alle = [Texte.GutscheinWert.betrag, Texte.GutscheinWert.betragHinweis, Texte.GutscheinWert.nichtGefunden,
                    Texte.GutscheinWert.leerOhneKasse, Texte.GutscheinWert.fehlerUngueltig]
        for t in alle {
            #expect(!t.localizedCaseInsensitiveContains("tattoofin.de"))
            #expect(!t.localizedCaseInsensitiveContains("Klarna"))
            #expect(!t.localizedCaseInsensitiveContains("PayPal"))
        }
    }
}
