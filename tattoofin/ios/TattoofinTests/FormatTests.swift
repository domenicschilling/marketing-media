import Foundation
import Testing
@testable import Tattoofin

@Suite("Beträge")
struct BetragTests {
    @Test func parser() {
        #expect(BetragEingabe.cent(aus: "480") == 48_000)
        #expect(BetragEingabe.cent(aus: "480,5") == 48_050)
        #expect(BetragEingabe.cent(aus: "480,05") == 48_005)
        #expect(BetragEingabe.cent(aus: "0,") == 0)
        #expect(BetragEingabe.cent(aus: "") == nil)
        #expect(BetragEingabe.cent(aus: "1,234") == nil)
        #expect(BetragEingabe.cent(aus: "1,2,3") == nil)
    }

    @Test func ziffernblock() {
        var e = BetragEingabe()
        for t in ["0", "0", "4", "8", "0", ",", "5", "0", "9"] { e.taste(t) }
        #expect(e.text == "480,50")
        #expect(e.cent == 48_050)
        e.taste("⌫"); e.taste("⌫"); e.taste("⌫")
        #expect(e.text == "480")
        e.taste(","); e.taste(",")
        #expect(e.text == "480,")
        var leer = BetragEingabe()
        leer.taste(",")
        #expect(leer.text == "0,")
        var gross = BetragEingabe()
        for _ in 0..<8 { gross.taste("9") }
        #expect(gross.text == "99999")
    }

    @Test func anzeige() {
        #expect(BetragEingabe(text: "20000").anzeige == "20.000 €")
        #expect(BetragEingabe(text: "480,5").anzeige == "480,5 €")
        #expect(BetragEingabe().anzeige == "0 €")
    }

    @Test func euroFormat() {
        #expect(Euro.text(48_000).replacingOccurrences(of: "\u{a0}", with: " ") == "480,00 €")
        #expect(Euro.kurz(5_000) == "50 €")
        #expect(Euro.kurz(2_000_000) == "20.000 €")
        #expect(Euro.fuerServer(48_050) == "480.50")
        #expect(Euro.fuerServer(5) == "0.05")
        #expect(Euro.gesprochen(48_000) == "480 Euro")
    }
}

@Suite("Gutschein-Codes")
struct GutscheinCodeTests {
    @Test func formatierenBeimTippen() {
        #expect(GutscheinCode.formatieren("g") == "G")
        #expect(GutscheinCode.formatieren("gs") == "GS")
        #expect(GutscheinCode.formatieren("gs-") == "GS")
        #expect(GutscheinCode.formatieren("ga") == "GS-GA")
        #expect(GutscheinCode.formatieren("gsab") == "GS-AB")
        #expect(GutscheinCode.formatieren("abcd2345") == "GS-ABCD-2345")
        #expect(GutscheinCode.formatieren("GS-ABCD-2345XYZ") == "GS-ABCD-2345")
        // 0, O, 1, I gibt es im Alphabet nicht
        #expect(GutscheinCode.formatieren("gs-o0i1abcd") == "GS-ABCD")
        #expect(GutscheinCode.formatieren("") == "")
    }

    @Test func muster() {
        #expect(GutscheinCode.istCode("GS-ABCD-2345"))
        #expect(GutscheinCode.istCode("GSABCD2345"))
        #expect(!GutscheinCode.istCode("GS-ABCD-2340"))
        #expect(!GutscheinCode.istCode("GS-ABC-2345"))
    }

    @Test func ausText() {
        #expect(GutscheinCode.ausText("Dein Code: GS-K7QM-4XPA gültig bis 2029") == "GS-K7QM-4XPA")
        #expect(GutscheinCode.ausText("gs k7qm 4xpa") == "GS-K7QM-4XPA")
        #expect(GutscheinCode.ausText("Kein Code hier") == nil)
    }

    @Test func tokenAusQR() {
        #expect(GutscheinCode.tokenAusQR("https://tattoofin.de/gutschein.html?t=AbC-12_x") == "AbC-12_x")
        #expect(GutscheinCode.tokenAusQR("http://localhost:8888/gutschein.html?t=xyz") == "xyz")
        #expect(GutscheinCode.tokenAusQR("https://tattoofin.de/zahlung.html?z=zl_1") == nil)
        #expect(GutscheinCode.tokenAusQR("https://tattoofin.de/gutschein.html") == nil)
        #expect(GutscheinCode.tokenAusQR("https://tattoofin.de/gutschein.html?t=<script>") == nil)
    }

    @Test func scanTreffer() {
        #expect(ScanTreffer.aus(qr: "https://tattoofin.de/gutschein.html?t=abc") == .token("abc"))
        #expect(ScanTreffer.aus(text: "GS-ABCD-2345") == .code("GS-ABCD-2345"))
    }
}

@Suite("Push")
struct PushTests {
    @Test func tokenHex() {
        let d = Data([0x00, 0x0f, 0xab, 0xff, 0x10])
        #expect(TokenHex.hex(d) == "000fabff10")
        let lang = Data((0..<32).map { UInt8($0) })
        let hex = TokenHex.hex(lang)
        #expect(hex.count == 64)
        #expect(hex.wholeMatch(of: /[0-9a-f]{64}/) != nil)
    }
}

@Suite("Datum")
struct DatumTests {
    @Test func parsen() {
        #expect(Datum.parse("2026-11-13T07:02:11Z") != nil)
        #expect(Datum.parse("2026-11-13T07:02:11.123Z") != nil)
        #expect(Datum.parse("2026-11-15") != nil)
        #expect(Datum.parse("quatsch") == nil)
        #expect(Datum.tag("2026-11-15") == "15.11.2026")
    }
}

@Suite("Texte verbinden")
struct VerbindenTests {
    @Test func leereTeileFallenWeg() {
        let teile: [String?] = ["Tattoo-Projekt", "", nil, "  ", "Karte"]
        #expect(teile.verbunden() == "Tattoo-Projekt · Karte")
        #expect(([] as [String?]).verbunden() == "")
    }
}
