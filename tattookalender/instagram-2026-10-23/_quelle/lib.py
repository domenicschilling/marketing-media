# Gemeinsame Bausteine für die Tattookalender-Instagram-Beiträge
import os, html as _h

ROOT = os.path.dirname(os.path.abspath(__file__))
HTML = os.path.join(ROOT, "html")
os.makedirs(HTML, exist_ok=True)

SIZES = {
    "site/heute.jpg": (1600, 951), "site/anfragen.jpg": (1600, 951), "site/kalender-woche.jpg": (1600, 951),
    "site/kalender-tag.jpg": (1600, 951), "site/kunden.jpg": (1600, 951), "site/zahlungen.jpg": (1600, 951),
    "site/chat.jpg": (1600, 872), "site/anzahlung.png": (780, 1688), "site/einwilligung.png": (780, 1688),
    "demo/demo-kalender.jpg": (780, 1688), "demo/demo-chat.jpg": (780, 1688), "demo/demo-erinnerung.jpg": (780, 1688),
    "demo/demo-auswertung.jpg": (780, 1688), "demo/demo-desktop-chat.jpg": (1800, 1070),
    "demo/demo-desktop-kalender.jpg": (1800, 1070),
}

CSS = """
@font-face{font-family:'Bricolage Grotesque';font-weight:800;src:url('../assets/fonts/BricolageGrotesque-ExtraBold.ttf');}
@font-face{font-family:'Bricolage Grotesque';font-weight:600;src:url('../assets/fonts/BricolageGrotesque-SemiBold.ttf');}
@font-face{font-family:Inter;font-weight:400;src:url('../assets/fonts/Inter-Regular.ttf');}
@font-face{font-family:Inter;font-weight:500;src:url('../assets/fonts/Inter-Medium.ttf');}
@font-face{font-family:Inter;font-weight:600;src:url('../assets/fonts/Inter-SemiBold.ttf');}
:root{--nacht:#0B0B0D;--tinte:#141311;--blatt:#1C1A16;--linie:#2C2822;--elfen:#F4F1EA;--stein:#A7A39A;--schiefer:#6B675F;
--champ:#F3D891;--gold:#C9A24F;--altgold:#B88A2C;--bronze:#8A6418;--gruen:#6FCF8E;--rot:#EF6F6F;}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1350px;overflow:hidden}
body{position:relative;background:var(--nacht);color:var(--elfen);font-family:Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.glow{position:absolute;inset:0;background:radial-gradient(900px 700px at 22% -4%,rgba(217,180,104,.24),rgba(217,180,104,.05) 55%,rgba(217,180,104,0) 80%)}
.glow2{position:absolute;inset:0;background:radial-gradient(800px 600px at 90% 105%,rgba(217,180,104,.16),rgba(217,180,104,0) 70%)}
.light{background:var(--elfen);color:var(--nacht)}
.light .glow{background:radial-gradient(900px 700px at 22% -4%,rgba(184,138,44,.16),rgba(184,138,44,0) 70%)}
.logo{position:absolute;left:84px;top:78px;height:46px}
.pg{position:absolute;right:84px;top:88px;font-weight:500;font-size:22px;letter-spacing:.06em;color:var(--stein)}
.light .pg{color:var(--schiefer)}
.foot{position:absolute;left:84px;right:84px;bottom:70px;display:flex;justify-content:space-between;align-items:center;font-size:22px;font-weight:500;color:var(--stein);letter-spacing:.02em}
.light .foot{color:var(--schiefer)}
.foot .sw{color:var(--gold);font-weight:600}
.light .foot .sw{color:var(--bronze)}
.kick{font-weight:600;font-size:22px;letter-spacing:.2em;text-transform:uppercase;color:var(--gold)}
.light .kick{color:var(--bronze)}
h1,h2,h3{font-family:'Bricolage Grotesque',Inter,sans-serif;font-weight:800;letter-spacing:-.02em;line-height:1.03}
h1{font-size:112px}
h2{font-size:84px}
h3{font-size:52px;letter-spacing:-.015em;line-height:1.08}
.g{color:var(--gold)}
.light .g{color:var(--bronze)}
p.t{font-size:36px;line-height:1.38;color:var(--stein);font-weight:400}
.light p.t{color:#4A463F}
p.s{font-size:32px;line-height:1.42;color:var(--stein)}
.light p.s{color:#4A463F}
.abs{position:absolute}
.card{background:var(--tinte);border:1.5px solid var(--linie);border-radius:30px}
.light .card{background:#fff;border-color:#DDD7C8}
.hair{height:2px;background:linear-gradient(90deg,var(--gold),rgba(201,162,79,0))}
.shot{position:relative;overflow:hidden;border:1.5px solid #3A342B;background:var(--tinte);box-shadow:0 40px 90px rgba(0,0,0,.55),0 0 0 1px rgba(201,162,79,.10)}
.shot img{position:absolute;display:block;max-width:none}
.cap{font-size:22px;color:var(--stein);letter-spacing:.03em;font-weight:500}
.num{font-family:'Bricolage Grotesque',Inter,sans-serif;font-weight:800;color:var(--gold);letter-spacing:-.04em}
.light .num{color:var(--bronze)}
.chip{display:inline-block;padding:10px 22px;border-radius:999px;border:1.5px solid var(--linie);font-size:22px;font-weight:500;color:var(--stein)}
.chk{display:flex;gap:22px;align-items:flex-start;font-size:32px;line-height:1.3;font-weight:500}
.chk i{flex:none;width:38px;height:38px;border-radius:50%;background:linear-gradient(180deg,var(--champ),var(--gold));display:flex;align-items:center;justify-content:center;margin-top:2px}
.chk i:after{content:'';width:10px;height:18px;border:solid #0B0B0D;border-width:0 4px 4px 0;transform:rotate(45deg) translate(-1px,-2px)}
"""

def esc(s):
    return s

def shot(src, x, y, w, h, outw, radius=26, left=None, top=None, extra="", flow=False):
    """Ausschnitt (x,y,w,h in Originalpixeln) als Karte der Breite outw."""
    nw, nh = SIZES[src]
    sc = outw / w
    outh = round(h * sc)
    pos = ""
    if left is not None: pos += f"left:{left}px;"
    if top is not None: pos += f"top:{top}px;"
    cls = "shot" if flow else "shot abs"
    return (f'<div class="{cls}" style="{pos}width:{outw}px;height:{outh}px;border-radius:{radius}px;{extra}">'
            f'<img src="../assets/{src}" style="width:{round(nw*sc)}px;left:{round(-x*sc)}px;top:{round(-y*sc)}px"></div>'), outh

def phone(src, x, y, w, h, outw, left, top, radius=58):
    """Handy-Rahmen mit Ausschnitt."""
    nw, nh = SIZES[src]
    bez = 11
    inner = outw - 2 * bez
    sc = inner / w
    ih = round(h * sc)
    return (f'<div class="abs" style="left:{left}px;top:{top}px;width:{outw}px;height:{ih+2*bez}px;border-radius:{radius}px;'
            f'background:#17150f;border:2px solid #3b3427;box-shadow:0 50px 100px rgba(0,0,0,.6),0 0 0 1px rgba(201,162,79,.18),inset 0 0 0 1px rgba(255,255,255,.04);">'
            f'<div style="position:absolute;left:{bez}px;top:{bez}px;width:{inner}px;height:{ih}px;border-radius:{radius-bez}px;overflow:hidden;background:#0b0b0b">'
            f'<img src="../assets/{src}" style="position:absolute;display:block;max-width:none;width:{round(nw*sc)}px;left:{round(-x*sc)}px;top:{round(-y*sc)}px"></div></div>'), ih + 2 * bez

def page(name, body, idx=None, total=None, light=False, last=False, foot=True, logo=True, swipe=True):
    cls = "light" if light else ""
    lg = "tattookalender-logo-quer-kompakt-hell.png" if light else "tattookalender-logo-quer-kompakt-dunkel.png"
    pg = f'<div class="pg">{idx} / {total}</div>' if idx else ""
    lo = f'<img class="logo" src="../assets/logo/{lg}">' if logo else ""
    ft = ""
    if foot:
        right = '<span class="sw">Wischen &rarr;</span>' if (total and not last and swipe) else ""
        ft = f'<div class="foot"><span>tattookalender.de</span>{right}</div>'
    doc = f'<!doctype html><html lang="de"><head><meta charset="utf-8"><style>{CSS}</style></head><body class="{cls}"><div class="glow"></div>{lo}{pg}{body}{ft}</body></html>'
    path = os.path.join(HTML, name + ".html")
    open(path, "w", encoding="utf-8").write(doc)
    return path


def col(inner, top=200, bottom=150, justify="center", left=84, width=912, extra=""):
    return (f'<div class="abs" style="left:{left}px;top:{top}px;width:{width}px;bottom:{bottom}px;display:flex;flex-direction:column;'
            f'justify-content:{justify};{extra}">{inner}</div>')

def kick(t, mb=26): return f'<div class="kick" style="margin-bottom:{mb}px">{t}</div>'
def cap(t, mt=22): return f'<div class="cap" style="margin-top:{mt}px;line-height:1.4">{t}</div>'
def sym(op=.07, size=640, right=-200, bottom=-170):
    return f'<img class="abs" src="../assets/logo/tattookalender-symbol-gold.png" style="width:{size}px;right:{right}px;bottom:{bottom}px;opacity:{op}">'
