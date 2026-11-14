// Kampagnen-Landingpage /studios (v2, 17.10.2026; Kurzfassung 14.11.2026: gleicher Aufbau wie die Startseite, Anfrage zugeklappt)
// Messung:
//   Meta „Lead“  = Anfrage-Formular abgeschickt (Pixel + Server-Kopie mit gleicher event_id über /api/anfrage)
//                  oder Klick auf WhatsApp. Ein Klick auf „Online abschließen“ ist KEIN Lead mehr
//                  (der echte Abschluss wird auf /start und /danke als InitiateCheckout/CompleteRegistration gemessen).
//   Meta nur mit Cookie-Einwilligung (tf-track.js) und nur auf tattoofin.de.
//   Umami (cookielos): cta-klick, whatsapp, online-start, formular-start, formular-gesendet, formular-fehler, anfrage-auf, scroll-50/90,
//                      kunde-weiter (Link zur Endkunden-Seite /raten, 19.10.2026).
(function () {
  var j = document.getElementById("jahr");
  if (j) j.textContent = new Date().getFullYear();
  function u(e, d) { try { if (window.umami) window.umami.track(e, d); } catch (x) {} }

  // utm_* / fbclid an die Links zum Online-Abschluss hängen (Herkunft bleibt sichtbar).
  // Die Links tragen als Standard utm_source=studios&utm_medium=seite&utm_content=<ort>; kommt der Besucher mit eigenen
  // utm_* (z. B. aus der Meta-Anzeige), gehen diese vor, damit die Kampagne auf /start erkennbar bleibt.
  var q = new URLSearchParams(location.search), mit = [], utm = {};
  q.forEach(function (v, k) { if (/^utm_|^fbclid$/.test(k)) { mit.push([k, v]); if (/^utm_/.test(k)) utm[k] = v; } });
  if (q.get("ref")) utm.ref = q.get("ref"); // z. B. ref=kunde (Kunde hat uns seinem Studio empfohlen, /raten)
  if (mit.length) document.querySelectorAll('a[href^="/start"]').forEach(function (a) {
    var url = new URL(a.getAttribute("href"), location.origin);
    mit.forEach(function (p) { url.searchParams.set(p[0], p[1]); });
    a.setAttribute("href", url.pathname + url.search);
  });

  function consent() { try { return localStorage.getItem("tf_consent"); } catch (e) { return null; } }
  einmalHeute.mem = {};
  function einmalHeute(key) {
    var k = "tf_ev_" + key + "-" + new Date().toISOString().slice(0, 10);
    // Merker erst mit Einwilligung im Browser speichern (§ 25 TDDDG), sonst nur für diesen Seitenaufruf
    if (einmalHeute.mem[k]) return false; einmalHeute.mem[k] = 1;
    try { if (localStorage.getItem(k)) return false; if (consent() === "ja") localStorage.setItem(k, "1"); } catch (e) {}
    return true;
  }

  // Klicks
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var h = a.getAttribute("href") || "";
    if (/wa\.me|api\.whatsapp\.com/.test(h)) {
      u("whatsapp", { ort: a.closest(".leiste") ? "leiste" : a.closest(".auftakt, .kopf") ? "held" : "seite" });
      if (consent() !== "nein" && einmalHeute("lp-wa") && window.TFTrack) TFTrack.track("Lead", { content_name: "WhatsApp (Kampagnen-Seite)", content_category: "Tattoo-Studio" });
    } else if (/^\/start/.test(h)) u("online-start", { paket: (h.match(/paket=(\w+)/) || [])[1] || "monatlich" });
    else if (a.dataset.cta) u("cta-klick", { ort: a.dataset.cta });
    else if (a.dataset.lp === "raten") u("kunde-weiter", { ort: a.closest(".auftakt") ? "held" : "formular" });
  }, true);

  // Formular
  var f = document.getElementById("anfrage-form");
  var gestartet = false;
  if (f) {
    var knopf = document.getElementById("a-senden"), status = document.getElementById("a-status");
    var felder = { vorname: f.elements.vorname, studio: f.elements.studio, telefon: f.elements.telefon, studio_bestaetigt: f.elements.studio_bestaetigt };
    // Endkunden-Sätze im Studiofeld (z. B. „das Tattoo kostet 400 €“) → auf /raten hinweisen (gleiche Regel wie /api/anfrage, 19.10.2026)
    var ENDKUNDE = /€|\beuro\b|\bkostet\b|\bich (habe|hab|möchte|will|würde)\b|\bmein(en|em)? tattoo\b|\btermin\b|\braten(zahlung)?\b|\bfinanzier/i;
    var regeln = {
      vorname: function (v) { return v.trim().length >= 2 ? "" : "Bitte gib deinen Vornamen ein."; },
      studio: function (v) {
        if (v.trim().length < 2) return "Bitte gib den Namen deines Studios ein.";
        return ENDKUNDE.test(v) ? "Das sieht nicht nach einem Studionamen aus. Du bist Kunde und willst dein Tattoo bezahlen? Dann schau auf tattoofin.de/raten." : "";
      },
      studio_bestaetigt: function () { return felder.studio_bestaetigt.checked ? "" : "Bitte bestätige, dass du ein Tattoostudio führst oder in einem arbeitest."; },
      telefon: function (v) { var d = v.replace(/\D/g, ""); return d.length >= 8 && d.length <= 15 ? "" : "Bitte gib eine Handynummer ein, z. B. 0151 23456789."; },
    };
    function wert(n) { return n === "studio_bestaetigt" ? (felder[n].checked ? "ja" : "") : felder[n].value; }
    function zeige(name, text) {
      var el = felder[name], p = document.getElementById("a-" + name + "-f");
      if (text) { el.setAttribute("aria-invalid", "true"); p.textContent = text; p.hidden = false; }
      else { el.removeAttribute("aria-invalid"); p.textContent = ""; p.hidden = true; }
    }
    Object.keys(felder).forEach(function (n) {
      felder[n].addEventListener("focus", function () { if (!gestartet) { gestartet = true; u("formular-start"); } });
      felder[n].addEventListener("blur", function () { if (wert(n)) zeige(n, regeln[n](wert(n))); });
      felder[n].addEventListener(n === "studio_bestaetigt" ? "change" : "input", function () { if (felder[n].getAttribute("aria-invalid")) zeige(n, regeln[n](wert(n))); });
    });

    f.addEventListener("submit", async function (e) {
      e.preventDefault();
      status.textContent = ""; status.className = "status";
      var erster = null;
      Object.keys(felder).forEach(function (n) { var t = regeln[n](wert(n)); zeige(n, t); if (t && !erster) erster = felder[n]; });
      if (erster) { erster.focus(); u("formular-fehler", { art: ENDKUNDE.test(felder.studio.value) ? "endkunde" : "eingabe" }); return; }

      var eid = window.TFTrack && TFTrack.eventId ? TFTrack.eventId() : "tf-" + Date.now().toString(36);
      var fbclid = q.get("fbclid");
      var daten = {
        vorname: felder.vorname.value, studio: felder.studio.value, telefon: felder.telefon.value, studio_bestaetigt: felder.studio_bestaetigt.checked,
        firmenwebsite: f.elements.firmenwebsite.value, utm: utm, seite: location.pathname + location.search,
        einwilligung: consent() === "ja" ? "ja" : "nein", event_id: eid,
        fbp: window.TFTrack && TFTrack.cookie ? TFTrack.cookie("_fbp") : "",
        fbc: (window.TFTrack && TFTrack.cookie && TFTrack.cookie("_fbc")) || (fbclid ? "fb.1." + Date.now() + "." + fbclid : ""),
      };
      knopf.disabled = true; knopf.textContent = "Wird gesendet …";
      try {
        var r = await fetch("/api/anfrage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(daten) });
        var out = await r.json().catch(function () { return {}; });
        if (!r.ok) {
          if (out.fehler) Object.keys(out.fehler).forEach(function (n) { if (felder[n]) zeige(n, out.fehler[n]); });
          throw new Error(out.error || "Das hat nicht geklappt.");
        }
        u("formular-gesendet");
        // Meta-Pixel (Server meldet dasselbe Ereignis mit gleicher event_id → keine Doppelzählung)
        if (consent() !== "nein" && window.TFTrack) TFTrack.track("Lead", { content_name: "Anfrage-Formular (Kampagnen-Seite)", content_category: "Tattoo-Studio" }, null, { id: eid, nurPixel: true });
        f.hidden = true;
        var d = document.getElementById("a-danke"); d.hidden = false; d.focus();
      } catch (err) {
        u("formular-fehler", { art: "server" });
        status.className = "status fehlt";
        status.textContent = (err && err.message ? err.message + " " : "") + "Bitte versuch es noch einmal oder schreib uns auf WhatsApp: 0162 4502375.";
        knopf.disabled = false; knopf.textContent = "Einrichtung anfragen";
      }
    });
  }

  // Handy-Leiste: steuert /assets/start/app.js wie auf der Startseite (zeigt sich, wenn kein „Jetzt starten“ im Bild ist,
  // weg an Schluss, Anfrage (#anfrage) und Fuß).
  // Anfrage zugeklappt: Aufklappen zählen (Umami), damit sichtbar wird, ob jemand lieber erst mit dem Team spricht
  var anfrage = document.getElementById("anfrage");
  if (anfrage) anfrage.addEventListener("toggle", function () { if (anfrage.open) u("anfrage-auf"); });

  // Scrolltiefe (Umami)
  var tiefen = { 50: false, 90: false };
  addEventListener("scroll", function () {
    var p = (scrollY + innerHeight) / document.documentElement.scrollHeight * 100;
    [50, 90].forEach(function (t) { if (!tiefen[t] && p >= t) { tiefen[t] = true; u("scroll-" + t); } });
  }, { passive: true });
})();
