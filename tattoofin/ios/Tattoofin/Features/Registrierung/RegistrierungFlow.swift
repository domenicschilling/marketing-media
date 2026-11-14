import SwiftUI

/// Zustand der Anmeldung eines neuen Studios (R1–R5). Die Angaben liegen nur im Speicher, bis sie abgeschickt sind
/// (nicht in UserDefaults). Nach „Weiter zum Abo“ liegt der Entwurf im Schlüsselbund (RegistrierungSpeicher).
@MainActor
@Observable
final class RegistrierungModell {
    var email = ""
    var registrierToken: String?
    var daten = StudioDaten()
    var bestaetigt = Bestaetigungen()
    /// Vom Server gemeldete Fehlerfelder (code "eingabe")
    var serverFelder: Set<StudioFeld> = []
    /// Offene Anmeldung aus dem Schlüsselbund (< 30 Tage)
    var entwurf: RegistrierungEntwurf?
    /// Hinweis und Vorbelegung für den Anmelde-Bildschirm (R0), z. B. nach „Käufe wiederherstellen“
    var anmeldeHinweis: String?
    var anmeldeEmail: String?
    /// Hinweis auf R1 (z. B. „Deine Anmeldung ist abgelaufen“)
    var registrierHinweis: String?

    init() {
        entwurf = RegistrierungSpeicher.lesen()
    }

    func entwurfNeuLesen() { entwurf = RegistrierungSpeicher.lesen() }

    /// Antwort von registrieren/pruefen (art "registrieren") übernehmen
    func uebernehmen(_ a: RegistrierenPruefenAntwort, email: String) {
        registrierToken = a.registrierToken
        self.email = a.email ?? email
        serverFelder = []
        if let e = a.entwurf {
            daten = StudioDaten(entwurf: e)
        }
    }

    /// Alles vergessen (neu anfangen)
    func zuruecksetzen() {
        RegistrierungSpeicher.loeschen()
        entwurf = nil
        registrierToken = nil
        daten = StudioDaten()
        bestaetigt = Bestaetigungen()
        serverFelder = []
    }
}

// MARK: - R1 E-Mail bestätigen

struct RegistrierenEmailView: View {
    let weiter: (_ email: String, _ verzoegert: Bool) -> Void
    let wiederhergestellt: (WiederherstellenErgebnis) -> Void

    @Environment(RegistrierungModell.self) private var reg
    @State private var email = ""
    @State private var sendet = false
    @State private var stelltHer = false
    @State private var fehler: String?
    @State private var hinweis: String?
    @FocusState private var fokus: Bool

    private var bereinigt: String { email.trimmingCharacters(in: .whitespaces).lowercased() }
    private var gueltig: Bool { StudioDaten.emailGueltig(bereinigt) }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                MarkenKopf().padding(.top, 12)
                Ueberschrift(Texte.Registrieren.titel)
                Text(Texte.Registrieren.einleitung)
                    .font(.dm(.body))
                    .foregroundStyle(Color.tfLeise)
                    .fixedSize(horizontal: false, vertical: true)

                if let h = reg.registrierHinweis { HinweisKarte(text: h, symbol: "info.circle.fill") }

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
                        .accessibilityIdentifier("reg-email")
                }

                if let fehler { FehlerZeile(text: fehler) }

                Button {
                    senden()
                } label: {
                    if sendet { ProgressView().tint(Color.tfBlau) } else { Text(Texte.Anmelden.codeSchicken) }
                }
                .buttonStyle(.haupt)
                .disabled(!gueltig || sendet)
                .accessibilityIdentifier("reg-code-schicken")

                Text(Texte.Anmelden.keinPasswort)
                    .font(.dm(.footnote))
                    .foregroundStyle(Color.tfLeise)

                if let hinweis { HinweisKarte(text: hinweis, symbol: "info.circle.fill") }

                Button {
                    wiederherstellen()
                } label: {
                    HStack(spacing: 8) {
                        if stelltHer { ProgressView() }
                        Text(Texte.Registrieren.wiederherstellenLink)
                    }
                    .frame(maxWidth: .infinity, minHeight: 44)
                }
                .font(.dm(.subheadline, weight: .semibold))
                .foregroundStyle(Color.tfAkzent)
                .disabled(stelltHer)

                RechtsFuss()
            }
            .padding(20)
        }
        .scrollDismissesKeyboard(.interactively)
        .tfHintergrund()
        .navigationTitle(Texte.Registrieren.navTitel)
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            if email.isEmpty {
                email = reg.email.isEmpty ? EmailView.vorbelegung : reg.email
            }
        }
    }

    private func senden() {
        let e = bereinigt
        guard StudioDaten.emailGueltig(e) else { fehler = Texte.Registrieren.emailUngueltig; return }
        sendet = true
        fehler = nil
        hinweis = nil
        Task {
            defer { sendet = false }
            do {
                let a = try await APIClient.shared.registrierenCode(email: e)
                reg.email = e
                reg.registrierHinweis = nil
                weiter(e, a.verzoegert ?? false)
            } catch {
                fehler = fehlerText(error)
            }
        }
    }

    private func wiederherstellen() {
        stelltHer = true
        fehler = nil
        hinweis = nil
        Task {
            defer { stelltHer = false }
            let r = await AboManager.shared.wiederherstellen(entwurf: reg.entwurf, angemeldet: false)
            switch r {
            case .keinAbo: hinweis = Texte.Registrieren.keinAboGefunden
            case .fehler(let t): fehler = t
            case .abgebrochen, .aktualisiert: break
            case .angemeldet, .anmelden: wiederhergestellt(r)
            }
        }
    }
}
