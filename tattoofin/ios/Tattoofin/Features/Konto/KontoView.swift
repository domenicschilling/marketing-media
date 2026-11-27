import SwiftUI

/// Bildschirm 14: Konto (Tab 4). Kündigen/Löschen ja (Apple 5.1.1(v)), Zurücknehmen nein (nur Hinweis auf info@tattoofin.de).
/// Studios mit Apple-Abo (In-App-Kauf): Abschnitt „Abo“ mit Status, „Abo verwalten“ (Apple-Sheet) und bei beendetem Abo
/// „Abo wieder abschließen“. Studios, die über die Website zahlen: keine Preise, kein Kauf, keine Abo-Verwaltung (Apple 3.1.3).
struct KontoView: View {
    @Environment(\.dynamicTypeSize) private var schrift
    @Environment(AppState.self) private var app
    @Environment(PortalStore.self) private var portal
    @Environment(SperreManager.self) private var sperre
    @Environment(\.openURL) private var openURL

    @State private var geraet: Geraet?
    /// Laden der Geräte-Einstellungen fehlgeschlagen (sonst sähe man still die Standardwerte und könnte sie überschreiben)
    @State private var geraetFehler: String?
    @State private var mitteilungenZahlungen = true
    @State private var mitteilungenAuszahlungen = true
    @State private var kundenname = false
    @State private var faceID = Einstellungen.faceIDAn
    @State private var faceIDFehler: String?
    @State private var pushErlaubt: Bool?
    @State private var fehler: String?
    /// Fehler direkt im jeweiligen Abschnitt (nicht erst unten bei „Abmelden“)
    @State private var mitteilungenFehler: String?
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
                // Ohne Daten (kein Netz, Server weg): oben ein klarer Fehler statt Lade-Kreisel und roter Kreuze
                if studio == nil, let f = portal.fehler { ladeFehlerAbschnitt(f) }
                AktualisierenFehlerZeile()
                studioAbschnitt
                if studio?.istApple == true { aboAbschnitt }
                StudioMehrAbschnitt()
                // Abnahme 1.1, Nr. 16: Hilfe an einer Stelle (So geht's, WhatsApp, E-Mail), Rechtliches als Links ganz unten
                hilfeAbschnitt
                mitteilungenAbschnitt
                sicherheitAbschnitt
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

    private func ladeFehlerAbschnitt(_ f: String) -> some View {
        Section {
            VStack(alignment: .leading, spacing: 10) {
                Label(Texte.Fehler.titel, systemImage: FehlerAnsicht.symbol(f))
                    .font(.dm(.headline, weight: .bold))
                    .foregroundStyle(Color.tfTinte)
                Text(f).font(.dm(.body)).foregroundStyle(Color.tfTinte)
                    .fixedSize(horizontal: false, vertical: true)
                Button(Texte.Allgemein.nochmal) { Task { await allesLaden() } }
                    .buttonStyle(.zweit)
                    .disabled(portal.laedt)
                    .accessibilityIdentifier("konto-nochmal")
            }
            .padding(.vertical, 6)
        }
    }

    private var studioAbschnitt: some View {
        Section {
            if let s = studio {
                VStack(alignment: .leading, spacing: 4) {
                    Text(s.name).font(.luckiest(24, relativeTo: .title2)).foregroundStyle(Color.tfTinte)
                    if let i = s.inhaber?.leerAlsNil { Text(i).foregroundStyle(Color.tfLeise) }
                }
                .padding(.vertical, 4)
                // Paket und Stand in einer Zeile (Abnahme 1.1, Nr. 16: Konto kürzer)
                let stand = s.istTestmodus ? Texte.Konto.vertragTestmodus : s.statusText?.leerAlsNil.map(Texte.GestaltungG3.vertragStatus)
                let vertrag = Texte.AbnahmeG5.vertragWert(s.paketName?.leerAlsNil, stand)
                if !vertrag.isEmpty { WertZeile(titel: Texte.Konto.vertrag, wert: vertrag) }
                if let k = s.kuendigung, let zum = Datum.tag(k.zum) {
                    WertZeile(titel: Texte.Konto.vertragEndet, wert: zum)
                    if istInhaber {
                        Text(Texte.Konto.bleiben).font(.dm(.footnote)).foregroundStyle(Color.tfLeise)
                    }
                }
                if let sitzung = app.sitzung {
                    angemeldetZeile(sitzung.email, rolle: sitzung.istInhaber ? Texte.Konto.rolleInhaber : Texte.Konto.rolleTeam)
                }
                // Stripe als eine Zeile, Einzelheiten auf der Unterseite (vorher vier Zeilen und eigener Abschnitt)
                let zustand = StripeZustand(studio: s)
                NavigationLink { StripeStatusView() } label: { StripeKontoZeile(zustand: zustand) }
                if zustand == .fehlt, let u = s.connectUrl.flatMap(URL.init(string:)), s.stripe?.freigegeben != true {
                    Button { openURL(u) } label: {
                        TFAktionsZeile(titel: Texte.Kasse.stripeOeffnen, symbol: "safari")
                    }
                    .buttonStyle(.plain)
                }
            } else if portal.fehler == nil {
                ProgressView()
            } else if let sitzung = app.sitzung {
                angemeldetZeile(sitzung.email, rolle: nil)
            }
        } header: {
            ListenKopf(Texte.Konto.studio)
        }
    }

    /// Nur bei Studios, die ihr Tattoofin-Abo über Apple bezahlen
    private var aboAbschnitt: some View {
        Section {
            let abo = studio?.apple
            WertZeile(titel: Texte.Abo.bezahltUeber, wert: Texte.Abo.apple)
            if let abo {
                WertZeile(titel: Texte.Abo.status, wert: Texte.Abo.statusText(abo))
                if let d = Datum.tag(abo.laeuftBis) { WertZeile(titel: Texte.Abo.laeuftBis, wert: d) }
                if abo.istSandbox { Text(Texte.Abo.sandbox).font(.dm(.footnote)).foregroundStyle(Color.tfLeise) }
            }
            // Apples Fenster zeigt die Abos der Apple-ID dieses iPhones: beim Team-Mitglied steht dort kein Tattoofin-Abo
            if istInhaber {
                Button {
                    aboVerwalten = true
                } label: {
                    Label(Texte.Abo.verwalten, systemImage: "creditcard")
                }
                .foregroundStyle(Color.tfTinte)
            }
            if abo?.istBeendet == true && istInhaber {
                Button {
                    aboErneuern = true
                } label: {
                    Label(Texte.Kasse.aboWiederAbschliessen, systemImage: "arrow.clockwise.circle")
                }
                .foregroundStyle(Color.tfTinte)
            }
        } header: {
            ListenKopf(Texte.Abo.abschnitt)
        } footer: {
            if !istInhaber { ListenFuss(Texte.Konto11.aboNurHauptadresse) }
        }
    }

    /// „Angemeldet als“ mit Adresse (bei großer Schrift einzeilig, verkleinert, Mitte gekürzt) und Rolle darunter
    private func angemeldetZeile(_ email: String, rolle: String?) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(Texte.Konto.angemeldetAls).foregroundStyle(Color.tfLeise)
            Text(email).foregroundStyle(Color.tfTinte)
                .lineLimit(1)
                .minimumScaleFactor(0.5)
                .truncationMode(.middle)
            if let rolle {
                Text(rolle).font(.dm(.subheadline)).foregroundStyle(Color.tfLeise)
            }
        }
        .font(.dm(.body))
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }

    /// Hilfe an einer Stelle: Video-Anleitung, WhatsApp, E-Mail (ersetzt den Absatz „Fragen zu deinem Vertrag …“)
    private var hilfeAbschnitt: some View {
        Section {
            NavigationLink { SoGehtsView() } label: { zeilenLabel(WerbungTexte.soGehtsTitel, "play.rectangle") }
            Link(destination: StudioMehrAbschnitt.whatsappURL) {
                TFAktionsZeile(titel: Texte.AbnahmeG5.whatsapp, symbol: "message")
                    .dynamicTypeSize(...DynamicTypeSize.accessibility2)  // ds-ok: Zeilentitel, Wortbruch vermeiden
            }
            .accessibilityHint(Texte.AbnahmeG5.whatsappHinweis)
            Link(destination: URL(string: "mailto:info@tattoofin.de")!) {
                TFAktionsZeile(titel: Texte.AbnahmeG5.email, symbol: "envelope")
                    .dynamicTypeSize(...DynamicTypeSize.accessibility2)  // ds-ok: Zeilentitel, Wortbruch vermeiden
            }
            .accessibilityHint(Texte.AbnahmeG5.emailHinweis)
        } header: {
            ListenKopf(Texte.AbnahmeG5.hilfe)
        }
    }

    private var mitteilungenAbschnitt: some View {
        Section {
            if pushErlaubt == false {
                HinweisKarte(text: Texte.Konto.pushAus, symbol: "bell.slash.fill")
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                Button {
                    if let u = URL(string: UIApplication.openNotificationSettingsURLString) { openURL(u) }
                } label: {
                    TFAktionsZeile(titel: Texte.Konto.einstellungenOeffnen, symbol: "gearshape")
                }
                .buttonStyle(.plain)
            } else if pushErlaubt == nil {
                Button {
                    Task {
                        await PushManager.shared.erlaubnisAnfragen()
                        await pushStatusLaden()
                    }
                } label: {
                    TFAktionsZeile(titel: Texte.Einrichtung.pushJa, symbol: "bell.circle")
                }
                .buttonStyle(.plain)
            }
            if let geraetFehler {
                TeilFehlerZeile(text: "\(Texte.Konto.mitteilungenNichtGeladen) \(geraetFehler)") {
                    Task { await geraetLaden() }
                }
            }
            Group {
                Toggle(isOn: $mitteilungenZahlungen) { zeilenLabel(Texte.Konto.pushZahlung, "bell") }
                    .onChange(of: mitteilungenZahlungen) { alt, neu in if alt != neu { mitteilungenSpeichern() } }
                Toggle(isOn: $mitteilungenAuszahlungen) { zeilenLabel(Texte.Konto.pushAuszahlung, "bell.badge") }
                    .onChange(of: mitteilungenAuszahlungen) { alt, neu in if alt != neu { mitteilungenSpeichern() } }
                Toggle(isOn: $kundenname) { zeilenLabel(Texte.Konto.pushVorname, "person.text.rectangle") }
                    .onChange(of: kundenname) { alt, neu in if alt != neu { kundennameSpeichern() } }
            }
            .disabled(geraetFehler != nil)
            if let mitteilungenFehler { FehlerZeile(text: Texte.Konto11.nichtGespeichert(mitteilungenFehler)) }
        } header: {
            ListenKopf(Texte.Konto.mitteilungen)
        } footer: {
            ListenFuss(Texte.Konto.mitteilungenHinweis)
        }
    }

    private var sicherheitAbschnitt: some View {
        Section {
            Toggle(isOn: $faceID) {
                zeilenLabel(Texte.Konto.faceID(sperre.artName), sperre.artName == "Touch ID" ? "touchid" : "faceid")
            }
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
            NavigationLink { TeamView() } label: { zeilenLabel(Texte.Konto.team, "person.2") }
            NavigationLink { GeraeteView() } label: { zeilenLabel(Texte.Konto.geraete, "iphone") }
        } header: {
            ListenKopf(Texte.Konto.sicherheit)
        }
    }

    private var abmeldenAbschnitt: some View {
        Section {
            if let fehler { FehlerZeile(text: fehler) }
            Button(Texte.Konto.abmelden) { abmeldenFrage = true }
                .foregroundStyle(Color.tfTinte)
            if istInhaber {
                // Ein Rotton für Gefahr-Zeilen (tfRot wie „Konto kündigen“), nicht das hellere System-Rot
                Button(Texte.Konto.ueberall, role: .destructive) { ueberallFrage = true }
                    .foregroundStyle(Color.tfRot)
                    .disabled(arbeitet)
            }
            NavigationLink {
                KontoLoeschenView()
            } label: {
                Text(istInhaber ? Texte.Konto.loeschen : Texte.Team.zugangEntfernen).foregroundStyle(Color.tfRot)
            }
        } footer: {
            VStack(spacing: 4) {
                rechtsLinks
                ListenFuss(Texte.Konto.version(APIClient.appVersionText))
                    .font(.dm(.footnote))
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .padding(.top, 8)
        }
    }

    /// Impressum, Datenschutz, Vertrag als Links unter der Liste (vorher ein eigener Abschnitt mit vier Zeilen).
    /// Passen sie nicht nebeneinander (große Schrift), stehen sie untereinander.
    private var rechtsLinks: some View {
        let links = ForEach([Rechtsseite.impressum, .datenschutz, .vertrag], id: \.self) { seite in
            Button { rechtsseite = seite } label: {
                Text(seite.titel).frame(minHeight: 44).padding(.horizontal, 6).contentShape(Rectangle())
            }
        }
        return ViewThatFits(in: .horizontal) {
            HStack(spacing: 4) { links }
            VStack(spacing: 0) { links }
        }
        .font(.dm(.footnote, weight: .semibold))
        .foregroundStyle(Color.tfTinte)
        .buttonStyle(.plain)
        .textCase(nil)
    }

    /// Zeile mit Symbol in tfAkzent und Text in tfTinte: alle Zeilen (auch Schalter) teilen so eine Textkante
    private func zeilenLabel(_ titel: String, _ symbol: String) -> some View {
        Label {
            Text(titel).foregroundStyle(Color.tfTinte)
        } icon: {
            Image(systemName: symbol).foregroundStyle(Color.tfAkzent)
                .frame(width: 28)  // feste Symbolspalte: breite Symbole (person.2) ragen nicht heraus
        }
        .dynamicTypeSize(...DynamicTypeSize.accessibility2)  // ds-ok: Zeilentitel, Wortbruch vermeiden
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
        let liste: [Geraet]
        do {
            liste = try await APIClient.shared.geraete()
            geraetFehler = nil
        } catch {
            geraetFehler = fehlerText(error)
            return
        }
        guard let ich = liste.first(where: { $0.diesesGeraet == true }) else { return }
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
                mitteilungenFehler = nil
            } catch {
                // Schalter zurück auf den gespeicherten Stand (wie beim Kundennamen), sonst zeigt er etwas, das nicht gilt
                mitteilungenZahlungen = geraet?.mitteilungen?.zahlungen ?? true
                mitteilungenAuszahlungen = geraet?.mitteilungen?.auszahlungen ?? true
                mitteilungenFehler = fehlerText(error)
            }
        }
    }

    private func kundennameSpeichern() {
        guard kundenname != (geraet?.kundennameInMitteilung ?? false) else { return }
        Task {
            do {
                geraet = try await APIClient.shared.geraetAendern(.init(kundennameInMitteilung: kundenname))
                mitteilungenFehler = nil
            } catch {
                kundenname = geraet?.kundennameInMitteilung ?? false
                mitteilungenFehler = fehlerText(error)
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
