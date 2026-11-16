(function () {
  var f = document.getElementById("f");
  var alertBox = document.getElementById("alert");
  var step = 1, C = {}, resumeId = null;
  var q = new URLSearchParams(location.search);

  function show(msg, type) { alertBox.innerHTML = msg ? '<div class="alert ' + (type || "err") + '">' + TF.esc(msg) + "</div>" : ""; }
  function val(n) { var el = f.elements[n]; return el ? (el.type === "checkbox" ? el.checked : (el.value || "").trim()) : ""; }
  // Paket: monatlich | einmal (alte Links ?modell=kauf → einmal). Das Paket Risikofrei gibt es seit 26.10.2026 für neue Anmeldungen nicht mehr:
  // alte Links (?paket=risikofrei, ?modell=provision, ?paket=start) und alte Entwürfe führen freundlich auf die Paketwahl, nichts wird vorgewählt.
  var ALIAS = { kauf: "monatlich", monatlich: "monatlich", einmal: "monatlich", einmalzahlung: "monatlich", profi: "monatlich" };
  var GESCHLOSSEN = { provision: 1, risikofrei: 1, start: 1 };
  var NAMEN = { monatlich: "Monatlich", einmal: "Einmalzahlung" };
  var HINWEIS_RISIKOFREI = "Das Paket Risikofrei gibt es für neue Anmeldungen nicht mehr. Tattoofin kostet jetzt 49,90 € im Monat inkl. MwSt.";
  function paket() { var r = f.querySelector("input[name=paket]:checked"); return r ? r.value : ""; }
  function modell() { return paket() ? "kauf" : ""; }
  function zahlart() { var r = f.querySelector("input[name=zahlart]:checked"); return r ? r.value : "sofort"; }

  // Vertriebs-Umbau 16.11.2026: Es gibt nur ein Paket, darum fällt Schritt 1 „Dein Preis“ weg (Preis steht oben).
  // Ausnahme: Einladungen (?geschenk) und alte Links ohne gültiges Paket behalten Schritt 1.
  var ohnePreisSchritt = false;
  function go(n) {
    if (ohnePreisSchritt && n < 2) n = 2;
    step = n;
    document.querySelectorAll("[data-step]").forEach(function (s) { s.classList.toggle("hidden", +s.dataset.step !== n); });
    document.querySelectorAll(".steps-bar span").forEach(function (s) { s.classList.toggle("on", +s.dataset.s <= n); });
    // Unterzeichner/in aus Inhaber/in vorbelegen, wenn noch leer (bleibt änderbar)
    if (n === 3 && !val("unterzeichner") && val("inhaber")) f.elements.unterzeichner.value = val("inhaber");
    if (n === 3) final();
    window.scrollTo({ top: 0, behavior: "smooth" });
    try { sessionStorage.setItem("tf-start", JSON.stringify(daten())); } catch (e) {}
  }

  function pruefe(n) {
    if (n === 1 && !paket() && !geschenk) return "Bitte wähle ein Paket.";
    if (n === 2) {
      var fehlt = ["firma", "inhaber", "strasse", "plz", "ort", "email", "telefon"].filter(function (k) { return !val(k); });
      if (fehlt.length) { f.elements[fehlt[0]].focus(); return "Bitte fülle alle Pflichtfelder aus."; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val("email"))) { f.elements.email.focus(); return "Bitte gib eine gültige E-Mail-Adresse ein."; }
    }
    if (n === 3) {
      if (!val("ak_alle")) return "Bitte setze den Haken bei Vertrag und AVV.";
      if (!val("ak_kmu")) return "Bitte bestätige, dass dein Studio ein kleines oder mittleres Unternehmen ist.";
      if (!val("unterzeichner")) { f.elements.unterzeichner.focus(); return "Bitte gib deinen Vor- und Nachnamen ein."; }
    }
    return "";
  }

  var geschenk = new URLSearchParams(location.search).get("geschenk") || "";
  function final() {
    var p = paket(), z = zahlart(), html, kurz;
    var fin = document.getElementById("final"), sub = document.getElementById("submit");
    if (geschenk) {
      html = "<p><b>Deine persönliche Einladung</b> · 0 € Einrichtung, keine Grundgebühr, keine Provision – du zahlst nur die normalen Zahlungsgebühren von Stripe bzw. Klarna direkt an Stripe.</p>" +
        "<p style=\"margin-bottom:0\"><b>Jetzt wird nichts bezahlt.</b> Danach legst du in ca. 10 Minuten das Zahlungskonto deines Studios an. Halte Ausweis und Bankverbindung bereit.</p>";
      sub.textContent = "Einladung annehmen";
      kurz = ["Keine Einrichtungsgebühr, keine Grundgebühr, keine Provision.", "Du zahlst nur die normalen Gebühren von Stripe bzw. Klarna, direkt an Stripe.", "Die Zahlungen deiner Kunden laufen auf das Konto deines Studios.", "Wir richten alles mit dir ein."];
    } else if (p === "monatlich") {
      html = "<p><b>Paket Monatlich</b> · " + TF.esc(TF.monatPreis(C.monatNetto, C.ustProzent)) + "</p>" +
        "<p>Im nächsten Schritt startest du das Abo sicher über Stripe (z. B. per Karte). Die Rechnung kommt jeden Monat automatisch per E-Mail. Danach richtest du in deinem Studio-Bereich das Zahlungskonto deines Studios ein.</p>";
      sub.textContent = "Weiter zur Zahlung · " + TF.euro(Math.round(C.monatNetto * (100 + C.ustProzent) / 100), true) + " im Monat";
      kurz = [
        TF.monatPreis(C.monatNetto, C.ustProzent) + ", keine Einrichtungsgebühr.",
        "Danach nur die Zahlungsgebühren von Stripe (je nach Zahlart ca. 1,5–3 % plus fester Betrag je Zahlung, laut Preisliste von Stripe), die du direkt an Stripe zahlst. 0 % Tattoofin-Provision.",
        "Alles läuft über dein eigenes Zahlungskonto bei Stripe. Rückbuchungen und ihre Gebühren laufen direkt über dieses Konto.",
        "Inklusive digitalem QR-Code deiner Zahlseite, zum Ausdrucken für Theke und Flyer.",
        "Monatlich kündbar zum Ende des laufenden Abrechnungsmonats, keine Mindestlaufzeit. Bereits bezahlte Monate werden nicht anteilig erstattet.",
      ];
    } else {
      html = "<p><b>Paket Einmalzahlung</b> · " + TF.esc(TF.euro(C.kaufNetto)) + " netto einmalig zzgl. " + C.ustProzent + " % USt.</p>" +
        (z === "rechnung" ? "<p>Du bekommst die Rechnung sofort per E-Mail, zahlbar in 7 Tagen. Sobald die Zahlung eingegangen ist, starten wir mit der Einrichtung. Schneller geht es mit Karte: dann legen wir sofort los.</p>"
          : "<p>Im nächsten Schritt bezahlst du sicher über Stripe, z. B. per Karte. Die Rechnung kommt automatisch per E-Mail. Danach richtest du in deinem Studio-Bereich das Zahlungskonto deines Studios ein.</p>");
      sub.textContent = z === "rechnung" ? "Zahlungspflichtig bestellen (Rechnung)" : "Zahlungspflichtig bestellen & bezahlen";
      kurz = [
        "Einmalig " + TF.euro(C.kaufNetto) + " netto. Danach keine Tattoofin-Gebühr mehr, nur die Zahlungsgebühren, die du direkt an Stripe zahlst.",
        "Inklusive digitalem QR-Code deiner Zahlseite, zum Ausdrucken für Theke und Flyer.",
        C.garantieTage + " Tage Geld-zurück-Garantie ab Go-live (Kündigung in dieser Zeit, § 6 Vertrag).",
        "Alles läuft über dein eigenes Zahlungskonto bei Stripe. Rückbuchungen und ihre Gebühren laufen direkt über dieses Konto.",
        z === "rechnung" ? "Die Einrichtung startet nach Zahlungseingang." : "Nach der Zahlung legen wir sofort los.",
      ];
    }
    fin.innerHTML = "<p style=\"margin-top:0\"><b>" + TF.esc(val("firma")) + "</b></p>" + html;
    kurz.push("Wir richten alles für dich ein und sind per WhatsApp und E-Mail für dich da.");
    kurz.push("Für die Daten deiner Kunden schließen wir mit dir einen Auftragsverarbeitungsvertrag (AVV) nach Art. 28 DSGVO.");
    kurz.push("Nur für Unternehmer (§ 14 BGB), deshalb kein Widerrufsrecht wie für Verbraucher.");
    // Runde 2 (16.11.2026): drei Punkte sichtbar, alle Punkte vollständig im aufklappbaren Teil darunter
    var oben = p === "monatlich" && !geschenk ? [
      TF.monatPreis(C.monatNetto, C.ustProzent) + ", monatlich kündbar.",
      "0 % Provision, nur die Zahlungsgebühren von Stripe.",
      "Unser Team richtet alles mit dir ein, per WhatsApp.",
    ] : kurz.slice(0, 3);
    var li = function (x) { return "<li>" + TF.esc(x) + "</li>"; };
    document.getElementById("kurz").innerHTML = oben.map(li).join("");
    document.getElementById("kurz-mehr").innerHTML = kurz.map(li).join("");
  }

  function daten() {
    return {
      paket: paket(), modell: modell(), zahlart: zahlart(), geschenk: geschenk || undefined, firma: val("firma"), inhaber: val("inhaber"), ustid: val("ustid"),
      strasse: val("strasse"), plz: val("plz"), ort: val("ort"), email: val("email"), telefon: val("telefon"),
      studioTelefon: val("studioTelefon"), website: val("website"), unterzeichner: val("unterzeichner"),
    };
  }

  function setze(d) {
    Object.keys(d || {}).forEach(function (k) {
      var el = f.elements[k];
      if (!el || d[k] === undefined || d[k] === null) return;
      if (el instanceof RadioNodeList) { var r = f.querySelector('input[name="' + k + '"][value="' + d[k] + '"]'); if (r) r.checked = true; }
      else if (el.type !== "checkbox") el.value = d[k];
    });
    toggleKauf();
  }
  // Paket aus Paket- oder Modell-Angabe setzen (Aliase)
  function setzePaket(x) {
    var k = String(x || "").toLowerCase(), p = ALIAS[k];
    if (p) setze({ paket: p });
    else if (GESCHLOSSEN[k] && !geschenk) show(HINWEIS_RISIKOFREI, "info");
  }

  function toggleKauf() { var k = document.getElementById("kauf-extra"); if (k) k.classList.toggle("hidden", paket() !== "einmal" || !!geschenk); }

  f.addEventListener("change", function (e) { if (e.target.name === "paket") toggleKauf(); });
  f.addEventListener("click", function (e) {
    if (e.target.matches("[data-next]")) {
      var err = pruefe(step); show(err);
      if (!err && step === (ohnePreisSchritt ? 2 : 1) && window.TFTrack) TFTrack.track("InitiateCheckout", { content_name: "Paket " + (NAMEN[paket()] || "Geschenk") }, "ic-" + new Date().toISOString().slice(0, 10));
      if (!err) go(step + 1);
    }
    if (e.target.matches("[data-back]")) { show(""); go(step - 1); }
  });

  f.addEventListener("submit", async function (e) {
    e.preventDefault();
    for (var i = 1; i <= 3; i++) { var err = pruefe(i); if (err) { show(err); go(i); return; } }
    var btn = document.getElementById("submit");
    btn.disabled = true; var txt = btn.textContent; btn.textContent = "Einen Moment …";
    try {
      var d = daten();
      d.akzeptiert = { vertrag: true, avv: true, unternehmer: true, kmu: true };
      if (resumeId) d.resumeId = resumeId;
      // Herkunft (Werbung/Instagram) aus der Adresse mitschicken, ohne etwas im Browser zu speichern
      var qu = {}; ["utm_source", "utm_medium", "utm_campaign", "utm_content"].forEach(function (k) { var v = new URLSearchParams(location.search).get(k); if (v) qu[k.slice(4)] = v; });
      if (Object.keys(qu).length) d.quelle = qu;
      var r = await TF.api("/api/signup", { body: d });
      try { sessionStorage.removeItem("tf-start"); } catch (e2) {}
      location.href = r.url || r.next;
    } catch (err2) {
      show(err2.message); btn.disabled = false; btn.textContent = txt;
      if (err2.status === 410) { go(1); }
      if (err2.status === 409) alertBox.insertAdjacentHTML("beforeend", '<p><a class="btn dark small" href="/login.html">Zum Login</a></p>');
    }
  });

  // Vertragstext in die Box laden
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
  });

  TF.config().then(function (c) {
    C = c; TF.fill(c);
    if (!c.stripeAktiv) show("Hinweis: Die Zahlung ist auf dieser Umgebung noch nicht eingerichtet (STRIPE_SECRET_KEY fehlt).", "info");
  });

  // Vorbelegung: ?modell=…, gespeicherter Entwurf, ?resume=<id> nach Abbruch
  try { var alt = JSON.parse(sessionStorage.getItem("tf-start") || "{}"); if (GESCHLOSSEN[String(alt.paket || "").toLowerCase()]) alt.paket = ""; setze(alt); if (!alt.paket && alt.modell) setzePaket(alt.modell); } catch (e) {}
  if (q.get("modell")) setzePaket(q.get("modell"));
  if (q.get("paket")) setzePaket(q.get("paket"));
  if (geschenk) { document.querySelector("[data-step='1'] .choice.pakete").classList.add("hidden"); document.querySelector("[data-step='1'] h2").textContent = "1. Deine Einladung"; document.querySelector("[data-step='1'] h2 + p").textContent = "Eigenes Zahlungskonto deines Studios, keine Einrichtungsgebühr, keine Provision."; show("Du bist eingeladen: keine Einrichtung, keine Provision – du zahlst nur die Zahlungsgebühren.", "info"); }
  if (q.get("resume")) {
    resumeId = q.get("resume");
    TF.api("/api/signup?id=" + encodeURIComponent(resumeId) + (q.get("t") ? "&t=" + encodeURIComponent(q.get("t")) : "")).then(function (d) {
      setze(d); if (d.paket) setzePaket(d.paket);
      if (q.get("abbruch")) {
        // Direkt zurück zum letzten Schritt (Angaben sind vorbelegt; Vertrag muss nur erneut bestätigt werden)
        if (!pruefe(1) && !pruefe(2)) go(3);
        show("Die Zahlung hat nicht geklappt. Kein Problem: Deine Angaben sind gespeichert. Bestätige unten kurz den Vertrag, dann geht es nochmal zur Zahlung.", "info");
        alertBox.insertAdjacentHTML("beforeend", '<p style="margin:8px 0 0"><a href="https://wa.me/491624502375?text=Hi%20Tattoofin-Team%2C%20bei%20meiner%20Anmeldung%20hat%20die%20Zahlung%20nicht%20geklappt.%20K%C3%B6nnt%20ihr%20mir%20helfen%3F" target="_blank" rel="noopener" data-umami-event="whatsapp-abbruch"><b>Hängt es? Schreib unserem Team per WhatsApp, wir helfen dir sofort →</b></a></p>');
      }
    }).catch(function () { resumeId = null; });
  }
  if (!geschenk && paket() === "monatlich") {
    ohnePreisSchritt = true;
    var s2 = document.querySelector("[data-step='2']"), s3 = document.querySelector("[data-step='3']");
    s2.querySelector("h2").textContent = "1. Dein Studio";
    s3.querySelector("h2").textContent = "2. Prüfen & starten";
    var zur = s2.querySelector("[data-back]"); if (zur) zur.style.visibility = "hidden";
    var p1 = document.querySelector(".steps-bar [data-s='1']"); if (p1) p1.remove();
  }
  go(1);
})();
