# Every floor end gets its stairs (Ladi, Nov 19): middle floors a stair up with an archway down under its high end,
# cellars a stair up at each end, towers an archway down at each end. Built from the upper floor's left stair (Sogni)
# and the option-B archway (Sogni take, completed by mirroring), colour-matched to each floor's wall.
import numpy as np
from PIL import Image
from compose2 import A, paste, save
U = A('hd/upper-v3.png'); B = A('hd/GB.png')
STAIR_L = U[:, 60:600].copy()                        # 540 wide: rises to the left, opening in the ceiling at the left
ARCH = B[60:476, 110:495].copy()                     # 385x416 archway with stairs going down
def gain(img, box):                                  # match a floor's plain wall brightness/colour
    x0, y0, x1, y1 = box; return img[y0:y1, x0:x1].reshape(-1, 3).mean(0)
UW = gain(U, (3350, 100, 3480, 300))
def put(dst, src, x, y, f=14, fy=False):
    tmp = np.zeros_like(dst); h, w = src.shape[:2]; tmp[y:y + h, x:x + w] = src
    paste(dst, tmp, (x, y, x + w, y + h), (x, y), f=f, fy=fy)
def stair(dst, side, g):
    s = STAIR_L * g
    if side == 'R': s = s[:, ::-1]
    put(dst, s, 60 if side == 'L' else 4036 - 540, 0)
def arch(dst, side, g, scale=0.6, cx=None):
    a = np.asarray(Image.fromarray(ARCH.clip(0, 255).astype(np.uint8)).resize((round(385 * scale), round(416 * scale)), Image.LANCZOS)).astype(float) * g
    if side == 'R': a = a[:, ::-1]
    h, w = a.shape[:2]; cx = cx or (200 if side == 'L' else 4096 - 200)
    put(dst, a, cx - w // 2, 476 - h, f=8, fy=False)
    return [cx - w // 2, cx + w // 2]
fp = {}
# cellars: own stair up at the left; stair up added at the right end
c = A('hd/cellars-v5.png'); gc = gain(c, (3480, 250, 3560, 420)) / UW * 1.35   # the bay is in shadow; lift the stair so it reads
stair(c, 'R', gc); save(c, 'hd/cellars-v7.png'); fp['cellars'] = {'L-up': [60, 520], 'R-up': [3496, 4036]}
# ground: existing stairs up at both ends; archways down under their high ends
g = A('hd/G4.png'); gg = gain(g, (450, 150, 560, 300)) / UW
fp['ground'] = {'L-up': [60, 560], 'L-down': arch(g, 'L', gg), 'R-up': [3420, 4030], 'R-down': arch(g, 'R', gg)}
save(g, 'hd/G7.png')
# upper: left stair up stays; the right stair (it had a pit under it) is replaced by a stair up; archways under both
u = U.copy(); stair(u, 'R', 1.0)
fp['upper'] = {'L-up': [60, 600], 'L-down': arch(u, 'L', 1.0), 'R-up': [3496, 4036], 'R-down': arch(u, 'R', 1.0)}
save(u, 'hd/upper-v7.png')
# towers: archways down at both ends only; the left stair goes back to wall
t = A('hd/towers-v6.png'); t5 = A('hd/towers-v5.png'); gt = gain(t, (1640, 120, 1840, 300)) / UW
wall = t5[85:512, 1600:1860]
for x in range(60, 700, 236):
    w = min(260, 700 - x); put(t, wall[:, :w], x, 85, f=12)
fp['towers'] = {'L-down': arch(t, 'L', gt, 0.8, 260), 'R-down': arch(t, 'R', gt, 0.8, 3850)}
save(t, 'hd/towers-v7.png')
import json; json.dump(fp, open('stairs_fp.json', 'w')); print(fp)
