import SwiftUI

/// Der eine Hauptknopf eines Bildschirms (z. B. "Termin speichern").
/// Systemstil `.borderedProminent` in voller Breite, mit Lade-Zustand. Haptik setzt die App
/// am Ergebnis (`.sensoryFeedback(.success, trigger: …)`), nicht am Tippen.
/// Höchstens einer pro Bildschirm.
public struct DSHauptknopf: View {
    private let titel: String
    private let laedt: Bool
    private let aktion: () -> Void

    public init(_ titel: String, laedt: Bool = false, aktion: @escaping () -> Void) {
        self.titel = titel
        self.laedt = laedt
        self.aktion = aktion
    }

    public var body: some View {
        Button(action: aktion) {
            ZStack {
                Text(titel).opacity(laedt ? 0 : 1) // ds-ok: ganz ausblenden beim Laden, kein Kontrastfall
                if laedt {
                    ProgressView()
                }
            }
            .frame(maxWidth: .infinity, minHeight: DSMass.tippflaeche)
        }
        .buttonStyle(.borderedProminent)
        .controlSize(.large)
        .disabled(laedt)
        .accessibilityLabel(Text(titel))
        .accessibilityValue(laedt ? Text("Läuft") : Text(""))
    }
}

/// Unten fest stehender Bereich für den Hauptknopf über scrollendem Inhalt.
public extension View {
    func dsHauptknopfUnten(_ titel: String, laedt: Bool = false, aktion: @escaping () -> Void) -> some View {
        safeAreaInset(edge: .bottom) {
            DSHauptknopf(titel, laedt: laedt, aktion: aktion)
                .padding(.horizontal, DSAbstand.l)
                .padding(.vertical, DSAbstand.s)
                .background(.bar)
        }
    }
}
