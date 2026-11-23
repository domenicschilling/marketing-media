import Foundation
import Testing
@testable import Tattoofin

/// 1.1 Kasse: Adresse der Zahlseite, Studios ohne Anzahlung, Ausweich-Anzahlung, eine Portal-Abfrage, Texte
@Suite("Kasse 1.1")
struct Kasse11Tests {
    private func dekodiere<T: Decodable>(_ json: String, als: T.Type = T.self) throws -> T {
        try JSONDecoder().decode(T.self, from: Data(json.utf8))
    }

    private func studio(_ extra: String) throws -> Studio {
        try dekodiere(#"{"id":"st_1","firma":"Ink","status":"live","kannKassieren":false,"#
                      + #""stripe":{"verbunden":true,"freigegeben":true}"# + (extra.isEmpty ? "" : "," + extra) + "}")
    }

    // MARK: Dekodieren (alte Server ohne die neuen Felder)

    @Test func alterServerOhneNeueFelder() throws {
        let s = try studio("")
        #expect(!s.keineAnzahlung)
        #expect(!s.adresseFehlt)
        #expect(s.zahlseiteAdresse == nil)
        let z: Zahlung = try dekodiere(#"{"id":"z1","status":"offen","betragCent":10000}"#)
        #expect(z.istOffen)
        #expect(!z.istAusweichAngezahlt)
        #expect(z.restImStudioCent == nil)
        #expect(z.anzeigeStatus == "offen")
    }

    @Test func neueStudioFelder() throws {
        let s = try studio(#""strasse":"Hauptstr. 1","plz":"96047","ort":"Bamberg","land":"DE","anzahlungAus":true,"#
                           + #""zahlseiteAdresse":{"fehlt":true,"vorschlag":true,"privat":true,"bestaetigtAm":null}"#)
        #expect(s.keineAnzahlung)
        #expect(s.adresseFehlt)
        #expect(s.adresseIstVorschlag)
        #expect(s.adresseIstPrivat)
        #expect(s.adresseInDeutschland)
        #expect(s.strasse == "Hauptstr. 1")
        let m: StudioMehr = try dekodiere(#"{"id":"st_1","anzahlungAus":true}"#)
        #expect(m.keineAnzahlung)
    }

    @Test func testkasseBrauchtKeineAdresse() throws {
        let s = try studio(#""testmodus":true,"zahlseiteAdresse":{"fehlt":true}"#)
        #expect(!s.adresseFehlt)
    }

    // MARK: Gesperrte Kasse

    @Test func fallAdresseFehlt() throws {
        let s = try studio(#""zahlseiteAdresse":{"fehlt":true}"#)
        #expect(GesperrtKarte.fall(s) == .adresseFehlt)
        #expect(GesperrtKarte.pruefMeldung(s) == Texte.Kasse11.adresseNochNoetig)
    }

    @Test func fallVertragNichtAktiv() throws {
        let s = try studio(#""zahlseiteAdresse":{"fehlt":false}"#)
        #expect(GesperrtKarte.fall(s) == .wartet)
        #expect(GesperrtKarte.pruefMeldung(s) == Texte.Kasse.vertragNichtAktiv)
    }

    @Test func fallStripeNochNichtFrei() throws {
        let s: Studio = try dekodiere(#"{"id":"st_1","kannKassieren":false,"stripe":{"verbunden":true,"freigegeben":false},"zahlseiteAdresse":{"fehlt":true}}"#)
        #expect(GesperrtKarte.fall(s) == .wartet)
        #expect(GesperrtKarte.pruefMeldung(s) == Texte.Kasse.nochNichtFrei)
        let frei: Studio = try dekodiere(#"{"id":"st_1","kannKassieren":true,"stripe":{"verbunden":true,"freigegeben":true}}"#)
        #expect(GesperrtKarte.pruefMeldung(frei) == nil)
    }

    // MARK: Prüfer-Nachbesserung: privat-Hinweis und „Stimmt so“ nur bei offenem Vorschlag

    @Test func privatHinweisNurBeiOffenemVorschlag() throws {
        let offen = try studio(#""zahlseiteAdresse":{"fehlt":true,"vorschlag":true,"privat":true}"#)
        #expect(offen.adresseIstPrivat)
        let bestaetigt = try studio(#""zahlseiteAdresse":{"fehlt":false,"vorschlag":false,"privat":true}"#)
        #expect(!bestaetigt.adresseIstPrivat)
    }

    @Test func stimmtSoNurBeiUnveraendertemVorschlag() {
        let o = ["Hauptstraße 1", "96047", "Bamberg"]
        #expect(AdresseKnopf.stimmtSo(vorschlag: true, felder: [" Hauptstraße 1", "96047", "Bamberg "], original: o))
        #expect(!AdresseKnopf.stimmtSo(vorschlag: true, felder: ["Hauptstraße 2", "96047", "Bamberg"], original: o))
        #expect(!AdresseKnopf.stimmtSo(vorschlag: false, felder: o, original: o))
        #expect(!AdresseKnopf.stimmtSo(vorschlag: true, felder: ["", "", ""], original: ["", "", ""]))
    }

    // MARK: Adresse prüfen (wie portal.mjs)

    @Test func adressePruefung() {
        #expect(AdressePruefung.meldung(strasse: "Hauptstr. 1", plz: "96047", ort: "Bamberg", deutschland: true) == nil)
        #expect(AdressePruefung.fehlt(strasse: " ", plz: "9604", ort: "", deutschland: true)
                == [Texte.Kasse11.adresseStrasse, Texte.Kasse11.adresseOrt, Texte.Kasse11.adressePlzFuenf])
        #expect(AdressePruefung.fehlt(strasse: "Rue 1", plz: "", ort: "Wien", deutschland: false).isEmpty)
        #expect(AdressePruefung.fehlt(strasse: "A 1", plz: "١٢٣٤٥", ort: "B", deutschland: true) == [Texte.Kasse11.adressePlzFuenf])
        #expect(AdressePruefung.meldung(strasse: "", plz: "96047", ort: "B", deutschland: true) == "Bitte ausfüllen: Straße und Hausnummer")
    }

    // MARK: Studio ohne Anzahlung

    @Test func entwurfOhneAnzahlung() {
        var e = KasseEntwurf()
        e.anzahlung = true
        e.betrag = "250"
        #expect(e.passend(keineAnzahlung: true).anzahlung == false)
        #expect(e.passend(keineAnzahlung: true).betrag == "250")
        #expect(e.passend(keineAnzahlung: false).anzahlung == true)
    }

    // MARK: Ausweich-Anzahlung

    @Test func ausweichOriginalIstNichtMehrOffen() throws {
        let z: Zahlung = try dekodiere(#"{"id":"z1","status":"offen","art":"gesamt","betragCent":100000,"#
                                       + #""klarnaAbgelehnt":{"am":"2026-11-20T10:00:00Z"},"#
                                       + #""ausweich":{"anzahlungId":"z2","bezahltAm":"2026-11-20T10:05:00Z","betragCent":30000}}"#)
        #expect(z.istAusweichAngezahlt)
        #expect(!z.istOffen)
        #expect(z.anzeigeStatus == "angezahlt")
        #expect(z.restImStudioCent == 70_000)
        // Nur gewählt, noch nicht bezahlt: Link bleibt offen
        let gewaehlt: Zahlung = try dekodiere(#"{"id":"z1","status":"offen","betragCent":100000,"ausweich":{"anzahlungId":"z2","am":"x"}}"#)
        #expect(gewaehlt.istOffen)
        #expect(gewaehlt.restImStudioCent == nil)
    }

    @Test func ausweichAnzahlungsEintrag() throws {
        let z: Zahlung = try dekodiere(#"{"id":"z2","status":"bezahlt","art":"anzahlung","betragCent":30000,"ausweichVon":"z1","#
                                       + #""restCent":70000,"nurKarte":true,"hinweis":"Rest 700,00 € direkt im Studio"}"#)
        #expect(z.restImStudioCent == 70_000)
        #expect(z.hinweis?.contains("Studio") == true)
        #expect(!z.istAusweichAngezahlt)
    }

    @Test func angezahltText() {
        let t = Texte.Kasse11.angezahlt(anzahlung: 30_000, rest: 70_000)
        #expect(t.contains(Euro.text(30_000)))
        #expect(t.contains(Euro.text(70_000)))
        #expect(!t.localizedCaseInsensitiveContains("Klarna"))
    }

    @MainActor @Test func offeneLinksOhneAngezahlte() throws {
        let a: PortalAntwort = try dekodiere(#"{"studio":{"id":"st_1"},"kpis":{"offen":3},"zahlungen":["#
            + #"{"id":"a","status":"offen","betragCent":5000},"#
            + #"{"id":"b","status":"offen","betragCent":5000,"ausweich":{"bezahltAm":"x","betragCent":1500}},"#
            + #"{"id":"c","status":"offen","betragCent":5000},"#
            + #"{"id":"d","status":"bezahlt","betragCent":5000}]}"#)
        let p = PortalStore()
        p.studio = a.studio
        p.zahlungen = a.zahlungen
        p.kpis = a.kpis
        #expect(p.kpisAnzeige?.offen == 2)
        p.kpis = KPIs(umsatzMonatCent: 1)
        #expect(p.kpisAnzeige?.offen == nil)
    }

    // MARK: Erstattung je Zahlung

    @Test func erstattungHinweisNachAbwicklung() throws {
        let prov: Zahlung = try dekodiere(#"{"id":"z","status":"bezahlt","betragCent":1,"abwicklung":"plattform"}"#)
        let direkt: Zahlung = try dekodiere(#"{"id":"z","status":"bezahlt","betragCent":1,"abwicklung":"direkt"}"#)
        let eigen: Zahlung = try dekodiere(#"{"id":"z","status":"bezahlt","betragCent":1,"abwicklung":"studio"}"#)
        let alt: Zahlung = try dekodiere(#"{"id":"z","status":"bezahlt","betragCent":1}"#)
        #expect(prov.erstattungHinweis == Texte.Kasse11.erstattungProvision)
        #expect(direkt.erstattungHinweis == Texte.Kasse11.erstattungProvision)
        #expect(eigen.erstattungHinweis == Texte.Detail.erstattungHinweis)
        #expect(alt.erstattungHinweis == Texte.Detail.erstattungHinweis)
    }

    // MARK: Eine Portal-Abfrage für Kasse und Konto

    @Test func portalBeideLiestBeides() throws {
        let b: PortalBeide = try dekodiere(#"{"studio":{"id":"st_1","firma":"Ink","modell":"provision","provisionProzent":3.5,"anzahlungAus":true},"#
                                           + #""zahlungen":[],"abrechnungen":[],"config":{"minBetragCent":5000,"rechtVersion":"2026-11"}}"#)
        #expect(b.antwort.studio.keineAnzahlung)
        #expect(b.antwort.config?.min == 5_000)
        #expect(b.mehr?.studio.istProvision == true)
        #expect(b.mehr?.config?.rechtVersion == "2026-11")
    }

    @Test func neuLadenNachHintergrund() {
        let jetzt = Date(timeIntervalSince1970: 1_000_000)
        #expect(PortalStore.neuLadenNoetig(geladenAm: nil, jetzt: jetzt))
        #expect(!PortalStore.neuLadenNoetig(geladenAm: jetzt.addingTimeInterval(-60), jetzt: jetzt))
        #expect(PortalStore.neuLadenNoetig(geladenAm: jetzt.addingTimeInterval(-121), jetzt: jetzt))
    }

    // MARK: Checkliste: Punkt „adresse“ führt zur Maske

    @Test func checklisteAdresseHatKnopf() throws {
        let start: StartAntwort = try dekodiere(#"{"checkliste":{"punkte":[{"id":"adresse","ok":false,"titel":"Adresse deiner Zahlseite","ziel":null,"#
                                                + #""text":"Kurz im Studio-Bereich auf tattoofin.de eintragen","darf":true},"#
                                                + #"{"id":"adresse","ok":false,"titel":"x","darf":false}]},"rolle":"inhaber"}"#)
        let p = StartCheckpunkte.punkte(server: start.punkte)
        #expect(p[0].aktion == .adresse)
        #expect(p[0].text == Texte.Kasse11.checklisteAdresseText)
        #expect(p[1].aktion == nil)
    }

    // MARK: Texte

    @Test func texteOhneKlarnaUndPreis() {
        let texte = [Texte.Kasse11.adresseText, Texte.Kasse11.adresseVorschlagText, Texte.Kasse11.adresseTeam, Texte.Kasse11.adresseNochNoetig,
                     Texte.Kasse11.adresseMaskeText, Texte.Kasse11.adressePrivatText, Texte.Kasse11.keineAnzahlung, Texte.Kasse11.angezahltKurz,
                     Texte.Kasse11.nichtMehrAutomatisch, Texte.Kasse11.erstattungProvision, Texte.Kasse11.ersteAuszahlung,
                     Texte.Kasse11.checklisteAdresseText]
        for t in texte {
            for verboten in ["Klarna", "Raten", "PayPal", "netto", "49"] {
                #expect(!t.localizedCaseInsensitiveContains(verboten), "„\(verboten)“ in: \(t)")
            }
        }
        #expect(Texte.Kasse11.ersteAuszahlung.contains("7 bis 14 Tage"))
    }
}
