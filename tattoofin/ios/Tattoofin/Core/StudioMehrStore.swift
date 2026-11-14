import Foundation
import Observation

/// Zusätzliche Studio-Angaben (GET /api/portal, gelesen als StudioMehr) für Konto-Bildschirme und den Gebührenhinweis der Kasse.
/// Getrennt vom PortalStore, damit die Kasse unverändert schnell bleibt. Wird beim Öffnen der Bildschirme frisch geladen.
@MainActor
@Observable
final class StudioMehrStore {
    static let shared = StudioMehrStore()

    var studio: StudioMehr?
    var abrechnungen: [Abrechnung] = []
    var config = PortalMehrConfig()
    var fehler: String?
    var laedt = false
    private var geladenAm: Date?

    private init() {}

    /// Neu laden; mit `wennAelterAls` nur, wenn der Stand älter ist (z. B. Gebührenhinweis der Kasse)
    func laden(wennAelterAls sekunden: TimeInterval? = nil) async {
        if let sekunden, let g = geladenAm, Date.now.timeIntervalSince(g) < sekunden, studio != nil { return }
        laedt = true
        defer { laedt = false }
        do {
            let a = try await APIClient.shared.portalMehr()
            uebernehmen(a)
            fehler = nil
        } catch is CancellationError {
        } catch {
            fehler = fehlerText(error)
        }
    }

    func uebernehmen(_ a: PortalMehr) {
        studio = a.studio
        abrechnungen = a.abrechnungen ?? []
        if let c = a.config { config = c }
        geladenAm = .now
    }

    /// Antwort einer Änderung (oeffentlich(s)) übernehmen
    func uebernehmen(_ s: StudioMehr) {
        studio = s
    }

    func leeren() {
        studio = nil
        abrechnungen = []
        config = PortalMehrConfig()
        fehler = nil
        geladenAm = nil
    }
}
