"""Funnel /studios-raten: Tastatur-, Übergabe- und axe-Prüfung (Schilling-Konzept 13 §14), 18.11.2026.

Aufruf (im Ordner tattoofin/website, Vorschau-Server auf public/ läuft):
  pw-python _schilling/studios-raten/messung/funnel/tastatur-390.py [url] [--motor webkit|chromium]

Handy 390 x 844 mit Touch. Tastatur nachgestellt: sichtbare Fläche 390 x 420 (A: oben bündig, B: iOS schiebt nach oben),
D: echtes Verkleinern des Fensters auf 390 x 420. Je Textfeld: Feld, Aktionsknopf und Pflichtzeile ganz in der Fläche,
Funnel endet an der Fläche, Seite dahinter bewegt sich nicht, kein waagrechtes Scrollen. Dazu axe in jedem Schritt,
Desktop-Overlay 1440 x 900 und die Übergabe an /start (Vorbelegung per sessionStorage, keine Personendaten in der Adresse).
Es wird nichts abgeschickt: /start wird nur geöffnet, der Knopf dort nicht gedrückt. Exit-Code 0 nur ohne Nein.
"""
import argparse, json, pathlib, sys, datetime
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

HIER = pathlib.Path(__file__).resolve().parent
AXE = pathlib.Path("/Users/domi/Marketing-Maschine/node_modules/axe-core/axe.min.js")
ERSATZ_VV = """(() => {
  const t = new EventTarget();
  const vv = { width: innerWidth, height: innerHeight, offsetTop: 0, offsetLeft: 0, pageTop: 0, pageLeft: 0, scale: 1,
    addEventListener: (...a) => t.addEventListener(...a), removeEventListener: (...a) => t.removeEventListener(...a) };
  Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true });
  window.__kb = (h, top) => { vv.height = h; vv.offsetTop = top || 0; vv.width = innerWidth;
    t.dispatchEvent(new Event('resize')); t.dispatchEvent(new Event('scroll')); };
})()"""
TEST = {"firma": "Teststudio Beispiel", "inhaber": "Max Beispiel", "email": "test@example.com", "telefon": "0151 00000000"}
W, H, F = 390, 844, 420


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("url", nargs="?", default="http://localhost:4791/studios-raten.html")
    ap.add_argument("--motor", default="webkit", choices=["webkit", "chromium"])
    a = ap.parse_args()
    zeilen, fehler = [], 0

    def ok(name, bed, info=""):
        nonlocal fehler
        if not bed:
            fehler += 1
        zeilen.append(f"{'OK  ' if bed else 'NEIN'} {name}" + (f"  ({info})" if info and not bed else ""))

    def rect(pg, js):
        return pg.evaluate(f"(() => {{ const e = {js}; if (!e) return null; const r = e.getBoundingClientRect(); return {{ t: r.top, b: r.bottom, l: r.left, r: r.right }}; }})()")

    def axe(pg, wo):
        pg.add_script_tag(path=str(AXE))
        v = pg.evaluate("""async () => { const r = await axe.run(document.querySelector('[data-funnel]'), { resultTypes: ['violations'] });
            return r.violations.map(x => x.id + ': ' + x.nodes.map(n => n.target.join(' ')).join(', ')); }""")
        ok(f"axe {wo}: 0 Verstöße", not v, "; ".join(v))

    with sync_playwright() as p:
        br = getattr(p, a.motor).launch()
        ctx = br.new_context(viewport={"width": W, "height": H}, device_scale_factor=2, is_mobile=True, has_touch=True)
        ctx.add_init_script("try{localStorage.setItem('tf_consent','nein')}catch(e){}")  # Banner zu, Messung ohne Banner-Fläche
        pg = ctx.new_page()
        pg.add_init_script(ERSATZ_VV)
        pg.goto(a.url, wait_until="load")
        pg.wait_for_timeout(400)
        pg.evaluate("scrollTo({ top: 0, behavior: 'instant' })")
        # Playwright scrollt den Knopf vor dem Klick evtl. ein Stück ins Bild: maßgeblich ist die Position im Moment des Tipps
        pg.evaluate("addEventListener('click', () => { window.__yKlick = scrollY; }, { capture: true, once: true })")
        pg.locator("[data-funnel-oeffnen]").first.click()
        pg.wait_for_timeout(250)
        y0 = pg.evaluate("window.__yKlick")
        ok("Funnel offen (dialog, modal)", pg.evaluate("document.querySelector('[data-funnel]').open && document.querySelector('[data-funnel]').matches(':modal')"))
        ok("Fortschritt als Text", pg.inner_text(".fn-stand").strip() == "Schritt 1 von 5", pg.inner_text(".fn-stand"))
        ok("Schritt-Überschrift klein im Kopf", " ".join(pg.inner_text("[data-funnel-kopf-titel]").split()).lower() == " ".join(pg.text_content("[data-funnel-schritt='1'] h2").split()).lower(), pg.inner_text("[data-funnel-kopf-titel]"))
        ok("Zurück im Schritt 1 verborgen", pg.locator("[data-funnel-zurueck]").is_hidden())
        ok("Kein Textfeld in Schritt 1", pg.locator("[data-funnel-schritt]:not([hidden]) input").count() == 0)
        ok("Fokus im Funnel", pg.evaluate("document.querySelector('[data-funnel]').contains(document.activeElement)"))
        axe(pg, "Schritt 1")
        pg.screenshot(path=str(HIER / f"{a.motor}-390-schritt-1.png"))
        pg.locator("[data-funnel-schritt]:not([hidden]) [data-funnel-antwort]").first.click(); pg.wait_for_timeout(350)
        ok("Schritt 2 nach Antippen", pg.inner_text(".fn-stand").strip() == "Schritt 2 von 5")
        axe(pg, "Schritt 2")
        pg.screenshot(path=str(HIER / f"{a.motor}-390-schritt-2.png"))
        pg.locator("[data-funnel-schritt]:not([hidden]) [data-funnel-antwort]").first.click(); pg.wait_for_timeout(350)
        ok("Schritt 3 nach Antippen, erstes Feld fokussiert", pg.evaluate("document.activeElement && document.activeElement.id") == "fn-firma",
           str(pg.evaluate("document.activeElement && document.activeElement.id")))
        ok("Merkzettel passt zur Antwort", "Bargeld" in pg.inner_text("[data-funnel-merk-text]") and "Raten*" in pg.inner_text("[data-funnel-merk-text]"),
           pg.inner_text("[data-funnel-merk-text]"))
        ok("Tastatur offen: Merkzettel eingeklappt", pg.evaluate("(() => { __kb(420, 0); return new Promise(r => setTimeout(() => r(getComputedStyle(document.querySelector('[data-funnel-merk]')).display === 'none'), 120)); })()"))
        pg.evaluate(f"__kb({H}, 0)"); pg.wait_for_timeout(100)
        axe(pg, "Schritt 3")

        def tastatur(schritt):
            felder = pg.locator("[data-funnel-schritt]:not([hidden]) input")
            for i in range(felder.count()):
                f = felder.nth(i); fid = f.get_attribute("id")
                ok(f"{fid}: Schrift >= 16 px", float(f.evaluate("e => parseFloat(getComputedStyle(e).fontSize)")) >= 16)
                ok(f"{fid}: autocomplete", (f.get_attribute("autocomplete") or "off") not in ("", "off"))
                ok(f"{fid}: Label", f.evaluate("e => e.labels.length > 0"))
                f.focus(); pg.wait_for_timeout(60)
                for fall, top in (("A", 0), ("B", H - F)):
                    pg.evaluate(f"__kb({F}, {top})"); pg.wait_for_timeout(150)
                    oben, unten = top, top + F
                    d = rect(pg, "document.querySelector('[data-funnel]')")
                    fe = rect(pg, "document.activeElement")
                    kn = rect(pg, "document.querySelector('[data-funnel-schritt]:not([hidden]) [data-funnel-aktion]')")
                    rein = lambda q: q and q["t"] >= oben - .5 and q["b"] <= unten + .5
                    ok(f"{fid} Fall {fall}: Funnel endet an der sichtbaren Fläche", abs(d["t"] - oben) <= 1 and abs(d["b"] - unten) <= 1, str(d))
                    ok(f"{fid} Fall {fall}: aktives Feld sichtbar", rein(fe), str(fe))
                    ok(f"{fid} Fall {fall}: Weiter-Knopf sichtbar", rein(kn), str(kn))
                    for j, q in enumerate(pg.evaluate("""[...document.querySelectorAll('[data-funnel-schritt]:not([hidden]) [data-funnel-pflicht]')]
                        .map(e => { const r = e.getBoundingClientRect(); return { t: r.top, b: r.bottom }; })""")):
                        ok(f"{fid} Fall {fall}: Pflichtzeile {j + 1} sichtbar", rein(q), str(q))
                    ok(f"{fid} Fall {fall}: Seite dahinter unbewegt", pg.evaluate("scrollY") == 0 and pg.evaluate(
                        "getComputedStyle(document.body).position") == "fixed" and pg.evaluate("parseFloat(getComputedStyle(document.body).top)") == -y0)
                    ok(f"{fid} Fall {fall}: kein waagrechtes Scrollen", pg.evaluate(
                        "(() => { const i = document.querySelector('.fn-inhalt'); return i.scrollWidth <= i.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1; })()"))
                    pg.screenshot(path=str(HIER / f"{a.motor}-390x420-{fid}-fall-{fall}.png"))
                # D: echtes Verkleinern des Fensters (alte WebViews, resizes-content)
                pg.set_viewport_size({"width": W, "height": F}); pg.evaluate(f"__kb({F}, 0)"); pg.wait_for_timeout(200)
                kn = rect(pg, "document.querySelector('[data-funnel-schritt]:not([hidden]) [data-funnel-aktion]')")
                fe = rect(pg, "document.activeElement")
                ok(f"{fid} Fall D Fenster {W}x{F}: Feld und Knopf sichtbar", fe["t"] >= 0 and fe["b"] <= F + .5 and kn["t"] >= 0 and kn["b"] <= F + .5, f"{fe} {kn}")
                pg.screenshot(path=str(HIER / f"{a.motor}-390x420-{fid}-fall-D.png"))
                pg.set_viewport_size({"width": W, "height": H}); pg.evaluate(f"__kb({H}, 0)"); pg.wait_for_timeout(150)
                f.fill(TEST[f.get_attribute("name")])
            # C: Tastatur zu
            pg.evaluate("document.activeElement.blur()"); pg.evaluate(f"__kb({H}, 0)"); pg.wait_for_timeout(450)
            d = rect(pg, "document.querySelector('[data-funnel]')")
            ok(f"Schritt {schritt} Fall C: Tastatur zu, Funnel wieder voll", abs(d["t"]) <= 1 and abs(d["b"] - H) <= 1, str(d))

        tastatur(3)
        # Leeres Feld: Fehler am Feld, kein Weiter
        pg.fill("#fn-inhaber", ""); pg.click("[data-funnel-schritt='3'] [data-funnel-weiter]"); pg.wait_for_timeout(150)
        ok("Leeres Feld: Fehler am Feld, Schritt bleibt", pg.inner_text(".fn-stand").strip() == "Schritt 3 von 5" and pg.is_visible("#fn-inhaber-f")
           and pg.get_attribute("#fn-inhaber", "aria-invalid") == "true" and pg.evaluate("document.activeElement.id") == "fn-inhaber")
        pg.fill("#fn-inhaber", TEST["inhaber"])
        pg.click("[data-funnel-schritt='3'] [data-funnel-weiter]"); pg.wait_for_timeout(250)
        ok("Schritt 4, E-Mail fokussiert", pg.inner_text(".fn-stand").strip() == "Schritt 4 von 5" and pg.evaluate("document.activeElement.id") == "fn-email")
        ok("Schritt 4: Balken nicht voll (4/5)", abs(pg.evaluate("document.querySelector('.fn-balken i').getBoundingClientRect().width / document.querySelector('.fn-balken').clientWidth") - 0.8) < 0.03)
        ok("Schritt 4: Ausblick auf Schritt 5 in einer Zeile", "Schritt 5" in pg.inner_text("[data-funnel-schritt='4'] .fn-danach") and pg.evaluate(
            "(() => { const e = document.querySelector('[data-funnel-schritt=\"4\"] .fn-danach'); return e.getClientRects().length === 1 && e.getBoundingClientRect().height < parseFloat(getComputedStyle(e).lineHeight) * 1.5; })()"))
        ok("Schritt 4: Knopf führt zu Schritt 5", "schritt 5" in pg.text_content("[data-funnel-schritt='4'] [type=submit]").lower())
        axe(pg, "Schritt 4")
        pg.screenshot(path=str(HIER / f"{a.motor}-390-schritt-4.png"))
        tastatur(4)
        # Zurück (Browser/Handy) = ein Schritt, Antworten bleiben
        pg.go_back(); pg.wait_for_timeout(300)
        ok("Handy-Zurück: ein Schritt zurück, Funnel offen, Angaben bleiben", pg.inner_text(".fn-stand").strip() == "Schritt 3 von 5"
           and pg.evaluate("document.querySelector('[data-funnel]').open") and pg.input_value("#fn-firma") == TEST["firma"])
        # Fokusfalle
        raus = 0
        for _ in range(16):
            pg.keyboard.press("Tab")
            raus += pg.evaluate("(() => { const x = document.activeElement; return x && x !== document.body && !document.querySelector('[data-funnel]').contains(x); })()")
        ok("Tab bleibt im Funnel", raus == 0, f"{raus}x draußen")
        # Esc schließt, Fokus zurück, Seite wie vorher
        pg.keyboard.press("Escape"); pg.wait_for_timeout(350)
        ok("Esc schließt", not pg.evaluate("document.querySelector('[data-funnel]').open"))
        ok("Fokus zurück auf den Hero-Knopf", pg.evaluate("document.activeElement.matches('[data-funnel-oeffnen][data-ort=held]')"))
        ok("Scrollposition wie vor dem Öffnen, Sperre weg", pg.evaluate("scrollY") == y0 and pg.evaluate("getComputedStyle(document.body).position") != "fixed")
        # Wieder öffnen: setzt beim letzten Schritt fort
        pg.locator("[data-funnel-oeffnen]").first.click(); pg.wait_for_timeout(250)
        ok("Wieder öffnen: letzter Schritt, Angaben noch da", pg.inner_text(".fn-stand").strip() == "Schritt 3 von 5" and pg.input_value("#fn-inhaber") == TEST["inhaber"])
        pg.click("[data-funnel-schritt='3'] [data-funnel-weiter]"); pg.wait_for_timeout(250)
        # Übergabe an /start
        with pg.expect_navigation():
            pg.click("[data-funnel-schritt='4'] [type=submit]")
        pg.wait_for_load_state("load"); pg.wait_for_timeout(500)
        u = urlparse(pg.url); qs = parse_qs(u.query)
        ok("Übergabe auf /start", u.path == "/start.html", pg.url)
        ok("Keine Personendaten in der Adresse", not any(v.lower() in pg.url.lower().replace("%20", " ").replace("+", " ") for v in TEST.values()) and "@" not in pg.url, pg.url)
        ok("Herkunft bleibt (utm_content=held)", qs.get("utm_content") == ["held"], pg.url)
        werte = {k: pg.input_value(f"#{k}") for k in TEST}
        ok("/start: 4 Angaben vorbelegt", werte == TEST, json.dumps(werte, ensure_ascii=False))
        ok("/start: Häkchen nicht vorausgewählt", not pg.is_checked("#ak_alle"))
        ok("/start: Hinweis „nur noch das Häkchen“ sichtbar", pg.is_visible("#ak-hinweis") and "Häkchen" in pg.inner_text("#ak-hinweis"), pg.inner_text("#ak-hinweis"))
        ok("/start: Merker schilling-funnel gelöscht", pg.evaluate("sessionStorage.getItem('schilling-funnel')") is None)
        pg.screenshot(path=str(HIER / f"{a.motor}-390-start-vorbelegt.png"), full_page=False)
        ctx.close()

        # Desktop: zentriertes Overlay
        ctx = br.new_context(viewport={"width": 1440, "height": 900})
        ctx.add_init_script("try{localStorage.setItem('tf_consent','nein')}catch(e){}")
        pg = ctx.new_page(); pg.goto(a.url, wait_until="load"); pg.wait_for_timeout(300)
        pg.locator("[data-funnel-oeffnen][data-ort=preis]").scroll_into_view_if_needed(); pg.wait_for_timeout(200)
        pg.locator("[data-funnel-oeffnen][data-ort=preis]").click(); pg.wait_for_timeout(300)
        d = rect(pg, "document.querySelector('[data-funnel]')")
        ok("Desktop: Overlay zentriert, höchstens 560 px breit", d and d["r"] - d["l"] <= 561 and abs((d["l"] + d["r"]) / 2 - 720) <= 2, str(d))
        axe(pg, "Desktop Schritt 1")
        pg.screenshot(path=str(HIER / f"{a.motor}-1440-overlay.png"))
        br.close()

    kopf = f"# Funnel /studios-raten, {a.motor}, {datetime.date.today()}, {a.url} (Handy {W}x{H}, Tastatur-Fläche {W}x{F})"
    text = "\n".join([kopf, ""] + zeilen + ["", f"{fehler} Nein. Grenze: Ersatz-Tastatur; echte iOS-Tastatur siehe Simulator-Bilder."])
    (HIER / f"protokoll-{a.motor}.md").write_text(text, encoding="utf-8")
    print("\n".join(z for z in zeilen if z.startswith("NEIN")) or "alle Prüfungen bestanden")
    print(f"{len(zeilen) - fehler}/{len(zeilen)} bestanden")
    sys.exit(1 if fehler else 0)


if __name__ == "__main__":
    main()
