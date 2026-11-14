import Foundation

// Endpunkte für Einstellungen, Recht, Fragebogen, Nachweis, Stripe-Ansicht, Abrechnungen und QR-Aufsteller (portal.mjs, aufsteller.mjs).
// Rechte prüft der Server: kontakt und stripe-dashboard nur Inhaber (403 nur_inhaber), aufsteller nur Inhaber.

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

    // MARK: QR-Aufsteller (nur Inhaber)

    /// Auswahl, Status, Artikel und Preis, gespeichertes Logo (GET /api/app/aufsteller)
    func aufsteller() async throws -> AufstellerAppAntwort { try await senden("GET", "api/app/aufsteller") }

    struct AufstellerWahl: Encodable, Sendable {
        var holz: String              // hell | dunkel
        var variante: String          // name | logo
        /// data:image/jpeg;base64,… (schwarz/weiß, unter 500 KB); fehlt = Logo bleibt wie es ist
        var logo: String?
        var logoW: Int?
        var logoH: Int?
        /// Server entscheidet: schon vorgesehen → anfordern, sonst Stripe-Checkout (Antwort mit url und cs)
        var bestellen: Bool?
    }

    func aufstellerSpeichern(_ w: AufstellerWahl) async throws -> AufstellerAppAntwort {
        try await senden("POST", "api/portal/aufsteller", body: w)
    }

    func aufstellerPruefen(cs: String) async throws -> AufstellerAppAntwort {
        struct B: Encodable, Sendable { let cs: String }
        return try await senden("POST", "api/portal/aufsteller-pruefen", body: B(cs: cs))
    }

    // MARK: Nachweis als fertiges PDF vom Server (?pdf=1)

    func nachweisPDF(_ zahlungId: String) async throws -> Data {
        try await daten("api/portal/nachweis/\(zahlungId)", query: [URLQueryItem(name: "pdf", value: "1")])
    }
}

/// Stripe-Checkout-Sitzung aus einer Adresse lesen (…/pay/cs_test_…#… oder ?cs=cs_…)
enum CheckoutSitzung {
    static func id(aus url: URL?) -> String? {
        guard let url else { return nil }
        if let q = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first(where: { $0.name == "cs" })?.value,
           q.range(of: #"^cs_[A-Za-z0-9_]+$"#, options: .regularExpression) != nil { return q }
        for teil in url.path().split(separator: "/") where teil.hasPrefix("cs_") {
            let s = String(teil)
            if s.range(of: #"^cs_[A-Za-z0-9_]+$"#, options: .regularExpression) != nil { return s }
        }
        return nil
    }
}
