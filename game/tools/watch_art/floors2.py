import json, numpy as np
from PIL import Image, ImageDraw
FW = 1200
# floor line y in the 1600x450 preview space, and geometry measured on the renders (x in the 1200-wide floor)
G = {
 'towers':  {'floor': 343, 'cut': 95, 'rooms': [['watchtower', 166, 412], ['lookout', 412, 660], ['captain', 660, 1148]], 'doors': {'lookout': 562, 'captain': 810}},
 'upper':   {'floor': 402, 'cut': 115, 'rooms': [['wardrobe', 191, 600], ['ledger', 600, 806], ['bridge-tower', 806, 1016]], 'doors': {'ledger': 712, 'bridge-tower': 919}},
 'ground':  {'floor': 380, 'cut': 105, 'rooms': [['gate', 150, 375], ['hall', 375, 600], ['post-room', 600, 825], ['tavern', 825, 1050]], 'doors': {'hall': 431, 'post-room': 660, 'tavern': 885}},
 'cellars': {'floor': 350, 'cut': 110, 'rooms': [['archive', 161, 382], ['strongroom', 382, 600], ['barracks', 600, 1065]], 'doors': {'strongroom': 490, 'barracks': 712}},
}
def green_doors(a):
    r, g, b = (a[:, :, i].astype(int) for i in range(3))
    m = (g > r + 22) & (g > b + 22) & (g > 90)
    # grow by one pixel to catch the anti-aliased rim
    m2 = m.copy(); m2[1:] |= m[:-1]; m2[:-1] |= m[1:]; m2[:, 1:] |= m[:, :-1]; m2[:, :-1] |= m[:, 1:]
    return m2 & (g > np.minimum(r, b) + 8)
def sill_windows(im, y0=205, y1=272):
    # Ladi, Nov 18: the ground floor's tall windows ran down behind the doorway arches. End each window at a stone
    # sill at y0 (1600x450 space) and wall up the rest: window green still connected straight down from y0 becomes
    # stone (from a plain patch of the same wall); the doorways' own green, inside their arches, is left alone.
    a = np.asarray(im).copy(); g = green_doors(np.dstack([a, np.full(a.shape[:2], 255, np.uint8)]))
    tile = a[y0:y1, 525:600].copy(); th, tw = tile.shape[:2]
    for x in range(a.shape[1]):
        if not g[y0 - 1, x]: continue
        for y in range(y0, y1):
            if not g[y, x]: break
            a[y, x] = tile[(y - y0) % th, x % tw]
    for x in range(1, a.shape[1] - 1):        # the sill: a light stone ledge with a shadow under it
        if g[y0 - 1, x] or g[y0 - 1, x - 1] or g[y0 - 1, x + 1]:
            a[y0:y0 + 3, x] = (176, 166, 146); a[y0 + 3, x] = (60, 54, 52)
    return Image.fromarray(a)
def build(f, closed=True):
    im = Image.open(f'pano/{f}-f.png').convert('RGB').resize((1600, 450), Image.LANCZOS)
    if f == 'ground': im = sill_windows(im)
    s = FW / 1600; im = im.resize((FW, round(450 * s)), Image.LANCZOS); a = np.asarray(im.convert('RGBA')).copy()
    m = green_doors(a)
    # green that reaches down to the floor is an open doorway: paint it as a dark passage; the rest are windows: transparent
    H = a.shape[0]; fl = round(G[f]['floor'] * s)
    ys, xs = np.where(m); door = ys >= fl - G[f]['cut']
    a[ys[door], xs[door], :3] = (22, 18, 24); a[ys[door], xs[door], 3] = 255
    a[ys[~door], xs[~door], 3] = 0
    out = Image.new('RGBA', (FW, 360), (0, 0, 0, 0) if f == 'towers' else (24, 20, 26, 255))
    out.paste(Image.fromarray(a, 'RGBA'), (0, 300 - fl))  # paste, not composite: windows stay see-through
    return ends(f, out) if closed else out
def ends(f, out, W=32):
    # Ladi, Nov 18: every floor is closed at both ends by a solid stone wall; the upper floor's right end keeps the
    # bridge door, opened so the way out to the bridge shows.
    a = np.asarray(out).copy(); FL = 300
    tile = np.asarray(out if f == 'upper' else build('upper', False))[150:214, FW - W:FW].copy()   # stone from the upper floor's right end
    for x0 in (0, FW - W):
        for y in range(0, FL + 6, tile.shape[0]):
            h = min(tile.shape[0], FL + 6 - y); a[y:y + h, x0:x0 + W] = tile[:h]
        a[:FL + 6, x0 + (W - 2 if x0 == 0 else 0):x0 + (W if x0 == 0 else 2), :3] = (40, 34, 36)   # inner edge
    if f == 'towers':   # the open battlement past the left end: fill the sky behind it with wall
        bb = a[:, :170].astype(int); sky = (a[:, :170, 3] < 128) | ((bb[..., 2] > bb[..., 0] + 30) & (bb[..., 2] > 120)); t = np.tile(tile, (360 // tile.shape[0] + 1, 170 // W + 1, 1))[:360, :170]
        a[:, :170][sky] = t[sky]
    if f == 'upper':    # open the bridge door: the wooden leaf becomes a dark open archway
        cx, top, bot, rr = 1077, 74, 201, 26
        yy, xx = np.mgrid[0:360, 0:FW]
        arch = (np.abs(xx - cx) <= rr) & (yy <= bot) & ((yy >= top) | ((xx - cx) ** 2 + (yy - top) ** 2 <= rr * rr))
        a[arch, :3] = (22, 18, 24); a[arch, 3] = 255
    return shaft(f, Image.fromarray(a, 'RGBA'), tile)
SW = 96   # the hoist shaft added outside the left end wall; every x in G is shifted by SW in the final layer
def shaft(f, wall, tile):
    # Ladi, Nov 18: the elevator (supply hoist) goes on the side: a shaft past the left end wall, reached by a doorway
    # through that wall. The engine draws the platform and gate props in it once the hoist is unlocked.
    out = Image.new('RGBA', (FW + SW, 360)); out.paste(wall, (SW, 0)); a = np.asarray(out).copy(); FL = 300
    th, tw = tile.shape[:2]
    for y in range(0, 360, th):
        for x in range(0, SW, tw):
            h, w = min(th, 360 - y), min(tw, SW - x); a[y:y + h, x:x + w] = tile[:h, :w]
    a[:, 14:SW, :3] = (a[:, 14:SW, :3] * 0.3).astype(np.uint8)                  # the shaft's dark inside
    a[:, 12:14, :3] = (40, 34, 36)
    for rx in (24, 84):                                                            # wooden guide rails
        a[:, rx:rx + 5, :3] = (104, 74, 46); a[:, rx, :3] = (70, 50, 32); a[:, rx + 4, :3] = (130, 96, 60)
        a[::40, rx:rx + 5, :3] = (60, 44, 30)
    a[:, 55:57, :3] = (150, 128, 92)                                               # the hoist rope
    a[FL:FL + 6, 14:SW, :3] = (82, 76, 74); a[FL, 14:SW, :3] = (120, 112, 104)     # landing sill at floor level
    # doorway through the end wall into the shaft
    yy, xx = np.mgrid[0:360, 0:FW + SW]; cx, top, rr = SW + 15, FL - 92, 19
    door = (np.abs(xx - cx) <= rr) & (yy < FL) & ((yy >= top) | (np.hypot(xx - cx, yy - top) <= rr))
    rim = (np.abs(xx - cx) <= rr + 4) & (yy < FL) & ((yy >= top) | (np.hypot(xx - cx, yy - top) <= rr + 4)) & ~door
    a[rim, :3] = (150, 140, 124); a[door, :3] = (22, 18, 24); a[door | rim, 3] = 255
    # Ladi, Nov 18: the way to the hoist must be open. Arches through whatever solid masonry stands between the
    # left doorway and the rooms: under the left stair (upper, ground) and through the cellar's pier.
    for x0, x1 in {'upper': [(98, 188)], 'ground': [(98, 186)], 'cellars': [(212, 250)]}.get(f, []):
        cx, rr = (x0 + x1) / 2, (x1 - x0) / 2; dx = np.clip(np.abs(xx - cx) / rr, 0, 1)
        top = FL - 112 + 26 * dx ** 2 if rr > 30 else FL - 104 + rr - np.sqrt(np.clip(rr * rr - (xx - cx) ** 2, 0, None))
        door = (np.abs(xx - cx) <= rr) & (yy < FL) & (yy >= top)
        grow = (np.abs(xx - cx) <= rr + 4) & (yy < FL) & (yy >= top - 4)
        rim = grow & ~door
        a[rim, :3] = (150, 140, 124); a[door, :3] = (26, 22, 28); a[door | rim, 3] = 255
    if f == 'towers':   # a level walkway branching off the top of the stairs to the hoist doorway
        a[FL:FL + 12, SW - 4:262, :3] = (138, 130, 118); a[FL, SW - 4:262, :3] = (176, 166, 146)
        a[FL + 11:FL + 14, SW - 4:262, :3] = (52, 46, 46)
        for x in range(SW + 6, 262, 18): a[FL + 1:FL + 11, x, :3] = (96, 90, 84)
        for x in (SW + 10, 196): a[FL + 12:FL + 60, x:x + 8, :3] = (110, 102, 94); a[FL + 12:FL + 60, x, :3] = (70, 64, 60)
        a[FL - 16:FL, SW + 36:262, :3] = np.where(a[FL - 16:FL, SW + 36:262, 3:4] > 0, a[FL - 16:FL, SW + 36:262, :3], 0)
        for x in range(SW + 36, 262, 24): a[FL - 18:FL, x:x + 3, :3] = (92, 66, 42); a[FL - 18:FL, x:x + 3, 3] = 255
        a[FL - 19:FL - 16, SW + 36:262, :3] = (120, 88, 56); a[FL - 19:FL - 16, SW + 36:262, 3] = 255
    if f == 'towers':                                                              # the winch at the top
        yy, xx = np.mgrid[0:60, 14:SW]; ring = np.abs(np.hypot(xx - 55, yy - 30) - 22) < 3
        sub = a[0:60, 14:SW]; sub[ring, :3] = (120, 88, 56); a[0:60, 14:SW] = sub
        a[28:33, 30:80, :3] = (96, 68, 42)
    return Image.fromarray(a, 'RGBA')
if __name__ == '__main__':
    for f in G:
        o = build(f); o.save(f'test/floor2-{f}.png')
        d = ImageDraw.Draw(o)
        for n, a_, b_ in G[f]['rooms']: d.line([a_, 0, a_, 360], fill=(255, 0, 0, 255)); d.line([b_, 0, b_, 360], fill=(255, 0, 0, 255))
        for n, x in G[f]['doors'].items(): d.line([x, 200, x, 300], fill=(255, 255, 0, 255), width=3)
        d.line([0, 300, FW, 300], fill=(0, 255, 255, 255))
        o.save(f'test/floor2-{f}-guides.png')
