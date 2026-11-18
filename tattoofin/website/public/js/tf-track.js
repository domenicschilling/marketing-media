// Tattoofin: Cookie-Einwilligung, Meta-Pixel (nur nach Zustimmung) und WhatsApp-Button.
// Nur auf Seiten für Studios einbinden, NIE auf den Zahlseiten der Endkunden (zahlen, zahlung, bezahlt) oder im Portal.
// Events: PageView (jede Seite) · Contact (WhatsApp-Klick) · Lead (Muster-Anzahlungsbedingungen, Anmeldeseite geöffnet) ·
//         InitiateCheckout (start.html, beim Absenden „Weiter zur Zahlung“, seit 16.11.2026) · CompleteRegistration (Provision abgeschlossen) · StartTrial (Testwoche gestartet, seit 17.11.2026) · Purchase (Kauf bezahlt)
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
  var CAPI = { Lead: 1, CompleteRegistration: 1, Purchase: 1, StartTrial: 1 };
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
  track.mem = {};
  function track(name, params, once, opt) {
    opt = opt || {};
    // Merker im Browser-Speicher erst mit Einwilligung (§ 25 TDDDG); ohne Einwilligung nur für diese Seite merken
    if (once) {
      try { if (localStorage.getItem("tf_ev_" + once)) return; } catch (e) {}
      if (track.mem[once]) return; track.mem[once] = 1;
      if (lies() === "ja") { try { localStorage.setItem("tf_ev_" + once, "1"); } catch (e) {} }
    }
    var id = opt.id || eventId();
    if (geladen && window.fbq) sende(name, params, id, opt.nurPixel);
    else if (lies() !== "nein") queue.push([name, params, id, opt.nurPixel]);
  }

  var CSS = ".tf-cc{position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;max-width:560px;margin:0 auto;background:#fff;color:#1f3d5c;border:3px solid #1f3d5c;border-radius:14px;box-shadow:4px 5px 0 #1f3d5c;padding:16px 18px;font:16px/1.45 'DM Sans',system-ui,sans-serif}" +
    ".tf-cc b{display:block;font-size:16px;margin-bottom:4px}.tf-cc a{color:#1f3d5c}" +
    ".tf-cc .r{display:flex;gap:10px;margin-top:12px;flex-wrap:wrap}" +
    ".tf-cc button{flex:1;min-width:140px;border:3px solid #1f3d5c;border-radius:999px;padding:10px 14px;font:700 16px 'DM Sans',system-ui,sans-serif;cursor:pointer;background:#fff;color:#1f3d5c}" +
    ".tf-cc button.ja{background:#fff;color:#1f3d5c}" +
    ".tf-wa{position:fixed;right:16px;bottom:16px;z-index:9998;display:flex;align-items:center;gap:8px;background:#25d366;color:#0f2236;text-decoration:none;border:3px solid #1f3d5c;border-radius:999px;box-shadow:4px 5px 0 #1f3d5c;padding:10px 16px 10px 12px;font:700 16px 'DM Sans',system-ui,sans-serif}" +
    ".tf-wa svg{width:24px;height:24px;flex:none}.tf-wa small{display:block;font-weight:500;font-size:12px}" +
    "@media (max-width:600px){.tf-wa span{display:none}.tf-wa{padding:12px}}" +
    "body.tf-cc-offen .tf-wa{display:none}.tf-cc .kurz{display:none}" +
    // Platz unter dem Seitenende, damit das Fenster keine Knöpfe (z. B. „Weiter“ auf /start) verdeckt
    "body.tf-cc-offen{padding-bottom:190px}@media (max-width:600px){body.tf-cc-offen{padding-bottom:150px}}" +
    // Am großen Bildschirm unten rechts statt mittig, damit der Hauptknopf links frei bleibt
    "@media (min-width:1000px){.tf-cc{left:auto;right:20px;bottom:20px;max-width:430px;margin:0}}" +
    "@media (max-width:600px){.tf-cc{left:max(8px,env(safe-area-inset-left));right:max(8px,env(safe-area-inset-right));bottom:max(8px,env(safe-area-inset-bottom));padding:8px 10px;font-size:14px;line-height:1.35;box-shadow:3px 3px 0 #1f3d5c;border-width:2px;border-radius:14px}" +
    ".tf-cc b{display:none}.tf-cc .lang{display:none}.tf-cc .kurz{display:inline}" +
    // beide Knöpfe gleich groß und gleich gestaltet (kein Dark Pattern)
    ".tf-cc .r{margin-top:6px;gap:8px;flex-wrap:nowrap}.tf-cc button,.tf-cc button.ja{min-width:0;padding:7px 6px;font-size:14px;border-width:2px;background:#fff;color:#1f3d5c}}" +
    // Handy quer / sehr niedrige Fenster: Text links, Knöpfe rechts in einer Zeile (statt halber Bildschirm); Platz für die Sicherheitsränder (Notch)
    // Tablet (16.11.2026): flache Leiste statt großem Kasten, damit Knopf und Preis im ersten Bildschirm frei bleiben
    "@media (min-width:601px) and (max-width:999px){.tf-cc{max-width:none;margin:0;left:max(10px,env(safe-area-inset-left));right:max(10px,env(safe-area-inset-right));bottom:max(10px,env(safe-area-inset-bottom));display:flex;align-items:center;gap:14px;padding:8px 12px;font-size:14px;line-height:1.35;border-width:2px;box-shadow:3px 3px 0 #1f3d5c;border-radius:14px}" +
    ".tf-cc b,.tf-cc .lang{display:none}.tf-cc .kurz{display:inline}.tf-cc .r{margin:0;flex:none;flex-wrap:nowrap}.tf-cc button{flex:none;min-width:0;padding:8px 14px;font-size:14px;border-width:2px}body.tf-cc-offen{padding-bottom:84px}}" +
    // Anmeldung /start (einfache Anmeldung 16.11.2026): Der Hinweis weicht aus, solange er irgendeinen Teil des Formulars (Felder, Häkchen, Knopf) verdecken würde
    ".tf-cc.tf-cc-weg{visibility:hidden;transform:translateY(120%)}.tf-cc{transition:transform .18s ease}" +
    // Auf /start auch am großen Bildschirm eine flache Leiste unten (statt Kasten rechts, der dort über dem Formular läge)
    "@media (min-width:1000px){body.anm-seite .tf-cc{left:20px;right:20px;bottom:16px;max-width:none;margin:0;display:flex;align-items:center;gap:16px;padding:8px 14px;font-size:14px;line-height:1.35;border-width:2px;box-shadow:3px 3px 0 #1f3d5c;border-radius:14px}" +
    "body.anm-seite .tf-cc b,body.anm-seite .tf-cc .lang{display:none}body.anm-seite .tf-cc .kurz{display:inline}body.anm-seite .tf-cc .r{margin:0 0 0 auto;flex:none;flex-wrap:nowrap}body.anm-seite .tf-cc button{flex:none;min-width:0;padding:8px 16px;font-size:14px;border-width:2px}body.anm-seite.tf-cc-offen{padding-bottom:84px}}" +
    "@media (max-height:520px) and (min-width:601px){.tf-cc{max-width:none;margin:0;left:max(8px,env(safe-area-inset-left));right:max(8px,env(safe-area-inset-right));bottom:max(8px,env(safe-area-inset-bottom));display:flex;align-items:center;gap:14px;padding:8px 12px;font-size:14px;line-height:1.35}" +
    ".tf-cc b,.tf-cc .lang{display:none}.tf-cc .kurz{display:inline}.tf-cc .r{margin:0;flex:none;flex-wrap:nowrap}.tf-cc button{flex:none;min-width:0;padding:8px 14px;font-size:14px;border-width:2px}body.tf-cc-offen{padding-bottom:84px}}" +
    // Beide Knöpfe immer exakt gleich groß (auch in der flachen Leiste, wo die Texte unterschiedlich lang sind)
    ".tf-cc .r{display:grid;grid-template-columns:1fr 1fr}.tf-cc .r button{width:100%;min-width:0}";

  function banner() {
    if (document.querySelector(".tf-cc")) return;
    var d = document.createElement("div");
    d.className = "tf-cc"; d.setAttribute("role", "dialog"); d.setAttribute("aria-label", "Cookie-Einstellungen");
    d.innerHTML = "<b>Cookies für unsere Werbung</b><span class=\"kurz\">Meta-Pixel zur Werbemessung, nur mit deiner Zustimmung. </span><span class=\"lang\">Wir möchten mit dem Meta-Pixel messen, ob unsere Anzeigen auf Facebook und Instagram funktionieren. Dafür setzen wir Cookies, aber nur mit deiner Zustimmung. Du kannst sie jederzeit im Fußbereich widerrufen. </span><a href=\"/datenschutz.html#meta\">Mehr&nbsp;erfahren</a>" +
      "<div class=\"r\"><button type=\"button\" class=\"nein\">Nur notwendige</button><button type=\"button\" class=\"ja\">Einverstanden</button></div>";
    document.body.appendChild(d);
    document.body.classList.add("tf-cc-offen");
    // Höhe des Hinweises (inkl. Abstand unten) als CSS-Variable: feste Leisten der Seite (z. B. .leiste) rutschen darüber statt verdeckt zu werden
    function hoehe() { try { document.body.style.setProperty("--tf-cc-h", Math.ceil(window.innerHeight - d.getBoundingClientRect().top - 2) + "px"); } catch (e) {} }
    hoehe(); window.addEventListener("resize", hoehe);
    d.querySelector(".ja").onclick = function () { speichere("ja"); schliesse(); ladePixel(); };
    d.querySelector(".nein").onclick = function () { speichere("nein"); queue.length = 0; schliesse(); };
    function schliesse() { d.remove(); document.body.classList.remove("tf-cc-offen"); document.body.style.removeProperty("--tf-cc-h"); window.removeEventListener("resize", hoehe); ausweichenAus(); }
    if (ANMELDUNG || HERO) ausweichenAn(d);
  }

  // Auf /start (alle Größen): Würde der Hinweis irgendeinen Teil des Formulars überdecken (erstes Feld bis Absende-Knopf, samt Häkchen)
  // oder das gerade benutzte Eingabefeld, rutscht er weg (unsichtbar); sobald wieder Platz ist (Scrollen, Tastatur zu), ist er wieder da.
  // Gerechnet wird mit dem sichtbaren Bereich (visualViewport, bei offener Handy-Tastatur kleiner als innerHeight) und der echten Lage
  // des Hinweises (ohne die Ausweich-Verschiebung). Der Seitenabstand unten (tf-cc-offen) bleibt, damit man unter das Formular scrollen kann.
  var ANMELDUNG = /^\/start(\.html)?$/.test(location.pathname), ausweichTakt = null, ausweichFokus = null;
  // Startseite und /studios (16.11.2026): Der Hinweis überdeckt nie Knopf oder Preiszeile im Hero (alle Größen). Liegt er darüber, rutscht er
  // weg wie auf /start und kommt zurück, sobald beides aus dem Bild ist. Beide Knöpfe bleiben gleich (keine Bevorzugung von „Einverstanden“).
  var HERO = !!document.querySelector(".auftakt");
  function ausweichenAn(d) {
    var vv = window.visualViewport;
    var pruefe = function () {
      var h = d.offsetHeight, r = d.getBoundingClientRect(), dy = 0;
      try { dy = new DOMMatrixReadOnly(getComputedStyle(d).transform).m42 || 0; } catch (e) {}
      var sichtUnten = vv ? vv.offsetTop + vv.height : window.innerHeight;
      var zoneOben = Math.min(r.top - dy, sichtUnten - h) - 12, zoneUnten = Math.max(r.top - dy + h, sichtUnten);
      var f = document.getElementById("f"), k = document.getElementById("submit"), erstes = f && f.querySelector(".field");
      var ziele = [];
      if (erstes && k) { var a1 = erstes.getBoundingClientRect(), a2 = k.getBoundingClientRect(); ziele.push({ top: a1.top, bottom: a2.bottom, height: a2.bottom - a1.top }); }
      // Hero: Knopf und Preiszeile; hier zählt auch die Waagerechte (die Karte unten rechts am großen Bildschirm liegt neben dem Knopf)
      var links = r.left, rechts = r.right;
      if (HERO) document.querySelectorAll(".auftakt .auftakt-knopf .knopf, .auftakt .preiszeile").forEach(function (el) {
        var q = el.getBoundingClientRect(); if (q.width > 0 && q.right > links && q.left < rechts) ziele.push(q);
      });
      var a = document.activeElement; if (a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName)) ziele.push(a.getBoundingClientRect());
      var weg = ziele.some(function (z) { return z.height > 0 && z.bottom > zoneOben && z.top < zoneUnten; });
      d.classList.toggle("tf-cc-weg", weg);
    };
    // Scrollen/Größe/Tastatur: im nächsten Bild; Fokuswechsel: sofort (der Hinweis darf nicht einmal kurz über dem neuen Feld stehen)
    ausweichTakt = function () { window.requestAnimationFrame(pruefe); };
    ausweichFokus = function () { pruefe(); window.requestAnimationFrame(pruefe); };
    ["scroll", "resize"].forEach(function (ev) { window.addEventListener(ev, ausweichTakt, { passive: true }); if (vv) vv.addEventListener(ev, ausweichTakt); });
    ["focusin", "focusout"].forEach(function (ev) { document.addEventListener(ev, ausweichFokus, true); });
    pruefe();
  }
  function ausweichenAus() {
    if (!ausweichTakt) return;
    ["scroll", "resize"].forEach(function (ev) { window.removeEventListener(ev, ausweichTakt); if (window.visualViewport) window.visualViewport.removeEventListener(ev, ausweichTakt); });
    ["focusin", "focusout"].forEach(function (ev) { document.removeEventListener(ev, ausweichFokus, true); });
    ausweichTakt = ausweichFokus = null;
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

  // Rechtstexte in der Tattoofin-App (…?app=1, Apple 5.1.2/3.1.1): kein Cookie-Hinweis, kein Pixel, kein WhatsApp-Knopf, kein Menü
  // und keine Links auf andere Seiten von Tattoofin (keine Wege zu Anmeldung oder Preisen aus der App heraus)
  var APP = /[?&]app=1(&|#|$)/.test(location.search);
  function appModus() {
    var st = document.createElement("style"); st.textContent = "header.nav,nav.webnav,footer{display:none!important}"; document.head.appendChild(st);
    document.querySelectorAll("a[href]").forEach(function (a) {
      var h = a.getAttribute("href") || "";
      var eigen = /^\/(?!\/)/.test(h) || /^https?:\/\/(www\.)?tattoofin\.de/.test(h);
      if (eigen && !/(impressum|datenschutz|vertrag|avv)\.html/.test(h) || a.hasAttribute("data-cookies")) {
        var sp = document.createElement("span"); sp.textContent = a.textContent; a.replaceWith(sp);
      }
    });
  }

  function init() {
    if (APP) { appModus(); return; }
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
    // Selbst-Anmeldung im Fokus (Domenic 11.11.2026): Anmeldeseite geöffnet → Lead (1× je Browser); echte Abschlüsse zählen auf danke.html
    if (/^\/start(\.html)?$/.test(location.pathname)) track("Lead", { content_name: "Anmeldung geöffnet", content_category: "Tattoo-Studio" }, "lead-start");
    // UTM aus der Anzeige an alle Links zur Anmeldung weitergeben (nur über die Adresse, nichts wird gespeichert)
    try {
      var su = new URLSearchParams(location.search), utm = [];
      ["utm_source", "utm_medium", "utm_campaign", "utm_content"].forEach(function (k) { if (su.get(k)) utm.push(k + "=" + encodeURIComponent(su.get(k))); });
      if (utm.length) document.querySelectorAll('a[href^="/start"]').forEach(function (l) { var h = l.getAttribute("href"); if (!/utm_/.test(h)) l.setAttribute("href", h + (h.indexOf("?") < 0 ? "?" : "&") + utm.join("&")); });
    } catch (e) {}
    var c = lies();
    if (c === "ja") ladePixel();
    else if (c !== "nein") {
      // Landingpages am Handy/Tablet (16.11.2026): Hinweis erst beim ersten Scrollen oder nach 5 s, damit der erste Bildschirm
      // (Überschrift, Knopf, Preis) frei bleibt. Vorher lädt nichts: Der Pixel startet weiterhin erst nach „Einverstanden“.
      // Anmeldeseite /start (Runde 2): ebenso erst nach Scrollen oder nach der ersten fertigen Eingabe (nicht über dem ersten Feld)
      var anmeldung = /^\/start(\.html)?$/.test(location.pathname);
      if ((document.querySelector(".auftakt") || anmeldung) && window.innerWidth < 1000) {
        var spaeter = function () { window.removeEventListener("scroll", spaeter); document.removeEventListener("change", spaeter, true); clearTimeout(uhr); banner(); };
        // Kein Zeitgeber mehr (16.11.2026): Im echten iPhone-Safari lag der Hinweis nach 5 s über dem Hero-Knopf
        // (Safari-Leiste unten macht den sichtbaren Bereich kleiner). Jetzt nur beim Scrollen bzw. nach der ersten Eingabe.
        var uhr = 0;
        window.addEventListener("scroll", spaeter, { passive: true });
        if (anmeldung) document.addEventListener("change", spaeter, true);
      } else banner();
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();

  return { track: track, waLink: waLink, wa: WA_ANZEIGE, banner: banner, eventId: eventId, einwilligung: lies, cookie: cookie };
})();
