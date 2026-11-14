import Foundation
import UIKit
import WebKit

// Studio-Beiträge zeichnen: genau wie im Web-Dashboard mit app-kit.js, aber lokal und ohne Internet.
// app-kit.js, werbung-texte.js, klarna-texte.js, qrcode.min.js, Figur, Wortmarke und Schriften liegen im App-Bundle (Resources/WebKit,
// Kopie per scripts/web-kit-sync.sh). Ein unsichtbares WKWebView lädt sie über das eigene Schema „tfkit://“
// (keine Netzwerkzugriffe, keine Cookies) und gibt PNG-Daten zurück. Sichtbar ist nur die native Oberfläche.

/// Eine Vorlage mit ihren fertigen Bildern
struct GezeichneterBeitrag: Identifiable, Sendable, Hashable {
    var id: String
    var titel: String
    var format: String
    /// "post" | "story"
    var art: String
    var wofuer: String
    /// nil = Posting-Text, "link" = Zahlseiten-Link (Link-Sticker), "sticker" = Fragen-Sticker-Text
    var kopieren: String?
    var text: String
    /// PNG-Daten in Originalgröße (1080 × 1350 bzw. 1080 × 1920)
    var bilder: [Data]
    /// Neu bei jedem Zeichnen (für .task(id:), ohne die Bilddaten zu vergleichen)
    var stand = UUID()

    /// Was „kopieren“ in die Zwischenablage legt (wie im Web: QR-Story nur den Link)
    func kopierText(zahlseite: String) -> String { kopieren == "link" ? zahlseite : text }
}

/// Was in die Bilder kommt
struct KitDaten: Sendable, Equatable {
    var firma: String
    var ort: String?
    var zahlseite: String
}

enum ZeichnerFehler: Error {
    case kitFehlt
    case antwort
}

@MainActor
final class BeitragZeichner: NSObject, WKNavigationDelegate {
    static let schema = "tfkit"
    static let start = URL(string: "tfkit://kit/index.html")!

    private var web: WKWebView?
    private var bereit = false
    private var wartende: [CheckedContinuation<Void, any Error>] = []

    /// Seite mit dem Kit laden (einmal)
    func vorbereiten() async throws {
        if bereit { return }
        if web == nil {
            let k = WKWebViewConfiguration()
            k.websiteDataStore = .nonPersistent()
            k.setURLSchemeHandler(KitSchemaHandler(), forURLScheme: Self.schema)
            let w = WKWebView(frame: CGRect(x: 0, y: 0, width: 8, height: 8), configuration: k)
            w.navigationDelegate = self
            w.isHidden = true
            w.isUserInteractionEnabled = false
            web = w
            w.load(URLRequest(url: Self.start))
        }
        try await withCheckedThrowingContinuation { (c: CheckedContinuation<Void, any Error>) in
            if bereit { c.resume() } else { wartende.append(c) }
        }
    }

    /// Anzahl und Kopfdaten der Vorlagen
    func vorlagenAnzahl() async throws -> Int {
        try await vorbereiten()
        let n = try await web?.callAsyncJavaScript("return TFKit.VORLAGEN.length", arguments: [:], contentWorld: .page)
        return (n as? Int) ?? (n as? NSNumber)?.intValue ?? 0
    }

    /// Name ohne Rechtsform, wie im Web („Ink UG (haftungsbeschränkt)“ → „Ink“)
    func anzeigeName(_ firma: String) async throws -> String {
        try await vorbereiten()
        let n = try await web?.callAsyncJavaScript("return TFKit.anzeigeName(f)", arguments: ["f": firma], contentWorld: .page)
        return (n as? String)?.leerAlsNil ?? firma
    }

    /// Eine Vorlage zeichnen
    func zeichne(_ index: Int, _ k: KitDaten) async throws -> GezeichneterBeitrag {
        try await vorbereiten()
        guard let web else { throw ZeichnerFehler.kitFehlt }
        let js = """
        var v = TFKit.VORLAGEN[i];
        var cvs = await TFKit.zeichne(v, k);
        return JSON.stringify({ id: v.id, titel: v.titel, format: v.format, art: v.art, wofuer: v.wofuer, kopieren: v.kopieren || null,
          text: v.text(k), bilder: cvs.map(function (c) { return c.toDataURL("image/png").split(",")[1]; }) });
        """
        let kd: [String: Any] = ["firma": k.firma, "ort": k.ort ?? "", "zahlseite": k.zahlseite]
        let roh = try await web.callAsyncJavaScript(js, arguments: ["i": index, "k": kd], contentWorld: .page)
        guard let s = roh as? String, let d = s.data(using: .utf8) else { throw ZeichnerFehler.antwort }
        let a = try JSONDecoder().decode(Roh.self, from: d)
        let bilder = a.bilder.compactMap { Data(base64Encoded: $0) }
        guard !bilder.isEmpty else { throw ZeichnerFehler.antwort }
        return GezeichneterBeitrag(id: a.id, titel: a.titel, format: a.format, art: a.art, wofuer: a.wofuer, kopieren: a.kopieren, text: a.text, bilder: bilder)
    }

    private struct Roh: Decodable {
        var id: String
        var titel: String
        var format: String
        var art: String
        var wofuer: String
        var kopieren: String?
        var text: String
        var bilder: [String]
    }

    // MARK: WKNavigationDelegate

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        bereit = true
        let w = wartende
        wartende = []
        w.forEach { $0.resume() }
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: any Error) { abbruch(error) }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: any Error) { abbruch(error) }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction) async -> WKNavigationActionPolicy {
        // Nur die eigene Seite, nie ins Netz
        navigationAction.request.url?.scheme == Self.schema ? .allow : .cancel
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        // Speicher knapp: beim nächsten Mal neu laden
        bereit = false
        self.web = nil
    }

    private func abbruch(_ e: any Error) {
        let w = wartende
        wartende = []
        self.web = nil
        w.forEach { $0.resume(throwing: e) }
    }
}

/// Liefert die Kit-Dateien aus dem App-Bundle (tfkit://kit/… → Resources/WebKit)
final class KitSchemaHandler: NSObject, WKURLSchemeHandler {
    /// Leere Seite mit Schriften und Skripten. app-kit.js lädt Bilder über „/assets/…“ (gleicher Ursprung, Canvas bleibt lesbar).
    static let seite = """
    <!doctype html><html lang="de"><head><meta charset="utf-8">
    <style>
    @font-face{font-family:'Luckiest Guy';font-style:normal;font-weight:400;src:url(/assets/fonts/LuckiestGuy.woff2) format('woff2')}
    @font-face{font-family:'DM Sans';font-style:normal;font-weight:400 800;src:url(/assets/fonts/DMSans.woff2) format('woff2')}
    </style>
    <script src="/js/klarna-texte.js"></script>
    <script src="/js/werbung-texte.js"></script>
    <script src="/js/qrcode.min.js"></script>
    <script src="/js/app-kit.js"></script>
    </head><body></body></html>
    """

    /// Pfad → Datei im Bundle (nur diese, alles andere 404)
    static let dateien: [String: (name: String, typ: String, mime: String)] = [
        "/js/app-kit.js": ("app-kit", "js", "text/javascript"),
        "/js/klarna-texte.js": ("klarna-texte", "js", "text/javascript"),
        "/js/werbung-texte.js": ("werbung-texte", "js", "text/javascript"),
        "/js/qrcode.min.js": ("qrcode.min", "js", "text/javascript"),
        "/assets/figur.png": ("figur", "png", "image/png"),
        "/assets/wortmarke.png": ("wortmarke", "png", "image/png"),
        "/assets/fonts/LuckiestGuy.woff2": ("LuckiestGuy", "woff2", "font/woff2"),
        "/assets/fonts/DMSans.woff2": ("DMSans", "woff2", "font/woff2"),
    ]

    static func bundleURL(_ name: String, _ typ: String) -> URL? {
        Bundle.main.url(forResource: name, withExtension: typ, subdirectory: "WebKit")
            ?? Bundle.main.url(forResource: name, withExtension: typ)
    }

    func webView(_ webView: WKWebView, start task: any WKURLSchemeTask) {
        guard let url = task.request.url else {
            task.didFailWithError(URLError(.badURL))
            return
        }
        let daten: Data?, mime: String
        if url.path() == "/index.html" || url.path() == "/" {
            daten = Data(Self.seite.utf8)
            mime = "text/html"
        } else if let d = Self.dateien[url.path()], let u = Self.bundleURL(d.name, d.typ) {
            daten = try? Data(contentsOf: u)
            mime = d.mime
        } else {
            daten = nil
            mime = "text/plain"
        }
        guard let daten else {
            log.error("Kit-Datei fehlt: \(url.path(), privacy: .public)")
            task.didReceive(HTTPURLResponse(url: url, statusCode: 404, httpVersion: "HTTP/1.1", headerFields: nil)!)
            task.didReceive(Data())
            task.didFinish()
            return
        }
        let kopf = ["Content-Type": mime, "Content-Length": String(daten.count), "Cache-Control": "no-store"]
        task.didReceive(HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1", headerFields: kopf)!)
        task.didReceive(daten)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: any WKURLSchemeTask) {}
}
