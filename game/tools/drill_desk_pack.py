"""Cut and pack the Fire Drill desk art that drill_desk_art.py painted with Sogni (see CREDITS.md).

usage: drill_desk_pack.py RAW_DIR    writes assets/img/drill/desk-*.webp

Props are keyed off their green (key_green below) and cut to their own boxes. The lamp is only kept in red:
the game lights it green with a hue turn, since a green lamp would key away with the background.
"""
import os, sys
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from drill_map_pack import pieces, save


def key_green(im):
    """Sogni's green is a soft mid green with shading, not #00FF00: key on how green a pixel is for its brightness."""
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    k = (g - np.maximum(r, b)) / np.maximum(g, 1)
    alpha = np.clip(1 - (k - .08) / .17, 0, 1)
    g2 = np.minimum(g, np.maximum(r, b) + 6)
    return Image.fromarray(np.dstack([r, g2, b, alpha * 255]).clip(0, 255).astype(np.uint8), 'RGBA')


def main(raw):
    p = lambda n: os.path.join(raw, n)
    save(Image.open(p('desk-wide.png')).convert('RGB').resize((1376, 774), Image.LANCZOS), 'desk-wide.webp')
    save(Image.open(p('desk-tall-1.png')).convert('RGB').resize((774, 1376), Image.LANCZOS), 'desk-tall.webp')
    b = key_green(Image.open(p('brass-1.png')))   # a 2x3 layout with a glow around the green lamp: cut by region
    def cut(box):
        im = b.crop(box)
        return im.crop(im.getchannel('A').point(lambda v: 255 if v > 128 else 0).getbbox())
    plate, coin, lamp, toggle = cut((0, 120, 620, 380)), cut((620, 60, 1024, 400)), cut((200, 455, 385, 661)), cut((115, 661, 450, 900))
    save(plate, 'desk-plate.webp', 480); save(coin, 'desk-coin.webp', 72); save(lamp, 'desk-lamp.webp', 56); save(toggle, 'desk-toggle.webp', 140)
    note, card, tag = pieces(key_green(Image.open(p('slips-1.png'))), 3, rows=1)
    save(note, 'desk-note.webp', 300); save(card, 'desk-card.webp', 420); save(tag, 'desk-tag.webp', 420)
    rail, knob = pieces(key_green(Image.open(p('rail-1.png'))), 2)
    save(rail, 'desk-rail.webp', 900); save(knob, 'desk-knob.webp', 64)
    d = Image.open(p('dock-1.png')).convert('RGB')
    save(d.crop((0, 40, d.width, d.height)), 'desk-dock.webp', 1536)
    sheet, = pieces(key_green(Image.open(p('sheet-1.png'))), 1, rows=1)
    save(sheet, 'desk-sheet.webp', 720)


if __name__ == '__main__':
    main(sys.argv[1])
