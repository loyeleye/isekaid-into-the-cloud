# Export the HD castle floors and room interiors into the game, and write js/watch-art-castle.js.
# Usage (from game/): python3 tools/watch_art/castle/export_castle.py <folder with the final PNGs>
#   expects <src>/{ground,cellars,upper,towers}.png (4096x512) and <src>/blocks/block-{up,down}.png (white background) and <src>/rooms/<room>.png (1600x896)
# Floors are scaled to engine units (x0.638: floor line y=470 -> 300 of a 360-tall layer); the 4096-wide masters stay in the
# project folder (sogni/night-watch/castle-work) for a later DPR re-export.
import json, os, sys
import numpy as np
from PIL import Image
src = sys.argv[1]; A = 'assets/img/watch/'
SCALE = round(300 / 470, 4)
def webp(im, p): os.makedirs(os.path.dirname(p), exist_ok=True); im.save(p, 'WEBP', quality=90, alpha_quality=100, method=6)
def key_windows(a, f):
    r, g, b = (a[..., i].astype(int) for i in range(3))
    m = ((g > r + 22) & (g > b + 22) & (g > 90)) | ((g > b + 40) & (g > r + 5) & (g > 120))   # #00FF00 window glass, also under lantern glow
    if f == 'towers':                                                  # open battlement arches: sky blue and white cloud
        box = np.zeros_like(m)
        for x0, x1 in ((1120, 1590), (3150, 3700)): box[90:440, x0:x1] = True
        mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
        m |= box & (((b >= r - 3) & ((r + g + b) > 330)) | ((mn > 165) & (mx - mn < 30)))
    a[m, 3] = 0
    return a
FLOORS = {   # x in native px of the 4096-wide floor (engine x = x * scale)
 'ground':  {'doorways': [], 'walkthrough': [['gate', 300, 1225], ['hall', 1290, 1840], ['post-room', 2325, 3190]],
             'trapdoor': [1880, 2130], },
 'cellars': {'doorways': [['archive', 899], ['strongroom', 1459], ['barracks', 2579], ['tavern', 3139]],
             'trapdoor': None, 'ladder': 1994},
 'upper':   {'doorways': [['wardrobe', 990], ['ledger', 1590], ['bridge-tower', 2775]],
             'trapdoor': [1880, 2130]},
 'towers':  {'doorways': [['watchtower', 815], ['lookout', 2360], ['captain', 2786]],
             'trapdoor': [1870, 2130]},
}
# focus = the object the breach marker sits on, floorY = where Seo-yeon's feet go (1600x900 interior px)
FOCUS = {'archive': [1020, 480], 'barracks': [960, 540], 'bridge-tower': [1000, 420], 'captain': [1080, 600],
         'ledger': [940, 380], 'lookout': [1040, 480], 'strongroom': [1010, 430], 'tavern': [960, 500],
         'wardrobe': [940, 440], 'watchtower': [880, 480]}
ROOM_FLOOR = {'cellars': ['archive', 'strongroom', 'barracks', 'tavern'], 'upper': ['wardrobe', 'ledger', 'bridge-tower'],
              'towers': ['watchtower', 'lookout', 'captain']}
# Stairs (Ladi, Nov 19): middle floors have a stair up and an archway down at both ends, the cellars a stair up at each end,
# the towers an archway down at each end. Each id joins the same stair on two floors. native [x0, x1], dir, and the box
# where the engine draws the lock overlay (blocks/<dir>.webp) while the stair's quest isn't done; link x = where you use it.
DOWN_S, DOWN_T = [85, 315, 226, 476], None
STAIRS = {
 'cellars': {'stair-left': ([60, 520], 'up', [430, 330, 600, 474], 470), 'east-cellar-stair': ([3496, 4036], 'up', [3532, 330, 3702, 474], 3626)},
 'ground':  {'stair-left': ([85, 315], 'down', [85, 226, 315, 476], 200), 'west-mid-stair': ([60, 560], 'up', [400, 330, 570, 474], 480),
             'stair-right': ([3420, 4030], 'up', [3420, 330, 3590, 474], 3500), 'east-cellar-stair': ([3781, 4011], 'down', [3781, 226, 4011, 476], 3896)},
 'upper':   {'west-mid-stair': ([85, 315], 'down', [85, 226, 315, 476], 200), 'back-stair': ([60, 600], 'up', [430, 330, 600, 474], 470),
             'stair-right': ([3781, 4011], 'down', [3781, 226, 4011, 476], 3896), 'east-tower-stair': ([3496, 4036], 'up', [3532, 330, 3702, 474], 3626)},
 'towers':  {'back-stair': ([106, 414], 'down', [106, 143, 414, 476], 260), 'east-tower-stair': ([3696, 4004], 'down', [3696, 143, 4004, 476], 3850)},
}
LINKS = {f: {**{k: v[3] for k, v in st.items()}, **({'ladder': {'cellars': 1994, 'ground': 2005, 'upper': 2005, 'towers': 2000}[f]})} for f, st in STAIRS.items()}
def block(name):
    a = np.asarray(Image.open(f'{src}/blocks/{name}.png').convert('RGBA')).copy()
    white = a[..., :3].min(axis=2) > 232; a[white, 3] = 0
    ys, xs = np.where(~white); im = Image.fromarray(a).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    webp(im, f'{A}floors/stair-block-{name.split("-")[1]}.webp')
block('block-up'); block('block-down')
def E(x): return round(x * SCALE)
out, interiors = {}, {}
for f, g in FLOORS.items():
    a = np.asarray(Image.open(f'{src}/{f}.png').convert('RGBA')).copy()
    im = Image.fromarray(key_windows(a, f), 'RGBA'); W = E(4096); im = im.resize((W, min(360, E(im.height))), Image.LANCZOS)   # ground is 564 tall: its cellar stair drops below the floor
    lay = Image.new('RGBA', (W, 360), (24, 20, 26, 255)); lay.paste(im, (0, 0))      # paste keeps windows see-through
    webp(lay, f'{A}floors/{f}/wall-v2.webp')
    rooms = [[n, E(x0), E(x1)] for n, x0, x1 in g.get('walkthrough', [])] + [[n, E(cx - 150), E(cx + 150)] for n, cx in g['doorways']]
    out[f] = {'width': W, 'ground': 300, 'rooms': rooms, 'doors': {n: E(cx) for n, cx in g['doorways']},
              'popupRooms': [n for n, _ in g['doorways']], 'links': {k: E(v) for k, v in LINKS[f].items()}, 'walls': [E(40), E(4056)],
              'layers': [{'img': A + f'floors/{f}/far.webp', 'speed': 0.2}, {'img': A + f'floors/{f}/wall-v2.webp', 'speed': 1}]}
    if g.get('trapdoor'): out[f]['trapdoor'] = [E(g['trapdoor'][0]), E(g['trapdoor'][1])]
    out[f]['stairs'] = {k: {'x': [E(v[0][0]), E(v[0][1])], 'dir': v[1], 'use': E(v[3]),
                            'block': {'img': A + f'floors/stair-block-{v[1]}.webp', 'box': [E(n) for n in v[2]]}} for k, v in STAIRS[f].items()}
    for rid in ROOM_FLOOR.get(f, []):
        im = Image.open(f'{src}/rooms/{rid}.png').convert('RGB').crop((64, 36, 1536, 860)).resize((1600, 900), Image.LANCZOS)
        webp(im, f'{A}rooms/{rid}.webp'); fx, fy = FOCUS[rid]
        interiors[rid] = {'img': A + f'rooms/{rid}.webp', 'w': 1600, 'h': 900,
                          'focus': [round((fx - 64) * 1600 / 1472), round((fy - 36) * 900 / 824)], 'floorY': 714}
js = ('// Night Watch castle floors (HD repaint, Nov 19) and the room popups (Mira\'s Kitchen style).\n'
      '// Written by tools/watch_art/castle/export_castle.py. Every number is in engine units (layer 360 tall, ground 300).\n'
      '// floors[f] has the same shape as WATCH_ART.floors[f]; popupRooms open interiors[room] instead of being walked through.\n'
      'window.WATCH_ART_CASTLE = ' + json.dumps({'floors': out, 'interiors': interiors}, indent=1) + ';\n')
open('js/watch-art-castle.js', 'w').write(js); print('wrote', list(out))
