(function () {
  var f = document.getElementById("f");
  var alertBox = document.getElementById("alert");
  var step = 1, C = {}, resumeId = null;
  var q = new URLSearchParams(location.search);

  function show(msg, type) { alertBox.innerHTML = msg ? '<div class="alert ' + (type || "err") + '">' + TF.esc(msg) + "</div>" : ""; }
  function val(n) { var el = f.elements[n]; return el ? (el.type === "checkbox" ? el.checked : (el.value || "").trim()) : ""; }
  function modell() { var r = f.querySelector("input[name=modell]:checked"); return r ? r.value : ""; }
  function zahlart() { var r = f.querySelector("input[name=zahlart]:checked"); return r ? r.value : "sofort"; }

  function go(n) {
    step = n;
    document.querySelectorAll("[data-step]").forEach(function (s) { s.classList.toggle("hidden", +s.dataset.step !== n); });
    document.querySelectorAll(".steps-bar span").forEach(function (s) { s.classList.toggle("on", +s.dataset.s <= n); });
    if (n === 3) final();
    window.scrollTo({ top: 0, behavior: "smooth" });
    try { sessionStorage.setItem("tf-start", JSON.stringify(daten())); } catch (e) {}
  }

  function pruefe(n) {
    if (n === 1 && !modell()) return "Bitte wähle Provision oder Kauf.";
    if (n === 2) {
      var fehlt = ["firma", "inhaber", "strasse", "plz", "ort", "email", "telefon", "studioTelefon"].filter(function (k) { return !val(k); });
      if (fehlt.length) { f.elements[fehlt[0]].focus(); return "Bitte fülle alle Pflichtfelder aus."; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val("email"))) { f.elements.email.focus(); return "Bitte gib eine gültige E-Mail-Adresse ein."; }
    }
    if (n === 3) {
      if (!val("ak_alle")) return "Bitte setze den Haken bei Vertrag und AVV.";
      if (!val("unterzeichner")) { f.elements.unterzeichner.focus(); return "Bitte gib deinen Namen ein (gilt als Unterschrift)."; }
    }
    return "";
  }

  var geschenk = new URLSearchParams(location.search).get("geschenk") || "";
  function preisText() {
    if (geschenk) return "Geschenk: 0 € Einrichtung, keine Grundgebühr, keine Provision – du zahlst nur die normalen Gebühren von Stripe bzw. Klarna direkt an Stripe";
    if (modell() === "provision") return C.provisionProzent + " % vom Zahlbetrag jeder Zahlung über Tattoofin, alles inklusive (Zahlungsgebühren und USt.), " + (100 - C.provisionProzent) + " % kommen automatisch auf dein Konto, keine Einrichtungs- und keine Grundgebühr";
    var code = val("aktionscode");
    return "Setup " + TF.euro(code ? C.aktionNetto : C.kaufNetto) + " netto einmalig" + (code ? " (mit Aktionscode, wird geprüft)" : "") + " zzgl. " + C.ustProzent + " % USt., keine Grundgebühr, keine Provision";
  }

  function final() {
    var m = modell(), z = zahlart(), html;
    if (geschenk) {
      html = "<p><b>Tattoofin als Geschenk</b> · " + TF.esc(preisText()) + ".</p>" +
        "<p style=\"margin-bottom:0\"><b>Jetzt wird nichts bezahlt.</b> Danach legst du in ca. 10 Minuten das Zahlungskonto deines Studios an. Halte Ausweis und Bankverbindung bereit.</p>";
      document.getElementById("submit").textContent = "Einladung annehmen";
      document.getElementById("final").innerHTML = "<p style=\"margin-top:0\"><b>" + TF.esc(val("firma")) + "</b></p>" + html;
      document.getElementById("kurz").innerHTML = ["Keine Einrichtungsgebühr, keine Grundgebühr, keine Provision.", "Du zahlst nur die normalen Gebühren von Stripe bzw. Klarna, direkt an Stripe.", "Das Geld deiner Kunden landet direkt auf dem Konto deines Studios.", "Wir richten alles mit dir ein.", "Deine Daten und die deiner Kunden verarbeiten wir DSGVO-konform (Auftragsverarbeitungsvertrag)."].map(function (x) { return "<li>" + TF.esc(x) + "</li>"; }).join("");
      return;
    }
    if (m === "provision") {
      html = "<p><b>Provisionsmodell</b> · " + C.provisionProzent + " % pro Zahlung, alles inklusive</p>" +
        "<p style=\"margin-bottom:0\"><b>Jetzt wird nichts bezahlt.</b> Danach legst du in ca. 10 Minuten dein Auszahlungskonto an. Halte Ausweis und Bankverbindung bereit.</p>";
      document.getElementById("submit").textContent = "Kostenlos starten";
    } else {
      html = "<p>Du kaufst das <b>Tattoofin Setup</b>: " + TF.esc(preisText()) + ".</p>" +
        (z === "rechnung" ? "<p>Du bekommst die Rechnung sofort per E-Mail, zahlbar in 7 Tagen. Sobald die Zahlung eingegangen ist, starten wir mit der Einrichtung. Schneller geht es mit Karte: dann legen wir sofort los.</p>"
          : "<p>Im nächsten Schritt bezahlst du sicher per Karte, SEPA-Lastschrift u. a. Die Rechnung kommt automatisch per E-Mail. Danach legst du das Auszahlungskonto deines Studios an.</p>") +
        "<p>" + C.garantieTage + " Tage Geld-zurück-Garantie ab Go-live.</p>";
      document.getElementById("submit").textContent = z === "rechnung" ? "Zahlungspflichtig bestellen (Rechnung)" : "Zahlungspflichtig bestellen & bezahlen";
    }
    document.getElementById("final").innerHTML = "<p style=\"margin-top:0\"><b>" + TF.esc(val("firma")) + "</b></p>" + html;
    var kurz = m === "provision" ? [
      "Keine Einrichtungsgebühr, keine Grundgebühr: Jetzt wird nichts bezahlt.",
      C.provisionProzent + " % nur, wenn über Tattoofin Geld reinkommt. Alles inklusive, auch Zahlungsgebühren, Klarna und USt.",
      "Der Rest kommt automatisch aufs Konto deines Studios.",
      "Jederzeit zum Monatsende kündbar, mit einem Klick im Portal.",
      "Wir richten alles für dich ein und sind per WhatsApp und E-Mail für dich da.",
    ] : [
      "Einmalig " + TF.euro(val("aktionscode") ? C.aktionNetto : C.kaufNetto) + " netto, danach keine Grundgebühr und keine Provision.",
      C.garantieTage + " Tage Geld-zurück-Garantie ab Go-live.",
      "Alles läuft über dein eigenes Zahlungskonto.",
      z === "rechnung" ? "Die Einrichtung startet nach Zahlungseingang." : "Nach der Zahlung legen wir sofort los.",
      "Wir richten alles für dich ein und sind per WhatsApp und E-Mail für dich da.",
    ];
    kurz.push("Deine Daten und die deiner Kunden verarbeiten wir DSGVO-konform (Auftragsverarbeitungsvertrag).");
    document.getElementById("kurz").innerHTML = kurz.map(function (x) { return "<li>" + TF.esc(x) + "</li>"; }).join("");
  }

  function daten() {
    return {
      modell: modell(), zahlart: zahlart(), aktionscode: val("aktionscode"), geschenk: geschenk || undefined, firma: val("firma"), inhaber: val("inhaber"), ustid: val("ustid"),
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

  function toggleKauf() { document.getElementById("kauf-extra").classList.toggle("hidden", modell() !== "kauf" || !!geschenk); }

  f.addEventListener("change", function (e) { if (e.target.name === "modell") toggleKauf(); });
  f.addEventListener("click", function (e) {
    if (e.target.matches("[data-next]")) {
      var err = pruefe(step); show(err);
      if (!err && step === 1 && window.TFTrack) TFTrack.track("InitiateCheckout", { content_name: modell() === "kauf" ? "Kauf" : "Provisionsmodell" }, "ic-" + new Date().toISOString().slice(0, 10));
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
      d.akzeptiert = { vertrag: true, avv: true, unternehmer: true };
      if (resumeId) d.resumeId = resumeId;
      var r = await TF.api("/api/signup", { body: d });
      try { sessionStorage.removeItem("tf-start"); } catch (e2) {}
      location.href = r.url || r.next;
    } catch (err2) {
      show(err2.message); btn.disabled = false; btn.textContent = txt;
      if (err2.status === 409) alertBox.insertAdjacentHTML("beforeend", '<p><a class="btn dark small" href="/login.html">Zum Login</a></p>');
    }
  });

  // Vertragstext in die Box laden
  fetch("/vertrag.html").then(function (r) { return r.text(); }).then(function (t) {
    var m = t.match(/<main class="doc">([\s\S]*?)<\/main>/);
    var box = document.getElementById("vertrag-box");
    box.innerHTML = m ? m[1].replace(/<img[^>]*>/g, "") : "Vertrag konnte nicht geladen werden. Bitte über den Link öffnen.";
    box.querySelectorAll("[data-cfg]").forEach(function (el) { el.textContent = ""; });
    TF.config().then(function (c) {
      var map = { kaufPreis: TF.euro(c.kaufNetto), kaufAktionPreis: TF.euro(c.aktionNetto), provisionSatz: c.provisionProzent + " %", 
        garantieTage: c.garantieTage,
        firma: c.firma, adresse: c.adresse,
        vertragVersion: c.vertragVersion, gerichtsstand: c.gerichtsstand, geschaeftsfuehrer: c.geschaeftsfuehrer, registergericht: c.registergericht, ustid: c.ustid,
        email: c.email, marke: c.marke, produkt: c.produkt, kuendigungProvision: "jederzeit zum Monatsende", websiteUrl: location.origin, setupSupportTage: c.setupSupportTage, kuendigungProvision: "jederzeit zum Monatsende" };
      box.querySelectorAll("[data-cfg]").forEach(function (el) { if (map[el.dataset.cfg] !== undefined) el.textContent = map[el.dataset.cfg]; });
    });
  });

  TF.config().then(function (c) {
    C = c; TF.fill(c);
    if (!c.stripeAktiv) show("Hinweis: Die Zahlung ist auf dieser Umgebung noch nicht eingerichtet (STRIPE_SECRET_KEY fehlt).", "info");
  });

  // Vorbelegung: ?modell=…, gespeicherter Entwurf, ?resume=<id> nach Abbruch
  try { setze(JSON.parse(sessionStorage.getItem("tf-start") || "{}")); } catch (e) {}
  if (q.get("modell")) setze({ modell: q.get("modell") });
  if (q.get("code")) setze({ aktionscode: q.get("code") });
  if (geschenk) { setze({ modell: "kauf" }); show("Du bist eingeladen: Tattoofin ist für dein Studio ein Geschenk – ohne Einrichtung und ohne Provision.", "info"); }
  if (q.get("resume")) {
    resumeId = q.get("resume");
    TF.api("/api/signup?id=" + encodeURIComponent(resumeId)).then(function (d) {
      setze(d);
      if (q.get("abbruch")) show("Die Zahlung wurde abgebrochen. Kein Problem: Deine Angaben sind gespeichert, du kannst direkt weitermachen.", "info");
    }).catch(function () { resumeId = null; });
  }
  go(1);
})();
