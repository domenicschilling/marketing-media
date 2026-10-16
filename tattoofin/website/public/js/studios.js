// Kampagnen-Landingpage /studios: UTM-Parameter an „Jetzt starten“ weitergeben und
// Klick auf „Starten“ oder WhatsApp als Meta-Ereignis „Lead“ messen (Optimierungsziel der Kampagne).
// Einwilligung wie überall über tf-track.js: ohne „Einverstanden“ wird nichts gesendet.
// Mit Einwilligung zusätzlich serverseitig über /api/capi (in tf-track.js, gleiche event_id → Meta dedupliziert).
(function () {
  var j = document.getElementById("jahr");
  if (j) j.textContent = new Date().getFullYear();

  // utm_* / fbclid an die Start-Links hängen (Herkunft bleibt sichtbar)
  var q = new URLSearchParams(location.search), mit = [];
  q.forEach(function (v, k) { if (/^utm_|^fbclid$/.test(k)) mit.push([k, v]); });
  if (mit.length) document.querySelectorAll('a[data-lp="start"]').forEach(function (a) {
    var u = new URL(a.getAttribute("href"), location.origin);
    mit.forEach(function (p) { if (!u.searchParams.has(p[0])) u.searchParams.set(p[0], p[1]); });
    a.setAttribute("href", u.pathname + u.search);
  });

  function consent() { try { return localStorage.getItem("tf_consent"); } catch (e) { return null; } }
  function schonGezaehlt(key) {
    try { if (localStorage.getItem("tf_ev_" + key)) return true; localStorage.setItem("tf_ev_" + key, "1"); } catch (e) {}
    return false;
  }

  function lead(art, a) {
    if (consent() === "nein" || schonGezaehlt("lp-lead-" + new Date().toISOString().slice(0, 10))) return;
    // Banner noch offen und Klick auf „Starten“: Die Seite wechselt sofort, der vorgemerkte Lead ginge verloren.
    // Deshalb als ?tf_lead=start mitgeben – /start.html sendet ihn, sobald dort „Einverstanden“ geklickt wird.
    if (consent() !== "ja" && art === "start") {
      var u = new URL(a.getAttribute("href"), location.origin);
      u.searchParams.set("tf_lead", "start");
      a.setAttribute("href", u.pathname + u.search);
      return;
    }
    // Sonst über tf-track.js: mit Einwilligung sofort (Pixel + Server-Kopie), sonst vorgemerkt bis zur Zustimmung
    if (window.TFTrack) window.TFTrack.track("Lead", { content_name: art === "whatsapp" ? "WhatsApp (Kampagnen-Seite)" : "Jetzt starten (Kampagnen-Seite)", content_category: "Tattoo-Studio" });
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var h = a.getAttribute("href") || "";
    if (a.dataset.lp === "start" || /^\/start(\.html)?(\?|$)/.test(h)) lead("start", a);
    else if (/wa\.me|api\.whatsapp\.com/.test(h)) lead("whatsapp", a);
  }, true);
})();
