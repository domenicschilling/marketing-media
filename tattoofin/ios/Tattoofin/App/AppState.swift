import SwiftUI
import Observation

enum HauptTab: Hashable {
    case kasse, zahlungen, gutscheine, werbung, konto
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
    /// Sprung in einen Abschnitt des Tabs „Werbung“ (z. B. aus der Checkliste: „QR-Code an die Theke“ → Zahlseite)
    var werbungSprung: WerbungAbschnitt?
    /// Wird bei jeder Zahlungs-Mitteilung hochgezählt (offenes Zahlungslink-Sheet lädt dann sofort neu)
    var pushZahlung: (id: String, zaehler: Int)?
    var sitzung: SitzungInfo?
    /// Kurze Meldung nach dem automatischen Abmelden
    var abmeldeHinweis: String?

    // MARK: Studio-Wechsel (seit 1.2, 23.11.2026)
    /// Studios der angemeldeten Adresse (GET /api/app/studios; ohne Netz die zuletzt geladene Liste)
    var studios: [StudioEintrag] = []
    /// Anmeldungen je Studio auf diesem Gerät (Schlüsselbund „app-zugaenge“). Das aktive Token liegt zusätzlich unter „app-token“.
    private(set) var zugaenge: [StudioZugang] = []
    /// Ein Wechsel läuft (Liste gesperrt, Lade-Anzeige)
    var wechseltGerade = false
    /// Meldung nach einem automatischen Wechsel (Zugang zu einem Studio entfernt, nur dieses Studio abgemeldet …)
    var wechselHinweis: String?
    /// „Studio wechseln“ zeigen: nur bei mehr als einem Studio
    var mehrereStudios: Bool { studios.count > 1 }

    let portal = PortalStore()
    let sperre = SperreManager()

    private init() {}

    /// Beim Start: Schlüsselbund aufräumen (Neuinstallation), Token laden, Sperre prüfen.
    func starten() async {
        Einstellungen.ersterStartAufraeumen()
        #if DEBUG
        // Nur Debug (UI-Tests): Startargument -TFZuruecksetzen YES beginnt ohne Anmeldung und ohne offene Registrierung
        if UserDefaults.standard.bool(forKey: "TFZuruecksetzen") {
            KeychainStore.loeschen()
            KeychainStore.zugaengeLoeschen()
            ZahlungenCache.alleLoeschen()
            RegistrierungSpeicher.loeschen()
            Einstellungen.abmelden()
        }
        #endif
        guard let token = KeychainStore.lesen(), let info = Einstellungen.sitzung else {
            KeychainStore.loeschen()
            KeychainStore.zugaengeLoeschen()
            phase = .anmeldung
            return
        }
        await APIClient.shared.setzeToken(token)
        sitzung = info
        // Zugänge laden (nur dieselbe Adresse). Von 1.0/1.1 kommend: bisherige Anmeldung wird der erste Zugang.
        zugaenge = KeychainStore.zugaengeLesen().filter { $0.email == info.email }
        zugangMerken(StudioZugang(studioId: info.studioId, firma: info.firma, ort: "", rolle: info.rolle,
                                  geraetId: info.geraetId, email: info.email, token: token))
        studios = Einstellungen.studios
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
        // Neue Anmeldung: nur Zugänge derselben Adresse behalten; die Studio-Liste lädt die Hauptansicht neu
        zugaenge = zugaenge.filter { $0.email == email }
        zugangMerken(StudioZugang(studioId: studio.id, firma: studio.firma ?? "", ort: studio.ort ?? "", rolle: info.rolle,
                                  geraetId: geraet.id, email: email, token: token))
        StudioAbmeldungen.entfernen(studio.id)
        studios = []
        Einstellungen.studios = []
        abmeldeHinweis = nil
        sperre.entsperrt()
        tab = .kasse
        phase = Einstellungen.einrichtungFertig ? .bereit : .einrichtung
    }

    func einrichtungFertig() {
        Einstellungen.einrichtungFertig = true
        phase = .bereit
    }

    /// Abmelden. alle = true (Standard): dieses Gerät in allen Studios abmelden und lokal alles löschen.
    /// alle = false (nur mit mehreren Studios): nur im aktuellen Studio abmelden und ins nächste Studio wechseln.
    func abmelden(alle: Bool = true) async {
        guard let s = sitzung else { await lokalAbmelden(); return }
        if alle || !zugaenge.contains(where: { $0.studioId != s.studioId }) {
            for z in zugaenge where z.studioId != s.studioId {
                try? await APIClient.shared.abmelden(mitToken: z.token)  // ds-ok: Abmelden klappt lokal immer, Server-Abmeldung ist nur Aufräumen
            }
            try? await APIClient.shared.abmelden()  // ds-ok: Abmelden klappt lokal immer, Server-Abmeldung ist nur Aufräumen
            await lokalAbmelden()
            return
        }
        try? await APIClient.shared.abmelden()  // ds-ok: Abmelden klappt lokal immer, Server-Abmeldung ist nur Aufräumen
        // Nicht von selbst wieder anmelden (fehlendeZugaengeHolen); in der Liste bleibt das Studio wählbar
        StudioAbmeldungen.merken(s.studioId)
        await studioVerlassen(s.studioId, hinweis: Texte.Wechsel.nurHierAbgemeldet(s.firma))
    }

    /// Token, Zwischenspeicher und Einstellungen löschen
    func lokalAbmelden(hinweis: String? = nil) async {
        KeychainStore.loeschen()
        KeychainStore.zugaengeLoeschen()
        zugaenge = []
        studios = []
        StudioAbmeldungen.alleVergessen()
        await APIClient.shared.setzeToken(nil)
        ZahlungenCache.alleLoeschen()
        Einstellungen.abmelden()
        portal.leeren()
        WerbungStore.shared.leeren()
        StudioMehrStore.shared.leeren()
        sitzung = nil
        sprungziel = nil
        sperre.entsperrt()
        abmeldeHinweis = hinweis
        tab = .kasse
        phase = .anmeldung
    }

    /// 401 vom Server (Token widerrufen, „auf allen Geräten abmelden“, Adresse entfernt …).
    /// Mit weiteren Studios: nur dieses Studio verlassen und ins nächste wechseln, sonst ganz abmelden.
    func sitzungAbgelaufen() {
        guard phase != .anmeldung, let s = sitzung else { return }
        if zugaenge.contains(where: { $0.studioId != s.studioId }) {
            Task { await studioVerlassen(s.studioId, hinweis: Texte.Wechsel.nichtMehrAngemeldet(s.firma)) }
        } else {
            Task { await lokalAbmelden(hinweis: Texte.Anmelden.abgelaufen) }
        }
    }

    // MARK: Studio-Wechsel

    /// Zugang speichern (gleiches Studio wird ersetzt; Ort bleibt, wenn der neue leer ist)
    private func zugangMerken(_ z: StudioZugang) {
        var neu = z
        if let i = zugaenge.firstIndex(where: { $0.studioId == z.studioId }) {
            if neu.ort.isEmpty { neu.ort = zugaenge[i].ort }
            zugaenge[i] = neu
        } else {
            zugaenge.append(neu)
        }
        KeychainStore.zugaengeSpeichern(zugaenge)
    }

    /// Zugang eines anderen Studios vergessen (Token dort ungültig, z. B. Team-Adresse entfernt)
    func zugangVergessen(_ studioId: String) {
        guard studioId != sitzung?.studioId else { return }
        zugaenge.removeAll { $0.studioId == studioId }
        KeychainStore.zugaengeSpeichern(zugaenge)
    }

    /// Liste der Studios vom Server holen (beim Start der Hauptansicht und bei jedem Öffnen der Liste).
    /// Gleicht die Zugänge ab und holt fehlende, damit Mitteilungen aus allen Studios ankommen. Ohne Netz bleibt die alte Liste.
    func studiosAktualisieren() async {
        guard let s = sitzung else { return }
        let liste: [StudioEintrag]
        do { liste = try await APIClient.shared.studios() } catch { return }  // ohne Netz: gespeicherte Liste bleibt (Knopf funktioniert trotzdem)
        guard sitzung?.studioId == s.studioId else { return }   // inzwischen gewechselt
        studios = liste
        Einstellungen.studios = liste
        // Studios, in denen die Adresse keine Rolle mehr hat: Zugang vergessen (der Server hat das Gerät dort schon abgemeldet)
        let ids = Set(liste.map(\.id))
        zugaenge.removeAll { !ids.contains($0.studioId) && $0.studioId != s.studioId }
        for e in liste {
            guard let i = zugaenge.firstIndex(where: { $0.studioId == e.id }) else { continue }
            zugaenge[i].firma = e.firma
            zugaenge[i].ort = e.ort
            zugaenge[i].rolle = e.rolle
        }
        KeychainStore.zugaengeSpeichern(zugaenge)
        // Rolle im aktuellen Studio hat sich geändert (z. B. vom Team zum Inhaber) → Sitzung anpassen
        if let ich = liste.first(where: { $0.id == s.studioId }), ich.rolle != s.rolle || ich.firma != s.firma {
            var n = s
            n.rolle = ich.rolle
            n.firma = ich.firma
            Einstellungen.sitzung = n
            sitzung = n
        }
        await fehlendeZugaengeHolen()
    }

    /// Für jedes Studio der Liste ohne Zugang einen holen und den Push-Token dort melden (Mitteilungen aus allen Studios).
    /// Ausgenommen: Studios, in denen man sich auf diesem Gerät bewusst nur dort abgemeldet hat.
    private func fehlendeZugaengeHolen() async {
        guard let s = sitzung else { return }
        for e in studios where e.id != s.studioId && !zugaenge.contains(where: { $0.studioId == e.id }) && !StudioAbmeldungen.enthaelt(e.id) {
            do {
                let z = try await zugangHolen(e)
                if let push = Einstellungen.pushToken {
                    _ = try await APIClient.shared.pushTokenSenden(push, umgebung: PushManager.umgebung, mitToken: z.token)
                }
            } catch {
                log.notice("Studio-Wechsel: Zugang für \(e.id, privacy: .public) nicht geholt: \(fehlerText(error), privacy: .public)")
            }
        }
    }

    /// Token fürs andere Studio vom Server (POST /api/app/wechseln), ohne neuen Code
    private func zugangHolen(_ e: StudioEintrag) async throws -> StudioZugang {
        guard let s = sitzung else { throw APIFehler.nichtAngemeldet }
        let a = try await APIClient.shared.wechseln(studioId: e.id)
        guard let token = a.token, let g = a.geraet else { throw APIFehler.unbekannt }
        let z = StudioZugang(studioId: e.id, firma: a.studio?.firma ?? e.firma, ort: a.studio?.ort ?? e.ort,
                             rolle: g.rolle ?? a.studio?.rolle ?? e.rolle, geraetId: g.id, email: s.email, token: token)
        zugangMerken(z)
        return z
    }

    /// In ein anderes Studio wechseln. Mit gespeichertem Zugang sofort (auch ohne Netz), sonst holt die App einen beim Server.
    func wechseln(zu studioId: String) async throws {
        guard let s = sitzung, studioId != s.studioId, !wechseltGerade else { return }
        wechseltGerade = true
        defer { wechseltGerade = false }
        let z: StudioZugang
        if let vorhanden = zugaenge.first(where: { $0.studioId == studioId }) {
            z = vorhanden
        } else {
            guard let e = studios.first(where: { $0.id == studioId }) else { throw APIFehler.unbekannt }
            z = try await zugangHolen(e)
            if let push = Einstellungen.pushToken {
                _ = try? await APIClient.shared.pushTokenSenden(push, umgebung: PushManager.umgebung, mitToken: z.token)  // ds-ok: Mitteilungen nachrangig, der Wechsel selbst hat geklappt
            }
        }
        StudioAbmeldungen.entfernen(studioId)
        await aktivieren(z)
    }

    /// Zugang zum aktiven machen: Token, Sitzung, alles Studio-Bezogene leeren. Die Hauptansicht baut sich neu auf (id = studioId).
    private func aktivieren(_ z: StudioZugang) async {
        KeychainStore.speichern(z.token)
        await APIClient.shared.setzeToken(z.token)
        let info = SitzungInfo(geraetId: z.geraetId, rolle: z.rolle, studioId: z.studioId, firma: z.firma, email: z.email)
        Einstellungen.sitzung = info          // zuerst: der Zwischenspeicher der Zahlungen hängt am Studio
        Einstellungen.studioWechseln()
        sitzung = info
        portal.leeren()
        WerbungStore.shared.leeren()
        StudioMehrStore.shared.leeren()
        portal.cacheLaden()
        sprungziel = nil
        werbungSprung = nil
        pushZahlung = nil
        studios = studios.map { var e = $0; e.aktuell = e.id == z.studioId; return e }
        Einstellungen.studios = studios
    }

    /// Aktuelles Studio verlassen (abgemeldet oder Zugang entzogen) und ins nächste wechseln; ohne weiteres Studio ganz abmelden.
    private func studioVerlassen(_ studioId: String, hinweis: String) async {
        ZahlungenCache.loeschen()
        zugaenge.removeAll { $0.studioId == studioId }
        KeychainStore.zugaengeSpeichern(zugaenge)
        if let naechster = zugaenge.first {
            await aktivieren(naechster)
            wechselHinweis = hinweis
        } else {
            await lokalAbmelden(hinweis: hinweis)
        }
    }

    /// Push-Mitteilung angetippt. Kommt sie aus einem anderen Studio, wechselt die App zuerst dorthin.
    func mitteilungGeoeffnet(typ: String?, zahlungId: String?, payoutId: String?, studioId: String? = nil) {
        guard let s = sitzung else { return }
        if let studioId, studioId != s.studioId,
           zugaenge.contains(where: { $0.studioId == studioId }) || studios.contains(where: { $0.id == studioId }) {
            Task {
                do {
                    try await wechseln(zu: studioId)
                    springen(typ: typ, zahlungId: zahlungId)
                } catch {
                    wechselHinweis = fehlerText(error)
                }
            }
            return
        }
        springen(typ: typ, zahlungId: zahlungId)
    }

    private func springen(typ: String?, zahlungId: String?) {
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

    /// Push-Mitteilung im Vordergrund erhalten (aus einem anderen Studio: nur das Banner, hier nichts neu laden)
    func mitteilungErhalten(typ: String?, zahlungId: String?, studioId: String? = nil) {
        if let studioId, studioId != sitzung?.studioId { return }
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
        // Antwort aus dem vorigen Studio (kam nach einem Wechsel an) → verwerfen
        if let aktiv = AppState.shared.sitzung?.studioId, a.studio.id != aktiv { return }
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
        let alt = zahlungen.first { $0.id == z.id }
        if let i = zahlungen.firstIndex(where: { $0.id == z.id }) { zahlungen[i] = z } else { zahlungen.insert(z, at: 0) }
        ZahlungenCache.speichern(zahlungen)
        // Kennzahlen (Umsatz, Anzahl, offene Links) rechnet der Server: bei neuem Link oder geändertem Status neu holen
        if alt == nil || alt?.status != z.status { kennzahlenNeuLaden() }
    }

    private var kennzahlenTask: Task<Void, Never>?
    private func kennzahlenNeuLaden() {
        kennzahlenTask?.cancel()
        kennzahlenTask = Task { [weak self] in
            try? await Task.sleep(for: .milliseconds(300))
            guard !Task.isCancelled, let self else { return }
            if let a = try? await APIClient.shared.portal() { self.uebernehmen(a) }  // ds-ok: Hintergrund-Nachladen der Kennzahlen; einen Fehler zeigt das nächste portal.laden() mit Stand-Zeile
        }
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
