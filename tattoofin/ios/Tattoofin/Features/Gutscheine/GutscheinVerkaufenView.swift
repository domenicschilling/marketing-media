import SwiftUI

/// Gutschein verkaufen: Käufer und E-Mail sind Pflicht. Bezahlt wird per Karte, Apple Pay oder Google Pay (nie Klarna).
struct GutscheinVerkaufenView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(PortalStore.self) private var portal
    @State private var betrag = BetragEingabe()
    @State private var kaeufer = ""
    @State private var email = ""
    @State private var empfaenger = ""
    @State private var nachricht = ""
    @State private var sendet = false
    @State private var fehler: String?
    @State private var erstellt: ZahlungErstellt?

    static let maxNachricht = 240

    private var emailOk: Bool {
        let e = email.trimmingCharacters(in: .whitespaces)
        return e.contains("@") && e.contains(".") && !e.contains(" ")
    }

    /// Sobald ein gültiger Wert eingetippt ist: sagen, welches Pflichtfeld noch fehlt (Texte wie der Server)
    private var pflichtHinweis: String? {
        guard let c = betrag.cent, c >= portal.config.min, c <= portal.config.max else { return nil }
        if kaeufer.leerAlsNil == nil { return Texte.Gutscheine.pflichtKaeufer }
        if email.leerAlsNil == nil { return Texte.Gutscheine.pflichtEmail }
        if !emailOk { return Texte.Gutscheine.emailUngueltig }
        return nil
    }

    private var bereit: Bool {
        guard let c = betrag.cent else { return false }
        return c >= portal.config.min && c <= portal.config.max && kaeufer.leerAlsNil != nil && emailOk && !sendet
    }

    var body: some View {
        NavigationStack {
            TFFormular {
                Section {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(betrag.anzeige)
                            .font(.luckiest(40, relativeTo: .largeTitle))
                            .foregroundStyle(Color.tfTinte)
                            .frame(maxWidth: .infinity)
                            .accessibilityLabel(Texte.Gutscheine.wert)
                            .accessibilityValue(betrag.cent.map(Euro.gesprochen) ?? "0 Euro")
                        Text(Texte.Kasse.grenzen(min: portal.config.min, max: portal.config.max))
                            .font(.dm(.footnote))
                            .foregroundStyle(Color.tfLeise)
                            .frame(maxWidth: .infinity)
                    }
                    Ziffernblock(eingabe: $betrag)
                        .listRowInsets(EdgeInsets(top: 8, leading: 8, bottom: 8, trailing: 8))
                } header: {
                    ListenKopf(Texte.Gutscheine.wert)
                }

                Section {
                    // Daten des Käufers, nicht des Studios: kein Autofill mit den eigenen Kontaktdaten
                    TextField(Texte.Gutscheine.kaeufer, text: $kaeufer, prompt: tfPlatzhalter(Texte.Gutscheine.kaeufer))
                        .textInputAutocapitalization(.words)
                    TextField(Texte.Gutscheine.kaeuferEmail, text: $email, prompt: tfPlatzhalter(Texte.Gutscheine.kaeuferEmail))
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                } header: {
                    ListenKopf(Texte.Gutscheine.kaeuferAbschnitt)
                } footer: {
                    ListenFuss(Texte.Gutscheine.kaeuferHinweis)
                }

                Section {
                    TextField(Texte.Gutscheine.empfaenger, text: $empfaenger, prompt: tfPlatzhalter(Texte.Gutscheine.empfaenger))
                    TextField(Texte.Gutscheine.nachricht, text: $nachricht, prompt: tfPlatzhalter(Texte.Gutscheine.nachricht), axis: .vertical)
                        .lineLimit(3...6)
                        .onChange(of: nachricht) { _, neu in
                            if neu.count > Self.maxNachricht { nachricht = String(neu.prefix(Self.maxNachricht)) }
                        }
                    Text(Texte.Gutscheine.zeichen(nachricht.count, Self.maxNachricht))
                        .font(.dm(.caption))
                        .foregroundStyle(Color.tfLeise)
                } header: {
                    ListenKopf(Texte.Gutscheine.optional)
                }

                Section {
                    Label(Texte.Gutscheine.zahlarten, systemImage: "creditcard")
                        .font(.dm(.subheadline))
                        .foregroundStyle(Color.tfTinte)
                    if let fehler { FehlerZeile(text: fehler) } else if let pflichtHinweis { FehlerZeile(text: pflichtHinweis) }
                }

                // Knopf in eigenem Abschnitt ohne Kartenhintergrund
                Section {
                    Button {
                        erstellen()
                    } label: {
                        if sendet { ProgressView().tint(Color.tfBlau) } else { Text(Texte.Gutscheine.linkErstellen) }
                    }
                    .buttonStyle(.haupt)
                    .disabled(!bereit)
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                }
            }
            .font(.dm(.body))
            .scrollContentBackground(.hidden)
            .tfHintergrund()
            .navigationTitle(Texte.Gutscheine.verkaufenTitel)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button(Texte.Allgemein.abbrechen) { dismiss() } }
            }
            .sheet(item: $erstellt, onDismiss: { dismiss() }) { ZahlungslinkSheet(erstellt: $0) }
        }
    }

    private func erstellen() {
        guard let cent = betrag.cent else { return }
        sendet = true
        fehler = nil
        Task {
            defer { sendet = false }
            do {
                let r = try await APIClient.shared.zahlungErstellen(.init(
                    betrag: Euro.fuerServer(cent), art: "gutschein", kunde: kaeufer.leerAlsNil,
                    email: email.trimmingCharacters(in: .whitespaces).lowercased(), beschreibung: nil, sitzungen: nil,
                    empfaenger: empfaenger.leerAlsNil, nachricht: nachricht.leerAlsNil))
                portal.aktualisieren(r.zahlung)
                erstellt = r
            } catch {
                fehler = fehlerText(error)
            }
        }
    }
}
