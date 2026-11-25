import Foundation

/// Eine Teil-Einlösung (Server: gutschein.teile = [{ am, cent, notiz }], nur bei teilbaren Gutscheinen)
struct GutscheinTeil: Codable, Sendable, Hashable {
    var am: String?
    var cent: Int
    var notiz: String?
}

/// Wert-Logik für Gutscheine (wie im Web, public/js/app.js, Gutschein-Detail und -Liste).
/// - betragCent ist immer der BEZAHLTE Betrag. Der Wert steht in gutschein.wertCent (Aktions-Gutscheine aus dem Shop: Wert > bezahlt).
/// - Der Bonus (Wert − bezahlt) gilt bis bonusBis, danach zählt der bezahlte Betrag. Was heute noch geht, sagt der Server
///   (restCent, sonst aktuellerWertCent). Die App rechnet die Frist nicht selbst nach.
extension Zahlung {
    private var gs: GutscheinInfo { gutschein ?? GutscheinInfo() }
    var gutscheinStatus: String { gs.status ?? "offen" }

    /// Großer Betrag in Liste und Detail
    var gutscheinWertCent: Int { gs.wertCent ?? betragCent }
    var gutscheinBezahltCent: Int { gs.bezahltCent ?? betragCent }
    /// „bezahlt X“ nur zeigen, wenn es vom Wert abweicht
    var gutscheinBezahltAbweichend: Bool { gutscheinBezahltCent != gutscheinWertCent }
    var gutscheinMitBonus: Bool { (gs.bonusCent ?? 0) > 0 }
    var gutscheinEinloesbar: Bool { gutscheinStatus == "gueltig" || gutscheinStatus == "abgelaufen" }

    /// Was heute (noch) eingelöst werden kann. Eingelöst = 0 (live schickt der Server dann noch den vollen Wert).
    var gutscheinRestCent: Int {
        if gutscheinStatus == "eingeloest" { return 0 }
        return gs.restCent ?? gs.aktuellerWertCent ?? gutscheinWertCent
    }

    /// Zeile „Heute einlösbar“: nur bei einlösbarem Gutschein und wenn der Betrag vom Wert abweicht (Bonus-Frist vorbei, Teile eingelöst)
    var gutscheinZeigtHeuteEinloesbar: Bool { gutscheinEinloesbar && gutscheinRestCent != gutscheinWertCent }

    /// Bonus-Frist abgelaufen (nur für den Zusatz „Bonus-Frist vorbei“)
    func gutscheinBonusVorbei(jetzt: Date = .now) -> Bool {
        guard gutscheinMitBonus, let bis = Datum.parse(gs.bonusBis) else { return false }
        return bis < jetzt
    }

    /// Server kann Teil-Einlösung (Kennzeichen teilbar). Ohne Kennzeichen: nur ganz einlösen wie bisher.
    var gutscheinTeilbar: Bool { gs.teilbar == true }
    var gutscheinTeile: [GutscheinTeil] { gs.teile ?? [] }

    /// „Zurücknehmen“: bei eingelöstem Gutschein und, sobald es Teil-Einlösungen gibt, auch bei gültigem
    var gutscheinKannZuruecknehmen: Bool {
        gutscheinStatus == "eingeloest" || (gutscheinEinloesbar && !gutscheinTeile.isEmpty)
    }

    /// Liste „Verkaufte Gutscheine“ wie im Web: ohne stornierte, ohne abgebrochene/fehlgeschlagene Käufe,
    /// ohne Shop-Bestellungen, die noch keinen Code haben (verlassene Kasse)
    var zeigtInGutscheinListe: Bool {
        guard istGutschein else { return false }
        if ["storniert", "abgebrochen", "fehlgeschlagen"].contains(status) { return false }
        if gs.status == "storniert" { return false }
        if gs.shop == true && gs.code == nil { return false }
        return true
    }
}

/// Betragsfeld beim Einlösen eines teilbaren Gutscheins: leer = alles, sonst Kommabetrag, nicht größer als der Rest
enum TeilEinloesung: Equatable, Sendable {
    case alles
    case betrag(Int)

    enum Fehler: Error, Equatable {
        case ungueltig
        case null
        case zuViel(rest: Int)
    }

    static func pruefen(_ text: String, rest: Int) -> Result<TeilEinloesung, Fehler> {
        let t = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !t.isEmpty else { return .success(.alles) }
        guard let cent = cent(aus: t) else { return .failure(.ungueltig) }
        guard cent > 0 else { return .failure(.null) }
        guard cent <= rest else { return .failure(.zuViel(rest: rest)) }
        return .success(cent == rest ? .alles : .betrag(cent))
    }

    /// „12,50“, „12.50“, „1.250,5“, „12 €“ → Cent. Punkt mit 1–2 Stellen am Ende gilt als Komma, sonst als Tausenderpunkt.
    static func cent(aus text: String) -> Int? {
        var t = text.replacingOccurrences(of: "€", with: "").replacingOccurrences(of: " ", with: "")
        if t.contains(",") {
            t = t.replacingOccurrences(of: ".", with: "")
        } else if let r = t.range(of: #"\.\d{1,2}$"#, options: .regularExpression) {
            t = t.replacingCharacters(in: r, with: "," + t[r].dropFirst())
            t = t.replacingOccurrences(of: ".", with: "")
        } else {
            t = t.replacingOccurrences(of: ".", with: "")
        }
        guard !t.isEmpty, t.allSatisfy({ $0.isASCII && ($0.isNumber || $0 == ",") }) else { return nil }
        return BetragEingabe.cent(aus: t)
    }

    /// Server (parseBetrag) erwartet Euro-Text: 1250 → „12,50“
    static func fuerServer(_ cent: Int) -> String {
        String(format: "%d,%02d", cent / 100, cent % 100)
    }
}
