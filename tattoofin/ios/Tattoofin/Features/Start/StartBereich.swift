import SwiftUI

/// Start-Bereich oben in der Kasse: Einrichtungs-Checkliste (wie im Web), „Diesen Monat“ und „So geht's“.
/// Kompakt, damit der Ziffernblock gut erreichbar bleibt. Checkliste und So-geht's-Karte lassen sich ausblenden.
struct StartBereich: View {
    @Environment(AppState.self) private var app
    @Environment(PortalStore.self) private var portal
    @Environment(WerbungStore.self) private var werbung

    @AppStorage("tf-start-checkliste-aus") private var checklisteAus = false
    @AppStorage("tf-start-sogehts-aus") private var soGehtsAus = false
    @State private var offen = false
    @State private var blatt: StartBlatt?

    var body: some View {
        VStack(spacing: 8) {
            if let s = portal.studio,
               let punkte = werbung.punkte(studio: s, hatZahlungen: !portal.zahlungen.isEmpty, istInhaber: app.sitzung?.istInhaber == true) {
                let fertig = punkte.filter(\.ok).count
                if !(checklisteAus && fertig == punkte.count) {
                    checkliste(punkte, fertig: fertig)
                }
            }
            monat
            if !soGehtsAus { soGehtsKarte }
        }
        .task(id: portal.geladenAm) { await werbung.laden() }
        .sheet(item: $blatt) { _ in
            NavigationStack {
                SoGehtsView()
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button(Texte.Allgemein.fertig) { blatt = nil }.font(.dm(.body, weight: .semibold))
                    }
                }
            }
            .environment(werbung)
        }
        .onChange(of: app.tab) { _, neu in
            // Zurück in der Kasse (z. B. nach Recht/Fragebogen im Konto): Häkchen neu holen
            if neu == .kasse { Task { await werbung.laden(abstand: 5) } }
        }
    }

    // MARK: Checkliste

    @ViewBuilder
    private func checkliste(_ punkte: [StartCheckpunkt], fertig: Int) -> some View {
        if fertig == punkte.count {
            HStack(spacing: 10) {
                Image(systemName: "checkmark.seal.fill").foregroundStyle(Color.tfGruen).accessibilityHidden(true)
                Text(WerbungTexte.Start.alleErledigt).font(.dm(.subheadline, weight: .semibold)).foregroundStyle(Color.tfTinte)
                    .fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 4)
                Button(WerbungTexte.ausblenden) { withAnimation { checklisteAus = true } }
                    .font(.dm(.subheadline, weight: .semibold))
                    .foregroundStyle(Color.tfAkzent)
            }
            .modifier(KompaktKarte())
        } else {
            DisclosureGroup(isExpanded: $offen) {
                VStack(alignment: .leading, spacing: 12) {
                    ForEach(punkte) { p in zeile(p) }
                }
                .padding(.top, 10)
            } label: {
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text(WerbungTexte.Start.einrichtung).font(.dm(.headline, weight: .bold)).foregroundStyle(Color.tfTinte)
                        Spacer()
                        Text(WerbungTexte.Start.stand(fertig, punkte.count)).font(.dm(.subheadline, weight: .semibold)).foregroundStyle(Color.tfLeise)
                    }
                    ProgressView(value: Double(fertig), total: Double(punkte.count))
                        .tint(Color.tfGruen)
                        .accessibilityHidden(true)
                }
                .accessibilityElement(children: .combine)
                .accessibilityLabel("\(WerbungTexte.Start.einrichtung): \(WerbungTexte.Start.stand(fertig, punkte.count)) erledigt")
            }
            .modifier(KompaktKarte())
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
                    .strikethrough(false)
                Text(p.text).font(.dm(.footnote)).foregroundStyle(Color.tfLeise)
                    .fixedSize(horizontal: false, vertical: true)
                if !p.ok && (p.aktion != nil || p.manuell != nil) {
                    HStack(spacing: 8) {
                        if let a = p.aktion {
                            Button(a.knopf) { ausfuehren(a) }
                                .buttonStyle(.bordered)
                                .tint(Color.tfAkzent)
                        }
                        if let m = p.manuell {
                            Button(WerbungTexte.Start.erledigt) { Task { await werbung.abhaken(m) } }
                                .buttonStyle(.bordered)
                                .tint(Color.tfGruen)
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

    private func ausfuehren(_ a: StartCheckpunkt.Aktion) {
        switch a {
        case .werbung: app.tab = .werbung
        // Rechtliche Lage und Fragebogen stehen im Konto (Abschnitt „Dein Studio“)
        case .recht, .fragebogen: app.tab = .konto
        }
    }

    // MARK: Diesen Monat

    @ViewBuilder
    private var monat: some View {
        if let k = portal.kpis {
            // Paket mit Provision: „an dich“ (nur, wenn der Portal-Ausweg die Zahl kennt), sonst Anzahl der Zahlungen
            let anDich = werbung.start?.studio.istProvision == true ? werbung.start?.kpis?.auszahlungMonatCent : nil
            let zweiter = anDich.map { "\(Euro.text($0)) \(WerbungTexte.Start.anDich)" }
                ?? "\(k.zahlungenMonat ?? 0) \(WerbungTexte.Start.zahlungen)"
            ViewThatFits(in: .horizontal) {
                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text(WerbungTexte.Start.diesenMonat).font(.dm(.subheadline, weight: .semibold)).foregroundStyle(Color.tfLeise)
                    Spacer(minLength: 4)
                    Text(Euro.text(k.umsatzMonatCent ?? 0)).font(.dm(.headline, weight: .bold)).foregroundStyle(Color.tfTinte)
                    Text("· \(zweiter)").font(.dm(.subheadline)).foregroundStyle(Color.tfLeise)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text(WerbungTexte.Start.diesenMonat).font(.dm(.subheadline, weight: .semibold)).foregroundStyle(Color.tfLeise)
                    Text(Euro.text(k.umsatzMonatCent ?? 0)).font(.dm(.headline, weight: .bold)).foregroundStyle(Color.tfTinte)
                    Text(zweiter).font(.dm(.subheadline)).foregroundStyle(Color.tfLeise)
                }
            }
            .modifier(KompaktKarte())
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("\(WerbungTexte.Start.diesenMonat): \(WerbungTexte.Start.gezahlt) \(Euro.gesprochen(k.umsatzMonatCent ?? 0)). "
                                + (anDich.map { "\(WerbungTexte.Start.anDich) \(Euro.gesprochen($0))" } ?? "\(k.zahlungenMonat ?? 0) \(WerbungTexte.Start.zahlungen)"))
        }
    }

    // MARK: So geht's

    private var soGehtsKarte: some View {
        HStack(spacing: 10) {
            Button { blatt = .soGehts } label: {
                HStack(spacing: 10) {
                    Image(systemName: "play.rectangle.fill").foregroundStyle(Color.tfAkzent).accessibilityHidden(true)
                    Text(WerbungTexte.soGehtsTitel).font(.dm(.headline, weight: .bold)).foregroundStyle(Color.tfTinte)
                    Text(WerbungTexte.soGehtsDauer).font(.dm(.subheadline)).foregroundStyle(Color.tfLeise)
                    Spacer(minLength: 0)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityElement(children: .combine)
            .accessibilityHint(WerbungTexte.soGehtsLabel)
            Button { withAnimation { soGehtsAus = true } } label: {
                Image(systemName: "xmark").font(.footnote.weight(.bold)).foregroundStyle(Color.tfLeise)
                    .frame(minWidth: 44, minHeight: 32)
            }
            .accessibilityLabel(WerbungTexte.soGehtsAusblenden)
        }
        .modifier(KompaktKarte())
    }
}

/// Wie .karte(), nur flacher (Start-Bereich über dem Ziffernblock)
struct KompaktKarte: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.tfKarte, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(Color.tfLinie, lineWidth: 1))
    }
}

enum StartBlatt: String, Identifiable {
    case soGehts
    var id: String { rawValue }
}

/// Ein Punkt der Einrichtungs-Checkliste
struct StartCheckpunkt: Identifiable, Equatable {
    enum Aktion: Equatable { case werbung, recht, fragebogen }

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
        }
    }
}

/// Punkte wie im Web-Dashboard (app.js checkliste()), für die App angepasst: kein Paket/Preis, „App“ ist erledigt.
enum StartCheckpunkte {
    /// Vom Server (GET /api/app/start). Ziele „stripe“ und „link“ brauchen hier keinen Knopf: Der Start-Bereich steht nur in der Kasse,
    /// und die gibt es erst nach der Stripe-Freigabe. Punkte, die diese Rolle nicht erledigen darf, ohne Knopf.
    static func punkte(server: [ServerCheckpunkt]) -> [StartCheckpunkt] {
        server.map { p in
            let darf = p.darf ?? true
            var aktion: StartCheckpunkt.Aktion?
            if darf {
                switch p.ziel {
                case "werbung": aktion = .werbung
                case "recht": aktion = .recht
                case "fragebogen": aktion = .fragebogen
                default: aktion = nil
                }
            }
            let manuell = darf && ["app", "theke", "werbung"].contains(p.manuell ?? "") ? p.manuell : nil
            return StartCheckpunkt(id: p.id, ok: p.ok, wartet: p.wartet ?? false, titel: p.titel, text: p.text ?? "", aktion: aktion, manuell: manuell)
        }
    }

    /// Selbst berechnet (älterer Server ohne /api/app/start)
    static func punkte(studio s: Studio, start: StartStudio?, hatZahlungen: Bool, istInhaber: Bool = true) -> [StartCheckpunkt] {
        typealias T = WerbungTexte.Start
        let frei = s.stripe?.freigegeben == true
        let wartet = !frei && s.stripe?.angabenGemacht == true
        let c = start?.checkliste ?? StartCheckliste()
        return [
            StartCheckpunkt(id: "konto", ok: true, titel: T.konto, text: T.kontoText),
            StartCheckpunkt(id: "stripe", ok: frei, wartet: wartet, titel: T.stripe, text: frei ? T.stripeOk : wartet ? T.stripeWarte : T.stripeOffen),
            // Fragebogen und Recht darf nur der Inhaber erledigen (Server: nur_inhaber)
            StartCheckpunkt(id: "fragebogen", ok: start?.fragebogenAm != nil, titel: T.fragebogen, text: T.fragebogenText, aktion: istInhaber ? .fragebogen : nil),
            StartCheckpunkt(id: "recht", ok: start?.recht?.aktuell == true, titel: T.recht, text: T.rechtText, aktion: istInhaber ? .recht : nil),
            StartCheckpunkt(id: "link", ok: hatZahlungen, titel: T.link, text: T.linkText),
            // In der iPhone-App immer erledigt (im Web: „auf den Startbildschirm“)
            StartCheckpunkt(id: "app", ok: true, titel: T.app, text: T.appText),
            StartCheckpunkt(id: "theke", ok: c.theke != nil, titel: T.theke, text: T.thekeText, aktion: .werbung, manuell: "theke"),
            StartCheckpunkt(id: "werbung", ok: c.werbung != nil, titel: T.werbung, text: T.werbungText, aktion: .werbung, manuell: "werbung"),
        ]
    }
}
