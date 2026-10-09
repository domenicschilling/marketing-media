(function () {
  var D = null, alertBox = document.getElementById("alert");
  var $ = function (id) { return document.getElementById(id); };
  var e = TF.esc, euro = TF.euro, dat = TF.datum;
  var STATUS = { offen: "offen", in_pruefung: "in Prüfung", bezahlt: "bezahlt", storniert: "storniert", abgebrochen: "abgebrochen", fehlgeschlagen: "fehlgeschlagen", erstattet: "erstattet" };
  function msg(t, type) { alertBox.innerHTML = t ? '<div class="alert ' + (type || "ok") + '">' + e(t) + "</div>" : ""; if (t && type !== "err") setTimeout(function () { alertBox.innerHTML = ""; }, 5000); }
  function qr(el, text) { el.innerHTML = ""; if (window.QRCode) new QRCode(el, { text: text, width: 300, height: 300, colorDark: "#13243d", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M }); }

  async function laden() {
    try { D = await TF.api("/api/portal"); }
    catch (err) { if (err.status === 401) location.href = "/login.html"; else msg(err.message, "err"); return; }
    $("app").classList.remove("hidden");
    render();
  }

  function tab() {
    var t = (location.hash || "#uebersicht").slice(1);
    if (!document.querySelector('[data-tab="' + t + '"]')) t = "uebersicht";
    document.querySelectorAll("[data-tab]").forEach(function (s) { s.classList.toggle("hidden", s.dataset.tab !== t); });
    document.querySelectorAll("#tabs a").forEach(function (a) { a.classList.toggle("on", a.getAttribute("href") === "#" + t); });
  }
  window.addEventListener("hashchange", tab);

  function render() {
    var s = D.studio, prov = s.modell === "provision", k = D.kpis;
    $("who").textContent = s.email;
    $("titel").textContent = s.firma;
    $("untertitel").innerHTML = '<span class="tag ' + e(s.status) + '">' + e(s.statusText) + "</span> · " + (prov ? D.config.provisionProzent + " % Provision" : "Setup gekauft") +
      " · Stripe: " + (s.stripe.freigegeben ? "freigegeben ✓" : s.stripe.verbunden ? "in Prüfung" : "nicht verbunden");

    var todo = [];
    if (!s.stripe.freigegeben) todo.push('🔗 <b>Stripe-Konto ' + (s.stripe.verbunden ? "fertig einrichten" : "verbinden") + '.</b> Ohne freigegebenes Konto können noch keine Zahlungen laufen. <a class="btn gold small" href="' + e(s.connectUrl) + '">Jetzt verbinden</a>');
    if (!s.fragebogenAm) todo.push('📝 <b>Fragebogen ausfüllen</b>, damit wir Branding und Zahlungsarten passend einrichten. <a class="btn dark small" href="/onboarding.html">Ausfüllen</a>');
    if (s.stripe.freigegeben && s.status === "einrichtung") todo.push("🛠️ Wir richten gerade alles ein und melden uns für Testzahlung und Teamschulung. Zahlungslinks kannst du schon erstellen.");
    $("todo").innerHTML = todo.map(function (t) { return '<div class="alert info">' + t + "</div>"; }).join("");

    $("kpis").innerHTML = [
      [euro(k.umsatzMonatCent), "Umsatz diesen Monat"], [k.zahlungenMonat, "Zahlungen diesen Monat"],
      prov ? [euro(k.provisionMonatNettoCent, true), "Provision diesen Monat (netto)"] : [euro(k.umsatzGesamtCent), "Umsatz gesamt"],
      [k.anteilKlarna + " %", "Anteil Ratenzahlung (Klarna)"],
    ].map(function (x) { return '<div class="kpi"><b>' + e(x[0]) + "</b><span>" + e(x[1]) + "</span></div>"; }).join("");

    $("neueste").innerHTML = tabelle(D.zahlungen.slice(0, 6));
    renderZahlungen();
    renderAbr();

    $("zs-url").value = s.zahlseite; $("zs-open").href = s.zahlseite; qr($("zs-qr"), s.zahlseite);
    $("mat").innerHTML = D.materialLinks.map(function (m) { return '<a class="card" style="text-decoration:none" target="_blank" href="' + e(m.url) + '"><h3>' + e(m.titel) + ' →</h3><p>Mit ' + e(s.firma) + " und deinem QR-Code</p></a>"; }).join("");
    $("fb-status").textContent = s.fragebogenAm ? "Zuletzt gespeichert am " + dat(s.fragebogenAm) + ". Änderungen jederzeit möglich." : "Noch nicht ausgefüllt.";

    $("vertrag-info").innerHTML = '<table class="tbl">' +
      "<tr><th>Modell</th><td>" + (prov ? "Provision: " + D.config.provisionProzent + " % zzgl. USt. vom Betrag jeder Zahlung über Tattoofin, automatisch einbehalten" : "Kauf: Setup " + euro(s.preisNetto) + " netto einmalig, keine Provision") + "</td></tr>" +
      "<tr><th>Abgeschlossen</th><td>" + dat(s.vertrag.akzeptiertAm) + " von " + e(s.vertrag.name) + " (Version " + e(s.vertrag.version) + ")</td></tr>" +
      "<tr><th>Live seit</th><td>" + (s.goLiveAt ? dat(s.goLiveAt) : "noch in Einrichtung") + "</td></tr>" +
      (s.garantieBis ? "<tr><th>Geld-zurück-Garantie</th><td>" + (s.goLiveAt ? "bis " + dat(s.garantieBis) : D.config.garantieTage + " Tage ab Go-live") + "</td></tr>" : "") +
      (s.kuendigung ? "<tr><th>Kündigung</th><td>zum " + dat(s.kuendigung.zum) + "</td></tr>" : "") + "</table>";
    renderKuendigung(s);

    $("stripe-info").innerHTML = s.stripe.freigegeben
      ? '<p>✅ Dein Stripe-Konto ist verbunden und freigegeben. Auszahlungen, Gebühren, Erstattungen und Belege verwaltest du direkt bei Stripe.</p><a class="btn dark" target="_blank" href="https://dashboard.stripe.com/">Stripe-Dashboard öffnen</a>'
      : '<p>Dein Stripe-Konto ist ' + (s.stripe.verbunden ? "angelegt, aber noch nicht freigegeben. Stripe prüft deine Angaben oder es fehlen noch Daten." : "noch nicht verbunden.") + '</p><a class="btn gold" href="' + e(s.connectUrl) + '">' + (s.stripe.verbunden ? "Einrichtung fortsetzen" : "Stripe-Konto verbinden") + "</a>";
    $("k-email").value = s.benachrichtigung.email || "";
    feeHinweis();
    tab();
  }

  function tabelle(list, actions) {
    if (!list.length) return '<p class="muted">Noch keine Zahlungen. Erstelle deinen ersten <a href="#anfordern">Zahlungslink</a>.</p>';
    var prov = D.studio.modell === "provision";
    return '<table class="tbl"><tr><th>Datum</th><th>Kunde</th><th>Projekt</th><th>Betrag</th><th>Status</th><th>Zahlart</th>' + (prov ? "<th>Provision</th>" : "") + (actions ? "<th></th>" : "") + "</tr>" +
      list.map(function (z) {
        var link = location.origin + "/zahlung.html?z=" + z.id;
        return "<tr><td>" + dat(z.bezahltAm || z.createdAt) + "</td><td>" + e(z.kunde || "–") + (z.email ? "<br><small class='muted'>" + e(z.email) + "</small>" : "") + "</td><td>" + e(z.beschreibung) + (z.art === "anzahlung" ? " <small class='muted'>(Anzahlung)</small>" : "") + (z.art === "zahlseite" ? " <small class='muted'>(Zahlseite)</small>" : "") +
          "</td><td><b>" + euro(z.betragCent, true) + "</b></td><td><span class=\"tag " + e(z.status) + "\">" + e(STATUS[z.status] || z.status) + "</span></td><td>" + e(z.zahlartText || "–") + "</td>" +
          (prov ? "<td>" + (z.status === "bezahlt" || z.status === "erstattet" ? euro(z.gebuehrNettoCent || 0, true) : "–") + "</td>" : "") +
          (actions ? "<td>" + (z.status === "offen" ? '<button class="btn ghost small" data-copytext="' + e(link) + '">Link</button> <button class="btn ghost small" data-storno="' + e(z.id) + '">Stornieren</button>' : "") + "</td>" : "") + "</tr>";
      }).join("") + "</table>";
  }

  function renderZahlungen() {
    var f = $("filter").value;
    $("z-liste").innerHTML = tabelle(D.zahlungen.filter(function (z) { return f === "alle" || z.status === f; }), true);
  }

  function renderAbr() {
    var html = "";
    if (D.studio.modell !== "provision") html = '<p class="muted">Im Kaufmodell fällt keine Provision an. Deine Setup-Rechnung findest du unter „Konto“.</p>';
    else if (!D.abrechnungen.length) html = '<p class="muted">Noch keine Abrechnungen. Die erste kommt am 1. des Folgemonats nach deiner ersten Zahlung über Tattoofin.</p>';
    else html = '<table class="tbl"><tr><th>Monat</th><th>Zahlungen</th><th>Umsatz</th><th>Provision netto</th><th>inkl. USt.</th><th>Rechnung</th></tr>' +
      D.abrechnungen.map(function (a) {
        return "<tr><td>" + e(a.monat) + "</td><td>" + a.positionen.length + "</td><td>" + euro(a.umsatzCent, true) + "</td><td>" + euro(a.provisionNettoCent, true) + "</td><td>" + euro(a.provisionBruttoCent, true) +
          "</td><td>" + (a.rechnungUrl ? '<a target="_blank" href="' + e(a.rechnungUrl) + '">' + e(a.rechnungNr || "öffnen") + "</a>" : "–") + "</td></tr>";
      }).join("") + "</table><p class='muted' style='font-size:13px'>Die Provision wurde bei jeder Zahlung bereits automatisch einbehalten. Die Rechnung ist für deine Buchhaltung.</p>";
    $("abr").innerHTML = html;
  }

  function renderKuendigung(s) {
    var p = $("kuendigen-panel");
    if (s.status === "gekuendigt") {
      p.innerHTML = "<h2>Gekündigt</h2><p>Dein Vertrag endet am <b>" + dat(s.kuendigung.zum) + "</b>." + (s.kuendigung.garantie ? " Die Erstattung (Garantie) wird gerade bearbeitet." : "") + "</p>" +
        (s.kuendigung.garantie ? "" : '<button class="btn gold" id="k-zurueck">Kündigung zurücknehmen</button>');
      var z = $("k-zurueck"); if (z) z.onclick = async function () { try { await TF.api("/api/portal/kuendigung", { method: "DELETE" }); msg("Kündigung zurückgenommen. Schön, dass du bleibst!"); laden(); } catch (err) { msg(err.message, "err"); } };
      return;
    }
    if (["beendet", "erstattet"].includes(s.status)) { p.innerHTML = '<h2>Vertrag beendet</h2><p class="muted">Der Vertrag ist beendet. Dein Stripe-Konto bleibt bei dir.</p>'; return; }
    var garantie = s.modell === "kauf" && s.garantieBis && (s.garantieBis === "ab Go-live" || new Date(s.garantieBis) > new Date());
    p.innerHTML = "<h2>Kündigen</h2><p class=\"muted\">Du kannst jederzeit zum Monatsende kündigen. Dein Stripe-Konto bleibt bei deinem Studio." + (garantie ? " Du bist noch in der Garantiezeit: Mit der Geld-zurück-Garantie erstatten wir dir den vollen Setup-Preis." : "") + "</p>" +
      '<div class="field"><label>Was hat nicht gepasst? (optional, hilft uns sehr)</label><textarea id="k-grund"></textarea></div>' +
      (garantie ? '<label class="check"><input type="checkbox" id="k-garantie"> <span>Geld-zurück-Garantie nutzen (Vertrag endet sofort)</span></label>' : "") +
      '<button class="btn ghost" id="k-btn" style="color:var(--red)">Vertrag kündigen</button>';
    $("k-btn").onclick = async function () {
      if (!confirm("Willst du Tattoofin wirklich kündigen?")) return;
      try { await TF.api("/api/portal/kuendigung", { body: { grund: $("k-grund").value, garantie: $("k-garantie") ? $("k-garantie").checked : false } }); msg("Kündigung ist eingegangen. Du bekommst eine Bestätigung per E-Mail."); laden(); }
      catch (err) { msg(err.message, "err"); }
    };
  }

  function feeHinweis() {
    var b = parseFloat(($("l-betrag").value || "").replace(/\./g, "").replace(",", "."));
    var prov = D.studio.modell === "provision";
    $("l-fee").textContent = b > 0 && prov ? "Tattoofin-Provision: " + euro(Math.round(b * D.config.provisionProzent), true) + " netto (" + euro(Math.round(b * D.config.provisionProzent * (100 + D.config.ustProzent) / 100), true) + " inkl. USt.), wird automatisch einbehalten." : "";
  }
  $("l-betrag").addEventListener("input", feeHinweis);

  $("f-link").addEventListener("submit", async function (ev) {
    ev.preventDefault();
    try {
      var r = await TF.api("/api/portal/zahlung", { body: { betrag: $("l-betrag").value, art: $("l-art").value, kunde: $("l-kunde").value, email: $("l-email").value, beschreibung: $("l-beschreibung").value } });
      var wa = "https://wa.me/?text=" + encodeURIComponent(r.whatsappText);
      $("l-out").innerHTML = '<div class="link-out"><div><b>Zahlungslink für ' + e(r.zahlung.kunde || "deinen Kunden") + " über " + euro(r.zahlung.betragCent, true) + '</b><input type="text" id="l-url" readonly value="' + e(r.link) + '" style="margin-top:8px"><div class="row-btns"><a class="btn gold small" target="_blank" href="' + e(wa) + '">Per WhatsApp senden</a><button class="btn dark small" data-copy="l-url">Link kopieren</button></div></div><div class="qr" id="l-qr"></div></div>';
      qr($("l-qr"), r.link);
      $("f-link").reset(); feeHinweis();
      D = await TF.api("/api/portal"); renderZahlungen(); $("neueste").innerHTML = tabelle(D.zahlungen.slice(0, 6));
    } catch (err) { msg(err.message, "err"); }
  });

  document.addEventListener("click", async function (ev) {
    var t = ev.target;
    if (t.matches("[data-copy]")) { navigator.clipboard.writeText($(t.dataset.copy).value); t.textContent = "Kopiert ✓"; }
    if (t.matches("[data-copytext]")) { navigator.clipboard.writeText(t.dataset.copytext); t.textContent = "Kopiert ✓"; }
    if (t.matches("[data-storno]")) {
      if (!confirm("Zahlungslink stornieren?")) return;
      try { await TF.api("/api/portal/zahlung/" + t.dataset.storno, { method: "DELETE" }); D = await TF.api("/api/portal"); renderZahlungen(); msg("Storniert."); } catch (err) { msg(err.message, "err"); }
    }
  });
  $("filter").addEventListener("change", renderZahlungen);
  $("rechnungen").onclick = async function () { try { location.href = (await TF.api("/api/portal/rechnungen", { method: "POST" })).url; } catch (err) { msg(err.message, "err"); } };
  $("k-save").onclick = async function () { try { await TF.api("/api/portal/kontakt", { method: "PATCH", body: { email: $("k-email").value } }); msg("Gespeichert."); } catch (err) { msg(err.message, "err"); } };
  $("logout").onclick = async function (ev) { ev.preventDefault(); await TF.api("/api/logout", { method: "POST" }); location.href = "/"; };
  laden();
})();
