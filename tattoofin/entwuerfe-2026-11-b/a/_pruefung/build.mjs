// Baut index.html aus motive.mjs. Das Ergebnis ist statisch und läuft ohne Build.
import * as M from './motive.mjs';
import fs from 'fs';
const root = new URL('..', import.meta.url).pathname;

const PFLICHT = '<p class="pflicht">*Raten über Klarna, nach deren Bonitätsprüfung. Vertragspartner der Raten ist Klarna, nicht Tattoofin. <strong>Achtung! Kreditaufnahme kostet Geld.</strong></p>';
const WA_URL = 'https://wa.me/491624502375?text=' + encodeURIComponent('Hi Domenic, ich habe ein Tattoo-Studio und eine Frage zu Tattoofin.');
const KNOPF = (ort = '') => `<a class="knopf" href="/start.html" data-umami-event="start-${ort}">Jetzt starten</a>`;
const WA = (ort = '') => `<a class="wa" href="${WA_URL}" data-umami-event="whatsapp-${ort}">Erst fragen? WhatsApp an Domenic</a>`;
const WEGE = (ort) => `<div class="wege">${KNOPF(ort)}${WA(ort)}</div>`;

const deko = (fn, stil) => `<span class="deko" style="${stil}" aria-hidden="true">${M.svg(fn)}</span>`;

// Stufen für den Ablauf: gleiche Schwalbe, ohne pathLength (damit Strichelung in Pixeln rechnet)
const stufe = (n) => M.svg(M.schwalbe, { klasse: `stufe stufe${n}` }).replace(/ pathLength="1"/g, '');

const stueck = ({ id, nr, schild, motiv, titel, h2, text, bild = '', klasse = '', fuell = '' }) => `
<article class="stueck ${klasse}" id="${id}">
  <div class="stueck-bild">
    <button type="button" class="motiv-knopf" data-stechen aria-label="${titel} neu stechen">
      ${M.svg(motiv, { klasse: 'stech' })}
      <span class="nr" aria-hidden="true">${nr}</span>
      <span class="schild" aria-hidden="true">${schild}</span>
    </button>
    ${bild}${fuell}
  </div>
  <div class="stueck-text">
    <h2>${h2}</h2>
    ${text}
  </div>
</article>`;

const abzug = ({ src, alt, unter, breite, hoehe, klasse = '' }) => `
<figure class="abzug ${klasse}">
  <button type="button" class="abzug-knopf" data-abzug aria-expanded="false" aria-label="Bild größer zeigen">
    <span class="klebe" aria-hidden="true"></span>
    <img src="${src}" alt="${alt}" width="${breite}" height="${hoehe}" loading="lazy" decoding="async">
  </button>
  <figcaption>${unter}</figcaption>
</figure>`;

const ALT_KUNDE = 'Echte Aufnahme der Tattoofin-Zahlseite am Handy: Hi Lena, deine Zahlung an Ink Studio Bamberg, Schritt 1 von 2, 2.000 Euro für Sleeve linker Arm. Darunter der Hinweis auf die Zahlarten mit dem Pflichthinweis zu Raten*. Beispieldaten.';

const frage = (q, a) => `<details class="frage"><summary><span>${q}</span><span class="zu" aria-hidden="true">${M.svg(M.sternMotiv)}</span></summary><div class="antwort">${a}</div></details>`;
const einwand = (q, a) => `<li class="einwand"><h3>${q}</h3><p>${a}</p></li>`;

const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tattoofin für Tattoo-Studios</title>
<meta name="description" content="Software für Tattoo-Studios: Zahlungslink per WhatsApp, QR-Zahlseite an der Theke, Anzahlung mit Bedingungen, Gutscheine. 49 € netto im Monat.">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#f5ead2">
<link rel="icon" type="image/png" href="assets/figur.png">
<link rel="stylesheet" href="assets/style.css">
</head>
<body>
${M.DEFS}
<a class="sprung" href="#inhalt">Zum Inhalt springen</a>
<div class="bogen">

  <header class="kopf">
    <span class="kopf-titel">Für Tattoo-Studios</span>
    <nav aria-label="Seite">
      <a href="#preis">Preis</a>
      <a href="#fragen">Fragen</a>
      <a href="${WA_URL}" data-umami-event="whatsapp-kopf">WhatsApp</a>
    </nav>
  </header>

  <main id="inhalt">
  <section class="auftakt">
    <div class="buehne">
      <svg class="faeden faeden-klein" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d="M35.5 34.5 C41 37 49 37 57 29"/><path d="M12.5 29 C4 32 1.5 42 5 55"/>
      </svg>
      <svg class="faeden faeden-gross" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d="M55.5 48.5 C62 48 68 42 71 33"/><path d="M31.4 42 C27 38 22 34 20 30"/><path d="M31.4 46 C26 47 20 50 14 54"/><path d="M40 63 C40 65 39 66 38 67"/>
      </svg>
      <img class="hausherr" src="assets/logo.png" alt="Tattoofin-Logo: Comic-Figur mit tätowierten Armen zeigt den Daumen hoch" width="520" height="515" fetchpriority="high">
      <a class="flash fl-1" href="#nr1">${M.svg(M.herz, { klasse: 'stech', titel: 'Flash-Herz mit Banderole: Raten*' })}<span class="nr" aria-hidden="true">1</span><span class="unsichtbar">Nr. 1: Raten* für deine Kunden</span></a>
      <a class="flash fl-2" href="#nr2">${M.svg(M.schwalbe, { klasse: 'stech' })}<span class="nr" aria-hidden="true">2</span><span class="schild">Zahlungslink</span></a>
      <a class="flash fl-3" href="#nr3">${M.svg(M.anker, { klasse: 'stech' })}<span class="nr" aria-hidden="true">3</span><span class="schild">Anzahlung</span></a>
      <a class="flash fl-4" href="#nr4">${M.svg(M.ass, { klasse: 'stech' })}<span class="nr" aria-hidden="true">4</span><span class="schild">QR-Theke</span></a>
      <a class="flash fl-5" href="#nr5">${M.svg(M.rose, { klasse: 'stech' })}<span class="nr" aria-hidden="true">5</span><span class="schild">Gutschein</span></a>
      <span class="stich st-a" aria-hidden="true"></span><span class="stich st-b" aria-hidden="true"></span>
      <span class="deko dk-mond" aria-hidden="true">${M.svg(M.mond)}</span>
      <span class="deko dk-diamant" aria-hidden="true">${M.svg(M.diamant)}</span>
      <span class="deko dk-stern" aria-hidden="true">${M.svg(M.sternMotiv)}</span>
      <span class="deko dk-blitz" aria-hidden="true">${M.svg(M.blitz)}</span>
      <figure class="auftakt-handy">
        <span class="klebe" aria-hidden="true"></span>
        <img src="assets/handy-kunde.webp" alt="${ALT_KUNDE}" width="600" height="1298" loading="lazy" decoding="async">
        <figcaption>Das sieht dein Kunde. Beispieldaten.</figcaption>
      </figure>
    </div>
    <div class="auftakt-text">
      <h1>Raten* für deine Kunden.</h1>
      <p class="satz">Schick deinem Kunden einen Zahlungslink per WhatsApp. Beim Bezahlen kann er Raten* über Klarna wählen, wenn Klarna zustimmt.</p>
      ${PFLICHT}
      <div class="auftakt-knopf">${KNOPF('auftakt')}</div>
      <p class="preiszeile">49 € netto im Monat · keine Provision · monatlich kündbar</p>
      ${WA('auftakt')}
    </div>
  </section>

  <section class="haupt" id="nr1">
    <div class="haupt-bild">
      <button type="button" class="motiv-knopf" data-stechen aria-label="Herz neu stechen">
        ${M.svg(M.herz, { klasse: 'stech' })}
        <span class="nr" aria-hidden="true">1</span>
        <span class="schild" aria-hidden="true">für deine Kunden</span>
      </button>
      ${deko(M.sternMotiv, 'left:3%;top:80%;width:9%')}
    </div>
    <h2>Der Betrag bremst den Sleeve.</h2>
    <div class="haupt-text">
      <p>Dein Kunde will das große Motiv, der Preis lässt ihn zögern, das Projekt wandert auf später. Mit Raten* hat er beim Bezahlen eine Möglichkeit mehr. Ob sie möglich sind, entscheidet Klarna.</p>
      ${PFLICHT}
      <p>Für dich bleibt es ein Zahlungslink, ohne Provision. Stripe zahlt auf dein Bankkonto aus, nach den Auszahlungsfristen von Stripe.</p>
    </div>
    <div class="haupt-beleg">
      <p class="beleg-text">Das sieht dein Kunde. Echte Aufnahme der Zahlseite, Beispieldaten.</p>
      ${deko(M.diamant, 'left:6px;bottom:96px;width:48px')}
      ${deko(M.mond, 'left:76px;bottom:40px;width:36px')}
      ${abzug({ src: 'assets/handy-kunde.webp', alt: ALT_KUNDE, unter: '', breite: 600, hoehe: 1298, klasse: 'abzug-hoch abzug-haupt' })}
    </div>
  </section>

  <section class="einwaende" aria-labelledby="einwaende-titel">
    <h2 id="einwaende-titel">Das fragen Studios zuerst.</h2>
    <ul>
      ${einwand('Und wenn der Kunde nicht zahlt?', 'Zahlt er seine Raten* nicht, trägt nach den Bedingungen von Stripe und Klarna Klarna den Ausfall, nicht dein Studio. Reklamiert er die Leistung, kann der Betrag zurückgebucht werden.')}
      ${einwand('Muss ich den Kunden beraten?', 'Nein, im Gegenteil: Du und dein Team beratet nicht zu Krediten und sagt keine Raten* zu. Klarna prüft und entscheidet, dein Kunde sieht die Bedingungen beim Bezahlen.')}
      ${einwand('Bekommt jeder Kunde Raten*?', 'Nein. Klarna prüft jeden selbst. Sagt Klarna nein, kann er mit Karte zahlen, und auf Wunsch bietest du Anzahlung per Karte, Rest bei dir im Studio.')}
    </ul>
    <div class="einwaende-fuss">
      ${PFLICHT}
      ${KNOPF('einwaende')}
    </div>
  </section>

  <section class="feld" aria-label="Was noch dabei ist">
    ${stueck({
      id: 'nr2', nr: 2, schild: 'per WhatsApp', motiv: M.schwalbe, titel: 'Schwalbe mit Kette',
      h2: 'Link per WhatsApp, fertig.',
      text: '<p>Betrag und Projekt eintippen, Link schicken, das dauert keine Minute. Dein Kunde zahlt am Handy mit Karte, Apple Pay, Google Pay oder Klarna. Im Portal siehst du, wer bezahlt hat. Kein Kartenterminal, keine Kunden-App.</p>',
      bild: abzug({ src: 'assets/zahlungslink-whatsapp.webp', alt: 'Ausschnitt aus der Tattoofin-App: Zahlungslink für Lena über 2.000 Euro, mit den Knöpfen Per WhatsApp senden und Link kopieren. Beispieldaten.', unter: 'App-Ausschnitt, Beispieldaten.', breite: 592, hoehe: 460, klasse: 'abzug-breit' }),
    })}
    ${stueck({
      id: 'nr3', nr: 3, schild: 'gegen No-Shows', motiv: M.anker, titel: 'Anker mit Banderole Termin', klasse: 'tief ohne-abzug',
      h2: 'Anzahlung hält den Termin.',
      text: '<p>Ein No-Show kostet dich den geblockten Platz und die Vorarbeit am Motiv. Schick die Anzahlung vorab als Link. Dein Kunde hakt deine Bedingungen ab und zahlt. Kommt er nicht, bleibt sie nach deinen Bedingungen bei dir. <a href="/muster-anzahlungsbedingungen.pdf">Muster-Bedingungen</a> bekommst du von uns, Frist und Text stellst du selbst ein.</p>',
    })}
    ${stueck({
      id: 'nr4', nr: 4, schild: 'QR an der Theke', motiv: M.ass, titel: 'Spielkarte mit QR-Code',
      h2: 'Dein Ass an der Theke.',
      text: `<p>Dein Kunde scannt mit dem Handy und zahlt Tattoo oder Anzahlung auf deiner Zahlseite. Der Aufsteller aus Holz mit Studioname und QR-Code ist dabei, im Wert von 29 €.</p>${PFLICHT}`,
      bild: abzug({ src: 'assets/aufsteller-scannen-800.webp', alt: 'QR-Aufsteller aus Holz auf einer Studio-Theke, eine tätowierte Hand scannt ihn mit dem Handy. Auf dem Schild steht: Tattoo bezahlen, Anzahlung oder in Raten*.', unter: 'KI-Visualisierung des Aufstellers.', breite: 800, hoehe: 994, klasse: 'abzug-quer' }),
    })}
    ${stueck({
      id: 'nr5', nr: 5, schild: 'zum Verschenken', motiv: M.rose, titel: 'Rose mit Gutschein', klasse: 'tief ohne-abzug',
      h2: 'Gutscheine verkaufen.',
      text: '<p>Dein Kunde bekommt Code und PDF zum Ausdrucken, beim Termin wird der Code angegeben.</p>',
    })}
  </section>

  <section class="ablauf" id="ablauf">
    <h2>So läuft's in 3 Schritten.</h2>
    <ol>
      <li>${stufe(1)}<div><h3>Du meldest dich an.</h3><p>Online abschließen, das dauert 3 Minuten.</p></div></li>
      <li>${stufe(2)}<div><h3>Stripe prüft dein Studio.</h3><p>Du legst einmal dein Zahlungskonto an, etwa 10 Minuten. Stripe prüft Identität und Bankverbindung, meist in 1 bis 3 Werktagen.</p></div></li>
      <li>${stufe(3)}<div><h3>Wir richten es mit dir ein.</h3><p>Wir richten dein Logo und deinen QR-Code ein, machen eine Testzahlung und zeigen deinem Team die App. Klarna schaltest du selbst in deinem Stripe-Konto ein, wir zeigen dir, wo.</p></div></li>
    </ol>
  </section>

  <section class="preis" id="preis">
    <div class="preis-innen">
      <h2>Ein Preis für alles.</h2>
      <div class="preis-links">
        <div class="preis-schild">
          <svg class="faden" viewBox="0 0 120 90" aria-hidden="true" focusable="false"><path d="M60 8 C42 30 78 52 60 86" fill="none" stroke="#fff7e3" stroke-width="4" stroke-linecap="round"/></svg>
          <span class="reisszwecke" aria-hidden="true"></span>
          <div class="anhaenger">
            <span class="loch" aria-hidden="true"></span>
            <strong class="betrag">49 €</strong>
            <span class="einheit">netto im Monat</span>
            <span class="brutto">58,31 € inkl. USt. Nur für Unternehmer.</span>
          </div>
        </div>
        <div class="beleg">
          <table>
            <caption>Dein Kunde zahlt 1.000 €</caption>
            <tbody>
              <tr><th scope="row">Zahlungsgebühr, direkt an Stripe</th><td>ca. 15–30 €</td></tr>
              <tr><th scope="row">An Tattoofin von dieser Zahlung</th><td>0 €</td></tr>
              <tr class="summe"><th scope="row">Auf deinem Stripe-Konto</th><td>ca. 970–985 €</td></tr>
              <tr><th scope="row">Dazu der feste Preis</th><td>49 € netto im Monat</td></tr>
            </tbody>
          </table>
          <p class="beleg-hinweis">Beispielrechnung, keine Garantie.</p>
        </div>
      </div>
      <div class="preis-text">
        <p class="rechnung">Ein einziges großes Projekt im Monat, das sonst später oder gar nicht kommt, deckt das mehrfach. Das ist eine Rechnung, kein Versprechen.</p>
        <ul class="sterne enthalten" aria-label="Das ist enthalten">
          <li>Zahlungslink</li>
          <li>Zahlseite mit Logo</li>
          <li>Anzahlungen</li>
          <li>Gutscheine</li>
          <li>QR-Aufsteller im Wert von 29 €</li>
          <li>Betreuung per WhatsApp</li>
        </ul>
        <p class="kurz"><strong>Keine Provision, keine Einrichtungsgebühr.</strong> Der erste Monat wird beim Start fällig. Keine Mindestlaufzeit, du kündigst im Portal zum Ende des Abrechnungsmonats.</p>
        <p class="kurz"><strong>Lehnt Stripe dein Konto endgültig ab, bekommst du die gezahlten Monatsbeträge zurück.</strong> Ausnahme: Die Ablehnung beruht auf falschen Angaben oder einer Pflichtverletzung von dir.</p>
        <p class="gebuehr">Zahlungsgebühren zahlst du direkt an Stripe, <span class="nb">ca. 1,5–3 %</span> je nach Zahlart: Karte ab 1,5 % + 0,25 €, Klarna ab 2,99 % + 0,35 €. <a href="/vertrag.html">Vertrag vorab lesen</a>.</p>
        ${WEGE('preis')}
      </div>
    </div>
  </section>

  <section class="fragen" id="fragen">
    <h2>Noch Fragen?</h2>
    <div class="fragen-liste">
      ${frage('Ist Tattoofin der Kreditgeber?', `<p>Nein. Tattoofin vergibt keine Kredite und berät nicht dazu. Den Vertrag über die Raten* schließt dein Kunde mit Klarna.</p>${PFLICHT}`)}
      ${frage('Wann kommt das Geld bei mir an?', '<p>Stripe zahlt auf dein Bankkonto aus, nach den Auszahlungsfristen von Stripe. Die Zahlungsgebühr von Stripe geht vorher ab.</p>')}
      ${frage('Was brauche ich dafür?', '<p>Dein Studio als Unternehmen, ein Bankkonto für die Auszahlungen und deinen Ausweis für die Prüfung durch Stripe.</p>')}
      ${frage('Wer steckt dahinter?', `<p>Die DSX Media Solutions UG aus Memmelsdorf bei Bamberg. Dein Ansprechpartner ist Domenic Schilling, per <a href="${WA_URL}">WhatsApp</a> unter +49 162 4502375.</p>`)}
    </div>
  </section>

  <section class="schluss">
    <div class="schluss-kopf">
      <h2>Bereit für den ersten Link?</h2>
      <p class="ansprech">49 € netto im Monat, monatlich kündbar. Dein Ansprechpartner ist Domenic Schilling.</p>
      ${WEGE('schluss')}
    </div>
    <div class="hausherr-rahmen">
      <svg class="schluss-faden" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path d="M100 96 C62 100 16 74 6 6"/></svg>
      <span class="stich st-c" aria-hidden="true"></span>
      <img class="hausherr-klein" src="assets/figur.png" alt="" width="300" height="310" loading="lazy" decoding="async">
    </div>
  </section>
  </main>

  <footer class="fuss">
    <div class="fuss-innen">
      <img class="fuss-marke" src="assets/wortmarke.png" alt="Tattoofin" width="519" height="116" loading="lazy" decoding="async">
      <nav aria-label="Rechtliches">
        <a href="/impressum.html">Impressum</a>
        <a href="/datenschutz.html">Datenschutz</a>
        <a href="/vertrag.html">Vertrag</a>
      </nav>
      <p>DSX Media Solutions UG (haftungsbeschränkt), Am Weingarten 9, 96117 Memmelsdorf. Tattoofin ist kein Kreditinstitut.</p>
    </div>
  </footer>

  <aside class="leiste" id="leiste" aria-label="Schnellzugriff">
    <span class="leiste-preis">49 € netto<br>im Monat</span>
    <a class="knopf" href="/start.html" data-umami-event="start-leiste">Jetzt starten</a>
    <a class="leiste-wa" href="${WA_URL}" aria-label="WhatsApp an Domenic" data-umami-event="whatsapp-leiste"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.8a9.2 9.2 0 0 0-7.9 13.9L2.9 21.2l4.6-1.2A9.2 9.2 0 1 0 12 2.8Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8.8 7.6c-.5 0-1 .6-1 1.7 0 2.9 3.7 6.9 7 6.9 1.100 0 1.700-.7 1.700-1.200 0-.4-.1-.7-.4-.9l-1.600-.8c-.3-.1-.5 0-.7.2l-.5.6c-.2.2-.4.2-.7.1-1-.4-2.100-1.500-2.500-2.500-.1-.3-.1-.5.1-.7l.5-.5c.2-.2.3-.4.2-.7l-.7-1.600c-.2-.4-.5-.5-.9-.5Z" fill="currentColor"/></svg></a>
  </aside>
</div>
<script src="assets/app.js" defer></script>
</body>
</html>
`;
// Zahl und Einheit nie trennen (nur im Fließtext, nicht in SVG-Daten)
const fertig = html.replace(/>([^<>]*)</g, (m, t) => '>' + t.replace(/(\d) (€|%)/g, '$1&nbsp;$2').replace(/\+ (\d)/g, '+&nbsp;$1') + '<');
fs.writeFileSync(root + 'index.html', fertig);
console.log('index.html', Math.round(fertig.length / 1024), 'KB');
