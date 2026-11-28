import SwiftUI

/// Bildschirm 16: Angemeldete Geräte. Inhaber können jedes Gerät abmelden, Team-Mitglieder nur ihre eigenen.
/// Den Namen dieses Geräts kann man ändern (iOS liefert Apps nur „iPhone“, nicht den eigenen Gerätenamen).
struct GeraeteView: View {
    @Environment(AppState.self) private var app
    @State private var geraete: [Geraet]?
    @State private var fehler: String?
    @State private var abmeldenFrage: Geraet?
    @State private var umbenennen = false
    @State private var neuerName = ""

    private var istInhaber: Bool { app.sitzung?.istInhaber ?? false }

    @Environment(\.dynamicTypeSize) private var schrift
    var body: some View {
        TFListe {
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
                    ListenFuss(Texte.Geraete.hinweis)
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
        .tfHarteKanteOben()  // Abnahme 1.1, Runde 3
        .navigationBarTitleDisplayMode(.inline)
        .task { await laden() }
        .refreshable { await laden() }
        .alert(Texte.Geraete.frage(abmeldenFrage?.name ?? ""), isPresented: Binding(
            get: { abmeldenFrage != nil }, set: { if !$0 { abmeldenFrage = nil } })) {
            Button(Texte.Geraete.abmelden, role: .destructive) { if let g = abmeldenFrage { abmelden(g) } }
            Button(Texte.Allgemein.abbrechen, role: .cancel) {}
        }
        .alert(Texte.Geraete.umbenennenTitel, isPresented: $umbenennen) {
            TextField(Texte.Geraete.umbenennenTitel, text: $neuerName, prompt: Text(Texte.Geraete.namePlatzhalter))
                .accessibilityLabel(Texte.Geraete.umbenennenTitel)
            Button(Texte.Geraete.speichern) { nameSpeichern() }
                .disabled(neuerName.leerAlsNil == nil)
            Button(Texte.Allgemein.abbrechen, role: .cancel) {}
        } message: {
            Text(Texte.Geraete.umbenennenHinweis)
        }
    }

    @ViewBuilder private func knoepfe(_ g: Geraet) -> some View {
        if g.diesesGeraet == true {
            Button {
                neuerName = g.name ?? ""
                umbenennen = true
            } label: {
                Text(Texte.Geraete.umbenennen).fixedSize().frame(minHeight: 44, alignment: .leading).contentShape(Rectangle())
            }
            .foregroundStyle(Color.tfTinte)
        }
        if darfAbmelden(g) {
            Button(role: .destructive) { abmeldenFrage = g } label: {
                Text(Texte.Geraete.abmelden).fixedSize().frame(minHeight: 44, alignment: .leading).contentShape(Rectangle())
            }
        }
    }

    private func darfAbmelden(_ g: Geraet) -> Bool {
        istInhaber || g.email == nil || g.diesesGeraet == true || g.email?.lowercased() == app.sitzung?.email.lowercased()
    }

    private func zeile(_ g: Geraet) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            // Bei großer Schrift steht der Chip unter dem Namen statt daneben (Runde 3: Chip zweizeilig bei AX5)
            let kopf = schrift.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 4)) : AnyLayout(HStackLayout())
            kopf {
                Text(g.name ?? Texte.Geraete.ohneName).font(.dm(.body, weight: .semibold)).foregroundStyle(Color.tfTinte)
                if g.diesesGeraet == true {
                    Text(Texte.Geraete.diesesGeraet)
                        .font(.dm(.caption, weight: .bold))
                        .foregroundStyle(Color.tfBlau)
                        .lineLimit(1)
                        .padding(.horizontal, 8).padding(.vertical, 2)
                        .background(Color.tfGelb, in: Capsule())
                        .dynamicTypeSize(...DynamicTypeSize.accessibility2)
                }
            }
            // Technische Kennungen wie „iPhone18,3“ sagen dem Studio nichts → weglassen
            Text([g.plattformText, g.modell.flatMap { $0.range(of: #"^[A-Za-z]+\d+,\d+$"#, options: .regularExpression) == nil ? $0 : nil }]
                    .compactMap { $0 }.joined(separator: " · "))
                .font(.dm(.subheadline)).foregroundStyle(Color.tfLeise)
            if let e = g.email { Text(Texte.Geraete.angemeldetMit(Umbruch.email(e))).font(.dm(.subheadline)).foregroundStyle(Color.tfLeise) }
            // Der Server schreibt „zuletzt aktiv“ höchstens stündlich; dieses Gerät ist gerade in Benutzung
            if g.diesesGeraet == true {
                Text(Texte.Geraete.geradeAktiv).font(.dm(.caption)).foregroundStyle(Color.tfLeise)
            } else if let z = Datum.relativ(g.zuletztAm) {
                Text(Texte.Geraete.zuletzt(z)).font(.dm(.caption)).foregroundStyle(Color.tfLeise)
            }
            Label(g.push == true && (g.mitteilungen?.zahlungen == true || g.mitteilungen?.auszahlungen == true)
                  ? Texte.Geraete.pushAn : Texte.Geraete.pushAus,
                  systemImage: g.push == true ? "bell.fill" : "bell.slash")
                .font(.dm(.caption))
                .foregroundStyle(Color.tfLeise)
            // Knöpfe: nebeneinander, wenn sie passen, sonst untereinander; jede Tippfläche mindestens 44 pt (Runde 3)
            ViewThatFits(in: .horizontal) {
                HStack(spacing: 20) { knoepfe(g) }
                VStack(alignment: .leading, spacing: 0) { knoepfe(g) }
            }
            .font(.dm(.subheadline, weight: .semibold))
            .buttonStyle(.borderless)
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

    private func nameSpeichern() {
        guard let name = neuerName.leerAlsNil else { return }
        Task {
            do {
                let neu = try await APIClient.shared.geraetAendern(.init(name: String(name.prefix(60))))
                if let i = geraete?.firstIndex(where: { $0.id == neu.id }) { geraete?[i] = neu }
                fehler = nil
            } catch {
                fehler = fehlerText(error)
            }
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
