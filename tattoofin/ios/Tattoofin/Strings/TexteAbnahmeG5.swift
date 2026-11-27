import Foundation

// Texte aus der Abnahme 1.1, Gruppe 5 (Konto, Team, Eingabefelder, Anmeldung), 25.11.2026.
// Gleiche Regeln wie Texte.swift: Deutsch, du-Form, kurz, keine Fachwörter.

extension Texte {
    enum AbnahmeG5 {
        // Konto: Stripe in einer Zeile, Details auf eigener Seite
        static let stripe = "Stripe"
        static let stripeBereit = "Alles bereit"
        static let stripeFehlt = "Noch nicht fertig"
        static let stripeTest = "Testmodus"
        static let stripeSeiteHinweis = "Über Stripe bekommst du dein Geld. Sind alle drei Punkte grün, ist alles bereit."
        static let stripeTestHinweis = "Im Testmodus brauchst du kein Stripe. Zahlungen sind nur zum Ausprobieren."
        static func stripeZeileLabel(_ zustand: String) -> String { "Stripe: \(zustand)" }

        // Konto: Hilfe
        static let hilfe = "Hilfe"
        static let whatsapp = "WhatsApp schreiben"
        static let email = "E-Mail schreiben"
        static let whatsappHinweis = "Öffnet WhatsApp"
        static let emailHinweis = "Öffnet eine E-Mail an info@tattoofin.de"

        // Konto: Vertrag in einer Zeile
        static func vertragWert(_ paket: String?, _ status: String?) -> String {
            [paket, status].compactMap { $0 }.joined(separator: " · ")
        }

        // Team: Entfernen per Wischen, Rückfrage mit der Wahl „alle abmelden“
        static let teamHinweisInhaber = "Team-Mitglieder melden sich mit ihrer eigenen Adresse an und können kassieren. Zum Entfernen eine Adresse nach links wischen."
        static let entfernenText = "Die App-Geräte dieser Adresse werden sofort abgemeldet. Willst du sicher sein, dass niemand mehr angemeldet ist, melde alle ab. Dann bist du auch auf diesem iPhone abgemeldet."
        static let entfernenUndAlleAbmelden = "Entfernen und alle abmelden"
    }
}
