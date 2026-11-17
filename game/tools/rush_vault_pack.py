"""Pack Ladi's Sogni renders of the Records Vault (claim 6) into the game's sizes.

usage: python3 -I tools/rush_vault_pack.py SRC_DIR
SRC_DIR holds the picked takes, named as below. Backdrops are scaled to the layout size; props are cut out of their
flat light-grey background (a flood fill from the edges), trimmed, and scaled to fit the placeholder's box that
tools/rush_vault_art.js drew, so the layouts in js/rush.js stay as they are.
"""
import os, sys
from collections import deque
from PIL import Image, ImageFilter

GAME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(GAME, 'assets/img/rush')
BACK = {'vault-wide-1.png': ('vault-wide.webp', (1344, 768)), 'vault-tall-1.png': ('vault-tall.webp', (768, 1344))}
PROPS = {  # take: (file, box w, box h)
    'vault-folder-2.png': ('folder', 220, 166), 'vault-folder-done-1.png': ('folder-done', 220, 166),
    'vault-folder-bounced-2.png': ('folder-bounced', 220, 166), 'vault-drawer-2.png': ('drawer', 216, 320),
    'vault-cabinet-1.png': ('cabinet', 188, 340), 'vault-cart-1.png': ('cart', 116, 130),
    'vault-cart-bolted-2.png': ('cart-bolted', 116, 130), 'vault-desk-1.png': ('desk', 302, 300),
    'vault-tube-2.png': ('tube', 120, 560), 'vault-wheel-1.png': ('wheel', 260, 260)}


def cutout(im, tol=34):
    im = im.convert('RGBA'); w, h = im.size; px = im.load()
    bg = [px[x, y][:3] for x, y in ((2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3))]
    bg = tuple(sum(c[i] for c in bg) // 4 for i in range(3))
    near = lambda p: sum(abs(p[i] - bg[i]) for i in range(3)) < tol
    seen = bytearray(w * h); q = deque()
    for x in range(w): q.extend(((x, 0), (x, h - 1)))
    for y in range(h): q.extend(((0, y), (w - 1, y)))
    mask = Image.new('L', (w, h), 255); m = mask.load()
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or seen[y * w + x]: continue
        seen[y * w + x] = 1
        if not near(px[x, y]): continue
        m[x, y] = 0; q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    mask = mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    im.putalpha(mask)
    return im.crop(mask.point(lambda v: 255 if v > 40 else 0).getbbox())


def main(src):
    for take, (name, size) in BACK.items():
        Image.open(os.path.join(src, take)).convert('RGB').resize(size, Image.LANCZOS).save(os.path.join(OUT, name), 'WEBP', quality=86)
    for take, (name, bw, bh) in PROPS.items():
        im = cutout(Image.open(os.path.join(src, take)))
        s = min(bw * 2 / im.width, bh * 2 / im.height)  # 2x the box, for sharp scaling on big screens
        im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS).save(os.path.join(OUT, 'vault', name + '.webp'), 'WEBP', quality=88)
        print('packed', name)
    # The three folders swap in place as a ticket changes state, so they share one canvas, bottom-centred.
    fs = [Image.open(os.path.join(OUT, 'vault', n + '.webp')) for n in ('folder', 'folder-done', 'folder-bounced')]
    W, H = max(f.width for f in fs), max(f.height for f in fs)
    for n, f in zip(('folder', 'folder-done', 'folder-bounced'), fs):
        c = Image.new('RGBA', (W, H), (0, 0, 0, 0)); c.paste(f, ((W - f.width) // 2, H - f.height), f)
        c.save(os.path.join(OUT, 'vault', n + '.webp'), 'WEBP', quality=88)


if __name__ == '__main__':
    main(sys.argv[1])
