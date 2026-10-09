// Schlanker Stripe-Client über die REST-API (keine SDK-Abhängigkeit).
import crypto from "node:crypto";
import { SECRETS, CFG } from "./config.mjs";
import { store } from "./store.mjs";

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

export async function stripe(method, path, params, { idempotencyKey, account } = {}) {
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
  const secrets = [SECRETS.stripeWebhookSecret, SECRETS.stripeConnectWebhookSecret].filter(Boolean);
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

// Steuersatz 19 % (exklusiv) einmal anlegen und merken
export async function taxRateId() {
  const key = "meta/stripe-tax-rate-" + CFG.ustProzent;
  const cached = await store.get(key);
  if (cached?.id) return cached.id;
  const tr = await stripe("POST", "/tax_rates", {
    display_name: "USt.", percentage: CFG.ustProzent, inclusive: false, country: "DE", jurisdiction: "DE", description: "Umsatzsteuer Deutschland",
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

// Eigenes Stripe-Konto des Studios (Connect, Typ „standard“: das Konto gehört dem Studio)
export async function ensureConnectedAccount(studio) {
  if (studio.stripe?.accountId) return studio.stripe.accountId;
  const acct = await stripe("POST", "/accounts", {
    type: "standard", country: "DE", email: studio.email, default_currency: "eur",
    business_profile: { name: studio.firma, product_description: "Tätowierungen und Tattoo-Projekte", url: studio.website || undefined },
    metadata: { studioId: studio.id },
  }, { idempotencyKey: "acct-" + studio.id });
  studio.stripe = { ...(studio.stripe || {}), accountId: acct.id };
  return acct.id;
}

export async function onboardingLink(studio, base) {
  const link = await stripe("POST", "/account_links", {
    account: studio.stripe.accountId, type: "account_onboarding",
    refresh_url: `${base}/api/connect?id=${studio.id}&neu=1`,
    return_url: `${base}/api/connect/zurueck?id=${studio.id}`,
  });
  return link.url;
}
