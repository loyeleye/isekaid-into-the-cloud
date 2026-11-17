"""Cut and pack the Fire Drill map art that drill_map_art.py painted (see CREDITS.md).

usage: drill_map_pack.py RAW_DIR    writes assets/img/drill/map-*.webp

The prop and emblem sheets are keyed off their green, each piece cut to its own box; the chalk sheet's black becomes
transparency (chalk's brightness is its opacity) so the marks sit on the board like real chalk.
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
GAME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(GAME, 'assets/img/drill')


def key_green(im):
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    spill = g - np.maximum(r, b)
    alpha = np.clip(1 - (spill - 40) / 60, 0, 1)
    g2 = np.minimum(g, np.maximum(r, b) + 10)
    out = np.dstack([r, g2, b, alpha * 255]).clip(0, 255).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def pieces(im, n, rows=2):
    al = np.asarray(im)[..., 3] > 128
    lab, k = ndimage.label(ndimage.binary_closing(al, iterations=6))
    sizes = ndimage.sum(al, lab, range(1, k + 1))
    keep = sorted(np.argsort(sizes)[-n:] + 1)
    boxes = [ndimage.find_objects((lab == i).astype(int))[0] for i in keep]
    h = im.height / rows   # by the grid row each piece's centre sits in, then left to right
    boxes.sort(key=lambda s: (int((s[0].start + s[0].stop) / 2 // h), s[1].start))
    res = []
    for sl in boxes:
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        res.append(im.crop((max(0, x0 - 2), max(0, y0 - 2), x1 + 2, y1 + 2)))
    return res


def save(im, name, w=None):
    if w and im.width > w: im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    p = os.path.join(OUT, name); im.save(p, 'WEBP', quality=86, method=6); print(p, im.size, os.path.getsize(p))


def main(raw):
    for n, (w, h) in (('board-wide', (1376, 768)), ('board-tall', (768, 1376))):
        save(Image.open(os.path.join(raw, n + '.png')).convert('RGB').resize((w, h), Image.LANCZOS), 'map-' + n + '.webp')
    card, notice, tack, seal = pieces(key_green(Image.open(os.path.join(raw, 'cards.png'))), 4)
    save(card, 'map-card.webp', 360); save(notice, 'map-notice.webp', 640); save(tack, 'map-tack.webp', 64); save(seal, 'map-seal.webp', 96)
    for im, n in zip(pieces(key_green(Image.open(os.path.join(raw, 'icons.png'))), 4), ('gate', 'queue', 'stream', 'bell')):
        save(im, 'map-ic-' + n + '.webp', 128)
    c = np.asarray(Image.open(os.path.join(raw, 'chalk.png')).convert('RGB')).astype(np.float32)
    lum = c.max(axis=2)
    alpha = np.clip((lum - 30) / 160, 0, 1)
    col = np.where(lum[..., None] > 0, c / np.maximum(lum[..., None], 1) * 255, 0)
    ch = Image.fromarray(np.dstack([col, alpha * 255]).clip(0, 255).astype(np.uint8), 'RGBA')
    for im, n in zip(pieces(ch, 6), ('arrow', 'ring', 'tick', 'cross', 'wave', 'star')):
        save(im, 'map-chalk-' + n + '.webp', 200)


if __name__ == '__main__':
    main(sys.argv[1])
