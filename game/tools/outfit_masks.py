"""Clothing masks for the outfit recolors (js/wear.js), written to assets/img/wear/mask/<lead>-<face>.webp and <lead>-stand.webp.

usage: outfit_masks.py [--preview OUT.png]

A mask is the picture's size at 1x (the faceset's 114 x 132, the full body's own size): red where the lead's main
clothing is, green where its trim is, clear elsewhere. js/wear.js recolours those pixels and leaves the rest (skin,
hair, Mira's wolf arm, Kai's gold hand and armband, Dutch's keys) alone. Each lead's clothing is picked out by colour
(hue, saturation and value) inside the parts of the picture where clothes are, and kept out of boxes where the same
colours mean something else (Seo-yeon's black hair, the leads' eyes).
"""
import colorsys, os, sys
from PIL import Image

GAME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FACES = ['neutral', 'smile', 'sad', 'angry', 'surprised', 'tired']


def hsv(p):
    h, s, v = colorsys.rgb_to_hsv(p[0] / 255, p[1] / 255, p[2] / 255)
    return h * 360, s, v


def inside(x, y, boxes):
    return any(x0 <= x < x1 and y0 <= y < y1 for x0, y0, x1, y1 in boxes)


# Per lead and view: main / trim colour tests, the area clothes are in (fractions of the picture: x0, y0, x1, y1) and
# boxes to leave out. Tests take (h, s, v).
RULES = {
    'kai': dict(
        main=lambda h, s, v: s < 0.3 and v < 0.36,
        trim=lambda h, s, v: 25 <= h <= 55 and 0.15 <= s <= 0.55 and v >= 0.55,
        bust=dict(area=[(0, .44, 1, 1)], out=[], trimarea=[(.55, .44, 1, 1)]),
        stand=dict(area=[(0, .26, 1, .7)], out=[], trimarea=[(.5, .26, 1, .7)])),
    'mira': dict(
        main=lambda h, s, v: v < 0.24,
        trim=lambda h, s, v: s < 0.12 and v > 0.82,
        bust=dict(area=[(0, 0, 1, 1)], out=[(.3, .1, .72, .58)], chains=[(.55, .3, 1, 1)], trimarea=[(.25, .0, .78, .14), (.25, .52, .6, .75)]),
        stand=dict(area=[(0, 0, 1, 1)], out=[(.38, .1, .62, .24)], chains=[(0, .25, .4, .72)], trimarea=[(.35, 0, .65, .08)])),
    'seoyeon': dict(
        main=lambda h, s, v: (s < 0.35 or 220 <= h <= 300) and v < 0.3,
        trim=lambda h, s, v: s < 0.15 and v > 0.6,
        bust=dict(area=[(0, .66, 1, 1)], out=[]),
        stand=dict(area=[(0, .27, 1, 1)], out=[(0, .62, .3, .86)])),
    'dutch': dict(
        main=lambda h, s, v: 200 <= h <= 250 and s > 0.15 and v < 0.45,
        trim=lambda h, s, v: s < 0.12 and 0.25 < v < 0.55,
        bust=dict(area=[(0, .3, 1, 1)], out=[(.25, .0, .78, .66)], trimarea=[(.3, .6, .8, 1)]),
        stand=dict(area=[(0, .2, 1, .92)], out=[(.35, .0, .7, .22), (.32, .62, .7, 1)], trimarea=[(.3, .2, .75, .62)])),
}


def mask(lead, im, view):
    R = RULES[lead]
    rv = R[view]
    W, H = im.size
    frac = lambda boxes: [(a * W, b * H, c * W, d * H) for a, b, c, d in boxes]
    area, out, trimarea = frac(rv['area']), frac(rv['out']), frac(rv.get('trimarea', rv['area']))
    chains = frac(rv.get('chains', []))
    px = im.load()
    light = lambda x, y: 0 <= x < W and 0 <= y < H and px[x, y][3] > 128 and hsv(px[x, y])[2] > 0.6
    # Bram's chain on Mira's wolf arm: dark links drawn on white fur, so a dark pixel there with fur beside it stays.
    link = lambda x, y: inside(x, y, chains) and sum(light(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (2, 0), (-2, 0), (0, 2), (0, -2))) >= 2
    m = Image.new('RGBA', im.size, (0, 0, 0, 0))
    mp = m.load()
    for y in range(H):
        for x in range(W):
            p = px[x, y]
            if p[3] < 128 or inside(x, y, out): continue
            h, s, v = hsv(p)
            if inside(x, y, area) and R['main'](h, s, v) and not link(x, y): mp[x, y] = (255, 0, 0, 255)
            elif inside(x, y, trimarea) and R['trim'](h, s, v): mp[x, y] = (0, 255, 0, 255)
    return m


def jobs():
    for lead in RULES:
        for f in FACES:
            im = Image.open(os.path.join(GAME, 'assets/img/portraits/%s-%s.webp' % (lead, f))).convert('RGBA')
            yield lead, f, 'bust', im.resize((im.width // 3, im.height // 3), Image.NEAREST)
        yield lead, 'stand', 'stand', Image.open(os.path.join(GAME, 'assets/img/lead/%s.webp' % lead)).convert('RGBA')


if __name__ == '__main__':
    out = os.path.join(GAME, 'assets/img/wear/mask')
    os.makedirs(out, exist_ok=True)
    tiles = []
    for lead, f, view, im in jobs():
        m = mask(lead, im, view)
        m.save(os.path.join(out, '%s-%s.webp' % (lead, f)), lossless=True, method=6)
        if '--preview' in sys.argv:
            t = im.copy(); tint = Image.new('RGBA', im.size, (0, 0, 0, 0))
            tint.paste(m, (0, 0)); tint.putalpha(m.getchannel('A').point(lambda a: a * 160 // 255))
            t.alpha_composite(tint); tiles.append(t.resize((t.width * 2, t.height * 2), Image.NEAREST))
    if tiles:
        W = sum(t.width for t in tiles[:7]); H = max(t.height for t in tiles)
        sheet = Image.new('RGBA', (W, H * 4), (200, 220, 240, 255))
        for i, t in enumerate(tiles):
            r, c = divmod(i, 7)
            sheet.alpha_composite(t, (sum(x.width for x in tiles[r * 7:r * 7 + c]), r * H))
        sheet.save(sys.argv[sys.argv.index('--preview') + 1])
