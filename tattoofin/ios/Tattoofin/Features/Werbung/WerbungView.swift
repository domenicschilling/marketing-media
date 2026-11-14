import SwiftUI

/// Tab „Werbung“: Werbevideo, Studio-Beiträge, Zahlseiten-QR, Druckmaterial. Alles nativ; die Bilder zeichnet app-kit.js unsichtbar im Hintergrund.
/// Oben eine Sprungleiste (Video · Beiträge · QR-Code · Drucken); die Checkliste springt direkt zum passenden Abschnitt.
struct WerbungView: View {
    @Environment(AppState.self) private var app
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

    /// Abschnitte, die es für dieses Studio gibt (für die Sprungleiste)
    private func abschnitte(_ s: Studio) -> [WerbungAbschnitt] {
        var a: [WerbungAbschnitt] = []
        if werbung.klarnaMaterial {
            a.append(.video)
            if zahlseite(s) != nil { a.append(.beitraege) }
        }
        if zahlseite(s) != nil { a.append(.zahlseite) }
        if !werbung.druckMaterial.isEmpty { a.append(.druck) }
        return a
    }

    @ViewBuilder
    private func inhalt(_ s: Studio) -> some View {
        ScrollViewReader { leser in
            ScrollView {
                // VStack statt LazyVStack: Sprungziele weiter unten müssen schon da sein
                VStack(alignment: .leading, spacing: 16) {
                    if !s.darfKassieren {
                        gesperrt(s)
                    } else if werbung.start == nil && werbung.startServer == nil && werbung.werbung == nil && werbung.laedt {
                        LadeAnsicht().frame(minHeight: 160)
                    } else {
                        if let f = werbung.fehler, werbung.start == nil, werbung.startServer == nil {
                            FehlerZeile(text: f)
                            Button(WerbungTexte.neuLaden) { Task { await werbung.laden(immer: true) } }.buttonStyle(.zweit)
                        }
                        // Testkauf (Apple-Sandbox): gleicher Hinweis wie in der Kasse, über Sprungleiste und QR-Code
                        if s.istTestmodus {
                            HinweisKarte(text: Texte.Kasse.werbungTestmodus, symbol: "testtube.2")
                                .accessibilityIdentifier("werbung-testmodus")
                        }
                        let liste = abschnitte(s)
                        if liste.count > 1 { sprungleiste(liste, leser) }
                        if werbung.klarnaMaterial {
                            Text(WerbungTexte.einleitungKlarna)
                                .font(.dm(.subheadline))
                                .foregroundStyle(Color.tfLeise)
                                .fixedSize(horizontal: false, vertical: true)
                            WerbevideoKarte().id(WerbungAbschnitt.video)
                            if let z = zahlseite(s) {
                                BeitraegeKarte(firma: werbung.werbung?.firma ?? s.firma ?? s.name,
                                               ort: werbung.werbung?.ort ?? s.ort, zahlseite: z)
                                    .id(WerbungAbschnitt.beitraege)
                            }
                        } else {
                            ohneKlarnaKarte
                        }
                        if let z = zahlseite(s) {
                            ZahlseiteKarte(zahlseite: z, firma: s.name).id(WerbungAbschnitt.zahlseite)
                        }
                        if !werbung.druckMaterial.isEmpty {
                            DruckmaterialKarte(material: werbung.druckMaterial).id(WerbungAbschnitt.druck)
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
            .onChange(of: app.werbungSprung, initial: true) { _, ziel in
                guard let ziel else { return }
                springen(ziel, leser)
            }
            .onChange(of: werbung.werbung?.zahlseite) { _, _ in
                // Daten kamen nach dem Sprungwunsch: nochmal versuchen
                if let ziel = app.werbungSprung { springen(ziel, leser) }
            }
        }
    }

    /// Kasse zu: beendetes Apple-Abo (gleiche Regel wie GesperrtKarte in der Kasse) oder Zahlungskonto noch nicht freigegeben
    @ViewBuilder
    private func gesperrt(_ s: Studio) -> some View {
        if GesperrtKarte.fall(s) == .aboBeendet {
            VStack(alignment: .leading, spacing: 12) {
                Text(Texte.Kasse.aboAbgelaufenTitel).font(.dm(.headline, weight: .bold)).foregroundStyle(Color.tfTinte)
                Text(Texte.Kasse.aboAbgelaufenText).font(.dm(.subheadline)).foregroundStyle(Color.tfTinte)
                    .fixedSize(horizontal: false, vertical: true)
                if app.sitzung?.istInhaber == true {
                    // In der Kasse steht „Abo wieder abschließen“
                    Button(Texte.Kasse.aboZurKasse) { app.tab = .kasse }
                        .buttonStyle(.haupt)
                        .accessibilityIdentifier("werbung-abo-kasse")
                } else {
                    HinweisKarte(text: Texte.Kasse.aboTeamHinweis, symbol: "person.fill")
                }
            }
            .karte()
            .accessibilityIdentifier("werbung-abo-beendet")
        } else if GesperrtKarte.fall(s) == .sandbox {
            // Testkauf mit geschlossener Kasse: ein Zahlungskonto gibt es hier nie
            HinweisKarte(text: Texte.Kasse.werbungTestmodus, symbol: "testtube.2")
        } else {
            HinweisKarte(text: WerbungTexte.vorFreigabe, symbol: "clock")
        }
    }

    private func springen(_ ziel: WerbungAbschnitt, _ leser: ScrollViewProxy) {
        Task { @MainActor in
            try? await Task.sleep(for: .milliseconds(350))
            withAnimation { leser.scrollTo(ziel, anchor: .top) }
            app.werbungSprung = nil
        }
    }

    private func sprungleiste(_ liste: [WerbungAbschnitt], _ leser: ScrollViewProxy) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(liste) { a in
                    Button { withAnimation { leser.scrollTo(a, anchor: .top) } } label: {
                        Text(WerbungTexte.sprung(a))
                            .font(.dm(.subheadline, weight: .semibold))
                            .foregroundStyle(Color.tfTinte)
                            .padding(.horizontal, 14)
                            .frame(minHeight: 36)
                            .background(Color.tfKarte, in: Capsule())
                            .overlay(Capsule().stroke(Color.tfLinie, lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(WerbungTexte.sprungLabel) \(WerbungTexte.sprung(a))")
                }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("werbung-sprungleiste")
    }

    /// Studio ohne Klarna dauerhaft: kurz sagen, was es gibt und was man tun kann
    private var ohneKlarnaKarte: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(WerbungTexte.ohneKlarnaTitel).font(.dm(.headline, weight: .bold)).foregroundStyle(Color.tfTinte)
            Text(WerbungTexte.ohneKlarnaText).font(.dm(.subheadline)).foregroundStyle(Color.tfLeise)
                .fixedSize(horizontal: false, vertical: true)
            Link(destination: StudioMehrAbschnitt.whatsappURL) {
                Label(WerbungTexte.hilfeWhatsApp, systemImage: "message")
            }
            .buttonStyle(.zweit)
            .accessibilityHint("Öffnet WhatsApp")
        }
        .karte()
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

/// Zwei Knöpfe nebeneinander, gleich breit. Passt eine Beschriftung nicht in eine Zeile (große Schrift, langer Text),
/// stehen beide untereinander in voller Breite. So bricht nie ein Knopf mitten im Text um.
struct KnopfReihe<Inhalt: View>: View {
    @ViewBuilder var inhalt: Inhalt

    var body: some View {
        GleichBreitOderUntereinander(abstand: 10) { inhalt }
    }
}

/// Layout: nebeneinander mit gleicher Breite, wenn jede Beschriftung in ihre Hälfte passt, sonst untereinander
struct GleichBreitOderUntereinander: Layout {
    var abstand: CGFloat = 10

    private func nebeneinander(_ breite: CGFloat?, _ teile: Subviews) -> Bool {
        guard let breite, !teile.isEmpty else { return false }
        let n = CGFloat(teile.count)
        let je = (breite - abstand * (n - 1)) / n
        // Ideale Breite jeder Beschriftung (ohne Umbruch) muss in ihre Hälfte passen
        return teile.allSatisfy { $0.sizeThatFits(.unspecified).width <= je + 0.5 }
    }

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let breite = proposal.width
        if nebeneinander(breite, subviews) {
            let n = CGFloat(subviews.count)
            let je = (breite! - abstand * (n - 1)) / n
            let hoehe = subviews.map { $0.sizeThatFits(ProposedViewSize(width: je, height: nil)).height }.max() ?? 0
            return CGSize(width: breite!, height: hoehe)
        }
        let w = breite ?? subviews.map { $0.sizeThatFits(.unspecified).width }.max() ?? 0
        let hoehen = subviews.map { $0.sizeThatFits(ProposedViewSize(width: w, height: nil)).height }
        return CGSize(width: w, height: hoehen.reduce(0, +) + abstand * CGFloat(max(subviews.count - 1, 0)))
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        if nebeneinander(bounds.width, subviews) {
            let n = CGFloat(subviews.count)
            let je = (bounds.width - abstand * (n - 1)) / n
            var x = bounds.minX
            for t in subviews {
                t.place(at: CGPoint(x: x, y: bounds.minY), proposal: ProposedViewSize(width: je, height: bounds.height))
                x += je + abstand
            }
        } else {
            var y = bounds.minY
            for t in subviews {
                let h = t.sizeThatFits(ProposedViewSize(width: bounds.width, height: nil)).height
                t.place(at: CGPoint(x: bounds.minX, y: y), proposal: ProposedViewSize(width: bounds.width, height: h))
                y += h + abstand
            }
        }
    }
}
