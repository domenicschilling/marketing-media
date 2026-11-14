import Foundation
import Observation
import StoreKit

/// Was mit einer Transaktion aus Transaction.updates passiert (Spezifikation Abschnitt 3, „Hintergrund-Kauf-Abgleich“)
enum AboZuordnung: Equatable, Sendable {
    /// Offene Anmeldung mit derselben appAccountToken → Kauf am Server bestätigen (Konto anlegen)
    case entwurfBestaetigen
    /// Angemeldeter Inhaber eines Apple-Studios mit beendetem Abo und passender appAccountToken → neu abschließen
    case erneuern
    /// Angemeldet, Studio zahlt über Apple → Stand an den Server
    case aktualisieren
    /// Sonst nur abschließen (der Server erfährt es über die App-Store-Benachrichtigung)
    case nurAbschliessen
}

/// Reaktion auf die Antwort des Servers nach einem Kauf
enum KaufReaktion: Equatable, Sendable {
    case erfolg
    /// Netz, 5xx, 429: Transaktion offen lassen, gleichen JWS erneut senden
    case nochmal(String)
    /// abo_vergeben, produkt, familie: Transaktion abschließen (sonst kommt sie endlos wieder), Text zeigen
    case abschliessen(String)
    /// entwurf_abgelaufen: Entwurf löschen, neu anfangen
    case neuAnfangen(String)
    /// schon_aktiv: zur Anmeldung, E-Mail vorbelegt
    case zurAnmeldung(String)
    /// anderer 4xx: Text zeigen, Transaktion nicht abschließen
    case text(String)
}

enum WiederherstellenErgebnis: Equatable, Sendable {
    /// Neues Konto bestätigt und angemeldet (Entwurf passte zur Transaktion)
    case angemeldet
    /// Abo gehört zu einem Studio: mit dieser (maskierten) Adresse anmelden
    case anmelden(String)
    /// Angemeldet: Stand des Abos aktualisiert
    case aktualisiert
    case keinAbo
    /// Anmeldung beim App Store abgebrochen
    case abgebrochen
    case fehler(String)
}

/// StoreKit 2: Produkt laden, Transaction.updates ab App-Start beobachten, Käufe bestätigen, wiederherstellen, Abgleich.
@MainActor
@Observable
final class AboManager {
    static let shared = AboManager()

    var produkt: Product?
    var produktLaedt = false
    var produktFehler = false

    @ObservationIgnored private var updatesTask: Task<Void, Never>?
    /// Transaktionen, die gerade bearbeitet werden (Kauf-Bildschirm und Transaction.updates gleichzeitig)
    @ObservationIgnored private var inArbeit: Set<UInt64> = []

    private init() {}

    // MARK: Produkt

    func produktLaden() async {
        guard !produktLaedt else { return }
        produktLaedt = true
        defer { produktLaedt = false }
        do {
            let liste = try await Product.products(for: [AboKonstanten.produktId])
            produkt = liste.first { $0.id == AboKonstanten.produktId && $0.type == .autoRenewable }
            produktFehler = produkt == nil
            if produkt == nil { log.error("Abo: Produkt nicht gefunden") }
        } catch {
            log.error("Abo: Produkt lädt nicht: \(error.localizedDescription, privacy: .public)")
            produktFehler = true
        }
    }

    // MARK: Transaction.updates (Pflicht laut Apple, ab App-Start)

    func beobachten() {
        guard updatesTask == nil else { return }
        updatesTask = Task { [weak self] in
            for await ergebnis in Transaction.updates {
                await self?.update(ergebnis)
            }
        }
    }

    /// Zuordnung ohne Seiteneffekte (testbar)
    nonisolated static func zuordnung(appAccountToken: UUID?, produktId: String, entwurf: RegistrierungEntwurf?,
                          studio: Studio?, istInhaber: Bool) -> AboZuordnung {
        guard produktId == AboKonstanten.produktId else { return .nurAbschliessen }
        if let e = entwurf, let token = appAccountToken, e.uuid == token { return .entwurfBestaetigen }
        if let s = studio, s.istApple {
            if istInhaber, s.apple?.istBeendet == true, let token = appAccountToken, s.apple?.uuid == token { return .erneuern }
            return .aktualisieren
        }
        return .nurAbschliessen
    }

    private func update(_ ergebnis: VerificationResult<Transaction>) async {
        guard case .verified(let tx) = ergebnis else {
            log.error("Abo: unbestätigte Transaktion aus Transaction.updates")
            return
        }
        guard tx.productID == AboKonstanten.produktId else {
            await tx.finish()
            return
        }
        // Erst warten, bis die App ihren Zustand kennt (Anmeldung aus dem Schlüsselbund)
        let app = AppState.shared
        for _ in 0..<50 where app.phase == .start { try? await Task.sleep(for: .milliseconds(100)) }
        if app.sitzung != nil && app.portal.studio == nil { await app.portal.laden() }

        let art = Self.zuordnung(appAccountToken: tx.appAccountToken, produktId: tx.productID,
                                 entwurf: RegistrierungSpeicher.lesen(),
                                 studio: app.sitzung != nil ? app.portal.studio : nil,
                                 istInhaber: app.sitzung?.istInhaber ?? false)
        log.info("Abo: Transaktion \(tx.id, privacy: .public) aus updates → \(String(describing: art), privacy: .public)")
        switch art {
        case .entwurfBestaetigen:
            if let e = RegistrierungSpeicher.lesen() {
                _ = await entwurfBestaetigen(tx: tx, jws: ergebnis.jwsRepresentation, entwurf: e)
            }
        case .erneuern:
            _ = await erneuern(tx: tx, jws: ergebnis.jwsRepresentation)
        case .aktualisieren:
            await aktualisieren(jws: ergebnis.jwsRepresentation)
            await tx.finish()
        case .nurAbschliessen:
            await tx.finish()
        }
    }

    // MARK: Kauf am Server bestätigen

    nonisolated static func reaktion(auf fehler: Error) -> KaufReaktion {
        guard let a = fehler as? APIFehler else { return .nochmal(Texte.Abo.nichtBestaetigt) }
        if a.status == 0 || a.status >= 500 { return .nochmal(Texte.Abo.nichtBestaetigt) }
        switch a.code {
        case "zu_viele": return .nochmal(a.meldung)
        case "abo_vergeben", "produkt", "familie": return .abschliessen(a.meldung)
        case "entwurf_abgelaufen": return .neuAnfangen(a.meldung)
        case "schon_aktiv": return .zurAnmeldung(a.meldung)
        default: return .text(a.meldung)
        }
    }

    /// Neues Studio: Kauf bestätigen → Konto angelegt → angemeldet
    func entwurfBestaetigen(tx: Transaction, jws: String, entwurf: RegistrierungEntwurf) async -> KaufReaktion {
        guard inArbeit.insert(tx.id).inserted else { return .nochmal(Texte.Abo.nichtBestaetigt) }
        defer { inArbeit.remove(tx.id) }
        do {
            let a = try await APIClient.shared.aboBestaetigen(entwurfToken: entwurf.entwurfToken, signedTransaction: jws,
                                                              geraet: GeraetInfo.angaben())
            guard let token = a.token, let g = a.geraet, let s = a.studio else { return .nochmal(Texte.Abo.nichtBestaetigt) }
            await tx.finish()
            RegistrierungSpeicher.loeschen()
            await AppState.shared.angemeldet(token: token, geraet: g, studio: s, email: entwurf.email)
            return .erfolg
        } catch {
            return await nachFehler(error, tx: tx, entwurf: true)
        }
    }

    /// Angemeldeter Inhaber: abgelaufenes Abo neu abgeschlossen (Bearer)
    func erneuern(tx: Transaction, jws: String) async -> KaufReaktion {
        guard inArbeit.insert(tx.id).inserted else { return .nochmal(Texte.Abo.nichtBestaetigt) }
        defer { inArbeit.remove(tx.id) }
        do {
            _ = try await APIClient.shared.aboErneuern(signedTransaction: jws)
            await tx.finish()
            Einstellungen.aboAbgleichAm = .now
            await AppState.shared.portal.laden()
            return .erfolg
        } catch {
            return await nachFehler(error, tx: tx, entwurf: false)
        }
    }

    private func nachFehler(_ fehler: Error, tx: Transaction, entwurf: Bool) async -> KaufReaktion {
        let r = Self.reaktion(auf: fehler)
        log.error("Abo: Bestätigung fehlgeschlagen: \(fehlerText(fehler), privacy: .public)")
        switch r {
        case .abschliessen: await tx.finish()
        case .neuAnfangen: if entwurf { RegistrierungSpeicher.loeschen() }
        case .zurAnmeldung: if entwurf { RegistrierungSpeicher.loeschen() }
        default: break
        }
        return r
    }

    private func aktualisieren(jws: String) async {
        do {
            let a = try await APIClient.shared.aboAktualisieren(signedTransaction: jws)
            Einstellungen.aboAbgleichAm = .now
            if a.abo != AppState.shared.portal.studio?.apple { await AppState.shared.portal.laden() }
        } catch {
            log.error("Abo: Abgleich fehlgeschlagen: \(fehlerText(error), privacy: .public)")
        }
    }

    // MARK: Wiederherstellen

    /// Alle aktuellen, bestätigten Transaktionen unseres Abos, neueste zuerst
    func aktuelleTransaktionen() async -> [(tx: Transaction, jws: String)] {
        var liste: [(tx: Transaction, jws: String)] = []
        for await r in Transaction.currentEntitlements {
            if case .verified(let tx) = r, tx.productID == AboKonstanten.produktId {
                liste.append((tx, r.jwsRepresentation))
            }
        }
        return liste.sorted { $0.tx.purchaseDate > $1.tx.purchaseDate }
    }

    /// „Käufe wiederherstellen“: AppStore.sync, dann je nach Lage bestätigen, aktualisieren oder dem Server zeigen
    func wiederherstellen(entwurf: RegistrierungEntwurf?, angemeldet: Bool) async -> WiederherstellenErgebnis {
        do {
            try await AppStore.sync()
        } catch StoreKitError.userCancelled {
            return .abgebrochen
        } catch {
            log.error("Abo: AppStore.sync: \(error.localizedDescription, privacy: .public)")
        }
        let liste = await aktuelleTransaktionen()
        guard !liste.isEmpty else { return .keinAbo }

        if angemeldet {
            let app = AppState.shared
            let studio = app.portal.studio
            for (tx, jws) in liste {
                let art = Self.zuordnung(appAccountToken: tx.appAccountToken, produktId: tx.productID, entwurf: nil,
                                         studio: studio, istInhaber: app.sitzung?.istInhaber ?? false)
                if art == .erneuern {
                    let r = await erneuern(tx: tx, jws: jws)
                    if r == .erfolg { return .aktualisiert }
                    return .fehler(Self.text(r))
                }
            }
            if studio?.istApple == true, let neueste = liste.first {
                await aktualisieren(jws: neueste.jws)
                await app.portal.laden()
                return .aktualisiert
            }
            return .keinAbo
        }

        // Offene Anmeldung auf diesem Gerät: direkt bestätigen und anmelden
        if let e = entwurf, let passend = liste.first(where: { $0.tx.appAccountToken == e.uuid }) {
            let r = await entwurfBestaetigen(tx: passend.tx, jws: passend.jws, entwurf: e)
            return r == .erfolg ? .angemeldet : .fehler(Self.text(r))
        }
        do {
            let a = try await APIClient.shared.aboWiederherstellen(signedTransactions: liste.map(\.jws))
            if a.art == "anmelden", let m = a.emailMaskiert { return .anmelden(m) }
            return .keinAbo
        } catch let f as APIFehler where f.code == "kein_konto" {
            return .fehler(f.meldung)
        } catch {
            return .fehler(fehlerText(error))
        }
    }

    nonisolated static func text(_ r: KaufReaktion) -> String {
        switch r {
        case .erfolg: ""
        case .nochmal(let t), .abschliessen(let t), .neuAnfangen(let t), .zurAnmeldung(let t), .text(let t): t
        }
    }

    // MARK: Abgleich beim Start (höchstens alle 6 Stunden)

    func abgleichWennNoetig(studio: Studio?, jetzt: Date = .now) async {
        guard let s = studio, s.istApple, !s.istDemo else { return }
        if let letzter = Einstellungen.aboAbgleichAm, jetzt.timeIntervalSince(letzter) < 6 * 3600 { return }
        Einstellungen.aboAbgleichAm = jetzt
        guard let neueste = await aktuelleTransaktionen().first else { return }
        await aktualisieren(jws: neueste.jws)
    }
}
