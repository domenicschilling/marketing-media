// swift-tools-version: 6.0
// DSKit: dünne Grundschicht für alle DS-Apps (DS APPKonzept, referenzen/08-technik.md).
// Bewusst klein: Systemkomponenten zuerst, DSKit nur für Werte und Zustände,
// die jede App sonst neu erfindet.
import PackageDescription

let package = Package(
    name: "DSKit",
    defaultLocalization: "de",
    platforms: [.iOS(.v18)],
    products: [
        .library(name: "DSKit", targets: ["DSKit"])
    ],
    targets: [
        .target(name: "DSKit"),
        .testTarget(name: "DSKitTests", dependencies: ["DSKit"])
    ]
)
