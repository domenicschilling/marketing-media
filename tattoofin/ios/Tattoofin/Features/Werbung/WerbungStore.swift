import Foundation
import Observation

/// Zustand für den Tab „Werbung“ und den Start-Bereich der Kasse: Werbe-Texte vom Server, Checkliste, gezeichnete Beiträge.
@MainActor
@Observable
final class WerbungStore {
    static let shared = WerbungStore()

    var werbung: WerbungAntwort?
    /// Checkliste vom Server (GET /api/app/start)
    var startServer: StartAntwort?
    /// Ausweg für ältere Server ohne /api/app/start: Teilmenge von GET /api/portal
    var start: PortalStart?
    var laedt = false
    var fehler: String?
    private var geladenAm: Date?

    // Beiträge
    var beitraege: [GezeichneterBeitrag] = []
    var vorlagenAnzahl = 5
    var zeichnet = false
    var zeichenFehler: String?
    /// Name auf den Bildern (ohne Rechtsform, änderbar)
    var bildName = ""
    private var gezeichnetFuer: KitDaten?
    private var zeichenLauf = 0
    private let zeichner = BeitragZeichner()

    private init() {}

    // MARK: Laden

    /// Werbung und Checkliste laden; innerhalb von `abstand` Sekunden nicht doppelt (außer `immer`)
    func laden(immer: Bool = false, abstand: TimeInterval = 30) async {
        if !immer, let g = geladenAm, Date.now.timeIntervalSince(g) < abstand { return }
        laedt = true
        defer { laedt = false }
        async let w = werbungLaden()
        async let st = try? APIClient.shared.start()
        let (wa, sa) = await (w, st)
        if let wa { werbung = wa }
        if let sa {
            startServer = sa
        } else if let ps = try? await APIClient.shared.portalStart() {
            start = ps
        }
        if wa != nil || startServer != nil || start != nil {
            geladenAm = .now
            fehler = nil
        } else {
            fehler = WerbungTexte.ladeFehler
        }
        await appAbhaken()
    }

    /// GET /api/app/werbung; ältere Server ohne den Endpunkt → nil (die App nimmt dann ihre eingebauten Texte)
    private func werbungLaden() async -> WerbungAntwort? {
        do { return try await APIClient.shared.werbung() } catch { return nil }
    }

    func leeren() {
        werbung = nil
        startServer = nil
        start = nil
        geladenAm = nil
        beitraege = []
        gezeichnetFuer = nil
        bildName = ""
    }

    // MARK: Abgeleitet

    var klarnaMaterial: Bool { WerbungRegeln.klarnaMaterial(werbung: werbung, start: start?.studio) }
    /// Manuelle Punkte (theke, werbung): vom Server-Stand oder aus dem Portal-Ausweg
    var checkliste: StartCheckliste {
        if let p = startServer?.punkte {
            func ok(_ id: String) -> String? { p.first { $0.id == id }?.ok == true ? "ja" : nil }
            return StartCheckliste(app: ok("app"), theke: ok("theke"), werbung: ok("werbung"))
        }
        return start?.studio.checkliste ?? StartCheckliste()
    }

    /// Punkte für den Start-Bereich: vom Server, sonst selbst berechnet (älterer Server)
    func punkte(studio: Studio, hatZahlungen: Bool, istInhaber: Bool) -> [StartCheckpunkt]? {
        if let s = startServer, !s.punkte.isEmpty { return StartCheckpunkte.punkte(server: s.punkte) }
        guard let start else { return nil }
        return StartCheckpunkte.punkte(studio: studio, start: start.studio, hatZahlungen: hatZahlungen, istInhaber: istInhaber)
    }
    /// Druckvorlagen sagen „Ratenzahlung möglich*“ → nur mit Klarna (wie der Server)
    var druckMaterial: [DruckMaterial] {
        guard klarnaMaterial else { return [] }
        return (werbung?.materialLinks ?? start?.materialLinks ?? []).filter { !$0.url.isEmpty }
    }
    var videoText: String { werbung?.video?.text ?? WerbungRegeln.Werbevideo.text }
    var fussnote: String { werbung?.fussnote ?? WerbungTexte.fussnote }

    func video(feed: Bool) -> WerbeVideoDatei {
        let s = feed ? werbung?.video?.feed : werbung?.video?.reel
        let d = feed ? WerbungRegeln.Werbevideo.feed : WerbungRegeln.Werbevideo.reel
        return WerbeVideoDatei(url: s?.url ?? d.url, cover: s?.cover ?? d.cover)
    }

    // MARK: Checkliste

    /// Manuellen Punkt setzen (app, theke, werbung). Fehler still: die Checkliste ist eine Hilfe, kein Muss.
    func abhaken(_ punkt: String, _ erledigt: Bool = true) async {
        guard ["app", "theke", "werbung"].contains(punkt) else { return }
        let jetzt: String? = erledigt ? ISO8601DateFormatter().string(from: .now) : nil
        // Sofort zeigen, dann vom Server bestätigen lassen
        if var s = startServer, let i = s.punkte.firstIndex(where: { $0.id == punkt }) {
            s.punkte[i].ok = erledigt
            startServer = s
        }
        if var s = start {
            var c = s.studio.checkliste ?? StartCheckliste()
            switch punkt {
            case "app": c.app = jetzt
            case "theke": c.theke = jetzt
            default: c.werbung = jetzt
            }
            s.studio.checkliste = c
            start = s
        }
        do {
            let neu = try await APIClient.shared.checkliste(punkt: punkt, erledigt: erledigt)
            if var s = start, let c = neu.checkliste {
                s.studio.checkliste = c
                start = s
            }
            if startServer != nil, let sa = try? await APIClient.shared.start() { startServer = sa }
        } catch {
            log.error("Checkliste \(punkt, privacy: .public): \(fehlerText(error), privacy: .public)")
        }
    }

    /// Die App ist installiert: Punkt „app“ einmal je Gerät melden (das Web-Dashboard hakt „App“ dann auch ab)
    private func appAbhaken() async {
        let schluessel = "tf-checkliste-app-gemeldet"
        guard startServer != nil || start != nil, !UserDefaults.standard.bool(forKey: schluessel) else { return }
        if let c = start?.studio.checkliste, c.app != nil {
            UserDefaults.standard.set(true, forKey: schluessel)
            return
        }
        UserDefaults.standard.set(true, forKey: schluessel)
        await abhaken("app")
    }

    // MARK: Beiträge zeichnen

    /// Gespeicherter Name je Zahlseite (wie im Web je Browser)
    private func nameSchluessel(_ zahlseite: String) -> String { "tf-kit-name|" + zahlseite }

    /// Beiträge zeichnen (einmal je Name/Ort/Zahlseite). Erste Bilder erscheinen, sobald sie fertig sind.
    func beitraegeZeichnen(firma: String, ort: String?, zahlseite: String) async {
        let gespeichert = UserDefaults.standard.string(forKey: nameSchluessel(zahlseite))
        let standard = (try? await zeichner.anzeigeName(firma)) ?? firma
        if bildName.isEmpty { bildName = gespeichert ?? standard }
        let k = KitDaten(firma: bildName.leerAlsNil ?? standard, ort: ort?.leerAlsNil, zahlseite: zahlseite)
        if k == gezeichnetFuer, !beitraege.isEmpty { return }
        zeichenLauf += 1
        let lauf = zeichenLauf
        zeichnet = true
        zeichenFehler = nil
        defer { if lauf == zeichenLauf { zeichnet = false } }
        do {
            vorlagenAnzahl = max(1, try await zeichner.vorlagenAnzahl())
            var neu: [GezeichneterBeitrag] = []
            for i in 0..<vorlagenAnzahl {
                let b = try await zeichner.zeichne(i, k)
                guard lauf == zeichenLauf else { return }
                neu.append(b)
                // Nach und nach zeigen (beim Neuzeichnen die alten Bilder ersetzen)
                beitraege = neu + beitraege.dropFirst(neu.count)
            }
            beitraege = neu
            gezeichnetFuer = k
        } catch {
            guard lauf == zeichenLauf else { return }
            log.error("Beiträge zeichnen: \(String(describing: error), privacy: .public)")
            zeichenFehler = WerbungTexte.zeichnenFehler
        }
    }

    /// Neuer Name auf den Bildern: merken (leer = Standard) und neu zeichnen
    func nameAendern(_ name: String, firma: String, ort: String?, zahlseite: String) async {
        let standard = (try? await zeichner.anzeigeName(firma)) ?? firma
        let n = name.leerAlsNil ?? standard
        bildName = n
        if n == standard {
            UserDefaults.standard.removeObject(forKey: nameSchluessel(zahlseite))
        } else {
            UserDefaults.standard.set(n, forKey: nameSchluessel(zahlseite))
        }
        await beitraegeZeichnen(firma: firma, ort: ort, zahlseite: zahlseite)
    }
}
