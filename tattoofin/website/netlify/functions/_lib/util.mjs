import crypto from "node:crypto";
import { CFG } from "./config.mjs";

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", ...headers } });

export const fail = (message, status = 400) => json({ error: message }, status);

export const id = (prefix = "") => prefix + crypto.randomBytes(9).toString("base64url");

export const now = () => new Date().toISOString();

export function euro(cent) {
  return (cent / 100).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

export function brutto(nettoCent) {
  return Math.round(nettoCent * (100 + CFG.ustProzent) / 100);
}

export function datum(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" });
}

export function monatName(ym) {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });
}

// "2026-10" des Vormonats relativ zu date
export function vormonat(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1));
  return d.toISOString().slice(0, 7);
}

export function addMonths(iso, n) {
  const d = new Date(iso);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString();
}

// Letzter Tag des Monats, in dem date liegt (ISO-Datum)
export function monatsende(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 22, 59, 59)).toISOString();
}

export async function body(req) {
  try { return await req.json(); } catch { return {}; }
}

export const clean = (v, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v || "");

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function clientIp(req, context) {
  return context?.ip || req.headers.get("x-nf-client-connection-ip") || req.headers.get("x-forwarded-for") || "";
}

// Fehler abfangen und als JSON zurückgeben
export const handler = (fn) => async (req, context) => {
  try { return await fn(req, context); }
  catch (e) {
    if (!e.status) console.error(e);
    return json({ error: e.stripe?.message || e.message || "Unbekannter Fehler" }, e.status || 500);
  }
};

export class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }

// "1.500,50 €" → 150050 (Cent)
export function parseBetrag(v) {
  const n = Number(String(v ?? "").replace(/\s|€/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return isFinite(n) && String(v ?? "").trim() !== "" ? Math.round(n * 100) : NaN;
}
