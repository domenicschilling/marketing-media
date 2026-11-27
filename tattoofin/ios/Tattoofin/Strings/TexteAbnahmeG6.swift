import Foundation

// Texte für den Werbung-Tab nach der Abnahme 1.1 (Gruppe 6): je Material eine Karte mit einem Hauptknopf
// „Speichern“ und zwei runden Knöpfen, die Anleitung nur einmal oben. Einfache Sprache, du-Form.

extension Texte {
    enum AbnahmeG6 {
        /// Anleitung oben, einmal für alle Karten
        static let anleitung = ["Speichern", "Text kopieren", "Posten"]
        static let anleitungLabel = "So geht's: 1. Speichern, 2. Text kopieren, 3. Posten und den Text einfügen."

        /// Sichtbarer Hauptknopf in jeder Karte
        static let speichern = "Speichern"
        /// Vorlesetext des Hauptknopfs beim Video (sagt, was gespeichert wird)
        static let videoSpeichernLabel = "Video in Fotos speichern"

        /// Kurzer Satz unter „Dein Werbevideo“ (Platz für ein größeres Vorschaubild)
        static let videoKurz = "Für Instagram, Facebook und TikTok."
        /// Kurzer Satz unter „Deine Beiträge“
        static let beitraegeKurz = "Fertige Bilder mit deinem Studionamen und dem QR-Code zu deiner Zahlseite."
    }
}
