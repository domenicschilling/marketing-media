import Foundation

/// Was die App über die Anmeldung weiß (nicht geheim; das Token liegt im Schlüsselbund).
struct SitzungInfo: Codable, Sendable, Equatable {
    var geraetId: String
    var rolle: String          // "inhaber" | "team"
    var studioId: String
    var firma: String
    var email: String

    var istInhaber: Bool { rolle == "inhaber" }
}

/// Lokale Einstellungen (UserDefaults). Nur Komfort-Werte, nichts Geheimes.
enum Einstellungen {
    private static var d: UserDefaults { .standard }
    private enum K {
        static let installiert = "tf.installiert"
        static let faceID = "tf.faceID"
        static let einrichtungFertig = "tf.einrichtungFertig"
        static let pushToken = "tf.pushToken"
        static let zahlseite = "tf.zahlseite"
        static let studioName = "tf.studioName"
        static let sitzung = "tf.sitzung"
        static let kasseEntwurf = "tf.kasseEntwurf"
        static let aboAbgleichAm = "tf.aboAbgleichAm"
    }

    /// Schlüsselbund-Einträge überleben eine Neuinstallation. Beim allerersten Start nach der Installation
    /// deshalb einen alten Eintrag löschen (UserDefaults wird bei der Deinstallation mit gelöscht).
    static func ersterStartAufraeumen() {
        guard !d.bool(forKey: K.installiert) else { return }
        KeychainStore.loeschen()
        RegistrierungSpeicher.loeschen()
        d.set(true, forKey: K.installiert)
    }

    static var faceIDAn: Bool {
        get { d.bool(forKey: K.faceID) }
        set { d.set(newValue, forKey: K.faceID) }
    }

    static var einrichtungFertig: Bool {
        get { d.bool(forKey: K.einrichtungFertig) }
        set { d.set(newValue, forKey: K.einrichtungFertig) }
    }

    static var pushToken: String? {
        get { d.string(forKey: K.pushToken) }
        set { d.set(newValue, forKey: K.pushToken) }
    }

    /// Theken-QR ohne Netz: Adresse der Zahlseite und Studioname merken
    static var zahlseite: String? {
        get { d.string(forKey: K.zahlseite) }
        set { d.set(newValue, forKey: K.zahlseite) }
    }

    static var studioName: String? {
        get { d.string(forKey: K.studioName) }
        set { d.set(newValue, forKey: K.studioName) }
    }

    static var sitzung: SitzungInfo? {
        get { d.data(forKey: K.sitzung).flatMap { try? JSONDecoder().decode(SitzungInfo.self, from: $0) } }
        set { d.set(newValue.flatMap { try? JSONEncoder().encode($0) }, forKey: K.sitzung) }
    }

    static var kasseEntwurf: KasseEntwurf? {
        get { d.data(forKey: K.kasseEntwurf).flatMap { try? JSONDecoder().decode(KasseEntwurf.self, from: $0) } }
        set { d.set(newValue.flatMap { try? JSONEncoder().encode($0) }, forKey: K.kasseEntwurf) }
    }

    /// Letzter Abgleich des Apple-Abos mit dem Server (höchstens alle 6 Stunden)
    static var aboAbgleichAm: Date? {
        get { d.object(forKey: K.aboAbgleichAm) as? Date }
        set { d.set(newValue, forKey: K.aboAbgleichAm) }
    }

    /// Beim Abmelden: alles Studio-Bezogene vergessen (Merker „installiert“ bleibt).
    static func abmelden() {
        for k in [K.faceID, K.einrichtungFertig, K.zahlseite, K.studioName, K.sitzung, K.kasseEntwurf, K.aboAbgleichAm] {
            d.removeObject(forKey: k)
        }
    }
}

/// Entwurf an der Kasse: bleibt bis zum Absenden erhalten (auch wenn die App beendet wird).
struct KasseEntwurf: Codable, Sendable, Equatable {
    var betrag: String = ""
    var anzahlung: Bool = false
    var kunde: String = ""
    var email: String = ""
    var beschreibung: String = ""
    var sitzungen: String = ""

    var istLeer: Bool { self == KasseEntwurf() }
}
