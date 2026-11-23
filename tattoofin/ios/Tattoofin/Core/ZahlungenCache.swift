import Foundation

/// Zuletzt geladene Zahlungsliste als Datei (Application Support). Wird beim Start sofort gezeigt
/// und beim Abmelden gelöscht. Nur die Zahlungsliste, nichts anderes.
enum ZahlungenCache {
    private static var datei: URL? {
        guard let ordner = try? FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask,  // ds-ok: Zwischenspeicher, ohne ihn lädt die App vom Server
                                                        appropriateFor: nil, create: true) else { return nil }
        return ordner.appending(path: "zahlungen-cache.json")
    }

    static func speichern(_ zahlungen: [Zahlung]) {
        guard let datei, let daten = try? JSONEncoder().encode(zahlungen) else { return }  // ds-ok: Zwischenspeicher
        try? daten.write(to: datei, options: [.atomic, .completeFileProtection])  // ds-ok: Zwischenspeicher
    }

    static func laden() -> [Zahlung]? {
        guard let datei, let daten = try? Data(contentsOf: datei) else { return nil }  // ds-ok: Zwischenspeicher
        return try? JSONDecoder().decode([Zahlung].self, from: daten)  // ds-ok: Zwischenspeicher
    }

    static func loeschen() {
        guard let datei else { return }
        try? FileManager.default.removeItem(at: datei)  // ds-ok: Aufräumen
    }
}
