"""Pack the Night Audit's (claim 8) art into the game's sizes.

usage: python3 -I tools/rush_watch_pack.py SRC_DIR PAINT_DIR
SRC_DIR holds Ladi's Sogni renders (claim-8/sogni/); PAINT_DIR the two repainted rooms (watch-wide-paint.png,
watch-tall-paint.png: the Gemini edits of tools/rush_watch_collage.py's collages). The rooms are scaled back to the
collage size and their 16:9 / 9:16 margins cropped off. The sprites (what moves or is bought) are cut out of their
grey (rush_vault_pack.cutout), trimmed, and scaled to twice the size the game draws them.
"""
import os, sys
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from rush_vault_pack import cutout

GAME = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(GAME, 'assets/img/rush')
# take: (name, longest side in px, crop box as fractions of the cut-out (l, t, r, b) or None)
SPRITES = {
    'porter': ('porter', 600, None), 'porter-walk': ('porter-walk', 600, None),
    'gauge': ('gauge', 160, (0, 0, 1, .775)), 'gauge-hires': ('gauge-hires', 160, (0, 0, 1, .8)),
    'capsule': ('capsule', 96, None), 'capsule-cracked': ('capsule-cracked', 96, None), 'capsule-late': ('capsule-late', 96, None),
    'capsule-refund': ('capsule-refund', 96, None),
    'tracer-spool': ('tracer', 160, None), 'pin': ('pins', 160, None), 'klaxon': ('alarm', 160, None), 'emf-stamp': ('stamp', 160, None),
    'tally': ('tally', 160, None), 'rule-card': ('rule', 160, None), 'lens': ('lens', 160, None),
    'logbook': ('logbook', 180, (0, .3, 1, 1)), 'shutter': ('shutter', 360, None), 'watch-key': ('key', 120, None),
    'question-pile': ('pile', 360, None), 'mail-slot': ('mail', 260, None),
}
ROOMS = {'watch-wide-paint.png': ('watch-wide.webp', (1366, 768), 11), 'watch-tall-paint.png': ('watch-tall.webp', (846, 1504), 39)}


def main(src, paint):
    os.makedirs(os.path.join(OUT, 'watch'), exist_ok=True)
    for take, (name, size, m) in ROOMS.items():
        im = Image.open(os.path.join(paint, take)).convert('RGB').resize(size, Image.LANCZOS)
        im.crop((m, 0, size[0] - m, size[1])).save(os.path.join(OUT, name), 'WEBP', quality=86); print('room', name)
    for take, (name, side, box) in SPRITES.items():
        im = cutout(Image.open(os.path.join(src, take + '.png')))
        if box: im = im.crop((round(box[0] * im.width), round(box[1] * im.height), round(box[2] * im.width), round(box[3] * im.height)))
        im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox())
        s = side / max(im.size)
        im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.LANCZOS).save(os.path.join(OUT, 'watch', name + '.webp'), 'WEBP', quality=88)
        print('sprite', name)


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
