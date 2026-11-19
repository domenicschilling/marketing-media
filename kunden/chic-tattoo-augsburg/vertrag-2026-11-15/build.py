#!/usr/bin/env python3
"""Testvertrag Chic Tattoo Augsburg (Paket Komplett, Testzeitraum 16.–30.11.2026).
Basis: Itzehoe-Vorlage + Baustein „monatlich kündbar“. Aufruf: pw-python build.py -> Chic-Tattoo-Augsburg-Testvertrag-zum-Unterschreiben.pdf"""
import base64, glob
from pathlib import Path
from playwright.sync_api import sync_playwright

HIER = Path(__file__).resolve().parent
logo = sorted(glob.glob(str(HIER / "img/*")))[0]
LOGO = f"data:image/{Path(logo).suffix[1:].replace('jpg','jpeg')};base64," + base64.b64encode(Path(logo).read_bytes()).decode()

AG = "TattooLeadz.de, Inhaber Andy Neelsen, Landshuter Allee 42, 80637 München"
KUNDE = "Chic Tattoo &amp; Piercing, Inhaber Christoph Weiße, Ulmer Straße 14, 86154 Augsburg"
FASSUNG = "Fassung vom 15.11.2026 · Kunde: Chic Tattoo &amp; Piercing, Ulmer Straße 14, 86154 Augsburg"

# Zahlen an EINER Stelle (Testpreis ist brutto vorgegeben)
TEST_BRUTTO = "499,00 €"
TEST_NETTO = "419,33 €"
TEST_UST = "79,67 €"
MONAT_NETTO = "1.299,00 €"
MONAT_UST = "246,81 €"
MONAT_BRUTTO = "1.545,81 €"
TEST_VON, TEST_BIS = "16.11.2026", "30.11.2026"


def kopf(titel, unter, neu=True):
    return f'<section class="{"neu" if neu else ""}"><img class="logo" src="{LOGO}"><h1>{titel}</h1><p class="unter">{unter}</p><p class="fassung">{FASSUNG}</p>'


def unterschrift(l1, l2, r1, r2):
    return f'''<table class="sig"><tr><td>Ort, Datum: {l1}, ______________</td><td>Ort, Datum: {r1}, ______________</td></tr>
<tr><td class="linie">____________________________________</td><td class="linie">____________________________________</td></tr>
<tr><td>{l2}</td><td>{r2}</td></tr></table>'''


def zeilen(rows):
    return "".join(f"<tr><td>{a}</td><td>{b}</td></tr>" for a, b in rows)


VERTRAG = kopf("Vertrag über Werbekampagnen", f"Testvertrag – Paket Komplett · Testzeitraum {TEST_VON} bis {TEST_BIS}", neu=False) + f'''
<p>zwischen</p>
<p><b>TattooLeadz.de</b>, Inhaber Andy Neelsen, Landshuter Allee 42, 80637 München, USt-IdNr. DE348150427<br>– nachfolgend „Agentur“ –</p>
<p>und</p>
<p><b>Chic Tattoo &amp; Piercing</b>, Inhaber Christoph Weiße, Ulmer Straße 14, 86154 Augsburg, Tel. 0821 24299615, E‑Mail: Lanzatattoo1@gmx.de<br>– nachfolgend „Kunde“ –</p>

<h2>§ 1 Vertragsgegenstand</h2>
<p>(1) Die Agentur plant, erstellt und betreut für den Kunden Werbekampagnen auf den Plattformen von Meta (Facebook und Instagram) mit dem Ziel, Anfragen potenzieller Tattoo-Kunden („Leads“) zu gewinnen. Die Agentur stellt die Leads in einem WhatsApp-Postfach und in einer Google-Tabelle bereit, benachrichtigt den Kunden zu jeder Anfrage per E-Mail und richtet einen WhatsApp-Assistenten mit automatisierten Nachrichten ein.</p>
<p>(2) Art und Umfang der Leistungen ergeben sich aus dem Paket in § 2 und der <b>Anlage 1 (Leistungsbeschreibung und Preise)</b>. Ergänzend gelten die <b>Allgemeinen Geschäftsbedingungen der Agentur (Anlage 2)</b> und der <b>Auftragsverarbeitungsvertrag (Anlage 3)</b>. Bei Widersprüchen gilt dieser Vertrag vor Anlage 1, Anlage 1 vor Anlage 2; für den Datenschutz geht Anlage 3 allen anderen Regelungen vor.</p>
<p>(3) Die Agentur schuldet eine fachgerechte Dienstleistung (Dienstvertrag, §§ 611 ff. BGB), aber keinen bestimmten Erfolg, insbesondere keine bestimmte Anzahl an Leads, Terminen oder Umsätzen.</p>
<p>(4) Der Kunde schließt diesen Vertrag als Unternehmer im Sinne von § 14 BGB.</p>
<p>(5) Ein bestehender Vertrag des Kunden über Tattoofin bleibt von diesem Vertrag unberührt.</p>

<h2>§ 2 Paket und Testpreis</h2>
<p class="box">☒ &nbsp;<b>Paket Komplett</b> (Listenpreis {MONAT_NETTO} netto pro Monat, Leistungen siehe Anlage 1) – zum <b>Testpreis von pauschal {TEST_BRUTTO} brutto</b> ({TEST_NETTO} netto zzgl. 19 % Umsatzsteuer {TEST_UST}) für den gesamten Testzeitraum vom {TEST_VON} bis {TEST_BIS}. Die Einrichtung ist im Testpreis enthalten; eine Einrichtungsgebühr fällt nicht an.</p>
<p>Anzahl der Standorte: 1.</p>

<h2>§ 3 Werbebudget und Werbekonto</h2>
<p>(1) Das Werbebudget ist nicht im Testpreis enthalten. Der Kunde zahlt es selbst direkt an Meta über sein eigenes Werbekonto; die Agentur stellt dafür nichts in Rechnung. Vereinbartes Tagesbudget: <b>20 € pro Tag</b>. Für den Testzeitraum sind das rund 300 €, je nach tatsächlichem Starttag; Meta kann an einzelnen Tagen etwas mehr oder weniger ausgeben und gleicht das über die Woche aus. Die Agentur stellt in der Kampagne das Enddatum 30.11.2026, 23:59 Uhr ein, sodass die Werbung ohne Fortsetzung automatisch endet.</p>
<p>(2) Der Kunde räumt der Agentur Zugriff auf sein Meta-Business-Konto bzw. Werbekonto ein (Partnerzugriff) und hinterlegt dort ein gültiges Zahlungsmittel. Das Werbekonto, die Seiten und alle Daten darin bleiben Eigentum des Kunden. Nach Vertragsende entzieht der Kunde der Agentur den Zugriff oder die Agentur gibt ihn zurück.</p>
<p>(3) Änderungen des Tagesbudgets stimmen die Parteien in Textform (z. B. WhatsApp, E-Mail) ab.</p>
<p>(4) Gebühren, die Meta für WhatsApp-Nachrichten berechnet (z. B. Vorlagen zum Erstanschreiben, Nachfassen und Erinnern), trägt im Testzeitraum die Agentur. Für eine Fortsetzung legen die Parteien in der Bestätigung nach § 5 Abs. 3 fest, wer sie trägt; ohne eine solche Festlegung trägt sie der Kunde zum Selbstkostenpreis.</p>

<h2>§ 4 Vergütung und Zahlung</h2>
<p>(1) Der Testpreis von {TEST_BRUTTO} brutto wird mit Vertragsschluss in einer Rechnung berechnet und ist innerhalb von 3 Tagen nach Rechnungsdatum ohne Abzug zu zahlen. Die Agentur beginnt mit der Einrichtung sofort. Ist die Zahlung bis zum 20.11.2026 nicht eingegangen, darf die Agentur die Kampagnen ohne weitere Mahnung bis zum Zahlungseingang pausieren; der Testzeitraum verlängert sich dadurch nicht. Alle anderen Preise in diesem Vertrag sind netto zuzüglich der gesetzlichen Umsatzsteuer angegeben; der Testpreis ist als Bruttobetrag vereinbart.</p>
<p>(2) Monatsrechnungen bei einer Fortsetzung sind innerhalb von 7 Tagen nach Rechnungsdatum ohne Abzug zu zahlen. Alle Zahlungen per Überweisung an Kreissparkasse München Starnberg Ebersberg, IBAN DE71 7025 0150 0023 6476 62, BIC BYLADEM1KMS.</p>
<p>(3) Kommt der Kunde in Zahlungsverzug, darf die Agentur nach erfolgloser Zahlungserinnerung mit einer Frist von 7 Tagen die Kampagnen bis zum Zahlungseingang pausieren. Die Pflicht zur Zahlung bleibt bestehen. Gesetzliche Verzugszinsen (§ 288 Abs. 2 BGB) und die Verzugspauschale von 40 € (§ 288 Abs. 5 BGB) bleiben vorbehalten.</p>

<h2>§ 5 Testzeitraum, Vertragsende und Fortsetzung</h2>
<p>(1) Der Vertrag beginnt mit Unterzeichnung durch beide Parteien (auch als Scan, Foto oder elektronische Signatur). Der Testzeitraum läuft vom <b>{TEST_VON} bis einschließlich {TEST_BIS}</b>. Die Agentur startet die Kampagnen, sobald Zugriff auf das Werbekonto besteht und der Kunde Aktion und Anzeigen freigegeben hat, und stellt sie spätestens 2 Werktage danach startbereit. Verzögert sich der Kampagnenstart aus Gründen, die die Agentur zu vertreten hat, verlängert sich der Testzeitraum auf Wunsch des Kunden um die Zahl der verlorenen Tage, längstens bis zum 14.12.2026; der Testpreis bleibt unverändert.</p>
<p>(2) Der Vertrag <b>endet automatisch am {TEST_BIS}</b>, ohne dass es einer Kündigung bedarf. Er verlängert sich nicht von selbst.</p>
<p>(3) Möchte der Kunde danach weitermachen, wird der Vertrag im <b>Paket Komplett zu {MONAT_NETTO} netto pro Monat</b> zzgl. 19 % Umsatzsteuer ({MONAT_UST}) = {MONAT_BRUTTO} brutto fortgesetzt, sobald beide Parteien das in Textform (z. B. WhatsApp, E-Mail) bestätigen. Liegt die Bestätigung bis zum 30.11.2026 vor, beginnt die Fortsetzung am 01.12.2026 ohne Unterbrechung. Kommt sie später, beginnt die Fortsetzung am Tag der Bestätigung; der erste angebrochene Kalendermonat wird tagesgenau anteilig berechnet. Bis zum 14.12.2026 hält die Agentur Einrichtung, Anfrage-Seite und Lead-Daten bereit (Kampagnen pausiert), damit eine Fortsetzung ohne neue Einrichtung möglich ist; AGB § 10 Abs. 2 gilt erst danach. Für die Fortsetzung gelten dann: keine Mindestlaufzeit, Abrechnung Monat für Monat im Voraus, Kündigung jederzeit zum Ende des laufenden Kalendermonats in Textform (z. B. E-Mail an info@tattooleadz.de); bereits berechnete Monate werden nicht anteilig erstattet. Eine Einrichtungsgebühr fällt bei der Fortsetzung nicht mehr an. Im Übrigen gelten die Regelungen dieses Vertrags weiter.</p>
<p>(4) Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt. Die Kündigung bedarf der Textform. Der Testpreis wird bei einer vorzeitigen Beendigung nicht anteilig erstattet, es sei denn, die Agentur hat die Beendigung zu vertreten.</p>

<h2>§ 6 Mitwirkung des Kunden</h2>
<ul><li>Der Kunde stellt die benötigten Inhalte (Bilder, Videos, Texte, Öffnungszeiten) möglichst sofort bereit, spätestens innerhalb von 2 Tagen nach Vertragsschluss, und gibt vorgelegte Anzeigen, Texte und die beworbene Aktion zeitnah in Textform frei.</li>
<li>Der Kunde richtet den Partnerzugriff auf sein Meta-Werbekonto ein und hinterlegt dort ein gültiges Zahlungsmittel.</li>
<li>Der Kunde teilt der Agentur mit, welche WhatsApp-Nummer die Anfragen bekommen soll, und gibt sie für die WhatsApp Business Platform frei (Freigabe im Meta-Business-Konto des Kunden bzw. Bestätigung per Code). Ist das bis zum Start nicht möglich, schreibt der Assistent über eine Nummer der Agentur im Namen des Studios.</li>
<li>Der Kunde meldet der Agentur freie Termine, die beworben werden dürfen, und hält diese Angaben aktuell.</li>
<li>Der Kunde reagiert auf Leads und weitergegebene Chats zeitnah, möglichst noch am selben Tag. Gerade im kurzen Testzeitraum hängt das Ergebnis wesentlich von der schnellen Kontaktaufnahme ab.</li>
<li>Verzögert sich der Start, weil Mitwirkungen fehlen, verlängert sich der Testzeitraum dadurch nicht.</li></ul>

<h2>§ 7 Inhalte und Rechte</h2>
<p>(1) Der Kunde versichert, dass er an allen übergebenen Inhalten die nötigen Rechte hat, insbesondere die Einwilligung abgebildeter Personen (Tattoo-Kunden, Models, Artists) in die Nutzung für Werbung. Er stellt die Agentur von Ansprüchen Dritter frei, die auf einer schuldhaften Verletzung dieser Zusicherung durch den Kunden beruhen, einschließlich angemessener Rechtsverteidigungskosten.</p>
<p>(2) Der Kunde räumt der Agentur das einfache, auf die Vertragslaufzeit beschränkte Recht ein, die Inhalte für die Kampagnen zu bearbeiten und zu veröffentlichen.</p>
<p>(3) An den von der Agentur erstellten Anzeigen erhält der Kunde nach vollständiger Bezahlung ein einfaches, zeitlich unbegrenztes Nutzungsrecht für eigene Werbezwecke. Vorlagen, Kampagnenkonzepte, Anfrage-Seiten, Automationen, Assistenten-Anweisungen und Nachrichtentexte bleiben Eigentum der Agentur.</p>
<p>(4) Die Agentur darf den Kunden als Referenz mit Name und Logo nennen: ☐ ja &nbsp; ☐ nein. Anonymisierte Kennzahlen ohne Studionamen (z. B. Kosten pro Anfrage) darf die Agentur in jedem Fall für eigene Werbung verwenden; § 10 steht dem nicht entgegen.</p>

<h2>§ 8 Datenschutz und Werberecht</h2>
<p>(1) Soweit die Agentur personenbezogene Daten der Leads im Auftrag des Kunden verarbeitet, gilt der Auftragsverarbeitungsvertrag (Anlage 3). Der Kunde ist gegenüber den Leads Verantwortlicher im Sinne der DSGVO.</p>
<p>(2) Die Agentur baut die Anfrage-Seite so, dass direkt über dem Absende-Knopf steht, dass das Studio die Interessenten zu ihrer Anfrage per WhatsApp oder Anruf kontaktiert und dass sie mindestens 18 Jahre alt sind; daneben stehen Links zu Datenschutzerklärung, Impressum und Aktionsbedingungen. Die erste Nachricht kann der WhatsApp-Assistent im Namen des Studios senden; er gibt sich dabei als KI zu erkennen. Die Agentur liefert Entwürfe für Impressum und Datenschutzerklärung; der Kunde liefert die Angaben dafür und prüft sie. Auf der Anfrage-Seite ist kein Meta-Pixel und kein anderes Tracking eingebunden.</p>
<p>(3) Für Inhalt und Zulässigkeit beworbener Angebote, Rabatte, Preise und Termine ist der Kunde verantwortlich. Insbesondere darf nur beworben werden, was das Studio tatsächlich einhält (z. B. freie Termine im beworbenen Zeitraum). Von der Agentur entworfene Formulierungen prüft die Agentur auf offensichtliche Werberechtsverstöße; die Entscheidung über Rabatthöhe, Bedingungen und Terminverfügbarkeit trifft der Kunde mit seiner Freigabe.</p>

<h2>§ 9 Haftung</h2>
<p>(1) Die Agentur haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit, bei Verletzung von Leben, Körper oder Gesundheit, nach dem Produkthaftungsgesetz und soweit sie eine Garantie übernommen hat.</p>
<p>(2) Bei leicht fahrlässiger Verletzung einer wesentlichen Vertragspflicht (Pflicht, deren Erfüllung den Vertrag überhaupt erst ermöglicht und auf die der Kunde regelmäßig vertrauen darf) ist die Haftung auf den bei Vertragsschluss vorhersehbaren, vertragstypischen Schaden begrenzt, höchstens jedoch auf 5.000 € je Schadensfall. Im Übrigen ist die Haftung für leichte Fahrlässigkeit ausgeschlossen.</p>
<p>(3) Die Agentur haftet nicht für Ausfälle, Sperrungen, Ablehnungen von Anzeigen oder Nachrichtenvorlagen, Richtlinienänderungen oder Abrechnungsfehler von Drittplattformen (insbesondere Meta, WhatsApp, Superchat, Google), soweit sie diese nicht zu vertreten hat.</p>

<h2>§ 10 Vertraulichkeit</h2>
<p>Beide Parteien behandeln alle nicht öffentlichen Informationen der anderen Partei (insbesondere Preise, Kampagnenergebnisse, Kundendaten) vertraulich, auch über das Vertragsende hinaus.</p>

<h2>§ 11 Schlussbestimmungen</h2>
<p>(1) Individuelle Absprachen haben Vorrang. Änderungen und Ergänzungen bedürfen mindestens der Textform.</p>
<p>(2) Ist eine Bestimmung unwirksam, bleibt der Vertrag im Übrigen wirksam. Es gilt deutsches Recht. Gerichtsstand ist München, soweit der Kunde Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen ist.</p>

<div class="ende"><h2>Individuelle Vereinbarungen</h2>
<p>Testzeitraum {TEST_VON} bis {TEST_BIS} im Paket Komplett zum Pauschalpreis von {TEST_BRUTTO} brutto ({TEST_NETTO} netto zzgl. 19 % USt {TEST_UST}), Einrichtung inklusive, Zahlung auf Rechnung per Überweisung. Werbebudget 20 € pro Tag, zahlt der Kunde selbst direkt an Meta (§ 3). Der Vertrag endet automatisch am {TEST_BIS}; eine Fortsetzung zu {MONAT_NETTO} netto pro Monat, monatlich kündbar, nur nach Bestätigung beider Seiten in Textform (§ 5). Beworben wird zunächst die Aktion „Last Minute November“ nach Freigabe durch den Kunden in Textform (Entwurf: 25 % bei Termin bis 21.11., 20 % bei Termin vom 23. bis 30.11., ab 150 € Tattoo-Wert, nur mit Code von der Aktionsseite). Rechnungen gehen per E‑Mail an Lanzatattoo1@gmx.de. Keine weiteren individuellen Vereinbarungen.</p>
<p class="klein">Anlagen: Anlage 1 Leistungsbeschreibung und Preise · Anlage 2 AGB · Anlage 3 Auftragsverarbeitungsvertrag</p>
{unterschrift("München", "TattooLeadz.de – Andy Neelsen", "Augsburg", "Chic Tattoo &amp; Piercing – Christoph Weiße")}</div>
</section>'''

ANLAGE1 = kopf("Anlage 1: Leistungsbeschreibung und Preise", "zum Vertrag über Werbekampagnen · Paket Komplett") + f'''
<h2>1. Paket im Überblick</h2>
<table class="t"><tr><th>Leistung</th><th>Chic Tattoo &amp; Piercing</th></tr>{zeilen([
("Paket", "Komplett (Listenpreis {} netto pro Monat)".format(MONAT_NETTO)),
("Testzeitraum", f"{TEST_VON} bis {TEST_BIS}, endet automatisch"),
("Testpreis", f"{TEST_BRUTTO} brutto pauschal ({TEST_NETTO} netto zzgl. 19 % USt {TEST_UST})"),
("Einrichtung", "im Testpreis enthalten"),
("Werbekonto", "Konto des Kunden"),
("Werbebudget (zahlt Kunde)", "direkt an Meta, 20 € pro Tag"),
("Meta-Werbung auf Instagram und Facebook", "✓ Einrichtung und laufende Betreuung"),
("Eigene Anfrage-Seite", "✓ 1 Aktion mit eigener Anfrage-Seite"),
("Anfragen in Google-Tabelle plus Mail", "✓ jede Anfrage in der Google-Tabelle, dazu eine Mail an Lanzatattoo1@gmx.de"),
("WhatsApp-Assistent", "✓ schreibt jede Anfrage zuerst an, für Kunden als KI erkennbar"),
("Nachfassen und Erinnerungen", "✓ automatisch"),
("Team-Postfach am Handy", "✓ alle Chats an einem Ort, zuweisen, Notizen, Kurzfassung je Chat; 1 Nutzer enthalten, im Testzeitraum weitere Nutzer ohne Aufpreis, bei Fortsetzung jeder weitere Nutzer 15 € netto pro Monat"),
("WhatsApp-Gebühren von Meta", "im Testzeitraum von der Agentur getragen"),
("Auswertung", "Wochenbericht am Sonntag: Werbekosten, Anfragen, Kosten pro Anfrage"),
("Ansprechpartner", "WhatsApp-Gruppe"),
])}</table>
<h2>2. Einrichtung (im Testpreis enthalten)</h2>
<ul><li>Abstimmung von Aktion, Stil, Region und freien Terminen des Studios</li>
<li>Einrichtung bzw. Prüfung von Werbekonto, Pixel und Kampagne</li>
<li>Anzeigenvarianten aus echten Bildern und Videos des Studios (keine KI-Bilder)</li>
<li>Eigene Anfrage-Seite mit Hinweis zur Kontaktaufnahme, Anbindung an Google-Tabelle und WhatsApp-Postfach</li>
<li>WhatsApp-Assistent, Nachrichtenvorlagen und Automationen</li></ul>
<h2>3. Laufende Betreuung im Testzeitraum</h2>
<ul><li>Kontrolle der Kampagnen mindestens zweimal pro Woche, Optimierung von Budgetverteilung, Zielgruppen und Anzeigen</li>
<li>Der WhatsApp-Assistent beantwortet die häufigsten Fragen und bietet zuerst ein kostenloses Beratungsgespräch an. Preis- und Terminfragen gibt er an das Studio weiter; verbindlich bestätigt immer ein Mensch aus dem Studio.</li>
<li>Das Studio kann jeden Chat jederzeit selbst übernehmen.</li>
<li>Support über die gemeinsame WhatsApp-Gruppe werktags von 9 bis 18 Uhr</li></ul>
<h2>4. Nicht enthalten</h2>
<ul><li>Werbebudget bei Meta (zahlt der Kunde selbst direkt an Meta)</li>
<li>Terminvereinbarung und Preisabsprachen mit den Interessenten (macht das Studio)</li>
<li>Gebietsschutz, monatlich neue Reels, Strategie-Call und TattooLeadz Kalender (nur im Paket Premium)</li>
<li>Tattoofin (separat gebucht)</li>
<li>Videodreh vor Ort, Pflege von Website, Google-Profil oder Instagram-Account</li></ul>
<h2>5. Preise bei Fortsetzung nach dem Test (netto)</h2>
<table class="t"><tr><th>Leistung</th><th>Preis</th></tr>{zeilen([
("Paket Komplett", f"{MONAT_NETTO} pro Monat zzgl. 19 % USt ({MONAT_UST}) = {MONAT_BRUTTO} brutto"),
("Einrichtung", "entfällt (bereits im Test erfolgt)"),
("Beginn", "01.12.2026 bei Bestätigung bis 30.11.2026, sonst Tag der Bestätigung, erster Monat anteilig"),
("Weitere Nutzer im Team-Postfach", "je 15,00 € pro Monat"),
("WhatsApp-Gebühren von Meta", "Regelung in der Bestätigung, sonst zahlt der Kunde zum Selbstkostenpreis"),
("Laufzeit", "keine Mindestlaufzeit, monatlich kündbar zum Monatsende"),
("Werbebudget", "zahlt der Kunde direkt an Meta, Empfehlung ab etwa 20 € pro Tag"),
])}</table></section>'''

ANLAGE2 = kopf("Allgemeine Geschäftsbedingungen", "TattooLeadz.de · für Unternehmer (B2B)") + '''
<h2>§ 1 Geltungsbereich</h2>
<p>(1) Diese AGB gelten für alle Verträge zwischen TattooLeadz.de, Inhaber Andy Neelsen, Landshuter Allee 42, 80637 München („Agentur“) und ihren Kunden über Online-Marketing-Leistungen, insbesondere Werbekampagnen auf Meta-Plattformen, Erfassung und Weiterleitung von Anfragen (Leads) sowie automatisierte Nachrichten.</p>
<p>(2) Die Agentur schließt Verträge ausschließlich mit Unternehmern im Sinne von § 14 BGB. Abweichende Bedingungen des Kunden gelten nur, wenn die Agentur ihnen ausdrücklich in Textform zustimmt.</p>
<h2>§ 2 Vertragsschluss</h2>
<p>Angebote der Agentur sind freibleibend. Der Vertrag kommt durch Unterzeichnung des Vertrags (auch elektronisch) oder durch Annahme eines Angebots in Textform zustande.</p>
<h2>§ 3 Leistungen</h2>
<p>(1) Umfang und Inhalt der Leistungen ergeben sich aus dem Vertrag und der Leistungsbeschreibung. Die Agentur erbringt Dienstleistungen; ein bestimmter wirtschaftlicher Erfolg (Anzahl Leads, Termine, Umsatz) ist nicht geschuldet, sofern nicht ausdrücklich eine Garantie vereinbart wurde.</p>
<p>(2) Die Agentur darf Subunternehmer und Software-Dienste (z. B. Meta, Google, Make, Superchat, Netlify, Supabase, Anthropic) einsetzen. Für die Verarbeitung personenbezogener Daten gilt der Auftragsverarbeitungsvertrag.</p>
<p>(3) Werbeplattformen entscheiden selbst über Freigabe, Ausspielung und Kosten von Anzeigen. Ablehnungen oder Sperren durch die Plattform sind keine Pflichtverletzung der Agentur. Die Agentur unterstützt den Kunden bei der Klärung.</p>
<h2>§ 4 Mitwirkungspflichten</h2>
<p>Der Kunde stellt Inhalte, Zugänge und Informationen rechtzeitig und vollständig bereit, prüft ihm vorgelegte Anzeigen und Texte zeitnah und bearbeitet eingehende Leads zeitnah. Kommt der Kunde einer Mitwirkung nicht nach, verschieben sich Fristen der Agentur entsprechend; der Vergütungsanspruch der Agentur bleibt bestehen.</p>
<h2>§ 5 Freigaben</h2>
<p>Anzeigen, Nachrichtentexte und beworbene Aktionen gehen erst nach Freigabe durch den Kunden in Textform (z. B. WhatsApp) online.</p>
<h2>§ 6 Preise und Zahlung</h2>
<p>(1) Es gelten die im Vertrag vereinbarten Preise. Werbebudgets bei Plattformen trägt der Kunde. Rechnungen sind innerhalb von 7 Tagen ohne Abzug fällig.</p>
<p>(2) Bei Zahlungsverzug darf die Agentur nach Mahnung mit 7-tägiger Frist ihre Leistungen bis zum Zahlungseingang zurückhalten. Der Kunde kann nur mit unbestrittenen oder rechtskräftig festgestellten Forderungen aufrechnen.</p>
<p>(3) Bei unbefristeten Verträgen kann die Agentur die Pauschalen mit einer Ankündigungsfrist von 2 Monaten zum Beginn eines Kalendermonats anpassen. Der Kunde kann den Vertrag bis zum Wirksamwerden der Änderung kündigen.</p>
<h2>§ 7 Nutzungsrechte</h2>
<p>Der Kunde erhält an den für ihn erstellten Anzeigen nach vollständiger Zahlung ein einfaches, zeitlich unbegrenztes Nutzungsrecht für eigene Werbezwecke. Konzepte, Vorlagen, Automationen, technische Abläufe, Skripte und Texte der Agentur dürfen ohne Zustimmung nicht an Dritte weitergegeben oder nach Vertragsende weiter genutzt werden.</p>
<h2>§ 8 Rechte Dritter und Werberecht</h2>
<p>Der Kunde ist dafür verantwortlich, dass beworbene Angebote, Preise, Rabatte und Aktionen zulässig sind und eingehalten werden und dass er die Rechte an übergebenen Inhalten hält (Urheber-, Marken- und Persönlichkeitsrechte, insbesondere Einwilligungen abgebildeter Personen). Er stellt die Agentur von Ansprüchen Dritter frei, die auf einer schuldhaften Verletzung dieser Pflichten durch den Kunden beruhen, einschließlich angemessener Rechtsverteidigungskosten. Das gilt nicht, soweit die Agentur die Rechtsverletzung selbst zu vertreten hat, insbesondere durch von ihr verfasste Anzeigen- oder Seitentexte.</p>
<h2>§ 9 Haftung</h2>
<p>(1) Die Agentur haftet unbeschränkt bei Vorsatz, grober Fahrlässigkeit, Verletzung von Leben, Körper oder Gesundheit, nach dem Produkthaftungsgesetz und im Umfang einer übernommenen Garantie.</p>
<p>(2) Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten haftet die Agentur begrenzt auf den bei Vertragsschluss vorhersehbaren, vertragstypischen Schaden, höchstens jedoch auf 5.000 € je Schadensfall. Im Übrigen ist die Haftung für leichte Fahrlässigkeit ausgeschlossen. Ansprüche verjähren in einem Jahr ab Kenntnis, außer in den Fällen von Absatz 1.</p>
<h2>§ 10 Laufzeit, Kündigung, Vertragsende</h2>
<p>(1) Laufzeit und Kündigungsfristen ergeben sich aus dem Vertrag. Kündigungen bedürfen der Textform.</p>
<p>(2) Nach Vertragsende stoppt die Agentur alle Kampagnen, Automationen und die Datenweiterleitung, gibt Zugänge zurück und übergibt dem Kunden auf Wunsch eine Liste der Leads aus der Vertragslaufzeit. Danach löscht sie die Lead-Daten gemäß Auftragsverarbeitungsvertrag.</p>
<h2>§ 11 Referenzen</h2>
<p>Die Agentur darf den Kunden nur mit dessen Zustimmung als Referenz nennen. Anonymisierte Kennzahlen (z. B. Kosten pro Lead ohne Studionamen) darf sie für eigene Werbung verwenden.</p>
<h2>§ 12 Schlussbestimmungen</h2>
<p>Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Gerichtsstand ist München, soweit der Kunde Kaufmann ist. Ist eine Bestimmung unwirksam, bleiben die übrigen wirksam.</p></section>'''

AVV = kopf("Auftragsverarbeitungsvertrag", "Anlage 3 zum Vertrag über Werbekampagnen · nach Art. 28 DSGVO") + f'''
<p>zwischen dem Kunden ({KUNDE}) als Verantwortlichem und {AG} als Auftragsverarbeiter (Art. 28 DSGVO).</p>
<h2>§ 1 Gegenstand und Dauer</h2>
<p>Die Agentur verarbeitet im Auftrag des Kunden personenbezogene Daten von Interessenten, die über Werbekampagnen Anfragen stellen. Die Verarbeitung dauert so lange wie der Hauptvertrag über Werbekampagnen einschließlich einer etwaigen Fortsetzung und der Bereithaltung nach § 5 Abs. 3 des Hauptvertrags; danach gilt § 7.</p>
<h2>§ 2 Art, Zweck und Betroffene</h2>
<table class="t"><tr><th>Punkt</th><th>Beschreibung</th></tr>{zeilen([
("Zweck", "Erfassung, Weiterleitung und automatisierte Erstansprache von Anfragen für Tattoo- und Piercing-Termine, Nachfassen und Terminerinnerungen"),
("Datenarten", "Vorname, Handynummer, Angaben zum Wunschtattoo (Stil, Körperstelle, ungefähre Größe, ggf. Cover-up-Wunsch, freiwillige Beschreibung der Idee), Wunschtage bzw. „flexibel“, Rabatt-Code mit Rabattstufe und Gültigkeit, Bestätigung der Kontaktaufnahme und des Mindestalters von 18 Jahren, Zeitpunkt der Anfrage, aufgerufene Seite und Kampagnen-Kennung (UTM-Parameter), technische Zugriffsdaten beim Hoster (IP-Adresse, Zeitpunkt, Browser), Chatverläufe mit dem WhatsApp-Assistenten und dem Studio, Fotos und Dateien, die Interessenten im Chat senden; ggf. weitere Angaben, die der Interessent im Chat selbst macht (z. B. E-Mail)"),
("Besondere Kategorien", "Nicht gezielt. Wählt ein Interessent „Narbe abdecken“ oder schickt er Fotos von Narben, können daraus mittelbar Gesundheitsdaten (Art. 9 DSGVO) hervorgehen. Diese Angaben werden nur zur Beurteilung des Motivs und zur Terminvereinbarung verarbeitet, nicht für Auswertungen oder Werbezielgruppen genutzt und nicht an Werbesysteme von Meta übermittelt. Der WhatsApp-Assistent fragt nicht nach Ursachen, Erkrankungen oder Allergien; nennt ein Interessent solche Angaben, übergibt er den Chat an das Studio. Für die Rechtsgrundlage ist der Kunde verantwortlich (§ 6)."),
("Betroffene", "Interessenten und Kunden des Studios, Teilnehmer an Aktionen"),
("Verarbeitungen", "Erheben über die Anfrage-Seite, Speichern in Google Sheets, Übertragen an das WhatsApp-Postfach, Versand von WhatsApp-Vorlagen, Beantwortung durch den WhatsApp-Assistenten (KI), Auswertung (anonymisiert) zur Kampagnenoptimierung, Löschen"),
])}</table>
<h2>§ 3 Weisungen</h2>
<p>Die Agentur verarbeitet die Daten nur auf dokumentierte Weisung des Kunden; der Hauptvertrag und dieser Vertrag sind diese Weisung. Das gilt auch für Übermittlungen in Drittländer; die in § 5 genannten Übermittlungen sind hiermit angewiesen. Ist die Agentur gesetzlich zu einer anderen Verarbeitung verpflichtet, teilt sie das dem Kunden vorher mit, soweit das Gesetz es nicht verbietet. Weitere Weisungen erteilt der Kunde in Textform. Hält die Agentur eine Weisung für rechtswidrig, weist sie darauf hin.</p>
<h2>§ 4 Pflichten der Agentur</h2>
<ul><li>Vertraulichkeit: Alle Personen mit Zugriff sind auf Vertraulichkeit verpflichtet.</li>
<li>Technische und organisatorische Maßnahmen nach Art. 32 DSGVO (siehe Anhang 1).</li>
<li>Unterstützung des Kunden bei allen Betroffenenrechten nach Kapitel III DSGVO (Auskunft, Berichtigung, Löschung, Einschränkung, Datenübertragbarkeit, Widerspruch); Anfragen von Betroffenen leitet die Agentur unverzüglich an den Kunden weiter.</li>
<li>Meldung von Datenschutzverletzungen an den Kunden unverzüglich, spätestens innerhalb von 24 Stunden nach Kenntnis, mit den Angaben, die der Kunde für Meldungen nach Art. 33 und 34 DSGVO braucht.</li>
<li>Unterstützung bei Datenschutz-Folgenabschätzungen und einer etwaigen vorherigen Konsultation der Aufsichtsbehörde (Art. 35, 36 DSGVO), soweit erforderlich.</li>
<li>Nachweis der Einhaltung dieses Vertrags auf Anfrage; die Agentur ermöglicht Überprüfungen und Inspektionen durch den Kunden oder einen von ihm beauftragten Prüfer und trägt dazu bei; Termine werden mit angemessener Vorankündigung abgestimmt.</li></ul>
<h2>§ 5 Unterauftragsverarbeiter</h2>
<p>Der Kunde stimmt dem Einsatz folgender Unterauftragsverarbeiter zu. Für das WhatsApp-Postfach setzt die Agentur entweder Superchat oder ihr eigenes Postfach „TattooLeadz Chat“ ein; der Kunde stimmt beiden zu. Die Agentur verpflichtet jeden Unterauftragsverarbeiter vertraglich auf Datenschutzpflichten, die diesem Vertrag entsprechen, insbesondere auf geeignete technische und organisatorische Maßnahmen (Art. 28 Abs. 4 DSGVO). Kommt ein Unterauftragsverarbeiter seinen Pflichten nicht nach, haftet die Agentur dem Kunden dafür wie für eigenes Handeln. Über neue oder ersetzte Unterauftragsverarbeiter informiert die Agentur 14 Tage vorher; der Kunde kann aus wichtigem datenschutzrechtlichen Grund widersprechen. Widerspricht er, setzt die Agentur den neuen Unterauftragsverarbeiter für ihn nicht ein; ist das nicht möglich, kann jede Partei den Hauptvertrag zum Zeitpunkt des Wechsels kündigen.</p>
<table class="t v"><tr><th>Dienst</th><th>Anbieter</th><th>Zweck</th><th>Ort</th></tr>
<tr><td>Netlify</td><td>Netlify, Inc., San Francisco, USA</td><td>Hosting der Anfrage-Seite (technische Zugriffsdaten wie IP-Adresse); die Formulardaten gehen direkt an Make und werden bei Netlify nicht gespeichert</td><td>USA (EU-US DPF, SCC)</td></tr>
<tr><td>Make</td><td>Make.com (Celonis-Gruppe; Vertragspartner laut Make-Auftragsverarbeitungsvertrag)</td><td>Datenweiterleitung Formular → Tabelle / Mail / WhatsApp-Postfach</td><td>EU-Datenzone (eu2); Zugriff aus den USA möglich (SCC, DPF)</td></tr>
<tr><td>Google Sheets</td><td>Google Ireland Ltd., Gordon House, Barrow Street, Dublin 4, Irland</td><td>Lead-Liste</td><td>EU / USA (Google-Datenverarbeitungsbedingungen mit SCC, EU-US DPF)</td></tr>
<tr><td>Superchat</td><td>SuperX GmbH, Prenzlauer Allee 242–247, 10405 Berlin</td><td>WhatsApp-Postfach, Automationen, WhatsApp-Assistent (KI)</td><td>EU (Hosting); der KI-Assistent überträgt Chatinhalte an die KI-Anbieter aus der Unterauftragsverarbeiter-Liste von Superchat, teils USA (DPF, SCC); Liste auf Anfrage</td></tr>
<tr><td>TattooLeadz Chat – Datenbank</td><td>Supabase, Inc., San Francisco, USA</td><td>Speicherung von Chats und Kontakten im Team-Postfach (nur falls statt Superchat genutzt)</td><td>EU (Frankfurt, eu-central-1); Zugriff USA möglich (DPF, SCC)</td></tr>
<tr><td>TattooLeadz Chat – KI</td><td>Anthropic PBC, San Francisco, USA</td><td>Antworten und Kurzfassungen des WhatsApp-Assistenten (nur falls statt Superchat genutzt)</td><td>USA (DPF, SCC)</td></tr>
<tr><td>WhatsApp Business Platform</td><td>Meta Platforms Ireland Ltd., Dublin (über Superchat)</td><td>Nachrichtenversand</td><td>EU / USA (DPF, SCC)</td></tr></table>
<p class="klein">Hinweis: Auf der Anfrage-Seite ist kein Meta-Pixel und kein anderes Tracking eingebunden. Für die Ausspielung der Werbung und für Messungen innerhalb von Facebook und Instagram sind Meta und der Kunde als Werbetreibender nach den Meta-Nutzungsbedingungen verantwortlich; dafür gilt dieser Vertrag nicht.</p>
<h2>§ 6 Pflichten des Kunden</h2>
<p>Der Kunde ist für die Rechtmäßigkeit der Verarbeitung verantwortlich, insbesondere für die Rechtsgrundlage (Vertragsanbahnung bzw. Einwilligung), seine Datenschutzerklärung und die Information der Betroffenen. Die Agentur stellt dafür Textbausteine für Anfrage-Seite und Datenschutzhinweis bereit.</p>
<h2>§ 7 Löschung und Rückgabe</h2>
<p>Nach Ende des Hauptvertrags (einschließlich der Bereithaltung bis 14.12.2026) übergibt die Agentur dem Kunden auf Wunsch die Lead-Daten als Tabelle und löscht sie anschließend innerhalb von 30 Tagen bei sich und den Unterauftragsverarbeitern, soweit diese Daten in ihrem Zugriff liegen und keine gesetzliche Aufbewahrungspflicht besteht; Nachrichten auf den Geräten der Interessenten sind ausgenommen. Während der Laufzeit löscht die Agentur Leads, die nicht zum Kunden werden, spätestens zu dem in der Datenschutzerklärung der jeweiligen Anfrage-Seite genannten Zeitpunkt (für die Aktion „Last Minute November“: 31.01.2027), in jedem Fall spätestens 12 Monate nach Eingang.</p>
<h2>§ 8 Haftung und Schluss</h2>
<p>Für die Haftung gilt Art. 82 DSGVO; im Innenverhältnis gelten die Regelungen des Hauptvertrags. Bei Widersprüchen geht dieser Vertrag den Regelungen des Hauptvertrags zum Datenschutz vor.</p>
<h2>Anhang 1: Technische und organisatorische Maßnahmen (Kurzfassung)</h2>
<ul><li>Zugang zu Google-, Meta-, Make-, Netlify-, Supabase- und Superchat-Konten nur mit persönlichen Logins und Zwei-Faktor-Authentifizierung</li>
<li>Freigaben von Sheets nur für namentlich benannte Personen, keine „Jeder mit Link“-Freigaben für Lead-Listen</li>
<li>Rollen und Rechte: Kunden sehen nur eigene Leads, Mitarbeiter nur betreute Kunden</li>
<li>Übertragung nur verschlüsselt (HTTPS); Formulardaten werden auf der Anfrage-Seite nicht dauerhaft gespeichert</li>
<li>Geräte mit Bildschirmsperre und Festplattenverschlüsselung, aktuelle Updates</li>
<li>Datenminimierung: im Formular nur abfragen, was für die Terminvereinbarung nötig ist</li>
<li>Protokoll aller Personen mit Zugriff, Entzug von Zugängen beim Ausscheiden am selben Tag</li>
<li>Regelmäßige Löschroutine laut § 7</li></ul>
{unterschrift("Augsburg", "Chic Tattoo &amp; Piercing – Christoph Weiße (Verantwortlicher)", "München", "TattooLeadz.de – Andy Neelsen (Auftragsverarbeiter)")}
</section>'''

CSS = """
*{box-sizing:border-box}body{font:10.5pt/1.38 Arial,Helvetica,sans-serif;color:#111;margin:0}
section{position:relative}section.neu{break-before:page}
.logo{position:absolute;right:0;top:-8mm;width:24mm}
h1{font-size:17pt;margin:12mm 0 2mm}h2{font-size:12.5pt;margin:5mm 0 2mm;break-after:avoid}
.unter{color:#555;margin:0 30mm 1mm 0}.fassung{color:#777;font-size:8.5pt;margin:0 0 3mm}
p{margin:0 0 2mm;text-align:left}ul{margin:0 0 2mm;padding-left:5mm}li{margin:0 0 1mm}
.box{padding-left:4mm}.ende{break-inside:avoid}.klein{font-size:9pt;color:#444}
table.t{border-collapse:collapse;width:100%;margin:0 0 3mm;font-size:9.5pt}
table.t th{background:#111;color:#fff;text-align:left;padding:1.4mm 2mm}
table.t td{border:0.3mm solid #bbb;padding:1.4mm 2mm;vertical-align:top}table.t tr{break-inside:avoid}
table.t td:first-child{width:42%}table.v td:first-child{width:18%}table.v td:nth-child(2){width:28%}
table.sig{width:100%;margin-top:9mm;break-inside:avoid;font-size:10pt}table.sig td{width:50%;padding:1mm 3mm 1mm 0;vertical-align:top}.linie{padding-top:11mm!important}
"""
html = f'<!doctype html><html lang="de"><meta charset="utf-8"><title>Testvertrag Chic Tattoo Augsburg</title><style>{CSS}</style><body>{VERTRAG}{ANLAGE1}{ANLAGE2}{AVV}</body></html>'
(HIER / "vertrag.html").write_text(html, encoding="utf8")
FOOT = """<div style="width:100%;font:7pt Arial;color:#777;text-align:center;padding:0 14mm">TattooLeadz.de · Inhaber Andy Neelsen · Landshuter Allee 42 · 80637 München · USt-IdNr. DE348150427 · Kreissparkasse München Starnberg Ebersberg · IBAN DE71 7025 0150 0023 6476 62 · BIC BYLADEM1KMS<br>Testvertrag Chic Tattoo &amp; Piercing Augsburg · Blatt <span class="pageNumber"></span> von <span class="totalPages"></span></div>"""
OUT = HIER / "Chic-Tattoo-Augsburg-Testvertrag-zum-Unterschreiben.pdf"
with sync_playwright() as p:
    b = p.chromium.launch(); g = b.new_page()
    g.goto((HIER / "vertrag.html").as_uri()); g.wait_for_timeout(300)
    g.pdf(path=str(OUT), format="A4", print_background=True, display_header_footer=True, header_template="<span></span>", footer_template=FOOT, margin={"top": "18mm", "bottom": "20mm", "left": "20mm", "right": "20mm"})
    b.close()
print("ok", OUT)
