#!/usr/bin/env python3
"""Baut public/index.html und public/studios.html aus EINER Vorlage (Kurzfassung 14.11.2026).

Die Flash-Motive (SVG) werden aus der Vorlage dev/vorlage/motive.html gelesen, damit die
Zeichnungen nicht doppelt gepflegt werden. Aufruf: python3 dev/startseite-bauen.py
Texte, Zahlen und Pflichtangaben stehen nur hier. Belege: content/tattoofin/spots-2026-11/belege/
fall-900-klarna-2026-11-07.md (900 € per Klarna, 07.11.2026, Studio anonym, Freigabe Domenic 13.11.2026).
"""
import html
import json
import re
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / "public"
MOTIVE = (ROOT / "dev" / "vorlage" / "motive.html").read_text(encoding="utf-8")


def motiv(name):
    m = re.search(r'<template id="%s">(.*?)</template>' % re.escape(name), MOTIVE, re.S)
    if not m:
        raise SystemExit("Motiv fehlt: " + name)
    return m.group(1).strip()


WA_NUMMER = "491624502375"
FN_LANG = "*Raten über Klarna, nach deren Bonitätsprüfung. Vertragspartner der Raten ist Klarna, nicht Tattoofin. Achtung! Kreditaufnahme kostet Geld."
FN_KURZ = "*Raten über Klarna, nach deren Bonitätsprüfung. Achtung! Kreditaufnahme kostet Geld."

FRAGEN = [
    ("Bekommt jeder Kunde Raten*?",
     "Nein. Klarna prüft jeden Kunden selbst. Sagt Klarna nein, zahlt dein Kunde mit Karte, Apple Pay oder Google Pay.", True),
    ("Und wenn der Kunde nicht zahlt?",
     "Bei Raten* liegt das Ausfallrisiko laut Stripe grundsätzlich bei Klarna. Reklamiert dein Kunde die Leistung, kann er bis zu 180 Tage zurückbuchen lassen. Bei einer Anzahlung hilft dir seine gespeicherte Bestätigung deiner Bedingungen als Nachweis. Unser Team hilft dir dabei.", True),
    ("Ist Tattoofin der Kreditgeber?",
     "Nein. Den Vertrag über die Raten* schließt dein Kunde mit Klarna. Du berätst nicht zu Krediten und sagst keine Raten* zu.", True),
    ("Was kostet es genau?",
     "49 € netto im Monat (58,31 € inkl. USt.), keine Provision. Dazu Stripe-Gebühren je Zahlung: Karte ab 1,5 % + 0,25 €, Klarna ab 2,99 % + 0,35 €. Der erste Monat ist beim Start fällig.", False),
    ("Wie kündige ich? Und wenn Stripe mich ablehnt?",
     "Im Portal, zum Ende des Abrechnungsmonats. Stripe-Konto und Aufsteller bleiben bei dir, Zahlungslinks und QR-Code enden. Lehnt Stripe dein Studio endgültig ab, bekommst du die gezahlten Monate zurück, außer bei falschen Angaben oder Pflichtverletzung.", False),
    ("Wann kommt das Geld, und was brauche ich?",
     "Stripe zahlt auf dein Bankkonto aus, nach den Fristen von Stripe. Du brauchst dein Studio als Unternehmen, ein Bankkonto und deinen Ausweis.", False),
]


def nbsp_zahlen(t):
    """1,5 % / 49 € / 0,25 € ohne Umbruch zwischen Zahl und Einheit."""
    t = re.sub(r"(\d) (€|%)", "\\1&nbsp;\\2", t)
    t = t.replace("% + ", "%&nbsp;+&nbsp;")
    return t


def jsonld(seite):
    faq = []
    for q, a, fn in FRAGEN:
        faq.append({"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a + (" " + FN_KURZ if fn else "")}})
    graph = [
        {"@type": "Organization", "@id": "https://tattoofin.de/#org", "name": "Tattoofin", "legalName": "DSX Media Solutions UG (haftungsbeschränkt)",
         "url": "https://tattoofin.de/", "logo": "https://tattoofin.de/assets/logo.png", "email": "info@tattoofin.de", "telephone": "+491624502375",
         "address": {"@type": "PostalAddress", "streetAddress": "Am Weingarten 9", "postalCode": "96117", "addressLocality": "Memmelsdorf", "addressCountry": "DE"},
         "sameAs": ["https://www.instagram.com/tattoofin.de/"]},
        {"@type": "WebSite", "@id": "https://tattoofin.de/#website", "url": "https://tattoofin.de/", "name": "Tattoofin", "inLanguage": "de-DE", "publisher": {"@id": "https://tattoofin.de/#org"}},
        {"@type": "Service", "name": "Zahlungsstruktur für Tattoo-Studios",
         "serviceType": "Zahlungslinks, QR-Zahlseite, Anzahlungen und Ratenzahlung über externe Anbieter für Tattoo-Studios",
         "provider": {"@id": "https://tattoofin.de/#org"}, "areaServed": {"@type": "Country", "name": "Deutschland"},
         "audience": {"@type": "BusinessAudience", "name": "Tattoo-Studios"},
         "offers": [{"@type": "Offer", "name": "Paket Monatlich",
                     "description": "49 € netto im Monat, keine Provision, danach nur die Zahlungsgebühren von Stripe. QR-Aufsteller aus Holz im Paket. Monatlich kündbar.",
                     "price": "49.00", "priceCurrency": "EUR",
                     "priceSpecification": {"@type": "UnitPriceSpecification", "price": "49.00", "priceCurrency": "EUR", "valueAddedTaxIncluded": False, "unitText": "Monat",
                                            "referenceQuantity": {"@type": "QuantitativeValue", "value": 1, "unitCode": "MON"}}}]},
        {"@type": "FAQPage", "mainEntity": faq},
    ]
    if seite == "studios":
        graph = [g for g in graph if g["@type"] != "WebSite"]
    return json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False)


def bauen(seite):
    studios = seite == "studios"
    wa_text = ("Hi Tattoofin-Team, ich habe eure Anzeige gesehen, habe ein Tattoo-Studio und eine Frage zu Tattoofin:" if studios
               else "Hi Tattoofin-Team, ich habe ein Tattoo-Studio und eine Frage zu Tattoofin:")
    wa = "https://wa.me/%s?text=%s" % (WA_NUMMER, urllib.parse.quote(wa_text, safe=""))
    wa_icon = motiv("wa-icon")

    def start(ort):
        # Startseite: genau "/start.html" (Paketwahl hat nur noch Monatlich; Prüfung in dev/betrieb.mjs Abschnitt 18)
        h = "/start.html"
        if studios:
            h += "?utm_source=studios&amp;utm_medium=seite&amp;utm_content=" + ort
        return '<a class="knopf" href="%s" data-umami-event="start-%s">Jetzt starten</a>' % (h, ort)

    stern = motiv("stern")
    fragen = []
    for q, a, fn in FRAGEN:
        antwort = "<p>%s</p>" % nbsp_zahlen(html.escape(a, quote=False))
        if fn:
            antwort += '<p class="raten-fn">%s</p>' % FN_KURZ
        fragen.append('      <details class="frage"><summary><span>%s</span><span class="zu" aria-hidden="true">%s</span></summary><div class="antwort">%s</div></details>'
                      % (html.escape(q, quote=False), stern, antwort))

    if studios:
        kopf_meta = """<title>Tattoofin für Tattoo-Studios – Zahlungslinks, Anzahlungen und mehr Zahlarten für deine Kunden</title>
<meta name="description" content="Zahlungslink per WhatsApp, Anzahlung vorab per Link gegen No-Shows und mehrere Zahlarten für dein Tattoo-Studio. Keine Provision: 49 € netto im Monat, keine Einrichtungsgebühr.">
<meta name="robots" content="noindex,follow">
<meta name="theme-color" content="#f5ead2">
<link rel="canonical" href="https://tattoofin.de/">
<meta property="og:type" content="website"><meta property="og:locale" content="de_DE"><meta property="og:site_name" content="Tattoofin">
<meta property="og:title" content="Tattoofin – Zahlungslinks, Anzahlungen und mehr Zahlarten für deine Kunden">
<meta property="og:description" content="Zahlungslink per WhatsApp, Anzahlung vorab per Link gegen No-Shows und mehrere Zahlarten für Tattoo-Studios. Keine Provision: 49 € netto im Monat.">
<meta property="og:url" content="https://tattoofin.de/studios"><meta property="og:image" content="https://tattoofin.de/assets/og.jpg">"""
    else:
        kopf_meta = """<title>Tattoofin – Zahlungslinks, Anzahlungen &amp; Raten* für Tattoo-Studios</title>
<meta name="description" content="Software für Tattoo-Studios: Zahlungslink per WhatsApp, QR-Zahlseite an der Theke, Anzahlung mit Bedingungen, Gutscheine. 49 € netto im Monat.">
<meta name="theme-color" content="#f5ead2">
<link rel="canonical" href="https://tattoofin.de/">
<meta property="og:type" content="website"><meta property="og:locale" content="de_DE"><meta property="og:site_name" content="Tattoofin">
<meta property="og:title" content="Tattoofin für Tattoo-Studios: Zahlungslink, Anzahlung, Raten*">
<meta property="og:description" content="Zahlungslink per WhatsApp, QR-Zahlseite, Anzahlung vorab und Raten* über Klarna. 49 € netto im Monat, ohne Provision.">
<meta property="og:url" content="https://tattoofin.de/"><meta property="og:image" content="https://tattoofin.de/assets/og.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">"""

    kunde = ('\n        <p class="kunde-link">Kein Studio, sondern Kunde? <a href="/raten?utm_source=studios&amp;utm_medium=seite&amp;utm_content=held" data-lp="raten">Hier entlang →</a></p>'
             if studios else "")

    anfrage = ""
    if studios:
        anfrage = """
  <details class="anfrage" id="anfrage">
    <summary><span class="anfrage-titel">Lieber erst mit unserem Team sprechen?</span><span class="zu" aria-hidden="true">%(stern)s</span></summary>
    <div class="anfrage-innen">
      <p class="anfrage-satz">Drei Angaben, dann meldet sich unser Team per WhatsApp. Kostet nichts, kein Vertrag.</p>
      <div class="formular-karte">
        <form id="anfrage-form" novalidate>
          <div class="feld">
            <label for="a-vorname">Dein Vorname</label>
            <input id="a-vorname" name="vorname" type="text" autocomplete="given-name" autocapitalize="words" enterkeyhint="next" required maxlength="60" aria-describedby="a-vorname-f">
            <p class="fehler" id="a-vorname-f" hidden></p>
          </div>
          <div class="feld">
            <label for="a-studio">Name deines Studios</label>
            <input id="a-studio" name="studio" type="text" autocomplete="organization" autocapitalize="words" enterkeyhint="next" required maxlength="120" placeholder="z. B. Ink Studio, Bamberg" aria-describedby="a-studio-h a-studio-f">
            <p class="hinweis" id="a-studio-h">Gern mit Ort.</p>
            <p class="fehler" id="a-studio-f" hidden></p>
          </div>
          <div class="feld">
            <label for="a-telefon">Handynummer für WhatsApp</label>
            <input id="a-telefon" name="telefon" type="tel" inputmode="tel" autocomplete="tel" enterkeyhint="send" required maxlength="40" placeholder="0151 23456789" aria-describedby="a-telefon-h a-telefon-f">
            <p class="hinweis" id="a-telefon-h">Wir schreiben dir nur zu deiner Anfrage.</p>
            <p class="fehler" id="a-telefon-f" hidden></p>
          </div>
          <div class="feld feld-haken">
            <input id="a-studio_bestaetigt" name="studio_bestaetigt" type="checkbox" required aria-describedby="a-studio_bestaetigt-f">
            <label for="a-studio_bestaetigt">Ich führe ein Tattoostudio bzw. arbeite in einem.</label>
            <p class="fehler" id="a-studio_bestaetigt-f" hidden></p>
          </div>
          <p class="kunde-weiter"><a href="/raten?utm_source=studios&amp;utm_medium=seite&amp;utm_content=formular" data-lp="raten">Du bist Kunde und willst dein Tattoo bezahlen? <b>→ hier entlang</b></a></p>
          <div class="honig" aria-hidden="true"><label for="a-web">Firmenwebsite</label><input id="a-web" name="firmenwebsite" type="text" tabindex="-1" autocomplete="off"></div>
          <button class="knopf knopf-voll" type="submit" id="a-senden">Einrichtung anfragen</button>
          <p class="status" id="a-status" role="status" aria-live="polite"></p>
          <p class="klein">Mit dem Absenden verarbeiten wir deine Angaben, um dich zu kontaktieren. Mehr in der <a href="/datenschutz#anfrage">Datenschutzerklärung</a>.</p>
        </form>
        <div class="danke" id="a-danke" hidden tabindex="-1">
          <img src="/assets/start/figur.png" alt="" width="88" height="91" loading="lazy" decoding="async">
          <h3>Danke, deine Anfrage ist angekommen.</h3>
          <p>Unser Team meldet sich per WhatsApp bei dir. Bis dahin musst du nichts vorbereiten.</p>
        </div>
      </div>
      <p class="wer">Tattoofin ist ein Angebot der DSX Media Solutions UG aus Memmelsdorf bei Bamberg.</p>
    </div>
  </details>
""" % {"stern": stern}

    skripte = """<script src="/assets/start/app.js" defer></script>
<script defer src="https://cloud.umami.is/script.js" data-website-id="507b740f-264e-4ba1-a7d0-9dbe49db75af" data-domains="tattoofin.de"></script>
<script src="/js/tf-track.js"></script>"""
    if studios:
        skripte += '\n<script src="/js/studios.js"></script>'

    # /studios ist noindex: keine strukturierten Daten (sonst doppelt zur Startseite)
    ld = "" if studios else '<script type="application/ld+json">%s</script>\n' % jsonld(seite)
    seite_html = f"""<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
{kopf_meta}
<link rel="icon" href="/favicon.png" type="image/png"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/assets/start/fonts/LuckiestGuy.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/start/fonts/DMSans.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/start/handy-kunde-oben.webp" as="image" type="image/webp">
<link rel="stylesheet" href="/assets/start/style.css">
{ld}</head>
<body{' data-wa="aus"' if studios else ''}>
<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs><pattern id="tf-punkte" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.2" cy="2.2" r="2.1" fill="#1f3d5c"/><circle cx="6.7" cy="6.7" r="2.1" fill="#1f3d5c"/></pattern></defs></svg>
<a class="sprung" href="#inhalt">Zum Inhalt springen</a>
<div class="bogen">

  <header class="kopf">
    <a class="kopf-marke" href="/" aria-label="Tattoofin Startseite"><img src="/assets/start/wortmarke.png" alt="Tattoofin" width="519" height="116"></a>
    <nav aria-label="Seite">
      <a href="#preis">Preis</a>
      <a class="kopf-fragen" href="#fragen">Fragen</a>
      <a class="kopf-wa" href="{wa}" aria-label="WhatsApp an das Tattoofin-Team" data-umami-event="whatsapp-kopf">{wa_icon}</a>
    </nav>
  </header>

  <main id="inhalt">
  <section class="auftakt">
    <div class="auftakt-kopf">
      <p class="kicker">Sleeve für 2.000&nbsp;€, aber dein Kunde hat's nicht auf einmal?</p>
      <h1>Raten* für deine Kunden.</h1>
    </div>
    <div class="buehne">
      {motiv("deko-stern")}
      {motiv("deko-mond")}
      {motiv("deko-blitz")}
      {motiv("deko-diamant")}
      {motiv("flash-1")}
      {motiv("flash-2")}
      {motiv("flash-3")}
      {motiv("flash-4")}
      {motiv("flash-5")}
      <img class="hausherr" src="/assets/start/figur.png" alt="Tattoofin-Figur mit tätowierten Armen zeigt den Daumen hoch" width="300" height="310" fetchpriority="high">
      <figure class="auftakt-handy">
        <span class="klebe" aria-hidden="true"></span>
        <span class="handy-rahmen"><img src="/assets/start/handy-kunde-oben.webp" alt="Echte Tattoofin-Zahlseite am Handy: Hi Lena, deine Zahlung an Ink Studio Bamberg, Schritt 1 von 2, 2.000,00 Euro, Sleeve linker Arm. Beispieldaten." width="600" height="545" fetchpriority="high"><button type="button" class="film-knopf" data-film aria-haspopup="dialog"><span aria-hidden="true">▶</span> 10 Sek. ansehen</button></span>
        <figcaption>Echte App · Beispieldaten</figcaption>
      </figure>
    </div>
    <div class="auftakt-fuss">
      <div class="auftakt-knopf">{start("auftakt")}</div>
      <p class="preiszeile">49&nbsp;€ netto im Monat · keine Provision · monatlich kündbar</p>
      <p class="raten-fn">{FN_LANG}</p>{kunde}
    </div>
  </section>

  <section class="fall" id="nr1" data-beleg aria-labelledby="fall-titel">
    <div class="fall-kopf">
      <span class="stempel-schild">Echter Fall</span>
      <h2 id="fall-titel">900<span class="eur">€</span> per Klarna.</h2>
    </div>
    <div class="fall-bild">
      <button type="button" class="motiv-knopf" data-stechen aria-label="Herz neu stechen">
        {motiv("herz-bezahlt")}
        <span class="nr" aria-hidden="true">1</span>
      </button>
      <figure class="bon">
        <span class="klebe" aria-hidden="true"></span>
        <span class="bon-kopf">Studio anonym</span>
        <span class="bon-zeile"><span>Drache, Rücken</span><span>1 Sitzung</span></span>
        <span class="bon-zeile bon-summe"><span>Summe</span><span>900,00&nbsp;€</span></span>
        <span class="bon-zeile"><span>Zahlart</span><span>Klarna</span></span>
        <span class="bon-stempel">Bezahlt 07.11.2026</span>
        <figcaption>Nachgezeichnet nach dem echten Zahlungseingang.</figcaption>
      </figure>
    </div>
    <div class="fall-text">
      <p>Drache auf dem Rücken, eine Sitzung. Bezahlt am 7. November, aufs eigene Stripe-Konto des Studios.</p>
      <p class="klein">Studio anonym. Klarna entscheidet bei jedem Kunden selbst.</p>
    </div>
  </section>

  <section class="werkzeuge" aria-labelledby="werkzeuge-titel">
    <h2 id="werkzeuge-titel">Alles läuft übers Handy.</h2>
    <div class="stuecke">
      <article class="stueck" id="nr2">
        <div class="stueck-bild">
          <figure class="abzug">
            <button type="button" class="abzug-knopf" data-abzug aria-expanded="false" aria-label="Bild größer zeigen">
              <span class="klebe" aria-hidden="true"></span>
              <img src="/assets/start/zahlungslink-whatsapp.webp" alt="Ausschnitt aus der Tattoofin-App: Zahlungslink für Lena über 2.000 Euro, mit den Knöpfen Per WhatsApp senden und Link kopieren. Beispieldaten." width="592" height="460" loading="lazy" decoding="async">
            </button>
            <figcaption>Beispieldaten</figcaption>
          </figure>
          <button type="button" class="motiv-knopf sticker" data-stechen aria-label="Schwalbe neu stechen">{motiv("motiv-2")}<span class="nr" aria-hidden="true">2</span></button>
        </div>
        <div class="stueck-text">
          <h3>Link per WhatsApp.</h3>
          <p>Betrag rein, Link raus. Dein Kunde zahlt am Handy.</p>
          <ul class="chips" aria-label="Zahlarten"><li>Karte</li><li>Apple&nbsp;Pay</li><li>Google&nbsp;Pay</li><li>Klarna</li></ul>
        </div>
      </article>
      <article class="stueck" id="nr3">
        <div class="stueck-bild">
          <figure class="abzug">
            <button type="button" class="abzug-knopf" data-abzug aria-expanded="false" aria-label="Bild größer zeigen">
              <span class="klebe" aria-hidden="true"></span>
              <img src="/assets/start/handy-anzahlung-oben.webp" alt="Ausschnitt der Tattoofin-Zahlseite am Handy: Hi Kai, deine Zahlung an Ink Studio Bamberg, 150 Euro, Rückenstück, Termin Freitag, Anzahlung. Beispieldaten." width="600" height="600" loading="lazy" decoding="async">
            </button>
            <figcaption>Beispieldaten</figcaption>
          </figure>
          <button type="button" class="motiv-knopf sticker" data-stechen aria-label="Anker neu stechen">{motiv("motiv-3")}<span class="nr" aria-hidden="true">3</span></button>
        </div>
        <div class="stueck-text">
          <h3>Anzahlung gegen No-Shows.</h3>
          <p>Erst zahlt der Kunde, dann blockst du den Termin.</p>
          <a class="mehr" href="/muster-anzahlungsbedingungen.pdf" data-umami-event="muster-pdf">Muster-Bedingungen gratis (PDF)</a>
        </div>
      </article>
      <article class="stueck nur-motiv" id="nr4">
        <div class="stueck-bild">
          <button type="button" class="motiv-knopf" data-stechen aria-label="Spielkarte mit QR-Code neu stechen">{motiv("motiv-4")}<span class="nr" aria-hidden="true">4</span></button>
        </div>
        <div class="stueck-text">
          <h3>QR an der Theke.</h3>
          <p>Holz-Aufsteller mit deinem Studionamen. Ist dabei.</p>
        </div>
      </article>
      <article class="stueck nur-motiv" id="nr5">
        <div class="stueck-bild">
          <button type="button" class="motiv-knopf" data-stechen aria-label="Rose mit Gutschein neu stechen">{motiv("motiv-5")}<span class="nr" aria-hidden="true">5</span></button>
        </div>
        <div class="stueck-text">
          <h3>Gutscheine verkaufen.</h3>
          <p>Code und PDF, fertig zum Verschenken.</p>
        </div>
      </article>
    </div>
  </section>

  <section class="ablauf" id="ablauf" aria-labelledby="ablauf-titel">
    <h2 id="ablauf-titel">In 3 Schritten startklar.</h2>
    <ol>
      <li><div class="stufe-bild">{motiv("stufe-1")}<span class="nr" aria-hidden="true">1</span></div><p><b>Online anmelden.</b> Dauert ein paar Minuten.</p></li>
      <li><div class="stufe-bild">{motiv("stufe-2")}<span class="nr" aria-hidden="true">2</span></div><p><b>Stripe-Konto anlegen.</b> Stripe prüft dein Studio.</p></li>
      <li><div class="stufe-bild">{motiv("stufe-3")}<span class="nr" aria-hidden="true">3</span></div><p><b>Unser Team richtet alles mit dir ein,</b> mit Testzahlung.</p></li>
    </ol>
  </section>

  <section class="preis" id="preis" aria-labelledby="preis-titel">
    <div class="preis-innen">
      <h2 id="preis-titel">49 € im Monat. Dazu nur Stripe.</h2>
      <div class="preis-schild">
        <svg class="faden" viewBox="0 0 120 90" aria-hidden="true" focusable="false"><path d="M60 8 C42 30 78 52 60 86" fill="none" stroke="#fff7e3" stroke-width="4" stroke-linecap="round"/></svg>
        <span class="reisszwecke" aria-hidden="true"></span>
        <div class="anhaenger">
          <span class="loch" aria-hidden="true"></span>
          <strong class="betrag">49<span class="eur">€</span></strong>
          <span class="einheit">netto im Monat</span>
          <span class="brutto">58,31&nbsp;€ inkl. USt. · Nur für Unternehmer.</span>
        </div>
      </div>
      <div class="beleg">
        <table>
          <caption>Dein Kunde zahlt 1.000<span class="eur">€</span></caption>
          <tbody>
            <tr><th scope="row">Stripe-Gebühr Karte</th><td>ab ca. 15&nbsp;€</td></tr>
            <tr><th scope="row">An Tattoofin</th><td>0&nbsp;€</td></tr>
            <tr class="summe"><th scope="row">Bei dir</th><td>bis ca. 985&nbsp;€</td></tr>
          </tbody>
        </table>
        <p class="beleg-hinweis">Beispiel Karte mit Mindestgebühr. Keine Garantie.</p>
      </div>
      <div class="preis-rest">
        <ul class="sticker-reihe" aria-label="Das gehört dazu">
          <li>Keine Provision</li>
          <li>Keine Einrichtungsgebühr</li>
          <li>Monatlich kündbar</li>
          <li>Holz-Aufsteller dabei</li>
        </ul>
        <div class="wege">{start("preis")}<a class="wa" href="/vertrag.html">Vertrag vorab lesen</a></div>
      </div>
    </div>
  </section>

  <section class="fragen" id="fragen" aria-labelledby="fragen-titel">
    <h2 id="fragen-titel">Noch Fragen?</h2>
    <div class="fragen-liste">
{chr(10).join(fragen)}
    </div>
  </section>

  <section class="schluss">
    <div class="schluss-kopf">
      <h2>Nächster Sleeve? Schick den Link.</h2>
      <p class="zeile">49&nbsp;€ netto im Monat · monatlich kündbar</p>
      <div class="wege">{start("schluss")}<a class="wa" href="{wa}" data-umami-event="whatsapp-schluss">Fragen? Schreib unserem Team per WhatsApp.</a></div>
    </div>
    <div class="hausherr-rahmen">
      <img class="hausherr-klein" src="/assets/start/figur.png" alt="" width="300" height="310" loading="lazy" decoding="async">
    </div>
  </section>
{anfrage}  </main>

  <footer class="fuss">
    <div class="fuss-innen">
      <img class="fuss-marke" src="/assets/start/wortmarke.png" alt="Tattoofin" width="519" height="116" loading="lazy" decoding="async">
      <nav aria-label="Rechtliches">
        <a href="/impressum.html">Impressum</a>
        <a href="/datenschutz.html">Datenschutz</a>
        <a href="/vertrag.html">Vertrag</a>
        <a href="/ratgeber.html">Ratgeber</a>{'''
        <a href="/login.html">Studio-Login</a>
        <a href="#" data-cookies>Cookie-Einstellungen</a>''' if studios else ''}
      </nav>
      <p>DSX Media Solutions UG (haftungsbeschränkt), Am Weingarten 9, 96117 Memmelsdorf. Tattoofin ist kein Kreditinstitut.</p>
    </div>
  </footer>

  <aside class="leiste" id="leiste" aria-label="Schnellzugriff">
    <span class="leiste-preis">49&nbsp;€ netto<br>im Monat</span>
    {start("leiste").replace('class="knopf"', 'class="knopf"')}
    <a class="leiste-wa" href="{wa}" aria-label="WhatsApp an das Tattoofin-Team" data-umami-event="whatsapp-leiste">{wa_icon}</a>
  </aside>

  <dialog class="film" id="film" aria-label="10 Sekunden: So entsteht ein Zahlungslink">
    <div class="film-box"></div>
    <p class="film-text">Echte App-Aufnahme, Beispieldaten.</p>
    <form method="dialog"><button class="film-zu" type="submit">Schließen</button></form>
  </dialog>
</div>
{skripte}
</body>
</html>
"""
    # Leere Platzhalter-Zeilen (Motive, die es nicht gibt) entfernen
    seite_html = re.sub(r"\n[ \t]*\n(?=[ \t]*\n)", "\n", seite_html)
    return seite_html


if __name__ == "__main__":
    for name, datei in (("start", "index.html"), ("studios", "studios.html")):
        (PUB / datei).write_text(bauen(name), encoding="utf-8")
        print("geschrieben:", PUB / datei)
