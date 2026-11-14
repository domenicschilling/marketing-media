import SwiftUI

/// Bildschirm 17: Konto kündigen und löschen (Apple 5.1.1(v)). Inhaber: Kündigung + Löschung. Team: eigenen Zugang entfernen.
/// Zurücknehmen gibt es in der App nicht (das würde das Abo fortsetzen, Apple 3.1.1), nur den Hinweis auf info@tattoofin.de.
/// Apple-Abo: Vertrag endet mit dem bezahlten Zeitraum; Hinweis + Knopf, das Abo zusätzlich bei Apple zu kündigen (sonst bucht Apple weiter ab).
struct KontoLoeschenView: View {
    @Environment(AppState.self) private var app
    @Environment(PortalStore.self) private var portal
    @Environment(\.dismiss) private var dismiss
    @State private var eingabe = ""
    @State private var grund = ""
    @State private var arbeitet = false
    @State private var fehler: String?
    @State private var ergebnis: KontoLoeschenAntwort?
    @State private var aboVerwalten = false

    private var istInhaber: Bool { app.sitzung?.istInhaber ?? false }
    private var istApple: Bool { portal.studio?.istApple ?? false }

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
        .manageSubscriptionsSheet(isPresented: $aboVerwalten)
    }

    /// Hinweis: Apple-Abo zusätzlich in den Einstellungen des Apple-Accounts kündigen
    private var appleKarte: some View {
        VStack(alignment: .leading, spacing: 10) {
            HinweisKarte(text: Texte.Loeschen.appleHinweis, schrift: .dm(.body, weight: .semibold))
            Button {
                aboVerwalten = true
            } label: {
                Label(Texte.Loeschen.appleKuendigen, systemImage: "creditcard")
            }
            .buttonStyle(.zweit)
            .accessibilityIdentifier("abo-bei-apple-kuendigen")
        }
    }

    private var formular: some View {
        Group {
            Ueberschrift(Texte.Loeschen.ueberschrift, groesse: 26)
            ForEach(istApple ? Texte.Loeschen.punkteApple : Texte.Loeschen.punkte, id: \.self) { p in
                HStack(alignment: .top, spacing: 10) {
                    Image(systemName: "circle.fill").font(.system(size: 6)).padding(.top, 8).accessibilityHidden(true)
                    Text(p).font(.dm(.body)).fixedSize(horizontal: false, vertical: true)
                }
                .foregroundStyle(Color.tfTinte)
            }
            VStack(alignment: .leading, spacing: 6) {
                Text(Texte.Loeschen.grund).font(.dm(.subheadline, weight: .semibold)).foregroundStyle(Color.tfTinte)
                TextField(Texte.Loeschen.grund, text: $grund, prompt: tfPlatzhalter(Texte.Loeschen.grundPlatzhalter), axis: .vertical)
                    .lineLimit(2...5)
                    .font(.dm(.body))
                    .padding(12)
                    .background(Color.tfKarte, in: RoundedRectangle(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.tfLinie, lineWidth: 1.5))
            }
            VStack(alignment: .leading, spacing: 6) {
                Text(Texte.Loeschen.bestaetigen).font(.dm(.subheadline, weight: .semibold)).foregroundStyle(Color.tfTinte)
                TextField(Texte.Loeschen.bestaetigen, text: $eingabe, prompt: tfPlatzhalter("LÖSCHEN"))
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .font(.dm(.body, weight: .semibold))
                    .padding(12)
                    .background(Color.tfKarte, in: RoundedRectangle(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.tfRot.opacity(0.6), lineWidth: 1.5))
                    .accessibilityLabel(Texte.Loeschen.bestaetigen)
            }
            if istApple { appleKarte }
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
            if e.appleAbo == true || istApple { appleKarte }
            Button(Texte.Loeschen.zumKonto) { dismiss() }
                .buttonStyle(.zweit)
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

}
