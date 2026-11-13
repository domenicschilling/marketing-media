import SwiftUI

/// Bildschirm 1: Sperre. Figur und Logo, Face ID startet von selbst; Gerätecode als Rückfall.
struct SperreView: View {
    @Environment(SperreManager.self) private var sperre
    @Environment(\.scenePhase) private var phase
    /// Nur nach echtem Hintergrund automatisch fragen. Die Face-ID-Abfrage selbst macht die App kurz „inaktiv“;
    /// ohne diese Unterscheidung käme nach „Abbrechen“ sofort die nächste Abfrage (Endlosschleife).
    /// Startwert true: beim App-Start (inaktiv → aktiv) einmal von selbst fragen
    @State private var warImHintergrund = true

    var body: some View {
        ZStack {
            Color.tfBlau.ignoresSafeArea()
            VStack(spacing: 24) {
                Spacer()
                MarkenKopf()
                Text(Texte.Sperre.titel)
                    .font(.dm(.title3, weight: .semibold))
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.center)
                Spacer()
                if let f = sperre.fehler {
                    Text(f)
                        .font(.dm(.subheadline, weight: .medium))
                        .foregroundStyle(Color.tfGelb)
                        .multilineTextAlignment(.center)
                }
                Button {
                    Task { await sperre.pruefen() }
                } label: {
                    Label(Texte.Sperre.entsperren(sperre.artName), systemImage: sperre.artName == "Touch ID" ? "touchid" : "faceid")
                }
                .buttonStyle(.haupt)
                .disabled(sperre.prueftGerade)
            }
            .padding(24)
        }
        .task {
            // Face ID startet von selbst, sobald die App sichtbar ist
            if phase == .active {
                warImHintergrund = false
                await sperre.pruefen()
            }
        }
        .onChange(of: phase) { _, neu in
            if neu == .background { warImHintergrund = true }
            if neu == .active && warImHintergrund && sperre.gesperrt {
                warImHintergrund = false
                Task { await sperre.pruefen() }
            }
        }
        // Blauer Hintergrund: helle Statusleiste
        .preferredColorScheme(.dark)
    }
}
