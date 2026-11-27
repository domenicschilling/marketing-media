// QR-Codes in Bildern auslesen (Apple Vision, ohne Zusatzpakete).
// Aufruf: swift qr-lesen.swift <bild.png> [weitere …]  → je QR eine Zeile „<datei>\t<inhalt>“
import AppKit
import Vision

for pfad in CommandLine.arguments.dropFirst() {
    guard let bild = NSImage(contentsOfFile: pfad),
          let cg = bild.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
        print("\(pfad)\tFEHLER: Bild nicht lesbar")
        continue
    }
    let anfrage = VNDetectBarcodesRequest()
    anfrage.symbologies = [.qr]
    try? VNImageRequestHandler(cgImage: cg).perform([anfrage])
    for treffer in anfrage.results ?? [] {
        print("\(pfad)\t\(treffer.payloadStringValue ?? "?")")
    }
}
