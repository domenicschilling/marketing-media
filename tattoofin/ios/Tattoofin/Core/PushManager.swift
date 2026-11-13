import Foundation
import UIKit
import UserNotifications

/// Push-Mitteilungen: Erlaubnis, APNs-Registrierung, Geräte-Token an den Server.
/// Echt-Versand wartet auf Apple-Team-ID und APNs-Schlüssel (.p8) beim Server. Bis dahin meldet der Server apnsAktiv=false.
@MainActor
final class PushManager {
    static let shared = PushManager()
    private init() {}

    /// Zuletzt vom Server gemeldet (nur für den Debug-Bereich, nicht fürs Studio)
    private(set) var apnsAktiv: Bool?

    static var umgebung: String {
        #if DEBUG
        "sandbox"
        #else
        "production"
        #endif
    }

    func status() async -> UNAuthorizationStatus {
        await UNUserNotificationCenter.current().notificationSettings().authorizationStatus
    }

    /// Systemabfrage (erst nach unserer Erklärung) und Registrierung bei APNs
    @discardableResult
    func erlaubnisAnfragen() async -> Bool {
        do {
            let ok = try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])
            if ok { UIApplication.shared.registerForRemoteNotifications() }
            return ok
        } catch {
            log.error("Mitteilungen: Erlaubnis fehlgeschlagen: \(error.localizedDescription, privacy: .public)")
            return false
        }
    }

    /// Bei jedem Start mit Anmeldung: wenn erlaubt, neu registrieren (Token kann sich ändern)
    func beiStartRegistrieren() {
        Task {
            let s = await status()
            if s == .authorized || s == .provisional || s == .ephemeral {
                UIApplication.shared.registerForRemoteNotifications()
            }
        }
    }

    /// Von APNs erhalten (AppDelegate)
    func tokenErhalten(_ daten: Data) {
        let hex = TokenHex.hex(daten)
        Einstellungen.pushToken = hex
        Task { await tokenSenden(hex) }
    }

    func registrierungFehlgeschlagen(_ fehler: Error) {
        // Im Simulator ohne Signatur bzw. ohne aps-environment normal. Nur protokollieren.
        log.notice("Mitteilungen: Registrierung bei APNs nicht möglich: \(fehler.localizedDescription, privacy: .public)")
    }

    func tokenSenden(_ hex: String) async {
        guard AppState.shared.sitzung != nil else { return }
        do {
            let a = try await APIClient.shared.pushTokenSenden(hex, umgebung: Self.umgebung)
            apnsAktiv = a.apnsAktiv
            log.info("Mitteilungen: Token gesendet, apnsAktiv=\(a.apnsAktiv ?? false, privacy: .public)")
        } catch {
            log.error("Mitteilungen: Token senden fehlgeschlagen: \(fehlerText(error), privacy: .public)")
        }
    }
}
