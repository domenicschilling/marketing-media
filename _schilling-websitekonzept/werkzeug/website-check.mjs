// WEBSITE-CHECK – Schilling Websitekonzept (18.11.2026)
// Prüft eine GANZE Website (alle erreichbaren Unterseiten), nicht nur den ersten Bildschirm.
// Ergänzt `npm run abnahme` (Hero, Geräte) – ersetzt es nicht.
//
//   npm run website-check -- websites/meine-seite            Ordner (wird lokal ausgeliefert)
//   npm run website-check -- https://beispiel.de             Live-Seite (folgt internen Links)
// Optionen:
//   --max 80          höchstens so viele Seiten (Standard 60)
//   --ohne-axe        Barrierefreiheit nicht prüfen (nur für Zwischenstände)
//   --entwurf         [FEHLT]-Marken nur als PRÜFEN statt FEHLER (Vorschau, nicht live)
//   --ohne /login,/start   diese Pfade (samt allem darunter) nicht prüfen – App-Teile einer Website
//                          (Anmeldung, Konto, Admin). Werden im Ergebnis als „ausgelassen“ genannt.
//
// Ergebnis: knappe Textliste, Exit 0 = BESTANDEN, 1 = NICHT BESTANDEN.
// FEHLER = muss vor Live-Gang weg. PRÜFEN = ansehen und bewusst entscheiden.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const opt = { max: 60 };
const ziele = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--ohne-axe") opt.ohneAxe = true;
  else if (a === "--entwurf") opt.entwurf = true;
  else if (a.startsWith("--ohne=")) opt.ohne = a.slice(7);
  else if (a.startsWith("--")) opt[a.slice(2)] = argv[++i];
  else ziele.push(a);
}
if (ziele.length !== 1) {
  console.error("Aufruf: npm run website-check -- <ordner|url> [--max 60] [--ohne-axe] [--entwurf] [--ohne /login,/start]");
  process.exit(2);
}
const ZIEL = ziele[0];
const istUrl = /^https?:\/\//i.test(ZIEL);
const MAX = Number(opt.max) || 60;
// Ausgelassene Pfade: „/login“ trifft /login, /login/ und /login/…
const OHNE = String(opt.ohne || "").split(",").map((p) => p.trim()).filter(Boolean).map((p) => ("/" + p.replace(/^\/+/, "")).replace(/\/+$/, "") || "/");
const ausgelassen = (pfadname) => { const p = pfadname.replace(/\/+$/, "") || "/"; return OHNE.some((o) => o !== "/" && (p === o || p.startsWith(o + "/"))); };
const ausgelasseneSeiten = new Set();

let fehler = 0, warnungen = 0;
const zeilen = [];
const FEHLER = (t) => { fehler++; zeilen.push(`  FEHLER  ${t}`); };
const WARN = (t) => { warnungen++; zeilen.push(`  PRÜFEN  ${t}`); };
const OK = (t) => zeilen.push(`  ok      ${t}`);

const TYPEN = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".xml": "application/xml", ".txt": "text/plain", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".gif": "image/gif", ".mp4": "video/mp4", ".webm": "video/webm", ".woff2": "font/woff2", ".woff": "font/woff", ".ico": "image/x-icon", ".pdf": "application/pdf", ".webmanifest": "application/manifest+json" };
function server(dir) {
  return new Promise((ok) => {
    const s = http.createServer((req, res) => {
      let p = path.join(dir, decodeURIComponent(new URL(req.url, "http://x").pathname));
      if (!p.startsWith(dir)) return res.writeHead(403).end();
      if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, "index.html");
      if (!fs.existsSync(p) && fs.existsSync(p + ".html")) p += ".html";
      if (!fs.existsSync(p)) {
        const nf = path.join(dir, "404.html");
        res.writeHead(404, { "Content-Type": TYPEN[".html"] });
        return fs.existsSync(nf) ? fs.createReadStream(nf).pipe(res) : res.end();
      }
      res.writeHead(200, { "Content-Type": TYPEN[path.extname(p).toLowerCase()] || "application/octet-stream" });
      fs.createReadStream(p).pipe(res);
    }).listen(0, "127.0.0.1", () => ok(s));
  });
}

// Alle .html-Dateien im Ordner (für verwaiste Seiten)
function htmlDateien(dir, basis = dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith(".") || e.name.startsWith("_") || e.name === "node_modules") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) htmlDateien(p, basis, out);
    else if (e.name.endsWith(".html")) out.push("/" + path.relative(basis, p).replace(/index\.html$/, "").replace(/\.html$/, ""));
  }
  return out;
}

// Deutsche und englische Floskeln, die nach KI/Baukasten klingen (Wortliste, kein Urteil – PRÜFEN)
const FLOSKELN = [
  /\bnahtlos/i, /maßgeschneidert/i, /revolutionier/i, /entfessel/i, /ganzheitlich/i, /\binnovative?n?\b/i,
  /auf (das|ein) nächste[sn]? (level|stufe)/i, /in der heutigen (schnelllebigen|digitalen)/i, /tauchen sie ein/i,
  /entdecken sie (die|unsere)/i, /ihr (zuverlässiger|kompetenter) partner/i, /mit leidenschaft/i, /leidenschaft für/i,
  /höchste qualität/i, /wir sind (ihr|dein) partner/i, /lösungen aus einer hand/i, /mehr als nur/i,
  /\bunleash/i, /\bseamless/i, /\belevate/i, /\bempower/i, /cutting[- ]edge/i, /next[- ]level/i, /game[- ]?changer/i,
  /lorem ipsum/i, /dolor sit amet/i,
];
const GESPERRTE_DRITTE = /fonts\.googleapis|fonts\.gstatic|google-analytics|googletagmanager|doubleclick|facebook\.(com|net)|connect\.facebook|youtube\.com|ytimg|maps\.googleapis|maps\.google|gstatic\.com\/maps|instagram\.com|cdninstagram|tiktok|hotjar|clarity\.ms|linkedin/i;
const ERLAUBTE_DRITTE = /umami|plausible/i; // cookielos, im Projekt freigegeben (Umami)

// Läuft im Browser je Seite
function seitenDaten() {
  const t = (s) => (s || "").replace(/\s+/g, " ").trim();
  const meta = (n) => document.querySelector(`meta[name="${n}"],meta[property="${n}"]`)?.getAttribute("content") || "";
  const hs = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => Number(h.tagName[1]));
  let sprung = null;
  for (let i = 1; i < hs.length; i++) if (hs[i] > hs[i - 1] + 1) { sprung = `H${hs[i - 1]}→H${hs[i]}`; break; }
  const links = [...document.querySelectorAll("a[href]")].map((a) => ({ href: a.href, text: t(a.innerText || a.getAttribute("aria-label") || "") }));
  const footer = document.querySelector("footer") || document.body;
  const footerText = [...footer.querySelectorAll("a")].map((a) => t(a.innerText).toLowerCase() + " " + a.getAttribute("href")).join(" | ");
  const nav = document.querySelector("header nav, nav, header");
  const navLinks = nav ? [...nav.querySelectorAll("a[href]")].map((a) => new URL(a.href).pathname.replace(/\/$/, "") || "/").sort() : [];
  const bilder = [...document.images];
  const ohneAlt = bilder.filter((i) => !i.hasAttribute("alt")).map((i) => i.currentSrc.split("/").pop()).slice(0, 3);
  const ohneMasse = bilder.filter((i) => !(i.getAttribute("width") && i.getAttribute("height")) && getComputedStyle(i).aspectRatio === "auto" && !i.closest("picture[style*=aspect]")).length;
  const bodyText = document.body.innerText || "";
  // Gestaltungs-Merkmale (Hinweise, keine Urteile)
  const alle = [...document.querySelectorAll("body *")].slice(0, 4000);
  let verlaufText = 0, glas = 0, lilaVerlauf = 0, fadeKlassen = 0;
  for (const e of alle) {
    const cs = getComputedStyle(e);
    if ((cs.webkitBackgroundClip === "text" || cs.backgroundClip === "text") && cs.backgroundImage.includes("gradient")) verlaufText++;
    if (cs.backdropFilter && cs.backdropFilter !== "none") glas++;
    const bg = cs.backgroundImage;
    if (bg.includes("gradient")) {
      const farben = bg.match(/rgba?\([^)]+\)/g) || [];
      if (farben.some((f) => { const [r, g, b] = f.match(/[\d.]+/g).map(Number); return b > 150 && r > 90 && r < 200 && g < 110; })) lilaVerlauf++;
    }
    if (/(fade-?up|fade-?in|aos|reveal|animate-on-scroll)/i.test(typeof e.className === "string" ? e.className : "") || e.hasAttribute("data-aos")) fadeKlassen++;
  }
  const groessen = new Set(), radien = new Set(), schatten = new Set();
  for (const e of alle) {
    const cs = getComputedStyle(e);
    if (cs.display === "none" || cs.visibility === "hidden") continue;
    if ([...e.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) groessen.add(Math.round(parseFloat(cs.fontSize)));
    if (cs.borderTopLeftRadius !== "0px" && !cs.borderTopLeftRadius.includes("%") && parseFloat(cs.borderTopLeftRadius) < 200) radien.add(Math.round(parseFloat(cs.borderTopLeftRadius)));
    if (cs.boxShadow !== "none") schatten.add(cs.boxShadow.replace(/rgba?\([^)]+\)/g, "c"));
  }
  const fakten = [];
  const reF = /(?:über |mehr als |rund )?\b(\d+(?:[.\s]\d{3})*(?:,\d)?)\+?\s*(Bewertungen|Rezensionen|Kundinnen und Kunden|Kunden|zufriedene|Jahre(?:n)? Erfahrung|Projekte|Tattoos|Küchen|Gäste|Teams?|Studios)/gi;
  for (const m of bodyText.matchAll(reF)) fakten.push([m[2].toLowerCase().replace(/^rezensionen$/, "bewertungen"), m[1].replace(/[.\s]/g, "")]);
  const noten = [...bodyText.matchAll(/(\d,\d)\s*(?:von 5|\/\s*5|Sterne)/g)].map((m) => m[1]);
  const schrift = getComputedStyle(document.body).fontFamily.split(",")[0].replace(/["']/g, "").trim();
  const h1Schrift = document.querySelector("h1") ? getComputedStyle(document.querySelector("h1")).fontFamily.split(",")[0].replace(/["']/g, "").trim() : "";
  const imgs = [...document.querySelectorAll("img")].map((i) => i.currentSrc || i.src);
  return {
    titel: t(document.title), beschreibung: meta("description"), lang: document.documentElement.lang,
    canonical: document.querySelector('link[rel="canonical"]')?.href || "", ogBild: meta("og:image"), ogTitel: meta("og:title"),
    robots: meta("robots"), h1: [...document.querySelectorAll("h1")].map((h) => t(h.innerText)), sprung,
    links, footerText, navLinks, ohneAlt, ohneMasse, bilderAnzahl: bilder.length,
    fehlt: (bodyText.match(/\[FEHLT[^\]]*\]/g) || []).slice(0, 3),
    gedankenstriche: (bodyText.match(/ — /g) || []).length, woerter: bodyText.split(/\s+/).filter(Boolean).length,
    bodyText: bodyText.slice(0, 20000), verlaufText, glas, lilaVerlauf, fadeKlassen, schrift, h1Schrift,
    stockBilder: imgs.filter((s) => /\/\/[^/]*(unsplash|pexels|pixabay|shutterstock|istockphoto|placehold|picsum)\./i.test(s)).map((s) => s.slice(0, 70)),
    stockNamen: imgs.filter((s) => /(unsplash|pexels|pixabay|shutterstock|istock|adobestock|freepik)/i.test(s.split("/").pop())).map((s) => s.split("/").pop().slice(0, 50)),
    kaputteAnker: [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute("href")).filter((h) => h.length > 1 && !document.getElementById(decodeURIComponent(h.slice(1)))).slice(0, 4),
    ueberstand: document.documentElement.scrollWidth > innerWidth + 1,
    favicon: !!document.querySelector('link[rel~="icon"]'),
    groessen: [...groessen], radien: [...radien], schatten: [...schatten], fakten, noten,
  };
}

async function main() {
  const { chromium } = await import("playwright");
  let srv = null, start = ZIEL, ordner = null;
  if (!istUrl) {
    ordner = path.resolve(ZIEL);
    if (!fs.existsSync(path.join(ordner, "index.html"))) { console.error(`kein index.html in ${ZIEL}`); process.exit(2); }
    srv = await server(ordner);
    start = `http://127.0.0.1:${srv.address().port}/`;
  }
  const origin = new URL(start).origin;
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const handy = await browser.newContext({ viewport: { width: 390, height: 664 }, isMobile: true, deviceScaleFactor: 2 });
  let AxeBuilder = null;
  if (!opt.ohneAxe) { try { AxeBuilder = (await import("@axe-core/playwright")).default; } catch { WARN("axe nicht verfügbar – Barrierefreiheit nicht geprüft"); } }

  const norm = (u) => { const x = new URL(u); x.hash = ""; x.search = ""; return x.href.replace(/\/index\.html$/, "/").replace(/\.html$/, ""); };
  const warteschlange = [norm(start)], gesehen = new Set(warteschlange), seiten = [];
  const kaputt = new Map(); // Ziel -> Quelle
  const dritte = new Map(); // Host -> Seite
  const fremdLinks = new Set();

  while (warteschlange.length && seiten.length < MAX) {
    const url = warteschlange.shift();
    const page = await ctx.newPage();
    const anfragen = [];
    page.on("request", (r) => { const h = new URL(r.url()).host; if (new URL(r.url()).origin !== origin && /^https?:/.test(r.url())) anfragen.push(h); });
    let status = 0;
    try { const res = await page.goto(url, { waitUntil: "networkidle", timeout: 30000 }); status = res?.status() || 0; }
    catch (e) { FEHLER(`${pfad(url)} lädt nicht (${e.message.split("\n")[0]})`); await page.close(); continue; }
    if (status >= 400) { kaputt.set(url, kaputt.get(url) || "Start"); await page.close(); continue; }
    const d = await page.evaluate(seitenDaten);
    d.url = url; d.status = status;
    for (const h of new Set(anfragen)) if (!dritte.has(h)) dritte.set(h, pfad(url));
    if (AxeBuilder) {
      try {
        const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
        d.axe = r.violations.filter((v) => ["serious", "critical"].includes(v.impact)).map((v) => `${v.id} (${v.nodes.length}×)`);
      } catch { d.axe = null; }
    }
    await page.close();
    // Handy: seitlicher Überstand
    const hp = await handy.newPage();
    try { await hp.goto(url, { waitUntil: "load", timeout: 30000 }); d.ueberstandHandy = await hp.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1); } catch { d.ueberstandHandy = null; }
    await hp.close();
    seiten.push(d);
    for (const l of d.links) {
      let u; try { u = new URL(l.href); } catch { continue; }
      if (!/^https?:$/.test(u.protocol)) continue;
      if (u.origin !== origin) { fremdLinks.add(u.href); continue; }
      if (/\.(pdf|jpg|jpeg|png|webp|avif|svg|zip|mp4)$/i.test(u.pathname)) continue;
      const n = norm(u.href);
      if (ausgelassen(new URL(n).pathname)) { ausgelasseneSeiten.add(new URL(n).pathname); continue; }
      if (!gesehen.has(n)) { gesehen.add(n); warteschlange.push(n); d._quelle = d._quelle || {}; d._quelle[n] = url; }
    }
  }
  // Quelle kaputter Links nachtragen
  for (const s of seiten) for (const [ziel, q] of Object.entries(s._quelle || {})) if (kaputt.has(ziel)) kaputt.set(ziel, pfad(q));

  function pfad(u) { try { return new URL(u).pathname || "/"; } catch { return u; } }

  // ---------- Auswertung je Seite ----------
  const titel = new Map(), beschr = new Map();
  for (const s of seiten) {
    const p = pfad(s.url);
    if (!s.titel) FEHLER(`${p}: kein <title>`); else titel.set(s.titel, [...(titel.get(s.titel) || []), p]);
    if (s.titel && (s.titel.length < 15 || s.titel.length > 65)) WARN(`${p}: Titel ${s.titel.length} Zeichen („${s.titel.slice(0, 40)}“) – Faustregel 15–65 (Google kürzt nach Breite, keine feste Grenze)`);
    if (!s.beschreibung) FEHLER(`${p}: keine Meta-Beschreibung`); else beschr.set(s.beschreibung, [...(beschr.get(s.beschreibung) || []), p]);
    if (s.beschreibung && (s.beschreibung.length < 70 || s.beschreibung.length > 160)) WARN(`${p}: Meta-Beschreibung ${s.beschreibung.length} Zeichen – Faustregel 70–160 (keine Google-Grenze)`);
    if (!s.lang) FEHLER(`${p}: <html lang> fehlt`);
    if (s.h1.length !== 1) FEHLER(`${p}: ${s.h1.length} H1 (genau eine nötig)`);
    if (s.sprung) WARN(`${p}: Überschriften springen (${s.sprung})`);
    if (!s.canonical) WARN(`${p}: kein canonical`);
    else if (istUrl && new URL(s.canonical).origin !== origin) WARN(`${p}: canonical zeigt auf andere Domain (${s.canonical})`);
    if (!s.ogBild) WARN(`${p}: kein og:image (Linkvorschau in WhatsApp/Instagram leer)`);
    if (s.ohneAlt.length) FEHLER(`${p}: Bilder ohne alt-Attribut (${s.ohneAlt.join(", ")})`);
    if (s.ohneMasse) WARN(`${p}: ${s.ohneMasse} Bild(er) ohne width/height (Springen beim Laden)`);
    if (!/impressum/i.test(s.footerText)) FEHLER(`${p}: kein Link „Impressum“ im Footer`);
    if (!/datenschutz/i.test(s.footerText)) FEHLER(`${p}: kein Link „Datenschutz“ im Footer`);
    if (s.ueberstand || s.ueberstandHandy) FEHLER(`${p}: Inhalt steht seitlich über${s.ueberstandHandy ? " (Handy 390 px)" : ""}`);
    if (s.fehlt.length) (opt.entwurf ? WARN : FEHLER)(`${p}: offene Lücken ${s.fehlt.join(" ")}`);
    if (s.axe === null) WARN(`${p}: axe lief nicht`);
    else if (s.axe?.length) FEHLER(`${p}: Barrierefreiheit ${s.axe.join(", ")}`);
    if (/noindex/i.test(s.robots)) WARN(`${p}: noindex gesetzt (für Vorschau richtig, für Live falsch)`);
    const floskeln = FLOSKELN.filter((re) => re.test(s.bodyText)).map((re) => s.bodyText.match(re)[0]);
    if (floskeln.length) WARN(`${p}: Floskeln ${[...new Set(floskeln)].slice(0, 6).map((f) => `„${f}“`).join(" ")}`);
    if (s.gedankenstriche >= 3) WARN(`${p}: ${s.gedankenstriche}× „ — “ (typisches KI-Satzzeichen, im Deutschen Halbgeviertstrich „ – “)`);
    if (s.verlaufText) WARN(`${p}: ${s.verlaufText}× Verlaufs-Text`);
    if (s.lilaVerlauf) WARN(`${p}: ${s.lilaVerlauf}× lila/blauer Verlauf`);
    if (s.glas > 2) WARN(`${p}: ${s.glas}× Glas-Effekt (backdrop-filter)`);
    if (s.fadeKlassen > 6) WARN(`${p}: ${s.fadeKlassen} Einblend-Animationen beim Scrollen – Bewegung nur mit eigenem Satz`);
    if (s.stockNamen.length) WARN(`${p}: ${s.stockNamen.length} Bild(er) mit Stockfoto-Dateinamen (${s.stockNamen[0]}) – nie als „unser Team/unsere Arbeit“ zeigen`);
    if (s.kaputteAnker.length) FEHLER(`${p}: Sprungmarke ohne Ziel (${s.kaputteAnker.join(", ")})`);
    if (s.stockBilder.length) FEHLER(`${p}: ${s.stockBilder.length} Bild(er) von Stock-/Platzhalter-Diensten (${s.stockBilder[0]})`);
  }
  for (const [t, ps] of titel) if (ps.length > 1) FEHLER(`gleicher Titel auf ${ps.length} Seiten („${t.slice(0, 40)}“: ${ps.slice(0, 4).join(", ")})`);
  for (const [t, ps] of beschr) if (ps.length > 1) FEHLER(`gleiche Meta-Beschreibung auf ${ps.length} Seiten (${ps.slice(0, 4).join(", ")})`);
  const h1s = new Map();
  for (const s of seiten) for (const h of s.h1) h1s.set(h, [...(h1s.get(h) || []), pfad(s.url)]);
  for (const [h, ps] of h1s) if (ps.length > 1) WARN(`gleiche H1 auf ${ps.length} Seiten („${h.slice(0, 40)}“)`);

  // ---------- Seitenübergreifend ----------
  for (const [ziel, q] of kaputt) FEHLER(`kaputter Link ${pfad(ziel)} (verlinkt auf ${q})`);
  const navSaetze = new Map();
  for (const s of seiten) { const k = s.navLinks.join(" "); navSaetze.set(k, (navSaetze.get(k) || 0) + 1); }
  if (navSaetze.size > 2) WARN(`Kopfzeile hat ${navSaetze.size} verschiedene Link-Sätze – Navigation sollte auf allen Seiten gleich sein`);
  const navPunkte = Math.max(0, ...seiten.map((s) => new Set(s.navLinks).size));
  if (navPunkte > 9) WARN(`Kopfzeile mit ${navPunkte} Links – meist reichen 4–7 Punkte plus ein Knopf`);
  const schriften = new Set(seiten.map((s) => s.schrift));
  if ([...schriften].some((f) => /^(inter|roboto|arial|helvetica|system-ui|-apple-system|open sans|poppins|montserrat)$/i.test(f)))
    WARN(`Grundschrift ${[...schriften].join("/")} – Standardwahl vieler Baukästen; nur mit Begründung im Designsystem-Blatt`);
  for (const [h, p] of dritte) {
    if (ERLAUBTE_DRITTE.test(h)) continue;
    (GESPERRTE_DRITTE.test(h) ? FEHLER : WARN)(`Anfrage an ${h} ohne Einwilligung (zuerst auf ${p})`);
  }
  // Designsystem-Disziplin (Vorbilder: 7–11 Schriftgrößen, 2–3 Radien, 0–2 Schatten, gemessen 18.11.2026)
  const alleGr = new Set(seiten.flatMap((s) => s.groessen)), alleRa = new Set(seiten.flatMap((s) => s.radien)), alleSch = new Set(seiten.flatMap((s) => s.schatten));
  if (alleGr.size > 12) WARN(`${alleGr.size} verschiedene Schriftgrößen über die Website (${[...alleGr].sort((a, b) => a - b).join(", ")} px) – Designsystem-Blatt: 7–8 Stufen (beim Relaunch erst nach Umbau der alten CSS erreichbar)`);
  if (alleRa.size > 4) WARN(`${alleRa.size} verschiedene Eckenradien (${[...alleRa].sort((a, b) => a - b).join(", ")} px) – meist reichen 2`);
  if (alleSch.size > 3) WARN(`${alleSch.size} verschiedene Schatten – meist reichen 0–2`);
  // Gleiche Fakten, verschiedene Zahlen (z. B. „über 1800 Bewertungen“ hier, „589 Rezensionen“ dort)
  const faktMap = new Map();
  for (const s of seiten) for (const [k, v] of s.fakten) { const key = k; if (!faktMap.has(key)) faktMap.set(key, new Map()); faktMap.get(key).set(v, pfad(s.url)); }
  for (const [k, werte] of faktMap) if (werte.size > 1) WARN(`„${k}“ mit ${werte.size} verschiedenen Zahlen: ${[...werte].slice(0, 4).map(([v, p]) => `${v} (${p})`).join(", ")} – aus einer Faktenquelle speisen`);
  const alleNoten = new Set(seiten.flatMap((s) => s.noten));
  if (alleNoten.size > 1) WARN(`verschiedene Bewertungsnoten auf der Website: ${[...alleNoten].join(", ")} – Quelle und Stand prüfen`);
  if (!seiten.some((s) => /impressum/i.test(pfad(s.url)))) WARN("keine Impressum-Seite gefunden (Pfad mit „impressum“)");
  if (!seiten.every((s) => s.favicon)) WARN("nicht jede Seite hat ein Favicon");

  // 404, sitemap, robots
  const probe = await ctx.newPage();
  const r404 = await probe.goto(origin + "/gibt-es-nicht-" + Date.now(), { waitUntil: "load" }).catch(() => null);
  if (!r404 || r404.status() !== 404) FEHLER(`Fehlerseite liefert Status ${r404?.status()} statt 404`);
  else if (((await probe.evaluate(() => document.body?.innerText || "")).trim().length) < 20) WARN("404-Seite ist leer – eigene Fehlerseite mit Weg zurück anlegen");
  const sm = await probe.goto(origin + "/sitemap.xml").catch(() => null);
  if (!sm || sm.status() !== 200) WARN("keine sitemap.xml");
  else {
    const xml = await sm.text();
    const fehlen = seiten.filter((s) => !/noindex/i.test(s.robots) && !ausgelassen(pfad(s.url))).map((s) => pfad(s.url)).filter((p) => !xml.includes(p === "/" ? "<loc>" : p));
    if (fehlen.length) WARN(`sitemap.xml ohne ${fehlen.length} Seite(n): ${fehlen.slice(0, 5).join(", ")}`);
  }
  const rb = await probe.goto(origin + "/robots.txt").catch(() => null);
  if (!rb || rb.status() !== 200) WARN("keine robots.txt");
  await probe.close();

  if (ordner) {
    const verlinkt = new Set(seiten.map((s) => pfad(s.url).replace(/\/$/, "") || "/"));
    const waisen = htmlDateien(ordner).map((p) => p.replace(/\/$/, "") || "/").filter((p) => !verlinkt.has(p) && !/404|danke|dank/i.test(p) && !ausgelassen(p));
    if (waisen.length) WARN(`${waisen.length} Seite(n) im Ordner, auf die nichts verlinkt: ${waisen.slice(0, 6).join(", ")}`);
  }

  await browser.close();
  srv?.close();

  // ---------- Ausgabe ----------
  const woerter = seiten.reduce((a, s) => a + s.woerter, 0);
  console.log(`\nWEBSITE-CHECK ${ZIEL}`);
  console.log(`  ${seiten.length} Seite(n) geprüft${seiten.length >= MAX ? ` (Grenze ${MAX} erreicht – mit --max erhöhen)` : ""}, ${woerter} Wörter, ${fremdLinks.size} externe Links (nicht geprüft)`);
  if (OHNE.length) console.log(`  bewusst ausgelassen (--ohne ${OHNE.join(",")}): ${ausgelasseneSeiten.size ? [...ausgelasseneSeiten].slice(0, 8).join(", ") : "nichts davon verlinkt"}`);
  if (!fehler && !warnungen) OK("keine Auffälligkeiten");
  for (const z of zeilen.slice(0, 120)) console.log(z);
  if (zeilen.length > 120) console.log(`  … und ${zeilen.length - 120} weitere Zeilen`);
  console.log(`\n${fehler ? "NICHT BESTANDEN" : "BESTANDEN"} – ${fehler} Fehler, ${warnungen} zu prüfen.\n`);
  process.exit(fehler ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(2); });
