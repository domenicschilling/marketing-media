import Foundation
import Testing
@testable import MeineApp   // ← Name des App-Moduls eintragen

/// Wächter-Tests: Regeln für Texte als Test (Muster aus Tattoofin und Tattookalender).
/// Kopieren nach `<App>Tests/WaechterTests.swift`, `alleTexte()` an die Textquelle anpassen
/// und die Listen aus dem Brief (Abschnitt 6 "Ton", 7 "Abo") füllen.
@Suite("Wächter: Texte")
struct WaechterTests {

    /// Alle Texte der App als Liste. Variante A: `enum Texte` per Mirror auslesen.
    /// Variante B (String-Katalog): `Localizable.xcstrings` als JSON lesen.
    static func alleTexte() throws -> [String] {
        // Variante B, auskommentiert lassen, wenn die App `enum Texte` nutzt:
        // let url = try #require(Bundle(for: Marke.self).url(forResource: "Localizable", withExtension: "xcstrings"))
        // let json = try JSONSerialization.jsonObject(with: Data(contentsOf: url)) as? [String: Any]
        // let eintraege = json?["strings"] as? [String: Any] ?? [:]
        // return eintraege.keys.sorted()
        return Texte.alle   // ← in der App: static let alle: [String] mit allen Texten
    }

    // Aus dem Brief: Wörter, die in dieser App nie vorkommen dürfen.
    static let verboten: [String] = [
        "Klarna",            // Beispiel Tattoofin: keine Raten-Aussage in der App
        "netto",             // keine Web-Preise (Apple 3.1.1)
        "WhatsApp-Paket",    // Beispiel Tattookalender: Paket heißt "Kalender + Tattoochat"
        "revolutionär", "nahtlos", "maßgeschneidert", "Entdecke die Zukunft",   // KI-Floskeln
    ]

    @Test("Keine verbotenen Wörter")
    func keineVerbotenenWoerter() throws {
        let texte = try Self.alleTexte()
        for wort in Self.verboten {
            let treffer = texte.filter { $0.localizedCaseInsensitiveContains(wort) }
            #expect(treffer.isEmpty, "»\(wort)« in: \(treffer.prefix(3))")
        }
    }

    @Test("Keine Gedankenstriche (– —), sie wirken wie KI-Text")
    func keineGedankenstriche() throws {
        let treffer = try Self.alleTexte().filter { $0.contains("–") || $0.contains("—") }
        #expect(treffer.isEmpty, "\(treffer.prefix(3))")
    }

    @Test("Du-Form: kein Sie/Ihr/Ihnen am Satzanfang oder mitten im Satz")
    func duForm() throws {
        let muster = try Regex(#"(^|[\s.,!?])(Sie|Ihnen|Ihr|Ihre|Ihren)\s"#)
        let treffer = try Self.alleTexte().filter { $0.contains(muster) }
        #expect(treffer.isEmpty, "\(treffer.prefix(3))")
    }

    @Test("Keine erfundenen Zeitangaben (»dauert 2 Minuten«), außer im Brief belegt")
    func keineErfundenenZeiten() throws {
        let muster = try Regex(#"(nur|in|dauert)\s+\d+\s+(Sekunden|Minuten|Min\.)"#)
        let erlaubt: Set<String> = []   // belegte Ausnahmen hier eintragen
        let treffer = try Self.alleTexte().filter { $0.contains(muster) && !erlaubt.contains($0) }
        #expect(treffer.isEmpty, "\(treffer.prefix(3))")
    }

    // Abo-Pflichtsätze (06-abo-ehrlich.md). Nur in Apps mit Abo aktiv lassen.
    static let aboPflicht: [String] = [
        "verlängert sich automatisch",
        "Käufe wiederherstellen",
        "Apple-Einstellungen",
    ]

    @Test("Abo-Seite enthält die Pflichtangaben")
    func aboPflichtangaben() throws {
        let alles = try Self.alleTexte().joined(separator: "\n")
        for satz in Self.aboPflicht {
            #expect(alles.localizedCaseInsensitiveContains(satz), "Pflichtangabe fehlt: \(satz)")
        }
    }
}
