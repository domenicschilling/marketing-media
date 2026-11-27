import SwiftUI

/// Stripe im Konto (Abnahme 1.1, Nr. 16): eine Zeile „Stripe · Alles bereit ✓ ›“, die Einzelheiten auf dieser Unterseite.
enum StripeZustand {
    case test, bereit, fehlt

    init(studio: Studio?) {
        let st = studio?.stripe
        if studio?.istTestmodus == true && st?.verbunden != true {
            self = .test
        } else if st?.verbunden == true && st?.freigegeben == true && st?.auszahlungen == true {
            self = .bereit
        } else {
            self = .fehlt
        }
    }

    var text: String {
        switch self {
        case .test: Texte.AbnahmeG5.stripeTest
        case .bereit: Texte.AbnahmeG5.stripeBereit
        case .fehlt: Texte.AbnahmeG5.stripeFehlt
        }
    }
}

/// Zeile im Konto: „Stripe“ links, Zustand und Zeichen rechts. Bei großer Schrift untereinander.
struct StripeKontoZeile: View {
    let zustand: StripeZustand

    private var zeichen: some View {
        Group {
            switch zustand {
            case .bereit: Image(systemName: "checkmark.circle.fill").foregroundStyle(Color.tfGruen)
            case .fehlt: Image(systemName: "exclamationmark.circle.fill").foregroundStyle(Color.tfRot)
            case .test: Image(systemName: "testtube.2").foregroundStyle(Color.tfAkzent)
            }
        }
        .accessibilityHidden(true)
    }

    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: 8) {
                Text(Texte.AbnahmeG5.stripe).foregroundStyle(Color.tfLeise)
                Spacer(minLength: 12)
                Text(zustand.text).foregroundStyle(Color.tfTinte)
                zeichen
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(Texte.AbnahmeG5.stripe).foregroundStyle(Color.tfLeise)
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    zeichen
                    Text(zustand.text).foregroundStyle(Color.tfTinte)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
        }
        .font(.dm(.body))
        .dynamicTypeSize(...DynamicTypeSize.accessibility2)  // ds-ok: Zeilentitel, Wortbruch vermeiden
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Texte.AbnahmeG5.stripeZeileLabel(zustand.text))
        .accessibilityIdentifier(zustand == .test ? "stripe-testmodus" : "stripe-zeile")
    }
}

/// Unterseite mit den drei Punkten, „Neu prüfen“ und (falls nötig) dem Weg zur Stripe-Einrichtung
struct StripeStatusView: View {
    @Environment(PortalStore.self) private var portal
    @Environment(\.dynamicTypeSize) private var schrift
    @Environment(\.openURL) private var openURL
    @State private var prueft = false
    @State private var fehler: String?

    private var studio: Studio? { portal.studio }

    var body: some View {
        let st = studio?.stripe
        let zustand = StripeZustand(studio: studio)
        TFListe {
            Section {
                if zustand == .test {
                    Label(Texte.Konto.stripeTestmodus, systemImage: "testtube.2")
                        .foregroundStyle(Color.tfTinte)
                } else {
                    statusZeile(Texte.Konto.stripeVerbunden, st?.verbunden == true)
                    statusZeile(Texte.Konto.stripeFreigegeben, st?.freigegeben == true)
                    statusZeile(Texte.Konto.stripeAuszahlungen, st?.auszahlungen == true)
                }
            } footer: {
                ListenFuss(zustand == .test ? Texte.AbnahmeG5.stripeTestHinweis : Texte.AbnahmeG5.stripeSeiteHinweis)
            }
            Section {
                Button {
                    pruefen()
                } label: {
                    HStack {
                        Label(Texte.Konto.neuPruefen, systemImage: "arrow.clockwise")
                        if prueft { Spacer(); ProgressView() }
                    }
                }
                .foregroundStyle(Color.tfTinte)
                .disabled(prueft)
                if let fehler { FehlerZeile(text: Texte.Konto11.nichtGeprueft(fehler)) }
                if let u = studio?.connectUrl.flatMap(URL.init(string:)), st?.freigegeben != true, studio?.istTestmodus != true {
                    Button { openURL(u) } label: { Label(Texte.Kasse.stripeOeffnen, systemImage: "safari") }
                        .foregroundStyle(Color.tfTinte)
                }
            }
        }
        .font(.dm(.body))
        .scrollContentBackground(.hidden)
        .tfHintergrund()
        .navigationTitle(Texte.AbnahmeG5.stripe)
        .navigationBarTitleDisplayMode(.inline)
    }

    /// Passt Titel und Häkchen nicht nebeneinander (große Schrift), steht das Zeichen vorn in fester Spalte
    private func statusZeile(_ titel: String, _ ok: Bool) -> some View {
        let zeichen = Image(systemName: ok ? "checkmark.circle.fill" : "xmark.circle")
            .foregroundStyle(ok ? Color.tfGruen : Color.tfLeise)
        return Group {
            if schrift.isAccessibilitySize {
                HStack(alignment: .firstTextBaseline, spacing: 10) {
                    zeichen.frame(width: 28)
                    Text(titel).foregroundStyle(Color.tfTinte)
                        .fixedSize(horizontal: false, vertical: true)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            } else {
                HStack {
                    Text(titel).foregroundStyle(Color.tfTinte)
                    Spacer(minLength: 12)
                    zeichen
                }
            }
        }
        // Höchstens AX2 wie zeilenLabel im Konto: sonst bricht „Auszahlungen“ mitten im Wort (Abnahme 1.1, Nr. 5)
        .dynamicTypeSize(...DynamicTypeSize.accessibility2)  // ds-ok: Zeilentitel, Wortbruch vermeiden
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(titel): \(ok ? Texte.Allgemein.ja : Texte.Allgemein.nein)")
    }

    private func pruefen() {
        prueft = true
        fehler = nil
        Task {
            defer { prueft = false }
            do {
                _ = try await APIClient.shared.kontoStatus()
                await portal.laden()
            } catch {
                fehler = fehlerText(error)
            }
        }
    }
}
