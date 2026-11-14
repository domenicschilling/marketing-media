import Foundation

// Texte für Einstellungen, Recht, Fragebogen, Nachweis, Abrechnungen, Hilfe und QR-Aufsteller.
// Gleiche Regeln wie Texte.swift: Deutsch, du-Form, kurz. „Wir/unser Team“, nie ein Personenname.
// Kein Paket, kein Web-Preis, kein Website-Kauf. Klarna nur mit Namen; wo Raten erwähnt werden, Fußnote aus KlarnaTexte.

extension Texte {
    enum Mehr {
        static let abschnitt = "Dein Studio"
        static let einstellungen = "Einstellungen"
        static let einstellungenText = "Anzahlung, Zahlseite, E-Mail"
        static let recht = "Deine rechtliche Lage"
        static let rechtOffen = "Wer trägt welches Risiko? Einfach erklärt."
        static func rechtGelesen(_ d: String) -> String { "Gelesen am \(d)" }
        static let fragebogen = "Fragebogen"
        static let fragebogenOffen = "Hilft uns bei der Einrichtung (10 Minuten)"
        static func fragebogenAm(_ d: String) -> String { "Ausgefüllt am \(d)" }
        static let abrechnungen = "Abrechnungen"
        static let aufsteller = "QR-Aufsteller aus Holz"
        static let aufstellerText = "Graviert mit deinem QR-Code"
        static let stripeAnsehen = "Bei Stripe ansehen"
        static let stripeAnsehenText = "Bankkonto, Firmendaten, Auszahlungen"
        static let hilfeWhatsapp = "Hilfe per WhatsApp"
        static let hilfeWhatsappText = "Unser Team hilft dir · Mo–Fr 9–17 Uhr"
        static let hilfeWhatsappNachricht = "Hallo Tattoofin-Team, ich habe eine Frage zur App:"
        static let nurInhaber = "Das kann nur der Inhaber ändern."
        static let rechtNurInhaber = "Bestätigen kann nur der Inhaber."
        /// Vertragsänderungen (Paketwechsel, Umstellung) und Erstattungen: in der App bewusst nicht (ohne Link auf die Website). Kündigen geht unten über „Konto kündigen und löschen“.
        static let nichtInDerApp = "Vertragsänderungen und Erstattungen klärst du mit unserem Team. Schreib uns einfach."
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
        static let intro = "Ca. 10 Minuten. Damit richten wir Zahlungsarten, Branding und dein Studio Kit passend ein. Du kannst jederzeit speichern und später weitermachen."
        static let senden = "Speichern und absenden"
        static let danke = "Danke, gespeichert! Unser Team meldet sich bei dir."
        static func zuletzt(_ d: String) -> String { "Zuletzt gespeichert: \(d)" }
        // Abschnitte wie onboarding.html
        static let a1 = "1. Studio"
        static let a2 = "2. Projekte und Preise"
        static let a3 = "3. Gewünschte Zahlungsarten"
        static let a4 = "4. Branding"
        static let a5 = "5. Team und Schulung"
        static let a6 = "6. Studio Kit"
    }

    enum Nachweis {
        static let knopf = "Nachweis als PDF teilen"
        static let erstellt = "Nachweis wird erstellt …"
        static let titel = "Nachweis zur Zahlung"
        static let einleitung = "Zusammenstellung der in Tattoofin gespeicherten Nachweise. Keine Rechtsberatung; ob sie im Einzelfall ausreichen, entscheiden Bank bzw. Zahlungsanbieter."
        static func kopf(_ d: String, _ id: String) -> String { "Erstellt am \(d) mit Tattoofin · Zahlungs-Nr. \(id)" }
        static let studio = "Studio"
        static let inhaber = "Inhaber/in"
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
        static let schluss = "Hinweis: Dieser Nachweis hilft bei Rückfragen und Rückbuchungen. Ob eine Rückbuchung zugunsten des Studios entschieden wird, entscheiden Bank bzw. Zahlungsanbieter. Er enthält personenbezogene Daten des Kunden: Nutze ihn nur zur Klärung dieser Zahlung (z. B. gegenüber Stripe, Klarna oder der Bank), bewahre ihn sicher auf und lösche ihn, wenn du ihn nicht mehr brauchst."
        static func dateiname(_ id: String) -> String { "Nachweis-\(id).pdf" }
    }

    enum Abrechnungen {
        static let titel = "Abrechnungen"
        static let leer = "Noch keine Abrechnungen. Die erste kommt am 1. des Folgemonats nach deiner ersten Zahlung über Tattoofin."
        static func zahlungen(_ n: Int) -> String { n == 1 ? "1 Zahlung" : "\(n) Zahlungen" }
        static let umsatz = "Kunden haben gezahlt"
        static func tattoofin(_ p: String) -> String { "Tattoofin \(p) % inkl. USt." }
        static let anDich = "An dich ausgezahlt"
        static func rechnung(_ nr: String?) -> String { nr.map { "Rechnung \($0) ansehen" } ?? "Rechnung ansehen" }
        static let fuss = "Die Provision wurde bei jeder Zahlung schon automatisch einbehalten, die Gebühren der Zahlungsanbieter sind darin enthalten. Die Rechnung ist für deine Buchhaltung."
    }

    enum Kasse2 {
        static let heute = "Kunde wird heute im Studio tätowiert"
        static let heuteHinweis = "Nur dann steht das so beim Bezahlen."
        static func provision(anDich: Int, prozent: String, gebuehr: Int) -> String {
            "Du bekommst \(Euro.text(anDich)) · Tattoofin \(prozent) % (\(Euro.text(gebuehr)), alles inklusive)"
        }
        static let gebuehrStripe = "Die Gebühr des Zahlungsanbieters (z. B. Karte ab 1,5 % + 0,25 €) zahlst du direkt an Stripe."
    }

    enum Aufsteller {
        static let titel = "QR-Aufsteller"
        static let intro = "Ein Schild aus echtem Holz (10 × 15 cm) für deine Theke. Darauf: dein QR-Code. Kunden scannen ihn und bezahlen direkt bei dir."
        static let holz = "Holz"
        static let hell = "Hell"
        static let dunkel = "Dunkel"
        static let hellHinweis = "Helles Holz (Birke, Buche) hat den besten Kontrast. Im Test ließ sich der QR-Code auch aus über 1 m scannen."
        static let dunkelHinweis = "Dunkles Holz (Walnuss) sieht edel aus, der QR-Code hat aber weniger Kontrast (im Test sicher bis etwa 80 cm)."
        static let oben = "Oben auf dem Schild"
        static let mitName = "Studioname"
        static let mitLogo = "Dein Logo"
        static let logoWaehlen = "Logo aus Fotos wählen"
        static let logoAendern = "Anderes Logo wählen"
        static let logoHinweis = "Am besten ein dunkles Logo auf hellem Grund. Wir machen es schwarz-weiß für die Gravur."
        static let logoGespeichert = "Logo gespeichert."
        static let logoNichtsDunkel = "Im Logo ist nichts Dunkles zu sehen. Bitte ein dunkles Logo auf hellem Grund wählen."
        static let logoFehler = "Das Bild konnte nicht gelesen werden. Bitte ein anderes wählen."
        static let logoZuerst = "Bitte wähle zuerst dein Logo oder nimm „Studioname“."
        static let logoPlatzhalter = "DEIN STUDIO-LOGO"
        static let vorschau = "Vorschau"
        static func vorschauLabel(_ holz: String, _ oben: String) -> String { "Vorschau: Holz \(holz), oben \(oben), darunter der QR-Code zu deiner Zahlseite" }
        static let hierScannen = "HIER SCANNEN"
        static let zahlartenKlarna = "Karte · Apple Pay · Google Pay · Klarna*"
        static let zahlartenOhne = "Karte · Apple Pay · Google Pay"
        static let unterOhne = "Tattoo bezahlen oder Anzahlung leisten"
        // Bestellung
        static let bestellenTitel = "Bestellen"
        static func kaufenFrageBrutto(_ cent: Int) -> String { "QR-Aufsteller für \(Euro.text(cent)) bestellen?" }
        static let bestellenFrage = "QR-Aufsteller bestellen?"
        static let kaufenText = "Du bezahlst auf der sicheren Seite von Stripe. Danach kommst du hierher zurück."
        static let weiter = "Weiter zur Bezahlung"
        static let anfordern = "Aufsteller anfordern"
        static let anfordernFrage = "Aufsteller jetzt anfordern?"
        static func auswahlText(_ holz: String, _ oben: String) -> String { "Holz \(holz), oben \(oben). Lieferung an deine Studio-Adresse." }
        static let anfordernJa = "Anfordern"
        static let angefordertDanke = "Danke! Wir kümmern uns um deinen Aufsteller."
        static func angefordert(_ d: String) -> String { "Angefordert am \(d). Wir melden uns bei dir." }
        static func bezahlt(_ d: String) -> String { "Bestellt und bezahlt am \(d). Wir lassen ihn fertigen und melden uns." }
        static let bezahltDanke = "Danke! Dein QR-Aufsteller ist bestellt. Wir melden uns, sobald er unterwegs ist."
        static let nochNichtBezahlt = "Die Zahlung ist noch nicht bestätigt. Falls du bezahlt hast, melden wir uns, sobald sie da ist."
        static let pruefen = "Zahlung prüfen"
        static let lieferung = "Lieferadresse"
        static let nurInhaber = "Den Aufsteller kann nur der Inhaber bestellen."
        static let nurWeb = "Die Bestellung ist in dieser Version noch nicht möglich. Unser Team hilft dir gern per WhatsApp."
        static let nameLabel = "studioname"
        static let logoLabel = "dein Logo"
    }
}
