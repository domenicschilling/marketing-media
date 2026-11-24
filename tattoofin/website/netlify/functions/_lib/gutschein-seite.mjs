// Shop-Seite je Stadt aus dem echten Bestand (24.11.2026, Runde 3). Reine Funktion ohne Speicherzugriff (testbar), benutzt von
// netlify/functions/gutschein-seite.mjs. Vorher kam die Seite statisch: Vorschaubild und Titel warben auch dann noch mit
// „500 € für 375 €“, wenn der 500er ausverkauft oder die Aktion vorbei war, und der Hero zeigte das alte Angebot, bis das Skript lief.
//   • Titel, Beschreibung und Vorschaubild (WhatsApp, Facebook): Fassung je Bestand und Uhrzeit (Block <!--og--> … <!--/og-->)
//       angebot  500er und günstigster Gutschein kaufbar          → „500 € Gutschein für 375 €“
//       neutral  500er oder günstigster ausverkauft               → „Tattoo-Gutscheine zum Weihnachtspreis“ (ohne Beträge)
//       danach   Aktion vorbei (24.12., 16 Uhr) oder alles verkauft → „Tattoo-Gutschein zum Verschenken“
//   • Link der Werbung mit ?g=nr5 (nr1 … nr5): dieses Angebot steht oben (solange kaufbar), Vorschaubild bleibt gleich
//   • Hero: Überschrift, Unterzeile, Stückzahl unter dem Knopf und Kopf-Pille wie das Skript der Seite (zeichnen()), html.aus nach
//     der Aktion. data-stand am <html> sagt dem Skript, dass die Zahlen schon stimmen (kein Ausblenden bis zum Laden).
const NB = " ";
const ZAHL = (c) => (c / 100).toLocaleString("de-DE", { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 });
const EURO = (c) => ZAHL(c) + NB + "€";
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function fassungFuer(sh, heroId = "nr4") {
  if (!sh.aktionOffen || sh.aktionen.every((a) => a.ausverkauft)) return "danach";
  const beworben = sh.aktionen.find((a) => a.id === heroId), ab = [...sh.aktionen].sort((x, y) => x.preisCent - y.preisCent)[0];
  return beworben?.ausverkauft || ab?.ausverkauft ? "neutral" : "angebot";
}

// Texte des Heros (gleiche Regeln wie zeichnen() in dev/gutschein/seite.html, ohne „eigene Kasse“, die kennt nur der Browser)
export function heroTexte(sh, { stadt, heroId = "nr4" }) {
  const weg = (a) => a.ausverkauft || !sh.aktionOffen || a.verfuegbar <= 0;
  const l = [...sh.aktionen].sort((x, y) => (y.id === heroId) - (x.id === heroId) || x.preisCent - y.preisCent);
  const best = l.find((a) => !weg(a)) || l.find((a) => !a.ausverkauft) || null;
  const da = sh.aktionen.filter((a) => !a.ausverkauft), ab = [...da].sort((x, y) => x.preisCent - y.preisCent)[0];
  const rest = sh.aktionen.reduce((s, a) => s + a.verfuegbar, 0), alle = sh.aktionen.reduce((s, a) => s + a.stueck, 0);
  // Steht der günstigste schon oben (z. B. „300 € Gutschein für 200 €“ aus der Werbung), nennt die Unterzeile den größten statt „schon ab“
  const max = [...da].sort((x, y) => y.wertCent - x.wertCent)[0];
  const lead = esc(`Für Tattoo oder Piercing in ${stadt}. `) + (da.length <= 1 ? esc("Nur noch dieser Gutschein zum Weihnachtspreis.")
    : best && best.id === ab.id ? `<span class="nb">${esc(`Auch bis ${EURO(max.wertCent)} Wert.`)}</span>`
    : `<span class="nb">${esc(`Schon ab ${EURO(ab.preisCent)} (Wert${NB}${EURO(ab.wertCent)}).`)}</span>`);
  const klein = rest <= 0 || !best || best.verfuegbar <= 0 ? "Gerade sind alle Aktions-Gutscheine reserviert."
    : best.verfuegbar >= best.stueck ? `Nur ${best.stueck}${NB}Stück zu diesem Preis` : `Noch ${best.verfuegbar}${NB}von ${best.stueck}${NB}zu diesem Preis`;
  return {
    wert: best ? `${EURO(best.wertCent)} Gutschein` : null, preis: best ? `für ${EURO(best.preisCent)}` : null, lead, klein,
    liste: ab ? `Schon ab ${EURO(ab.preisCent)} (Wert${NB}${EURO(ab.wertCent)}).` : null,
    pille: rest <= 0 ? "Gerade alle reserviert" : rest >= alle ? `Nur ${alle}${NB}Stück` : `Noch ${rest}${NB}von ${alle}`,
  };
}

// Inhalt eines Elements mit dieser id ersetzen (nur die festen, bekannten Stellen der eigenen Vorlage)
const setze = (html, id, inhalt, tag) => html.replace(new RegExp(`(<${tag}\\b[^>]*\\bid="${id}"[^>]*>)[\\s\\S]*?(</${tag}>)`), (_, a, b) => a + inhalt + b);

// roh: SEITEN[slug] aus gutschein-seiten-html.mjs; daten: { shop: shopOeffentlich(...), aktiv }; stand: Zeitpunkt (ISO)
// heroId: Angebot aus dem Link der Werbung (?g=nr5), nur wenn es diese Nummer gibt; sonst roh.heroId. Vorschau (og) bleibt je Bestand.
export const heroAusLink = (sh, g) => (typeof g === "string" && /^nr[1-9]$/.test(g) && sh?.aktionen?.some((a) => a.id === g) ? g : null);
export function seiteAnpassen(roh, daten, { stand = new Date().toISOString(), heroId = null } = {}) {
  const sh = daten?.shop;
  // Shop zu oder Studio kann gerade nicht kassieren: Seite unverändert (das Skript zeigt den Grund)
  if (!sh || !sh.offen || !daten.aktiv) return roh.html;
  const fassung = fassungFuer(sh, roh.heroId);
  let html = roh.html.replace(/<!--og-->[\s\S]*?<!--\/og-->/, () => roh.og[fassung]);
  const aus = fassung === "danach";
  html = html.replace(/<html lang="de"/, `<html lang="de" data-stand="${esc(stand)}" data-fassung="${fassung}"${aus ? ' class="aus"' : ""}`);
  if (aus) return html;
  const t = heroTexte(sh, { stadt: roh.stadt, heroId: heroAusLink(sh, heroId) || roh.heroId });
  if (t.wert) { html = setze(html, "h-wert", esc(t.wert), "span"); html = setze(html, "h-preis", esc(t.preis), "span"); }
  html = setze(html, "hero-lead", t.lead, "p");
  html = setze(html, "hero-klein", esc(t.klein), "div");
  html = setze(html, "top-stueck", esc(t.pille), "span");
  if (t.liste) html = setze(html, "liste-ab", esc(t.liste), "span");
  return html;
}
