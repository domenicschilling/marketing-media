import SwiftUI

/// Bildschirm 9: Zahlungs-Detail. Erstattungen gibt es in der App bewusst nicht.
struct ZahlungDetailView: View {
    let id: String

    @Environment(PortalStore.self) private var portal
    @State private var zahlung: Zahlung?
    @State private var link: String?
    @State private var teilText: String?
    @State private var fehler: String?
    @State private var aktionFehler: String?
    @State private var linkSheet: ZahlungErstellt?
    @State private var bestaetigung: LinkAntwort?
    @State private var laedtBestaetigung = false
    @State private var stornoFrage = false

    init(id: String, vorschau: Zahlung? = nil) {
        self.id = id
        _zahlung = State(initialValue: vorschau)
    }

    var body: some View {
        Group {
            if let z = zahlung {
                inhalt(z)
            } else if let fehler {
                FehlerAnsicht(text: fehler) { Task { await laden() } }
            } else {
                LadeAnsicht()
            }
        }
        .tfHintergrund()
        .navigationTitle(Texte.Detail.titel)
        .navigationBarTitleDisplayMode(.inline)
        .task { await laden() }
        .sheet(item: $linkSheet) { ZahlungslinkSheet(erstellt: $0) }
        .sheet(item: $bestaetigung) { b in BestaetigungSheet(antwort: b, betragCent: zahlung?.betragCent ?? 0) }
        .alert(Texte.Zahlung.stornoFrage, isPresented: $stornoFrage) {
            Button(Texte.Zahlung.stornoJa, role: .destructive) { stornieren() }
            Button(Texte.Allgemein.abbrechen, role: .cancel) {}
        } message: {
            Text(Texte.Zahlung.stornoText)
        }
    }

    private func inhalt(_ z: Zahlung) -> some View {
        TFListe {
            Section {
                VStack(alignment: .leading, spacing: 8) {
                    HStack(alignment: .firstTextBaseline) {
                        Text(Euro.text(z.betragCent))
                            .font(.luckiest(36, relativeTo: .largeTitle))
                            .foregroundStyle(Color.tfTinte)
                        Spacer()
                        StatusChip(zahlung: z.status)
                    }
                    Text(z.titel).font(.dm(.headline)).foregroundStyle(Color.tfTinte)
                }
                .padding(.vertical, 4)
            }

            Section {
                if let a = z.artText { WertZeile(titel: Texte.Detail.art, wert: a) }
                if let za = z.zahlartAnzeige { WertZeile(titel: Texte.Detail.zahlart, wert: za) }
                if let d = Datum.tagUhrzeit(z.createdAt) { WertZeile(titel: Texte.Detail.erstellt, wert: d) }
                if let d = Datum.tagUhrzeit(z.bezahltAm) { WertZeile(titel: Texte.Detail.bezahlt, wert: d) }
                if let d = Datum.tagUhrzeit(z.storniertAm) { WertZeile(titel: Texte.Detail.storniert, wert: d) }
                if let d = Datum.tag(z.verfuegbarAb) { WertZeile(titel: Texte.Detail.verfuegbarAb, wert: d) }
                if let e = z.erstattetCent, e > 0 { WertZeile(titel: Texte.Detail.erstattet, wert: Euro.text(e)) }
                if let s = z.sitzungen?.leerAlsNil { WertZeile(titel: Texte.Detail.sitzungen, wert: s) }
            }

            if z.kunde?.leerAlsNil != nil || z.email?.leerAlsNil != nil {
                Section {
                    if let k = z.kunde?.leerAlsNil { WertZeile(titel: Texte.Detail.kunde, wert: k) }
                    if let e = z.email?.leerAlsNil { WertZeile(titel: Texte.Detail.email, wert: e) }
                } header: {
                    ListenKopf(Texte.Detail.kundeAbschnitt)
                }
            }

            Section {
                if z.istOffen, let link {
                    Button {
                        linkSheet = ZahlungErstellt(zahlung: z, link: link, whatsappText: teilText, hinweis: z.nurKarte == true ? KlarnaTexte.gutscheinHinweis : nil)
                    } label: {
                        Label(Texte.Detail.qrZeigen, systemImage: "qrcode")
                    }
                    ShareLink(item: teilText ?? link) { Label(Texte.Zahlung.teilen, systemImage: "square.and.arrow.up") }
                    Button(role: .destructive) { stornoFrage = true } label: {
                        Label(Texte.Zahlung.stornieren, systemImage: "xmark.circle")
                            .foregroundStyle(Color.tfRot)
                    }
                }
                if z.istBezahlt && !z.istGutschein {
                    Button {
                        leistungsbestaetigung()
                    } label: {
                        HStack {
                            Label(Texte.Detail.leistung, systemImage: "checkmark.seal")
                            if laedtBestaetigung { Spacer(); ProgressView() }
                        }
                    }
                    .disabled(laedtBestaetigung)
                }
                if let aktionFehler { FehlerZeile(text: aktionFehler) }
            } footer: {
                if z.istBezahlt {
                    Text(Texte.Detail.erstattungHinweis).font(.dm(.footnote))
                }
            }
        }
        .font(.dm(.body))
        .scrollContentBackground(.hidden)
        .refreshable { await laden() }
    }

    private func laden() async {
        do {
            let a = try await APIClient.shared.zahlung(id)
            zahlung = a.zahlung
            link = a.link
            teilText = a.whatsappText
            fehler = nil
            portal.aktualisieren(a.zahlung)
        } catch is CancellationError {
        } catch {
            if zahlung == nil { fehler = fehlerText(error) } else { aktionFehler = fehlerText(error) }
        }
    }

    private func stornieren() {
        Task {
            do {
                let z = try await APIClient.shared.stornieren(id)
                zahlung = z
                portal.aktualisieren(z)
            } catch {
                aktionFehler = fehlerText(error)
            }
        }
    }

    private func leistungsbestaetigung() {
        laedtBestaetigung = true
        aktionFehler = nil
        Task {
            defer { laedtBestaetigung = false }
            do {
                bestaetigung = try await APIClient.shared.leistungsbestaetigung(id)
            } catch {
                aktionFehler = fehlerText(error)
            }
        }
    }
}

extension LinkAntwort: Identifiable {
    var id: String { link }
}

/// QR für die Leistungsbestätigung (Kunde bestätigt nach dem Termin)
struct BestaetigungSheet: View {
    let antwort: LinkAntwort
    let betragCent: Int
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    Text(Texte.Detail.leistungText)
                        .font(.dm(.body))
                        .foregroundStyle(Color.tfTinte)
                        .multilineTextAlignment(.center)
                    QRCodeView(inhalt: antwort.link, beschreibung: Texte.Detail.leistungQRLabel)
                        .frame(maxWidth: 360)
                    ShareLink(item: antwort.whatsappText ?? antwort.link) {
                        Label(Texte.Zahlung.teilen, systemImage: "square.and.arrow.up")
                    }
                    .buttonStyle(.haupt)
                }
                .padding(20)
            }
            .tfHintergrund()
            .navigationTitle(Texte.Detail.leistung)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button(Texte.Allgemein.fertig) { dismiss() } }
            }
        }
        .qrAnzeige()
    }
}
