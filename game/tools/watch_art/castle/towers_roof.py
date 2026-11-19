# Towers as an open rooftop (Ladi, Nov 19): Sogni (krea2 identity edit) repaints the towers floor in three 2048-wide
# windows, left to right, each from the result so far: roof and back wall off, a chest-high crenellated parapet, flat
# #00FF00 sky (keyed to transparent on export), each room doorway in a round turret, each stair archway in a square stair
# turret. Rows from the floor line down (the archways' stair pits) are kept from the old floor.
# usage: python3 towers_roof.py <towers.png> <workdir> <step: a|b|c> <seeds> [pick]
import sys, json, subprocess, numpy as np
from PIL import Image
src, wd, step, seeds = sys.argv[1], sys.argv[2], sys.argv[3], [int(s) for s in sys.argv[4].split(',')]
pick = int(sys.argv[5]) if len(sys.argv) > 5 else None
BASE = ("Make this the open-air rooftop of a castle tower: remove the wooden ceiling beams and the whole upper back wall, so above "
        "the walkway there is only open sky, painted as flat solid pure green (#00FF00) with nothing in it. Behind the stone walkway, "
        "the back wall becomes a low crenellated stone parapet, about chest high to a person, with square merlons and gaps along its "
        "top edge, the gaps showing the flat green sky. ")
STEPS = {
 'a': (0, (0, 1600), "The arched doorway with the bell sign becomes the door of a round stone turret that rises above the parapet and "
       "ends in a crenellated top. The dark stone archway with torches at the far left becomes the doorway of a square stone stair "
       "turret rising above the parapet with a crenellated top. "),
 'b': (1024, (576, 1640), "Continue the parapet and the green sky from the left exactly as they are. The arched doorway with the eye "
       "sign becomes the door of a round stone turret that rises above the parapet and ends in a crenellated top. "),
 'c': (2048, (640, 2048), "Continue the parapet and the green sky from the left exactly as they are. The arched doorway with the "
       "feathered-hat sign becomes the door of a round stone turret that rises above the parapet and ends in a crenellated top. "
       "The dark stone archway with torches at the far right becomes the doorway of a square stone stair turret rising above the "
       "parapet with a crenellated top. "),
}
END = ("Keep the stone walkway floor, the signs, the torches and the trapdoor in the floor exactly as they are. High-detail pixel art "
       "matching the rest, strict 2D side view, no text.")
x0, (k0, k1), mid = STEPS[step]
W = Image.open(src).convert('RGB'); ref = f'{wd}/{step}-ref.png'; W.crop((x0, 0, x0 + 2048, 512)).save(ref)
if pick is None:
    jobs = [{'out': f'{wd}/{step}-{s}.png', 'ref': ref, 'w': 2048, 'h': 512, 'seed': s, 'prompt': BASE + mid + END} for s in seeds]
    json.dump(jobs, open(f'{wd}/j-{step}.json', 'w')); subprocess.run(['python3', 'render.py', f'{wd}/j-{step}.json', str(len(seeds))])
else:
    e = np.asarray(Image.open(f'{wd}/{step}-{pick}.png').convert('RGB').resize((2048, 512), Image.LANCZOS)).astype(float)
    base = np.asarray(W).astype(float).copy(); w = np.zeros(2048); f = 64
    w[k0:k1] = 1
    if k0 >= f: w[k0 - f:k0] = np.linspace(0, 1, f)
    if k1 + f <= 2048: w[k1:k1 + f] = np.linspace(1, 0, f)
    rows = np.ones(512); rows[466:] = 0                     # floor line down stays the old floor (stair pits)
    wt = w[None, :] * rows[:, None]
    seg = base[:512, x0:x0 + 2048]; base[:512, x0:x0 + 2048] = seg * (1 - wt[..., None]) + e * wt[..., None]
    Image.fromarray(base.astype(np.uint8)).save(f'{wd}/after-{step}.png'); print('saved', f'{wd}/after-{step}.png')
