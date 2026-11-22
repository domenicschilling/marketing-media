import sys
from PIL import Image
out=sys.argv[1]; cols=int(sys.argv[2]); w=int(sys.argv[3]); files=sys.argv[4:]
ims=[Image.open(f).convert("RGB") for f in files]
h=round(w*1350/1080)
rows=(len(ims)+cols-1)//cols
g=12
sh=Image.new("RGB",(cols*w+(cols+1)*g,rows*h+(rows+1)*g),(60,60,60))
for i,im in enumerate(ims):
    im=im.resize((w,h),Image.LANCZOS)
    sh.paste(im,(g+(i%cols)*(w+g),g+(i//cols)*(h+g)))
sh.save(out)
