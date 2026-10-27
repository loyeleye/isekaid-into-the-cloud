#!/usr/bin/env python3
# Ported from the first game, Isekai'd Into Prod (loyeleye/system-design-study, game/tools/app_icon.py), with this
# game's own picture.
# The home-screen icon (manifest.webmanifest, apple-touch-icon in index.html): the title screen in a square. The storm
# sky and rain, Freya's halo, the ridge and the four leads in silhouette (assets/img/lead), as index.html's
# #screen-title draws them. Full-bleed (phones round the corners themselves), plus a maskable copy with everything
# inside the middle 80% circle that Android may crop to.
#
#   python3 tools/app_icon.py      # writes assets/app/icon-512.png, icon-192.png, icon-180.png, icon-maskable-512.png
#                                  # and icon-maskable-192.png
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
LEAD = ROOT / 'assets' / 'img' / 'lead'
OUT = ROOT / 'assets' / 'app'  # not under assets/img, so the artifact's image pack (tools/artifact_page.py) skips them
N = 512
GOLD = (214, 178, 84)  # the halo's rgba(214, 178, 84)
RIM = (214, 205, 185)  # the leads' drop-shadow rim


def lerp(a, b, k):
    return tuple(round(x + (y - x) * k) for x, y in zip(a, b))


def sky():
    # #screen-title's gradient: #0c0b12, #1d1b27 45%, #34303f 78%, #2a2632
    stops = [(0, (0x0c, 0x0b, 0x12)), (.45, (0x1d, 0x1b, 0x27)), (.78, (0x34, 0x30, 0x3f)), (1, (0x2a, 0x26, 0x32))]
    im = Image.new('RGBA', (N, N))
    d = ImageDraw.Draw(im)
    for y in range(N):
        t = y / (N - 1)
        for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
            if t <= t1:
                d.line([(0, y), (N, y)], fill=lerp(c0, c1, (t - t0) / (t1 - t0)) + (255,))
                break
    # A dim cloud bank, as the title's .pcl layers
    cl = Image.new('RGBA', (N, N))
    cd = ImageDraw.Draw(cl)
    for x, y, r in [(.12, .42, .16), (.3, .38, .2), (.52, .43, .15), (.8, .36, .19), (.98, .41, .14)]:
        cd.ellipse([N * (x - r), N * (y - r * .6), N * (x + r), N * (y + r * .6)], fill=(0x2c, 0x2b, 0x3a, 150))
    im.alpha_composite(cl.filter(ImageFilter.GaussianBlur(6)))
    # Rain: thin streaks leaning as the title's 105deg gradient does
    rain = Image.new('RGBA', (N, N))
    rd = ImageDraw.Draw(rain)
    for i in range(-6, 26):
        x = i * 24
        for y0 in range(-40, N, 70):
            y = y0 + (i * 37) % 70
            rd.line([(x, y), (x - 9, y + 34)], fill=(190, 196, 220, 52), width=2)
    im.alpha_composite(rain)
    return im


def scene(k):
    # k: how much of the square the halo, ridge and leads span (1 for full-bleed, smaller for the maskable safe zone)
    im = sky()
    c = N / 2

    def at(x, y):  # a point given for the full-bleed icon, pulled in toward the middle by k
        return c + (x - c) * k, c + (y - c) * k

    # Freya's halo: a gold ring with a soft glow, and the little bug riding it
    hw, hh, hy = N * .32, N * .08, N * .18
    glow = Image.new('RGBA', (N, N))
    gd = ImageDraw.Draw(glow)
    box = [*at(c - hw, hy - hh), *at(c + hw, hy + hh)]
    gd.ellipse(box, outline=GOLD + (150,), width=round(14 * k))
    im.alpha_composite(glow.filter(ImageFilter.GaussianBlur(9 * k)))
    d = ImageDraw.Draw(im)
    d.ellipse(box, outline=GOLD + (230,), width=max(2, round(7 * k)))
    bx, by = at(c + hw * .78, hy + hh * .55)
    r = 9 * k
    d.ellipse([bx - r, by - r * .75, bx + r, by + r * .75], fill=GOLD + (255,))
    d.ellipse([bx + r * .2, by - r * .55, bx + r * .65, by - r * .1], fill=(0x3b, 0xd1, 0x6f, 255))

    # The ridge: .t-ridge's peaks across the bottom, carried past the edges so the bleed stays dark
    peaks = [(0, .38), (.09, .30), (.18, .36), (.30, .22), (.41, .30), (.50, .18), (.61, .28), (.72, .20), (.84, .33),
             (.93, .26), (1, .32)]
    top = N * .64
    pts = [at(N * x, top + N * .32 * y) for x, y in peaks]
    d.polygon([(-N, pts[0][1]), *pts, (2 * N, pts[-1][1]), (2 * N, 2 * N), (-N, 2 * N)], fill=(0x0d, 0x0c, 0x12, 255))

    # The four leads in silhouette with the title's thin light rim on top, Dutch the tallest
    leads = [('kai', 1), ('mira', 1), ('dutch-stand', 1.3), ('seoyeon', 1)]
    base_h = N * .28
    sprites = []
    for name, scale in leads:
        s = Image.open(LEAD / f'{name}.webp').convert('RGBA')
        h = round(base_h * scale * k)
        sprites.append(s.resize((round(s.width * h / s.height), h), Image.NEAREST))
    gap = round(N * .012 * k)
    total = sum(s.width for s in sprites) + gap * (len(sprites) - 1)
    x = round(c - total / 2)
    foot = at(c, top + N * .32 * .30)[1] + 6 * k
    rim = max(2, round(3 * k))
    for s in sprites:
        a = s.getchannel('A').point(lambda v: 255 if v > 96 else 0)
        y = round(foot - s.height) + (round(6 * k) if s.height > base_h * k * 1.1 else 0)
        im.paste(Image.new('RGBA', s.size, RIM + (110,)), (x, y - rim), a)
        im.paste(Image.new('RGBA', s.size, (0x15, 0x13, 0x1b, 255)), (x, y), a)
        x += s.width + gap
    return im.convert('RGB')


OUT.mkdir(exist_ok=True)
full, safe = scene(1), scene(.8)
for size in (512, 192, 180):
    full.resize((size, size), Image.LANCZOS).save(OUT / f'icon-{size}.png', optimize=True)
for size in (512, 192):
    safe.resize((size, size), Image.LANCZOS).save(OUT / f'icon-maskable-{size}.png', optimize=True)
print('wrote', ', '.join([f'icon-{n}.png' for n in (512, 192, 180)] + [f'icon-maskable-{n}.png' for n in (512, 192)]))
