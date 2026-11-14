import Foundation
import SwiftUI
import UIKit

// Neues Studio in der App anlegen und Apple-Abo (StoreKit 2). Feldnamen wie im Server (API-Vertrag, Spezifikation 14.11.2026).

/// Gemeinsame Konstanten mit dem Server und App Store Connect
enum AboKonstanten {
    static let produktId = "de.tattoofin.app.abo.monatlich"
    /// Apple-Standard-Lizenzvertrag (EULA), öffnet in Safari
    static let eulaURL = URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!
}

// MARK: - Apple-Abo am Studio (GET /api/portal → studio.apple)

struct AppleAbo: Codable, Sendable, Hashable {
    /// aktiv | gekuendigt | zahlungsproblem | abgelaufen | erstattet | widerrufen
    var status: String?
    var laeuftBis: String?
    var autoVerlaengerung: Bool?
    var sandbox: Bool?
    var produktId: String?
    var appAccountToken: String?
    /// Läuft gerade die kostenlose Probezeit (Einführungsangebot)?
    var probe: Bool?

    /// Abo ist zu Ende (Zugang gesperrt), ein neues Abo öffnet ihn wieder
    var istBeendet: Bool { ["abgelaufen", "erstattet", "widerrufen"].contains(status ?? "") }
    var istSandbox: Bool { sandbox ?? false }
    var uuid: UUID? { appAccountToken.flatMap(UUID.init(uuidString:)) }
}

extension Studio {
    /// Das Studio zahlt sein Tattoofin-Abo über Apple (In-App-Kauf)
    var istApple: Bool { abrechnung == "apple" }
}

// MARK: - Anmeldung neues Studio

/// Vorhandener App-Entwurf zur Adresse (Vorbelegung der Angaben)
struct StudioEntwurf: Codable, Sendable, Hashable {
    var firma: String?
    var inhaber: String?
    var strasse: String?
    var plz: String?
    var ort: String?
    var telefon: String?
    var studioTelefon: String?
    var ustid: String?
    var website: String?
    var unterzeichner: String?
}

/// POST /api/app/registrieren/pruefen
struct RegistrierenPruefenAntwort: Codable, Sendable {
    /// angemeldet | auswahl | registrieren
    var art: String
    // art "angemeldet"
    var token: String?
    var geraet: Geraet?
    var studio: StudioKurz?
    // art "auswahl"
    var auswahl: [StudioKurz]?
    var auswahlToken: String?
    // art "registrieren"
    var registrierToken: String?
    var email: String?
    var entwurf: StudioEntwurf?
}

/// POST /api/app/registrieren
struct RegistrierenAntwort: Codable, Sendable, Hashable {
    var entwurfId: String
    var entwurfToken: String
    var appAccountToken: String
    var produktId: String?
    var email: String?
}

/// POST /api/app/abo/bestaetigen (A: mit Token, B: nur abo/studio)
struct AboBestaetigtAntwort: Codable, Sendable {
    var token: String?
    var geraet: Geraet?
    var studio: StudioKurz?
    var abo: AppleAbo?
}

/// POST /api/app/abo/wiederherstellen
struct WiederherstellenAntwort: Codable, Sendable, Hashable {
    var art: String?
    var emailMaskiert: String?
}

/// POST /api/app/abo/aktualisieren
struct AboAktualisiertAntwort: Codable, Sendable, Hashable {
    var abo: AppleAbo?
}

// MARK: - Studio-Angaben (R3/R4) mit derselben Prüfung wie der Server (signup.mjs)

enum StudioFeld: String, CaseIterable, Hashable, Sendable {
    case firma, inhaber, strasse, plz, ort, telefon, studioTelefon, ustid, website, unterzeichner

    /// Felder auf dem Bildschirm „Studio-Angaben“ (R3), in dieser Reihenfolge
    static let angaben: [StudioFeld] = [.firma, .inhaber, .strasse, .plz, .ort, .telefon, .studioTelefon, .ustid, .website]

    var pflicht: Bool { ![.ustid, .website].contains(self) }

    /// Höchstlänge wie im Server (clean(…, max))
    var maxLaenge: Int {
        switch self {
        case .firma, .inhaber, .strasse, .unterzeichner: 120
        case .plz: 10
        case .ort: 80
        case .telefon, .studioTelefon: 40
        case .ustid: 30
        case .website: 160
        }
    }

    var label: String {
        switch self {
        case .firma: Texte.Registrieren.firma
        case .inhaber: Texte.Registrieren.inhaber
        case .strasse: Texte.Registrieren.strasse
        case .plz: Texte.Registrieren.plz
        case .ort: Texte.Registrieren.ort
        case .telefon: Texte.Registrieren.telefon
        case .studioTelefon: Texte.Registrieren.studioTelefon
        case .ustid: Texte.Registrieren.ustid
        case .website: Texte.Registrieren.website
        case .unterzeichner: Texte.Registrieren.unterzeichner
        }
    }

    var platzhalter: String {
        switch self {
        case .firma: "z. B. Ink Studio Beispiel"
        case .inhaber, .unterzeichner: "z. B. Lena Beispiel"
        case .strasse: "z. B. Hauptstraße 1"
        case .plz: "z. B. 96047"
        case .ort: "z. B. Bamberg"
        case .telefon: "z. B. 0151 23456789"
        case .studioTelefon: "z. B. 0951 123456"
        case .ustid: "z. B. DE123456789"
        case .website: "z. B. instagram.com/deinstudio"
        }
    }

    /// Autofill-Typ (iOS schlägt die eigenen Kontaktdaten vor)
    var inhaltTyp: UITextContentType? {
        switch self {
        case .firma: .organizationName
        case .inhaber, .unterzeichner: .name
        case .strasse: .fullStreetAddress
        case .plz: .postalCode
        case .ort: .addressCity
        case .telefon, .studioTelefon: .telephoneNumber
        case .ustid: nil
        case .website: .URL
        }
    }

    var tastatur: UIKeyboardType {
        switch self {
        case .plz: .numberPad
        case .telefon, .studioTelefon: .phonePad
        case .website: .URL
        default: .default
        }
    }

    var grossschreibung: TextInputAutocapitalization {
        switch self {
        case .ustid: .characters
        case .website, .plz, .telefon, .studioTelefon: .never
        default: .words
        }
    }

    var autokorrekturAus: Bool { [.ustid, .website, .plz, .telefon, .studioTelefon, .firma].contains(self) }
}

struct StudioDaten: Codable, Sendable, Hashable {
    var firma = ""
    var inhaber = ""
    var strasse = ""
    var plz = ""
    var ort = ""
    var telefon = ""
    var studioTelefon = ""
    var ustid = ""
    var website = ""
    var unterzeichner = ""

    init() {}

    init(entwurf e: StudioEntwurf) {
        firma = e.firma ?? ""
        inhaber = e.inhaber ?? ""
        strasse = e.strasse ?? ""
        plz = e.plz ?? ""
        ort = e.ort ?? ""
        telefon = e.telefon ?? ""
        studioTelefon = e.studioTelefon ?? ""
        ustid = e.ustid ?? ""
        website = e.website ?? ""
        unterzeichner = e.unterzeichner ?? ""
    }

    subscript(feld: StudioFeld) -> String {
        get {
            switch feld {
            case .firma: firma
            case .inhaber: inhaber
            case .strasse: strasse
            case .plz: plz
            case .ort: ort
            case .telefon: telefon
            case .studioTelefon: studioTelefon
            case .ustid: ustid
            case .website: website
            case .unterzeichner: unterzeichner
            }
        }
        set {
            switch feld {
            case .firma: firma = newValue
            case .inhaber: inhaber = newValue
            case .strasse: strasse = newValue
            case .plz: plz = newValue
            case .ort: ort = newValue
            case .telefon: telefon = newValue
            case .studioTelefon: studioTelefon = newValue
            case .ustid: ustid = newValue
            case .website: website = newValue
            case .unterzeichner: unterzeichner = newValue
            }
        }
    }

    /// Wert, wie der Server ihn speichert (getrimmt, gekürzt; USt-IdNr. groß)
    func bereinigt(_ feld: StudioFeld) -> String {
        let t = String(self[feld].trimmingCharacters(in: .whitespacesAndNewlines).prefix(feld.maxLaenge))
        return feld == .ustid ? t.uppercased() : t
    }

    static func ziffern(_ s: String) -> Int { s.filter(\.isASCIIDigitZiffer).count }

    /// Fehler je Feld, gleiche Regeln wie der Server: Pflichtfelder, PLZ genau 5 Ziffern, Telefon mindestens 6 Ziffern
    func fehler(felder: [StudioFeld] = StudioFeld.allCases) -> [StudioFeld: String] {
        var f: [StudioFeld: String] = [:]
        for feld in felder {
            let v = bereinigt(feld)
            if feld.pflicht && v.isEmpty {
                f[feld] = Texte.Registrieren.pflicht(feld.label)
                continue
            }
            switch feld {
            case .plz where !v.isEmpty && !(v.count == 5 && v.allSatisfy(\.isASCIIDigitZiffer)):
                f[feld] = Texte.Registrieren.plzFalsch
            case .telefon, .studioTelefon:
                if !v.isEmpty && Self.ziffern(v) < 6 { f[feld] = Texte.Registrieren.telefonFalsch }
            default: break
            }
        }
        return f
    }

    /// E-Mail-Form wie isEmail() im Server: etwas@etwas.xx, ohne Leerzeichen
    static func emailGueltig(_ e: String) -> Bool {
        e.wholeMatch(of: /[^\s@]+@[^\s@]+\.[^\s@]{2,}/) != nil
    }
}

private extension Character {
    var isASCIIDigitZiffer: Bool { isASCII && isNumber }
}

/// Bestätigungen in R4 (alle Pflicht)
struct Bestaetigungen: Codable, Sendable, Hashable {
    var vertrag = false
    var avv = false
    var unternehmer = false
    var kmu = false

    var alle: Bool { vertrag && avv && unternehmer && kmu }
}
