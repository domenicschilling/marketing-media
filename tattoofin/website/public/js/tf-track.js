// Tattoofin: Cookie-Einwilligung, Meta-Pixel (nur nach Zustimmung) und WhatsApp-Button.
// Nur auf Seiten für Studios einbinden, NIE auf den Zahlseiten der Endkunden (zahlen, zahlung, bezahlt) oder im Portal.
// Events: PageView (jede Seite) · Contact (WhatsApp-Klick) · Lead (Muster-Anzahlungsbedingungen) ·
//         InitiateCheckout (start.html, erster Schritt weiter) · CompleteRegistration (Provision abgeschlossen) · Purchase (Kauf bezahlt)
// Lead, CompleteRegistration und Purchase gehen mit Einwilligung zusätzlich über /api/capi (Conversions API).
window.TFTrack = (function () {
  var PIXEL_ID = "1628016302128524";
  var WA_NUMMER = "491624502375", WA_ANZEIGE = "0162 4502375";
  var WA_TEXT = "Hi, ich habe eine Frage zu Tattoofin für mein Studio.";
  var KEY = "tf_consent";
  var queue = [], geladen = false;
  // Nur auf der echten Domain an Meta senden – Vorschau-Adressen (Netlify-Entwürfe) und lokale Tests zählen nie mit
  var ECHT = location.hostname === "tattoofin.de";

  function lies() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function speichere(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }
  // Diese Ereignisse gehen mit Einwilligung zusätzlich über unseren Server an Meta (gleiche event_id → keine Doppelzählung)
  var CAPI = { Lead: 1, CompleteRegistration: 1, Purchase: 1 };
  function cookie(n) { var m = document.cookie.match("(?:^|; )" + n + "=([^;]*)"); return m ? decodeURIComponent(m[1]) : ""; }
  function capi(name, params, id, nurPixel) {
    if (!CAPI[name] || nurPixel || !ECHT) return;
    try {
      var fbclid = new URLSearchParams(location.search).get("fbclid");
      var p = params || {};
      fetch("/api/capi", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_name: name, event_id: id, url: location.href.split("#")[0], fbp: cookie("_fbp"),
          fbc: cookie("_fbc") || (fbclid ? "fb.1." + Date.now() + "." + fbclid : ""), content_name: p.content_name, value: p.value, currency: p.currency }) }).catch(function () {});
    } catch (e) {}
  }
  function sende(name, params, id, nurPixel) { window.fbq("track", name, params || {}, { eventID: id }); capi(name, params, id, nurPixel); }
  function eventId() { return "tf-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8); }

  function ladePixel() {
    if (geladen || !/^\d{10,20}$/.test(PIXEL_ID)) return;
    if (!ECHT) { if (window.console) console.info("[Tattoofin] Vorschau: Meta-Pixel bleibt aus (nur auf tattoofin.de aktiv)."); return; }
    geladen = true;
    /* eslint-disable */
    !function (f, b, e, v, n, t, s) { if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); }; if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = []; t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s); }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    /* eslint-enable */
    window.fbq("init", PIXEL_ID);
    window.fbq("track", "PageView", {}, { eventID: eventId() });
    queue.splice(0).forEach(function (a) { sende(a[0], a[1], a[2], a[3]); });
  }

  // Event senden (oder vormerken, bis zugestimmt wurde). once: Schlüssel, damit z. B. ein Kauf beim Neuladen nicht doppelt zählt.
  // opt.id: eigene event_id (z. B. wenn der Server dasselbe Ereignis meldet), opt.nurPixel: keine Server-Kopie über /api/capi
  function track(name, params, once, opt) {
    opt = opt || {};
    if (once) { try { if (localStorage.getItem("tf_ev_" + once)) return; localStorage.setItem("tf_ev_" + once, "1"); } catch (e) {} }
    var id = opt.id || eventId();
    if (geladen && window.fbq) sende(name, params, id, opt.nurPixel);
    else if (lies() !== "nein") queue.push([name, params, id, opt.nurPixel]);
  }

  var CSS = ".tf-cc{position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;max-width:560px;margin:0 auto;background:#fff;color:#1f3d5c;border:3px solid #1f3d5c;border-radius:18px;box-shadow:6px 6px 0 #1f3d5c;padding:16px 18px;font:15px/1.45 'DM Sans',system-ui,sans-serif}" +
    ".tf-cc b{display:block;font-size:16px;margin-bottom:4px}.tf-cc a{color:#1f3d5c}" +
    ".tf-cc .r{display:flex;gap:10px;margin-top:12px;flex-wrap:wrap}" +
    ".tf-cc button{flex:1;min-width:140px;border:3px solid #1f3d5c;border-radius:99px;padding:10px 14px;font:700 15px 'DM Sans',system-ui,sans-serif;cursor:pointer;background:#fff;color:#1f3d5c}" +
    ".tf-cc button.ja{background:#1f3d5c;color:#fbb316}" +
    ".tf-wa{position:fixed;right:16px;bottom:16px;z-index:9998;display:flex;align-items:center;gap:8px;background:#25d366;color:#fff;text-decoration:none;border:3px solid #1f3d5c;border-radius:99px;box-shadow:4px 4px 0 #1f3d5c;padding:10px 16px 10px 12px;font:700 15px 'DM Sans',system-ui,sans-serif}" +
    ".tf-wa svg{width:24px;height:24px;flex:none}.tf-wa small{display:block;font-weight:500;font-size:11px;opacity:.9}" +
    "@media (max-width:600px){.tf-wa span{display:none}.tf-wa{padding:12px}}" +
    "body.tf-cc-offen .tf-wa{display:none}.tf-cc .kurz{display:none}" +
    // Platz unter dem Seitenende, damit das Fenster keine Knöpfe (z. B. „Weiter“ auf /start) verdeckt
    "body.tf-cc-offen{padding-bottom:190px}@media (max-width:600px){body.tf-cc-offen{padding-bottom:150px}}" +
    // Am großen Bildschirm unten rechts statt mittig, damit der Hauptknopf links frei bleibt
    "@media (min-width:1000px){.tf-cc{left:auto;right:20px;bottom:20px;max-width:430px;margin:0}}" +
    "@media (max-width:600px){.tf-cc{left:8px;right:8px;bottom:8px;padding:10px 12px;font-size:13.5px;line-height:1.4;box-shadow:4px 4px 0 #1f3d5c;border-width:2px}" +
    ".tf-cc b{display:none}.tf-cc .lang{display:none}.tf-cc .kurz{display:inline}" +
    ".tf-cc .r{margin-top:8px;gap:8px;flex-wrap:nowrap}.tf-cc button{min-width:0;padding:8px 6px;font-size:14px;border-width:2px}}";

  function banner() {
    if (document.querySelector(".tf-cc")) return;
    var d = document.createElement("div");
    d.className = "tf-cc"; d.setAttribute("role", "dialog"); d.setAttribute("aria-label", "Cookie-Einstellungen");
    d.innerHTML = "<b>Cookies für unsere Werbung</b><span class=\"kurz\">Dürfen wir mit dem Meta-Pixel messen, ob unsere Werbung wirkt? Nur mit deiner Zustimmung. </span><span class=\"lang\">Wir möchten mit dem Meta-Pixel messen, ob unsere Anzeigen auf Facebook und Instagram funktionieren. Dafür setzen wir Cookies, aber nur mit deiner Zustimmung. Du kannst sie jederzeit im Fußbereich widerrufen. </span><a href=\"/datenschutz.html#meta\">Mehr erfahren</a>" +
      "<div class=\"r\"><button type=\"button\" class=\"nein\">Nur notwendige</button><button type=\"button\" class=\"ja\">Einverstanden</button></div>";
    document.body.appendChild(d);
    document.body.classList.add("tf-cc-offen");
    d.querySelector(".ja").onclick = function () { speichere("ja"); schliesse(); ladePixel(); };
    d.querySelector(".nein").onclick = function () { speichere("nein"); queue.length = 0; schliesse(); };
    function schliesse() { d.remove(); document.body.classList.remove("tf-cc-offen"); }
  }

  function waLink() { return "https://wa.me/" + WA_NUMMER + "?text=" + encodeURIComponent(WA_TEXT); }
  function waButton() {
    if (document.body.dataset.wa === "aus" || document.querySelector(".tf-wa")) return;
    var a = document.createElement("a");
    a.className = "tf-wa"; a.href = waLink(); a.target = "_blank"; a.rel = "noopener";
    a.setAttribute("aria-label", "Fragen per WhatsApp: " + WA_ANZEIGE);
    a.innerHTML = "<svg viewBox=\"0 0 32 32\" aria-hidden=\"true\"><path fill=\"#fff\" d=\"M16 3a13 13 0 0 0-11.3 19.4L3 29l6.8-1.8A13 13 0 1 0 16 3zm0 23.7c-2 0-3.9-.5-5.6-1.5l-.4-.2-4 1 1.1-3.9-.3-.4A10.7 10.7 0 1 1 16 26.7zm5.9-8c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2l-1 1.2c-.2.2-.4.2-.7.1a8.8 8.8 0 0 1-4.4-3.8c-.3-.6.3-.5 1-1.7.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8s1.2 3.2 1.4 3.4c.2.2 2.4 3.6 5.7 5 2.1.9 2.9 1 4 .8.6-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5l-.6-.3z\"/></svg>" +
      "<span>Fragen? WhatsApp<small>" + WA_ANZEIGE + " · nur Nachrichten</small></span>";
    document.body.appendChild(a);
  }

  function init() {
    var st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
    waButton();
    // Klicks: WhatsApp → Contact, Muster-Anzahlungsbedingungen → Lead
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a[href]");
      if (!a) return;
      var h = a.getAttribute("href") || "";
      if (/wa\.me|api\.whatsapp\.com/.test(h)) track("Contact", { content_name: "WhatsApp" });
      else if (/muster-anzahlungsbedingungen|\/anzahlung(\?|$)/.test(h)) track("Lead", { content_name: "Muster-Anzahlungsbedingungen" });
    }, true);
    // „Cookie-Einstellungen“-Links im Fußbereich öffnen das Banner wieder
    document.querySelectorAll("[data-cookies]").forEach(function (l) { l.addEventListener("click", function (e) { e.preventDefault(); banner(); }); });
    try {
      var u = new URL(location.href), vorgemerkt = u.searchParams.get("tf_lead");
      if (vorgemerkt) {
        u.searchParams.delete("tf_lead"); history.replaceState(null, "", u.pathname + u.search + u.hash);
        track("Lead", { content_name: vorgemerkt === "whatsapp" ? "WhatsApp (Kampagnen-Seite)" : "Jetzt starten (Kampagnen-Seite)", content_category: "Tattoo-Studio" });
      }
    } catch (e) {}
    var c = lies();
    if (c === "ja") ladePixel();
    else if (c !== "nein") banner();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  return { track: track, waLink: waLink, wa: WA_ANZEIGE, banner: banner, eventId: eventId, einwilligung: lies, cookie: cookie };
})();
