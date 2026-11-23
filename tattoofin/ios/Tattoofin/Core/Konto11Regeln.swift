import Foundation
import StoreKit

// Kleine, testbare Regeln aus der Prüfrunde 1.1 (Konto, Abo, Werbung), 23.11.2026.

/// Darf die App Werbung mit Klarna zeigen (Werbevideo, Beiträge, Druckvorlagen)?
/// Klarna dauerhaft (Server-Regel) reicht nicht: Ist Klarna im Stripe-Konto des Studios aus (stripe.klarnaAktiv == false),
/// fänden Kunden Klarna beim Bezahlen nicht. Dann kein Klarna-Material, sondern ein Hinweis. Fehlt die Angabe (älterer Server,
/// Testkauf ohne Stripe-Konto), bleibt es bei der Server-Regel.
enum KlarnaWerbeFall: Equatable {
    /// Klarna-Material zeigen
    case material
    /// Klarna dauerhaft, aber im Stripe-Konto ausgeschaltet
    case klarnaAus
    /// Kein Klarna dauerhaft (Paket ohne Klarna, Angabe fehlt)
    case ohneKlarna

    static func fall(klarnaDauerhaft: Bool, klarnaAktiv: Bool?) -> KlarnaWerbeFall {
        guard klarnaDauerhaft else { return .ohneKlarna }
        return klarnaAktiv == false ? .klarnaAus : .material
    }
}

extension WerbungStore {
    /// Server-Regel (klarnaDauerhaft) plus Stripe-Stand aus GET /api/portal
    var klarnaFall: KlarnaWerbeFall {
        KlarnaWerbeFall.fall(klarnaDauerhaft: WerbungRegeln.klarnaMaterial(werbung: werbung, start: start?.studio),
                             klarnaAktiv: AppState.shared.portal.studio?.stripe?.klarnaAktiv)
    }
}

extension StartCheckpunkte {
    /// Ziel des Knopfs „Werbung“ in der Checkliste. Ohne Klarna-Material gibt es den Abschnitt „Beiträge“ nicht,
    /// dann geht es zum QR-Code der Zahlseite (so sagt es auch der Server-Text).
    static func werbungZiel(punkt: String, klarnaMaterial: Bool) -> WerbungAbschnitt {
        punkt != "theke" && klarnaMaterial ? .beitraege : .zahlseite
    }
}

/// Verständlicher Text für einen gescheiterten Kauf (statt des rohen, oft technischen StoreKit-Textes)
enum KaufFehler {
    static func text(_ error: any Error) -> String {
        if let e = error as? StoreKitError {
            switch e {
            case .networkError: return Texte.Konto11.kaufKeinNetz
            case .notAvailableInStorefront: return Texte.Konto11.kaufNichtVerfuegbar
            case .notEntitled: return Texte.Konto11.kaufGesperrt
            default: return Texte.Konto11.kaufAllgemein
            }
        }
        if let e = error as? Product.PurchaseError {
            switch e {
            case .purchaseNotAllowed: return Texte.Konto11.kaufGesperrt
            case .productUnavailable: return Texte.Konto11.kaufNichtVerfuegbar
            default: return Texte.Konto11.kaufAllgemein
            }
        }
        if error is URLError { return Texte.Konto11.kaufKeinNetz }
        return Texte.Konto11.kaufAllgemein
    }
}

extension AppState {
    /// Dieses Gerät beim Server abmelden (Push-Token weg) und lokal alles löschen, mit Hinweis auf dem Anmelde-Bildschirm.
    /// Nach „Zusätzlich alle abmelden“ im Team: Der Server lässt das auslösende Gerät gültig, sonst bekäme es weiter Mitteilungen.
    func abmelden(hinweis: String?) async {
        try? await APIClient.shared.abmelden()  // ds-ok: Abmelden klappt lokal immer, Server-Abmeldung ist nur Aufräumen
        await lokalAbmelden(hinweis: hinweis)
    }

    /// Team-Mitglied: eigene Adresse aus dem Studio entfernen (meldet alle eigenen Geräte ab). Gleich in Team und Konto löschen.
    func eigenenZugangEntfernen() async throws {
        try await APIClient.shared.eigenenZugangEntfernen()
        await lokalAbmelden(hinweis: Texte.Team.zugangEntferntHinweis)
    }
}
