import SwiftUI

/// Maske „Adresse deiner Zahlseite“ (wie die Karte im Web, POST /api/portal/adresse, nur Inhaber).
/// Vorbefüllt mit dem Vorschlag aus dem Stripe-Konto; „Stimmt so“ bestätigt ihn, geänderte Werte gelten als eigene Angabe.
/// Erreichbar aus der gesperrten Kasse (Blatt) und aus dem Checklisten-Punkt „adresse“ (Unterseite).
struct AdresseView: View {
    /// true: als eigenes Blatt (mit „Abbrechen“ oben links)
    var alsBlatt = false

    @Environment(\.dismiss) private var dismiss
    @Environment(PortalStore.self) private var portal
    @State private var strasse = ""
    @State private var plz = ""
    @State private var ort = ""
    @State private var original: [String] = ["", "", ""]
    @State private var geladen = false
    @State private var sendet = false
    @State private var fehler: String?
    @State private var erfolg = 0

    private var studio: Studio? { portal.studio }
    private var deutschland: Bool { studio?.adresseInDeutschland ?? true }
    private var stimmtSo: Bool { AdresseKnopf.stimmtSo(vorschlag: studio?.adresseIstVorschlag == true, felder: [strasse, plz, ort], original: original) }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(Texte.Kasse11.adresseMaskeText)
                    .font(.dm(.body))
                    .foregroundStyle(Color.tfTinte)
                    .fixedSize(horizontal: false, vertical: true)
                if studio?.adresseIstPrivat == true {
                    HinweisKarte(text: Texte.Kasse11.adressePrivatText, symbol: "info.circle.fill")
                }
                VStack(alignment: .leading, spacing: 12) {
                    Eingabefeld(titel: Texte.Kasse11.adresseStrasse, text: $strasse, platzhalter: Texte.Kasse11.adresseStrasseBeispiel,
                                inhalt: .streetAddressLine1, grossschreibung: .words)
                        .accessibilityIdentifier("adresse-strasse")
                    Eingabefeld(titel: Texte.Kasse11.adressePlz, text: $plz, platzhalter: Texte.Kasse11.adressePlzBeispiel,
                                inhalt: .postalCode, tastatur: deutschland ? .numberPad : .default, grossschreibung: .characters)
                        .accessibilityIdentifier("adresse-plz")
                        .onChange(of: plz) { _, neu in if neu.count > 10 { plz = String(neu.prefix(10)) } }
                    Eingabefeld(titel: Texte.Kasse11.adresseOrt, text: $ort, platzhalter: Texte.Kasse11.adresseOrtBeispiel,
                                inhalt: .addressCity, grossschreibung: .words)
                        .accessibilityIdentifier("adresse-ort")
                }
                .karte()
                if let fehler { FehlerZeile(text: fehler) }
                Button {
                    speichern()
                } label: {
                    if sendet { ProgressView().tint(Color.tfBlau) } else { Text(stimmtSo ? Texte.Kasse11.adresseStimmtSo : Texte.Kasse11.adresseSpeichern) }
                }
                .buttonStyle(.haupt)
                .disabled(sendet)
                .accessibilityIdentifier("adresse-speichern")
            }
            .padding(16)
        }
        .scrollDismissesKeyboard(.interactively)
        .tfHintergrund()
        .navigationTitle(Texte.Kasse11.adresseMaskeTitel)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if alsBlatt {
                ToolbarItem(placement: .cancellationAction) {
                    Button(Texte.Allgemein.abbrechen) { dismiss() }
                }
            }
        }
        .sensoryFeedback(.success, trigger: erfolg)
        .onAppear(perform: vorbefuellen)
    }

    private func vorbefuellen() {
        guard !geladen, let s = studio else { return }
        strasse = s.strasse ?? ""
        plz = s.plz ?? ""
        ort = s.ort ?? ""
        original = [strasse, plz, ort].map { $0.trimmingCharacters(in: .whitespaces) }
        geladen = true
    }

    private func speichern() {
        let (s, p, o) = (strasse.trimmingCharacters(in: .whitespaces), plz.trimmingCharacters(in: .whitespaces), ort.trimmingCharacters(in: .whitespaces))
        if let m = AdressePruefung.meldung(strasse: s, plz: p, ort: o, deutschland: deutschland) {
            fehler = m
            return
        }
        sendet = true
        fehler = nil
        Task {
            defer { sendet = false }
            do {
                let neu = try await APIClient.shared.adresseSpeichern(strasse: s, plz: p, ort: o)
                // Antwort ist der neue Studio-Stand (kannKassieren inklusive): Kasse öffnet sofort, Liste kommt nach
                portal.studio = neu
                erfolg += 1
                dismiss()
                await portal.laden()
            } catch {
                fehler = fehlerText(error)
            }
        }
    }
}
