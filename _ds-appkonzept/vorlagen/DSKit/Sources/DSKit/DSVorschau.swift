import SwiftUI

/// Vorschau eines Bildschirms in den Prüf-Varianten (referenzen/09-pruefung.md):
/// hell, dunkel, große Schrift (AX3), kleinstes iPhone-Format.
/// Verwendung: `#Preview { DSPruefVorschau { MeinBildschirm() } }`
public struct DSPruefVorschau<Inhalt: View>: View {
    private let inhalt: () -> Inhalt

    public init(@ViewBuilder _ inhalt: @escaping () -> Inhalt) {
        self.inhalt = inhalt
    }

    public var body: some View {
        ScrollView(.horizontal) {
            HStack(alignment: .top, spacing: DSAbstand.xl) {
                variante("Hell") { inhalt().environment(\.colorScheme, .light) }
                variante("Dunkel") { inhalt().environment(\.colorScheme, .dark) }
                variante("Große Schrift AX3") {
                    inhalt().environment(\.dynamicTypeSize, .accessibility3)
                }
                variante("Fette Schrift") {
                    inhalt().environment(\.legibilityWeight, .bold)
                }
            }
            .padding(DSAbstand.l)
        }
    }

    private func variante<V: View>(_ name: String, @ViewBuilder _ ansicht: () -> V) -> some View {
        VStack(alignment: .leading, spacing: DSAbstand.s) {
            Text(name).font(.dsHinweis).foregroundStyle(.secondary)
            ansicht()
                // iPhone SE / mini: kleinste Breite, auf der alles funktionieren muss
                .frame(width: 375, height: 667) // ds-ok: iPhone-SE-Maß der Prüfvorschau
                .clipShape(.ds(DSRadius.gross))
                .overlay(RoundedRectangle.ds(DSRadius.gross).stroke(DSSystemFarbe.trenner))
        }
    }
}
