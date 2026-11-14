import SwiftUI

/// Abschnitt „Dein Studio“ im Konto: Einstellungen, rechtliche Lage, Fragebogen, Abrechnungen (nur Provision über Stripe),
/// QR-Aufsteller (nur Inhaber), Bei Stripe ansehen (nur Inhaber, Stripe verbunden), Hilfe per WhatsApp.
struct StudioMehrAbschnitt: View {
    @Environment(AppState.self) private var app
    @State private var mehr = StudioMehrStore.shared
    @State private var stripeLaedt = false
    @State private var fehler: String?

    private var istInhaber: Bool { app.sitzung?.istInhaber ?? false }
    private var s: StudioMehr? { mehr.studio }

    static let whatsappNummer = "491624502375"

    static var whatsappURL: URL {
        var c = URLComponents(string: "https://wa.me/\(whatsappNummer)")!
        c.queryItems = [URLQueryItem(name: "text", value: Texte.Mehr.hilfeWhatsappNachricht)]
        return c.url!
    }

    var body: some View {
        Section {
            NavigationLink { EinstellungenView() } label: {
                zeile(Texte.Mehr.einstellungen, Texte.Mehr.einstellungenText, "gearshape")
            }
            NavigationLink { RechtView() } label: {
                zeile(Texte.Mehr.recht, rechtUnter, "scale.3d")
            }
            if istInhaber {
                NavigationLink { FragebogenView() } label: {
                    zeile(Texte.Mehr.fragebogen, s?.fragebogenAm.flatMap(Datum.tag).map(Texte.Mehr.fragebogenAm) ?? Texte.Mehr.fragebogenOffen, "list.clipboard")
                }
            }
            if s?.istProvision == true && s?.istStripeAbrechnung == true {
                NavigationLink { AbrechnungenView() } label: {
                    zeile(Texte.Mehr.abrechnungen, nil, "doc.text")
                }
            }
            if istInhaber {
                NavigationLink { AufstellerView() } label: {
                    zeile(Texte.Mehr.aufsteller, Texte.Mehr.aufstellerText, "qrcode")
                }
                .accessibilityIdentifier("aufsteller")
            }
            if istInhaber && s?.stripe?.verbunden == true {
                Button {
                    stripeOeffnen()
                } label: {
                    HStack {
                        zeile(Texte.Mehr.stripeAnsehen, Texte.Mehr.stripeAnsehenText, "building.columns")
                        if stripeLaedt { Spacer(); ProgressView() }
                    }
                }
                .disabled(stripeLaedt)
            }
            Link(destination: Self.whatsappURL) {
                zeile(Texte.Mehr.hilfeWhatsapp, Texte.Mehr.hilfeWhatsappText, "message")
            }
            .accessibilityHint("Öffnet WhatsApp")
            if let fehler { FehlerZeile(text: fehler) }
        } header: {
            Text(Texte.Mehr.abschnitt)
        } footer: {
            Text(Texte.Mehr.nichtInDerApp)
        }
        .task { await mehr.laden(wennAelterAls: 30) }
    }

    private var rechtUnter: String {
        if let r = s?.recht, r.aktuell == true, let d = Datum.tag(r.am) { return Texte.Mehr.rechtGelesen(d) }
        return Texte.Mehr.rechtOffen
    }

    private func zeile(_ titel: String, _ unter: String?, _ symbol: String) -> some View {
        Label {
            VStack(alignment: .leading, spacing: 2) {
                Text(titel).foregroundStyle(Color.tfTinte)
                if let unter { Text(unter).font(.dm(.footnote)).foregroundStyle(Color.tfLeise) }
            }
        } icon: {
            Image(systemName: symbol).foregroundStyle(Color.tfAkzent)
        }
    }

    /// Login-Link ins Stripe-Dashboard (einmal gültig, kurz) frisch holen und in Safari-Ansicht öffnen
    private func stripeOeffnen() {
        stripeLaedt = true
        fehler = nil
        Task {
            defer { stripeLaedt = false }
            do {
                SafariOeffner.oeffnen(try await APIClient.shared.stripeDashboardLink())
            } catch {
                fehler = fehlerText(error)
            }
        }
    }
}
