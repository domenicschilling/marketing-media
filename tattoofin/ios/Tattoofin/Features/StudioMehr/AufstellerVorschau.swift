import SwiftUI

/// Vorschau des QR-Aufstellers (10 × 15 cm, Maße und Aufbau wie bauen() in aufsteller.js): Holz mit Maserung, Gravur in dunklem Holzton.
/// Oben Tattoofin-Wortmarke, Studioname oder Logo, „HIER SCANNEN“, Zahlarten, QR-Code der Zahlseite mit Ecken, Link als Text,
/// bei Klarna (nur wenn dauerhaft angeboten) die Pflicht-Fußnote mit Warnsatz. Darunter der Fuß.
struct AufstellerVorschau: View {
    let zahlseite: String
    let firma: String
    let holz: String          // hell | dunkel
    let mitLogo: Bool
    let logo: UIImage?
    let klarna: Bool

    struct Holz {
        let grund: Color, grund2: Color, maserung: Color, gravur: Color, kante: Color
    }

    static func farben(_ holz: String) -> Holz {
        holz == "dunkel"
            ? Holz(grund: Color(UIColor(hex: 0x7A5236)), grund2: Color(UIColor(hex: 0x5F3D26)), maserung: Color(UIColor(hex: 0x3E2716)), gravur: Color(UIColor(hex: 0x1E120A)), kante: Color(UIColor(hex: 0x4B301D)))
            : Holz(grund: Color(UIColor(hex: 0xE7CB98)), grund2: Color(UIColor(hex: 0xD9B67C)), maserung: Color(UIColor(hex: 0xB98F55)), gravur: Color(UIColor(hex: 0x3B2410)), kante: Color(UIColor(hex: 0xC9A46C)))
    }

    // Maße in mm (aufsteller.js)
    static let W: CGFloat = 100, H: CGFloat = 150, RADIUS: CGFloat = 4, RAND: CGFloat = 7, FUSSZONE: CGFloat = 17
    static let QR_MM: CGFloat = 58, QR_OBEN: CGFloat = 40

    @State private var qr: UIImage?

    var body: some View {
        Canvas { ctx, groesse in zeichnen(ctx, groesse) }
            .aspectRatio(Self.W / (Self.H + 6), contentMode: .fit)
            .task(id: zahlseite) { qr = QRMaske.bild(zahlseite) }
            .accessibilityElement()
            .accessibilityAddTraits(.isImage)
    }

    private func zeichnen(_ ctx: GraphicsContext, _ groesse: CGSize) {
        let s = groesse.width / Self.W               // Punkte pro mm
        let f = Self.farben(holz)
        let mitte = Self.W / 2 * s
        let nutz = (Self.W - 2 * Self.RAND) * s
        let schild = CGRect(x: 0, y: 0, width: Self.W * s, height: Self.H * s)

        // Fuß (zwei Teile im Profil angedeutet) und Schatten
        let fuss = CGRect(x: 14 * s, y: (Self.H - 8) * s, width: 72 * s, height: 13 * s)
        ctx.fill(Path(roundedRect: fuss, cornerRadius: 1.5 * s), with: .color(f.kante))
        var schatten = ctx
        schatten.addFilter(.shadow(color: .black.opacity(0.25), radius: 3 * s, x: 0, y: 1.5 * s))
        let form = Path(roundedRect: schild, cornerRadius: Self.RADIUS * s)
        schatten.fill(form, with: .linearGradient(Gradient(colors: [f.grund, f.grund2]), startPoint: .zero, endPoint: CGPoint(x: schild.width, y: schild.height)))

        // Maserung: weiche Wellenlinien
        var holzCtx = ctx
        holzCtx.clip(to: form)
        for i in 0..<26 {
            let y0 = CGFloat(i) * 6.2 * s + 1.5 * s
            var p = Path()
            p.move(to: CGPoint(x: -2 * s, y: y0))
            var x: CGFloat = -2
            while x < Self.W + 4 {
                let a = sin((x + CGFloat(i) * 13) / 9) * 1.1 * s
                p.addLine(to: CGPoint(x: x * s, y: y0 + a))
                x += 2
            }
            holzCtx.stroke(p, with: .color(f.maserung.opacity(i % 3 == 0 ? 0.35 : 0.18)), lineWidth: (i % 4 == 0 ? 0.5 : 0.25) * s)
        }
        ctx.stroke(form, with: .color(f.kante), lineWidth: 0.4 * s)

        let gravur = GraphicsContext.Shading.color(f.gravur)
        func text(_ t: String, _ mm: CGFloat, fett: Bool = true, y basis: CGFloat) {
            let schrift = Font.custom("DMSans9pt-Regular", fixedSize: mm * s).weight(fett ? .bold : .medium)
            var r = ctx.resolve(Text(t).font(schrift))
            r.shading = gravur
            ctx.draw(r, at: CGPoint(x: mitte, y: basis * s), anchor: .bottom)
        }
        func breite(_ t: String, _ mm: CGFloat, fett: Bool = true) -> CGFloat {
            let schrift = Font.custom("DMSans9pt-Regular", fixedSize: mm * s).weight(fett ? .bold : .medium)
            return ctx.resolve(Text(t).font(schrift)).measure(in: CGSize(width: 10_000, height: 10_000)).width
        }

        // 1) Wortmarke klein oben
        let wmEins = ctx.resolve(Text("Tattoofin").font(.custom("LuckiestGuy-Regular", fixedSize: s))).measure(in: CGSize(width: 10_000, height: 10_000)).width
        let wmGr = wmEins > 0 ? 30 * s / wmEins : 5 * s      // 30 mm breit wie im Web
        var wmr = ctx.resolve(Text("Tattoofin").font(.custom("LuckiestGuy-Regular", fixedSize: wmGr * s)))
        wmr.shading = gravur
        ctx.draw(wmr, at: CGPoint(x: mitte, y: 9.6 * s), anchor: .bottom)

        // 2) Studioname oder Logo
        if mitLogo {
            let feld = CGRect(x: 15 * s, y: 13.2 * s, width: 70 * s, height: 11.6 * s)
            if let logo {
                let fa = min(feld.width / logo.size.width, feld.height / logo.size.height)
                let g = CGSize(width: logo.size.width * fa, height: logo.size.height * fa)
                var bild = ctx.resolve(Image(uiImage: logo).renderingMode(.template))
                bild.shading = gravur
                ctx.draw(bild, in: CGRect(x: feld.midX - g.width / 2, y: feld.midY - g.height / 2, width: g.width, height: g.height))
            } else {
                ctx.stroke(Path(roundedRect: feld, cornerRadius: 2 * s), with: .color(.gray.opacity(0.7)), style: StrokeStyle(lineWidth: 0.3 * s, dash: [1.2 * s, 0.8 * s]))
                var r = ctx.resolve(Text(Texte.Aufsteller.logoPlatzhalter).font(.custom("DMSans9pt-Regular", fixedSize: 4 * s).weight(.bold)))
                r.shading = .color(.gray)
                ctx.draw(r, at: CGPoint(x: feld.midX, y: feld.midY), anchor: .center)
            }
        } else {
            let name = firma.split(whereSeparator: \.isWhitespace).joined(separator: " ")
            let einsBreite = max(breite(name, 1), 0.01)
            let gr = min(9, nutz / einsBreite)
            if gr >= 6.2 {
                text(name, gr, y: 22.6)
            } else {
                let z = Self.zweiZeilen(name)
                if z.count == 1 {
                    text(name, max(gr, 3.2), y: 22.6)
                } else {
                    let gr2 = min(4.9, nutz / max(breite(z[0], 1), breite(z[1], 1), 0.01))
                    text(z[0], gr2, y: 17.9)
                    text(z[1], gr2, y: 17.9 + gr2 * 1.12)
                }
            }
        }

        // 3) Aufforderung mit Strichen
        let kopf = Texte.Aufsteller.hierScannen
        let kopfB = breite(kopf, 6.4) / s
        text(kopf, 6.4, y: 31.6)
        let strich = min(14, (Self.W - 2 * Self.RAND - kopfB) / 2 - 4)
        if strich > 3 {
            ctx.fill(Path(CGRect(x: (Self.W / 2 - kopfB / 2 - 3 - strich) * s, y: (31.6 - 2.6) * s, width: strich * s, height: 0.7 * s)), with: gravur)
            ctx.fill(Path(CGRect(x: (Self.W / 2 + kopfB / 2 + 3) * s, y: (31.6 - 2.6) * s, width: strich * s, height: 0.7 * s)), with: gravur)
        }
        let unter = klarna ? Texte.Aufsteller.zahlartenKlarna : Texte.Aufsteller.unterOhne
        text(unter, min(4.2, nutz / max(breite(unter, 1, fett: false), 0.01)), fett: false, y: 37.4)

        // 4) QR-Code mit Ecken
        let ruhe: CGFloat = 2.2
        let qx = Self.W / 2 - Self.QR_MM / 2, qy = Self.QR_OBEN + ruhe + 0.6
        if let qr {
            var r = ctx.resolve(Image(uiImage: qr).interpolation(.none).renderingMode(.template))
            r.shading = gravur
            ctx.draw(r, in: CGRect(x: qx * s, y: qy * s, width: Self.QR_MM * s, height: Self.QR_MM * s))
        }
        let e0 = ruhe + 0.6, el: CGFloat = 7, ed: CGFloat = 0.9
        let L = qx - e0, R = qx + Self.QR_MM + e0, T = qy - e0, B = qy + Self.QR_MM + e0
        for (x, y, dx, dy) in [(L, T, 1.0, 1.0), (R, T, -1.0, 1.0), (L, B, 1.0, -1.0), (R, B, -1.0, -1.0)] as [(CGFloat, CGFloat, CGFloat, CGFloat)] {
            ctx.fill(Path(CGRect(x: (dx > 0 ? x : x - el) * s, y: (dy > 0 ? y : y - ed) * s, width: el * s, height: ed * s)), with: gravur)
            ctx.fill(Path(CGRect(x: (dx > 0 ? x : x - ed) * s, y: (dy > 0 ? y : y - el) * s, width: ed * s, height: el * s)), with: gravur)
        }

        // 5) Link als Text + Zahlarten
        let kurz = Self.kurzLink(zahlseite)
        text(kurz, min(3.3, nutz / max(breite(kurz, 1), 0.01)), y: B + 4.6)
        if !klarna { text(Texte.Aufsteller.zahlartenOhne, 3, fett: false, y: B + 9.4) }

        // 6) Fußnote bei „Klarna*“ (Pflicht): Hinweis klein, Warnsatz fett darunter, oberhalb der Fußzone
        if klarna {
            let zeilen = Self.umbrechen(KlarnaTexte.fussnote, maxBreite: nutz) { breite($0, 3, fett: false) }
            let wGr: CGFloat = 3.4, fGr: CGFloat = 3
            let fy = Self.H - Self.FUSSZONE - 1.4 - wGr * 1.45 - CGFloat(zeilen.count - 1) * fGr * 1.3
            for (i, z) in zeilen.enumerated() { text(z, fGr, fett: false, y: fy + CGFloat(i) * fGr * 1.3) }
            text(KlarnaTexte.warnsatz, wGr, y: Self.H - Self.FUSSZONE - 1.4)
        }
    }

    /// Name in zwei Zeilen teilen (möglichst gleich lang), wie zweiZeilen() im Web
    static func zweiZeilen(_ name: String) -> [String] {
        let w = name.split(separator: " ").map(String.init)
        guard w.count > 1 else { return [name] }
        var best = 1, diff = Int.max
        for i in 1..<w.count {
            let a = w[..<i].joined(separator: " ").count, b = w[i...].joined(separator: " ").count
            if abs(a - b) < diff { diff = abs(a - b); best = i }
        }
        return [w[..<best].joined(separator: " "), w[best...].joined(separator: " ")]
    }

    static func kurzLink(_ url: String) -> String {
        var t = url.replacingOccurrences(of: #"^https?://"#, with: "", options: .regularExpression)
        if let i = t.firstIndex(where: { $0 == "?" || $0 == "#" }) { t = String(t[..<i]) }
        if t.hasSuffix("/") { t.removeLast() }
        return t
    }

    static func umbrechen(_ text: String, maxBreite: CGFloat, breite: (String) -> CGFloat) -> [String] {
        var zeilen: [String] = [], aktuell = ""
        for wort in text.split(separator: " ") {
            let probe = aktuell.isEmpty ? String(wort) : aktuell + " " + wort
            if breite(probe) <= maxBreite || aktuell.isEmpty { aktuell = probe } else { zeilen.append(aktuell); aktuell = String(wort) }
        }
        if !aktuell.isEmpty { zeilen.append(aktuell) }
        return zeilen
    }
}
