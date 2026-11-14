import SwiftUI

/// „Deine rechtliche Lage“: Blatt lesen (recht.html?app=1 in der Rechtsansicht, nur lesen) und nativ mit Häkchen und Name bestätigen
/// (POST /api/portal/recht { gelesen, version, name }). Die Version kommt vom Server (config.rechtVersion).
struct RechtView: View {
    @Environment(AppState.self) private var app
    @State private var mehr = StudioMehrStore.shared
    @State private var lesen = false
    @State private var haken = false
    @State private var name = ""
    @State private var arbeitet = false
    @State private var fehler: String?
    @State private var danke = false

    private var stand: StudioMehr.RechtStand? { mehr.studio?.recht }
    private var bestaetigt: Bool { stand?.aktuell == true }
    private var istInhaber: Bool { app.sitzung?.istInhaber ?? false }

    var body: some View {
        Group {
            if mehr.studio != nil {
                inhalt
            } else if let f = mehr.fehler {
                FehlerAnsicht(text: f) { Task { await mehr.laden() } }
            } else {
                LadeAnsicht()
            }
        }
        .tfHintergrund()
        .navigationTitle(Texte.Recht.titel)
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $lesen) { RechtsAnsicht(seite: .recht) }
        .task {
            await mehr.laden()
            if name.isEmpty { name = mehr.studio?.inhaber ?? "" }
        }
    }

    private var inhalt: some View {
        TFFormular {
            Section {
                Button {
                    lesen = true
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "doc.text.magnifyingglass")
                            .font(.title2)
                            .foregroundStyle(Color.tfAkzent)
                            .accessibilityHidden(true)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(Texte.Recht.lesen).font(.dm(.body, weight: .semibold)).foregroundStyle(Color.tfTinte)
                            Text(Texte.Recht.lesenText).font(.dm(.footnote)).foregroundStyle(Color.tfLeise)
                        }
                    }
                    .padding(.vertical, 4)
                }
                .accessibilityIdentifier("recht-lesen")
            }

            if bestaetigt, let s = stand {
                Section {
                    Label(Texte.Recht.bestaetigt(Datum.tag(s.am) ?? "–", s.version ?? "–"), systemImage: "checkmark.seal.fill")
                        .foregroundStyle(Color.tfGruen)
                        .font(.dm(.body, weight: .semibold))
                    if danke { Text(Texte.Recht.danke).font(.dm(.footnote)).foregroundStyle(Color.tfLeise) }
                }
            } else if !istInhaber {
                Section {
                    HinweisKarte(text: Texte.Mehr.rechtNurInhaber, symbol: "person.fill")
                        .listRowInsets(EdgeInsets())
                        .listRowBackground(Color.clear)
                }
            } else {
                Section {
                    if stand != nil {
                        HinweisKarte(text: Texte.Recht.neueVersion, symbol: "arrow.triangle.2.circlepath")
                            .listRowInsets(EdgeInsets())
                            .listRowBackground(Color.clear)
                    }
                    Toggle(isOn: $haken) {
                        Text(Texte.Recht.haken).font(.dm(.body)).fixedSize(horizontal: false, vertical: true)
                    }
                    .toggleStyle(HakenStil())
                    .accessibilityIdentifier("recht-haken")
                    .onChange(of: haken) { _, an in if an { fehler = nil } }
                    VStack(alignment: .leading, spacing: 4) {
                        Text(Texte.Recht.name).font(.dm(.subheadline, weight: .semibold)).foregroundStyle(Color.tfTinte)
                        TextField(Texte.Recht.name, text: $name, prompt: tfPlatzhalter(Texte.Recht.name))
                            .textContentType(.name)
                            .textInputAutocapitalization(.words)
                            .autocorrectionDisabled()
                            .font(.dm(.body))
                    }
                    if let fehler { FehlerZeile(text: fehler) }
                    Button {
                        bestaetigen()
                    } label: {
                        if arbeitet { ProgressView().tint(Color.tfBlau) } else { Text(Texte.Recht.bestaetigen) }
                    }
                    .buttonStyle(.haupt)
                    .disabled(arbeitet)
                    .accessibilityIdentifier("recht-bestaetigen")
                    .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                } header: {
                    Text(Texte.Recht.bestaetigenTitel)
                }
            }
        }
        .font(.dm(.body))
        .scrollContentBackground(.hidden)
        .scrollDismissesKeyboard(.interactively)
        .refreshable { await mehr.laden() }
    }

    private func bestaetigen() {
        guard haken else { fehler = Texte.Recht.hakenFehlt; return }
        let n = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard n.count >= 2 else { fehler = Texte.Recht.nameFehlt; return }
        arbeitet = true
        fehler = nil
        Task {
            defer { arbeitet = false }
            do {
                // Version immer frisch vom Server (falls das Blatt inzwischen aktualisiert wurde)
                if mehr.config.rechtVersion == nil { await mehr.laden() }
                guard let v = mehr.config.rechtVersion else { throw APIFehler.unbekannt }
                let s = try await APIClient.shared.rechtBestaetigen(version: v, name: String(n.prefix(100)))
                mehr.uebernehmen(s)
                danke = true
            } catch let e as APIFehler where e.status == 409 {
                // Blatt wurde aktualisiert: neu laden, nochmal lesen lassen
                await mehr.laden()
                fehler = Texte.Recht.neueVersion
            } catch {
                fehler = fehlerText(error)
            }
        }
    }
}

/// Häkchen statt Schalter (für Bestätigungen)
struct HakenStil: ToggleStyle {
    func makeBody(configuration: Configuration) -> some View {
        Button {
            configuration.isOn.toggle()
        } label: {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: configuration.isOn ? "checkmark.square.fill" : "square")
                    .font(.title2)
                    .foregroundStyle(configuration.isOn ? Color.tfGruen : Color.tfLeise)
                    .accessibilityHidden(true)
                configuration.label.foregroundStyle(Color.tfTinte)
                Spacer(minLength: 0)
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isToggle)
        .accessibilityValue(configuration.isOn ? Texte.Allgemein.ja : Texte.Allgemein.nein)
    }
}
