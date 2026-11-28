import SwiftUI

/// Bildschirm 5: Kasse (Tab 1). Ziffernblock für eine Hand an der Theke.
struct KasseView: View {
    @Environment(PortalStore.self) private var portal
    @State private var eingabe = BetragEingabe()
    @State private var entwurf = Einstellungen.kasseEntwurf ?? KasseEntwurf()
    @State private var detailsOffen = false
    @State private var sendet = false
    @State private var fehler: String?
    @State private var erstellt: ZahlungErstellt?
    @State private var thekeOffen = false
    @State private var erfolgZaehler = 0
    @State private var heute = false
    /// Sichtbare Höhe der Kasse: auf kleinen iPhones (SE) wird alles enger, damit der ganze Ziffernblock über dem Knopf steht
    @State private var hoehe: CGFloat = 800
    /// Wirklich sichtbare Höhe des Inhalts (ohne Navigationsleiste, angehefteten Knopf, Tab-Leiste und Tastatur)
    @State private var sichtbareHoehe: CGFloat = 0
    @Environment(\.dynamicTypeSize) private var schrift
    private var kompakt: Bool { hoehe < 560 }
    /// Höhe des Verlaufs über „Zahlungslink erstellen“ (SE: der Spalt unter dem Ziffernblock ist etwas größer)
    private var verlaufHoehe: CGFloat { kompakt ? 22 : 16 }

    var body: some View {
        NavigationStack {
            Group {
                if let s = portal.studio {
                    if s.darfKassieren { formular } else { GesperrtKarte(studio: s) }
                } else if let f = portal.fehler {
                    FehlerAnsicht(text: f) { Task { await portal.laden() } }
                } else {
                    LadeAnsicht()
                }
            }
            .tfHintergrund()
            .navigationTitle(Texte.Kasse.titel)
            .tfHarteKanteOben()  // Abnahme 1.1, Runde 3
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if portal.studio?.darfKassieren == true {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button {
                            thekeOffen = true
                        } label: {
                            Label(Texte.Kasse.thekenQR, systemImage: "qrcode")
                                .labelStyle(.titleAndIcon)
                                .font(.dm(.subheadline, weight: .semibold))
                        }
                        .accessibilityHint(Texte.Kasse.thekenQRHinweis)
                    }
                }
            }
            .fullScreenCover(isPresented: $thekeOffen) { TheckenQRView() }
            .sheet(item: $erstellt) { e in
                ZahlungslinkSheet(erstellt: e)
            }
            .sensoryFeedback(.success, trigger: erfolgZaehler)
        }
        .onAppear {
            eingabe = BetragEingabe(text: entwurf.betrag)
            entwurf = entwurf.passend(keineAnzahlung: keineAnzahlung)
        }
        // Studio ohne Anzahlung (anzahlungAus): auch einen gespeicherten Entwurf auf Gesamtpreis stellen
        .onChange(of: portal.studio) { _, _ in entwurf = entwurf.passend(keineAnzahlung: keineAnzahlung) }
        .onChange(of: eingabe) { _, neu in entwurf.betrag = neu.text }
        .onChange(of: entwurf) { _, neu in Einstellungen.kasseEntwurf = neu.istLeer ? nil : neu }
    }

    private var keineAnzahlung: Bool { portal.studio?.keineAnzahlung ?? false }
    /// Anzahlung nur, wenn das Studio sie anbietet
    private var anzahlung: Bool { entwurf.anzahlung && !keineAnzahlung }

    private var betragFehler: String? {
        guard let c = eingabe.cent, c > 0 else { return nil }
        if c < portal.config.min || c > portal.config.max {
            return Texte.Kasse.grenzen(min: portal.config.min, max: portal.config.max)
        }
        return nil
    }

    /// Wie im Dashboard: Gutschein-Wörter im Projektfeld → Hinweis „Gutschein-Funktion nutzen, nur Karte“
    private var gutscheinWort: Bool {
        KlarnaTexte.istGutscheinWort(entwurf.beschreibung, anzahlung ? "" : entwurf.sitzungen)
    }

    private var gueltigerBetrag: Bool { betragFehler == nil && (eingabe.cent ?? 0) > 0 }

    private var grenzenZeile: some View {
        Text(betragFehler ?? Texte.Kasse.grenzen(min: portal.config.min, max: portal.config.max))
            .font(.dm(.footnote, weight: betragFehler == nil ? .regular : .semibold))
            .foregroundStyle(betragFehler == nil ? Color.tfLeise : Color.tfRot)
            // Normale Schrift: eine Zeile (fester Platz über dem Ziffernblock). Ab AX-Größen umbrechen statt abschneiden (DS 18.11.2026).
            .lineLimit(schrift.isAccessibilitySize ? nil : 1)
            .minimumScaleFactor(schrift.isAccessibilitySize ? 1 : 0.8)
            .fixedSize(horizontal: false, vertical: schrift.isAccessibilitySize)
            .multilineTextAlignment(.center)
    }

    private var bereit: Bool {
        guard let c = eingabe.cent else { return false }
        return c >= portal.config.min && c <= portal.config.max && !sendet
    }

    /// Art (Gesamtpreis/Anzahlung) und „Kunde wird heute tätowiert“
    @ViewBuilder private var artUndHeute: some View {
        // Studio ohne Anzahlung (TF München/Landshut): keine Auswahl, immer Gesamtpreis (wie im Web)
        if !keineAnzahlung {
            TFAuswahl(Texte.Kasse.artLabel, auswahl: $entwurf.anzahlung,
                      optionen: [(false, Texte.Kasse.gesamt), (true, Texte.Kasse.anzahlung)])
            .accessibilityIdentifier("kasse-art")
        }
        // Bei „Anzahlung“ bleibt der Platz des Schalters frei, damit der Ziffernblock beim Umschalten nicht springt
        HeuteSchalter(an: $heute, kompakt: kompakt)
            .opacity(anzahlung ? 0 : 1)
            .disabled(anzahlung)
            .accessibilityHidden(anzahlung)
    }

    /// Bei Bedienungshilfen-Größen: Art als eine Menü-Zeile statt zweier großer Auswahl-Zeilen
    private var artMenue: some View {
        Menu {
            Picker(Texte.Kasse.artLabel, selection: $entwurf.anzahlung) {
                Text(Texte.Kasse.gesamt).tag(false)
                Text(Texte.Kasse.anzahlung).tag(true)
            }
        } label: {
            HStack(spacing: 8) {
                Text(entwurf.anzahlung ? Texte.Kasse.anzahlung : Texte.Kasse.gesamt)
                    .font(.dm(.body, weight: .semibold))
                    .foregroundStyle(Color.tfTinte)
                    .lineLimit(1).minimumScaleFactor(0.7)
                Spacer(minLength: 4)
                Image(systemName: "chevron.up.chevron.down").foregroundStyle(Color.tfLeise).accessibilityHidden(true)
            }
            .dynamicTypeSize(...DynamicTypeSize.accessibility3)
            .frame(maxWidth: .infinity, minHeight: 44)
            .contentShape(Rectangle())
        }
        .modifier(KompaktKarte())
        .accessibilityLabel(Texte.Kasse.artLabel)
        .accessibilityValue(entwurf.anzahlung ? Texte.Kasse.anzahlung : Texte.Kasse.gesamt)
        .accessibilityIdentifier("kasse-art")
    }

    private var formular: some View {
        ScrollView {
            // Enger gesetzt: Start-Zeile, Betrag, Ziffernblock und „Zahlungslink erstellen“ passen bei normaler Schrift in den ersten Bildschirm
            VStack(spacing: 0) {
            VStack(spacing: kompakt ? 6 : 10) {
                AktualisierenFehlerZeile()
                // Bedienungshilfen-Größen: ohne „Diesen Monat …“ (wie kompakt), damit die Ziffern früher kommen (Abnahme 1.1, Runde 2)
                StartBereich(kompakt: kompakt || schrift.isAccessibilitySize, soGehtsInLeiste: true)

                // Nach einem Testkauf (Apple-Sandbox, auch App Review): Hinweis „Testmodus“ steht im StartBereich statt der Monatszeile

                // Freie Höhe sammelt sich über dem Betrag, nicht als Lücke vor dem Knopf (Gestaltungsprüfung 1.1, Nr. 9)
                // Nur bei normaler Schrift: bei Bedienungshilfen-Größen liegt der Inhalt einfach oben an (sonst große Lücke)
                if !schrift.isAccessibilitySize { Spacer(minLength: 0) }

                // Betrag
                VStack(spacing: 4) {
                    // Großer Betrag ~52 pt (Abnahme G4), auf kleinen iPhones (SE) bleibt er bei 38 pt
                    GrosserBetrag.text(eingabe.anzeige, groesse: kompakt ? 38 : 52)
                        .foregroundStyle(Color.tfTinte)
                        .lineLimit(1)
                        .minimumScaleFactor(0.4)
                        .contentTransition(.numericText())
                        .accessibilityLabel(Texte.Kasse.betragLabel)
                        .accessibilityValue(eingabe.cent.map(Euro.gesprochen) ?? "0 Euro")
                    // Grenzen bzw. Fehler und Gebührenhinweis liegen übereinander auf demselben festen Platz (auf allen Geräten):
                    // bei gültigem Betrag der Gebührenhinweis, sonst die Grenzen. So rutscht beim Tippen nichts über dem
                    // Ziffernblock, und unter den Grenzen bleibt kein leerer Streifen (Gestaltungsprüfung 1.1, Nr. 9).
                    if schrift.isAccessibilitySize {
                        // Bedienungshilfen-Größen: über den Ziffern nur ein echter Fehler; Grenzen und Gebühr stehen unter
                        // den Ziffern, damit diese früh kommen und beim Tippen nicht springen (Abnahme 1.1, Runde 3)
                        if betragFehler != nil { grenzenZeile }
                    } else {
                        ZStack(alignment: .top) {
                            GebuehrHinweis(cent: eingabe.cent, sichtbar: gueltigerBetrag)
                            if !gueltigerBetrag { grenzenZeile }
                        }
                    }
                }
                .frame(maxWidth: .infinity)

                if schrift.isAccessibilitySize {
                    // Bedienungshilfen-Größen: Art als kompakte Zeile, dann Ziffern; Hinweise und Schalter darunter.
                    // „Zahlungslink erstellen“ ist wie bei normaler Schrift über der Tab-Leiste angeheftet (Abnahme 1.1, Runde 3).
                    if !keineAnzahlung { artMenue }
                    Ziffernblock(eingabe: $eingabe, tastenHoehe: 52, abstand: 8)
                    if gueltigerBetrag { GebuehrHinweis(cent: eingabe.cent) } else if betragFehler == nil { grenzenZeile }
                    HeuteSchalter(an: $heute, kompakt: kompakt)
                        .opacity(anzahlung ? 0 : 1)
                        .disabled(anzahlung)
                        .accessibilityHidden(anzahlung)
                } else {
                    artUndHeute
                    Ziffernblock(eingabe: $eingabe, tastenHoehe: kompakt ? 44 : 52, abstand: kompakt ? 6 : 8)
                }

            }
            // Erster Bildschirm = alles bis zum Ziffernblock. Die Karte „Kunde und Motiv“ beginnt in Ruhe erst unterhalb
            // (vorher schaute ihre Oberkante auf dem iPhone 17 als leere Kante über dem Knopf hervor, Abnahme 1.1, Runde 3)
            .frame(minHeight: schrift.isAccessibilitySize ? 0 : max(0, sichtbareHoehe - 1 - (kompakt ? 4 : 8) - verlaufHoehe), alignment: .top)

                DisclosureGroup(isExpanded: $detailsOffen) {
                    VStack(spacing: 10) {
                        // Daten des Kunden, nicht des Studios: kein Autofill mit den eigenen Kontaktdaten
                        Eingabefeld(titel: Texte.Kasse.kunde, text: $entwurf.kunde, platzhalter: Texte.Kasse.kundeBeispiel, grossschreibung: .words)
                        Eingabefeld(titel: Texte.Kasse.email, text: $entwurf.email, platzhalter: Texte.Kasse.emailBeispiel, tastatur: .emailAddress)
                        Eingabefeld(titel: Texte.Kasse.motiv, text: $entwurf.beschreibung, platzhalter: Texte.Kasse.motivBeispiel)
                        if !anzahlung {
                            Eingabefeld(titel: Texte.Kasse.sitzungen, text: $entwurf.sitzungen, platzhalter: Texte.Kasse.sitzungenBeispiel)
                        }
                        if gutscheinWort {
                            HinweisKarte(text: KlarnaTexte.gutscheinHinweis)
                        }
                    }
                    .padding(.top, 8)
                } label: {
                    Text(Texte.Kasse.details)
                        .font(.dm(.subheadline, weight: .semibold))
                        .foregroundStyle(Color.tfTinte)
                        .frame(minHeight: 44, alignment: .leading)
                }
                // Flacher als .karte(): die zugeklappte Zeile ist nur so hoch wie ihr Inhalt
                .modifier(KompaktKarte())
                // Ruhend liegt die Karte ganz hinter dem angehefteten Knopf, statt mit ihrer Oberkante im Spalt über ihm
                // hervorzuschauen (Abnahme 1.1, Runde 2, SE hell und dunkel). Beim Scrollen kommt sie normal nach oben.
                .padding(.top, schrift.isAccessibilitySize ? 10 : verlaufHoehe + 24)
            }
            .padding(.horizontal, 16)
            .padding(.top, kompakt ? 4 : 8)
            .padding(.bottom, 16)
            // Mindestens so hoch wie der sichtbare Bereich, damit der Spacer über dem Betrag die freie Höhe aufnimmt
            // (die Innenabstände liegen schon im Rahmen; 1 pt Luft gegen Rundung, sonst scrollt es um einen Punkt)
        }
        // Höhe ohne alle Einsätze (angehefteter Knopf, Leisten, Tastatur): sonst rutscht der Ziffernblock hinter den Knopf
        .onScrollGeometryChange(for: CGFloat.self) { g in
            g.containerSize.height - g.contentInsets.top - g.contentInsets.bottom
        } action: { _, neu in sichtbareHoehe = neu }
        .scrollDismissesKeyboard(.interactively)
        .refreshable { await portal.laden() }
        .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { hoehe = $0 }
        // „Zahlungslink erstellen“ über der Tab-Leiste angeheftet: auch auf dem iPhone SE immer zu sehen.
        // Seit Runde 3 auch bei Bedienungshilfen-Größen (vorher lag er dort unter der Tab-Leiste).
        .safeAreaInset(edge: .bottom, spacing: 0) {
            Group {
                knopfBereich
                    .padding(.horizontal, 16)
                    .padding(.top, kompakt ? 5 : 8)
                    .padding(.bottom, 8)
                    .frame(maxWidth: .infinity)
                    .background(Color.tfHintergrund)
                    // Weicher Übergang: Inhalt, der hinter dem Knopf weiterläuft (Karte „Kunde und Motiv“), blendet sanft aus
                    // statt als harter leerer Streifen (iPhone SE, Abnahme G4). Höhe so gewählt, dass er unter der letzten
                    // Ziffernreihe beginnt; oben fast durchsichtig, darum verdeckt er keine Taste.
                    .overlay(alignment: .top) {
                        LinearGradient(stops: [
                            .init(color: Color.tfHintergrund.opacity(0), location: 0),
                            .init(color: Color.tfHintergrund.opacity(0.35), location: 0.35),
                            .init(color: Color.tfHintergrund.opacity(0.8), location: 0.7),
                            .init(color: Color.tfHintergrund, location: 1)
                        ], startPoint: .top, endPoint: .bottom)
                            .frame(height: verlaufHoehe)
                            .offset(y: -verlaufHoehe)
                            .allowsHitTesting(false)
                            .accessibilityHidden(true)
                    }
            }
        }
    }

    /// Fehlerzeile und „Zahlungslink erstellen“. Bei AX-Größen nur Text ohne Symbol und Schrift höchstens AX2,
    /// damit der Knopf nicht den halben Bildschirm einnimmt.
    private var knopfBereich: some View {
        VStack(spacing: 8) {
            if let fehler { FehlerZeile(text: fehler) }
            Button {
                erstellen()
            } label: {
                if sendet {
                    ProgressView().tint(Color.tfBlau)
                } else if schrift.isAccessibilitySize {
                    Text(Texte.Kasse.erstellen)
                        .dynamicTypeSize(...DynamicTypeSize.accessibility2)  // ds-ok: Hauptknopf in der Liste, Schrift bis AX2
                } else {
                    Label(Texte.Kasse.erstellen, systemImage: "qrcode")
                }
            }
            .buttonStyle(.haupt)
            .disabled(!bereit)
        }
    }

    private func erstellen() {
        guard let cent = eingabe.cent else { return }
        sendet = true
        fehler = nil
        let e = entwurf.passend(keineAnzahlung: keineAnzahlung)
        // Für den Fall einer Zeitüberschreitung: welche offenen Links es vorher schon gab
        let vorherIds = Set(portal.zahlungen.filter(\.istOffen).map(\.id))
        Task {
            defer { sendet = false }
            do {
                let neu = APIClient.NeueZahlung(
                    betrag: Euro.fuerServer(cent), art: e.anzahlung ? "anzahlung" : "gesamt",
                    kunde: e.kunde.leerAlsNil, email: e.email.trimmingCharacters(in: .whitespaces).lowercased().leerAlsNil,
                    beschreibung: e.beschreibung.leerAlsNil, sitzungen: e.anzahlung ? nil : e.sitzungen.leerAlsNil,
                    heute: !e.anzahlung && heute ? true : nil)
                let r = try await APIClient.shared.zahlungErstellen(neu)
                portal.aktualisieren(r.zahlung)
                erfolgZaehler += 1
                erstellt = r
                // Entwurf erst nach dem Absenden leeren
                entwurf = KasseEntwurf()
                eingabe.leeren()
                detailsOffen = false
                heute = false
            } catch {
                // Netzfehler (z. B. Zeitüberschreitung bei schlechtem WLAN): Der Server hat den Link vielleicht schon angelegt.
                // Erst nachsehen, statt „nochmal versuchen“ zu sagen – sonst entsteht ein zweiter Link über denselben Betrag.
                if (error as? APIFehler)?.code == "netz", let r = await schonErstellt(cent: cent, vorher: vorherIds) {
                    portal.aktualisieren(r.zahlung)
                    erfolgZaehler += 1
                    erstellt = r
                    entwurf = KasseEntwurf()
                    eingabe.leeren()
                    detailsOffen = false
                    heute = false
                    return
                }
                fehler = fehlerText(error)
                // 409: Stand hat sich geändert (Abo beendet, Adresse fehlt, keine Anzahlung …) → neu laden, damit Sperrkarte bzw. Auswahl stimmen
                if (error as? APIFehler)?.status == 409 { await portal.laden() }
            }
        }
    }

    /// Nach einem Netzfehler: Gibt es jetzt einen neuen offenen Link über genau diesen Betrag aus den letzten 2 Minuten?
    private func schonErstellt(cent: Int, vorher: Set<String>) async -> ZahlungErstellt? {
        await portal.laden()
        guard let z = KasseWiederfinden.neuerLink(in: portal.zahlungen, cent: cent, vorher: vorher),
              let einzeln = try? await APIClient.shared.zahlung(z.id), let link = einzeln.link else { return nil }
        return ZahlungErstellt(zahlung: einzeln.zahlung, link: link, whatsappText: einzeln.whatsappText, hinweis: nil)
    }
}

extension String {
    var leerAlsNil: String? {
        let t = trimmingCharacters(in: .whitespacesAndNewlines)
        return t.isEmpty ? nil : t
    }
}

extension Array where Element == String? {
    /// Nicht-leere Teile mit Trenner verbinden: ["Rose", "", nil, "Karte"] → "Rose · Karte"
    func verbunden(_ trenner: String = " · ") -> String {
        compactMap { $0?.leerAlsNil }.joined(separator: trenner)
    }
}

/// Einfaches Textfeld mit Beschriftung
struct Eingabefeld: View {
    let titel: String
    @Binding var text: String
    /// Beispiel im leeren Feld (sonst der Titel)
    var platzhalter: String?
    var inhalt: UITextContentType?
    var tastatur: UIKeyboardType = .default
    var grossschreibung: TextInputAutocapitalization = .sentences

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(titel).font(.dm(.subheadline, weight: .semibold)).foregroundStyle(Color.tfTinte)
                .accessibilityHidden(true)
            TextField(titel, text: $text, prompt: tfPlatzhalter(self.platzhalter ?? titel))
                .accessibilityLabel(titel)
                .textContentType(inhalt)
                .keyboardType(tastatur)
                .textInputAutocapitalization(tastatur == .emailAddress ? .never : grossschreibung)
                .autocorrectionDisabled(tastatur == .emailAddress)
                .font(.dm(.body))
                .padding(12)
                .background(Color.tfHintergrund, in: RoundedRectangle(cornerRadius: 12))
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.tfFeldRahmen, lineWidth: 1.5))
        }
    }
}

/// Ziffernblock 1–9, Komma, 0, Löschen
struct Ziffernblock: View {
    @Binding var eingabe: BetragEingabe
    /// 52 pt, auf kleinen Bildschirmen 44 pt (Mindestgröße für Tippflächen)
    var tastenHoehe: CGFloat = 52
    var abstand: CGFloat = 8
    @State private var tipp = 0

    private let reihen = [["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"], [",", "0", "⌫"]]

    var body: some View {
        Grid(horizontalSpacing: 10, verticalSpacing: abstand) {
            ForEach(reihen, id: \.self) { reihe in
                GridRow {
                    ForEach(reihe, id: \.self) { t in
                        Button {
                            eingabe.taste(t)
                            tipp += 1
                        } label: {
                            Group {
                                if t == "⌫" { Image(systemName: "delete.left") } else { Text(t) }
                            }
                            .font(.dm(28, relativeTo: .title, weight: .semibold))
                            .foregroundStyle(Color.tfTinte)
                            .frame(maxWidth: .infinity, minHeight: tastenHoehe)
                            .background(Color.tfKarte, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                            .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).stroke(Color.tfLinie, lineWidth: 1))
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(Texte.Kasse.tasteLabel(t))
                        .onLongPressGesture(minimumDuration: 0.5) {
                            if t == "⌫" { eingabe.leeren(); tipp += 1 }
                        }
                    }
                }
            }
        }
        .sensoryFeedback(.selection, trigger: tipp)
        // Einzige Schrift-Grenze der App: 12 Tasten in 3 Spalten passen bei AX-Größen nicht mehr nebeneinander, und
        // Ziffern auf einer Taste brauchen keine größere Schrift, um lesbar zu sein (Brief ds-brief-kern.md).
        .dynamicTypeSize(...DynamicTypeSize.xxxLarge)  // ds-ok: Ziffernblock, 3 Spalten, Ziffern bleiben lesbar
    }
}

/// Hinweis, wenn nicht kassiert werden kann: Apple-Abo beendet, Testkauf (Sandbox), Stripe noch nicht verbunden
/// oder noch nicht freigegeben, Vertrag nicht aktiv.
struct GesperrtKarte: View {
    let studio: Studio
    @Environment(AppState.self) private var app
    @Environment(PortalStore.self) private var portal
    @Environment(\.openURL) private var openURL
    @Environment(\.scenePhase) private var szene
    @State private var prueft = false
    @State private var meldung: String?
    @State private var aboOffen = false
    @State private var adresseOffen = false

    enum Fall: Equatable {
        case aboBeendet, sandbox, stripeVerbinden, adresseFehlt, wartet
    }

    /// Welcher Hinweis gilt (Reihenfolge: beendetes Abo vor Testkauf, damit auch ein abgelaufener Testkauf neu abgeschlossen werden kann)
    nonisolated static func fall(_ s: Studio) -> Fall {
        if s.istApple, s.apple?.istBeendet == true { return .aboBeendet }
        if s.stripe?.verbunden != true {
            if s.istApple, s.apple?.istSandbox == true { return .sandbox }
            return .stripeVerbinden
        }
        // Stripe frei, aber die Adresse der Zahlseite fehlt (Server: darfKassieren → studioAdresseDa)
        if s.stripe?.freigegeben == true, s.adresseFehlt { return .adresseFehlt }
        return .wartet
    }

    /// Meldung nach „Status neu prüfen“ passend zum Grund (nicht immer „Stripe hat noch nicht freigegeben“)
    nonisolated static func pruefMeldung(_ s: Studio) -> String? {
        if s.darfKassieren { return nil }
        switch fall(s) {
        case .aboBeendet: return nil
        case .adresseFehlt: return Texte.Kasse11.adresseNochNoetig
        case .wartet where s.stripe?.freigegeben == true: return Texte.Kasse.vertragNichtAktiv
        case .sandbox, .stripeVerbinden, .wartet: return Texte.Kasse.nochNichtFrei
        }
    }

    private var istInhaber: Bool { app.sitzung?.istInhaber ?? false }
    private var connect: URL? { studio.connectUrl.flatMap(URL.init(string:)) }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                switch Self.fall(studio) {
                case .aboBeendet: aboBeendet
                case .sandbox: sandbox
                case .stripeVerbinden: stripeVerbinden
                case .adresseFehlt: adresseFehlt
                case .wartet: wartet
                }
            }
            .karte()
            .padding(16)
        }
        .refreshable { await portal.laden() }
        .sheet(isPresented: $aboOffen) { AboErneuernSheet() }
        .sheet(isPresented: $adresseOffen) {
            NavigationStack { AdresseView(alsBlatt: true) }
                .environment(portal)
        }
        .onChange(of: szene) { _, neu in
            // Zurück aus Safari (Stripe-Einrichtung) oder den Einstellungen: Stand neu holen
            if neu == .active { Task { await portal.laden() } }
        }
    }

    private func symbol(_ name: String) -> some View {
        Image(systemName: name)
            .font(.system(size: 44))  // ds-ok: Zier-Symbol im Sperr-Hinweis (44 pt), Text wächst mit
            .foregroundStyle(Color.tfAkzent)
            .accessibilityHidden(true)
    }

    private func text(_ t: String) -> some View {
        Text(t)
            .font(.dm(.body))
            .foregroundStyle(Color.tfTinte)
            .fixedSize(horizontal: false, vertical: true)
    }

    @ViewBuilder private var aboBeendet: some View {
        symbol("calendar.badge.exclamationmark")
        Ueberschrift(Texte.Kasse.aboAbgelaufenTitel, groesse: 26)
        text(Texte.Kasse.aboAbgelaufenText)
        if istInhaber {
            Button(Texte.Kasse.aboWiederAbschliessen) { aboOffen = true }
                .buttonStyle(.haupt)
                .accessibilityIdentifier("abo-wieder-abschliessen")
        } else {
            HinweisKarte(text: Texte.Kasse.aboTeamHinweis, symbol: "person.fill")
        }
    }

    @ViewBuilder private var sandbox: some View {
        symbol("testtube.2")
        Ueberschrift(Texte.Kasse.sandboxTitel, groesse: 26)
        text(Texte.Kasse.sandboxText)
        pruefenKnopf(haupt: false)
    }

    @ViewBuilder private var stripeVerbinden: some View {
        symbol("link.circle.fill")
        Ueberschrift(Texte.Kasse.stripeTitel, groesse: 26)
        text(Texte.Kasse.stripeText)
        if let meldung { HinweisKarte(text: meldung, symbol: "info.circle.fill") }
        if let u = connect {
            Button {
                openURL(u)
            } label: {
                Label(Texte.Kasse.stripeEinrichten, systemImage: "safari")
            }
            .buttonStyle(.haupt)
            .accessibilityIdentifier("stripe-einrichten")
        }
        pruefenKnopf(haupt: connect == nil)
    }

    @ViewBuilder private var adresseFehlt: some View {
        symbol("mappin.and.ellipse")
        Ueberschrift(Texte.Kasse11.adresseTitel, groesse: 26)
        text(studio.adresseIstVorschlag ? Texte.Kasse11.adresseVorschlagText : Texte.Kasse11.adresseText)
        if let meldung { HinweisKarte(text: meldung, symbol: "info.circle.fill") }
        if istInhaber {
            Button {
                adresseOffen = true
            } label: {
                Label(studio.adresseIstVorschlag ? Texte.Kasse11.adressePruefen : Texte.Kasse11.adresseEintragen, systemImage: "mappin.and.ellipse")
            }
            .buttonStyle(.haupt)
            .accessibilityIdentifier("adresse-eintragen")
        } else {
            HinweisKarte(text: Texte.Kasse11.adresseTeam, symbol: "person.fill")
        }
        pruefenKnopf(haupt: !istInhaber)
    }

    @ViewBuilder private var wartet: some View {
        symbol("hourglass")
        Ueberschrift(Texte.Kasse.gesperrtTitel, groesse: 26)
        text(studio.stripe?.freigegeben == true ? Texte.Kasse.vertragNichtAktiv : Texte.Kasse.gesperrtText)
        if let meldung { HinweisKarte(text: meldung, symbol: "info.circle.fill") }
        pruefenKnopf(haupt: true)
        // Stripe prüft noch, die Adresse fehlt auch: schon jetzt eintragen (wie die Checkliste im Web)
        if istInhaber, studio.adresseFehlt {
            Button(Texte.Kasse11.adresseSchonJetzt) { adresseOffen = true }
                .buttonStyle(.zweit)
                .accessibilityIdentifier("adresse-eintragen")
        }
        if let u = connect, studio.stripe?.freigegeben != true {
            Button {
                openURL(u)
            } label: {
                Label(Texte.Kasse.stripeOeffnen, systemImage: "safari")
            }
            .buttonStyle(.zweit)
        }
    }

    @ViewBuilder private func pruefenKnopf(haupt: Bool) -> some View {
        let knopf = Button {
            neuPruefen()
        } label: {
            if prueft { ProgressView().tint(Color.tfBlau) } else { Text(Texte.Kasse.statusPruefen) }
        }
        .disabled(prueft)
        .accessibilityIdentifier("status-pruefen")
        if haupt { knopf.buttonStyle(.haupt) } else { knopf.buttonStyle(.zweit) }
    }

    private func neuPruefen() {
        prueft = true
        meldung = nil
        Task {
            defer { prueft = false }
            do {
                let s = try await APIClient.shared.kontoStatus()
                await portal.laden()
                meldung = Self.pruefMeldung(portal.studio ?? s)
            } catch {
                meldung = fehlerText(error)
            }
        }
    }
}
