# Upper floor bridge doorway (Ladi, Nov 19): show the outdoors through it, with the bridge walkway at its foot. Sogni
# (krea2 identity edit, seed 3402) repainted a 512x512 crop at native x 2519; the opening's sky is #00FF00, keyed
# transparent on export so the game's own sky shows. The doorway part is pasted back with a feathered edge.
# usage: python3 bridge_doorway.py <upper.png> <edit.png> <out.png>
import sys, numpy as np
from PIL import Image
src, edit, out = sys.argv[1:4]
X0 = 2519; L, T, R, B, f = 90, 130, 410, 466, 10                # crop px: the arch and its opening
A = np.asarray(Image.open(src).convert('RGB')).astype(float)
E = np.asarray(Image.open(edit).convert('RGB').resize((512, 512), Image.LANCZOS)).astype(float)
w = np.ones((B - T, R - L))
for i in range(f): k = (i + 1) / (f + 1); w[:, i] *= k; w[:, -1 - i] *= k; w[i] *= k
seg = A[T:B, X0 + L:X0 + R]; A[T:B, X0 + L:X0 + R] = seg * (1 - w[..., None]) + E[T:B, L:R] * w[..., None]
Image.fromarray(A.astype(np.uint8)).save(out)
