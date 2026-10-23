// PayPal-Zahlungen der Kunden (Geld direkt an das PayPal-Konto des Studios)
//   POST /api/paypal/capture { orderId }   nach Freigabe im PayPal-Fenster: abschließen, prüfen, als bezahlt markieren
//   POST /api/paypal-webhook               PayPal-Ereignisse (Signatur per verify-webhook-signature geprüft):
//        PAYMENT.CAPTURE.COMPLETED (Rückfall, falls der Kunde das Fenster schließt), .PENDING, .DENIED, .REFUNDED, .REVERSED
// Bestellung anlegen: POST /api/pay { …, zahlweg: "paypal" } (pay.mjs)
import { json, fail, body, clean, handler, now } from "./_lib/util.mjs";
import { getStudio, zahlungBy, saveZahlung, log } from "./_lib/store.mjs";
import { paypalAbschliessen, paypalWebhookPruefen } from "./_lib/paypal.mjs";
import { paypalBezahlt, notifyAdmin } from "./_lib/domain.mjs";

const captureAusLinks = (r) => ((r.links || []).find((l) => l.rel === "up")?.href || "").split("/captures/")[1]?.split(/[/?]/)[0] || "";

export default handler(async (req) => {
  if (req.method !== "POST") return fail("Methode nicht erlaubt", 405);
  const pfad = new URL(req.url).pathname;

  if (pfad === "/api/paypal/capture") {
    const orderId = clean((await body(req)).orderId, 40);
    if (!/^[A-Z0-9-]{8,40}$/.test(orderId)) return fail("Ungültige PayPal-Bestellung");
    const z = await zahlungBy("ppo", orderId);
    if (!z) return fail("Zahlung nicht gefunden", 404);
    if (z.status === "bezahlt") return json({ ok: true, status: "bezahlt", zahlung: z.id });
    const s = await getStudio(z.studioId);
    const cap = await paypalAbschliessen(s, z, orderId);
    if (cap.status === "COMPLETED") await paypalBezahlt(z, cap);
    else if (cap.status === "PENDING") { z.status = "in_pruefung"; z.paypal = { ...(z.paypal || {}), captureId: cap.captureId }; await saveZahlung(z); }
    else return fail("PayPal hat die Zahlung nicht abgeschlossen. Es wurde nichts abgebucht.", 402);
    return json({ ok: true, status: z.status, zahlung: z.id });
  }

  if (pfad === "/api/paypal-webhook") {
    const roh = await req.text();
    let ok = false;
    try { ok = await paypalWebhookPruefen(req.headers, roh); } catch (e) { return fail("Webhook: " + e.message, 400); }
    if (!ok) return fail("Webhook: Signatur ungültig", 400);
    const ev = JSON.parse(roh), r = ev.resource || {};
    const z = (await zahlungBy("zahlung", r.custom_id)) || (await zahlungBy("ppc", r.id)) || (await zahlungBy("ppc", captureAusLinks(r)));
    if (!z) return json({ ok: true, unbekannt: true });
    const s = await getStudio(z.studioId);
    switch (ev.event_type) {
      case "PAYMENT.CAPTURE.COMPLETED":
        if (z.status !== "bezahlt") await paypalBezahlt(z, { orderId: z.paypal?.orderId || r.supplementary_data?.related_ids?.order_id || "", captureId: r.id, zahler: "" });
        break;
      case "PAYMENT.CAPTURE.PENDING":
        if (z.status === "offen") { z.status = "in_pruefung"; await saveZahlung(z); }
        break;
      case "PAYMENT.CAPTURE.DENIED":
        if (z.status !== "bezahlt") { z.status = "fehlgeschlagen"; await saveZahlung(z); }
        break;
      case "PAYMENT.CAPTURE.REFUNDED":
      case "PAYMENT.CAPTURE.REVERSED": {
        const cent = Math.round(Number(r.amount?.value || 0) * 100);
        z.erstattetCent = Math.min(z.betragCent, (z.erstattetCent || 0) + cent);
        z.status = ev.event_type.endsWith("REVERSED") ? "rueckgebucht" : z.erstattetCent >= z.betragCent ? "erstattet" : z.status;
        z.paypal = { ...(z.paypal || {}), letztesEreignis: { typ: ev.event_type, am: now() } };
        await saveZahlung(z);
        if (ev.event_type.endsWith("REVERSED")) await notifyAdmin("PayPal-Rückbuchung (Zahlung direkt beim Studio)", s, { Zahlung: z.id, Betrag: r.amount?.value + " €" });
        break;
      }
    }
    await log("paypal-webhook", { typ: ev.event_type, zahlungId: z.id });
    return json({ ok: true });
  }
  return fail("Nicht gefunden", 404);
});

export const config = { path: ["/api/paypal/capture", "/api/paypal-webhook"] };
