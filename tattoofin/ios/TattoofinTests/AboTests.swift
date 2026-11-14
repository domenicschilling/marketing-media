import Foundation
import StoreKit
import StoreKitTest
import Testing
@testable import Tattoofin

/// Echter StoreKit-Testkauf (StoreKit-Testdatei StoreKit/Tattoofin.storekit, im Test-Bundle als Ressource).
/// Mit TF_LOKAL_SERVER=1 (xcodebuild: TEST_RUNNER_TF_LOKAL_SERVER=1) zusätzlich die ganze Kette gegen dev/app-lokal.mjs
/// (Standard http://localhost:8888, anderer Port mit TEST_RUNNER_TF_API_BASE).
@Suite("Apple-Abo (StoreKit-Test)", .serialized)
@MainActor
struct AboStoreKitTests {
    private let id = AboKonstanten.produktId

    private func sitzung() throws -> SKTestSession {
        let s = try SKTestSession(configurationFileNamed: "Tattoofin")
        s.resetToDefaultState()
        s.clearTransactions()
        s.disableDialogs = true
        s.storefront = "DEU"
        s.locale = Locale(identifier: "de_DE")
        return s
    }

    private func produkt() async throws -> Product {
        try #require(try await Product.products(for: [id]).first)
    }

    private func berechtigungen() async -> [Transaction] {
        var liste: [Transaction] = []
        for await r in Transaction.currentEntitlements {
            if case .verified(let tx) = r, tx.productID == id { liste.append(tx) }
        }
        return liste
    }

    /// Nutzdaten eines JWS (Teil 2, base64url)
    private func nutzdaten(_ jws: String) throws -> [String: Any] {
        let teile = jws.split(separator: ".")
        try #require(teile.count == 3)
        var b = String(teile[1]).replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        while b.count % 4 != 0 { b += "=" }
        let daten = try #require(Data(base64Encoded: b))
        return try #require(try JSONSerialization.jsonObject(with: daten) as? [String: Any])
    }

    @Test func produktLaedt() async throws {
        let _ = try sitzung()
        let p = try await produkt()
        #expect(p.displayName == "Tattoofin Monatlich")
        #expect(p.description == "Zahlungslinks, Zahlseite und Gutscheine")
        #expect(p.type == .autoRenewable)
        #expect(p.subscription?.subscriptionPeriod.unit == .month)
        #expect(p.subscription?.subscriptionPeriod.value == 1)
        #expect(p.subscription?.introductoryOffer == nil)
        #expect(p.price == Decimal(string: "59.99"))
        await AboManager.shared.produktLaden()
        #expect(AboManager.shared.produkt?.id == id)
        #expect(!AboManager.shared.produktFehler)
    }

    @Test func kaufMitAppAccountTokenUndAblauf() async throws {
        let s = try sitzung()
        let p = try await produkt()
        let uuid = UUID()
        let r = try await p.purchase(options: [.appAccountToken(uuid)])
        guard case .success(let v) = r, case .verified(let tx) = v else {
            Issue.record("Kauf nicht bestätigt: \(r)")
            return
        }
        #expect(tx.appAccountToken == uuid)
        #expect(tx.productID == id)
        #expect(tx.ownershipType == .purchased)
        let n = try nutzdaten(v.jwsRepresentation)
        #expect(n["environment"] as? String == "Xcode")
        #expect((n["appAccountToken"] as? String)?.lowercased() == uuid.uuidString.lowercased())
        #expect(n["type"] as? String == "Auto-Renewable Subscription")
        await tx.finish()

        #expect(await berechtigungen().count == 1)
        // Zuordnung wie im Hintergrund-Abgleich: passender Entwurf → bestätigen
        let e = RegistrierungEntwurf(entwurfId: "st_x", entwurfToken: "t", appAccountToken: uuid.uuidString.lowercased(),
                                     produktId: id, email: "x@beispiel.test", gespeichertAm: .now)
        #expect(AboManager.zuordnung(appAccountToken: tx.appAccountToken, produktId: tx.productID, entwurf: e, studio: nil, istInhaber: false) == .entwurfBestaetigen)

        // Ablauf: Die Testsitzung setzt das Ablaufdatum in die Vergangenheit und schaltet die Verlängerung aus.
        // (Transaction.currentEntitlements im selben Prozess bleibt dabei zwischengespeichert, deshalb hier die Sitzung prüfen.)
        try s.expireSubscription(productIdentifier: id)
        let nachAblauf = s.allTransactions().filter { $0.productIdentifier == id }
        #expect(!nachAblauf.isEmpty)
        #expect(nachAblauf.allSatisfy { ($0.expirationDate ?? .distantFuture) <= .now && !$0.autoRenewingEnabled })
    }

    /// Ganze Kette gegen den lokalen Server (Code 123456, APPLE_XCODE_TEST=1): Code → Entwurf → Kauf → Konto mit Token
    @Test(.enabled(if: ProcessInfo.processInfo.environment["TF_LOKAL_SERVER"] == "1"))
    func ketteGegenLokalenServer() async throws {
        let _ = try sitzung()
        // Anderer Port mit TF_API_BASE (xcodebuild: TEST_RUNNER_TF_API_BASE=http://localhost:8899)
        if let b = ProcessInfo.processInfo.environment["TF_API_BASE"] { UserDefaults.standard.set(b, forKey: "TFApiBase") }
        let api = APIClient()
        let email = "neu-\(Int(Date.now.timeIntervalSince1970))@beispiel.test"
        _ = try await api.registrierenCode(email: email)
        let geraet = GeraetInfo.angaben()
        let a = try await api.registrierenPruefen(email: email, code: "123456", geraet: geraet)
        #expect(a.art == "registrieren")
        let token = try #require(a.registrierToken)
        var d = StudioDaten()
        d.firma = "Test Ink"; d.inhaber = "Lena Test"; d.strasse = "Hauptstraße 1"; d.plz = "96047"; d.ort = "Bamberg"
        d.telefon = "0151 2345678"; d.studioTelefon = "0951 123456"; d.unterzeichner = "Lena Test"
        let r = try await api.registrieren(.init(registrierToken: token, daten: d,
                                                 akzeptiert: Bestaetigungen(vertrag: true, avv: true, unternehmer: true, kmu: true)))
        let uuid = try #require(UUID(uuidString: r.appAccountToken))
        let p = try await produkt()
        let kauf = try await p.purchase(options: [.appAccountToken(uuid)])
        guard case .success(let v) = kauf, case .verified(let tx) = v else {
            Issue.record("Kauf nicht bestätigt")
            return
        }
        let b = try await api.aboBestaetigen(entwurfToken: r.entwurfToken, signedTransaction: v.jwsRepresentation, geraet: geraet)
        #expect(b.token?.hasPrefix("tfa_") == true)
        #expect(b.studio?.id == r.entwurfId)
        #expect(b.abo?.status == "aktiv")
        // Gleicher Kauf noch einmal → gleiches Studio (idempotent)
        let b2 = try await api.aboBestaetigen(entwurfToken: r.entwurfToken, signedTransaction: v.jwsRepresentation, geraet: geraet)
        #expect(b2.studio?.id == r.entwurfId)
        await tx.finish()
    }
}
