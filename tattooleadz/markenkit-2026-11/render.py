# Rendert Vorlagen (PNG) und das Markenkit (PDF). Aufruf: uv run --with playwright python render.py [pdf|png|alle]
import asyncio, sys, glob, os
from playwright.async_api import async_playwright
BASE = os.path.dirname(os.path.abspath(__file__))
SIZES = {"post-4x5": (1080,1350), "story-9x16": (1080,1920), "reel-cover": (1080,1920)}
async def main(mode):
    async with async_playwright() as p:
        b = await p.chromium.launch()
        if mode in ("png","alle"):
            pg = await b.new_page()
            for f in sorted(glob.glob(os.path.join(BASE,"vorlagen","*.html"))):
                name = os.path.basename(f)[:-5]
                w,h = next(v for k,v in SIZES.items() if name.startswith(k))
                await pg.set_viewport_size({"width":w,"height":h})
                await pg.goto("file://"+f); await pg.evaluate("document.fonts.ready"); await pg.wait_for_timeout(400)
                await pg.screenshot(path=os.path.join(BASE,"vorlagen",name+".png"), clip={"x":0,"y":0,"width":w,"height":h})
                print("PNG", name)
        if mode in ("pdf","alle"):
            pg = await b.new_page(viewport={"width":1280,"height":720})
            await pg.goto("file://"+os.path.join(BASE,"markenkit.html")); await pg.evaluate("document.fonts.ready"); await pg.wait_for_timeout(800)
            await pg.pdf(path=os.path.join(BASE,"TattooLeadz-Markenkit.pdf"), width="1280px", height="720px", print_background=True, margin={"top":"0","right":"0","bottom":"0","left":"0"})
            print("PDF")
        await b.close()
asyncio.run(main(sys.argv[1] if len(sys.argv)>1 else "alle"))
