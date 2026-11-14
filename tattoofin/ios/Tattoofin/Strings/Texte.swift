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
        static let werbung = "Werbung"
        static let konto = "Konto"
    }

    enum Sperre {
        static let titel = "Tattoofin ist gesperrt"
        static let grund = "Damit nur du die Tattoofin-App öffnen kannst"
        static let grundEinschalten = "Bestätige einmal, dass du die App so öffnen willst."
        static let fehlgeschlagen = "Das hat nicht geklappt. Tipp unten auf den Knopf, dann geht auch dein Gerätecode."
        static func einschaltenFehler(_ art: String) -> String { "\(art) hat nicht geklappt. Prüf in den iPhone-Einstellungen, ob \(art) und ein Gerätecode eingerichtet sind." }
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
        static let codeHinweis = "Wenn die Adresse bei uns hinterlegt ist, kommt gleich ein Code mit 6 Ziffern."
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

    /// Neues Studio in der App anlegen (R1–R4). Kein Preis, kein Hinweis auf die Website, kein Klarna (Apple 3.1.3).
    enum Registrieren {
        static let einstiegFrage = "Noch kein Tattoofin?"
        static let einstieg = "Neues Studio? Konto anlegen"
        static let fortsetzen = "Anmeldung fortsetzen"
        static let navTitel = "Konto anlegen"
        static let titel = "Dein Studio bei Tattoofin"
        static let einleitung = "Wir schicken dir einen Code. Damit bestätigst du deine E-Mail-Adresse."
        static let emailUngueltig = "Bitte gib eine gültige E-Mail-Adresse ein."
        static let wiederherstellenLink = "Abo schon gekauft? Käufe wiederherstellen"
        static let codeHinweis = "Gleich kommt eine Mail mit einem Code aus 6 Ziffern an diese Adresse:"
        static let codeBestaetigen = "Bestätigen"

        static let angabenTitel = "Dein Studio"
        static let angabenEinleitung = "Diese Angaben kommen in deinen Vertrag. Tattoofin ist nur für Unternehmen."
        static let firma = "Studio / Firma"
        static let inhaber = "Inhaber/in"
        static let strasse = "Straße und Hausnummer"
        static let plz = "PLZ"
        static let ort = "Ort"
        static let telefon = "Mobilnummer"
        static let studioTelefon = "Telefonnummer des Studios"
        static let ustid = "USt-IdNr. (optional)"
        static let website = "Website oder Instagram (optional)"
        static let unterzeichner = "Name des Unterzeichners"
        static func pflicht(_ feld: String) -> String { "Bitte ausfüllen: \(feld)" }
        static let plzFalsch = "Die PLZ hat genau 5 Ziffern."
        static let telefonFalsch = "Bitte mindestens 6 Ziffern eingeben."
        static let weiter = "Weiter"
        static let fehlerOben = "Bitte prüf die markierten Felder."

        static let bestaetigungenTitel = "Fast geschafft"
        static let bestaetigungenEinleitung = "Bitte bestätige diese vier Punkte. Ohne sie können wir keinen Vertrag mit dir schließen."
        static let unternehmer = "Ich schließe den Vertrag als Unternehmer für mein Studio ab, nicht als Verbraucher."
        static let kmu = "Mein Studio ist ein kleines oder mittleres Unternehmen (unter 250 Mitarbeitende, höchstens 50 Mio. € Umsatz oder 43 Mio. € Bilanzsumme)."
        static let vertrag = "Ich akzeptiere den Vertrag."
        static let avv = "Ich akzeptiere die AVV (Vertrag zur Auftragsverarbeitung)."
        static let vertragLesen = "Vertrag lesen"
        static let avvLesen = "AVV lesen"
        static let datenschutzLesen = "Datenschutzerklärung"
        static let datenschutzHinweis = "Wie wir mit deinen Daten umgehen, steht in der Datenschutzerklärung."
        static let bitteBestaetigen = "Bitte bestätigen."
        static let weiterZumAbo = "Weiter zum Abo"

        static let keinAboGefunden = "Auf diesem Apple-Account haben wir kein Tattoofin-Abo gefunden."
        static func aboGehoertZu(_ email: String) -> String { "Dieses Abo gehört zu \(email). Melde dich mit dieser Adresse an." }
        static let avvTitel = "AVV"
    }

    /// Abo-Bildschirm (Apple 3.1.2): Preis nur aus dem App Store (product.displayPrice), keine Probezeit, kein anderer Kaufweg
    enum Abo {
        static let titel = "Tattoofin Monatlich"
        static func zeitraum(_ monate: Int) -> String {
            (monate == 1 ? "1 Monat" : "\(monate) Monate") + " · verlängert sich automatisch"
        }
        static let proMonat = "pro Monat"
        static let inklMwSt = "inkl. MwSt."
        static let leistungen = [
            "Zahlungslinks und Zahlseite für dein Studio",
            "Anzahlungen und Gutscheine",
            "Mitteilung bei jeder Zahlung",
            "Keine Provision von Tattoofin. Die Gebühren für Kundenzahlungen zahlst du direkt an Stripe.",
        ]
        static let kaufen = "Kostenpflichtig abonnieren"
        static let kleingedruckt = "Die Zahlung wird bei Bestätigung des Kaufs über deinen Apple-Account abgebucht. Das Abo verlängert sich automatisch jeden Monat, wenn du es nicht mindestens 24 Stunden vor Ende des laufenden Zeitraums kündigst. Kündigen kannst du jederzeit in den Einstellungen deines Apple-Accounts unter Abos. Es gibt keine Mindestlaufzeit."
        static let vertragLink = "Vertrag (Nutzungsbedingungen)"
        static let datenschutzLink = "Datenschutz"
        static let eulaLink = "Apple-Lizenzvertrag (EULA)"
        static let wiederherstellen = "Käufe wiederherstellen"
        static let ladeFehler = "Das Abo konnte gerade nicht geladen werden."
        static let nichtBestaetigt = "Dein Kauf ist bei Apple durch. Wir konnten ihn gerade nicht bestätigen. Tippe auf „Nochmal versuchen“. Es wird nichts doppelt abgebucht."
        static let wartet = "Dein Kauf wartet noch auf eine Bestätigung. Sobald Apple ihn bestätigt, geht es automatisch weiter."
        static let unverifiziert = "Apple hat den Kauf nicht bestätigt. Bitte versuch es noch einmal."
        static let erneuernTitel = "Abo wieder abschließen"
        static let erneuert = "Dein Abo läuft wieder. Zahlungslinks und Zahlseite sind offen."
        static let wiederhergestellt = "Dein Abo ist auf dem neuesten Stand."
        static let leistungenLabel = "Das ist dabei"

        // Konto-Tab
        static let abschnitt = "Abo"
        static let bezahltUeber = "Bezahlt über"
        static let apple = "Apple (App Store)"
        static let status = "Status"
        static let laeuftBis = "Läuft bis"
        static let verwalten = "Abo verwalten"
        static let sandbox = "Testkauf (Apple-Sandbox)"
        static func statusText(_ abo: AppleAbo) -> String {
            switch abo.status {
            case "aktiv" where abo.autoVerlaengerung == false, "gekuendigt":
                if let d = Datum.tag(abo.laeuftBis) { return "endet am \(d)" }
                return "gekündigt"
            case "aktiv": return "aktiv"
            case "zahlungsproblem": return "Zahlungsproblem bei Apple"
            case "erstattet": return "erstattet"
            case "widerrufen": return "widerrufen"
            case "abgelaufen": return "abgelaufen"
            default: return abo.status ?? "unbekannt"
            }
        }
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
        static let email = "E-Mail des Kunden (freiwillig, für die Quittung)"
        static let motiv = "Motiv / Beschreibung"
        static let sitzungen = "Sitzungen"
        static let kundeBeispiel = "z. B. Lena Beispiel"
        static let emailBeispiel = "z. B. lena@beispiel.de"
        static let motivBeispiel = "z. B. Rose Unterarm"
        static let sitzungenBeispiel = "z. B. Sitzung 1 von 2"
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
        // Apple-Abo und Stripe-Einrichtung nach der Anmeldung in der App
        static let sandboxTitel = "Testkauf"
        static let sandboxText = "Testkauf (Apple-Sandbox). Die Stripe-Einrichtung ist für Testkonten ausgeschaltet."
        static let aboAbgelaufenTitel = "Dein Abo ist abgelaufen"
        static let aboAbgelaufenText = "Zahlungslinks und Zahlseite sind gesperrt. Deine Daten bleiben erhalten."
        static let aboWiederAbschliessen = "Abo wieder abschließen"
        static let aboTeamHinweis = "Bitte den Inhaber, das Abo zu erneuern."
        static let stripeTitel = "Letzter Schritt: Stripe verbinden"
        static let stripeText = "Über dein Stripe-Konto bekommst du das Geld deiner Kunden. Die Einrichtung dauert etwa 10 Minuten, danach prüft Stripe meist 1 bis 3 Werktage."
        static let stripeEinrichten = "Stripe-Konto einrichten"
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
        // Nur im Demo-Studio (App-Prüfung bei Apple): Testzahlung ohne echtes Geld
        static let demoHinweis = "Demo-Studio: Hier wird nichts wirklich bezahlt. Mit der Testzahlung siehst du, was nach einer Zahlung passiert."
        static let demoZahlen = "Testzahlung auslösen"
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
        static let pflichtKaeufer = "Bitte den Namen des Käufers eintragen."
        static let pflichtEmail = "Bitte die E-Mail des Käufers eintragen – dorthin schicken wir den Gutschein."
        static let emailUngueltig = "Bitte eine gültige E-Mail-Adresse eingeben."
        static let empfaengerKurz = "Für"
        static let nachrichtKurz = "Nachricht"
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
        static let keineKaeuferEmail = "Für diesen Gutschein ist keine E-Mail des Käufers hinterlegt. Teile stattdessen das PDF."
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
        static let bleiben = "Du willst doch bleiben? Schreib uns an info@tattoofin.de."
        static let stripe = "Stripe"
        static let stripeVerbunden = "Verbunden"
        static let stripeFreigegeben = "Freigegeben"
        static let stripeAuszahlungen = "Auszahlungen aktiv"
        static let neuPruefen = "Neu prüfen"
        static let mitteilungen = "Mitteilungen auf diesem iPhone"
        static let pushZahlung = "Mitteilung bei Zahlung"
        static let pushAuszahlung = "Mitteilung bei Auszahlung"
        static let pushVorname = "Vorname des Kunden in der Mitteilung"
        static let mitteilungenHinweis = "Gilt nur für dieses Gerät. Den Vornamen zeigt das iPhone auch auf dem Sperrbildschirm."
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
        static let seiteFehler = "Die Seite lädt gerade nicht. Bitte prüf dein Internet und versuch es nochmal."
        static let hilfe = "Hilfe: info@tattoofin.de"
        static let abmelden = "Abmelden"
        static let abmeldenFrage = "Auf diesem iPhone abmelden?"
        static let ueberall = "Auf allen Geräten abmelden"
        static let ueberallFrage = "Auf allen Geräten abmelden?"
        static let ueberallText = "Alle iPhones und alle Browser (Web-Dashboard) werden abgemeldet, auch dieses Gerät."
        static let ueberallJa = "Überall abmelden"
        static let ueberallErledigt = "Alle Geräte wurden abgemeldet."
        static let loeschen = "Konto kündigen und löschen"
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
        static let geradeAktiv = "Gerade aktiv"
        static let pushAn = "Mitteilungen an"
        static let pushAus = "Mitteilungen aus"
        static let umbenennen = "Namen ändern"
        static let umbenennenTitel = "Name dieses Geräts"
        static let umbenennenHinweis = "So erkennst du das Gerät in der Liste, z. B. „iPhone Theke“."
        static let namePlatzhalter = "z. B. iPhone Theke"
        static let speichern = "Speichern"
    }

    enum Loeschen {
        static let titel = "Konto kündigen und löschen"
        static let ueberschrift = "Was passiert beim Löschen?"
        static let punkte = [
            "Löschen bedeutet die Kündigung deines Tattoofin-Vertrags.",
            "Er endet zum regulären Termin (Paket Monatlich: Ende des laufenden Abrechnungsmonats).",
            "Bis zum Vertragsende kannst du weiter kassieren.",
            "30 Tage nach Vertragsende löschen wir deine Daten und die Daten deiner Kunden.",
            "Was wir laut Gesetz aufbewahren müssen (z. B. Rechnungen und Buchungsbelege 8 Jahre, Bücher 10 Jahre, Geschäftsbriefe 6 Jahre), sperren wir und löschen es nach Ablauf.",
            "Du willst doch bleiben? Schreib uns bis zum Vertragsende an info@tattoofin.de.",
        ]
        static let grund = "Warum gehst du? (optional)"
        static let grundPlatzhalter = "Dein Grund hilft uns, besser zu werden."
        static let bestaetigen = "Tippe LÖSCHEN zur Bestätigung"
        static let knopf = "Konto kündigen und löschen"
        static let erledigtTitel = "Deine Löschung ist eingegangen"
        static let vertragEndet = "Vertrag endet am"
        static let loeschungAb = "Löschung ab"
        static let erledigtText = "Wir haben dir eine Bestätigung per Mail geschickt. Bis zum Vertragsende kannst du weiter kassieren. Du willst doch bleiben? Schreib uns an info@tattoofin.de."
        static let zumKonto = "Zurück zum Konto"
        // Apple-Abo
        static let punktApple = "Er endet, wenn der bezahlte Zeitraum deines Apple-Abos abläuft."
        static var punkteApple: [String] { var p = punkte; p[1] = punktApple; return p }
        static let appleHinweis = "Wichtig: Dein Abo läuft über Apple. Kündige es zusätzlich in den Einstellungen deines Apple-Accounts, sonst bucht Apple weiter ab."
        static let appleKuendigen = "Abo bei Apple kündigen"
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
