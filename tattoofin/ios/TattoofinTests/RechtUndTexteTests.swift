import Foundation
import Testing
import WebKit
@testable import Tattoofin

/// Rechtstexte in der App (nur die drei Seiten, ohne Wege zu Anmeldung/Preisen) und Texte rund um Kündigen/Löschen
@Suite("Rechtstexte und Löschen")
struct RechtUndTexteTests {
    private let basis = URL(string: "https://tattoofin.de")!

    @Test func nurRechtsseitenErlaubt() {
        #expect(Rechtsseite.erlaubt(URL(string: "https://tattoofin.de/impressum.html?app=1")!, basis: basis))
        #expect(Rechtsseite.erlaubt(URL(string: "https://tattoofin.de/datenschutz.html?app=1#app")!, basis: basis))
        #expect(Rechtsseite.erlaubt(URL(string: "https://tattoofin.de/vertrag.html")!, basis: basis))
        // Startseite, Anmeldung, Preise, andere Hosts: nie in der App
        #expect(!Rechtsseite.erlaubt(URL(string: "https://tattoofin.de/")!, basis: basis))
        #expect(!Rechtsseite.erlaubt(URL(string: "https://tattoofin.de/start.html")!, basis: basis))
        #expect(!Rechtsseite.erlaubt(URL(string: "https://tattoofin.de/raten")!, basis: basis))
        #expect(!Rechtsseite.erlaubt(URL(string: "http://tattoofin.de/impressum.html")!, basis: basis))
        #expect(!Rechtsseite.erlaubt(URL(string: "https://example.com/impressum.html")!, basis: basis))
    }

    @Test func rechtsseitenMitAppKennung() {
        for s in Rechtsseite.allCases {
            #expect(s.url.query()?.contains("app=1") == true)
            #expect(s.url.path().hasSuffix(s.datei))
        }
    }

    @Test func loeschenOhneZuruecknehmenUndOhneEndgueltig() {
        let alle = [Texte.Loeschen.titel, Texte.Loeschen.knopf, Texte.Loeschen.erledigtText, Texte.Konto.loeschen] + Texte.Loeschen.punkte
        #expect(!alle.contains { $0.localizedCaseInsensitiveContains("endgültig") })
        #expect(!alle.contains { $0.localizedCaseInsensitiveContains("zurücknehmen") })
        // Fristen wie in der Datenschutzerklärung (Abschnitt 11): 6, 8 oder 10 Jahre; Löschung 30 Tage nach Vertragsende
        #expect(Texte.Loeschen.punkte.contains { $0.contains("8 Jahre") && $0.contains("10 Jahre") && $0.contains("6 Jahre") })
        #expect(Texte.Loeschen.punkte.contains { $0.contains("30 Tage nach Vertragsende") })
    }
}

@Suite("Inhaltsregeln Rechtstexte")
struct InhaltsregelnTests {
    @MainActor
    @Test func regelnLassenSichUebersetzen() async throws {
        let liste = try await WKContentRuleListStore.default().compileContentRuleList(
            forIdentifier: "tattoofin-rechtstexte-test", encodedContentRuleList: RechtsWebAnsicht.regeln)
        #expect(liste != nil)
    }
}
