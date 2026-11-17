"""Claim 9's freight yard art (js/rush.js, the claim 9 block): the Sogni props cut out of their grey, the fixed
props collaged onto the Sogni yard backdrop at the layouts' anchors (YARD_WIDE / YARD_TALL), and the finished
paintings and sprites written as WebP under assets/img/rush/.

  python3 tools/rush_yard_art.py cut <src_dir>                       the moving and bought pieces -> assets/img/rush/yard/
  python3 tools/rush_yard_art.py collage wide <src_dir> <out.png>    backdrop + fixed props, for the repaint
  python3 tools/rush_yard_art.py collage tall <src_dir> <out.png>    the wide backdrop cropped onto a tall canvas + props
  python3 tools/rush_yard_art.py finish wide|tall <painting.png>     -> assets/img/rush/yard-wide.webp / yard-tall.webp
  python3 tools/rush_yard_art.py extend                              the phone's bands above and below the tall stage

src_dir holds the Sogni renders (prop-*.png on light grey, yard-wide-1.png). The repaint between collage and finish
is a separate image edit (see CREDITS.md); this script makes no network calls.
"""
import os
import sys
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), '..')
OUT = os.path.join(ROOT, 'assets', 'img', 'rush')


def cutout(path):
    """The prop on a transparent background: the grey that touches the border is cleared, the edge softened."""
    im = Image.open(path).convert('RGB')
    w, h = im.size
    corners = [im.getpixel(p) for p in [(4, 4), (w - 5, 4), (4, h - 5), (w - 5, h - 5)]]
    bg = tuple(sorted(c[i] for c in corners)[2] for i in range(3))
    diff = ImageChops.difference(im, Image.new('RGB', im.size, bg)).convert('L')
    near = diff.point(lambda v: 255 if v < 22 else 0)
    # Only the background that's connected to the edge (a light patch inside the prop stays).
    mask = near.copy()
    for p in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]:
        if mask.getpixel(p) == 255:
            ImageDraw.floodfill(mask, p, 128)
    alpha = mask.point(lambda v: 0 if v == 128 else 255).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    out = im.convert('RGBA')
    out.putalpha(alpha)
    return out.crop(out.getbbox())


def fit(im, h=None, w=None):
    if h:
        return im.resize((max(1, round(im.width * h / im.height)), round(h)), Image.LANCZOS)
    return im.resize((round(w), max(1, round(im.height * w / im.width))), Image.LANCZOS)


def paste_mb(canvas, im, x, y):
    """Paste by the middle-bottom point (how js/rush.js draws 'mb' sprites)."""
    canvas.alpha_composite(im, (round(x - im.width / 2), round(y - im.height)))


# The fixed props painted into the room, by layout: (prop, x, y (mb), height or ('w', width)).
FIXED = {
    'wide': [
        ('water-tower', 1262, 458, 286), ('signal-mast', 1140, 460, 300), ('office', 1010, 458, 150),
        ('siding', 112, 454, ('w', 190)),
        ('conveyor', 160, 640, ('w', 330)), ('whistle', 112, 640, 256), ('points', 362, 642, 250),
        ('bay', 590, 652, 140), ('bay', 690, 652, 140), ('bay', 790, 652, 140), ('bay', 890, 652, 140),
    ],
    'tall': [
        ('water-tower', 700, 600, 214), ('signal-mast', 604, 602, 196), ('office', 486, 600, 112),
        ('siding', 108, 616, ('w', 176)),
        ('conveyor', 118, 1004, ('w', 250)), ('whistle', 60, 1004, 196), ('points', 340, 1112, 190),
        ('bay', 432, 1118, 104), ('bay', 516, 1118, 104), ('bay', 600, 1118, 104), ('bay', 684, 1118, 104),
    ],
}


def collage(kind, src, out):
    bg = Image.open(os.path.join(src, 'yard-wide-1.png')).convert('RGBA')
    if kind == 'wide':
        canvas = bg.resize((1344, 768), Image.LANCZOS)
    else:
        # The tall room: the left of the wide yard (the gate and the arched shed) at 0.72 scale, so the rail line's
        # depth matches the phone's human scale, with the rail at y 606. Above and below it is left flat grey for
        # the outpaint to fill with sky and cobbles.
        canvas = Image.new('RGBA', (768, 1344), (200, 200, 200, 255))
        canvas.alpha_composite(bg.crop((0, 0, 1067, 768)).resize((768, 553), Image.LANCZOS), (0, 271))
    for name, x, y, size in FIXED[kind]:
        im = cutout(os.path.join(src, 'prop-%s.png' % name))
        im = fit(im, w=size[1]) if isinstance(size, tuple) else fit(im, h=size)
        paste_mb(canvas, im, x, y)
    canvas.convert('RGB').save(out)
    print('wrote', out)


# The pieces that move or are bought stay sprites: (prop, file under assets/img/rush/yard/, height in px).
SPRITES = [
    ('platform', 'platform', 260), ('returns-wagon', 'returns', 200), ('sorter-old', 'sorter-old', 360),
    ('sorter-new', 'sorter-new', 360), ('seal', 'seal', 64), ('crate', 'crate', 180),
    ('engine', 'engine', 280), ('wagon', 'flat', 120), ('test-trolley', 'trolley', 120), ('reverse-lever', 'lever', 260),
    ('waybill', 'waybill', 110), ('waybill-gold', 'waybill-gold', 110), ('waybill-error', 'waybill-error', 110),
    ('waybill-done', 'waybill-done', 110), ('waybill-test', 'waybill-test', 110), ('board', 'i-board', 140),
    ('signal-mast', 'i-wire', 140),
]


def cut(src):
    os.makedirs(os.path.join(OUT, 'yard'), exist_ok=True)
    for name, file, h in SPRITES:
        im = fit(cutout(os.path.join(src, 'prop-%s.png' % name)), h=h)
        dst = os.path.join(OUT, 'yard', file + '.webp')
        im.save(dst, 'WEBP', quality=88, method=6)
        print('wrote', dst, im.size)


def finish(kind, path):
    size = (1344, 768) if kind == 'wide' else (768, 1344)
    im = Image.open(path).convert('RGB').resize(size, Image.LANCZOS)
    dst = os.path.join(OUT, 'yard-%s.webp' % kind)
    im.save(dst, 'WEBP', quality=86, method=6)
    print('wrote', dst)


def extend(e=240):
    """The phone's bands above and below the tall stage: the painting's own sky and cobbles mirrored out from the edge
    (seamless where they meet the stage) and darkened away from it. One file, the top strip over the bottom one."""
    im = Image.open(os.path.join(OUT, 'yard-tall.webp')).convert('RGB')
    w, h = im.size
    top = im.crop((0, 0, w, e)).transpose(Image.FLIP_TOP_BOTTOM).filter(ImageFilter.GaussianBlur(1.5))
    bot = im.crop((0, h - e, w, h)).transpose(Image.FLIP_TOP_BOTTOM).filter(ImageFilter.GaussianBlur(1.5))
    def shade(strip, far_top):
        g = Image.new('L', (1, e))
        for y in range(e):
            d = (e - 1 - y) if far_top else y
            g.putpixel((0, y), round(150 * (d / (e - 1)) ** 1.3))
        dark = Image.new('RGB', strip.size, (16, 12, 20))
        return Image.composite(dark, strip, g.resize(strip.size))
    out = Image.new('RGB', (w, e * 2))
    out.paste(shade(top, True), (0, 0))
    out.paste(shade(bot, False), (0, e))
    dst = os.path.join(OUT, 'yard-tall-ext.webp')
    out.save(dst, 'WEBP', quality=80, method=6)
    print('wrote', dst)


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'cut':
        cut(sys.argv[2])
    elif cmd == 'collage':
        collage(sys.argv[2], sys.argv[3], sys.argv[4])
    elif cmd == 'finish':
        finish(sys.argv[2], sys.argv[3])
    elif cmd == 'extend':
        extend()
