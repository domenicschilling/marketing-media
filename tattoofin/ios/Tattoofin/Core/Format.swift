import Foundation

/// Beträge sind in der App immer Cent (Int). Anzeige im deutschen Währungsformat.
enum Euro {
    /// 48000 → „480,00 €“
    static func text(_ cent: Int) -> String {
        let wert = Decimal(cent) / 100
        return wert.formatted(.currency(code: "EUR").locale(Locale(identifier: "de_DE")))
    }

    /// Für VoiceOver: 48000 → „480 Euro“, 48050 → „480 Euro 50“
    static func gesprochen(_ cent: Int) -> String {
        let euro = cent / 100, rest = abs(cent % 100)
        return rest == 0 ? "\(euro) Euro" : "\(euro) Euro \(rest)"
    }

    /// Server erwartet „betrag“ als Euro-Text; Punkt als Dezimaltrenner mit genau zwei Stellen (parseBetrag im Server).
    static func fuerServer(_ cent: Int) -> String {
        String(format: "%d.%02d", cent / 100, cent % 100)
    }
}

/// Eingabe über den Ziffernblock: Euro mit optional Komma und höchstens zwei Nachkommastellen.
struct BetragEingabe: Equatable, Sendable {
    private(set) var text: String = ""

    static let maxStellenVorKomma = 5

    init(text: String = "") { self.text = text }

    /// Taste: „0“…„9“, „,“ oder „⌫“
    mutating func taste(_ t: String) {
        switch t {
        case "⌫":
            if !text.isEmpty { text.removeLast() }
        case ",":
            if !text.contains(",") { text = (text.isEmpty ? "0" : text) + "," }
        default:
            guard t.count == 1, let c = t.first, c.isASCII, c.isNumber else { return }
            if let komma = text.firstIndex(of: ",") {
                if text[text.index(after: komma)...].count >= 2 { return }
            } else {
                if text == "0" { text = ""; if c == "0" { text = "0"; return } }
                if text.count >= Self.maxStellenVorKomma { return }
            }
            text.append(c)
        }
    }

    mutating func leeren() { text = "" }

    /// „480“ → 48000, „480,5“ → 48050, „“ → nil
    var cent: Int? { Self.cent(aus: text) }

    static func cent(aus text: String) -> Int? {
        let t = text.replacingOccurrences(of: " ", with: "").replacingOccurrences(of: "€", with: "")
        guard !t.isEmpty else { return nil }
        let teile = t.split(separator: ",", omittingEmptySubsequences: false)
        guard teile.count <= 2, let euro = Int(teile[0].isEmpty ? "0" : String(teile[0])), euro >= 0 else { return nil }
        var cent = 0
        if teile.count == 2 {
            let nach = String(teile[1])
            guard nach.count <= 2, nach.allSatisfy(\.isNumber) else { return nil }
            cent = nach.isEmpty ? 0 : (nach.count == 1 ? Int(nach)! * 10 : Int(nach)!)
        }
        return euro * 100 + cent
    }

    /// Anzeige im Display: „480“ → „480 €“, „480,5“ → „480,5 €“, leer → „0 €“
    var anzeige: String {
        guard !text.isEmpty else { return "0 €" }
        let (vor, nach) = text.contains(",")
            ? (String(text.split(separator: ",", omittingEmptySubsequences: false)[0]), "," + text.split(separator: ",", omittingEmptySubsequences: false)[1])
            : (text, "")
        let zahl = Int(vor) ?? 0
        let gruppiert = zahl.formatted(.number.locale(Locale(identifier: "de_DE")))
        return gruppiert + nach + " €"
    }
}

/// Gutschein-Codes „GS-XXXX-XXXX“ (Alphabet ohne 0/O und 1/I, wie _lib/gutschein.mjs).
enum GutscheinCode {
    static let alphabet = Set("ABCDEFGHJKLMNPQRSTUVWXYZ23456789")

    /// Formatiert eine Eingabe beim Tippen: „gsab“ → „GS-AB“, „abcd2345“ → „GS-ABCD-2345“
    static func formatieren(_ eingabe: String) -> String {
        var t = eingabe.uppercased().filter { $0.isASCII && ($0.isLetter || $0.isNumber) }
        // „G“ bzw. „GS“ allein: der Nutzer tippt gerade das Präfix
        if "GS".hasPrefix(t) { return t }
        if t.hasPrefix("GS") { t.removeFirst(2) }
        let zeichen = String(t.filter { alphabet.contains($0) }.prefix(8))
        guard !zeichen.isEmpty else { return "GS" }
        let a = zeichen.prefix(4), b = zeichen.dropFirst(4)
        return "GS-" + a + (b.isEmpty ? "" : "-" + b)
    }

    /// Ist der Code vollständig (8 Zeichen aus dem Alphabet)?
    static func vollstaendig(_ code: String) -> Bool {
        istCode(code)
    }

    /// Prüft genau das Muster ^GS-?[A-HJ-NP-Z2-9]{4}-?[A-HJ-NP-Z2-9]{4}$
    static func istCode(_ text: String) -> Bool {
        text.wholeMatch(of: /GS-?[A-HJ-NP-Z2-9]{4}-?[A-HJ-NP-Z2-9]{4}/) != nil
    }

    /// Sucht in erkanntem Text (Kamera) nach einem Code und gibt ihn formatiert zurück.
    static func ausText(_ text: String) -> String? {
        let t = text.uppercased().replacingOccurrences(of: " ", with: "").replacingOccurrences(of: "–", with: "-")
        guard let m = t.firstMatch(of: /GS-?([A-HJ-NP-Z2-9]{4})-?([A-HJ-NP-Z2-9]{4})/) else { return nil }
        return "GS-\(m.1)-\(m.2)"
    }

    /// QR-Code auf neuen Gutschein-PDFs: …/gutschein.html?t=<token> → token
    static func tokenAusQR(_ inhalt: String) -> String? {
        guard let url = URLComponents(string: inhalt.trimmingCharacters(in: .whitespacesAndNewlines)),
              url.path.hasSuffix("/gutschein.html") || url.path == "gutschein.html",
              let t = url.queryItems?.first(where: { $0.name == "t" })?.value,
              !t.isEmpty, t.count <= 200,
              t.allSatisfy({ $0.isASCII && ($0.isLetter || $0.isNumber || $0 == "-" || $0 == "_") })
        else { return nil }
        return t
    }
}

/// Datumsangaben vom Server: ISO mit/ohne Millisekunden oder nur „2026-11-15“.
enum Datum {
    static func parse(_ s: String?) -> Date? {
        guard let s, !s.isEmpty else { return nil }
        if let d = try? Date(s, strategy: .iso8601) { return d }
        if let d = try? Date(s, strategy: Date.ISO8601FormatStyle(includingFractionalSeconds: true)) { return d }
        if s.count == 10, let d = try? Date(s, strategy: Date.ISO8601FormatStyle().year().month().day()) { return d }
        return nil
    }

    private static let de = Locale(identifier: "de_DE")

    /// „15.11.2026“
    static func tag(_ s: String?) -> String? {
        guard let d = parse(s) else { return nil }
        return d.formatted(.dateTime.day(.twoDigits).month(.twoDigits).year().locale(de))
    }

    /// „15.11.2026, 14:05“
    static func tagUhrzeit(_ s: String?) -> String? {
        guard let d = parse(s) else { return nil }
        return d.formatted(.dateTime.day(.twoDigits).month(.twoDigits).year().hour().minute().locale(de))
    }

    /// „vor 5 Minuten“
    static func relativ(_ s: String?) -> String? {
        guard let d = parse(s) else { return nil }
        return d.formatted(.relative(presentation: .named).locale(de))
    }
}

/// APNs-Gerätetoken (Data) → Hex-Text in Kleinbuchstaben.
enum TokenHex {
    static func hex(_ daten: Data) -> String {
        daten.map { String(format: "%02x", $0) }.joined()
    }
}
