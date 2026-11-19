"""Hero-Messung nach dem Schilling-Konzept (Kapitel 04, Abschnitt 8).

Aufruf:
  pw-python hero-messung.py <url> [--out ordner] [--consent-key name=wert]
      [--extra 390x600,375x560] [--ganze-seite] [--commit abc123] [--warte 1200]
  pw-python hero-messung.py <fremde-url> --nur-fotos --out vorbild   (Vorbilder nur fotografieren)

Markierungen im HTML (einmal setzen, dann misst das Skript jede Fassung gleich):
  data-hero                    der Hero-Container
  data-hero-pflicht            muss ohne Banner vollständig sichtbar sein
  data-hero-pflicht="immer"    muss auch mit eingeblendetem Banner sichtbar sein
                               (Überschrift, Knopf, Mikrozeile)
  data-zaehlt-nicht            nicht ins Wortbudget (Logo, Scroll-Hinweis bis 4 Wörter)
  data-consent                 das Consent-Banner
"""
import argparse, json, re, sys, datetime, pathlib
from playwright.sync_api import sync_playwright

GERAETE = [
    # Nr, Name, Breite, Höhe, mobil, Pixeldichte
    ("1", "iPhone SE", 375, 667, True, 2),
    ("2a", "iPhone 13/14 (Layout-Höhe)", 390, 844, True, 3),
    ("2b", "iPhone 13/14 (Safari sichtbar)", 390, 664, True, 3),
    ("3", "iPhone Pro Max", 430, 932, True, 3),
    ("4", "Android", 412, 915, True, 2.625),
    ("5", "iPad hoch", 768, 1024, True, 2),
    ("6", "iPad Pro hoch", 1024, 1366, True, 2),
    ("7", "Laptop", 1280, 720, False, 1),
    ("8", "Laptop", 1366, 768, False, 1),
    ("9", "Desktop", 1440, 900, False, 1),
    ("10", "Desktop", 1920, 1080, False, 1),
]
TOLERANZ = 8  # px

MESS_JS = r"""
(args) => {
  const [bannerAn, minSchrift] = args;
  const H = window.innerHeight, W = window.innerWidth;
  const hero = document.querySelector('[data-hero]');
  if (!hero) return { fehler: 'kein [data-hero] gefunden' };
  const r = hero.getBoundingClientRect();
  const banner = document.querySelector('[data-consent]');
  let bannerOben = H, bannerSichtbar = false;
  if (banner) {
    const b = banner.getBoundingClientRect();
    const st = getComputedStyle(banner);
    bannerSichtbar = b.height > 0 && st.display !== 'none' && st.visibility !== 'hidden' && st.opacity !== '0';
    if (bannerSichtbar) bannerOben = Math.min(H, b.top);
  }
  // nächstes Element nach dem Hero im Dokumentfluss
  let naechste = hero.nextElementSibling;
  while (naechste && naechste.getBoundingClientRect().height === 0) naechste = naechste.nextElementSibling;
  const naechsteOben = naechste ? naechste.getBoundingClientRect().top : null;

  const probleme = [];
  const pflicht = [...hero.querySelectorAll('[data-hero-pflicht]')];
  if (hero.hasAttribute('data-hero-pflicht')) pflicht.unshift(hero);
  const elemente = pflicht.map(el => {
    const e = el.getBoundingClientRect();
    const immer = el.getAttribute('data-hero-pflicht') === 'immer';
    const grenze = (bannerAn && bannerSichtbar && immer) ? bannerOben : H;
    const mussSichtbar = !bannerAn || immer;
    const sichtbar = e.top >= -1 && e.bottom <= grenze + 1 && e.left >= -1 && e.right <= W + 1 && e.height > 0;
    const abgeschnitten = el.scrollHeight > el.clientHeight + 2 && getComputedStyle(el).overflowY !== 'visible';
    const name = el.getAttribute('data-hero-pflicht-name') || el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : '');
    if (mussSichtbar && !sichtbar) probleme.push(`nicht sichtbar: ${name}`);
    if (abgeschnitten) probleme.push(`Inhalt abgeschnitten: ${name}`);
    return { name, oben: Math.round(e.top), unten: Math.round(e.bottom), sichtbar, mussSichtbar };
  });

  // Wortbudget: Text im Hero ohne [data-zaehlt-nicht]; reine Zeichen (· € % ↓ | –) zählen nicht
  const klon = hero.cloneNode(true);
  klon.querySelectorAll('[data-zaehlt-nicht], script, style, svg, [aria-hidden="true"]').forEach(n => n.remove());
  klon.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(n => n.remove());
  const text = (klon.innerText || klon.textContent || '').replace(/\s+/g, ' ').trim();
  const woerter = text.split(' ').filter(t => /[\p{L}\p{N}]/u.test(t));

  // Schrift und Tippflächen
  const klein = [];
  hero.querySelectorAll('p, li, span, label, a, button, h1, h2, h3, small, input, textarea, select').forEach(el => {
    const fs = parseFloat(getComputedStyle(el).fontSize);
    const hatText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 0);
    const istFeld = /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
    if (istFeld && fs < 16) probleme.push(`Feldschrift ${fs}px < 16px (iOS-Zoom): ${el.name || el.id || el.type}`);
    else if (hatText && fs < minSchrift) klein.push(`${el.tagName.toLowerCase()} ${fs}px: "${el.textContent.trim().slice(0, 30)}"`);
  });
  hero.querySelectorAll('a, button, [role="button"], input, select, textarea').forEach(el => {
    const e = el.getBoundingClientRect();
    if (e.height > 0 && e.height < 44 && !el.hasAttribute('data-zaehlt-nicht')) probleme.push(`Tippfläche ${Math.round(e.height)}px hoch: "${(el.textContent || el.name || '').trim().slice(0, 25)}"`);
  });

  const abweichung = Math.round(r.bottom - H);
  if (Math.abs(abweichung) > 8) probleme.push(`Hero-Unterkante weicht ${abweichung}px vom Bildschirm ab`);
  if (naechsteOben !== null && naechsteOben < r.bottom - 1) probleme.push('nächste Sektion schaut in den Hero');
  if (document.documentElement.scrollWidth > W + 1) probleme.push(`waagrechtes Scrollen (${document.documentElement.scrollWidth}px breit)`);

  return {
    heroOben: Math.round(r.top), heroHoehe: Math.round(r.height), bildschirm: H, breite: W,
    abweichung, bannerSichtbar, bannerOben: Math.round(bannerOben),
    woerter: woerter.length, text, elemente, klein, probleme,
  };
}
"""


def neuer_kontext(browser, w, h, mobil, dpr, args, banner_an, **extra):
    ctx = browser.new_context(viewport={"width": w, "height": h}, is_mobile=mobil, has_touch=mobil,
                              device_scale_factor=dpr, locale="de-DE", **extra)
    if not banner_an:
        if args.consent_key:
            k, _, v = args.consent_key.partition("=")
            ctx.add_init_script(f"try{{localStorage.setItem({json.dumps(k)}, {json.dumps(v)})}}catch(e){{}}")
        # Rückfall: Banner per CSS ausblenden, falls kein Schlüssel bekannt ist
        ctx.add_init_script("document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');"
                            "s.textContent='[data-consent]{display:none!important}';document.head.appendChild(s);});")
    return ctx


def messen(browser, args, nr, name, w, h, mobil, dpr, banner_an, out, **extra):
    ctx = neuer_kontext(browser, w, h, mobil, dpr, args, banner_an, **extra)
    page = ctx.new_page()
    page.goto(args.url, wait_until="load")
    page.evaluate("document.fonts && document.fonts.ready")
    page.wait_for_timeout(args.warte)
    page.evaluate("window.scrollTo(0,0)")
    erg = page.evaluate(MESS_JS, [banner_an, 16])
    zustand = "mit-banner" if banner_an else "ohne-banner"
    if extra.get("reduced_motion"):
        zustand += "-reduced-motion"
    if extra.get("color_scheme") == "dark":
        zustand += "-dunkel"
    datei = out / f"{nr}-{w}x{h}-{zustand}.png"
    page.screenshot(path=str(datei))
    ctx.close()
    if "fehler" in erg:
        print(f"FEHLER: {erg['fehler']}"); sys.exit(2)
    if banner_an and not erg["bannerSichtbar"]:
        erg["probleme"].append("Hinweis: kein sichtbares [data-consent]-Banner gefunden")
    erg.update(nr=nr, geraet=name, zustand=zustand, screenshot=str(datei))
    erg["bestanden"] = not [p for p in erg["probleme"] if not p.startswith("Hinweis")]
    return erg


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("url")
    ap.add_argument("--out", default="hero-messung")
    ap.add_argument("--consent-key", default="", help="localStorage-Eintrag, der das Banner unterdrückt, z. B. consent=abgelehnt")
    ap.add_argument("--extra", default="", help="weitere Größen, z. B. 390x600 (gemessene In-App-Höhen)")
    ap.add_argument("--ganze-seite", action="store_true", help="ganze Seite bei 390, 768, 1440 fotografieren")
    ap.add_argument("--commit", default="")
    ap.add_argument("--warte", type=int, default=1200, help="ms warten, bis Einblend-Animationen fertig sind")
    ap.add_argument("--nur-fotos", action="store_true", help="fremde Vorbild-Seite: nur ersten Bildschirm fotografieren, nichts messen")
    args = ap.parse_args()

    out = pathlib.Path(args.out); out.mkdir(parents=True, exist_ok=True)
    geraete = list(GERAETE)
    for i, g in enumerate([g for g in args.extra.split(",") if g.strip()]):
        w, h = (int(x) for x in g.lower().split("x"))
        geraete.append((f"x{i+1}", "Zusatzgröße", w, h, w < 1024, 3 if w < 500 else 2))

    ergebnisse = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        if args.nur_fotos:
            for nr, name, w, h, mobil, dpr in geraete:
                ctx = browser.new_context(viewport={"width": w, "height": h}, is_mobile=mobil, has_touch=mobil,
                                          device_scale_factor=dpr, locale="de-DE")
                page = ctx.new_page(); page.goto(args.url, wait_until="load"); page.wait_for_timeout(args.warte)
                page.screenshot(path=str(out / f"vorbild-{nr}-{w}x{h}.png")); ctx.close()
            browser.close(); print(f"Fotos in {out}"); return
        for nr, name, w, h, mobil, dpr in geraete:
            for banner_an in (False, True):
                ergebnisse.append(messen(browser, args, nr, name, w, h, mobil, dpr, banner_an, out))
        # Sonderläufe an der wichtigsten Größe
        ergebnisse.append(messen(browser, args, "2b", "iPhone 13/14 (Safari sichtbar)", 390, 664, True, 3, False, out, reduced_motion="reduce"))
        ergebnisse.append(messen(browser, args, "2b", "iPhone 13/14 (Safari sichtbar)", 390, 664, True, 3, False, out, color_scheme="dark"))
        if args.ganze_seite:
            for w, h, mobil in ((390, 844, True), (768, 1024, True), (1440, 900, False)):
                ctx = neuer_kontext(browser, w, h, mobil, 2, args, False)
                page = ctx.new_page(); page.goto(args.url, wait_until="load"); page.wait_for_timeout(args.warte)
                # Lazy-Bilder laden: einmal durchscrollen
                page.evaluate("async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,120));}window.scrollTo(0,0);}")
                page.screenshot(path=str(out / f"ganze-seite-{w}.png"), full_page=True); ctx.close()
        browser.close()

    jetzt = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    zeilen = [f"# Hero-Messung {args.url}", "", f"Datum {jetzt} · Commit {args.commit or '-'} · Toleranz ±{TOLERANZ} px", "",
              f"Wörter im Hero: {ergebnisse[0]['woerter']} (Budget 20–30)", "",
              "| Nr | Gerät | Viewport | Zustand | Hero-Höhe | Abweichung | bestanden | Probleme | Screenshot |",
              "|---|---|---|---|---|---|---|---|---|"]
    for e in ergebnisse:
        zeilen.append(f"| {e['nr']} | {e['geraet']} | {e['breite']}×{e['bildschirm']} | {e['zustand']} | {e['heroHoehe']} | "
                      f"{e['abweichung']:+d} | {'ja' if e['bestanden'] else 'NEIN'} | {'; '.join(e['probleme']) or '-'} | {pathlib.Path(e['screenshot']).name} |")
    klein = sorted({k for e in ergebnisse for k in e["klein"]})
    if klein:
        zeilen += ["", "Schrift unter 16 px (prüfen, ob Stützsatz betroffen):", *[f"- {k}" for k in klein]]
    zeilen += ["", "Gezählter Text:", "", "> " + ergebnisse[0]["text"]]
    (out / "protokoll.md").write_text("\n".join(zeilen) + "\n", encoding="utf-8")
    (out / "protokoll.json").write_text(json.dumps(ergebnisse, ensure_ascii=False, indent=2), encoding="utf-8")
    durchgefallen = [e for e in ergebnisse if not e["bestanden"]]
    wort_ok = 20 <= ergebnisse[0]["woerter"] <= 30
    print(f"{len(ergebnisse) - len(durchgefallen)}/{len(ergebnisse)} Läufe bestanden · Wörter {ergebnisse[0]['woerter']} · Protokoll {out / 'protokoll.md'}")
    sys.exit(0 if not durchgefallen and wort_ok else 1)


if __name__ == "__main__":
    main()
