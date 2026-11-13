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
        .onAppear { eingabe = BetragEingabe(text: entwurf.betrag) }
        .onChange(of: eingabe) { _, neu in entwurf.betrag = neu.text }
        .onChange(of: entwurf) { _, neu in Einstellungen.kasseEntwurf = neu.istLeer ? nil : neu }
    }

    private var betragFehler: String? {
        guard let c = eingabe.cent, c > 0 else { return nil }
        if c < portal.config.min || c > portal.config.max {
            return Texte.Kasse.grenzen(min: portal.config.min, max: portal.config.max)
        }
        return nil
    }

    private var bereit: Bool {
        guard let c = eingabe.cent else { return false }
        return c >= portal.config.min && c <= portal.config.max && !sendet
    }

    private var formular: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Betrag
                VStack(spacing: 4) {
                    Text(eingabe.anzeige)
                        .font(.luckiest(54, relativeTo: .largeTitle))
                        .foregroundStyle(Color.tfTinte)
                        .lineLimit(1)
                        .minimumScaleFactor(0.4)
                        .contentTransition(.numericText())
                        .accessibilityLabel(Texte.Kasse.betragLabel)
                        .accessibilityValue(eingabe.cent.map(Euro.gesprochen) ?? "0 Euro")
                    Text(betragFehler ?? Texte.Kasse.grenzen(min: portal.config.min, max: portal.config.max))
                        .font(.dm(.footnote, weight: betragFehler == nil ? .regular : .semibold))
                        .foregroundStyle(betragFehler == nil ? Color.tfLeise : Color.tfRot)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 6)

                Picker(Texte.Kasse.artLabel, selection: $entwurf.anzahlung) {
                    Text(Texte.Kasse.gesamt).tag(false)
                    Text(Texte.Kasse.anzahlung).tag(true)
                }
                .pickerStyle(.segmented)

                Ziffernblock(eingabe: $eingabe)

                DisclosureGroup(isExpanded: $detailsOffen) {
                    VStack(spacing: 10) {
                        Eingabefeld(titel: Texte.Kasse.kunde, text: $entwurf.kunde, inhalt: .name)
                        Eingabefeld(titel: Texte.Kasse.email, text: $entwurf.email, inhalt: .emailAddress, tastatur: .emailAddress)
                        Eingabefeld(titel: Texte.Kasse.motiv, text: $entwurf.beschreibung)
                        if !entwurf.anzahlung {
                            Eingabefeld(titel: Texte.Kasse.sitzungen, text: $entwurf.sitzungen)
                        }
                    }
                    .padding(.top, 8)
                } label: {
                    Text(Texte.Kasse.details)
                        .font(.dm(.body, weight: .semibold))
                        .foregroundStyle(Color.tfTinte)
                }
                .karte()

                if let fehler { FehlerZeile(text: fehler) }

                Button {
                    erstellen()
                } label: {
                    if sendet { ProgressView().tint(Color.tfBlau) } else { Label(Texte.Kasse.erstellen, systemImage: "qrcode") }
                }
                .buttonStyle(.haupt)
                .disabled(!bereit)
            }
            .padding(16)
        }
        .scrollDismissesKeyboard(.interactively)
        .refreshable { await portal.laden() }
    }

    private func erstellen() {
        guard let cent = eingabe.cent else { return }
        sendet = true
        fehler = nil
        let e = entwurf
        Task {
            defer { sendet = false }
            do {
                let neu = APIClient.NeueZahlung(
                    betrag: Euro.fuerServer(cent), art: e.anzahlung ? "anzahlung" : "gesamt",
                    kunde: e.kunde.leerAlsNil, email: e.email.trimmingCharacters(in: .whitespaces).lowercased().leerAlsNil,
                    beschreibung: e.beschreibung.leerAlsNil, sitzungen: e.anzahlung ? nil : e.sitzungen.leerAlsNil)
                let r = try await APIClient.shared.zahlungErstellen(neu)
                portal.aktualisieren(r.zahlung)
                erfolgZaehler += 1
                erstellt = r
                // Entwurf erst nach dem Absenden leeren
                entwurf = KasseEntwurf()
                eingabe.leeren()
                detailsOffen = false
            } catch {
                fehler = fehlerText(error)
            }
        }
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
    var inhalt: UITextContentType?
    var tastatur: UIKeyboardType = .default
    var grossschreibung: TextInputAutocapitalization = .sentences

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(titel).font(.dm(.subheadline, weight: .semibold)).foregroundStyle(Color.tfTinte)
            TextField(titel, text: $text)
                .textContentType(inhalt)
                .keyboardType(tastatur)
                .textInputAutocapitalization(tastatur == .emailAddress ? .never : grossschreibung)
                .autocorrectionDisabled(tastatur == .emailAddress)
                .font(.dm(.body))
                .padding(12)
                .background(Color.tfHintergrund, in: RoundedRectangle(cornerRadius: 12))
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.tfLinie, lineWidth: 1.5))
        }
    }
}

/// Ziffernblock 1–9, Komma, 0, Löschen
struct Ziffernblock: View {
    @Binding var eingabe: BetragEingabe
    @State private var tipp = 0

    private let reihen = [["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"], [",", "0", "⌫"]]

    var body: some View {
        Grid(horizontalSpacing: 10, verticalSpacing: 10) {
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
                            .frame(maxWidth: .infinity, minHeight: 58)
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
    }
}

/// Hinweis, wenn das Stripe-Konto noch nicht freigegeben ist
struct GesperrtKarte: View {
    let studio: Studio
    @Environment(PortalStore.self) private var portal
    @Environment(\.openURL) private var openURL
    @State private var prueft = false
    @State private var meldung: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Image(systemName: "hourglass")
                    .font(.system(size: 44))
                    .foregroundStyle(Color.tfAkzent)
                    .accessibilityHidden(true)
                Ueberschrift(Texte.Kasse.gesperrtTitel, groesse: 26)
                Text(studio.stripe?.freigegeben == true ? Texte.Kasse.vertragNichtAktiv : Texte.Kasse.gesperrtText)
                    .font(.dm(.body))
                    .foregroundStyle(Color.tfTinte)
                    .fixedSize(horizontal: false, vertical: true)
                if let meldung { HinweisKarte(text: meldung, symbol: "info.circle.fill") }
                Button {
                    neuPruefen()
                } label: {
                    if prueft { ProgressView().tint(Color.tfBlau) } else { Text(Texte.Kasse.statusPruefen) }
                }
                .buttonStyle(.haupt)
                .disabled(prueft)
                if let u = studio.connectUrl.flatMap(URL.init(string:)), studio.stripe?.freigegeben != true {
                    Button {
                        openURL(u)
                    } label: {
                        Label(Texte.Kasse.stripeOeffnen, systemImage: "safari")
                    }
                    .buttonStyle(.zweit)
                }
            }
            .karte()
            .padding(16)
        }
        .refreshable { await portal.laden() }
    }

    private func neuPruefen() {
        prueft = true
        meldung = nil
        Task {
            defer { prueft = false }
            do {
                let s = try await APIClient.shared.kontoStatus()
                await portal.laden()
                if !s.darfKassieren { meldung = Texte.Kasse.nochNichtFrei }
            } catch {
                meldung = fehlerText(error)
            }
        }
    }
}
