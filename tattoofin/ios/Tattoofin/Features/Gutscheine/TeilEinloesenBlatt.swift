import SwiftUI

/// Einlösen eines teilbaren Gutscheins: Betrag (leer = alles, nicht mehr als der Rest) und Notiz.
/// Nur, wenn der Server Teil-Einlösung kann (gutschein.teilbar == true). Sonst bleibt die Frage „Gutschein einlösen?“ (ganz).
struct TeilEinloesenBlatt: View {
    let rest: Int
    let abgelaufen: Bool
    let einloesen: (TeilEinloesung, String?) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var betrag = ""
    @State private var notiz = ""
    @State private var gezeigt = false
    @FocusState private var betragFokus: Bool

    private var pruefung: Result<TeilEinloesung, TeilEinloesung.Fehler> { TeilEinloesung.pruefen(betrag, rest: rest) }

    private var fehlerText: String? {
        guard case let .failure(f) = pruefung else { return nil }
        switch f {
        case .ungueltig: return Texte.GutscheinWert.fehlerUngueltig
        case .null: return Texte.GutscheinWert.fehlerNull
        case let .zuViel(r): return Texte.GutscheinWert.fehlerZuViel(r)
        }
    }

    private var knopfText: String {
        if case let .success(.betrag(c)) = pruefung { return Texte.GutscheinWert.betragEinloesen(c) }
        return Texte.GutscheinWert.allesEinloesen(rest)
    }

    var body: some View {
        NavigationStack {
            TFFormular {
                Section {
                    Text(Texte.GutscheinWert.noch(rest))
                        .font(.dm(.title3, weight: .bold))
                        .foregroundStyle(Color.tfTinte)
                        .fixedSize(horizontal: false, vertical: true)
                    if abgelaufen {
                        Text(Texte.Gutscheine.abgelaufenHinweis).font(.dm(.subheadline)).foregroundStyle(Color.tfLeise)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }

                Section {
                    TextField(Texte.GutscheinWert.betrag, text: $betrag, prompt: tfPlatzhalter(Texte.GutscheinWert.betrag))
                        .keyboardType(.decimalPad)
                        .focused($betragFokus)
                        .accessibilityLabel(Texte.GutscheinWert.betrag)
                        .accessibilityIdentifier("gutschein-teilbetrag")
                    TextField(Texte.Gutscheine.notizOptional, text: $notiz, prompt: tfPlatzhalter(Texte.Gutscheine.notizOptional))
                        .accessibilityLabel(Texte.Gutscheine.notizOptional)
                    if let fehlerText, gezeigt || !betrag.isEmpty {
                        FehlerZeile(text: fehlerText)
                    }
                } footer: {
                    ListenFuss(Texte.GutscheinWert.betragHinweis)
                }

                Section {
                    Button {
                        gezeigt = true
                        guard case let .success(auswahl) = pruefung else { return }
                        betragFokus = false
                        einloesen(auswahl, notiz.leerAlsNil)
                    } label: {
                        Text(knopfText)
                    }
                    .buttonStyle(.haupt)
                    .disabled(fehlerText != nil)
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                    .accessibilityIdentifier("gutschein-teil-einloesen")
                }
            }
            .font(.dm(.body))
            .scrollContentBackground(.hidden)
            .tfHintergrund()
            .navigationTitle(Texte.GutscheinWert.blattTitel)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button(Texte.Allgemein.abbrechen) { dismiss() } }
            }
        }
    }
}
