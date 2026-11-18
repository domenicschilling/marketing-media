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
PREIS = re.sub(r'\s*<p class="preis-rechnung">.*?</p>', '', block(r'<section class="preis".*?</section>'), flags=re.S)  # No-Show-Rechnung gehört nicht zum Raten-Winkel
FUSS = block(r'<footer class="fuss">.*?</footer>')

# Fragen: nur die, die zum Raten-Winkel und zur Testwoche gehören (Wortlaut wie live)
FRAGEN_WAHL = ["Bekommt jeder Kunde Raten*?", "Und wenn der Kunde nicht zahlt?", "Ist Tattoofin der Kreditgeber?",
               "Was kostet es genau?", "Wie kündige ich? Und wenn Stripe mich ablehnt?", "Wann kommt das Geld, und was brauche ich?",
               "Technik ist nicht meins.", "Ich hab schon SumUp &amp; Co."]
FRAGEN = []
for frage in FRAGEN_WAHL:
    m = re.search(r'<details class="frage"><summary><span>' + re.escape(frage) + r'</span>.*?</details>', LIVE, re.S)
    if not m:
        raise SystemExit("Frage fehlt live: " + frage)
    FRAGEN.append(m.group(0))

WA = ("https://wa.me/491624502375?text=Hi%20Tattoofin-Team%2C%20ich%20habe%20eure%20Anzeige%20zur%20Ratenzahlung%20gesehen%2C"
      "%20habe%20ein%20Tattoo-Studio%20und%20eine%20Frage%3A")
WA_ICON = ('<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.8a9.2 9.2 0 0 0-7.9 13.9L2.9 21.2l4.6-1.2A9.2 9.2 0 1 0 12 2.8Z" '
           'fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M8.8 7.6c-.5 0-1 .6-1 1.7 0 2.9 3.7 6.9 7 6.9 1.1 0 1.7-.7 '
           '1.7-1.2 0-.4-.1-.7-.4-.9l-1.6-.8c-.3-.1-.5 0-.7.2l-.5.6c-.2.2-.4.2-.7.1-1-.4-2.1-1.5-2.5-2.5-.1-.3-.1-.5.1-.7l.5-.5c.2-.2.3-.4.2-.7l-.7-1.6c-.2-.4-.5-.5-.9-.5Z" '
           'fill="currentColor"/></svg>')
START = "/start.html?utm_source=studios-raten&amp;utm_medium=seite&amp;utm_content="
KNOPF = "7 Tage kostenlos testen"
ZEILE = "Danach 49,90&nbsp;€ im Monat · monatlich kündbar"
FN = '<p class="raten-fn" data-zaehlt-nicht>*Raten über Klarna, nach deren Bonitätsprüfung. Achtung! Kreditaufnahme kostet Geld.</p>'
B, G, H = "#1f3d5c", "#fbb316", "#fff7e3"


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
    teile.append(linie("M62 268 L258 258", 3, B))  # Abrisskante
    for k in range(4):  # Abriss-Streifen, ohne Beträge
        x = 66 + k * 48
        y = 278 - k * 2.5
        d = f"M{x} {y} L{x + 40} {y - 2} L{x + 44} {y + 76} L{x + 4} {y + 78} Z"
        teile.append(f'<g class="abriss abriss-{k}">' + form(d, G, 5) + text(x + 23, y + 46, "RATE*", 14, drehen=-88) + "</g>")
    pfeil = "M282 176 C318 150 350 150 380 168 L374 146 L420 178 L372 206 L378 186 C350 172 320 174 292 196 Z"
    dx, dy = (-70, 290) if hoch else (0, 0)
    if hoch:
        teile.append(f'<g transform="translate(-34 136) rotate(48 350 176)">' + form(pfeil, G, 6) + "</g>")
    else:
        teile.append(form(pfeil, G, 6))
    karte = ["M418 62 L634 74 L624 354 L408 344 Z"]
    g = [form(karte[0], H, 6), text(521, 114, "DEIN STUDIO", 26, drehen=3),
         text(519, 148, "bekommt den Betrag", 16, schrift="text", drehen=3), text(518, 170, "auf einmal", 16, schrift="text", drehen=3),
         '<g class="stempel">' + form("M436 220 L604 232 L598 308 L430 296 Z", "none", 8)
         + linie("M446 232 L592 242 L588 296 L442 286 Z", 3) + text(517, 278, "BEZAHLT", 31, drehen=4) + "</g>",
         form("M626 22 L633 40 L652 41 L637 53 L642 72 L626 61 L610 72 L615 53 L600 41 L619 40 Z", G, 4)]
    teile.append(f'<g transform="translate({dx} {dy})">' + "".join(g) + "</g>")
    teile.append(form("M300 300 C290 270 312 252 330 262 C318 270 316 290 330 302 C320 308 306 306 300 300 Z", G, 4) if not hoch
                 else form("M86 470 C76 440 98 422 116 432 C104 440 102 460 116 472 C106 478 92 476 86 470 Z", G, 4))
    box = "20 10 600 650" if hoch else "20 10 640 380"
    klasse = "szene-hoch" if hoch else "szene-breit"
    return (f'<svg class="motiv stech szene-svg {klasse}" viewBox="{box}" role="img" '
            f'aria-label="Flash-Motiv: Die Rechnung des Kunden mit vier Abriss-Streifen „Rate“, daneben die Karte des Studios mit dem Stempel „Bezahlt“.">'
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


HELD = {
    "a": {"h1": "Raten* für deine Kunden. Dein Geld auf&nbsp;einmal.",
          "s": "Link schicken, dein Kunde zahlt per Klarna. Tattoofin nimmt keine&nbsp;Provision.",
          "szene": szene_a() + szene_a(hoch=True)},
    "b": {"h1": "Großes Motiv? Dein Kunde zahlt in&nbsp;Raten*.",
          "s": "Link schicken, Klarna prüft, du bekommst dein Geld auf&nbsp;einmal.",
          "szene": ('<div class="szene-b">' + HERZ.replace('class="motiv stech"', 'class="motiv stech b-herz"', 1)
                    + '<figure class="b-handy"><span class="klebe" aria-hidden="true"></span><span class="handy-rahmen">'
                    '<img src="/assets/start/handy-kunde.webp?v=20261116d" width="600" height="1300" decoding="async" '
                    'alt="Echte Tattoofin-Zahlseite am Handy, Ausschnitt: Im nächsten Schritt siehst du die Zahlarten, zum Beispiel Karte, Apple Pay oder Klarna. '
                    'Darunter der Hinweis: Raten über Klarna, nach deren Bonitätsprüfung. Vertragspartner der Raten ist Klarna, nicht Tattoofin. Achtung! Kreditaufnahme kostet Geld.">'
                    '</span><figcaption>Echte Zahlseite · Ausschnitt</figcaption></figure></div>')},
    "c": {"h1": "7 Tage Raten* anbieten. Kostenlos.",
          "s": "Link schicken, dein Kunde zahlt per Klarna, du bekommst dein Geld auf&nbsp;einmal.",
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
      <img class="held-figur" src="/assets/start/figur.webp" alt="" width="300" height="310" decoding="async">
    </div>'''


CSS = """
/* Anzeigenseite Raten* + 7 Tage (Schilling-Konzept 18.11.2026). Erbt Farben, Schriften, Knopf, Bogen, Fall, Geld, Preis, Fragen aus style.css. */
:root{--kopf-h:53px}
.kopf{height:var(--kopf-h);min-height:0;padding-top:0;padding-bottom:0}
/* Erster Bildschirm = genau der sichtbare Bildschirm (svh), alles darin sichtbar */
.held{max-width:1280px;margin-inline:auto;height:calc(100svh - var(--kopf-h));min-height:300px;padding:2px var(--rand) calc(12px + var(--banner-h,0px));display:flex;flex-direction:column}
.held h1{font-size:clamp(28px,min(11vw,6.9svh),92px);margin-top:2px;text-wrap:balance}
.held .unterzeile{font-size:clamp(14px,min(4.3vw,2.6svh),22px);margin-top:6px;max-width:30em}
.held .raten-fn{margin-top:5px}
.held .held-buehne{position:relative;flex:1 1 0;height:auto;min-height:70px;margin:8px 0 6px;cursor:pointer}
.held-buehne .szene-svg{position:absolute;inset:0;width:100%;height:100%}
.held-a .held-figur{left:41%;height:min(42%,165px)}
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
@media (max-width:599px) and (min-height:720px){.held-a .szene-breit{display:none}.held-a .szene-hoch{display:block}.held-a .held-figur{left:-4px;height:min(36%,190px)}}
@keyframes stempel{0%{transform:scale(1.9) rotate(-14deg);opacity:0}70%{opacity:1}100%{transform:scale(1) rotate(0);opacity:1}}
@keyframes abriss{0%,100%{transform:rotate(0)}35%{transform:rotate(5deg)}70%{transform:rotate(-3deg)}}
/* Entwurf B: Herz oben links, echter Zahlseiten-Ausschnitt rechts */
.szene-b{position:absolute;inset:0}
.b-herz{position:absolute;left:0;top:0;width:auto;height:52%;max-width:40%;z-index:1}
.b-handy{position:absolute;right:1%;top:5%;height:90%;max-width:58%;aspect-ratio:600/700;transform:rotate(-3deg);z-index:2}
.b-handy .handy-rahmen{height:calc(100% - 22px)}
.b-handy .handy-rahmen img{height:100%;aspect-ratio:auto;object-fit:cover;object-position:50% 79%}
.held-b .held-figur{height:min(34%,150px);left:-6px}
.b-handy figcaption{text-align:center;font-size:12px;font-weight:700;margin-top:4px;transform:rotate(3deg)}
/* Zweiter Bildschirm: stärkster Beleg */
.beleg-oben{padding-top:22px}
.testwoche{max-width:1280px;margin-inline:auto;padding:28px var(--rand) 34px}
.testwoche ol{list-style:none;display:grid;gap:14px;margin-top:18px;counter-reset:t}
.testwoche li{position:relative;padding:14px 16px 14px 58px;background:var(--hell);border:4px solid var(--blau);border-radius:14px;box-shadow:4px 5px 0 var(--blau);counter-increment:t;line-height:1.4}
.testwoche li::before{content:counter(t);position:absolute;left:12px;top:12px;display:grid;place-items:center;width:32px;height:32px;padding-top:.18em;border-radius:50%;background:var(--blau);color:var(--gelb);font:400 19px/1 var(--anzeige)}
.testwoche li b{font-weight:800}
.testwoche .zusage{margin-top:16px;font-weight:800}
@media (min-width:720px){.testwoche ol{grid-template-columns:repeat(3,1fr)}}
.schluss-raten{max-width:1280px;margin-inline:auto;padding:34px var(--rand) 40px;display:grid;gap:12px;justify-items:start}
.schluss-raten .wege{margin-top:6px}
@media (max-width:599px){.schluss-raten .knopf{width:100%}}
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

KOPF_SKRIPT = """<script>(function(){try{
if(!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)){var d=document.documentElement;d.classList.add('stech-warten');setTimeout(function(){d.classList.remove('stech-warten')},4000);}}catch(x){}})();</script>"""

BANNER_JS = """<script>/* Consent-Leiste offen: erster Bildschirm schrumpft um ihre Höhe, damit Überschrift, Knopf und Preiszeile sichtbar bleiben (E14) */
(function(){var d=document.documentElement;function m(){var c=document.querySelector('.tf-cc'),h=0;if(c){c.setAttribute('data-consent','');var r=c.getBoundingClientRect();if(document.body.classList.contains('tf-cc-offen')&&r.height>0&&getComputedStyle(c).display!=='none'){h=Math.max(0,Math.round(innerHeight-r.top))}}d.style.setProperty('--banner-h',h+'px')}
new MutationObserver(m).observe(document.body,{attributes:true,attributeFilter:['class'],childList:true});addEventListener('resize',m);m();})();</script>"""

for ENTWURF, DATEI in (("a", "studios-raten.html"), ("b", "studios-raten-entwurf-b.html"), ("c", "studios-raten-entwurf-c.html")):
  seite = f"""<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
{KOPF_SKRIPT}
<title>Ratenzahlung für deine Tattoo-Kunden – 7 Tage kostenlos testen | Tattoofin</title>
<meta name="description" content="Dein Kunde zahlt per Klarna in Raten, du bekommst dein Geld auf einmal aufs eigene Stripe-Konto. Keine Provision. 7 Tage kostenlos testen, danach 49,90 € im Monat inkl. MwSt.">
<meta name="robots" content="noindex,follow">
<meta name="theme-color" content="#f5ead2">
<link rel="canonical" href="https://tattoofin.de/studios">
<meta property="og:type" content="website"><meta property="og:locale" content="de_DE"><meta property="og:site_name" content="Tattoofin">
<meta property="og:title" content="Raten* für deine Kunden. Dein Geld auf einmal.">
<meta property="og:description" content="7 Tage kostenlos testen. *Raten über Klarna, nach deren Bonitätsprüfung. Achtung! Kreditaufnahme kostet Geld.">
<meta property="og:url" content="https://tattoofin.de/studios-raten"><meta property="og:image" content="https://tattoofin.de/assets/og.jpg">
<link rel="icon" href="/favicon.png" type="image/png"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/assets/start/fonts/LuckiestGuy.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/start/fonts/DMSans.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/start/figur.webp" as="image" type="image/webp">
<link rel="stylesheet" href="/assets/start/style.css?v=20261117i">
<style>{CSS}</style>
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

  {block(r'<section class="geld".*?</section>').replace('<a class="mehr" href="/ratenzahlung-tattoostudio.html">Mehr zur Ratenzahlung im Tattoostudio&nbsp;→</a>', '')}

  <section class="testwoche" id="testwoche" aria-labelledby="testwoche-titel">
    <h2 id="testwoche-titel">So laufen deine 7&nbsp;Tage.</h2>
    <ol>
      <li><b>Anmelden, heute 0&nbsp;€.</b> Vier Angaben, dann hinterlegst du deine Karte sicher bei Stripe.</li>
      <li><b>Einrichten mit unserem Team.</b> Du legst dein Stripe-Konto an, wir machen mit dir eine Testzahlung.</li>
      <li><b>Ersten Link schicken.</b> Dein Kunde wählt am Handy Karte, Apple&nbsp;Pay, Google&nbsp;Pay oder&nbsp;Klarna.</li>
    </ol>
    <p class="zusage">Kündigst du in den 7&nbsp;Tagen, zahlst du nichts. Danach 49,90&nbsp;€ im Monat inkl. MwSt., monatlich kündbar.</p>
  </section>

  {PREIS.replace('Eine Anzahlung zahlt Tattoofin fast 3&nbsp;Monate.', 'Keine Provision. Nur die Stripe-Gebühr.').replace(START.replace('studios-raten', 'studios'), START).replace('utm_content=preis" data-umami-event="start-preis">1 Woche testen', 'utm_content=preis" data-umami-event="start-preis">' + KNOPF).replace('/start.html?utm_source=studios&amp;utm_medium=seite&amp;utm_content=preis', START + 'preis')}

  <section class="fragen" id="fragen" aria-labelledby="fragen-titel">
    <h2 id="fragen-titel">Noch Fragen?</h2>
    <div class="fragen-liste">
      {chr(10).join(FRAGEN)}
    </div>
    <p class="fragen-wa">Deine Frage ist nicht dabei? <a href="{WA}" data-umami-event="whatsapp-fragen">Schreib uns per WhatsApp an 0162&nbsp;4502375</a></p>
  </section>

  <section class="schluss-raten" aria-labelledby="schluss-titel">
    <h2 id="schluss-titel">Nächstes großes Motiv? Schick den&nbsp;Link.</h2>
    <p class="preiszeile">7 Tage kostenlos, danach 49,90&nbsp;€ im Monat inkl. MwSt. · monatlich kündbar · nur für Unternehmer</p>
    <div class="wege"><a class="knopf" href="{START}schluss" data-umami-event="start-schluss">{KNOPF}</a><a class="wa" href="{WA}" data-umami-event="whatsapp-schluss">Erst fragen? WhatsApp</a></div>
  </section>
  </main>

  {FUSS}
</div>
<script src="/assets/start/app.js?v=20261116b" defer></script>
<script defer src="https://cloud.umami.is/script.js" data-website-id="507b740f-264e-4ba1-a7d0-9dbe49db75af" data-domains="tattoofin.de"></script>
<script src="/js/tf-track.js?v=20261117b"></script>
<script src="/js/studios.js"></script>
{BANNER_JS}
</body>
</html>
"""
  (PUB / DATEI).write_text(seite, encoding="utf-8")
  print("geschrieben:", DATEI, len(seite), "Zeichen")
