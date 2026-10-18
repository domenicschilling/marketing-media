// Gemeinsame Logik der Kundenseiten /zahlen/<studio> (Betrag frei) und /zahlung.html?z=… (Zahlungslink).
// Schritt 1: Angaben + Häkchen (Inhalt bestätigen, ggf. Anzahlungsbedingungen) → Schritt 2: Bezahlfeld auf derselben Seite.
window.TFBezahlen = (function () {
  var $ = function (id) { return document.getElementById(id); };
  function meldung(t, art) { $("alert").innerHTML = t ? '<div class="alert-a ' + (art || "err") + '">' + TF.esc(t) + "</div>" : ""; if (t) $("alert").scrollIntoView({ behavior: "smooth", block: "center" }); }
  function betragCent(v) { var n = parseFloat(String(v || "").replace(/\s|€/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")); return isFinite(n) ? Math.round(n * 100) : 0; }
  // Text des Inhalts-Häkchens (gleich wie auf dem Server gespeichert)
  function inhaltText(d) {
    return "Ich zahle " + (d.betragCent ? TF.euro(d.betragCent, true) : "den Betrag") + " an " + d.firma + " für: " + (d.beschreibung || "Tattoo-Projekt") +
      (d.sitzungen ? ", " + d.sitzungen : "") + (d.anzahlung ? " – als Anzahlung, die mit dem Preis verrechnet wird" : "") + ". Das ist so mit dem Studio abgesprochen.";
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
      await TFStripe.bezahlfeld($("bezahlfeld"), r, { name: info.kunde, email: info.email, fehler: function (t) { meldung(t); } });
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
  return { meldung: meldung, betragCent: betragCent, inhaltText: inhaltText, starte: starte, branding: branding };
})();
