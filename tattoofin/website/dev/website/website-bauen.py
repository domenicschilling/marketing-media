#!/usr/bin/env python3
"""Baut die Website tattoofin.de (Schilling Websitekonzept, 18.11.2026). Aufruf: python3 dev/website/website-bauen.py

1. Startseite + /studios (dev/startseite-bauen.py)
2. Unterseiten nach Seitenplan: /funktionen/ (+ anzahlung, zahlungslink, ratenzahlung, gutschein, app), /so-gehts/, /preis/,
   /fragen/, /ueber-uns/, 404
3. Ratgeber und Rechtstexte bekommen denselben Kopf und Fuß (Inhalt bleibt, wie er ist)
4. sitemap.xml

Alle Zahlen: dev/website/fakten.json ([[gruppe.feld]]). Alle Fragen: dev/website/fragen.json. Kopf/Fuß: rahmen.py.
Regeln: Absender „wir/unser Team“, nie Domenic. Raten nur als „Raten*“ mit Fußnote und Warnsatz klein direkt darunter.
Kein PayPal, kein Aufsteller, keine Studionamen/Kundenstimmen, Auszahlung nie „sofort“. App: kein Store-Link.
"""
import html
import json
import re
import subprocess
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import rahmen as R  # noqa: E402

PUB, ROOT, LIVE = R.PUB, R.ROOT, R.LIVE
FR = json.loads((R.HIER / "fragen.json").read_text(encoding="utf-8"))
HEUTE = date.today().isoformat()
FN_K, FN_L = "[[klarna.fnKurz]]", "[[klarna.fnLang]]"
GEBAUT = []


# ---------------------------------------------------------------- Bausteine
def fn(text=FN_K):
    return f'<p class="raten-fn">{text}</p>'


def seitenkopf(h1, satz, ort, stempel=None, krumen=None, unter="", zeile="Danach [[preis.monat]] im Monat · monatlich kündbar"):
    k = ""
    if krumen:
        k = '<p class="krumen"><a href="/">Start</a> › ' + " › ".join(f'<a href="{h}">{t}</a>' for t, h in krumen) + "</p>\n      "
    st = f'\n      <span class="stempel">{stempel}</span>' if stempel else ""
    cls = "seitenkopf mit-stempel" if stempel else "seitenkopf"
    return f'''<section class="{cls}" aria-labelledby="titel">
      {k}<h1 id="titel">{h1}</h1>
      <p class="unterzeile">{satz}</p>{unter}
      <div class="kopf-knopf">{R.knopf(ort)}<p class="zeile">{zeile}</p></div>{st}
    </section>'''


def abschnitt(aid, titel, inhalt, satz=None):
    s = f'\n      <p class="satz">{satz}</p>' if satz else ""
    return f'''
    <section class="abschnitt" id="{aid}" aria-labelledby="{aid}-titel">
      <h2 id="{aid}-titel">{titel}</h2>{s}
      {inhalt}
    </section>'''


def schritte(liste, bild=""):
    lis = "".join(f"<li><div><b>{t}</b><p>{p}</p></div></li>" for t, p in liste)
    return f'<div class="schritte-bild"><ol class="schritte">{lis}</ol>{bild}</div>'


def handy(src, alt, w, h, text="Echte App-Aufnahme, Beispieldaten."):
    return f'''<figure class="handy-bild"><span class="klebe" aria-hidden="true"></span>
          <span class="handy-rahmen"><img src="{src}" alt="{html.escape(alt)}" width="{w}" height="{h}" loading="lazy" decoding="async"></span>
          <figcaption>{text}</figcaption></figure>'''


FILM = '''<figure class="film-bild"><video src="/assets/lp/zahlungslink.mp4" poster="/assets/lp/zahlungslink-poster.webp" width="540" height="1168" controls muted playsinline preload="none" aria-label="10 Sekunden: So entsteht ein Zahlungslink in der App"></video>
          <figcaption>10 Sekunden, echte App-Aufnahme, Beispieldaten. Ohne Ton.</figcaption></figure>'''


def zettel(titel, zeilen, klein=""):
    dl = ""
    for i, (t, w) in enumerate(zeilen):
        cls = ' class="summe"' if i == len(zeilen) - 1 else ""
        dl += f"<dt{cls}>{t}</dt><dd{cls}>{w}</dd>"
        dl = dl
    k = f"<small>{klein}</small>" if klein else ""
    return f'<div class="zettel"><p class="zettel-titel">{titel}</p><dl>{dl}</dl>{k}</div>'


def frage_html(f):
    antwort = "".join(f"<p>{a}</p>" for a in f["a"])
    if f["fn"]:
        antwort += fn()
    return f'<details><summary>{html.escape(f["q"], quote=False)}</summary><div class="antwort">{antwort}</div></details>'


def fragen_fuer(seite, titel="Fragen dazu."):
    fs = [f for f in FR["fragen"] if seite in f.get("seiten", [])]
    if not fs:
        return ""
    return abschnitt("fragen-seite", titel, '<div class="fragen-kurz">' + "".join(frage_html(f) for f in fs)
                     + '</div>\n      <a class="mehr-link" href="/fragen/">Alle Fragen →</a>')


def weiter(ort, titel, verwandt):
    v = "".join(f'<li><a href="{h}">{t}</a></li>' for t, h in verwandt)
    wa = html.escape(R.wa_link())
    return f'''
    <section class="abschnitt" id="weiter" aria-labelledby="weiter-titel">
      <h2 id="weiter-titel">{titel}</h2>
      <div class="weiter">
        {R.knopf(ort + "-schluss")}
        <p class="zeile">{"[[preis.testwoche]]"} testen, danach [[preis.monat]] [[preis.zusatz]] · monatlich kündbar · <a href="{wa}" data-umami-event="whatsapp-{ort}">Fragen? WhatsApp an [[kontakt.whatsapp]]</a></p>
      </div>
      <ul class="verwandt" aria-label="Weitere Seiten">{v}</ul>
    </section>'''


def motiv(name, label, alt_id=None, neu_id=None):
    return R.motiv_klein(name, alt_id, neu_id, label=label)


def seite(pfad, titel, beschreibung, aktiv, kopfteil, inhalt, ld=None, krumen=None):
    graph = [R.org_ld()]
    if krumen:
        graph.append(R.brotkrumen(krumen))
    if ld:
        graph += ld
    daten = {"@context": "https://schema.org", "@graph": graph}
    doc = (R.kopfdaten(titel, beschreibung, pfad, ld=daten)
           + '\n<body>\n<a class="sprung" href="#inhalt">Zum Inhalt springen</a>\n<div class="bogen">\n  '
           + R.kopf(aktiv) + '\n  <main id="inhalt">\n    ' + kopfteil + '\n    <div class="seite">' + inhalt + '\n    </div>\n  </main>\n  '
           + R.fuss() + "\n</div>\n" + R.MENUE_JS + "\n" + R.UMAMI + "\n" + R.TRACK + "\n</body>\n</html>\n")
    doc = R.fuellen(doc)
    for wort in ("PayPal-Knopf", "Aufsteller", "sofort auf", "Domenic"):
        if wort in doc:
            raise SystemExit(f"{pfad}: verbotenes Wort „{wort}“")
    ziel = PUB / pfad.strip("/") / "index.html" if pfad != "/404" else PUB / "404.html"
    ziel.parent.mkdir(parents=True, exist_ok=True)
    ziel.write_text(doc, encoding="utf-8")
    GEBAUT.append(pfad)


KR_F = [("Funktionen", "/funktionen/")]
WA = html.escape(R.wa_link())

# ---------------------------------------------------------------- /funktionen/anzahlung/
ANKER = motiv("motiv-3", "Flash-Anker mit Banderole Termin", "tf-b2-z", "tf-s3")
seite("/funktionen/anzahlung/",
      "Tattoo-Anzahlung per Link: erst bezahlt, dann Termin | Tattoofin",
      "Anzahlung fürs Tattoo-Studio per WhatsApp-Link: Kunde zahlt an und bestätigt deine Bedingungen, dann blockst du den Termin. [[preis.monat]] im Monat, ohne Provision.",
      "funktionen",
      seitenkopf("Erst Anzahlung. Dann&nbsp;Termin.", "Dein Kunde zahlt per Link an und bestätigt deine Bedingungen. Erst dann blockst du den&nbsp;Termin.",
                 "anzahlung", ANKER, KR_F),
      abschnitt("fuer-wen", "Für wen?", '''<ul class="karten karten-2">
        <li class="karte"><h3>Passt, wenn du …</h3><ul><li>Termine Tage oder Wochen vorher vergibst,</li><li>Anfragen per WhatsApp oder Instagram bekommst,</li><li>keine Kontonummer mehr diktieren willst.</li></ul></li>
        <li class="karte"><h3>Passt nicht, wenn du …</h3><ul><li>nur Walk-ins ohne Termin machst,</li><li>kein Gewerbe hast. Tattoofin ist nur für Unternehmer.</li></ul></li>
      </ul>''')
      + abschnitt("ablauf", "So läuft eine Anzahlung.", schritte([
          ("Betrag eintippen.", "Zum Beispiel [[beispielAnzahlung.betrag]] für ein Rückenstück, in der iPhone-App oder im Browser."),
          ("Link schicken.", "Per WhatsApp. Oder dein Kunde scannt den QR-Code an der Theke."),
          ("Kunde zahlt an.", "Mit [[zahlarten.satz]]. Vorher bestätigt er deine Anzahlungsbedingungen."),
          ("Termin blocken.", "Du bekommst eine Nachricht, sobald bezahlt ist. Nach der Sitzung schickst du den Rest per Link."),
      ], handy("/assets/start/handy-anzahlung.webp", "Zahlseite für den Kunden: 150 Euro Anzahlung für ein Rückenstück, darunter die Anzahlungsbedingungen zum Bestätigen", 600, 1298)))
      + abschnitt("absage", "Und wenn er absagt?", '''<div class="text">
        <p>Dann gelten <b>deine</b> Bedingungen, zum Beispiel deine Absagefrist. Ob die Anzahlung bei dir bleibt, legst du darin fest, nicht wir.</p>
        <p>Tattoofin speichert, dass dein Kunde die Bedingungen vor dem Zahlen bestätigt hat. Gibt es Streit, hast du den Nachweis. Unser Team hilft dir dabei.</p>
        <p><a class="mehr-link" href="/muster-anzahlungsbedingungen.pdf">Muster-Anzahlungsbedingungen ansehen (PDF)</a></p>
      </div>''')
      + abschnitt("kosten", "Was es kostet.", '<div class="rechnung">' + zettel("Beispiel: Anzahlung per Karte", [
          ("Anzahlung deines Kunden", "[[beispielAnzahlung.betrag]]"), ("Stripe-Gebühr Karte", "[[beispielAnzahlung.gebuehr]]"),
          ("An Tattoofin", "0&nbsp;€"), ("Bei dir", "[[beispielAnzahlung.rest]]")],
          "Stripe-Gebühr Karte [[gebuehr.karte]], Klarna [[gebuehr.klarna]]. Die Gebühr zahlst du direkt an Stripe.")
          + '''<div><p class="gross">[[beispielAnzahlung.satz]]</p>
        <p>Tattoofin kostet [[preis.monat]] [[preis.zusatz]] Keine Provision, keine Einrichtungsgebühr, monatlich kündbar. Die erste Woche testest du ohne Kosten.</p>
        <a class="mehr-link" href="/preis/">Alles zum Preis →</a></div></div>''')
      + fragen_fuer("anzahlung", "Fragen zur Anzahlung.")
      + weiter("anzahlung", "Nächste Anfrage? Schick den Anzahlungs-Link.", [("Zahlungslink", "/funktionen/zahlungslink/"), ("Klarna im Studio", "/funktionen/ratenzahlung/"), ("Gutschein", "/funktionen/gutschein/"), ("Ratgeber Anzahlung", "/tattoo-anzahlung.html")]),
      krumen=KR_F + [("Anzahlung", "/funktionen/anzahlung/")])

# ---------------------------------------------------------------- /funktionen/zahlungslink/
SCHWALBE = motiv("motiv-2", "Flash-Schwalbe mit Brief")
seite("/funktionen/zahlungslink/",
      "Zahlungslink per WhatsApp fürs Tattoo-Studio | Tattoofin",
      "Betrag eintippen, Link per WhatsApp schicken, bezahlt: ganzer Betrag oder Rest nach der Sitzung, ohne Kartengerät. [[preis.monat]] im Monat, ohne Provision.",
      "funktionen",
      seitenkopf("Betrag rein. Link raus. Bezahlt.", "Für den ganzen Betrag oder den Rest nach der Sitzung. Dein Kunde zahlt am Handy, ohne Kartengerät.",
                 "zahlungslink", SCHWALBE, KR_F),
      abschnitt("ablauf", "So schnell geht ein Link.", schritte([
          ("Betrag und Motiv eintippen.", "Zum Beispiel [[fall.betrag]] für einen Drachen auf dem Rücken."),
          ("Link schicken.", "Per WhatsApp, per Mail, oder dein Kunde scannt deinen QR-Code an der Theke."),
          ("Bezahlt.", "Dein Kunde zahlt mit [[zahlarten.satz]]. Du siehst es in der App, Stripe zahlt auf dein Bankkonto aus."),
      ], FILM))
      + abschnitt("name", "Dein Studio, dein Name.", '<div class="schritte-bild"><div class="text">'
          '<p>Dein Kunde zahlt auf einer Seite mit deinem Studionamen, nicht mit unserem. Er sieht, wofür er zahlt: Studio, Motiv, Betrag.</p>'
          '<p>Das Geld geht direkt auf dein eigenes Stripe-Konto. Tattoofin nimmt keine Provision.</p></div>'
          + handy("/assets/start/handy-kunde.webp", "Zahlseite am Handy: Hi Lena, deine Zahlung an Ink Studio Bamberg, Ganzer Rücken, mit Auswahl der Zahlart", 600, 1298) + "</div>")
      + abschnitt("geraet", "Und dein Kartengerät?", '''<div class="text">
        <p>Behalt es. Dein Kartengerät kassiert an der Theke. Tattoofin kassiert, wenn der Kunde nicht da ist: Anzahlung vorab, Rest per Link, Gutscheine.</p>
        <p>Hast du keins, reicht der QR-Code deiner Zahlseite. Den druckst du aus und legst ihn an die Theke.</p>
      </div>''')
      + abschnitt("kosten", "Was es kostet.", '<div class="rechnung">' + zettel("Beispiel: [[beispielLink.betrag]] per Karte", [
          ("Dein Kunde zahlt", "[[beispielLink.betrag]]"), ("Stripe-Gebühr Karte", "[[beispielLink.gebuehr]]"), ("An Tattoofin", "0&nbsp;€"), ("Bei dir", "[[beispielLink.rest]]")],
          "Rechnung: [[gebuehr.karte]]. Klarna [[gebuehr.klarna]]. Die Gebühr zahlst du direkt an Stripe.")
          + '<div><p>Tattoofin kostet [[preis.monat]] [[preis.zusatz]], egal wie viele Links du schickst.</p><a class="mehr-link" href="/preis/">Alles zum Preis →</a></div></div>')
      + fragen_fuer("zahlungslink", "Fragen zum Zahlungslink.")
      + weiter("zahlungslink", "Nächster Termin? Schick den Link.", [("Anzahlung", "/funktionen/anzahlung/"), ("Klarna im Studio", "/funktionen/ratenzahlung/"), ("iPhone-App", "/funktionen/app/")]),
      krumen=KR_F + [("Zahlungslink", "/funktionen/zahlungslink/")])

# ---------------------------------------------------------------- /funktionen/ratenzahlung/
HERZ = motiv("flash-1", "Flash-Herz mit Banderole Klarna", "tf-b1", "tf-s1")
fall = '''<div class="rechnung">
        <figure class="bon" style="max-width:300px">
          <span class="klebe" aria-hidden="true"></span>
          <span class="bon-kopf">Studio anonym</span>
          <span class="bon-zeile"><span>[[fall.motiv]]</span><span>1 Sitzung</span></span>
          <span class="bon-zeile bon-summe"><span>Summe</span><span>[[fall.betragGenau]]</span></span>
          <span class="bon-zeile"><span>Zahlart</span><span>Klarna</span></span>
          <span class="bon-stempel">Bezahlt [[fall.datum]]</span>
          <figcaption>Nachgezeichnet nach dem echten Zahlungseingang.</figcaption>
        </figure>
        <div class="text"><p class="gross">[[fall.betrag]] per Klarna.</p>
          <p>So lief es am [[fall.datumLang]] in einem Studio: Link geschickt, Kunde zahlt per Klarna, das Geld kommt aufs eigene Stripe-Konto.</p>
          <p class="klein">Studio anonym. Klarna entscheidet bei jedem Kunden selbst.</p></div>
      </div>'''
seite("/funktionen/ratenzahlung/",
      "Klarna im Tattoo-Studio, ohne Onlineshop | Tattoofin",
      "Raten* über Klarna für deine Kunden, der ganze Betrag für dich. *Raten über Klarna nach deren Bonitätsprüfung. Achtung! Kreditaufnahme kostet Geld.",
      "funktionen",
      seitenkopf("Raten* für deinen Kunden. Das Geld auf einmal für&nbsp;dich.", "Dein Kunde wählt beim Bezahlen Klarna. Du finanzierst nichts vor und wartest auf keine Rate*.",
                 "ratenzahlung", HERZ, KR_F, unter="\n      " + fn()),
      abschnitt("geldfluss", "So läuft das Geld.", '''<div class="fluss">
        <div class="fluss-station"><span class="wer">Dein Kunde</span><strong>wählt Klarna</strong><p>Beim Bezahlen per Link oder QR-Code.</p></div>
        <span class="fluss-pfeil" aria-hidden="true">→</span>
        <div class="fluss-station"><span class="wer">Klarna</span><strong>prüft deinen Kunden</strong><p>Den Vertrag über die Raten* schließt er mit Klarna, nicht mit dir.</p></div>
        <span class="fluss-pfeil" aria-hidden="true">→</span>
        <div class="fluss-station"><span class="wer">Du</span><strong>bekommst den ganzen Betrag</strong><p>Abzüglich Stripe-Gebühr, auf dein eigenes Stripe-Konto.</p></div>
      </div>
      ''' + fn(FN_L) + '''
      <ul class="text" style="margin-top:var(--s5);padding-left:1.2em">
        <li><b>Wann ist das Geld auf deinem Konto?</b> [[auszahlung.text]]</li>
        <li><b>Sagt Klarna nein?</b> Dann zahlt dein Kunde mit Karte, Apple Pay oder Google&nbsp;Pay.</li>
        <li><b>Welche Beträge?</b> [[klarna.grenzen]] Was dein Kunde angeboten bekommt, entscheidet Klarna.</li>
      </ul>''')
      + abschnitt("fall", "Ein echter Fall.", fall)
      + abschnitt("kosten", "Was es kostet.", '<div class="rechnung">' + zettel("Dein Kunde zahlt [[beispielRaten.betrag]] per Klarna", [
          ("Stripe-Gebühr Klarna", "[[beispielRaten.gebuehrKlarna]]"), ("An Tattoofin", "0&nbsp;€"), ("Bei dir", "[[beispielRaten.rest]]")],
          "Klarna [[gebuehr.klarna]], mit Karte [[beispielRaten.gebuehrKarte]] Gebühr. Keine Garantie. Die Gebühr zahlst du direkt an Stripe.")
          + '<div><p>Tattoofin kostet [[preis.monat]] [[preis.zusatz]] Über Tattoofin bekommt dein Studio von Klarna keine Provision und keinen Vorteil für Raten*.</p>'
          + fn() + '<a class="mehr-link" href="/preis/">Alles zum Preis →</a></div></div>')
      + abschnitt("regeln", "Was du beachten musst.", '''<ul class="text" style="padding-left:1.2em">
        <li><b>Nichts versprechen.</b> Keine Raten*, Zinsen oder Freigaben zusagen. Im Gespräch passt: „Beim Bezahlen siehst du, welche Zahlarten dir angeboten werden.“</li>
        <li><b>Kein Aufpreis</b> für Zahlungen mit Klarna.</li>
        <li><b>Werbung mit Raten*</b> nur mit dem Satz „Achtung! Kreditaufnahme kostet Geld.“, gut lesbar und direkt dabei. Kein „zinsfrei“, kein „ohne Schufa“.</li>
        <li><b>Gutscheine nie mit Klarna.</b> Klarna erlaubt keine Gutscheine, Tattoofin bietet dafür nur Karte, Apple Pay und Google Pay an.</li>
        <li><b>Keine Käufe über Klarna</b> durch dich oder dein Team.</li>
      </ul>
      ''' + fn() + '<p class="klein" style="margin-top:var(--s3)">Allgemeine Informationen, keine Rechts- oder Finanzberatung.</p>')
      + fragen_fuer("ratenzahlung", "Fragen zu Klarna.")
      + weiter("ratenzahlung", "Großes Motiv angefragt? Schick den Link.", [("Zahlungslink", "/funktionen/zahlungslink/"), ("Anzahlung", "/funktionen/anzahlung/"), ("Ratgeber Tattoo finanzieren", "/tattoo-finanzieren.html")]),
      krumen=KR_F + [("Klarna im Studio", "/funktionen/ratenzahlung/")])

# ---------------------------------------------------------------- /funktionen/gutschein/
GUTSCHEIN = motiv("motiv-5", "Flash-Gutschein-Karte")
seite("/funktionen/gutschein/",
      "Tattoo-Gutscheine online verkaufen | Tattoofin",
      "Tattoo-Gutscheine per Link verkaufen: Dein Kunde zahlt am Handy und bekommt Code und PDF per E-Mail. [[preis.monat]] im Monat, ohne Provision.",
      "funktionen",
      seitenkopf("Gutscheine per Link&nbsp;verkaufen.", "Dein Kunde zahlt am Handy und bekommt Code und PDF per E-Mail. Auch abends, am Wochenende, vor&nbsp;Weihnachten.",
                 "gutschein", GUTSCHEIN, KR_F),
      abschnitt("ablauf", "So läuft ein Gutschein.", schritte([
          ("Link teilen.", "Per WhatsApp, in deiner Instagram-Bio oder als QR-Code an der Theke."),
          ("Kunde kauft.", "Er wählt den Betrag, schreibt, für wen er ist, und zahlt mit [[zahlarten.gutschein]]."),
          ("Code und PDF.", "Dein Kunde bekommt sofort nach dem Kauf eine E-Mail mit Code und PDF zum Verschenken."),
          ("Einlösen.", "Beim Termin scannst du den Code oder gibst ihn ein. In der Liste siehst du, welche Gutscheine offen und welche eingelöst sind."),
      ], handy("/assets/start/handy-gutschein-oben.webp", "Gutschein-Kaufseite am Handy: Hi Greta, dein Gutschein von Ink Studio Bamberg, 150 Euro, Wertgutschein für Max", 600, 545)))
      + abschnitt("regeln", "Gut zu wissen.", '''<div class="text">
        <p><b>Ohne Klarna.</b> Klarna erlaubt keine Gutscheine. Dein Kunde zahlt mit [[zahlarten.gutschein]].</p>
        <p><b>Gültig [[gutschein.gueltig]].</b> Das Datum steht auf dem PDF.</p>
        <p><b>Das Geld geht an dich.</b> Direkt auf dein Stripe-Konto, Stripe zahlt nach seinen Fristen aus.</p>
      </div>''')
      + fragen_fuer("gutschein", "Fragen zum Gutschein.")
      + weiter("gutschein", "Weihnachten kommt. Verkauf Gutscheine per Link.", [("Zahlungslink", "/funktionen/zahlungslink/"), ("Anzahlung", "/funktionen/anzahlung/"), ("Preis", "/preis/")]),
      krumen=KR_F + [("Gutschein", "/funktionen/gutschein/")])

# ---------------------------------------------------------------- /funktionen/app/
QR = motiv("motiv-4", "Flash-Motiv QR-Code an der Theke", "tf-b6", "tf-s6")
seite("/funktionen/app/",
      "Tattoofin als iPhone-App | Tattoofin",
      "Zahlungslinks, Anzahlungen, Gutscheine und Auszahlungen am iPhone, mit Nachricht bei jeder Zahlung. Alles geht auch im Browser.",
      "funktionen",
      seitenkopf("Alles in einer&nbsp;App.", "Zahlungslinks, Anzahlungen, Gutscheine und Auszahlungen am iPhone. Und alles auch im&nbsp;Browser.",
                 "app", QR, KR_F),
      abschnitt("kann", "Was die App kann.", '''<ul class="karten karten-3">
        <li class="karte"><h3>Link schicken</h3><p>Betrag eintippen und per WhatsApp teilen. Für Anzahlung, Rest oder ganzen Betrag.</p></li>
        <li class="karte"><h3>QR-Code zeigen</h3><p>Dein Kunde scannt an der Theke und zahlt auf deiner Zahlseite.</p></li>
        <li class="karte"><h3>Nachricht bei jeder Zahlung</h3><p>Per E-Mail oder in der App. Du siehst sofort, wer bezahlt hat.</p></li>
        <li class="karte"><h3>Gutscheine einlösen</h3><p>Code scannen oder eingeben. Du siehst, welche Gutscheine offen und welche eingelöst sind.</p></li>
        <li class="karte"><h3>Auszahlungen sehen</h3><p>Was bezahlt ist und was Stripe auf dein Konto auszahlt.</p></li>
        <li class="karte"><h3>Auch im Browser</h3><p>Am Rechner oder am Android-Handy nutzt du Tattoofin im Browser.</p></li>
      </ul>''')
      + abschnitt("bekommen", "So bekommst du die App.", '<div class="schritte-bild"><div class="text">'
          '<p>[[app.satz]] Du meldest dich an, unser Team richtet alles mit dir ein und schickt dir den Weg zur App.</p>'
          '<p>Die App ist im Preis enthalten. Eine eigene Android-App gibt es nicht.</p></div>' + FILM + "</div>")
      + fragen_fuer("app", "Fragen zur App.")
      + weiter("app", "Erst testen, dann die App.", [("Zahlungslink", "/funktionen/zahlungslink/"), ("So geht’s", "/so-gehts/"), ("Fragen", "/fragen/")]),
      krumen=KR_F + [("iPhone-App", "/funktionen/app/")])

# ---------------------------------------------------------------- /funktionen/
KARTEN = [
    ("anzahlung", motiv("motiv-3", "", "tf-b2-z", "tf-u3"), "Anzahlung", "Vor dem Termin.", "Dein Kunde zahlt an und bestätigt deine Bedingungen. Erst dann blockst du den Termin.", False),
    ("zahlungslink", motiv("motiv-2", ""), "Zahlungslink", "Nach der Sitzung.", "Den ganzen Betrag oder den Rest nach der Anzahlung, per Link oder QR-Code.", False),
    ("gutschein", motiv("motiv-5", ""), "Gutschein", "Zum Verschenken.", "Dein Kunde kauft per Link und bekommt Code und PDF per E-Mail.", False),
    ("app", motiv("motiv-4", "", "tf-b6", "tf-u6"), "iPhone-App", "Immer dabei.", "Links, QR-Code, Gutscheine und Auszahlungen am Handy. Alles geht auch im Browser.", False),
    ("ratenzahlung", motiv("flash-1", "", "tf-b1", "tf-u1"), "Klarna im Studio", "Für große Tattoos.", "Dein Kunde zahlt in Raten* über Klarna. Du bekommst den ganzen Betrag auf einmal.", True),
]
for i, k in enumerate(KARTEN):
    KARTEN[i] = (k[0], k[1].replace('role="img" aria-label=""', 'aria-hidden="true" focusable="false"'), *k[2:])
karten = "".join(
    f'<li class="karte"><span class="karte-motiv">{m}</span><h3><a class="karte-link" href="/funktionen/{slug}/">{t}</a></h3><p><b>{w}</b> {s}</p>{fn() if r else ""}</li>'
    for slug, m, t, w, s, r in KARTEN)
seite("/funktionen/",
      "Funktionen für dein Tattoo-Studio | Tattoofin",
      "Anzahlung vorab, Zahlungslink per WhatsApp, Gutscheine per Link, Klarna für deine Kunden und die iPhone-App. [[preis.monat]] im Monat, ohne Provision.",
      "funktionen",
      seitenkopf("Für jede Zahlung ein&nbsp;Link.", "Anzahlung, Rest, Gutschein: Du schickst einen Link, dein Kunde zahlt am&nbsp;Handy.", "funktionen"),
      abschnitt("liste", "Was du damit machen kannst.", f'<ul class="karten karten-3">{karten}</ul>')
      + abschnitt("zahlarten", "Womit dein Kunde zahlt.", '''<ul class="chips" aria-label="Zahlarten"><li>Karte</li><li>Apple&nbsp;Pay</li><li>Google&nbsp;Pay</li><li>Klarna</li></ul>
      <div class="text" style="margin-top:var(--s4)"><p>Das Geld geht direkt auf dein eigenes Stripe-Konto. Tattoofin nimmt keine Provision. Gutscheine ohne&nbsp;Klarna.</p></div>''')
      + abschnitt("nicht", "Was Tattoofin nicht macht.", '''<ul class="nicht">
        <li>Kein PayPal. Dein Kunde zahlt mit [[zahlarten.satz]].</li>
        <li>Kein Kartengerät. Hast du eins, behalt es für die Theke.</li>
        <li>Keine Kredite. Raten* bietet Klarna nach eigener Prüfung an.</li>
        <li>Kein Kalender. Termine planst du weiter so wie bisher.</li>
      </ul>''' + fn())
      + weiter("funktionen", "Probier es eine Woche aus.", [("So geht’s", "/so-gehts/"), ("Preis", "/preis/"), ("Fragen", "/fragen/")]),
      krumen=KR_F)

# ---------------------------------------------------------------- /so-gehts/
seite("/so-gehts/",
      "So geht’s: Anmelden, Stripe-Konto, erster Link | Tattoofin",
      "So fängst du an: anmelden, Stripe-Konto anlegen, mit unserem Team einrichten, ersten Link schicken. 1 Woche testen, danach [[preis.monat]] im Monat.",
      "so-gehts",
      seitenkopf("So fängst du&nbsp;an.", "Anmelden, Stripe-Konto anlegen, einrichten. Unser Team hilft dir per&nbsp;WhatsApp.", "so-gehts",
                 motiv("herz-bezahlt", "Flash-Herz mit Banderole Bezahlt", "tf-b1-z", "tf-s1z")),
      abschnitt("schritte", "Vier Schritte.", schritte([
          ("Online anmelden.", "Ein kurzes Formular, dazu hinterlegst du deine Karte bei Stripe. Heute zahlst du 0&nbsp;€."),
          ("Stripe-Konto anlegen.", "Stripe prüft dein Studio. Du brauchst [[anmeldung.braucht]]."),
          ("Mit unserem Team einrichten.", "Per WhatsApp, mit einer Testzahlung. Du musst dafür nichts können."),
          ("Ersten Link schicken.", "Anzahlung, Rest oder Gutschein. Dein Kunde zahlt am Handy."),
      ], FILM))
      + abschnitt("brauchst", "Was du brauchst.", '''<ul class="karten karten-3">
        <li class="karte"><h3>Ein Unternehmen</h3><p>Studio oder selbstständiger Artist mit Gewerbe. Tattoofin ist nur für Unternehmer.</p></li>
        <li class="karte"><h3>Ein Bankkonto</h3><p>Dahin zahlt Stripe dein Geld aus.</p></li>
        <li class="karte"><h3>Deinen Ausweis</h3><p>Stripe fragt ihn bei der Prüfung ab, wie jede Bank.</p></li>
      </ul>''')
      + abschnitt("testwoche", "Die Testwoche.", '''<div class="text">
        <p>[[preis.testBedingung]]</p>
        <p>Danach kostet Tattoofin [[preis.monat]] [[preis.zusatz]], [[preis.kuendigung]].</p>
        <p><a class="mehr-link" href="/vertrag.html" data-umami-event="vertrag-lesen">Vertrag vorab lesen</a></p>
      </div>''')
      + fragen_fuer("so-gehts", "Fragen zum Anfang.")
      + weiter("so-gehts", "Bereit? Starte die Testwoche.", [("Funktionen", "/funktionen/"), ("Preis", "/preis/"), ("Fragen", "/fragen/")]),
      krumen=[("So geht’s", "/so-gehts/")])

# ---------------------------------------------------------------- /preis/
PREIS_BLOCK = '''
    <section class="preis" id="preis-schild" aria-labelledby="preis-titel">
      <div class="preis-innen">
        <h2 id="preis-titel">[[beispielAnzahlung.satz]]</h2>
        <p class="preis-rechnung">Kunde kommt nicht? [[beispielAnzahlung.betrag]] Anzahlung, minus Stripe-Gebühr [[beispielAnzahlung.gebuehr]] =&nbsp;[[beispielAnzahlung.rest]]. Tattoofin kostet [[preis.monat]] im Monat.</p>
        <div class="preis-schild">
          <svg class="faden" viewBox="0 0 120 90" aria-hidden="true" focusable="false"><path d="M60 8 C42 30 78 52 60 86" fill="none" stroke="#fff7e3" stroke-width="4" stroke-linecap="round"/></svg>
          <span class="reisszwecke" aria-hidden="true"></span>
          <div class="anhaenger">
            <span class="loch" aria-hidden="true"></span>
            <strong class="betrag">[[preis.betrag]]<span class="eur">€</span></strong>
            <span class="einheit">im Monat, inkl. MwSt.</span>
            <span class="brutto">([[preis.netto]] netto) · [[preis.zielgruppe]].</span>
          </div>
        </div>
        <div class="beleg">
          <table>
            <caption>Dein Kunde zahlt [[beispielRaten.betragZahl]]<span class="eur">€</span> per Klarna</caption>
            <tbody>
              <tr><th scope="row">Stripe-Gebühr Klarna</th><td>[[beispielRaten.gebuehrKlarna]]</td></tr>
              <tr><th scope="row">An Tattoofin</th><td>0&nbsp;€</td></tr>
              <tr class="summe"><th scope="row">Bei dir</th><td>[[beispielRaten.rest]]</td></tr>
            </tbody>
          </table>
          <p class="beleg-hinweis">Mit Karte [[beispielRaten.gebuehrKarte]] Gebühr. Keine Garantie.</p>
        </div>
        <div class="preis-rest">
          <ul class="sticker-reihe" aria-label="Das gehört dazu">
            <li>Keine Provision</li>
            <li>Keine Einrichtungsgebühr</li>
            <li>Monatlich kündbar</li>
            <li>Unser Team richtet’s mit dir ein</li>
          </ul>
          <div class="wege">''' + R.knopf("preis-schild") + '''<a class="wa" href="/vertrag.html" data-umami-event="vertrag-lesen">Vertrag vorab lesen</a></div>
        </div>
      </div>
    </section>'''
seite("/preis/",
      "Preis: [[preis.monat]] im Monat, keine Provision | Tattoofin",
      "Tattoofin kostet [[preis.monat]] im Monat inkl. MwSt.: keine Provision, keine Einrichtungsgebühr, monatlich kündbar. Dazu die Stripe-Gebühr je Zahlung.",
      "preis",
      seitenkopf("Ein Preis. Keine&nbsp;Provision.", "[[preis.monat]] [[preis.zusatz]] Dazu nur die Gebühr von Stripe je Zahlung. Die erste Woche testest du ohne&nbsp;Kosten.", "preis",
                 zeile="[[preis.zielgruppe]] · monatlich kündbar"),
      "\n    </div>" + PREIS_BLOCK + '\n    <div class="seite">'
      + abschnitt("dabei", "Was dazugehört.", '''<ul class="karten karten-3">
        <li class="karte"><h3>Alle Funktionen</h3><p>Anzahlung, Zahlungslink, Gutschein, Klarna für deine Kunden. <a href="/funktionen/">Ansehen</a></p></li>
        <li class="karte"><h3>iPhone-App</h3><p>Im Preis enthalten. Alles geht auch im Browser.</p></li>
        <li class="karte"><h3>QR-Code zum Ausdrucken</h3><p>Für die Theke. Dein Kunde scannt und zahlt.</p></li>
        <li class="karte"><h3>Einrichtung mit unserem Team</h3><p>Per WhatsApp, mit einer Testzahlung.</p></li>
        <li class="karte"><h3>Keine Provision</h3><p>Egal, wie viel du kassierst. Das Geld geht direkt auf dein Stripe-Konto.</p></li>
        <li class="karte"><h3>Monatlich kündbar</h3><p>Im Portal, zum Ende des Abrechnungsmonats.</p></li>
      </ul>''')
      + abschnitt("gebuehren", "Was du an Stripe zahlst.", '<div class="rechnung rechnung-2">'
          + zettel("Anzahlung per Karte", [("Dein Kunde zahlt", "[[beispielAnzahlung.betrag]]"), ("Stripe-Gebühr", "[[beispielAnzahlung.gebuehr]]"), ("An Tattoofin", "0&nbsp;€"), ("Bei dir", "[[beispielAnzahlung.rest]]")])
          + zettel("Großes Motiv per Klarna", [("Dein Kunde zahlt", "[[beispielRaten.betrag]]"), ("Stripe-Gebühr", "[[beispielRaten.gebuehrKlarna]]"), ("An Tattoofin", "0&nbsp;€"), ("Bei dir", "[[beispielRaten.rest]]")])
          + '</div>\n      <div class="text" style="margin-top:var(--s5)"><p>Stripe-Gebühr je Zahlung: Karte [[gebuehr.karte]], Klarna [[gebuehr.klarna]]. Die Gebühr zahlst du direkt an Stripe, nicht an uns. Rechnungen ohne Garantie, Stand der Stripe-Preise: November 2026.</p></div>')
      + abschnitt("bedingungen", "Testwoche, Kündigung, Ablehnung.", '''<div class="text">
        <p><b>Testwoche:</b> [[preis.testBedingung]]</p>
        <p><b>Kündigung:</b> [[preis.kuendigung]]. Dein Stripe-Konto bleibt bei dir, Zahlungslinks und QR-Code enden.</p>
        <p><b>Lehnt Stripe dein Studio ab,</b> bekommst du die gezahlten Monate zurück, außer bei falschen Angaben oder Pflichtverletzung.</p>
        <p><b>[[preis.zielgruppe]].</b> Tattoofin ist für Studios und selbstständige Artists mit Gewerbe.</p>
        <p><a class="mehr-link" href="/vertrag.html" data-umami-event="vertrag-lesen">Vertrag vorab lesen</a></p>
      </div>''')
      + fragen_fuer("preis", "Fragen zum Preis.")
      + weiter("preis", "Eine Woche testen. Heute 0&nbsp;€.", [("Funktionen", "/funktionen/"), ("So geht’s", "/so-gehts/"), ("Fragen", "/fragen/")]),
      ld=[{"@type": "Product", "name": "Tattoofin Paket Monatlich", "brand": {"@id": LIVE + "/#org"},
           "description": "Zahlungslinks, Anzahlungen, Gutscheine und Klarna für Tattoo-Studios. [[preis.testwoche]] testen, danach [[preis.monat]] im Monat inkl. MwSt., keine Provision, monatlich kündbar.",
           "offers": {"@type": "Offer", "price": "[[preis.monatZahl]]", "priceCurrency": "EUR", "url": LIVE + "/preis/",
                      "priceSpecification": {"@type": "UnitPriceSpecification", "price": "[[preis.monatZahl]]", "priceCurrency": "EUR", "valueAddedTaxIncluded": True,
                                             "referenceQuantity": {"@type": "QuantitativeValue", "value": 1, "unitCode": "MON"}}}}],
      krumen=[("Preis", "/preis/")])

# ---------------------------------------------------------------- /fragen/
gruppen_html, sprung = "", ""
for g in FR["gruppen"]:
    fs = [f for f in FR["fragen"] if f["gruppe"] == g["id"]]
    sprung += f'<li><a href="#{g["id"]}">{g["titel"]}</a></li>'
    extra = fn() if any(f["fn"] for f in fs) else ""
    gruppen_html += (f'<div class="fragen-gruppe" id="{g["id"]}"><h3>{g["titel"]}</h3><div class="fragen-kurz">'
                     + "".join(frage_html(f) for f in fs) + f"</div>{extra}</div>")
seite("/fragen/",
      "Fragen zu Tattoofin: Geld, Klarna, Kosten, Anfangen | Tattoofin",
      "Antworten zu Geld und Auszahlung, Kosten, Kündigung, Anfangen und Raten*. *Raten über Klarna nach deren Prüfung. Achtung! Kreditaufnahme kostet Geld.",
      "fragen",
      seitenkopf("Fragen und&nbsp;Antworten.", f'Deine Frage ist nicht dabei? <a href="{WA}" data-umami-event="whatsapp-fragen-kopf">Schreib uns per WhatsApp an [[kontakt.whatsapp]]</a>.', "fragen",
                 motiv("stern", "Stern")),
      abschnitt("alle", "Alle Fragen.", f'<ul class="sprungliste" aria-label="Themen">{sprung}</ul>{gruppen_html}')
      + weiter("fragen", "Alles klar? Teste eine Woche.", [("Funktionen", "/funktionen/"), ("So geht’s", "/so-gehts/"), ("Preis", "/preis/")]),
      krumen=[("Fragen", "/fragen/")])

# ---------------------------------------------------------------- /ueber-uns/
fi = R.F["firma"]
seite("/ueber-uns/",
      "Über uns: Wer hinter Tattoofin steckt | Tattoofin",
      "Tattoofin ist ein Angebot der DSX Media Solutions UG aus Memmelsdorf bei Bamberg. Zahlungspartner ist Stripe, das Geld geht direkt aufs Konto des Studios.",
      None,
      seitenkopf("Wer hinter Tattoofin&nbsp;steckt.", "Tattoofin ist ein Angebot der [[firma.kurz]] aus [[firma.ortLang]]. Unser Team richtet alles mit dir ein, per&nbsp;WhatsApp.", "ueber-uns"),
      abschnitt("firma", "Die Firma.", f'''<div class="firma"><dl>
        <dt>Firma</dt><dd>[[firma.name]]</dd>
        <dt>Adresse</dt><dd>[[firma.strasse]], [[firma.plz]] [[firma.ort]]</dd>
        <dt>WhatsApp</dt><dd><a href="{WA}" data-umami-event="whatsapp-ueber-uns">[[kontakt.whatsapp]]</a></dd>
        <dt>E-Mail</dt><dd><a href="mailto:[[kontakt.mail]]">[[kontakt.mail]]</a></dd>
        <dt>Alles Weitere</dt><dd><a href="/impressum.html">Impressum</a></dd>
      </dl><img class="figur" src="/assets/start/figur.webp" alt="Tattoofin-Figur mit tätowierten Armen zeigt den Daumen hoch" width="300" height="310" loading="lazy" decoding="async"></div>''')
      + abschnitt("geld", "Wie das Geld läuft.", '''<div class="text">
        <p>Zahlungspartner ist <b>Stripe</b>. Jedes Studio hat sein eigenes Stripe-Konto, das Geld deiner Kunden geht direkt dorthin und von dort auf dein Bankkonto. Über unser Konto läuft es nicht.</p>
        <p>Tattoofin nimmt keine Provision. Du zahlst [[preis.monat]] [[preis.zusatz]], die Gebühr je Zahlung zahlst du direkt an Stripe.</p>
        <p>Zahlt dein Kunde mit Klarna, ist Klarna sein Vertragspartner, nicht Tattoofin und nicht du. [[firma.hinweis]]</p>
      </div>''')
      + abschnitt("schriftlich", "Was du vorab lesen kannst.", '''<ul class="karten karten-3">
        <li class="karte"><h3>Stripe sagt ja</h3><p>[[stripe.zulaessig]]</p></li>
        <li class="karte"><h3>Der Vertrag</h3><p>Lies ihn, bevor du dich anmeldest. <a href="/vertrag.html" data-umami-event="vertrag-lesen">Vertrag ansehen</a></p></li>
        <li class="karte"><h3>Datenschutz</h3><p>Wie wir mit deinen Daten und denen deiner Kunden umgehen. <a href="/datenschutz.html">Datenschutz</a> · <a href="/avv.html">Auftragsverarbeitung</a></p></li>
      </ul>''')
      + abschnitt("team", "Aus demselben Team.", '''<div class="text"><p><a href="https://tattookalender.de/">Tattookalender</a>, die Studio-Software für Termine, und <a href="https://tattooleadz.de/">TattooLeadz</a>, neue Kunden per Werbung für Tattoo-Studios.</p></div>''')
      + fragen_fuer("ueber-uns", "Fragen an uns.")
      + weiter("ueber-uns", "Lern uns kennen: eine Woche testen.", [("Funktionen", "/funktionen/"), ("Preis", "/preis/"), ("Fragen", "/fragen/")]),
      krumen=[("Über uns", "/ueber-uns/")])

# ---------------------------------------------------------------- 404
seite("/404",
      "Seite nicht gefunden | Tattoofin",
      "Diese Seite gibt es nicht. Von hier geht es zur Startseite, zu den Funktionen und zu den Fragen.",
      None,
      '''<section class="leer" aria-labelledby="titel">
      <img src="/assets/start/figur.webp" alt="" width="300" height="310">
      <h1 id="titel">Diese Seite gibt es&nbsp;nicht.</h1>
      <p class="unterzeile">Vielleicht hat sich die Adresse geändert. Hier geht es weiter:</p>
      <ul class="verwandt"><li><a href="/">Startseite</a></li><li><a href="/funktionen/">Funktionen</a></li><li><a href="/preis/">Preis</a></li><li><a href="/fragen/">Fragen</a></li></ul>
      <p class="klein">Du wolltest bei einem Studio bezahlen? Scanne den QR-Code im Studio noch einmal oder frag das Studio nach dem Link.</p>
    </section>''', "")
# 404: kein canonical auf /404, noindex
p404 = PUB / "404.html"
t = p404.read_text(encoding="utf-8")
t = t.replace(f'<link rel="canonical" href="{LIVE}/404">\n', "").replace('<meta name="theme-color"', '<meta name="robots" content="noindex">\n<meta name="theme-color"', 1)
t = re.sub(r'<meta property="og:url"[^>]*>', "", t)
p404.write_text(t, encoding="utf-8")


# ---------------------------------------------------------------- Ratgeber + Recht: gleicher Kopf und Fuß
NUR_WEB_SKRIPT = ('<script>(function(){if(/[?&]app=1/.test(location.search))document.querySelectorAll("[data-nur-web]").forEach(function(e){e.remove()})})();</script>')


def rahmen_um(datei, aktiv=None, kopf_ersetzen=True, nur_web=False):
    """Alter Kopf/Fuß → neuer. Inhalt bleibt. Wiederholbar (erkennt schon umgebaute Seiten)."""
    p = PUB / datei
    t = p.read_text(encoding="utf-8")
    t = re.sub(r'\n?<link rel="stylesheet" href="/assets/site/(werte|rahmen)\.css[^"]*">', "", t)
    t = re.sub(r'\n?<script src="/assets/site/menue\.js[^"]*"[^>]*></script>', "", t)
    t = t.replace(NUR_WEB_SKRIPT + "\n", "").replace(NUR_WEB_SKRIPT, "")
    k, fu = R.kopf(aktiv), R.fuss()
    if nur_web:  # Ansicht in der App (?app=1, Apple 3.1.3): kein Menü, kein Preis-Knopf
        k = k.replace('<header class="kopf kopf-web">', '<header class="kopf kopf-web" data-nur-web>', 1)
        fu = fu.replace('<footer class="fuss fuss-web">', '<footer class="fuss fuss-web" data-nur-web>', 1)
    if kopf_ersetzen:
        if "kopf-web" in t:
            t = re.sub(r'<header class="kopf kopf-web"[^>]*>.*?</header>', lambda m: k, t, count=1, flags=re.S)
        elif re.search(r"<header[ >]", t):
            t = re.sub(r"<header[ >].*?</header>", lambda m: k, t, count=1, flags=re.S)
        else:
            t = re.sub(r"(<body[^>]*>)", lambda m: m.group(1) + "\n" + k, t, count=1)
        if 'class="sprung"' not in t and 'class="skip"' not in t:
            t = re.sub(r"(<body[^>]*>)", r'\1\n<a class="sprung" href="#inhalt">Zum Inhalt springen</a>', t, count=1)
            t = re.sub(r"<main(?![^>]*\bid=)", '<main id="inhalt"', t, count=1)
    if "fuss-web" in t:
        t = re.sub(r'<footer class="fuss fuss-web"[^>]*>.*?</footer>', lambda m: fu, t, count=1, flags=re.S)
    elif "<footer" in t:
        t = re.sub(r"<footer[ >].*?</footer>", lambda m: fu, t, count=1, flags=re.S)
    else:
        t = t.replace("</main>", "</main>\n" + fu, 1) if "</main>" in t else t.replace("</body>", fu + "\n</body>", 1)
    t = t.replace("</head>", R.CSS_ALT + "\n</head>", 1)
    # impressum/datenschutz haben kein eigenes App-Skript: kleines Skript entfernt [data-nur-web] bei ?app=1 (vertrag/avv haben eins)
    skr = (R.MENUE_JS + "\n" if kopf_ersetzen else "") + (NUR_WEB_SKRIPT + "\n" if nur_web and datei in ("impressum.html", "datenschutz.html") else "")
    t = t.replace("</body>", skr + "</body>", 1)
    t = R.fuellen(t)
    p.write_text(t, encoding="utf-8")
    GEBAUT.append("/" + datei)


for d in ("ratgeber.html", "tattoo-anzahlung.html", "tattoo-finanzieren.html", "ratenzahlung-tattoostudio.html", "klarna-tattoostudio.html"):
    rahmen_um(d, "ratgeber")
for d in ("impressum.html", "datenschutz.html", "vertrag.html", "avv.html"):
    rahmen_um(d, None, nur_web=True)
rahmen_um("raten.html", None, kopf_ersetzen=False)  # Seite für Tattoo-Kunden: eigener Kopf ohne Studio-Menü, nur gleicher Fuß

# Vertrag/AVV: Das App-Skript entfernt Links auf andere Seiten – nur im Dokument (main), nicht in Kopf und Fuß.
for d in ("vertrag.html", "avv.html"):
    p = PUB / d
    t = p.read_text(encoding="utf-8")
    t = t.replace('document.querySelectorAll("a[href]").forEach(function (a) {', 'document.querySelectorAll("main a[href]").forEach(function (a) {')
    p.write_text(t, encoding="utf-8")


# Beschreibung, wo sie fehlt (Rechtstexte, Login)
BESCHREIBUNG = {
    "impressum.html": "Impressum von Tattoofin: [[firma.name]], [[firma.strasse]], [[firma.plz]] [[firma.ort]]. Kontakt per WhatsApp und E-Mail.",
    "datenschutz.html": "Datenschutzerklärung von Tattoofin: welche Daten wir von Studios und ihren Kunden verarbeiten, wofür, wie lange und welche Rechte du hast.",
    "login.html": "Studio-Login für Tattoofin: Gib deine E-Mail ein, wir schicken dir einen Link zum Anmelden.",
}
for d, b in BESCHREIBUNG.items():
    p = PUB / d
    t = p.read_text(encoding="utf-8")
    if '<meta name="description"' not in t:
        t = t.replace("</title>", "</title>\n" + R.fuellen(f'<meta name="description" content="{b}">'), 1)
        p.write_text(t, encoding="utf-8")

# Anmeldung und Login (App-Seiten, sonst unverändert): Impressum und Datenschutz von jeder Seite erreichbar (DDG)
RECHT_FUSS = ('<footer class="recht-fuss" style="max-width:640px;margin:24px auto 32px;padding:0 16px;font:400 14px/1.5 \'DM Sans\',system-ui,sans-serif;text-align:center">'
              '<a href="/impressum.html">Impressum</a> · <a href="/datenschutz.html">Datenschutz</a> · <a href="/vertrag.html">Vertrag</a></footer>')
for d in ("start.html", "login.html"):
    p = PUB / d
    t = re.sub(r'\n?<footer class="recht-fuss".*?</footer>', "", p.read_text(encoding="utf-8"), flags=re.S)
    t = t.replace("</body>", RECHT_FUSS + "\n</body>", 1)
    p.write_text(t, encoding="utf-8")

# ---------------------------------------------------------------- Startseite + /studios
subprocess.run([sys.executable, str(ROOT / "dev" / "startseite-bauen.py")], check=True)

# ---------------------------------------------------------------- Sitemap
SITEMAP = [("/", "1.0"), ("/funktionen/", "0.9"), ("/funktionen/anzahlung/", "0.9"), ("/funktionen/zahlungslink/", "0.8"),
           ("/funktionen/ratenzahlung/", "0.8"), ("/funktionen/gutschein/", "0.8"), ("/funktionen/app/", "0.7"), ("/so-gehts/", "0.8"),
           ("/preis/", "0.9"), ("/fragen/", "0.7"), ("/ueber-uns/", "0.5"), ("/ratgeber.html", "0.6"), ("/tattoo-anzahlung.html", "0.6"),
           ("/tattoo-finanzieren.html", "0.6"), ("/ratenzahlung-tattoostudio.html", "0.5"), ("/klarna-tattoostudio.html", "0.5"),
           ("/raten", "0.5"), ("/vertrag.html", "0.3"), ("/avv.html", "0.2"), ("/impressum.html", "0.2"), ("/datenschutz.html", "0.2")]
(PUB / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                                  + "".join(f"  <url><loc>{LIVE}{u}</loc><lastmod>{HEUTE}</lastmod><priority>{pr}</priority></url>\n" for u, pr in SITEMAP)
                                  + "</urlset>\n", encoding="utf-8")
print("gebaut:", len(GEBAUT), "Seiten +", "Startseite, /studios, sitemap.xml")
