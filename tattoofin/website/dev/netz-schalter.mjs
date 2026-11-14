// Vorschalt-Proxy für UI-Tests: leitet localhost:8890 → localhost:8888 weiter. /__netz/aus trennt jede App-Anfrage (Netz weg), /__netz/an wieder an.
import http from "node:http";
let an = true;
http.createServer((req, res) => {
  if (req.url.startsWith("/__netz/")) { an = req.url.endsWith("/an"); res.end(JSON.stringify({ an })); console.log("netz", an ? "an" : "aus"); return; }
  if (!an) { req.socket.destroy(); return; }
  const p = http.request({ host: "127.0.0.1", port: 8888, path: req.url, method: req.method, headers: req.headers }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  p.on("error", () => req.socket.destroy());
  req.pipe(p);
}).listen(8890, () => console.log("netz-schalter 8890 → 8888"));
