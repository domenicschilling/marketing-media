import Foundation

/// Offene Anmeldung eines neuen Studios (nach „Weiter zum Abo“, vor dem bestätigten Kauf).
/// Liegt im Schlüsselbund (Eintrag „app-registrierung“), damit die Anmeldung nach einem Neustart fortgesetzt werden kann
/// und ein Kauf, der erst später bei Apple durchgeht (Transaction.updates), noch dem richtigen Entwurf zugeordnet wird.
struct RegistrierungEntwurf: Codable, Sendable, Hashable {
    var entwurfId: String
    var entwurfToken: String
    /// UUID für purchase(options: [.appAccountToken]) – klein geschrieben wie vom Server
    var appAccountToken: String
    var produktId: String
    var email: String
    var gespeichertAm: Date

    /// Der Server lässt den Entwurf 30 Tage gelten
    static let gueltigkeit: TimeInterval = 30 * 24 * 3600

    var uuid: UUID? { UUID(uuidString: appAccountToken) }

    func gueltig(jetzt: Date = .now) -> Bool {
        uuid != nil && jetzt.timeIntervalSince(gespeichertAm) < Self.gueltigkeit && jetzt >= gespeichertAm.addingTimeInterval(-300)
    }
}

enum RegistrierungSpeicher {
    /// Ersatz, falls der Schlüsselbund nicht schreibt (unsignierter Simulator-Build): gilt dann nur bis zum Beenden der App
    nonisolated(unsafe) private static var imSpeicher: RegistrierungEntwurf?
    private static let sperre = NSLock()

    @discardableResult
    static func speichern(_ e: RegistrierungEntwurf) -> Bool {
        sperre.withLock { imSpeicher = e }
        guard let daten = try? JSONEncoder().encode(e) else { return false }
        return KeychainStore.speichern(daten, konto: KeychainStore.registrierungKonto)
    }

    /// Gespeicherter Entwurf, nur solange er gültig ist (abgelaufene werden gelöscht)
    static func lesen(jetzt: Date = .now) -> RegistrierungEntwurf? {
        let e = KeychainStore.lesen(konto: KeychainStore.registrierungKonto)
            .flatMap { try? JSONDecoder().decode(RegistrierungEntwurf.self, from: $0) }
            ?? sperre.withLock { imSpeicher }
        guard let e else { return nil }
        guard e.gueltig(jetzt: jetzt) else {
            loeschen()
            return nil
        }
        return e
    }

    static func loeschen() {
        sperre.withLock { imSpeicher = nil }
        KeychainStore.loeschen(konto: KeychainStore.registrierungKonto)
    }
}
