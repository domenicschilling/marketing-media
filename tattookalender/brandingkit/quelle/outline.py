import json, os, sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
F = os.path.expanduser("~/Downloads/Tattookalender-Brandingkit/Farben-Schriften/Schriften")
m = json.load(open("measure.json"))
def inst(path, loc):
    f = TTFont(path); return instantiateVariableFont(f, loc)
bri = inst(f"{F}/Bricolage-Grotesque/BricolageGrotesque[opsz,wdth,wght].ttf", {"wght": 800, "opsz": 76, "wdth": 100})
inter = inst(f"{F}/Inter/Inter[opsz,wght].ttf", {"wght": 600, "opsz": 15})
def run(font, chars, size, base, upper=False):
    gs = font.getGlyphSet(); cmap = font.getBestCmap(); upm = font["head"].unitsPerEm; s = size / upm
    out = []; bb = [1e9, 1e9, -1e9, -1e9]
    for ch in chars:
        c = ch["c"].upper() if upper else ch["c"]
        if c == " ": continue
        g = cmap[ord(c)]
        pen = SVGPathPen(gs, ntos=lambda v: ("%.2f" % v).rstrip("0").rstrip("."))
        t = (s, 0, 0, -s, ch["x"], base)
        gs[g].draw(TransformPen(pen, t))
        bp = BoundsPen(gs); gs[g].draw(TransformPen(bp, t))
        if bp.bounds:
            x0, y0, x1, y1 = bp.bounds; bb = [min(bb[0], x0), min(bb[1], y0), max(bb[2], x1), max(bb[3], y1)]
        out.append(pen.getCommands())
    return " ".join(out), bb
wc = m["wordChars"]
t_d, t_b = run(bri, wc[:6], 76, m["wordBase"])
k_d, k_b = run(bri, wc[6:], 76, m["wordBase"])
s_d, s_b = run(inter, m["subChars"], 15, m["subBase"], upper=True)
json.dump({"tattoo": t_d, "kalender": k_d, "sub": s_d, "tb": t_b, "kb": k_b, "sb": s_b, "kspan": m["k"]}, open("paths.json", "w"))
print(t_b, k_b, s_b)
