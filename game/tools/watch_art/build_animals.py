import json, os, numpy as np
from PIL import Image, ImageDraw
from cutout import cutout
O = 'out/animals'; os.makedirs(O, exist_ok=True)
H = dict(horse=66, crow=14, rabbit=14, owl=20, pigeon=13, cat=20, goat=34, bat=12, chicken=17, dog=26, sparrow=9, fox=22, duck=15,
         heron=36, frog=9, dove=13, rat=9, butterfly=9)
POSES = json.load(open('anim-poses.json'))
meta = {}
for k, h in H.items():
    names = ['idle'] + [p for p in POSES[k] + ['w1', 'w2', 'w3', 'w4'] if os.path.exists(f'anim/{k}-{p}.png')]  # w1-w4: the birds' 4-frame walk (or hop)
    if not os.path.exists(f'anim/{k}-idle.png'): continue
    cuts = {n: cutout(f'anim/{k}-{n}.png') for n in names}
    R = 1 if h <= 10 else 2   # 2x sheets (scale 0.5) for everything but the tiniest
    base = cuts['idle'].getbbox(); s = R * h / (base[3] - base[1])
    fr = {}
    for n, im in cuts.items():
        im = im.crop(im.getbbox()); w2, h2 = max(1, round(im.width * s)), max(1, round(im.height * s))
        sm = im.convert('RGBa').resize((w2, h2), Image.LANCZOS).convert('RGBA'); a = np.asarray(sm).copy()
        a[:, :, 3] = np.where(a[:, :, 3] > 110, 255, 0); fr[n] = Image.fromarray(a, 'RGBA')
    FW = max(f.width for f in fr.values()) + 4 * R; FH = max(f.height for f in fr.values()) + 4 * R
    sheet = Image.new('RGBA', (FW * len(names), FH))
    for i, n in enumerate(names):
        f = fr[n]; cell = Image.new('RGBA', (FW, FH)); d = ImageDraw.Draw(cell)
        fly = n.startswith('fly') or (k in ('bat', 'butterfly') and n in ('idle', 'fly2'))
        if not fly and h > 10:
            sw = max(4, int(f.width * 0.7)); d.ellipse([FW // 2 - sw // 2, FH - 4 * R, FW // 2 + sw // 2, FH - R], fill=(20, 16, 30, 60))
        cell.alpha_composite(f, ((FW - f.width) // 2, FH - 2 * R - f.height)); sheet.alpha_composite(cell, (i * FW, 0))
    sheet.save(f'{O}/{k}.png', optimize=True)
    ix = {n: i for i, n in enumerate(names)}
    an = {'idle': [ix['idle']]}
    if 'walk' in ix: an['walk'] = [ix['idle'], ix['walk']]
    if 'run' in ix: an['run'] = [ix['run'], ix['idle']] if k not in ('rabbit', 'frog') else [ix['run'], ix['idle']]
    elif 'walk' in ix: an['run'] = [ix['walk'], ix['idle']]
    if 'fly' in ix: an['fly'] = [ix['fly'], ix.get('fly2', ix['fly'])]
    if k in ('bat', 'butterfly'): an['fly'] = [ix['idle'], ix['fly2']]; an['idle'] = an['fly']
    if all(f'w{i}' in ix for i in (1, 2, 3, 4)):
        an['walk'] = [ix[f'w{i}'] for i in (1, 2, 3, 4)]
        if 'run' not in ix: an['run'] = an['walk']
    if 'perch' in ix: an['perch'] = [ix['perch']]
    if 'sleep' in ix: an['sleep'] = [ix['sleep']]
    if k == 'bat': an['sleep'] = an['perch']
    meta[k] = {'w': FW, 'h': FH, 'anchor': [FW // 2, FH - 2 * R], 'scale': 1 / R, 'frames': names, 'anims': an, 'fps': 6}
    print(k, names)
for k in ('moth', 'bee', 'firefly'):
    meta[k] = {'w': 8, 'h': 8, 'anchor': [4, 7], 'frames': ['a', 'b'], 'anims': {'idle': [0, 1], 'fly': [0, 1], 'walk': [0, 1], 'perch': [0], 'sleep': [1]}, 'fps': 10}
json.dump(meta, open(f'{O}/meta.json', 'w'), indent=1)
