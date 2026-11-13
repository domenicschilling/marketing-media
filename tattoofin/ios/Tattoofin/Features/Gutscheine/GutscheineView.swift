import SwiftUI

/// Bildschirm 11: Gutscheine (Tab 3). Scannen, Code eingeben, verkaufte Gutscheine, Gutschein verkaufen.
struct GutscheineView: View {
    @Environment(PortalStore.self) private var portal
    @State private var pfad: [Zahlung] = []
    @State private var code = ""
    @State private var sucht = false
    @State private var fehler: String?
    @State private var scannerOffen = false
    @State private var verkaufenOffen = false
    @State private var trefferZaehler = 0
    @FocusState private var codeFokus: Bool

    var body: some View {
        NavigationStack(path: $pfad) {
            TFListe {
                Section {
                    Button {
                        scannerOffen = true
                    } label: {
                        Label(Texte.Gutscheine.scannen, systemImage: "camera.viewfinder")
                    }
                    .buttonStyle(.haupt)
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                }

                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(Texte.Gutscheine.codeEingeben).font(.dm(.subheadline, weight: .semibold)).foregroundStyle(Color.tfTinte)
                        HStack(spacing: 8) {
                            TextField(Texte.Gutscheine.codePlatzhalter, text: $code)
                                .font(.system(.title3, design: .monospaced).weight(.semibold))
                                .textInputAutocapitalization(.characters)
                                .autocorrectionDisabled()
                                .keyboardType(.asciiCapable)
                                .submitLabel(.search)
                                .focused($codeFokus)
                                .onSubmit { suchen() }
                                .onChange(of: code) { _, neu in
                                    let f = GutscheinCode.formatieren(neu)
                                    if f != neu { code = f }
                                }
                                .accessibilityLabel(Texte.Gutscheine.codeEingeben)
                            Button {
                                suchen()
                            } label: {
                                if sucht { ProgressView() } else { Image(systemName: "arrow.right.circle.fill").font(.title) }
                            }
                            .disabled(!GutscheinCode.vollstaendig(code) || sucht)
                            .accessibilityLabel(Texte.Gutscheine.suchen)
                        }
                        if let fehler { FehlerZeile(text: fehler) }
                    }
                    .padding(.vertical, 4)
                }

                Section {
                    if portal.gutscheine.isEmpty {
                        LeerAnsicht(titel: Texte.Gutscheine.leerTitel, text: Texte.Gutscheine.leerText, symbol: "gift")
                    } else {
                        ForEach(portal.gutscheine) { z in
                            NavigationLink(value: z) { GutscheinZeile(zahlung: z) }
                        }
                    }
                } header: {
                    Text(Texte.Gutscheine.verkauft).font(.dm(.subheadline, weight: .semibold))
                }
            }
            .font(.dm(.body))
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
            .tfHintergrund()
            .refreshable { await portal.laden() }
            .navigationTitle(Texte.Gutscheine.titel)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if portal.studio?.darfKassieren == true {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button {
                            verkaufenOffen = true
                        } label: {
                            Label(Texte.Gutscheine.verkaufen, systemImage: "plus")
                                .labelStyle(.titleAndIcon)
                                .font(.dm(.subheadline, weight: .semibold))
                        }
                    }
                }
            }
            .navigationDestination(for: Zahlung.self) { GutscheinDetailView(zahlung: $0) }
            .sheet(isPresented: $verkaufenOffen) { GutscheinVerkaufenView() }
            .fullScreenCover(isPresented: $scannerOffen) {
                ScannerView { treffer in
                    scannerOffen = false
                    Task { await nachScan(treffer) }
                }
            }
            .sensoryFeedback(.success, trigger: trefferZaehler)
        }
    }

    private func suchen() {
        guard GutscheinCode.vollstaendig(code) else { return }
        Task { await nachScan(.code(code)) }
    }

    private func nachScan(_ t: ScanTreffer) async {
        sucht = true
        fehler = nil
        defer { sucht = false }
        do {
            let z: Zahlung
            switch t {
            case let .code(c): z = try await APIClient.shared.gutscheinSuchen(code: c)
            case let .token(tok): z = try await APIClient.shared.gutscheinSuchen(token: tok)
            }
            trefferZaehler += 1
            code = ""
            codeFokus = false
            portal.aktualisieren(z)
            pfad = [z]
        } catch {
            // Gesuchten Code stehen lassen, damit man ihn korrigieren kann
            if case let .code(c) = t { code = c }
            fehler = fehlerText(error)
        }
    }
}

struct GutscheinZeile: View {
    let zahlung: Zahlung

    var body: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: 3) {
                Text(zahlung.gutschein?.code ?? Texte.Gutscheine.ohneCode)
                    .font(.system(.body, design: .monospaced).weight(.semibold))
                    .foregroundStyle(Color.tfTinte)
                Text([zahlung.kunde, zahlung.gutschein?.empfaenger?.leerAlsNil.map { "für \($0)" }].verbunden(" "))
                    .font(.dm(.subheadline))
                    .foregroundStyle(Color.tfLeise)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 6) {
                Text(Euro.text(zahlung.betragCent)).font(.dm(.body, weight: .bold)).foregroundStyle(Color.tfTinte)
                StatusChip(gutschein: zahlung.gutschein?.status)
            }
        }
        .accessibilityElement(children: .combine)
    }
}
