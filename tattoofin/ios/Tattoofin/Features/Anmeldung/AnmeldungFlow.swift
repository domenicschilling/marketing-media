import SwiftUI

/// Bildschirme 2 und 3: E-Mail → 6-stelliger Code → (bei mehreren Studios) Auswahl.
/// Neues Studio (R1–R5): „Neues Studio? Konto anlegen“ → E-Mail bestätigen → Code → Studio-Angaben → Bestätigungen → Abo (Apple).
struct AnmeldungFlow: View {
    enum Schritt: Hashable {
        case code(email: String, verzoegert: Bool, modus: CodeView.Modus)
        case auswahl(email: String, studios: [StudioKurz], token: String)
        case registrieren
        case angaben
        case bestaetigungen
        case abo
    }

    @State private var pfad: [Schritt] = []
    @State private var reg = RegistrierungModell()

    var body: some View {
        NavigationStack(path: $pfad) {
            EmailView(weiter: { email, verzoegert in
                pfad.append(.code(email: email, verzoegert: verzoegert, modus: .anmelden))
            }, neuesStudio: {
                reg.entwurfNeuLesen()
                pfad.append(reg.entwurf != nil ? .abo : .registrieren)
            })
            .navigationDestination(for: Schritt.self) { s in
                ziel(s)
            }
        }
        .environment(reg)
    }

    @ViewBuilder
    private func ziel(_ s: Schritt) -> some View {
        switch s {
        case let .code(email, verzoegert, modus):
            CodeView(email: email, verzoegert: verzoegert, modus: modus, auswahlNoetig: { studios, token in
                pfad.append(.auswahl(email: email, studios: studios, token: token))
            }, registrieren: { a in
                reg.uebernehmen(a, email: email)
                pfad.append(.angaben)
            })
        case let .auswahl(email, studios, token):
            StudioAuswahlView(email: email, studios: studios, auswahlToken: token)
        case .registrieren:
            RegistrierenEmailView(weiter: { email, verzoegert in
                pfad.append(.code(email: email, verzoegert: verzoegert, modus: .registrieren))
            }, wiederhergestellt: wiederhergestellt)
        case .angaben:
            StudioAngabenView { pfad.append(.bestaetigungen) }
        case .bestaetigungen:
            BestaetigungenView(weiter: {
                pfad.append(.abo)
            }, neuAnfangen: neuAnfangen, zurAnmeldung: zurAnmeldung)
        case .abo:
            if let e = reg.entwurf {
                AboView(modus: .neu(e), aktionen: AboView.Aktionen(
                    neuAnfangen: neuAnfangen, zurAnmeldung: zurAnmeldung, wiederhergestellt: wiederhergestellt))
            } else {
                RegistrierenEmailView(weiter: { email, verzoegert in
                    pfad.append(.code(email: email, verzoegert: verzoegert, modus: .registrieren))
                }, wiederhergestellt: wiederhergestellt)
            }
        }
    }

    /// Registrierung/Entwurf abgelaufen: Entwurf löschen, zurück zu R1
    private func neuAnfangen(_ hinweis: String) {
        let email = reg.email
        reg.zuruecksetzen()
        reg.email = email
        reg.registrierHinweis = hinweis
        pfad = [.registrieren]
    }

    /// Adresse hat schon ein Studio: zur Anmeldung, E-Mail vorbelegt
    private func zurAnmeldung(_ hinweis: String) {
        reg.anmeldeHinweis = hinweis
        reg.anmeldeEmail = reg.email.isEmpty ? nil : reg.email
        reg.zuruecksetzen()
        pfad = []
    }

    /// Ergebnis von „Käufe wiederherstellen“ ohne Anmeldung
    private func wiederhergestellt(_ r: WiederherstellenErgebnis) {
        if case .anmelden(let maskiert) = r {
            reg.anmeldeHinweis = Texte.Registrieren.aboGehoertZu(maskiert)
            reg.anmeldeEmail = nil
            reg.entwurfNeuLesen()
            pfad = []
        }
        // .angemeldet: AppState wechselt selbst zur Einrichtung
    }
}

/// Kopf der Anmeldung: Figur + Wortmarke
struct MarkenKopf: View {
    var body: some View {
        VStack(spacing: 10) {
            Image(.figur)
                .resizable()
                .scaledToFit()
                .frame(width: 110, height: 110)
                .padding(10)
                .background(Color.tfGelb, in: Circle())
                .accessibilityHidden(true)
            Image(.wortmarke)
                .resizable()
                .scaledToFit()
                .frame(maxWidth: 220)
                .accessibilityLabel(Texte.Allgemein.logoLabel)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - E-Mail

struct EmailView: View {
    let weiter: (_ email: String, _ verzoegert: Bool) -> Void
    var neuesStudio: () -> Void = {}

    @Environment(AppState.self) private var app
    @Environment(RegistrierungModell.self) private var reg
    @State private var email = EmailView.vorbelegung
    @State private var sendet = false
    @State private var fehler: String?
    @FocusState private var fokus: Bool

    /// Nur im Debug-Build: Startargument -TFTestEmail <adresse> füllt das Feld vor (lokale Tests im Simulator)
    static var vorbelegung: String {
        #if DEBUG
        UserDefaults.standard.string(forKey: "TFTestEmail") ?? ""
        #else
        ""
        #endif
    }

    private var gueltig: Bool {
        let e = email.trimmingCharacters(in: .whitespaces)
        return e.count >= 5 && e.contains("@") && e.contains(".") && !e.contains(" ")
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                MarkenKopf().padding(.top, 24)
                Ueberschrift(Texte.Anmelden.titel)
                Text(Texte.Anmelden.einleitung)
                    .font(.dm(.body))
                    .foregroundStyle(Color.tfLeise)
                    .fixedSize(horizontal: false, vertical: true)

                if let h = app.abmeldeHinweis { HinweisKarte(text: h, symbol: "info.circle.fill") }
                if let h = reg.anmeldeHinweis { HinweisKarte(text: h, symbol: "info.circle.fill") }

                VStack(alignment: .leading, spacing: 6) {
                    Text(Texte.Anmelden.emailLabel).font(.dm(.subheadline, weight: .semibold)).foregroundStyle(Color.tfTinte)
                    TextField(Texte.Anmelden.emailLabel, text: $email, prompt: tfPlatzhalter(Texte.Anmelden.emailPlatzhalter))
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .submitLabel(.send)
                        .focused($fokus)
                        .onSubmit { if gueltig { senden() } }
                        .font(.dm(.body))
                        .padding(14)
                        .background(Color.tfKarte, in: RoundedRectangle(cornerRadius: 14))
                        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.tfLinie, lineWidth: 1.5))
                        .accessibilityIdentifier("anmelden-email")
                }

                if let fehler { FehlerZeile(text: fehler) }

                Button {
                    senden()
                } label: {
                    if sendet { ProgressView().tint(Color.tfBlau) } else { Text(Texte.Anmelden.codeSchicken) }
                }
                .buttonStyle(.haupt)
                .disabled(!gueltig || sendet)

                Text(Texte.Anmelden.keinPasswort)
                    .font(.dm(.footnote))
                    .foregroundStyle(Color.tfLeise)

                // Neues Studio: Konto in der App anlegen (bzw. offene Anmeldung fortsetzen)
                VStack(spacing: 10) {
                    Text(Texte.Registrieren.einstiegFrage)
                        .font(.dm(.body, weight: .semibold))
                        .foregroundStyle(Color.tfTinte)
                    Button(reg.entwurf != nil ? Texte.Registrieren.fortsetzen : Texte.Registrieren.einstieg) {
                        neuesStudio()
                    }
                    .buttonStyle(.zweit)
                    .accessibilityIdentifier("neues-studio")
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 8)

                RechtsFuss()
            }
            .padding(20)
        }
        .scrollDismissesKeyboard(.interactively)
        .tfHintergrund()
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            reg.entwurfNeuLesen()
            if let e = reg.anmeldeEmail { email = e; reg.anmeldeEmail = nil }
        }
        .onChange(of: reg.anmeldeEmail) { _, neu in
            if let neu { email = neu; reg.anmeldeEmail = nil }
        }
    }

    private func senden() {
        let e = email.trimmingCharacters(in: .whitespaces).lowercased()
        sendet = true
        fehler = nil
        Task {
            defer { sendet = false }
            do {
                let a = try await APIClient.shared.codeAnfordern(email: e)
                reg.anmeldeHinweis = nil
                weiter(e, a.verzoegert ?? false)
            } catch {
                fehler = fehlerText(error)
            }
        }
    }
}

// MARK: - Code

struct CodeView: View {
    /// .anmelden: bestehendes Studio · .registrieren: neues Studio (R2), der Server erkennt bekannte Adressen selbst
    enum Modus: Hashable { case anmelden, registrieren }

    let email: String
    let verzoegert: Bool
    var modus: Modus = .anmelden
    let auswahlNoetig: (_ studios: [StudioKurz], _ token: String) -> Void
    var registrieren: (RegistrierenPruefenAntwort) -> Void = { _ in }

    @Environment(AppState.self) private var app
    @State private var code = ""
    @State private var prueft = false
    @State private var fehler: String?
    @State private var restVersuche: Int?
    @State private var neuMoeglichAb = Date.now.addingTimeInterval(60)
    @State private var jetzt = Date.now
    @State private var neuGeschickt = false
    @State private var codeTot = false
    @FocusState private var fokus: Bool

    private var sekundenBisNeu: Int { max(0, Int(neuMoeglichAb.timeIntervalSince(jetzt).rounded(.up))) }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Ueberschrift(Texte.Anmelden.codeTitel)
                Text(modus == .registrieren ? Texte.Registrieren.codeHinweis : Texte.Anmelden.codeHinweis)
                    .font(.dm(.body))
                    .foregroundStyle(Color.tfTinte)
                    .fixedSize(horizontal: false, vertical: true)
                Text(email)
                    .font(.dm(.body, weight: .semibold))
                    .foregroundStyle(Color.tfLeise)
                if verzoegert {
                    HinweisKarte(text: Texte.Anmelden.verzoegert, symbol: "clock.fill")
                }

                CodeFelder(code: $code, fokus: $fokus)
                    .onChange(of: code) { _, neu in
                        if !neu.isEmpty && fehler != nil && !prueft { fehler = nil }
                        if neu.count == 6 && !prueft { pruefen() }
                    }

                if let fehler { FehlerZeile(text: fehler) }
                if let r = restVersuche, !codeTot {
                    Text(Texte.Anmelden.restVersuche(r))
                        .font(.dm(.subheadline))
                        .foregroundStyle(Color.tfLeise)
                }

                Button {
                    pruefen()
                } label: {
                    if prueft { ProgressView().tint(Color.tfBlau) } else {
                        Text(modus == .registrieren ? Texte.Registrieren.codeBestaetigen : Texte.Anmelden.anmelden)
                    }
                }
                .buttonStyle(.haupt)
                .disabled(code.count != 6 || prueft || codeTot)

                Button {
                    neuSchicken()
                } label: {
                    Text(sekundenBisNeu > 0 ? Texte.Anmelden.neuerCodeIn(sekundenBisNeu) : Texte.Anmelden.neuerCode)
                }
                .buttonStyle(.zweit)
                .disabled(sekundenBisNeu > 0)

                if neuGeschickt {
                    Text(Texte.Anmelden.neuGeschickt)
                        .font(.dm(.subheadline))
                        .foregroundStyle(Color.tfGruen)
                }

                RechtsFuss()
            }
            .padding(20)
        }
        .tfHintergrund()
        .navigationTitle(Texte.Anmelden.codeNavTitel)
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { fokus = true }
        .task {
            // Countdown für „Neuen Code schicken“
            while !Task.isCancelled {
                jetzt = .now
                try? await Task.sleep(for: .seconds(1))
            }
        }
    }

    private func pruefen() {
        guard code.count == 6, !prueft else { return }
        prueft = true
        fehler = nil
        Task {
            defer { prueft = false }
            do {
                if modus == .registrieren {
                    try await registrierenPruefen()
                    return
                }
                let a = try await APIClient.shared.anmelden(email: email, code: code, geraet: GeraetInfo.angaben())
                if let token = a.token, let g = a.geraet, let s = a.studio {
                    await app.angemeldet(token: token, geraet: g, studio: s, email: email)
                } else if let liste = a.auswahl, let t = a.auswahlToken, !liste.isEmpty {
                    auswahlNoetig(liste, t)
                } else {
                    fehler = Texte.Fehler.unbekannt
                }
            } catch let e as APIFehler {
                fehler = e.meldung
                restVersuche = e.restVersuche
                if e.code == "code_abgelaufen" || e.code == "code_gesperrt" {
                    codeTot = true
                    neuMoeglichAb = .now
                }
                code = ""
                fokus = true
            } catch {
                fehler = fehlerText(error)
            }
        }
    }

    /// R2 im Modus „registrieren“: je nach Adresse angemeldet, Studio-Auswahl oder weiter zu den Studio-Angaben
    private func registrierenPruefen() async throws {
        let a = try await APIClient.shared.registrierenPruefen(email: email, code: code, geraet: GeraetInfo.angaben())
        switch a.art {
        case "angemeldet":
            guard let token = a.token, let g = a.geraet, let s = a.studio else { fehler = Texte.Fehler.unbekannt; return }
            await app.angemeldet(token: token, geraet: g, studio: s, email: email)
        case "auswahl":
            guard let liste = a.auswahl, let t = a.auswahlToken, !liste.isEmpty else { fehler = Texte.Fehler.unbekannt; return }
            auswahlNoetig(liste, t)
        case "registrieren" where a.registrierToken != nil:
            registrieren(a)
        default:
            fehler = Texte.Fehler.unbekannt
        }
    }

    private func neuSchicken() {
        neuMoeglichAb = Date.now.addingTimeInterval(60)
        fehler = nil
        restVersuche = nil
        Task {
            do {
                if modus == .registrieren {
                    _ = try await APIClient.shared.registrierenCode(email: email)
                } else {
                    _ = try await APIClient.shared.codeAnfordern(email: email)
                }
                neuGeschickt = true
                codeTot = false
                code = ""
                fokus = true
            } catch {
                fehler = fehlerText(error)
            }
        }
    }
}

/// Sechs Ziffernkästchen über einem unsichtbaren Feld (.oneTimeCode, damit iOS den Code aus der Mail vorschlägt)
struct CodeFelder: View {
    @Binding var code: String
    var fokus: FocusState<Bool>.Binding

    var body: some View {
        ZStack {
            TextField("", text: $code)
                .textContentType(.oneTimeCode)
                .keyboardType(.numberPad)
                .focused(fokus)
                .foregroundStyle(.clear)
                .tint(.clear)
                .frame(height: 1)
                .opacity(0.02)
                .accessibilityLabel(Texte.Anmelden.codeLabel)
                .accessibilityValue(code.map(String.init).joined(separator: " "))
                .onChange(of: code) { _, neu in
                    let nur = String(neu.filter(\.isNumber).prefix(6))
                    if nur != neu { code = nur }
                }

            HStack(spacing: 8) {
                ForEach(0..<6, id: \.self) { i in
                    let zeichen = i < code.count ? String(code[code.index(code.startIndex, offsetBy: i)]) : ""
                    Text(zeichen)
                        .font(.dm(28, relativeTo: .title, weight: .bold))
                        .foregroundStyle(Color.tfTinte)
                        .frame(maxWidth: .infinity, minHeight: 58)
                        .background(Color.tfKarte, in: RoundedRectangle(cornerRadius: 12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(i == code.count && fokus.wrappedValue ? Color.tfAkzent : Color.tfLinie,
                                        lineWidth: i == code.count && fokus.wrappedValue ? 2.5 : 1.5)
                        )
                }
            }
            .accessibilityHidden(true)
            .contentShape(Rectangle())
            .onTapGesture { fokus.wrappedValue = true }
        }
    }
}

// MARK: - Studio-Auswahl

struct StudioAuswahlView: View {
    let email: String
    let studios: [StudioKurz]
    let auswahlToken: String

    @Environment(AppState.self) private var app
    @State private var laedt: String?
    @State private var fehler: String?

    var body: some View {
        TFListe {
            Section {
                ForEach(studios) { s in
                    Button {
                        waehlen(s)
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(s.firma ?? s.id).font(.dm(.body, weight: .semibold)).foregroundStyle(Color.tfTinte)
                                if let ort = s.ort { Text(ort).font(.dm(.subheadline)).foregroundStyle(Color.tfLeise) }
                            }
                            Spacer()
                            if laedt == s.id { ProgressView() } else { Image(systemName: "chevron.right").foregroundStyle(Color.tfLeise) }
                        }
                        .frame(minHeight: 44)
                    }
                    .disabled(laedt != nil)
                }
            } header: {
                Text(Texte.Anmelden.auswahlHinweis).font(.dm(.subheadline)).foregroundStyle(Color.tfLeise).textCase(nil)
            } footer: {
                if let fehler { FehlerZeile(text: fehler) }
            }
        }
        .scrollContentBackground(.hidden)
        .tfHintergrund()
        .navigationTitle(Texte.Anmelden.auswahlTitel)
    }

    private func waehlen(_ s: StudioKurz) {
        laedt = s.id
        fehler = nil
        Task {
            defer { laedt = nil }
            do {
                let a = try await APIClient.shared.anmelden(auswahlToken: auswahlToken, studioId: s.id, geraet: GeraetInfo.angaben())
                if let token = a.token, let g = a.geraet {
                    await app.angemeldet(token: token, geraet: g, studio: a.studio ?? s, email: email)
                } else {
                    fehler = Texte.Fehler.unbekannt
                }
            } catch {
                fehler = fehlerText(error)
            }
        }
    }
}
