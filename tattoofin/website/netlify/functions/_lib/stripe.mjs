// Schlanker Stripe-Client über die REST-API (keine SDK-Abhängigkeit).
import crypto from "node:crypto";
import { SECRETS, CFG, SIMULATION } from "./config.mjs";
import { store } from "./store.mjs";
import { zweckToken } from "./auth.mjs";
import { createSim, leereDb, nest, sendeWebhook } from "./stripe-sim.mjs";

// Vorschau ohne Test-Schlüssel: Stripe-Nachbau im Prozess, Zustand im Vorschau-Speicher, Webhooks an die eigene Site.
// Das Webhook-Geheimnis wird aus dem (zufälligen) Vorschau-Sitzungsgeheimnis abgeleitet.
export const simWebhookSecret = () => "whsec_sim_" + crypto.createHash("sha256").update(SECRETS.sessionSecret + ":webhook").digest("hex").slice(0, 32);
let simInstanz;
export function simulation() {
  if (!simInstanz) simInstanz = createSim({
    load: async () => (await store.get("sim/db")) || leereDb(),
    save: (db) => store.set("sim/db", db),
    pageBase: `${CFG.siteUrl}/api/sim`,
    webhook: (type, object, account) => sendeWebhook(`${CFG.siteUrl}/api/stripe-webhook`, simWebhookSecret(), type, object, account),
  });
  return simInstanz;
}

function encode(obj, prefix, out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((item, i) => (typeof item === "object" ? encode(item, `${key}[${i}]`, out) : out.push([`${key}[${i}]`, String(item)])));
    else if (typeof v === "object") encode(v, key, out);
    else out.push([key, String(v)]);
  }
  return out;
}

// Eigenes Checkout-Branding für Sitzungen auf dem DSX-Plattformkonto (das Konto teilen sich mehrere Marken,
// das Konto-Logo ist neutral „DSX Media Solutions“). NUR für Tattoofins eigene Verkäufe (Kauf-Setup) verwenden,
// NIE für Studio-Zahlungen (Connect: on_behalf_of bzw. Stripe-Account) – dort muss der Kunde das Studio sehen.
// Absolute URLs, damit Stripe die Bilder auch bei lokalen Tests laden kann.
export const TATTOOFIN_BRANDING = {
  display_name: "Tattoofin",
  logo: { type: "url", url: "https://tattoofin.de/assets/logo.png" },
  icon: { type: "url", url: "https://tattoofin.de/apple-touch-icon.png" },
  button_color: "#1f3d5c",
  background_color: "#fbb316",
};

export async function stripe(method, path, params, { idempotencyKey, account } = {}) {
  // Parameter wie bei einem echten HTTP-Aufruf umwandeln (Texte statt Zahlen/Booleans), damit die Simulation gleich reagiert
  if (SIMULATION) return simulation().call(method, path, params ? nest(encode(params)) : {}, { idempotencyKey, account });
  if (!SECRETS.stripeKey) throw new Error("STRIPE_SECRET_KEY fehlt");
  const url = new URL(SECRETS.stripeApiBase + "/v1" + path);
  const headers = { Authorization: "Bearer " + SECRETS.stripeKey, "Stripe-Version": "2024-06-20" };
  let bodyStr;
  if (params && method === "GET") encode(params).forEach(([k, v]) => url.searchParams.append(k, v));
  else if (params) {
    bodyStr = new URLSearchParams(encode(params)).toString();
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  }
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  if (account) headers["Stripe-Account"] = account;
  const res = await fetch(url, { method, headers, body: bodyStr });
  const data = await res.json();
  if (!res.ok) {
    const e = new Error(data?.error?.message || "Stripe-Fehler " + res.status);
    e.stripe = data?.error;
    throw e;
  }
  return data;
}

// Prüft die Stripe-Signatur (Header "Stripe-Signature": t=…,v1=…)
// Plattform- und Connect-Webhooks dürfen unterschiedliche Secrets haben: beide werden geprüft.
export function verifyWebhook(payload, header) {
  const secrets = SIMULATION ? [simWebhookSecret()] : [SECRETS.stripeWebhookSecret, SECRETS.stripeConnectWebhookSecret].filter(Boolean);
  if (!secrets.length) throw new Error("STRIPE_WEBHOOK_SECRET fehlt");
  let last;
  for (const sec of secrets) { try { return verifyOne(payload, header, sec); } catch (e) { last = e; } }
  throw last;
}

function verifyOne(payload, header, secret, toleranceSec = 300) {
  const parts = Object.fromEntries((header || "").split(",").map((p) => p.split("=")).filter((p) => p.length === 2).map(([k, v]) => [k.trim(), v]));
  const sigs = (header || "").split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!parts.t || !sigs.length) throw new Error("Signatur fehlt");
  const expected = crypto.createHmac("sha256", secret).update(`${parts.t}.${payload}`).digest("hex");
  const ok = sigs.some((s) => s.length === expected.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected)));
  if (!ok) throw new Error("Signatur ungültig");
  if (Math.abs(Date.now() / 1000 - Number(parts.t)) > toleranceSec) throw new Error("Signatur abgelaufen");
  return JSON.parse(payload);
}

// Steuersatz 19 % einmal anlegen und merken. inklusive=true für Beträge, die die USt. schon enthalten (Provision).
export async function taxRateId({ inklusive: inclusive = false } = {}) {
  const key = "meta/stripe-tax-rate-" + CFG.ustProzent + (inclusive ? "-inkl" : "");
  const cached = await store.get(key);
  if (cached?.id) return cached.id;
  const tr = await stripe("POST", "/tax_rates", {
    display_name: "USt.", percentage: CFG.ustProzent, inclusive, country: "DE", jurisdiction: "DE", description: "Umsatzsteuer Deutschland",
  });
  await store.set(key, { id: tr.id });
  return tr.id;
}

export async function ensureCustomer(studio) {
  const address = { line1: studio.strasse, postal_code: studio.plz, city: studio.ort, country: "DE" };
  const params = {
    name: studio.firma, email: studio.email, phone: studio.telefon, address,
    preferred_locales: ["de"], metadata: { studioId: studio.id },
  };
  if (studio.stripe?.customerId) return stripe("POST", "/customers/" + studio.stripe.customerId, params);
  const c = await stripe("POST", "/customers", params, { idempotencyKey: "cus-" + studio.id });
  if (studio.ustid && /^[A-Z]{2}/.test(studio.ustid)) {
    try { await stripe("POST", `/customers/${c.id}/tax_ids`, { type: "eu_vat", value: studio.ustid.replace(/\s/g, "") }); } catch { /* ungültige USt-ID ignorieren */ }
  }
  return c;
}

// Stripe-Konto des Studios über Connect.
//  Kauf (Modell A):      Typ „standard“. Eigenes, vollwertiges Konto des Studios, Zahlungen laufen direkt dort (Direct Charges).
//  Provision (Modell B): Express-Verhalten über Controller-Eigenschaften (statt type=express, Stripe-Doku
//                        „migrate-to-controller-properties“): Plattform haftet für Verluste + zahlt Stripe-Gebühren,
//                        Stripe sammelt die Nachweise ein, Studio bekommt das Express-Dashboard (login_links).
//                        Tattoofin kassiert als Plattform (Destination Charges), Stripe überweist
//                        automatisch 90 % auf das Konto des Studios. Das Studio ist Händler (on_behalf_of).
//                        kontoTyp bleibt „express“ (Portal/dashboardLink prüfen darauf).
//  Idempotenz-Schlüssel „acct2-…“: Stripe speichert die Antwort zum alten Schlüssel „acct-…“ 24 h – auch den
//  Fehler „review the responsibilities of managing losses“ vom 18.10. – und lehnt geänderte Parameter ab.
// Website-Angabe der Studios ist freier Text („FB/chictattooaugsburg“, „insta: xy“, „www.xy.de“). Stripe lehnt
// alles ab, was keine echte URL ist („Not a valid URL“) – dann entsteht gar kein Konto. Darum: bekannte Kurzformen
// in echte Links umwandeln, sonst nur gültige http(s)-Adressen mit Punkt im Hostnamen, alles andere weglassen.
export function webUrl(roh) {
  let v = String(roh || "").trim().replace(/\s+/g, "");
  if (!v) return undefined;
  const sozial = v.match(/^(fb|facebook|ig|insta|instagram)(\.com)?[\/:@]+(.+)$/i);
  if (sozial) v = (/^(fb|facebook)$/i.test(sozial[1]) ? "https://www.facebook.com/" : "https://www.instagram.com/") + sozial[3].replace(/^@/, "");
  if (!/^https?:\/\//i.test(v)) v = "https://" + v;
  try {
    const u = new URL(v);
    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(u.hostname) ? u.href : undefined;
  } catch { return undefined; }
}

export async function ensureConnectedAccount(studio) {
  if (studio.stripe?.accountId) return studio.stripe.accountId;
  const express = studio.modell === "provision";
  const capabilities = express ? {
    card_payments: { requested: true }, transfers: { requested: true },
    ...(CFG.zahlarten.includes("klarna") ? { klarna_payments: { requested: true } } : {}),
  } : undefined;
  const delay = Number(CFG.auszahlungTage);
  const url = webUrl(studio.website);
  const anlegen = (mitUrl) => stripe("POST", "/accounts", {
    ...(express
      ? { controller: { losses: { payments: "application" }, fees: { payer: "application" }, stripe_dashboard: { type: "express" }, requirement_collection: "stripe" } }
      : { type: "standard" }),
    country: "DE", email: studio.email, default_currency: "eur", capabilities,
    business_profile: { name: studio.firma, mcc: express ? "7299" : undefined, product_description: "Tätowierungen und Tattoo-Projekte", url: mitUrl ? url : undefined },
    settings: express && delay > 0 ? { payouts: { schedule: { interval: "daily", delay_days: delay } } } : undefined,
    metadata: { studioId: studio.id, modell: studio.modell },
  }, { idempotencyKey: (mitUrl ? "acct3-" : "acct3o-") + studio.id });
  // Lehnt Stripe die Website trotzdem ab, Konto ohne Website anlegen – die Angabe ist freiwillig.
  let acct;
  try { acct = await anlegen(!!url); }
  catch (e) { if (url && /url/i.test(String(e?.message || e))) acct = await anlegen(false); else throw e; }
  studio.stripe = { ...(studio.stripe || {}), accountId: acct.id, kontoTyp: express ? "express" : "standard" };
  return acct.id;
}

// Login in das Express-Dashboard (Auszahlungen, Bankkonto, Belege) für Provisions-Studios
export async function dashboardLink(studio) {
  if (studio.stripe?.kontoTyp !== "express") return "https://dashboard.stripe.com/";
  return (await stripe("POST", `/accounts/${studio.stripe.accountId}/login_links`, {})).url;
}

// Eingebettete Stripe-Bausteine (Connect Embedded Components) für das Studio-Dashboard.
// Erlaubt sind sie für Express (Paket Start/Studio) UND Standard (Profi/Geschenk). Unterschiede:
//  - Express: Erstattungen/Rückbuchungen laufen über Tattoofin (Provision wird verrechnet) → in „payments“ ausgeschaltet.
//  - Standard: Das Studio ist selbst Händler mit eigenem Konto → Erstattungen und Streitfälle direkt im Baustein.
//  - Bei beiden sammelt Stripe die Pflichtangaben (requirement_collection = stripe). Für Bankdaten/Konto-Änderungen
//    verlangt Stripe dann eine kurze Stripe-Anmeldung im Pop-up (Stripe-Benutzerauthentifizierung, nicht abschaltbar).
export function bausteine(studio) {
  const express = studio.stripe?.kontoTyp === "express";
  const ext = { external_account_collection: true };
  return {
    account_onboarding: { enabled: true, features: ext },
    notification_banner: { enabled: true, features: ext },
    account_management: { enabled: true, features: ext },
    payouts: { enabled: true, features: { ...ext, instant_payouts: false, standard_payouts: true, edit_payout_schedule: !express } },
    payments: { enabled: true, features: express
      ? { refund_management: false, dispute_management: false, capture_payments: false, destination_on_behalf_of_charge_management: true }
      : { refund_management: true, dispute_management: true, capture_payments: true } },
  };
}

// Stufe 1: alle Bausteine. Lehnt Stripe das für das Konto ab (z. B. nicht jeder Baustein ist für Standard-Konten mit eigenem
// Dashboard erlaubt), Stufe 2: nur Einrichtung + Hinweise – die Einrichtung selbst darf nie daran scheitern.
export async function accountSession(studio) {
  try { return await stripe("POST", "/account_sessions", { account: studio.stripe.accountId, components: bausteine(studio) }); }
  catch (e) {
    console.error("[account_session] alle Bausteine abgelehnt, nur Einrichtung:", e.message);
    const b = bausteine(studio);
    return stripe("POST", "/account_sessions", { account: studio.stripe.accountId, components: { account_onboarding: b.account_onboarding, notification_banner: b.notification_banner } });
  }
}

export async function onboardingLink(studio, base) {
  const link = await stripe("POST", "/account_links", {
    account: studio.stripe.accountId, type: "account_onboarding",
    refresh_url: `${base}/api/connect?id=${studio.id}&neu=1&t=${zweckToken(studio.id, "connect", 24)}`,
    return_url: `${base}/api/connect/zurueck?id=${studio.id}&t=${zweckToken(studio.id, "connect", 24)}`,
  });
  return link.url;
}
