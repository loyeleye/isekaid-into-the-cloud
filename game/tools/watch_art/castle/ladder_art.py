# The unlocked ladder (Ladi, Nov 19). Sogni (krea2 identity edit, seed 3601) painted, in place, the towers' trapdoor
# open with a ladder standing in it, Sogni's content filter withheld
# every take on the ground and upper floor crops, so those floors (and the cellars, to match) reuse the towers' open trapdoor (down) and a ladder
# built by stacking one rung-length of the towers' ladder up to the ceiling with a dark hatch (up).
# Writes <out>/<floor>-<down|up>.png (RGBA) and <out>/ladder.json: native box [x0, y0, x1, y1] per piece.
# usage: python3 ladder_art.py <dir with <floor>-ref.png, towers-3601.png> <out> (the floor pictures are in <out>/..)
import sys, os, json, numpy as np
from PIL import Image, ImageFilter
d, out = sys.argv[1:3]; os.makedirs(out, exist_ok=True)
def load(p): return np.asarray(Image.open(p).convert('RGB').resize((512, 512), Image.LANCZOS)).astype(int)
def green(a): return (a[..., 1] > a[..., 0] + 40) & (a[..., 1] > a[..., 2] + 40)
def region(x0, x1, y0, y1):
    r = np.zeros((512, 512), bool); r[y0:y1, x0:x1] = True; return r
def cut(ref, ed, keep):                                   # alpha where the edit changed the picture (and isn't sky)
    m = Image.fromarray(((np.abs(ref - ed).sum(2) > 60) & keep).astype(np.uint8) * 255)
    m = m.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(0.8))
    a = np.asarray(m).copy(); a[~keep] = 0
    return np.dstack([ed.clip(0, 255).astype(np.uint8), a])
def save(rgba, x0, y0, name):                             # trim to the opaque part, record the native box
    ys, xs = np.where(rgba[..., 3] > 8); t = rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    Image.fromarray(t).save(f'{out}/{name}.png'); return [x0 + int(xs.min()), y0 + int(ys.min()), x0 + int(xs.max()) + 1, y0 + int(ys.max()) + 1]
J = {}
# towers: open trapdoor + ladder top (crop at native x 1744, y 52)
tr, te = load(f'{d}/towers-ref.png'), load(f'{d}/towers-3601.png')
down = cut(tr, te, ~green(te) & region(120, 400, 100, 470))
J['towers'] = {'down': save(down, 1744, 52, 'towers-down')}
# ground and upper: the same open trapdoor, placed on their own trapdoor (their crops: native x 1749, y 52)
for f in ('ground', 'upper'):
    J[f] = {'down': save(down, 1749, 52, f'{f}-down')}
# ...and the ladder up: one rung-length of the towers' ladder (crop rows 196..226, cols 205..300), stacked to the top
seg = te[196:226, 205:300]; sa = (~green(seg)).astype(np.uint8) * 255
up = np.zeros((470 - 0, 95, 4), np.uint8)               # native rows 0..470, rung phase matching the trapdoor ladder
for y in range(470 - 1, -30, -1):
    if (y - (196 + 52)) % 30 == 0:
        for k in range(30):
            if 0 <= y + k < 470: up[y + k, :, :3] = seg[k].clip(0, 255); up[y + k, :, 3] = sa[k]
# up (Ladi, Nov 19: keep it simple): the ladder runs straight up to the top of the picture and passes behind the ceiling,
# i.e. it is hidden wherever the floor's own picture shows ceiling: wooden beams and brackets, or the vault's bricks.
FL = os.path.join(out, '..')
for f, cx in (('ground', 1997), ('upper', 1997), ('cellars', 1994)):
    x0 = cx - 47; img = np.asarray(Image.open(f'{FL}/{f}.png').convert('RGB'))[:470, x0:x0 + 95].astype(int)
    r, g, b = img[..., 0], img[..., 1], img[..., 2]
    if f == 'cellars':                                                        # brick: hide everything above the vault ring's lower edge
        br = (r > g + 15) & (r > b + 20) & (r > 70); br[200:] = False; ceil = np.zeros_like(br)
        for x in range(95):
            ys = np.where(br[:, x])[0]
            if len(ys): ceil[:ys.max() + 1, x] = True
        ceil[:32] = True                                                      # the ring's shadowed crown
    else:
        ceil = (r > g + 6) & (g > b + 4) & (r - b > 35) & (r > 80)            # wood
        ceil[:58] = True; ceil[110:] = False                                  # the beam band, and brackets above y 110
    ceil = np.asarray(Image.fromarray(ceil.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.7))) / 255
    piece = up.copy(); piece[..., 3] = (piece[..., 3] * (1 - ceil)).astype(np.uint8)
    J.setdefault(f, {})['up'] = save(piece, x0, 0, f'{f}-up')
json.dump(J, open(f'{out}/ladder.json', 'w'), indent=1); print(J)
