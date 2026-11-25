import Foundation

// Texte für 1.1 Gestaltung (Konto, Team). Einfache Sprache, du-Form, keine Fachwörter.

extension Texte {
    enum GestaltungG3 {
        /// Team: Fußtext unter „Zusätzlich alle abmelden“
        static let alleAbmeldenHinweis = "Schalter an: Beim Speichern werden alle Geräte abgemeldet, auch dieses iPhone."

        /// Vertragsstand im Konto auf Deutsch (der Server schickt bei laufendem Vertrag „live“/„Live“)
        static func vertragStatus(_ text: String) -> String {
            switch text.trimmingCharacters(in: .whitespaces).lowercased() {
            case "live", "active": return "Aktiv"
            default: return text
            }
        }
    }
}
