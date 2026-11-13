import SwiftUI

/// Bildschirme 2 und 3: E-Mail → 6-stelliger Code → (bei mehreren Studios) Auswahl
struct AnmeldungFlow: View {
    enum Schritt: Hashable {
        case code(email: String, verzoegert: Bool)
        case auswahl(email: String, studios: [StudioKurz], token: String)
    }

    @State private var pfad: [Schritt] = []

    var body: some View {
        NavigationStack(path: $pfad) {
            EmailView { email, verzoegert in pfad.append(.code(email: email, verzoegert: verzoegert)) }
                .navigationDestination(for: Schritt.self) { s in
                    switch s {
                    case let .code(email, verzoegert):
                        CodeView(email: email, verzoegert: verzoegert) { studios, token in
                            pfad.append(.auswahl(email: email, studios: studios, token: token))
                        }
                    case let .auswahl(email, studios, token):
                        StudioAuswahlView(email: email, studios: studios, auswahlToken: token)
                    }
                }
        }
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

    @Environment(AppState.self) private var app
    @State private var email = EmailView.vorbelegung
    @State private var sendet = false
    @State private var fehler: String?
    @FocusState private var fokus: Bool

    /// Nur im Debug-Build: Startargument -TFTestEmail <adresse> füllt das Feld vor (lokale Tests im Simulator)
    private static var vorbelegung: String {
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

                VStack(alignment: .leading, spacing: 6) {
                    Text(Texte.Anmelden.emailLabel).font(.dm(.subheadline, weight: .semibold)).foregroundStyle(Color.tfTinte)
                    TextField(Texte.Anmelden.emailPlatzhalter, text: $email)
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
            }
            .padding(20)
        }
        .scrollDismissesKeyboard(.interactively)
        .tfHintergrund()
        .navigationBarTitleDisplayMode(.inline)
    }

    private func senden() {
        let e = email.trimmingCharacters(in: .whitespaces).lowercased()
        sendet = true
        fehler = nil
        Task {
            defer { sendet = false }
            do {
                let a = try await APIClient.shared.codeAnfordern(email: e)
                weiter(e, a.verzoegert ?? false)
            } catch {
                fehler = fehlerText(error)
            }
        }
    }
}

// MARK: - Code

struct CodeView: View {
    let email: String
    let verzoegert: Bool
    let auswahlNoetig: (_ studios: [StudioKurz], _ token: String) -> Void

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
                Text(Texte.Anmelden.codeHinweis)
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
                    if prueft { ProgressView().tint(Color.tfBlau) } else { Text(Texte.Anmelden.anmelden) }
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

    private func neuSchicken() {
        neuMoeglichAb = Date.now.addingTimeInterval(60)
        fehler = nil
        restVersuche = nil
        Task {
            do {
                _ = try await APIClient.shared.codeAnfordern(email: email)
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
        List {
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
