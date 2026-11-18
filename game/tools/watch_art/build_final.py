# Writes the stacked town and the one-wall castle floors into out/, and their entries into out/layers.json.
import json, os, sys, subprocess, numpy as np
from PIL import Image
import town as T, floors2 as F
def save(im, p):
    os.makedirs(os.path.dirname(p), exist_ok=True); im.save(p, 'WEBP', quality=90, alpha_quality=100, method=6)
A = 'assets/img/watch/'
L = json.load(open('out/layers.json'))
# ---- town ----
spots = json.loads(subprocess.check_output(['node', '-e', "const W=require(process.argv[1]);const o={};for(const k of W.LEVELS)o[k]=W.TOWN[k].spots;console.log(JSON.stringify(o))", sys.argv[1]]))
town, ramps, chute, rep = T.build(spots); print('\n'.join(rep))
save(town, 'out/town/town.webp')
far0 = Image.open('out/levels/west-road/far.webp').convert('RGBA'); FWD = 2200; FH = 600
far = Image.new('RGBA', (FWD, FH), far0.getpixel((10, 359)))
far.paste(Image.new('RGBA', (FWD, 360), (0, 0, 0, 0)), (0, 0))
for x in range(0, FWD, far0.width): far.paste(far0, (x, 0))
save(far, 'out/town/far.webp')
L['town'] = {'width': T.TW, 'height': T.TH, 'levelY': T.LY, 'ramps': ramps, 'chute': chute,
             'layers': [{'img': A + 'town/far.webp', 'speed': 0.2}, {'img': A + 'town/town.webp', 'speed': 1}]}
for lv, gy in T.LY.items():   # single-level views kept for compatibility: a 360-tall crop of the town around each road
    crop = Image.new('RGBA', (T.TW, 360)); crop.alpha_composite(town.crop((0, max(0, gy - 300), T.TW, gy + 60)), (0, max(0, 300 - gy)))
    save(crop, f'out/levels/{lv}/street.webp')
    L['levels'][lv]['layers'] = [l for l in L['levels'][lv]['layers'] if l['speed'] in (0.2, 1)]
    for p in ('back', 'front'):
        if os.path.exists(f'out/levels/{lv}/{p}.webp'): os.remove(f'out/levels/{lv}/{p}.webp')
# ---- castle floors ----
links = {'stair-left': 75, 'stair-right': 1120, 'cellar-stair': 150, 'back-stair': 1040, 'hoist': 600, 'bridge-door': 1085}
for f in F.G:
    save(F.build(f), f'out/floors/{f}/wall.webp')
    if os.path.exists(f'out/floors/{f}/front.webp'): os.remove(f'out/floors/{f}/front.webp')
    L['floors'][f] = {'width': F.FW, 'ground': 300, 'rooms': F.G[f]['rooms'], 'doors': F.G[f]['doors'], 'links': links,
                      'layers': [{'img': A + f'floors/{f}/far.webp', 'speed': 0.2}, {'img': A + f'floors/{f}/wall.webp', 'speed': 1}]}
json.dump(L, open('out/layers.json', 'w'), indent=1)
