// Anmeldung /start (einfache Anmeldung seit 16.11.2026, Domenic: „super easy und fertig“):
// EIN Bildschirm, 4 Felder (Studio, Name, E-Mail, Handy), 1 Häkchen (Unternehmer < 250 MA + Vertrag + AVV), 1 Knopf → Stripe.
// Kein Fortschrittsbalken, kein Zurück, kein Unterzeichner-Feld (Name = Inhaber/in = Unterzeichner/in), keine Adresse.
// Adresse nur bei Einladung (?geschenk) bzw. Einmalzahlung (Bestandsabläufe), dann Pflicht. Der Server prüft dasselbe (signup.mjs).
(function () {
  var f = document.getElementById("f");
  var alertBox = document.getElementById("alert");
  var C = {}, resumeId = null, sendet = false;
  var q = new URLSearchParams(location.search);
  var geschenk = q.get("geschenk") || "";

  function show(msg, type) { alertBox.innerHTML = msg ? '<div class="alert ' + (type || "err") + '">' + TF.esc(msg) + "</div>" : ""; }
  function val(n) { var el = f.elements[n]; return el ? (el.type === "checkbox" ? el.checked : (el.value || "").trim()) : ""; }
  // Paket: monatlich | einmal (alte Links ?modell=kauf → Monatlich). Das Paket Risikofrei gibt es seit 26.10.2026 für neue Anmeldungen nicht mehr:
  // alte Links (?paket=risikofrei, ?modell=provision, ?paket=start) und alte Entwürfe führen freundlich auf Monatlich.
  var ALIAS = { kauf: "monatlich", monatlich: "monatlich", einmal: "monatlich", einmalzahlung: "monatlich", profi: "monatlich" };
  var GESCHLOSSEN = { provision: 1, risikofrei: 1, start: 1 };
  var NAMEN = { monatlich: "Monatlich", einmal: "Einmalzahlung" };
  var HINWEIS_RISIKOFREI = "Das Paket Risikofrei gibt es für neue Anmeldungen nicht mehr. Tattoofin kostet jetzt 49,90 € im Monat inkl. MwSt.";
  function paket() { var r = f.querySelector("input[name=paket]:checked"); return r ? r.value : ""; }
  function modell() { return paket() ? "kauf" : ""; }
  function zahlart() { var r = f.querySelector("input[name=zahlart]:checked"); return r ? r.value : "sofort"; }
  // Adresse nötig? Nur bei Einladung oder Einmalzahlung (Monatlich: kommt später aus dem Stripe-Konto)
  function mitAdresse() { return Boolean(geschenk) || paket() === "einmal"; }
  var PFLICHT = ["firma", "inhaber", "email", "telefon"], ADRESSE = ["strasse", "plz", "ort"];

  function pruefe() {
    var pflicht = PFLICHT.concat(mitAdresse() ? ADRESSE : []);
    var fehlt = pflicht.filter(function (k) { return !val(k); });
    pflicht.forEach(function (k) { f.elements[k].setAttribute("aria-invalid", fehlt.indexOf(k) >= 0 ? "true" : "false"); });
    if (fehlt.length) { f.elements[fehlt[0]].focus(); return fehlt.length === 1 ? "Bitte fülle noch „" + label(fehlt[0]) + "“ aus." : "Bitte fülle alle " + pflicht.length + " Felder aus."; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val("email"))) { f.elements.email.setAttribute("aria-invalid", "true"); f.elements.email.focus(); return "Bitte gib eine gültige E-Mail-Adresse ein."; }
    if (val("telefon").replace(/\D/g, "").length < 6) { f.elements.telefon.setAttribute("aria-invalid", "true"); f.elements.telefon.focus(); return "Bitte gib deine Handynummer mit Vorwahl ein."; }
    if (mitAdresse() && !/^\d{5}$/.test(val("plz"))) { f.elements.plz.setAttribute("aria-invalid", "true"); f.elements.plz.focus(); return "Bitte gib die PLZ mit 5 Ziffern ein."; }
    if (!val("ak_alle")) { f.elements.ak_alle.focus(); return "Bitte setze das Häkchen bei Vertrag und AVV."; }
    return "";
  }
  function label(k) { var l = f.querySelector('label[for="' + k + '"]'); return l ? l.textContent.trim() : k; }

  // Ansicht je Fall: Monatlich (Standard), Einladung, Einmalzahlung
  function ansicht() {
    var adr = mitAdresse(), p = paket(), z = zahlart();
    var block = document.getElementById("adresse-block");
    block.classList.toggle("hidden", !adr);
    ADRESSE.forEach(function (k) { f.elements[k].required = adr; });
    var k1 = document.querySelector("#submit .k1"), k2 = document.querySelector("#submit .k2"), sep = document.querySelector("#submit .k-sep");
    var preis = document.getElementById("anm-preis"), h1 = document.getElementById("anm-titel"), sicher = document.getElementById("anm-sicher");
    if (geschenk) {
      h1.textContent = "Deine Einladung."; preis.textContent = "0 € Einrichtung, keine Grundgebühr, keine Provision";
      k1.textContent = "Einladung annehmen"; k2.textContent = ""; sep.textContent = "";
      sicher.textContent = "🔒 Jetzt wird nichts bezahlt. Danach richtest du das Zahlungskonto deines Studios bei Stripe ein.";
    } else if (p === "einmal") {
      h1.textContent = "Fast fertig."; k1.textContent = z === "rechnung" ? "Zahlungspflichtig bestellen (Rechnung)" : "Zahlungspflichtig bestellen & bezahlen"; k2.textContent = ""; sep.textContent = "";
    }
    kurzListe();
  }

  function kurzListe() {
    var p = paket(), z = zahlart(), kurz;
    if (geschenk) {
      kurz = ["Keine Einrichtungsgebühr, keine Grundgebühr, keine Provision.", "Du zahlst nur die normalen Gebühren von Stripe bzw. Klarna, direkt an Stripe.", "Die Zahlungen deiner Kunden laufen auf das Konto deines Studios.", "Wir richten alles mit dir ein."];
    } else if (p === "einmal") {
      kurz = [
        "Einmalig " + TF.euro(C.kaufNetto || 0) + " netto. Danach keine Tattoofin-Gebühr mehr, nur die Zahlungsgebühren, die du direkt an Stripe zahlst.",
        "Inklusive digitalem QR-Code deiner Zahlseite, zum Ausdrucken für Theke und Flyer.",
        (C.garantieTage || "") + " Tage Geld-zurück-Garantie ab Go-live (Kündigung in dieser Zeit, § 6 Vertrag).",
        "Alles läuft über dein eigenes Zahlungskonto bei Stripe. Rückbuchungen und ihre Gebühren laufen direkt über dieses Konto.",
        z === "rechnung" ? "Du bekommst die Rechnung sofort per E-Mail, zahlbar in 7 Tagen. Die Einrichtung startet nach Zahlungseingang." : "Nach der Zahlung legen wir sofort los.",
      ];
    } else {
      kurz = [
        (C.monatNetto ? TF.monatPreis(C.monatNetto, C.ustProzent) : "49,90 € im Monat inkl. MwSt.") + ", keine Einrichtungsgebühr.",
        "Danach nur die Zahlungsgebühren von Stripe (je nach Zahlart ca. 1,5–3 % plus fester Betrag je Zahlung, laut Preisliste von Stripe), die du direkt an Stripe zahlst. 0 % Tattoofin-Provision.",
        "Mit dem Knopf geht es zu Stripe. Dort startest du das Abo sicher, z. B. per Karte, Apple Pay oder Google Pay. Die Rechnung kommt jeden Monat automatisch per E-Mail.",
        "Danach richtest du in deinem Studio-Bereich das Zahlungskonto deines Studios bei Stripe ein (Ausweis und IBAN bereithalten). Die Adresse deines Studios übernehmen wir von dort.",
        "Alles läuft über dein eigenes Zahlungskonto bei Stripe. Rückbuchungen und ihre Gebühren laufen direkt über dieses Konto.",
        "Inklusive digitalem QR-Code deiner Zahlseite, zum Ausdrucken für Theke und Flyer.",
        "Monatlich kündbar zum Ende des laufenden Abrechnungsmonats, keine Mindestlaufzeit. Bereits bezahlte Monate werden nicht anteilig erstattet.",
      ];
    }
    kurz.push("Unser Team richtet alles mit dir ein und ist per WhatsApp und E-Mail für dich da.");
    kurz.push("Für die Daten deiner Kunden schließen wir mit dir einen Auftragsverarbeitungsvertrag (AVV) nach Art. 28 DSGVO.");
    kurz.push("Nur für Unternehmer (§ 14 BGB), deshalb kein Widerrufsrecht wie für Verbraucher.");
    var oben = p === "monatlich" && !geschenk ? [
      "Monatlich kündbar, keine Mindestlaufzeit.",
      "0 % Provision, nur die Zahlungsgebühren von Stripe.",
      "Unser Team richtet alles mit dir ein, per WhatsApp.",
    ] : kurz.slice(0, 3);
    var li = function (x) { return "<li>" + TF.esc(x) + "</li>"; };
    document.getElementById("kurz").innerHTML = oben.map(li).join("");
    document.getElementById("kurz-mehr").innerHTML = kurz.map(li).join("");
  }

  // „Du schließt ab als: <Name>, <Studio>“ unter dem Knopf (sobald etwas eingetragen ist)
  function alsZeile() {
    var n = val("inhaber"), s = val("firma"), el = document.getElementById("anm-als");
    el.classList.toggle("hidden", !(n || s));
    el.innerHTML = n || s ? "Du schließt ab als: <b>" + TF.esc([n, s].filter(Boolean).join(", ")) + "</b>" : "";
  }

  function daten() {
    var adr = mitAdresse();
    return {
      paket: paket(), modell: modell(), zahlart: zahlart(), geschenk: geschenk || undefined, firma: val("firma"), inhaber: val("inhaber"),
      ustid: adr ? val("ustid") : "", strasse: adr ? val("strasse") : "", plz: adr ? val("plz") : "", ort: adr ? val("ort") : "",
      email: val("email"), telefon: val("telefon"),
      // Studio-Telefon leer = Handynummer (Server), Unterzeichner/in = Inhaber/in
      studioTelefon: "", unterzeichner: val("inhaber"),
    };
  }
  function merken() { try { var d = daten(); delete d.geschenk; sessionStorage.setItem("tf-start", JSON.stringify(d)); } catch (e) {} }

  function setze(d) {
    Object.keys(d || {}).forEach(function (k) {
      var el = f.elements[k];
      if (!el || d[k] === undefined || d[k] === null) return;
      if (el instanceof RadioNodeList) { var r = f.querySelector('input[name="' + k + '"][value="' + d[k] + '"]'); if (r) r.checked = true; }
      else if (el.type !== "checkbox") el.value = d[k];
    });
    alsZeile();
  }
  // Paket aus Paket- oder Modell-Angabe setzen (Aliase)
  function setzePaket(x) {
    var k = String(x || "").toLowerCase(), p = ALIAS[k];
    if (p) setze({ paket: p });
    else if (GESCHLOSSEN[k] && !geschenk) show(HINWEIS_RISIKOFREI, "info");
  }

  f.addEventListener("change", function (e) { if (e.target.name === "paket" || e.target.name === "zahlart") ansicht(); merken(); });
  f.addEventListener("input", function (e) { if (e.target.name === "firma" || e.target.name === "inhaber") alsZeile(); if (e.target.getAttribute("aria-invalid") === "true" && e.target.value.trim()) e.target.setAttribute("aria-invalid", "false"); });

  f.addEventListener("submit", async function (e) {
    e.preventDefault();
    if (sendet) return;
    var err = pruefe(); show(err);
    if (err) return;
    var btn = document.getElementById("submit");
    sendet = true; btn.disabled = true; var html = btn.innerHTML; btn.textContent = "Einen Moment …";
    // Messung genau 1× beim Absenden (vorher beim Schrittwechsel): Meta InitiateCheckout + Umami „checkout-weiter“
    if (window.TFTrack) TFTrack.track("InitiateCheckout", { content_name: "Paket " + (geschenk ? "Geschenk" : NAMEN[paket()] || "Monatlich") }, "ic-" + new Date().toISOString().slice(0, 10));
    try { if (window.umami) window.umami.track("checkout-weiter", { paket: geschenk ? "geschenk" : paket() }); } catch (x) {}
    try {
      var d = daten();
      // Ein Häkchen deckt Vertrag, AVV, Unternehmer und KMU ab (Satz am Häkchen, Server speichert Version, Zeit, IP, Browser und Name)
      d.akzeptiert = { vertrag: true, avv: true, unternehmer: true, kmu: true };
      if (resumeId) d.resumeId = resumeId;
      // Herkunft (Werbung/Instagram) aus der Adresse mitschicken, ohne etwas im Browser zu speichern
      var qu = {}; ["utm_source", "utm_medium", "utm_campaign", "utm_content"].forEach(function (k) { var v = q.get(k); if (v) qu[k.slice(4)] = v; });
      if (Object.keys(qu).length) d.quelle = qu;
      var r = await TF.api("/api/signup", { body: d });
      try { sessionStorage.removeItem("tf-start"); } catch (e2) {}
      location.href = r.url || r.next;
    } catch (err2) {
      sendet = false; show(err2.message); btn.disabled = false; btn.innerHTML = html;
      if (err2.status === 409) alertBox.insertAdjacentHTML("beforeend", '<p><a class="btn dark small" href="/login.html">Zum Login</a></p>');
      alertBox.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  });

  // Vertragstext in die Box laden (erst beim Aufklappen, spart Daten am Handy)
  var vertragGeladen = false;
  function vertragLaden() {
    if (vertragGeladen) return; vertragGeladen = true;
    fetch("/vertrag.html").then(function (r) { return r.text(); }).then(function (t) {
      var m = t.match(/<main class="doc">([\s\S]*?)<\/main>/);
      var box = document.getElementById("vertrag-box");
      box.innerHTML = m ? '<p style="background:#fff3cd;border:1px solid #e0b84b;border-radius:8px;padding:10px 12px;font-size:14px;margin:0 0 12px"><b>Hinweis:</b> Neu abschließen kannst du das Paket <b>Monatlich</b>.</p>' + m[1].replace(/<img[^>]*>/g, "") : "Vertrag konnte nicht geladen werden. Bitte über den Link öffnen.";
      box.querySelectorAll("[data-cfg]").forEach(function (el) { el.textContent = ""; });
      TF.config().then(function (c) {
        var map = { kaufPreis: TF.euro(c.kaufNetto), provisionSatz: c.provisionProzent + " %",
          garantieTage: c.garantieTage,
          firma: c.firma, adresse: c.adresse,
          vertragVersion: c.vertragVersion, gerichtsstand: c.gerichtsstand, geschaeftsfuehrer: c.geschaeftsfuehrer, registergericht: c.registergericht, ustid: c.ustid,
          email: c.email, marke: c.marke, produkt: c.produkt, kuendigungProvision: "jederzeit zum Monatsende", websiteUrl: location.origin, setupSupportTage: c.setupSupportTage,
          monatPreis: TF.euro(c.monatNetto), monatPreisBrutto: TF.euro(Math.round(c.monatNetto * (100 + c.ustProzent) / 100), true), nutzungJahre: c.nutzungJahre };
        box.querySelectorAll("[data-cfg]").forEach(function (el) { if (map[el.dataset.cfg] !== undefined) el.textContent = map[el.dataset.cfg]; });
      });
    }).catch(function () { vertragGeladen = false; });
  }
  document.querySelectorAll(".anm-kurz details, #kurz-box").forEach(function (d) { d.addEventListener("toggle", function () { if (d.open && d.querySelector("#vertrag-box")) vertragLaden(); }); });

  TF.config().then(function (c) {
    C = c; TF.fill(c); kurzListe();
    if (geschenk) ansicht();
    if (!c.stripeAktiv) show("Hinweis: Die Zahlung ist auf dieser Umgebung noch nicht eingerichtet (STRIPE_SECRET_KEY fehlt).", "info");
  });

  // Vorbelegung: ?modell=…, gespeicherter Entwurf (nur diese Sitzung), ?resume=<id> nach Abbruch im Checkout
  try { var alt = JSON.parse(sessionStorage.getItem("tf-start") || "{}"); if (GESCHLOSSEN[String(alt.paket || "").toLowerCase()]) alt.paket = ""; if (alt.paket && !f.querySelector('input[name=paket][value="' + alt.paket + '"]')) alt.paket = ""; setze(alt); if (!alt.paket && alt.modell) setzePaket(alt.modell); } catch (e) {}
  if (q.get("modell")) setzePaket(q.get("modell"));
  if (q.get("paket")) setzePaket(q.get("paket"));
  if (geschenk) show("Du bist eingeladen: keine Einrichtung, keine Provision – du zahlst nur die Zahlungsgebühren.", "info");
  if (q.get("resume")) {
    resumeId = q.get("resume");
    TF.api("/api/signup?id=" + encodeURIComponent(resumeId) + (q.get("t") ? "&t=" + encodeURIComponent(q.get("t")) : "")).then(function (d) {
      setze(d); if (d.paket) setzePaket(d.paket);
      ansicht();
      if (q.get("abbruch")) {
        try { if (window.umami) window.umami.track("checkout-abbruch"); } catch (x) {}
        // Angaben sind vorbelegt: Häkchen erneut setzen, dann direkt wieder zur Zahlung (Fokus auf dem Häkchen bzw. Knopf)
        show("Die Zahlung hat nicht geklappt. Kein Problem: Deine Angaben sind gespeichert. Setz unten das Häkchen, dann geht es nochmal zur Zahlung.", "info");
        alertBox.insertAdjacentHTML("beforeend", '<p style="margin:8px 0 0"><a href="https://wa.me/491624502375?text=Hi%20Tattoofin-Team%2C%20bei%20meiner%20Anmeldung%20hat%20die%20Zahlung%20nicht%20geklappt.%20K%C3%B6nnt%20ihr%20mir%20helfen%3F" target="_blank" rel="noopener" data-umami-event="whatsapp-abbruch"><b>Hängt es? Schreib unserem Team per WhatsApp, wir helfen dir sofort →</b></a></p>');
        var ziel = val("ak_alle") ? document.getElementById("submit") : f.elements.ak_alle;
        setTimeout(function () { try { ziel.focus({ preventScroll: true }); ziel.scrollIntoView({ block: "center" }); } catch (x) {} }, 50);
      }
    }).catch(function () { resumeId = null; });
  }
  ansicht();
  alsZeile();
})();
