# The stacked town: all four levels on one hillside picture, joined by sloped paths (Ladi, Nov 17-18).
import json, random, numpy as np
from PIL import Image, ImageDraw
import proc
from compose import piece, place, haze, BLD, LEVELS, GROUND, VW
TW, TH = 4100, 1200
LY = {'west-road': 300, 'hill-road': 580, 'main-street': 860, 'far-lane': 1140}
ORDER = ['west-road', 'hill-road', 'main-street', 'far-lane']
def tile(name, scale, crop_top=0):
    im = Image.open(f'bld/{name}.png').convert('RGB'); im = im.crop((0, crop_top, im.width, im.height))
    return im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS).convert('RGBA')
def fill_tiled(dst, t, box):
    x0, y0, x1, y1 = box
    for y in range(y0, y1, t.height):
        for x in range(x0, x1, t.width):
            dst.alpha_composite(t.crop((0, 0, min(t.width, x1 - x), min(t.height, y1 - y))), (x, y))
def ramps_from(spots):
    seen, out = set(), []
    for lv in ORDER:
        for s in spots[lv]:
            if s['kind'] != 'fork': continue
            a, b = (lv, s['x']), (s['to']['scene'], s['to']['x'])
            key = tuple(sorted([a, b]))
            if key in seen: continue
            seen.add(key)
            lo, hi = (a, b) if LY[a[0]] > LY[b[0]] else (b, a)
            out.append({'from': list(lo), 'to': list(hi), 'path': [[lo[1], LY[lo[0]]], [hi[1], LY[hi[0]]]]})
    return out
def ramp_y(r, x):
    (x0, y0), (x1, y1) = r['path']
    if not (min(x0, x1) <= x <= max(x0, x1)): return None
    return y0 + (y1 - y0) * (x - x0) / (x1 - x0)
def build(spots):
    soil = tile('hillside-tile', 0.25, 70); wallt = tile('stone-wall-tile', 0.22)
    town = Image.new('RGBA', (TW, TH)); d = ImageDraw.Draw(town)
    ramps = ramps_from(spots)
    chute = [[1440, LY['west-road']], [1120, LY['far-lane']]]
    r = random.Random(5)
    # 1) hillside faces, top to bottom: retaining wall under each road, then the earthen bank, hazed toward the back
    for i, lv in enumerate(ORDER):
        y = LY[lv]; nxt = LY[ORDER[i + 1]] if i + 1 < len(ORDER) else TH
        fill_tiled(town, soil, (0, y + 10, TW, nxt))
        band = Image.new('RGBA', (TW, nxt - y - 10), (36, 30, 26, 0)); a = np.asarray(band).copy()
        h = a.shape[0]; a[:, :, 3] = (np.linspace(0, 70, h)[:, None]).astype(np.uint8); town.alpha_composite(Image.fromarray(a, 'RGBA'), (0, y + 10))
        fill_tiled(town, wallt, (0, y + 10, TW, y + 44))
        d.line([0, y + 44, TW, y + 44], fill=(60, 52, 44, 255), width=2)
        # grass lip along the bank and a few hazed trees and bushes growing on it
        for x in range(0, TW, 3): d.line([x, y + 46, x, y + 46 + r.randint(1, 5)], fill=(88, 128, 60, 255))
        if i + 1 < len(ORDER):
            x = r.randint(50, 300)
            while x < TW:
                nm = r.choice(['bush', 'bush', 'tree-apple', 'tree-oak']); hh = {'bush': 46, 'tree-apple': 110, 'tree-oak': 130}[nm]
                place(town, haze(piece(nm, hh), (120, 140, 120), 0.25), x, min(nxt - 40, y + 90 + r.randint(0, 60))); x += r.randint(240, 520)
    # 2) the chute: a wooden trough down the cliff (behind the streets)
    (cx0, cy0), (cx1, cy1) = chute
    for t in np.linspace(0, 1, 900):
        x, y = cx0 + (cx1 - cx0) * t, cy0 + (cy1 - cy0) * t
        d.rectangle([x - 7, y - 2, x + 7, y + 6], fill=(122, 86, 52, 255)); d.point((x - 7, y - 3), fill=(80, 56, 34, 255)); d.point((x + 7, y - 3), fill=(80, 56, 34, 255))
    for t in np.linspace(0.05, 0.95, 12):
        x, y = cx0 + (cx1 - cx0) * t, cy0 + (cy1 - cy0) * t; d.rectangle([x - 2, y + 6, x + 2, y + 40], fill=(92, 66, 42, 255))
    # 3) roads: each level's road surface (the ground strip) at its ground line
    for lv in ORDER:
        W, gkind = LEVELS[lv][0], LEVELS[lv][1]
        g = proc.ground(TW, gkind, seed=len(lv)).crop((0, 0, TW, 12)); town.alpha_composite(g, (0, LY[lv]))
    # 4) ramps: built like the roads (same road surface over the same stone retaining wall), sheared along the slope
    for rp in ramps:
        (x0, y0), (x1, y1) = rp['path']; xa, xb = int(min(x0, x1)), int(max(x0, x1)); L = xb - xa
        lv_lo = rp['from'][0]; gkind = LEVELS[lv_lo][1]
        strip = Image.new('RGBA', (L + 1, 46)); strip.alpha_composite(proc.ground(L + 1, gkind, seed=7).crop((0, 0, L + 1, 12)), (0, 0))
        fill_tiled(strip, wallt, (0, 12, L + 1, 46))
        sd = ImageDraw.Draw(strip); sd.line([0, 45, L, 45], fill=(60, 52, 44, 255), width=2)
        for k in range(L + 1):
            x = xa + k; y = round(ramp_y(rp, x)); col = strip.crop((k, 0, k + 1, 46))
            town.alpha_composite(Image.new('RGBA', (1, 10), (30, 24, 20, 90)), (x, y + 46))   # shadow under the wall
            town.alpha_composite(col, (x, y))
        for k in range(6, L - 5, 30):   # fence along the outer edge: posts and two rails
            x = xa + k; y = ramp_y(rp, x); d.rectangle([x - 1, y - 30, x + 2, y + 1], fill=(92, 66, 42, 255)); d.point((x - 1, y - 31), fill=(70, 50, 32, 255))
        for off in (28, 15):
            d.line([x0, y0 - off, x1, y1 - off], fill=(124, 90, 58, 255), width=3); d.line([x0, y0 - off + 2, x1, y1 - off + 2], fill=(84, 60, 38, 255), width=1)
    # 5) buildings, top level first so the nearer (lower) levels overlap the bank behind them
    report = []
    for lv in ORDER:
        W, gkind, pal, fill = LEVELS[lv]; gy = LY[lv]
        items = [(nm, x, h, 4) for nm, x, h in fill]
        for s in spots[lv]:
            if s['id'] in BLD: nm, h, sink = BLD[s['id']]; items.append((nm, s['x'], h, sink))
        up = [rp for rp in ramps if rp['from'][0] == lv]
        prev = ORDER[ORDER.index(lv) - 1] if ORDER.index(lv) else None
        for nm, x, h, sink in items:
            filler = any(nm == f[0] and x == f[1] for f in fill)
            for _ in range(12):
                im = piece(nm, h); x0, x1, top = x - im.width / 2, x + im.width / 2, gy + sink - im.height
                room = gy + sink - (LY[prev] + 8) if prev else 9999
                for rp in up:
                    for xx in range(int(x0), int(x1), 4):
                        ry = ramp_y(rp, xx)
                        if ry is not None: room = min(room, gy + sink - (ry + 34))
                if im.height <= room: break
                h = int(h * 0.94)
            if im.height > room:
                if filler: report.append(f'dropped filler {lv}:{nm}@{x}'); continue
                report.append(f'CLASH {lv}:{nm}@{x} needs {im.height}px, room {room:.0f}px')
            elif h < [i[2] for i in items if i[0] == nm and i[1] == x][0]: report.append(f'shrunk {lv}:{nm}@{x} to {h}px')
            place(town, im, x, gy + sink)
    return town, ramps, chute, report
if __name__ == '__main__':
    import sys, subprocess
    spots = json.loads(subprocess.check_output(['node', '-e', "const W=require(process.argv[1]);const o={};for(const k of W.LEVELS)o[k]=W.TOWN[k].spots;console.log(JSON.stringify(o))", sys.argv[1]]))
    town, ramps, chute, rep = build(spots)
    print('\n'.join(rep)); town.save('test/town-full.png'); json.dump({'ramps': ramps, 'chute': chute}, open('test/town.json', 'w'))
    town.resize((TW // 4, TH // 4), Image.LANCZOS).save('test/town-small.png')
