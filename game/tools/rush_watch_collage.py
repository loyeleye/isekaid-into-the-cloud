"""Lay out the Night Audit's Watch Room (claim 8) as a rough collage, for a Gemini repaint into one painting.

usage: python3 -I tools/rush_watch_collage.py SRC_DIR OUT_DIR
SRC_DIR holds Ladi's Sogni renders (claim-8/sogni/): the empty rooms and the props on light grey. The props are cut
out (rush_vault_pack.cutout) and placed at the layouts' positions in js/rush.js (WATCH_WIDE, WATCH_TALL), at human
scale (the porter is about 300 px tall in the wide room, 224 px in the tall one). Only the fixtures that never move
go into the painting: the four cabinets, the longcase clock (its face is drawn over in code), the ink column and the
out basket. The collages are padded to 16:9 and 9:16 for the edit; tools/rush_watch_pack.py crops them back.
"""
import os, sys
from PIL import Image, ImageOps
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rush_vault_pack import cutout

# The rooms as the game sees them (stage pixels), and the margin added each side to reach the edit's aspect ratio.
WIDE = {'size': (1344, 768), 'pad': 11, 'cab': (168, 210), 'cabs': {'counter': (380, 556), 'desk': (600, 556), 'drawer': (820, 556), 'engine': (1040, 556)},
        'clock': (95, 240, 130, 230), 'ink': (1310, 110, 380), 'basket': (1200, 548, 112)}
TALL = {'size': (768, 1504), 'pad': 39, 'cab': (176, 200), 'cabs': {'counter': (210, 914), 'desk': (510, 914), 'drawer': (510, 1260), 'engine': (210, 1260)},
        'clock': (92, 380, 110, 200), 'ink': (734, 270, 400), 'basket': (700, 1316, 96)}


def fit(im, w, h):
    s = min(w / im.width, h / im.height)
    return im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS)


def room_wide(src):
    # The empty room's floor meets the wall at y 655; the cabinets stand on 556. Crop 40 off the ceiling, squeeze the
    # wall into 0..560 and stretch the floor under it (the repaint redraws the planks).
    b = Image.open(src).convert('RGB').crop((0, 40, 1344, 768))
    wall, floor = b.crop((0, 0, 1344, 615)).resize((1344, 560), Image.LANCZOS), b.crop((0, 615, 1344, 728)).resize((1344, 208), Image.LANCZOS)
    out = Image.new('RGB', (1344, 768)); out.paste(wall, (0, 0)); out.paste(floor, (0, 560)); return out


def room_tall(src):
    # Scaled so the ledge's front edge sits at y 914 and the room is 846 wide (768 plus the margins); the floor is
    # stretched 24 px to reach 1504.
    b = Image.open(src).convert('RGB').resize((846, 1480), Image.LANCZOS)
    out = Image.new('RGB', (846, 1504)); out.paste(b, (0, 0)); out.paste(b.crop((0, 1456, 846, 1480)).resize((846, 48)), (0, 1456)); return out


def pad(im, p):
    w, h = im.size; out = Image.new('RGB', (w + 2 * p, h)); out.paste(im, (p, 0))
    out.paste(im.crop((0, 0, 1, h)).resize((p, h)), (0, 0)); out.paste(im.crop((w - 1, 0, w, h)).resize((p, h)), (w + p, 0)); return out


def build(L, room, props, ox):
    out = room.copy()
    def put(im, x, y, anchor='mb'):
        x, y = round(x + ox), round(y)
        px = x - im.width // 2; py = y - im.height if anchor == 'mb' else y - im.height // 2 if anchor == 'mm' else y
        out.paste(im, (px, py), im)
    cw, ch = L['cab']
    for st, (x, y) in L['cabs'].items(): put(fit(props['cab-' + st], cw * 1.2, ch), x, y)
    x, y, w, h = L['clock']; put(fit(props['watch-clock'], w, h), x, y + h / 2)
    # The ink column, flipped so its bracket points into the room; the glass's centre (62% across) on x.
    x, y, h = L['ink']; ink = ImageOps.mirror(fit(props['ink-column'], 999, h))
    out.paste(ink, (round(x + ox - ink.width * .62), round(y)), ink)
    x, y, w = L['basket']; put(fit(props['out-basket'], w, w), x, y, 'mm')
    return out


def main(src, dst):
    os.makedirs(dst, exist_ok=True)
    props = {n: cutout(Image.open(os.path.join(src, n + '.png'))) for n in ('cab-counter', 'cab-desk', 'cab-drawer', 'cab-engine', 'watch-clock', 'ink-column', 'out-basket')}
    build(WIDE, pad(room_wide(os.path.join(src, 'watch-wide-1.png')), WIDE['pad']), props, WIDE['pad']).save(os.path.join(dst, 'watch-wide-collage.png'))
    build(TALL, room_tall(os.path.join(src, 'watch-tall-1.png')), props, TALL['pad']).save(os.path.join(dst, 'watch-tall-collage.png'))
    print('collages in', dst)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
