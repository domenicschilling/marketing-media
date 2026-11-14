import Foundation
import Testing
@testable import Tattoofin

/// Tab „Werbung“, „So geht's“ und Start-Bereich: Dekodierung (robust), Klarna-Regel, Kapitel, Kit-Kopie, Texte.
@Suite("Werbung")
struct WerbungTests {
    private func lesen<T: Decodable>(_ json: String, als: T.Type = T.self) throws -> T {
        try JSONDecoder().decode(T.self, from: Data(json.utf8))
    }

    /// Ordner tattoofin/ (relativ zu dieser Datei)
    private static var tattoofin: URL {
        URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
    }

    private static var webDa: Bool {
        FileManager.default.fileExists(atPath: tattoofin.appending(path: "website/public/js/app-kit.js").path())
    }

    // MARK: Dekodierung GET /api/app/werbung

    /// So antwortet der Server (gekürzt, Stand 14.11.2026, _lib/werbung.mjs)
    static let serverAntwort = """
    {"klarna":true,
     "fussnote":"*Raten über Klarna, nach deren Bonitätsprüfung. Vertragspartner der Raten ist Klarna, nicht Tattoofin. Achtung! Kreditaufnahme kostet Geld.",
     "studio":{"firma":"Ink Studio Bamberg","ort":"Bamberg","zahlseite":"https://tattoofin.de/zahlen/ink"},
     "zahlseite":"https://tattoofin.de/zahlen/ink","hashtags":"#tattoo",
     "video":{"formate":[
        {"id":"reel","titel":"Reel / Story (9:16)","url":"https://tattoofin.de/media/studio-video/reel.mp4","cover":"https://tattoofin.de/media/studio-video/cover.jpg","breite":1080,"hoehe":1920,"dauer":17.5},
        {"id":"feed","titel":"Beitrag (4:5)","url":"https://tattoofin.de/media/studio-video/feed.mp4","cover":"https://tattoofin.de/media/studio-video/cover-feed.jpg","breite":1080,"hoehe":1350,"dauer":17.5}],
       "text":"Videotext mit Fußnote"},
     "beitraege":[{"id":"ankuendigung","titel":"Beitrag","format":"Beitrag 4:5","art":"post","wofuer":"x","seiten":["ankuendigung"],"kopieren":"text","text":"Posting-Text","breite":1080,"hoehe":1350}],
     "materialLinks":[{"name":"21-flyer-a6","titel":"Flyer A6","url":"https://example.test/21-flyer-a6.html?studio=Ink"}],
     "soGehts":{"url":"https://tattoofin.de/assets/app/hilfe/so-gehts-9x16.mp4","poster":"https://tattoofin.de/assets/app/hilfe/so-gehts-9x16.jpg","dauer":147.73,
       "kapitel":[{"ab":0,"name":"Übersicht und Einrichtung"},{"ab":135.9,"name":"Hilfe per WhatsApp"}],
       "hinweis":"Stimme mit KI erstellt","fussnote":"*Raten …"},
     "hilfe":{"whatsapp":"https://wa.me/491624502375"}}
    """

    @Test func serverAntwortLesen() throws {
        let w = try lesen(Self.serverAntwort, als: WerbungAntwort.self)
        #expect(w.klarnaDauerhaft == true)
        #expect(w.firma == "Ink Studio Bamberg")
        #expect(w.ort == "Bamberg")
        #expect(w.zahlseite == "https://tattoofin.de/zahlen/ink")
        #expect(w.video?.reel?.url == "https://tattoofin.de/media/studio-video/reel.mp4")
        #expect(w.video?.feed?.cover == "https://tattoofin.de/media/studio-video/cover-feed.jpg")
        #expect(w.video?.text == "Videotext mit Fußnote")
        #expect(w.beitraege?.first?.id == "ankuendigung")
        #expect(w.beitraege?.first?.text == "Posting-Text")
        #expect(w.materialLinks?.count == 1)
        #expect(w.fussnote == KlarnaTexte.pflichtsatz)
        #expect(w.soGehts?.kapitel?.count == 2)
        #expect(w.soGehts?.url?.hasSuffix("so-gehts-9x16.mp4") == true)
    }

    @Test func leereAntwortBrichtNichtAb() throws {
        let w = try lesen("{}", als: WerbungAntwort.self)
        #expect(w.klarnaDauerhaft == nil)
        #expect(w.video == nil)
        #expect(w.beitraege == nil)
        #expect(!WerbungRegeln.klarnaMaterial(werbung: w, start: nil))
    }

    @Test func falscheTypenWerdenUebersprungen() throws {
        // video als Text, beitraege kaputt, klarna als 1
        let w = try lesen(#"{"klarna":1,"video":"x","beitraege":"kaputt","materialLinks":[{"titel":"A","url":"https://a.test"}]}"#, als: WerbungAntwort.self)
        #expect(w.klarnaDauerhaft == true)
        #expect(w.video?.reel == nil)
        #expect(w.beitraege == nil)
        #expect(w.materialLinks?.first?.titel == "A")
    }

    @Test func videoAlsObjektMitReelFeed() throws {
        let w = try lesen(#"{"video":{"reel":{"src":"/media/studio-video/reel.mp4","poster":"/c.jpg"},"feed":"/media/studio-video/feed.mp4"}}"#, als: WerbungAntwort.self)
        #expect(w.video?.reel?.url == "/media/studio-video/reel.mp4")
        #expect(w.video?.reel?.cover == "/c.jpg")
        #expect(w.video?.feed?.url == "/media/studio-video/feed.mp4")
        let basis = URL(string: "https://tattoofin.de")!
        #expect(WerbungRegeln.adresse(w.video?.feed?.url, basis: basis)?.absoluteString == "https://tattoofin.de/media/studio-video/feed.mp4")
        #expect(WerbungRegeln.adresse("https://x.test/a.mp4", basis: basis)?.absoluteString == "https://x.test/a.mp4")
        #expect(WerbungRegeln.adresse("", basis: basis) == nil)
    }

    // MARK: Dekodierung Portal (Start-Bereich)

    @Test func portalStartLesen() throws {
        let json = """
        {"studio":{"id":"st_1","inhaber":"Max Muster","modell":"monatlich","klarnaDauerhaft":true,"fragebogenAm":null,
          "recht":{"version":"2026-11","am":"2026-11-01T10:00:00Z","aktuell":true},
          "checkliste":{"app":"2026-11-14T10:00:00Z","werbung":null},"kannKassieren":true,"zahlseite":"https://tattoofin.de/zahlen/x"},
         "zahlungen":[],"kpis":{"umsatzMonatCent":108000,"zahlungenMonat":4,"auszahlungMonatCent":97200},
         "materialLinks":[{"name":"20-fensteraufkleber","titel":"Fensteraufkleber","url":"https://m.test/20.html"}]}
        """
        let p = try lesen(json, als: PortalStart.self)
        #expect(p.studio.klarnaDauerhaft == true)
        #expect(p.studio.recht?.aktuell == true)
        #expect(p.studio.fragebogenAm == nil)
        #expect(p.studio.checkliste?.app != nil)
        #expect(p.studio.checkliste?.werbung == nil)
        #expect(p.studio.checkliste?.theke == nil)
        #expect(p.kpis?.auszahlungMonatCent == 97200)
        #expect(p.materialLinks?.first?.name == "20-fensteraufkleber")
    }

    @Test func portalStartAlterServer() throws {
        // Ohne checkliste/recht/klarnaDauerhaft: kein Absturz, kein Klarna
        let p = try lesen(#"{"studio":{"id":"st_1"},"zahlungen":[]}"#, als: PortalStart.self)
        #expect(p.studio.checkliste == nil)
        #expect(!WerbungRegeln.klarnaMaterial(werbung: nil, start: p.studio))
    }

    @Test func checklisteAlsJaNein() throws {
        let c = try lesen(#"{"app":true,"theke":false,"werbung":"2026-11-14"}"#, als: StartCheckliste.self)
        #expect(c.app != nil)
        #expect(c.theke == nil)
        #expect(c.werbung == "2026-11-14")
    }

    // MARK: Klarna-Regel

    @Test func klarnaNurMitKlarnaDauerhaft() throws {
        #expect(!WerbungRegeln.klarnaMaterial(werbung: nil, start: nil))
        #expect(WerbungRegeln.klarnaMaterial(werbung: nil, start: StartStudio(klarnaDauerhaft: true)))
        #expect(!WerbungRegeln.klarnaMaterial(werbung: nil, start: StartStudio(klarnaDauerhaft: false)))
        // Server-Antwort der Werbung hat Vorrang (z. B. Risikofrei nach dem Stichtag)
        #expect(!WerbungRegeln.klarnaMaterial(werbung: WerbungAntwort(klarnaDauerhaft: false), start: StartStudio(klarnaDauerhaft: true)))
        // klarna (nur bis zum Stichtag) zählt nicht, wenn klarnaDauerhaft false ist
        let w = try lesen(#"{"klarna":true,"klarnaDauerhaft":false}"#, als: WerbungAntwort.self)
        #expect(!WerbungRegeln.klarnaMaterial(werbung: w, start: nil))
        // Studio-Angaben unter „studio“
        let s = try lesen(#"{"studio":{"klarnaDauerhaft":true}}"#, als: WerbungAntwort.self)
        #expect(WerbungRegeln.klarnaMaterial(werbung: s, start: nil))
    }

    @MainActor
    @Test func druckmaterialNurMitKlarna() {
        let store = WerbungStore.shared
        let vorher = (store.werbung, store.start)
        defer { store.werbung = vorher.0; store.start = vorher.1 }
        let links = [DruckMaterial(name: "21-flyer-a6", titel: "Flyer A6", url: "https://m.test/21.html")]
        store.werbung = nil
        store.start = PortalStart(studio: StartStudio(klarnaDauerhaft: false), materialLinks: links)
        #expect(store.druckMaterial.isEmpty)
        #expect(!store.klarnaMaterial)
        store.start = PortalStart(studio: StartStudio(klarnaDauerhaft: true), materialLinks: links)
        #expect(store.druckMaterial.count == 1)
        // Werbung-Endpunkt sagt nein → nichts, auch wenn das Portal Links schickt
        store.werbung = WerbungAntwort(klarnaDauerhaft: false)
        #expect(store.druckMaterial.isEmpty)
    }

    /// Wo Raten gemeint sind, steht die volle Fußnote (nicht abgekürzt)
    @Test func fussnoteVollstaendig() {
        #expect(WerbungTexte.fussnote == "*Raten über Klarna, nach deren Bonitätsprüfung. Vertragspartner der Raten ist Klarna, nicht Tattoofin. Achtung! Kreditaufnahme kostet Geld.")
        let t = WerbungRegeln.Werbevideo.text
        #expect(t.contains(KlarnaTexte.zusatzStudio))
        #expect(t.contains(KlarnaTexte.warnsatz))
    }

    /// Texte, die jedes Studio sieht (auch ohne Klarna): kein Klarna, keine Raten. Kein Preis, kein Paket, keine Website irgendwo.
    @Test func texteOhneKlarnaUndOhnePreis() {
        let immer = [WerbungTexte.einleitung, WerbungTexte.vorFreigabe, WerbungTexte.zahlseiteTitel, WerbungTexte.zahlseiteText,
                     WerbungTexte.qrSpeichern, WerbungTexte.zahlseiteAnsehen, WerbungTexte.theke, WerbungTexte.soGehtsTitel,
                     WerbungTexte.soGehtsKurz, WerbungTexte.soGehtsText, WerbungTexte.Start.einrichtung, WerbungTexte.Start.alleErledigt,
                     WerbungTexte.Start.diesenMonat, WerbungTexte.Start.gezahlt]
            + StartCheckpunkte.punkte(studio: Studio(id: "st_1"), start: nil, hatZahlungen: false).flatMap { [$0.titel, $0.text] }
        for t in immer {
            for verboten in ["Klarna", "Raten"] {
                #expect(!t.localizedCaseInsensitiveContains(verboten), "„\(verboten)“ in: \(t)")
            }
        }
        let alle = immer + [WerbungTexte.einleitungKlarna, WerbungTexte.ohneKlarnaText, WerbungTexte.videoText, WerbungTexte.beitraegeText,
                            WerbungTexte.druckText] + WerbungTexte.schritte
        for t in alle {
            for verboten in ["49", "netto", "Paket", "tattoofin.de", "Probe", "Abo", "Domenic"] {
                #expect(!t.localizedCaseInsensitiveContains(verboten), "„\(verboten)“ in: \(t)")
            }
        }
    }

    // MARK: Checkliste

    @Test func checklistePunkte() {
        var s = Studio(id: "st_1")
        s.stripe = StripeStatus(freigegeben: true)
        let start = StartStudio(fragebogenAm: "2026-11-01", recht: StartRecht(aktuell: false), checkliste: StartCheckliste(theke: "2026-11-02"))
        let p = StartCheckpunkte.punkte(studio: s, start: start, hatZahlungen: true)
        #expect(p.count == 8)
        let ok = Dictionary(uniqueKeysWithValues: p.map { ($0.id, $0.ok) })
        #expect(ok["stripe"] == true)
        #expect(ok["fragebogen"] == true)
        #expect(ok["recht"] == false)
        #expect(ok["link"] == true)
        #expect(ok["app"] == true)   // in der iPhone-App immer erledigt
        #expect(ok["theke"] == true)
        #expect(ok["werbung"] == false)
        #expect(p.first { $0.id == "werbung" }?.manuell == "werbung")
        #expect(p.first { $0.id == "recht" }?.aktion == .recht)
    }

    @Test func serverChecklisteLesenUndRollen() throws {
        let json = """
        {"checkliste":{"punkte":[
          {"id":"konto","ok":true,"titel":"Studio bei Tattoofin angelegt","text":"x","darf":true},
          {"id":"stripe","ok":false,"wartet":true,"titel":"Zahlungskonto","ziel":null,"nurInhaber":true,"darf":true},
          {"id":"fragebogen","ok":false,"titel":"Fragebogen ausfüllen","ziel":"fragebogen","nurInhaber":true,"darf":false},
          {"id":"recht","ok":false,"titel":"Recht","ziel":"recht","darf":true},
          {"id":"link","ok":true,"titel":"Link","ziel":"link","darf":true},
          {"id":"theke","ok":false,"titel":"QR-Code an die Theke","ziel":"werbung","manuell":"theke","darf":true},
          {"id":"kaputt"}],
          "fertig":2,"gesamt":6,"alleErledigt":false},"rolle":"team"}
        """
        let a = try lesen(json, als: StartAntwort.self)
        #expect(a.rolle == "team")
        #expect(a.punkte.count == 6)   // Punkt ohne Titel fällt weg
        let p = StartCheckpunkte.punkte(server: a.punkte)
        #expect(p.first { $0.id == "stripe" }?.wartet == true)
        #expect(p.first { $0.id == "fragebogen" }?.aktion == nil)   // Team darf nicht
        #expect(p.first { $0.id == "recht" }?.aktion == .recht)
        #expect(p.first { $0.id == "link" }?.aktion == nil)         // in der Kasse kein Knopf nötig
        #expect(p.first { $0.id == "theke" }?.manuell == "theke")
        #expect(p.first { $0.id == "theke" }?.aktion == .werbung)
    }

    @Test func lokaleChecklisteTeamOhneFragebogen() {
        let p = StartCheckpunkte.punkte(studio: Studio(id: "st_1"), start: StartStudio(), hatZahlungen: false, istInhaber: false)
        #expect(p.first { $0.id == "fragebogen" }?.aktion == nil)
        #expect(p.first { $0.id == "recht" }?.aktion == nil)
    }

    @Test func checklisteStripeWartet() {
        var s = Studio(id: "st_1")
        s.stripe = StripeStatus(freigegeben: false, angabenGemacht: true)
        let p = StartCheckpunkte.punkte(studio: s, start: nil, hatZahlungen: false)
        let stripe = p.first { $0.id == "stripe" }
        #expect(stripe?.ok == false)
        #expect(stripe?.wartet == true)
    }

    // MARK: So geht's

    @Test func soGehtsOhneWebAppKapitel() {
        let k = WerbungRegeln.SoGehts.kapitel
        #expect(k.count == WerbungRegeln.SoGehts.alleKapitel.count - 1)
        #expect(!k.contains { $0.name.localizedCaseInsensitiveContains("Startbildschirm") })
        #expect(WerbungRegeln.SoGehts.ueberspringen.lowerBound == 120.8)
        #expect(WerbungRegeln.SoGehts.ueberspringen.upperBound == 135.9)
        #expect(WerbungRegeln.SoGehts.aktuell(0) == 0)
        #expect(k[WerbungRegeln.SoGehts.aktuell(119)].name == "Deine rechtliche Lage")
        #expect(k[WerbungRegeln.SoGehts.aktuell(140)].name == "Hilfe per WhatsApp")
    }

    @Test(.enabled(if: webDa, "Website nicht gefunden"))
    func soGehtsGleichWieWeb() throws {
        let js = try String(contentsOf: Self.tattoofin.appending(path: "website/public/js/so-gehts.js"), encoding: .utf8)
        for k in WerbungRegeln.SoGehts.alleKapitel {
            let ab = k.ab == 0 ? "0" : String(k.ab)
            #expect(js.contains("{ ab: \(ab), name: \"\(k.name)\" }"), "Kapitel fehlt im Web: \(k.name)")
        }
        #expect(js.contains(WerbungRegeln.SoGehts.video))
    }

    // MARK: Kit-Kopie im App-Bundle

    @Test(.enabled(if: webDa, "Website nicht gefunden"))
    func kitGleichWieWebsite() throws {
        let dateien = ["js/app-kit.js", "js/werbung-texte.js", "js/klarna-texte.js", "js/qrcode.min.js", "assets/figur.png",
                       "assets/wortmarke.png", "assets/fonts/LuckiestGuy.woff2", "assets/fonts/DMSans.woff2"]
        for d in dateien {
            let web = try Data(contentsOf: Self.tattoofin.appending(path: "website/public/\(d)"))
            let app = try Data(contentsOf: Self.tattoofin.appending(path: "ios/Tattoofin/Resources/WebKit/\((d as NSString).lastPathComponent)"))
            #expect(web == app, "Kopie veraltet: \(d). Bitte scripts/web-kit-sync.sh ausführen.")
        }
    }

    @MainActor
    @Test func kitImBundle() {
        for (pfad, d) in KitSchemaHandler.dateien {
            #expect(KitSchemaHandler.bundleURL(d.name, d.typ) != nil, "Fehlt im App-Bundle: \(pfad)")
        }
        #expect(KitSchemaHandler.seite.contains("/js/werbung-texte.js"))
    }

    @Test func dateinamen() {
        #expect(TeilenDateien.slug("Ink & Art Köln") == "ink-art-koeln")
        #expect(TeilenDateien.slug("   ") == "studio")
        #expect(TeilenDateien.slug("Straße 1") == "strasse-1")
    }
}
