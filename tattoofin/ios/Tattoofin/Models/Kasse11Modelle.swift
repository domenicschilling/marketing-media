import Foundation

// Ergänzungen 1.1 Kasse: Adresse der Zahlseite, Studios ohne Anzahlung, Ausweich-Anzahlung nach Klarna-Ablehnung,
// Erstattung bei Provision, eine Portal-Abfrage für Kasse und Konto. Alle Felder optional (ältere Server).

/// studio.zahlseiteAdresse aus oeffentlich() (studio-ansicht.mjs)
struct ZahlseiteAdresse: Codable, Sendable, Hashable {
    /// Adresse fehlt (oder ist nur die private Adresse aus Stripe und noch nicht bestätigt): Kassieren gesperrt
    var fehlt: Bool?
    /// Vorschlag aus dem Stripe-Konto, noch nicht bestätigt
    var vorschlag: Bool?
    /// Vorschlag ist die private Wohnadresse aus Stripe
    var privat: Bool?
    var bestaetigtAm: String?
}

/// zahlung.ausweich am Original-Link (domain.mjs, pay.mjs)
struct ZahlungAusweich: Codable, Sendable, Hashable {
    var anzahlungId: String?
    var bezahltAm: String?
    var betragCent: Int?
    var am: String?
}

extension Studio {
    /// Studio nimmt über Tattoofin keine Anzahlungen an: Kasse nur mit Gesamtpreis
    var keineAnzahlung: Bool { anzahlungAus ?? false }
    /// Wie adresseFehlt() im Web: Testkassen (Demo, Testkauf) brauchen keine Adresse
    var adresseFehlt: Bool { !hatTestkasse && zahlseiteAdresse?.fehlt == true }
    var adresseIstVorschlag: Bool { zahlseiteAdresse?.vorschlag == true }
    var adresseIstPrivat: Bool { zahlseiteAdresse?.privat == true }
    /// Postleitzahl muss 5 Ziffern haben (wie der Server, nur für Deutschland)
    var adresseInDeutschland: Bool { (land ?? "DE").uppercased() == "DE" }
}

extension StudioMehr {
    var keineAnzahlung: Bool { anzahlungAus ?? false }
}

extension Zahlung {
    /// Original-Link, für den der Kunde nach der Klarna-Ablehnung eine Anzahlung bezahlt hat (Rest im Studio)
    var istAusweichAngezahlt: Bool { status == "offen" && ausweich?.bezahltAm != nil }
    /// Rest, den der Kunde im Studio zahlt (Original-Link: Betrag minus Anzahlung; Anzahlungs-Eintrag: restCent)
    var restImStudioCent: Int? {
        if let r = restCent, ausweichVon != nil { return max(0, r) }
        if istAusweichAngezahlt, let a = ausweich?.betragCent { return max(0, betragCent - a) }
        return nil
    }
    /// Status für die Anzeige: „angezahlt“ statt „offen“ beim Original-Link mit Ausweich-Anzahlung
    var anzeigeStatus: String { istAusweichAngezahlt ? "angezahlt" : status }
    /// Zahlung über Tattoofin mit Provision: Erstattung nur im Studio-Bereich auf tattoofin.de, nicht im Stripe-Konto
    var erstattungUeberTattoofin: Bool { abwicklung == "plattform" || abwicklung == "direkt" }
    var erstattungHinweis: String { erstattungUeberTattoofin ? Texte.Kasse11.erstattungProvision : Texte.Detail.erstattungHinweis }
}

extension KasseEntwurf {
    /// Studio ohne Anzahlung: gespeicherten Entwurf auf Gesamtpreis stellen
    func passend(keineAnzahlung: Bool) -> KasseEntwurf {
        guard keineAnzahlung, anzahlung else { return self }
        var e = self
        e.anzahlung = false
        return e
    }
}

/// Prüfung der Adresse wie POST /api/portal/adresse (portal.mjs): Straße, Ort, in Deutschland PLZ mit 5 Ziffern
enum AdressePruefung {
    static func fehlt(strasse: String, plz: String, ort: String, deutschland: Bool) -> [String] {
        var f: [String] = []
        if strasse.leerAlsNil == nil { f.append(Texte.Kasse11.adresseStrasse) }
        if ort.leerAlsNil == nil { f.append(Texte.Kasse11.adresseOrt) }
        let p = plz.trimmingCharacters(in: .whitespaces)
        if deutschland && !(p.count == 5 && p.allSatisfy(\.isASCII) && p.allSatisfy(\.isNumber)) { f.append(Texte.Kasse11.adressePlzFuenf) }
        return f
    }

    static func meldung(strasse: String, plz: String, ort: String, deutschland: Bool) -> String? {
        let f = fehlt(strasse: strasse, plz: plz, ort: ort, deutschland: deutschland)
        return f.isEmpty ? nil : Texte.Kasse11.adresseBitteAusfuellen(f)
    }
}

/// GET /api/portal einmal holen und für Kasse (PortalAntwort) und Konto-Bildschirme (PortalMehr) lesen
struct PortalBeide: Decodable, Sendable {
    var antwort: PortalAntwort
    var mehr: PortalMehr?

    init(from decoder: any Decoder) throws {
        antwort = try PortalAntwort(from: decoder)
        mehr = try? PortalMehr(from: decoder)  // ds-ok: Konto-Teil ist Zusatz, ohne ihn lädt StudioMehrStore selbst
    }
}

extension PortalStore {
    /// Antwort übernehmen und den Konto-Teil gleich mitgeben (spart die zweite Abfrage beim Start)
    func uebernehmen(_ b: PortalBeide) {
        uebernehmen(b.antwort)
        if let m = b.mehr { StudioMehrStore.shared.uebernehmen(m) }
    }

    /// Kennzahlen für die Anzeige: „offene Links“ ohne Links, die schon über eine Ausweich-Anzahlung angezahlt sind.
    /// Der Server zählt alle mit Status „offen“ aus derselben Liste; die App zählt deshalb selbst, sobald die Liste da ist.
    var kpisAnzeige: KPIs? {
        guard var k = kpis else { return nil }
        if k.offen != nil { k.offen = Self.offeneLinks(zahlungen) }
        return k
    }

    nonisolated static func offeneLinks(_ zahlungen: [Zahlung]) -> Int {
        zahlungen.filter(\.istOffen).count
    }
}

extension PortalStore {
    /// Beim Zurückkehren in die App neu laden, wenn der Stand älter als 2 Minuten ist (oder noch nie geladen wurde)
    nonisolated static func neuLadenNoetig(geladenAm: Date?, jetzt: Date = .now) -> Bool {
        guard let g = geladenAm else { return true }
        return jetzt.timeIntervalSince(g) > 120
    }
}
