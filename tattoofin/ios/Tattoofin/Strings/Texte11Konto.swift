import Foundation

// Texte aus der Prüfrunde 1.1 (Konto, Abo, Werbung ohne Klarna), 23.11.2026.
// Gleiche Regeln wie Texte.swift: Deutsch, du-Form, kurz, keine Fachwörter. Kein Web-Preis, kein Bezahlen im Web.
// Klarna nur als Name, keine Raten-Aussage (sonst Pflichtsatz aus KlarnaTexte).

extension Texte {
    enum Konto11 {
        // Abo (Konto)
        /// Team-Mitglieder sehen im Apple-Fenster ihre eigene Apple-ID, nicht das Studio-Abo
        static let aboNurHauptadresse = "Das Abo verwaltet die Hauptadresse deines Studios."

        // Fehler direkt im Abschnitt
        static func nichtGespeichert(_ fehler: String) -> String { "Nicht gespeichert. \(fehler)" }
        static func nichtGeprueft(_ fehler: String) -> String { "Prüfen hat nicht geklappt. \(fehler)" }

        // Kauf im Abo-Bildschirm (statt des rohen StoreKit-Textes)
        static let kaufKeinNetz = "Keine Verbindung zum App Store. Prüf dein Internet und versuch es nochmal."
        static let kaufGesperrt = "Käufe sind auf diesem iPhone gesperrt. Du erlaubst sie in den Einstellungen unter Bildschirmzeit."
        static let kaufNichtVerfuegbar = "Das Abo gibt es in deinem App Store gerade nicht. Bitte versuch es später nochmal."
        static let kaufAllgemein = "Der Kauf hat nicht geklappt. Bitte versuch es nochmal."

        // Werbung ohne Klarna-Material
        static let klarnaAusTitel = "Klarna ist bei dir noch aus"
        static let klarnaAusInhaber = "Darum gibt es hier noch kein Werbevideo und keine fertigen Beiträge. Du schaltest Klarna selbst in deinem Stripe-Konto ein. Bis dahin wirbst du mit dem QR-Code deiner Zahlseite."
        static let klarnaAusTeam = "Darum gibt es hier noch kein Werbevideo und keine fertigen Beiträge. Klarna schaltet der Inhaber im Stripe-Konto ein. Bis dahin wirbst du mit dem QR-Code deiner Zahlseite."
        static let ohneKlarnaText = "Video und Beiträge werben mit Klarna. Die gibt es nur, wenn Klarna bei dir dauerhaft dabei ist. Werben kannst du mit dem QR-Code deiner Zahlseite. Fragen? Schreib unserem Team."
    }
}
