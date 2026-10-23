// PayPal für Studios (seit 23.10.2026): Geld geht DIREKT auf das PayPal-Geschäftskonto des Studios.
// Weg: Orders API v2 mit der REST-App von Tattoofin und purchase_units[].payee = PayPal-Konto des Studios
// („Pay another account“, developer.paypal.com/docs/checkout/standard/customize/pay-another-account/).
// Kein PayPal-Partnerstatus nötig; dafür keine Plattformgebühr: Auch bei Risikofrei fällt vorerst KEINE Provision an
// (Entscheidung Domenic 23.10.). Erstattungen macht das Studio in seinem PayPal-Konto.
// „Später bezahlen“ / Ratenzahlung zeigt PayPal selbst an, wenn Kunde und Betrag passen (enable-funding=paylater).
import crypto from "node:crypto";
import { PAYPAL, SECRETS, CFG, paypalAktiv } from "./config.mjs";
import { store } from "./store.mjs";
import { HttpError } from "./util.mjs";

const euroWert = (cent) => (cent / 100).toFixed(2);
let tokenCache = null;

async function token() {
  if (tokenCache && tokenCache.bis > Date.now() + 60e3) return tokenCache.t;
  const r = await fetch(PAYPAL.apiBase + "/v1/oauth2/token", {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(PAYPAL.clientId + ":" + SECRETS.paypalSecret).toString("base64"), "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("PayPal-Anmeldung fehlgeschlagen: " + (d.error_description || r.status));
  tokenCache = { t: d.access_token, bis: Date.now() + (d.expires_in || 300) * 1000 };
  return tokenCache.t;
}

async function pp(method, pfad, body, { requestId, roh } = {}) {
  if (PAYPAL.simulation) return sim(method, pfad, body);
  const headers = { Authorization: "Bearer " + (await token()), "Content-Type": "application/json", Prefer: "return=representation" };
  if (requestId) headers["PayPal-Request-Id"] = requestId;
  const r = await fetch(PAYPAL.apiBase + pfad, { method, headers, body: roh ?? (body ? JSON.stringify(body) : undefined) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    const issue = d.details?.[0]?.issue || d.name || "";
    const e = new Error("PayPal: " + (d.details?.[0]?.description || d.message || r.status));
    e.issue = issue; e.status = r.status >= 500 ? 502 : 400;
    throw e;
  }
  return d;
}

// ---- Simulation (Vorschau ohne Sandbox-Zugang) ----
async function sim(method, pfad, body) {
  const teile = pfad.split("/").filter(Boolean); // v2 checkout orders <id> capture
  if (method === "POST" && pfad === "/v2/checkout/orders") {
    const payee = body.purchase_units[0].payee || {};
    if (/fehler|invalid/i.test(payee.email_address || "")) { const e = new Error("PayPal: Empfängerkonto ungültig (Simulation)"); e.issue = "PAYEE_ACCOUNT_INVALID"; e.status = 400; throw e; }
    const o = { id: "PPSIM" + crypto.randomBytes(6).toString("hex").toUpperCase(), status: "CREATED", purchase_units: body.purchase_units, intent: body.intent };
    await store.set("pp-sim/" + o.id, o);
    return o;
  }
  const o = await store.get("pp-sim/" + teile[3]);
  if (!o) { const e = new Error("PayPal: Bestellung unbekannt"); e.status = 404; throw e; }
  if (method === "POST" && teile[4] === "capture") {
    if (o.status !== "COMPLETED") {
      const pu = o.purchase_units[0];
      o.status = "COMPLETED";
      pu.payments = { captures: [{ id: "CAPSIM" + crypto.randomBytes(5).toString("hex").toUpperCase(), status: "COMPLETED", amount: pu.amount, custom_id: pu.custom_id }] };
      o.payer = { email_address: "kunde@simulation.test" };
      await store.set("pp-sim/" + o.id, o);
    }
    return o;
  }
  return o;
}

// ---- Studio-Konto ----
export const PP_ID_MUSTER = /^[A-Z0-9]{10,16}$/;
export const payeeVon = (s) => (s.paypal?.merchantId ? { merchant_id: s.paypal.merchantId } : { email_address: s.paypal?.email });
export const paypalVerknuepft = (s) => Boolean(s?.paypal?.an && (s.paypal.merchantId || s.paypal.email));

// Prüfen, ob PayPal an dieses Konto zahlen kann: Testbestellung über 1 € anlegen (wird nie bezahlt, verfällt von selbst)
export async function paypalKontoPruefen(s, { email, merchantId }) {
  const payee = merchantId ? { merchant_id: merchantId } : { email_address: email };
  try {
    await pp("POST", "/v2/checkout/orders", {
      intent: "CAPTURE",
      purchase_units: [{ reference_id: "pruefung-" + s.id, amount: { currency_code: "EUR", value: "1.00" }, payee, description: "Tattoofin Verbindungsprüfung (wird nicht bezahlt)" }],
    });
    return { ok: true };
  } catch (e) {
    if (/PAYEE|RECEIVER|ACCOUNT/i.test(e.issue || "")) return { ok: false, fehler: "Dieses PayPal-Konto kann so keine Zahlungen empfangen. Bitte prüfe E-Mail bzw. Händler-ID und ob es ein PayPal-Geschäftskonto ist." };
    throw e;
  }
}

// ---- Bestellung + Abschluss ----
export async function paypalBestellung(s, z, artikel) {
  if (!paypalVerknuepft(s)) throw new HttpError(409, "PayPal ist bei diesem Studio nicht verfügbar.");
  const wert = { currency_code: "EUR", value: euroWert(z.betragCent) };
  const name = artikel.name.slice(0, 127);
  const o = await pp("POST", "/v2/checkout/orders", {
    intent: "CAPTURE",
    purchase_units: [{
      reference_id: z.id, custom_id: z.id, description: name, payee: payeeVon(s),
      amount: { ...wert, breakdown: { item_total: wert } },
      items: [{ name, description: artikel.description.slice(0, 127), quantity: "1", unit_amount: wert }],
    }],
    payment_source: { paypal: { experience_context: {
      brand_name: s.firma.slice(0, 127), locale: "de-DE", shipping_preference: "NO_SHIPPING", user_action: "PAY_NOW",
      return_url: `${CFG.siteUrl}/bezahlt.html?z=${z.id}`, cancel_url: `${CFG.siteUrl}/zahlung.html?z=${z.id}&abbruch=1`,
    } } },
  }, { requestId: `tf-${z.id}-${z.betragCent}-${Date.now()}` });
  return o;
}

// Abschließen (nach Freigabe im PayPal-Fenster). Prüft Betrag, Zahlung und Empfänger, bevor wir „bezahlt“ setzen.
export async function paypalAbschliessen(s, z, orderId) {
  let o = await pp("POST", `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {}, { requestId: "cap-" + orderId });
  const pu = o.purchase_units?.[0] || {};
  const cap = pu.payments?.captures?.[0];
  if (!cap) throw new HttpError(502, "PayPal hat die Zahlung nicht bestätigt.");
  const passt = cap.amount?.value === euroWert(z.betragCent) && cap.amount?.currency_code === "EUR" && (pu.custom_id || cap.custom_id || pu.reference_id) === z.id;
  if (!passt) throw new HttpError(409, "PayPal-Zahlung passt nicht zu diesem Zahlungslink.");
  return { status: cap.status, captureId: cap.id, orderId: o.id, zahler: o.payer?.email_address || "", order: o };
}

export async function paypalOrderLesen(orderId) { return pp("GET", `/v2/checkout/orders/${encodeURIComponent(orderId)}`); }

// Webhook-Signatur per PayPal prüfen (verify-webhook-signature). Ereignis unverändert zurückschicken (Rohtext).
export async function paypalWebhookPruefen(headers, roh) {
  if (!PAYPAL.webhookId) throw new HttpError(400, "PAYPAL_WEBHOOK_ID fehlt");
  const h = (k) => headers.get(k) || "";
  const koerper = `{"auth_algo":${JSON.stringify(h("paypal-auth-algo"))},"cert_url":${JSON.stringify(h("paypal-cert-url"))},"transmission_id":${JSON.stringify(h("paypal-transmission-id"))},` +
    `"transmission_sig":${JSON.stringify(h("paypal-transmission-sig"))},"transmission_time":${JSON.stringify(h("paypal-transmission-time"))},"webhook_id":${JSON.stringify(PAYPAL.webhookId)},"webhook_event":${roh}}`;
  const d = await pp("POST", "/v1/notifications/verify-webhook-signature", null, { roh: koerper });
  return d.verification_status === "SUCCESS";
}

// Für die Kundenseite: Client-ID (öffentlich) bzw. Simulations-Knopf
export const paypalOeffentlich = (s) => (paypalAktiv() && paypalVerknuepft(s) ? { clientId: PAYPAL.clientId || null, sim: PAYPAL.simulation || PAYPAL.lokal } : null);
