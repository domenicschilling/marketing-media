import Foundation
import Photos
import UIKit

/// Bilder und Videos in „Fotos“ speichern. Nur mit dem Recht „Hinzufügen“ (.addOnly): Die App sieht nie, was in Fotos liegt.
/// Info.plist: NSPhotoLibraryAddUsageDescription („Zum Speichern deiner Werbevideos und Bilder in Fotos“).
enum FotoSpeicher {
    enum Fehler: Error, Equatable {
        case keinZugriff
        case fehlgeschlagen
    }

    static func zugriff() async -> Bool {
        let stand = PHPhotoLibrary.authorizationStatus(for: .addOnly)
        switch stand {
        case .authorized, .limited: return true
        case .notDetermined:
            let neu = await PHPhotoLibrary.requestAuthorization(for: .addOnly)
            return neu == .authorized || neu == .limited
        default: return false
        }
    }

    /// Mehrere PNG-Bilder auf einmal (z. B. alle 4 Bilder eines Karussells)
    static func bilder(_ pngs: [Data]) async throws {
        guard await zugriff() else { throw Fehler.keinZugriff }
        do {
            try await PHPhotoLibrary.shared().performChanges {
                for d in pngs {
                    PHAssetCreationRequest.forAsset().addResource(with: .photo, data: d, options: nil)
                }
            }
        } catch {
            log.error("Fotos: Bilder nicht gespeichert: \(error.localizedDescription, privacy: .public)")
            throw Fehler.fehlgeschlagen
        }
    }

    /// Video-Datei (lokal) speichern
    static func video(_ datei: URL) async throws {
        guard await zugriff() else { throw Fehler.keinZugriff }
        do {
            try await PHPhotoLibrary.shared().performChanges {
                PHAssetCreationRequest.forAsset().addResource(with: .video, fileURL: datei, options: nil)
            }
        } catch {
            log.error("Fotos: Video nicht gespeichert: \(error.localizedDescription, privacy: .public)")
            throw Fehler.fehlgeschlagen
        }
    }

    /// Text zur Anzeige
    static func text(_ e: Error) -> String {
        switch e as? Fehler {
        case .keinZugriff: WerbungTexte.fotosKeinZugriff
        default: WerbungTexte.fotosFehler
        }
    }
}

/// Dateien für „Teilen“ und „Speichern“ in einem eigenen Zwischenordner (wird beim Abmelden nicht gebraucht, iOS räumt tmp auf)
enum TeilenDateien {
    static var ordner: URL {
        let u = FileManager.default.temporaryDirectory.appending(path: "tf-werbung", directoryHint: .isDirectory)
        try? FileManager.default.createDirectory(at: u, withIntermediateDirectories: true)
        return u
    }

    /// PNG-Daten als Dateien mit sprechendem Namen ablegen
    static func bilder(_ pngs: [Data], name: String) -> [URL] {
        pngs.enumerated().compactMap { i, d in
            let u = ordner.appending(path: pngs.count > 1 ? "\(name)-\(i + 1).png" : "\(name).png")
            return (try? d.write(to: u, options: .atomic)) != nil ? u : nil
        }
    }

    /// Öffentliche Datei (Video) laden, einmal je Adresse; liegt sie schon da, sofort zurück
    static func laden(_ url: URL, name: String) async throws -> URL {
        let ziel = ordner.appending(path: name)
        if FileManager.default.fileExists(atPath: ziel.path()) { return ziel }
        let (tmp, antwort) = try await URLSession.shared.download(from: url)
        guard let http = antwort as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            try? FileManager.default.removeItem(at: tmp)
            throw APIFehler.unbekannt
        }
        try? FileManager.default.removeItem(at: ziel)
        try FileManager.default.moveItem(at: tmp, to: ziel)
        return ziel
    }

    /// Dateiname ohne Sonderzeichen („Ink & Art Köln“ → „ink-art-koeln“)
    static func slug(_ s: String) -> String {
        let t = s.lowercased()
            .replacingOccurrences(of: "ä", with: "ae").replacingOccurrences(of: "ö", with: "oe")
            .replacingOccurrences(of: "ü", with: "ue").replacingOccurrences(of: "ß", with: "ss")
        let erlaubt = t.map { ($0.isASCII && ($0.isLetter || $0.isNumber)) ? $0 : "-" }
        let teile = String(erlaubt).split(separator: "-", omittingEmptySubsequences: true)
        let r = teile.joined(separator: "-")
        return String(r.prefix(40)).isEmpty ? "studio" : String(r.prefix(40))
    }
}
