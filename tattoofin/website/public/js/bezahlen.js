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
  // Bei Anzahlungen bewusst ruhig: Anzahlung normal per Karte, Ratenzahlung ist für größere Projekte gedacht.
  function ratenHinweis(el, d) {
    if (!el) return;
    if (!d.klarna) { el.innerHTML = ""; return; }
    if (d.anzahlung) { el.innerHTML = '<div class="raten-box ruhig">Anzahlungen zahlst du am einfachsten direkt per <b>Karte, Apple Pay oder Google Pay</b>. Ratenzahlung* ist für größere Tattoo-Projekte gedacht.</div>'; return; }
    var zuHoch = d.betragCent > 1000000;
    el.innerHTML = '<div class="raten-box"><b class="rb-titel">Du willst in Raten* zahlen?</b><p>Wähle im nächsten Schritt <b>Klarna</b> als Zahlungsart' + (d.paypal ? ' – oder unten <b>PayPal</b>.' : ".") + "</p>" +
      '<ol class="raten-schritte" aria-label="So zahlst du in Raten"><li><span>1</span>Klarna wählen</li><li><span>2</span>Raten oder Finanzierung aussuchen</li><li><span>3</span>Bei Klarna bestätigen</li></ol>' +
      '<p class="klein">' + (zuHoch ? "Über 10.000 € bietet Klarna keine Ratenzahlung an. " : "Ratenzahlung ist je nach Angebot von Klarna für Beträge von 25 € bis 10.000 € möglich. ") +
      "Ob und welche Raten du bekommst, entscheidet Klarna nach einer kurzen Prüfung. Sobald die Zahlung freigegeben ist, kann es im Studio losgehen. Mit Karte zahlst du den ganzen Betrag auf einmal.</p>" +
      (d.paypal ? '<p class="klein"><b>Mit PayPal:</b> unten auf den PayPal-Knopf tippen und dort „Später bezahlen“ oder Ratenzahlung wählen, je nach Prüfung durch PayPal (Ratenzahlung ab 99 €).</p>' : "") + "</div>";
  }
  // PayPal-Knopf (Geld direkt an das PayPal-Konto des Studios). holeBody() prüft die Häkchen und liefert den Auftrag für /api/pay.
  function paypalKnopf(box, pp, holeBody) {
    if (!box || !pp) return;
    box.classList.remove("hidden");
    var ziel = box.querySelector("#pp-knopf");
    var abschliessen = async function (orderId) {
      var r = await TF.api("/api/paypal/capture", { body: { orderId: orderId } });
      location.href = "/bezahlt.html?z=" + encodeURIComponent(r.zahlung);
    };
    var bestellen = async function () { var b = holeBody(); if (!b) throw new Error("abgebrochen"); b.zahlweg = "paypal"; var r = await TF.api("/api/pay", { body: b }); return r.paypalOrderId; };
    if (pp.sim || !pp.clientId) {
      ziel.innerHTML = '<button type="button" class="btn pp-sim big w100" id="pp-sim">PayPal <small>(Simulation) · auch „Später bezahlen“</small></button>';
      document.getElementById("pp-sim").onclick = async function () {
        var b = this; b.disabled = true;
        try { await abschliessen(await bestellen()); } catch (err) { b.disabled = false; if (err.message !== "abgebrochen") meldung(err.message); }
      };
      return;
    }
    var sk = document.createElement("script");
    sk.src = "https://www.paypal.com/sdk/js?client-id=" + encodeURIComponent(pp.clientId) + "&currency=EUR&intent=capture&enable-funding=paylater&disable-funding=card,sepa";
    sk.onload = function () {
      window.paypal.Buttons({
        style: { layout: "vertical", shape: "pill", label: "paypal" },
        onClick: function (d, actions) { return holeBody() ? actions.resolve() : actions.reject(); },
        createOrder: function () { return bestellen(); },
        onApprove: function (d) { return abschliessen(d.orderID).catch(function (err) { meldung(err.message); }); },
        onError: function () { meldung("PayPal hat gerade nicht geklappt. Es wurde nichts abgebucht. Bitte versuch es noch einmal oder zahle mit Karte oder Klarna."); },
      }).render(ziel);
    };
    sk.onerror = function () { box.classList.add("hidden"); };
    document.head.appendChild(sk);
  }
  return { paypalKnopf: paypalKnopf, meldung: meldung, betragCent: betragCent, inhaltText: inhaltText, starte: starte, branding: branding, ratenHinweis: ratenHinweis };
})();
