import Foundation

// Endpunkte für Einstellungen, Recht, Fragebogen, Nachweis, Stripe-Ansicht, und Abrechnungen (portal.mjs).
// Rechte prüft der Server: kontakt und stripe-dashboard nur Inhaber (403 nur_inhaber).

extension APIClient {
    /// GET /api/portal, gelesen als StudioMehr (Einstellungen, Recht, Abrechnungen …)
    func portalMehr() async throws -> PortalMehr { try await senden("GET", "api/portal") }

    // MARK: Einstellungen (PATCH /api/portal/kontakt, nur Inhaber)

    struct KontaktAenderung: Encodable, Sendable {
        var email: String?
        var anzahlungsbedingungen: String?
        var ausweichAnzahlung: Ausweich?
        var zahlartenHinweis: Bool?

        struct Ausweich: Encodable, Sendable {
            var an: Bool
            var prozent: Int
        }
    }

    func kontaktAendern(_ a: KontaktAenderung) async throws -> StudioMehr {
        try await senden("PATCH", "api/portal/kontakt", body: a)
    }

    // MARK: Recht

    func rechtBestaetigen(version: String, name: String) async throws -> StudioMehr {
        struct B: Encodable, Sendable { let gelesen = true; let version: String; let name: String }
        return try await senden("POST", "api/portal/recht", body: B(version: version, name: name))
    }

    // MARK: Fragebogen

    func fragebogen() async throws -> FragebogenDaten { try await senden("GET", "api/portal/fragebogen") }

    func fragebogenSenden(_ d: FragebogenDaten) async throws {
        var werte = d.werte
        werte.removeValue(forKey: "updatedAt")
        let _: OK = try await senden("POST", "api/portal/fragebogen", body: FragebogenDaten(werte: werte))
    }

    // MARK: Nachweis

    func nachweis(_ zahlungId: String) async throws -> NachweisAntwort {
        try await senden("GET", "api/portal/nachweis/\(zahlungId)")
    }

    // MARK: Stripe ansehen (nur Inhaber, Login-Link ins Stripe-Dashboard)

    func stripeDashboardLink() async throws -> URL {
        struct B: Encodable, Sendable {}
        let a: URLAntwort = try await senden("POST", "api/portal/stripe-dashboard", body: B())
        guard let s = a.url, let u = URL(string: s), u.scheme == "https" || u.scheme == "http" else { throw APIFehler.unbekannt }
        return u
    }

    // MARK: Nachweis als fertiges PDF vom Server (?pdf=1)

    func nachweisPDF(_ zahlungId: String) async throws -> Data {
        try await daten("api/portal/nachweis/\(zahlungId)", query: [URLQueryItem(name: "pdf", value: "1")])
    }
}
