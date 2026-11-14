import SwiftUI

/// R3: Studio-Angaben (wie die Web-Anmeldung). Autofill-Typen und passende Tastatur je Feld, Prüfung wie im Server.
struct StudioAngabenView: View {
    let weiter: () -> Void

    @Environment(RegistrierungModell.self) private var reg
    @State private var gezeigt = false
    @FocusState private var fokus: StudioFeld?

    private var fehler: [StudioFeld: String] { reg.daten.fehler(felder: StudioFeld.angaben) }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Ueberschrift(Texte.Registrieren.angabenTitel)
                Text(Texte.Registrieren.angabenEinleitung)
                    .font(.dm(.body))
                    .foregroundStyle(Color.tfLeise)
                    .fixedSize(horizontal: false, vertical: true)
                Text(reg.email)
                    .font(.dm(.body, weight: .semibold))
                    .foregroundStyle(Color.tfTinte)
                    .accessibilityLabel("\(Texte.Anmelden.emailLabel): \(reg.email)")

                VStack(alignment: .leading, spacing: 14) {
                    ForEach(StudioFeld.angaben, id: \.self) { f in
                        StudioFeldEingabe(feld: f, text: Binding(get: { reg.daten[f] }, set: { reg.daten[f] = $0; reg.serverFelder.remove(f) }),
                                          fehler: fehlerText(f), fokus: $fokus) {
                            naechstes(nach: f)
                        }
                    }
                }
                .karte()

                if gezeigt && !fehler.isEmpty { FehlerZeile(text: Texte.Registrieren.fehlerOben) }

                Button(Texte.Registrieren.weiter) { weiterTippen() }
                    .buttonStyle(.haupt)
                    .accessibilityIdentifier("angaben-weiter")
            }
            .padding(20)
        }
        .scrollDismissesKeyboard(.interactively)
        .tfHintergrund()
        .navigationTitle(Texte.Registrieren.navTitel)
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { if !reg.serverFelder.isEmpty { gezeigt = true } }
        .toolbar {
            // Ziffern- und Telefontastatur haben keine Eingabetaste
            ToolbarItemGroup(placement: .keyboard) {
                Spacer()
                if let f = fokus, [.plz, .telefon, .studioTelefon].contains(f) {
                    Button(Texte.Registrieren.weiter) { naechstes(nach: f) }
                        .font(.dm(.body, weight: .semibold))
                }
            }
        }
    }

    private func fehlerText(_ f: StudioFeld) -> String? {
        if let t = fehler[f], gezeigt || reg.serverFelder.contains(f) { return t }
        if reg.serverFelder.contains(f) { return Texte.Registrieren.pflicht(f.label) }
        return nil
    }

    private func naechstes(nach f: StudioFeld) {
        let alle = StudioFeld.angaben
        if let i = alle.firstIndex(of: f), i + 1 < alle.count { fokus = alle[i + 1] } else { fokus = nil; weiterTippen() }
    }

    private func weiterTippen() {
        gezeigt = true
        if let erstes = StudioFeld.angaben.first(where: { fehler[$0] != nil }) {
            fokus = erstes
            return
        }
        fokus = nil
        if reg.daten.unterzeichner.trimmingCharacters(in: .whitespaces).isEmpty {
            reg.daten.unterzeichner = reg.daten.bereinigt(.inhaber)
        }
        weiter()
    }
}

/// Ein Eingabefeld der Studio-Angaben mit Beschriftung, Autofill, Tastatur und Fehler darunter
struct StudioFeldEingabe: View {
    let feld: StudioFeld
    @Binding var text: String
    let fehler: String?
    var fokus: FocusState<StudioFeld?>.Binding
    var absenden: () -> Void = {}

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(feld.label).font(.dm(.subheadline, weight: .semibold)).foregroundStyle(Color.tfTinte)
                .accessibilityHidden(true)
            TextField(feld.label, text: $text, prompt: tfPlatzhalter(feld.platzhalter))
                .textContentType(feld.inhaltTyp)
                .keyboardType(feld.tastatur)
                .textInputAutocapitalization(feld.grossschreibung)
                .autocorrectionDisabled(feld.autokorrekturAus)
                .submitLabel(.next)
                .focused(fokus, equals: feld)
                .onSubmit(absenden)
                .font(.dm(.body))
                .padding(12)
                .background(Color.tfHintergrund, in: RoundedRectangle(cornerRadius: 12))
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(fehler == nil ? Color.tfLinie : Color.tfRot, lineWidth: 1.5))
                .accessibilityLabel(feld.label)
                .accessibilityHint(fehler ?? "")
                .accessibilityIdentifier("feld-\(feld.rawValue)")
            if let fehler {
                FehlerZeile(text: fehler)
            }
        }
    }
}
