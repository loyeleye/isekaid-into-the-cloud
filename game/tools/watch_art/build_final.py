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
# backdrop: the first demo's hazed town, up at the top of the hill the paths climb, over a hazed green hillside
# (Ladi, Nov 18). Speed 0.3: the town sits behind West Road and slides up out of view as you go down the hill.
BS = 0.3; BW, BH = round(BS * T.TW + 1280), round(360 + BS * (T.TH - 360)); back = Image.new('RGBA', (BW, BH))
base = 262
hill = np.zeros((BH - base + 2, BW, 4), np.uint8); t = np.linspace(0, 1, hill.shape[0])[:, None]
for c, (top, bot) in enumerate(((112, 84), (140, 112), (116, 92))): hill[:, :, c] = (top + (bot - top) * t).astype(np.uint8)
hill[:, :, 3] = 255; back.alpha_composite(Image.fromarray(hill, 'RGBA'), (0, base - 2))
rows = [Image.open(f'oldback/{lv}.webp').convert('RGBA') for lv in T.ORDER]
bush = rows[0].crop((0, 262, rows[0].width, 306))          # the hazed hedge line along the bottom of a row
from compose import piece, haze
import random
rr = random.Random(3)
for yb in range(330, BH + 60, 46):                         # a hazed orchard hillside: trees and hedges, paler higher up
    k = (yb - 330) / max(1, BH - 330); x = rr.randint(-80, 60)
    while x < BW:
        nm = rr.choice(['tree-oak', 'tree-apple', 'bush', 'bush', 'tree-oak'])
        hh = {'tree-oak': 70, 'tree-apple': 60, 'bush': 28}[nm] * (0.8 + 0.5 * k)
        back.alpha_composite(haze(piece(nm, int(hh)), (128, 150, 140), 0.55 - 0.25 * k).convert('RGBA'), (int(x), int(yb - hh)))
        x += rr.randint(60, 260)
x = 0
for i in range(8):
    row = rows[i % 4]; back.alpha_composite(row, (x, base - 305)); x += row.width
    if x > BW: break
save(back, 'out/town/back.webp')
L['town'] = {'width': T.TW, 'height': T.TH, 'levelY': T.LY, 'ramps': ramps, 'chute': chute,
             'layers': [{'img': A + 'town/far.webp', 'speed': 0.2}, {'img': A + 'town/back.webp', 'speed': BS}, {'img': A + 'town/town.webp', 'speed': 1}]}
for lv, gy in T.LY.items():   # single-level views kept for compatibility: a 360-tall crop of the town around each road
    crop = Image.new('RGBA', (T.TW, 360)); crop.alpha_composite(town.crop((0, max(0, gy - 300), T.TW, gy + 60)), (0, max(0, 300 - gy)))
    save(crop, f'out/levels/{lv}/street.webp')
    L['levels'][lv]['layers'] = [l for l in L['levels'][lv]['layers'] if l['speed'] in (0.2, 1)]
    for p in ('back', 'front'):
        if os.path.exists(f'out/levels/{lv}/{p}.webp'): os.remove(f'out/levels/{lv}/{p}.webp')
# ---- castle floors ----
S = F.SW   # the hoist shaft on the left adds S to every x measured on the painted wall
links = {'stair-left': 75 + S, 'stair-right': 1120 + S, 'cellar-stair': 150 + S, 'back-stair': 1040 + S, 'hoist': 55, 'bridge-door': 1077 + S}
for f in F.G:
    save(F.build(f), f'out/floors/{f}/wall.webp')
    if os.path.exists(f'out/floors/{f}/front.webp'): os.remove(f'out/floors/{f}/front.webp')
    L['floors'][f] = {'width': F.FW + S, 'ground': 300, 'rooms': [[n, a + S, b + S] for n, a, b in F.G[f]['rooms']],
                      'doors': {k: v + S for k, v in F.G[f]['doors'].items()}, 'links': links, 'walls': [S, F.FW + S],
                      'layers': [{'img': A + f'floors/{f}/far.webp', 'speed': 0.2}, {'img': A + f'floors/{f}/wall.webp', 'speed': 1}]}
json.dump(L, open('out/layers.json', 'w'), indent=1)
