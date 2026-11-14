import Foundation

// Endpunkte für den Tab „Werbung“ und den Start-Bereich der Kasse (eigene Datei, damit APIClient.swift unberührt bleibt).

extension APIClient {
    /// GET /api/app/werbung: Texte, Video-Adressen und ob Klarna-Material gezeigt werden darf
    func werbung() async throws -> WerbungAntwort {
        try await senden("GET", "api/app/werbung")
    }

    /// GET /api/app/start: Einrichtungs-Checkliste (ohne Paket und Preis, mit Rollen)
    func start() async throws -> StartAntwort {
        try await senden("GET", "api/app/start")
    }

    /// GET /api/portal, gelesen für Checkliste und Druckmaterial (nur, falls der Server /api/app/start noch nicht kennt)
    func portalStart() async throws -> PortalStart {
        try await senden("GET", "api/portal")
    }

    /// POST /api/portal/checkliste: manuelle Punkte (app, theke, werbung) abhaken. Antwort: das Studio.
    func checkliste(punkt: String, erledigt: Bool) async throws -> StartStudio {
        struct B: Encodable, Sendable { let punkt: String; let erledigt: Bool }
        return try await senden("POST", "api/portal/checkliste", body: B(punkt: punkt, erledigt: erledigt))
    }
}
