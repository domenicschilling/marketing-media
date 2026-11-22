import os, glob, shutil, re
from PIL import Image
from captions import C
DEST = "/Users/domi/Marketing-Maschine/content/tattookalender/instagram-2026-10-23"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
os.makedirs(DEST, exist_ok=True)
firsts = []
for slug in sorted(C):
    d = os.path.join(DEST, slug); os.makedirs(d, exist_ok=True)
    for f in glob.glob(d + "/*.jpg"): os.remove(f)
    files = sorted(glob.glob(f"{OUT}/{slug}_*.png"), key=lambda p: int(re.search(r"_(\d+)\.png", p).group(1)))
    assert files, slug
    for i, f in enumerate(files, 1):
        im = Image.open(f).convert("RGB"); assert im.size == (1080, 1350), (f, im.size)
        im.save(os.path.join(d, f"{i}.jpg"), quality=95, subsampling=0)
        if i == 1: firsts.append((slug, im.copy()))
    open(os.path.join(d, "caption.txt"), "w", encoding="utf-8").write(C[slug] + "\n")
    print(slug, len(files))
# Kontaktbogen: Profilansicht (Instagram-Raster 3:4, neuester Beitrag oben links)
order = [s for s, _ in sorted(firsts, key=lambda x: x[0])]
ims = {s: im for s, im in firsts}
w, h, gap = 1012, 1350, 8   # 3:4-Ausschnitt wie im Profil
cw, ch = 360, round(360*1350/1012)
rows = []
sheet = Image.new("RGB", (3*cw + 4*gap, 5*ch + 6*gap), (0, 0, 0))
nums = sorted(order)  # 01..15
for pos in range(15):
    n = 15 - pos  # oben links = Beitrag 15
    slug = nums[n-1]
    im = ims[slug].crop(((1080-w)//2, 0, (1080-w)//2 + w, h)).resize((cw, ch), Image.LANCZOS)
    r, c = divmod(pos, 3)
    sheet.paste(im, (gap + c*(cw+gap), gap + r*(ch+gap)))
sheet.save(os.path.join(DEST, "kontaktbogen.jpg"), quality=92)
print("kontaktbogen ok")
