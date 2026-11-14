import SwiftUI
import WebKit

/// Rechtstexte in der App (Impressum, Datenschutz, Vertrag, AVV), erreichbar vor und nach der Anmeldung (§ 5 DDG, Apple 5.1.1(i)).
/// Bewusst kein Safari: Die Seiten laden mit „?app=1“ (ohne Menü, Cookie-Hinweis, Pixel, WhatsApp-Knopf). Zusätzlich sperrt die App selbst
/// das Tracking-Skript und Meta, blendet Menü/Fuß aus und lässt keine anderen Tattoofin-Seiten öffnen (keine Wege zu Anmeldung oder Preisen,
/// Apple 3.1.1). Links zu fremden Seiten (z. B. Datenschutz von Stripe) öffnen in Safari, E-Mail/Telefon in der passenden App.
enum Rechtsseite: String, Identifiable, CaseIterable, Sendable {
    case impressum, datenschutz, vertrag, avv
    /// „Deine rechtliche Lage“ (nur lesen, bestätigt wird nativ in RechtView)
    case recht

    var id: String { rawValue }
    var datei: String { rawValue + ".html" }

    var titel: String {
        switch self {
        case .impressum: Texte.Konto.impressum
        case .datenschutz: Texte.Konto.datenschutz
        case .vertrag: Texte.Konto.vertragText
        case .avv: Texte.Registrieren.avvTitel
        case .recht: Texte.Recht.titel
        }
    }

    var url: URL {
        APIClient.basisURL().appending(path: datei).appending(queryItems: [URLQueryItem(name: "app", value: "1")])
    }

    /// Darf diese Adresse in der Ansicht geladen werden? Nur die Rechtsseiten auf unserem Server.
    static func erlaubt(_ url: URL, basis: URL = APIClient.basisURL()) -> Bool {
        guard url.scheme == basis.scheme, url.host() == basis.host(), url.port == basis.port else { return false }
        return Rechtsseite.allCases.contains { "/" + $0.datei == url.path() }
    }
}

struct RechtsAnsicht: View {
    let seite: Rechtsseite

    @Environment(\.dismiss) private var dismiss
    @State private var laedt = true
    @State private var fehler = false
    @State private var versuch = 0

    var body: some View {
        NavigationStack {
            RechtsWebAnsicht(url: seite.url, versuch: versuch, laedt: $laedt, fehler: $fehler)
                .ignoresSafeArea(edges: .bottom)
                .overlay {
                    if fehler {
                        VStack(spacing: 14) {
                            FehlerZeile(text: Texte.Konto.seiteFehler)
                            Button(Texte.Allgemein.nochmal) { fehler = false; laedt = true; versuch += 1 }
                                .buttonStyle(.zweit)
                        }
                        .padding(24)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(Color.tfHintergrund)
                    } else if laedt {
                        ProgressView()
                    }
                }
                .navigationTitle(seite.titel)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button(Texte.Allgemein.fertig) { dismiss() }.font(.dm(.body, weight: .semibold))
                    }
                }
        }
    }
}

/// WKWebView ohne gespeicherte Daten (keine Cookies, kein lokaler Speicher) und mit Inhaltsregeln
struct RechtsWebAnsicht: UIViewRepresentable {
    let url: URL
    let versuch: Int
    @Binding var laedt: Bool
    @Binding var fehler: Bool

    /// Inhaltsregeln (WebKit-Inhaltsblocker): Tracking-Skript und Meta nie laden, Menü und Fuß ausblenden.
    /// Achtung: Die Regex der Inhaltsblocker kennt kein „|“ (sonst lässt sich die Liste nicht übersetzen) → je Domain eine Regel.
    static let regeln = """
    [
      {"trigger": {"url-filter": "tf-track\\\\.js"}, "action": {"type": "block"}},
      {"trigger": {"url-filter": "facebook\\\\.net"}, "action": {"type": "block"}},
      {"trigger": {"url-filter": "facebook\\\\.com"}, "action": {"type": "block"}},
      {"trigger": {"url-filter": ".*"}, "action": {"type": "css-display-none", "selector": "header.nav, nav.webnav, footer, .tf-cc, .tf-wa"}},
      {"trigger": {"url-filter": "recht\\\\.html"}, "action": {"type": "css-display-none", "selector": ".knopf"}}
    ]
    """

    func makeCoordinator() -> Koordinator { Koordinator(laedt: $laedt, fehler: $fehler) }

    func makeUIView(context: Context) -> WKWebView {
        let konfig = WKWebViewConfiguration()
        konfig.websiteDataStore = .nonPersistent()
        let web = WKWebView(frame: .zero, configuration: konfig)
        web.navigationDelegate = context.coordinator
        web.allowsLinkPreview = false
        web.isOpaque = false
        web.backgroundColor = UIColor(Color.tfHintergrund)
        context.coordinator.versuch = versuch
        Task { @MainActor in
            // Erst die Regeln, dann laden (sonst könnte das Skript schon laufen)
            if let liste = try? await WKContentRuleListStore.default().compileContentRuleList(
                forIdentifier: "tattoofin-rechtstexte", encodedContentRuleList: Self.regeln) {
                web.configuration.userContentController.add(liste)
            }
            web.load(URLRequest(url: url))
        }
        return web
    }

    func updateUIView(_ web: WKWebView, context: Context) {
        // „Nochmal versuchen“
        if context.coordinator.versuch != versuch {
            context.coordinator.versuch = versuch
            web.load(URLRequest(url: url))
        }
    }

    @MainActor
    final class Koordinator: NSObject, WKNavigationDelegate {
        @Binding var laedt: Bool
        @Binding var fehler: Bool
        var versuch = 0

        init(laedt: Binding<Bool>, fehler: Binding<Bool>) {
            _laedt = laedt
            _fehler = fehler
        }

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction) async -> WKNavigationActionPolicy {
            guard let ziel = navigationAction.request.url else { return .cancel }
            // Unterrahmen (z. B. eingebettete Inhalte) nie
            if navigationAction.targetFrame?.isMainFrame == false { return .cancel }
            if Rechtsseite.erlaubt(ziel) { return .allow }
            // E-Mail und Telefon in der passenden App, fremde Seiten in Safari; andere Tattoofin-Seiten gar nicht
            if navigationAction.navigationType == .linkActivated {
                let basis = APIClient.basisURL()
                if ["mailto", "tel"].contains(ziel.scheme ?? "") || (ziel.scheme == "https" && ziel.host() != basis.host() && ziel.host() != "www.tattoofin.de") {
                    await UIApplication.shared.open(ziel)
                }
            }
            return .cancel
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            laedt = false
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: any Error) {
            laedt = false
            if (error as NSError).code != NSURLErrorCancelled { fehler = true }
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: any Error) {
            laedt = false
            if (error as NSError).code != NSURLErrorCancelled { fehler = true }
        }
    }
}

/// Kleine Fußzeile „Impressum · Datenschutz“ (Anmeldung und Code-Bildschirm)
struct RechtsFuss: View {
    @State private var seite: Rechtsseite?

    var body: some View {
        HStack(spacing: 6) {
            Button(Texte.Konto.impressum) { seite = .impressum }
            Text("·").accessibilityHidden(true)
            Button(Texte.Konto.datenschutz) { seite = .datenschutz }
        }
        .font(.dm(.footnote, weight: .semibold))
        .foregroundStyle(Color.tfLeise)
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity)
        .padding(.top, 8)
        .sheet(item: $seite) { RechtsAnsicht(seite: $0) }
    }
}
