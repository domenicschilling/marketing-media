// Branding je Studio: Logo, Icon, Farben, Kurzbezeichnung für die Abrechnung.
// Gespeichert im Studio-Datensatz (s.branding) + Bilder getrennt in Netlify Blobs (studio-bild/<studioId>/<art>).
// Verwendet für: Zahlseite /zahlen/<slug>, Zahlungslink /zahlung.html, Stripe-Checkout (branding_settings) und
// – auf Wunsch – das Branding des verbundenen Stripe-Kontos (accounts.update settings.branding, Datei-Upload
// purpose=business_icon/business_logo). Bilder öffentlich über /api/studio-bild?s=<slug>&art=logo|icon.
import { CFG, SECRETS, SIMULATION } from "./config.mjs";
import { store } from "./store.mjs";
import { stripe } from "./stripe.mjs";
import { now, HttpError } from "./util.mjs";

export const BILD_ARTEN = ["logo", "icon"];
const MAX_BYTES = 1.5 * 1024 * 1024; // Stripe erlaubt bis 512 KB fürs Konto-Branding – größer wird nur hier gespeichert
const STRIPE_MAX = 512 * 1024;
const FARBE = /^#[0-9a-fA-F]{6}$/;

// data:image/png;base64,… → { typ, buf }
export function bildAusDataUrl(src) {
  const m = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(src || "");
  if (!m) throw new HttpError(400, "Bild bitte als PNG oder JPG hochladen.");
  const buf = Buffer.from(m[2], "base64");
  if (buf.length > MAX_BYTES) throw new HttpError(400, "Bild ist zu groß (max. 1,5 MB).");
  return { typ: "image/" + m[1], buf };
}

export const bildKey = (studioId, art) => `studio-bild/${studioId}/${art}`;
export const ladeBild = (studioId, art) => store.get(bildKey(studioId, art));

// Öffentliche Angaben für Zahlseite/Checkout (null, wenn nichts hinterlegt)
export function brandingOeffentlich(s) {
  const b = s?.branding;
  if (!b) return null;
  const url = (art) => (b[art] ? `${CFG.siteUrl}/api/studio-bild?s=${encodeURIComponent(s.slug)}&art=${art}&v=${encodeURIComponent(b[art].am || "")}` : null);
  return { logoUrl: url("logo"), iconUrl: url("icon"), farbe: b.farbe || null, akzent: b.akzent || null, logoHell: Boolean(b.logoHell) };
}

// branding_settings für eine Stripe-Checkout-Sitzung des Studios (der Kunde sieht das Studio, nicht Tattoofin)
export function checkoutBranding(s) {
  const b = brandingOeffentlich(s);
  if (!b) return undefined;
  const out = { display_name: (s.firma || "").slice(0, 100) || undefined };
  if (b.logoUrl) out.logo = { type: "url", url: b.logoUrl };
  if (b.iconUrl) out.icon = { type: "url", url: b.iconUrl };
  if (b.farbe) out.background_color = b.farbe;
  if (b.akzent) out.button_color = b.akzent;
  return out;
}

// Datei bei Stripe hochladen (multipart an files.stripe.com), optional direkt auf dem verbundenen Konto
async function stripeDatei({ buf, typ }, purpose, account, name) {
  if (SIMULATION) return { id: "file_sim_" + purpose };
  const base = SECRETS.stripeApiBase === "https://api.stripe.com" ? "https://files.stripe.com" : SECRETS.stripeApiBase;
  const form = new FormData();
  form.append("purpose", purpose);
  form.append("file", new Blob([buf], { type: typ }), name);
  const headers = { Authorization: "Bearer " + SECRETS.stripeKey, "Stripe-Version": "2024-06-20" };
  if (account) headers["Stripe-Account"] = account;
  const res = await fetch(base + "/v1/files", { method: "POST", headers, body: form });
  const data = await res.json();
  if (!res.ok) { const e = new Error(data?.error?.message || "Stripe-Datei-Fehler " + res.status); e.stripe = data?.error; throw e; }
  return data;
}

// Branding speichern. b = { logo?, icon? (data-URLs), farbe?, akzent?, kurzbezeichnung?, logoHell?, stripe? }
// Fehlende Felder bleiben, wie sie sind (nichts wird gelöscht).
export async function brandingSetzen(s, b) {
  const alt = s.branding || {};
  const neu = { ...alt };
  for (const art of BILD_ARTEN) {
    if (typeof b[art] !== "string" || !b[art]) continue;
    const bild = bildAusDataUrl(b[art]);
    await store.set(bildKey(s.id, art), { src: b[art], typ: bild.typ, bytes: bild.buf.length, am: now() });
    neu[art] = { typ: bild.typ, bytes: bild.buf.length, am: now() };
  }
  for (const k of ["farbe", "akzent"]) {
    if (b[k] === undefined || b[k] === "") continue;
    if (!FARBE.test(b[k])) throw new HttpError(400, `Farbe „${k}“ bitte als #RRGGBB angeben.`);
    neu[k] = b[k].toLowerCase();
  }
  if (typeof b.kurzbezeichnung === "string" && b.kurzbezeichnung.trim()) {
    const k = b.kurzbezeichnung.trim().toUpperCase();
    // Stripe: 5–22 Zeichen, mind. ein Buchstabe, keine < > \ ' " *
    if (k.length < 5 || k.length > 22 || !/[A-Z]/.test(k) || /[<>\\'"*]/.test(k)) throw new HttpError(400, "Kurzbezeichnung: 5–22 Zeichen, ohne < > \\ ' \" *");
    neu.kurzbezeichnung = k;
  }
  if (b.logoHell !== undefined) neu.logoHell = Boolean(b.logoHell);
  neu.am = now();
  s.branding = neu;

  let stripeErgebnis = null;
  if (b.stripe && s.stripe?.accountId) {
    // Stripe-Fehler melden, aber das bei Tattoofin gespeicherte Branding behalten
    try { stripeErgebnis = await stripeBrandingSetzen(s); }
    catch (e) { stripeErgebnis = { fehler: e.stripe?.message || e.message }; s.branding.stripeFehler = stripeErgebnis.fehler; }
  }
  return { branding: s.branding, stripe: stripeErgebnis };
}

// Branding des verbundenen Stripe-Kontos setzen (Icon, Logo, Farben, Abrechnungstext)
export async function stripeBrandingSetzen(s) {
  const acct = s.stripe.accountId, b = s.branding || {};
  const settings = { branding: {} };
  const dateien = {};
  for (const [art, purpose] of [["icon", "business_icon"], ["logo", "business_logo"]]) {
    if (!b[art]) continue;
    const bild = await ladeBild(s.id, art);
    if (!bild) continue;
    const { typ, buf } = bildAusDataUrl(bild.src);
    if (buf.length > STRIPE_MAX) { dateien[art] = "übersprungen: größer als 512 KB"; continue; }
    const f = await stripeDatei({ buf, typ }, purpose, acct, `${s.slug}-${art}.${typ === "image/png" ? "png" : "jpg"}`);
    settings.branding[art] = f.id;
    dateien[art] = f.id;
  }
  if (b.farbe) settings.branding.primary_color = b.farbe;
  if (b.akzent) settings.branding.secondary_color = b.akzent;
  if (b.kurzbezeichnung) settings.payments = { statement_descriptor: b.kurzbezeichnung };
  if (!Object.keys(settings.branding).length) delete settings.branding;
  const a = await stripe("POST", "/accounts/" + acct, { settings });
  s.branding.stripeAm = now();
  delete s.branding.stripeFehler;
  s.branding.stripeDateien = dateien;
  return { accountId: acct, dateien, branding: a.settings?.branding || null, abrechnungstext: a.settings?.payments?.statement_descriptor || null };
}
