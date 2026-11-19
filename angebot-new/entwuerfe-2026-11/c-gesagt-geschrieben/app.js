// Gesagt. Geschrieben.: Der Satz steht groß da, erkannte Wörter werden markiert, dann fliegen sie exakt an ihren Platz.
// Es bewegen sich nur transform und opacity. Unter prefers-reduced-motion steht sofort das Endbild.
import { BEISPIELE, auswerten, euro, rechne, spracheMoeglich, sprechen } from "./_motor/motor.js";

window.__bereit = true;
clearTimeout(window.__ausfall);

const ruhig = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (ruhig) document.documentElement.classList.add("ruhig");

const $ = (s, w = document) => w.querySelector(s);
const $$ = (s, w = document) => [...w.querySelectorAll(s)];
const warte = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const FLUG = "cubic-bezier(.65,0,.35,1)";
const AUS = "cubic-bezier(.22,1,.36,1)";

const schrift = Promise.race([document.fonts.load('500 48px "Inter"'), warte(1800)]).then(() => document.fonts.ready).catch(() => {});

const BRANCHE_VON = { maler: "maler", foto: "foto", catering: "catering", it: "it", garten: "galabau" };

/* ---------- Zuordnung: welches gesprochene Wort wird welches Feld im Angebot ---------- */
const ZAHLWORT = { ein: 1, eine: 1, einen: 1, eins: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwölf: 12, zwanzig: 20, dreißig: 30, vierzig: 40, fünfzig: 50, sechzig: 60, siebzig: 70, achtzig: 80, neunzig: 90, hundert: 100 };
const EINHEIT = { quadratmeter: "m²", qm: "m²", "m²": "m²", kubikmeter: "m³", meter: "lfm", laufmeter: "lfm", lfm: "lfm", stunde: "std.", stunden: "std.", std: "std.", "std.": "std.", stück: "stk.", stk: "stk.", "stk.": "stk.", bilder: "stk.", tag: "tag", tage: "tag", tagen: "tag", person: "person", personen: "personen", gäste: "personen", euro: "€", "€": "€", pauschal: "pauschal", monat: "monat" };
const klein = (s) => s.toLowerCase().replace(/[„“"()]/g, "");
const alsZahl = (s) => {
  const k = klein(s);
  if (k in ZAHLWORT) return ZAHLWORT[k];
  const n = Number(k.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && /\d/.test(k) ? n : null;
};
function passt(wort, teil) {
  const k = klein(wort);
  const t = klein(teil.textContent.trim());
  if (teil.dataset.n !== undefined) { const z = alsZahl(wort); return z !== null && z === Number(teil.dataset.n); }
  if (k === t) return true;
  return EINHEIT[k] !== undefined && EINHEIT[k] === t;
}
// Beim freien Sprechen: Was man schon beim Zuhören erkennen kann.
function hoerRolle(worte, i) {
  const k = klein(worte[i]).replace(/[.,:;!?]+$/, "");
  if (/\d/.test(k) || EINHEIT[k]) return true;
  if (/^(herr|herrn|frau|familie|firma)$/.test(k)) return true;
  const davor = i > 0 ? klein(worte[i - 1]).replace(/[.,:;!?]+$/, "") : "";
  return /^(herr|herrn|frau|familie|firma)$/.test(davor);
}

// Zahl läuft exakt mit, die Ziffern bleiben dank tabellarischer Ziffern auf ihrem Platz.
const zaehler = new WeakMap();
function zaehlen(el, bis, { von = null, ms = 380 } = {}) {
  const start = von ?? (zaehler.get(el)?.wert ?? 0);
  const eintrag = { wert: bis, lauf: (zaehler.get(el)?.lauf ?? 0) + 1 };
  zaehler.set(el, eintrag);
  if (ruhig || start === bis) { el.textContent = euro(bis); return; }
  const t0 = performance.now();
  const schritt = (t) => {
    if (zaehler.get(el)?.lauf !== eintrag.lauf) return;
    const p = Math.min(1, (t - t0) / ms); const e = 1 - (1 - p) ** 3;
    el.textContent = p >= 1 ? euro(bis) : euro(start + (bis - start) * e);
    if (p < 1) requestAnimationFrame(schritt);
  };
  requestAnimationFrame(schritt);
}

/* ---------- Bühne ---------- */
const ZEILE = 1.16;
const LUECKE = 0.27;

class Buehne {
  constructor(el, { max = 84, min = 18, tempo = 190, messwert = null } = {}) {
    this.el = el; this.layer = $(".worte", el); this.ziel = $(".ziel", el);
    this.max = max; this.min = min; this.tempo = tempo; this.messwert = messwert;
    this.toks = []; this.anims = []; this.lauf = 0; this.s = 0;
    this.messen();
  }
  messen() {
    this.W = this.layer.clientWidth * 0.985; this.H = this.layer.clientHeight;
    this.B = 24; // Grundgröße der Wörter, die sichtbare Größe entsteht per Transform
    for (const t of this.toks) t.r = t.el.offsetWidth / this.B;
  }
  neu(roh) {
    const m = roh.match(/^(.*?)([.,:;!?]*)$/);
    const el = document.createElement("span");
    el.className = "tok";
    el.innerHTML = `<span class="w"><span class="w-kern">${esc(m[1])}</span><span class="w-satz">${esc(m[2])}</span></span><span class="m">${esc(m[1])}</span>`;
    this.layer.append(el);
    return { el, roh, kern: m[1], r: el.getBoundingClientRect().width / this.B, x: 0, y: 0, s: 0, markiert: false };
  }
  raster(s) {
    let x = 0, y = 0; const lh = s * ZEILE, sp = s * LUECKE; const pos = [];
    for (const t of this.toks) {
      const w = t.r * s;
      if (x > 0 && x + w > this.W) { x = 0; y += lh; }
      pos.push([x, y]); x += w + sp;
    }
    return { pos, hoehe: y + lh };
  }
  groesse() {
    const rMax = Math.max(...this.toks.map((t) => t.r));
    let oben = Math.min(this.max, this.W / rMax), unten = Math.min(this.min, oben);
    if (this.raster(oben).hoehe <= this.H) return oben;
    for (let i = 0; i < 12; i++) { const m = (oben + unten) / 2; if (this.raster(m).hoehe <= this.H) unten = m; else oben = m; }
    return unten;
  }
  // Wörter stehen fest: Sie werden gesetzt, nicht verschoben. So überlappt sich nie etwas.
  setzen(s) {
    const { pos, hoehe } = this.raster(s);
    const versatz = hoehe > this.H ? this.H - hoehe : 0; // sehr langer Satz: die letzten Zeilen bleiben sichtbar
    this.toks.forEach((t, i) => {
      t.x = pos[i][0]; t.y = pos[i][1] + versatz; t.s = s;
      t.el.style.transform = this.tf(t);
    });
    this.s = s;
  }
  tf(t, dy = 0) { return `translate(${t.x.toFixed(1)}px,${(t.y + dy).toFixed(1)}px) scale(${(t.s / this.B).toFixed(4)})`; }
  zeigen(t) {
    t.el.classList.add("da");
    if (!ruhig) t.el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: "ease-out" });
  }
  markieren(t, verzug = 90) {
    if (t.markiert) return;
    t.markiert = true;
    const m = $(".m", t.el), k = $(".w-kern", t.el);
    m.style.opacity = 1; k.style.opacity = 0;
    if (ruhig) return;
    m.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 170, delay: verzug, fill: "backwards", easing: "ease-out" });
    k.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 170, delay: verzug, fill: "backwards", easing: "ease-out" });
  }
  // Freies Sprechen und Tippen: Der Satz wächst. Wird er zu lang, wird die Schrift in einem Schritt kleiner.
  text(satz, { hoeren = true } = {}) {
    const worte = satz.trim().split(/\s+/).filter(Boolean);
    let i = 0;
    while (i < worte.length && i < this.toks.length && worte[i] === this.toks[i].roh) i++;
    this.toks.splice(i).forEach((t) => t.el.remove());
    const frisch = [];
    for (; i < worte.length; i++) { const t = this.neu(worte[i]); this.toks.push(t); frisch.push(t); }
    if (!this.toks.length) return;
    const s = this.s ? Math.min(this.s, this.groesse()) : this.groesse();
    const sprung = this.s && Math.abs(s - this.s) > 0.25;
    this.setzen(s);
    if (sprung && !ruhig) this.layer.animate([{ opacity: 0.25 }, { opacity: 1 }], { duration: 140, easing: "ease-out" });
    frisch.forEach((t) => this.zeigen(t));
    if (hoeren) this.toks.forEach((t, k) => { if (hoerRolle(worte, k)) this.markieren(t); });
  }
  abbruch() {
    this.lauf++;
    this.anims.forEach((a) => { try { a.cancel(); } catch { /* schon weg */ } });
    this.anims = [];
    this.toks = []; this.s = 0;
    this.layer.replaceChildren();
    this.el.classList.remove("fertig");
  }
  fertig() { this.abbruch(); this.el.classList.add("fertig"); }
  zuordnen() {
    const offen = this.toks.slice();
    const paare = [];
    for (const teil of $$(".p", this.ziel)) {
      const i = offen.findIndex((t) => passt(t.kern, teil));
      if (i < 0) continue;
      const tok = offen.splice(i, 1)[0];
      tok.teil = teil;
      paare.push({ tok, teil });
    }
    return { paare, loser: offen };
  }
  // Beispiel: Größe steht vorab fest, die Wörter erscheinen an ihrem endgültigen Platz.
  async sprich(satz) {
    const l = this.lauf;
    const worte = satz.trim().split(/\s+/);
    this.toks = worte.map((w) => this.neu(w));
    this.setzen(this.groesse());
    this.zuordnen();
    for (const t of this.toks) {
      this.zeigen(t);
      if (t.teil?.dataset.rolle) this.markieren(t);
      if (t.teil?.dataset.lauf && this.messwert) zaehlen(this.messwert, Number(t.teil.dataset.lauf));
      await warte(this.tempo + (/[.:]$/.test(t.roh) ? 150 : /,$/.test(t.roh) ? 70 : 0));
      if (l !== this.lauf) return false;
    }
    return true;
  }
  // Füllwörter blenden aus, der Rest fliegt exakt an seinen Platz.
  async sortiere({ flug = 620, stoss = 16, verzug = 200, beiAnkunft = null } = {}) {
    const l = this.lauf;
    const { paare, loser } = this.zuordnen();
    paare.forEach(({ tok, teil }) => { if (teil.dataset.rolle) this.markieren(tok, 0); });
    await warte(verzug);
    if (l !== this.lauf) return false;
    const mit = (a) => { this.anims.push(a); return a; };
    const lb = this.layer.getBoundingClientRect();
    const ziele = paare.map(({ tok, teil }) => {
      const r = teil.getBoundingClientRect();
      const fs = parseFloat(getComputedStyle(teil).fontSize);
      return { tok, teil, to: `translate(${(r.left - lb.left).toFixed(1)}px,${(r.top - lb.top + (r.height - fs * ZEILE) / 2).toFixed(1)}px) scale(${(fs / this.B).toFixed(4)})` };
    });
    this.el.classList.add("fertig");
    const teile = $$(".p", this.ziel);
    const reste = $$(".r", this.ziel);
    teile.forEach((t) => { if (!paare.some((p) => p.teil === t)) reste.push(t); });
    const alle = [];
    loser.forEach((t) => mit(t.el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: "ease-out", fill: "both" })));
    ziele.forEach(({ tok, teil, to }, i) => {
      const d = 90 + i * stoss;
      alle.push(mit(tok.el.animate([
        { transform: this.tf(tok), opacity: 1, easing: FLUG },
        { transform: to, opacity: 1, offset: 0.9 },
        { transform: to, opacity: 0 },
      ], { duration: flug, delay: d, fill: "both" })));
      const satzz = $(".w-satz", tok.el);
      if (satzz.textContent) mit(satzz.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: "both" }));
      alle.push(mit(teil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: flug * 0.14, delay: d + flug * 0.86, fill: "both" })));
    });
    const nachFlug = 90 + ziele.length * stoss + flug * 0.8;
    reste.forEach((r, i) => {
      alle.push(mit(r.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, delay: nachFlug + i * 14, easing: "ease-out", fill: "both" })));
    });
    $$(".zaehlt", this.ziel).forEach((z) => {
      alle.push(mit(z.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, delay: nachFlug, fill: "both" })));
      setTimeout(() => { if (l === this.lauf) zaehlen(z, Number(z.dataset.wert), { von: 0, ms: 420 }); }, nachFlug);
      z.textContent = euro(0);
    });
    if (beiAnkunft) setTimeout(() => { if (l === this.lauf) beiAnkunft(); }, nachFlug);
    try { await Promise.all(alle.map((a) => a.finished)); } catch { return false; }
    if (l !== this.lauf) return false;
    this.anims.forEach((a) => a.cancel()); this.anims = [];
    this.layer.replaceChildren(); this.toks = [];
    return true;
  }
}

/* ---------- Angebot als Markup: jedes Feld ist ein eigenes Ziel ---------- */
const teil = (txt, { n, rolle, lauf } = {}) => `<span class="p"${n !== undefined ? ` data-n="${n}"` : ""}${rolle ? ` data-rolle="${rolle}"` : ""}${lauf !== undefined ? ` data-lauf="${lauf}"` : ""}>${esc(txt)}</span>`;
const rest = (txt) => `<span class="r">${esc(txt)}</span>`;
const worteAlsTeile = (txt, rolle) => txt.split(/\s+/).map((w) => teil(w, { rolle })).join(" ");
const zerlegt = (n) => euro(n).split(/\s/); // ["14,00", "€"]
const einheitVon = (p) => (p.einheit === "Person" && p.menge !== 1 ? "Personen" : p.einheit);

function zeileHTML(p, bisher) {
  const [z] = zerlegt(p.preis);
  const preis = teil(z, { n: p.preis, rolle: "preis", lauf: bisher });
  const rechnung = p.einheit === "pauschal"
    ? `${teil("pauschal", { rolle: "menge" })} ${preis} ${teil("€", { rolle: "preis" })}`
    : `${teil(String(p.menge).replace(".", ","), { n: p.menge, rolle: "menge" })} ${teil(einheitVon(p), { rolle: "menge" })} ${rest("×")} ${preis} ${teil("€", { rolle: "preis" })}`;
  return `<li class="o-zeile"><span class="o-titel">${worteAlsTeile(p.titel)}</span><span class="o-rech">${rechnung}</span><span class="o-sum">${rest(euro(p.summe))}</span></li>`;
}
function angebotHTML(a, { frei = false, getippt = false } = {}) {
  const kopf = frei
    ? `<p class="o-bsp">${rest("Vorschau ohne KI. In der App wertet die KI aus, und Sie prüfen jede Zeile.")}</p>${getippt ? "" : `<p class="o-satz">${rest("Die Spracherkennung läuft hier über Ihren Browser.")}</p>`}`
    : `<p class="o-bsp">${rest("Beispiel: " + a.wer)}</p><p class="o-satz">${rest("„" + a.satz + "“")}</p>`;
  let summe = 0;
  const zeilen = a.positionen.map((p) => { summe = Math.round((summe + p.summe) * 100) / 100; return zeileHTML(p, summe); }).join("");
  return `${kopf}<p class="o-kunde">${a.kunde ? worteAlsTeile(a.kunde, "kunde") : rest("Ihr Kunde")}</p><ul class="o-zeilen">${zeilen}</ul>
  <div class="o-neben"><p>${rest("Netto")}${rest(euro(a.netto))}</p><p>${rest(`zzgl. ${a.mwst} % USt`)}${rest(euro(a.ust))}</p></div>`;
}
// Schrift des Angebots passend zur Bühne, ruhig gedeckelt.
function zielEinpassen(buehne) {
  const z = buehne.ziel; const H = z.clientHeight; const breit = innerWidth >= 700;
  z.classList.toggle("ohne-satz", H < 300 && !breit);
  z.classList.remove("ohne-neben");
  z.classList.add("eng");
  const titel = $$(".o-titel", z);
  const passtHin = () => z.scrollHeight <= H + 1 && z.scrollWidth <= z.clientWidth + 1 && titel.every((t) => t.scrollWidth <= t.clientWidth + 1);
  let lo = 12, hi = innerWidth >= 1100 ? 24 : breit ? 22 : 18;
  for (let i = 0; i < 7; i++) {
    const m = (lo + hi) / 2;
    z.style.setProperty("--z", m.toFixed(2) + "px");
    if (passtHin()) lo = m; else hi = m;
  }
  z.style.setProperty("--z", lo.toFixed(2) + "px");
  if (z.scrollHeight > H + 1) z.classList.add("ohne-neben");
  if (!passtHin()) z.classList.remove("eng"); // sehr langer gesprochener Name darf umbrechen
}

/* ---------- Erster Bildschirm ---------- */
const held = $(".held");
const maxSatz = () => (innerWidth < 700 ? 44 : innerWidth < 1100 ? 60 : 76);
const mwZahl = $("#mw-zahl"), mwText = $("#mw-text");
const bue = new Buehne($("#buehne"), { max: maxSatz(), messwert: mwZahl });
const tabs = $$(".tab[data-i]");
const pauseKnopf = $("#pause");
const mikro = $("#mikro"), mikroTitel = $("#mikro-titel"), mikroUnter = $("#mikro-unter");
const tippen = $("#tippen"), satzFeld = $("#satz"), tippenText = $("#tippen-text");
let aktiv = 0, auto = !ruhig, spiel = 0, heldSichtbar = true, wartet = false;

function markiere(i) { tabs.forEach((t) => t.setAttribute("aria-pressed", String(+t.dataset.i === i))); }
const messwertStart = () => { mwText.textContent = "Netto"; zaehlen(mwZahl, 0, { von: 0 }); };
const messwertEnde = (a) => { mwText.textContent = `Gesamt inkl. ${a.mwst} % USt`; zaehlen(mwZahl, a.brutto); };

async function beispiel(i, { wechsel = false } = {}) {
  const s = ++spiel;
  hoerenAus(); tippen.hidden = true; mikro.hidden = false;
  aktiv = i; markiere(i);
  const b = BEISPIELE[i];
  blattZeigen(b);
  if (ruhig) {
    bue.abbruch(); bue.ziel.innerHTML = angebotHTML(b); zielEinpassen(bue); bue.fertig(); messwertEnde(b);
    return;
  }
  // Ruhiger Satzwechsel: Das Alte blendet aus, das Neue läuft.
  if (wechsel) {
    const a = [bue.layer, bue.ziel, mwZahl.parentElement].map((e) => e.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 170, easing: "ease-out", fill: "both" }));
    await warte(180);
    a.forEach((x) => x.cancel());
    if (s !== spiel) return;
  }
  await schrift; // Messen erst mit der echten Schrift
  if (s !== spiel) return;
  bue.abbruch(); bue.messen();
  if (auto) bue.ziel.removeAttribute("aria-live"); else bue.ziel.setAttribute("aria-live", "polite");
  bue.ziel.innerHTML = angebotHTML(b);
  zielEinpassen(bue);
  messwertStart();
  await warte(wechsel ? 80 : 160);
  if (s !== spiel) return;
  if (!(await bue.sprich(b.satz)) || s !== spiel) return;
  await warte(240);
  if (s !== spiel) return;
  if (!(await bue.sortiere({ beiAnkunft: () => messwertEnde(b) })) || s !== spiel) return;
  if (!auto) return;
  await warte(5200);
  if (s !== spiel || !auto) return;
  weiter();
}
function weiter() {
  if (!heldSichtbar || document.hidden) { wartet = true; return; }
  wartet = false;
  beispiel((aktiv + 1) % BEISPIELE.length, { wechsel: true });
}
function autoAus() {
  auto = false;
  pauseKnopf.classList.add("steht");
  pauseKnopf.setAttribute("aria-label", "Beispiele weiterlaufen lassen");
}

tabs.forEach((t) => t.addEventListener("click", () => { autoAus(); beispiel(+t.dataset.i, { wechsel: true }); }));
pauseKnopf.addEventListener("click", () => {
  if (auto) { autoAus(); return; }
  auto = true; pauseKnopf.classList.remove("steht");
  pauseKnopf.setAttribute("aria-label", "Beispiele anhalten");
  weiter();
});

// Wischen wechselt das Beispiel, senkrecht bleibt Scrollen.
let wischX = null, wischY = null;
bue.el.addEventListener("pointerdown", (e) => { wischX = e.clientX; wischY = e.clientY; });
bue.el.addEventListener("pointerup", (e) => {
  if (wischX === null) return;
  const dx = e.clientX - wischX, dy = e.clientY - wischY; wischX = null;
  if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
  autoAus();
  beispiel((aktiv + (dx < 0 ? 1 : -1) + BEISPIELE.length) % BEISPIELE.length, { wechsel: true });
});
bue.el.addEventListener("pointercancel", () => { wischX = null; });

/* ---------- Selbst sprechen ---------- */
let stopp = null, zuletzt = "", stilleUhr = null, leerUhr = null, balken = [];

function balkenAn() {
  if (ruhig) return;
  balken = $$(".welle-balken i", mikro).map((b, i) => b.animate(
    [{ transform: "scaleY(.12)" }, { transform: `scaleY(${[0.4, 0.8, 0.55, 1, 0.6, 0.85, 0.35][i]})` }, { transform: "scaleY(.14)" }],
    { duration: 780 + i * 70, iterations: Infinity, easing: "ease-in-out" }));
}
function balkenAus() { balken.forEach((a) => a.cancel()); balken = []; }
function hoerenAus() {
  clearTimeout(stilleUhr); clearTimeout(leerUhr);
  if (stopp) { const s = stopp; stopp = null; try { s(); } catch { /* Erkennung schon beendet */ } }
  mikro.classList.remove("hoert"); mikro.setAttribute("aria-pressed", "false");
  balkenAus();
  if (!mikro.classList.contains("tippt")) { mikroTitel.textContent = "Selbst sprechen"; mikroUnter.textContent = "Ohne App, direkt im Browser"; }
}
function satzAuswerten(text) {
  const e = auswerten(text, BRANCHE_VON[BEISPIELE[aktiv].id]);
  // Die Regel-Auswertung nennt Positionen oft nur „Leistung“. Die Wörter davor sind meist der bessere Name.
  const worte = text.replace(/[.,:;]/g, " ").split(/\s+/).filter(Boolean);
  const KUERZEL = new Set(["für", "herr", "herrn", "frau", "familie", "firma", "dazu", "und", "noch", "außerdem", "dann", "zu", "euro", "€", "pauschal", ...e.kunde.toLowerCase().split(/\s+/)]);
  let ab = 0;
  e.positionen.forEach((p) => {
    const iMenge = worte.findIndex((w, i) => i >= ab && (alsZahl(w) === p.menge || alsZahl(w) === p.preis));
    if (iMenge < 0) return;
    if (p.titel === "Leistung") {
      const name = worte.slice(ab, iMenge).filter((w) => !KUERZEL.has(w.toLowerCase())).join(" ");
      if (name) p.titel = name[0].toUpperCase() + name.slice(1);
    }
    const iPreis = worte.findIndex((w, i) => i >= iMenge && alsZahl(w) === p.preis);
    ab = (iPreis >= 0 ? iPreis : iMenge) + 1;
    while (ab < worte.length && /^(euro|€)$/i.test(worte[ab])) ab++;
  });
  return e;
}
async function freierSatz(text) {
  const s = ++spiel;
  const e = satzAuswerten(text);
  if (!e.positionen.length) {
    const hilfe = "Da fehlen noch Menge und Preis. Sagen Sie zum Beispiel: " + BEISPIELE[aktiv].satz;
    mikroUnter.textContent = "Noch einmal tippen und sprechen";
    tippenText.textContent = hilfe;
    bue.abbruch();
    bue.text(hilfe, { hoeren: false });
    return;
  }
  const a = { ...e, satz: text, wer: "" };
  bue.ziel.setAttribute("aria-live", "polite");
  bue.ziel.innerHTML = angebotHTML(a, { frei: true, getippt: !tippen.hidden });
  zielEinpassen(bue);
  if (ruhig) { bue.fertig(); messwertEnde(a); return; }
  if (!bue.toks.length) bue.text(text);
  await warte(140);
  if (s !== spiel) return;
  await bue.sortiere({ beiAnkunft: () => messwertEnde(a) });
}
function nettoLive(t) {
  mwText.textContent = "Netto";
  try { zaehlen(mwZahl, satzAuswerten(t).netto, { ms: 240 }); } catch { /* Zwischenstand nicht auswertbar */ }
}
function tippenZeigen(grund) {
  hoerenAus();
  mikro.classList.add("tippt");
  mikroTitel.textContent = "Selbst tippen"; mikroUnter.textContent = "Die Wörter werden genauso erkannt";
  tippenText.textContent = grund === "kein-mikrofon"
    ? "Das Mikrofon ist hier nicht frei. Tippen Sie Ihren Satz, die Wörter erscheinen oben."
    : grund === "still"
      ? "Es kam nichts an. Tippen Sie Ihren Satz, die Wörter erscheinen oben."
      : "Tippen Sie Ihren Satz. Die Wörter erscheinen oben.";
  mikro.hidden = true; tippen.hidden = false;
  spiel++; bue.abbruch(); messwertStart();
  satzFeld.value = "";
  bue.text("Tippen Sie los.", { hoeren: false });
  zuletzt = "";
  satzFeld.focus({ preventScroll: false });
}
function hoerenStart() {
  autoAus(); spiel++;
  if (!spracheMoeglich()) { tippenZeigen("nicht-unterstuetzt"); return; }
  bue.abbruch(); messwertStart();
  zuletzt = "";
  bue.text("Sprechen Sie jetzt.", { hoeren: false });
  mikro.classList.add("hoert"); mikro.setAttribute("aria-pressed", "true");
  mikroTitel.textContent = "Fertig"; mikroUnter.textContent = "Kunde, Leistung, Menge, Preis";
  balkenAn();
  leerUhr = setTimeout(() => { if (!zuletzt) tippenZeigen("still"); }, 9000);
  stopp = sprechen({
    beiText(fest, zwischen) {
      const t = [fest, zwischen].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
      if (!t) return;
      if (!zuletzt) bue.abbruch();
      zuletzt = t; bue.text(t); nettoLive(t);
      clearTimeout(leerUhr); clearTimeout(stilleUhr);
      stilleUhr = setTimeout(hoerenEnde, 2600);
    },
    beiEnde() { /* Ende löst hoerenEnde selbst aus */ },
    beiFehler(code) { tippenZeigen(code); },
  });
}
function hoerenEnde() {
  const t = zuletzt;
  hoerenAus();
  if (t) freierSatz(t); else { bue.abbruch(); beispiel(aktiv); }
}
mikro.addEventListener("click", () => { if (stopp) hoerenEnde(); else hoerenStart(); });

satzFeld.addEventListener("input", () => {
  const t = satzFeld.value.trim();
  if (!zuletzt) bue.abbruch();
  if (bue.el.classList.contains("fertig")) bue.abbruch();
  zuletzt = t;
  spiel++;
  if (t) { bue.text(t); nettoLive(t); } else { bue.abbruch(); bue.text("Tippen Sie los.", { hoeren: false }); messwertStart(); }
});
tippen.addEventListener("submit", (e) => {
  e.preventDefault();
  if (satzFeld.value.trim()) { satzFeld.blur(); freierSatz(satzFeld.value.trim()); }
});
satzFeld.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); tippen.requestSubmit(); } });
if (!spracheMoeglich()) { mikro.classList.add("tippt"); mikroTitel.textContent = "Selbst tippen"; mikroUnter.textContent = "Die Wörter werden genauso erkannt"; }

/* ---------- Gleicher Sprung von anderen Stellen ---------- */
$$(".w-an").forEach((w) => w.addEventListener("click", () => {
  autoAus();
  held.scrollIntoView({ behavior: ruhig ? "auto" : "smooth" });
  const i = +w.dataset.i;
  setTimeout(() => beispiel(i, { wechsel: true }), ruhig ? 0 : 450);
}));
$$("[data-mikro]").forEach((a) => a.addEventListener("click", () => setTimeout(() => { if (!stopp) mikro.hidden ? satzFeld.focus() : mikro.focus(); }, 500)));

/* ---------- Das Blatt folgt dem Beispiel ---------- */
function blattZeigen(b) {
  const s = $("#blatt-seite");
  $(".b-abs", s).textContent = "Beispiel: " + b.wer;
  $(".b-an", s).textContent = b.kunde;
  $("tbody", s).innerHTML = b.positionen.map((p) => `<tr><td>${esc(p.titel)}</td><td>${p.einheit === "pauschal" ? "pauschal" : esc(p.menge + " " + einheitVon(p))}</td><td class="r-b">${euro(p.preis)}</td><td class="r-b">${euro(p.summe)}</td></tr>`).join("");
  const fuss = $$("tfoot td.r-b", s);
  fuss[0].textContent = euro(b.netto); fuss[1].textContent = euro(b.ust); fuss[2].textContent = euro(b.brutto);
  $("tfoot tr:nth-child(2) td", s).textContent = `zzgl. ${b.mwst} % USt`;
}

/* ---------- Ab hier: dieselbe Bewegung auf der ganzen Seite, kurz und sparsam ---------- */
function beimSehen(el, f, schwelle = 0.2) {
  if (!("IntersectionObserver" in window)) { f(); return; }
  const io = new IntersectionObserver((e) => { if (e.some((x) => x.isIntersecting)) { io.disconnect(); f(); } }, { threshold: schwelle, rootMargin: "0px 0px -8% 0px" });
  io.observe(el);
}

// Überschriften: Ein langer Satz schnurrt auf seine Aussage zusammen.
// Der lange Satz steht kleiner im selben Raum wie die fertige Überschrift, darum überdeckt er nie etwas.
function schnurren(h) {
  const satz = h.dataset.satz;
  if (ruhig) return;
  const endText = h.textContent.replace(/ /g, " ").trim();
  const zielWorte = endText.split(/\s+/);
  beimSehen(h, async () => {
    const roh = h.innerHTML;
    h.innerHTML = zielWorte.map((w) => `<span class="sw" style="display:inline-block;transform-origin:0 0">${esc(w)}</span>`).join(" ");
    const volle = satz.split(/\s+/);
    const hoehe = h.offsetHeight, fs = parseFloat(getComputedStyle(h).fontSize);
    const spiegel = h.cloneNode(false);
    spiegel.removeAttribute("id"); spiegel.removeAttribute("data-satz");
    spiegel.setAttribute("aria-hidden", "true");
    spiegel.style.cssText = `position:absolute;left:0;top:0;width:${h.offsetWidth}px;visibility:hidden;text-wrap:wrap;margin:0`;
    spiegel.innerHTML = volle.map((w) => `<span style="display:inline-block">${esc(w)}</span>`).join(" ");
    h.append(spiegel);
    let q = 1;
    while (q > 0.3 && spiegel.offsetHeight > hoehe + 1) { q -= 0.04; spiegel.style.fontSize = (fs * q) + "px"; }
    const hr = h.getBoundingClientRect();
    const pos = $$("span", spiegel).map((e) => { const r = e.getBoundingClientRect(); return { x: r.left - hr.left, y: r.top - hr.top }; });
    spiegel.remove();
    const benutzt = new Set();
    const norm = (w) => w.toLowerCase().replace(/[.,?!]/g, "");
    const dauer = 560, halten = 560;
    h.classList.add("lief");
    let j = 0;
    const woerter = $$(".sw", h);
    const kaesten = woerter.map((sp) => sp.getBoundingClientRect());
    // Breite festhalten: Der Wortwechsel darf den Zeilenfall nicht verschieben.
    woerter.forEach((sp, i) => { sp.style.width = kaesten[i].width + "px"; sp.style.whiteSpace = "nowrap"; });
    woerter.forEach((sp, i) => {
      while (j < volle.length && norm(volle[j]) !== norm(zielWorte[i])) j++;
      if (j >= volle.length) return;
      benutzt.add(j);
      const r = kaesten[i];
      const von = `translate(${(pos[j].x - (r.left - hr.left)).toFixed(1)}px,${(pos[j].y - (r.top - hr.top)).toFixed(1)}px) scale(${q.toFixed(3)})`;
      sp.animate([
        { transform: von, offset: 0, easing: "linear" },
        { transform: von, offset: halten / (halten + dauer), easing: FLUG },
        { transform: "none", offset: 1 },
      ], { duration: halten + dauer, fill: "both" });
      // Im langen Satz steht das Wort so, wie man es sagt („für“), am Ziel so, wie es dann dasteht („Für“).
      const gesagt = volle[j]; const endgueltig = zielWorte[i];
      if (gesagt !== endgueltig) { sp.textContent = gesagt; setTimeout(() => { sp.textContent = endgueltig; }, halten + dauer * 0.5); }
      j++;
    });
    const fuell = [];
    volle.forEach((w, k) => {
      if (benutzt.has(k)) return;
      const e = document.createElement("span");
      e.textContent = w; e.setAttribute("aria-hidden", "true");
      e.style.cssText = `position:absolute;left:0;top:0;white-space:nowrap;font-size:${(fs * q).toFixed(1)}px;transform:translate(${pos[k].x.toFixed(1)}px,${pos[k].y.toFixed(1)}px)`;
      h.append(e); fuell.push(e);
      e.animate([{ opacity: 1 }, { opacity: 1, offset: 0.76 }, { opacity: 0 }], { duration: halten + dauer * 0.3, fill: "both" });
    });
    await warte(halten + dauer + 40);
    fuell.forEach((e) => e.remove());
    h.innerHTML = roh;
  }, 0.35);
}
$$("[data-satz]").forEach(schnurren);

if (!ruhig) {
  // Die Branchen sortieren sich mit kleinem Versatz zur Liste.
  const wand = $("#wand"); const w = $$(".w", wand);
  w.forEach((e) => e.setAttribute("data-kommt", ""));
  beimSehen(wand, () => {
    w.forEach((e, i) => {
      e.classList.add("lief");
      const dx = (Math.sin(i * 12.9898) * 43758.5453 % 1) * 26, dy = (Math.sin(i * 78.233) * 12543.1 % 1) * 18;
      e.animate([{ opacity: 0, transform: `translate(${dx.toFixed(0)}px,${dy.toFixed(0)}px)` }, { opacity: 1, transform: "none" }], { duration: 480, delay: (i * 7) % 11 * 22, easing: AUS, fill: "backwards" });
    });
  }, 0.1);
  $$(".verben details, .fragen details").forEach((d, i) => {
    beimSehen(d, () => {
      d.classList.add("lief");
      d.animate([{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], { duration: 420, delay: (i % 8) * 30, easing: AUS, fill: "backwards" });
    }, 0.1);
  });
  // Die Zeilen setzen sich aufs Blatt.
  const seite = $("#blatt-seite");
  beimSehen(seite, () => {
    $$("tbody tr, tfoot tr, .b-kopf, .b-an, .b-titel, .b-gruss, .b-zusage", seite).forEach((e, i) => {
      e.animate([{ opacity: 0, transform: "translateX(14px)" }, { opacity: 1, transform: "none" }], { duration: 400, delay: i * 30, easing: AUS, fill: "backwards" });
    });
  }, 0.15);
  $$("#h-abend, #h-danach, #h-blatt, .aussage, .alle-text, .preis-test, .zwischen-test, .schluss-zeile, .fuss-spalten").forEach((e) => {
    e.setAttribute("data-kommt", "");
    beimSehen(e, () => {
      e.classList.add("lief");
      e.animate([{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], { duration: 520, easing: AUS, fill: "backwards" });
    }, 0.1);
  });
}

/* ---------- „Stimmen die Zahlen?“ ---------- */
const maler = BEISPIELE[0], zeile1 = maler.positionen[0];
const rechnenEl = $("#rechnen");
const rechnenZiel = $(".ziel", rechnenEl);
const hakenFeld = $("#haken");
{
  const [z] = zerlegt(zeile1.preis);
  rechnenZiel.innerHTML = `<p class="z-titel">${worteAlsTeile(zeile1.titel)}</p><p class="z-rechnung">${teil(String(zeile1.menge), { n: zeile1.menge, rolle: "menge" })} ${teil(zeile1.einheit, { rolle: "menge" })} ${rest("×")} ${teil(z, { n: zeile1.preis, rolle: "preis" })} ${teil("€", { rolle: "preis" })}</p><p class="z-summe">${rest("=")} <b class="zaehlt" data-wert="${zeile1.summe}">${esc(euro(zeile1.summe))}</b></p>`;
}
const rechnen = new Buehne(rechnenEl, { max: 40, tempo: 170 });
const satzZeile = maler.satz.split(". ")[0].replace(/^Für [^:]+:\s*/, "") + ".";
async function rechnenSpielen() {
  hakenFeld.checked = false;
  rechnen.abbruch();
  if (ruhig) { rechnen.fertig(); return; }
  rechnen.messen();
  if (await rechnen.sprich(satzZeile)) { await warte(220); await rechnen.sortiere(); }
}
if (ruhig) rechnen.fertig();
else beimSehen(rechnenEl, rechnenSpielen, 0.3);
$("#nochmal").addEventListener("click", rechnenSpielen);
rechnenEl.closest("details").addEventListener("toggle", (e) => { if (e.target.open && !ruhig) rechnenSpielen(); });

/* ---------- „Kann ich das ändern?“ ---------- */
const aKnopf = $("#a-knopf"), aSumme = $("#a-summe"), aWeg = $("#aendern .weg"), aFuss = $("#aendern .a-gesamt");
const ohne = rechne({ ...maler, positionen: [maler.positionen[0]] });
let aRaus = false, aAnim = [];
zaehler.set(aSumme, { wert: maler.brutto, lauf: 0 });
aKnopf.addEventListener("click", () => {
  aAnim.forEach((a) => a.cancel()); aAnim = [];
  aRaus = !aRaus;
  const h = aWeg.offsetHeight + 6;
  zaehlen(aSumme, aRaus ? ohne.brutto : maler.brutto);
  aKnopf.textContent = aRaus ? "„Abkleben doch wieder rein.“" : "„Abkleben nehmen wir raus.“";
  if (ruhig) { aWeg.style.opacity = aRaus ? "0" : "1"; aFuss.style.transform = aRaus ? `translateY(-${h}px)` : "none"; return; }
  const opt = { duration: 380, easing: FLUG, fill: "forwards" };
  aAnim.push(aWeg.animate(aRaus ? [{ transform: "none", opacity: 1 }, { transform: "translateX(24px)", opacity: 0 }] : [{ transform: "translateX(24px)", opacity: 0 }, { transform: "none", opacity: 1 }], opt));
  aAnim.push(aFuss.animate(aRaus ? [{ transform: "none" }, { transform: `translateY(-${h}px)` }] : [{ transform: `translateY(-${h}px)` }, { transform: "none" }], opt));
});

/* ---------- Preise: Der Satz sortiert sich zur Zeile ---------- */
const tarife = $$(".tarif");
const tarifBue = new Map();
function tarifHole(t) {
  if (!tarifBue.has(t)) tarifBue.set(t, new Buehne($(".buehne", t), { max: innerWidth < 700 ? 40 : 56, tempo: 150 }));
  return tarifBue.get(t);
}
let tarifLauf = 0;
async function tarifZeigen(id, spielen = true) {
  const l = ++tarifLauf;
  $$(".tarif-tabs button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.t === id)));
  tarife.forEach((t) => { t.classList.toggle("an", t.dataset.t === id); });
  const t = tarife.find((x) => x.dataset.t === id);
  const b = tarifHole(t);
  tarife.forEach((x) => { if (x !== t && tarifBue.has(x)) tarifBue.get(x).abbruch(); });
  b.abbruch(); b.messen();
  if (ruhig || !spielen) { b.fertig(); $$(".zaehlt", b.ziel).forEach((z) => { z.textContent = euro(Number(z.dataset.wert)); }); return; }
  if (await b.sprich(t.dataset.satzPreis) && l === tarifLauf) { await warte(160); await b.sortiere({ flug: 560 }); }
}
$$(".tarif-tabs button").forEach((b) => b.addEventListener("click", () => tarifZeigen(b.dataset.t)));
tarifZeigen("profi", false);
if (!ruhig) {
  const t = tarife.find((x) => x.dataset.t === "profi");
  tarifHole(t).abbruch();
  beimSehen(t, () => { if (tarifLauf === 1) tarifZeigen("profi"); }, 0.3);
}

/* ---------- Beispiele laufen nur, solange der erste Bildschirm sichtbar ist ---------- */
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((e) => {
    e.forEach((x) => { heldSichtbar = x.isIntersecting; });
    if (heldSichtbar && wartet && auto) weiter();
  }, { threshold: 0 });
  io.observe(held);
}
document.addEventListener("visibilitychange", () => { if (!document.hidden && wartet && auto && heldSichtbar) weiter(); });

/* ---------- Größe ändert sich: sofort das Endbild, damit nichts danebenliegt ---------- */
let breite = innerWidth, zeit = null;
addEventListener("resize", () => {
  clearTimeout(zeit);
  zeit = setTimeout(() => {
    if (Math.abs(innerWidth - breite) < 2) return; // Handy-Adressleiste
    breite = innerWidth;
    autoAus(); spiel++;
    bue.max = maxSatz();
    bue.abbruch(); bue.messen(); bue.ziel.innerHTML = angebotHTML(BEISPIELE[aktiv]); zielEinpassen(bue); bue.fertig();
    messwertEnde(BEISPIELE[aktiv]);
    rechnen.fertig();
    tarifBue.forEach((b) => { b.abbruch(); b.messen(); b.fertig(); $$(".zaehlt", b.ziel).forEach((z) => { z.textContent = euro(Number(z.dataset.wert)); }); });
  }, 200);
});

/* ---------- Zugeklappte Antworten rendern nichts ---------- */
$$(".fragen details").forEach((d) => {
  const inhalt = $$(".aendern, .pruef-feld", d);
  const stell = () => inhalt.forEach((e) => { e.hidden = !d.open; });
  d.addEventListener("toggle", stell); stell();
});

/* ---------- Start ---------- */
async function los() {
  await schrift;
  bue.messen(); rechnen.messen();
  beispiel(0);
}
los();
