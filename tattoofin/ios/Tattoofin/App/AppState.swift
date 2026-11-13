import SwiftUI
import Observation

enum HauptTab: Hashable {
    case kasse, zahlungen, gutscheine, konto
}

/// Sprungziel aus einer Push-Mitteilung
enum Sprungziel: Equatable {
    case zahlung(String)
    case auszahlungen
}

/// Zentraler Zustand der App: Anmeldung, Tabs, Sprungziele, Portal-Daten.
@MainActor
@Observable
final class AppState {
    static let shared = AppState()

    enum Phase: Equatable {
        case start, anmeldung, einrichtung, bereit
    }

    var phase: Phase = .start
    var tab: HauptTab = .kasse
    var sprungziel: Sprungziel?
    /// Wird bei jeder Zahlungs-Mitteilung hochgezählt (offenes Zahlungslink-Sheet lädt dann sofort neu)
    var pushZahlung: (id: String, zaehler: Int)?
    var sitzung: SitzungInfo?
    /// Kurze Meldung nach dem automatischen Abmelden
    var abmeldeHinweis: String?

    let portal = PortalStore()
    let sperre = SperreManager()

    private init() {}

    /// Beim Start: Schlüsselbund aufräumen (Neuinstallation), Token laden, Sperre prüfen.
    func starten() async {
        Einstellungen.ersterStartAufraeumen()
        guard let token = KeychainStore.lesen(), let info = Einstellungen.sitzung else {
            KeychainStore.loeschen()
            phase = .anmeldung
            return
        }
        await APIClient.shared.setzeToken(token)
        sitzung = info
        portal.cacheLaden()
        sperre.beimStart()
        phase = Einstellungen.einrichtungFertig ? .bereit : .einrichtung
        if Einstellungen.einrichtungFertig { PushManager.shared.beiStartRegistrieren() }
    }

    /// Nach erfolgreicher Anmeldung
    func angemeldet(token: String, geraet: Geraet, studio: StudioKurz, email: String) async {
        KeychainStore.speichern(token)
        await APIClient.shared.setzeToken(token)
        let info = SitzungInfo(geraetId: geraet.id, rolle: geraet.rolle ?? "inhaber", studioId: studio.id,
                               firma: studio.firma ?? "", email: email)
        Einstellungen.sitzung = info
        sitzung = info
        abmeldeHinweis = nil
        sperre.entsperrt()
        tab = .kasse
        phase = Einstellungen.einrichtungFertig ? .bereit : .einrichtung
    }

    func einrichtungFertig() {
        Einstellungen.einrichtungFertig = true
        phase = .bereit
    }

    /// Dieses Gerät abmelden (Server) und lokal alles löschen
    func abmelden() async {
        try? await APIClient.shared.abmelden()
        await lokalAbmelden()
    }

    /// Token, Zwischenspeicher und Einstellungen löschen
    func lokalAbmelden(hinweis: String? = nil) async {
        KeychainStore.loeschen()
        await APIClient.shared.setzeToken(nil)
        ZahlungenCache.loeschen()
        Einstellungen.abmelden()
        portal.leeren()
        sitzung = nil
        sprungziel = nil
        sperre.entsperrt()
        abmeldeHinweis = hinweis
        tab = .kasse
        phase = .anmeldung
    }

    /// 401 vom Server (Token widerrufen, „auf allen Geräten abmelden“, Adresse entfernt …)
    func sitzungAbgelaufen() {
        guard phase != .anmeldung else { return }
        Task { await lokalAbmelden(hinweis: Texte.Anmelden.abgelaufen) }
    }

    /// Push-Mitteilung angetippt
    func mitteilungGeoeffnet(typ: String?, zahlungId: String?, payoutId: String?) {
        guard sitzung != nil else { return }
        switch typ {
        case "auszahlung":
            tab = .zahlungen
            sprungziel = .auszahlungen
        default:
            if let zahlungId {
                tab = .zahlungen
                sprungziel = .zahlung(zahlungId)
            }
        }
    }

    /// Push-Mitteilung im Vordergrund erhalten
    func mitteilungErhalten(typ: String?, zahlungId: String?) {
        if typ == "zahlung", let zahlungId {
            pushZahlung = (zahlungId, (pushZahlung?.zaehler ?? 0) + 1)
        }
        Task { await portal.laden() }
    }
}

/// Portal-Daten (GET /api/portal), geteilt von allen Tabs
@MainActor
@Observable
final class PortalStore {
    var studio: Studio?
    var zahlungen: [Zahlung] = []
    var kpis: KPIs?
    var config = PortalConfig()
    var laedt = false
    var fehler: String?
    var geladenAm: Date?

    var gutscheine: [Zahlung] { zahlungen.filter(\.istGutschein) }

    func cacheLaden() {
        if zahlungen.isEmpty, let c = ZahlungenCache.laden() { zahlungen = c }
    }

    func laden() async {
        laedt = true
        defer { laedt = false }
        do {
            let a = try await APIClient.shared.portal()
            uebernehmen(a)
            fehler = nil
        } catch is CancellationError {
        } catch {
            fehler = fehlerText(error)
        }
    }

    func uebernehmen(_ a: PortalAntwort) {
        studio = a.studio
        zahlungen = a.zahlungen.sorted { ($0.createdAt ?? "") > ($1.createdAt ?? "") }
        kpis = a.kpis
        if let c = a.config { config = c }
        geladenAm = .now
        ZahlungenCache.speichern(zahlungen)
        if let z = a.studio.zahlseite { Einstellungen.zahlseite = z }
        Einstellungen.studioName = a.studio.name
    }

    /// Einzelne Zahlung in der Liste ersetzen bzw. vorne einfügen
    func aktualisieren(_ z: Zahlung) {
        if let i = zahlungen.firstIndex(where: { $0.id == z.id }) { zahlungen[i] = z } else { zahlungen.insert(z, at: 0) }
        ZahlungenCache.speichern(zahlungen)
    }

    func leeren() {
        studio = nil
        zahlungen = []
        kpis = nil
        config = PortalConfig()
        fehler = nil
        geladenAm = nil
    }
}
