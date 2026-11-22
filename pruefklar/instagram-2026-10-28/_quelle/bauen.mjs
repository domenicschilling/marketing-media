// prüfklar – Instagram-Karussells (27.10.2026). Baut aus den Texten unten 4 Beiträge als PNG (1080 × 1350) + caption.txt.
// Aufruf: node content/pruefklar/instagram-2026-10-28/_quelle/bauen.mjs
// Design: Farben/Schrift/Logo wie prüfklar.de (css/pk.css, marke/). Rot NUR für Kringel und Messwerte.
// Alle Zahlen: vergleich.json (Mini-Studie, Stand 26.10.2026), pakete.json (49 €), Brief/Website (7,9 Mio., jeder Vierte, Statistisches Bundesamt).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require = createRequire("/Users/domi/Marketing-Maschine/package.json");
const { chromium } = require("playwright");

const WEB = "/Users/domi/mm-pk-web/landingpages/pruefklar";
const OUT = "/Users/domi/Marketing-Maschine/content/pruefklar/instagram-2026-10-28";
const FONT = `file://${WEB}/marke/schrift/bricolage-grotesque-latin.woff2`;
const LOGO = `file://${WEB}/marke/wortmarke.svg`;
const LOGO_W = `file://${WEB}/marke/wortmarke-weiss.svg`;

// ---- Zahlen aus den Quellen (nicht von Hand!) ----
const v = JSON.parse(fs.readFileSync(`${WEB}/vergleich.json`, "utf8"));
const pk = JSON.parse(fs.readFileSync(`${WEB}/pakete.json`, "utf8"));
const kompakt = pk.pakete.find((p) => p.id === "kompakt");
const PREIS = `${kompakt.netto_cent / 100} €`; // 49 €
const anteil = (regel) => v.studie.haeufigste.find((h) => h.regel === regel).anteil_pct;
const N = v.n, DURCHSCHNITT = v.durchschnitt, MEDIAN_STELLEN = v.studie.median_stellen;
const STAND = v.stand.split("-").reverse().join("."); // 26.10.2026

// ---- Bausteine ----
const KRINGEL = "M8 22 C 6 8, 34 2, 50 10 C 60 16, 52 32, 30 32 C 14 32, 4 27, 7 15";
const ring = (t, extra = "") => `<span class="ring ${extra}">${t}<svg viewBox="0 0 64 40" preserveAspectRatio="none" aria-hidden="true"><path d="${KRINGEL}" vector-effect="non-scaling-stroke"/></svg></span>`;
const pfeil = (c = "currentColor") => `<svg class="pfeil" viewBox="0 0 48 24" aria-hidden="true"><path d="M2 12h40M31 3l11 9-11 9" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const haken = `<svg class="ic" viewBox="0 0 24 24"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const ICON = {
  lupe: `<svg viewBox="0 0 64 64"><circle cx="27" cy="27" r="16" fill="none" stroke="#000" stroke-width="6"/><path d="M39 39l17 17" stroke="#000" stroke-width="7" stroke-linecap="round"/></svg>`,
  konto: `<svg viewBox="0 0 64 64"><circle cx="32" cy="22" r="11" fill="none" stroke="#000" stroke-width="6"/><path d="M10 56c2-14 11-20 22-20s20 6 22 20" fill="none" stroke="#000" stroke-width="6" stroke-linecap="round"/></svg>`,
  korb: `<svg viewBox="0 0 64 64"><path d="M6 10h10l8 30h28l6-22H20" fill="none" stroke="#000" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="27" cy="52" r="4.5" fill="#000"/><circle cx="49" cy="52" r="4.5" fill="#000"/></svg>`,
  tasse: `<svg viewBox="0 0 160 160"><path d="M38 62h74v36a30 30 0 0 1-30 30H68a30 30 0 0 1-30-30z" fill="#d8c4a0" stroke="#000" stroke-width="6" stroke-linejoin="round"/><path d="M112 74h8a16 16 0 0 1 0 32h-12" fill="none" stroke="#000" stroke-width="6" stroke-linecap="round"/><path d="M60 22c-8 8 8 14 0 24M82 22c-8 8 8 14 0 24" fill="none" stroke="#000" stroke-width="5" stroke-linecap="round"/></svg>`,
  lautsprecher: `<svg viewBox="0 0 160 120"><path d="M14 44h26l34-28v88L40 76H14z" fill="#000"/><path d="M92 40a28 28 0 0 1 0 40M108 26a48 48 0 0 1 0 68M124 12a68 68 0 0 1 0 96" fill="none" stroke="#000" stroke-width="7" stroke-linecap="round"/></svg>`,
};

const CSS = `
@font-face { font-family: "Bricolage Grotesque"; font-weight: 200 800; font-stretch: 75% 100%; src: url("${FONT}") format("woff2"); }
:root { --rot:#e10600; --grau:#575757; --grau-hell:#b8b8b8; --flaeche:#f3f3f0; --linie:#e0e0dc; --sans:"Bricolage Grotesque", sans-serif; }
* { box-sizing: border-box; margin: 0; }
html, body { width: 1080px; height: 1350px; background:#fff; }
body { font-family: var(--sans); font-optical-sizing: auto; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
.s { width:1080px; height:1350px; position:relative; overflow:hidden; padding:84px 90px 0; display:flex; flex-direction:column; }
.hell { background:#fff; color:#000; } .flaeche { background:var(--flaeche); color:#000; } .dunkel { background:#000; color:#fff; }
.kopf { height:54px; display:flex; align-items:center; justify-content:space-between; flex:none; }
.kopf img { height:54px; width:auto; }
.kopf .tag { font-size:30px; font-weight:500; color:var(--grau); letter-spacing:.01em; }
.dunkel .kopf .tag { color:var(--grau-hell); }
.haupt { flex:1; display:flex; flex-direction:column; justify-content:center; padding-bottom:150px; gap:44px; min-height:0; }
.fuss { position:absolute; left:90px; right:90px; bottom:62px; display:flex; justify-content:space-between; align-items:center; font-size:30px; font-weight:500; color:var(--grau); }
.dunkel .fuss { color:var(--grau-hell); }
.fuss .wisch { display:flex; align-items:center; gap:14px; font-weight:600; color:#000; } .dunkel .fuss .wisch { color:#fff; }
.pfeil { width:46px; height:23px; }
.kick { font-size:38px; font-weight:600; letter-spacing:.01em; color:var(--grau); }
.dunkel .kick { color:var(--grau-hell); }
h1, h2 { font-weight:800; font-stretch:75%; font-variation-settings:"opsz" 72; letter-spacing:.004em; line-height:.96; text-wrap:balance; }
h1 { font-size:142px; } h2 { font-size:120px; }
h2.m { font-size:104px; } h2.k { font-size:92px; }
.t { font-size:48px; line-height:1.3; font-weight:450; font-stretch:92%; text-wrap:pretty; }
.t b { font-weight:700; }
.klein { font-size:31px; line-height:1.35; color:var(--grau); font-weight:450; }
.dunkel .klein { color:var(--grau-hell); }
.ring { position:relative; display:inline-block; white-space:nowrap; padding:0 .3em; margin:0 -.3em; }
.ring svg { position:absolute; left:-15%; top:-50%; width:130%; height:210%; overflow:visible; pointer-events:none; }
.ring svg path { fill:none; stroke:var(--rot); stroke-width:8px; stroke-linecap:round; }
.rot { color:var(--rot); }
.nb { white-space:nowrap; }
.chips { display:flex; flex-direction:column; gap:22px; }
.chip { display:flex; align-items:center; gap:22px; border:4px solid #000; border-radius:22px; padding:24px 30px; font-size:42px; line-height:1.18; font-weight:600; background:#fff; }
.chip .a { font-weight:800; font-stretch:75%; font-size:54px; min-width:104px; }
.chip.grau { background:var(--flaeche); border-color:#000; }
.chip .pfeil { flex:none; }
.karte { background:#fff; border-radius:30px; box-shadow:0 2px 4px rgba(0,0,0,.08), 0 30px 60px -28px rgba(0,0,0,.4); }
.flaeche .karte { box-shadow:0 2px 4px rgba(0,0,0,.08), 0 30px 60px -28px rgba(0,0,0,.35); }
.bsp { font-size:28px; color:var(--grau); font-weight:500; margin-top:18px; }
.zeile2 { display:grid; grid-template-columns:1fr; gap:30px; }
.block { border-top:4px solid #000; padding-top:22px; }
.dunkel .block { border-top-color:#fff; }
.block h3 { font-size:36px; font-weight:700; letter-spacing:.01em; margin-bottom:10px; }
.block .t { font-size:44px; line-height:1.25; }
.blase { position:relative; background:#000; color:#fff; border-radius:26px; padding:20px 34px; font-size:50px; font-weight:700; font-stretch:90%; display:inline-block; }
.dunkel .blase { background:#fff; color:#000; }
.blase::after { content:""; position:absolute; left:34px; top:-18px; border:18px solid transparent; border-top:0; border-bottom-color:#000; }
.dunkel .blase::after { border-bottom-color:#fff; }
.stat { display:flex; flex-direction:column; gap:6px; border-top:4px solid #fff; padding-top:20px; }
.stat .z { font-weight:800; font-stretch:75%; font-size:178px; line-height:.9; letter-spacing:-.01em; }
.stat .z small { font-size:70px; font-weight:700; letter-spacing:0; margin-left:10px; }
.stat .e { font-size:44px; font-weight:500; line-height:1.2; color:#fff; }
.cta-url { font-weight:800; font-stretch:75%; font-size:150px; line-height:.92; letter-spacing:-.012em; }
.link-im-profil { display:inline-flex; align-items:center; gap:26px; border:5px solid #fff; border-radius:999px; padding:20px 50px; font-size:62px; font-weight:700; font-stretch:90%; }
`;

const seite = (cls, kopfTag, haupt, { nr, gesamt, wisch = false, fuss = "prüfklar.de", gap = 44, start = false } = {}) => {
  const dunkel = cls.includes("dunkel");
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><title>prüfklar</title><style>${CSS}</style></head><body>
<div class="s ${cls}"><div class="kopf"><img src="${dunkel ? LOGO_W : LOGO}" alt="prüfklar"></div>
<div class="haupt" style="gap:${gap}px${start ? ";justify-content:flex-start;padding-top:44px" : ""}">${haupt}</div>
<div class="fuss"><span>${fuss}</span>${wisch ? `<span class="wisch">Wischen ${pfeil()}</span>` : `<span>${nr} / ${gesamt}</span>`}</div></div></body></html>`;
};

// Schluss-Folie (immer gleich): Kurz-Check + „Link im Profil“
const cta = (nr, gesamt) =>
  seite("dunkel", "", `<div class="kick">Kostenlos · ohne Anmeldung</div>
<h1 style="font-size:132px">Kostenloser ${ring("Kurz-Check", "")} auf <span class="nb">prüfklar.de</span></h1>
<div class="t">Adresse Ihres Shops eingeben, Ergebnis ansehen. Mit einem Tipp zu jeder Stelle.</div>
<div><span class="link-im-profil">Link im Profil ${pfeil("#fff")}</span></div>
<div class="klein">Technische Prüfung, keine Rechtsberatung.</div>`, { nr, gesamt });

// ---- Gezeichnete Beispiele (selbst gemalt, keine echten Shops) ----
const RING_SVG = (ox, oy) => `<svg viewBox="0 0 64 40" preserveAspectRatio="none" style="position:absolute;left:-${ox}px;right:-${ox}px;top:-${oy}px;bottom:-${oy}px;width:calc(100% + ${2 * ox}px);height:calc(100% + ${2 * oy}px);overflow:visible"><path d="${KRINGEL}" vector-effect="non-scaling-stroke" fill="none" stroke="#e10600" stroke-width="8" stroke-linecap="round"/></svg>`;
const kontrastKarte = `<div class="karte" style="padding:36px 44px;width:912px;display:flex;justify-content:space-between;align-items:center">
<div><div style="font-size:46px;font-weight:700">Beispiel-Produkt</div><div style="font-size:34px;color:#6b6b6b;margin-top:6px;white-space:nowrap">Kurze Beschreibung</div><div style="font-size:40px;margin-top:10px">9,90 €</div></div>
<div style="position:relative;background:#d8c4a0;color:#fff;border-radius:14px;font-size:38px;font-weight:700;padding:26px 30px;margin-right:60px;white-space:nowrap">In den Warenkorb${RING_SVG(56, 34)}</div></div>`;
const kopfLeiste = (mitRing = false, texte = false) => {
  const it = (ic, t) => `<div style="display:flex;flex-direction:column;align-items:center;gap:10px"><div style="width:84px;height:84px">${ICON[ic]}</div>${texte ? `<div style="font-size:30px;font-weight:600">${t}</div>` : ""}</div>`;
  return `<div class="karte" style="padding:34px 44px;width:912px;display:flex;align-items:center;justify-content:space-between;position:relative">
<div style="font-size:50px;font-weight:800;font-stretch:75%">Ihr Shop</div>
<div style="display:flex;gap:54px;position:relative">${it("lupe", "Suche")}${it("konto", "Konto")}${it("korb", "Warenkorb")}
${mitRing ? `<svg viewBox="0 0 64 40" preserveAspectRatio="none" style="position:absolute;left:-46px;right:-46px;top:-34px;bottom:-34px;width:calc(100% + 92px);height:calc(100% + 68px);overflow:visible"><path d="${KRINGEL}" vector-effect="non-scaling-stroke" fill="none" stroke="#e10600" stroke-width="8" stroke-linecap="round"/></svg>` : ""}</div></div>`;
};

const bildKarte = `<div class="karte" style="padding:30px 44px;width:912px;display:flex;align-items:center;gap:44px">
<div style="width:210px;height:210px;background:var(--flaeche);border-radius:20px;display:flex;align-items:center;justify-content:center;position:relative;margin-left:20px"><div style="width:160px">${ICON.tasse}</div>${RING_SVG(30, 22)}</div>
<div><div style="font-size:46px;font-weight:700">Beispiel-Produkt</div><div style="font-size:34px;color:#6b6b6b;margin-top:6px">Kurze Beschreibung · 9,90 €</div></div></div>`;

// ---- Beiträge ----
const HASH = (...extra) => ["#barrierefreiheit", "#bfsg", "#onlineshop", ...extra].join(" ");
const beitraege = [];

// 0 ─────────────────────────────────────────────────────────────
{
  const G = 7;
  const treppe = `<svg viewBox="0 0 912 300" style="width:912px;height:300px"><g fill="#000"><rect x="40" y="240" width="90" height="40"/><rect x="130" y="200" width="90" height="80"/><rect x="220" y="160" width="90" height="120"/><rect x="310" y="120" width="90" height="160"/></g>
<path d="M520 280 L860 280 L860 120 Z" fill="#d9d9d4" stroke="#000" stroke-width="6" stroke-linejoin="round"/><rect x="860" y="116" width="10" height="164" fill="#000"/>
<text x="40" y="112" font-family="Bricolage Grotesque" font-size="40" font-weight="700" fill="#575757">Treppe</text><text x="520" y="112" font-family="Bricolage Grotesque" font-size="40" font-weight="700" fill="#000">Rampe</text></svg>`;
  const reihe = (n, ic, t) => `<div style="display:flex;align-items:center;gap:30px;border-top:4px solid #000;padding:24px 0"><span style="font-weight:800;font-stretch:75%;font-size:64px;width:50px">${n}</span><span style="width:84px;height:84px;flex:none;display:flex;align-items:center;justify-content:center">${ic}</span><span style="font-size:46px;line-height:1.15;font-weight:600">${t}</span></div>`;
  const icAa = `<svg viewBox="0 0 84 84" width="84" height="84"><text x="2" y="62" font-family="Bricolage Grotesque" font-weight="800" font-size="64" fill="#000">Aa</text></svg>`;
  const icBild = `<svg viewBox="0 0 84 84" width="84" height="84"><rect x="6" y="14" width="72" height="56" rx="8" fill="none" stroke="#000" stroke-width="6"/><path d="M12 62l20-24 14 16 10-10 16 18" fill="none" stroke="#000" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/><circle cx="56" cy="32" r="6" fill="#000"/></svg>`;
  const icTaste = `<svg viewBox="0 0 84 84" width="84" height="84"><rect x="6" y="18" width="72" height="48" rx="10" fill="none" stroke="#000" stroke-width="6"/><text x="42" y="52" text-anchor="middle" font-family="Bricolage Grotesque" font-weight="800" font-size="28" fill="#000">Tab</text></svg>`;
  const icBlase = `<svg viewBox="0 0 84 84" width="84" height="84"><path d="M10 16h64a6 6 0 0 1 6 6v30a6 6 0 0 1-6 6H40L22 74V58H10a6 6 0 0 1-6-6V22a6 6 0 0 1 6-6z" fill="#000"/><path d="M22 37h40" stroke="#fff" stroke-width="6" stroke-linecap="round"/></svg>`;
  const wer = ["Ältere Kunden", "Menschen mit schlechten Augen", "Kunden mit Vorleseprogramm", "Wer sich die Hand verletzt hat", "Wer am Handy in der Sonne bestellt"];
  beitraege.push({
    ordner: "00-was-ist-barrierefrei",
    titel: "Was heißt eigentlich „barrierefrei“ im Internet?",
    folien: [
      seite("dunkel", "", `<div class="kick">Einfach erklärt</div><h1 style="font-size:128px">Was heißt eigentlich ${ring("„barrierefrei“")} im Internet?</h1><div class="t">Mit Beispielen aus dem Alltag. Für jeden verständlich.</div>`, { wisch: true }),
      seite("hell", "", `<div class="kick">Das kennen wir aus dem Alltag</div><h2 class="m">Eine Rampe neben der Treppe.</h2>${treppe}<div class="t">So kommt jeder ins Haus – mit Rollator, Kinderwagen oder Koffer. Im Internet gibt es das auch.</div>`, { nr: 2, gesamt: G, gap: 34 }),
      seite("hell", "", `<div class="kick">Im Onlineshop heißt das:</div><div>${reihe(1, icAa, "Schrift, die man gut lesen kann")}${reihe(2, icBlase, "Knöpfe mit Namen fürs Vorleseprogramm")}${reihe(3, icTaste, "Bedienung auch ohne Maus")}${reihe(4, icBild, "Bilder mit Beschreibung")}<div style="border-top:4px solid #000"></div></div>`, { nr: 3, gesamt: G, gap: 34 }),
      seite("flaeche", "", `<div class="kick">Wer davon profitiert</div><div>${wer.map((w) => `<div style="border-top:4px solid #000;padding:20px 0;font-size:50px;font-weight:600;line-height:1.15">${w}</div>`).join("")}<div style="border-top:4px solid #000"></div></div><h2 class="k" style="font-size:96px">Irgendwann: wir alle.</h2>`, { nr: 4, gesamt: G, gap: 34 }),
      seite("hell", "", `<div class="kick">Warum es Ihnen nützt</div><h2 class="m">Mehr Kunden kommen bis zur Kasse.</h2><div class="t">Wer eine Seite nicht lesen oder bedienen kann, kauft woanders.</div>
<div class="block"><h3>Und das Gesetz?</h3><div class="t" style="font-size:38px;line-height:1.28">Seit 28. Juni 2025 gilt das BFSG für viele Onlineshops mit Privatkunden. Ausgenommen sind Kleinstunternehmen und reine Firmenkunden-Shops.</div></div><div class="klein">Kleinstunternehmen: weniger als 10 Beschäftigte und höchstens 2 Mio. € Jahresumsatz oder Bilanzsumme. § 1 Abs. 3 Nr. 5, § 3 Abs. 3 BFSG. Ob es Sie betrifft, beurteilen wir nicht. Keine Rechtsberatung.</div>`, { nr: 5, gesamt: G, gap: 30 }),
      seite("dunkel", "", `<div class="kick">Was prüfklar macht</div><h2 class="m">Wir schauen so hin, wie diese Kunden es erleben.</h2><div class="t">Wir sehen uns Ihre Startseite an und zeigen in einfacher Sprache, was man ändern kann.</div>
<div class="chips"><div class="chip" style="background:#000;border-color:#fff;color:#fff"><span class="a">1</span><span>Kostenloser Kurz-Check</span></div><div class="chip" style="background:#000;border-color:#fff;color:#fff"><span class="a">2</span><span>Prüfbericht – nur wenn Sie möchten</span></div></div>`, { nr: 6, gesamt: G, gap: 34 }),
      cta(7, G),
    ],
    caption: `Was heißt eigentlich „barrierefrei“ im Internet?

Stellen Sie sich eine Rampe neben der Treppe vor: So kommt jeder ins Haus. Im Onlineshop heißt das: Schrift, die man gut lesen kann. Knöpfe mit Namen, die ein Vorleseprogramm ansagt. Bedienung auch ohne Maus. Bilder mit Beschreibung.

Davon profitieren ältere Kunden, Menschen mit schlechten Augen, Kunden mit Vorleseprogramm – und jeder, der sich die Hand verletzt hat oder am Handy in der Sonne bestellt. Irgendwann: wir alle. Für Sie heißt das: mehr Kunden kommen bis zur Kasse.

Seit 28. Juni 2025 gilt das BFSG für viele Onlineshops mit Privatkunden. Kleinstunternehmen sind ausgenommen. Keine Rechtsberatung.

Wir schauen Ihre Startseite so an, wie diese Kunden sie erleben. Kostenloser Kurz-Check auf prüfklar.de – Link im Profil.

${HASH("#onlinehandel", "#inklusion", "#webshop")}`,
  });
}

// 1 ─────────────────────────────────────────────────────────────
{
  const G = 7;
  const frage = (n, titel, text, ja, nein, kl = "") =>
    seite("hell", `Frage ${n} von 3`, `<div class="kick">Frage ${n} von 3</div><h2 class="m">${titel}</h2><div class="t">${text}</div>
<div class="chips">${ja}${nein}</div>${kl ? `<div class="klein">${kl}</div>` : ""}`, { nr: n + 1, gesamt: G });
  const chipJa = (t) => `<div class="chip"><span class="a">Ja</span>${pfeil()}<span>${t}</span></div>`;
  const chipNein = (t) => `<div class="chip grau"><span class="a">Nein</span>${pfeil()}<span>${t}</span></div>`;
  beitraege.push({
    ordner: "1-gilt-das-gesetz",
    titel: "Gilt das neue Gesetz für meinen Shop?",
    folien: [
      seite("dunkel", "Barrierefreiheit im Onlineshop", `<div class="kick">Das neue Gesetz, einfach erklärt</div>
<h1 style="font-size:128px">Gilt das neue Gesetz<br>für ${ring("meinen Shop?")}</h1><div class="t">Drei einfache Fragen. Eine ehrliche Antwort.</div>`, { wisch: true }),
      frage(1, "Verkaufen Sie an Privatkunden?", "Das Gesetz schützt Verbraucher. Nur Firmenkunden? Dann ist Ihr Shop nach unserer Lesart nicht erfasst.", chipJa("weiter zu Frage 2"), chipNein("wahrscheinlich nicht betroffen")),
      frage(2, "Kaufen Kunden direkt im Internet bei Ihnen?", "Eine reine Info-Seite ohne Bestellung fällt nach Einschätzung der Bundesfachstelle Barrierefreiheit wohl nicht darunter.", chipJa("weiter zu Frage 3"), chipNein("wahrscheinlich nicht betroffen")),
      frage(3, "Sind Sie ein Kleinstunternehmen?", "Das heißt: weniger als 10 Beschäftigte und höchstens 2 Mio. € Jahresumsatz oder Bilanzsumme.", chipJa("wahrscheinlich nicht betroffen"), chipNein("weiter zum Ergebnis")),
      seite("flaeche", "Das Ergebnis", `<div class="kick">Ihr Ergebnis</div><div class="zeile2">
<div class="block"><h3>Wahrscheinlich nicht betroffen</h3><div class="t">Nur Firmenkunden, keine Bestellung im Internet – oder ein Kleinstunternehmen.</div></div>
<div class="block"><h3>Das Gesetz kann für Sie gelten</h3><div class="t">Privatkunden, Bestellung im Internet und kein Kleinstunternehmen.</div></div></div>
<div class="klein">Seit 28. Juni 2025 gilt das Barrierefreiheitsstärkungsgesetz (BFSG). Fundstellen: § 1 Abs. 3 Nr. 5 und § 3 Abs. 3 BFSG.</div>`, { nr: 5, gesamt: G }),
      seite("hell", "Ehrlich gesagt", `<h2 class="m">Ob es Sie betrifft, beurteilen wir nicht.</h2>
<div class="t">Das ist eine technische Information, keine Rechtsberatung. Bei Grenzfällen berät die Bundesfachstelle Barrierefreiheit Kleinstunternehmen kostenlos.</div>
<div class="t"><b>Unabhängig davon:</b> Jede Hürde in einem Shop kostet Kunden.</div>`, { nr: 6, gesamt: G }),
      cta(7, G),
    ],
    caption: `Gilt das neue Barrierefreiheitsgesetz für Ihren Onlineshop? Seit dem 28. Juni 2025 gilt das BFSG für viele Shops, die an Privatkunden verkaufen. Es trifft aber nicht jeden: Kleinstunternehmen (weniger als 10 Beschäftigte und höchstens 2 Mio. € Jahresumsatz oder Bilanzsumme) sind ausgenommen, ebenso reine Firmenkunden-Shops.

Drei einfache Fragen helfen bei der ersten Einordnung:
1. Verkaufen Sie an Privatkunden?
2. Kaufen Kunden direkt über Ihre Website?
3. Sind Sie ein Kleinstunternehmen?

Die Folien zeigen auch, wann Ihr Shop wahrscheinlich nicht betroffen ist. Ob das Gesetz für Sie gilt, beurteilen wir nicht – das ist eine technische Information, keine Rechtsberatung.

Wo Kunden im eigenen Shop nicht weiterkommen, zeigt der kostenlose Kurz-Check auf prüfklar.de. Link im Profil.

${HASH("#onlinehandel", "#shopbetreiber", "#webshop")}`,
  });
}

// 2 ─────────────────────────────────────────────────────────────
{
  const G = 6;
  const stelle = (n, proz, titel, mock, erlebt, behoben) =>
    seite("hell", `Stelle ${n} von 3`, `<div class="kick">Stelle ${n} von 3 · <span class="rot" style="font-weight:800">${proz} %</span> der geprüften Startseiten</div>
<h2 class="k">${titel}</h2><div>${mock}<div class="bsp" style="margin-top:14px;font-size:26px">Gezeichnetes Beispiel, kein echter Shop</div></div>
<div class="zeile2" style="gap:22px"><div class="block"><h3>Das erlebt der Kunde</h3><div class="t">${erlebt}</div></div>
<div class="block"><h3>So beheben Sie es</h3><div class="t">${behoben}</div></div></div>`, { nr: n + 1, gesamt: G, gap: 34, start: true });
  const mockLinks = kopfLeiste(true, false);
  beitraege.push({
    ordner: "2-haeufigste-stellen",
    titel: "Die 3 häufigsten Stellen in Shops",
    folien: [
      seite("dunkel", "Mini-Studie aus echten Prüfdaten", `<div class="kick">Aus ${N} geprüften Startseiten</div>
<h1>Die ${ring("3")} häufigsten Stellen in Onlineshops</h1><div class="t">Was Kunden dabei erleben – und wie einfach man es behebt.</div>`, { wisch: true }),
      stelle(1, anteil("color-contrast"), "Kaum lesbare Schrift", kontrastKarte, "Helle Schrift auf hellem Grund – am Handy in der Sonne kaum zu lesen.", "Schrift etwas dunkler oder Hintergrund heller. <span class='nb'>In der Regel eine kleine Änderung.</span>"),
      stelle(2, anteil("link-name"), "Links ohne Namen", mockLinks, "Das Vorleseprogramm sagt nur „Link“. Wohin er führt, bleibt offen.", "Dem Link einen kurzen, unsichtbaren Namen geben, zum Beispiel „Zum Warenkorb“."),
      stelle(3, anteil("image-alt"), "Bilder ohne Beschreibung", bildKarte, "Das Vorleseprogramm sagt nur „Bild“. Was zu sehen ist, erfährt der Kunde nicht.", "Jedem Bild im Shop-System eine kurze Beschreibung geben – dafür gibt es meist ein eigenes Feld."),
      seite("dunkel", "Die Zahlen dahinter", `<div class="stat"><div class="z">${N}</div><div class="e">geprüfte Startseiten</div></div>
<div class="stat"><div class="z">Ø ${DURCHSCHNITT}<small>von 100 Punkten</small></div><div class="e">im Durchschnitt aller geprüften Startseiten</div></div>
<div class="stat"><div class="z">${MEDIAN_STELLEN}</div><div class="e">Stellen je Startseite in der Mitte aller Shops (Median)</div></div>
<div class="klein">Keine repräsentative Auswahl. Automatische Tests finden nur einen Teil aller Hürden. Quelle: prüfklar-Mini-Studie, Stand ${STAND}, prüfklar.de/studie</div>`, { nr: 5, gesamt: G }),
      cta(6, G),
    ],
    caption: `Die drei häufigsten Stellen, an denen Kunden in Onlineshops nicht weiterkommen – und wie einfach man sie behebt.

Wir haben ${N} Startseiten von Onlineshops in Deutschland automatisch geprüft (keine repräsentative Auswahl). Am häufigsten fanden wir:
1. Zu schwachen Kontrast bei Schrift (${anteil("color-contrast")} % der Startseiten)
2. Links ohne lesbaren Text (${anteil("link-name")} %)
3. Bilder ohne Beschreibung (${anteil("image-alt")} %)

Meist sind die Lösungen überschaubar: Schrift etwas dunkler machen, Links einen kurzen Namen geben, Bildern eine Beschreibung geben. Die Folien zeigen, was Kunden dabei erleben.

Automatische Tests finden nur einen Teil aller Hürden. Technische Prüfung, keine Rechtsberatung. Wie es bei Ihrem Shop aussieht, zeigt der kostenlose Kurz-Check auf prüfklar.de. Link im Profil.

${HASH("#onlinehandel", "#webdesign", "#shopbetreiber")}`,
  });
}

// 3 ─────────────────────────────────────────────────────────────
{
  const G = 7;
  beitraege.push({
    ordner: "3-vorleseprogramm",
    titel: "So erlebt ein Kunde mit Vorleseprogramm Ihren Shop",
    folien: [
      seite("dunkel", "Barrierefreiheit im Onlineshop", `<div class="kick">Eine kleine Hörprobe</div>
<h1 style="font-size:122px">So erlebt ein Kunde mit ${ring("Vorleseprogramm")} Ihren Shop</h1>`, { wisch: true }),
      seite("hell", "Kurz erklärt", `<div style="width:230px">${ICON.lautsprecher}</div><h2 class="m">Was ist ein Vorleseprogramm?</h2>
<div class="t">Wer schlecht oder gar nicht sieht, lässt sich die Seite vorlesen: Überschrift, Text, Link, Knopf – eins nach dem anderen.</div>`, { nr: 2, gesamt: G }),
      seite("flaeche", "Das sehen Ihre Kunden", `<div class="kick">Das sehen Ihre Kunden</div>${kopfLeiste(false, true)}
<div class="t">Suche, Konto, Warenkorb: Auf einen Blick ist alles klar.</div>`, { nr: 3, gesamt: G }),
      seite("dunkel", "Das hört ein Kunde", `<div class="kick">Das hört ein Kunde mit Vorleseprogramm</div>
<div style="display:flex;gap:26px;flex-wrap:wrap"><span class="blase">Link.</span><span class="blase">Link.</span><span class="blase">Link.</span></div>
<h2 class="m">Wofür? Wohin? Ein Rätsel.</h2><div class="t">Die Links haben keinen Namen. Das Programm kann nur „Link“ sagen.</div>`, { nr: 4, gesamt: G }),
      seite("hell", "Mit Namen klingt es so", `<div class="kick">Mit kurzem Namen klingt es so</div>
<div style="display:flex;gap:34px 22px;flex-wrap:wrap"><span class="blase">Suche öffnen.</span><span class="blase">Mein Konto.</span><span class="blase">Zum Warenkorb.</span></div>
<h2 class="m">Der Name ist unsichtbar.</h2><div class="t">Ihr Shop sieht genau gleich aus. <span class='nb'>In der Regel eine kleine Änderung.</span></div>`, { nr: 5, gesamt: G }),
      seite("flaeche", "Warum das zählt", `<div class="kick">Warum das zählt: Ihre Kunden</div>
<div style="display:flex;flex-direction:column;gap:6px"><div style="font-weight:800;font-stretch:75%;font-size:170px;line-height:.9" class="rot">7,9 Mio.</div><div class="t">Menschen in Deutschland haben eine anerkannte Schwerbehinderung, und jeder Vierte ist 60 Jahre oder älter.</div></div>
<div class="t"><b>Wer nicht weiterkommt, kauft woanders.</b></div>
<div class="klein">Quelle: Statistisches Bundesamt, schwerbehinderte Menschen Ende 2023; Bevölkerung nach Altersgruppen 2023.</div>`, { nr: 6, gesamt: G }),
      cta(7, G),
    ],
    caption: `Wie klingt Ihr Onlineshop, wenn man ihn nur hört?

Wer schlecht oder gar nicht sieht, nutzt ein Vorleseprogramm. Es liest die Seite vor, Stück für Stück. Hat ein Link keinen Namen, sagt es nur „Link“ – ob dahinter die Suche, das Konto oder der Warenkorb steckt, bleibt ein Rätsel. Mit einem kurzen, unsichtbaren Namen wie „Zum Warenkorb“ ist es sofort klar. Ihr Shop sieht dabei genau gleich aus, und meist ist es eine kleine Änderung.

Warum das zählt: In Deutschland haben 7,9 Millionen Menschen eine anerkannte Schwerbehinderung, und jeder Vierte ist 60 Jahre oder älter (Quelle: Statistisches Bundesamt, 2023). Wer nicht weiterkommt, kauft woanders.

Wo Kunden in Ihrem Shop hängen bleiben, zeigt der kostenlose Kurz-Check auf prüfklar.de. Link im Profil.

${HASH("#onlinehandel", "#inklusion", "#webshop")}`,
  });
}

// 4 ─────────────────────────────────────────────────────────────
{
  const G = 7;
  const schritt = (n, kopf, titel, text, visual, cls = "hell") =>
    seite(cls, kopf, `<div class="kick">${kopf}</div><h2 class="m">${titel}</h2>${visual}<div class="t">${text}</div>`, { nr: n + 1, gesamt: G });
  const eingabe = `<div class="karte" style="padding:30px 34px;width:912px;border:4px solid #000;box-shadow:none"><div style="display:flex;gap:20px;align-items:center;justify-content:space-between">
<div style="font-size:46px;font-weight:500;color:#6b6b6b;flex:1;border-bottom:4px solid #000;padding-bottom:12px">www.ihr-shop.de</div>
<div style="background:#000;color:#fff;border-radius:16px;padding:22px 30px;font-size:38px;font-weight:700">Kostenlos prüfen</div></div></div>`;
  const punkte = `<div style="display:flex;align-items:baseline;gap:18px"><div style="font-weight:800;font-stretch:75%;font-size:200px;line-height:.9" class="rot">0 bis 100</div><div style="font-size:54px;font-weight:700">Punkte</div></div>`;
  const stellenListe = `<div class="karte" style="width:912px;padding:14px 40px">${["Bilder ohne Beschreibung", "Links ohne lesbaren Text", "Zu schwacher Kontrast bei Schrift"].map((z, i) => `<div style="display:flex;align-items:center;gap:26px;padding:26px 0;${i ? "border-top:3px solid var(--linie)" : ""}"><span style="width:26px;height:26px;border-radius:50%;background:var(--rot);flex:none"></span><span style="font-size:46px;font-weight:600">${z}</span></div>`).join("")}</div><div class="bsp" style="margin-top:-24px">Beispiele für typische Stellen</div>`;
  const bericht = `<div style="display:flex;align-items:flex-end;gap:20px"><div style="font-weight:800;font-stretch:75%;font-size:170px;line-height:.9">ab ${PREIS}</div><div style="font-size:46px;font-weight:600;padding-bottom:12px">netto</div></div>`;
  beitraege.push({
    ordner: "4-kurz-check",
    titel: "So funktioniert der kostenlose Kurz-Check",
    folien: [
      seite("dunkel", "Kostenlos · ohne Anmeldung", `<div class="kick">Schritt für Schritt</div>
<h1>So funktioniert der kostenlose ${ring("Kurz-Check")}</h1><div class="t">Vier Schritte. Den letzten gehen Sie nur, wenn Sie möchten.</div>`, { wisch: true }),
      schritt(1, "Schritt 1", "Adresse Ihres Shops eingeben", "Wir sehen uns nur Ihre Startseite an. Wir bestellen nichts und schicken nichts ab.", eingabe),
      schritt(2, "Schritt 2", "Ergebnis in wenigen Sekunden", "Sie sehen sofort eine Note – von 0 bis 100 Punkten.", punkte, "flaeche"),
      schritt(3, "Schritt 3", "Die Stellen als Liste – kostenlos", "Zu jeder Stelle ein Tipp zum Selbermachen. Ohne Kaufpflicht.", stellenListe),
      schritt(4, "Schritt 4 · nur wenn Sie möchten", "Prüfbericht mit Fotos und Lösungen", "Startseite, eine Produktseite und Warenkorb. Jede Stelle mit Bildschirmfoto, Wichtigkeit und Lösung.", bericht, "flaeche"),
      seite("dunkel", "Geld zurück", `<div class="kick">Beim Prüfbericht</div><h2 class="m">Und wenn er nichts bringt?</h2>
<div class="t">Dann bekommen Sie Ihr Geld zurück: wenn Sie sich innerhalb von 14 Tagen nach der Zahlung melden – ohne Begründung – oder wenn er nichts Neues zeigt.</div>
<div class="klein">Einmal je Firma, solange der Bericht nicht angerechnet wurde. Mehr dazu: prüfklar.de/fragen</div>`, { nr: 6, gesamt: G }),
      cta(7, G),
    ],
    caption: `So funktioniert der kostenlose Kurz-Check für Ihren Onlineshop – in vier Schritten:

1. Sie geben die Adresse Ihres Shops auf prüfklar.de ein. Wir sehen nur Ihre Startseite an und bestellen nichts.
2. Nach wenigen Sekunden sehen Sie eine Note von 0 bis 100 Punkten.
3. Die gefundenen Stellen bekommen Sie kostenlos als Liste, mit einem Tipp zum Selbermachen. Ohne Anmeldung, ohne Kaufpflicht.
4. Nur wenn Sie mehr wissen möchten: der Prüfbericht ab ${PREIS} netto, mit Bildschirmfoto, Wichtigkeit und Lösung zu jeder Stelle.

Beim Prüfbericht gibt es Ihr Geld zurück, wenn Sie sich innerhalb von 14 Tagen nach der Zahlung melden (ohne Begründung) oder er nichts Neues zeigt – einmal je Firma. Technische Prüfung, keine Rechtsberatung.

Kostenloser Kurz-Check auf prüfklar.de – Link im Profil.

${HASH("#onlinehandel", "#shopbetreiber", "#webshop")}`,
  });
}

// ---- Rendern ----
const SPERR = [/abmahn/i, /bußgeld|bussgeld/i, /rechtssicher/i, /garantiert/i, /gesetzeskonform/i, /dringend/i, /frist/i, /mahnung/i, /verstoß|verstoss/i, /sie\s+sind\s+verpflichtet/i, /sie\s+müssen/i, /zertifiziert/i, /100\s*%/, /link in bio/i, /\bbio\b/i];
const nurRendern = process.argv.includes("--check");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
for (const b of beitraege) {
  const dir = path.join(OUT, b.ordner);
  fs.mkdirSync(dir, { recursive: true });
  const alleTexte = b.folien.join(" ").replace(/<style>.*?<\/style>/gs, "").replace(/<[^>]+>/g, " ") + " " + b.caption;
  for (const r of SPERR) if (r.test(alleTexte)) console.error(`SPERRWORT ${r} in ${b.ordner}`);
  const len = b.caption.replace(/\n/g, "\n").length;
  const hashN = (b.caption.match(/#\S+/g) || []).length;
  console.log(`${b.ordner}: ${b.folien.length} Folien, Caption ${len} Zeichen, ${hashN} Hashtags`);
  fs.writeFileSync(path.join(dir, "caption.txt"), b.caption + "\n");
  for (let i = 0; i < b.folien.length; i++) {
    const f = path.join(OUT, "_quelle", `${b.ordner}-folie-${String(i + 1).padStart(2, "0")}.html`);
    fs.writeFileSync(f, b.folien[i]);
    await page.goto("file://" + f);
    await page.evaluate(() => document.fonts.ready);
    // Überlauf-Prüfung: Inhalt darf weder die Fußzeile berühren noch seitlich abgeschnitten werden
    const m = await page.evaluate(() => {
      const h = document.querySelector(".haupt"), fu = document.querySelector(".fuss"), s = document.querySelector(".s");
      const kinder = [...h.children], letzt = kinder[kinder.length - 1].getBoundingClientRect(), erst = kinder[0].getBoundingClientRect();
      return { ende: Math.round(letzt.bottom), anfang: Math.round(erst.top), fuss: Math.round(fu.getBoundingClientRect().top), kopfEnde: Math.round(document.querySelector(".kopf").getBoundingClientRect().bottom), breit: s.scrollWidth, haupt: [Math.round(h.getBoundingClientRect().top), Math.round(h.getBoundingClientRect().bottom)], hs: h.scrollHeight, hc: h.clientHeight };
    });
    if (m.ende > m.fuss - 20 || m.anfang < m.kopfEnde + 10 || m.hs > m.hc + 1) console.error(`  ENG ${b.ordner} Folie ${i + 1}:`, JSON.stringify(m));
    await page.screenshot({ path: path.join(dir, `folie-${String(i + 1).padStart(2, "0")}.png`), clip: { x: 0, y: 0, width: 1080, height: 1350 } });
  }
}
await browser.close();
fs.writeFileSync(path.join(OUT, "_quelle", "beitraege.json"), JSON.stringify(beitraege.map((b) => ({ ordner: b.ordner, titel: b.titel, folien: b.folien.length })), null, 1));
