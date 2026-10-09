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
    if (n === 3) summary();
    if (n === 4) final();
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
      if (!val("ak_vertrag") || !val("ak_avv") || !val("ak_unternehmer")) return "Bitte bestätige Vertrag, AVV und dass du als Unternehmer bestellst.";
      if (!val("unterzeichner")) { f.elements.unterzeichner.focus(); return "Bitte gib deinen Namen als Unterzeichner an."; }
    }
    return "";
  }

  function preisText() {
    if (modell() === "provision") return C.provisionProzent + " % vom Zahlbetrag jeder Zahlung über Tattoofin, alles inklusive (Gebühren der Zahlungsanbieter und USt.), Auszahlung von " + (100 - C.provisionProzent) + " % automatisch durch Stripe, keine Einrichtungs- und keine Grundgebühr";
    var code = val("aktionscode");
    return "Setup " + TF.euro(code ? C.aktionNetto : C.kaufNetto) + " netto einmalig" + (code ? " (mit Aktionscode, wird geprüft)" : "") + " zzgl. " + C.ustProzent + " % USt., keine Grundgebühr, keine Provision";
  }

  function summary() {
    document.getElementById("summary").innerHTML = "<b>" + TF.esc(val("firma")) + "</b> · " +
      (modell() === "kauf" ? "Kauf" : "Provision") + "<br>" + TF.esc(preisText());
  }

  function final() {
    var m = modell(), z = zahlart(), html;
    if (m === "provision") {
      html = "<p>Du schließt das <b>Provisionsmodell</b> ab: " + TF.esc(preisText()) + ".</p>" +
        "<p><b>Jetzt wird nichts bezahlt.</b> Im nächsten Schritt richtest du bei Stripe das Auszahlungskonto deines Studios ein (ca. 10 Minuten, Ausweis und Bankverbindung bereithalten). Darauf zahlt Stripe dir später automatisch " + (100 - C.provisionProzent) + " % jeder Kundenzahlung aus.</p>";
      document.getElementById("submit").textContent = "Vertrag abschließen & Stripe-Konto verbinden";
    } else {
      html = "<p>Du kaufst das <b>Tattoofin Setup</b>: " + TF.esc(preisText()) + ".</p>" +
        (z === "rechnung" ? "<p>Du bekommst die Rechnung sofort per E-Mail, zahlbar in 14 Tagen. Wir starten trotzdem schon mit der Einrichtung.</p>"
          : "<p>Im nächsten Schritt bezahlst du sicher über Stripe (Karte, SEPA-Lastschrift u. a.). Die Rechnung kommt automatisch per E-Mail. Danach verbindest du das Stripe-Konto deines Studios.</p>") +
        "<p>" + C.garantieTage + " Tage Geld-zurück-Garantie ab Go-live.</p>";
      document.getElementById("submit").textContent = z === "rechnung" ? "Zahlungspflichtig bestellen (Rechnung)" : "Zahlungspflichtig bestellen & bezahlen";
    }
    document.getElementById("final").innerHTML = html;
  }

  function daten() {
    return {
      modell: modell(), zahlart: zahlart(), aktionscode: val("aktionscode"), firma: val("firma"), inhaber: val("inhaber"), ustid: val("ustid"),
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

  function toggleKauf() { document.getElementById("kauf-extra").classList.toggle("hidden", modell() !== "kauf"); }

  f.addEventListener("change", function (e) { if (e.target.name === "modell") toggleKauf(); });
  f.addEventListener("click", function (e) {
    if (e.target.matches("[data-next]")) { var err = pruefe(step); show(err); if (!err) go(step + 1); }
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
  if (q.get("resume")) {
    resumeId = q.get("resume");
    TF.api("/api/signup?id=" + encodeURIComponent(resumeId)).then(function (d) {
      setze(d);
      if (q.get("abbruch")) show("Die Zahlung wurde abgebrochen. Kein Problem: Deine Angaben sind gespeichert, du kannst direkt weitermachen.", "info");
    }).catch(function () { resumeId = null; });
  }
  go(1);
})();
