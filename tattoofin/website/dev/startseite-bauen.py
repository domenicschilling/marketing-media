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
     "Zahlt dein Kunde seine Raten* nicht, trägt laut Stripe Klarna das Risiko. Reklamiert er das Tattoo bei Klarna oder seiner Bank, kann ein Streitfall entstehen. Dann reichst du deine Nachweise ein, zum Beispiel seine gespeicherte Bestätigung deiner Anzahlungsbedingungen. Unser Team hilft dir dabei.", True),
    ("Ist Tattoofin der Kreditgeber?",
     "Nein. Den Vertrag über die Raten* schließt dein Kunde mit Klarna. Du berätst nicht zu Krediten und sagst keine Raten* zu.", True),
    ("Was kostet es genau?",
     "49,90 € im Monat inkl. MwSt. (41,93 € netto), keine Provision. Dazu Stripe-Gebühren je Zahlung: Karte ab 1,5 % + 0,25 €, Klarna ab 2,99 % + 0,35 €. Der erste Monat ist beim Start fällig.", False),
    ("Wie kündige ich? Und wenn Stripe mich ablehnt?",
     "Im Portal, zum Ende des Abrechnungsmonats. Dein Stripe-Konto bleibt bei dir, Zahlungslinks und QR-Code enden. Lehnt Stripe dein Studio endgültig ab, bekommst du die gezahlten Monate zurück, außer bei falschen Angaben oder Pflichtverletzung.", False),
    ("Wann kommt das Geld, und was brauche ich?",
     "Stripe zahlt auf dein Bankkonto aus, laut Stripe in Deutschland in der Regel 3 Werktage nach der Zahlung, die allererste Auszahlung nach 7 Tagen. Du brauchst dein Studio als Unternehmen, ein Bankkonto und deinen Ausweis.", False),
    ("Wie fange ich an?",
     "Online anmelden, dann legst du dein Stripe-Konto an und Stripe prüft dein Studio. Danach richtet unser Team alles mit dir ein, mit einer Testzahlung.", False),
    ("Ich hab schon SumUp & Co.",
     "Behalt es. Dein Kartengerät kassiert an der Theke. Tattoofin kassiert, wenn der Kunde nicht da ist: Anzahlung vorab, Rest per Link, Gutscheine.", False),
    ("Meine Kunden zahlen bar.",
     "Bar bleibt. Für eine Anzahlung muss dein Kunde dann aber extra vorbeikommen. Mit dem Link zahlt er sofort von zu Hause.", False),
    ("Technik ist nicht meins.",
     "Musst du nicht können. Unser Team richtet alles mit dir ein, per WhatsApp.", False),
]


# Erster Bildschirm passend zur Anzeige (16.11.2026, Runde 2): Die Variante steht fest, bevor etwas gezeichnet wird.
# Kopf-Skript (steht vor dem Stylesheet, damit es nicht auf style.css wartet und das Variantenbild sofort vorlädt): utm_content → html[data-hero] (CSS blendet die wechselnden Texte bis zum Tausch aus, höchstens 1,5 s) und lädt das passende Handybild vor.
# Tausch-Skript direkt hinter dem Hero: Texte, Knopf, Stempel und Bild tauschen, dann html.hero-ok. Ohne Skript bleibt der Standard (Rücken).
# Zuordnung: tv-a / bild-d2 / d → noshow, tv-b / ohne → Rücken (Standard), tv-c → link, tv-d → gutschein (bis 24.12., danach link).
HERO_BILDER = {"": "handy-kunde-oben.webp?v=20261116d", "noshow": "handy-anzahlung-oben.webp?v=20261116b", "gutschein": "handy-gutschein-oben.webp?v=20261116b"}
HERO_KOPF = """<script>(function(){try{var q=new URLSearchParams(location.search),u=(q.get('utm_content')||q.get('hero')||'').toLowerCase(),v='';
if(/(^|[^a-z])tv-?a([^a-z]|$)|^d$|bild-?d2?|no-?show|anzahlung/.test(u))v='noshow';
else if(/(^|[^a-z])tv-?c([^a-z]|$)|10-?sek|link/.test(u))v='link';
else if(/(^|[^a-z])tv-?d([^a-z]|$)|gutschein|weihnacht/.test(u))v=new Date()<new Date('2026-12-25T00:00:00+01:00')?'gutschein':'link';
var d=document.documentElement,B=%s,l=document.createElement('link');
if(!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)){d.classList.add('stech-warten');setTimeout(function(){d.classList.remove('stech-warten')},4000);}
l.rel='preload';l.as='image';l.type='image/webp';l.href='/assets/start/'+(B[v]||B['']);l.setAttribute('fetchpriority','high');document.head.appendChild(l);
if(v){d.setAttribute('data-hero',v);setTimeout(function(){d.classList.add('hero-ok')},1500);}}catch(e){}})();</script>
""" % json.dumps(HERO_BILDER)
HERO_VARIANTEN = {
    "noshow": {"h": "No-Show? Erst Anzahlung. Dann Termin.", "s": "Anzahlungs-Link per WhatsApp schicken – erst wenn dein Kunde gezahlt hat, blockst du den\u00a0Termin.", "c": "Anzahlung einrichten",
               "b": "Kunde zahlt an und bestätigt deine\u00a0Bedingungen.", "bh": "#nr3",
               "bild": HERO_BILDER["noshow"], "alt": "Echte Tattoofin-Zahlseite am Handy: Hi Kai, deine Zahlung an Ink Studio Bamberg, 150 Euro, Rückenstück, Termin Freitag, Anzahlung. Beispieldaten."},
    "link": {"h": "Betrag rein. Link raus. Bezahlt.", "s": "Dein Kunde zahlt mit Karte, Apple Pay, Google Pay oder\u00a0Klarna."},
    "gutschein": {"h": "Weihnachten: Gutscheine per Link\u00a0verkaufen.", "s": "Dein Kunde zahlt am Handy und bekommt Code und PDF zum\u00a0Verschenken.", "c": "Gutscheine einrichten",
                  "b": "Kunde bekommt Code und PDF direkt per\u00a0E-\u2060Mail.", "bh": "#nr5",
                  "bild": HERO_BILDER["gutschein"], "alt": "Echte Tattoofin-Gutschein-Kaufseite am Handy: Hi Greta, dein Gutschein von Ink Studio Bamberg, 150 Euro, Wertgutschein für Max. Beispieldaten."},
}
HERO_TAUSCH = """<script>(function(){var d=document.documentElement,V=(%s)[d.getAttribute('data-hero')];
if(V){var t=function(s,x){var e=document.querySelector(s);if(e&&x)e.textContent=x;};
t('.auftakt [data-hero="h"]',V.h);t('.auftakt [data-hero="s"]',V.s);t('.auftakt-knopf .knopf',V.c);t('.auftakt [data-hero="b"]',V.b);
var a=document.querySelector('.auftakt [data-hero="b"]');if(a&&V.bh)a.setAttribute('href',V.bh);
var i=document.querySelector('.auftakt-handy img');if(i&&V.bild){i.src='/assets/start/'+V.bild;i.alt=V.alt;}}
d.classList.add('hero-ok');})();</script>
""" % json.dumps(HERO_VARIANTEN, ensure_ascii=False).replace("\\u00a0", "\u00a0")


def nbsp_zahlen(t):
    """1,5 % / 49,90 € / 0,25 € ohne Umbruch zwischen Zahl und Einheit."""
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
                     "description": "49,90 € im Monat inkl. MwSt. (41,93 € netto), keine Provision, danach nur die Zahlungsgebühren von Stripe. QR-Code zum Ausdrucken im Paket. Monatlich kündbar.",
                     "price": "49.90", "priceCurrency": "EUR",
                     "priceSpecification": {"@type": "UnitPriceSpecification", "price": "49.90", "priceCurrency": "EUR", "valueAddedTaxIncluded": True, "unitText": "Monat",
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
        # Knopftext (Prüfung 16.11.2026): nur „Studio anmelden“, keine Minutenangabe (nicht gemessen)
        text = "Studio anmelden"
        return '<a class="knopf" href="%s" data-umami-event="start-%s">%s</a>' % (h, ort, text)

    stern = motiv("stern")
    # Nutzen fürs Studio direkt unter dem Hero (Domenic 16.11.2026: „der nutzen fürs studio muss unter dem hero bereich kommen“).
    # Was das Studio davon hat, nicht wie es geht (das „Wie“ steht in „Alles läuft übers Handy“). Keine Zahlen, keine Versprechen über Ergebnisse.
    # Raten*-Aussage nur in Karte 1, eigene kleine Fußnote im selben Abschnitt (Prüfung dev/betrieb.mjs Abschnitt 17 g und 17d).
    def klein_motiv(name, alt_id=None, neu_id=None):
        m = re.search(r"<svg.*?</svg>", motiv(name), re.S).group(0)
        m = re.sub(r'class="motiv stech"', 'class="motiv"', m, count=1)
        m = re.sub(r'role="img" aria-label="[^"]*"', 'aria-hidden="true" focusable="false"', m, count=1)
        if alt_id:
            m = m.replace('id="%s"' % alt_id, 'id="%s"' % neu_id).replace('href="#%s"' % alt_id, 'href="#%s"' % neu_id)
        return m
    # „Das kann Tattoofin“ (Umbau 16.11.2026 abends, Domenic: „Man muss da wirklich erklären, was geht denn alles mit der App?“):
    # die vier Zahlungsarten fürs Studio, darunter, womit der Kunde zahlt. Ratenzahlung* bewusst als letzte Karte: so steht die Fußnote
    # am Handy (auch 320 px) dicht darunter (≤ 560 px, dev/betrieb.mjs 17d/17g). Nur, was wirklich geht (config ZAHLARTEN = card,klarna; Karte
    # inkl. Apple Pay/Google Pay; Gutscheine nur Karte). KEIN PayPal (über Stripe Connect mit Direct Charges nicht möglich).
    # ids nr1–nr5: Sprungziele der Flash-Motive im Hero (nr1 Klarna, nr2 Zahlungslink, nr3 Anzahlung, nr5 Gutschein; nr4 QR in „So geht's“).
    NUTZEN = [
        ("nr3", klein_motiv("motiv-3", "tf-b2-z", "tf-n3"), "Anzahlung", "Vor dem Termin.", "Dein Kunde zahlt an und bestätigt deine Bedingungen. Erst dann blockst du den Termin."),
        ("nr2", klein_motiv("motiv-2"), "Gesamtzahlung", "Nach der Sitzung.", "Den ganzen Betrag oder den Rest nach der Anzahlung, per Link oder QR-Code."),
        ("nr5", klein_motiv("motiv-5"), "Gutschein", "Zum Verschenken.", "Dein Kunde kauft per Link und bekommt Code und PDF per E-Mail."),
        ("nr1", klein_motiv("flash-1", "tf-b1", "tf-n1"), "Ratenzahlung*", "Für große Tattoos.", "Dein Kunde zahlt in Raten* über Klarna. Du bekommst den ganzen Betrag auf einmal."),
    ]
    nutzen = ('  <section class="nutzen" id="nutzen" aria-labelledby="nutzen-titel">\n'
              '    <h2 id="nutzen-titel">Was du damit machen&nbsp;kannst.</h2>\n'
              '    <p class="abschnitt-satz">Für jede Zahlung in deinem Studio ein Link. Dein Kunde zahlt am Handy.</p>\n    <ul class="nutzen-liste">\n'
              + "".join('      <li class="nutzen-karte" id="%s"><span class="nutzen-motiv">%s</span><h3>%s</h3><p><b>%s</b> %s</p></li>\n' % (i, m, h, w, s) for i, m, h, w, s in NUTZEN)
              + '    </ul>\n'
              '    <div class="zahlarten">\n'
              '      <p class="zahlarten-titel">Dein Kunde zahlt mit</p>\n'
              '      <ul class="chips" aria-label="Zahlarten"><li>Karte</li><li>Apple&nbsp;Pay</li><li>Google&nbsp;Pay</li><li>Klarna*</li></ul>\n'
              '      <p class="zahlarten-satz">Das Geld geht direkt auf dein eigenes <span class="nw">Stripe-Konto</span>. Tattoofin nimmt keine Provision. Gutscheine ohne&nbsp;Klarna.</p>\n'
              '    </div>\n'
              '    <p class="raten-fn">%s</p>\n  </section>\n\n' % FN_KURZ)

    # „Was es dir bringt“ (Domenic 16.11. abends: „Was bringt es dir? Vorteile.“). Nur Belegbares: Mail bei Zahlungseingang
    # (emails.mjs zahlungEingegangen), Push in der App, Zahlseite mit Studionamen (pay.mjs), Gutscheine per Link. Keine Zahlen, keine Versprechen.
    VORTEILE = [
        ("Weniger No-Shows.", "Du blockst erst, wenn die Anzahlung da ist. Sagt der Kunde kurzfristig ab, gelten deine Bedingungen."),
        ("Kein Hinterherlaufen.", "Link schicken statt Kontonummer diktieren. Du siehst sofort, wer bezahlt hat."),
        ("Nachricht bei jeder Zahlung.", "Per E-Mail oder in der iPhone-App. Die App bekommst du nach der Anmeldung von uns."),
        ("Umsatz, auch wenn zu ist.", "Gutscheine verkaufst du per Link, abends, am Wochenende, vor Weihnachten."),
        ("Dein Studio, dein Name.", "Dein Kunde zahlt auf einer Seite mit deinem Studionamen, nicht mit unserem."),
        ("Alles an einem Ort.", "Zahlungslinks, Anzahlungen, Gutscheine und Auszahlungen in einer App und im Browser."),
    ]
    vorteile = ('  <section class="vorteile" id="vorteile" aria-labelledby="vorteile-titel">\n'
                '    <h2 id="vorteile-titel">Was es dir&nbsp;bringt.</h2>\n    <ul class="vorteil-liste">\n'
                + "".join('      <li class="vorteil"><h3>%s</h3><p>%s</p></li>\n' % (h, s) for h, s in VORTEILE)
                + '    </ul>\n  </section>\n\n')
    # Eigener Abschnitt „Du bekommst dein Geld“ (Domenic: „nicht so, dass du selber finanzierst, sondern du kriegst dein Geld und die Kunden
    # finanzieren über Klarna“). Auszahlung laut Stripe-Doku (docs.stripe.com/payments/balances, Settlement timing, Germany: erste Auszahlung
    # 7 Kalendertage, danach 3 Werktage; Stand 16.11.2026). Kein „sofort“ (nicht belegt). Raten*-Aussage mit eigener Fußnote ≤ 560 px darunter.
    geld = f'''  <section class="geld" id="geld" aria-labelledby="geld-titel">
    <div class="geld-innen">
      <h2 id="geld-titel">Dein Geld kommt auf&nbsp;einmal.</h2>
      <p class="abschnitt-satz">Dein Kunde finanziert über Klarna, nicht du. Du finanzierst nichts vor und wartest auf keine&nbsp;Rate.</p>
      <div class="geldfluss">
        <div class="geld-station"><span class="geld-wer">Dein Kunde</span><strong>zahlt in Raten*</strong><span>Den Ratenvertrag schließt er mit Klarna, nicht mit dir.</span></div>
        <span class="geld-pfeil" aria-hidden="true">→</span>
        <div class="geld-station geld-du"><span class="geld-wer">Du</span><strong>bekommst den ganzen Betrag auf&nbsp;einmal</strong><span>Abzüglich Stripe-Gebühr, auf dein eigenes <span class="nw">Stripe-Konto</span>.</span></div>
      </div>
      <p class="raten-fn">{FN_LANG}</p>
      <ul class="geld-punkte">
        <li><b>Wann ist das Geld auf deinem Konto?</b> Stripe zahlt auf dein Bankkonto aus. Laut Stripe in Deutschland in der Regel 3&nbsp;Werktage nach der Zahlung, die allererste Auszahlung nach 7&nbsp;Tagen.</li>
        <li><b>Und wenn der Kunde nicht zahlt?</b> Dann trägt laut Stripe Klarna das Risiko, nicht&nbsp;du.</li>
        <li><b>Sagt Klarna nein?</b> Dann zahlt dein Kunde mit Karte, Apple Pay oder Google&nbsp;Pay.</li>
      </ul>
      <a class="mehr" href="/ratenzahlung-tattoostudio.html">Mehr zur Ratenzahlung im Tattoostudio&nbsp;→</a>
    </div>
  </section>

'''
    fragen = []
    for q, a, fn in FRAGEN:
        antwort = "<p>%s</p>" % nbsp_zahlen(html.escape(a, quote=False))
        if fn:
            antwort += '<p class="raten-fn">%s</p>' % FN_KURZ
        fragen.append('      <details class="frage"><summary><span>%s</span><span class="zu" aria-hidden="true">%s</span></summary><div class="antwort">%s</div></details>'
                      % (html.escape(q, quote=False), stern, antwort))

    if studios:
        kopf_meta = """<title>Tattoofin für Tattoo-Studios – Zahlungslinks, Anzahlungen und mehr Zahlarten für deine Kunden</title>
<meta name="description" content="Zahlungslink per WhatsApp, Anzahlung vorab per Link gegen No-Shows und mehrere Zahlarten für dein Tattoo-Studio. Keine Provision: 49,90 € im Monat inkl. MwSt., keine Einrichtungsgebühr.">
<meta name="robots" content="noindex,follow">
<meta name="theme-color" content="#f5ead2">
<link rel="canonical" href="https://tattoofin.de/">
<meta property="og:type" content="website"><meta property="og:locale" content="de_DE"><meta property="og:site_name" content="Tattoofin">
<meta property="og:title" content="Tattoofin – Zahlungslinks, Anzahlungen und mehr Zahlarten für deine Kunden">
<meta property="og:description" content="Zahlungslink per WhatsApp, Anzahlung vorab per Link gegen No-Shows und mehrere Zahlarten für Tattoo-Studios. Keine Provision: 49,90 € im Monat inkl. MwSt.">
<meta property="og:url" content="https://tattoofin.de/studios"><meta property="og:image" content="https://tattoofin.de/assets/og.jpg">"""
    else:
        kopf_meta = """<title>Tattoofin – Zahlungslinks, Anzahlungen &amp; Raten* für Tattoo-Studios</title>
<meta name="description" content="Software für Tattoo-Studios: Zahlungslink per WhatsApp, QR-Zahlseite an der Theke, Anzahlung mit Bedingungen, Gutscheine. 49,90 € im Monat inkl. MwSt.">
<meta name="theme-color" content="#f5ead2">
<link rel="canonical" href="https://tattoofin.de/">
<meta property="og:type" content="website"><meta property="og:locale" content="de_DE"><meta property="og:site_name" content="Tattoofin">
<meta property="og:title" content="Tattoofin für Tattoo-Studios: Zahlungslink, Anzahlung, Raten*">
<meta property="og:description" content="Zahlungslink per WhatsApp, QR-Zahlseite, Anzahlung vorab und Raten* über Klarna. 49,90 € im Monat inkl. MwSt., ohne Provision.">
<meta property="og:url" content="https://tattoofin.de/"><meta property="og:image" content="https://tattoofin.de/assets/og.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">"""

    # /studios: Link für Endkunden nicht mehr im ersten Bildschirm (lenkt Studios ab), sondern im Fuß
    kunde = ""

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
          <img src="/assets/start/figur.webp" alt="" width="88" height="91" loading="lazy" decoding="async">
          <h3>Danke, deine Anfrage ist angekommen.</h3>
          <p>Unser Team meldet sich per WhatsApp bei dir. Bis dahin musst du nichts vorbereiten.</p>
        </div>
      </div>
      <p class="wer">Tattoofin ist ein Angebot der DSX Media Solutions UG aus Memmelsdorf bei Bamberg.</p>
    </div>
  </details>
""" % {"stern": stern}

    skripte = """<script src="/assets/start/app.js?v=20261116b" defer></script>
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
{HERO_KOPF}{kopf_meta}
<link rel="icon" href="/favicon.png" type="image/png"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/assets/start/fonts/LuckiestGuy.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/start/fonts/DMSans.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/start/style.css?v=20261116f">
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
      <h1 data-hero="h">Ganzer&nbsp;Rücken? 4.000&nbsp;€ auf&nbsp;einmal.</h1>
      <p class="unterzeile" data-hero="s">Link per WhatsApp schicken – dein Kunde zahlt am Handy, auch per&nbsp;Klarna.</p>
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
      <img class="hausherr" src="/assets/start/figur.webp" alt="Tattoofin-Figur mit tätowierten Armen zeigt den Daumen hoch" width="300" height="310" decoding="async">
      <figure class="auftakt-handy">
        <span class="klebe" aria-hidden="true"></span>
        <span class="handy-rahmen"><img src="/assets/start/{HERO_BILDER['']}" alt="Echte Tattoofin-Zahlseite am Handy: Hi Lena, deine Zahlung an Ink Studio Bamberg, Schritt 1 von 2, 4.000,00 Euro, Ganzer Rücken. Beispieldaten." width="600" height="545"><span class="handy-hinweis" aria-hidden="true">Beispieldaten</span><button type="button" class="film-knopf" data-film aria-haspopup="dialog"><span aria-hidden="true">▶</span> 10 Sek. ansehen</button></span>
      </figure>
    </div>
    <div class="auftakt-fuss">
      <div class="auftakt-knopf">{start("auftakt")}</div>
      <p class="preiszeile">49,90&nbsp;€ im Monat · monatlich kündbar</p>
    </div>
  </section>
{HERO_TAUSCH}
{nutzen}{vorteile}{geld}  <section class="ablauf" id="ablauf" data-beleg aria-labelledby="ablauf-titel">
    <h2 id="ablauf-titel">So läuft&rsquo;s.</h2>
    <p class="abschnitt-satz">In der iPhone-App oder im Browser. Ohne Kartengerät.</p>
    <ol>
      <li><div class="stufe-bild">{motiv("stufe-1")}<span class="nr" aria-hidden="true">1</span></div><p><b>Betrag eintippen.</b> Zum Beispiel 900&nbsp;€ für einen Drachen auf dem Rücken.</p></li>
      <li id="nr4"><div class="stufe-bild">{motiv("stufe-2")}<span class="nr" aria-hidden="true">2</span></div><p><b>Link schicken.</b> Per WhatsApp. Oder dein Kunde scannt deinen QR-Code an der Theke.</p></li>
      <li><div class="stufe-bild">{motiv("stufe-3")}<span class="nr" aria-hidden="true">3</span></div><p><b>Bezahlt.</b> Du siehst es sofort in der App. Stripe zahlt auf dein Bankkonto aus.</p></li>
    </ol>
    <div class="fall" id="fall">
      <figure class="bon">
        <span class="klebe" aria-hidden="true"></span>
        <span class="bon-kopf">Studio anonym</span>
        <span class="bon-zeile"><span>Drache, Rücken</span><span>1 Sitzung</span></span>
        <span class="bon-zeile bon-summe"><span>Summe</span><span>900,00&nbsp;€</span></span>
        <span class="bon-zeile"><span>Zahlart</span><span>Klarna</span></span>
        <span class="bon-stempel">Bezahlt 07.11.2026</span>
        <figcaption>Nachgezeichnet nach dem echten Zahlungseingang.</figcaption>
      </figure>
      <div class="fall-text">
        <span class="stempel-schild">Echter Fall</span>
        <h3 id="fall-titel">900<span class="eur">€</span> per Klarna.</h3>
        <p>So lief es am 7. November in einem Studio: Link geschickt, Kunde zahlt per Klarna, das Geld kommt aufs eigene <span class="nw">Stripe-Konto</span>.</p>
        <p class="klein">Studio anonym. Klarna entscheidet bei jedem Kunden selbst.</p>
      </div>
    </div>
  </section>

  <section class="preis" id="preis" aria-labelledby="preis-titel">
    <div class="preis-innen">
      <h2 id="preis-titel">Eine Anzahlung zahlt Tattoofin fast 3&nbsp;Monate.</h2>
      <p class="preis-rechnung">Kunde kommt nicht? 150&nbsp;€ Anzahlung, minus Stripe-Gebühr ca.&nbsp;2,50&nbsp;€ =&nbsp;147,50&nbsp;€. Tattoofin kostet 49,90&nbsp;€ im Monat.</p>
      <div class="preis-schild">
        <svg class="faden" viewBox="0 0 120 90" aria-hidden="true" focusable="false"><path d="M60 8 C42 30 78 52 60 86" fill="none" stroke="#fff7e3" stroke-width="4" stroke-linecap="round"/></svg>
        <span class="reisszwecke" aria-hidden="true"></span>
        <div class="anhaenger">
          <span class="loch" aria-hidden="true"></span>
          <strong class="betrag">49,90<span class="eur">€</span></strong>
          <span class="einheit">im Monat, inkl. MwSt.</span>
          <span class="brutto">(41,93&nbsp;€ netto) · Nur für Unternehmer.</span>
        </div>
      </div>
      <div class="beleg">
        <table>
          <caption>Dein Kunde zahlt 4.000<span class="eur">€</span> per Klarna</caption>
          <tbody>
            <tr><th scope="row">Stripe-Gebühr Klarna</th><td>ab ca. 120&nbsp;€</td></tr>
            <tr><th scope="row">An Tattoofin</th><td>0&nbsp;€</td></tr>
            <tr class="summe"><th scope="row">Bei dir</th><td>bis ca. 3.880&nbsp;€</td></tr>
          </tbody>
        </table>
        <p class="beleg-hinweis">Mit Karte ab ca. 60&nbsp;€ Gebühr. Keine Garantie.</p>
      </div>
      <div class="preis-rest">
        <ul class="sticker-reihe" aria-label="Das gehört dazu">
          <li>Keine Provision</li>
          <li>Keine Einrichtungsgebühr</li>
          <li>Monatlich kündbar</li>
          <li>Unser Team richtet’s mit dir ein</li>
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
      <h2>Nächster Termin? Schick den Link.</h2>
      <p class="zeile">49,90&nbsp;€ im Monat inkl. MwSt. · monatlich kündbar <span class="b2b">· nur für Unternehmer</span></p>
      <div class="wege">{start("schluss")}<a class="wa" href="{wa}" data-umami-event="whatsapp-schluss">Fragen? Schreib unserem Team per WhatsApp.</a></div>
    </div>
    <div class="hausherr-rahmen">
      <img class="hausherr-klein" src="/assets/start/figur.webp" alt="" width="300" height="310" loading="lazy" decoding="async">
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
        <a href="/ratgeber.html">Ratgeber</a>
        <a href="/login.html">Studio-Login</a>
        <a href="#" data-cookies>Cookie-Einstellungen</a>{'''
        <a href="/raten?utm_source=studios&amp;utm_medium=seite&amp;utm_content=fuss" data-lp="raten">Du bist Kunde?</a>''' if studios else ''}
      </nav>
      <p>DSX Media Solutions UG (haftungsbeschränkt), Am Weingarten 9, 96117 Memmelsdorf. Tattoofin ist kein Kreditinstitut.</p>
    </div>
  </footer>

  <aside class="leiste" id="leiste" aria-label="Schnellzugriff">
    <span class="leiste-preis">49,90&nbsp;€ im Monat<br>inkl. MwSt.</span>
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
