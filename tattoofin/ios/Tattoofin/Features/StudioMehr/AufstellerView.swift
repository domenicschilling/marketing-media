import SwiftUI
import PhotosUI

/// QR-Aufsteller aus Holz (körperliche Ware, Apple 3.1.3(e): Bezahlung per Stripe-Checkout im Browser erlaubt).
/// Holzton und Studioname oder Logo wählen, Vorschau, dann bestellen: Der Server entscheidet (schon vorgesehen → anfordern,
/// sonst Stripe-Checkout). Der Checkout läuft in einer Safari-Ansicht, Rückkehr über app-fertig.html und „Fertig“; danach prüft die App
/// die Zahlung (POST /api/portal/aufsteller-pruefen). Genannt werden nur Artikel und Preis (Texte vom Server, ohne Paket).
/// Hersteller-Dateien gibt es in der App nicht (sie gehören zur Bestellung). Nur Inhaber (Server: nur_inhaber).
struct AufstellerView: View {
    @Environment(AppState.self) private var app

    @State private var daten: AufstellerApp?
    @State private var ladeFehler: String?
    @State private var holz = "hell"
    @State private var mitLogo = false
    @State private var logo: GravurLogo?
    @State private var auswahl: PhotosPickerItem?
    @State private var logoLaedt = false
    @State private var geladen = false

    @State private var bestellFrage = false
    @State private var arbeitet = false
    @State private var checkout: Checkout?
    /// Stripe-Checkout-Sitzung der letzten Bestellung (für die Prüfung nach der Rückkehr)
    @State private var letzteSitzung: String?
    @State private var meldung: String?
    @State private var fehler: String?
    @State private var erfolg = 0

    struct Checkout: Identifiable {
        let url: URL
        let cs: String?
        var id: String { url.absoluteString }
    }

    private var istInhaber: Bool { app.sitzung?.istInhaber ?? false }
    private var holzName: String { holz == "dunkel" ? Texte.Aufsteller.dunkel.lowercased() : Texte.Aufsteller.hell.lowercased() }
    private var obenName: String { mitLogo ? Texte.Aufsteller.logoLabel : Texte.Aufsteller.nameLabel }
    private var kostenlos: Bool { daten?.kostenlos ?? false }

    var body: some View {
        Group {
            if !istInhaber {
                LeerAnsicht(titel: Texte.Aufsteller.titel, text: Texte.Aufsteller.nurInhaber, symbol: "person.fill")
            } else if let d = daten, geladen {
                inhalt(d)
            } else if let ladeFehler {
                FehlerAnsicht(text: ladeFehler) { Task { await laden() } }
            } else {
                LadeAnsicht()
            }
        }
        .tfHintergrund()
        .navigationTitle(Texte.Aufsteller.titel)
        .navigationBarTitleDisplayMode(.inline)
        .task { if istInhaber { await laden() } }
        .onChange(of: auswahl) { _, neu in if let neu { logoUebernehmen(neu) } }
        .sensoryFeedback(.success, trigger: erfolg)
        .alert(bestellFrageTitel, isPresented: $bestellFrage) {
            Button(kostenlos ? Texte.Aufsteller.anfordernJa : Texte.Aufsteller.weiter) { bestellen() }
            Button(Texte.Allgemein.abbrechen, role: .cancel) {}
        } message: {
            Text(Texte.Aufsteller.auswahlText(holzName, obenName) + (kostenlos ? "" : " " + (daten?.bezahlenHinweis ?? Texte.Aufsteller.kaufenText)))
        }
        .fullScreenCover(item: $checkout, onDismiss: nachCheckout) { c in
            StudioSafariAnsicht(url: c.url).ignoresSafeArea()
        }
    }

    private var bestellFrageTitel: String {
        if kostenlos { return Texte.Aufsteller.anfordernFrage }
        if let g = daten?.preis?.gesamtCent { return Texte.Aufsteller.kaufenFrageBrutto(g) }
        return Texte.Aufsteller.bestellenFrage
    }

    private func inhalt(_ d: AufstellerApp) -> some View {
        TFFormular {
            Section {
                Text(d.beschreibung ?? Texte.Aufsteller.intro).font(.dm(.subheadline)).foregroundStyle(Color.tfTinte)
                AufstellerVorschau(zahlseite: d.zahlseite ?? "", firma: d.firma ?? "", holz: holz, mitLogo: mitLogo,
                                   logo: logo?.maske, klarna: d.klarna ?? false)
                    .frame(maxWidth: 320)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                    .accessibilityLabel(Texte.Aufsteller.vorschauLabel(holzName, mitLogo ? Texte.Aufsteller.logoLabel : (d.firma ?? "")))
                    .listRowBackground(Color.clear)
            }

            Section {
                Picker(Texte.Aufsteller.holz, selection: $holz) {
                    Text(Texte.Aufsteller.hell).tag("hell")
                    Text(Texte.Aufsteller.dunkel).tag("dunkel")
                }
                .pickerStyle(.segmented)
                .onChange(of: holz) { _, _ in wahlSpeichern() }
                Text(holz == "dunkel" ? (d.holzHinweis?.dunkel ?? Texte.Aufsteller.dunkelHinweis) : (d.holzHinweis?.hell ?? Texte.Aufsteller.hellHinweis))
                    .font(.dm(.footnote)).foregroundStyle(Color.tfLeise)
            } header: {
                Text(Texte.Aufsteller.holz)
            }
            .disabled(gesperrt)

            Section {
                Picker(Texte.Aufsteller.oben, selection: $mitLogo) {
                    Text(Texte.Aufsteller.mitName).tag(false)
                    Text(Texte.Aufsteller.mitLogo).tag(true)
                }
                .pickerStyle(.segmented)
                .onChange(of: mitLogo) { _, neu in if !neu || logo != nil { wahlSpeichern() } }
                if mitLogo {
                    // Werte vorher lesen: Die Beschriftung von PhotosPicker läuft außerhalb des MainActors
                    let titel = logo == nil ? Texte.Aufsteller.logoWaehlen : Texte.Aufsteller.logoAendern
                    let laedt = logoLaedt
                    PhotosPicker(selection: $auswahl, matching: .images, photoLibrary: .shared()) {
                        HStack {
                            Label(titel, systemImage: "photo")
                            if laedt { Spacer(); ProgressView() }
                        }
                    }
                    .disabled(logoLaedt)
                    .foregroundStyle(Color.tfAkzent)
                    .accessibilityIdentifier("logo-waehlen")
                    Text(Texte.Aufsteller.logoHinweis).font(.dm(.footnote)).foregroundStyle(Color.tfLeise)
                }
            } header: {
                Text(Texte.Aufsteller.oben)
            }
            .disabled(gesperrt)

            Section {
                bestellung(d)
                if let meldung { HinweisKarte(text: meldung, symbol: "info.circle.fill").listRowInsets(EdgeInsets()).listRowBackground(Color.clear) }
                if let fehler { FehlerZeile(text: fehler) }
            } header: {
                Text(Texte.Aufsteller.bestellenTitel)
            }

            if let adr = d.lieferadresse?.leerAlsNil {
                Section(Texte.Aufsteller.lieferung) {
                    Text(adr.replacingOccurrences(of: ", ", with: "\n")).font(.dm(.body)).foregroundStyle(Color.tfTinte)
                }
            }
        }
        .font(.dm(.body))
        .scrollContentBackground(.hidden)
        .refreshable { await laden() }
    }

    /// Nach der Bestellung ändert sich die Auswahl nicht mehr
    private var gesperrt: Bool { daten?.istBestellt == true || arbeitet }

    @ViewBuilder
    private func bestellung(_ d: AufstellerApp) -> some View {
        if d.istBestellt {
            Label(statusText(d), systemImage: "checkmark.seal.fill")
                .foregroundStyle(Color.tfGruen)
                .font(.dm(.body, weight: .semibold))
        } else {
            if let t = d.preisText?.leerAlsNil {
                Text(t).font(.dm(.title3, weight: .bold)).foregroundStyle(Color.tfTinte)
            }
            if let p = d.preis?.text?.leerAlsNil { Text(p).font(.dm(.footnote)).foregroundStyle(Color.tfLeise) }
            if !kostenlos, let h = d.bezahlenHinweis?.leerAlsNil { Text(h).font(.dm(.footnote)).foregroundStyle(Color.tfLeise) }
            if d.status == "zahlung_offen" {
                Button(Texte.Aufsteller.pruefen) { pruefen(cs: nil) }
                    .buttonStyle(.zweit)
                    .disabled(arbeitet)
                    .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
            }
            Button {
                if mitLogo && logo == nil { fehler = Texte.Aufsteller.logoZuerst; return }
                fehler = nil
                bestellFrage = true
            } label: {
                if arbeitet { ProgressView().tint(Color.tfBlau) } else { Text(d.knopf ?? Texte.Aufsteller.anfordern) }
            }
            .buttonStyle(.haupt)
            .disabled(arbeitet)
            .accessibilityIdentifier("aufsteller-bestellen")
            .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
        }
    }

    private func statusText(_ d: AufstellerApp) -> String {
        if let t = d.statusText?.leerAlsNil {
            if let tag = Datum.tag(d.bezahltAm ?? d.bestelltAm) { return "\(t) (\(tag))" }
            return t
        }
        if let tag = Datum.tag(d.bezahltAm) { return Texte.Aufsteller.bezahlt(tag) }
        return Texte.Aufsteller.angefordert(Datum.tag(d.bestelltAm) ?? "–")
    }

    // MARK: Laden und Speichern

    private func laden() async {
        ladeFehler = nil
        do {
            let r = try await APIClient.shared.aufsteller()
            guard let d = r.aufsteller else { throw APIFehler.unbekannt }
            uebernehmen(d, ersteMal: !geladen)
            if let src = d.logo?.src, logo == nil {
                logo = try? await Task.detached(priority: .userInitiated) { try GravurLogo.aus(dataURL: src) }.value
            }
            geladen = true
        } catch is CancellationError {
        } catch {
            ladeFehler = meldungFuer(error)
        }
    }

    private func uebernehmen(_ d: AufstellerApp, ersteMal: Bool) {
        daten = d
        if ersteMal {
            holz = d.holz == "dunkel" ? "dunkel" : "hell"
            mitLogo = d.variante == "logo" && d.hatLogo == true
        }
    }

    private func wahl() -> APIClient.AufstellerWahl {
        APIClient.AufstellerWahl(holz: holz, variante: mitLogo && logo != nil ? "logo" : "name")
    }

    /// Holz/Variante sofort merken (wie im Web, Fehler hier nur still)
    private func wahlSpeichern() {
        guard geladen, daten?.istBestellt != true else { return }
        let w = wahl()
        Task {
            if let r = try? await APIClient.shared.aufstellerSpeichern(w), let d = r.aufsteller { uebernehmen(d, ersteMal: false) }
        }
    }

    private func logoUebernehmen(_ item: PhotosPickerItem) {
        logoLaedt = true
        fehler = nil
        meldung = nil
        Task {
            defer { logoLaedt = false; auswahl = nil }
            do {
                guard let roh = try await item.loadTransferable(type: Data.self) else { throw GravurLogo.Fehler.unlesbar }
                let l = try await Task.detached(priority: .userInitiated) { try GravurLogo.aus(daten: roh) }.value
                logo = l
                mitLogo = true
                var w = wahl()
                w.variante = "logo"; w.logo = l.dataURL; w.logoW = l.breite; w.logoH = l.hoehe
                let r = try await APIClient.shared.aufstellerSpeichern(w)
                if let d = r.aufsteller { uebernehmen(d, ersteMal: false) }
                meldung = Texte.Aufsteller.logoGespeichert
            } catch GravurLogo.Fehler.nichtsDunkel {
                fehler = Texte.Aufsteller.logoNichtsDunkel
            } catch GravurLogo.Fehler.unlesbar {
                fehler = Texte.Aufsteller.logoFehler
            } catch {
                fehler = meldungFuer(error)
            }
        }
    }

    private func bestellen() {
        arbeitet = true
        fehler = nil
        meldung = nil
        var w = wahl()
        w.bestellen = true
        Task {
            defer { arbeitet = false }
            do {
                let r = try await APIClient.shared.aufstellerSpeichern(w)
                if let d = r.aufsteller { uebernehmen(d, ersteMal: false) }
                if let s = r.url, let u = URL(string: s), u.scheme == "https" || u.scheme == "http" {
                    // Kauf: Stripe-Checkout in der Safari-Ansicht, Prüfung nach „Fertig“
                    let cs = r.cs ?? CheckoutSitzung.id(aus: u)
                    letzteSitzung = cs
                    checkout = Checkout(url: u, cs: cs)
                } else {
                    meldung = Texte.Aufsteller.angefordertDanke
                    erfolg += 1
                }
            } catch {
                fehler = meldungFuer(error)
            }
        }
    }

    /// Safari-Ansicht geschlossen: Zahlung prüfen
    private func nachCheckout() {
        pruefen(cs: letzteSitzung)
    }

    private func pruefen(cs: String?) {
        guard let cs = cs ?? letzteSitzung else {
            Task { await laden() }
            return
        }
        arbeitet = true
        Task {
            defer { arbeitet = false }
            do {
                let p = try await APIClient.shared.aufstellerPruefen(cs: cs)
                if let d = p.aufsteller { uebernehmen(d, ersteMal: false) }
                if p.bezahlt == true {
                    meldung = Texte.Aufsteller.bezahltDanke
                    erfolg += 1
                } else {
                    meldung = Texte.Aufsteller.nochNichtBezahlt
                }
            } catch {
                fehler = meldungFuer(error)
            }
        }
    }

    private func meldungFuer(_ e: Error) -> String {
        if let a = e as? APIFehler, a.code == "nur_web" { return Texte.Aufsteller.nurWeb }
        if let a = e as? APIFehler, a.code == "nur_inhaber" { return Texte.Aufsteller.nurInhaber }
        return fehlerText(e)
    }
}
