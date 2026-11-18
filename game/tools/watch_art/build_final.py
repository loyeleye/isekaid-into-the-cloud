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
town, ramps, chute, rep, bl = T.build(spots); print('\n'.join(rep))
save(town, 'out/town/town.webp')
for lv in T.ORDER: save(bl[lv], f'out/town/bld-{lv}.webp')
from PIL import ImageFilter
for lv in T.ORDER:   # soft copy for when this road is below you (Ladi, Nov 18): see-through and blurred
    sb = bl[lv].filter(ImageFilter.GaussianBlur(3)); a = np.asarray(sb).copy(); a[:, :, 3] = (a[:, :, 3] * 0.4).astype(np.uint8)
    save(Image.fromarray(a, 'RGBA'), f'out/town/bld-{lv}-soft.webp')
full = town.copy()
for lv in T.ORDER: full.alpha_composite(bl[lv])
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
# (Ladi, Nov 18) the plain below the hazed rooftops is filled from three wide panoramas made with Gemini image
# generation (tools/watch_art/<set>/pano-*.png), cropped just below their horizon, zoomed, hazed and cross-faded side
# by side. back.webp uses the villages set; back-forest.webp (forest, terrain and lakes) and back-mix.webp (forest
# with a few villages) are variants for Ladi to pick from.
TOPS = {'villages': (310, 260, 260), 'forest': (330, 360, 300), 'mix': (300, 330, 300)}   # first row of land kept, per panorama
def backdrop(sett):
    bk = back0.copy(); PH = BH - base + 30; strip = Image.new('RGBA', (BW, PH)); xo = 0; k = 0
    while xo < BW:
        p = Image.open(f'{sett}/pano-{k % 3 + 1}.png').convert('RGB').resize((1584, 672), Image.LANCZOS); top = TOPS[sett][k % 3]
        CH = 240 if sett == 'villages' else 110   # forest and mix zoomed in hard so trees, rocks and lakes read in the thin visible band (Ladi, Nov 18)
        land = p.crop((0, top, 1584, top + CH)); w = round(1584 * PH / CH); land = land.resize((w, PH), Image.LANCZOS)   # zoomed so the villages sit between the horizon row and the road above in size
        arr = np.asarray(land).astype(float); fog = np.array([150, 170, 176.0])
        t = np.linspace(0.55, 0.3, PH)[:, None, None] * (1 if sett == 'villages' else 0.45)   # hazier towards the horizon
        arr = arr * (1 - t) + fog * t
        al = np.full((PH, w), 255.0); f = 80
        if xo: al[:, :f] = np.linspace(0, 255, f)[None, :]
        al[:22] *= np.linspace(0, 1, 22)[:, None]
        strip.alpha_composite(Image.fromarray(np.dstack([arr, al]).astype(np.uint8), 'RGBA'), (xo, 0))
        xo += w - f; k += 1
    bk.alpha_composite(strip, (0, base - 30))
    x = 0
    for i in range(16):
        row = rows[i % 4]; row = row.resize((row.width // 2, row.height // 2), Image.LANCZOS)   # half size: further away (Ladi, Nov 18)
        bk.alpha_composite(row, (x, base - 153)); x += row.width
        if x > BW: break
    return bk
back0 = back.copy()
for sett, name in (('villages', 'back'), ('forest', 'back-forest'), ('mix', 'back-mix')): save(backdrop(sett), f'out/town/{name}.webp')

L['town'] = {'width': T.TW, 'height': T.TH, 'levelY': T.LY, 'ramps': ramps, 'chute': chute,
             'roofs': 115, 'layers': [{'img': A + 'town/far.webp', 'speed': 0.2}, {'img': A + 'town/back-forest.webp', 'speed': BS, 'y': -70}, {'img': A + 'town/town.webp', 'speed': 1}],
             'buildings': {lv: A + f'town/bld-{lv}.webp' for lv in T.ORDER},
             'buildingsSoft': {lv: A + f'town/bld-{lv}-soft.webp' for lv in T.ORDER}}
for lv, gy in T.LY.items():   # single-level views kept for compatibility: a 360-tall crop of the town around each road
    crop = Image.new('RGBA', (T.TW, 360)); crop.alpha_composite(full.crop((0, max(0, gy - 300), T.TW, gy + 60)), (0, max(0, 300 - gy)))
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
