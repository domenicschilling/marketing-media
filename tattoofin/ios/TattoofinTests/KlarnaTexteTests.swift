import Foundation
import Testing
@testable import Tattoofin

/// Die Swift-Konstanten müssen exakt den Texten in _lib/klarna-texte.mjs entsprechen (Wortlaut nie ändern).
@Suite("Klarna-Texte")
struct KlarnaTexteTests {
    /// Quelle: tattoofin/website/netlify/functions/_lib/klarna-texte.mjs (relativ zu dieser Datei)
    private static var quelle: String? {
        let url = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appending(path: "website/netlify/functions/_lib/klarna-texte.mjs")
        return try? String(contentsOf: url, encoding: .utf8)
    }

    private static func wert(_ name: String, in text: String) -> String? {
        // export const NAME = "…";   bzw.  name: "…",
        for muster in [#"export const \#(name) = "([^"]+)""#, #"\b\#(name): "([^"]+)""#] {
            if let r = try? NSRegularExpression(pattern: muster),
               let m = r.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)),
               let b = Range(m.range(at: 1), in: text) { return String(text[b]) }
        }
        return nil
    }

    @Test(.enabled(if: quelle != nil, "klarna-texte.mjs nicht gefunden"))
    func gleichWieServer() throws {
        let t = try #require(Self.quelle)
        #expect(Self.wert("KLARNA_WARNSATZ", in: t) == KlarnaTexte.warnsatz)
        #expect(Self.wert("KLARNA_ZUSATZ", in: t) == KlarnaTexte.zusatz)
        #expect(Self.wert("KLARNA_ZUSATZ_STUDIO", in: t) == KlarnaTexte.zusatzStudio)
        #expect(Self.wert("verfuegbar", in: t) == KlarnaTexte.nameVerfuegbar)
        #expect(Self.wert("mitKlarna", in: t) == KlarnaTexte.nameMitKlarna)
        #expect(Self.wert("spaeter", in: t) == KlarnaTexte.Aussage.spaeter)
        #expect(Self.wert("tage30", in: t) == KlarnaTexte.Aussage.tage30)
        #expect(Self.wert("finanzierung", in: t) == KlarnaTexte.Aussage.finanzierung)
        #expect(Self.wert("GUTSCHEIN_HINWEIS", in: t) == KlarnaTexte.gutscheinHinweis)
    }

    @Test func pflichtsatzAufbau() {
        #expect(KlarnaTexte.pflichtsatz == "*\(KlarnaTexte.zusatz) \(KlarnaTexte.warnsatz)")
        #expect(KlarnaTexte.mitWarnsatz(KlarnaTexte.ratenKurz) == "Raten* über Klarna Achtung! Kreditaufnahme kostet Geld.")
    }

    /// Die App-Texte machen keine Raten- oder Später-zahlen-Aussagen und erwähnen bei Gutscheinen kein Klarna.
    @Test func appTexteOhneRatenAussage() {
        let gutscheinTexte = [Texte.Gutscheine.zahlarten, Texte.Gutscheine.kaeuferHinweis, Texte.Gutscheine.leerText]
        for g in gutscheinTexte { #expect(!g.localizedCaseInsensitiveContains("klarna")) }
        let alle = [Texte.Kasse.gesperrtText, Texte.Zahlung.inPruefung, Texte.Einrichtung.pushText, Texte.Gutscheine.zahlarten]
        for a in alle {
            #expect(!a.localizedCaseInsensitiveContains("raten"))
            #expect(!a.localizedCaseInsensitiveContains("später bezahlen"))
        }
    }
}
