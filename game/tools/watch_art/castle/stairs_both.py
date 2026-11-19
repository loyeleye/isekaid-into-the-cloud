# Every floor end gets its stairs (Ladi, Nov 19): middle floors a stair up with an archway down under its high end,
# cellars a stair up at each end, towers an archway down at each end. Built from the upper floor's left stair (Sogni)
# and the option-B archway (Sogni take, completed by mirroring), colour-matched to each floor's wall.
import numpy as np
from PIL import Image
from compose2 import A, paste, save
U = A('hd/upper-v3.png'); B = A('hd/GB.png')
STAIR_L = U[:512, 60:600].copy()                        # 540 wide: rises to the left, opening in the ceiling at the left
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
    put(dst, s, 60 if side == 'L' else 4036 - 540, 0)   # stair rows 0..512 only
ARCH2 = np.asarray(Image.open('hd/arch2.png').convert('RGBA')).astype(float)   # arch2.py: sill at y=426, pit below
H = 564
def tall(img):                                       # floors grow to 564 so the pits under the archways show
    out = np.zeros((H, 4096, 3)); out[:] = (24, 20, 26); out[:img.shape[0]] = img[:H]; return out
def arch(dst, side, g, scale=0.5, cx=None):
    h, w = round(ARCH2.shape[0] * scale), round(ARCH2.shape[1] * scale)
    a = np.asarray(Image.fromarray(ARCH2.clip(0, 255).astype(np.uint8), 'RGBA').resize((w, h), Image.LANCZOS)).astype(float)
    if side == 'R': a = a[:, ::-1]
    cx = cx or (172 if side == 'L' else 4095 - 172)
    x0 = cx - w // 2; y0 = 476 - round(426 * scale)
    rgb = a[..., :3] * g; al = a[..., 3:4] / 255
    # soft edge on the wall part only (top and sides), so the arch sits into the wall
    f = 8; e = np.ones((h, w))
    r = np.linspace(0, 1, f); e[:, :f] *= r; e[:, -f:] *= r[::-1]; e[:f] *= r[:, None]
    sill = round(426 * scale); e[sill - 2:] = 1
    dst[y0:y0 + h, x0:x0 + w] = dst[y0:y0 + h, x0:x0 + w] * (1 - al) + rgb * al
    return [x0, x0 + w]
fp = {}
# cellars: own stair up at the left; stair up added at the right end
c = tall(A('hd/cellars-v5.png')); gc = gain(c, (3480, 250, 3560, 420)) / UW * 1.35   # the bay is in shadow; lift the stair so it reads
stair(c, 'R', gc); save(c, 'hd/cellars-v7.png'); fp['cellars'] = {'L-up': [60, 520], 'R-up': [3496, 4036]}
# ground: existing stairs up at both ends; archways down under their high ends
g = tall(A('hd/G4.png')); gg = gain(g, (450, 150, 560, 300)) / UW
fp['ground'] = {'L-up': [60, 560], 'L-down': arch(g, 'L', gg), 'R-up': [3420, 4030], 'R-down': arch(g, 'R', gg)}
save(g, 'hd/G7.png')
# upper: left stair up stays; the right stair (it had a pit under it) is replaced by a stair up; archways under both
u = tall(U); stair(u, 'R', 1.0)
fp['upper'] = {'L-up': [60, 600], 'L-down': arch(u, 'L', 1.0), 'R-up': [3496, 4036], 'R-down': arch(u, 'R', 1.0)}
save(u, 'hd/upper-v7.png')
# towers: archways down at both ends only; the left stair goes back to wall
t = tall(A('hd/towers-v6.png')); t5 = A('hd/towers-v5.png'); gt = gain(t, (1640, 120, 1840, 300)) / UW
wall = t5[85:512, 1600:1860]
for x in range(60, 700, 236):
    w = min(260, 700 - x); put(t, wall[:, :w], x, 85, f=12)
fp['towers'] = {'L-down': arch(t, 'L', gt, 0.7, 260), 'R-down': arch(t, 'R', gt, 0.7, 3850)}
save(t, 'hd/towers-v7.png')
import json; json.dump(fp, open('stairs_fp.json', 'w')); print(fp)
