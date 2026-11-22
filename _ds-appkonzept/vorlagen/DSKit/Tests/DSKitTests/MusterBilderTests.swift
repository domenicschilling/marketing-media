import SwiftUI
import Testing
import UIKit
@testable import DSKit

// Musterbildschirm "Heute" einer Beispiel-Studio-App, nur aus DSKit gebaut.
// Erzeugt Bilder für beispiele/03-musterbildschirm (hell, dunkel, AX3, leer, fehler).
// Läuft nur, wenn DS_MUSTERBILDER=1 gesetzt ist (TEST_RUNNER_DS_MUSTERBILDER=1 bei xcodebuild).

struct BeispielPalette: DSPalette {
    // Farben einmal als UIColor, daraus die SwiftUI-Farben und die Prüfpaare (keine Doppelpflege)
    static let grundU = UIColor.ds(hell: 0xF7F5F2, dunkel: 0x111214)
    static let flaecheU = UIColor.ds(hell: 0xFFFFFF, dunkel: 0x1C1D20)
    static let textU = UIColor.ds(hell: 0x16171A, dunkel: 0xF2F1EE)
    static let textLeiseU = UIColor.ds(hell: 0x5B5E66, dunkel: 0xA4A7AE, hellKontrast: 0x3F424A, dunkelKontrast: 0xC4C7CE)
    static let linieU = UIColor.ds(hell: 0x7A7E87, dunkel: 0x6B7079)    // erst 0x8C9099: 2,94:1, vom Test gefunden
    static let markeU = UIColor.ds(hell: 0x1F5C4A, dunkel: 0x6FCFAE)
    static let aufMarkeU = UIColor.ds(hell: 0xFFFFFF, dunkel: 0x0B1F19)
    static let erfolgU = UIColor.ds(hell: 0x1F7A3D, dunkel: 0x4ADE80)
    static let warnungU = UIColor.ds(hell: 0xB45309, dunkel: 0xF5A524)  // systemOrange wäre 2,2:1
    static let fehlerU = UIColor.ds(hell: 0xB42318, dunkel: 0xFF6B5E)

    let grund = Color(uiColor: grundU)
    let flaeche = Color(uiColor: flaecheU)
    let text = Color(uiColor: textU)
    let textLeise = Color(uiColor: textLeiseU)
    let linie = Color(uiColor: linieU)
    let marke = Color(uiColor: markeU)
    let aufMarke = Color(uiColor: aufMarkeU)
    let erfolg = Color(uiColor: erfolgU)
    let warnung = Color(uiColor: warnungU)
    let fehler = Color(uiColor: fehlerU)

    var kontrastPaare: [DSKontrastPaar] {
        let s = Self.self
        return [
            DSKontrastPaar("text/grund", s.textU, auf: s.grundU, mindestens: 7),
            DSKontrastPaar("text/flaeche", s.textU, auf: s.flaecheU, mindestens: 7),
            DSKontrastPaar("textLeise/grund", s.textLeiseU, auf: s.grundU, mindestens: 4.5),
            DSKontrastPaar("textLeise/flaeche", s.textLeiseU, auf: s.flaecheU, mindestens: 4.5),
            DSKontrastPaar("linie/grund", s.linieU, auf: s.grundU, mindestens: 3),
            DSKontrastPaar("aufMarke/marke", s.aufMarkeU, auf: s.markeU, mindestens: 4.5),
            DSKontrastPaar("marke/flaeche (Text 'beantworten')", s.markeU, auf: s.flaecheU, mindestens: 4.5),
            DSKontrastPaar("warnung/flaeche (Symbol)", s.warnungU, auf: s.flaecheU, mindestens: 3),
            DSKontrastPaar("erfolg/flaeche (Symbol)", s.erfolgU, auf: s.flaecheU, mindestens: 3),
            DSKontrastPaar("fehler/flaeche (Symbol)", s.fehlerU, auf: s.flaecheU, mindestens: 3),
        ]
    }
}

struct Termin: Identifiable {
    let id = UUID()
    let uhrzeit: String
    let name: String
    let motiv: String
    let anzahlungOffen: Bool
}

struct HeuteBildschirm: View {
    let zustand: DSZustand<[Termin]>
    var offlineStand: Date? = nil
    private let p = BeispielPalette()
    @ScaledMetric(relativeTo: .body) private var symbolBreite: CGFloat = 28
    @Environment(\.dynamicTypeSize) private var schriftgroesse

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Heute")
                .font(.largeTitle.weight(.bold))
                .foregroundStyle(p.text)
                .padding(.horizontal, DSAbstand.l)
                .padding(.top, DSAbstand.xl)
                .padding(.bottom, DSAbstand.l)
                .accessibilityAddTraits(.isHeader)

            DSZustandsAnsicht(
                zustand,
                leer: DSLeerText(
                    titel: "Heute ist frei",
                    erklaerung: "Teile deine freien Zeiten, dann können Kunden direkt anfragen.",
                    symbol: "calendar.badge.plus",
                    aktion: "Freie Zeiten teilen"
                ),
                leerAktion: {},
                fehlerTitel: "Termine nicht geladen",
                veraltetSeit: offlineStand,
                nochmal: {}
            ) { termine in
                inhalt(termine)
            }
            Spacer(minLength: 0)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(p.grund)
        .tint(p.marke)
    }

    @ViewBuilder
    private func inhalt(_ termine: [Termin]) -> some View {
        VStack(alignment: .leading, spacing: DSAbstand.xl) {
            // Jetzt
            if let naechster = termine.first {
                VStack(alignment: .leading, spacing: DSAbstand.xs) {
                    Text("Als Nächstes · in 1 Std. 25 Min.").font(.dsKlein).foregroundStyle(p.textLeise)
                    Text(naechster.uhrzeit).font(.dsKennzahl).foregroundStyle(p.text)
                    Text("\(naechster.name) · \(naechster.motiv)").font(.dsText).foregroundStyle(p.text)
                }
                .padding(.horizontal, DSAbstand.l)
                .accessibilityElement(children: .combine)
            }

            // Braucht dich
            VStack(alignment: .leading, spacing: DSAbstand.s) {
                Text("Wartet auf dich").font(.dsAbschnitt).foregroundStyle(p.text)
                    .accessibilityAddTraits(.isHeader)
                VStack(spacing: 0) {
                    aufgabe(anzahl: 3, text: "neue Anfragen", zusatz: "beantworten", symbol: "bubble.left.and.text.bubble.right")
                    Divider().overlay(p.linie.opacity(0.4)) // ds-ok: Trenner, keine Schrift
                    aufgabe(anzahl: 1, text: "Anzahlung offen", zusatz: "erinnern", symbol: "eurosign.circle")
                }
                .background(p.flaeche, in: .ds(DSRadius.mittel))
            }
            .padding(.horizontal, DSAbstand.l)

            // Heute
            VStack(alignment: .leading, spacing: DSAbstand.s) {
                Text("Danach").font(.dsAbschnitt).foregroundStyle(p.text)
                    .accessibilityAddTraits(.isHeader)
                VStack(spacing: 0) {
                    ForEach(termine.dropFirst()) { t in
                        terminZeile(t)
                        if t.id != termine.last?.id {
                            Divider().overlay(p.linie.opacity(0.4)) // ds-ok: Trenner, keine Schrift
                        }
                    }
                }
                .background(p.flaeche, in: .ds(DSRadius.mittel))
            }
            .padding(.horizontal, DSAbstand.l)
        }
    }

    private func aufgabe(anzahl: Int, text: String, zusatz: String, symbol: String) -> some View {
        HStack(spacing: DSAbstand.m) {
            // Bei Bedienungshilfen-Größen bekommt der Text die ganze Breite (Symbol ist Schmuck),
            // die Handlung rutscht unter den Text statt Silben zu trennen
            if !schriftgroesse.isAccessibilitySize {
                Image(systemName: symbol).foregroundStyle(p.marke).accessibilityHidden(true)
                    .frame(width: symbolBreite)
            }
            if schriftgroesse.isAccessibilitySize {
                VStack(alignment: .leading, spacing: DSAbstand.xs) {
                    Text("\(anzahl)\u{00A0}\(text)").font(.dsText).foregroundStyle(p.text)
                    Text(zusatz).font(.dsKlein).foregroundStyle(p.marke)
                }
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                // geschütztes Leerzeichen: Zahl und Wort bleiben zusammen
                Text("\(anzahl)\u{00A0}\(text)").font(.dsText).foregroundStyle(p.text)
                Spacer(minLength: DSAbstand.s)
                Text(zusatz).font(.dsKlein).foregroundStyle(p.marke)
            }
            Image(systemName: "chevron.right").font(.dsHinweis).foregroundStyle(p.textLeise)
                .accessibilityHidden(true)
        }
        .padding(.horizontal, DSAbstand.l)
        .padding(.vertical, DSAbstand.s)
        .frame(minHeight: DSMass.tippflaeche + DSAbstand.s)
        .accessibilityElement(children: .combine)
    }

    private func terminZeile(_ t: Termin) -> some View {
        ViewThatFits(in: .horizontal) {
            HStack(alignment: .firstTextBaseline, spacing: DSAbstand.m) {
                Text(t.uhrzeit).font(.dsZahl).foregroundStyle(p.text)
                terminText(t)
            }
            // große Schrift: untereinander, nichts abgeschnitten
            VStack(alignment: .leading, spacing: DSAbstand.xs) {
                Text(t.uhrzeit).font(.dsZahl).foregroundStyle(p.text)
                terminText(t)
            }
        }
        .padding(.horizontal, DSAbstand.l)
        .padding(.vertical, DSAbstand.m)
        .frame(maxWidth: .infinity, alignment: .leading)
        .accessibilityElement(children: .combine)
    }

    private func terminText(_ t: Termin) -> some View {
        VStack(alignment: .leading, spacing: DSAbstand.xs) {
            Text(t.name).font(.dsText).foregroundStyle(p.text)
            Text(t.motiv).font(.dsKlein).foregroundStyle(p.textLeise)
            if t.anzahlungOffen { anzahlungsMarke }
        }
        .fixedSize(horizontal: false, vertical: true)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // Blindtest: gefüllte Pille wirkte im Dunkeln schlammig. Jetzt Symbol in Warnfarbe + Text, keine Fläche.
    private var anzahlungsMarke: some View {
        Label {
            Text("Anzahlung offen").foregroundStyle(p.text)
        } icon: {
            Image(systemName: "exclamationmark.circle.fill").foregroundStyle(p.warnung)
        }
        .font(.dsHinweis.weight(.semibold))
    }
}

let beispielTermine = [
    Termin(uhrzeit: "11:30", name: "Beispielkunde A", motiv: "Unterarm, Linework, 3 Std.", anzahlungOffen: false),
    Termin(uhrzeit: "15:00", name: "Beispielkunde B", motiv: "Schulter, Farbe, Folgetermin", anzahlungOffen: true),
    Termin(uhrzeit: "18:30", name: "Beispielkunde C", motiv: "Beratung, 30 Min.", anzahlungOffen: false),
]

@Suite("Musterbildschirm")
@MainActor
struct MusterBilderTests {

    @Test("Beispielpalette erfüllt die Kontrastwerte (hell, dunkel, erhöhter Kontrast)")
    func palette() {
        let befunde = DSKontrast.pruefe(BeispielPalette().kontrastPaare)
        #expect(befunde.isEmpty, "\(befunde)")
    }

    @Test("Bilder erzeugen", .enabled(if: ProcessInfo.processInfo.environment["DS_MUSTERBILDER"] == "1"))
    func bilder() throws {
        let ziel = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent() // DSKit
            .deletingLastPathComponent().deletingLastPathComponent()                             // _ds-appkonzept
            .appendingPathComponent("beispiele/03-musterbildschirm")
        try FileManager.default.createDirectory(at: ziel, withIntermediateDirectories: true)

        let varianten: [(String, DSZustand<[Termin]>, ColorScheme, DynamicTypeSize, CGFloat)] = [
            ("heute-hell", .fertig(beispielTermine), .light, .large, 760),
            ("heute-dunkel", .fertig(beispielTermine), .dark, .large, 760),
            ("heute-ax3", .fertig(beispielTermine), .light, .accessibility3, 1400),
            ("heute-leer", .leer, .light, .large, 667),
            ("heute-fehler", .fehler("Die Verbindung zum Server hat nicht geklappt. Versuch es gleich noch einmal."), .light, .large, 667),
            ("heute-ohne-netz", .fertig(beispielTermine), .light, .large, 820),
            ("heute-ohne-netz-ax3", .fertig(beispielTermine), .light, .accessibility3, 1650),
        ]
        let stand = Calendar.current.date(bySettingHour: 10, minute: 5, second: 0, of: .now)!
        for (name, zustand, schema, groesse, hoehe) in varianten {
            let ansicht = HeuteBildschirm(zustand: zustand, offlineStand: name.hasPrefix("heute-ohne-netz") ? stand : nil)
                .environment(\.colorScheme, schema)
                .environment(\.dynamicTypeSize, groesse)
                .frame(width: 375, height: hoehe)
            let renderer = ImageRenderer(content: ansicht)
            renderer.scale = 2
            let bild = try #require(renderer.uiImage, "Rendern fehlgeschlagen: \(name)")
            let daten = try #require(bild.pngData())
            try daten.write(to: ziel.appendingPathComponent("\(name).png"))
        }
    }
}
