"""Pingsby's Quarter, painted (Architect's Draft): sizes the Sogni art for the web.

Source: the picks and cutouts in project files game-modes/architects-draft/living-world/sogni/quarter/ (Sogni renders
from the prompts in living-world/sogni-prompts-pingsbys-quarter.md, cut out from their white backgrounds).
Run:  python3 tools/quarter_art.py SRC_DIR   (SRC_DIR is that quarter/ folder)
Writes assets/img/draft/quarter/*.webp (lossy, quality 82, alpha kept). Each name written must also be listed in
SD.draftArt.PAINTED (js/draft-art.js); a name missing from SRC_DIR is skipped, and the game keeps its code drawing.
"""
import sys, os
from PIL import Image
SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'img', 'draft', 'quarter')
os.makedirs(OUT, exist_ok=True)
CLIENTS = ['mira', 'seoyeon', 'dutch', 'kai', 'marrow', 'pip', 'coo']
# name -> (source file relative to SRC, height in px)
JOBS = {f'{c}-{s}': (f'cut/{c}-{s}.png', 320) for c in CLIENTS for s in ('small', 'mid', 'tall')}
JOBS.update({'scaffold': ('cut/scaffold.png', 320), 'delete-marker': ('cut/delete-marker.png', 200)})
JOBS.update({f'landmark-{n}': (f'cut/landmark-{n}.png', 240) for n in ('fountain', 'arch', 'clock', 'lantern')})
done = []
for name, (src, h) in JOBS.items():
    p = os.path.join(SRC, src)
    if not os.path.exists(p): continue
    im = Image.open(p).convert('RGBA')
    bb = im.getchannel('A').getbbox(); im = im.crop(bb)
    im = im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
    im.save(os.path.join(OUT, name + '.webp'), 'WEBP', quality=82, method=6); done.append(name)
# The plot ground: the middle of the lot painting, square. The river: a band across the middle of its painting.
if os.path.exists(os.path.join(SRC, 'lot.png')):
    im = Image.open(os.path.join(SRC, 'lot.png')).convert('RGB'); s = min(im.size) * 0.6
    cx, cy = im.width / 2, im.height / 2
    im.crop((round(cx - s / 2), round(cy - s / 2), round(cx + s / 2), round(cy + s / 2))).resize((192, 192), Image.LANCZOS).save(os.path.join(OUT, 'lot.webp'), 'WEBP', quality=80, method=6); done.append('lot')
if os.path.exists(os.path.join(SRC, 'river.png')):
    im = Image.open(os.path.join(SRC, 'river.png')).convert('RGB'); bh = im.height * 0.34
    im = im.crop((0, round(im.height / 2 - bh / 2), im.width, round(im.height / 2 + bh / 2)))
    im.resize((900, round(900 * im.height / im.width)), Image.LANCZOS).save(os.path.join(OUT, 'river.webp'), 'WEBP', quality=80, method=6); done.append('river')
print(' '.join(sorted(done)))
