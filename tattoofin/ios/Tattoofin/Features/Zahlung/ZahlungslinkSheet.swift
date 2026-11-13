import SwiftUI
import UIKit

extension ZahlungErstellt: Identifiable {
    var id: String { zahlung.id }
}

/// Bildschirm 6: Zahlungslink mit QR. Live-Status alle 3 s (nur solange sichtbar, höchstens 15 min).
struct ZahlungslinkSheet: View {
    let erstellt: ZahlungErstellt

    @Environment(\.dismiss) private var dismiss
    @Environment(AppState.self) private var app
    @Environment(PortalStore.self) private var portal
    @State private var zahlung: Zahlung
    @State private var kopiert = false
    @State private var stornoFrage = false
    @State private var storniert = false
    @State private var fehler: String?
    @State private var bezahltZaehler = 0

    init(erstellt: ZahlungErstellt) {
        self.erstellt = erstellt
        _zahlung = State(initialValue: erstellt.zahlung)
    }

    static let abfrageAbstand: Duration = .seconds(3)
    static let abfrageDauer: TimeInterval = 15 * 60

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    if zahlung.istBezahlt {
                        bezahltAnsicht
                    } else {
                        offenAnsicht
                    }
                }
                .padding(20)
            }
            .tfHintergrund()
            .navigationTitle(zahlung.istGutschein ? Texte.Zahlung.gutscheinTitel : Texte.Zahlung.titel)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(Texte.Allgemein.fertig) { dismiss() }.font(.dm(.body, weight: .semibold))
                }
            }
            .confirmationDialog(Texte.Zahlung.stornoFrage, isPresented: $stornoFrage, titleVisibility: .visible) {
                Button(Texte.Zahlung.stornoJa, role: .destructive) { stornieren() }
                Button(Texte.Allgemein.abbrechen, role: .cancel) {}
            } message: {
                Text(Texte.Zahlung.stornoText)
            }
        }
        .qrAnzeige()
        .sensoryFeedback(.success, trigger: bezahltZaehler)
        .task { await abfragen() }
        .onChange(of: app.pushZahlung?.zaehler) { _, _ in
            if app.pushZahlung?.id == zahlung.id { Task { await neuLaden() } }
        }
    }

    private var offenAnsicht: some View {
        Group {
            if let h = erstellt.hinweis { HinweisKarte(text: h) }
            if zahlung.status == "storniert" || storniert {
                HinweisKarte(text: Texte.Zahlung.istStorniert, symbol: "xmark.circle.fill")
            } else {
                QRCodeView(inhalt: erstellt.link, beschreibung: Texte.Zahlung.qrLabel(zahlung.betragCent))
                    .frame(maxWidth: 360)
            }
            VStack(spacing: 4) {
                Text(Euro.text(zahlung.betragCent))
                    .font(.luckiest(40, relativeTo: .largeTitle))
                    .foregroundStyle(Color.tfTinte)
                Text(([zahlung.artText, zahlung.titel, zahlung.kunde] as [String?]).verbunden())
                    .font(.dm(.body))
                    .foregroundStyle(Color.tfLeise)
                    .multilineTextAlignment(.center)
            }
            if !storniert && zahlung.istOffen {
                HStack(spacing: 8) {
                    ProgressView()
                    Text(Texte.Zahlung.wartet).font(.dm(.subheadline)).foregroundStyle(Color.tfLeise)
                }
                .accessibilityElement(children: .combine)

                ShareLink(item: erstellt.whatsappText ?? erstellt.link) {
                    Label(Texte.Zahlung.teilen, systemImage: "square.and.arrow.up")
                }
                .buttonStyle(.haupt)

                Button {
                    UIPasteboard.general.string = erstellt.link
                    kopiert = true
                } label: {
                    Label(kopiert ? Texte.Zahlung.kopiert : Texte.Zahlung.kopieren, systemImage: kopiert ? "checkmark" : "doc.on.doc")
                }
                .buttonStyle(.zweit)
                .sensoryFeedback(.success, trigger: kopiert)

                Button(Texte.Zahlung.stornieren, role: .destructive) { stornoFrage = true }
                    .buttonStyle(.gefahr)
            }
            if let fehler { FehlerZeile(text: fehler) }
        }
    }

    private var bezahltAnsicht: some View {
        VStack(spacing: 18) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 120))
                .foregroundStyle(Color.tfGruen)
                .symbolEffect(.bounce, value: bezahltZaehler)
                .padding(.top, 30)
                .accessibilityHidden(true)
            Text(Texte.Zahlung.bezahlt(zahlung.betragCent))
                .font(.luckiest(34, relativeTo: .largeTitle))
                .foregroundStyle(Color.tfTinte)
                .multilineTextAlignment(.center)
            if zahlung.status == "in_pruefung" {
                Text(Texte.Zahlung.inPruefung).font(.dm(.body)).foregroundStyle(Color.tfLeise).multilineTextAlignment(.center)
            }
            Text(([zahlung.titel, zahlung.kunde, zahlung.zahlartAnzeige] as [String?]).verbunden())
                .font(.dm(.body))
                .foregroundStyle(Color.tfLeise)
                .multilineTextAlignment(.center)
            Button(Texte.Allgemein.fertig) { dismiss() }.buttonStyle(.haupt)
        }
        .accessibilityElement(children: .combine)
    }

    /// Alle 3 s abfragen, solange das Sheet offen ist und die Zahlung offen ist (höchstens 15 Minuten)
    private func abfragen() async {
        let ende = Date.now.addingTimeInterval(Self.abfrageDauer)
        while !Task.isCancelled && Date.now < ende && zahlung.istOffen && !storniert {
            try? await Task.sleep(for: Self.abfrageAbstand)
            if Task.isCancelled { return }
            await neuLaden()
        }
    }

    private func neuLaden() async {
        guard let a = try? await APIClient.shared.zahlung(zahlung.id, abgleich: true) else { return }
        let warOffen = !zahlung.istBezahlt
        zahlung = a.zahlung
        portal.aktualisieren(a.zahlung)
        if warOffen && a.zahlung.istBezahlt { bezahltZaehler += 1 }
    }

    private func stornieren() {
        Task {
            do {
                let z = try await APIClient.shared.stornieren(zahlung.id)
                zahlung = z
                storniert = true
                portal.aktualisieren(z)
            } catch {
                fehler = fehlerText(error)
            }
        }
    }
}

/// Bildschirm 7: Theken-QR im Vollbild (Zahlseite des Studios). Funktioniert auch ohne Netz.
struct TheckenQRView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(PortalStore.self) private var portal

    private var adresse: String? { portal.studio?.zahlseite ?? Einstellungen.zahlseite }
    private var name: String { portal.studio?.name ?? Einstellungen.studioName ?? "" }

    var body: some View {
        ZStack {
            Color.tfGelb.ignoresSafeArea()
            VStack(spacing: 20) {
                HStack {
                    Spacer()
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.title2.weight(.bold))
                            .foregroundStyle(Color.tfBlau)
                            .frame(width: 44, height: 44)
                            .background(.white.opacity(0.6), in: Circle())
                    }
                    .accessibilityLabel(Texte.Allgemein.schliessen)
                }
                Spacer(minLength: 0)
                Text(name)
                    .font(.luckiest(34, relativeTo: .largeTitle))
                    .foregroundStyle(Color.tfBlau)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .minimumScaleFactor(0.5)
                if let adresse {
                    QRCodeView(inhalt: adresse, beschreibung: Texte.Theke.qrLabel(name))
                        .frame(maxWidth: 420)
                } else {
                    Text(Texte.Theke.fehlt).font(.dm(.body)).foregroundStyle(Color.tfBlau)
                }
                Text(Texte.Theke.anleitung)
                    .font(.dm(.title3, weight: .semibold))
                    .foregroundStyle(Color.tfBlau)
                    .multilineTextAlignment(.center)
                Spacer(minLength: 0)
                Image(.wortmarke)
                    .resizable()
                    .scaledToFit()
                    .frame(maxWidth: 160)
                    .accessibilityLabel(Texte.Allgemein.logoLabel)
            }
            .padding(24)
        }
        .qrAnzeige()
        .statusBarHidden()
    }
}
