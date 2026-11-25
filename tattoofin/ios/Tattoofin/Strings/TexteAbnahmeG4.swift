import Foundation

// Texte für die Abnahme 1.1, Gruppe G4 (Zahlungen, Gutscheine, Kasse). Einfache Sprache, du-Form, keine Fachwörter.

extension Texte {
    enum AbnahmeG4 {
        /// Karte oben in Zahlungen: „630,00 € verfügbar“
        static func verfuegbar(_ betrag: String) -> String { "\(betrag) verfügbar" }
        /// Karte ohne bekannten Betrag
        static let auszahlungenUnterzeile = "Geld auf dein Bankkonto"
        /// VoiceOver-Hinweis der Karte
        static let auszahlungenHinweis = "Öffnet deine Auszahlungen."
        /// Filter-Knopf in der Navigationsleiste
        static let filterZeigen = "Zahlungen filtern"
        /// Hinweis über der Liste, wenn gefiltert ist
        static func gefiltert(_ filter: String) -> String { "Nur: \(filter)" }
        static let alleZeigen = "Alle zeigen"
    }
}
