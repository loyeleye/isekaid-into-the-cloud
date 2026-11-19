# Bridge (Ladi, Nov 19): a walkable stone deck behind the front parapet, with a low back parapet, so the walker reads as
# on the bridge and the hills sit beyond it. Drawn in code from the bridge's own stone. Writes street.webp (deck + bridge)
# and deck-front.webp (the front crenellations, drawn over the walker's feet at speed 1). Floor line stays at y=300.
import sys, numpy as np
from PIL import Image
D = 'assets/img/watch/floors/bridge/'
st = np.asarray(Image.open(D + 'street.webp').convert('RGBA')).astype(float); H, W = st.shape[:2]
src0 = st.copy()
course = st[312:330, 300:700, :3]                       # two courses of the bridge's dressed stone
def tile(h, w, img):
    reps = (h // img.shape[0] + 1, w // img.shape[1] + 1, 1); return np.tile(img, reps)[:h, :w]
deck = np.zeros((H, W, 4)); rng = np.random.default_rng(7)
# deck surface y 266..312 (runs on behind the front parapet's gaps): pale flagstones seen edge-on, rows narrowing
# towards the back, a thin mortar line between rows, lighter at the front
top = np.array((150, 146, 140.)); rows = [266, 272, 279, 287, 296, 306, 312]
for i in range(len(rows) - 1):
    y0, y1 = rows[i], rows[i + 1]; lit = 0.72 + 0.06 * i
    x = int(rng.integers(0, 40)) - 40
    while x < W:
        w = int(rng.integers(34, 62)); c = top * lit * rng.uniform(0.93, 1.05)
        xa, xb = max(0, x), min(W, x + w)
        if xb > xa: deck[y0:y1, xa:xb, :3] = c * rng.uniform(0.95, 1.05, (y1 - y0, xb - xa, 1)); deck[y0:y1, xa:xb, 3] = 255; deck[y0:y1, xb - 1:xb, :3] = c * 0.62
        x += w
    deck[y0, :, :3] *= 0.6
# back parapet y 250..266: a low wall of the bridge's stone, dimmer (further away), with small merlons
wall = tile(12, W, st[312:324, 300:700, :3]) * 0.6
deck[254:266, :, :3] = wall; deck[254:266, :, 3] = 255
deck[252:254, :, :3] = 70; deck[252:254, :, 3] = 255
for x in range(6, W - 16, 30):
    deck[245:252, x:x + 14, :3] = tile(7, 14, st[300:307, 352:366, :3]) * 0.58; deck[245:252, x:x + 14, 3] = 255
# composite: the bridge (towers, front parapet, arches) over the deck
a = st[..., 3:4] / 255; out = deck * (1 - a) + st * a; out[..., 3] = np.maximum(deck[..., 3], st[..., 3])
# towers stand on the deck: don't let the deck show through between a tower's base and its ground
Image.fromarray(out.clip(0, 255).astype(np.uint8), 'RGBA').save(D + 'street.webp', 'WEBP', quality=90, alpha_quality=100, method=6)
fr = np.zeros_like(src0); band = slice(296, 314); fr[band] = src0[band]
Image.fromarray(fr.astype(np.uint8), 'RGBA').save(D + 'deck-front.webp', 'WEBP', quality=90, alpha_quality=100, method=6)
print('ok')
