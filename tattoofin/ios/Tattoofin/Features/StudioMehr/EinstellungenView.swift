import SwiftUI

/// Einstellungen wie im Web-Dashboard (#einstellungen): Anzahlungsbedingungen, Anzahlung als Ausweg bei Klarna-Ablehnung (10–50 %),
/// Hinweis auf der Zahlseite, E-Mail für Benachrichtigungen. Ändern darf nur der Inhaber (Server: PATCH /api/portal/kontakt, nur_inhaber).
/// Die Klarna-Abschnitte erscheinen nur, wenn das Studio Klarna gerade anbietet (wie data-klarna im Web).
struct EinstellungenView: View {
    @Environment(AppState.self) private var app
    @State private var mehr = StudioMehrStore.shared

    @State private var bedingungen = ""
    @State private var ausweichAn = false
    @State private var ausweichProzent = 30
    @State private var hinweisAn = false
    @State private var email = ""
    @State private var geladen = false

    @State private var arbeitet: Bereich?
    @State private var erledigt: Bereich?
    @State private var fehler: [Bereich: String] = [:]

    enum Bereich: Hashable { case bedingungen, ausweich, hinweis, email }

    private var istInhaber: Bool { app.sitzung?.istInhaber ?? false }
    private var studio: StudioMehr? { mehr.studio }

    var body: some View {
        Group {
            if studio != nil {
                formular
            } else if let f = mehr.fehler {
                FehlerAnsicht(text: f) { Task { await mehr.laden() } }
            } else {
                LadeAnsicht()
            }
        }
        .tfHintergrund()
        .navigationTitle(Texte.Einst.titel)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await mehr.laden()
            uebernehmen()
        }
    }

    private var formular: some View {
        TFFormular {
            if !istInhaber {
                Section {
                    HinweisKarte(text: Texte.Einst.nurInhaber, symbol: "person.fill")
                        .listRowInsets(EdgeInsets())
                        .listRowBackground(Color.clear)
                }
            }

            Section {
                Text(Texte.Einst.anzahlungText).font(.dm(.footnote)).foregroundStyle(Color.tfLeise)
                TextField(Texte.Einst.anzahlungFeld, text: $bedingungen, prompt: tfPlatzhalter(Texte.Einst.anzahlungFeld), axis: .vertical)
                    .lineLimit(4...12)
                    .textInputAutocapitalization(.sentences)
                    .font(.dm(.body))
                    .onChange(of: bedingungen) { _, neu in if neu.count > 1000 { bedingungen = String(neu.prefix(1000)) } }
                    .accessibilityLabel(Texte.Einst.anzahlungFeld)
                    .disabled(!istInhaber)
                Text(Texte.Einst.zeichen(bedingungen.count) + (bedingungen.leerAlsNil != nil && bedingungen.count < 30 ? " · " + Texte.Einst.anzahlungKurz : ""))
                    .font(.dm(.caption))
                    .foregroundStyle(Color.tfLeise)
                speichernZeile(.bedingungen) {
                    .init(anzahlungsbedingungen: bedingungen.trimmingCharacters(in: .whitespacesAndNewlines))
                }
            } header: {
                Text(Texte.Einst.anzahlungTitel)
            }

            if studio?.hatKlarna == true {
                Section {
                    Text(Texte.Einst.ausweichText).font(.dm(.footnote)).foregroundStyle(Color.tfLeise)
                    Toggle(Texte.Einst.ausweichAn, isOn: $ausweichAn).disabled(!istInhaber)
                    Stepper(value: $ausweichProzent, in: 10...50, step: 5) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(Texte.Einst.ausweichHoehe)
                            Text(Texte.Einst.prozent(ausweichProzent)).font(.dm(.subheadline, weight: .semibold))
                        }
                    }
                    .disabled(!ausweichAn || !istInhaber)
                    .accessibilityValue(Texte.Einst.prozent(ausweichProzent))
                    speichernZeile(.ausweich) {
                        .init(ausweichAnzahlung: .init(an: ausweichAn, prozent: ausweichProzent))
                    }
                } header: {
                    Text(Texte.Einst.ausweichTitel)
                }

                Section {
                    Text(Texte.Einst.hinweisText).font(.dm(.footnote)).foregroundStyle(Color.tfLeise)
                    Toggle(Texte.Einst.hinweisAn, isOn: $hinweisAn).disabled(!istInhaber)
                    speichernZeile(.hinweis) { .init(zahlartenHinweis: hinweisAn) }
                } header: {
                    Text(Texte.Einst.hinweisTitel)
                } footer: {
                    // Pflichtsatz wie im Web (klein, aber lesbar)
                    Text(KlarnaTexte.pflichtsatz).font(.dm(.caption2)).foregroundStyle(Color.tfLeise)
                }
            }

            Section {
                TextField(Texte.Einst.emailFeld, text: $email, prompt: tfPlatzhalter(Texte.Einst.emailFeld))
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .font(.dm(.body))
                    .accessibilityLabel(Texte.Einst.emailFeld)
                    .disabled(!istInhaber)
                speichernZeile(.email, pruefen: { emailOK ? nil : Texte.Einst.emailFalsch }) {
                    .init(email: email.trimmingCharacters(in: .whitespaces).lowercased())
                }
            } header: {
                Text(Texte.Einst.emailTitel)
            }
        }
        .font(.dm(.body))
        .scrollContentBackground(.hidden)
        .scrollDismissesKeyboard(.interactively)
        .refreshable {
            await mehr.laden()
            uebernehmen()
        }
    }

    private var emailOK: Bool {
        email.trimmingCharacters(in: .whitespaces).range(of: #"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$"#, options: .regularExpression) != nil
    }

    @ViewBuilder
    private func speichernZeile(_ b: Bereich, pruefen: (() -> String?)? = nil, aenderung: @escaping () -> APIClient.KontaktAenderung) -> some View {
        if let f = fehler[b] { FehlerZeile(text: f) }
        // Team: nur lesen, kein Speichern-Knopf
        if istInhaber { speichernKnopf(b, pruefen: pruefen, aenderung: aenderung) }
    }

    private func speichernKnopf(_ b: Bereich, pruefen: (() -> String?)?, aenderung: @escaping () -> APIClient.KontaktAenderung) -> some View {
        Button {
            if let meldung = pruefen?() { fehler[b] = meldung; return }
            speichern(b, aenderung())
        } label: {
            HStack {
                if erledigt == b {
                    Label(Texte.Einst.gespeichert, systemImage: "checkmark.circle.fill").foregroundStyle(Color.tfGruen)
                } else {
                    Text(Texte.Einst.speichern).font(.dm(.body, weight: .semibold)).foregroundStyle(Color.tfTinte)
                }
                if arbeitet == b { Spacer(); ProgressView() }
            }
        }
        .disabled(arbeitet != nil)
        .accessibilityIdentifier("speichern-\(b)")
        .sensoryFeedback(.success, trigger: erledigt == b)
    }

    private func speichern(_ b: Bereich, _ a: APIClient.KontaktAenderung) {
        arbeitet = b
        fehler[b] = nil
        erledigt = nil
        Task {
            defer { arbeitet = nil }
            do {
                let s = try await APIClient.shared.kontaktAendern(a)
                mehr.uebernehmen(s)
                uebernehmen()
                erledigt = b
            } catch {
                fehler[b] = fehlerText(error)
            }
        }
    }

    /// Werte vom Server in die Felder
    private func uebernehmen() {
        guard let s = studio else { return }
        // Der Server liefert den Standardtext, wenn das Studio keine eigenen Bedingungen hat. Den zeigen wir wie im Web im Feld.
        bedingungen = s.anzahlungsbedingungen ?? ""
        ausweichAn = s.ausweichAnzahlung?.an ?? false
        let p = s.ausweichAnzahlung?.prozent ?? 30
        ausweichProzent = min(50, max(10, p))
        hinweisAn = s.zahlartenHinweis ?? false
        email = s.benachrichtigung?.email ?? ""
        geladen = true
    }
}
