#!/usr/bin/env python3
"""Baut public/studios-raten.html: Anzeigenseite „Raten* + 7 Tage kostenlos“ (Schilling-Konzept, 18.11.2026).

Aufruf (im Ordner tattoofin/website):  python3 -I _schilling/studios-raten/bauen.py
Bausteine wie Geldweg, echter Fall, Preis und Fragen werden aus public/studios.html übernommen,
damit Zahlen und Wortlaute mit der Live-Seite übereinstimmen (eine Quelle, kein Abschreiben).
Drei Hero-Entwürfe: ?entwurf=a (Standard, „Stempel“), ?entwurf=b („Echte Zahlseite“), ?entwurf=c („Testwoche“).
"""
import pathlib, re

HIER = pathlib.Path(__file__).resolve().parent
WEB = HIER.parent.parent
PUB = WEB / "public"
LIVE = (PUB / "studios.html").read_text(encoding="utf-8")


def block(muster):
    m = re.search(muster, LIVE, re.S)
    if not m:
        raise SystemExit("Baustein nicht gefunden: " + muster)
    return m.group(0)


def svg_nach(anker):
    i = LIVE.index(anker)
    a = LIVE.index("<svg", i)
    return LIVE[a:LIVE.index("</svg>", a) + 6]


HERZ = svg_nach('class="flash fl-1"')            # Flash-Herz mit Banderole „Klarna“ (Live-Motiv)
STERN = svg_nach('<span class="zu" aria-hidden="true">')  # Stern-Knopf der Fragen
FALL = block(r'<div class="fall" id="fall">.*?</div>\s*</div>')
FALL = re.sub(r'<h3 id="fall-titel">(.*?)</h3>', r'<h2 id="fall-titel">\1</h2>', FALL, flags=re.S)
FALL = re.sub(r'\s*<span class="stempel-schild">Echter Fall</span>', '', FALL)  # Vorlagen-Chip weg, der Bon trägt allein
FALL = re.sub(r'(<h2 id="fall-titel">.*?</h2>).*?(\s*</div>\s*</div>)$',
              r'\1\n        <p>7.&nbsp;November, ein Studio: Link geschickt, Kunde zahlt per Klarna, der Betrag kommt aufs eigene <span class="nw">Stripe-Konto</span>.</p>'
              r'\n        <p class="klein">Studio anonym · Klarna-Zahlart unbekannt.</p>\2', FALL, flags=re.S)
assert 'Klarna-Zahlart unbekannt' in FALL and 'stempel-schild' not in FALL
def fakten(t):
    t = t.replace('die allererste Auszahlung nach 7&nbsp;Tagen', 'die allererste laut Stripe in der Regel innerhalb von 7 bis 14&nbsp;Tagen').replace('die allererste Auszahlung nach 7 Tagen', 'die allererste laut Stripe in der Regel innerhalb von 7 bis 14 Tagen')
    t = t.replace('bekommst den ganzen Betrag auf&nbsp;einmal', 'bekommst den Betrag in einer&nbsp;Summe')
    t = t.replace('Dann trägt laut Stripe Klarna das Risiko, nicht&nbsp;du.', 'Dann trägt laut Stripe Klarna das Risiko, nicht&nbsp;du. Reklamiert er das Tattoo, kann ein Streitfall entstehen (siehe Fragen).')
    t = t.replace('Achtung! Kreditaufnahme kostet Geld.</p>', '<b>Achtung! Kreditaufnahme kostet Geld.</b></p>')
    return t

FUSS = block(r'<footer class="fuss">.*?</footer>')

# Fragen: nur die, die zum Raten-Winkel und zur Testwoche gehören (Wortlaut wie live)
FRAGEN_WAHL = ["Bekommt jeder Kunde Raten*?", "Ich hab schon SumUp &amp; Co.", "Und wenn der Kunde nicht zahlt?", "Ist Tattoofin der Kreditgeber?",
               "Was kostet es genau?", "Wie kündige ich? Und wenn Stripe mich ablehnt?", "Wann kommt das Geld, und was brauche ich?",
               "Technik ist nicht meins."]
FRAGEN = []
for frage in FRAGEN_WAHL:
    m = re.search(r'<details class="frage"><summary><span>' + re.escape(frage) + r'</span>.*?</details>', LIVE, re.S)
    if not m:
        raise SystemExit("Frage fehlt live: " + frage)
    f = fakten(m.group(0))
    if frage == "Bekommt jeder Kunde Raten*?":
        # Zugeklappt stünde „Raten*“ ohne Pflichtsatz im Blick; die Antwort handelt von Klarnas Prüfung, also ohne Sternchen
        f = f.replace("Bekommt jeder Kunde Raten*?", "Bekommt jeder Kunde Klarna?")
        f, n = re.subn(r'\s*<p class="raten-fn">.*?</p>', '', f, count=1, flags=re.S)
        assert n == 1 and "*" not in re.sub(r"<svg.*?</svg>", "", f, flags=re.S), f
    FRAGEN.append(f)

WA = ("https://wa.me/491624502375?text=Hi%20Tattoofin-Team%2C%20ich%20habe%20eure%20Anzeige%20zur%20Ratenzahlung%20gesehen%2C"
      "%20habe%20ein%20Tattoo-Studio%20und%20eine%20Frage%3A")
WA_ICON = ('<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.8a9.2 9.2 0 0 0-7.9 13.9L2.9 21.2l4.6-1.2A9.2 9.2 0 1 0 12 2.8Z" '
           'fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8.8 7.6c-.5 0-1 .6-1 1.7 0 2.9 3.7 6.9 7 6.9 1.1 0 1.7-.7 '
           '1.7-1.2 0-.4-.1-.7-.4-.9l-1.6-.8c-.3-.1-.5 0-.7.2l-.5.6c-.2.2-.4.2-.7.1-1-.4-2.1-1.5-2.5-2.5-.1-.3-.1-.5.1-.7l.5-.5c.2-.2.3-.4.2-.7l-.7-1.6c-.2-.4-.5-.5-.9-.5Z" '
           'fill="currentColor"/></svg>')
START = "/start.html?utm_source=studios-raten&amp;utm_medium=seite&amp;utm_content="
KNOPF = "7 Tage kostenlos testen"
ZEILE = "Heute 0&nbsp;€, 4&nbsp;Angaben. Danach 49,90&nbsp;€ im Monat, monatlich&nbsp;kündbar."
FN = '<p class="raten-fn" data-zaehlt-nicht>*Raten über Klarna, nach deren Bonitätsprüfung. <b>Achtung! Kreditaufnahme kostet Geld.</b></p>'
B, G, H = "#1f3d5c", "#fbb316", "#fff7e3"

_i = LIVE.index('<div class="preis-schild">')
SCHILD = LIVE[_i:LIVE.index('<div class="beleg">', _i)].rstrip()  # Preisschild 49,90 € wie live
assert '49,90' in SCHILD and '41,93' in SCHILD
# Beispiel 2.000 € (wie Lena, Sleeve, in der App-Demo). Stripe-Preise DE (stripe.com/de/pricing, bestätigt 18.11.2026):
# Klarna ab 2,99 % + 0,35 € = 60,15 € → „ab ca. 60 €“, bei dir 1.939,85 € → „bis ca. 1.940 €“; Karte ab 1,5 % + 0,25 € = 30,25 € → „ab ca. 30 €“.
_k = round(2000 * 0.0299 + 0.35, 2); _c = round(2000 * 0.015 + 0.25, 2)
assert (round(_k), round(2000 - _k), round(_c)) == (60, 1940, 30), (_k, _c)
PREIS = f"""<section class="preis" id="preis" aria-labelledby="preis-titel">
    <div class="preis-innen">
      <h2 id="preis-titel">Keine Provision. Nur die Stripe-Gebühr.</h2>
      {SCHILD}
      <div class="beleg">
        <table>
          <caption>Beispiel: Sleeve für 2.000<span class="eur">€</span> per Klarna</caption>
          <tbody>
            <tr><th scope="row">Stripe-Gebühr Klarna</th><td>ab ca. 60&nbsp;€</td></tr>
            <tr><th scope="row">Provision</th><td>0&nbsp;€</td></tr>
            <tr class="summe"><th scope="row">Bei dir</th><td>bis ca. 1.940&nbsp;€</td></tr>
          </tbody>
          <tbody class="bon-dazu">
            <tr><th scope="row">Einrichtung</th><td>0&nbsp;€</td></tr>
            <tr><th scope="row" colspan="2">Monatlich kündbar</th></tr>
            <tr><th scope="row" colspan="2">Unser Team richtet’s mit dir ein</th></tr>
          </tbody>
        </table>
        <p class="beleg-hinweis">Mit Karte ab ca. 30&nbsp;€ Stripe-Gebühr. Keine Garantie.</p>
      </div>
      <div class="preis-rest">
        <a class="knopf" href="{START}preis" data-umami-event="start-preis">{KNOPF}</a>
        <p class="preiszeile">{ZEILE}</p>
        <a class="wa" href="/vertrag.html">Vertrag vorab lesen</a>
      </div>
    </div>
  </section>"""


ROT = "#c4421b"  # Stempelfarbe: kräftiges Rot-Orange aus der Flamme der Live-Motive, abgedunkelt für Kontrast auf Creme (≥ 4,5:1)


def linie(d, w=6, farbe=B):
    return f'<path class="l" pathLength="1" fill="none" stroke="{farbe}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round" d="{d}"/>'


def flaeche(d, farbe):
    return f'<path class="f" fill="{farbe}" d="{d}"/>'


def form(d, farbe, w=6):
    return flaeche(d, farbe) + linie(d, w)


def text(x, y, t, groesse, farbe=B, anker="middle", drehen=0, schrift="anzeige"):
    fam = "var(--anzeige)" if schrift == "anzeige" else "var(--text)"
    gewicht = "400" if schrift == "anzeige" else "800"
    tr = f' transform="rotate({drehen} {x} {y})"' if drehen else ""
    return (f'<text class="t" x="{x}" y="{y}" text-anchor="{anker}" fill="{farbe}"{tr} '
            f'style="font-family:{fam};font-weight:{gewicht};font-size:{groesse}px">{t}</text>')


# ---------- Szene A „Stempel“: links reißt die Rechnung des Kunden in Raten-Streifen, rechts knallt beim Studio ein Stempel ----------
def szene_a(hoch=False):
    """hoch=True: Hochformat für hohe Handys (Rechnung oben links, Studio-Karte unten rechts)."""
    teile = []
    # Bon des Kunden
    bon = "M44 52 L250 40 L262 300 L56 312 Z"
    teile.append(form(bon, H, 6))
    teile.append(text(152, 92, "DEIN KUNDE", 26, drehen=-3))
    for i, y in enumerate([128, 156, 184]):
        teile.append(linie(f"M{78 + i * 2} {y - i * 1} L{226 - i * 14} {y - 8 - i * 1}", 5))
    teile.append(text(150, 232, "zahlt in Raten*", 21, schrift="text", drehen=-3))
    teile.append(linie("M62 268 L72 262 L82 268 L92 262 L102 268 L112 262 L122 267 L132 261 L142 266 L152 260 L162 265 L172 259 L182 264 L192 258 L202 263 L212 257 L222 262 L232 256 L242 261 L258 256", 3, B))  # gezackte Abrisskante
    for k in range(3):  # Abriss-Streifen, ohne Beträge und ohne Zählbezug; der letzte ist schon abgerissen und fällt
        x = 76 + k * 58
        y = 278 - k * 2.5
        d = f"M{x} {y} L{x + 8} {y - 5} L{x + 16} {y} L{x + 24} {y - 5} L{x + 32} {y} L{x + 40} {y - 4} L{x + 44} {y + 76} L{x + 4} {y + 78} Z"
        lage = {1: ' transform="rotate(4 %d %d)"' % (x + 20, y), 2: ' transform="translate(26 60) rotate(24 %d %d)"' % (x + 20, y)}.get(k, "")
        teile.append(f'<g{lage}><g class="abriss abriss-{k}">' + form(d, G, 5) + text(x + 23, y + 46, "RATE*", 14, drehen=-88) + "</g></g>")
    pfeil = "M282 176 C318 150 350 150 380 168 L374 146 L420 178 L372 206 L378 186 C350 172 320 174 292 196 Z"
    dx, dy = (-70, 290) if hoch else (0, 0)
    if hoch:
        teile.append(f'<g transform="translate(-34 136) rotate(48 350 176)">' + form(pfeil, G, 6) + "</g>")
    else:
        teile.append(form(pfeil, G, 6))
    karte = ["M418 62 L634 74 L624 354 L408 344 Z"]
    g = [form(karte[0], H, 6), text(521, 114, "DEIN STUDIO", 26, drehen=3),
         text(519, 148, "bekommt den Betrag", 16, schrift="text", drehen=3), text(518, 170, "auf einmal", 16, schrift="text", drehen=3),
         '<g transform="rotate(-11 517 262)"><g class="stempel">' + linie("M404 206 L630 218 L622 318 L396 306 Z", 10, ROT)
         + linie("M418 220 L616 230 L610 304 L410 294 Z", 3, ROT) + text(513, 284, "BEZAHLT", 46, farbe=ROT, drehen=3) + "</g></g>",
         form("M626 22 L633 40 L652 41 L637 53 L642 72 L626 61 L610 72 L615 53 L600 41 L619 40 Z", G, 4)]
    teile.append(f'<g transform="translate({dx} {dy})">' + "".join(g) + "</g>")
    # Tattoofin-Figur trägt die Handlung: breit unter dem Pfeil zwischen Bon und Studio-Karte, hoch rechts neben dem Bon
    fx, fy, fb = (332, 58, 128) if hoch else (276, 234, 100)
    teile.append(f'<image class="szene-figur" href="/assets/start/figur.webp" x="{fx}" y="{fy}" width="{fb}" height="{round(fb * 310 / 300)}" preserveAspectRatio="xMidYMid meet"/>')
    box = "20 10 600 650" if hoch else "20 10 640 380"
    klasse = "szene-hoch" if hoch else "szene-breit"
    return (f'<svg class="motiv stech szene-svg {klasse}" viewBox="{box}" role="img" '
            f'aria-label="Flash-Motiv: Die Rechnung des Kunden mit Abriss-Streifen „Rate“, ein Pfeil zur Karte des Studios mit dem Stempel „Bezahlt“, dazwischen die Tattoofin-Figur mit Daumen hoch.">'
            + "".join(teile) + "</svg>")


# ---------- Szene C „Testwoche“: sieben Flash-Kacheln, eine je Tag, darüber die Banderole ----------
def szene_c():
    teile = []
    tage = ["MO", "DI", "MI", "DO", "FR", "SA", "SO"]
    for i, tag in enumerate(tage):
        reihe, spalte = (0, i) if i < 4 else (1, i - 4)
        x = 70 + spalte * 128 + (64 if reihe else 0)
        y = 120 + reihe * 128
        dreh = [-4, 3, -2, 4, -3, 2, -5][i]
        d = f"M{x} {y} L{x + 104} {y + 4} L{x + 100} {y + 108} L{x - 4} {y + 104} Z"
        teile.append(f'<g transform="rotate({dreh} {x + 50} {y + 54})">' + form(d, H if i < 6 else G, 6)
                     + text(x + 50, y + 44, tag, 30) + form(
            f"M{x + 50} {y + 56} L{x + 56} {y + 70} L{x + 72} {y + 71} L{x + 60} {y + 81} L{x + 64} {y + 96} L{x + 50} {y + 88} L{x + 36} {y + 96} L{x + 40} {y + 81} L{x + 28} {y + 71} L{x + 44} {y + 70} Z",
            G if i < 6 else B, 3) + "</g>")
    band = "M60 40 L600 30 L586 62 L604 96 L64 104 L76 72 Z"
    teile.append(form(band, B, 6))
    teile.append(text(332, 80, "7 TAGE KOSTENLOS", 36, farbe=G, drehen=-1))
    return (f'<svg class="motiv stech szene-svg" viewBox="30 10 620 400" role="img" '
            f'aria-label="Flash-Motiv: Banderole „7 Tage kostenlos“ über sieben Kacheln von Montag bis Sonntag." >'
            + "".join(teile) + "</svg>")


PUNKTE = "".join(f'<button type="button" data-zeigen-punkt="{i}" aria-label="Bild {i + 1} von 5 zeigen"' + (' aria-current="true"' if i == 0 else '') + '><i></i></button>' for i in range(5))
ZEIGEN = f"""<section class="zeigen" id="zeigen" aria-labelledby="zeigen-titel">
    <h2 id="zeigen-titel">So läuft eine&nbsp;Zahlung.</h2>
    <p class="abschnitt-satz">Echte Bildschirme aus der Tattoofin-App und der Zahlseite, mit Beispieldaten.</p>
    <ol class="zeigen-reihe" tabindex="0" aria-label="Fünf Schritte einer Zahlung, zum Wischen">
      <li class="zeigen-bild">
        <span class="handy-rahmen"><img src="/assets/start/kampagne/app-lena-offen.webp" width="600" height="1144" loading="lazy" decoding="async" alt="Echter Bildschirm der Tattoofin-App: Zahlung über 2.000,00 Euro, Sleeve linker Arm, offen, Kunde Lena Beispiel, Knöpfe QR-Code zeigen, Teilen, Stornieren. Beispieldaten."></span>
        <p><b>1. Du legst die Zahlung an.</b> Betrag und Motiv in der App, dann teilen.</p>
      </li>
      <li class="zeigen-bild">
        <span class="handy-rahmen"><img src="/assets/start/zahlungslink-whatsapp.webp" width="592" height="460" loading="lazy" decoding="async" alt="Echter Tattoofin-Bildschirm: Zahlungslink für Lena über 2.000,00 Euro, Knöpfe Per WhatsApp senden und Link kopieren. Beispieldaten."></span>
        <p><b>2. Der Link geht per WhatsApp raus.</b> Kein Kartengerät, keine Kontonummer.</p>
      </li>
      <li class="zeigen-bild zeigen-zahlseite">
        <span class="handy-rahmen"><img src="/assets/start/handy-kunde.webp?v=20261116d" width="600" height="1300" loading="lazy" decoding="async" alt="Echte Tattoofin-Zahlseite am Handy: Hi Lena, deine Zahlung an Ink Studio Bamberg, Schritt 1 von 2, 2.000,00 Euro, Sleeve linker Arm. Darunter: Im nächsten Schritt siehst du die Zahlarten, zum Beispiel Karte, Apple Pay oder Klarna. Raten über Klarna, nach deren Bonitätsprüfung. Vertragspartner der Raten ist Klarna, nicht Tattoofin. Achtung! Kreditaufnahme kostet Geld. Beispieldaten."></span>
        <p><b>3. Dein Kunde zahlt am Handy.</b> Karte, Apple&nbsp;Pay, Google&nbsp;Pay oder Klarna, auf einer Seite mit deinem Studionamen.</p>
      </li>
      <li class="zeigen-bild">
        <span class="handy-rahmen"><img src="/assets/start/kampagne/app-mitteilung.webp" width="600" height="547" loading="lazy" decoding="async" alt="Echte Mitteilung der Tattoofin-App auf dem iPhone: Zahlung eingegangen, 480,00 Euro, Unterarm Blackwork. Beispieldaten."></span>
        <p><b>4. Du bekommst eine Mitteilung.</b> Sobald bezahlt ist, aufs iPhone.</p>
      </li>
      <li class="zeigen-bild">
        <span class="handy-rahmen"><img src="/assets/start/kampagne/app-zahlungen.webp" width="600" height="1144" loading="lazy" decoding="async" alt="Echter Bildschirm der Tattoofin-App: Zahlungen mit Umsatz diesen Monat, Anzahl der Zahlungen und offenen Links, darunter eine Liste mit offen und bezahlt. Beispieldaten."></span>
        <p><b>5. Du siehst alles auf einen Blick.</b> Offen, bezahlt und dein Umsatz im Monat.</p>
      </li>
    </ol>
    <div class="zeigen-stand" data-zeigen-stand hidden>
      <span class="zeigen-zahl" aria-hidden="true">1/5</span>
      <span class="zeigen-punkte">{PUNKTE}</span>
    </div>
  </section>"""


HELD = {
    "a": {"h1": "Raten* für deine Kunden. Dein Geld auf&nbsp;einmal.",
          "s": "Für Tattoo-Studios: Link schicken, Kunde zahlt per&nbsp;Klarna.",
          "szene": szene_a() + szene_a(hoch=True)},
    "b": {"h1": "Großes Motiv? Dein Kunde zahlt in&nbsp;Raten*.",
          "s": "Für Tattoo-Studios: Link schicken, Klarna prüft, dein Geld kommt auf&nbsp;einmal.",
          "szene": ('<div class="szene-b">' + HERZ.replace('class="motiv stech"', 'class="motiv stech b-herz"', 1)
                    + '<figure class="b-handy"><span class="klebe" aria-hidden="true"></span><span class="handy-rahmen">'
                    '<img src="/assets/start/handy-kunde.webp?v=20261116d" width="600" height="1300" decoding="async" '
                    'alt="Echte Tattoofin-Zahlseite am Handy, Ausschnitt: Im nächsten Schritt siehst du die Zahlarten, zum Beispiel Karte, Apple Pay oder Klarna. '
                    'Darunter der Hinweis: Raten über Klarna, nach deren Bonitätsprüfung. Vertragspartner der Raten ist Klarna, nicht Tattoofin. Achtung! Kreditaufnahme kostet Geld.">'
                    '</span><figcaption>Echte Zahlseite · Ausschnitt</figcaption></figure></div>')},
    "c": {"h1": "7 Tage Raten* anbieten. Kostenlos.",
          "s": "Für Tattoo-Studios: Link schicken, Kunde zahlt per Klarna, dein Geld kommt auf&nbsp;einmal.",
          "szene": szene_c()},
}


def held(k, v):
    return f'''    <div class="held-satz held-{k}">
      <h1 data-hero-pflicht="immer">{v["h1"]}</h1>
      <p class="unterzeile" data-hero-pflicht>{v["s"]}</p>
      {FN}
    </div>
    <div class="held-buehne buehne held-{k}" data-stechen>
      {v["szene"]}
      {"" if k == "a" else '<img class="held-figur" src="/assets/start/figur.webp" alt="" width="300" height="310" decoding="async">'}
    </div>'''


CSS = """
/* Anzeigenseite Raten* + 7 Tage (Schilling-Konzept 18.11.2026). Erbt Farben, Schriften, Knopf, Bogen, Fall, Geld, Preis, Fragen aus style.css. */
:root{--kopf-h:53px}
.kopf{height:var(--kopf-h);min-height:0;padding-top:0;padding-bottom:0}
/* Erster Bildschirm = genau der sichtbare Bildschirm (svh), alles darin sichtbar */
.held{max-width:1280px;margin-inline:auto;height:calc(100svh - var(--kopf-h));min-height:0;padding:2px var(--rand) calc(12px + var(--banner-h,0px));display:flex;flex-direction:column}
.held h1{font-size:clamp(28px,min(11vw,6.9svh),92px);margin-top:2px;text-wrap:balance}
.held .unterzeile{font-size:clamp(14px,min(4.3vw,2.6svh),22px);margin-top:6px;max-width:30em}
.held .raten-fn{margin-top:5px}
.held .held-buehne{position:relative;flex:1 1 0;height:auto;aspect-ratio:auto;width:auto;max-width:none;min-height:70px;margin:8px 0 6px;cursor:pointer}
.held-buehne .szene-svg{position:absolute;inset:0;width:100%;height:100%}
.held-c .held-figur{left:auto;right:-4px;height:min(40%,160px)}
.held-figur{position:absolute;z-index:3;left:-4px;bottom:-6px;height:min(52%,190px);width:auto;pointer-events:none}
.held-fuss{display:grid;gap:6px;justify-items:start}
.held-fuss .knopf{width:100%;min-height:clamp(48px,7.6svh,58px);font-size:clamp(20px,min(6vw,3.6svh),28px)}
.preiszeile{font-weight:700;font-size:clamp(15px,2.2svh,17px);line-height:1.3}
/* Stempel und Abrisse: einmal nach dem Stechen, antippen spielt es noch einmal */
@media (prefers-reduced-motion:no-preference){
  .szene-svg .stempel{animation:stempel .42s cubic-bezier(.2,1.6,.5,1) 1.45s both}
  .szene-svg .abriss{animation:abriss 1.4s ease-in-out 1.6s both}
  .szene-svg .abriss-1{animation-delay:1.75s}.szene-svg .abriss-2{animation-delay:1.9s}.szene-svg .abriss-3{animation-delay:2.05s}
}
/* Stempel und Abrisse drehen um die eigene Mitte */
.stempel,.abriss{transform-box:fill-box;transform-origin:50% 50%}.abriss{transform-origin:50% 0}
.szene-hoch{display:none}
@media (max-width:599px) and (min-height:720px){.held-a .szene-breit{display:none}.held-a .szene-hoch{display:block}}
@keyframes stempel{0%{transform:scale(1.9) rotate(-14deg);opacity:0}70%{opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
@keyframes abriss{0%,100%{transform:rotate(0)}35%{transform:rotate(5deg)}70%{transform:rotate(-3deg)}}
/* Entwurf B: Herz oben links, echter Zahlseiten-Ausschnitt rechts */
.szene-b{position:absolute;inset:0}
.b-herz{position:absolute;left:0;top:0;width:auto;height:52%;max-width:40%;z-index:1}
.b-handy{position:absolute;right:1%;top:5%;height:90%;max-width:58%;aspect-ratio:600/700;transform:rotate(-3deg);z-index:2}
.b-handy .handy-rahmen{height:calc(100% - 22px)}
.b-handy .handy-rahmen img{height:100%;aspect-ratio:auto;object-fit:cover;object-position:50% 79%}
.held-b .held-figur{height:min(34%,150px);left:-6px}
.b-handy figcaption{position:relative;z-index:4;text-align:center;font-size:12px;font-weight:700;margin-top:6px;transform:rotate(3deg)}
.zeigen{max-width:1280px;margin-inline:auto;padding:30px 0 34px}
.zeigen>h2,.zeigen>.abschnitt-satz{padding-inline:var(--rand)}
/* Handy: ein Bildschirm je Wisch (ganze Bildunterschrift, nichts angeschnitten), darunter 1/5 und Punkte; ohne Selbstlauf */
.zeigen-reihe{list-style:none;display:flex;gap:calc(var(--rand) * 2);overflow-x:auto;scroll-snap-type:x mandatory;scroll-padding-inline:var(--rand);padding:26px var(--rand) 12px;margin:0;scrollbar-width:none;align-items:flex-start}
.zeigen-reihe::-webkit-scrollbar{display:none}
.zeigen-reihe:focus-visible{outline-offset:-3px}
.zeigen-bild{flex:0 0 100%;display:grid;justify-items:center;scroll-snap-align:start}
.zeigen-bild>*{width:min(68vw,270px)}
.zeigen-bild .handy-rahmen{padding-bottom:6px;transform:rotate(-1.2deg)}
.zeigen-bild:nth-child(even) .handy-rahmen{transform:rotate(1.2deg)}
.zeigen-bild .handy-rahmen img{aspect-ratio:auto;width:100%;height:auto;object-fit:initial}
.zeigen-zahlseite .handy-rahmen img{aspect-ratio:600/1160;object-fit:cover;object-position:top}
.zeigen-bild p{margin-top:14px;font-size:15px;line-height:1.4}
.zeigen-bild b{font-weight:800}
.zeigen-stand{display:flex;align-items:center;justify-content:center;gap:6px;padding:0 var(--rand)}
.zeigen-stand[hidden]{display:none}
.zeigen-zahl{font-weight:800;font-size:15px;min-width:3ch;text-align:right}
.zeigen-punkte{display:flex}
.zeigen-punkte button{width:44px;height:44px;border:0;padding:0;background:none;display:grid;place-items:center;cursor:pointer;border-radius:50%}
.zeigen-punkte i{width:12px;height:12px;border-radius:50%;border:2px solid var(--blau);background:transparent}
.zeigen-punkte [aria-current="true"] i{background:var(--blau);transform:scale(1.25)}
/* Ab Tablet: alle fünf als Raster, jede Abbildung mindestens 330 px breit, damit die Schrift im Bild lesbar bleibt (ab ca. 11 px) */
@media (min-width:720px){
  .zeigen-reihe{display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));overflow:visible;gap:40px 32px;padding-top:30px}
  .zeigen-bild{justify-items:start}
  .zeigen-bild>*{width:100%;max-width:350px}
  .zeigen-stand,.zeigen-stand[hidden]{display:none}
}
/* Zweiter Bildschirm: stärkster Beleg */
.beleg-oben{padding-top:22px}
/* iOS-26/27-Safari zeigt unter der schwebenden Leiste einen Streifen der nächsten Sektion: dort nur Papier (Lösung wie tattoofin.de, Memory hero-viewport-perfekt) */
.held + .beleg-oben{padding-top:max(22px, calc((100lvh - 100svh) * 2.6 + 6px))}
.testwoche{max-width:1280px;margin-inline:auto;padding:28px var(--rand) 34px}
/* 7 Tage als Abriss-Kalender im Flash-Stil (Gegenstück zu den Raten-Streifen im Hero): ein Streifen, Perforation zwischen den Blättern,
   „Tag 7“ ist schon halb abgerissen */
.streifen{list-style:none;display:grid;margin-top:22px;max-width:1120px;padding:0 6px 14px 0}
.blatt{position:relative;background:var(--hell);border:4px solid var(--blau);box-shadow:4px 5px 0 var(--blau);line-height:1.4}
.blatt-tag{position:relative;display:block;background:var(--blau);color:var(--gelb);font:400 clamp(24px,6.4vw,30px)/1 var(--anzeige);text-transform:uppercase;padding:20px 14px 8px;letter-spacing:.01em}
.blatt-tag::before{content:"";position:absolute;left:50%;top:7px;width:46px;height:8px;margin-left:-23px;
  background:radial-gradient(circle at 4px 4px,var(--papier) 3.4px,transparent 4px) 0 0/19px 8px repeat-x}
.blatt p{padding:12px 14px 14px}
.blatt b{font-weight:800}
.blatt:not(:first-child){border-top:4px dashed var(--blau)}
.blatt:not(.blatt-ab){border-bottom:0}
.blatt:nth-child(2){border-bottom:4px dashed var(--blau)}
.blatt-ab{margin-top:14px;border-top-style:solid;transform:rotate(-1.6deg) translateX(4px);transform-origin:0 0}
@media (min-width:720px){
  .streifen{grid-template-columns:repeat(3,minmax(0,1fr));align-items:stretch}
  .blatt:not(:first-child){border-top:4px solid var(--blau);border-left:4px dashed var(--blau)}
  .blatt:not(.blatt-ab){border-bottom:4px solid var(--blau);border-right:0}
  .blatt:nth-child(2){border-right:4px dashed var(--blau);border-bottom-style:solid}
  .blatt-ab{margin:0 0 0 14px;border-left-style:solid;transform:rotate(3deg) translateY(10px);transform-origin:0 0}
  .blatt-ab::before{content:"";position:absolute;left:-18px;top:-4px;bottom:-4px;width:10px;
    background:linear-gradient(-45deg,var(--blau) 5px,transparent 0) 0 0/10px 12px repeat-y,linear-gradient(-135deg,var(--blau) 5px,transparent 0) 0 0/10px 12px repeat-y}
}
.schluss-raten{max-width:1280px;margin-inline:auto;padding:34px var(--rand) 40px;display:grid;gap:12px;justify-items:start}
.schluss-raten .knopf{margin-top:6px}
.schluss-raten .preiszeile{margin-top:-4px}
@media (max-width:599px){.schluss-raten .knopf{width:100%;text-align:center}}
/* Preis-Bon: Rechnung oben, darunter was dazugehört (ersetzt die Sticker-Liste) */
.beleg .bon-dazu th{font-weight:700;border-top-style:dotted}
.beleg .bon-dazu tr:first-child th,.beleg .bon-dazu tr:first-child td{border-top:3px solid var(--blau)}
.beleg .bon-dazu th[colspan]{padding-left:22px;position:relative}
.beleg .bon-dazu th[colspan]::before{content:"";position:absolute;left:0;top:50%;width:14px;height:14px;margin-top:-7px;background:var(--blau);
  clip-path:polygon(50% 0,62% 36%,100% 38%,69% 60%,80% 96%,50% 75%,20% 96%,31% 60%,0 38%,38% 36%)}
.preis-rest{gap:10px}
.preis-rest .knopf{width:100%;text-align:center}
.preis-rest .preiszeile{color:var(--hell)}
.preis-rest .wa{margin-top:8px}
/* Tablet hochkant */
@media (min-width:600px) and (max-width:899px){
  .held-satz{text-align:center;justify-self:center;margin-inline:auto}
  .held .unterzeile,.held .raten-fn{margin-inline:auto}
  .held-fuss{justify-items:center}
  .held-fuss .knopf{width:auto}
}
/* Desktop und Handy quer: Text links, Bild rechts, beides genau im ersten Bildschirm */
@media (min-width:900px),(orientation:landscape) and (max-height:500px) and (min-width:560px){
  .held{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);grid-template-rows:1fr auto auto 1fr;column-gap:clamp(18px,3vw,48px);padding-top:0;padding-bottom:clamp(12px,3svh,40px)}
  .held-satz{grid-column:1;grid-row:2;align-self:end}
  .held-fuss{grid-column:1;grid-row:3;margin-top:clamp(10px,2.4svh,26px)}
  .held .held-buehne{grid-column:2;grid-row:1/5;margin:clamp(6px,2svh,24px) 0}
  .held-fuss .knopf{width:auto}
  .held h1{font-size:clamp(28px,min(4.4vw,7.6svh),96px);text-wrap:balance}
  .held .unterzeile{font-size:clamp(14px,min(1.7vw,2.7svh),23px)}
  .held .raten-fn{font-size:13px}
  .held-figur{height:min(40%,220px)}
}
/* Desktop: breite Szene (Bon links, Figur in der Mitte, Studio-Karte rechts); die Bühne endet über der Consent-Karte,
   damit Studio-Karte und Stempel nie darunter liegen (Banner unten rechts, tf-track.js bleibt unverändert) */
@media (min-width:900px) and (min-height:501px){
  .held .held-buehne{margin-bottom:calc(clamp(6px,2svh,24px) + var(--banner-h,0px))}
}
@media (orientation:landscape) and (max-height:500px){
  .held{padding-bottom:calc(8px + var(--banner-h,0px));grid-template-columns:minmax(0,6fr) minmax(0,4fr)}
  .held-satz{text-align:left;margin-inline:0}
  .held .unterzeile,.held .raten-fn{margin-inline:0}
  .held .unterzeile{font-size:13px;margin-top:3px}
  .held .raten-fn{font-size:11.5px;margin-top:3px}
  .held h1{font-size:clamp(22px,min(4vw,7.6svh),40px)}
  .held-fuss{justify-items:start;margin-top:6px;gap:3px}
  .held-fuss .knopf{min-height:44px;font-size:18px}
  .preiszeile{font-size:13px}
}
"""

# ---------- Funnel (Schilling-Konzept E21, E22, Kapitel 13; 18.11.2026) ----------
# Jeder Hauptknopf „7 Tage kostenlos testen“ öffnet denselben Funnel auf der Seite: 2 Antipp-Fragen, dann die 4 Angaben,
# die /start braucht (in 2 Schritten, damit Feld und Weiter-Knopf auch mit offener Tastatur in die sichtbare Fläche passen),
# dann Übergabe an /start (Häkchen + Karte bei Stripe). Personendaten nur per sessionStorage „tf-start“ (Format von start.js),
# nie in der Adresse. Antipp-Antworten nur im Arbeitsspeicher, „schilling-funnel“ (ohne Personendaten) liest /start und löscht ihn.
# Ohne JavaScript bzw. ohne <dialog> bleibt der Knopf ein normaler Link auf /start.
FN_CSS = """
/* ---------- Funnel: natives <dialog>, am Touch-Gerät Vollbild, an der Maus zentriert (13 §2, §13) ---------- */
html.fn-offen{overflow:hidden;scroll-behavior:auto}
html.fn-offen body{position:fixed;left:0;right:0;top:var(--sperre-top,0);overflow:hidden}
.fn{position:fixed;inset:0;width:100%;height:100%;max-width:none;max-height:none;margin:0;padding:0;border:0;
    background:var(--papier) url(/assets/start/papier.webp);background-size:640px 640px;color:var(--blau);overscroll-behavior:contain;font:400 16px/1.45 var(--text)}
.fn[open]{display:flex;flex-direction:column}
.fn::backdrop{background:rgba(31,61,92,.62)}
.fn [hidden]{display:none!important}
/* Touch: Fläche hinter der Tastatur ist Papier statt der Seite (iOS zeigt sie durch die Glas-Tastatur) */
@media (pointer:coarse),(hover:none){.fn::backdrop{background:var(--papier)}html.fn-tastatur .fn{bottom:auto;height:var(--vvh);transform:translateY(var(--vvt))}}
@media (hover:hover) and (pointer:fine){.fn{margin:auto;width:min(560px,calc(100% - 32px));height:min(620px,calc(100% - 48px));border:4px solid var(--blau);border-radius:20px;box-shadow:6px 7px 0 var(--blau)}}
.fn-kopf{flex:none;display:grid;grid-template-columns:48px 1fr 48px;align-items:center;padding:max(4px,env(safe-area-inset-top)) 6px 0;background:var(--hell);border-bottom:3px solid var(--blau)}
.fn-kopf button{grid-row:1;width:48px;height:44px;border:0;padding:0;background:none;color:var(--blau);border-radius:12px;cursor:pointer;display:grid;place-items:center}
.fn-kopf svg{width:26px;height:26px}
.fn-kopf [data-funnel-zurueck]{grid-column:1}.fn-kopf [data-funnel-zu]{grid-column:3}
.fn-mitte{grid-column:2;grid-row:1;min-width:0;text-align:center;line-height:1.2}
.fn-stand{font-weight:800;font-size:15px;margin:0}
.fn-kopf-titel{margin:1px 0 0;font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.fn-balken{grid-column:1/-1;grid-row:2;height:9px;margin:2px 6px 9px;background:var(--papier);border:2px solid var(--blau);border-radius:99px;overflow:hidden}
.fn-balken i{display:block;height:100%;background:var(--gelb);transform-origin:left;transform:scaleX(0)}
@media (prefers-reduced-motion:no-preference){.fn-balken i{transition:transform .25s ease-out}}
.fn-inhalt{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;padding:12px 16px calc(24px + env(safe-area-inset-bottom));scroll-padding-block:12px}
.fn-spalte{max-width:520px;margin:0 auto}
.fn h2{font-size:clamp(24px,6.6vw,31px);line-height:1.02;margin:0 0 6px;text-shadow:2px 2px 0 var(--gelb)}
.fn h2:focus{outline:none}
.fn-grund{font-size:15px;line-height:1.4;margin:0 0 14px}
.fn-kacheln{display:grid;gap:10px}
.fn-kachel{display:flex;align-items:center;gap:12px;width:100%;min-height:56px;padding:12px 14px;border:3px solid var(--blau);border-radius:14px;background:var(--hell);
  color:var(--blau);box-shadow:3px 4px 0 var(--blau);font:700 17px/1.25 var(--text);text-align:left;cursor:pointer;touch-action:manipulation}
.fn-kachel::before{content:"";flex:none;width:22px;height:22px;border:3px solid var(--blau);border-radius:50%;background:#fff}
.fn-kachel[aria-pressed="true"]{background:var(--gelb)}
.fn-kachel[aria-pressed="true"]::before{background:var(--blau);box-shadow:inset 0 0 0 4px #fff}
.fn-kachel:active{transform:translate(2px,2px);box-shadow:1px 2px 0 var(--blau)}
.fn-merk{margin:0 0 12px;padding:10px 12px;background:var(--hell);border:3px dashed var(--blau);border-radius:12px;font-weight:700;font-size:15px;line-height:1.35}
.fn-merk .raten-fn{margin-top:4px}
.fn-feld{margin-bottom:10px}
.fn-lab{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:0 10px;margin:0 0 3px}
.fn label{font-weight:800;font-size:16px;line-height:1.25}
.fn-tipp{font-size:13px;line-height:1.3}
.fn input{display:block;width:100%;min-height:50px;padding:0 14px;border:3px solid var(--blau);border-radius:12px;background:#fff;color:var(--blau);
  font:500 max(17px,1rem)/1.2 var(--text);scroll-margin-block:12px}
.fn input:focus-visible{outline:3px solid var(--blau);outline-offset:2px;box-shadow:0 0 0 6px var(--gelb)}
.fn input[aria-invalid="true"]{border-color:#a3241b;background:#fff7f5}
.fn-fehler{color:#a3241b;font-weight:700;font-size:14px;line-height:1.3;margin:4px 0 0}
.fn-pflicht{font-size:14px;line-height:1.35;margin:2px 0 8px}
.fn-pflicht a{font-weight:700}
.fn .knopf.fn-aktion{width:100%;min-height:54px;margin-top:4px;font-size:clamp(20px,5.6vw,24px);white-space:normal;text-align:center}
.fn .knopf.fn-aktion:disabled{opacity:.7;cursor:wait}
.fn-danach{font-size:14px;font-weight:700;line-height:1.35;margin:0 0 10px}
.fn-bedingung{font-size:14px;line-height:1.4;margin:10px 0 0}
/* Offene Tastatur am Touch-Gerät: Merkzettel einklappen, damit Feld und Weiter-Knopf Platz haben (E22) */
@media (pointer:coarse),(hover:none){html.fn-tastatur .fn-merk{display:none}}
.fn-fuss{margin:18px 0 0;font-size:14px;font-weight:700;line-height:1.4}
"""

PFEIL = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
KREUZ = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>'


def kacheln(feld, titel_id, antworten):
    return (f'<div class="fn-kacheln" role="group" aria-labelledby="{titel_id}">' + "".join(
        f'<button type="button" class="fn-kachel" data-funnel-antwort data-feld="{feld}" data-wert="{w}" aria-pressed="false">{t}</button>'
        for w, t in antworten) + "</div>")


def feld(fid, name, label, typ, ac, extra="", tipp=""):
    db = f"fn-{fid}-f" + (f" fn-{fid}-t" if tipp else "")
    lab = f'<label for="fn-{fid}">{label}</label>' + (f'<span class="fn-tipp" id="fn-{fid}-t">{tipp}</span>' if tipp else "")
    return (f'<div class="fn-feld"><div class="fn-lab">{lab}</div>'
            f'<input id="fn-{fid}" name="{name}" type="{typ}" autocomplete="{ac}" required aria-describedby="{db}" {extra}>'
            f'<p class="fn-fehler" id="fn-{fid}-f" hidden></p></div>')


FN_HTML = f"""<dialog class="fn" data-funnel aria-labelledby="fn-stand">
  <div class="fn-kopf">
    <button type="button" data-funnel-zurueck aria-label="Zurück" hidden>{PFEIL}</button>
    <div class="fn-mitte"><p class="fn-stand" id="fn-stand" aria-live="polite">Schritt 1 von 5</p><p class="fn-kopf-titel" data-funnel-kopf-titel aria-hidden="true"></p></div>
    <button type="button" data-funnel-zu aria-label="Schließen">{KREUZ}</button>
    <div class="fn-balken" aria-hidden="true"><i></i></div>
  </div>
  <form class="fn-inhalt" novalidate autocomplete="on">
    <div class="fn-spalte">
      <section data-funnel-schritt="1" aria-labelledby="fn-t1">
        <h2 id="fn-t1" tabindex="-1">Fragen deine Kunden nach&nbsp;Raten?</h2>
        <p class="fn-grund">Zwei kurze Fragen, dann trägst du dein Studio ein.</p>
        {kacheln("raten", "fn-t1", [("oft", "Ja, bei großen Motiven"), ("manchmal", "Ab und zu"), ("selten", "Eher selten"), ("offen", "Weiß ich nicht")])}
        <p class="fn-fuss">7 Tage kostenlos · danach 49,90&nbsp;€ im Monat inkl. MwSt. · monatlich kündbar</p>
      </section>
      <section data-funnel-schritt="2" aria-labelledby="fn-t2" hidden>
        <h2 id="fn-t2" tabindex="-1">Wie zahlen deine Kunden heute&nbsp;meistens?</h2>
        <p class="fn-grund">Danach siehst du, was sich für dich ändert.</p>
        {kacheln("zahlung", "fn-t2", [("bar", "Bar"), ("karte", "Mit Karte im Studio"), ("ueberweisung", "Per Überweisung"), ("gemischt", "Ganz unterschiedlich")])}
        <p class="fn-fuss">7 Tage kostenlos · danach 49,90&nbsp;€ im Monat inkl. MwSt. · monatlich kündbar</p>
      </section>
      <section data-funnel-schritt="3" aria-labelledby="fn-t3" hidden>
        <h2 id="fn-t3" tabindex="-1">Passt. Jetzt dein&nbsp;Studio.</h2>
        <div class="fn-merk" data-funnel-merk><span data-funnel-merk-text>Du schickst einen Link, dein Kunde zahlt am Handy, auch per Klarna*.</span>
          <p class="raten-fn">*Raten über Klarna, nach deren Bonitätsprüfung. <b>Achtung! Kreditaufnahme kostet Geld.</b></p></div>
        {feld("firma", "firma", "Name deines Studios", "text", "organization", 'autocapitalize="words" autocorrect="off" spellcheck="false" enterkeyhint="next"')}
        {feld("inhaber", "inhaber", "Dein Vor- und Nachname", "text", "name", 'autocapitalize="words" autocorrect="off" spellcheck="false" enterkeyhint="next"')}
        <button type="button" class="knopf fn-aktion" data-funnel-aktion data-funnel-weiter>Weiter</button>
      </section>
      <section data-funnel-schritt="4" aria-labelledby="fn-t4" hidden>
        <h2 id="fn-t4" tabindex="-1">Wohin kommt dein&nbsp;Login?</h2>
        <p class="fn-danach">Schritt 5: Vertrag &amp; Karte bei Stripe, heute 0&nbsp;€.</p>
        {feld("email", "email", "E-Mail", "email", "email", 'inputmode="email" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="next"', "Hierhin kommt dein Login.")}
        {feld("telefon", "telefon", "Handynummer (WhatsApp)", "tel", "tel", 'inputmode="tel" enterkeyhint="go"', "Für die Einrichtung.")}
        <p class="fn-pflicht" data-funnel-pflicht>Deine Angaben nutzen wir für dein Konto und die Einrichtung. <a href="/datenschutz.html" target="_blank" rel="noopener">Datenschutz</a></p>
        <button type="submit" class="knopf fn-aktion" data-funnel-aktion>Weiter zu Schritt 5</button>
        <p class="fn-bedingung">Heute 0&nbsp;€. Nach den 7&nbsp;Tagen 49,90&nbsp;€ im Monat inkl. MwSt., monatlich kündbar. Kündigst du vorher, zahlst du nichts.</p>
      </section>
    </div>
  </form>
</dialog>"""

FN_JS = r"""<script>/* Funnel nach dem Schilling-Konzept, Kapitel 13 (Muster scripts/funnel-muster.html, angepasst an Tattoofin) */
(() => {
  const dlg = document.querySelector('[data-funnel]');
  if (!dlg || typeof dlg.showModal !== 'function') return;          // ohne <dialog>: Knopf bleibt Link auf /start
  const root = document.documentElement, vv = window.visualViewport;
  const form = dlg.querySelector('form'), inhalt = dlg.querySelector('.fn-inhalt');
  const schritte = [...dlg.querySelectorAll('[data-funnel-schritt]')], gesamt = schritte.length;
  const ANZEIGE = gesamt + 1;                                          // Schritt 5 = Vertrag & Karte bei Stripe (/start), zählt ehrlich mit
  const kopfTitel = dlg.querySelector('[data-funnel-kopf-titel]');
  const stand = dlg.querySelector('.fn-stand'), balken = dlg.querySelector('.fn-balken i'), zurueck = dlg.querySelector('[data-funnel-zurueck]');
  const ruhig = matchMedia('(prefers-reduced-motion: reduce)');
  const antworten = {};                                               // nur im Arbeitsspeicher (13 §11)
  const herkunft = Object.fromEntries([...new URLSearchParams(location.search)].filter(([k]) => /^(utm_[a-z]+|ad_id)$/.test(k)));
  const TEXTFELD = 'input:not([type=hidden]):not([type=checkbox]):not([type=radio])';
  let aktuell = '1', tiefe = 0, ausloeser = null, sperreY = 0, popIgnorieren = 0, eigenesClose = false, weg = false, vorbelegt = false;
  const track = (n, d) => { try { return window.umami && window.umami.track(n, d); } catch (e) {} };
  const aktiv = () => schritte.find(s => s.dataset.funnelSchritt === aktuell);

  /* A Tastatur: nur solange ein Textfeld im Funnel Fokus hat, endet der Funnel an der sichtbaren Fläche (13 §13) */
  const tippt = () => { const el = document.activeElement; return !!(vv && el && dlg.contains(el) && el.matches(TEXTFELD + ', textarea')); };
  function sync() {
    if (dlg.open && tippt()) {
      root.style.setProperty('--vvh', vv.height + 'px');
      root.style.setProperty('--vvt', vv.offsetTop + 'px');
      root.classList.add('fn-tastatur');
      sichtbarHalten();
    } else {
      root.classList.remove('fn-tastatur');
      root.style.removeProperty('--vvh'); root.style.removeProperty('--vvt');
    }
  }
  let raf = 0;
  const plane = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(sync); };
  function sichtbarHalten() {                                         // nur im Funnel scrollen, nie das Fenster
    const el = document.activeElement, s = aktiv();
    if (!el || !s) return;
    el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    const knopf = s.querySelector('[data-funnel-aktion]');
    if (!knopf) return;
    const b = inhalt.getBoundingClientRect(), k = knopf.getBoundingClientRect(), f = el.getBoundingClientRect();
    const fehlt = k.bottom + 8 - b.bottom, luft = f.top - b.top - 8;
    if (fehlt > 0 && luft > 0) inhalt.scrollTop += Math.min(fehlt, luft);
  }
  if (vv) { vv.addEventListener('resize', plane); vv.addEventListener('scroll', plane); }
  dlg.addEventListener('focusin', plane);
  dlg.addEventListener('focusout', () => { plane(); setTimeout(plane, 350); });

  /* B Hintergrund sperren ohne Sprung */
  function sperren() {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    sperreY = window.scrollY;
    root.style.setProperty('--sperre-top', -sperreY + 'px');
    root.classList.add('fn-offen');
  }
  function freigeben() {
    root.classList.remove('fn-offen', 'fn-tastatur');
    ['--sperre-top', '--vvh', '--vvt'].forEach(v => root.style.removeProperty(v));
    window.scrollTo({ top: sperreY, left: 0, behavior: 'instant' });
  }

  /* C Schritte, Fortschritt, Fokus */
  const MERK = {
    bar: 'Statt Bargeld schickst du einen Link per WhatsApp, dein Kunde zahlt am Handy.',
    karte: 'Ohne Kartengerät: Du schickst einen Link per WhatsApp, dein Kunde zahlt am Handy.',
    ueberweisung: 'Statt auf eine Überweisung zu warten: Du schickst einen Link, dein Kunde zahlt am Handy.',
    gemischt: 'Ein Weg für alle: Du schickst einen Link per WhatsApp, dein Kunde zahlt am Handy.',
  };
  function merkzettel() {
    const t = dlg.querySelector('[data-funnel-merk-text]');
    const raten = antworten.raten === 'oft' || antworten.raten === 'manchmal';
    t.textContent = (MERK[antworten.zahlung] || MERK.gemischt) + (raten ? ' Bei großen Motiven auch in Raten* über Klarna.' : ' Mit Karte, Apple Pay, Google Pay oder Klarna*.');
  }
  function zeige(n, push) {
    aktuell = String(n);
    schritte.forEach(s => { s.hidden = s.dataset.funnelSchritt !== aktuell; });
    const nr = Number(aktuell);
    stand.textContent = 'Schritt ' + nr + ' von ' + ANZEIGE;
    balken.style.transform = 'scaleX(' + nr / ANZEIGE + ')';
    const h = aktiv().querySelector('h2'); if (kopfTitel && h) kopfTitel.textContent = h.textContent.replace(/\s+/g, ' ').trim();
    zurueck.hidden = nr === 1;
    if (nr === 3) merkzettel();
    if (push) { history.pushState({ fn: aktuell, i: ++tiefe }, ''); if (nr > 1) track('funnel-schritt-' + nr); }
    inhalt.scrollTop = 0;
    const s = aktiv(), felder = [...s.querySelectorAll(TEXTFELD)];
    const feld = felder.find(f => !f.value.trim()) || felder[0];
    (feld || s.querySelector('h2')).focus({ preventScroll: true });   // Feld synchron im Tipp fokussieren, sonst keine Tastatur auf iOS
  }
  const naechster = () => String(Math.min(gesamt, Number(aktuell) + 1));

  /* D Prüfen (gleiche Regeln wie /start) */
  const REGELN = {
    firma: v => v.length >= 2 || 'Bitte gib den Namen deines Studios ein.',
    inhaber: v => v.length >= 2 || 'Bitte gib deinen Vor- und Nachnamen ein.',
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || 'Bitte gib eine gültige E-Mail-Adresse ein.',
    telefon: v => v.replace(/\D/g, '').length >= 6 || 'Bitte gib deine Handynummer mit Vorwahl ein.',
  };
  function pruefe(input) {
    const r = REGELN[input.name]; if (!r) return true;
    const ok = r(input.value.trim()), meldung = document.getElementById(input.id + '-f');
    input.setAttribute('aria-invalid', ok === true ? 'false' : 'true');
    if (meldung) { meldung.hidden = ok === true; meldung.textContent = ok === true ? '' : ok; }
    return ok === true;
  }
  function schrittOk() {
    const falsch = [...aktiv().querySelectorAll(TEXTFELD)].filter(f => !pruefe(f));
    if (falsch.length) { falsch[0].focus({ preventScroll: true }); plane(); return false; }
    return true;
  }
  function weiter() { if (schrittOk()) zeige(naechster(), true); }
  form.addEventListener('focusout', e => { if (e.target.matches('input') && e.target.value) pruefe(e.target); });
  form.addEventListener('input', e => { if (e.target.getAttribute('aria-invalid') === 'true') pruefe(e.target); });
  form.addEventListener('keydown', e => {                             // Enter: nächstes Feld, im letzten Feld Weiter bzw. Übergabe
    if (e.key !== 'Enter' || !e.target.matches('input')) return;
    e.preventDefault();
    const felder = [...aktiv().querySelectorAll(TEXTFELD)], i = felder.indexOf(e.target);
    if (i > -1 && i < felder.length - 1) felder[i + 1].focus({ preventScroll: true });
    else if (aktuell === String(gesamt)) uebergeben(); else weiter();
  });
  form.addEventListener('submit', e => { e.preventDefault(); uebergeben(); });

  /* E Übergabe an /start: Angaben per sessionStorage im Format von start.js, nie in der Adresse (13 §9) */
  const endKnopf = dlg.querySelector('[data-funnel-schritt="' + gesamt + '"] [data-funnel-aktion]'), endText = endKnopf.innerHTML;
  const wert = n => (form.elements.namedItem(n).value || '').trim();
  function uebergeben() {
    if (weg || !schrittOk()) return;
    const neu = { paket: 'monatlich', firma: wert('firma'), inhaber: wert('inhaber'), email: wert('email'), telefon: wert('telefon') };
    try {
      let alt = {}; try { alt = JSON.parse(sessionStorage.getItem('tf-start') || '{}') || {}; } catch (x) {}
      sessionStorage.setItem('tf-start', JSON.stringify(Object.assign(alt, neu)));
      sessionStorage.setItem('schilling-funnel', JSON.stringify({ antworten, herkunft, t: Date.now() }));
    } catch (x) {}
    weg = true; endKnopf.disabled = true; endKnopf.textContent = 'Einen Moment …';
    const ziel = (ausloeser && ausloeser.getAttribute('href')) || '/start.html';
    let los = false; const geh = () => { if (!los) { los = true; location.assign(ziel); } };
    Promise.resolve(track('funnel-weiter-start')).then(geh, geh); setTimeout(geh, 400);
  }
  addEventListener('pageshow', e => { if (e.persisted) { weg = false; endKnopf.disabled = false; endKnopf.innerHTML = endText; } });

  /* F Öffnen, Schließen, Zurück (Handy-Zurück = ein Schritt zurück, Adresse bleibt gleich) */
  function vorbelegen() {                                             // zurück von /start: Angaben dieser Sitzung wieder eintragen
    if (vorbelegt) return; vorbelegt = true;
    try { const d = JSON.parse(sessionStorage.getItem('tf-start') || '{}') || {};
      ['firma', 'inhaber', 'email', 'telefon'].forEach(k => { const el = form.elements.namedItem(k); if (el && !el.value && typeof d[k] === 'string') el.value = d[k]; });
    } catch (x) {}
  }
  function oeffnen(e) {
    e.preventDefault();
    ausloeser = e.currentTarget;
    vorbelegen();
    sperren();
    dlg.showModal();
    tiefe = 0;
    zeige(aktuell, true);
    track('funnel-start', { ort: ausloeser.dataset.ort || '', schritt: aktuell });
  }
  function schliessen() {
    if (tiefe > 0) { const d = tiefe; tiefe = 0; popIgnorieren = 0; history.go(-d); }
    else abschluss();
  }
  function abschluss() {
    if (!dlg.open) return;
    eigenesClose = true; dlg.close();
    freigeben();
    track('funnel-zu', { schritt: aktuell });
    if (ausloeser) ausloeser.focus({ preventScroll: true });
  }
  addEventListener('popstate', e => {
    if (!dlg.open) return;
    if (popIgnorieren) { popIgnorieren--; return; }
    const st = e.state;
    if (st && st.fn) { tiefe = st.i; zeige(st.fn, false); }
    else { tiefe = 0; abschluss(); }
  });
  dlg.addEventListener('cancel', e => { e.preventDefault(); schliessen(); });
  dlg.addEventListener('close', () => {
    if (eigenesClose) { eigenesClose = false; return; }
    const d = tiefe; tiefe = 0; freigeben();
    if (d > 0) { popIgnorieren = 1; history.go(-d); }
    if (ausloeser) ausloeser.focus({ preventScroll: true });
  });
  document.querySelectorAll('[data-funnel-oeffnen]').forEach(b => {
    if (b.tagName === 'A') b.setAttribute('role', 'button');
    b.addEventListener('click', oeffnen);
  });
  dlg.querySelector('[data-funnel-zu]').addEventListener('click', schliessen);
  zurueck.addEventListener('click', () => { if (tiefe > 1) history.back(); else zeige(String(Math.max(1, Number(aktuell) - 1)), false); });

  /* G Antworten: Tipp springt weiter; folgt ein Textfeld, sofort (iOS öffnet die Tastatur nur im Tipp) */
  dlg.addEventListener('click', e => {
    const b = e.target.closest('[data-funnel-antwort]');
    if (b) {
      const s = b.closest('[data-funnel-schritt]');
      s.querySelectorAll('[data-funnel-antwort]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      antworten[b.dataset.feld] = b.dataset.wert;
      const ziel = schritte.find(x => x.dataset.funnelSchritt === naechster());
      if ((ziel && ziel.querySelector(TEXTFELD)) || ruhig.matches) weiter(); else setTimeout(weiter, 160);
      return;
    }
    if (e.target.closest('[data-funnel-weiter]')) weiter();
  });

  /* H Wischen auf der Kopfzeile schiebt nie die Seite dahinter */
  dlg.addEventListener('touchmove', e => { if (!e.target.closest('.fn-inhalt')) e.preventDefault(); }, { passive: false });
})();
</script>"""


def funnel_knoepfe(seite):
    """Alle Hauptknöpfe auf /start werden Funnel-Öffner (E21). Ohne JS bleibt der Link; Umami zählt das Skript (funnel-start)."""
    seite, n = re.subn(r'<a class="knopf"([^>]*?) href="(/start\.html\?[^"]*?utm_content=(\w+))" data-umami-event="start-\w+">',
                       r'<a class="knopf"\1 href="\2" data-funnel-oeffnen data-ort="\3" aria-haspopup="dialog">', seite)
    assert n == 3, f"erwartet 3 Hauptknöpfe, gefunden {n}"
    return seite


KOPF_SKRIPT = """<script>(function(){try{
if(!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)){var d=document.documentElement;d.classList.add('stech-warten');setTimeout(function(){d.classList.remove('stech-warten')},4000);}}catch(x){}})();</script>"""

ZEIGEN_JS = """<script>/* So läuft eine Zahlung: Positionsanzeige 1/5 und Punkte unter dem Wischband (nur solange es wischt) */
(function(){var r=document.querySelector('.zeigen-reihe'),st=document.querySelector('[data-zeigen-stand]');if(!r||!st)return;
var bs=[].slice.call(r.children),pk=[].slice.call(st.querySelectorAll('[data-zeigen-punkt]')),z=st.querySelector('.zeigen-zahl'),akt=-1;
function idx(){var w=bs.length>1?bs[1].offsetLeft-bs[0].offsetLeft:1;return Math.max(0,Math.min(bs.length-1,Math.round(r.scrollLeft/(w||1))))}
function setz(){var i=idx();if(i===akt)return;akt=i;z.textContent=(i+1)+'/'+bs.length;pk.forEach(function(b,j){if(j===i)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current')})}
var t=0;r.addEventListener('scroll',function(){cancelAnimationFrame(t);t=requestAnimationFrame(setz)},{passive:true});
pk.forEach(function(b,j){b.addEventListener('click',function(){var ruhig=matchMedia('(prefers-reduced-motion: reduce)').matches;r.scrollTo({left:bs[j].offsetLeft-bs[0].offsetLeft,behavior:ruhig?'auto':'smooth'})})});
st.hidden=false;setz();})();</script>"""

BANNER_JS = """<script>/* Consent-Leiste offen: erster Bildschirm schrumpft um ihre Höhe, damit Überschrift, Knopf und Preiszeile sichtbar bleiben (E14) */
(function(){var d=document.documentElement;function m(){var c=document.querySelector('.tf-cc'),h=0;if(c){c.setAttribute('data-consent','');var r=c.getBoundingClientRect();if(document.body.classList.contains('tf-cc-offen')&&r.height>0&&getComputedStyle(c).display!=='none'){h=Math.max(0,Math.round(innerHeight-r.top))}}d.style.setProperty('--banner-h',h+'px')}
new MutationObserver(m).observe(document.body,{attributes:true,attributeFilter:['class'],childList:true});addEventListener('resize',m);m();})();</script>"""

# Gewählt: A (Domenic 18.11.2026). B und C bleiben als Entwürfe in der Projektakte, nicht im Veröffentlichungs-Ordner.
for ENTWURF, DATEI in (("a", "studios-raten.html"), ("b", "../_schilling/studios-raten/entwuerfe/studios-raten-entwurf-b.html"), ("c", "../_schilling/studios-raten/entwuerfe/studios-raten-entwurf-c.html")):
  seite = f"""<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-visual">
{KOPF_SKRIPT}
<title>Ratenzahlung für deine Tattoo-Kunden – 7 Tage kostenlos testen | Tattoofin</title>
<meta name="description" content="Dein Kunde kann per Klarna zahlen, du bekommst das Geld in einer Summe aufs eigene Stripe-Konto. Keine Provision. 7 Tage kostenlos testen, danach 49,90 € im Monat inkl. MwSt.">
<meta name="robots" content="noindex,follow">
<meta name="theme-color" content="#f5ead2">
<link rel="canonical" href="https://tattoofin.de/studios-raten">
<meta property="og:type" content="website"><meta property="og:locale" content="de_DE"><meta property="og:site_name" content="Tattoofin">
<meta property="og:title" content="Raten* für deine Kunden. Dein Geld auf einmal.">
<meta property="og:description" content="7 Tage kostenlos testen. *Raten über Klarna, nach deren Bonitätsprüfung. Achtung! Kreditaufnahme kostet Geld.">
<meta property="og:url" content="https://tattoofin.de/studios-raten"><meta property="og:image" content="https://tattoofin.de/assets/og.jpg">
<link rel="icon" href="/favicon.png" type="image/png"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/assets/start/fonts/LuckiestGuy.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/start/fonts/DMSans.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/start/figur.webp" as="image" type="image/webp">
<link rel="stylesheet" href="/assets/site/werte.css?v=20261123a">
<link rel="stylesheet" href="/assets/start/style.css?v=20261123a">
<style>{CSS}{FN_CSS}</style>
</head>
<body data-wa="aus">
<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs><pattern id="tf-punkte" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="2.2" cy="2.2" r="2.1" fill="#1f3d5c"/><circle cx="6.7" cy="6.7" r="2.1" fill="#1f3d5c"/></pattern></defs></svg>
<a class="sprung" href="#inhalt">Zum Inhalt springen</a>
<div class="bogen">

  <header class="kopf">
    <a class="kopf-marke" href="/studios" aria-label="Tattoofin für Studios"><img src="/assets/start/wortmarke.png" alt="Tattoofin" width="519" height="116"></a>
    <nav aria-label="Kontakt">
      <a class="kopf-wa" href="{WA}" aria-label="WhatsApp an das Tattoofin-Team" data-umami-event="whatsapp-kopf">{WA_ICON}</a>
    </nav>
  </header>

  <main id="inhalt">
  <section class="held" data-hero aria-label="Ratenzahlung für deine Kunden">
{held(ENTWURF, HELD[ENTWURF])}
    <div class="held-fuss">
      <a class="knopf" data-hero-pflicht="immer" href="{START}held" data-umami-event="start-held">{KNOPF}</a>
      <p class="preiszeile" data-hero-pflicht="immer">{ZEILE}</p>
    </div>
  </section>

  <section class="ablauf beleg-oben" aria-label="Echter Fall">
    {FALL}
  </section>

  {ZEIGEN}

  {fakten(block(r'<section class="geld".*?</section>')).replace('Dein Geld kommt auf&nbsp;einmal.', 'Du finanzierst nichts&nbsp;vor.').replace('<a class="mehr" href="/ratenzahlung-tattoostudio.html">Mehr zur Ratenzahlung im Tattoostudio&nbsp;→</a>', '')}

  <section class="testwoche" id="testwoche" aria-labelledby="testwoche-titel">
    <h2 id="testwoche-titel">So laufen deine 7&nbsp;Tage.</h2>
    <ol class="streifen">
      <li class="blatt"><span class="blatt-tag">Tag 1</span><p><b>Anmelden, heute 0&nbsp;€.</b> Vier Angaben, dann hinterlegst du deine Karte sicher bei Stripe.</p></li>
      <li class="blatt"><span class="blatt-tag">Einrichtung</span><p><b>Mit unserem Team.</b> Du legst dein Stripe-Konto an, wir machen mit dir eine Testzahlung. Dann schickst du deinen ersten Link.</p></li>
      <li class="blatt blatt-ab"><span class="blatt-tag">Tag 7</span><p><b>Kündigst du in den 7&nbsp;Tagen, zahlst du nichts.</b> Danach 49,90&nbsp;€ im Monat inkl. MwSt., monatlich kündbar.</p></li>
    </ol>
  </section>

  {PREIS}

  <section class="fragen" id="fragen" aria-labelledby="fragen-titel">
    <h2 id="fragen-titel">Noch Fragen?</h2>
    <div class="fragen-liste">
      {chr(10).join(FRAGEN)}
    </div>
    <p class="fragen-wa">Deine Frage ist nicht dabei? <a href="{WA}" data-umami-event="whatsapp-fragen">Schreib uns per WhatsApp an 0162&nbsp;4502375</a></p>
  </section>

  <section class="schluss-raten" aria-labelledby="schluss-titel">
    <h2 id="schluss-titel">Nächstes großes Motiv? Schick den&nbsp;Link.</h2>
    <a class="knopf" href="{START}schluss" data-umami-event="start-schluss">{KNOPF}</a>
    <p class="preiszeile">{ZEILE}</p>
    <a class="wa" href="{WA}" data-umami-event="whatsapp-schluss">Erst fragen? WhatsApp</a>
  </section>
  </main>

  {FUSS}
</div>
{FN_HTML}
<script src="/assets/start/app.js?v=20261116b" defer></script>
<script defer src="https://cloud.umami.is/script.js" data-website-id="507b740f-264e-4ba1-a7d0-9dbe49db75af" data-domains="tattoofin.de"></script>
<script src="/js/tf-track.js?v=20261117b"></script>
<script src="/js/studios.js"></script>
{BANNER_JS}
{ZEIGEN_JS}
{FN_JS}
</body>
</html>
"""
  seite = funnel_knoepfe(seite)
  (PUB / DATEI).write_text(seite, encoding="utf-8")
  print("geschrieben:", DATEI, len(seite), "Zeichen")
