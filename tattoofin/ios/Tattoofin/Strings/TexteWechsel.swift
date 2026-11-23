import Foundation

// Texte für den Studio-Wechsel (Version 1.2, Auftrag Domenic 23.11.2026).
// Gleiche Regeln wie Texte.swift: Deutsch, du-Form, kurz.

extension Texte {
    enum Wechsel {
        static let knopf = "Studio wechseln"
        static func knopfHinweis(_ aktuell: String) -> String { "Aktuell: \(aktuell). Öffnet die Liste deiner Studios." }
        static let titel = "Studio wechseln"
        static func angemeldetAls(_ email: String) -> String { "Angemeldet als \(email)" }
        static let fussnote = "Du wechselst ohne neuen Code. Mitteilungen kommen aus allen deinen Studios, mit dem Namen des Studios."
        static let aktuell = "Aktuell"
        static let rolleInhaber = "Inhaber"
        static let rolleTeam = "Team"
        static func zeile(ort: String, rolle: String) -> String { [ort, rolle].filter { !$0.isEmpty }.joined(separator: " · ") }
        static let wechselt = "Wechselt …"
        static func gewechselt(_ firma: String) -> String { "Du bist jetzt in \(firma)." }
        static let schliessen = "Fertig"
        static let ohneNetz = "Ohne Internet siehst du die zuletzt geladene Liste. Studios, in denen du auf diesem iPhone noch nicht warst, gehen erst mit Internet."

        // Abmelden mit mehreren Studios
        static let abmeldenTitel = "Wo möchtest du dich abmelden?"
        static func nurHier(_ firma: String) -> String { "Nur bei \(firma)" }
        static let ueberall = "Bei allen Studios"
        static let abmeldenText = "„Nur hier“ meldet dieses iPhone nur in diesem Studio ab. Die anderen Studios bleiben angemeldet."
        static func nurHierAbgemeldet(_ firma: String) -> String { "Du bist bei \(firma) abgemeldet. Über „Studio wechseln“ kommst du jederzeit wieder hinein." }
        static func nichtMehrAngemeldet(_ firma: String) -> String { "Für \(firma) bist du nicht mehr angemeldet (zum Beispiel wurde deine Adresse aus dem Team entfernt)." }
        static let hinweisTitel = "Studio gewechselt"
    }
}
