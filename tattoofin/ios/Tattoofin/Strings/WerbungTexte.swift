import Foundation

// Texte für den Tab „Werbung“, „So geht's“ und den Start-Bereich der Kasse. Deutsch, du-Form, kurz.
// Klarna-Regeln (Domenic, 14.11.2026):
//  - Klarna nur hier im Werbebereich und nur, wenn das Studio Klarna dauerhaft anbietet (WerbungRegeln.klarnaMaterial).
//  - Wo Raten gemeint sind: Fußnote KlarnaTexte.pflichtsatz, klein, aber lesbar.
//  - Nie im Registrierungs- oder Abo-Bildschirm, nie bei Gutscheinen.
//  - Keine Preise, kein „netto“, kein Paket, kein Hinweis auf einen Kauf über die Website (Apple 3.1.1).
enum WerbungTexte {
    static let titel = "Werbung"

    // Kopf
    static let einleitungKlarna = "Fertiges Video und fertige Beiträge für Instagram und Facebook. Deine Kunden sehen: Bei dir bezahlen sie ganz einfach per Link oder QR-Code, auch mit Klarna. Speichern, Text kopieren, posten."
    static let einleitung = "Dein QR-Code für die Theke und Vorlagen zum Ausdrucken."
    static let ohneKlarnaTitel = "Video und Beiträge mit Klarna"
    static let ohneKlarnaText = "Das Werbevideo und die fertigen Beiträge zeigen Klarna. Klarna gibt es bei deinem Studio gerade nicht, deshalb fehlen sie hier. Deine Zahlseite und den QR-Code findest du unten."
    static let vorFreigabe = "Werbung gibt es, sobald dein Zahlungskonto freigegeben ist. Dann funktioniert auch dein QR-Code."
    static let neuLaden = "Neu laden"
    /// Pflicht-Fußnote, wo Raten gemeint sind (klein, aber lesbar)
    static let fussnote = KlarnaTexte.pflichtsatz

    // Werbevideo
    static let videoTitel = "Dein Werbevideo"
    static let videoText = "Fertiges Video für Instagram, Facebook und TikTok. Speichern, Text kopieren, posten."
    static let formatLabel = "Format"
    static let formatReel = "Reel / Story (9:16)"
    static let formatFeed = "Beitrag (4:5)"
    static let videoSpeichern = "In Fotos speichern"
    static let videoLaedt = "Video wird geladen …"
    static let teilen = "Teilen"
    static let textZeigen = "Text zum Posten"
    static let textAusblenden = "Text ausblenden"
    static let textKopieren = "Text kopieren"
    static let kopiert = "Kopiert"
    static let gespeichert = "In Fotos gespeichert"
    static let abspielen = "Video abspielen"
    static let videoLabel = "Werbevideo: Bei uns ganz bequem übers Handy bezahlen"
    static let fotosKeinZugriff = "Tattoofin darf nichts in Fotos speichern. Du kannst es in den iPhone-Einstellungen unter Tattoofin › Fotos erlauben."
    static let fotosFehler = "Speichern hat nicht geklappt. Bitte versuch es nochmal."
    static let ladeFehler = "Laden hat nicht geklappt. Bitte prüf dein Internet und versuch es nochmal."

    // Beiträge
    static let beitraegeTitel = "Deine Beiträge"
    static let beitraegeText = "Fertige Bilder für Instagram und Facebook, mit deinem Studionamen und dem QR-Code zu deiner Zahlseite."
    static let schritte = ["Bilder speichern: Sie landen in deinen Fotos.",
                           "Text kopieren: fertig mit Pflichthinweis und Hashtags.",
                           "In Instagram posten und den Text einfügen."]
    static let nameLabel = "Name auf den Bildern"
    static let nameUebernehmen = "Übernehmen"
    static let nameHinweis = "Ohne Rechtsform, so wie deine Kunden dich kennen."
    static let zeichnet = "Bilder werden erstellt …"
    static let zeichnenFehler = "Die Bilder konnten nicht erstellt werden. Bitte versuch es nochmal."
    static func alleSpeichern(_ n: Int) -> String { n > 1 ? "Alle \(n) Bilder speichern" : "Bild speichern" }
    static let linkKopieren = "Link kopieren"
    static let stickerKopieren = "Sticker-Text kopieren"
    static let textAnsehen = "Text ansehen"
    static let grossHinweis = "Antippen für große Ansicht"
    static let diesesBildSpeichern = "Dieses Bild speichern"
    static func bildLabel(_ titel: String, _ nr: Int, _ von: Int) -> String { von > 1 ? "\(titel), Bild \(nr) von \(von)" : titel }
    static let gepostet = "Ich habe Werbung gepostet"
    static let gepostetHinweis = "Hakt den Punkt in deiner Einrichtung ab."

    // Zahlseite
    static let zahlseiteTitel = "Deine Zahlseite"
    static let zahlseiteText = "Für Theke, Flyer und Bio-Link. Kunden scannen, tragen den abgesprochenen Betrag ein und bezahlen."
    static let qrSpeichern = "QR-Code in Fotos speichern"
    static let zahlseiteAnsehen = "Zahlseite ansehen"
    static let qrLabel = "QR-Code zu deiner Zahlseite"
    static let theke = "Der QR-Code steht an der Theke"

    // Druck
    static let druckTitel = "Zum Ausdrucken"
    static let druckText = "Fensteraufkleber, Flyer und Aufsteller mit deinem Studionamen und QR-Code. Öffnen, dann über Teilen drucken oder als PDF sichern."
    static let druckZeile = "Mit deinem Studionamen und QR-Code"

    // So geht's
    static let soGehtsTitel = "So geht's"
    static let soGehtsKurz = "Die App in gut 2 Minuten erklärt."
    static let soGehtsDauer = "Video, 2 Min."
    static let soGehtsAusblenden = "So geht's ausblenden"
    static let soGehtsText = "Deine App Schritt für Schritt erklärt. Tipp auf ein Kapitel, um direkt dorthin zu springen."
    static let soGehtsLabel = "Erklärvideo: So funktioniert Tattoofin"
    static let kapitel = "Kapitel"
    static let soGehtsFuss = "Stimme mit KI erstellt · Bilder: Beispiel-Studio mit Testdaten"
    static let ausblenden = "Ausblenden"
    static let ansehen = "Ansehen"

    // Start-Bereich
    enum Start {
        static let einrichtung = "Einrichtung"
        static func stand(_ n: Int, _ von: Int) -> String { "\(n) von \(von)" }
        static let alleErledigt = "Alles eingerichtet. Viel Erfolg mit Tattoofin!"
        static let erledigt = "Erledigt"
        static let diesenMonat = "Diesen Monat"
        static let gezahlt = "Kunden haben gezahlt"
        static let zahlungen = "Zahlungen"
        static let anDich = "an dich"
        static let unterKonto = "Unter Konto"

        static let konto = "Konto angelegt"
        static let kontoText = "Dein Studio ist bei Tattoofin angemeldet."
        static let stripe = "Zahlungskonto einrichten"
        static let stripeOk = "Freigegeben. Das Geld deiner Kunden kommt auf dein Bankkonto."
        static let stripeWarte = "Stripe prüft deine Angaben, meist 1 bis 3 Werktage."
        static let stripeOffen = "Ca. 10 Minuten. Ausweis und IBAN bereithalten."
        static let fragebogen = "Fragebogen ausfüllen"
        static let fragebogenText = "Hilft uns bei der Einrichtung (10 Minuten)."
        static let recht = "Deine rechtliche Lage lesen"
        static let rechtText = "5 Minuten: Wer trägt welches Risiko?"
        static let link = "Ersten Zahlungslink erstellen"
        static let linkText = "Zum Ausprobieren gern an dich selbst."
        static let app = "Tattoofin-App aufs iPhone"
        static let appText = "Erledigt: Du nutzt sie gerade."
        static let theke = "QR-Code an die Theke"
        static let thekeText = "Speichern oder ausdrucken unter Werbung."
        static let werbung = "Ersten Instagram-Beitrag posten"
        static let werbungText = "Fertige Bilder unter Werbung."
        static let ausfuellen = "Ausfüllen"
        static let lesen = "Lesen"
        static let zurWerbung = "Werbung"
    }
}
