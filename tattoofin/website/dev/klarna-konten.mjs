// NUR LESEN: Klarna-Voraussetzungen aller verbundenen Studio-Konten + Fehler der abgelehnten Klarna-Zahlungen.
// Ändert nichts bei Stripe (ausschließlich GET-Aufrufe).
//   STRIPE_SECRET_KEY=sk_live_… node dev/klarna-konten.mjs [pi_… pi_…]
// Schlüssel nur im eigenen Terminal setzen (nicht in Dateien speichern). Ein eingeschränkter Schlüssel mit Leserechten
// für „Connect“ und „PaymentIntents“ reicht.
const key = process.env.STRIPE_SECRET_KEY;
if (!key) { console.error("STRIPE_SECRET_KEY fehlt"); process.exit(1); }
const get = async (pfad, account) => {
  const r = await fetch("https://api.stripe.com/v1" + pfad, { headers: { Authorization: "Bearer " + key, "Stripe-Version": "2024-06-20", ...(account ? { "Stripe-Account": account } : {}) } });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message || r.status);
  return d;
};

const konten = [];
for (let nach = ""; ;) {
  const seite = await get("/accounts?limit=100" + (nach ? "&starting_after=" + nach : ""));
  konten.push(...seite.data);
  if (!seite.has_more) break;
  nach = seite.data.at(-1).id;
}
console.log("Verbundene Konten:", konten.length);
for (const a of konten) {
  const bp = a.business_profile || {};
  console.log([
    a.id, bp.name || a.settings?.dashboard?.display_name || "", "Typ " + (a.type || a.controller?.stripe_dashboard?.type || "?"),
    "MCC " + (bp.mcc || "–"), "Klarna " + (a.capabilities?.klarna_payments || "nicht angefragt"), "Karte " + (a.capabilities?.card_payments || "–"),
    "Zahlungen " + (a.charges_enabled ? "an" : "AUS"), "Land " + a.country, "Beschreibung: " + (bp.product_description || "–"), "Website: " + (bp.url || "–"),
    "Abrechnungstext: " + (a.settings?.payments?.statement_descriptor || "–"), "Unternehmensform: " + (a.business_type || "–"),
  ].join(" | "));
}

const pis = process.argv.slice(2);
for (const id of pis) {
  try {
    const pi = await get(`/payment_intents/${id}?expand[]=latest_charge`);
    const e = pi.last_payment_error || {};
    console.log([id, (pi.amount / 100).toFixed(2) + " €", pi.status, "on_behalf_of " + (pi.on_behalf_of || "–"), "Ziel " + (pi.transfer_data?.destination || "–"),
      "Fehler " + (e.code || "–") + " / " + (e.decline_code || "–"), (e.message || "").slice(0, 120), "Zahlart " + (e.payment_method?.type || "–"),
      "Rechnungsadresse " + (e.payment_method?.billing_details?.address?.country ? "ja" : "nein"), "Telefon " + (e.payment_method?.billing_details?.phone ? "ja" : "nein"),
      "Beschreibung: " + (pi.description || "–")].join(" | "));
  } catch (err) { console.log(id, "nicht lesbar:", err.message); }
}
