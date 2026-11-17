"""Cut the painted client busts used beside Coo's lines and on the Renovation night board.

Usage: python3 tools/portrait_busts.py RAW_DIR
RAW_DIR holds the Sogni renders (1024x1024, parchment ground) named below.
Kai and Seymour are cut from their existing painted street art instead.
Writes assets/img/portraits-painted/<who>.webp at 170x200 (the 34:40 head box).
"""
import os, sys
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'img', 'portraits-painted')
SIZE = (170, 200)
BG = (248, 228, 198, 255)  # the renders' parchment ground
# who: (source, centre x, top, width) in a 400-wide frame of the source
CUTS = {
    'mira':    ('raw:mira-2', 215, 20, 240),
    'seoyeon': ('raw:seoyeon-1', 216, 20, 240),
    'dutch':   ('raw:dutch-2', 207, 20, 240),
    'coo':     ('raw:coo-1', 199, 20, 240),
    'ayo':     ('raw:ayo-1', 176, 20, 240),
    'marrow':  ('raw:marrow-1', 168, 20, 240),
    'pip':     ('raw:pip-1', 205, 25, 300),
    'kai':     ('street:kai-neutral', 175, 5, 200),
    'seymour': ('street:sey-proud', 195, 60, 220),  # visor down, as always
}

def load(src, raw):
    kind, name = src.split(':')
    if kind == 'raw':
        return Image.open(os.path.join(raw, name + '.png')).convert('RGBA')
    im = Image.open(os.path.join(os.path.dirname(__file__), '..', 'assets', 'img', 'reno', 'street', name + '.webp')).convert('RGBA')
    bg = Image.new('RGBA', im.size, BG); bg.alpha_composite(im)
    return bg

def main(raw):
    os.makedirs(OUT, exist_ok=True)
    for who, (src, cx, top, w) in CUTS.items():
        im = load(src, raw)
        s = im.width / 400 if src.startswith('raw') else 1
        h = w * SIZE[1] / SIZE[0]
        box = [round((cx - w / 2) * s), round(top * s), round((cx + w / 2) * s), round((top + h) * s)]
        im.crop(box).convert('RGB').resize(SIZE, Image.LANCZOS).save(os.path.join(OUT, who + '.webp'), quality=88, method=6)
        print(who, box)

if __name__ == '__main__':
    main(sys.argv[1])
