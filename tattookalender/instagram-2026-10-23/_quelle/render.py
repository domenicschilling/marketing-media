import sys, glob, os, subprocess
from concurrent.futures import ThreadPoolExecutor
ROOT=os.path.dirname(os.path.abspath(__file__))
CH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
pre=sys.argv[1] if len(sys.argv)>1 else ""
files=sorted(glob.glob(f"{ROOT}/html/{pre}*.html"))
def r(f):
    b=os.path.basename(f)[:-5]
    subprocess.run([CH,"--headless=new","--disable-gpu","--hide-scrollbars","--force-device-scale-factor=1","--window-size=1080,1350","--virtual-time-budget=4000",f"--screenshot={ROOT}/out/{b}.png","file://"+f],capture_output=True)
    return b
with ThreadPoolExecutor(4) as ex:
    for b in ex.map(r,files): print(b)
