import SwiftUI

// Spiegel von tattoofin/website/netlify/functions/_lib/klarna-texte.mjs (Stand 11.11.2026).
// Quelle der Regeln: Klarna-Regeln Deutschland ab 20.11.2026
// (docs.klarna.com/acquirer/klarna/resources/marketing-tools/partner-marketing-legal-guidelines/germany/).
// Ein Test (TattoofinTests/KlarnaTexteTests) vergleicht die Werte mit der .mjs-Datei. Wortlaut nie verändern.
//
// Regeln für die App:
//  - Die App macht KEINE Raten- oder Später-zahlen-Aussagen. Erlaubt ist nur der Name („Mit Klarna bezahlen“,
//    „Klarna verfügbar“) ohne Raten-/Später-Bezug.
//  - Falls doch einmal eine Aussage nötig wird: nur über `KlarnaAussageView` (Warnsatz direkt daneben, gleich groß,
//    plus Fußnote mit Vertragspartner).
//  - Gutscheine nie mit Klarna (Klarna schließt Wertkarten/Gutscheine aus).
enum KlarnaTexte {
    static let warnsatz = "Achtung! Kreditaufnahme kostet Geld."
    static let nameVerfuegbar = "Klarna verfügbar"
    static let nameMitKlarna = "Mit Klarna bezahlen"
    /// Zahlart in Listen/Details: nur der Name
    static let zahlartName = "Klarna"

    enum Aussage {
        static let spaeter = "Jetzt shoppen. Bezahle später mit Klarna."
        static let tage30 = "In bis zu 30 Tagen bezahlen mit Klarna."
        static let finanzierung = "Bezahle in 6, 12, 24 oder 36 Monatsraten mit Klarna."
    }

    static let zusatz = "Raten über Klarna, nach deren Bonitätsprüfung. Vertragspartner der Raten ist Klarna, nicht Tattoofin."
    static let zusatzStudio = "Raten über Klarna, nach deren Bonitätsprüfung. Vertragspartner der Raten ist Klarna, weder wir noch Tattoofin."

    /// Kurzform für eine Raten-Aussage in der App: „Raten* über Klarna“
    static let ratenKurz = "Raten* über Klarna"

    static func mitWarnsatz(_ aussage: String) -> String { "\(aussage) \(warnsatz)" }
    static let pflichtsatz = "*\(zusatz) \(warnsatz)"
    static let fussnote = "*\(zusatz)"

    /// Wie GUTSCHEIN_WORT in klarna-texte.mjs (Groß-/Kleinschreibung egal)
    static let gutscheinWortMuster = #"gutschein|guthaben|geschenkkarte|geschenk-?karte|wertkarte|wertgutschein|geschenk-?gutschein|gift\s?-?card|voucher|prepaid|aufladen"#

    static func istGutscheinWort(_ teile: String...) -> Bool {
        let text = teile.filter { !$0.isEmpty }.joined(separator: " ")
        return text.range(of: gutscheinWortMuster, options: [.regularExpression, .caseInsensitive]) != nil
    }

    static let gutscheinHinweis = "Für Gutscheine bitte die Gutschein-Funktion nutzen. Bei diesem Link ist Klarna ausgeschaltet, bezahlt wird per Karte."
}

/// Einzige erlaubte Darstellung einer Raten-Aussage: Aussage und Warnsatz in gleicher Schrift direkt nebeneinander,
/// darunter die Fußnote. Wird in Version 1 nicht verwendet (die App macht keine Raten-Aussagen).
struct KlarnaAussageView: View {
    var aussage: String = KlarnaTexte.ratenKurz

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("\(aussage) \(KlarnaTexte.warnsatz)")
                .font(.dm(.body, weight: .semibold))
            Text(KlarnaTexte.fussnote)
                .font(.dm(.footnote))
                .foregroundStyle(Color.tfLeise)
        }
    }
}
