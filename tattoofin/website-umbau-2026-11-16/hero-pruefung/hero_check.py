import sys, json
from playwright.sync_api import sync_playwright
URL = sys.argv[1]
GERAETE = [  # name, browser, viewport (sichtbare Fläche), mobile
 ("Mini 320x568",    "webkit",   320, 460, True),
 ("Quer 844x390",    "webkit",   844, 340, True),
 ("Quer 568x320",    "webkit",   568, 270, True),
 ("iPhone SE",        "webkit",   375, 548, True),   # 375x667 abzgl. Safari-Leisten
 ("iPhone 13/14",     "webkit",   390, 664, True),   # 390x844 abzgl. Safari-Leisten
 ("iPhone Pro Max",   "webkit",   430, 739, True),
 ("Android 412",      "chromium", 412, 839, True),
 ("iPad 768",         "webkit",   768, 954, True),
 ("iPad Pro 1024",    "webkit",  1024,1292, True),
 ("Laptop 1280x720",  "chromium",1280, 720, False),
 ("Laptop 1366x768",  "chromium",1366, 768, False),
 ("Desktop 1440x900", "chromium",1440, 900, False),
 ("Desktop 1920",     "chromium",1920,1080, False),
]
JS = """() => {
 const h = document.querySelector('section.auftakt') || document.querySelector('main section');
 const r = h.getBoundingClientRect();
 const vh = innerHeight;
 const secs=[...document.querySelectorAll('section')]; const next = secs[secs.indexOf(h)+1];
 const nh = next ? [...next.querySelectorAll('h2,h3,p,li,img,svg')].map(e=>e.getBoundingClientRect().top).filter(x=>x>0) : [];
 const nr = nh.length ? Math.min(...nh) : null;
 const cta = h.querySelector('.auftakt-knopf .knopf') || [...h.querySelectorAll('a,button')].find(e => /studio anmelden/i.test(e.textContent));
 const cr = cta ? cta.getBoundingClientRect() : null;
 const preis = [...h.querySelectorAll('p,div,span')].filter(e=>/49,90/.test(e.textContent) && e.children.length<4).pop();
 const pr = preis ? preis.getBoundingClientRect() : null;
 const h1 = h.querySelector('h1').getBoundingClientRect();
 const cc=document.querySelector('.tf-cc'); const ccr = cc ? cc.getBoundingClientRect() : null;
 const ueber=(a,b)=>a&&b&&!(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top);
 const leiste=[...document.querySelectorAll('body *')].find(e=>{const s=getComputedStyle(e);return s.position==='fixed'&&/anmelden/i.test(e.textContent)&&e.getBoundingClientRect().height>0&&s.visibility!=='hidden'&&s.opacity!=='0'&&!e.classList.contains('tf-cc')&&e.getBoundingClientRect().top<innerHeight});
 return {verdeckt: ueber(ccr,cr)||ueber(ccr,pr), cookie: !!cc, leiste: !!leiste, vh, heroUnten: Math.round(r.bottom), nextTop: nr && Math.round(nr), ctaUnten: cr && Math.round(cr.bottom), preisUnten: pr && Math.round(pr.bottom), h1Oben: Math.round(h1.top), querscroll: document.documentElement.scrollWidth > innerWidth};
}"""
with sync_playwright() as p:
  for name, br, w, hgt, mob in GERAETE:
    b = getattr(p, br).launch()
    kw = dict(viewport={"width": w, "height": hgt})
    if mob and br == "chromium": kw.update(is_mobile=True, has_touch=True, device_scale_factor=2)
    if mob and br == "webkit": kw.update(is_mobile=True, has_touch=True, device_scale_factor=2)
    pg = b.new_context(**kw).new_page()
    pg.goto(URL, wait_until="networkidle"); pg.wait_for_timeout(1500)
    m = pg.evaluate(JS)
    ok = m["heroUnten"] >= m["vh"] - 8 and (m["nextTop"] is None or m["nextTop"] >= m["vh"]) and m["ctaUnten"] and m["ctaUnten"] <= m["vh"] and m["preisUnten"] and m["preisUnten"] <= m["vh"] and not m["querscroll"] and not m["verdeckt"] and not m["leiste"]
    print(f"{'OK  ' if ok else 'FAIL'} {name:18} {w}x{hgt}  heroUnten={m['heroUnten']} vh={m['vh']} cta={m['ctaUnten']} preis={m['preisUnten']} next={m['nextTop']} cookie={m['cookie']} verdeckt={m['verdeckt']} leiste={m['leiste']}")
    pg.screenshot(path=f"{sys.argv[2]}/hero-{name.replace(' ','_').replace('/','-')}.png")
    b.close()
