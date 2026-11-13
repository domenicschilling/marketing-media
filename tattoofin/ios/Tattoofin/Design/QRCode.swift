import SwiftUI
import CoreImage
import CoreImage.CIFilterBuiltins
import UIKit

/// QR-Code lokal erzeugen (CoreImage, Korrekturstufe M), scharf ohne Weichzeichnen.
enum QRErzeuger {
    static func bild(_ inhalt: String, skala: CGFloat = 12) -> UIImage? {
        let f = CIFilter.qrCodeGenerator()
        f.message = Data(inhalt.utf8)
        f.correctionLevel = "M"
        guard let roh = f.outputImage else { return nil }
        let gross = roh.transformed(by: CGAffineTransform(scaleX: skala, y: skala))
        let ctx = CIContext(options: [.useSoftwareRenderer: false])
        guard let cg = ctx.createCGImage(gross, from: gross.extent) else { return nil }
        return UIImage(cgImage: cg)
    }
}

/// QR-Code über die verfügbare Breite. Immer schwarz auf weiß (auch im Dunkelmodus), damit jede Kamera ihn liest.
struct QRCodeView: View {
    let inhalt: String
    /// VoiceOver, z. B. „QR-Code für Zahlung über 480 Euro“
    let beschreibung: String

    @State private var bild: UIImage?

    var body: some View {
        ZStack {
            Color.white
            if let bild {
                Image(uiImage: bild)
                    .interpolation(.none)
                    .resizable()
                    .scaledToFit()
                    .padding(14)
            } else {
                ProgressView()
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).stroke(Color.tfLinie, lineWidth: 1))
        .accessibilityElement()
        .accessibilityLabel(beschreibung)
        .accessibilityAddTraits(.isImage)
        .task(id: inhalt) { bild = QRErzeuger.bild(inhalt) }
    }
}

/// Während ein QR-Code sichtbar ist: Helligkeit auf Maximum, Bildschirmsperre aus. Danach alles zurück.
struct QRAnzeigeModifier: ViewModifier {
    @State private var vorher: CGFloat?
    @Environment(\.scenePhase) private var phase

    func body(content: Content) -> some View {
        content
            .onAppear { an() }
            .onDisappear { aus() }
            .onChange(of: phase) { _, p in
                if p == .active { an() } else { aus() }
            }
    }

    private var bildschirm: UIScreen? {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first { $0.activationState == .foregroundActive }?.screen
            ?? UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first?.screen
    }

    private func an() {
        UIApplication.shared.isIdleTimerDisabled = true
        guard let s = bildschirm else { return }
        if vorher == nil { vorher = s.brightness }
        s.brightness = 1
    }

    private func aus() {
        UIApplication.shared.isIdleTimerDisabled = false
        if let v = vorher, let s = bildschirm { s.brightness = v }
        vorher = nil
    }
}

extension View {
    func qrAnzeige() -> some View { modifier(QRAnzeigeModifier()) }
}
