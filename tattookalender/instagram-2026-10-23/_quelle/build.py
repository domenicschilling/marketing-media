import sys, importlib
mods = sys.argv[1:] or ["posts_a","posts_b"]
for m in mods:
    mod = importlib.import_module(m)
    for f in mod.ALL:
        n, s = f(); print(n, len(s))
