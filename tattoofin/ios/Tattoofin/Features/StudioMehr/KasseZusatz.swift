import SwiftUI

/// Kasse: Schalter „Kunde wird heute im Studio tätowiert“ (nur Gesamtpreis, wie #l-heute im Web).
/// Nur dann steht auf der Bezahlseite „heute im Studio“.
struct HeuteSchalter: View {
    @Binding var an: Bool
    /// Kleine iPhones: Erklärung in einer Zeile
    var kompakt = false

    var body: some View {
        // Flach (ohne Karte), damit Ziffernblock und „Zahlungslink erstellen“ in den ersten Bildschirm passen
        Toggle(isOn: $an) {
            VStack(alignment: .leading, spacing: 1) {
                Text(Texte.Kasse2.heute).font(.dm(.subheadline, weight: .semibold)).foregroundStyle(Color.tfTinte)
                Text(Texte.Kasse2.heuteHinweis).font(.dm(.caption)).foregroundStyle(Color.tfLeise)
                    .lineLimit(kompakt ? 1 : nil)
                    .minimumScaleFactor(kompakt ? 0.8 : 1)
                    .fixedSize(horizontal: false, vertical: !kompakt)
            }
        }
        .tint(Color.tfGruen)
        .padding(.horizontal, 4)
        .accessibilityIdentifier("heute-im-studio")
    }
}

/// Gebührenhinweis unter dem Betrag (wie feeHinweis() im Web): bei Provision „Du bekommst … · Tattoofin x %“,
/// sonst Hinweis auf die Gebühr des Zahlungsanbieters.
struct GebuehrHinweis: View {
    let cent: Int?
    /// false: Platz bleibt reserviert, Text unsichtbar (ungültiger Betrag), damit darunter nichts verrutscht
    var sichtbar: Bool = true
    @State private var mehr = StudioMehrStore.shared

    /// Längster möglicher Betrag (5 Stellen vor dem Komma) für den reservierten Platz
    private static let platzhalterCent = 9_999_999

    static func text(cent: Int?, studio: StudioMehr?) -> String? {
        guard let cent, cent > 0, let studio else { return nil }
        if studio.istProvision, let p = studio.provisionProzent, p > 0 {
            let gebuehr = Int((Double(cent) * p / 100).rounded())
            let prozent = p.rounded() == p ? String(Int(p)) : String(format: "%.1f", p).replacingOccurrences(of: ".", with: ",")
            return Texte.Kasse2.provision(anDich: cent - gebuehr, prozent: prozent, gebuehr: gebuehr)
        }
        return Texte.Kasse2.gebuehrStripe
    }

    var body: some View {
        // ZStack mit unsichtbarem längsten Text: Die Höhe bleibt gleich, egal ob und welcher Betrag gerade dasteht
        ZStack {
            Color.clear.frame(height: 0)
            if let platz = Self.text(cent: Self.platzhalterCent, studio: mehr.studio) {
                zeile(platz).hidden().accessibilityHidden(true)
            }
            if sichtbar, let t = Self.text(cent: cent, studio: mehr.studio) {
                zeile(t).accessibilityIdentifier("gebuehr-hinweis")
            }
        }
        .task { await mehr.laden(wennAelterAls: 300) }
    }

    private func zeile(_ t: String) -> some View {
        Text(t)
            .font(.dm(.footnote))
            .foregroundStyle(Color.tfLeise)
            .multilineTextAlignment(.center)
            .fixedSize(horizontal: false, vertical: true)
    }
}
