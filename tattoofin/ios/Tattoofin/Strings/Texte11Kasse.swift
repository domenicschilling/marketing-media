import Foundation

// Texte für 1.1 Kasse (Adresse der Zahlseite, Studios ohne Anzahlung, Ausweich-Anzahlung, Auszahlungsdauer).
// Einfache Sprache, du-Form. Kein Klarna/Raten (sonst nur mit KlarnaTexte.pflichtsatz), keine Preise.

extension Texte {
    enum Kasse11 {
        // Adresse der Zahlseite: gesperrte Kasse
        static let adresseTitel = "Noch ein Schritt"
        static let adresseText = "Trag die Adresse deiner Zahlseite ein. Sie steht auf deiner Zahlseite und auf Gutscheinen. Danach kannst du kassieren."
        static let adresseVorschlagText = "Wir haben eine Adresse aus deinem Stripe-Konto. Prüf sie kurz und tipp auf „Stimmt so“. Danach kannst du kassieren."
        static let adresseEintragen = "Adresse eintragen"
        static let adressePruefen = "Adresse prüfen"
        static let adresseSchonJetzt = "Adresse schon jetzt eintragen"
        static let adresseTeam = "Die Adresse kann nur der Studio-Inhaber eintragen. Sag ihm oder ihr kurz Bescheid."
        static let adresseNochNoetig = "Dein Zahlungskonto ist freigegeben. Es fehlt nur noch die Adresse deiner Zahlseite."
        static let checklisteAdresseKnopf = "Eintragen"
        static let checklisteAdresseText = "Steht auf deiner Zahlseite und auf Gutscheinen. Erst damit kannst du kassieren."

        // Adresse der Zahlseite: Maske
        static let adresseMaskeTitel = "Adresse deiner Zahlseite"
        static let adresseMaskeText = "Deine Kunden sehen sie auf der Zahlseite und auf Gutscheinen. So wissen sie, bei welchem Studio sie bezahlen."
        static let adressePrivatText = "Das ist die Adresse aus deinem Stripe-Konto, also deine private Adresse. Sie erscheint erst nach „Stimmt so“. Für die Studio-Adresse einfach überschreiben."
        static let adresseStrasse = "Straße und Hausnummer"
        static let adressePlz = "PLZ"
        static let adressePlzFuenf = "PLZ (5 Ziffern)"
        static let adresseOrt = "Ort"
        static let adresseStrasseBeispiel = "z. B. Hauptstraße 12"
        static let adressePlzBeispiel = "z. B. 96047"
        static let adresseOrtBeispiel = "z. B. Bamberg"
        static let adresseStimmtSo = "Stimmt so"
        static let adresseSpeichern = "Speichern"
        static let adresseGespeichert = "Gespeichert. Deine Zahlseite ist bereit."
        static let adresseGespeichertKurz = "Gespeichert."
        static func adresseBitteAusfuellen(_ felder: [String]) -> String { "Bitte ausfüllen: " + felder.joined(separator: ", ") }

        // Studios ohne Anzahlung
        static let keineAnzahlung = "Dein Studio nimmt über Tattoofin keine Anzahlungen an."

        // Ausweich-Anzahlung (Original-Link)
        static func angezahlt(anzahlung: Int, rest: Int) -> String {
            "Dein Kunde hat stattdessen \(Euro.text(anzahlung)) angezahlt. Den Rest von \(Euro.text(rest)) zahlt er bei dir im Studio. Dieser Link ist damit erledigt."
        }
        static let angezahltKurz = "Dein Kunde hat stattdessen eine Anzahlung bezahlt. Den Rest zahlt er bei dir im Studio."
        static let angezahltWert = "Angezahlt"
        static let restImStudio = "Rest im Studio"

        // Zahlungslink-Blatt nach 15 Minuten
        static let nichtMehrAutomatisch = "Der Status wird nicht mehr automatisch geprüft."
        static let jetztPruefen = "Jetzt prüfen"

        // Erstattung bei Zahlungen mit Provision
        static let erstattungProvision = "Geld an deinen Kunden zurückgeben: im Studio-Bereich auf tattoofin.de bei dieser Zahlung (Knopf „Geld zurückgeben“)."

        // Auszahlungen
        static let ersteAuszahlung = "Die erste Auszahlung dauert meist 7 bis 14 Tage. Danach kommt das Geld regelmäßig von selbst auf dein Bankkonto."
    }
}
