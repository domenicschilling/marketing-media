// Lokaler Entwicklungsserver: statische Seiten + Netlify Functions (v2) + optional Stripe-Mock.
//   node dev/server.mjs             → http://localhost:8888 mit Stripe-Mock auf :12111
//   STRIPE_SECRET_KEY=sk_test_… node dev/server.mjs   → echtes Stripe (Testmodus)
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = Number(process.env.PORT || 8888);

export async function startDev({ port = PORT, mock = !process.env.STRIPE_SECRET_KEY, dataDir, quiet = false } = {}) {
  const log = quiet ? () => {} : console.log;
  process.env.SITE_URL = `http://localhost:${port}`;
  process.env.DATA_DIR = dataDir || path.join(root, ".data");
  process.env.ADMIN_TOKEN = process.env.ADMIN_TOKEN || "admin";
  process.env.SESSION_SECRET = process.env.SESSION_SECRET || "dev-session-secret";
  if (mock) {
    process.env.STRIPE_SECRET_KEY = "sk_test_mock";
    process.env.STRIPE_API_BASE = "http://localhost:12111";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_mock";
    const { startStripeMock } = await import("./stripe-mock.mjs");
    await startStripeMock({ port: 12111, webhookUrl: `http://localhost:${port}/api/stripe-webhook`, webhookSecret: "whsec_mock", log });
    log("Stripe-Mock auf http://localhost:12111");
  }

  // Funktionen laden und Pfade registrieren
  const dir = path.join(root, "netlify", "functions");
  const routes = [];
  for (const f of await fs.readdir(dir)) {
    if (!f.endsWith(".mjs")) continue;
    const mod = await import(pathToFileURL(path.join(dir, f)).href);
    const paths = [].concat(mod.config?.path || []);
    for (const p of paths) routes.push({ re: new RegExp("^" + p.replace(/\*/g, ".*") + "$"), fn: mod.default, name: f });
  }

  const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".png": "image/png", ".woff2": "font/woff2", ".mp4": "video/mp4", ".json": "application/json", ".svg": "image/svg+xml" };

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    const route = routes.find((r) => r.re.test(url.pathname));
    if (route) {
      let body = Buffer.alloc(0);
      for await (const c of req) body = Buffer.concat([body, c]);
      const request = new Request(url, { method: req.method, headers: req.headers, body: ["GET", "HEAD"].includes(req.method) ? undefined : body });
      try {
        const r = await route.fn(request, { ip: "127.0.0.1", params: {} });
        const headers = {};
        r.headers.forEach((v, k) => { if (k !== "set-cookie") headers[k] = v; });
        const cookies = r.headers.getSetCookie ? r.headers.getSetCookie() : [];
        if (cookies.length) headers["set-cookie"] = cookies;
        res.writeHead(r.status, headers);
        res.end(Buffer.from(await r.arrayBuffer()));
      } catch (e) { console.error(e); res.writeHead(500); res.end(String(e)); }
      return;
    }
    let p = path.join(root, "public", decodeURIComponent(url.pathname));
    if (url.pathname.endsWith("/")) p = path.join(p, "index.html");
    try {
      const data = await fs.readFile(p);
      res.writeHead(200, { "content-type": types[path.extname(p)] || "application/octet-stream" });
      res.end(data);
    } catch { res.writeHead(404, { "content-type": "text/plain" }); res.end("404"); }
  });
  await new Promise((ok) => server.listen(port, ok));
  log(`Website auf http://localhost:${port}  (Admin-Token: ${process.env.ADMIN_TOKEN})`);
  return server;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) startDev();
