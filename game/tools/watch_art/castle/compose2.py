# Deterministic fixes on top of the Sogni corridors: patch the cellar middle vaults, copy a doorway, paste missing signs.
import numpy as np
from PIL import Image
def A(f): return np.asarray(Image.open(f).convert('RGB')).astype(float)
def paste(dst, src, box, at, flip=False, f=16, fy=True):
    x0, y0, x1, y1 = box; p = src[y0:y1, x0:x1]
    if flip: p = p[:, ::-1]
    h, w = p.shape[:2]; ax, ay = at
    wx = np.ones(w); wy = np.ones(h)
    r = np.linspace(0, 1, f); wx[:f] = np.minimum(wx[:f], r); wx[-f:] = np.minimum(wx[-f:], r[::-1])
    if fy: wy[:f] = np.minimum(wy[:f], r); wy[-f:] = np.minimum(wy[-f:], r[::-1])
    m = (wy[:, None] * wx[None, :])[..., None]
    dst[ay:ay + h, ax:ax + w] = dst[ay:ay + h, ax:ax + w] * (1 - m) + p * m
def sign(dst, name, cx, top, width):
    im = Image.open(f'hd/signs/{name}.png').convert('RGB'); a = np.asarray(im).astype(int)
    white = (a.min(axis=2) > 235)
    # flood from the border so white inside the sign survives
    from collections import deque
    H, W = white.shape; bg = np.zeros_like(white); q = deque()
    for x in range(W):
        for y in (0, H - 1):
            if white[y, x]: bg[y, x] = 1; q.append((y, x))
    for y in range(H):
        for x in (0, W - 1):
            if white[y, x] and not bg[y, x]: bg[y, x] = 1; q.append((y, x))
    while q:
        y, x = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            yy, xx = y + dy, x + dx
            if 0 <= yy < H and 0 <= xx < W and white[yy, xx] and not bg[yy, xx]: bg[yy, xx] = 1; q.append((yy, xx))
    ys, xs = np.where(~bg.astype(bool)); im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    al = Image.fromarray(((~bg.astype(bool))[ys.min():ys.max() + 1, xs.min():xs.max() + 1] * 255).astype(np.uint8))
    s = width / im.width; size = (width, round(im.height * s))
    im = np.asarray(im.resize(size, Image.NEAREST)).astype(float); al = np.asarray(al.resize(size, Image.NEAREST)).astype(float)[..., None] / 255
    x0 = cx - width // 2; h = im.shape[0]
    dst[top:top + h, x0:x0 + width] = dst[top:top + h, x0:x0 + width] * (1 - al) + im * al
def save(a, f): Image.fromarray(a.clip(0, 255).astype(np.uint8)).save(f)
# Cellars: finish the two vaults over the middle (mirror the halves we have), add the missing pier and the strongroom sign.
c = A('hd/cellars-v2.png'); b = A('hd/cellars-0b.png')
paste(c, c, (1250, 0, 1380, 160), (1780, 0), flip=True, fy=False)
paste(c, b, (2400, 0, 2650, 200), (2050, 0), flip=True, fy=False)
paste(c, c, (2630, 190, 2800, 478), (1900, 190), fy=False)
sign(c, 'key', 1440, 30, 120); save(c, 'hd/cellars-v3.png')
# Upper: swap the too-tall ledger arch for a copy of the wardrobe doorway, then hang the book sign.
u = A('hd/upper-v2.png')
paste(u, u, (2150, 85, 2490, 472), (1420, 85))
paste(u, u, (845, 160, 1135, 476), (1445, 160), fy=False)
sign(u, 'book', 1590, 52, 100); save(u, 'hd/upper-v3.png')
# Towers: carry the rafters over the middle, copy the lookout doorway to the watchtower spot, hang bell and helmet signs.
t = A('hd/towers-v2.png')
paste(t, t, (1300, 0, 1800, 85), (1795, 0), fy=False)
paste(t, t, (2200, 112, 2516, 476), (362, 112), fy=False)
sign(t, 'bell', 520, 12, 110); sign(t, 'helmet', 2786, 12, 110); save(t, 'hd/towers-v3.png')
