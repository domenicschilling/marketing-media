import Foundation
import Security

/// App-Token im Schlüsselbund: nur auf diesem Gerät, nur entsperrt lesbar, kein iCloud-Abgleich.
enum KeychainStore {
    private static let dienst = "de.tattoofin.app"
    private static let konto = "app-token"

    private static func basis() -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: dienst,
            kSecAttrAccount as String: konto,
            kSecAttrSynchronizable as String: kCFBooleanFalse as Any,
        ]
    }

    @discardableResult
    static func speichern(_ token: String) -> Bool {
        loeschen()
        var q = basis()
        q[kSecValueData as String] = Data(token.utf8)
        q[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        return SecItemAdd(q as CFDictionary, nil) == errSecSuccess
    }

    static func lesen() -> String? {
        var q = basis()
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var ergebnis: AnyObject?
        guard SecItemCopyMatching(q as CFDictionary, &ergebnis) == errSecSuccess,
              let daten = ergebnis as? Data else { return nil }
        return String(data: daten, encoding: .utf8)
    }

    static func loeschen() {
        SecItemDelete(basis() as CFDictionary)
    }
}
