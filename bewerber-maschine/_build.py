"""Baut Bewerber-Maschine-Investoren-Memo.pdf aus der HTML-Quelle (A4) und macht Seiten-Screenshots zur Kontrolle.
Aufruf: uv run --with playwright python content/bewerber-maschine/_build.py [--shots]
"""
import sys, pathlib, asyncio
from playwright.async_api import async_playwright

HERE = pathlib.Path(__file__).resolve().parent
SRC = HERE / "Bewerber-Maschine-Investoren-Memo.html"
PDF = HERE / "Bewerber-Maschine-Investoren-Memo.pdf"
SHOTS = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else None

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={"width": 794, "height": 1123})
        await pg.goto(SRC.as_uri(), wait_until="networkidle")
        await pg.evaluate("document.fonts.ready")
        # Überlauf-Prüfung: Inhalt darf nicht über die Fußzeile ragen
        over = await pg.evaluate("""() => [...document.querySelectorAll('.page')].map((s,i)=>{
            const foot = s.querySelector('.foot'); const lim = foot ? foot.getBoundingClientRect().top : s.getBoundingClientRect().bottom;
            let max = 0; s.querySelectorAll(':scope > *:not(.foot):not(.runner):not(.cover-band)').forEach(e=>{max=Math.max(max,e.getBoundingClientRect().bottom)});
            return {seite:i+1, luft_px: Math.round(lim-max)}; })""")
        print("Luft bis Fußzeile je Seite (px, negativ = Überlauf):", over)
        await pg.pdf(path=str(PDF), format="A4", print_background=True, prefer_css_page_size=True)
        if SHOTS:
            SHOTS.mkdir(parents=True, exist_ok=True)
            n = await pg.evaluate("document.querySelectorAll('.page').length")
            for i in range(n):
                el = (await pg.query_selector_all('.page'))[i]
                await el.screenshot(path=str(SHOTS / f"s{i+1:02d}.png"))
        await b.close()
    print("PDF:", PDF)

asyncio.run(main())
