import Testing
import UIKit
@testable import DSKit

@Suite("DSKit Grundwerte")
struct DSKitTests {
    @Test("Abstände steigen und liegen im 4er-Raster")
    func abstaendeImRaster() {
        let werte = [DSAbstand.xs, DSAbstand.s, DSAbstand.m, DSAbstand.l, DSAbstand.xl, DSAbstand.xxl]
        #expect(werte == werte.sorted())
        #expect(werte.allSatisfy { $0.truncatingRemainder(dividingBy: 4) == 0 })
    }

    @Test("Tippfläche mindestens 44 pt (Apple HIG)")
    func tippflaeche() {
        #expect(DSMass.tippflaeche >= 44)
    }

    @Test("Zustand vergleichbar")
    func zustand() {
        #expect(DSZustand<Int>.fertig(1) == .fertig(1))
        #expect(DSZustand<Int>.leer != .laedt)
    }
}

@Suite("Kontrast")
@MainActor
struct KontrastTests {
    @Test("Schwarz auf Weiß ist 21:1, gleiche Farbe 1:1")
    func grenzwerte() {
        let weiss = UIColor(hex: 0xFFFFFF), schwarz = UIColor(hex: 0x000000)
        #expect(abs(DSKontrast.verhaeltnis(schwarz, weiss, stil: .light) - 21) < 0.01)
        #expect(abs(DSKontrast.verhaeltnis(weiss, weiss, stil: .light) - 1) < 0.01)
    }

    @Test("Hell/Dunkel-Paar löst je nach Modus anders auf")
    func paar() {
        let text = UIColor.ds(hell: 0x111111, dunkel: 0xF2F2F2)
        let grund = UIColor.ds(hell: 0xFFFFFF, dunkel: 0x0B0B0B)
        #expect(DSKontrast.verhaeltnis(text, grund, stil: .light) >= 4.5)
        #expect(DSKontrast.verhaeltnis(text, grund, stil: .dark) >= 4.5)
    }
}
