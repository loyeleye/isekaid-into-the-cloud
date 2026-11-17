"""Claim 7's painted office: backdrops at human scale and the moving or bought pieces as sprites.

Sources are Ladi's Sogni renders (copied from project files claim-7/sogni/ into art-src/claim7/, which isn't committed).
The renders draw the room too big for the game's human scale (a standing adult is 300 px in the 1344x768 wide room and
224 px in the 768x1344 tall one), so each one is shrunk until its door is 2.05 m tall, set on the game's floor line,
and the rest of the canvas is filled with the render's own wall, rail, wainscot and floor: clean patches stretched
along the wallpaper's stripes, mirror-tiled across them and matched in colour at the seams. No image generation
here: PIL only.

The props are 1024x1024 on light grey: each is cut out (the grey goes transparent, and only the biggest shape is
kept, which drops the small signature in a corner), cropped and saved at twice its on-screen size.

python3 tools/office_art.py <art-src/claim7 dir> <assets/img/rush dir> [--rooms]     the collages and sprites
python3 tools/office_art.py <art-src/claim7 dir> <assets/img/rush dir> --gem-in       the repaint's inputs
python3 tools/office_art.py <art-src/claim7 dir> <assets/img/rush dir> --gem-fit NAME REPAINT.png
The repaint itself is one image edit per room, run by hand with the prompt in office_repaint_prompt.txt.
"""
import sys
from collections import deque

from PIL import Image, ImageChops, ImageFilter

SRC, OUT = sys.argv[1], sys.argv[2]


def mirror_tile(block, w, h):
    """Fill w x h by tiling block, every other copy mirrored, so the seams match."""
    bw, bh = block.size
    out = Image.new('RGB', (w, h))
    fx = block.transpose(Image.FLIP_LEFT_RIGHT)
    fy = block.transpose(Image.FLIP_TOP_BOTTOM)
    fxy = fx.transpose(Image.FLIP_TOP_BOTTOM)
    for j, y in enumerate(range(0, h, bh)):
        for i, x in enumerate(range(0, w, bw)):
            out.paste([block, fx, fy, fxy][(i % 2) + 2 * (j % 2)], (x, y))
    return out


def mean(im, box):
    return im.crop(box).resize((1, 1), Image.BOX).getpixel((0, 0))


def gain(block, target):
    """Scale block's colour by one factor per channel so its mean meets target (clamped, so no hue swings)."""
    m = mean(block, (0, 0) + block.size)
    g = [min(1.25, max(0.6, (t + 4) / (v + 4))) for v, t in zip(m, target)]
    lut = sum(([min(255, int(i * gc)) for i in range(256)] for gc in g), [])
    return block.point(lut)


def vignette(fill, side):
    """Darken the filler towards the canvas edge (side 'l' or 'r'), as the lamplight falls off."""
    w, h = fill.size
    mask = Image.new('L', (w, 1))
    for x in range(w):
        d = (w - x) / w if side == 'l' else x / w
        mask.putpixel((x, 0), int(255 * (1 - 0.45 * d)))
    mask = mask.resize((w, h))
    return Image.composite(fill, Image.new('RGB', (w, h)), mask)


def ramp(n, length, axis):
    """An 'L' mask n px across that rises from 0 to 255 along x (axis 0) or y (axis 1)."""
    line = Image.new('L', (n, 1) if axis == 0 else (1, n))
    for i in range(n):
        line.putpixel((i, 0) if axis == 0 else (0, i), int(255 * (i + 0.5) / n))
    return line.resize((n, length) if axis == 0 else (length, n))


def build(name, cfg):
    src = Image.open(f"{SRC}/{cfg['src']}").convert('RGB')
    W, H, s = cfg['W'], cfg['H'], cfg['scale']
    small = src.resize((round(src.width * s), round(src.height * s)), Image.LANCZOS)
    sw, sh = small.size
    ox, oy = cfg['ox'], cfg['oy']
    Y = lambda v: round(v * s)  # a source length, scaled
    S = lambda b: tuple(round(v * s) for v in b)  # a source box, scaled

    # 1. The side walls: each band is a clean patch of the render stretched to the band's height (the wallpaper's
    #    stripes are vertical, so that doesn't show), matched in colour to a patch of the render's own edge, then
    #    mirror-tiled across and darkened towards the canvas edge.
    canvas = Image.new('RGB', (W, H))
    for (y0, y1, box, tbox) in cfg['bands']:
        block = small.crop(S(box)).resize((Y(box[2] - box[0]), y1 - y0), Image.LANCZOS)
        if tbox:
            block = gain(block, mean(small, S(tbox)))
        canvas.paste(mirror_tile(block, W, y1 - y0), (0, y0))
    lw, rw = ox, W - ox - sw
    canvas.paste(vignette(canvas.crop((0, 0, lw, H)), 'l'), (0, 0))
    canvas.paste(vignette(canvas.crop((W - rw, 0, W, H)), 'r'), (W - rw, 0))

    # 2. The middle: the render's upper wall rows stretched up to the top, then the render, then its floor stretched down.
    mid = Image.new('RGB', (sw, H))
    t0, t1 = cfg['top_rows']  # wall rows that stretch; the render itself resumes at its row t1
    body_y = oy + Y(t1)
    top_y = cfg.get('top_y', 0)
    mid.paste(small.crop((0, Y(t0), sw, Y(t1))).resize((sw, body_y - top_y + 24), Image.LANCZOS), (0, top_y))
    body = small.crop((0, Y(t1), sw, sh))
    mask = Image.new('L', body.size, 255)
    mask.paste(ramp(24, sw, 1), (0, 0))  # the render fades in over the stretched wall
    mid.paste(body, (0, body_y), mask)
    bot = oy + sh
    if bot < H:
        f0, f1 = cfg['floor_rows']
        mid.paste(small.crop((0, Y(f0), sw, Y(f1))).resize((sw, H - bot + 8)), (0, bot - 8))
    # Fade the middle's side edges into the walls.
    fl, fr = cfg.get('feather', (10, 10))
    mmask = Image.new('L', (sw, H), 255)
    if fl:
        mmask.paste(ramp(fl, H, 0), (0, 0))
    if fr:
        mmask.paste(ramp(fr, H, 0).transpose(Image.FLIP_LEFT_RIGHT), (sw - fr, 0))
    if top_y:
        canvas.paste(mid.crop((0, top_y, sw, H)), (ox, top_y), mmask.crop((0, top_y, sw, H)))
    else:
        canvas.paste(mid, (ox, 0), mmask)

    # 3. The ceiling (wide only): a lamp-free strip of the render's ceiling and beam tiled across the top, with the
    #    render's own lamp put back where it hangs, unstretched.
    if cfg.get('ceil_rows'):
        c0, c1 = cfg['ceil_rows']
        bx0, bx1 = cfg['ceil_clean']
        strip = small.crop((Y(bx0), Y(c0), Y(bx1), Y(c1)))
        canvas.paste(mirror_tile(strip, W, strip.height), (0, 0))
        lx0, lx1 = cfg['lamp_cols']
        lamp = small.crop((Y(lx0), Y(c0), Y(lx1), Y(c1)))
        lm = Image.new('L', lamp.size, 255)
        e = 14
        lm.paste(ramp(e, lamp.height, 0), (0, 0))
        lm.paste(ramp(e, lamp.height, 0).transpose(Image.FLIP_LEFT_RIGHT), (lamp.width - e, 0))
        canvas.paste(lamp, (ox + Y(lx0), 0), lm)
    canvas.save(f'{OUT}/{name}.webp', quality=90, method=6)
    canvas.save(f"{SRC}/out-{name}.png")
    print(name, 'scale', s, 'render box', (ox, oy, sw, sh), 'render resumes at y', body_y)


ROOMS = {
    # Wide: the door (y 103-662 in the render, 559 px) becomes 2.05 m = 358 px, so scale 0.64; door foot on y 640.
    # Game coords of a render point (x, y): (242 + 0.64x, 216 + 0.64y).
    'office-wide': dict(src='office-wide-1.png', W=1344, H=768, scale=0.64, ox=242, oy=640 - round(662 * 0.64),
                        ceil_rows=(0, 56), ceil_clean=(100, 500), lamp_cols=(570, 790), top_y=30,
                        top_rows=(58, 97), floor_rows=(724, 768), feather=(10, 6),
                        bands=[(30, 491, (270, 60, 345, 330), (0, 60, 12, 420)),
                               (491, 640, (395, 428, 488, 662), (0, 440, 12, 640)),
                               (640, 768, (30, 668, 240, 768), None)],
                        baskets=[]),  # the door's in-tray is already painted; the waiting basket is a sprite
    # Tall: the door (y 748-1118, 370 px) becomes 270 px, so scale 0.73; door foot on y 1090 (high enough that the
    # stools clear the phone's belt, and less bare wall above the room).
    # Game coords of a render point (x, y): (103 + 0.73x, 274 + 0.73y).
    'office-tall': dict(src='office-tall-1.png', W=768, H=1344, scale=0.73, ox=103, oy=1090 - round(1118 * 0.73),
                        top_rows=(0, 395), floor_rows=(1300, 1344), feather=(8, 8),
                        bands=[(0, 774, (0, 0, 28, 460), (755, 600, 768, 680)),
                               (774, 800, (330, 684, 470, 720), None),
                               (800, 1090, (240, 725, 330, 870), (755, 700, 768, 760)),
                               (1090, 1194, (10, 1122, 170, 1258), None),
                               (1194, 1344, (10, 1262, 170, 1344), None)],
                        # a wire in-tray sketched under the slot for the repaint (the waiting basket is a sprite)
                        baskets=[(176, 1022, 56, 22)]),
}

# ---- Sprites: (source, out name, longest side in px at 2x the on-screen size) ----
SPRITES = [
    ('latch-a.png', 'of-latch-green', 200), ('latch-b.png', 'of-latch-grey', 200), ('latch-c.png', 'of-latch-red', 200),
    ('cabinet-sign-a.png', 'of-sign-anyone', 180), ('cabinet-sign-b.png', 'of-sign-office', 180), ('cabinet-sign-c.png', 'of-sign-riverside', 180),
    ('desk-lock-a.png', 'of-lock', 120), ('desk-lock-b.png', 'of-lock-turned', 120),
    ('mira-seated.png', 'of-mira', 320), ('badge.png', 'of-badge', 110), ('keyring.png', 'of-keyring', 120),
    ('data-key-pad.png', 'of-pad', 100), ('key-tin.png', 'of-tin', 100), ('param-drawer.png', 'of-param', 150),
    ('safe-a.png', 'of-safe', 160), ('safe-b.png', 'of-safe-turning', 160), ('sticky-note.png', 'of-note', 90),
    ('dumbwaiter-b.png', 'of-waiter', 190), ('shredder-b.png', 'of-shredding', 170), ('keybox-c.png', 'of-keybox-red', 190),
    ('postcard.png', 'of-env', 100), ('parcel.png', 'of-parcel', 110), ('postcard-sealed.png', 'of-env-sealed', 100),
    ('parcel-sealed.png', 'of-parcel-sealed', 110), ('riverside.png', 'of-env-riverside', 100), ('lookup.png', 'of-env-lookup', 100),
    ('hood.png', 'of-env-hood', 100), ('thief.png', 'of-env-thief', 110), ('denied.png', 'of-env-denied', 100),
]


def cutout(path, size):
    im = Image.open(path).convert('RGB')
    w, h = im.size
    # The background: the median of the border pixels.
    border = [im.getpixel((x, 0)) for x in range(0, w, 8)] + [im.getpixel((x, h - 1)) for x in range(0, w, 8)] + \
             [im.getpixel((0, y)) for y in range(0, h, 8)] + [im.getpixel((w - 1, y)) for y in range(0, h, 8)]
    bg = tuple(sorted(c[i] for c in border)[len(border) // 2] for i in range(3))
    diff = ImageChops.difference(im, Image.new('RGB', im.size, bg)).convert('L')
    # Pale but coloured paint (skin, cream paper) is as bright as the grey, so colour counts as well as brightness.
    sat = im.convert('HSV').split()[1]
    bg_sat = sorted(sat.getpixel((x, 0)) for x in range(0, w, 8))[w // 16]
    diff = ImageChops.lighter(diff, sat.point(lambda v: max(0, int((v - bg_sat - 6) * 1.6))))
    # Near the grey: transparent; a little further: partly (soft edges and shadows fade out).
    lo, hi = 22, 52
    alpha = diff.point(lambda v: 0 if v <= lo else 255 if v >= hi else int(255 * (v - lo) / (hi - lo)))
    # Only grey that reaches the border is background: pale insides (paper, a face, a white sign) stay opaque.
    # Worked at a quarter size, with the outline thickened a little so the fill can't leak through small gaps.
    q4 = (w // 4, h // 4)
    solid = alpha.resize(q4).point(lambda v: 255 if v > 60 else 0).filter(ImageFilter.MaxFilter(3))
    sw, sh = q4
    sp = solid.load()
    outside = Image.new('L', q4, 0)
    op = outside.load()
    q = deque((x, y) for x in range(sw) for y in (0, sh - 1)) + deque((x, y) for y in range(sh) for x in (0, sw - 1))
    while q:
        a, b = q.popleft()
        if 0 <= a < sw and 0 <= b < sh and not sp[a, b] and not op[a, b]:
            op[a, b] = 255
            q.extend(((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)))
    inside = outside.point(lambda v: 255 - v).filter(ImageFilter.MinFilter(3)).resize((w, h)).filter(ImageFilter.GaussianBlur(2))
    alpha = ImageChops.lighter(alpha, inside)
    # Keep the biggest shape only (drops signatures and specks).
    small = alpha.resize(q4).point(lambda v: 255 if v > 60 else 0)
    px = small.load()
    seen = [[False] * sh for _ in range(sw)]
    best = []
    for x in range(sw):
        for y in range(sh):
            if px[x, y] and not seen[x][y]:
                comp, q = [], deque([(x, y)])
                seen[x][y] = True
                while q:
                    a, b = q.popleft()
                    comp.append((a, b))
                    for na, nb in ((a + 1, b), (a - 1, b), (a, b + 1), (a, b - 1)):
                        if 0 <= na < sw and 0 <= nb < sh and px[na, nb] and not seen[na][nb]:
                            seen[na][nb] = True
                            q.append((na, nb))
                if len(comp) > len(best):
                    best = comp
    keep = Image.new('L', (sw, sh), 0)
    kp = keep.load()
    for a, b in best:
        kp[a, b] = 255
    keep = keep.filter(ImageFilter.MaxFilter(5)).resize((w, h))
    alpha = ImageChops.multiply(alpha, keep)
    rgba = im.copy()
    rgba.putalpha(alpha)
    box = alpha.point(lambda v: 255 if v > 40 else 0).getbbox()
    rgba = rgba.crop(box)
    k = size / max(rgba.size)
    return rgba.resize((max(1, round(rgba.width * k)), max(1, round(rgba.height * k))), Image.LANCZOS)


# ---- The repaint: the collage goes through one image edit (see CREDITS.md) so the stretched walls, the side bands and
#      the seams become one painting. These two steps prepare its input and fit its output back on the layout. ----
def sketch_baskets(im, cfg):
    """Rough wire baskets where the layout wants them, for the repaint to paint properly."""
    from PIL import ImageDraw
    d = ImageDraw.Draw(im)
    for (x, y, w, h) in cfg.get('baskets', []):
        d.rectangle((x - w / 2, y - h, x + w / 2, y), fill=(52, 40, 30), outline=(150, 150, 150), width=3)
        for i in range(1, 6):
            xx = x - w / 2 + i * w / 6
            d.line((xx, y - h, xx, y), fill=(150, 150, 150), width=2)
        d.line((x - w / 2, y - h / 2, x + w / 2, y - h / 2), fill=(150, 150, 150), width=2)
    return im


def gem_input(name, cfg):
    """The collage with its baskets, padded to an exact 16:9 or 9:16 frame (the edit keeps that ratio)."""
    im = sketch_baskets(Image.open(f'{SRC}/out-{name}.png').convert('RGB'), cfg)
    W, H = im.size
    PW, PH = (round(H * 16 / 9), H) if W > H else (W, round(W * 16 / 9))
    pad = Image.new('RGB', (PW, PH))
    pad.paste(im, (0, 0))
    if PW > W:
        pad.paste(im.crop((W - (PW - W), 0, W, H)).transpose(Image.FLIP_LEFT_RIGHT), (W, 0))
    if PH > H:
        pad.paste(im.crop((0, H - (PH - H), W, H)).transpose(Image.FLIP_TOP_BOTTOM), (0, H))
    pad.save(f'{SRC}/gem-in-{name}.png')
    print('wrote', f'{SRC}/gem-in-{name}.png', pad.size)


def shift_between(a, b):
    """How far b is moved from a, by phase correlation of their edges (whole pixels)."""
    import numpy as np
    def edges(im):
        g = np.asarray(im.convert('L').filter(ImageFilter.FIND_EDGES), dtype=float)
        return g - g.mean()
    A, B = np.fft.fft2(edges(a)), np.fft.fft2(edges(b))
    r = A.conj() * B
    c = np.fft.ifft2(r / (np.abs(r) + 1e-9)).real
    dy, dx = np.unravel_index(np.argmax(c), c.shape)
    h, w = c.shape
    return (dx - w if dx > w // 2 else dx), (dy - h if dy > h // 2 else dy)


def gem_fit(name, cfg, out_png):
    """The repainted frame scaled to the padded size, moved back if it drifted, cropped to the game's size."""
    W, H = cfg['W'], cfg['H']
    ref = Image.open(f'{SRC}/gem-in-{name}.png').convert('RGB')
    im = Image.open(out_png).convert('RGB').resize(ref.size, Image.LANCZOS)
    dx, dy = shift_between(ref, im)
    print(name, 'repaint drifted by', (dx, dy))
    if abs(dx) > 40 or abs(dy) > 40:
        sys.exit('drift too large: check the repaint by eye')
    moved = Image.new('RGB', im.size)
    moved.paste(im, (-dx, -dy))
    fixed = moved.crop((0, 0, W, H))
    # Whatever the shift left uncovered at the edges comes from the collage.
    if dx or dy:
        base = Image.open(f'{SRC}/out-{name}.png').convert('RGB')
        mask = Image.new('L', (W, H), 0)
        from PIL import ImageDraw
        ImageDraw.Draw(mask).rectangle((max(0, -dx), max(0, -dy), W - 1 - max(0, dx), H - 1 - max(0, dy)), fill=255)
        fixed = Image.composite(fixed, base, mask)
    fixed.save(f'{OUT}/{name}.webp', quality=90, method=6)
    fixed.save(f'{SRC}/painted-{name}.png')
    print('wrote', f'{OUT}/{name}.webp')


if __name__ == '__main__':
    if '--gem-in' in sys.argv:  # office_art.py SRC OUT --gem-in: the repaint's inputs, from the collages
        for name, cfg in ROOMS.items():
            gem_input(name, cfg)
        sys.exit()
    if '--gem-fit' in sys.argv:  # office_art.py SRC OUT --gem-fit NAME REPAINT.png
        i = sys.argv.index('--gem-fit')
        gem_fit(sys.argv[i + 1], ROOMS[sys.argv[i + 1]], sys.argv[i + 2])
        sys.exit()
    for name, cfg in ROOMS.items():
        build(name, cfg)
    if '--rooms' in sys.argv:
        sys.exit()
    for src, name, size in SPRITES:
        sp = cutout(f'{SRC}/{src}', size)
        sp.save(f'{OUT}/{name}.webp', quality=90, method=6)
        print(name, sp.size)
