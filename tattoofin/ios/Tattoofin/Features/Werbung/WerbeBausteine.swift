import SwiftUI

/// Schmuck-Überschrift einer Werbe-Karte (Luckiest Guy). Auf dem SE und bei großer Schrift darf ein langes Wort wie
/// „Werbevideo“ nie mitten im Wort brechen: Schrift höchstens bis accessibility1, notfalls etwas kleiner, höchstens 2 Zeilen.
struct WerbeUeberschrift: View {
    let text: String

    init(_ text: String) { self.text = text }

    var body: some View {
        Text(text)
            .font(.luckiest(24, relativeTo: .title2))
            .foregroundStyle(Color.tfTinte)
            // Wächst mit der Schrift (DS-Audit), bleibt aber einzeilig und wird notfalls kleiner: so bricht „Werbevideo“ nie mitten im Wort
            .lineLimit(1)
            .minimumScaleFactor(0.4)
            .accessibilityAddTraits(.isHeader)
    }
}

/// Aktionen einer Werbe-Karte: ein Hauptknopf „Speichern“ und daneben runde Symbol-Knöpfe (Text kopieren, Teilen).
/// Passt die Reihe nicht (große Schrift), steht der Hauptknopf in voller Breite und die runden Knöpfe darunter.
struct WerbeAktionen<Haupt: View, Rund: View>: View {
    @ViewBuilder var haupt: Haupt
    @ViewBuilder var rund: Rund

    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: 10) {
                haupt
                rund
            }
            VStack(alignment: .leading, spacing: 10) {
                haupt
                HStack(spacing: 12) { rund }
            }
        }
    }
}

/// Runder Symbol-Knopf (gleiche Höhe wie der Hauptknopf). Die Beschriftung kommt als Vorlesetext (accessibilityLabel).
struct RundKnopfStil: ButtonStyle {
    @Environment(\.isEnabled) private var aktiv
    @ScaledMetric(relativeTo: .body) private var kante: CGFloat = 54

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .labelStyle(.iconOnly)
            .font(.dm(.body, weight: .semibold))
            .foregroundStyle(aktiv ? Color.tfTinte : Color.tfLeise)
            .frame(width: min(kante, 72), height: min(kante, 72))
            .background(Color.tfKarte, in: Circle())
            .overlay(Circle().stroke(aktiv ? Color.tfTinte.opacity(0.5) : Color.tfLinie, lineWidth: 1.5))
            .contentShape(Circle())
            .opacity(aktiv && configuration.isPressed ? 0.7 : 1)
            .dynamicTypeSize(...DynamicTypeSize.accessibility2)  // ds-ok: Symbol im festen Kreis, Beschriftung steht im Vorlesetext
    }
}

extension ButtonStyle where Self == RundKnopfStil {
    static var rund: RundKnopfStil { RundKnopfStil() }
}

/// Runder Symbol-Knopf mit Vorlesetext und Sprachsteuerungs-Namen
struct RundKnopf: View {
    let label: String
    let symbol: String
    var aktion: () -> Void

    var body: some View {
        Button(action: aktion) { Label(label, systemImage: symbol) }
            .buttonStyle(.rund)
            .accessibilityLabel(label)
            .accessibilityInputLabels([label])
    }
}

/// Hauptknopf „Speichern“ einer Werbe-Karte. Sichtbar steht nur „Speichern“, der Vorlesetext sagt, was gespeichert wird.
struct WerbeSpeichernKnopf: View {
    let label: String
    let arbeitet: Bool
    var aktion: () -> Void

    var body: some View {
        Button(action: aktion) {
            if arbeitet {
                ProgressView().tint(Color.tfBlau)
            } else {
                Label(Texte.AbnahmeG6.speichern, systemImage: "square.and.arrow.down")
                    .lineLimit(1)
                    .fixedSize(horizontal: true, vertical: false)
            }
        }
        .buttonStyle(.haupt)
        .dynamicTypeSize(...DynamicTypeSize.accessibility3)  // ds-ok: „Speichern“ passt so auf dem SE ohne Wortbruch in die Karte
        .accessibilityLabel(label)
        .accessibilityInputLabels([Texte.AbnahmeG6.speichern, label])
    }
}

/// Anleitung in drei Schritten, einmal oben im Werbung-Tab (nicht mehr in jeder Karte).
/// Passt sie nicht in eine Zeile (große Schrift), stehen die Schritte untereinander.
struct WerbeAnleitung: View {
    @ScaledMetric(relativeTo: .footnote) private var kreis: CGFloat = 22

    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: 14) { schritte }
            VStack(alignment: .leading, spacing: 8) { schritte }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Texte.AbnahmeG6.anleitungLabel)
    }

    private var schritte: some View {
        ForEach(Array(Texte.AbnahmeG6.anleitung.enumerated()), id: \.offset) { i, t in
            HStack(spacing: 6) {
                Text("\(i + 1)")
                    .font(.dm(.caption, weight: .bold))
                    .foregroundStyle(Color.tfBlau)
                    .frame(width: min(kreis, 34), height: min(kreis, 34))
                    .background(Color.tfGelb, in: Circle())
                    .dynamicTypeSize(...DynamicTypeSize.accessibility2)  // ds-ok: Ziffer im festen Kreis
                Text(t)
                    .font(.dm(.footnote, weight: .semibold))
                    .foregroundStyle(Color.tfTinte)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }
}
