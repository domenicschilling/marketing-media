// Datenspeicher: auf Netlify „Netlify Blobs“, lokal Dateien in website/.data/
// Schlüssel:
//   studio/<id>                      Studio-Datensatz
//   zahlung/<studioId>/<id>          Zahlungslink bzw. Kundenzahlung über Tattoofin
//   abrechnung/<studioId>/<YYYY-MM>  Monatsabrechnung Provision
//   idx/email/<email>, idx/slug/<slug>, idx/acct/<stripeAccountId>, idx/cus/<stripeCustomerId> -> studioId
//   idx/zahlung/<id>, idx/cs/<checkoutSessionId>, idx/pi/<paymentIntentId> -> "studioId/zahlungId"
//   meta/<name>                      z. B. Steuersatz-ID, Aktionszähler
//   log/<zeit>-<id>                  Ereignis-Protokoll
import fs from "node:fs/promises";
import path from "node:path";
import { CFG } from "./config.mjs";

let backend;

async function netlify() {
  const { getStore } = await import("@netlify/blobs");
  // Vorschau-Site: eigener Speicher, damit nie echte Daten berührt werden
  const s = getStore({ name: CFG.vorschau ? "tattoofin-vorschau" : "tattoofin", consistency: "strong" });
  return {
    get: (k) => s.get(k, { type: "json" }),
    set: (k, v) => s.setJSON(k, v),
    del: (k) => s.delete(k),
    list: async (prefix) => {
      const out = [];
      let cursor;
      do {
        const r = await s.list({ prefix, paginate: false, cursor });
        out.push(...r.blobs.map((b) => b.key));
        cursor = r.cursor;
      } while (cursor);
      return out;
    },
  };
}

function files() {
  const dir = process.env.DATA_DIR || path.resolve(process.cwd(), ".data");
  const f = (k) => path.join(dir, encodeURIComponent(k) + ".json");
  return {
    get: async (k) => { try { return JSON.parse(await fs.readFile(f(k), "utf8")); } catch { return null; } },
    set: async (k, v) => { await fs.mkdir(dir, { recursive: true }); await fs.writeFile(f(k), JSON.stringify(v, null, 2)); },
    del: async (k) => { await fs.rm(f(k), { force: true }); },
    list: async (prefix) => {
      try {
        return (await fs.readdir(dir)).filter((n) => n.endsWith(".json")).map((n) => decodeURIComponent(n.slice(0, -5))).filter((k) => k.startsWith(prefix)).sort();
      } catch { return []; }
    },
  };
}

async function db() {
  if (backend) return backend;
  const onNetlify = process.env.NETLIFY_BLOBS_CONTEXT || process.env.NETLIFY || process.env.CONTEXT || globalThis.Netlify;
  backend = onNetlify && !process.env.DATA_DIR ? await netlify() : files();
  return backend;
}

export const store = {
  get: async (k) => (await db()).get(k),
  set: async (k, v) => (await db()).set(k, v),
  del: async (k) => (await db()).del(k),
  list: async (prefix) => (await db()).list(prefix),
  async all(prefix) {
    const keys = await this.list(prefix);
    const out = [];
    for (const k of keys) { const v = await this.get(k); if (v) out.push(v); }
    return out;
  },
};

// ---- Studios ----
export const getStudio = (id) => (id ? store.get("studio/" + id) : null);

// E-Mail für den Vergleich normalisieren: Leerzeichen weg, Groß/Klein egal, googlemail.com = gmail.com,
// bei Gmail außerdem Punkte und „+Zusatz“ im lokalen Teil ignorieren (Gmail stellt diese Varianten gleich zu).
export function normEmail(e) {
  let [lokal, domain] = String(e || "").replace(/\s+/g, "").toLowerCase().split("@");
  if (!lokal || !domain) return String(e || "").replace(/\s+/g, "").toLowerCase();
  if (domain === "googlemail.com") domain = "gmail.com";
  if (domain === "gmail.com") lokal = lokal.split("+")[0].replace(/\./g, "");
  return lokal + "@" + domain;
}

export async function saveStudio(s) {
  s.updatedAt = new Date().toISOString();
  await store.set("studio/" + s.id, s);
  if (s.email) await store.set("idx/email/" + s.email.toLowerCase(), s.id);
  if (s.email) await store.set("idx/emailn/" + normEmail(s.email), s.id);
  if (s.slug) await store.set("idx/slug/" + s.slug, s.id);
  if (s.stripe?.accountId) await store.set("idx/acct/" + s.stripe.accountId, s.id);
  if (s.stripe?.customerId) await store.set("idx/cus/" + s.stripe.customerId, s.id);
  return s;
}

export async function studioBy(kind, value) {
  if (!value) return null;
  if (kind === "email") {
    const exakt = await store.get("idx/email/" + String(value).replace(/\s+/g, "").toLowerCase());
    if (exakt) return getStudio(exakt);
    const n = normEmail(value);
    const sid = await store.get("idx/emailn/" + n);
    if (sid) return getStudio(sid);
    // Ältere Datensätze ohne normalisierten Index: einmal durchsuchen (wenige Studios)
    const treffer = (await allStudios()).find((x) => x.email && normEmail(x.email) === n);
    if (treffer) await store.set("idx/emailn/" + n, treffer.id);
    return treffer || null;
  }
  const sid = await store.get(`idx/${kind}/${value}`);
  return sid ? getStudio(sid) : null;
}

export const allStudios = () => store.all("studio/");

// Einfache Begrenzung (Rate-Limit): zählt einen Versuch unter key; true = noch innerhalb von max pro Fenster
export async function zaehleVersuch(key, max, fensterMs) {
  const jetzt = Date.now();
  const alt = ((await store.get(key))?.t || []).filter((t) => jetzt - t < fensterMs);
  alt.push(jetzt);
  await store.set(key, { t: alt.slice(-100) });
  return alt.length <= max;
}

// Alle Studios zu einer E-Mail-Adresse (normalisiert). Der Index idx/email zeigt nur auf den zuletzt gespeicherten
// Datensatz – bei mehreren Anmeldungen mit derselben Adresse (z. B. Test-Abschlüsse) kann das ein Entwurf sein.
export const AKTIV = (s) => s && !["entwurf", "abgebrochen"].includes(s.status);
export async function studiosPerEmail(email) {
  const n = normEmail(email);
  if (!n) return [];
  return (await allStudios()).filter((x) => x.email && normEmail(x.email) === n)
    .sort((a, b) => (b.updatedAt || b.createdAt || "").localeCompare(a.updatedAt || a.createdAt || ""));
}

// ---- Zahlungen & Abrechnungen ----
export const getZahlung = (studioId, id) => store.get(`zahlung/${studioId}/${id}`);
export async function saveZahlung(z) {
  await store.set(`zahlung/${z.studioId}/${z.id}`, z);
  await store.set("idx/zahlung/" + z.id, `${z.studioId}/${z.id}`);
  if (z.checkoutSessionId) await store.set("idx/cs/" + z.checkoutSessionId, `${z.studioId}/${z.id}`);
  if (z.paymentIntentId) await store.set("idx/pi/" + z.paymentIntentId, `${z.studioId}/${z.id}`);
  return z;
}
export async function zahlungBy(kind, value) {
  if (!value) return null;
  const ref = await store.get(`idx/${kind}/${value}`);
  if (!ref) return null;
  const [sid, zid] = ref.split("/");
  return getZahlung(sid, zid);
}
export const zahlungenVon = async (studioId) =>
  (await store.all(`zahlung/${studioId}/`)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const getAbrechnung = (studioId, monat) => store.get(`abrechnung/${studioId}/${monat}`);
export const saveAbrechnung = (a) => store.set(`abrechnung/${a.studioId}/${a.monat}`, a);
export const abrechnungenVon = async (studioId) =>
  (await store.all(`abrechnung/${studioId}/`)).sort((a, b) => b.monat.localeCompare(a.monat));

// ---- Nachweise (Leistungsbestätigung mit Unterschrift/Foto, getrennt vom Zahlungsdatensatz, weil groß) ----
export const getLeistung = (studioId, zahlungId) => store.get(`leistung/${studioId}/${zahlungId}`);
export const saveLeistung = (studioId, zahlungId, v) => store.set(`leistung/${studioId}/${zahlungId}`, v);

export async function log(type, data = {}) {
  const t = new Date().toISOString();
  await store.set(`log/${t}-${Math.random().toString(36).slice(2, 7)}`, { t, type, ...data });
}
