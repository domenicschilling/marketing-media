import SwiftUI

/// Bildschirm 15: Team-Adressen. Inhaber: hinzufügen/entfernen. Team-Mitglied: nur lesen + eigenen Zugang entfernen.
struct TeamView: View {
    @Environment(AppState.self) private var app
    @State private var team: TeamAntwort?
    @State private var neueAdresse = ""
    @State private var alleAbmelden = false
    @State private var fehler: String?
    @State private var speichert = false
    @State private var entfernenFrage: String?
    @State private var eigenenFrage = false

    private var darfAendern: Bool { team?.darfAendern ?? (app.sitzung?.istInhaber ?? false) }
    private var max: Int { team?.max ?? 5 }

    var body: some View {
        TFListe {
            if let t = team {
                Section(Texte.Team.haupt) {
                    Label(t.hauptadresse ?? "–", systemImage: "person.crop.circle.badge.checkmark")
                }
                Section {
                    if t.team.isEmpty {
                        Text(Texte.Team.leer).foregroundStyle(Color.tfLeise)
                    }
                    ForEach(t.team, id: \.self) { e in
                        HStack {
                            Label(e, systemImage: "person")
                            Spacer()
                            if darfAendern {
                                Button {
                                    entfernenFrage = e
                                } label: {
                                    Image(systemName: "minus.circle.fill").foregroundStyle(Color.tfRot)
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel(Texte.Team.entfernenLabel(e))
                            }
                        }
                    }
                } header: {
                    Text(Texte.Team.teamTitel(t.team.count, max))
                } footer: {
                    Text(darfAendern ? Texte.Team.hinweisInhaber : Texte.Team.hinweisTeam)
                }

                if darfAendern && t.team.count < max {
                    Section(Texte.Team.hinzufuegen) {
                        TextField(Texte.Team.adressePlatzhalter, text: $neueAdresse)
                            .textContentType(.emailAddress)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .onSubmit { hinzufuegen() }
                        Button(Texte.Team.hinzufuegenKnopf) { hinzufuegen() }
                            .disabled(neueAdresse.leerAlsNil == nil || speichert)
                    }
                }
                if darfAendern {
                    Section {
                        Toggle(Texte.Team.alleAbmelden, isOn: $alleAbmelden)
                    } footer: {
                        Text(Texte.Team.alleAbmeldenHinweis)
                    }
                }
                if !darfAendern {
                    Section {
                        Button(Texte.Team.zugangEntfernen, role: .destructive) { eigenenFrage = true }
                    }
                }
            } else if fehler == nil {
                LadeAnsicht().listRowBackground(Color.clear)
            }
            if let fehler { Section { FehlerZeile(text: fehler) } }
        }
        .font(.dm(.body))
        .scrollContentBackground(.hidden)
        .tfHintergrund()
        .navigationTitle(Texte.Konto.team)
        .navigationBarTitleDisplayMode(.inline)
        .task { await laden() }
        .refreshable { await laden() }
        .alert(Texte.Team.entfernenFrage(entfernenFrage ?? ""), isPresented: Binding(
            get: { entfernenFrage != nil }, set: { if !$0 { entfernenFrage = nil } })) {
            Button(Texte.Team.entfernen, role: .destructive) {
                if let e = entfernenFrage { speichern((team?.team ?? []).filter { $0 != e }) }
            }
            Button(Texte.Allgemein.abbrechen, role: .cancel) {}
        } message: {
            Text(Texte.Team.entfernenText)
        }
        .alert(Texte.Team.zugangEntfernenFrage, isPresented: $eigenenFrage) {
            Button(Texte.Team.zugangEntfernen, role: .destructive) { eigenenZugangEntfernen() }
            Button(Texte.Allgemein.abbrechen, role: .cancel) {}
        } message: {
            Text(Texte.Team.zugangEntfernenText)
        }
    }

    private func laden() async {
        do {
            team = try await APIClient.shared.team()
            fehler = nil
        } catch is CancellationError {
        } catch {
            fehler = fehlerText(error)
        }
    }

    private func hinzufuegen() {
        guard let e = neueAdresse.leerAlsNil?.lowercased() else { return }
        speichern((team?.team ?? []) + [e])
    }

    private func speichern(_ emails: [String]) {
        speichert = true
        fehler = nil
        Task {
            defer { speichert = false }
            do {
                team = try await APIClient.shared.teamSpeichern(emails, alleAbmelden: alleAbmelden)
                neueAdresse = ""
                if alleAbmelden {
                    // „Zusätzlich alle abmelden“ trifft auch dieses Gerät
                    await app.lokalAbmelden(hinweis: Texte.Konto.ueberallErledigt)
                }
            } catch {
                fehler = fehlerText(error)
            }
        }
    }

    private func eigenenZugangEntfernen() {
        Task {
            do {
                try await APIClient.shared.eigenenZugangEntfernen()
                await app.lokalAbmelden(hinweis: Texte.Team.zugangEntferntHinweis)
            } catch {
                fehler = fehlerText(error)
            }
        }
    }
}
