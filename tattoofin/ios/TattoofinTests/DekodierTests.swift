import Foundation
import Testing
@testable import Tattoofin

/// Beispielantworten im Format des API-Vertrags bzw. von portal.mjs
@Suite("API-Dekodierung")
struct DekodierTests {
    private func dekodiere<T: Decodable>(_ json: String, als: T.Type = T.self) throws -> T {
        try JSONDecoder().decode(T.self, from: Data(json.utf8))
    }

    @Test func portal() throws {
        let a: PortalAntwort = try dekodiere("""
        {"adminAnsicht":null,
         "studio":{"id":"st_1","firma":"Ink Studio","inhaber":"Lisa","email":"l@studio.de","ort":"Bamberg","slug":"ink",
                   "status":"live","statusText":"Live","paket":"monatlich","paketName":"Monatlich","monatNetto":49,
                   "kuendigung":null,"stripe":{"verbunden":true,"freigegeben":true,"auszahlungen":true,"kontoTyp":"standard"},
                   "kannKassieren":true,"zahlseite":"https://tattoofin.de/zahlen/ink","connectUrl":null,"extra":{"a":1}},
         "zahlungen":[
           {"id":"zl_1","studioId":"st_1","createdAt":"2026-11-13T10:00:00.000Z","art":"anzahlung","status":"bezahlt","betragCent":48000,
            "kunde":"Max Muster","beschreibung":"Rose Unterarm","zahlart":"klarna","zahlartText":"Klarna (Raten / später bezahlen)",
            "bezahltAm":"2026-11-13T10:05:00.000Z","verfuegbarAb":"2026-11-20","gebuehrNettoCent":0},
           {"id":"zl_2","createdAt":"2026-11-12T10:00:00.000Z","art":"gutschein","status":"bezahlt","betragCent":10000,"kunde":"Anna",
            "email":"a@b.de","beschreibung":"Wertgutschein",
            "gutschein":{"code":"GS-ABCD-2345","status":"gueltig","link":"https://tattoofin.de/gutschein.html?t=x","gueltigBis":"2029-12-31T22:59:59.000Z","empfaenger":"Tom"}}
         ],
         "abrechnungen":[],"extras":[],
         "kpis":{"umsatzMonatCent":58000,"zahlungenMonat":2,"provisionMonatBruttoCent":0,"auszahlungMonatCent":58000,"umsatzGesamtCent":58000,"offen":0,"anteilKlarna":50},
         "config":{"provisionProzent":0,"ustProzent":19,"minBetragCent":5000,"maxBetragCent":2000000}}
        """)
        #expect(a.studio.name == "Ink Studio")
        #expect(a.studio.darfKassieren)
        #expect(a.zahlungen.count == 2)
        #expect(a.zahlungen[0].betragCent == 48_000)
        #expect(a.zahlungen[1].istGutschein)
        #expect(a.zahlungen[1].gutschein?.code == "GS-ABCD-2345")
        #expect(a.kpis?.umsatzMonatCent == 58_000)
        #expect(a.config?.min == 5_000)
        #expect(a.config?.max == 2_000_000)
    }

    @Test func klarnaZahlartOhneRatenAussage() throws {
        let z: Zahlung = try dekodiere("""
        {"id":"zl_1","status":"bezahlt","betragCent":100,"zahlart":"klarna","zahlartText":"Klarna (Raten / später bezahlen)"}
        """)
        #expect(z.zahlartAnzeige == "Klarna")
        let k: Zahlung = try dekodiere(#"{"id":"zl_2","status":"bezahlt","betragCent":100,"zahlart":"card","zahlartText":"Karte"}"#)
        #expect(k.zahlartAnzeige == "Karte")
    }

    @Test func anmeldenFertig() throws {
        let a: AnmeldenAntwort = try dekodiere("""
        {"token":"tfa_ag_Ab12Cd34Ef56.geheim","geraet":{"id":"ag_Ab12Cd34Ef56","name":"iPhone von Lisa","platform":"ios","rolle":"inhaber"},
         "studio":{"id":"st_1","firma":"Ink Studio","ort":"Bamberg"}}
        """)
        #expect(a.token?.hasPrefix("tfa_") == true)
        #expect(a.geraet?.rolle == "inhaber")
        #expect(a.auswahl == nil)
    }

    @Test func anmeldenAuswahl() throws {
        let a: AnmeldenAntwort = try dekodiere("""
        {"auswahl":[{"id":"st_a","firma":"Ink Studio","ort":"Bamberg"},{"id":"st_b","firma":"Ink Studio 2","ort":"Hof"}],"auswahlToken":"abc.def"}
        """)
        #expect(a.token == nil)
        #expect(a.auswahl?.count == 2)
        #expect(a.auswahlToken == "abc.def")
    }

    @Test func fehlerKoerper() {
        let f = APIFehler.aus(status: 400, daten: Data(#"{"error":"Der Code stimmt nicht.","code":"code_falsch","restVersuche":3}"#.utf8))
        #expect(f.meldung == "Der Code stimmt nicht.")
        #expect(f.code == "code_falsch")
        #expect(f.restVersuche == 3)
        let leer = APIFehler.aus(status: 502, daten: Data("kaputt".utf8))
        #expect(leer.meldung == Texte.Fehler.server)
    }

    @Test func auszahlungen() throws {
        let a: AuszahlungenAntwort = try dekodiere("""
        {"konto":{"verbunden":true,"auszahlungenAktiv":true,"kontoTyp":"express"},"saldo":{"verfuegbarCent":12345,"unterwegsCent":48000,"waehrung":"eur"},
         "auszahlungen":[{"id":"po_1","betragCent":43200,"waehrung":"eur","status":"paid","statusText":"Angekommen","ankunftAm":"2026-11-15",
                          "erstelltAm":"2026-11-13T07:02:11Z","bank":{"name":"Sparkasse","endet":"1234"},"fehler":null}],
         "weitere":true,"nach":"po_1"}
        """)
        #expect(a.saldo?.verfuegbarCent == 12_345)
        #expect(a.auszahlungen.first?.bank?.endet == "1234")
        #expect(a.weitere == true)
        let ohne: AuszahlungenAntwort = try dekodiere("""
        {"konto":{"verbunden":false},"saldo":null,"auszahlungen":[],"weitere":false,"hinweis":"Noch kein Stripe-Konto verbunden."}
        """)
        #expect(ohne.saldo == nil)
        #expect(ohne.hinweis == "Noch kein Stripe-Konto verbunden.")
    }

    @Test func geraeteTeamLoeschen() throws {
        let g: GeraeteAntwort = try dekodiere("""
        {"geraete":[{"id":"ag_1","name":"iPhone von Lisa","modell":"iPhone17,1","platform":"ios","email":"l•••••@studio.de","rolle":"team",
          "createdAt":"2026-11-13T07:02:11Z","zuletztAm":"2026-11-13T07:02:11Z","mitteilungen":{"zahlungen":true,"auszahlungen":false},"push":true,"diesesGeraet":false}]}
        """)
        #expect(g.geraete.first?.mitteilungen == Mitteilungen(zahlungen: true, auszahlungen: false))
        let t: TeamAntwort = try dekodiere(#"{"hauptadresse":"inhaber@studio.de","team":["anna@studio.de"],"max":5,"darfAendern":true}"#)
        #expect(t.team == ["anna@studio.de"])
        let l: KontoLoeschenAntwort = try dekodiere(#"{"ok":true,"kuendigungZum":"2026-11-30T22:59:59.000Z","loeschungAb":"2026-12-30","studio":{"id":"st_1"}}"#)
        #expect(Datum.tag(l.loeschungAb) == "30.12.2026")
    }

    @Test func zahlungErstellt() throws {
        let z: ZahlungErstellt = try dekodiere("""
        {"zahlung":{"id":"zl_9","status":"offen","betragCent":5000,"art":"gesamt","nurKarte":true},"link":"https://tattoofin.de/zahlung.html?z=zl_9",
         "whatsappText":"Hi, hier ist dein Zahlungslink: https://tattoofin.de/zahlung.html?z=zl_9","hinweis":"Für Gutscheine bitte die Gutschein-Funktion nutzen."}
        """)
        #expect(z.zahlung.istOffen)
        #expect(z.whatsappText?.contains(z.link) == true)
    }
}
