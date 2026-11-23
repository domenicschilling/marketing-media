import Foundation
import Testing
@testable import Tattoofin

/// Studio-Wechsel (Version 1.2): Antworten von /api/app/studios und /api/app/wechseln, Texte, lokale Merker
@Suite("Studio-Wechsel")
struct StudioWechselTests {
    private func dekodiere<T: Decodable>(_ json: String, als: T.Type = T.self) throws -> T {
        try JSONDecoder().decode(T.self, from: Data(json.utf8))
    }

    @Test func studiosListe() throws {
        let a: StudiosAntwort = try dekodiere("""
        {"studios":[{"id":"st_a","firma":"Ink Studio A","ort":"Bamberg","rolle":"inhaber","aktuell":true},
                    {"id":"st_b","firma":"Ink Studio B","ort":"","rolle":"team","aktuell":false}]}
        """)
        #expect(a.studios.count == 2)
        #expect(a.studios[0].istInhaber && a.studios[0].aktuell)
        #expect(!a.studios[1].istInhaber && !a.studios[1].aktuell)
    }

    @Test func wechselAntwortMitRolle() throws {
        let a: AnmeldenAntwort = try dekodiere("""
        {"token":"tfa_ag_abcdefghijkl.x","geraet":{"id":"ag_abcdefghijkl","name":"iPhone","platform":"ios","rolle":"team"},
         "studio":{"id":"st_b","firma":"Ink Studio B","ort":"Hof","rolle":"team"}}
        """)
        #expect(a.token?.hasPrefix("tfa_") == true)
        #expect(a.geraet?.rolle == "team")
        #expect(a.studio?.rolle == "team")
        // Ältere Antworten (Anmelden) ohne Rolle beim Studio bleiben lesbar
        let alt: AnmeldenAntwort = try dekodiere(#"{"auswahl":[{"id":"st_a","firma":"A","ort":"Bamberg"}],"auswahlToken":"t"}"#)
        #expect(alt.auswahl?.first?.rolle == nil)
    }

    @Test func zugangKodierenUndLesen() throws {
        let z = StudioZugang(studioId: "st_a", firma: "Ink Studio A", ort: "Bamberg", rolle: "inhaber", geraetId: "ag_1", email: "a@b.de", token: "tfa_x")
        let d = try JSONEncoder().encode([z])
        let zurueck = try JSONDecoder().decode([StudioZugang].self, from: d)
        #expect(zurueck == [z])
        #expect(zurueck[0].id == "st_a")
    }

    @Test func zeilenText() {
        #expect(Texte.Wechsel.zeile(ort: "Hof", rolle: "Inhaber") == "Hof · Inhaber")
        #expect(Texte.Wechsel.zeile(ort: "", rolle: "Team") == "Team")
        #expect(Texte.Wechsel.nurHier("Ink Studio A") == "Nur bei Ink Studio A")
        #expect(Texte.Wechsel.gewechselt("Ink Studio B") == "Du bist jetzt in Ink Studio B.")
    }

    @Test func abmeldungenMerken() {
        StudioAbmeldungen.alleVergessen()
        #expect(!StudioAbmeldungen.enthaelt("st_test_x"))
        StudioAbmeldungen.merken("st_test_x")
        #expect(StudioAbmeldungen.enthaelt("st_test_x"))
        StudioAbmeldungen.entfernen("st_test_x")
        #expect(!StudioAbmeldungen.enthaelt("st_test_x"))
    }
}
