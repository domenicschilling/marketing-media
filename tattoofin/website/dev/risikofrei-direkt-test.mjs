// Test „Risikofrei direkt“ je Studio (Domenic 27.11.2026, Chic Tattoo Augsburg): studio.risikofreiDirect=true wirkt nur für dieses Studio wie
// RISIKOFREI_DIRECT=1 → Direct Charge auf dem Stripe-Konto des Studios (Stripe-Account-Header), Klarna bleibt nach dem Stichtag,
// Plattformgebühr 0 € bis provisionFreiBis (31.12.2026), danach 10 %. Ein anderes Risikofrei-Studio ohne Schalter bleibt unverändert
// (Destination Charge über das Plattformkonto, ohne Klarna). Läuft gegen den lokalen Stripe-Nachbau, nichts bei Stripe.
//   E2E_PORT=8996 STRIPE_MOCK_PORT=12996 node dev/risikofrei-direkt-test.mjs
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { startDev } from "./server.mjs";

const PORT = Number(process.env.E2E_PORT || 8996), BASE = `http://localhost:${PORT}`, MOCK_PORT = Number(process.env.STRIPE_MOCK_PORT || 12996), STRIPE = `http://localhost:${MOCK_PORT}`;
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "tf-rf-direkt-"));
delete process.env.RISIKOFREI_DIRECT;
delete process.env.KLARNA_PLATTFORM_BIS;
process.env.TF_BEZAHLFELD = "aus"; // Kunden zahlen im Stripe-Checkout (Bezahlfeld wird unten extra geprüft)
process.env.TF_JETZT = "2026-11-27T12:00:00+01:00"; // nach dem Klarna-Stichtag 20.11.2026
await startDev({ port: PORT, mock: true, dataDir, quiet: true, mockPort: MOCK_PORT });
const { saveStudio, getStudio, getZahlung, store } = await import("../netlify/functions/_lib/store.mjs");
const { sessionCookie } = await import("../netlify/functions/_lib/auth.mjs");
const config = await import("../netlify/functions/_lib/config.mjs");
const domain = await import("../netlify/functions/_lib/domain.mjs");

let ok = 0, fail = 0;
const check = (c, name, info) => { if (c) { ok++; console.log("  ✓", name); } else { fail++; console.log("  ✗", name, info !== undefined ? "→ " + JSON.stringify(info).slice(0, 400) : ""); } };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const json = (url, opts = {}, cookie) => fetch(BASE + url, { ...opts, headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}), ...(opts.headers || {}) } })
  .then(async (r) => { let d = {}; try { d = await r.json(); } catch { /* leer */ } return { status: r.status, data: d }; });
const post = (url, body, cookie) => json(url, { method: "POST", body: JSON.stringify(body || {}) }, cookie);
const adminPatch = (id, body) => json(`/api/admin/studio/${id}`, { method: "PATCH", body: JSON.stringify(body), headers: { Authorization: "Bearer admin" } });
const mockState = () => fetch(`${STRIPE}/mock/state`).then((r) => r.json());
const lastSession = async () => Object.values((await mockState()).sessions).at(-1);
const stripeBezahlen = async (url, pm) => { await fetch(STRIPE + new URL(url).pathname, { method: "POST", redirect: "manual", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ pm }) }); await wait(300); };
const konto = async () => (await fetch(`${STRIPE}/v1/accounts`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ type: "express", country: "DE" }) }).then((r) => r.json())).id;
const logs = async (type) => (await store.all("log/")).filter((x) => x.type === type);

const studio = async (id, firma, extra = {}) => {
  const s = { id, firma, slug: id.replace(/_/g, "-"), email: `${id}@example.com`, inhaber: "Test", strasse: "Ulmer Straße 14", plz: "86154", ort: "Augsburg",
    modell: "provision", paket: "risikofrei", zahlart: "provision", status: "live", createdAt: new Date().toISOString(),
    stripe: { accountId: await konto(), chargesEnabled: true, payoutsEnabled: true, detailsSubmitted: true, kontoTyp: "express" }, ...extra };
  await saveStudio(s);
  return { s, cookie: sessionCookie(s).split(";")[0] };
};
const CHIC = await studio("st_chic_direkt", "Chic Tattoo Augsburg");
const ANDERS = await studio("st_rf_ohne", "Anderes Risikofrei Studio");
const link = async (st, betrag, kunde) => (await post("/api/portal/zahlung", { betrag, kunde, email: `${kunde.toLowerCase().replace(/\W/g, "")}@kunde.test`, beschreibung: "Rechtstest" }, st.cookie)).data;
const starte = async (zid) => { const r = await post("/api/pay", { z: zid, inhaltOk: true }); if (r.status !== 200) console.log("    /api/pay", r.status, JSON.stringify(r.data).slice(0, 300)); const cs = await lastSession(); return { r, cs, pmt: [].concat(cs?.payment_method_types || []), pid: cs?.payment_intent_data || {} }; };
const info = async (zid) => (await json(`/api/pay?z=${zid}`)).data;

console.log("Vorher (beide ohne Schalter, nach dem Stichtag)");
const alt = await link(CHIC, "500", "Alt Link");
const iAlt = await info(alt.zahlung.id);
const sAlt = await starte(alt.zahlung.id);
check(JSON.stringify(iAlt.zahlung.zahlarten) === '["card"]' && iAlt.studio.klarna === false, "Chic ohne Schalter: kein Klarna", iAlt.zahlung.zahlarten);
check(!sAlt.cs.account && sAlt.pid.transfer_data?.destination === CHIC.s.stripe.accountId, "Chic ohne Schalter: Destination Charge über das Plattformkonto", { account: sAlt.cs.account, pid: sAlt.pid });

console.log("Admin: Schalter setzen (mit Prüfung und Protokoll)");
check((await adminPatch(CHIC.s.id, { risikofreiDirect: "ja" })).status === 400, "risikofreiDirect nur als true/false");
await saveStudio({ id: "st_kauf_x", firma: "Kauf X", email: "kx@example.com", modell: "kauf", paket: "monatlich", status: "live", stripe: { accountId: "acct_x" } });
check((await adminPatch("st_kauf_x", { risikofreiDirect: true })).status === 400, "nicht für Pakete mit eigenem Konto (nur Risikofrei)");
const pa = await adminPatch(CHIC.s.id, { risikofreiDirect: true, provisionFreiBis: "2026-12-31" });
check(pa.status === 200 && pa.data.risikofreiDirect === true && pa.data.provisionFreiBis === "2026-12-31", "Chic: risikofreiDirect=true und provisionFreiBis=2026-12-31 gesetzt", pa.data);
const lD = await logs("admin-studio-risikofreiDirect"), lF = await logs("admin-studio-provisionFreiBis");
check(lD.length === 1 && lD[0].studioId === CHIC.s.id && lD[0].vorher === false && lD[0].nachher === true, "Protokoll-Eintrag „admin-studio-risikofreiDirect“ (vorher/nachher)", lD);
check(lF.length === 1 && lF[0].nachher === "2026-12-31", "Protokoll-Eintrag „admin-studio-provisionFreiBis“", lF);
await adminPatch(CHIC.s.id, { notiz: "nur Notiz" });
check((await logs("admin-studio-risikofreiDirect")).length === 1, "kein neuer Protokoll-Eintrag ohne Änderung");
const chic = await getStudio(CHIC.s.id), anders = await getStudio(ANDERS.s.id);

console.log("Logik (nur dieses Studio)");
check(config.risikofreiDirect(chic) && !config.risikofreiDirect(anders) && !config.risikofreiDirect() && !config.risikofreiDirectGlobal(), "risikofreiDirect: nur Chic, global aus");
check(config.klarnaPlattformAus(config.jetzt(), chic) === false && config.klarnaPlattformAus(config.jetzt(), anders) === true && config.klarnaPlattformAus() === true, "klarnaPlattformAus: Chic false, anderes Studio und ohne Studio true");
check(domain.direktCharge(chic) && !domain.plattformKassiert(chic) && domain.plattformKassiert(anders) && !domain.direktCharge(anders), "direktCharge/plattformKassiert je Studio");
check(domain.klarnaFuer(chic) && domain.klarnaDauerhaft(chic) && !domain.klarnaFuer(anders) && !domain.klarnaDauerhaft(anders), "klarnaFuer/klarnaDauerhaft: Chic ja, anderes Studio nein");
const cfg = (await json("/api/config")).data;
check(cfg.klarnaPlattformAus === true && cfg.klarnaPlattformBis === "2026-11-19T23:00:00.000Z", "Öffentliche Konfiguration unverändert (globaler Stichtag gilt weiter)", cfg.klarnaPlattformBis);

console.log("Chic mit Schalter: Klarna + Direct Charge, 0 € Gebühr bis 31.12.");
const d1 = await link(CHIC, "1000", "Kim Klarna");
const i1 = await info(d1.zahlung.id);
const s1 = await starte(d1.zahlung.id);
check(i1.zahlung.zahlarten.includes("klarna") && i1.studio.klarna === true, "Zahlseite bietet Klarna an", i1.zahlung.zahlarten);
check(s1.pmt.includes("klarna") && s1.pmt[0] === "card", "Checkout mit Karte und Klarna (Karte zuerst)", s1.pmt);
check(s1.cs.account === chic.stripe.accountId && !s1.pid.transfer_data && !s1.pid.on_behalf_of && !s1.pid.transfer_group, "Direct Charge: Sitzung mit Stripe-Account-Header auf dem Konto von Chic, ohne transfer_data/on_behalf_of", { account: s1.cs.account, pid: s1.pid });
check(s1.pid.application_fee_amount === 3025, "bis 31.12.2026: keine Provision, aber Stripe-Gebühr trägt Chic (Klarna-Satz 2,99 % + 0,35 € = 30,25 €)", s1.pid.application_fee_amount);
check(/1\.000/.test(d1.whatsappText) && /Klarna/.test(d1.whatsappText), "WhatsApp-Text nennt Klarna wieder", d1.whatsappText.slice(0, 120));
await stripeBezahlen(s1.r.data.url, "klarna");
let z1 = null; for (let i = 0; i < 30 && z1?.status !== "bezahlt"; i++) { await wait(150); z1 = await getZahlung(chic.id, d1.zahlung.id); }
check(z1?.status === "bezahlt" && z1.abwicklung === "direkt" && z1.zahlart === "klarna" && !z1.transferId && z1.gebuehrBruttoCent === 0 && z1.stripeGebuehrDurchCent === 3025, "bezahlt mit Klarna: Abwicklung „direkt“, kein Transfer, keine Provision, Stripe-Gebühr 30,25 € von Chic", { st: z1?.status, ab: z1?.abwicklung, za: z1?.zahlart, fee: z1?.gebuehrBruttoCent });
check(domain.stripeLuecken(z1).length === 0, "keine offenen Stripe-Lücken (keine Gebühr zum Nachtragen)", domain.stripeLuecken(z1));
const portal = (await json("/api/portal", {}, CHIC.cookie)).data;
check(portal.studio.klarna === true && portal.studio.klarnaDauerhaft === true && /Klarna/.test(portal.ratenText), "App/Dashboard: Klarna an, Raten-Text mit Klarna", { k: portal.studio.klarna, d: portal.studio.klarnaDauerhaft });
const v1 = await link(CHIC, "700", "Vera Vorschau");
const vorschau = await (await fetch(`${BASE}/z/${v1.zahlung.id}`, { headers: { "user-agent": "WhatsApp/2.24.21.80 A" } })).text();
check(/Klarna/.test(vorschau), "Link-Vorschau nennt Klarna");

console.log("Offener Link von vorher (Plattformkonto) wird beim nächsten Öffnen umgezogen");
const csAltId = sAlt.cs.id;
const sAlt2 = await starte(alt.zahlung.id);
const zAlt = await getZahlung(chic.id, alt.zahlung.id);
check((await mockState()).sessions[csAltId]?.status === "expired", "alte Sitzung auf dem Plattformkonto beendet");
check(sAlt2.cs.account === chic.stripe.accountId && sAlt2.pmt.includes("klarna") && zAlt.abwicklung === "direkt", "neue Sitzung als Direct Charge mit Klarna", { account: sAlt2.cs.account, pmt: sAlt2.pmt, ab: zAlt.abwicklung });
check((await logs("abwicklung-wechsel")).some((x) => x.zahlungId === alt.zahlung.id && x.alt === "plattform" && x.neu === "direkt"), "Protokoll „abwicklung-wechsel“");

console.log("Eingebettetes Bezahlfeld (PaymentIntent) bei Chic");
process.env.TF_BEZAHLFELD = "an";
const b1 = await link(CHIC, "400", "Bea Bezahlfeld");
const rb = await post("/api/pay", { z: b1.zahlung.id, inhaltOk: true });
const piB = (await mockState()).paymentIntents[String(rb.data.clientSecret || "").split("_secret_")[0]];
check(rb.status === 200 && rb.data.stripeAccount === chic.stripe.accountId && rb.data.zahlarten.includes("klarna"), "Bezahlfeld mit stripeAccount von Chic und Klarna", { http: rb.status, acc: rb.data.stripeAccount, za: rb.data.zahlarten });
check(piB && piB.account === chic.stripe.accountId && !piB.transfer_data && !piB.on_behalf_of && piB.application_fee_amount === 1231, "PaymentIntent auf dem Konto von Chic, ohne Transfer, nur Stripe-Gebühr (400 € → 12,31 €)", piB && { account: piB.account, fee: piB.application_fee_amount });
process.env.TF_BEZAHLFELD = "aus";

console.log("Erstattung bei Direct Charge");
const vorR = (await mockState()).refunds.length;
const er = await post(`/api/portal/erstattung/${d1.zahlung.id}`, { betrag: "200" }, CHIC.cookie);
await wait(500);
const refs = (await mockState()).refunds;
check(er.status === 200 && refs.length === vorR + 1 && refs.at(-1).reverse_transfer === false && refs.at(-1).amount === 20000, "Erstattung auf dem Studio-Konto, ohne reverse_transfer", { http: er.status, ref: refs.at(-1) });

console.log("Anderes Risikofrei-Studio ohne Schalter (zur selben Zeit)");
const o1 = await link(ANDERS, "800", "Olli Ohne");
const io = await info(o1.zahlung.id);
const so = await starte(o1.zahlung.id);
check(JSON.stringify(io.zahlung.zahlarten) === '["card"]' && io.studio.klarna === false && !/Klarna/.test(o1.whatsappText), "kein Klarna (Zahlseite, WhatsApp-Text)", io.zahlung.zahlarten);
check(!so.cs.account && so.pid.transfer_data?.destination === anders.stripe.accountId && so.pid.on_behalf_of === anders.stripe.accountId && so.pid.application_fee_amount === 8000 && JSON.stringify(so.pmt) === '["card"]', "Destination Charge über das Plattformkonto, 10 % = 80 €, nur Karte", { account: so.cs.account, pid: so.pid, pmt: so.pmt });

console.log("Ab 01.01.2027: Chic wieder 10 % (weiter direkt, weiter Klarna)");
process.env.TF_JETZT = "2027-01-01T00:00:01+01:00";
const d2 = await link(CHIC, "1000", "Jan Januar");
const s2 = await starte(d2.zahlung.id);
check(s2.cs.account === chic.stripe.accountId && s2.pid.application_fee_amount === 10000 && s2.pmt.includes("klarna"), "Direct Charge mit Plattformgebühr 100 € (10 %) und Klarna", { account: s2.cs.account, fee: s2.pid.application_fee_amount, pmt: s2.pmt });
await stripeBezahlen(s2.r.data.url, "card");
let z2 = null; for (let i = 0; i < 30 && z2?.status !== "bezahlt"; i++) { await wait(150); z2 = await getZahlung(chic.id, d2.zahlung.id); }
check(z2?.status === "bezahlt" && z2.abwicklung === "direkt" && z2.gebuehrBruttoCent === 10000, "bezahlt: Abwicklung direkt, Gebühr 100 € gemerkt", { st: z2?.status, fee: z2?.gebuehrBruttoCent });
process.env.TF_JETZT = "2026-12-31T23:59:00+01:00";
check(config.provisionSatz(chic) === 0, "31.12.2026 23:59: noch 0 %");
process.env.TF_JETZT = "2026-11-27T12:00:00+01:00";

console.log("Schalter wieder aus");
const aus = await adminPatch(CHIC.s.id, { risikofreiDirect: false });
check(aus.status === 200 && aus.data.risikofreiDirect === undefined, "risikofreiDirect=false entfernt das Feld");
const d3 = await link(CHIC, "300", "Wieder Plattform");
const s3 = await starte(d3.zahlung.id);
check(!s3.cs.account && JSON.stringify(s3.pmt) === '["card"]', "danach wieder Plattformkonto ohne Klarna", { account: s3.cs.account, pmt: s3.pmt });
check((await logs("admin-studio-risikofreiDirect")).length === 2, "zweiter Protokoll-Eintrag (aus)");

console.log(`\n${ok} ok, ${fail} Fehler`);
process.exit(fail ? 1 : 0);
