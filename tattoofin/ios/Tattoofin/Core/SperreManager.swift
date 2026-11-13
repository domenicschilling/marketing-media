import Foundation
import LocalAuthentication
import Observation

/// App-Sperre mit Face ID / Touch ID, Rückfall auf den Gerätecode (.deviceOwnerAuthentication).
/// Sperrt beim Start und wenn die App länger als 5 Minuten im Hintergrund war.
@MainActor
@Observable
final class SperreManager {
    /// 5 Minuten. Nur im Debug-Build für Tests verkürzbar: Startargument  -TFSperreSekunden 5
    static var hintergrundGrenze: TimeInterval {
        #if DEBUG
        let s = UserDefaults.standard.double(forKey: "TFSperreSekunden")
        if s > 0 { return s }
        #endif
        return 5 * 60
    }

    private(set) var gesperrt = false
    private(set) var prueftGerade = false
    var fehler: String?
    private var imHintergrundSeit: Date?

    /// Kann das Gerät überhaupt sperren (Biometrie oder Gerätecode eingerichtet)?
    var verfuegbar: Bool {
        LAContext().canEvaluatePolicy(.deviceOwnerAuthentication, error: nil)
    }

    /// „Face ID“, „Touch ID“, „Optic ID“ oder „Gerätecode“
    var artName: String {
        let c = LAContext()
        _ = c.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: nil)
        switch c.biometryType {
        case .faceID: return "Face ID"
        case .touchID: return "Touch ID"
        case .opticID: return "Optic ID"
        default: return "Gerätecode"
        }
    }

    var aktiv: Bool { Einstellungen.faceIDAn && verfuegbar }

    func beimStart() {
        gesperrt = aktiv
    }

    func entsperrt() {
        gesperrt = false
        fehler = nil
    }

    func inDenHintergrund() {
        imHintergrundSeit = .now
    }

    func wiederAktiv() {
        defer { imHintergrundSeit = nil }
        guard aktiv, let seit = imHintergrundSeit else { return }
        if Date.now.timeIntervalSince(seit) > Self.hintergrundGrenze { gesperrt = true }
    }

    /// Face ID (bzw. Gerätecode) abfragen. true = erfolgreich.
    @discardableResult
    func pruefen(grund: String = Texte.Sperre.grund) async -> Bool {
        guard !prueftGerade else { return false }
        prueftGerade = true
        defer { prueftGerade = false }
        let c = LAContext()
        c.localizedCancelTitle = Texte.Allgemein.abbrechen
        var e: NSError?
        guard c.canEvaluatePolicy(.deviceOwnerAuthentication, error: &e) else {
            log.notice("Sperre: nicht verfügbar: \(e?.localizedDescription ?? "-", privacy: .public)")
            // Kein Gerätecode eingerichtet: keine Sperre möglich
            gesperrt = false
            return true
        }
        do {
            let ok = try await c.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: grund)
            if ok { entsperrt() }
            return ok
        } catch let la as LAError where la.code == .userCancel || la.code == .appCancel || la.code == .systemCancel {
            fehler = nil
            return false
        } catch {
            log.notice("Sperre: Prüfung fehlgeschlagen: \(error.localizedDescription, privacy: .public)")
            fehler = Texte.Sperre.fehlgeschlagen
            return false
        }
    }

    /// Schalter im Konto / bei der Einrichtung: beim Einschalten einmal prüfen
    func einschalten() async -> Bool {
        guard verfuegbar else { return false }
        let ok = await pruefen(grund: Texte.Sperre.grundEinschalten)
        Einstellungen.faceIDAn = ok
        gesperrt = false
        return ok
    }

    func ausschalten() {
        Einstellungen.faceIDAn = false
        gesperrt = false
    }
}
