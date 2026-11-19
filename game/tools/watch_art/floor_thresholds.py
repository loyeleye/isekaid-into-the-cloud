# Paints solid floor through each down archway (Ladi, Nov 19: "just draw the floor and the darkness can be signified as
# going down"). The painted step strip in the doorway is replaced by the floor beside the archway, shaded a little.
# Run from game/: python3 tools/watch_art/floor_thresholds.py
import json, subprocess, numpy as np
from PIL import Image
F = json.loads(subprocess.check_output(['node', '-e', "global.window={};require('./js/watch-art-castle.js');console.log(JSON.stringify(window.WATCH_ART_CASTLE.floors))"]))
TOP = 303                                  # the floor's top edge (engine ground is 300; the stones start a few px lower)
for f, v in F.items():
    path = f'assets/img/watch/floors/{f}/wall-v2.webp'
    im = np.asarray(Image.open(path).convert('RGBA')).copy(); L = im[:, :, :3].mean(2); W = im.shape[1]
    for sid, s in (v.get('stairs') or {}).items():
        if s['dir'] != 'down': continue
        a, b = s['x']; row = L[TOP - 4, a:b] < 30                     # the dark doorway just above the floor
        xs = np.where(row)[0]; x0, x1 = a + xs.min(), a + xs.max() + 1; w = x1 - x0
        sx = x1 + 24 if x1 + 24 + w < W - 30 else x0 - 24 - w            # floor beside the archway, past the jamb
        patch = im[TOP:, sx:sx + w].astype(float)
        lum = patch[:, :, :3].mean((1, 2)); bot = next(i for i in range(len(lum)) if lum[i:].max() < 30)   # floor's lower edge
        shade = np.linspace(0.62, 0.86, bot)[:, None, None]             # the doorway's shadow, deepest at the back
        patch[:bot, :, :3] *= shade
        im[TOP:, x0:x1] = patch.astype(np.uint8)
        print(f, sid, 'doorway', x0, x1, 'floor from', sx)
    Image.fromarray(im).save(path, 'WEBP', quality=92, method=6)
