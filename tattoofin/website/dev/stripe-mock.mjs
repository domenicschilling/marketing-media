// Minimaler Stripe-Nachbau für lokale Tests (nur die Endpunkte, die die Website nutzt).
// Bezahlseite: GET /pay/<session>  → Button „Bezahlen“ löst den signierten Webhook aus.
import http from "node:http";
import crypto from "node:crypto";

function nest(params) {
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

export function startStripeMock({ port = 12111, webhookUrl, webhookSecret, log = () => {} }) {
  const db = { customers: {}, sessions: {}, invoices: {}, items: [], setupIntents: {}, refunds: [], taxRates: {}, accounts: {}, paymentIntents: {}, feeRefunds: [], transfers: [], reversals: [] };
  // Stripe-Gebühren im Nachbau: Karte EWR 1,5 % + 0,25 €, Klarna 2,99 % + 0,35 €
  const gebuehr = (betrag, pm) => (pm === "klarna" ? Math.round(betrag * 0.0299) + 35 : Math.round(betrag * 0.015) + 25);
  const rid = (p) => p + "_" + crypto.randomBytes(6).toString("hex");
  let invoiceNr = 1000;
  const idem = {};

  async function webhook(type, object, account) {
    const payload = JSON.stringify({ id: rid("evt"), type, ...(account ? { account } : {}), data: { object } });
    const t = Math.floor(Date.now() / 1000);
    const sig = crypto.createHmac("sha256", webhookSecret).update(`${t}.${payload}`).digest("hex");
    const r = await fetch(webhookUrl, { method: "POST", headers: { "content-type": "application/json", "stripe-signature": `t=${t},v1=${sig}` }, body: payload });
    log(`[stripe-mock] webhook ${type} → ${r.status}`);
    return r.status;
  }

  function payInvoice(inv, ok = true) {
    if (ok) { inv.status = "paid"; inv.amount_paid = inv.amount_due; inv.payment_intent = rid("pi"); return webhook("invoice.paid", inv); }
    return webhook("invoice.payment_failed", inv);
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://x");
    let raw = "";
    for await (const c of req) raw += c;
    const p = nest(new URLSearchParams(raw));
    const send = (code, obj, type = "application/json") => { res.writeHead(code, { "content-type": type }); res.end(type === "application/json" ? JSON.stringify(obj) : obj); };
    const parts = url.pathname.split("/").filter(Boolean);
    const key = req.headers["idempotency-key"];
    if (key && idem[key]) return send(200, idem[key]);
    const done = (obj) => { if (key) idem[key] = obj; send(200, obj); };

    try {
      // --- Bezahlseite ---
      if (parts[0] === "pay") {
        const s = db.sessions[parts[1]];
        if (!s) return send(404, "unbekannt", "text/plain");
        if (req.method === "GET") return send(200, `<!doctype html><meta charset=utf-8><title>Stripe (Test)</title><body style="font:16px system-ui;max-width:420px;margin:60px auto">
          <h2>Stripe Testkasse</h2><p>Modus: <b>${s.mode}</b>${s.amount_total ? " · Betrag: " + (s.amount_total / 100).toFixed(2) + " €" : ""}</p>
          <form method=post><input type=hidden name=pm value=card><button id=pay style="padding:12px 20px;font-size:16px">${s.mode === "setup" ? "Zahlungsmethode speichern" : "Mit Karte bezahlen"}</button></form>
          ${s.account || s.payment_intent_data?.transfer_data ? '<form method=post><input type=hidden name=pm value=klarna><button id=pay-klarna style="padding:12px 20px;font-size:16px;margin-top:8px">Mit Klarna (Raten) bezahlen</button></form>' : ""}
          <p><a id=cancel href="${s.cancel_url}">Abbrechen</a></p>`, "text/html");
        s.status = "complete";
        const ziel = s.payment_intent_data?.transfer_data?.destination;
        if (s.mode === "payment" && (s.account || ziel)) {
          const pmType = p.pm || "card";
          const pi = { id: rid("pi"), amount: s.amount_total, payment_method_types: [pmType], latest_charge: {
            id: rid("ch"), payment_method_details: { type: pmType }, application_fee: s.payment_intent_data?.application_fee_amount ? rid("fee") : null, amount: s.amount_total,
            transfer: ziel ? rid("tr") : null, balance_transaction: { id: rid("txn"), fee: gebuehr(s.amount_total, pmType) },
          } };
          db.paymentIntents[pi.id] = { ...pi, account: s.account, destination: ziel || null, refunded: 0 };
          s.payment_intent = pi.id; s.payment_status = "paid";
          await webhook("checkout.session.completed", s, s.account || undefined);
          res.writeHead(303, { Location: s.success_url.replace("{CHECKOUT_SESSION_ID}", s.id) });
          return res.end();
        }
        if (s.mode === "payment") {
          s.payment_intent = rid("pi");
          if (s.invoice_creation?.enabled === "true") {
            const inv = { id: rid("in"), object: "invoice", customer: s.customer, number: "TEST-" + invoiceNr++, status: "paid", amount_due: s.amount_total, amount_paid: s.amount_total, hosted_invoice_url: "http://localhost:" + port + "/invoice", metadata: s.invoice_creation.invoice_data?.metadata || {}, payment_intent: s.payment_intent };
            db.invoices[inv.id] = inv; s.invoice = inv.id;
          }
        } else {
          const si = { id: rid("seti"), payment_method: rid("pm"), metadata: s.setup_intent_data?.metadata || {} };
          db.setupIntents[si.id] = si; s.setup_intent = si.id;
        }
        await webhook("checkout.session.completed", s);
        res.writeHead(303, { Location: s.success_url.replace("{CHECKOUT_SESSION_ID}", s.id) });
        return res.end();
      }
      if (parts[0] === "invoice") return send(200, "<h1>Rechnung (Test)</h1>", "text/html");
      if (parts[0] === "onboard") {
        const a = db.accounts[parts[1]];
        if (req.method === "GET") return send(200, `<!doctype html><meta charset=utf-8><body style="font:16px system-ui;max-width:420px;margin:60px auto"><h2>Stripe Onboarding (Test)</h2><p>Konto ${a.id} für ${a.email}</p><form method=post><button id=onboard style="padding:12px 20px">Angaben absenden</button></form>`, "text/html");
        Object.assign(a, { charges_enabled: true, payouts_enabled: true, details_submitted: true });
        await webhook("account.updated", a, a.id);
        res.writeHead(303, { Location: url.searchParams.get("return") });
        return res.end();
      }
      if (parts[0] === "mock") {
        const inv = db.invoices[parts[2]];
        if (parts[1] === "pay-invoice") return send(200, { status: await payInvoice(inv, true) });
        if (parts[1] === "fail-invoice") return send(200, { status: await payInvoice(inv, false) });
        if (parts[1] === "state") return send(200, db);
        if (parts[1] === "dispute") {
          const pi = db.paymentIntents[parts[2]];
          const d = { id: rid("dp"), object: "dispute", payment_intent: pi.id, charge: pi.latest_charge.id, amount: pi.amount, reason: "product_not_received", status: "needs_response", evidence_details: { due_by: Math.floor(Date.now() / 1000) + 7 * 86400 } };
          const acc = pi.account || undefined;
          await webhook("charge.dispute.created", d, acc);
          if (!acc) await webhook("charge.dispute.funds_withdrawn", d, acc);
          const status = url.searchParams.get("status") || "lost";
          if (!acc && status === "won") await webhook("charge.dispute.funds_reinstated", { ...d, status }, acc);
          return send(200, { status: await webhook("charge.dispute.closed", { ...d, status }, acc) });
        }
        if (parts[1] === "refund") {
          const pi = db.paymentIntents[parts[2]];
          const amount = Number(url.searchParams.get("amount") || pi.amount);
          pi.refunded = amount;
          const ch = { id: pi.latest_charge.id, object: "charge", payment_intent: pi.id, amount: pi.amount, amount_refunded: amount, application_fee: pi.latest_charge.application_fee };
          return send(200, { status: await webhook("charge.refunded", ch, pi.account || undefined) });
        }
      }

      if (parts[0] !== "v1") return send(404, { error: { message: "unbekannt" } });
      const [, res1, id1, act] = parts;
      log(`[stripe-mock] ${req.method} ${url.pathname}`);

      const acctHdr = req.headers["stripe-account"];
      if (res1 === "accounts") {
        if (req.method === "POST" && !id1) { const a = { id: rid("acct"), object: "account", ...p, charges_enabled: false, payouts_enabled: false, details_submitted: false }; db.accounts[a.id] = a; return done(a); }
        if (req.method === "POST" && act === "login_links") return done({ object: "login_link", url: `http://localhost:${port}/express/${id1}` });
        return send(200, db.accounts[id1]);
      }
      if (res1 === "account_links") return done({ url: `http://localhost:${port}/onboard/${p.account}?return=${encodeURIComponent(p.return_url)}` });
      if (res1 === "payment_intents") { const pi = db.paymentIntents[id1]; return pi ? send(200, pi) : send(404, { error: { message: "pi fehlt" } }); }
      if (res1 === "transfers" && act === "reversals") { const r = { id: rid("trr"), transfer: id1, amount: Number(p.amount), metadata: p.metadata || {} }; db.reversals.push(r); return done(r); }
      if (res1 === "transfers" && !id1) { const t = { id: rid("tr"), ...p, amount: Number(p.amount) }; db.transfers.push(t); return done(t); }
      if (res1 === "application_fees" && act === "refunds") { const r = { id: rid("fr"), fee: id1, amount: Number(p.amount) }; db.feeRefunds.push(r); return done(r); }
      if (res1 === "customers") {
        if (req.method === "POST" && !id1) { const c = { id: rid("cus"), object: "customer", ...p }; db.customers[c.id] = c; return done(c); }
        if (req.method === "POST" && act === "tax_ids") return done({ id: rid("txi"), ...p });
        if (req.method === "POST") { Object.assign(db.customers[id1], p); return done(db.customers[id1]); }
        return send(200, db.customers[id1]);
      }
      if (res1 === "tax_rates") { const t = { id: rid("txr"), ...p }; db.taxRates[t.id] = t; return done(t); }
      if (res1 === "checkout" && id1 === "sessions") {
        const s = { id: rid("cs"), object: "checkout.session", ...p, url: `http://localhost:${port}/pay/`, status: "open", account: acctHdr || null };
        s.url += s.id;
        if (s.mode === "payment") {
          const li = p.line_items[0];
          const net = Number(li.price_data.unit_amount);
          s.amount_total = li.tax_rates ? Math.round(net * 1.19) : net;
          if (s.payment_intent_data?.application_fee_amount) s.payment_intent_data.application_fee_amount = Number(s.payment_intent_data.application_fee_amount);
        }
        db.sessions[s.id] = s;
        return done(s);
      }
      if (res1 === "setup_intents") return send(200, db.setupIntents[id1]);
      if (res1 === "invoiceitems") { const it = { id: rid("ii"), ...p, amount: Number(p.amount) }; db.items.push(it); return done(it); }
      if (res1 === "invoices") {
        if (req.method === "GET") return send(200, db.invoices[id1]);
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
          inv.status = "open"; inv.number = "TEST-" + invoiceNr++; inv.hosted_invoice_url = `http://localhost:${port}/invoice`;
          inv.due_date = Math.floor(Date.now() / 1000) + 14 * 86400;
          if (inv.collection_method === "charge_automatically") setTimeout(() => payInvoice(inv, true), 300);
          return done(inv);
        }
        if (act === "send") return done(inv);
        if (act === "pay") { inv.status = "paid"; inv.paid_out_of_band = p.paid_out_of_band === "true"; return done(inv); }
      }
      if (res1 === "refunds" && db.paymentIntents[p.payment_intent]) {
        const pi = db.paymentIntents[p.payment_intent];
        const amount = Number(p.amount || pi.amount - pi.refunded);
        if (pi.refunded + amount > pi.amount) return send(400, { error: { message: "Betrag zu hoch" } });
        pi.refunded += amount;
        const r = { id: rid("re"), payment_intent: pi.id, amount, reverse_transfer: p.reverse_transfer === "true", refund_application_fee: p.refund_application_fee === "true", status: "succeeded" };
        db.refunds.push(r);
        const ch = { id: pi.latest_charge.id, object: "charge", payment_intent: pi.id, amount: pi.amount, amount_refunded: pi.refunded, application_fee: pi.latest_charge.application_fee };
        setTimeout(() => webhook("charge.refunded", ch, pi.account || undefined), 100);
        return done(r);
      }
      if (res1 === "refunds") { const r = { id: rid("re"), payment_intent: p.payment_intent, amount: 178381, status: "succeeded" }; db.refunds.push(r); return done(r); }
      if (res1 === "billing_portal") return done({ id: rid("bps"), url: `http://localhost:${port}/invoice` });
      return send(404, { error: { message: "Mock: " + url.pathname + " nicht implementiert" } });
    } catch (e) {
      return send(500, { error: { message: e.message } });
    }
  });
  return new Promise((ok) => server.listen(port, () => ok({ server, db })));
}
