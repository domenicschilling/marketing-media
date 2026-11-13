// Nachbau des Apple Push Notification Service (APNs) für lokale Tests: HTTP/2 ohne TLS (h2c) auf localhost.
// Der Server (_lib/push.mjs) spricht ihn an, wenn APNS_HOST_SANDBOX/APNS_HOST_PRODUCTION auf http://localhost:<port> zeigen.
// Der Test-Schlüssel (EC P-256) entsteht nur zur Laufzeit und wird nirgends gespeichert.
//   const n = await startApnsNachbau({ antwort: (push) => ({ status: 200 }) });   n.empfangen = alle Pushes (token, headers, payload, jwtOk)
import http2 from "node:http2";
import crypto from "node:crypto";

export function testSchluessel() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("ec", { namedCurve: "prime256v1" });
  return { pem: privateKey.export({ type: "pkcs8", format: "pem" }), publicKey };
}

// ES256-JWT prüfen (Signatur ieee-p1363, kid, iss)
export function jwtPruefen(jwt, publicKey, { keyId, teamId } = {}) {
  try {
    const [h, c, sig] = String(jwt || "").split(".");
    const kopf = JSON.parse(Buffer.from(h, "base64url").toString()), claims = JSON.parse(Buffer.from(c, "base64url").toString());
    const ok = crypto.verify("sha256", Buffer.from(`${h}.${c}`), { key: publicKey, dsaEncoding: "ieee-p1363" }, Buffer.from(sig, "base64url"));
    return ok && kopf.alg === "ES256" && (!keyId || kopf.kid === keyId) && (!teamId || claims.iss === teamId) && Number.isInteger(claims.iat);
  } catch { return false; }
}

export async function startApnsNachbau({ port = 0, antwort = () => ({ status: 200 }), publicKey = null, keyId, teamId, log = () => {} } = {}) {
  const empfangen = [];
  const server = http2.createServer();
  server.on("stream", (stream, headers) => {
    let text = "";
    stream.setEncoding("utf8");
    stream.on("data", (c) => { text += c; });
    stream.on("end", async () => {
      const token = String(headers[":path"] || "").replace(/^\/3\/device\//, "");
      let payload = {};
      try { payload = JSON.parse(text || "{}"); } catch { /* leer */ }
      const jwt = String(headers.authorization || "").replace(/^bearer /i, "");
      const push = { token, payload, am: Date.now(), headers: { topic: headers["apns-topic"], typ: headers["apns-push-type"], prioritaet: headers["apns-priority"], collapseId: headers["apns-collapse-id"] }, jwtOk: publicKey ? jwtPruefen(jwt, publicKey, { keyId, teamId }) : null };
      empfangen.push(push);
      let r = { status: 200 };
      try { r = (await antwort(push)) || r; } catch { /* Standard */ }
      log(`[apns-nachbau] ${r.status} ${token.slice(0, 8)}… ${payload?.aps?.alert?.title || ""}: ${payload?.aps?.alert?.body || ""}`);
      stream.respond({ ":status": r.status, "apns-id": crypto.randomUUID(), "content-type": "application/json" });
      stream.end(r.status === 200 ? "" : JSON.stringify({ reason: r.grund || "" }));
    });
  });
  await new Promise((ok) => server.listen(port, "127.0.0.1", ok));
  const p = server.address().port;
  return { server, port: p, url: `http://127.0.0.1:${p}`, empfangen, schliessen: () => new Promise((ok) => server.close(ok)) };
}
