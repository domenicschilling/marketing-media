import UIKit
import UserNotifications

/// UIKit-Anbindung für Push (Geräte-Token, Mitteilungen) und Start des Kauf-Abgleichs (StoreKit).
final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        // Käufe, die außerhalb des Kauf-Bildschirms durchgehen (Ask to Buy, Verlängerungen, abgebrochene Bestätigung),
        // sofort beim Start beobachten (Pflicht laut Apple), noch bevor die Anmeldung geladen ist
        // Ausnahme: gehostete Unit-Tests. Dort richtet SKTestSession StoreKit erst im Test ein, und StoreKit muss
        // in diesem Prozess danach zum ersten Mal benutzt werden (sonst fragt es den echten App Store).
        if ProcessInfo.processInfo.environment["XCTestConfigurationFilePath"] == nil {
            AboManager.shared.beobachten()
        }
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        PushManager.shared.tokenErhalten(deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        PushManager.shared.registrierungFehlgeschlagen(error)
    }

    /// Inhalt der Mitteilung (typ, zahlungId, payoutId) als einfache Texte auslesen
    private nonisolated static func felder(_ n: UNNotification) -> (typ: String?, zahlungId: String?, payoutId: String?) {
        let info = n.request.content.userInfo
        return (info["typ"] as? String, info["zahlungId"] as? String, info["payoutId"] as? String)
    }

    /// Auch im Vordergrund als Banner zeigen; offenes Zahlungslink-Sheet lädt sofort neu.
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter,
                                            willPresent notification: UNNotification) async -> UNNotificationPresentationOptions {
        let f = Self.felder(notification)
        await MainActor.run { AppState.shared.mitteilungErhalten(typ: f.typ, zahlungId: f.zahlungId) }
        return [.banner, .list, .sound]
    }

    /// Angetippt: in den passenden Tab bzw. die Detailseite springen
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter,
                                            didReceive response: UNNotificationResponse) async {
        let f = Self.felder(response.notification)
        await MainActor.run { AppState.shared.mitteilungGeoeffnet(typ: f.typ, zahlungId: f.zahlungId, payoutId: f.payoutId) }
    }
}
