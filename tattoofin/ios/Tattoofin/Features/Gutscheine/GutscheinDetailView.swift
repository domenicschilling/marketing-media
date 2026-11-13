import SwiftUI

/// Bildschirm 13: Gutschein-Detail. Einlösen (immer der ganze Wert), zurücknehmen, PDF teilen, erneut mailen.
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
    @State private var linkSheet: ZahlungErstellt?
    @State private var eingeloestZaehler = 0
    @State private var link: String?

    init(zahlung: Zahlung) {
        _zahlung = State(initialValue: zahlung)
    }

    private var g: GutscheinInfo { zahlung.gutschein ?? GutscheinInfo() }
    private var status: String { g.status ?? "offen" }

    var body: some View {
        List {
            Section {
                VStack(alignment: .leading, spacing: 10) {
                    HStack(alignment: .firstTextBaseline) {
                        Text(Euro.text(zahlung.betragCent))
                            .font(.luckiest(38, relativeTo: .largeTitle))
                            .foregroundStyle(Color.tfTinte)
                        Spacer()
                        StatusChip(gutschein: g.status)
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
                }
                .padding(.vertical, 4)
            }

            Section {
                if let d = Datum.tag(g.gueltigBis) { WertZeile(titel: Texte.Gutscheine.gueltigBis, wert: d) }
                if let k = zahlung.kunde?.leerAlsNil { WertZeile(titel: Texte.Gutscheine.kaeufer, wert: k) }
                if let e = zahlung.email?.leerAlsNil { WertZeile(titel: Texte.Gutscheine.kaeuferEmail, wert: e) }
                if let e = g.empfaenger?.leerAlsNil { WertZeile(titel: Texte.Gutscheine.empfaenger, wert: e) }
                if let n = g.nachricht?.leerAlsNil { WertZeile(titel: Texte.Gutscheine.nachricht, wert: n) }
                if let n = g.einloeseNotiz?.leerAlsNil { WertZeile(titel: Texte.Gutscheine.notiz, wert: n) }
                if let d = Datum.tagUhrzeit(zahlung.bezahltAm) { WertZeile(titel: Texte.Detail.bezahlt, wert: d) }
                if let d = Datum.tagUhrzeit(g.gesendetAm) { WertZeile(titel: Texte.Gutscheine.gesendet, wert: d) }
            }

            Section {
                switch status {
                case "gueltig", "abgelaufen":
                    if status == "abgelaufen" {
                        Text(Texte.Gutscheine.abgelaufenHinweis).font(.dm(.subheadline)).foregroundStyle(Color.tfLeise)
                    }
                    Button {
                        notiz = ""
                        einloesenFrage = true
                    } label: {
                        Label(Texte.Gutscheine.einloesen, systemImage: "checkmark.seal.fill")
                    }
                    .buttonStyle(.haupt)
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                case "eingeloest":
                    Button(role: .destructive) { zuruecknehmenFrage = true } label: {
                        Label(Texte.Gutscheine.zuruecknehmen, systemImage: "arrow.uturn.backward")
                    }
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
                    Button {
                        Task { await erneutSenden() }
                    } label: {
                        Label(Texte.Gutscheine.erneutMailen, systemImage: "envelope")
                    }
                    .disabled(arbeitet)
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
        .alert(Texte.Gutscheine.einloesenFrage, isPresented: $einloesenFrage) {
            TextField(Texte.Gutscheine.notizOptional, text: $notiz)
            Button(Texte.Gutscheine.einloesenJa) { Task { await einloesen() } }
            Button(Texte.Allgemein.abbrechen, role: .cancel) {}
        } message: {
            Text(Texte.Gutscheine.einloesenText(zahlung.betragCent))
        }
        .confirmationDialog(Texte.Gutscheine.zuruecknehmenFrage, isPresented: $zuruecknehmenFrage, titleVisibility: .visible) {
            Button(Texte.Gutscheine.zuruecknehmen, role: .destructive) { Task { await zuruecknehmen() } }
            Button(Texte.Allgemein.abbrechen, role: .cancel) {}
        }
        .refreshable { await neuLaden() }
        .task { await neuLaden() }
    }

    private func neuLaden() async {
        if let a = try? await APIClient.shared.zahlung(zahlung.id) {
            uebernehmen(a.zahlung)
            link = a.link
        }
    }

    private func uebernehmen(_ z: Zahlung) {
        zahlung = z
        portal.aktualisieren(z)
    }

    private func einloesen() async {
        arbeitet = true
        fehler = nil
        meldung = nil
        defer { arbeitet = false }
        do {
            uebernehmen(try await APIClient.shared.gutscheinEinloesen(zahlung.id, notiz: notiz.leerAlsNil))
            eingeloestZaehler += 1
        } catch {
            fehler = fehlerText(error)
        }
    }

    private func zuruecknehmen() async {
        arbeitet = true
        fehler = nil
        defer { arbeitet = false }
        do {
            uebernehmen(try await APIClient.shared.gutscheinEinloesungZuruecknehmen(zahlung.id))
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
