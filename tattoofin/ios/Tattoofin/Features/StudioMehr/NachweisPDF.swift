import SwiftUI
import UIKit

/// Nachweis zur Zahlung als PDF (wie nachweis.html), gezeichnet auf dem iPhone aus GET /api/portal/nachweis/:id.
/// A4, mehrseitig, mit Unterschrift und Foto der Leistungsbestätigung. Geteilt wird eine Datei im temporären Ordner.
enum NachweisPDF {
    private enum Block {
        case titel(String)
        case unter(String)
        case ueberschrift(String)
        case absatz(String)
        case klein(String)
        case zeilen([(String, String)])
        case zitat(String)
        case bild(UIImage, maxHoehe: CGFloat)
    }

    private static func inhalt(_ d: NachweisAntwort) -> [Block] {
        let T = Texte.Nachweis.self
        let z = d.zahlung, s = d.studio, k = z.kundeBestaetigt, l = d.leistung
        let zeit: (String?) -> String = { Datum.tagUhrzeit($0) ?? "–" }
        var b: [Block] = [
            .klein(T.einleitung),
            .titel(T.titel),
            .unter(T.kopf(zeit(d.erstellt), z.id)),
            .ueberschrift(T.studio),
            .zeilen([(T.studio, s?.firma ?? ""), (T.inhaber, s?.inhaber ?? ""),
                     (T.adresse, [s?.strasse, [s?.plz, s?.ort].verbunden(" ")].verbunden(", "))]),
            .ueberschrift(T.zahlung),
            .zeilen([(T.kunde, z.kunde?.leerAlsNil ?? "–"), (T.email, z.email ?? ""), (T.betrag, z.betragCent.map(Euro.text) ?? ""),
                     (T.projekt, z.beschreibung ?? ""), (T.sitzungen, z.sitzungen ?? ""),
                     (T.art, z.art == "anzahlung" || z.anzahlung == true ? T.anzahlung : T.zahlungArt),
                     (T.status, z.status ?? ""), (T.bezahltAm, z.bezahltAm.flatMap(Datum.tagUhrzeit) ?? ""),
                     (T.zahlart, z.zahlartText ?? ""), (T.stripeZahlung, z.paymentIntentId ?? "")]),
        ]
        var nr = 1
        b.append(.ueberschrift("\(nr). \(T.beimBezahlen)"))
        if let k {
            b.append(.absatz(T.beimBezahlenText(zeit(k.am), k.version ?? "")))
            b.append(.zitat(k.inhalt ?? ""))
            if let ip = k.ip?.leerAlsNil { b.append(.klein(T.ip(ip))) }
        } else {
            b.append(.absatz(T.beimBezahlenKeine))
        }
        if let bed = z.bedingungen {
            nr += 1
            b.append(.ueberschrift("\(nr). \(T.bedingungen)"))
            b.append(.absatz(T.bedingungenAm(zeit(bed.akzeptiertAm))))
            b.append(.zitat(bed.text ?? ""))
        }
        nr += 1
        b.append(.ueberschrift("\(nr). \(T.leistung)"))
        if let l {
            let termin = l.datum.flatMap { Datum.tag($0) } ?? (l.datum ?? "")
            b.append(.absatz(T.leistungText(zeit(l.am), l.name ?? "", termin, l.version ?? "")))
            b.append(.zitat(l.text ?? ""))
            if let u = bild(l.unterschrift) {
                b.append(.absatz(T.unterschrift))
                b.append(.bild(u, maxHoehe: 110))
            }
            if let f = bild(l.foto) {
                b.append(.absatz(T.foto(l.fotoEinwilligung ?? "")))
                b.append(.bild(f, maxHoehe: 260))
            }
            if let ip = l.ip?.leerAlsNil { b.append(.klein(T.ip(ip))) }
        } else {
            b.append(.absatz(T.leistungKeine))
        }
        b.append(.klein(T.schluss))
        return b
    }

    /// data:image/…;base64,… → Bild
    static func bild(_ dataURL: String?) -> UIImage? {
        guard let s = dataURL, s.hasPrefix("data:image/"), let komma = s.firstIndex(of: ",") else { return nil }
        guard let daten = Data(base64Encoded: String(s[s.index(after: komma)...]), options: .ignoreUnknownCharacters) else { return nil }
        return UIImage(data: daten)
    }

    // MARK: Zeichnen

    static let seite = CGRect(x: 0, y: 0, width: 595.2, height: 841.8)   // A4 in Punkt
    static let rand: CGFloat = 50

    static func daten(_ d: NachweisAntwort) -> Data {
        let liste = inhalt(d)
        let format = UIGraphicsPDFRendererFormat()
        format.documentInfo = [kCGPDFContextTitle as String: Texte.Nachweis.titel, kCGPDFContextCreator as String: "Tattoofin"]
        let r = UIGraphicsPDFRenderer(bounds: seite, format: format)
        return r.pdfData { ctx in
            var y = neueSeite(ctx)
            let breite = seite.width - 2 * rand
            for b in liste {
                switch b {
                case .titel(let t): y = text(ctx, t, schrift(22, .bold), y: y, breite: breite, abstand: 4)
                case .unter(let t): y = text(ctx, t, schrift(10), farbe: .darkGray, y: y, breite: breite, abstand: 10)
                case .ueberschrift(let t):
                    y = platz(ctx, y, 40)
                    y = text(ctx, t, schrift(14, .bold), y: y + 8, breite: breite, abstand: 6)
                case .absatz(let t): y = text(ctx, t, schrift(11), y: y, breite: breite, abstand: 6)
                case .klein(let t): y = text(ctx, t, schrift(8.5), farbe: .darkGray, y: y + 2, breite: breite, abstand: 6)
                case .zitat(let t):
                    let a = attributiert(t, schrift(10.5))
                    let h = hoehe(a, breite: breite - 16)
                    y = platz(ctx, y, min(h + 12, seite.height - 2 * rand))
                    let kasten = CGRect(x: rand, y: y, width: breite, height: h + 12)
                    UIColor(white: 0.95, alpha: 1).setFill()
                    UIBezierPath(rect: kasten).fill()
                    UIColor(red: 0.98, green: 0.70, blue: 0.09, alpha: 1).setFill()
                    UIBezierPath(rect: CGRect(x: rand, y: y, width: 3, height: h + 12)).fill()
                    a.draw(with: CGRect(x: rand + 10, y: y + 6, width: breite - 16, height: h), options: [.usesLineFragmentOrigin], context: nil)
                    y += h + 18
                case .zeilen(let paare):
                    for (k, v) in paare where !v.isEmpty {
                        let links = attributiert(k, schrift(10.5, .semibold), farbe: .darkGray)
                        let rechts = attributiert(v, schrift(10.5))
                        let h = max(hoehe(links, breite: 130), hoehe(rechts, breite: breite - 140))
                        y = platz(ctx, y, h + 4)
                        links.draw(with: CGRect(x: rand, y: y, width: 130, height: h), options: [.usesLineFragmentOrigin], context: nil)
                        rechts.draw(with: CGRect(x: rand + 140, y: y, width: breite - 140, height: h), options: [.usesLineFragmentOrigin], context: nil)
                        y += h + 4
                        UIColor(white: 0.88, alpha: 1).setFill()
                        UIBezierPath(rect: CGRect(x: rand, y: y - 2, width: breite, height: 0.5)).fill()
                    }
                    y += 6
                case .bild(let bild, let maxH):
                    let f = min(1, maxH / max(bild.size.height, 1), (breite * 0.6) / max(bild.size.width, 1))
                    let groesse = CGSize(width: bild.size.width * f, height: bild.size.height * f)
                    y = platz(ctx, y, groesse.height + 8)
                    let rahmen = CGRect(origin: CGPoint(x: rand, y: y), size: groesse)
                    UIColor.white.setFill()
                    UIBezierPath(rect: rahmen).fill()
                    bild.draw(in: rahmen)
                    UIColor(white: 0.8, alpha: 1).setStroke()
                    UIBezierPath(rect: rahmen).stroke()
                    y += groesse.height + 10
                }
            }
        }
    }

    private static func neueSeite(_ ctx: UIGraphicsPDFRendererContext) -> CGFloat {
        ctx.beginPage()
        return rand
    }

    /// Neue Seite, wenn `h` nicht mehr passt
    private static func platz(_ ctx: UIGraphicsPDFRendererContext, _ y: CGFloat, _ h: CGFloat) -> CGFloat {
        y + h > seite.height - rand ? neueSeite(ctx) : y
    }

    private static func schrift(_ g: CGFloat, _ w: UIFont.Weight = .regular) -> UIFont { .systemFont(ofSize: g, weight: w) }

    private static func attributiert(_ t: String, _ f: UIFont, farbe: UIColor = .black) -> NSAttributedString {
        let p = NSMutableParagraphStyle()
        p.lineBreakMode = .byWordWrapping
        p.lineSpacing = 1.5
        return NSAttributedString(string: t, attributes: [.font: f, .foregroundColor: farbe, .paragraphStyle: p])
    }

    private static func hoehe(_ a: NSAttributedString, breite: CGFloat) -> CGFloat {
        ceil(a.boundingRect(with: CGSize(width: breite, height: .greatestFiniteMagnitude), options: [.usesLineFragmentOrigin], context: nil).height)
    }

    /// Text mit Seitenumbruch (lange Texte werden zeilenweise auf die nächste Seite verteilt)
    private static func text(_ ctx: UIGraphicsPDFRendererContext, _ t: String, _ f: UIFont, farbe: UIColor = .black,
                             y start: CGFloat, breite: CGFloat, abstand: CGFloat) -> CGFloat {
        var y = start
        var rest = t
        while !rest.isEmpty {
            let a = attributiert(rest, f, farbe: farbe)
            let h = hoehe(a, breite: breite)
            let frei = seite.height - rand - y
            if h <= frei {
                a.draw(with: CGRect(x: rand, y: y, width: breite, height: h), options: [.usesLineFragmentOrigin], context: nil)
                return y + h + abstand
            }
            // Passt nicht: so viele Wörter wie möglich auf diese Seite, Rest auf die nächste
            let woerter = rest.split(separator: " ", omittingEmptySubsequences: false)
            var teil = 0
            for i in stride(from: woerter.count, through: 1, by: -1) {
                let probe = woerter.prefix(i).joined(separator: " ")
                if hoehe(attributiert(probe, f, farbe: farbe), breite: breite) <= frei { teil = i; break }
            }
            if teil == 0 { y = neueSeite(ctx); continue }
            let oben = woerter.prefix(teil).joined(separator: " ")
            attributiert(oben, f, farbe: farbe).draw(with: CGRect(x: rand, y: y, width: breite, height: frei), options: [.usesLineFragmentOrigin], context: nil)
            rest = woerter.dropFirst(teil).joined(separator: " ")
            y = neueSeite(ctx)
        }
        return y + abstand
    }

    /// Fertiges PDF vom Server (gleich wie im Web). Ältere Server ohne ?pdf=1 liefern JSON: dann zeichnet die App das PDF selbst.
    static func holen(_ zahlungId: String) async throws -> URL {
        if let pdf = try? await APIClient.shared.nachweisPDF(zahlungId), pdf.starts(with: Data("%PDF".utf8)) {
            return try datei(pdf, id: zahlungId)
        }
        let d = try await APIClient.shared.nachweis(zahlungId)
        return try datei(daten(d), id: d.zahlung.id)
    }

    /// PDF in eine temporäre Datei schreiben (zum Teilen mit Dateiname). Wird nach dem Teilen gelöscht.
    static func datei(_ pdf: Data, id: String) throws -> URL {
        let ordner = FileManager.default.temporaryDirectory.appending(path: "nachweise", directoryHint: .isDirectory)
        try FileManager.default.createDirectory(at: ordner, withIntermediateDirectories: true)
        let ziel = ordner.appending(path: Texte.Nachweis.dateiname(id))
        try pdf.write(to: ziel, options: [.atomic, .completeFileProtection])
        return ziel
    }
}

/// Knopf „Nachweis als PDF teilen“ im Zahlungsdetail (nur bezahlte Zahlungen)
struct NachweisKnopf: View {
    let zahlungId: String

    @State private var laedt = false
    @State private var fehler: String?
    @State private var datei: TeilDatei?
    @State private var letzte: URL?

    struct TeilDatei: Identifiable {
        let url: URL
        var id: String { url.path() }
    }

    var body: some View {
        Group {
            Button {
                erstellen()
            } label: {
                HStack {
                    Label(Texte.Nachweis.knopf, systemImage: "doc.richtext")
                    if laedt { Spacer(); ProgressView() }
                }
            }
            .disabled(laedt)
            .accessibilityIdentifier("nachweis-pdf")
            if let fehler { FehlerZeile(text: fehler) }
        }
        .sheet(item: $datei, onDismiss: aufraeumen) { d in
            TeilenSheet(dinge: [d.url])
                .presentationDetents([.medium, .large])
        }
    }

    private func erstellen() {
        laedt = true
        fehler = nil
        Task {
            defer { laedt = false }
            do {
                let u = try await NachweisPDF.holen(zahlungId)
                letzte = u
                datei = TeilDatei(url: u)
            } catch {
                fehler = fehlerText(error)
            }
        }
    }

    /// Personenbezogene Daten nicht liegen lassen
    private func aufraeumen() {
        if let u = letzte { try? FileManager.default.removeItem(at: u) }
        letzte = nil
    }
}
