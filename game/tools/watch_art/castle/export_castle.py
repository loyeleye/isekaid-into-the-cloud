# Export the HD castle floors and room interiors into the game, and write js/watch-art-castle.js.
# Usage (from game/): python3 tools/watch_art/castle/export_castle.py <folder with the final PNGs>
#   expects <src>/{ground,cellars,upper,towers}.png (4096x512; ground 4096x564 with the cellar stair below the floor) and <src>/rooms/<room>.png (1600x896)
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
        for x0, x1 in ((880, 1590), (3150, 3690)): box[90:440, x0:x1] = True
        mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
        m |= box & (((b >= r - 3) & ((r + g + b) > 330)) | ((mn > 165) & (mx - mn < 30)))
    a[m, 3] = 0
    return a
FLOORS = {   # x in native px of the 4096-wide floor (engine x = x * scale)
 'ground':  {'doorways': [], 'walkthrough': [['gate', 300, 1225], ['hall', 1290, 1840], ['post-room', 2325, 3190]],
             'trapdoor': [1880, 2130], 'stairs': {'down-left': [230, 520], 'up-right': [3420, 3900]}},
 'cellars': {'doorways': [['archive', 899], ['strongroom', 1459], ['barracks', 2579], ['tavern', 3139]],
             'trapdoor': None, 'ladder': 1994, 'stairs': {'up-left': [80, 500]}},
 'upper':   {'doorways': [['wardrobe', 990], ['ledger', 1590], ['bridge-tower', 2775]],
             'trapdoor': [1880, 2130], 'stairs': {'up-left': [60, 560], 'down-right': [3500, 4000]}},
 'towers':  {'doorways': [['watchtower', 520], ['lookout', 2360], ['captain', 2786]],
             'trapdoor': [1870, 2130], 'stairs': {'down-right': [3550, 4030]}},
}
# focus = the object the breach marker sits on, floorY = where Seo-yeon's feet go (1600x900 interior px)
FOCUS = {'archive': [1020, 480], 'barracks': [960, 540], 'bridge-tower': [1000, 420], 'captain': [1080, 600],
         'ledger': [940, 380], 'lookout': [1040, 480], 'strongroom': [1010, 430], 'tavern': [960, 500],
         'wardrobe': [940, 440], 'watchtower': [880, 480]}
ROOM_FLOOR = {'cellars': ['archive', 'strongroom', 'barracks', 'tavern'], 'upper': ['wardrobe', 'ledger', 'bridge-tower'],
              'towers': ['watchtower', 'lookout', 'captain']}
LINKS = {   # link id -> native x per floor; the engine pairs the same id across floors
 'cellars': {'stair-left': 290, 'ladder': 1994},
 'ground':  {'stair-left': 375, 'stair-right': 3660, 'ladder': 2005},
 'upper':   {'stair-right': 3750, 'back-stair': 310, 'ladder': 2005, 'bridge-door': 2775},
 'towers':  {'back-stair': 3790, 'ladder': 2000},
}
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
