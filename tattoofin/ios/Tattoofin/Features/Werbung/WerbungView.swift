import SwiftUI

/// Tab „Werbung“: Werbevideo, Studio-Beiträge, Zahlseiten-QR, Druckmaterial. Alles nativ; die Bilder zeichnet app-kit.js unsichtbar im Hintergrund.
struct WerbungView: View {
    @Environment(PortalStore.self) private var portal
    @Environment(WerbungStore.self) private var werbung

    var body: some View {
        NavigationStack {
            Group {
                if let s = portal.studio {
                    inhalt(s)
                } else if let f = portal.fehler {
                    FehlerAnsicht(text: f) { Task { await portal.laden() } }
                } else {
                    LadeAnsicht()
                }
            }
            .tfHintergrund()
            .navigationTitle(WerbungTexte.titel)
            .navigationBarTitleDisplayMode(.inline)
        }
        .task { await werbung.laden() }
    }

    private func zahlseite(_ s: Studio) -> String? {
        (werbung.werbung?.zahlseite ?? s.zahlseite ?? werbung.start?.studio.zahlseite)?.leerAlsNil
    }

    @ViewBuilder
    private func inhalt(_ s: Studio) -> some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 16) {
                if !s.darfKassieren {
                    HinweisKarte(text: WerbungTexte.vorFreigabe, symbol: "clock")
                } else if werbung.start == nil && werbung.werbung == nil && werbung.laedt {
                    LadeAnsicht().frame(minHeight: 160)
                } else {
                    if let f = werbung.fehler, werbung.start == nil {
                        FehlerZeile(text: f)
                        Button(WerbungTexte.neuLaden) { Task { await werbung.laden(immer: true) } }.buttonStyle(.zweit)
                    }
                    if werbung.klarnaMaterial {
                        Text(WerbungTexte.einleitungKlarna)
                            .font(.dm(.subheadline))
                            .foregroundStyle(Color.tfLeise)
                            .fixedSize(horizontal: false, vertical: true)
                        WerbevideoKarte()
                        if let z = zahlseite(s) {
                            BeitraegeKarte(firma: werbung.werbung?.firma ?? s.firma ?? s.name,
                                           ort: werbung.werbung?.ort ?? s.ort, zahlseite: z)
                        }
                    } else {
                        Text(WerbungTexte.einleitung)
                            .font(.dm(.subheadline))
                            .foregroundStyle(Color.tfLeise)
                        VStack(alignment: .leading, spacing: 6) {
                            Text(WerbungTexte.ohneKlarnaTitel).font(.dm(.headline, weight: .bold)).foregroundStyle(Color.tfTinte)
                            Text(WerbungTexte.ohneKlarnaText).font(.dm(.subheadline)).foregroundStyle(Color.tfLeise)
                                .fixedSize(horizontal: false, vertical: true)
                        }
                        .karte()
                    }
                    if let z = zahlseite(s) {
                        ZahlseiteKarte(zahlseite: z, firma: s.name)
                    }
                    if !werbung.druckMaterial.isEmpty {
                        DruckmaterialKarte(material: werbung.druckMaterial)
                    }
                }
            }
            .padding(16)
        }
        .refreshable {
            async let p: Void = portal.laden()
            async let w: Void = werbung.laden(immer: true)
            _ = await (p, w)
        }
    }
}

/// Kleine, aber lesbare Pflicht-Fußnote (Domenic 14.11.: klein und unauffällig, aber vorhanden)
struct KlarnaFussnote: View {
    var text: String = WerbungTexte.fussnote

    var body: some View {
        Text(text)
            .font(.dm(.caption))
            .foregroundStyle(Color.tfLeise)
            .fixedSize(horizontal: false, vertical: true)
    }
}

/// Knopf mit kurzer Rückmeldung („Kopiert“, „In Fotos gespeichert“)
struct RueckmeldungsText: View {
    let text: String?

    var body: some View {
        if let text {
            Label(text, systemImage: "checkmark.circle.fill")
                .font(.dm(.subheadline, weight: .semibold))
                .foregroundStyle(Color.tfGruen)
                .transition(.opacity)
                .accessibilityAddTraits(.updatesFrequently)
        }
    }
}

/// Text kurz zeigen und wieder ausblenden
@MainActor
func kurzZeigen(_ text: String, in ziel: Binding<String?>) {
    withAnimation { ziel.wrappedValue = text }
    UIAccessibility.post(notification: .announcement, argument: text)
    Task {
        try? await Task.sleep(for: .seconds(2))
        withAnimation { if ziel.wrappedValue == text { ziel.wrappedValue = nil } }
    }
}

/// Zwei Knöpfe nebeneinander, bei großer Schrift oder wenig Platz untereinander (kein Umbruch mitten im Knopf)
struct KnopfReihe<Inhalt: View>: View {
    @ViewBuilder var inhalt: Inhalt

    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: 10) { inhalt }.fixedSize(horizontal: false, vertical: true)
            VStack(spacing: 10) { inhalt }
        }
    }
}
