import SwiftUI
import SafariServices

/// Monatsabrechnungen (nur Studios mit Provision, deren Paket über Stripe abgerechnet wird). Wie portal.html „Abrechnungen“.
struct AbrechnungenView: View {
    @State private var mehr = StudioMehrStore.shared
    @State private var rechnung: SafariZiel?

    private var prozent: String {
        let p = mehr.studio?.provisionProzent ?? mehr.config.provisionProzent ?? 0
        return p.rounded() == p ? String(Int(p)) : p.formatted(.number.precision(.fractionLength(0...1)).locale(Locale(identifier: "de_DE")))
    }

    var body: some View {
        Group {
            if mehr.studio != nil {
                liste
            } else if let f = mehr.fehler {
                FehlerAnsicht(text: f) { Task { await mehr.laden() } }
            } else {
                LadeAnsicht()
            }
        }
        .tfHintergrund()
        .navigationTitle(Texte.Abrechnungen.titel)
        .navigationBarTitleDisplayMode(.inline)
        .task { await mehr.laden() }
        .sheet(item: $rechnung) { StudioSafariAnsicht(url: $0.url).ignoresSafeArea() }
    }

    private var liste: some View {
        TFListe {
            if mehr.abrechnungen.isEmpty {
                LeerAnsicht(titel: Texte.Abrechnungen.titel, text: Texte.Abrechnungen.leer, symbol: "doc.text")
                    .listRowBackground(Color.clear)
            } else {
                Section {
                    ForEach(mehr.abrechnungen) { a in zeile(a) }
                } footer: {
                    Text(Texte.Abrechnungen.fuss).font(.dm(.footnote))
                }
            }
        }
        .font(.dm(.body))
        .scrollContentBackground(.hidden)
        .refreshable { await mehr.laden() }
    }

    private func zeile(_ a: Abrechnung) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline) {
                Text(a.monatText).font(.dm(.headline)).foregroundStyle(Color.tfTinte)
                Spacer()
                Text(Texte.Abrechnungen.zahlungen(a.anzahl)).font(.dm(.subheadline)).foregroundStyle(Color.tfLeise)
            }
            WertZeile(titel: Texte.Abrechnungen.umsatz, wert: Euro.text(a.umsatzCent ?? 0))
            WertZeile(titel: Texte.Abrechnungen.tattoofin(prozent), wert: Euro.text(a.provisionBruttoCent ?? 0))
            WertZeile(titel: Texte.Abrechnungen.anDich, wert: Euro.text(a.anDichCent))
            if let s = a.rechnungUrl, let u = URL(string: s), u.scheme == "https" {
                Button {
                    rechnung = SafariZiel(url: u)
                } label: {
                    Label(Texte.Abrechnungen.rechnung(a.rechnungNr), systemImage: "doc.text")
                        .font(.dm(.subheadline, weight: .semibold))
                }
                .foregroundStyle(Color.tfAkzent)
                .buttonStyle(.borderless)
            }
        }
        .padding(.vertical, 4)
    }
}

/// Adresse für eine Safari-Ansicht (als Sheet-Element)
struct SafariZiel: Identifiable, Hashable {
    let url: URL
    var id: String { url.absoluteString }
}

/// SFSafariViewController (Stripe-Ansicht, Rechnungen): eigene Seite mit Teilen/Drucken, ohne Zugriff auf App-Daten
struct StudioSafariAnsicht: UIViewControllerRepresentable {
    let url: URL

    func makeUIViewController(context: Context) -> SFSafariViewController {
        let k = SFSafariViewController.Configuration()
        k.entersReaderIfAvailable = false
        k.barCollapsingEnabled = true
        let vc = SFSafariViewController(url: url, configuration: k)
        vc.preferredControlTintColor = UIColor(Color.tfAkzent)
        vc.dismissButtonStyle = .done
        return vc
    }

    func updateUIViewController(_ vc: SFSafariViewController, context: Context) {}
}

/// Safari-Ansicht direkt über UIKit zeigen (für Knöpfe in Listen-Abschnitten: Ein .sheet an einer Listenzeile kann SwiftUI beim
/// Neuzeichnen der Liste wieder schließen)
@MainActor
enum SafariOeffner {
    static func oeffnen(_ url: URL) {
        guard let szene = UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first(where: { $0.activationState == .foregroundActive })
                ?? UIApplication.shared.connectedScenes.compactMap({ $0 as? UIWindowScene }).first,
              var oben = szene.windows.first(where: \.isKeyWindow)?.rootViewController ?? szene.windows.first?.rootViewController else { return }
        while let p = oben.presentedViewController { oben = p }
        let k = SFSafariViewController.Configuration()
        k.entersReaderIfAvailable = false
        let vc = SFSafariViewController(url: url, configuration: k)
        vc.preferredControlTintColor = UIColor(Color.tfAkzent)
        vc.dismissButtonStyle = .done
        oben.present(vc, animated: true)
    }
}
