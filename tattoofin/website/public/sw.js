// Service Worker der Tattoofin-Studio-App: hält die App-Hülle (Seite, Styles, Skripte, Schrift, Icons) offline bereit.
// Daten (/api/…) und Stripe werden NIE zwischengespeichert: Zahlungen und Beträge kommen immer frisch vom Server.
// Später für eine native App (z. B. Capacitor-Hülle) wiederverwendbar: gleiche Seite, gleiche API.
var VERSION = "tf-app-1";
var HUELLE = ["/app.html", "/css/site.css", "/css/app.css", "/css/fonts.css", "/js/common.js", "/js/app.js", "/js/app-kit.js", "/js/stripe-bausteine.js", "/js/qrcode.min.js",
  "/assets/figur.png", "/assets/fonts/DMSans.woff2", "/assets/fonts/LuckiestGuy.woff2", "/assets/fonts/TitanOne.woff2", "/assets/app/icon-192.png", "/offline.html"];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(HUELLE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || u.pathname.startsWith("/api/")) return;
  // Seiten: erst Netz (immer aktuell), offline aus dem Speicher bzw. Offline-Seite
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(function () {
      return caches.match(u.pathname === "/app" ? "/app.html" : u.pathname).then(function (r) { return r || caches.match("/offline.html"); });
    }));
    return;
  }
  // Dateien der App-Hülle: aus dem Speicher, im Hintergrund auffrischen
  if (HUELLE.indexOf(u.pathname) >= 0) {
    e.respondWith(caches.open(VERSION).then(function (c) {
      return c.match(e.request).then(function (r) {
        var netz = fetch(e.request).then(function (n) { if (n.ok) c.put(e.request, n.clone()); return n; }).catch(function () { return r; });
        return r || netz;
      });
    }));
  }
});
