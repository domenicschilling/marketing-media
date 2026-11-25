import SwiftUI

/// Start-Bereich oben in der Kasse: eine schmale Zeile mit „Einrichtung 4/8 ›“ und „So geht's“, darunter „Diesen Monat“ als kleine Zeile.
/// Die Checkliste (wie im Web) öffnet als Blatt. So bleiben Betrag, Ziffernblock und „Zahlungslink erstellen“ im ersten Bildschirm.
/// Ist alles erledigt, lässt sich die Einrichtung ausblenden.
struct StartBereich: View {
    @Environment(AppState.self) private var app
    @Environment(PortalStore.self) private var portal
    @Environment(WerbungStore.self) private var werbung
    @Environment(\.dynamicTypeSize) private var schrift
    /// Ab „größer als Standard“ untereinander. Die Schrift wächst hier bis AX5 (begrenzt ist nur der Ziffernblock der Kasse).
    private var grosseSchrift: Bool { schrift > .large }

    /// Fortschrittsring wächst mit der Schrift (vorher fest 20 pt neben großem Text, Gestaltungsprüfung 1.1, Nr. 19)
    @ScaledMetric(relativeTo: .body) private var ring: CGFloat = 22

    @AppStorage("tf-start-checkliste-aus") private var checklisteAus = false
    @State private var blatt: StartBlatt?

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            let punkte = portal.studio.flatMap { s in
                werbung.punkte(studio: s, hatZahlungen: !portal.zahlungen.isEmpty, istInhaber: app.sitzung?.istInhaber == true)
            }
            let fertig = punkte?.filter(\.ok).count ?? 0
            let zeigeEinrichtung = punkte.map { !(checklisteAus && fertig == $0.count) } ?? false
            Group {
                if grosseSchrift {
                    VStack(spacing: 8) {
                        if zeigeEinrichtung, let punkte { einrichtungKnopf(fertig: fertig, von: punkte.count) }
                        soGehtsKnopf
                    }
                } else {
                    HStack(spacing: 8) {
                        if zeigeEinrichtung, let punkte { einrichtungKnopf(fertig: fertig, von: punkte.count) }
                        soGehtsKnopf
                    }
                    .fixedSize(horizontal: false, vertical: true)
                }
            }
            monat
                // Etwas Luft zu den Karten darüber (zusammen mit dem Abstand des Stapels etwa 14 pt)
                .padding(.top, 8)
        }
        .task(id: portal.geladenAm) { await werbung.laden() }
        .sheet(item: $blatt, onDismiss: {
            // Nach Recht/Fragebogen: Häkchen neu holen
            Task { await werbung.laden(immer: true) }
        }) { b in
            Group {
                switch b {
                case .soGehts:
                    NavigationStack {
                        SoGehtsView()
                            .toolbar {
                                ToolbarItem(placement: .confirmationAction) {
                                    Button(Texte.Allgemein.fertig) { blatt = nil }.font(.dm(.body, weight: .semibold))
                                }
                            }
                    }
                case .checkliste:
                    ChecklistenBlatt(checklisteAus: $checklisteAus) { ziel in
                        blatt = nil
                        app.werbungSprung = ziel
                        app.tab = .werbung
                    }
                }
            }
            .environment(werbung)
            .environment(app)
            .environment(portal)
        }
        .onChange(of: app.tab) { _, neu in
            // Zurück in der Kasse (z. B. nach Recht/Fragebogen im Konto): Häkchen neu holen
            if neu == .kasse { Task { await werbung.laden(abstand: 5) } }
        }
    }

    // MARK: Einrichtung (öffnet die Checkliste)

    private func einrichtungKnopf(fertig: Int, von: Int) -> some View {
        Button { blatt = .checkliste } label: {
            HStack(spacing: 8) {
                if fertig == von {
                    Image(systemName: "checkmark.seal.fill").foregroundStyle(Color.tfGruen)
                } else if !schrift.isAccessibilitySize {
                    // Bei Bedienungshilfen-Größen ohne Ring: dort steht „4 von 8“ ausgeschrieben
                    ZStack {
                        Circle().stroke(Color.tfLinie, lineWidth: 3)
                        Circle().trim(from: 0, to: CGFloat(fertig) / CGFloat(max(von, 1)))
                            .stroke(Color.tfGruen, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                            .rotationEffect(.degrees(-90))
                    }
                    .frame(width: ring, height: ring)
                }
                // Bei Bedienungshilfen-Größen steht der Zähler ausgeschrieben unter dem Wort („4 von 8“), damit „Einrichtung“
                // nicht zu „Einrich…“ wird (iPhone SE/17e ab etwa AX4). Nur im Notfall leicht verkleinern statt kürzen.
                let zaehler = Text(fertig == von ? "✓" : "\(fertig)/\(von)").font(.dm(.subheadline, weight: .semibold).monospacedDigit())
                    .foregroundStyle(Color.tfLeise)
                let wort = Text(WerbungTexte.Start.einrichtung).font(.dm(.subheadline, weight: .bold)).foregroundStyle(Color.tfTinte)
                    .lineLimit(1)
                if schrift.isAccessibilitySize {
                    VStack(alignment: .leading, spacing: 2) {
                        wort.minimumScaleFactor(0.7)
                        Text(fertig == von ? "✓" : WerbungTexte.Start.stand(fertig, von))
                            .font(.dm(.subheadline, weight: .semibold).monospacedDigit())
                            .foregroundStyle(Color.tfLeise)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    Spacer(minLength: 2)
                } else {
                    wort
                    Spacer(minLength: 2)
                    zaehler
                }
                Image(systemName: "chevron.right").font(.caption.weight(.bold)).foregroundStyle(Color.tfLeise)
            }
            .frame(maxWidth: .infinity, minHeight: 28)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .modifier(KompaktKarte())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(fertig == von ? "\(WerbungTexte.Start.einrichtung): \(WerbungTexte.Start.alleErledigt)"
                                          : "\(WerbungTexte.Start.einrichtung): \(WerbungTexte.Start.stand(fertig, von)) erledigt")
        .accessibilityHint(WerbungTexte.Start.einrichtungHinweis)
        .accessibilityAddTraits(.isButton)
        .accessibilityIdentifier("start-einrichtung")
    }

    // MARK: So geht's

    private var soGehtsKnopf: some View {
        Button { blatt = .soGehts } label: {
            HStack(spacing: 8) {
                Image(systemName: "play.rectangle.fill").foregroundStyle(Color.tfAkzent)
                Text(WerbungTexte.soGehtsTitel).font(.dm(.subheadline, weight: .bold)).foregroundStyle(Color.tfTinte)
                    .lineLimit(1)
            }
            .frame(maxWidth: grosseSchrift ? .infinity : nil, minHeight: 28, alignment: .leading)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .modifier(KompaktKarte(breit: grosseSchrift))
        .fixedSize(horizontal: !grosseSchrift, vertical: false)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(WerbungTexte.soGehtsTitel)
        .accessibilityHint(WerbungTexte.soGehtsLabel)
        .accessibilityAddTraits(.isButton)
        .accessibilityIdentifier("start-so-gehts")
    }

    // MARK: Diesen Monat (kleine Zeile)

    @ViewBuilder
    private var monat: some View {
        if portal.studio?.istTestmodus == true {
            // Testkauf (Apple-Sandbox): statt Umsatz der Hinweis auf den Testmodus, gleiche Höhe wie die Monatszeile,
            // damit „Zahlungslink erstellen“ ohne Scrollen sichtbar bleibt (App Review sieht diesen Bildschirm zuerst)
            Label(Texte.Kasse.testmodusText, systemImage: "testtube.2")
                .font(.dm(.footnote, weight: .semibold))
                // tfAkzent (hell Blau, dunkel Gelb): tfBlau auf dem dunklen Hintergrund hätte nur etwa 1,6:1
                .foregroundStyle(Color.tfAkzent)
                .padding(.horizontal, 4)
                .accessibilityElement(children: .combine)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity, alignment: .center)
                .accessibilityIdentifier("kasse-testmodus")
        } else if let k = portal.kpis {
            // Paket mit Provision: „an dich“ (nur, wenn der Portal-Ausweg die Zahl kennt), sonst Anzahl der Zahlungen
            let anDich = werbung.start?.studio.istProvision == true ? werbung.start?.kpis?.auszahlungMonatCent : nil
            let zweiter = anDich.map { "\(Euro.text($0)) \(WerbungTexte.Start.anDich)" }
                ?? "\(k.zahlungenMonat ?? 0) \(WerbungTexte.Start.zahlungen)"
            (Text("\(WerbungTexte.Start.diesenMonat): ").foregroundStyle(Color.tfLeise)
             + Text(Euro.text(k.umsatzMonatCent ?? 0)).fontWeight(.bold).foregroundStyle(Color.tfTinte)
             + Text(" · \(zweiter)").foregroundStyle(Color.tfLeise))
                .font(.dm(.footnote))
                .padding(.horizontal, 4)
                // Mittig wie der Betrag darunter (vorher linksbündig, Gestaltungsprüfung 1.1, Nr. 9)
                .multilineTextAlignment(.center)
                .frame(maxWidth: .infinity, alignment: .center)
                .accessibilityElement(children: .ignore)
                .accessibilityAddTraits(.isStaticText)
                .accessibilityLabel("\(WerbungTexte.Start.diesenMonat): \(WerbungTexte.Start.gezahlt) \(Euro.gesprochen(k.umsatzMonatCent ?? 0)). "
                                    + (anDich.map { "\(WerbungTexte.Start.anDich) \(Euro.gesprochen($0))" } ?? "\(k.zahlungenMonat ?? 0) \(WerbungTexte.Start.zahlungen)"))
        }
    }
}

/// Einrichtungs-Checkliste als Blatt (wie im Web-Dashboard). Recht und Fragebogen öffnen direkt, „Werbung“ springt in den Tab.
struct ChecklistenBlatt: View {
    @Binding var checklisteAus: Bool
    let zurWerbung: (WerbungAbschnitt) -> Void

    @Environment(\.dismiss) private var dismiss
    @Environment(AppState.self) private var app
    @Environment(PortalStore.self) private var portal
    @Environment(WerbungStore.self) private var werbung
    @State private var ziel: StartBlatt.Ziel?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if let s = portal.studio,
                       let punkte = werbung.punkte(studio: s, hatZahlungen: !portal.zahlungen.isEmpty, istInhaber: app.sitzung?.istInhaber == true) {
                        let fertig = punkte.filter(\.ok).count
                        VStack(alignment: .leading, spacing: 6) {
                            Text(fertig == punkte.count ? WerbungTexte.Start.alleErledigt : WerbungTexte.Start.stand(fertig, punkte.count) + " erledigt")
                                .font(.dm(.headline, weight: .bold)).foregroundStyle(Color.tfTinte)
                            ProgressView(value: Double(fertig), total: Double(max(punkte.count, 1)))
                                .tint(Color.tfGruen)
                                .accessibilityHidden(true)
                        }
                        VStack(alignment: .leading, spacing: 14) {
                            ForEach(punkte) { p in zeile(p) }
                        }
                        .karte()
                        if fertig == punkte.count {
                            Button(WerbungTexte.Start.ausblendenLang) {
                                withAnimation { checklisteAus = true }
                                dismiss()
                            }
                            .buttonStyle(.zweit)
                        }
                    } else {
                        LadeAnsicht().frame(minHeight: 160)
                    }
                }
                .padding(16)
            }
            .tfHintergrund()
            .navigationTitle(WerbungTexte.Start.einrichtung)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(Texte.Allgemein.fertig) { dismiss() }.font(.dm(.body, weight: .semibold))
                }
            }
            .navigationDestination(item: $ziel) { z in
                switch z {
                case .recht: RechtView()
                case .fragebogen: FragebogenView()
                case .adresse: AdresseView()
                }
            }
            .task { await werbung.laden(abstand: 5) }
            .onChange(of: ziel) { _, neu in
                // Zurück aus Recht/Fragebogen: Häkchen neu holen
                if neu == nil { Task { await werbung.laden(immer: true) } }
            }
        }
    }

    private func zeile(_ p: StartCheckpunkt) -> some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: p.ok ? "checkmark.circle.fill" : p.wartet ? "clock" : "circle")
                .font(.title3)
                .foregroundStyle(p.ok ? Color.tfGruen : p.wartet ? Color.tfOrange : Color.tfLeise)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 4) {
                Text(p.titel).font(.dm(.body, weight: .semibold)).foregroundStyle(Color.tfTinte)
                Text(p.text).font(.dm(.footnote)).foregroundStyle(Color.tfLeise)
                    .fixedSize(horizontal: false, vertical: true)
                if !p.ok && (p.aktion != nil || p.manuell != nil) {
                    // Nebeneinander nur, wenn beide Beschriftungen in eine Zeile passen (große Schrift: untereinander, kein Buchstabensalat)
                    GleichBreitOderUntereinander(abstand: 8) {
                        if let a = p.aktion {
                            // Marken-Knopfstil statt System-Pille (.bordered), Gestaltungsprüfung 1.1, Nr. 13
                            Button(a.knopf) { ausfuehren(a, punkt: p.id) }
                                .buttonStyle(ZweitKnopfStil(farbe: .tfAkzent))
                                .accessibilityIdentifier("checkliste-\(p.id)")
                        }
                        if let m = p.manuell {
                            // Neutral, damit es nicht wie „schon erledigt“ aussieht
                            Button(WerbungTexte.Start.erledigt) { Task { await werbung.abhaken(m) } }
                                .buttonStyle(.zweit)
                        }
                    }
                    .font(.dm(.subheadline, weight: .semibold))
                }
            }
            Spacer(minLength: 0)
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("\(p.titel), \(p.ok ? "erledigt" : p.wartet ? "wartet" : "offen")")
    }

    private func ausfuehren(_ a: StartCheckpunkt.Aktion, punkt: String) {
        switch a {
        case .werbung: zurWerbung(StartCheckpunkte.werbungZiel(punkt: punkt, klarnaMaterial: werbung.klarnaMaterial))
        case .recht: ziel = .recht
        case .fragebogen: ziel = .fragebogen
        case .adresse: ziel = .adresse
        }
    }
}

/// Wie .karte(), nur flacher (Start-Bereich über dem Ziffernblock)
struct KompaktKarte: ViewModifier {
    /// false: so breit wie der Inhalt (z. B. „So geht's“ neben „Einrichtung“)
    var breit = true

    func body(content: Content) -> some View {
        content
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .frame(maxWidth: breit ? .infinity : nil, alignment: .leading)
            .background(Color.tfKarte, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Color.tfLinie, lineWidth: 1))
    }
}

enum StartBlatt: String, Identifiable {
    case soGehts, checkliste
    var id: String { rawValue }

    /// Unterseiten der Checkliste
    enum Ziel: String, Hashable, Identifiable {
        case recht, fragebogen, adresse
        var id: String { rawValue }
    }
}

/// Abschnitte im Tab „Werbung“ (Sprungleiste, Sprung aus der Checkliste)
enum WerbungAbschnitt: String, Hashable, CaseIterable, Identifiable {
    case video, beitraege, zahlseite, druck
    var id: String { rawValue }
}

/// Ein Punkt der Einrichtungs-Checkliste
struct StartCheckpunkt: Identifiable, Equatable {
    enum Aktion: Equatable { case werbung, recht, fragebogen, adresse }

    var id: String
    var ok: Bool
    var wartet = false
    var titel: String
    var text: String
    var aktion: Aktion?
    var knopf: String { aktion?.knopf ?? "" }
    /// Punkt, den man selbst abhakt (app, theke, werbung)
    var manuell: String?
}

extension StartCheckpunkt.Aktion {
    var knopf: String {
        switch self {
        case .werbung: WerbungTexte.Start.zurWerbung
        case .recht: WerbungTexte.Start.lesen
        case .fragebogen: WerbungTexte.Start.ausfuellen
        case .adresse: Texte.Kasse11.checklisteAdresseKnopf
        }
    }
}

/// Punkte wie im Web-Dashboard (app.js checkliste()), für die App angepasst: kein Paket/Preis, „App“ ist erledigt.
enum StartCheckpunkte {
    /// Vom Server (GET /api/app/start). Ziele „stripe“ und „link“ brauchen hier keinen Knopf: Der Start-Bereich steht nur in der offenen Kasse.
    /// Die ist offen nach der Stripe-Freigabe oder im Testmodus (Apple-Sandbox) bzw. Demo-Studio ohne Stripe; dann meldet der Server
    /// den Stripe-Punkt als erledigt. Punkte, die diese Rolle nicht erledigen darf, ohne Knopf.
    static func punkte(server: [ServerCheckpunkt]) -> [StartCheckpunkt] {
        server.map { p in
            let darf = p.darf ?? true
            var aktion: StartCheckpunkt.Aktion?
            if darf {
                switch p.ziel {
                case "werbung": aktion = .werbung
                case "recht": aktion = .recht
                case "fragebogen": aktion = .fragebogen
                // Adresse der Zahlseite: der Server liefert kein Ziel (ziel: null), die App hat jetzt eine eigene Maske
                default: aktion = p.id == "adresse" && !p.ok ? .adresse : nil
                }
            }
            let manuell = darf && ["app", "theke", "werbung"].contains(p.manuell ?? "") ? p.manuell : nil
            // Server-Text schickt zu tattoofin.de; in der App gibt es die Maske direkt hier
            let text = aktion == .adresse ? Texte.Kasse11.checklisteAdresseText : p.text ?? ""
            return StartCheckpunkt(id: p.id, ok: p.ok, wartet: p.wartet ?? false, titel: p.titel, text: text, aktion: aktion, manuell: manuell)
        }
    }

    /// Selbst berechnet (älterer Server ohne /api/app/start). Wie der Server: Im Testmodus (Apple-Sandbox) und im Demo-Studio
    /// gibt es keine Stripe-Einrichtung, der Stripe-Punkt ist erledigt. Der Link-Punkt hängt an der offenen Kasse (darfKassieren).
    static func punkte(studio s: Studio, start: StartStudio?, hatZahlungen: Bool, istInhaber: Bool = true) -> [StartCheckpunkt] {
        typealias T = WerbungTexte.Start
        let frei = s.stripe?.freigegeben == true || s.hatTestkasse
        let wartet = !frei && s.stripe?.angabenGemacht == true
        let c = start?.checkliste ?? StartCheckliste()
        return [
            StartCheckpunkt(id: "konto", ok: true, titel: T.konto, text: T.kontoText),
            StartCheckpunkt(id: "stripe", ok: frei, wartet: wartet, titel: T.stripe, text: s.hatTestkasse ? T.stripeTestmodus : frei ? T.stripeOk : wartet ? T.stripeWarte : T.stripeOffen),
            // Fragebogen und Recht darf nur der Inhaber erledigen (Server: nur_inhaber)
            StartCheckpunkt(id: "fragebogen", ok: start?.fragebogenAm != nil, titel: T.fragebogen, text: T.fragebogenText, aktion: istInhaber ? .fragebogen : nil),
            StartCheckpunkt(id: "recht", ok: start?.recht?.aktuell == true, titel: T.recht, text: T.rechtText, aktion: istInhaber ? .recht : nil),
            StartCheckpunkt(id: "link", ok: hatZahlungen, titel: T.link, text: s.darfKassieren ? T.linkText : T.linkGesperrt),
            // In der iPhone-App immer erledigt (im Web: „auf den Startbildschirm“)
            StartCheckpunkt(id: "app", ok: true, titel: T.app, text: T.appText),
            StartCheckpunkt(id: "theke", ok: c.theke != nil, titel: T.theke, text: T.thekeText, aktion: .werbung, manuell: "theke"),
            StartCheckpunkt(id: "werbung", ok: c.werbung != nil, titel: T.werbung, text: T.werbungText, aktion: .werbung, manuell: "werbung"),
        ]
    }
}
