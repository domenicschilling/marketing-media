import SwiftUI

/// Jeder Bildschirm, der Daten lädt, hat genau diese vier Zustände
/// (referenzen/04-bildschirme.md, Abschnitt "Zustände").
public enum DSZustand<Wert> {
    case laedt
    case fertig(Wert)
    case leer
    case fehler(String)
}

extension DSZustand: Equatable where Wert: Equatable {}

/// Text für einen leeren Zustand: sagt, was hier hinkommt, und was man jetzt tun kann.
public struct DSLeerText: Sendable {
    public let titel: String
    public let erklaerung: String
    public let symbol: String
    public let aktion: String?

    public init(titel: String, erklaerung: String, symbol: String, aktion: String? = nil) {
        self.titel = titel
        self.erklaerung = erklaerung
        self.symbol = symbol
        self.aktion = aktion
    }
}

/// Hinweis: `ContentUnavailableView` nutzt Systemschrift und Systemfarben. Weicht der `grund`
/// der Palette stark vom Systemhintergrund ab, Kontrast des Erklärtexts im Rundgang prüfen.
/// Symbol beim Fehler passend zur Ursache wählen (Server: Dreieck, Netz: `wifi.exclamationmark`).
/// Ohne Netz mit gespeichertem Stand NICHT `.fehler` zeigen, sondern `.fertig` + `veraltetSeit:`.
///
/// Zeigt Laden, Leer und Fehler einheitlich mit Systemmitteln (`ContentUnavailableView`)
/// und den fertigen Inhalt über `inhalt`.
public struct DSZustandsAnsicht<Wert, Inhalt: View>: View {
    private let zustand: DSZustand<Wert>
    private let leer: DSLeerText
    private let leerAktion: (() -> Void)?
    private let fehlerSymbol: String
    private let fehlerTitel: String
    private let veraltetSeit: Date?
    private let nochmal: () async -> Void
    private let inhalt: (Wert) -> Inhalt

    public init(
        _ zustand: DSZustand<Wert>,
        leer: DSLeerText,
        leerAktion: (() -> Void)? = nil,
        fehlerSymbol: String = "exclamationmark.triangle",
        fehlerTitel: String = "Das hat nicht geklappt",
        veraltetSeit: Date? = nil,
        nochmal: @escaping () async -> Void,
        @ViewBuilder inhalt: @escaping (Wert) -> Inhalt
    ) {
        self.zustand = zustand
        self.leer = leer
        self.leerAktion = leerAktion
        self.fehlerSymbol = fehlerSymbol
        self.fehlerTitel = fehlerTitel
        self.veraltetSeit = veraltetSeit
        self.nochmal = nochmal
        self.inhalt = inhalt
    }

    public var body: some View {
        switch zustand {
        case .laedt:
            ProgressView()
                .controlSize(.large)
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .accessibilityLabel(Text("Wird geladen"))
        case .fertig(let wert):
            // Ohne Netz oder Aktualisieren fehlgeschlagen: Inhalt bleibt, Stand-Zeile darüber.
            // Beim Aktualisieren den Zustand NICHT auf .laedt setzen (sonst verschwindet der Inhalt),
            // sondern .refreshable bzw. einen kleinen Ladehinweis nutzen.
            VStack(alignment: .leading, spacing: DSAbstand.m) {
                if let veraltetSeit {
                    DSStandZeile(stand: veraltetSeit, nochmal: nochmal)
                }
                inhalt(wert)
            }
        case .leer:
            ContentUnavailableView {
                Label(leer.titel, systemImage: leer.symbol)
            } description: {
                Text(leer.erklaerung)
            } actions: {
                if let aktion = leer.aktion, let leerAktion {
                    Button(aktion, action: leerAktion)
                        .buttonStyle(.borderedProminent)
                        .controlSize(.large)
                }
            }
        case .fehler(let meldung):
            ContentUnavailableView {
                Label(fehlerTitel, systemImage: fehlerSymbol)
            } description: {
                Text(meldung)
            } actions: {
                // Im Fehlerzustand ist "Nochmal versuchen" die Hauptaktion, deshalb kräftig
                Button("Nochmal versuchen") {
                    Task { await nochmal() }
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
            }
        }
    }
}

/// Zeile über dem Inhalt, wenn er nicht aktuell ist (ohne Netz oder Aktualisieren fehlgeschlagen):
/// "Ohne Internet · Stand von 14:05" mit "Nochmal". Muster aus Tattoofin 1.1 (`AktualisierenFehlerZeile`).
public struct DSStandZeile: View {
    private let grund: String
    private let stand: Date
    private let nochmal: () async -> Void

    public init(_ grund: String = "Ohne Internet", stand: Date, nochmal: @escaping () async -> Void) {
        self.grund = grund
        self.stand = stand
        self.nochmal = nochmal
    }

    public var body: some View {
        // Normal nebeneinander, bei großer Schrift untereinander (nichts läuft über)
        ViewThatFits(in: .horizontal) {
            HStack(alignment: .center, spacing: DSAbstand.s) {
                text.frame(maxWidth: .infinity, alignment: .leading)
                knopf
            }
            VStack(alignment: .leading, spacing: DSAbstand.s) {
                text
                knopf
            }
        }
        .font(.dsKlein)
        .padding(.leading, DSAbstand.m)
        .padding(.trailing, DSAbstand.s)
        .padding(.vertical, DSAbstand.xs)
        .background(.fill.tertiary, in: .ds(DSRadius.mittel))
        .padding(.horizontal, DSAbstand.l)
        .accessibilityElement(children: .contain)
    }

    private var text: some View {
        Label {
            Text("\(grund) · Stand von \(stand.formatted(date: .omitted, time: .shortened))")
                .fixedSize(horizontal: false, vertical: true)
        } icon: {
            Image(systemName: "wifi.slash")
        }
    }

    private var knopf: some View {
        Button("Nochmal versuchen") { Task { await nochmal() } }
            .buttonStyle(.bordered)
    }
}
