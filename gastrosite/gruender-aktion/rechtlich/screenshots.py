# Screenshots Banner, Preis und Bestellformular der gepatchten GastroSite (lokaler Build, /api gemockt).
# Aufruf: pw-python screenshots.py <dist-Ordner> <Ziel-Ordner> <frei>
import functools, http.server, json, os, sys, threading
from playwright.sync_api import sync_playwright

dist, ziel, frei = sys.argv[1], sys.argv[2], int(sys.argv[3])

class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def send_head(self):
        p = self.translate_path(self.path)
        if not os.path.exists(p):
            self.path = "/index.html"
        return super().send_head()

srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(H, directory=dist))
threading.Thread(target=srv.serve_forever, daemon=True).start()
base = f"http://127.0.0.1:{srv.server_port}"
aktion = {"key": "aktion_gruender50", "preis": 249, "statt": 499, "plaetze": 10, "vergeben": 10 - frei, "frei": frei}
leads = []

with sync_playwright() as p:
    b = p.chromium.launch()
    for name, vp in [("handy", {"width": 390, "height": 844}), ("desktop", {"width": 1280, "height": 900})]:
        pg = b.new_page(viewport=vp)
        pg.route("**/api/aktion", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps(aktion)))
        pg.route("**/api/leads", lambda r: (leads.append(r.request.post_data_json), r.fulfill(status=200, content_type="application/json", body='{"lead_id":"x"}')))
        pg.goto(base + "/", wait_until="networkidle")
        pg.wait_for_selector('[data-testid="aktion-banner"]')
        pg.screenshot(path=f"{ziel}/1-banner-startseite-{name}.png")
        pg.locator('[data-testid="price-amount"]').scroll_into_view_if_needed()
        pg.wait_for_timeout(1500)
        pg.locator('[data-testid="price-amount"]').screenshot(path=f"{ziel}/_tmp.png")
        pg.locator('[data-testid="price-b2b"]').locator("xpath=..").screenshot(path=f"{ziel}/2-preisbereich-{name}.png")
        if name == "handy":
            pg.click('[data-testid="pricing-order"]')
            for feld, wert in [("business_name", "Pizzeria Test"), ("contact_name", "Max Test"), ("email", "max@example.com"), ("phone", "0951 123456")]:
                pg.fill(f'[data-testid="funnel-input-{feld}"]', wert)
            pg.click('[data-testid="funnel-next"]')
            pg.wait_for_selector('[data-testid="funnel-b2b"]')
            pg.locator('[data-testid="funnel-b2b"]').scroll_into_view_if_needed()
            pg.wait_for_timeout(600)
            pg.screenshot(path=f"{ziel}/3-formular-ohne-haken-{name}.png")
            gesperrt = pg.locator('[data-testid="funnel-submit"]').is_disabled()
            pg.check('[data-testid="funnel-consent"]')
            nur_agb = pg.locator('[data-testid="funnel-submit"]').is_disabled()
            pg.check('[data-testid="funnel-b2b"]')
            beide = pg.locator('[data-testid="funnel-submit"]').is_disabled()
            pg.wait_for_timeout(600)
            pg.screenshot(path=f"{ziel}/4-formular-mit-haken-{name}.png")
            print(f"Absenden gesperrt: ohne Haken={gesperrt}, nur AGB={nur_agb}, beide Haken={beide}")
            pg.click('[data-testid="funnel-submit"]')
            pg.wait_for_timeout(800)
            print("gesendet b2b_confirmed =", leads[-1].get("b2b_confirmed") if leads else "nichts gesendet")
        pg.close()
    b.close()
os.remove(f"{ziel}/_tmp.png")
srv.shutdown()
