import SwiftUI

/// Bewegung in DS-Apps: wenige, kurze Animationen an Stellen, die eine Beziehung erklären
/// (etwas kommt dazu, geht weg, wechselt den Ort). Bei "Bewegung reduzieren" wird daraus
/// ein schlichtes Einblenden (Apple HIG Motion/Accessibility).
public enum DSBewegung {
    /// Standard für Zustandswechsel in der Ansicht.
    public static let standard: Animation = .snappy(duration: 0.25)
    /// Für Dinge, die erscheinen oder verschwinden (Hinweis, Fehlerzeile).
    public static let erscheinen: Animation = .easeOut(duration: 0.2)
    /// Ersatz bei "Bewegung reduzieren".
    public static let reduziert: Animation = .linear(duration: 0.15)
}

public extension View {
    /// Wie `.animation(_:value:)`, respektiert aber "Bewegung reduzieren".
    func dsAnimation<V: Equatable>(_ animation: Animation = DSBewegung.standard, value: V) -> some View {
        modifier(DSAnimationModifier(animation: animation, wert: value))
    }
}

struct DSAnimationModifier<V: Equatable>: ViewModifier {
    let animation: Animation
    let wert: V
    @Environment(\.accessibilityReduceMotion) private var reduziert

    func body(content: Content) -> some View {
        content.animation(reduziert ? DSBewegung.reduziert : animation, value: wert) // ds-ok: das ist die DS-Hülle
    }
}

/// Für `withAnimation` außerhalb von Ansichten (z. B. in einer Aktion).
@MainActor
public func dsMitAnimation<Ergebnis>(_ animation: Animation = DSBewegung.standard, _ aenderung: () throws -> Ergebnis) rethrows -> Ergebnis {
    let reduziert = UIAccessibility.isReduceMotionEnabled
    return try withAnimation(reduziert ? DSBewegung.reduziert : animation, aenderung) // ds-ok: das ist die DS-Hülle
}
