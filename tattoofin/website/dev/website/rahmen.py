"""Gemeinsame Bausteine der Website tattoofin.de (Schilling Websitekonzept, 18.11.2026).

Kopf, Fuß, Seitenkopf-Daten und Skripte stehen NUR hier. Genutzt von dev/startseite-bauen.py (Startseite)
und dev/website/website-bauen.py (Unterseiten, Ratgeber, Recht, 404). Zahlen kommen aus fakten.json.
"""
import html
import json
import re
import urllib.parse
from pathlib import Path

HIER = Path(__file__).resolve().parent
ROOT = HIER.parent.parent
PUB = ROOT / "public"
F = json.loads((HIER / "fakten.json").read_text(encoding="utf-8"))
MOTIVE = (ROOT / "dev" / "vorlage" / "motive.html").read_text(encoding="utf-8")
LIVE = "https://tattoofin.de"
CSS_V = "20261119a"


def fakt(pfad):
    wert = F
    for teil in pfad.split("."):
        wert = wert[teil]
    return wert


def nbsp(t):
    """Kein Umbruch zwischen Zahl und Einheit (49,90 €, 1,5 % + 0,25 €, 3 Werktage, 0162 …)."""
    t = re.sub(r"(\d) (€|%|Tage|Tagen|Werktage|Monate|Monat\b)", "\\1\u00a0\\2", t)
    t = t.replace("% + ", "%\u00a0+\u00a0")
    t = re.sub(r"\b0162 4502375\b", "0162\u00a04502375", t)
    return t


def fuellen(text):
    """[[preis.monat]] usw. aus fakten.json einsetzen (geht in f-Strings, %-Strings und JSON-LD).
    Im eingesetzten Wert stehen Zahl und Einheit ohne Umbruch. Unbekannter Platzhalter = Abbruch."""
    def ein(m):
        return nbsp(str(fakt(m.group(1))))
    t = re.sub(r"\[\[([a-zA-Z]+\.[a-zA-Z]+)\]\]", ein, text)
    if "[[" in t:
        raise SystemExit("Platzhalter übrig: " + t[t.index("[["):t.index("[[") + 40])
    return t


def motiv(name):
    m = re.search(r'<template id="%s">(.*?)</template>' % re.escape(name), MOTIVE, re.S)
    if not m:
        raise SystemExit("Motiv fehlt: " + name)
    return m.group(1).strip()


def motiv_klein(name, alt_id=None, neu_id=None, label=None):
    """Flash-Motiv als ruhiges Bild (ohne Stech-Animation); eigene ids, damit es mehrfach auf einer Seite stehen kann."""
    m = re.search(r"<svg.*?</svg>", motiv(name), re.S).group(0)
    m = re.sub(r'class="motiv stech"', 'class="motiv"', m, count=1)
    ersatz = ('role="img" aria-label="%s"' % html.escape(label)) if label else 'aria-hidden="true" focusable="false"'
    m = re.sub(r'role="img" aria-label="[^"]*"', ersatz, m, count=1)
    if alt_id:
        m = m.replace('id="%s"' % alt_id, 'id="%s"' % neu_id).replace('href="#%s"' % alt_id, 'href="#%s"' % neu_id)
    return m


def wa_link(text="Hi Tattoofin-Team, ich habe ein Tattoo-Studio und eine Frage zu Tattoofin:"):
    return "https://wa.me/%s?text=%s" % (fakt("kontakt.whatsappNr"), urllib.parse.quote(text, safe=""))


WA_NR = nbsp(fakt("kontakt.whatsapp"))

# Menü (Seitenplan 18.11.2026): 5 Wörter, Login leise, ein Knopf. Gleich auf jeder Seite.
MENUE = [
    ("Funktionen", "/funktionen/", "funktionen"),
    ("So geht’s", "/so-gehts/", "so-gehts"),
    ("Preis", "/preis/", "preis"),
    ("Fragen", "/fragen/", "fragen"),
    ("Ratgeber", "/ratgeber.html", "ratgeber"),
]

# Fuß: ganze Seitenübersicht (W17). „Klarna im Studio“ statt „Ratenzahlung*“, damit der Link selbst keine Kreditwerbung ist.
FUSS_SEITEN = [
    ("Startseite", "/"),
    ("Funktionen", "/funktionen/"),
    ("Anzahlung", "/funktionen/anzahlung/"),
    ("Zahlungslink", "/funktionen/zahlungslink/"),
    ("Klarna im Studio", "/funktionen/ratenzahlung/"),
    ("Gutschein", "/funktionen/gutschein/"),
    ("iPhone-App", "/funktionen/app/"),
    ("So geht’s", "/so-gehts/"),
    ("Preis", "/preis/"),
    ("Fragen", "/fragen/"),
    ("Ratgeber", "/ratgeber.html"),
    ("Über uns", "/ueber-uns/"),
]


def knopf(ort, klein=False, text="1 Woche testen"):
    cls = "knopf knopf-klein" if klein else "knopf"
    return '<a class="%s" href="/start.html" data-umami-event="start-%s">%s</a>' % (cls, ort, text)


def kopf(aktiv=None):
    def a(t, h, k):
        cur = ' aria-current="page"' if k == aktiv else ""
        return f'<a href="{h}"{cur}>{t}</a>'
    haupt = "".join(a(*m) for m in MENUE)
    liste = "".join(f"<li>{a(*m)}</li>" for m in MENUE)
    return f'''<header class="kopf kopf-web">
    <a class="kopf-marke" href="/" aria-label="Tattoofin Startseite"><img src="/assets/start/wortmarke.png" alt="Tattoofin" width="519" height="116"></a>
    <nav class="haupt" aria-label="Hauptmenü">{haupt}</nav>
    <div class="kopf-rechts">
      <a class="kopf-login" href="/login.html">Login</a>
      {knopf("kopf", klein=True)}
      <details class="menue"><summary aria-expanded="false">Menü</summary>
        <nav class="menue-tafel" aria-label="Menü">
          <ul>{liste}</ul>
          {knopf("menue")}
          <p class="menue-leise"><a href="/login.html">Studio-Login</a><a href="{html.escape(wa_link())}" data-umami-event="whatsapp-menue">WhatsApp {WA_NR}</a><span>Wir antworten [[kontakt.antwortzeit]].</span></p>
        </nav>
      </details>
    </div>
  </header>'''


def fuss(zusatz=""):
    seiten = "".join(f'<li><a href="{h}">{t}</a></li>' for t, h in FUSS_SEITEN)
    fi = F["firma"]
    return f'''<footer class="fuss fuss-web">
    <div class="fuss-innen">
      <img class="fuss-marke" src="/assets/start/wortmarke.png" alt="Tattoofin" width="519" height="116" loading="lazy" decoding="async">
      <div class="fuss-spalten">
        <nav aria-label="Seitenübersicht"><h2>Tattoofin</h2><ul class="fuss-seiten">{seiten}</ul></nav>
        <div><h2>Kontakt</h2><ul>
          <li><a href="{html.escape(wa_link())}" data-umami-event="whatsapp-fuss">WhatsApp {WA_NR}</a></li>
          <li>Wir antworten [[kontakt.antwortzeit]].</li>
          <li><a href="mailto:{fakt("kontakt.mail")}" data-umami-event="mail-fuss">{fakt("kontakt.mail")}</a></li>
          <li><a href="/login.html">Studio-Login</a></li>
          <li><a href="/raten">Für Tattoo-Kunden</a></li>
          <li><a href="{fi["instagram"]}" rel="me noopener">Instagram</a></li>
        </ul></div>
        <nav aria-label="Rechtliches"><h2>Recht</h2><ul>
          <li><a href="/impressum.html">Impressum</a></li>
          <li><a href="/datenschutz.html">Datenschutz</a></li>
          <li><a href="/vertrag.html">Vertrag</a></li>
          <li><a href="/avv.html">Auftragsverarbeitung</a></li>
          <li><a href="#" data-cookies>Cookie-Einstellungen</a></li>
        </ul></nav>
      </div>
      <p class="fuss-firma">{fi["name"]}, {fi["strasse"]}, {fi["plz"]} {fi["ort"]}. {fi["hinweis"]}</p>{zusatz}
    </div>
  </footer>'''


SCHRIFTEN = """<link rel="preload" href="/assets/start/fonts/LuckiestGuy.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/start/fonts/DMSans.woff2" as="font" type="font/woff2" crossorigin>"""

# Reihenfolge: Werte → Marke/Startseite → Rahmen (Kopf/Fuß) → Unterseiten-Bausteine
CSS_SEITE = f"""<link rel="stylesheet" href="/assets/site/werte.css?v={CSS_V}">
<link rel="stylesheet" href="/assets/start/style.css?v={CSS_V}">
<link rel="stylesheet" href="/assets/site/rahmen.css?v={CSS_V}">"""
CSS_UNTERSEITE = CSS_SEITE + f'\n<link rel="stylesheet" href="/assets/site/seiten.css?v={CSS_V}">'
# Ratgeber/Recht behalten ihr site.css, bekommen Werte + Rahmen dazu
CSS_ALT = f"""<link rel="stylesheet" href="/assets/site/werte.css?v={CSS_V}">
<link rel="stylesheet" href="/assets/site/rahmen.css?v={CSS_V}">"""

UMAMI = '<script defer src="https://cloud.umami.is/script.js" data-website-id="507b740f-264e-4ba1-a7d0-9dbe49db75af" data-domains="tattoofin.de"></script>'
TRACK = '<script src="/js/tf-track.js?v=20261118a"></script>'
MENUE_JS = f'<script src="/assets/site/menue.js?v={CSS_V}" defer></script>'


def kopfdaten(titel, beschreibung, pfad, ld=None, robots=None, og_bild="/assets/og.jpg"):
    r = f'\n<meta name="robots" content="{robots}">' if robots else ""
    ld_html = '\n<script type="application/ld+json">%s</script>' % json.dumps(ld, ensure_ascii=False) if ld else ""
    t, b = html.escape(titel), html.escape(beschreibung)
    return f'''<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{t}</title>
<meta name="description" content="{b}">{r}
<meta name="theme-color" content="#f5ead2">
<link rel="canonical" href="{LIVE}{pfad}">
<meta property="og:type" content="website"><meta property="og:locale" content="de_DE"><meta property="og:site_name" content="Tattoofin">
<meta property="og:title" content="{t}"><meta property="og:description" content="{b}">
<meta property="og:url" content="{LIVE}{pfad}"><meta property="og:image" content="{LIVE}{og_bild}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<link rel="icon" href="/favicon.png" type="image/png"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
{SCHRIFTEN}
{CSS_UNTERSEITE}{ld_html}
</head>'''


def org_ld():
    fi, ko = F["firma"], F["kontakt"]
    return {"@type": "Organization", "@id": LIVE + "/#org", "name": fi["marke"], "legalName": fi["name"], "url": LIVE + "/",
            "logo": LIVE + "/assets/logo.png", "email": ko["mail"], "telephone": ko["telefonIntl"],
            "address": {"@type": "PostalAddress", "streetAddress": fi["strasse"], "postalCode": fi["plz"], "addressLocality": fi["ort"], "addressCountry": "DE"},
            "sameAs": [fi["instagram"]]}


def brotkrumen(pfade):
    """pfade: [(Name, /pfad/), …] ohne Startseite."""
    items = [{"@type": "ListItem", "position": 1, "name": "Startseite", "item": LIVE + "/"}]
    for i, (n, p) in enumerate(pfade, 2):
        items.append({"@type": "ListItem", "position": i, "name": n, "item": LIVE + p})
    return {"@type": "BreadcrumbList", "itemListElement": items}
