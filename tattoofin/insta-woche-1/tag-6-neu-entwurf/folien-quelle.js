// Folien-Quelle der Preisumstellung 49,90 € inkl. MwSt. (15.11.2026). Wird in spots/tfin-w1-gemeinsam/bauen.mjs direkt vor
// 'if (process.argv.includes("texte"))' eingefügt (spätere Definitionen überschreiben frühere), dann:
//   node bauen.mjs <ausgabe> nur=t4-4,t6-1,t6-2,t6-3,s6-1,s6-2,t7-1,s7-1,s7-2
// OHNE HINWEISE (15.11.2026, Entscheidung Domenic): Werbung an Studio-Inhaber verkauft – kein „nur für Unternehmer“,
// kein „dazu Stripe-Gebühren“, keine Stripe-Fußnote. Preis überall „49,90 € im Monat“, „inkl. MwSt.“ nur klein.
// t4-4 → 2026-11-16_w1-tag4/bild-4.jpg · t6-1..3 → tag6 bild-1..3 · s6-1/2 → tag6 story-1/2 · t7-1 → tag7 bild.jpg · s7-2 → tag7 story-2.jpg
// ---------- Preis 49,90 € inkl. MwSt. (Entscheidung Domenic 15.11.2026) – überschreibt die Folien mit altem Preis ----------
feed("t4-4", `${bg("blau", "75%")}<div class="in">
<span class="kick">Tattoofin</span>
<h1 class="m" style="margin-top:28px">Gutscheine sind <em>schon dabei.</em></h1>
<ul class="ck" style="margin-top:26px">
<li>Gutschein-Link per WhatsApp</li><li>Code und PDF für den Käufer</li><li>Gültig 3 Jahre bis Jahresende</li><li>Code prüfen in der App</li></ul>
<p class="l" style="margin-top:30px;font-size:40px;font-weight:800"><span style="color:var(--g)">49,90 € im Monat</span> <span style="font-size:26px;font-weight:600;opacity:.8">inkl. MwSt.</span><br>Keine Provision · monatlich kündbar</p>
${CTA()}
</div>${fuss("4/4")}`);
feed("t6-1", `${bg("blau", "55%")}<div class="in" style="text-align:center">
<span class="kick">Was kostet Tattoofin?</span>
<div style="margin-top:80px"><span class="gross" style="font-size:236px">49,90 €</span></div>
<h1 class="m" style="margin-top:18px">im Monat</h1>
<p class="k" style="margin-top:14px;opacity:.85">inkl. MwSt.</p>
<div style="margin-top:70px"><span class="lip" style="font-size:58px">Keine Provision</span></div>
<p class="l" style="margin-top:56px">Monatlich kündbar. Keine Einrichtungsgebühr.</p>
</div>${fuss("1/3")}`);
feed("t6-2", `${bg("papier", "15%")}<div class="in">
<span class="kick">Beispiel</span>
<h1 class="s">Dein Kunde zahlt <em>1.000 €</em> per Karte</h1>
<div class="karte" style="margin-top:44px;padding:14px 40px">
 <div class="zeile"><span>Stripe-Gebühr Karte</span><b>ab ca. 15 €</b></div>
 <div class="zeile"><span>An Tattoofin</span><b>0 €</b></div>
 <div class="zeile"><span>Auf deinem Stripe-Konto</span><b>bis ca. 985 €</b></div>
 <div class="zeile"><span>Dazu fester Preis</span><b>49,90 €/Monat</b></div>
</div>
<p class="l" style="margin-top:44px"><b>An Tattoofin zahlst du immer dasselbe,</b> egal wie viel deine Kunden zahlen.</p>
<div style="margin-top:40px"><span class="lip" style="font-size:52px">Fester Preis statt Prozente</span></div>
</div>${fuss("2/3")}`);
feed("t7-1", `${bg("papier", "85%")}<div class="in">
<span class="kick">Ehrliche Frage</span>
<h1 class="m">Warum nicht einfach <em>direkt Stripe?</em></h1>
<p class="l" style="margin-top:24px;font-size:38px"><b>Kannst du.</b> Dann baust du Zahlseite, Anzahlung mit Bedingungen, Gutscheine und QR-Code selbst.</p>
<p class="l" style="font-size:38px;margin-top:20px">Bei Tattoofin ist das fertig: Wir richten es mit dir ein und machen eine Testzahlung.</p>
<p class="l" style="margin-top:24px;font-size:38px;font-weight:800">49,90 € im Monat <span style="font-size:26px;font-weight:600;opacity:.8">inkl. MwSt.</span><br>Keine Provision · monatlich kündbar</p>
${CTA(56)}
</div>${fuss(0, "")}`);
story("s6-1", `${bg("blau", "45%")}<div class="in" style="align-items:center;text-align:center">
<span class="kick">Ein Preis</span>
<div style="margin-top:50px"><span class="gross" style="font-size:230px">49,90 €</span></div>
<h1 class="m" style="margin-top:10px">im Monat</h1>
<p class="k" style="margin-top:12px;opacity:.85;color:#fff">inkl. MwSt.</p>
<div style="margin-top:44px"><span class="lip" style="font-size:58px">Keine Provision</span></div>
<p class="l" style="margin-top:40px;color:#fff">Monatlich kündbar.</p>
${CTA(66)}
</div>${sFuss()}`);
story("s7-2", `${bg("papier", "55%")}<div class="in">
<span class="kick">Diese Woche</span>
<h1 class="s">Falls du was verpasst hast:</h1>
<ul class="ck" style="margin-top:18px;font-size:0">
<li style="font-size:42px;padding-top:12px;padding-bottom:12px">Anzahlung per Link</li><li>No-Show: dein Rechenzettel</li><li>QR an der Theke</li><li>Gutscheine per Link</li><li>Große Projekte</li><li>Ein Preis: 49,90 € im Monat</li><li>Warum nicht direkt Stripe?</li></ul>
${CTA(66)}
</div>${sFuss()}`);

// ---------- Nachbesserung Abnahme 15.11.2026 (ohne Hinweise, Layout) ----------
// t4-1..3: kein Umbruch „E-/Mail“, „Apple Pay“/„Google Pay“ ungetrennt, Folienzähler links neben der Wortmarke statt über dem Handy
// s3-1, s4-2: Handy kürzer, damit „tattoofin.de/start“ nicht an der Handy-Unterkante klebt
// s5-2: Raten-/Warnsatz-Story ersetzt durch Zahlarten-Story · s6-2: doppelte Zeile „In ein paar Minuten selbst anmelden“ entfernt
// t6-2: Rechenbeispiel ohne Stripe-Betrag (1.000 € Tattoo → an Tattoofin 0 €, keine Provision; „0 %“ sperrt der Preis-Scanner)
const nw = (t) => `<span style="white-space:nowrap">${t}</span>`;
const fussL = (nr) => `<div class="fuss" style="justify-content:flex-start;gap:26px"><img src="${A}wortmarke.png" alt=""><span class="nr">${nr}</span></div>`;
const tel2 = (src, oben, r = false) => `${handy({ src, x: 190, y: 560, w: 700, oben, hoehe: 465, drehen: r ? 1.5 : -1.5 })}${pill(120, 520)}`;
feed("t4-1", `${bg("gelb", "80%")}<div class="in">
<span class="kick">Gutscheine</span>
<h1 class="m">Tattoo-Gutschein zu Weihnachten?<br><em>Per Link.</em></h1>
<p class="k" style="width:420px;font-size:36px;margin-top:44px">Betrag eintippen, Link per WhatsApp schicken.</p>
<p class="k" style="width:420px;font-size:36px">Dein Kunde bekommt Code und PDF per ${nw("E-Mail")}.</p>
</div>
${handy({ src: "app-gutschein-link.png", x: 540, y: 500, w: 500, oben: 60, hoehe: 900, drehen: 2 })}
${pill(84, 1100)}${fussL("1/4")}`);
feed("t4-2", `${bg("papier", "80%")}<div class="in">
<span class="kick">So sieht's der Käufer</span>
<h1 class="m">Betrag, für wen,<br><em>kaufen.</em></h1>
<p class="k" style="width:420px;font-size:34px;margin-top:40px">Bezahlt wird per Karte, ${nw("Apple Pay")} oder ${nw("Google Pay")}.</p>
<p class="k" style="width:420px;font-size:34px">Vor dem Kauf sieht er Gültigkeit, Widerrufsrecht und wer den Gutschein ausstellt.</p>
</div>
${handy({ src: "kunde-gutschein-kauf.png", x: 540, y: 470, w: 500, oben: 0, hoehe: 900, drehen: -2 })}
${pill(84, 1100)}${fussL("2/4")}`);
feed("t4-3", `${bg("gelb", "80%")}<div class="in">
<span class="kick">Beim Termin</span>
<h1 class="m">Code prüfen.<br><em>Fertig.</em></h1>
<p class="k" style="width:420px;font-size:34px;margin-top:40px">Alle verkauften Gutscheine stehen in deiner App.</p>
<p class="k" style="width:420px;font-size:34px">Der Käufer hat Code und PDF per ${nw("E-Mail")} bekommen. Gültig bis Ende des dritten Jahres.</p>
</div>
${handy({ src: "app-gutscheine.png", x: 540, y: 470, w: 500, oben: 40, hoehe: 900, drehen: 2 })}
${pill(84, 1100)}${fussL("3/4")}`);
feed("t6-2", `${bg("papier", "15%")}<div class="in">
<span class="kick">Beispiel</span>
<h1 class="s">Dein Kunde zahlt <em>1.000 €</em> fürs Tattoo</h1>
<div class="karte" style="margin-top:44px;padding:14px 40px">
 <div class="zeile"><span>An Tattoofin</span><b>0 €</b></div>
 <div class="zeile"><span>Provision</span><b>keine</b></div>
 <div class="zeile"><span>Dein fester Preis</span><b>49,90 €/Monat</b></div>
</div>
<p class="l" style="margin-top:44px"><b>An Tattoofin zahlst du immer dasselbe,</b> egal wie viel deine Kunden zahlen.</p>
<div style="margin-top:40px"><span class="lip" style="font-size:52px">Fester Preis statt Prozente</span></div>
</div>${fuss("2/3")}`);
story("s3-1", `${bg("gelb", "60%")}<div class="in oben">
<span class="kick">So sieht's dein Kunde</span>
<h1 class="s">QR scannen, deine Zahlseite geht auf.</h1>
</div>${tel2("kunde-zahlseite.png", 0, true)}${sFuss()}`);
story("s4-2", `${bg("papier", "60%")}<div class="in oben">
<span class="kick">So bekommt's dein Kunde</span>
<h1 class="s">Link, bezahlen, Code und PDF per ${nw("E-Mail")}.</h1>
</div>${tel2("kunde-gutschein-kauf.png", 0)}${sFuss()}`);
story("s5-2", `${bg("papier", "30%")}<div class="in">
<span class="kick">Große Projekte</span>
<h1 class="s">Ein Link. <em>Er zahlt, wie er will.</em></h1>
<div class="opt" style="margin-top:34px;display:grid;grid-template-columns:1fr 1fr;gap:22px"><div style="justify-content:center">Karte</div><div style="justify-content:center">Klarna</div><div style="justify-content:center">Apple Pay</div><div style="justify-content:center">Google Pay</div></div>
<p class="l" style="font-size:40px;margin-top:28px">Den ganzen Betrag, direkt am Handy.</p>
${CTA(62)}
</div>${sFuss()}`);
story("s6-2", `${bg("gelb", "60%")}<div class="in">
<span class="kick">Ohne Termin, ohne Anruf</span>
<h1 class="m">In ein paar Minuten <em>selbst anmelden.</em></h1>
<div class="karte" style="margin-top:40px;width:100%">
<div style="font:800 40px/1.35 'DM Sans'">1 · Online anmelden</div>
<div style="font:800 40px/1.35 'DM Sans';margin-top:14px">2 · Stripe-Konto verbinden</div>
<div style="font:800 40px/1.35 'DM Sans';margin-top:14px">3 · Wir richten Logo und QR-Code ein und machen eine Testzahlung</div>
</div>
<div style="margin-top:40px"><span class="lip" style="font-size:66px">tattoofin.de/start</span></div>
<p class="ct1">Link im Profil</p>
<p class="ct2">Rückfragen? WhatsApp 0162 4502375</p>
</div>${sFuss()}`);

// ---------- Abnahme 2 (15.11.2026) ----------
// „(Link im Profil)“ bricht nie mehr in der Klammer um: bleibt zusammen und rutscht bei Platzmangel als Ganzes in die nächste Zeile.
for (const s of Object.values(F)) s.html = s.html.replaceAll("<span>(Link im Profil)</span>", `<span style="white-space:nowrap">(Link im Profil)</span>`);
// Überschriften h1.s erbten die Strahlen-Regel „.papier/.gelb/.blau .s“ des Hintergrunds (Klassen-Kollision) → rechteckiger Kasten ohne Punkteraster hinter der Überschrift. Hintergrund dort abschalten:
for (const s of Object.values(F)) if (s.html.includes('<h1 class="s"')) s.html = `<style>.f h1.s{background:none}</style>` + s.html;
