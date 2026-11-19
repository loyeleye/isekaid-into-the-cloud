# Barricades that follow each stair's slope (Ladi, Nov 19): two posts standing on the stair's own treads, two planks
# nailed along the slope between them, a rope with a red tag. Drawn in code at native px (4096-wide floor), one per
# rising stair, since tread positions differ per stair. Writes <out>/<floor>-<id>.png (RGBA) and boxes to barricades.json.
import json, sys, numpy as np
from PIL import Image, ImageDraw
out = sys.argv[1]
WOOD, DARK, LITE, NAIL, ROPE, TAG = (126, 74, 40), (66, 38, 20), (168, 108, 62), (58, 58, 64), (196, 160, 104), (190, 36, 36)
# (floor, id): lower post (x, tread y), upper post (x, tread y), measured on the painted stairs
U_L = ((550, 456), (440, 378)); U_R = tuple((4095 - x, y) for x, y in U_L)
STAIRS = {('cellars', 'stair-left'): U_L, ('cellars', 'east-cellar-stair'): U_R,
          ('ground', 'west-mid-stair'): ((455, 452), (355, 382)), ('ground', 'stair-right'): ((3430, 442), (3522, 372)),
          ('upper', 'back-stair'): U_L, ('upper', 'east-tower-stair'): U_R}
PH = 84
def draw(p1, p2):
    (x1, y1), (x2, y2) = p1, p2
    x0, x3 = min(x1, x2) - 40, max(x1, x2) + 40; ytop = min(y1, y2) - PH - 14; ybot = max(y1, y2) + 2
    im = Image.new('RGBA', (x3 - x0, ybot - ytop)); d = ImageDraw.Draw(im)
    L = lambda x, y: (x - x0, y - ytop)
    for (px, py) in (p1, p2):                                  # posts, feet on the tread
        d.rectangle([L(px - 5, py - PH), L(px + 5, py)], fill=WOOD); d.line([L(px - 5, py - PH), L(px - 5, py)], fill=LITE, width=2)
        d.line([L(px + 5, py - PH), L(px + 5, py)], fill=DARK, width=2); d.rectangle([L(px - 6, py - PH - 3), L(px + 6, py - PH)], fill=DARK)
        d.rectangle([L(px - 8, py - 3), L(px + 8, py)], fill=(40, 34, 32, 150))   # contact shadow on the tread
    dx, dy = x2 - x1, y2 - y1; n = (dx * dx + dy * dy) ** 0.5; ux, uy = dx / n, dy / n
    def plank(a, b, w=16):
        prof = [DARK] + [LITE] * 3 + [WOOD] * (w - 6) + [DARK] * 2
        for k, c in enumerate(prof): d.line([L(a[0], a[1] - w // 2 + k), L(b[0], b[1] - w // 2 + k)], fill=c, width=1)
    # a crossed brace between the posts (behind), then two planks along the stair slope (front)
    plank((x1, y1 - 10), (x2, y2 - PH + 10), 14); plank((x2, y2 - 10), (x1, y1 - PH + 10), 14)
    for off in (PH - 16, PH - 50):                              # two planks parallel to the stair slope
        a = (x1 - ux * 30, y1 - off - uy * 30); b = (x2 + ux * 30, y2 - off + uy * 30)
        plank(a, b)
        for (px, py) in (p1, p2):
            t = (px - a[0]) / (b[0] - a[0]); yy = a[1] + t * (b[1] - a[1])
            d.rectangle([L(px - 1, yy - 2), L(px + 1, yy)], fill=NAIL)
    # rope between the post tops, sagging, with a red tag at the middle
    pts = []
    for i in range(21):
        t = i / 20; x = x1 + t * dx; y = (y1 - PH + 2) + t * dy + 10 * 4 * t * (1 - t); pts.append(L(x, y))
    d.line(pts, fill=ROPE, width=3); mx, my = pts[10]
    d.polygon([(mx - 8, my + 1), (mx + 8, my + 1), (mx + 8, my + 26), (mx, my + 19), (mx - 8, my + 26)], fill=TAG); d.line([(mx - 8, my + 1), (mx - 8, my + 26)], fill=(120, 20, 20), width=2)
    return im, [x0, ytop, x3, ybot]
boxes = {}
for (f, sid), (p1, p2) in STAIRS.items():
    im, box = draw(p1, p2); im.save(f'{out}/{f}-{sid}.png'); boxes[f'{f}/{sid}'] = box
json.dump(boxes, open(f'{out}/barricades.json', 'w'), indent=1); print(boxes)
