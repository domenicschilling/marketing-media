import SwiftUI
import UIKit

/// Farben einer DS-App.
///
/// Zwei Ebenen:
/// 1. **Markenpalette** der App (`DSPalette`): jede Farbe als Hell/Dunkel-Paar (optional mit
///    kräftigerer Variante für "Kontrast erhöhen"). Die Palette liefert ihre Prüfpaare selbst
///    (`kontrastPaare`), ein einziger Test prüft sie in hell, dunkel und erhöhtem Kontrast
///    (`DSKontrast.pruefe`). Keine Hex-Werte doppelt im Test abtippen.
/// 2. **Systemfarben** für alles, was keine Marke tragen muss (`DSSystemFarbe`).
///
/// Statusfarben (Erfolg, Warnung, Fehler) gehören in die Palette, nicht ins System:
/// Apples Orange und Grün liegen auf Weiß nur bei etwa 2,2:1 und erfüllen die 3:1 für
/// Symbole mit Bedeutung nicht.
///
/// Keine Verläufe, keine Deckkraft-Tricks für Text (`.opacity` auf Schrift ist verboten,
/// weil der Kontrast dann ungeprüft ist). Farbe trägt Bedeutung, nicht Dekoration.
public extension UIColor {
    /// Farbe mit Hell- und Dunkel-Variante, optional mit Varianten für "Kontrast erhöhen".
    static func ds(hell: UInt32, dunkel: UInt32, hellKontrast: UInt32? = nil, dunkelKontrast: UInt32? = nil) -> UIColor {
        UIColor { m in
            let hoch = m.accessibilityContrast == .high
            if m.userInterfaceStyle == .dark {
                return UIColor(hex: hoch ? (dunkelKontrast ?? dunkel) : dunkel) // ds-ok: Palettenbau
            }
            return UIColor(hex: hoch ? (hellKontrast ?? hell) : hell) // ds-ok: Palettenbau
        }
    }

    convenience init(hex: UInt32) {
        self.init(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: 1
        )
    }
}

/// Ein Paar, das einen Mindestkontrast halten muss (z. B. Text auf Grund ≥ 4,5).
public struct DSKontrastPaar: Sendable {
    public let name: String
    public let vorne: UIColor
    public let hinten: UIColor
    public let mindestens: Double

    public init(_ name: String, _ vorne: UIColor, auf hinten: UIColor, mindestens: Double) {
        self.name = name
        self.vorne = vorne
        self.hinten = hinten
        self.mindestens = mindestens
    }
}

/// Die Markenpalette, die jede DS-App selbst festlegt (eine Datei `Design/Palette.swift`).
/// Namen sind Rollen, keine Farbnamen: `grund`, nicht `creme`.
public protocol DSPalette: Sendable {
    var grund: Color { get }        // Bildschirmgrund
    var flaeche: Color { get }      // Fläche auf dem Grund (Gruppen, Felder)
    var text: Color { get }         // Haupttext, ≥ 4,5:1 (Ziel 7:1)
    var textLeise: Color { get }    // Zweittext, ≥ 4,5:1 auf grund und flaeche
    var linie: Color { get }        // Linien, Feldrahmen, ≥ 3:1
    var marke: Color { get }        // die eine Leitfarbe
    var aufMarke: Color { get }     // Text auf marke, ≥ 4,5:1
    var erfolg: Color { get }       // Status, nur mit Text/Symbol, ≥ 3:1 als Symbol
    var warnung: Color { get }
    var fehler: Color { get }

    /// Alle Paare, die der Kontrast-Test prüfen soll (mindestens die Kommentare oben).
    var kontrastPaare: [DSKontrastPaar] { get }
}

/// Systemfarben mit festen Rollennamen, damit Ansichten nie `UIColor.systemX` direkt nutzen.
public enum DSSystemFarbe {
    public static let grund = Color(uiColor: .systemBackground)
    public static let gruppenGrund = Color(uiColor: .systemGroupedBackground)
    public static let gruppenFlaeche = Color(uiColor: .secondarySystemGroupedBackground)
    public static let trenner = Color(uiColor: .separator)
}

/// Kontrast nach WCAG 2.x. Auf dem Hauptthread, weil UIKit-Merkmale dort gesetzt werden.
@MainActor
public enum DSKontrast {
    public static func verhaeltnis(_ a: UIColor, _ b: UIColor, stil: UIUserInterfaceStyle, hoch: Bool = false) -> Double {
        let merkmale = UITraitCollection { m in
            m.userInterfaceStyle = stil
            m.accessibilityContrast = hoch ? .high : .normal
        }
        let la = helligkeit(a.resolvedColor(with: merkmale))
        let lb = helligkeit(b.resolvedColor(with: merkmale))
        return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)
    }

    /// Prüft alle Paare in hell, dunkel, hell + Kontrast erhöhen, dunkel + Kontrast erhöhen.
    /// Gibt die Verstöße als lesbare Zeilen zurück (leer = alles gut).
    public static func pruefe(_ paare: [DSKontrastPaar]) -> [String] {
        var befunde: [String] = []
        for paar in paare {
            for (stil, hoch, name) in [(UIUserInterfaceStyle.light, false, "hell"), (.dark, false, "dunkel"),
                                       (.light, true, "hell+Kontrast"), (.dark, true, "dunkel+Kontrast")] {
                let wert = verhaeltnis(paar.vorne, paar.hinten, stil: stil, hoch: hoch)
                if wert < paar.mindestens {
                    befunde.append("\(paar.name) \(name): \(String(format: "%.2f", wert)):1 < \(paar.mindestens):1")
                }
            }
        }
        return befunde
    }

    nonisolated static func helligkeit(_ farbe: UIColor) -> Double {
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        farbe.getRed(&r, green: &g, blue: &b, alpha: &a)
        func kanal(_ c: CGFloat) -> Double {
            let c = Double(c)
            return c <= 0.03928 ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4)
        }
        return 0.2126 * kanal(r) + 0.7152 * kanal(g) + 0.0722 * kanal(b)
    }
}
