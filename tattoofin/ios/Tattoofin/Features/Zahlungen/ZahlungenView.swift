import SwiftUI

/// Tab 2: Zahlungen (Bildschirm 8) und Auszahlungen (Bildschirm 10)
struct ZahlungenView: View {
    enum Bereich: Hashable { case zahlungen, auszahlungen }
    enum Filter: Hashable { case alle, offen, bezahlt }

    @Environment(AppState.self) private var app
    @Environment(PortalStore.self) private var portal
    @State private var bereich = Bereich.zahlungen
    @State private var filter = Filter.alle
    @State private var suche = ""
    @State private var pfad = NavigationPath()

    private var gefiltert: [Zahlung] {
        portal.zahlungen.filter { z in
            switch filter {
            case .alle: true
            case .offen: z.istOffen
            case .bezahlt: z.istBezahlt
            }
        }
        .filter { z in
            let s = suche.trimmingCharacters(in: .whitespaces)
            guard !s.isEmpty else { return true }
            return [z.kunde, z.email, z.beschreibung, z.gutschein?.code].compactMap { $0 }
                .contains { $0.localizedCaseInsensitiveContains(s) }
        }
    }

    var body: some View {
        NavigationStack(path: $pfad) {
            VStack(spacing: 0) {
                Picker(Texte.Zahlungen.bereich, selection: $bereich) {
                    Text(Texte.Zahlungen.zahlungen).tag(Bereich.zahlungen)
                    Text(Texte.Zahlungen.auszahlungen).tag(Bereich.auszahlungen)
                }
                .tfSegmente()
                .padding(.horizontal, 16)
                .padding(.vertical, 8)

                switch bereich {
                case .zahlungen: zahlungsListe
                case .auszahlungen: AuszahlungenView()
                }
            }
            .tfHintergrund()
            .navigationTitle(bereich == .zahlungen ? Texte.Zahlungen.zahlungen : Texte.Zahlungen.auszahlungen)
            .navigationBarTitleDisplayMode(.inline)
            .navigationDestination(for: String.self) { id in
                ZahlungDetailView(id: id, vorschau: portal.zahlungen.first { $0.id == id })
            }
        }
        .onChange(of: app.sprungziel) { _, ziel in springen(ziel) }
        .onAppear { springen(app.sprungziel) }
    }

    private func springen(_ ziel: Sprungziel?) {
        guard let ziel else { return }
        switch ziel {
        case .auszahlungen:
            pfad = NavigationPath()
            bereich = .auszahlungen
        case let .zahlung(id):
            bereich = .zahlungen
            pfad = NavigationPath()
            pfad.append(id)
        }
        app.sprungziel = nil
    }

    private var zahlungsListe: some View {
        TFListe {
            // Kennzahlen als Kopf des Abschnitts: Zeilen in .insetGrouped werden an den Ecken abgerundet beschnitten
            Section {
                Picker(Texte.Zahlungen.filter, selection: $filter) {
                    Text(Texte.Zahlungen.alle).tag(Filter.alle)
                    Text(Texte.Zahlungen.offen).tag(Filter.offen)
                    Text(Texte.Zahlungen.bezahlt).tag(Filter.bezahlt)
                }
                .tfSegmente()
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)
                .listRowInsets(EdgeInsets(top: 0, leading: 0, bottom: 0, trailing: 0))
            } header: {
                KPIKopf(kpis: portal.kpisAnzeige)
                    .textCase(nil)
                    .padding(.horizontal, -20)
                    .padding(.bottom, 8)
            }

            if let f = portal.fehler {
                Section { FehlerZeile(text: f) }
            }

            Section {
                if gefiltert.isEmpty {
                    if portal.laedt && portal.zahlungen.isEmpty {
                        LadeAnsicht().frame(minHeight: 160)
                    } else {
                        LeerAnsicht(titel: Texte.Zahlungen.leerTitel,
                                    text: suche.isEmpty ? Texte.Zahlungen.leerText : Texte.Zahlungen.keinTreffer,
                                    symbol: "list.bullet.rectangle")
                    }
                } else {
                    ForEach(gefiltert) { z in
                        NavigationLink(value: z.id) { ZahlungZeile(zahlung: z) }
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
        .scrollContentBackground(.hidden)
        .searchable(text: $suche, placement: .navigationBarDrawer(displayMode: .automatic), prompt: Texte.Zahlungen.suche)
        .refreshable { await portal.laden() }
    }
}

/// Kennzahlen: Umsatz diesen Monat, Zahlungen, offene Links
struct KPIKopf: View {
    let kpis: KPIs?
    @Environment(\.dynamicTypeSize) private var schrift

    var body: some View {
        // Bedienungshilfe-Größen: Kacheln untereinander statt nebeneinander (DS: umbrechen statt verkleinern)
        let layout = schrift.isAccessibilitySize ? AnyLayout(VStackLayout(spacing: 8)) : AnyLayout(HStackLayout(alignment: .top, spacing: 8))
        layout {
            kachel(Texte.Zahlungen.kpiUmsatz, kpis.map { Euro.text($0.umsatzMonatCent ?? 0) } ?? "–")
            kachel(Texte.Zahlungen.kpiAnzahl, kpis.map { "\($0.zahlungenMonat ?? 0)" } ?? "–")
            kachel(Texte.Zahlungen.kpiOffen, kpis.map { "\($0.offen ?? 0)" } ?? "–")
        }
        .fixedSize(horizontal: false, vertical: true)
    }

    private func kachel(_ titel: String, _ wert: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(wert)
                .font(.dm(.title3, weight: .bold))
                .foregroundStyle(Color.tfTinte)
                // Betrag nicht mitten in der Zahl umbrechen („1.080,00“ / „€“): normal einzeilig und notfalls kleiner, bei sehr großer Schrift umbrechen
                .lineLimit(schrift.isAccessibilitySize ? nil : 1)
                .minimumScaleFactor(0.6)
                .fixedSize(horizontal: false, vertical: true)
            Text(titel)
                .font(.dm(.caption, weight: .medium))
                .foregroundStyle(Color.tfLeise)
                // Alle Kacheln gleich hoch: Platz für zwei Zeilen auch bei kurzer Beschriftung (bei sehr großer Schrift frei umbrechen)
                .lineLimit(schrift.isAccessibilitySize ? 10 : 2, reservesSpace: !schrift.isAccessibilitySize)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(12)
        .background(Color.tfKarte, in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Color.tfLinie, lineWidth: 1))
        .accessibilityElement(children: .combine)
    }
}

struct ZahlungZeile: View {
    let zahlung: Zahlung
    @Environment(\.dynamicTypeSize) private var schrift

    var body: some View {
        // Bedienungshilfe-Größen: Betrag und Status unter den Namen statt daneben
        let layout = schrift.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 6)) : AnyLayout(HStackLayout(alignment: .top, spacing: 12))
        layout {
            VStack(alignment: .leading, spacing: 3) {
                // Ohne Kundennamen: das Motiv als Titel, darunter leise „ohne Kundennamen“ (statt fettem „Ohne Namen“)
                let kunde = zahlung.kunde?.leerAlsNil
                Text(kunde ?? zahlung.titel)
                    .font(.dm(.body, weight: .semibold))
                    .foregroundStyle(Color.tfTinte)
                    .lineLimit(kunde == nil ? 2 : nil)
                Text(kunde == nil ? Texte.ZahlungenG2.ohneKundenname : zahlung.titel)
                    .font(.dm(.subheadline))
                    .foregroundStyle(Color.tfLeise)
                    .lineLimit(2)
                if let d = Datum.tag(zahlung.bezahltAm ?? zahlung.createdAt) {
                    Text(d).font(.dm(.caption)).foregroundStyle(Color.tfLeise)
                }
            }
            if !schrift.isAccessibilitySize { Spacer(minLength: 8) }
            VStack(alignment: schrift.isAccessibilitySize ? .leading : .trailing, spacing: 6) {
                Text(Euro.text(zahlung.betragCent))
                    .font(.dm(.body, weight: .bold))
                    .foregroundStyle(Color.tfTinte)
                    .fixedSize(horizontal: false, vertical: true)
                StatusChip(zahlung: zahlung.anzeigeStatus)
            }
        }
        .padding(.vertical, 2)
        .accessibilityElement(children: .combine)
    }
}
