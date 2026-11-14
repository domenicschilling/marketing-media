import SwiftUI

/// Fragebogen wie onboarding.html (6 Abschnitte), nativ. GET/POST /api/portal/fragebogen mit denselben Feldnamen,
/// damit Web und App denselben Stand zeigen. Unbekannte Felder vom Server bleiben beim Speichern erhalten.
struct FragebogenView: View {
    @State private var mehr = StudioMehrStore.shared
    @State private var werte: [String: FragebogenWert] = [:]
    @State private var geladen = false
    @State private var ladeFehler: String?
    @State private var arbeitet = false
    @State private var fehler: String?
    @State private var gespeichert = false

    // MARK: Felder (Name wie in onboarding.html)

    enum Art {
        case text(platzhalter: String?, max: Int?)
        case lang
        case auswahl([String])
        case haken(standard: Bool)
    }

    struct Feld: Identifiable {
        let name: String
        let titel: String
        let art: Art
        var inhalt: UITextContentType? = nil
        var tastatur: UIKeyboardType = .default
        var id: String { name }
    }

    struct Abschnitt: Identifiable {
        let titel: String
        let felder: [Feld]
        var id: String { titel }
    }

    /// Raten-/Klarna-Wunsch nur, wenn das Studio Klarna anbieten kann (Name ohne Raten-Aussage)
    static func abschnitte(klarna: Bool) -> [Abschnitt] {
        let F = Texte.Frage.self
        var zahlarten: [Feld] = [Feld(name: "w_karte", titel: "Karte, Apple Pay, Google Pay", art: .haken(standard: true))]
        if klarna { zahlarten.append(Feld(name: "w_raten", titel: "Klarna (nach Freigabe)", art: .haken(standard: true))) }
        zahlarten += [
            Feld(name: "w_sepa", titel: "SEPA-Lastschrift", art: .haken(standard: false)),
            Feld(name: "w_paypal", titel: "PayPal (falls verfügbar)", art: .haken(standard: false)),
            Feld(name: "anzahlung_tattoofin", titel: "Sollen Kunden auch Anzahlungen über Tattoofin zahlen können?", art: .auswahl(["ja", "nein, nur Projektpreise"])),
        ]
        return [
            Abschnitt(titel: F.a1, felder: [
                Feld(name: "website", titel: "Website", art: .text(platzhalter: "z. B. www.dein-studio.de", max: nil), inhalt: .URL, tastatur: .URL),
                Feld(name: "instagram", titel: "Instagram", art: .text(platzhalter: "z. B. @deinstudio", max: nil)),
                Feld(name: "rechtsform", titel: "Rechtsform", art: .auswahl(["Einzelunternehmen", "GbR", "UG / GmbH", "andere"])),
                Feld(name: "kleinunternehmer", titel: "Kleinunternehmer (§ 19 UStG)?", art: .auswahl(["nein", "ja", "weiß nicht"])),
                Feld(name: "kontoauszug", titel: "Name auf dem Kontoauszug deiner Kunden (max. 22 Zeichen)", art: .text(platzhalter: "z. B. INK STUDIO BAMBERG", max: 22)),
            ]),
            Abschnitt(titel: F.a2, felder: [
                Feld(name: "preis_gross", titel: "Typischer Preis eines großen Projekts", art: .text(platzhalter: "z. B. 800 bis 2.500 €", max: nil)),
                Feld(name: "projekte_monat", titel: "Wie viele große Projekte pro Monat?", art: .text(platzhalter: "z. B. 4", max: nil), tastatur: .numbersAndPunctuation),
                Feld(name: "anzahlung", titel: "Wie handhabt ihr Anzahlungen heute?", art: .text(platzhalter: "z. B. 100 € bar bei der Beratung, wird verrechnet", max: nil)),
                Feld(name: "raten_nachfrage", titel: "Fragen Kunden heute schon nach Ratenzahlung? Wie oft?", art: .text(platzhalter: nil, max: nil)),
                Feld(name: "z_bar", titel: "Kunden zahlen bisher: Bar", art: .haken(standard: false)),
                Feld(name: "z_ec", titel: "EC-Karte", art: .haken(standard: false)),
                Feld(name: "z_kredit", titel: "Kreditkarte", art: .haken(standard: false)),
                Feld(name: "z_paypal", titel: "PayPal", art: .haken(standard: false)),
                Feld(name: "z_ueberweisung", titel: "Überweisung", art: .haken(standard: false)),
                Feld(name: "z_terminal", titel: "Kartenterminal vorhanden (z. B. SumUp)", art: .haken(standard: false)),
            ]),
            Abschnitt(titel: F.a3, felder: zahlarten),
            Abschnitt(titel: F.a4, felder: [
                Feld(name: "logo_quelle", titel: "Logo schicken wir per", art: .auswahl(["WhatsApp", "E-Mail", "nehmt das von Instagram"])),
                Feld(name: "farbe", titel: "Studio-Farbe (falls vorhanden)", art: .text(platzhalter: "z. B. schwarz / gold", max: nil)),
            ]),
            Abschnitt(titel: F.a5, felder: [
                Feld(name: "team", titel: "Wer soll an der Schulung teilnehmen (ca. 30 Min.)?", art: .text(platzhalter: nil, max: nil)),
                Feld(name: "zustaendig", titel: "Wer erstellt bei euch die Zahlungslinks?", art: .text(platzhalter: nil, max: nil)),
                Feld(name: "termin", titel: "Wunschtermin für Test und Schulung", art: .text(platzhalter: nil, max: nil)),
            ]),
            Abschnitt(titel: F.a6, felder: [
                Feld(name: "aufkleber", titel: "Fensteraufkleber", art: .auswahl(["innen an die Scheibe", "außen", "keiner"])),
                Feld(name: "flyer", titel: "Flyer A6 (Stück)", art: .auswahl(["100", "250", "500", "keine"])),
                Feld(name: "sonstiges", titel: "Sonst noch etwas?", art: .lang),
            ]),
        ]
    }

    private var abschnitte: [Abschnitt] { Self.abschnitte(klarna: mehr.studio?.hatKlarna ?? false) }

    var body: some View {
        Group {
            if geladen {
                formular
            } else if let ladeFehler {
                FehlerAnsicht(text: ladeFehler) { Task { await laden() } }
            } else {
                LadeAnsicht()
            }
        }
        .tfHintergrund()
        .navigationTitle(Texte.Frage.titel)
        .navigationBarTitleDisplayMode(.inline)
        .task { await laden() }
    }

    private var formular: some View {
        TFFormular {
            Section {
                Text(Texte.Frage.intro).font(.dm(.subheadline)).foregroundStyle(Color.tfLeise)
                if let d = Datum.tagUhrzeit(werte["updatedAt"]?.text) {
                    Text(Texte.Frage.zuletzt(d)).font(.dm(.footnote, weight: .semibold)).foregroundStyle(Color.tfTinte)
                }
            }
            ForEach(abschnitte) { a in
                Section {
                    ForEach(a.felder) { f in feldAnsicht(f) }
                } header: {
                    Text(a.titel)
                }
            }
            Section {
                if let fehler { FehlerZeile(text: fehler) }
                if gespeichert {
                    Label(Texte.Frage.danke, systemImage: "checkmark.circle.fill")
                        .foregroundStyle(Color.tfGruen)
                        .font(.dm(.body, weight: .semibold))
                }
                Button {
                    senden()
                } label: {
                    if arbeitet { ProgressView().tint(Color.tfBlau) } else { Text(Texte.Frage.senden) }
                }
                .buttonStyle(.haupt)
                .disabled(arbeitet)
                .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                .sensoryFeedback(.success, trigger: gespeichert)
            }
        }
        .font(.dm(.body))
        .scrollContentBackground(.hidden)
        .scrollDismissesKeyboard(.interactively)
    }

    @ViewBuilder
    private func feldAnsicht(_ f: Feld) -> some View {
        switch f.art {
        case .text(let platzhalter, let max):
            VStack(alignment: .leading, spacing: 4) {
                Text(f.titel).font(.dm(.subheadline, weight: .semibold)).foregroundStyle(Color.tfTinte)
                TextField(f.titel, text: textBindung(f.name, max: max), prompt: tfPlatzhalter(platzhalter ?? f.titel))
                    .textContentType(f.inhalt)
                    .keyboardType(f.tastatur)
                    .textInputAutocapitalization(f.tastatur == .URL ? .never : .sentences)
                    .autocorrectionDisabled(f.tastatur == .URL)
                    .font(.dm(.body))
            }
            .padding(.vertical, 2)
        case .lang:
            VStack(alignment: .leading, spacing: 4) {
                Text(f.titel).font(.dm(.subheadline, weight: .semibold)).foregroundStyle(Color.tfTinte)
                TextField(f.titel, text: textBindung(f.name, max: 4000), prompt: tfPlatzhalter(f.titel), axis: .vertical)
                    .lineLimit(3...10)
                    .font(.dm(.body))
            }
            .padding(.vertical, 2)
        case .auswahl(let optionen):
            Picker(selection: auswahlBindung(f.name, optionen)) {
                ForEach(optionen, id: \.self) { Text($0).tag($0) }
            } label: {
                Text(f.titel).font(.dm(.body)).foregroundStyle(Color.tfTinte)
            }
            .pickerStyle(.menu)
            .tint(Color.tfAkzent)
        case .haken(let standard):
            Toggle(isOn: hakenBindung(f.name, standard: standard)) {
                Text(f.titel).font(.dm(.body)).foregroundStyle(Color.tfTinte)
            }
            .tint(Color.tfGruen)
        }
    }

    private func textBindung(_ name: String, max: Int?) -> Binding<String> {
        Binding {
            werte[name]?.text ?? ""
        } set: { neu in
            werte[name] = .text(max.map { String(neu.prefix($0)) } ?? neu)
        }
    }

    /// Wie ein HTML-select: ohne gespeicherten Wert gilt die erste Option
    private func auswahlBindung(_ name: String, _ optionen: [String]) -> Binding<String> {
        Binding {
            let w = werte[name]?.text ?? ""
            return optionen.contains(w) ? w : optionen[0]
        } set: { werte[name] = .text($0) }
    }

    private func hakenBindung(_ name: String, standard: Bool) -> Binding<Bool> {
        Binding {
            // Noch nie gespeichert: Voreinstellung wie im Web (Karte und Klarna angehakt)
            werte[name]?.jaNein ?? (werte["updatedAt"] == nil ? standard : false)
        } set: { werte[name] = .jaNein($0) }
    }

    private func laden() async {
        ladeFehler = nil
        async let s: Void = mehr.laden(wennAelterAls: 60)
        do {
            let d = try await APIClient.shared.fragebogen()
            _ = await s
            werte = d.werte
            geladen = true
        } catch is CancellationError {
        } catch {
            _ = await s
            ladeFehler = fehlerText(error)
        }
    }

    /// Alle Felder senden (wie das Web-Formular): auch nicht geänderte Auswahl- und Häkchen-Felder mit ihrem sichtbaren Wert
    private func senden() {
        var alle = werte
        for a in abschnitte {
            for f in a.felder {
                switch f.art {
                case .text, .lang: alle[f.name] = .text(werte[f.name]?.text ?? "")
                case .auswahl(let o): alle[f.name] = .text(auswahlBindung(f.name, o).wrappedValue)
                case .haken(let st): alle[f.name] = .jaNein(hakenBindung(f.name, standard: st).wrappedValue)
                }
            }
        }
        arbeitet = true
        fehler = nil
        gespeichert = false
        Task {
            defer { arbeitet = false }
            do {
                try await APIClient.shared.fragebogenSenden(FragebogenDaten(werte: alle))
                alle["updatedAt"] = .text(ISO8601DateFormatter().string(from: .now))
                werte = alle
                gespeichert = true
                await mehr.laden()
            } catch {
                fehler = fehlerText(error)
            }
        }
    }
}
