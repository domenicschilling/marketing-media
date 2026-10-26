// Endkunden-Seite /raten (19.10.2026): Kunde schickt seinem Studio eine fertige Nachricht (WhatsApp oder kopiert für Instagram-DM).
// Wir schreiben Studios NICHT selbst an (§ 7 UWG): Die Nachricht geht nur aus dem WhatsApp/Instagram des Kunden.
// Optional „Wie heißt dein Studio?“ → /api/studio-tipp (nur interne Zählung, keine personenbezogenen Daten des Kunden).
// Messung:
//   Umami (cookielos): teilen-whatsapp, teilen-kopieren, teilen-fehler, studios-klick, scroll-50/90
//   Meta-Pixel: eigenes Ereignis „StudioEmpfehlung“ – nur mit Cookie-Einwilligung und nur auf tattoofin.de (Pixel lädt tf-track.js).
//   Bewusst kein „Lead“: Das Ereignis „Lead“ steuert die Studio-Kampagnen und soll nicht von Endkunden verwässert werden.
(function () {
  var j = document.getElementById("jahr");
  if (j) j.textContent = new Date().getFullYear();
  function u(e, d) { try { if (window.umami) window.umami.track(e, d); } catch (x) {} }
  function consent() { try { return localStorage.getItem("tf_consent"); } catch (e) { return null; } }
  function pixel(kanal) {
    try { if (consent() === "ja" && window.fbq && location.hostname === "tattoofin.de") window.fbq("trackCustom", "StudioEmpfehlung", { kanal: kanal }); } catch (e) {}
  }

  // Herkunft der Seite (Anzeige) mitzählen
  var q = new URLSearchParams(location.search), utm = {};
  q.forEach(function (v, k) { if (/^utm_/.test(k)) utm[k] = v; });

  var studio = document.getElementById("t-studio"), stadt = document.getElementById("t-stadt");
  var vorschau = document.getElementById("t-vorschau"), wa = document.getElementById("t-wa");
  var kopieren = document.getElementById("t-kopieren"), status = document.getElementById("t-status"), igHilfe = document.getElementById("t-ig");

  var BASIS = "https://tattoofin.de";
  function links(kanal) {
    // kurz halten (steht sichtbar in der Nachricht): ref/utm_source = kunde, Kampagne, Kanal wa|ig
    var p = "ref=kunde&utm_source=kunde&utm_campaign=tfin-endkunden-raten&utm_content=" + (kanal === "instagram" ? "ig" : "wa");
    return { seite: BASIS + "/studios?" + p, video: BASIS + "/video?ref=kunde" };
  }
  function nachricht(kanal) {
    var name = (studio.value || "").trim().replace(/\s+/g, " ");
    var l = links(kanal);
    return (name ? "Hey " + name + "!" : "Hey ihr!") + " Kurze Frage: Kann ich mein Tattoo bei euch auch in Raten zahlen? 🙏\n\n" +
      "Mit Tattoofin könnt ihr mir einen Zahlungslink schicken. Dann geht Karte, Apple Pay oder Raten über Klarna (die prüfen das), " +
      "und ihr bekommt euer Geld nach der Freigabe in der Regel auf einmal.\n\n" +
      "Schaut mal: " + l.seite + "\nVideo (2 Min.): " + l.video;
  }
  function aktualisiere() {
    vorschau.textContent = nachricht("whatsapp");
    wa.href = "https://wa.me/?text=" + encodeURIComponent(nachricht("whatsapp"));
  }
  studio.addEventListener("input", aktualisiere);
  aktualisiere();

  // Studio-Name nur intern zählen (einmal je Name und Seitenaufruf)
  var gemeldet = {};
  function tipp(kanal) {
    var s = (studio.value || "").trim(), o = (stadt.value || "").trim();
    if (s.length < 2) return;
    var key = (s + "|" + o).toLowerCase();
    if (gemeldet[key]) return; gemeldet[key] = 1;
    try {
      fetch("/api/studio-tipp", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studio: s, stadt: o, kanal: kanal, utm: utm, seite: location.pathname }) }).catch(function () {});
    } catch (e) {}
  }

  wa.addEventListener("click", function () {
    wa.href = "https://wa.me/?text=" + encodeURIComponent(nachricht("whatsapp"));
    u("teilen-whatsapp", { studio: studio.value.trim() ? "ja" : "nein" });
    pixel("whatsapp"); tipp("whatsapp");
  });

  function zeige(text, ok) { status.textContent = text; status.className = "status" + (ok ? " ok" : ""); }
  function kopiereText(t) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t);
    return new Promise(function (ok, fehler) {
      var ta = document.createElement("textarea");
      ta.value = t; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy") ? ok() : fehler(); } catch (e) { fehler(e); }
      ta.remove();
    });
  }
  kopieren.addEventListener("click", function () {
    var t = nachricht("instagram");
    kopiereText(t).then(function () {
      zeige("✓ Kopiert! Jetzt bei Instagram einfügen.", true);
      igHilfe.hidden = false;
      u("teilen-kopieren", { studio: studio.value.trim() ? "ja" : "nein" });
      pixel("instagram"); tipp("instagram");
    }, function () {
      zeige("Kopieren hat nicht geklappt. Halte den Text oben gedrückt und wähle „Kopieren“.", false);
      u("teilen-fehler", { art: "kopieren" });
    });
  });

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[data-r]");
    if (a && a.dataset.r === "studios") u("studios-klick");
  }, true);

  // Handy-Leiste: zeigen, sobald die Teilen-Karte aus dem Bild ist
  var leiste = document.getElementById("leiste"), karte = document.getElementById("teilen");
  if (leiste && karte && "IntersectionObserver" in window) {
    leiste.hidden = false;
    var gesehen = false;
    new IntersectionObserver(function (es) {
      var sichtbar = es[0].isIntersecting;
      if (sichtbar) gesehen = true;
      leiste.classList.toggle("sichtbar", gesehen && !sichtbar && es[0].boundingClientRect.top < 0);
    }).observe(karte);
  }

  var tiefen = { 50: false, 90: false };
  addEventListener("scroll", function () {
    var p = (scrollY + innerHeight) / document.documentElement.scrollHeight * 100;
    [50, 90].forEach(function (t) { if (!tiefen[t] && p >= t) { tiefen[t] = true; u("scroll-" + t); } });
  }, { passive: true });
})();
