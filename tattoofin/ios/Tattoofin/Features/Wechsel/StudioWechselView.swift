import SwiftUI

/// Studio-Wechsel (Version 1.2, Auftrag Domenic 23.11.2026): Liste der Studios der angemeldeten Adresse mit Name, Ort und Rolle.
/// Das aktuelle Studio ist markiert. Antippen wechselt ohne neuen Code. Beim Öffnen lädt die Liste neu (neue Team-Adresse erscheint).
struct StudioWechselView: View {
    @Environment(AppState.self) private var app
    @Environment(\.dismiss) private var dismiss
    @State private var fehler: String?
    @State private var ziel: String?

    var body: some View {
        NavigationStack {
            TFListe {
                Section {
                    ForEach(app.studios) { e in
                        zeile(e)
                    }
                } header: {
                    if let email = app.sitzung?.email {
                        Text(Texte.Wechsel.angemeldetAls(email))
                            .font(.dm(.subheadline))
                            .foregroundStyle(Color.tfLeise)
                            .textCase(nil)
                    }
                }
                // Fehler und Hinweis als eigene Zeilen (nicht im Abschnitts-Fuß: dort wächst die Schrift nicht voll mit)
                Section {
                    if let fehler { FehlerZeile(text: fehler) }
                    Text(Texte.Wechsel.fussnote)
                        .font(.dm(.footnote))
                        .foregroundStyle(Color.tfLeise)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .font(.dm(.body))
            .scrollContentBackground(.hidden)
            .tfHintergrund()
            .navigationTitle(Texte.Wechsel.titel)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(Texte.Wechsel.schliessen) { dismiss() }
                        .accessibilityIdentifier("wechsel-fertig")
                }
            }
            .task { await app.studiosAktualisieren() }
        }
        .accessibilityIdentifier("studio-wechsel-liste")
    }

    private func zeile(_ e: StudioEintrag) -> some View {
        let aktuell = e.id == app.sitzung?.studioId
        let rolle = e.istInhaber ? Texte.Wechsel.rolleInhaber : Texte.Wechsel.rolleTeam
        return Button {
            guard !aktuell else { dismiss(); return }
            waehlen(e)
        } label: {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 3) {
                    Text(e.firma)
                        .font(.dm(.headline, weight: .bold))
                        .foregroundStyle(Color.tfTinte)
                        .fixedSize(horizontal: false, vertical: true)
                    Text(Texte.Wechsel.zeile(ort: e.ort, rolle: rolle))
                        .font(.dm(.subheadline))
                        .foregroundStyle(Color.tfLeise)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 8)
                if ziel == e.id {
                    ProgressView().accessibilityLabel(Texte.Wechsel.wechselt)
                } else if aktuell {
                    Label(Texte.Wechsel.aktuell, systemImage: "checkmark.circle.fill")
                        .labelStyle(.iconOnly)
                        .font(.title3)
                        .foregroundStyle(Color.tfGruen)
                }
            }
            .padding(.vertical, 6)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(app.wechseltGerade)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(e.firma), \(Texte.Wechsel.zeile(ort: e.ort, rolle: rolle))")
        .accessibilityValue(aktuell ? Texte.Wechsel.aktuell : "")
        .accessibilityAddTraits(aktuell ? [.isButton, .isSelected] : .isButton)
        .accessibilityIdentifier("studio-\(e.id)")
    }

    private func waehlen(_ e: StudioEintrag) {
        fehler = nil
        ziel = e.id
        Task {
            defer { ziel = nil }
            do {
                try await app.wechseln(zu: e.id)
                app.wechselHinweis = Texte.Wechsel.gewechselt(e.firma)
                dismiss()
            } catch is CancellationError {
            } catch {
                fehler = fehlerText(error)
            }
        }
    }
}

/// Knopf „Studio wechseln“ oben links in jedem Tab, nur bei mehr als einem Studio. Zeigt den Namen des aktuellen Studios.
struct StudioWechselKnopf: ToolbarContent {
    @Environment(AppState.self) private var app
    @Binding var offen: Bool

    var body: some ToolbarContent {
        if app.mehrereStudios {
            ToolbarItem(placement: .topBarLeading) {
                Button {
                    offen = true
                } label: {
                    HStack(spacing: 5) {
                        Image(systemName: "arrow.left.arrow.right.circle")
                        Text(app.sitzung?.firma ?? Texte.Wechsel.knopf)
                            .lineLimit(1)
                            .truncationMode(.tail)
                            .frame(maxWidth: 130, alignment: .leading)
                    }
                    .font(.dm(.subheadline, weight: .semibold))
                }
                .accessibilityLabel(Texte.Wechsel.knopf)
                .accessibilityHint(Texte.Wechsel.knopfHinweis(app.sitzung?.firma ?? ""))
                .accessibilityIdentifier("studio-wechsel-knopf")
            }
        }
    }
}

/// Knopf oben + Liste als Blatt für einen Tab
struct StudioWechselLeiste: ViewModifier {
    @State private var offen = false

    func body(content: Content) -> some View {
        content
            .toolbar { StudioWechselKnopf(offen: $offen) }
            .sheet(isPresented: $offen) { StudioWechselView() }
    }
}

extension View {
    /// In jedem Tab innerhalb des NavigationStack anwenden (an die Ansicht mit navigationTitle)
    func studioWechsler() -> some View { modifier(StudioWechselLeiste()) }
}
