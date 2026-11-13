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
                .pickerStyle(.segmented)
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
        List {
            Section {
                KPIKopf(kpis: portal.kpis)
                    .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 8, trailing: 0))
                    .listRowBackground(Color.clear)
                Picker(Texte.Zahlungen.filter, selection: $filter) {
                    Text(Texte.Zahlungen.alle).tag(Filter.alle)
                    Text(Texte.Zahlungen.offen).tag(Filter.offen)
                    Text(Texte.Zahlungen.bezahlt).tag(Filter.bezahlt)
                }
                .pickerStyle(.segmented)
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets(top: 0, leading: 0, bottom: 0, trailing: 0))
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

    var body: some View {
        HStack(spacing: 8) {
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
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            Text(titel)
                .font(.dm(.caption, weight: .medium))
                .foregroundStyle(Color.tfLeise)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(12)
        .background(Color.tfKarte, in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.tfLinie, lineWidth: 1))
        .accessibilityElement(children: .combine)
    }
}

struct ZahlungZeile: View {
    let zahlung: Zahlung

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text(zahlung.kunde?.leerAlsNil ?? Texte.Zahlungen.ohneName)
                    .font(.dm(.body, weight: .semibold))
                    .foregroundStyle(Color.tfTinte)
                Text(zahlung.titel)
                    .font(.dm(.subheadline))
                    .foregroundStyle(Color.tfLeise)
                    .lineLimit(2)
                if let d = Datum.tag(zahlung.bezahltAm ?? zahlung.createdAt) {
                    Text(d).font(.dm(.caption)).foregroundStyle(Color.tfLeise)
                }
            }
            Spacer(minLength: 8)
            VStack(alignment: .trailing, spacing: 6) {
                Text(Euro.text(zahlung.betragCent))
                    .font(.dm(.body, weight: .bold))
                    .foregroundStyle(Color.tfTinte)
                StatusChip(zahlung: zahlung.status)
            }
        }
        .padding(.vertical, 2)
        .accessibilityElement(children: .combine)
    }
}
