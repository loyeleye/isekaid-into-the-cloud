"""Pack the title's painted layers (assets/img/title/) from their Sogni renders.

  python3 tools/title_backdrop_pack.py SRC_DIR

SRC_DIR holds the renders (kept in the project files under sogni/title-backdrop/):
  mtn-green.png, mtn-green-rb.png  the storm plate's mountains on green (a FLUX 3 Klein edit) and BiRefNet's cut-out of it
  cmask-y-2.png, cmask-x.png      white-on-black cloud density renders (Z-Image Turbo): a band of high cloud, a bank of fog
Writes ridge.webp (the near ridge, sitting exactly over the loop's own ridge), wisp-a.webp (high cloud) and wisp-b.webp
(fog). Each band is tinted storm violet, its density as alpha, with its ends cross-faded so it repeats seamlessly.
"""
import sys, os, numpy as np
from PIL import Image, ImageFilter
src = sys.argv[1]
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'img', 'title')
def load(n, mode='RGB'): return np.asarray(Image.open(os.path.join(src, n)).convert(mode)).astype(np.float32)
def save(arr, n):
    Image.fromarray(arr.clip(0, 255).astype(np.uint8)).save(os.path.join(out, n), quality=82, method=6); print(n, arr.shape)
# The ridge: colour from the green-screen edit (green spill turned grey), alpha from BiRefNet, and only the near, darkest
# range, filled solid below its top edge.
rgb = load('mtn-green.png'); al = load('mtn-green-rb.png', 'RGBA')[..., 3] / 255
c = np.concatenate([rgb[:6, :6].reshape(-1, 3), rgb[:6, -6:].reshape(-1, 3)]); bg = np.median(c, 0)
ka = 1 - np.clip((rgb[..., 1] - np.maximum(rgb[..., 0], rgb[..., 2])) / (bg[1] - max(bg[0], bg[2])), 0, 1)
a = al * ka ** 1.3
un = (rgb - (1 - a[..., None]) * bg) / np.maximum(a[..., None], .35)
un[..., 1] = np.minimum(un[..., 1], (un[..., 0] + un[..., 2]) / 2)
near = np.maximum.accumulate((un.mean(-1) < 34) & (a * 255 > 160), axis=0)
nmi = np.asarray(Image.fromarray((near * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))).astype(np.float32) / 255
save(np.dstack([un, a * 255 * nmi]), 'ridge.webp')
def band(n, dark, light, gain):
    g = np.clip((load(n).mean(-1) / 255 - .06) / .9, 0, 1)
    col = np.array(dark)[None, None] * (1 - g[..., None] ** 2) + np.array(light)[None, None] * g[..., None] ** 2
    w = np.dstack([col, np.clip(g * gain, 0, 1) * 255]); W = w.shape[1]; ov = W // 5
    t = np.linspace(0, 1, ov)[None, :, None]
    return np.concatenate([w[:, W - ov:] * (1 - t) + w[:, :ov] * t, w[:, ov:W - ov]], 1)
save(band('cmask-y-2.png', (38, 34, 52), (128, 118, 128), .8), 'wisp-a.webp')
save(band('cmask-x.png', (16, 15, 24), (62, 58, 76), 1.15), 'wisp-b.webp')
