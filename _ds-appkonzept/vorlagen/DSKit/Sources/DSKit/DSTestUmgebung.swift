import SwiftUI

/// Startargumente für Rundgang-Tests (referenzen/08-technik.md, "Testbarkeit").
/// Wirken nur in Debug-Builds; im App-Store-Build ist alles aus.
///
///   -ds-demo            Demodaten, kein Server (die App fragt `DSTestUmgebung.demo` ab)
///   -ds-schrift AX3     Dynamic Type auf accessibility3 (auch AX1…AX5, L, XL, XXL, XXXL)
///   -ds-dunkel          Dunkelmodus
///   -ds-zuruecksetzen   gespeicherte Sitzung und Entwürfe löschen (die App setzt das um)
///   -ds-apibase <url>   anderer Server, z. B. lokaler Mock-Server mit Netz-Schalter
public enum DSTestUmgebung {
    #if DEBUG
    static let argumente = ProcessInfo.processInfo.arguments
    #else
    static let argumente: [String] = []
    #endif

    public static var demo: Bool { argumente.contains("-ds-demo") }
    public static var zuruecksetzen: Bool { argumente.contains("-ds-zuruecksetzen") }
    public static var dunkel: Bool { argumente.contains("-ds-dunkel") }

    public static var apiBase: URL? {
        guard let i = argumente.firstIndex(of: "-ds-apibase"), i + 1 < argumente.count else { return nil }
        return URL(string: argumente[i + 1])
    }

    public static var schrift: DynamicTypeSize? {
        guard let i = argumente.firstIndex(of: "-ds-schrift"), i + 1 < argumente.count else { return nil }
        switch argumente[i + 1].uppercased() {
        case "L": return .large
        case "XL": return .xLarge
        case "XXL": return .xxLarge
        case "XXXL": return .xxxLarge
        case "AX1": return .accessibility1
        case "AX2": return .accessibility2
        case "AX3": return .accessibility3
        case "AX4": return .accessibility4
        case "AX5": return .accessibility5
        default: return nil
        }
    }
}

public extension View {
    /// An die Wurzelansicht der App hängen: `WindowGroup { Wurzel().dsTestUmgebung() }`.
    @ViewBuilder
    func dsTestUmgebung() -> some View {
        let mitSchrift = Group {
            if let groesse = DSTestUmgebung.schrift {
                self.dynamicTypeSize(groesse)
            } else {
                self
            }
        }
        if DSTestUmgebung.dunkel {
            mitSchrift.preferredColorScheme(.dark)
        } else {
            mitSchrift
        }
    }
}
