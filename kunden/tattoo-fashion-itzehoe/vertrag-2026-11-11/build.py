#!/usr/bin/env python3
"""Vertragspaket Tattoo Fashion Itzehoe. Aufruf: pw-python build.py -> Tattoo-Fashion-Itzehoe-Vertrag-zum-Unterschreiben.pdf"""
import base64, glob
from pathlib import Path
from playwright.sync_api import sync_playwright

HIER = Path(__file__).resolve().parent
logo = sorted(glob.glob(str(HIER / "img/*")))[0]
LOGO = f"data:image/{Path(logo).suffix[1:].replace('jpg','jpeg')};base64," + base64.b64encode(Path(logo).read_bytes()).decode()

AG = "TattooLeadz.de, Inhaber Andy Neelsen, Landshuter Allee 42, 80637 München"
KURZ = "Tattoo Fashion Itzehoe, Feldschmiede 4, 25524 Itzehoe"
FASSUNG = f"Fassung vom 11.11.2026 · Kunde: {KURZ}"

def kopf(titel, unter, neu=True):
    return f'<section class="{"neu" if neu else ""}"><img class="logo" src="{LOGO}"><h1>{titel}</h1><p class="unter">{unter}</p><p class="fassung">{FASSUNG}</p>'

def unterschrift(l1, l2, r1, r2):
    return f'''<table class="sig"><tr><td>Ort, Datum: {l1}, ______________</td><td>Ort, Datum: {r1}, ______________</td></tr>
<tr><td class="linie">____________________________________</td><td class="linie">____________________________________</td></tr>
<tr><td>{l2}</td><td>{r2}</td></tr></table>'''

VERTRAG = kopf("Vertrag über Werbekampagnen", "Rahmenvertrag – Betreuung mit WhatsApp-Postfach", neu=False) + f'''
<p>zwischen</p>
<p><b>TattooLeadz.de</b>, Inhaber Andy Neelsen, Landshuter Allee 42, 80637 München, USt-IdNr. DE348150427<br>– nachfolgend „Agentur“ –</p>
<p>und</p>
<p><b>Tattoo Fashion Itzehoe</b>, Feldschmiede 4, 25524 Itzehoe, vertreten durch: ______________________________, Tel. +49 4821 9499356, E‑Mail: tattoofashionitzehoe@gmail.com, Rechnungen an: invoice.tfitzehoe@gmx.de<br>– nachfolgend „Kunde“ –</p>
<h2>§ 1 Vertragsgegenstand</h2>
<p>(1) Die Agentur plant, erstellt und betreut für den Kunden Werbekampagnen auf den Plattformen von Meta (Facebook und Instagram) mit dem Ziel, Anfragen potenzieller Tattoo-Kunden („Leads“) zu gewinnen. Die Agentur stellt die Leads in einem WhatsApp-Postfach (derzeit Superchat) und in einer Google-Tabelle bereit und richtet automatisierte WhatsApp-Nachrichten ein.</p>
<p>(2) Art und Umfang der Leistungen ergeben sich aus dem nachfolgend gewählten Paket und der <b>Anlage 1 (Leistungsbeschreibung und Preise)</b>. Ergänzend gelten die <b>Allgemeinen Geschäftsbedingungen der Agentur (Anlage 2)</b> und der <b>Auftragsverarbeitungsvertrag (Anlage 3)</b>. Bei Widersprüchen gilt dieser Vertrag vor Anlage 1, Anlage 1 vor Anlage 2.</p>
<p>(3) Die Agentur schuldet eine fachgerechte Dienstleistung (Dienstvertrag, §§ 611 ff. BGB), aber keinen bestimmten Erfolg, insbesondere keine bestimmte Anzahl an Leads, Terminen oder Umsätzen. Eine Lead-Garantie gilt nur, wenn sie gesondert schriftlich vereinbart ist (Zusatzvereinbarung Lead-Garantie).</p>
<p>(4) Der Kunde schließt diesen Vertrag als Unternehmer im Sinne von § 14 BGB.</p>
<h2>§ 2 Gewähltes Paket</h2>
<p class="box">☒ &nbsp;<b>Betreuung mit WhatsApp-Postfach</b> (Leistungen siehe Anlage 1). Vergütung 750,00 € netto pro Monat zzgl. 19 % Umsatzsteuer (142,50 €) = 892,50 € brutto pro Monat. Einmalige Einrichtung 299,00 € netto zzgl. 19 % Umsatzsteuer (56,81 €) = 355,81 € brutto. Abrechnung Monat für Monat. Inklusive 1 Nutzer im WhatsApp-Postfach, jeder weitere Nutzer 15,00 € netto pro Monat (Anzahl weiterer Nutzer: 0).</p>
<p>Anzahl der Standorte: 1. Die Vergütung gilt pro Standort.</p>
<h2>§ 3 Werbebudget und Werbekonto</h2>
<p>(1) Das Werbebudget ist nicht in der Vergütung der Agentur enthalten. Der Kunde zahlt es selbst direkt an Meta über sein eigenes Werbekonto; die Agentur stellt dafür nichts in Rechnung. Vereinbartes Tagesbudget: 20 € (Mindestbudget 20 € pro Tag).</p>
<p>(2) Der Kunde räumt der Agentur Zugriff auf sein Meta-Business-Konto bzw. Werbekonto ein (Partnerzugriff). Das Werbekonto, die Seiten und alle Daten darin bleiben Eigentum des Kunden. Nach Vertragsende entzieht der Kunde der Agentur den Zugriff oder die Agentur gibt ihn zurück.</p>
<p>(3) Änderungen des Tagesbudgets stimmen die Parteien in Textform (z. B. WhatsApp, E-Mail) ab.</p>
<h2>§ 4 Vergütung und Zahlung</h2>
<p>(1) Die Einrichtungsgebühr wird mit Vertragsschluss fällig. Die monatliche Betreuungspauschale wird ab Kampagnenstart Monat für Monat jeweils im Voraus für den laufenden Monat berechnet; eine Vorauszahlung für die gesamte Mindestlaufzeit erfolgt nicht. Alle Preise verstehen sich zuzüglich der gesetzlichen Umsatzsteuer.</p>
<p>(2) Rechnungen sind innerhalb von 7 Tagen nach Rechnungsdatum ohne Abzug zu zahlen, per Überweisung an Kreissparkasse München Starnberg Ebersberg, IBAN DE71 7025 0150 0023 6476 62, BIC BYLADEM1KMS.</p>
<p>(3) Kommt der Kunde in Zahlungsverzug, darf die Agentur nach erfolgloser Zahlungserinnerung mit einer Frist von 7 Tagen die Kampagnen bis zum Zahlungseingang pausieren. Die Pflicht zur Zahlung der Pauschale bleibt bestehen. Gesetzliche Verzugszinsen (§ 288 Abs. 2 BGB) und die Verzugspauschale von 40 € (§ 288 Abs. 5 BGB) bleiben vorbehalten.</p>
<h2>§ 5 Laufzeit und Kündigung</h2>
<p>(1) Der Vertrag beginnt mit Unterzeichnung. Die Laufzeit beginnt mit dem Tag, an dem die erste Anzeige live geht (Kampagnenstart), spätestens jedoch 14 Tage nach vollständiger Übergabe aller Unterlagen durch den Kunden.</p>
<p>(2) Mindestlaufzeit: 3 Monate.</p>
<p>(3) Nach Ablauf der Mindestlaufzeit verlängert sich der Vertrag jeweils um weitere 3 Monate, wenn er nicht mit einer Frist von einem Monat zum Ende der jeweiligen Laufzeit gekündigt wird.</p>
<p>(4) Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt. Die Kündigung bedarf der Textform (z. B. E-Mail).</p>
<h2>§ 6 Pausierung</h2>
<p>(1) Der Kunde kann die Kampagnen einmal pro Kalenderjahr für bis zu 4 Wochen pausieren (z. B. Urlaub, volle Auftragsbücher). Den Zeitraum stimmen die Parteien mindestens 7 Tage vorher in Textform ab.</p>
<p>(2) Während der Pause entfällt die Betreuungspauschale anteilig, die Laufzeit verlängert sich um die Dauer der Pause. Lizenzkosten für das WhatsApp-Postfach laufen weiter (15,00 € netto pro Nutzer und Monat) oder der Zugang wird pausiert; dann fällt bei Reaktivierung eine Gebühr von 69,00 € netto an.</p>
<h2>§ 7 Mitwirkung des Kunden</h2>
<ul><li>Der Kunde stellt innerhalb von 7 Tagen nach Vertragsschluss alle benötigten Inhalte bereit (Logo, Bilder, Videos, Texte, Preise, Öffnungszeiten) und dreht Reels nach den TattooLeadz Reel-Vorgaben.</li>
<li>Der Kunde richtet den Partnerzugriff auf sein Meta-Werbekonto ein und hinterlegt dort ein gültiges Zahlungsmittel.</li>
<li>Der Kunde reagiert auf Leads zeitnah, möglichst innerhalb von 24 Stunden. Die Lead-Qualität hängt wesentlich von der schnellen Kontaktaufnahme ab.</li>
<li>Der Kunde informiert die Agentur über Angebote, Preise und Termine, die beworben werden dürfen, und über deren Änderungen.</li>
<li>Verzögert sich der Start, weil Mitwirkungen fehlen, verschieben sich die Fristen der Agentur entsprechend.</li></ul>
<h2>§ 8 Inhalte und Rechte</h2>
<p>(1) Der Kunde versichert, dass er an allen übergebenen Inhalten die nötigen Rechte hat, insbesondere die Einwilligung abgebildeter Personen (Tattoo-Kunden, Models, Artists). Er stellt die Agentur von Ansprüchen Dritter frei, die auf einer Verletzung dieser Zusicherung beruhen, einschließlich angemessener Rechtsverteidigungskosten.</p>
<p>(2) Der Kunde räumt der Agentur das einfache, auf die Vertragslaufzeit beschränkte Recht ein, die Inhalte für die Kampagnen zu bearbeiten und zu veröffentlichen.</p>
<p>(3) An den von der Agentur erstellten Anzeigen erhält der Kunde nach vollständiger Bezahlung ein einfaches, zeitlich unbegrenztes Nutzungsrecht für eigene Werbezwecke. Vorlagen, Kampagnenkonzepte (z. B. Glücksrad, Wunsch-Tattoo-Aktion, Slotmachine), Automationen und Nachrichtentexte bleiben Eigentum der Agentur.</p>
<p>(4) Die Agentur darf den Kunden als Referenz nennen (Name, Logo, anonymisierte Kampagnenergebnisse): ☐ ja &nbsp; ☐ nein</p>
<h2>§ 9 Datenschutz und Werberecht</h2>
<p>(1) Soweit die Agentur personenbezogene Daten der Leads im Auftrag des Kunden verarbeitet, gilt der Auftragsverarbeitungsvertrag (Anlage 3). Der Kunde ist gegenüber den Leads Verantwortlicher im Sinne der DSGVO.</p>
<p>(2) Die Agentur baut die Lead-Formulare so, dass Interessenten der Kontaktaufnahme per WhatsApp und Telefon ausdrücklich zustimmen. Für Inhalt und Zulässigkeit beworbener Angebote, Preise und Gewinnspiele ist der Kunde verantwortlich. Für Gewinnspiel-Aktionen stellt die Agentur eine Vorlage für Teilnahmebedingungen bereit, die der Kunde prüft und freigibt.</p>
<h2>§ 10 Haftung</h2>
<p>(1) Die Agentur haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit, bei Verletzung von Leben, Körper oder Gesundheit, nach dem Produkthaftungsgesetz und soweit sie eine Garantie übernommen hat.</p>
<p>(2) Bei leicht fahrlässiger Verletzung einer wesentlichen Vertragspflicht (Pflicht, deren Erfüllung den Vertrag überhaupt erst ermöglicht und auf die der Kunde regelmäßig vertrauen darf) ist die Haftung auf den vorhersehbaren, vertragstypischen Schaden begrenzt, höchstens auf die vom Kunden in den letzten 12 Monaten gezahlte Vergütung. Im Übrigen ist die Haftung für leichte Fahrlässigkeit ausgeschlossen.</p>
<p>(3) Die Agentur haftet nicht für Ausfälle, Sperrungen, Richtlinienänderungen oder Abrechnungsfehler von Drittplattformen (insbesondere Meta, WhatsApp, Superchat, Google), soweit sie diese nicht zu vertreten hat.</p>
<h2>§ 11 Vertraulichkeit</h2>
<p>Beide Parteien behandeln alle nicht öffentlichen Informationen der anderen Partei (insbesondere Preise, Kampagnenergebnisse, Kundendaten) vertraulich, auch über das Vertragsende hinaus.</p>
<h2>§ 12 Schlussbestimmungen</h2>
<p>(1) Individuelle Absprachen haben Vorrang. Änderungen und Ergänzungen bedürfen mindestens der Textform.</p>
<p>(2) Ist eine Bestimmung unwirksam, bleibt der Vertrag im Übrigen wirksam. Es gilt deutsches Recht. Gerichtsstand ist München, soweit der Kunde Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen ist.</p>
<h2>Individuelle Vereinbarungen</h2>
<p>Vergütung: 750,00 € netto pro Monat zzgl. 19 % USt (142,50 €) = 892,50 € brutto pro Monat, einmalige Einrichtung 299,00 € netto zzgl. 19 % USt (56,81 €) = 355,81 € brutto, Abrechnung Monat für Monat ab Kampagnenstart, Zahlung auf Rechnung per Überweisung. Mindestlaufzeit 3 Monate, Verlängerung und Kündigung nach § 5. Das Werbebudget zahlt der Kunde selbst direkt an Meta (§ 3). Rechnungen gehen per E‑Mail an invoice.tfitzehoe@gmx.de. Vertragsbeginn mit Unterzeichnung, Kampagnenstart nach vollständiger Übergabe der Unterlagen (§ 5 Abs. 1). Keine weiteren individuellen Vereinbarungen.</p>
<p class="klein">Anlagen: Anlage 1 Leistungsbeschreibung und Preise · Anlage 2 AGB · Anlage 3 Auftragsverarbeitungsvertrag</p>
{unterschrift("München", "TattooLeadz.de – Andy Neelsen", "Itzehoe", "Tattoo Fashion Itzehoe – Name in Druckbuchstaben / Unterschrift")}
</section>'''

def zeilen(rows):
    return "".join(f"<tr><td>{a}</td><td>{b}</td></tr>" for a, b in rows)

ANLAGE1 = kopf("Anlage 1: Leistungsbeschreibung und Preise", "zum Vertrag über Werbekampagnen · Preise zzgl. gesetzlicher Umsatzsteuer") + f'''
<h2>1. Paket im Überblick</h2>
<table class="t"><tr><th>Leistung</th><th>Tattoo Fashion Itzehoe</th></tr>{zeilen([
("Laufzeit","Mindestens 3 Monate, Abrechnung Monat für Monat"),
("Einrichtung (einmalig)","299 € netto (zzgl. 19 % USt 56,81 € = 355,81 € brutto)"),
("Betreuung pro Monat","750 € netto (zzgl. 19 % USt 142,50 € = 892,50 € brutto)"),
("Werbekonto","Konto des Kunden"),
("Werbebudget (zahlt Kunde)","zahlt der Kunde selbst direkt an Meta, mind. 20 € / Tag"),
("Anzeigen aus Kundenmaterial","laufend, mehrere Aktionen"),
("Eigene Anfrage-Seite","✓ Motiv, Körperstelle, Größe und Budget werden mit abgefragt"),
("Lead-Übergabe","WhatsApp-Postfach (derzeit Superchat) und Google-Tabelle"),
("Automatische WhatsApp-Erstnachricht an jeden Lead","✓"),
("Automatisches Nachfassen","✓"),
("Nutzer im WhatsApp-Postfach","1 inklusive, weitere je 15 € netto / Monat"),
("Auswertung","laufend, mit Anpassung der Anzeigen"),
("Ansprechpartner","WhatsApp-Gruppe"),
])}</table>
<h2>2. Einrichtung</h2>
<ul><li>Kick-off-Gespräch: Zielgruppe, Stil, Angebote, Region, Kapazität des Studios</li>
<li>Anlage bzw. Prüfung von Meta-Business-Konto, Werbekonto, Pixel/Lead-Formular</li>
<li>Auswahl der Kampagnenidee (z. B. Glücksrad, Wunsch-Tattoo-Aktion, Tattoo-Model gesucht, Slotmachine, Azubi-Recruiting)</li>
<li>Erstellung von 3 bis 5 Anzeigenvarianten aus Bildern und Reels des Kunden</li>
<li>Eigene Anfrage-Seite mit Einwilligung zur Kontaktaufnahme, Anbindung an Google-Tabelle und WhatsApp-Postfach</li>
<li>Einrichtung des WhatsApp-Postfachs auf dem Smartphone des Kunden, der WhatsApp-Vorlagen, Automationen</li>
<li>Start in der Regel 5 Werktage nach vollständiger Übergabe aller Unterlagen</li></ul>
<h2>3. Laufende Betreuung</h2>
<ul><li>Laufende Optimierung: Kontrolle der Kampagnen mindestens zweimal pro Woche, Budget- und Zielgruppenoptimierung</li>
<li>Neue Anzeigenmotive, sobald Kosten pro Lead steigen oder Material veraltet ist</li>
<li>Bis zu 2 neue Aktionen/Kampagnenideen pro Quartal</li>
<li>Auswertung der Kampagnenergebnisse: Anfragen, Werbekosten, Kosten pro Anfrage</li>
<li>Die automatischen Nachrichten bieten zuerst ein kostenloses Beratungsgespräch an; Preis- und Terminfragen beantwortet das Studio selbst.</li>
<li>Support über die gemeinsame WhatsApp-Gruppe werktags von 9 bis 18 Uhr</li></ul>
<h2>4. Nicht enthalten</h2>
<ul><li>Werbebudget bei Meta (zahlt der Kunde selbst direkt an Meta)</li>
<li>Videodreh vor Ort (optional buchbar: Preis auf Anfrage)</li>
<li>Persönliche Beantwortung der Leads und Terminvereinbarung durch die Agentur (außer den automatisierten Nachrichten)</li>
<li>Pflege von Website, Google-Profil oder organischem Instagram-Account (auf Anfrage)</li></ul>
<h2>5. Zusatzleistungen (netto)</h2>
<table class="t"><tr><th>Leistung</th><th>Preis</th></tr>{zeilen([
("Weiterer Nutzer im WhatsApp-Postfach","15 € / Monat"),
("Reaktivierung des WhatsApp-Postfachs nach Pause","69 € einmalig"),
("Weiterer Standort","monatliche Pauschale je Standort"),
("Videodreh vor Ort","auf Anfrage"),
("Zusätzliche Kampagnenidee außerhalb des Kontingents","auf Anfrage"),
])}</table></section>'''

ANLAGE2 = kopf("Allgemeine Geschäftsbedingungen", "TattooLeadz.de · für Unternehmer (B2B)") + '''
<h2>§ 1 Geltungsbereich</h2>
<p>(1) Diese AGB gelten für alle Verträge zwischen TattooLeadz.de, Inhaber Andy Neelsen, Landshuter Allee 42, 80637 München („Agentur“) und ihren Kunden über Online-Marketing-Leistungen, insbesondere Werbekampagnen auf Meta-Plattformen, Erfassung und Weiterleitung von Anfragen (Leads) sowie automatisierte Nachrichten.</p>
<p>(2) Die Agentur schließt Verträge ausschließlich mit Unternehmern im Sinne von § 14 BGB. Abweichende Bedingungen des Kunden gelten nur, wenn die Agentur ihnen ausdrücklich in Textform zustimmt.</p>
<h2>§ 2 Vertragsschluss</h2>
<p>Angebote der Agentur sind freibleibend. Der Vertrag kommt durch Unterzeichnung des Vertrags (auch elektronisch, z. B. per DocuSign) oder durch Annahme eines Angebots in Textform zustande.</p>
<h2>§ 3 Leistungen</h2>
<p>(1) Umfang und Inhalt der Leistungen ergeben sich aus dem Vertrag und der Leistungsbeschreibung. Die Agentur erbringt Dienstleistungen; ein bestimmter wirtschaftlicher Erfolg (Anzahl Leads, Termine, Umsatz) ist nicht geschuldet, sofern nicht ausdrücklich eine Garantie vereinbart wurde.</p>
<p>(2) Die Agentur darf Subunternehmer und Software-Dienste (z. B. Meta, Google, Make, Superchat) einsetzen. Für die Verarbeitung personenbezogener Daten gilt der Auftragsverarbeitungsvertrag.</p>
<p>(3) Werbeplattformen entscheiden selbst über Freigabe, Ausspielung und Kosten von Anzeigen. Ablehnungen oder Sperren durch die Plattform sind keine Pflichtverletzung der Agentur. Die Agentur unterstützt den Kunden bei der Klärung.</p>
<h2>§ 4 Mitwirkungspflichten</h2>
<p>Der Kunde stellt Inhalte, Zugänge und Informationen rechtzeitig und vollständig bereit, prüft ihm vorgelegte Anzeigen und Texte innerhalb von 3 Werktagen und bearbeitet eingehende Leads zeitnah. Kommt der Kunde einer Mitwirkung nicht nach, verschieben sich Fristen entsprechend; der Vergütungsanspruch der Agentur bleibt bestehen.</p>
<h2>§ 5 Freigaben</h2>
<p>Legt die Agentur Anzeigen oder Nachrichtentexte zur Freigabe vor und äußert sich der Kunde nicht innerhalb von 3 Werktagen, gelten sie als freigegeben. Die Agentur weist bei Vorlage auf diese Folge hin.</p>
<h2>§ 6 Preise und Zahlung</h2>
<p>(1) Es gelten die im Vertrag vereinbarten Preise zuzüglich gesetzlicher Umsatzsteuer. Werbebudgets bei Plattformen trägt der Kunde. Rechnungen sind innerhalb von 7 Tagen ohne Abzug fällig.</p>
<p>(2) Bei Zahlungsverzug darf die Agentur nach Mahnung mit 7-tägiger Frist ihre Leistungen bis zum Zahlungseingang zurückhalten. Der Kunde kann nur mit unbestrittenen oder rechtskräftig festgestellten Forderungen aufrechnen.</p>
<p>(3) Die Agentur kann die Pauschalen mit einer Ankündigungsfrist von 2 Monaten zum Beginn einer Verlängerungsperiode anpassen. Bei einer Erhöhung um mehr als 5 % kann der Kunde den Vertrag zum Zeitpunkt der Erhöhung kündigen.</p>
<h2>§ 7 Nutzungsrechte</h2>
<p>Der Kunde erhält an den für ihn erstellten Anzeigen nach vollständiger Zahlung ein einfaches, zeitlich unbegrenztes Nutzungsrecht für eigene Werbezwecke. Konzepte, Vorlagen, Automationen, technische Abläufe, Skripte und Texte der Agentur dürfen ohne Zustimmung nicht an Dritte weitergegeben oder nach Vertragsende weiter genutzt werden.</p>
<h2>§ 8 Rechte Dritter und Werberecht</h2>
<p>Der Kunde ist dafür verantwortlich, dass beworbene Angebote, Preise, Rabatte und Gewinnspiele zulässig sind und dass er die Rechte an übergebenen Inhalten hält (Urheber-, Marken- und Persönlichkeitsrechte, insbesondere Einwilligungen abgebildeter Personen). Er stellt die Agentur von Ansprüchen Dritter frei, die auf einer Verletzung dieser Pflichten beruhen.</p>
<h2>§ 9 Haftung</h2>
<p>(1) Die Agentur haftet unbeschränkt bei Vorsatz, grober Fahrlässigkeit, Verletzung von Leben, Körper oder Gesundheit, nach dem Produkthaftungsgesetz und im Umfang einer übernommenen Garantie.</p>
<p>(2) Bei leicht fahrlässiger Verletzung wesentlicher Vertragspflichten haftet die Agentur begrenzt auf den vorhersehbaren, vertragstypischen Schaden, höchstens bis zur Höhe der in den letzten 12 Monaten gezahlten Vergütung. Im Übrigen ist die Haftung für leichte Fahrlässigkeit ausgeschlossen. Ansprüche verjähren in einem Jahr ab Kenntnis, außer in den Fällen von Absatz 1.</p>
<h2>§ 10 Laufzeit, Kündigung, Vertragsende</h2>
<p>(1) Laufzeit und Kündigungsfristen ergeben sich aus dem Vertrag. Kündigungen bedürfen der Textform.</p>
<p>(2) Nach Vertragsende stoppt die Agentur alle Kampagnen, Automationen und die Datenweiterleitung, gibt Zugänge zurück und übergibt dem Kunden auf Wunsch eine Liste der Leads aus der Vertragslaufzeit. Danach löscht sie die Lead-Daten gemäß Auftragsverarbeitungsvertrag.</p>
<h2>§ 11 Referenzen</h2>
<p>Die Agentur darf den Kunden nur mit dessen Zustimmung als Referenz nennen. Anonymisierte Kennzahlen (z. B. Kosten pro Lead ohne Studionamen) darf sie für eigene Werbung verwenden.</p>
<h2>§ 12 Schlussbestimmungen</h2>
<p>Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Gerichtsstand ist München, soweit der Kunde Kaufmann ist. Ist eine Bestimmung unwirksam, bleiben die übrigen wirksam.</p></section>'''

AVV = kopf("Auftragsverarbeitungsvertrag", "Anlage 3 zum Vertrag über Werbekampagnen · nach Art. 28 DSGVO") + f'''
<p>zwischen dem Kunden (Tattoo Fashion Itzehoe, Feldschmiede 4, 25524 Itzehoe) als Verantwortlichem und {AG}, als Auftragsverarbeiter (Art. 28 DSGVO).</p>
<h2>§ 1 Gegenstand und Dauer</h2>
<p>Die Agentur verarbeitet im Auftrag des Kunden personenbezogene Daten von Interessenten, die über Werbekampagnen Anfragen stellen. Die Verarbeitung dauert so lange wie der Hauptvertrag über Werbekampagnen.</p>
<h2>§ 2 Art, Zweck und Betroffene</h2>
<table class="t"><tr><th>Punkt</th><th>Beschreibung</th></tr>{zeilen([
("Zweck","Erfassung, Weiterleitung und automatisierte Erstansprache von Anfragen für Tattoo-/Piercing-Termine"),
("Datenarten","Name, Telefonnummer, ggf. E-Mail, Wohnort/PLZ, Angaben zum Wunschmotiv (Größe, Körperstelle, Stil, Budget), Chatverläufe, Zeitpunkt und Quelle der Anfrage, Einwilligungsnachweis"),
("Besondere Kategorien","Grundsätzlich keine. Der Kunde stellt sicher, dass keine Gesundheitsdaten (z. B. Allergien, Narben aus medizinischen Gründen) über die Formulare abgefragt werden."),
("Betroffene","Interessenten und Kunden des Studios, Teilnehmer an Aktionen und Gewinnspielen"),
("Verarbeitungen","Erheben über Lead-Formulare, Speichern in Google Sheets, Übertragen an das WhatsApp-Postfach, Versand von WhatsApp-Vorlagen, Auswertung (anonymisiert) zur Kampagnenoptimierung, Löschen"),
])}</table>
<h2>§ 3 Weisungen</h2>
<p>Die Agentur verarbeitet die Daten nur auf dokumentierte Weisung des Kunden; der Hauptvertrag und dieser Vertrag sind diese Weisung. Weitere Weisungen erteilt der Kunde in Textform. Hält die Agentur eine Weisung für rechtswidrig, weist sie darauf hin.</p>
<h2>§ 4 Pflichten der Agentur</h2>
<ul><li>Vertraulichkeit: Alle Personen mit Zugriff sind auf Vertraulichkeit verpflichtet.</li>
<li>Technische und organisatorische Maßnahmen nach Art. 32 DSGVO (siehe Anhang 1).</li>
<li>Unterstützung des Kunden bei Auskunft, Berichtigung, Löschung und Widerspruch von Betroffenen.</li>
<li>Meldung von Datenschutzverletzungen an den Kunden unverzüglich, spätestens innerhalb von 24 Stunden nach Kenntnis.</li>
<li>Unterstützung bei Datenschutz-Folgenabschätzungen, soweit erforderlich.</li>
<li>Nachweis der Einhaltung dieses Vertrags auf Anfrage; Kontrollen nach Absprache mit angemessener Vorankündigung.</li></ul>
<h2>§ 5 Unterauftragsverarbeiter</h2>
<p>Der Kunde stimmt dem Einsatz folgender Unterauftragsverarbeiter zu. Über neue oder ersetzte Unterauftragsverarbeiter informiert die Agentur 14 Tage vorher; der Kunde kann aus wichtigem datenschutzrechtlichen Grund widersprechen.</p>
<table class="t v"><tr><th>Dienst</th><th>Anbieter</th><th>Zweck</th><th>Ort</th></tr>
<tr><td>Google Workspace / Sheets</td><td>Google Ireland Ltd., Dublin</td><td>Lead-Liste</td><td>EU / USA (EU-US DPF, SCC)</td></tr>
<tr><td>Superchat</td><td>SuperX GmbH, Prenzlauer Allee 242–247, 10405 Berlin</td><td>WhatsApp-Postfach, Automationen</td><td>EU</td></tr>
<tr><td>WhatsApp Business Platform</td><td>Meta Platforms Ireland Ltd., Dublin (über Superchat)</td><td>Nachrichtenversand</td><td>EU / USA (DPF, SCC)</td></tr>
<tr><td>Make</td><td>Make (Celonis)</td><td>Datenweiterleitung Formular → Sheet / WhatsApp-Postfach</td><td>EU (Server-Region eu2)</td></tr></table>
<p class="klein">Hinweis: Die Lead-Formulare von Meta selbst verarbeitet Meta für den Kunden als Werbetreibenden auf Grundlage der Meta-Nutzungsbedingungen für Lead-Werbeanzeigen (gemeinsame bzw. eigene Verantwortlichkeit des Kunden).</p>
<h2>§ 6 Pflichten des Kunden</h2>
<p>Der Kunde ist für die Rechtmäßigkeit der Verarbeitung verantwortlich, insbesondere für die Rechtsgrundlage (Einwilligung bzw. Vertragsanbahnung), seine Datenschutzerklärung und die Information der Betroffenen. Die Agentur stellt dafür Textbausteine für Formular und Datenschutzhinweis bereit.</p>
<h2>§ 7 Löschung und Rückgabe</h2>
<p>Nach Ende des Hauptvertrags übergibt die Agentur dem Kunden auf Wunsch die Lead-Daten als Tabelle und löscht sie anschließend innerhalb von 30 Tagen bei sich und den Unterauftragsverarbeitern, soweit keine gesetzliche Aufbewahrungspflicht besteht. Während der Laufzeit werden Leads, die nicht zum Kunden werden, spätestens nach 12 Monaten gelöscht.</p>
<h2>§ 8 Haftung und Schluss</h2>
<p>Für die Haftung gilt Art. 82 DSGVO; im Innenverhältnis gelten die Regelungen des Hauptvertrags. Bei Widersprüchen geht dieser Vertrag den Regelungen des Hauptvertrags zum Datenschutz vor.</p>
<h2>Anhang 1: Technische und organisatorische Maßnahmen (Kurzfassung)</h2>
<ul><li>Zugang zu Google-, Meta- und Superchat-Konten nur mit persönlichen Logins und Zwei-Faktor-Authentifizierung</li>
<li>Freigaben von Sheets nur für namentlich benannte Personen, keine „Jeder mit Link“-Freigaben für Lead-Listen</li>
<li>Rollen und Rechte: Kunden sehen nur eigene Leads, Mitarbeiter nur betreute Kunden</li>
<li>Geräte mit Bildschirmsperre und Festplattenverschlüsselung, aktuelle Updates</li>
<li>Datenminimierung: im Formular nur abfragen, was für die Terminvereinbarung nötig ist</li>
<li>Protokoll aller Personen mit Zugriff, Entzug von Zugängen beim Ausscheiden am selben Tag</li>
<li>Regelmäßige Löschroutine laut § 7</li></ul>
{unterschrift("Itzehoe", "Tattoo Fashion Itzehoe (Verantwortlicher)", "München", "TattooLeadz.de – Andy Neelsen (Auftragsverarbeiter)")}
</section>'''

CSS = """
*{box-sizing:border-box}body{font:10.5pt/1.38 Arial,Helvetica,sans-serif;color:#111;margin:0}
section{position:relative}section.neu{break-before:page}
.logo{position:absolute;right:0;top:-8mm;width:24mm}
h1{font-size:17pt;margin:12mm 0 2mm}h2{font-size:12.5pt;margin:5mm 0 2mm;break-after:avoid}
.unter{color:#555;margin:0 30mm 1mm 0}.fassung{color:#777;font-size:8.5pt;margin:0 0 3mm}
p{margin:0 0 2mm;text-align:left}ul{margin:0 0 2mm;padding-left:5mm}li{margin:0 0 1mm}
.box{padding-left:4mm}.klein{font-size:9pt;color:#444}
table.t{border-collapse:collapse;width:100%;margin:0 0 3mm;font-size:9.5pt}
table.t th{background:#111;color:#fff;text-align:left;padding:1.4mm 2mm}
table.t td{border:0.3mm solid #bbb;padding:1.4mm 2mm;vertical-align:top}table.t tr{break-inside:avoid}
table.t td:first-child{width:42%}table.v td:first-child{width:21%}table.v td:nth-child(2){width:33%}table.f td:first-child{width:38%;font-weight:bold}
table.sig{width:100%;margin-top:9mm;break-inside:avoid;font-size:10pt}table.sig td{width:50%;padding:1mm 3mm 1mm 0;vertical-align:top}.linie{padding-top:11mm!important}
"""
html = f'<!doctype html><html lang="de"><meta charset="utf-8"><title>Vertrag Tattoo Fashion Itzehoe</title><style>{CSS}</style><body>{VERTRAG}{ANLAGE1}{ANLAGE2}{AVV}</body></html>'
(HIER / "vertrag.html").write_text(html, encoding="utf8")
FOOT = """<div style="width:100%;font:7pt Arial;color:#777;text-align:center;padding:0 14mm">TattooLeadz.de · Inhaber Andy Neelsen · Landshuter Allee 42 · 80637 München · USt-IdNr. DE348150427 · Kreissparkasse München Starnberg Ebersberg · IBAN DE71 7025 0150 0023 6476 62 · BIC BYLADEM1KMS<br>Vertrag Tattoo Fashion Itzehoe · Blatt <span class="pageNumber"></span> von <span class="totalPages"></span></div>"""
with sync_playwright() as p:
    b = p.chromium.launch(); g = b.new_page()
    g.goto((HIER / "vertrag.html").as_uri()); g.wait_for_timeout(300)
    g.pdf(path=str(HIER / "Tattoo-Fashion-Itzehoe-Vertrag-zum-Unterschreiben.pdf"), format="A4", print_background=True, display_header_footer=True, header_template="<span></span>", footer_template=FOOT, margin={"top":"18mm","bottom":"20mm","left":"20mm","right":"20mm"})
    b.close()
print("ok")
