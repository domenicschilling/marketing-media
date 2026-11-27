import Foundation

// Texte für Gutschein-Wert, Bonus und Teil-Einlösung (App 1.1, 23.11.2026).
// Gleiche Regeln wie Texte.swift: Deutsch, du-Form, kurz, ohne Fachwörter. Wortlaut wie im Web (public/js/app.js, Gutschein-Detail).

extension Texte {
    enum GutscheinWert {
        /// Text-Knopf oben rechts in Gutscheine (VoiceOver: „Gutschein verkaufen“)
        static let verkaufenKurz = "Verkaufen"
        /// Liste und Detail: unter dem Wert, wenn der bezahlte Betrag abweicht
        static func bezahlt(_ cent: Int) -> String { "bezahlt \(Euro.text(cent))" }
        static let bezahltTitel = "Bezahlt"
        static let wertTitel = "Wert"
        /// Wie im Web: „2.000,00 € bis 31.03.2027, danach 1.500,00 €“
        static func bonusZeile(wert: Int, bis: String, danach: Int) -> String {
            "\(Euro.text(wert)) bis \(bis), danach \(Euro.text(danach))"
        }
        static let heuteEinloesbar = "Heute einlösbar"
        static func heuteEinloesbarZeile(_ cent: Int) -> String { "Heute einlösbar: \(Euro.text(cent))" }
        static let bonusVorbei = "Bonus-Frist vorbei"

        // Einlösen im Ganzen (ohne Teil-Einlösung)
        static func einloesenGanz(_ cent: Int) -> String { "\(Euro.text(cent)) werden eingelöst. Teil-Einlösung gibt es hier nicht." }

        // Teil-Einlösung (nur, wenn der Server sie kann)
        static let blattTitel = "Gutschein einlösen"
        static func noch(_ cent: Int) -> String { "Noch einlösbar: \(Euro.text(cent))" }
        static let betrag = "Betrag (leer = alles)"
        static let betragHinweis = "Lass das Feld leer, um alles einzulösen. Der Rest bleibt auf dem Gutschein."
        static func allesEinloesen(_ cent: Int) -> String { "Alles einlösen (\(Euro.text(cent)))" }
        static func betragEinloesen(_ cent: Int) -> String { "\(Euro.text(cent)) einlösen" }
        static let fehlerUngueltig = "Bitte einen Betrag wie 12,50 eingeben."
        static let fehlerNull = "Bitte einen Betrag über 0 € eingeben."
        static func fehlerZuViel(_ rest: Int) -> String { "Auf dem Gutschein sind nur noch \(Euro.text(rest)) einlösbar." }
        static let teileTitel = "Schon eingelöst"
        static func teilZeile(_ cent: Int, am: String?) -> String { am.map { "\(Euro.text(cent)) am \($0)" } ?? Euro.text(cent) }
        static let letzteZuruecknehmen = "Letzte Einlösung zurücknehmen"
        static func letzteZuruecknehmenFrage(_ cent: Int) -> String { "Die letzte Einlösung über \(Euro.text(cent)) zurücknehmen?" }

        // Nach dem Einlösen
        static func eingeloest(_ cent: Int) -> String { "Eingelöst: \(Euro.text(cent))" }
        static func eingeloestRest(_ rest: Int) -> String { "Eingelöst. Rest: \(Euro.text(rest))" }
        static let zurueckgenommen = "Zurückgenommen."

        // Suche: Code nicht gefunden
        static let nichtGefunden = "Kein Gutschein mit diesem Code. Gutscheine anderer Studios findest du hier nicht."

        // Leere Liste ohne fertige Kasse
        static let leerOhneKasse = "Gutscheine verkaufen kannst du, sobald deine Kasse bereit ist. Was noch fehlt, siehst du in der Kasse."
        static let zurKasse = "Zur Kasse"

        // Scanner ohne Kamera-Erlaubnis
        static let kameraErlauben = "Kamera erlauben"
        static let kameraErlaubenHinweis = "Öffnet die Einstellungen dieser App"
    }
}
