# Second pass on the corridors: grey guide blocks for exact doorway positions, and the patchy middles.
import sys, os, shutil
from PIL import Image, ImageDraw
import winedit
K = ' Keep everything else exactly as it is, same size and position. High-detail pixel art matching the existing wall, soft warm light from the upper left, strict side view.'
def step(src, x0, prompt, seed, name, keep, guide=None):
    if os.path.exists(f'hd/{name}.png'): return f'hd/{name}.png'
    if guide:
        g = Image.open(src).convert('RGB'); d = ImageDraw.Draw(g)
        for r in guide: d.rectangle(r, fill=(150, 146, 140))
        src = f'hd/{name}-guide.png'; g.save(src)
    for t in range(4):
        try: out = winedit.run(src, f'hd/{name}.png', x0, prompt + K, [seed + 100 * t], keep=keep, tag='hd-' + name)[0]; break
        except FileNotFoundError: continue
    shutil.copy(out, f'hd/{name}.png'); print(name, flush=True); return f'hd/{name}.png'
DOOR = 'Turn the flat light-grey block into an open stone archway doorway that exactly fills it, with a dressed-stone arch, its sill on the floor line, showing a softly lit room beyond. Above the arch hang a small wooden sign on iron chains from the ceiling showing only a simple painted picture of {}, no letters or text. Nothing else added.'
def door(src, cx, sign, seed, name):
    x0 = min(max(0, cx - 1024), 2048)
    return step(src, x0, DOOR.format(sign), seed, name, keep=(cx - x0 - 190, cx - x0 + 190), guide=[(cx - 105, 200, cx + 105, 466)])
fl = sys.argv[1]
if fl == 'cellars':
    s = step('hd/cellars-d4.png', 1000, 'Turn the flat light-grey bar into a thick square stone pier like the others, and replace the flat stone wall and the wooden ceiling beams between the two brick vaults with two more round red-brick vaults springing from the piers, matching the vaults on both sides exactly. No doors here, nothing else added.', 1301, 'cellars-v2a', keep=(330, 1700), guide=[(1985, 140, 2065, 466)])
    s = step(s, 400, 'Hang a small wooden sign on iron chains from the brick vault above the archway doorway, showing only a simple painted picture of a golden key, no letters or text. Nothing else added.', 1302, 'cellars-v2', keep=(1340 - 400, 1540 - 400))
elif fl == 'upper':
    s = door('hd/upper-d3.png', 1590, 'an open book', 1311, 'upper-v2')
elif fl == 'towers':
    s = step('hd/towers-3.png', 1024, 'Continue the sloping wooden roof beams of both sides across the middle of the ceiling, replacing the flat beam strip, with even lighting across the whole wall. Keep the trapdoor in the floor. Nothing else added.', 1321, 'towers-v2a', keep=(500, 1550))
    for i, (cx, sign) in enumerate([(520, 'a brass bell'), (2360, 'an eye'), (2800, "a captain's plumed helmet")]):
        s = door(s, cx, sign, 1322 + i, f'towers-v2d{i+1}')
    shutil.copy(s, 'hd/towers-v2.png')
print('done', s)
