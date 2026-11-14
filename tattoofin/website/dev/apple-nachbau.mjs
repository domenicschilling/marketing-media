// Nachbau der Apple-Signaturen (App Store, StoreKit 2) für lokale Tests – ohne Netz, ohne Apple-Konto.
// Erzeugt beim Start im Temp-Ordner mit /usr/bin/openssl (LibreSSL, EC prime256v1) Test-Zertifikatsketten:
//   gut              Wurzel → Zwischenzertifikat (mit 1.2.840.113635.100.6.2.1, CA) → Blatt (mit 1.2.840.113635.100.6.11.1)
//   fremd            zweite, fremde Kette („falsches Apple“, eigene Wurzel)
//   ohneOid          Blatt ohne Apple-Markierung (sonst wie gut)
//   abgelaufen       Zwischenzertifikat 2020–2021 (abgelaufen), sonst wie gut
//   zwei             nur Blatt + Zwischenzertifikat (2 Einträge)
//   xcode            ein selbstsigniertes Zertifikat wie beim StoreKit-Test in Xcode
// und signiert damit JWS (ES256, Signatur ieee-p1363) für Transaktion, Verlängerungsinfo und Server-Benachrichtigung (V2).
// Der Server nimmt die Test-Wurzel nur lokal an: APPLE_TEST_ROOT_PEM = nachbau.rootPem (wirkt nur bei http://localhost, siehe config.nurLokal).
//   const a = appleNachbau();  a.kauf({ appAccountToken })  a.benachrichtigung({ typ: "DID_RENEW", tx })  a.aufraeumen()
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

const OPENSSL = fs.existsSync("/usr/bin/openssl") ? "/usr/bin/openssl" : "openssl";
const EXT = `[root]
basicConstraints = critical,CA:true
keyUsage = critical,keyCertSign,cRLSign
subjectKeyIdentifier = hash
[inter]
basicConstraints = critical,CA:true,pathlen:0
keyUsage = critical,keyCertSign,cRLSign
1.2.840.113635.100.6.2.1 = ASN1:NULL
[leaf]
basicConstraints = critical,CA:false
keyUsage = critical,digitalSignature
1.2.840.113635.100.6.11.1 = ASN1:NULL
[leafohne]
basicConstraints = critical,CA:false
keyUsage = critical,digitalSignature
`;

export function appleNachbau({ bundleId = "de.tattoofin.app", produktId = "de.tattoofin.app.abo.monatlich", appAppleId = 6700000001 } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tf-apple-nachbau-"));
  const f = (n) => path.join(dir, n);
  const ossl = (...args) => execFileSync(OPENSSL, args, { cwd: dir, stdio: ["ignore", "pipe", "pipe"] });
  fs.writeFileSync(f("ext.cnf"), EXT);
  const schluessel = (n) => ossl("ecparam", "-name", "prime256v1", "-genkey", "-noout", "-out", n + ".key");
  const name = (n, cn) => fs.writeFileSync(f(n + ".cnf"), `[req]\ndistinguished_name = dn\nprompt = no\n[dn]\nCN = ${cn}\nO = Tattoofin Test\nC = DE\n[root]\nbasicConstraints = critical,CA:true\nkeyUsage = critical,keyCertSign,cRLSign\n`);
  let serial = 1000;
  const wurzel = (n, cn) => { schluessel(n); name(n, cn); ossl("req", "-new", "-x509", "-key", n + ".key", "-out", n + ".pem", "-days", "3650", "-config", n + ".cnf", "-extensions", "root"); };
  const csr = (n, cn) => { schluessel(n); name(n, cn); ossl("req", "-new", "-key", n + ".key", "-out", n + ".csr", "-config", n + ".cnf"); };
  const signiere = (n, ca, abschnitt, tage) => ossl("x509", "-req", "-in", n + ".csr", "-CA", ca + ".pem", "-CAkey", ca + ".key", "-set_serial", String(++serial), "-out", n + ".pem", "-days", String(tage), "-extfile", "ext.cnf", "-extensions", abschnitt);

  // Gute Kette
  wurzel("root", "Tattoofin Test Root CA");
  csr("inter", "Tattoofin Test Worldwide Developer Relations"); signiere("inter", "root", "inter", 3650);
  csr("leaf", "Tattoofin Test StoreKit Signing"); signiere("leaf", "inter", "leaf", 365);
  // Blatt ohne Apple-Markierung
  fs.copyFileSync(f("leaf.key"), f("leafohne.key"));
  ossl("req", "-new", "-key", "leafohne.key", "-out", "leafohne.csr", "-config", "leaf.cnf");
  signiere("leafohne", "inter", "leafohne", 365);
  // Abgelaufenes Zwischenzertifikat (gleicher Schlüssel und Name wie „inter“, gültig 2020–2021) per „openssl ca“ mit festen Daten
  fs.writeFileSync(f("ca.cnf"), "[ca]\ndefault_ca = t\n[t]\ndatabase = index.txt\nnew_certs_dir = .\nserial = serial.txt\ndefault_md = sha256\npolicy = pol\nunique_subject = no\n[pol]\ncommonName = supplied\norganizationName = optional\ncountryName = optional\n");
  fs.writeFileSync(f("index.txt"), ""); fs.writeFileSync(f("serial.txt"), "4001\n");
  ossl("ca", "-batch", "-config", "ca.cnf", "-cert", "root.pem", "-keyfile", "root.key", "-in", "inter.csr", "-out", "interalt.pem", "-startdate", "20200101000000Z", "-enddate", "20210101000000Z", "-extfile", "ext.cnf", "-extensions", "inter", "-notext");
  // Fremde Kette
  wurzel("root2", "Fremde Root CA");
  csr("inter2", "Fremdes Zwischenzertifikat"); signiere("inter2", "root2", "inter", 3650);
  csr("leaf2", "Fremdes Blatt"); signiere("leaf2", "inter2", "leaf", 365);
  // Xcode-ähnlich: ein selbstsigniertes Zertifikat
  wurzel("xcode", "StoreKit Testing in Xcode (Nachbau)");
  // Wie das echte Xcode-Zertifikat: selbstsigniert, aber KEIN CA-Zertifikat (checkIssued schlägt dabei fehl)
  schluessel("xcodeblatt");
  fs.writeFileSync(f("xcodeblatt.cnf"), "[req]\ndistinguished_name = dn\nprompt = no\n[dn]\nCN = StoreKit Testing in Xcode\n[blatt]\nbasicConstraints = critical,CA:false\nkeyUsage = critical,digitalSignature\n");
  ossl("req", "-new", "-x509", "-key", "xcodeblatt.key", "-out", "xcodeblatt.pem", "-days", "365", "-config", "xcodeblatt.cnf", "-extensions", "blatt");

  const pem = (n) => fs.readFileSync(f(n + ".pem"), "utf8");
  const der64 = (n) => new crypto.X509Certificate(pem(n)).raw.toString("base64");
  const key = (n) => crypto.createPrivateKey(fs.readFileSync(f(n + ".key")));
  const KETTEN = {
    gut: { x5c: ["leaf", "inter", "root"], key: "leaf" },
    fremd: { x5c: ["leaf2", "inter2", "root2"], key: "leaf2" },
    ohneOid: { x5c: ["leafohne", "inter", "root"], key: "leafohne" },
    abgelaufen: { x5c: ["leaf", "interalt", "root"], key: "leaf" },
    zwei: { x5c: ["leaf", "inter"], key: "leaf" },
    xcode: { x5c: ["xcode"], key: "xcode" },
    xcodeBlatt: { x5c: ["xcodeblatt"], key: "xcodeblatt" },
  };
  const ketten = Object.fromEntries(Object.entries(KETTEN).map(([k, v]) => [k, { x5c: v.x5c.map(der64), key: key(v.key) }]));
  const b64u = (o) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");

  // JWS bauen. Optionen: kette, alg (nur Kopf), header (zusätzliche Kopf-Felder), signatur ("hs256" = HMAC statt ES256, "keine" = leer)
  function jws(payload, { kette = "gut", alg = "ES256", header = {}, signatur = "es256" } = {}) {
    const k = ketten[kette];
    const kopf = b64u({ alg, x5c: k.x5c, ...header });
    const rumpf = b64u(payload);
    const daten = `${kopf}.${rumpf}`;
    let sig = "";
    if (signatur === "es256") sig = crypto.sign("sha256", Buffer.from(daten), { key: k.key, dsaEncoding: "ieee-p1363" }).toString("base64url");
    else if (signatur === "hs256") sig = crypto.createHmac("sha256", "geheim").update(daten).digest("base64url");
    return `${daten}.${sig || "AA"}`;
  }
  let zaehler = 2000000000 + crypto.randomInt(1, 9e6);
  const naechsteId = () => String(++zaehler);
  // Transaktion (signedTransactionInfo) wie StoreKit 2. Standard: echter Kauf (Production), 30 Tage gültig.
  function transaktion(felder = {}) {
    const jetzt = Date.now(), tid = naechsteId();
    return {
      transactionId: tid, originalTransactionId: tid, webOrderLineItemId: tid, bundleId, productId: produktId, subscriptionGroupIdentifier: "21500001",
      purchaseDate: jetzt, originalPurchaseDate: jetzt, expiresDate: jetzt + 30 * 864e5, quantity: 1, type: "Auto-Renewable Subscription",
      appAccountToken: crypto.randomUUID(), inAppOwnershipType: "PURCHASED", signedDate: jetzt, environment: "Production",
      transactionReason: "PURCHASE", storefront: "DEU", storefrontId: "143443", price: 59990, currency: "EUR", ...felder,
    };
  }
  const renewal = (tx, felder = {}) => ({
    originalTransactionId: tx.originalTransactionId, autoRenewProductId: tx.productId, productId: tx.productId, autoRenewStatus: 1,
    signedDate: Date.now(), environment: tx.environment, recentSubscriptionStartDate: tx.originalPurchaseDate, renewalDate: tx.expiresDate, ...felder,
  });
  // Kauf signieren: liefert { tx, jws }
  const kauf = (felder = {}, opts = {}) => { const tx = transaktion(felder); return { tx, jws: jws(tx, opts) }; };
  // Verlängerung derselben Abo-Kette: neue transactionId, gleiche originalTransactionId
  const verlaengerung = (tx, felder = {}) => ({ ...tx, transactionId: naechsteId(), purchaseDate: Date.now(), expiresDate: Date.now() + 30 * 864e5, signedDate: Date.now(), transactionReason: "RENEWAL", ...felder });
  // Server-Benachrichtigung V2 (signedPayload)
  function benachrichtigung({ typ, subtyp, tx, renewalInfo, uuid = crypto.randomUUID(), umgebung, bundle = bundleId, appId = appAppleId, kette = "gut", txKette = kette, ohneTx = false, signiert = Date.now() } = {}) {
    const env = umgebung || tx?.environment || "Production";
    const payload = {
      notificationType: typ, ...(subtyp ? { subtype: subtyp } : {}), notificationUUID: uuid, version: "2.0", signedDate: signiert,
      data: {
        appAppleId: appId, bundleId: bundle, bundleVersion: "1", environment: env, status: 1,
        ...(tx && !ohneTx ? { signedTransactionInfo: jws(tx, { kette: txKette }), signedRenewalInfo: jws(renewalInfo || renewal(tx), { kette: txKette }) } : {}),
      },
    };
    return { uuid, signedPayload: jws(payload, { kette }) };
  }
  return {
    dir, rootPem: pem("root"), fremdRootPem: pem("root2"), jws, transaktion, renewal, kauf, verlaengerung, benachrichtigung,
    aufraeumen: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}
