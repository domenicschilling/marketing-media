import SwiftUI
import AVFoundation
import VisionKit

/// Ergebnis eines Scans: gedruckter Code (GS-XXXX-XXXX) oder Token aus dem QR-Code neuer Gutschein-PDFs
enum ScanTreffer: Equatable, Sendable {
    case code(String)
    case token(String)

    /// Aus QR-Inhalt oder erkanntem Text
    static func aus(qr inhalt: String) -> ScanTreffer? {
        if let t = GutscheinCode.tokenAusQR(inhalt) { return .token(t) }
        if let c = GutscheinCode.ausText(inhalt) { return .code(c) }
        return nil
    }

    static func aus(text: String) -> ScanTreffer? {
        GutscheinCode.ausText(text).map { .code($0) }
    }
}

/// Bildschirm 12: Code-Scanner.
/// 1. Wahl: VisionKit-Scanner (Text-Erkennung für GS-Codes und QR in einem Bild).
/// 2. Wahl: AVFoundation (nur QR), falls VisionKit auf dem Gerät nicht geht.
/// Ohne Kamera oder ohne Erlaubnis (auch im Simulator): manuelle Eingabe.
struct ScannerView: View {
    let treffer: (ScanTreffer) -> Void

    enum Modus { case pruefen, vision, avQR, manuell(String) }

    @Environment(\.dismiss) private var dismiss
    @State private var modus = Modus.pruefen
    @State private var code = ""
    @State private var gefunden = false

    var body: some View {
        NavigationStack {
            ZStack {
                switch modus {
                case .pruefen:
                    Color.black.ignoresSafeArea()
                    ProgressView().tint(.white)
                case .vision:
                    VisionScanner { melden($0) }
                        .ignoresSafeArea()
                    sucher
                case .avQR:
                    QRKameraAnsicht { melden($0) }
                        .ignoresSafeArea()
                    sucher
                case let .manuell(grund):
                    manuell(grund)
                }
            }
            .navigationTitle(Texte.Scanner.titel)
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button(Texte.Allgemein.abbrechen) { dismiss() } }
                if kameraLaeuft {
                    ToolbarItem(placement: .primaryAction) {
                        Button(Texte.Scanner.eintippen) { modus = .manuell(Texte.Scanner.eintippenHinweis) }
                    }
                }
            }
        }
        .sensoryFeedback(.success, trigger: gefunden)
        .task { await modusWaehlen() }
    }

    private var kameraLaeuft: Bool {
        switch modus {
        case .vision, .avQR: true
        default: false
        }
    }

    private var sucher: some View {
        VStack {
            Spacer()
            Text(Texte.Scanner.anleitung)
                .font(.dm(.body, weight: .semibold))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)
                .padding(14)
                .background(.black.opacity(0.6), in: RoundedRectangle(cornerRadius: 14))
                .padding(.bottom, 40)
                .padding(.horizontal, 20)
        }
        .accessibilityElement(children: .combine)
    }

    private func manuell(_ grund: String) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HinweisKarte(text: grund, symbol: "camera.fill")
                Text(Texte.Gutscheine.codeEingeben).font(.dm(.subheadline, weight: .semibold)).foregroundStyle(Color.tfTinte)
                TextField(Texte.Gutscheine.codePlatzhalter, text: $code)
                    .font(.system(.title2, design: .monospaced).weight(.semibold))
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .keyboardType(.asciiCapable)
                    .padding(14)
                    .background(Color.tfKarte, in: RoundedRectangle(cornerRadius: 14))
                    .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.tfLinie, lineWidth: 1.5))
                    .onChange(of: code) { _, neu in
                        let f = GutscheinCode.formatieren(neu)
                        if f != neu { code = f }
                    }
                    .onSubmit { if GutscheinCode.vollstaendig(code) { melden(.code(code)) } }
                Button(Texte.Gutscheine.suchen) { melden(.code(code)) }
                    .buttonStyle(.haupt)
                    .disabled(!GutscheinCode.vollstaendig(code))
            }
            .padding(20)
        }
        .tfHintergrund()
    }

    private func melden(_ t: ScanTreffer) {
        guard !gefunden else { return }
        gefunden = true
        treffer(t)
    }

    private func modusWaehlen() async {
        #if targetEnvironment(simulator)
        modus = .manuell(Texte.Scanner.keineKamera)
        return
        #else
        guard AVCaptureDevice.default(for: .video) != nil else { modus = .manuell(Texte.Scanner.keineKamera); return }
        var erlaubt = AVCaptureDevice.authorizationStatus(for: .video)
        if erlaubt == .notDetermined {
            erlaubt = await AVCaptureDevice.requestAccess(for: .video) ? .authorized : .denied
        }
        guard erlaubt == .authorized else { modus = .manuell(Texte.Scanner.keineErlaubnis); return }
        if DataScannerViewController.isSupported && DataScannerViewController.isAvailable {
            modus = .vision
        } else {
            modus = .avQR
        }
        #endif
    }
}

// MARK: - VisionKit (Text + QR)

struct VisionScanner: UIViewControllerRepresentable {
    let gefunden: (ScanTreffer) -> Void

    func makeCoordinator() -> Koordinator { Koordinator(gefunden: gefunden) }

    func makeUIViewController(context: Context) -> DataScannerViewController {
        let c = DataScannerViewController(
            recognizedDataTypes: [.text(), .barcode(symbologies: [.qr])],
            qualityLevel: .balanced, recognizesMultipleItems: true,
            isHighFrameRateTrackingEnabled: false, isPinchToZoomEnabled: true,
            isGuidanceEnabled: true, isHighlightingEnabled: true)
        c.delegate = context.coordinator
        try? c.startScanning()
        return c
    }

    func updateUIViewController(_ c: DataScannerViewController, context: Context) {}

    static func dismantleUIViewController(_ c: DataScannerViewController, coordinator: Koordinator) {
        c.stopScanning()
    }

    @MainActor
    final class Koordinator: NSObject, DataScannerViewControllerDelegate {
        let gefunden: (ScanTreffer) -> Void
        private var fertig = false

        init(gefunden: @escaping (ScanTreffer) -> Void) { self.gefunden = gefunden }

        func dataScanner(_ dataScanner: DataScannerViewController, didAdd addedItems: [RecognizedItem], allItems: [RecognizedItem]) {
            pruefen(allItems, scanner: dataScanner)
        }

        func dataScanner(_ dataScanner: DataScannerViewController, didUpdate updatedItems: [RecognizedItem], allItems: [RecognizedItem]) {
            pruefen(allItems, scanner: dataScanner)
        }

        func dataScanner(_ dataScanner: DataScannerViewController, didTapOn item: RecognizedItem) {
            pruefen([item], scanner: dataScanner)
        }

        private func pruefen(_ items: [RecognizedItem], scanner: DataScannerViewController) {
            guard !fertig else { return }
            for item in items {
                let t: ScanTreffer?
                switch item {
                case let .text(text): t = ScanTreffer.aus(text: text.transcript)
                case let .barcode(code): t = code.payloadStringValue.flatMap { ScanTreffer.aus(qr: $0) }
                @unknown default: t = nil
                }
                if let t {
                    fertig = true
                    scanner.stopScanning()
                    gefunden(t)
                    return
                }
            }
        }
    }
}

// MARK: - AVFoundation (nur QR)

struct QRKameraAnsicht: UIViewRepresentable {
    let gefunden: (ScanTreffer) -> Void

    func makeUIView(context: Context) -> Vorschau {
        let v = Vorschau()
        let kamera = QRKamera { inhalt in
            if let t = ScanTreffer.aus(qr: inhalt) { gefunden(t) }
        }
        v.kamera = kamera
        v.vorschau.session = kamera.session
        v.vorschau.videoGravity = .resizeAspectFill
        kamera.starten()
        return v
    }

    func updateUIView(_ v: Vorschau, context: Context) {}

    static func dismantleUIView(_ v: Vorschau, coordinator: ()) {
        v.kamera?.stoppen()
    }

    final class Vorschau: UIView {
        var kamera: QRKamera?
        override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
        var vorschau: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }
    }
}

/// Kamera-Sitzung für QR-Codes. Start/Stopp laufen auf einer eigenen Warteschlange (nicht auf dem Hauptthread).
final class QRKamera: NSObject, AVCaptureMetadataOutputObjectsDelegate, @unchecked Sendable {
    let session = AVCaptureSession()
    private let schlange = DispatchQueue(label: "de.tattoofin.qrkamera")
    private let gefunden: @MainActor (String) -> Void
    private var fertig = false

    init(gefunden: @escaping @MainActor (String) -> Void) {
        self.gefunden = gefunden
        super.init()
        guard let geraet = AVCaptureDevice.default(for: .video),
              let eingang = try? AVCaptureDeviceInput(device: geraet),
              session.canAddInput(eingang) else { return }
        session.addInput(eingang)
        let ausgang = AVCaptureMetadataOutput()
        guard session.canAddOutput(ausgang) else { return }
        session.addOutput(ausgang)
        ausgang.setMetadataObjectsDelegate(self, queue: schlange)
        if ausgang.availableMetadataObjectTypes.contains(.qr) { ausgang.metadataObjectTypes = [.qr] }
    }

    func starten() { schlange.async { [self] in if !session.isRunning { session.startRunning() } } }
    func stoppen() { schlange.async { [self] in if session.isRunning { session.stopRunning() } } }

    func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput metadataObjects: [AVMetadataObject],
                        from connection: AVCaptureConnection) {
        guard !fertig else { return }
        for o in metadataObjects {
            guard let qr = o as? AVMetadataMachineReadableCodeObject, let inhalt = qr.stringValue,
                  ScanTreffer.aus(qr: inhalt) != nil else { continue }
            fertig = true
            session.stopRunning()
            let melden = gefunden
            Task { @MainActor in melden(inhalt) }
            return
        }
    }
}
