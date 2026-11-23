import Foundation

// Endpunkte 1.1 Kasse (portal.mjs). Rechte prüft der Server: adresse nur Inhaber (403 nur_inhaber), mit App-Token erlaubt.

extension APIClient {
    /// GET /api/portal einmal holen, gelesen für Kasse und Konto zugleich
    func portalBeide() async throws -> PortalBeide { try await senden("GET", "api/portal") }

    /// POST /api/portal/adresse { strasse, plz, ort }: Adresse der Zahlseite eintragen bzw. bestätigen. Antwort: oeffentlich(s)
    func adresseSpeichern(strasse: String, plz: String, ort: String) async throws -> Studio {
        struct B: Encodable, Sendable { let strasse: String; let plz: String; let ort: String }
        return try await senden("POST", "api/portal/adresse", body: B(strasse: strasse, plz: plz, ort: ort))
    }
}
