// Shop-Seite je Stadt (24.11.2026, Runde 3; seit 24.11.2026 abends unbegrenzt: keine Stückzahl, kein „ausverkauft“). Reine Funktion
// ohne Speicherzugriff (testbar), benutzt von netlify/functions/gutschein-seite.mjs.
//   • Titel, Beschreibung und Vorschaubild (WhatsApp, Facebook): Fassung nur nach der Uhrzeit (Block <!--og--> … <!--/og-->)
//       angebot  bis 24.12., 16 Uhr                     → „Gutschein für 375 € kaufen, 500 € bekommen“
//       danach   Aktion vorbei (24.12., 16 Uhr)          → „Tattoo-Gutschein zum Verschenken“
//     (Die frühere Fassung „neutral“ bei ausverkauftem 500er/300er entfällt: es gibt keinen Ausverkauf mehr.)
//   • Link der Werbung mit ?g=nr5 (nr1 … nr5): dieses Angebot steht oben, Vorschaubild und og:title bleiben gleich, nur <title> passt
//     zum sichtbaren Hero (In-App-Browser von Instagram/Facebook zeigen ihn oben); ?g=frei: „Tattoo-Gutschein ab 50 €“ (Wertgutschein,
//     ganzjährig kaufbar) oben, ohne Countdown der Aktion (html.frei-oben), Pille „Zum Verschenken“
//   • Hero: Überschrift, Unterzeile und Kopf-Pille wie das Skript der Seite (zeichnen()), html.aus nach der Aktion. Zeile 1 (#h-preis)
//     „Für 375 € kaufen,“, Zeile 2 gold (#h-wert) „500 € bekommen*“, darüber die Pille „Tattoo-Gutschein“, darunter die Bedingung
//     (#hero-fuss). Unter dem Knopf (#hero-klein) steht keine Stückzahl mehr (nur bei ?g=frei „Sofort als PDF per E-Mail“).
//     data-stand am <html> sagt dem Skript, dass die Zahlen schon stimmen (kein Ausblenden bis zum Laden).
//   • Alte Bestandsfelder in den Daten (stueck, verfuegbar, ausverkauft) werden ignoriert.
const NB = " ";
const ZAHL = (c) => (c / 100).toLocaleString("de-DE", { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 });
const EURO = (c) => ZAHL(c) + NB + "€";
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
// „Auch für 200 € kaufen, 300 € bekommen.*“ (Korrektur 24.11.2026 abends): erst der bezahlte Betrag, dann der Wert, gold und fett
// (b.wb), Sternchen zur Bedingung direkt darunter (#hero-fuss bzw. #liste-fuss). Ersetzt „Schon ab 200 € (Wert 300 €).“
// Gleiche Form wie kaufenBekommen() im Skript der Seite (dev/gutschein/seite.html)
// Ohne verschachtelte <span> (setze() unten ersetzt bis zum ersten schließenden Tag): feste Leerzeichen statt span.nb, b.wb bricht nicht um
export const kaufenBekommen = (vor, a) => `${esc([vor, "für", EURO(a.preisCent), "kaufen,"].join(NB))} <b class="wb">${esc(`${EURO(a.wertCent)} bekommen`)}</b>.*`;

export const fassungFuer = (sh) => (sh.aktionOffen ? "angebot" : "danach");

// Titel der Seite (<title>) passend zum sichtbaren Hero; og:title bleibt fest (Vorschau)
export const titelFuer = (t, name) => (t.titelAngebot ? `${t.titelAngebot} · ${name}` : null);

// Texte des Heros (gleiche Regeln wie zeichnen() in dev/gutschein/seite.html)
export function heroTexte(sh, { stadt, heroId = "nr4" }) {
  const ab = [...sh.aktionen].sort((x, y) => x.preisCent - y.preisCent)[0];
  if (heroId === "frei" && sh.frei) {
    // Wertgutschein ohne Bonus (ganzjährig kaufbar): kein Sternchen, keine Bedingung, kein Countdown der Aktion
    return { preis: "Tattoo-Gutschein", wert: `ab ${EURO(sh.frei.minCent)}`, eyebrow: "Zum Verschenken", fuss: false, frei: true, klein: "Sofort als PDF per E-Mail",
      lead: esc(`Für Tattoo oder Piercing in ${stadt}. `) + `<span class="nb">${esc("Betrag frei wählbar.")}</span>`,
      liste: ab ? kaufenBekommen("Schon", ab) : null, titelAngebot: `Tattoo-Gutschein ab ${EURO(sh.frei.minCent)}` };
  }
  // Angebot der Überschrift: der Gutschein aus der Werbung (?g=), sonst der 500er (roh.heroId); unbegrenzt, also immer kaufbar
  const best = sh.aktionen.find((a) => a.id === heroId) || sh.aktionen.find((a) => a.id === "nr4") || ab || null;
  // Unterzeile: „Auch für 200 € kaufen, 300 € bekommen.*“ (der günstigste). Steht der günstigste schon oben (z. B. „Für 200 € kaufen,
  // 300 € bekommen*“ aus der Werbung), nennt sie den größten: „Auch für 1.500 € kaufen, 2.000 € bekommen.*“
  const max = sh.aktionen.filter((a) => !best || a.id !== best.id).sort((x, y) => y.wertCent - x.wertCent)[0];
  const lead = esc(`Für Tattoo oder Piercing in ${stadt}. `) + (max && ab ? kaufenBekommen("Auch", best && best.id === ab.id ? max : ab) : "");
  return {
    preis: best ? `Für ${EURO(best.preisCent)} kaufen,` : null, wert: best ? `${EURO(best.wertCent)} bekommen*` : null, lang: Boolean(best && best.wertCent >= 100000),
    eyebrow: "Tattoo-Gutschein", fuss: true, frei: false, lead, klein: "",
    liste: ab ? kaufenBekommen("Schon", ab) : null,
    titelAngebot: best ? `Gutschein für ${EURO(best.preisCent)} kaufen, ${EURO(best.wertCent)} bekommen` : null,
  };
}

// Inhalt eines Elements mit dieser id ersetzen (nur die festen, bekannten Stellen der eigenen Vorlage)
const setze = (html, id, inhalt, tag) => html.replace(new RegExp(`(<${tag}\\b[^>]*\\bid="${id}"[^>]*>)[\\s\\S]*?(</${tag}>)`), (_, a, b) => a + inhalt + b);

// roh: SEITEN[slug] aus gutschein-seiten-html.mjs; daten: { shop: shopOeffentlich(...), aktiv }; stand: Zeitpunkt (ISO)
// heroId: Angebot aus dem Link der Werbung (?g=nr5), nur wenn es diese Nummer gibt; sonst roh.heroId. Vorschau (og) bleibt fest.
// g=frei: Wertgutschein (Betrag frei wählbar, z. B. Anzeige „Tattoo-Gutschein ab 50 €“) oben, im Kauf-Fenster „Eigener Betrag“ vorgewählt
export const heroAusLink = (sh, g) => (g === "frei" && sh?.frei ? "frei" : typeof g === "string" && /^nr[1-9]$/.test(g) && sh?.aktionen?.some((a) => a.id === g) ? g : null);
export function seiteAnpassen(roh, daten, { stand = new Date().toISOString(), heroId = null } = {}) {
  const sh = daten?.shop;
  // Shop zu oder Studio kann gerade nicht kassieren: Seite unverändert (das Skript zeigt den Grund)
  if (!sh || !sh.offen || !daten.aktiv) return roh.html;
  const fassung = fassungFuer(sh);
  let html = roh.html.replace(/<!--og-->[\s\S]*?<!--\/og-->/, () => roh.og[fassung]);
  const aus = fassung === "danach";
  const t = aus ? null : heroTexte(sh, { stadt: roh.stadt, heroId: heroAusLink(sh, heroId) || roh.heroId });
  const klassen = [aus ? "aus" : "", t?.frei ? "frei-oben" : ""].filter(Boolean).join(" ");
  html = html.replace(/<html lang="de"/, `<html lang="de" data-stand="${esc(stand)}" data-fassung="${fassung}"${klassen ? ` class="${klassen}"` : ""}`);
  if (aus) return html;
  // <title> wie der sichtbare Hero (ohne ?g= gleich dem og:title); Name des Studios aus SEITEN bzw. dem bisherigen Titel
  const name = roh.name || ((/<title>[^<]*·\s*([^<]*)<\/title>/.exec(html) || [])[1] || "").trim();
  const titel = name ? titelFuer(t, name) : null;
  if (titel) html = html.replace(/<title>[^<]*<\/title>/, () => `<title>${esc(titel)}</title>`);
  if (t.wert) { html = setze(html, "h-preis", esc(t.preis), "span"); html = setze(html, "h-wert", esc(t.wert), "span"); }
  // Vierstelliger Wert („2.000 € bekommen*“): etwas kleiner, damit die Zeile am Handy nicht umbricht (wie das Skript der Seite)
  html = html.replace(/<span class="g(?: lang)?" id="h-wert">/, `<span class="g${t.lang ? " lang" : ""}" id="h-wert">`);
  html = setze(html, "hero-pille", esc(t.eyebrow), "span");
  if (!t.fuss) html = html.replace(/(<p\b[^>]*\bid="hero-fuss")/, "$1 hidden");
  html = setze(html, "hero-lead", t.lead, "p");
  // Unter dem Knopf: keine Stückzahl mehr; nur bei ?g=frei ein Satz (sonst bleibt das Feld leer und versteckt)
  if (t.klein) { html = setze(html, "hero-klein", esc(t.klein), "div"); html = html.replace(/(<div\b[^>]*\bid="hero-klein")([^>]*?) hidden>/, "$1$2>"); }
  if (t.liste) html = setze(html, "liste-ab", t.liste, "span");
  return html;
}
