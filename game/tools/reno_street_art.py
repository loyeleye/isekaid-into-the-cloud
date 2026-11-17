"""The Renovation's living street (Architect's Draft): sizes the Sogni art for the web.

Source: the picks and cutouts in project files game-modes/architects-draft/living-world/sogni/ (Ladi's Sogni renders
from the prompts in living-world/sogni-prompts.md, cut out from their white or grey backgrounds; Kai's faces edited with
Gemini). Run:  python3 tools/reno_street_art.py SRC_DIR   (SRC_DIR is that sogni/ folder)
Writes assets/img/reno/street/*.webp (lossy, quality 82, alpha kept).
"""
import sys, os
from PIL import Image
SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', 'assets', 'img', 'reno', 'street')
os.makedirs(OUT, exist_ok=True)
# name -> (source file relative to SRC, height in px)
JOBS = {
    'street': ('street-wide.png', 1072),
    'office-yard': ('office-yard.png', 1072), 'bridge': ('bridge-wide.png', 1072), 'square': ('square-wide.png', 1072),
    'quarter-map': ('quarter-map.png', 1072), 'permit-office': ('permit-office.png', 1072), 'wall': ('wall-close.png', 1072),
    'poster': ('cut/poster-blank.png', 420), 'pin': ('cut/pin.png', 160), 'arch': ('cut/ribbon-arch.png', 640),
    'gate': ('cut/gate.png', 520),
    'house-old': ('cut/house-old.png', 600), 'house-new': ('cut/house-new.png', 600),
    'house-scaf': ('cut/house-scaf.png', 600), 'house-dark': ('cut/house-dark.png', 600),
    'lot': ('cut/lot-rented.png', 200),
    'res-a': ('cut/resident-walk2.png', 240), 'res-b': ('cut/resident-walk4.png', 240), 'res-soot': ('cut/resident-soot.png', 260),
    'kai-neutral': ('cut/kai-neutral.png', 971), 'kai-blink': ('cut/kai-blink.png', 971), 'kai-talk': ('cut/kai-talk.png', 971),
    'kai-happy': ('cut/kai-happy.png', 971), 'kai-worried': ('cut/kai-worried.png', 971),
    'sey-proud': ('cut/seymour-proud.png', 1000), 'sey-inspect': ('cut/seymour-inspect.png', 980), 'sey-approve': ('cut/seymour-approve.png', 1004),
    'sey-disapprove': ('cut/seymour-disapprove.png', 989), 'sey-stamp': ('cut/seymour-stamp.png', 997),
    'yard-hut': ('cut/rooms-hut.png', 560), 'yard-well': ('cut/well.png', 600), 'yard-ledger': ('cut/ledger.png', 560),
    'yard-board': ('cut/notice-board.png', 560), 'yard-jar': ('cut/snapshot-jar.png', 300), 'yard-rubble': ('cut/rubble.png', 220),
    'bridge-signpost': ('cut/signpost.png', 560), 'bridge-bell': ('cut/alarm-bell.png', 440), 'bridge-tester': ('cut/test-walker.png', 300),
    'yard-seal': ('cut/retain-seal.png', 240),
    'shrine-old': ('cut/shrine-old.png', 601), 'shrine-new': ('cut/shrine-new.png', 600), 'shrine-cracked': ('cut/shrine-cracked.png', 627),
    'tool-scaffold': ('cut/tool-scaffold.png', 200), 'tool-lot': ('cut/tool-lot-sign.png', 200), 'tool-hc': ('cut/tool-lever-hc.png', 200),
}
for name, (src, h) in JOBS.items():
    im = Image.open(os.path.join(SRC, src))
    im = im.convert('RGBA') if im.mode in ('RGBA', 'LA', 'P') else im.convert('RGB')
    if im.height != h: im = im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
    p = os.path.join(OUT, name + '.webp')
    im.save(p, 'WEBP', quality=82, method=6)
    print(name, im.size, os.path.getsize(p) // 1024, 'KB')
