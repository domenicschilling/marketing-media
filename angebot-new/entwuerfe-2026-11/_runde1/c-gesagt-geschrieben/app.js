// Gesagt. Geschrieben.: Der Satz wird zum Bild, dann sortiert er sich zur Angebotszeile.
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

const FARBEN = {
  maler: { f: "#FF4F12", i: "#0B0F0D" },
  foto: { f: "#1C2FE8", i: "#FFFFFF" },
  catering: { f: "#FFC400", i: "#0B0F0D" },
  it: { f: "#B8F500", i: "#0B0F0D" },
  garten: { f: "#0A5C3A", i: "#F5F4EC" },
};
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

/* ---------- Bühne ---------- */
const ZEILE = 0.98;
const LUECKE = 0.25;

class Buehne {
  constructor(el, { max = 220, min = 18, tempo = 215 } = {}) {
    this.el = el; this.layer = $(".worte", el); this.ziel = $(".ziel", el);
    this.max = max; this.min = min; this.tempo = tempo;
    this.toks = []; this.anims = []; this.lauf = 0;
    this.messen();
  }
  messen() {
    this.W = this.layer.clientWidth; this.H = this.layer.clientHeight;
    this.B = Math.round(Math.max(40, Math.min(this.max, this.H * 0.6)));
    this.layer.style.setProperty("--b", this.B + "px");
    for (const t of this.toks) t.r = t.el.offsetWidth / this.B;
  }
  neu(roh) {
    const m = roh.match(/^(.*?)([.,:;!?]*)$/);
    const el = document.createElement("span");
    el.className = "tok";
    el.innerHTML = `<i>${esc(m[1])}</i><u>${esc(m[2])}</u>`;
    this.layer.append(el);
    return { el, roh, kern: m[1], r: el.offsetWidth / this.B, x: 0, y: 0, s: 0, neu: true };
  }
  // Größte Schrift, bei der alle Wörter passen. Kein Wort wird je getrennt oder abgeschnitten.
  raster(s) {
    let x = 0, y = 0; const lh = s * ZEILE, sp = s * LUECKE; const pos = [];
    for (const t of this.toks) {
      const w = t.r * s;
      if (x > 0 && x + w > this.W) { x = 0; y += lh; }
      pos.push([x, y]); x += w + sp;
    }
    return { pos, hoehe: y + lh };
  }
  ordnen() {
    if (!this.toks.length) return;
    const rMax = Math.max(...this.toks.map((t) => t.r));
    let oben = Math.min(this.B, this.W / rMax), unten = Math.min(this.min, oben);
    if (this.raster(oben).hoehe > this.H) {
      for (let i = 0; i < 12; i++) { const m = (oben + unten) / 2; if (this.raster(m).hoehe <= this.H) unten = m; else oben = m; }
    } else unten = oben;
    const s = unten; const { pos, hoehe } = this.raster(s);
    const versatz = hoehe > this.H ? this.H - hoehe : 0; // sehr langer Satz: die letzten Zeilen bleiben sichtbar
    this.toks.forEach((t, i) => {
      t.x = pos[i][0]; t.y = pos[i][1] + versatz; t.s = s;
      if (t.neu) { t.el.style.transition = "none"; }
      t.el.style.transform = this.tf(t);
      if (t.neu) {
        void t.el.offsetWidth; t.el.style.transition = ""; t.neu = false;
        if (!ruhig) t.el.firstChild.animate([{ opacity: 0, transform: "translateY(38%)" }, { opacity: 1, transform: "none" }], { duration: 300, easing: "cubic-bezier(.22,1,.36,1)" });
      }
    });
  }
  tf(t, dy = 0) { return `translate(${t.x.toFixed(1)}px,${(t.y + dy).toFixed(1)}px) scale(${(t.s / this.B).toFixed(4)})`; }
  text(satz) {
    const worte = satz.trim().split(/\s+/).filter(Boolean);
    let i = 0;
    while (i < worte.length && i < this.toks.length && worte[i] === this.toks[i].roh) i++;
    this.toks.splice(i).forEach((t) => t.el.remove());
    for (; i < worte.length; i++) this.toks.push(this.neu(worte[i]));
    this.ordnen();
  }
  abbruch() {
    this.lauf++;
    this.anims.forEach((a) => { try { a.cancel(); } catch { /* schon weg */ } });
    this.anims = [];
    this.toks.forEach((t) => t.el.remove()); this.toks = [];
    this.layer.replaceChildren();
    this.el.classList.remove("fertig");
  }
  fertig() { this.abbruch(); this.el.classList.add("fertig"); }
  async sprich(satz) {
    const l = this.lauf; const worte = satz.trim().split(/\s+/);
    let t = "";
    for (const w of worte) {
      t += (t ? " " : "") + w;
      this.text(t);
      await warte(this.tempo + (/[.:]$/.test(w) ? 170 : /,$/.test(w) ? 90 : 0));
      if (l !== this.lauf) return false;
    }
    return true;
  }
  // Die Wörter finden ihr Feld. Wörter ohne Feld fallen weg, der Rest des Angebots kommt nach.
  async sortiere({ erkennen = 380, flug = 780, stoss = 34, maske = true } = {}) {
    const l = this.lauf;
    const offen = this.toks.slice();
    const teile = $$(".p", this.ziel);
    const paare = [];
    for (const teil of teile) {
      const i = offen.findIndex((t) => passt(t.kern, teil));
      if (i >= 0) paare.push({ tok: offen.splice(i, 1)[0], teil });
    }
    const loser = offen;
    const mit = (a) => { this.anims.push(a); return a; };
    loser.forEach((t) => mit(t.el.animate([{ opacity: 1 }, { opacity: 0.2 }], { duration: erkennen * 0.8, easing: "ease-out", fill: "forwards" })));
    paare.forEach(({ tok }) => mit(tok.el.firstChild.animate([{ transform: "none" }, { transform: "scale(1.035)" }, { transform: "none" }], { duration: erkennen, easing: "ease-in-out" })));
    await warte(erkennen);
    if (l !== this.lauf) return false;

    const b = this.el.getBoundingClientRect();
    const ziele = paare.map(({ tok, teil }) => {
      const r = teil.getBoundingClientRect();
      const fs = parseFloat(getComputedStyle(teil).fontSize);
      const k = fs / this.B;
      return { tok, teil, to: `translate(${(r.left - b.left - (this.layer.getBoundingClientRect().left - b.left)).toFixed(1)}px,${(r.top - b.top - (this.layer.getBoundingClientRect().top - b.top) + (r.height - fs * ZEILE) / 2).toFixed(1)}px) scale(${k.toFixed(4)})` };
    });

    this.el.classList.add("fertig");
    const reste = $$(".r", this.ziel);
    const steigt = $$(".o-steigt", this.ziel);
    const alle = [];
    teile.forEach((t) => { if (!paare.some((p) => p.teil === t)) reste.push(t); });
    loser.forEach((t) => {
      t.el.style.transition = "none";
      mit(t.el.animate([{ opacity: 0.2, transform: this.tf(t) }, { opacity: 0, transform: this.tf(t, 26) }], { duration: 260, easing: "ease-out", fill: "both" }));
    });
    ziele.forEach(({ tok, teil, to }, i) => {
      const d = i * stoss; const cur = this.tf(tok);
      tok.el.style.transition = "none";
      alle.push(mit(tok.el.animate([
        { transform: cur, opacity: 1, easing: "cubic-bezier(.76,0,.24,1)" },
        { transform: to, opacity: 1, offset: 0.86 },
        { transform: to, opacity: 0 },
      ], { duration: flug, delay: d, fill: "both" })));
      const u = tok.el.lastChild;
      if (u.textContent) mit(u.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, delay: d, fill: "both" }));
      alle.push(mit(teil.animate([{ opacity: 0 }, { opacity: 1 }], { duration: flug * 0.16, delay: d + flug * 0.8, fill: "both" })));
    });
    const nachFlug = (ziele.length * stoss) + flug * 0.82;
    reste.forEach((r, i) => {
      alle.push(mit(r.animate([{ opacity: 0, transform: "translateY(.35em)" }, { opacity: 1, transform: "none" }], { duration: 400, delay: nachFlug + i * 32, easing: "cubic-bezier(.22,1,.36,1)", fill: "both" })));
    });
    steigt.forEach((s) => {
      alle.push(mit(s.animate(maske ? [{ transform: "translateY(112%)" }, { transform: "none" }] : [{ opacity: 0, transform: "translateY(10%) scale(.96)" }, { opacity: 1, transform: "none" }], { duration: 760, delay: nachFlug + reste.length * 32 + 60, easing: "cubic-bezier(.22,1,.36,1)", fill: "both" })));
    });
    try { await Promise.all(alle.map((a) => a.finished)); } catch { return false; }
    if (l !== this.lauf) return false;
    this.anims.forEach((a) => a.cancel()); this.anims = [];
    this.toks.forEach((t) => t.el.remove()); this.toks = [];
    return true;
  }
}

/* ---------- Angebot als Markup: jedes Feld ist ein eigenes Ziel ---------- */
const teil = (txt, n) => `<span class="p"${n !== undefined ? ` data-n="${n}"` : ""}>${esc(txt)}</span>`;
const rest = (txt) => `<span class="r">${esc(txt)}</span>`;
const worteAlsTeile = (txt) => txt.split(/\s+/).map((w) => teil(w)).join(" ");
const zerlegt = (n) => euro(n).split(/\s/); // ["14,00", "€"]

function zeileHTML(p) {
  const [z] = zerlegt(p.preis);
  const einheit = p.einheit === "Person" && p.menge !== 1 ? "Personen" : p.einheit;
  const rechnung = p.einheit === "pauschal"
    ? `${teil("pauschal")} ${teil(z, p.preis)} ${teil("€")}`
    : `${teil(String(p.menge).replace(".", ","), p.menge)} ${teil(einheit)} ${rest("×")} ${teil(z, p.preis)} ${teil("€")}`;
  return `<li class="o-zeile"><span class="o-titel">${worteAlsTeile(p.titel)}</span><span class="o-sum">${rest(euro(p.summe))}</span><span class="o-rech">${rechnung}</span></li>`;
}
function angebotHTML(a, { frei = false, getippt = false } = {}) {
  const kopf = frei
    ? `<p class="o-bsp">${rest("Vorschau ohne KI. In der App wertet die KI aus, und Sie prüfen jede Zeile.")}</p>${getippt ? "" : `<p class="o-satz">${rest("Die Spracherkennung läuft hier über Ihren Browser.")}</p>`}`
    : `<p class="o-bsp">${rest("Beispiel: " + a.wer)}</p><p class="o-satz">${rest("„" + a.satz + "“")}</p>`;
  return `<div class="o-links">${kopf}<p class="o-kunde">${a.kunde ? worteAlsTeile(a.kunde) : rest("Ihr Kunde")}</p><ul class="o-zeilen">${a.positionen.map(zeileHTML).join("")}</ul></div>
  <div class="o-rechts"><p class="o-neben">${rest("Netto")}${rest(euro(a.netto))}</p><p class="o-neben">${rest(`zzgl. ${a.mwst} % USt`)}${rest(euro(a.ust))}</p><p class="o-gesamt">${rest("Gesamt")}</p><p class="o-gross"><span class="o-steigt">${esc(euro(a.brutto))}</span></p></div>`;
}
// Schrift des Angebots so groß wie die Bühne erlaubt, die Summe so breit wie die Spalte.
function zielEinpassen(buehne) {
  const z = buehne.ziel; const gross = $(".o-gross", z); const rechts = $(".o-rechts", z);
  const H = z.clientHeight; const breit = innerWidth >= 1100;
  z.classList.toggle("ohne-satz", H < 372 && !breit);
  z.classList.toggle("ohne-neben", H < 300 && !breit);
  z.style.setProperty("--g", "100px");
  z.style.setProperty("--z", "14px");
  const w100 = $(".o-steigt", gross).offsetWidth;
  const g = Math.min((rechts.clientWidth / w100) * 100 * 0.985, H * (breit ? 0.62 : 0.3));
  z.style.setProperty("--g", g.toFixed(1) + "px");
  z.classList.add("eng");
  const titel = $$(".o-titel", z);
  const passtHin = () => z.scrollHeight <= H + 1 && z.scrollWidth <= z.clientWidth + 1 && titel.every((t) => t.scrollWidth <= t.clientWidth + 1);
  let lo = 11, hi = breit ? 40 : 26;
  for (let i = 0; i < 7; i++) {
    const m = (lo + hi) / 2;
    z.style.setProperty("--z", m.toFixed(2) + "px");
    if (passtHin()) lo = m; else hi = m;
  }
  z.style.setProperty("--z", lo.toFixed(2) + "px");
  // Kleine Handy-Höhen: erst die Summe etwas kleiner, dann die Nebenzeilen weglassen. Nie abschneiden.
  let summe = g;
  for (let i = 0; i < 5 && z.scrollHeight > H + 1; i++) { summe *= 0.92; z.style.setProperty("--g", summe.toFixed(1) + "px"); }
  if (z.scrollHeight > H + 1) z.classList.add("ohne-neben");
  if (!passtHin()) z.classList.remove("eng"); // sehr langer gesprochener Name darf umbrechen
}

/* ---------- Erster Bildschirm ---------- */
const held = $(".held");
const bue = new Buehne($("#buehne"), { max: innerWidth < 700 ? 150 : 250 });
const tabs = $$(".tab[data-i]");
const pauseKnopf = $("#pause");
const mikro = $("#mikro"), mikroTitel = $("#mikro-titel"), mikroUnter = $("#mikro-unter");
const tippen = $("#tippen"), satzFeld = $("#satz"), tippenText = $("#tippen-text");
let aktiv = 0, auto = !ruhig, spiel = 0, heldSichtbar = true, wartet = false;

function tinte(c) {
  const r = document.documentElement.style;
  r.setProperty("--f", c.f); r.setProperty("--i", c.i);
  $('meta[name="theme-color"]').content = c.f;
}
function farbe(i, ursprung) {
  const c = FARBEN[BEISPIELE[i].id];
  if (ruhig || !ursprung) { tinte(c); held.style.setProperty("--feld", c.f); return; }
  const r = held.getBoundingClientRect(), o = ursprung.getBoundingClientRect();
  const x = o.left + o.width / 2 - r.left, y = o.top + o.height / 2 - r.top;
  const d = 2 * Math.hypot(Math.max(x, r.width - x), Math.max(y, r.height - y));
  const w = document.createElement("div");
  w.className = "welle"; w.style.left = x + "px"; w.style.top = y + "px"; w.style.background = c.f;
  $(".held-feld").append(w);
  const a = w.animate([{ transform: "translate(-50%,-50%) scale(.02)" }, { transform: `translate(-50%,-50%) scale(${(d / 240).toFixed(2)})` }], { duration: 640, easing: "cubic-bezier(.45,0,.15,1)", fill: "forwards" });
  setTimeout(() => tinte(c), 300);
  a.finished.then(() => { held.style.setProperty("--feld", c.f); w.remove(); }).catch(() => w.remove());
}
function markiere(i) { tabs.forEach((t) => t.setAttribute("aria-pressed", String(+t.dataset.i === i))); }

async function beispiel(i, { ursprung = null } = {}) {
  const s = ++spiel;
  hoerenAus(); tippen.hidden = true; mikro.hidden = false;
  aktiv = i; markiere(i);
  const b = BEISPIELE[i];
  bue.abbruch();
  if (auto) bue.ziel.removeAttribute("aria-live"); else bue.ziel.setAttribute("aria-live", "polite");
  farbe(i, ursprung);
  bue.ziel.innerHTML = angebotHTML(b);
  zielEinpassen(bue);
  blattZeigen(b);
  if (ruhig) { bue.fertig(); return; }
  await warte(ursprung ? 340 : 120);
  if (s !== spiel) return;
  if (!(await bue.sprich(b.satz)) || s !== spiel) return;
  await warte(260);
  if (s !== spiel) return;
  if (!(await bue.sortiere()) || s !== spiel) return;
  if (!auto) return;
  await warte(4800);
  if (s !== spiel || !auto) return;
  weiter();
}
function weiter() {
  if (!heldSichtbar || document.hidden) { wartet = true; return; }
  wartet = false;
  const n = (aktiv + 1) % BEISPIELE.length;
  beispiel(n, { ursprung: tabs[n] });
}
function autoAus() {
  auto = false;
  pauseKnopf.classList.add("steht");
  pauseKnopf.setAttribute("aria-label", "Beispiele weiterlaufen lassen");
}

tabs.forEach((t) => t.addEventListener("click", () => { autoAus(); beispiel(+t.dataset.i, { ursprung: t }); }));
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
  const n = (aktiv + (dx < 0 ? 1 : -1) + BEISPIELE.length) % BEISPIELE.length;
  beispiel(n, { ursprung: tabs[n] });
});
bue.el.addEventListener("pointercancel", () => { wischX = null; });

/* ---------- Selbst sprechen ---------- */
let stopp = null, zuletzt = "", stilleUhr = null, leerUhr = null, balken = [];

function balkenAn() {
  if (ruhig) return;
  balken = $$(".welle-balken i", mikro).map((b, i) => b.animate(
    [{ transform: "scaleY(.15)" }, { transform: `scaleY(${[0.55, 0.95, 0.7, 1, 0.5][i]})` }, { transform: "scaleY(.2)" }],
    { duration: 620 + i * 90, iterations: Infinity, easing: "ease-in-out" }));
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
    bue.el.classList.remove("fertig");
    const hilfe = "Da fehlen noch Menge und Preis. Sagen Sie zum Beispiel: " + BEISPIELE[aktiv].satz;
    mikroUnter.textContent = "Noch einmal tippen und sprechen";
    tippenText.textContent = hilfe;
    if (mikro.classList.contains("tippt")) tippen.hidden = false;
    bue.text(hilfe);
    return;
  }
  bue.ziel.setAttribute("aria-live", "polite");
  bue.ziel.innerHTML = angebotHTML({ ...e, satz: text, wer: "" }, { frei: true, getippt: !tippen.hidden });
  zielEinpassen(bue);
  if (ruhig) { bue.fertig(); return; }
  if (!bue.toks.length) bue.text(text);
  await warte(160);
  if (s !== spiel) return;
  await bue.sortiere();
}
function tippenZeigen(grund) {
  hoerenAus();
  mikro.classList.add("tippt");
  mikroTitel.textContent = "Selbst tippen"; mikroUnter.textContent = "Die Wörter erscheinen genauso groß";
  tippenText.textContent = grund === "kein-mikrofon"
    ? "Das Mikrofon ist hier nicht frei. Tippen Sie Ihren Satz, die Wörter erscheinen oben."
    : grund === "still"
      ? "Es kam nichts an. Tippen Sie Ihren Satz, die Wörter erscheinen oben."
      : "Tippen Sie Ihren Satz. Die Wörter erscheinen oben.";
  mikro.hidden = true; tippen.hidden = false;
  spiel++; bue.abbruch();
  satzFeld.value = "";
  bue.text("Tippen Sie los.");
  zuletzt = "";
  satzFeld.focus({ preventScroll: false });
}
function hoerenStart() {
  autoAus(); spiel++;
  if (!spracheMoeglich()) { tippenZeigen("nicht-unterstuetzt"); return; }
  bue.abbruch();
  zuletzt = "";
  bue.text("Sprechen Sie jetzt.");
  mikro.classList.add("hoert"); mikro.setAttribute("aria-pressed", "true");
  mikroTitel.textContent = "Fertig"; mikroUnter.textContent = "Kunde, Leistung, Menge, Preis";
  balkenAn();
  leerUhr = setTimeout(() => { if (!zuletzt) tippenZeigen("still"); }, 9000);
  stopp = sprechen({
    beiText(fest, zwischen) {
      const t = [fest, zwischen].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
      if (!t) return;
      if (!zuletzt) bue.abbruch();
      zuletzt = t; bue.text(t);
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
  zuletzt = t;
  spiel++;
  bue.el.classList.remove("fertig");
  if (t) bue.text(t); else { bue.abbruch(); bue.text("Tippen Sie los."); }
});
tippen.addEventListener("submit", (e) => {
  e.preventDefault();
  if (satzFeld.value.trim()) { satzFeld.blur(); freierSatz(satzFeld.value.trim()); }
});
satzFeld.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); tippen.requestSubmit(); } });
if (!spracheMoeglich()) { mikro.classList.add("tippt"); mikroTitel.textContent = "Selbst tippen"; mikroUnter.textContent = "Die Wörter erscheinen genauso groß"; }

/* ---------- Gleicher Sprung von anderen Stellen ---------- */
$$(".w-an").forEach((w) => w.addEventListener("click", () => {
  autoAus();
  held.scrollIntoView({ behavior: ruhig ? "auto" : "smooth" });
  const i = +w.dataset.i;
  setTimeout(() => beispiel(i, { ursprung: tabs[i] }), ruhig ? 0 : 450);
}));
$$("[data-mikro]").forEach((a) => a.addEventListener("click", () => setTimeout(() => { if (!stopp) mikro.hidden ? satzFeld.focus() : mikro.focus(); }, 500)));

/* ---------- Das Blatt folgt dem Beispiel ---------- */
function blattZeigen(b) {
  const s = $("#blatt-seite");
  $(".b-abs", s).textContent = "Beispiel: " + b.wer;
  $(".b-an", s).textContent = b.kunde;
  const zeilen = b.positionen.map((p) => `<tr><td>${esc(p.titel)}</td><td>${p.einheit === "pauschal" ? "pauschal" : esc(p.menge + " " + (p.einheit === "Person" && p.menge !== 1 ? "Personen" : p.einheit))}</td><td class="r-b">${euro(p.preis)}</td><td class="r-b">${euro(p.summe)}</td></tr>`).join("");
  $("tbody", s).innerHTML = zeilen;
  const fuss = $$("tfoot td.r-b", s);
  fuss[0].textContent = euro(b.netto); fuss[1].textContent = euro(b.ust); fuss[2].textContent = euro(b.brutto);
  $("tfoot tr:nth-child(2) td", s).textContent = `zzgl. ${b.mwst} % USt`;
}

/* ---------- Ab hier: dieselbe Bewegung auf der ganzen Seite ---------- */
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
  const endText = h.textContent.replace(/\u00a0/g, " ").trim();
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
    const dauer = 720, halten = 760;
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
        { transform: von, offset: halten / (halten + dauer), easing: "cubic-bezier(.76,0,.24,1)" },
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
      e.animate([{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: halten + dauer * 0.35, fill: "both" });
    });
    await warte(halten + dauer + 40);
    fuell.forEach((e) => e.remove());
    h.innerHTML = roh;
  }, 0.35);
}
$$("[data-satz]").forEach(schnurren);

// Die Branchen sortieren sich aus einem Durcheinander zur Wand.
if (!ruhig) {
  const wand = $("#wand"); const w = $$(".w", wand);
  w.forEach((e) => e.setAttribute("data-kommt", ""));
  beimSehen(wand, () => {
    w.forEach((e, i) => {
      e.classList.add("lief");
      const dx = (Math.sin(i * 12.9898) * 43758.5453 % 1) * 180, dy = (Math.sin(i * 78.233) * 12543.1 % 1) * 140;
      e.animate([{ opacity: 0, transform: `translate(${dx.toFixed(0)}px,${dy.toFixed(0)}px)` }, { opacity: 1, transform: "none" }], { duration: 760, delay: (i * 7) % 11 * 34, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" });
    });
  }, 0.1);
  $$(".verben details, .fragen details").forEach((d, i) => {
    beimSehen(d, () => {
      d.classList.add("lief");
      d.animate([{ opacity: 0, transform: "translateY(24px)" }, { opacity: 1, transform: "none" }], { duration: 620, delay: (i % 8) * 50, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" });
    }, 0.1);
  });
  // Die Zeilen fliegen aufs Blatt.
  const seite = $("#blatt-seite");
  beimSehen(seite, () => {
    $$("tbody tr, tfoot tr, .b-kopf, .b-an, .b-titel, .b-gruss, .b-zusage", seite).forEach((e, i) => {
      e.animate([{ opacity: 0, transform: "translateX(36px)" }, { opacity: 1, transform: "none" }], { duration: 560, delay: i * 45, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" });
    });
  }, 0.15);
  $$(".aussage, .alle-text, .preis-test, .schluss-zeile, .fuss-spalten").forEach((e) => {
    e.setAttribute("data-kommt", "");
    beimSehen(e, () => {
      e.classList.add("lief");
      e.animate([{ opacity: 0, transform: "translateY(22px)" }, { opacity: 1, transform: "none" }], { duration: 700, delay: 120, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" });
    }, 0.1);
  });
}

/* ---------- „Stimmen die Zahlen?“ ---------- */
const maler = BEISPIELE[0], zeile1 = maler.positionen[0];
const rechnenEl = $("#rechnen");
const rechnenZiel = $(".ziel", rechnenEl);
const hakenFeld = $("#haken");
function rechnenAufbauen() {
  const [z] = zerlegt(zeile1.preis);
  rechnenZiel.innerHTML = `<p class="z-titel">${worteAlsTeile(zeile1.titel)}</p><p class="z-rechnung">${teil(String(zeile1.menge), zeile1.menge)} ${teil(zeile1.einheit)} ${rest("×")} ${teil(z, zeile1.preis)} ${teil("€")}</p><p class="z-summe">${rest("=")} <b class="r">${esc(euro(zeile1.summe))}</b></p>`;
}
rechnenAufbauen();
const rechnen = new Buehne(rechnenEl, { max: 90, tempo: 190 });
const satzZeile = maler.satz.split(". ")[0].replace(/^Für [^:]+:\s*/, "") + ".";
async function rechnenSpielen() {
  hakenFeld.checked = false;
  rechnen.abbruch();
  if (ruhig) { rechnen.fertig(); return; }
  rechnen.messen();
  if (await rechnen.sprich(satzZeile)) { await warte(240); await rechnen.sortiere({ erkennen: 340 }); }
}
if (ruhig) rechnen.fertig();
else beimSehen(rechnenEl, rechnenSpielen, 0.3);
$("#nochmal").addEventListener("click", rechnenSpielen);
rechnenEl.closest("details").addEventListener("toggle", (e) => { if (e.target.open && !ruhig) rechnenSpielen(); });

/* ---------- „Kann ich das ändern?“ ---------- */
const aKnopf = $("#a-knopf"), aSumme = $("#a-summe"), aWeg = $("#aendern .weg"), aFuss = $("#aendern .a-gesamt");
const ohne = rechne({ ...maler, positionen: [maler.positionen[0]] });
let aRaus = false, aAnim = [];
aKnopf.addEventListener("click", () => {
  aAnim.forEach((a) => a.cancel()); aAnim = [];
  aRaus = !aRaus;
  const h = aWeg.offsetHeight + 6;
  aSumme.textContent = euro(aRaus ? ohne.brutto : maler.brutto);
  aKnopf.textContent = aRaus ? "„Abkleben doch wieder rein.“" : "„Abkleben nehmen wir raus.“";
  if (ruhig) { aWeg.style.opacity = aRaus ? "0" : "1"; aFuss.style.transform = aRaus ? `translateY(-${h}px)` : "none"; return; }
  const opt = { duration: 520, easing: "cubic-bezier(.76,0,.24,1)", fill: "forwards" };
  aAnim.push(aWeg.animate(aRaus ? [{ transform: "none", opacity: 1 }, { transform: "translateX(60%)", opacity: 0 }] : [{ transform: "translateX(60%)", opacity: 0 }, { transform: "none", opacity: 1 }], opt));
  aAnim.push(aFuss.animate(aRaus ? [{ transform: "none" }, { transform: `translateY(-${h}px)` }] : [{ transform: `translateY(-${h}px)` }, { transform: "none" }], opt));
  aAnim.push(aSumme.animate([{ opacity: 0, transform: "translateY(.3em)" }, { opacity: 1, transform: "none" }], { duration: 420, delay: 240, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" }));
});

/* ---------- Preise: Der Satz sortiert sich zur Zeile ---------- */
const tarife = $$(".tarif");
const tarifBue = new Map();
function tarifHole(t) {
  if (!tarifBue.has(t)) tarifBue.set(t, new Buehne($(".buehne", t), { max: 150, tempo: 170 }));
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
  if (ruhig || !spielen) { b.fertig(); return; }
  if (await b.sprich(t.dataset.satzPreis) && l === tarifLauf) { await warte(180); await b.sortiere({ erkennen: 300, flug: 700, maske: false }); }
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
    bue.max = innerWidth < 700 ? 150 : 250;
    bue.abbruch(); bue.messen(); bue.ziel.innerHTML = angebotHTML(BEISPIELE[aktiv]); zielEinpassen(bue); bue.fertig();
    rechnen.fertig();
    tarifBue.forEach((b) => { b.abbruch(); b.messen(); b.fertig(); });
  }, 200);
});

/* ---------- Start ---------- */
async function los() {
  try { await Promise.race([document.fonts.load('900 100px "Archivo"'), warte(1800)]); await document.fonts.ready; } catch { /* Ersatzschrift genügt */ }
  bue.messen();
  beispiel(0);
}
los();

/* ---------- Zugeklappte Antworten rendern nichts ---------- */
$$(".fragen details").forEach((d) => {
  const inhalt = $$(".aendern, .pruef-feld", d);
  const stell = () => inhalt.forEach((e) => { e.hidden = !d.open; });
  d.addEventListener("toggle", stell); stell();
});
