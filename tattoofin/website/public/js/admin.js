// Admin-App „TF Admin“ (admin.html): Übersicht, Studios, Studio-Detail, Demo-Studio (Apple), Werkzeuge.
// Daten: GET /api/admin/uebersicht (Kennzahlen, Studios, Entwürfe, Demo), Detail wie bisher GET /api/admin/studio/:id.
// Anmeldung: Admin-Sitzung (Cookie, per Link oder Code aus der Mail) oder ADMIN_TOKEN (sessionStorage, Rückfall).
(function () {
  var $ = function (i) { return document.getElementById(i); }, e = TF.esc;
  var token = "";
  try { token = sessionStorage.getItem("tf-admin") || ""; } catch (x) {}
  var daten = null, filter = "alle", detailId = null, loginEmail = "", zuletzt = "studios";

  function api(p, o) { o = o || {}; if (token) o.headers = { Authorization: "Bearer " + token }; return TF.api("/api/admin/" + p, o); }
  function msg(t, ty) { $("alert").innerHTML = t ? '<div class="alert ' + (ty || "ok") + '">' + e(t) + "</div>" : ""; if (t) window.scrollTo(0, 0); }
  function zeig(x) { $("out-json").textContent = JSON.stringify(x, null, 2); }
  function euro(c) { return c === null || c === undefined ? "–" : TF.euro(c); }
  function zeit(iso) {
    if (!iso) return "–";
    var d = new Date(iso), jetzt = new Date(), tage = Math.floor((new Date(jetzt.toDateString()) - new Date(d.toDateString())) / 864e5);
    var uhr = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    if (tage === 0) return "heute " + uhr;
    if (tage === 1) return "gestern " + uhr;
    if (tage < 7) return "vor " + tage + " Tagen";
    return TF.datum(iso);
  }
  var TAGFARBE = { live: "gruen", einrichtung: "gelb", zahlung_offen: "gelb", entwurf: "grau", abgebrochen: "grau", gekuendigt: "rot", beendet: "rot", erstattet: "rot" };
  function statusPille(s) { return '<span class="pille status ' + (TAGFARBE[s.status] || "grau") + '">' + e(s.statusText || s.status) + "</span>"; }
  function paketText(p) { return p ? e(p.name) + (p.preis ? " · " + e(p.preis) : "") : "–"; }

  // ---------------------------------------------------------------- Ansichten (Hash: #uebersicht, #studios, #demo, #mehr, #st_…)
  var ANSICHTEN = ["uebersicht", "studios", "detail", "demo", "mehr"];
  function zeigeAnsicht(v) {
    ANSICHTEN.forEach(function (a) { $("v-" + a).classList.toggle("hidden", a !== v); });
    var tab = v === "detail" ? "studios" : v;
    document.querySelectorAll("#tabs a").forEach(function (a) { if (a.dataset.v === tab) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
  }
  function route() {
    if (!daten) return;
    var h = decodeURIComponent(location.hash.slice(1));
    if (/^st_/.test(h)) { if (h !== detailId) detail(h); zeigeAnsicht("detail"); return; }
    detailId = null;
    var v = ANSICHTEN.indexOf(h) >= 0 && h !== "detail" ? h : "uebersicht";
    zuletzt = v;
    zeigeAnsicht(v);
    if (v === "mehr") mailsLaden();
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);

  // ---------------------------------------------------------------- Laden
  async function start() {
    try { daten = await api("uebersicht"); }
    catch (err) {
      if (err.status === 401) { $("login").classList.remove("hidden"); $("app").classList.add("hidden"); $("tabs").classList.add("hidden"); return; }
      msg(err.message, "err"); return;
    }
    $("login").classList.add("hidden"); $("app").classList.remove("hidden"); $("tabs").classList.remove("hidden");
    $("out").classList.remove("hidden"); $("neu").classList.remove("hidden");
    $("stand").textContent = "Stand " + new Date(daten.stand).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    uebersicht(); liste(); demo();
    route();
  }

  // ---------------------------------------------------------------- Übersicht
  function kachel(wert, was, dazu, klasse, ziel) {
    return '<button type="button" class="kachel ' + (klasse || "") + '"' + (ziel ? ' data-ziel="' + e(ziel) + '"' : "") + "><b>" + wert + '</b><span class="was">' + e(was) + "</span>" + (dazu ? '<span class="dazu">' + dazu + "</span>" : "") + "</button>";
  }
  function uebersicht() {
    var k = daten.kennzahlen, ein = k.einnahmen, st = ein.stripe || {}, m = daten.mail;
    var monat = new Date(daten.monat + "-15").toLocaleDateString("de-DE", { month: "long" });
    var apple = ein.apple.abos ? ein.apple.abos + " Apple-Abo" + (ein.apple.abos === 1 ? "" : "s") + " (" + ein.apple.preise.map(function (p) { return p.anzahl + "× " + e(p.preis); }).join(", ") + ", zahlt Apple aus)" : "";
    var h = [
      kachel(k.zahlend.gesamt, "Zahlende Studios", "Web " + k.zahlend.web + " · Apple " + k.zahlend.apple + "<br>davon live " + k.zahlend.live + (k.zahlend.kostenlos ? "<br>+" + k.zahlend.kostenlos + " kostenlos (Einladung)" : "") + (k.tests ? "<br>ohne " + k.tests + " Test-Studio" + (k.tests === 1 ? "" : "s") : ""), "dunkel", "studios:alle"),
      kachel(k.einrichtung, "In Einrichtung", "bezahlt, Stripe noch nicht fertig", "", "studios:einrichtung"),
      kachel(k.abgebrochen14, "Abgebrochen", "letzte 14 Tage" + (k.zahlungFehlgeschlagen14 ? '<br><span style="color:#8f1515">' + k.zahlungFehlgeschlagen14 + "× Zahlung fehlgeschlagen</span>" : ""), "", "entwuerfe"),
      kachel('<span class="geld">' + euro(k.umsatzStudios.cent) + "</span>", "Umsatz der Studios", k.umsatzStudios.zahlungen + " Kundenzahlung" + (k.umsatzStudios.zahlungen === 1 ? "" : "en") + " im " + e(monat), "", "studios:alle"),
      kachel('<span class="geld">' + (st.fehler ? "–" : euro(st.bruttoCent)) + "</span>", "Unsere Einnahmen", st.fehler ? e(st.fehler) : (st.rechnungen + " bezahlte Rechnung" + (st.rechnungen === 1 ? "" : "en") + " im " + e(monat) + " (" + euro(st.nettoCent) + " netto)") +
        "<br>Abos laut Vertrag: " + euro(ein.aboVertragNettoCent) + " netto/Monat" + (apple ? "<br>" + apple : ""), "breit2", ""),
      kachel(m.ok ? "OK" : m.anzahl, "E-Mails", m.ok ? "Warteschlange leer" : (m.anzahl === 1 ? "1 Mail hängt" : m.anzahl + " Mails hängen") + (m.aeltesteSeit ? " seit " + e(zeit(m.aeltesteSeit)) : ""), (m.ok ? "gut" : "schlecht") + " breit zeile", "mehr"),
    ];
    $("kacheln").innerHTML = h.join("");
    var en = daten.entwuerfe;
    $("entwuerfe").innerHTML = en.length ? en.map(entwurfKarte).join("") : '<p class="leer">Keine abgebrochenen Anmeldungen in den letzten 14 Tagen.</p>';
    hinweise();
  }
  function entwurfKarte(d) {
    var f = d.fehler;
    var fehler = f ? '<span class="pille rot">' + (f.dreiDS ? "3-D-Secure nicht bestätigt" : "Zahlung fehlgeschlagen") + "</span>" : "";
    return '<div class="karte" data-id="' + e(d.id) + '"><div class="kopf"><div class="name">' + e(d.firma) + "</div>" +
      (d.spaeterAbgeschlossen ? '<span class="pille gruen">später abgeschlossen</span>' : '<span class="pille grau">' + (d.wo === "app" ? "App" : "Web") + "</span>") + "</div>" +
      '<div class="zeile">' + paketText(d.paket) + "</div>" +
      '<div class="zeile"><b>' + e(zeit(d.wann)) + "</b> · " + e(d.schritt) + "</div>" +
      (f && f.text ? '<div class="zeile">' + e(f.text) + "</div>" : "") +
      '<div class="fuss">' + fehler + (d.ort ? '<span class="pille">' + e(d.ort) + "</span>" : "") + "</div>" +
      '<div class="aktionen">' + (d.telefon ? '<a class="k" href="tel:' + e(d.telefon.replace(/[^\d+]/g, "")) + '">Anrufen</a>' : '<span></span>') +
      (d.email ? '<a class="k" href="mailto:' + e(d.email) + '">Mail</a>' : "<span></span>") + '<a class="k dunkel" href="#' + e(d.id) + '">Details</a></div></div>';
  }
  // Hinweise oben: hängende Mails (Warteschlange) und Ergebnis des stündlichen Gesundheits-Checks
  function hinweise() {
    var h = [], m = daten.mail, g = daten.gesundheit;
    if (!m.ok) h.push('<div class="alert err"><b>⚠️ ' + m.anzahl + (m.anzahl === 1 ? " E-Mail hängt" : " E-Mails hängen") + " in der Warteschlange</b> (seit " + e(m.aeltesteSeit ? new Date(m.aeltesteSeit).toLocaleString("de-DE") : "?") + ")." +
      (m.letzterFehler ? " <small>" + e(m.letzterFehler.slice(0, 160)) + "</small>" : "") + " Wir versuchen es alle 10 Minuten erneut. Login-Links kannst du beim Studio mit „Login-Link“ per WhatsApp weitergeben." +
      (m.wege && m.wege.indexOf("resend") < 0 ? "<br><small>Tipp: Zweiten Versanddienst einrichten (Netlify-Variable RESEND_API_KEY).</small>" : "") +
      '<div><button class="k dunkel" id="mail-nach">Jetzt erneut senden</button></div></div>');
    if (g && g.ok === false) h.push('<div class="alert err"><b>Gesundheits-Check ' + e(g.am ? new Date(g.am).toLocaleString("de-DE") : "") + ":</b> " + e((g.fehler || []).join(" · ")) + "</div>");
    $("hinweise").innerHTML = h.join("");
    var b = $("mail-nach");
    if (b) b.onclick = async function () { b.disabled = true; try { zeig(await api("mail-nachsenden", { body: {} })); msg("Erneut versucht."); } catch (err) { msg(err.message, "err"); } start(); };
  }
  $("kacheln").addEventListener("click", function (ev) {
    var k = ev.target.closest(".kachel"); if (!k || !k.dataset.ziel) return;
    var z = k.dataset.ziel;
    if (z === "entwuerfe") { $("entwuerfe").scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    if (z.indexOf("studios:") === 0) { filter = z.split(":")[1]; liste(); location.hash = "studios"; return; }
    location.hash = z;
  });

  // ---------------------------------------------------------------- Studios
  var FILTER = [["alle", "Alle"], ["aktiv", "Aktiv"], ["einrichtung", "Einrichtung"], ["entwurf", "Entwurf"], ["gekuendigt", "Gekündigt"]];
  function passt(s, f) { return f === "alle" || s.gruppe === f; }
  function liste() {
    var st = daten.studios, q = ($("suche").value || "").trim().toLowerCase();
    $("filter").innerHTML = FILTER.map(function (f) {
      var n = st.filter(function (s) { return passt(s, f[0]); }).length;
      return '<button type="button" data-f="' + f[0] + '" aria-pressed="' + (filter === f[0]) + '">' + f[1] + " " + n + "</button>";
    }).join("");
    var RANG = { aktiv: 0, einrichtung: 1, gekuendigt: 2, entwurf: 3 };
    var treffer = st.filter(function (s) { return passt(s, filter) && (!q || (s.firma + " " + s.ort + " " + s.email).toLowerCase().indexOf(q) >= 0); })
      .sort(function (a, b) { return (RANG[a.gruppe] - RANG[b.gruppe]) || (a.test - b.test) || String(a.firma).localeCompare(String(b.firma), "de"); });
    $("liste").innerHTML = treffer.length ? treffer.map(studioKarte).join("") : '<p class="leer">Kein Studio gefunden.</p>';
  }
  function studioKarte(s) {
    var lz = s.letzteZahlung;
    return '<a class="karte" href="#' + e(s.id) + '"><div class="kopf"><div class="name">' + e(s.firma) + "</div>" + statusPille(s) + "</div>" +
      '<div class="zeile">' + (s.ort ? e(s.ort) + " · " : "") + paketText(s.paket) + "</div>" +
      '<div class="zeile">Letzte Zahlung: <b>' + (lz ? e(TF.datum(lz.am)) + " · " + euro(lz.betragCent) : "noch keine") + "</b>" + (s.offen ? " · " + s.offen + " offen" : "") + "</div>" +
      '<div class="fuss"><span class="pille ' + (s.stripeFrei ? "gruen" : "gelb") + '">Stripe ' + (s.stripeFrei ? "frei ✓" : e(s.stripe)) + "</span>" +
      (s.paket && s.paket.abrechnung === "apple" ? '<span class="pille blau">Apple</span>' : "") +
      (s.paket && s.paket.sonder ? '<span class="pille gelb">Sonderpreis</span>' : "") +
      (s.test ? '<span class="pille grau">Test (Sandbox)</span>' : "") + "</div></a>";
  }
  $("filter").addEventListener("click", function (ev) { var b = ev.target.closest("button[data-f]"); if (!b) return; filter = b.dataset.f; liste(); });
  $("suche").addEventListener("input", liste);
  document.addEventListener("click", function (ev) {
    if (ev.target.closest("a")) return;
    var k = ev.target.closest(".karte[data-id]"); if (k) location.hash = k.dataset.id;
  });

  // ---------------------------------------------------------------- Demo-Studio (Apple)
  function demo() {
    var d = daten.demo;
    $("demo").innerHTML = (d.length ? d.map(function (s) {
      return '<div class="block"><div class="karte" data-id="' + e(s.id) + '" style="box-shadow:none;border-width:2px"><div class="kopf"><div class="name">' + e(s.firma) + "</div>" + statusPille(s) + "</div>" +
        '<div class="zeile">Login für Apple: <b>' + e(s.email) + "</b></div>" +
        '<div class="zeile">' + s.zahlungenGesamt + " Beispiel-Einträge · Daten erneuert: <b>" + e(s.erneuertAm ? zeit(s.erneuertAm) : "–") + "</b></div></div>" +
        '<div class="knopfgitter" style="margin-top:12px"><a class="k" href="#' + e(s.id) + '">Details</a><button class="k" data-ansehen="' + e(s.id) + '">Wie das Studio sehen</button></div></div>';
    }).join("") : '<p class="leer">Noch kein Demo-Studio angelegt.</p>') +
      '<button class="k dunkel" id="demo-neu" style="width:100%">' + (d.length ? "Beispieldaten erneuern" : "Demo-Studio anlegen") + "</button>" +
      '<p class="klein">Setzt Zahlungen, Gutscheine und QR-Aufsteller des Demo-Studios auf die Beispieldaten zurück. Echte Studios bleiben unberührt.</p>';
    $("demo-neu").onclick = async function () {
      if (!confirm("Sicher? Die Beispieldaten des Demo-Studios werden neu angelegt.")) return;
      var b = $("demo-neu"); b.disabled = true;
      try { var r = await api("app-demo", { body: {} }); zeig(r); msg("Beispieldaten erneuert (" + r.zahlungen + " Einträge)."); await start(); }
      catch (err) { msg(err.message, "err"); b.disabled = false; }
    };
  }
  document.addEventListener("click", async function (ev) {
    var b = ev.target.closest("[data-ansehen]"); if (!b) return;
    try { var r = await api("studio/" + b.dataset.ansehen + "/ansehen", { body: {} }); location.href = r.url; } catch (err) { msg(err.message, "err"); }
  });

  // ---------------------------------------------------------------- Werkzeuge
  var vm = new Date(); vm.setMonth(vm.getMonth() - 1); $("monat").value = vm.toISOString().slice(0, 7);
  var mailsGeladen = false;
  async function mailsLaden() {
    if (mailsGeladen) return;
    try {
      var mails = await api("mails"); mailsGeladen = true;
      $("mails").innerHTML = mails.length ? mails.map(function (m) { return "<li><b>" + e(m.subject) + '</b><br><span class="klein">' + e(new Date(m.at).toLocaleString("de-DE")) + " · " + e(m.to) + "</span></li>"; }).join("") : '<li class="leer">Noch keine E-Mails.</li>';
    } catch (err) { $("mails").innerHTML = '<li class="leer">' + e(err.message) + "</li>"; }
  }
  $("abr-test").onclick = async function () { try { zeig(await api("abrechnung", { body: { monat: $("monat").value, dryRun: true } })); msg("Test fertig, Ergebnis unten."); } catch (err) { msg(err.message, "err"); } };
  $("abr-los").onclick = async function () { if (!confirm("Abrechnung für " + $("monat").value + " wirklich erstellen? Rechnungen werden erzeugt und eingezogen.")) return; try { zeig(await api("abrechnung", { body: { monat: $("monat").value, dryRun: false } })); msg("Abrechnung erstellt."); } catch (err) { msg(err.message, "err"); } };
  $("jobs").onclick = async function () { try { zeig(await api("jobs", { body: {} })); msg("Tägliche Jobs gelaufen, Ergebnis unten."); } catch (err) { msg(err.message, "err"); } };
  $("konten").onclick = async function () { try { var r = await api("konten-abgleichen", { body: {} }); zeig(r); msg(r.length + " Stripe-Konten abgeglichen."); start(); } catch (err) { msg(err.message, "err"); } };

  // ---------------------------------------------------------------- Studio-Detail (alle bisherigen Admin-Funktionen)
  async function detail(id) {
    detailId = id;
    var p = $("detail");
    p.innerHTML = '<p class="leer">Wird geladen …</p>';
    var d;
    try { d = await api("studio/" + id); } catch (err) { p.innerHTML = '<button class="zurueck" data-zurueck>‹ Zurück</button><div class="alert err">' + e(err.message) + "</div>"; return; }
    if (detailId !== id) return;
    var s = d.studio, v = s.vertrag || {}, sk = s.stripe || {}, k = (daten.studios.concat(daten.demo)).find(function (x) { return x.id === id; }) || {};
    var a = s.aufsteller || {};
    var zeilen = [["Inhaber", s.inhaber], ["E-Mail", s.email], ["Handy", s.telefon], ["Studio-Tel.", s.studioTelefon], ["Adresse", [s.strasse, [s.plz, s.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ")],
      ["Paket", k.paket ? k.paket.name + (k.paket.preis ? " · " + k.paket.preis : "") + (k.paket.netto ? " (" + k.paket.netto + ")" : "") + (k.paket.sonder ? " · Sonderpreis" : "") : (s.paket || s.modell)], ["Zahlart", s.zahlart],
      ["Vertrag", (v.version || "–") + " · " + TF.datum(v.akzeptiertAm) + " · " + (v.name || "") + (v.ip ? " · IP " + v.ip : "")],
      ["Stripe-Konto", (sk.accountId || "–") + (sk.chargesEnabled ? " · freigegeben" : " · nicht freigegeben")], ["Zahlseite", location.origin + "/zahlen/" + s.slug],
      ["Seit", TF.datum(s.createdAt)], ["Live seit", TF.datum(s.goLiveAt)],
      ["Kündigung", s.kuendigung ? TF.datum(s.kuendigung.zum) + (s.kuendigung.garantie ? " (GARANTIE)" : "") + " · " + (s.kuendigung.grund || "") : "–"]];
    if (s.apple) zeilen.push(["Apple-Abo", (s.apple.status || "–") + " · bis " + TF.datum(s.apple.laeuftBis) + (s.sandbox ? " · Sandbox/Test" : "")]);
    if (s.anmeldungFehler && ["entwurf", "abgebrochen", "zahlung_offen"].indexOf(s.status) >= 0) zeilen.push(["Letzter Fehler", (s.anmeldungFehler.dreiDS ? "3-D-Secure nicht bestätigt · " : "") + (s.anmeldungFehler.text || s.anmeldungFehler.code || "") + " · " + zeit(s.anmeldungFehler.am)]);
    var zahl = d.zahlungen;
    p.innerHTML = '<button class="zurueck" data-zurueck>‹ Zurück</button>' +
      '<div class="kopf" style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start"><h2 style="margin:0">' + e(s.firma) + "</h2>" + statusPille({ status: s.status, statusText: k.statusText || s.status }) + "</div>" +
      (s.demo ? '<div class="alert info">Demo-Studio für die Prüfung bei Apple. Zählt nicht in den Zahlen.</div>' : "") +
      '<div class="knopfgitter" style="margin-top:14px">' +
        '<button class="k dunkel" id="d-ansehen">Dashboard ansehen</button>' +
        '<button class="k" id="d-link">Login-Link</button>' +
        '<button class="k" id="d-einr">Einrichtungslink</button>' +
        '<button class="k" id="d-konto">Stripe abgleichen</button>' +
        (s.status !== "live" && !s.demo ? '<button class="k gelb" id="d-live">Live schalten + Mail</button>' : "") +
        (s.modell === "kauf" && sk.paymentIntentId ? '<button class="k rot" id="d-refund">Garantie erstatten</button>' : "") +
      "</div>" +
      '<div id="d-linkbox"></div>' +
      '<div class="block"><h3>Angaben</h3><dl class="liste">' + zeilen.map(function (r) { return "<dt>" + e(r[0]) + "</dt><dd>" + e(r[1] || "–") + "</dd>"; }).join("") + "</dl></div>" +
      '<div class="block"><h3>Notiz</h3><div class="field"><label for="d-notiz" class="hidden">Notiz</label><textarea id="d-notiz" aria-label="Notiz">' + e(s.notiz || "") + '</textarea></div><button class="k dunkel" id="d-save">Speichern</button></div>' +
      '<div class="block"><h3>Zahlungen (' + zahl.length + ")</h3>" + (zahl.length ? '<ul class="posten">' + zahl.slice(0, 40).map(function (z) {
        return '<li><span class="betrag">' + TF.euro(z.betragCent, true) + "</span><b>" + e(z.kunde || "–") + "</b> · " + e(z.status) + '<br><span class="klein">' + e(TF.datum(z.bezahltAm || z.createdAt)) + (z.zahlartText ? " · " + e(z.zahlartText) : "") + (z.beschreibung ? " · " + e(z.beschreibung) : "") + (z.gebuehrNettoCent ? " · Provision " + TF.euro(z.gebuehrNettoCent, true) : "") + (z.abgerechnet ? " · abgerechnet " + e(z.abgerechnet) : "") + "</span></li>";
      }).join("") + "</ul>" + (zahl.length > 40 ? '<p class="klein">… und ' + (zahl.length - 40) + " ältere.</p>" : "") : '<p class="leer">Noch keine.</p>') + "</div>" +
      '<div class="block"><h3>Abrechnungen</h3>' + (d.abrechnungen.length ? '<ul class="posten">' + d.abrechnungen.map(function (ab) { return '<li><span class="betrag">' + TF.euro(ab.provisionNettoCent || 0, true) + " netto</span><b>" + e(ab.monat) + '</b><br><span class="klein">Umsatz ' + TF.euro(ab.umsatzCent || 0, true) + (ab.rechnungNr ? " · Rechnung " + e(ab.rechnungNr) : "") + "</span></li>"; }).join("") + "</ul>" : '<p class="leer">Keine.</p>') + "</div>" +
      '<div class="block"><h3>QR-Aufsteller</h3><dl class="liste"><dt>Stand</dt><dd>' + e(a.status || (a.angefordertAm ? "angefordert" : "noch nicht bestellt")) + (a.angefordertAm ? " · " + e(TF.datum(a.angefordertAm)) : "") + (a.kauf && a.kauf.bezahltAm ? " · bezahlt " + e(TF.datum(a.kauf.bezahltAm)) : "") + "</dd>" +
        (a.holz || a.variante ? "<dt>Ausführung</dt><dd>" + e([a.holz, a.variante].filter(Boolean).join(", ")) + "</dd>" : "") + "</dl>" +
        (d.aufstellerLink ? '<a class="k" style="margin-top:10px" href="' + e(d.aufstellerLink) + '" target="_blank" rel="noopener">Gravurdatei öffnen</a>' : "") + "</div>" +
      '<details class="block"><summary>Fragebogen' + (s.fragebogen ? " ✓" : " (leer)") + "</summary><pre>" + e(JSON.stringify(s.fragebogen || {}, null, 2)) + "</pre></details>" +
      '<details class="block" id="d-brand"><summary>Logo/Farbe für Studio' + (s.branding ? " ✓" + (s.branding.stripeAm ? " (bei Stripe " + e(TF.datum(s.branding.stripeAm)) + ")" : "") : "") + "</summary>" +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin:8px 0" id="b-vorschau"></div>' +
        '<div class="field"><label for="b-icon">Icon (quadratisch, mind. 128 px, PNG/JPG)</label><input type="file" id="b-icon" accept="image/png,image/jpeg"></div>' +
        '<div class="field"><label for="b-logo">Logo (breit, PNG/JPG)</label><input type="file" id="b-logo" accept="image/png,image/jpeg"></div>' +
        '<div style="display:flex;gap:14px;flex-wrap:wrap"><div class="field"><label for="b-farbe">Markenfarbe</label><input type="color" id="b-farbe" value="' + e((s.branding && s.branding.farbe) || "#111111") + '"></div>' +
        '<div class="field"><label for="b-akzent">Akzentfarbe (Knöpfe)</label><input type="color" id="b-akzent" value="' + e((s.branding && s.branding.akzent) || "#b08d57") + '"></div></div>' +
        '<div class="field"><label for="b-kurz">Kurzbezeichnung Abrechnung (5–22 Zeichen)</label><input type="text" id="b-kurz" maxlength="22" autocomplete="off" value="' + e((s.branding && s.branding.kurzbezeichnung) || String(s.firma || "").toUpperCase().slice(0, 22)) + '"></div>' +
        '<label style="display:flex;gap:10px;align-items:center;min-height:44px"><input type="checkbox" id="b-hell"' + (s.branding && s.branding.logoHell ? " checked" : "") + "> Logo ist für hellen Hintergrund gemacht</label>" +
        '<label style="display:flex;gap:10px;align-items:center;min-height:44px;margin-bottom:8px"><input type="checkbox" id="b-stripe"' + (sk.accountId ? " checked" : " disabled") + "> auch beim Stripe-Konto setzen (Kasse, Belege)</label>" +
        '<button class="k dunkel" id="b-save">Branding speichern</button></details>' +
      '<div class="block"><h3>E-Mails an das Studio</h3><ul class="posten" id="d-mails"><li class="leer">Wird geladen …</li></ul></div>';
    window.scrollTo(0, 0);

    $("d-save").onclick = async function () { try { zeig(await api("studio/" + id, { method: "PATCH", body: { notiz: $("d-notiz").value } })); msg("Gespeichert."); } catch (err) { msg(err.message, "err"); } };
    $("d-ansehen").onclick = async function () { try { var r = await api("studio/" + id + "/ansehen", { body: {} }); location.href = r.url; } catch (err) { msg(err.message, "err"); } };
    if ($("d-live")) $("d-live").onclick = async function () { if (!confirm("Live schalten und Go-live-E-Mail senden?")) return; try { zeig(await api("studio/" + id + "/live", { body: {} })); msg("Live geschaltet."); neuLaden(); } catch (err) { msg(err.message, "err"); } };
    $("d-konto").onclick = async function () {
      try {
        var r = await api("studio/" + id + "/konto", { body: {} }); zeig(r);
        var o = r.offen || {}, fehlt = (o.faellig || []).concat(o.ueberfaellig || []);
        msg("Stripe abgeglichen: " + (r.nachher.freigegeben ? "Zahlungen freigegeben" : "noch nicht freigegeben") + ", Auszahlungen " + (r.nachher.auszahlungen ? "an" : "aus") + ", Angaben " + (r.nachher.angaben ? "gemacht" : "unvollständig") + (fehlt.length ? ". Stripe braucht noch: " + fehlt.join(", ") : "") + (o.inPruefung && o.inPruefung.length ? ". In Prüfung: " + o.inPruefung.join(", ") : "") + (o.sperrgrund ? ". Grund: " + o.sperrgrund : "") + ".", r.nachher.freigegeben ? "ok" : "info");
        neuLaden();
      } catch (err) { msg(err.message, "err"); }
    };
    function linkZeigen(r, titel) {
      $("d-linkbox").innerHTML = '<div class="alert info"><b>' + e(titel) + "</b> (gültig " + e(r.gueltig || "") + ', z. B. per WhatsApp weitergeben)<br><input type="text" readonly id="d-linktext" aria-label="Link" style="margin:8px 0" value="' + e(r.url) + '"><button class="k dunkel" id="d-copy">Link kopieren</button></div>';
      $("d-copy").onclick = async function () { try { await navigator.clipboard.writeText(r.url); } catch (x) { $("d-linktext").select(); document.execCommand("copy"); } $("d-copy").textContent = "Kopiert ✓"; };
    }
    $("d-link").onclick = async function () { try { linkZeigen(await api("studio/" + id + "/login-link", { body: {} }), "Login-Link"); } catch (err) { msg(err.message, "err"); } };
    $("d-einr").onclick = async function () { try { linkZeigen(await api("studio/" + id + "/einrichtungslink", { body: {} }), "Einrichtungslink (Stripe-Zahlungskonto)"); } catch (err) { msg(err.message, "err"); } };
    // Branding: Bilder im Browser verkleinern (max. 1000 px, unter ~500 KB für Stripe), dann als data-URL senden
    function bildLesen(input, quadrat) {
      var f = input.files && input.files[0]; if (!f) return Promise.resolve(null);
      return new Promise(function (ok, no) {
        var r = new FileReader(); r.onerror = no;
        r.onload = function () {
          var img = new Image(); img.onerror = function () { no(new Error("Bild konnte nicht gelesen werden.")); };
          img.onload = function () {
            var max = 1000, sk2 = Math.min(1, max / Math.max(img.width, img.height));
            if (sk2 === 1 && f.size < 480000 && !quadrat) return ok(r.result);
            var w = Math.round(img.width * sk2), h = Math.round(img.height * sk2), c = document.createElement("canvas");
            if (quadrat) { var m = Math.min(w, h, 512); c.width = c.height = m; var q = Math.min(img.width, img.height); c.getContext("2d").drawImage(img, (img.width - q) / 2, (img.height - q) / 2, q, q, 0, 0, m, m); }
            else { c.width = w; c.height = h; c.getContext("2d").drawImage(img, 0, 0, w, h); }
            var png = f.type === "image/png", url = c.toDataURL(png ? "image/png" : "image/jpeg", 0.9);
            if (png && url.length > 650000) url = c.toDataURL("image/jpeg", 0.9);
            ok(url);
          };
          img.src = r.result;
        };
        r.readAsDataURL(f);
      });
    }
    function brandVorschau(o) {
      if (!o || !$("b-vorschau")) return;
      $("b-vorschau").innerHTML = [o.iconUrl, o.logoUrl].filter(Boolean).map(function (u) { return '<img src="' + e(u) + '" alt="" style="max-height:80px;max-width:100%;border-radius:10px;border:2px solid #222;background:' + e(o.logoHell ? "#fff" : (o.farbe || "#111")) + '">'; }).join("") +
        (o.farbe ? '<span class="klein">Farbe ' + e(o.farbe) + (o.akzent ? " · Akzent " + e(o.akzent) : "") + "</span>" : "");
    }
    api("studio/" + id + "/branding").then(function (r) { if (detailId === id) brandVorschau(r.oeffentlich); }).catch(function () {});
    $("b-save").onclick = async function () {
      var btn = $("b-save"); btn.disabled = true;
      try {
        var b = { icon: await bildLesen($("b-icon"), true), logo: await bildLesen($("b-logo"), false), farbe: $("b-farbe").value, akzent: $("b-akzent").value, kurzbezeichnung: $("b-kurz").value, logoHell: $("b-hell").checked, stripe: $("b-stripe").checked };
        var r = await api("studio/" + id + "/branding", { body: b }); zeig(r); brandVorschau(r.oeffentlich);
        msg("Branding gespeichert" + (b.stripe ? (r.stripe && r.stripe.fehler ? " – Stripe meldet: " + r.stripe.fehler : " und bei Stripe gesetzt.") : "."), r.stripe && r.stripe.fehler ? "err" : "ok");
      } catch (err) { msg(err.message, "err"); }
      btn.disabled = false;
    };
    var rf = $("d-refund"); if (rf) rf.onclick = async function () { if (!confirm("Kaufpreis wirklich vollständig erstatten?")) return; try { zeig(await api("studio/" + id + "/erstattung", { body: {} })); msg("Erstattet."); neuLaden(); } catch (err) { msg(err.message, "err"); } };
    if (s.email) api("mails?an=" + encodeURIComponent(s.email)).then(function (ms) {
      if (detailId !== id) return;
      $("d-mails").innerHTML = ms.length ? ms.map(function (m) { return "<li><b>" + e(m.subject) + '</b><br><span class="klein">' + e(new Date(m.at).toLocaleString("de-DE")) + "</span></li>"; }).join("") : '<li class="leer">Keine in den letzten Mails.</li>';
    }).catch(function () { $("d-mails").innerHTML = '<li class="leer">Konnte nicht geladen werden.</li>'; });
    else $("d-mails").innerHTML = '<li class="leer">Keine E-Mail-Adresse.</li>';
  }
  async function neuLaden() { detailId = null; await start(); }
  document.addEventListener("click", function (ev) { if (ev.target.closest("[data-zurueck]")) location.hash = zuletzt; });

  // ---------------------------------------------------------------- Anmeldung
  $("neu").onclick = function () { mailsGeladen = false; neuLaden(); };
  $("login-token").addEventListener("submit", function (ev) { ev.preventDefault(); token = $("token").value; try { sessionStorage.setItem("tf-admin", token); } catch (x) {} start(); });
  $("login-mail").addEventListener("submit", async function (ev) {
    ev.preventDefault();
    loginEmail = $("admin-email").value.trim();
    try {
      await TF.api("/api/admin-login", { body: { email: loginEmail } });
      msg("Wenn die Adresse als Admin hinterlegt ist, ist die Mail unterwegs. Schau auch im Spam-Ordner nach.");
      $("login-code").classList.remove("hidden"); $("admin-code").focus();
    } catch (err) { msg(err.message, "err"); }
  });
  $("login-code").addEventListener("submit", async function (ev) {
    ev.preventDefault();
    try { await TF.api("/api/admin-login/code", { body: { email: loginEmail || $("admin-email").value.trim(), code: $("admin-code").value.replace(/\s+/g, "") } }); msg(""); start(); }
    catch (err) { msg(err.message, "err"); }
  });
  $("out").onclick = async function (ev) { ev.preventDefault(); try { sessionStorage.removeItem("tf-admin"); } catch (x) {} try { await TF.api("/api/admin-login/abmelden", { body: {} }); } catch (x) {} location.href = "/admin.html"; };
  var qa = new URLSearchParams(location.search);
  if (qa.get("abgelaufen")) msg("Der Admin-Link ist abgelaufen oder ungültig. Fordere einfach einen neuen an.", "err");
  if (qa.get("ansicht") === "abgelaufen") msg("Der Link für die Dashboard-Ansicht ist abgelaufen. Bitte erneut auf „Dashboard ansehen“ tippen.", "err");
  start();
})();
