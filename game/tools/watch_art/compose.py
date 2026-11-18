# Composes the parallax layers for the town levels, castle floors, bridge and neighbour's castle from the cut-out renders.
import json, os, numpy as np, random
from PIL import Image, ImageEnhance
from cutout import cutout
import proc
O = 'out'; VW = 1280; GROUND = 300
_cache = {}
def piece(name, h, shadow=False):
    """A cut-out render scaled so its full height is h px, hard-edged."""
    key = (name, h)
    if key in _cache: return _cache[key]
    src = f'bld/{name}.png'
    if not os.path.exists(src) and name[-1] == '2': src = f'bld/{name[:-1]}.png'
    im = cutout(src, shadow=False); im = im.crop(im.getbbox())
    s = h / im.height
    sm = im.convert('RGBa').resize((max(1, round(im.width * s)), h), Image.LANCZOS).convert('RGBA')
    a = np.asarray(sm).copy(); a[:, :, 3] = np.where(a[:, :, 3] > 110, 255, 0)
    out = Image.fromarray(a, 'RGBA'); _cache[key] = out; return out
def place(layer, im, cx, bottom):
    layer.alpha_composite(im, (round(cx - im.width / 2), round(bottom - im.height)))
def haze(im, col, amt):
    a = np.asarray(im).astype(float); a[:, :, :3] = a[:, :, :3] * (1 - amt) + np.array(col) * amt
    return Image.fromarray(a.astype(np.uint8), 'RGBA')
# ---- buildings: (render, height px, sink px below the ground line) ----
BLD = {
 'far-gate': ('far-gate', 200, 4), 'lookout-ruin': ('lookout-ruin', 270, 4), 'shrine': ('shrine', 160, 4),
 'coach-house': ('coach-house', 220, 4), 'pell-gate': ('castle-gate2', 250, 4), 'post-office': ('post-office', 220, 4),
 'library': ('library2', 230, 4), 'bounty-board': ('bounty-board2', 170, 4), 'doug-flat': ('doug-flat', 230, 4),
 'bunker': ('bunker', 150, 34), 'base-camp': ('base-camp', 140, 4), 'forge': ('forge', 170, 4), 'outpost': ('outpost', 180, 4),
 'bakery': ('bakery2', 260, 4), 'cafe': ('cafe', 210, 4), 'stall': ('stall', 175, 4), 'lock-shop': ('lock-shop2', 200, 4),
 'town-gate': ('town-gate', 180, 4), 'cottage': ('cottage', 230, 4), 'dock': ('dock', 190, 40), 'granary': ('granary', 240, 4),
 'well': ('well', 160, 4),
}
FORK = {'up': ('stairs-up', 140, 4), 'down': ('stairs-down', 100, 6)}
LEVELS = {  # width, ground kind, palette for far hills, extra fillers (render, x, h)
 'west-road': (3500, 'dirt', [(126, 150, 170), (104, 136, 120), (86, 122, 92)], [('tree-oak', 700, 230), ('tree-oak', 1180, 210), ('bush', 1650, 70), ('house-b', 2240, 260), ('tree-oak', 3070, 220)]),
 'hill-road': (4100, 'cobble', [(132, 156, 176), (110, 140, 126), (92, 128, 98)], [('house-c', 1030, 300), ('tree-oak', 1660, 220), ('house-b', 2060, 260), ('house-b', 2500, 260), ('tree-oak', 2980, 210), ('house-c', 3450, 300), ('bush', 3920, 70)]),
 'main-street': (3100, 'cobble', [(136, 160, 180), (116, 146, 130), (98, 134, 104)], [('tree-oak', 140, 220), ('house-c', 960, 300), ('house-b', 2200, 260), ('house-c', 2580, 300), ('house-c', 2960, 300)]),
 'far-lane': (4100, 'dirt', [(140, 164, 184), (120, 150, 134), (104, 140, 110)], [('tree-apple', 900, 190), ('tree-apple', 1330, 200), ('tree-apple', 1500, 180), ('house-b', 1760, 260), ('tree-oak', 2250, 220), ('house-c', 2860, 300), ('tree-oak', 3380, 210), ('bush', 3850, 70)]),
}
def town(level, spots):
    W, gkind, pal, fill = LEVELS[level]
    # far: hills plus the castle on its hill (east, above the West Road)
    fw = int(0.2 * W) + VW
    far = proc.hills(fw, hash(level) % 1000, pal)
    castle = haze(piece('castle-hill', 230 if level == 'west-road' else 190), (170, 190, 210), 0.35)
    place(far, castle, fw - 420, 300 if level != 'far-lane' else 280)
    # back: hazed rooftops at half speed
    bw = int(0.5 * W) + VW; back = Image.new('RGBA', (bw, 360)); r = random.Random(level)
    x = 40
    while x < bw:
        nm = r.choice(['house-a', 'house-b', 'house-c', 'tree-oak', 'house-a', 'bakery2', 'cafe'])
        p = haze(piece(nm, r.randint(120, 160)), (156, 176, 196), 0.5); place(back, p, x + p.width / 2, 288); x += p.width + r.randint(-30, 40)
    x = 0
    while x < bw:
        p = haze(piece('bush', r.randint(46, 60)), (140, 165, 170), 0.45); place(back, p, x + p.width / 2, 306); x += p.width - 12
    # street: ground, fillers behind, then the spot buildings
    street = Image.new('RGBA', (W, 360)); street.alpha_composite(proc.ground(W, gkind, seed=len(level)), (0, 300))
    if level == 'far-lane':   # the river runs under the dock: boards over water
        street.alpha_composite(proc.ground(760, 'plank', seed=8), (2140, 300))
    for nm, x, h in fill: place(street, piece(nm, h), x, GROUND + 4)
    for s in spots:
        if s['kind'] == 'fork' or (s['kind'] == 'travel' and s['id'] in ('lookout-ruin',)):
            pass
        key = s['id']
        if s['kind'] == 'fork':
            nm, h, sink = FORK[s['dir']]; place(street, piece(nm, h), s['x'], GROUND + sink)
        elif key in BLD:
            nm, h, sink = BLD[key]
            if os.path.exists(f'bld/{nm}.png') or os.path.exists(f'bld/{nm[:-1]}.png'): place(street, piece(nm, h), s['x'], GROUND + sink)
    # front: lamp posts, fences and bushes passing in front of the player
    frw = int(1.3 * W) + VW; front = Image.new('RGBA', (frw, 360)); r = random.Random(level + 'f'); x = 300
    while x < frw:
        nm = r.choice(['lamp-post', 'fence', 'bush', 'bush'])
        h = {'lamp-post': 230, 'fence': 70, 'bush': 80}[nm]
        place(front, piece(nm, h), x, 372); x += r.randint(600, 1100)
    return W, [('far', far, 0.2), ('back', back, 0.5), ('street', street, 1), ('front', front, 1.3)]
def green_out(im):
    a = np.asarray(im.convert('RGBA')).copy(); r, g, b = (a[:, :, i].astype(int) for i in range(3))
    m = (g > r + 50) & (g > b + 50); a[:, :, 3][m] = 0; return Image.fromarray(a, 'RGBA')
def room_img(name, w, h):
    im = Image.open(f'room/{name}.png').convert('RGB'); W0, H0 = im.size
    im = im.crop((int(W0 * 0.045), int(H0 * 0.07), int(W0 * 0.955), int(H0 * 0.97)))
    im = green_out(im).resize((w, h), Image.LANCZOS)
    a = np.asarray(im).copy(); a[:, :, 3] = np.where(a[:, :, 3] > 110, 255, 0); return Image.fromarray(a, 'RGBA')
FLOORS = {'towers': [('watchtower', 120, 460), ('lookout', 460, 790), ('captain', 810, 1480)],
          'upper': [('wardrobe', 120, 790), ('ledger', 810, 1140), ('bridge-tower', 1140, 1480)],
          'ground': [('gate', 120, 460), ('hall', 460, 790), ('post-room', 810, 1140), ('tavern', 1140, 1480)],
          'cellars': [('archive', 120, 460), ('strongroom', 460, 790), ('barracks', 810, 1480)]}
STAIRS = {'towers': ['left'], 'upper': ['left', 'right'], 'ground': ['left', 'right'], 'cellars': ['right']}
def castle(floor):
    W = 1600; top = 16
    fw = int(0.2 * W) + VW; far = Image.new('RGBA', (fw, 360))
    if floor == 'cellars': far = Image.new('RGBA', (fw, 360), (34, 30, 38, 255))
    if floor != 'cellars':
        hill = proc.hills(fw, 77 + len(floor), [(130, 150, 172), (110, 134, 124), (92, 120, 96)], tops=(220, 250, 280))
        far.alpha_composite(hill, (0, {'towers': 60, 'upper': 30, 'ground': 0}[floor]))
    wall = Image.new('RGBA', (W, 360))
    stone = proc.ground(W, 'stone', seed=3)
    wall.alpha_composite(stone, (0, 300)); wall.alpha_composite(stone.crop((0, 0, W, top)), (0, 0))
    # stair towers at the ends, a solid stone backing everywhere a room doesn't cover
    back = Image.new('RGBA', (120, 300 - top), (58, 56, 66, 255))
    for yy in range(0, 300 - top, 50): back.alpha_composite(proc.ground(120, 'stone', seed=yy).crop((0, 0, 120, 50)), (0, yy))
    back = haze(back, (30, 28, 40), 0.35); wall.alpha_composite(back, (0, top)); wall.alpha_composite(back, (1480, top))
    for name, a_, b_ in FLOORS[floor]:
        if os.path.exists(f'room/{name}.png'): wall.alpha_composite(room_img(name, b_ - a_, 300 - top), (a_, top))
    st = piece('stair', 300 - top)
    if 'left' in STAIRS[floor]: place(wall, st, 60, 300)
    if 'right' in STAIRS[floor]: place(wall, st.transpose(Image.FLIP_LEFT_RIGHT), 1540, 300)
    part0 = piece('partition-door', 300 - top); part = Image.new('RGBA', part0.size, (30, 26, 34, 255)); part.alpha_composite(part0)
    for i, (name, a_, b_) in enumerate(FLOORS[floor]):
        if i > 0: place(wall, part, a_, 300)
    place(wall, part, 120, 300); place(wall, part, 1480, 300)
    if floor == 'ground': place(wall, piece('castle-wall', 300 - top).crop((0, 0, 60, 300 - top)), 20, 300)
    fr = Image.new('RGBA', (int(1.3 * W) + VW, 360)); x = 200
    while x < fr.width:
        place(fr, piece('banner', 150), x, 300); x += 1100
    return W, [('far', far, 0.2), ('wall', wall, 1), ('front', fr, 1.3)]
def bridge(neigh=False):
    W = 1200 if neigh else 1100
    fw = int(0.2 * W) + VW
    far = proc.hills(fw, 91, [(130, 150, 172), (110, 134, 124), (92, 120, 96)], tops=(230, 270, 320))
    st = Image.new('RGBA', (W, 360))
    raw = Image.open('bld/bridge.png').convert('RGB').crop((165, 0, 855, 1024)); raw.save('bld/bridge-span.png')
    br = piece('bridge-span', 260)
    x = 0
    while x < W: place(st, br, x + br.width / 2, 298 + br.height); x += br.width - 2
    if neigh:
        place(st, piece('neighbour-castle', 300), W - 300, 304)
    else:
        place(st, piece('castle-wall', 320), 10, 304); place(st, piece('neighbour-castle', 300), 900, 304)
    fr = Image.new('RGBA', (int(1.3 * W) + VW, 360))
    return W, [('far', far, 0.2), ('street', st, 1), ('front', fr, 1.3)]
def save(kind, key, W, layers, meta):
    d = f'{O}/{kind}/{key}'; os.makedirs(d, exist_ok=True); ls = []
    for nm, im, sp in layers:
        p = f'{d}/{nm}.webp'; im.save(p, 'WEBP', quality=90, alpha_quality=100, method=6)
        ls.append({'img': f'assets/img/watch/{kind}/{key}/{nm}.webp', 'speed': sp})
    meta[key] = {'width': W, 'ground': GROUND, 'layers': ls}
if __name__ == '__main__':
    import sys, subprocess
    spots = json.loads(subprocess.check_output(['node', '-e', "const W=require(process.argv[1]);const o={};for(const k of W.LEVELS)o[k]=W.TOWN[k].spots;console.log(JSON.stringify(o))", sys.argv[1]]))
    meta = {'levels': {}, 'floors': {}}
    only = sys.argv[2:] 
    for lv in LEVELS:
        if only and lv not in only: continue
        W, ls = town(lv, spots[lv]); save('levels', lv, W, ls, meta['levels']); print(lv)
    for f in FLOORS:
        if only and f not in only: continue
        W, ls = castle(f); save('floors', f, W, ls, meta['floors']); print(f)
    if not only or 'bridge' in only:
      W, ls = bridge(); save('floors', 'bridge', W, ls, meta['floors'])
      W, ls = bridge(True); save('floors', 'neighbour-castle', W, ls, meta['floors'])
    if os.path.exists(f'{O}/layers.json'):
        old = json.load(open(f'{O}/layers.json'))
        for k in meta: old[k].update(meta[k])
        meta = old
    json.dump(meta, open(f'{O}/layers.json', 'w'), indent=1)
