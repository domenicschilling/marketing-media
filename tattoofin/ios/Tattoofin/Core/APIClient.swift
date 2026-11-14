import Foundation
import OSLog
import UIKit

/// Fehler, wie der Server ihn schickt: {"error":"<Text für die Anzeige>","code":"<maschinenlesbar>"}
struct APIFehler: Error, LocalizedError, Sendable, Equatable {
    var status: Int
    var meldung: String
    var code: String?
    var restVersuche: Int?
    /// Bei code "eingabe": Feldnamen wie im Server (firma, plz, …)
    var felder: [String]? = nil

    var errorDescription: String? { meldung }

    static let keinNetz = APIFehler(status: 0, meldung: Texte.Fehler.keinNetz, code: "netz")
    static let unbekannt = APIFehler(status: 0, meldung: Texte.Fehler.unbekannt, code: "unbekannt")
    static let nichtAngemeldet = APIFehler(status: 401, meldung: Texte.Fehler.nichtAngemeldet, code: "nicht_angemeldet")

    /// Fehlerkörper des Servers lesen
    static func aus(status: Int, daten: Data) -> APIFehler {
        struct Koerper: Decodable { var error: String?; var code: String?; var restVersuche: Int?; var felder: [String]? }
        let k = try? JSONDecoder().decode(Koerper.self, from: daten)
        let text = k?.error?.isEmpty == false ? k!.error! : (status >= 500 ? Texte.Fehler.server : Texte.Fehler.unbekannt)
        return APIFehler(status: status, meldung: text, code: k?.code, restVersuche: k?.restVersuche, felder: k?.felder)
    }
}

/// Text für jeden Fehler (APIFehler oder System)
func fehlerText(_ e: Error) -> String {
    if let a = e as? APIFehler { return a.meldung }
    return Texte.Fehler.unbekannt
}

let log = Logger(subsystem: "de.tattoofin.app", category: "app")

/// Zugriff auf den Tattoofin-Server. Ein Actor, damit Token und Sitzung sicher von überall genutzt werden können.
actor APIClient {
    static let shared = APIClient()

    let basis: URL
    private let session: URLSession
    private var token: String?
    private let appKopf: String

    init() {
        basis = APIClient.basisURL()
        let c = URLSessionConfiguration.ephemeral
        // Die App nutzt nur das Bearer-Token. Keine Cookies (das Web-Dashboard nutzt sie).
        c.httpShouldSetCookies = false
        c.httpCookieAcceptPolicy = .never
        c.httpCookieStorage = nil
        c.urlCache = nil
        c.requestCachePolicy = .reloadIgnoringLocalCacheData
        c.timeoutIntervalForRequest = 25
        c.waitsForConnectivity = false
        session = URLSession(configuration: c)
        let info = Bundle.main.infoDictionary
        let v = info?["CFBundleShortVersionString"] as? String ?? "1.0"
        let b = info?["CFBundleVersion"] as? String ?? "1"
        appKopf = "ios/\(v)(\(b))"
    }

    /// Basis-URL: Startargument -TFApiBase <url> (für Tests) → Info.plist TFApiBasis (Debug localhost, Release tattoofin.de)
    static func basisURL() -> URL {
        if let arg = UserDefaults.standard.string(forKey: "TFApiBase"), let u = URL(string: arg), u.scheme != nil { return u }
        if let s = Bundle.main.object(forInfoDictionaryKey: "TFApiBasis") as? String, let u = URL(string: s), u.scheme != nil { return u }
        #if DEBUG
        return URL(string: "http://localhost:8888")!
        #else
        return URL(string: "https://tattoofin.de")!
        #endif
    }

    static var appVersionText: String {
        let info = Bundle.main.infoDictionary
        return "\(info?["CFBundleShortVersionString"] as? String ?? "1.0") (\(info?["CFBundleVersion"] as? String ?? "1"))"
    }

    func setzeToken(_ t: String?) { token = t }
    var hatToken: Bool { token != nil }

    // MARK: Kern

    private func anfrage(_ methode: String, _ pfad: String, query: [URLQueryItem] = [], koerper: Data? = nil, auth: Bool) -> URLRequest {
        var comp = URLComponents(url: basis.appending(path: pfad), resolvingAgainstBaseURL: false)!
        if !query.isEmpty { comp.queryItems = query }
        var r = URLRequest(url: comp.url!)
        r.httpMethod = methode
        r.setValue("application/json", forHTTPHeaderField: "Accept")
        r.setValue(appKopf, forHTTPHeaderField: "X-TF-App")
        if let koerper {
            r.httpBody = koerper
            r.setValue("application/json; charset=utf-8", forHTTPHeaderField: "Content-Type")
        }
        if auth, let token { r.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        return r
    }

    private func ausfuehren(_ r: URLRequest, auth: Bool) async throws -> (Data, HTTPURLResponse) {
        let daten: Data, antwort: URLResponse
        do {
            (daten, antwort) = try await session.data(for: r)
        } catch is CancellationError {
            throw CancellationError()
        } catch let e as URLError where e.code == .cancelled {
            throw CancellationError()
        } catch {
            log.error("Netzwerk: \(error.localizedDescription, privacy: .public)")
            throw APIFehler.keinNetz
        }
        guard let http = antwort as? HTTPURLResponse else { throw APIFehler.unbekannt }
        if http.statusCode == 401 && auth {
            await sitzungUngueltig()
            throw APIFehler.nichtAngemeldet
        }
        guard (200..<300).contains(http.statusCode) else { throw APIFehler.aus(status: http.statusCode, daten: daten) }
        return (daten, http)
    }

    /// 401: Token löschen und global abmelden
    private func sitzungUngueltig() async {
        guard token != nil else { return }
        token = nil
        KeychainStore.loeschen()
        await MainActor.run { AppState.shared.sitzungAbgelaufen() }
    }

    func senden<T: Decodable & Sendable>(_ methode: String, _ pfad: String, query: [URLQueryItem] = [],
                                         body: (any Encodable & Sendable)? = nil, auth: Bool = true,
                                         als: T.Type = T.self) async throws -> T {
        let koerper = try body.map { try JSONEncoder().encode($0) }
        let (daten, _) = try await ausfuehren(anfrage(methode, pfad, query: query, koerper: koerper, auth: auth), auth: auth)
        do {
            return try JSONDecoder().decode(T.self, from: daten)
        } catch {
            log.error("Antwort nicht lesbar (\(pfad, privacy: .public)): \(String(describing: error), privacy: .public)")
            throw APIFehler.unbekannt
        }
    }

    /// Rohdaten (z. B. PDF)
    func daten(_ pfad: String, query: [URLQueryItem] = []) async throws -> Data {
        var r = anfrage("GET", pfad, query: query, auth: true)
        r.setValue("application/pdf", forHTTPHeaderField: "Accept")
        return try await ausfuehren(r, auth: true).0
    }
}

// MARK: - Endpunkte

extension APIClient {
    // Anmeldung (ohne Auth)
    func codeAnfordern(email: String) async throws -> CodeAntwort {
        struct B: Encodable, Sendable { let email: String; let platform = "ios" }
        return try await senden("POST", "api/app/code", body: B(email: email), auth: false)
    }

    func anmelden(email: String, code: String, geraet: GeraetAngaben) async throws -> AnmeldenAntwort {
        struct B: Encodable, Sendable { let email: String; let code: String; let geraet: GeraetAngaben }
        return try await senden("POST", "api/app/anmelden", body: B(email: email, code: code, geraet: geraet), auth: false)
    }

    func anmelden(auswahlToken: String, studioId: String, geraet: GeraetAngaben) async throws -> AnmeldenAntwort {
        struct B: Encodable, Sendable { let auswahlToken: String; let studioId: String; let geraet: GeraetAngaben }
        return try await senden("POST", "api/app/anmelden", body: B(auswahlToken: auswahlToken, studioId: studioId, geraet: geraet), auth: false)
    }

    func abmelden() async throws {
        struct B: Encodable, Sendable {}
        let _: OK = try await senden("POST", "api/app/abmelden", body: B())
    }

    // Portal
    func portal() async throws -> PortalAntwort { try await senden("GET", "api/portal") }

    struct NeueZahlung: Encodable, Sendable {
        var betrag: String
        var art: String               // gesamt | anzahlung | gutschein
        var kunde: String?
        var email: String?
        var beschreibung: String?
        var sitzungen: String?
        var empfaenger: String?
        var nachricht: String?
        /// Nur bei Art „gesamt“: Kunde wird heute im Studio tätowiert (steht dann so beim Bezahlen)
        var heute: Bool? = nil
    }

    func zahlungErstellen(_ z: NeueZahlung) async throws -> ZahlungErstellt {
        try await senden("POST", "api/portal/zahlung", body: z)
    }

    func zahlung(_ id: String, abgleich: Bool = false) async throws -> ZahlungEinzeln {
        try await senden("GET", "api/portal/zahlung/\(id)", query: abgleich ? [URLQueryItem(name: "abgleich", value: "1")] : [])
    }

    func stornieren(_ id: String) async throws -> Zahlung {
        try await senden("DELETE", "api/portal/zahlung/\(id)")
    }

    func leistungsbestaetigung(_ id: String) async throws -> LinkAntwort {
        struct B: Encodable, Sendable {}
        return try await senden("POST", "api/portal/bestaetigung/\(id)", body: B())
    }

    func kontoStatus() async throws -> Studio {
        struct B: Encodable, Sendable {}
        return try await senden("POST", "api/portal/konto-status", body: B())
    }

    func ueberallAbmelden() async throws {
        struct B: Encodable, Sendable {}
        let _: OK = try await senden("POST", "api/portal/abmelden", body: B())
    }

    /// Nur Demo-Studio (App-Prüfung): Testzahlung ohne Geld, damit „bezahlt“ und die Mitteilung zu sehen sind
    func demoZahlung(_ id: String) async throws -> Zahlung {
        struct B: Encodable, Sendable {}
        return try await senden("POST", "api/app/demo-zahlung/\(id)", body: B())
    }

    // Gutscheine
    func gutscheinSuchen(code: String) async throws -> Zahlung {
        try await senden("GET", "api/portal/gutschein-code", query: [URLQueryItem(name: "code", value: code)])
    }

    func gutscheinSuchen(token: String) async throws -> Zahlung {
        try await senden("GET", "api/portal/gutschein-code", query: [URLQueryItem(name: "t", value: token)])
    }

    func gutscheinEinloesen(_ id: String, notiz: String?) async throws -> Zahlung {
        struct B: Encodable, Sendable { let notiz: String? }
        return try await senden("POST", "api/portal/gutschein/\(id)/einloesen", body: B(notiz: notiz))
    }

    func gutscheinEinloesungZuruecknehmen(_ id: String) async throws -> Zahlung {
        try await senden("DELETE", "api/portal/gutschein/\(id)/einloesen")
    }

    func gutscheinSenden(_ id: String) async throws -> GesendetAntwort {
        struct B: Encodable, Sendable {}
        return try await senden("POST", "api/portal/gutschein/\(id)/senden", body: B())
    }

    func gutscheinPDF(_ id: String) async throws -> Data {
        try await daten("api/portal/gutschein/\(id)/pdf")
    }

    // Auszahlungen
    func auszahlungen(nach: String? = nil, limit: Int = 20) async throws -> AuszahlungenAntwort {
        var q = [URLQueryItem(name: "limit", value: String(limit))]
        if let nach { q.append(URLQueryItem(name: "nach", value: nach)) }
        return try await senden("GET", "api/app/auszahlungen", query: q)
    }

    // Geräte, Push
    func geraete() async throws -> [Geraet] {
        let a: GeraeteAntwort = try await senden("GET", "api/app/geraete")
        return a.geraete
    }

    func geraetAbmelden(_ id: String) async throws {
        let _: OK = try await senden("DELETE", "api/app/geraete/\(id)")
    }

    struct GeraetAenderung: Encodable, Sendable {
        var name: String?
        var mitteilungen: Mitteilungen?
        var kundennameInMitteilung: Bool?
    }

    func geraetAendern(_ a: GeraetAenderung) async throws -> Geraet {
        let r: GeraetAntwort = try await senden("PATCH", "api/app/geraet", body: a)
        return r.geraet
    }

    func pushTokenSenden(_ token: String, umgebung: String) async throws -> PushAntwort {
        struct B: Encodable, Sendable { let token: String; let platform = "ios"; let umgebung: String }
        return try await senden("PUT", "api/app/push", body: B(token: token, umgebung: umgebung))
    }

    func pushTest() async throws -> PushTestAntwort {
        struct B: Encodable, Sendable {}
        return try await senden("POST", "api/app/push/test", body: B())
    }

    // Team
    func team() async throws -> TeamAntwort { try await senden("GET", "api/app/team") }

    func teamSpeichern(_ emails: [String], alleAbmelden: Bool) async throws -> TeamAntwort {
        struct B: Encodable, Sendable { let emails: [String]; let alleAbmelden: Bool }
        return try await senden("PUT", "api/app/team", body: B(emails: emails, alleAbmelden: alleAbmelden))
    }

    func eigenenZugangEntfernen() async throws {
        let _: OK = try await senden("DELETE", "api/app/team/ich")
    }

    // Neues Studio anlegen (ohne Auth)
    func registrierenCode(email: String) async throws -> CodeAntwort {
        struct B: Encodable, Sendable { let email: String; let platform = "ios" }
        return try await senden("POST", "api/app/registrieren/code", body: B(email: email), auth: false)
    }

    func registrierenPruefen(email: String, code: String, geraet: GeraetAngaben) async throws -> RegistrierenPruefenAntwort {
        struct B: Encodable, Sendable { let email: String; let code: String; let geraet: GeraetAngaben }
        return try await senden("POST", "api/app/registrieren/pruefen", body: B(email: email, code: code, geraet: geraet), auth: false)
    }

    struct Registrierung: Encodable, Sendable {
        var registrierToken: String
        var firma: String
        var inhaber: String
        var strasse: String
        var plz: String
        var ort: String
        var telefon: String
        var studioTelefon: String
        var ustid: String
        var website: String
        var unterzeichner: String
        var akzeptiert: Bestaetigungen

        init(registrierToken: String, daten d: StudioDaten, akzeptiert: Bestaetigungen) {
            self.registrierToken = registrierToken
            firma = d.bereinigt(.firma)
            inhaber = d.bereinigt(.inhaber)
            strasse = d.bereinigt(.strasse)
            plz = d.bereinigt(.plz)
            ort = d.bereinigt(.ort)
            telefon = d.bereinigt(.telefon)
            studioTelefon = d.bereinigt(.studioTelefon)
            ustid = d.bereinigt(.ustid)
            website = d.bereinigt(.website)
            unterzeichner = d.bereinigt(.unterzeichner)
            self.akzeptiert = akzeptiert
        }
    }

    func registrieren(_ r: Registrierung) async throws -> RegistrierenAntwort {
        try await senden("POST", "api/app/registrieren", body: r, auth: false)
    }

    // Apple-Abo
    /// Neues Studio: Kauf bestätigen (Entwurf → Studio, Antwort mit Token)
    func aboBestaetigen(entwurfToken: String, signedTransaction: String, geraet: GeraetAngaben) async throws -> AboBestaetigtAntwort {
        struct B: Encodable, Sendable { let entwurfToken: String; let signedTransaction: String; let geraet: GeraetAngaben }
        return try await senden("POST", "api/app/abo/bestaetigen",
                                body: B(entwurfToken: entwurfToken, signedTransaction: signedTransaction, geraet: geraet), auth: false)
    }

    /// Angemeldeter Inhaber: abgelaufenes Abo neu abgeschlossen
    func aboErneuern(signedTransaction: String) async throws -> AboBestaetigtAntwort {
        struct B: Encodable, Sendable { let signedTransaction: String }
        return try await senden("POST", "api/app/abo/bestaetigen", body: B(signedTransaction: signedTransaction))
    }

    func aboWiederherstellen(signedTransactions: [String]) async throws -> WiederherstellenAntwort {
        struct B: Encodable, Sendable { let signedTransactions: [String] }
        return try await senden("POST", "api/app/abo/wiederherstellen", body: B(signedTransactions: Array(signedTransactions.prefix(10))), auth: false)
    }

    func aboAktualisieren(signedTransaction: String) async throws -> AboAktualisiertAntwort {
        struct B: Encodable, Sendable { let signedTransaction: String }
        return try await senden("POST", "api/app/abo/aktualisieren", body: B(signedTransaction: signedTransaction))
    }

    // Konto löschen
    func kontoLoeschen(grund: String?) async throws -> KontoLoeschenAntwort {
        struct B: Encodable, Sendable { let bestaetigung = "LÖSCHEN"; let grund: String? }
        return try await senden("POST", "api/app/konto-loeschen", body: B(grund: grund))
    }
}

/// Angaben zu diesem Gerät für die Geräteliste
enum GeraetInfo {
    @MainActor
    static func angaben() -> GeraetAngaben {
        GeraetAngaben(name: String(UIDevice.current.name.prefix(60)), modell: modell(), platform: "ios",
                      osVersion: UIDevice.current.systemVersion, appVersion: APIClient.appVersionText)
    }

    /// „iPhone17,1“ (im Simulator die Kennung des simulierten Geräts)
    static func modell() -> String {
        if let sim = ProcessInfo.processInfo.environment["SIMULATOR_MODEL_IDENTIFIER"] { return sim }
        var u = utsname()
        uname(&u)
        let kennung = withUnsafeBytes(of: &u.machine) { roh in
            String(decoding: roh.prefix(while: { $0 != 0 }), as: UTF8.self)
        }
        return String(kennung.prefix(40))
    }
}
