import Foundation

// Modelle für die Antworten des Servers. Feldnamen wie im Server (camelCase), Beträge immer in Cent.
// Fast alles ist optional: Der Server darf neue Felder ergänzen oder alte weglassen, ohne dass die App abbricht.

// MARK: - Studio (Teilmenge von oeffentlich() in portal.mjs)

struct Studio: Codable, Sendable, Hashable {
    let id: String
    var firma: String?
    var inhaber: String?
    var email: String?
    var ort: String?
    var slug: String?
    var status: String?
    var statusText: String?
    var paket: String?
    var paketName: String?
    var kuendigung: Kuendigung?
    var stripe: StripeStatus?
    var kannKassieren: Bool?
    var zahlseite: String?
    var connectUrl: String?

    var name: String { firma ?? "Dein Studio" }
    var darfKassieren: Bool { kannKassieren ?? false }
    /// Offene Kündigung, die das Studio selbst zurücknehmen kann
    var kuendigungZuruecknehmbar: Bool {
        status == "gekuendigt" && kuendigung != nil && kuendigung?.garantie != true && kuendigung?.durchAnbieter != true
    }
}

struct Kuendigung: Codable, Sendable, Hashable {
    var eingegangenAm: String?
    var zum: String?
    var garantie: Bool?
    var durchAnbieter: Bool?
}

struct StripeStatus: Codable, Sendable, Hashable {
    var verbunden: Bool?
    var freigegeben: Bool?
    var auszahlungen: Bool?
    var angabenGemacht: Bool?
    var kontoTyp: String?
}

// MARK: - Zahlung (fuerStudio in portal.mjs)

struct Zahlung: Codable, Sendable, Hashable, Identifiable {
    let id: String
    var createdAt: String?
    var art: String?                 // gesamt | anzahlung | gutschein | zahlseite
    var status: String               // offen | in_pruefung | bezahlt | storniert | abgebrochen | fehlgeschlagen | erstattet | rueckgebucht
    var betragCent: Int
    var kunde: String?
    var email: String?
    var beschreibung: String?
    var sitzungen: String?
    var zahlart: String?
    var zahlartText: String?
    var bezahltAm: String?
    var storniertAm: String?
    var verfuegbarAb: String?
    var erstattetCent: Int?
    var nurKarte: Bool?
    var leistungLink: String?
    var gutschein: GutscheinInfo?

    var istGutschein: Bool { art == "gutschein" }
    var istOffen: Bool { status == "offen" }
    var istBezahlt: Bool { status == "bezahlt" || status == "in_pruefung" }

    var titel: String {
        if istGutschein { return "Gutschein" + (gutschein?.empfaenger.map { " für \($0)" } ?? "") }
        return beschreibung?.isEmpty == false ? beschreibung! : "Tattoo-Projekt"
    }

    var artText: String? {
        switch art {
        case "anzahlung": "Anzahlung"
        case "gesamt": "Gesamtpreis"
        case "gutschein": "Gutschein"
        case "zahlseite": "Theken-QR"
        default: nil
        }
    }

    /// Zahlart für die Anzeige. Klarna nur mit dem Namen (ohne Raten-/Später-Aussage, siehe KlarnaTexte).
    var zahlartAnzeige: String? {
        if zahlart == "klarna" { return KlarnaTexte.zahlartName }
        if let t = zahlartText, !t.isEmpty, !t.localizedCaseInsensitiveContains("raten"), !t.localizedCaseInsensitiveContains("später") { return t }
        return zahlart.map { Zahlung.zahlarten[$0] ?? $0 }
    }

    static let zahlarten = ["card": "Karte", "sepa_debit": "SEPA-Lastschrift", "paypal": "PayPal", "link": "Link",
                            "apple_pay": "Apple Pay", "google_pay": "Google Pay"]
}

struct GutscheinInfo: Codable, Sendable, Hashable {
    var code: String?
    var status: String?              // offen | gueltig | eingeloest | abgelaufen | storniert | erstattet
    var link: String?
    var gueltigBis: String?
    var ausgestelltAm: String?
    var empfaenger: String?
    var nachricht: String?
    var eingeloestAm: String?
    var einloeseNotiz: String?
    var gesendetAm: String?
    var gesendetAn: String?
}

struct KPIs: Codable, Sendable, Hashable {
    var umsatzMonatCent: Int?
    var zahlungenMonat: Int?
    var offen: Int?
    var umsatzGesamtCent: Int?
}

struct PortalConfig: Codable, Sendable, Hashable {
    var minBetragCent: Int?
    var maxBetragCent: Int?

    var min: Int { minBetragCent ?? 5_000 }
    var max: Int { maxBetragCent ?? 2_000_000 }
}

/// GET /api/portal
struct PortalAntwort: Codable, Sendable {
    var studio: Studio
    var zahlungen: [Zahlung]
    var kpis: KPIs?
    var config: PortalConfig?
}

/// POST /api/portal/zahlung
struct ZahlungErstellt: Codable, Sendable, Hashable {
    var zahlung: Zahlung
    var link: String
    var whatsappText: String?
    var hinweis: String?
}

/// GET /api/portal/zahlung/:id
struct ZahlungEinzeln: Codable, Sendable {
    var zahlung: Zahlung
    var link: String?
}

/// POST /api/portal/bestaetigung/:id
struct LinkAntwort: Codable, Sendable, Hashable {
    var link: String
    var whatsappText: String?
}

struct GesendetAntwort: Codable, Sendable {
    var gesendet: Bool?
}

/// Antworten wie {"ok":true} (Inhalt egal)
struct OK: Codable, Sendable {
    var ok: Bool?
}

// MARK: - Anmeldung

struct CodeAntwort: Codable, Sendable {
    var ok: Bool?
    var verzoegert: Bool?
}

struct GeraetAngaben: Codable, Sendable {
    var name: String
    var modell: String
    var platform: String
    var osVersion: String
    var appVersion: String
}

struct StudioKurz: Codable, Sendable, Hashable, Identifiable {
    let id: String
    var firma: String?
    var ort: String?
}

/// POST /api/app/anmelden: entweder fertig (token) oder Auswahl nötig (auswahl + auswahlToken)
struct AnmeldenAntwort: Codable, Sendable {
    var token: String?
    var geraet: Geraet?
    var studio: StudioKurz?
    var auswahl: [StudioKurz]?
    var auswahlToken: String?
}

// MARK: - Geräte, Push, Team

struct Mitteilungen: Codable, Sendable, Hashable {
    var zahlungen: Bool
    var auszahlungen: Bool
}

struct Geraet: Codable, Sendable, Hashable, Identifiable {
    let id: String
    var name: String?
    var modell: String?
    var platform: String?
    var email: String?
    var rolle: String?
    var createdAt: String?
    var zuletztAm: String?
    var mitteilungen: Mitteilungen?
    var kundennameInMitteilung: Bool?
    var push: Bool?
    var diesesGeraet: Bool?

    var plattformText: String { platform == "android" ? "Android" : "iPhone (iOS)" }
}

struct GeraeteAntwort: Codable, Sendable { var geraete: [Geraet] }
struct GeraetAntwort: Codable, Sendable { var geraet: Geraet }

struct PushAntwort: Codable, Sendable {
    var ok: Bool?
    var apnsAktiv: Bool?
}

struct PushTestAntwort: Codable, Sendable {
    var gesendet: Bool?
    var grund: String?
}

struct TeamAntwort: Codable, Sendable, Hashable {
    var hauptadresse: String?
    var team: [String]
    var max: Int?
    var darfAendern: Bool?
}

struct KontoLoeschenAntwort: Codable, Sendable, Hashable {
    var ok: Bool?
    var kuendigungZum: String?
    var loeschungAb: String?
}

// MARK: - Auszahlungen

struct AuszahlungenAntwort: Codable, Sendable {
    var konto: AuszahlungKonto?
    var saldo: Saldo?
    var auszahlungen: [Auszahlung]
    var weitere: Bool?
    var nach: String?
    var hinweis: String?
}

struct AuszahlungKonto: Codable, Sendable, Hashable {
    var verbunden: Bool?
    var auszahlungenAktiv: Bool?
    var kontoTyp: String?
}

struct Saldo: Codable, Sendable, Hashable {
    var verfuegbarCent: Int
    var unterwegsCent: Int
    var waehrung: String?
}

struct Auszahlung: Codable, Sendable, Hashable, Identifiable {
    let id: String
    var betragCent: Int
    var waehrung: String?
    var status: String               // paid | in_transit | pending | failed | canceled
    var statusText: String?
    var ankunftAm: String?
    var erstelltAm: String?
    var bank: Bank?
    var fehler: String?

    struct Bank: Codable, Sendable, Hashable {
        var name: String?
        var endet: String?
    }
}
