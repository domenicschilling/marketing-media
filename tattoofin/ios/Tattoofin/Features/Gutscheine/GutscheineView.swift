import SwiftUI

/// Bildschirm 11: Gutscheine (Tab 3). Scannen, Code eingeben, verkaufte Gutscheine, Gutschein verkaufen.
struct GutscheineView: View {
    @Environment(PortalStore.self) private var portal
    @Environment(AppState.self) private var app
    @State private var pfad: [Zahlung] = []
    @State private var code = ""
    @State private var sucht = false
    @State private var fehler: String?
    @State private var scannerOffen = false
    @State private var verkaufenOffen = false
    @State private var trefferZaehler = 0
    /// Code wurde von der Suche selbst ins Feld gesetzt (nach Scan-Fehler): onChange soll die Meldung dann nicht löschen
    @State private var codeAusSuche = false
    @FocusState private var codeFokus: Bool

    var body: some View {
        NavigationStack(path: $pfad) {
            TFListe {
                Section {
                    Button {
                        codeFokus = false
                        scannerOffen = true
                    } label: {
                        Label(Texte.Gutscheine.scannen, systemImage: "camera.viewfinder")
                    }
                    .buttonStyle(.haupt)
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                    // Unter iOS 27 zeigt die Leiste nur das „+“: darum hier ein großer Knopf mit Text
                    if portal.studio?.darfKassieren == true {
                        Button {
                            codeFokus = false
                            verkaufenOffen = true
                        } label: {
                            Label(Texte.Gutscheine.verkaufen, systemImage: "gift")
                        }
                        .buttonStyle(.zweit)
                        .listRowInsets(EdgeInsets(top: 10, leading: 0, bottom: 0, trailing: 0))
                        .listRowBackground(Color.clear)
                        .accessibilityIdentifier("gutschein-verkaufen")
                    }
                }

                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(Texte.Gutscheine.codeEingeben).font(.dm(.subheadline, weight: .semibold)).foregroundStyle(Color.tfTinte)
                        HStack(spacing: 8) {
                            // Mehrzeilig erlaubt, damit der Code bei großer Schrift umbricht statt abgeschnitten zu werden (DS-Audit „Text clipped“)
                            TextField(Texte.Gutscheine.codeEingeben, text: $code, prompt: tfPlatzhalter(Texte.Gutscheine.codePlatzhalter), axis: .vertical)
                                .lineLimit(1...3)
                                .font(.system(.title3, design: .monospaced).weight(.semibold))
                                .textInputAutocapitalization(.characters)
                                .autocorrectionDisabled()
                                .keyboardType(.asciiCapable)
                                .submitLabel(.search)
                                .focused($codeFokus)
                                .onSubmit { suchen() }
                                .onChange(of: code) { _, neu in
                                    // Mehrzeiliges Feld: Return fügt einen Zeilenumbruch ein → als „Suchen“ werten
                                    let mitReturn = neu.contains("\n")
                                    let f = GutscheinCode.formatieren(neu.replacingOccurrences(of: "\n", with: ""))
                                    if f != neu { code = f }
                                    if mitReturn, GutscheinCode.vollstaendig(f) { suchen() }
                                    // Alte Meldung („nicht gefunden“) passt nicht mehr zum neuen Code – außer die Suche hat den Code selbst gesetzt
                                    if codeAusSuche {
                                        if f == neu { codeAusSuche = false }
                                    } else if !sucht {
                                        fehler = nil
                                    }
                                }
                                .accessibilityLabel(Texte.Gutscheine.codeEingeben)
                            Button {
                                suchen()
                            } label: {
                                if sucht { ProgressView() } else { Image(systemName: "arrow.right.circle.fill").font(.title) }
                            }
                            .frame(minWidth: 44, minHeight: 44)
                            .contentShape(Rectangle())
                            .disabled(!GutscheinCode.vollstaendig(code) || sucht)
                            .accessibilityLabel(Texte.Gutscheine.suchen)
                        }
                        if let fehler { FehlerZeile(text: fehler) }
                    }
                    .padding(.vertical, 4)
                }

                Section {
                    if portal.gutscheine.isEmpty {
                        if portal.studio != nil, portal.studio?.darfKassieren != true {
                            // Ohne fertige Kasse gibt es den Knopf „Gutschein verkaufen“ nicht: sagen, warum, und zur Kasse führen
                            LeerAnsicht(titel: Texte.Gutscheine.leerTitel, text: Texte.GutscheinWert.leerOhneKasse, symbol: "gift")
                            Button {
                                app.tab = .kasse
                            } label: {
                                Label(Texte.GutscheinWert.zurKasse, systemImage: "creditcard")
                            }
                            .buttonStyle(.zweit)
                            .listRowInsets(EdgeInsets())
                            .listRowBackground(Color.clear)
                        } else {
                            LeerAnsicht(titel: Texte.Gutscheine.leerTitel, text: Texte.Gutscheine.leerText, symbol: "gift")
                        }
                    } else {
                        ForEach(portal.gutscheine) { z in
                            NavigationLink(value: z) { GutscheinZeile(zahlung: z) }
                        }
                    }
                } header: {
                    ListenKopf(Texte.Gutscheine.verkauft).font(.dm(.subheadline, weight: .semibold))
                }
            }
            .font(.dm(.body))
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
            .tfHintergrund()
            .scrollDismissesKeyboard(.immediately)
            .refreshable { await portal.laden() }
            .navigationTitle(Texte.Gutscheine.titel)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if portal.studio?.darfKassieren == true {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button {
                            codeFokus = false
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
            // Erst Tastatur und Fokus loslassen, dann im nächsten Durchlauf öffnen: sonst fehlen Titel und Leiste im Detail
            try? await Task.sleep(for: .milliseconds(250))
            pfad = [z]
        } catch {
            // Gesuchten Code stehen lassen, damit man ihn korrigieren kann (Meldung bleibt dabei stehen)
            if case let .code(c) = t, c != code {
                codeAusSuche = true
                code = c
            }
            fehler = Self.suchFehlerText(error)
        }
    }

    /// 404 bei der Suche: klarer sagen, was los ist (fremdes Studio, falscher Code)
    static func suchFehlerText(_ e: Error) -> String {
        if let a = e as? APIFehler, a.status == 404 { return Texte.GutscheinWert.nichtGefunden }
        return fehlerText(e)
    }
}

struct GutscheinZeile: View {
    let zahlung: Zahlung
    @Environment(\.dynamicTypeSize) private var schrift

    var body: some View {
        // Bedienungshilfe-Größen: Betrag und Status unter den Code statt daneben (DS: umbrechen statt verkleinern)
        let layout = schrift.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 6)) : AnyLayout(HStackLayout(alignment: .top))
        layout {
            VStack(alignment: .leading, spacing: 3) {
                Text(zahlung.gutschein?.code ?? Texte.Gutscheine.ohneCode)
                    .font(.system(.body, design: .monospaced).weight(.semibold))
                    .foregroundStyle(Color.tfTinte)
                    .fixedSize(horizontal: false, vertical: true)
                Text([zahlung.kunde, zahlung.gutschein?.empfaenger?.leerAlsNil.map { "für \($0)" }].verbunden(" "))
                    .font(.dm(.subheadline))
                    .foregroundStyle(Color.tfLeise)
            }
            if !schrift.isAccessibilitySize { Spacer() }
            VStack(alignment: schrift.isAccessibilitySize ? .leading : .trailing, spacing: 6) {
                Text(Euro.text(zahlung.gutscheinWertCent)).font(.dm(.body, weight: .bold)).foregroundStyle(Color.tfTinte)
                    .fixedSize(horizontal: false, vertical: true)
                if zahlung.gutscheinBezahltAbweichend {
                    Text(Texte.GutscheinWert.bezahlt(zahlung.gutscheinBezahltCent)).font(.dm(.footnote)).foregroundStyle(Color.tfLeise)
                        .fixedSize(horizontal: false, vertical: true)
                }
                StatusChip(gutschein: zahlung.gutschein?.status)
            }
        }
        .accessibilityElement(children: .combine)
    }
}
