import json
d=json.load(open('ergebnis.json'))
for k,v in d['gesamt'].items():
    print(k,{x:v[x] for x in ['hoehe','breite','h1Zeilen','pflichtGroesse','pflichtImErsten','knopfImErsten','kleineZiele','ueber','fehler']})
    print('  h2',[h for h in v['h2Zeilen'] if not h.endswith(':1') and not h.endswith(':2')]); print('  axe',v['axe']['verstoesse']); print('  unklar',[(u['id'],u['n']) for u in v['axe']['unklar']]);print('  flach',v['axeFlach'])
w=d['wortScan'];print(w['treffer'],w['ratenGesamt'],w['zahlen'])
