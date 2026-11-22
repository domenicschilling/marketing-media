"""angebot.new, Logo D „der Punkt“: Vektordateien aus Inter erzeugen.

Aufruf (aus diesem Ordner):
  uv run --no-project --with fonttools --with brotli --with uharfbuzz --with skia-pathops python erzeugen.py
Danach: node png.mjs (PNG, ICO, Open-Graph-Bild).

Quelle der Umrisse ist dieselbe Inter-Datei, die das Programm ausliefert (../inter.woff2, OFL 1.1).
Alle Maße stehen unten in EINSTELLUNG, damit Feinabstimmung an einer Stelle bleibt.
"""
import json, os, sys, tempfile
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.basePen import BasePen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
import uharfbuzz as hb

HIER = os.path.dirname(os.path.abspath(__file__))
SCHRIFT = os.path.join(HIER, "..", "inter.woff2")
EM = 2048

EINSTELLUNG = {
    "gewicht": 600,
    "laufweite": -0.04,        # em, wie vorgegeben
    "punkt": 0.222,            # Durchmesser in em (Schriftpunkt Inter 600 etwa 0,16)
    "ueberhang": 0.012,        # wie weit der Kreis unter die Grundlinie reicht (wie das o)
    "abstand_links": 0.056,    # sichtbarer Abstand t -> Punkt in em
    "abstand_rechts": 0.066,   # sichtbarer Abstand Punkt -> n in em
    "kurz_abstand": 0.05,      # sichtbarer Abstand a -> Punkt
}
FARBEN = {
    "hell": {"text": "#111827", "punkt": "#0f766e", "grund": "#ffffff"},
    "dunkel": {"text": "#ffffff", "punkt": "#2dd4bf", "grund": "#111827"},
    "blaugruen": {"text": "#ffffff", "punkt": "#ffffff", "grund": "#0f766e"},
}
KLEIN = json.loads(os.environ.get("KLEIN") or "null") or {
    16: {"gewicht": 600, "xh": 10, "grund": 13, "links": 1.25, "stamm": 10, "d": 4, "px": 10.75, "ecke": 3},
    32: {"gewicht": 600, "xh": 18, "grund": 25, "links": 3.5, "stamm": 20, "d": 7, "px": 21.5, "ecke": 7},
}
LIZENZ = ("Umrisse aus Inter (Copyright 2016 The Inter Project Authors, https://github.com/rsms/inter), "
          "SIL Open Font License 1.1, siehe OFL-Inter.txt. Die OFL erlaubt das Umwandeln in Pfade fuer ein Logo.")


class Pfad(BasePen):
    """SVG-Pfad mit relativen Befehlen, kurz und ohne aufgelaufene Rundungsfehler."""

    def __init__(self, glyphset=None, stellen=0):
        super().__init__(glyphset)
        self.teile, self.ist, self.stellen = [], (0.0, 0.0), stellen

    def _z(self, v):
        v = round(v, self.stellen)
        if self.stellen == 0:
            v = int(v)
        s = f"{v:.{self.stellen}f}".rstrip("0").rstrip(".") if self.stellen else str(v)
        if s.startswith("0."):
            s = s[1:]
        if s.startswith("-0."):
            s = "-" + s[2:]
        return "0" if s in ("", "-0", "-") else s

    def _r(self, p):
        return (round(p[0], self.stellen), round(p[1], self.stellen))

    def _liste(self, werte):
        out = ""
        for w in werte:
            s = self._z(w)
            out += s if not out or s.startswith("-") else " " + s
        return out

    def _moveTo(self, p):
        p = self._r(p)
        self.teile.append("M" + self._liste(p))
        self.ist = p

    def _lineTo(self, p):
        p = self._r(p)
        dx, dy = p[0] - self.ist[0], p[1] - self.ist[1]
        if dy == 0:
            self.teile.append("h" + self._z(dx))
        elif dx == 0:
            self.teile.append("v" + self._z(dy))
        else:
            self.teile.append("l" + self._liste((dx, dy)))
        self.ist = p

    def _qCurveToOne(self, a, p):
        a, p = self._r(a), self._r(p)
        x, y = self.ist
        self.teile.append("q" + self._liste((a[0] - x, a[1] - y, p[0] - x, p[1] - y)))
        self.ist = p

    def _curveToOne(self, a, b, p):
        a, b, p = self._r(a), self._r(b), self._r(p)
        x, y = self.ist
        self.teile.append("c" + self._liste((a[0] - x, a[1] - y, b[0] - x, b[1] - y, p[0] - x, p[1] - y)))
        self.ist = p

    def _closePath(self):
        self.teile.append("z")

    def text(self):
        return "".join(self.teile)


class Schnitt:
    """Ein fester Schnitt von Inter: Umrisse, Maße, Laufweiten über HarfBuzz."""

    def __init__(self, gewicht):
        roh = TTFont(SCHRIFT)
        roh.flavor = None
        self.font = instancer.instantiateVariableFont(roh, {"wght": gewicht}, overlap=instancer.OverlapMode.REMOVE)
        pfad = tempfile.mktemp(suffix=".ttf")
        self.font.save(pfad)
        self.gs = self.font.getGlyphSet()
        self.cmap = self.font.getBestCmap()
        self.hb = hb.Font(hb.Face(hb.Blob.from_file_path(pfad)))
        os.unlink(pfad)

    def grenzen(self, name):
        b = BoundsPen(self.gs)
        self.gs[name].draw(b)
        return b.bounds

    def setzen(self, text, laufweite):
        """[(glyphname, x)] und Gesamtbreite, mit Kerning aus der Schrift und eigener Laufweite."""
        buf = hb.Buffer()
        buf.add_str(text)
        buf.guess_segment_properties()
        hb.shape(self.hb, buf, {"kern": True, "liga": False, "calt": False})
        x, aus = 0, []
        namen = self.font.getGlyphOrder()
        for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
            aus.append((namen[info.codepoint], x + pos.x_offset))
            x += pos.x_advance + laufweite * EM
        return aus, x

    def zeichnen(self, name, matrix, stellen=0, stift=None):
        stift = stift or Pfad(self.gs, stellen)
        self.gs[name].draw(TransformPen(stift, matrix))
        return stift


def schriftzug(s, E=EINSTELLUNG):
    """Liefert die Maße in Font-Einheiten: y nach unten, Grundlinie bei y = oben."""
    lw = E["laufweite"]
    wort1, _ = s.setzen("angebot", lw)
    wort2, _ = s.setzen("new", lw)
    # sichtbare Kanten
    links1 = wort1[0][1] + s.grenzen(wort1[0][0])[0]
    rechts_t = wort1[-1][1] + s.grenzen(wort1[-1][0])[2]
    d = E["punkt"] * EM
    punkt_x0 = rechts_t + E["abstand_links"] * EM
    punkt_x1 = punkt_x0 + d
    n0 = s.grenzen(wort2[0][0])[0]
    versatz2 = punkt_x1 + E["abstand_rechts"] * EM - n0
    rechts = versatz2 + wort2[-1][1] + s.grenzen(wort2[-1][0])[2]
    oben = max(s.grenzen(g)[3] for g, _ in wort1 + wort2)
    unten = min(s.grenzen(g)[1] for g, _ in wort1 + wort2)
    x0 = links1
    breite, hoehe = rechts - x0, oben - unten
    m = lambda dx: (1, 0, 0, -1, dx - x0, oben)
    p1 = Pfad(s.gs)
    for g, x in wort1:
        s.zeichnen(g, m(x), stift=p1)
    p2 = Pfad(s.gs)
    for g, x in wort2:
        s.zeichnen(g, m(versatz2 + x), stift=p2)
    u = E["ueberhang"] * EM
    return {
        "breite": round(breite), "hoehe": round(hoehe), "grundlinie": round(oben),
        "angebot": p1.text(), "new": p2.text(),
        "cx": round(punkt_x0 + d / 2 - x0, 1), "cy": round(oben - d / 2 + u, 1), "r": round(d / 2, 1),
        "unten_em": round(-unten / EM, 4), "hoehe_em": round(hoehe / EM, 4),
    }


def kurzform(s, E=EINSTELLUNG):
    g = "a"
    x0, unten, x1, oben = s.grenzen(g)
    d = E["punkt"] * EM
    px0 = x1 + E["kurz_abstand"] * EM
    u = E["ueberhang"] * EM
    breite = px0 + d - x0
    hoehe = oben - min(unten, -u)
    p = s.zeichnen(g, (1, 0, 0, -1, -x0, oben))
    return {"breite": round(breite), "hoehe": round(hoehe), "a": p.text(),
            "cx": round(px0 - x0 + d / 2, 1), "cy": round(oben - d / 2 + u, 1), "r": round(d / 2, 1)}


def svg_datei(viewbox, innen, titel="angebot.new", breite=None, hoehe=None):
    groesse = (f' width="{breite}"' if breite else "") + (f' height="{hoehe}"' if hoehe else "")
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}"{groesse} role="img" aria-label="{titel}">\n'
            f'<!-- {LIZENZ} -->\n<title>{titel}</title>\n{innen}\n</svg>\n')


def symbol(s, flaeche, ink, farbe_grund, farbe_a, farbe_punkt, ecke=0, stellen=1, E=EINSTELLUNG, y_versatz=0.0):
    """App-Symbol: Kurzform mittig auf einer Fläche, ink = Anteil der Breite."""
    x0, unten, x1, oben = s.grenzen("a")
    d, ab = E["punkt"] * EM, E["kurz_abstand"] * EM
    voll = x1 - x0 + ab + d
    k = flaeche * ink / voll
    links = (flaeche - voll * k) / 2
    hoehe = (oben - unten) * k
    grund = (flaeche - hoehe) / 2 + hoehe + y_versatz  # Grundlinie
    # unten liegt das a leicht unter der Grundlinie, oben reicht es bis zur x-Höhe
    p = s.zeichnen("a", (k, 0, 0, -k, links - x0 * k, grund + unten * k), stellen)
    cx = links + (x1 - x0 + ab + d / 2) * k
    r = d / 2 * k
    cy = grund + unten * k - r + E["ueberhang"] * EM * k
    g = f'<rect width="{flaeche}" height="{flaeche}"' + (f' rx="{ecke}"' if ecke else "") + f' fill="{farbe_grund}"/>\n' if farbe_grund else ""
    innen = g + f'<path fill="{farbe_a}" d="{p.text()}"/>\n<circle cx="{cx:.{stellen}f}" cy="{cy:.{stellen}f}" r="{r:.{stellen}f}" fill="{farbe_punkt}"/>'
    return innen


def klein(s, groesse, xh, grund_y, links_x, stamm_rechts, d, punkt_x0):
    """Handgesetzte Kleinfassung: x-Höhe, Grundlinie und rechte Stammkante liegen auf dem Pixelraster."""
    x0, unten, x1, oben = s.grenzen("a")
    ky = xh / (oben - unten)
    kx = (stamm_rechts - links_x) / (x1 - x0)
    p = s.zeichnen("a", (kx, 0, 0, -ky, links_x - x0 * kx, grund_y + unten * ky), 2)
    return p.text(), punkt_x0 + d / 2, grund_y - d / 2, d / 2


def klein_svg(geo, farbe_a, farbe_punkt, grund=None, ecke=0, groesse=16):
    pfad, cx, cy, r = geo
    g = f'<rect width="{groesse}" height="{groesse}"' + (f' rx="{ecke}"' if ecke else "") + f' fill="{grund}"/>\n' if grund else ""
    return g + f'<path fill="{farbe_a}" d="{pfad}"/>\n<circle cx="{cx:g}" cy="{cy:g}" r="{r:g}" fill="{farbe_punkt}"/>'


def zeile(s, text, groesse, x, grund_y, laufweite, stellen=1):
    """Eine Textzeile als Pfad, groesse in px."""
    k = groesse / EM
    p = Pfad(s.gs, stellen)
    glyphen, _ = s.setzen(text, laufweite)
    for g, gx in glyphen:
        s.zeichnen(g, (k, 0, 0, -k, x + gx * k, grund_y), stift=p)
    return p.text()


def og(s500, s600, z):
    """Open-Graph-Bild 1200 x 630: Schriftzug, Satz der Startseite, sonst nichts."""
    D = FARBEN["dunkel"]
    rand = 80
    k = 52 / (z["hoehe"] / EM) / EM  # Schriftzug: 52 px hoch
    teile = [f'<rect width="1200" height="630" fill="{D["grund"]}"/>']
    teile.append(f'<g transform="translate({rand} 72) scale({k:.6f})"><path fill="#fff" d="{z["angebot"]}"/>'
                 f'<circle cx="{z["cx"]}" cy="{z["cy"]}" r="{z["r"]}" fill="{D["punkt"]}"/><path fill="#fff" d="{z["new"]}"/></g>')
    teile.append(f'<path fill="#fff" d="{zeile(s600, "Ihr Angebot.", 92, rand - 4, 372, -0.035)}"/>')
    teile.append(f'<path fill="#fff" d="{zeile(s600, "Gesagt. Geschrieben.", 92, rand - 4, 476, -0.035)}"/>')
    teile.append(f'<path fill="#c2c8d1" d="{zeile(s500, "Angebote per Sprache, für jede Branche.", 34, rand - 1, 548, -0.015)}"/>')
    return "\n".join(teile)


def main():
    aus = HIER
    s600 = Schnitt(600)
    z = schriftzug(s600)
    k = kurzform(s600)
    for name, f in FARBEN.items():
        innen = (f'<path fill="{f["text"]}" d="{z["angebot"]}"/>\n'
                 f'<circle cx="{z["cx"]}" cy="{z["cy"]}" r="{z["r"]}" fill="{f["punkt"]}"/>\n'
                 f'<path fill="{f["text"]}" d="{z["new"]}"/>')
        open(f"{aus}/schriftzug-{name}.svg", "w").write(svg_datei(f'0 0 {z["breite"]} {z["hoehe"]}', innen))
        innen = (f'<path fill="{f["text"]}" d="{k["a"]}"/>\n'
                 f'<circle cx="{k["cx"]}" cy="{k["cy"]}" r="{k["r"]}" fill="{f["punkt"]}"/>')
        open(f"{aus}/kurzform-{name}.svg", "w").write(svg_datei(f'0 0 {k["breite"]} {k["hoehe"]}', innen, "angebot.new, Kurzform"))
    # Symbol, für große Flächen
    D = FARBEN["dunkel"]
    open(f"{aus}/app-symbol.svg", "w").write(svg_datei("0 0 512 512", symbol(s600, 512, 0.6, D["grund"], D["text"], D["punkt"], ecke=112), "angebot.new, App-Symbol"))
    open(f"{aus}/app-symbol-voll.svg", "w").write(svg_datei("0 0 512 512", symbol(s600, 512, 0.6, D["grund"], D["text"], D["punkt"]), "angebot.new, App-Symbol ohne Ecken"))
    open(f"{aus}/app-symbol-maskierbar.svg", "w").write(svg_datei("0 0 512 512", symbol(s600, 512, 0.5, D["grund"], D["text"], D["punkt"]), "angebot.new, App-Symbol maskierbar"))
    open(f"{aus}/og-bild.svg", "w").write(svg_datei("0 0 1200 630", og(Schnitt(500), s600, z), "angebot.new: Ihr Angebot. Gesagt. Geschrieben.", 1200, 630))
    # Kleinfassungen: Kandidaten über KLEIN, Gewinner stehen als Standard
    for groesse, cfg in KLEIN.items():
        geo = klein(Schnitt(cfg["gewicht"]), groesse, cfg["xh"], cfg["grund"], cfg["links"], cfg["stamm"], cfg["d"], cfg["px"])
        open(f"{aus}/app-symbol-{groesse}.svg", "w").write(svg_datei(f"0 0 {groesse} {groesse}", klein_svg(geo, D["text"], D["punkt"], D["grund"], cfg["ecke"], groesse), "angebot.new, App-Symbol", groesse, groesse))
        for name, f in FARBEN.items():
            open(f"{aus}/kurzform-{groesse}-{name}.svg", "w").write(svg_datei(f"0 0 {groesse} {groesse}", klein_svg(geo, f["text"], f["punkt"], None, 0, groesse), "angebot.new, Kurzform", groesse, groesse))
    print(json.dumps({k_: z[k_] for k_ in ("breite", "hoehe", "cx", "cy", "r", "hoehe_em", "unten_em")}), len(z["angebot"]) + len(z["new"]))


if __name__ == "__main__":
    main()
