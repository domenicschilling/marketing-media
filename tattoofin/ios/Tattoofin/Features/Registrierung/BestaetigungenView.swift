import SwiftUI

/// R4: Unterzeichner und die vier Pflicht-Bestätigungen (Unternehmer, KMU, Vertrag, AVV) wie in der Web-Anmeldung.
/// „Weiter zum Abo“ legt beim Server den Entwurf an (noch kein Kauf) und merkt ihn im Schlüsselbund.
struct BestaetigungenView: View {
    let weiter: () -> Void
    let neuAnfangen: (String) -> Void
    let zurAnmeldung: (String) -> Void

    @Environment(RegistrierungModell.self) private var reg
    @Environment(\.dismiss) private var dismiss
    @State private var gezeigt = false
    @State private var sendet = false
    @State private var fehler: String?
    @State private var seite: Rechtsseite?
    @FocusState private var fokus: StudioFeld?

    private var unterzeichnerFehler: String? {
        guard gezeigt || reg.serverFelder.contains(.unterzeichner) else { return nil }
        return reg.daten.fehler(felder: [.unterzeichner])[.unterzeichner]
    }

    var body: some View {
        @Bindable var reg = reg
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                Ueberschrift(Texte.Registrieren.bestaetigungenTitel)
                Text(Texte.Registrieren.bestaetigungenEinleitung)
                    .font(.dm(.body))
                    .foregroundStyle(Color.tfLeise)
                    .fixedSize(horizontal: false, vertical: true)

                StudioFeldEingabe(feld: .unterzeichner, text: $reg.daten.unterzeichner, fehler: unterzeichnerFehler, fokus: $fokus) {
                    fokus = nil
                }
                .karte()

                VStack(alignment: .leading, spacing: 18) {
                    schalter(Texte.Registrieren.unternehmer, an: $reg.bestaetigt.unternehmer, id: "unternehmer")
                    Divider().overlay(Color.tfLinie)
                    schalter(Texte.Registrieren.kmu, an: $reg.bestaetigt.kmu, id: "kmu")
                    Divider().overlay(Color.tfLinie)
                    schalter(Texte.Registrieren.vertrag, an: $reg.bestaetigt.vertrag, id: "vertrag") {
                        lesenKnopf(Texte.Registrieren.vertragLesen, .vertrag)
                    }
                    Divider().overlay(Color.tfLinie)
                    schalter(Texte.Registrieren.avv, an: $reg.bestaetigt.avv, id: "avv") {
                        lesenKnopf(Texte.Registrieren.avvLesen, .avv)
                    }
                }
                .karte()

                VStack(alignment: .leading, spacing: 6) {
                    Text(Texte.Registrieren.datenschutzHinweis)
                        .font(.dm(.subheadline))
                        .foregroundStyle(Color.tfLeise)
                        .fixedSize(horizontal: false, vertical: true)
                    lesenKnopf(Texte.Registrieren.datenschutzLesen, .datenschutz)
                }

                if let fehler { FehlerZeile(text: fehler) }

                Button {
                    absenden()
                } label: {
                    if sendet { ProgressView().tint(Color.tfBlau) } else { Text(Texte.Registrieren.weiterZumAbo) }
                }
                .buttonStyle(.haupt)
                .disabled(sendet)
                .accessibilityIdentifier("weiter-zum-abo")
            }
            .padding(20)
        }
        .scrollDismissesKeyboard(.interactively)
        .tfHintergrund()
        .navigationTitle(Texte.Registrieren.navTitel)
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $seite) { RechtsAnsicht(seite: $0) }
    }

    /// Schalter mit langem Text, darunter ggf. „… lesen“ und der Fehler „Bitte bestätigen.“
    private func schalter(_ text: String, an: Binding<Bool>, id: String) -> some View {
        schalter(text, an: an, id: id) { EmptyView() }
    }

    private func schalter<Zusatz: View>(_ text: String, an: Binding<Bool>, id: String,
                                        @ViewBuilder zusatz: () -> Zusatz) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Toggle(isOn: an) {
                Text(text)
                    .font(.dm(.body))
                    .foregroundStyle(Color.tfTinte)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .tint(Color.tfGruen)
            .accessibilityIdentifier("schalter-\(id)")
            zusatz()
            if gezeigt && !an.wrappedValue {
                FehlerZeile(text: Texte.Registrieren.bitteBestaetigen)
            }
        }
    }

    private func lesenKnopf(_ titel: String, _ s: Rechtsseite) -> some View {
        Button {
            seite = s
        } label: {
            Label(titel, systemImage: "doc.text")
                .font(.dm(.subheadline, weight: .semibold))
                .frame(minHeight: 44)
        }
        .foregroundStyle(Color.tfAkzent)
        .buttonStyle(.plain)
    }

    private func absenden() {
        gezeigt = true
        fehler = nil
        let angabenFehler = reg.daten.fehler()
        guard angabenFehler[.unterzeichner] == nil else { fokus = .unterzeichner; return }
        guard reg.bestaetigt.alle else { return }
        if !angabenFehler.isEmpty {
            // Angaben auf R3 sind inzwischen unvollständig (sollte nicht vorkommen): zurück zu den Angaben
            reg.serverFelder = Set(angabenFehler.keys)
            dismiss()
            return
        }
        guard let token = reg.registrierToken else {
            neuAnfangen(Texte.Fehler.unbekannt)
            return
        }
        sendet = true
        Task {
            defer { sendet = false }
            do {
                let a = try await APIClient.shared.registrieren(.init(registrierToken: token, daten: reg.daten, akzeptiert: reg.bestaetigt))
                let e = RegistrierungEntwurf(entwurfId: a.entwurfId, entwurfToken: a.entwurfToken,
                                             appAccountToken: a.appAccountToken.lowercased(),
                                             produktId: a.produktId ?? AboKonstanten.produktId,
                                             email: a.email ?? reg.email, gespeichertAm: .now)
                guard e.uuid != nil else { fehler = Texte.Fehler.unbekannt; return }
                RegistrierungSpeicher.speichern(e)
                reg.entwurf = e
                weiter()
            } catch let f as APIFehler {
                switch f.code {
                case "registrierung_abgelaufen", "entwurf_abgelaufen": neuAnfangen(f.meldung)
                case "schon_aktiv": zurAnmeldung(f.meldung)
                case "eingabe":
                    let felder = Set((f.felder ?? []).compactMap(StudioFeld.init(rawValue:)))
                    reg.serverFelder = felder
                    fehler = f.meldung
                    if !felder.subtracting([.unterzeichner]).isEmpty { dismiss() }
                default:
                    fehler = f.meldung
                }
            } catch {
                fehler = fehlerText(error)
            }
        }
    }
}
