import SwiftUI

/// Bildschirm 16: Angemeldete Geräte. Inhaber können jedes Gerät abmelden, Team-Mitglieder nur ihre eigenen.
struct GeraeteView: View {
    @Environment(AppState.self) private var app
    @State private var geraete: [Geraet]?
    @State private var fehler: String?
    @State private var abmeldenFrage: Geraet?

    private var istInhaber: Bool { app.sitzung?.istInhaber ?? false }

    var body: some View {
        List {
            if let geraete {
                Section {
                    if geraete.isEmpty { Text(Texte.Geraete.leer).foregroundStyle(Color.tfLeise) }
                    ForEach(geraete) { g in
                        zeile(g)
                            .swipeActions(edge: .trailing) {
                                if darfAbmelden(g) {
                                    Button(Texte.Geraete.abmelden, role: .destructive) { abmeldenFrage = g }
                                }
                            }
                    }
                } footer: {
                    Text(Texte.Geraete.hinweis)
                }
            } else if fehler == nil {
                LadeAnsicht().listRowBackground(Color.clear)
            }
            if let fehler { Section { FehlerZeile(text: fehler) } }
        }
        .font(.dm(.body))
        .scrollContentBackground(.hidden)
        .tfHintergrund()
        .navigationTitle(Texte.Konto.geraete)
        .navigationBarTitleDisplayMode(.inline)
        .task { await laden() }
        .refreshable { await laden() }
        .confirmationDialog(Texte.Geraete.frage(abmeldenFrage?.name ?? ""), isPresented: Binding(
            get: { abmeldenFrage != nil }, set: { if !$0 { abmeldenFrage = nil } }), titleVisibility: .visible) {
            Button(Texte.Geraete.abmelden, role: .destructive) { if let g = abmeldenFrage { abmelden(g) } }
            Button(Texte.Allgemein.abbrechen, role: .cancel) {}
        }
    }

    private func darfAbmelden(_ g: Geraet) -> Bool {
        istInhaber || g.email == nil || g.diesesGeraet == true || g.email?.lowercased() == app.sitzung?.email.lowercased()
    }

    private func zeile(_ g: Geraet) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(g.name ?? Texte.Geraete.ohneName).font(.dm(.body, weight: .semibold)).foregroundStyle(Color.tfTinte)
                if g.diesesGeraet == true {
                    Text(Texte.Geraete.diesesGeraet)
                        .font(.dm(.caption, weight: .bold))
                        .foregroundStyle(Color.tfBlau)
                        .padding(.horizontal, 8).padding(.vertical, 2)
                        .background(Color.tfGelb, in: Capsule())
                }
            }
            Text([g.plattformText, g.modell].compactMap { $0 }.joined(separator: " · "))
                .font(.dm(.subheadline)).foregroundStyle(Color.tfLeise)
            if let e = g.email { Text(Texte.Geraete.angemeldetMit(e)).font(.dm(.subheadline)).foregroundStyle(Color.tfLeise) }
            if let z = Datum.relativ(g.zuletztAm) { Text(Texte.Geraete.zuletzt(z)).font(.dm(.caption)).foregroundStyle(Color.tfLeise) }
            Label(g.push == true && (g.mitteilungen?.zahlungen == true || g.mitteilungen?.auszahlungen == true)
                  ? Texte.Geraete.pushAn : Texte.Geraete.pushAus,
                  systemImage: g.push == true ? "bell.fill" : "bell.slash")
                .font(.dm(.caption))
                .foregroundStyle(Color.tfLeise)
            if darfAbmelden(g) {
                Button(Texte.Geraete.abmelden, role: .destructive) { abmeldenFrage = g }
                    .font(.dm(.subheadline, weight: .semibold))
                    .buttonStyle(.borderless)
                    .padding(.top, 2)
            }
        }
        .padding(.vertical, 4)
    }

    private func laden() async {
        do {
            geraete = try await APIClient.shared.geraete()
            fehler = nil
        } catch is CancellationError {
        } catch {
            fehler = fehlerText(error)
        }
    }

    private func abmelden(_ g: Geraet) {
        Task {
            do {
                try await APIClient.shared.geraetAbmelden(g.id)
                if g.diesesGeraet == true {
                    await app.lokalAbmelden()
                } else {
                    geraete?.removeAll { $0.id == g.id }
                }
            } catch {
                fehler = fehlerText(error)
            }
        }
    }
}
