// Stripe direkt in tattoofin.de: Connect Embedded Components (Einrichtung, Auszahlungen, Konto, Hinweise) für Studios
// und das Payment Element (Karte, Apple/Google Pay, Klarna) für deren Kunden – im Tattoofin-Design.
// In der Vorschau ohne Stripe-Testschlüssel zeigt dieselbe Schnittstelle eine deutlich gekennzeichnete Simulation.
window.TFStripe = (function () {
  var FONT_CSS = location.origin + "/css/fonts-stripe.css";
  // Farben, Schrift und Radien wie die Seite (Navy-Outlines, gelbe Knöpfe, DM Sans)
  var CONNECT_LOOK = {
    overlays: "dialog",
    variables: {
      colorPrimary: "#1f3d5c", colorBackground: "#ffffff", colorText: "#1f3d5c", colorSecondaryText: "#4f6478",
      colorBorder: "#9fb0c1", colorDanger: "#d93a3a", fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
      fontSizeBase: "16px", spacingUnit: "10px", borderRadius: "14px",
      buttonPrimaryColorBackground: "#fbb316", buttonPrimaryColorBorder: "#1f3d5c", buttonPrimaryColorText: "#1f3d5c",
      buttonSecondaryColorBackground: "#ffffff", buttonSecondaryColorBorder: "#1f3d5c", buttonSecondaryColorText: "#1f3d5c",
      badgeSuccessColorBackground: "#dff5e7", badgeSuccessColorText: "#14532d", badgeWarningColorBackground: "#fff3c4", badgeWarningColorText: "#84420a",
      formAccentColor: "#1f3d5c", actionPrimaryColorText: "#1f3d5c",
    },
  };
  var BEZAHL_LOOK = {
    theme: "stripe",
    variables: { colorPrimary: "#1f3d5c", colorBackground: "#ffffff", colorText: "#1f3d5c", colorDanger: "#d93a3a", fontFamily: "'DM Sans', system-ui, sans-serif", fontSizeBase: "16px", borderRadius: "12px", spacingUnit: "4px" },
    rules: { ".Input": { border: "2px solid #1f3d5c", boxShadow: "none" }, ".Tab": { border: "2px solid #1f3d5c" }, ".Tab--selected": { backgroundColor: "#fff3c4", borderColor: "#1f3d5c", color: "#1f3d5c" }, ".Label": { fontWeight: "700" } },
  };
  var e = function (s) { return window.TF ? TF.esc(s) : String(s); };
  var skripte = {};
  function lade(src) {
    if (!skripte[src]) skripte[src] = new Promise(function (ok, nein) { var s = document.createElement("script"); s.src = src; s.async = true; s.onload = ok; s.onerror = function () { nein(new Error("Stripe konnte nicht geladen werden. Bitte Internet prüfen.")); }; document.head.appendChild(s); });
    return skripte[src];
  }

  // ---------- Connect (Studio) ----------
  var sitzung = null, instanz = null;
  async function connectStart(s) {
    sitzung = s;
    if (s.modus !== "stripe" || instanz) return;
    var geladen = new Promise(function (ok) { window.StripeConnect = window.StripeConnect || {}; window.StripeConnect.onLoad = ok; });
    await lade("https://connect-js.stripe.com/v1.0/connect.js");
    if (!(window.StripeConnect && window.StripeConnect.init)) await geladen;
    instanz = window.StripeConnect.init({
      publishableKey: s.publishableKey, locale: "de-DE", appearance: CONNECT_LOOK, fonts: [{ cssSrc: FONT_CSS }],
      fetchClientSecret: async function () { return (await TF.api("/api/portal/stripe-session", { body: {} })).clientSecret; },
    });
  }

  // name: account-onboarding | payouts | account-management | notification-banner | payments
  function zeige(box, name, opts) {
    opts = opts || {};
    box.innerHTML = "";
    if (sitzung && sitzung.modus === "stripe" && instanz) {
      var el = instanz.create(name);
      if (name === "account-onboarding") {
        el.setOnExit(function () { opts.fertig && opts.fertig(); });
        if (el.setCollectionOptions) el.setCollectionOptions({ fields: "eventually_due", futureRequirements: "include" });
      }
      if (name === "notification-banner" && el.setOnNotificationsChange) el.setOnNotificationsChange(function (r) { box.classList.toggle("hidden", !r.total); });
      box.appendChild(el);
      return;
    }
    if (sitzung && sitzung.modus === "simulation") return sim[name] ? sim[name](box, opts) : null;
  }

  // ---------- Simulation der Bausteine (nur Vorschau/Test) ----------
  var TAG = '<span class="sim-tag">SIMULATION · STRIPE-BAUSTEIN</span>';
  var sim = {
    "account-onboarding": function (box, opts) {
      var schritt = 1, d = {};
      function zeichne() {
        var schritte = '<div class="sim-schritte">' + [1, 2, 3].map(function (i) { return '<i class="' + (i <= schritt ? "on" : "") + '"></i>'; }).join("") + "</div>";
        var inhalt = schritt === 1
          ? '<h2>Dein Studio</h2><label for="so-name">Vor- und Nachname (Inhaber/in)</label><input id="so-name" autocomplete="name" value="' + e(opts.inhaber || "") + '"><label for="so-geb">Geburtsdatum</label><input id="so-geb" type="date" autocomplete="bday" value="1990-01-01"><label for="so-tel">Handynummer</label><input id="so-tel" type="tel" autocomplete="tel" value="+49 151 12345678">'
          : schritt === 2
          ? '<h2>Bankkonto für Auszahlungen</h2><label for="so-iban">IBAN</label><input id="so-iban" autocomplete="off" inputmode="text" value="DE89 3704 0044 0532 0130 00"><label for="so-inh">Kontoinhaber</label><input id="so-inh" autocomplete="name" value="' + e(opts.firma || "") + '"><p class="muted klein">In echt fragt Stripe hier zusätzlich nach dem Ausweis (Foto) und der Steuernummer.</p>'
          : '<h2>Alles prüfen</h2><p class="klein">Name: <b>' + e(d.name || "") + "</b><br>IBAN: <b>•••• " + e((d.iban || "").replace(/\s/g, "").slice(-4)) + '</b></p><p class="muted klein">Mit dem Absenden bestätigst du die Richtigkeit deiner Angaben gegenüber Stripe.</p>';
        box.innerHTML = '<div class="sim-box">' + TAG + schritte + inhalt + '<div class="row-a">' + (schritt > 1 ? '<button class="btn ghost small" data-sim="zurueck">Zurück</button>' : "") +
          '<button class="btn gold" id="so-weiter" data-sim="weiter">' + (schritt < 3 ? "Weiter" : "Angaben absenden") + "</button></div></div>";
      }
      box.onclick = async function (ev) {
        var a = ev.target.getAttribute("data-sim");
        if (!a) return;
        if (a === "zurueck") { schritt--; return zeichne(); }
        if (schritt === 1) d.name = (document.getElementById("so-name") || {}).value;
        if (schritt === 2) d.iban = (document.getElementById("so-iban") || {}).value;
        if (schritt < 3) { schritt++; return zeichne(); }
        ev.target.disabled = true; ev.target.textContent = "Wird gesendet …";
        await fetch("/api/sim/onboarding-fertig/" + encodeURIComponent(sitzung.konto), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(d) });
        box.innerHTML = '<div class="sim-box">' + TAG + "<h2>Danke! ✓</h2><p>Deine Angaben sind bei Stripe.</p></div>";
        opts.fertig && opts.fertig();
      };
      zeichne();
    },
    payouts: function (box, opts) {
      var zs = (opts.zahlungen || []).filter(function (z) { return z.status === "bezahlt"; });
      var an = function (z) { return z.betragCent - (z.erstattetCent || 0) - Math.max(0, (z.gebuehrBruttoCent || 0) - (z.gebuehrErstattetCent || 0)); };
      var jetzt = Date.now(), unterwegs = 0, ausgezahlt = 0;
      var liste = zs.map(function (z) { var alt = jetzt - new Date(z.bezahltAm).getTime() > 2 * 864e5; if (alt) ausgezahlt += an(z); else unterwegs += an(z); return { z: z, alt: alt }; });
      box.innerHTML = '<div class="sim-box">' + TAG + '<div class="geld-grid"><div><small>Unterwegs zu deiner Bank</small><span class="geld-zahl">' + TF.euro(unterwegs, true) + '</span></div><div><small>Schon ausgezahlt</small><span class="geld-zahl">' + TF.euro(ausgezahlt, true) + "</span></div></div>" +
        "<h2>Auszahlungen</h2>" + (liste.length ? '<ul class="zl">' + liste.map(function (x) {
          return '<li><a><span class="wer"><b>' + e(x.z.kunde || "Kunde") + "</b><small>" + TF.datum(x.z.bezahltAm) + " · " + (x.alt ? "auf deinem Konto" : "kommt in 1–2 Werktagen") + '</small></span><span class="betrag">' + TF.euro(an(x.z), true) + "</span></a></li>";
        }).join("") + "</ul>" : '<p class="leer">Noch keine Auszahlungen.</p>') + '<p class="muted klein">Bankkonto: •••• 3000 · Auszahlung täglich, automatisch</p></div>';
    },
    "account-management": function (box, opts) {
      box.innerHTML = '<div class="sim-box">' + TAG + '<h2>Firmendaten</h2><p class="klein"><b>' + e(opts.firma || "") + "</b><br>" + e(opts.adresse || "") + '</p><h2>Bankkonto</h2><p class="klein">DE89 •••• •••• •••• 3000 <span class="chip ok">bestätigt</span></p><button class="btn ghost small" disabled>Bankkonto ändern</button><p class="muted klein">In echt öffnet Stripe zum Ändern ein kurzes Anmeldefenster (Sicherheitscode per SMS/E-Mail).</p></div>';
    },
    "notification-banner": function (box, opts) {
      box.innerHTML = opts.offen ? '<div class="sim-box" style="border-color:var(--orange)">' + TAG + "<b>Stripe braucht noch Angaben von dir.</b> <a href=\"#einrichtung\">Jetzt ergänzen</a></div>" : "";
    },
  };

  // ---------- Bezahlfeld (Kunde) ----------
  // r = Antwort von /api/pay: { clientSecret, publishableKey, stripeAccount, simulation, zahlung, betragCent }
  async function bezahlfeld(box, r, opts) {
    var rueck = location.origin + "/bezahlt.html?z=" + encodeURIComponent(r.zahlung);
    var knopfText = "Jetzt " + TF.euro(r.betragCent, true) + " bezahlen";
    if (r.simulation) {
      var pm = "card";
      box.innerHTML = '<div class="sim-box">' + TAG.replace("STRIPE-BAUSTEIN", "BEZAHLFELD") +
        '<div class="seg" role="radiogroup"><label><input type="radio" name="sim-pm" value="card" checked><span>💳 Karte</span></label>' + (!opts.zahlarten || opts.zahlarten.indexOf("klarna") >= 0 ? '<label><input type="radio" name="sim-pm" value="klarna"><span>Klarna</span></label>' : "") + '</div>' +
        '<div id="sim-card"><label for="sim-nr">Kartennummer</label><input id="sim-nr" autocomplete="off" value="4242 4242 4242 4242"><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div><label for="sim-ab">Gültig bis</label><input id="sim-ab" autocomplete="off" value="12 / 30"></div><div><label for="sim-cvc">Prüfnummer</label><input id="sim-cvc" autocomplete="off" value="123"></div></div></div>' +
        '<div id="sim-klarna" class="hidden"><p class="klein">Bei Klarna wirst du kurz zu Klarna weitergeleitet und siehst dort, welche Optionen dir angeboten werden (z. B. später bezahlen oder Raten*). Danach kommst du hierher zurück.</p></div>' +
        '<button class="btn gold big w100" id="pay-jetzt">' + e(knopfText) + "</button></div>";
      box.querySelectorAll("input[name=sim-pm]").forEach(function (i) { i.onchange = function () { pm = i.value; document.getElementById("sim-card").classList.toggle("hidden", pm !== "card"); document.getElementById("sim-klarna").classList.toggle("hidden", pm !== "klarna"); }; });
      document.getElementById("pay-jetzt").onclick = async function () {
        this.disabled = true; this.textContent = "Einen Moment …";
        var pi = r.clientSecret.split("_secret_")[0];
        var res = await fetch("/api/sim/bestaetigen", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pi: pi, client_secret: r.clientSecret, pm: pm }) });
        if (!res.ok) { this.disabled = false; this.textContent = knopfText; return opts.fehler && opts.fehler("Zahlung fehlgeschlagen (Simulation)."); }
        location.href = rueck;
      };
      return;
    }
    await lade("https://js.stripe.com/v3/");
    var stripe = window.Stripe(r.publishableKey, r.stripeAccount ? { stripeAccount: r.stripeAccount } : undefined);
    var elements = stripe.elements({ clientSecret: r.clientSecret, appearance: BEZAHL_LOOK, locale: "de", fonts: [{ cssSrc: FONT_CSS }] });
    box.innerHTML = '<div id="pe"></div><button class="btn gold big w100" id="pay-jetzt" style="margin-top:16px">' + e(knopfText) + "</button>";
    var pe = elements.create("payment", { layout: { type: "tabs" }, fields: { billingDetails: { email: opts.email ? "never" : "auto" } }, defaultValues: { billingDetails: { name: opts.name || "", email: opts.email || "" } } });
    pe.mount("#pe");
    document.getElementById("pay-jetzt").onclick = async function () {
      var b = this; b.disabled = true; b.textContent = "Einen Moment …";
      var res = await stripe.confirmPayment({ elements: elements, confirmParams: { return_url: rueck, payment_method_data: opts.email ? { billing_details: { email: opts.email } } : undefined } });
      if (res.error) { b.disabled = false; b.textContent = knopfText; opts.fehler && opts.fehler(res.error.message || "Zahlung fehlgeschlagen."); }
    };
  }

  return { connectStart: connectStart, zeige: zeige, bezahlfeld: bezahlfeld, modus: function () { return sitzung && sitzung.modus; } };
})();
