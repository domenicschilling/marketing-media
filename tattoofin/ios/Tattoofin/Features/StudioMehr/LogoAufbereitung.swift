import UIKit
import CoreImage
import CoreImage.CIFilterBuiltins

/// Logo für die Gravur wie logoVorbereiten() in aufsteller.js: auf Weiß zeichnen, schwarz/weiß (Helligkeit < 150 = schwarz),
/// auf den Inhalt zuschneiden, als JPEG-Data-URL (höchstens 700.000 Zeichen, Server-Grenze). Dazu eine Maske für die Vorschau.
struct GravurLogo: Sendable {
    /// data:image/jpeg;base64,… für POST /api/portal/aufsteller
    var dataURL: String
    var breite: Int
    var hoehe: Int
    /// Dunkle Pixel deckend, Rest durchsichtig (Vorschau in Gravurfarbe)
    var maske: UIImage

    enum Fehler: Error { case unlesbar, nichtsDunkel }

    /// Aus einer Bilddatei (PhotosPicker)
    static func aus(daten: Data) throws -> GravurLogo {
        guard let bild = UIImage(data: daten), let cg = bild.normalisiert() else { throw Fehler.unlesbar }
        let iw = CGFloat(cg.width), ih = CGFloat(cg.height)
        let f = min(1600 / iw, 600 / ih, 4)
        return try aufbereiten(cg, breite: max(1, Int((iw * f).rounded())), hoehe: max(1, Int((ih * f).rounded())))
    }

    /// Aus dem gespeicherten Logo (Data-URL vom Server, schon schwarz/weiß)
    static func aus(dataURL: String) throws -> GravurLogo {
        guard let bild = NachweisPDF.bild(dataURL), let cg = bild.normalisiert() else { throw Fehler.unlesbar }
        return try aufbereiten(cg, breite: cg.width, hoehe: cg.height)
    }

    private static func aufbereiten(_ cg: CGImage, breite w: Int, hoehe h: Int) throws -> GravurLogo {
        // RGBA-Puffer auf Weiß
        var pixel = [UInt8](repeating: 255, count: w * h * 4)
        let farbraum = CGColorSpaceCreateDeviceRGB()
        try pixel.withUnsafeMutableBytes { roh in
            guard let ctx = CGContext(data: roh.baseAddress, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: farbraum,
                                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { throw Fehler.unlesbar }
            ctx.setFillColor(UIColor.white.cgColor)
            ctx.fill(CGRect(x: 0, y: 0, width: w, height: h))
            ctx.interpolationQuality = .high
            ctx.draw(cg, in: CGRect(x: 0, y: 0, width: w, height: h))
        }
        // Schwelle wie im Web, Inhalt suchen
        var minX = w, minY = h, maxX = -1, maxY = -1
        var dunkel = [Bool](repeating: false, count: w * h)
        for y in 0..<h {
            for x in 0..<w {
                let i = (y * w + x) * 4
                let hell = 0.299 * Double(pixel[i]) + 0.587 * Double(pixel[i + 1]) + 0.114 * Double(pixel[i + 2])
                if hell < 150 {
                    dunkel[y * w + x] = true
                    minX = min(minX, x); maxX = max(maxX, x); minY = min(minY, y); maxY = max(maxY, y)
                }
            }
        }
        guard maxX >= 0 else { throw Fehler.nichtsDunkel }
        let bw = maxX - minX + 1, bh = maxY - minY + 1
        var sw = [UInt8](repeating: 255, count: bw * bh)       // Graustufen fürs JPEG
        var maske = [UInt8](repeating: 0, count: bw * bh * 4)  // RGBA für die Vorschau
        for y in 0..<bh {
            for x in 0..<bw where dunkel[(y + minY) * w + (x + minX)] {
                sw[y * bw + x] = 0
                let j = (y * bw + x) * 4
                maske[j] = 0; maske[j + 1] = 0; maske[j + 2] = 0; maske[j + 3] = 255
            }
        }
        guard let swBild = bild(aus: &sw, breite: bw, hoehe: bh, grau: true),
              let maskenBild = bild(aus: &maske, breite: bw, hoehe: bh, grau: false) else { throw Fehler.unlesbar }
        // JPEG unter der Server-Grenze (700.000 Zeichen Data-URL ≈ 520 KB): erst Qualität, dann Größe senken
        var ui = UIImage(cgImage: swBild)
        var url = ""
        for versuch in 0..<8 {
            let q: CGFloat = versuch < 3 ? [0.95, 0.85, 0.7][versuch] : 0.7
            if versuch >= 3 { ui = ui.verkleinert(faktor: 0.75) }
            guard let jpg = ui.jpegData(compressionQuality: q) else { throw Fehler.unlesbar }
            url = "data:image/jpeg;base64," + jpg.base64EncodedString()
            if url.count <= 690_000 { break }
        }
        guard url.count <= 690_000 else { throw Fehler.unlesbar }
        return GravurLogo(dataURL: url, breite: Int(ui.size.width * ui.scale), hoehe: Int(ui.size.height * ui.scale), maske: UIImage(cgImage: maskenBild))
    }

    private static func bild(aus puffer: inout [UInt8], breite: Int, hoehe: Int, grau: Bool) -> CGImage? {
        puffer.withUnsafeMutableBytes { roh in
            let ctx = CGContext(data: roh.baseAddress, width: breite, height: hoehe, bitsPerComponent: 8, bytesPerRow: grau ? breite : breite * 4,
                                space: grau ? CGColorSpaceCreateDeviceGray() : CGColorSpaceCreateDeviceRGB(),
                                bitmapInfo: grau ? CGImageAlphaInfo.none.rawValue : CGImageAlphaInfo.premultipliedLast.rawValue)
            return ctx?.makeImage()
        }
    }
}

extension UIImage {
    /// Ausrichtung anwenden (Fotos vom iPhone sind oft gedreht gespeichert)
    func normalisiert() -> CGImage? {
        if imageOrientation == .up, let cg = cgImage { return cg }
        let f = UIGraphicsImageRendererFormat()
        f.scale = 1
        return UIGraphicsImageRenderer(size: size, format: f).image { _ in draw(in: CGRect(origin: .zero, size: size)) }.cgImage
    }

    func verkleinert(faktor: CGFloat) -> UIImage {
        let neu = CGSize(width: max(1, (size.width * faktor).rounded()), height: max(1, (size.height * faktor).rounded()))
        let f = UIGraphicsImageRendererFormat()
        f.scale = 1
        f.opaque = true
        return UIGraphicsImageRenderer(size: neu, format: f).image { _ in
            UIColor.white.setFill()
            UIRectFill(CGRect(origin: .zero, size: neu))
            draw(in: CGRect(origin: .zero, size: neu))
        }
    }
}

/// QR-Code als Maske (Module deckend, Rest durchsichtig) für die Gravur-Vorschau, Fehlerkorrektur Q wie aufsteller.js
enum QRMaske {
    static func bild(_ inhalt: String) -> UIImage? {
        let f = CIFilter.qrCodeGenerator()
        f.message = Data(inhalt.utf8)
        f.correctionLevel = inhalt.count > 80 ? "M" : "Q"
        guard let roh = f.outputImage else { return nil }
        let inv = CIFilter.colorInvert()
        inv.inputImage = roh
        let maske = CIFilter.maskToAlpha()
        maske.inputImage = inv.outputImage
        guard let m = maske.outputImage else { return nil }
        let gross = m.transformed(by: CGAffineTransform(scaleX: 10, y: 10))
        guard let cg = CIContext().createCGImage(gross, from: gross.extent) else { return nil }
        return UIImage(cgImage: cg)
    }
}
