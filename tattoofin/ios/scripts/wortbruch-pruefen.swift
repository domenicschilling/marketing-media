// Automatische Wortbruch-Prüfung für die Fotos des Gestaltungs-Rundgangs (Abnahme 1.1, Runde 3).
// Liest jedes Foto per Texterkennung (Vision, Deutsch) und meldet Zeilen, die mitten im Wort umbrechen,
// z. B. „Hauptadress/e“, „Auszahlunge/n“, „Abmel/den“.
//
// Regel: Zwei Zeilen desselben Textblocks (untereinander, gleiche linke Kante). Endet die obere Zeile mit einem
// Wortstück X und beginnt die untere mit Y, ist das ein Wortbruch, wenn „XY“ ein Wort aus den App-Texten ist,
// X allein aber nicht (und die Zeile nicht mit Bindestrich endet).
//
// Aufruf: swift scripts/wortbruch-pruefen.swift <bildordner> [<muster>]
// Ausgabe: je Fund eine Zeile „WORTBRUCH: <bild>: X/Y“; Exit-Code 1, wenn etwas gefunden wurde.
import Foundation
import Vision
import AppKit

let args = CommandLine.arguments
guard args.count >= 2 else { print("Aufruf: swift wortbruch-pruefen.swift <bildordner> [<muster>]"); exit(2) }
let ordner = URL(fileURLWithPath: args[1])
let muster = args.count > 2 ? args[2] : ""

// Wortschatz: alle Wörter aus den App-Texten (Strings/*.swift) und Swift-Quellen der Features
let wurzel = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent()
var wortschatz = Set<String>()
let anfuehrung = try! Regex(#""([^"\n]*)""#)
let fm = FileManager.default
for unter in ["Tattoofin/Strings", "Tattoofin/Features", "Tattoofin/Resources/WebKit"] {
    guard let e = fm.enumerator(at: wurzel.appending(path: unter), includingPropertiesForKeys: nil) else { continue }
    for case let u as URL in e where ["swift", "js"].contains(u.pathExtension) {
        guard let t = try? String(contentsOf: u, encoding: .utf8) else { continue }
        // Nur Texte in Anführungszeichen (keine Kommentare: dort stehen absichtlich Bruchstücke wie „voraussichtlic/h“)
        for m in t.matches(of: anfuehrung) {
            guard let teil = m.output[1].substring else { continue }
            for w in teil.split(whereSeparator: { !$0.isLetter }) where w.count >= 4 { wortschatz.insert(w.lowercased()) }
        }
    }
}

func zeilen(_ url: URL) -> [(text: String, rect: CGRect)] {
    guard let bild = NSImage(contentsOf: url), let cg = bild.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return [] }
    let anfrage = VNRecognizeTextRequest()
    anfrage.recognitionLanguages = ["de-DE"]
    anfrage.recognitionLevel = .accurate
    anfrage.usesLanguageCorrection = false
    try? VNImageRequestHandler(cgImage: cg).perform([anfrage])
    return (anfrage.results ?? []).compactMap { o in
        guard let t = o.topCandidates(1).first?.string else { return nil }
        // Vision: Ursprung unten links, normiert → oben links
        let r = o.boundingBox
        return (t, CGRect(x: r.minX, y: 1 - r.maxY, width: r.width, height: r.height))
    }
}

var funde = 0
let dateien = (try? fm.contentsOfDirectory(at: ordner, includingPropertiesForKeys: nil)) ?? []
for url in dateien.filter({ $0.pathExtension == "png" && $0.lastPathComponent.hasPrefix(muster) }).sorted(by: { $0.lastPathComponent < $1.lastPathComponent }) {
    let z = zeilen(url).sorted { $0.rect.minY < $1.rect.minY }
    // Regel 2: Zeile endet mit einem Stück, das nur der Anfang eines App-Worts ist (1–4 Buchstaben fehlen),
    // z. B. „Abmel“ bei nebeneinanderstehenden Knöpfen
    for a in z {
        guard let letzter = a.text.split(separator: " ").last else { continue }
        let x = String(letzter).trimmingCharacters(in: CharacterSet.letters.inverted)
        // Kein Kleintext in Bildern (Werbe-Vorschauen) und keine Großbuchstaben-Zeilen (Schmuckschrift in Bildern)
        guard a.rect.height >= 0.016, x != x.uppercased() else { continue }
        guard x.count >= 4, a.text.last?.isLetter == true, !wortschatz.contains(x.lowercased()) else { continue }
        let k = x.lowercased()
        if let w = wortschatz.first(where: { $0.hasPrefix(k) && (1...4).contains($0.count - k.count) }) {
            print("WORTBRUCH: \(url.lastPathComponent): \(x)/… (wohl „\(w)“)")
            funde += 1
        }
    }
    for (i, a) in z.enumerated() {
        // passende Folgezeile: direkt darunter, gleiche linke Kante (oder beide mittig)
        guard let b = z[(i + 1)...].first(where: { b in
            let abstand = b.rect.minY - a.rect.maxY
            let links = abs(b.rect.minX - a.rect.minX) < 0.03
            let mitte = abs(b.rect.midX - a.rect.midX) < 0.03
            return abstand > -0.005 && abstand < a.rect.height * 0.9 && (links || mitte)
        }) else { continue }
        let oben = a.text.trimmingCharacters(in: .whitespaces)
        guard let letzter = oben.split(separator: " ").last, let ende = oben.last, ende.isLetter else { continue }
        let x = String(letzter).trimmingCharacters(in: CharacterSet.letters.inverted)
        guard let ersterTeil = b.text.split(separator: " ").first else { continue }
        let y = String(ersterTeil).trimmingCharacters(in: CharacterSet.letters.inverted)
        guard !x.isEmpty, !y.isEmpty, let yErst = y.first, yErst.isLowercase else { continue }
        let ganz = (x + y).lowercased()
        if wortschatz.contains(ganz) && !wortschatz.contains(x.lowercased()) {
            print("WORTBRUCH: \(url.lastPathComponent): \(x)/\(y)")
            funde += 1
        }
    }
}
print("Wortbruch-Prüfung: \(funde) Fund(e)")
exit(funde > 0 ? 1 : 0)
