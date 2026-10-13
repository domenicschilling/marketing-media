// Kampagnen-Landingpage /studios: UTM-Parameter an „Jetzt starten“ weitergeben und
// Klick auf „Starten“ oder WhatsApp als Meta-Ereignis „Lead“ messen (Optimierungsziel der Kampagne).
// Einwilligung wie überall über tf-track.js: ohne „Einverstanden“ wird nichts gesendet.
// Mit Einwilligung zusätzlich serverseitig über /api/capi (gleiche event_id → Meta dedupliziert).
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
  function cookie(n) { var m = document.cookie.match("(?:^|; )" + n + "=([^;]*)"); return m ? decodeURIComponent(m[1]) : ""; }
  function schonGezaehlt(key) {
    try { if (localStorage.getItem("tf_ev_" + key)) return true; localStorage.setItem("tf_ev_" + key, "1"); } catch (e) {}
    return false;
  }

  function lead(art) {
    if (schonGezaehlt("lp-lead-" + new Date().toISOString().slice(0, 10))) return;
    var params = { content_name: art === "whatsapp" ? "WhatsApp (Kampagnen-Seite)" : "Jetzt starten (Kampagnen-Seite)", content_category: "Tattoo-Studio" };
    // Pixel geladen (Einwilligung liegt vor): direkt senden + Server-Kopie
    if (consent() === "ja" && window.fbq) {
      var id = "tf-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
      window.fbq("track", "Lead", params, { eventID: id });
      try {
        var fbc = cookie("_fbc") || (q.get("fbclid") ? "fb.1." + Date.now() + "." + q.get("fbclid") : "");
        fetch("/api/capi", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event_name: "Lead", event_id: id, url: location.href.split("#")[0], fbp: cookie("_fbp"), fbc: fbc, content_name: params.content_name }) }).catch(function () {});
      } catch (e) {}
    } else if (window.TFTrack) {
      // Banner noch offen: vormerken, wird bei Zustimmung gesendet (bei Ablehnung verworfen)
      window.TFTrack.track("Lead", params);
    }
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var h = a.getAttribute("href") || "";
    if (a.dataset.lp === "start" || /^\/start(\.html)?(\?|$)/.test(h)) lead("start");
    else if (/wa\.me|api\.whatsapp\.com/.test(h)) lead("whatsapp");
  }, true);
})();
