import Foundation

// Texte für Einstellungen, Recht, Fragebogen, Nachweis, Abrechnungen und Hilfe.
// Gleiche Regeln wie Texte.swift: Deutsch, du-Form, kurz. „Wir/unser Team“, nie ein Personenname.
// Kein Paket, kein Web-Preis, kein Website-Kauf. Klarna nur mit Namen; wo Raten erwähnt werden, Fußnote aus KlarnaTexte.

extension Texte {
    enum Mehr {
        static let abschnitt = "Dein Studio"
        static let einstellungen = "Einstellungen"
        static let einstellungenText = "Anzahlung, Zahlseite, E-Mail"
        static let recht = "Deine rechtliche Lage"
        static let rechtOffen = "Wer trägt welches Risiko? Kurz erklärt."
        static func rechtGelesen(_ d: String) -> String { "Gelesen am \(d)" }
        static let fragebogen = "Fragebogen"
        static let fragebogenOffen = "Hilft uns bei der Einrichtung."
        static func fragebogenAm(_ d: String) -> String { "Ausgefüllt am \(d)" }
        static let abrechnungen = "Abrechnungen"
        static let stripeAnsehen = "Bei Stripe ansehen"
        static let stripeAnsehenText = "Bankkonto, Firmendaten, Auszahlungen"
        static let hilfeWhatsapp = "Hilfe per WhatsApp"
        static let hilfeWhatsappText = "Unser Team hilft dir per WhatsApp"
        static let hilfeWhatsappNachricht = "Hallo Tattoofin-Team, ich habe eine Frage zur App:"
        static let nurInhaber = "Das kann nur der Inhaber ändern."
        static let rechtNurInhaber = "Bestätigen kann nur der Inhaber."
    }

    enum Einst {
        static let titel = "Einstellungen"
        static let speichern = "Speichern"
        static let gespeichert = "Gespeichert"
        static let anzahlungTitel = "Anzahlungsbedingungen"
        static let anzahlungText = "Sieht dein Kunde bei jeder Anzahlung und muss sie bestätigen. Leer lassen = Standardtext."
        static let anzahlungFeld = "Deine Bedingungen"
        static func zeichen(_ n: Int) -> String { "\(n) von 1000 Zeichen" }
        static let anzahlungKurz = "Unter 30 Zeichen gilt der Standardtext."
        static let ausweichTitel = "Wenn Klarna nicht zustimmt"
        static let ausweichText = "Klarna prüft jeden Kunden selbst. Stimmt Klarna nicht zu, kann dein Kunde mit Karte zahlen. Auf Wunsch bieten wir ihm zusätzlich an: Anzahlung jetzt per Karte, den Rest zahlt er direkt bei dir im Studio (mit deinen Anzahlungsbedingungen)."
        static let ausweichAn = "Anzahlung als Ausweg anbieten"
        static let ausweichHoehe = "Höhe der Anzahlung"
        static func prozent(_ p: Int) -> String { "\(p) % vom Betrag" }
        static let hinweisTitel = "Hinweis auf deiner Zahlseite"
        static let hinweisText = "Auf Wunsch steht auf deiner Zahlseite: „Im nächsten Schritt siehst du die Zahlarten, die dir angeboten werden, zum Beispiel Karte, Apple Pay oder Klarna.*“, mit dem Pflichtsatz darunter. Das entscheidest du selbst."
        static let hinweisAn = "Hinweis auf meiner Zahlseite zeigen"
        static let emailTitel = "Benachrichtigungen"
        static let emailFeld = "E-Mail für Zahlungsbenachrichtigungen"
        static let emailFalsch = "Bitte eine gültige E-Mail-Adresse eingeben."
        static let nurInhaber = "Diese Einstellungen kann nur der Inhaber ändern."
    }

    enum Recht {
        static let titel = "Deine rechtliche Lage"
        static let lesen = "Blatt lesen"
        static let lesenText = "Wer trägt welches Risiko? Kurz und ohne Fachchinesisch."
        static let bestaetigenTitel = "Bestätigen"
        static let haken = "Ich habe das Blatt gelesen und verstanden. Mir ist klar, dass es keine Rechtsberatung ist."
        static let name = "Dein Name"
        static let bestaetigen = "Bestätigen"
        static let hakenFehlt = "Bitte setze erst das Häkchen."
        static let nameFehlt = "Bitte trag deinen Namen ein."
        static let danke = "Danke! Gespeichert mit Datum und Version."
        static func bestaetigt(_ d: String, _ v: String) -> String { "Gelesen und bestätigt am \(d) · Version \(v)" }
        static let neueVersion = "Das Blatt wurde aktualisiert. Bitte lies es nochmal und bestätige neu."
    }

    enum Frage {
        static let titel = "Fragebogen"
        static let intro = "Damit richten wir Zahlungsarten, Farben, Logo und deine Werbe-Bilder passend ein. Du kannst jederzeit speichern und später weitermachen."
        static let senden = "Speichern und absenden"
        static let danke = "Danke, gespeichert! Unser Team meldet sich bei dir."
        static func zuletzt(_ d: String) -> String { "Zuletzt gespeichert: \(d)" }
        // Abschnitte wie onboarding.html
        static let a1 = "1. Studio"
        static let a2 = "2. Projekte und Preise"
        static let a3 = "3. Gewünschte Zahlungsarten"
        static let a4 = "4. Farben und Logo"
        static let a5 = "5. Team und Schulung"
        static let a6 = "6. Werbe-Bilder und Vorlagen"
    }

    enum Nachweis {
        static let knopf = "Nachweis als PDF teilen"
        static let erstellt = "Nachweis wird erstellt …"
        static let titel = "Nachweis zur Zahlung"
        static let einleitung = "Zusammenstellung der in Tattoofin gespeicherten Nachweise. Keine Rechtsberatung; ob sie im Einzelfall ausreichen, entscheiden Bank bzw. Zahlungsanbieter."
        static func kopf(_ d: String, _ id: String) -> String { "Erstellt am \(d) mit Tattoofin · Zahlungs-Nr. \(id)" }
        static let studio = "Studio"
        static let inhaber = "Inhaber"
        static let adresse = "Adresse"
        static let zahlung = "Zahlung"
        static let kunde = "Kunde"
        static let email = "E-Mail"
        static let betrag = "Betrag"
        static let projekt = "Projekt"
        static let sitzungen = "Sitzungen"
        static let art = "Art"
        static let status = "Status"
        static let bezahltAm = "Bezahlt am"
        static let zahlart = "Zahlart"
        static let stripeZahlung = "Stripe-Zahlung"
        static let anzahlung = "Anzahlung"
        static let zahlungArt = "Zahlung"
        static let beimBezahlen = "Bestätigung beim Bezahlen"
        static func beimBezahlenText(_ d: String, _ v: String) -> String { "Vor dem Bezahlen hat der Kunde per Häkchen bestätigt (\(d), Version \(v)):" }
        static let beimBezahlenKeine = "Keine (Zahlung vor Einführung dieser Funktion oder noch nicht bezahlt)."
        static let bedingungen = "Anzahlungsbedingungen bestätigt"
        static func bedingungenAm(_ d: String) -> String { "am \(d):" }
        static let leistung = "Leistungsbestätigung nach dem Termin"
        static func leistungText(_ d: String, _ name: String, _ termin: String, _ v: String) -> String {
            "Bestätigt am \(d) von \(name) (Termin: \(termin), Version \(v)):"
        }
        static let leistungKeine = "Noch keine Leistungsbestätigung."
        static let unterschrift = "Unterschrift:"
        static func foto(_ einw: String) -> String { "Foto (Einwilligung: „\(einw)“):" }
        static func ip(_ ip: String) -> String { "IP-Adresse: \(ip)" }
        static let schluss = "Hinweis: Dieser Nachweis hilft bei Rückfragen und Rückbuchungen. Über eine Rückbuchung entscheiden Bank oder Zahlungsanbieter. Er enthält personenbezogene Daten des Kunden: Nutze ihn nur zur Klärung dieser Zahlung (z. B. gegenüber Stripe, Klarna oder der Bank), bewahre ihn sicher auf und lösche ihn, wenn du ihn nicht mehr brauchst."
        static func dateiname(_ id: String) -> String { "Nachweis-\(id).pdf" }
    }

    enum Abrechnungen {
        static let titel = "Abrechnungen"
        static let leer = "Noch keine Abrechnungen. Die erste kommt am 1. des Folgemonats nach deiner ersten Zahlung über Tattoofin."
        static func zahlungen(_ n: Int) -> String { n == 1 ? "1 Zahlung" : "\(n) Zahlungen" }
        static let umsatz = "Kunden haben gezahlt"
        static func tattoofin(_ p: String) -> String { "Tattoofin \(p)\u{00A0}% inkl. MwSt." }
        static let anDich = "An dich ausgezahlt"
        static func rechnung(_ nr: String?) -> String { nr.map { "Rechnung \($0) ansehen" } ?? "Rechnung ansehen" }
        static let fuss = "Die Provision wurde bei jeder Zahlung schon automatisch einbehalten, die Gebühren der Zahlungsanbieter sind darin enthalten. Die Rechnung ist für deine Buchhaltung."
    }

    enum Kasse2 {
        static let heute = "Kunde wird heute tätowiert"
        static let heuteHinweis = "Dann sieht er beim Bezahlen: „Tätowierung vor Ort“."
        static func provision(anDich: Int, prozent: String, gebuehr: Int) -> String {
            "Du bekommst \(Euro.text(anDich)) · Tattoofin \(prozent)\u{00A0}% (\(Euro.text(gebuehr)), alles inklusive)"
        }
        static let gebuehrStripe = "Die Gebühr des Zahlungsanbieters (z. B. Karte ab 1,5\u{00A0}% + 0,25\u{00A0}€) zahlst du direkt an Stripe."
    }
}
