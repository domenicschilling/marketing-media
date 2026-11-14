import CryptoKit
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

    /// Öffentliche Datei (Video) laden, einmal je Adresse und Stand. Der Stand (ETag/Last-Modified vom Server) steckt im Ordnernamen:
    /// Wird ein Video auf dem Server ersetzt, lädt die App die neue Fassung. Ohne Internet nimmt sie die zuletzt geladene.
    static func laden(_ url: URL, name: String) async throws -> URL {
        var kopf = URLRequest(url: url)
        kopf.httpMethod = "HEAD"
        kopf.timeoutInterval = 10
        var stand: String?
        if let (_, a) = try? await URLSession.shared.data(for: kopf), let h = a as? HTTPURLResponse, (200..<300).contains(h.statusCode) {
            stand = h.value(forHTTPHeaderField: "ETag") ?? h.value(forHTTPHeaderField: "Last-Modified") ?? h.value(forHTTPHeaderField: "Content-Length")
        }
        guard let stand else {
            // Server nicht erreichbar: vorhandene Fassung nehmen, sonst normal laden (und Fehler melden)
            if let alt = vorhandene(name) { return alt }
            return try await herunterladen(url, nach: unterordner("ohne-stand").appending(path: name))
        }
        let ziel = unterordner(kennung(url.absoluteString + "|" + stand)).appending(path: name)
        if FileManager.default.fileExists(atPath: ziel.path()) { return ziel }
        return try await herunterladen(url, nach: ziel)
    }

    private static func herunterladen(_ url: URL, nach ziel: URL) async throws -> URL {
        let (tmp, antwort) = try await URLSession.shared.download(from: url)
        guard let http = antwort as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            try? FileManager.default.removeItem(at: tmp)
            throw APIFehler.unbekannt
        }
        try? FileManager.default.removeItem(at: ziel)
        try FileManager.default.moveItem(at: tmp, to: ziel)
        return ziel
    }

    private static func unterordner(_ n: String) -> URL {
        let u = ordner.appending(path: n, directoryHint: .isDirectory)
        try? FileManager.default.createDirectory(at: u, withIntermediateDirectories: true)
        return u
    }

    /// Kurze, gleichbleibende Kennung (SHA-256, 16 Zeichen) für Adresse + Stand
    static func kennung(_ text: String) -> String {
        SHA256.hash(data: Data(text.utf8)).prefix(8).map { String(format: "%02x", $0) }.joined()
    }

    /// Zuletzt geladene Datei dieses Namens (in irgendeinem Stand-Ordner)
    private static func vorhandene(_ name: String) -> URL? {
        let fm = FileManager.default
        let ordnerListe = (try? fm.contentsOfDirectory(at: ordner, includingPropertiesForKeys: [.contentModificationDateKey])) ?? []
        return ordnerListe
            .map { $0.appending(path: name) }
            .filter { fm.fileExists(atPath: $0.path()) }
            .max { a, b in
                let da = (try? a.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? .distantPast
                let db = (try? b.resourceValues(forKeys: [.contentModificationDateKey]).contentModificationDate) ?? .distantPast
                return da < db
            }
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
