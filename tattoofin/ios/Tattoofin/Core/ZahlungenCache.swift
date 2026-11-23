import Foundation

/// Zuletzt geladene Zahlungsliste als Datei (Application Support). Wird beim Start sofort gezeigt
/// und beim Abmelden gelöscht. Nur die Zahlungsliste, nichts anderes.
/// Seit 1.2 (Studio-Wechsel) eine Datei je Studio: Nach dem Wechsel erscheinen nie Zahlungen des vorigen Studios.
enum ZahlungenCache {
    private static var ordner: URL? {
        try? FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask,  // ds-ok: Zwischenspeicher, ohne ihn lädt die App vom Server
                                     appropriateFor: nil, create: true)
    }

    private static var datei: URL? {
        guard let ordner, let sid = Einstellungen.sitzung?.studioId, !sid.isEmpty else { return nil }
        let sicher = sid.filter { $0.isLetter || $0.isNumber || $0 == "_" || $0 == "-" }
        return ordner.appending(path: "zahlungen-cache-\(sicher).json")
    }

    static func speichern(_ zahlungen: [Zahlung]) {
        guard let datei, let daten = try? JSONEncoder().encode(zahlungen) else { return }  // ds-ok: Zwischenspeicher
        try? daten.write(to: datei, options: [.atomic, .completeFileProtection])  // ds-ok: Zwischenspeicher
    }

    static func laden() -> [Zahlung]? {
        guard let datei, let daten = try? Data(contentsOf: datei) else { return nil }  // ds-ok: Zwischenspeicher
        return try? JSONDecoder().decode([Zahlung].self, from: daten)  // ds-ok: Zwischenspeicher
    }

    /// Nur das aktuelle Studio (Abmelden aus einem Studio)
    static func loeschen() {
        guard let datei else { return }
        try? FileManager.default.removeItem(at: datei)  // ds-ok: Aufräumen
    }

    /// Alle Studios (ganz abmelden) und die Datei aus Version 1.0/1.1 (ohne Studio im Namen)
    static func alleLoeschen() {
        guard let ordner, let liste = try? FileManager.default.contentsOfDirectory(atPath: ordner.path()) else { return }  // ds-ok: Aufräumen
        for name in liste where name.hasPrefix("zahlungen-cache") && name.hasSuffix(".json") {
            try? FileManager.default.removeItem(at: ordner.appending(path: name))  // ds-ok: Aufräumen
        }
    }
}
