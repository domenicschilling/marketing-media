from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
import sys
jobs = [
 ("Bricolage-Grotesque/BricolageGrotesque[opsz,wdth,wght].ttf", {"wght":800,"opsz":72,"wdth":100}, "Bricolage-Grotesque/einzeln/BricolageGrotesque-ExtraBold.ttf"),
 ("Bricolage-Grotesque/BricolageGrotesque[opsz,wdth,wght].ttf", {"wght":600,"opsz":36,"wdth":100}, "Bricolage-Grotesque/einzeln/BricolageGrotesque-SemiBold.ttf"),
 ("Inter/Inter[opsz,wght].ttf", {"wght":400,"opsz":14}, "Inter/einzeln/Inter-Regular.ttf"),
 ("Inter/Inter[opsz,wght].ttf", {"wght":500,"opsz":14}, "Inter/einzeln/Inter-Medium.ttf"),
 ("Inter/Inter[opsz,wght].ttf", {"wght":600,"opsz":14}, "Inter/einzeln/Inter-SemiBold.ttf"),
]
for src, loc, dst in jobs:
    f = instantiateVariableFont(TTFont(src), loc, updateFontNames=True)
    f.save(dst)
    n = f["name"]; print(dst, "|", n.getDebugName(1), "|", n.getDebugName(2), "|", n.getDebugName(4))
