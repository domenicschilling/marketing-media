import Foundation
import StoreKit
import Testing
@testable import Tattoofin

/// Prüfrunde 1.1 (23.11.2026): Klarna-Werbung nur mit eingeschaltetem Klarna, Checklisten-Sprung, Kauf-Fehlertexte,
/// Push-Token erneut senden, neues Modellfeld stripe.klarnaAktiv (alte Antworten dekodieren weiter).
@Suite("Konto 1.1")
struct Konto11Tests {

    // MARK: Klarna-Werbung

    @Test func klarnaFall() {
        #expect(KlarnaWerbeFall.fall(klarnaDauerhaft: true, klarnaAktiv: true) == .material)
        // Älterer Server / Testkauf ohne Stripe-Konto: Angabe fehlt → Server-Regel gilt
        #expect(KlarnaWerbeFall.fall(klarnaDauerhaft: true, klarnaAktiv: nil) == .material)
        // Eigenes Konto, Klarna aus: keine Klarna-Werbung (sonst falsches Versprechen)
        #expect(KlarnaWerbeFall.fall(klarnaDauerhaft: true, klarnaAktiv: false) == .klarnaAus)
        #expect(KlarnaWerbeFall.fall(klarnaDauerhaft: false, klarnaAktiv: true) == .ohneKlarna)
        #expect(KlarnaWerbeFall.fall(klarnaDauerhaft: false, klarnaAktiv: nil) == .ohneKlarna)
    }

    @Test func checklisteWerbungZiel() {
        #expect(StartCheckpunkte.werbungZiel(punkt: "werbung", klarnaMaterial: true) == .beitraege)
        // Ohne Klarna gibt es „Beiträge“ nicht → QR-Code der Zahlseite
        #expect(StartCheckpunkte.werbungZiel(punkt: "werbung", klarnaMaterial: false) == .zahlseite)
        #expect(StartCheckpunkte.werbungZiel(punkt: "theke", klarnaMaterial: true) == .zahlseite)
        #expect(StartCheckpunkte.werbungZiel(punkt: "theke", klarnaMaterial: false) == .zahlseite)
    }

    @Test func stripeKlarnaAktivDekodieren() throws {
        let neu = try JSONDecoder().decode(StripeStatus.self, from: Data(#"{"verbunden":true,"klarnaAktiv":false}"#.utf8))
        #expect(neu.klarnaAktiv == false)
        // Alte Server-Antwort ohne Feld
        let alt = try JSONDecoder().decode(StripeStatus.self, from: Data(#"{"verbunden":true,"freigegeben":true}"#.utf8))
        #expect(alt.klarnaAktiv == nil)
    }

    // MARK: Kauf-Fehler

    @Test func kaufFehlerTexte() {
        #expect(KaufFehler.text(StoreKitError.networkError(URLError(.notConnectedToInternet))) == Texte.Konto11.kaufKeinNetz)
        #expect(KaufFehler.text(Product.PurchaseError.purchaseNotAllowed) == Texte.Konto11.kaufGesperrt)
        #expect(KaufFehler.text(StoreKitError.notEntitled) == Texte.Konto11.kaufAllgemein)
        // Selbst abgebrochen: keine Fehlermeldung
        #expect(KaufFehler.text(StoreKitError.userCancelled) == nil)
        #expect(KaufFehler.text(URLError(.cancelled)) == nil)
        #expect(KaufFehler.text(StoreKitError.notAvailableInStorefront) == Texte.Konto11.kaufNichtVerfuegbar)
        #expect(KaufFehler.text(StoreKitError.unknown) == Texte.Konto11.kaufAllgemein)
        #expect(KaufFehler.text(URLError(.timedOut)) == Texte.Konto11.kaufKeinNetz)
        #expect(KaufFehler.text(NSError(domain: "x", code: 1)) == Texte.Konto11.kaufAllgemein)
    }

    /// Abo-Bildschirm: kein Web-Preis, kein Klarna, nichts Technisches; Werbung: Klarna nur als Name, keine Raten
    @Test func texteRegeln() {
        let kauf = [Texte.Konto11.kaufKeinNetz, Texte.Konto11.kaufGesperrt, Texte.Konto11.kaufNichtVerfuegbar, Texte.Konto11.kaufAllgemein]
        for t in kauf {
            for verboten in ["49", "netto", "tattoofin.de", "Klarna", "Raten", "StoreKit", "error"] {
                #expect(!t.localizedCaseInsensitiveContains(verboten), "„\(verboten)“ in: \(t)")
            }
        }
        let werbung = [Texte.Konto11.klarnaAusTitel, Texte.Konto11.klarnaAusInhaber, Texte.Konto11.klarnaAusTeam, Texte.Konto11.ohneKlarnaText]
        for t in werbung {
            for verboten in ["Raten", "später bezahlen", "PayPal", "Sie "] {
                #expect(!t.localizedCaseInsensitiveContains(verboten), "„\(verboten)“ in: \(t)")
            }
        }
        #expect(!Texte.Konto11.aboNurHauptadresse.localizedCaseInsensitiveContains("Preis"))
    }

    // MARK: Push

    @Test func pushErneutSenden() {
        #expect(PushManager.erneutSenden(ausstehend: true, angemeldet: true, token: "abc") == "abc")
        #expect(PushManager.erneutSenden(ausstehend: false, angemeldet: true, token: "abc") == nil)
        #expect(PushManager.erneutSenden(ausstehend: true, angemeldet: false, token: "abc") == nil)
        #expect(PushManager.erneutSenden(ausstehend: true, angemeldet: true, token: nil) == nil)
        #expect(PushManager.erneutSenden(ausstehend: true, angemeldet: true, token: "") == nil)
    }
}
