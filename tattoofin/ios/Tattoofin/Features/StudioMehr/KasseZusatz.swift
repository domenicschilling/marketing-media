import SwiftUI

/// Kasse: Schalter „Kunde wird heute im Studio tätowiert“ (nur Gesamtpreis, wie #l-heute im Web).
/// Nur dann steht auf der Bezahlseite „heute im Studio“.
struct HeuteSchalter: View {
    @Binding var an: Bool

    var body: some View {
        // Flach (ohne Karte), damit Ziffernblock und „Zahlungslink erstellen“ in den ersten Bildschirm passen
        Toggle(isOn: $an) {
            VStack(alignment: .leading, spacing: 1) {
                Text(Texte.Kasse2.heute).font(.dm(.subheadline, weight: .semibold)).foregroundStyle(Color.tfTinte)
                Text(Texte.Kasse2.heuteHinweis).font(.dm(.caption)).foregroundStyle(Color.tfLeise)
                    .fixedSize(horizontal: false, vertical: true)
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
    @State private var mehr = StudioMehrStore.shared

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
        // VStack mit festem Platzhalter, damit .task auch ohne sichtbaren Text läuft
        VStack(spacing: 0) {
            Color.clear.frame(height: 0)
            if let t = Self.text(cent: cent, studio: mehr.studio) {
                Text(t)
                    .font(.dm(.footnote))
                    .foregroundStyle(Color.tfLeise)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityIdentifier("gebuehr-hinweis")
            }
        }
        .task { await mehr.laden(wennAelterAls: 300) }
    }
}
