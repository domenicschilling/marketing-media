import SwiftUI

/// Bildschirm 4: Einrichtung nach dem ersten Login (2 Seiten).
/// Seite 1: Face ID an/aus. Seite 2: Mitteilungen erklären, erst dann die Systemabfrage.
struct EinrichtungView: View {
    @Environment(AppState.self) private var app
    @Environment(SperreManager.self) private var sperre
    @State private var seite = 0
    @State private var arbeitet = false

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 6) {
                ForEach(0..<2, id: \.self) { i in
                    Capsule().fill(i <= seite ? Color.tfAkzent : Color.tfLinie).frame(height: 5)
                }
            }
            .padding(.horizontal, 20)
            .padding(.top, 12)
            .accessibilityElement()
            .accessibilityLabel(Texte.Einrichtung.schritt(seite + 1, von: 2))

            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    if seite == 0 { seiteFaceID } else { seiteMitteilungen }
                }
                .padding(20)
            }
        }
        .tfHintergrund()
        .animation(.easeInOut, value: seite)
    }

    private var seiteFaceID: some View {
        Group {
            Image(systemName: sperre.artName == "Touch ID" ? "touchid" : "faceid")
                .font(.system(size: 64))
                .foregroundStyle(Color.tfAkzent)
                .frame(maxWidth: .infinity)
                .padding(.top, 30)
                .accessibilityHidden(true)
            Ueberschrift(Texte.Einrichtung.faceIDTitel(sperre.artName))
            Text(Texte.Einrichtung.faceIDText)
                .font(.dm(.body))
                .foregroundStyle(Color.tfTinte)
                .fixedSize(horizontal: false, vertical: true)
            if !sperre.verfuegbar {
                HinweisKarte(text: Texte.Sperre.nichtVerfuegbar, symbol: "lock.slash")
            }
            Button {
                arbeitet = true
                Task {
                    _ = await sperre.einschalten()
                    arbeitet = false
                    seite = 1
                }
            } label: {
                Text(Texte.Einrichtung.faceIDJa(sperre.artName))
            }
            .buttonStyle(.haupt)
            .disabled(!sperre.verfuegbar || arbeitet)

            Button(Texte.Einrichtung.faceIDNein) {
                sperre.ausschalten()
                seite = 1
            }
            .buttonStyle(.zweit)
        }
    }

    private var seiteMitteilungen: some View {
        Group {
            Image(systemName: "bell.badge.fill")
                .font(.system(size: 60))
                .foregroundStyle(Color.tfAkzent)
                .frame(maxWidth: .infinity)
                .padding(.top, 30)
                .accessibilityHidden(true)
            Ueberschrift(Texte.Einrichtung.pushTitel)
            Text(Texte.Einrichtung.pushText)
                .font(.dm(.body))
                .foregroundStyle(Color.tfTinte)
                .fixedSize(horizontal: false, vertical: true)
            VStack(alignment: .leading, spacing: 12) {
                Label(Texte.Einrichtung.pushPunktZahlung, systemImage: "checkmark.circle.fill")
                Label(Texte.Einrichtung.pushPunktAuszahlung, systemImage: "building.columns.fill")
            }
            .font(.dm(.body, weight: .medium))
            .foregroundStyle(Color.tfTinte)
            .karte()
            Text(Texte.Einrichtung.pushSpaeter)
                .font(.dm(.footnote))
                .foregroundStyle(Color.tfLeise)

            Button {
                arbeitet = true
                Task {
                    await PushManager.shared.erlaubnisAnfragen()
                    arbeitet = false
                    app.einrichtungFertig()
                }
            } label: {
                Text(Texte.Einrichtung.pushJa)
            }
            .buttonStyle(.haupt)
            .disabled(arbeitet)

            Button(Texte.Einrichtung.pushNein) { app.einrichtungFertig() }
                .buttonStyle(.zweit)
        }
    }
}
