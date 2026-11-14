// Lokaler Server für die Tattoofin-App im iOS-Simulator: Website + Funktionen + Stripe-Nachbau + APNs-Nachbau + Beispiel-Studios.
//   cd tattoofin/website && NODE_PATH=… node dev/app-lokal.mjs        (PORT=8888, STRIPE_MOCK_PORT=12111, APP_LOKAL_CODE=123456 Standard)
// Danach die App im Simulator mit dem Startargument  -TFApiBase http://localhost:8888  starten und mit einer der Adressen unten
// anmelden. Der feste Code gilt NUR lokal (http://localhost, nie auf Netlify). Nichts verlässt den Rechner: keine Mails (nur Protokoll
// in dev/.data-app/), kein echtes Stripe, kein echtes APNs. Mitteilungen gehen über `xcrun simctl push` an den gebooteten Simulator.
// Bei jedem Start werden die Daten neu angelegt (der Stripe-Nachbau lebt nur im Arbeitsspeicher) → in der App einfach neu anmelden.
// Neues Studio in der App (Apple-Abo, seit 14.11.2026): „Neues Studio? Konto anlegen“ mit beliebiger neuer Adresse, Code wie oben.
// APPLE_XCODE_TEST=1 nimmt die StoreKit-Testkäufe aus Xcode an (selbstsignierte Kette, environment „Xcode“) – wirkt NUR lokal
// (config.nurLokal: http://localhost, nicht auf Netlify). APPLE_SANDBOX_STRIPE=1: Stripe-Einrichtung (Nachbau) auch nach Testkäufen,
// damit der ganze Ablauf Kauf → Stripe verbinden → Kasse offen im Simulator geht.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { startDev } from "./server.mjs";
import { startApnsNachbau, testSchluessel } from "./apns-nachbau.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || 8888), BASE = `http://localhost:${PORT}`, STRIPE = `http://localhost:${Number(process.env.STRIPE_MOCK_PORT || 12111)}`;
const CODE = /^\d{6}$/.test(process.env.APP_LOKAL_CODE || "") ? process.env.APP_LOKAL_CODE : "123456";
const REVIEW_CODE = "246810";
const BUNDLE = process.env.APNS_BUNDLE_ID || "de.tattoofin.app";
const dataDir = path.join(root, "dev", ".data-app");
fs.rmSync(dataDir, { recursive: true, force: true });
fs.mkdirSync(dataDir, { recursive: true });
for (const k of ["RESEND_API_KEY", "SMTP_HOST", "STRIPE_SECRET_KEY", "META_CAPI_TOKEN", "TF_JETZT"]) delete process.env[k];
Object.assign(process.env, { APP_LOKAL_CODE: CODE, TF_BEZAHLFELD: "aus", ADMIN_EMAIL: "admin@beispiel.test", APPLE_XCODE_TEST: "1", APPLE_SANDBOX_STRIPE: "1" });
delete process.env.APPLE_TEST_ROOT_PEM;

// APNs-Nachbau: Schlüssel nur zur Laufzeit; jede Mitteilung wird an den gebooteten Simulator weitergereicht (falls vorhanden)
const sch = testSchluessel();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tf-apns-"));
const apns = await startApnsNachbau({
  log: (z) => console.log(z),
  antwort: (p) => new Promise((ok) => {
    const datei = path.join(tmp, `push-${Date.now()}.json`);
    fs.writeFileSync(datei, JSON.stringify(p.payload));
    execFile("xcrun", ["simctl", "push", "booted", BUNDLE, datei], (err) => {
      if (err) console.log(`[apns-nachbau] simctl push nicht möglich (${String(err.message).split("\n")[0].slice(0, 100)})`);
      fs.rmSync(datei, { force: true });
      ok({ status: 200 });
    });
  }),
});
Object.assign(process.env, { APNS_KEY_P8: sch.pem, APNS_KEY_ID: "LOKAL12345", APNS_TEAM_ID: "LOKALTEAM1", APNS_BUNDLE_ID: BUNDLE, APNS_HOST_SANDBOX: apns.url, APNS_HOST_PRODUCTION: apns.url });

await startDev({ port: PORT, mock: true, dataDir, quiet: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const call = async (method, url, { token, cookie, body, admin } = {}) => {
  const r = await fetch(BASE + url, { method, headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}), ...(admin ? { authorization: "Bearer admin" } : {}), ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined, redirect: "manual" });
  let data = {}; try { data = await r.json(); } catch { /* leer */ }
  return { status: r.status, data, headers: r.headers };
};
const stripeForm = (url, felder = {}) => fetch(STRIPE + url, { method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(felder) });
const mock = (p, body) => fetch(`${STRIPE}/mock/${p}`, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : undefined).then((r) => r.json());

async function studio(email, firma, ort) {
  const r = await call("POST", "/api/signup", { body: { firma, inhaber: "Alex Beispiel", strasse: "Beispielstraße 1", plz: "96047", ort, email, telefon: "0151 1234567", studioTelefon: "0951 123456", unterzeichner: "Alex Beispiel", paket: "monatlich", akzeptiert: { vertrag: true, avv: true, unternehmer: true, kmu: true } } });
  const cookie = (r.headers.get("set-cookie") || "").split(";")[0];
  await stripeForm(new URL(r.data.url).pathname, { pm: "card" }); await wait(200);
  const sess = await call("POST", "/api/portal/stripe-session", { cookie });
  await stripeForm(`/onboarding-fertig/${sess.data.konto}`, { name: "Alex Beispiel", iban: "DE89370400440532013000" }); await wait(200);
  const id = (await call("GET", "/api/admin/studios", { admin: true })).data.find((s) => s.email === email).id;
  await call("POST", `/api/admin/studio/${id}/live`, { admin: true, body: {} });
  return { id, konto: sess.data.konto, cookie };
}
async function appToken(email, studioId) {
  await call("POST", "/api/app/code", { body: { email, platform: "ios" } });
  const geraet = { name: "Einrichtung (lokal)", modell: "Mac", platform: "ios", osVersion: "-", appVersion: "app-lokal" };
  let r = await call("POST", "/api/app/anmelden", { body: { email, code: CODE, geraet } });
  if (r.data.auswahl) r = await call("POST", "/api/app/anmelden", { body: { auswahlToken: r.data.auswahlToken, studioId, geraet } });
  return r.data.token;
}
async function bezahlt(token, daten) {
  const z = await call("POST", "/api/portal/zahlung", { token, body: daten });
  const p = await call("POST", "/api/pay", { body: { z: z.data.zahlung.id, inhaltOk: true, bedingungen: true } });
  await stripeForm(new URL(p.data.url).pathname, { pm: "card" }); await wait(200);
  return z.data.zahlung.id;
}

// ---- Beispieldaten ----
const bamberg = await studio("studio@beispiel.test", "Ink Studio Bamberg", "Bamberg");
const hof = await studio("zwei@beispiel.test", "Ink Studio Hof", "Hof");
await call("POST", `/api/admin/studio/${bamberg.id}/team`, { admin: true, body: { emails: ["team@beispiel.test", "zwei@beispiel.test"] } });
const t = await appToken("studio@beispiel.test", bamberg.id);
await bezahlt(t, { betrag: "480", kunde: "Jonas Beispiel", beschreibung: "Unterarm Blackwork" });
await bezahlt(t, { betrag: "150", kunde: "Mia Beispiel", beschreibung: "Fineline Schulter", art: "anzahlung" });
await bezahlt(t, { betrag: "350", kunde: "Tom Beispiel", beschreibung: "Rückenstück", sitzungen: "Sitzung 2 von 3" });
await call("POST", "/api/portal/zahlung", { token: t, body: { betrag: "2000", kunde: "Lena Beispiel", beschreibung: "Sleeve linker Arm" } });
const gsId = await bezahlt(t, { art: "gutschein", betrag: "100", kunde: "Greta Beispiel", email: "greta@beispiel.test", empfaenger: "Max", nachricht: "Alles Gute!" });
const gs = (await call("GET", `/api/portal/zahlung/${gsId}`, { token: t })).data.zahlung?.gutschein;
// Diese Einrichtungs-Sitzung wieder abmelden (sie zählt sonst als Gerät)
await call("POST", "/api/app/abmelden", { token: t });
await mock("webhooks?an=0");
const tag = 86400, jetzt = Math.floor(Date.now() / 1000);
await mock("payout", { account: bamberg.konto, amount: 62000, status: "paid", created: jetzt - 9 * tag, arrival_date: jetzt - 7 * tag });
await mock("payout", { account: bamberg.konto, amount: 45800, status: "paid", created: jetzt - 3 * tag, arrival_date: jetzt - 1 * tag });
await mock("payout", { account: bamberg.konto, amount: 98000, status: "in_transit", created: jetzt - 1 * tag, arrival_date: jetzt + 1 * tag });
await mock("webhooks?an=1");
await mock(`saldo/${bamberg.konto}?verfuegbar=12345&unterwegs=48000`);
// Demo-Studio + Review-Zugang (wie später bei Apple)
const demo = (await call("POST", "/api/admin/app-demo", { admin: true, body: { email: "review@beispiel.test" } })).data;
Object.assign(process.env, { APP_REVIEW_EMAIL: "review@beispiel.test", APP_REVIEW_CODE: REVIEW_CODE, APP_REVIEW_STUDIO_ID: demo.studioId });

const z = (s) => console.log(s);
z("\n────────────────────────────────────────────────────────────────────────────");
z(` Tattoofin lokal für die App:  ${BASE}`);
z(`   Simulator-Startargument:    -TFApiBase ${BASE}`);
z(`   Dashboard im Browser:       ${BASE}/app.html  (Login-Links stehen in dev/.data-app/, nur Protokoll)`);
z(`\n Anmelden in der App (fester Test-Code, NUR LOKAL): ${CODE}`);
z("   studio@beispiel.test   Inhaber, Ink Studio Bamberg (Zahlungen, Gutschein, 3 Auszahlungen)");
z("   team@beispiel.test     Team-Adresse von Ink Studio Bamberg");
z("   zwei@beispiel.test     Inhaber Ink Studio Hof + Team Bamberg → Studio-Auswahl");
z(`   review@beispiel.test   Demo-Studio (Review-Zugang), Code ${REVIEW_CODE}`);
z("\n Neues Studio in der App (Apple-Abo):  „Neues Studio? Konto anlegen“ mit einer neuen Adresse, z. B. neu-<zeit>@beispiel.test, Code " + CODE);
z("   StoreKit-Testkäufe aus Xcode werden NUR lokal angenommen (APPLE_XCODE_TEST=1), Stripe-Einrichtung danach über den Nachbau.");
z(`   Neue Studios im Admin:  curl -s ${BASE}/api/admin/studios -H 'authorization: Bearer admin'`);
z("\n Ausprobieren:");
z(`   Gutschein-Seite (QR):  ${gs?.link || "-"}  Code ${gs?.code || "-"}`);
z(`   Zahlung bezahlen:       Link aus der App im Simulator-Safari öffnen → Stripe-Testkasse (Nachbau)`);
z(`   Auszahlung + Push:      curl -s -X POST ${STRIPE}/mock/payout -H 'content-type: application/json' -d '{"account":"${bamberg.konto}","amount":123400,"status":"paid"}'`);
z(`   Mitteilungen:           APNs-Nachbau ${apns.url} → xcrun simctl push booted ${BUNDLE}`);
z(`   Admin-Token (lokal):    admin`);
z("────────────────────────────────────────────────────────────────────────────\n Beenden mit Ctrl+C\n");
void hof;
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { fs.rmSync(tmp, { recursive: true, force: true }); process.exit(0); });
