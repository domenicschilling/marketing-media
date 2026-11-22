// Das Blatt: füllt sich aus den Beispielen oder aus echter Sprache. Alle Zahlen kommen aus motor.js.
import { BEISPIELE, auswerten, euro, spracheMoeglich, sprechen } from "./_motor/motor.js";

window.__blatt = true;
const $ = (id) => document.getElementById(id);
const html = document.documentElement;
const start = $("start");
const ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
const warte = (ms) => new Promise((r) => setTimeout(r, ruhig ? 0 : ms));

const felder = { kunde: $("f-kunde"), betreff: $("f-betreff"), zeilen: $("f-zeilen"), netto: $("f-netto"), ust: $("f-ust"), brutto: $("f-brutto"), satz: $("f-satz") };
const gesagt = $("gesagt"), statusText = $("status"), hinweis = $("hinweis"), tippen = $("tippen"), tippfeld = $("tippfeld");
const mikro = $("mikro"), mikroText = $("mikro-text"), weiter = $("weiter"), weiterWer = $("weiter-wer"), beispielWer = $("beispiel-wer");

// Datum auf beiden Blättern
const heute = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
$("f-datum").textContent = heute;
$("f-datum-2").textContent = heute;

// --- Summen zählen sichtbar auf ---
const stand = { netto: 0, ust: 0, brutto: 0 };
let zaehlLauf = 0;
function summenAuf(netto, ust, brutto, ms = 520) {
  const lauf = ++zaehlLauf;
  const von = { ...stand };
  const ziel = { netto, ust, brutto };
  if (ruhig || ms === 0) {
    Object.assign(stand, ziel);
    for (const k in ziel) felder[k].textContent = euro(ziel[k]);
    return;
  }
  const t0 = performance.now();
  const schritt = (t) => {
    if (lauf !== zaehlLauf) return;
    const p = Math.min(1, (t - t0) / ms);
    const e = 1 - Math.pow(1 - p, 3);
    for (const k in ziel) {
      const wert = p === 1 ? ziel[k] : von[k] + (ziel[k] - von[k]) * e;
      stand[k] = wert;
      felder[k].textContent = euro(wert);
    }
    if (p < 1) requestAnimationFrame(schritt);
  };
  requestAnimationFrame(schritt);
}

// --- Zeilen ---
const einheitText = (p) => (p.einheit === "Person" && p.menge !== 1 ? "Personen" : p.einheit);
const mengeText = (p) => `${p.menge.toLocaleString("de-DE")} ${einheitText(p)}`.trim();
function zeileBauen(p, neu) {
  const tr = document.createElement("tr");
  if (neu) tr.className = "zeile-neu";
  const zelle = (klasse) => { const td = document.createElement("td"); if (klasse) td.className = klasse; tr.append(td); return td; };
  const a = zelle();
  const titel = document.createElement("span"); titel.className = "titel";
  const klein = document.createElement("span"); klein.className = "klein-zeile";
  a.append(titel, klein);
  const m = zelle("zahl breit"), e = zelle("zahl breit"), s = zelle("zahl");
  const fuellen = () => {
    if (!p) return;
    klein.textContent = `${mengeText(p)} × ${euro(p.preis)}`;
    m.textContent = mengeText(p);
    e.textContent = euro(p.preis);
    s.textContent = euro(p.summe);
    for (const el of [klein, m, e, s]) { el.classList.remove("frisch"); void el.offsetWidth; el.classList.add("frisch"); }
  };
  return { tr, titel, fuellen };
}
function zeilenLeer(anzahl = 2) {
  felder.zeilen.replaceChildren();
  for (let i = 0; i < anzahl; i++) felder.zeilen.append(zeileBauen(null).tr);
}
function blattLeer() {
  felder.kunde.textContent = "";
  felder.betreff.textContent = "";
  zeilenLeer();
  felder.satz.textContent = "19";
  summenAuf(0, 0, 0, 0);
}

// Schreibt Text Zeichen für Zeichen, in Blau, wie von Hand ausgefüllt
async function schreiben(el, text, lauf, tempo = 26) {
  if (ruhig) { el.textContent = text; return; }
  el.textContent = "";
  for (let i = 1; i <= text.length; i++) {
    if (lauf !== aktuell) return;
    el.textContent = text.slice(0, i);
    await warte(tempo);
  }
}

// --- Vorführung ---
let aktuell = 0;      // Lauf-Nummer, jede neue Aktion bricht die alte ab
let beispielNr = 0;

function naechsterName() {
  const n = BEISPIELE[(beispielNr + 1) % BEISPIELE.length];
  weiterWer.textContent = n.wer;
}

function teilen(satz) {
  // „Für Frau Berger: Wohnzimmer streichen, 35 … Euro. Dazu Abkleben …“ → Anrede, dann je Position ein Satz
  const d = satz.indexOf(":");
  const kopf = satz.slice(0, d + 1);
  const rest = satz.slice(d + 1).trim().split(/(?<=\.)\s+/);
  return { kopf, saetze: rest };
}

// Wort für Wort aufs Feld. Zurück kommt die Liste der Wörter, damit erkannte Teile markiert werden können.
async function worteSagen(text, lauf, ablage = []) {
  const worte = text.split(/\s+/).filter(Boolean);
  for (const w of worte) {
    if (lauf !== aktuell) return ablage;
    const s = document.createElement("span");
    s.className = "w";
    s.textContent = w;
    if (gesagt.childNodes.length) {
      const lz = document.createElement("span");
      lz.className = "lz";
      lz.textContent = " ";
      gesagt.append(lz);
    }
    gesagt.append(s);
    ablage.push(s);
    await warte(165);
  }
  return ablage;
}
// Markiert, was aufs Blatt übernommen wird: Name, Leistung, Menge samt Einheit, Preis
const sauber = (w) => w.toLowerCase().replace(/[.,:]/g, "");
function erkannteMarkieren(spans, begriffe) {
  const satz = new Set(begriffe.join(" ").split(/\s+/).map(sauber));
  spans.forEach((s, i) => {
    const w = sauber(s.textContent);
    const vorher = i > 0 ? sauber(spans[i - 1].textContent) : "";
    const zahl = /^\d/.test(w), nachZahl = /^\d/.test(vorher) && w !== "zu";
    if (satz.has(w) || zahl || nachZahl || w === "pauschal") s.classList.add("erkannt");
  });
  // Zwischenräume zwischen zwei erkannten Wörtern mitmarkieren, damit die Markierung nicht zerfällt
  gesagt.querySelectorAll(".lz").forEach((lz) => {
    lz.classList.toggle("erkannt", !!lz.previousElementSibling?.classList.contains("erkannt") && !!lz.nextElementSibling?.classList.contains("erkannt"));
  });
}

async function vorfuehren(b) {
  const lauf = ++aktuell;
  aufhoeren();
  zuruecksetzen();
  blattLeer();
  felder.satz.textContent = String(b.mwst);
  beispielWer.textContent = `Beispiel: ${b.wer}`;
  statusText.textContent = `Beispiel ${b.wer}, gesprochen:`;
  start.classList.add("spricht");
  start.classList.remove("ruft");
  gesagt.textContent = "";
  gesagt.setAttribute("aria-live", "off");

  if (ruhig) {
    gesagt.textContent = b.satz;
    felder.kunde.textContent = b.kunde;
    felder.betreff.textContent = b.positionen[0].titel;
    felder.zeilen.replaceChildren();
    for (const p of b.positionen) { const z = zeileBauen(p); z.titel.textContent = p.titel; z.fuellen(); felder.zeilen.append(z.tr); }
    summenAuf(b.netto, b.ust, b.brutto, 0);
    start.classList.remove("spricht");
    naechsterName();
    return;
  }

  const { kopf, saetze } = teilen(b.satz);
  await warte(250);
  const kopfWorte = await worteSagen(kopf, lauf);
  if (lauf !== aktuell) return;
  erkannteMarkieren(kopfWorte, [b.kunde]);
  schreiben(felder.kunde, b.kunde, lauf);
  await warte(280);

  felder.zeilen.replaceChildren();
  const reihen = b.positionen.map((p) => zeileBauen(p, false));
  for (const r of reihen) felder.zeilen.append(r.tr);

  let netto = 0;
  for (let i = 0; i < b.positionen.length; i++) {
    if (lauf !== aktuell) return;
    const p = b.positionen[i];
    // Die Zeile beginnt, sobald die ersten Wörter gesprochen sind
    const satzWorte = [];
    const sprechenFertig = worteSagen(saetze[i] || "", lauf, satzWorte);
    await warte(420);
    if (lauf !== aktuell) return;
    if (i === 0) schreiben(felder.betreff, p.titel, lauf, 30);
    await schreiben(reihen[i].titel, p.titel, lauf);
    await sprechenFertig;
    if (lauf !== aktuell) return;
    erkannteMarkieren(satzWorte, [p.titel]);
    reihen[i].fuellen();
    netto = Math.round((netto + p.summe) * 100) / 100;
    const ust = Math.round(netto * (b.mwst / 100) * 100) / 100;
    summenAuf(netto, ust, Math.round((netto + ust) * 100) / 100);
    await warte(420);
  }
  if (lauf !== aktuell) return;
  summenAuf(b.netto, b.ust, b.brutto);
  await warte(300);
  if (lauf !== aktuell) return;
  start.classList.remove("spricht");
  mikroText.textContent = spracheMoeglich() ? "Jetzt selbst sprechen" : "Jetzt selbst tippen";
  start.classList.add("ruft");
  naechsterName();
}

// --- Freie Eingabe: Sprache oder Tippen ---
function aufBlatt(text, ende = false) {
  const e = auswerten(text);
  felder.kunde.textContent = e.kunde;
  const erste = e.positionen[0];
  felder.betreff.textContent = erste && erste.titel !== "Leistung" ? erste.titel : erste ? "Ihr Angebot" : "";
  felder.zeilen.replaceChildren();
  const zeigen = e.positionen.slice(0, 5);
  for (const p of zeigen) { const z = zeileBauen(p); z.titel.textContent = p.titel; z.fuellen(); felder.zeilen.append(z.tr); }
  for (let i = zeigen.length; i < 2; i++) felder.zeilen.append(zeileBauen(null).tr);
  felder.satz.textContent = String(e.mwst);
  summenAuf(e.netto, e.ust, e.brutto, 260);
  if (ende && !e.positionen.length && text.trim()) {
    statusText.textContent = "Noch keine Zeile erkannt. Nennen Sie Leistung, Menge und Preis:";
    gesagt.textContent = "Für Frau Berger: Wohnzimmer streichen, 35 Quadratmeter zu 14 Euro.";
  }
  return e;
}

let stopp = null, stille = null, gehoert = "";
function aufhoeren() {
  clearTimeout(stille);
  if (stopp) { const s = stopp; stopp = null; try { s(); } catch { /* schon beendet */ } }
  start.classList.remove("hoert", "spricht");
  mikro.setAttribute("aria-pressed", "false");
}
function zuruecksetzen() {
  hinweis.hidden = true;
  start.classList.remove("frei");
  html.classList.remove("frei-aktiv");
  tippen.hidden = true;
  gesagt.hidden = false;
  mikroText.textContent = spracheMoeglich() && !html.classList.contains("tippt") ? "Selbst sprechen" : "Selbst tippen";
}
function hinweisZeigen(sprache) {
  hinweis.hidden = false;
  start.classList.add("frei");
  html.classList.add("frei-aktiv");
  hinweis.textContent = "Vorschau ohne KI. In der App wertet die KI aus, und Sie prüfen jede Zeile." + (sprache ? " Die Spracherkennung läuft hier über Ihren Browser." : "");
}

function sprechenStarten() {
  aktuell++;
  zuruecksetzen();
  blattLeer();
  beispielWer.textContent = "Ihr Beispiel";
  gehoert = "";
  gesagt.textContent = "";
  gesagt.setAttribute("aria-live", "polite");
  start.classList.remove("ruft");
  start.classList.add("hoert", "spricht");
  mikro.setAttribute("aria-pressed", "true");
  mikroText.textContent = "Fertig";
  statusText.textContent = "Ich höre zu. Sagen Sie, für wen, was, wie viel und zu welchem Preis.";
  hinweisZeigen(true);

  const stilleNeu = (ms) => { clearTimeout(stille); stille = setTimeout(sprechenEnde, ms); };
  stilleNeu(12000);
  try { stopp = sprechen({
    beiText(fest, zw) {
      gehoert = fest;
      const voll = (fest + " " + (zw || "")).trim();
      gesagt.textContent = voll.length > 150 ? "… " + voll.slice(-150) : voll;
      statusText.textContent = "Ich höre zu.";
      aufBlatt(voll);
      gehoert = voll;
      stilleNeu(3200);
    },
    beiFehler() { aufTippenWechseln("Das Mikrofon ist hier nicht frei. Tippen Sie den Satz einfach, das Blatt füllt sich genauso."); },
    beiEnde() { /* Ende läuft über sprechenEnde */ },
  }); } catch { aufTippenWechseln("Das Mikrofon ist hier nicht frei. Tippen Sie den Satz einfach, das Blatt füllt sich genauso."); }
}
function sprechenEnde() {
  if (!start.classList.contains("hoert")) return;
  aufhoeren();
  mikroText.textContent = "Noch einmal";
  if (gehoert.trim()) {
    statusText.textContent = "Das haben Sie gesagt:";
    aufBlatt(gehoert, true);
  } else {
    aufTippenWechseln("Nichts gehört. Tippen Sie den Satz einfach, oder sehen Sie sich ein Beispiel an.");
  }
}

function aufTippenWechseln(meldung) {
  aktuell++;
  aufhoeren();
  html.classList.add("tippt");
  start.classList.add("ohne-sprache");
  start.classList.remove("ruft");
  blattLeer();
  beispielWer.textContent = "Ihr Beispiel";
  statusText.textContent = meldung || "Tippen statt sprechen:";
  gesagt.hidden = true;
  tippen.hidden = false;
  mikroText.textContent = "Selbst tippen";
  hinweisZeigen(false);
  tippfeld.focus({ preventScroll: true });
  if (tippfeld.value.trim()) aufBlatt(tippfeld.value);
}

tippfeld.addEventListener("input", () => aufBlatt(tippfeld.value));
tippen.addEventListener("submit", (e) => e.preventDefault());
tippfeld.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); aufBlatt(tippfeld.value, true); tippfeld.blur(); } });

mikro.addEventListener("click", () => {
  if (start.classList.contains("hoert")) { sprechenEnde(); return; }
  if (!spracheMoeglich() || html.classList.contains("tippt")) { aufTippenWechseln(); return; }
  sprechenStarten();
});
weiter.addEventListener("click", () => {
  html.classList.remove("tippt");
  start.classList.toggle("ohne-sprache", !spracheMoeglich());
  beispielNr = (beispielNr + 1) % BEISPIELE.length;
  vorfuehren(BEISPIELE[beispielNr]);
});

// --- Wellenform: feine Striche, so viele wie in die Breite passen, mit ruhiger Hüllkurve ---
const welle = $("welle");
function welleBauen() {
  const hoch = (a, b, x) => a + (b - a) * x;
  const anzahl = Math.floor(welle.clientWidth / 5);
  if (anzahl === welle.childElementCount) return;
  welle.replaceChildren();
  for (let i = 0; i < anzahl; i++) {
    const b = document.createElement("i");
    const lage = i / Math.max(1, anzahl - 1);
    const huelle = 0.35 + 0.65 * Math.abs(Math.sin(lage * 9.4)) * (0.6 + 0.4 * Math.sin(lage * 3.1));
    b.style.setProperty("--h", hoch(0.18, 1, Math.min(1, huelle)).toFixed(2));
    b.style.setProperty("--t", `${760 + ((i * 137) % 480)}ms`);
    b.style.setProperty("--v", `-${(i * 211) % 900}ms`);
    welle.append(b);
  }
}
welleBauen();
addEventListener("resize", welleBauen);

// --- Start: leer, Blatt erscheint, Beispiel läuft an ---
if (!spracheMoeglich()) { start.classList.add("ohne-sprache"); mikroText.textContent = "Selbst tippen"; }
blattLeer();
gesagt.textContent = "";
naechsterName();
requestAnimationFrame(() => requestAnimationFrame(() => html.classList.add("bereit")));
setTimeout(() => { if (aktuell === 0) vorfuehren(BEISPIELE[0]); }, ruhig ? 0 : 900);

// --- Preise: das Blatt rechnet mit ---
const pNetto = $("p-netto"), pUst = $("p-ust"), pBrutto = $("p-brutto");
let pStand = 39;
function preisZeigen(n) {
  const ust = Math.round(n * 19) / 100;
  pNetto.textContent = euro(n);
  pUst.textContent = euro(ust);
  pBrutto.textContent = euro(Math.round((n + ust) * 100) / 100);
}
function preisZaehlen(ziel) {
  if (ruhig) { pStand = ziel; preisZeigen(ziel); return; }
  const von = pStand, t0 = performance.now();
  const schritt = (t) => {
    const p = Math.min(1, (t - t0) / 380), e = 1 - Math.pow(1 - p, 3);
    preisZeigen(p === 1 ? ziel : Math.round((von + (ziel - von) * e) * 100) / 100);
    if (p < 1) requestAnimationFrame(schritt); else pStand = ziel;
  };
  requestAnimationFrame(schritt);
}
document.querySelectorAll('input[name="tarif"]').forEach((r) => r.addEventListener("change", () => { if (r.checked) preisZaehlen(Number(r.value)); }));

// --- Hereinkommen, je Abschnitt gestaffelt ---
document.querySelectorAll("section:not(.start)").forEach((s) => { s.querySelectorAll(".auf").forEach((el, i) => el.style.setProperty("--i", Math.min(i, 5))); });
const beob = new IntersectionObserver((eintraege) => {
  for (const e of eintraege) if (e.isIntersecting) { e.target.classList.add("da"); beob.unobserve(e.target); }
}, { rootMargin: "0px 0px -6% 0px", threshold: 0.05 });
document.querySelectorAll(".auf").forEach((el) => beob.observe(el));

// --- Hinweise am Rechner alle offen ---
if (matchMedia("(min-width: 900px)").matches) document.querySelectorAll(".hinweise details").forEach((d) => { d.open = true; });

// --- Fester Knopf am Handy: im ersten Blatt und beim Hochscrollen. Beim Lesen nach unten überdeckt er nichts. ---
const fest = $("fest");
if (matchMedia("(max-width: 899px)").matches) {
  fest.hidden = false;
  const andereKnoepfe = new Set();
  const beobF = new IntersectionObserver((eintraege) => {
    for (const e of eintraege) { if (e.isIntersecting) andereKnoepfe.add(e.target); else andereKnoepfe.delete(e.target); }
    festAktual();
  }, { threshold: 0 });
  for (const el of [document.querySelector(".summen-blatt .reihe-summe"), document.querySelector(".zeile-unterschrift"), document.querySelector(".fuss")]) beobF.observe(el);
  let zuletzt = scrollY, hochgescrollt = false;
  function festAktual() {
    const imStart = scrollY < 24;
    fest.classList.toggle("da", (imStart || hochgescrollt) && andereKnoepfe.size === 0);
  }
  addEventListener("scroll", () => {
    const y = scrollY;
    if (y > zuletzt + 2) hochgescrollt = false;
    else if (y < zuletzt - 6) hochgescrollt = true;
    zuletzt = y;
    festAktual();
  }, { passive: true });
  requestAnimationFrame(() => requestAnimationFrame(festAktual));
}

// --- Unterschrift: erst zeichnen, dann weiter zum Test ---
const unterschreiben = $("unterschreiben");
const unterschriftFeld = document.querySelector(".zeile-unterschrift");
unterschreiben.addEventListener("click", (e) => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  unterschriftFeld.classList.add("signiert");
  $("unterschreiben-text").textContent = "Test wird geöffnet …";
  setTimeout(() => { location.href = unterschreiben.href; }, ruhig ? 250 : 1250);
});
addEventListener("pageshow", (e) => {
  if (e.persisted) { unterschriftFeld.classList.remove("signiert"); $("unterschreiben-text").textContent = "14 Tage Test starten"; }
});

// --- Wortmarke im Fuß genau auf die Seitenbreite setzen ---
const marke = document.querySelector(".wortmarke");
function markePassen() {
  const breite = marke.parentElement.clientWidth - parseFloat(getComputedStyle(marke.parentElement).paddingLeft) * 2;
  if (breite <= 0) return;
  marke.style.fontSize = "100px";
  marke.style.fontSize = (100 * breite / marke.getBoundingClientRect().width).toFixed(2) + "px";
}
document.fonts.ready.then(markePassen);
addEventListener("resize", markePassen);
