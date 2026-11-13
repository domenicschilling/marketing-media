import Foundation

// Alle Texte der App an einer Stelle. Deutsch, du-Form, Alltagssprache.
// Keine Preise fest im Code (Paketname kommt vom Server). Keine Raten- oder Später-zahlen-Aussagen
// (falls je nötig: nur aus KlarnaTexte mit Warnsatz). Gutscheine nie mit Klarna.

enum Texte {
    enum Allgemein {
        static let laedt = "Wird geladen …"
        static let nochmal = "Nochmal versuchen"
        static let abbrechen = "Abbrechen"
        static let fertig = "Fertig"
        static let schliessen = "Schließen"
        static let ja = "ja"
        static let nein = "nein"
        static let logoLabel = "Tattoofin"
    }

    enum Fehler {
        static let titel = "Das hat nicht geklappt"
        static let keinNetz = "Keine Verbindung. Bitte prüf dein Internet und versuch es nochmal."
        static let server = "Unser Server antwortet gerade nicht. Bitte versuch es gleich nochmal."
        static let unbekannt = "Da ist etwas schiefgelaufen. Bitte versuch es nochmal."
        static let nichtAngemeldet = "Bitte melde dich neu an."
    }

    enum Tabs {
        static let kasse = "Kasse"
        static let zahlungen = "Zahlungen"
        static let gutscheine = "Gutscheine"
        static let konto = "Konto"
    }

    enum Sperre {
        static let titel = "Tattoofin ist gesperrt"
        static let grund = "Damit nur du die Tattoofin-App öffnen kannst"
        static let grundEinschalten = "Bestätige einmal, dass du die App so öffnen willst."
        static let fehlgeschlagen = "Das hat nicht geklappt. Tipp unten auf den Knopf, dann geht auch dein Gerätecode."
        static let nichtVerfuegbar = "Auf diesem iPhone ist weder Face ID noch ein Gerätecode eingerichtet. Deshalb kann die App nicht gesperrt werden."
        static func entsperren(_ art: String) -> String { "Mit \(art) öffnen" }
    }

    enum Anmelden {
        static let titel = "Anmelden"
        static let einleitung = "Gib die E-Mail-Adresse ein, mit der dein Studio bei Tattoofin angemeldet ist. Wir schicken dir einen Code."
        static let emailLabel = "E-Mail-Adresse"
        static let emailPlatzhalter = "studio@beispiel.de"
        static let codeSchicken = "Code schicken"
        static let keinPasswort = "Kein Passwort nötig. Der Code gilt 10 Minuten."
        static let codeTitel = "Code eingeben"
        static let codeNavTitel = "Code"
        static let codeHinweis = "Wenn die Adresse bei uns hinterlegt ist, kommt gleich ein 6-stelliger Code."
        static let verzoegert = "Der Mailversand dauert gerade länger."
        static let codeLabel = "6-stelliger Code"
        static let anmelden = "Anmelden"
        static let neuerCode = "Neuen Code schicken"
        static func neuerCodeIn(_ s: Int) -> String { "Neuen Code schicken (in \(s) s)" }
        static let neuGeschickt = "Neuer Code ist unterwegs. Der alte gilt nicht mehr."
        static func restVersuche(_ n: Int) -> String { n == 1 ? "Noch 1 Versuch" : "Noch \(n) Versuche" }
        static let auswahlTitel = "Studio wählen"
        static let auswahlHinweis = "Zu deiner Adresse gehören mehrere Studios. Welches willst du in der App nutzen?"
        static let abgelaufen = "Du wurdest abgemeldet. Bitte melde dich neu an."
    }

    enum Einrichtung {
        static func schritt(_ n: Int, von: Int) -> String { "Schritt \(n) von \(von)" }
        static func faceIDTitel(_ art: String) -> String { "\(art) zum Öffnen nutzen?" }
        static let faceIDText = "Dann kann nur jemand mit deinem Gesicht oder deinem Gerätecode die App öffnen. Die Sperre greift beim Start und wenn die App länger als 5 Minuten im Hintergrund war."
        static func faceIDJa(_ art: String) -> String { "\(art) einschalten" }
        static let faceIDNein = "Nicht jetzt"
        static let pushTitel = "Mitteilungen erlauben?"
        static let pushText = "Wir sagen dir sofort Bescheid, wenn etwas Wichtiges passiert:"
        static let pushPunktZahlung = "Zahlung eingegangen"
        static let pushPunktAuszahlung = "Auszahlung unterwegs"
        static let pushSpaeter = "Du kannst das jederzeit im Konto ändern. Danach fragt dein iPhone einmal nach."
        static let pushJa = "Mitteilungen erlauben"
        static let pushNein = "Später"
    }

    enum Kasse {
        static let titel = "Kasse"
        static let thekenQR = "Theken-QR"
        static let thekenQRHinweis = "Zeigt den festen QR-Code deines Studios. Der Kunde tippt den Betrag selbst ein."
        static let betragLabel = "Betrag"
        static let artLabel = "Art der Zahlung"
        static let gesamt = "Gesamtpreis"
        static let anzahlung = "Anzahlung"
        static let details = "Kunde und Motiv (optional)"
        static let kunde = "Name des Kunden"
        static let email = "E-Mail des Kunden"
        static let motiv = "Motiv / Beschreibung"
        static let sitzungen = "Sitzungen"
        static let erstellen = "Zahlungslink erstellen"
        static func grenzen(min: Int, max: Int) -> String { "Betrag zwischen \(Euro.kurz(min)) und \(Euro.kurz(max))" }
        static func tasteLabel(_ t: String) -> String {
            switch t {
            case "⌫": "Löschen. Lange drücken löscht alles."
            case ",": "Komma"
            default: t
            }
        }
        static let gesperrtTitel = "Gleich kannst du kassieren"
        static let gesperrtText = "Dein Stripe-Konto ist noch nicht freigegeben. Sobald Stripe die Prüfung abgeschlossen hat, kannst du hier Zahlungslinks erstellen."
        static let vertragNichtAktiv = "Dein Vertrag ist gerade nicht aktiv. Bitte schreib uns an info@tattoofin.de."
        static let statusPruefen = "Status neu prüfen"
        static let stripeOeffnen = "Stripe-Einrichtung im Browser öffnen"
        static let nochNichtFrei = "Stripe hat dein Konto noch nicht freigegeben. Schau später nochmal rein."
    }

    enum Zahlung {
        static let titel = "Zahlungslink"
        static let gutscheinTitel = "Gutschein-Link"
        static func qrLabel(_ cent: Int) -> String { "QR-Code für Zahlung über \(Euro.gesprochen(cent))" }
        static let wartet = "Wartet auf Zahlung …"
        static let teilen = "Teilen"
        static let kopieren = "Link kopieren"
        static let kopiert = "Link kopiert"
        static let stornieren = "Stornieren"
        static let stornoFrage = "Zahlungslink stornieren?"
        static let stornoText = "Der Link funktioniert danach nicht mehr."
        static let stornoJa = "Ja, stornieren"
        static let istStorniert = "Dieser Zahlungslink ist storniert."
        static func bezahlt(_ cent: Int) -> String { "\(Euro.text(cent)) bezahlt" }
        static let inPruefung = "Die Zahlung ist angekommen und wird noch kurz geprüft."
    }

    enum Theke {
        static let anleitung = "QR-Code scannen und Betrag selbst eingeben"
        static let fehlt = "Der Theken-QR ist noch nicht da. Bitte einmal mit Internet öffnen."
        static func qrLabel(_ name: String) -> String { "QR-Code zur Zahlseite von \(name)" }
    }

    enum Zahlungen {
        static let bereich = "Bereich"
        static let zahlungen = "Zahlungen"
        static let auszahlungen = "Auszahlungen"
        static let filter = "Filter"
        static let alle = "Alle"
        static let offen = "Offen"
        static let bezahlt = "Bezahlt"
        static let suche = "Kunde suchen"
        static let kpiUmsatz = "Umsatz diesen Monat"
        static let kpiAnzahl = "Zahlungen diesen Monat"
        static let kpiOffen = "Offene Links"
        static let leerTitel = "Noch keine Zahlungen"
        static let leerText = "Erstelle an der Kasse deinen ersten Zahlungslink."
        static let keinTreffer = "Keine Zahlung passt zu deiner Suche."
        static let ohneName = "Ohne Namen"
    }

    enum Detail {
        static let titel = "Zahlung"
        static let art = "Art"
        static let zahlart = "Bezahlt mit"
        static let erstellt = "Erstellt"
        static let bezahlt = "Bezahlt am"
        static let storniert = "Storniert am"
        static let verfuegbarAb = "Auf deinem Stripe-Konto verfügbar ab"
        static let erstattet = "Erstattet"
        static let sitzungen = "Sitzungen"
        static let kundeAbschnitt = "Kunde"
        static let kunde = "Name"
        static let email = "E-Mail"
        static let qrZeigen = "QR-Code zeigen"
        static let leistung = "Leistungsbestätigung"
        static let leistungText = "Nach dem Termin: Dein Kunde scannt den Code und bestätigt kurz, dass die Sitzung stattgefunden hat."
        static let leistungQRLabel = "QR-Code für die Leistungsbestätigung"
        static let erstattungHinweis = "Erstattungen machst du im Dashboard bzw. in deinem Stripe-Konto."
    }

    enum Auszahlungen {
        static let verfuegbar = "Verfügbar"
        static let unterwegs = "Noch unterwegs"
        static let listeTitel = "Auszahlungen aufs Bankkonto"
        static let leer = "Noch keine Auszahlungen."
        static let mehr = "Mehr laden"
        static let keinKontoTitel = "Kein Stripe-Konto"
        static let keinKonto = "Noch kein Stripe-Konto verbunden."
        static let nichtAktiv = "Auszahlungen sind bei Stripe noch nicht aktiv. Prüf im Konto-Tab den Stripe-Status."
        static func ankunftAm(_ d: String) -> String { "Kommt voraussichtlich am \(d)" }
        static func angekommenAm(_ d: String) -> String { "Angekommen am \(d)" }
        static func bankLabel(_ name: String?, _ endet: String?) -> String {
            [name, endet.map { "Konto endet auf \($0)" }].compactMap { $0 }.joined(separator: ", ")
        }
    }

    enum Gutscheine {
        static let titel = "Gutscheine"
        static let scannen = "Gutschein-Code scannen"
        static let codeEingeben = "Code eingeben"
        static let codePlatzhalter = "GS-XXXX-XXXX"
        static let suchen = "Gutschein suchen"
        static let verkauft = "Verkaufte Gutscheine"
        static let verkaufen = "Gutschein verkaufen"
        static let verkaufenTitel = "Gutschein verkaufen"
        static let leerTitel = "Noch keine Gutscheine"
        static let leerText = "Verkaufe deinen ersten Gutschein über „Gutschein verkaufen“."
        static let ohneCode = "Code kommt nach der Zahlung"
        static func codeLabel(_ c: String) -> String { "Code " + c.map(String.init).joined(separator: " ") }
        static let wert = "Wert"
        static let kaeuferAbschnitt = "Käufer"
        static let kaeufer = "Name des Käufers"
        static let kaeuferEmail = "E-Mail des Käufers"
        static let kaeuferHinweis = "An diese Adresse schicken wir den Gutschein mit Code nach der Zahlung."
        static let optional = "Optional"
        static let empfaenger = "Für wen ist der Gutschein?"
        static let nachricht = "Nachricht auf dem Gutschein"
        static func zeichen(_ n: Int, _ max: Int) -> String { "\(n) von \(max) Zeichen" }
        static let zahlarten = "Gutscheine werden per Karte, Apple Pay oder Google Pay bezahlt."
        static let linkErstellen = "Gutschein-Link erstellen"
        static let detailTitel = "Gutschein"
        static let gueltigBis = "Gültig bis"
        static let notiz = "Notiz"
        static let notizOptional = "Notiz (optional)"
        static let gesendet = "Zuletzt gemailt"
        static func eingeloestAm(_ d: String) -> String { "Eingelöst am \(d)" }
        static let einloesen = "Jetzt einlösen"
        static let einloesenFrage = "Gutschein einlösen?"
        static func einloesenText(_ cent: Int) -> String { "Der ganze Wert von \(Euro.text(cent)) wird eingelöst. Teil-Einlösung gibt es nicht." }
        static let einloesenJa = "Einlösen"
        static let zuruecknehmen = "Einlösung zurücknehmen"
        static let zuruecknehmenFrage = "Einlösung zurücknehmen? Der Gutschein ist danach wieder gültig."
        static let abgelaufenHinweis = "Der Gutschein ist abgelaufen. Du kannst ihn trotzdem einlösen, wenn du möchtest."
        static let nochNichtBezahlt = "Der Käufer hat noch nicht bezahlt. Den Code gibt es nach der Zahlung."
        static let pdfLaden = "PDF laden"
        static let pdfTeilen = "PDF teilen"
        static let erneutMailen = "Erneut an Käufer mailen"
        static func mailGesendet(_ an: String) -> String { an.isEmpty ? "Gutschein wurde erneut gemailt." : "Gutschein wurde erneut an \(an) gemailt." }
        static let mailFehler = "Die Mail konnte gerade nicht verschickt werden. Bitte versuch es später nochmal."
    }

    enum Scanner {
        static let titel = "Code scannen"
        static let anleitung = "Halte die Kamera auf den Gutschein-Code (GS-…) oder den QR-Code."
        static let eintippen = "Eintippen"
        static let eintippenHinweis = "Tipp den Code einfach ein."
        static let keineKamera = "Hier gibt es keine Kamera. Tipp den Code einfach ein."
        static let keineErlaubnis = "Die App darf die Kamera nicht nutzen. Du kannst das in den iPhone-Einstellungen ändern oder den Code eintippen."
    }

    enum Konto {
        static let titel = "Konto"
        static let studio = "Studio"
        static let paket = "Paket"
        static let vertrag = "Vertrag"
        static let vertragEndet = "Vertrag endet am"
        static let angemeldetAls = "Angemeldet als"
        static let rolle = "Rolle"
        static let rolleInhaber = "Inhaber (Hauptadresse)"
        static let rolleTeam = "Team"
        static let zuruecknehmen = "Kündigung zurücknehmen"
        static let zuruecknehmenFrage = "Kündigung zurücknehmen? Dein Vertrag läuft dann normal weiter."
        static let zuruecknehmenJa = "Ja, zurücknehmen"
        static let stripe = "Stripe"
        static let stripeVerbunden = "Verbunden"
        static let stripeFreigegeben = "Freigegeben"
        static let stripeAuszahlungen = "Auszahlungen aktiv"
        static let neuPruefen = "Neu prüfen"
        static let mitteilungen = "Mitteilungen auf diesem iPhone"
        static let pushZahlung = "Mitteilung bei Zahlung"
        static let pushAuszahlung = "Mitteilung bei Auszahlung"
        static let mitteilungenHinweis = "Gilt nur für dieses Gerät."
        static let pushAus = "Mitteilungen sind in den iPhone-Einstellungen ausgeschaltet."
        static let einstellungenOeffnen = "iPhone-Einstellungen öffnen"
        static let sicherheit = "Sicherheit und Team"
        static func faceID(_ art: String) -> String { "\(art) beim Öffnen" }
        static let team = "Team-Adressen"
        static let geraete = "Angemeldete Geräte"
        static let rechtliches = "Rechtliches und Hilfe"
        static let impressum = "Impressum"
        static let datenschutz = "Datenschutz"
        static let vertragText = "Vertrag"
        static let hilfe = "Hilfe: info@tattoofin.de"
        static let abmelden = "Abmelden"
        static let abmeldenFrage = "Auf diesem iPhone abmelden?"
        static let ueberall = "Auf allen Geräten abmelden"
        static let ueberallFrage = "Auf allen Geräten abmelden?"
        static let ueberallText = "Alle iPhones und alle Browser (Web-Dashboard) werden abgemeldet, auch dieses Gerät."
        static let ueberallJa = "Überall abmelden"
        static let ueberallErledigt = "Alle Geräte wurden abgemeldet."
        static let loeschen = "Konto löschen"
        static func version(_ v: String) -> String { "Tattoofin-App \(v)" }
    }

    enum Team {
        static let haupt = "Hauptadresse"
        static func teamTitel(_ n: Int, _ max: Int) -> String { "Team-Adressen (\(n) von \(max))" }
        static let leer = "Noch keine Team-Adressen."
        static let hinweisInhaber = "Team-Mitglieder melden sich mit ihrer eigenen Adresse an und können kassieren. Entfernst du eine Adresse, werden ihre App-Geräte sofort abgemeldet."
        static let hinweisTeam = "Team-Adressen pflegt die Hauptadresse deines Studios."
        static let hinzufuegen = "Adresse hinzufügen"
        static let adressePlatzhalter = "name@studio.de"
        static let hinzufuegenKnopf = "Hinzufügen"
        static func entfernenLabel(_ e: String) -> String { "\(e) entfernen" }
        static func entfernenFrage(_ e: String) -> String { "\(e) entfernen?" }
        static let entfernenText = "Die App-Geräte dieser Adresse werden sofort abgemeldet."
        static let entfernen = "Entfernen"
        static let alleAbmelden = "Zusätzlich alle abmelden"
        static let alleAbmeldenHinweis = "Im Web-Dashboard lassen sich einzelne Adressen nicht trennen. Mit diesem Schalter werden beim Speichern alle Geräte und Browser abgemeldet, auch dieses iPhone."
        static let zugangEntfernen = "Meinen Zugang entfernen"
        static let zugangEntfernenFrage = "Deinen Zugang wirklich entfernen?"
        static let zugangEntfernenText = "Deine Adresse wird aus dem Studio entfernt und alle deine Geräte werden abgemeldet."
        static let zugangEntfernenErklaerung = "Damit wird deine Adresse aus dem Team des Studios entfernt (das ist die Löschung deines eigenen Kontos). Alle deine Geräte werden sofort abgemeldet. Das Studio selbst und seine Zahlungen bleiben bestehen."
        static let zugangEntferntHinweis = "Dein Zugang wurde entfernt."
    }

    enum Geraete {
        static let leer = "Keine Geräte angemeldet."
        static let hinweis = "Ein verlorenes Handy kannst du hier gezielt abmelden."
        static let abmelden = "Abmelden"
        static func frage(_ name: String) -> String { "„\(name)“ abmelden?" }
        static let ohneName = "Gerät"
        static let diesesGeraet = "Dieses Gerät"
        static func angemeldetMit(_ e: String) -> String { "Angemeldet mit \(e)" }
        static func zuletzt(_ r: String) -> String { "Zuletzt aktiv \(r)" }
        static let pushAn = "Mitteilungen an"
        static let pushAus = "Mitteilungen aus"
    }

    enum Loeschen {
        static let titel = "Konto löschen"
        static let ueberschrift = "Was passiert beim Löschen?"
        static let punkte = [
            "Löschen bedeutet die Kündigung deines Tattoofin-Vertrags.",
            "Er endet zum regulären Termin (Paket Monatlich: Ende des laufenden Abrechnungsmonats).",
            "Bis zum Vertragsende kannst du weiter kassieren.",
            "Danach löschen wir deine Daten.",
            "Was wir laut Gesetz aufbewahren müssen (Rechnungen, Buchungen: 6 bzw. 10 Jahre), sperren wir und löschen es nach Ablauf.",
            "Daten deiner Kunden löschen wir spätestens 30 Tage nach Vertragsende.",
            "Bis zum Vertragsende kannst du das Löschen zurücknehmen.",
        ]
        static let grund = "Warum gehst du? (optional)"
        static let grundPlatzhalter = "Dein Grund hilft uns, besser zu werden."
        static let bestaetigen = "Tippe LÖSCHEN zur Bestätigung"
        static let knopf = "Konto endgültig löschen"
        static let erledigtTitel = "Deine Löschung ist eingegangen"
        static let vertragEndet = "Vertrag endet am"
        static let loeschungAb = "Löschung ab"
        static let erledigtText = "Wir haben dir eine Bestätigung per Mail geschickt. Bis zum Vertragsende kannst du weiter kassieren und das Löschen zurücknehmen."
        static let zuruecknehmen = "Löschen zurücknehmen"
        static let zurueckErledigt = "Erledigt. Dein Vertrag läuft normal weiter."
    }
}

extension Euro {
    /// 5000 → „50 €“, 2000000 → „20.000 €“, 5050 → „50,50 €“
    static func kurz(_ cent: Int) -> String {
        if cent % 100 == 0 {
            return (cent / 100).formatted(.number.locale(Locale(identifier: "de_DE"))) + " €"
        }
        return text(cent)
    }
}
