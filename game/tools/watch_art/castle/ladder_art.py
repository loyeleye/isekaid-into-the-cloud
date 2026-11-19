# The unlocked ladder (Ladi, Nov 19). Sogni (krea2 identity edit, seed 3601) painted, in place, the towers' trapdoor
# open with a ladder standing in it, and a ladder up to a hatch in the cellar vault. Sogni's content filter withheld
# every take on the ground and upper floor crops, so those floors reuse the towers' open trapdoor (down) and a ladder
# built by stacking one rung-length of the towers' ladder up to the ceiling with a dark hatch (up).
# Writes <out>/<floor>-<down|up>.png (RGBA) and <out>/ladder.json: native box [x0, y0, x1, y1] per piece.
# usage: python3 ladder_art.py <dir with <floor>-ref.png, towers-3601.png, cellars-3601.png> <out>
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
hatch = np.zeros((44, 125, 4), np.uint8); hatch[..., :3] = (14, 11, 10); hatch[..., 3] = 255   # the dark hatch in the ceiling
hatch[-5:, :, :3] = (96, 66, 38); hatch[:, :5, :3] = (96, 66, 38); hatch[:, -5:, :3] = (96, 66, 38)
canvas = np.zeros((470, 125, 4), np.uint8); canvas[:44] = hatch
m = up[..., 3:] / 255; canvas[:, 15:110] = (canvas[:, 15:110] * (1 - m) + up * m).astype(np.uint8); canvas[:, 15:110, 3] = np.maximum(canvas[:, 15:110, 3], up[..., 3])
for f in ('ground', 'upper'):
    J[f]['up'] = save(canvas, 1749 + 205 - 15, 0, f'{f}-up')
# cellars: Sogni's ladder up to the vault hatch (crop at native x 1738, y 52)
cr, ce = load(f'{d}/cellars-ref.png'), load(f'{d}/cellars-3601.png')
J['cellars'] = {'up': save(cut(cr, ce, region(150, 470, 0, 440)), 1738, 52, 'cellars-up')}
json.dump(J, open(f'{out}/ladder.json', 'w'), indent=1); print(J)
