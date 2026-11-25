import SwiftUI

/// Bildschirm 13: Gutschein-Detail. Wert (bei Aktions-Gutscheinen mit Bonus), einlösen (ganz oder – wenn der Server es kann – in Teilen),
/// zurücknehmen, PDF teilen, erneut mailen.
struct GutscheinDetailView: View {
    @Environment(PortalStore.self) private var portal
    @State private var zahlung: Zahlung
    @State private var einloesenFrage = false
    @State private var zuruecknehmenFrage = false
    @State private var notiz = ""
    @State private var arbeitet = false
    @State private var fehler: String?
    @State private var meldung: String?
    @State private var pdf: URL?
    @State private var pdfTeilen = false
    @State private var linkSheet: ZahlungErstellt?
    @State private var eingeloestZaehler = 0
    @State private var link: String?
    /// Neuladen fehlgeschlagen: der gezeigte Stand ist evtl. alt (DS „ohne Netz“: Stand mit Uhrzeit statt still)
    @State private var aktualisierenFehler: String?
    @State private var stand: Date?
    @State private var teilBlatt = false
    /// Einlösen/Zurücknehmen läuft: Knöpfe gesperrt, kein Doppel-Tipp (sonst 409 oder ein zweiter Teil)
    @State private var bucht = false

    init(zahlung: Zahlung) {
        _zahlung = State(initialValue: zahlung)
    }

    private var g: GutscheinInfo { zahlung.gutschein ?? GutscheinInfo() }
    private var status: String { g.status ?? "offen" }

    var body: some View {
        TFListe {
            Section {
                VStack(alignment: .leading, spacing: 10) {
                    HStack(alignment: .firstTextBaseline) {
                        Text(Euro.text(zahlung.gutscheinWertCent))
                            .font(.luckiest(38, relativeTo: .largeTitle))
                            .foregroundStyle(Color.tfTinte)
                            .accessibilityLabel(Texte.GutscheinWert.wertTitel + " " + Euro.gesprochen(zahlung.gutscheinWertCent))
                        Spacer()
                        StatusChip(gutschein: g.status)
                    }
                    if zahlung.gutscheinBezahltAbweichend {
                        Text(Texte.GutscheinWert.bezahlt(zahlung.gutscheinBezahltCent))
                            .font(.dm(.subheadline)).foregroundStyle(Color.tfLeise)
                    }
                    if zahlung.gutscheinMitBonus, let bis = Datum.tag(g.bonusBis) {
                        Text(Texte.GutscheinWert.bonusZeile(wert: zahlung.gutscheinWertCent, bis: bis, danach: zahlung.gutscheinBezahltCent))
                            .font(.dm(.subheadline)).foregroundStyle(Color.tfLeise)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    if zahlung.gutscheinZeigtHeuteEinloesbar {
                        Text(Texte.GutscheinWert.heuteEinloesbarZeile(zahlung.gutscheinRestCent)
                             + (zahlung.gutscheinBonusVorbei() ? " (\(Texte.GutscheinWert.bonusVorbei))" : ""))
                            .font(.dm(.body, weight: .semibold)).foregroundStyle(Color.tfTinte)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    if let c = g.code {
                        Text(c)
                            .font(.system(.title2, design: .monospaced).weight(.bold))
                            .foregroundStyle(Color.tfTinte)
                            .textSelection(.enabled)
                            .accessibilityLabel(Texte.Gutscheine.codeLabel(c))
                    }
                    if status == "eingeloest", let d = Datum.tagUhrzeit(g.eingeloestAm) {
                        Text(Texte.Gutscheine.eingeloestAm(d)).font(.dm(.body, weight: .semibold)).foregroundStyle(Color.tfLeise)
                    }
                    if let aktualisierenFehler {
                        TeilFehlerZeile(text: aktualisierenFehler) { Task { await neuLaden() } }
                    }
                }
                .padding(.vertical, 4)
            }

            Section {
                if let d = Datum.tag(g.gueltigBis) { WertZeile(titel: Texte.Gutscheine.gueltigBis, wert: d) }
                if let k = zahlung.kunde?.leerAlsNil { WertZeile(titel: Texte.Gutscheine.kaeufer, wert: k) }
                if let e = zahlung.email?.leerAlsNil { WertZeile(titel: Texte.Gutscheine.kaeuferEmail, wert: e) }
                if let e = g.empfaenger?.leerAlsNil { WertZeile(titel: Texte.Gutscheine.empfaengerKurz, wert: e) }
                if let n = g.nachricht?.leerAlsNil { WertZeile(titel: Texte.Gutscheine.nachrichtKurz, wert: n) }
                if let n = g.einloeseNotiz?.leerAlsNil { WertZeile(titel: Texte.Gutscheine.notiz, wert: n) }
                if let d = Datum.tagUhrzeit(zahlung.bezahltAm) { WertZeile(titel: Texte.Detail.bezahlt, wert: d) }
                if let d = Datum.tagUhrzeit(g.gesendetAm) { WertZeile(titel: Texte.Gutscheine.gesendet, wert: d) }
            }

            if !zahlung.gutscheinTeile.isEmpty {
                Section {
                    ForEach(Array(zahlung.gutscheinTeile.enumerated()), id: \.offset) { _, t in
                        VStack(alignment: .leading, spacing: 2) {
                            Text(Texte.GutscheinWert.teilZeile(t.cent, am: Datum.tagUhrzeit(t.am)))
                                .foregroundStyle(Color.tfTinte)
                            if let n = t.notiz?.leerAlsNil {
                                Text(n).font(.dm(.subheadline)).foregroundStyle(Color.tfLeise)
                            }
                        }
                        .accessibilityElement(children: .combine)
                    }
                } header: {
                    ListenKopf(Texte.GutscheinWert.teileTitel)
                }
            }

            Section {
                switch status {
                case "gueltig", "abgelaufen":
                    if status == "abgelaufen" {
                        Text(Texte.Gutscheine.abgelaufenHinweis).font(.dm(.subheadline)).foregroundStyle(Color.tfLeise)
                    }
                    Button {
                        notiz = ""
                        if zahlung.gutscheinTeilbar { teilBlatt = true } else { einloesenFrage = true }
                    } label: {
                        HStack(spacing: 8) {
                            if bucht { ProgressView().tint(Color.tfBlau) }
                            Label(Texte.Gutscheine.einloesen, systemImage: "checkmark.seal.fill")
                        }
                    }
                    .buttonStyle(.haupt)
                    .disabled(bucht)
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                    if zahlung.gutscheinKannZuruecknehmen { zuruecknehmenKnopf }
                case "eingeloest":
                    zuruecknehmenKnopf
                case "offen":
                    Text(Texte.Gutscheine.nochNichtBezahlt).font(.dm(.subheadline)).foregroundStyle(Color.tfLeise)
                    if let link {
                        Button {
                            linkSheet = ZahlungErstellt(zahlung: zahlung, link: link, whatsappText: nil, hinweis: nil)
                        } label: {
                            Label(Texte.Detail.qrZeigen, systemImage: "qrcode")
                        }
                    }
                default:
                    EmptyView()
                }
            }

            Section {
                if g.code != nil {
                    if let pdf {
                        ShareLink(item: pdf) { Label(Texte.Gutscheine.pdfTeilen, systemImage: "doc.richtext") }
                    } else {
                        Button {
                            Task { await pdfLaden() }
                        } label: {
                            HStack {
                                Label(Texte.Gutscheine.pdfLaden, systemImage: "doc.richtext")
                                if arbeitet { Spacer(); ProgressView() }
                            }
                        }
                        .disabled(arbeitet)
                    }
                    // Nur mit hinterlegter Käufer-Adresse (sonst gäbe es nur eine Fehlermeldung)
                    if zahlung.email?.leerAlsNil != nil {
                        Button {
                            Task { await erneutSenden() }
                        } label: {
                            Label(Texte.Gutscheine.erneutMailen, systemImage: "envelope")
                        }
                        .disabled(arbeitet)
                    } else {
                        Text(Texte.Gutscheine.keineKaeuferEmail).font(.dm(.footnote)).foregroundStyle(Color.tfLeise)
                    }
                }
                if let meldung { Text(meldung).font(.dm(.subheadline)).foregroundStyle(Color.tfGruen) }
                if let fehler { FehlerZeile(text: fehler) }
            }
        }
        .font(.dm(.body))
        .scrollContentBackground(.hidden)
        .tfHintergrund()
        .navigationTitle(Texte.Gutscheine.detailTitel)
        .navigationBarTitleDisplayMode(.inline)
        .sensoryFeedback(.success, trigger: eingeloestZaehler)
        .sheet(item: $linkSheet) { ZahlungslinkSheet(erstellt: $0) }
        .sheet(isPresented: $pdfTeilen) {
            if let pdf { TeilenSheet(dinge: [pdf]).presentationDetents([.medium, .large]).ignoresSafeArea() }
        }
        .alert(Texte.Gutscheine.einloesenFrage, isPresented: $einloesenFrage) {
            TextField(Texte.Gutscheine.notizOptional, text: $notiz)
                .accessibilityLabel(Texte.Gutscheine.notizOptional)
            Button(Texte.Gutscheine.einloesenJa) { Task { await einloesen(.alles) } }
            Button(Texte.Allgemein.abbrechen, role: .cancel) {}
        } message: {
            Text(Texte.GutscheinWert.einloesenGanz(zahlung.gutscheinRestCent))
        }
        .alert(Texte.Gutscheine.zuruecknehmenFrage, isPresented: $zuruecknehmenFrage) {
            Button(Texte.Gutscheine.zuruecknehmen, role: .destructive) { Task { await zuruecknehmen() } }
            Button(Texte.Allgemein.abbrechen, role: .cancel) {}
        } message: {
            if status != "eingeloest", let letzter = zahlung.gutscheinTeile.last {
                Text(Texte.GutscheinWert.letzteZuruecknehmenFrage(letzter.cent))
            }
        }
        .sheet(isPresented: $teilBlatt) {
            TeilEinloesenBlatt(rest: zahlung.gutscheinRestCent, abgelaufen: status == "abgelaufen") { auswahl, notiz in
                teilBlatt = false
                Task { await einloesen(auswahl, notiz: notiz) }
            }
        }
        .refreshable { await neuLaden() }
        .task { await neuLaden() }
    }

    private func neuLaden() async {
        do {
            let a = try await APIClient.shared.zahlung(zahlung.id)
            uebernehmen(a.zahlung)
            link = a.link
            stand = .now
            aktualisierenFehler = nil
        } catch {
            aktualisierenFehler = Texte.Fehler.aktualisierenFehlgeschlagen(stand?.formatted(date: .omitted, time: .shortened))
        }
    }

    private func uebernehmen(_ z: Zahlung) {
        zahlung = z
        portal.aktualisieren(z)
    }

    /// Knopf „Einlösung zurücknehmen“ bzw. bei Teil-Einlösungen „Letzte Einlösung zurücknehmen“
    private var zuruecknehmenKnopf: some View {
        Button(role: .destructive) { zuruecknehmenFrage = true } label: {
            HStack(spacing: 8) {
                Label(zahlung.gutscheinTeile.isEmpty ? Texte.Gutscheine.zuruecknehmen : Texte.GutscheinWert.letzteZuruecknehmen,
                      systemImage: "arrow.uturn.backward")
                if bucht { Spacer(); ProgressView() }
            }
        }
        .disabled(bucht)
    }

    private func einloesen(_ auswahl: TeilEinloesung = .alles, notiz eigeneNotiz: String? = nil) async {
        guard !bucht else { return }
        bucht = true
        fehler = nil
        meldung = nil
        defer { bucht = false }
        let vorher = zahlung.gutscheinRestCent
        var betrag: String?
        if case let .betrag(c) = auswahl { betrag = TeilEinloesung.fuerServer(c) }
        do {
            let z = try await APIClient.shared.gutscheinEinloesen(zahlung.id, notiz: (eigeneNotiz ?? notiz).leerAlsNil, betrag: betrag)
            uebernehmen(z)
            eingeloestZaehler += 1
            if z.gutscheinStatus == "eingeloest" {
                if case let .betrag(c) = auswahl { meldung = Texte.GutscheinWert.eingeloest(c) } else { meldung = Texte.GutscheinWert.eingeloest(vorher) }
            } else {
                meldung = Texte.GutscheinWert.eingeloestRest(z.gutscheinRestCent)
            }
        } catch {
            fehler = fehlerText(error)
        }
    }

    private func zuruecknehmen() async {
        guard !bucht else { return }
        bucht = true
        fehler = nil
        meldung = nil
        defer { bucht = false }
        do {
            uebernehmen(try await APIClient.shared.gutscheinEinloesungZuruecknehmen(zahlung.id))
            meldung = Texte.GutscheinWert.zurueckgenommen
        } catch {
            fehler = fehlerText(error)
        }
    }

    private func pdfLaden() async {
        arbeitet = true
        fehler = nil
        defer { arbeitet = false }
        do {
            let daten = try await APIClient.shared.gutscheinPDF(zahlung.id)
            let ziel = FileManager.default.temporaryDirectory.appending(path: "Gutschein-\(g.code ?? zahlung.id).pdf")
            try daten.write(to: ziel, options: .atomic)
            pdf = ziel
            pdfTeilen = true
        } catch {
            fehler = fehlerText(error)
        }
    }

    private func erneutSenden() async {
        arbeitet = true
        fehler = nil
        meldung = nil
        defer { arbeitet = false }
        do {
            let a = try await APIClient.shared.gutscheinSenden(zahlung.id)
            if a.gesendet == false { fehler = Texte.Gutscheine.mailFehler } else { meldung = Texte.Gutscheine.mailGesendet(zahlung.email ?? "") }
        } catch {
            fehler = fehlerText(error)
        }
    }
}
