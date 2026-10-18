(function () {
  var f = document.getElementById("f");
  var alertBox = document.getElementById("alert");
  var step = 1, C = {}, resumeId = null;
  var q = new URLSearchParams(location.search);

  function show(msg, type) { alertBox.innerHTML = msg ? '<div class="alert ' + (type || "err") + '">' + TF.esc(msg) + "</div>" : ""; }
  function val(n) { var el = f.elements[n]; return el ? (el.type === "checkbox" ? el.checked : (el.value || "").trim()) : ""; }
  function paket() { var r = f.querySelector("input[name=paket]:checked"); return r ? r.value : ""; }
  function modell() { return paket() === "profi" ? "kauf" : paket() ? "provision" : ""; }
  var G = { frei: 0, max: 10, vergeben: 0 };
  function gruender() { return paket() === "studio" && G.frei > 0 && val("gruender") === true && !geschenk; }
  function kostet() { return !geschenk && (paket() === "profi" || (paket() === "studio" && !gruender())); }
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
    if (n === 1 && !paket()) return "Bitte wähle ein Paket.";
    if (n === 1 && gruender() && !val("videoEinwilligung")) return "Für die Gründer-Aktion brauchen wir dein Okay für das kurze Erfahrungsvideo (Häkchen).";
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
  function prozent() { return paket() === "studio" ? C.studioProvisionProzent : C.provisionProzent; }
  function preisText() {
    if (geschenk) return "Geschenk: 0 € Einrichtung, keine Grundgebühr, keine Provision – du zahlst nur die normalen Gebühren von Stripe bzw. Klarna direkt an Stripe";
    if (paket() === "start") return C.provisionProzent + " % vom Zahlbetrag jeder Zahlung über Tattoofin, alles inklusive (Zahlungsgebühren und USt.), keine Einrichtungs- und keine Grundgebühr";
    if (paket() === "studio") return (gruender() ? "Einrichtung 0 € (Gründer-Aktion)" : "Einrichtung " + TF.euro(C.studioNetto) + " netto einmalig zzgl. " + C.ustProzent + " % USt.") + ", danach " + C.studioProvisionProzent + " % vom Zahlbetrag jeder Zahlung, alles inklusive, keine Grundgebühr";
    var code = val("aktionscode");
    return "Einrichtung " + TF.euro(code ? C.aktionNetto : C.kaufNetto) + " netto einmalig" + (code ? " (mit Aktionscode, wird geprüft)" : "") + " zzgl. " + C.ustProzent + " % USt., eigenes Zahlungskonto, keine Grundgebühr, keine Provision";
  }

  function final() {
    var p = paket(), z = zahlart(), html, kurz;
    var name = { start: "Start", studio: "Studio", profi: "Profi" }[p] || "";
    if (geschenk) {
      html = "<p><b>Tattoofin als Geschenk</b> · " + TF.esc(preisText()) + ".</p><p style=\"margin-bottom:0\"><b>Jetzt wird nichts bezahlt.</b> Danach landest du in deinem Studio-Bereich und legst dort in ca. 10 Minuten das Zahlungskonto deines Studios an. Halte Ausweis und Bankverbindung bereit.</p>";
      document.getElementById("submit").textContent = "Einladung annehmen";
      kurz = ["Keine Einrichtungsgebühr, keine Grundgebühr, keine Provision.", "Du zahlst nur die normalen Gebühren von Stripe bzw. Klarna, direkt an Stripe.", "Das Geld deiner Kunden landet direkt auf dem Konto deines Studios.", "Wir richten alles mit dir ein."];
    } else {
      html = "<p><b>Paket " + name + "</b> · " + TF.esc(preisText()) + ".</p>" +
        (kostet() ? (z === "rechnung" ? "<p>Die Rechnung kommt sofort per E-Mail, zahlbar in 7 Tagen. Sobald sie bezahlt ist, starten wir.</p>" : "<p>Im nächsten Schritt bezahlst du die Einrichtung sicher per Karte. Die Rechnung kommt per E-Mail.</p>")
          : "<p style=\"margin-bottom:0\"><b>Jetzt wird nichts bezahlt.</b> Danach landest du direkt in deinem Studio-Bereich und richtest dein Zahlungskonto ein (ca. 10 Minuten, Ausweis und IBAN bereithalten).</p>") +
        (p === "profi" ? "<p>" + C.garantieTage + " Tage Geld-zurück-Garantie ab Go-live.</p>" : "");
      document.getElementById("submit").textContent = kostet() ? (z === "rechnung" ? "Zahlungspflichtig bestellen (Rechnung)" : "Zahlungspflichtig bestellen & bezahlen") : "Kostenlos starten";
      kurz = p === "profi" ? [
        "Einmalig " + TF.euro(val("aktionscode") ? C.aktionNetto : C.kaufNetto) + " netto, danach keine Grundgebühr und keine Provision.",
        "Eigenes Zahlungskonto: Die Gebühren des Zahlungsanbieters (z. B. Karte ab 1,5 % + 0,25 €) zahlst du direkt an Stripe.",
        C.garantieTage + " Tage Geld-zurück-Garantie ab Go-live.",
      ] : [
        (gruender() || p === "start" ? "Keine Einrichtungsgebühr" : "Einmalig " + TF.euro(C.studioNetto) + " netto Einrichtung") + ", keine Grundgebühr.",
        prozent() + " % nur, wenn über Tattoofin Geld reinkommt. Alles inklusive, auch Zahlungsgebühren, Klarna und USt.",
        "Der Rest kommt automatisch aufs Konto deines Studios.",
        "Jederzeit zum Monatsende kündbar, mit einem Klick in der App.",
      ];
      if (gruender()) kurz.push("Gründer-Aktion: Du nimmst nach den ersten Wochen ein kurzes Erfahrungsvideo für uns auf.");
      kurz.push("Wir richten alles für dich ein und sind per WhatsApp und E-Mail für dich da.");
    }
    kurz.push("Deine Daten und die deiner Kunden verarbeiten wir DSGVO-konform (Auftragsverarbeitungsvertrag).");
    document.getElementById("final").innerHTML = "<p style=\"margin-top:0\"><b>" + TF.esc(val("firma")) + "</b></p>" + html;
    document.getElementById("kurz").innerHTML = kurz.map(function (x) { return "<li>" + TF.esc(x) + "</li>"; }).join("");
  }

  function daten() {
    return {
      paket: paket(), modell: modell(), zahlart: zahlart(), aktionscode: paket() === "profi" ? val("aktionscode") : "", geschenk: geschenk || undefined,
      gruender: gruender(), videoEinwilligung: gruender() && val("videoEinwilligung") === true, firma: val("firma"), inhaber: val("inhaber"), ustid: val("ustid"),
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

  function toggleKauf() {
    document.getElementById("kauf-extra").classList.toggle("hidden", !kostet());
    document.getElementById("aktion-feld").classList.toggle("hidden", paket() !== "profi");
    document.getElementById("gruender").classList.toggle("hidden", !(paket() === "studio" && G.frei > 0 && !geschenk));
    document.getElementById("video-l").classList.toggle("hidden", !(paket() === "studio" && val("gruender") === true));
  }

  f.addEventListener("change", function (e) { if (["paket", "gruender"].indexOf(e.target.name) >= 0) toggleKauf(); });
  f.addEventListener("click", function (e) {
    if (e.target.matches("[data-next]")) {
      var err = pruefe(step); show(err);
      if (!err && step === 1 && window.TFTrack) TFTrack.track("InitiateCheckout", { content_name: "Paket " + paket() }, "ic-" + new Date().toISOString().slice(0, 10));
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
  // ?paket=start|studio|profi (ältere Links: ?modell=provision → Start, ?modell=kauf → Profi)
  var wunsch = q.get("paket") || { provision: "start", kauf: "profi" }[q.get("modell")];
  if (wunsch) setze({ paket: wunsch });
  // Gründer-Aktion: echter Zähler vom Server
  TF.api("/api/signup?pakete=1").then(function (r) {
    G = r.gruender || G;
    var b = document.getElementById("gruender-badge");
    if (G.frei > 0) { b.textContent = "🎉 Gründer-Aktion: noch " + G.frei + " von " + G.max + " Plätzen mit 0 € Einrichtung"; b.classList.remove("hidden"); document.getElementById("gruender-stand").textContent = "Noch " + G.frei + " von " + G.max + " Plätzen frei."; }
    toggleKauf();
  }).catch(function () {});
  if (q.get("code")) setze({ aktionscode: q.get("code") });
  if (geschenk) {
    setze({ paket: "profi" });
    document.getElementById("pakete").classList.add("hidden");
    document.querySelector("section[data-step='1'] h2").textContent = "1. Deine Einladung";
    document.querySelector("section[data-step='1'] h2 + p").textContent = "Schön, dass du dabei bist!";
    var gi = document.getElementById("geschenk-info"); gi.classList.remove("hidden");
    gi.innerHTML = "<b>🎁 Du bist eingeladen.</b> Tattoofin ist für dein Studio ein Geschenk: keine Einrichtungsgebühr, keine Grundgebühr, keine Provision. Du zahlst nur die normalen Gebühren von Stripe bzw. Klarna. Dein Geld landet direkt auf dem Konto deines Studios.";
  }
  if (q.get("resume")) {
    resumeId = q.get("resume");
    TF.api("/api/signup?id=" + encodeURIComponent(resumeId)).then(function (d) {
      setze(d);
      if (q.get("abbruch")) show("Die Zahlung wurde abgebrochen. Kein Problem: Deine Angaben sind gespeichert, du kannst direkt weitermachen.", "info");
    }).catch(function () { resumeId = null; });
  }
  go(1);
})();
