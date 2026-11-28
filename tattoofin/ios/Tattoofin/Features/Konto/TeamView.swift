import SwiftUI

/// Bildschirm 15: Team-Adressen. Inhaber: hinzufügen/entfernen. Team-Mitglied: nur lesen + eigenen Zugang entfernen.
struct TeamView: View {
    @Environment(AppState.self) private var app
    @State private var team: TeamAntwort?
    @State private var neueAdresse = ""
    @State private var fehler: String?
    @State private var speichert = false
    @State private var entfernenFrage: String?
    @State private var eigenenFrage = false
    @State private var hinzuOffen = false
    @Environment(\.dynamicTypeSize) private var schrift

    private var darfAendern: Bool { team?.darfAendern ?? (app.sitzung?.istInhaber ?? false) }
    private var max: Int { team?.max ?? 5 }

    var body: some View {
        TFListe {
            if let t = team {
                Section {
                    adresse(t.hauptadresse ?? "–", "person.crop.circle.fill")
                } header: {
                    ListenKopf(Texte.Team.haupt)
                }
                Section {
                    if t.team.isEmpty {
                        Text(Texte.Team.leer).foregroundStyle(Color.tfLeise)
                    }
                    // Abnahme 1.1, Nr. 7: keine roten Minus-Kreise mehr, Entfernen per Wischen mit Rückfrage (wie Geräte)
                    ForEach(t.team, id: \.self) { e in
                        adresse(e, "person.crop.circle")
                            .swipeActions(edge: .trailing) {
                                if darfAendern {
                                    Button(Texte.Team.entfernen, role: .destructive) { entfernenFrage = e }
                                }
                            }
                            .accessibilityIdentifier("team-adresse")
                    }
                    // „+ Adresse hinzufügen“ als Listenzeile statt eigenem Formular-Block (Abnahme 1.1, Runde 3)
                    if darfAendern && t.team.count < max {
                        Button { neueAdresse = ""; hinzuOffen = true } label: {
                            Label(Texte.Team.hinzufuegen, systemImage: "plus.circle.fill")
                                .foregroundStyle(Color.tfAkzent)
                                .font(.dm(.body, weight: .semibold))
                        }
                        .disabled(speichert)
                        .accessibilityIdentifier("team-hinzufuegen")
                    }
                } header: {
                    ListenKopf(Texte.Team.teamTitel(t.team.count, max))
                } footer: {
                    ListenFuss(darfAendern ? Texte.AbnahmeG5.teamHinweisInhaber : Texte.Team.hinweisTeam)
                }

                if !darfAendern {
                    Section {
                        Button(Texte.Team.zugangEntfernen, role: .destructive) { eigenenFrage = true }
                            .foregroundStyle(Color.tfRot)
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
        .tfHarteKanteOben()  // Abnahme 1.1, Runde 3
        .navigationBarTitleDisplayMode(.inline)
        .task { await laden() }
        .refreshable { await laden() }
        .alert(Texte.Team.entfernenFrage(entfernenFrage ?? ""), isPresented: Binding(
            get: { entfernenFrage != nil }, set: { if !$0 { entfernenFrage = nil } })) {
            // „Alle abmelden“ nur noch hier, beim Entfernen (vorher ein Schalter, der auch beim Hinzufügen galt)
            Button(Texte.Team.entfernen, role: .destructive) {
                if let e = entfernenFrage { speichern((team?.team ?? []).filter { $0 != e }, alleAbmelden: false) }
            }
            Button(Texte.AbnahmeG5.entfernenUndAlleAbmelden, role: .destructive) {
                if let e = entfernenFrage { speichern((team?.team ?? []).filter { $0 != e }, alleAbmelden: true) }
            }
            Button(Texte.Allgemein.abbrechen, role: .cancel) {}
        } message: {
            Text(Texte.AbnahmeG5.entfernenText)
        }
        .alert(Texte.Team.hinzufuegen, isPresented: $hinzuOffen) {
            TextField(Texte.Team.adressePlatzhalter, text: $neueAdresse)
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
            Button(Texte.Team.hinzufuegenKnopf) { hinzufuegen() }
            Button(Texte.Allgemein.abbrechen, role: .cancel) {}
        } message: {
            Text(Texte.Team.hinzufuegenHinweis)
        }
        .alert(Texte.Team.zugangEntfernenFrage, isPresented: $eigenenFrage) {
            Button(Texte.Team.zugangEntfernen, role: .destructive) { eigenenZugangEntfernen() }
            Button(Texte.Allgemein.abbrechen, role: .cancel) {}
        } message: {
            Text(Texte.Team.zugangEntfernenText)
        }
    }

    /// Adresszeile in tfTinte (vorher Systemschwarz), Symbol in tfAkzent. Adressen einzeilig: bei großer Schrift verkleinert
    /// und in der Mitte gekürzt statt mitten im Wort umgebrochen
    private func adresse(_ text: String, _ symbol: String) -> some View {
        Label {
            // Große Schrift: umbrechen statt kürzen, nur an „@“ und am letzten Punkt (Abnahme 1.1, Runde 3)
            Text(schrift.isAccessibilitySize ? Umbruch.email(text) : text).foregroundStyle(Color.tfTinte)
                .lineLimit(schrift.isAccessibilitySize ? nil : 1)
                .minimumScaleFactor(schrift.isAccessibilitySize ? 1 : 0.5)
                .truncationMode(.middle)
        } icon: {
            Image(systemName: symbol).foregroundStyle(Color.tfAkzent)
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
        speichern((team?.team ?? []) + [e], alleAbmelden: false)
    }

    private func speichern(_ emails: [String], alleAbmelden: Bool) {
        speichert = true
        fehler = nil
        Task {
            defer { speichert = false }
            do {
                team = try await APIClient.shared.teamSpeichern(emails, alleAbmelden: alleAbmelden)
                neueAdresse = ""
                if alleAbmelden {
                    // „Zusätzlich alle abmelden“ trifft auch dieses Gerät. Der Server lässt es gültig, darum hier
                    // richtig abmelden (sonst bekäme es weiter Zahlungs-Mitteilungen).
                    await app.abmelden(hinweis: Texte.Konto.ueberallErledigt)
                }
            } catch {
                fehler = fehlerText(error)
            }
        }
    }

    private func eigenenZugangEntfernen() {
        Task {
            do {
                try await app.eigenenZugangEntfernen()
            } catch {
                fehler = fehlerText(error)
            }
        }
    }
}
