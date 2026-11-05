// Ultron – Service-Worker: zeigt Push-Nachrichten an und öffnet beim Antippen die passende Stelle der App.
// Speichert keine Daten (die Lage bleibt verschlüsselt in lage.json).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { text: e.data ? e.data.text() : "" }; }
  e.waitUntil(self.registration.showNotification(d.titel || "Ultron", {
    body: d.text || "Ultron hat etwas für dich.",
    icon: "ultron-192.png",
    badge: "ultron-192.png",
    tag: d.ziel || "ultron",
    renotify: true,
    data: { ziel: d.ziel || "start" },
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const ziel = new URL(`./#${e.notification.data?.ziel || "start"}`, self.registration.scope).href;
  e.waitUntil((async () => {
    const offen = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of offen) { if (c.url.startsWith(self.registration.scope)) { await c.focus(); c.postMessage({ ziel: e.notification.data?.ziel || "start" }); return; } }
    await self.clients.openWindow(ziel);
  })());
});
