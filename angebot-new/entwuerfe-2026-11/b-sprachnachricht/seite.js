import { BEISPIELE, euro, rechne, auswerten, sprechen, spracheMoeglich } from "./_motor/motor.js";

const $ = (s, w = document) => w.querySelector(s);
const $$ = (s, w = document) => [...w.querySelectorAll(s)];
const ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
const warte = (ms) => new Promise((r) => setTimeout(r, ruhig ? 0 : ms));
const BILD = {
  mic: '<svg viewBox="0 0 24 24"><rect x="8" y="2" width="8" height="13" rx="4"/><path d="M5 11a1 1 0 0 1 2 0 5 5 0 0 0 10 0 1 1 0 0 1 2 0 7 7 0 0 1-6 6.93V21h2a1 1 0 0 1 0 2H9a1 1 0 0 1 0-2h2v-3.07A7 7 0 0 1 5 11Z"/></svg>',
  stopp: '<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2.5"/></svg>',
  tasten: '<svg viewBox="0 0 24 24"><path fill-rule="evenodd" d="M4 5h16a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Zm1 4v2h2V9H5Zm4 0v2h2V9H9Zm4 0v2h2V9h-2Zm4 0v2h2V9h-2ZM7 14v2h10v-2H7Z"/></svg>',
};

/* Wellenform: jede Nachricht hat ihre eigene, aus ihrem Text gerechnet */
function welle(el, text, n = 60) {
  let h = 7;
  const teile = [];
  for (let i = 0; i < n; i++) {
    const c = text.charCodeAt(i % text.length) || 60;
    h = (h * 31 + c) % 997;
    teile.push(`<b style="--h:${(0.16 + ((h % 76) / 100) * (0.6 + 0.4 * Math.sin((i / n) * Math.PI))).toFixed(2)}"></b>`);
  }
  el.innerHTML = teile.join("");
}
const stand = (el, anteil) => {
  const sichtbar = [...el.children].filter((b) => b.offsetWidth > 0);
  [...el.children].forEach((b) => b.classList.remove("an"));
  sichtbar.forEach((b, i, a) => b.classList.toggle("an", i / a.length < anteil));
};
const zeitText = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const WORT_MS = 380;
const dauer = (t) => Math.max(2, Math.ceil((t.trim().split(/\s+/).length * WORT_MS) / 1000));
const wortHtml = (w) => { const m = w.replace(/[<&]/g, "").match(/^(.*?)([.,:;!?]*)$/); return `<span><u>${m[1]}</u>${m[2]}</span>`; };
const woerter = (t) => t.trim().split(/\s+/).map(wortHtml).join(" ");

/* Was die Auswertung braucht, wird im Moment des Erkennens markiert: Kunde, Mengen, Preise */
function treffer(liste) {
  const roh = liste.map((w) => w.replace(/[.,:;!?]+$/, ""));
  const an = new Set();
  roh.forEach((w, i) => {
    if (/^(Frau|Herrn?|Firma|Familie)$/i.test(w) && roh[i + 1]) { an.add(i); an.add(i + 1); }
    if (/^\d/.test(w)) { an.add(i); if (roh[i + 1] && !/^(zu|und|für|dazu)$/i.test(roh[i + 1])) an.add(i + 1); }
    if (/^pauschal$/i.test(w)) an.add(i);
    if (/^ein$/i.test(w) && /^Tag$/i.test(roh[i + 1] || "")) { an.add(i); an.add(i + 1); }
  });
  return an;
}

const einheit = (p) => (p.einheit === "Person" && p.menge !== 1 ? "Personen" : p.einheit);
const mengeText = (p) => {
  if (!p.preis) return `${p.menge} ${einheit(p)}, Preis fehlt noch`;
  return p.einheit === "pauschal" && p.menge === 1 ? "pauschal" : `${p.menge} ${einheit(p)} × ${euro(p.preis)}`;
};

function dokInhalt(d, { marke = "Beispiel", leer = false } = {}) {
  const z = leer ? { netto: 0, ust: 0, brutto: 0 } : d;
  return `<header class="dok-kopf"><div><span class="art">Angebot für</span><strong class="kunde" style="${leer ? "opacity:0" : ""}">${d.kunde || "Kunde noch offen"}</strong></div>${marke ? `<span class="bsp">${marke}</span>` : ""}</header>
  <table><tbody>${d.positionen.map((p) => `<tr class="${leer ? "weg" : ""}"><td>${p.titel}<small>${mengeText(p)}</small></td><td>${euro(p.summe)}</td></tr>`).join("")}</tbody></table>
  <dl class="summen"><div><dt>Netto</dt><dd data-z="netto">${euro(z.netto)}</dd></div><div><dt>USt ${d.mwst} %</dt><dd data-z="ust">${euro(z.ust)}</dd></div><div class="gesamt"><dt>Gesamt</dt><dd data-z="brutto">${euro(z.brutto)}</dd></div></dl>`;
}

function zaehle(el, von, nach, ms = 420) {
  el._lauf = (el._lauf || 0) + 1;
  const meiner = el._lauf;
  if (ruhig || von === nach) { el.textContent = euro(nach); return; }
  const t0 = performance.now();
  (function schritt(t) {
    if (meiner !== el._lauf) return;
    const a = Math.min(1, (t - t0) / ms);
    const e = 1 - Math.pow(1 - a, 3);
    el.textContent = a < 1 ? euro(Math.round((von + (nach - von) * e) * 100) / 100) : euro(nach);
    if (a < 1) requestAnimationFrame(schritt);
  })(t0);
}

/* Die Summen laufen exakt mit: gerechnet mit rechne() über die Zeilen, die schon stehen */
function laufeMit(wurzel, d, k, vorher) {
  const t = rechne({ ...d, positionen: d.positionen.slice(0, k) });
  for (const f of ["netto", "ust", "brutto"]) zaehle($(`[data-z="${f}"]`, wurzel), vorher[f], t[f]);
  return t;
}

/* Die Antwort geht auf: das Blatt wächst mit jeder Zeile */
function waechst(aendern, el) {
  const von = el.offsetHeight;
  el.classList.remove("waechst"); el.style.height = "";
  aendern();
  const nach = el.offsetHeight;
  if (ruhig || von === nach) return;
  el.style.height = `${von}px`;
  void el.offsetHeight;
  el.classList.add("waechst");
  el.style.height = `${nach}px`;
  clearTimeout(el._w);
  el._w = setTimeout(() => { el.classList.remove("waechst"); el.style.height = ""; }, 320);
}

/* ---------- Erster Bildschirm: fünf Sprachnachrichten, eine Antwort ---------- */
const streifen = $("#streifen"), reiter = $("#reiter"), dok = $("#dok"), ansage = $("#ansage");
const eigene = $("#eigene");
streifen.innerHTML = BEISPIELE.map((b, i) => `
  <article class="stimme" data-i="${i}">
    <div class="kopfzeile"><button type="button" class="spiel" aria-label="Beispiel ${b.wer} abspielen"></button><div class="welle" aria-hidden="true"></div><span class="zeit">${zeitText(dauer(b.satz))}</span></div>
    <p class="mitschrift">${woerter(b.satz)}</p>
    <p class="stumm">${b.wer}. Läuft stumm, Sie lesen mit.</p>
  </article>`).join("");
reiter.innerHTML = BEISPIELE.map((b, i) => `<button type="button" aria-pressed="${i === 0}" data-i="${i}">${b.wer}</button>`).join("");
const blasen = [...streifen.children];
blasen[0].classList.add("aktiv");
blasen.forEach((b, i) => {
  welle($(".welle", b), BEISPIELE[i].satz);
  const sp = $$(".mitschrift span", b), an = treffer(sp.map((s) => s.textContent));
  sp.forEach((s, j) => { s.dataset.t = an.has(j) ? "1" : ""; });
});

let lauf = 0, aktiv = 0, automatik = !ruhig, automatikTimer = 0;

function zeigeReiter(i) {
  [...reiter.children].forEach((k, j) => {
    const ist = j === i;
    k.setAttribute("aria-pressed", String(ist));
    if (ist && reiter.scrollWidth > reiter.clientWidth) reiter.scrollTo({ left: k.offsetLeft - 40, behavior: ruhig ? "auto" : "smooth" });
  });
}
function fertigZeigen(blase, b) {
  $$(".mitschrift span", blase).forEach((s) => { s.classList.remove("weg"); s.classList.toggle("treffer", s.dataset.t === "1"); });
  stand($(".welle", blase), 1);
  $(".zeit", blase).textContent = zeitText(dauer(b.satz));
  $(".spiel", blase).classList.remove("spielt");
}

async function spiele(i) {
  const meiner = ++lauf;
  clearTimeout(automatikTimer);
  aktiv = i;
  zeigeReiter(i);
  blasen.forEach((b, j) => { b.classList.toggle("aktiv", j === i); if (j !== i) fertigZeigen(b, BEISPIELE[j]); });
  const b = BEISPIELE[i], blase = blasen[i];
  const sp = $$(".mitschrift span", blase), zeit = $(".zeit", blase), wel = $(".welle", blase);
  ansage.textContent = `${b.wer}: Angebot für ${b.kunde}, gesamt ${euro(b.brutto)}.`;

  if (ruhig) { fertigZeigen(blase, b); dok.innerHTML = dokInhalt(b); return; }

  dok.classList.remove("waechst"); dok.style.height = "";
  dok.innerHTML = dokInhalt(b, { leer: true });
  sp.forEach((s) => { s.classList.add("weg"); s.classList.remove("treffer"); });
  stand(wel, 0);
  $(".spiel", blase).classList.add("spielt");

  const zeilen = $$("tr", dok), kunde = $(".kunde", dok);
  let zeile = 0, bisher = { netto: 0, ust: 0, brutto: 0 };
  for (let w = 0; w < sp.length; w++) {
    if (meiner !== lauf) return;
    sp[w].classList.remove("weg");
    if (sp[w].dataset.t === "1") sp[w].classList.add("treffer");
    stand(wel, (w + 1) / sp.length);
    zeit.textContent = zeitText(((w + 1) * WORT_MS) / 1000);
    const t = sp[w].textContent;
    if (t.endsWith(":")) kunde.style.opacity = 1;
    if (t.endsWith(".") && zeilen[zeile]) {
      const z = zeilen[zeile++];
      waechst(() => { z.classList.remove("weg"); z.classList.add("neu-da"); }, dok);
      bisher = laufeMit(dok, b, zeile, bisher);
    }
    await warte(WORT_MS);
  }
  if (meiner !== lauf) return;
  $(".spiel", blase).classList.remove("spielt");
  zeit.textContent = zeitText(dauer(b.satz));
  if (automatik && i < BEISPIELE.length - 1) automatikTimer = setTimeout(() => {
    if (automatik && meiner === lauf) geheZu(i + 1);
  }, 5000);
}

let zielIndex = null;
const linksVon = (b) => b.offsetLeft - streifen.offsetLeft - parseFloat(getComputedStyle(streifen).paddingLeft);
function geheZu(i) {
  zielIndex = i;
  streifen.scrollTo({ left: linksVon(blasen[i]), behavior: ruhig ? "auto" : "smooth" });
  spiele(i);
}
function automatikAus() { automatik = false; clearTimeout(automatikTimer); }

reiter.addEventListener("click", (e) => {
  const k = e.target.closest("button"); if (!k) return;
  automatikAus(); zurueckZuBeispielen(); geheZu(+k.dataset.i);
});
streifen.addEventListener("click", (e) => {
  const k = e.target.closest(".spiel"); if (!k) return;
  automatikAus();
  const i = +k.closest(".stimme").dataset.i;
  if (i === aktiv && k.classList.contains("spielt")) { lauf++; fertigZeigen(blasen[i], BEISPIELE[i]); dok.innerHTML = dokInhalt(BEISPIELE[i]); return; }
  geheZu(i);
});
let wischTimer = 0;
streifen.addEventListener("scroll", () => {
  clearTimeout(wischTimer);
  wischTimer = setTimeout(() => {
    const l = streifen.scrollLeft;
    let beste = 0, abstand = 1e9;
    blasen.forEach((b, i) => { const d = Math.abs(linksVon(b) - l); if (d < abstand) { abstand = d; beste = i; } });
    if (zielIndex !== null) { if (beste === zielIndex) zielIndex = null; return; }
    if (beste !== aktiv) spiele(beste);
  }, 130);
}, { passive: true });
["touchstart", "wheel", "keydown"].forEach((ev) => addEventListener(ev, () => { automatikAus(); zielIndex = null; }, { passive: true, once: true }));
addEventListener("scroll", () => { if (scrollY > 200) automatikAus(); }, { passive: true });

/* ---------- Selbst sprechen ---------- */
const mic = $("#mic"), micBild = $("#mic-bild"), micText = $("#mic-text");
const eigeneText = $("#eigene-text"), eigeneZeit = $("#eigene-zeit"), eigeneWelle = $("#eigene-welle"), eigeneHinweis = $("#eigene-hinweis");
const tippen = $("#tippen"), tippenFeld = $("#tippen-feld"), zurueck = $("#zurueck");
welle(eigeneWelle, "Ihre Sprachnachricht wartet auf Worte");
$("#eigene-bild").innerHTML = BILD.mic;

let moeglich = spracheMoeglich();
let aufnahme = null, aufnahmeSek = 0, uhr = 0, wellenUhr = 0, stille = 0, nichtsGehoert = 0, gesagt = "";

function micRuhe() {
  mic.classList.remove("an");
  micBild.innerHTML = moeglich ? BILD.mic : BILD.tasten;
  micText.textContent = moeglich ? "Selbst sprechen" : "Selbst tippen";
  mic.setAttribute("aria-label", moeglich ? "Selbst sprechen" : "Selbst tippen");
}
micRuhe();

const BEISPIELSATZ = BEISPIELE[0].satz;
function dokWartet(titel) {
  dok.classList.remove("waechst"); dok.style.height = "";
  dok.innerHTML = `<header class="dok-kopf"><div><span class="art">Ihr Angebot</span><strong class="kunde">entsteht gleich</strong></div></header>
  <div class="dok-leer"><b>${titel}</b><span>Zum Beispiel: „${BEISPIELSATZ}“</span></div>`;
}
function eigeneZeigen() {
  automatikAus(); lauf++;
  streifen.hidden = true; reiter.hidden = true; eigene.hidden = false;
  eigene.classList.remove("tippt");
  [...reiter.children].forEach((k) => k.setAttribute("aria-pressed", "false"));
  scrollTo({ top: 0, behavior: ruhig ? "auto" : "smooth" });
}
function zurueckZuBeispielen() {
  if (aufnahme) aufnahmeEnde(false);
  if (eigene.hidden) return;
  eigene.hidden = true; streifen.hidden = false; reiter.hidden = false;
  tippen.hidden = true;
  micRuhe();
}
function aufnahmeAufraeumen() {
  clearInterval(uhr); clearInterval(wellenUhr); clearTimeout(stille); clearTimeout(nichtsGehoert);
  aufnahme = null;
}
function tippenZeigen(hinweis) {
  aufnahmeAufraeumen();
  eigeneZeigen();
  tippen.hidden = false;
  eigene.classList.add("tippt");
  eigeneText.textContent = "";
  eigeneHinweis.textContent = hinweis;
  dokWartet("Schreiben Sie, für wen, was, wie viel und zu welchem Preis.");
  micRuhe();
  tippenFeld.focus({ preventScroll: true });
}
function wellenTanz() {
  const balken = [...eigeneWelle.children];
  clearInterval(wellenUhr);
  wellenUhr = setInterval(() => balken.forEach((b) => {
    b.classList.add("an");
    b.style.setProperty("--h", (0.1 + Math.random() * (gesagt ? 0.8 : 0.16)).toFixed(2));
  }), 140);
}
/* Mitschrift mit markierten Treffern, sicher aus Textknoten gebaut */
function zeigeMitschrift(text) {
  const liste = text.trim().split(/\s+/), an = treffer(liste);
  eigeneText.textContent = "";
  liste.forEach((w, i) => {
    const m = w.match(/^(.*?)([.,:;!?]*)$/);
    const s = document.createElement("span"), u = document.createElement("u");
    u.textContent = m[1];
    s.append(u, m[2]);
    if (an.has(i)) s.className = "treffer";
    eigeneText.append(s, i < liste.length - 1 ? " " : "");
  });
}
function aufnahmeStart() {
  gesagt = "";
  eigeneZeigen();
  tippen.hidden = true;
  eigeneText.textContent = "Ich höre zu.";
  eigeneHinweis.textContent = "Die Spracherkennung läuft über Ihren Browser. Zum Beenden aufs Mikrofon tippen oder kurz still sein.";
  dokWartet("Sagen Sie, für wen, was, wie viel und zu welchem Preis.");
  mic.classList.add("an");
  micBild.innerHTML = BILD.stopp;
  micText.textContent = "Ich höre zu";
  mic.setAttribute("aria-label", "Aufnahme beenden");
  aufnahmeSek = 0; eigeneZeit.textContent = "0:00";
  uhr = setInterval(() => { eigeneZeit.textContent = zeitText(++aufnahmeSek); }, 1000);
  wellenTanz();
  nichtsGehoert = setTimeout(() => {
    if (gesagt || !aufnahme) return;
    const s = aufnahme;
    aufnahmeAufraeumen();
    try { s(); } catch {}
    moeglich = false;
    tippenZeigen("Das Mikrofon hat hier nichts gehört. Tippen Sie den Satz einfach, das geht genauso.");
  }, 20000);
  try {
    aufnahme = sprechen({
      beiText(fest, zw) {
        gesagt = [fest, zw].filter(Boolean).join(" ").trim();
        if (gesagt) { zeigeMitschrift(gesagt); clearTimeout(nichtsGehoert); clearTimeout(stille); stille = setTimeout(() => aufnahmeEnde(true), 3800); }
      },
      beiEnde() { if (aufnahme) aufnahmeEnde(true); },
      beiFehler() {
        moeglich = false;
        tippenZeigen("Das Mikrofon ist hier nicht frei. Tippen Sie den Satz einfach, das geht genauso.");
      },
    });
  } catch {
    moeglich = false;
    tippenZeigen("Das Mikrofon ist hier nicht frei. Tippen Sie den Satz einfach, das geht genauso.");
  }
}
function aufnahmeEnde(auswerte) {
  const s = aufnahme;
  aufnahmeAufraeumen();
  try { s && s(); } catch {}
  micRuhe();
  [...eigeneWelle.children].forEach((b) => b.classList.add("an"));
  if (auswerte) ausText(gesagt);
}
function ausText(text) {
  const t = (text || "").trim();
  eigeneHinweis.textContent = moeglich ? "Die Spracherkennung läuft über Ihren Browser." : "Getippt statt gesprochen. In der App geht beides.";
  if (t && !eigene.classList.contains("tippt")) zeigeMitschrift(t);
  const e = t ? auswerten(t, "sonstige") : { positionen: [] };
  if (!e.positionen.length) {
    dokWartet(t ? "Darin habe ich noch keine Position gefunden. Nennen Sie Menge und Preis." : "Ich habe nichts gehört. Versuchen Sie es noch einmal.");
    ansage.textContent = "Noch keine Position erkannt.";
    return;
  }
  dok.classList.remove("waechst"); dok.style.height = "";
  dok.innerHTML = dokInhalt(e, { marke: "Vorschau", leer: true }) + `<p class="vorschau">Vorschau ohne KI. In der App wertet die KI aus, und Sie prüfen jede Zeile.</p>`;
  ansage.textContent = `Angebot erstellt, gesamt ${euro(e.brutto)}.`;
  (async () => {
    await warte(160);
    $(".kunde", dok).style.opacity = 1;
    let k = 0, bisher = { netto: 0, ust: 0, brutto: 0 };
    for (const z of $$("tr", dok)) {
      waechst(() => { z.classList.remove("weg"); z.classList.add("neu-da"); }, dok);
      bisher = laufeMit(dok, e, ++k, bisher);
      await warte(320);
    }
  })();
}
function micTipp() {
  if (aufnahme) { aufnahmeEnde(true); return; }
  if (!moeglich) { tippenZeigen("Tippen Sie den Satz einfach, das geht genauso."); return; }
  aufnahmeStart();
}
mic.addEventListener("click", micTipp);
$$("[data-sprechen]").forEach((k) => k.addEventListener("click", micTipp));
zurueck.addEventListener("click", () => { zurueckZuBeispielen(); geheZu(aktiv); });
tippen.addEventListener("submit", (e) => { e.preventDefault(); tippenFeld.blur(); ausText(tippenFeld.value); });

/* Beim Lesen macht die Leiste Platz, beim Hochwischen kommt sie zurück */
const leiste = $("#dock");
tippenFeld.addEventListener("focus", () => { if (innerWidth < 768) leiste.style.display = "none"; });
tippenFeld.addEventListener("blur", () => { leiste.style.display = ""; });
let letztesY = scrollY;
addEventListener("scroll", () => {
  const y = scrollY, d = y - letztesY;
  if (Math.abs(d) < 5) return;
  letztesY = y;
  leiste.classList.toggle("weg", d > 0 && y > 260 && !aufnahme && !leiste.contains(document.activeElement));
}, { passive: true });

/* ---------- Änderung per Sprache: gerechnet mit rechne() ---------- */
const basis = BEISPIELE[0];
const geaendert = rechne({ ...basis, positionen: [{ ...basis.positionen[0], menge: 40 }, basis.positionen[1]] });
const A = {
  welle: $("#aendern-welle"), zeit: $("#aendern-zeit"), text: $("#aendern-text"), spiel: $("#aendern-spiel"),
  zeile: $("#aendern-zeile"), menge: $("#aendern-menge"), pos: $("#aendern-pos"), netto: $("#aendern-netto"), ust: $("#aendern-ust"), brutto: $("#aendern-brutto"), vorher: $("#aendern-vorher"),
};
const AENDERUNG = A.text.textContent;
welle(A.welle, AENDERUNG);
A.vorher.textContent = `Vor der Änderung: ${euro(basis.brutto)}`;
const stelleEin = (d, m) => {
  A.menge.textContent = m;
  A.pos.textContent = euro(d.positionen[0].summe);
  A.netto.textContent = euro(d.netto); A.ust.textContent = euro(d.ust); A.brutto.textContent = euro(d.brutto);
};
stelleEin(geaendert, geaendert.positionen[0].menge);
A.zeile.classList.add("neu");
stand(A.welle, 1);
A.text.innerHTML = woerter(AENDERUNG);
const aenderTreffer = treffer(AENDERUNG.split(/\s+/));
$$("span", A.text).forEach((s, i) => s.classList.toggle("treffer", aenderTreffer.has(i)));
let aenderLauf = 0;
async function aendern() {
  const meiner = ++aenderLauf;
  if (ruhig) return;
  stelleEin(basis, basis.positionen[0].menge);
  A.zeile.classList.remove("neu");
  A.vorher.style.opacity = 0;
  A.spiel.classList.add("spielt");
  const sp = $$("span", A.text);
  sp.forEach((s) => { s.classList.add("weg"); s.classList.remove("treffer"); });
  stand(A.welle, 0);
  await warte(350);
  for (let w = 0; w < sp.length; w++) {
    if (meiner !== aenderLauf) return;
    sp[w].classList.remove("weg");
    if (aenderTreffer.has(w)) sp[w].classList.add("treffer");
    stand(A.welle, (w + 1) / sp.length);
    A.zeit.textContent = zeitText(((w + 1) * WORT_MS) / 1000);
    await warte(WORT_MS);
  }
  if (meiner !== aenderLauf) return;
  A.spiel.classList.remove("spielt");
  A.zeit.textContent = zeitText(dauer(AENDERUNG));
  A.zeile.classList.add("neu");
  A.menge.textContent = geaendert.positionen[0].menge;
  A.menge.classList.remove("dreh"); void A.menge.offsetWidth; A.menge.classList.add("dreh");
  zaehle(A.pos, basis.positionen[0].summe, geaendert.positionen[0].summe);
  zaehle(A.netto, basis.netto, geaendert.netto);
  zaehle(A.ust, basis.ust, geaendert.ust);
  zaehle(A.brutto, basis.brutto, geaendert.brutto, 560);
  A.vorher.style.opacity = 1;
}
A.spiel.addEventListener("click", aendern);

/* ---------- Brief, Rechnung: dieselben gerechneten Zahlen ---------- */
$("#brief-pos").textContent = euro(geaendert.positionen[0].summe);
$("#brief-brutto").textContent = euro(geaendert.brutto);
$("#rechnung-pos").textContent = euro(geaendert.positionen[0].summe);
$("#rechnung-brutto").textContent = euro(geaendert.brutto);
const rechnung = $("#rechnung"), rechnungArt = $("#rechnung-art"), rechnungKnopf = $("#rechnung-knopf");
let istRechnung = true;
function rechnungZeigen(ist) {
  istRechnung = ist;
  rechnungArt.textContent = ist ? "Rechnung an" : "Angebot für";
  rechnungKnopf.textContent = ist ? "Noch einmal zeigen" : "Rechnung erstellen";
  rechnungKnopf.classList.toggle("leise", ist);
  if (ist) { rechnung.classList.remove("blatt"); void rechnung.offsetWidth; rechnung.classList.add("blatt"); }
}
let rechnungUhr = 0;
rechnungKnopf.addEventListener("click", () => {
  clearTimeout(rechnungUhr);
  if (istRechnung) { rechnungZeigen(false); rechnungUhr = setTimeout(() => rechnungZeigen(true), 1100); }
  else rechnungZeigen(true);
});

/* ---------- Fragen: eine Antwort zur Zeit ---------- */
const fragen = $$("#fragenliste .frage");
const breit = matchMedia("(min-width:1024px)");
fragen.forEach((f) => f.addEventListener("click", () => {
  const offen = f.getAttribute("aria-expanded") === "true";
  fragen.forEach((x) => x.setAttribute("aria-expanded", "false"));
  f.setAttribute("aria-expanded", String(breit.matches || !offen));
}));

/* ---------- Jede Frage im Verlauf trägt eine kleine Wellenform: sie ist Ihre Nachricht ---------- */
$$("main section h2").forEach((h, n) => {
  const mw = document.createElement("div");
  mw.className = "miniwelle kommt"; mw.setAttribute("aria-hidden", "true");
  let x = 17 + n * 13;
  mw.innerHTML = Array.from({ length: 11 }, (_, i) => { x = (x * 31 + 11) % 97; return `<b style="--h:${(0.25 + (x % 70) / 100).toFixed(2)};--d:${i * 28}ms"></b>`; }).join("");
  const wrap = document.createElement("div");
  h.before(wrap); wrap.append(mw, h);
  if (h.classList.contains("fragen-titel")) { wrap.className = "fragen-titel"; h.classList.remove("fragen-titel"); }
});

/* ---------- Ankommen: Teile in Lesereihenfolge ---------- */
const kommen = new IntersectionObserver((es) => {
  es.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add("da");
    kommen.unobserve(e.target);
  });
}, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
$$("main section").forEach((v) => $$(".kommt", v).forEach((k, i) => { k.style.setProperty("--v", `${Math.min(i, 3) * 70}ms`); kommen.observe(k); }));
const inSicht = new IntersectionObserver((es) => {
  es.forEach((e) => {
    if (!e.isIntersecting) return;
    inSicht.unobserve(e.target);
    if (e.target === $("#aendern-dok")) aendern();
    if (e.target === rechnung && !ruhig) { rechnungZeigen(false); clearTimeout(rechnungUhr); rechnungUhr = setTimeout(() => rechnungZeigen(true), 1400); }
  });
}, { rootMargin: "0px 0px -6% 0px", threshold: 0.45 });
inSicht.observe($("#aendern-dok")); inSicht.observe(rechnung);
if (ruhig) $$(".kommt").forEach((k) => k.classList.add("da"));

/* Erster Eindruck: das Beispiel läuft von allein an */
if (ruhig) { blasen.forEach((b, i) => fertigZeigen(b, BEISPIELE[i])); dok.innerHTML = dokInhalt(BEISPIELE[0]); }
else setTimeout(() => { if (!eigene.hidden) return; if (scrollY < 200) spiele(0); else { fertigZeigen(blasen[0], BEISPIELE[0]); dok.innerHTML = dokInhalt(BEISPIELE[0]); } }, 700);
