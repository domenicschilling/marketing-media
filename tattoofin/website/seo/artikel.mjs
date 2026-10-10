// Inhalte der Ratgeber-Seiten (SEO). Bearbeiten, dann: node seo/build.mjs
// Regeln: keine konkreten Raten, Zinsen oder Monatsbeträge bewerben; bei Raten immer der Warnhinweis.
export const WARN = "Achtung! Kreditaufnahme kostet Geld.";

export const artikel = [
  {
    slug: "tattoo-finanzieren",
    titel: "Tattoo finanzieren: So zahlst du dein Tattoo in Raten",
    seoTitel: "Tattoo finanzieren & in Raten zahlen: Möglichkeiten, Kosten, Tipps | Tattoofin",
    beschreibung: "Tattoo in Raten zahlen oder finanzieren: Welche Möglichkeiten es gibt, was ein großes Tattoo kostet, worauf du bei Ratenzahlung achten solltest und welche Studios sie anbieten.",
    lead: "Ein Sleeve oder Rückenstück kostet schnell vierstellig. Du musst das aber nicht immer auf einmal zahlen. Hier sind die Möglichkeiten, ehrlich verglichen.",
    stand: "2026-10-10",
    faq: [
      ["Kann man ein Tattoo in Raten zahlen?", "Ja, wenn dein Studio eine Zahlungsart mit Ratenzahlung anbietet, zum Beispiel Klarna über einen Zahlungslink oder die Zahlseite des Studios. Ob du Raten nutzen kannst, entscheidet der Zahlungsanbieter nach seiner Prüfung. Alternativ zahlst du bei großen Projekten oft pro Sitzung."],
      ["Welche Tattoo-Studios bieten Ratenzahlung an?", "Immer mehr Studios bieten flexible Zahlungsarten an. Frag am besten direkt bei deinem Studio nach, ob es Ratenzahlung über einen Anbieter wie Klarna oder eine Zahlung pro Sitzung gibt. Studios mit Tattoofin erkennst du am Aufkleber „Hier auch in Raten zahlen“."],
      ["Wird bei der Ratenzahlung meine Bonität geprüft?", "Ja. Anbieter von Ratenzahlung prüfen in der Regel deine Bonität, bevor sie zustimmen. Das Ergebnis und die Bedingungen siehst du direkt beim Bezahlen, bevor du etwas abschließt."],
      ["Was passiert mit meiner Anzahlung, wenn ich den Termin absage?", "Das regeln die Anzahlungsbedingungen des Studios. Üblich ist: Die Anzahlung wird mit dem Tattoo verrechnet, bei kurzfristiger Absage oder Nichterscheinen behält das Studio sie ein. Lies die Bedingungen vor dem Bezahlen."],
      ["Ist Tattoofin ein Kreditgeber?", "Nein. Tattoofin richtet Tattoo-Studios die Zahlungsstruktur ein. Ratenzahlung, Prüfung und Bedingungen kommen ausschließlich vom jeweiligen Zahlungsanbieter."],
    ],
    inhalt: `
<div class="toc"><b>Inhalt</b><ol><li><a href="#kosten">Was kostet ein großes Tattoo?</a></li><li><a href="#moeglichkeiten">5 Möglichkeiten, ein Tattoo zu bezahlen</a></li><li><a href="#raten">So läuft Ratenzahlung im Studio ab</a></li><li><a href="#achten">Darauf solltest du achten</a></li><li><a href="#faq">Häufige Fragen</a></li></ol></div>

<h2 id="kosten">Was kostet ein großes Tattoo?</h2>
<p>Die meisten Studios rechnen nach Stunden oder nach Sitzungen ab. Je nach Stadt, Stil und Artist liegen Stundensätze häufig im Bereich von etwa 100 bis 200 €. Ein großes Projekt wie ein Sleeve, ein Rückenstück oder ein großflächiges Cover-up braucht oft mehrere Sitzungen. Da kommen schnell 1.500 bis 4.000 € oder mehr zusammen.</p>
<p>Das ist für viele nicht der Betrag, den man mal eben überweist. Genau deshalb werden große Projekte so oft verschoben oder das Motiv wird kleiner, als man es eigentlich will.</p>

<h2 id="moeglichkeiten">5 Möglichkeiten, ein Tattoo zu bezahlen</h2>
<table>
<tr><th>Möglichkeit</th><th>Gut für</th><th>Haken</th></tr>
<tr><td><b>Pro Sitzung zahlen</b></td><td>Große Projekte mit mehreren Terminen</td><td>Jede Sitzung musst du trotzdem auf einmal zahlen</td></tr>
<tr><td><b>Ratenzahlung über einen Anbieter im Studio</b> (z. B. Klarna)</td><td>Wenn du sofort starten und planbar zahlen willst</td><td>Bonitätsprüfung, je nach Option Zinsen</td></tr>
<tr><td><b>Später bezahlen</b> (z. B. in 30 Tagen)</td><td>Kurze Überbrückung bis zum nächsten Gehalt</td><td>Zahlungstermin im Blick behalten</td></tr>
<tr><td><b>Sparen, dann stechen</b></td><td>Wenn du keine Verpflichtung eingehen willst</td><td>Dauert, Termin und Motivation gehen manchmal verloren</td></tr>
<tr><td><b>Dispo oder Ratenkredit bei der Bank</b></td><td>Eher nicht empfehlenswert</td><td>Dispozinsen sind meist hoch, Kreditantrag aufwendig</td></tr>
</table>
<p>Ratenvereinbarungen „auf Vertrauen“ direkt mit dem Studio gibt es auch. Viele Studios machen das aber nicht mehr, weil sie dann selbst hinter offenen Beträgen herlaufen müssen.</p>

<h2 id="raten">So läuft Ratenzahlung im Studio ab</h2>
<ol>
<li><b>Beratung und Preis:</b> Du besprichst Motiv, Größe und Preis mit dem Studio.</li>
<li><b>Zahlungslink oder QR-Code:</b> Das Studio schickt dir einen Link per WhatsApp oder du scannst den QR-Code an der Theke.</li>
<li><b>Zahlungsart wählen:</b> Beim Bezahlen siehst du, welche Optionen dir angeboten werden, z. B. Karte, Apple Pay, Google Pay oder Klarna. Je nach Prüfung durch den Anbieter auch in Raten oder später bezahlen.</li>
<li><b>Bestätigung:</b> Das Studio sieht sofort, dass bezahlt ist. Deine Raten zahlst du an den Anbieter, nicht ans Studio.</li>
</ol>
<div class="tip">Die Bedingungen, also Laufzeit, Zinsen und Gesamtbetrag, legt allein der Zahlungsanbieter fest. Du siehst sie vor dem Abschluss im Bezahlvorgang. Das Studio darf dir keine Raten oder Zinsen versprechen.</div>

<h2 id="achten">Darauf solltest du achten</h2>
<ul>
<li><b>Gesamtkosten statt Monatsrate:</b> Schau, was du am Ende insgesamt zahlst. Manche Optionen sind zinsfrei, andere nicht.</li>
<li><b>Nur, was du dir leisten kannst:</b> Ein Tattoo ist kein Notfall. Plane die Raten so, dass sie auch in einem schlechten Monat drin sind.</li>
<li><b>Anzahlungsbedingungen lesen:</b> Vor allem, wenn dein Termin erst in ein paar Wochen ist.</li>
<li><b>Seriöses Studio:</b> Klare Preise, schriftliche Einverständniserklärung, ordentliche Belege.</li>
</ul>
<p class="warn">${WARN}</p>
`,
    cta: "studio",
  },
  {
    slug: "ratenzahlung-tattoostudio",
    titel: "Ratenzahlung im Tattoostudio anbieten",
    seoTitel: "Ratenzahlung im Tattoostudio anbieten: So geht's ohne Risiko | Tattoofin",
    beschreibung: "Wie dein Tattoostudio Ratenzahlung über Klarna anbietet, ohne selbst Kredite zu geben: Ablauf, Kosten, Risiko, rechtliche Regeln ab 2026 und Einrichtung in wenigen Tagen.",
    lead: "„Kann ich das auch in Raten zahlen?“ Mit der richtigen Zahlungsstruktur ist die Antwort ja, ohne dass dein Studio Kredite vergibt oder Raten hinterherläuft.",
    stand: "2026-10-10",
    faq: [
      ["Trägt mein Studio das Risiko, wenn ein Kunde seine Raten nicht zahlt?", "Nein, wenn die Ratenzahlung über einen Anbieter wie Klarna läuft. Der Kunde schließt den Vertrag mit dem Anbieter, dein Studio bekommt den Betrag nach Freigabe ausgezahlt. Das Ausfallrisiko der Raten liegt beim Anbieter."],
      ["Brauche ich eine Erlaubnis als Kreditvermittler?", "Nicht, solange du keine Kredite vermittelst oder berätst, sondern nur eine Zahlungsart anbietest, deren Bedingungen der Anbieter festlegt. Wichtig: keine eigenen Ratenpläne versprechen, keine Zinsen oder Raten zusagen und den Kunden für die Bedingungen auf den Checkout verweisen."],
      ["Was kostet Ratenzahlung fürs Studio?", "Bei Tattoofin im Provisionsmodell 10 % vom Zahlbetrag, alles inklusive: Stripe, Klarna, Umsatzsteuer und Betreuung. Kunde zahlt 3.000 €, du bekommst 2.700 €. Alternativ einmal 1.499 € netto, dann zahlst du die Gebühren des Zahlungsanbieters direkt."],
      ["Darf ich für Ratenzahlung einen Aufpreis verlangen?", "Nein. Für die Nutzung bestimmter Zahlungsarten darfst du von Verbrauchern grundsätzlich keinen Aufschlag verlangen, und auch die Bedingungen der Anbieter verbieten das in der Regel."],
      ["Was ändert sich ab 20.11.2026?", "Mit der neuen EU-Verbraucherkreditrichtlinie fallen auch kurze Ratenkäufe unter das Verbraucherkreditrecht. Die Pflichten (Prüfung, Informationen) liegen beim Anbieter. Für Studios wichtig: Werbung mit Raten braucht den Hinweis „Achtung! Kreditaufnahme kostet Geld.“ und konkrete Zahlen nur mit Pflichtangaben."],
    ],
    inhalt: `
<div class="toc"><b>Inhalt</b><ol><li><a href="#warum">Warum Ratenzahlung fürs Studio lohnt</a></li><li><a href="#wie">So funktioniert es technisch</a></li><li><a href="#kosten">Was es kostet</a></li><li><a href="#recht">Rechtliches: Was Studios beachten müssen</a></li><li><a href="#start">In 3 Schritten startklar</a></li><li><a href="#faq">Häufige Fragen</a></li></ol></div>

<h2 id="warum">Warum Ratenzahlung fürs Studio lohnt</h2>
<ul>
<li><b>Weniger verschobene Projekte:</b> Kunden starten, solange die Idee frisch ist, statt monatelang zu sparen.</li>
<li><b>Größere Motive:</b> Wer nicht alles auf einmal zahlen muss, verkleinert das Motiv seltener.</li>
<li><b>Kein Hinterherlaufen:</b> Keine Raten „auf Vertrauen“, keine offenen Beträge, kein Mahnwesen.</li>
<li><b>Professioneller Auftritt:</b> Zahlungslink mit deinem Logo statt PayPal-Freunde oder Bargeld im Umschlag.</li>
</ul>

<h2 id="wie">So funktioniert es technisch</h2>
<p>Dein Studio bekommt eine Zahlungsstruktur über <b>Stripe</b>, einen der größten Zahlungsanbieter. Darüber laufen Karte, Apple Pay, Google Pay und <b>Klarna</b>. Klarna bietet Kunden je nach Prüfung „später bezahlen“, „in 3 Raten“ oder eine Finanzierung an. In Deutschland sind laut Stripe zum Beispiel 3 Raten für Beträge von 1 bis 5.000 € und Finanzierungen von 25 bis 10.000 € möglich (Stand 10/2026).</p>
<ol>
<li>Du erstellst im Portal einen Zahlungslink mit Betrag und Projekt, oder dein Kunde scannt den QR-Code deiner Zahlseite.</li>
<li>Der Kunde wählt im Checkout, wie er zahlen will. Prüfung und Bedingungen übernimmt der Anbieter.</li>
<li>Du siehst sofort, dass bezahlt ist. Stripe zahlt automatisch auf dein Konto aus.</li>
</ol>
<div class="tip">Das gleiche System nimmt auch <a href="/tattoo-anzahlung.html">Anzahlungen vor dem Termin</a> an, mit Anzahlungsbedingungen, die der Kunde vor dem Bezahlen bestätigt.</div>

<h2 id="kosten">Was es kostet</h2>
<table>
<tr><th></th><th>Provision (risikofrei)</th><th>Kauf</th></tr>
<tr><td>Einrichtung</td><td>0 €</td><td>1.499 € netto einmalig</td></tr>
<tr><td>Pro Zahlung</td><td>10 % vom Zahlbetrag, alles inklusive</td><td>Gebühren des Zahlungsanbieters (z. B. Karte ab 1,5 % + 0,25 €, Klarna ab 2,99 % + 0,35 €)</td></tr>
<tr><td>Beispiel 3.000 €</td><td>2.700 € an dich</td><td>abzüglich Anbietergebühr</td></tr>
<tr><td>Laufzeit</td><td>monatlich kündbar</td><td>30 Tage Geld-zurück-Garantie</td></tr>
</table>
<p>Ab etwa 25.000 € Zahlungsvolumen über Tattoofin rechnet sich für regelbesteuerte Studios der Kauf. Den genauen Vergleich zeigt der <a href="/#rechner">Rechner auf der Startseite</a>.</p>

<h2 id="recht">Rechtliches: Was Studios beachten müssen</h2>
<ul>
<li><b>Keine eigenen Kredite:</b> Dein Studio vergibt keine Kredite und vermittelt keine. Die Ratenzahlung ist ein Angebot des Zahlungsanbieters.</li>
<li><b>Keine Zusagen:</b> Keine Raten, Zinsen oder Freigaben versprechen. Richtiger Satz im Gespräch: „Beim Bezahlen siehst du, welche Zahlungsoptionen dir angeboten werden.“</li>
<li><b>Werbung:</b> Auf Aufklebern, Flyern und Social Media keine konkreten Monatsraten oder Zinsen ohne Pflichtangaben. Bei Werbung mit Raten der Hinweis „Achtung! Kreditaufnahme kostet Geld.“ (Pflicht ab 20.11.2026).</li>
<li><b>Kein Aufpreis</b> für bestimmte Zahlungsarten.</li>
</ul>
<p>Die Materialien im Tattoofin Studio Kit sind genau so formuliert.</p>

<h2 id="start">In 3 Schritten startklar</h2>
<ol>
<li><b>Online abschließen</b> (3 Minuten) und das Stripe-Konto anlegen (ca. 10 Minuten).</li>
<li><b>Wir richten alles ein:</b> Zahlungsarten, Branding, QR-Code, Testzahlung, kurze Teamschulung.</li>
<li><b>Link raus, Geld rein.</b></li>
</ol>
`,
    cta: "start",
  },
  {
    slug: "tattoo-anzahlung",
    titel: "Anzahlung beim Tattoo: Höhe, Regeln und No-Shows",
    seoTitel: "Tattoo-Anzahlung: übliche Höhe, Regeln bei Absage & No-Show | Tattoofin",
    beschreibung: "Wie hoch ist eine übliche Tattoo-Anzahlung, was passiert bei Absage oder No-Show, wie formuliert man faire Anzahlungsbedingungen und wie sammelt man Anzahlungen digital ein.",
    lead: "Die Anzahlung sichert den Termin und die Vorarbeit am Motiv. Damit es keinen Streit gibt, braucht es klare Regeln. Hier ist, was üblich ist und wie es sauber läuft.",
    stand: "2026-10-10",
    faq: [
      ["Wie hoch ist eine übliche Tattoo-Anzahlung?", "Häufig sind feste Beträge zwischen etwa 50 und 200 € oder rund 10 bis 30 % des Projektpreises. Bei großen Projekten mit viel Vorzeichnung eher mehr. Entscheidend ist, dass die Höhe im Verhältnis zum Aufwand steht."],
      ["Bekomme ich meine Anzahlung zurück, wenn ich absage?", "Das hängt von den vereinbarten Anzahlungsbedingungen ab. Üblich: Bei rechtzeitiger Absage wird die Anzahlung auf einen neuen Termin übertragen, bei sehr kurzfristiger Absage oder Nichterscheinen behält das Studio sie ein. Sagt das Studio ab, bekommst du sie zurück."],
      ["Wird die Anzahlung mit dem Tattoo verrechnet?", "In aller Regel ja. Die Anzahlung ist ein Teil des Preises und wird beim letzten Termin abgezogen."],
      ["Darf ein Studio die Anzahlung bei No-Show behalten?", "Wenn das vorher klar vereinbart wurde und die Höhe angemessen ist, ist das üblich. Wichtig ist, dass der Kunde die Bedingungen vor dem Zahlen kennt und bestätigt."],
      ["Wie kann ich als Studio Anzahlungen digital einsammeln?", "Zum Beispiel per Zahlungslink, den du per WhatsApp schickst, oder über eine Zahlseite mit QR-Code. Mit Tattoofin bestätigt der Kunde vor dem Bezahlen deine Anzahlungsbedingungen, gespeichert mit Zeitpunkt."],
    ],
    inhalt: `
<div class="toc"><b>Inhalt</b><ol><li><a href="#hoehe">Wie hoch ist eine Tattoo-Anzahlung?</a></li><li><a href="#regeln">Absage, Verschieben, No-Show</a></li><li><a href="#muster">Muster: faire Anzahlungsbedingungen</a></li><li><a href="#digital">Anzahlung digital einsammeln</a></li><li><a href="#faq">Häufige Fragen</a></li></ol></div>

<h2 id="hoehe">Wie hoch ist eine Tattoo-Anzahlung?</h2>
<table>
<tr><th>Projekt</th><th>Häufige Anzahlung</th></tr>
<tr><td>Kleines Motiv, ein Termin</td><td>ca. 50–100 €</td></tr>
<tr><td>Mittleres Motiv, eine längere Sitzung</td><td>ca. 100–200 €</td></tr>
<tr><td>Großes Projekt (Sleeve, Rücken), mehrere Sitzungen</td><td>ca. 150–300 € oder 10–30 % des Preises</td></tr>
</table>
<p>Die Anzahlung deckt vor allem die Vorarbeit (Entwurf, Beratung) und den geblockten Termin. Sie sollte im Verhältnis zu diesem Aufwand stehen.</p>

<h2 id="regeln">Absage, Verschieben, No-Show</h2>
<ul>
<li><b>Rechtzeitig abgesagt</b> (z. B. mehr als 48 Stunden vorher): Anzahlung wird auf einen neuen Termin übertragen.</li>
<li><b>Kurzfristig abgesagt oder nicht erschienen:</b> Das Studio behält die Anzahlung ein, weil der Termin nicht mehr vergeben werden kann.</li>
<li><b>Studio sagt ab:</b> Neuer Termin oder volle Rückzahlung.</li>
<li><b>Verrechnung:</b> Die Anzahlung wird immer mit dem Preis des Tattoos verrechnet.</li>
</ul>
<div class="tip">Am wichtigsten: Der Kunde muss die Regeln <b>vor</b> dem Bezahlen kennen und bestätigen. Das vermeidet Streit und ist dein stärkster Beleg, falls jemand die Zahlung später über seine Bank zurückbuchen will.</div>

<h2 id="muster">Muster: faire Anzahlungsbedingungen</h2>
<p>Diesen Text kannst du als Vorlage nutzen und an dein Studio anpassen:</p>
<div class="tip">„Die Anzahlung sichert deinen Termin und wird mit dem Preis deines Tattoos verrechnet. Sagst du den Termin weniger als 48 Stunden vorher ab oder erscheinst du nicht, behält das Studio die Anzahlung ein. Verschieben ist nach Absprache möglich. Sagt das Studio den Termin ab, bekommst du die Anzahlung zurück.“</div>
<p class="muted" style="font-size:14px">Hinweis: Muster ohne Gewähr, keine Rechtsberatung. Passe Fristen und Höhe an dein Studio an.</p>

<h2 id="digital">Anzahlung digital einsammeln</h2>
<p>Bar, Überweisung oder PayPal „Freunde“ sind unpraktisch und schlecht belegt. Besser: ein Zahlungslink mit den Anzahlungsbedingungen.</p>
<ol>
<li>Im Tattoofin-Portal einen Zahlungslink mit der Art „Anzahlung“ erstellen und per WhatsApp schicken, oder den Kunden an der Theke den QR-Code scannen lassen.</li>
<li>Der Kunde liest deine Anzahlungsbedingungen und bestätigt sie mit einem Häkchen.</li>
<li>Er zahlt per Karte, Apple Pay, Google Pay oder Klarna. Du siehst sofort, dass bezahlt ist.</li>
</ol>
`,
    cta: "start",
  },
  {
    slug: "klarna-tattoostudio",
    titel: "Klarna im Tattoostudio: So geht's ohne Onlineshop",
    seoTitel: "Klarna fürs Tattoostudio: Ratenzahlung ohne Onlineshop einrichten | Tattoofin",
    beschreibung: "Klarna im Tattoostudio anbieten, ohne Onlineshop: welche Klarna-Optionen es gibt, Betragsgrenzen in Deutschland, Kosten, Regeln und wie Zahlungslink und QR-Code funktionieren.",
    lead: "Klarna ist für Onlineshops gebaut. Mit Zahlungslink und QR-Zahlseite geht es aber auch im Tattoostudio, ganz ohne Shop und ohne Technik-Wissen.",
    stand: "2026-10-10",
    faq: [
      ["Kann ich Klarna im Tattoostudio ohne Onlineshop nutzen?", "Ja, zum Beispiel über Stripe mit Zahlungslinks und einer Zahlseite mit QR-Code. Der Kunde zahlt im Checkout per Klarna, du brauchst keinen Shop."],
      ["Welche Klarna-Optionen bekommen meine Kunden?", "Je nach Betrag und Prüfung z. B. später bezahlen, in 3 Raten oder eine Finanzierung. Welche Optionen ein Kunde sieht, entscheidet Klarna."],
      ["Was kostet Klarna fürs Studio?", "Über Stripe ab 2,99 % + 0,35 € pro Zahlung, wenn du die Gebühren selbst zahlst (Kaufmodell). Im Tattoofin-Provisionsmodell ist das in den 10 % enthalten."],
      ["Bekomme ich das Geld sofort, auch wenn der Kunde in Raten zahlt?", "Nach Freigabe durch Klarna wird dir der Betrag über Stripe ausgezahlt. Die Raten zahlt der Kunde an Klarna, das Ausfallrisiko trägt Klarna."],
    ],
    inhalt: `
<div class="toc"><b>Inhalt</b><ol><li><a href="#optionen">Klarna-Optionen und Grenzen</a></li><li><a href="#ablauf">So läuft es im Studio</a></li><li><a href="#kosten">Kosten</a></li><li><a href="#regeln">Regeln, die du kennen musst</a></li><li><a href="#faq">Häufige Fragen</a></li></ol></div>

<h2 id="optionen">Klarna-Optionen und Grenzen in Deutschland</h2>
<table>
<tr><th>Option</th><th>Betrag (laut Stripe, Stand 10/2026)</th></tr>
<tr><td>Später bezahlen (30 Tage)</td><td>ca. 0,10 – 10.000 €</td></tr>
<tr><td>In 3 Raten</td><td>1 – 5.000 €</td></tr>
<tr><td>Finanzierung (bis 36 Monate)</td><td>25 – 10.000 €</td></tr>
</table>
<p>Welche Option ein Kunde tatsächlich angeboten bekommt, entscheidet Klarna nach Betrag und Prüfung. Für typische Tattoo-Projekte von einigen hundert bis einigen tausend Euro passt das gut.</p>

<h2 id="ablauf">So läuft es im Studio</h2>
<ol>
<li><b>Zahlungslink:</b> Betrag und Projekt im Portal eintippen, Link per WhatsApp schicken.</li>
<li><b>Oder QR-Code:</b> Kunde scannt an der Theke, gibt den abgesprochenen Betrag ein.</li>
<li><b>Checkout:</b> Der Kunde wählt Klarna, Karte, Apple Pay oder Google Pay.</li>
<li><b>Auszahlung:</b> Stripe zahlt automatisch auf das Konto deines Studios aus.</li>
</ol>

<h2 id="kosten">Kosten</h2>
<ul>
<li><b>Tattoofin Provision:</b> 10 % vom Zahlbetrag, alles inklusive (Klarna, Stripe, USt.). Kunde zahlt 3.000 €, du bekommst 2.700 €.</li>
<li><b>Tattoofin Kauf:</b> 1.499 € netto einmalig, die Klarna-Gebühr (über Stripe ab 2,99 % + 0,35 €) zahlst du direkt.</li>
</ul>

<h2 id="regeln">Regeln, die du kennen musst</h2>
<ul>
<li>Kein Aufpreis für Klarna-Zahlungen.</li>
<li>Keine Raten oder Zinsen versprechen, das entscheidet Klarna.</li>
<li>Werbung mit Raten nur mit dem Hinweis „Achtung! Kreditaufnahme kostet Geld.“ und ohne konkrete Zahlen ohne Pflichtangaben.</li>
<li>Bitte keine Käufe durch Inhaber oder Mitarbeitende über Klarna.</li>
</ul>
<p>Mehr zum Thema: <a href="/ratenzahlung-tattoostudio.html">Ratenzahlung im Tattoostudio anbieten</a>.</p>
`,
    cta: "start",
  },
];
