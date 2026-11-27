import SwiftUI

/// Tab 2: Zahlungen (Bildschirm 8). Auszahlungen (Bildschirm 10) öffnen über die Karte oben in der Liste.
/// Abnahme G4: keine zwei Umschalter übereinander mehr. Der Filter „Alle | Offen | Bezahlt“ sitzt als Menü in der
/// Navigationsleiste (bricht bei keiner Schriftgröße um), Auszahlungen sind eine Karte mit dem verfügbaren Betrag.
struct ZahlungenView: View {
    enum Filter: Hashable { case alle, offen, bezahlt }
    /// Ziele im Navigationspfad neben den Zahlungs-IDs (String)
    enum Ziel: Hashable { case auszahlungen }

    @Environment(AppState.self) private var app
    @Environment(PortalStore.self) private var portal
    @State private var filter = Filter.alle
    @State private var suche = ""
    @State private var pfad = NavigationPath()
    /// Verfügbarer Betrag für die Auszahlungen-Karte (nil: noch nicht geladen oder kein Bankkonto)
    @State private var saldo: Saldo?

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

    private func name(_ f: Filter) -> String {
        switch f {
        case .alle: Texte.Zahlungen.alle
        case .offen: Texte.Zahlungen.offen
        case .bezahlt: Texte.Zahlungen.bezahlt
        }
    }

    var body: some View {
        NavigationStack(path: $pfad) {
            zahlungsListe
                .tfHintergrund()
                .navigationTitle(Texte.Zahlungen.zahlungen)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .topBarTrailing) { filterMenue }
                }
                .navigationDestination(for: String.self) { id in
                    ZahlungDetailView(id: id, vorschau: portal.zahlungen.first { $0.id == id })
                }
                .navigationDestination(for: Ziel.self) { _ in
                    AuszahlungenView()
                        .tfHintergrund()
                        .navigationTitle(Texte.Zahlungen.auszahlungen)
                        .navigationBarTitleDisplayMode(.inline)
                }
        }
        .onChange(of: app.sprungziel) { _, ziel in springen(ziel) }
        .onAppear { springen(app.sprungziel) }
        .task(id: portal.geladenAm) { await saldoLaden() }
    }

    /// Filter als Menü: ein Symbol in der Leiste, gefüllt, wenn ein Filter aktiv ist
    private var filterMenue: some View {
        Menu {
            Picker(Texte.Zahlungen.filter, selection: $filter) {
                ForEach([Filter.alle, .offen, .bezahlt], id: \.self) { f in
                    Text(name(f)).tag(f)
                }
            }
            .pickerStyle(.inline)
        } label: {
            Image(systemName: filter == .alle ? "line.3.horizontal.decrease.circle" : "line.3.horizontal.decrease.circle.fill")
                .font(.dm(.title3))
                .foregroundStyle(Color.tfTinte)
        }
        .accessibilityLabel(Texte.AbnahmeG4.filterZeigen)
        .accessibilityValue(name(filter))
        .accessibilityIdentifier("zahlungen-filter")
    }

    private func springen(_ ziel: Sprungziel?) {
        guard let ziel else { return }
        switch ziel {
        case .auszahlungen:
            pfad = NavigationPath()
            pfad.append(Ziel.auszahlungen)
        case let .zahlung(id):
            pfad = NavigationPath()
            pfad.append(id)
        }
        app.sprungziel = nil
    }

    private func saldoLaden() async {
        do {
            let a = try await APIClient.shared.auszahlungen(limit: 1)
            saldo = a.konto?.verbunden == false ? nil : a.saldo
        } catch {
            // Ohne Betrag zeigt die Karte nur „Auszahlungen“ (kein Fehler in der Zahlungsliste)
        }
    }

    private var zahlungsListe: some View {
        TFListe {
            // Kennzahlen als Kopf des Abschnitts: Zeilen in .insetGrouped werden an den Ecken abgerundet beschnitten
            Section {
                NavigationLink(value: Ziel.auszahlungen) {
                    AuszahlungenKarteZeile(saldo: saldo)
                }
                .accessibilityIdentifier("auszahlungen-karte")
                .accessibilityHint(Texte.AbnahmeG4.auszahlungenHinweis)
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
            } header: {
                // Aktiver Filter sichtbar über der Liste, mit einem Tipp zurück zu „Alle“
                if filter != .alle {
                    FilterHinweis(text: Texte.AbnahmeG4.gefiltert(name(filter))) {
                        withAnimation { filter = .alle }
                    }
                    .textCase(nil)
                }
            }
        }
        .listStyle(.insetGrouped)
        .listSectionSpacing(.compact)
        .scrollContentBackground(.hidden)
        .searchable(text: $suche, placement: .navigationBarDrawer(displayMode: .automatic), prompt: Texte.Zahlungen.suche)
        // Neu laden setzt portal.geladenAm, damit holt .task(id:) oben auch den Betrag der Auszahlungen-Karte neu
        .refreshable { await portal.laden() }
    }
}

/// Karte „Auszahlungen ›“ mit dem verfügbaren Betrag (öffnet die Auszahlungen)
struct AuszahlungenKarteZeile: View {
    let saldo: Saldo?
    @ScaledMetric(relativeTo: .body) private var symbol: CGFloat = 36
    @Environment(\.dynamicTypeSize) private var schrift

    var body: some View {
        // Bedienungshilfe-Größen: Symbol über dem Text, sonst bricht „Auszahlungen“ mitten im Wort (Rundgang 1.1, AX3)
        let layout = schrift.isAccessibilitySize ? AnyLayout(VStackLayout(alignment: .leading, spacing: 8)) : AnyLayout(HStackLayout(spacing: 12))
        layout {
            Image(systemName: "building.columns.fill")
                .font(.dm(.body, weight: .semibold))
                .foregroundStyle(Color.tfBlau)
                .frame(width: symbol, height: symbol)
                .background(Color.tfGelb, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                .accessibilityHidden(true)
                .dynamicTypeSize(...DynamicTypeSize.accessibility2)  // ds-ok: Schmuck-Symbol, wächst nicht über AX2
            VStack(alignment: .leading, spacing: 2) {
                Text(Texte.Zahlungen.auszahlungen)
                    .font(.dm(.body, weight: .semibold))
                    .foregroundStyle(Color.tfTinte)
                    // Ein langes Wort: einzeilig und notfalls kleiner, nie „Auszahlun-gen“ (SE, größte Schrift)
                    .lineLimit(1)
                    .minimumScaleFactor(0.5)
                Text(saldo.map { Texte.AbnahmeG4.verfuegbar(Euro.text($0.verfuegbarCent)) } ?? Texte.AbnahmeG4.auszahlungenUnterzeile)
                    .font(.dm(.subheadline, weight: saldo == nil ? .regular : .semibold))
                    .foregroundStyle(saldo == nil ? Color.tfLeise : Color.tfGruen)
                    .contentTransition(.numericText())
                    .fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
    }
}

/// Kleiner Hinweis „Nur: Offen ✕“ über der Liste, solange ein Filter aktiv ist
struct FilterHinweis: View {
    let text: String
    let zuruecksetzen: () -> Void

    var body: some View {
        Button(action: zuruecksetzen) {
            HStack(spacing: 6) {
                Text(text)
                    .font(.dm(.subheadline, weight: .semibold))
                    .fixedSize(horizontal: false, vertical: true)
                Image(systemName: "xmark.circle.fill")
                    .font(.dm(.subheadline))
                    .accessibilityHidden(true)
            }
            .foregroundStyle(Color.tfTinte)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(Color.tfKarte, in: Capsule())
            .overlay(Capsule().strokeBorder(Color.tfLinie, lineWidth: 1))
        }
        .buttonStyle(.plain)
        .padding(.leading, -20)
        .accessibilityLabel(text)
        .accessibilityHint(Texte.AbnahmeG4.alleZeigen)
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
            kachel(Texte.Zahlungen.kpiUmsatz, kpis.map { Euro.kurz($0.umsatzMonatCent ?? 0) } ?? "–")
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
                // Mindestens zwei Zeilen Platz, mehr erlaubt (kein Abschneiden, DS-Audit); gleiche Kachelhöhe kommt vom Rahmen unten
                .lineLimit(2...)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        .padding(12)
        .background(Color.tfKarte, in: RoundedRectangle(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Color.tfLinie, lineWidth: 1))
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("kpi-kachel")
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
                    .lineLimit(schrift.isAccessibilitySize ? nil : (kunde == nil ? 2 : nil))
                Text(kunde == nil ? Texte.ZahlungenG2.ohneKundenname : zahlung.titel)
                    .font(.dm(.subheadline))
                    .foregroundStyle(Color.tfLeise)
                    // Normal zwei Zeilen; bei Bedienungshilfen-Größen frei, sonst „ohne Kundennam…“ abgeschnitten (Abnahme G4).
                    // „ohne Kundennamen“ selbst bei Bedienungshilfen-Größen einzeilig und notfalls kleiner (sonst „Kundennam-en“ auf dem SE)
                    .lineLimit(kunde == nil && schrift.isAccessibilitySize ? 1 : (schrift.isAccessibilitySize ? nil : 2))
                    .minimumScaleFactor(kunde == nil ? 0.5 : 1)
                    .fixedSize(horizontal: false, vertical: schrift.isAccessibilitySize)
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
