// Stripe-Nachbau (Simulation) für lokale Tests UND die Vorschau-Site ohne Stripe-Testschlüssel.
// Bildet nur die Endpunkte nach, die Tattoofin nutzt. Es fließt nie echtes Geld.
//   lokal (dev/stripe-mock.mjs):  Speicher im Arbeitsspeicher, Webhooks per HTTP an den Dev-Server
//   Vorschau (Netlify):           Speicher in Netlify Blobs (Store „tattoofin-vorschau“), Webhooks an die eigene Site
// Seiten (Bezahlseite, Onboarding, Express-Dashboard) liegen unter pageBase (lokal :12111, Vorschau /api/sim).
import crypto from "node:crypto";

export const leereDb = () => ({ subscriptions: {}, customers: {}, sessions: {}, invoices: {}, items: [], setupIntents: {}, refunds: [], taxRates: {}, accounts: {}, paymentIntents: {}, feeRefunds: [], transfers: [], reversals: [], accountSessions: [], idem: {}, invoiceNr: 1000 });

// Stripe-Gebühren im Nachbau: Karte EWR 1,5 % + 0,25 €, Klarna 2,99 % + 0,35 €
const gebuehr = (betrag, pm) => (pm === "klarna" ? Math.round(betrag * 0.0299) + 35 : Math.round(betrag * 0.015) + 25);
const rid = (p) => p + "_" + crypto.randomBytes(6).toString("hex");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const seite = (titel, inhalt) => `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><meta name=robots content=noindex><title>${titel}</title>
<body style="font:16px system-ui;max-width:440px;margin:40px auto;padding:0 16px;color:#1f3d5c">
<p style="background:#1f3d5c;color:#fbb316;border-radius:10px;padding:8px 12px;font-weight:700">Simulation – keine echte Zahlung, kein echtes Konto</p>${inhalt}</body>`;

export class SimFehler extends Error { constructor(status, message) { super(message); this.status = status; this.stripe = { message }; } }

// Formular-Parameter (a[b][0][c]=…) in ein Objekt umwandeln
export function nest(params) {
  const out = {};
  for (const [k, v] of params) {
    const parts = k.replace(/\]/g, "").split("[");
    let o = out;
    parts.forEach((p, i) => {
      if (i === parts.length - 1) o[p] = v;
      else o = o[p] = o[p] || (/^\d+$/.test(parts[i + 1]) ? [] : {});
    });
  }
  return out;
}

export function createSim({ load, save, pageBase, webhook }) {
  // Jede Operation: laden → ändern → speichern → Webhooks der Reihe nach senden (erst nach dem Speichern,
  // weil der Webhook-Empfänger wieder auf die Simulation zugreift)
  async function tx(fn) {
    const db = await load();
    const queue = [];
    const emit = (type, object, account) => queue.push([type, JSON.parse(JSON.stringify(object)), account]);
    const out = await fn(db, emit);
    await save(db);
    if (!db.sim_webhooks_aus) for (const [type, object, account] of queue) await webhook(type, object, account);
    return out;
  }

  function charge(db, { amount, pm, fee, ziel }) {
    return {
      id: rid("ch"), payment_method_details: { type: pm }, application_fee: fee ? rid("fee") : null, amount,
      transfer: ziel ? rid("tr") : null, balance_transaction: { id: rid("txn"), fee: gebuehr(amount, pm) },
    };
  }

  // ---------- REST-API (/v1/…) ----------
  async function call(method, path, p = {}, { account, idempotencyKey } = {}) {
    return tx(async (db, emit) => {
      if (idempotencyKey && db.idem[idempotencyKey]) return db.idem[idempotencyKey];
      const done = (obj) => { if (idempotencyKey) db.idem[idempotencyKey] = obj; return obj; };
      const [, res1, id1, act] = path.split("/");

      if (res1 === "accounts") {
        if (method === "POST" && !id1) { const a = { id: rid("acct"), object: "account", ...p, charges_enabled: false, payouts_enabled: false, details_submitted: false }; db.accounts[a.id] = a; return done(a); }
        if (method === "POST" && act === "login_links") return done({ object: "login_link", url: `${pageBase}/express/${id1}` });
        if (!db.accounts[id1]) throw new SimFehler(404, "Konto nicht gefunden");
        if (method === "POST" && !act && p.settings) {
          const a = db.accounts[id1];
          a.settings = a.settings || {};
          for (const [k, v] of Object.entries(p.settings)) a.settings[k] = { ...(a.settings[k] || {}), ...v };
          return done(a);
        }
        return db.accounts[id1];
      }
      if (res1 === "account_links") return done({ object: "account_link", url: `${pageBase}/onboard/${p.account}?return=${encodeURIComponent(p.return_url)}` });
      if (res1 === "account_sessions") {
        if (!db.accounts[p.account]) throw new SimFehler(404, "Konto nicht gefunden");
        // Test-Schalter /mock/session-fehler/<acct>?stufe=voll|alle: Stripe lehnt Bausteine ab (voll = nur die volle Liste, alle = auch die kleine)
        const sf = db.accounts[p.account].sim_session_fehler;
        if (sf && (sf === "alle" || Object.keys(p.components || {}).some((k) => !["account_onboarding", "notification_banner"].includes(k)))) throw new SimFehler(400, "Simulation: Baustein für dieses Konto nicht erlaubt");
        const as = { object: "account_session", account: p.account, client_secret: rid("simas") + "_secret", components: p.components || {}, expires_at: Math.floor(Date.now() / 1000) + 1800, livemode: false };
        db.accountSessions.push({ account: p.account, components: p.components || {} });
        return as;
      }
      if (res1 === "payment_intents") {
        if (method === "POST" && !id1) {
          const ziel0 = account || p.on_behalf_of || p.transfer_data?.destination;
          if (ziel0 && db.accounts[ziel0]?.sim_ohne_klarna && [].concat(p.payment_method_types || []).includes("klarna")) throw new SimFehler(400, "The payment method type provided: klarna is invalid. Please ensure the provided type is activated in your dashboard.");
          const pi = {
            id: rid("pi"), object: "payment_intent", amount: Number(p.amount), currency: p.currency || "eur", status: "requires_payment_method",
            payment_method_types: p.payment_method_types || ["card"], description: p.description, metadata: p.metadata || {}, receipt_email: p.receipt_email,
            application_fee_amount: p.application_fee_amount ? Number(p.application_fee_amount) : null, on_behalf_of: p.on_behalf_of || null,
            transfer_data: p.transfer_data || null, transfer_group: p.transfer_group || null, account: account || null, refunded: 0,
          };
          pi.client_secret = pi.id + "_secret_" + crypto.randomBytes(6).toString("hex");
          db.paymentIntents[pi.id] = pi;
          return done(pi);
        }
        const pi = db.paymentIntents[id1];
        if (!pi) throw new SimFehler(404, "PaymentIntent fehlt");
        if (method === "POST" && act === "cancel") { pi.status = "canceled"; return pi; }
        if (method === "POST") { Object.assign(pi, p, p.amount ? { amount: Number(p.amount) } : {}); return pi; }
        return pi;
      }
      if (res1 === "transfers" && act === "reversals") { const r = { id: rid("trr"), transfer: id1, amount: Number(p.amount), metadata: p.metadata || {} }; db.reversals.push(r); return done(r); }
      if (res1 === "transfers" && !id1) { const t = { id: rid("tr"), ...p, amount: Number(p.amount) }; db.transfers.push(t); return done(t); }
      if (res1 === "application_fees" && act === "refunds") { const r = { id: rid("fr"), fee: id1, amount: Number(p.amount) }; db.feeRefunds.push(r); return done(r); }
      if (res1 === "customers") {
        if (method === "POST" && !id1) { const c = { id: rid("cus"), object: "customer", ...p }; db.customers[c.id] = c; return done(c); }
        if (method === "POST" && act === "tax_ids") return done({ id: rid("txi"), ...p });
        if (method === "POST") { Object.assign(db.customers[id1], p); return done(db.customers[id1]); }
        return db.customers[id1];
      }
      if (res1 === "tax_rates") { const t = { id: rid("txr"), ...p }; db.taxRates[t.id] = t; return done(t); }
      if (res1 === "checkout" && id1 === "sessions") {
        const csId = act;
        if (csId) {
          const s = db.sessions[csId];
          if (!s) throw new SimFehler(404, "Sitzung fehlt");
          if (path.endsWith("/expire")) { s.status = "expired"; emit("checkout.session.expired", s, s.account || undefined); }
          return s;
        }
        // Wie bei Stripe: Zahlart, die das Konto (noch) nicht aktiviert hat, lehnt die ganze Sitzung ab (Test-Schalter: /mock/ohne-klarna/<acct>)
        const ziel0 = account || p.payment_intent_data?.on_behalf_of || p.payment_intent_data?.transfer_data?.destination;
        if (ziel0 && db.accounts[ziel0]?.sim_ohne_klarna && [].concat(p.payment_method_types || []).includes("klarna")) throw new SimFehler(400, "The payment method type provided: klarna is invalid. Please ensure the provided type is activated in your dashboard (https://dashboard.stripe.com/account/payments/settings) and your account is enabled for any preview features that you are trying to use.");
        const s = { id: rid("cs"), object: "checkout.session", ...p, status: "open", account: account || null };
        s.url = `${pageBase}/pay/${s.id}`;
        if (s.mode === "payment" || s.mode === "subscription") {
          const li = p.line_items[0];
          const net = Number(li.price_data.unit_amount);
          s.amount_total = li.tax_rates ? Math.round(net * 1.19) : net;
          if (s.payment_intent_data?.application_fee_amount) s.payment_intent_data.application_fee_amount = Number(s.payment_intent_data.application_fee_amount);
        }
        db.sessions[s.id] = s;
        return done(s);
      }
      // Paket Monatlich: Abo lesen bzw. Kündigung zum Periodenende setzen/zurücknehmen
      if (res1 === "subscriptions") {
        const sub = (db.subscriptions || {})[id1];
        if (!sub) throw new SimFehler(404, "Abo fehlt");
        if (method === "POST" && p.cancel_at_period_end !== undefined) sub.cancel_at_period_end = String(p.cancel_at_period_end) === "true";
        return sub;
      }
      if (res1 === "setup_intents") return db.setupIntents[id1];
      if (res1 === "invoiceitems") { const it = { id: rid("ii"), ...p, amount: Number(p.amount) }; db.items.push(it); return done(it); }
      if (res1 === "invoices") {
        if (method === "GET") return db.invoices[id1];
        if (!id1) {
          const items = db.items.filter((i) => i.customer === p.customer && !i.invoice);
          const net = items.reduce((s, i) => s + i.amount, 0);
          const inv = { id: rid("in"), object: "invoice", status: "draft", ...p, lines: items, amount_due: Math.round(net * 1.19), metadata: p.metadata || {} };
          items.forEach((i) => (i.invoice = inv.id));
          db.invoices[inv.id] = inv;
          return done(inv);
        }
        const inv = db.invoices[id1];
        if (act === "finalize") {
          inv.status = "open"; inv.number = "TEST-" + db.invoiceNr++; inv.hosted_invoice_url = `${pageBase}/invoice`;
          inv.due_date = Math.floor(Date.now() / 1000) + 14 * 86400;
          return done(inv);
        }
        if (act === "send") return done(inv);
        if (act === "pay") { inv.status = "paid"; inv.paid_out_of_band = p.paid_out_of_band === "true" || p.paid_out_of_band === true; return done(inv); }
      }
      if (res1 === "refunds" && db.paymentIntents[p.payment_intent]) {
        const pi = db.paymentIntents[p.payment_intent];
        const amount = Number(p.amount || pi.amount - pi.refunded);
        if (pi.refunded + amount > pi.amount) throw new SimFehler(400, "Betrag zu hoch");
        pi.refunded += amount;
        const r = { id: rid("re"), payment_intent: pi.id, amount, reverse_transfer: String(p.reverse_transfer) === "true", refund_application_fee: String(p.refund_application_fee) === "true", status: "succeeded" };
        db.refunds.push(r);
        emit("charge.refunded", { id: pi.latest_charge.id, object: "charge", payment_intent: pi.id, amount: pi.amount, amount_refunded: pi.refunded, application_fee: pi.latest_charge.application_fee }, pi.account || undefined);
        return done(r);
      }
      if (res1 === "refunds") { const r = { id: rid("re"), payment_intent: p.payment_intent, amount: Number(p.amount || 0), status: "succeeded" }; db.refunds.push(r); return done(r); }
      if (res1 === "billing_portal") return done({ id: rid("bps"), url: `${pageBase}/invoice` });
      throw new SimFehler(404, "Simulation: " + path + " nicht nachgebildet");
    });
  }

  // Zahlung abschließen (Checkout-Testkasse oder eingebettetes Bezahlfeld)
  function bezahle(db, emit, pi, pm) {
    const ziel = pi.transfer_data?.destination;
    pi.status = "succeeded";
    pi.payment_method_types = [pm];
    pi.latest_charge = charge(db, { amount: pi.amount, pm, fee: pi.application_fee_amount, ziel });
  }

  // ---------- Seiten / Aktionen ----------
  // parts: Pfad-Teile nach pageBase, form: Formular-/JSON-Daten, query: URLSearchParams
  // Rückgabe: { html } | { json } | { redirect } | { status, text }
  async function page(method, parts, form = {}, query = new URLSearchParams()) {
    const [art, id] = parts;
    if (art === "pay") {
      return tx(async (db, emit) => {
        const s = db.sessions[id];
        if (!s) return { status: 404, text: "unbekannt" };
        if (method === "GET") return { html: seite("Stripe (Test)", `
          <h2>Stripe Testkasse</h2><p>Modus: <b>${s.mode}</b>${s.amount_total ? " · Betrag: " + (s.amount_total / 100).toFixed(2) + " €" : ""}</p>
          <form method=post><input type=hidden name=pm value=card><button id=pay style="padding:12px 20px;font-size:16px">${s.mode === "setup" ? "Zahlungsmethode speichern" : "Mit Karte bezahlen"}</button></form>
          ${(s.account || s.payment_intent_data?.transfer_data) && [].concat(s.payment_method_types || ["card", "klarna"]).includes("klarna") ? '<form method=post><input type=hidden name=pm value=klarna><button id=pay-klarna style="padding:12px 20px;font-size:16px;margin-top:8px">Mit Klarna (Raten) bezahlen</button></form><form method=post><input type=hidden name=pm value=klarna-abgelehnt><button id=pay-klarna-abgelehnt style="padding:8px 14px;margin-top:8px">Klarna lehnt ab (Test)</button></form>' : ""}
          ${s.last_error ? `<p id=fehler style="color:#a00">${esc(s.last_error)}</p>` : ""}
          <p><a id=cancel href="${esc(s.cancel_url)}">Abbrechen</a></p>`) };
        // Klarna lehnt ab (wie live: Checkout bleibt offen, der PaymentIntent trägt den Fehler)
        if (form.pm === "klarna-abgelehnt") {
          const pi = { id: rid("pi"), object: "payment_intent", amount: s.amount_total, status: "requires_payment_method", payment_method_types: ["klarna"], metadata: s.payment_intent_data?.metadata || {}, account: s.account, refunded: 0,
            last_payment_error: { code: "payment_method_provider_decline", message: "The customer's payment was declined by Klarna (Simulation).", payment_method: { type: "klarna" } } };
          db.paymentIntents[pi.id] = pi; s.payment_intent = pi.id; s.last_error = "Klarna hat die Zahlung abgelehnt. Bitte wähle eine andere Zahlungsart.";
          return { redirect: `${pageBase}/pay/${s.id}` };
        }
        s.status = "complete";
        const ziel = s.payment_intent_data?.transfer_data?.destination;
        if (s.mode === "payment" && (s.account || ziel)) {
          const pmType = form.pm || "card";
          const pi = { id: rid("pi"), object: "payment_intent", amount: s.amount_total, metadata: s.payment_intent_data?.metadata || {}, application_fee_amount: s.payment_intent_data?.application_fee_amount || null, transfer_data: s.payment_intent_data?.transfer_data || null, account: s.account, refunded: 0 };
          bezahle(db, emit, pi, pmType);
          db.paymentIntents[pi.id] = pi;
          s.payment_intent = pi.id; s.payment_status = "paid";
          emit("checkout.session.completed", s, s.account || undefined);
          return { redirect: s.success_url.replace("{CHECKOUT_SESSION_ID}", s.id) };
        }
        if (s.mode === "subscription") {
          // Paket Monatlich: Abo + erste Monatsrechnung (bezahlt)
          const sub = { id: rid("sub"), object: "subscription", customer: s.customer, status: "active", cancel_at_period_end: false, metadata: s.subscription_data?.metadata || {}, current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400 };
          db.subscriptions = db.subscriptions || {}; db.subscriptions[sub.id] = sub;
          const inv = { id: rid("in"), object: "invoice", customer: s.customer, subscription: sub.id, number: "TEST-" + db.invoiceNr++, status: "paid", amount_due: s.amount_total, amount_paid: s.amount_total, hosted_invoice_url: `${pageBase}/invoice`, metadata: {} };
          db.invoices[inv.id] = inv; s.invoice = inv.id; s.subscription = sub.id; s.payment_status = "paid";
        } else if (s.mode === "payment") {
          s.payment_intent = rid("pi"); s.payment_status = "paid";
          if (String(s.invoice_creation?.enabled) === "true") {
            const inv = { id: rid("in"), object: "invoice", customer: s.customer, number: "TEST-" + db.invoiceNr++, status: "paid", amount_due: s.amount_total, amount_paid: s.amount_total, hosted_invoice_url: `${pageBase}/invoice`, metadata: s.invoice_creation.invoice_data?.metadata || {}, payment_intent: s.payment_intent };
            db.invoices[inv.id] = inv; s.invoice = inv.id;
          }
        } else {
          const si = { id: rid("seti"), payment_method: rid("pm"), metadata: s.setup_intent_data?.metadata || {} };
          db.setupIntents[si.id] = si; s.setup_intent = si.id;
        }
        emit("checkout.session.completed", s);
        return { redirect: s.success_url.replace("{CHECKOUT_SESSION_ID}", s.id) };
      });
    }
    if (art === "invoice") return { html: seite("Rechnung (Test)", "<h1>Rechnung (Simulation)</h1>") };
    if (art === "express") return { html: seite("Express-Dashboard (Test)", `<h2>Stripe Express-Dashboard (Simulation)</h2><p>Konto ${esc(id)}</p>`) };
    if (art === "onboard") {
      return tx(async (db, emit) => {
        const a = db.accounts[id];
        if (!a) return { status: 404, text: "unbekannt" };
        if (method === "GET") return { html: seite("Stripe Onboarding (Test)", `<h2>Stripe Onboarding (Simulation)</h2><p>Konto ${esc(a.id)} für ${esc(a.email)}</p><form method=post><button id=onboard style="padding:12px 20px">Angaben absenden</button></form>`) };
        Object.assign(a, { charges_enabled: true, payouts_enabled: true, details_submitted: true });
        emit("account.updated", a, a.id);
        return { redirect: query.get("return") || "/" };
      });
    }
    // Eingebettete Einrichtung (Simulation der Connect-Komponente „account-onboarding“)
    if (art === "onboarding-fertig" && method === "POST") {
      return tx(async (db, emit) => {
        const a = db.accounts[id];
        if (!a) return { status: 404, text: "unbekannt" };
        Object.assign(a, { charges_enabled: true, payouts_enabled: true, details_submitted: true, sim_angaben: { name: String(form.name || "").slice(0, 80), iban: String(form.iban || "").slice(-4) } });
        emit("account.updated", a, a.id);
        return { json: { ok: true } };
      });
    }
    // Eingebettetes Bezahlfeld (Simulation des Payment Element): { pi, client_secret, pm }
    if (art === "bestaetigen" && method === "POST") {
      return tx(async (db, emit) => {
        const pi = db.paymentIntents[form.pi];
        if (!pi || pi.client_secret !== form.client_secret) return { status: 404, json: { error: "Zahlung nicht gefunden" } };
        if (pi.status === "succeeded") return { json: { status: pi.status } };
        if (form.pm === "abgelehnt") { emit("payment_intent.payment_failed", { ...pi, last_payment_error: { message: "Karte abgelehnt (Simulation)" } }, pi.account || undefined); return { status: 402, json: { error: "Deine Karte wurde abgelehnt (Simulation)." } }; }
        bezahle(db, emit, pi, form.pm === "klarna" ? "klarna" : "card");
        emit("payment_intent.succeeded", pi, pi.account || undefined);
        return { json: { status: pi.status } };
      });
    }
    return { status: 404, text: "unbekannt" };
  }

  // ---------- Test-Hilfen (nur lokal über /mock/…) ----------
  async function mock(parts, query) {
    const [art, id] = parts;
    if (art === "state") return load();
    return tx(async (db, emit) => {
      if (art === "dispute") {
        const pi = db.paymentIntents[id];
        const d = { id: rid("dp"), object: "dispute", payment_intent: pi.id, charge: pi.latest_charge.id, amount: pi.amount, reason: "product_not_received", status: "needs_response", evidence_details: { due_by: Math.floor(Date.now() / 1000) + 7 * 86400 } };
        const acc = pi.account || undefined;
        emit("charge.dispute.created", d, acc);
        if (!acc) emit("charge.dispute.funds_withdrawn", d, acc);
        const status = query.get("status") || "lost";
        if (!acc && status === "won") emit("charge.dispute.funds_reinstated", { ...d, status }, acc);
        emit("charge.dispute.closed", { ...d, status }, acc);
        return { ok: true };
      }
      if (art === "webhooks") { db.sim_webhooks_aus = query.get("an") !== "1"; return { ok: true, webhooksAus: db.sim_webhooks_aus }; }
      if (art === "session-fehler") { db.accounts[id].sim_session_fehler = query.get("stufe") || "voll"; return { ok: true }; }
      if (art === "ohne-klarna") { db.accounts[id].sim_ohne_klarna = true; return { ok: true }; }
      if (art === "refund") {
        const pi = db.paymentIntents[id];
        const amount = Number(query.get("amount") || pi.amount);
        pi.refunded = amount;
        emit("charge.refunded", { id: pi.latest_charge.id, object: "charge", payment_intent: pi.id, amount: pi.amount, amount_refunded: amount, application_fee: pi.latest_charge.application_fee }, pi.account || undefined);
        return { ok: true };
      }
      if (art === "pay-invoice" || art === "fail-invoice") {
        const inv = db.invoices[id];
        if (art === "pay-invoice") { inv.status = "paid"; inv.amount_paid = inv.amount_due; inv.payment_intent = rid("pi"); emit("invoice.paid", inv); }
        else emit("invoice.payment_failed", inv);
        return { ok: true };
      }
      return { error: "unbekannt" };
    });
  }

  return { call, page, mock };
}

// Signierter Webhook an die eigene Site (gleiches Format wie Stripe)
export function signiere(payload, secret) {
  const t = Math.floor(Date.now() / 1000);
  return `t=${t},v1=${crypto.createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex")}`;
}
export async function sendeWebhook(url, secret, type, object, account) {
  const payload = JSON.stringify({ id: rid("evt"), type, ...(account ? { account } : {}), data: { object } });
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json", "stripe-signature": signiere(payload, secret) }, body: payload });
  return r.status;
}
