import Foundation

// Zusätzliche Studio-Angaben für Einstellungen, Recht, Fragebogen, Abrechnungen, Aufsteller und Nachweis.
// Eigene Modelle (statt Studio zu erweitern), damit sie unabhängig vom Kassen-Bildschirm geladen werden.
// Feldnamen wie oeffentlich() in website/netlify/functions/_lib/studio-ansicht.mjs. Alles optional: ältere Server dürfen Felder weglassen.

/// Teilmenge von oeffentlich(s), die nur die Bildschirme unter „Konto“ brauchen
struct StudioMehr: Codable, Sendable, Hashable {
    let id: String
    var firma: String?
    var inhaber: String?
    var email: String?
    var strasse: String?
    var plz: String?
    var ort: String?
    var slug: String?
    var modell: String?
    var provisionProzent: Double?
    var abrechnung: String?
    var zahlseite: String?
    var stripe: StripeStatus?
    var klarna: Bool?
    var klarnaDauerhaft: Bool?
    var benachrichtigung: Benachrichtigung?
    var anzahlungsbedingungen: String?
    var ausweichAnzahlung: AusweichAnzahlung?
    var zahlartenHinweis: Bool?
    var recht: RechtStand?
    var fragebogenAm: String?

    struct Benachrichtigung: Codable, Sendable, Hashable {
        var email: String?
    }

    struct AusweichAnzahlung: Codable, Sendable, Hashable {
        var an: Bool?
        var prozent: Int?
    }

    struct RechtStand: Codable, Sendable, Hashable {
        var version: String?
        var am: String?
        var aktuell: Bool?
    }

    var name: String { firma?.leerAlsNil ?? "Dein Studio" }
    /// Provision pro Zahlung (Paket Risikofrei): Tattoofin zieht einen Anteil ab
    var istProvision: Bool { modell == "provision" }
    /// Tattoofin-Paket über Stripe abgerechnet (nicht Apple, nicht Geschenk/Demo)
    var istStripeAbrechnung: Bool { (abrechnung ?? "stripe") == "stripe" }
    /// Klarna gibt es bei diesem Studio jetzt (Hinweise in den Einstellungen)
    var hatKlarna: Bool { klarna ?? false }
    /// Klarna gibt es auch dauerhaft (für Dinge, die lange halten: Holz-Aufsteller, Werbung)
    var hatKlarnaDauerhaft: Bool { klarnaDauerhaft ?? false }
}

/// Monatsabrechnung (nur Paket mit Provision, abrechnungenVon in store.mjs)
struct Abrechnung: Codable, Sendable, Hashable, Identifiable {
    var monat: String
    var umsatzCent: Int?
    var provisionBruttoCent: Int?
    var auszahlungCent: Int?
    var positionen: [Position]?
    var rechnungNr: String?
    var rechnungUrl: String?

    var id: String { monat }

    struct Position: Codable, Sendable, Hashable {}

    var anzahl: Int { positionen?.count ?? 0 }
    var anDichCent: Int { auszahlungCent ?? ((umsatzCent ?? 0) - (provisionBruttoCent ?? 0)) }

    /// „2026-10“ → „Oktober 2026“
    var monatText: String {
        let teile = monat.split(separator: "-")
        guard teile.count == 2, let j = Int(teile[0]), let m = Int(teile[1]), (1...12).contains(m) else { return monat }
        let namen = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]
        return "\(namen[m - 1]) \(j)"
    }
}

/// Konfiguration aus GET /api/portal (nur was hier gebraucht wird)
struct PortalMehrConfig: Codable, Sendable, Hashable {
    var rechtVersion: String?
    var provisionProzent: Double?
    var ustProzent: Double?
}

/// GET /api/portal, gelesen für die Bildschirme unter „Konto“
struct PortalMehr: Codable, Sendable {
    var studio: StudioMehr
    var abrechnungen: [Abrechnung]?
    var config: PortalMehrConfig?
}

/// POST /api/portal/stripe-dashboard
struct URLAntwort: Codable, Sendable {
    var url: String?
}

/// QR-Aufsteller für die App (aufstellerFuerApp in _lib/werbung.mjs): ohne Paket, nur Artikel und Preis des Aufstellers.
/// GET /api/app/aufsteller (mit Logo), POST /api/portal/aufsteller und /aufsteller-pruefen liefern { aufsteller, url?, cs?, bezahlt? }.
struct AufstellerApp: Codable, Sendable, Hashable {
    var artikel: String?
    var beschreibung: String?
    var kostenlos: Bool?
    var preis: Preis?
    var preisText: String?
    var knopf: String?
    var bezahlenHinweis: String?
    var holz: String?
    var variante: String?
    var hatLogo: Bool?
    var holzHinweis: HolzHinweis?
    /// offen | zahlung_offen | bestellt | bezahlt
    var status: String?
    var bestelltAm: String?
    var bezahltAm: String?
    var statusText: String?
    var lieferadresse: String?
    var firma: String?
    var zahlseite: String?
    /// Klarna-Zeile auf dem Schild (nur wenn das Studio Klarna dauerhaft anbietet)
    var klarna: Bool?
    var fussnote: String?
    var logo: Logo?

    struct Preis: Codable, Sendable, Hashable {
        var nettoCent: Int?
        var gesamtCent: Int?
        var ustProzent: Double?
        var text: String?
    }

    struct HolzHinweis: Codable, Sendable, Hashable {
        var hell: String?
        var dunkel: String?
    }

    struct Logo: Codable, Sendable, Hashable {
        var src: String?
        var w: Int?
        var h: Int?
    }

    var istBestellt: Bool { status == "bestellt" || status == "bezahlt" || bestelltAm != nil || bezahltAm != nil }
}

struct AufstellerAppAntwort: Codable, Sendable {
    var aufsteller: AufstellerApp?
    var url: String?
    var cs: String?
    var bezahlt: Bool?
}

// MARK: - Nachweis (GET /api/portal/nachweis/:id)

struct NachweisAntwort: Codable, Sendable {
    var studio: NachweisStudio?
    var zahlung: NachweisZahlung
    var leistung: NachweisLeistung?
    var version: String?
    var erstellt: String?

    struct NachweisStudio: Codable, Sendable {
        var firma: String?
        var inhaber: String?
        var strasse: String?
        var plz: String?
        var ort: String?
    }

    struct NachweisZahlung: Codable, Sendable {
        let id: String
        var kunde: String?
        var email: String?
        var betragCent: Int?
        var beschreibung: String?
        var sitzungen: String?
        var art: String?
        var anzahlung: Bool?
        var status: String?
        var bezahltAm: String?
        var zahlart: String?
        var zahlartText: String?
        var paymentIntentId: String?
        var kundeBestaetigt: KundeBestaetigt?
        var bedingungen: Bedingungen?
    }

    struct KundeBestaetigt: Codable, Sendable {
        var am: String?
        var inhalt: String?
        var version: String?
        var ip: String?
    }

    struct Bedingungen: Codable, Sendable {
        var akzeptiertAm: String?
        var text: String?
    }

    struct NachweisLeistung: Codable, Sendable {
        var am: String?
        var name: String?
        var datum: String?
        var version: String?
        var text: String?
        var unterschrift: String?
        var foto: String?
        var fotoEinwilligung: String?
        var ip: String?
    }
}

// MARK: - Fragebogen (GET/POST /api/portal/fragebogen): flaches Objekt mit Text- und Ja/Nein-Werten

enum FragebogenWert: Codable, Sendable, Hashable {
    case text(String)
    case jaNein(Bool)

    init(from decoder: any Decoder) throws {
        let c = try decoder.singleValueContainer()
        if let b = try? c.decode(Bool.self) { self = .jaNein(b); return }
        if let s = try? c.decode(String.self) { self = .text(s); return }
        if let d = try? c.decode(Double.self) { self = .text(d.rounded() == d ? String(Int(d)) : String(d)); return }
        self = .text("")
    }

    func encode(to encoder: any Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .text(let s): try c.encode(s)
        case .jaNein(let b): try c.encode(b)
        }
    }

    var text: String? { if case .text(let s) = self { s } else { nil } }
    var jaNein: Bool? { if case .jaNein(let b) = self { b } else { nil } }
}

/// Der ganze Fragebogen als Wörterbuch (Feldnamen wie in onboarding.html)
struct FragebogenDaten: Codable, Sendable {
    var werte: [String: FragebogenWert]

    init(werte: [String: FragebogenWert] = [:]) { self.werte = werte }

    init(from decoder: any Decoder) throws {
        let c = try decoder.singleValueContainer()
        werte = (try? c.decode([String: FragebogenWert].self)) ?? [:]
    }

    func encode(to encoder: any Encoder) throws {
        var c = encoder.singleValueContainer()
        try c.encode(werte)
    }

    var aktualisiertAm: String? { werte["updatedAt"]?.text }
}
