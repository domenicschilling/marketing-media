import StoreKit
import SwiftUI

/// R5: Abo-Bildschirm nach Apple 3.1.2. Preis nur aus dem App Store (product.displayPrice), Zeitraum, automatische
/// Verlängerung, Kündigung, Links zu Vertrag, Datenschutz und Apple-EULA, „Käufe wiederherstellen“.
/// Kein Web-Preis, kein Hinweis auf einen anderen Kaufweg (Apple 3.1.3).
/// Gratis-Zeitraum (Einführungsangebot) nur, wenn der Apple-Account berechtigt ist; der Monatspreis bleibt die größte Preisangabe.
struct AboView: View {
    enum Modus: Hashable {
        /// Neues Studio mit offenem Entwurf
        case neu(RegistrierungEntwurf)
        /// Angemeldeter Inhaber, Apple-Abo beendet
        case erneuern
    }

    struct Aktionen {
        var neuAnfangen: (String) -> Void = { _ in }
        var zurAnmeldung: (String) -> Void = { _ in }
        var wiederhergestellt: (WiederherstellenErgebnis) -> Void = { _ in }
        var fertig: () -> Void = {}
    }

    let modus: Modus
    var aktionen = Aktionen()

    @Environment(PortalStore.self) private var portal
    @Environment(\.purchase) private var purchase
    @Environment(\.openURL) private var openURL
    @State private var kauft = false
    @State private var stelltHer = false
    @State private var wartet = false
    @State private var fehler: String?
    @State private var hinweis: String?
    @State private var offenerKauf: OffenerKauf?
    @State private var seite: Rechtsseite?
    /// Gratis-Zeitraum, falls Einführungsangebot „kostenlos“ und der Apple-Account berechtigt ist (sonst nil)
    @State private var gratis: String?

    /// Kauf ist bei Apple durch, der Server hat ihn noch nicht bestätigt (gleicher JWS wird erneut gesendet)
    private struct OffenerKauf {
        let tx: StoreKit.Transaction
        let jws: String
    }

    private var abo: AboManager { AboManager.shared }

    private var kaufUUID: UUID? {
        switch modus {
        case .neu(let e): e.uuid
        case .erneuern: portal.studio?.apple?.uuid
        }
    }

    private var erneuern: Bool { modus == .erneuern }

    var body: some View {
        Group {
            if let p = abo.produkt {
                inhalt(p)
            } else if abo.produktFehler && !abo.produktLaedt {
                FehlerAnsicht(text: Texte.Abo.ladeFehler) { Task { await abo.produktLaden() } }
            } else {
                LadeAnsicht()
            }
        }
        .tfHintergrund()
        .navigationTitle(erneuern ? Texte.Abo.erneuernTitel : Texte.Registrieren.navTitel)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            if abo.produkt == nil { await abo.produktLaden() }
            if let p = abo.produkt { gratis = await Self.gratisDauer(p) }
        }
        .sheet(item: $seite) { RechtsAnsicht(seite: $0) }
        .onChange(of: portal.studio?.apple?.istBeendet) { _, beendet in
            // Kauf kam über Transaction.updates (z. B. nach „wartet auf Bestätigung“)
            if erneuern && beendet == false { aktionen.fertig() }
        }
    }

    private func inhalt(_ p: Product) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                kopf(p)
                preis(p)
                leistungen

                if wartet { HinweisKarte(text: Texte.Abo.wartet, symbol: "clock.fill") }
                if let hinweis { HinweisKarte(text: hinweis, symbol: "info.circle.fill") }
                if let fehler { FehlerZeile(text: fehler) }

                Button {
                    if let o = offenerKauf { Task { await bestaetigen(tx: o.tx, jws: o.jws) } } else { kaufen(p) }
                } label: {
                    if kauft { ProgressView().tint(Color.tfBlau) } else {
                        Text(offenerKauf != nil ? Texte.Allgemein.nochmal : gratis.map(Texte.Abo.kaufenGratis) ?? Texte.Abo.kaufen)
                    }
                }
                .buttonStyle(.haupt)
                .disabled(kauft || stelltHer || kaufUUID == nil)
                .accessibilityIdentifier("abo-kaufen")

                Text(gratis.map { Texte.Abo.kleingedrucktGratis($0, preis: p.displayPrice) } ?? Texte.Abo.kleingedruckt)
                    .accessibilityIdentifier("abo-kleingedruckt")
                    .font(.dm(.footnote))
                    .foregroundStyle(Color.tfLeise)
                    .fixedSize(horizontal: false, vertical: true)

                VStack(alignment: .leading, spacing: 2) {
                    linkKnopf(Texte.Abo.vertragLink, symbol: "signature") { seite = .vertrag }
                    linkKnopf(Texte.Abo.datenschutzLink, symbol: "hand.raised") { seite = .datenschutz }
                    linkKnopf(Texte.Abo.eulaLink, symbol: "safari") { openURL(AboKonstanten.eulaURL) }
                }

                Button {
                    wiederherstellen()
                } label: {
                    if stelltHer { ProgressView() } else { Text(Texte.Abo.wiederherstellen) }
                }
                .buttonStyle(.zweit)
                .disabled(kauft || stelltHer)
                .accessibilityIdentifier("abo-wiederherstellen")
            }
            .padding(20)
        }
    }

    private func kopf(_ p: Product) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Image(.figur)
                .resizable()
                .scaledToFit()
                .frame(width: 76, height: 76)
                .padding(8)
                .background(Color.tfGelb, in: Circle())
                .accessibilityHidden(true)
            Ueberschrift(p.displayName.isEmpty ? Texte.Abo.titel : p.displayName)
            Text(zeitraum(p))
                .font(.dm(.body, weight: .semibold))
                .foregroundStyle(Color.tfLeise)
        }
    }

    private func preis(_ p: Product) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            if let g = gratis {
                Text(Texte.Abo.gratisAbzeichen(g))
                    .font(.dm(.subheadline, weight: .bold))
                    .foregroundStyle(Color.tfTinte)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Color.tfGelb, in: Capsule())
                    .padding(.bottom, 4)
            }
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(p.displayPrice)
                    .font(.luckiest(40, relativeTo: .largeTitle))
                    .foregroundStyle(Color.tfTinte)
                    .minimumScaleFactor(0.6)
                    .lineLimit(1)
                Text(Texte.Abo.proMonat)
                    .font(.dm(.title3, weight: .semibold))
                    .foregroundStyle(Color.tfTinte)
            }
            Text(gratis.map { "\(Texte.Abo.inklMwSt) · \(Texte.Abo.danach($0))" } ?? Texte.Abo.inklMwSt)
                .font(.dm(.subheadline))
                .foregroundStyle(Color.tfLeise)
                .fixedSize(horizontal: false, vertical: true)
        }
        .karte()
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(gratis.map { "\(Texte.Abo.gratisAbzeichen($0)). Danach \(p.displayPrice) \(Texte.Abo.proMonat), \(Texte.Abo.inklMwSt)" }
            ?? "\(p.displayPrice) \(Texte.Abo.proMonat), \(Texte.Abo.inklMwSt)")
        .accessibilityIdentifier("abo-preis")
    }

    private var leistungen: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(Texte.Abo.leistungenLabel)
                .font(.dm(.headline, weight: .bold))
                .foregroundStyle(Color.tfTinte)
                .accessibilityAddTraits(.isHeader)
            ForEach(Texte.Abo.leistungen, id: \.self) { l in
                HStack(alignment: .top, spacing: 10) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(Color.tfGruen)
                        .accessibilityHidden(true)
                    Text(l)
                        .font(.dm(.body))
                        .foregroundStyle(Color.tfTinte)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .accessibilityElement(children: .combine)
            }
        }
        .karte()
    }

    private func linkKnopf(_ titel: String, symbol: String, aktion: @escaping () -> Void) -> some View {
        Button(action: aktion) {
            Label(titel, systemImage: symbol)
                .font(.dm(.subheadline, weight: .semibold))
                .frame(minHeight: 44, alignment: .leading)
        }
        .foregroundStyle(Color.tfAkzent)
        .buttonStyle(.plain)
    }

    private func zeitraum(_ p: Product) -> String {
        guard let z = p.subscription?.subscriptionPeriod else { return Texte.Abo.zeitraum(1) }
        let monate = switch z.unit {
        case .year: z.value * 12
        case .month: z.value
        default: 1
        }
        return Texte.Abo.zeitraum(monate)
    }

    /// Gratis-Zeitraum des Einführungsangebots, nur wenn kostenlos und der Apple-Account berechtigt ist
    static func gratisDauer(_ p: Product) async -> String? {
        guard let sub = p.subscription, let offer = sub.introductoryOffer, offer.paymentMode == .freeTrial,
              await sub.isEligibleForIntroOffer else { return nil }
        let z = offer.period
        let n = z.value * max(offer.periodCount, 1)
        return switch z.unit {
        case .day: Texte.Abo.gratisDauer(tage: n, monate: nil)
        case .week: Texte.Abo.gratisDauer(tage: n * 7, monate: nil)
        case .month: Texte.Abo.gratisDauer(tage: nil, monate: n)
        case .year: Texte.Abo.gratisDauer(tage: nil, monate: n * 12)
        @unknown default: nil
        }
    }

    // MARK: Kauf

    private func kaufen(_ p: Product) {
        guard let uuid = kaufUUID else { fehler = Texte.Fehler.unbekannt; return }
        kauft = true
        fehler = nil
        hinweis = nil
        Task {
            defer { kauft = false }
            do {
                let r = try await purchase(p, options: [.appAccountToken(uuid)])
                switch r {
                case .success(let v):
                    switch v {
                    case .verified(let tx):
                        wartet = false
                        await bestaetigen(tx: tx, jws: v.jwsRepresentation)
                    case .unverified:
                        fehler = Texte.Abo.unverifiziert
                    }
                case .pending:
                    wartet = true
                case .userCancelled:
                    break
                @unknown default:
                    break
                }
            } catch {
                log.error("Abo: Kauf fehlgeschlagen: \(error.localizedDescription, privacy: .public)")
                fehler = error.localizedDescription
            }
        }
    }

    private func bestaetigen(tx: StoreKit.Transaction, jws: String) async {
        kauft = true
        defer { kauft = false }
        fehler = nil
        let r: KaufReaktion = switch modus {
        case .neu(let e): await abo.entwurfBestaetigen(tx: tx, jws: jws, entwurf: e)
        case .erneuern: await abo.erneuern(tx: tx, jws: jws)
        }
        offenerKauf = nil
        switch r {
        case .erfolg:
            // Neu: AppState wechselt zur Einrichtung. Erneuern: Kasse ist wieder offen.
            if erneuern { aktionen.fertig() }
        case .nochmal(let t):
            offenerKauf = OffenerKauf(tx: tx, jws: jws)
            fehler = t
        case .abschliessen(let t), .text(let t):
            fehler = t
        case .neuAnfangen(let t):
            aktionen.neuAnfangen(t)
        case .zurAnmeldung(let t):
            aktionen.zurAnmeldung(t)
        }
    }

    private func wiederherstellen() {
        stelltHer = true
        fehler = nil
        hinweis = nil
        let entwurf: RegistrierungEntwurf? = if case .neu(let e) = modus { e } else { nil }
        Task {
            defer { stelltHer = false }
            let r = await abo.wiederherstellen(entwurf: entwurf, angemeldet: erneuern)
            switch r {
            case .keinAbo: hinweis = Texte.Registrieren.keinAboGefunden
            case .fehler(let t): fehler = t
            case .abgebrochen: break
            case .aktualisiert:
                if portal.studio?.apple?.istBeendet == false { aktionen.fertig() } else { hinweis = Texte.Abo.wiederhergestellt }
            case .angemeldet, .anmelden:
                aktionen.wiederhergestellt(r)
            }
        }
    }
}

/// „Abo wieder abschließen“ (Kasse und Konto) als Sheet für den angemeldeten Inhaber
struct AboErneuernSheet: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            AboView(modus: .erneuern, aktionen: AboView.Aktionen(fertig: { dismiss() }))
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button(Texte.Allgemein.abbrechen) { dismiss() }.font(.dm(.body))
                    }
                }
        }
    }
}
