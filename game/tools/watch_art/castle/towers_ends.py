# Towers rooftop, part 3 (Ladi, Nov 19): the square stair turrets at both ends are replaced by the round room turret
# (the lookout's, its sign taken off by a Sogni edit, seed 3501, of a 512x512 crop at native x 2170) with a black
# doorway: the stairs down. Doorway centres stay at native x 260 and 3850.
# usage: python3 towers_ends.py <towers-roof.png> <sign-off edit.png> <out.png>
import sys, numpy as np
from PIL import Image
src, edit, out = sys.argv[1:4]
A = np.asarray(Image.open(src).convert('RGB')).copy()
E = np.asarray(Image.open(edit).convert('RGB').resize((512, 512), Image.LANCZOS)).copy()
t = E[:468, 41:470].copy()                                # turret tile (crop x 41..470 = native 2211..2640)
L, R, T = 158 - 41, 302 - 41, 265                         # its doorway opening, tile px
c, rad = (L + R) / 2, (R - L) / 2
gy, gx = np.mgrid[0:468, 0:t.shape[1]]
door = ((gy >= T + rad) | (np.hypot(gx - c, gy - (T + rad)) <= rad)) & (gx >= L) & (gx <= R) & (gy >= T)
d = np.clip(np.abs(gx - c) / rad, 0, 1)                   # black, a touch lighter at the jambs
shade = (6 + 16 * d ** 2)[..., None] * np.array([1.0, 0.95, 1.15])
t[door] = shade[door].astype(np.uint8)
g = t.astype(int); sky = (g[..., 1] > g[..., 0] + 40) & (g[..., 1] > g[..., 2] + 40)
A[18:, 0:520] = A[18:, 1340:1860]                         # clear the old stair turrets (and their stair pits) back to
A[18:, 3576:4096] = A[18:, 1340:1860]                     # parapet, sky and walkway
for x0 in (260 - int(c), 3850 - int(c)):
    reg = A[:468, x0:x0 + t.shape[1]]; reg[~sky] = t[~sky]
    xs = np.arange(L, R + 1); dd = np.clip(np.abs(xs - c) / rad, 0, 1)   # the doorway runs on down to the old sill (476)
    A[468:477, x0 + L:x0 + R + 1] = ((6 + 16 * dd ** 2)[:, None] * np.array([1.0, 0.95, 1.15]))[None].astype(np.uint8)
Image.fromarray(A).save(out)
print('tile door centre', c, 'width', R - L)
