# Procedural pieces drawn in code: weather overlays, sparkle, tiny insects, far hills, ground strips.
import numpy as np, random, math
from PIL import Image, ImageDraw, ImageFilter
def rng(s): return random.Random(s)
def tile_rain(w=480, h=360, n=260, seed=1, heavy=False):
    r = rng(seed); im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    for _ in range(n * (2 if heavy else 1)):
        x, y = r.randrange(w), r.randrange(h); L = r.randint(8, 16) if heavy else r.randint(6, 11)
        a = r.randint(90, 170)
        for k in range(L):            # slanted streak, wraps so the tile loops
            px, py = (x - k // 3) % w, (y + k) % h
            im.putpixel((px, py), (200, 215, 235, a))
    return im
def tile_fog(w=640, h=360, seed=2, low=False, density=1.0):
    r = np.random.default_rng(seed)
    # smooth looping noise: sum of a few sines in x (period w) times a vertical profile
    xs = np.arange(w)[None, :]; ys = np.arange(h)[:, None]
    n = np.zeros((h, w))
    for k in range(1, 6):
        ph, ph2 = r.uniform(0, 6.28), r.uniform(0, 6.28)
        n += np.sin(2 * np.pi * k * xs / w + ph) * np.sin(ys / (14 + 9 * k) + ph2) / k
    n = (n - n.min()) / (n.max() - n.min())
    prof = np.exp(-((ys - (290 if low else 190) + (50 if low else 110) * (n - 0.5)) / (36 if low else 110)) ** 2)
    a = np.clip((0.35 + 0.65 * n) * prof * 150 * density, 0, 170)
    # quantise alpha into a few bands so it reads as pixel art
    a = (a // 24) * 24
    arr = np.zeros((h, w, 4), np.uint8); arr[..., :3] = (220, 226, 236); arr[..., 3] = a.astype(np.uint8)
    return Image.fromarray(arr, 'RGBA')
def tile_wind(w=640, h=360, seed=3):
    r = rng(seed); im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    for _ in range(26):                # thin gust streaks
        x, y, L = r.randrange(w), r.randrange(20, 300), r.randint(30, 80)
        for k in range(L): im.putpixel(((x + k) % w, y), (240, 244, 250, 70 + (40 if 0.3 < k / L < 0.7 else 0)))
    cols = [(196, 120, 52), (168, 150, 60), (120, 150, 60), (210, 170, 70)]
    for _ in range(16):                # tumbling leaves
        x, y = r.randrange(w), r.randrange(40, 300); c = cols[r.randrange(4)]
        for dx, dy in ((0, 0), (1, 0), (1, 1), (2, 1)): im.putpixel(((x + dx) % w, y + dy), c + (255,))
    return im
def sparkle():
    fr = []
    for s in (2, 4, 6, 4):
        im = Image.new('RGBA', (16, 16), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        d.line([8 - s, 8, 8 + s, 8], fill=(255, 246, 190, 255)); d.line([8, 8 - s, 8, 8 + s], fill=(255, 246, 190, 255))
        if s > 3: d.point([(7, 7), (9, 9), (7, 9), (9, 7)], fill=(255, 255, 255, 200))
        d.point((8, 8), fill=(255, 255, 255, 255)); fr.append(im)
    sh = Image.new('RGBA', (64, 16)); [sh.paste(f, (16 * i, 0)) for i, f in enumerate(fr)]; return sh
def insect(kind):
    # tiny 8x8 two-frame sprites: moth, bee, firefly (glow on/off)
    fr = []
    for f in range(2):
        im = Image.new('RGBA', (8, 8), (0, 0, 0, 0)); p = im.putpixel
        if kind == 'moth':
            body, wing = (110, 96, 80, 255), (214, 204, 180, 255)
            p((4, 4), body); p((5, 4), body)
            for x, y in ([(3, 2), (4, 2), (3, 3)] if f == 0 else [(3, 5), (4, 5), (3, 6)]): p((x, y), wing)
        elif kind == 'bee':
            p((3, 4), (40, 30, 20, 255)); p((4, 4), (250, 200, 40, 255)); p((5, 4), (40, 30, 20, 255)); p((6, 4), (250, 200, 40, 255))
            for x, y in ([(4, 3), (5, 2)] if f == 0 else [(4, 3), (5, 3)]): p((x, y), (230, 240, 255, 220))
        else:
            if f == 0:
                for x, y in ((3, 4), (5, 4), (4, 3), (4, 5)): p((x, y), (200, 255, 120, 120))
            p((4, 4), (230, 255, 150, 255) if f == 0 else (120, 140, 60, 255))
        fr.append(im)
    sh = Image.new('RGBA', (16, 8)); sh.paste(fr[0], (0, 0)); sh.paste(fr[1], (8, 0)); return sh
def hills(width, seed, palette, base=300, amps=(70, 45, 25), tops=(150, 200, 245)):
    # three ridgelines, back to front, hard-edged pixel art with a dithered rim
    im = Image.new('RGBA', (width, 360), (0, 0, 0, 0)); a = np.zeros((360, width, 4), np.uint8)
    r = np.random.default_rng(seed); xs = np.arange(width)
    for i, (amp, top) in enumerate(zip(amps, tops)):
        y = np.full(width, float(top))
        for k in range(1, 6):
            y += amp / k * np.sin(xs / (90 * (6 - k) + 40 * i) + r.uniform(0, 6.28))
        y = y.astype(int); c = palette[i]
        for x in range(width):
            a[y[x]:, x] = c + (255,)
            if y[x] - 1 >= 0 and x % 2 == 0: a[y[x] - 1, x] = c + (255,)
    return Image.fromarray(a, 'RGBA')
def ground(width, kind, seed=5):
    # the band under the ground line (y 300..360): road surface, edge and soil cross-section
    r = rng(seed); im = Image.new('RGBA', (width, 60), (0, 0, 0, 255)); d = ImageDraw.Draw(im)
    pal = {'cobble': [(122, 112, 104), (138, 128, 118), (106, 98, 92), (150, 140, 128)],
           'dirt': [(150, 118, 82), (138, 106, 72), (162, 130, 92), (126, 96, 66)],
           'stone': [(96, 94, 104), (110, 108, 118), (84, 82, 92), (124, 120, 130)],
           'plank': [(126, 92, 60), (112, 80, 52), (140, 104, 68), (100, 72, 46)]}[kind]
    d.rectangle([0, 0, width, 60], fill=(70, 54, 40, 255) if kind in ('dirt', 'cobble', 'plank') else (52, 50, 60, 255))
    if kind == 'cobble' or kind == 'stone':
        y = 0
        for row, hgt in enumerate((7, 7, 8, 9, 10)):
            x = -r.randint(0, 10)
            while x < width:
                w = r.randint(10, 18) if kind == 'cobble' else r.randint(24, 40)
                c = pal[r.randrange(4)]; d.rounded_rectangle([x + 1, y + 1, x + w - 1, y + hgt - 1], radius=2, fill=c)
                d.line([x + 2, y + 1, x + w - 3, y + 1], fill=tuple(min(255, v + 18) for v in c)); x += w
            y += hgt
            if y > 40: break
    elif kind == 'plank':
        for x in range(0, width, 24):
            c = pal[r.randrange(4)]; d.rectangle([x, 0, x + 23, 14], fill=c); d.line([x, 0, x, 14], fill=(70, 50, 34)); d.point((x + 4, 7), fill=(60, 44, 30))
        d.rectangle([0, 15, width, 60], fill=(50, 70, 96, 255))       # river water under the boards
        for _ in range(width // 6): d.point((r.randrange(width), r.randint(18, 58)), fill=(110, 150, 190, 255))
    else:
        d.rectangle([0, 0, width, 6], fill=pal[0])
        for _ in range(width * 3): d.point((r.randrange(width), r.randint(0, 40)), fill=pal[r.randrange(4)])
        for _ in range(width // 5):
            x = r.randrange(width); d.line([x, 0, x + r.choice((-1, 1)), -3], fill=(96, 140, 64))
    # top edge line and soil specks
    d.line([0, 0, width, 0], fill=tuple(max(0, v - 30) for v in pal[2]) + (255,))
    for _ in range(width // 3): d.point((r.randrange(width), r.randint(44, 59)), fill=(90, 70, 52, 255))
    return im
if __name__ == '__main__':
    O = 'out'
    tile_rain().save(f'{O}/weather/rain.png'); tile_rain(seed=9, heavy=True).save(f'{O}/weather/storm.png')
    tile_fog().save(f'{O}/weather/fog.png'); tile_fog(seed=4, low=True, density=1.2).save(f'{O}/weather/mist.png')
    tile_wind().save(f'{O}/weather/wind.png')
    sparkle().save(f'{O}/props/sparkle.png')
    for k in ('moth', 'bee', 'firefly'): insect(k).save(f'{O}/animals/{k}.png')
    print('ok')
