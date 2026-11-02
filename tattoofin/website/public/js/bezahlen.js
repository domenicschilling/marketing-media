// Gemeinsame Logik der Kundenseiten /zahlen/<studio> (Betrag frei) und /zahlung.html?z=… (Zahlungslink).
// Schritt 1: Angaben + Häkchen (Inhalt bestätigen, ggf. Anzahlungsbedingungen) → Schritt 2: Bezahlfeld auf derselben Seite.
window.TFBezahlen = (function () {
  var $ = function (id) { return document.getElementById(id); };
  function meldung(t, art) { $("alert").innerHTML = t ? '<div class="alert-a ' + (art || "err") + '">' + TF.esc(t) + "</div>" : ""; if (t) $("alert").scrollIntoView({ behavior: "smooth", block: "center" }); }
  function betragCent(v) { var n = parseFloat(String(v || "").replace(/\s|€/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")); return isFinite(n) ? Math.round(n * 100) : 0; }
  // Text des Inhalts-Häkchens (gleich wie auf dem Server gespeichert)
  function inhaltText(d) {
    if (d.gutschein) return "Ich kaufe einen Wertgutschein über " + TF.euro(d.betragCent, true) + " von " + d.firma + (d.empfaenger ? " für " + d.empfaenger : "") + ", einlösbar für alle Leistungen bei " + d.firma + ". Den Gutschein mit Code bekomme ich nach der Zahlung per E-Mail.";
    return "Ich zahle " + (d.betragCent ? TF.euro(d.betragCent, true) : "den Betrag") + " an " + d.firma + " für: " + (d.beschreibung || "Tattoo-Projekt") +
      (d.sitzungen ? ", " + d.sitzungen : "") + (d.anzahlung ? " – als Anzahlung, die mit dem Preis verrechnet wird" : "") + ". Betrag und Projekt sind so mit dem Studio abgesprochen.";
  }
  async function starte(body, info) {
    var btn = $("weiter"); btn.disabled = true; btn.textContent = "Einen Moment …";
    try {
      var r = await TF.api("/api/pay", { body: body });
      if (r.url) { location.href = r.url; return; }
      $("schritt1").classList.add("hidden");
      $("schritt2").classList.remove("hidden");
      $("s2-summe").innerHTML = '<div class="amt">' + TF.euro(r.betragCent, true) + '</div><div class="muted">' + TF.esc(info.beschreibung || "Tattoo-Projekt") + (info.anzahlung ? " · Anzahlung" : "") + "</div>";
      meldung("");
      window.scrollTo({ top: 0, behavior: "smooth" });
      await TFStripe.bezahlfeld($("bezahlfeld"), r, { zahlarten: r.zahlarten, name: info.kunde, email: info.email, fehler: function (t) { meldung(t); } });
    } catch (err) { meldung(err.message); btn.disabled = false; btn.textContent = "Weiter zum Bezahlen"; }
  }
  // Logo des Studios über dem Namen zeigen (falls im Admin hinterlegt); ohne Logo bleibt alles wie bisher
  function branding(studio) {
    var b = studio && studio.branding, kopf = document.querySelector(".kunde-kopf");
    if (!b || !kopf || kopf.querySelector(".studio-logo")) return;
    var src = b.logoUrl || b.iconUrl; if (!src) return;
    var img = document.createElement("img");
    img.className = "studio-logo" + (b.logoHell ? " hell" : ""); img.alt = "Logo " + (studio.firma || ""); img.src = src;
    if (b.farbe) img.style.setProperty("--studio-farbe", b.farbe);
    img.onerror = function () { img.remove(); };
    kopf.insertBefore(img, kopf.firstChild);
  }
  // Hinweis vor dem Bezahlen (23.10.2026): Viele Kunden landen sonst bei der Karte, obwohl sie Raten wollen.
  // Rechtsprüfung 01.11.2026 (U5): Tattoofin erklärt Kunden keinen Kreditabschluss. Nur wenn das Studio den Hinweis in seinen Einstellungen einschaltet,
  // steht hier ein neutraler Satz zu den Zahlarten, mit Pflichthinweis (UWG-Anhang Nr. 23e) direkt darunter.
  var RATEN_WARN = '<p class="rb-warn">*Raten über Klarna, nach deren Bonitätsprüfung. Vertragspartner der Raten ist Klarna, nicht Tattoofin. <b>Achtung! Kreditaufnahme kostet Geld.</b></p>';
  function ratenHinweis(el, d) {
    if (!el) return;
    if (!d.klarna || !d.zahlartenHinweis) { el.innerHTML = ""; return; }
    el.innerHTML = '<div class="raten-box ruhig">Im nächsten Schritt siehst du die Zahlarten, die dir angeboten werden, zum Beispiel Karte, Apple Pay oder Klarna.*' + RATEN_WARN + "</div>";
  }
  return { meldung: meldung, betragCent: betragCent, inhaltText: inhaltText, starte: starte, branding: branding, ratenHinweis: ratenHinweis };
})();
