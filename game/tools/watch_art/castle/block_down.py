# Locked archway overlay (Ladi, Nov 19): Sogni boarded up the ground floor's right archway in place (krea2 identity edit,
# seed 2102, of a 512x512 crop at native x 3584, y 52). Cut the boarding out by where the edit differs from the
# original, close small gaps, feather, and save it as an RGBA overlay. The box is native px around the arch centre
# (cx 3923, sill 476): x -118..+117, y -121..+46; the engine scales it for the towers' larger archways.
# usage: python3 block_down.py <ref.png> <edit.png> <out.png>
import sys, numpy as np
from PIL import Image, ImageFilter
ref, edit, out = sys.argv[1:4]
X0, Y0, CX, SILL = 3584, 52, 3923, 476
L, T, R, B = CX - 118 - X0, SILL - 121 - Y0, CX + 117 - X0, SILL + 46 - Y0
r = np.asarray(Image.open(ref).convert('RGB')).astype(int)
E = Image.open(edit).convert('RGB').resize((512, 512), Image.LANCZOS); e = np.asarray(E)
m = Image.fromarray(((np.abs(r - e.astype(int)).sum(2) > 60) * 255).astype(np.uint8))
m = m.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(3))   # denoise, small gaps
mm = np.asarray(m).copy(); yy, xx = np.mgrid[0:512, 0:512]
mm[(np.abs(xx + X0 - CX) < 74) & (yy + Y0 > 352) & (yy + Y0 < SILL)] = 255   # inside the arch: the whole boarded opening
m = Image.fromarray(mm)
m = m.filter(ImageFilter.GaussianBlur(1))
a = np.dstack([e, np.asarray(m)])[T:B, L:R].copy()
for i in range(6):                         # fade the box edges so nothing ends in a hard line
    k = int(255 * (i + 1) / 7)
    for sl in (a[:, i], a[:, -1 - i], a[i], a[-1 - i]): sl[..., 3] = np.minimum(sl[..., 3], k)
Image.fromarray(a).save(out)
