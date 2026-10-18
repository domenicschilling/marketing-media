// Lokaler Stripe-Nachbau als HTTP-Server (für dev/server.mjs und dev/e2e.mjs).
// Die eigentliche Logik steckt in netlify/functions/_lib/stripe-sim.mjs (dieselbe Simulation läuft auf der Vorschau-Site).
//   /v1/…           REST-API          /pay/<cs>, /onboard/<acct>, /express/<acct>, /invoice   Seiten
//   /onboarding-fertig/<acct>, /bestaetigen   Aktionen der eingebetteten Simulation
//   /mock/state | dispute/<pi> | refund/<pi> | pay-invoice/<in> | fail-invoice/<in>         Test-Hilfen
import http from "node:http";
import { createSim, leereDb, nest, sendeWebhook } from "../netlify/functions/_lib/stripe-sim.mjs";

export function startStripeMock({ port = 12111, webhookUrl, webhookSecret, log = () => {} }) {
  const db = leereDb();
  const sim = createSim({
    load: async () => db, save: async () => {}, pageBase: `http://localhost:${port}`,
    webhook: async (type, object, account) => { const st = await sendeWebhook(webhookUrl, webhookSecret, type, object, account); log(`[stripe-mock] webhook ${type} → ${st}`); return st; },
  });

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://x");
    let raw = "";
    for await (const c of req) raw += c;
    // Datei-Upload (multipart, z. B. Branding-Logo): nur Größe/Zweck merken, Datei-ID zurückgeben
    if (url.pathname === "/v1/files" && (req.headers["content-type"] || "").startsWith("multipart/")) {
      const purpose = (/name="purpose"\r\n\r\n([^\r]+)/.exec(raw) || [])[1] || "";
      db.files = db.files || [];
      const f = { id: "file_mock_" + (db.files.length + 1), object: "file", purpose, size: raw.length, account: req.headers["stripe-account"] || null };
      db.files.push(f);
      res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify(f));
    }
    const isJson = (req.headers["content-type"] || "").includes("json");
    const p = isJson ? (raw ? JSON.parse(raw) : {}) : nest(new URLSearchParams(raw));
    const send = (code, obj, type = "application/json") => { res.writeHead(code, { "content-type": type }); res.end(type === "application/json" ? JSON.stringify(obj) : obj); };
    const parts = url.pathname.split("/").filter(Boolean);
    try {
      if (parts[0] === "mock") return send(200, await sim.mock(parts.slice(1), url.searchParams));
      if (parts[0] !== "v1") {
        const r = await sim.page(req.method, parts, p, url.searchParams);
        if (r.redirect) { res.writeHead(303, { Location: r.redirect }); return res.end(); }
        if (r.html) return send(r.status || 200, r.html, "text/html; charset=utf-8");
        if (r.json) return send(r.status || 200, r.json);
        return send(r.status || 404, r.text || "", "text/plain");
      }
      log(`[stripe-mock] ${req.method} ${url.pathname}`);
      const q = req.method === "GET" ? nest(url.searchParams) : p;
      return send(200, await sim.call(req.method, url.pathname.slice(3), q, { account: req.headers["stripe-account"], idempotencyKey: req.headers["idempotency-key"] }));
    } catch (e) {
      return send(e.status || 500, { error: { message: e.message } });
    }
  });
  return new Promise((ok) => server.listen(port, () => ok({ server, db })));
}
