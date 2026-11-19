# Cellar room doorways (Ladi, Nov 19): the doorway tile had no stone jamb on its left and a narrow stray strip of stone
# to its right. Rebuild the left side of the arch ring as a mirror of the right (stones only, the room inside is kept)
# and fill the stray strip with the dark wall beside it. All four doorways are the same tile, so fix one, paste four.
# usage: python3 cellar_doors.py <cellars.png in> <out>
import sys, numpy as np
from PIL import Image
src, out = sys.argv[1:3]
F = np.asarray(Image.open(src).convert('RGB')).astype(float)
X0, Y0 = 640, 52                       # tile window (archive doorway), 512x512
T = F[Y0:Y0 + 512, X0:X0 + 512].copy(); N = T.copy()
c, r, sp, w, sill = 217, 83, 235, 40, 413   # arch centre x, inner radius, spring line y, ring width, sill y (tile px)
yy, xx = np.mgrid[0:512, 0:512]
def inner(x, y): return np.where(y >= sp, np.abs(x - c) < r, np.hypot(x - c, y - sp) < r)
def ring_d(x, y): return np.where(y >= sp, np.abs(x - c), np.hypot(x - c, y - sp))   # distance from the arch axis
# left half: take the mirrored pixel wherever the mirror is ring stone (not the room) and inside the ring's outer edge
mx = 2 * c - xx
d = ring_d(xx, yy)
a = np.clip((r + w + 4 - d) / 6, 0, 1) * (~inner(xx, yy)) * (xx < c) * (yy <= sill) * ~((yy < 118) & (xx > 192))
a = a * (mx < 512)
src_px = T[yy, np.clip(mx, 0, 511)]
N = N * (1 - a[..., None]) + src_px * a[..., None]
# stray strip right of the doorway: dark wall copied from the wall left of the doorway, same rows, feathered
x1, x2, y1, y2, f = 352, 414, 150, 416, 6
wall = T[:, 30:30 + (x2 - x1)]
m = np.ones((512, x2 - x1)); m[:y1] = 0; m[y2:] = 0
for i in range(f): m[:, i] *= (i + 1) / (f + 1); m[:, -1 - i] *= (i + 1) / (f + 1)
for i in range(f): m[y1 + i] *= (i + 1) / (f + 1)
N[:, x1:x2] = N[:, x1:x2] * (1 - m[..., None]) + wall * m[..., None]
for dx in (0, 560, 1680, 2240):        # archive, strongroom, barracks, tavern doorways
    # paste only the doorway band (keeps each bay's own sign above it)
    band = (slice(Y0 + 118, Y0 + 512), slice(X0 + dx + 80, X0 + dx + 420))
    F[band] = N[118:512, 80:420]
Image.fromarray(F.clip(0, 255).astype(np.uint8)).save(out)
