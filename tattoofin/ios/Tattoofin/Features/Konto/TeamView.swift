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
                } header: {
                    ListenKopf(Texte.Team.teamTitel(t.team.count, max))
                } footer: {
                    ListenFuss(darfAendern ? Texte.AbnahmeG5.teamHinweisInhaber : Texte.Team.hinweisTeam)
                }

                if darfAendern && t.team.count < max {
                    Section {
                        // Ein Eingabefeld-Bauteil für die ganze App (tfTextfeld), darunter der Knopf in voller Breite;
                        // die Tastatur-Taste schickt genauso ab (Abnahme 1.1, Nr. 17)
                        VStack(alignment: .leading, spacing: 10) {
                            TextField(Texte.Team.hinzufuegen, text: $neueAdresse, prompt: tfPlatzhalter(Texte.Team.adressePlatzhalter))
                                .accessibilityLabel(Texte.Team.hinzufuegen)
                                .textContentType(.emailAddress)
                                .keyboardType(.emailAddress)
                                .textInputAutocapitalization(.never)
                                .autocorrectionDisabled()
                                .submitLabel(.done)
                                .onSubmit { hinzufuegen() }
                                .tfTextfeld()
                            Button { hinzufuegen() } label: {
                                Label(Texte.Team.hinzufuegenKnopf, systemImage: "plus")
                            }
                            .buttonStyle(.zweit)
                            .disabled(neueAdresse.leerAlsNil == nil || speichert)
                        }
                        .padding(.vertical, 6)
                    } header: {
                        ListenKopf(Texte.Team.hinzufuegen)
                    }
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
            Text(text).foregroundStyle(Color.tfTinte)
                .lineLimit(1)
                .minimumScaleFactor(0.5)
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
