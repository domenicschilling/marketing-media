import SwiftUI

/// Fertige Studio-Beiträge (gleiches Aussehen wie im Web): Kacheln je Vorlage, Großansicht, Name ändern, speichern, Text kopieren, teilen.
struct BeitraegeKarte: View {
    let firma: String
    let ort: String?
    let zahlseite: String

    @Environment(WerbungStore.self) private var werbung
    @State private var nameFeld = ""
    @FocusState private var nameFokus: Bool

    private var gepostet: Binding<Bool> {
        Binding(get: { werbung.checkliste.werbung != nil },
                set: { neu in Task { await werbung.abhaken("werbung", neu) } })
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            VStack(alignment: .leading, spacing: 10) {
                Text(WerbungTexte.beitraegeTitel).font(.luckiest(24, relativeTo: .title2)).foregroundStyle(Color.tfTinte)
                    .accessibilityAddTraits(.isHeader)
                Text(WerbungTexte.beitraegeText).font(.dm(.subheadline)).foregroundStyle(Color.tfLeise)
                    .fixedSize(horizontal: false, vertical: true)
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(Array(WerbungTexte.schritte.enumerated()), id: \.offset) { i, t in
                        HStack(alignment: .firstTextBaseline, spacing: 8) {
                            Text("\(i + 1).").font(.dm(.subheadline, weight: .bold))
                            Text(t).font(.dm(.subheadline)).fixedSize(horizontal: false, vertical: true)
                        }
                        .foregroundStyle(Color.tfTinte)
                        .accessibilityElement(children: .combine)
                    }
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(WerbungTexte.nameLabel).font(.dm(.subheadline, weight: .semibold)).foregroundStyle(Color.tfTinte)
                    HStack(spacing: 8) {
                        TextField(WerbungTexte.nameLabel, text: $nameFeld, prompt: tfPlatzhalter(firma))
                            .textContentType(.organizationName)
                            .textInputAutocapitalization(.words)
                            .autocorrectionDisabled()
                            .submitLabel(.done)
                            .focused($nameFokus)
                            .onSubmit { nameUebernehmen() }
                            .font(.dm(.body))
                            .padding(12)
                            .background(Color.tfHintergrund, in: RoundedRectangle(cornerRadius: 12))
                            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.tfLinie, lineWidth: 1.5))
                            .onChange(of: nameFeld) { _, neu in if neu.count > 60 { nameFeld = String(neu.prefix(60)) } }
                        Button(WerbungTexte.nameUebernehmen) { nameUebernehmen() }
                            .font(.dm(.body, weight: .semibold))
                            .buttonStyle(.bordered)
                            .disabled(werbung.zeichnet || nameFeld.trimmingCharacters(in: .whitespaces) == werbung.bildName)
                    }
                    Text(WerbungTexte.nameHinweis).font(.dm(.caption)).foregroundStyle(Color.tfLeise)
                }

                Toggle(isOn: gepostet) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(WerbungTexte.gepostet).font(.dm(.body, weight: .semibold)).foregroundStyle(Color.tfTinte)
                        Text(WerbungTexte.gepostetHinweis).font(.dm(.caption)).foregroundStyle(Color.tfLeise)
                    }
                }
                .tint(Color.tfGruen)
                KlarnaFussnote(text: werbung.fussnote)
            }
            .karte()

            if let f = werbung.zeichenFehler {
                FehlerZeile(text: f)
                Button(WerbungTexte.neuLaden) { Task { await zeichnen() } }.buttonStyle(.zweit)
            }

            ForEach(werbung.beitraege) { b in
                BeitragKachel(beitrag: b, zahlseite: zahlseite, kopierText: kopierText(b))
            }
            if werbung.zeichnet && werbung.beitraege.count < werbung.vorlagenAnzahl {
                HStack(spacing: 10) {
                    ProgressView()
                    Text(WerbungTexte.zeichnet).font(.dm(.subheadline)).foregroundStyle(Color.tfLeise)
                }
                .frame(maxWidth: .infinity, minHeight: 80)
                .karte()
                .accessibilityElement(children: .combine)
            }
        }
        .task(id: "\(firma)|\(ort ?? "")|\(zahlseite)") {
            await zeichnen()
            if nameFeld.isEmpty { nameFeld = werbung.bildName }
        }
    }

    /// Text vom Server (gleiche Vorlage) hat Vorrang, sonst der Text aus app-kit.js
    private func kopierText(_ b: GezeichneterBeitrag) -> String {
        if b.kopieren == nil, let t = werbung.werbung?.beitraege?.first(where: { $0.id == b.id })?.text, !t.isEmpty { return t }
        return b.kopierText(zahlseite: zahlseite)
    }

    private func zeichnen() async {
        await werbung.beitraegeZeichnen(firma: firma, ort: ort, zahlseite: zahlseite)
    }

    private func nameUebernehmen() {
        nameFokus = false
        let n = nameFeld
        Task {
            await werbung.nameAendern(n, firma: firma, ort: ort, zahlseite: zahlseite)
            nameFeld = werbung.bildName
        }
    }
}

/// Eine Vorlage: Vorschaubilder, Speichern, Text, Teilen
struct BeitragKachel: View {
    let beitrag: GezeichneterBeitrag
    let zahlseite: String
    let kopierText: String

    @Environment(WerbungStore.self) private var werbung
    @State private var bilder: [UIImage] = []
    @State private var gross: Int?
    @State private var textOffen = false
    @State private var arbeitet = false
    @State private var fehler: String?
    @State private var meldung: String?
    @State private var teilen: TeilenInhalt?

    private var kopierKnopf: String {
        switch beitrag.kopieren {
        case "link": WerbungTexte.linkKopieren
        case "sticker": WerbungTexte.stickerKopieren
        default: WerbungTexte.textKopieren
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline) {
                Text(beitrag.titel).font(.dm(.headline, weight: .bold)).foregroundStyle(Color.tfTinte)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 8)
                Text(beitrag.format).font(.dm(.caption, weight: .semibold)).foregroundStyle(Color.tfLeise)
            }
            .accessibilityElement(children: .combine)
            Text(beitrag.wofuer).font(.dm(.subheadline)).foregroundStyle(Color.tfLeise)
                .fixedSize(horizontal: false, vertical: true)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(Array(bilder.enumerated()), id: \.offset) { i, b in
                        Button { gross = i } label: {
                            Image(uiImage: b)
                                .resizable()
                                .scaledToFit()
                                .frame(height: beitrag.art == "story" ? 300 : 240)
                                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).stroke(Color.tfLinie, lineWidth: 1))
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(WerbungTexte.bildLabel(beitrag.titel, i + 1, bilder.count))
                        .accessibilityHint(WerbungTexte.grossHinweis)
                    }
                }
            }

            Button { speichern(beitrag.bilder) } label: {
                if arbeitet { ProgressView().tint(Color.tfBlau) } else {
                    Label(WerbungTexte.alleSpeichern(beitrag.bilder.count), systemImage: "square.and.arrow.down")
                }
            }
            .buttonStyle(.haupt)
            .disabled(arbeitet)

            KnopfReihe {
                Button {
                    UIPasteboard.general.string = kopierText
                    kurzZeigen(WerbungTexte.kopiert, in: $meldung)
                } label: { Label(kopierKnopf, systemImage: "doc.on.doc") }
                    .buttonStyle(.zweit)
                Button { teilenOeffnen() } label: { Label(WerbungTexte.teilen, systemImage: "square.and.arrow.up") }
                    .buttonStyle(.zweit)
            }
            if beitrag.kopieren == nil {
                Button { withAnimation { textOffen.toggle() } } label: {
                    Text(textOffen ? WerbungTexte.textAusblenden : WerbungTexte.textAnsehen).font(.dm(.subheadline, weight: .semibold))
                }
                .foregroundStyle(Color.tfAkzent)
            }
            if textOffen || beitrag.kopieren != nil {
                PostingText(text: kopierText)
            }
            if let fehler { FehlerZeile(text: fehler) }
            RueckmeldungsText(text: meldung)
        }
        .karte()
        .task(id: beitrag.stand) { bilder = beitrag.bilder.compactMap { UIImage(data: $0) } }
        .fullScreenCover(item: Binding(get: { gross.map { GrossIndex(nr: $0) } }, set: { gross = $0?.nr })) { g in
            BeitragGrossansicht(beitrag: beitrag, bilder: bilder, start: g.nr)
        }
        .sheet(item: $teilen) { TeilenSheet(dinge: $0.dinge).presentationDetents([.medium, .large]) }
    }

    private var dateiName: String {
        "\(TeilenDateien.slug(werbung.bildName))-\(beitrag.id)"
    }

    private func speichern(_ pngs: [Data]) {
        arbeitet = true
        fehler = nil
        Task {
            defer { arbeitet = false }
            do {
                try await FotoSpeicher.bilder(pngs)
                kurzZeigen(WerbungTexte.gespeichert, in: $meldung)
                await werbung.abhaken("werbung")
            } catch {
                fehler = FotoSpeicher.text(error)
            }
        }
    }

    private func teilenOeffnen() {
        let dateien = TeilenDateien.bilder(beitrag.bilder, name: dateiName)
        guard !dateien.isEmpty else { return }
        teilen = TeilenInhalt(dinge: dateien)
    }
}

private struct GrossIndex: Identifiable {
    let nr: Int
    var id: Int { nr }
}

/// Großansicht: Bilder zum Durchwischen, „Dieses Bild speichern“, Teilen
struct BeitragGrossansicht: View {
    let beitrag: GezeichneterBeitrag
    let bilder: [UIImage]
    let start: Int

    @Environment(\.dismiss) private var dismiss
    @Environment(WerbungStore.self) private var werbung
    @State private var seite = 0
    @State private var fehler: String?
    @State private var meldung: String?
    @State private var teilen: TeilenInhalt?

    var body: some View {
        NavigationStack {
            VStack(spacing: 14) {
                TabView(selection: $seite) {
                    ForEach(Array(bilder.enumerated()), id: \.offset) { i, b in
                        Image(uiImage: b)
                            .resizable()
                            .scaledToFit()
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                            .padding(.horizontal, 16)
                            .tag(i)
                            .accessibilityLabel(WerbungTexte.bildLabel(beitrag.titel, i + 1, bilder.count))
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: bilder.count > 1 ? .always : .never))
                .indexViewStyle(.page(backgroundDisplayMode: .always))

                VStack(spacing: 10) {
                    if let fehler { FehlerZeile(text: fehler) }
                    RueckmeldungsText(text: meldung)
                    Button { speichern() } label: { Label(WerbungTexte.diesesBildSpeichern, systemImage: "square.and.arrow.down") }
                        .buttonStyle(.haupt)
                    Button {
                        guard beitrag.bilder.indices.contains(seite) else { return }
                        let d = TeilenDateien.bilder([beitrag.bilder[seite]], name: "\(TeilenDateien.slug(werbung.bildName))-\(beitrag.id)-\(seite + 1)")
                        if !d.isEmpty { teilen = TeilenInhalt(dinge: d) }
                    } label: { Label(WerbungTexte.teilen, systemImage: "square.and.arrow.up") }
                        .buttonStyle(.zweit)
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 8)
            }
            .tfHintergrund()
            .navigationTitle(beitrag.titel)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(Texte.Allgemein.fertig) { dismiss() }.font(.dm(.body, weight: .semibold))
                }
            }
            .sheet(item: $teilen) { TeilenSheet(dinge: $0.dinge).presentationDetents([.medium, .large]) }
        }
        .onAppear { seite = start }
    }

    private func speichern() {
        guard beitrag.bilder.indices.contains(seite) else { return }
        fehler = nil
        Task {
            do {
                try await FotoSpeicher.bilder([beitrag.bilder[seite]])
                kurzZeigen(WerbungTexte.gespeichert, in: $meldung)
                await werbung.abhaken("werbung")
            } catch {
                fehler = FotoSpeicher.text(error)
            }
        }
    }
}
