import Foundation
import Security

/// Einträge im Schlüsselbund: nur auf diesem Gerät, nur entsperrt lesbar, kein iCloud-Abgleich.
/// „app-token“ = Anmeldung (Bearer), „app-registrierung“ = offene Anmeldung eines neuen Studios (RegistrierungSpeicher).
enum KeychainStore {
    private static let dienst = "de.tattoofin.app"
    static let tokenKonto = "app-token"
    static let registrierungKonto = "app-registrierung"
    /// Seit 1.2 (Studio-Wechsel): Anmeldungen aller Studios dieser Adresse auf diesem Gerät, JSON-Liste von StudioZugang
    static let zugaengeKonto = "app-zugaenge"

    private static func basis(_ konto: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: dienst,
            kSecAttrAccount as String: konto,
            kSecAttrSynchronizable as String: kCFBooleanFalse as Any,
        ]
    }

    // MARK: App-Token

    @discardableResult
    static func speichern(_ token: String) -> Bool { speichern(Data(token.utf8), konto: tokenKonto) }

    static func lesen() -> String? { lesen(konto: tokenKonto).flatMap { String(data: $0, encoding: .utf8) } }

    static func loeschen() { loeschen(konto: tokenKonto) }

    // MARK: Studio-Zugänge (1.2)

    static func zugaengeLesen() -> [StudioZugang] {
        guard let d = lesen(konto: zugaengeKonto) else { return [] }
        return (try? JSONDecoder().decode([StudioZugang].self, from: d)) ?? []  // ds-ok: kaputter Eintrag = keine weiteren Studios gespeichert
    }

    @discardableResult
    static func zugaengeSpeichern(_ z: [StudioZugang]) -> Bool {
        guard !z.isEmpty else { loeschen(konto: zugaengeKonto); return true }
        guard let d = try? JSONEncoder().encode(z) else { return false }  // ds-ok: Kodieren einfacher Texte schlägt nicht fehl
        return speichern(d, konto: zugaengeKonto)
    }

    static func zugaengeLoeschen() { loeschen(konto: zugaengeKonto) }

    // MARK: Allgemein

    @discardableResult
    static func speichern(_ daten: Data, konto: String) -> Bool {
        loeschen(konto: konto)
        var q = basis(konto)
        q[kSecValueData as String] = daten
        q[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        let status = SecItemAdd(q as CFDictionary, nil)
        // -34018 = errSecMissingEntitlement: typisch für unsignierte Simulator-Builds (dann nur bis zum Neustart gespeichert)
        if status != errSecSuccess { log.error("Schlüsselbund: Speichern fehlgeschlagen (\(status, privacy: .public))") }
        return status == errSecSuccess
    }

    static func lesen(konto: String) -> Data? {
        var q = basis(konto)
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var ergebnis: AnyObject?
        guard SecItemCopyMatching(q as CFDictionary, &ergebnis) == errSecSuccess else { return nil }
        return ergebnis as? Data
    }

    static func loeschen(konto: String) {
        SecItemDelete(basis(konto) as CFDictionary)
    }
}
