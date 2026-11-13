import SwiftUI
import UIKit

// Marke: Gelb #fbb316, Blau #1f3d5c, Luckiest Guy (Überschriften) + DM Sans (Text).
// Kontrast: Gelb nie als Textfarbe auf Weiß. Text auf Gelb ist immer Blau #1f3d5c.

extension UIColor {
    convenience init(hex: UInt32) {
        self.init(red: CGFloat((hex >> 16) & 0xFF) / 255, green: CGFloat((hex >> 8) & 0xFF) / 255,
                  blue: CGFloat(hex & 0xFF) / 255, alpha: 1)
    }

    static func hellDunkel(_ hell: UInt32, _ dunkel: UInt32) -> UIColor {
        UIColor { $0.userInterfaceStyle == .dark ? UIColor(hex: dunkel) : UIColor(hex: hell) }
    }
}

extension Color {
    /// Markengelb (Flächen, Knöpfe). Nie als Textfarbe auf hellem Grund.
    static let tfGelb = Color(UIColor(hex: 0xFBB316))
    /// Markenblau, fest (Text auf Gelb, Flächen)
    static let tfBlau = Color(UIColor(hex: 0x1F3D5C))
    /// Haupttext: hell Blau, dunkel fast Weiß
    static let tfTinte = Color(UIColor.hellDunkel(0x1F3D5C, 0xEEF3F8))
    /// Nebentext (≥ 4,5:1 auf Hintergrund und Karte)
    static let tfLeise = Color(UIColor.hellDunkel(0x4A5D72, 0xA9BBCE))
    static let tfHintergrund = Color(UIColor.hellDunkel(0xFFF9EC, 0x0E1B29))
    static let tfKarte = Color(UIColor.hellDunkel(0xFFFFFF, 0x172B40))
    static let tfLinie = Color(UIColor.hellDunkel(0xE6DCC6, 0x2A4460))
    /// Akzent für Text/Symbole: hell Blau, dunkel Gelb (Gelb auf Dunkelblau ist kontrastreich)
    static let tfAkzent = Color(UIColor.hellDunkel(0x1F3D5C, 0xFBB316))
    static let tfGruen = Color(UIColor.hellDunkel(0x1B7343, 0x5BD69A))
    static let tfRot = Color(UIColor.hellDunkel(0xB3261E, 0xFF8F86))
    static let tfOrange = Color(UIColor.hellDunkel(0x8A4B00, 0xFFC266))
    /// Helle Gelb-Fläche für Hinweise (Text darauf: tfBlau)
    static let tfGelbHell = Color(UIColor.hellDunkel(0xFFE7B0, 0xFBB316))
}

extension Font {
    /// Luckiest Guy für Überschriften (wächst mit Dynamic Type)
    static func luckiest(_ groesse: CGFloat, relativeTo stil: Font.TextStyle = .title) -> Font {
        .custom("LuckiestGuy-Regular", size: groesse, relativeTo: stil)
    }

    /// DM Sans für Text, mit Dynamic Type (relativeTo:)
    static func dm(_ stil: Font.TextStyle, weight: Font.Weight = .regular) -> Font {
        .custom("DMSans9pt-Regular", size: basisGroesse(stil), relativeTo: stil).weight(weight)
    }

    static func dm(_ groesse: CGFloat, relativeTo stil: Font.TextStyle, weight: Font.Weight = .regular) -> Font {
        .custom("DMSans9pt-Regular", size: groesse, relativeTo: stil).weight(weight)
    }

    private static func basisGroesse(_ stil: Font.TextStyle) -> CGFloat {
        switch stil {
        case .largeTitle: 34
        case .title: 28
        case .title2: 22
        case .title3: 20
        case .headline: 17
        case .body: 17
        case .callout: 16
        case .subheadline: 15
        case .footnote: 13
        case .caption: 12
        case .caption2: 11
        default: 17
        }
    }
}

// MARK: - Knöpfe

/// Hauptknopf: Gelb mit blauer Schrift
struct HauptKnopfStil: ButtonStyle {
    @Environment(\.isEnabled) private var aktiv

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.dm(.headline, weight: .bold))
            .multilineTextAlignment(.center)
            .foregroundStyle(Color.tfBlau.opacity(aktiv ? 1 : 0.55))
            .frame(maxWidth: .infinity, minHeight: 54)
            .padding(.horizontal, 16)
            .padding(.vertical, 4)
            .background(Color.tfGelb.opacity(aktiv ? 1 : 0.45), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Color.tfBlau.opacity(aktiv ? 0.9 : 0.35), lineWidth: 2))
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

/// Zweitknopf: Umriss
struct ZweitKnopfStil: ButtonStyle {
    var farbe: Color = .tfTinte

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.dm(.body, weight: .semibold))
            .multilineTextAlignment(.center)
            .foregroundStyle(farbe)
            .frame(maxWidth: .infinity, minHeight: 48)
            .padding(.horizontal, 14)
            .padding(.vertical, 2)
            .background(Color.tfKarte, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).stroke(farbe.opacity(0.5), lineWidth: 1.5))
            .opacity(configuration.isPressed ? 0.7 : 1)
    }
}

extension ButtonStyle where Self == HauptKnopfStil {
    static var haupt: HauptKnopfStil { HauptKnopfStil() }
}

extension ButtonStyle where Self == ZweitKnopfStil {
    static var zweit: ZweitKnopfStil { ZweitKnopfStil() }
    static var gefahr: ZweitKnopfStil { ZweitKnopfStil(farbe: .tfRot) }
}

// MARK: - Karten, Überschriften

struct KarteModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.tfKarte, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).stroke(Color.tfLinie, lineWidth: 1))
    }
}

extension View {
    func karte() -> some View { modifier(KarteModifier()) }

    /// Hintergrund der Bildschirme
    func tfHintergrund() -> some View {
        background(Color.tfHintergrund.ignoresSafeArea())
    }
}

/// Große Überschrift in Luckiest Guy
struct Ueberschrift: View {
    let text: String
    var groesse: CGFloat = 30

    init(_ text: String, groesse: CGFloat = 30) {
        self.text = text
        self.groesse = groesse
    }

    var body: some View {
        Text(text)
            .font(.luckiest(groesse, relativeTo: .title))
            .foregroundStyle(Color.tfTinte)
            .fixedSize(horizontal: false, vertical: true)
            .accessibilityAddTraits(.isHeader)
    }
}
