import SwiftUI

/// Bildschirm 17: Konto löschen (Apple 5.1.1(v)). Inhaber: Kündigung + Löschung. Team: eigenen Zugang entfernen.
struct KontoLoeschenView: View {
    @Environment(AppState.self) private var app
    @Environment(PortalStore.self) private var portal
    @State private var eingabe = ""
    @State private var grund = ""
    @State private var arbeitet = false
    @State private var fehler: String?
    @State private var ergebnis: KontoLoeschenAntwort?
    @State private var zurueckGenommen = false

    private var istInhaber: Bool { app.sitzung?.istInhaber ?? false }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                if istInhaber {
                    if let ergebnis { erledigt(ergebnis) } else { formular }
                } else {
                    teamAnsicht
                }
            }
            .padding(20)
        }
        .scrollDismissesKeyboard(.interactively)
        .tfHintergrund()
        .navigationTitle(istInhaber ? Texte.Loeschen.titel : Texte.Team.zugangEntfernen)
        .navigationBarTitleDisplayMode(.inline)
    }

    private var formular: some View {
        Group {
            Ueberschrift(Texte.Loeschen.ueberschrift, groesse: 26)
            ForEach(Texte.Loeschen.punkte, id: \.self) { p in
                HStack(alignment: .top, spacing: 10) {
                    Image(systemName: "circle.fill").font(.system(size: 6)).padding(.top, 8).accessibilityHidden(true)
                    Text(p).font(.dm(.body)).fixedSize(horizontal: false, vertical: true)
                }
                .foregroundStyle(Color.tfTinte)
            }
            VStack(alignment: .leading, spacing: 6) {
                Text(Texte.Loeschen.grund).font(.dm(.subheadline, weight: .semibold)).foregroundStyle(Color.tfTinte)
                TextField(Texte.Loeschen.grundPlatzhalter, text: $grund, axis: .vertical)
                    .lineLimit(2...5)
                    .font(.dm(.body))
                    .padding(12)
                    .background(Color.tfKarte, in: RoundedRectangle(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.tfLinie, lineWidth: 1.5))
            }
            VStack(alignment: .leading, spacing: 6) {
                Text(Texte.Loeschen.bestaetigen).font(.dm(.subheadline, weight: .semibold)).foregroundStyle(Color.tfTinte)
                TextField("LÖSCHEN", text: $eingabe)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .font(.dm(.body, weight: .semibold))
                    .padding(12)
                    .background(Color.tfKarte, in: RoundedRectangle(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.tfRot.opacity(0.6), lineWidth: 1.5))
                    .accessibilityLabel(Texte.Loeschen.bestaetigen)
            }
            if let fehler { FehlerZeile(text: fehler) }
            Button {
                loeschen()
            } label: {
                if arbeitet { ProgressView() } else { Text(Texte.Loeschen.knopf) }
            }
            .buttonStyle(.gefahr)
            .disabled(eingabe.trimmingCharacters(in: .whitespaces).uppercased() != "LÖSCHEN" || arbeitet)
        }
    }

    private func erledigt(_ e: KontoLoeschenAntwort) -> some View {
        Group {
            Image(systemName: "checkmark.circle.fill").font(.system(size: 56)).foregroundStyle(Color.tfGruen).accessibilityHidden(true)
            Ueberschrift(Texte.Loeschen.erledigtTitel, groesse: 26)
            VStack(alignment: .leading, spacing: 8) {
                if let d = Datum.tag(e.kuendigungZum) { WertZeile(titel: Texte.Loeschen.vertragEndet, wert: d) }
                if let d = Datum.tag(e.loeschungAb) { WertZeile(titel: Texte.Loeschen.loeschungAb, wert: d) }
            }
            .karte()
            Text(Texte.Loeschen.erledigtText).font(.dm(.body)).foregroundStyle(Color.tfTinte).fixedSize(horizontal: false, vertical: true)
            if zurueckGenommen {
                HinweisKarte(text: Texte.Loeschen.zurueckErledigt, symbol: "checkmark")
            } else {
                Button(Texte.Loeschen.zuruecknehmen) { zuruecknehmen() }
                    .buttonStyle(.zweit)
                    .disabled(arbeitet)
            }
            if let fehler { FehlerZeile(text: fehler) }
        }
    }

    private var teamAnsicht: some View {
        Group {
            Ueberschrift(Texte.Team.zugangEntfernen, groesse: 26)
            Text(Texte.Team.zugangEntfernenErklaerung).font(.dm(.body)).foregroundStyle(Color.tfTinte).fixedSize(horizontal: false, vertical: true)
            if let fehler { FehlerZeile(text: fehler) }
            Button(Texte.Team.zugangEntfernen) {
                arbeitet = true
                Task {
                    defer { arbeitet = false }
                    do {
                        try await APIClient.shared.eigenenZugangEntfernen()
                        await app.lokalAbmelden(hinweis: Texte.Team.zugangEntferntHinweis)
                    } catch {
                        fehler = fehlerText(error)
                    }
                }
            }
            .buttonStyle(.gefahr)
            .disabled(arbeitet)
        }
    }

    private func loeschen() {
        arbeitet = true
        fehler = nil
        Task {
            defer { arbeitet = false }
            do {
                ergebnis = try await APIClient.shared.kontoLoeschen(grund: grund.leerAlsNil)
                await portal.laden()
            } catch {
                fehler = fehlerText(error)
            }
        }
    }

    private func zuruecknehmen() {
        arbeitet = true
        fehler = nil
        Task {
            defer { arbeitet = false }
            do {
                _ = try await APIClient.shared.kuendigungZuruecknehmen()
                zurueckGenommen = true
                await portal.laden()
            } catch {
                fehler = fehlerText(error)
            }
        }
    }
}
