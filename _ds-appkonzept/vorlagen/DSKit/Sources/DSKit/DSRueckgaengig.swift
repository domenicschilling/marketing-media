import SwiftUI

/// Kurzer Hinweis unten: "Erledigt · Rückgängig", "Gespeichert", "Senden hat nicht geklappt".
/// Rückholbares sofort ausführen und Rückgängig anbieten statt vorher zu fragen
/// (referenzen/04-bildschirme.md). Endgültiges und Geld bleiben bei einer Bestätigung.
public struct DSHinweis: Identifiable, Equatable {
    public enum Art: Sendable { case info, erfolg, fehler }

    public let id = UUID()
    public let text: String
    public let art: Art
    /// Aktion für "Rückgängig", gehört zu genau diesem Hinweis.
    public let rueckgaengig: (@MainActor () -> Void)?

    public init(_ text: String, art: Art = .info, rueckgaengig: (@MainActor () -> Void)? = nil) {
        self.text = text
        self.art = art
        self.rueckgaengig = rueckgaengig
    }

    public static func == (a: DSHinweis, b: DSHinweis) -> Bool { a.id == b.id }
}

public extension View {
    /// Zeigt `hinweis` unten an. Verschwindet nach 6 s; mit VoiceOver oder Schaltersteuerung
    /// bleibt ein Hinweis mit Rückgängig stehen, bis er geschlossen wird.
    func dsHinweis(_ hinweis: Binding<DSHinweis?>) -> some View {
        modifier(DSHinweisModifier(hinweis: hinweis))
    }
}

struct DSHinweisModifier: ViewModifier {
    @Binding var hinweis: DSHinweis?
    @Environment(\.accessibilityVoiceOverEnabled) private var voiceOver
    @Environment(\.accessibilitySwitchControlEnabled) private var schalter
    @Environment(\.accessibilityReduceMotion) private var bewegungReduziert

    func body(content: Content) -> some View {
        content
            .overlay(alignment: .bottom) {
                if let aktuell = hinweis {
                    zeile(aktuell)
                        .transition(bewegungReduziert ? .opacity : .move(edge: .bottom).combined(with: .opacity))
                        .task(id: aktuell.id) {
                            AccessibilityNotification.Announcement(aktuell.text).post()
                            let bleibt = aktuell.rueckgaengig != nil && (voiceOver || schalter)
                            guard !bleibt else { return }
                            try? await Task.sleep(for: .seconds(6))
                            if hinweis?.id == aktuell.id { hinweis = nil }
                        }
                }
            }
            .dsAnimation(DSBewegung.erscheinen, value: hinweis)
            // Haptik nach Haptik-Karte (05-gestaltung.md): nur Erfolg und Fehler, nie bei Info
            .sensoryFeedback(.success, trigger: hinweis?.id) { _, _ in hinweis?.art == .erfolg }
            .sensoryFeedback(.error, trigger: hinweis?.id) { _, _ in hinweis?.art == .fehler }
    }

    private func zeile(_ h: DSHinweis) -> some View {
        HStack(spacing: DSAbstand.m) {
            Text(h.text)
                .font(.dsKlein)
                .frame(maxWidth: .infinity, alignment: .leading)
                .fixedSize(horizontal: false, vertical: true)
            if let aktion = h.rueckgaengig {
                Button("Rückgängig") {
                    aktion()
                    hinweis = nil
                }
                .font(.dsKlein.weight(.semibold))
                .dsTippflaeche()
            }
            if h.rueckgaengig != nil && (voiceOver || schalter) {
                Button("Schließen", systemImage: "xmark") { hinweis = nil }
                    .labelStyle(.iconOnly)
                    .dsTippflaeche()
            }
        }
        .padding(.horizontal, DSAbstand.l)
        .padding(.vertical, DSAbstand.s)
        .background(.regularMaterial, in: .ds(DSRadius.gross))
        .padding(.horizontal, DSAbstand.l)
        .padding(.bottom, DSAbstand.s)
    }
}
