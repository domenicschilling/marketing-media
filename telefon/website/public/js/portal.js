(function () {
  var D = null, alertBox = document.getElementById("alert");
  var $ = function (id) { return document.getElementById(id); };
  var e = Ted.esc, euro = Ted.euro, dat = Ted.datum;
  function msg(t, type) { alertBox.innerHTML = t ? '<div class="alert ' + (type || "ok") + '">' + e(t) + "</div>" : ""; if (t) setTimeout(function () { alertBox.innerHTML = ""; }, 5000); }
  var STATUS = { offen: "offen", gebucht: "Termin", kein_termin: "kein Termin" };

  async function laden() {
    try { D = await Ted.api("/api/portal"); }
    catch (err) { if (err.status === 401) location.href = "/login.html"; else msg(err.message, "err"); return; }
    $("app").classList.remove("hidden");
    render();
  }

  function tab() {
    var t = (location.hash || "#uebersicht").slice(1).split("-")[0];
    if (t === "anfrage") t = "anfragen";
    document.querySelectorAll("[data-tab]").forEach(function (s) { s.classList.toggle("hidden", s.dataset.tab !== t); });
    document.querySelectorAll("#tabs a").forEach(function (a) { a.classList.toggle("on", a.getAttribute("href") === "#" + t); });
  }
  window.addEventListener("hashchange", tab);

  function render() {
    var s = D.studio, prov = s.modell === "provision", monat = new Date().toISOString().slice(0, 7);
    $("who").textContent = s.email;
    $("titel").textContent = s.firma;
    $("untertitel").innerHTML = '<span class="tag ' + e(s.status) + '">' + e(s.statusText) + "</span> · " + (prov ? D.config.provisionProzent + " % Provision" : "Kaufpaket") +
      (s.tedNummer ? " · Ted-Nummer: <b>" + e(s.tedNummer) + "</b>" : "");

    var dieserMonat = D.anfragen.filter(function (a) { return a.createdAt.slice(0, 7) === monat; });
    var offen = D.anfragen.filter(function (a) { return a.status === "offen"; });
    var vor = prov && D.vorschau ? D.vorschau[monat] : null;
    $("kpis").innerHTML = [
      [dieserMonat.length, "Anfragen diesen Monat"],
      [dieserMonat.filter(function (a) { return a.status === "gebucht"; }).length, "davon Termine"],
      [Math.ceil(D.minuten.minuten) + " / " + D.config.fairUseMinuten, "Gesprächsminuten"],
      prov ? [euro(vor ? vor.summeNetto : 0, true), "Provision bisher (netto)"] : [offen.length, "offene Anfragen"],
    ].map(function (k) { return '<div class="kpi"><b>' + e(k[0]) + "</b><span>" + e(k[1]) + "</span></div>"; }).join("");

    var todo = [];
    if (!s.fragebogenAm) todo.push('📝 <b>Fragebogen ausfüllen</b>, damit wir Ted für euch einrichten können. <a class="btn gold small" href="/onboarding.html">Jetzt ausfüllen</a>');
    if (prov && offen.length) todo.push("📞 <b>" + offen.length + " Anfrage" + (offen.length === 1 ? "" : "n") + " ohne Status.</b> Bitte eintragen, ob ein Termin daraus wurde. <a href=\"#anfragen\">Zu den Anfragen</a>");
    if (s.status === "einrichtung") todo.push("🛠️ Wir richten Ted gerade für euch ein. Sobald er bereit ist, bekommt ihr eine Testnummer.");
    $("todo").innerHTML = todo.map(function (t) { return '<div class="alert info">' + t + "</div>"; }).join("");

    $("neueste").innerHTML = tabelle(D.anfragen.slice(0, 5), false);
    renderAnfragen();
    renderAbrechnungen();

    $("mat").innerHTML = D.materialLinks.map(function (m) {
      var n = { "20-fensteraufkleber": "Fensteraufkleber", "21-flyer-a6": "Flyer A6", "22-thekenaufsteller-a5": "Thekenaufsteller A5", "24-tuerschild-a4": "Türschild A4", "23-datenschutzhinweis-anrufer": "Datenschutzhinweis" }[m.name] || m.name;
      return '<a class="card" style="text-decoration:none" target="_blank" href="' + e(m.url) + '"><h3>' + e(n) + ' →</h3><p>Mit ' + e(s.firma) + "</p></a>";
    }).join("");
    $("fb-status").textContent = s.fragebogenAm ? "Zuletzt gespeichert am " + dat(s.fragebogenAm) + ". Änderungen jederzeit möglich." : "Noch nicht ausgefüllt.";

    $("vertrag-info").innerHTML = '<table class="tbl">' +
      "<tr><th>Modell</th><td>" + (prov ? "Provision: " + D.config.provisionProzent + " % vom Tattoo-Preis netto, monatliche Abrechnung" : "Kauf: " + euro(s.preisNetto) + " netto einmalig") + "</td></tr>" +
      "<tr><th>Abgeschlossen</th><td>" + dat(s.vertrag.akzeptiertAm) + " von " + e(s.vertrag.name) + " (Vertragsversion " + e(s.vertrag.version) + ")</td></tr>" +
      "<tr><th>Live seit</th><td>" + (s.goLiveAt ? dat(s.goLiveAt) : "noch in Einrichtung") + "</td></tr>" +
      (s.garantieBis ? "<tr><th>Geld-zurück-Garantie</th><td>" + (s.goLiveAt ? "bis " + dat(s.garantieBis) : D.config.garantieTage + " Tage ab Go-live") + "</td></tr>" : "") +
      (s.kuendigung ? "<tr><th>Kündigung</th><td>zum " + dat(s.kuendigung.zum) + "</td></tr>" : "") + "</table>";
    renderKuendigung(s);
    $("k-email").value = s.benachrichtigung.email || "";
    $("k-wa").value = s.benachrichtigung.whatsapp || "";
    tab();
  }

  function tabelle(list, edit) {
    var prov = D.studio.modell === "provision";
    if (!list.length) return '<p class="muted">Noch keine Anfragen. Sobald Ted Anrufe annimmt, erscheinen sie hier.</p>';
    return '<table class="tbl"><tr><th>Eingang</th><th>Anrufer</th><th>Wunsch</th><th>Status</th>' + (edit ? "<th>Termin</th>" + (prov ? "<th>Preis netto</th>" : "") + "<th></th>" : "") + "</tr>" +
      list.map(function (a) {
        var lock = Boolean(a.abgerechnet);
        var wunsch = [a.motiv, a.stelle, a.groesse && a.groesse + " cm", a.wunschzeitraum].filter(Boolean).join(" · ");
        var row = '<tr id="anfrage-' + e(a.id) + '" data-id="' + e(a.id) + '"><td>' + dat(a.createdAt) + (a.dringend ? ' <span class="tag gekuendigt">dringend</span>' : "") + "</td>" +
          "<td><b>" + e(a.name || "–") + "</b><br>" + (a.nummer ? '<a href="tel:' + e(a.nummer) + '">' + e(a.nummer) + "</a>" : "") + "</td>" +
          "<td>" + e(wunsch || a.zusammenfassung || "–") + "</td>";
        if (!edit) return row + '<td><span class="tag ' + e(a.status) + '">' + e(STATUS[a.status]) + "</span></td></tr>";
        return row + "<td><select data-f=\"status\"" + (lock ? " disabled" : "") + ">" +
          ["offen", "gebucht", "kein_termin"].map(function (k) { return '<option value="' + k + '"' + (a.status === k ? " selected" : "") + ">" + STATUS[k] + "</option>"; }).join("") + "</select></td>" +
          '<td><input type="date" data-f="terminDatum" value="' + e(a.terminDatum || "") + '"' + (lock ? " disabled" : "") + "></td>" +
          (prov ? '<td><input class="preis" type="text" inputmode="decimal" data-f="preisNetto" placeholder="€" value="' + (a.preisNettoCent ? (a.preisNettoCent / 100).toString().replace(".", ",") : "") + '"' + (lock ? " disabled" : "") + "></td>" : "") +
          "<td>" + (lock ? '<span class="muted" style="font-size:12px">abgerechnet ' + e(a.abgerechnet) + "</span>" : '<button class="btn dark small" data-save>Speichern</button>') + "</td></tr>";
      }).join("") + "</table>";
  }

  function renderAnfragen() {
    var f = $("filter").value;
    var list = D.anfragen.filter(function (a) { return f === "alle" || a.status === f; });
    $("anfragen-liste").innerHTML = tabelle(list, true);
    $("anfragen-hinweis").textContent = D.studio.modell === "provision"
      ? "Wird aus einer Anfrage ein Termin, wähle „Termin“, trag Datum und den mit dem Kunden vereinbarten Tattoo-Preis (netto) ein. Abgerechnet wird nach Termindatum, bis zum " + D.config.meldeTag + ". des Folgemonats kannst du Einträge ändern."
      : "Markiere Anfragen als erledigt, damit du den Überblick behältst.";
  }

  function renderAbrechnungen() {
    var prov = D.studio.modell === "provision";
    var html = "";
    if (prov && D.vorschau) {
      html += '<div class="alert info">' + Object.keys(D.vorschau).sort().reverse().map(function (m) {
        var v = D.vorschau[m];
        return "<b>" + e(m) + ":</b> " + v.positionen.length + " Termine, Umsatz " + euro(v.umsatzNetto, true) + " → Provision " + euro(v.summeNetto, true) + " netto";
      }).join("<br>") + "<br><small>Vorschau. Die Abrechnung erstellen wir am " + (D.config.meldeTag + 1) + ". des Folgemonats.</small></div>";
    }
    if (!D.abrechnungen.length) html += '<p class="muted">Noch keine Abrechnungen.</p>';
    else html += '<table class="tbl"><tr><th>Monat</th><th>Termine</th><th>Provision</th><th>Mehrminuten</th><th>Status</th><th>Rechnung</th></tr>' +
      D.abrechnungen.map(function (a) {
        return "<tr><td>" + e(a.monat) + "</td><td>" + (a.positionen || []).length + "</td><td>" + euro(a.summeNetto || 0, true) + "</td><td>" + euro((a.mehrminuten || {}).cent || 0, true) +
          '</td><td><span class="tag">' + e(a.status) + "</span></td><td>" + (a.rechnungUrl ? '<a target="_blank" href="' + e(a.rechnungUrl) + '">' + e(a.rechnungNr || "öffnen") + "</a>" : "–") + "</td></tr>";
      }).join("") + "</table>";
    $("abr-liste").innerHTML = "";
    $("vorschau").innerHTML = html;
  }

  function renderKuendigung(s) {
    var p = $("kuendigen-panel");
    if (s.status === "gekuendigt") {
      p.innerHTML = "<h2>Gekündigt</h2><p>Dein Vertrag endet am <b>" + dat(s.kuendigung.zum) + "</b>." + (s.kuendigung.garantie ? " Die Erstattung (Garantie) wird gerade bearbeitet." : "") + "</p>" +
        (s.kuendigung.garantie ? "" : '<button class="btn gold" id="k-zurueck">Kündigung zurücknehmen</button>');
      var z = $("k-zurueck"); if (z) z.onclick = async function () { try { D.studio = await Ted.api("/api/portal/kuendigung", { method: "DELETE" }); msg("Kündigung zurückgenommen. Schön, dass du bleibst!"); laden(); } catch (err) { msg(err.message, "err"); } };
      return;
    }
    if (["beendet", "erstattet"].includes(s.status)) { p.innerHTML = "<h2>Vertrag beendet</h2><p class=\"muted\">Der Vertrag ist beendet.</p>"; return; }
    var garantie = s.modell === "kauf" && (!s.goLiveAt || new Date(s.garantieBis) > new Date());
    p.innerHTML = "<h2>Kündigen</h2><p class=\"muted\">" + (s.modell === "provision"
      ? "Im Provisionsmodell kannst du jederzeit zum Monatsende kündigen. Termine aus Anfragen der Laufzeit sind noch " + D.config.nachlaufMonate + " Monate provisionspflichtig."
      : "Du kannst jederzeit zum Monatsende kündigen." + (garantie ? " Du bist noch in der Garantiezeit: Wenn du die Geld-zurück-Garantie nutzt, erstatten wir dir den vollen Kaufpreis." : "")) + "</p>" +
      '<div class="field"><label>Was hat nicht gepasst? (optional, hilft uns sehr)</label><textarea id="k-grund"></textarea></div>' +
      (garantie ? '<label class="check"><input type="checkbox" id="k-garantie"> <span>Geld-zurück-Garantie nutzen (Vertrag endet sofort, voller Kaufpreis zurück)</span></label>' : "") +
      '<button class="btn ghost" id="k-btn" style="color:var(--red)">Vertrag kündigen</button>';
    $("k-btn").onclick = async function () {
      if (!confirm("Willst du Ted am Telefon wirklich kündigen?")) return;
      try {
        await Ted.api("/api/portal/kuendigung", { body: { grund: $("k-grund").value, garantie: $("k-garantie") ? $("k-garantie").checked : false } });
        msg("Kündigung ist eingegangen. Du bekommst eine Bestätigung per E-Mail."); laden();
      } catch (err) { msg(err.message, "err"); }
    };
  }

  document.addEventListener("click", async function (ev) {
    if (ev.target.matches("[data-save]")) {
      var tr = ev.target.closest("tr"), body = {};
      tr.querySelectorAll("[data-f]").forEach(function (el) { body[el.dataset.f] = el.value; });
      try {
        var a = await Ted.api("/api/portal/anfrage/" + tr.dataset.id, { method: "PATCH", body: body });
        D.anfragen = D.anfragen.map(function (x) { return x.id === a.id ? a : x; });
        tr.classList.add("row-saved"); msg("Gespeichert.");
        D = await Ted.api("/api/portal"); renderAbrechnungen();
      } catch (err) { msg(err.message, "err"); }
    }
  });
  $("filter").addEventListener("change", renderAnfragen);
  $("n-add").onclick = async function () {
    try {
      await Ted.api("/api/portal/anfrage", { body: { name: $("n-name").value, datum: $("n-datum").value, motiv: $("n-motiv").value } });
      msg("Nachgetragen."); laden();
    } catch (err) { msg(err.message, "err"); }
  };
  $("stripe-portal").onclick = async function () {
    try { location.href = (await Ted.api("/api/portal/zahlung", { method: "POST" })).url; } catch (err) { msg(err.message, "err"); }
  };
  $("k-save").onclick = async function () {
    try { await Ted.api("/api/portal/kontakt", { method: "PATCH", body: { email: $("k-email").value, whatsapp: $("k-wa").value } }); msg("Gespeichert."); }
    catch (err) { msg(err.message, "err"); }
  };
  $("logout").onclick = async function (ev) { ev.preventDefault(); await Ted.api("/api/logout", { method: "POST" }); location.href = "/"; };
  laden();
})();
