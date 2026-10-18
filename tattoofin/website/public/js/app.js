// Tattoofin Studio-App (Dashboard). Eine Seite, Ansichten über #hash. Daten: /api/portal (nur das eigene Studio).
(function () {
  var D = null, geladenAm = 0, sess = null, sessLaden = null, filter = "alle", installEvent = null;
  var $ = function (id) { return document.getElementById(id); };
  var e = TF.esc, euro = TF.euro, dat = TF.datum;
  var STATUS = { offen: "offen", in_pruefung: "in Prüfung", bezahlt: "bezahlt", storniert: "storniert", abgebrochen: "abgebrochen", fehlgeschlagen: "fehlgeschlagen", erstattet: "erstattet", rueckgebucht: "zurückgebucht" };
  var standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  var merke = { get: function (k) { try { return localStorage.getItem(k); } catch (x) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (x) {} } };

  function toast(t, fehler) {
    var b = $("toast"); b.textContent = t; b.className = "toast" + (fehler ? " err" : "");
    clearTimeout(toast.t); toast.t = setTimeout(function () { b.classList.add("hidden"); }, fehler ? 6000 : 3500);
  }
  function qr(el, text, size) { el.innerHTML = ""; if (window.QRCode) new QRCode(el, { text: text, width: size || 300, height: size || 300, colorDark: "#13243d", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M }); }
  var prov = function () { return D.studio.modell === "provision"; };
  var an = function (z) { return z.status === "rueckgebucht" ? 0 : z.betragCent - (z.erstattetCent || 0) - Math.max(0, (z.gebuehrBruttoCent || 0) - (z.gebuehrErstattetCent || 0)); };

  async function laden() {
    try { D = await TF.api("/api/portal"); geladenAm = Date.now(); }
    catch (err) { if (err.status === 401) { location.href = "/login.html?app=1"; return; } $("laden").innerHTML = "<p>" + e(err.message) + "</p>"; return; }
    $("laden").classList.add("hidden"); $("app").setAttribute("aria-busy", "false");
    if (D.adminAnsicht && !document.getElementById("admin-ansicht")) {
      document.body.insertAdjacentHTML("afterbegin", '<div id="admin-ansicht" role="status" style="position:sticky;top:0;z-index:200;background:#a8231a;color:#fff;font:700 14px/1.4 system-ui,sans-serif;padding:8px 12px;display:flex;gap:10px;justify-content:space-between;align-items:center;flex-wrap:wrap"><span>Admin-Ansicht: ' + e(D.studio.firma) + ' · nur lesen</span><a href="/api/admin-ansicht/ende" style="color:#fff;background:rgba(0,0,0,.25);padding:4px 10px;border-radius:99px;text-decoration:none">Zurück zum Admin</a></div>');
    }
    kopf(); route(); aufRueckkehr();
  }

  function kopf() {
    var s = D.studio;
    $("top-firma").textContent = s.firma;
    var st = $("top-status");
    st.textContent = s.stripe.freigegeben ? "✓ Bereit" : s.stripe.angabenGemacht ? "Stripe prüft" : "Einrichtung offen";
    st.className = "app-top-r" + (s.stripe.freigegeben ? "" : " warn");
    $("sim-hinweis").classList.toggle("hidden", !s.simulation);
  }

  // Daten auffrischen, wenn sie älter als maxAlter ms sind (z. B. neue Zahlung eingegangen)
  async function frisch(maxAlter) {
    if (Date.now() - geladenAm < maxAlter) return;
    try { D = await TF.api("/api/portal"); geladenAm = Date.now(); kopf(); } catch (err) { if (err.status === 401) location.href = "/login.html?app=1"; }
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden && D) frisch(10000).then(route); });

  // ---------- Router ----------
  async function route() {
    if (!D) return;
    var teil = (location.hash || "#start").slice(1).split("/");
    if (["start", "zahlungen", "geld", ""].indexOf(teil[0]) >= 0) await frisch(15000);
    if (teil[0] === "zahlung") await frisch(D.zahlungen.some(function (z) { return z.id === teil[1]; }) ? 3000 : 0);
    var h = (location.hash || "#start").slice(1).split("/"), v = h[0] || "start", par = h[1];
    if (!document.querySelector('[data-view="' + v + '"]')) v = "start";
    document.querySelectorAll("[data-view]").forEach(function (s) { s.classList.toggle("hidden", s.dataset.view !== v); });
    var tab = { zahlung: "zahlungen", einrichtung: "start", recht: "mehr", extras: "mehr", konto: "mehr", einstellungen: "mehr", werbung: "mehr" }[v] || v;
    document.querySelectorAll("#tabbar a").forEach(function (a) { a.classList.toggle("on", a.dataset.tab === tab); });
    window.scrollTo(0, 0);
    (ANSICHT[v] || function () {})(par);
  }
  window.addEventListener("hashchange", route);

  var ANSICHT = {
    start: start, link: linkForm, zahlungen: zahlungen, zahlung: zahlungDetail, geld: geld, werbung: werbung,
    mehr: mehr, einrichtung: einrichtung, recht: recht, extras: extras, konto: konto, einstellungen: einstellungen,
  };

  // ---------- Stripe-Bausteine ----------
  function stripeSitzung() {
    if (!sessLaden) sessLaden = TF.api("/api/portal/stripe-session", { body: {} }).then(function (s) { sess = s; return TFStripe.connectStart(s).then(function () { return s; }); })
      .catch(function (err) { sessLaden = null; throw err; });
    return sessLaden;
  }
  function banner() {
    if (!D.studio.eingebettet || !D.studio.stripe.verbunden) return;
    stripeSitzung().then(function (s) { if (s.modus !== "weiterleitung" && s.modus !== "ansicht") TFStripe.zeige($("stripe-banner"), "notification-banner", { offen: !D.studio.stripe.freigegeben && D.studio.stripe.angabenGemacht }); }).catch(function () {});
  }

  // ---------- Start ----------
  function start() {
    var s = D.studio;
    var vorname = (s.inhaber || "").split(" ")[0];
    $("hallo").textContent = "Hey" + (vorname ? " " + vorname : "") + " 👋";
    checkliste();
    var l = D.zahlungen.slice(0, 5);
    $("letzte").innerHTML = l.length ? liste(l) : '<p class="leer">Noch keine Zahlungen. Erstelle oben deinen ersten Link – zum Testen gern an dich selbst.</p>';
    var k = D.kpis;
    $("geld-kurz").innerHTML = '<div class="card-h"><h2>Diesen Monat</h2><a href="#geld">Dein Geld</a></div><div class="geld-grid"><div><small>Kunden haben gezahlt</small><span class="geld-zahl">' + euro(k.umsatzMonatCent) + "</span></div><div><small>" + (prov() ? "an dich" : "Zahlungen") + '</small><span class="geld-zahl">' + (prov() ? euro(k.auszahlungMonatCent) : k.zahlungenMonat) + "</span></div></div>";
    installHinweis();
    banner();
  }

  function checkliste() {
    var s = D.studio, c = s.checkliste || {};
    var punkte = [
      { ok: true, t: "Vertrag abgeschlossen", s: "Paket " + s.paketName + (s.provisionProzent ? " · " + s.provisionProzent + " % pro Zahlung, alles inklusive" : s.paket === "monatlich" ? " · " + TF.euro(s.monatNetto || 4900) + " netto im Monat, keine Provision" : " · keine Provision") },
      { ok: s.stripe.freigegeben, warte: s.stripe.angabenGemacht && !s.stripe.freigegeben, t: "Zahlungskonto einrichten",
        s: s.stripe.freigegeben ? "Freigegeben. Das Geld deiner Kunden kommt auf dein Bankkonto." : s.stripe.angabenGemacht ? "Stripe prüft deine Angaben, meist 1 bis 3 Werktage." : "Ca. 10 Minuten. Ausweis und IBAN bereithalten.",
        knopf: s.stripe.freigegeben || s.stripe.angabenGemacht ? null : ["#einrichtung", "Jetzt einrichten", "gold"] },
      { ok: s.recht && s.recht.aktuell, t: "Deine rechtliche Lage lesen", s: "5 Minuten: Wer trägt welches Risiko?", knopf: ["#recht", "Lesen", "dark"] },
      { ok: D.zahlungen.length > 0, t: "Ersten Zahlungslink erstellen", s: "Zum Ausprobieren gern an dich selbst.", knopf: ["#link", "Erstellen", "dark"] },
      { ok: c.app || standalone, t: "Tattoofin auf den Startbildschirm", s: "Dann hast du die App immer griffbereit.", manuell: "app" },
      { ok: c.theke, t: "QR-Code an die Theke", s: "Zum Ausdrucken unter Werbung.", knopf: ["#werbung", "Ansehen", "ghost"], manuell: "theke" },
      { ok: c.werbung, t: "Ersten Instagram-Beitrag posten", s: "Fertige Bilder unter Werbung.", knopf: ["#werbung", "Bilder", "ghost"], manuell: "werbung" },
    ];
    var fertig = punkte.filter(function (p) { return p.ok; }).length;
    if (fertig === punkte.length) { $("checkliste").innerHTML = '<div class="card-a"><b>✓ Alles eingerichtet.</b> <span class="muted klein">Viel Erfolg mit Tattoofin!</span></div>'; return; }
    $("checkliste").innerHTML = '<div class="card-a" id="checkliste-karte"><div class="card-h"><h2>Einrichtung</h2><span class="muted klein">' + fertig + " von " + punkte.length + '</span></div><div class="fortschritt"><i style="width:' + Math.round(100 * fertig / punkte.length) + '%"></i></div><ul class="check-a">' +
      punkte.map(function (p) {
        return '<li class="' + (p.ok ? "ok" : p.warte ? "wait" : "") + '"><span class="ic">' + (p.ok ? "✓" : p.warte ? "…" : "") + "</span><span><b>" + e(p.t) + "</b><small>" + e(p.s) + "</small>" +
          (!p.ok && p.knopf ? '<a class="btn ' + p.knopf[2] + ' small" href="' + p.knopf[0] + '">' + e(p.knopf[1]) + "</a> " : "") +
          (!p.ok && p.manuell ? '<button class="btn ghost small" data-check="' + p.manuell + '">Erledigt</button>' : "") + "</span></li>";
      }).join("") + "</ul></div>";
  }

  function installHinweis() {
    var box = $("install");
    if (standalone || merke.get("tf-install") || (D.studio.checkliste || {}).app) { box.classList.add("hidden"); return; }
    var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    box.innerHTML = "<h2>📲 Tattoofin als App</h2>" +
      (ios ? "<p>Tippe unten im Browser auf <b>Teilen</b> (Viereck mit Pfeil) und dann auf <b>„Zum Home-Bildschirm“</b>. Fertig: Tattoofin liegt wie eine App auf deinem Handy.</p>"
        : installEvent ? "<p>Leg Tattoofin auf deinen Startbildschirm. Dann bist du mit einem Tipp drin.</p>"
          : "<p>Im Browser-Menü (⋮) auf <b>„Zum Startbildschirm hinzufügen“</b> tippen. Dann bist du mit einem Tipp drin.</p>") +
      '<div class="row-a">' + (installEvent ? '<button class="btn gold small" id="inst-ja">App installieren</button>' : "") + '<button class="btn ghost small" id="inst-nein">Später</button></div>';
    box.classList.remove("hidden");
    var ja = $("inst-ja"); if (ja) ja.onclick = async function () { installEvent.prompt(); var r = await installEvent.userChoice; if (r.outcome === "accepted") abhaken("app", true); installEvent = null; box.classList.add("hidden"); };
    $("inst-nein").onclick = function () { merke.set("tf-install", "spaeter"); box.classList.add("hidden"); };
  }
  window.addEventListener("beforeinstallprompt", function (ev) { ev.preventDefault(); installEvent = ev; if (D && (location.hash || "#start") === "#start") installHinweis(); });
  window.addEventListener("appinstalled", function () { abhaken("app", true); });

  async function abhaken(punkt, erledigt) {
    try { D.studio = await TF.api("/api/portal/checkliste", { body: { punkt: punkt, erledigt: erledigt } }); if ((location.hash || "#start") === "#start") start(); } catch (err) { toast(err.message, true); }
  }

  // ---------- Listen ----------
  function liste(l) {
    return '<ul class="zl">' + l.map(function (z) {
      var nachweis = z.leistung ? " · ✍️" : "";
      return '<li><a href="#zahlung/' + e(z.id) + '"><span class="wer"><b>' + e(z.kunde || "Kunde") + "</b><small>" + e(z.beschreibung || "") + " · " + dat(z.bezahltAm || z.createdAt) + nachweis + '</small></span><span class="betrag">' + euro(z.betragCent, true) +
        '<small><span class="chip ' + e(z.status) + '">' + e(STATUS[z.status] || z.status) + "</span></small></span></a></li>";
    }).join("") + "</ul>";
  }
  function zahlungen() {
    var l = D.zahlungen.filter(function (z) { return filter === "alle" || z.status === filter; });
    $("z-liste").innerHTML = '<div class="card-a">' + (l.length ? liste(l) : '<p class="leer">Hier ist noch nichts.</p>') + "</div>";
  }
  $("filter").addEventListener("change", function (ev) { filter = ev.target.value; zahlungen(); });

  // ---------- Zahlungslink ----------
  function linkForm() {
    var s = D.studio, g = $("link-gesperrt");
    g.innerHTML = s.kannKassieren ? "" : '<div class="card-a"><b>Erst noch das Zahlungskonto.</b><p class="klein muted">Sobald Stripe dein Konto freigegeben hat, kannst du Zahlungslinks erstellen.</p>' + (s.stripe.angabenGemacht ? "" : '<a class="btn gold small" href="#einrichtung">Jetzt einrichten</a>') + "</div>";
    $("l-btn").disabled = !s.kannKassieren;
    feeHinweis();
    setTimeout(function () { if (s.kannKassieren && !$("l-out").innerHTML) $("l-betrag").focus(); }, 50);
  }
  function betragCent(v) { var n = parseFloat(String(v || "").replace(/\s|€/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")); return isFinite(n) ? Math.round(n * 100) : 0; }
  function feeHinweis() {
    var c = betragCent($("l-betrag").value);
    if (!c) { $("l-fee").textContent = ""; return; }
    if (prov()) { var fee = Math.round(c * D.studio.provisionProzent / 100); $("l-fee").innerHTML = "Du bekommst <b>" + euro(c - fee, true) + "</b> · Tattoofin " + D.studio.provisionProzent + " % (" + euro(fee, true) + ", alles inklusive)"; }
    else $("l-fee").textContent = "Die Gebühr des Zahlungsanbieters (z. B. Karte ab 1,5 % + 0,25 €) zahlst du direkt an Stripe.";
  }
  $("l-betrag").addEventListener("input", feeHinweis);
  $("f-link").addEventListener("submit", async function (ev) {
    ev.preventDefault();
    var f = ev.target, b = $("l-btn"); b.disabled = true; b.textContent = "Einen Moment …";
    try {
      var r = await TF.api("/api/portal/zahlung", { body: { betrag: f.betrag.value, art: f.art.value, kunde: f.kunde.value, email: f.email.value, beschreibung: f.beschreibung.value, sitzungen: f.sitzungen.value } });
      var wa = "https://wa.me/?text=" + encodeURIComponent(r.whatsappText);
      $("l-out").innerHTML = '<div class="link-ok"><h2>✓ Link für ' + e(r.zahlung.kunde || "deinen Kunden") + " über " + euro(r.zahlung.betragCent, true) + '</h2><div class="qr" id="l-qr"></div>' +
        '<p class="klein muted">Kunde ist da? QR-Code scannen lassen. Sonst per WhatsApp schicken.</p><a class="btn wa big w100" target="_blank" rel="noopener" href="' + e(wa) + '">Per WhatsApp schicken</a>' +
        '<div class="row-a" style="justify-content:center"><button class="btn dark small" data-copytext="' + e(r.link) + '">Link kopieren</button><button class="btn ghost small" id="l-neu">Noch einen Link</button></div></div>';
      qr($("l-qr"), r.link);
      f.classList.add("hidden");
      $("l-neu").onclick = function () { f.reset(); f.classList.remove("hidden"); $("l-out").innerHTML = ""; feeHinweis(); $("l-betrag").focus(); };
      D = await TF.api("/api/portal"); geladenAm = Date.now();
    } catch (err) { toast(err.message, true); }
    b.disabled = !D.studio.kannKassieren; b.textContent = "Link erstellen";
  });

  // ---------- Zahlung im Detail ----------
  function zahlungDetail(id) {
    var z = D.zahlungen.find(function (x) { return x.id === id; });
    var box = $("z-detail");
    if (!z) { box.innerHTML = '<p class="leer">Zahlung nicht gefunden.</p>'; return; }
    var bez = ["bezahlt", "erstattet", "rueckgebucht"].indexOf(z.status) >= 0;
    var tf = z.status === "rueckgebucht" ? 0 : Math.max(0, (z.gebuehrBruttoCent || 0) - (z.gebuehrErstattetCent || 0));
    var rest = z.betragCent - (z.erstattetCent || 0);
    var zl = location.origin + "/zahlung.html?z=" + z.id;
    var anz = z.art === "anzahlung" || z.anzahlung;
    var zeilen = [["Projekt", e(z.beschreibung || "")], z.sitzungen ? ["Sitzungen", e(z.sitzungen)] : null, ["Art", anz ? "Anzahlung" : z.art === "zahlseite" ? "über deine Zahlseite" : "Projektpreis"],
      ["Erstellt", dat(z.createdAt)], bez ? ["Bezahlt am", dat(z.bezahltAm)] : null, z.zahlartText ? ["Zahlart", e(z.zahlartText)] : null,
      prov() && bez ? ["Tattoofin " + D.studio.provisionProzent + " %", euro(tf, true)] : null, prov() && bez ? ["An dich", euro(an(z), true)] : null,
      z.erstattetCent ? ["Erstattet", euro(z.erstattetCent, true)] : null, z.email ? ["E-Mail", e(z.email)] : null].filter(Boolean);
    var nachweise = '<div class="card-a"><h2>Nachweise</h2>' +
      zeile(Boolean(z.kundeBestaetigt), "Beim Bezahlen bestätigt", z.kundeBestaetigt ? "Betrag und Projekt, am " + dat(z.kundeBestaetigt.am) : "Passiert automatisch, wenn dein Kunde bezahlt.") +
      (anz ? zeile(Boolean(z.bedingungen), "Anzahlungsbedingungen bestätigt", z.bedingungen ? "am " + dat(z.bedingungen.akzeptiertAm) : "Passiert automatisch beim Bezahlen.") : "") +
      zeile(Boolean(z.leistung), "Leistungsbestätigung nach dem Termin", z.leistung ? e(z.leistung.name) + " · Termin " + dat(z.leistung.datum + "T12:00:00Z") + (z.leistung.hatFoto ? " · mit Foto" : "") : bez ? "Nach dem Termin: Kunde bestätigt mit Unterschrift, dass die Sitzung stattgefunden hat." : "Möglich, sobald bezahlt ist.") +
      (bez && !z.leistung ? '<button class="btn gold w100" id="lb-btn" style="margin-top:10px">Bestätigung vom Kunden holen</button><div id="lb-out"></div>' : "") +
      (bez ? '<a class="btn dark small" style="margin-top:12px" target="_blank" href="/nachweis.html?z=' + e(z.id) + '">Nachweis als PDF</a>' : "") +
      '<p class="muted klein" style="margin:10px 0 0">Hilft dir, falls jemand die Zahlung später zurückbucht. Eine Garantie, dass du einen Streitfall gewinnst, gibt es nicht.</p></div>';
    var aktionen = "";
    if (z.status === "offen") aktionen = '<div class="row-a"><a class="btn wa small" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent("Hier ist dein Zahlungslink: " + zl) + '">WhatsApp</a><button class="btn dark small" data-copytext="' + e(zl) + '">Link kopieren</button><button class="btn ghost small" id="z-storno">Stornieren</button></div>';
    var erstattbar = prov() && z.abwicklung === "plattform" && z.status === "bezahlt" && rest > 0 && !(z.rueckbuchung && !z.rueckbuchung.abgeschlossenAm);
    if (erstattbar) aktionen += '<div class="row-a"><button class="btn ghost small" id="z-erstatten">Geld zurückgeben (Erstattung)</button></div>';
    if (z.rueckbuchung && !z.rueckbuchung.abgeschlossenAm) aktionen += '<div class="card-a" style="border-color:var(--red)"><b>⚠️ Rückbuchung läuft.</b><p class="klein">Schick uns bitte schnell deine Nachweise (PDF oben) per WhatsApp. Wir reichen sie bei Stripe ein.</p></div>';
    box.innerHTML = '<div class="detail-kopf"><span class="chip ' + e(z.status) + '">' + e(STATUS[z.status] || z.status) + '</span><div class="amt">' + euro(z.betragCent, true) + "</div><b>" + e(z.kunde || "Kunde") + "</b></div>" +
      '<div class="card-a"><table class="tbl-a">' + zeilen.map(function (r) { return "<tr><th>" + r[0] + "</th><td>" + r[1] + "</td></tr>"; }).join("") + "</table>" + aktionen + "</div>" + nachweise;
    var lb = $("lb-btn"); if (lb) lb.onclick = async function () {
      lb.disabled = true;
      try {
        var r = await TF.api("/api/portal/bestaetigung/" + encodeURIComponent(z.id), { body: {} });
        $("lb-out").innerHTML = '<div class="link-ok"><p class="klein"><b>Kunde ist im Studio?</b> QR-Code mit dem Handy scannen lassen.</p><div class="qr" id="lb-qr"></div><a class="btn wa w100" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(r.whatsappText) + '">Per WhatsApp schicken</a><div class="row-a" style="justify-content:center"><button class="btn ghost small" data-copytext="' + e(r.link) + '">Link kopieren</button></div></div>';
        qr($("lb-qr"), r.link); lb.classList.add("hidden");
      } catch (err) { toast(err.message, true); lb.disabled = false; }
    };
    var st = $("z-storno"); if (st) st.onclick = async function () { if (!confirm("Zahlungslink stornieren? Dein Kunde kann dann nicht mehr bezahlen.")) return; try { await TF.api("/api/portal/zahlung/" + z.id, { method: "DELETE" }); D = await TF.api("/api/portal"); toast("Storniert."); zahlungDetail(id); } catch (err) { toast(err.message, true); } };
    var er = $("z-erstatten"); if (er) er.onclick = async function () {
      var ein = prompt("Wie viel möchtest du zurückgeben? (höchstens " + euro(rest, true) + ")", (rest / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 }));
      if (!ein) return;
      try { await TF.api("/api/portal/erstattung/" + z.id, { body: { betrag: ein } }); toast("Erledigt. Dein Kunde bekommt das Geld über seine Zahlart zurück."); setTimeout(async function () { D = await TF.api("/api/portal"); zahlungDetail(id); }, 900); }
      catch (err) { toast(err.message, true); }
    };
  }
  function zeile(ok, titel, text) { return '<div class="nachweis-ok"><span class="ic">' + (ok ? "✅" : "⬜") + "</span><span><b>" + e(titel) + '</b><br><span class="muted">' + text + "</span></span></div>"; }

  // ---------- Geld ----------
  function geld() {
    var s = D.studio;
    $("geld-text").textContent = prov()
      ? "Stripe zahlt dir " + (100 - s.provisionProzent) + " % jeder Zahlung automatisch auf dein Bankkonto aus, meist nach 1 bis 2 Werktagen. Die " + s.provisionProzent + " % für Tattoofin sind schon abgezogen, weitere Gebühren gibt es nicht."
      : "Das Geld landet auf deinem eigenen Stripe-Konto und wird automatisch auf dein Bankkonto ausgezahlt. Die Gebühren des Zahlungsanbieters zieht Stripe direkt ab.";
    var box = $("geld-box");
    if (!s.stripe.freigegeben) { box.innerHTML = '<div class="card-a"><b>Noch kein Zahlungskonto freigegeben.</b><p class="klein muted">Sobald es eingerichtet ist, siehst du hier deine Auszahlungen.</p>' + (s.stripe.angabenGemacht ? "" : '<a class="btn gold small" href="#einrichtung">Jetzt einrichten</a>') + "</div>"; return; }
    if (!s.eingebettet) { box.innerHTML = '<div class="card-a"><p class="klein">Deine Auszahlungen zeigt Stripe auf einer eigenen Seite.</p><button class="btn dark" id="dash">Auszahlungen ansehen</button></div>'; $("dash").onclick = dashboard; return; }
    box.innerHTML = "";
    stripeSitzung().then(function (r) { if (r.modus === "ansicht") { box.innerHTML = '<p class="leer">' + e(r.hinweis) + "</p>"; return; } TFStripe.zeige(box, "payouts", { zahlungen: D.zahlungen }); }).catch(function (err) { box.innerHTML = '<p class="leer">' + e(err.message) + "</p>"; });
  }
  async function dashboard() { try { window.open((await TF.api("/api/portal/stripe-dashboard", { body: {} })).url, "_blank"); } catch (err) { toast(err.message, true); } }

  // ---------- Einrichtung (eingebettet) ----------
  function einrichtung() {
    var s = D.studio, box = $("einr-box"), st = $("einr-status");
    if (s.stripe.freigegeben) { st.innerHTML = '<div class="card-a"><b>✓ Dein Zahlungskonto ist freigegeben.</b><p class="klein muted">Du kannst Zahlungslinks erstellen. Bankdaten änderst du unter Mehr → Bankkonto &amp; Daten.</p><a class="btn gold small" href="#link">Ersten Zahlungslink erstellen</a></div>'; box.innerHTML = ""; return; }
    st.innerHTML = s.stripe.angabenGemacht ? '<div class="card-a"><b>Danke! Stripe prüft deine Angaben.</b><p class="klein muted">Meist dauert das 1 bis 3 Werktage. Du bekommst eine E-Mail. Falls Stripe noch etwas braucht, steht es unten.</p></div>' : "";
    box.innerHTML = "";
    stripeSitzung().then(function (r) {
      if (r.modus === "ansicht") { box.innerHTML = '<div class="card-a"><p class="klein">' + e(r.hinweis) + "</p></div>"; return; }
      if (r.modus === "weiterleitung") { box.innerHTML = '<div class="card-a"><p class="klein">Die Einrichtung läuft auf einer sicheren Seite unseres Zahlungspartners Stripe. Danach kommst du automatisch zurück.</p><a class="btn gold big w100" href="' + e(r.url) + '">Weiter zur Einrichtung</a></div>'; return; }
      TFStripe.zeige(box, "account-onboarding", { firma: s.firma, inhaber: s.inhaber, fertig: async function () {
        try { D.studio = await TF.api("/api/portal/konto-status", { body: {} }); } catch (x) {}
        kopf();
        toast(D.studio.stripe.freigegeben ? "Geschafft! Dein Zahlungskonto ist bereit." : "Danke! Stripe prüft jetzt deine Angaben.");
        if (D.studio.stripe.freigegeben) setTimeout(function () { location.hash = "#start"; }, 1200); else einrichtung();
      } });
    }).catch(function (err) { box.innerHTML = '<p class="leer">' + e(err.message) + "</p>"; });
  }

  // ---------- Werbung ----------
  function werbung() {
    var s = D.studio;
    $("zs-url").value = s.zahlseite; $("zs-open").href = s.zahlseite; qr($("zs-qr"), s.zahlseite, 220);
    $("mat").innerHTML = D.materialLinks.map(function (m) { return '<a target="_blank" rel="noopener" href="' + e(m.url) + '">' + e(m.titel) + "<small>Mit " + e(s.firma) + " und deinem QR-Code · Öffnen → Drucken/PDF</small></a>"; }).join("");
    if (window.TFKit) TFKit.zeige($("kit"), { firma: s.firma, ort: s.ort, zahlseite: s.zahlseite, onPost: function () { abhaken("werbung", true); } });
    $("zs-png").onclick = function () { if (window.TFAufsteller) datei(TFAufsteller.qrBild(s.zahlseite, 1200), "tattoofin-qr-zahlseite.png"); };
    aufsteller();
  }

  // ---------- QR-Aufsteller aus Holz ----------
  // Vorschau + Dateien (SVG/PDF/PNG) entstehen im Browser aus dem echten Link der Zahlseite (js/aufsteller.js).
  var AUF = { logo: null, geladen: false, nr: 0 };
  function datei(inhalt, name) {
    var fertig = function (blob) { var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); };
    if (inhalt instanceof HTMLCanvasElement) inhalt.toBlob(fertig, "image/png"); else fertig(inhalt);
  }
  function aufWahl() {
    var h = document.querySelector('input[name="auf-holz"]:checked'), v = document.querySelector('input[name="auf-var"]:checked');
    return { holz: h ? h.value : "hell", variante: v ? v.value : "name" };
  }
  function aufOpts() { var s = D.studio, w = aufWahl(); return { url: s.zahlseite, firma: s.firma, variante: w.variante === "logo" && AUF.logo ? "logo" : w.variante, logo: AUF.logo }; }
  async function aufZeichnen() {
    var nr = ++AUF.nr, w = aufWahl();
    $("auf-logo-box").classList.toggle("hidden", w.variante !== "logo");
    $("auf-holz-hinweis").textContent = w.holz === "dunkel"
      ? "Dunkles Holz (Walnuss) sieht edel aus, der QR-Code hat aber weniger Kontrast (im Test sicher bis etwa 80 cm). Bei Formulor gibt es kein dunkles Sperrholz – dafür einen anderen Anbieter wählen."
      : "Helles Holz (Birke, Buche, Ahorn) hat den besten Kontrast. Im Test ließ sich der QR-Code auch aus über 1 m scannen.";
    try {
      var cv = await TFAufsteller.vorschau(aufOpts(), w.holz, 720);
      if (nr !== AUF.nr) return;
      $("auf-img").src = cv.toDataURL("image/png"); $("auf-laden").classList.add("hidden");
    } catch (err) { $("auf-laden").textContent = "Vorschau nicht möglich: " + err.message; }
  }
  async function aufSpeichern(extra) {
    var w = aufWahl(), b = { holz: w.holz, variante: w.variante };
    Object.assign(b, extra || {});
    D.studio = await TF.api("/api/portal/aufsteller", { body: b });
    aufPaket();
  }
  function aufPaket() {
    var a = D.studio.aufsteller || {}, box = $("auf-paket");
    var preis = euro(a.preisNetto || 2900).replace(",00", "");
    var knopf = a.bezahltAm ? '<span class="chip ok">✓ Bestellt und bezahlt am ' + dat(a.bezahltAm) + " – wir lassen ihn fertigen und melden uns</span>"
      : a.angefordertAm ? '<span class="chip ok">✓ ' + (a.inklusive ? "Angefordert" : "Angefragt") + " am " + dat(a.angefordertAm) + " – wir melden uns</span>"
      : a.inklusive ? '<button class="btn gold small" id="auf-anfordern">Aufsteller kostenlos anfordern</button>'
      : '<button class="btn gold small" id="auf-kaufen">QR-Aufsteller bestellen – ' + preis + '</button>';
    box.innerHTML = a.inklusive
      ? "<b>✓ In deinem Paket enthalten (im Wert von " + preis + ").</b> Wir lassen deinen Aufsteller fertigen und schicken ihn an deine Studio-Adresse. Wähle unten Holz und Variante, dann anfordern.<div class=\"row-a\">" + knopf + "</div>"
      : "<b>Fertig graviert für " + preis + " netto</b> (zzgl. USt., inkl. Versand an deine Studio-Adresse, Rechnung kommt automatisch). Oder kostenlos selbst machen: Die Dateien unten kannst du bei jedem Laser-Dienst gravieren lassen.<div class=\"row-a\">" + knopf + "</div>";
    var w0 = function () {
      var w = aufWahl();
      if (w.variante === "logo" && !AUF.logo) { toast("Bitte lade zuerst dein Logo hoch oder wähle „Mit Studioname“.", true); return null; }
      return w;
    };
    var k = $("auf-anfordern");
    if (k) k.onclick = async function () {
      var w = w0(); if (!w) return;
      if (!confirm("Aufsteller jetzt anfordern? Holz " + (w.holz === "dunkel" ? "dunkel" : "hell") + ", " + (w.variante === "logo" ? "mit deinem Logo" : "mit Studioname") + ". Lieferung an deine Studio-Adresse.")) return;
      k.disabled = true;
      try { await aufSpeichern({ anfordern: true }); toast("Danke! Wir kümmern uns um deinen Aufsteller."); }
      catch (err) { k.disabled = false; toast(err.message, true); }
    };
    var kk = $("auf-kaufen");
    if (kk) kk.onclick = async function () {
      var w = w0(); if (!w) return;
      if (!confirm("QR-Aufsteller für " + preis + " netto (zzgl. USt.) bestellen? Holz " + (w.holz === "dunkel" ? "dunkel" : "hell") + ", " + (w.variante === "logo" ? "mit deinem Logo" : "mit Studioname") + ". Lieferung an deine Studio-Adresse. Du wirst zur sicheren Bezahlseite von Stripe weitergeleitet.")) return;
      kk.disabled = true;
      try {
        var b = aufWahl(), r = await TF.api("/api/portal/aufsteller", { body: { holz: b.holz, variante: b.variante, kaufen: true } });
        if (r.url) { location.href = r.url; return; }
        D.studio = r; aufPaket();
      } catch (err) { kk.disabled = false; toast(err.message, true); }
    };
  }
  // Rückkehr aus dem Aufsteller-Checkout (Stripe): Zahlung prüfen, Adresse aufräumen
  async function aufRueckkehr() {
    var q = new URLSearchParams(location.search);
    if (q.get("aufsteller") !== "bezahlt" || !q.get("cs")) return;
    try { history.replaceState(null, "", "/app.html" + location.hash); } catch (x) {}
    try {
      var r = await TF.api("/api/portal/aufsteller-pruefen", { body: { cs: q.get("cs") } });
      D.studio = r;
      toast(r.bezahlt ? "Danke! Dein QR-Aufsteller ist bestellt. Wir melden uns, sobald er unterwegs ist." : "Die Zahlung ist noch nicht bestätigt. Wir melden uns, sobald sie da ist.", !r.bezahlt);
      if ($("auf-paket")) aufPaket();
    } catch (err) { toast(err.message, true); }
  }
  async function aufsteller() {
    if (!window.TFAufsteller) return;
    var s = D.studio, a = s.aufsteller || {};
    aufPaket();
    if (!AUF.geladen) {
      AUF.geladen = true;
      try {
        await TFAufsteller.laden();
        if (a.hatLogo) { var p = await (await fetch("/api/aufsteller?s=" + encodeURIComponent(s.zahlseite.split("/").pop()))).json(); if (p.logo) AUF.logo = await TFAufsteller.logoAusDaten(p.logo); }
      } catch (err) { $("auf-laden").textContent = "Vorschau konnte nicht geladen werden."; AUF.geladen = false; return; }
      document.querySelectorAll('input[name="auf-holz"]').forEach(function (r) { r.checked = r.value === (a.holz || "hell"); r.onchange = function () { aufZeichnen(); aufSpeichern().catch(function () {}); }; });
      document.querySelectorAll('input[name="auf-var"]').forEach(function (r) {
        r.checked = r.value === (a.variante || "name");
        r.onchange = function () { aufZeichnen(); if (r.value === "name" || AUF.logo) aufSpeichern().catch(function () {}); };
      });
      $("auf-logo").onchange = async function () {
        var f = this.files && this.files[0]; if (!f) return;
        if (f.size > 8e6) return toast("Die Datei ist zu groß (max. 8 MB).", true);
        try {
          AUF.logo = await TFAufsteller.logoVorbereiten(f);
          aufZeichnen();
          await aufSpeichern({ variante: "logo", logo: AUF.logo.src, logoW: AUF.logo.w, logoH: AUF.logo.h });
          toast("Logo gespeichert.");
        } catch (err) { toast(err.message, true); }
      };
      document.querySelectorAll("[data-auf]").forEach(function (b) {
        b.onclick = async function () {
          var o = aufOpts(), art = b.dataset.auf, name = "tattoofin-qr-aufsteller-" + (s.zahlseite.split("/").pop() || "studio") + (o.variante === "logo" ? "-logo" : "");
          if (aufWahl().variante === "logo" && !AUF.logo) return toast("Bitte lade zuerst dein Logo hoch – oder wähle „Mit Studioname“.", true);
          try {
            var fo = { formulor: true, dicke: 3 };
            if (art === "fsvg") datei(new Blob([TFAufsteller.svg(o, fo)], { type: "image/svg+xml" }), name + "-formulor-P1-birke-3mm.svg");
            else if (art === "fpdf") datei(new Blob([TFAufsteller.pdf(o, fo)], { type: "application/pdf" }), name + "-formulor-P1-birke-3mm.pdf");
            else if (art === "svg") datei(new Blob([TFAufsteller.svg(o)], { type: "image/svg+xml" }), name + "-schild.svg");
            else if (art === "pdf") datei(new Blob([TFAufsteller.pdf(o)], { type: "application/pdf" }), name + "-schild.pdf");
            else datei(await TFAufsteller.png(o), name + "-600dpi.png");
          } catch (err) { toast(err.message, true); }
        };
      });
    }
    aufZeichnen();
  }

  // ---------- Mehr ----------
  function mehr() {
    var s = D.studio;
    $("mehr-recht").textContent = s.recht && s.recht.aktuell ? "Gelesen am " + dat(s.recht.am) + " ✓" : "Wer trägt welches Risiko? Einfach erklärt.";
    $("mehr-fb").textContent = s.fragebogenAm ? "Ausgefüllt am " + dat(s.fragebogenAm) : "Hilft uns bei der Einrichtung (10 Minuten)";
    $("mehr-paket").textContent = "Dein Paket: " + s.paketName + (s.provisionProzent ? " · " + s.provisionProzent + " % pro Zahlung, alles inklusive" : s.paket === "monatlich" ? " · " + TF.euro(s.monatNetto || 4900) + " netto im Monat, keine Provision" : " · keine Provision") + " · Angemeldet als " + s.email;
  }

  // ---------- Recht ----------
  var rechtGeladen = false;
  async function recht() {
    if (!rechtGeladen) {
      try {
        var t = await (await fetch("/recht.html")).text();
        var m = t.match(/<main[^>]*id="recht"[^>]*>([\s\S]*?)<\/main>/);
        $("recht-inhalt").innerHTML = m ? m[1] : "<p>Konnte nicht geladen werden.</p>";
        TF.config().then(TF.fill);
        rechtGeladen = true;
      } catch (err) { $("recht-inhalt").innerHTML = '<p class="leer">' + e(err.message) + "</p>"; }
    }
    var s = D.studio, box = $("recht-ok");
    if (s.recht && s.recht.aktuell) { box.innerHTML = "<b>✓ Gelesen und bestätigt</b><p class=\"klein muted\">am " + dat(s.recht.am) + " · Version " + e(s.recht.version) + '</p><div class="row-a"><a class="btn dark small" href="/recht.html?druck=1" target="_blank">Als PDF speichern</a></div>'; return; }
    box.innerHTML = '<h2>Bestätigen</h2><label class="haken"><input type="checkbox" id="r-ok"> <span>Ich habe das Blatt gelesen und verstanden. Mir ist klar, dass es keine Rechtsberatung ist.</span></label>' +
      '<label class="lbl" for="r-name">Dein Name</label><input type="text" id="r-name" autocomplete="name" value="' + e(s.inhaber || "") + '">' +
      '<div class="row-a"><button class="btn gold" id="r-btn">Bestätigen</button><a class="btn ghost small" href="/recht.html?druck=1" target="_blank">Als PDF speichern</a></div>';
    $("r-btn").onclick = async function () {
      if (!$("r-ok").checked) return toast("Bitte setze erst das Häkchen.", true);
      try { D.studio = await TF.api("/api/portal/recht", { body: { gelesen: true, version: D.config.rechtVersion, name: $("r-name").value } }); toast("Danke! Gespeichert mit Datum und Version."); recht(); }
      catch (err) { toast(err.message, true); }
    };
  }

  // ---------- Extras ----------
  function extras() {
    var angefragt = D.studio.extrasAngefragt || [];
    $("extras-liste").innerHTML = (D.extras || []).map(function (x) {
      var ok = angefragt.indexOf(x.id) >= 0;
      return '<div class="card-a extra"><span class="em">' + e(x.icon) + "</span><div><h2>" + e(x.titel) + "</h2><p class=\"klein\">" + e(x.text) + '</p><div class="preis">' + e(x.preis) + "</div>" +
        (ok ? '<span class="chip ok">✓ Angefragt – wir melden uns</span>' : '<button class="btn gold small" data-extra="' + e(x.id) + '">Interesse</button>') + "</div></div>";
    }).join("");
  }

  function konto() {
    var s = D.studio, box = $("konto-box");
    if (!s.stripe.verbunden || !s.eingebettet) { box.innerHTML = '<div class="card-a"><p class="klein">' + (s.stripe.verbunden ? "Deine Bank- und Firmendaten verwaltet Stripe auf einer eigenen Seite." : "Noch kein Zahlungskonto.") + "</p>" + (s.stripe.verbunden ? '<button class="btn dark" id="dash2">Bei Stripe ansehen</button>' : '<a class="btn gold small" href="#einrichtung">Jetzt einrichten</a>') + "</div>"; var d2 = $("dash2"); if (d2) d2.onclick = dashboard; return; }
    box.innerHTML = "";
    stripeSitzung().then(function (r) { if (r.modus === "ansicht") { box.innerHTML = '<p class="leer">' + e(r.hinweis) + "</p>"; return; } TFStripe.zeige(box, "account-management", { firma: s.firma, adresse: s.strasse + ", " + s.plz + " " + s.ort }); }).catch(function (err) { box.innerHTML = '<p class="leer">' + e(err.message) + "</p>"; });
  }

  function einstellungen() { $("k-email").value = D.studio.benachrichtigung.email || ""; $("k-anz").value = D.studio.anzahlungsbedingungen || ""; }
  $("k-anz-save").onclick = async function () { try { D.studio = await TF.api("/api/portal/kontakt", { method: "PATCH", body: { anzahlungsbedingungen: $("k-anz").value } }); einstellungen(); toast("Anzahlungsbedingungen gespeichert."); } catch (err) { toast(err.message, true); } };
  $("k-save").onclick = async function () { try { D.studio = await TF.api("/api/portal/kontakt", { method: "PATCH", body: { email: $("k-email").value } }); toast("Gespeichert."); } catch (err) { toast(err.message, true); } };
  $("logout").onclick = async function () { await TF.api("/api/logout", { method: "POST" }); location.href = "/login.html"; };
  $("logout-alle").onclick = async function () { if (!confirm("Auf allen Handys und Computern abmelden?")) return; await TF.api("/api/portal/abmelden", { body: {} }); location.href = "/login.html"; };

  document.addEventListener("click", async function (ev) {
    var t = ev.target.closest("[data-copy],[data-copytext],[data-check],[data-extra]");
    if (!t) return;
    if (t.dataset.copy || t.dataset.copytext) {
      var text = t.dataset.copytext || $(t.dataset.copy).value;
      try { await navigator.clipboard.writeText(text); } catch (x) { prompt("Link kopieren:", text); }
      t.textContent = "Kopiert ✓"; return;
    }
    if (t.dataset.check) return abhaken(t.dataset.check, true);
    if (t.dataset.extra) {
      t.disabled = true;
      try { await TF.api("/api/portal/extra", { body: { extra: t.dataset.extra } }); D.studio.extrasAngefragt = (D.studio.extrasAngefragt || []).concat(t.dataset.extra); toast("Danke! Wir melden uns persönlich bei dir."); extras(); }
      catch (err) { toast(err.message, true); t.disabled = false; }
    }
  });

  // Offline-Hinweis + Service Worker (Web-App)
  function netz() { $("offline").classList.toggle("hidden", navigator.onLine !== false); }
  window.addEventListener("online", netz); window.addEventListener("offline", netz); netz();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(function () {});
  laden();
})();
