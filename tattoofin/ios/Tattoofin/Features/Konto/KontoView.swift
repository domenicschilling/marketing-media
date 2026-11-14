import SwiftUI

/// Bildschirm 14: Konto (Tab 4). Kündigen/Löschen ja (Apple 5.1.1(v)), Zurücknehmen nein (nur Hinweis auf info@tattoofin.de).
/// Studios mit Apple-Abo (In-App-Kauf): Abschnitt „Abo“ mit Status, „Abo verwalten“ (Apple-Sheet) und bei beendetem Abo
/// „Abo wieder abschließen“. Studios, die über die Website zahlen: keine Preise, kein Kauf, keine Abo-Verwaltung (Apple 3.1.3).
struct KontoView: View {
    @Environment(AppState.self) private var app
    @Environment(PortalStore.self) private var portal
    @Environment(SperreManager.self) private var sperre
    @Environment(\.openURL) private var openURL

    @State private var geraet: Geraet?
    @State private var mitteilungenZahlungen = true
    @State private var mitteilungenAuszahlungen = true
    @State private var kundenname = false
    @State private var faceID = Einstellungen.faceIDAn
    @State private var faceIDFehler: String?
    @State private var pushErlaubt: Bool?
    @State private var prueftStripe = false
    @State private var fehler: String?
    @State private var rechtsseite: Rechtsseite?
    @State private var abmeldenFrage = false
    @State private var ueberallFrage = false
    @State private var arbeitet = false
    @State private var testErgebnis: String?
    @State private var aboVerwalten = false
    @State private var aboErneuern = false

    private var studio: Studio? { portal.studio }
    private var istInhaber: Bool { app.sitzung?.istInhaber ?? false }
    private var basis: URL { APIClient.basisURL() }

    var body: some View {
        NavigationStack {
            TFListe {
                studioAbschnitt
                if studio?.istApple == true { aboAbschnitt }
                stripeAbschnitt
                SoGehtsAbschnitt()
                mitteilungenAbschnitt
                sicherheitAbschnitt
                rechtAbschnitt
                abmeldenAbschnitt
                #if DEBUG
                debugAbschnitt
                #endif
            }
            .font(.dm(.body))
            .scrollContentBackground(.hidden)
            .tfHintergrund()
            .navigationTitle(Texte.Konto.titel)
            .navigationBarTitleDisplayMode(.inline)
            .refreshable { await allesLaden() }
            .task { await allesLaden() }
            .sheet(item: $rechtsseite) { RechtsAnsicht(seite: $0) }
            .sheet(isPresented: $aboErneuern) { AboErneuernSheet() }
            .manageSubscriptionsSheet(isPresented: $aboVerwalten)
            .onChange(of: aboVerwalten) { _, offen in if !offen { Task { await portal.laden() } } }
            .alert(Texte.Konto.abmeldenFrage, isPresented: $abmeldenFrage) {
                Button(Texte.Konto.abmelden, role: .destructive) { Task { await app.abmelden() } }
                Button(Texte.Allgemein.abbrechen, role: .cancel) {}
            }
            .alert(Texte.Konto.ueberallFrage, isPresented: $ueberallFrage) {
                Button(Texte.Konto.ueberallJa, role: .destructive) { ueberallAbmelden() }
                Button(Texte.Allgemein.abbrechen, role: .cancel) {}
            } message: {
                Text(Texte.Konto.ueberallText)
            }
        }
    }

    // MARK: Abschnitte

    private var studioAbschnitt: some View {
        Section(Texte.Konto.studio) {
            if let s = studio {
                VStack(alignment: .leading, spacing: 4) {
                    Text(s.name).font(.luckiest(24, relativeTo: .title2)).foregroundStyle(Color.tfTinte)
                    if let i = s.inhaber?.leerAlsNil { Text(i).foregroundStyle(Color.tfLeise) }
                }
                .padding(.vertical, 4)
                if let p = s.paketName?.leerAlsNil { WertZeile(titel: Texte.Konto.paket, wert: p) }
                if let st = s.statusText?.leerAlsNil { WertZeile(titel: Texte.Konto.vertrag, wert: st) }
                if let k = s.kuendigung, let zum = Datum.tag(k.zum) {
                    WertZeile(titel: Texte.Konto.vertragEndet, wert: zum)
                    if istInhaber {
                        Text(Texte.Konto.bleiben).font(.dm(.footnote)).foregroundStyle(Color.tfLeise)
                    }
                }
                if let sitzung = app.sitzung {
                    WertZeile(titel: Texte.Konto.angemeldetAls, wert: sitzung.email)
                    WertZeile(titel: Texte.Konto.rolle, wert: sitzung.istInhaber ? Texte.Konto.rolleInhaber : Texte.Konto.rolleTeam)
                }
            } else {
                ProgressView()
            }
        }
    }

    /// Nur bei Studios, die ihr Tattoofin-Abo über Apple bezahlen
    private var aboAbschnitt: some View {
        Section(Texte.Abo.abschnitt) {
            let abo = studio?.apple
            WertZeile(titel: Texte.Abo.bezahltUeber, wert: Texte.Abo.apple)
            if let abo {
                WertZeile(titel: Texte.Abo.status, wert: Texte.Abo.statusText(abo))
                if let d = Datum.tag(abo.laeuftBis) { WertZeile(titel: Texte.Abo.laeuftBis, wert: d) }
                if abo.istSandbox { Text(Texte.Abo.sandbox).font(.dm(.footnote)).foregroundStyle(Color.tfLeise) }
            }
            Button {
                aboVerwalten = true
            } label: {
                Label(Texte.Abo.verwalten, systemImage: "creditcard")
            }
            .foregroundStyle(Color.tfTinte)
            if abo?.istBeendet == true && istInhaber {
                Button {
                    aboErneuern = true
                } label: {
                    Label(Texte.Kasse.aboWiederAbschliessen, systemImage: "arrow.clockwise.circle")
                }
                .foregroundStyle(Color.tfTinte)
            }
        }
    }

    private var stripeAbschnitt: some View {
        Section {
            let st = studio?.stripe
            statusZeile(Texte.Konto.stripeVerbunden, st?.verbunden == true)
            statusZeile(Texte.Konto.stripeFreigegeben, st?.freigegeben == true)
            statusZeile(Texte.Konto.stripeAuszahlungen, st?.auszahlungen == true)
            Button {
                stripePruefen()
            } label: {
                HStack {
                    Label(Texte.Konto.neuPruefen, systemImage: "arrow.clockwise")
                    if prueftStripe { Spacer(); ProgressView() }
                }
            }
            .disabled(prueftStripe)
            if let u = studio?.connectUrl.flatMap(URL.init(string:)), st?.freigegeben != true {
                Button { openURL(u) } label: { Label(Texte.Kasse.stripeOeffnen, systemImage: "safari") }
            }
        } header: {
            Text(Texte.Konto.stripe)
        }
    }

    private func statusZeile(_ titel: String, _ ok: Bool) -> some View {
        HStack {
            Text(titel).foregroundStyle(Color.tfTinte)
            Spacer()
            Image(systemName: ok ? "checkmark.circle.fill" : "xmark.circle")
                .foregroundStyle(ok ? Color.tfGruen : Color.tfLeise)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(titel): \(ok ? Texte.Allgemein.ja : Texte.Allgemein.nein)")
    }

    private var mitteilungenAbschnitt: some View {
        Section {
            if pushErlaubt == false {
                HinweisKarte(text: Texte.Konto.pushAus, symbol: "bell.slash.fill")
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                Button(Texte.Konto.einstellungenOeffnen) {
                    if let u = URL(string: UIApplication.openNotificationSettingsURLString) { openURL(u) }
                }
            } else if pushErlaubt == nil {
                Button(Texte.Einrichtung.pushJa) {
                    Task {
                        await PushManager.shared.erlaubnisAnfragen()
                        await pushStatusLaden()
                    }
                }
            }
            Toggle(Texte.Konto.pushZahlung, isOn: $mitteilungenZahlungen)
                .onChange(of: mitteilungenZahlungen) { alt, neu in if alt != neu { mitteilungenSpeichern() } }
            Toggle(Texte.Konto.pushAuszahlung, isOn: $mitteilungenAuszahlungen)
                .onChange(of: mitteilungenAuszahlungen) { alt, neu in if alt != neu { mitteilungenSpeichern() } }
            Toggle(Texte.Konto.pushVorname, isOn: $kundenname)
                .onChange(of: kundenname) { alt, neu in if alt != neu { kundennameSpeichern() } }
        } header: {
            Text(Texte.Konto.mitteilungen)
        } footer: {
            Text(Texte.Konto.mitteilungenHinweis)
        }
    }

    private var sicherheitAbschnitt: some View {
        Section {
            Toggle(Texte.Konto.faceID(sperre.artName), isOn: $faceID)
                .disabled(!sperre.verfuegbar)
                .onChange(of: faceID) { _, neu in
                    guard neu != Einstellungen.faceIDAn else { return }
                    if neu {
                        Task {
                            faceIDFehler = nil
                            let ok = await sperre.einschalten()
                            faceID = ok
                            // Abbrechen ist kein Fehler; sonst sagen, warum der Schalter zurückspringt
                            if !ok, sperre.fehler != nil { faceIDFehler = Texte.Sperre.einschaltenFehler(sperre.artName) }
                        }
                    } else {
                        sperre.ausschalten()
                    }
                }
            if !sperre.verfuegbar {
                Text(Texte.Sperre.nichtVerfuegbar).font(.dm(.footnote)).foregroundStyle(Color.tfLeise)
            } else if let f = faceIDFehler {
                FehlerZeile(text: f)
            }
            NavigationLink { TeamView() } label: { Label(Texte.Konto.team, systemImage: "person.2") }
            NavigationLink { GeraeteView() } label: { Label(Texte.Konto.geraete, systemImage: "iphone") }
        } header: {
            Text(Texte.Konto.sicherheit)
        }
    }

    private var rechtAbschnitt: some View {
        Section(Texte.Konto.rechtliches) {
            Button { rechtsseite = .impressum } label: { Label(Texte.Konto.impressum, systemImage: "doc.text") }
            Button { rechtsseite = .datenschutz } label: { Label(Texte.Konto.datenschutz, systemImage: "hand.raised") }
            Button { rechtsseite = .vertrag } label: { Label(Texte.Konto.vertragText, systemImage: "signature") }
            Link(destination: URL(string: "mailto:info@tattoofin.de")!) {
                Label(Texte.Konto.hilfe, systemImage: "envelope")
            }
        }
        .foregroundStyle(Color.tfTinte)
    }

    private var abmeldenAbschnitt: some View {
        Section {
            if let fehler { FehlerZeile(text: fehler) }
            Button(Texte.Konto.abmelden) { abmeldenFrage = true }
            if istInhaber {
                Button(Texte.Konto.ueberall, role: .destructive) { ueberallFrage = true }
                    .disabled(arbeitet)
            }
            NavigationLink {
                KontoLoeschenView()
            } label: {
                Text(istInhaber ? Texte.Konto.loeschen : Texte.Team.zugangEntfernen).foregroundStyle(Color.tfRot)
            }
        } footer: {
            Text(Texte.Konto.version(APIClient.appVersionText))
        }
    }

    #if DEBUG
    private var debugAbschnitt: some View {
        Section("Debug") {
            WertZeile(titel: "Server", wert: basis.absoluteString)
            WertZeile(titel: "APNs beim Server", wert: PushManager.shared.apnsAktiv.map { $0 ? "aktiv" : "nicht eingerichtet" } ?? "unbekannt")
            WertZeile(titel: "Push-Token", wert: Einstellungen.pushToken.map { String($0.prefix(12)) + "…" } ?? "keins")
            Button("Test-Mitteilung anfordern") {
                Task {
                    do {
                        let a = try await APIClient.shared.pushTest()
                        testErgebnis = a.gesendet == true ? "gesendet" : "nicht gesendet: \(a.grund ?? "?")"
                    } catch { testErgebnis = fehlerText(error) }
                }
            }
            if let testErgebnis { Text(testErgebnis).font(.dm(.footnote)) }
        }
    }
    #endif

    // MARK: Aktionen

    private func allesLaden() async {
        async let p: Void = portal.laden()
        async let g: Void = geraetLaden()
        async let s: Void = pushStatusLaden()
        _ = await (p, g, s)
        faceID = Einstellungen.faceIDAn && sperre.verfuegbar
    }

    private func geraetLaden() async {
        guard let liste = try? await APIClient.shared.geraete(),
              let ich = liste.first(where: { $0.diesesGeraet == true }) else { return }
        geraet = ich
        if let m = ich.mitteilungen {
            mitteilungenZahlungen = m.zahlungen
            mitteilungenAuszahlungen = m.auszahlungen
        }
        kundenname = ich.kundennameInMitteilung ?? false
    }

    private func pushStatusLaden() async {
        switch await PushManager.shared.status() {
        case .authorized, .provisional, .ephemeral: pushErlaubt = true
        case .denied: pushErlaubt = false
        default: pushErlaubt = nil
        }
    }

    private func mitteilungenSpeichern() {
        let m = Mitteilungen(zahlungen: mitteilungenZahlungen, auszahlungen: mitteilungenAuszahlungen)
        guard m != geraet?.mitteilungen else { return }
        Task {
            do {
                geraet = try await APIClient.shared.geraetAendern(.init(mitteilungen: m))
                fehler = nil
            } catch {
                fehler = fehlerText(error)
            }
        }
    }

    private func kundennameSpeichern() {
        guard kundenname != (geraet?.kundennameInMitteilung ?? false) else { return }
        Task {
            do {
                geraet = try await APIClient.shared.geraetAendern(.init(kundennameInMitteilung: kundenname))
                fehler = nil
            } catch {
                kundenname = geraet?.kundennameInMitteilung ?? false
                fehler = fehlerText(error)
            }
        }
    }

    private func stripePruefen() {
        prueftStripe = true
        Task {
            defer { prueftStripe = false }
            do {
                _ = try await APIClient.shared.kontoStatus()
                await portal.laden()
            } catch {
                fehler = fehlerText(error)
            }
        }
    }

    private func ueberallAbmelden() {
        arbeitet = true
        Task {
            defer { arbeitet = false }
            do {
                try await APIClient.shared.ueberallAbmelden()
                await app.lokalAbmelden(hinweis: Texte.Konto.ueberallErledigt)
            } catch {
                fehler = fehlerText(error)
            }
        }
    }

}
