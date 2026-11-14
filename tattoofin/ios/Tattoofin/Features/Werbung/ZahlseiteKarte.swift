import SafariServices
import SwiftUI

/// Deine Zahlseite: QR-Code, Link kopieren/teilen, QR als Bild in Fotos speichern, Zahlseite ansehen, „steht an der Theke“ abhaken.
struct ZahlseiteKarte: View {
    let zahlseite: String
    let firma: String

    @Environment(WerbungStore.self) private var werbung
    @State private var ansehen: URL?
    @State private var arbeitet = false
    @State private var fehler: String?
    @State private var meldung: String?

    private var anDerTheke: Binding<Bool> {
        Binding(get: { werbung.checkliste.theke != nil },
                set: { neu in Task { await werbung.abhaken("theke", neu) } })
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(WerbungTexte.zahlseiteTitel).font(.luckiest(24, relativeTo: .title2)).foregroundStyle(Color.tfTinte)
                .accessibilityAddTraits(.isHeader)
            Text(WerbungTexte.zahlseiteText).font(.dm(.subheadline)).foregroundStyle(Color.tfLeise)
                .fixedSize(horizontal: false, vertical: true)

            QRCodeView(inhalt: zahlseite, beschreibung: WerbungTexte.qrLabel)
                .frame(maxWidth: 240)
                .frame(maxWidth: .infinity)

            Text(zahlseite.replacingOccurrences(of: "https://", with: ""))
                .font(.dm(.footnote, weight: .semibold))
                .foregroundStyle(Color.tfTinte)
                .textSelection(.enabled)
                .frame(maxWidth: .infinity)
                .multilineTextAlignment(.center)

            Button { qrSpeichern() } label: {
                if arbeitet { ProgressView().tint(Color.tfBlau) } else { Label(WerbungTexte.qrSpeichern, systemImage: "square.and.arrow.down") }
            }
            .buttonStyle(.haupt)
            .disabled(arbeitet)

            KnopfReihe {
                Button {
                    UIPasteboard.general.string = zahlseite
                    kurzZeigen(WerbungTexte.kopiert, in: $meldung)
                } label: { Label(WerbungTexte.linkKopieren, systemImage: "doc.on.doc") }
                    .buttonStyle(.zweit)
                if let u = URL(string: zahlseite) {
                    ShareLink(item: u) { Label(WerbungTexte.teilen, systemImage: "square.and.arrow.up") }
                        .buttonStyle(.zweit)
                }
            }
            if let u = URL(string: zahlseite) {
                Button { ansehen = u } label: { Label(WerbungTexte.zahlseiteAnsehen, systemImage: "safari") }
                    .buttonStyle(.zweit)
            }

            Toggle(isOn: anDerTheke) {
                Text(WerbungTexte.theke).font(.dm(.body, weight: .semibold)).foregroundStyle(Color.tfTinte)
            }
            .tint(Color.tfGruen)

            if let fehler { FehlerZeile(text: fehler) }
            RueckmeldungsText(text: meldung)
        }
        .karte()
        .sheet(item: Binding(get: { ansehen.map(WebZiel.init) }, set: { ansehen = $0?.url })) { z in
            SafariFenster(url: z.url).ignoresSafeArea()
        }
    }

    /// QR-Code als PNG (1200 px, weißer Rand) in Fotos
    private func qrSpeichern() {
        arbeitet = true
        fehler = nil
        Task {
            defer { arbeitet = false }
            guard let png = QRBild.png(zahlseite, kante: 1200) else {
                fehler = WerbungTexte.fotosFehler
                return
            }
            do {
                try await FotoSpeicher.bilder([png])
                kurzZeigen(WerbungTexte.gespeichert, in: $meldung)
            } catch {
                fehler = FotoSpeicher.text(error)
            }
        }
    }
}

/// QR-Code als PNG mit weißem Rand (zum Ausdrucken)
enum QRBild {
    @MainActor
    static func png(_ inhalt: String, kante: CGFloat) -> Data? {
        guard let qr = QRErzeuger.bild(inhalt, skala: 20) else { return nil }
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = true
        let r = UIGraphicsImageRenderer(size: CGSize(width: kante, height: kante), format: format)
        let rand = kante * 0.06
        let bild = r.image { ctx in
            UIColor.white.setFill()
            ctx.fill(CGRect(x: 0, y: 0, width: kante, height: kante))
            ctx.cgContext.interpolationQuality = .none
            qr.draw(in: CGRect(x: rand, y: rand, width: kante - 2 * rand, height: kante - 2 * rand))
        }
        return bild.pngData()
    }
}

/// Druckvorlagen aus dem Studio Kit: öffnen im Safari-Fenster der App (dort Teilen → Drucken oder als PDF sichern)
struct DruckmaterialKarte: View {
    let material: [DruckMaterial]

    @Environment(WerbungStore.self) private var werbung
    @State private var offen: URL?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(WerbungTexte.druckTitel).font(.luckiest(24, relativeTo: .title2)).foregroundStyle(Color.tfTinte)
                .accessibilityAddTraits(.isHeader)
            Text(WerbungTexte.druckText).font(.dm(.subheadline)).foregroundStyle(Color.tfLeise)
                .fixedSize(horizontal: false, vertical: true)
            VStack(spacing: 0) {
                ForEach(material) { m in
                    Button { offen = URL(string: m.url) } label: {
                        HStack(spacing: 12) {
                            Image(systemName: "printer").foregroundStyle(Color.tfAkzent).accessibilityHidden(true)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(m.titel).font(.dm(.body, weight: .semibold)).foregroundStyle(Color.tfTinte)
                                Text(WerbungTexte.druckZeile).font(.dm(.caption)).foregroundStyle(Color.tfLeise)
                            }
                            Spacer(minLength: 8)
                            Image(systemName: "chevron.right").font(.footnote.weight(.semibold)).foregroundStyle(Color.tfLeise)
                                .accessibilityHidden(true)
                        }
                        .padding(.vertical, 10)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityElement(children: .combine)
                    if m.id != material.last?.id { Divider().overlay(Color.tfLinie) }
                }
            }
            KlarnaFussnote(text: werbung.fussnote)
        }
        .karte()
        .sheet(item: Binding(get: { offen.map(WebZiel.init) }, set: { offen = $0?.url })) { z in
            SafariFenster(url: z.url).ignoresSafeArea()
        }
    }
}

struct WebZiel: Identifiable {
    let url: URL
    var id: String { url.absoluteString }
}

/// SFSafariViewController (eigene Cookies, Teilen/Drucken über das Teilen-Symbol)
struct SafariFenster: UIViewControllerRepresentable {
    let url: URL

    func makeUIViewController(context: Context) -> SFSafariViewController {
        let k = SFSafariViewController.Configuration()
        k.entersReaderIfAvailable = false
        let vc = SFSafariViewController(url: url, configuration: k)
        vc.preferredControlTintColor = UIColor.hellDunkel(0x1F3D5C, 0xFBB316)
        vc.dismissButtonStyle = .done
        return vc
    }

    func updateUIViewController(_ vc: SFSafariViewController, context: Context) {}
}
