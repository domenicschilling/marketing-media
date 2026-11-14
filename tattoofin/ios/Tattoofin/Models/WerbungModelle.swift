import Foundation

// Modelle für den Tab „Werbung“ und den Start-Bereich der Kasse.
// GET /api/app/werbung (Texte, Video-Adressen, Klarna-Schalter) und eine Teilmenge von GET /api/portal (Checkliste, Druckmaterial).
// Alles optional und mit Ausweich-Schlüsseln: Der Server darf Felder ergänzen, umbenennen oder weglassen, ohne dass die App abbricht.

// MARK: - Hilfen zum robusten Lesen

/// Beliebiger JSON-Schlüssel (für Antworten mit mehreren möglichen Feldnamen)
struct FreierSchluessel: CodingKey {
    var stringValue: String
    var intValue: Int? { nil }
    init(_ s: String) { stringValue = s }
    init?(stringValue: String) { self.stringValue = stringValue }
    init?(intValue: Int) { nil }
}

extension KeyedDecodingContainer where Key == FreierSchluessel {
    /// Ersten vorhandenen und lesbaren Wert unter einem der Namen (falscher Typ zählt als fehlend)
    func erster<T: Decodable>(_ typ: T.Type, _ namen: String...) -> T? {
        for n in namen {
            let k = FreierSchluessel(n)
            if contains(k), let w = try? decodeIfPresent(T.self, forKey: k) { return w }
        }
        return nil
    }

    func text(_ namen: String...) -> String? {
        for n in namen {
            let k = FreierSchluessel(n)
            if contains(k), let w = try? decodeIfPresent(String.self, forKey: k), !w.isEmpty { return w }
        }
        return nil
    }

    /// Bool, auch wenn der Server 0/1 schickt
    func jaNein(_ namen: String...) -> Bool? {
        for n in namen {
            let k = FreierSchluessel(n)
            guard contains(k) else { continue }
            if let b = try? decodeIfPresent(Bool.self, forKey: k) { return b }
            if let i = try? decodeIfPresent(Int.self, forKey: k) { return i != 0 }
        }
        return nil
    }
}

// MARK: - GET /api/app/werbung

/// Ein Video in einem Format (Reel 9:16 oder Beitrag 4:5)
struct WerbeVideoDatei: Decodable, Sendable, Hashable {
    var url: String?
    var cover: String?

    init(url: String?, cover: String?) {
        self.url = url
        self.cover = cover
    }

    init(from decoder: any Decoder) throws {
        // Auch nur eine Adresse als Text erlauben: "reel": "/media/studio-video/reel.mp4"
        if let s = try? decoder.singleValueContainer().decode(String.self) {
            url = s
            return
        }
        let c = try decoder.container(keyedBy: FreierSchluessel.self)
        url = c.text("url", "src", "video", "mp4")
        cover = c.text("cover", "poster", "bild", "vorschau")
    }
}

/// Werbevideo: zwei Formate und der Text zum Posten
struct WerbeVideoInfo: Decodable, Sendable, Hashable {
    var reel: WerbeVideoDatei?
    var feed: WerbeVideoDatei?
    var text: String?

    init(reel: WerbeVideoDatei? = nil, feed: WerbeVideoDatei? = nil, text: String? = nil) {
        self.reel = reel
        self.feed = feed
        self.text = text
    }

    init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: FreierSchluessel.self)
        reel = c.erster(WerbeVideoDatei.self, "reel", "story", "hoch")
        feed = c.erster(WerbeVideoDatei.self, "feed", "beitrag", "post")
        text = c.text("text", "postingText", "caption", "beschreibung")
        // Auch als Liste: [{format:"reel", url, cover}, …]
        if reel == nil || feed == nil, let liste = c.erster([FormatEintrag].self, "formate", "dateien", "videos") {
            for e in liste {
                if e.format == "reel" || e.format == "story" { reel = reel ?? WerbeVideoDatei(url: e.url, cover: e.cover) }
                if e.format == "feed" || e.format == "beitrag" { feed = feed ?? WerbeVideoDatei(url: e.url, cover: e.cover) }
            }
        }
    }

    private struct FormatEintrag: Decodable {
        var format: String?
        var url: String?
        var cover: String?

        init(from decoder: any Decoder) throws {
            let c = try decoder.container(keyedBy: FreierSchluessel.self)
            format = c.text("format", "id", "art")?.lowercased()
            url = c.text("url", "src")
            cover = c.text("cover", "poster")
        }
    }
}

/// Texte zu einer Beitrags-Vorlage vom Server (die Bilder zeichnet die App selbst mit app-kit.js)
struct BeitragText: Decodable, Sendable, Hashable {
    var id: String
    var titel: String?
    var text: String?

    init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: FreierSchluessel.self)
        id = c.text("id", "vorlage") ?? ""
        titel = c.text("titel", "title")
        text = c.text("text", "postingText", "caption")
    }
}

/// Druckmaterial (materialLinks in GET /api/portal)
struct DruckMaterial: Decodable, Sendable, Hashable, Identifiable {
    var name: String?
    var titel: String
    var url: String

    var id: String { name ?? url }

    init(name: String?, titel: String, url: String) {
        self.name = name
        self.titel = titel
        self.url = url
    }

    init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: FreierSchluessel.self)
        name = c.text("name", "id")
        titel = c.text("titel", "title") ?? "Druckvorlage"
        url = c.text("url", "link") ?? ""
    }
}

/// Kapitel des Erklärvideos
struct VideoKapitel: Decodable, Sendable, Hashable, Identifiable {
    var ab: Double
    var name: String

    var id: Double { ab }

    init(ab: Double, name: String) {
        self.ab = ab
        self.name = name
    }
}

/// Erklärvideo-Angaben vom Server (Kapitel ohne das Web-App-Kapitel)
struct SoGehtsInfo: Decodable, Sendable, Hashable {
    var url: String?
    var poster: String?
    var kapitel: [VideoKapitel]?
    var hinweis: String?
    var fussnote: String?

    init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: FreierSchluessel.self)
        url = c.text("url", "src", "video")
        poster = c.text("poster", "cover")
        kapitel = c.erster([VideoKapitel].self, "kapitel")
        hinweis = c.text("hinweis")
        fussnote = c.text("fussnote")
    }
}

/// GET /api/app/werbung. Studio-Angaben flach oder unter „studio“.
struct WerbungAntwort: Decodable, Sendable {
    /// Klarna dauerhaft (klarnaDauerhaft). Nur dann Video und Beiträge mit Klarna zeigen.
    var klarnaDauerhaft: Bool?
    var firma: String?
    var anzeigeName: String?
    var ort: String?
    var zahlseite: String?
    var kannKassieren: Bool?
    var video: WerbeVideoInfo?
    var beitraege: [BeitragText]?
    var fussnote: String?
    var materialLinks: [DruckMaterial]?
    var soGehts: SoGehtsInfo?

    init(klarnaDauerhaft: Bool? = nil, firma: String? = nil, anzeigeName: String? = nil, ort: String? = nil, zahlseite: String? = nil,
         kannKassieren: Bool? = nil, video: WerbeVideoInfo? = nil, beitraege: [BeitragText]? = nil, fussnote: String? = nil,
         materialLinks: [DruckMaterial]? = nil) {
        self.klarnaDauerhaft = klarnaDauerhaft
        self.firma = firma
        self.anzeigeName = anzeigeName
        self.ort = ort
        self.zahlseite = zahlseite
        self.kannKassieren = kannKassieren
        self.video = video
        self.beitraege = beitraege
        self.fussnote = fussnote
        self.materialLinks = materialLinks
    }

    init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: FreierSchluessel.self)
        let s = try? c.nestedContainer(keyedBy: FreierSchluessel.self, forKey: FreierSchluessel("studio"))
        // klarnaDauerhaft hat Vorrang vor klarna (klarna allein kann nur „bis zum Stichtag“ heißen)
        klarnaDauerhaft = c.jaNein("klarnaDauerhaft") ?? s?.jaNein("klarnaDauerhaft") ?? c.jaNein("klarna") ?? s?.jaNein("klarna")
        firma = c.text("firma") ?? s?.text("firma")
        anzeigeName = c.text("anzeigeName", "name") ?? s?.text("anzeigeName", "name")
        ort = c.text("ort") ?? s?.text("ort")
        zahlseite = c.text("zahlseite") ?? s?.text("zahlseite")
        kannKassieren = c.jaNein("kannKassieren") ?? s?.jaNein("kannKassieren")
        video = c.erster(WerbeVideoInfo.self, "video", "werbevideo")
        if video == nil, let t = c.text("videoText", "postingText") { video = WerbeVideoInfo(text: t) }
        beitraege = c.erster([BeitragText].self, "beitraege", "vorlagen", "posts")
        fussnote = c.text("fussnote", "pflichtsatz", "klarnaFussnote")
        materialLinks = c.erster([DruckMaterial].self, "materialLinks", "druckmaterial", "material")
        soGehts = c.erster(SoGehtsInfo.self, "soGehts", "erklaervideo", "tutorial")
    }
}

// MARK: - Start-Bereich (Teilmenge von GET /api/portal)

struct StartCheckliste: Codable, Sendable, Hashable {
    /// Zeitpunkt (ISO) oder nil
    var app: String?
    var theke: String?
    var werbung: String?

    init(app: String? = nil, theke: String? = nil, werbung: String? = nil) {
        self.app = app
        self.theke = theke
        self.werbung = werbung
    }

    init(from decoder: any Decoder) throws {
        // Zeitpunkt als Text, zur Sicherheit auch true/false
        let c = try decoder.container(keyedBy: FreierSchluessel.self)
        func wert(_ n: String) -> String? { c.text(n) ?? (c.jaNein(n) == true ? "ja" : nil) }
        app = wert("app")
        theke = wert("theke")
        werbung = wert("werbung")
    }
}

struct StartRecht: Codable, Sendable, Hashable {
    var version: String?
    var aktuell: Bool?
}

/// Was der Start-Bereich vom Studio braucht (oeffentlich(s) in studio-ansicht.mjs)
struct StartStudio: Codable, Sendable, Hashable {
    var inhaber: String?
    var modell: String?
    var klarnaDauerhaft: Bool?
    var fragebogenAm: String?
    var recht: StartRecht?
    var checkliste: StartCheckliste?
    var kannKassieren: Bool?
    var zahlseite: String?

    init(inhaber: String? = nil, modell: String? = nil, klarnaDauerhaft: Bool? = nil, fragebogenAm: String? = nil, recht: StartRecht? = nil,
         checkliste: StartCheckliste? = nil, kannKassieren: Bool? = nil, zahlseite: String? = nil) {
        self.inhaber = inhaber
        self.modell = modell
        self.klarnaDauerhaft = klarnaDauerhaft
        self.fragebogenAm = fragebogenAm
        self.recht = recht
        self.checkliste = checkliste
        self.kannKassieren = kannKassieren
        self.zahlseite = zahlseite
    }

    init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: FreierSchluessel.self)
        inhaber = c.text("inhaber")
        modell = c.text("modell")
        klarnaDauerhaft = c.jaNein("klarnaDauerhaft")
        fragebogenAm = c.text("fragebogenAm")
        recht = c.erster(StartRecht.self, "recht")
        // checkliste ist ein Objekt mit Zeitpunkten (oder null je Punkt); ältere Server schicken nichts
        checkliste = c.erster(StartCheckliste.self, "checkliste")
        kannKassieren = c.jaNein("kannKassieren")
        zahlseite = c.text("zahlseite")
    }

    var istProvision: Bool { modell == "provision" }
}

struct StartKPIs: Codable, Sendable, Hashable {
    var umsatzMonatCent: Int?
    var zahlungenMonat: Int?
    var auszahlungMonatCent: Int?
}

/// GET /api/portal, gelesen für den Start-Bereich und die Werbung
struct PortalStart: Decodable, Sendable {
    var studio: StartStudio
    var kpis: StartKPIs?
    var materialLinks: [DruckMaterial]?

    init(studio: StartStudio, kpis: StartKPIs? = nil, materialLinks: [DruckMaterial]? = nil) {
        self.studio = studio
        self.kpis = kpis
        self.materialLinks = materialLinks
    }

    init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: FreierSchluessel.self)
        studio = try c.decode(StartStudio.self, forKey: FreierSchluessel("studio"))
        kpis = c.erster(StartKPIs.self, "kpis")
        materialLinks = c.erster([DruckMaterial].self, "materialLinks")
    }
}

/// Ein Punkt der Einrichtungs-Checkliste vom Server (GET /api/app/start, ohne Paket und Preis)
struct ServerCheckpunkt: Decodable, Sendable, Hashable {
    var id: String
    var ok: Bool
    var wartet: Bool?
    var titel: String
    var text: String?
    /// stripe | fragebogen | recht | link | werbung
    var ziel: String?
    /// app | theke | werbung (selbst abhaken)
    var manuell: String?
    /// false: diese Rolle (Team) kann den Punkt nicht erledigen
    var darf: Bool?

    init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: FreierSchluessel.self)
        id = c.text("id") ?? ""
        ok = c.jaNein("ok") ?? false
        wartet = c.jaNein("wartet")
        titel = c.text("titel") ?? ""
        text = c.text("text")
        ziel = c.text("ziel")
        manuell = c.text("manuell")
        darf = c.jaNein("darf")
    }
}

/// GET /api/app/start
struct StartAntwort: Decodable, Sendable {
    var punkte: [ServerCheckpunkt]
    var rolle: String?

    init(punkte: [ServerCheckpunkt], rolle: String? = nil) {
        self.punkte = punkte
        self.rolle = rolle
    }

    init(from decoder: any Decoder) throws {
        let c = try decoder.container(keyedBy: FreierSchluessel.self)
        let k = try? c.nestedContainer(keyedBy: FreierSchluessel.self, forKey: FreierSchluessel("checkliste"))
        punkte = (k?.erster([ServerCheckpunkt].self, "punkte") ?? c.erster([ServerCheckpunkt].self, "punkte") ?? [])
            .filter { !$0.id.isEmpty && !$0.titel.isEmpty }
        rolle = c.text("rolle")
    }
}

// MARK: - Regeln

enum WerbungRegeln {
    /// Klarna-Material (Werbevideo, Beiträge, Raten-Fußnote) nur, wenn das Studio Klarna dauerhaft anbietet.
    /// Fehlt die Angabe (älterer Server, Fehler), gilt: kein Klarna-Material.
    static func klarnaMaterial(werbung: WerbungAntwort?, start: StartStudio?) -> Bool {
        werbung?.klarnaDauerhaft ?? start?.klarnaDauerhaft ?? false
    }

    /// Adresse vom Server (absolut oder „/media/…“) gegen die Basis auflösen
    static func adresse(_ s: String?, basis: URL) -> URL? {
        guard let s, !s.isEmpty else { return nil }
        if let u = URL(string: s), u.scheme != nil { return u }
        return URL(string: s, relativeTo: basis)?.absoluteURL
    }

    /// Erklärvideo „So geht's“ (Spiegel von website/public/js/so-gehts.js, Stand 18.10.2026).
    /// Das Kapitel „App auf den Startbildschirm“ (Web-App) fehlt in der App bewusst und wird beim Abspielen übersprungen.
    enum SoGehts {
        static let video = "/assets/app/hilfe/so-gehts-9x16.mp4"
        static let poster = "/assets/app/hilfe/so-gehts-9x16.jpg"
        static let dauer = 147.73
        static let alleKapitel: [VideoKapitel] = [
            VideoKapitel(ab: 0, name: "Übersicht und Einrichtung"),
            VideoKapitel(ab: 22.6, name: "Zahlungslink erstellen"),
            VideoKapitel(ab: 53.7, name: "Was dein Kunde sieht"),
            VideoKapitel(ab: 67.2, name: "Zahlungen und Nachweise"),
            VideoKapitel(ab: 80.3, name: "Nach dem Termin"),
            VideoKapitel(ab: 94.1, name: "Dein Geld"),
            VideoKapitel(ab: 101.1, name: "Werbung"),
            VideoKapitel(ab: 114.1, name: "Deine rechtliche Lage"),
            VideoKapitel(ab: 120.8, name: "App auf den Startbildschirm"),
            VideoKapitel(ab: 135.9, name: "Hilfe per WhatsApp"),
        ]
        static let ohneName = "App auf den Startbildschirm"
        /// Bereich, der in der App übersprungen wird (Web-App auf den Startbildschirm legen)
        static let ueberspringen: ClosedRange<Double> = 120.8...135.9
        static var kapitel: [VideoKapitel] { alleKapitel.filter { $0.name != ohneName } }

        /// Index des aktuellen Kapitels (in `kapitel`) zur Zeit t
        static func aktuell(_ t: Double) -> Int {
            var a = 0
            for (i, k) in kapitel.enumerated() where t >= k.ab - 0.2 { a = i }
            return a
        }
    }

    /// Werbevideo (Spiegel von website/public/js/werbung-texte.js, videoText und /media/studio-video/). Nur, falls der Server keinen Text schickt.
    enum Werbevideo {
        static let reel = WerbeVideoDatei(url: "/media/studio-video/reel.mp4", cover: "/media/studio-video/cover.jpg")
        static let feed = WerbeVideoDatei(url: "/media/studio-video/feed.mp4", cover: "/media/studio-video/cover-feed.jpg")
        static let text = "Dein Wunsch-Tattoo – bei uns ganz bequem übers Handy bezahlen 🖤\n\nBei uns kannst du dein Tattoo jetzt ganz einfach per Link oder QR-Code bezahlen: Karte, Apple Pay, Google Pay. \(KlarnaTexte.nameVerfuegbar). Ohne Papierkram.\n\nSprich uns einfach drauf an oder schreib uns eine Nachricht!\n\n\(KlarnaTexte.zusatzStudio) \(KlarnaTexte.warnsatz)\n\nStimme mit KI erstellt"
    }
}
