import SwiftUI
import CoreText

// Gemeinsame Bausteine für Listen, Schalter und Eingabefelder (Gestaltung 1.1): eine Schrift (DM Sans), eine Textfarbe (tfTinte).

/// Schalter in Listen: Beschriftung in DM Sans und tfTinte statt SF Pro Schwarz.
/// Eigene Farben/Schriften an der Beschriftung (z. B. Unterzeile in tfLeise) bleiben, weil sie näher am Text sitzen.
struct TFToggleStil: ToggleStyle {
    func makeBody(configuration: Configuration) -> some View {
        Toggle(isOn: configuration.$isOn) {
            configuration.label
                .font(.dm(.body))
                .foregroundStyle(Color.tfTinte)
        }
        // Fester Systemstil darunter, sonst ruft sich dieser Stil selbst wieder auf
        .toggleStyle(.switch)
    }
}

/// Eingabefeld im Stil der Anmeldung: Kartenfläche, runder Rahmen mit genug Kontrast (tfFeldRahmen, ≥ 3:1)
struct TFTextfeldStil: ViewModifier {
    func body(content: Content) -> some View {
        content
            .font(.dm(.body))
            .foregroundStyle(Color.tfTinte)
            .padding(14)
            .background(Color.tfKarte, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).stroke(Color.tfFeldRahmen, lineWidth: 1.5))
    }
}

extension View {
    func tfTextfeld() -> some View { modifier(TFTextfeldStil()) }
}

/// Listenzeile, die etwas auslöst (Symbol, Text, Pfeil rechts), damit sie wie die übrigen Zeilen aussieht und als Aktion erkennbar ist
struct TFAktionsZeile: View {
    let titel: String
    let symbol: String

    var body: some View {
        HStack(spacing: 8) {
            Label {
                Text(titel).foregroundStyle(Color.tfTinte)
            } icon: {
                Image(systemName: symbol).foregroundStyle(Color.tfAkzent)
                    .frame(width: 28)  // feste Symbolspalte wie in den übrigen Konto-Zeilen
            }
            Spacer(minLength: 0)
            Image(systemName: "chevron.right")
                .font(.dm(.footnote, weight: .semibold))
                .foregroundStyle(Color.tfLeise)
                .accessibilityHidden(true)
        }
        .contentShape(Rectangle())
    }
}

/// UIKit-Leisten (Navigationstitel, Segmente, Tab-Leiste) in DM Sans und Markenfarben. Einmal beim App-Start aufrufen.
enum TFLeistenStil {
    @MainActor
    static func einrichten() {
        let tinte = UIColor(Color.tfTinte)
        let leise = UIColor(Color.tfLeise)
        let akzent = UIColor(Color.tfAkzent)

        // Navigationstitel
        let titel: [NSAttributedString.Key: Any] = [.font: schrift(17, .semibold), .foregroundColor: tinte]
        let grossTitel: [NSAttributedString.Key: Any] = [.font: schrift(34, .bold), .foregroundColor: tinte]
        let nav = UINavigationBarAppearance()
        nav.configureWithDefaultBackground()
        nav.titleTextAttributes = titel
        nav.largeTitleTextAttributes = grossTitel
        let navOben = UINavigationBarAppearance()
        navOben.configureWithTransparentBackground()
        navOben.titleTextAttributes = titel
        navOben.largeTitleTextAttributes = grossTitel
        let navLeiste = UINavigationBar.appearance()
        navLeiste.standardAppearance = nav
        navLeiste.compactAppearance = nav
        navLeiste.scrollEdgeAppearance = navOben
        navLeiste.compactScrollEdgeAppearance = navOben

        // Segmente
        let segment = UISegmentedControl.appearance()
        segment.setTitleTextAttributes([.font: schrift(15, .medium), .foregroundColor: tinte], for: .normal)
        segment.setTitleTextAttributes([.font: schrift(15, .semibold), .foregroundColor: tinte], for: .selected)

        // Tab-Leiste: nicht gewählte Symbole in tfLeise statt Reinschwarz, gewählte in tfAkzent
        let eintrag = UITabBarItemAppearance()
        let tabSchrift = schrift(10, .medium)
        eintrag.normal.iconColor = leise
        eintrag.normal.titleTextAttributes = [.font: tabSchrift, .foregroundColor: leise]
        eintrag.selected.iconColor = akzent
        eintrag.selected.titleTextAttributes = [.font: tabSchrift, .foregroundColor: akzent]
        func tabStil(durchsichtig: Bool) -> UITabBarAppearance {
            let a = UITabBarAppearance()
            if durchsichtig { a.configureWithTransparentBackground() } else { a.configureWithDefaultBackground() }
            a.stackedLayoutAppearance = eintrag
            a.inlineLayoutAppearance = eintrag
            a.compactInlineLayoutAppearance = eintrag
            return a
        }
        let tabLeiste = UITabBar.appearance()
        tabLeiste.standardAppearance = tabStil(durchsichtig: false)
        // Wie iOS-Standard: am Listenende ohne Fläche
        tabLeiste.scrollEdgeAppearance = tabStil(durchsichtig: true)
    }

    /// DM Sans (variable Schrift) in der gewünschten Stärke. Feste Größe wie bei den Systemleisten: Titel, Tab-Leiste und
    /// Segmente wachsen in iOS nicht mit Dynamic Type (dort hilft die Großansicht beim langen Drücken), sonst sprengt AX5 die Leisten.
    private static func schrift(_ groesse: CGFloat, _ staerke: UIFont.Weight) -> UIFont {
        guard let basis = UIFont(name: "DMSans9pt-Regular", size: groesse) else { return .systemFont(ofSize: groesse, weight: staerke) }
        // Variable Schrift: die Stärke über die wght-Achse setzen (ein traits-Gewicht greift bei eigenen Schriften nicht)
        let wght: CGFloat
        switch staerke {
        case .bold: wght = 700
        case .semibold: wght = 600
        case .medium: wght = 500
        default: wght = 400
        }
        let achse = UIFontDescriptor.AttributeName(rawValue: kCTFontVariationAttribute as String)
        let mitStaerke = basis.fontDescriptor.addingAttributes([achse: [0x7767_6874: wght]])
        return UIFont(descriptor: mitStaerke, size: groesse)
    }
}
